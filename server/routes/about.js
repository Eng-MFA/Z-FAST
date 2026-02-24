const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// GET all slides (public)
router.get('/', async (req, res) => {
    try { res.json(await db.prepare('SELECT * FROM about_slides ORDER BY display_order ASC, id ASC').all()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// POST add slide (admin)
router.post('/', requireAuth, async (req, res) => {
    const { image, caption, display_order } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required' });
    try {
        const r = await db.prepare(
            'INSERT INTO about_slides (image, caption, display_order) VALUES (?, ?, ?)'
        ).run(image, caption || '', display_order || 0);
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update slide (admin)
router.put('/:id', requireAuth, async (req, res) => {
    const { image, caption, display_order } = req.body;
    try {
        await db.prepare('UPDATE about_slides SET image=?, caption=?, display_order=? WHERE id=?')
            .run(image, caption || '', display_order ?? 0, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE slide (admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM about_slides WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
