(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUOTE_BACKEND_SYNC_VERSION = '3.13.1';
  const QUOTE_DRY_RUN_FUNCTION = 'quote-sync-dry-run';
  const QUOTE_CONTROLLED_WRITE_FUNCTION = 'quote-controlled-write';
  const QUOTE_DRY_RUN_STORAGE_KEY = 'fegV4QuoteRemoteDryRunReports';
  const QUOTE_WRITE_APPROVAL_STORAGE_KEY = 'fegV4QuoteWriteApprovalPackage';
  const QUOTE_CONTROLLED_WRITE_STORAGE_KEY = 'fegV4QuoteControlledWriteReports';
  const QUOTE_POST_WRITE_VERIFICATION_STORAGE_KEY = 'fegV4QuotePostWriteVerificationReports';

  function adapter() { return ROOT.BackendSyncAdapter || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function projectAudit() { return ROOT.ProjectAuditLog || null; }
  function quoteModel() { return ROOT.QuoteModel || null; }
  function quoteDraft() { return ROOT.QuoteDraftStorage || null; }
  function quoteItems() { return ROOT.QuoteItemBuilder || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function getStorage(storage) {
    if (storage) return storage;
    try { if (GLOBAL.localStorage) return GLOBAL.localStorage; } catch (_) {}
    return null;
  }

  function getRuntimeConfig(input) {
    const raw = Object.assign({}, GLOBAL.FEG_APP_CONFIG || {}, input || {});
    const base = adapter() && adapter().getRuntimeConfig ? Object.assign({}, raw, adapter().getRuntimeConfig(raw)) : raw;
    const supabaseUrl = toText(base.supabaseUrl || base.supabase_url || raw.supabaseUrl || raw.supabase_url || '');
    const functionsBaseUrl = toText(base.functionsBaseUrl || base.functions_base_url || (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : ''));
    return Object.assign({}, base, {
      mode: base.mode || base.backendMode || 'local',
      workspaceId: toText(base.workspaceId || base.workspace_id || 'main') || 'main',
      supabaseUrl,
      supabaseAnonKey: toText(base.supabaseAnonKey || base.supabase_anon_key || ''),
      functionsBaseUrl
    });
  }

  function endpointUrl(config, fnName) {
    const cfg = getRuntimeConfig(config);
    return cfg.functionsBaseUrl ? `${cfg.functionsBaseUrl.replace(/\/+$/, '')}/${fnName}` : '';
  }

  function stableStringify(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
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

  function cleanRowForChecksum(row) {
    const clean = {};
    const skip = new Set(['raw_payload', 'created_at', 'updated_at', 'synced_at']);
    Object.keys(row || {}).sort().forEach(key => { if (!skip.has(key)) clean[key] = row[key]; });
    return clean;
  }

  function sortedRows(rows, keyFields) {
    const fields = keyFields || ['local_id', 'id', 'name'];
    return (Array.isArray(rows) ? rows : [])
      .map(cleanRowForChecksum)
      .sort((a, b) => fields.map(field => toText(a[field])).join('|').localeCompare(fields.map(field => toText(b[field])).join('|')));
  }

  function quotePayloadChecksum(rows) {
    const src = rows || {};
    return checksum({
      clients: sortedRows(src.clients, ['local_id', 'email', 'name']),
      quotes: sortedRows(src.quotes, ['local_id', 'id', 'title', 'project_name']),
      quote_sections: sortedRows(src.quote_sections, ['quote_id', 'section_key']),
      quote_items: sortedRows(src.quote_items, ['quote_id', 'section_key', 'local_id', 'id', 'name']),
      audit_log: sortedRows(src.audit_log, ['quote_id', 'local_id', 'id', 'action'])
    });
  }

  function getProjectRows(options) {
    const opts = options || {};
    if (opts.projectRecord) return [opts.projectRecord].filter(Boolean);
    if (opts.projectId && projectStorage() && projectStorage().loadProject) {
      const record = projectStorage().loadProject(opts.projectId);
      return record ? [record] : [];
    }
    const rows = projectStorage() && projectStorage().listProjects ? projectStorage().listProjects() : [];
    if (rows.length) return rows;
    try {
      const draft = quoteDraft() && quoteDraft().getDraft ? quoteDraft().getDraft() : null;
      if (draft && Object.keys(draft).length) return [{ projectId: draft.projectId || draft.id || 'active-draft', quoteId: draft.id || 'active-draft', quote: draft, projectName: draft.project && draft.project.name || 'Active draft' }];
    } catch (_) {}
    return [];
  }

  function buildRowsForProject(record, workspaceId) {
    const q = record && record.quote ? record.quote : (record || {});
    const normalizedQuote = quoteModel() && quoteModel().createQuoteDraft ? quoteModel().createQuoteDraft(q) : q;
    let exportPack = null;
    try { exportPack = projectAudit() && projectAudit().buildProjectExportPack ? projectAudit().buildProjectExportPack(record && record.quote ? record : { quote: normalizedQuote, projectId: record && record.projectId }) : null; }
    catch (_) { exportPack = null; }
    let builtQuoteItems = exportPack && Array.isArray(exportPack.quote_items) ? exportPack.quote_items : [];
    if (!builtQuoteItems.length && quoteItems() && quoteItems().buildQuoteItems) {
      const result = quoteItems().buildQuoteItems(normalizedQuote);
      builtQuoteItems = Array.isArray(result) ? result : (result && Array.isArray(result.rows) ? result.rows : []);
    }
    const auditRows = exportPack && Array.isArray(exportPack.audit_log) ? exportPack.audit_log : [];
    const payload = adapter() && adapter().buildSyncPayload ? adapter().buildSyncPayload({ quote: normalizedQuote, quote_items: builtQuoteItems, audit_log: auditRows }, { workspaceId }) : { rows: {} };
    const rows = payload.rows || {};
    return {
      clients: rows.clients || [],
      quotes: rows.quotes || [],
      quote_sections: rows.quote_sections || [],
      quote_items: rows.quote_items || [],
      audit_log: rows.audit_log || []
    };
  }

  function pushUnique(target, key, rows, uniqueKeyFn) {
    const list = target[key] || (target[key] = []);
    const seen = new Set(list.map(row => uniqueKeyFn(row)));
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const id = uniqueKeyFn(row);
      if (!id || seen.has(id)) return;
      seen.add(id);
      list.push(row);
    });
  }

  function buildQuoteSyncPayload(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const workspaceId = toText(opts.workspaceId || cfg.workspaceId || 'main') || 'main';
    const projects = getProjectRows(opts);
    const rows = { clients: [], quotes: [], quote_sections: [], quote_items: [], audit_log: [] };
    projects.forEach(record => {
      const built = buildRowsForProject(record, workspaceId);
      pushUnique(rows, 'clients', built.clients, row => `${toText(row.id || row.local_id)}|${toText(row.email)}|${toText(row.name).toLowerCase()}`);
      pushUnique(rows, 'quotes', built.quotes, row => toText(row.id || row.local_id || row.title || row.project_name));
      pushUnique(rows, 'quote_sections', built.quote_sections, row => `${toText(row.quote_id)}|${toText(row.section_key)}`);
      pushUnique(rows, 'quote_items', built.quote_items, row => toText(row.id || row.local_id || `${row.quote_id}|${row.section_key}|${row.code}|${row.name}|${row.qty}`));
      pushUnique(rows, 'audit_log', built.audit_log, row => toText(row.id || row.local_id || `${row.quote_id}|${row.action}|${row.created_at}`));
    });
    return {
      type: 'feg-stage-pro-quote-sync-payload',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      workspace_id: workspaceId,
      project_count: projects.length,
      rows,
      row_counts: summarizeRows(rows),
      payload_checksum: quotePayloadChecksum(rows),
      safety: {
        dry_run_only: true,
        includes_stock_movements: false,
        includes_reservations: false,
        browser_upsert_enabled: false,
        note: 'Quote payload is for dry-run/diff only. It does not include stock movements or automatic reservations.'
      }
    };
  }

  function summarizeRows(rows) {
    const src = rows || {};
    const counts = {};
    ['clients', 'quotes', 'quote_sections', 'quote_items', 'audit_log'].forEach(key => { counts[key] = Array.isArray(src[key]) ? src[key].length : 0; });
    counts.total = Object.values(counts).reduce((sum, value) => sum + toNumber(value, 0), 0);
    return counts;
  }

  function buildQuoteSyncPreview(options) {
    const payload = options && options.payload ? options.payload : buildQuoteSyncPayload(options || {});
    const rows = payload.rows || {};
    const blockers = [];
    const warnings = [];
    const quoteIds = new Set();
    const clientIds = new Set();
    (rows.clients || []).forEach((row, index) => {
      if (!toText(row.name)) blockers.push(`clients[${index}].name is required`);
      const id = toText(row.id || row.local_id || row.email || row.name).toLowerCase();
      if (id && clientIds.has(id)) warnings.push(`duplicate client key: ${id}`);
      if (id) clientIds.add(id);
    });
    (rows.quotes || []).forEach((row, index) => {
      const id = toText(row.id || row.local_id);
      if (!id) blockers.push(`quotes[${index}].id/local_id is required`);
      if (!toText(row.title || row.project_name)) warnings.push(`quotes[${index}] has no project title`);
      if (!toText(row.status)) warnings.push(`quotes[${index}] has no status`);
      const key = id.toLowerCase();
      if (key && quoteIds.has(key)) blockers.push(`duplicate quote id/local_id: ${id}`);
      if (key) quoteIds.add(key);
    });
    (rows.quote_sections || []).forEach((row, index) => {
      if (!toText(row.quote_id)) blockers.push(`quote_sections[${index}].quote_id is required`);
      if (!toText(row.section_key)) blockers.push(`quote_sections[${index}].section_key is required`);
    });
    (rows.quote_items || []).forEach((row, index) => {
      if (!toText(row.quote_id)) blockers.push(`quote_items[${index}].quote_id is required`);
      if (!toText(row.name)) blockers.push(`quote_items[${index}].name is required`);
      if (toNumber(row.qty, 0) <= 0) warnings.push(`quote_items[${index}].qty is zero or empty`);
    });
    if (!(rows.quotes || []).length) warnings.push('Нет сохранённых проектов/смет для quote sync dry-run.');
    return {
      type: 'feg-stage-pro-quote-sync-preview',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_remote_dry_run',
      ready_for_remote_dry_run: blockers.length === 0,
      workspace_id: payload.workspace_id,
      project_count: payload.project_count,
      row_counts: payload.row_counts || summarizeRows(rows),
      payload_checksum: payload.payload_checksum || quotePayloadChecksum(rows),
      blockers,
      warnings,
      safety: payload.safety,
      payload_sample: {
        clients: (rows.clients || []).slice(0, 3),
        quotes: (rows.quotes || []).slice(0, 3),
        quote_items: (rows.quote_items || []).slice(0, 5)
      },
      payload
    };
  }

  function buildQuoteEdgeDryRunRequest(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const payload = opts.payload || buildQuoteSyncPayload(opts);
    const preview = buildQuoteSyncPreview({ payload });
    return {
      type: 'feg-stage-pro-quote-edge-dry-run-request',
      version: QUOTE_BACKEND_SYNC_VERSION,
      dry_run: true,
      workspace_slug: toText(opts.workspaceSlug || payload.workspace_id || cfg.workspaceId || 'main') || 'main',
      workspace_id: toText(payload.workspace_id || cfg.workspaceId || 'main') || 'main',
      payload_checksum: payload.payload_checksum,
      quote_sync_preview: preview,
      quote_sync_payload: payload,
      safety: {
        remote_write_executed: false,
        no_stock_movements: true,
        no_reservations: true,
        no_browser_upsert: true
      }
    };
  }

  function buildQuoteRemoteDryRunReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_DRY_RUN_FUNCTION);
    const preview = buildQuoteSyncPreview(opts);
    const hasEndpoint = Boolean(endpoint);
    const hasTestKey = Boolean(toText(opts.testKey));
    const blockers = [];
    const warnings = preview.warnings.slice();
    if (!hasEndpoint) blockers.push('Functions base URL не задан.');
    if (!hasTestKey) blockers.push('FEG_SERVER_TEST_KEY не введён.');
    if (!preview.ready_for_remote_dry_run) blockers.push(...preview.blockers);
    return {
      type: 'feg-stage-pro-quote-remote-dry-run-readiness',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      ready: blockers.length === 0,
      endpoint,
      test_key_present: hasTestKey,
      workspace_id: preview.workspace_id,
      row_counts: preview.row_counts,
      payload_checksum: preview.payload_checksum,
      blockers,
      warnings,
      preview
    };
  }

  async function runQuoteEdgeDryRun(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_DRY_RUN_FUNCTION);
    const readiness = buildQuoteRemoteDryRunReadiness(opts);
    if (!readiness.ready) {
      return { ok: false, type: 'feg-stage-pro-quote-edge-dry-run-result', version: QUOTE_BACKEND_SYNC_VERSION, status: 'blocked_locally', dry_run: true, remote_write_executed: false, readiness, blockers: readiness.blockers, warnings: readiness.warnings };
    }
    const fetcher = opts.fetcher || GLOBAL.fetch;
    if (typeof fetcher !== 'function') return { ok: false, status: 'fetch_unavailable', dry_run: true, remote_write_executed: false, readiness };
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': toText(opts.testKey) },
        body: safeJson(buildQuoteEdgeDryRunRequest(opts))
      });
      let body = null;
      try { body = await response.json(); } catch (_) { body = { parse_error: true }; }
      const result = Object.assign({ http_status: response.status, http_ok: response.ok }, body || {});
      saveQuoteRemoteDryRunReport(result, opts.storage);
      return result;
    } catch (err) {
      return { ok: false, status: 'request_failed', dry_run: true, remote_write_executed: false, error: String(err && err.message || err), readiness };
    }
  }

  function saveQuoteRemoteDryRunReport(report, storage) {
    const store = getStorage(storage);
    if (!store) return false;
    const rows = readQuoteRemoteDryRunReports(store);
    rows.unshift({ id: `quote-dry-run-${Date.now().toString(36)}`, at: nowIso(), report: clone(report) });
    store.setItem(QUOTE_DRY_RUN_STORAGE_KEY, safeJson(rows.slice(0, 20)));
    return true;
  }

  function readQuoteRemoteDryRunReports(storage) {
    const store = getStorage(storage);
    if (!store) return [];
    try { const rows = JSON.parse(store.getItem(QUOTE_DRY_RUN_STORAGE_KEY) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch (_) { return []; }
  }

  function reportBody(report) {
    if (!report) return {};
    if (report.body && typeof report.body === 'object') return report.body;
    if (report.report && typeof report.report === 'object') return report.report;
    return report;
  }

  function nestedOperationCount(statusCounts, op) {
    const counts = statusCounts || {};
    if (typeof counts[op] === 'number') return counts[op];
    return Object.keys(counts).reduce((sum, key) => sum + toNumber(counts[key] && counts[key][op], 0), 0);
  }

  function summarizeQuoteRemoteDryRunReport(report) {
    const body = reportBody(report);
    const diff = body.remote_diff || {};
    const statusCounts = diff.status_counts || {};
    return {
      ok: Boolean(body.ok),
      status: toText(body.status || diff.status || 'not_run'),
      remote_write_executed: body.remote_write_executed === true,
      payload_checksum: toText(body.payload_checksum || (report && report.payload_checksum)),
      row_counts: clone(body.counts || body.row_counts || {}),
      diff_counts: clone(statusCounts),
      remote_diff: clone(diff),
      remote_diff_ready: Boolean(diff && diff.ok),
      blockers: clone(body.blockers || []),
      warnings: clone(body.warnings || []),
      generated_at: toText(body.timestamp || body.generated_at || (report && report.generated_at) || '')
    };
  }

  function latestQuoteRemoteDryRunReport(storage) {
    const row = readQuoteRemoteDryRunReports(storage)[0] || null;
    return row && row.report ? row.report : null;
  }

  function readQuoteWriteApprovalPackage(storage) {
    const store = getStorage(storage);
    if (!store) return null;
    try {
      const parsed = JSON.parse(store.getItem(QUOTE_WRITE_APPROVAL_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }

  function saveQuoteWriteApprovalPackage(approval, storage) {
    const store = getStorage(storage);
    if (!store || !approval) return false;
    try { store.setItem(QUOTE_WRITE_APPROVAL_STORAGE_KEY, safeJson(approval)); return true; }
    catch (_) { return false; }
  }

  function clearQuoteWriteApprovalPackage(storage) {
    const store = getStorage(storage);
    if (!store) return false;
    try { store.removeItem(QUOTE_WRITE_APPROVAL_STORAGE_KEY); return true; }
    catch (_) { return false; }
  }

  function buildQuoteWriteApprovalPackage(options) {
    const opts = options || {};
    const payload = opts.payload || buildQuoteSyncPayload(opts);
    const preview = buildQuoteSyncPreview({ payload });
    const remoteReport = opts.remoteReport || latestQuoteRemoteDryRunReport(opts.storage);
    const summary = summarizeQuoteRemoteDryRunReport(remoteReport);
    const currentPayloadChecksum = quotePayloadChecksum(payload.rows || {});
    const remotePayloadChecksum = toText(remoteReport && remoteReport.payload_checksum || summary.payload_checksum || '');
    const hasQuotes = toNumber(preview.row_counts && preview.row_counts.quotes, 0) > 0;
    const checks = [
      { key: 'remote_report', label: 'Есть последний quote remote dry-run report', ok: Boolean(remoteReport) },
      { key: 'remote_write_not_executed', label: 'Remote dry-run не выполнял запись', ok: Boolean(remoteReport) && summary.remote_write_executed === false },
      { key: 'remote_summary_clean', label: 'Remote dry-run без blockers', ok: Boolean(remoteReport) && summary.blockers.length === 0 },
      { key: 'remote_diff_ready', label: 'Remote diff по clients/quotes построен', ok: Boolean(remoteReport && remoteReport.remote_diff && remoteReport.remote_diff.ok) },
      { key: 'payload_has_quotes', label: 'Payload содержит quotes', ok: hasQuotes },
      { key: 'payload_checksum_present', label: 'Remote report содержит payload_checksum', ok: Boolean(remotePayloadChecksum) },
      { key: 'payload_unchanged', label: 'Текущий quote payload совпадает с dry-run payload', ok: Boolean(remotePayloadChecksum) && remotePayloadChecksum === currentPayloadChecksum },
      { key: 'no_stock_movements', label: 'Payload не содержит складские движения', ok: true },
      { key: 'no_reservations', label: 'Payload не создаёт резервы', ok: true },
      { key: 'quote_write_disabled', label: 'Controlled quote write пока не включён', ok: true }
    ];
    const blockers = uniqueList(checks.filter(row => !row.ok).map(row => row.label).concat(preview.blockers || [], summary.blockers || []));
    const warnings = uniqueList((preview.warnings || []).concat(summary.warnings || [])).slice(0, 100);
    const approved = blockers.length === 0;
    return {
      type: 'feg-stage-pro-quote-write-approval-package',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      status: approved ? 'approved_quote_payload_locked' : 'blocked_quote_approval_not_ready',
      approved,
      remote_write_executed: false,
      static_build_remote_write: false,
      controlled_quote_write_enabled: false,
      workspace_slug: toText(payload.workspace_id || 'main') || 'main',
      project_count: payload.project_count || 0,
      row_counts: payload.row_counts || summarizeRows(payload.rows),
      payload_checksum: currentPayloadChecksum,
      remote_payload_checksum: remotePayloadChecksum,
      remote_summary: summary,
      preview_summary: { status: preview.status, blockers: preview.blockers || [], warnings: preview.warnings || [] },
      checks,
      blockers,
      warnings,
      safety: {
        no_upsert: true,
        no_stock_movements: true,
        no_reservations: true,
        direct_browser_upsert: false,
        approval_only: true
      },
      approval_note: 'Approval locks the clients/quotes payload that passed remote dry-run. If clients or quote payload changes, approval becomes stale and must be rebuilt after a new dry-run.'
    };
  }

  function compareQuoteApprovalWithCurrentPayload(approval, options) {
    const opts = options || {};
    const payload = opts.payload || buildQuoteSyncPayload(opts);
    const currentPayloadChecksum = quotePayloadChecksum(payload.rows || {});
    const approvedChecksum = toText(approval && approval.payload_checksum || '');
    const ok = Boolean(approval && approval.approved && approvedChecksum && approvedChecksum === currentPayloadChecksum);
    return {
      type: 'feg-stage-pro-quote-write-approval-check',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      ok,
      status: ok ? 'quote_approval_matches_current_payload' : 'quote_approval_missing_or_payload_changed',
      approved_at: approval && approval.generated_at || '',
      approved_checksum: approvedChecksum,
      current_payload_checksum: currentPayloadChecksum,
      blockers: ok ? [] : ['Quote approval package is missing or does not match the current clients/quotes payload']
    };
  }

  function buildApprovedQuoteWriteTemplate(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const approval = opts.approval || readQuoteWriteApprovalPackage(opts.storage) || null;
    const approvalCheck = compareQuoteApprovalWithCurrentPayload(approval, opts);
    const dryRunRequest = buildQuoteEdgeDryRunRequest(opts);
    return {
      type: 'feg-stage-pro-approved-quote-write-template',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      workspace_slug: dryRunRequest.workspace_slug || cfg.workspaceId,
      endpoint_hint: endpointUrl(cfg, 'quote-controlled-write'),
      dry_run: false,
      confirm_phrase: 'WRITE QUOTE',
      controlled_quote_write_enabled: true,
      remote_write_executed: false,
      approval_package: approval,
      approval_check: approvalCheck,
      payload_checksum: dryRunRequest.payload_checksum,
      quote_sync_payload: dryRunRequest.quote_sync_payload,
      safety: {
        template_only: true,
        requires_edge_function: 'quote-controlled-write',
        requires_edge_env: 'FEG_ENABLE_QUOTE_REMOTE_WRITE=true',
        no_stock_movements: true,
        no_reservations: true,
        no_browser_upsert: true
      },
      note: approvalCheck.ok
        ? 'Approved quote payload is locked. Send this template only through quote-controlled-write with FEG_SERVER_TEST_KEY and WRITE QUOTE.'
        : 'Approval is missing or stale. Run quote remote dry-run, approve payload, then rebuild this template.'
    };
  }


  function buildQuoteControlledWriteExecutionRequest(options) {
    const opts = options || {};
    const approval = opts.approval || readQuoteWriteApprovalPackage(opts.storage) || null;
    const approvalCheck = compareQuoteApprovalWithCurrentPayload(approval, opts);
    const template = buildApprovedQuoteWriteTemplate(Object.assign({}, opts, { approval }));
    const blockers = [];
    const warnings = [];
    if (!approvalCheck.ok) blockers.push(...(approvalCheck.blockers || ['quote approval is missing or stale']));
    if (template.dry_run !== false) blockers.push('approved template is not armed with dry_run=false');
    if (!template.controlled_quote_write_enabled) blockers.push('controlled quote write template is not enabled');
    if (!template.quote_sync_payload || !template.quote_sync_payload.rows) blockers.push('quote_sync_payload rows are missing');
    const counts = template.quote_sync_payload && template.quote_sync_payload.row_counts || summarizeRows(template.quote_sync_payload && template.quote_sync_payload.rows || {});
    if (toNumber(counts.quotes, 0) <= 0) blockers.push('quotes payload is empty');
    return Object.assign({}, template, {
      type: 'feg-stage-pro-quote-controlled-write-execution-request',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      endpoint_hint: endpointUrl(getRuntimeConfig(opts.config), QUOTE_CONTROLLED_WRITE_FUNCTION),
      readiness: {
        ready: blockers.length === 0,
        status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_quote_controlled_write_edge',
        blockers,
        warnings,
        approval_check: approvalCheck,
        row_counts: counts,
        no_stock_movements: true,
        no_reservations: true,
        no_browser_upsert: true
      },
      safety: Object.assign({}, template.safety || {}, {
        edge_only: true,
        requires_test_key_header: true,
        requires_confirm_phrase: 'WRITE QUOTE',
        requires_edge_env: 'FEG_ENABLE_QUOTE_REMOTE_WRITE=true',
        no_stock_movements: true,
        no_reservations: true,
        no_browser_upsert: true
      })
    });
  }

  function buildQuoteControlledWriteReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_CONTROLLED_WRITE_FUNCTION);
    const request = buildQuoteControlledWriteExecutionRequest(opts);
    const blockers = (request.readiness && request.readiness.blockers || []).slice();
    const warnings = (request.readiness && request.readiness.warnings || []).slice();
    if (!endpoint) blockers.push('quote-controlled-write endpoint is empty.');
    if (!toText(opts.testKey)) blockers.push('FEG_SERVER_TEST_KEY не введён.');
    if (toText(opts.confirmPhrase) !== 'WRITE QUOTE') blockers.push('Нужно ввести контрольную фразу WRITE QUOTE.');
    return {
      type: 'feg-stage-pro-quote-controlled-write-readiness',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      ready: blockers.length === 0,
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_edge_write',
      endpoint,
      test_key_present: Boolean(toText(opts.testKey)),
      confirm_phrase_ok: toText(opts.confirmPhrase) === 'WRITE QUOTE',
      blockers: uniqueList(blockers),
      warnings: uniqueList(warnings),
      row_counts: request.readiness && request.readiness.row_counts || {},
      payload_checksum: request.payload_checksum,
      request
    };
  }

  async function runQuoteControlledWriteEdge(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_CONTROLLED_WRITE_FUNCTION);
    const readiness = buildQuoteControlledWriteReadiness(opts);
    if (!readiness.ready) {
      const blocked = { ok: false, type: 'feg-stage-pro-quote-controlled-write-result', version: QUOTE_BACKEND_SYNC_VERSION, status: 'blocked_locally', dry_run: false, remote_write_executed: false, readiness, blockers: readiness.blockers, warnings: readiness.warnings };
      saveControlledQuoteWriteReport(blocked, opts.storage);
      return blocked;
    }
    const fetcher = opts.fetcher || GLOBAL.fetch;
    if (typeof fetcher !== 'function') {
      const result = { ok: false, status: 'fetch_unavailable', dry_run: false, remote_write_executed: false, readiness };
      saveControlledQuoteWriteReport(result, opts.storage);
      return result;
    }
    const request = buildQuoteControlledWriteExecutionRequest(opts);
    request.confirm_phrase = 'WRITE QUOTE';
    request.dry_run = false;
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feg-test-key': toText(opts.testKey) },
        body: safeJson(request)
      });
      let body = null;
      try { body = await response.json(); } catch (_) { body = { parse_error: true }; }
      const result = Object.assign({ http_status: response.status, http_ok: response.ok }, body || {});
      saveControlledQuoteWriteReport(result, opts.storage);
      return result;
    } catch (err) {
      const result = { ok: false, status: 'request_failed', dry_run: false, remote_write_executed: false, error: String(err && err.message || err), readiness };
      saveControlledQuoteWriteReport(result, opts.storage);
      return result;
    }
  }

  function saveControlledQuoteWriteReport(report, storage) {
    const store = getStorage(storage);
    if (!store) return false;
    const rows = readControlledQuoteWriteReports(store);
    rows.unshift({ id: `quote-controlled-write-${Date.now().toString(36)}`, at: nowIso(), report: clone(report) });
    try { store.setItem(QUOTE_CONTROLLED_WRITE_STORAGE_KEY,
    QUOTE_POST_WRITE_VERIFICATION_STORAGE_KEY, safeJson(rows.slice(0, 20))); return true; }
    catch (_) { return false; }
  }

  function readControlledQuoteWriteReports(storage) {
    const store = getStorage(storage);
    if (!store) return [];
    try { const rows = JSON.parse(store.getItem(QUOTE_CONTROLLED_WRITE_STORAGE_KEY) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch (_) { return []; }
  }


  function summarizeQuoteControlledWriteReport(report) {
    const body = reportBody(report);
    const executed = Boolean((report && report.remote_write_executed) || body.remote_write_executed);
    const blockers = [];
    if (!report) blockers.push('Quote controlled write report is missing');
    if (report && report.ok === false) blockers.push(`Quote controlled write report is not OK: ${report.status || 'unknown'}`);
    if (body && body.ok === false) blockers.push(`Quote controlled write Edge body is not OK: ${body.status || 'unknown'}`);
    if (!executed) blockers.push('Quote controlled write has not executed remote write');
    if (Array.isArray(report && report.blockers)) blockers.push(...report.blockers);
    if (Array.isArray(body.blockers)) blockers.push(...body.blockers);
    return {
      type: 'feg-stage-pro-quote-controlled-write-summary',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      ok: executed && blockers.length === 0,
      status: executed && blockers.length === 0 ? 'quote_controlled_write_executed' : 'quote_controlled_write_not_confirmed',
      remote_write_executed: executed,
      http_status: report && report.http_status || 0,
      payload_checksum: toText(body.payload_checksum || (report && report.payload_checksum) || ''),
      counts: clone(body.counts || report && report.counts || {}),
      blockers: uniqueList(blockers),
      warnings: uniqueList((Array.isArray(report && report.warnings) ? report.warnings : []).concat(Array.isArray(body.warnings) ? body.warnings : []))
    };
  }

  function latestControlledQuoteWriteReport(storage) {
    const row = readControlledQuoteWriteReports(storage)[0] || null;
    return row && row.report ? row.report : null;
  }

  function buildQuotePostWriteVerificationRequest(options) {
    const opts = options || {};
    const controlledReport = opts.controlledWriteReport || latestControlledQuoteWriteReport(opts.storage);
    const approval = opts.approval || readQuoteWriteApprovalPackage(opts.storage) || null;
    const request = buildQuoteEdgeDryRunRequest(opts);
    request.type = 'feg-stage-pro-quote-post-write-verification-request';
    request.version = QUOTE_BACKEND_SYNC_VERSION;
    request.verify_after_controlled_write = true;
    request.post_write_verification = {
      expected_zero_operations: ['insert', 'update'],
      remote_only_is_manual_review: true,
      expected_payload_checksum: request.payload_checksum,
      approval_checksum: approval && approval.payload_checksum || '',
      controlled_write_status: controlledReport && controlledReport.status || '',
      controlled_write_executed: Boolean(controlledReport && controlledReport.remote_write_executed === true),
      no_stock_movements: true,
      no_reservations: true,
      note: 'Read-only verification: calls quote-sync-dry-run after controlled write and expects no pending insert/update operations for the approved clients/quotes payload.'
    };
    return request;
  }

  function buildQuotePostWriteVerificationReadiness(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_DRY_RUN_FUNCTION);
    const testKey = toText(opts.testKey || opts.serverTestKey || '');
    const controlledSummary = summarizeQuoteControlledWriteReport(opts.controlledWriteReport || latestControlledQuoteWriteReport(opts.storage));
    const approval = opts.approval || readQuoteWriteApprovalPackage(opts.storage) || null;
    const approvalCheck = compareQuoteApprovalWithCurrentPayload(approval, opts);
    const request = buildQuotePostWriteVerificationRequest(opts);
    const counts = request.quote_sync_payload && request.quote_sync_payload.row_counts || summarizeRows(request.quote_sync_payload && request.quote_sync_payload.rows || {});
    const checks = [
      { key: 'endpoint', label: 'quote-sync-dry-run endpoint настроен для verification', ok: Boolean(endpoint), severity: endpoint ? 'ok' : 'error' },
      { key: 'test_key', label: 'x-feg-test-key введён вручную', ok: Boolean(testKey), severity: testKey ? 'ok' : 'error' },
      { key: 'controlled_write_executed', label: 'Есть успешный quote controlled write report', ok: controlledSummary.ok, severity: controlledSummary.ok ? 'ok' : 'error' },
      { key: 'approval_ok', label: 'Quote approval package всё ещё совпадает с payload', ok: approvalCheck.ok, severity: approvalCheck.ok ? 'ok' : 'error' },
      { key: 'payload_quotes', label: 'Payload содержит quotes', ok: toNumber(counts.quotes, 0) > 0, severity: toNumber(counts.quotes, 0) > 0 ? 'ok' : 'error' },
      { key: 'read_only', label: 'Verification вызывает только quote dry-run Edge Function', ok: request.dry_run === true, severity: 'ok' },
      { key: 'no_stock_movements', label: 'Verification не создаёт складские движения', ok: true, severity: 'ok' },
      { key: 'no_reservations', label: 'Verification не создаёт резервы', ok: true, severity: 'ok' }
    ];
    const blockers = checks.filter(row => !row.ok && row.severity === 'error').map(row => row.label)
      .concat(controlledSummary.blockers || [])
      .concat(approvalCheck.blockers || []);
    const cleanBlockers = uniqueList(blockers);
    return {
      type: 'feg-stage-pro-quote-post-write-verification-readiness',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      status: cleanBlockers.length ? 'blocked' : 'ready_for_quote_post_write_verification',
      ready: cleanBlockers.length === 0,
      endpoint,
      test_key_present: Boolean(testKey),
      controlled_write_summary: controlledSummary,
      approval_check: approvalCheck,
      row_counts: counts,
      payload_checksum: request.payload_checksum,
      checks,
      blockers: cleanBlockers,
      warnings: uniqueList((controlledSummary.warnings || []).concat(approvalCheck.warnings || [])).slice(0, 80),
      safety: { dry_run: true, remote_write_executed: false, no_stock_movements: true, no_reservations: true, no_browser_upsert: true },
      request_summary: { type: request.type, row_counts: counts, payload_checksum: request.payload_checksum }
    };
  }

  function summarizeQuotePostWriteVerificationReport(report) {
    const drySummary = summarizeQuoteRemoteDryRunReport(report);
    const counts = drySummary.diff_counts || {};
    const insert = nestedOperationCount(counts, 'insert');
    const update = nestedOperationCount(counts, 'update');
    const remoteOnly = nestedOperationCount(counts, 'remote_only');
    const unchanged = nestedOperationCount(counts, 'unchanged');
    const blockers = [];
    const warnings = [];
    if (!drySummary.ok) blockers.push(...(drySummary.blockers || []));
    if (!drySummary.remote_diff_ready) blockers.push('remote_diff is missing or not ready');
    if (insert > 0) blockers.push(`Quote post-write verification still has pending inserts: ${insert}`);
    if (update > 0) blockers.push(`Quote post-write verification still has pending updates: ${update}`);
    if (unchanged <= 0) blockers.push('No unchanged clients/quotes rows detected after quote write');
    if (remoteOnly > 0) warnings.push(`Remote-only clients/quotes rows require manual review: ${remoteOnly}`);
    const cleanBlockers = uniqueList(blockers);
    return {
      type: 'feg-stage-pro-quote-post-write-verification-summary',
      version: QUOTE_BACKEND_SYNC_VERSION,
      generated_at: nowIso(),
      ok: cleanBlockers.length === 0,
      verified: cleanBlockers.length === 0,
      status: cleanBlockers.length ? 'quote_post_write_verification_failed' : 'quote_post_write_verified',
      http_status: report && report.http_status || 0,
      remote_write_executed: Boolean(report && report.remote_write_executed),
      status_counts: clone(counts),
      totals: { insert, update, unchanged, remote_only: remoteOnly },
      remote_diff: drySummary.remote_diff,
      blockers: cleanBlockers,
      warnings: uniqueList((drySummary.warnings || []).concat(warnings)).slice(0, 100),
      safety: { dry_run: true, no_stock_movements: true, no_reservations: true, automatic_cleanup: false }
    };
  }

  function saveQuotePostWriteVerificationReport(report, storage) {
    const store = getStorage(storage);
    if (!store) return false;
    const rows = readQuotePostWriteVerificationReports(store);
    rows.unshift({ id: `quote-post-write-verify-${Date.now().toString(36)}`, at: nowIso(), report: clone(report) });
    try { store.setItem(QUOTE_POST_WRITE_VERIFICATION_STORAGE_KEY, safeJson(rows.slice(0, 20))); return true; }
    catch (_) { return false; }
  }

  function readQuotePostWriteVerificationReports(storage) {
    const store = getStorage(storage);
    if (!store) return [];
    try { const rows = JSON.parse(store.getItem(QUOTE_POST_WRITE_VERIFICATION_STORAGE_KEY) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch (_) { return []; }
  }

  async function runQuotePostWriteVerification(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const endpoint = endpointUrl(cfg, QUOTE_DRY_RUN_FUNCTION);
    const readiness = buildQuotePostWriteVerificationReadiness(opts);
    const request = buildQuotePostWriteVerificationRequest(opts);
    const base = { type: 'feg-stage-pro-quote-post-write-verification-report', version: QUOTE_BACKEND_SYNC_VERSION, generated_at: nowIso(), endpoint, dry_run: true, remote_write_executed: false, readiness, request_summary: readiness.request_summary };
    if (!endpoint) return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_endpoint', http_status: 0, error: 'quote-sync-dry-run endpoint is empty' });
    if (!toText(opts.testKey || opts.serverTestKey || '')) return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_test_key', http_status: 0, error: 'x-feg-test-key is required for quote post-write verification' });
    if (!readiness.ready) return Object.assign(base, { ok: false, verified: false, status: 'blocked_by_quote_verification_readiness', http_status: 0, error: 'Quote post-write verification readiness has blockers', blockers: readiness.blockers });
    const fetcher = opts.fetcher || GLOBAL.fetch;
    if (typeof fetcher !== 'function') return Object.assign(base, { ok: false, verified: false, status: 'blocked_no_fetch', http_status: 0, error: 'fetch is not available' });
    try {
      const response = await fetcher(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-feg-test-key': toText(opts.testKey || opts.serverTestKey || '') }, body: safeJson(request) });
      let body = null;
      try { body = typeof response.json === 'function' ? await response.json() : null; } catch (_) { body = { parse_error: true }; }
      const raw = Object.assign(base, { ok: Boolean(response.ok) && !(body && body.ok === false), http_status: response.status, body: clone(body), remote_write_executed: false });
      const summary = summarizeQuotePostWriteVerificationReport(raw);
      const report = Object.assign(raw, { ok: summary.ok, verified: summary.verified, status: summary.status, verification_summary: summary });
      saveQuotePostWriteVerificationReport(report, opts.storage);
      return report;
    } catch (err) {
      const report = Object.assign(base, { ok: false, verified: false, status: 'quote_post_write_verification_failed', http_status: 0, error: String(err && err.message || err), remote_write_executed: false });
      saveQuotePostWriteVerificationReport(report, opts.storage);
      return report;
    }
  }

  function uniqueList(list) {
    return Array.from(new Set((Array.isArray(list) ? list : []).map(item => toText(item)).filter(Boolean)));
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

  function renderQuoteBackendSyncConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = { testKey: '', confirmPhrase: '', report: null, writeReport: null, verifyReport: null, busy: false, writeBusy: false, verifyBusy: false };
    function render() {
      const preview = buildQuoteSyncPreview(opts);
      const readiness = buildQuoteRemoteDryRunReadiness(Object.assign({}, opts, { testKey: state.testKey }));
      const latest = state.report || ((readQuoteRemoteDryRunReports(opts.storage)[0] || {}).report) || null;
      const summary = summarizeQuoteRemoteDryRunReport(latest);
      const approval = readQuoteWriteApprovalPackage(opts.storage);
      const approvalCheck = compareQuoteApprovalWithCurrentPayload(approval, opts);
      const writeReadiness = buildQuoteControlledWriteReadiness(Object.assign({}, opts, { testKey: state.testKey, confirmPhrase: state.confirmPhrase }));
      const latestWrite = state.writeReport || ((readControlledQuoteWriteReports(opts.storage)[0] || {}).report) || null;
      const latestVerify = state.verifyReport || ((readQuotePostWriteVerificationReports(opts.storage)[0] || {}).report) || null;
      const verifyReadiness = buildQuotePostWriteVerificationReadiness(Object.assign({}, opts, { testKey: state.testKey, controlledWriteReport: latestWrite }));
      root.innerHTML = `
        <div class="v4-card v4-quote-backend-sync-pack">
          <div class="v4-kicker">Backend / Sync · clients & quotes</div>
          <h3>Clients/quotes remote dry-run</h3>
          <p class="v4-muted">Read-only проверка будущей синхронизации клиентов и проектов. Складские движения и резервы не включаются.</p>
          <div class="v4-grid-3">
            <div class="v4-mini-stat"><span>Projects</span><strong>${escapeHtml(preview.project_count || 0)}</strong></div>
            <div class="v4-mini-stat"><span>Rows</span><strong>${escapeHtml(preview.row_counts.total || 0)}</strong></div>
            <div class="v4-mini-stat"><span>Status</span><strong>${escapeHtml(preview.status)}</strong></div>
            <div class="v4-mini-stat"><span>Approval</span><strong>${escapeHtml(approvalCheck.status || 'none')}</strong></div>
          </div>
          <div class="v4-field-grid v4-sync-key-grid">
            <label>FEG_SERVER_TEST_KEY<input type="password" data-quote-backend-test-key autocomplete="off" placeholder="Ввести на время dry-run"></label>
            <label>Endpoint<input type="text" readonly value="${escapeHtml(readiness.endpoint || '')}"></label>
            <label>Write confirm phrase<input type="text" data-quote-write-confirm autocomplete="off" placeholder="WRITE QUOTE"></label>
          </div>
          <div class="v4-sync-check-grid">
            <div class="v4-sync-check ${readiness.ready ? 'ok' : 'warn'}"><span>${readiness.ready ? '✓' : '!'}</span><b>Remote dry-run readiness</b><small>${escapeHtml(readiness.ready ? 'ready' : 'check')}</small></div>
            <div class="v4-sync-check ok"><span>✓</span><b>No stock movements</b><small>read-only</small></div>
            <div class="v4-sync-check ok"><span>✓</span><b>No browser upsert</b><small>Edge dry-run only</small></div>
            <div class="v4-sync-check ${writeReadiness.ready ? 'ok' : 'warn'}"><span>${writeReadiness.ready ? '✓' : '!'}</span><b>Quote write runner</b><small>${escapeHtml(writeReadiness.status)}</small></div>
            <div class="v4-sync-check ${verifyReadiness.ready ? 'ok' : 'warn'}"><span>${verifyReadiness.ready ? '✓' : '!'}</span><b>Quote post-write verify</b><small>${escapeHtml(verifyReadiness.status)}</small></div>
          </div>
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-quote-backend="download-preview">Preview JSON</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-request">Dry-run request JSON</button>
            <button type="button" class="btn-primary" data-quote-backend="run-dry-run" ${state.busy ? 'disabled' : ''}>Запустить quote dry-run</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-report" ${latest ? '' : 'disabled'}>Скачать report JSON</button>
            <button type="button" class="btn-secondary" data-quote-backend="approve-payload" ${latest ? '' : 'disabled'}>Одобрить quote payload</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-approval">Approval JSON</button>
            <button type="button" class="btn-secondary" data-quote-backend="clear-approval">Сбросить approval</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-approved-template">Approved template</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-write-readiness">Write readiness JSON</button>
            <button type="button" class="btn-primary" data-quote-backend="run-controlled-write" ${state.writeBusy ? 'disabled' : ''}>Запустить quote controlled write Edge</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-verify-readiness">Verify readiness JSON</button>
            <button type="button" class="btn-primary" data-quote-backend="run-post-write-verify" ${state.verifyBusy ? 'disabled' : ''}>Проверить quote после write</button>
            <button type="button" class="btn-secondary" data-quote-backend="download-verify-report" ${latestVerify ? '' : 'disabled'}>Скачать verify JSON</button>
          </div>
          ${readiness.blockers.length ? `<div class="v4-alert warn"><b>Blockers:</b><br>${readiness.blockers.map(escapeHtml).join('<br>')}</div>` : ''}
          <div class="v4-sync-report ${approvalCheck.ok ? 'ok' : 'warn'}"><h4>Quote approval · ${escapeHtml(approvalCheck.status)}</h4><p class="v4-muted">Approved: ${approval && approval.approved ? 'true' : 'false'} · checksum: ${escapeHtml((approvalCheck.approved_checksum || '').slice(0, 16) || '—')}</p><details class="v4-json-details"><summary>Approval check JSON</summary><pre>${escapeHtml(safeJson(approvalCheck))}</pre></details></div>
          ${latestVerify ? `<div class="v4-sync-report ${latestVerify.verified ? 'ok' : 'warn'}"><h4>Latest quote post-write verify · ${escapeHtml(latestVerify.status || 'unknown')}</h4><p class="v4-muted">verified: ${latestVerify.verified === true}</p><details class="v4-json-details"><summary>Verification result JSON</summary><pre>${escapeHtml(safeJson(latestVerify))}</pre></details></div>` : ''}
          ${latestWrite ? `<div class="v4-sync-report ${latestWrite.ok ? 'ok' : 'warn'}"><h4>Latest quote controlled write · ${escapeHtml(latestWrite.status || 'unknown')}</h4><p class="v4-muted">remote_write_executed: ${latestWrite.remote_write_executed === true}</p><details class="v4-json-details"><summary>Controlled write result JSON</summary><pre>${escapeHtml(safeJson(latestWrite))}</pre></details></div>` : ''}
          ${latest ? `<div class="v4-sync-report ${summary.ok ? 'ok' : 'warn'}"><h4>Latest quote dry-run · ${escapeHtml(summary.status)}</h4><p class="v4-muted">Checksum: ${escapeHtml(summary.payload_checksum || '—')}</p><details class="v4-json-details"><summary>Latest report JSON</summary><pre>${escapeHtml(safeJson(latest))}</pre></details></div>` : '<p class="v4-muted">Remote report появится после запуска quote dry-run.</p>'}
          <details class="v4-json-details"><summary>Preview JSON</summary><pre>${escapeHtml(safeJson(preview))}</pre></details>
        </div>`;
      const input = root.querySelector('[data-quote-backend-test-key]');
      if (input) { input.value = state.testKey; input.addEventListener('input', () => { state.testKey = input.value; }); }
      const confirm = root.querySelector('[data-quote-write-confirm]');
      if (confirm) { confirm.value = state.confirmPhrase; confirm.addEventListener('input', () => { state.confirmPhrase = confirm.value; }); }
      root.querySelectorAll('[data-quote-backend]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-quote-backend'))));
    }
    async function handleAction(action) {
      if (action === 'download-preview') return downloadFile('feg_quote_sync_preview.json', safeJson(buildQuoteSyncPreview(opts)));
      if (action === 'download-request') return downloadFile('feg_quote_edge_dry_run_request.json', safeJson(buildQuoteEdgeDryRunRequest(opts)));
      if (action === 'download-report') return downloadFile('feg_quote_remote_dry_run_report.json', safeJson(state.report || ((readQuoteRemoteDryRunReports(opts.storage)[0] || {}).report) || {}));
      if (action === 'approve-payload') { const approval = buildQuoteWriteApprovalPackage(Object.assign({}, opts, { remoteReport: state.report || latestQuoteRemoteDryRunReport(opts.storage) })); saveQuoteWriteApprovalPackage(approval, opts.storage); render(); return; }
      if (action === 'download-approval') return downloadFile('feg_quote_write_approval_package.json', safeJson(readQuoteWriteApprovalPackage(opts.storage) || buildQuoteWriteApprovalPackage(opts)));
      if (action === 'clear-approval') { clearQuoteWriteApprovalPackage(opts.storage); render(); return; }
      if (action === 'download-approved-template') return downloadFile('feg_quote_approved_write_template.json', safeJson(buildApprovedQuoteWriteTemplate(opts)));
      if (action === 'download-write-readiness') return downloadFile('feg_quote_controlled_write_readiness.json', safeJson(buildQuoteControlledWriteReadiness(Object.assign({}, opts, { testKey: state.testKey, confirmPhrase: state.confirmPhrase }))));
      if (action === 'run-controlled-write') { state.writeBusy = true; render(); state.writeReport = await runQuoteControlledWriteEdge(Object.assign({}, opts, { testKey: state.testKey, confirmPhrase: state.confirmPhrase })); state.writeBusy = false; render(); return; }
      if (action === 'download-verify-readiness') return downloadFile('feg_quote_post_write_verification_readiness.json', safeJson(buildQuotePostWriteVerificationReadiness(Object.assign({}, opts, { testKey: state.testKey, controlledWriteReport: state.writeReport || latestControlledQuoteWriteReport(opts.storage) }))));
      if (action === 'run-post-write-verify') { state.verifyBusy = true; render(); state.verifyReport = await runQuotePostWriteVerification(Object.assign({}, opts, { testKey: state.testKey, controlledWriteReport: state.writeReport || latestControlledQuoteWriteReport(opts.storage) })); state.verifyBusy = false; render(); return; }
      if (action === 'download-verify-report') return downloadFile('feg_quote_post_write_verification.json', safeJson(state.verifyReport || ((readQuotePostWriteVerificationReports(opts.storage)[0] || {}).report) || {}));
      if (action === 'run-dry-run') { state.busy = true; render(); state.report = await runQuoteEdgeDryRun(Object.assign({}, opts, { testKey: state.testKey })); state.busy = false; render(); }
    }
    render();
    return root;
  }

  ROOT.QuoteBackendSyncPack = {
    QUOTE_BACKEND_SYNC_VERSION,
    QUOTE_DRY_RUN_FUNCTION,
    QUOTE_CONTROLLED_WRITE_FUNCTION,
    QUOTE_DRY_RUN_STORAGE_KEY,
    QUOTE_WRITE_APPROVAL_STORAGE_KEY,
    QUOTE_CONTROLLED_WRITE_STORAGE_KEY,
    QUOTE_POST_WRITE_VERIFICATION_STORAGE_KEY,
    stableStringify,
    checksum,
    quotePayloadChecksum,
    getRuntimeConfig,
    buildQuoteSyncPayload,
    buildQuoteSyncPreview,
    buildQuoteEdgeDryRunRequest,
    buildQuoteRemoteDryRunReadiness,
    runQuoteEdgeDryRun,
    saveQuoteRemoteDryRunReport,
    readQuoteRemoteDryRunReports,
    summarizeQuoteRemoteDryRunReport,
    latestQuoteRemoteDryRunReport,
    readQuoteWriteApprovalPackage,
    saveQuoteWriteApprovalPackage,
    clearQuoteWriteApprovalPackage,
    buildQuoteWriteApprovalPackage,
    compareQuoteApprovalWithCurrentPayload,
    buildApprovedQuoteWriteTemplate,
    buildQuoteControlledWriteExecutionRequest,
    buildQuoteControlledWriteReadiness,
    runQuoteControlledWriteEdge,
    saveControlledQuoteWriteReport,
    readControlledQuoteWriteReports,
    summarizeQuoteControlledWriteReport,
    latestControlledQuoteWriteReport,
    buildQuotePostWriteVerificationRequest,
    buildQuotePostWriteVerificationReadiness,
    runQuotePostWriteVerification,
    summarizeQuotePostWriteVerificationReport,
    saveQuotePostWriteVerificationReport,
    readQuotePostWriteVerificationReports,
    renderQuoteBackendSyncConsole
  };
})();
