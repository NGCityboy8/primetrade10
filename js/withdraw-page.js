(function () {
  const UNLOCK_KEY = 'ptc-withdraw-unlocked';

  const WITHDRAW_METHODS = [
    { id: 'sei', label: 'SEI', color: '#9b1c1c', letter: 'S' },
    { id: 'matic', label: 'MATIC POLYGON', color: '#8247e5', letter: 'M' },
    { id: 'link', label: 'LINK', color: '#2a5ada', letter: 'L' },
    { id: 'usdc', label: 'USDC', color: '#2775ca', letter: 'U' },
    { id: 'bnb', label: 'BNB', color: '#f3ba2f', letter: 'B' },
    { id: 'sol', label: 'SOLANA', color: '#9945ff', letter: 'S' },
    { id: 'usdt_erc20', label: 'USDT (ERC20)', color: '#26a17b', letter: '₮' },
    { id: 'usdt_trc20', label: 'USDT (TRC20)', color: '#26a17b', letter: '₮' },
    { id: 'btc', label: 'BITCOIN', color: '#f7931a', letter: '₿' },
  ];

  let selectedMethodLabel = '';

  function isUnlocked() {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  }

  function unlock() {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  }

  function showSecureGate() {
    document.getElementById('withdraw-secure-gate')?.classList.remove('d-none');
    document.getElementById('withdraw-main')?.classList.add('d-none');
  }

  function showWithdrawMain() {
    document.getElementById('withdraw-secure-gate')?.classList.add('d-none');
    document.getElementById('withdraw-main')?.classList.remove('d-none');
  }

  function showSecureAlert(message, type) {
    const el = document.getElementById('withdraw-secure-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  function showFormAlert(message, type) {
    const el = document.getElementById('withdraw-form-alert');
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
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-eye', !hidden);
      icon.classList.toggle('bi-eye-slash', hidden);
    }
  }

  function renderMethods() {
    const list = document.getElementById('wd-methods-list');
    if (!list) return;
    list.innerHTML = WITHDRAW_METHODS.map(
      (m) =>
        `<div class="fund-method-row" data-method-label="${m.label}">
          <div class="fund-method-info">
            <span class="fund-method-icon" style="background:${m.color}">${m.letter}</span>
            <span class="fund-method-name">${m.label}</span>
          </div>
          <button type="button" class="btn btn-sm btn-gradient wd-withdraw-btn">Withdraw</button>
        </div>`
    ).join('');

    list.querySelectorAll('.wd-withdraw-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const row = btn.closest('.fund-method-row');
        if (!row) return;
        openWithdrawDetail(row.dataset.methodLabel);
      });
    });
  }

  function openWithdrawDetail(label) {
    selectedMethodLabel = label;
    const hidden = document.getElementById('wd-payment-method');
    if (hidden) hidden.value = label;
    const labelEl = document.getElementById('wd-selected-method-label');
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll('#wd-methods-list .fund-method-row').forEach((row) => {
      row.classList.toggle('is-selected', row.dataset.methodLabel === label);
    });

    const card = document.getElementById('wd-detail-card');
    card?.classList.remove('d-none');
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadWithdrawStats() {
    const profile = await window.PrimeTradePortal?.getProfile();
    if (!profile) return;

    const fmt = window.PrimeTradePortal.formatMoney;
    const bal = document.getElementById('wd-current-balance');
    if (bal) bal.textContent = fmt(profile.balance);

    let transactions = [];
    if (window.PrimeTradeAuthStore) {
      transactions = window.PrimeTradeAuthStore.getTransactions(profile.id);
    }

    const withdrawals = transactions.filter((t) => t.type === 'withdrawal');
    const approved = withdrawals
      .filter((t) => t.status === 'approved')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const pending = withdrawals
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set('wd-total-withdrawn', fmt(approved));
    set('wd-pending-withdrawals', fmt(pending));
  }

  function bindSecureForm() {
    const form = document.getElementById('withdraw-secure-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    form.querySelector('[data-toggle-password]')?.addEventListener('click', function () {
      togglePassword(this);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('withdraw-secure-password');
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await window.PrimeTradeAuthStore.verifySessionPassword(input?.value || '');
        unlock();
        showWithdrawMain();
        await loadWithdrawStats();
        renderMethods();
        input.value = '';
      } catch (err) {
        showSecureAlert(err.message || 'Incorrect password', 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  function bindWithdrawForm() {
    const form = document.getElementById('withdraw-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedMethodLabel) {
        showFormAlert('Please select a withdrawal method first.', 'danger');
        return;
      }
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        if (typeof window.__ptcSubmitWithdraw === 'function') {
          await window.__ptcSubmitWithdraw(form);
        } else {
          showFormAlert('Withdrawal handler not loaded.', 'danger');
        }
      } catch (err) {
        showFormAlert(err.message || 'Withdrawal failed', 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function initWithdrawPage() {
    await window.PrimeTradePortalShell?.populateShell();
    bindSecureForm();
    bindWithdrawForm();

    if (isUnlocked()) {
      showWithdrawMain();
      await loadWithdrawStats();
      renderMethods();
    } else {
      showSecureGate();
    }
  }

  window.PrimeTradeWithdraw = { initWithdrawPage, loadWithdrawStats, lock: showSecureGate };

  if (document.body.dataset.portalPage === 'withdraw') {
    document.addEventListener('portal-layout-ready', () => initWithdrawPage(), { once: true });
  }
})();
