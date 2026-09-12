const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('./auth');

// ── GET /api/recruitment (Public) ──────────────────────────
router.get('/', async (req, res) => {
    try {
        let row = await db.prepare('SELECT * FROM recruitment_settings WHERE id = 1').get();
        if (!row) {
            // Fallback default
            row = {
                id: 1,
                is_open: 0,
                welcome_title: 'Join the Z-FAST Electric Racing Team',
                welcome_message: 'We are looking for passionate students to join our engineering and management sub-teams. Dare to innovate and race with us!',
                primary_btn_text: 'Apply Now',
                primary_btn_url: 'https://forms.google.com',
                secondary_btn_enabled: 0,
                secondary_btn_text: 'Recruitment Guide',
                secondary_btn_url: '#contact',
                closing_date: null,
            };
        }

        const now = Date.now();
        let isExpired = false;
        let remainingSeconds = null;

        if (row.closing_date) {
            const closingTime = new Date(row.closing_date).getTime();
            if (!isNaN(closingTime)) {
                if (closingTime <= now) {
                    isExpired = true;
                    remainingSeconds = 0;
                } else {
                    remainingSeconds = Math.max(0, Math.floor((closingTime - now) / 1000));
                }
            }
        }

        const isOpen = Boolean(row.is_open);
        const isCurrentlyActive = isOpen && !isExpired;

        res.json({
            id: row.id,
            is_open: isOpen ? 1 : 0,
            welcome_title: row.welcome_title || '',
            welcome_message: row.welcome_message || '',
            primary_btn_text: row.primary_btn_text || 'Apply Now',
            primary_btn_url: row.primary_btn_url || '',
            secondary_btn_enabled: Boolean(row.secondary_btn_enabled) ? 1 : 0,
            secondary_btn_text: row.secondary_btn_text || '',
            secondary_btn_url: row.secondary_btn_url || '',
            closing_date: row.closing_date || null,
            is_expired: isExpired,
            is_active: isCurrentlyActive,
            remaining_seconds: remainingSeconds,
            server_time: new Date().toISOString()
        });
    } catch (e) {
        console.error('Error fetching recruitment settings:', e);
        res.status(500).json({ error: e.message });
    }
});

// ── PUT /api/recruitment (Admin only) ───────────────────────
router.put('/', requireAuth, async (req, res) => {
    try {
        const {
            is_open,
            welcome_title,
            welcome_message,
            primary_btn_text,
            primary_btn_url,
            secondary_btn_enabled,
            secondary_btn_text,
            secondary_btn_url,
            closing_date
        } = req.body;

        const isOpenVal = (is_open === true || is_open === 1 || is_open === '1') ? 1 : 0;
        const secondaryEnabledVal = (secondary_btn_enabled === true || secondary_btn_enabled === 1 || secondary_btn_enabled === '1') ? 1 : 0;
        const titleVal = (welcome_title !== undefined) ? String(welcome_title).trim() : 'Join the Z-FAST Electric Racing Team';
        const messageVal = (welcome_message !== undefined) ? String(welcome_message).trim() : '';
        const primaryTextVal = (primary_btn_text !== undefined) ? String(primary_btn_text).trim() : 'Apply Now';
        const primaryUrlVal = (primary_btn_url !== undefined) ? String(primary_btn_url).trim() : '';
        const secondaryTextVal = (secondary_btn_text !== undefined) ? String(secondary_btn_text).trim() : '';
        const secondaryUrlVal = (secondary_btn_url !== undefined) ? String(secondary_btn_url).trim() : '';
        const closingDateVal = (closing_date && String(closing_date).trim()) ? String(closing_date).trim() : null;

        const sql = `
            INSERT INTO recruitment_settings (
                id, is_open, welcome_title, welcome_message, primary_btn_text, primary_btn_url,
                secondary_btn_enabled, secondary_btn_text, secondary_btn_url, closing_date, updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                is_open = excluded.is_open,
                welcome_title = excluded.welcome_title,
                welcome_message = excluded.welcome_message,
                primary_btn_text = excluded.primary_btn_text,
                primary_btn_url = excluded.primary_btn_url,
                secondary_btn_enabled = excluded.secondary_btn_enabled,
                secondary_btn_text = excluded.secondary_btn_text,
                secondary_btn_url = excluded.secondary_btn_url,
                closing_date = excluded.closing_date,
                updated_at = excluded.updated_at
        `;

        await db.prepare(sql).run(
            isOpenVal,
            titleVal,
            messageVal,
            primaryTextVal,
            primaryUrlVal,
            secondaryEnabledVal,
            secondaryTextVal,
            secondaryUrlVal,
            closingDateVal
        );

        res.json({ success: true, message: 'Recruitment settings updated successfully' });
    } catch (e) {
        console.error('Error updating recruitment settings:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
