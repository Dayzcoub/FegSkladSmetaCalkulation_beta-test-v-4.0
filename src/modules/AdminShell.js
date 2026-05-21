(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const INVITE_KEY_PREFIX = 'FEG';
  const INVITE_STORAGE_KEY = 'fegV4InviteKeysDraft';
  const PROFILE_STORAGE_KEY = 'fegV4ProfilesDraft';
  const BOOTSTRAP_STORAGE_KEY = 'fegV4FirstAdminBootstrapDraft';
  const BOOTSTRAP_KEY_CONFIG_NAME = 'bootstrapAdminKey';
  const PASSWORD_RESET_TOKEN_TTL_DAYS = 3;

  const DEFAULT_INVITE_LIMITS = Object.freeze({ maxUses: 1, expiresDays: 14 });
  const PROJECT_INVITE_ROLE = 'invited_specialist';

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

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizePermissionList(value) {
    if (ROOT.RolePermissions && ROOT.RolePermissions.normalizePermissionList) return ROOT.RolePermissions.normalizePermissionList(value);
    const raw = Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/g);
    return Array.from(new Set(raw.map(item => String(item || '').trim()).filter(Boolean)));
  }

  function hashPassword(password) {
    const text = String(password || '');
    if (!text) return '';
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `local-fnv1a:${(hash >>> 0).toString(16)}`;
  }

  function verifyPassword(password, hash) {
    const saved = String(hash || '');
    if (!saved) return true;
    return hashPassword(password) === saved;
  }

  function makeResetToken() {
    return `${randomPart(4)}-${randomPart(4)}-${randomPart(4)}`;
  }

  function passwordResetExpiresAt() {
    return addDays(new Date().toISOString().slice(0, 10), PASSWORD_RESET_TOKEN_TTL_DAYS);
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
    const keyType = data.keyType === 'permanent' || data.type === 'permanent' || data.permanent === true ? 'permanent' : 'temporary';
    const createdAt = data.createdAt || now;
    const validFrom = normalizeDateInput(data.validFrom || data.startsAt || data.startDate || createdAt.slice(0, 10), createdAt.slice(0, 10));
    const expiresAt = keyType === 'permanent' ? '' : normalizeDateInput(data.expiresAt || data.validUntil || data.endsAt || data.endDate || addDays(createdAt, DEFAULT_INVITE_LIMITS.expiresDays).slice(0, 10), addDays(createdAt, DEFAULT_INVITE_LIMITS.expiresDays).slice(0, 10));
    const projectId = String(data.projectId || data.project_id || '').trim();
    const status = data.status || inferInviteStatus({ ...data, usedCount, maxUses, validFrom, expiresAt });
    return {
      id: data.id || `inv-${Date.now()}-${randomPart(3)}`,
      key: String(data.key || generateInviteKey({ role, workspace: data.workspace })).trim().toUpperCase(),
      role,
      workspace: normalizeWorkspace(data.workspace),
      status,
      keyType,
      maxUses: keyType === 'permanent' ? Math.max(maxUses, 999) : maxUses,
      usedCount,
      validFrom,
      expiresAt,
      projectId,
      projectName: data.projectName || data.project_name || '',
      singleUse: data.singleUse !== false,
      createdAt,
      note: data.note || '',
      createdBy: data.createdBy || 'local-admin',
      assignedEmail: data.assignedEmail || '',
      usedByProfileId: data.usedByProfileId || ''
    };
  }

  function inferInviteStatus(invite) {
    if (invite.status === 'disabled' || invite.status === 'revoked') return invite.status;
    const now = new Date();
    if (invite.validFrom && new Date(`${String(invite.validFrom).slice(0, 10)}T00:00:00`).getTime() > now.getTime()) return 'scheduled';
    if (invite.keyType !== 'permanent' && invite.expiresAt && new Date(`${String(invite.expiresAt).slice(0, 10)}T23:59:59`).getTime() < now.getTime()) return 'expired';
    if (invite.keyType !== 'permanent' && Number(invite.usedCount || 0) >= Number(invite.maxUses || 1)) return 'used';
    return invite.status || 'active';
  }

  function normalizeDateInput(value, fallback) {
    const str = String(value || fallback || '').trim();
    if (!str) return '';
    const date = new Date(str.length <= 10 ? `${str}T00:00:00` : str);
    if (Number.isNaN(date.getTime())) return String(fallback || '').slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  function makeProjectAccessEntry(data) {
    const src = data || {};
    return {
      projectId: String(src.projectId || src.project_id || '').trim(),
      projectName: String(src.projectName || src.project_name || '').trim(),
      validFrom: normalizeDateInput(src.validFrom || src.startsAt || src.startDate, new Date().toISOString().slice(0, 10)),
      validUntil: (src.keyType === 'permanent' || src.permanent === true) ? '' : normalizeDateInput(src.validUntil || src.expiresAt || src.endsAt || src.endDate, new Date().toISOString().slice(0, 10)),
      inviteKey: String(src.inviteKey || src.key || '').trim().toUpperCase(),
      keyType: src.keyType === 'permanent' || src.permanent === true ? 'permanent' : 'temporary',
      status: src.status || 'active'
    };
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
    const accessEntry = makeProjectAccessEntry({
      projectId: invite.projectId,
      projectName: invite.projectName,
      validFrom: invite.validFrom,
      validUntil: invite.expiresAt,
      inviteKey: invite.key,
      keyType: invite.keyType
    });
    const profile = saveProfile({
      ...(profileData || {}),
      role: invite.role,
      workspaceId: invite.workspace,
      inviteKey: invite.key,
      projectAccess: invite.projectId ? [accessEntry] : []
    }, storage);
    const list = loadInviteDrafts(storage).map(item => {
      if (item.id !== invite.id) return item;
      return normalizeInvite({
        ...item,
        usedCount: Number(item.usedCount || 0) + 1,
        assignedEmail: profile.email,
        usedByProfileId: profile.id,
        status: item.keyType === 'permanent' ? 'active' : (Number(item.usedCount || 0) + 1 >= Number(item.maxUses || 1) ? 'used' : 'active')
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
      permissionsAdd: normalizePermissionList(data.permissionsAdd || data.permissions_add || data.addedPermissions),
      permissionsRemove: normalizePermissionList(data.permissionsRemove || data.permissions_remove || data.removedPermissions),
      passwordHash: data.passwordHash || data.password_hash || (data.password ? hashPassword(data.password) : ''),
      passwordResetRequired: Boolean(data.passwordResetRequired || data.password_reset_required),
      passwordResetToken: data.passwordResetToken || data.password_reset_token || '',
      passwordResetExpiresAt: data.passwordResetExpiresAt || data.password_reset_expires_at || '',
      lastPasswordResetAt: data.lastPasswordResetAt || data.last_password_reset_at || '',
      projectAccess: Array.isArray(data.projectAccess) ? data.projectAccess.map(makeProjectAccessEntry) : [],
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

  function getProfile(profileIdOrEmail, storage) {
    const needle = normalizeEmail(profileIdOrEmail);
    return loadProfiles(storage).find(profile => profile.id === profileIdOrEmail || profile.email === needle) || null;
  }

  function deleteProfile(profileIdOrEmail, storage) {
    const needle = normalizeEmail(profileIdOrEmail);
    const list = loadProfiles(storage);
    const next = list.filter(profile => profile.id !== profileIdOrEmail && profile.email !== needle);
    saveProfileList(next, storage);
    return { ok: next.length !== list.length, profiles: next };
  }

  function updateProfile(profileIdOrEmail, patch, storage) {
    const list = loadProfiles(storage);
    const needle = normalizeEmail(profileIdOrEmail);
    let updated = null;
    const next = list.map(profile => {
      if (profile.id === profileIdOrEmail || profile.email === needle) {
        updated = normalizeProfile({ ...profile, ...(patch || {}), updatedAt: new Date().toISOString() });
        return updated;
      }
      return profile;
    });
    saveProfileList(next, storage);
    return updated;
  }

  function createProfile(data, storage) {
    const payload = data || {};
    const email = normalizeEmail(payload.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, reason: 'invalid_email', profile: null };
    if (getProfile(email, storage)) return { ok: false, reason: 'profile_exists', profile: getProfile(email, storage) };
    const temporaryPassword = String(payload.temporaryPassword || payload.password || '').trim();
    const profile = saveProfile({
      email,
      displayName: payload.displayName || payload.name || email,
      companyName: payload.companyName || '',
      role: payload.role || 'viewer',
      workspaceId: payload.workspaceId || payload.workspace || 'MAIN',
      status: payload.status || 'active',
      password: temporaryPassword,
      passwordResetRequired: Boolean(temporaryPassword)
    }, storage);
    return { ok: true, reason: 'created', profile };
  }

  function setProfilePermissions(profileIdOrEmail, permissionsAdd, permissionsRemove, storage) {
    return updateProfile(profileIdOrEmail, {
      permissionsAdd: normalizePermissionList(permissionsAdd),
      permissionsRemove: normalizePermissionList(permissionsRemove)
    }, storage);
  }

  function setProfilePassword(profileIdOrEmail, password, options) {
    const opts = options || {};
    const temporary = Boolean(opts.temporary);
    if (!String(password || '').trim()) return null;
    return updateProfile(profileIdOrEmail, {
      passwordHash: hashPassword(password),
      passwordResetRequired: temporary,
      passwordResetToken: '',
      passwordResetExpiresAt: '',
      lastPasswordResetAt: new Date().toISOString()
    }, opts.storage);
  }

  function resetProfilePassword(profileIdOrEmail, storage) {
    const token = makeResetToken();
    const profile = updateProfile(profileIdOrEmail, {
      passwordResetToken: token,
      passwordResetExpiresAt: passwordResetExpiresAt(),
      passwordResetRequired: true,
      lastPasswordResetAt: new Date().toISOString()
    }, storage);
    return profile ? { ok: true, reason: 'reset_token_created', token, profile } : { ok: false, reason: 'profile_not_found', token: '', profile: null };
  }

  function requestPasswordReset(email, storage) {
    return resetProfilePassword(email, storage);
  }

  function validatePasswordResetToken(email, token, storage) {
    const profile = getProfile(email, storage);
    if (!profile) return { ok: false, reason: 'profile_not_found', profile: null };
    const saved = String(profile.passwordResetToken || '').trim().toUpperCase();
    const provided = String(token || '').trim().toUpperCase();
    if (!saved || saved !== provided) return { ok: false, reason: 'reset_token_invalid', profile };
    if (profile.passwordResetExpiresAt && new Date(profile.passwordResetExpiresAt).getTime() < Date.now()) return { ok: false, reason: 'reset_token_expired', profile };
    return { ok: true, reason: 'reset_token_ok', profile };
  }

  function completePasswordReset(email, token, newPassword, storage) {
    const validation = validatePasswordResetToken(email, token, storage);
    if (!validation.ok) return validation;
    if (!String(newPassword || '').trim()) return { ok: false, reason: 'password_required', profile: validation.profile };
    const profile = setProfilePassword(validation.profile.id, newPassword, { storage, temporary: false });
    return { ok: true, reason: 'password_updated', profile };
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

  function extendProfileProjectAccess(profileIdOrEmail, accessData, storage) {
    const list = loadProfiles(storage);
    const needle = String(profileIdOrEmail || '').trim().toLowerCase();
    const entry = makeProjectAccessEntry(accessData || {});
    let updated = null;
    const next = list.map(profile => {
      if (profile.id === profileIdOrEmail || profile.email === needle) {
        const current = Array.isArray(profile.projectAccess) ? profile.projectAccess.slice() : [];
        const idx = current.findIndex(row => row.projectId && entry.projectId && row.projectId === entry.projectId);
        if (idx >= 0) current[idx] = { ...current[idx], ...entry, status: 'active' };
        else current.unshift(entry);
        updated = normalizeProfile({ ...profile, projectAccess: current, updatedAt: new Date().toISOString() });
        return updated;
      }
      return profile;
    });
    saveProfileList(next, storage);
    return updated;
  }

  function extendInviteAccess(inviteIdOrKey, data, storage) {
    const list = loadInviteDrafts(storage);
    const target = String(inviteIdOrKey || '').trim().toUpperCase();
    let updated = null;
    const next = list.map(invite => {
      if (invite.id === inviteIdOrKey || invite.key === target) {
        updated = normalizeInvite({
          ...invite,
          ...(data || {}),
          status: 'active',
          usedCount: 0,
          maxUses: Number((data && data.maxUses) || invite.maxUses || 1)
        });
        return updated;
      }
      return invite;
    });
    saveInviteList(next, storage);
    if (updated && updated.usedByProfileId) {
      extendProfileProjectAccess(updated.usedByProfileId, {
        projectId: updated.projectId,
        projectName: updated.projectName,
        validFrom: updated.validFrom,
        validUntil: updated.expiresAt,
        inviteKey: updated.key,
        keyType: updated.keyType
      }, storage);
    }
    return updated;
  }

  function createProjectAccessKey(data, storage) {
    return saveInviteDraft(Object.assign({ role: PROJECT_INVITE_ROLE, keyType: 'temporary' }, data || {}), storage);
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
      password: data && data.password,
      passwordResetRequired: false,
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
            <p class="v4-muted">Локальный слой под будущие таблицы <code>profiles</code>, <code>invite_keys</code> и <code>password_resets</code>. Админ видит роли, разрешения и может вручную менять доступ.</p>
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
        ${renderUserForm()}
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
    const roles = ['director', 'tech_director', 'manager', 'technician', 'warehouse', 'viewer', 'sound', 'light', 'screens', 'truss_stage', 'invited_specialist'];
    const today = new Date().toISOString().slice(0, 10);
    return `
      <div class="v4-admin-form">
        <div class="v4-kicker">Новый invite / проектный ключ</div>
        <div class="v4-grid-3">
          <label>тип ключа<select data-v4-invite="keyType"><option value="temporary" selected>Временный</option><option value="permanent">Постоянный</option></select></label>
          <label>роль<select data-v4-invite="role">${roles.map(role => `<option value="${escapeHtml(role)}"${role === PROJECT_INVITE_ROLE ? ' selected' : ''}>${escapeHtml(roleLabel(role))}</option>`).join('')}</select></label>
          <label>workspace<input data-v4-invite="workspace" type="text" value="MAIN"></label>
          <label>лимит использований<input data-v4-invite="maxUses" type="number" min="1" value="1"></label>
          <label>проект<input data-v4-invite="projectId" type="text" placeholder="ID / название проекта"></label>
          <label>с даты<input data-v4-invite="validFrom" type="date" value="${escapeHtml(today)}"></label>
          <label>по дату<input data-v4-invite="expiresAt" type="date" value="${escapeHtml(addDays(today, DEFAULT_INVITE_LIMITS.expiresDays).slice(0, 10))}"></label>
        </div>
        <label>примечание<input data-v4-invite="note" type="text" placeholder="для кого / проект / срок"></label>
      </div>`;
  }

  function renderUserForm() {
    const roles = getRoleOptions();
    return `
      <div class="v4-admin-form v4-admin-user-form">
        <div class="v4-kicker">Добавить пользователя вручную</div>
        <div class="v4-grid-3">
          <label>Email<input data-v4-user-create="email" type="email" placeholder="user@feg.local"></label>
          <label>Имя<input data-v4-user-create="displayName" type="text" placeholder="Имя / роль на проекте"></label>
          <label>Роль<select data-v4-user-create="role">${roles}</select></label>
          <label>Workspace<input data-v4-user-create="workspaceId" type="text" value="MAIN"></label>
          <label>Статус<select data-v4-user-create="status"><option value="active">active</option><option value="disabled">disabled</option><option value="blocked">blocked</option></select></label>
          <label>Временный пароль<input data-v4-user-create="temporaryPassword" type="text" placeholder="выдать сотруднику"></label>
        </div>
        <button type="button" class="btn-primary" data-v4-admin="create-user">+ Добавить пользователя</button>
      </div>`;
  }

  function getRoleOptions(selected) {
    const labels = ROOT.RolePermissions && ROOT.RolePermissions.ROLE_LABELS ? ROOT.RolePermissions.ROLE_LABELS : {};
    return Object.keys(labels).map(role => `<option value="${escapeHtml(role)}"${role === selected ? ' selected' : ''}>${escapeHtml(roleLabel(role))}</option>`).join('');
  }

  function renderPermissions(profile) {
    const perms = ROOT.RolePermissions && ROOT.RolePermissions.getProfilePermissions ? ROOT.RolePermissions.getProfilePermissions(profile) : [];
    const add = (profile.permissionsAdd || []).join(', ');
    const remove = (profile.permissionsRemove || []).join(', ');
    return `
      <details class="v4-permission-details">
        <summary>Разрешения: ${escapeHtml(perms.includes('*') ? 'полный доступ' : `${perms.length} шт.`)}</summary>
        <div class="v4-permission-editor" data-v4-profile-permissions="${escapeHtml(profile.id)}">
          <div class="v4-permission-list">${(perms.includes('*') ? ['*'] : perms).map(permission => `<code>${escapeHtml(permission)}</code>`).join('')}</div>
          <div class="v4-grid-2">
            <label>Добавить права<input data-v4-profile-add="${escapeHtml(profile.id)}" type="text" value="${escapeHtml(add)}" placeholder="permission:a, permission:b"></label>
            <label>Убрать права<input data-v4-profile-remove="${escapeHtml(profile.id)}" type="text" value="${escapeHtml(remove)}" placeholder="permission:a"></label>
          </div>
          <button type="button" class="btn-secondary" data-v4-save-permissions="${escapeHtml(profile.id)}">Сохранить разрешения</button>
        </div>
      </details>`;
  }

  function renderProfilesTable(profiles) {
    return `
      <div class="v4-table-wrap v4-admin-users-table">
        <h4>Пользователи, роли и доступ</h4>
        <table class="v4-table"><thead><tr><th>Email / имя</th><th>Роль</th><th>Workspace</th><th>Статус</th><th>Пароль</th><th>Разрешения</th><th></th></tr></thead><tbody>
          ${profiles.map(profile => `<tr data-v4-profile-row="${escapeHtml(profile.id)}"><td><b>${escapeHtml(profile.email)}</b><br><small>${escapeHtml(profile.displayName)}</small></td><td><select data-v4-profile-role="${escapeHtml(profile.id)}">${getRoleOptions(profile.role)}</select></td><td><input data-v4-profile-workspace="${escapeHtml(profile.id)}" value="${escapeHtml(profile.workspaceId)}"></td><td><select data-v4-profile-status="${escapeHtml(profile.id)}"><option value="active"${profile.status === 'active' ? ' selected' : ''}>active</option><option value="disabled"${profile.status === 'disabled' ? ' selected' : ''}>disabled</option><option value="blocked"${profile.status === 'blocked' ? ' selected' : ''}>blocked</option></select></td><td>${profile.passwordResetToken ? `<code>${escapeHtml(profile.passwordResetToken)}</code><br><small>${escapeHtml((profile.passwordResetExpiresAt || '').slice(0, 10))}</small>` : '<span class="v4-muted">—</span>'}</td><td>${renderPermissions(profile)}</td><td><button type="button" class="btn-secondary" data-v4-save-profile="${escapeHtml(profile.id)}">Сохранить</button><button type="button" class="btn-secondary" data-v4-reset-password="${escapeHtml(profile.id)}">Сброс пароля</button><button type="button" class="btn-secondary" data-v4-delete-profile="${escapeHtml(profile.id)}">Удалить</button></td></tr>`).join('') || '<tr><td colspan="7" class="v4-muted">Пользователей пока нет.</td></tr>'}
        </tbody></table>
      </div>`;
  }

  function renderInviteTable(invites) {
    return `
      <div class="v4-table-wrap">
        <h4>Ключи доступа</h4>
        <table class="v4-table"><thead><tr><th>Ключ</th><th>Тип</th><th>Роль</th><th>Проект</th><th>Лимит</th><th>Статус</th><th>Период</th><th></th></tr></thead><tbody>
          ${invites.slice(0, 30).map(item => `<tr><td><code>${escapeHtml(item.key)}</code><br><small class="v4-muted">${escapeHtml(item.workspace)}</small></td><td>${escapeHtml(item.keyType === 'permanent' ? 'постоянный' : 'временный')}</td><td>${escapeHtml(roleLabel(item.role))}</td><td>${escapeHtml(item.projectId || item.projectName || '—')}</td><td>${escapeHtml(item.usedCount)} / ${escapeHtml(item.maxUses)}</td><td>${escapeHtml(inferInviteStatus(item))}</td><td>${escapeHtml((item.validFrom || '').slice(0, 10))} → ${escapeHtml(item.keyType === 'permanent' ? 'постоянно' : (item.expiresAt || '').slice(0, 10))}</td><td><button type="button" class="btn-secondary" data-v4-extend-invite="${escapeHtml(item.id)}">Продлить</button><button type="button" class="btn-secondary" data-v4-disable-invite="${escapeHtml(item.id)}">Откл.</button></td></tr>`).join('') || '<tr><td colspan="8" class="v4-muted">Ключей пока нет.</td></tr>'}
        </tbody></table>
      </div>`;
  }

  function bindAdminActions(root, cb) {
    const readCreateUser = () => {
      const data = {};
      root.querySelectorAll('[data-v4-user-create]').forEach(input => { data[input.getAttribute('data-v4-user-create')] = input.value; });
      return data;
    };
    const readInvite = () => ({
      keyType: (root.querySelector('[data-v4-invite="keyType"]') || {}).value || 'temporary',
      role: (root.querySelector('[data-v4-invite="role"]') || {}).value || 'technician',
      workspace: (root.querySelector('[data-v4-invite="workspace"]') || {}).value || 'MAIN',
      maxUses: Number((root.querySelector('[data-v4-invite="maxUses"]') || {}).value || 1),
      projectId: (root.querySelector('[data-v4-invite="projectId"]') || {}).value || '',
      projectName: (root.querySelector('[data-v4-invite="projectId"]') || {}).value || '',
      validFrom: (root.querySelector('[data-v4-invite="validFrom"]') || {}).value || '',
      expiresAt: (root.querySelector('[data-v4-invite="expiresAt"]') || {}).value || '',
      singleUse: true,
      note: (root.querySelector('[data-v4-invite="note"]') || {}).value || ''
    });
    root.querySelectorAll('[data-v4-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-v4-admin');
        if (action === 'create-user') {
          const result = createProfile(readCreateUser());
          if (cb.onUserChange) cb.onUserChange(result);
          renderAdminDashboard(root, cb);
        }
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
    root.querySelectorAll('[data-v4-save-profile]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-v4-save-profile');
        const roleInput = root.querySelector(`[data-v4-profile-role="${cssEscape(id)}"]`);
        const statusInput = root.querySelector(`[data-v4-profile-status="${cssEscape(id)}"]`);
        const workspaceInput = root.querySelector(`[data-v4-profile-workspace="${cssEscape(id)}"]`);
        const profile = updateProfile(id, {
          role: roleInput && roleInput.value,
          status: statusInput && statusInput.value,
          workspaceId: workspaceInput && workspaceInput.value
        });
        if (cb.onUserChange) cb.onUserChange(profile);
        renderAdminDashboard(root, cb);
      });
    });
    root.querySelectorAll('[data-v4-save-permissions]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-v4-save-permissions');
        const addInput = root.querySelector(`[data-v4-profile-add="${cssEscape(id)}"]`);
        const removeInput = root.querySelector(`[data-v4-profile-remove="${cssEscape(id)}"]`);
        const profile = setProfilePermissions(id, addInput && addInput.value, removeInput && removeInput.value);
        if (cb.onUserChange) cb.onUserChange(profile);
        renderAdminDashboard(root, cb);
      });
    });
    root.querySelectorAll('[data-v4-reset-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = resetProfilePassword(btn.getAttribute('data-v4-reset-password'));
        if (cb.onPasswordReset) cb.onPasswordReset(result);
        renderAdminDashboard(root, cb);
      });
    });
    root.querySelectorAll('[data-v4-delete-profile]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = deleteProfile(btn.getAttribute('data-v4-delete-profile'));
        if (cb.onUserChange) cb.onUserChange(result);
        renderAdminDashboard(root, cb);
      });
    });

    root.querySelectorAll('[data-v4-extend-invite]').forEach(btn => {
      btn.addEventListener('click', () => {
        const invite = extendInviteAccess(btn.getAttribute('data-v4-extend-invite'), readInvite());
        if (cb.onGenerate) cb.onGenerate(invite);
        renderAdminDashboard(root, cb);
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

  function cssEscape(value) {
    if (GLOBAL.CSS && GLOBAL.CSS.escape) return GLOBAL.CSS.escape(String(value || ''));
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
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
    getProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    saveProfile,
    setProfileRole,
    setProfilePermissions,
    setProfilePassword,
    resetProfilePassword,
    requestPasswordReset,
    validatePasswordResetToken,
    completePasswordReset,
    verifyPassword,
    extendProfileProjectAccess,
    extendInviteAccess,
    createProjectAccessKey,
    hasAnyAdmin,
    canCreateFirstAdmin,
    createFirstAdmin,
    seedDemoAccess,
    exportAccessState,
    renderAdminDashboard
  };
})();
