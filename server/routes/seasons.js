const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try { res.json(await db.prepare('SELECT * FROM seasons ORDER BY display_order DESC').all()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const s = await db.prepare('SELECT * FROM seasons WHERE id=?').get(req.params.id);
        if (!s) return res.status(404).json({ error: 'Not found' });
        res.json(s);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
