(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const BACKEND_WRITE_DRY_RUN_VERSION = '3.9.9';

  const WRITE_ORDER = Object.freeze([
    'workspaces',
    'clients',
    'suppliers',
    'equipment_items',
    'quotes',
    'quote_sections',
    'quote_items',
    'reservations',
    'stock_movements',
    'warehouse_workflows',
    'audit_log'
  ]);

  const REQUIRED_FIELDS = Object.freeze({
    clients: ['id', 'workspace_id', 'name'],
    suppliers: ['id', 'workspace_id', 'name'],
    equipment_items: ['id', 'workspace_id', 'name'],
    quotes: ['id', 'workspace_id', 'title'],
    quote_sections: ['id', 'workspace_id', 'quote_id', 'section_key'],
    quote_items: ['id', 'workspace_id', 'quote_id', 'name'],
    reservations: ['id', 'workspace_id', 'quote_id'],
    stock_movements: ['id', 'workspace_id', 'quote_id', 'movement_type'],
    warehouse_workflows: ['id', 'workspace_id', 'quote_id', 'status'],
    audit_log: ['id', 'workspace_id', 'action']
  });

  function adapter() { return ROOT.BackendSyncAdapter || null; }
  function syncConsole() { return ROOT.SupabaseSyncConsole || null; }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function safeJson(value) { try { return JSON.stringify(value, null, 2); } catch (_) { return '{}'; } }
  function tableFor(rowKey, payload) { return (payload && payload.table_map && payload.table_map[rowKey]) || rowKey; }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function normalizePayload(input, options) {
    if (input && input.type === 'feg-stage-pro-backend-sync-payload') return clone(input);
    if (syncConsole() && syncConsole().buildSeedSyncPayload) return syncConsole().buildSeedSyncPayload(options || {});
    if (adapter() && adapter().buildSyncPayload) return adapter().buildSyncPayload(input || {}, options || {});
    return { type: 'feg-stage-pro-backend-sync-payload', version: BACKEND_WRITE_DRY_RUN_VERSION, workspace_id: 'main', rows: {} };
  }

  function countRows(rows) {
    return Object.values(rows || {}).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
  }

  function validateRowsForWrite(input, options) {
    const payload = normalizePayload(input, options);
    const baseValidation = adapter() && adapter().validateSyncPayload ? adapter().validateSyncPayload(payload) : { ok: true, errors: [] };
    const errors = Array.isArray(baseValidation.errors) ? baseValidation.errors.slice() : [];
    const warnings = [];
    const rows = payload.rows || {};
    const seenByTable = {};
    const quoteIds = new Set((rows.quotes || []).map(row => toText(row.id)).filter(Boolean));
    const equipmentIds = new Set((rows.equipment_items || []).map(row => toText(row.id)).filter(Boolean));
    const supplierIds = new Set((rows.suppliers || []).map(row => toText(row.id)).filter(Boolean));

    Object.entries(REQUIRED_FIELDS).forEach(([key, fields]) => {
      const list = Array.isArray(rows[key]) ? rows[key] : [];
      seenByTable[key] = new Set();
      list.forEach((row, index) => {
        fields.forEach(field => {
          if (!toText(row && row[field])) errors.push(`${key}[${index}].${field} is required before write`);
        });
        const id = toText(row && row.id);
        if (id) {
          if (seenByTable[key].has(id)) errors.push(`${key}[${index}].id duplicates ${id}`);
          seenByTable[key].add(id);
        }
        if (row && row.workspace_id && payload.workspace_id && row.workspace_id !== payload.workspace_id) warnings.push(`${key}[${index}] workspace_id differs from payload workspace_id`);
      });
    });

    ['quote_sections', 'quote_items', 'reservations', 'stock_movements', 'warehouse_workflows'].forEach(key => {
      (rows[key] || []).forEach((row, index) => {
        const quoteId = toText(row.quote_id);
        if (quoteId && quoteIds.size && !quoteIds.has(quoteId)) warnings.push(`${key}[${index}] references quote_id not present in this payload: ${quoteId}`);
      });
    });

    (rows.quote_items || []).forEach((row, index) => {
      const itemId = toText(row.item_id);
      const source = toText(row.source_type || 'own');
      if (itemId && equipmentIds.size && !equipmentIds.has(itemId) && source === 'own') warnings.push(`quote_items[${index}] item_id is not present in payload equipment_items: ${itemId}`);
      if ((source === 'subrent' || source === 'subrent_needed') && !toText(row.supplier_id || row.supplier_name)) warnings.push(`quote_items[${index}] subrent row has no supplier`);
      const supplierId = toText(row.supplier_id);
      if (supplierId && supplierIds.size && !supplierIds.has(supplierId)) warnings.push(`quote_items[${index}] supplier_id is not present in payload suppliers: ${supplierId}`);
    });

    return {
      type: 'feg-stage-pro-backend-write-validation',
      version: BACKEND_WRITE_DRY_RUN_VERSION,
      generated_at: nowIso(),
      ok: errors.length === 0,
      errors,
      warnings,
      payload_summary: buildPayloadSummary(payload)
    };
  }

  function buildPayloadSummary(input, options) {
    const payload = normalizePayload(input, options);
    const rows = payload.rows || {};
    const counts = {};
    WRITE_ORDER.forEach(key => { counts[key] = Array.isArray(rows[key]) ? rows[key].length : 0; });
    Object.keys(rows).forEach(key => { if (!(key in counts)) counts[key] = Array.isArray(rows[key]) ? rows[key].length : 0; });
    return {
      workspace_id: payload.workspace_id || 'main',
      mode: payload.mode || 'local',
      generated_at: payload.generated_at || '',
      row_counts: counts,
      total_rows: countRows(rows)
    };
  }

  function buildWriteBatches(input, options) {
    const payload = normalizePayload(input, options);
    const rows = payload.rows || {};
    const batches = WRITE_ORDER
      .map((key, index) => {
        const list = Array.isArray(rows[key]) ? rows[key] : [];
        return {
          order: index + 1,
          row_key: key,
          table: tableFor(key, payload),
          operation: 'upsert',
          conflict_target: key === 'audit_log' ? 'id' : 'id',
          rows: list.length,
          dry_run: true,
          sample_ids: list.slice(0, 5).map(row => toText(row.id || row.code || row.name)).filter(Boolean)
        };
      })
      .filter(batch => batch.rows > 0);
    return {
      type: 'feg-stage-pro-backend-write-batches',
      version: BACKEND_WRITE_DRY_RUN_VERSION,
      generated_at: nowIso(),
      workspace_id: payload.workspace_id || 'main',
      total_rows: batches.reduce((sum, batch) => sum + batch.rows, 0),
      batches
    };
  }

  function buildSqlPreview(input, options) {
    const payload = normalizePayload(input, options);
    const batches = buildWriteBatches(payload).batches;
    const lines = [];
    lines.push('-- FEG Stage PRO backend write dry-run preview');
    lines.push('-- No SQL is executed by the client. This is an operation preview only.');
    lines.push(`-- workspace_id: ${payload.workspace_id || 'main'}`);
    lines.push('begin;');
    batches.forEach(batch => {
      lines.push(`-- ${batch.order}. ${batch.operation.toUpperCase()} ${batch.rows} row(s) into ${batch.table}`);
      lines.push(`-- conflict target: ${batch.conflict_target}`);
      lines.push(`-- sample ids: ${(batch.sample_ids || []).join(', ') || 'n/a'}`);
    });
    lines.push('rollback; -- dry-run only');
    return lines.join('\n');
  }

  function buildWriteDryRunReport(input, options) {
    const opts = options || {};
    const payload = normalizePayload(input, opts);
    const validation = validateRowsForWrite(payload, opts);
    const batches = buildWriteBatches(payload, opts);
    const cfg = adapter() && adapter().getRuntimeConfig ? adapter().getRuntimeConfig(opts.config) : (opts.config || {});
    const connection = syncConsole() && syncConsole().buildConnectionReport ? syncConsole().buildConnectionReport(opts.config) : null;
    const remoteRequested = Boolean(cfg && cfg.enableRemoteSync && cfg.mode === 'supabase');
    const canAttemptRemoteWrite = Boolean(validation.ok && connection && connection.configured && connection.effective_mode === 'supabase' && remoteRequested && cfg.dryRun === false);
    const blockers = validation.errors.slice();
    const warnings = validation.warnings.slice();
    if (!connection || !connection.configured) warnings.push('Supabase не настроен: write dry-run остаётся локальным отчётом.');
    if (!remoteRequested) warnings.push('Remote write не запрошен: enableRemoteSync выключен или backendMode не supabase.');
    if (cfg && cfg.dryRun !== false) warnings.push('dryRun включён: реальная запись заблокирована по настройкам.');
    return {
      type: 'feg-stage-pro-backend-write-dry-run-report',
      version: BACKEND_WRITE_DRY_RUN_VERSION,
      generated_at: nowIso(),
      workspace_id: payload.workspace_id || 'main',
      mode: payload.mode || 'local',
      can_attempt_remote_write: canAttemptRemoteWrite,
      safe_for_first_write: validation.ok && batches.total_rows > 0,
      blockers,
      warnings,
      validation,
      batches,
      sql_preview: buildSqlPreview(payload, opts),
      payload
    };
  }

  function reportToText(report) {
    const r = report || buildWriteDryRunReport();
    const lines = [];
    lines.push('FEG Stage PRO — Backend First Write Dry Run+');
    lines.push(`Версия: ${BACKEND_WRITE_DRY_RUN_VERSION}`);
    lines.push(`Дата: ${r.generated_at || nowIso()}`);
    lines.push(`Workspace: ${r.workspace_id || 'main'}`);
    lines.push(`Можно пробовать remote write: ${r.can_attempt_remote_write ? 'да' : 'нет'}`);
    lines.push(`Безопасно для первого dry-run: ${r.safe_for_first_write ? 'да' : 'нет'}`);
    lines.push('');
    lines.push('План записи:');
    (r.batches && r.batches.batches || []).forEach(batch => lines.push(`- ${batch.order}. ${batch.table}: ${batch.operation}, строк ${batch.rows}`));
    if (r.blockers && r.blockers.length) {
      lines.push(''); lines.push('Blockers:'); r.blockers.forEach(item => lines.push(`- ${item}`));
    }
    if (r.warnings && r.warnings.length) {
      lines.push(''); lines.push('Warnings:'); r.warnings.forEach(item => lines.push(`- ${item}`));
    }
    lines.push('');
    lines.push(r.sql_preview || '');
    return lines.join('\n');
  }

  function renderWriteDryRunConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = { report: buildWriteDryRunReport(opts.payload, opts) };
    function render() {
      const report = state.report;
      const batches = report.batches && report.batches.batches || [];
      root.innerHTML = `
        <div class="v4-card v4-sync-console v4-write-dry-run-console">
          <div class="v4-kicker">Backend / Sync · write dry-run+</div>
          <h3>Backend First Write Dry Run+</h3>
          <p class="v4-muted">Проверка готовности первого серверного upsert без записи в Supabase. Таблицы, порядок, обязательные поля, связи и SQL-preview.</p>
          <div class="v4-mini-grid">
            <div class="v4-mini"><span>Safe dry-run</span><b>${report.safe_for_first_write ? 'да' : 'нет'}</b></div>
            <div class="v4-mini"><span>Remote write</span><b>${report.can_attempt_remote_write ? 'можно' : 'закрыт'}</b></div>
            <div class="v4-mini"><span>Строк</span><b>${escapeHtml(report.batches && report.batches.total_rows || 0)}</b></div>
            <div class="v4-mini"><span>Таблиц</span><b>${escapeHtml(batches.length)}</b></div>
          </div>
          <div class="v4-table-wrap">
            <table class="v4-table v4-table--sync"><thead><tr><th>#</th><th>Таблица</th><th>Операция</th><th>Строк</th><th>Sample IDs</th></tr></thead><tbody>
              ${batches.map(batch => `<tr><td>${batch.order}</td><td>${escapeHtml(batch.table)}</td><td>${escapeHtml(batch.operation)}</td><td>${batch.rows}</td><td>${escapeHtml((batch.sample_ids || []).join(', '))}</td></tr>`).join('') || '<tr><td colspan="5">Нет строк для записи</td></tr>'}
            </tbody></table>
          </div>
          ${renderIssueBox('Blockers', report.blockers, 'bad')}
          ${renderIssueBox('Warnings', report.warnings, 'warn')}
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-write-dry-run="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-write-dry-run="copy-text">Копировать отчёт</button>
            <button type="button" class="btn-secondary" data-write-dry-run="download-report">Скачать report JSON</button>
            <button type="button" class="btn-secondary" data-write-dry-run="download-sql">Скачать SQL preview</button>
            <button type="button" class="btn-secondary" data-write-dry-run="download-payload">Скачать payload JSON</button>
          </div>
          <details class="v4-json-details" open><summary>SQL preview</summary><pre>${escapeHtml(report.sql_preview)}</pre></details>
          <details class="v4-json-details"><summary>JSON report</summary><pre>${escapeHtml(safeJson(report))}</pre></details>
        </div>`;
      root.querySelectorAll('[data-write-dry-run]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-write-dry-run'))));
    }
    function handleAction(action) {
      if (action === 'refresh') { state.report = buildWriteDryRunReport(opts.payload, opts); render(); return; }
      if (action === 'copy-text' && GLOBAL.navigator && navigator.clipboard) navigator.clipboard.writeText(reportToText(state.report)).catch(() => {});
      if (action === 'download-report') downloadFile('feg_backend_write_dry_run_report.json', safeJson(state.report));
      if (action === 'download-sql') downloadFile('feg_backend_write_dry_run.sql', state.report.sql_preview || '');
      if (action === 'download-payload') downloadFile('feg_backend_sync_payload.json', safeJson(state.report.payload || {}));
    }
    render();
    return root;
  }

  function renderIssueBox(title, items, tone) {
    if (!items || !items.length) return '';
    return `<div class="v4-sync-issues ${tone || ''}"><b>${escapeHtml(title)}</b>${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  function downloadFile(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (_) {}
  }

  ROOT.BackendWriteDryRun = {
    BACKEND_WRITE_DRY_RUN_VERSION,
    WRITE_ORDER,
    REQUIRED_FIELDS,
    normalizePayload,
    buildPayloadSummary,
    validateRowsForWrite,
    buildWriteBatches,
    buildSqlPreview,
    buildWriteDryRunReport,
    reportToText,
    renderWriteDryRunConsole
  };
})();
