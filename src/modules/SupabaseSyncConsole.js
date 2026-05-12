(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const CONSOLE_VERSION = '3.9.2';

  function adapter() { return ROOT.BackendSyncAdapter || null; }
  function workspaceSettings() { return ROOT.WorkspaceSettings || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function projectAudit() { return ROOT.ProjectAuditLog || null; }
  function quoteModel() { return ROOT.QuoteModel || null; }
  function equipmentDb() { return ROOT.EquipmentDatabase || null; }
  function suppliers() { return ROOT.SupplierDirectory || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }
  function countRows(rows) { return Object.values(rows || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0); }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function getRuntimeConfig(config) {
    if (!adapter()) return { mode: 'local', enableRemoteSync: false, supabaseUrl: '', supabaseAnonKey: '', workspaceId: 'main', dryRun: true, tableMap: {} };
    return adapter().getRuntimeConfig(config);
  }

  function maskKey(key) {
    const text = toText(key);
    if (!text) return '';
    if (text.length <= 12) return `${text.slice(0, 3)}•••${text.slice(-2)}`;
    return `${text.slice(0, 7)}••••••${text.slice(-5)}`;
  }

  function buildConnectionReport(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    const sdk = supabaseGlobal || GLOBAL.supabase;
    const hasAdapter = Boolean(adapter());
    const hasSdk = Boolean(sdk && typeof sdk.createClient === 'function');
    const hasUrl = Boolean(cfg.supabaseUrl);
    const hasAnonKey = Boolean(cfg.supabaseAnonKey);
    const remoteRequested = cfg.mode === 'supabase' && cfg.enableRemoteSync === true;
    const configured = hasAdapter && hasSdk && hasUrl && hasAnonKey;
    const effectiveMode = hasAdapter ? adapter().getBackendMode(cfg, sdk) : 'local';
    const checks = [
      { key: 'adapter', label: 'BackendSyncAdapter загружен', ok: hasAdapter, severity: hasAdapter ? 'ok' : 'error' },
      { key: 'sdk', label: 'Supabase SDK доступен', ok: hasSdk, severity: hasSdk ? 'ok' : 'warning' },
      { key: 'url', label: 'supabaseUrl задан', ok: hasUrl, severity: hasUrl ? 'ok' : 'warning' },
      { key: 'anon', label: 'supabaseAnonKey задан', ok: hasAnonKey, severity: hasAnonKey ? 'ok' : 'warning' },
      { key: 'remote', label: 'Remote sync явно включён', ok: remoteRequested, severity: remoteRequested ? 'ok' : 'info' },
      { key: 'safe', label: 'По умолчанию local / dry-run', ok: effectiveMode === 'local' || cfg.dryRun !== false, severity: 'ok' }
    ];
    const warnings = checks.filter(check => !check.ok && check.severity !== 'error').map(check => check.label);
    const errors = checks.filter(check => !check.ok && check.severity === 'error').map(check => check.label);
    return {
      type: 'feg-stage-pro-supabase-connection-report',
      version: CONSOLE_VERSION,
      generated_at: nowIso(),
      configured,
      effective_mode: effectiveMode,
      remote_requested: remoteRequested,
      dry_run: cfg.dryRun !== false,
      workspace_id: cfg.workspaceId,
      supabase_url_present: hasUrl,
      supabase_anon_key_present: hasAnonKey,
      supabase_anon_key_masked: maskKey(cfg.supabaseAnonKey),
      sdk_present: hasSdk,
      table_map: clone(cfg.tableMap || {}),
      checks,
      warnings,
      errors
    };
  }

  function getActiveQuote() {
    const draft = ROOT.QuoteDraftStorage && ROOT.QuoteDraftStorage.getDraft ? ROOT.QuoteDraftStorage.getDraft() : null;
    if (draft && Object.keys(draft).length) return quoteModel() && quoteModel().normalizeQuote ? quoteModel().normalizeQuote(draft) : draft;
    return quoteModel() && quoteModel().createEmptyQuote ? quoteModel().createEmptyQuote() : {};
  }

  function getProjectRecords() {
    try {
      return projectStorage() && projectStorage().listProjects ? projectStorage().listProjects() : [];
    } catch (_) { return []; }
  }

  function getEquipmentItems() {
    try {
      return equipmentDb() && equipmentDb().getDemoItems ? equipmentDb().getDemoItems() : [];
    } catch (_) { return []; }
  }

  function getSupplierRows(equipmentItems) {
    try {
      return suppliers() && suppliers().buildFromEquipmentItems ? suppliers().buildFromEquipmentItems(equipmentItems || []) : [];
    } catch (_) { return []; }
  }

  function buildSeedSyncPayload(options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const quote = opts.quote || getActiveQuote();
    const equipmentItems = opts.includeEquipment === false ? [] : getEquipmentItems();
    const supplierRows = opts.includeSuppliers === false ? [] : getSupplierRows(equipmentItems);
    let exportPack = null;
    try {
      if (projectAudit() && projectAudit().buildProjectExportPack) {
        const projectRecord = opts.projectRecord || { id: quote.id || quote.quoteId || 'draft', quote, quoteId: quote.id || quote.quoteId || 'draft' };
        exportPack = projectAudit().buildProjectExportPack(projectRecord);
      }
    } catch (_) { exportPack = null; }
    const quoteItems = exportPack && exportPack.quote_items ? exportPack.quote_items : [];
    const auditLog = exportPack && exportPack.audit_log ? exportPack.audit_log : [];
    const reservations = exportPack && exportPack.reservation_plan && Array.isArray(exportPack.reservation_plan.rows) ? exportPack.reservation_plan.rows : [];
    const stockMovements = exportPack && exportPack.stock_movement_plan && Array.isArray(exportPack.stock_movement_plan.rows) ? exportPack.stock_movement_plan.rows : [];
    const warehouseWorkflows = exportPack && exportPack.warehouse_workflow ? [exportPack.warehouse_workflow] : [];
    return adapter().buildSyncPayload({
      quote,
      quote_items: quoteItems,
      equipment_items: equipmentItems,
      suppliers: supplierRows,
      audit_log: auditLog,
      reservations,
      stock_movements: stockMovements,
      warehouse_workflows: warehouseWorkflows
    }, { workspaceId: opts.workspaceId || cfg.workspaceId, config: cfg });
  }

  function buildDryRunReport(input, options) {
    const payload = input && input.type === 'feg-stage-pro-backend-sync-payload'
      ? input
      : buildSeedSyncPayload(options || {});
    const validation = adapter().validateSyncPayload(payload);
    const tableMap = payload.table_map || {};
    const rowCounts = {};
    Object.entries(payload.rows || {}).forEach(([key, rows]) => { rowCounts[key] = Array.isArray(rows) ? rows.length : 0; });
    const operations = Object.entries(rowCounts).map(([key, count]) => ({
      row_key: key,
      table: tableMap[key] || key,
      operation: 'upsert',
      rows: count,
      dry_run: true
    }));
    return {
      type: 'feg-stage-pro-sync-dry-run-report',
      version: CONSOLE_VERSION,
      generated_at: nowIso(),
      workspace_id: payload.workspace_id,
      mode: payload.mode || 'local',
      row_counts: rowCounts,
      total_rows: countRows(payload.rows),
      operations,
      validation,
      payload
    };
  }

  function buildReadinessReport(config, supabaseGlobal) {
    const connection = buildConnectionReport(config, supabaseGlobal);
    const payload = buildSeedSyncPayload({ config });
    const dryRun = buildDryRunReport(payload, { config });
    const projects = getProjectRecords();
    const settings = workspaceSettings() && workspaceSettings().loadSettings ? workspaceSettings().loadSettings() : null;
    const blockers = [];
    const warnings = [];
    if (!connection.sdk_present) warnings.push('Supabase SDK не найден: remote sync останется в local mode.');
    if (!connection.supabase_url_present) warnings.push('supabaseUrl не задан.');
    if (!connection.supabase_anon_key_present) warnings.push('supabaseAnonKey не задан.');
    if (!dryRun.validation.ok) blockers.push(...dryRun.validation.errors);
    if (!projects.length) warnings.push('Нет сохранённых проектов для проверки пакетной синхронизации.');
    if (connection.effective_mode === 'supabase' && connection.dry_run === false) warnings.push('Remote sync и не dry-run включены: перед записью проверь RLS и миграции.');
    const scoreBase = 100;
    const score = Math.max(0, scoreBase - blockers.length * 25 - warnings.length * 8);
    return {
      type: 'feg-stage-pro-sync-readiness-report',
      version: CONSOLE_VERSION,
      generated_at: nowIso(),
      ready_for_dry_run: blockers.length === 0,
      ready_for_remote_write: blockers.length === 0 && connection.configured && connection.remote_requested && connection.effective_mode === 'supabase',
      score,
      blockers,
      warnings,
      connection,
      dry_run: dryRun,
      project_count: projects.length,
      settings: settings ? { workspaceId: settings.workspaceId, workspaceName: settings.workspaceName, companyName: settings.companyName } : null
    };
  }

  function reportToText(report) {
    const r = report || buildReadinessReport();
    const lines = [];
    lines.push('FEG Stage PRO — Supabase Sync Console');
    lines.push(`Версия: ${CONSOLE_VERSION}`);
    lines.push(`Дата: ${r.generated_at || nowIso()}`);
    lines.push('');
    lines.push(`Готов к dry-run: ${r.ready_for_dry_run ? 'да' : 'нет'}`);
    lines.push(`Готов к remote write: ${r.ready_for_remote_write ? 'да' : 'нет'}`);
    lines.push(`Score: ${r.score || 0}%`);
    lines.push(`Workspace: ${r.connection && r.connection.workspace_id || r.dry_run && r.dry_run.workspace_id || 'main'}`);
    lines.push(`Режим: ${r.connection && r.connection.effective_mode || 'local'}`);
    lines.push('');
    lines.push('Проверки подключения:');
    (r.connection && r.connection.checks || []).forEach(check => lines.push(`- ${check.ok ? 'OK' : 'WARN'}: ${check.label}`));
    lines.push('');
    lines.push('Dry-run rows:');
    Object.entries(r.dry_run && r.dry_run.row_counts || {}).forEach(([key, count]) => lines.push(`- ${key}: ${count}`));
    if (r.blockers && r.blockers.length) {
      lines.push('');
      lines.push('Blockers:');
      r.blockers.forEach(item => lines.push(`- ${item}`));
    }
    if (r.warnings && r.warnings.length) {
      lines.push('');
      lines.push('Warnings:');
      r.warnings.forEach(item => lines.push(`- ${item}`));
    }
    return lines.join('\n');
  }

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

  function renderSyncConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    let state = {
      report: buildReadinessReport(opts.config),
      selected: 'readiness'
    };
    function render() {
      const report = state.report;
      const dryRun = report.dry_run || {};
      const connection = report.connection || {};
      const rowCounts = dryRun.row_counts || {};
      root.innerHTML = `
        <div class="v4-card v4-sync-console" data-v4-sync-console>
          <div class="v4-section-head">
            <div>
              <div class="v4-kicker">Supabase · Sync Console</div>
              <h3>Backend sync status</h3>
              <p class="v4-muted">Безопасная консоль подготовки: проверка runtime-config, dry-run payload, validation и readiness. Реальная запись в Supabase не выполняется.</p>
            </div>
            <div class="v4-sync-score ${report.ready_for_remote_write ? 'ok' : report.ready_for_dry_run ? 'warn' : 'bad'}">
              <span>${escapeHtml(report.score)}%</span>
              <small>${report.ready_for_remote_write ? 'REMOTE READY' : report.ready_for_dry_run ? 'DRY-RUN READY' : 'BLOCKED'}</small>
            </div>
          </div>
          <div class="v4-summary-grid v4-sync-summary">
            <div class="v4-mini"><span>Режим</span><b>${escapeHtml(connection.effective_mode || 'local')}</b></div>
            <div class="v4-mini"><span>Workspace</span><b>${escapeHtml(connection.workspace_id || 'main')}</b></div>
            <div class="v4-mini"><span>Строк dry-run</span><b>${escapeHtml(dryRun.total_rows || 0)}</b></div>
            <div class="v4-mini"><span>Проектов</span><b>${escapeHtml(report.project_count || 0)}</b></div>
          </div>
          <div class="v4-sync-layout">
            <div class="v4-sync-panel">
              <h4>Проверки подключения</h4>
              <div class="v4-sync-checks">
                ${(connection.checks || []).map(renderCheck).join('')}
              </div>
              <div class="v4-note">
                <b>Anon key:</b> ${connection.supabase_anon_key_masked ? escapeHtml(connection.supabase_anon_key_masked) : 'не задан'}<br>
                <b>Remote requested:</b> ${connection.remote_requested ? 'да' : 'нет'}<br>
                <b>Dry-run:</b> ${connection.dry_run ? 'да' : 'нет'}
              </div>
            </div>
            <div class="v4-sync-panel">
              <h4>Dry-run operations</h4>
              <div class="v4-table-wrap">
                <table class="v4-table v4-table--sync"><thead><tr><th>Раздел</th><th>Таблица</th><th>Операция</th><th>Строк</th></tr></thead><tbody>
                  ${(dryRun.operations || []).map(op => `<tr><td>${escapeHtml(op.row_key)}</td><td>${escapeHtml(op.table)}</td><td>${escapeHtml(op.operation)}</td><td>${escapeHtml(op.rows)}</td></tr>`).join('') || '<tr><td colspan="4">Нет данных</td></tr>'}
                </tbody></table>
              </div>
            </div>
          </div>
          ${renderIssueBox('Blockers', report.blockers, 'bad')}
          ${renderIssueBox('Warnings', report.warnings, 'warn')}
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-sync-action="refresh">Обновить отчёт</button>
            <button type="button" class="btn-secondary" data-sync-action="copy-readiness">Копировать readiness</button>
            <button type="button" class="btn-secondary" data-sync-action="download-readiness">Скачать readiness JSON</button>
            <button type="button" class="btn-secondary" data-sync-action="download-payload">Скачать payload JSON</button>
            <button type="button" class="btn-secondary" data-sync-action="save-snapshot">Сохранить local snapshot</button>
          </div>
          <details class="v4-json-details">
            <summary>JSON предпросмотр readiness</summary>
            <pre>${escapeHtml(safeJson(report))}</pre>
          </details>
        </div>`;
      root.querySelectorAll('[data-sync-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-sync-action'))));
    }
    function handleAction(action) {
      if (action === 'refresh') {
        state.report = buildReadinessReport(opts.config);
        render();
        return;
      }
      if (action === 'copy-readiness') {
        const text = reportToText(state.report);
        if (GLOBAL.navigator && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
        return;
      }
      if (action === 'download-readiness') downloadFile('feg_sync_readiness_report.json', safeJson(state.report));
      if (action === 'download-payload') downloadFile('feg_backend_sync_payload.json', safeJson(state.report.dry_run && state.report.dry_run.payload || {}));
      if (action === 'save-snapshot' && adapter()) adapter().saveLocalSnapshot(state.report.dry_run && state.report.dry_run.payload || {}, opts.storage);
    }
    render();
    return root;
  }

  function renderCheck(check) {
    const cls = check.ok ? 'ok' : check.severity === 'error' ? 'bad' : 'warn';
    return `<div class="v4-sync-check ${cls}"><span>${check.ok ? '✓' : '!'}</span><b>${escapeHtml(check.label)}</b><small>${escapeHtml(check.severity || '')}</small></div>`;
  }

  function renderIssueBox(title, items, tone) {
    if (!items || !items.length) return '';
    return `<div class="v4-sync-issues ${tone || ''}"><b>${escapeHtml(title)}</b>${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  ROOT.SupabaseSyncConsole = {
    CONSOLE_VERSION,
    getRuntimeConfig,
    buildConnectionReport,
    buildSeedSyncPayload,
    buildDryRunReport,
    buildReadinessReport,
    reportToText,
    renderSyncConsole
  };
})();
