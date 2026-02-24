const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { requireAuth } = require('./auth');

// GET gallery for a season (public)
router.get('/:seasonId/gallery', async (req, res) => {
    try {
        res.json(await db.prepare(
            'SELECT * FROM season_gallery WHERE season_id=? ORDER BY display_order ASC, id ASC'
        ).all(req.params.seasonId));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST add gallery image to a season (admin)
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

// PUT update gallery item (admin)
router.put('/:seasonId/gallery/:imgId', requireAuth, async (req, res) => {
    const { image, caption, display_order } = req.body;
    try {
        await db.prepare('UPDATE season_gallery SET image=?, caption=?, display_order=? WHERE id=? AND season_id=?')
            .run(image, caption || '', display_order ?? 0, req.params.imgId, req.params.seasonId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE gallery item (admin)
router.delete('/:seasonId/gallery/:imgId', requireAuth, async (req, res) => {
    try {
        await db.prepare('DELETE FROM season_gallery WHERE id=? AND season_id=?')
            .run(req.params.imgId, req.params.seasonId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
