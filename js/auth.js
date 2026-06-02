(function () {
  const AUTH_PATH = /\/auth\//;
  const PORTAL_PATH = /\/portal\//;
  const store = () => window.PrimeTradeAuthStore;

  /** Site root prefix when app lives in a subfolder (e.g. /primeTrade/portal/...). */
  function appPathPrefix() {
    const path = location.pathname.replace(/\\/g, '/');
    const markers = ['/portal/', '/auth/', '/markets/', '/legal/'];
    for (let i = 0; i < markers.length; i += 1) {
      const idx = path.indexOf(markers[i]);
      if (idx >= 0) return path.slice(0, idx);
    }
    return '';
  }

  function relativeBasePath() {
    const path = location.pathname.replace(/\\/g, '/');
    if (path.includes('/auth/') || path.includes('/portal/') || path.includes('/markets/') || path.includes('/legal/')) {
      return '..';
    }
    return window.PrimeTradeComponents?.getBasePath?.() || '.';
  }

  function basePath() {
    return relativeBasePath();
  }

  function authUrl(page) {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return `${location.origin}${appPathPrefix()}/auth/${page}`;
    }
    return `${relativeBasePath()}/auth/${page}`;
  }

  function portalUrl(page) {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return `${location.origin}${appPathPrefix()}/portal/${page}`;
    }
    return `${relativeBasePath()}/portal/${page}`;
  }

  async function getSession() {
    return store()?.getSession() || null;
  }

  async function requireAuth() {
    const session = await getSession();
    if (!session && PORTAL_PATH.test(location.pathname)) {
      location.href = authUrl('login.html');
      return null;
    }
    return session;
  }

  async function requireAdmin() {
    const session = await requireAuth();
    if (!session) return null;
    if (!store()?.isAdmin(session.user.id)) {
      location.href = portalUrl('dashboard.html');
      return null;
    }
    return session;
  }

  async function redirectIfAuthed() {
    const session = await getSession();
    if (session && AUTH_PATH.test(location.pathname)) {
      location.href = portalUrl('dashboard.html');
    }
  }

  async function updateNavButtons() {
    const session = await getSession();
    const login = document.getElementById('nav-login');
    const register = document.getElementById('nav-register');
    const portal = document.getElementById('nav-portal');
    const logout = document.getElementById('nav-logout');
    if (!login) return;
    if (session) {
      login.classList.add('d-none');
      register?.classList.add('d-none');
      portal?.classList.remove('d-none');
      logout?.classList.remove('d-none');
    } else {
      login.classList.remove('d-none');
      register?.classList.remove('d-none');
      portal?.classList.add('d-none');
      logout?.classList.add('d-none');
    }
  }

  async function signUp(payload) {
    if (!store()?.isVerified()) {
      throw new Error('Complete verification before registering');
    }
    return store().signUp(payload);
  }

  async function signIn(username, password) {
    return store().signIn(username, password);
  }

  function signOut() {
    store()?.signOut();
    location.href = `${basePath()}/index.html`;
  }

  async function resetPassword(username, newPassword, confirmPassword) {
    return store().resetPassword(username, newPassword, confirmPassword);
  }

  function requireVerification() {
    if (!store()?.isVerified()) {
      location.href = authUrl('verify.html');
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'nav-logout') signOut();
  });

  window.PrimeTradeAuth = {
    getSession,
    requireAuth,
    requireAdmin,
    redirectIfAuthed,
    updateNavButtons,
    signUp,
    signIn,
    signOut,
    resetPassword,
    requireVerification,
    authUrl,
    portalUrl,
    useLocalAuth: true,
  };

  if (PORTAL_PATH.test(location.pathname)) {
    const page = document.body?.dataset?.portalPage;
    if (page !== 'admin') {
      requireAuth();
    }
  }
  if (AUTH_PATH.test(location.pathname)) {
    redirectIfAuthed();
  }
})();
