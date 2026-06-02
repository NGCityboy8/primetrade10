(function () {
  let allUsers = [];
  let editingUserId = null;
  let userModal = null;

  function fmt(n) {
    return window.PrimeTradePortal?.formatMoney(n) || `$${Number(n || 0).toFixed(2)}`;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function kycBadge(status) {
    const map = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
  }

  function showPageAlert(message, type) {
    const el = document.getElementById('admin-page-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function getActorId() {
    const session = await window.PrimeTradeAuth?.getSession();
    return session?.user?.id;
  }

  function renderStats(stats) {
    const el = document.getElementById('admin-stats');
    if (!el || !stats) return;
    el.innerHTML = `
      <div class="admin-stat-card">
        <span class="admin-stat-label">Total users</span>
        <span class="admin-stat-value">${stats.total_users}</span>
      </div>
      <div class="admin-stat-card admin-stat-warn">
        <span class="admin-stat-label">Pending transactions</span>
        <span class="admin-stat-value">${stats.pending_transactions}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-label">Pending KYC</span>
        <span class="admin-stat-value">${stats.pending_kyc}</span>
      </div>
      <div class="admin-stat-card admin-stat-accent">
        <span class="admin-stat-label">Total balances</span>
        <span class="admin-stat-value">${fmt(stats.total_balance)}</span>
      </div>`;

    const badge = document.getElementById('admin-pending-badge');
    if (badge) {
      if (stats.pending_transactions > 0) {
        badge.textContent = String(stats.pending_transactions);
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
  }

  function filteredUsers() {
    const q = (document.getElementById('admin-user-search')?.value || '').trim().toLowerCase();
    const kyc = document.getElementById('admin-filter-kyc')?.value || '';
    const role = document.getElementById('admin-filter-role')?.value || '';
    return allUsers.filter((u) => {
      if (kyc && u.kyc_status !== kyc) return false;
      if (role && u.role !== role) return false;
      if (!q) return true;
      const hay = `${u.username} ${u.full_name}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderUsers() {
    const list = document.getElementById('admin-users-list');
    const empty = document.getElementById('admin-users-empty');
    if (!list) return;

    const users = filteredUsers();
    if (!users.length) {
      list.innerHTML = '';
      empty?.classList.remove('d-none');
      return;
    }
    empty?.classList.add('d-none');

    list.innerHTML = users
      .map(
        (u) => `<div class="admin-table-row${u.is_disabled ? ' is-disabled' : ''}">
          <div class="admin-cell-user">
            <strong>@${u.username}</strong>
            <span class="admin-cell-muted">${u.full_name || '—'}</span>
            ${u.is_disabled ? '<span class="badge badge-rejected ms-1">Disabled</span>' : ''}
          </div>
          <span class="admin-cell-balance">${fmt(u.balance)}</span>
          <span>${kycBadge(u.kyc_status)}</span>
          <span class="admin-cell-role">${u.role === 'admin' ? '<span class="badge bg-info text-dark">Admin</span>' : 'User'}</span>
          <span class="admin-cell-date">${fmtDate(u.created_at)}</span>
          <span class="admin-cell-actions">
            <button type="button" class="btn btn-sm btn-outline-light-ptc admin-edit-user" data-user-id="${u.id}">Manage</button>
          </span>
        </div>`
      )
      .join('');
  }

  function renderPending() {
    const list = document.getElementById('admin-pending-list');
    const empty = document.getElementById('admin-pending-empty');
    if (!list || !window.PrimeTradeAuthStore) return;

    const items = window.PrimeTradeAuthStore.listPendingTransactions();
    if (!items.length) {
      list.innerHTML = '';
      empty?.classList.remove('d-none');
      return;
    }
    empty?.classList.add('d-none');

    list.innerHTML = items
      .map((tx) => {
        const isDeposit = tx.type === 'deposit';
        return `<article class="admin-pending-card">
          <div class="admin-pending-main">
            <span class="admin-pending-type ${isDeposit ? 'is-deposit' : 'is-withdrawal'}">
              <i class="bi bi-${isDeposit ? 'box-arrow-in-down' : 'box-arrow-up'}"></i>
              ${tx.type}
            </span>
            <strong class="admin-pending-amount">${fmt(tx.amount)}</strong>
            <span class="admin-pending-user">@${tx.username} · ${tx.full_name}</span>
            <span class="admin-pending-meta">Balance: ${fmt(tx.user_balance)} · ${tx.payment_method || '—'}</span>
            <span class="admin-pending-meta">${fmtDate(tx.created_at)}</span>
            ${tx.reference_note ? `<span class="admin-pending-note">${tx.reference_note}</span>` : ''}
          </div>
          <div class="admin-pending-actions">
            <button type="button" class="btn btn-sm btn-gradient admin-tx-approve" data-user-id="${tx.user_id}" data-tx-id="${tx.id}">Approve</button>
            <button type="button" class="btn btn-sm btn-outline-light-ptc admin-tx-reject" data-user-id="${tx.user_id}" data-tx-id="${tx.id}">Reject</button>
          </div>
        </article>`;
      })
      .join('');
  }

  function userModalHtml(user) {
    return `
      <form id="admin-edit-form" novalidate>
        <div id="admin-edit-alert" class="alert-ptc d-none mb-3" role="status"></div>
        <div class="admin-modal-meta mb-3">
          <span><strong>@${user.username}</strong></span>
          <span>Joined ${fmtDate(user.created_at)}</span>
          <span>${user.pending_tx_count} pending tx</span>
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label-ptc" for="admin-edit-name">Full name</label>
            <input type="text" id="admin-edit-name" class="form-control form-control-ptc" value="${user.full_name || ''}" />
          </div>
          <div class="col-md-6">
            <label class="form-label-ptc" for="admin-edit-phone">Phone</label>
            <input type="text" id="admin-edit-phone" class="form-control form-control-ptc" value="${user.phone || ''}" />
          </div>
          <div class="col-md-6">
            <label class="form-label-ptc" for="admin-edit-country">Country</label>
            <input type="text" id="admin-edit-country" class="form-control form-control-ptc" value="${user.country || ''}" />
          </div>
          <div class="col-md-6">
            <label class="form-label-ptc" for="admin-edit-balance">Balance (USD)</label>
            <input type="number" id="admin-edit-balance" class="form-control form-control-ptc" min="0" step="0.01" value="${user.balance ?? 0}" />
          </div>
          <div class="col-md-4">
            <label class="form-label-ptc" for="admin-edit-kyc">KYC status</label>
            <select id="admin-edit-kyc" class="form-select form-control-ptc">
              <option value="pending"${user.kyc_status === 'pending' ? ' selected' : ''}>Pending</option>
              <option value="approved"${user.kyc_status === 'approved' ? ' selected' : ''}>Approved</option>
              <option value="rejected"${user.kyc_status === 'rejected' ? ' selected' : ''}>Rejected</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label-ptc" for="admin-edit-role">Role</label>
            <select id="admin-edit-role" class="form-select form-control-ptc">
              <option value="user"${user.role === 'user' ? ' selected' : ''}>User</option>
              <option value="admin"${user.role === 'admin' ? ' selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label-ptc" for="admin-edit-referral">Referral earnings</label>
            <input type="number" id="admin-edit-referral" class="form-control form-control-ptc" min="0" step="0.01" value="${user.referral_earnings ?? 0}" />
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="admin-edit-disabled" ${user.is_disabled ? 'checked' : ''} />
              <label class="form-check-label" for="admin-edit-disabled">Account disabled (cannot sign in)</label>
            </div>
          </div>
        </div>
        <hr class="admin-modal-divider" />
        <h3 class="admin-modal-subtitle">Recent transactions</h3>
        <div class="admin-mini-tx-list">
          ${
            user.transactions?.length
              ? user.transactions
                  .slice(0, 8)
                  .map(
                    (t) => `<div class="admin-mini-tx">
                <span>${t.type} · ${fmt(t.amount)}</span>
                ${kycBadge(t.status)}
                <span class="admin-cell-muted">${fmtDate(t.created_at)}</span>
              </div>`
                  )
                  .join('')
              : '<p class="text-muted-ptc small mb-0">No transactions yet.</p>'
          }
        </div>
      </form>`;
  }

  async function openUserModal(userId) {
    const user = window.PrimeTradeAuthStore.getUserForAdmin(userId);
    if (!user) return;
    editingUserId = userId;
    document.getElementById('admin-user-modal-title').textContent = `Manage @${user.username}`;
    document.getElementById('admin-user-modal-body').innerHTML = userModalHtml(user);
    userModal?.show();
  }

  async function saveUser() {
    if (!editingUserId || !window.PrimeTradeAuthStore) return;
    const actorId = await getActorId();
    if (!actorId) return;

    const btn = document.getElementById('admin-save-user-btn');
    if (btn) btn.disabled = true;
    try {
      window.PrimeTradeAuthStore.adminUpdateUser(actorId, editingUserId, {
        full_name: document.getElementById('admin-edit-name')?.value,
        phone: document.getElementById('admin-edit-phone')?.value,
        country: document.getElementById('admin-edit-country')?.value,
        balance: document.getElementById('admin-edit-balance')?.value,
        kyc_status: document.getElementById('admin-edit-kyc')?.value,
        role: document.getElementById('admin-edit-role')?.value,
        referral_earnings: document.getElementById('admin-edit-referral')?.value,
        is_disabled: document.getElementById('admin-edit-disabled')?.checked,
      });
      userModal?.hide();
      showPageAlert('User updated successfully.', 'success');
      await refreshAll();
    } catch (err) {
      const alert = document.getElementById('admin-edit-alert');
      if (alert) {
        alert.classList.remove('d-none');
        alert.className = 'alert-ptc alert-ptc-danger mb-3';
        alert.textContent = err.message || 'Could not save user';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleTxAction(userId, txId, status) {
    const actorId = await getActorId();
    if (!actorId) return;
    const label = status === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${label} this transaction?`)) return;
    try {
      window.PrimeTradeAuthStore.adminSetTransactionStatus(actorId, userId, txId, status);
      showPageAlert(`Transaction ${status}.`, 'success');
      await refreshAll();
    } catch (err) {
      showPageAlert(err.message || 'Action failed', 'danger');
    }
  }

  async function refreshAll() {
    if (!window.PrimeTradeAuthStore) return;
    allUsers = window.PrimeTradeAuthStore.listUsers();
    renderStats(window.PrimeTradeAuthStore.getAdminStats());
    renderUsers();
    renderPending();
  }

  function switchTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach((btn) => {
      const active = btn.dataset.adminTab === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.admin-panel').forEach((panel) => {
      panel.classList.toggle('d-none', !panel.id.endsWith(tabId));
      panel.classList.toggle('active', panel.id.endsWith(tabId));
    });
  }

  function bindEvents() {
    document.querySelectorAll('.admin-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.adminTab));
    });

    document.getElementById('admin-user-search')?.addEventListener('input', renderUsers);
    document.getElementById('admin-filter-kyc')?.addEventListener('change', renderUsers);
    document.getElementById('admin-filter-role')?.addEventListener('change', renderUsers);

    document.getElementById('admin-users-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-edit-user');
      if (!btn) return;
      openUserModal(btn.dataset.userId);
    });

    document.getElementById('admin-pending-list')?.addEventListener('click', (e) => {
      const approve = e.target.closest('.admin-tx-approve');
      const reject = e.target.closest('.admin-tx-reject');
      if (approve) handleTxAction(approve.dataset.userId, approve.dataset.txId, 'approved');
      if (reject) handleTxAction(reject.dataset.userId, reject.dataset.txId, 'rejected');
    });

    document.getElementById('admin-save-user-btn')?.addEventListener('click', saveUser);

    document.getElementById('admin-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const actorId = await getActorId();
      if (!actorId) return;
      const form = e.target;
      const alert = document.getElementById('admin-create-alert');
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        window.PrimeTradeAuthStore.adminCreateUser(actorId, {
          username: form.username.value,
          password: form.password.value,
          full_name: form.full_name.value,
          balance: form.balance.value,
          kyc_status: form.kyc_status.value,
          role: form.role.value,
          account_type: form.account_type.value,
        });
        form.reset();
        form.password.value = 'ChangeMe123';
        form.balance.value = '0';
        if (alert) alert.classList.add('d-none');
        showPageAlert('User created successfully.', 'success');
        switchTab('users');
        await refreshAll();
      } catch (err) {
        if (alert) {
          alert.classList.remove('d-none');
          alert.className = 'alert-ptc alert-ptc-danger mb-3';
          alert.textContent = err.message || 'Could not create user';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    const modalEl = document.getElementById('admin-user-modal');
    if (modalEl && window.bootstrap) {
      userModal = new bootstrap.Modal(modalEl);
    }
  }

  async function initAdminPage() {
    const session = await window.PrimeTradeAuth?.requireAdmin();
    if (!session) return;

    const seed = await window.PrimeTradeAuthStore?.ensureDefaultAdmin();
    if (seed?.created) {
      document.getElementById('admin-seed-banner')?.classList.remove('d-none');
    }

    await window.PrimeTradePortalShell?.populateShell();
    window.PrimeTradeComponents?.showAdminNav?.();

    bindEvents();
    await refreshAll();
  }

  window.PrimeTradeAdmin = { initAdminPage, refreshAll };

  if (document.body.dataset.portalPage === 'admin') {
    document.addEventListener('portal-layout-ready', () => initAdminPage(), { once: true });
  }
})();
