const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// ── Seasons CRUD ──────────────────────────────────────────────
router.get('/', async (req, res) => {
    try { res.json(await db.prepare('SELECT * FROM seasons ORDER BY display_order DESC').all()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
    const { year, title, description, image, achievements, display_order } = req.body;
    try {
        const r = await db.prepare(
            'INSERT INTO seasons (year,title,description,image,achievements,display_order) VALUES (?,?,?,?,?,?)'
        ).run(year, title, description || '', image || '', achievements || '', display_order || 0);
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Season Gallery (MUST be before /:id routes) ───────────────
router.get('/:seasonId/gallery', async (req, res) => {
    try {
        res.json(await db.prepare(
            'SELECT * FROM season_gallery WHERE season_id=? ORDER BY display_order ASC, id ASC'
        ).all(req.params.seasonId));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:seasonId/gallery', requireAuth, async (req, res) => {
    const { image, caption, display_order } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required' });
    try {
        const r = await db.prepare(
            'INSERT INTO season_gallery (season_id, image, caption, display_order) VALUES (?, ?, ?, ?)'
        ).run(req.params.seasonId, image, caption || '', display_order || 0);
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:seasonId/gallery/:imgId', requireAuth, async (req, res) => {
    const { image, caption, display_order } = req.body;
    try {
        await db.prepare('UPDATE season_gallery SET image=?, caption=?, display_order=? WHERE id=? AND season_id=?')
            .run(image, caption || '', display_order ?? 0, req.params.imgId, req.params.seasonId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:seasonId/gallery/:imgId', requireAuth, async (req, res) => {
    try {
        await db.prepare('DELETE FROM season_gallery WHERE id=? AND season_id=?')
            .run(req.params.imgId, req.params.seasonId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Single season (MUST be AFTER /gallery routes) ─────────────
router.get('/:id', async (req, res) => {
    try {
        const s = await db.prepare('SELECT * FROM seasons WHERE id=?').get(req.params.id);
        if (!s) return res.status(404).json({ error: 'Not found' });
        res.json(s);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
    const { year, title, description, image, achievements, display_order } = req.body;
    try {
        await db.prepare('UPDATE seasons SET year=?,title=?,description=?,image=?,achievements=?,display_order=? WHERE id=?')
            .run(year, title, description, image, achievements, display_order ?? 0, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM seasons WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
