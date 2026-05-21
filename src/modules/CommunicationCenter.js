// FEG Stage PRO v3.17.8 - local communication center
// Responsibility: workspace/project/role chat draft, notifications and push-subscription readiness.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const COMMUNICATION_CENTER_VERSION = '3.17.8-communication-local';
  const STORAGE_KEY = 'feg.v4.communication.local.v1';
  const MAX_TEXT = 2000;

  function nowIso() { return new Date().toISOString(); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    }[char]));
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; }
  }
  function getAuthState() {
    try {
      if (ROOT.AuthProvider && ROOT.AuthProvider.getAuthState) return ROOT.AuthProvider.getAuthState() || {};
    } catch (_) {}
    return { role: 'viewer', isAuthenticated: false, user: null };
  }
  function getUser() {
    const auth = getAuthState();
    const user = auth.user || {};
    return {
      id: toText(user.id || user.userId || user.email || 'local-user'),
      email: toText(user.email),
      name: toText(user.displayName || user.name || user.email || 'Local user'),
      role: toText(auth.role || user.role || 'viewer'),
      workspaceId: toText(user.workspaceId || 'local-workspace'),
      workspaceName: toText(user.workspaceName || 'Local workspace')
    };
  }
  function hasPermission(permission) {
    const user = getUser();
    return ROOT.RolePermissions && ROOT.RolePermissions.hasPermission
      ? ROOT.RolePermissions.hasPermission(user.role, permission)
      : user.role !== 'viewer';
  }
  function readState() {
    try {
      const raw = GLOBAL.localStorage && GLOBAL.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeState(parsed);
    } catch (_) {
      return normalizeState({});
    }
  }
  function writeState(state) {
    try {
      if (!GLOBAL.localStorage) return;
      GLOBAL.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    } catch (_) {}
  }
  function normalizeState(input) {
    const src = input && typeof input === 'object' ? input : {};
    const state = {
      version: COMMUNICATION_CENTER_VERSION,
      updatedAt: toText(src.updatedAt || nowIso()),
      rooms: Array.isArray(src.rooms) ? src.rooms.map(normalizeRoom).filter(Boolean) : [],
      messages: Array.isArray(src.messages) ? src.messages.map(normalizeMessage).filter(Boolean) : [],
      notifications: Array.isArray(src.notifications) ? src.notifications.map(normalizeNotification).filter(Boolean) : [],
      pushSubscriptions: Array.isArray(src.pushSubscriptions) ? src.pushSubscriptions.map(normalizeSubscription).filter(Boolean) : []
    };
    return seedRooms(state);
  }
  function normalizeRoom(room) {
    if (!room || typeof room !== 'object') return null;
    const id = toText(room.id);
    if (!id) return null;
    return {
      id,
      type: toText(room.type || 'workspace'),
      title: toText(room.title || id),
      scopeId: toText(room.scopeId || ''),
      isPinned: room.isPinned !== false,
      createdAt: toText(room.createdAt || nowIso())
    };
  }
  function normalizeMessage(message) {
    if (!message || typeof message !== 'object') return null;
    const id = toText(message.id);
    const roomId = toText(message.roomId);
    const text = toText(message.text).slice(0, MAX_TEXT);
    if (!id || !roomId || !text) return null;
    return {
      id,
      roomId,
      text,
      authorId: toText(message.authorId || 'local-user'),
      authorName: toText(message.authorName || 'Local user'),
      authorRole: toText(message.authorRole || 'viewer'),
      createdAt: toText(message.createdAt || nowIso()),
      status: toText(message.status || 'local')
    };
  }
  function normalizeNotification(item) {
    if (!item || typeof item !== 'object') return null;
    const id = toText(item.id);
    const title = toText(item.title || item.type);
    if (!id || !title) return null;
    return {
      id,
      type: toText(item.type || 'communication'),
      title,
      body: toText(item.body),
      roomId: toText(item.roomId),
      actorName: toText(item.actorName),
      createdAt: toText(item.createdAt || nowIso()),
      readAt: toText(item.readAt)
    };
  }
  function normalizeSubscription(item) {
    if (!item || typeof item !== 'object') return null;
    const endpointHash = toText(item.endpointHash || item.endpoint || item.id);
    if (!endpointHash) return null;
    return {
      id: toText(item.id || endpointHash),
      endpointHash,
      userId: toText(item.userId || 'local-user'),
      createdAt: toText(item.createdAt || nowIso()),
      lastSeenAt: toText(item.lastSeenAt || nowIso()),
      status: toText(item.status || 'local-ready')
    };
  }
  function seedRooms(state) {
    const user = getUser();
    const required = [
      { id: 'workspace-general', type: 'workspace', title: 'General chat', scopeId: user.workspaceId, isPinned: true },
      { id: 'workspace-ops', type: 'workspace', title: 'Operations and warehouse', scopeId: user.workspaceId, isPinned: true },
      { id: `role-${user.role}`, type: 'role', title: `Role: ${user.role}`, scopeId: user.role, isPinned: true },
      { id: 'project-current', type: 'project', title: 'Current project', scopeId: 'current-draft', isPinned: true }
    ];
    const byId = new Map(state.rooms.map(room => [room.id, room]));
    required.forEach(room => {
      const existing = byId.get(room.id);
      if (existing) byId.set(room.id, normalizeRoom(Object.assign({}, existing, room, { createdAt: existing.createdAt || nowIso() })));
      else byId.set(room.id, normalizeRoom(Object.assign({ createdAt: nowIso() }, room)));
    });
    state.rooms = Array.from(byId.values());
    return state;
  }
  function nextId(prefix) {
    return `${prefix || 'communication'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  function listRooms() { return readState().rooms.slice(); }
  function listMessages(roomId) {
    const id = toText(roomId || 'workspace-general');
    return readState().messages.filter(message => message.roomId === id).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  function listNotifications(options) {
    const opts = options || {};
    const rows = readState().notifications.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return opts.unreadOnly ? rows.filter(item => !item.readAt) : rows;
  }
  function postMessage(roomId, text, options) {
    if (!hasPermission('communication:write')) throw new Error('communication_write_denied');
    const clean = toText(text).slice(0, MAX_TEXT);
    if (!clean) throw new Error('message_required');
    const user = getUser();
    const state = readState();
    const room = state.rooms.find(item => item.id === roomId) || state.rooms[0] || normalizeRoom({ id: 'workspace-general', title: 'General chat' });
    if (!state.rooms.some(item => item.id === room.id)) state.rooms.push(room);
    const message = normalizeMessage({
      id: nextId('msg'),
      roomId: room.id,
      text: clean,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      createdAt: nowIso(),
      status: 'local-pending-sync'
    });
    state.messages.push(message);
    state.notifications.unshift(normalizeNotification({
      id: nextId('note'),
      type: 'chat_message',
      title: `New message: ${room.title}`,
      body: clean.length > 160 ? `${clean.slice(0, 157)}...` : clean,
      roomId: room.id,
      actorName: user.name,
      createdAt: message.createdAt
    }));
    state.updatedAt = nowIso();
    writeState(state);
    return clone(message);
  }
  function markNotificationRead(id) {
    const state = readState();
    const notification = state.notifications.find(item => item.id === id);
    if (notification && !notification.readAt) notification.readAt = nowIso();
    state.updatedAt = nowIso();
    writeState(state);
    return notification || null;
  }
  function registerLocalPushReadiness(details) {
    const user = getUser();
    const state = readState();
    const source = details || {};
    const endpointHash = toText(source.endpointHash || source.endpoint || `local-${user.id}`);
    const sub = normalizeSubscription({
      id: endpointHash,
      endpointHash,
      userId: user.id,
      status: source.status || 'local-ready',
      createdAt: source.createdAt || nowIso(),
      lastSeenAt: nowIso()
    });
    const idx = state.pushSubscriptions.findIndex(item => item.id === sub.id);
    if (idx >= 0) state.pushSubscriptions[idx] = sub;
    else state.pushSubscriptions.push(sub);
    state.updatedAt = nowIso();
    writeState(state);
    return clone(sub);
  }
  function getPushReadiness() {
    const supported = typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    const subscriptions = readState().pushSubscriptions;
    return {
      supported,
      permission,
      localSubscriptions: subscriptions.length,
      backendRequired: true,
      status: supported ? (permission === 'granted' ? 'ready_for_backend_subscription' : 'needs_permission') : 'unsupported'
    };
  }
  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('feg-communication-center-style')) return;
    const style = document.createElement('style');
    style.id = 'feg-communication-center-style';
    style.textContent = `
      .v4-communication-grid{display:grid;grid-template-columns:minmax(180px,260px) minmax(0,1fr) minmax(220px,320px);gap:14px;align-items:start}
      .v4-communication-rooms,.v4-communication-notifications,.v4-communication-thread{min-width:0}
      .v4-communication-room{width:100%;display:flex;justify-content:space-between;gap:8px;align-items:center;text-align:left;margin:0 0 8px;border-radius:12px;padding:10px 11px}
      .v4-communication-room.active{border-color:rgba(201,164,107,.72);box-shadow:0 0 0 2px rgba(201,164,107,.12) inset}
      .v4-communication-room span,.v4-communication-meta{color:var(--muted,#94a3b8);font-size:.76rem}
      .v4-communication-messages{display:grid;gap:8px;max-height:430px;overflow:auto;padding-right:4px}
      .v4-communication-message{border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:10px 12px;background:rgba(15,23,42,.28)}
      .v4-communication-message b{display:block;margin-bottom:3px}
      .v4-communication-message p{margin:.35rem 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
      .v4-communication-composer{display:grid;gap:8px;margin-top:12px}
      .v4-communication-composer textarea{min-height:92px;resize:vertical}
      .v4-communication-note{border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,.035)}
      .v4-communication-note.unread{border-color:rgba(14,165,233,.42);background:rgba(14,165,233,.08)}
      .v4-communication-push{margin-top:12px}
      @media(max-width:980px){.v4-communication-grid{grid-template-columns:1fr}.v4-communication-messages{max-height:none}}
    `;
    document.head.appendChild(style);
  }
  function renderCommunicationCenter(target, options) {
    ensureStyles();
    const root = typeof target === 'string' && typeof document !== 'undefined' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    root._v4CommunicationOptions = opts;
    const state = readState();
    const rooms = state.rooms;
    const selected = toText(root._v4CommunicationRoom || opts.roomId || (rooms[0] && rooms[0].id) || 'workspace-general');
    root._v4CommunicationRoom = rooms.some(room => room.id === selected) ? selected : (rooms[0] && rooms[0].id || 'workspace-general');
    const room = rooms.find(item => item.id === root._v4CommunicationRoom) || rooms[0];
    const messages = listMessages(room && room.id);
    const unread = listNotifications({ unreadOnly: true }).length;
    const canWrite = hasPermission('communication:write');
    const push = getPushReadiness();
    root.innerHTML = `
      <div class="v4-card v4-communication-center">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">Communication Center · local-first</div>
            <h3>Chats and notifications</h3>
            <p class="v4-muted">Local-first layer for future Supabase Realtime and backend push. Messages never mutate quotes, warehouse stock or BOM.</p>
          </div>
          <div class="v4-bom-source-card"><span>Unread</span><b>${esc(unread)}</b><small>${esc(COMMUNICATION_CENTER_VERSION)}</small></div>
        </div>
        <div class="v4-communication-grid">
          <aside class="v4-communication-rooms">
            <div class="v4-kicker">Rooms</div>
            ${rooms.map(item => renderRoomButton(item, root._v4CommunicationRoom, state.messages)).join('')}
          </aside>
          <section class="v4-communication-thread">
            <div class="v4-card-head">
              <div>
                <div class="v4-kicker">${esc(room && room.type || 'workspace')}</div>
                <h4>${esc(room && room.title || 'General chat')}</h4>
              </div>
              <span class="v4-communication-meta">${messages.length} messages</span>
            </div>
            <div class="v4-communication-messages" data-communication-messages>
              ${messages.length ? messages.map(renderMessage).join('') : '<div class="v4-note">No messages yet.</div>'}
            </div>
            <form class="v4-communication-composer" data-communication-composer>
              <textarea name="message" maxlength="${MAX_TEXT}" placeholder="${canWrite ? 'Write a message...' : 'This role has read-only access.'}" ${canWrite ? '' : 'disabled'}></textarea>
              <div class="v4-actions">
                <button type="submit" class="btn-primary" ${canWrite ? '' : 'disabled'}>Send</button>
                <button type="button" class="btn-secondary" data-communication-seed>System note</button>
              </div>
            </form>
          </section>
          <aside class="v4-communication-notifications">
            <div class="v4-kicker">Notifications</div>
            <div data-communication-notifications>${renderNotifications(state.notifications)}</div>
            <div class="v4-note v4-communication-push">
              <b>Push readiness</b><br>
              <span>${esc(push.status)} · permission: ${esc(push.permission)} · local subscriptions: ${esc(push.localSubscriptions)}</span>
              <div class="v4-actions" style="margin-top:8px;">
                <button type="button" class="btn-secondary" data-communication-push>Check push</button>
              </div>
            </div>
          </aside>
        </div>
      </div>`;
    bind(root);
    return root;
  }
  function renderRoomButton(room, selected, messages) {
    const count = (messages || []).filter(message => message.roomId === room.id).length;
    return `<button type="button" class="btn-secondary v4-communication-room ${room.id === selected ? 'active' : ''}" data-communication-room="${esc(room.id)}"><b>${esc(room.title)}</b><span>${esc(count)}</span></button>`;
  }
  function renderMessage(message) {
    return `<article class="v4-communication-message"><b>${esc(message.authorName)} <span class="v4-communication-meta">· ${esc(message.authorRole)} · ${esc(message.createdAt.slice(0, 16).replace('T', ' '))}</span></b><p>${esc(message.text)}</p></article>`;
  }
  function renderNotifications(notifications) {
    const rows = (notifications || []).slice(0, 12);
    if (!rows.length) return '<div class="v4-note">No notifications yet.</div>';
    return rows.map(item => `<div class="v4-communication-note ${item.readAt ? '' : 'unread'}" data-communication-note="${esc(item.id)}"><b>${esc(item.title)}</b><p class="v4-muted">${esc(item.body || item.type)}</p><button type="button" class="btn-secondary" data-communication-read="${esc(item.id)}" ${item.readAt ? 'disabled' : ''}>${item.readAt ? 'Read' : 'Mark read'}</button></div>`).join('');
  }
  function bind(root) {
    root.querySelectorAll('[data-communication-room]').forEach(btn => {
      btn.addEventListener('click', () => {
        root._v4CommunicationRoom = btn.getAttribute('data-communication-room');
        renderCommunicationCenter(root, root._v4CommunicationOptions || {});
      });
    });
    const form = root.querySelector('[data-communication-composer]');
    if (form) form.addEventListener('submit', event => {
      event.preventDefault();
      const textarea = form.querySelector('textarea[name="message"]');
      try {
        postMessage(root._v4CommunicationRoom || 'workspace-general', textarea && textarea.value);
        if (textarea) textarea.value = '';
        renderCommunicationCenter(root, root._v4CommunicationOptions || {});
      } catch (err) {
        notify(err && err.message || 'message_error');
      }
    });
    root.querySelectorAll('[data-communication-read]').forEach(btn => {
      btn.addEventListener('click', () => {
        markNotificationRead(btn.getAttribute('data-communication-read'));
        renderCommunicationCenter(root, root._v4CommunicationOptions || {});
      });
    });
    const seed = root.querySelector('[data-communication-seed]');
    if (seed) seed.addEventListener('click', () => {
      const state = readState();
      state.notifications.unshift(normalizeNotification({
        id: nextId('note'),
        type: 'system_note',
        title: 'System check',
        body: 'Communication Center is ready for backend sync and realtime wiring.',
        roomId: root._v4CommunicationRoom || 'workspace-general',
        actorName: 'FEG Stage PRO',
        createdAt: nowIso()
      }));
      state.updatedAt = nowIso();
      writeState(state);
      renderCommunicationCenter(root, root._v4CommunicationOptions || {});
    });
    const push = root.querySelector('[data-communication-push]');
    if (push) push.addEventListener('click', async () => {
      const readiness = getPushReadiness();
      if (readiness.supported && typeof Notification !== 'undefined' && Notification.permission === 'default' && Notification.requestPermission) {
        try { await Notification.requestPermission(); } catch (_) {}
      }
      registerLocalPushReadiness({ endpointHash: `local-${getUser().id}`, status: getPushReadiness().status });
      renderCommunicationCenter(root, root._v4CommunicationOptions || {});
    });
  }
  function notify(message) {
    const fn = ROOT.ToastManager && ROOT.ToastManager.showToast ? ROOT.ToastManager.showToast : (GLOBAL.showToast || null);
    if (fn) fn(message);
  }
  function buildCommunicationSmokeReport() {
    const state = readState();
    const push = getPushReadiness();
    const checks = [
      { key: 'rooms', ok: state.rooms.length >= 4, label: 'default workspace/project/role rooms exist' },
      { key: 'notifications', ok: Array.isArray(state.notifications), label: 'notification event store exists' },
      { key: 'push_readiness', ok: push.backendRequired === true, label: 'push remains backend-gated' },
      { key: 'permissions', ok: hasPermission('communication:view') || getUser().role === 'viewer', label: 'role permissions are readable' }
    ];
    return {
      type: 'feg-stage-pro-communication-smoke-report',
      version: COMMUNICATION_CENTER_VERSION,
      ok: checks.every(item => item.ok),
      checks,
      roomCount: state.rooms.length,
      messageCount: state.messages.length,
      unreadCount: listNotifications({ unreadOnly: true }).length
    };
  }

  ROOT.CommunicationCenter = {
    COMMUNICATION_CENTER_VERSION,
    listRooms,
    listMessages,
    listNotifications,
    postMessage,
    markNotificationRead,
    registerLocalPushReadiness,
    getPushReadiness,
    renderCommunicationCenter,
    buildCommunicationSmokeReport
  };
})();
