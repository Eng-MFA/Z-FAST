const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

router.get('/', async (req, res) => {
    try { res.json(await db.prepare('SELECT * FROM sponsors ORDER BY display_order').all()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
    const { name, logo, website, tier, display_order } = req.body;
    try {
        const r = await db.prepare(
            'INSERT INTO sponsors (name,logo,website,tier,display_order) VALUES (?,?,?,?,?)'
        ).run(name, logo || '', website || '#', tier || 'silver', display_order || 0);
        res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
    const { name, logo, website, tier, display_order } = req.body;
    try {
        await db.prepare('UPDATE sponsors SET name=?,logo=?,website=?,tier=?,display_order=? WHERE id=?')
            .run(name, logo, website, tier, display_order ?? 0, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try { await db.prepare('DELETE FROM sponsors WHERE id=?').run(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
