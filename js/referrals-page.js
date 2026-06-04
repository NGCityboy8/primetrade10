(function () {
  const store = () => window.PrimeTradeAuthStore;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(n) {
    return (
      window.PrimeTradePortal?.formatMoney(n) ||
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
    );
  }

  function setText(id, text) {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function flashButton(btn, label) {
    if (!btn) return;
    const prev = btn.textContent;
    const icon = btn.querySelector('i');
    if (icon) {
      const prevClass = icon.className;
      icon.className = 'bi bi-check2';
      setTimeout(() => {
        icon.className = prevClass;
      }, 1500);
      return;
    }
    btn.textContent = label || 'Copied!';
    setTimeout(() => {
      btn.textContent = prev;
    }, 1500);
  }

  async function copyText(text, btn) {
    const value = String(text || '').trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      flashButton(btn, 'Copied!');
    } catch {
      window.prompt('Copy this link:', value);
    }
  }

  function bindCopyOnce(id, getText) {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      copyText(getText(), e.currentTarget);
    });
  }

  function renderReferralsTable(referrals) {
    const tbody = document.getElementById('referrals-table-body');
    if (!tbody) return;
    if (!referrals.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-muted-ptc">No referrals yet. Share your link to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = referrals
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.full_name)}</td>
          <td>${r.level}</td>
          <td>${escapeHtml(r.parent)}</td>
          <td><span class="badge ${r.status === 'Active' ? 'badge-approved' : 'badge-pending'}">${escapeHtml(r.status)}</span></td>
          <td>${escapeHtml(new Date(r.created_at).toLocaleDateString())}</td>
        </tr>`
      )
      .join('');
  }

  function showReferralAlert(message, type) {
    const el = document.getElementById('referrals-page-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  async function initReferralsPage() {
    await window.PrimeTradePortalShell?.populateShell();
    const session = await window.PrimeTradeAuth?.getSession();
    const authStore = store();
    if (!session?.user?.id || !authStore) {
      showReferralAlert('Sign in to view your referral program.', 'danger');
      return;
    }

    const info = await authStore.getReferralInfo(session.user.id);
    if (!info) {
      showReferralAlert('Could not load referral data. Refresh the page.', 'danger');
      return;
    }

    const linkInput = document.getElementById('referral-link-input');
    if (linkInput) linkInput.value = info.referral_link;

    setText('referral-id-display', info.referral_id);
    setText('referral-sponsor', info.sponsor_username || 'None');
    setText('ref-total-count', `${info.total_referrals} User${info.total_referrals === 1 ? '' : 's'}`);
    setText('ref-total-earnings', formatMoney(info.referral_earnings));

    const rateEl = document.getElementById('ref-commission-rate');
    if (rateEl) {
      rateEl.textContent = `${Math.round((info.commission_rate || 0.05) * 100)}%`;
    }

    renderReferralsTable(info.referrals);

    bindCopyOnce('copy-referral-link', () => info.referral_link);
    bindCopyOnce('copy-referral-id', () => info.referral_id);

    const shareBtn = document.getElementById('share-referral-link');
    if (shareBtn && !shareBtn.dataset.bound) {
      shareBtn.dataset.bound = '1';
      shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Join Prime Trade Capitals',
              text: 'Register with my referral link:',
              url: info.referral_link,
            });
            return;
          } catch (err) {
            if (err?.name === 'AbortError') return;
          }
        }
        copyText(info.referral_link, shareBtn);
      });
    }
  }

  window.PrimeTradeReferrals = { initReferralsPage };

  if (document.body.dataset.portalPage === 'referrals') {
    document.addEventListener(
      'portal-layout-ready',
      () => {
        window.PrimeTradeAuth?.requireAuth().then(() => initReferralsPage());
      },
      { once: true }
    );
  }
})();
