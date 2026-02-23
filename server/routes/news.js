const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        res.json(await db.prepare('SELECT * FROM news ORDER BY published_at DESC LIMIT ?').all(limit));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await db.prepare('SELECT * FROM news WHERE id=?').get(req.params.id);
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
    const { title, summary, content, image, category } = req.body;
    try {
        const r = await db.prepare(
            'INSERT INTO news (title,summary,content,image,category) VALUES (?,?,?,?,?)'
        ).run(title, summary || '', content || '', image || '', category || 'general');
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
    const { title, summary, content, image, category } = req.body;
    try {
        await db.prepare('UPDATE news SET title=?,summary=?,content=?,image=?,category=? WHERE id=?')
            .run(title, summary, content, image, category, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM news WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
