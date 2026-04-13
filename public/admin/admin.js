/* ============================================================
   Z-FAST Admin Panel — JavaScript
   ============================================================ */

const API = (typeof window !== 'undefined' && window.ZFAST_API) ? window.ZFAST_API : '';
let token = localStorage.getItem('zfast_token') || '';
const fixImg = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return '/api' + url;
  if (url.startsWith('uploads')) return '/api/' + url;
  return url;
};

// ── Utilities ───────────────────────────────────────────────
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function toast(msg, type = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function api(method, path, body) {
  const opts = { method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + '/api' + path, opts);
  if (r.status === 401) { logout(); return null; }
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Request failed'); }
  return r.json().catch(() => null);
}

async function uploadImage(file) {
  const fd = new FormData(); fd.append('image', file);
  const r = await fetch(API + '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  if (!r.ok) throw new Error('Upload failed');
  return (await r.json()).url;
}

// ── Modal ────────────────────────────────────────────────────
let modalConfirmFn = null;
const modalBackdrop = $('#modal-backdrop');
const modalBox = $('#modal-box');

function openModal(title, bodyHTML, onConfirm) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHTML;
  modalConfirmFn = onConfirm;
  modalBackdrop.style.display = 'flex';
}
function closeModal() { modalBackdrop.style.display = 'none'; modalConfirmFn = null; }

$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal-confirm').addEventListener('click', () => { if (modalConfirmFn) modalConfirmFn(); });
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

// Reusable image upload field
function imageFieldHTML(currentUrl, fieldId = 'modal-image') {
  return `
    <div class="form-group">
      <label>Image</label>
      <div class="upload-area" id="upload-area-${fieldId}" onclick="document.getElementById('file-${fieldId}').click()">
        ${currentUrl ? `<img src="${API}${fixImg(currentUrl)}" class="upload-preview" id="preview-${fieldId}" />` : `<img class="upload-preview" id="preview-${fieldId}" style="display:none" />`}
        <div class="upload-label">${currentUrl ? '📷 Click to change image' : '📷 Click to upload image'}</div>
      </div>
      <input type="file" id="file-${fieldId}" accept="image/*" style="display:none" />
      <input type="hidden" id="${fieldId}" value="${currentUrl || ''}" />
    </div>
  `;
}

function bindUpload(fieldId) {
  const input = document.getElementById('file-' + fieldId);
  if (!input) return;
  input.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const url = await uploadImage(file);
      document.getElementById(fieldId).value = url;
      const preview = document.getElementById('preview-' + fieldId);
      preview.src = API + fixImg(url); preview.style.display = 'block';
      toast('Image uploaded!');
    } catch { toast('Upload failed', 'error'); }
  });
}

// ── Login / Auth ─────────────────────────────────────────────
async function checkAuth() {
  if (!token) return showLogin();
  try { await api('GET', '/auth/verify'); showAdmin(); } catch { showLogin(); }
}

function showLogin() {
  $('#login-screen').style.display = 'flex';
  $('#admin-shell').style.display = 'none';
}
function showAdmin() {
  $('#login-screen').style.display = 'none';
  $('#admin-shell').style.display = 'flex';
  loadDashboard();
}
function logout() {
  token = ''; localStorage.removeItem('zfast_token'); showLogin();
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#login-error');
  err.style.display = 'none';
  try {
    const r = await fetch(API + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#login-username').value, password: $('#login-password').value })
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Login failed'); }
    const data = await r.json();
    token = data.token; localStorage.setItem('zfast_token', token);
    showAdmin();
  } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
});

$('#logout-btn').addEventListener('click', logout);

// ── Sidebar Navigation ───────────────────────────────────────
$$('.sidebar-btn[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.sidebar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.panel').forEach(p => p.classList.remove('active'));
    const panel = $('#panel-' + btn.dataset.panel);
    if (panel) panel.classList.add('active');
    loadPanel(btn.dataset.panel);
  });
});

function loadPanel(name) {
  switch (name) {
    case 'dashboard': loadDashboard(); break;
    case 'team-info': loadTeamInfo(); break;
    case 'cars': loadCars(); break;
    case 'about': loadAboutSlides(); break;
    case 'team-members': loadTeamMembers(); break;
    case 'sponsors': loadSponsors(); break;
    case 'partners': loadPartners(); break;
    case 'media-coverage': loadMediaCoverage(); break;
    case 'seasons': loadSeasons(); break;
    case 'news': loadNews(); break;
    case 'messages': loadMessages(); break;
    case 'backup': loadBackup(); break;
  }
}

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  const [members, sponsors, partners, media, seasons, news, messages] = await Promise.all([
    api('GET', '/team-members'), api('GET', '/sponsors'), api('GET', '/partners'), api('GET', '/media-coverage'), api('GET', '/seasons'),
    api('GET', '/news?limit=99'), api('GET', '/contact')
  ]);
  if (members) $('#dash-members').textContent = members.length;
  if (sponsors) $('#dash-sponsors').textContent = sponsors.length;
  if (partners) $('#dash-partners').textContent = partners.length;
  if (media) $('#dash-media').textContent = media.length;
  if (seasons) $('#dash-seasons').textContent = seasons.length;
  if (news) $('#dash-news').textContent = news.length;
  if (messages) {
    const unread = messages.filter(m => !m.read).length;
    $('#dash-messages').textContent = unread;
    $('#dash-messages-card').style.borderColor = unread > 0 ? 'rgba(255,62,62,0.4)' : 'var(--card-border)';
  }
}

// ── Team Info (Site Settings) ─────────────────────────────────
const INFO_FIELDS = [
  { key: 'hero_title', label: 'Hero Title', full: true },
  { key: 'hero_subtitle', label: 'Hero Subtitle', full: true },
  { key: 'hero_cta_primary', label: 'Hero CTA Primary Button' },
  { key: 'hero_cta_secondary', label: 'Hero CTA Secondary Button' },
  { key: 'sponsorship_title', label: 'Sponsorship Title', full: true },
  { key: 'sponsorship_subtitle', label: 'Sponsorship Subtitle', full: true },
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'facebook', label: 'Facebook URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'linkedin', label: 'LinkedIn URL' },
  { key: 'youtube', label: 'YouTube URL' },
];

async function loadTeamInfo() {
  const data = await api('GET', '/team-info');
  if (!data) return;
  const form = $('#team-info-form');
  form.innerHTML = '<div class="info-grid">' + INFO_FIELDS.map(f => `
    <div class="form-group${f.full ? '" style="grid-column:1/-1' : ''}">
      <label>${f.label}</label>
      <input type="text" id="info-${f.key}" value="${(data[f.key] || '').replace(/"/g, '&quot;')}" />
    </div>
  `).join('') + '</div>';
}

$('#save-team-info').addEventListener('click', async () => {
  const updates = {};
  INFO_FIELDS.forEach(f => { const el = document.getElementById('info-' + f.key); if (el) updates[f.key] = el.value; });
  try { await api('PUT', '/team-info', updates); toast('Settings saved!'); } catch { toast('Save failed', 'error'); }
});

// ── Cars ─────────────────────────────────────────────────────
async function loadCars() {
  const cars = await api('GET', '/cars'); if (!cars) return;
  const tbody = $('#cars-tbody'); tbody.innerHTML = '';
  cars.forEach(c => {
    const specs = Array.isArray(c.specs) ? c.specs : JSON.parse(c.specs || '[]');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.image ? `<img src="${API}${fixImg(c.image)}" style="border-radius:6px" />` : '—'}</td>
      <td><strong>${c.name}</strong></td>
      <td>${c.year || '—'}</td>
      <td style="font-size:0.8rem;color:var(--gray-300)">${specs.length} specs</td>
      <td>${c.display_order}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editCar(${c.id})">Edit</button>
        <button class="btn-del" onclick="deleteCar(${c.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-car-btn').addEventListener('click', () => editCar(null));

// Spec builder helper
function specRowHTML(spec = {}) {
  return `<div class="spec-row" style="display:grid;grid-template-columns:50px 1fr 80px 60px 30px;gap:0.4rem;margin-bottom:0.4rem;align-items:center">
    <input placeholder="⚡" value="${spec.icon || ''}" style="text-align:center" />
    <input placeholder="Label" value="${(spec.label || '').replace(/"/g, '&quot;')}" />
    <input placeholder="Value" value="${spec.value || ''}" />
    <input placeholder="Unit" value="${spec.unit || ''}" />
    <button type="button" onclick="this.closest('.spec-row').remove()" style="background:rgba(255,62,62,0.15);border:1px solid rgba(255,62,62,0.3);color:#ff6b6b;border-radius:6px;cursor:pointer;padding:4px">✕</button>
  </div>`;
}

window.editCar = async (id) => {
  const cars = await api('GET', '/cars');
  const c = id ? cars.find(x => x.id === id) : {};
  const specs = Array.isArray(c?.specs) ? c.specs : JSON.parse(c?.specs || '[]');
  openModal(id ? 'Edit Car' : 'Add Car', `
    <div class="form-group"><label>Car Name</label><input id="c-name" value="${(c?.name || '').replace(/"/g, '&quot;')}" /></div>
    <div class="form-group"><label>Year</label><input type="number" id="c-year" value="${c?.year || new Date().getFullYear()}" /></div>
    <div class="form-group"><label>Description</label><textarea id="c-desc" rows="2">${c?.description || ''}</textarea></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="c-order" value="${c?.display_order || 0}" /></div>
    ${imageFieldHTML(c?.image, 'car-img')}
    <div class="form-group">
      <label>Specs <span style="font-weight:400;opacity:0.6;font-size:0.8rem">(icon · label · value · unit)</span></label>
      <div id="spec-rows">${specs.map(specRowHTML).join('')}</div>
      <button type="button" onclick="document.getElementById('spec-rows').insertAdjacentHTML('beforeend', specRowHTML())" style="width:100%;margin-top:0.4rem;background:rgba(29,52,97,0.25);border:1px solid rgba(29,52,97,0.5);color:#6fa3f0;padding:8px;border-radius:8px;cursor:pointer">+ Add Spec Row</button>
    </div>
  `, async () => {
    // Read spec rows
    const rows = [...document.querySelectorAll('#modal-body .spec-row')];
    const newSpecs = rows.map(row => {
      const ins = row.querySelectorAll('input');
      return { icon: ins[0].value, label: ins[1].value, value: ins[2].value, unit: ins[3].value };
    }).filter(s => s.label && s.value);
    const body = { name: $('#c-name').value, year: parseInt($('#c-year').value) || null, description: $('#c-desc').value, display_order: parseInt($('#c-order').value) || 0, image: $('#car-img').value, specs: newSpecs };
    try {
      if (id) await api('PUT', `/cars/${id}`, body); else await api('POST', '/cars', body);
      toast('Car saved!'); closeModal(); loadCars();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('car-img'), 100);
};

window.deleteCar = async (id) => {
  if (!confirm('Delete this car?')) return;
  try { await api('DELETE', `/cars/${id}`); toast('Deleted!'); loadCars(); } catch (e) { toast(e.message, 'error'); }
};

// (Hero Stats panel removed — stats are now managed via Site Settings)

// ── Team Members ──────────────────────────────────────────────
async function loadTeamMembers() {
  const members = await api('GET', '/team-members'); if (!members) return;
  const tbody = $('#members-tbody'); tbody.innerHTML = '';
  members.forEach(m => {
    const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.image ? `<img src="${API}${fixImg(m.image)}" />` : `<div class="placeholder-avatar">${initials}</div>`}</td>
      <td><strong>${m.name}</strong></td><td>${m.role}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editMember(${m.id})">Edit</button>
        <button class="btn-del" onclick="deleteMember(${m.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-member-btn').addEventListener('click', () => editMember(null));

window.editMember = async (id) => {
  const members = await api('GET', '/team-members');
  const m = id ? members.find(x => x.id === id) : {};
  openModal(id ? 'Edit Member' : 'Add Member', `
    <div class="form-group"><label>Name</label><input id="m-name" value="${m.name || ''}" /></div>
    <div class="form-group"><label>Role</label><input id="m-role" value="${m.role || ''}" /></div>
    <div class="form-group"><label>Bio</label><textarea id="m-bio" rows="3">${m.bio || ''}</textarea></div>
    <div class="form-group"><label>LinkedIn URL</label><input id="m-linkedin" value="${m.linkedin || ''}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${m.display_order || 0}" /></div>
    ${imageFieldHTML(m.image, 'member-img')}
  `, async () => {
    bindUpload('member-img');
    const body = { name: $('#m-name').value, role: $('#m-role').value, bio: $('#m-bio').value, linkedin: $('#m-linkedin').value, display_order: parseInt($('#m-order').value) || 0, image: $('#member-img').value };
    try {
      if (id) await api('PUT', `/team-members/${id}`, body); else await api('POST', '/team-members', body);
      toast('Member saved!'); closeModal(); loadTeamMembers();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('member-img'), 100);
};

// --- Final deployment fixes ---
if (document.querySelector('#save-hero-stats')) {
  document.querySelector('#save-hero-stats').addEventListener('click', async () => {
    const stats = {
      hero_stats_members: $('#hero-stats-members')?.value || '',
      hero_stats_experience: $('#hero-stats-experience')?.value || '',
      hero_stats_projects: $('#hero-stats-projects')?.value || ''
    };
    try { await api('PUT', '/team-info', stats); toast('Stats saved!'); } catch { toast('Save failed', 'error'); }
  });
}

window.deleteMember = async (id) => {
  if (!confirm('Delete this team member?')) return;
  try { await api('DELETE', `/team-members/${id}`); toast('Deleted!'); loadTeamMembers(); } catch (e) { toast(e.message, 'error'); }
};

// ── Sponsors ──────────────────────────────────────────────────
async function loadSponsors() {
  const sponsors = await api('GET', '/sponsors'); if (!sponsors) return;
  const tbody = $('#sponsors-tbody'); tbody.innerHTML = '';
  sponsors.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.logo ? `<img src="${API}${fixImg(s.logo)}" />` : '—'}</td>
      <td><strong>${s.name}</strong></td>
      <td><span class="sponsor-tier ${s.tier}">${s.tier.toUpperCase()}</span></td>
      <td><a href="${s.website}" target="_blank" style="color:var(--electric);font-size:0.8rem">${s.website !== '#' ? s.website : '—'}</a></td>
      <td>${s.display_order}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editSponsor(${s.id})">Edit</button>
        <button class="btn-del" onclick="deleteSponsor(${s.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-sponsor-btn').addEventListener('click', () => editSponsor(null));

window.editSponsor = async (id) => {
  const sponsors = await api('GET', '/sponsors');
  const s = id ? sponsors.find(x => x.id === id) : {};
  openModal(id ? 'Edit Sponsor' : 'Add Sponsor', `
    <div class="form-group"><label>Name</label><input id="sp-name" value="${s.name || ''}" /></div>
    <div class="form-group"><label>Tier</label>
      <select id="sp-tier">
        ${['gold', 'silver', 'bronze'].map(t => `<option${s.tier === t ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Website URL</label><input id="sp-website" value="${s.website || '#'}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="sp-order" value="${s.display_order || 0}" /></div>
    ${imageFieldHTML(s.logo, 'sponsor-img')}
  `, async () => {
    const body = { name: $('#sp-name').value, tier: $('#sp-tier').value, website: $('#sp-website').value, display_order: parseInt($('#sp-order').value) || 0, logo: $('#sponsor-img').value };
    try {
      if (id) await api('PUT', `/sponsors/${id}`, body); else await api('POST', '/sponsors', body);
      toast('Sponsor saved!'); closeModal(); loadSponsors();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('sponsor-img'), 100);
};

window.deleteSponsor = async (id) => {
  if (!confirm('Delete this sponsor?')) return;
  try { await api('DELETE', `/sponsors/${id}`); toast('Deleted!'); loadSponsors(); } catch (e) { toast(e.message, 'error'); }
};

// ── Partners ──────────────────────────────────────────────────
async function loadPartners() {
  const partners = await api('GET', '/partners'); if (!partners) return;
  const tbody = $('#partners-tbody'); tbody.innerHTML = '';
  partners.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.logo ? `<img src="${API}${fixImg(s.logo)}" />` : '—'}</td>
      <td><strong>${s.name}</strong></td>
      <td><a href="${s.website}" target="_blank" style="color:var(--electric);font-size:0.8rem">${s.website !== '#' ? s.website : '—'}</a></td>
      <td>${s.display_order}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editPartner(${s.id})">Edit</button>
        <button class="btn-del" onclick="deletePartner(${s.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-partner-btn').addEventListener('click', () => editPartner(null));

window.editPartner = async (id) => {
  const partners = await api('GET', '/partners');
  const s = id ? partners.find(x => x.id === id) : {};
  openModal(id ? 'Edit Partner' : 'Add Partner', `
    <div class="form-group"><label>Name</label><input id="pt-name" value="${s.name || ''}" /></div>
    <div class="form-group"><label>Website URL</label><input id="pt-website" value="${s.website || '#'}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="pt-order" value="${s.display_order || 0}" /></div>
    ${imageFieldHTML(s.logo, 'partner-img')}
  `, async () => {
    const body = { name: $('#pt-name').value, website: $('#pt-website').value, display_order: parseInt($('#pt-order').value) || 0, logo: $('#partner-img').value };
    try {
      if (id) await api('PUT', `/partners/${id}`, body); else await api('POST', '/partners', body);
      toast('Partner saved!'); closeModal(); loadPartners();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('partner-img'), 100);
};

window.deletePartner = async (id) => {
  if (!confirm('Delete this partner?')) return;
  try { await api('DELETE', `/partners/${id}`); toast('Deleted!'); loadPartners(); } catch (e) { toast(e.message, 'error'); }
};

// ── Media Coverage ─────────────────────────────────────────────
async function loadMediaCoverage() {
  const media = await api('GET', '/media-coverage'); if (!media) return;
  const tbody = $('#media-tbody'); tbody.innerHTML = '';
  media.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.image ? `<img src="${API}${fixImg(m.image)}" />` : '—'}</td>
      <td>${m.caption || ''}</td>
      <td>${m.display_order}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editMedia(${m.id})">Edit</button>
        <button class="btn-del" onclick="deleteMedia(${m.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-media-btn').addEventListener('click', () => editMedia(null));

window.editMedia = async (id) => {
  const media = await api('GET', '/media-coverage');
  const m = id ? media.find(x => x.id === id) : {};
  openModal(id ? 'Edit Media' : 'Add Media', `
    <div class="form-group"><label>Caption</label><input id="md-caption" value="${m.caption || ''}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="md-order" value="${m.display_order || 0}" /></div>
    ${imageFieldHTML(m.image, 'media-img')}
  `, async () => {
    const body = { caption: $('#md-caption').value, display_order: parseInt($('#md-order').value) || 0, image: $('#media-img').value };
    try {
      if (id) await api('PUT', `/media-coverage/${id}`, body); else await api('POST', '/media-coverage', body);
      toast('Media saved!'); closeModal(); loadMediaCoverage();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('media-img'), 100);
};

window.deleteMedia = async (id) => {
  if (!confirm('Delete this media piece?')) return;
  try { await api('DELETE', `/media-coverage/${id}`); toast('Deleted!'); loadMediaCoverage(); } catch (e) { toast(e.message, 'error'); }
};

// ── Seasons ───────────────────────────────────────────────────
async function loadSeasons() {
  const seasons = await api('GET', '/seasons'); if (!seasons) return;
  const tbody = $('#seasons-tbody'); tbody.innerHTML = '';
  seasons.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.image ? `<img src="${API}${fixImg(s.image)}" style="border-radius:6px" />` : '—'}</td>
      <td><strong>${s.year}</strong></td><td>${s.title}</td>
      <td style="max-width:200px;font-size:0.8rem;color:var(--gray-300)">${s.achievements || '—'}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editSeason(${s.id})">Edit</button>
        <button style="padding:.35rem .8rem;border-radius:8px;background:rgba(29,52,97,.3);border:1px solid rgba(29,52,97,.6);color:#6fa3f0;cursor:pointer;font-size:.8rem" onclick="manageSeasonGallery(${s.id}, '${s.title.replace(/'/g, "\\'")} – ${s.year}')">🖼 Gallery</button>
        <button class="btn-del" onclick="deleteSeason(${s.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-season-btn').addEventListener('click', () => editSeason(null));

window.editSeason = async (id) => {
  const seasons = await api('GET', '/seasons');
  const s = id ? seasons.find(x => x.id === id) : {};
  openModal(id ? 'Edit Season' : 'Add Season', `
    <div class="form-group"><label>Year</label><input type="number" id="se-year" value="${s.year || new Date().getFullYear()}" /></div>
    <div class="form-group"><label>Title</label><input id="se-title" value="${s.title || ''}" /></div>
    <div class="form-group"><label>Description</label><textarea id="se-desc" rows="3">${s.description || ''}</textarea></div>
    <div class="form-group"><label>Achievements</label><input id="se-ach" value="${s.achievements || ''}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="se-order" value="${s.display_order || 0}" /></div>
    ${imageFieldHTML(s.image, 'season-img')}
  `, async () => {
    const body = { year: parseInt($('#se-year').value), title: $('#se-title').value, description: $('#se-desc').value, achievements: $('#se-ach').value, display_order: parseInt($('#se-order').value) || 0, image: $('#season-img').value };
    try {
      if (id) await api('PUT', `/seasons/${id}`, body); else await api('POST', '/seasons', body);
      toast('Season saved!'); closeModal(); loadSeasons();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('season-img'), 100);
};

window.deleteSeason = async (id) => {
  if (!confirm('Delete this season?')) return;
  try { await api('DELETE', `/seasons/${id}`); toast('Deleted!'); loadSeasons(); } catch (e) { toast(e.message, 'error'); }
};

// ── News ──────────────────────────────────────────────────────
async function loadNews() {
  const news = await api('GET', '/news?limit=99'); if (!news) return;
  const tbody = $('#news-tbody'); tbody.innerHTML = '';
  news.forEach(n => {
    const date = new Date(n.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${n.image ? `<img src="${API}${fixImg(n.image)}" style="border-radius:6px;width:60px;height:40px;object-fit:cover" />` : '—'}</td>
      <td style="max-width:300px"><strong>${n.title}</strong></td>
      <td><span class="news-category-badge ${n.category}">${n.category}</span></td>
      <td style="font-size:0.8rem;color:var(--gray-300)">${date}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editNews(${n.id})">Edit</button>
        <button class="btn-del" onclick="deleteNews(${n.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}
$('#add-news-btn').addEventListener('click', () => editNews(null));

window.editNews = async (id) => {
  const news = await api('GET', '/news?limit=99');
  const n = id ? news.find(x => x.id === id) : {};
  openModal(id ? 'Edit Article' : 'Add Article', `
    <div class="form-group"><label>Title</label><input id="n-title" value="${(n.title || '').replace(/"/g, '&quot;')}" /></div>
    <div class="form-group"><label>Category</label>
      <select id="n-cat">
        ${['general', 'achievement', 'technical', 'team'].map(c => `<option${n.category === c ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Summary</label><textarea id="n-summary" rows="2">${n.summary || ''}</textarea></div>
    <div class="form-group"><label>Full Content</label><textarea id="n-content" rows="5">${n.content || ''}</textarea></div>
    ${imageFieldHTML(n.image, 'news-img')}
  `, async () => {
    const body = { title: $('#n-title').value, category: $('#n-cat').value, summary: $('#n-summary').value, content: $('#n-content').value, image: $('#news-img').value };
    try {
      if (id) await api('PUT', `/news/${id}`, body); else await api('POST', '/news', body);
      toast('Article saved!'); closeModal(); loadNews();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('news-img'), 100);
};

window.deleteNews = async (id) => {
  if (!confirm('Delete this article?')) return;
  try { await api('DELETE', `/news/${id}`); toast('Deleted!'); loadNews(); } catch (e) { toast(e.message, 'error'); }
};

// ── Messages ──────────────────────────────────────────────────
async function loadMessages() {
  const messages = await api('GET', '/contact'); if (!messages) return;
  const tbody = $('#messages-tbody'); tbody.innerHTML = '';
  messages.forEach(m => {
    const date = new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${m.name}</strong></td>
      <td style="font-size:0.8rem"><a href="mailto:${m.email}" style="color:var(--electric)">${m.email}</a></td>
      <td style="font-size:0.8rem;color:var(--gray-300)">${m.subject || '—'}</td>
      <td style="font-size:0.8rem;color:var(--gray-300)">${date}</td>
      <td>${m.read ? '<span class="badge-read">Read</span>' : '<span class="badge-unread">New</span>'}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="viewMessage(${m.id})">View</button>
        ${!m.read ? `<button class="btn-read" onclick="markRead(${m.id}, this)">Mark Read</button>` : ''}
        <button class="btn-del" onclick="deleteMessage(${m.id})">Delete</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}

window.viewMessage = async (id) => {
  const messages = await api('GET', '/contact');
  const m = messages.find(x => x.id === id);
  if (!m) return;
  openModal('Message from ' + m.name, `
    <p><strong>From:</strong> ${m.name} &lt;<a href="mailto:${m.email}" style="color:var(--electric)">${m.email}</a>&gt;</p>
    <p style="margin-top:0.5rem"><strong>Subject:</strong> ${m.subject || '—'}</p>
    <div class="message-preview">${m.message}</div>
  `, null);
  $('#modal-confirm').style.display = 'none';
  setTimeout(() => { $('#modal-confirm').style.display = ''; }, 0);
  if (!m.read) { await api('PUT', `/contact/${id}/read`, {}); loadMessages(); }
};

window.markRead = async (id, btn) => {
  try { await api('PUT', `/contact/${id}/read`, {}); toast('Marked as read'); btn.remove(); loadMessages(); } catch (e) { toast(e.message, 'error'); }
};
window.deleteMessage = async (id) => {
  if (!confirm('Delete this message?')) return;
  try { await api('DELETE', `/contact/${id}`); toast('Deleted!'); loadMessages(); } catch (e) { toast(e.message, 'error'); }
};

// ── About Us Slides ──────────────────────────────────────────
async function loadAboutSlides() {
  const container = document.getElementById('panel-about');
  if (!container) return;

  // Always render the header first so the panel is never blank
  container.innerHTML = `
    <div class="panel-header">
      <h2 style="font-size:1.4rem">About Us Slides</h2>
      <button class="btn btn-primary" style="padding:.5rem 1.2rem;font-size:.85rem" onclick="addAboutSlide()">+ Add Slide</button>
    </div>
    <div class="panel-section">
      <p style="color:var(--gray-500);margin-bottom:1rem;font-size:.85rem">
        These images appear in the About Us section carousel on the homepage. Each slide has an image and optional caption text.
      </p>
      <div id="about-slides-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem"></div>
    </div>`;

  let slides = [];
  try { slides = await api('GET', '/about') || []; }
  catch (e) {
    document.getElementById('about-slides-list').innerHTML = `<p style="color:var(--red)">⚠️ Failed to load: ${e.message}</p>`;
    return;
  }

  const list = document.getElementById('about-slides-list');
  if (slides.length === 0) {
    list.innerHTML = '<p style="color:var(--gray-500)">No slides yet. Click "+ Add Slide" to get started!</p>';
    return;
  }

  list.innerHTML = '';
  slides.forEach(s => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;overflow:hidden';
    card.innerHTML = `
      ${s.image
        ? `<img src="${API}${fixImg(s.image)}" style="width:100%;height:140px;object-fit:cover;display:block" onerror="this.style.display='none'" />`
        : `<div style="width:100%;height:140px;background:var(--dark-2);display:flex;align-items:center;justify-content:center;font-size:2rem">🖼️</div>`
      }
      <div style="padding:.75rem">
        <p style="font-size:0.8rem;color:var(--gray-300);margin:0 0 .6rem;min-height:2em">${s.caption || '<em style="color:var(--gray-500)">No caption</em>'}</p>
        <div style="display:flex;gap:.5rem">
          <button onclick="editAboutSlide(${s.id})" style="flex:1;padding:.35rem;border-radius:6px;background:var(--navy-dim);border:1px solid var(--navy);color:#6fa3f0;cursor:pointer;font-size:.8rem">Edit</button>
          <button onclick="deleteAboutSlide(${s.id})" style="padding:.35rem .7rem;border-radius:6px;background:rgba(255,62,62,.15);border:1px solid rgba(255,62,62,.3);color:#ff4555;cursor:pointer;font-size:.8rem">✕</button>
        </div>
      </div>`;
    list.appendChild(card);
  });
}

window.addAboutSlide = () => {
  openModal('Add About Slide',
    imageFieldHTML('') + `<div class="form-group"><label>Caption (shown below the image)</label><input id="modal-caption" placeholder="e.g. Our team at the 2024 competition..." /></div>`,
    async () => {
      const image = document.getElementById('modal-image').value;
      if (!image) return toast('Please upload an image first', 'error');
      try {
        await api('POST', '/about', { image, caption: document.getElementById('modal-caption').value });
        closeModal(); loadAboutSlides(); toast('Slide added!');
      } catch (e) { toast(e.message, 'error'); }
    });
  bindUpload('modal-image');
};

window.editAboutSlide = async (id) => {
  let slides = [];
  try { slides = await api('GET', '/about') || []; } catch { return toast('Failed to load', 'error'); }
  const s = slides.find(x => x.id === id);
  if (!s) return;
  openModal('Edit About Slide',
    imageFieldHTML(s.image) + `<div class="form-group"><label>Caption</label><input id="modal-caption" value="${s.caption || ''}" /></div>`,
    async () => {
      const image = document.getElementById('modal-image').value;
      try {
        await api('PUT', `/about/${id}`, { image, caption: document.getElementById('modal-caption').value });
        closeModal(); loadAboutSlides(); toast('Updated!');
      } catch (e) { toast(e.message, 'error'); }
    });
  bindUpload('modal-image');
};

window.deleteAboutSlide = async (id) => {
  if (!confirm('Delete this slide?')) return;
  try { await api('DELETE', `/about/${id}`); loadAboutSlides(); toast('Deleted!'); }
  catch (e) { toast(e.message, 'error'); }
};

// ── Season Gallery Management ─────────────────────────────────
window.manageSeasonGallery = async (seasonId, seasonTitle) => {
  let images = [];
  try { images = await api('GET', `/seasons/${seasonId}/gallery`) || []; }
  catch { images = []; }

  const listHTML = images.length > 0
    ? images.map(img => `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--card-border)">
        ${img.image
        ? `<img src="${API}${fixImg(img.image)}" style="width:90px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0" />`
        : `<div style="width:90px;height:60px;background:var(--dark-2);border-radius:6px;display:flex;align-items:center;justify-content:center">🖼️</div>`}
        <span style="flex:1;font-size:.85rem;color:var(--gray-300)">${img.caption || '<em style="color:var(--gray-500)">No caption</em>'}</span>
        <button onclick="deleteSeasonGalleryImg(${seasonId},${img.id},'${seasonTitle.replace(/'/g, "\\'")}')" style="padding:.3rem .7rem;border-radius:6px;background:rgba(255,62,62,.15);border:1px solid rgba(255,62,62,.3);color:#ff4555;cursor:pointer;flex-shrink:0">✕</button>
      </div>`).join('')
    : '<p style="color:var(--gray-500);margin-bottom:1rem">No images yet. Add the first one below!</p>';

  openModal(`🖼 Gallery: ${seasonTitle}`,
    `<div style="max-height:250px;overflow-y:auto;margin-bottom:1rem">${listHTML}</div>
    <hr style="margin:1rem 0;border-color:var(--card-border)">
    <h4 style="margin-bottom:.75rem;font-size:.9rem;color:var(--electric)">Add New Image</h4>
    ${imageFieldHTML('', 'sg-image')}
    <div class="form-group"><label>Caption (optional)</label><input id="sg-caption-input" placeholder="Caption text..." /></div>`,
    async () => {
      const image = document.getElementById('sg-image').value;
      if (!image) return toast('Please upload an image', 'error');
      try {
        await api('POST', `/seasons/${seasonId}/gallery`, { image, caption: document.getElementById('sg-caption-input').value });
        toast('Image added!');
        closeModal();
        // Reopen with fresh data
        window.manageSeasonGallery(seasonId, seasonTitle);
      } catch (e) { toast(e.message, 'error'); }
    });
  setTimeout(() => bindUpload('sg-image'), 100);
};

window.deleteSeasonGalleryImg = async (seasonId, imgId, seasonTitle) => {
  if (!confirm('Delete this image?')) return;
  try {
    await api('DELETE', `/seasons/${seasonId}/gallery/${imgId}`);
    toast('Deleted!');
    closeModal();
    window.manageSeasonGallery(seasonId, seasonTitle);
  } catch (e) { toast(e.message, 'error'); }
};

// ── Backup & Restore ─────────────────────────────────────────
async function loadBackup() {
  try {
    const info = await api('GET', '/backup/info');
    if (info) {
      $('#bk-db-size').textContent   = info.database.sizeMB + ' MB';
      $('#bk-img-count').textContent = info.uploads.count + ' files';
      $('#bk-total').textContent     = info.totalMB + ' MB';

      // Show/hide pending restore banner
      let banner = $('#bk-pending-banner');
      if (info.pendingRestore) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'bk-pending-banner';
          banner.style.cssText = 'background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.4);border-radius:10px;padding:1rem 1.2rem;margin-bottom:1.5rem;color:#eab308;font-size:.9rem;display:flex;align-items:center;gap:.7rem;';
          banner.innerHTML = '<span style="font-size:1.3rem;">⚠️</span><span><strong>Pending Restore:</strong> A database restore is staged and waiting. <strong>Restart the server</strong> to apply it.</span>';
          const section = $('#backup-info-card').parentElement;
          section.insertAdjacentElement('afterend', banner);
        }
      } else if (banner) {
        banner.remove();
      }
    }
  } catch { /* non‑critical */ }
}

// Download backup button
$('#bk-download-btn').addEventListener('click', async () => {
  const btn = $('#bk-download-btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.7">Preparing…</span>';
  try {
    const r = await fetch(API + '/api/backup/download', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Download failed');
    const blob = await r.blob();
    const cd   = r.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="(.+?)"/);
    const filename = match ? match[1] : 'zfast_backup.zip';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast('✅ Backup downloaded: ' + filename);
  } catch (e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg> Download Backup';
  }
});

// Restore file picker
$('#bk-restore-input').addEventListener('change', e => {
  const file = e.target.files[0];
  const btn  = $('#bk-restore-btn');
  if (file) {
    $('#bk-restore-filename').textContent = file.name;
    btn.disabled = false;
    btn.style.opacity = '1';
  } else {
    $('#bk-restore-filename').textContent = 'No file selected';
    btn.disabled = true;
    btn.style.opacity = '.5';
  }
});

// Restore button
$('#bk-restore-btn').addEventListener('click', async () => {
  const file = $('#bk-restore-input').files[0];
  if (!file) return;
  if (!confirm('⚠️ This will OVERWRITE all current data with the backup. Are you sure?')) return;

  const btn      = $('#bk-restore-btn');
  const progress = $('#bk-restore-progress');
  const bar      = $('#bk-restore-bar');
  const status   = $('#bk-restore-status');

  btn.disabled = true;
  progress.style.display = 'block';
  bar.style.width = '30%';
  status.textContent = 'Uploading backup file…';

  try {
    const fd = new FormData();
    fd.append('backup', file);
    bar.style.width = '60%';
    const r = await fetch(API + '/api/backup/restore', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    bar.style.width = '90%';
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Restore failed');
    bar.style.width = '100%';
    bar.style.background = '#22c55e';
    status.textContent = data.message;
    status.style.color  = '#22c55e';
    toast('✅ Restore complete! Please restart the server.');
    $('#bk-restore-input').value = '';
    $('#bk-restore-filename').textContent = 'No file selected';
  } catch (e) {
    bar.style.background = '#ef4444';
    bar.style.width = '100%';
    status.textContent = '❌ ' + e.message;
    status.style.color  = '#ef4444';
    toast('❌ ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// ── Init ─────────────────────────────────────────────────────
checkAuth();
