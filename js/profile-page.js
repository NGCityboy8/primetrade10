(function () {
  const ACCOUNT_LABELS = {
    personal: 'Personal Trading Account',
    corporate: 'Corporate Trading Account',
    managed: 'Managed Account',
  };

  function initials(name, username) {
    const src = (name || username || '?').trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function kycBadge(status) {
    const map = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
    return `<span class="badge ${map[status] || 'bg-secondary'}">${label}</span>`;
  }

  function showFormAlert(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  function hideFormAlert(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  }

  function togglePassword(btn) {
    const input = btn.closest('.prof-pw-wrap')?.querySelector('input');
    if (!input) return;
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-eye', !hidden);
      icon.classList.toggle('bi-eye-slash', hidden);
    }
  }

  function populatePage(profile, session) {
    const username = session?.user?.username || profile?.username || 'user';
    const displayName = profile?.full_name || username;

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const avatar = document.getElementById('prof-avatar');
    if (avatar) avatar.textContent = initials(displayName, username);

    setText('prof-display-name', displayName);
    setText('prof-username', `@${username}`);
    setText('prof-member-since', profile?.created_at ? `Member since ${formatDate(profile.created_at)}` : '');
    setText('prof-balance', window.PrimeTradePortal?.formatMoney(profile?.balance) || '$0.00');
    setText('prof-kyc-text', profile?.kyc_status ? profile.kyc_status.charAt(0).toUpperCase() + profile.kyc_status.slice(1) : 'Pending');
    setText('prof-account-type', ACCOUNT_LABELS[profile?.account_type] || 'Personal Trading Account');
    setText('prof-referral-id', profile?.username || username);
    setText('prof-detail-username', username);
    setText('prof-detail-sponsor', profile?.sponsor_username || 'None');
    setText('prof-detail-plan', profile?.investment_plans?.name || 'None');
    setText('prof-detail-joined', formatDate(profile?.created_at));

    const kycBadgeEl = document.getElementById('prof-kyc-badge');
    if (kycBadgeEl) kycBadgeEl.innerHTML = kycBadge(profile?.kyc_status || 'pending');

    const form = document.getElementById('profile-form');
    if (form) {
      form.full_name.value = profile?.full_name || '';
      form.phone.value = profile?.phone || '';
      if (form.country) {
        const country = profile?.country || '';
        const opt = [...form.country.options].find((o) => o.value === country || o.text === country);
        form.country.value = opt ? opt.value : country;
      }
      if (form.account_type) {
        form.account_type.value = profile?.account_type || 'personal';
      }
    }
  }

  async function saveProfile(form) {
    hideFormAlert('profile-form-alert');
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) throw new Error('Not signed in');

    const payload = {
      full_name: form.full_name.value.trim(),
      phone: form.phone.value.trim(),
      country: form.country.value,
      account_type: form.account_type?.value || 'personal',
    };

    if (!payload.full_name) throw new Error('Full name is required');

    if (window.PrimeTradeAuth?.useLocalAuth && window.PrimeTradeAuthStore) {
      window.PrimeTradeAuthStore.updateUser(session.user.id, payload);
      showFormAlert('profile-form-alert', 'Profile updated successfully.', 'success');
      await window.PrimeTradePortalShell?.populateShell();
      const profile = await window.PrimeTradePortal.getProfile();
      populatePage(profile, session);
      return;
    }

    const sb = window.getSupabase?.();
    if (!sb) throw new Error('Unable to save profile');
    const { error } = await sb
      .from('profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (error) throw error;
    showFormAlert('profile-form-alert', 'Profile updated successfully.', 'success');
    await window.PrimeTradePortalShell?.populateShell();
  }

  async function changePassword(form) {
    hideFormAlert('password-form-alert');
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) throw new Error('Not signed in');

    const current = form.current_password.value;
    const next = form.new_password.value;
    const confirm = form.confirm_password.value;

    if (next.length < 6) throw new Error('New password must be at least 6 characters');
    if (next !== confirm) throw new Error('New passwords do not match');

    if (!window.PrimeTradeAuthStore?.changePassword) {
      throw new Error('Password change is not available');
    }
    await window.PrimeTradeAuthStore.changePassword(session.user.id, current, next, confirm);

    showFormAlert('password-form-alert', 'Password updated successfully.', 'success');
    form.reset();
  }

  async function initProfilePage() {
    await window.PrimeTradePortalShell?.populateShell();
    const session = await window.PrimeTradeAuth?.getSession();
    const profile = await window.PrimeTradePortal?.getProfile();
    if (profile) populatePage(profile, session);

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => togglePassword(btn));
    });

    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await saveProfile(e.target);
      } catch (err) {
        showFormAlert('profile-form-alert', err.message || 'Could not save profile', 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await changePassword(e.target);
      } catch (err) {
        let msg = err.message || 'Could not update password';
        if (
          msg === 'Invalid username or password' ||
          msg.toLowerCase().includes('incorrect')
        ) {
          msg = 'Current password is incorrect';
        }
        if (
          msg.includes('HTTPS') ||
          msg.includes('localhost') ||
          window.PrimeTradeAuthStore?.hasSubtleCrypto?.() === false
        ) {
          msg =
            'Password change requires HTTPS or localhost. Open the site via a secure connection.';
        }
        showFormAlert('password-form-alert', msg, 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('prof-sign-out-btn')?.addEventListener('click', () => {
      window.PrimeTradeAuth?.signOut();
    });
  }

  window.PrimeTradeProfile = { initProfilePage };

  if (document.body.dataset.portalPage === 'profile') {
    document.addEventListener('portal-layout-ready', () => initProfilePage(), { once: true });
  }
})();
