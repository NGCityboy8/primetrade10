(function () {
  const REFRESH_MS = 90000;
  const FETCH_TIMEOUT_MS = 8000;
  const panelLoading = new WeakMap();

  function dbg(location, message, data, hypothesisId) {
    // #region agent log
    fetch('http://127.0.0.1:7897/ingest/2e5eed15-3b92-44f8-b093-ea1ee411cc5b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0a7ee' },
      body: JSON.stringify({
        sessionId: 'c0a7ee',
        location,
        message,
        data,
        hypothesisId,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }

  function fmtNum(n, decimals) {
    if (n == null || Number.isNaN(n)) return '—';
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return '—';
    const d = n < 1 ? 4 : n < 100 ? 2 : 2;
    return fmtNum(n, d);
  }

  function chgClass(v) {
    if (v > 0) return 'mq-up';
    if (v < 0) return 'mq-down';
    return '';
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

  async function fetchJson(url, yahoo = false) {
    const urls = proxyUrls(url, yahoo);
    let lastErr;
    const t0 = performance.now();
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
        const parsed = JSON.parse(text);
        if (yahoo) {
          dbg('market-quotes-table.js:fetchJson', 'yahoo fetch ok', {
            ms: Math.round(performance.now() - t0),
            via: u.includes('corsproxy') ? 'corsproxy' : u.includes('allorigins') ? 'allorigins' : 'direct',
          }, 'H1');
        }
        return parsed;
      } catch (e) {
        lastErr = e;
      } finally {
        clearTimeout(timer);
      }
    }
    if (yahoo) {
      dbg('market-quotes-table.js:fetchJson', 'yahoo fetch failed', {
        ms: Math.round(performance.now() - t0),
        error: String(lastErr?.message || lastErr),
      }, 'H3');
    }
    throw lastErr || new Error('fetch failed');
  }

  async function loadCoingecko(ids) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
      ids.join(',')
    )}&order=market_cap_desc&sparkline=false`;
    const data = await fetchJson(url);
    const map = {};
    (data || []).forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }

  function quoteFromChartMeta(symbol, meta) {
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return {
      symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePct,
      regularMarketOpen: meta.regularMarketOpen ?? prev,
      regularMarketDayHigh: meta.regularMarketDayHigh ?? price,
      regularMarketDayLow: meta.regularMarketDayLow ?? price,
      regularMarketPreviousClose: prev,
    };
  }

  async function loadYahooChartSymbol(symbol) {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1d`;
    const data = await fetchJson(chartUrl, true);
    return quoteFromChartMeta(symbol, data?.chart?.result?.[0]?.meta);
  }

  async function loadYahoo(symbols) {
    const unique = [...new Set(symbols)];
    const t0 = performance.now();
    const settled = await Promise.all(
      unique.map(async (symbol) => {
        try {
          const row = await loadYahooChartSymbol(symbol);
          return row ? { symbol, row } : null;
        } catch {
          return null;
        }
      })
    );
    const map = {};
    settled.forEach((item) => {
      if (item) map[item.symbol] = item.row;
    });
    dbg('market-quotes-table.js:loadYahoo', 'yahoo parallel load done', {
      ms: Math.round(performance.now() - t0),
      requested: unique.length,
      loaded: Object.keys(map).length,
      missing: unique.filter((s) => !map[s]),
    }, 'H1-H3');
    return map;
  }

  function renderPanelRows(rows, cgMap, yahooMap) {
    return rows
      .map((row) => {
        if (row.cg) return renderCoingeckoRow(row, cgMap);
        if (row.yahoo) return renderYahooRow(row, yahooMap);
        return '';
      })
      .join('');
  }

  function skeletonRows(n) {
    return Array.from({ length: n })
      .map(
        () =>
          '<tr class="mq-skeleton-row"><td colspan="8"><span class="sk-line sk-w-80"></span></td></tr>'
      )
      .join('');
  }

  function nameCell(row, imgUrl) {
    const initial = (row.name || '?').charAt(0);
    const img = imgUrl
      ? `<img src="${imgUrl}" alt="" width="24" height="24" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />`
      : '';
    const fallback = `<span class="mq-logo-fallback" style="${imgUrl ? 'display:none' : ''}">${initial}</span>`;
    return `<td class="mq-name"><div class="mq-name-cell">${img}${fallback}<span>${row.name}</span></div></td>`;
  }

  function numCells(value, change, changePct, open, high, low, prev) {
    const chSign = change >= 0 ? '+' : '';
    const pctSign = changePct >= 0 ? '+' : '';
    return `<td class="num">${value}</td>
      <td class="num ${chgClass(change)}">${chSign}${fmtNum(change, 2)}</td>
      <td class="num ${chgClass(changePct)}">${pctSign}${fmtNum(changePct, 2)}%</td>
      <td class="num">${open}</td>
      <td class="num">${high}</td>
      <td class="num">${low}</td>
      <td class="num">${prev}</td>`;
  }

  function renderCoingeckoRow(row, data) {
    const c = data[row.cg];
    if (!c) {
      return `<tr><td class="mq-name">${row.name}</td><td class="num" colspan="7">—</td></tr>`;
    }
    const price = c.current_price;
    const change = c.price_change_24h ?? 0;
    const changePct = c.price_change_percentage_24h ?? 0;
    const open = price - change;
    const prev = open;
    return `<tr>${nameCell(row, c.image)}${numCells(
      fmtPrice(price),
      change,
      changePct,
      fmtPrice(open),
      fmtPrice(c.high_24h),
      fmtPrice(c.low_24h),
      fmtPrice(prev)
    )}</tr>`;
  }

  function renderYahooRow(row, data) {
    const q = data[row.yahoo];
    if (!q) {
      return `<tr><td class="mq-name">${row.name}</td><td class="num" colspan="7">—</td></tr>`;
    }
    const price = q.regularMarketPrice;
    const change = q.regularMarketChange ?? 0;
    const changePct = q.regularMarketChangePercent ?? 0;
    return `<tr>${nameCell(row, '')}${numCells(
      fmtPrice(price),
      change,
      changePct,
      fmtPrice(q.regularMarketOpen),
      fmtPrice(q.regularMarketDayHigh),
      fmtPrice(q.regularMarketDayLow),
      fmtPrice(q.regularMarketPreviousClose)
    )}</tr>`;
  }

  async function fillPanel(panel) {
    if (panelLoading.get(panel)) {
      dbg('market-quotes-table.js:fillPanel', 'skipped overlapping load', { panelClass: panel.className }, 'H4');
      return;
    }
    panelLoading.set(panel, true);

    const rows = JSON.parse(panel.getAttribute('data-mq-rows') || '[]');
    const tbody = panel.querySelector('.mq-tbody');
    if (!tbody || !rows.length) {
      panelLoading.set(panel, false);
      return;
    }

    const t0 = performance.now();
    tbody.innerHTML = skeletonRows(rows.length);

    try {
      const hasCg = rows.some((r) => r.cg);
      const hasYahoo = rows.some((r) => r.yahoo);
      const yahooSymbols = rows.filter((r) => r.yahoo).map((r) => r.yahoo);

      let cgMap = {};
      const yahooMap = {};

      const tasks = [];
      if (hasCg) {
        tasks.push(
          loadCoingecko(rows.filter((r) => r.cg).map((r) => r.cg)).then((m) => {
            cgMap = m;
          })
        );
      }
      if (hasYahoo) {
        tasks.push(
          Promise.all(
            yahooSymbols.map(async (symbol) => {
              try {
                const row = await loadYahooChartSymbol(symbol);
                if (row) {
                  yahooMap[symbol] = row;
                  tbody.innerHTML = renderPanelRows(rows, cgMap, yahooMap);
                }
              } catch {
                /* skip */
              }
            })
          )
        );
      }

      await Promise.all(tasks);
      tbody.innerHTML = renderPanelRows(rows, cgMap, yahooMap);

      const loaded = yahooSymbols.filter((s) => yahooMap[s]).length;
      dbg('market-quotes-table.js:fillPanel', 'panel render done', {
        ms: Math.round(performance.now() - t0),
        hasCg,
        hasYahoo,
        yahooLoaded: loaded,
        yahooTotal: yahooSymbols.length,
        panelClass: panel.className,
        runId: 'post-fix',
      }, 'H2-H4');

      if (hasYahoo && loaded === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="mq-error">Unable to load quotes. <button type="button" class="btn btn-link btn-sm p-0 mq-retry">Retry</button></td></tr>`;
        panel.querySelector('.mq-retry')?.addEventListener('click', () => fillPanel(panel));
      }
    } catch (err) {
      dbg('market-quotes-table.js:fillPanel', 'panel error', { error: String(err?.message || err) }, 'H5');
      tbody.innerHTML = `<tr><td colspan="8" class="mq-error">Unable to load quotes. <button type="button" class="btn btn-link btn-sm p-0 mq-retry">Retry</button></td></tr>`;
      panel.querySelector('.mq-retry')?.addEventListener('click', () => fillPanel(panel));
    } finally {
      panelLoading.set(panel, false);
    }
  }

  function start() {
    const panels = document.querySelectorAll('.mq-table-panel[data-mq-rows]');
    panels.forEach((panel) => {
      fillPanel(panel);
      setInterval(() => fillPanel(panel), REFRESH_MS);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
