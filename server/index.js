// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 7860;
const isProd = process.env.NODE_ENV === 'production';

// ── Security Headers ─────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// ── CORS ─────────────────────────────────────────────────────
// Auto-allows: localhost (any port), *.vercel.app, and any URL in ALLOWED_ORIGIN env
const extraOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',').map(o => o.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;                                        // same-origin / server-to-server
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;  // local dev
    if (/\.vercel\.app$/.test(origin)) return true;                 // any Vercel preview/prod URL
    if (origin === 'https://z-fast-racing-team.vercel.app') return true; // Explicit prod URL
    if (/\.railway\.app$/.test(origin)) return true;                // Railway itself
    if (extraOrigins.includes(origin)) return true;                  // custom ALLOWED_ORIGIN
    return false;
}

app.use(cors({
    origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, true);
        console.warn('🚫 CORS blocked:', origin);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Ensure Required Directories ───────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const dataDir = path.join(__dirname, '..', 'data');
[uploadsDir, dataDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: isProd ? '1d' : 0,   // Cache static assets in production
    etag: true,
}));
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// ── Initialize DB ─────────────────────────────────────────────
const db = require('./db');

// ── Health Check (must be FIRST — no DB dependency) ─────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', ts: Date.now() }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/team-info', require('./routes/teamInfo'));
app.use('/api/team-members', require('./routes/teamMembers'));
app.use('/api/sponsors', require('./routes/sponsors'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/media-coverage', require('./routes/mediaCoverage'));
app.use('/api/seasons', require('./routes/seasons'));   // gallery routes included inside
app.use('/api/news', require('./routes/news'));
app.use('/api/car-specs', require('./routes/carSpecs'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/about', require('./routes/about'));
app.use('/api/backup', require('./routes/backup'));

// ── SPA Fallback ──────────────────────────────────────────────
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: isProd ? 'Internal server error' : err.message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏎️  Z-FAST Server running`);
    console.log(`🌍  Mode:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗  Local:  http://localhost:${PORT}`);
    console.log(`📊  Admin:  http://localhost:${PORT}/admin\n`);
});
