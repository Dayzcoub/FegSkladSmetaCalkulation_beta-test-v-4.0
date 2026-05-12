(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const BACKEND_PACK_VERSION = '3.13.1';
  const MIGRATION_FILE = 'supabase/migrations/202605120002_v4_backend_sync_hardening.sql';
  const QUOTE_MIGRATION_FILE = 'supabase/migrations/202605120003_quote_backend_sync_dry_run.sql';
  const QUOTE_DRY_RUN_FUNCTION = 'quote-sync-dry-run';
  const QUOTE_CONTROLLED_WRITE_FUNCTION = 'quote-controlled-write';
  const DRY_RUN_FUNCTION = 'equipment-sync-dry-run';
  const CONTROLLED_WRITE_FUNCTION = 'equipment-controlled-write';
  const REMOTE_DRY_RUN_STORAGE_KEY = 'fegV4EquipmentRemoteDryRunReports';
  const REMOTE_DRY_RUN_BASELINE_KEY = 'fegV4EquipmentRemoteDryRunBaseline';
  const EQUIPMENT_WRITE_APPROVAL_KEY = 'fegV4EquipmentWriteApprovalPackage';
  const CONTROLLED_WRITE_RESULT_STORAGE_KEY = 'fegV4EquipmentControlledWriteReports';
  const POST_WRITE_VERIFICATION_STORAGE_KEY = 'fegV4EquipmentPostWriteVerificationReports';
  const EQUIPMENT_SYNC_AUDIT_STORAGE_KEY = 'fegV4EquipmentSyncAuditSnapshots';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function adapter() { return ROOT.BackendSyncAdapter || null; }
  function equipmentQueue() { return ROOT.EquipmentServerSyncQueue || null; }
  function syncConsole() { return ROOT.SupabaseSyncConsole || null; }

  function getRuntimeConfig(input) {
    const base = adapter() && adapter().getRuntimeConfig ? adapter().getRuntimeConfig(input || GLOBAL.FEG_APP_CONFIG || {}) : (input || GLOBAL.FEG_APP_CONFIG || {});
    const supabaseUrl = toText(base.supabaseUrl || base.supabase_url || '');
    return Object.assign({}, base, {
      workspaceId: toText(base.workspaceId || base.workspace_id || 'main') || 'main',
      functionsBaseUrl: toText(base.functionsBaseUrl || base.functions_base_url || (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : '')),
      equipmentRemoteWriteFunction: toText(base.equipmentRemoteWriteFunction || CONTROLLED_WRITE_FUNCTION) || CONTROLLED_WRITE_FUNCTION,
      equipmentDryRunFunction: toText(base.equipmentDryRunFunction || DRY_RUN_FUNCTION) || DRY_RUN_FUNCTION,
      quoteDryRunFunction: toText(base.quoteDryRunFunction || QUOTE_DRY_RUN_FUNCTION) || QUOTE_DRY_RUN_FUNCTION,
      quoteControlledWriteFunction: toText(base.quoteControlledWriteFunction || QUOTE_CONTROLLED_WRITE_FUNCTION) || QUOTE_CONTROLLED_WRITE_FUNCTION
    });
  }

  function endpointUrl(config, fnName) {
    const cfg = getRuntimeConfig(config);
    const base = toText(cfg.functionsBaseUrl);
    if (!base) return '';
    return `${base.replace(/\/+$/, '')}/${fnName}`;
  }

  function buildMigrationInventory() {
    return [
      { key: 'legacy_security', file: 'supabase/migrations/202605110001_security_hardening.sql', purpose: 'legacy projects owner/RLS hardening', status: 'existing' },
      { key: 'v4_schema_draft', file: 'supabase/migrations/202605120001_v4_schema_draft.sql', purpose: 'v4 tables, base RLS and indexes', status: 'existing' },
      { key: 'v4_backend_sync_hardening', file: MIGRATION_FILE, purpose: 'local_id compatibility, backend_sync_runs ledger, equipment write helpers', status: 'existing' },
      { key: 'v4_quote_backend_sync_dry_run', file: QUOTE_MIGRATION_FILE, purpose: 'clients/quotes local_id compatibility and read-only dry-run helpers', status: 'existing' },
      { key: 'v4_quote_controlled_write_runner', file: 'supabase/migrations/202605120004_quote_controlled_write_runner.sql', purpose: 'quote controlled write upsert keys and ledger compatibility', status: 'new' }
    ];
  }

  function buildFunctionInventory(config) {
    const cfg = getRuntimeConfig(config);
    return [
      { key: 'backend_health', slug: 'backend-health', endpoint: endpointUrl(cfg, 'backend-health'), safety: 'read-only health' },
      { key: 'equipment_dry_run', slug: cfg.equipmentDryRunFunction, endpoint: endpointUrl(cfg, cfg.equipmentDryRunFunction), safety: 'test-key protected, validates payload, no writes' },
      { key: 'equipment_controlled_write', slug: cfg.equipmentRemoteWriteFunction, endpoint: endpointUrl(cfg, cfg.equipmentRemoteWriteFunction), safety: 'test-key + phrase + dryRun=false + env flag + staged plan' },
      { key: 'quote_dry_run', slug: cfg.quoteDryRunFunction, endpoint: endpointUrl(cfg, cfg.quoteDryRunFunction), safety: 'test-key protected, clients/quotes diff, no writes, no stock movements' },
      { key: 'quote_controlled_write', slug: cfg.quoteControlledWriteFunction, endpoint: endpointUrl(cfg, cfg.quoteControlledWriteFunction), safety: 'test-key + WRITE QUOTE + approval checksum + env flag, no stock movements/reservations' },
      { key: 'test_seed_workspace', slug: 'test-seed-workspace', endpoint: endpointUrl(cfg, 'test-seed-workspace'), safety: 'test workspace only' },
      { key: 'test_cleanup', slug: 'test-cleanup', endpoint: endpointUrl(cfg, 'test-cleanup'), safety: 'test workspace cleanup' }
    ];
  }

  function buildEquipmentEdgeDryRunRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const q = equipmentQueue();
    const payload = q && q.buildEquipmentSyncPayload ? q.buildEquipmentSyncPayload({ workspaceId: cfg.workspaceId, storage: opts.storage }) : { type: 'feg-stage-pro-backend-sync-payload', workspace_id: cfg.workspaceId, rows: { suppliers: [], equipment_items: [] } };
    const dryRun = q && q.buildEquipmentWriteDryRun ? q.buildEquipmentWriteDryRun({ workspaceId: cfg.workspaceId, storage: opts.storage }) : null;
    return {
      type: 'feg-stage-pro-equipment-edge-dry-run-request',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      dry_run: true,
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      equipment_sync_payload: payload,
      client_validation: dryRun ? { safe_for_first_write: dryRun.safe_for_first_write, blockers: dryRun.blockers || [], warnings: dryRun.warnings || [] } : null,
      note: 'Send this to the equipment-sync-dry-run Edge Function. It must not write data.'
    };
  }

  function buildEquipmentControlledWriteRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const q = equipmentQueue();
    const plan = q && q.buildEquipmentControlledWritePlan ? q.buildEquipmentControlledWritePlan(Object.assign({}, opts, { role: opts.role || 'admin', config: cfg })) : null;
    const payload = q && q.buildEquipmentSyncPayload ? q.buildEquipmentSyncPayload({ workspaceId: cfg.workspaceId, storage: opts.storage }) : { rows: { suppliers: [], equipment_items: [] } };
    return {
      type: 'feg-stage-pro-equipment-controlled-write-request',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      dry_run: false,
      confirm_phrase: 'WRITE EQUIPMENT',
      workspace_slug: cfg.workspaceId,
      workspace_id: cfg.workspaceId,
      controlled_write_plan: plan,
      equipment_sync_payload: payload,
      safety: {
        requires_edge_env: 'FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true',
        requires_service_role: true,
        direct_browser_upsert: false,
        static_build_remote_write: false
      },
      note: 'This is a request template only. Current static app does not execute remote upsert by itself.'
    };
  }

  function buildRolloutChecklist(config) {
    const cfg = getRuntimeConfig(config);
    const connection = syncConsole() && syncConsole().buildConnectionReport ? syncConsole().buildConnectionReport(cfg) : null;
    const migrationInventory = buildMigrationInventory();
    const functionInventory = buildFunctionInventory(cfg);
    const equipmentRequest = buildEquipmentEdgeDryRunRequest({ config: cfg });
    const rows = equipmentRequest.equipment_sync_payload && equipmentRequest.equipment_sync_payload.rows || {};
    const equipmentCount = Array.isArray(rows.equipment_items) ? rows.equipment_items.length : 0;
    const checks = [
      { key: 'migration_pack', label: 'Backend hardening migration exists', ok: true, severity: 'ok' },
      { key: 'edge_dry_run', label: 'equipment-sync-dry-run Edge Function skeleton exists', ok: true, severity: 'ok' },
      { key: 'edge_write_gate', label: 'equipment-controlled-write Edge Function stays behind env/phrase gate', ok: true, severity: 'ok' },
      { key: 'functions_base', label: 'Functions base URL configured', ok: Boolean(cfg.functionsBaseUrl), severity: cfg.functionsBaseUrl ? 'ok' : 'warning' },
      { key: 'remote_disabled_by_default', label: 'Static client does not perform direct remote upsert', ok: true, severity: 'ok' },
      { key: 'equipment_payload', label: 'Equipment payload has rows', ok: equipmentCount > 0, severity: equipmentCount > 0 ? 'ok' : 'warning' }
    ];
    if (connection) {
      checks.push({ key: 'supabase_connection', label: 'Supabase config checked by Sync Console', ok: Boolean(connection.supabase_url_present), severity: connection.supabase_url_present ? 'ok' : 'warning' });
    }
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label);
    const warnings = checks.filter(row => !row.ok && row.severity !== 'error').map(row => row.label);
    return {
      type: 'feg-stage-pro-backend-rollout-checklist',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_edge_dry_run',
      blockers,
      warnings,
      checks,
      migration_inventory: migrationInventory,
      function_inventory: functionInventory,
      equipment_rows: equipmentCount,
      connection
    };
  }


  function buildEquipmentRemoteDryRunReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const endpoint = endpointUrl(cfg, cfg.equipmentDryRunFunction);
    const request = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    const rows = request.equipment_sync_payload && request.equipment_sync_payload.rows || {};
    const equipmentRows = Array.isArray(rows.equipment_items) ? rows.equipment_items : [];
    const supplierRows = Array.isArray(rows.suppliers) ? rows.suppliers : [];
    const clientBlockers = request.client_validation && Array.isArray(request.client_validation.blockers) ? request.client_validation.blockers : [];
    const clientWarnings = request.client_validation && Array.isArray(request.client_validation.warnings) ? request.client_validation.warnings : [];
    const checks = [
      { key: 'endpoint', label: 'equipment-sync-dry-run endpoint настроен', ok: Boolean(endpoint), severity: endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key введён вручную', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'payload_rows', label: 'Payload содержит equipment_items', ok: equipmentRows.length > 0, severity: equipmentRows.length > 0 ? 'ok' : 'error' },
      { key: 'client_blockers', label: 'Локальный dry-run без blockers', ok: clientBlockers.length === 0, severity: clientBlockers.length === 0 ? 'ok' : 'error' },
      { key: 'dry_run_only', label: 'Remote request остаётся dry_run=true', ok: request.dry_run === true, severity: 'ok' },
      { key: 'no_write_function', label: 'Используется dry-run Edge Function, не controlled write', ok: cfg.equipmentDryRunFunction !== cfg.equipmentRemoteWriteFunction, severity: cfg.equipmentDryRunFunction !== cfg.equipmentRemoteWriteFunction ? 'ok' : 'error' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label);
    const warnings = checks.filter(row => !row.ok && row.severity !== 'error').map(row => row.label).concat(clientWarnings.slice(0, 20));
    return {
      type: 'feg-stage-pro-equipment-remote-dry-run-readiness',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_remote_dry_run',
      ready: blockers.length === 0,
      endpoint,
      workspace_slug: cfg.workspaceId,
      test_key_present: Boolean(testKey),
      row_counts: { equipment_items: equipmentRows.length, suppliers: supplierRows.length },
      checks,
      blockers,
      warnings,
      safety: {
        dry_run: true,
        remote_write_executed: false,
        test_key_not_stored: true,
        function: cfg.equipmentDryRunFunction
      }
    };
  }

  function saveRemoteDryRunReport(report, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    try {
      const existing = JSON.parse(store.getItem(REMOTE_DRY_RUN_STORAGE_KEY) || '[]');
      const rows = Array.isArray(existing) ? existing : [];
      rows.unshift({ id: `equipment-remote-dry-run-${Date.now()}`, at: nowIso(), report: clone(report) });
      store.setItem(REMOTE_DRY_RUN_STORAGE_KEY, safeJson(rows.slice(0, 20)));
      return true;
    } catch (_) { return false; }
  }

  function readRemoteDryRunReports(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(REMOTE_DRY_RUN_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function readRemoteDryRunBaseline(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return null;
    try {
      const parsed = JSON.parse(store.getItem(REMOTE_DRY_RUN_BASELINE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }

  function saveRemoteDryRunBaseline(report, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    const source = report || ((readRemoteDryRunReports(store)[0] || {}).report);
    if (!source) return false;
    try {
      store.setItem(REMOTE_DRY_RUN_BASELINE_KEY, safeJson({ id: `equipment-remote-baseline-${Date.now()}`, at: nowIso(), report: clone(source) }));
      return true;
    } catch (_) { return false; }
  }

  function uniqueList(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(toText).filter(Boolean).filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }


  function stableStringify(value) {
    if (value == null) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  function checksum(value) {
    const input = stableStringify(value);
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < input.length; i += 1) {
      const code = input.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ code, 2246822519) >>> 0;
    }
    return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  }

  function checksumRow(row) {
    const source = row && typeof row === 'object' ? row : {};
    const skip = new Set(['raw_payload', 'created_at', 'updated_at', 'synced_at']);
    const clean = {};
    Object.keys(source).sort().forEach(key => {
      if (skip.has(key)) return;
      clean[key] = source[key];
    });
    return clean;
  }

  function checksumRows(list, primaryKey) {
    return (Array.isArray(list) ? list : []).map(checksumRow).sort((a, b) => toText(a[primaryKey] || a.code || a.local_id || a.id || a.name).localeCompare(toText(b[primaryKey] || b.code || b.local_id || b.id || b.name)));
  }

  function equipmentPayloadChecksum(payload) {
    const rows = payload && payload.rows ? payload.rows : (payload && payload.equipment_sync_payload && payload.equipment_sync_payload.rows) || {};
    return checksum({ suppliers: checksumRows(rows.suppliers || [], 'name'), equipment_items: checksumRows(rows.equipment_items || [], 'code') });
  }

  function readEquipmentWriteApprovalPackage(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return null;
    try {
      const parsed = JSON.parse(store.getItem(EQUIPMENT_WRITE_APPROVAL_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }

  function saveEquipmentWriteApprovalPackage(approval, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store || !approval) return false;
    try {
      store.setItem(EQUIPMENT_WRITE_APPROVAL_KEY, safeJson(approval));
      return true;
    } catch (_) { return false; }
  }

  function clearEquipmentWriteApprovalPackage(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    try { store.removeItem(EQUIPMENT_WRITE_APPROVAL_KEY); return true; } catch (_) { return false; }
  }

  function buildEquipmentWriteApprovalPackage(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const reports = readRemoteDryRunReports(opts.storage);
    const remoteReport = opts.remoteReport || ((reports[0] || {}).report) || null;
    const remoteSummary = summarizeRemoteDryRunReport(remoteReport);
    const dryRunRequest = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    const currentPayload = dryRunRequest.equipment_sync_payload || { rows: { suppliers: [], equipment_items: [] } };
    const currentPayloadChecksum = equipmentPayloadChecksum(currentPayload);
    const remotePayloadChecksum = remoteReport && remoteReport.request_summary && remoteReport.request_summary.payload_checksum || '';
    const preflight = buildControlledWritePreflight(Object.assign({}, opts, { remoteReport, ignoreApproval: true }));
    const checks = [
      { key: 'remote_report', label: 'Есть последний remote dry-run report', ok: Boolean(remoteReport) },
      { key: 'remote_summary_clean', label: 'Remote dry-run без blockers', ok: Boolean(remoteReport) && remoteSummary.blockers.length === 0 },
      { key: 'remote_diff_ready', label: 'Remote diff построен', ok: Boolean(remoteSummary.remote_diff && remoteSummary.remote_diff.ok) },
      { key: 'payload_has_rows', label: 'Payload содержит equipment_items', ok: Boolean(((currentPayload.rows && currentPayload.rows.equipment_items) || []).length > 0) },
      { key: 'payload_checksum_present', label: 'Remote report содержит payload checksum', ok: Boolean(remotePayloadChecksum) },
      { key: 'payload_unchanged', label: 'Текущий payload совпадает с dry-run payload', ok: Boolean(remotePayloadChecksum) && remotePayloadChecksum === currentPayloadChecksum },
      { key: 'preflight_no_blockers', label: 'Preflight без blockers до approval gate', ok: Boolean(preflight && preflight.blockers && preflight.blockers.length === 0) }
    ];
    const blockers = checks.filter(row => !row.ok).map(row => row.label).concat(remoteSummary.blockers || []);
    const warnings = uniqueList((remoteSummary.warnings || []).concat(preflight.warnings || [])).slice(0, 80);
    const ok = uniqueList(blockers).length === 0;
    return {
      type: 'feg-stage-pro-equipment-write-approval-package',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: ok ? 'approved_payload_locked' : 'blocked_approval_not_ready',
      approved: ok,
      remote_write_executed: false,
      static_build_remote_write: false,
      workspace_slug: cfg.workspaceId,
      payload_checksum: currentPayloadChecksum,
      remote_payload_checksum: remotePayloadChecksum,
      request_summary: summarizeRequest(dryRunRequest),
      remote_summary: remoteSummary,
      preflight_summary: {
        status: preflight.status,
        blockers: preflight.blockers || [],
        warnings: preflight.warnings || []
      },
      checks,
      blockers: uniqueList(blockers),
      warnings,
      approval_note: 'Approval locks the payload that passed remote dry-run. If equipment payload changes, approval must be rebuilt after a new remote dry-run.'
    };
  }

  function compareApprovalWithCurrentPayload(approval, options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const dryRunRequest = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    const currentPayloadChecksum = equipmentPayloadChecksum(dryRunRequest.equipment_sync_payload || {});
    const approvedChecksum = approval && approval.payload_checksum || '';
    const ok = Boolean(approval && approval.approved && approvedChecksum && approvedChecksum === currentPayloadChecksum);
    return {
      type: 'feg-stage-pro-equipment-write-approval-check',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      ok,
      status: ok ? 'approval_matches_current_payload' : 'approval_missing_or_payload_changed',
      approved_at: approval && approval.generated_at || '',
      approved_checksum: approvedChecksum,
      current_payload_checksum: currentPayloadChecksum,
      blockers: ok ? [] : ['Approved payload is missing or does not match the current equipment payload']
    };
  }

  function buildApprovedControlledWriteRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const approval = opts.approval || readEquipmentWriteApprovalPackage(opts.storage) || null;
    const approvalCheck = compareApprovalWithCurrentPayload(approval, Object.assign({}, opts, { config: cfg }));
    const request = buildEquipmentControlledWriteRequest(Object.assign({}, opts, { config: cfg }));
    request.approval_package = approval;
    request.approval_check = approvalCheck;
    request.controlled_write_plan = Object.assign({}, request.controlled_write_plan || {}, {
      approval_required: true,
      approval_ok: approvalCheck.ok,
      approval_checksum: approval && approval.payload_checksum || ''
    });
    if (!approvalCheck.ok) {
      request.dry_run = true;
      request.confirm_phrase = 'APPROVAL REQUIRED';
      request.note = 'Approval is missing or stale. Run remote dry-run, create approval package, then rebuild this template.';
    }
    return request;
  }


  function buildEquipmentControlledWriteExecutionRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const confirm = toText(opts.writeConfirmPhrase || opts.confirmPhrase || '');
    const request = buildApprovedControlledWriteRequest(Object.assign({}, opts, {
      config: cfg,
      role: opts.role || 'admin',
      dryRun: false,
      enableRemoteWrite: confirm === 'WRITE EQUIPMENT',
      allowRemoteWrite: confirm === 'WRITE EQUIPMENT',
      confirmPhrase: confirm
    }));
    request.execution_gate = {
      requires_manual_click: true,
      requires_test_key: true,
      requires_typed_phrase: 'WRITE EQUIPMENT',
      typed_phrase_ok: confirm === 'WRITE EQUIPMENT',
      endpoint: endpointUrl(cfg, cfg.equipmentRemoteWriteFunction),
      direct_browser_upsert: false,
      edge_function_write_only: true,
      server_env_required: 'FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true'
    };
    if (confirm !== 'WRITE EQUIPMENT') {
      request.dry_run = true;
      request.confirm_phrase = 'WRITE PHRASE REQUIRED';
      request.execution_gate.blocked = true;
    }
    return request;
  }

  function buildEquipmentControlledWriteReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const endpoint = endpointUrl(cfg, cfg.equipmentRemoteWriteFunction);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const confirm = toText(opts.writeConfirmPhrase || opts.confirmPhrase || '');
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const approvalCheck = compareApprovalWithCurrentPayload(approval, Object.assign({}, opts, { config: cfg }));
    const preflight = buildControlledWritePreflight(Object.assign({}, opts, { config: cfg }));
    const request = buildEquipmentControlledWriteExecutionRequest(Object.assign({}, opts, { config: cfg, writeConfirmPhrase: confirm }));
    const plan = request.controlled_write_plan || {};
    const rows = request.equipment_sync_payload && request.equipment_sync_payload.rows || {};
    const equipmentRows = Array.isArray(rows.equipment_items) ? rows.equipment_items : [];
    const checks = [
      { key: 'endpoint', label: 'equipment-controlled-write endpoint настроен', ok: Boolean(endpoint), severity: endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key введён вручную', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'confirm_phrase', label: 'Введена контрольная фраза WRITE EQUIPMENT', ok: confirm === 'WRITE EQUIPMENT', severity: confirm === 'WRITE EQUIPMENT' ? 'ok' : 'error' },
      { key: 'approval_ok', label: 'Approval package совпадает с текущим payload', ok: approvalCheck.ok, severity: approvalCheck.ok ? 'ok' : 'error' },
      { key: 'preflight_ok', label: 'Controlled write preflight без blockers', ok: Boolean(preflight.ok), severity: preflight.ok ? 'ok' : 'error' },
      { key: 'plan_armed', label: 'Локальный controlled write plan armed', ok: plan.remote_write_armed === true, severity: plan.remote_write_armed === true ? 'ok' : 'error' },
      { key: 'dry_run_false', label: 'Request dry_run=false только для approved execution', ok: request.dry_run === false, severity: request.dry_run === false ? 'ok' : 'error' },
      { key: 'payload_rows', label: 'Payload содержит equipment_items', ok: equipmentRows.length > 0, severity: equipmentRows.length > 0 ? 'ok' : 'error' },
      { key: 'not_dry_run_function', label: 'Используется controlled write Edge Function, не dry-run', ok: cfg.equipmentRemoteWriteFunction !== cfg.equipmentDryRunFunction, severity: cfg.equipmentRemoteWriteFunction !== cfg.equipmentDryRunFunction ? 'ok' : 'error' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label)
      .concat(plan && Array.isArray(plan.blockers) ? plan.blockers.map(item => `Plan gate: ${item}`) : [])
      .concat(approvalCheck && Array.isArray(approvalCheck.blockers) ? approvalCheck.blockers : [])
      .concat(preflight && Array.isArray(preflight.blockers) ? preflight.blockers : []);
    const cleanBlockers = uniqueList(blockers);
    return {
      type: 'feg-stage-pro-equipment-controlled-write-readiness',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: cleanBlockers.length ? 'blocked' : 'ready_to_call_controlled_write_edge',
      ready: cleanBlockers.length === 0,
      endpoint,
      workspace_slug: cfg.workspaceId,
      test_key_present: Boolean(testKey),
      approval_check: approvalCheck,
      preflight_status: preflight.status,
      row_counts: { equipment_items: equipmentRows.length, suppliers: Array.isArray(rows.suppliers) ? rows.suppliers.length : 0 },
      checks,
      blockers: cleanBlockers,
      warnings: uniqueList((preflight.warnings || []).concat(plan && Array.isArray(plan.warnings) ? plan.warnings : [])).slice(0, 80),
      safety: {
        direct_browser_upsert: false,
        edge_function: cfg.equipmentRemoteWriteFunction,
        server_env_required: 'FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true',
        approval_checksum: approval && approval.payload_checksum || ''
      },
      request_summary: summarizeRequest(request)
    };
  }

  function saveControlledWriteReport(report, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    try {
      const existing = JSON.parse(store.getItem(CONTROLLED_WRITE_RESULT_STORAGE_KEY) || '[]');
      const rows = Array.isArray(existing) ? existing : [];
      rows.unshift({ id: `equipment-controlled-write-${Date.now()}`, at: nowIso(), report: clone(report) });
      store.setItem(CONTROLLED_WRITE_RESULT_STORAGE_KEY, safeJson(rows.slice(0, 20)));
      return true;
    } catch (_) { return false; }
  }

  function readControlledWriteReports(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(CONTROLLED_WRITE_RESULT_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  async function runEquipmentControlledWriteEdge(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const confirm = toText(opts.writeConfirmPhrase || opts.confirmPhrase || '');
    const fetcher = opts.fetcher || GLOBAL.fetch;
    const endpoint = endpointUrl(cfg, cfg.equipmentRemoteWriteFunction);
    const readiness = buildEquipmentControlledWriteReadiness(Object.assign({}, opts, { config: cfg, testKey, writeConfirmPhrase: confirm }));
    const request = buildEquipmentControlledWriteExecutionRequest(Object.assign({}, opts, { config: cfg, writeConfirmPhrase: confirm }));
    const base = {
      type: 'feg-stage-pro-equipment-controlled-write-edge-report',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      endpoint,
      dry_run: request.dry_run !== false,
      remote_write_executed: false,
      readiness,
      request_summary: summarizeRequest(request)
    };
    if (!endpoint) return Object.assign(base, { ok: false, status: 'blocked_no_endpoint', http_status: 0, error: 'equipment-controlled-write endpoint is empty' });
    if (!testKey) return Object.assign(base, { ok: false, status: 'blocked_no_test_key', http_status: 0, error: 'x-feg-test-key is required for controlled write' });
    if (confirm !== 'WRITE EQUIPMENT') return Object.assign(base, { ok: false, status: 'blocked_confirm_phrase_required', http_status: 0, error: 'Type WRITE EQUIPMENT before controlled write' });
    if (!readiness.ready) return Object.assign(base, { ok: false, status: 'blocked_by_local_readiness', http_status: 0, error: 'Local controlled write readiness has blockers', blockers: readiness.blockers });
    if (typeof fetcher !== 'function') return Object.assign(base, { ok: false, status: 'blocked_no_fetch', http_status: 0, error: 'fetch is not available' });
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: safeJson(request)
      });
      let body = null;
      try { body = typeof response.json === 'function' ? await response.json() : null; }
      catch (_) { body = typeof response.text === 'function' ? await response.text() : null; }
      const ok = Boolean(response.ok) && !(body && body.ok === false);
      const report = Object.assign(base, {
        ok,
        status: ok ? 'controlled_write_edge_ok' : 'controlled_write_edge_check',
        http_status: response.status,
        body: clone(body),
        remote_write_executed: Boolean(body && body.remote_write_executed === true)
      });
      saveControlledWriteReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = Object.assign(base, { ok: false, status: 'controlled_write_edge_failed', http_status: 0, error: String(err && err.message || err), remote_write_executed: false });
      saveControlledWriteReport(report, opts.storage);
      return report;
    }
  }

  function reportBody(report) {
    if (!report) return {};
    if (report.body && typeof report.body === 'object') return report.body;
    return report;
  }

  function reportRemoteDiff(report) {
    const body = reportBody(report);
    return body.remote_diff || (report && report.remote_diff) || null;
  }

  function countValue(obj, key) {
    const value = obj && obj[key];
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function summarizeRemoteDryRunReport(report) {
    const body = reportBody(report);
    const diff = reportRemoteDiff(report);
    const counts = body.counts || (report && report.counts) || {};
    const diffCounts = diff && diff.status_counts || {};
    const blockers = [];
    const warnings = [];
    if (!report) blockers.push('Remote dry-run report is missing');
    if (report && report.ok === false) blockers.push(`Remote dry-run status is not OK: ${report.status || 'unknown'}`);
    if (body && body.ok === false) blockers.push('Edge dry-run validation returned ok=false');
    if (report && report.remote_write_executed) blockers.push('Remote write was executed during dry-run report');
    if (body && body.remote_write_executed) blockers.push('Edge body reports remote_write_executed=true');
    if (Array.isArray(report && report.blockers)) blockers.push(...report.blockers);
    if (Array.isArray(body.blockers)) blockers.push(...body.blockers);
    if (report && report.readiness && Array.isArray(report.readiness.blockers)) blockers.push(...report.readiness.blockers);
    if (Array.isArray(report && report.warnings)) warnings.push(...report.warnings);
    if (Array.isArray(body.warnings)) warnings.push(...body.warnings);
    if (report && report.readiness && Array.isArray(report.readiness.warnings)) warnings.push(...report.readiness.warnings);
    if (!diff) warnings.push('remote_diff is missing: Edge Function did not compare against remote equipment_items');
    if (diff && diff.ok === false) blockers.push(`remote_diff failed: ${diff.error || diff.status || 'unknown error'}`);
    if (countValue(diffCounts, 'remote_only') > 0) warnings.push(`Remote has ${countValue(diffCounts, 'remote_only')} rows not present in local payload`);
    if (countValue(diffCounts, 'update') > 0) warnings.push(`Remote diff has ${countValue(diffCounts, 'update')} updates`);
    const checks = [
      { key: 'report_present', label: 'Есть remote dry-run report', ok: Boolean(report) },
      { key: 'http_ok', label: 'HTTP/Edge dry-run OK', ok: Boolean(report && report.ok !== false && body.ok !== false) },
      { key: 'no_remote_write', label: 'remote_write_executed=false', ok: !Boolean((report && report.remote_write_executed) || body.remote_write_executed) },
      { key: 'no_blockers', label: 'Нет blockers в dry-run/body', ok: uniqueList(blockers).length === 0 },
      { key: 'remote_diff_ready', label: 'remote_diff построен', ok: Boolean(diff && diff.ok !== false) }
    ];
    const cleanBlockers = uniqueList(blockers);
    const cleanWarnings = uniqueList(warnings).slice(0, 60);
    const status = cleanBlockers.length ? 'blocked' : cleanWarnings.length ? 'ready_with_warnings' : 'ready_for_controlled_write_preflight';
    return {
      type: 'feg-stage-pro-equipment-remote-dry-run-summary',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status,
      ok: cleanBlockers.length === 0,
      ready_for_controlled_write_preflight: cleanBlockers.length === 0,
      http_status: report && report.http_status || 0,
      report_status: report && report.status || body.status || '',
      remote_write_executed: Boolean((report && report.remote_write_executed) || body.remote_write_executed),
      workspace: body.workspace || null,
      counts,
      remote_diff: diff ? {
        status: diff.status || '',
        ok: diff.ok !== false,
        baseline_rows: diff.baseline_rows || 0,
        local_rows: diff.local_rows || 0,
        status_counts: Object.assign({ insert: 0, update: 0, unchanged: 0, remote_only: 0 }, diffCounts),
        sample_size: Array.isArray(diff.operations_sample) ? diff.operations_sample.length : 0
      } : null,
      blockers: cleanBlockers,
      warnings: cleanWarnings,
      checks
    };
  }

  function compareRemoteDryRunReports(currentReport, baselineRecord) {
    const current = summarizeRemoteDryRunReport(currentReport);
    const baseline = summarizeRemoteDryRunReport(baselineRecord && baselineRecord.report ? baselineRecord.report : baselineRecord);
    const currentCounts = current.remote_diff && current.remote_diff.status_counts || {};
    const baselineCounts = baseline.remote_diff && baseline.remote_diff.status_counts || {};
    const keys = ['insert', 'update', 'unchanged', 'remote_only'];
    const delta = keys.reduce((acc, key) => {
      acc[key] = countValue(currentCounts, key) - countValue(baselineCounts, key);
      return acc;
    }, {});
    return {
      type: 'feg-stage-pro-equipment-remote-dry-run-comparison',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      ok: Boolean(currentReport && baselineRecord),
      status: currentReport && baselineRecord ? 'comparison_ready' : 'comparison_missing_report_or_baseline',
      current_status: current.status,
      baseline_status: baseline.status,
      delta_status_counts: delta,
      current,
      baseline
    };
  }

  function buildRemoteDryRunHistoryReport(options) {
    const opts = options || {};
    const reports = readRemoteDryRunReports(opts.storage);
    const baseline = readRemoteDryRunBaseline(opts.storage);
    const summaries = reports.map((row, index) => Object.assign({ id: row.id || `remote-report-${index}`, at: row.at || '' }, summarizeRemoteDryRunReport(row.report || row)));
    const latestRecord = reports[0] || null;
    const latest = summaries[0] || summarizeRemoteDryRunReport(null);
    return {
      type: 'feg-stage-pro-equipment-remote-dry-run-history',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: latest.status,
      latest,
      reports_count: reports.length,
      reports: summaries.slice(0, 20),
      baseline_present: Boolean(baseline),
      baseline_at: baseline && baseline.at || '',
      comparison: latestRecord && baseline ? compareRemoteDryRunReports(latestRecord.report || latestRecord, baseline) : null,
      note: 'Local report history only. It stores dry-run reports, not server secrets.'
    };
  }

  function buildControlledWritePreflight(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const reports = readRemoteDryRunReports(opts.storage);
    const remoteReport = opts.remoteReport || ((reports[0] || {}).report) || null;
    const remoteSummary = summarizeRemoteDryRunReport(remoteReport);
    const q = equipmentQueue();
    const plan = q && q.buildEquipmentControlledWritePlan ? q.buildEquipmentControlledWritePlan(Object.assign({}, opts, { config: cfg, role: opts.role || 'admin' })) : null;
    const missingWriteGates = plan && Array.isArray(plan.blockers) ? plan.blockers : [];
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const approvalCheck = opts.ignoreApproval === true
      ? { ok: true, status: 'approval_gate_skipped_for_package_build', blockers: [] }
      : compareApprovalWithCurrentPayload(approval, Object.assign({}, opts, { config: cfg }));
    const checks = [
      { key: 'remote_report', label: 'Есть последний remote dry-run report', ok: Boolean(remoteReport) },
      { key: 'remote_report_clean', label: 'Remote dry-run без blockers', ok: remoteSummary.blockers.length === 0 },
      { key: 'remote_diff_ready', label: 'Remote diff готов', ok: Boolean(remoteSummary.remote_diff && remoteSummary.remote_diff.ok) },
      { key: 'approval_locked', label: 'Payload approval package зафиксирован', ok: approvalCheck.ok },
      { key: 'local_controlled_plan', label: 'Локальный controlled write plan построен', ok: Boolean(plan) },
      { key: 'static_write_disabled', label: 'Static build не выполняет write напрямую', ok: true }
    ];
    const blockers = checks.filter(row => !row.ok).map(row => row.label).concat(remoteSummary.blockers || []).concat(approvalCheck.blockers || []);
    const warnings = (remoteSummary.warnings || []).concat(missingWriteGates.map(item => `Write gate still closed: ${item}`));
    const cleanBlockers = uniqueList(blockers);
    const status = cleanBlockers.length ? 'blocked' : 'preflight_ready_static_write_disabled';
    return {
      type: 'feg-stage-pro-equipment-controlled-write-preflight',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status,
      ok: cleanBlockers.length === 0,
      remote_write_executed: false,
      static_build_remote_write: false,
      remote_summary: remoteSummary,
      approval_check: approvalCheck,
      approval_package_present: Boolean(approval),
      controlled_write_plan: plan,
      controlled_write_template_summary: summarizeRequest(buildApprovedControlledWriteRequest(Object.assign({}, opts, { config: cfg, approval: approval || null }))),
      checks,
      blockers: cleanBlockers,
      warnings: uniqueList(warnings).slice(0, 80),
      next_gate: 'Use this as a preflight only. Real write still requires Edge Function env flag, approval package and explicit WRITE EQUIPMENT confirmation.'
    };
  }


  async function runEquipmentEdgeDryRun(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const fetcher = opts.fetcher || GLOBAL.fetch;
    const endpoint = endpointUrl(cfg, cfg.equipmentDryRunFunction);
    const readiness = buildEquipmentRemoteDryRunReadiness(Object.assign({}, opts, { config: cfg, testKey }));
    const request = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    const base = {
      type: 'feg-stage-pro-equipment-remote-dry-run-report',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      endpoint,
      dry_run: true,
      remote_write_executed: false,
      readiness,
      request_summary: summarizeRequest(request)
    };
    if (!endpoint) return Object.assign(base, { ok: false, status: 'blocked_no_endpoint', http_status: 0, error: 'equipment-sync-dry-run endpoint is empty' });
    if (!testKey) return Object.assign(base, { ok: false, status: 'blocked_no_test_key', http_status: 0, error: 'x-feg-test-key is required for remote dry-run' });
    if (typeof fetcher !== 'function') return Object.assign(base, { ok: false, status: 'blocked_no_fetch', http_status: 0, error: 'fetch is not available' });
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: safeJson(request)
      });
      let body = null;
      try { body = typeof response.json === 'function' ? await response.json() : null; }
      catch (_) { body = typeof response.text === 'function' ? await response.text() : null; }
      const ok = Boolean(response.ok) && !(body && body.ok === false);
      const report = Object.assign(base, {
        ok,
        status: ok ? 'remote_dry_run_ok' : 'remote_dry_run_check',
        http_status: response.status,
        body: clone(body),
        remote_write_executed: false
      });
      saveRemoteDryRunReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = Object.assign(base, { ok: false, status: 'remote_dry_run_failed', http_status: 0, error: String(err && err.message || err), remote_write_executed: false });
      saveRemoteDryRunReport(report, opts.storage);
      return report;
    }
  }


  function latestControlledWriteReport(storage) {
    const reports = readControlledWriteReports(storage);
    return (reports[0] && reports[0].report) || null;
  }

  function summarizeControlledWriteReport(report) {
    const body = reportBody(report);
    const executed = Boolean((report && report.remote_write_executed) || body.remote_write_executed);
    const ok = Boolean(report && report.ok !== false && (body.ok !== false) && executed);
    const blockers = [];
    if (!report) blockers.push('Controlled write report is missing');
    if (report && report.ok === false) blockers.push(`Controlled write report is not OK: ${report.status || 'unknown'}`);
    if (body && body.ok === false) blockers.push(`Controlled write Edge body is not OK: ${body.status || 'unknown'}`);
    if (!executed) blockers.push('Controlled write has not executed remote write');
    if (Array.isArray(report && report.blockers)) blockers.push(...report.blockers);
    if (Array.isArray(body.blockers)) blockers.push(...body.blockers);
    return {
      type: 'feg-stage-pro-equipment-controlled-write-summary',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      ok: ok && blockers.length === 0,
      status: ok && blockers.length === 0 ? 'controlled_write_executed' : 'controlled_write_not_confirmed',
      remote_write_executed: executed,
      http_status: report && report.http_status || 0,
      payload_checksum: body.payload_checksum || (report && report.request_summary && report.request_summary.payload_checksum) || '',
      counts: body.counts || {},
      blockers: uniqueList(blockers),
      warnings: uniqueList((Array.isArray(report && report.warnings) ? report.warnings : []).concat(Array.isArray(body.warnings) ? body.warnings : []))
    };
  }

  function buildEquipmentPostWriteVerificationRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const controlledReport = opts.controlledWriteReport || latestControlledWriteReport(opts.storage);
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const dryRun = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    dryRun.type = 'feg-stage-pro-equipment-post-write-verification-request';
    dryRun.version = BACKEND_PACK_VERSION;
    dryRun.verify_after_controlled_write = true;
    dryRun.post_write_verification = {
      expected_zero_operations: ['insert', 'update', 'remote_only'],
      expected_payload_checksum: equipmentPayloadChecksum(dryRun.equipment_sync_payload || {}),
      approval_checksum: approval && approval.payload_checksum || '',
      controlled_write_status: controlledReport && controlledReport.status || '',
      controlled_write_executed: Boolean(controlledReport && controlledReport.remote_write_executed === true),
      note: 'Read-only verification: calls equipment-sync-dry-run after controlled write and expects no pending insert/update/remote_only operations.'
    };
    return dryRun;
  }

  function buildEquipmentPostWriteVerificationReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const endpoint = endpointUrl(cfg, cfg.equipmentDryRunFunction);
    const controlledSummary = summarizeControlledWriteReport(opts.controlledWriteReport || latestControlledWriteReport(opts.storage));
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const approvalCheck = compareApprovalWithCurrentPayload(approval, Object.assign({}, opts, { config: cfg }));
    const request = buildEquipmentPostWriteVerificationRequest(Object.assign({}, opts, { config: cfg }));
    const rows = request.equipment_sync_payload && request.equipment_sync_payload.rows || {};
    const equipmentRows = Array.isArray(rows.equipment_items) ? rows.equipment_items : [];
    const checks = [
      { key: 'endpoint', label: 'equipment-sync-dry-run endpoint настроен для verification', ok: Boolean(endpoint), severity: endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key введён вручную', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'controlled_write_executed', label: 'Есть успешный controlled write report', ok: controlledSummary.ok, severity: controlledSummary.ok ? 'ok' : 'error' },
      { key: 'approval_ok', label: 'Approval package всё ещё совпадает с payload', ok: approvalCheck.ok, severity: approvalCheck.ok ? 'ok' : 'error' },
      { key: 'payload_rows', label: 'Payload содержит equipment_items', ok: equipmentRows.length > 0, severity: equipmentRows.length > 0 ? 'ok' : 'error' },
      { key: 'read_only', label: 'Verification вызывает только dry-run Edge Function', ok: request.dry_run === true && cfg.equipmentDryRunFunction !== cfg.equipmentRemoteWriteFunction, severity: 'ok' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label)
      .concat(controlledSummary.blockers || [])
      .concat(approvalCheck.blockers || []);
    const cleanBlockers = uniqueList(blockers);
    return {
      type: 'feg-stage-pro-equipment-post-write-verification-readiness',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: cleanBlockers.length ? 'blocked' : 'ready_for_post_write_verification',
      ready: cleanBlockers.length === 0,
      endpoint,
      workspace_slug: cfg.workspaceId,
      test_key_present: Boolean(testKey),
      controlled_write_summary: controlledSummary,
      approval_check: approvalCheck,
      row_counts: { equipment_items: equipmentRows.length, suppliers: Array.isArray(rows.suppliers) ? rows.suppliers.length : 0 },
      checks,
      blockers: cleanBlockers,
      warnings: uniqueList((controlledSummary.warnings || []).concat(approvalCheck.warnings || [])).slice(0, 80),
      safety: {
        dry_run: true,
        remote_write_executed: false,
        function: cfg.equipmentDryRunFunction,
        direct_browser_upsert: false
      },
      request_summary: summarizeRequest(request)
    };
  }

  function summarizePostWriteVerificationReport(report) {
    const drySummary = summarizeRemoteDryRunReport(report);
    const diffCounts = drySummary.remote_diff && drySummary.remote_diff.status_counts || {};
    const insert = countValue(diffCounts, 'insert');
    const update = countValue(diffCounts, 'update');
    const remoteOnly = countValue(diffCounts, 'remote_only');
    const unchanged = countValue(diffCounts, 'unchanged');
    const blockers = [];
    if (!drySummary.ok) blockers.push(...(drySummary.blockers || []));
    if (!drySummary.remote_diff) blockers.push('remote_diff is missing');
    if (insert > 0) blockers.push(`Post-write verification still has pending inserts: ${insert}`);
    if (update > 0) blockers.push(`Post-write verification still has pending updates: ${update}`);
    if (remoteOnly > 0) blockers.push(`Post-write verification still has remote_only rows: ${remoteOnly}`);
    if (unchanged <= 0) blockers.push('No unchanged rows detected after write');
    const cleanBlockers = uniqueList(blockers);
    return {
      type: 'feg-stage-pro-equipment-post-write-verification-summary',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      ok: cleanBlockers.length === 0,
      verified: cleanBlockers.length === 0,
      status: cleanBlockers.length ? 'post_write_verification_failed' : 'post_write_verified',
      http_status: report && report.http_status || 0,
      remote_write_executed: Boolean(report && report.remote_write_executed),
      status_counts: Object.assign({ insert: 0, update: 0, unchanged: 0, remote_only: 0 }, diffCounts),
      remote_diff: drySummary.remote_diff,
      blockers: cleanBlockers,
      warnings: uniqueList(drySummary.warnings || []).slice(0, 80)
    };
  }

  function savePostWriteVerificationReport(report, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    try {
      const existing = JSON.parse(store.getItem(POST_WRITE_VERIFICATION_STORAGE_KEY) || '[]');
      const rows = Array.isArray(existing) ? existing : [];
      rows.unshift({ id: `equipment-post-write-verify-${Date.now()}`, at: nowIso(), report: clone(report) });
      store.setItem(POST_WRITE_VERIFICATION_STORAGE_KEY, safeJson(rows.slice(0, 20)));
      return true;
    } catch (_) { return false; }
  }

  function readPostWriteVerificationReports(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(POST_WRITE_VERIFICATION_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }


  function latestReportFromHistory(rows) {
    const list = Array.isArray(rows) ? rows : [];
    return (list[0] && list[0].report) || null;
  }

  function buildEquipmentSyncRollbackHints(options) {
    const opts = options || {};
    const dryRunReports = readRemoteDryRunReports(opts.storage);
    const writeReports = readControlledWriteReports(opts.storage);
    const verifyReports = readPostWriteVerificationReports(opts.storage);
    const latestDryRun = opts.remoteReport || latestReportFromHistory(dryRunReports);
    const latestWrite = opts.controlledWriteReport || latestReportFromHistory(writeReports);
    const latestVerify = opts.postWriteVerificationReport || latestReportFromHistory(verifyReports);
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const verifySummary = summarizePostWriteVerificationReport(latestVerify);
    const drySummary = summarizeRemoteDryRunReport(latestDryRun);
    const writeSummary = summarizeControlledWriteReport(latestWrite);
    const diff = (verifySummary && verifySummary.remote_diff) || (drySummary && drySummary.remote_diff) || null;
    const operations = Array.isArray(diff && diff.operations_sample) ? diff.operations_sample : [];
    const counts = Object.assign({ insert: 0, update: 0, unchanged: 0, remote_only: 0 }, diff && diff.status_counts || {});
    const hints = [];
    if (!latestWrite) hints.push({ severity: 'info', action: 'no_write_to_rollback', label: 'Controlled write ещё не запускался — rollback не нужен.' });
    if (latestWrite && !writeSummary.remote_write_executed) hints.push({ severity: 'warning', action: 'write_not_executed', label: 'Последний controlled write не выполнил remote write; откат не требуется, но нужно проверить blockers отчёта.' });
    if (latestVerify && verifySummary.verified) hints.push({ severity: 'ok', action: 'no_rollback_needed', label: 'Post-write verification подтверждён: insert/update/remote_only = 0.' });
    if (countValue(counts, 'insert') > 0) hints.push({ severity: 'warning', action: 'rerun_controlled_write_or_fix_missing_remote_rows', label: `После write всё ещё не хватает remote rows: ${countValue(counts, 'insert')}. Не удалять локальную базу; сначала повторить dry-run и проверить workspace.` });
    if (countValue(counts, 'update') > 0) hints.push({ severity: 'warning', action: 'reapply_approved_payload_or_review_changed_fields', label: `После write есть pending updates: ${countValue(counts, 'update')}. Проверить changed_fields и повторить controlled write только с тем же approval/checksum.` });
    if (countValue(counts, 'remote_only') > 0) hints.push({ severity: 'manual', action: 'manual_review_remote_only_rows', label: `На сервере есть remote_only rows: ${countValue(counts, 'remote_only')}. Автоматически не удаляем; экспортировать список и решить: оставить, деактивировать или удалить вручную через админский SQL.` });
    const remoteOnlySample = operations.filter(row => row && row.operation === 'remote_only').slice(0, 20);
    const updateSample = operations.filter(row => row && row.operation === 'update').slice(0, 20);
    return {
      type: 'feg-stage-pro-equipment-sync-rollback-hints',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status: latestVerify && verifySummary.verified ? 'rollback_not_needed_verified' : hints.some(row => row.severity === 'manual' || row.severity === 'warning') ? 'manual_review_required' : 'no_remote_write_confirmed',
      remote_write_executed: writeSummary.remote_write_executed,
      post_write_verified: Boolean(latestVerify && verifySummary.verified),
      payload_checksum: (approval && approval.payload_checksum) || (writeSummary && writeSummary.payload_checksum) || (drySummary && drySummary.payload_checksum) || '',
      status_counts: counts,
      hints,
      samples: {
        remote_only: remoteOnlySample,
        updates: updateSample
      },
      safety: {
        automatic_rollback: false,
        automatic_delete: false,
        stock_movements_changed: false,
        direct_browser_upsert: false
      },
      next_step: latestVerify && verifySummary.verified ? 'Archive audit package with verification report.' : 'Run/read remote dry-run and post-write verification, then resolve warnings manually before any cleanup.'
    };
  }

  function buildEquipmentSyncAuditTrail(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const dryRunReports = readRemoteDryRunReports(opts.storage);
    const writeReports = readControlledWriteReports(opts.storage);
    const verifyReports = readPostWriteVerificationReports(opts.storage);
    const latestDryRun = opts.remoteReport || latestReportFromHistory(dryRunReports);
    const latestWrite = opts.controlledWriteReport || latestReportFromHistory(writeReports);
    const latestVerify = opts.postWriteVerificationReport || latestReportFromHistory(verifyReports);
    const approval = readEquipmentWriteApprovalPackage(opts.storage);
    const approvalCheck = compareApprovalWithCurrentPayload(approval, Object.assign({}, opts, { config: cfg }));
    const drySummary = summarizeRemoteDryRunReport(latestDryRun);
    const writeSummary = summarizeControlledWriteReport(latestWrite);
    const verifySummary = latestVerify ? summarizePostWriteVerificationReport(latestVerify) : null;
    const rollbackHints = buildEquipmentSyncRollbackHints(Object.assign({}, opts, { remoteReport: latestDryRun, controlledWriteReport: latestWrite, postWriteVerificationReport: latestVerify }));
    const timeline = [
      { step: 'remote_dry_run', at: dryRunReports[0] && dryRunReports[0].at || '', status: drySummary.status || 'missing', ok: Boolean(latestDryRun && drySummary.ok), checksum: drySummary.payload_checksum || (latestDryRun && latestDryRun.request_summary && latestDryRun.request_summary.payload_checksum) || '' },
      { step: 'approval_package', at: approval && approval.generated_at || '', status: approvalCheck.status || 'missing', ok: approvalCheck.ok, checksum: approval && approval.payload_checksum || '' },
      { step: 'controlled_write', at: writeReports[0] && writeReports[0].at || '', status: writeSummary.status || 'missing', ok: writeSummary.ok, checksum: writeSummary.payload_checksum || '' },
      { step: 'post_write_verification', at: verifyReports[0] && verifyReports[0].at || '', status: verifySummary ? verifySummary.status : 'missing', ok: Boolean(verifySummary && verifySummary.verified), checksum: verifySummary && verifySummary.payload_checksum || '' }
    ];
    const blockers = [];
    if (!latestDryRun) blockers.push('Remote dry-run report is missing');
    if (!approvalCheck.ok) blockers.push('Approval package is missing or stale');
    if (!writeSummary.remote_write_executed) blockers.push('Controlled write execution is not confirmed');
    if (!verifySummary || !verifySummary.verified) blockers.push('Post-write verification is missing or not verified');
    const warnings = [];
    if (dryRunReports.length > 1) warnings.push(`Remote dry-run history has ${dryRunReports.length} reports; keep the approved one archived.`);
    if (writeReports.length > 1) warnings.push(`Controlled write history has ${writeReports.length} reports; verify the latest successful write.`);
    const status = blockers.length === 0 ? 'equipment_sync_verified_and_audited' : writeSummary.remote_write_executed ? 'write_executed_waiting_for_verified_audit' : latestDryRun ? 'pre_write_audit_incomplete' : 'audit_not_started';
    return {
      type: 'feg-stage-pro-equipment-sync-audit-trail',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      status,
      ok: blockers.length === 0,
      workspace_slug: cfg.workspaceId,
      timeline,
      blockers: uniqueList(blockers),
      warnings: uniqueList(warnings.concat(rollbackHints.hints.filter(row => row.severity === 'warning' || row.severity === 'manual').map(row => row.label))).slice(0, 80),
      latest: {
        remote_dry_run: drySummary,
        approval_check: approvalCheck,
        controlled_write: writeSummary,
        post_write_verification: verifySummary,
        rollback_hints: rollbackHints
      },
      history_counts: {
        remote_dry_run: dryRunReports.length,
        controlled_write: writeReports.length,
        post_write_verification: verifyReports.length
      },
      safety: {
        direct_browser_upsert: false,
        automatic_rollback: false,
        automatic_stock_movement: false
      }
    };
  }

  function saveEquipmentSyncAuditSnapshot(snapshot, storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return false;
    try {
      const existing = JSON.parse(store.getItem(EQUIPMENT_SYNC_AUDIT_STORAGE_KEY) || '[]');
      const rows = Array.isArray(existing) ? existing : [];
      rows.unshift({ id: `equipment-sync-audit-${Date.now()}`, at: nowIso(), snapshot: clone(snapshot || buildEquipmentSyncAuditTrail({ storage })) });
      store.setItem(EQUIPMENT_SYNC_AUDIT_STORAGE_KEY, safeJson(rows.slice(0, 20)));
      return true;
    } catch (_) { return false; }
  }

  function readEquipmentSyncAuditSnapshots(storage) {
    const store = storage || (GLOBAL.localStorage || null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(EQUIPMENT_SYNC_AUDIT_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  async function runEquipmentPostWriteVerification(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const fetcher = opts.fetcher || GLOBAL.fetch;
    const endpoint = endpointUrl(cfg, cfg.equipmentDryRunFunction);
    const readiness = buildEquipmentPostWriteVerificationReadiness(Object.assign({}, opts, { config: cfg, testKey }));
    const request = buildEquipmentPostWriteVerificationRequest(Object.assign({}, opts, { config: cfg }));
    const base = {
      type: 'feg-stage-pro-equipment-post-write-verification-report',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      endpoint,
      dry_run: true,
      remote_write_executed: false,
      readiness,
      request_summary: summarizeRequest(request)
    };
    if (!endpoint) return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_endpoint', http_status: 0, error: 'equipment-sync-dry-run endpoint is empty' });
    if (!testKey) return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_test_key', http_status: 0, error: 'x-feg-test-key is required for post-write verification' });
    if (!readiness.ready) return Object.assign(base, { ok: false, verified: false, status: 'blocked_by_verification_readiness', http_status: 0, error: 'Post-write verification readiness has blockers', blockers: readiness.blockers });
    if (typeof fetcher !== 'function') return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_fetch', http_status: 0, error: 'fetch is not available' });
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': testKey },
        body: safeJson(request)
      });
      let body = null;
      try { body = typeof response.json === 'function' ? await response.json() : null; }
      catch (_) { body = typeof response.text === 'function' ? await response.text() : null; }
      const raw = Object.assign(base, { ok: Boolean(response.ok) && !(body && body.ok === false), http_status: response.status, body: clone(body), remote_write_executed: false });
      const summary = summarizePostWriteVerificationReport(raw);
      const report = Object.assign(raw, { ok: summary.ok, verified: summary.verified, status: summary.status, verification_summary: summary });
      savePostWriteVerificationReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = Object.assign(base, { ok: false, verified: false, status: 'post_write_verification_failed', http_status: 0, error: String(err && err.message || err), remote_write_executed: false });
      savePostWriteVerificationReport(report, opts.storage);
      return report;
    }
  }

  function buildBackendMigrationPackReport(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config || opts);
    const checklist = buildRolloutChecklist(cfg);
    const dryRunRequest = buildEquipmentEdgeDryRunRequest({ config: cfg, storage: opts.storage });
    const writeRequest = buildEquipmentControlledWriteRequest({ config: cfg, storage: opts.storage, role: opts.role || 'admin' });
    return {
      type: 'feg-stage-pro-supabase-backend-pack-report',
      version: BACKEND_PACK_VERSION,
      generated_at: nowIso(),
      milestone: 'v3.12.7 sync audit and rollback safety',
      mode: 'edge-controlled-write-runner-plus-post-write-verification-sync-audit-no-direct-browser-upsert',
      static_build_remote_write: false,
      edge_controlled_write_runner: true,
      post_write_verification: true,
      sync_audit_trail: true,
      rollback_hints: true,
      migration_file: MIGRATION_FILE,
      dry_run_function: DRY_RUN_FUNCTION,
      controlled_write_function: CONTROLLED_WRITE_FUNCTION,
      checklist,
      dry_run_request_summary: summarizeRequest(dryRunRequest),
      controlled_write_request_summary: summarizeRequest(writeRequest),
      remote_dry_run_readiness: buildEquipmentRemoteDryRunReadiness({ config: cfg, storage: opts.storage, testKey: opts.testKey || opts.serverTestKey || '' }),
      remote_dry_run_history: buildRemoteDryRunHistoryReport({ storage: opts.storage }),
      controlled_write_preflight: buildControlledWritePreflight({ config: cfg, storage: opts.storage, role: opts.role || 'admin' }),
      equipment_write_approval: readEquipmentWriteApprovalPackage(opts.storage) || null,
      controlled_write_readiness: buildEquipmentControlledWriteReadiness({ config: cfg, storage: opts.storage, role: opts.role || 'admin', testKey: opts.testKey || opts.serverTestKey || '', writeConfirmPhrase: opts.writeConfirmPhrase || opts.confirmPhrase || '' }),
      controlled_write_reports: readControlledWriteReports(opts.storage).slice(0, 5),
      post_write_verification_readiness: buildEquipmentPostWriteVerificationReadiness({ config: cfg, storage: opts.storage, testKey: opts.testKey || opts.serverTestKey || '' }),
      post_write_verification_reports: readPostWriteVerificationReports(opts.storage).slice(0, 5),
      sync_audit_report: buildEquipmentSyncAuditTrail({ config: cfg, storage: opts.storage }),
      rollback_hints_report: buildEquipmentSyncRollbackHints({ config: cfg, storage: opts.storage }),
      sync_audit_snapshots: readEquipmentSyncAuditSnapshots(opts.storage).slice(0, 5),
      approval_package_preview: buildEquipmentWriteApprovalPackage({ config: cfg, storage: opts.storage, role: opts.role || 'admin' }),
      next_gate: 'After post-write verification, archive sync audit and rollback hints before considering equipment sync complete.'
    };
  }

  function summarizeRequest(request) {
    const rows = request && request.equipment_sync_payload && request.equipment_sync_payload.rows || {};
    return {
      type: request && request.type || '',
      dry_run: request && request.dry_run !== false,
      workspace_slug: request && request.workspace_slug || '',
      suppliers: Array.isArray(rows.suppliers) ? rows.suppliers.length : 0,
      equipment_items: Array.isArray(rows.equipment_items) ? rows.equipment_items.length : 0,
      payload_checksum: equipmentPayloadChecksum(request && request.equipment_sync_payload || { rows }),
      has_controlled_write_plan: Boolean(request && request.controlled_write_plan),
      has_approval_package: Boolean(request && request.approval_package)
    };
  }

  function reportToText(report) {
    const r = report || buildBackendMigrationPackReport();
    const lines = [];
    lines.push('FEG Stage PRO — Supabase Backend Pack');
    lines.push(`Version: ${r.version || BACKEND_PACK_VERSION}`);
    lines.push(`Milestone: ${r.milestone || ''}`);
    lines.push(`Mode: ${r.mode || ''}`);
    lines.push(`Static remote write: ${r.static_build_remote_write ? 'enabled' : 'disabled'}`);
    lines.push('');
    lines.push('Migrations:');
    (r.checklist && r.checklist.migration_inventory || []).forEach(item => lines.push(`- ${item.file}: ${item.purpose}`));
    lines.push('');
    lines.push('Edge Functions:');
    (r.checklist && r.checklist.function_inventory || []).forEach(item => lines.push(`- ${item.slug}: ${item.safety}`));
    if (r.checklist && r.checklist.warnings && r.checklist.warnings.length) {
      lines.push(''); lines.push('Warnings:'); r.checklist.warnings.forEach(item => lines.push(`- ${item}`));
    }
    lines.push('');
    lines.push(`Next gate: ${r.next_gate || ''}`);
    return lines.join('\n');
  }

  function downloadFile(name, content, mime) {
    if (!GLOBAL.document) return false;
    const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    return true;
  }

  function renderBackendPackConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = { report: buildBackendMigrationPackReport(opts), testKey: '', writeConfirmPhrase: '', remoteReport: null, controlledWriteReport: null, postWriteVerificationReport: null, history: buildRemoteDryRunHistoryReport(opts), preflight: buildControlledWritePreflight(opts), busy: false, writeBusy: false, verifyBusy: false, auditReport: buildEquipmentSyncAuditTrail(opts), rollbackHints: buildEquipmentSyncRollbackHints(opts) };
    function render() {
      const report = state.report;
      const checklist = report.checklist || {};
      state.history = buildRemoteDryRunHistoryReport(opts);
      state.preflight = buildControlledWritePreflight(Object.assign({}, opts, { remoteReport: state.remoteReport || null }));
      const latest = state.history.latest || {};
      const latestDiff = latest.remote_diff || {};
      const latestCounts = latestDiff.status_counts || {};
      const comparison = state.history.comparison || null;
      state.approval = readEquipmentWriteApprovalPackage(opts.storage);
      state.approvalCheck = compareApprovalWithCurrentPayload(state.approval, opts);
      state.writeReadiness = buildEquipmentControlledWriteReadiness(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase }));
      state.postWriteReadiness = buildEquipmentPostWriteVerificationReadiness(Object.assign({}, opts, { testKey: state.testKey, controlledWriteReport: state.controlledWriteReport || null }));
      state.auditReport = buildEquipmentSyncAuditTrail(Object.assign({}, opts, { remoteReport: state.remoteReport || null, controlledWriteReport: state.controlledWriteReport || null, postWriteVerificationReport: state.postWriteVerificationReport || null }));
      state.rollbackHints = buildEquipmentSyncRollbackHints(Object.assign({}, opts, { remoteReport: state.remoteReport || null, controlledWriteReport: state.controlledWriteReport || null, postWriteVerificationReport: state.postWriteVerificationReport || null }));
      root.innerHTML = `
        <div class="v4-card v4-sync-console v4-backend-pack-console">
          <div class="v4-kicker">Backend / Supabase · v3.12.7</div>
          <h3>Supabase backend pack</h3>
          <p class="v4-muted">Миграции, RLS-hardening, remote dry-run history, approval package, controlled write Edge runner, post-write verification и sync audit. Прямой browser upsert по-прежнему запрещён.</p>
          <div class="v4-mini-grid">
            <div class="v4-mini"><span>Status</span><b>${escapeHtml(checklist.status || 'check')}</b></div>
            <div class="v4-mini"><span>Migrations</span><b>${escapeHtml((checklist.migration_inventory || []).length)}</b></div>
            <div class="v4-mini"><span>Functions</span><b>${escapeHtml((checklist.function_inventory || []).length)}</b></div>
            <div class="v4-mini"><span>Equipment rows</span><b>${escapeHtml(checklist.equipment_rows || 0)}</b></div>
            <div class="v4-mini"><span>Remote dry-run</span><b>${escapeHtml((report.remote_dry_run_readiness && report.remote_dry_run_readiness.status) || 'check')}</b></div>
            <div class="v4-mini"><span>Latest report</span><b>${escapeHtml(latest.status || 'none')}</b></div>
            <div class="v4-mini"><span>Diff ins/upd/only</span><b>${escapeHtml(`${latestCounts.insert || 0}/${latestCounts.update || 0}/${latestCounts.remote_only || 0}`)}</b></div>
            <div class="v4-mini"><span>Preflight</span><b>${escapeHtml(state.preflight.status || 'check')}</b></div>
            <div class="v4-mini"><span>Approval</span><b>${escapeHtml(state.approvalCheck.status || 'none')}</b></div>
            <div class="v4-mini"><span>Write runner</span><b>${escapeHtml(state.writeReadiness.status || 'blocked')}</b></div>
            <div class="v4-mini"><span>Post-write verify</span><b>${escapeHtml(state.postWriteReadiness.status || 'blocked')}</b></div>
            <div class="v4-mini"><span>Sync audit</span><b>${escapeHtml(state.auditReport.status || 'audit')}</b></div>
          </div>
          <div class="v4-table-wrap"><table class="v4-table v4-table--sync"><thead><tr><th>Gate</th><th>Status</th><th>Comment</th></tr></thead><tbody>
            ${(checklist.checks || []).map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${row.ok ? 'OK' : row.severity === 'error' ? 'BLOCKED' : 'WARN'}</td><td>${escapeHtml(row.key)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="v4-field-grid v4-sync-key-grid">
            <label>FEG_SERVER_TEST_KEY<input type="password" data-backend-pack-test-key autocomplete="off" placeholder="Ввести только на время remote dry-run"></label>
            <label>Dry-run endpoint<input type="text" value="${escapeHtml(endpointUrl(getRuntimeConfig(opts.config || opts), getRuntimeConfig(opts.config || opts).equipmentDryRunFunction) || '')}" readonly></label>
            <label>Write confirm phrase<input type="text" data-backend-pack-write-confirm autocomplete="off" placeholder="WRITE EQUIPMENT"></label>
          </div>
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-backend-pack="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-backend-pack="copy-text">Копировать план</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-report">Скачать backend pack JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-dry-run-request">Скачать Edge dry-run request</button>
            <button type="button" class="btn-primary" data-backend-pack="run-remote-dry-run" ${state.busy ? 'disabled' : ''}>Запустить remote dry-run</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-remote-report" ${state.remoteReport ? '' : 'disabled'}>Скачать remote report</button>
            <button type="button" class="btn-secondary" data-backend-pack="save-baseline" ${state.remoteReport || state.history.reports_count ? '' : 'disabled'}>Зафиксировать baseline</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-history">Скачать history JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-preflight">Скачать preflight JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="approve-payload" ${state.history.reports_count ? '' : 'disabled'}>Одобрить payload</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-approval" ${state.approval ? '' : 'disabled'}>Скачать approval JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="clear-approval" ${state.approval ? '' : 'disabled'}>Сбросить approval</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-approved-write-template" ${state.approvalCheck.ok ? '' : 'disabled'}>Скачать approved write template</button>
            <button type="button" class="btn-danger" data-backend-pack="run-controlled-write" ${state.writeBusy || !state.writeReadiness.ready ? 'disabled' : ''}>Запустить controlled write Edge</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-write-template">Скачать controlled write template</button>
            <button type="button" class="btn-primary" data-backend-pack="run-post-write-verify" ${state.verifyBusy || !state.postWriteReadiness.ready ? 'disabled' : ''}>Проверить после write</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-post-write-verification" ${state.postWriteVerificationReport ? '' : 'disabled'}>Скачать verification JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-sync-audit">Скачать sync audit JSON</button>
            <button type="button" class="btn-secondary" data-backend-pack="save-sync-audit">Сохранить audit snapshot</button>
            <button type="button" class="btn-secondary" data-backend-pack="download-rollback-hints">Скачать rollback hints JSON</button>
          </div>
          <div class="v4-sync-report ${state.preflight.ok ? 'ok' : 'warn'}">
            <h4>Controlled write preflight · ${escapeHtml(state.preflight.status || 'check')}</h4>
            <div class="v4-muted">Approval: ${escapeHtml(state.approvalCheck.status || 'none')} · checksum: ${escapeHtml((state.approvalCheck.current_payload_checksum || '').slice(0, 16))}</div>
            <div class="v4-muted">History: ${escapeHtml(state.history.reports_count || 0)} · baseline: ${state.history.baseline_present ? 'yes' : 'no'}${comparison ? ` · Δ ins/upd/only: ${escapeHtml(`${comparison.delta_status_counts.insert || 0}/${comparison.delta_status_counts.update || 0}/${comparison.delta_status_counts.remote_only || 0}`)}` : ''}</div>
            <div class="v4-table-wrap"><table class="v4-table v4-table--sync"><thead><tr><th>At</th><th>Status</th><th>HTTP</th><th>Diff</th></tr></thead><tbody>
              ${(state.history.reports || []).slice(0, 5).map(row => `<tr><td>${escapeHtml(row.at || '')}</td><td>${escapeHtml(row.status || '')}</td><td>${escapeHtml(row.http_status || 0)}</td><td>${escapeHtml((((row.remote_diff || {}).status_counts || {}).insert || 0) + '/' + ((((row.remote_diff || {}).status_counts || {}).update || 0)) + '/' + ((((row.remote_diff || {}).status_counts || {}).remote_only || 0)))}</td></tr>`).join('') || '<tr><td colspan="4">Remote dry-run history пока пустая</td></tr>'}
            </tbody></table></div>
            <details class="v4-json-details"><summary>Preflight JSON</summary><pre>${escapeHtml(safeJson(state.preflight))}</pre></details>
          </div>
          <div class="v4-sync-report ${state.writeReadiness.ready ? 'ok' : 'warn'}">
            <h4>Controlled write runner · ${escapeHtml(state.writeReadiness.status || 'blocked')}</h4>
            <div class="v4-muted">Endpoint: ${escapeHtml(state.writeReadiness.endpoint || 'не задан')} · direct browser upsert: no · Edge env required: FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true</div>
            <details class="v4-json-details"><summary>Write readiness JSON</summary><pre>${escapeHtml(safeJson(state.writeReadiness))}</pre></details>
          </div>
          <div class="v4-sync-report ${state.postWriteReadiness.ready ? 'ok' : 'warn'}">
            <h4>Post-write verification · ${escapeHtml(state.postWriteReadiness.status || 'blocked')}</h4>
            <div class="v4-muted">Проверяет сервер через read-only dry-run после controlled write: insert/update/remote_only должны быть 0.</div>
            <details class="v4-json-details"><summary>Post-write readiness JSON</summary><pre>${escapeHtml(safeJson(state.postWriteReadiness))}</pre></details>
          </div>
          ${state.postWriteVerificationReport ? `<div class="v4-sync-report ${state.postWriteVerificationReport.verified ? 'ok' : 'warn'}"><h4>Post-write verification result · ${escapeHtml(state.postWriteVerificationReport.status || '')}</h4><div class="v4-muted">HTTP ${escapeHtml(state.postWriteVerificationReport.http_status || 0)} · verified: ${state.postWriteVerificationReport.verified ? 'true' : 'false'} · remote_write_executed: ${state.postWriteVerificationReport.remote_write_executed ? 'true' : 'false'}</div><details class="v4-json-details"><summary>Post-write verification JSON</summary><pre>${escapeHtml(safeJson(state.postWriteVerificationReport))}</pre></details></div>` : ''}
          ${state.controlledWriteReport ? `<div class="v4-sync-report ${state.controlledWriteReport.ok ? 'ok' : 'warn'}"><h4>Controlled write result · ${escapeHtml(state.controlledWriteReport.status || '')}</h4><div class="v4-muted">HTTP ${escapeHtml(state.controlledWriteReport.http_status || 0)} · remote_write_executed: ${state.controlledWriteReport.remote_write_executed ? 'true' : 'false'}</div><details class="v4-json-details"><summary>Controlled write result JSON</summary><pre>${escapeHtml(safeJson(state.controlledWriteReport))}</pre></details></div>` : ''}
          <div class="v4-sync-report ${state.auditReport.ok ? 'ok' : 'warn'}">
            <h4>Sync audit · ${escapeHtml(state.auditReport.status || 'audit')}</h4>
            <div class="v4-muted">История: dry-run ${escapeHtml(state.auditReport.history_counts.remote_dry_run || 0)} · write ${escapeHtml(state.auditReport.history_counts.controlled_write || 0)} · verify ${escapeHtml(state.auditReport.history_counts.post_write_verification || 0)} · rollback: ${escapeHtml(state.rollbackHints.status || '')}</div>
            <details class="v4-json-details"><summary>Sync audit JSON</summary><pre>${escapeHtml(safeJson(state.auditReport))}</pre></details>
            <details class="v4-json-details"><summary>Rollback hints JSON</summary><pre>${escapeHtml(safeJson(state.rollbackHints))}</pre></details>
          </div>
          ${state.remoteReport ? `<div class="v4-sync-report ${state.remoteReport.ok ? 'ok' : 'warn'}"><h4>Remote equipment dry-run · ${state.remoteReport.ok ? 'OK' : 'CHECK'}</h4><div class="v4-muted">HTTP ${escapeHtml(state.remoteReport.http_status || 0)} · write: ${state.remoteReport.remote_write_executed ? 'executed' : 'not executed'}</div><details class="v4-json-details"><summary>Remote report JSON</summary><pre>${escapeHtml(safeJson(state.remoteReport))}</pre></details></div>` : '<p class="v4-muted">Remote dry-run report появится после запуска. Test key не сохраняется.</p>'}
          <details class="v4-json-details"><summary>Remote dry-run history JSON</summary><pre>${escapeHtml(safeJson(state.history))}</pre></details>
          <details class="v4-json-details"><summary>Backend pack JSON</summary><pre>${escapeHtml(safeJson(report))}</pre></details>
        </div>`;
      const input = root.querySelector('[data-backend-pack-test-key]');
      if (input) { input.value = state.testKey; input.addEventListener('input', () => { state.testKey = input.value; state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); }); }
      const writeInput = root.querySelector('[data-backend-pack-write-confirm]');
      if (writeInput) { writeInput.value = state.writeConfirmPhrase; writeInput.addEventListener('input', () => { state.writeConfirmPhrase = writeInput.value; state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); }); writeInput.addEventListener('change', () => { state.writeConfirmPhrase = writeInput.value; state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); render(); }); }
      root.querySelectorAll('[data-backend-pack]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-backend-pack'))));
    }
    async function handleAction(action) {
      if (action === 'refresh') { state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); state.history = buildRemoteDryRunHistoryReport(opts); state.preflight = buildControlledWritePreflight(opts); render(); return; }
      if (action === 'copy-text' && GLOBAL.navigator && navigator.clipboard) { navigator.clipboard.writeText(reportToText(state.report)).catch(() => {}); return; }
      if (action === 'download-report') return downloadFile('feg_supabase_backend_pack_report.json', safeJson(state.report));
      if (action === 'download-dry-run-request') return downloadFile('feg_equipment_edge_dry_run_request.json', safeJson(buildEquipmentEdgeDryRunRequest(opts)));
      if (action === 'run-remote-dry-run') { state.busy = true; render(); state.remoteReport = await runEquipmentEdgeDryRun(Object.assign({}, opts, { testKey: state.testKey })); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); state.busy = false; render(); return; }
      if (action === 'download-remote-report' && state.remoteReport) return downloadFile('feg_equipment_remote_dry_run_report.json', safeJson(state.remoteReport));
      if (action === 'save-baseline') { saveRemoteDryRunBaseline(state.remoteReport || ((readRemoteDryRunReports(opts.storage)[0] || {}).report), opts.storage); state.history = buildRemoteDryRunHistoryReport(opts); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); render(); return; }
      if (action === 'download-history') return downloadFile('feg_equipment_remote_dry_run_history.json', safeJson(buildRemoteDryRunHistoryReport(opts)));
      if (action === 'download-preflight') return downloadFile('feg_equipment_controlled_write_preflight.json', safeJson(buildControlledWritePreflight(Object.assign({}, opts, { remoteReport: state.remoteReport || null }))));
      if (action === 'approve-payload') { const approval = buildEquipmentWriteApprovalPackage(Object.assign({}, opts, { remoteReport: state.remoteReport || ((readRemoteDryRunReports(opts.storage)[0] || {}).report) || null })); saveEquipmentWriteApprovalPackage(approval, opts.storage); state.approval = approval; state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); render(); return; }
      if (action === 'download-approval') return downloadFile('feg_equipment_write_approval_package.json', safeJson(readEquipmentWriteApprovalPackage(opts.storage) || buildEquipmentWriteApprovalPackage(opts)));
      if (action === 'clear-approval') { clearEquipmentWriteApprovalPackage(opts.storage); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); render(); return; }
      if (action === 'download-approved-write-template') return downloadFile('feg_equipment_approved_controlled_write_request.json', safeJson(buildEquipmentControlledWriteExecutionRequest(Object.assign({}, opts, { writeConfirmPhrase: state.writeConfirmPhrase }))));
      if (action === 'run-controlled-write') { state.writeBusy = true; render(); state.controlledWriteReport = await runEquipmentControlledWriteEdge(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); state.writeBusy = false; render(); return; }
      if (action === 'run-post-write-verify') { state.verifyBusy = true; render(); state.postWriteVerificationReport = await runEquipmentPostWriteVerification(Object.assign({}, opts, { testKey: state.testKey, controlledWriteReport: state.controlledWriteReport || null })); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); state.verifyBusy = false; render(); return; }
      if (action === 'download-post-write-verification' && state.postWriteVerificationReport) return downloadFile('feg_equipment_post_write_verification.json', safeJson(state.postWriteVerificationReport));
      if (action === 'download-sync-audit') return downloadFile('feg_equipment_sync_audit.json', safeJson(buildEquipmentSyncAuditTrail(Object.assign({}, opts, { remoteReport: state.remoteReport || null, controlledWriteReport: state.controlledWriteReport || null, postWriteVerificationReport: state.postWriteVerificationReport || null }))));
      if (action === 'save-sync-audit') { saveEquipmentSyncAuditSnapshot(state.auditReport, opts.storage); state.report = buildBackendMigrationPackReport(Object.assign({}, opts, { testKey: state.testKey, writeConfirmPhrase: state.writeConfirmPhrase })); render(); return; }
      if (action === 'download-rollback-hints') return downloadFile('feg_equipment_sync_rollback_hints.json', safeJson(buildEquipmentSyncRollbackHints(Object.assign({}, opts, { remoteReport: state.remoteReport || null, controlledWriteReport: state.controlledWriteReport || null, postWriteVerificationReport: state.postWriteVerificationReport || null }))));
      if (action === 'download-write-template') return downloadFile('feg_equipment_controlled_write_request_template.json', safeJson(buildEquipmentControlledWriteRequest(opts)));
    }
    render();
    return root;
  }

  ROOT.SupabaseBackendPack = {
    BACKEND_PACK_VERSION,
    MIGRATION_FILE,
    QUOTE_MIGRATION_FILE,
    DRY_RUN_FUNCTION,
    QUOTE_DRY_RUN_FUNCTION,
    CONTROLLED_WRITE_FUNCTION,
    REMOTE_DRY_RUN_STORAGE_KEY,
    REMOTE_DRY_RUN_BASELINE_KEY,
    EQUIPMENT_WRITE_APPROVAL_KEY,
    CONTROLLED_WRITE_RESULT_STORAGE_KEY,
    POST_WRITE_VERIFICATION_STORAGE_KEY,
    EQUIPMENT_SYNC_AUDIT_STORAGE_KEY,
    stableStringify,
    checksum,
    equipmentPayloadChecksum,
    getRuntimeConfig,
    buildMigrationInventory,
    buildFunctionInventory,
    buildEquipmentEdgeDryRunRequest,
    buildEquipmentControlledWriteRequest,
    buildEquipmentRemoteDryRunReadiness,
    runEquipmentEdgeDryRun,
    saveRemoteDryRunReport,
    readRemoteDryRunReports,
    readRemoteDryRunBaseline,
    saveRemoteDryRunBaseline,
    summarizeRemoteDryRunReport,
    compareRemoteDryRunReports,
    buildRemoteDryRunHistoryReport,
    buildControlledWritePreflight,
    readEquipmentWriteApprovalPackage,
    saveEquipmentWriteApprovalPackage,
    clearEquipmentWriteApprovalPackage,
    buildEquipmentWriteApprovalPackage,
    compareApprovalWithCurrentPayload,
    buildApprovedControlledWriteRequest,
    buildEquipmentControlledWriteExecutionRequest,
    buildEquipmentControlledWriteReadiness,
    runEquipmentControlledWriteEdge,
    saveControlledWriteReport,
    readControlledWriteReports,
    buildEquipmentPostWriteVerificationRequest,
    buildEquipmentPostWriteVerificationReadiness,
    runEquipmentPostWriteVerification,
    summarizePostWriteVerificationReport,
    savePostWriteVerificationReport,
    readPostWriteVerificationReports,
    buildEquipmentSyncAuditTrail,
    buildEquipmentSyncRollbackHints,
    saveEquipmentSyncAuditSnapshot,
    readEquipmentSyncAuditSnapshots,
    buildRolloutChecklist,
    buildBackendMigrationPackReport,
    reportToText,
    renderBackendPackConsole
  };
})();
