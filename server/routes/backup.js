const express  = require('express');
const router   = express.Router();
const AdmZip   = require('adm-zip');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const { requireAuth } = require('./auth');
const db       = require('../db');

const dataDir    = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
const tmpDir     = path.join(dataDir, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// ── multer for restore upload ─────────────────────────────────
const storage = multer.diskStorage({
    destination: tmpDir,
    filename: (_req, _file, cb) => cb(null, `restore_${Date.now()}.zip`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ── Helper: recursively add a folder into zip ─────────────────
function addFolderToZip(zip, folderPath, zipFolder) {
    if (!fs.existsSync(folderPath)) return;
    fs.readdirSync(folderPath).forEach(entry => {
        const full = path.join(folderPath, entry);
        if (fs.statSync(full).isDirectory()) {
            addFolderToZip(zip, full, zipFolder ? `${zipFolder}/${entry}` : entry);
        } else {
            zip.addLocalFile(full, zipFolder || '');
        }
    });
}

// ── GET /api/backup/download ──────────────────────────────────
router.get('/download', requireAuth, async (req, res) => {
    const date     = new Date().toISOString().slice(0, 10);
    const filename = `zfast_backup_${date}.zip`;
    const tmpZip   = path.join(tmpDir, `backup_${Date.now()}.zip`);
    const cleanup  = () => { try { if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip); } catch (_) {} };

    try {
        // Flush WAL into main DB file before zipping
        console.log('⏳ Checkpointing WAL before backup…');
        await db.checkpoint();
        console.log('✅ WAL checkpoint done');

        const zip = new AdmZip();

        const dbFile = path.join(dataDir, 'zfast.db');
        if (!fs.existsSync(dbFile)) return res.status(500).json({ error: 'Database file not found.' });
        zip.addLocalFile(dbFile, 'database');

        addFolderToZip(zip, uploadsDir, 'uploads');

        zip.addFile('backup_meta.json', Buffer.from(JSON.stringify({
            created: new Date().toISOString(),
            version: '2.0',
            note: 'WAL checkpointed — all data included.',
        }, null, 2), 'utf8'));

        zip.writeZip(tmpZip);
        const { size } = fs.statSync(tmpZip);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Length', size);

        const stream = fs.createReadStream(tmpZip);
        stream.pipe(res);
        stream.on('end', () => { cleanup(); console.log(`✅ Backup sent: ${filename} (${(size/1048576).toFixed(1)} MB)`); });
        stream.on('error', (e) => { cleanup(); console.error('Stream error:', e.message); });
        res.on('close', cleanup);

    } catch (err) {
        cleanup();
        console.error('Backup error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Backup failed: ' + err.message });
    }
});

// ── POST /api/backup/restore ──────────────────────────────────
// Uses SQLite ATTACH to do an in-place restore — no server restart needed!
router.post('/restore', requireAuth, upload.single('backup'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No backup file uploaded.' });

    const zipPath     = req.file.path;
    const restoreDb   = path.join(tmpDir, `restore_db_${Date.now()}.db`);
    const cleanupZip  = () => { try { if (fs.existsSync(zipPath))   fs.unlinkSync(zipPath);  } catch (_) {} };
    const cleanupDb   = () => { try { if (fs.existsSync(restoreDb)) fs.unlinkSync(restoreDb); } catch (_) {} };

    try {
        const zip     = new AdmZip(zipPath);
        const entries = zip.getEntries();

        // Validate
        if (!entries.some(e => e.entryName === 'backup_meta.json')) {
            cleanupZip();
            return res.status(400).json({ error: 'Invalid backup file: missing backup_meta.json.' });
        }

        let dbExtracted = false;
        let imgCount    = 0;

        // ── Step 1: Extract files ─────────────────────────────
        for (const entry of entries) {
            if (entry.isDirectory) continue;
            const name = entry.entryName;

            if (name === 'database/zfast.db') {
                // Write backup DB to a temp file for SQLite ATTACH
                fs.writeFileSync(restoreDb, entry.getData());
                dbExtracted = true;
                console.log(`📦 Backup DB extracted to temp (${(entry.getData().length/1048576).toFixed(1)} MB)`);

            } else if (name.startsWith('uploads/')) {
                // Restore images immediately — no lock issues
                const rel = name.slice('uploads/'.length);
                if (!rel) continue;
                const dest = path.join(uploadsDir, rel);
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.writeFileSync(dest, entry.getData());
                imgCount++;
            }
            // Skip .db-wal, .db-shm, backup_meta.json
        }
        cleanupZip();

        // ── Step 2: In-place DB restore using ATTACH ──────────
        let tablesRestored = 0;

        if (dbExtracted) {
            // SQLite path must use forward slashes (works cross-platform)
            const sqlitePath = restoreDb.replace(/\\/g, '/');

            try {
                // Attach the backup database
                await db.run(`ATTACH DATABASE '${sqlitePath}' AS restoredb`);

                // Get all user tables from the backup DB
                const tables = await db.all(
                    `SELECT name FROM restoredb.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
                );

                console.log(`🔄 Restoring ${tables.length} tables in-place…`);

                // For each table: wipe current data, copy from backup
                for (const { name } of tables) {
                    try {
                        await db.run(`DELETE FROM main."${name}"`);
                        await db.run(`INSERT INTO main."${name}" SELECT * FROM restoredb."${name}"`);
                        tablesRestored++;
                    } catch (tErr) {
                        console.warn(`⚠️  Table "${name}" skipped: ${tErr.message}`);
                    }
                }

                await db.run(`DETACH DATABASE restoredb`);
                cleanupDb();

                // Remove any stale pendingRestore staging file
                const staleStage = path.join(dataDir, 'zfast.db.restore');
                if (fs.existsSync(staleStage)) fs.unlinkSync(staleStage);

                console.log(`✅ In-place restore complete: ${tablesRestored} tables, ${imgCount} images`);

                return res.json({
                    success: true,
                    tablesRestored,
                    imgCount,
                    message: `✅ Restore complete!\n• ${tablesRestored} database tables restored.\n• ${imgCount} image(s) restored.\n\nNo server restart needed — data is live immediately!`,
                });

            } catch (attachErr) {
                // ATTACH failed (e.g. backup DB is corrupt / 0 bytes)
                console.error('ATTACH restore failed:', attachErr.message);
                cleanupDb();

                return res.status(500).json({
                    error: `Database restore failed: ${attachErr.message}\n\nPossible cause: the backup file may be from an older version. Try creating a new backup first.`,
                });
            }
        }

        // No DB in zip (images-only backup)
        res.json({
            success: true,
            tablesRestored: 0,
            imgCount,
            message: `✅ Images restored (${imgCount} files). No database found in backup.`,
        });

    } catch (err) {
        cleanupZip();
        cleanupDb();
        console.error('Restore error:', err.message);
        res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
});

// ── GET /api/backup/info ──────────────────────────────────────
router.get('/info', requireAuth, (req, res) => {
    try {
        let dbSize   = 0;
        let imgCount = 0;
        let imgSize  = 0;

        ['zfast.db', 'zfast.db-wal', 'zfast.db-shm'].forEach(f => {
            const p = path.join(dataDir, f);
            if (fs.existsSync(p)) dbSize += fs.statSync(p).size;
        });

        function countDir(dir) {
            if (!fs.existsSync(dir)) return;
            fs.readdirSync(dir).forEach(f => {
                const fp = path.join(dir, f);
                if (fs.statSync(fp).isDirectory()) countDir(fp);
                else { imgCount++; imgSize += fs.statSync(fp).size; }
            });
        }
        countDir(uploadsDir);

        const pendingRestore = fs.existsSync(path.join(dataDir, 'zfast.db.restore'));

        res.json({
            database: { sizeBytes: dbSize, sizeMB: (dbSize / 1048576).toFixed(2) },
            uploads:  { count: imgCount, sizeBytes: imgSize, sizeMB: (imgSize / 1048576).toFixed(2) },
            totalMB:  ((dbSize + imgSize) / 1048576).toFixed(2),
            pendingRestore,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
