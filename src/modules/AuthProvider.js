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

  function signInProfile(email) {
    if (!ROOT.LocalAuthProvider || !ROOT.LocalAuthProvider.signInProfile) return { ok: false, reason: 'local_auth_missing', user: null };
    if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.signOut) ROOT.DemoAuthProvider.signOut();
    return ROOT.LocalAuthProvider.signInProfile(email);
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

  ROOT.AuthProvider = { getCurrentUser, signInDemo, signInProfile, signInSupabaseEmail, signInSupabaseOAuth, getSupabaseAuthReadiness, registerWithInvite, createFirstAdmin, signOut, isDemoAuthEnabled, getAuthState };
})();
