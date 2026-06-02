(function () {
  (function loadResponsiveStylesheet() {
    if (document.getElementById('ptc-responsive-css')) return;
    const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"][href*="css/"]')];
    const portalLink = stylesheets.find((l) => (l.getAttribute('href') || '').includes('portal.css'));
    const themeLink = stylesheets.find((l) => (l.getAttribute('href') || '').includes('theme.css'));
    const baseLink = portalLink || themeLink;
    const link = document.createElement('link');
    link.id = 'ptc-responsive-css';
    link.rel = 'stylesheet';
    if (baseLink) {
      const href = baseLink.getAttribute('href') || '';
      link.href = href.replace(/(theme|portal)\.css(\?.*)?$/, 'responsive.css$2');
    } else {
      const path = window.location.pathname.replace(/\\/g, '/');
      const inSubfolder = /\/(auth|portal|markets|legal)\//.test(path);
      link.href = inSubfolder ? '../css/responsive.css' : 'css/responsive.css';
    }
    document.head.appendChild(link);
  })();

  (function loadPremiumStylesheet() {
    if (document.getElementById('ptc-premium-css')) return;
    const responsive = document.getElementById('ptc-responsive-css');
    const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"][href*="css/"]')];
    const portalLink = stylesheets.find((l) => (l.getAttribute('href') || '').includes('portal.css'));
    const themeLink = stylesheets.find((l) => (l.getAttribute('href') || '').includes('theme.css'));
    const baseLink = portalLink || themeLink;
    const link = document.createElement('link');
    link.id = 'ptc-premium-css';
    link.rel = 'stylesheet';
    if (baseLink) {
      const href = baseLink.getAttribute('href') || '';
      link.href = href.replace(/(theme|portal|responsive)\.css(\?.*)?$/, 'premium.css$2');
    } else {
      const path = window.location.pathname.replace(/\\/g, '/');
      const inSubfolder = /\/(auth|portal|markets|legal)\//.test(path);
      link.href = inSubfolder ? '../css/premium.css' : 'css/premium.css';
    }
    if (responsive?.nextSibling) {
      responsive.parentNode.insertBefore(link, responsive.nextSibling);
    } else {
      document.head.appendChild(link);
    }
  })();

  const STORAGE_KEY = 'ptc-theme';

  function getStoredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function tradingViewTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  function applyNavbarTheme(theme) {
    document.querySelectorAll('.navbar-ptc').forEach((nav) => {
      nav.classList.toggle('navbar-dark', theme === 'dark');
      nav.classList.toggle('navbar-light', theme === 'light');
    });
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', `Switch to ${next} mode`);
      btn.setAttribute('title', `Switch to ${next} mode`);
    });
  }

  function patchTradingViewConfig(script, theme) {
    if (!script?.textContent?.trim()) return false;
    let config;
    try {
      config = JSON.parse(script.textContent);
    } catch {
      return false;
    }
    const tv = tradingViewTheme(theme);
    let changed = false;
    if ('colorTheme' in config && config.colorTheme !== tv) {
      config.colorTheme = tv;
      changed = true;
    }
    if ('theme' in config && config.theme !== tv) {
      config.theme = tv;
      changed = true;
    }
    if (changed) {
      script.textContent = JSON.stringify(config, null, 2);
    }
    return changed;
  }

  function reloadTradingViewWidget(container, theme) {
    const script = container.querySelector('script[src*="tradingview.com"]');
    if (!script) return;
    let config;
    try {
      config = JSON.parse(script.textContent);
    } catch {
      return;
    }
    const tv = tradingViewTheme(theme);
    if ('colorTheme' in config) config.colorTheme = tv;
    if ('theme' in config) config.theme = tv;
    const src = script.getAttribute('src');
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    container.replaceChildren(widget);
    const next = document.createElement('script');
    next.type = 'text/javascript';
    next.src = src;
    next.async = true;
    next.textContent = JSON.stringify(config, null, 2);
    container.appendChild(next);
  }

  function syncTradingViewWidgets(theme, reload) {
    document.querySelectorAll('.tradingview-widget-container').forEach((container) => {
      const script = container.querySelector('script[src*="tradingview.com"]');
      if (!script) return;
      if (reload) {
        reloadTradingViewWidget(container, theme);
        return;
      }
      patchTradingViewConfig(script, theme);
    });
  }

  function setTheme(theme, options) {
    const opts = options || {};
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    localStorage.setItem(STORAGE_KEY, next);
    applyNavbarTheme(next);
    updateToggleButtons(next);
    syncTradingViewWidgets(next, Boolean(opts.reloadTradingView));
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark', { reloadTradingView: true });
  }

  function bindToggle() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  function init() {
    const theme = getTheme();
    applyNavbarTheme(theme);
    updateToggleButtons(theme);
    syncTradingViewWidgets(theme, false);
  }

  window.PrimeTradeTheme = {
    getTheme,
    setTheme,
    toggleTheme,
    init,
  };

  bindToggle();

  syncTradingViewWidgets(getTheme(), false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
