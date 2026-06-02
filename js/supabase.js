(function () {
  let client = null;

  function getClient() {
    if (client) return client;
    const cfg = window.PRIME_TRADE_CONFIG;
    if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured. Edit js/config.js');
      return null;
    }
    if (typeof supabase === 'undefined') {
      console.warn('Supabase JS library not loaded');
      return null;
    }
    client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return client;
  }

  window.getSupabase = getClient;
})();
