(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'fegV4DemoAuthUser';

  function getStorage(storage) {
    if (storage) return storage;
    if (GLOBAL.localStorage) return GLOBAL.localStorage;
    if (!GLOBAL.__FEG_MEMORY_STORAGE__) {
      const data = new Map();
      GLOBAL.__FEG_MEMORY_STORAGE__ = {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
      };
    }
    return GLOBAL.__FEG_MEMORY_STORAGE__;
  }

  function getAppEnv() {
    const config = GLOBAL.FEG_APP_CONFIG || {};
    return String(config.env || GLOBAL.FEG_APP_ENV || 'development').toLowerCase();
  }

  function isLocalHost() {
    return Boolean(GLOBAL.location) && ['localhost', '127.0.0.1', '::1', ''].includes(GLOBAL.location.hostname);
  }

  function isDemoAuthEnabled() {
    const config = GLOBAL.FEG_APP_CONFIG || {};
    if (config.enableDemoAuth === false || GLOBAL.FEG_ENABLE_DEMO_AUTH === false) return false;
    if (GLOBAL.FEG_ENABLE_DEMO_AUTH === true || config.enableDemoAuth === true) return true;
    return getAppEnv() !== 'production' || isLocalHost();
  }

  function signInAs(role, storage) {
    if (!isDemoAuthEnabled()) throw new Error('Demo auth disabled for this environment.');
    const user = ROOT.TestFixtures && ROOT.TestFixtures.getDemoUser
      ? ROOT.TestFixtures.getDemoUser(role)
      : { id: `demo-${role || 'viewer'}`, email: 'demo@feg.local', displayName: 'Demo User', role: role || 'viewer', isDemo: true };
    const next = Object.assign({}, user, { signedInAt: new Date().toISOString(), provider: 'demo' });
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function getCurrentUser(storage) {
    try {
      const raw = getStorage(storage).getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function signOut(storage) {
    getStorage(storage).removeItem(STORAGE_KEY);
  }

  ROOT.DemoAuthProvider = {
    STORAGE_KEY,
    getAppEnv,
    isLocalHost,
    isDemoAuthEnabled,
    signInAs,
    getCurrentUser,
    signOut
  };
})();
