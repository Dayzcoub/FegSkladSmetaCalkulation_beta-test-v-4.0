(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUPABASE_AUTH_ADAPTER_VERSION = '3.14.6';
  const AUTH_SNAPSHOT_STORAGE_KEY = 'fegV4SupabaseAuthReadinessSnapshots';
  const AUTH_SESSION_PREFLIGHT_STORAGE_KEY = 'fegV4AuthSessionPreflightReports';
  const AUTH_INVITE_PREFLIGHT_STORAGE_KEY = 'fegV4AuthInviteBootstrapPreflightReports';
  const AUTH_SESSION_BRIDGE_STORAGE_KEY = 'fegV4AuthSessionBridgeReports';
  const AUTH_ROLE_GUARD_STORAGE_KEY = 'fegV4AuthRoleGuardSnapshots';
  const AUTH_REQUEST_TEMPLATE_STORAGE_KEY = 'fegV4AuthRequestTemplates';
  const AUTH_ACTION_DRY_RUN_STORAGE_KEY = 'fegV4AuthActionDryRunReports';
  const AUTH_ACTION_AUDIT_STORAGE_KEY = 'fegV4AuthActionAuditSnapshots';
  const AUTH_ACTION_APPROVAL_STORAGE_KEY = 'fegV4AuthActionApprovalPackage';
  const AUTH_ACTION_EXECUTION_TEMPLATE_STORAGE_KEY = 'fegV4AuthActionExecutionTemplates';
  const AUTH_CONTROLLED_ACTION_REPORT_STORAGE_KEY = 'fegV4AuthControlledActionReports';
  const AUTH_ACTION_POST_VERIFY_STORAGE_KEY = 'fegV4AuthActionPostVerificationReports';
  const AUTH_ACTION_SAFETY_AUDIT_STORAGE_KEY = 'fegV4AuthActionSafetyAuditSnapshots';
  const AUTH_ACTION_CAPABILITY_STORAGE_KEY = 'fegV4AuthActionCapabilitySnapshots';
  const AUTH_ACTION_ADAPTER_SANDBOX_STORAGE_KEY = 'fegV4AuthActionAdapterSandboxSnapshots';
  const AUTH_ACTION_PROMOTION_REVIEW_STORAGE_KEY = 'fegV4AuthActionPromotionReviewSnapshots';
  const AUTH_SESSION_DRY_RUN_FUNCTION = 'auth-session-dry-run';
  const AUTH_CONTROLLED_ACTION_FUNCTION = 'auth-controlled-action';
  const ROLE_FALLBACK = 'viewer';
  const KNOWN_ROLES = Object.freeze(['admin', 'manager', 'technician', 'warehouse', 'viewer']);
  const KNOWN_AUTH_ACTIONS = Object.freeze(['session_restore', 'email_magic_link', 'oauth_google', 'oauth_apple', 'invite_registration', 'first_admin_bootstrap', 'logout']);

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function normalizeEmail(value) { return toText(value).toLowerCase(); }
  function normalizeRole(role) { const text = toText(role).toLowerCase(); return KNOWN_ROLES.includes(text) ? text : ROLE_FALLBACK; }
  function normalizeAuthAction(action) { const text = toText(action || 'session_restore').toLowerCase().replace(/[\s-]+/g, '_'); return KNOWN_AUTH_ACTIONS.includes(text) ? text : 'session_restore'; }
  function stableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  function checksumString(value) {
    const text = stableStringify(value);
    let h1 = 0xdeadbeef ^ text.length;
    let h2 = 0x41c6ce57 ^ text.length;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const value53 = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return `auth-${value53.toString(16)}`;
  }


  function getStorage(storage) {
    if (storage) return storage;
    try { if (GLOBAL.localStorage) return GLOBAL.localStorage; } catch (_) {}
    if (!GLOBAL.__FEG_SUPABASE_AUTH_MEMORY_STORAGE__) {
      const data = new Map();
      GLOBAL.__FEG_SUPABASE_AUTH_MEMORY_STORAGE__ = {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
      };
    }
    return GLOBAL.__FEG_SUPABASE_AUTH_MEMORY_STORAGE__;
  }

  function readJson(storage, key, fallback) {
    const store = getStorage(storage);
    if (!store) return clone(fallback);
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (_) { return clone(fallback); }
  }

  function writeJson(storage, key, value) {
    const store = getStorage(storage);
    if (!store) return false;
    try { store.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }

  function backendAdapter() { return ROOT.BackendSyncAdapter || null; }

  function getRuntimeConfig(input) {
    const backend = backendAdapter();
    const base = backend && backend.getRuntimeConfig ? backend.getRuntimeConfig(input) : Object.assign({ mode: 'local', workspaceId: 'main' }, input || GLOBAL.FEG_APP_CONFIG || {});
    const cfg = Object.assign({}, GLOBAL.FEG_APP_CONFIG || {}, input || {});
    const authMode = toText(cfg.authMode || cfg.supabaseAuthMode || cfg.mode || base.mode || 'local').toLowerCase();
    return {
      mode: authMode,
      backendMode: toText(base.mode || cfg.backendMode || 'local').toLowerCase(),
      workspaceId: toText(cfg.workspaceId || cfg.defaultWorkspaceId || base.workspaceId || 'main'),
      supabaseUrl: toText(cfg.supabaseUrl || cfg.SUPABASE_URL || base.supabaseUrl || ''),
      supabaseAnonKey: toText(cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || base.supabaseAnonKey || ''),
      enableSupabaseAuth: Boolean(cfg.enableSupabaseAuth || cfg.enableRemoteAuth || false),
      enableRemoteSync: Boolean(cfg.enableRemoteSync || base.enableRemoteSync || false),
      redirectTo: toText(cfg.authRedirectTo || cfg.redirectTo || (GLOBAL.location && GLOBAL.location.origin ? `${GLOBAL.location.origin}${GLOBAL.location.pathname || ''}` : '')),
      functionsBaseUrl: toText(cfg.functionsBaseUrl || cfg.functions_base_url || (toText(cfg.supabaseUrl || cfg.SUPABASE_URL || base.supabaseUrl || '') ? `${toText(cfg.supabaseUrl || cfg.SUPABASE_URL || base.supabaseUrl || '').replace(/\/+$/, '')}/functions/v1` : '')),
      authSessionDryRunFunction: toText(cfg.authSessionDryRunFunction || AUTH_SESSION_DRY_RUN_FUNCTION) || AUTH_SESSION_DRY_RUN_FUNCTION,
      authControlledActionFunction: toText(cfg.authControlledActionFunction || AUTH_CONTROLLED_ACTION_FUNCTION) || AUTH_CONTROLLED_ACTION_FUNCTION,
      tableMap: Object.assign({}, base.tableMap || {}, cfg.tableMap || {})
    };
  }

  function getSupabaseSdk(supabaseGlobal) { return supabaseGlobal || GLOBAL.supabase || null; }

  function isSupabaseAuthConfigured(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    const sdk = getSupabaseSdk(supabaseGlobal);
    return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && sdk && typeof sdk.createClient === 'function');
  }

  function getAuthMode(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    if (cfg.mode === 'supabase' && cfg.enableSupabaseAuth && isSupabaseAuthConfigured(cfg, supabaseGlobal)) return 'supabase';
    return 'local';
  }

  function createSupabaseAuthClient(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    const sdk = getSupabaseSdk(supabaseGlobal);
    if (!isSupabaseAuthConfigured(cfg, sdk)) return null;
    return sdk.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function maskKey(key) {
    const text = toText(key);
    if (!text) return '';
    if (text.length <= 8) return `${text.slice(0, 2)}••••${text.slice(-2)}`;
    return `${text.slice(0, 6)}••••${text.slice(-4)}`;
  }

  function mapSupabaseUserToProfile(user, options) {
    const opts = options || {};
    const u = user || {};
    const meta = u.user_metadata || u.raw_user_meta_data || u.app_metadata || {};
    const app = u.app_metadata || {};
    return {
      id: toText(u.id || opts.id || `profile-${Date.now().toString(36)}`),
      workspace_id: toText(meta.workspace_id || meta.workspaceId || app.workspace_id || opts.workspaceId || 'main'),
      email: normalizeEmail(u.email || meta.email || opts.email || ''),
      display_name: toText(meta.display_name || meta.displayName || meta.name || u.email || opts.displayName || 'Пользователь'),
      company_name: toText(meta.company_name || meta.companyName || opts.companyName || ''),
      role: normalizeRole(meta.role || app.role || opts.role || ROLE_FALLBACK),
      status: toText(meta.status || opts.status || 'active'),
      provider: toText(app.provider || opts.provider || 'supabase'),
      auth_user_id: toText(u.id || ''),
      raw_payload: clone(user || {})
    };
  }

  function mapLocalProfileToSupabaseProfile(profile, workspaceId) {
    const p = profile || {};
    return {
      id: toText(p.id || `profile-${Date.now().toString(36)}`),
      workspace_id: toText(p.workspace_id || p.workspaceId || p.workspace || workspaceId || 'main'),
      auth_user_id: toText(p.auth_user_id || p.authUserId || p.supabaseUserId || ''),
      email: normalizeEmail(p.email),
      display_name: toText(p.display_name || p.displayName || p.name || p.email || 'Пользователь'),
      company_name: toText(p.company_name || p.companyName || ''),
      role: normalizeRole(p.role),
      status: toText(p.status || 'active'),
      is_first_admin: Boolean(p.is_first_admin || p.isFirstAdmin || false),
      created_at: toText(p.created_at || p.createdAt || nowIso()),
      updated_at: toText(p.updated_at || p.updatedAt || nowIso()),
      raw_payload: clone(p)
    };
  }

  function buildProfilesPayload(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const adminShell = ROOT.AdminShell || null;
    let profiles = [];
    if (Array.isArray(opts.profiles)) profiles = opts.profiles;
    else if (adminShell && adminShell.loadProfiles) profiles = adminShell.loadProfiles(opts.storage);
    else if (adminShell && adminShell.listProfiles) profiles = adminShell.listProfiles(opts.storage);
    return profiles.map(profile => mapLocalProfileToSupabaseProfile(profile, opts.workspaceId || cfg.workspaceId));
  }

  function buildInviteKeysPayload(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const adminShell = ROOT.AdminShell || null;
    let invites = [];
    if (Array.isArray(opts.inviteKeys)) invites = opts.inviteKeys;
    else if (adminShell && adminShell.loadInviteDrafts) invites = adminShell.loadInviteDrafts(opts.storage);
    else if (adminShell && adminShell.listInviteKeys) invites = adminShell.listInviteKeys(opts.storage);
    return invites.map(invite => ({
      id: toText(invite.id || `invite-${Date.now().toString(36)}`),
      workspace_id: toText(invite.workspace_id || invite.workspaceId || invite.workspace || cfg.workspaceId || 'main'),
      key_hash: toText(invite.key_hash || invite.keyHash || invite.hash || ''),
      key_preview: toText(invite.keyPreview || invite.key_preview || (invite.key ? `${String(invite.key).slice(0, 4)}…${String(invite.key).slice(-4)}` : '')),
      role: normalizeRole(invite.role),
      status: toText(invite.status || (invite.disabled ? 'disabled' : 'active')),
      max_uses: Number(invite.max_uses != null ? invite.max_uses : invite.maxUses || 1),
      used_count: Number(invite.used_count != null ? invite.used_count : invite.usedCount || 0),
      expires_at: toText(invite.expires_at || invite.expiresAt || ''),
      note: toText(invite.note || ''),
      raw_payload: clone(invite)
    }));
  }

  function validateProfilesPayload(rows) {
    const errors = [];
    const seenEmails = new Set();
    (rows || []).forEach((row, index) => {
      if (!row.id) errors.push(`profiles[${index}].id is required`);
      if (!row.workspace_id) errors.push(`profiles[${index}].workspace_id is required`);
      if (!row.email) errors.push(`profiles[${index}].email is required`);
      if (!KNOWN_ROLES.includes(row.role)) errors.push(`profiles[${index}].role is invalid`);
      if (row.email) {
        if (seenEmails.has(row.email)) errors.push(`profiles duplicate email: ${row.email}`);
        seenEmails.add(row.email);
      }
    });
    return { ok: errors.length === 0, errors };
  }

  function buildAuthReadinessReport(config, options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(config || opts.config);
    const sdk = getSupabaseSdk(opts.supabaseGlobal);
    const configured = isSupabaseAuthConfigured(cfg, sdk);
    const authMode = getAuthMode(cfg, sdk);
    const profiles = buildProfilesPayload({ storage: opts.storage, config: cfg });
    const inviteKeys = buildInviteKeysPayload({ storage: opts.storage, config: cfg });
    const profileValidation = validateProfilesPayload(profiles);
    const blockers = [];
    const warnings = [];
    if (cfg.mode === 'supabase' && !cfg.enableSupabaseAuth) warnings.push('authMode=supabase, но enableSupabaseAuth выключен — останемся в local auth.');
    if (!cfg.supabaseUrl) warnings.push('supabaseUrl не задан.');
    if (!cfg.supabaseAnonKey) warnings.push('supabaseAnonKey не задан.');
    if (!sdk || typeof sdk.createClient !== 'function') warnings.push('Supabase SDK не найден.');
    if (!profileValidation.ok) blockers.push(...profileValidation.errors);
    if (!profiles.some(profile => profile.role === 'admin' && profile.status !== 'disabled')) warnings.push('Нет активного admin-профиля для миграции.');
    const score = Math.max(0, 100 - blockers.length * 25 - warnings.length * 8);
    return {
      type: 'feg-stage-pro-supabase-auth-readiness-report',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      auth_mode: authMode,
      requested_mode: cfg.mode,
      workspace_id: cfg.workspaceId,
      configured,
      enable_supabase_auth: cfg.enableSupabaseAuth,
      supabase_url_present: Boolean(cfg.supabaseUrl),
      supabase_anon_key_masked: maskKey(cfg.supabaseAnonKey),
      sdk_present: Boolean(sdk && typeof sdk.createClient === 'function'),
      redirect_to: cfg.redirectTo,
      ready_for_local_profiles_sync: blockers.length === 0,
      ready_for_supabase_auth: blockers.length === 0 && configured && cfg.enableSupabaseAuth && cfg.mode === 'supabase',
      score,
      blockers,
      warnings,
      rows: { profiles, invite_keys: inviteKeys },
      validations: { profiles: profileValidation }
    };
  }


  function endpointUrl(config, fnName) {
    const cfg = getRuntimeConfig(config);
    const base = toText(cfg.functionsBaseUrl);
    return base ? `${base.replace(/\/+$/, '')}/${fnName || cfg.authSessionDryRunFunction || AUTH_SESSION_DRY_RUN_FUNCTION}` : '';
  }

  function maskKey(key) {
    const text = toText(key);
    if (!text) return '';
    if (text.length <= 8) return `${text.slice(0, 2)}•••${text.slice(-1)}`;
    return `${text.slice(0, 4)}••••••${text.slice(-4)}`;
  }

  function getLocalAuthSnapshot(options) {
    const opts = options || {};
    const local = ROOT.LocalAuthProvider && ROOT.LocalAuthProvider.getCurrentUser ? ROOT.LocalAuthProvider.getCurrentUser() : null;
    const demo = ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.getCurrentUser ? ROOT.DemoAuthProvider.getCurrentUser() : null;
    const current = local || demo || null;
    return {
      provider: current && current.provider || (current && current.isDemo ? 'demo' : current ? 'local' : 'none'),
      authenticated: Boolean(current),
      user: current ? {
        id: toText(current.id || ''),
        email: normalizeEmail(current.email || ''),
        display_name: toText(current.displayName || current.display_name || current.name || ''),
        role: normalizeRole(current.role),
        workspace_id: toText(current.workspaceId || current.workspace_id || opts.workspaceId || 'MAIN'),
        is_demo: Boolean(current.isDemo)
      } : null
    };
  }

  function buildRoleGuardMatrix(role, options) {
    const normalizedRole = normalizeRole(role);
    const permsApi = ROOT.RolePermissions || null;
    const sections = ROOT.UserDashboard && Array.isArray(ROOT.UserDashboard.DASHBOARD_SECTIONS)
      ? ROOT.UserDashboard.DASHBOARD_SECTIONS
      : [
        { id: 'quick', permission: 'quick_calculators:view' },
        { id: 'quote', permission: 'quotes:create' },
        { id: 'equipment', permission: 'equipment:view' },
        { id: 'warehouse', permission: 'stock:view' },
        { id: 'documents', permission: 'documents:view' },
        { id: 'projects', permission: 'projects:view' },
        { id: 'clients', permission: 'clients:view' },
        { id: 'settings', permission: 'dashboard:view' },
        { id: 'command', permission: 'command_center:view' },
        { id: 'reports', permission: 'reports:view' },
        { id: 'quality', permission: 'data_quality:view' },
        { id: 'sync', permission: 'admin:access' },
        { id: 'admin', permission: 'admin:access' }
      ];
    const visible = [];
    const hidden = [];
    const checks = sections.map(section => {
      const sectionId = toText(section.id);
      const permission = toText(section.permission || (permsApi && permsApi.SECTION_PERMISSIONS && permsApi.SECTION_PERMISSIONS[sectionId]) || 'dashboard:view');
      const allowed = permsApi && permsApi.canSeeSection ? permsApi.canSeeSection(normalizedRole, sectionId) : true;
      const row = { section_id: sectionId, title: toText(section.title || sectionId), permission, allowed };
      (allowed ? visible : hidden).push(row);
      return row;
    });
    return {
      type: 'feg-stage-pro-role-guard-matrix',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      role: normalizedRole,
      permissions: permsApi && permsApi.getRolePermissions ? clone(permsApi.getRolePermissions(normalizedRole)) : [],
      visible_sections: visible,
      hidden_sections: hidden,
      checks,
      summary: { visible: visible.length, hidden: hidden.length, total: checks.length },
      safe_mode: true,
      note: 'Read-only role/UI guard matrix. It does not change roles or permissions.'
    };
  }

  function buildAuthSessionPreflight(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const local = getLocalAuthSnapshot({ workspaceId: cfg.workspaceId });
    const requestedRole = normalizeRole(opts.role || local.user && local.user.role || ROLE_FALLBACK);
    const roleMatrix = buildRoleGuardMatrix(requestedRole, opts);
    const blockers = [];
    const warnings = [];
    if (cfg.mode === 'supabase' && !cfg.enableSupabaseAuth) warnings.push('authMode=supabase, но enableSupabaseAuth выключен. Реальная Supabase-сессия не будет включена.');
    if (cfg.mode === 'supabase' && !cfg.supabaseUrl) blockers.push('supabaseUrl не задан для Supabase Auth.');
    if (cfg.mode === 'supabase' && !cfg.supabaseAnonKey) blockers.push('supabaseAnonKey не задан для Supabase Auth.');
    if (cfg.mode === 'supabase' && !isSupabaseAuthConfigured(cfg, opts.supabaseGlobal)) warnings.push('Supabase SDK или createClient недоступны в текущей сборке.');
    if (!local.authenticated) warnings.push('Локальная/demo сессия не активна — UI останется на welcome/auth экране.');
    return {
      type: 'feg-stage-pro-auth-session-preflight',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      requested_mode: cfg.mode,
      resolved_mode: getAuthMode(cfg, opts.supabaseGlobal),
      workspace_id: cfg.workspaceId,
      functions_endpoint: endpointUrl(cfg, cfg.authSessionDryRunFunction),
      supabase_url_present: Boolean(cfg.supabaseUrl),
      supabase_anon_key_masked: maskKey(cfg.supabaseAnonKey),
      enable_supabase_auth: cfg.enableSupabaseAuth,
      local_session: local,
      role_matrix: roleMatrix,
      ready_for_local_session: local.authenticated,
      ready_for_remote_session_check: Boolean(endpointUrl(cfg, cfg.authSessionDryRunFunction)),
      ready_for_supabase_auth: blockers.length === 0 && cfg.mode === 'supabase' && cfg.enableSupabaseAuth && isSupabaseAuthConfigured(cfg, opts.supabaseGlobal),
      blockers,
      warnings,
      remote_write_executed: false,
      no_profile_write: true,
      no_invite_consume: true,
      no_session_mutation: true
    };
  }

  function buildInviteBootstrapPreflight(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const admin = ROOT.AdminShell || null;
    const profiles = admin && admin.loadProfiles ? admin.loadProfiles(opts.storage) : buildProfilesPayload({ storage: opts.storage, config: cfg }).map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      workspaceId: row.workspace_id,
      displayName: row.display_name
    }));
    const invites = admin && admin.loadInviteDrafts ? admin.loadInviteDrafts(opts.storage) : buildInviteKeysPayload({ storage: opts.storage, config: cfg });
    const bootstrap = ROOT.AuthShell && ROOT.AuthShell.getBootstrapState ? ROOT.AuthShell.getBootstrapState(opts.storage) : { hasAdmin: profiles.some(profile => normalizeRole(profile.role) === 'admin' && profile.status !== 'disabled') };
    const activeAdmins = (profiles || []).filter(profile => normalizeRole(profile.role) === 'admin' && toText(profile.status || 'active') !== 'disabled');
    const activeInvites = (invites || []).filter(invite => toText(invite.status || (invite.is_active === false ? 'disabled' : 'active')) === 'active' || invite.is_active === true);
    const blockers = [];
    const warnings = [];
    if (!activeAdmins.length && bootstrap.hasAdmin) warnings.push('Bootstrap state говорит, что админ создан, но активный admin profile в локальной выгрузке не найден.');
    if (!bootstrap.hasAdmin && activeAdmins.length) warnings.push('Есть активный admin profile, но bootstrap state ещё не зафиксирован.');
    if (!activeInvites.length) warnings.push('Нет активных invite keys для регистрации новых пользователей.');
    return {
      type: 'feg-stage-pro-auth-invite-bootstrap-preflight',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      workspace_id: cfg.workspaceId,
      bootstrap_state: bootstrap,
      first_admin_required: !bootstrap.hasAdmin && activeAdmins.length === 0,
      active_admin_count: activeAdmins.length,
      profiles_count: (profiles || []).length,
      invite_keys_count: (invites || []).length,
      active_invite_keys_count: activeInvites.length,
      role_counts: (profiles || []).reduce((acc, profile) => { const role = normalizeRole(profile.role); acc[role] = (acc[role] || 0) + 1; return acc; }, {}),
      blockers,
      warnings,
      rows: {
        profiles: clone(profiles || []),
        invite_keys: clone(invites || [])
      },
      remote_write_executed: false,
      no_profile_write: true,
      no_invite_consume: true,
      no_bootstrap_mutation: true
    };
  }


  function getSessionUserFromInput(options) {
    const opts = options || {};
    const session = opts.session || opts.supabaseSession || opts.authSession || null;
    if (opts.user) return opts.user;
    if (session && session.user) return session.user;
    if (session && session.data && session.data.session && session.data.session.user) return session.data.session.user;
    return null;
  }

  function buildSupabaseSessionBridgeReport(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const local = getLocalAuthSnapshot({ workspaceId: cfg.workspaceId });
    const sessionUser = getSessionUserFromInput(opts);
    const bridgedProfile = sessionUser ? mapSupabaseUserToProfile(sessionUser, { workspaceId: cfg.workspaceId }) : null;
    const resolvedRole = normalizeRole(opts.role || bridgedProfile && bridgedProfile.role || local.user && local.user.role || ROLE_FALLBACK);
    const roleMatrix = buildRoleGuardMatrix(resolvedRole, opts);
    const blockers = [];
    const warnings = [];
    if (cfg.mode === 'supabase' && !cfg.enableSupabaseAuth) warnings.push('Supabase Auth выбран, но enableSupabaseAuth выключен — bridge останется preview-only.');
    if (cfg.mode === 'supabase' && !cfg.supabaseUrl) blockers.push('supabaseUrl не задан.');
    if (cfg.mode === 'supabase' && !cfg.supabaseAnonKey) blockers.push('supabaseAnonKey не задан.');
    if (!sessionUser) warnings.push('Supabase session user не передан/не найден — используется local/demo snapshot.');
    if (bridgedProfile && !bridgedProfile.email) blockers.push('Supabase user не содержит email.');
    if (bridgedProfile && bridgedProfile.status && bridgedProfile.status !== 'active') warnings.push(`Профиль bridge имеет status=${bridgedProfile.status}.`);
    const runtimeUser = bridgedProfile ? {
      id: bridgedProfile.id,
      email: bridgedProfile.email,
      displayName: bridgedProfile.display_name,
      companyName: bridgedProfile.company_name,
      role: resolvedRole,
      workspaceId: bridgedProfile.workspace_id || cfg.workspaceId,
      workspaceName: bridgedProfile.workspace_id || cfg.workspaceId,
      provider: bridgedProfile.provider || 'supabase',
      isDemo: false,
      signedInAt: nowIso(),
      authUserId: bridgedProfile.auth_user_id
    } : (local.user ? Object.assign({}, local.user, { role: resolvedRole }) : null);
    return {
      type: 'feg-stage-pro-auth-session-bridge-report',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      requested_mode: cfg.mode,
      resolved_mode: getAuthMode(cfg, opts.supabaseGlobal),
      workspace_id: cfg.workspaceId,
      local_session: local,
      supabase_session_present: Boolean(sessionUser),
      bridged_profile: clone(bridgedProfile),
      runtime_user_preview: clone(runtimeUser),
      role_matrix: roleMatrix,
      ready_for_runtime_bridge: blockers.length === 0 && Boolean(runtimeUser),
      blockers,
      warnings,
      remote_write_executed: false,
      no_profile_write: true,
      no_invite_consume: true,
      no_bootstrap_mutation: true,
      no_local_session_mutation: true,
      note: 'Preview-only bridge. It maps an existing Supabase session to the v4 runtime user shape without writing profile data or mutating local auth.'
    };
  }

  function buildRuntimeRoleGuardReport(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const auth = opts.authState || (ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : null) || {};
    const role = normalizeRole(opts.role || auth.role || auth.user && auth.user.role || ROLE_FALLBACK);
    const matrix = buildRoleGuardMatrix(role, opts);
    const activeSection = toText(opts.activeSection || '');
    const requestedSections = Array.isArray(opts.requestedSections) && opts.requestedSections.length
      ? opts.requestedSections.map(toText)
      : matrix.checks.map(row => row.section_id);
    const guardChecks = requestedSections.map(sectionId => {
      const row = matrix.checks.find(item => item.section_id === sectionId) || { section_id: sectionId, permission: 'dashboard:view', allowed: false, title: sectionId };
      return Object.assign({}, row, {
        requested: true,
        active: activeSection === sectionId,
        decision: row.allowed ? 'allow' : 'deny',
        fallback_section: row.allowed ? sectionId : (ROOT.UserDashboard && ROOT.UserDashboard.getDefaultSectionForRole ? ROOT.UserDashboard.getDefaultSectionForRole(role) : 'projects')
      });
    });
    const denied = guardChecks.filter(row => row.decision === 'deny');
    return {
      type: 'feg-stage-pro-runtime-role-guard-report',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      workspace_id: cfg.workspaceId,
      role,
      authenticated: Boolean(auth.isAuthenticated || auth.user),
      provider: toText(auth.provider || auth.user && auth.user.provider || ''),
      active_section: activeSection,
      checks: guardChecks,
      denied_sections: denied,
      allowed_sections: guardChecks.filter(row => row.decision === 'allow'),
      summary: { requested: guardChecks.length, allowed: guardChecks.length - denied.length, denied: denied.length },
      safe_mode: true,
      remote_write_executed: false,
      note: 'Runtime guard report only audits UI access decisions. It does not change roles, permissions or profiles.'
    };
  }

  function assertRuntimeSectionAccess(sectionId, options) {
    const report = buildRuntimeRoleGuardReport(Object.assign({}, options || {}, { requestedSections: [sectionId], activeSection: sectionId }));
    const row = report.checks[0] || { decision: 'deny', fallback_section: 'projects' };
    return {
      ok: row.decision === 'allow',
      section_id: toText(sectionId),
      role: report.role,
      permission: row.permission,
      fallback_section: row.fallback_section,
      report
    };
  }

  function buildInviteRegistrationRequestTemplate(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const model = ROOT.AuthShell && ROOT.AuthShell.buildRegistrationModel ? ROOT.AuthShell.buildRegistrationModel(opts.registration || {}) : {
      email: normalizeEmail(opts.email),
      displayName: toText(opts.displayName || opts.display_name),
      inviteKey: toText(opts.inviteKey || opts.invite_key),
      provider: toText(opts.provider || 'email'),
      requestedRole: normalizeRole(opts.requestedRole || opts.role || 'technician')
    };
    const validation = ROOT.AuthShell && ROOT.AuthShell.validateRegistrationModel ? ROOT.AuthShell.validateRegistrationModel(model) : { ok: Boolean(model.email && model.displayName && model.inviteKey), errors: [], value: model };
    return {
      type: 'feg-stage-pro-invite-registration-request-template',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      registration: {
        email: normalizeEmail(model.email),
        display_name: toText(model.displayName),
        company_name: toText(model.companyName || opts.companyName || ''),
        provider: toText(model.provider || 'email'),
        requested_role: normalizeRole(model.requestedRole || opts.role || 'technician'),
        invite_key_preview: maskKey(model.inviteKey),
        invite_key_present: Boolean(toText(model.inviteKey))
      },
      validation,
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        template_only: true,
        edge_only_future: true
      },
      note: 'Template only. Do not store or export the raw invite key; this template keeps only presence/masked preview.'
    };
  }

  function buildFirstAdminBootstrapRequestTemplate(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const bootstrapState = ROOT.AuthShell && ROOT.AuthShell.getBootstrapState ? ROOT.AuthShell.getBootstrapState(opts.storage) : { hasAdmin: false };
    const email = normalizeEmail(opts.email || opts.adminEmail || '');
    const displayName = toText(opts.displayName || opts.display_name || opts.name || '');
    const bootstrapKey = toText(opts.bootstrapKey || opts.bootstrap_key || '');
    const errors = [];
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Укажите корректный email первого администратора.');
    if (!displayName) errors.push('Укажите имя/компанию первого администратора.');
    if (!bootstrapKey) errors.push('Введите bootstrap key.');
    if (bootstrapState.hasAdmin) errors.push('Bootstrap уже закрыт локальным состоянием: первый admin отмечен как созданный.');
    return {
      type: 'feg-stage-pro-first-admin-bootstrap-request-template',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      first_admin: {
        email,
        display_name: displayName,
        company_name: toText(opts.companyName || opts.company_name || ''),
        requested_role: 'admin',
        bootstrap_key_preview: maskKey(bootstrapKey),
        bootstrap_key_present: Boolean(bootstrapKey)
      },
      local_bootstrap_state: bootstrapState,
      validation: { ok: errors.length === 0, errors },
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        template_only: true,
        edge_only_future: true
      },
      note: 'Template only. The bootstrap key is never persisted; only masked preview and presence are exported.'
    };
  }

  function buildAuthRequestTemplatePack(options) {
    const opts = options || {};
    return {
      type: 'feg-stage-pro-auth-request-template-pack',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      session_bridge: buildSupabaseSessionBridgeReport(opts),
      runtime_role_guard: buildRuntimeRoleGuardReport(opts),
      invite_registration_request: buildInviteRegistrationRequestTemplate(opts),
      first_admin_bootstrap_request: buildFirstAdminBootstrapRequestTemplate(opts),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true
      }
    };
  }


  function isValidEmail(email) { return /^\S+@\S+\.\S+$/.test(normalizeEmail(email)); }

  function buildAuthActionDryRunRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const action = normalizeAuthAction(opts.action || opts.authAction || (opts.provider === 'google' ? 'oauth_google' : opts.provider === 'apple' ? 'oauth_apple' : 'session_restore'));
    const sessionPreflight = buildAuthSessionPreflight(opts);
    const sessionBridge = buildSupabaseSessionBridgeReport(opts);
    const runtimeGuard = buildRuntimeRoleGuardReport(opts);
    const registration = Object.assign({}, opts.registration || {}, {
      email: opts.registration && opts.registration.email || opts.email || '',
      displayName: opts.registration && opts.registration.displayName || opts.displayName || opts.display_name || opts.name || '',
      inviteKey: opts.registration && opts.registration.inviteKey || opts.inviteKey || opts.invite_key || '',
      provider: opts.registration && opts.registration.provider || opts.provider || 'email',
      requestedRole: opts.registration && opts.registration.requestedRole || opts.requestedRole || opts.role || 'technician'
    });
    const templateOpts = Object.assign({}, opts, { registration });
    const inviteRequest = buildInviteRegistrationRequestTemplate(templateOpts);
    const bootstrapRequest = buildFirstAdminBootstrapRequestTemplate(templateOpts);
    const email = normalizeEmail(registration.email || opts.user && opts.user.email || '');
    const errors = [];
    const warnings = [];
    if (action === 'email_magic_link' && !isValidEmail(email)) errors.push('email_magic_link requires a valid email.');
    if (action === 'oauth_google' && cfg.mode === 'supabase' && !cfg.supabaseUrl) errors.push('oauth_google requires supabaseUrl in Supabase mode.');
    if (action === 'oauth_apple' && cfg.mode === 'supabase' && !cfg.supabaseUrl) errors.push('oauth_apple requires supabaseUrl in Supabase mode.');
    if (action === 'invite_registration') {
      const validation = inviteRequest.validation || {};
      if (validation.ok === false) errors.push(...(validation.errors || ['invite registration template is invalid']));
      if (!inviteRequest.registration || !inviteRequest.registration.invite_key_present) errors.push('invite_registration requires invite_key_present=true.');
    }
    if (action === 'first_admin_bootstrap') {
      const validation = bootstrapRequest.validation || {};
      if (validation.ok === false) errors.push(...(validation.errors || ['first admin bootstrap template is invalid']));
      if (!bootstrapRequest.first_admin || !bootstrapRequest.first_admin.bootstrap_key_present) errors.push('first_admin_bootstrap requires bootstrap_key_present=true.');
    }
    if (action === 'session_restore' && !sessionBridge.runtime_user_preview) warnings.push('No runtime user preview yet; restore will keep local/demo fallback until a Supabase session is present.');
    if (action === 'logout' && !sessionPreflight.local_session.authenticated && !sessionBridge.supabase_session_present) warnings.push('No active local/demo or Supabase session was detected for logout dry-run.');
    if (cfg.mode !== 'supabase' && ['email_magic_link', 'oauth_google', 'oauth_apple'].includes(action)) warnings.push('Auth action is Supabase-oriented, but current auth mode resolves to local/demo.');
    const provider = action === 'oauth_google' ? 'google' : action === 'oauth_apple' ? 'apple' : action === 'email_magic_link' ? 'email' : action;
    return {
      type: 'feg-stage-pro-auth-action-dry-run-request',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      action,
      provider,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      endpoint: endpointUrl(cfg, cfg.authSessionDryRunFunction),
      redirect_to: cfg.redirectTo,
      email_preview: email ? `${email.slice(0, 2)}•••@${email.split('@')[1] || ''}` : '',
      email_present: Boolean(email),
      request_validation: { ok: errors.length === 0, errors, warnings },
      session_preflight: sessionPreflight,
      session_bridge: sessionBridge,
      runtime_role_guard: runtimeGuard,
      invite_registration_request: action === 'invite_registration' ? inviteRequest : null,
      first_admin_bootstrap_request: action === 'first_admin_bootstrap' ? bootstrapRequest : null,
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        template_only: true,
        raw_secret_exported: false,
        edge_only_future: true
      },
      note: 'Dry-run request for auth actions. It validates intent and guards only; it does not sign in, create profiles, consume invite keys or bootstrap admins.'
    };
  }


  function authActionChecksumMaterial(request) {
    const req = request || buildAuthActionDryRunRequest();
    return {
      action: req.action,
      provider: req.provider,
      workspace_slug: req.workspace_slug,
      redirect_to: req.redirect_to,
      email_present: Boolean(req.email_present),
      email_preview: req.email_preview || '',
      request_validation_ok: Boolean(req.request_validation && req.request_validation.ok),
      invite_registration_request: req.invite_registration_request ? {
        email: req.invite_registration_request.registration && req.invite_registration_request.registration.email,
        display_name: req.invite_registration_request.registration && req.invite_registration_request.registration.display_name,
        company_name: req.invite_registration_request.registration && req.invite_registration_request.registration.company_name,
        provider: req.invite_registration_request.registration && req.invite_registration_request.registration.provider,
        requested_role: req.invite_registration_request.registration && req.invite_registration_request.registration.requested_role,
        invite_key_present: Boolean(req.invite_registration_request.registration && req.invite_registration_request.registration.invite_key_present)
      } : null,
      first_admin_bootstrap_request: req.first_admin_bootstrap_request ? {
        email: req.first_admin_bootstrap_request.first_admin && req.first_admin_bootstrap_request.first_admin.email,
        display_name: req.first_admin_bootstrap_request.first_admin && req.first_admin_bootstrap_request.first_admin.display_name,
        company_name: req.first_admin_bootstrap_request.first_admin && req.first_admin_bootstrap_request.first_admin.company_name,
        requested_role: 'admin',
        bootstrap_key_present: Boolean(req.first_admin_bootstrap_request.first_admin && req.first_admin_bootstrap_request.first_admin.bootstrap_key_present)
      } : null
    };
  }

  function authActionPayloadChecksum(request) {
    return checksumString(authActionChecksumMaterial(request));
  }

  function extractAuthActionDryRunBody(report) {
    return report && report.body && typeof report.body === 'object' ? report.body : (report || {});
  }

  function extractAuthActionDryRunChecksum(report) {
    const body = extractAuthActionDryRunBody(report);
    const advisory = body.auth_action_advisory || body.action_advisory || {};
    return toText(body.auth_action_checksum || body.payload_checksum || advisory.request_checksum || advisory.payload_checksum || '');
  }

  function buildAuthActionApprovalPackage(options) {
    const opts = options || {};
    const request = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const reports = readAuthActionDryRunReports(opts.storage);
    const latest = opts.dryRunReport || opts.report || (reports[0] && reports[0].report) || null;
    const summary = summarizeAuthActionDryRunReport(latest);
    const requestChecksum = authActionPayloadChecksum(request);
    const dryRunChecksum = extractAuthActionDryRunChecksum(latest);
    const blockers = [];
    const warnings = [];
    if (!request.request_validation || request.request_validation.ok === false) blockers.push(...((request.request_validation && request.request_validation.errors) || ['auth action request is invalid']));
    if (!latest) blockers.push('Auth action dry-run report is required before approval.');
    if (latest && summary.ok === false) blockers.push(...(summary.blockers || ['latest auth action dry-run is not clean']));
    if (latest && !dryRunChecksum) blockers.push('Latest auth action dry-run does not include auth_action_checksum; run dry-run again with v3.14.5 Edge Function.');
    if (dryRunChecksum && dryRunChecksum !== requestChecksum) blockers.push('Current auth action request checksum differs from latest dry-run checksum.');
    if (summary.warnings && summary.warnings.length) warnings.push(...summary.warnings);
    return {
      type: 'feg-stage-pro-auth-action-approval-package',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      approved: blockers.length === 0,
      status: blockers.length ? 'blocked' : warnings.length ? 'approved_with_warnings' : 'approved_action_locked',
      action: request.action,
      provider: request.provider,
      workspace_slug: request.workspace_slug,
      payload_checksum: requestChecksum,
      dry_run_checksum: dryRunChecksum,
      dry_run_summary: summary,
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      approved_payload: authActionChecksumMaterial(request),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        raw_secret_exported: false,
        approval_only: true
      },
      note: 'Approval locks the exact dry-run auth action request by checksum. It still does not execute login, invite consume, profile creation or bootstrap.'
    };
  }

  function readAuthActionApprovalPackage(storage) {
    const pack = readJson(storage, AUTH_ACTION_APPROVAL_STORAGE_KEY, null);
    return pack && typeof pack === 'object' ? pack : null;
  }

  function saveAuthActionApprovalPackage(packageReport, storage) {
    const pack = packageReport || buildAuthActionApprovalPackage({ storage });
    writeJson(storage, AUTH_ACTION_APPROVAL_STORAGE_KEY, pack);
    return pack;
  }

  function clearAuthActionApprovalPackage(storage) {
    const store = getStorage(storage);
    if (!store) return false;
    try { store.removeItem(AUTH_ACTION_APPROVAL_STORAGE_KEY); return true; } catch (_) { return false; }
  }

  function compareAuthActionApprovalWithCurrentRequest(options) {
    const opts = options || {};
    const approval = opts.approvalPackage || readAuthActionApprovalPackage(opts.storage);
    const request = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const checksum = authActionPayloadChecksum(request);
    const stale = !approval || !approval.approved || approval.payload_checksum !== checksum;
    return {
      type: 'feg-stage-pro-auth-action-approval-comparison',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      action: request.action,
      current_checksum: checksum,
      approved_checksum: approval && approval.payload_checksum || '',
      approved: Boolean(approval && approval.approved),
      stale,
      status: !approval ? 'approval_missing' : stale ? 'approval_stale' : 'approval_current',
      blockers: !approval ? ['Auth action approval package is missing.'] : stale ? ['Current auth action request does not match approval checksum.'] : [],
      remote_write_executed: false
    };
  }

  function buildApprovedAuthActionExecutionTemplate(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const request = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const approval = opts.approvalPackage || readAuthActionApprovalPackage(opts.storage);
    const comparison = compareAuthActionApprovalWithCurrentRequest(Object.assign({}, opts, { actionRequest: request, approvalPackage: approval }));
    const blockers = comparison.blockers.slice();
    if (!approval || !approval.approved) blockers.push('Approved auth action package is not approved.');
    return {
      type: 'feg-stage-pro-approved-auth-action-execution-template',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      controlled_auth_action_enabled: false,
      endpoint: endpointUrl(cfg, cfg.authControlledActionFunction),
      confirm_phrase: 'EXECUTE AUTH ACTION',
      action: request.action,
      provider: request.provider,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      auth_action_request: request,
      approval_package: approval,
      approval_comparison: comparison,
      ready_for_edge_request: blockers.length === 0,
      blockers: Array.from(new Set(blockers)),
      safety: {
        requires_edge_function: cfg.authControlledActionFunction,
        requires_server_env: 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true',
        requires_test_key: true,
        requires_confirm_phrase: true,
        remote_write_executed: false,
        no_browser_auth_mutation: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        template_only: true
      },
      note: 'Template only in v3.14.5. Real auth actions remain disabled until a later guarded Edge implementation is promoted.'
    };
  }

  function buildAuthActionExecutionReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const phrase = toText(opts.confirmPhrase || opts.confirm_phrase || '');
    const template = opts.executionTemplate || buildApprovedAuthActionExecutionTemplate(opts);
    const checks = [
      { key: 'endpoint', label: 'auth-controlled-action endpoint configured', ok: Boolean(template.endpoint), severity: template.endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key entered manually', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'phrase', label: 'Confirm phrase is EXECUTE AUTH ACTION', ok: phrase === 'EXECUTE AUTH ACTION', severity: phrase === 'EXECUTE AUTH ACTION' ? 'ok' : 'error' },
      { key: 'approval', label: 'Auth action approval is current', ok: Boolean(template.ready_for_edge_request), severity: template.ready_for_edge_request ? 'ok' : 'error' },
      { key: 'static_disabled', label: 'Static client keeps controlled auth action disabled', ok: template.controlled_auth_action_enabled === false, severity: 'ok' },
      { key: 'edge_only', label: 'No browser auth mutation', ok: true, severity: 'ok' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label);
    return {
      type: 'feg-stage-pro-auth-action-execution-readiness',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      endpoint: endpointUrl(cfg, cfg.authControlledActionFunction),
      action: template.action,
      status: blockers.length ? 'blocked' : 'ready_static_execution_disabled',
      checks,
      blockers,
      warnings: ['v3.14.5 does not execute real auth mutations; this readiness only prepares a future Edge-only runner.'],
      remote_write_executed: false,
      no_local_session_mutation: true
    };
  }

  function saveAuthActionExecutionTemplate(template, storage) {
    const list = readJson(storage, AUTH_ACTION_EXECUTION_TEMPLATE_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-action-template-${Date.now().toString(36)}`, saved_at: nowIso(), template: clone(template || buildApprovedAuthActionExecutionTemplate({ storage })) });
    writeJson(storage, AUTH_ACTION_EXECUTION_TEMPLATE_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionExecutionTemplates(storage) {
    const list = readJson(storage, AUTH_ACTION_EXECUTION_TEMPLATE_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  async function runAuthControlledActionEdge(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = toText(opts.endpoint || endpointUrl(cfg, cfg.authControlledActionFunction));
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const confirmPhrase = toText(opts.confirmPhrase || opts.confirm_phrase || '');
    const template = opts.executionTemplate || buildApprovedAuthActionExecutionTemplate(opts);
    const readiness = buildAuthActionExecutionReadiness(Object.assign({}, opts, { executionTemplate: template, confirmPhrase }));
    if (readiness.blockers.length) return { ok: false, reason: 'auth_action_execution_readiness_blocked', readiness, remote_write_executed: false };
    if (!endpoint) return { ok: false, reason: 'auth_controlled_action_endpoint_missing', remote_write_executed: false };
    if (!testKey) return { ok: false, reason: 'test_key_required', remote_write_executed: false };
    if (opts.mockResponse) {
      const mocked = Object.assign({ ok: true, mocked: true, endpoint, action: template.action, remote_write_executed: false }, clone(opts.mockResponse));
      saveAuthActionExecutionTemplate(template, opts.storage);
      saveAuthControlledActionReport(mocked, opts.storage);
      return mocked;
    }
    if (typeof GLOBAL.fetch !== 'function') return { ok: false, reason: 'fetch_unavailable', endpoint, action: template.action, remote_write_executed: false };
    try {
      const response = await GLOBAL.fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: JSON.stringify(Object.assign({}, template, { dry_run: false, confirm_phrase: confirmPhrase }))
      });
      const body = await response.json().catch(() => ({}));
      const result = Object.assign({ ok: response.ok, status: response.status, endpoint, action: template.action }, body);
      saveAuthActionExecutionTemplate(template, opts.storage);
      saveAuthControlledActionReport(result, opts.storage);
      return result;
    } catch (err) {
      return { ok: false, reason: 'fetch_failed', message: err && err.message || String(err), endpoint, action: template.action, remote_write_executed: false };
    }
  }


  function saveAuthControlledActionReport(report, storage) {
    const list = readJson(storage, AUTH_CONTROLLED_ACTION_REPORT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-controlled-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || { ok: false, reason: 'missing_report', remote_write_executed: false }) });
    writeJson(storage, AUTH_CONTROLLED_ACTION_REPORT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthControlledActionReports(storage) {
    const list = readJson(storage, AUTH_CONTROLLED_ACTION_REPORT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function summarizeAuthControlledActionReport(report) {
    const body = report && report.body && typeof report.body === 'object' ? report.body : (report || {});
    const blockers = [];
    const warnings = [];
    if (!report) blockers.push('Auth controlled action report is missing.');
    if (report && report.ok === false && body.reason !== 'auth_remote_actions_not_implemented_in_static_milestone') warnings.push(`Auth controlled action did not execute: ${body.reason || report.reason || body.error || 'unknown'}`);
    if (body.remote_write_executed) warnings.push('Remote auth action reports an executed mutation; run post-action verification before promotion.');
    if (Array.isArray(body.blockers)) warnings.push(...body.blockers);
    if (Array.isArray(body.warnings)) warnings.push(...body.warnings);
    return {
      type: 'feg-stage-pro-auth-controlled-action-summary',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      action: body.action || report && report.action || '',
      ok: blockers.length === 0,
      status: body.remote_write_executed ? 'mutation_reported_verify_required' : 'no_mutation_reported',
      reason: body.reason || report && report.reason || '',
      remote_write_executed: Boolean(body.remote_write_executed),
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      report: clone(body)
    };
  }

  function buildAuthActionPostActionVerificationRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const template = opts.executionTemplate || buildApprovedAuthActionExecutionTemplate(opts);
    const controlledReports = readAuthControlledActionReports(opts.storage);
    const latestControlled = opts.controlledActionReport || (controlledReports[0] && controlledReports[0].report) || null;
    return {
      type: 'feg-stage-pro-auth-action-post-action-verification-request',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      verify_after_controlled_action: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      requested_action: template.action || 'session_restore',
      auth_action_request: clone(template.auth_action_request || buildAuthActionDryRunRequest(opts)),
      approval_package: clone(template.approval_package || readAuthActionApprovalPackage(opts.storage)),
      controlled_action_report: clone(latestControlled),
      auth_action_checksum: authActionPayloadChecksum(template.auth_action_request || buildAuthActionDryRunRequest(opts)),
      safety: {
        remote_write_executed: false,
        read_only_verification: true,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        raw_secret_exported: false
      },
      note: 'Post-action verification request reuses auth-session-dry-run in read-only mode. It does not execute login, invite consume, profile creation, bootstrap or logout.'
    };
  }

  function buildAuthActionPostActionVerificationReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = toText(opts.endpoint || endpointUrl(cfg, cfg.authSessionDryRunFunction));
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const request = opts.verificationRequest || buildAuthActionPostActionVerificationRequest(opts);
    const controlledSummary = summarizeAuthControlledActionReport(request.controlled_action_report);
    const checks = [
      { key: 'endpoint', label: 'auth-session-dry-run endpoint configured', ok: Boolean(endpoint), severity: endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key entered manually', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'controlled_report', label: 'Controlled action report is available', ok: Boolean(request.controlled_action_report), severity: request.controlled_action_report ? 'ok' : 'error' },
      { key: 'approval', label: 'Approval package is attached', ok: Boolean(request.approval_package && request.approval_package.approved), severity: request.approval_package && request.approval_package.approved ? 'ok' : 'warning' },
      { key: 'read_only', label: 'Verification request is read-only', ok: request.dry_run === true && request.verify_after_controlled_action === true, severity: 'ok' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label);
    const warnings = checks.filter(row => !row.ok && row.severity !== 'error').map(row => row.label).concat(controlledSummary.warnings || []);
    return {
      type: 'feg-stage-pro-auth-action-post-action-verification-readiness',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      endpoint,
      action: request.requested_action,
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_read_only_verification',
      ready: blockers.length === 0,
      checks,
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      controlled_action_summary: controlledSummary,
      remote_write_executed: false
    };
  }

  async function runAuthActionPostActionVerification(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = toText(opts.endpoint || endpointUrl(cfg, cfg.authSessionDryRunFunction));
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const request = opts.verificationRequest || buildAuthActionPostActionVerificationRequest(opts);
    const readiness = buildAuthActionPostActionVerificationReadiness(Object.assign({}, opts, { verificationRequest: request }));
    if (readiness.blockers.length) return { ok: false, reason: 'auth_action_post_verify_readiness_blocked', readiness, remote_write_executed: false };
    if (!endpoint) return { ok: false, reason: 'auth_session_dry_run_endpoint_missing', remote_write_executed: false };
    if (!testKey) return { ok: false, reason: 'test_key_required', remote_write_executed: false };
    if (opts.mockResponse) {
      const mocked = Object.assign({ ok: true, mocked: true, endpoint, action: request.requested_action, remote_write_executed: false }, clone(opts.mockResponse));
      saveAuthActionPostVerificationReport(mocked, opts.storage);
      return mocked;
    }
    if (typeof GLOBAL.fetch !== 'function') return { ok: false, reason: 'fetch_unavailable', endpoint, action: request.requested_action, remote_write_executed: false };
    try {
      const response = await GLOBAL.fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: JSON.stringify(request)
      });
      const body = await response.json().catch(() => ({}));
      const report = Object.assign({ ok: response.ok && body && body.ok !== false, http_status: response.status, endpoint, action: request.requested_action, remote_write_executed: false }, body || {});
      saveAuthActionPostVerificationReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = { ok: false, reason: String(err && err.message || err), endpoint, action: request.requested_action, remote_write_executed: false };
      saveAuthActionPostVerificationReport(report, opts.storage);
      return report;
    }
  }

  function summarizeAuthActionPostVerificationReport(report) {
    const body = report && report.body && typeof report.body === 'object' ? report.body : (report || {});
    const gate = body.post_action_verification_gate || {};
    const blockers = [];
    const warnings = [];
    if (!report) blockers.push('Auth action post-verification report is missing.');
    if (report && report.ok === false) blockers.push(`Post-action verification failed: ${report.reason || body.reason || body.error || 'unknown'}`);
    if (body.remote_write_executed) blockers.push('Post-action verification unexpectedly reports remote_write_executed=true.');
    if (gate.ok === false) blockers.push(...(gate.blockers || ['post_action_verification_gate returned ok=false']));
    if (Array.isArray(gate.warnings)) warnings.push(...gate.warnings);
    return {
      type: 'feg-stage-pro-auth-action-post-verification-summary',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      ok: blockers.length === 0,
      status: blockers.length ? 'blocked' : (gate.status || 'verified_read_only'),
      action: body.action || gate.action || '',
      remote_write_executed: Boolean(body.remote_write_executed),
      gate,
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings))
    };
  }

  function saveAuthActionPostVerificationReport(report, storage) {
    const list = readJson(storage, AUTH_ACTION_POST_VERIFY_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-post-verify-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || { ok: false, reason: 'missing_report', remote_write_executed: false }) });
    writeJson(storage, AUTH_ACTION_POST_VERIFY_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionPostVerificationReports(storage) {
    const list = readJson(storage, AUTH_ACTION_POST_VERIFY_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function buildAuthActionSafetyAuditTrail(options) {
    const opts = options || {};
    const dryRuns = readAuthActionDryRunReports(opts.storage);
    const controlledReports = readAuthControlledActionReports(opts.storage);
    const verifications = readAuthActionPostVerificationReports(opts.storage);
    const approval = readAuthActionApprovalPackage(opts.storage);
    const executionTemplates = readAuthActionExecutionTemplates(opts.storage);
    const latestControlled = opts.controlledActionReport || (controlledReports[0] && controlledReports[0].report) || null;
    const latestVerification = opts.verificationReport || (verifications[0] && verifications[0].report) || null;
    const controlledSummary = summarizeAuthControlledActionReport(latestControlled);
    const verificationSummary = summarizeAuthActionPostVerificationReport(latestVerification);
    return {
      type: 'feg-stage-pro-auth-action-safety-audit-trail',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      latest_dry_run_summary: summarizeAuthActionDryRunReport(dryRuns[0] && dryRuns[0].report),
      latest_approval_status: approval ? { approved: Boolean(approval.approved), status: approval.status, action: approval.action, payload_checksum: approval.payload_checksum } : null,
      latest_controlled_action_summary: controlledSummary,
      latest_post_verification_summary: verificationSummary,
      counts: {
        dry_runs: dryRuns.length,
        execution_templates: executionTemplates.length,
        controlled_action_reports: controlledReports.length,
        post_verification_reports: verifications.length
      },
      timeline: []
        .concat(dryRuns.slice(0, 5).map(row => ({ kind: 'dry_run', at: row.saved_at, id: row.id, action: row.report && row.report.action || '' })))
        .concat(executionTemplates.slice(0, 5).map(row => ({ kind: 'execution_template', at: row.saved_at, id: row.id, action: row.template && row.template.action || '' })))
        .concat(controlledReports.slice(0, 5).map(row => ({ kind: 'controlled_action', at: row.saved_at, id: row.id, action: row.report && row.report.action || '', remote_write_executed: Boolean(row.report && row.report.remote_write_executed) })))
        .concat(verifications.slice(0, 5).map(row => ({ kind: 'post_verification', at: row.saved_at, id: row.id, action: row.report && row.report.action || '' })))
        .sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))),
      safety: {
        raw_secret_exported: false,
        no_local_session_mutation: true,
        no_browser_auth_mutation: true,
        rollback_automatic: false
      },
      note: 'Audit trail combines local dry-run/approval/execution-template/controlled-action/verification reports. It stores summaries and never raw invite/bootstrap secrets.'
    };
  }

  function buildAuthActionRollbackHints(options) {
    const opts = options || {};
    const controlledReports = readAuthControlledActionReports(opts.storage);
    const verifications = readAuthActionPostVerificationReports(opts.storage);
    const latestControlled = opts.controlledActionReport || (controlledReports[0] && controlledReports[0].report) || null;
    const latestVerification = opts.verificationReport || (verifications[0] && verifications[0].report) || null;
    const controlledSummary = summarizeAuthControlledActionReport(latestControlled);
    const verificationSummary = summarizeAuthActionPostVerificationReport(latestVerification);
    const hints = [];
    if (!latestControlled) hints.push({ severity: 'info', action: 'Run controlled action skeleton/runner first, then post-action verification.', automatic: false });
    if (controlledSummary.remote_write_executed) hints.push({ severity: 'manual', action: 'Remote auth mutation was reported; inspect Supabase Auth users, profiles and invite_keys manually before retry.', automatic: false });
    if (verificationSummary.blockers && verificationSummary.blockers.length) hints.push({ severity: 'manual', action: 'Post-action verification has blockers; export verification JSON and compare remote_summary/profile/invite counts before another auth action.', automatic: false, blockers: verificationSummary.blockers });
    if (!hints.length) hints.push({ severity: 'ok', action: 'No rollback action suggested. Current v3.14.5 auth-controlled-action is non-mutating.', automatic: false });
    return {
      type: 'feg-stage-pro-auth-action-rollback-hints',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      controlled_action_summary: controlledSummary,
      post_verification_summary: verificationSummary,
      hints,
      automatic_rollback_executed: false,
      remote_write_executed: false,
      no_profile_delete: true,
      no_invite_restore: true,
      no_auth_user_delete: true
    };
  }

  function saveAuthActionSafetyAuditSnapshot(report, storage) {
    const list = readJson(storage, AUTH_ACTION_SAFETY_AUDIT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-safety-audit-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionSafetyAuditTrail({ storage })) });
    writeJson(storage, AUTH_ACTION_SAFETY_AUDIT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionSafetyAuditSnapshots(storage) {
    const list = readJson(storage, AUTH_ACTION_SAFETY_AUDIT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }


  function authActionCapabilityDefinition(action) {
    const defs = {
      session_restore: {
        label: 'Session restore',
        reads: ['auth session', 'profiles by auth_user_id/email', 'workspace membership'],
        future_writes: [],
        env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
        rollback: 'No rollback; session restore should only hydrate runtime state.'
      },
      email_magic_link: {
        label: 'Email magic link',
        reads: ['workspace status', 'profiles/invite intent'],
        future_writes: ['Supabase Auth OTP email request'],
        env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'allowed redirect URL'],
        rollback: 'No database rollback; revoke/expire session if the link is misused.'
      },
      oauth_google: {
        label: 'Google OAuth',
        reads: ['workspace status', 'OAuth provider config'],
        future_writes: ['Supabase Auth OAuth redirect/session'],
        env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'Google provider enabled', 'allowed redirect URL'],
        rollback: 'Disable provider/session and remove generated profile if a later profile bridge creates one incorrectly.'
      },
      oauth_apple: {
        label: 'Apple OAuth',
        reads: ['workspace status', 'OAuth provider config'],
        future_writes: ['Supabase Auth OAuth redirect/session'],
        env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'Apple provider enabled', 'allowed redirect URL'],
        rollback: 'Disable provider/session and remove generated profile if a later profile bridge creates one incorrectly.'
      },
      invite_registration: {
        label: 'Invite registration',
        reads: ['workspace', 'invite_keys', 'profiles duplicate email check'],
        future_writes: ['profiles insert', 'invite key use counter/status', 'audit_log'],
        env: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true'],
        rollback: 'Disable created profile, restore invite key use counter/status manually, add audit note.'
      },
      first_admin_bootstrap: {
        label: 'First admin bootstrap',
        reads: ['workspace', 'profiles active admins check', 'bootstrap key validation'],
        future_writes: ['profiles admin insert', 'workspace bootstrap closed flag', 'audit_log'],
        env: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true'],
        rollback: 'Disable bootstrap-created admin profile and reopen bootstrap only via manual SQL/admin review.'
      },
      logout: {
        label: 'Logout',
        reads: ['current session'],
        future_writes: ['Supabase Auth signOut/session revoke'],
        env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
        rollback: 'No rollback; user can sign in again.'
      }
    };
    return defs[normalizeAuthAction(action)] || defs.session_restore;
  }

  function buildAuthActionCapabilityMatrix(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const selectedRequest = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const selectedAction = normalizeAuthAction(selectedRequest.action || opts.action);
    const sessionPreflight = buildAuthSessionPreflight(opts);
    const invitePreflight = buildInviteBootstrapPreflight(opts);
    const approval = opts.approvalPackage || readAuthActionApprovalPackage(opts.storage);
    const executionTemplates = readAuthActionExecutionTemplates(opts.storage);
    const latestTemplate = opts.executionTemplate || (executionTemplates[0] && executionTemplates[0].template) || buildApprovedAuthActionExecutionTemplate(opts);
    const rows = KNOWN_AUTH_ACTIONS.map(action => {
      const def = authActionCapabilityDefinition(action);
      const req = action === selectedAction ? selectedRequest : buildAuthActionDryRunRequest(Object.assign({}, opts, { action }));
      const checks = [];
      checks.push({ key: 'request_valid', label: 'Action request validates locally', ok: Boolean(req.request_validation && req.request_validation.ok), severity: req.request_validation && req.request_validation.ok ? 'ok' : 'error' });
      checks.push({ key: 'endpoint', label: 'auth-controlled-action endpoint configured', ok: Boolean(endpointUrl(cfg, cfg.authControlledActionFunction)), severity: endpointUrl(cfg, cfg.authControlledActionFunction) ? 'ok' : 'error' });
      checks.push({ key: 'approval', label: 'Approval package exists for selected payload', ok: action === selectedAction ? Boolean(approval && approval.approved && approval.payload_checksum === authActionPayloadChecksum(selectedRequest)) : false, severity: action === selectedAction ? 'warning' : 'info' });
      if (['email_magic_link', 'oauth_google', 'oauth_apple', 'logout', 'session_restore'].includes(action)) {
        checks.push({ key: 'anon_url', label: 'Supabase URL present for client auth flow', ok: Boolean(cfg.supabaseUrl), severity: cfg.supabaseUrl ? 'ok' : 'warning' });
        checks.push({ key: 'anon_key', label: 'Supabase anon key present for client auth flow', ok: Boolean(cfg.supabaseAnonKey), severity: cfg.supabaseAnonKey ? 'ok' : 'warning' });
      }
      if (action === 'invite_registration') {
        checks.push({ key: 'invite_key', label: 'Invite key presence flag is true', ok: Boolean(req.invite_registration_request && req.invite_registration_request.registration && req.invite_registration_request.registration.invite_key_present), severity: 'error' });
        checks.push({ key: 'active_invites', label: 'At least one active invite key is known locally/remote preflight', ok: invitePreflight.active_invite_keys_count > 0, severity: invitePreflight.active_invite_keys_count > 0 ? 'ok' : 'warning' });
      }
      if (action === 'first_admin_bootstrap') {
        checks.push({ key: 'bootstrap_key', label: 'Bootstrap key presence flag is true', ok: Boolean(req.first_admin_bootstrap_request && req.first_admin_bootstrap_request.first_admin && req.first_admin_bootstrap_request.first_admin.bootstrap_key_present), severity: 'error' });
        checks.push({ key: 'no_active_admin', label: 'No active admin is known in preflight', ok: invitePreflight.active_admin_count === 0, severity: invitePreflight.active_admin_count === 0 ? 'ok' : 'error' });
      }
      const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label);
      const warnings = checks.filter(row => !row.ok && row.severity !== 'error').map(row => row.label);
      return {
        action,
        label: def.label,
        selected: action === selectedAction,
        status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_future_edge_adapter',
        checks,
        blockers,
        warnings,
        reads: def.reads,
        future_writes: def.future_writes,
        required_env: def.env,
        rollback_hint: def.rollback,
        request_checksum: authActionPayloadChecksum(req),
        remote_write_executed: false,
        implemented_now: false,
        adapter_mode: 'preview_only_non_mutating'
      };
    });
    const selected = rows.find(row => row.action === selectedAction) || rows[0];
    const blockers = selected ? selected.blockers.slice() : [];
    const warnings = selected ? selected.warnings.slice() : [];
    if (latestTemplate && latestTemplate.controlled_auth_action_enabled === false) warnings.push('Current static client keeps controlled auth action disabled; Edge adapter remains preview-only.');
    return {
      type: 'feg-stage-pro-auth-action-capability-matrix',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      workspace_slug: cfg.workspaceId,
      selected_action: selectedAction,
      selected_status: selected && selected.status || 'blocked',
      ready_for_future_edge_adapter: blockers.length === 0,
      status: blockers.length ? 'blocked' : 'capability_preview_ready_non_mutating',
      rows,
      selected_row: selected,
      session_preflight_summary: {
        resolved_mode: sessionPreflight.resolved_mode,
        ready_for_supabase_auth: sessionPreflight.ready_for_supabase_auth,
        local_authenticated: Boolean(sessionPreflight.local_session && sessionPreflight.local_session.authenticated)
      },
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        raw_secret_exported: false,
        capability_preview_only: true
      },
      note: 'Capability matrix decomposes each auth action into required reads, future writes and blockers. It does not execute auth mutations.'
    };
  }

  function buildAuthActionImplementationPlan(options) {
    const opts = options || {};
    const matrix = buildAuthActionCapabilityMatrix(opts);
    const stages = [
      { id: 'dry_run', label: 'Remote dry-run advisory', done: readAuthActionDryRunReports(opts.storage).length > 0, mutating: false },
      { id: 'approval', label: 'Checksum approval package', done: Boolean(readAuthActionApprovalPackage(opts.storage) && readAuthActionApprovalPackage(opts.storage).approved), mutating: false },
      { id: 'execution_template', label: 'Controlled action execution template', done: readAuthActionExecutionTemplates(opts.storage).length > 0, mutating: false },
      { id: 'edge_adapter', label: 'Future Edge action adapter implementation', done: false, mutating: false },
      { id: 'post_verify', label: 'Post-action read-only verification', done: readAuthActionPostVerificationReports(opts.storage).length > 0, mutating: false },
      { id: 'audit', label: 'Safety audit snapshot', done: readAuthActionSafetyAuditSnapshots(opts.storage).length > 0, mutating: false }
    ];
    return {
      type: 'feg-stage-pro-auth-action-implementation-plan',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      workspace_slug: matrix.workspace_slug,
      selected_action: matrix.selected_action,
      stages,
      action_matrix: matrix.rows.map(row => ({
        action: row.action,
        status: row.status,
        blockers: row.blockers,
        warnings: row.warnings,
        future_writes: row.future_writes,
        required_env: row.required_env,
        rollback_hint: row.rollback_hint
      })),
      ready_for_code_promotion: matrix.ready_for_future_edge_adapter,
      remote_write_executed: false,
      note: 'Implementation plan is a checklist for a later Edge adapter promotion. v3.14.5 remains non-mutating.'
    };
  }

  function buildAuthRemoteActionsPromotionGate(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const matrix = buildAuthActionCapabilityMatrix(opts);
    const approval = readAuthActionApprovalPackage(opts.storage);
    const executionTemplates = readAuthActionExecutionTemplates(opts.storage);
    const latestTemplate = executionTemplates[0] && executionTemplates[0].template;
    const safetyAudit = buildAuthActionSafetyAuditTrail({ storage: opts.storage });
    const blockers = [];
    const warnings = [];
    if (!matrix.ready_for_future_edge_adapter) blockers.push(...(matrix.blockers || []));
    if (!approval || !approval.approved) blockers.push('Auth action approval package is missing or not approved.');
    if (!latestTemplate || !latestTemplate.ready_for_edge_request) blockers.push('Approved auth action execution template is missing or blocked.');
    if (!endpointUrl(cfg, cfg.authControlledActionFunction)) blockers.push('auth-controlled-action endpoint is not configured.');
    if (!opts.allowAuthRemoteActionPromotion) blockers.push('Manual promotion flag allowAuthRemoteActionPromotion is not set.');
    warnings.push('FEG_ENABLE_AUTH_REMOTE_ACTIONS must remain false until Edge adapter code is reviewed and deployed manually.');
    if (safetyAudit && safetyAudit.warnings && safetyAudit.warnings.length) warnings.push(...safetyAudit.warnings);
    return {
      type: 'feg-stage-pro-auth-remote-actions-promotion-gate',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      selected_action: matrix.selected_action,
      status: blockers.length ? 'promotion_blocked_non_mutating_milestone' : 'promotion_ready_for_manual_code_review',
      ready: blockers.length === 0,
      endpoint: endpointUrl(cfg, cfg.authControlledActionFunction),
      capability_matrix: matrix,
      implementation_plan: buildAuthActionImplementationPlan(opts),
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      safety: {
        remote_write_executed: false,
        no_browser_auth_mutation: true,
        requires_code_review: true,
        requires_server_env: 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true',
        requires_manual_promotion_flag: true
      }
    };
  }


  function buildAuthActionAdapterSandbox(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const request = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const action = normalizeAuthAction(request.action || opts.action);
    const capability = buildAuthActionCapabilityMatrix(Object.assign({}, opts, { actionRequest: request, action }));
    const approval = opts.approvalPackage || readAuthActionApprovalPackage(opts.storage);
    const contractRows = KNOWN_AUTH_ACTIONS.map(name => {
      const def = authActionCapabilityDefinition(name);
      const edgeEntrypoint = name === 'session_restore' ? 'auth-session-dry-run' : 'auth-controlled-action';
      const writesBlocked = def.future_writes.length > 0;
      return {
        action: name,
        label: def.label,
        selected: name === action,
        edge_entrypoint: edgeEntrypoint,
        adapter_status: 'sandbox_stub_non_mutating',
        reads: def.reads,
        intended_writes: def.future_writes,
        writes_blocked: writesBlocked,
        required_env: def.env,
        request_checksum: name === action ? authActionPayloadChecksum(request) : authActionPayloadChecksum(buildAuthActionDryRunRequest(Object.assign({}, opts, { action: name }))),
        execution_mode: 'dry_run_or_template_only',
        implemented_now: false,
        remote_write_executed: false,
        rollback_hint: def.rollback
      };
    });
    const selected = contractRows.find(row => row.selected) || contractRows[0];
    const blockers = [];
    const warnings = [];
    if (!request.request_validation || !request.request_validation.ok) blockers.push(...((request.request_validation && request.request_validation.errors) || ['Auth action request is invalid.']));
    if (!approval || !approval.approved) warnings.push('Approval package is missing; adapter sandbox remains review-only.');
    if (approval && approval.payload_checksum && approval.payload_checksum !== authActionPayloadChecksum(request)) blockers.push('Approval package checksum does not match current action request.');
    warnings.push('Sandbox adapters intentionally do not call Supabase Auth APIs in v3.14.6.');
    return {
      type: 'feg-stage-pro-auth-action-adapter-sandbox',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      workspace_slug: cfg.workspaceId,
      selected_action: action,
      selected_adapter: selected,
      adapter_contracts: contractRows,
      capability_matrix: capability,
      approval_summary: approval ? { approved: Boolean(approval.approved), action: approval.action, payload_checksum: approval.payload_checksum, stale: Boolean(compareAuthActionApprovalWithCurrentRequest(Object.assign({}, opts, { actionRequest: request })).stale) } : null,
      status: blockers.length ? 'blocked' : 'sandbox_ready_non_mutating',
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        no_auth_otp_request: true,
        no_oauth_redirect: true,
        no_sign_out: true,
        raw_secret_exported: false,
        browser_write_disabled: true
      },
      note: 'Adapter sandbox documents per-action contracts and stubs before real Supabase Auth mutations are implemented.'
    };
  }

  function buildAuthActionMutationContract(options) {
    const opts = options || {};
    const sandbox = buildAuthActionAdapterSandbox(opts);
    const rows = sandbox.adapter_contracts.map(row => ({
      action: row.action,
      edge_entrypoint: row.edge_entrypoint,
      allowed_now: false,
      future_mutation_scope: row.intended_writes,
      required_manual_checks: [
        'manual code review',
        'fresh dry-run report',
        'fresh approval checksum',
        'post-action verification plan',
        'rollback hint reviewed'
      ],
      hard_stops: [
        'do not persist raw invite/bootstrap secrets',
        'do not execute browser-side profile writes',
        'do not consume invite key without service-role Edge gate',
        'do not create first admin if an active admin exists'
      ],
      rollback_hint: row.rollback_hint,
      remote_write_executed: false
    }));
    return {
      type: 'feg-stage-pro-auth-action-mutation-contract',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      selected_action: sandbox.selected_action,
      rows,
      selected_contract: rows.find(row => row.action === sandbox.selected_action) || rows[0],
      status: 'contract_review_only',
      blockers: ['Real auth mutations require a separate promotion commit after code review.'],
      warnings: sandbox.warnings,
      remote_write_executed: false,
      safety: sandbox.safety
    };
  }

  function buildAuthActionPromotionReviewPack(options) {
    const opts = options || {};
    const sandbox = buildAuthActionAdapterSandbox(opts);
    const contract = buildAuthActionMutationContract(opts);
    const promotionGate = buildAuthRemoteActionsPromotionGate(opts);
    const audit = buildAuthActionSafetyAuditTrail({ storage: opts.storage });
    const checklist = [
      { key: 'sandbox', label: 'Adapter sandbox generated', ok: Boolean(sandbox && sandbox.adapter_contracts && sandbox.adapter_contracts.length), mutating: false },
      { key: 'contract', label: 'Mutation contract generated', ok: Boolean(contract && contract.rows && contract.rows.length), mutating: false },
      { key: 'capability', label: 'Capability matrix reviewed', ok: Boolean(sandbox.capability_matrix), mutating: false },
      { key: 'approval', label: 'Approval package fresh', ok: Boolean(sandbox.approval_summary && sandbox.approval_summary.approved && !sandbox.approval_summary.stale), mutating: false },
      { key: 'promotion_gate', label: 'Promotion gate ready', ok: Boolean(promotionGate && promotionGate.ready), mutating: false },
      { key: 'audit', label: 'Safety audit snapshot available/recommended', ok: Boolean(audit && audit.counts), mutating: false }
    ];
    const blockers = checklist.filter(row => !row.ok).map(row => row.label);
    return {
      type: 'feg-stage-pro-auth-action-promotion-review-pack',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      selected_action: sandbox.selected_action,
      status: blockers.length ? 'promotion_review_blocked' : 'promotion_review_ready_still_non_mutating',
      checklist,
      sandbox,
      mutation_contract: contract,
      promotion_gate: promotionGate,
      safety_audit_summary: audit,
      blockers: Array.from(new Set(blockers.concat(['v3.14.6 keeps auth remote actions non-mutating until a separate env/code promotion.']))),
      warnings: Array.from(new Set((sandbox.warnings || []).concat(promotionGate.warnings || []))),
      remote_write_executed: false,
      note: 'Review pack bundles sandbox, mutation contract and gates for manual review. It does not enable auth mutations.'
    };
  }

  function saveAuthActionAdapterSandboxSnapshot(report, storage) {
    const list = readJson(storage, AUTH_ACTION_ADAPTER_SANDBOX_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-adapter-sandbox-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionAdapterSandbox({ storage })) });
    writeJson(storage, AUTH_ACTION_ADAPTER_SANDBOX_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionAdapterSandboxSnapshots(storage) {
    const list = readJson(storage, AUTH_ACTION_ADAPTER_SANDBOX_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAuthActionPromotionReviewSnapshot(report, storage) {
    const list = readJson(storage, AUTH_ACTION_PROMOTION_REVIEW_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-promotion-review-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionPromotionReviewPack({ storage })) });
    writeJson(storage, AUTH_ACTION_PROMOTION_REVIEW_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionPromotionReviewSnapshots(storage) {
    const list = readJson(storage, AUTH_ACTION_PROMOTION_REVIEW_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAuthActionCapabilitySnapshot(report, storage) {
    const list = readJson(storage, AUTH_ACTION_CAPABILITY_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-capability-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionCapabilityMatrix({ storage })) });
    writeJson(storage, AUTH_ACTION_CAPABILITY_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionCapabilitySnapshots(storage) {
    const list = readJson(storage, AUTH_ACTION_CAPABILITY_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function summarizeAuthActionDryRunReport(report) {
    const body = report && report.body && typeof report.body === 'object' ? report.body : (report || {});
    const advisory = body.auth_action_advisory || body.action_advisory || {};
    const blockers = [];
    const warnings = [];
    if (!report) blockers.push('Auth action dry-run report is missing.');
    if (report && report.ok === false) blockers.push(`Auth action dry-run failed: ${report.reason || report.error || report.status || 'unknown'}`);
    if (body && body.remote_write_executed) blockers.push('Remote write was unexpectedly executed during auth action dry-run.');
    if (advisory && advisory.ok === false) blockers.push(...(advisory.errors || ['auth action advisory returned ok=false']));
    if (Array.isArray(advisory.warnings)) warnings.push(...advisory.warnings);
    return {
      type: 'feg-stage-pro-auth-action-dry-run-summary',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      action: advisory.action || body.action || '',
      ok: blockers.length === 0,
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready',
      remote_write_executed: Boolean(body && body.remote_write_executed),
      advisory,
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings))
    };
  }

  function buildAuthActionAuditTrail(options) {
    const opts = options || {};
    const reports = readAuthActionDryRunReports(opts.storage);
    const latest = opts.report || (reports[0] && reports[0].report) || null;
    const summary = summarizeAuthActionDryRunReport(latest);
    const actions = reports.reduce((acc, row) => {
      const action = row && row.report && (row.report.action || row.report.auth_action_advisory && row.report.auth_action_advisory.action) || 'unknown';
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});
    return {
      type: 'feg-stage-pro-auth-action-audit-trail',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      latest_summary: summary,
      history_count: reports.length,
      action_counts: actions,
      reports: clone(reports.slice(0, 10)),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        no_local_session_mutation: true,
        raw_secret_exported: false
      },
      note: 'Audit trail stores dry-run summaries only. It is not an auth event ledger and does not store raw invite/bootstrap keys.'
    };
  }

  function saveAuthActionDryRunReport(report, storage) {
    const list = readJson(storage, AUTH_ACTION_DRY_RUN_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-action-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionDryRunRequest()) });
    writeJson(storage, AUTH_ACTION_DRY_RUN_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionDryRunReports(storage) {
    const list = readJson(storage, AUTH_ACTION_DRY_RUN_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAuthActionAuditSnapshot(report, storage) {
    const list = readJson(storage, AUTH_ACTION_AUDIT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-action-audit-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthActionAuditTrail({ storage })) });
    writeJson(storage, AUTH_ACTION_AUDIT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthActionAuditSnapshots(storage) {
    const list = readJson(storage, AUTH_ACTION_AUDIT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  async function runAuthActionDryRunEdge(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = toText(opts.endpoint || endpointUrl(cfg, cfg.authSessionDryRunFunction));
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const actionRequest = opts.actionRequest || buildAuthActionDryRunRequest(opts);
    const payload = Object.assign({}, buildAuthSessionDryRunRequest(opts), { auth_action_request: actionRequest, requested_action: actionRequest.action, auth_action_checksum: authActionPayloadChecksum(actionRequest) });
    if (!endpoint) return { ok: false, reason: 'auth_action_endpoint_missing', remote_write_executed: false };
    if (!testKey) return { ok: false, reason: 'test_key_required', remote_write_executed: false, action: actionRequest.action };
    if (opts.mockResponse) {
      const mocked = Object.assign({ ok: true, mocked: true, endpoint, action: actionRequest.action, remote_write_executed: false }, clone(opts.mockResponse));
      saveAuthActionDryRunReport(mocked, opts.storage);
      return mocked;
    }
    if (typeof GLOBAL.fetch !== 'function') return { ok: false, reason: 'fetch_unavailable', endpoint, action: actionRequest.action, remote_write_executed: false };
    try {
      const response = await GLOBAL.fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: JSON.stringify(payload)
      });
      let body = null;
      try { body = await response.json(); } catch (_) { body = { ok: false, reason: 'invalid_json_response' }; }
      const report = Object.assign({ http_status: response.status, ok: response.ok && body && body.ok !== false, endpoint, action: actionRequest.action, remote_write_executed: false }, body || {});
      saveAuthActionDryRunReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = { ok: false, reason: String(err && err.message || err), endpoint, action: actionRequest.action, remote_write_executed: false };
      saveAuthActionDryRunReport(report, opts.storage);
      return report;
    }
  }


  function buildAuthSessionDryRunRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const sessionPreflight = buildAuthSessionPreflight(opts);
    const invitePreflight = buildInviteBootstrapPreflight(opts);
    const sessionBridge = buildSupabaseSessionBridgeReport(opts);
    const runtimeGuard = buildRuntimeRoleGuardReport(opts);
    const inviteRequest = buildInviteRegistrationRequestTemplate(opts);
    const bootstrapRequest = buildFirstAdminBootstrapRequestTemplate(opts);
    return {
      type: 'feg-stage-pro-auth-session-dry-run-request',
      version: SUPABASE_AUTH_ADAPTER_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      requested_role: sessionPreflight.role_matrix.role,
      auth_session_preflight: sessionPreflight,
      invite_bootstrap_preflight: invitePreflight,
      session_bridge: sessionBridge,
      runtime_role_guard: runtimeGuard,
      invite_registration_request: inviteRequest,
      first_admin_bootstrap_request: bootstrapRequest,
      auth_action_request: buildAuthActionDryRunRequest(Object.assign({}, opts, { action: opts.action || 'session_restore' })),
      safety: {
        remote_write_executed: false,
        no_profile_write: true,
        no_invite_consume: true,
        no_bootstrap_mutation: true,
        test_key_required: true
      }
    };
  }

  async function runAuthSessionDryRunEdge(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = toText(opts.endpoint || endpointUrl(cfg, cfg.authSessionDryRunFunction));
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    if (!endpoint) return { ok: false, reason: 'auth_session_endpoint_missing', remote_write_executed: false };
    if (!testKey) return { ok: false, reason: 'test_key_required', remote_write_executed: false };
    const requestPayload = opts.requestPayload || buildAuthSessionDryRunRequest(opts);
    if (opts.mockResponse) return Object.assign({ ok: true, mocked: true, endpoint, remote_write_executed: false }, clone(opts.mockResponse));
    if (typeof GLOBAL.fetch !== 'function') return { ok: false, reason: 'fetch_unavailable', endpoint, remote_write_executed: false };
    const response = await GLOBAL.fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
      body: JSON.stringify(requestPayload)
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) { payload = { ok: false, reason: 'invalid_json_response' }; }
    return Object.assign({ http_status: response.status, ok: response.ok && payload && payload.ok !== false, endpoint, remote_write_executed: false }, payload || {});
  }


  function saveAuthSessionBridgeReport(report, storage) {
    const list = readJson(storage, AUTH_SESSION_BRIDGE_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-bridge-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildSupabaseSessionBridgeReport()) });
    writeJson(storage, AUTH_SESSION_BRIDGE_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthSessionBridgeReports(storage) {
    const list = readJson(storage, AUTH_SESSION_BRIDGE_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveRuntimeRoleGuardSnapshot(report, storage) {
    const list = readJson(storage, AUTH_ROLE_GUARD_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `role-guard-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildRuntimeRoleGuardReport()) });
    writeJson(storage, AUTH_ROLE_GUARD_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readRuntimeRoleGuardSnapshots(storage) {
    const list = readJson(storage, AUTH_ROLE_GUARD_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAuthRequestTemplatePack(pack, storage) {
    const list = readJson(storage, AUTH_REQUEST_TEMPLATE_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-template-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(pack || buildAuthRequestTemplatePack()) });
    writeJson(storage, AUTH_REQUEST_TEMPLATE_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthRequestTemplatePacks(storage) {
    const list = readJson(storage, AUTH_REQUEST_TEMPLATE_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAuthSessionPreflightReport(report, storage) {
    const list = readJson(storage, AUTH_SESSION_PREFLIGHT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-session-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildAuthSessionPreflight()) });
    writeJson(storage, AUTH_SESSION_PREFLIGHT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readAuthSessionPreflightReports(storage) {
    const list = readJson(storage, AUTH_SESSION_PREFLIGHT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveInviteBootstrapPreflightReport(report, storage) {
    const list = readJson(storage, AUTH_INVITE_PREFLIGHT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-invite-${Date.now().toString(36)}`, saved_at: nowIso(), report: clone(report || buildInviteBootstrapPreflight()) });
    writeJson(storage, AUTH_INVITE_PREFLIGHT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function readInviteBootstrapPreflightReports(storage) {
    const list = readJson(storage, AUTH_INVITE_PREFLIGHT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }


  function saveAuthReadinessSnapshot(report, storage) {
    const snap = report && report.type === 'feg-stage-pro-supabase-auth-readiness-report' ? report : buildAuthReadinessReport(report || {});
    const list = readJson(storage, AUTH_SNAPSHOT_STORAGE_KEY, []);
    const next = Array.isArray(list) ? list.slice() : [];
    next.unshift({ id: `auth-${Date.now().toString(36)}`, saved_at: nowIso(), report: snap });
    writeJson(storage, AUTH_SNAPSHOT_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function listAuthReadinessSnapshots(storage) {
    const list = readJson(storage, AUTH_SNAPSHOT_STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  async function signInWithEmail(email, options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    if (getAuthMode(cfg, opts.supabaseGlobal) !== 'supabase') return { ok: false, reason: 'supabase_auth_not_enabled', mode: 'local' };
    const client = opts.client || createSupabaseAuthClient(cfg, opts.supabaseGlobal);
    if (!client || !client.auth || typeof client.auth.signInWithOtp !== 'function') return { ok: false, reason: 'supabase_auth_client_missing' };
    const normalized = normalizeEmail(email);
    if (!normalized) return { ok: false, reason: 'invalid_email' };
    if (opts.dryRun) return { ok: true, dryRun: true, provider: 'email', email: normalized, redirectTo: cfg.redirectTo };
    const result = await client.auth.signInWithOtp({ email: normalized, options: { emailRedirectTo: cfg.redirectTo } });
    return Object.assign({ ok: !result.error, provider: 'email', email: normalized }, result);
  }

  async function signInWithOAuth(provider, options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const normalizedProvider = toText(provider || '').toLowerCase();
    if (!['google', 'apple'].includes(normalizedProvider)) return { ok: false, reason: 'unsupported_provider' };
    if (getAuthMode(cfg, opts.supabaseGlobal) !== 'supabase') return { ok: false, reason: 'supabase_auth_not_enabled', mode: 'local' };
    const client = opts.client || createSupabaseAuthClient(cfg, opts.supabaseGlobal);
    if (!client || !client.auth || typeof client.auth.signInWithOAuth !== 'function') return { ok: false, reason: 'supabase_auth_client_missing' };
    if (opts.dryRun) return { ok: true, dryRun: true, provider: normalizedProvider, redirectTo: cfg.redirectTo };
    const result = await client.auth.signInWithOAuth({ provider: normalizedProvider, options: { redirectTo: cfg.redirectTo } });
    return Object.assign({ ok: !result.error, provider: normalizedProvider }, result);
  }

  async function getCurrentSession(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    if (getAuthMode(cfg, opts.supabaseGlobal) !== 'supabase') return { ok: false, reason: 'supabase_auth_not_enabled', session: null };
    const client = opts.client || createSupabaseAuthClient(cfg, opts.supabaseGlobal);
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') return { ok: false, reason: 'supabase_auth_client_missing', session: null };
    const result = await client.auth.getSession();
    return { ok: !result.error, session: result.data && result.data.session || null, error: result.error || null };
  }

  function readinessToText(report) {
    const r = report || buildAuthReadinessReport();
    const lines = [];
    lines.push('FEG Stage PRO — Supabase Auth & Profiles');
    lines.push(`Версия: ${r.version || SUPABASE_AUTH_ADAPTER_VERSION}`);
    lines.push(`Дата: ${r.generated_at || nowIso()}`);
    lines.push(`Auth mode: ${r.auth_mode}`);
    lines.push(`Requested: ${r.requested_mode}`);
    lines.push(`Workspace: ${r.workspace_id}`);
    lines.push(`Score: ${r.score}%`);
    lines.push(`Ready for Supabase Auth: ${r.ready_for_supabase_auth ? 'да' : 'нет'}`);
    lines.push('');
    lines.push(`Profiles: ${(r.rows && r.rows.profiles || []).length}`);
    lines.push(`Invite keys: ${(r.rows && r.rows.invite_keys || []).length}`);
    if (r.blockers && r.blockers.length) {
      lines.push(''); lines.push('Blockers:'); r.blockers.forEach(item => lines.push(`- ${item}`));
    }
    if (r.warnings && r.warnings.length) {
      lines.push(''); lines.push('Warnings:'); r.warnings.forEach(item => lines.push(`- ${item}`));
    }
    return lines.join('\n');
  }

  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function downloadFile(filename, content, type) {
    if (!GLOBAL.document) return false;
    const blob = new Blob([content], { type: type || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    return true;
  }

  function renderAuthConsole(target, options) {
    const root = typeof target === 'string' ? GLOBAL.document && document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    let report = buildAuthReadinessReport(opts.config, opts);
    function render() {
      const rows = report.rows || { profiles: [], invite_keys: [] };
      root.innerHTML = `
        <div class="v4-card v4-supabase-auth-console" data-v4-supabase-auth-console>
          <div class="v4-section-head">
            <div>
              <div class="v4-kicker">Supabase · Auth & Profiles</div>
              <h3>Auth / Profiles readiness</h3>
              <p class="v4-muted">Подготовка реального Supabase Auth: профили, роли, invite keys, readiness и dry-run OAuth/email flow. Никакой вход не включается принудительно.</p>
            </div>
            <div class="v4-sync-score ${report.ready_for_supabase_auth ? 'ok' : report.ready_for_local_profiles_sync ? 'warn' : 'bad'}"><span>${escapeHtml(report.score)}</span><small>${report.ready_for_supabase_auth ? 'AUTH READY' : 'LOCAL SAFE'}</small></div>
          </div>
          <div class="v4-summary-grid">
            <div class="v4-mini"><span>Auth mode</span><b>${escapeHtml(report.auth_mode)}</b></div>
            <div class="v4-mini"><span>Profiles</span><b>${escapeHtml(rows.profiles.length)}</b></div>
            <div class="v4-mini"><span>Invite keys</span><b>${escapeHtml(rows.invite_keys.length)}</b></div>
            <div class="v4-mini"><span>SDK</span><b>${report.sdk_present ? 'есть' : 'нет'}</b></div>
          </div>
          ${renderSessionPreflightSummary(buildAuthSessionPreflight(opts))}
          ${renderSessionBridgeSummary(buildSupabaseSessionBridgeReport(opts))}
          ${renderRuntimeRoleGuardSummary(buildRuntimeRoleGuardReport(opts))}
          ${renderAuthActionSummary(buildAuthActionDryRunRequest(opts))}
          ${renderAuthActionApprovalSummary(buildAuthActionApprovalPackage(opts))}
          ${renderAuthActionPostVerifySummary(buildAuthActionSafetyAuditTrail({ storage: opts.storage }))}
          ${renderAuthActionCapabilitySummary(buildAuthActionCapabilityMatrix(opts))}
          ${renderAuthActionAdapterSandboxSummary(buildAuthActionAdapterSandbox(opts))}
          ${renderInvitePreflightSummary(buildInviteBootstrapPreflight(opts))}
          ${renderIssues('Blockers', report.blockers, 'bad')}
          ${renderIssues('Warnings', report.warnings, 'warn')}
          <div class="v4-doc-actions">
            <button type="button" class="btn-secondary" data-auth-console="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-auth-console="copy">Копировать отчёт</button>
            <button type="button" class="btn-secondary" data-auth-console="download">Скачать auth readiness JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="snapshot">Сохранить snapshot</button>
            <button type="button" class="btn-secondary" data-auth-console="session-preflight">Session preflight JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="invite-preflight">Invite/bootstrap JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-dry-run-template">Auth dry-run template</button>
            <button type="button" class="btn-secondary" data-auth-console="session-bridge">Session bridge JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="role-guard">Role guard JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-template-pack">Auth request templates</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-template">Auth action dry-run</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-audit">Auth action audit</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-approval">Auth action approval</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-execution-template">Auth execution template</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-execution-readiness">Auth execution readiness</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-post-verify-request">Auth post-action verify</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-safety-audit">Auth safety audit</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-rollback-hints">Auth rollback hints</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-capability">Auth capability matrix</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-action-implementation-plan">Auth implementation plan</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-promotion-gate">Auth promotion gate</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-adapter-sandbox">Auth adapter sandbox</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-mutation-contract">Auth mutation contract</button>
            <button type="button" class="btn-secondary" data-auth-console="auth-promotion-review">Auth promotion review</button>
          </div>
          <details class="v4-json-details"><summary>Profiles / invite_keys payload</summary><pre>${escapeHtml(safeJson(rows))}</pre></details>
          <details class="v4-json-details"><summary>Role guard matrix</summary><pre>${escapeHtml(safeJson(buildRoleGuardMatrix((getLocalAuthSnapshot().user || {}).role || 'viewer')))}</pre></details>
        </div>`;
      root.querySelectorAll('[data-auth-console]').forEach(btn => btn.addEventListener('click', () => handle(btn.getAttribute('data-auth-console'))));
    }
    function handle(action) {
      if (action === 'refresh') { report = buildAuthReadinessReport(opts.config, opts); render(); return; }
      if (action === 'copy' && GLOBAL.navigator && navigator.clipboard) navigator.clipboard.writeText(readinessToText(report)).catch(() => {});
      if (action === 'download') downloadFile('feg_supabase_auth_readiness.json', safeJson(report));
      if (action === 'snapshot') saveAuthReadinessSnapshot(report, opts.storage);
      if (action === 'session-preflight') { const sessionReport = buildAuthSessionPreflight(opts); saveAuthSessionPreflightReport(sessionReport, opts.storage); downloadFile('feg_auth_session_preflight.json', safeJson(sessionReport)); }
      if (action === 'invite-preflight') { const inviteReport = buildInviteBootstrapPreflight(opts); saveInviteBootstrapPreflightReport(inviteReport, opts.storage); downloadFile('feg_auth_invite_bootstrap_preflight.json', safeJson(inviteReport)); }
      if (action === 'auth-dry-run-template') downloadFile('feg_auth_session_dry_run_request.json', safeJson(buildAuthSessionDryRunRequest(opts)));
      if (action === 'session-bridge') { const bridge = buildSupabaseSessionBridgeReport(opts); saveAuthSessionBridgeReport(bridge, opts.storage); downloadFile('feg_auth_session_bridge.json', safeJson(bridge)); }
      if (action === 'role-guard') { const guard = buildRuntimeRoleGuardReport(opts); saveRuntimeRoleGuardSnapshot(guard, opts.storage); downloadFile('feg_auth_runtime_role_guard.json', safeJson(guard)); }
      if (action === 'auth-template-pack') { const pack = buildAuthRequestTemplatePack(opts); saveAuthRequestTemplatePack(pack, opts.storage); downloadFile('feg_auth_request_templates.json', safeJson(pack)); }
      if (action === 'auth-action-template') { const req = buildAuthActionDryRunRequest(opts); saveAuthActionDryRunReport(req, opts.storage); downloadFile('feg_auth_action_dry_run_request.json', safeJson(req)); }
      if (action === 'auth-action-audit') { const audit = buildAuthActionAuditTrail({ storage: opts.storage }); saveAuthActionAuditSnapshot(audit, opts.storage); downloadFile('feg_auth_action_audit.json', safeJson(audit)); }
      if (action === 'auth-action-approval') { const approval = buildAuthActionApprovalPackage(opts); saveAuthActionApprovalPackage(approval, opts.storage); downloadFile('feg_auth_action_approval.json', safeJson(approval)); }
      if (action === 'auth-action-execution-template') { const template = buildApprovedAuthActionExecutionTemplate(opts); saveAuthActionExecutionTemplate(template, opts.storage); downloadFile('feg_auth_action_execution_template.json', safeJson(template)); }
      if (action === 'auth-action-execution-readiness') { downloadFile('feg_auth_action_execution_readiness.json', safeJson(buildAuthActionExecutionReadiness(opts))); }
      if (action === 'auth-action-post-verify-request') { downloadFile('feg_auth_action_post_verification_request.json', safeJson(buildAuthActionPostActionVerificationRequest(opts))); }
      if (action === 'auth-action-safety-audit') { const audit = buildAuthActionSafetyAuditTrail({ storage: opts.storage }); saveAuthActionSafetyAuditSnapshot(audit, opts.storage); downloadFile('feg_auth_action_safety_audit.json', safeJson(audit)); }
      if (action === 'auth-action-rollback-hints') { downloadFile('feg_auth_action_rollback_hints.json', safeJson(buildAuthActionRollbackHints({ storage: opts.storage }))); }
      if (action === 'auth-action-capability') { const matrix = buildAuthActionCapabilityMatrix(opts); saveAuthActionCapabilitySnapshot(matrix, opts.storage); downloadFile('feg_auth_action_capability_matrix.json', safeJson(matrix)); }
      if (action === 'auth-action-implementation-plan') { downloadFile('feg_auth_action_implementation_plan.json', safeJson(buildAuthActionImplementationPlan(opts))); }
      if (action === 'auth-promotion-gate') { downloadFile('feg_auth_remote_actions_promotion_gate.json', safeJson(buildAuthRemoteActionsPromotionGate(opts))); }
      if (action === 'auth-adapter-sandbox') { const sandbox = buildAuthActionAdapterSandbox(opts); saveAuthActionAdapterSandboxSnapshot(sandbox, opts.storage); downloadFile('feg_auth_action_adapter_sandbox.json', safeJson(sandbox)); }
      if (action === 'auth-mutation-contract') { downloadFile('feg_auth_action_mutation_contract.json', safeJson(buildAuthActionMutationContract(opts))); }
      if (action === 'auth-promotion-review') { const pack = buildAuthActionPromotionReviewPack(opts); saveAuthActionPromotionReviewSnapshot(pack, opts.storage); downloadFile('feg_auth_action_promotion_review_pack.json', safeJson(pack)); }
    }
    render();
    return root;
  }


  function renderSessionPreflightSummary(sessionReport) {
    const r = sessionReport || buildAuthSessionPreflight();
    const tone = r.ready_for_supabase_auth ? 'ok' : r.ready_for_local_session ? 'warn' : 'bad';
    return `<div class="v4-sync-issues ${tone}"><b>Session preflight</b><span>mode: ${escapeHtml(r.resolved_mode)}</span><span>role: ${escapeHtml(r.role_matrix && r.role_matrix.role || 'viewer')}</span><span>visible sections: ${escapeHtml(r.role_matrix && r.role_matrix.summary && r.role_matrix.summary.visible || 0)}</span><span>remote write: false</span></div>`;
  }


  function renderSessionBridgeSummary(bridgeReport) {
    const r = bridgeReport || buildSupabaseSessionBridgeReport();
    const tone = r.ready_for_runtime_bridge ? 'ok' : (r.runtime_user_preview ? 'warn' : 'bad');
    return `<div class="v4-sync-issues ${tone}"><b>Session bridge</b><span>session: ${r.supabase_session_present ? 'supabase' : 'local/demo preview'}</span><span>role: ${escapeHtml(r.role_matrix && r.role_matrix.role || 'viewer')}</span><span>ready: ${r.ready_for_runtime_bridge ? 'yes' : 'no'}</span><span>write: false</span></div>`;
  }

  function renderRuntimeRoleGuardSummary(guardReport) {
    const r = guardReport || buildRuntimeRoleGuardReport();
    const denied = r.summary && r.summary.denied || 0;
    const tone = denied ? 'warn' : 'ok';
    return `<div class="v4-sync-issues ${tone}"><b>Runtime role guard</b><span>role: ${escapeHtml(r.role || 'viewer')}</span><span>allowed: ${escapeHtml(r.summary && r.summary.allowed || 0)}</span><span>denied: ${escapeHtml(denied)}</span><span>mutation: false</span></div>`;
  }


  function renderAuthActionSummary(actionReport) {
    const r = actionReport || buildAuthActionDryRunRequest();
    const ok = r.request_validation && r.request_validation.ok;
    const tone = ok ? (r.request_validation.warnings && r.request_validation.warnings.length ? 'warn' : 'ok') : 'bad';
    return `<div class="v4-sync-issues ${tone}"><b>Auth action dry-run</b><span>action: ${escapeHtml(r.action || 'session_restore')}</span><span>provider: ${escapeHtml(r.provider || '')}</span><span>valid: ${ok ? 'yes' : 'no'}</span><span>mutations: false</span></div>`;
  }


  function renderAuthActionApprovalSummary(approvalReport) {
    const r = approvalReport || buildAuthActionApprovalPackage();
    const tone = r.approved ? (r.warnings && r.warnings.length ? 'warn' : 'ok') : 'bad';
    return `<div class="v4-sync-issues ${tone}"><b>Auth action approval</b><span>action: ${escapeHtml(r.action || 'session_restore')}</span><span>status: ${escapeHtml(r.status || '')}</span><span>checksum: ${escapeHtml(r.payload_checksum || '')}</span><span>execution: template-only</span></div>`;
  }


  function renderAuthActionPostVerifySummary(auditReport) {
    const r = auditReport || buildAuthActionSafetyAuditTrail();
    const verify = r.latest_post_verification_summary || {};
    const controlled = r.latest_controlled_action_summary || {};
    const tone = verify.ok ? 'ok' : controlled.remote_write_executed ? 'warn' : 'warn';
    return `<div class="v4-sync-issues ${tone}"><b>Auth post-action verify/audit</b><span>controlled reports: ${escapeHtml(r.counts && r.counts.controlled_action_reports || 0)}</span><span>verify reports: ${escapeHtml(r.counts && r.counts.post_verification_reports || 0)}</span><span>verify: ${escapeHtml(verify.status || 'not_run')}</span><span>auto rollback: false</span></div>`;
  }


  function renderAuthActionCapabilitySummary(capabilityReport) {
    const r = capabilityReport || buildAuthActionCapabilityMatrix();
    const tone = r.blockers && r.blockers.length ? 'bad' : (r.warnings && r.warnings.length ? 'warn' : 'ok');
    return `<div class="v4-sync-issues ${tone}"><b>Auth capability matrix</b><span>action: ${escapeHtml(r.selected_action || 'session_restore')}</span><span>status: ${escapeHtml(r.status || '')}</span><span>blockers: ${escapeHtml(r.blockers && r.blockers.length || 0)}</span><span>mutations: false</span></div>`;
  }


  function renderAuthActionAdapterSandboxSummary(sandboxReport) {
    const r = sandboxReport || buildAuthActionAdapterSandbox();
    const tone = r.blockers && r.blockers.length ? 'bad' : 'warn';
    const count = r.adapter_contracts && r.adapter_contracts.length || 0;
    return `<div class="v4-sync-issues ${tone}"><b>Auth adapter sandbox</b><span>action: ${escapeHtml(r.selected_action || 'session_restore')}</span><span>contracts: ${escapeHtml(count)}</span><span>status: ${escapeHtml(r.status || '')}</span><span>mutations: false</span></div>`;
  }

  function renderInvitePreflightSummary(inviteReport) {
    const r = inviteReport || buildInviteBootstrapPreflight();
    const tone = r.first_admin_required ? 'warn' : 'ok';
    return `<div class="v4-sync-issues ${tone}"><b>Invite/bootstrap preflight</b><span>profiles: ${escapeHtml(r.profiles_count || 0)}</span><span>admins: ${escapeHtml(r.active_admin_count || 0)}</span><span>active invites: ${escapeHtml(r.active_invite_keys_count || 0)}</span><span>first admin required: ${r.first_admin_required ? 'yes' : 'no'}</span></div>`;
  }

  function renderIssues(title, items, tone) {
    if (!items || !items.length) return '';
    return `<div class="v4-sync-issues ${tone || ''}"><b>${escapeHtml(title)}</b>${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  ROOT.SupabaseAuthAdapter = {
    SUPABASE_AUTH_ADAPTER_VERSION,
    AUTH_SNAPSHOT_STORAGE_KEY,
    AUTH_SESSION_PREFLIGHT_STORAGE_KEY,
    AUTH_INVITE_PREFLIGHT_STORAGE_KEY,
    AUTH_SESSION_BRIDGE_STORAGE_KEY,
    AUTH_ROLE_GUARD_STORAGE_KEY,
    AUTH_REQUEST_TEMPLATE_STORAGE_KEY,
    AUTH_ACTION_DRY_RUN_STORAGE_KEY,
    AUTH_ACTION_AUDIT_STORAGE_KEY,
    AUTH_ACTION_APPROVAL_STORAGE_KEY,
    AUTH_ACTION_EXECUTION_TEMPLATE_STORAGE_KEY,
    AUTH_CONTROLLED_ACTION_REPORT_STORAGE_KEY,
    AUTH_ACTION_POST_VERIFY_STORAGE_KEY,
    AUTH_ACTION_SAFETY_AUDIT_STORAGE_KEY,
    AUTH_ACTION_CAPABILITY_STORAGE_KEY,
    AUTH_ACTION_ADAPTER_SANDBOX_STORAGE_KEY,
    AUTH_ACTION_PROMOTION_REVIEW_STORAGE_KEY,
    AUTH_SESSION_DRY_RUN_FUNCTION,
    AUTH_CONTROLLED_ACTION_FUNCTION,
    getRuntimeConfig,
    isSupabaseAuthConfigured,
    getAuthMode,
    createSupabaseAuthClient,
    endpointUrl,
    getLocalAuthSnapshot,
    buildRoleGuardMatrix,
    buildAuthSessionPreflight,
    buildInviteBootstrapPreflight,
    buildSupabaseSessionBridgeReport,
    buildRuntimeRoleGuardReport,
    assertRuntimeSectionAccess,
    buildInviteRegistrationRequestTemplate,
    buildFirstAdminBootstrapRequestTemplate,
    buildAuthRequestTemplatePack,
    buildAuthActionDryRunRequest,
    authActionPayloadChecksum,
    buildAuthActionApprovalPackage,
    readAuthActionApprovalPackage,
    saveAuthActionApprovalPackage,
    clearAuthActionApprovalPackage,
    compareAuthActionApprovalWithCurrentRequest,
    buildApprovedAuthActionExecutionTemplate,
    buildAuthActionExecutionReadiness,
    saveAuthActionExecutionTemplate,
    readAuthActionExecutionTemplates,
    runAuthControlledActionEdge,
    saveAuthControlledActionReport,
    readAuthControlledActionReports,
    summarizeAuthControlledActionReport,
    buildAuthActionPostActionVerificationRequest,
    buildAuthActionPostActionVerificationReadiness,
    runAuthActionPostActionVerification,
    summarizeAuthActionPostVerificationReport,
    saveAuthActionPostVerificationReport,
    readAuthActionPostVerificationReports,
    buildAuthActionSafetyAuditTrail,
    buildAuthActionRollbackHints,
    buildAuthActionCapabilityMatrix,
    buildAuthActionImplementationPlan,
    buildAuthRemoteActionsPromotionGate,
    buildAuthActionAdapterSandbox,
    buildAuthActionMutationContract,
    buildAuthActionPromotionReviewPack,
    saveAuthActionAdapterSandboxSnapshot,
    readAuthActionAdapterSandboxSnapshots,
    saveAuthActionPromotionReviewSnapshot,
    readAuthActionPromotionReviewSnapshots,
    saveAuthActionCapabilitySnapshot,
    readAuthActionCapabilitySnapshots,
    saveAuthActionSafetyAuditSnapshot,
    readAuthActionSafetyAuditSnapshots,
    summarizeAuthActionDryRunReport,
    buildAuthActionAuditTrail,
    saveAuthActionDryRunReport,
    readAuthActionDryRunReports,
    saveAuthActionAuditSnapshot,
    readAuthActionAuditSnapshots,
    runAuthActionDryRunEdge,
    buildAuthSessionDryRunRequest,
    runAuthSessionDryRunEdge,
    saveAuthSessionBridgeReport,
    readAuthSessionBridgeReports,
    saveRuntimeRoleGuardSnapshot,
    readRuntimeRoleGuardSnapshots,
    saveAuthRequestTemplatePack,
    readAuthRequestTemplatePacks,
    saveAuthSessionPreflightReport,
    readAuthSessionPreflightReports,
    saveInviteBootstrapPreflightReport,
    readInviteBootstrapPreflightReports,
    mapSupabaseUserToProfile,
    mapLocalProfileToSupabaseProfile,
    buildProfilesPayload,
    buildInviteKeysPayload,
    validateProfilesPayload,
    buildAuthReadinessReport,
    readinessToText,
    saveAuthReadinessSnapshot,
    listAuthReadinessSnapshots,
    signInWithEmail,
    signInWithOAuth,
    getCurrentSession,
    renderAuthConsole
  };
})();
