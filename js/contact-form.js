(function () {
  const CONTACT_MESSAGES_KEY = 'ptc-contact-messages';

  function readMessages() {
    try {
      return JSON.parse(localStorage.getItem(CONTACT_MESSAGES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveMessage(message) {
    const all = readMessages();
    all.push(message);
    localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(all));
  }

  function isSupabaseStorageMode() {
    return (window.PRIME_TRADE_CONFIG?.STORAGE_MODE || 'supabase') === 'supabase';
  }

  async function syncMessageToSupabase(message) {
    if (!isSupabaseStorageMode()) return;
    const sb = window.getSupabase?.();
    if (!sb) throw new Error('Supabase is not configured');
    const { error } = await sb.from('contact_messages').insert({
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
    });
    if (error) throw error;
  }

  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const alertEl = form.querySelector('.form-alert') || document.getElementById('contact-alert');

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      message: form.message.value,
      created_at: new Date().toISOString(),
    };
    saveMessage(message);

    if (alertEl) {
      alertEl.classList.remove('d-none');
      alertEl.className = 'alert-ptc alert-ptc-success mb-3';
      alertEl.textContent = 'Message received. We will contact you soon.';
    }
    try {
      await syncMessageToSupabase(message);
    } catch {
      if (alertEl) {
        alertEl.className = 'alert-ptc alert-ptc-warning mb-3';
        alertEl.textContent = 'Message saved locally, but could not reach Supabase.';
      }
    }
    form.reset();
  });
})();
