/**
 * js/invitations.js - VERSION 3.0 (OFFICIAL HEADER)
 */

function invHeader() {
  return `
    <table style="width:auto; margin:0 auto; border-collapse:collapse; margin-bottom:6px;">
      <tr>
        <td style="width:90px; vertical-align:middle; text-align:center;">
          <img src="assets/logo.png" width="100" height="100"
               style="border-radius:50%; display:block; margin:0 auto; background-color:white;"
               onerror="this.style.display='none'">
        </td>
        <td style="vertical-align:middle; text-align:center; padding:20px 8px 0 8px;">
          <div style="font-size:10pt; margin-bottom:2px;">Republic of the Philippines</div>
          <div style="font-size:10pt;">Province of 1<sup>st</sup> District of ${cfg.prov}</div>
          <div style="font-size:10pt; text-transform:uppercase;">CITY OF ${cfg.muni.toUpperCase()}</div>
          <div style="font-size:13pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; margin-top:5px;">${cfg.brgy.toUpperCase()}</div>
          <div style="margin-top:30px;"></div>
          <div style="font-size:11pt; font-weight:bold; text-transform:uppercase;">OFFICE OF THE LUPONG TAGAPAMAYAPA</div>
        </td>
        <td style="width:110px; vertical-align:middle; text-align:center;">
          <img src="assets/magandang-gensan-logo.png" width="100" height="100"
               style="display:block; margin:0 auto; background-color:white;"
               onerror="this.style.display='none'">
        </td>
      </tr>
    </table>
  `;
}

function initInvitationForm() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = today;
  document.getElementById('inv-app-date').value = today;
  if (cfg.admin_user) document.getElementById('inv-signatory').value = cfg.admin_user.toUpperCase();
}

function clearInvitationForm() {
  ['inv-recipients', 'inv-addr', 'inv-resp-recipients', 'inv-resp-addr', 'inv-app-time', 'inv-parties', 'inv-subject']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  initInvitationForm();
}

async function printInvitation(type = 'complainant') {
  const date = document.getElementById('inv-date').value;
  const recipientsId = type === 'respondent' ? 'inv-resp-recipients' : 'inv-recipients';
  const addrId = type === 'respondent' ? 'inv-resp-addr' : 'inv-addr';
  
  const recipients = document.getElementById(recipientsId).value.trim();
  const addr = document.getElementById(addrId).value.trim();
  const appDate = document.getElementById('inv-app-date').value;
  const appTime = document.getElementById('inv-app-time').value;
  const parties = document.getElementById('inv-parties').value.trim();
  const subject = document.getElementById('inv-subject').value.trim();
  const signatory = document.getElementById('inv-signatory').value.trim();
  const title = document.getElementById('inv-title').value.trim();

  if (!date || !recipients || !addr || !appDate || !appTime || !parties || !subject) {
    alert('Please fill in all required fields.'); return;
  }

  const invData = { id: Date.now().toString(), type, date, recipients, addr, appDate, appTime, parties, subject, signatory, title };
  invitations.push(invData);
  await apiPost('save_invitation', invData);
  
  // Automatically record this invitation as a Case in the registry
  await syncInvitationToCase(invData);

  const html = genInvitationHTML(invData);
  kpShow(html, type + '-Invitation-' + invData.id);
  
  // Refresh the list
  renderInvitations();
}

/**
 * Generate the HTML content for an invitation letter.
 */
function genInvitationHTML(inv) {
  const formattedAppDate = new Date(inv.appDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Determine time period (morning/afternoon/evening)
  const hour = parseInt(inv.appTime.split(':')[0]);
  const timePeriod = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');

  const wording = inv.type === 'respondent' 
    ? `You are hereby invited to appear at the office of the Punong Barangay of ${cfg.brgy}, ${cfg.muni} on <b>${formattedAppDate}</b> at <b>${fmtTime(inv.appTime)}</b> o'clock in the ${timePeriod} for the clarification/dialogue and to give your side regarding the complaint filed by <b>${inv.parties.toUpperCase()}</b> of ${cfg.brgy}, ${cfg.muni}. RE: <b>${inv.subject}</b>.`
    : `You are hereby required to appear at the office of the Punong Barangay of ${cfg.brgy}, ${cfg.muni} on <b>${formattedAppDate}</b> at <b>${fmtTime(inv.appTime)}</b> o'clock in the ${timePeriod} for the clarification/dialogue with <b>${inv.parties.toUpperCase()}</b> of ${cfg.brgy}, ${cfg.muni}. RE: <b>${inv.subject}</b>.`;

  return `
    <div class="kp-wrap" style="padding: 0 10px; font-family: Arial, sans-serif; font-size: 14pt;">
      ${invHeader()}
      <div style="margin-top:20px; font-weight:bold;">${new Date(inv.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      <div style="margin-top:35px; line-height:1.2; font-weight:bold; text-transform:uppercase;">
        ${inv.recipients.split('\n').map(r => `<b>${r.toUpperCase()}</b>`).join('<br>')}<br>
        <span style="font-weight:normal; text-transform:none;">${inv.addr}</span>
      </div>
      <div style="font-weight:bold; margin-top:35px; margin-bottom:20px;">Magandang Gensan!</div>
      <div style="text-align:justify; margin-bottom:25px; line-height:1.6;">${wording}</div>
      <div style="font-weight:bold; margin-bottom:60px;">Please don't fail to come.</div>
      <div style="line-height:1.2;">
        <div style="font-weight:bold; text-transform:uppercase;">${inv.signatory.toUpperCase()}</div>
        <div>${inv.title}</div>
      </div>
    </div>
  `;
}

/**
 * Automatically create or update a case record when an invitation is issued.
 */
async function syncInvitationToCase(inv) {
  // Check if we already created a case for this specific invitation ID
  const invCaseId = 'INV-' + inv.id;
  const existing = cases.find(c => c.id === invCaseId);
  if (existing) return existing;

  // Extract names
  const compName = (inv.type === 'complainant' ? inv.recipients : inv.parties) || '';
  const respName = (inv.type === 'respondent' ? inv.recipients : inv.parties) || '';

  const cParts = compName.split('\n')[0].trim().split(/\s+/);
  const rParts = respName.split('\n')[0].trim().split(/\s+/);

  const newCase = {
    id: invCaseId,
    caseNo: genCaseNo(),
    dateFiled: inv.date,
    nature: inv.subject,
    status: 'Pending',
    pangkat: '',
    docket: '',
    desc: 'Recorded via Invitation module.',
    relief: '',
    comp: {
      last: cParts[cParts.length - 1] || '',
      first: cParts[0] || '',
      mid: cParts.length > 2 ? cParts[1] : '',
      age: '', addr: inv.type === 'complainant' ? inv.addr : '', tel: '', civil: ''
    },
    resp: {
      last: rParts[rParts.length - 1] || '',
      first: rParts[0] || '',
      mid: rParts.length > 2 ? rParts[1] : '',
      age: '', addr: inv.type === 'respondent' ? inv.addr : '', tel: '', civil: ''
    },
    hdate: inv.appDate,
    htime: inv.appTime,
    hvenue: 'Barangay Hall'
  };

  cases.push(newCase);
  await apiPost('save_case', newCase);
  
  // REMOVED: Auto-create hearing record - User wants to select manually
  /*
  const h = {
    id: 'H-' + inv.id,
    caseId: newCase.id,
    caseNo: newCase.caseNo,
    date: inv.appDate,
    time: inv.appTime,
    venue: 'Barangay Hall',
    type: 'First Hearing',
    mediator: inv.signatory,
    notes: 'Auto-created from Invitation.'
  };
  hearings.push(h);
  await apiPost('save_hearing', h);
  */
  
  persist();
  if (typeof renderCases === 'function') renderCases();
  // if (typeof renderHearings === 'function') renderHearings();
  
  return newCase;
}

function renderInvitations() {
  const tb = document.getElementById('inv-tbody');
  if (!tb) return;
  tb.innerHTML = (typeof invitations !== 'undefined' && invitations.length) ? invitations.map(inv => `
    <tr>
      <td>${shortDate(inv.date)}</td>
      <td>${inv.recipients.split('\n')[0]}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="loadInvitation('${inv.id}')">📂 Load</button>
        <button class="btn btn-sm btn-danger" onclick="delInvitation('${inv.id}')">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="3">No records.</td></tr>';
}

/**
 * Delete an invitation record.
 */
async function delInvitation(id) {
  if (!confirm('Delete this invitation record?')) return;

  const res = await apiDelete('delete_invitation', id);
  if (res.error) {
    toast('⚠️ Error deleting from database: ' + res.error, '#b22222');
    return;
  }

  invitations = invitations.filter(x => x.id !== id);
  renderInvitations();
  toast('Deleted.', '#b22222');
}

function loadInvitation(id) {
  const inv = invitations.find(x => x.id === id);
  if (!inv) return;
  document.getElementById('inv-date').value = inv.date;
  document.getElementById('inv-app-date').value = inv.appDate;
  document.getElementById('inv-app-time').value = inv.appTime;
  document.getElementById('inv-parties').value = inv.parties;
  document.getElementById('inv-subject').value = inv.subject;
  document.getElementById('inv-signatory').value = inv.signatory;
  document.getElementById('inv-title').value = inv.title;
  if (inv.type === 'respondent') {
    document.getElementById('inv-resp-recipients').value = inv.recipients;
    document.getElementById('inv-resp-addr').value = inv.addr;
  } else {
    document.getElementById('inv-recipients').value = inv.recipients;
    document.getElementById('inv-addr').value = inv.addr;
  }
}

document.addEventListener('DOMContentLoaded', () => { renderInvitations(); initInvitationForm(); });