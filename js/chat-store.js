(function () {
  const CHAT_KEY = 'ptc-support-chat';
  const CHAT_TABLE = 'support_chat_messages';
  let syncInFlight = null;

  function getSupabaseClient() {
    return window.getSupabase?.() || null;
  }

  function newId() {
    const c = globalThis.crypto || window.crypto;
    if (c?.randomUUID) return c.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function readMessages() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeMessages(messages) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    scheduleSync(messages);
  }

  function scheduleSync(messages) {
    const sb = getSupabaseClient();
    if (!sb) return;
    if (syncInFlight) return;
    syncInFlight = Promise.resolve()
      .then(() => sb.from(CHAT_TABLE).upsert(messages, { onConflict: 'id' }))
      .catch(() => {})
      .finally(() => {
        syncInFlight = null;
      });
  }

  async function hydrateChatFromSupabase() {
    const sb = getSupabaseClient();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from(CHAT_TABLE)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(2000);
      if (error || !Array.isArray(data)) return;
      localStorage.setItem(CHAT_KEY, JSON.stringify(data));
    } catch {
      // keep local cache
    }
  }

  function listThreadMessages(threadUserId) {
    return readMessages()
      .filter((m) => m.thread_user_id === threadUserId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  async function sendMessage({ threadUserId, senderId, senderRole, body }) {
    const text = String(body || '').trim();
    if (!text) throw new Error('Message cannot be empty');
    if (text.length > 2000) throw new Error('Message is too long (max 2000 characters)');

    const msg = {
      id: newId(),
      thread_user_id: threadUserId,
      sender_id: senderId,
      sender_role: senderRole,
      body: text,
      read_by_admin: senderRole === 'admin',
      read_by_user: senderRole === 'user',
      created_at: new Date().toISOString(),
    };

    const messages = readMessages();
    messages.push(msg);
    writeMessages(messages);

    const sb = getSupabaseClient();
    if (sb) {
      const { error } = await sb.from(CHAT_TABLE).insert(msg);
      if (error) throw new Error(error.message || 'Could not send message');
    }

    return msg;
  }

  function markThreadRead(threadUserId, readerRole) {
    const messages = readMessages();
    let changed = false;
    messages.forEach((m) => {
      if (m.thread_user_id !== threadUserId) return;
      if (readerRole === 'admin' && m.sender_role === 'user' && !m.read_by_admin) {
        m.read_by_admin = true;
        changed = true;
      }
      if (readerRole === 'user' && m.sender_role === 'admin' && !m.read_by_user) {
        m.read_by_user = true;
        changed = true;
      }
    });
    if (changed) writeMessages(messages);
    return changed;
  }

  function getUnreadCount({ userId, isAdmin }) {
    const messages = readMessages();
    if (isAdmin) {
      return messages.filter((m) => m.sender_role === 'user' && !m.read_by_admin).length;
    }
    return messages.filter(
      (m) => m.thread_user_id === userId && m.sender_role === 'admin' && !m.read_by_user
    ).length;
  }

  function getThreadUnreadForAdmin(threadUserId) {
    return readMessages().filter(
      (m) => m.thread_user_id === threadUserId && m.sender_role === 'user' && !m.read_by_admin
    ).length;
  }

  function listAdminThreads(users) {
    const messages = readMessages();
    const byThread = new Map();

    (users || []).forEach((u) => {
      if (u.role === 'admin' || u.is_disabled) return;
      byThread.set(u.id, {
        userId: u.id,
        username: u.username,
        full_name: u.full_name || u.username,
        lastMessage: null,
        lastAt: u.created_at,
        unread: 0,
      });
    });

    messages.forEach((m) => {
      let row = byThread.get(m.thread_user_id);
      if (!row) {
        row = {
          userId: m.thread_user_id,
          username: 'User',
          full_name: 'User',
          lastMessage: null,
          lastAt: m.created_at,
          unread: 0,
        };
        byThread.set(m.thread_user_id, row);
      }
      if (!row.lastAt || new Date(m.created_at) >= new Date(row.lastAt)) {
        row.lastAt = m.created_at;
        row.lastMessage = m.body;
      }
      if (m.sender_role === 'user' && !m.read_by_admin) row.unread += 1;
    });

    return [...byThread.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  }

  window.PrimeTradeChatStore = {
    hydrateChatFromSupabase,
    listThreadMessages,
    sendMessage,
    markThreadRead,
    getUnreadCount,
    getThreadUnreadForAdmin,
    listAdminThreads,
  };
})();
