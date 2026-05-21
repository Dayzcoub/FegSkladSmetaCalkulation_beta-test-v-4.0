(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function getCurrentUser() {
    if (ROOT.LocalAuthProvider && ROOT.LocalAuthProvider.getCurrentUser) {
      const localUser = ROOT.LocalAuthProvider.getCurrentUser();
      if (localUser) return localUser;
    }
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.getCurrentUser) return ROOT.DemoAuthProvider.getCurrentUser();
    return null;
  }

  function signInDemo(role) {
    if (!ROOT.DemoAuthProvider || !ROOT.DemoAuthProvider.signInAs) throw new Error('DemoAuthProvider is not available.');
    if (ROOT.LocalAuthProvider && ROOT.LocalAuthProvider.signOut) ROOT.LocalAuthProvider.signOut();
    return ROOT.DemoAuthProvider.signInAs(role);
  }

  function signInProfile(email, password) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.signInProfile) return { ok: false, reason: 'local_auth_missing', user: null };
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.signOut) ROOT.DemoAuthProvider.signOut();
    return ROOT.LocalAuthProvider.signInProfile(email, password);
  }

  async function signInSupabaseEmail(email, options) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.signInWithEmail) return { ok: false, reason: 'supabase_auth_missing' };
    return ROOT.SupabaseAuthAdapter.signInWithEmail(email, options || {});
  }

  async function signInSupabaseOAuth(provider, options) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.signInWithOAuth) return { ok: false, reason: 'supabase_auth_missing' };
    return ROOT.SupabaseAuthAdapter.signInWithOAuth(provider, options || {});
  }

  function getSupabaseAuthReadiness(config) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.buildAuthReadinessReport) return { ok: false, reason: 'supabase_auth_missing' };
    return ROOT.SupabaseAuthAdapter.buildAuthReadinessReport(config || {});
  }

  function requestPasswordReset(email) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.requestPasswordReset) return { ok: false, reason: 'local_auth_missing', profile: null };
    return ROOT.LocalAuthProvider.requestPasswordReset(email);
  }

  function completePasswordReset(data) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.completePasswordReset) return { ok: false, reason: 'local_auth_missing', profile: null };
    return ROOT.LocalAuthProvider.completePasswordReset(data || {});
  }

  function registerWithInvite(data) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.registerWithInvite) return { ok: false, reason: 'local_auth_missing', user: null };
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.signOut) ROOT.DemoAuthProvider.signOut();
    return ROOT.LocalAuthProvider.registerWithInvite(data);
  }

  function createFirstAdmin(data) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.createFirstAdmin) return { ok: false, reason: 'local_auth_missing', user: null };
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.signOut) ROOT.DemoAuthProvider.signOut();
    return ROOT.LocalAuthProvider.createFirstAdmin(data);
  }


  function getSessionBridgeReport(options) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.buildSupabaseSessionBridgeReport) return { ok: false, reason: 'supabase_auth_missing' };
    return ROOT.SupabaseAuthAdapter.buildSupabaseSessionBridgeReport(options || {});
  }

  function getRuntimeRoleGuardReport(options) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.buildRuntimeRoleGuardReport) return { ok: false, reason: 'supabase_auth_missing' };
    return ROOT.SupabaseAuthAdapter.buildRuntimeRoleGuardReport(options || {});
  }

  function hasActiveProjectAccess(user) {
    if (!user || user.role !== 'invited_specialist') return true;
    const rows = Array.isArray(user.projectAccess) ? user.projectAccess : [];
    const now = new Date();
    return rows.some(row => {
      const from = row.validFrom ? new Date(`${String(row.validFrom).slice(0, 10)}T00:00:00`) : null;
      const until = row.keyType === 'permanent' ? null : (row.validUntil ? new Date(`${String(row.validUntil).slice(0, 10)}T23:59:59`) : null);
      if (from && from.getTime() > now.getTime()) return false;
      if (until && until.getTime() < now.getTime()) return false;
      return row.status !== 'disabled' && row.status !== 'revoked';
    });
  }

  function assertRuntimeSectionAccess(sectionId, options) {
    if (!ROOT.SupabaseAuthAdapter || !ROOT.SupabaseAuthAdapter.assertRuntimeSectionAccess) {
      const state = options && options.authState || getAuthState();
      const role = options && options.role || state.role || 'viewer';
      const user = state.user || getCurrentUser();
      const projectOk = hasActiveProjectAccess(user);
      const roleOk = ROOT.RolePermissions && ROOT.RolePermissions.canSeeSectionForUser ? ROOT.RolePermissions.canSeeSectionForUser(user || { role }, sectionId) : (ROOT.RolePermissions && ROOT.RolePermissions.canSeeSection ? ROOT.RolePermissions.canSeeSection(role, sectionId) : true);
      const ok = projectOk && roleOk;
      return { ok, section_id: sectionId, role, fallback_section: ROOT.UserDashboard && ROOT.UserDashboard.getDefaultSectionForRole ? ROOT.UserDashboard.getDefaultSectionForRole(role) : 'projects', reason: projectOk ? 'role_guard' : 'project_key_expired' };
    }
    return ROOT.SupabaseAuthAdapter.assertRuntimeSectionAccess(sectionId, Object.assign({ authState: getAuthState() }, options || {}));
  }

  function signOut() {
    if (ROOT.LocalAuthProvider && ROOT.LocalAuthProvider.signOut) ROOT.LocalAuthProvider.signOut();
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.signOut) ROOT.DemoAuthProvider.signOut();
  }

  function isDemoAuthEnabled() {
    return Boolean(ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.isDemoAuthEnabled && ROOT.DemoAuthProvider.isDemoAuthEnabled());
  }

  function getAuthState() {
    const user = getCurrentUser();
    return {
      user,
      isAuthenticated: Boolean(user),
      isDemo: Boolean(user && user.isDemo),
      role: user && user.role ? user.role : 'viewer',
      demoEnabled: isDemoAuthEnabled(),
      provider: user && user.provider ? user.provider : '',
      supabaseAuth: ROOT.SupabaseAuthAdapter && ROOT.SupabaseAuthAdapter.getAuthMode ? ROOT.SupabaseAuthAdapter.getAuthMode() : 'local'
    };
  }

  ROOT.AuthProvider = { hasActiveProjectAccess, getCurrentUser, signInDemo, signInProfile, signInSupabaseEmail, signInSupabaseOAuth, getSupabaseAuthReadiness, getSessionBridgeReport, getRuntimeRoleGuardReport, assertRuntimeSectionAccess, requestPasswordReset, completePasswordReset, registerWithInvite, createFirstAdmin, signOut, isDemoAuthEnabled, getAuthState };
})();
