/* ============================================================
   Z-FAST — Main Application JavaScript
   ============================================================ */

const API = (typeof window !== 'undefined' && window.ZFAST_API) ? window.ZFAST_API : '';

// ── Utility ────────────────────────────────────────────────
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

async function apiFetch(path) {
    try {
        const r = await fetch(API + path);
        if (!r.ok) return null;
        return r.json();
    } catch { return null; }
}

// ── Navbar ─────────────────────────────────────────────────
const navbar = $('#navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// Mobile hamburger
const hamburger = $('#hamburger');
const navLinks = $('.nav-links');
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
});
navLinks.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
    }
});

// ── Particle Canvas ─────────────────────────────────────────
(function initParticles() {
    const canvas = $('#particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const COLORS = ['rgba(240,151,42,', 'rgba(29,52,97,', 'rgba(255,255,255,'];

    function spawn() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            pulse: Math.random() * Math.PI * 2,
        };
    }

    for (let i = 0; i < 140; i++) particles.push(spawn());

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const t = Date.now() / 1000;
        particles.forEach(p => {
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            const a = p.alpha * (0.6 + 0.4 * Math.sin(t + p.pulse));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color + a + ')';
            ctx.fill();
        });
        animId = requestAnimationFrame(draw);
    }
    draw();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animId);
        else draw();
    });
})();

// ── Reveal Animations ───────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
        if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), i * 80);
            revealObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

function observeReveals() {
    $$('.reveal').forEach(el => revealObserver.observe(el));
}
observeReveals();

// ── Load Team Info ──────────────────────────────────────────
async function loadTeamInfo() {
    const info = await apiFetch('/api/team-info');
    if (!info) return;
    const set = (id, val) => { const e = document.getElementById(id); if (e && val) e.textContent = val; };
    const setHref = (id, val) => { const e = document.getElementById(id); if (e && val) e.href = val; };
    set('hero-title', info.hero_title);
    set('hero-subtitle', info.hero_subtitle);
    const p = document.getElementById('hero-cta-primary');
    if (p && info.hero_cta_primary) p.textContent = info.hero_cta_primary;
    const s = document.getElementById('hero-cta-secondary');
    if (s && info.hero_cta_secondary) s.textContent = info.hero_cta_secondary;
    set('sponsorship-subtitle', info.sponsorship_subtitle);
    set('contact-email', info.contact_email);
    set('contact-phone', info.contact_phone);
    setHref('social-facebook', info.facebook);
    setHref('social-instagram', info.instagram);
    setHref('social-linkedin', info.linkedin);
    setHref('social-youtube', info.youtube);
    if (info.about_subtitle) set('about-subtitle', info.about_subtitle);
}

// ── About Us Carousel ──────────────────────────────────────
async function loadAbout() {
    const slides = await apiFetch('/api/about');
    const frame = document.getElementById('about-frame');
    const captionEl = document.getElementById('about-caption');
    const dotsEl = document.getElementById('about-dots');
    const prevBtn = document.getElementById('about-prev');
    const nextBtn = document.getElementById('about-next');
    if (!frame) return;

    if (!slides || slides.length === 0) return; // keep placeholder

    let current = 0;
    let autoTimer;

    function renderSlide(idx) {
        frame.style.opacity = '0';
        setTimeout(() => {
            const s = slides[idx];
            frame.innerHTML = `<img src="${s.image}" alt="${s.caption || 'About Z-FAST'}" class="about-slide-img" />`;
            if (captionEl) captionEl.textContent = s.caption || '';
            // dots
            if (dotsEl) {
                dotsEl.innerHTML = slides.map((_, i) =>
                    `<button class="about-dot${i === idx ? ' active' : ''}" data-idx="${i}" aria-label="Slide ${i + 1}"></button>`
                ).join('');
                dotsEl.querySelectorAll('.about-dot').forEach(d => {
                    d.addEventListener('click', () => goTo(parseInt(d.dataset.idx)));
                });
            }
            frame.style.opacity = '1';
        }, 200);
    }

    function goTo(idx) {
        current = (idx + slides.length) % slides.length;
        renderSlide(current);
        resetAuto();
    }

    function resetAuto() {
        clearInterval(autoTimer);
        autoTimer = setInterval(() => goTo(current + 1), 4000);
    }

    prevBtn?.addEventListener('click', () => goTo(current - 1));
    nextBtn?.addEventListener('click', () => goTo(current + 1));

    frame.style.transition = 'opacity 0.3s ease';
    renderSlide(0);
    resetAuto();

    if (slides.length <= 1) {
        prevBtn && (prevBtn.style.display = 'none');
        nextBtn && (nextBtn.style.display = 'none');
    }
}

// ── Car Carousel ─────────────────────────────────────────────
async function loadCars() {
    const cars = await apiFetch('/api/cars');
    if (!cars || cars.length === 0) return;

    const frame = document.getElementById('car-frame');
    const specsContainer = document.getElementById('specs-container');
    const indicator = document.getElementById('car-indicator');
    const nameBadge = document.getElementById('car-name-badge');
    const descEl = document.getElementById('car-desc');
    const prevBtn = document.getElementById('car-prev');
    const nextBtn = document.getElementById('car-next');
    if (!frame) return;

    let current = 0;

    indicator.innerHTML = cars.map((_, i) =>
        `<button class="car-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Car ${i + 1}"></button>`
    ).join('');
    indicator.querySelectorAll('.car-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.idx);
            if (idx === current) return;
            renderCar(idx, idx > current ? 'next' : 'prev');
            current = idx;
        });
    });

    function renderCar(idx, dir = 'none') {
        const car = cars[idx];
        if (dir !== 'none') {
            frame.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            frame.style.opacity = '0';
            frame.style.transform = dir === 'next' ? 'translateX(-20px)' : 'translateX(20px)';
        }
        setTimeout(() => {
            if (car.image) {
                frame.innerHTML = `<img src="${car.image}" alt="${car.name}" style="width:100%;height:100%;object-fit:cover" />`;
            } else {
                frame.innerHTML = `<div class="car-placeholder"><div class="car-glow-ring"></div><div class="car-placeholder-text">${car.name}</div></div>`;
            }
            if (nameBadge) nameBadge.textContent = `${car.name} · ${car.year || ''}`;
            if (descEl) descEl.textContent = car.description || '';
            if (specsContainer) {
                specsContainer.innerHTML = '';
                (car.specs || []).slice(0, 8).forEach(spec => {
                    const card = el('div', 'spec-card');
                    const numVal = parseFloat(spec.value);
                    const isNum = !isNaN(numVal);
                    card.innerHTML = `
                        <div class="spec-icon">${spec.icon || '⚡'}</div>
                        <div class="spec-value${isNum ? ' counter-val' : ''}"
                          ${isNum ? `data-target="${numVal}" data-suffix="${spec.unit || ''}"` : ''}>
                          ${spec.value}${spec.unit || ''}</div>
                        <div class="spec-label">${spec.label}</div>`;
                    specsContainer.appendChild(card);
                    if (isNum) {
                        const obs = new IntersectionObserver(entries => {
                            entries.forEach(en => { if (en.isIntersecting) { animateCounter(en.target); obs.unobserve(en.target); } });
                        }, { threshold: 0.3 });
                        obs.observe(card.querySelector('.counter-val'));
                    }
                });
            }
            indicator.querySelectorAll('.car-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
            if (dir !== 'none') {
                frame.style.transition = 'none';
                frame.style.opacity = '0';
                frame.style.transform = dir === 'next' ? 'translateX(20px)' : 'translateX(-20px)';
                requestAnimationFrame(() => {
                    frame.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    frame.style.opacity = '1';
                    frame.style.transform = 'translateX(0)';
                });
            }
        }, dir !== 'none' ? 250 : 0);
    }

    prevBtn?.addEventListener('click', () => { current = (current - 1 + cars.length) % cars.length; renderCar(current, 'prev'); });
    nextBtn?.addEventListener('click', () => { current = (current + 1) % cars.length; renderCar(current, 'next'); });
    if (cars.length <= 1) { if (prevBtn) prevBtn.style.display = 'none'; if (nextBtn) nextBtn.style.display = 'none'; }
    renderCar(0);
    observeReveals();
}

// ── Animated Counters ───────────────────────────────────────
function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const decimals = target % 1 !== 0 ? 1 : 0;
    const duration = 1800;
    const start = performance.now();
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── Load Team Members ───────────────────────────────────────
async function loadTeam() {
    const members = await apiFetch('/api/team-members');
    if (!members) return;
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    let activeDept = 'all';
    function renderMembers(dept) {
        activeDept = dept;
        const filtered = dept === 'all' ? members : members.filter(m => m.department === dept);
        grid.style.opacity = '0';
        setTimeout(() => {
            grid.innerHTML = '';
            filtered.forEach(m => {
                const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2);
                const card = el('div', 'member-card');
                const linkedinBadge = m.linkedin && m.linkedin !== '#'
                    ? `<a href="${m.linkedin}" class="member-linkedin-float" target="_blank" rel="noopener" title="View LinkedIn Profile" onclick="event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>` : '';
                card.innerHTML = `
          <div class="member-img-wrap">
            ${m.image ? `<img src="${m.image}" alt="${m.name}" loading="lazy" />` : `<div class="member-avatar-placeholder">${initials}</div>`}
            <div class="member-hover-overlay"><p>${m.bio || 'Team member'}</p></div>
            ${linkedinBadge}
          </div>
          <div class="member-info">
            <div class="member-name">${m.name}</div>
            <div class="member-role">${m.role}</div>
            <span class="member-dept-badge">${m.department}</span>
          </div>`;
                grid.appendChild(card);
            });
            grid.style.opacity = '1';
        }, 200);
    }
    grid.style.transition = 'opacity 0.2s ease';
    renderMembers('all');
    $$('.dept-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.dept-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMembers(tab.dataset.dept);
        });
    });
}

// ── Load Sponsors ───────────────────────────────────────────
async function loadSponsors() {
    const sponsors = await apiFetch('/api/sponsors');
    if (!sponsors) return;
    const carousel = document.getElementById('sponsors-carousel');
    if (!carousel) return;
    carousel.innerHTML = '';
    sponsors.forEach(sp => {
        const item = el('div', 'sponsor-item');
        item.innerHTML = sp.logo ? `<img src="${sp.logo}" alt="${sp.name}" />` : `<div class="sponsor-name">${sp.name}</div>`;
        if (sp.logo) item.innerHTML += `<div class="sponsor-name">${sp.name}</div>`;
        item.innerHTML += `<div class="sponsor-tier ${sp.tier}">${sp.tier.toUpperCase()}</div>`;
        if (sp.website && sp.website !== '#') {
            const a = el('a'); a.href = sp.website; a.target = '_blank'; a.rel = 'noopener';
            a.appendChild(item); carousel.appendChild(a);
        } else carousel.appendChild(item);
    });
}

// ── Season Gallery Modal ─────────────────────────────────
const sgModal = document.getElementById('season-gallery-modal');
const sgFrame = document.getElementById('sg-frame');
const sgCaption = document.getElementById('sg-caption');
const sgTitle = document.getElementById('sg-title');
const sgDots = document.getElementById('sg-dots');
const sgPrev = document.getElementById('sg-prev');
const sgNext = document.getElementById('sg-next');

let sgImages = [], sgCurrent = 0;

function openSeasonGallery(seasonTitle, images) {
    sgImages = images;
    sgCurrent = 0;
    sgTitle.textContent = seasonTitle;
    sgModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderSgSlide(0);
    sgPrev.style.display = images.length <= 1 ? 'none' : '';
    sgNext.style.display = images.length <= 1 ? 'none' : '';
}

function closeSeasonGallery() {
    sgModal.style.display = 'none';
    document.body.style.overflow = '';
}

function renderSgSlide(idx) {
    sgCurrent = (idx + sgImages.length) % sgImages.length;
    const img = sgImages[sgCurrent];
    sgFrame.innerHTML = img.image
        ? `<img src="${img.image}" alt="${img.caption || ''}" class="sg-img" />`
        : `<div class="sg-placeholder">📷</div>`;
    sgCaption.textContent = img.caption || '';
    sgDots.innerHTML = sgImages.map((_, i) =>
        `<span class="sg-dot${i === sgCurrent ? ' active' : ''}"></span>`
    ).join('');
}

document.getElementById('sg-close')?.addEventListener('click', closeSeasonGallery);
sgModal?.addEventListener('click', e => { if (e.target === sgModal) closeSeasonGallery(); });
sgPrev?.addEventListener('click', () => renderSgSlide(sgCurrent - 1));
sgNext?.addEventListener('click', () => renderSgSlide(sgCurrent + 1));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSeasonGallery(); });

// ── Load Achievements (Seasons) ───────────────────────────
async function loadSeasons() {
    const seasons = await apiFetch('/api/seasons');
    if (!seasons) return;
    const grid = document.getElementById('seasons-grid');
    if (!grid) return;
    grid.innerHTML = '';
    seasons.forEach(s => {
        const card = el('div', 'season-card');
        card.innerHTML = `
      <div class="season-img">
        ${s.image ? `<img src="${s.image}" alt="${s.title}" loading="lazy" />` : `<div class="season-img-placeholder">Season ${s.year}</div>`}
      </div>
      <div class="season-body">
        <div class="season-year">Season ${s.year}</div>
        <h3>${s.title}</h3>
        <p>${s.description || ''}</p>
        ${s.achievements ? `<div class="season-achievements">${s.achievements}</div>` : ''}
        <button class="btn-more-info" data-season-id="${s.id}" data-season-title="${s.title} – ${s.year}">
          More Information ›
        </button>
      </div>`;
        grid.appendChild(card);
    });

    // Wire up "More Information" buttons
    grid.querySelectorAll('.btn-more-info').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.seasonId;
            const title = btn.dataset.seasonTitle;
            btn.disabled = true; btn.textContent = 'Loading…';
            const images = await apiFetch(`/api/seasons/${id}/gallery`);
            btn.disabled = false; btn.textContent = 'More Information ›';
            if (!images || images.length === 0) {
                alert('No additional images available for this achievement yet.');
                return;
            }
            openSeasonGallery(title, images);
        });
    });
}

// ── Load News ───────────────────────────────────────────────
async function loadNews() {
    const news = await apiFetch('/api/news?limit=6');
    if (!news) return;
    const grid = document.getElementById('news-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const catEmoji = { achievement: '🏆', technical: '🔧', team: '👥', general: '📰' };
    news.forEach(n => {
        const date = new Date(n.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const card = el('div', 'news-card');
        card.innerHTML = `
      <div class="news-img">
        ${n.image ? `<img src="${n.image}" alt="${n.title}" loading="lazy" />` : `<div class="news-img-placeholder">${catEmoji[n.category] || '📰'}</div>`}
      </div>
      <div class="news-body">
        <span class="news-category-badge ${n.category}">${n.category}</span>
        <h3>${n.title}</h3>
        <p>${n.summary || ''}</p>
        <div class="news-date">${date}</div>
      </div>`;
        grid.appendChild(card);
    });
}

// ── Contact Form ────────────────────────────────────────────
document.getElementById('contact-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('form-submit-btn');
    const feedback = document.getElementById('form-feedback');
    btn.disabled = true; btn.textContent = 'Sending...';
    feedback.className = 'form-feedback';
    const body = {
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email-input').value,
        subject: document.getElementById('contact-subject').value,
        message: document.getElementById('contact-message').value,
    };
    try {
        const r = await fetch(API + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) {
            feedback.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
            feedback.className = 'form-feedback success';
            e.target.reset();
        } else { throw new Error(); }
    } catch {
        feedback.textContent = '❌ Failed to send. Please try emailing us directly.';
        feedback.className = 'form-feedback error';
    }
    btn.disabled = false; btn.textContent = 'Send Message';
});

// ── Init ────────────────────────────────────────────────────
(async function init() {
    await Promise.all([
        loadTeamInfo(),
        loadAbout(),
        loadCars(),
        loadTeam(),
        loadSponsors(),
        loadSeasons(),
        loadNews(),
    ]);
    observeReveals();
})();
