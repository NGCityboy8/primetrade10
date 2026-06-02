(function () {
  const BOTS = [
    {
      id: 'weekly',
      name: 'Weekly Trading Bot',
      tier: 'Starter',
      price: 5000,
      durationDays: 7,
      durationLabel: '7 days',
      roi: '8–12%',
      risk: 'Low',
      strategy: 'Scalping & momentum on major forex pairs with tight stop-losses.',
    },
    {
      id: 'monthly',
      name: 'Monthly Trading Bot',
      tier: 'Popular',
      price: 50000,
      durationDays: 30,
      durationLabel: '30 days',
      roi: '15–22%',
      risk: 'Medium',
      strategy: 'Multi-asset swing trading with AI risk caps and daily rebalancing.',
      featured: true,
    },
    {
      id: 'annual',
      name: 'Annual Trading Bot',
      tier: 'Elite',
      price: 100000,
      durationDays: 365,
      durationLabel: '12 months',
      roi: '35–50%',
      risk: 'Medium–High',
      strategy: 'Long-horizon portfolio hedging across indices, metals, and crypto.',
    },
  ];

  let userBalance = 0;
  let activeBotIds = new Set();

  function fmtMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      n || 0
    );
  }

  function riskClass(risk) {
    if (risk.toLowerCase().includes('low')) return 'ai-risk-low';
    if (risk.toLowerCase().includes('high')) return 'ai-risk-high';
    return 'ai-risk-medium';
  }

  function cardHtml(bot) {
    const canAfford = userBalance >= bot.price;
    const alreadyActive = activeBotIds.has(bot.id);
    const disabled = !canAfford || alreadyActive;
    const featured = bot.featured ? ' ai-bot-card-featured' : '';
    let btnLabel = 'Purchase';
    let btnHint = '';
    if (alreadyActive) {
      btnLabel = 'Active';
      btnHint = 'You already own this bot tier';
    } else if (!canAfford) {
      btnLabel = 'Insufficient balance';
      btnHint = `Requires ${fmtMoney(bot.price)}`;
    }

    return `<article class="ai-bot-card${featured}" data-bot-id="${bot.id}">
      ${bot.featured ? '<span class="ai-bot-ribbon">Most popular</span>' : ''}
      <span class="ai-bot-tier">${bot.tier}</span>
      <h4 class="ai-bot-name">${bot.name}</h4>
      <p class="ai-bot-price">${fmtMoney(bot.price)}</p>
      <p class="ai-bot-duration"><i class="bi bi-clock" aria-hidden="true"></i> ${bot.durationLabel} trade duration</p>
      <ul class="ai-bot-meta">
        <li><span class="ai-meta-label">Expected ROI</span><span class="ai-meta-val ai-meta-roi">${bot.roi}</span></li>
        <li><span class="ai-meta-label">Risk</span><span class="ai-meta-val ${riskClass(bot.risk)}">${bot.risk}</span></li>
        <li><span class="ai-meta-label">Markets</span><span class="ai-meta-val">Forex · Crypto · Indices</span></li>
      </ul>
      <p class="ai-bot-strategy">${bot.strategy}</p>
      <button type="button" class="btn btn-gradient w-100 ai-purchase-btn" data-bot-id="${bot.id}" ${disabled ? 'disabled' : ''}>
        <i class="bi bi-currency-dollar" aria-hidden="true"></i> ${btnLabel}
      </button>
      ${btnHint ? `<p class="ai-bot-btn-hint">${btnHint}</p>` : ''}
      <div class="ai-card-alert alert-ptc d-none" role="status"></div>
    </article>`;
  }

  function activeRowHtml(bot) {
    const started = new Date(bot.started_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `<div class="ai-active-row">
      <div>
        <span class="ai-active-name">${bot.bot_name}</span>
        <span class="ai-active-meta">${fmtMoney(bot.amount)} · Started ${started}</span>
      </div>
      <span class="badge badge-pending text-capitalize">${bot.status}</span>
    </div>`;
  }

  function showCardAlert(card, message, type) {
    const el = card.querySelector('.ai-card-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `ai-card-alert alert-ptc alert-ptc-${type}`;
    el.textContent = message;
  }

  function updateFundBanner() {
    const banner = document.getElementById('ai-fund-banner');
    const msg = document.getElementById('ai-fund-banner-msg');
    if (!banner || !msg) return;
    const minPrice = Math.min(...BOTS.map((b) => b.price));
    if (userBalance < minPrice) {
      banner.classList.remove('d-none');
      msg.textContent = `Your balance (${fmtMoney(userBalance)}) is below the minimum bot price (${fmtMoney(minPrice)}). Fund your account to purchase.`;
    } else {
      banner.classList.add('d-none');
    }
  }

  async function purchase(card, bot) {
    const btn = card.querySelector('.ai-purchase-btn');
    if (btn) btn.disabled = true;

    try {
      const profile = await window.PrimeTradePortal?.getProfile();
      if (profile?.kyc_status !== 'approved') {
        const ok = confirm('KYC approval is recommended before activating AI bots. Continue anyway?');
        if (!ok) return;
      }

      const session = await window.PrimeTradeAuth?.getSession();
      if (!session || !window.PrimeTradeAuthStore) throw new Error('Not signed in');

      const okPurchase = confirm(
        `Purchase ${bot.name} for ${fmtMoney(bot.price)}?\n\nDuration: ${bot.durationLabel}\nExpected ROI: ${bot.roi}\n\nFunds will be reserved pending approval.`
      );
      if (!okPurchase) return;

      window.PrimeTradeAuthStore.purchaseAiBot(session.user.id, {
        botId: bot.id,
        botName: bot.name,
        amount: bot.price,
        durationDays: bot.durationDays,
      });

      showCardAlert(card, 'Bot purchased successfully. Activation is pending approval.', 'success');
      activeBotIds.add(bot.id);
      await refreshPage();
    } catch (err) {
      showCardAlert(card, err.message || 'Purchase failed', 'danger');
    } finally {
      if (btn && !activeBotIds.has(bot.id)) btn.disabled = userBalance < bot.price;
    }
  }

  function bindCards() {
    document.querySelectorAll('.ai-purchase-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bot = BOTS.find((b) => b.id === btn.dataset.botId);
        const card = btn.closest('.ai-bot-card');
        if (bot && card) purchase(card, bot);
      });
    });
  }

  function renderActiveBots(investments) {
    const section = document.getElementById('ai-active-section');
    const list = document.getElementById('ai-active-list');
    if (!section || !list) return;

    const active = (investments || []).filter((b) => b.status !== 'cancelled');
    if (!active.length) {
      section.classList.add('d-none');
      return;
    }

    section.classList.remove('d-none');
    list.innerHTML = active.map(activeRowHtml).join('');
  }

  function renderGrid() {
    const grid = document.getElementById('ai-bots-grid');
    if (!grid) return;
    grid.innerHTML = BOTS.map(cardHtml).join('');
    bindCards();
  }

  async function refreshPage() {
    const profile = await window.PrimeTradePortal?.getProfile();
    userBalance = profile?.balance ?? 0;

    const bal = document.getElementById('ai-available-balance');
    if (bal && profile) {
      bal.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    const session = await window.PrimeTradeAuth?.getSession();
    let investments = [];
    if (session && window.PrimeTradeAuthStore) {
      investments = window.PrimeTradeAuthStore.getAiBotInvestments(session.user.id);
    }
    activeBotIds = new Set(
      investments.filter((b) => b.status === 'pending' || b.status === 'active').map((b) => b.bot_id)
    );

    updateFundBanner();
    renderGrid();
    renderActiveBots(investments);
    await window.PrimeTradePortalShell?.populateShell();
  }

  async function initAiBotsPage() {
    await window.PrimeTradePortalShell?.populateShell();
    await refreshPage();
  }

  window.PrimeTradeAiBots = { initAiBotsPage };

  if (document.body.dataset.portalPage === 'ai-bots') {
    document.addEventListener('portal-layout-ready', () => initAiBotsPage(), { once: true });
  }
})();
