(function () {
  function getBasePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const depth = (path.match(/\//g) || []).length - 1;
    if (path.includes('/auth/') || path.includes('/portal/') || path.includes('/markets/') || path.includes('/legal/')) {
      return '..';
    }
    return '.';
  }

  function fixLinks(container, base) {
    container.querySelectorAll('[href^="/"]').forEach((el) => {
      const href = el.getAttribute('href');
      if (href && href.startsWith('/')) {
        el.setAttribute('href', base + href);
      }
    });
    container.querySelectorAll('[src^="/"]').forEach((el) => {
      const src = el.getAttribute('src');
      if (src && src.startsWith('/')) {
        el.setAttribute('src', base + src);
      }
    });
  }

  function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === page) link.classList.add('active');
    });
  }

  async function loadPartial(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    const base = getBasePath();
    const res = await fetch(`${base}/${url}`);
    if (!res.ok) return;
    el.innerHTML = await res.text();
    fixLinks(el, base);
    return el;
  }

  async function loadPortalPartial(id, file) {
    const el = document.getElementById(id);
    if (!el) return null;
    const base = getBasePath();
    const res = await fetch(`${base}/partials/${file}`);
    if (!res.ok) return null;
    el.innerHTML = await res.text();
    return el;
  }

  function showAdminNav() {
    const section = document.querySelector('.portal-nav-admin-section');
    section?.classList.remove('d-none');
  }

  async function initPortalSidebar() {
    const page = document.body.dataset.portalPage;
    if (!page) return;
    const el = await loadPortalPartial('portal-sidebar', 'portal-sidebar.html');
    if (!el) return;
    el.querySelectorAll('[data-portal-nav]').forEach((link) => {
      if (link.dataset.portalNav === page) link.classList.add('active');
    });
    const session = await window.PrimeTradeAuth?.getSession();
    if (session?.user?.id && window.PrimeTradeAuthStore?.isAdmin(session.user.id)) {
      showAdminNav();
    }
  }

  async function initPortalTopbar() {
    if (!document.body.classList.contains('portal-app')) return;
    await loadPortalPartial('portal-topbar', 'portal-topbar.html');
    if (window.PrimeTradeTheme) {
      window.PrimeTradeTheme.init();
    }
  }

  async function initLayout() {
    const isPortal = document.body.classList.contains('portal-app');
    let header = null;
    if (!isPortal) {
      header = await loadPartial('site-header', 'partials/header.html');
      await loadPartial('site-footer', 'partials/footer.html');
    }
    await initPortalSidebar();
    await initPortalTopbar();
    if (document.body.classList.contains('portal-app')) {
      window.PrimeTradePortalShell?.initMobileNav?.();
      document.dispatchEvent(new Event('portal-layout-ready'));
    }
    setActiveNav();
    if (window.PrimeTradeTheme) {
      window.PrimeTradeTheme.init();
    }
    if (header && window.PrimeTradeAuth) {
      window.PrimeTradeAuth.updateNavButtons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  window.PrimeTradeComponents = { getBasePath, fixLinks, showAdminNav };
})();
