# Z-FAST Website

A full-stack website for Z-FAST Electric Racing Team.

## Quick Start

```bash
npm install
npm start
```

Then open:
- 🌐 **Website** → http://localhost:3000
- 📊 **Admin Panel** → http://localhost:3000/admin

## Default Admin Credentials




## Project Structure

```
z-fast/
├── server/            ← Node.js + Express backend
│   ├── index.js       ← Server entry point
│   ├── db.js          ← SQLite database + seed data
│   └── routes/        ← API route handlers
│       ├── auth.js
│       ├── teamInfo.js
│       ├── teamMembers.js
│       ├── sponsors.js
│       ├── seasons.js
│       ├── news.js
│       ├── carSpecs.js
│       ├── contact.js
│       └── upload.js
├── public/            ← Frontend (served statically)
│   ├── index.html     ← Main website
│   ├── css/style.css  ← Global styles
│   ├── js/app.js      ← Frontend logic
│   ├── admin/         ← Admin panel
│   │   ├── index.html
│   │   ├── admin.css
│   │   └── admin.js
│   ├── img/           ← Put your images here
│   │   ├── logo.png   ← Team logo
│   │   └── car.jpg    ← Car photo
│   └── uploads/       ← Auto-created for uploaded images
└── data/              ← Auto-created SQLite database
```

## Adding Your Logo

Place your logo file at `public/img/logo.png`.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/team-info` | ❌ | Get all site settings |
| PUT | `/api/team-info` | ✅ | Update site settings |
| GET | `/api/car-specs` | ❌ | Get car specifications |
| GET/POST/PUT/DELETE | `/api/team-members/{id}` | ✅ | Manage team members |
| GET/POST/PUT/DELETE | `/api/sponsors/{id}` | ✅ | Manage sponsors |
| GET/POST/PUT/DELETE | `/api/seasons/{id}` | ✅ | Manage seasons |
| GET/POST/PUT/DELETE | `/api/news/{id}` | ✅ | Manage news articles |
| POST | `/api/contact` | ❌ | Submit contact form |
| GET | `/api/contact` | ✅ | View contact messages |
| POST | `/api/upload` | ✅ | Upload image |
| POST | `/api/auth/login` | ❌ | Admin login |
