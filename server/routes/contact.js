const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// POST /api/contact — public form submission
router.post('/', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
        .run(name, email, subject || '', message);
    res.json({ success: true });
});

// GET /api/contact — admin only: list all messages
router.get('/', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all());
});

// PUT /api/contact/:id/read — mark as read
router.put('/:id/read', requireAuth, (req, res) => {
    db.prepare('UPDATE contact_messages SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// DELETE /api/contact/:id
router.delete('/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
