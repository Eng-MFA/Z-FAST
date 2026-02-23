const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM car_specs ORDER BY display_order').all());
});

router.put('/:id', requireAuth, (req, res) => {
    const { category, label, value, unit, icon, display_order } = req.body;
    db.prepare('UPDATE car_specs SET category=?, label=?, value=?, unit=?, icon=?, display_order=? WHERE id=?')
        .run(category, label, value, unit || '', icon || '', display_order ?? 0, req.params.id);
    res.json({ success: true });
});

router.post('/', requireAuth, (req, res) => {
    const { category, label, value, unit, icon, display_order } = req.body;
    const result = db.prepare(
        'INSERT INTO car_specs (category, label, value, unit, icon, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(category, label, value, unit || '', icon || '', display_order || 0);
    res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM car_specs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
