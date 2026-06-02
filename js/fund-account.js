(function () {
  const DEPOSIT_METHODS = [
    { id: 'bei', label: 'BEI', color: '#e8b923', letter: 'B' },
    { id: 'ada', label: 'ADA', color: '#0033ad', letter: 'A' },
    { id: 'matic', label: 'MATIC POLYGON', color: '#8247e5', letter: 'M' },
    { id: 'link', label: 'LINK', color: '#2a5ada', letter: 'L' },
    { id: 'usdc', label: 'USDC', color: '#2775ca', letter: 'U' },
    { id: 'bnb', label: 'BNB', color: '#f3ba2f', letter: 'B' },
    { id: 'sol', label: 'SOLANA', color: '#9945ff', letter: 'S' },
    { id: 'usdt_erc20', label: 'USDT (ERC20)', color: '#26a17b', letter: '₮' },
    { id: 'usdt_trc20', label: 'USDT (TRC20)', color: '#26a17b', letter: '₮' },
    { id: 'btc', label: 'BITCOIN', color: '#f7931a', letter: '₿' },
  ];

  let selectedMethodId = '';

  function renderMethods() {
    const list = document.getElementById('fund-methods-list');
    if (!list) return;
    list.innerHTML = DEPOSIT_METHODS.map(
      (m) =>
        `<div class="fund-method-row" data-method-id="${m.id}" data-method-label="${m.label}">
          <div class="fund-method-info">
            <span class="fund-method-icon" style="background:${m.color}">${m.letter}</span>
            <span class="fund-method-name">${m.label}</span>
          </div>
          <button type="button" class="btn btn-sm btn-gradient fund-select-btn">Select</button>
        </div>`
    ).join('');

    list.querySelectorAll('.fund-select-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const row = btn.closest('.fund-method-row');
        if (!row) return;
        selectMethod(row.dataset.methodId, row.dataset.methodLabel);
      });
    });
  }

  function selectMethod(id, label) {
    selectedMethodId = id;
    const hidden = document.getElementById('fund-payment-method');
    if (hidden) hidden.value = label;

    document.querySelectorAll('.fund-method-row').forEach((row) => {
      row.classList.toggle('is-selected', row.dataset.methodId === id);
      const b = row.querySelector('.fund-select-btn');
      if (b) {
        b.textContent = row.dataset.methodId === id ? 'Selected' : 'Select';
      }
    });
    updateProceedState();
  }

  function updateProceedState() {
    const amount = parseFloat(document.getElementById('fund-amount')?.value);
    const btn = document.getElementById('fund-proceed-btn');
    if (!btn) return;
    const ok = selectedMethodId && !isNaN(amount) && amount >= 1;
    btn.disabled = !ok;
  }

  function showFormAlert(message, type) {
    const el = document.getElementById('deposit-form-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
  }

  async function loadFundAccount() {
    await window.PrimeTradePortalShell?.populateShell();
    const profile = await window.PrimeTradePortal?.getProfile();
    if (!profile) return;

    const balance = window.PrimeTradePortal.formatMoney(profile.balance);
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText('fund-current-balance', balance);

    let transactions = [];
    if (window.PrimeTradeAuth?.useLocalAuth && window.PrimeTradeAuthStore) {
      transactions = window.PrimeTradeAuthStore.getTransactions(profile.id);
    }

    const deposits = transactions.filter((t) => t.type === 'deposit');
    const approved = deposits
      .filter((t) => t.status === 'approved')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const pending = deposits
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    setText('fund-total-deposited', window.PrimeTradePortal.formatMoney(approved));
    setText('fund-pending-deposits', window.PrimeTradePortal.formatMoney(pending));

    renderMethods();

    const amountInput = document.getElementById('fund-amount');
    amountInput?.addEventListener('input', updateProceedState);

    const form = document.getElementById('deposit-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedMethodId) {
          showFormAlert('Please select a deposit method.', 'danger');
          return;
        }
        const btn = document.getElementById('fund-proceed-btn');
        if (btn) btn.disabled = true;
        try {
          if (typeof window.__ptcSubmitDeposit === 'function') {
            await window.__ptcSubmitDeposit(form);
          } else {
            showFormAlert('Payment handler not loaded. Refresh the page.', 'danger');
          }
        } catch (err) {
          showFormAlert(err.message || 'Deposit failed', 'danger');
        } finally {
          updateProceedState();
        }
      });
    }
  }

  function resetFormState() {
    selectedMethodId = '';
    document.querySelectorAll('.fund-method-row').forEach((row) => {
      row.classList.remove('is-selected');
      const b = row.querySelector('.fund-select-btn');
      if (b) b.textContent = 'Select';
    });
    const hidden = document.getElementById('fund-payment-method');
    if (hidden) hidden.value = '';
    updateProceedState();
  }

  window.PrimeTradeFundAccount = { loadFundAccount, resetFormState, DEPOSIT_METHODS };

  if (document.body.dataset.portalPage === 'deposit') {
    document.addEventListener('portal-layout-ready', () => loadFundAccount(), { once: true });
  }
})();
