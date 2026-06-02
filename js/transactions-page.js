(function () {
  const EMPTY_COPY = {
    deposits: {
      title: 'No deposits found',
      hint: 'Your deposit history will appear here',
    },
    withdrawals: {
      title: 'No withdrawals found',
      hint: 'Your withdrawal history will appear here',
    },
    others: {
      title: 'No other activity found',
      hint: 'Additional transaction records will appear here',
    },
  };

  let allTransactions = [];
  let activeTab = 'deposits';

  function statusBadge(status) {
    const map = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
  }

  function filterForTab(tab) {
    if (tab === 'deposits') return allTransactions.filter((t) => t.type === 'deposit');
    if (tab === 'withdrawals') return allTransactions.filter((t) => t.type === 'withdrawal');
    return allTransactions.filter((t) => t.type !== 'deposit' && t.type !== 'withdrawal');
  }

  function formatPaymentMode(t) {
    return t.payment_method || t.reference_note || '—';
  }

  function renderRows(rows) {
    const container = document.getElementById('tx-table-rows');
    const empty = document.getElementById('tx-empty');
    const head = document.querySelector('.tx-table-head');
    if (!container || !empty) return;

    const fmt = window.PrimeTradePortal?.formatMoney || ((n) => `$${n}`);

    if (!rows.length) {
      container.innerHTML = '';
      empty.classList.remove('d-none');
      if (head) head.classList.add('d-none');
      const copy = EMPTY_COPY[activeTab] || EMPTY_COPY.deposits;
      document.getElementById('tx-empty-title').textContent = copy.title;
      document.getElementById('tx-empty-hint').textContent = copy.hint;
      return;
    }

    empty.classList.add('d-none');
    if (head) head.classList.remove('d-none');
    container.innerHTML = rows
      .map(
        (t) =>
          `<div class="tx-row">
            <span class="tx-cell tx-cell-amount">${fmt(t.amount)}</span>
            <span class="tx-cell tx-cell-mode">${formatPaymentMode(t)}</span>
            <span class="tx-cell tx-cell-status">${statusBadge(t.status)}</span>
            <span class="tx-cell tx-cell-date">${new Date(t.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}</span>
          </div>`
      )
      .join('');
  }

  function setActiveTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tx-tab').forEach((btn) => {
      const on = btn.dataset.txTab === tab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderRows(filterForTab(tab));
  }

  async function fetchTransactions() {
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) return [];
    if (window.PrimeTradeAuth?.useLocalAuth && window.PrimeTradeAuthStore) {
      return window.PrimeTradeAuthStore.getTransactions(session.user.id).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }
    const sb = window.getSupabase?.();
    if (!sb) return [];
    const res = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    return res.data || [];
  }

  async function initTransactionsPage() {
    await window.PrimeTradePortalShell?.populateShell();
    const profile = await window.PrimeTradePortal?.getProfile();
    if (profile) {
      const el = document.getElementById('tx-current-balance');
      if (el) el.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    allTransactions = await fetchTransactions();

    document.querySelectorAll('.tx-tab').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.txTab));
    });

    setActiveTab('deposits');
  }

  window.PrimeTradeTransactions = { initTransactionsPage, setActiveTab };

  if (document.body.dataset.portalPage === 'transactions') {
    document.addEventListener('portal-layout-ready', () => initTransactionsPage(), { once: true });
  }
})();
