(function () {
  const EMPTY_COPY = {
    all: {
      title: 'No investments yet',
      hint: 'Start growing your portfolio with one of our investment options.',
    },
    plan: {
      title: 'No investment plans',
      hint: 'Subscribe to a plan to start earning structured returns.',
    },
    stock: {
      title: 'No stock holdings',
      hint: 'Purchase stocks from the marketplace to diversify your portfolio.',
    },
    copy: {
      title: 'No copy trades',
      hint: 'Follow expert traders and mirror their strategies automatically.',
    },
    ai_bot: {
      title: 'No AI bots',
      hint: 'Activate an AI trading bot for hands-free automated trading.',
    },
  };

  const TYPE_LABELS = {
    plan: 'Investment Plan',
    stock: 'Stock',
    copy: 'Copy Trading',
    ai_bot: 'AI Bot',
  };

  const TYPE_ICONS = {
    plan: 'bi-bar-chart-line',
    stock: 'bi-graph-up-arrow',
    copy: 'bi-people',
    ai_bot: 'bi-robot',
  };

  let allItems = [];
  let activeTab = 'all';

  function statusBadge(status) {
    const map = {
      pending: 'badge-pending',
      active: 'badge-approved',
      approved: 'badge-approved',
      completed: 'badge-approved',
      rejected: 'badge-rejected',
      cancelled: 'badge-rejected',
      expired: 'badge-rejected',
    };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function collectInvestments(userId) {
    const store = window.PrimeTradeAuthStore;
    if (!store || !userId) return [];

    const items = [];
    const plan = store.getPlanInvestment?.(userId);
    if (plan) {
      items.push({
        id: plan.id,
        type: 'plan',
        name: plan.plan_name || 'Investment Plan',
        subtitle: plan.ends_at ? `Ends ${formatDate(plan.ends_at)}` : '',
        amount: plan.amount || 0,
        status: plan.status,
        date: plan.started_at,
      });
    }

    (store.getStockHoldings?.(userId) || []).forEach((h) => {
      items.push({
        id: h.id,
        type: 'stock',
        name: h.name || h.symbol,
        subtitle: h.symbol,
        amount: h.amount,
        status: h.status || 'pending',
        date: h.purchased_at,
      });
    });

    (store.getCopyInvestments?.(userId) || []).forEach((c) => {
      items.push({
        id: c.id,
        type: 'copy',
        name: c.trader_name,
        subtitle: 'Copy trader',
        amount: c.amount,
        status: c.status || 'pending',
        date: c.started_at,
      });
    });

    (store.getAiBotInvestments?.(userId) || []).forEach((b) => {
      items.push({
        id: b.id,
        type: 'ai_bot',
        name: b.bot_name,
        subtitle: b.duration_days ? `${b.duration_days} day cycle` : '',
        amount: b.amount,
        status: b.status || 'pending',
        date: b.started_at,
      });
    });

    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  function filterForTab(tab) {
    if (tab === 'all') return allItems;
    return allItems.filter((i) => i.type === tab);
  }

  function isActiveStatus(status) {
    return status === 'active' || status === 'approved';
  }

  function updateSummary() {
    const fmt = window.PrimeTradePortal?.formatMoney || ((n) => `$${n}`);
    const total = allItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const active = allItems.filter((i) => isActiveStatus(i.status)).length;
    const pending = allItems.filter((i) => i.status === 'pending').length;

    const totalEl = document.getElementById('inv-total-invested');
    const activeEl = document.getElementById('inv-active-count');
    const pendingEl = document.getElementById('inv-pending-count');

    if (totalEl) totalEl.textContent = fmt(total);
    if (activeEl) activeEl.textContent = String(active);
    if (pendingEl) pendingEl.textContent = String(pending);
  }

  function renderRows(rows) {
    const container = document.getElementById('inv-table-rows');
    const empty = document.getElementById('inv-empty');
    const head = document.querySelector('.inv-table-head');
    if (!container || !empty) return;

    const fmt = window.PrimeTradePortal?.formatMoney || ((n) => `$${n}`);

    if (!rows.length) {
      container.innerHTML = '';
      empty.classList.remove('d-none');
      if (head) head.classList.add('d-none');
      const copy = EMPTY_COPY[activeTab] || EMPTY_COPY.all;
      document.getElementById('inv-empty-title').textContent = copy.title;
      document.getElementById('inv-empty-hint').textContent = copy.hint;
      const actions = document.getElementById('inv-empty-actions');
      if (actions) actions.classList.toggle('d-none', activeTab !== 'all');
      return;
    }

    empty.classList.add('d-none');
    if (head) head.classList.remove('d-none');
    container.innerHTML = rows
      .map((item) => {
        const icon = TYPE_ICONS[item.type] || 'bi-briefcase';
        const typeLabel = TYPE_LABELS[item.type] || item.type;
        const sub = item.subtitle ? `<span class="inv-cell-sub">${item.subtitle}</span>` : '';
        return `<div class="inv-row">
          <span class="inv-cell inv-cell-name">
            <span class="inv-type-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
            <span>
              <span class="inv-name-text">${item.name}</span>
              ${sub}
            </span>
          </span>
          <span class="inv-cell inv-cell-type">${typeLabel}</span>
          <span class="inv-cell inv-cell-amount">${fmt(item.amount)}</span>
          <span class="inv-cell inv-cell-status">${statusBadge(item.status)}</span>
          <span class="inv-cell inv-cell-date">${formatDate(item.date)}</span>
        </div>`;
      })
      .join('');
  }

  function setActiveTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.inv-tab').forEach((btn) => {
      const on = btn.dataset.invTab === tab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderRows(filterForTab(tab));
  }

  async function initInvestmentsPage() {
    await window.PrimeTradePortalShell?.populateShell();

    const profile = await window.PrimeTradePortal?.getProfile();
    const bal = document.getElementById('inv-available-balance');
    if (bal && profile) {
      bal.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    const session = await window.PrimeTradeAuth?.getSession();
    if (session && window.PrimeTradeAuthStore) {
      allItems = collectInvestments(session.user.id);
    } else {
      allItems = [];
    }

    updateSummary();

    document.querySelectorAll('.inv-tab').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.invTab));
    });

    setActiveTab('all');
  }

  window.PrimeTradeInvestments = { initInvestmentsPage, collectInvestments };

  if (document.body.dataset.portalPage === 'investments') {
    document.addEventListener('portal-layout-ready', () => initInvestmentsPage(), { once: true });
  }
})();
