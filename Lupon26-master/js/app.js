/**
 * js/app.js
 * ──────────────────────────────────────────────────────
 * Application bootstrap — login/logout, live clock,
 * navigation router, and dashboard rendering.
 * Loaded last so all other modules are already defined.
 * ──────────────────────────────────────────────────────
 */


/* ════════════════════════════════════
   PASSWORD HASHING
════════════════════════════════════ */

/**
 * Returns a SHA-256 hex string of the input using the Web Crypto API.
 * Works on file:// protocol — no server needed.
 */
async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}


/* ════════════════════════════════════
   LOGIN / LOGOUT
════════════════════════════════════ */

async function doLogin() {
  const u    = document.getElementById('login-user').value.trim();
  const p    = document.getElementById('login-pass').value;
  const hash = await sha256(p);

  if (u === cfg.user && hash === cfg.pass) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    updateHeader();
    initCaseForm();
    renderDashboard();
  } else {
    const el = document.getElementById('login-error');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

function logout() {
  if (!confirm('Logout from the system?')) return;
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

/** Show/hide the barangay setup form on the login screen. */
function toggleSetup(show) {
  document.getElementById('setup-section').style.display = show ? 'block' : 'none';
  document.getElementById('login-section').style.display = show ? 'none'  : 'block';

  if (show) {
    document.getElementById('setup-brgy').value = cfg.brgy;
    document.getElementById('setup-muni').value = cfg.muni;
    document.getElementById('setup-prov').value = cfg.prov;
  }
}

/** Save barangay info and optionally change the password. */
async function setupSystem() {
  const brgy = document.getElementById('setup-brgy').value.trim();
  const muni = document.getElementById('setup-muni').value.trim();
  const prov = document.getElementById('setup-prov').value.trim();
  const p1   = document.getElementById('setup-pass1').value;
  const p2   = document.getElementById('setup-pass2').value;

  if (!brgy)                   { showSetupErr('Enter barangay name.'); return; }
  if (p1 && p1.length < 6)     { showSetupErr('Password must be at least 6 characters.'); return; }
  if (p1 && p1 !== p2)         { showSetupErr('Passwords do not match.'); return; }

  cfg.brgy = brgy;
  cfg.muni = muni;
  cfg.prov = prov;
  if (p1) cfg.pass = await sha256(p1);  // store hash, never the plain password

  saveCfg();
  toggleSetup(false);
  toast(' Settings saved! Please login.', '#1a5c38');
}

function showSetupErr(msg) {
  const el = document.getElementById('setup-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3500);
}

// ══════════════════════════════════════════════════════
// NAVIGATION & CORE APP LOGIC
// ══════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
  // Wait for database data to load
  await loadAllData();
  
  // Update header with loaded config
  updateHeader();

  // Initialize notifications for Supervisor
  initNotifications();

  // Load page from hash or default to dashboard
  const initialPage = window.location.hash.replace('#', '') || 'dashboard';
  if (initialPage && document.getElementById('page-' + initialPage)) {
    showPage(initialPage, false); // false to prevent redundant hash push
  }
});

/**
 * Notification System for Supervisor
 */
function initNotifications() {
  // Update notifications initially
  updateNotifications();
  
  // Close notification panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn = document.getElementById('notif-btn');
    if (panel && panel.classList.contains('visible') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('visible');
    }
  });
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) {
    panel.classList.toggle('visible');
  }
}

function updateNotifications() {
  // Only show notifications for Supervisor (admin)
  if (cfg.user !== 'admin') {
    const wrapper = document.querySelector('.notif-wrapper');
    if (wrapper) wrapper.style.display = 'none';
    return;
  }

  const listEl = document.getElementById('notif-list');
  const countEl = document.getElementById('notif-count');
  if (!listEl || !countEl) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const notifications = [];

  // 1. Check Hearings due today
  if (typeof hearings !== 'undefined' && Array.isArray(hearings)) {
    hearings.forEach(h => {
      if (h.date === todayStr) {
        notifications.push({
          title: `Hearing for Case ${h.caseNo}`,
          type: 'Hearing',
          date: h.date,
          status: 'urgent'
        });
      }
    });
  }

  // 2. Check Invitations due today
  if (typeof invitations !== 'undefined' && Array.isArray(invitations)) {
    invitations.forEach(i => {
      if (i.appDate === todayStr) {
        notifications.push({
          title: `Appointment: ${i.subject || 'Meeting'}`,
          type: 'Invitation',
          date: i.appDate,
          status: 'urgent'
        });
      }
    });
  }

  // 3. Check Escalated cases (need immediate submission/approval)
  if (typeof cases !== 'undefined' && Array.isArray(cases)) {
    cases.forEach(c => {
      if (c.status === 'Escalated' || c.status === 'Urgent') {
        notifications.push({
          title: `Case ${c.caseNo}: ${c.nature}`,
          type: 'Case Action',
          date: c.dateFiled,
          status: 'urgent'
        });
      }
    });
  }

  // 4. Check for incomplete MOVs (Focus on Reports)
  const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
  const currentYear = new Date().getFullYear();
  const reportRefId = `Quarterly-Report-Q${currentQuarter}-${currentYear}`;
  
  getMOVs(reportRefId, 'report').then(movs => {
    if (Array.isArray(movs) && movs.length < 1) { // Alert if no MOVs attached to current report
      notifications.push({
        title: `No MOVs attached for Q${currentQuarter} Report`,
        type: 'Report Action',
        date: todayStr,
        status: 'pending'
      });
      // Update UI again since this is async
      renderNotifUI(notifications, countEl, listEl);
    }
  });

  renderNotifUI(notifications, countEl, listEl);
}

function renderNotifUI(notifications, countEl, listEl) {
  // Update Badge
  countEl.textContent = notifications.length;
  countEl.style.display = notifications.length > 0 ? 'flex' : 'none';

  // Update List
  if (notifications.length === 0) {
    listEl.innerHTML = '<div class="empty-notif">No new notifications</div>';
  } else {
    listEl.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.status}" onclick="showPage('${n.type === 'Hearing' ? 'hearings' : n.type === 'Invitation' ? 'invitations' : 'cases'}')">
        <div class="notif-item-title">${n.title}</div>
        <div class="notif-item-meta">
          <span>${n.type} • ${n.date}</span>
          <span class="notif-item-status ${n.status}">${n.status}</span>
        </div>
      </div>
    `).join('');
  }
}

// Handle browser back/forward and direct hash entry
window.addEventListener('hashchange', () => {
  const pageId = window.location.hash.replace('#', '');
  if (pageId && document.getElementById('page-' + pageId)) {
    showPage(pageId, false);
  }
});

/** Update the header bar with the configured barangay name. */
function updateHeader() {
  document.getElementById('hdr-brgy-name').innerHTML =
    `${cfg.brgy} &nbsp;|&nbsp; ${cfg.muni}, ${cfg.prov} &nbsp;|&nbsp; Republika ng Pilipinas`;
}


/* ════════════════════════════════════
   LIVE CLOCK
════════════════════════════════════ */

function tick() {
  const n = new Date();
  document.getElementById('live-clock').textContent =
    n.toLocaleTimeString('en-PH');
  document.getElementById('live-date').textContent =
    n.toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

setInterval(tick, 1000);
tick();


/* ════════════════════════════════════
   NAVIGATION ROUTER
════════════════════════════════════ */

const NAV_PAGES = [
  'dashboard', 'filing', 'cases', 'hearings', 'settlement', 
  'invitations', 'tracer', 'documents', 'lupons', 'backup'
];

/**
 * Switch to a named page and run any page-specific init.
 * @param {string} id - Page key (must match NAV_PAGES)
 * @param {boolean} updateHash - Whether to update the URL hash (default true)
 */
function showPage(id, updateHash = true) {
  // Update UI active states
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById('page-' + id);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Find and highlight the corresponding nav button
  const btn = document.querySelector(`nav button[onclick*="'${id}'"]`);
  if (btn) {
    btn.classList.add('active');
  }

  // Update URL hash for persistence if requested
  if (updateHash) {
    window.location.hash = id;
  }

  // Page-specific initialisation
  switch (id) {
    case 'dashboard':  
      updateNotifications();
      renderDashboard();                   
      break;
    case 'cases':      renderCases();                       break;
    case 'hearings':   fillCaseDDs(); renderHearings();     break;
    case 'settlement': fillCaseDDs(); renderSettlements();  break;
    case 'documents':  fillDocDDs();                        break;
    case 'lupons':     renderMembers();                     break;
    case 'invitations': initInvitationForm(); renderInvitations(); break;
    case 'backup':     updateBackupSummary();               break;
  }
}

/**
 * Switch the active tab on the Documents page.
 * @param {string} t   - Tab key (summons | cfa | certificate | complaint)
 * @param {Element} btn - The clicked tab button element
 */
function showDocTab(t, btn) {
  document.querySelectorAll('.doc-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.doc-tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('dtab-' + t).classList.add('active');
  if (btn) btn.classList.add('active');
}


/* ════════════════════════════════════
   DASHBOARD
════════════════════════════════════ */

function renderDashboard() {
  // Stat counters
  document.getElementById('st-total').textContent     = cases.length;
  document.getElementById('st-pending').textContent   = cases.filter(c => c.status === 'Pending').length;
  document.getElementById('st-mediation').textContent = cases.filter(c => c.status === 'Active' || c.status === 'Mediation').length;
  document.getElementById('st-settled').textContent   = cases.filter(c => c.status === 'Settled').length;
  document.getElementById('st-escalated').textContent = cases.filter(c => c.status === 'Escalated').length;

  // Recent cases table (latest 6)
  const recent = [...cases].reverse().slice(0, 6);
  document.getElementById('dash-recent').innerHTML = recent.length
    ? recent.map(c => `
        <tr>
          <td><b>${c.caseNo}</b></td>
          <td>${c.comp.last}, ${c.comp.first}</td>
          <td>${c.nature}</td>
          <td>${badge(c.status)}</td>
        </tr>`).join('')
    : `<tr>
         <td colspan="4" style="text-align:center;color:#999;padding:20px;">
           No cases yet.
         </td>
       </tr>`;

  // Upcoming hearings (next 4)
  const today    = new Date().toISOString().split('T')[0];
  const upcoming = hearings
    .filter(h => h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const dh = document.getElementById('dash-hearings');
  dh.innerHTML = upcoming.length
    ? upcoming.map(h => {
        const d = new Date(h.date + 'T00:00:00');
        return `
          <div class="h-item">
            <div class="h-date-box">
              <div class="h-day">${d.getDate()}</div>
              <div class="h-mon">
                ${d.toLocaleString('en-PH', { month: 'short' }).toUpperCase()}
              </div>
            </div>
            <div>
              <b>${h.caseNo}</b> — ${h.type}
              <div style="font-size:.77rem;color:#666;">
                ${h.time || ''} ${h.venue ? '@ ' + h.venue : ''}
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty">
         <div class="ei">📭</div>
         <p>No upcoming hearings.</p>
       </div>`;
}