(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const INVITE_KEY_PREFIX = 'FEG';
  const INVITE_STORAGE_KEY = 'fegV4InviteKeysDraft';
  const PROFILE_STORAGE_KEY = 'fegV4ProfilesDraft';
  const BOOTSTRAP_STORAGE_KEY = 'fegV4FirstAdminBootstrapDraft';
  const BOOTSTRAP_KEY_CONFIG_NAME = 'bootstrapAdminKey';

  const DEFAULT_INVITE_LIMITS = Object.freeze({ maxUses: 1, expiresDays: 14 });

  function getStorage(storage) {
    if (storage) return storage;
    if (GLOBAL.localStorage) return GLOBAL.localStorage;
    if (!GLOBAL.__FEG_ADMIN_MEMORY_STORAGE__) {
      const data = new Map();
      GLOBAL.__FEG_ADMIN_MEMORY_STORAGE__ = {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
      };
    }
    return GLOBAL.__FEG_ADMIN_MEMORY_STORAGE__;
  }

  function parseJson(raw, fallback) {
    try {
      const parsed = JSON.parse(raw || '');
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function randomPart(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const cryptoObj = GLOBAL.crypto || GLOBAL.msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      const arr = new Uint8Array(length);
      cryptoObj.getRandomValues(arr);
      for (let i = 0; i < length; i += 1) out += chars[arr[i] % chars.length];
      return out;
    }
    for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function normalizeRole(role) {
    return ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) : (role || 'viewer');
  }

  function roleLabel(role) {
    return ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(role) : role;
  }

  function normalizeWorkspace(value) {
    return String(value || 'MAIN').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32) || 'MAIN';
  }

  function generateInviteKey(options) {
    const role = normalizeRole(options && options.role || 'technician');
    const workspace = normalizeWorkspace(options && options.workspace || 'MAIN').replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'MAIN';
    return `${INVITE_KEY_PREFIX}-${workspace}-${role.toUpperCase().slice(0, 3)}-${randomPart(4)}-${randomPart(4)}`;
  }

  function normalizeInvite(invite) {
    const data = invite || {};
    const now = new Date().toISOString();
    const maxUses = Number.isFinite(Number(data.maxUses)) ? Math.max(1, Number(data.maxUses)) : DEFAULT_INVITE_LIMITS.maxUses;
    const usedCount = Number.isFinite(Number(data.usedCount)) ? Math.max(0, Number(data.usedCount)) : 0;
    const role = normalizeRole(data.role || 'technician');
    const createdAt = data.createdAt || now;
    const expiresAt = data.expiresAt || addDays(createdAt, DEFAULT_INVITE_LIMITS.expiresDays);
    const status = data.status || inferInviteStatus({ ...data, usedCount, maxUses, expiresAt });
    return {
      id: data.id || `inv-${Date.now()}-${randomPart(3)}`,
      key: String(data.key || generateInviteKey({ role, workspace: data.workspace })).trim().toUpperCase(),
      role,
      workspace: normalizeWorkspace(data.workspace),
      status,
      maxUses,
      usedCount,
      expiresAt,
      createdAt,
      note: data.note || '',
      createdBy: data.createdBy || 'local-admin',
      assignedEmail: data.assignedEmail || '',
      usedByProfileId: data.usedByProfileId || ''
    };
  }

  function inferInviteStatus(invite) {
    if (invite.status === 'disabled' || invite.status === 'revoked') return invite.status;
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return 'expired';
    if (Number(invite.usedCount || 0) >= Number(invite.maxUses || 1)) return 'used';
    return invite.status || 'active';
  }

  function addDays(iso, days) {
    const base = iso ? new Date(iso) : new Date();
    base.setDate(base.getDate() + Number(days || 0));
    return base.toISOString();
  }

  function loadInviteDrafts(storage) {
    const safeStorage = getStorage(storage);
    const list = parseJson(safeStorage.getItem(INVITE_STORAGE_KEY), []);
    return (Array.isArray(list) ? list : []).map(normalizeInvite).map(invite => ({ ...invite, status: inferInviteStatus(invite) }));
  }

  function saveInviteList(list, storage) {
    const safeStorage = getStorage(storage);
    const normalized = (Array.isArray(list) ? list : []).map(normalizeInvite);
    safeStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(normalized.slice(0, 500)));
    return normalized;
  }

  function saveInviteDraft(invite, storage) {
    const list = loadInviteDrafts(storage);
    const next = normalizeInvite({ ...invite, status: (invite && invite.status) || 'active' });
    const index = list.findIndex(item => item.id === next.id || item.key === next.key);
    if (index >= 0) list[index] = next;
    else list.unshift(next);
    saveInviteList(list, storage);
    return next;
  }

  function updateInviteStatus(inviteIdOrKey, status, storage) {
    const list = loadInviteDrafts(storage);
    const target = String(inviteIdOrKey || '').trim().toUpperCase();
    let updated = null;
    const next = list.map(invite => {
      if (invite.id === inviteIdOrKey || invite.key === target) {
        updated = normalizeInvite({ ...invite, status: status || 'active' });
        return updated;
      }
      return invite;
    });
    saveInviteList(next, storage);
    return updated;
  }

  function validateInviteKey(key, storage) {
    const normalizedKey = String(key || '').trim().toUpperCase();
    const invite = loadInviteDrafts(storage).find(item => item.key === normalizedKey);
    if (!invite) return { ok: false, reason: 'not_found', invite: null };
    const status = inferInviteStatus(invite);
    if (status !== 'active' && status !== 'new') return { ok: false, reason: status, invite: { ...invite, status } };
    return { ok: true, reason: 'ok', invite: { ...invite, status } };
  }

  function consumeInviteKey(key, profileData, storage) {
    const validation = validateInviteKey(key, storage);
    if (!validation.ok) return validation;
    const invite = validation.invite;
    const profile = saveProfile({
      ...(profileData || {}),
      role: invite.role,
      workspaceId: invite.workspace,
      inviteKey: invite.key
    }, storage);
    const list = loadInviteDrafts(storage).map(item => {
      if (item.id !== invite.id) return item;
      return normalizeInvite({
        ...item,
        usedCount: Number(item.usedCount || 0) + 1,
        assignedEmail: profile.email,
        usedByProfileId: profile.id,
        status: Number(item.usedCount || 0) + 1 >= Number(item.maxUses || 1) ? 'used' : 'active'
      });
    });
    saveInviteList(list, storage);
    return { ok: true, reason: 'consumed', invite, profile };
  }

  function normalizeProfile(profile) {
    const data = profile || {};
    const email = String(data.email || '').trim().toLowerCase();
    return {
      id: data.id || `profile-${Date.now()}-${randomPart(3)}`,
      email,
      displayName: data.displayName || data.name || email || 'Пользователь',
      companyName: data.companyName || '',
      role: normalizeRole(data.role || 'viewer'),
      workspaceId: normalizeWorkspace(data.workspaceId || data.workspace || 'MAIN'),
      status: data.status || 'active',
      isFirstAdmin: Boolean(data.isFirstAdmin),
      inviteKey: data.inviteKey || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt || ''
    };
  }

  function loadProfiles(storage) {
    const safeStorage = getStorage(storage);
    const list = parseJson(safeStorage.getItem(PROFILE_STORAGE_KEY), []);
    return (Array.isArray(list) ? list : []).map(normalizeProfile);
  }

  function saveProfileList(list, storage) {
    const safeStorage = getStorage(storage);
    const normalized = (Array.isArray(list) ? list : []).map(normalizeProfile);
    safeStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized.slice(0, 500)));
    return normalized;
  }

  function saveProfile(profile, storage) {
    const normalized = normalizeProfile(profile);
    const list = loadProfiles(storage);
    const index = list.findIndex(item => item.id === normalized.id || (normalized.email && item.email === normalized.email));
    const next = { ...normalized, updatedAt: new Date().toISOString(), createdAt: index >= 0 ? list[index].createdAt : normalized.createdAt };
    if (index >= 0) list[index] = next;
    else list.unshift(next);
    saveProfileList(list, storage);
    return next;
  }

  function setProfileRole(profileIdOrEmail, role, storage) {
    const list = loadProfiles(storage);
    const needle = String(profileIdOrEmail || '').trim().toLowerCase();
    let updated = null;
    const next = list.map(profile => {
      if (profile.id === profileIdOrEmail || profile.email === needle) {
        updated = normalizeProfile({ ...profile, role: normalizeRole(role), updatedAt: new Date().toISOString() });
        return updated;
      }
      return profile;
    });
    saveProfileList(next, storage);
    return updated;
  }

  function hasAnyAdmin(storage) {
    return loadProfiles(storage).some(profile => profile.role === 'admin' && profile.status === 'active');
  }

  function canCreateFirstAdmin(storage) {
    return !hasAnyAdmin(storage);
  }

  function getConfiguredBootstrapKey(options) {
    const opts = options || {};
    const config = GLOBAL.FEG_APP_CONFIG || {};
    return String(opts.bootstrapKey || config[BOOTSTRAP_KEY_CONFIG_NAME] || GLOBAL.FEG_BOOTSTRAP_ADMIN_KEY || '').trim();
  }

  function createFirstAdmin(data, options) {
    const opts = options || {};
    const storage = opts.storage;
    if (!canCreateFirstAdmin(storage)) return { ok: false, reason: 'admin_exists', profile: null };
    const expectedKey = getConfiguredBootstrapKey(opts);
    const providedKey = String((data && data.bootstrapKey) || '').trim();
    if (expectedKey && providedKey !== expectedKey) return { ok: false, reason: 'invalid_bootstrap_key', profile: null };
    if (!expectedKey && !opts.allowMissingBootstrapKey) return { ok: false, reason: 'bootstrap_key_not_configured', profile: null };
    const profile = saveProfile({
      email: data && data.email,
      displayName: data && (data.displayName || data.name),
      role: 'admin',
      workspaceId: data && data.workspaceId || 'MAIN',
      isFirstAdmin: true
    }, storage);
    const safeStorage = getStorage(storage);
    safeStorage.setItem(BOOTSTRAP_STORAGE_KEY, JSON.stringify({ disabled: true, firstAdminProfileId: profile.id, createdAt: new Date().toISOString() }));
    if (ROOT.AuthShell && ROOT.AuthShell.saveBootstrapState) {
      ROOT.AuthShell.saveBootstrapState({ hasAdmin: true, adminEmail: profile.email }, storage);
    }
    return { ok: true, reason: 'created', profile };
  }

  function exportAccessState(storage) {
    return JSON.stringify({
      schema: 'feg-stage-pro-access-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles: loadProfiles(storage),
      invite_keys: loadInviteDrafts(storage)
    }, null, 2);
  }

  function seedDemoAccess(storage) {
    const fixtures = ROOT.TestFixtures || {};
    const demoUsers = Array.isArray(fixtures.DEMO_USERS) ? fixtures.DEMO_USERS : [];
    demoUsers.forEach(user => saveProfile({
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.name,
      role: user.role,
      workspaceId: user.workspaceId || 'MAIN',
      status: 'active'
    }, storage));
    const keys = Array.isArray(fixtures.DEMO_INVITE_KEYS) ? fixtures.DEMO_INVITE_KEYS : [];
    keys.forEach(key => saveInviteDraft({
      id: `demo-${String(key.key || key).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      key: key.key || key,
      role: key.role || 'technician',
      workspace: key.workspaceId || key.workspace || 'MAIN',
      status: 'active',
      maxUses: 999,
      note: 'Demo fixture key'
    }, storage));
    return { profiles: loadProfiles(storage), invite_keys: loadInviteDrafts(storage) };
  }

  function renderAdminDashboard(target, options) {
    const root = typeof target === 'string' ? GLOBAL.document && document.getElementById(target) : target;
    if (!root) return null;
    const cb = options || {};
    const profiles = loadProfiles();
    const invites = loadInviteDrafts();
    const canBootstrap = canCreateFirstAdmin();
    root.innerHTML = `
      <div class="v4-card v4-admin-shell">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">AdminShell</div>
            <h3>Админка: пользователи, роли и ключи</h3>
            <p class="v4-muted">Локальный слой под будущие таблицы <code>profiles</code> и <code>invite_keys</code>. Боевой backend пока не подключён.</p>
          </div>
          <div class="v4-auth-actions">
            <button type="button" class="btn-secondary" data-v4-admin="seed-demo">Demo seed</button>
            <button type="button" class="btn-secondary" data-v4-admin="export">Export JSON</button>
            <button type="button" class="btn-primary" data-v4-admin="generate">+ Ключ</button>
          </div>
        </div>
        <div class="v4-grid-3">
          <div class="v4-mini"><b>${profiles.length}</b><span>profiles</span></div>
          <div class="v4-mini"><b>${invites.length}</b><span>invite_keys</span></div>
          <div class="v4-mini"><b>${canBootstrap ? 'on' : 'off'}</b><span>first admin bootstrap</span></div>
        </div>
        ${canBootstrap ? renderBootstrapForm() : ''}
        ${renderInviteForm()}
        ${renderProfilesTable(profiles)}
        ${renderInviteTable(invites)}
        <pre class="v4-json-preview" data-v4-admin-export hidden></pre>
      </div>`;

    bindAdminActions(root, cb);
    return root;
  }

  function renderBootstrapForm() {
    return `
      <div class="v4-admin-form" data-v4-admin-bootstrap-form>
        <div class="v4-kicker">First admin</div>
        <div class="v4-grid-3">
          <label>email<input data-v4-first-admin="email" type="email" placeholder="admin@feg.local"></label>
          <label>имя<input data-v4-first-admin="displayName" type="text" placeholder="Администратор"></label>
          <label>bootstrap key<input data-v4-first-admin="bootstrapKey" type="password" placeholder="из backend/env"></label>
        </div>
        <button type="button" class="btn-secondary" data-v4-admin="create-first-admin">Создать первого админа</button>
        <p class="v4-muted">Ключ берётся из конфигурации приложения / backend. Не фиксируем его в клиентском коде.</p>
      </div>`;
  }

  function renderInviteForm() {
    const roles = ['manager', 'technician', 'warehouse', 'viewer'];
    return `
      <div class="v4-admin-form">
        <div class="v4-kicker">Новый invite key</div>
        <div class="v4-grid-3">
          <label>роль<select data-v4-invite="role">${roles.map(role => `<option value="${escapeHtml(role)}">${escapeHtml(roleLabel(role))}</option>`).join('')}</select></label>
          <label>workspace<input data-v4-invite="workspace" type="text" value="MAIN"></label>
          <label>лимит использований<input data-v4-invite="maxUses" type="number" min="1" value="1"></label>
        </div>
        <label>примечание<input data-v4-invite="note" type="text" placeholder="для кого / проект / срок"></label>
      </div>`;
  }

  function renderProfilesTable(profiles) {
    return `
      <div class="v4-table-wrap">
        <h4>Пользователи</h4>
        <table class="v4-table"><thead><tr><th>Email</th><th>Имя</th><th>Роль</th><th>Workspace</th><th>Статус</th></tr></thead><tbody>
          ${profiles.map(profile => `<tr><td>${escapeHtml(profile.email)}</td><td>${escapeHtml(profile.displayName)}</td><td>${escapeHtml(roleLabel(profile.role))}</td><td>${escapeHtml(profile.workspaceId)}</td><td>${escapeHtml(profile.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="v4-muted">Пользователей пока нет.</td></tr>'}
        </tbody></table>
      </div>`;
  }

  function renderInviteTable(invites) {
    return `
      <div class="v4-table-wrap">
        <h4>Ключи доступа</h4>
        <table class="v4-table"><thead><tr><th>Ключ</th><th>Роль</th><th>Workspace</th><th>Лимит</th><th>Статус</th><th>Срок</th><th></th></tr></thead><tbody>
          ${invites.slice(0, 30).map(item => `<tr><td><code>${escapeHtml(item.key)}</code></td><td>${escapeHtml(roleLabel(item.role))}</td><td>${escapeHtml(item.workspace)}</td><td>${escapeHtml(item.usedCount)} / ${escapeHtml(item.maxUses)}</td><td>${escapeHtml(inferInviteStatus(item))}</td><td>${escapeHtml((item.expiresAt || '').slice(0, 10))}</td><td><button type="button" class="btn-secondary" data-v4-disable-invite="${escapeHtml(item.id)}">Откл.</button></td></tr>`).join('') || '<tr><td colspan="7" class="v4-muted">Ключей пока нет.</td></tr>'}
        </tbody></table>
      </div>`;
  }

  function bindAdminActions(root, cb) {
    const readInvite = () => ({
      role: (root.querySelector('[data-v4-invite="role"]') || {}).value || 'technician',
      workspace: (root.querySelector('[data-v4-invite="workspace"]') || {}).value || 'MAIN',
      maxUses: Number((root.querySelector('[data-v4-invite="maxUses"]') || {}).value || 1),
      note: (root.querySelector('[data-v4-invite="note"]') || {}).value || ''
    });
    root.querySelectorAll('[data-v4-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-v4-admin');
        if (action === 'generate') {
          const invite = saveInviteDraft(readInvite());
          if (cb.onGenerate) cb.onGenerate(invite);
          renderAdminDashboard(root, cb);
        }
        if (action === 'seed-demo') {
          const seeded = seedDemoAccess();
          if (cb.onSeed) cb.onSeed(seeded);
          renderAdminDashboard(root, cb);
        }
        if (action === 'export') {
          const pre = root.querySelector('[data-v4-admin-export]');
          if (pre) {
            pre.hidden = false;
            pre.textContent = exportAccessState();
          }
          if (cb.onExport) cb.onExport(exportAccessState());
        }
        if (action === 'create-first-admin') {
          const data = {};
          root.querySelectorAll('[data-v4-first-admin]').forEach(input => { data[input.getAttribute('data-v4-first-admin')] = input.value; });
          const result = createFirstAdmin(data);
          if (cb.onBootstrap) cb.onBootstrap(result);
          renderAdminDashboard(root, cb);
        }
      });
    });
    root.querySelectorAll('[data-v4-disable-invite]').forEach(btn => {
      btn.addEventListener('click', () => {
        const invite = updateInviteStatus(btn.getAttribute('data-v4-disable-invite'), 'disabled');
        if (cb.onDisableInvite) cb.onDisableInvite(invite);
        renderAdminDashboard(root, cb);
      });
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.AdminShell = {
    INVITE_STORAGE_KEY,
    PROFILE_STORAGE_KEY,
    BOOTSTRAP_STORAGE_KEY,
    generateInviteKey,
    normalizeInvite,
    loadInviteDrafts,
    saveInviteDraft,
    updateInviteStatus,
    validateInviteKey,
    consumeInviteKey,
    normalizeProfile,
    loadProfiles,
    saveProfile,
    setProfileRole,
    hasAnyAdmin,
    canCreateFirstAdmin,
    createFirstAdmin,
    seedDemoAccess,
    exportAccessState,
    renderAdminDashboard
  };
})();
