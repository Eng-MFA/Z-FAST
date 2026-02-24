// Uses sqlite3 — stable, no experimental flags, works on Node 18+
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ── Path ──────────────────────────────────────────────────────
// Railway: set DATA_DIR env var to match your Volume mount path (/app/data)
// Local:   falls back to <project>/data/
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const _db = new sqlite3.Database(path.join(dataDir, 'zfast.db'));
_db.configure('busyTimeout', 10000);

// ── Promise Helpers ───────────────────────────────────────────
// These expose the same interface as the old node:sqlite API so
// routes only need "async/await" changes — nothing else.
const dbExec = (sql) => new Promise((res, rej) =>
  _db.exec(sql, err => err ? rej(err) : res()));

const dbRun = (sql, params = []) => new Promise((res, rej) =>
  _db.run(sql, params, function (err) {
    err ? rej(err) : res({ lastInsertRowid: this.lastID, changes: this.changes });
  }));

const dbGet = (sql, params = []) => new Promise((res, rej) =>
  _db.get(sql, params, (err, row) => err ? rej(err) : res(row || null)));

const dbAll = (sql, params = []) => new Promise((res, rej) =>
  _db.all(sql, params, (err, rows) => err ? rej(err) : res(rows || [])));

// prepare() returns an object matching the node:sqlite Statement interface
const prepare = (sql) => ({
  get: (...params) => dbGet(sql, params.flat()),
  all: (...params) => dbAll(sql, params.flat()),
  run: (...params) => dbRun(sql, params.flat()),
});

// ── Schema (runs in serialize so order is guaranteed) ─────────
_db.serialize(() => {
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  // Tables — split into individual run() calls because sqlite3
  // exec() can handle multi-statement, but serialize keeps order
  _db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS team_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    bio TEXT,
    image TEXT,
    linkedin TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    website TEXT,
    tier TEXT DEFAULT 'silver',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    achievements TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    image TEXT,
    category TEXT DEFAULT 'general',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS car_specs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER DEFAULT 2024,
    description TEXT,
    image TEXT,
    specs TEXT DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS about_slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS season_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    image TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
  );
`);

  // ── Seed Admin ──────────────────────────────────────────────
  const hash = bcrypt.hashSync('zfast2024', 10);
  _db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', ?)`, [hash]);

  // ── Seed Team Info ──────────────────────────────────────────
  const seedInfo = (k, v) =>
    _db.run(`INSERT OR IGNORE INTO team_info (key, value) VALUES (?, ?)`, [k, v]);
  seedInfo('hero_title', 'Powering the Future of Electric Racing.');
  seedInfo('hero_subtitle', 'Z-FAST is a university electric racing team pushing the boundaries of EV technology on and off the track.');
  seedInfo('hero_cta_primary', 'Explore The Machine');
  seedInfo('hero_cta_secondary', 'Meet The Team');
  seedInfo('sponsorship_title', 'Partner with Z-FAST: Drive Innovation, Shape the Future.');
  seedInfo('sponsorship_subtitle', 'Join us and be part of the electric revolution in motorsport.');
  seedInfo('contact_email', 'team@z-fast.com');
  seedInfo('contact_phone', '+20 100 000 0000');
  seedInfo('instagram', 'https://instagram.com/zfast_team');
  seedInfo('facebook', 'https://facebook.com/zfast.team');
  seedInfo('linkedin', 'https://linkedin.com/company/zfast-team');
  seedInfo('youtube', 'https://youtube.com/@zfast');
  seedInfo('hero_stat_1_value', '2.8');
  seedInfo('hero_stat_1_suffix', 's');
  seedInfo('hero_stat_1_label', '0-100 km/h');
  seedInfo('hero_stat_2_value', '80');
  seedInfo('hero_stat_2_suffix', 'kW');
  seedInfo('hero_stat_2_label', 'Motor Power');
  seedInfo('hero_stat_3_value', '280');
  seedInfo('hero_stat_3_suffix', 'kg');
  seedInfo('hero_stat_3_label', 'Total Weight');

  // ── Seed Car Specs ──────────────────────────────────────────
  _db.get('SELECT id FROM car_specs LIMIT 1', (err, row) => {
    if (!row) {
      const s = `INSERT INTO car_specs (category,label,value,unit,icon,display_order) VALUES (?,?,?,?,?,?)`;
      [
        ['Performance', '0-100 km/h', '2.8', 's', '⚡', 1],
        ['Performance', 'Top Speed', '130', 'km/h', '🏁', 2],
        ['Powertrain', 'Motor Power', '80', 'kW', '⚙️', 3],
        ['Powertrain', 'Peak Torque', '210', 'Nm', '🔩', 4],
        ['Battery', 'Capacity', '6.5', 'kWh', '🔋', 5],
        ['Battery', 'Voltage', '600', 'V', '⚡', 6],
        ['Chassis', 'Total Weight', '280', 'kg', '🏗️', 7],
        ['Chassis', 'Wheelbase', '1550', 'mm', '📐', 8],
      ].forEach(r => _db.run(s, r));
    }
  });

  // ── Seed Cars ────────────────────────────────────────────────
  _db.get('SELECT id FROM cars LIMIT 1', (err, row) => {
    if (!row) {
      const ev1 = JSON.stringify([
        { icon: '⚡', label: '0-100 km/h', value: '2.8', unit: 's' },
        { icon: '🏁', label: 'Top Speed', value: '130', unit: 'km/h' },
        { icon: '⚙️', label: 'Motor Power', value: '80', unit: 'kW' },
        { icon: '🔩', label: 'Peak Torque', value: '210', unit: 'Nm' },
        { icon: '🔋', label: 'Battery', value: '6.5', unit: 'kWh' },
        { icon: '⚡', label: 'Voltage', value: '400', unit: 'V' },
        { icon: '🏗️', label: 'Weight', value: '280', unit: 'kg' },
        { icon: '📐', label: 'Wheelbase', value: '1550', unit: 'mm' },
      ]);
      const ev2 = JSON.stringify([
        { icon: '⚡', label: '0-100 km/h', value: '2.5', unit: 's' },
        { icon: '🏁', label: 'Top Speed', value: '140', unit: 'km/h' },
        { icon: '⚙️', label: 'Motor Power', value: '95', unit: 'kW' },
        { icon: '🔩', label: 'Peak Torque', value: '240', unit: 'Nm' },
        { icon: '🔋', label: 'Battery', value: '7.2', unit: 'kWh' },
        { icon: '⚡', label: 'Voltage', value: '600', unit: 'V' },
        { icon: '🏗️', label: 'Weight', value: '265', unit: 'kg' },
        { icon: '📐', label: 'Wheelbase', value: '1520', unit: 'mm' },
      ]);
      const c = `INSERT INTO cars (name,year,description,image,specs,display_order) VALUES (?,?,?,?,?,?)`;
      _db.run(c, ['Z-FAST EV-1', 2024, 'Our inaugural Formula Student electric vehicle. Built from the ground up for performance, efficiency, and reliability.', '', ev1, 1]);
      _db.run(c, ['Z-FAST EV-2', 2025, 'Second generation racer — upgraded aerodynamics, 600V battery system, and an all-new powertrain pushing the limits further.', '', ev2, 2]);
    }
  });

  // ── Seed Team Members ───────────────────────────────────────
  _db.get('SELECT id FROM team_members LIMIT 1', (err, row) => {
    if (!row) {
      const m = `INSERT INTO team_members (name,role,department,bio,image,linkedin,display_order) VALUES (?,?,?,?,?,?,?)`;
      [
        ['Ahmed Hassan', 'Team Captain', 'Management', 'Leading Z-FAST with passion for electric motorsport innovation.', '', '#', 1],
        ['Sara Khalil', 'Electrical Lead', 'Technical', 'Designing high-voltage battery management systems.', '', '#', 2],
        ['Omar Fathy', 'Mechanical Design', 'Technical', 'Crafting the lightweight chassis and aerodynamic package.', '', '#', 3],
        ['Nour Samir', 'Software Engineer', 'Technical', 'Building telemetry systems and embedded motor controllers.', '', '#', 4],
      ].forEach(r => _db.run(m, r));
    }
  });

  // ── Seed Sponsors ───────────────────────────────────────────
  _db.get('SELECT id FROM sponsors LIMIT 1', (err, row) => {
    if (!row) {
      const sp = `INSERT INTO sponsors (name,logo,website,tier,display_order) VALUES (?,?,?,?,?)`;
      [['TechCorp', '', '#', 'gold', 1], ['EV Motors', '', '#', 'gold', 2], ['University', '', '#', 'silver', 3]].forEach(r => _db.run(sp, r));
    }
  });

  // ── Seed Seasons ─────────────────────────────────────────────
  _db.get('SELECT id FROM seasons LIMIT 1', (err, row) => {
    if (!row) {
      const ss = `INSERT INTO seasons (year,title,description,image,achievements,display_order) VALUES (?,?,?,?,?,?)`;
      [
        [2024, 'Season 2024', 'Our inaugural season competing in the national EV Formula Student competition.', '', 'Best Design Award, 3rd Place Overall', 1],
        [2025, 'Season 2025', 'New aerodynamics package and upgraded battery system pushing performance further.', '', '1st Place Endurance, Best EV Award', 2],
      ].forEach(r => _db.run(ss, r));
    }
  });

  // ── Seed News ──────────────────────────────────────────────
  _db.get('SELECT id FROM news LIMIT 1', (err, row) => {
    if (!row) {
      const n = `INSERT INTO news (title,summary,content,image,category) VALUES (?,?,?,?,?)`;
      [
        ['Z-FAST Wins Best Design Award at FSAE 2024', 'Our team took home the prestigious Best Design Award at the Formula Student competition.', '', '', 'achievement'],
        ['New Battery System Achieves 600V Milestone', 'Our electrical team successfully tested the new 600V high-voltage system.', '', '', 'technical'],
      ].forEach(r => _db.run(n, r));
    }
  });

  _db.run('SELECT 1', () => console.log('✅ Database ready (sqlite3)'));
});

// ── Export ────────────────────────────────────────────────────
// Routes use: await db.prepare('SQL').get(...), .all(...), .run(...)
//             await db.exec('SQL')        ← for transactions/DDL
module.exports = { prepare, exec: dbExec, run: dbRun, get: dbGet, all: dbAll };
