/* ============================================================
   Z-FAST — Main Application JavaScript
   ============================================================ */

const API = (typeof window !== 'undefined' && window.ZFAST_API) ? window.ZFAST_API : '';
const fixImg = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return '/api' + url;
    if (url.startsWith('uploads')) return '/api/' + url;
    return url;
};

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
            frame.innerHTML = `<img src="${API}${fixImg(s.image)}" alt="${s.caption || 'About Z-FAST'}" class="about-slide-img" />`;
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
                frame.innerHTML = `<img src="${API}${fixImg(car.image)}" alt="${car.name}" style="width:100%;height:100%;object-fit:cover" />`;
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
    
    function renderMembers() {
        grid.style.opacity = '0';
        setTimeout(() => {
            grid.innerHTML = '';
            members.forEach(m => {
                const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2);
                const card = el('div', 'member-card');
                const linkedinBadge = m.linkedin && m.linkedin !== '#'
                    ? `<a href="${m.linkedin}" class="member-linkedin-float" target="_blank" rel="noopener" title="View LinkedIn Profile" onclick="event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>` : '';
                card.innerHTML = `
          <div class="member-img-wrap">
            ${m.image ? `<img src="${API}${fixImg(m.image)}" alt="${m.name}" loading="lazy" />` : `<div class="member-avatar-placeholder">${initials}</div>`}
            <div class="member-hover-overlay"><p>${m.bio || 'Team member'}</p></div>
            ${linkedinBadge}
          </div>
          <div class="member-info">
            <div class="member-name">${m.name}</div>
            <div class="member-role">${m.role}</div>
          </div>`;
                grid.appendChild(card);
            });
            grid.style.opacity = '1';
        }, 200);
    }
    grid.style.transition = 'opacity 0.2s ease';
    renderMembers();
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
        item.innerHTML = sp.logo ? `<img src="${API}${fixImg(sp.logo)}" alt="${sp.name}" />` : `<div class="sponsor-name">${sp.name}</div>`;
        if (sp.logo) item.innerHTML += `<div class="sponsor-name">${sp.name}</div>`;
        item.innerHTML += `<div class="sponsor-tier ${sp.tier}">${sp.tier.toUpperCase()}</div>`;
        if (sp.website && sp.website !== '#') {
            const a = el('a'); a.href = sp.website; a.target = '_blank'; a.rel = 'noopener';
            a.appendChild(item); carousel.appendChild(a);
        } else carousel.appendChild(item);
    });
}

// ── Load Partners ───────────────────────────────────────────
async function loadPartners() {
    const partners = await apiFetch('/api/partners');
    if (!partners) return;
    const carousel = document.getElementById('partners-carousel');
    if (!carousel) return;
    carousel.innerHTML = '';
    partners.forEach(sp => {
        const item = el('div', 'sponsor-item');
        item.innerHTML = sp.logo ? `<img src="${API}${fixImg(sp.logo)}" alt="${sp.name}" />` : `<div class="sponsor-name">${sp.name}</div>`;
        if (sp.logo) item.innerHTML += `<div class="sponsor-name">${sp.name}</div>`;
        if (sp.website && sp.website !== '#') {
            const a = el('a'); a.href = sp.website; a.target = '_blank'; a.rel = 'noopener';
            a.appendChild(item); carousel.appendChild(a);
        } else carousel.appendChild(item);
    });
}

// ── Load Media Coverage ─────────────────────────────────────
async function loadMediaCoverage() {
    let media = await apiFetch('/api/media-coverage');
    if (!media || media.length === 0) {
        media = [{ image: '', caption: 'WAITING FOR SIGNAL...' }];
    }
    const tvContent = document.getElementById('tv-content');
    const captionEl = document.getElementById('media-caption');
    const dotsEl = document.getElementById('media-dots');
    if (!tvContent || !captionEl || !dotsEl) return;
    
    let sc = document.getElementById('media-coverage');
    if(sc) sc.style.display = 'block';

    tvContent.innerHTML = '';
    dotsEl.innerHTML = '';
    let curr = 0;
    
    media.forEach((m, i) => {
        const slide = el('div', 'tv-slide');
        if (i === 0) slide.classList.add('active');
        if (m.image) {
            slide.innerHTML = `<img src="${API}${fixImg(m.image)}" alt="Media Coverage" loading="lazy" />`;
        } else {
            slide.innerHTML = `<div class="tv-slide-placeholder">NO SIGNAL</div>`;
        }
        tvContent.appendChild(slide);
        
        const dot = el('button', 'media-dot');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => setMediaSlide(i));
        dotsEl.appendChild(dot);
    });
    
    captionEl.textContent = media[0].caption || '';
    
    function setMediaSlide(idx) {
        const slides = tvContent.querySelectorAll('.tv-slide');
        const dots = dotsEl.querySelectorAll('.media-dot');
        slides[curr].classList.remove('active');
        dots[curr].classList.remove('active');
        curr = (idx + media.length) % media.length;
        slides[curr].classList.add('active');
        dots[curr].classList.add('active');
        captionEl.textContent = media[curr].caption || '';
    }
    
    const prevBtn = document.getElementById('media-prev');
    const nextBtn = document.getElementById('media-next');
    if (prevBtn) prevBtn.addEventListener('click', () => setMediaSlide(curr - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setMediaSlide(curr + 1));
    
    setInterval(() => {
        setMediaSlide(curr + 1);
    }, 6000);
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

function openSeasonGallery(seasonTitle, images, meta = {}) {
    sgImages = images;
    sgCurrent = 0;
    sgTitle.textContent = seasonTitle;

    // Build info block (description + achievements)
    let infoHTML = '';
    if (meta.desc || meta.ach) {
        infoHTML = `<div class="sg-info-block">`;
        if (meta.desc) infoHTML += `<p class="sg-info-desc">${meta.desc}</p>`;
        if (meta.ach) infoHTML += `<div class="sg-info-ach">🏆 ${meta.ach}</div>`;
        infoHTML += `</div>`;
    }

    // Find or create info block inside modal box
    const box = sgModal.querySelector('.sg-modal-box');
    let infoEl = box.querySelector('.sg-info-block');
    if (infoEl) infoEl.remove();
    if (infoHTML) {
        const tmp = document.createElement('div');
        tmp.innerHTML = infoHTML;
        box.insertBefore(tmp.firstChild, box.querySelector('.sg-img-wrap'));
    }

    if (images.length > 0) {
        sgModal.querySelector('.sg-img-wrap').style.display = '';
        sgCaption.style.display = '';
        sgDots.style.display = '';
        renderSgSlide(0);
    } else {
        sgModal.querySelector('.sg-img-wrap').style.display = 'none';
        sgCaption.style.display = 'none';
        sgDots.style.display = 'none';
        sgCaption.textContent = '';
        sgDots.innerHTML = '';
    }

    sgPrev.style.display = images.length <= 1 ? 'none' : '';
    sgNext.style.display = images.length <= 1 ? 'none' : '';
    sgModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSeasonGallery() {
    sgModal.style.display = 'none';
    document.body.style.overflow = '';
    // Clean info block for next use
    const infoEl = sgModal.querySelector('.sg-info-block');
    if (infoEl) infoEl.remove();
}

function renderSgSlide(idx) {
    sgCurrent = (idx + sgImages.length) % sgImages.length;
    const img = sgImages[sgCurrent];
    sgFrame.innerHTML = img.image
        ? `<img src="${API}${fixImg(img.image)}" alt="${img.caption || ''}" class="sg-img" />`
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
        ${s.image ? `<img src="${API}${fixImg(s.image)}" alt="${s.title}" loading="lazy" />` : `<div class="season-img-placeholder">Season ${s.year}</div>`}
      </div>
      <div class="season-body">
        <div class="season-year">Season ${s.year}</div>
        <h3>${s.title}</h3>
        <p>${s.description || ''}</p>
        ${s.achievements ? `<div class="season-achievements">${s.achievements}</div>` : ''}
        <button class="btn-more-info"
          data-id="${s.id}"
          data-title="${s.title}"
          data-year="${s.year}"
          data-desc="${(s.description || '').replace(/"/g, '&quot;')}"
          data-ach="${(s.achievements || '').replace(/"/g, '&quot;')}">
          🔍 More Information
        </button>
      </div>`;
        grid.appendChild(card);
    });

    // Wire up "More Information" buttons
    grid.querySelectorAll('.btn-more-info').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            const year = btn.dataset.year;
            const desc = btn.dataset.desc;
            const ach = btn.dataset.ach;
            btn.disabled = true;
            btn.innerHTML = '<span style="opacity:.7">Loading…</span>';
            const images = await apiFetch(`/api/seasons/${id}/gallery`);
            btn.disabled = false;
            btn.innerHTML = '🔍 More Information';
            openSeasonGallery(`${title} — Season ${year}`, images || [], { desc, ach });
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
        ${n.image ? `<img src="${API}${fixImg(n.image)}" alt="${n.title}" loading="lazy" />` : `<div class="news-img-placeholder">${catEmoji[n.category] || '📰'}</div>`}
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
        loadPartners(),
        loadMediaCoverage(),
        loadSeasons(),
        loadNews(),
    ]);
    observeReveals();
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

    // Start section background animations
    initAboutCanvas();
    initMachineCanvas();
    initMediaCanvas();
    initSponsorCanvas();
    initContactCanvas();
})();

/* ============================================================
   ANIMATED SECTION BACKGROUNDS
   ============================================================ */

// ── ABOUT US: Circuit Board Neural Network ───────────────────
function initAboutCanvas() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;

    function resize() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const nodes = [];
    const NODE_COUNT = 30;
    const CONNECTION_DIST = 160;

    for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 2.5 + 1.5
        });
    }

    // Signal pulse animation along a connection
    const pulses = [];
    setInterval(() => {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                if (Math.sqrt(dx * dx + dy * dy) < CONNECTION_DIST && Math.random() < 0.02) {
                    pulses.push({ from: i, to: j, t: 0 });
                    break;
                }
            }
        }
    }, 300);

    function draw() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Move
        nodes.forEach(n => {
            n.x += n.vx; n.y += n.vy;
            if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
            if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        });

        // Connections
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < CONNECTION_DIST) {
                    const alpha = (1 - d / CONNECTION_DIST) * 0.25;
                    ctx.strokeStyle = `rgba(29, 120, 200, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Pulses
        for (let k = pulses.length - 1; k >= 0; k--) {
            const p = pulses[k];
            p.t += 0.025;
            if (p.t > 1) { pulses.splice(k, 1); continue; }
            const ni = nodes[p.from]; const nj = nodes[p.to];
            const px = ni.x + (nj.x - ni.x) * p.t;
            const py = ni.y + (nj.y - ni.y) * p.t;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 180, 255, ${1 - p.t})`;
            ctx.fill();
        }

        // Nodes
        nodes.forEach(n => {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(29, 120, 200, 0.5)';
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// ── THE MACHINE: Electric sparks & speed lines ───────────────
function initMachineCanvas() {
    const canvas = document.getElementById('machine-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;

    function resize() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const sparks = [];
    const streaks = [];

    // Speed lines (horizontal streaks)
    for (let i = 0; i < 18; i++) {
        streaks.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            len: Math.random() * 140 + 60,
            speed: Math.random() * 4 + 2,
            alpha: Math.random() * 0.18 + 0.04,
            thickness: Math.random() < 0.3 ? 1.5 : 0.6
        });
    }

    function spawnSpark() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const branches = [];
        const numBranch = Math.floor(Math.random() * 3) + 2;
        for (let b = 0; b < numBranch; b++) {
            const angle = (Math.random() * Math.PI * 2);
            const len = Math.random() * 55 + 20;
            branches.push({ angle, len, sub: Math.random() < 0.4 });
        }
        sparks.push({ x, y, branches, life: 1, decay: Math.random() * 0.04 + 0.025 });
    }

    setInterval(spawnSpark, 450);

    function draw() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Speed streaks
        streaks.forEach(s => {
            s.x -= s.speed;
            if (s.x + s.len < 0) s.x = canvas.width + s.len;
            const grd = ctx.createLinearGradient(s.x - s.len, s.y, s.x, s.y);
            grd.addColorStop(0, `rgba(240,151,42,0)`);
            grd.addColorStop(1, `rgba(240,151,42,${s.alpha})`);
            ctx.strokeStyle = grd;
            ctx.lineWidth = s.thickness;
            ctx.beginPath();
            ctx.moveTo(s.x - s.len, s.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        });

        // Lightning sparks
        for (let k = sparks.length - 1; k >= 0; k--) {
            const sp = sparks[k];
            sp.life -= sp.decay;
            if (sp.life <= 0) { sparks.splice(k, 1); continue; }

            sp.branches.forEach(b => {
                const ex = sp.x + Math.cos(b.angle) * b.len;
                const ey = sp.y + Math.sin(b.angle) * b.len;
                // Jitter mid-point to look like lightning
                const mx = (sp.x + ex) / 2 + (Math.random() - 0.5) * 20;
                const my = (sp.y + ey) / 2 + (Math.random() - 0.5) * 20;

                ctx.strokeStyle = `rgba(240,200,80,${sp.life * 0.9})`;
                ctx.lineWidth = sp.life * 1.5;
                ctx.shadowColor = '#f0972a';
                ctx.shadowBlur = sp.life * 10;
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.quadraticCurveTo(mx, my, ex, ey);
                ctx.stroke();
                ctx.shadowBlur = 0;

                if (b.sub) {
                    const sx = mx + (Math.random() - 0.5) * 30;
                    const sy = my + (Math.random() - 0.5) * 30;
                    ctx.strokeStyle = `rgba(240,200,80,${sp.life * 0.4})`;
                    ctx.lineWidth = sp.life * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(mx, my);
                    ctx.lineTo(sx, sy);
                    ctx.stroke();
                }
            });
        }

        requestAnimationFrame(draw);
    }
    draw();
}

// ── MEDIA COVERAGE: Broadcast waves & scanlines ──────────────
function initMediaCanvas() {
    const canvas = document.getElementById('media-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;

    function resize() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let waveTime = 0;

    function draw() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        waveTime += 0.018;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Concentric broadcast rings
        for (let i = 1; i <= 6; i++) {
            const r = (i * 90) + (waveTime * 30 % 90);
            const alpha = Math.max(0, 0.12 - (r / (canvas.width * 0.75)) * 0.12);
            ctx.strokeStyle = `rgba(111, 163, 240, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy * 0.5, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Horizontal scan lines
        for (let y = 0; y < canvas.height; y += 5) {
            const brightness = 0.5 + 0.5 * Math.sin(y * 0.05 + waveTime * 2);
            ctx.fillStyle = `rgba(255,255,255,${brightness * 0.02})`;
            ctx.fillRect(0, y, canvas.width, 1);
        }

        // Signal dots sweeping left-right
        for (let d = 0; d < 6; d++) {
            const t = (waveTime * 0.4 + d / 6) % 1;
            const x = t * canvas.width;
            const y = canvas.height * 0.15 + d * (canvas.height * 0.14);
            const size = 1.5 + Math.sin(waveTime * 3 + d) * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(111,163,240,0.35)`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }
    draw();
}

// ── SPONSORSHIP & PARTNERSHIP: Floating handshake / coin orbit ──
function initSponsorCanvas() {
    const canvas = document.getElementById('sponsor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;

    function resize() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Stars / floating logos orbiting a central axis
    const RINGS = 3;
    const orbits = [];
    for (let r = 0; r < RINGS; r++) {
        const count = 5 + r * 4;
        const radius = 100 + r * 120;
        const speed  = (0.0004 + r * 0.0002) * (r % 2 === 0 ? 1 : -1);
        for (let i = 0; i < count; i++) {
            orbits.push({
                angle:  (i / count) * Math.PI * 2,
                radius,
                speed,
                size:   3 - r * 0.5,
                alpha:  0.35 - r * 0.08,
                ring:   r,
                color:  r === 0 ? '240,151,42' : r === 1 ? '180,120,30' : '100,70,20',
            });
        }
    }

    // Streaking "deal lines" — thin diagonal lines linking two points
    const dealLines = Array.from({ length: 10 }, () => ({
        x1: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
        y1: Math.random() * 600,
        x2: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
        y2: Math.random() * 600,
        alpha: Math.random() * 0.08 + 0.03,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.006,
    }));

    let t = 0;

    function draw() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        t += 1;

        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;

        // Draw faint orbit rings
        for (let r = 0; r < RINGS; r++) {
            const radius = 100 + r * 120;
            ctx.strokeStyle = `rgba(240,151,42,${0.05 - r * 0.012})`;
            ctx.lineWidth = 0.6;
            ctx.setLineDash([4, 10]);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Orbiting nodes
        orbits.forEach(o => {
            o.angle += o.speed;
            const x = cx + Math.cos(o.angle) * o.radius;
            const y = cy + Math.sin(o.angle) * o.radius;

            // Glow
            const grd = ctx.createRadialGradient(x, y, 0, x, y, o.size * 4);
            grd.addColorStop(0, `rgba(${o.color},${o.alpha})`);
            grd.addColorStop(1, `rgba(${o.color},0)`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(x, y, o.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core dot
            ctx.fillStyle = `rgba(${o.color},${o.alpha + 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, o.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Pulsing "deal lines"
        dealLines.forEach(dl => {
            dl.pulse += dl.speed;
            const a = dl.alpha * (0.5 + 0.5 * Math.sin(dl.pulse));
            ctx.strokeStyle = `rgba(240,151,42,${a})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(dl.x1, dl.y1);
            ctx.lineTo(dl.x2, dl.y2);
            ctx.stroke();
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// ── CONTACT US: Message particles & radio waves ───────────────
function initContactCanvas() {
    const canvas = document.getElementById('contact-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;

    function resize() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Floating message bubbles (tiny rectangles with rounded corners)
    const bubbles = Array.from({ length: 14 }, () => ({
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
        y: Math.random() * 600 + 100,
        w: Math.random() * 50 + 30,
        h: Math.random() * 16 + 10,
        vy: -(Math.random() * 0.4 + 0.15),
        vx: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.12 + 0.04,
        r: 5,
        type: Math.random() < 0.5 ? 'sent' : 'recv',   // sent=right-aligned amber, recv=left-aligned blue
    }));

    // Radio-wave ripples from the email icon position (top-left of contact)
    const ripples = [];
    setInterval(() => {
        ripples.push({ r: 0, maxR: 120, alpha: 0.18 });
    }, 1200);

    let t = 0;

    function draw() {
        canvas.width = section.offsetWidth;
        canvas.height = section.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        t += 1;

        // Radio ripples from top-left cluster (representing the email/phone icon area)
        const rxBase = canvas.width * 0.15;
        const ryBase = canvas.height  * 0.35;
        for (let k = ripples.length - 1; k >= 0; k--) {
            const rp = ripples[k];
            rp.r  += 1.2;
            rp.alpha -= 0.0012;
            if (rp.alpha <= 0) { ripples.splice(k, 1); continue; }
            ctx.strokeStyle = `rgba(111,163,240,${rp.alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rxBase, ryBase, rp.r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Floating chat bubbles
        bubbles.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;
            // Wrap around
            if (b.y + b.h < 0) {
                b.y = canvas.height + b.h;
                b.x = Math.random() * canvas.width;
            }
            if (b.x < -b.w) b.x = canvas.width;
            if (b.x > canvas.width + b.w) b.x = -b.w;

            const color = b.type === 'sent' ? '240,151,42' : '111,163,240';
            ctx.fillStyle = `rgba(${color},${b.alpha})`;
            ctx.strokeStyle = `rgba(${color},${b.alpha * 1.8})`;
            ctx.lineWidth = 0.8;

            // Rounded rect
            const x = b.x, y = b.y, w = b.w, h = b.h, r = b.r;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner text lines (decorative)
            ctx.fillStyle = `rgba(${color},${b.alpha * 2.5})`;
            const lx = x + 6, lw = w - 12;
            ctx.fillRect(lx, y + h * 0.3, lw * 0.7, 1.4);
            if (h > 14) ctx.fillRect(lx, y + h * 0.6, lw * 0.45, 1.2);
        });

        // Subtle radar sweep from center-right (form side)
        const sweepX = canvas.width * 0.72;
        const sweepY = canvas.height * 0.5;
        const sweepAngle = ((t * 0.012) % (Math.PI * 2));
        const sweepLen = Math.min(canvas.width * 0.22, 200);

        const grd = ctx.createLinearGradient(
            sweepX, sweepY,
            sweepX + Math.cos(sweepAngle) * sweepLen,
            sweepY + Math.sin(sweepAngle) * sweepLen
        );
        grd.addColorStop(0, 'rgba(240,151,42,0.10)');
        grd.addColorStop(1, 'rgba(240,151,42,0)');
        ctx.strokeStyle = grd;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(sweepX, sweepY);
        ctx.lineTo(sweepX + Math.cos(sweepAngle) * sweepLen, sweepY + Math.sin(sweepAngle) * sweepLen);
        ctx.stroke();

        requestAnimationFrame(draw);
    }
    draw();
}
