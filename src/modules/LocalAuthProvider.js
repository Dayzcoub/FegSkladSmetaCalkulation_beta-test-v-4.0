(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'fegV4LocalAuthUser';

  function getStorage(storage) {
    if (storage) return storage;
    if (GLOBAL.localStorage) return GLOBAL.localStorage;
    if (!GLOBAL.__FEG_LOCAL_AUTH_MEMORY_STORAGE__) {
      const data = new Map();
      GLOBAL.__FEG_LOCAL_AUTH_MEMORY_STORAGE__ = {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
      };
    }
    return GLOBAL.__FEG_LOCAL_AUTH_MEMORY_STORAGE__;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function publicUserFromProfile(profile, provider) {
    const data = profile || {};
    return {
      id: data.id || `profile-${Date.now()}`,
      email: normalizeEmail(data.email),
      displayName: data.displayName || data.name || data.email || 'Пользователь',
      companyName: data.companyName || '',
      role: data.role || 'viewer',
      workspaceId: data.workspaceId || data.workspace || 'MAIN',
      workspaceName: data.workspaceName || data.workspaceId || data.workspace || 'MAIN',
      status: data.status || 'active',
      projectAccess: Array.isArray(data.projectAccess) ? data.projectAccess : [],
      permissionsAdd: Array.isArray(data.permissionsAdd) ? data.permissionsAdd : [],
      permissionsRemove: Array.isArray(data.permissionsRemove) ? data.permissionsRemove : [],
      passwordResetRequired: Boolean(data.passwordResetRequired),
      provider: provider || 'local',
      isDemo: false,
      signedInAt: new Date().toISOString()
    };
  }

  function getCurrentUser(storage) {
    try {
      const raw = getStorage(storage).getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveCurrentUser(user, storage) {
    const next = publicUserFromProfile(user, user && user.provider || 'local');
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function signOut(storage) {
    getStorage(storage).removeItem(STORAGE_KEY);
  }

  function findProfileByEmail(email, storage) {
    const normalized = normalizeEmail(email);
    const admin = ROOT.AdminShell || {};
    const profiles = admin.loadProfiles ? admin.loadProfiles(storage) : [];
    return profiles.find(profile => normalizeEmail(profile.email) === normalized) || null;
  }

  function hasActiveProjectAccess(profile) {
    if (!profile || profile.role !== 'invited_specialist') return true;
    const rows = Array.isArray(profile.projectAccess) ? profile.projectAccess : [];
    const now = new Date();
    return rows.some(row => {
      if (!row || row.status === 'disabled' || row.status === 'revoked') return false;
      const from = row.validFrom ? new Date(`${String(row.validFrom).slice(0, 10)}T00:00:00`) : null;
      const until = row.keyType === 'permanent' ? null : (row.validUntil ? new Date(`${String(row.validUntil).slice(0, 10)}T23:59:59`) : null);
      if (from && from.getTime() > now.getTime()) return false;
      if (until && until.getTime() < now.getTime()) return false;
      return Boolean(row.projectId || row.projectName || row.inviteKey);
    });
  }

  function signInProfile(email, password, storage) {
    if (password && typeof password !== 'string') { storage = password; password = ''; }
    const profile = findProfileByEmail(email, storage);
    if (!profile) return { ok: false, reason: 'profile_not_found', user: null };
    if (profile.passwordHash && ROOT.AdminShell && ROOT.AdminShell.verifyPassword && !ROOT.AdminShell.verifyPassword(password, profile.passwordHash)) return { ok: false, reason: 'invalid_password', user: null, profile };
    if (profile.passwordResetRequired && profile.passwordHash && !String(password || '').trim()) return { ok: false, reason: 'password_required', user: null, profile };
    if (profile.status && profile.status !== 'active') return { ok: false, reason: 'profile_not_active', user: null, profile };
    if (!hasActiveProjectAccess(profile)) return { ok: false, reason: 'project_access_expired', user: null, profile };
    const user = saveCurrentUser(profile, storage);
    return { ok: true, reason: 'signed_in', user, profile };
  }

  function registerWithInvite(data, storage) {
    const admin = ROOT.AdminShell || {};
    if (!admin.consumeInviteKey) return { ok: false, reason: 'admin_shell_missing', user: null };
    const payload = data || {};
    const email = normalizeEmail(payload.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, reason: 'invalid_email', user: null };
    if (!String(payload.displayName || '').trim()) return { ok: false, reason: 'display_name_required', user: null };
    if (!String(payload.inviteKey || '').trim()) return { ok: false, reason: 'invite_key_required', user: null };
    const result = admin.consumeInviteKey(payload.inviteKey, {
      email,
      displayName: payload.displayName,
      companyName: payload.companyName || '',
      password: payload.password || '',
      status: 'active'
    }, storage);
    if (!result || !result.ok) return { ok: false, reason: result && result.reason || 'invite_failed', user: null, invite: result && result.invite };
    const user = saveCurrentUser(result.profile, storage);
    return { ok: true, reason: 'registered', user, profile: result.profile, invite: result.invite };
  }

  function createFirstAdmin(data, options) {
    const admin = ROOT.AdminShell || {};
    if (!admin.createFirstAdmin) return { ok: false, reason: 'admin_shell_missing', user: null };
    const opts = options || {};
    const result = admin.createFirstAdmin(data || {}, opts);
    if (!result || !result.ok) return { ok: false, reason: result && result.reason || 'bootstrap_failed', user: null, profile: result && result.profile };
    const user = saveCurrentUser(result.profile, opts.storage);
    return { ok: true, reason: 'first_admin_created', user, profile: result.profile };
  }

  function requestPasswordReset(email, storage) {
    const admin = ROOT.AdminShell || {};
    if (!admin.requestPasswordReset) return { ok: false, reason: 'admin_shell_missing', profile: null };
    return admin.requestPasswordReset(email, storage);
  }

  function completePasswordReset(data, storage) {
    const admin = ROOT.AdminShell || {};
    if (!admin.completePasswordReset) return { ok: false, reason: 'admin_shell_missing', profile: null };
    const payload = data || {};
    return admin.completePasswordReset(payload.email, payload.resetToken || payload.token, payload.password || payload.newPassword, storage);
  }

  function exportAuthSnapshot(storage) {
    return JSON.stringify({
      schema: 'feg-stage-pro-local-auth-snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      current_user: getCurrentUser(storage),
      profiles: ROOT.AdminShell && ROOT.AdminShell.loadProfiles ? ROOT.AdminShell.loadProfiles(storage) : [],
      invite_keys: ROOT.AdminShell && ROOT.AdminShell.loadInviteDrafts ? ROOT.AdminShell.loadInviteDrafts(storage) : []
    }, null, 2);
  }

  ROOT.LocalAuthProvider = {
    STORAGE_KEY,
    getCurrentUser,
    saveCurrentUser,
    signOut,
    findProfileByEmail,
    hasActiveProjectAccess,
    signInProfile,
    requestPasswordReset,
    completePasswordReset,
    registerWithInvite,
    createFirstAdmin,
    exportAuthSnapshot
  };
})();
