const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', (req, res) => {
    const members = db.prepare('SELECT * FROM team_members ORDER BY department, display_order').all();
    res.json(members);
});

router.get('/:id', (req, res) => {
    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: 'Not found' });
    res.json(member);
});

router.post('/', requireAuth, (req, res) => {
    const { name, role, department, bio, image, linkedin, display_order } = req.body;
    const result = db.prepare(
        'INSERT INTO team_members (name, role, department, bio, image, linkedin, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, role, department || 'Technical', bio || '', image || '', linkedin || '', display_order || 0);
    res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
    const { name, role, department, bio, image, linkedin, display_order } = req.body;
    db.prepare(
        'UPDATE team_members SET name=?, role=?, department=?, bio=?, image=?, linkedin=?, display_order=? WHERE id=?'
    ).run(name, role, department, bio, image, linkedin, display_order ?? 0, req.params.id);
    res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
