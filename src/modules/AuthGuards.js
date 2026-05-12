(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function requireAuth(state) {
    const authState = state || (ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : {});
    return Boolean(authState && authState.isAuthenticated);
  }

  function requirePermission(permission, state) {
    const authState = state || (ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : {});
    if (!requireAuth(authState)) return false;
    if (!ROOT.RolePermissions || !ROOT.RolePermissions.hasPermission) return false;
    return ROOT.RolePermissions.hasPermission(authState.role, permission);
  }

  function requireRole(role, state) {
    const authState = state || (ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : {});
    return requireAuth(authState) && authState.role === role;
  }

  ROOT.AuthGuards = { requireAuth, requirePermission, requireRole };
})();
