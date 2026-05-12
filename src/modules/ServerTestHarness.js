(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const HARNESS_VERSION = '3.13.1';
  const STORAGE_KEY = 'fegV4ServerTestReports';
  const ENDPOINTS = Object.freeze({
    health: 'backend-health',
    seed: 'test-seed-workspace',
    writeQuote: 'test-write-quote',
    quoteDryRun: 'quote-sync-dry-run',
    quoteControlledWrite: 'quote-controlled-write',
    rlsCheck: 'test-rls-check',
    equipmentDryRun: 'equipment-sync-dry-run',
    cleanup: 'test-cleanup'
  });

  function syncAdapter() { return ROOT.BackendSyncAdapter || null; }
  function syncConsole() { return ROOT.SupabaseSyncConsole || null; }
  function authAdapter() { return ROOT.SupabaseAuthAdapter || null; }
  function quoteModel() { return ROOT.QuoteModel || null; }
  function quoteDraft() { return ROOT.QuoteDraftStorage || null; }
  function quoteItems() { return ROOT.QuoteItemBuilder || null; }
  function equipmentDb() { return ROOT.EquipmentDatabase || null; }
  function equipmentQueue() { return ROOT.EquipmentServerSyncQueue || null; }
  function backendPack() { return ROOT.SupabaseBackendPack || null; }
  function quoteBackendPack() { return ROOT.QuoteBackendSyncPack || null; }
  function suppliers() { return ROOT.SupplierDirectory || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function getRuntimeConfig(config) {
    const raw = Object.assign({}, GLOBAL.FEG_APP_CONFIG || {}, config || {});
    const base = syncAdapter() && syncAdapter().getRuntimeConfig ? Object.assign({}, raw, syncAdapter().getRuntimeConfig(raw)) : raw;
    const supabaseUrl = toText(base.supabaseUrl || base.supabase_url || raw.supabaseUrl || raw.supabase_url || '');
    const defaultFunctionsBase = supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : '';
    return Object.assign({}, base, {
      mode: base.mode || base.backendMode || 'local',
      workspaceId: toText(base.workspaceId || base.workspace_id || 'main') || 'main',
      supabaseUrl,
      supabaseAnonKey: toText(base.supabaseAnonKey || base.supabase_anon_key || ''),
      functionsBaseUrl: toText(base.functionsBaseUrl || base.functions_base_url || defaultFunctionsBase),
      enableServerTestHarness: base.enableServerTestHarness === true || base.serverTestHarness === true,
      serverTestDryRun: base.serverTestDryRun !== false,
      testWorkspaceSlug: toText(base.testWorkspaceSlug || 'feg-test-workspace'),
      testWorkspaceName: toText(base.testWorkspaceName || 'FEG Test Workspace')
    });
  }

  function maskKey(key) {
    const text = toText(key);
    if (!text) return '';
    if (text.length <= 8) return `${text.slice(0, 2)}•••${text.slice(-1)}`;
    return `${text.slice(0, 4)}••••••${text.slice(-4)}`;
  }

  function getEndpoint(config, key) {
    const cfg = getRuntimeConfig(config);
    const slug = ENDPOINTS[key] || key;
    return cfg.functionsBaseUrl ? `${cfg.functionsBaseUrl.replace(/\/+$/, '')}/${slug}` : '';
  }

  function buildHarnessReadiness(config, testKey) {
    const cfg = getRuntimeConfig(config);
    const key = toText(testKey);
    const hasFunctionsBase = Boolean(cfg.functionsBaseUrl);
    const hasTestKey = Boolean(key);
    const hasSupabaseUrl = Boolean(cfg.supabaseUrl);
    const enabled = cfg.enableServerTestHarness === true;
    const checks = [
      { key: 'enabled', label: 'Server Test Harness явно включён в runtime config', ok: enabled, severity: enabled ? 'ok' : 'warning' },
      { key: 'functions_base', label: 'Functions base URL определён', ok: hasFunctionsBase, severity: hasFunctionsBase ? 'ok' : 'error' },
      { key: 'supabase_url', label: 'supabaseUrl задан', ok: hasSupabaseUrl, severity: hasSupabaseUrl ? 'ok' : 'warning' },
      { key: 'test_key', label: 'Test key введён вручную', ok: hasTestKey, severity: hasTestKey ? 'ok' : 'error' },
      { key: 'not_stored', label: 'Test key не сохраняется в localStorage', ok: true, severity: 'ok' },
      { key: 'dry_run_default', label: 'Dry-run включён по умолчанию', ok: cfg.serverTestDryRun !== false, severity: cfg.serverTestDryRun !== false ? 'ok' : 'warning' }
    ];
    const blockers = checks.filter(item => !item.ok && item.severity === 'error').map(item => item.label);
    const warnings = checks.filter(item => !item.ok && item.severity !== 'error').map(item => item.label);
    return {
      type: 'feg-stage-pro-server-test-harness-readiness',
      version: HARNESS_VERSION,
      generated_at: nowIso(),
      ready: blockers.length === 0,
      enabled,
      dry_run: cfg.serverTestDryRun !== false,
      workspace_id: cfg.workspaceId,
      test_workspace_slug: cfg.testWorkspaceSlug,
      functions_base_url_present: hasFunctionsBase,
      test_key_present: hasTestKey,
      test_key_masked: maskKey(key),
      endpoints: Object.keys(ENDPOINTS).reduce((acc, name) => { acc[name] = getEndpoint(cfg, name); return acc; }, {}),
      checks,
      blockers,
      warnings
    };
  }

  function buildHeaders(testKey, extra) {
    const headers = Object.assign({ 'content-type': 'application/json' }, extra || {});
    const key = toText(testKey);
    if (key) headers['x-feg-test-key'] = key;
    return headers;
  }

  function getActiveQuote() {
    try {
      const draft = quoteDraft() && quoteDraft().getDraft ? quoteDraft().getDraft() : null;
      if (draft && Object.keys(draft).length) return quoteModel() && quoteModel().normalizeQuote ? quoteModel().normalizeQuote(draft) : draft;
    } catch (_) {}
    return quoteModel() && quoteModel().createEmptyQuote ? quoteModel().createEmptyQuote() : { id: 'test-quote', project: { name: 'Server Test Quote' } };
  }

  function buildTestWorkspacePayload(config) {
    const cfg = getRuntimeConfig(config);
    return {
      type: 'feg-stage-pro-test-workspace-seed-request',
      version: HARNESS_VERSION,
      is_test: true,
      workspace: {
        slug: cfg.testWorkspaceSlug,
        name: cfg.testWorkspaceName,
        settings: { is_test: true, created_by: 'server-test-harness', created_at: nowIso() }
      },
      profiles: [
        { email: 'admin@test.feg.local', display_name: 'Test Admin', role: 'admin', status: 'active', meta: { is_test: true } },
        { email: 'manager@test.feg.local', display_name: 'Test Manager', role: 'manager', status: 'active', meta: { is_test: true } },
        { email: 'tech@test.feg.local', display_name: 'Test Technician', role: 'technician', status: 'active', meta: { is_test: true } },
        { email: 'warehouse@test.feg.local', display_name: 'Test Warehouse', role: 'warehouse', status: 'active', meta: { is_test: true } }
      ],
      invite_keys: [
        { role: 'manager', note: 'Server test manager key', max_uses: 1, meta: { is_test: true } },
        { role: 'technician', note: 'Server test technician key', max_uses: 1, meta: { is_test: true } }
      ]
    };
  }

  function buildTestQuotePayload(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    let payload = null;
    try {
      if (syncConsole() && syncConsole().buildSeedSyncPayload) {
        payload = syncConsole().buildSeedSyncPayload({ config: Object.assign({}, cfg, { workspaceId: cfg.workspaceId }), quote: opts.quote || getActiveQuote(), includeEquipment: true, includeSuppliers: true });
      }
    } catch (_) { payload = null; }
    if (!payload && syncAdapter() && syncAdapter().buildSyncPayload) {
      const quote = opts.quote || getActiveQuote();
      const equipmentItems = equipmentDb() && equipmentDb().getDemoItems ? equipmentDb().getDemoItems().slice(0, 5) : [];
      const supplierRows = suppliers() && suppliers().buildFromEquipmentItems ? suppliers().buildFromEquipmentItems(equipmentItems) : [];
      const itemRows = quoteItems() && quoteItems().buildQuoteItems ? quoteItems().buildQuoteItems(quote).rows : [];
      payload = syncAdapter().buildSyncPayload({ quote, quote_items: itemRows, equipment_items: equipmentItems, suppliers: supplierRows }, { workspaceId: cfg.workspaceId });
    }
    return {
      type: 'feg-stage-pro-server-test-write-quote-request',
      version: HARNESS_VERSION,
      is_test: true,
      dry_run: cfg.serverTestDryRun !== false,
      test_workspace_slug: cfg.testWorkspaceSlug,
      backend_sync_payload: payload || { rows: {} }
    };
  }



  function buildQuoteDryRunPayload(config) {
    const cfg = getRuntimeConfig(config);
    if (quoteBackendPack() && quoteBackendPack().buildQuoteEdgeDryRunRequest) {
      return quoteBackendPack().buildQuoteEdgeDryRunRequest({ config: cfg });
    }
    const payload = syncConsole() && syncConsole().buildSeedSyncPayload
      ? syncConsole().buildSeedSyncPayload({ config: cfg, quote: getActiveQuote(), includeEquipment: false, includeSuppliers: false })
      : (syncAdapter() && syncAdapter().buildSyncPayload ? syncAdapter().buildSyncPayload({ quote: getActiveQuote(), quote_items: [] }, { workspaceId: cfg.workspaceId }) : { rows: {} });
    return {
      type: 'feg-stage-pro-quote-edge-dry-run-request',
      version: HARNESS_VERSION,
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      quote_sync_payload: payload,
      safety: { remote_write_executed: false, no_stock_movements: true, no_reservations: true }
    };
  }


  function buildQuoteControlledWritePayload(config) {
    const cfg = getRuntimeConfig(config);
    if (quoteBackendPack() && quoteBackendPack().buildQuoteControlledWriteExecutionRequest) {
      return quoteBackendPack().buildQuoteControlledWriteExecutionRequest({ config: cfg });
    }
    return {
      type: 'feg-stage-pro-quote-controlled-write-execution-request',
      version: HARNESS_VERSION,
      dry_run: false,
      confirm_phrase: 'WRITE QUOTE',
      workspace_slug: cfg.workspaceId,
      quote_sync_payload: buildQuoteDryRunPayload(cfg).quote_sync_payload || { rows: {} },
      safety: { edge_only: true, no_stock_movements: true, no_reservations: true }
    };
  }

  function buildEquipmentDryRunPayload(config) {
    const cfg = getRuntimeConfig(config);
    if (backendPack() && backendPack().buildEquipmentEdgeDryRunRequest) {
      return backendPack().buildEquipmentEdgeDryRunRequest({ config: cfg });
    }
    const payload = equipmentQueue() && equipmentQueue().buildEquipmentSyncPayload
      ? equipmentQueue().buildEquipmentSyncPayload({ workspaceId: cfg.workspaceId })
      : { type: 'feg-stage-pro-backend-sync-payload', workspace_id: cfg.workspaceId, rows: { equipment_items: [], suppliers: [] } };
    return {
      type: 'feg-stage-pro-equipment-edge-dry-run-request',
      version: HARNESS_VERSION,
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      equipment_sync_payload: payload
    };
  }

  function buildCleanupPayload(config) {
    const cfg = getRuntimeConfig(config);
    return {
      type: 'feg-stage-pro-test-cleanup-request',
      version: HARNESS_VERSION,
      is_test: true,
      test_workspace_slug: cfg.testWorkspaceSlug,
      selectors: { workspace_slug: cfg.testWorkspaceSlug, meta_is_test: true }
    };
  }

  function buildRlsCheckPayload(config) {
    const cfg = getRuntimeConfig(config);
    return {
      type: 'feg-stage-pro-rls-check-request',
      version: HARNESS_VERSION,
      is_test: true,
      test_workspace_slug: cfg.testWorkspaceSlug,
      checks: ['workspace_isolation', 'viewer_no_prices', 'technician_no_clients', 'warehouse_inventory_access']
    };
  }

  function normalizeStepResult(step, response, body, error) {
    const ok = !error && Boolean(response && response.ok);
    return {
      step,
      ok,
      status: response && typeof response.status === 'number' ? response.status : 0,
      error: error ? String(error && error.message || error) : '',
      body: body == null ? null : clone(body),
      at: nowIso()
    };
  }

  async function callEndpoint(step, config, testKey, body, fetcher) {
    const endpoint = getEndpoint(config, step);
    const fn = fetcher || GLOBAL.fetch;
    if (!endpoint) return normalizeStepResult(step, { ok: false, status: 0 }, null, new Error('Functions base URL is empty'));
    if (typeof fn !== 'function') return normalizeStepResult(step, { ok: false, status: 0 }, null, new Error('fetch is not available'));
    try {
      const method = step === 'health' ? 'GET' : 'POST';
      const response = await fn(endpoint, { method, headers: buildHeaders(testKey), body: method === 'GET' ? undefined : safeJson(body || {}) });
      let parsed = null;
      try { parsed = typeof response.json === 'function' ? await response.json() : null; }
      catch (_) { parsed = typeof response.text === 'function' ? await response.text() : null; }
      return normalizeStepResult(step, response, parsed, null);
    } catch (err) {
      return normalizeStepResult(step, { ok: false, status: 0 }, null, err);
    }
  }

  function buildStaticTestPlan(config, testKey) {
    const cfg = getRuntimeConfig(config);
    const readiness = buildHarnessReadiness(cfg, testKey);
    const steps = [
      { key: 'health', label: 'Backend health', endpoint: getEndpoint(cfg, 'health'), method: 'GET', requires_test_key: false },
      { key: 'seed', label: 'Seed test workspace', endpoint: getEndpoint(cfg, 'seed'), method: 'POST', requires_test_key: true, payload: buildTestWorkspacePayload(cfg) },
      { key: 'writeQuote', label: 'Dry write test quote', endpoint: getEndpoint(cfg, 'writeQuote'), method: 'POST', requires_test_key: true, payload: buildTestQuotePayload({ config: cfg }) },
      { key: 'quoteDryRun', label: 'Dry-run clients/quotes Edge payload', endpoint: getEndpoint(cfg, 'quoteDryRun'), method: 'POST', requires_test_key: true, payload: buildQuoteDryRunPayload(cfg) },
      { key: 'quoteControlledWrite', label: 'Quote controlled write template only', endpoint: getEndpoint(cfg, 'quoteControlledWrite'), method: 'POST', requires_test_key: true, payload: buildQuoteControlledWritePayload(cfg), manual_only: true, note: 'Excluded from the default full flow; requires WRITE QUOTE and Edge env flag.' },
      { key: 'equipmentDryRun', label: 'Dry-run equipment Edge payload', endpoint: getEndpoint(cfg, 'equipmentDryRun'), method: 'POST', requires_test_key: true, payload: buildEquipmentDryRunPayload(cfg) },
      { key: 'rlsCheck', label: 'RLS smoke check', endpoint: getEndpoint(cfg, 'rlsCheck'), method: 'POST', requires_test_key: true, payload: buildRlsCheckPayload(cfg) },
      { key: 'cleanup', label: 'Cleanup test workspace', endpoint: getEndpoint(cfg, 'cleanup'), method: 'POST', requires_test_key: true, payload: buildCleanupPayload(cfg) }
    ];
    return {
      type: 'feg-stage-pro-server-test-plan',
      version: HARNESS_VERSION,
      generated_at: nowIso(),
      readiness,
      steps,
      safety: [
        'Test key is sent only in x-feg-test-key header and is never stored in localStorage.',
        'All test data must be marked is_test=true or placed in the configured test workspace.',
        'Cleanup is part of the standard test flow.',
        'Production data is not touched by harness functions.'
      ]
    };
  }

  async function runServerTestPlan(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const testKey = toText(opts.testKey);
    const started = nowIso();
    const readiness = buildHarnessReadiness(cfg, testKey);
    const results = [];
    const steps = opts.steps || ['health', 'seed', 'writeQuote', 'quoteDryRun', 'equipmentDryRun', 'rlsCheck', 'cleanup'];
    const payloads = {
      health: null,
      seed: buildTestWorkspacePayload(cfg),
      writeQuote: buildTestQuotePayload({ config: cfg, quote: opts.quote }),
      quoteDryRun: buildQuoteDryRunPayload(cfg),
      equipmentDryRun: buildEquipmentDryRunPayload(cfg),
      rlsCheck: buildRlsCheckPayload(cfg),
      cleanup: buildCleanupPayload(cfg)
    };
    for (const step of steps) {
      // eslint-disable-next-line no-await-in-loop
      const result = await callEndpoint(step, cfg, testKey, payloads[step], opts.fetcher);
      results.push(result);
      if (!result.ok && opts.stopOnError === true) break;
    }
    const failed = results.filter(row => !row.ok);
    const passed = results.filter(row => row.ok);
    return {
      type: 'feg-stage-pro-server-test-report',
      version: HARNESS_VERSION,
      generated_at: nowIso(),
      started_at: started,
      completed_at: nowIso(),
      ok: failed.length === 0 && readiness.ready,
      readiness,
      passed: passed.length,
      failed: failed.length,
      results,
      cleanup_ran: results.some(row => row.step === 'cleanup'),
      warnings: readiness.warnings.concat(failed.length ? [`Failed steps: ${failed.map(row => row.step).join(', ')}`] : [])
    };
  }

  function reportToText(report) {
    const data = report || {};
    const lines = [];
    lines.push('FEG Stage PRO — Server Test Harness');
    lines.push(`Version: ${data.version || HARNESS_VERSION}`);
    lines.push(`Status: ${data.ok ? 'OK' : 'CHECK'}`);
    if (data.readiness) {
      lines.push(`Functions: ${data.readiness.functions_base_url_present ? 'configured' : 'missing'}`);
      lines.push(`Test key: ${data.readiness.test_key_present ? data.readiness.test_key_masked : 'missing'}`);
    }
    (data.results || []).forEach(row => lines.push(`${row.ok ? '✓' : '!'} ${row.step}: HTTP ${row.status}${row.error ? ` — ${row.error}` : ''}`));
    if (data.cleanup_ran === false) lines.push('Warning: cleanup did not run.');
    (data.warnings || []).forEach(item => lines.push(`Warning: ${item}`));
    return lines.join('\n');
  }

  function saveReport(report, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    const existing = JSON.parse(store.getItem(STORAGE_KEY) || '[]');
    existing.unshift({ id: `server-test-${Date.now()}`, at: nowIso(), report: clone(report) });
    store.setItem(STORAGE_KEY, safeJson(existing.slice(0, 20)));
    return true;
  }

  function downloadFile(name, content, mime) {
    if (!GLOBAL.document) return;
    const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  function renderServerTestHarness(container, options) {
    if (!container) return null;
    const opts = options || {};
    const root = GLOBAL.document.createElement('div');
    root.className = 'v4-card v4-server-test-harness';
    const state = { testKey: '', readiness: buildHarnessReadiness(opts.config, ''), report: null, busy: false };
    container.innerHTML = '';
    container.appendChild(root);

    function render() {
      const cfg = getRuntimeConfig(opts.config);
      const plan = buildStaticTestPlan(cfg, state.testKey);
      root.innerHTML = `
        <div class="v4-kicker">Server Test Harness</div>
        <h3>Проверка сервера без admin-регистрации</h3>
        <p class="v4-muted">Health → test seed → dry write → quote dry-run → equipment remote dry-run → RLS check → cleanup. Test key вводится вручную и не сохраняется.</p>
        <div class="v4-grid-3">
          <div class="v4-mini-stat"><span>Functions</span><strong>${escapeHtml(cfg.functionsBaseUrl || 'не задано')}</strong></div>
          <div class="v4-mini-stat"><span>Workspace</span><strong>${escapeHtml(cfg.testWorkspaceSlug)}</strong></div>
          <div class="v4-mini-stat"><span>Dry-run</span><strong>${cfg.serverTestDryRun !== false ? 'ON' : 'OFF'}</strong></div>
        </div>
        <div class="v4-field-grid v4-sync-key-grid">
          <label>FEG_SERVER_TEST_KEY<input type="password" data-server-test-key autocomplete="off" placeholder="Ввести на время проверки"></label>
          <label>Functions base URL<input type="text" value="${escapeHtml(cfg.functionsBaseUrl || '')}" readonly></label>
        </div>
        <div class="v4-sync-check-grid">${(state.readiness.checks || []).map(renderCheck).join('')}</div>
        <div class="v4-doc-actions v4-sync-actions">
          <button type="button" class="btn-secondary" data-server-test-action="refresh">Обновить readiness</button>
          <button type="button" class="btn-primary" data-server-test-action="run-all" ${state.busy ? 'disabled' : ''}>Запустить полный test-flow</button>
          <button type="button" class="btn-secondary" data-server-test-action="health" ${state.busy ? 'disabled' : ''}>Только health</button>
          <button type="button" class="btn-secondary" data-server-test-action="quoteDryRun" ${state.busy ? 'disabled' : ''}>Только quote dry-run</button>
          <button type="button" class="btn-secondary" data-server-test-action="equipmentDryRun" ${state.busy ? 'disabled' : ''}>Только equipment dry-run</button>
          <button type="button" class="btn-secondary" data-server-test-action="cleanup" ${state.busy ? 'disabled' : ''}>Cleanup</button>
          <button type="button" class="btn-secondary" data-server-test-action="download-plan">Скачать plan JSON</button>
          <button type="button" class="btn-secondary" data-server-test-action="download-report" ${state.report ? '' : 'disabled'}>Скачать report JSON</button>
        </div>
        ${state.report ? renderReport(state.report) : '<p class="v4-muted">Отчёт появится после запуска проверки.</p>'}
        <details class="v4-json-details"><summary>Test plan JSON</summary><pre>${escapeHtml(safeJson(plan))}</pre></details>
      `;
      const input = root.querySelector('[data-server-test-key]');
      if (input) {
        input.value = state.testKey;
        input.addEventListener('input', () => { state.testKey = input.value; state.readiness = buildHarnessReadiness(opts.config, state.testKey); });
      }
      root.querySelectorAll('[data-server-test-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-server-test-action'))));
    }

    async function handleAction(action) {
      state.readiness = buildHarnessReadiness(opts.config, state.testKey);
      if (action === 'refresh') { render(); return; }
      if (action === 'download-plan') { downloadFile('feg_server_test_plan.json', safeJson(buildStaticTestPlan(opts.config, state.testKey))); return; }
      if (action === 'download-report' && state.report) { downloadFile('feg_server_test_report.json', safeJson(state.report)); return; }
      if (['run-all', 'health', 'quoteDryRun', 'equipmentDryRun', 'cleanup'].includes(action)) {
        state.busy = true; render();
        const steps = action === 'run-all' ? ['health', 'seed', 'writeQuote', 'quoteDryRun', 'equipmentDryRun', 'rlsCheck', 'cleanup'] : [action];
        state.report = await runServerTestPlan({ config: opts.config, testKey: state.testKey, steps, fetcher: opts.fetcher });
        saveReport(state.report, opts.storage);
        state.busy = false; render();
      }
    }

    render();
    return root;
  }

  function renderCheck(check) {
    const cls = check.ok ? 'ok' : check.severity === 'error' ? 'bad' : 'warn';
    return `<div class="v4-sync-check ${cls}"><span>${check.ok ? '✓' : '!'}</span><b>${escapeHtml(check.label)}</b><small>${escapeHtml(check.severity || '')}</small></div>`;
  }

  function renderReport(report) {
    const rows = report.results || [];
    return `<div class="v4-sync-report ${report.ok ? 'ok' : 'warn'}">
      <h4>Server test report · ${report.ok ? 'OK' : 'CHECK'}</h4>
      <div class="v4-table-wrap"><table class="v4-table v4-table--sync"><thead><tr><th>Step</th><th>Status</th><th>HTTP</th><th>Error</th></tr></thead><tbody>
        ${rows.map(row => `<tr><td>${escapeHtml(row.step)}</td><td>${row.ok ? '✓ OK' : '! CHECK'}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.error || '')}</td></tr>`).join('') || '<tr><td colspan="4">Нет результатов</td></tr>'}
      </tbody></table></div>
      <details class="v4-json-details"><summary>Report JSON</summary><pre>${escapeHtml(safeJson(report))}</pre></details>
    </div>`;
  }

  ROOT.ServerTestHarness = {
    HARNESS_VERSION,
    ENDPOINTS,
    getRuntimeConfig,
    maskKey,
    getEndpoint,
    buildHarnessReadiness,
    buildTestWorkspacePayload,
    buildTestQuotePayload,
    buildQuoteDryRunPayload,
    buildEquipmentDryRunPayload,
    buildCleanupPayload,
    buildRlsCheckPayload,
    buildStaticTestPlan,
    callEndpoint,
    runServerTestPlan,
    reportToText,
    saveReport,
    renderServerTestHarness
  };
})();
