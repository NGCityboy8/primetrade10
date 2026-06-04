(function () {
  const chatStore = () => window.PrimeTradeChatStore;
  const authStore = () => window.PrimeTradeAuthStore;

  let panelOpen = false;
  let pollTimer = null;
  let activeThreadId = null;
  let isAdmin = false;
  let sessionUserId = null;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function ensureFab() {
    let fab = document.querySelector('.portal-chat-fab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'portal-chat-fab';
      fab.setAttribute('aria-label', 'Open support chat');
      fab.innerHTML =
        '<i class="bi bi-chat-dots-fill" aria-hidden="true"></i><span class="chat-badge d-none" aria-hidden="true">0</span>';
      document.body.appendChild(fab);
    }
    if (!fab.dataset.bound) {
      fab.dataset.bound = '1';
      fab.addEventListener('click', togglePanel);
    }
    return fab;
  }

  function ensurePanel() {
    let panel = document.getElementById('portal-chat-panel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'portal-chat-panel';
    panel.className = 'portal-chat-panel d-none';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'portal-chat-title');
    panel.innerHTML = `
      <div class="portal-chat-backdrop" id="portal-chat-backdrop" aria-hidden="true"></div>
      <div class="portal-chat-card">
        <header class="portal-chat-header">
          <div>
            <h2 class="portal-chat-title" id="portal-chat-title">Support Chat</h2>
            <p class="portal-chat-subtitle" id="portal-chat-subtitle">Chat with our team</p>
          </div>
          <button type="button" class="portal-chat-close btn btn-sm btn-outline-light-ptc" id="portal-chat-close" aria-label="Close chat">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="portal-chat-layout">
          <aside class="portal-chat-threads d-none" id="portal-chat-threads" aria-label="Customer conversations">
            <div class="portal-chat-threads-head">Customers</div>
            <div class="portal-chat-threads-list" id="portal-chat-threads-list"></div>
          </aside>
          <div class="portal-chat-main">
            <div class="portal-chat-messages" id="portal-chat-messages" role="log" aria-live="polite"></div>
            <form class="portal-chat-compose" id="portal-chat-form">
              <input type="text" class="form-control form-control-ptc" id="portal-chat-input" placeholder="Type your message…" maxlength="2000" autocomplete="off" required />
              <button type="submit" class="btn btn-gradient" id="portal-chat-send" aria-label="Send message">
                <i class="bi bi-send-fill" aria-hidden="true"></i>
              </button>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('portal-chat-close')?.addEventListener('click', closePanel);
    document.getElementById('portal-chat-backdrop')?.addEventListener('click', closePanel);
    document.getElementById('portal-chat-form')?.addEventListener('submit', onSend);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelOpen) closePanel();
    });

    return panel;
  }

  function updateBadge() {
    const fab = document.querySelector('.portal-chat-fab');
    const badge = fab?.querySelector('.chat-badge');
    if (!badge || !sessionUserId) return;
    const count = chatStore()?.getUnreadCount({ userId: sessionUserId, isAdmin }) || 0;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.classList.remove('d-none');
      badge.removeAttribute('aria-hidden');
    } else {
      badge.classList.add('d-none');
      badge.setAttribute('aria-hidden', 'true');
    }
  }

  async function renderAdminThreads() {
    const list = document.getElementById('portal-chat-threads-list');
    if (!list || !authStore()) return;

    await authStore()?.hydrateUsersFromSupabase?.();
    const threads = chatStore().listAdminThreads(authStore().listUsers?.() || []);
    if (!threads.length) {
      list.innerHTML = '<p class="portal-chat-threads-empty">No customers yet.</p>';
      return;
    }

    if (!activeThreadId && threads[0]) activeThreadId = threads[0].userId;

    list.innerHTML = threads
      .map((t) => {
        const active = t.userId === activeThreadId ? ' active' : '';
        const badge =
          t.unread > 0
            ? `<span class="portal-chat-thread-badge">${t.unread > 9 ? '9+' : t.unread}</span>`
            : '';
        return `<button type="button" class="portal-chat-thread${active}" data-thread-id="${escapeHtml(t.userId)}">
          <span class="portal-chat-thread-name">${escapeHtml(t.full_name)}</span>
          <span class="portal-chat-thread-user">@${escapeHtml(t.username)}</span>
          <span class="portal-chat-thread-preview">${escapeHtml(t.lastMessage || 'No messages yet')}</span>
          ${badge}
        </button>`;
      })
      .join('');

    list.querySelectorAll('[data-thread-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeThreadId = btn.dataset.threadId;
        chatStore().markThreadRead(activeThreadId, 'admin');
        renderAdminThreads();
        renderMessages();
        updateBadge();
      });
    });
  }

  function renderMessages() {
    const box = document.getElementById('portal-chat-messages');
    const subtitle = document.getElementById('portal-chat-subtitle');
    if (!box || !chatStore()) return;

    const threadId = isAdmin ? activeThreadId : sessionUserId;
    if (!threadId) {
      box.innerHTML = '<p class="portal-chat-empty">Select a customer to start chatting.</p>';
      return;
    }

    if (isAdmin) {
      const user = authStore()?.findById?.(threadId);
      subtitle.textContent = user
        ? `Chatting with ${user.full_name || user.username} (@${user.username})`
        : 'Select a customer';
    } else {
      subtitle.textContent = 'Our support team typically replies within a few hours.';
    }

    const messages = chatStore().listThreadMessages(threadId);
    if (!messages.length) {
      box.innerHTML =
        '<p class="portal-chat-empty">No messages yet. Say hello and our team will respond.</p>';
      return;
    }

    box.innerHTML = messages
      .map((m) => {
        const mine =
          (isAdmin && m.sender_role === 'admin') || (!isAdmin && m.sender_role === 'user');
        return `<div class="portal-chat-msg ${mine ? 'portal-chat-msg--mine' : 'portal-chat-msg--theirs'}">
          <div class="portal-chat-msg-body">${escapeHtml(m.body)}</div>
          <time class="portal-chat-msg-time" datetime="${escapeHtml(m.created_at)}">${formatTime(m.created_at)}</time>
        </div>`;
      })
      .join('');

    box.scrollTop = box.scrollHeight;
  }

  async function refreshChat() {
    await chatStore()?.hydrateChatFromSupabase();
    if (isAdmin) await renderAdminThreads();
    renderMessages();
    updateBadge();
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(() => refreshChat(), 4000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function openPanel() {
    ensurePanel();
    const panel = document.getElementById('portal-chat-panel');
    panel?.classList.remove('d-none');
    document.body.classList.add('portal-chat-open');
    panelOpen = true;

    await refreshChat();

    if (isAdmin) {
      document.getElementById('portal-chat-threads')?.classList.remove('d-none');
      document.getElementById('portal-chat-panel')?.classList.add('portal-chat-panel--admin');
      if (activeThreadId) chatStore().markThreadRead(activeThreadId, 'admin');
    } else {
      chatStore().markThreadRead(sessionUserId, 'user');
    }

    renderMessages();
    updateBadge();
    startPolling();
    document.getElementById('portal-chat-input')?.focus();
  }

  function closePanel() {
    const panel = document.getElementById('portal-chat-panel');
    panel?.classList.add('d-none');
    document.body.classList.remove('portal-chat-open');
    panelOpen = false;
    stopPolling();
  }

  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  async function onSend(e) {
    e.preventDefault();
    const input = document.getElementById('portal-chat-input');
    const btn = document.getElementById('portal-chat-send');
    if (!input || !chatStore()) return;

    const threadId = isAdmin ? activeThreadId : sessionUserId;
    if (!threadId) {
      if (isAdmin) alert('Select a customer to message.');
      return;
    }

    const body = input.value.trim();
    if (!body) return;

    btn.disabled = true;
    try {
      await chatStore().sendMessage({
        threadUserId: threadId,
        senderId: sessionUserId,
        senderRole: isAdmin ? 'admin' : 'user',
        body,
      });
      input.value = '';
      await refreshChat();
      if (isAdmin) renderAdminThreads();
    } catch (err) {
      alert(err.message || 'Could not send message');
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  async function initPortalChat() {
    if (!document.body.classList.contains('portal-app')) return;
    if (!chatStore() || !window.PrimeTradeAuth) return;

    const session = await window.PrimeTradeAuth.getSession();
    if (!session?.user?.id) return;

    sessionUserId = session.user.id;
    isAdmin = authStore()?.isAdmin?.(sessionUserId) || false;
    activeThreadId = isAdmin ? null : sessionUserId;

    await authStore()?.hydrateUsersFromSupabase?.();

    ensureFab();
    ensurePanel();

    await chatStore().hydrateChatFromSupabase();
    updateBadge();

    window.setInterval(() => {
      if (!panelOpen) updateBadge();
    }, 8000);
  }

  function boot() {
    window.PrimeTradeAuth?.requireAuth?.().then(() => initPortalChat());
  }

  if (document.body.classList.contains('portal-app')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
    document.addEventListener('portal-layout-ready', () => updateBadge(), { once: false });
  }

  window.PrimeTradePortalChat = { openPanel, closePanel, refreshChat, updateBadge };
})();
