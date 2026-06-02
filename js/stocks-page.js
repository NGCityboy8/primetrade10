(function () {
  const REFRESH_MS = 60000;
  const FETCH_TIMEOUT_MS = 12000;

  const STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', color: '#555555', domain: 'apple.com', min: 1000, max: 1000000 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', color: '#00a4ef', domain: 'microsoft.com', min: 1000, max: 1000000 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', color: '#76b900', domain: 'nvidia.com', min: 1000, max: 1000000 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', color: '#4285f4', domain: 'google.com', min: 1000, max: 1000000 },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', color: '#ff9900', domain: 'amazon.com', min: 1000, max: 1000000 },
    { symbol: 'META', name: 'Meta Platforms, Inc.', color: '#1877f2', domain: 'meta.com', min: 1000, max: 750000 },
    { symbol: 'TSLA', name: 'Tesla, Inc.', color: '#cc0000', domain: 'tesla.com', min: 500, max: 500000 },
    { symbol: 'NFLX', name: 'Netflix, Inc.', color: '#e50914', domain: 'netflix.com', min: 500, max: 500000 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', color: '#117aca', domain: 'jpmorganchase.com', min: 1000, max: 750000 },
    { symbol: 'V', name: 'Visa Inc.', color: '#1a1f71', domain: 'visa.com', min: 1000, max: 750000 },
  ];

  /** Reliable logo sources (tried in order via onerror fallback). */
  function logoUrls(symbol, domain) {
    const sym = symbol.toUpperCase();
    const urls = [
      `https://financialmodelingprep.com/image-stock/${sym}.png`,
      `https://assets.parqet.com/logos/symbol/${sym}`,
      `https://companiesmarketcap.com/img/company-logos/64/${sym}.webp`,
    ];
    if (domain) urls.push(`https://logo.clearbit.com/${domain}`);
    return urls;
  }

  function stockLogoHtml(stock) {
    const initial = stock.symbol.charAt(0);
    const urls = logoUrls(stock.symbol, stock.domain);
    const encoded = encodeURIComponent(JSON.stringify(urls));
    return `<span class="stock-logo-wrap" style="--logo-bg:${stock.color}">
      <img
        class="stock-logo-img"
        src="${urls[0]}"
        alt="${stock.name} logo"
        width="40"
        height="40"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        data-logo-i="0"
        data-logo-urls="${encoded}"
        onload="this.closest('.stock-logo-wrap')?.classList.add('has-logo')"
        onerror="window.__ptcStockLogoError&&window.__ptcStockLogoError(this)"
      />
      <span class="stock-logo-fallback" aria-hidden="true">${initial}</span>
    </span>`;
  }

  window.__ptcStockLogoError = function (img) {
    let urls = [];
    try {
      urls = JSON.parse(decodeURIComponent(img.dataset.logoUrls || '[]'));
    } catch {
      urls = [];
    }
    const next = parseInt(img.dataset.logoI || '0', 10) + 1;
    if (next >= urls.length) {
      img.hidden = true;
      img.closest('.stock-logo-wrap')?.classList.add('fallback');
      return;
    }
    img.dataset.logoI = String(next);
    img.src = urls[next];
  };

  let refreshTimer = null;
  let cardsBound = false;

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      n || 0
    );
  }

  function proxyUrls(url, yahoo) {
    if (yahoo) {
      return [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      ];
    }
    return [
      url,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ];
  }

  async function fetchJson(url, yahoo = true) {
    const urls = proxyUrls(url, yahoo);
    let lastErr;
    for (const u of urls) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(u, { signal: ctrl.signal });
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
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr || new Error('fetch failed');
  }

  function quoteFromChart(symbol, result) {
    const meta = result?.meta;
    if (!meta?.regularMarketPrice) return null;
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((c) => c != null);
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : price);
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return { symbol, price, change, changePct, closes };
  }

  async function fetchSymbolLive(symbol) {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=5d`;
    const data = await fetchJson(chartUrl, true);
    return quoteFromChart(symbol, data?.chart?.result?.[0]);
  }

  function parseV7Row(row) {
    if (!row || row.regularMarketPrice == null) return null;
    return {
      symbol: row.symbol,
      price: row.regularMarketPrice,
      change: row.regularMarketChange ?? 0,
      changePct: row.regularMarketChangePercent ?? 0,
      closes: null,
    };
  }

  async function fetchBatchV7(symbols) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
    const json = await fetchJson(url, true);
    const map = {};
    (json?.quoteResponse?.result || []).forEach((row) => {
      const q = parseV7Row(row);
      if (q) map[q.symbol] = q;
    });
    return map;
  }

  async function fetchAllLive(symbols) {
    let map = {};
    try {
      map = await fetchBatchV7(symbols);
    } catch {
      map = {};
    }

    const missing = symbols.filter((s) => !map[s]);
    if (!missing.length) return map;

    const settled = await Promise.all(
      missing.map(async (symbol) => {
        try {
          const q = await fetchSymbolLive(symbol);
          return q;
        } catch {
          return null;
        }
      })
    );
    settled.forEach((q) => {
      if (q) map[q.symbol] = q;
    });

    return map;
  }

  function sparklineFromPrices(prices, up) {
    const w = 108;
    const h = 36;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pts = prices.map((p, i) => {
      const x = prices.length === 1 ? 0 : (i / (prices.length - 1)) * w;
      const y = h - 2 - ((p - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M${pts.join(' L')}`;
    const area = `${line} L${w},${h} L0,${h} Z`;
    const stroke = up ? '#4caf50' : '#f44336';
    const fill = up ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)';
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="stock-sparkline" aria-hidden="true">
      <path d="${area}" fill="${fill}"/>
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  function sparklineSvg(changePct) {
    const up = changePct >= 0;
    const stroke = up ? '#4caf50' : '#f44336';
    const fill = up ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)';
    const line = up
      ? 'M0,32 L12,28 L24,26 L36,20 L48,18 L60,14 L72,12 L84,8 L96,6 L108,4'
      : 'M0,4 L12,8 L24,10 L36,14 L48,16 L60,20 L72,22 L84,26 L96,28 L108,32';
    const area = `${line} L108,32 L0,32 Z`;
    return `<svg viewBox="0 0 108 36" preserveAspectRatio="none" class="stock-sparkline" aria-hidden="true">
      <path d="${area}" fill="${fill}"/>
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  function chartHtml(quote) {
    const ch = quote?.changePct ?? 0;
    if (quote?.closes?.length >= 2) return sparklineFromPrices(quote.closes, ch >= 0);
    return sparklineSvg(ch);
  }

  function cardHtml(stock, quote, loading) {
    const price = quote?.price;
    const ch = quote?.changePct ?? 0;
    const chCls = ch >= 0 ? 'up' : 'down';
    const chSign = ch >= 0 ? '+' : '';
    const priceText = loading ? '…' : price != null ? `$${fmtPrice(price)}` : '—';
    const changeText = loading ? '…' : price != null ? `${chSign}${ch.toFixed(2)}%` : '—';

    return `<article class="stock-card${loading ? ' stock-card-loading' : quote ? ' stock-card-live' : ''}" data-symbol="${stock.symbol}">
      <div class="stock-card-head">
        <div class="stock-card-brand">
          ${stockLogoHtml(stock)}
          <div>
            <div class="stock-ticker">${stock.symbol}</div>
            <div class="stock-name">${stock.name}</div>
          </div>
        </div>
        <div class="stock-quote-block">
          <div class="stock-price">${priceText}</div>
          <div class="stock-change ${loading ? '' : chCls}">${changeText}</div>
        </div>
      </div>
      <div class="stock-chart">${loading ? '<div class="stock-chart-skeleton"></div>' : chartHtml(quote)}</div>
      <div class="stock-limits">
        <div><span class="stock-limit-label">Min. Investment</span><span class="stock-limit-val">${fmtMoney(stock.min)}</span></div>
        <div><span class="stock-limit-label">Max. Investment</span><span class="stock-limit-val">${fmtMoney(stock.max)}</span></div>
      </div>
      <label class="stock-invest-label">Amount to Invest</label>
      <div class="fund-amount-wrap stock-amount-wrap">
        <span class="fund-amount-prefix">$</span>
        <input type="number" class="fund-amount-input stock-amount-input" min="${stock.min}" max="${stock.max}" step="0.01" placeholder="0.00" data-symbol="${stock.symbol}" />
      </div>
      <button type="button" class="btn btn-gradient w-100 stock-invest-btn" data-symbol="${stock.symbol}">
        <i class="bi bi-graph-up-arrow"></i> Invest
      </button>
      <div class="stock-card-alert alert-ptc d-none" role="status"></div>
    </article>`;
  }

  function saveInputValues() {
    const values = {};
    document.querySelectorAll('.stock-amount-input').forEach((input) => {
      if (input.value) values[input.dataset.symbol] = input.value;
    });
    return values;
  }

  function restoreInputValues(values) {
    Object.entries(values).forEach(([symbol, val]) => {
      const input = document.querySelector(`.stock-amount-input[data-symbol="${symbol}"]`);
      if (input) input.value = val;
    });
  }

  function updateCardQuote(card, quote) {
    if (!card) return;
    const priceEl = card.querySelector('.stock-price');
    const changeEl = card.querySelector('.stock-change');
    const chartEl = card.querySelector('.stock-chart');
    card.classList.remove('stock-card-loading');

    if (!quote || quote.price == null) {
      if (priceEl) priceEl.textContent = '—';
      if (changeEl) {
        changeEl.textContent = '—';
        changeEl.className = 'stock-change';
      }
      return;
    }

    const ch = quote.changePct ?? 0;
    const chCls = ch >= 0 ? 'up' : 'down';
    const chSign = ch >= 0 ? '+' : '';

    if (priceEl) priceEl.textContent = `$${fmtPrice(quote.price)}`;
    if (changeEl) {
      changeEl.textContent = `${chSign}${ch.toFixed(2)}%`;
      changeEl.className = `stock-change ${chCls}`;
    }
    if (chartEl) chartEl.innerHTML = chartHtml(quote);
    card.classList.add('stock-card-live');
  }

  function setUpdatedLabel(ok, loaded, total) {
    const el = document.getElementById('stocks-updated');
    const pill = document.getElementById('stocks-live-pill');
    if (!el) return;

    if (ok && loaded > 0) {
      el.textContent = `Live · ${loaded}/${total} symbols · ${new Date().toLocaleTimeString()}`;
      pill?.classList.remove('stocks-live-off');
    } else if (loaded > 0) {
      el.textContent = `Partial data · ${loaded}/${total} · ${new Date().toLocaleTimeString()}`;
      pill?.classList.add('stocks-live-off');
    } else {
      el.innerHTML =
        'Quotes unavailable. <button type="button" class="btn btn-link btn-sm p-0 align-baseline stocks-retry">Retry</button>';
      pill?.classList.add('stocks-live-off');
      document.querySelector('.stocks-retry')?.addEventListener('click', () => refreshQuotes(true));
    }
  }

  async function refreshQuotes(forceRender) {
    const symbols = STOCKS.map((s) => s.symbol);
    const saved = saveInputValues();

    let quotes = {};
    try {
      quotes = await fetchAllLive(symbols);
    } catch {
      quotes = {};
    }

    const loaded = Object.keys(quotes).length;
    const grid = document.getElementById('stocks-grid');

    if (forceRender || !grid?.querySelector('.stock-card')) {
      if (grid) {
        grid.innerHTML = STOCKS.map((s) => cardHtml(s, quotes[s.symbol], false)).join('');
        bindCards();
      }
    } else {
      STOCKS.forEach((stock) => {
        const card = grid.querySelector(`.stock-card[data-symbol="${stock.symbol}"]`);
        updateCardQuote(card, quotes[stock.symbol]);
      });
    }

    restoreInputValues(saved);
    setUpdatedLabel(loaded === symbols.length, loaded, symbols.length);
  }

  function showCardAlert(card, message, type) {
    const el = card.querySelector('.stock-card-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `stock-card-alert alert-ptc alert-ptc-${type}`;
    el.textContent = message;
  }

  async function invest(card, stock) {
    const input = card.querySelector('.stock-amount-input');
    const amount = parseFloat(input?.value);
    const btn = card.querySelector('.stock-invest-btn');
    if (btn) btn.disabled = true;

    try {
      const profile = await window.PrimeTradePortal?.getProfile();
      if (profile?.kyc_status !== 'approved') {
        const ok = confirm('KYC approval is recommended before investing. Continue anyway?');
        if (!ok) return;
      }

      const session = await window.PrimeTradeAuth?.getSession();
      if (!session || !window.PrimeTradeAuthStore) throw new Error('Not signed in');

      window.PrimeTradeAuthStore.purchaseStock(session.user.id, {
        symbol: stock.symbol,
        stockName: stock.name,
        amount,
        minInvest: stock.min,
        maxInvest: stock.max,
      });

      showCardAlert(card, 'Investment submitted. Pending approval.', 'success');
      input.value = '';
      await window.PrimeTradePortalShell?.populateShell();
      const bal = document.getElementById('stocks-available-balance');
      const updated = await window.PrimeTradePortal.getProfile();
      if (bal && updated) bal.textContent = window.PrimeTradePortal.formatMoney(updated.balance);
    } catch (err) {
      showCardAlert(card, err.message || 'Investment failed', 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindCards() {
    if (cardsBound) return;
    cardsBound = true;
    const grid = document.getElementById('stocks-grid');
    grid?.addEventListener('click', (e) => {
      const btn = e.target.closest('.stock-invest-btn');
      if (!btn) return;
      const symbol = btn.dataset.symbol;
      const stock = STOCKS.find((s) => s.symbol === symbol);
      const card = btn.closest('.stock-card');
      if (stock && card) invest(card, stock);
    });
  }

  async function initStocksPage() {
    await window.PrimeTradePortalShell?.populateShell();

    const profile = await window.PrimeTradePortal?.getProfile();
    const bal = document.getElementById('stocks-available-balance');
    if (bal && profile) {
      bal.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    const grid = document.getElementById('stocks-grid');
    if (grid) {
      grid.innerHTML = STOCKS.map((s) => cardHtml(s, null, true)).join('');
      bindCards();
    }

    await refreshQuotes(true);

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => refreshQuotes(false), REFRESH_MS);
  }

  window.PrimeTradeStocks = { initStocksPage, refreshQuotes };

  if (document.body.dataset.portalPage === 'stocks') {
    document.addEventListener('portal-layout-ready', () => initStocksPage(), { once: true });
  }
})();
