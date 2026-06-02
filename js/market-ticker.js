(function () {
  const REFRESH_MS = 60000;
  const COINS = [
    { id: 'bitcoin', symbol: 'BTC' },
    { id: 'ethereum', symbol: 'ETH' },
    { id: 'tether', symbol: 'USDT' },
    { id: 'solana', symbol: 'SOL' },
    { id: 'ripple', symbol: 'XRP' },
    { id: 'binancecoin', symbol: 'BNB' },
  ];

  function skeletonRows() {
    return COINS.map(
      () =>
        `<div class="ticker-row ticker-skeleton"><span class="sk-line sk-w-30"></span><span class="sk-line sk-w-40"></span></div>`
    ).join('');
  }

  async function loadTicker() {
    const el = document.getElementById('market-ticker');
    if (!el) return;
    if (!el.querySelector('.ticker-row:not(.ticker-skeleton)')) {
      el.innerHTML = skeletonRows();
    }
    try {
      const ids = COINS.map((c) => c.id).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('rate limit');
      const data = await res.json();
      const now = new Date();
      const rows = COINS.map((c) => {
        const p = data[c.id];
        if (!p) return '';
        const ch = p.usd_24h_change || 0;
        const cls = ch >= 0 ? 'positive' : 'negative';
        return `<div class="ticker-row">
          <span><strong>${c.symbol}</strong><span class="text-muted-ptc">/USD</span></span>
          <span class="ticker-price-wrap">$${p.usd.toLocaleString(undefined, { maximumFractionDigits: p.usd < 1 ? 4 : 2 })} <span class="ticker-change ${cls}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span></span>
        </div>`;
      }).join('');
      el.innerHTML =
        rows +
        `<p class="ticker-updated text-muted-ptc small mb-0 mt-2">Updated ${now.toLocaleTimeString()}</p>`;
    } catch {
      el.innerHTML =
        '<p class="text-muted-ptc small mb-0">Market data unavailable. <button type="button" class="btn btn-link btn-sm p-0 align-baseline ticker-retry">Retry</button></p>';
      el.querySelector('.ticker-retry')?.addEventListener('click', loadTicker);
    }
  }

  function start() {
    loadTicker();
    setInterval(loadTicker, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
