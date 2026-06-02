(function () {
  const USERS_KEY = 'ptc-users';
  const SESSION_KEY = 'ptc-session';
  const VERIFY_KEY = 'ptc-verify-code';
  const VERIFY_OK_KEY = 'ptc-verify-passed';

  const DEFAULT_PLANS = [
    { id: 'starter', slug: 'starter', name: 'Starter', min_deposit: 500, max_deposit: 4999, duration_days: 30 },
    { id: 'growth', slug: 'growth', name: 'Growth', min_deposit: 5000, max_deposit: 24999, duration_days: 60 },
    { id: 'premium', slug: 'premium', name: 'Premium', min_deposit: 25000, max_deposit: 99999, duration_days: 90 },
    { id: 'elite', slug: 'elite', name: 'Elite', min_deposit: 100000, max_deposit: 500000, duration_days: 180 },
  ];

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    scheduleUsersSync(users);
  }

  const USERS_SYNCED_KEY = 'ptc-users-synced';
  const APP_USERS_TABLE = 'app_users';
  let syncInFlight = null;

  function isSupabaseStorageMode() {
    return (window.PRIME_TRADE_CONFIG?.STORAGE_MODE || 'supabase') === 'supabase';
  }

  function getSupabaseClient() {
    return window.getSupabase?.() || null;
  }

  function isSupabaseSyncEnabled() {
    return !!getSupabaseClient();
  }

  function toDbUser(user) {
    return {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash || null,
      password_salt: user.password_salt || null,
      password_algo: user.password_algo || null,
      full_name: user.full_name || '',
      country: user.country || '',
      phone: user.phone || '',
      account_type: user.account_type || 'personal',
      referral_id: user.referral_id || '',
      sponsor_username: user.sponsor_username || null,
      referral_earnings: user.referral_earnings || 0,
      kyc_status: user.kyc_status || 'pending',
      balance: user.balance || 0,
      active_plan_id: user.active_plan_id || null,
      active_plan_deposit: user.active_plan_deposit || null,
      active_plan_ends: user.active_plan_ends || null,
      role: user.role || 'user',
      is_disabled: !!user.is_disabled,
      transactions: user.transactions || [],
      kyc_documents: user.kyc_documents || [],
      connected_wallets: user.connected_wallets || [],
      stock_holdings: user.stock_holdings || [],
      copy_investments: user.copy_investments || [],
      ai_bot_investments: user.ai_bot_investments || [],
      roi_history: user.roi_history || [],
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
    };
  }

  function fromDbUser(row) {
    return {
      id: row.id,
      username: row.username,
      password_hash: row.password_hash,
      password_salt: row.password_salt,
      password_algo: row.password_algo,
      full_name: row.full_name || '',
      country: row.country || '',
      phone: row.phone || '',
      account_type: row.account_type || 'personal',
      referral_id: row.referral_id || '',
      sponsor_username: row.sponsor_username || null,
      referral_earnings: row.referral_earnings || 0,
      kyc_status: row.kyc_status || 'pending',
      balance: row.balance || 0,
      active_plan_id: row.active_plan_id || null,
      active_plan_deposit: row.active_plan_deposit || null,
      active_plan_ends: row.active_plan_ends || null,
      role: row.role || 'user',
      is_disabled: !!row.is_disabled,
      transactions: row.transactions || [],
      kyc_documents: row.kyc_documents || [],
      connected_wallets: row.connected_wallets || [],
      stock_holdings: row.stock_holdings || [],
      copy_investments: row.copy_investments || [],
      ai_bot_investments: row.ai_bot_investments || [],
      roi_history: row.roi_history || [],
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  async function syncUsersToSupabase(users) {
    const sb = getSupabaseClient();
    if (!sb || !Array.isArray(users) || !users.length) return;
    const payload = users.map(toDbUser);
    const { error } = await sb.from(APP_USERS_TABLE).upsert(payload, { onConflict: 'id' });
    if (!error) localStorage.setItem(USERS_SYNCED_KEY, '1');
  }

  function scheduleUsersSync(users) {
    if (!isSupabaseSyncEnabled()) return;
    if (syncInFlight) return;
    syncInFlight = Promise.resolve()
      .then(() => syncUsersToSupabase(users))
      .catch(() => {})
      .finally(() => {
        syncInFlight = null;
      });
  }

  async function hydrateUsersFromSupabase() {
    if (!isSupabaseStorageMode()) return;
    const sb = getSupabaseClient();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from(APP_USERS_TABLE)
        .select('*')
        .order('created_at', { ascending: true });
      if (error || !Array.isArray(data)) return;
      if (data.length) {
        localStorage.setItem(USERS_KEY, JSON.stringify(data.map(fromDbUser)));
        localStorage.setItem(USERS_SYNCED_KEY, '1');
      }
    } catch {
      // Keep local cache when Supabase is unreachable.
    }
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getCrypto() {
    return typeof globalThis !== 'undefined' ? globalThis.crypto : window.crypto;
  }

  function newId() {
    const c = getCrypto();
    if (typeof c?.randomUUID === 'function') {
      return c.randomUUID();
    }
    if (typeof c?.getRandomValues === 'function') {
      const bytes = c.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bytesToHex(bytes);
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      const v = ch === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** Web Crypto subtle is only available in secure contexts (HTTPS or localhost). */
  function hasSubtleCrypto() {
    return !!getCrypto()?.subtle;
  }

  function randomSaltHex() {
    const c = getCrypto();
    if (c?.getRandomValues) {
      return bytesToHex(c.getRandomValues(new Uint8Array(16)));
    }
    let s = '';
    for (let i = 0; i < 32; i += 1) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  /* Pure-JS SHA-256 for HTTP / file:// where crypto.subtle is unavailable */
  function sha256Hex(str) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const bytes = new TextEncoder().encode(str);
    const l = bytes.length;
    const withLen = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    withLen.set(bytes);
    withLen[l] = 0x80;
    const view = new DataView(withLen.buffer);
    view.setUint32(withLen.length - 4, l * 8, false);
    const w = new Uint32Array(64);
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;
    for (let off = 0; off < withLen.length; off += 64) {
      for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i += 1) {
        const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
        const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;
      for (let i = 0; i < 64; i += 1) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => n.toString(16).padStart(8, '0')).join('');
  }

  function hashPasswordLegacy(password, saltHex) {
    const salt = saltHex || randomSaltHex();
    let hash = `${salt}:${password}`;
    for (let i = 0; i < 15000; i += 1) {
      hash = sha256Hex(hash);
    }
    return { hash, salt, algo: 'sha256-legacy' };
  }

  async function hashPasswordSubtle(password, saltHex) {
    const c = getCrypto();
    const salt = saltHex
      ? Uint8Array.from(saltHex.match(/.{1,2}/g).map((h) => parseInt(h, 16)))
      : c.getRandomValues(new Uint8Array(16));
    const keyMaterial = await c.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derived = await c.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return { hash: bytesToHex(new Uint8Array(derived)), salt: bytesToHex(salt), algo: 'pbkdf2' };
  }

  async function hashPassword(password, saltHex, algo) {
    const useLegacy = algo === 'sha256-legacy' || (!algo && !hasSubtleCrypto());
    if (useLegacy) return hashPasswordLegacy(password, saltHex);
    if (!hasSubtleCrypto()) return hashPasswordLegacy(password, saltHex);
    try {
      return await hashPasswordSubtle(password, saltHex);
    } catch {
      return hashPasswordLegacy(password, saltHex);
    }
  }

  async function verifyPassword(password, saltHex, hashHex, algo) {
    const storedAlgo = algo || 'pbkdf2';
    let hash;
    if (storedAlgo === 'pbkdf2') {
      if (!hasSubtleCrypto()) {
        return false;
      }
      ({ hash } = await hashPasswordSubtle(password, saltHex));
    } else {
      ({ hash } = hashPasswordLegacy(password, saltHex));
    }
    return hash === hashHex;
  }

  function generateVerifyCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function setVerifyCode() {
    const code = generateVerifyCode();
    sessionStorage.setItem(VERIFY_KEY, code);
    return code;
  }

  function getVerifyCode() {
    return sessionStorage.getItem(VERIFY_KEY);
  }

  function markVerified() {
    sessionStorage.setItem(VERIFY_OK_KEY, '1');
    sessionStorage.removeItem(VERIFY_KEY);
  }

  function isVerified() {
    return sessionStorage.getItem(VERIFY_OK_KEY) === '1';
  }

  function clearVerification() {
    sessionStorage.removeItem(VERIFY_OK_KEY);
    sessionStorage.removeItem(VERIFY_KEY);
  }

  function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      const user = readUsers().find((u) => u.id === session.userId);
      if (!user) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return { user: toPublicUser(user) };
    } catch {
      return null;
    }
  }

  function setSession(userId) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: Date.now() }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function toPublicUser(user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role || 'user',
      user_metadata: { full_name: user.full_name },
    };
  }

  function assertAdmin(actorId) {
    const actor = findById(actorId);
    if (!actor || actor.role !== 'admin') {
      throw new Error('Admin access required');
    }
    return actor;
  }

  function toAdminUserRow(user) {
    const txs = user.transactions || [];
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name || '',
      phone: user.phone || '',
      country: user.country || '',
      account_type: user.account_type || 'personal',
      balance: user.balance || 0,
      kyc_status: user.kyc_status || 'pending',
      role: user.role || 'user',
      referral_earnings: user.referral_earnings || 0,
      sponsor_username: user.sponsor_username || null,
      active_plan_id: user.active_plan_id || null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      transaction_count: txs.length,
      pending_tx_count: txs.filter((t) => t.status === 'pending').length,
      is_disabled: !!user.is_disabled,
    };
  }

  async function ensureDefaultAdmin() {
    if (readUsers().some((u) => u.role === 'admin')) {
      return { created: false };
    }
    const { hash, salt, algo } = await hashPassword('admin');
    const user = {
      id: newId(),
      username: 'admin',
      password_hash: hash,
      password_salt: salt,
      password_algo: algo,
      full_name: 'Platform Admin',
      country: '',
      phone: '',
      account_type: 'personal',
      referral_id: '',
      sponsor_username: null,
      referral_earnings: 0,
      kyc_status: 'approved',
      balance: 0,
      active_plan_id: null,
      role: 'admin',
      transactions: [],
      kyc_documents: [],
      connected_wallets: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const users = readUsers();
    users.push(user);
    writeUsers(users);
    return { created: true, username: 'admin', password: 'admin' };
  }

  async function migrateAdminPasswordToDefault() {
    const MIGRATE_KEY = 'ptc-admin-password-v1';
    if (localStorage.getItem(MIGRATE_KEY)) return;
    const admin = readUsers().find(
      (u) => u.username.toLowerCase() === 'admin' && u.role === 'admin'
    );
    if (!admin) return;
    const { hash, salt, algo } = await hashPassword('admin');
    updateUser(admin.id, { password_hash: hash, password_salt: salt, password_algo: algo });
    localStorage.setItem(MIGRATE_KEY, '1');
  }

  function isAdmin(userId) {
    return findById(userId)?.role === 'admin';
  }

  function listUsers() {
    return readUsers().map(toAdminUserRow).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function getAdminStats() {
    const users = readUsers();
    let pendingTx = 0;
    let pendingKyc = 0;
    let totalBalance = 0;
    users.forEach((u) => {
      totalBalance += u.balance || 0;
      if ((u.kyc_status || 'pending') === 'pending') pendingKyc += 1;
      (u.transactions || []).forEach((t) => {
        if (t.status === 'pending') pendingTx += 1;
      });
    });
    return {
      total_users: users.length,
      pending_transactions: pendingTx,
      pending_kyc: pendingKyc,
      total_balance: totalBalance,
      admin_count: users.filter((u) => u.role === 'admin').length,
    };
  }

  function listPendingTransactions() {
    const items = [];
    readUsers().forEach((u) => {
      (u.transactions || []).forEach((tx) => {
        if (tx.status === 'pending') {
          items.push({
            ...tx,
            user_id: u.id,
            username: u.username,
            full_name: u.full_name || u.username,
            user_balance: u.balance || 0,
          });
        }
      });
    });
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function getUserForAdmin(userId) {
    const user = findById(userId);
    if (!user) return null;
    return {
      ...toAdminUserRow(user),
      transactions: [...(user.transactions || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
      kyc_documents: user.kyc_documents || [],
      stock_holdings: user.stock_holdings || [],
      copy_investments: user.copy_investments || [],
      ai_bot_investments: user.ai_bot_investments || [],
    };
  }

  function adminUpdateUser(actorId, targetUserId, patch) {
    assertAdmin(actorId);
    const target = findById(targetUserId);
    if (!target) throw new Error('User not found');

    const allowed = {};
    if (patch.full_name !== undefined) allowed.full_name = String(patch.full_name).trim();
    if (patch.phone !== undefined) allowed.phone = String(patch.phone).trim();
    if (patch.country !== undefined) allowed.country = String(patch.country).trim();
    if (patch.account_type !== undefined) allowed.account_type = patch.account_type;
    if (patch.kyc_status !== undefined) {
      const kyc = patch.kyc_status;
      if (!['pending', 'approved', 'rejected'].includes(kyc)) throw new Error('Invalid KYC status');
      allowed.kyc_status = kyc;
    }
    if (patch.role !== undefined) {
      const role = patch.role;
      if (!['user', 'admin'].includes(role)) throw new Error('Invalid role');
      if (target.role === 'admin' && role !== 'admin') {
        const admins = readUsers().filter((u) => u.role === 'admin');
        if (admins.length <= 1) throw new Error('Cannot remove the last admin account');
      }
      allowed.role = role;
    }
    if (patch.balance !== undefined) {
      const bal = parseFloat(patch.balance);
      if (isNaN(bal) || bal < 0) throw new Error('Balance must be zero or greater');
      allowed.balance = bal;
    }
    if (patch.referral_earnings !== undefined) {
      const ref = parseFloat(patch.referral_earnings);
      if (isNaN(ref) || ref < 0) throw new Error('Referral earnings must be zero or greater');
      allowed.referral_earnings = ref;
    }
    if (patch.is_disabled !== undefined) {
      if (target.id === actorId && patch.is_disabled) {
        throw new Error('You cannot disable your own admin account');
      }
      allowed.is_disabled = !!patch.is_disabled;
    }
    if (patch.active_plan_id !== undefined) {
      allowed.active_plan_id = patch.active_plan_id || null;
    }

    return toAdminUserRow(updateUser(targetUserId, allowed));
  }

  function adminSetTransactionStatus(actorId, targetUserId, txId, status) {
    assertAdmin(actorId);
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Status must be approved or rejected');
    }

    const user = findById(targetUserId);
    if (!user) throw new Error('User not found');

    const transactions = [...(user.transactions || [])];
    const idx = transactions.findIndex((t) => t.id === txId);
    if (idx < 0) throw new Error('Transaction not found');

    const tx = transactions[idx];
    if (tx.status !== 'pending') {
      throw new Error('Only pending transactions can be updated');
    }

    let balance = user.balance || 0;
    const amount = parseFloat(tx.amount) || 0;

    if (status === 'approved') {
      if (tx.type === 'deposit') {
        balance += amount;
      } else if (tx.type === 'withdrawal') {
        if (amount > balance) {
          throw new Error('Insufficient user balance to approve this withdrawal');
        }
        balance -= amount;
      }
    }

    transactions[idx] = {
      ...tx,
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
    };

    updateUser(targetUserId, { transactions, balance });
    return transactions[idx];
  }

  function adminSetKycStatus(actorId, targetUserId, status) {
    assertAdmin(actorId);
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new Error('Invalid KYC status');
    }
    updateUser(targetUserId, { kyc_status: status });
    return toAdminUserRow(findById(targetUserId));
  }

  async function adminCreateUser(actorId, payload) {
    await hydrateUsersFromSupabase();
    assertAdmin(actorId);
    const username = payload.username?.trim();
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
    if (findByUsername(username)) throw new Error('Username is already taken');
    const password = payload.password || 'ChangeMe123';
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const { hash, salt, algo } = await hashPassword(password);
    const user = {
      id: newId(),
      username,
      password_hash: hash,
      password_salt: salt,
      password_algo: algo,
      full_name: payload.full_name?.trim() || '',
      country: payload.country?.trim() || '',
      phone: payload.phone?.trim() || '',
      account_type: payload.account_type || 'personal',
      referral_id: '',
      sponsor_username: null,
      referral_earnings: 0,
      kyc_status: payload.kyc_status || 'pending',
      balance: parseFloat(payload.balance) || 0,
      active_plan_id: null,
      role: payload.role === 'admin' ? 'admin' : 'user',
      transactions: [],
      kyc_documents: [],
      connected_wallets: [],
      is_disabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const users = readUsers();
    users.push(user);
    writeUsers(users);
    return toAdminUserRow(user);
  }

  function toProfile(user) {
    const plan = DEFAULT_PLANS.find((p) => p.id === user.active_plan_id);
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      country: user.country,
      account_type: user.account_type,
      referral_id: user.referral_id,
      sponsor_username: user.sponsor_username || null,
      referral_earnings: user.referral_earnings || 0,
      kyc_status: user.kyc_status || 'pending',
      balance: user.balance || 0,
      active_plan_id: user.active_plan_id,
      investment_plans: plan ? { name: plan.name, slug: plan.slug } : null,
      created_at: user.created_at,
      role: user.role || 'user',
    };
  }

  function buildReferralLink(username) {
    const base = window.PrimeTradeComponents?.getBasePath?.() || '.';
    const origin = location.origin;
    const path = location.pathname.replace(/\\/g, '/');
    const portalIdx = path.indexOf('/portal/');
    const root =
      portalIdx >= 0
        ? `${origin}${path.slice(0, portalIdx)}`
        : origin + (base === '.' ? '' : base.replace(/^\./, ''));
    return `${root}/auth/verify.html?ref=${encodeURIComponent(username)}`;
  }

  function getReferralInfo(userId) {
    const user = findById(userId);
    if (!user) return null;
    const referred = readUsers().filter(
      (u) => u.sponsor_username?.toLowerCase() === user.username.toLowerCase()
    );
    return {
      referral_id: user.username,
      referral_link: buildReferralLink(user.username),
      sponsor_username: user.sponsor_username || null,
      total_referrals: referred.length,
      referral_earnings: user.referral_earnings || 0,
      referrals: referred.map((r) => ({
        full_name: r.full_name || r.username,
        username: r.username,
        level: 1,
        parent: user.username,
        status: r.kyc_status === 'approved' ? 'Active' : 'Pending',
        created_at: r.created_at,
      })),
    };
  }

  function findByUsername(username) {
    const key = username.trim().toLowerCase();
    return readUsers().find((u) => u.username.toLowerCase() === key);
  }

  function findById(id) {
    return readUsers().find((u) => u.id === id);
  }

  function updateUser(id, patch) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], ...patch, updated_at: new Date().toISOString() };
    writeUsers(users);
    return users[idx];
  }

  async function signUp(payload) {
    await hydrateUsersFromSupabase();
    const username = payload.username?.trim();
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
    if (findByUsername(username)) throw new Error('Username is already taken');
    if (!payload.password || payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (payload.password !== payload.confirm_password) {
      throw new Error('Passwords do not match');
    }

    const { hash, salt, algo } = await hashPassword(payload.password);
    let sponsor_username = null;
    const refCode = payload.referral_id?.trim();
    if (refCode) {
      const sponsor = findByUsername(refCode);
      if (sponsor) sponsor_username = sponsor.username;
    }
    const user = {
      id: newId(),
      username,
      password_hash: hash,
      password_salt: salt,
      password_algo: algo,
      full_name: payload.full_name?.trim() || '',
      country: payload.country?.trim() || '',
      phone: payload.phone?.trim() || '',
      account_type: payload.account_type || 'personal',
      referral_id: refCode || '',
      sponsor_username,
      referral_earnings: 0,
      kyc_status: 'pending',
      balance: 0,
      active_plan_id: null,
      role: 'user',
      transactions: [],
      kyc_documents: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const users = readUsers();
    users.push(user);
    writeUsers(users);
    setSession(user.id);
    clearVerification();
    return { user: toPublicUser(user) };
  }

  async function signIn(username, password) {
    await hydrateUsersFromSupabase();
    const user = findByUsername(username);
    if (!user) throw new Error('Invalid username or password');
    if (user.is_disabled) throw new Error('This account has been disabled. Contact support.');
    const ok = await verifyPassword(
      password,
      user.password_salt,
      user.password_hash,
      user.password_algo || 'pbkdf2'
    );
    if (!ok) throw new Error('Invalid username or password');
    setSession(user.id);
    return { user: toPublicUser(user) };
  }

  function signOut() {
    clearSession();
    sessionStorage.removeItem('ptc-withdraw-unlocked');
  }

  async function verifySessionPassword(password) {
    const session = getSession();
    if (!session) throw new Error('You must be logged in');
    const user = findById(session.user.id);
    if (!user) throw new Error('Account not found');
    const ok = await verifyPassword(
      password,
      user.password_salt,
      user.password_hash,
      user.password_algo || 'pbkdf2'
    );
    if (!ok) throw new Error('Incorrect password');
    return true;
  }

  async function changePassword(userId, currentPassword, newPassword, confirmPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) throw new Error('New passwords do not match');
    const user = findById(userId);
    if (!user) throw new Error('Account not found');
    const ok = await verifyPassword(
      currentPassword,
      user.password_salt,
      user.password_hash,
      user.password_algo || 'pbkdf2'
    );
    if (!ok) throw new Error('Current password is incorrect');
    const { hash, salt, algo } = await hashPassword(newPassword);
    updateUser(userId, { password_hash: hash, password_salt: salt, password_algo: algo });
  }

  async function resetPassword(username, newPassword, confirmPassword) {
    await hydrateUsersFromSupabase();
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
    const user = findByUsername(username);
    if (!user) throw new Error('No account found with that username');
    const { hash, salt, algo } = await hashPassword(newPassword);
    updateUser(user.id, { password_hash: hash, password_salt: salt, password_algo: algo });
  }

  function getProfile(userId) {
    const user = findById(userId);
    return user ? toProfile(user) : null;
  }

  function getPlans() {
    return DEFAULT_PLANS;
  }

  function getTransactions(userId) {
    return findById(userId)?.transactions || [];
  }

  function getRoiHistory(userId) {
    return findById(userId)?.roi_history || [];
  }

  function getStockHoldings(userId) {
    return findById(userId)?.stock_holdings || [];
  }

  function getCopyInvestments(userId) {
    return findById(userId)?.copy_investments || [];
  }

  function getPlanInvestment(userId) {
    const user = findById(userId);
    if (!user?.active_plan_id) return null;
    const plan = DEFAULT_PLANS.find((p) => p.id === user.active_plan_id);
    let status = 'active';
    if (user.active_plan_ends && new Date(user.active_plan_ends) < new Date()) {
      status = 'expired';
    }
    return {
      id: user.active_plan_id,
      plan_name: plan?.name || 'Investment Plan',
      amount: user.active_plan_deposit || 0,
      ends_at: user.active_plan_ends || null,
      started_at: user.updated_at || user.created_at,
      status,
    };
  }

  function purchaseStock(userId, { symbol, stockName, amount, minInvest, maxInvest }) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) throw new Error('Enter a valid investment amount');
    if (num < minInvest || num > maxInvest) {
      throw new Error(`Amount must be between $${minInvest} and $${maxInvest.toLocaleString()}`);
    }
    if (num > (user.balance || 0)) {
      throw new Error('Insufficient balance for this investment');
    }
    const holdings = [...(user.stock_holdings || [])];
    holdings.push({
      id: newId(),
      symbol,
      name: stockName,
      amount: num,
      status: 'pending',
      purchased_at: new Date().toISOString(),
    });
    updateUser(userId, { stock_holdings: holdings });
    return addTransaction(userId, {
      type: 'stock',
      amount: num,
      payment_method: symbol,
      reference_note: stockName,
    });
  }

  function getAiBotInvestments(userId) {
    return findById(userId)?.ai_bot_investments || [];
  }

  function purchaseAiBot(userId, { botId, botName, amount, durationDays }) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) throw new Error('Invalid bot price');
    if (num > (user.balance || 0)) {
      throw new Error(`Insufficient balance. This bot requires ${num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`);
    }
    const existing = (user.ai_bot_investments || []).find(
      (b) => b.bot_id === botId && (b.status === 'pending' || b.status === 'active')
    );
    if (existing) throw new Error('You already have an active subscription for this bot tier');

    const investments = [...(user.ai_bot_investments || [])];
    investments.push({
      id: newId(),
      bot_id: botId,
      bot_name: botName,
      amount: num,
      duration_days: durationDays,
      status: 'pending',
      started_at: new Date().toISOString(),
    });
    updateUser(userId, { ai_bot_investments: investments });
    return addTransaction(userId, {
      type: 'ai_bot',
      amount: num,
      payment_method: botId,
      reference_note: botName,
    });
  }

  function purchaseCopyTrade(userId, { traderId, traderName, amount, minInvest, maxInvest }) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) throw new Error('Enter a valid investment amount');
    if (num < minInvest || num > maxInvest) {
      throw new Error(`Amount must be between $${minInvest} and $${maxInvest.toLocaleString()}`);
    }
    if (num > (user.balance || 0)) {
      throw new Error('Insufficient balance for this investment');
    }
    const copies = [...(user.copy_investments || [])];
    copies.push({
      id: newId(),
      trader_id: traderId,
      trader_name: traderName,
      amount: num,
      status: 'pending',
      started_at: new Date().toISOString(),
    });
    updateUser(userId, { copy_investments: copies });
    return addTransaction(userId, {
      type: 'copy_trade',
      amount: num,
      payment_method: traderId,
      reference_note: `Copy: ${traderName}`,
    });
  }

  function addTransaction(userId, tx) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const record = {
      id: newId(),
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      status: 'pending',
      payment_method: tx.payment_method || null,
      reference_note: tx.reference_note || null,
      created_at: new Date().toISOString(),
    };
    const transactions = [...(user.transactions || []), record];
    updateUser(userId, { transactions });
    return record;
  }

  function subscribeToPlan(userId, planId, depositAmount, durationDays) {
    const plan = DEFAULT_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    const ends = new Date();
    ends.setDate(ends.getDate() + parseInt(durationDays, 10));
    updateUser(userId, {
      active_plan_id: planId,
      active_plan_ends: ends.toISOString(),
      active_plan_deposit: depositAmount,
    });
  }

  function getKycDocuments(userId) {
    return findById(userId)?.kyc_documents || [];
  }

  function getConnectedWallets(userId) {
    return findById(userId)?.connected_wallets || [];
  }

  function connectWallet(userId, { provider, provider_name, address, network, label }) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const addr = address?.trim();
    if (!addr) throw new Error('Wallet address is required');
    if (!network) throw new Error('Network is required');

    const list = [...(user.connected_wallets || [])];
    const duplicate = list.find(
      (w) => w.address?.toLowerCase() === addr.toLowerCase() && w.network === network
    );
    if (duplicate) throw new Error('This wallet address is already connected on this network');

    const isFirst = list.length === 0;
    const record = {
      id: newId(),
      provider: provider || 'manual',
      provider_name: provider_name || 'Wallet',
      address: addr,
      network,
      label: label || '',
      is_primary: isFirst,
      connected_at: new Date().toISOString(),
    };
    list.push(record);
    updateUser(userId, { connected_wallets: list });
    return record;
  }

  function disconnectWallet(userId, walletId) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    let list = (user.connected_wallets || []).filter((w) => w.id !== walletId);
    if (list.length && !list.some((w) => w.is_primary)) {
      list = list.map((w, i) => (i === 0 ? { ...w, is_primary: true } : { ...w, is_primary: false }));
    }
    updateUser(userId, { connected_wallets: list });
  }

  function setPrimaryWallet(userId, walletId) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const list = (user.connected_wallets || []).map((w) => ({
      ...w,
      is_primary: w.id === walletId,
    }));
    updateUser(userId, { connected_wallets: list });
  }

  function addKycDocument(userId, doc) {
    const user = findById(userId);
    if (!user) throw new Error('User not found');
    const record = {
      id: newId(),
      document_type: doc.document_type,
      file_name: doc.file_name,
      storage_path: doc.storage_path || null,
      uploaded_at: new Date().toISOString(),
      review_status: 'pending',
    };
    const kyc_documents = [...(user.kyc_documents || []), record];
    updateUser(userId, { kyc_documents, kyc_status: 'pending' });
  }

  window.PrimeTradeAuthStore = {
    DEFAULT_PLANS,
    setVerifyCode,
    getVerifyCode,
    markVerified,
    isVerified,
    clearVerification,
    getSession,
    signUp,
    signIn,
    signOut,
    verifySessionPassword,
    changePassword,
    resetPassword,
    getProfile,
    updateUser,
    getPlans,
    getTransactions,
    getRoiHistory,
    getStockHoldings,
    getCopyInvestments,
    getPlanInvestment,
    addTransaction,
    purchaseStock,
    purchaseCopyTrade,
    getAiBotInvestments,
    purchaseAiBot,
    subscribeToPlan,
    getKycDocuments,
    addKycDocument,
    getConnectedWallets,
    connectWallet,
    disconnectWallet,
    setPrimaryWallet,
    findByUsername,
    findById,
    getReferralInfo,
    buildReferralLink,
    hasSubtleCrypto,
    ensureDefaultAdmin,
    isAdmin,
    listUsers,
    getAdminStats,
    listPendingTransactions,
    getUserForAdmin,
    adminUpdateUser,
    adminSetTransactionStatus,
    adminSetKycStatus,
    adminCreateUser,
  };

  (async () => {
    await hydrateUsersFromSupabase();
    if (!readUsers().some((u) => u.role === 'admin')) {
      await ensureDefaultAdmin();
    } else {
      await migrateAdminPasswordToDefault();
    }
    scheduleUsersSync(readUsers());
  })().catch(() => {});
})();
