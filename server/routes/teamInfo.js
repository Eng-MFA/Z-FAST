const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// GET /api/team-info — returns all key/value pairs as object
router.get('/', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM team_info').all();
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    res.json(obj);
});

// PUT /api/team-info — update key/value pairs (admin only)
router.put('/', requireAuth, (req, res) => {
    const updates = req.body; // { key: value, ... }
    const upsert = db.prepare(
        'INSERT INTO team_info (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    );
    db.exec('BEGIN');
    try {
        for (const [key, value] of Object.entries(updates)) {
            upsert.run(key, value);
        }
        db.exec('COMMIT');
    } catch (e) {
        db.exec('ROLLBACK');
        return res.status(500).json({ error: e.message });
    }
    res.json({ success: true });
});

module.exports = router;
