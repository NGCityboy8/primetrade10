(function () {
  const localStore = () => window.PrimeTradeAuthStore;

  async function getProfile() {
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session) return null;

    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      return localStore().getProfile(session.user.id);
    }

    const sb = window.getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*, investment_plans:active_plan_id(name, slug)')
      .eq('id', session.user.id)
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    return data;
  }

  function formatMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  }

  function statusBadge(status) {
    const map = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
  }

  async function requireKycApproved() {
    const profile = await getProfile();
    if (profile?.kyc_status !== 'approved') {
      alert('Please complete KYC verification before this action.');
      location.href = window.PrimeTradeAuth.portalUrl('kyc.html');
      return false;
    }
    return true;
  }

  function copyText(text, btn) {
    navigator.clipboard?.writeText(text).then(() => {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    });
  }

  function dashInitials(name, username) {
    const src = (name || username || '?').trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLowerCase();
    return src.slice(0, 2).toLowerCase();
  }

  async function loadDashboard() {
    await window.PrimeTradePortalShell?.populateShell();
    const profile = await getProfile();
    if (!profile) return;
    const el = (id) => document.getElementById(id);
    const sb = window.getSupabase();
    const dash = window.PrimeTradeDashboard;
    const session = await window.PrimeTradeAuth?.getSession();
    const username = session?.user?.username || profile.username || 'user';
    const displayName = profile.full_name || username;
    const balanceStr = formatMoney(profile.balance);

    const setText = (id, text) => {
      const node = el(id);
      if (node) node.textContent = text;
    };

    setText('dash-display-name', displayName);
    setText('dash-account-type', dash?.ACCOUNT_LABELS?.[profile.account_type] || 'Personal Trading Account');
    setText('dash-balance', balanceStr);
    setText('dash-aside-balance', balanceStr);
    setText('dash-aside-name', displayName);
    setText('dash-aside-username', username);
    setText('dash-bonus', formatMoney(profile.referral_earnings ?? 0));

    const asideAvatar = el('dash-aside-avatar');
    if (asideAvatar) asideAvatar.textContent = dashInitials(displayName, username);

    const statusPill = el('dash-account-status');
    if (statusPill) {
      if (profile.kyc_status === 'approved') {
        statusPill.textContent = 'Account Active';
        statusPill.className = 'dash-status-pill';
      } else if (profile.kyc_status === 'rejected') {
        statusPill.textContent = 'Verification Required';
        statusPill.className = 'dash-status-pill rejected';
      } else {
        statusPill.textContent = 'Pending Verification';
        statusPill.className = 'dash-status-pill pending';
      }
    }

    let refInfo = null;
    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      refInfo = localStore().getReferralInfo(profile.id);
    }
    setText('dash-referrals', String(refInfo?.total_referrals ?? 0));
    setText('dash-ref-earnings', formatMoney(refInfo?.referral_earnings ?? 0));
    const refLink = el('dash-ref-link');
    if (refLink && refInfo?.referral_link) refLink.value = refInfo.referral_link;
    const copyBtn = document.getElementById('dash-copy-ref');
    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = '1';
      copyBtn.addEventListener('click', (e) => {
        if (refInfo?.referral_link) copyText(refInfo.referral_link, e.currentTarget);
      });
    }

    let allTx = [];
    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      allTx = localStore()
        .getTransactions(profile.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sb) {
      const res = await sb
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      allTx = res.data || [];
    }

    const sumApproved = dash?.sumApproved || (() => 0);
    setText('dash-deposits-total', formatMoney(sumApproved(allTx, 'deposit')));
    setText('dash-withdrawals-total', formatMoney(sumApproved(allTx, 'withdrawal')));
    setText('dash-profit', formatMoney(profile.profit ?? 0));

    const activity = el('dash-activity-list');
    if (activity) {
      const recent = allTx.slice(0, 6);
      if (!recent.length) {
        activity.innerHTML = '<p class="dash-activity-empty">No recent activity.</p>';
      } else {
        activity.innerHTML = recent
          .map(
            (t) =>
              `<div class="dash-activity-item">
                <span class="text-capitalize">${t.type}</span>
                <span>${formatMoney(t.amount)} ${statusBadge(t.status)}</span>
              </div>`
          )
          .join('');
      }
    }

    const investBox = el('dash-investments');
    const investCount = el('dash-invest-count');
    const planName = profile.investment_plans?.name;
    if (investCount) investCount.textContent = planName ? '(1)' : '(0)';
    if (investBox) {
      if (planName) {
        investBox.className = '';
        investBox.innerHTML = `<div class="dash-invest-item">
          <div><strong>${planName}</strong><div class="text-muted-ptc small">Active plan</div></div>
          <a href="plans.html" class="btn btn-sm btn-outline-light-ptc">Manage</a>
        </div>`;
      } else {
        investBox.className = 'dash-invest-empty';
        investBox.innerHTML = `<i class="bi bi-briefcase"></i>
          <p>No active investments</p>
          <a href="plans.html" class="btn btn-outline-light-ptc btn-sm">Browse Plans</a>`;
      }
    }

    dash?.renderAssets?.();

    const banner = document.getElementById('kyc-banner');
    if (banner && profile.kyc_status !== 'approved') {
      banner.classList.remove('d-none');
      banner.className = `kyc-status-banner ${profile.kyc_status} dash-kyc-banner`;
      banner.innerHTML = `<strong>KYC:</strong> ${profile.kyc_status}. ${
        profile.kyc_status === 'rejected'
          ? 'Please re-upload documents.'
          : 'Upload documents to verify your account.'
      } <a href="kyc.html" class="ms-2">Complete KYC →</a>`;
    } else if (banner) {
      banner.classList.add('d-none');
    }

    dash?.loadMarketOverview?.();
  }

  async function loadReferrals() {
    await window.PrimeTradePortalShell?.populateShell();
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session || !localStore()) return;
    const info = localStore().getReferralInfo(session.user.id);
    if (!info) return;

    const linkInput = document.getElementById('referral-link-input');
    if (linkInput) linkInput.value = info.referral_link;

    const setText = (id, val) => {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };

    setText('referral-id-display', info.referral_id);
    setText('referral-sponsor', info.sponsor_username || '—');
    setText('ref-total-count', `${info.total_referrals} Users`);
    setText('ref-total-earnings', formatMoney(info.referral_earnings));

    const tbody = document.getElementById('referrals-table-body');
    if (tbody) {
      if (!info.referrals.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-muted-ptc">No referrals yet.</td></tr>';
      } else {
        tbody.innerHTML = info.referrals
          .map(
            (r) => `<tr>
            <td>${r.full_name}</td>
            <td>${r.level}</td>
            <td>${r.parent}</td>
            <td>${r.status}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
          </tr>`
          )
          .join('');
      }
    }

    document.getElementById('copy-referral-link')?.addEventListener('click', (e) => {
      copyText(info.referral_link, e.currentTarget);
    });
    document.getElementById('copy-referral-id')?.addEventListener('click', () => {
      copyText(info.referral_id);
    });
  }

  async function loadPlans() {
    let plans;
    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      plans = localStore().getPlans();
    } else {
      const sb = window.getSupabase();
      const { data } = await sb.from('investment_plans').select('*').order('min_deposit');
      plans = data;
    }
    const container = document.getElementById('plans-container');
    if (!container || !plans) return;
    container.innerHTML = plans
      .map(
        (p) => `
      <div class="col-md-6 col-lg-3">
        <div class="card-ptc plan-card h-100">
          <h3 class="plan-name">${p.name}</h3>
          <ul>
            <li>Min. Deposit: ${formatMoney(p.min_deposit)}</li>
            <li>Max. Deposit: ${formatMoney(p.max_deposit)}</li>
            <li>Trade Duration: ${p.duration_days} Days</li>
          </ul>
          <button type="button" class="btn btn-gradient w-100 subscribe-plan" data-plan-id="${p.id}" data-min="${p.min_deposit}" data-max="${p.max_deposit}" data-duration="${p.duration_days}">Subscribe</button>
        </div>
      </div>`
      )
      .join('');

    container.querySelectorAll('.subscribe-plan').forEach((btn) => {
      btn.addEventListener('click', () =>
        subscribeToPlan({
          planId: btn.dataset.planId,
          min: btn.dataset.min,
          max: btn.dataset.max,
          duration: btn.dataset.duration,
        })
      );
    });
  }

  async function subscribeToPlan(dataset) {
    if (!(await requireKycApproved())) return;
    const amount = prompt(
      `Enter deposit amount (${formatMoney(dataset.min)} - ${formatMoney(dataset.max)}):`
    );
    if (!amount) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num < parseFloat(dataset.min) || num > parseFloat(dataset.max)) {
      alert('Amount must be within plan limits.');
      return;
    }
    const session = await window.PrimeTradeAuth.getSession();
    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      try {
        localStore().subscribeToPlan(session.user.id, dataset.planId, num, dataset.duration);
      } catch (err) {
        alert(err.message);
        return;
      }
    } else {
      const sb = window.getSupabase();
      const ends = new Date();
      ends.setDate(ends.getDate() + parseInt(dataset.duration, 10));
      const { error } = await sb.from('plan_subscriptions').insert({
        user_id: session.user.id,
        plan_id: dataset.planId,
        deposit_amount: num,
        ends_at: ends.toISOString(),
      });
      if (error) {
        alert(error.message);
        return;
      }
      await sb.from('profiles').update({ active_plan_id: dataset.planId }).eq('id', session.user.id);
    }
    alert('Plan subscribed successfully.');
    location.reload();
  }

  async function submitTransaction(type, form) {
    if (!(await requireKycApproved())) return;
    const session = await window.PrimeTradeAuth.getSession();
    const amount = parseFloat(form.amount.value);
    const profile = await getProfile();
    if (type === 'withdrawal' && amount > (profile?.balance || 0)) {
      alert('Insufficient balance.');
      return;
    }
    if (window.PrimeTradeAuth?.useLocalAuth && localStore()) {
      try {
        localStore().addTransaction(session.user.id, {
          type,
          amount,
          payment_method: form.payment_method.value,
          reference_note: form.reference_note?.value || null,
        });
      } catch (err) {
        showAlert(form, err.message, 'danger');
        return;
      }
    } else {
      const sb = window.getSupabase();
      const { error } = await sb.from('transactions').insert({
        user_id: session.user.id,
        type,
        amount,
        payment_method: form.payment_method.value,
        reference_note: form.reference_note?.value || null,
      });
      if (error) {
        showAlert(form, error.message, 'danger');
        return;
      }
    }
    if (
      type === 'deposit' &&
      document.getElementById('deposit-form-alert')
    ) {
      return;
    }
    if (
      type === 'withdrawal' &&
      document.getElementById('withdraw-form-alert')
    ) {
      return;
    }
    showAlert(form, `${type} request submitted. Pending approval.`, 'success');
    form.reset();
  }

  async function loadTransactions() {
    return window.PrimeTradeTransactions?.initTransactionsPage?.();
  }

  function showAlert(form, message, type) {
    const fundAlert = document.getElementById('deposit-form-alert');
    if (fundAlert) {
      fundAlert.classList.remove('d-none');
      fundAlert.className = `alert-ptc alert-ptc-${type} mb-3`;
      fundAlert.textContent = message;
      return;
    }
    let box = form.querySelector('.form-alert');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-alert alert-ptc mt-3';
      form.prepend(box);
    }
    box.className = `form-alert alert-ptc alert-ptc-${type} mt-3`;
    box.textContent = message;
  }

  async function submitWithdrawForm(form) {
    await submitTransaction('withdrawal', form);
    showAlert(form, 'Withdrawal request submitted. Pending approval.', 'success');
    form.reset();
    document.getElementById('wd-detail-card')?.classList.add('d-none');
    if (window.PrimeTradeWithdraw?.loadWithdrawStats) {
      await window.PrimeTradeWithdraw.loadWithdrawStats();
    } else {
      await window.PrimeTradeWithdraw?.initWithdrawPage?.();
    }
  }

  window.__ptcSubmitWithdraw = submitWithdrawForm;

  async function submitDepositForm(form) {
    await submitTransaction('deposit', form);
    showAlert(form, 'Deposit request submitted. Pending approval.', 'success');
    form.reset();
    window.PrimeTradeFundAccount?.resetFormState?.();
    await window.PrimeTradeFundAccount?.loadFundAccount?.();
  }

  window.__ptcSubmitDeposit = submitDepositForm;

  async function initPortalPage() {
    const page = document.body.dataset.portalPage;
    if (page !== 'dashboard' && page !== 'referrals') {
      await window.PrimeTradePortalShell?.populateShell();
    }
    if (page === 'dashboard') await loadDashboard();
    if (page === 'deposit') await window.PrimeTradeFundAccount?.loadFundAccount?.();
    if (page === 'withdraw') await window.PrimeTradeWithdraw?.initWithdrawPage?.();
    if (page === 'stocks') await window.PrimeTradeStocks?.initStocksPage?.();
    if (page === 'copy-trading') await window.PrimeTradeCopyTrading?.initCopyTradingPage?.();
    if (page === 'referrals') await loadReferrals();
    if (page === 'plans') await loadPlans();
    if (page === 'transactions') await loadTransactions();
  }

  function bootPortal() {
    window.PrimeTradeAuth?.requireAuth().then(() => initPortalPage());
  }

  if (/\/portal\//.test(location.pathname)) {
    if (document.body.classList.contains('portal-app')) {
      document.addEventListener('portal-layout-ready', bootPortal, { once: true });
    } else {
      bootPortal();
    }
  }

  window.PrimeTradePortal = {
    getProfile,
    formatMoney,
    loadDashboard,
    loadPlans,
    loadTransactions,
  };
})();
