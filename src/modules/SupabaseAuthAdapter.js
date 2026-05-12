(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUPABASE_AUTH_ADAPTER_VERSION = '3.10.0';
  const AUTH_SNAPSHOT_STORAGE_KEY = 'fegV4SupabaseAuthReadinessSnapshots';
  const ROLE_FALLBACK = 'viewer';
  const KNOWN_ROLES = Object.freeze(['admin', 'manager', 'technician', 'warehouse', 'viewer']);

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function normalizeEmail(value) { return toText(value).toLowerCase(); }
  function normalizeRole(role) { const text = toText(role).toLowerCase(); return KNOWN_ROLES.includes(text) ? text : ROLE_FALLBACK; }

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
          ${renderIssues('Blockers', report.blockers, 'bad')}
          ${renderIssues('Warnings', report.warnings, 'warn')}
          <div class="v4-doc-actions">
            <button type="button" class="btn-secondary" data-auth-console="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-auth-console="copy">Копировать отчёт</button>
            <button type="button" class="btn-secondary" data-auth-console="download">Скачать auth readiness JSON</button>
            <button type="button" class="btn-secondary" data-auth-console="snapshot">Сохранить snapshot</button>
          </div>
          <details class="v4-json-details"><summary>Profiles / invite_keys payload</summary><pre>${escapeHtml(safeJson(rows))}</pre></details>
        </div>`;
      root.querySelectorAll('[data-auth-console]').forEach(btn => btn.addEventListener('click', () => handle(btn.getAttribute('data-auth-console'))));
    }
    function handle(action) {
      if (action === 'refresh') { report = buildAuthReadinessReport(opts.config, opts); render(); return; }
      if (action === 'copy' && GLOBAL.navigator && navigator.clipboard) navigator.clipboard.writeText(readinessToText(report)).catch(() => {});
      if (action === 'download') downloadFile('feg_supabase_auth_readiness.json', safeJson(report));
      if (action === 'snapshot') saveAuthReadinessSnapshot(report, opts.storage);
    }
    render();
    return root;
  }

  function renderIssues(title, items, tone) {
    if (!items || !items.length) return '';
    return `<div class="v4-sync-issues ${tone || ''}"><b>${escapeHtml(title)}</b>${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  ROOT.SupabaseAuthAdapter = {
    SUPABASE_AUTH_ADAPTER_VERSION,
    AUTH_SNAPSHOT_STORAGE_KEY,
    getRuntimeConfig,
    isSupabaseAuthConfigured,
    getAuthMode,
    createSupabaseAuthClient,
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
