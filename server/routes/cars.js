const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try {
        const cars = await db.prepare('SELECT * FROM cars ORDER BY display_order ASC, id ASC').all();
        cars.forEach(c => { try { c.specs = JSON.parse(c.specs || '[]'); } catch { c.specs = []; } });
        res.json(cars);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const car = await db.prepare('SELECT * FROM cars WHERE id=?').get(req.params.id);
        if (!car) return res.status(404).json({ error: 'Not found' });
        try { car.specs = JSON.parse(car.specs || '[]'); } catch { car.specs = []; }
        res.json(car);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
    const { name, year, description, image, specs, display_order } = req.body;
    try {
        const r = await db.prepare(
            'INSERT INTO cars (name,year,description,image,specs,display_order) VALUES (?,?,?,?,?,?)'
        ).run(name, year || null, description || '', image || '', JSON.stringify(specs || []), display_order || 0);
        res.json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
    const { name, year, description, image, specs, display_order } = req.body;
    try {
        await db.prepare(
            'UPDATE cars SET name=?,year=?,description=?,image=?,specs=?,display_order=? WHERE id=?'
        ).run(name, year || null, description || '', image || '', JSON.stringify(specs || []), display_order || 0, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
