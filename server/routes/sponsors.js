const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM sponsors ORDER BY display_order').all());
});

router.post('/', requireAuth, (req, res) => {
    const { name, logo, website, tier, display_order } = req.body;
    const result = db.prepare(
        'INSERT INTO sponsors (name, logo, website, tier, display_order) VALUES (?, ?, ?, ?, ?)'
    ).run(name, logo || '', website || '#', tier || 'silver', display_order || 0);
    res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
    const { name, logo, website, tier, display_order } = req.body;
    db.prepare('UPDATE sponsors SET name=?, logo=?, website=?, tier=?, display_order=? WHERE id=?')
        .run(name, logo, website, tier, display_order ?? 0, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM sponsors WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
