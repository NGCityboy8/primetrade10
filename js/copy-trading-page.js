(function () {
  const TRADERS = [
    {
      id: 'marcus-chen',
      name: 'Marcus Chen',
      title: 'Senior Forex Strategist',
      country: 'Singapore',
      experience: 12,
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      bio: 'Former institutional desk trader focused on major FX pairs and gold. Uses momentum and macro filters with strict risk caps per trade.',
      specialties: ['Forex', 'Gold', 'Swing'],
      min: 1000,
      max: 40000,
      duration: 14,
      roi: 75.24,
      drawdown: 3.2,
      winRate: 68,
      copiers: 1240,
      risk: 'Low',
      verified: true,
      featured: false,
    },
    {
      id: 'sarah-mitchell',
      name: 'Sarah Mitchell',
      title: 'Equity & Index Specialist',
      country: 'United Kingdom',
      experience: 9,
      photo: 'https://randomuser.me/api/portraits/women/44.jpg',
      bio: 'Trades US and European indices with a trend-following system. Publishes weekly outlooks and keeps position sizes conservative.',
      specialties: ['Indices', 'US Stocks', 'ETFs'],
      min: 500,
      max: 25000,
      duration: 21,
      roi: 62.18,
      drawdown: 4.1,
      winRate: 61,
      copiers: 890,
      risk: 'Medium',
      verified: true,
      featured: false,
    },
    {
      id: 'james-okonkwo',
      name: 'James Okonkwo',
      title: 'Crypto & Multi-Asset Lead',
      country: 'Nigeria',
      experience: 7,
      photo: 'https://randomuser.me/api/portraits/men/75.jpg',
      bio: 'High-conviction crypto swing trader with layered take-profits. Best suited for investors comfortable with higher volatility.',
      specialties: ['Crypto', 'BTC', 'Altcoins'],
      min: 2000,
      max: 50000,
      duration: 30,
      roi: 88.05,
      drawdown: 2.8,
      winRate: 72,
      copiers: 2105,
      risk: 'Medium',
      verified: true,
      featured: true,
    },
    {
      id: 'elena-vasquez',
      name: 'Elena Vasquez',
      title: 'Commodities Trader',
      country: 'Spain',
      experience: 11,
      photo: 'https://randomuser.me/api/portraits/women/65.jpg',
      bio: 'Specializes in oil, gas, and agricultural futures. Emphasizes capital preservation with tight stop-loss discipline.',
      specialties: ['Commodities', 'Oil', 'Futures'],
      min: 1000,
      max: 35000,
      duration: 14,
      roi: 54.92,
      drawdown: 5.0,
      winRate: 58,
      copiers: 654,
      risk: 'Medium',
      verified: true,
      featured: false,
    },
    {
      id: 'david-kowalski',
      name: 'David Kowalski',
      title: 'Algorithmic Systems Trader',
      country: 'Poland',
      experience: 14,
      photo: 'https://randomuser.me/api/portraits/men/22.jpg',
      bio: 'Runs rule-based strategies across forex and metals with 24/5 monitoring. Drawdown targets are predefined on every signal.',
      specialties: ['Forex', 'Metals', 'Automated'],
      min: 1500,
      max: 45000,
      duration: 21,
      roi: 71.33,
      drawdown: 3.6,
      winRate: 65,
      copiers: 1580,
      risk: 'Low',
      verified: true,
      featured: false,
    },
    {
      id: 'amira-hassan',
      name: 'Amira Hassan',
      title: 'Short-Term Scalper',
      country: 'UAE',
      experience: 6,
      photo: 'https://randomuser.me/api/portraits/women/28.jpg',
      bio: 'Fast intraday setups on liquid pairs with small profit targets. Ideal for shorter copy cycles and smaller starting amounts.',
      specialties: ['Scalping', 'Forex', 'Intraday'],
      min: 500,
      max: 20000,
      duration: 7,
      roi: 48.67,
      drawdown: 4.8,
      winRate: 55,
      copiers: 412,
      risk: 'High',
      verified: true,
      featured: false,
    },
  ];

  function fmtMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      n || 0
    );
  }

  function fmtCopiers(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  function avatarFallbackUrl(trader) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(trader.name)}&size=128&background=1e88e5&color=fff&bold=true`;
  }

  function riskClass(risk) {
    if (risk === 'Low') return 'copy-risk-low';
    if (risk === 'High') return 'copy-risk-high';
    return 'copy-risk-medium';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHtml(trader) {
    const fallback = avatarFallbackUrl(trader);
    const tags = trader.specialties.map((s) => `<span class="copy-tag">${escapeHtml(s)}</span>`).join('');
    const ribbon = trader.featured
      ? '<span class="copy-trader-ribbon">Top performer</span>'
      : '';

    return `<article class="copy-trader-card${trader.featured ? ' copy-trader-featured' : ''}" data-trader-id="${trader.id}">
      ${ribbon}
      <div class="copy-trader-header">
        <img
          class="copy-trader-photo"
          src="${trader.photo}"
          alt="Photo of ${escapeHtml(trader.name)}"
          width="96"
          height="96"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null;this.src='${fallback}'"
        />
        <div class="copy-trader-identity">
          <div class="copy-trader-name-row">
            <h4 class="copy-trader-name">${escapeHtml(trader.name)}</h4>
            ${trader.verified ? '<span class="copy-verified" title="Verified trader"><i class="bi bi-patch-check-fill"></i> Verified</span>' : ''}
          </div>
          <p class="copy-trader-title">${escapeHtml(trader.title)}</p>
          <p class="copy-trader-meta"><i class="bi bi-geo-alt"></i> ${escapeHtml(trader.country)} · ${trader.experience} yrs experience · ${fmtCopiers(trader.copiers)} copiers</p>
        </div>
      </div>

      <p class="copy-trader-bio">${escapeHtml(trader.bio)}</p>

      <div class="copy-tags" aria-label="Trading specialties">${tags}</div>

      <div class="copy-highlight-stats">
        <div class="copy-highlight-stat">
          <span class="copy-highlight-label">Total ROI</span>
          <span class="copy-highlight-val copy-stat-highlight">${trader.roi.toFixed(2)}%</span>
        </div>
        <div class="copy-highlight-stat">
          <span class="copy-highlight-label">Win rate</span>
          <span class="copy-highlight-val">${trader.winRate}%</span>
        </div>
        <div class="copy-highlight-stat">
          <span class="copy-highlight-label">Risk level</span>
          <span class="copy-highlight-val ${riskClass(trader.risk)}">${trader.risk}</span>
        </div>
      </div>

      <div class="copy-stats-grid">
        <div class="copy-stat"><span class="copy-stat-label">Min. copy</span><span class="copy-stat-val">${fmtMoney(trader.min)}</span></div>
        <div class="copy-stat"><span class="copy-stat-label">Max. copy</span><span class="copy-stat-val">${fmtMoney(trader.max)}</span></div>
        <div class="copy-stat"><span class="copy-stat-label">Duration</span><span class="copy-stat-val">${trader.duration} days</span></div>
        <div class="copy-stat"><span class="copy-stat-label">Max drawdown</span><span class="copy-stat-val">${trader.drawdown.toFixed(1)}%</span></div>
        <div class="copy-stat"><span class="copy-stat-label">Active signals</span><span class="copy-stat-val">${trader.copiers}</span></div>
        <div class="copy-stat"><span class="copy-stat-label">Trader ID</span><span class="copy-stat-val copy-stat-mono">${trader.id}</span></div>
      </div>

      <div class="copy-invest-box">
        <p class="copy-invest-who"><i class="bi bi-person-check"></i> You will copy trades from <strong>${escapeHtml(trader.name)}</strong></p>
        <label class="copy-invest-label" for="copy-amt-${trader.id}">Amount to allocate</label>
        <div class="fund-amount-wrap stock-amount-wrap">
          <span class="fund-amount-prefix">$</span>
          <input type="number" id="copy-amt-${trader.id}" class="fund-amount-input copy-amount-input" min="${trader.min}" max="${trader.max}" step="0.01" placeholder="0.00" data-trader-id="${trader.id}" aria-describedby="copy-range-${trader.id}" />
        </div>
        <p class="copy-invest-range" id="copy-range-${trader.id}">${fmtMoney(trader.min)} – ${fmtMoney(trader.max)}</p>
        <button type="button" class="btn btn-gradient w-100 copy-invest-btn" data-trader-id="${trader.id}">
          <i class="bi bi-people-fill"></i> Copy ${escapeHtml(trader.name.split(' ')[0])}
        </button>
      </div>
      <div class="copy-card-alert alert-ptc d-none" role="status"></div>
    </article>`;
  }

  function activeRowHtml(copy) {
    const started = new Date(copy.started_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `<div class="copy-active-row">
      <div class="copy-active-trader">
        <span class="copy-active-name">${escapeHtml(copy.trader_name)}</span>
        <span class="copy-active-meta">ID: ${escapeHtml(copy.trader_id)} · ${fmtMoney(copy.amount)} · Started ${started}</span>
      </div>
      <span class="badge badge-pending text-capitalize">${copy.status}</span>
    </div>`;
  }

  function renderActiveCopies(userId) {
    const section = document.getElementById('copy-active-section');
    const list = document.getElementById('copy-active-list');
    if (!section || !list || !window.PrimeTradeAuthStore) return;

    const copies = (window.PrimeTradeAuthStore.getCopyInvestments?.(userId) || []).filter(
      (c) => c.status !== 'cancelled'
    );
    if (!copies.length) {
      section.classList.add('d-none');
      return;
    }
    section.classList.remove('d-none');
    list.innerHTML = copies.map(activeRowHtml).join('');
  }

  function showCardAlert(card, message, type) {
    const el = card.querySelector('.copy-card-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `copy-card-alert alert-ptc alert-ptc-${type}`;
    el.textContent = message;
  }

  function buildConfirmMessage(trader, amount) {
    return (
      `You are about to copy ${trader.name}\n\n` +
      `${trader.title}\n` +
      `${trader.country} · ${trader.experience} years experience\n\n` +
      `${trader.bio}\n\n` +
      `Specialties: ${trader.specialties.join(', ')}\n` +
      `ROI: ${trader.roi.toFixed(2)}% · Win rate: ${trader.winRate}% · Risk: ${trader.risk}\n` +
      `Copy duration: ${trader.duration} days\n\n` +
      `Amount to allocate: ${fmtMoney(amount)}\n\n` +
      `Your account will mirror this trader's signals. Continue?`
    );
  }

  async function invest(card, trader) {
    const input = card.querySelector('.copy-amount-input');
    const amount = parseFloat(input?.value);
    const btn = card.querySelector('.copy-invest-btn');
    if (btn) btn.disabled = true;

    try {
      const profile = await window.PrimeTradePortal?.getProfile();
      if (profile?.kyc_status !== 'approved') {
        const ok = confirm('KYC approval is recommended before copy trading. Continue anyway?');
        if (!ok) return;
      }

      if (isNaN(amount) || amount <= 0) throw new Error('Enter a valid investment amount');

      const okCopy = confirm(buildConfirmMessage(trader, amount));
      if (!okCopy) return;

      const session = await window.PrimeTradeAuth?.getSession();
      if (!session || !window.PrimeTradeAuthStore) throw new Error('Not signed in');

      window.PrimeTradeAuthStore.purchaseCopyTrade(session.user.id, {
        traderId: trader.id,
        traderName: trader.name,
        amount,
        minInvest: trader.min,
        maxInvest: trader.max,
      });

      showCardAlert(
        card,
        `You are now copying ${trader.name}. Trades will mirror automatically after approval.`,
        'success'
      );
      input.value = '';
      await window.PrimeTradePortalShell?.populateShell();
      const updated = await window.PrimeTradePortal.getProfile();
      const bal = document.getElementById('copy-available-balance');
      if (bal && updated) bal.textContent = window.PrimeTradePortal.formatMoney(updated.balance);
      renderActiveCopies(session.user.id);
    } catch (err) {
      showCardAlert(card, err.message || 'Investment failed', 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindCards() {
    const grid = document.getElementById('copy-traders-grid');
    if (!grid || grid.dataset.bound) return;
    grid.dataset.bound = '1';
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-invest-btn');
      if (!btn) return;
      const trader = TRADERS.find((t) => t.id === btn.dataset.traderId);
      const card = btn.closest('.copy-trader-card');
      if (trader && card) invest(card, trader);
    });
  }

  async function initCopyTradingPage() {
    await window.PrimeTradePortalShell?.populateShell();
    const profile = await window.PrimeTradePortal?.getProfile();
    const bal = document.getElementById('copy-available-balance');
    if (bal && profile) {
      bal.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    const grid = document.getElementById('copy-traders-grid');
    if (grid) {
      grid.innerHTML = TRADERS.map(cardHtml).join('');
      bindCards();
    }

    const session = await window.PrimeTradeAuth?.getSession();
    if (session) renderActiveCopies(session.user.id);
  }

  window.PrimeTradeCopyTrading = { initCopyTradingPage, TRADERS };

  if (document.body.dataset.portalPage === 'copy-trading') {
    document.addEventListener('portal-layout-ready', () => initCopyTradingPage(), { once: true });
  }
})();
