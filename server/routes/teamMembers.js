const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM team_members';
        const params = [];
        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }
        query += ' ORDER BY display_order ASC, id ASC';
        res.json(await db.prepare(query).all(...params));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const m = await db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
        if (!m) return res.status(404).json({ error: 'Not found' });
        res.json(m);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
    const { name, role, department, category, team_year, bio, image, linkedin, display_order } = req.body;
    try {
        const r = await db.prepare(
            'INSERT INTO team_members (name, role, department, category, team_year, bio, image, linkedin, display_order) VALUES (?,?,?,?,?,?,?,?,?)'
        ).run(
            name,
            role,
            department || 'Technical',
            category === 'alumni' ? 'alumni' : 'current',
            team_year || '',
            bio || '',
            image || '',
            linkedin || '',
            display_order || 0
        );
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
    const { name, role, department, category, team_year, bio, image, linkedin, display_order } = req.body;
    try {
        await db.prepare(
            'UPDATE team_members SET name=?, role=?, department=?, category=?, team_year=?, bio=?, image=?, linkedin=?, display_order=? WHERE id=?'
        ).run(
            name,
            role,
            department || 'Technical',
            category === 'alumni' ? 'alumni' : 'current',
            team_year || '',
            bio,
            image,
            linkedin,
            display_order ?? 0,
            req.params.id
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM team_members WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
