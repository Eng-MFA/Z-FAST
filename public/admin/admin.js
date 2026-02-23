/* ============================================================
   Z-FAST Admin Panel — JavaScript
   ============================================================ */

const API = (typeof window !== 'undefined' && window.ZFAST_API) ? window.ZFAST_API : '';
let token = localStorage.getItem('zfast_token') || '';

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
        ${currentUrl ? `<img src="${API}${currentUrl}" class="upload-preview" id="preview-${fieldId}" />` : `<img class="upload-preview" id="preview-${fieldId}" style="display:none" />`}
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
      preview.src = API + url; preview.style.display = 'block';
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
    case 'hero-stats': loadHeroStats(); break;
    case 'team-members': loadTeamMembers(); break;
    case 'sponsors': loadSponsors(); break;
    case 'seasons': loadSeasons(); break;
    case 'news': loadNews(); break;
    case 'messages': loadMessages(); break;
  }
}

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  const [members, sponsors, seasons, news, messages] = await Promise.all([
    api('GET', '/team-members'), api('GET', '/sponsors'), api('GET', '/seasons'),
    api('GET', '/news?limit=99'), api('GET', '/contact')
  ]);
  if (members) $('#dash-members').textContent = members.length;
  if (sponsors) $('#dash-sponsors').textContent = sponsors.length;
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
      <td>${c.image ? `<img src="${API}${c.image}" style="border-radius:6px" />` : '—'}</td>
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

// ── Hero Stats ────────────────────────────────────────────────
async function loadHeroStats() {
  const data = await api('GET', '/team-info');
  if (!data) return;
  const form = $('#hero-stats-form');
  const stats = [
    { n: 1, icon: '⚡', title: 'Stat 1' },
    { n: 2, icon: '⚙️', title: 'Stat 2' },
    { n: 3, icon: '🏗️', title: 'Stat 3' },
  ];
  form.innerHTML = stats.map(s => `
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:1.2rem 1.5rem;margin-bottom:1rem">
      <div style="font-family:var(--font-head);font-size:1rem;font-weight:700;color:var(--electric);margin-bottom:1rem">
        ${s.icon} ${s.title}
        <span style="font-size:2rem;font-weight:900;color:var(--white);margin-left:1rem" id="hs-preview-${s.n}">${data['hero_stat_' + s.n + '_value'] || ''}${data['hero_stat_' + s.n + '_suffix'] || ''}</span>
        <span style="font-size:0.8rem;color:var(--gray-300);margin-left:0.5rem" id="hs-lbl-preview-${s.n}">${data['hero_stat_' + s.n + '_label'] || ''}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
        <div class="form-group" style="margin:0">
          <label>Number Value</label>
          <input id="hs-val-${s.n}" type="text" value="${data['hero_stat_' + s.n + '_value'] || ''}" oninput="updateHsPreview(${s.n})" />
        </div>
        <div class="form-group" style="margin:0">
          <label>Suffix (unit)</label>
          <input id="hs-suf-${s.n}" type="text" value="${data['hero_stat_' + s.n + '_suffix'] || ''}" oninput="updateHsPreview(${s.n})" placeholder="e.g. s, kW, kg" />
        </div>
        <div class="form-group" style="margin:0">
          <label>Label</label>
          <input id="hs-lbl-${s.n}" type="text" value="${data['hero_stat_' + s.n + '_label'] || ''}" oninput="updateHsLblPreview(${s.n})" placeholder="e.g. 0-100 km/h" />
        </div>
      </div>
    </div>
  `).join('');
}

window.updateHsPreview = (n) => {
  const val = document.getElementById(`hs-val-${n}`)?.value || '';
  const suf = document.getElementById(`hs-suf-${n}`)?.value || '';
  const el = document.getElementById(`hs-preview-${n}`);
  if (el) el.textContent = val + suf;
};
window.updateHsLblPreview = (n) => {
  const lbl = document.getElementById(`hs-lbl-${n}`)?.value || '';
  const el = document.getElementById(`hs-lbl-preview-${n}`);
  if (el) el.textContent = lbl;
};

$('#save-hero-stats').addEventListener('click', async () => {
  const updates = {};
  for (let i = 1; i <= 3; i++) {
    updates[`hero_stat_${i}_value`] = document.getElementById(`hs-val-${i}`)?.value || '';
    updates[`hero_stat_${i}_suffix`] = document.getElementById(`hs-suf-${i}`)?.value || '';
    updates[`hero_stat_${i}_label`] = document.getElementById(`hs-lbl-${i}`)?.value || '';
  }
  try { await api('PUT', '/team-info', updates); toast('✅ Hero Stats saved!'); } catch { toast('Save failed', 'error'); }
});

// ── Team Members ──────────────────────────────────────────────
async function loadTeamMembers() {
  const members = await api('GET', '/team-members'); if (!members) return;
  const tbody = $('#members-tbody'); tbody.innerHTML = '';
  members.forEach(m => {
    const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.image ? `<img src="${API}${m.image}" />` : `<div class="placeholder-avatar">${initials}</div>`}</td>
      <td><strong>${m.name}</strong></td><td>${m.role}</td><td>${m.department}</td>
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
    <div class="form-group"><label>Department</label>
      <select id="m-dept">
        ${['Technical', 'Operations', 'Management', 'Marketing'].map(d => `<option${m.department === d ? ' selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Bio</label><textarea id="m-bio" rows="3">${m.bio || ''}</textarea></div>
    <div class="form-group"><label>LinkedIn URL</label><input id="m-linkedin" value="${m.linkedin || ''}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${m.display_order || 0}" /></div>
    ${imageFieldHTML(m.image, 'member-img')}
  `, async () => {
    bindUpload('member-img');
    const body = { name: $('#m-name').value, role: $('#m-role').value, department: $('#m-dept').value, bio: $('#m-bio').value, linkedin: $('#m-linkedin').value, display_order: parseInt($('#m-order').value) || 0, image: $('#member-img').value };
    try {
      if (id) await api('PUT', `/team-members/${id}`, body); else await api('POST', '/team-members', body);
      toast('Member saved!'); closeModal(); loadTeamMembers();
    } catch (e) { toast(e.message, 'error'); }
  });
  setTimeout(() => bindUpload('member-img'), 100);
};

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
      <td>${s.logo ? `<img src="${API}${s.logo}" />` : '—'}</td>
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

// ── Seasons ───────────────────────────────────────────────────
async function loadSeasons() {
  const seasons = await api('GET', '/seasons'); if (!seasons) return;
  const tbody = $('#seasons-tbody'); tbody.innerHTML = '';
  seasons.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.image ? `<img src="${API}${s.image}" style="border-radius:6px" />` : '—'}</td>
      <td><strong>${s.year}</strong></td><td>${s.title}</td>
      <td style="max-width:200px;font-size:0.8rem;color:var(--gray-300)">${s.achievements || '—'}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editSeason(${s.id})">Edit</button>
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

// ── Init ─────────────────────────────────────────────────────
checkAuth();
