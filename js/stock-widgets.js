(function () {
  const REFRESH_MS = 90000;

  const FEATURED = [
    { symbol: 'NFLX', name: 'Netflix', color: '#141414', logo: 'https://logo.clearbit.com/netflix.com' },
    { symbol: 'SPOT', name: 'Spotify', color: '#1DB954', logo: 'https://logo.clearbit.com/spotify.com' },
    { symbol: 'TSLA', name: 'Tesla', color: '#E82127', logo: 'https://logo.clearbit.com/tesla.com' },
    { symbol: 'META', name: 'Meta', color: '#1877F2', logo: 'https://logo.clearbit.com/meta.com' },
    { symbol: 'AMZN', name: 'Amazon', color: '#FF9900', logo: 'https://logo.clearbit.com/amazon.com' },
    { symbol: 'GOOGL', name: 'Google', color: '#1a1a2e', logo: 'https://logo.clearbit.com/google.com' },
  ];

  const TRENDING = [
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'GME', name: 'GameStop Corp.' },
    { symbol: '^GDAXI', name: 'Germany 40', display: 'DEU40' },
    { symbol: 'NFLX', name: 'Netflix, Inc.' },
    { symbol: 'META', name: 'Meta Platforms, Inc.' },
    { symbol: 'BABA', name: 'Alibaba Group' },
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MCD', name: "McDonald's Corporation" },
  ];

  const LOGO_DOMAINS = {
    NFLX: 'netflix.com',
    SPOT: 'spotify.com',
    TSLA: 'tesla.com',
    META: 'meta.com',
    AMZN: 'amazon.com',
    GOOGL: 'google.com',
    GME: 'gamestop.com',
    BABA: 'alibaba.com',
    AAPL: 'apple.com',
    MCD: 'mcdonalds.com',
  };

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtChange(change, pct) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} ${sign}${pct.toFixed(2)}%`;
  }

  function changeClass(v) {
    if (v > 0) return 'positive';
    if (v < 0) return 'negative';
    return 'neutral';
  }

  async function fetchJson(url) {
    const urls = [
      url,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ];
    let lastErr;
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        const text = await res.text();
        if (!text || text.trim().startsWith('<')) {
          lastErr = new Error('invalid response');
          continue;
        }
        return JSON.parse(text);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('fetch failed');
  }

  function parseYahooQuoteResult(row) {
    if (!row || row.regularMarketPrice == null) return null;
    return {
      symbol: row.symbol,
      name: row.shortName || row.longName || row.symbol,
      price: row.regularMarketPrice,
      change: row.regularMarketChange ?? 0,
      changePct: row.regularMarketChangePercent ?? 0,
    };
  }

  async function fetchAllQuotes(symbols) {
    const unique = [...new Set(symbols)];
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(unique.join(','))}`;

    try {
      const json = await fetchJson(yahooUrl);
      const rows = json?.quoteResponse?.result || [];
      const map = {};
      rows.forEach((row) => {
        const q = parseYahooQuoteResult(row);
        if (q) map[q.symbol] = q;
      });
      if (Object.keys(map).length) return map;
    } catch {
      /* try per-symbol fallback */
    }

    const map = {};
    for (const symbol of unique) {
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const data = await fetchJson(chartUrl);
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prev;
        const changePct = prev ? (change / prev) * 100 : 0;
        map[symbol] = {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          price,
          change,
          changePct,
        };
      } catch {
        /* skip */
      }
    }
    return map;
  }

  function featuredSkeleton() {
    return FEATURED.map(
      () =>
        '<div class="col-6 col-md-4"><div class="stock-feature-card stock-feature-skeleton"><span class="sk-line sk-w-60"></span></div></div>'
    ).join('');
  }

  function trendingSkeleton() {
    return Array.from({ length: TRENDING.length })
      .map(
        () =>
          '<div class="trending-stock-row trending-skeleton"><span class="trending-logo sk-circle"></span><span class="sk-line sk-w-50"></span></div>'
      )
      .join('');
  }

  function renderFeatured(quotes) {
    const grid = document.getElementById('stock-featured-grid');
    if (!grid) return;
    grid.innerHTML = FEATURED.map((stock) => {
      const q = quotes[stock.symbol];
      const chCls = q ? changeClass(q.changePct) : 'neutral';
      const priceHtml = q
        ? `<span class="stock-feature-change ${chCls}">${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%</span>`
        : '';
      const priceVal = q ? `$${fmtPrice(q.price)}` : '—';
      const initial = stock.name.charAt(0);
      return `<div class="col-6 col-md-4">
        <a href="markets/shares.html" class="stock-feature-card" style="--card-bg:${stock.color}" data-symbol="${stock.symbol}">
          <span class="stock-feature-invest">Invest</span>
          <span class="stock-feature-tag">Stocks</span>
          <span class="stock-feature-live" aria-hidden="true"></span>
          <img class="stock-feature-logo" src="${stock.logo}" alt="" width="72" height="72" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.classList.add('is-visible')" />
          <span class="stock-feature-logo-fallback">${initial}</span>
          <div class="stock-feature-footer">
            <h3>${stock.name}</h3>
            <span class="stock-feature-symbol">${stock.symbol}</span>
            <div class="stock-feature-quote"><strong>${priceVal}</strong> ${priceHtml}</div>
          </div>
        </a>
      </div>`;
    }).join('');
  }

  function logoUrl(symbol) {
    const key = symbol.replace('^', '');
    const domain = LOGO_DOMAINS[key];
    return domain ? `https://logo.clearbit.com/${domain}` : '';
  }

  function renderTrending(quotes) {
    const list = document.getElementById('trending-stocks-list');
    if (!list) return;
    list.innerHTML = TRENDING.map((item) => {
      const q = quotes[item.symbol];
      const label = item.display || item.symbol.replace('^', '');
      const chCls = q ? changeClass(q.changePct) : 'neutral';
      const logo = logoUrl(item.symbol);
      const initial = label.charAt(0);
      const logoHtml = logo
        ? `<img class="trending-logo" src="${logo}" alt="" width="40" height="40" loading="lazy"
            onerror="this.outerHTML='<span class=\\'trending-logo trending-logo-fallback\\'>${initial}</span>'" />`
        : `<span class="trending-logo trending-logo-fallback">${initial}</span>`;
      const price = q ? fmtPrice(q.price) : '—';
      const changeHtml = q
        ? `<span class="trending-change ${chCls}">${fmtChange(q.change, q.changePct)}</span>`
        : '<span class="trending-change neutral">—</span>';
      return `<div class="trending-stock-row">
        ${logoHtml}
        <div class="trending-info">
          <strong class="trending-symbol">${label}<span class="trending-badge">D</span></strong>
          <span class="trending-name">${item.name}</span>
        </div>
        <div class="trending-quote">
          <strong class="trending-price">${price}</strong>
          ${changeHtml}
        </div>
      </div>`;
    }).join('');
  }

  function showError(grid, list) {
    const msg =
      'Live stock quotes could not be loaded. <button type="button" class="btn btn-link btn-sm p-0 stocks-retry">Retry</button>';
    if (grid) grid.innerHTML = `<div class="col-12"><p class="text-muted-ptc text-center mb-0">${msg}</p></div>`;
    if (list) list.innerHTML = `<div class="p-4 text-center text-muted-ptc">${msg}</div>`;
    document.querySelectorAll('.stocks-retry').forEach((btn) => btn.addEventListener('click', load));
  }

  function setUpdated() {
    const el = document.getElementById('stocks-updated');
    if (el) el.textContent = `Live prices · updated ${new Date().toLocaleTimeString()}`;
  }

  async function load() {
    const grid = document.getElementById('stock-featured-grid');
    const list = document.getElementById('trending-stocks-list');
    if (!grid && !list) return;

    if (grid) grid.innerHTML = featuredSkeleton();
    if (list) list.innerHTML = trendingSkeleton();

    try {
      const symbols = [...new Set([...FEATURED.map((s) => s.symbol), ...TRENDING.map((s) => s.symbol)])];
      const quotes = await fetchAllQuotes(symbols);
      if (!Object.keys(quotes).length) throw new Error('no quotes');
      if (grid) renderFeatured(quotes);
      if (list) renderTrending(quotes);
      setUpdated();
    } catch {
      showError(grid, list);
    }
  }

  function start() {
    load();
    setInterval(load, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
