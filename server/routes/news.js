const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json(db.prepare('SELECT * FROM news ORDER BY published_at DESC LIMIT ?').all(limit));
});

router.get('/:id', (req, res) => {
    const item = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
});

router.post('/', requireAuth, (req, res) => {
    const { title, summary, content, image, category } = req.body;
    const result = db.prepare(
        'INSERT INTO news (title, summary, content, image, category) VALUES (?, ?, ?, ?, ?)'
    ).run(title, summary || '', content || '', image || '', category || 'general');
    res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
    const { title, summary, content, image, category } = req.body;
    db.prepare('UPDATE news SET title=?, summary=?, content=?, image=?, category=? WHERE id=?')
        .run(title, summary, content, image, category, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
