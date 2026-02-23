const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM seasons ORDER BY display_order DESC').all());
});

router.get('/:id', (req, res) => {
    const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
    if (!season) return res.status(404).json({ error: 'Not found' });
    res.json(season);
});

router.post('/', requireAuth, (req, res) => {
    const { year, title, description, image, achievements, display_order } = req.body;
    const result = db.prepare(
        'INSERT INTO seasons (year, title, description, image, achievements, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(year, title, description || '', image || '', achievements || '', display_order || 0);
    res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
    const { year, title, description, image, achievements, display_order } = req.body;
    db.prepare('UPDATE seasons SET year=?, title=?, description=?, image=?, achievements=?, display_order=? WHERE id=?')
        .run(year, title, description, image, achievements, display_order ?? 0, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM seasons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
