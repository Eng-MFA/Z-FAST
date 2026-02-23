const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// GET all cars ordered (public)
router.get('/', (req, res) => {
    const cars = db.prepare('SELECT * FROM cars ORDER BY display_order ASC, id ASC').all();
    cars.forEach(c => {
        try { c.specs = JSON.parse(c.specs || '[]'); } catch { c.specs = []; }
    });
    res.json(cars);
});

// GET single car
router.get('/:id', requireAuth, (req, res) => {
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!car) return res.status(404).json({ error: 'Not found' });
    try { car.specs = JSON.parse(car.specs || '[]'); } catch { car.specs = []; }
    res.json(car);
});

// POST create car (admin)
router.post('/', requireAuth, (req, res) => {
    const { name, year, description, image, specs, display_order } = req.body;
    const r = db.prepare(
        'INSERT INTO cars (name, year, description, image, specs, display_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, year || null, description || '', image || '', JSON.stringify(specs || []), display_order || 0);
    res.json({ id: r.lastInsertRowid });
});

// PUT update car (admin)
router.put('/:id', requireAuth, (req, res) => {
    const { name, year, description, image, specs, display_order } = req.body;
    db.prepare(
        'UPDATE cars SET name=?, year=?, description=?, image=?, specs=?, display_order=? WHERE id=?'
    ).run(name, year || null, description || '', image || '', JSON.stringify(specs || []), display_order || 0, req.params.id);
    res.json({ success: true });
});

// DELETE car (admin)
router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
