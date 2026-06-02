(function () {
  const PROVIDERS = [
    {
      id: 'metamask',
      name: 'MetaMask',
      desc: 'Connect via browser extension (Ethereum & EVM)',
      icon: 'bi-wallet2',
      color: '#f6851b',
      type: 'extension',
      defaultNetwork: 'Ethereum (ERC20)',
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      desc: 'Paste your Trust Wallet receive address',
      icon: 'bi-phone',
      color: '#3375bb',
      type: 'manual',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      desc: 'Link your Coinbase Wallet address',
      icon: 'bi-coin',
      color: '#0052ff',
      type: 'manual',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      desc: 'Enter address from any WalletConnect-compatible app',
      icon: 'bi-qr-code',
      color: '#3b99fc',
      type: 'manual',
    },
    {
      id: 'manual',
      name: 'Custom Address',
      desc: 'Manually add any supported network address',
      icon: 'bi-key',
      color: '#64b5f6',
      type: 'manual',
    },
  ];

  let selectedProvider = null;

  function shortenAddress(addr) {
    if (!addr || addr.length < 12) return addr || '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  function showAlert(message, type, target) {
    const el = document.getElementById(target || 'wallet-page-alert');
    if (!el) return;
    el.classList.remove('d-none');
    el.className = `alert-ptc alert-ptc-${type} mb-3`;
    el.textContent = message;
    if (target === 'wallet-page-alert') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function hideAlert(target) {
    document.getElementById(target || 'wallet-form-alert')?.classList.add('d-none');
    if (!target) document.getElementById('wallet-page-alert')?.classList.add('d-none');
  }

  function validateAddress(address, network) {
    const a = address.trim();
    if (a.length < 10) throw new Error('Wallet address is too short');
    if (network.includes('Ethereum') || network.includes('BNB') || network.includes('Polygon')) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
        throw new Error('Invalid EVM address. It should start with 0x followed by 40 hex characters.');
      }
    }
    if (network.includes('Bitcoin') && a.length < 26) {
      throw new Error('Invalid Bitcoin address format');
    }
    if (network.includes('TRON') && !/^T[a-zA-Z0-9]{33}$/.test(a)) {
      throw new Error('Invalid TRON address. It should start with T.');
    }
    return a;
  }

  function providerCardHtml(p) {
    const extBadge =
      p.type === 'extension'
        ? '<span class="wallet-provider-badge">Browser</span>'
        : '<span class="wallet-provider-badge wallet-provider-badge-manual">Manual</span>';
    return `<button type="button" class="wallet-provider-card" data-provider-id="${p.id}">
      <span class="wallet-provider-icon" style="background:${p.color}"><i class="bi ${p.icon}"></i></span>
      <span class="wallet-provider-body">
        <span class="wallet-provider-name">${p.name} ${extBadge}</span>
        <span class="wallet-provider-desc">${p.desc}</span>
      </span>
      <i class="bi bi-chevron-right wallet-provider-chevron" aria-hidden="true"></i>
    </button>`;
  }

  function connectedWalletHtml(w) {
    const primary = w.is_primary
      ? '<span class="badge badge-approved wallet-primary-badge">Primary</span>'
      : `<button type="button" class="btn btn-sm btn-outline-light-ptc wallet-set-primary" data-wallet-id="${w.id}">Set primary</button>`;
    return `<div class="wallet-connected-item${w.is_primary ? ' is-primary' : ''}" data-wallet-id="${w.id}">
      <div class="wallet-connected-icon"><i class="bi bi-wallet2"></i></div>
      <div class="wallet-connected-body">
        <span class="wallet-connected-name">${w.provider_name}${w.label ? ` · ${w.label}` : ''}</span>
        <span class="wallet-connected-addr" title="${w.address}">${shortenAddress(w.address)}</span>
        <span class="wallet-connected-network">${w.network}</span>
      </div>
      <div class="wallet-connected-actions">
        ${primary}
        <button type="button" class="btn btn-sm btn-outline-light-ptc wallet-disconnect" data-wallet-id="${w.id}" title="Disconnect">Disconnect</button>
      </div>
    </div>`;
  }

  function updateStatusBanner(wallets) {
    const banner = document.getElementById('wallet-status-banner');
    if (!banner) return;
    if (!wallets.length) {
      banner.classList.add('d-none');
      return;
    }
    banner.classList.remove('d-none');
    const primary = wallets.find((w) => w.is_primary) || wallets[0];
    banner.innerHTML = `<div class="wallet-status-inner">
      <i class="bi bi-check-circle-fill"></i>
      <div>
        <strong>${wallets.length} wallet${wallets.length > 1 ? 's' : ''} connected</strong>
        <span>Primary: ${primary.provider_name} (${shortenAddress(primary.address)}) on ${primary.network}</span>
      </div>
    </div>`;
  }

  function renderConnected(wallets) {
    const list = document.getElementById('wallet-connected-list');
    const empty = document.getElementById('wallet-connected-empty');
    if (!list || !empty) return;

    if (!wallets.length) {
      list.innerHTML = '';
      empty.classList.remove('d-none');
      updateStatusBanner([]);
      return;
    }

    empty.classList.add('d-none');
    list.innerHTML = wallets.map(connectedWalletHtml).join('');
    updateStatusBanner(wallets);
  }

  function showManualPanel(provider) {
    selectedProvider = provider;
    const panel = document.getElementById('wallet-manual-panel');
    const title = document.getElementById('wallet-manual-title');
    const providerInput = document.getElementById('wallet-provider-id');
    const network = document.getElementById('wallet-network');

    if (title) title.textContent = `Connect ${provider.name}`;
    if (providerInput) providerInput.value = provider.id;
    if (network && provider.defaultNetwork) network.value = provider.defaultNetwork;

    panel?.classList.remove('d-none');
    hideAlert();
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideManualPanel() {
    selectedProvider = null;
    document.getElementById('wallet-manual-panel')?.classList.add('d-none');
    document.getElementById('wallet-connect-form')?.reset();
    hideAlert();
  }

  async function connectMetaMask() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error(
        'MetaMask not detected. Install the MetaMask extension, or choose another wallet and paste your address.'
      );
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts?.[0];
    if (!address) throw new Error('No account returned from MetaMask');

    const session = await window.PrimeTradeAuth?.getSession();
    if (!session || !window.PrimeTradeAuthStore) throw new Error('Not signed in');

    window.PrimeTradeAuthStore.connectWallet(session.user.id, {
      provider: 'metamask',
      provider_name: 'MetaMask',
      address,
      network: 'Ethereum (ERC20)',
      label: 'MetaMask',
    });

    return address;
  }

  async function submitManualConnect(form) {
    const provider = PROVIDERS.find((p) => p.id === form.provider.value) || selectedProvider;
    if (!provider) throw new Error('Select a wallet provider');

    const network = form.network.value;
    const address = validateAddress(form.address.value, network);
    const label = form.label.value.trim();

    const session = await window.PrimeTradeAuth?.getSession();
    if (!session || !window.PrimeTradeAuthStore) throw new Error('Not signed in');

    window.PrimeTradeAuthStore.connectWallet(session.user.id, {
      provider: provider.id,
      provider_name: provider.name,
      address,
      network,
      label: label || provider.name,
    });
  }

  async function refreshWallets() {
    const session = await window.PrimeTradeAuth?.getSession();
    if (!session || !window.PrimeTradeAuthStore) return [];
    const wallets = window.PrimeTradeAuthStore.getConnectedWallets(session.user.id);
    renderConnected(wallets);
    return wallets;
  }

  async function handleProviderClick(providerId) {
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;

    if (provider.type === 'extension') {
      try {
        await connectMetaMask();
        showAlert('MetaMask connected successfully.', 'success', 'wallet-page-alert');
        hideManualPanel();
        await refreshWallets();
      } catch (err) {
        showManualPanel(provider);
        showAlert(err.message || 'Could not connect MetaMask', 'danger', 'wallet-form-alert');
      }
      return;
    }

    showManualPanel(provider);
  }

  function bindEvents() {
    const grid = document.getElementById('wallet-providers-grid');
    grid?.addEventListener('click', (e) => {
      const card = e.target.closest('.wallet-provider-card');
      if (!card) return;
      handleProviderClick(card.dataset.providerId);
    });

    document.getElementById('wallet-manual-cancel')?.addEventListener('click', hideManualPanel);

    document.getElementById('wallet-connect-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('wallet-connect-submit');
      if (btn) btn.disabled = true;
      try {
        await submitManualConnect(e.target);
        showAlert('Wallet connected successfully.', 'success', 'wallet-page-alert');
        e.target.reset();
        hideManualPanel();
        await refreshWallets();
      } catch (err) {
        showAlert(err.message || 'Could not connect wallet', 'danger', 'wallet-form-alert');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('wallet-connected-list')?.addEventListener('click', async (e) => {
      const disconnect = e.target.closest('.wallet-disconnect');
      const setPrimary = e.target.closest('.wallet-set-primary');
      const session = await window.PrimeTradeAuth?.getSession();
      if (!session || !window.PrimeTradeAuthStore) return;

      if (disconnect) {
        const id = disconnect.dataset.walletId;
        const ok = confirm('Disconnect this wallet from your account?');
        if (!ok) return;
        window.PrimeTradeAuthStore.disconnectWallet(session.user.id, id);
        await refreshWallets();
        showAlert('Wallet disconnected.', 'success', 'wallet-page-alert');
        return;
      }

      if (setPrimary) {
        window.PrimeTradeAuthStore.setPrimaryWallet(session.user.id, setPrimary.dataset.walletId);
        await refreshWallets();
        showAlert('Primary wallet updated.', 'success', 'wallet-page-alert');
      }
    });
  }

  async function initWalletPage() {
    await window.PrimeTradePortalShell?.populateShell();

    const profile = await window.PrimeTradePortal?.getProfile();
    const bal = document.getElementById('wallet-account-balance');
    if (bal && profile) {
      bal.textContent = window.PrimeTradePortal.formatMoney(profile.balance);
    }

    const grid = document.getElementById('wallet-providers-grid');
    if (grid) grid.innerHTML = PROVIDERS.map(providerCardHtml).join('');

    bindEvents();
    await refreshWallets();
  }

  window.PrimeTradeWallet = { initWalletPage };

  if (document.body.dataset.portalPage === 'wallet') {
    document.addEventListener('portal-layout-ready', () => initWalletPage(), { once: true });
  }
})();
