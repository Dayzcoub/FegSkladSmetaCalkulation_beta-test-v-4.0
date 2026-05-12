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

  function signInProfile(email, storage) {
    const profile = findProfileByEmail(email, storage);
    if (!profile) return { ok: false, reason: 'profile_not_found', user: null };
    if (profile.status && profile.status !== 'active') return { ok: false, reason: 'profile_not_active', user: null, profile };
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
    signInProfile,
    registerWithInvite,
    createFirstAdmin,
    exportAuthSnapshot
  };
})();
