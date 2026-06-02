(function () {
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  const DOC_LABELS = {
    passport: 'Passport',
    id_card: 'National ID Card',
    proof_of_address: 'Proof of Address',
    selfie: 'Selfie with ID',
  };

  const IDENTITY_TYPES = new Set(['passport', 'id_card', 'selfie']);

  function docLabel(type) {
    return DOC_LABELS[type] || type.replace(/_/g, ' ');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function statusBadge(status) {
    const map = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
    return `<span class="badge ${map[status] || 'bg-secondary'}">${label}</span>`;
  }

  function showAlert(message, type) {
    const el = document.getElementById('kyc-form-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  function hideAlert() {
    document.getElementById('kyc-form-alert')?.classList.add('d-none');
  }

  function hasIdentityDoc(documents) {
    return documents.some(
      (d) => IDENTITY_TYPES.has(d.document_type) && d.review_status !== 'rejected'
    );
  }

  function hasAddressDoc(documents) {
    return documents.some(
      (d) => d.document_type === 'proof_of_address' && d.review_status !== 'rejected'
    );
  }

  function setReqStatus(id, done) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = done ? 'Submitted' : 'Required';
    el.className = `kyc-req-status ${done ? 'kyc-req-done' : 'kyc-req-pending'}`;
  }

  function updateRequirements(documents) {
    setReqStatus('kyc-req-identity', hasIdentityDoc(documents));
    setReqStatus('kyc-req-address', hasAddressDoc(documents));
  }

  function updateSteps(kycStatus, documents) {
    const steps = document.querySelectorAll('.kyc-step');
    const hasUploads = documents.length > 0;
    let activeStep = 'upload';
    if (kycStatus === 'approved') activeStep = 'approved';
    else if (kycStatus === 'pending' && hasUploads) activeStep = 'review';
    else if (kycStatus === 'rejected') activeStep = 'upload';

    steps.forEach((step) => {
      const key = step.dataset.kycStep;
      step.classList.remove('kyc-step-active', 'kyc-step-done');
      if (key === activeStep) step.classList.add('kyc-step-active');
      if (kycStatus === 'approved') {
        if (key === 'upload' || key === 'review') step.classList.add('kyc-step-done');
        if (key === 'approved') step.classList.add('kyc-step-active', 'kyc-step-done');
      } else if (key === 'upload' && hasUploads) {
        step.classList.add('kyc-step-done');
      }
    });
  }

  function updateStatusBanner(kycStatus) {
    const banner = document.getElementById('kyc-status-banner');
    if (!banner) return;

    banner.classList.remove('d-none', 'pending', 'approved', 'rejected');
    banner.classList.add(kycStatus || 'pending');

    if (kycStatus === 'approved') {
      banner.innerHTML =
        '<strong><i class="bi bi-patch-check-fill"></i> Verified</strong> Your account is fully verified. You have access to all features.';
    } else if (kycStatus === 'rejected') {
      banner.innerHTML =
        '<strong><i class="bi bi-exclamation-triangle-fill"></i> Verification declined</strong> One or more documents were rejected. Please upload new, clear copies below.';
    } else if (kycStatus === 'pending') {
      banner.innerHTML =
        '<strong><i class="bi bi-hourglass-split"></i> Under review</strong> We are reviewing your documents. This usually takes 24–48 business hours.';
    } else {
      banner.innerHTML =
        '<strong><i class="bi bi-info-circle-fill"></i> Verification required</strong> Complete KYC to deposit, withdraw, and invest on the platform.';
      banner.classList.add('pending');
    }
  }

  function toggleUploadSection(kycStatus, documents) {
    const uploadCard = document.getElementById('kyc-upload-card');
    const approvedCard = document.getElementById('kyc-approved-card');
    const submitBtn = document.getElementById('kyc-submit-btn');
    const docs = documents || [];

    if (kycStatus === 'approved') {
      uploadCard?.classList.add('d-none');
      approvedCard?.classList.remove('d-none');
      return;
    }

    uploadCard?.classList.remove('d-none');
    approvedCard?.classList.add('d-none');
    if (submitBtn) {
      const underReview = kycStatus === 'pending' && hasIdentityDoc(docs) && hasAddressDoc(docs);
      submitBtn.disabled = underReview;
      submitBtn.title = underReview ? 'Documents are under review' : '';
    }
  }

  function renderDocuments(documents) {
    const container = document.getElementById('kyc-docs-rows');
    const empty = document.getElementById('kyc-docs-empty');
    const head = document.querySelector('.kyc-table-head');
    if (!container || !empty) return;

    if (!documents.length) {
      container.innerHTML = '';
      empty.classList.remove('d-none');
      if (head) head.classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');
    if (head) head.classList.remove('d-none');
    container.innerHTML = [...documents]
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
      .map(
        (d) =>
          `<div class="kyc-doc-row">
            <span class="kyc-cell kyc-cell-type">${docLabel(d.document_type)}</span>
            <span class="kyc-cell kyc-cell-file" title="${d.file_name || ''}">${d.file_name || '—'}</span>
            <span class="kyc-cell kyc-cell-status">${statusBadge(d.review_status)}</span>
            <span class="kyc-cell kyc-cell-date">${formatDate(d.uploaded_at)}</span>
          </div>`
      )
      .join('');
  }

  function bindFileInput() {
    const input = document.getElementById('kyc-doc-file');
    const placeholder = document.getElementById('kyc-file-placeholder');
    const selected = document.getElementById('kyc-file-selected');
    const fileName = document.getElementById('kyc-file-name');
    const drop = document.getElementById('kyc-file-drop');
    const clearBtn = document.getElementById('kyc-file-clear');

    if (!input || !placeholder || !selected) return;

    function showFile(file) {
      if (!file) {
        placeholder.classList.remove('d-none');
        selected.classList.add('d-none');
        input.value = '';
        return;
      }
      placeholder.classList.add('d-none');
      selected.classList.remove('d-none');
      if (fileName) fileName.textContent = file.name;
    }

    input.addEventListener('change', () => {
      showFile(input.files?.[0] || null);
    });

    clearBtn?.addEventListener('click', () => showFile(null));

    drop?.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('kyc-file-drop-hover');
    });
    drop?.addEventListener('dragleave', () => drop.classList.remove('kyc-file-drop-hover'));
    drop?.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('kyc-file-drop-hover');
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        showFile(file);
      }
    });
  }

  function validateFile(file) {
    if (!file) throw new Error('Please select a file to upload');
    if (file.size > MAX_FILE_BYTES) throw new Error('File must be 10 MB or smaller');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (file.type && !allowed.includes(file.type)) {
      throw new Error('Only JPG, PNG, WEBP, or PDF files are allowed');
    }
  }

  function sanitizeFileName(name) {
    return String(name || 'document')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120);
  }

  async function uploadToSupabaseStorage(userId, file) {
    const sb = window.getSupabase?.();
    if (!sb) throw new Error('Supabase is not configured');
    const safeName = sanitizeFileName(file.name);
    const path = `uploads/${userId}/${Date.now()}_${safeName}`;
    const { error } = await sb.storage.from('kyc-documents').upload(path, file);
    if (error) throw new Error(error.message || 'Unable to upload document to storage');
    return path;
  }

  async function uploadDocument(form) {
    hideAlert();
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) throw new Error('Not signed in');

    const profile = await window.PrimeTradePortal?.getProfile();
    if (profile?.kyc_status === 'approved') {
      throw new Error('Your account is already verified');
    }
    if (profile?.kyc_status === 'pending') {
      const docs = window.PrimeTradeAuthStore?.getKycDocuments?.(session.user.id) || [];
      if (hasIdentityDoc(docs) && hasAddressDoc(docs)) {
        throw new Error('Your documents are under review. Please wait for approval before uploading again.');
      }
    }

    const file = form.document.files[0];
    validateFile(file);

    if (!window.PrimeTradeAuthStore) {
      throw new Error('Storage backend is unavailable');
    }
    const storagePath = await uploadToSupabaseStorage(session.user.id, file);
    window.PrimeTradeAuthStore.addKycDocument(session.user.id, {
      document_type: form.document_type.value,
      file_name: file.name,
      storage_path: storagePath,
    });

    showAlert('Document submitted successfully. Our team will review it within 24–48 hours.', 'success');
    form.reset();
    document.getElementById('kyc-file-placeholder')?.classList.remove('d-none');
    document.getElementById('kyc-file-selected')?.classList.add('d-none');
    await refreshPage();
  }

  async function refreshPage() {
    const session = await window.PrimeTradeAuth?.getSession();
    const profile = await window.PrimeTradePortal?.getProfile();
    const kycStatus = profile?.kyc_status || 'pending';
    let documents = [];
    if (session && window.PrimeTradeAuthStore) {
      documents = window.PrimeTradeAuthStore.getKycDocuments(session.user.id);
    }

    updateStatusBanner(kycStatus);
    updateSteps(kycStatus, documents);
    updateRequirements(documents);
    toggleUploadSection(kycStatus, documents);
    renderDocuments(documents);
    await window.PrimeTradePortalShell?.populateShell();
  }

  async function initKycPage() {
    await window.PrimeTradePortalShell?.populateShell();
    bindFileInput();
    await refreshPage();

    document.getElementById('kyc-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('kyc-submit-btn');
      if (btn) btn.disabled = true;
      try {
        await uploadDocument(e.target);
      } catch (err) {
        showAlert(err.message || 'Upload failed', 'danger');
      } finally {
        if (btn) {
          const profile = await window.PrimeTradePortal?.getProfile();
          btn.disabled = profile?.kyc_status === 'pending';
        }
      }
    });
  }

  window.PrimeTradeKyc = { initKycPage, refreshPage };

  if (document.body.dataset.portalPage === 'kyc') {
    document.addEventListener('portal-layout-ready', () => initKycPage(), { once: true });
  }
})();
