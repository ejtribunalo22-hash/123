/**
 * js/invitations.js
 * ──────────────────────────────────────────────────────
 * Barangay Invitations — create, save, and print.
 * ──────────────────────────────────────────────────────
 */

/**
 * Returns a specialized header for invitations that matches the photo template.
 */
function invHeader() {
  return `
    <table style="width:100%; border-collapse:collapse; margin-bottom:40px;">
      <tr>
        <td style="width:15%; text-align:left; vertical-align:middle;">
          <img src="assets/logo.png" style="width:85px; height:85px; background-color:white; display:block;">
        </td>
        <td style="width:70%; text-align:center; vertical-align:middle; line-height:1.2;">
          <div style="font-size:11pt; margin-bottom:2px;">Republic of the Philippines</div>
          <div style="font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">${cfg.brgy.toUpperCase()}</div>
          <div style="font-size:11pt;">${cfg.muni}</div>
        </td>
        <td style="width:15%; text-align:right; vertical-align:middle;">
          <img src="assets/magandang-gensan-logo.png" style="width:110px; background-color:white; display:block; margin-left:auto;">
        </td>
      </tr>
    </table>
  `;
}

/**
 * Initialize the invitation form with current date.
 */
function initInvitationForm() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = today;
  document.getElementById('inv-app-date').value = today;
  
  if (cfg.admin_user) {
    document.getElementById('inv-signatory').value = cfg.admin_user.toUpperCase();
  }
}

/**
 * Clear the invitation form fields.
 */
function clearInvitationForm() {
  const fields = [
    'inv-recipients', 'inv-addr', 
    'inv-resp-recipients', 'inv-resp-addr',
    'inv-app-time', 'inv-parties', 'inv-subject'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  initInvitationForm();
}

/**
 * Validate and print the invitation.
 * @param {string} type - 'complainant' or 'respondent'
 */
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
    toast('⚠️ Please fill in all required fields.', '#b22222');
    return;
  }

  const invData = {
    id: Date.now().toString(),
    type,
    date,
    recipients,
    addr,
    appDate,
    appTime,
    parties,
    subject,
    signatory,
    title
  };

  // Save to DB
  await apiPost('save_invitation', invData);

  const wording = type === 'respondent' 
    ? `You are hereby invited to appear at the office of the Punong Barangay of ${cfg.brgy}, ${cfg.muni} on <b>${new Date(appDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b> at <b>${fmtTime(appTime)}</b> o'clock in the morning for the clarification/dialogue and to give your side regarding the complaint filed by <b>${parties.toUpperCase()}</b> of Barangay Dadiangas, West, General Santos City. RE: <b>${subject}</b>.`
    : `You are hereby required to appear at the office of the Punong Barangay of ${cfg.brgy}, ${cfg.muni} on <b>${new Date(appDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b> at <b>${fmtTime(appTime)}</b> o'clock in the morning for the clarification/dialogue with <b>${parties.toUpperCase()}</b> of Barangay Dadiangas, West, General Santos City. RE: <b>${subject}</b>.`;

  const formattedRecipients = recipients.split('\n').map(r => `<b>${r.toUpperCase()}</b>`).join('<br>');
  const formattedIssueDate = new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const html = `
    <div class="kp-wrap" style="padding: 0 10px; font-family: Arial, sans-serif; font-size: 14pt;">
      ${invHeader()}
      <div style="margin-top:20px; font-weight:bold;">${formattedIssueDate}</div>
      <div style="margin-top:35px; line-height:1.2; font-weight:bold; text-transform:uppercase;">
        ${formattedRecipients}<br>
        <span style="font-weight:normal; text-transform:none;">${addr}</span>
      </div>
      <div style="font-weight:bold; margin-top:35px; margin-bottom:20px;">Magandang Gensan!</div>
      <div style="text-align:justify; margin-bottom:25px; line-height:1.6;">${wording}</div>
      <div style="font-weight:bold; margin-bottom:60px;">Please don't fail to come.</div>
      <div style="line-height:1.2;">
        <div style="font-weight:bold; text-transform:uppercase;">${signatory.toUpperCase()}</div>
        <div>${title}</div>
      </div>
    </div>
  `;

  kpShow(html, (type === 'respondent' ? 'Respondent-' : 'Complainant-') + 'Invitation-' + invData.id);
}

function renderInvitations() {
  const tb = document.getElementById('inv-tbody');
  if (!invitations.length) {
    tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:20px;">No recent invitations.</td></tr>';
    return;
  }
  tb.innerHTML = invitations.map(inv => `
    <tr>
      <td>${shortDate(inv.date)}</td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${inv.recipients.split('\n')[0]}
      </td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="loadInvitation('${inv.id}')">📂 Load</button>
      </td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderInvitations();
  initInvitationForm();
});