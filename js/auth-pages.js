(function () {
  const auth = () => window.PrimeTradeAuth;
  const store = () => window.PrimeTradeAuthStore;

  function showAlert(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  function togglePassword(btn) {
    const input = btn.closest('.auth-input-wrap')?.querySelector('input');
    if (!input) return;
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.querySelector('i')?.classList.toggle('bi-eye', !hidden);
    btn.querySelector('i')?.classList.toggle('bi-eye-slash', hidden);
  }

  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => togglePassword(btn));
  });

  const refKey = store()?.REFERRAL_REF_KEY || 'ptc-ref';
  const refFromUrl = new URLSearchParams(location.search).get('ref');
  if (refFromUrl) sessionStorage.setItem(refKey, refFromUrl.trim());

  const verifyDisplay = document.getElementById('verify-code-display');
  if (verifyDisplay && store()) {
    verifyDisplay.textContent = store().setVerifyCode();
  }

  document.getElementById('verify-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.code.value.trim();
    const expected = store()?.getVerifyCode();
    if (!expected || input !== expected) {
      showAlert('verify-alert', 'Incorrect verification code. Try again.', 'danger');
      if (verifyDisplay) verifyDisplay.textContent = store().setVerifyCode();
      e.target.code.value = '';
      return;
    }
    store().markVerified();
    const ref = sessionStorage.getItem(refKey);
    const dest = auth().authUrl('register.html');
    location.href = ref ? `${dest}?ref=${encodeURIComponent(ref)}` : dest;
  });

  if (document.getElementById('register-form') && store() && !store().isVerified()) {
    const ref =
      sessionStorage.getItem(refKey) || new URLSearchParams(location.search).get('ref');
    const dest = auth().authUrl('verify.html');
    location.href = ref ? `${dest}?ref=${encodeURIComponent(ref)}` : dest;
  }

  const referralInput = document.querySelector('#register-form [name="referral_id"]');
  const savedRef = sessionStorage.getItem(refKey);
  if (referralInput && savedRef) referralInput.value = savedRef;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await auth().signIn(form.username.value, form.password.value);
      location.href = auth().portalUrl('dashboard.html');
    } catch (err) {
      let msg = err.message || 'Login failed';
      if (
        msg === 'Invalid username or password' &&
        window.PrimeTradeAuthStore?.hasSubtleCrypto?.() === false
      ) {
        const user = window.PrimeTradeAuthStore.findByUsername(form.username.value);
        if (user?.password_algo === 'pbkdf2') {
          msg =
            'This account was created over HTTPS. Open the site via https:// or localhost to log in.';
        }
      }
      showAlert('login-alert', msg, 'danger');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await auth().signUp({
        username: form.username.value,
        full_name: form.full_name.value,
        country: form.country.value,
        phone: form.phone.value,
        password: form.password.value,
        confirm_password: form.confirm_password.value,
        account_type: form.account_type.value,
        referral_id: form.referral_id.value,
      });
      sessionStorage.removeItem(refKey);
      location.href = auth().portalUrl('dashboard.html');
    } catch (err) {
      showAlert('register-alert', err.message || 'Registration failed', 'danger');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await auth().resetPassword(
        form.username.value,
        form.password.value,
        form.confirm_password.value
      );
      showAlert('forgot-alert', 'Password updated. You can log in now.', 'success');
      form.reset();
    } catch (err) {
      showAlert('forgot-alert', err.message || 'Could not reset password', 'danger');
    } finally {
      btn.disabled = false;
    }
  });
})();
