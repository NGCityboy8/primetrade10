(function () {
  function initials(name, username) {
    const src = (name || username || '?').trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLowerCase();
    return src.slice(0, 2).toLowerCase();
  }

  function initMobileNav() {
    const menuBtn = document.getElementById('portal-menu-btn');
    const sidebarWrap = document.getElementById('portal-sidebar');
    if (!menuBtn || !sidebarWrap) return;

    let overlay = document.getElementById('portal-sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'portal-sidebar-overlay';
      overlay.className = 'portal-sidebar-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }

    const mq = window.matchMedia('(max-width: 991.98px)');

    function setOpen(open) {
      document.body.classList.toggle('portal-nav-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.className = open ? 'bi bi-x-lg' : 'bi bi-list';
      }
    }

    function closeNav() {
      setOpen(false);
    }

    function toggleNav() {
      if (!mq.matches) {
        closeNav();
        return;
      }
      setOpen(!document.body.classList.contains('portal-nav-open'));
    }

    menuBtn.addEventListener('click', toggleNav);
    overlay.addEventListener('click', closeNav);

    sidebarWrap.querySelectorAll('.portal-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (mq.matches) closeNav();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });

    mq.addEventListener('change', (e) => {
      if (!e.matches) closeNav();
    });

    window.addEventListener('resize', () => {
      if (!mq.matches) closeNav();
    });
  }

  async function populateShell() {
    const profile = await window.PrimeTradePortal?.getProfile();
    const session = await window.PrimeTradeAuth?.getSession();
    const username = session?.user?.username || 'user';
    const displayName = profile?.full_name || username;
    const balance = window.PrimeTradePortal?.formatMoney(profile?.balance) || '$0.00';

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('portal-sidebar-username', displayName);
    setText('portal-sidebar-balance', balance);
    setText('portal-topbar-username', username);
    const avatar = document.getElementById('portal-avatar');
    if (avatar) avatar.textContent = initials(displayName, username);

    const title = document.body.dataset.portalTitle;
    const subtitle = document.body.dataset.portalSubtitle;
    if (title) setText('portal-page-title', title);
    const customSubtitlePages = ['dashboard', 'deposit', 'transactions', 'withdraw', 'wallet', 'stocks', 'copy-trading', 'profit-history', 'ai-bots', 'investments', 'profile', 'kyc', 'admin'];
    if (subtitle && !customSubtitlePages.includes(document.body.dataset.portalPage)) {
      setText('portal-page-subtitle', subtitle);
    }

    document.getElementById('portal-logout-btn')?.addEventListener('click', () => {
      window.PrimeTradeAuth?.signOut();
    });
  }

  window.PrimeTradePortalShell = { populateShell, initMobileNav };
})();
