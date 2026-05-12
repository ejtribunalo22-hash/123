/**
 * js/data.js
 * ──────────────────────────────────────────────────────
 * Data layer — Database & localStorage persistence.
 * All other modules read/write these global arrays.
 * ──────────────────────────────────────────────────────
 */

const API_URL  = 'php/api.php';
const MOVS_URL = 'php/movs.php';

/* ── Application Data ── */
let cases       = [];
let hearings    = [];
let settlements = [];
let members     = [];
let invitations = [];

/* ── System Configuration ── */
let cfg = {
  brgy: 'Barangay Dadiangas West',
  muni: 'General Santos City',
  prov: 'South Cotabato',
  pass: 'c66432d603cbe1b37b0959440bad7cde824bffa1cc30d72e1a50fdfdf00cde4a', 
  user: 'admin'
};

/**
 * Fetch all data from the database.
 */
async function loadAllData() {
  try {
    const response = await fetch(`${API_URL}?action=get_all`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    if (data.cases) cases = data.cases.map(c => {
      // Map database columns back to JS object structure
      return {
        id: String(c.id),
        caseNo: c.case_no,
        dateFiled: c.date_filed,
        nature: c.nature,
        status: c.status,
        pangkat: c.pangkat,
        docket: c.docket,
        desc: c.description,
        relief: c.relief,
        comp: {
          last: c.comp_last, first: c.comp_first, mid: c.comp_mid,
          age: c.comp_age, addr: c.comp_addr, tel: c.comp_tel, civil: c.comp_civil
        },
        resp: {
          last: c.resp_last, first: c.resp_first, mid: c.resp_mid,
          age: c.resp_age, addr: c.resp_addr, tel: c.resp_tel, civil: c.resp_civil
        }
      };
    });

    if (data.members) members = data.members.map(m => ({
      id: String(m.id),
      name: m.name,
      role: m.role,
      tel: m.tel,
      date: m.date_joined,
      exp: m.expiry_date,
      status: m.status
    }));

    if (data.hearings) hearings = data.hearings.map(h => ({
      id: String(h.id),
      caseId: h.case_id ? String(h.case_id) : null,
      caseNo: h.case_no,
      date: h.hearing_date,
      time: h.hearing_time,
      venue: h.venue,
      type: h.type,
      mediator: h.mediator,
      notes: h.notes
    }));

    if (data.settlements) settlements = data.settlements.map(s => ({
      id: String(s.id),
      caseNo: s.case_no,
      date: s.settlement_date,
      type: s.type,
      terms: s.terms,
      captain: s.captain,
      witness: s.witness
    }));

    if (data.invitations) invitations = data.invitations.map(i => ({
      id: String(i.id),
      type: i.type,
      date: i.issue_date,
      recipients: i.recipients,
      addr: i.address,
      appDate: i.app_date,
      appTime: i.app_time,
      parties: i.parties,
      subject: i.subject,
      closing: i.closing,
      signatory: i.signatory,
      title: i.title
    }));

    if (data.config) {
      cfg.brgy = data.config.brgy;
      cfg.muni = data.config.muni;
      cfg.prov = data.config.prov;
      cfg.pass = data.config.admin_pass;
      cfg.user = data.config.admin_user;
    }

    // Still keep a local copy in localStorage for faster initial loads (optional)
    persistLocal();
    
    console.log('Data loaded from DB successfully');
  } catch (error) {
    console.error('Failed to load data from DB, falling back to localStorage:', error);
    loadFromLocal();
  }
}

function loadFromLocal() {
  cases       = JSON.parse(localStorage.getItem('lp-cases')   || '[]');
  hearings    = JSON.parse(localStorage.getItem('lp-hear')    || '[]');
  settlements = JSON.parse(localStorage.getItem('lp-settle')  || '[]');
  members     = JSON.parse(localStorage.getItem('lp-members') || '[]');
  invitations = JSON.parse(localStorage.getItem('lp-invites') || '[]');
  
  const savedCfg = localStorage.getItem('lp-cfg');
  if (savedCfg) cfg = JSON.parse(savedCfg);
}

function persistLocal() {
  localStorage.setItem('lp-cases',   JSON.stringify(cases));
  localStorage.setItem('lp-hear',    JSON.stringify(hearings));
  localStorage.setItem('lp-settle',  JSON.stringify(settlements));
  localStorage.setItem('lp-members', JSON.stringify(members));
  localStorage.setItem('lp-invites', JSON.stringify(invitations));
  localStorage.setItem('lp-cfg',     JSON.stringify(cfg));

  // Trigger notification update if function is available
  if (typeof updateNotifications === 'function') {
    updateNotifications();
  }
}

/**
 * Generic API POST helper
 */
async function apiPost(action, data) {
  try {
    console.log(`API POST [${action}]:`, data);
    const response = await fetch(`${API_URL}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const text = await response.text();
    console.log(`API Response [${action}] (raw):`, text);
    
    try {
      const res = JSON.parse(text);
      if (res.error) {
        console.error(`API Error [${action}]:`, res.error);
        alert(`⚠️ Database Error:\n${res.error}`);
        return { error: res.error };
      }
      return res;
    } catch (e) {
      console.error(`JSON Parse Error [${action}]:`, text);
      alert(`⚠️ Server Error:\nThe server sent an invalid response. Please check php/api_debug.log`);
      return { error: 'Invalid server response. Check PHP logs.' };
    }
  } catch (error) {
    console.error(`Network Error [${action}]:`, error);
    alert(`⚠️ Network Error:\nCould not reach the server. Make sure XAMPP Apache is running.`);
    return { error: error.message };
  }
}

/**
 * Generic API DELETE helper
 */
async function apiDelete(action, id) {
  try {
    console.log(`API DELETE [${action}] ID:`, id);
    const url = action === 'delete_mov' ? `${MOVS_URL}?action=delete&id=${id}` : `${API_URL}?action=${action}&id=${id}`;
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    const text = await response.text();
    console.log(`API Response [${action}] (raw):`, text);
    
    try {
      const res = JSON.parse(text);
      return res;
    } catch (e) {
      console.error(`JSON Parse Error [${action}]:`, text);
      return { error: 'Invalid server response.' };
    }
  } catch (error) {
    console.error(`Network Error [${action}]:`, error);
    return { error: error.message };
  }
}

/**
 * MOV (Means of Verification) API Functions
 */
async function uploadMOV(formData) {
  try {
    const response = await fetch(`${MOVS_URL}?action=upload`, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    console.log('Raw Upload Response:', text);
    
    try {
      const res = JSON.parse(text);
      if (res.error) alert(`⚠️ Upload Error:\n${res.error}`);
      return res;
    } catch (e) {
      console.error('Upload JSON Parse Error:', text);
      alert(`⚠️ Server Error:\nThe server sent an invalid response. Please check if php/movs.php exists and Apache is running.`);
      return { error: 'Invalid server response' };
    }
  } catch (error) {
    console.error('Upload Network Error:', error);
    alert('⚠️ Network Error: Could not reach the server. Make sure you are using http://localhost and not opening the HTML file directly.');
    return { error: error.message };
  }
}

async function getMOVs(ref_id, ref_type) {
  try {
    const response = await fetch(`${MOVS_URL}?action=list&ref_id=${ref_id}&ref_type=${ref_type}`);
    return await response.json();
  } catch (error) {
    console.error('List MOVs Error:', error);
    return { error: error.message };
  }
}

/**
 * Persist all data arrays (deprecated for DB, but kept for compatibility)
 * In a real DB app, we save per-record.
 */
function persist() {
  persistLocal();
}

/**
 * Persist the system configuration.
 */
async function saveCfg() {
  persistLocal();
  const res = await apiPost('save_config', cfg);
  if (res.error) {
    console.error('Failed to save config to DB:', res.error);
  }
}

// loadAllData() is now called by app.js on DOMContentLoaded
