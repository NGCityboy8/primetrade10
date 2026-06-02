(function () {
  const ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'TRX', name: 'TRON' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'MATIC', name: 'Polygon' },
  ];

  const MARKET_COINS = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'tether', name: 'Tether', symbol: 'USDT' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
  ];

  const ACCOUNT_LABELS = {
    personal: 'Personal Trading Account',
    corporate: 'Corporate Trading Account',
    managed: 'Managed Account',
  };

  function sparklineSvg(change) {
    const up = change >= 0;
    const stroke = up ? '#4caf50' : '#f44336';
    const d = up
      ? 'M0,28 L20,22 L40,18 L60,14 L80,10 L100,6'
      : 'M0,6 L20,10 L40,14 L60,18 L80,22 L100,28';
    return `<svg viewBox="0 0 100 32" preserveAspectRatio="none" class="dash-sparkline" aria-hidden="true">
      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  function formatPrice(n) {
    if (n == null) return '—';
    return n >= 1
      ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }

  function sumApproved(transactions, type) {
    return (transactions || [])
      .filter((t) => t.type === type && t.status === 'approved')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }

  function renderAssets() {
    const grid = document.getElementById('dash-assets-grid');
    if (!grid) return;
    grid.innerHTML = ASSETS.map(
      (a) =>
        `<div class="dash-asset-cell">
          <span class="dash-asset-symbol">${a.symbol}</span>
          <span class="dash-asset-bal">0</span>
        </div>`
    ).join('');
  }

  async function loadMarketOverview() {
    const row = document.getElementById('dash-market-row');
    const updated = document.getElementById('dash-market-updated');
    if (!row) return;

    row.innerHTML = MARKET_COINS.map(
      () =>
        `<div class="dash-market-card"><span class="name sk-line">…</span><div class="price sk-line">…</div></div>`
    ).join('');

    try {
      const ids = MARKET_COINS.map((c) => c.id).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('market fetch failed');
      const data = await res.json();
      row.innerHTML = MARKET_COINS.map((c) => {
        const p = data[c.id];
        if (!p) return '';
        const ch = p.usd_24h_change || 0;
        const cls = ch >= 0 ? 'up' : 'down';
        return `<div class="dash-market-card">
          <div class="name">${c.name}</div>
          <div class="price">${formatPrice(p.usd)}</div>
          <div class="change ${cls}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}% (24h)</div>
          ${sparklineSvg(ch)}
        </div>`;
      }).join('');
      if (updated) {
        updated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
      }
    } catch {
      row.innerHTML =
        '<p class="text-muted-ptc small col-12">Market data unavailable. Check your connection.</p>';
    }
  }

  function signalFromChange(avgChange) {
    if (avgChange > 1.5) return { text: 'Signal Strength: Bullish', cls: 'bullish' };
    if (avgChange < -1.5) return { text: 'Signal Strength: Bearish', cls: 'bearish' };
    return { text: 'Signal Strength: Neutral', cls: '' };
  }

  window.PrimeTradeDashboard = {
    renderAssets,
    loadMarketOverview,
    sumApproved,
    ACCOUNT_LABELS,
    signalFromChange,
    sparklineSvg,
  };

  if (document.body.dataset.portalPage === 'dashboard') {
    renderAssets();
    setInterval(loadMarketOverview, 60000);
  }
})();
