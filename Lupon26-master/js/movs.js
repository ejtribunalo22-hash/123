/**
 * MOV (Means of Verification) Management System
 */

const MOV_CHECKLISTS = {
  'report': ['Scanned Copy of Signed Report', 'Proof of Submission', 'Attendance/Photo Evidence'],
  'document': ['Signed Document Copy', 'Supporting Evidence']
};

/**
 * Open the MOV Modal for a specific reference
 * @param {string} refId - The ID of the case, report, or document
 * @param {string} refType - 'case', 'report', or 'document'
 * @param {string} title - The display title
 */
async function openMOVModal(refId, refType, title) {
  const modal = document.getElementById('mov-modal');
  const modalTitle = document.getElementById('mov-modal-title');
  const refIdInput = document.getElementById('mov-ref-id');
  const refTypeInput = document.getElementById('mov-ref-type');

  modalTitle.textContent = `MOVs: ${title}`;
  refIdInput.value = refId;
  refTypeInput.value = refType;

  modal.classList.add('visible');
  renderMOVList(refId, refType);
}

function closeMOVModal() {
  document.getElementById('mov-modal').classList.remove('visible');
  document.getElementById('mov-upload-form').reset();
}

/**
 * Render the list of uploaded MOVs
 */
async function renderMOVList(refId, refType) {
  const container = document.getElementById('mov-list-container');
  const checklistContainer = document.getElementById('mov-checklist');
  const statusBadge = document.getElementById('mov-status-badge');
  
  container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Loading MOVs...</div>';

  const movs = await getMOVs(refId, refType);
  
  if (movs.error) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Error loading MOVs: ${movs.error}</div>`;
    return;
  }

  // Render Checklist
  const required = MOV_CHECKLISTS[refType] || [];
  const uploadedNames = movs.map(m => m.file_name.toLowerCase());
  
  checklistContainer.innerHTML = required.map(item => {
    const isDone = uploadedNames.some(name => name.includes(item.toLowerCase().replace(/\s+/g, '')));
    return `<div class="mov-check-item ${isDone ? 'done' : ''}">
      ${isDone ? '✅' : '⭕'} ${item}
    </div>`;
  }).join('');

  // Update Status Badge
  const doneCount = required.filter(item => uploadedNames.some(name => name.includes(item.toLowerCase().replace(/\s+/g, '')))).length;
  if (required.length === 0) {
    statusBadge.style.display = 'none';
  } else {
    statusBadge.style.display = 'inline-block';
    if (doneCount === required.length) {
      statusBadge.textContent = 'COMPLETE MOVs';
      statusBadge.style.background = '#f0fdf4';
      statusBadge.style.color = '#15803d';
    } else if (doneCount > 0) {
      statusBadge.textContent = 'PENDING VERIFICATION';
      statusBadge.style.background = '#fffbeb';
      statusBadge.style.color = '#b45309';
    } else {
      statusBadge.textContent = 'MISSING MOVs';
      statusBadge.style.background = '#fef2f2';
      statusBadge.style.color = '#b91c1c';
    }
  }

  // Render File List
  if (movs.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No files uploaded yet.</div>';
  } else {
    container.innerHTML = movs.map(m => {
      const ext = m.file_type.toLowerCase();
      let icon = '📄';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) icon = '🖼️';
      if (ext === 'pdf') icon = '📕';
      if (['doc', 'docx'].includes(ext)) icon = '📘';

      return `
        <div class="mov-item">
          <div class="mov-item-info">
            <div class="mov-item-name">${icon} ${m.file_name}</div>
            <div class="mov-item-meta">
              Uploaded by ${m.uploaded_by} on ${new Date(m.upload_date).toLocaleDateString()} • ${(m.file_size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <div class="mov-actions">
            <button class="btn-mov btn-mov-view" onclick="viewMOV('${m.file_path}')">View</button>
            <a href="uploads/movs/${m.file_path}" download="${m.file_name}" class="btn-mov btn-mov-dl" style="text-decoration:none;">Download</a>
            <button class="btn-mov btn-mov-del" onclick="handleDeleteMOV(${m.id}, '${m.ref_id}', '${m.ref_type}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Handle File Upload
 */
async function handleMOVUpload(event) {
  event.preventDefault();
  const form = event.target;
  const fileInput = document.getElementById('mov-file-input');
  const refId = document.getElementById('mov-ref-id').value;
  const refType = document.getElementById('mov-ref-type').value;

  if (!fileInput.files.length) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ref_id', refId);
  formData.append('ref_type', refType);
  formData.append('uploaded_by', cfg.user || 'Supervisor');

  const btn = form.querySelector('button');
  const originalText = btn.textContent;
  btn.textContent = '⌛ Uploading...';
  btn.disabled = true;

  const res = await uploadMOV(formData);
  
  btn.textContent = originalText;
  btn.disabled = false;

  if (res.success) {
    toast('MOV uploaded successfully!', '#15803d');
    form.reset();
    renderMOVList(refId, refType);
  }
}

/**
 * View File (Open in new tab)
 */
function viewMOV(filePath) {
  window.open(`uploads/movs/${filePath}`, '_blank');
}

/**
 * Handle MOV Deletion
 */
async function handleDeleteMOV(id, refId, refType) {
  if (!confirm('Are you sure you want to delete this MOV?')) return;

  const res = await apiDelete('delete_mov', id);
  if (res.success) {
    toast('MOV deleted.', '#1e293b');
    renderMOVList(refId, refType);
  } else {
    alert('Error deleting MOV: ' + res.error);
  }
}