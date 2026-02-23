const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'zfast_secret_key_2024';

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        const admin = await db.prepare('SELECT * FROM admins WHERE username=?').get(username);
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
        if (!bcrypt.compareSync(password, admin.password)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET, { expiresIn: '24h' });
        res.json({ token, username: admin.username });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const admin = await db.prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
        if (!bcrypt.compareSync(currentPassword, admin.password))
            return res.status(401).json({ error: 'Current password is incorrect' });
        const hash = bcrypt.hashSync(newPassword, 10);
        await db.prepare('UPDATE admins SET password=? WHERE id=?').run(hash, req.admin.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verify', requireAuth, (req, res) => {
    res.json({ valid: true, username: req.admin.username });
});

function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.admin = jwt.verify(auth.slice(7), SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Token invalid or expired' });
    }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
