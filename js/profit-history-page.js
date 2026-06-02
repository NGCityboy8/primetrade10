(function () {
  let allRoi = [];

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatType(type) {
    if (!type) return 'ROI';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function updateSummary(rows) {
    const fmt = window.PrimeTradePortal?.formatMoney || ((n) => `$${n}`);
    const total = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const last = rows[0];

    const totalEl = document.getElementById('roi-total-returns');
    const lastEl = document.getElementById('roi-last-return');
    const lastHint = document.getElementById('roi-last-hint');
    const countEl = document.getElementById('roi-tx-count');

    if (totalEl) totalEl.textContent = fmt(total);
    if (lastEl) lastEl.textContent = last ? fmt(last.amount) : fmt(0);
    if (countEl) countEl.textContent = String(rows.length);
    if (lastHint) {
      lastHint.textContent = last ? formatDate(last.created_at) : 'No returns yet';
    }
  }

  function renderRows(rows) {
    const container = document.getElementById('roi-table-rows');
    const empty = document.getElementById('roi-empty');
    const head = document.querySelector('.roi-table-head');
    if (!container || !empty) return;

    const fmt = window.PrimeTradePortal?.formatMoney || ((n) => `$${n}`);

    if (!rows.length) {
      container.innerHTML = '';
      empty.classList.remove('d-none');
      if (head) head.classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');
    if (head) head.classList.remove('d-none');
    container.innerHTML = rows
      .map(
        (r) =>
          `<div class="roi-row">
            <span class="roi-cell roi-cell-plan">${r.plan_name || r.investment_plan || '—'}</span>
            <span class="roi-cell roi-cell-amount">${fmt(r.amount)}</span>
            <span class="roi-cell roi-cell-type">${formatType(r.type)}</span>
            <span class="roi-cell roi-cell-date">${formatDate(r.created_at)}</span>
          </div>`
      )
      .join('');
  }

  async function fetchRoiHistory() {
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) return [];

    if (window.PrimeTradeAuth?.useLocalAuth && window.PrimeTradeAuthStore) {
      return window.PrimeTradeAuthStore.getRoiHistory(session.user.id).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    const sb = window.getSupabase?.();
    if (!sb) return [];
    const res = await sb
      .from('roi_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (res.error) return [];
    return res.data || [];
  }

  async function initProfitHistoryPage() {
    await window.PrimeTradePortalShell?.populateShell();
    allRoi = await fetchRoiHistory();
    updateSummary(allRoi);
    renderRows(allRoi);
  }

  window.PrimeTradeProfitHistory = { initProfitHistoryPage };

  if (document.body.dataset.portalPage === 'profit-history') {
    document.addEventListener('portal-layout-ready', () => initProfitHistoryPage(), { once: true });
  }
})();
