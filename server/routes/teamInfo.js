const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT key, value FROM team_info').all();
        const obj = {};
        rows.forEach(r => obj[r.key] = r.value);
        res.json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', requireAuth, async (req, res) => {
    const updates = req.body;
    const sql =
        'INSERT INTO team_info (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at';
    try {
        for (const [key, value] of Object.entries(updates))
            await db.prepare(sql).run(key, value);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
