const path = require('path');
const fs = require('fs');

/**
 * Determine the persistent data directory:
 * 1. process.env.DATA_DIR (if set explicitly)
 * 2. /data (standard persistent storage mount on Hugging Face Spaces)
 * 3. Fallback to local <project_root>/data for development
 */
function resolveDataDir() {
    if (process.env.DATA_DIR) {
        return path.resolve(process.env.DATA_DIR);
    }

    // Detect Hugging Face Spaces persistent storage mount (/data)
    if (fs.existsSync('/data')) {
        try {
            fs.accessSync('/data', fs.constants.W_OK);
            return '/data';
        } catch (_) {
            // /data exists but not writable, fallback to local
        }
    }

    // Local development fallback
    return path.join(__dirname, '..', 'data');
}

/**
 * Determine the uploads directory:
 * 1. process.env.UPLOADS_DIR (if set explicitly)
 * 2. If dataDir is /data (HF Spaces persistent storage), use /data/uploads
 * 3. Local fallback: use <project_root>/public/uploads directly
 */
function resolveUploadsDir(dataDir) {
    if (process.env.UPLOADS_DIR) {
        return path.resolve(process.env.UPLOADS_DIR);
    }
    if (dataDir === '/data' || (process.env.DATA_DIR && path.resolve(dataDir) !== path.resolve(path.join(__dirname, '..', 'data')))) {
        return path.join(dataDir, 'uploads');
    }
    return path.join(__dirname, '..', 'public', 'uploads');
}

const DATA_DIR = resolveDataDir();
const UPLOADS_DIR = resolveUploadsDir(DATA_DIR);
const TMP_DIR = path.join(DATA_DIR, 'tmp');
const DB_PATH = path.join(DATA_DIR, 'zfast.db');
const RESTORE_PATH = path.join(DATA_DIR, 'zfast.db.restore');

/**
 * Ensures all required persistent directories exist,
 * and seeds initial database and uploads if running on a fresh persistent volume.
 */
function initStorage() {
    // 1. Ensure required directories
    [DATA_DIR, UPLOADS_DIR, TMP_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // 2. First-boot database seeding for persistent storage:
    // If the persistent DB does not exist yet, copy the bundled repository DB if available
    const bundledDbPath = path.join(__dirname, '..', 'data', 'zfast.db');
    if (!fs.existsSync(DB_PATH) && fs.existsSync(bundledDbPath) && path.resolve(bundledDbPath) !== path.resolve(DB_PATH)) {
        try {
            console.log(`📦 Copying initial database from repo to persistent storage (${DB_PATH})...`);
            fs.copyFileSync(bundledDbPath, DB_PATH);
            console.log('✅ Initial database copied to persistent storage successfully.');
        } catch (err) {
            console.warn('⚠️ Could not copy initial database:', err.message);
        }
    }

    // 3. First-boot uploads migration:
    // If persistent uploads directory is different from bundled public/uploads and is empty, copy pre-existing uploads
    const bundledUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    if (fs.existsSync(bundledUploadsDir) && path.resolve(bundledUploadsDir) !== path.resolve(UPLOADS_DIR)) {
        try {
            const currentUploads = fs.readdirSync(UPLOADS_DIR);
            if (currentUploads.length === 0) {
                console.log(`🖼️ Copying initial media assets from repo to persistent uploads (${UPLOADS_DIR})...`);
                const bundledFiles = fs.readdirSync(bundledUploadsDir);
                let copiedCount = 0;
                for (const file of bundledFiles) {
                    const src = path.join(bundledUploadsDir, file);
                    const dest = path.join(UPLOADS_DIR, file);
                    if (fs.statSync(src).isFile()) {
                        fs.copyFileSync(src, dest);
                        copiedCount++;
                    }
                }
                console.log(`✅ Migrated ${copiedCount} media files to persistent storage.`);
            }
        } catch (err) {
            console.warn('⚠️ Could not copy initial media assets:', err.message);
        }
    }
}

module.exports = {
    DATA_DIR,
    UPLOADS_DIR,
    TMP_DIR,
    DB_PATH,
    RESTORE_PATH,
    initStorage,
};
