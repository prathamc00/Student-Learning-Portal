/**
 * assignments.js — Assignment Submission System
 * Handles drag-and-drop file upload, submission simulation, toasts, and status updates.
 */

const AssignmentSystem = (() => {

    let selectedFile = null;
    let activeAssignmentId = null;

    // ── Open Submit Modal ────────────────────────────────────────────────────────
    function openSubmit(assignmentId, assignmentTitle) {
        activeAssignmentId = assignmentId;
        selectedFile = null;

        // Reset modal content
        document.getElementById('submitModalTitle').textContent = `📤 Submit: ${assignmentTitle}`;
        document.getElementById('submitNotes').value = '';
        document.getElementById('charCountVal').textContent = '0';
        resetDropZone();

        const modal = new bootstrap.Modal(document.getElementById('submitModal'));
        modal.show();
    }

    // ── Drag & Drop ──────────────────────────────────────────────────────────────
    function initDropZone() {
        const zone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
        zone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files[0]) handleFile(fileInput.files[0]);
        });

        // Character counter on textarea
        document.getElementById('submitNotes').addEventListener('input', function () {
            document.getElementById('charCountVal').textContent = this.value.length;
        });
    }

    function handleFile(file) {
        const MAX_MB = 20;
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/x-zip-compressed',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|zip|txt)$/i)) {
            showToast('❌ Invalid file type. Please upload PDF, DOCX, ZIP, or TXT.', 'danger');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            showToast(`❌ File too large. Max size is ${MAX_MB} MB.`, 'danger');
            return;
        }

        selectedFile = file;
        const sizeFmt = file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            : (file.size / 1024).toFixed(1) + ' KB';

        const zone = document.getElementById('dropZone');
        zone.innerHTML = `
      <div class="file-preview">
        <span class="file-icon">${getFileIcon(file.name)}</span>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${sizeFmt}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger ms-auto" onclick="AssignmentSystem.clearFile(event)">✕ Remove</button>
      </div>`;
    }

    function getFileIcon(name) {
        if (/\.pdf$/i.test(name)) return '📄';
        if (/\.(doc|docx)$/i.test(name)) return '📝';
        if (/\.zip$/i.test(name)) return '🗜️';
        return '📎';
    }

    function clearFile(e) {
        e.stopPropagation();
        selectedFile = null;
        document.getElementById('fileInput').value = '';
        resetDropZone();
    }

    function resetDropZone() {
        const zone = document.getElementById('dropZone');
        zone.innerHTML = `
      <div class="drop-placeholder">
        <div style="font-size:38px;">📎</div>
        <div class="fw-semibold mt-2">Drag &amp; Drop your file here</div>
        <div class="small text-muted">or click to browse &middot; PDF, DOCX, ZIP accepted &middot; Max 20 MB</div>
      </div>`;
        document.getElementById('fileInput').value = '';
    }

    // ── Submit ───────────────────────────────────────────────────────────────────
    function submitAssignment() {
        if (!selectedFile) {
            showToast('⚠️ Please attach a file before submitting.', 'warning');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Uploading...`;

        setTimeout(() => {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('submitModal')).hide();

            // Update card status in DOM
            if (activeAssignmentId) {
                const card = document.getElementById(activeAssignmentId);
                if (card) {
                    const badge = card.querySelector('.status-badge');
                    const actionBtn = card.querySelector('.submit-action-btn');
                    if (badge) {
                        badge.className = 'badge bg-success status-badge me-2';
                        badge.textContent = 'Submitted';
                    }
                    if (actionBtn) {
                        actionBtn.className = 'btn btn-outline-secondary btn-sm';
                        actionBtn.textContent = 'View Feedback';
                        actionBtn.onclick = null;
                    }
                    // Add submitted date
                    const dateLine = card.querySelector('.due-tag');
                    if (dateLine) {
                        dateLine.innerHTML = `📅 Submitted: Today · Grade: <strong class="text-muted">Pending</strong>`;
                        dateLine.className = 'due-tag small mt-1';
                    }
                }
            }

            btn.disabled = false;
            btn.innerHTML = 'Submit Assignment';
            showToast('✅ Assignment submitted successfully!', 'success');
        }, 1800);
    }

    // ── Toast Utility ────────────────────────────────────────────────────────────
    function showToast(msg, type = 'primary') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        const t = document.createElement('div');
        const colors = { success: '#22c55e', danger: '#ef4444', warning: '#f59e0b', primary: '#4f46e5' };
        t.style.cssText = `background:${colors[type] || colors.primary};color:white;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;box-shadow:0 4px 15px rgba(0,0,0,0.2);animation:slideIn 0.3s ease;`;
        t.textContent = msg;
        container.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    return { openSubmit, initDropZone, clearFile, submitAssignment };
})();

document.addEventListener('DOMContentLoaded', () => AssignmentSystem.initDropZone());
