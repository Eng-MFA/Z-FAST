const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.post('/', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    try {
        await db.prepare('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)')
            .run(name, email, subject || '', message);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', requireAuth, async (req, res) => {
    try { res.json(await db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/read', requireAuth, async (req, res) => {
    try { await db.prepare('UPDATE contact_messages SET read=1 WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM contact_messages WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
