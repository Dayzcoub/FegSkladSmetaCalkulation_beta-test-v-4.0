(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const EQUIPMENT_SYNC_VERSION = '3.12.0';
  const STORAGE_KEY = 'fegV4EquipmentServerSyncQueue';
  const STATUS = Object.freeze({
    LOCAL_ONLY: 'local_only',
    READY: 'ready_to_sync',
    STAGED: 'staged',
    SYNCED: 'synced',
    ERROR: 'sync_error'
  });

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }

  function equipmentDb() { return ROOT.EquipmentDatabase || null; }
  function adapter() { return ROOT.BackendSyncAdapter || null; }
  function dryRun() { return ROOT.BackendWriteDryRun || null; }
  function suppliers() { return ROOT.SupplierDirectory || null; }

  function getStorage(storage) {
    if (storage) return storage;
    try { if (GLOBAL.localStorage) return GLOBAL.localStorage; } catch (_) {}
    return null;
  }

  function readQueue(storage) {
    const store = getStorage(storage);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeQueue(rows, storage) {
    const safe = Array.isArray(rows) ? rows : [];
    const store = getStorage(storage);
    if (store) store.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  }

  function listEquipmentItems(options) {
    const opts = options || {};
    if (Array.isArray(opts.items)) return equipmentDb() && equipmentDb().normalizeItems ? equipmentDb().normalizeItems(opts.items) : opts.items;
    if (equipmentDb() && equipmentDb().listItems) return equipmentDb().listItems({ onlyActive: opts.onlyActive !== false });
    return [];
  }

  function normalizeEquipmentRows(items, options) {
    const opts = options || {};
    const workspaceId = toText(opts.workspaceId || (GLOBAL.FEG_APP_CONFIG && GLOBAL.FEG_APP_CONFIG.workspaceId) || 'main') || 'main';
    const db = equipmentDb();
    const list = db && db.normalizeItems ? db.normalizeItems(items || []) : (items || []);
    if (db && db.mapItemToEquipmentRow) return list.map(item => db.mapItemToEquipmentRow(item, workspaceId));
    return list.map(item => {
      const stockQty = toNumber(item.stock_qty != null ? item.stock_qty : item.stockQty, 0);
      const reservedQty = Math.max(0, Math.min(stockQty, toNumber(item.reserved_qty != null ? item.reserved_qty : item.reservedQty, 0)));
      return {
        id: toText(item.id),
        workspace_id: toText(item.workspace_id || item.workspaceId || workspaceId) || workspaceId,
        category: toText(item.category),
        subcategory: toText(item.subcategory),
        type: toText(item.type),
        code: toText(item.code),
        name: toText(item.name),
        manufacturer: toText(item.manufacturer),
        model: toText(item.model),
        unit: toText(item.unit || 'шт'),
        stock_qty: stockQty,
        reserved_qty: reservedQty,
        available_qty: Math.max(0, stockQty - reservedQty),
        weight_kg: toNumber(item.weight_kg != null ? item.weight_kg : item.weightKg, 0),
        power_w: toNumber(item.power_w != null ? item.power_w : item.powerW, 0),
        startup_power_w: toNumber(item.startup_power_w != null ? item.startup_power_w : item.startupPowerW, 0),
        rental_price: toNumber(item.rental_price != null ? item.rental_price : item.rentalPrice, 0),
        replacement_cost: toNumber(item.replacement_cost != null ? item.replacement_cost : item.replacementCost, 0),
        is_active: item.is_active != null ? Boolean(item.is_active) : item.isActive !== false,
        source_type: toText(item.source_type || item.sourceType || 'own') || 'own',
        supplier_id: toText(item.supplier_id || item.supplierId || ''),
        supplier_name: toText(item.supplier_name || item.supplierName || ''),
        notes: toText(item.notes || item.comment || ''),
        meta: clone(item.meta || {}),
        raw_payload: clone(item)
      };
    });
  }

  function getSupplierRows(equipmentItems) {
    try {
      if (suppliers() && suppliers().buildFromEquipmentItems) return suppliers().buildFromEquipmentItems(equipmentItems || []);
    } catch (_) {}
    const byName = new Map();
    (equipmentItems || []).forEach(item => {
      const name = toText(item.supplierName || item.supplier_name);
      if (!name || byName.has(name.toLowerCase())) return;
      byName.set(name.toLowerCase(), {
        id: toText(item.supplierId || item.supplier_id) || `supplier-${name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '')}`,
        name,
        categories: [toText(item.category)].filter(Boolean),
        notes: 'Авто-строка из базы оборудования'
      });
    });
    return Array.from(byName.values());
  }

  function buildEquipmentSyncPayload(options) {
    const opts = options || {};
    const items = listEquipmentItems(opts);
    const supplierRows = opts.includeSuppliers === false ? [] : getSupplierRows(items);
    if (adapter() && adapter().buildSyncPayload) {
      return adapter().buildSyncPayload({
        equipment_items: items,
        suppliers: supplierRows
      }, {
        workspaceId: opts.workspaceId || (GLOBAL.FEG_APP_CONFIG && GLOBAL.FEG_APP_CONFIG.workspaceId) || 'main',
        config: opts.config || GLOBAL.FEG_APP_CONFIG || {}
      });
    }
    const workspaceId = toText(opts.workspaceId || 'main');
    return {
      type: 'feg-stage-pro-backend-sync-payload',
      version: EQUIPMENT_SYNC_VERSION,
      mode: 'local',
      generated_at: nowIso(),
      workspace_id: workspaceId,
      table_map: { equipment_items: 'equipment_items', suppliers: 'suppliers' },
      rows: {
        equipment_items: normalizeEquipmentRows(items, { workspaceId }),
        suppliers: supplierRows
      }
    };
  }

  function validateEquipmentRows(items, options) {
    const opts = options || {};
    const list = listEquipmentItems(Object.assign({}, opts, { items }));
    const db = equipmentDb();
    const errors = [];
    const warnings = [];
    const seenIds = new Set();
    const seenCodes = new Map();
    list.forEach((item, index) => {
      const id = toText(item.id);
      const code = toText(item.code);
      const name = toText(item.name);
      const category = toText(item.category);
      const itemType = toText(item.type);
      if (!id) errors.push(`equipment_items[${index}].id is required`);
      if (!name) errors.push(`equipment_items[${index}].name is required`);
      if (id && seenIds.has(id)) errors.push(`equipment_items[${index}].id duplicates ${id}`);
      if (id) seenIds.add(id);
      if (!code) warnings.push(`equipment_items[${index}] has no code: ${name || id || 'unnamed'}`);
      if (code) {
        const key = code.toLowerCase();
        if (seenCodes.has(key)) warnings.push(`equipment_items code duplicates ${code}: ${seenCodes.get(key)} / ${name || id}`);
        else seenCodes.set(key, name || id);
      }
      if (!category) warnings.push(`equipment_items[${index}] has no category: ${name || id}`);
      if (category && db && db.getCategory && !db.getCategory(category)) warnings.push(`equipment_items[${index}].category is not in CATEGORY_TREE: ${category}`);
      if (!itemType) warnings.push(`equipment_items[${index}] has no type: ${name || id}`);
      if (db && db.isTypeCompatibleWithCategory && itemType && category && !db.isTypeCompatibleWithCategory(itemType, category)) warnings.push(`equipment_items[${index}].type ${itemType} does not match category ${category}`);
      const stockQty = toNumber(item.stockQty != null ? item.stockQty : item.stock_qty, 0);
      const reservedQty = toNumber(item.reservedQty != null ? item.reservedQty : item.reserved_qty, 0);
      const availableQty = toNumber(item.availableQty != null ? item.availableQty : item.available_qty, Math.max(0, stockQty - reservedQty));
      if (stockQty < 0) errors.push(`equipment_items[${index}].stock_qty must be >= 0`);
      if (reservedQty < 0) errors.push(`equipment_items[${index}].reserved_qty must be >= 0`);
      if (reservedQty > stockQty) warnings.push(`equipment_items[${index}].reserved_qty is greater than stock_qty and will be clamped locally`);
      if (availableQty !== Math.max(0, stockQty - Math.min(stockQty, reservedQty))) warnings.push(`equipment_items[${index}].available_qty should equal stock_qty - reserved_qty`);
    });
    const schemaReport = db && db.buildSyncSchemaReport ? db.buildSyncSchemaReport(list, opts) : null;
    return {
      type: 'feg-stage-pro-equipment-sync-validation',
      version: EQUIPMENT_SYNC_VERSION,
      generated_at: nowIso(),
      ok: errors.length === 0,
      errors,
      warnings,
      counts: summarizeItems(list),
      schema_report: schemaReport
    };
  }

  function summarizeItems(items) {
    const list = Array.isArray(items) ? items : listEquipmentItems();
    const active = list.filter(item => item.is_active != null ? item.is_active : item.isActive !== false).length;
    const stockQty = list.reduce((sum, item) => sum + toNumber(item.stockQty != null ? item.stockQty : item.stock_qty, 0), 0);
    const reservedQty = list.reduce((sum, item) => sum + toNumber(item.reservedQty != null ? item.reservedQty : item.reserved_qty, 0), 0);
    const categories = {};
    list.forEach(item => { const key = toText(item.category || 'unknown') || 'unknown'; categories[key] = (categories[key] || 0) + 1; });
    return { total: list.length, active, inactive: list.length - active, stockQty, reservedQty, categories };
  }


  function buildEquipmentSyncPreview(options) {
    const opts = options || {};
    const items = listEquipmentItems(opts);
    const db = equipmentDb();
    if (db && db.buildEquipmentSyncPreview) return db.buildEquipmentSyncPreview(items, opts);
    const validation = validateEquipmentRows(items, opts);
    return {
      type: 'feg-stage-pro-equipment-sync-preview',
      version: EQUIPMENT_SYNC_VERSION,
      generatedAt: nowIso(),
      workspaceId: toText(opts.workspaceId || 'main') || 'main',
      mode: 'preview-only',
      note: 'No backend writes are executed by this report.',
      rowCount: items.length,
      statusCounts: { ready: validation.ok ? items.length : 0, warning: validation.warnings.length ? items.length : 0, blocked: validation.ok ? 0 : items.length },
      blockerCount: validation.errors.length,
      warningCount: validation.warnings.length,
      blockers: validation.errors.map(message => ({ severity: 'blocker', message })),
      warnings: validation.warnings.map(message => ({ severity: 'warning', message })),
      fieldCoverage: {},
      tablePreview: [{ table: 'equipment_items', operation: 'upsert', conflictTarget: 'id', rowCount: items.length }],
      payloadSampleRows: normalizeEquipmentRows(items, opts).slice(0, 12),
      rows: [],
      ok: validation.ok
    };
  }


  function buildEquipmentReadinessReport(options) {
    const opts = options || {};
    const items = listEquipmentItems(opts);
    const db = equipmentDb();
    if (db && db.buildEquipmentReadinessReport) return db.buildEquipmentReadinessReport(items, Object.assign({}, opts, { includeRows: false }));
    const preview = buildEquipmentSyncPreview(opts);
    return {
      type: 'feg-stage-pro-equipment-readiness-report',
      version: EQUIPMENT_SYNC_VERSION,
      generatedAt: nowIso(),
      rowCount: items.length,
      status: preview.ok ? 'ready_clean' : 'blocked',
      score: preview.ok ? 100 : 0,
      counts: { total: (preview.blockerCount || 0) + (preview.warningCount || 0), blocker: preview.blockerCount || 0, safe_fix: 0, manual: preview.warningCount || 0 },
      blockers: preview.blockers || [],
      manualTasks: preview.warnings || [],
      safeFixTasks: [],
      ok: preview.ok,
      readyForFirstWrite: preview.ok
    };
  }


  function getCurrentRole(options) {
    const opts = options || {};
    if (opts.role) return toText(opts.role);
    try {
      const state = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : null;
      if (state && state.role) return toText(state.role);
    } catch (_) {}
    return 'viewer';
  }

  function buildEquipmentStagedDiff(options) {
    const opts = options || {};
    const db = equipmentDb();
    const items = listEquipmentItems(opts);
    const queue = readQueue(opts.storage);
    const latestStaged = queue.find(row => row.status === STATUS.STAGED) || null;
    const baselineRows = Array.isArray(opts.remoteRows)
      ? opts.remoteRows
      : (latestStaged && latestStaged.payload && latestStaged.payload.rows && latestStaged.payload.rows.equipment_items ? latestStaged.payload.rows.equipment_items : []);
    if (db && db.buildEquipmentStagedDiff) return db.buildEquipmentStagedDiff(items, baselineRows, opts);
    const rows = normalizeEquipmentRows(items, opts);
    return {
      type: 'feg-stage-pro-equipment-staged-diff',
      version: EQUIPMENT_SYNC_VERSION,
      generatedAt: nowIso(),
      mode: baselineRows.length ? 'compare-with-staged-baseline' : 'first-write-baseline-empty',
      baselineRows: baselineRows.length,
      localRows: rows.length,
      statusCounts: { insert: baselineRows.length ? 0 : rows.length, update: 0, unchanged: baselineRows.length ? rows.length : 0, remote_only: 0 },
      operations: rows.map(row => ({ operation: baselineRows.length ? 'unchanged' : 'insert', id: row.id, code: row.code, name: row.name, row })),
      ok: true
    };
  }

  function buildEquipmentControlledWritePlan(options) {
    const opts = options || {};
    const cfg = adapter() && adapter().getRuntimeConfig ? adapter().getRuntimeConfig(opts.config || GLOBAL.FEG_APP_CONFIG || {}) : { mode: 'local', enableRemoteSync: false, dryRun: true };
    const role = getCurrentRole(opts);
    const queue = readQueue(opts.storage);
    const staged = queue.find(row => row.status === STATUS.STAGED) || null;
    const dryRunReport = buildEquipmentWriteDryRun(opts);
    const diff = buildEquipmentStagedDiff(opts);
    const explicitToggle = opts.enableRemoteWrite === true || opts.allowRemoteWrite === true || cfg.enableEquipmentWrite === true;
    const confirmOk = toText(opts.confirmPhrase || '').toUpperCase() === 'WRITE EQUIPMENT';
    const gates = [
      { key: 'admin_role', label: 'Только admin может запускать equipment write', ok: role === 'admin' },
      { key: 'staged_payload', label: 'Есть staged equipment payload', ok: Boolean(staged) },
      { key: 'dry_run_clean', label: 'Dry-run без blockers', ok: Boolean(dryRunReport.safe_for_first_write) && !(dryRunReport.blockers || []).length },
      { key: 'remote_mode_requested', label: 'Backend mode supabase + enableRemoteSync', ok: cfg.mode === 'supabase' && cfg.enableRemoteSync === true },
      { key: 'explicit_write_toggle', label: 'Явный equipment write toggle включён', ok: explicitToggle },
      { key: 'dry_run_disabled', label: 'dryRun=false задан явно', ok: cfg.dryRun === false || opts.dryRun === false },
      { key: 'confirm_phrase', label: 'Контрольная фраза WRITE EQUIPMENT', ok: confirmOk }
    ];
    const blockers = gates.filter(gate => !gate.ok).map(gate => gate.label);
    const remoteWriteArmed = blockers.length === 0;
    return {
      type: 'feg-stage-pro-equipment-controlled-write-plan',
      version: EQUIPMENT_SYNC_VERSION,
      generated_at: nowIso(),
      mode: remoteWriteArmed ? 'armed_remote_write' : 'dry_run_only',
      role,
      remote_write_armed: remoteWriteArmed,
      remote_write_executed: false,
      note: 'This plan is an admin-only write gate. The UI keeps remote writes disabled by default and requires explicit server/runtime configuration.',
      gates,
      blockers,
      staged_id: staged && staged.id || '',
      row_counts: staged && staged.rowCounts || null,
      dry_run: { safe_for_first_write: dryRunReport.safe_for_first_write, blockers: dryRunReport.blockers || [], warnings: dryRunReport.warnings || [] },
      staged_diff: diff,
      ok: remoteWriteArmed
    };
  }

  function runControlledEquipmentWrite(options) {
    const opts = options || {};
    const plan = buildEquipmentControlledWritePlan(opts);
    if (!plan.remote_write_armed) {
      return { type: 'feg-stage-pro-equipment-controlled-write-result', version: EQUIPMENT_SYNC_VERSION, generated_at: nowIso(), ok: false, status: 'blocked_by_write_gate', remote_write_executed: false, plan };
    }
    return { type: 'feg-stage-pro-equipment-controlled-write-result', version: EQUIPMENT_SYNC_VERSION, generated_at: nowIso(), ok: false, status: 'remote_write_not_enabled_in_static_build', remote_write_executed: false, message: 'Remote Supabase upsert remains disabled in this static build. Use this plan as the final gate before implementing the backend write function.', plan };
  }

  function buildEquipmentWriteDryRun(options) {
    const opts = options || {};
    const payload = buildEquipmentSyncPayload(opts);
    const localValidation = validateEquipmentRows(listEquipmentItems(opts), opts);
    const syncPreview = buildEquipmentSyncPreview(opts);
    const readinessReport = buildEquipmentReadinessReport(opts);
    let report = null;
    if (dryRun() && dryRun().buildWriteDryRunReport) {
      report = dryRun().buildWriteDryRunReport(payload, opts);
    } else {
      report = {
        type: 'feg-stage-pro-equipment-write-dry-run',
        version: EQUIPMENT_SYNC_VERSION,
        generated_at: nowIso(),
        safe_for_first_write: localValidation.ok,
        blockers: localValidation.errors.slice(),
        warnings: localValidation.warnings.slice(),
        payload,
        validation: { payload_summary: { row_counts: { equipment_items: payload.rows.equipment_items.length, suppliers: (payload.rows.suppliers || []).length } } }
      };
    }
    report.equipment_validation = localValidation;
    report.equipment_sync_preview = syncPreview;
    report.equipment_readiness_report = readinessReport;
    const previewBlockers = (syncPreview.blockers || []).map(issue => issue.message || String(issue));
    const previewWarnings = (syncPreview.warnings || []).map(issue => issue.message || String(issue));
    const readinessBlockers = (readinessReport.blockers || []).map(issue => issue.message || String(issue));
    report.blockers = Array.from(new Set([].concat(report.blockers || [], localValidation.errors || [], previewBlockers || [], readinessBlockers || [])));
    report.warnings = Array.from(new Set([].concat(report.warnings || [], localValidation.warnings || [], previewWarnings || [])));
    report.safe_for_first_write = report.blockers.length === 0 && syncPreview.ok;
    return report;
  }

  function getSyncStatus(options) {
    const opts = options || {};
    const queue = readQueue(opts.storage);
    const latest = queue[0] || null;
    if (latest && latest.status === STATUS.STAGED) return { status: STATUS.STAGED, label: 'equipment staged', tone: 'warn', queue: latest, reasons: [`В очереди: ${latest.stagedAt || latest.updatedAt || ''}`] };
    try {
      const report = buildEquipmentWriteDryRun(opts);
      if (report.safe_for_first_write && !(report.blockers || []).length) return { status: STATUS.READY, label: 'ready to sync', tone: 'ok', report, reasons: (report.warnings || []).slice(0, 4) };
      return { status: STATUS.LOCAL_ONLY, label: 'local only', tone: 'muted', report, reasons: (report.blockers || []).concat(report.warnings || []).slice(0, 6) };
    } catch (err) {
      return { status: STATUS.ERROR, label: 'sync error', tone: 'bad', reasons: [err && err.message || 'Equipment sync check failed'] };
    }
  }

  function stageEquipment(options) {
    const opts = options || {};
    const report = buildEquipmentWriteDryRun(opts);
    const payload = report.payload || buildEquipmentSyncPayload(opts);
    const row = {
      type: 'feg-stage-pro-equipment-sync-queue-row',
      version: EQUIPMENT_SYNC_VERSION,
      id: `equipment-sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      workspaceId: payload.workspace_id || 'main',
      status: STATUS.STAGED,
      stagedAt: nowIso(),
      updatedAt: nowIso(),
      safeForFirstWrite: Boolean(report.safe_for_first_write),
      blockers: clone(report.blockers || []),
      warnings: clone(report.warnings || []),
      rowCounts: {
        equipment_items: payload.rows && payload.rows.equipment_items ? payload.rows.equipment_items.length : 0,
        suppliers: payload.rows && payload.rows.suppliers ? payload.rows.suppliers.length : 0
      },
      dryRunReport: report,
      syncPreview: report.equipment_sync_preview || null,
      readinessReport: report.equipment_readiness_report || null,
      payload
    };
    const rows = readQueue(opts.storage);
    rows.unshift(row);
    writeQueue(rows.slice(0, 10), opts.storage);
    return row;
  }

  function unstageLatest(options) {
    const opts = options || {};
    const rows = readQueue(opts.storage).filter(row => row.status !== STATUS.STAGED);
    writeQueue(rows, opts.storage);
    return rows;
  }

  function buildQueueReport(options) {
    const opts = options || {};
    const items = listEquipmentItems(opts);
    const queue = readQueue(opts.storage);
    const sync = getSyncStatus(opts);
    return {
      type: 'feg-stage-pro-equipment-sync-queue-report',
      version: EQUIPMENT_SYNC_VERSION,
      generated_at: nowIso(),
      status: sync.status,
      label: sync.label,
      counts: summarizeItems(items),
      queue,
      validation: validateEquipmentRows(items, opts),
      sync_preview: buildEquipmentSyncPreview(opts),
      readiness_report: buildEquipmentReadinessReport(opts),
      staged_diff: buildEquipmentStagedDiff(opts),
      controlled_write_plan: buildEquipmentControlledWritePlan(Object.assign({}, opts, { role: opts.role || getCurrentRole(opts) })),
      type_report: equipmentDb() && equipmentDb().buildTypeReport ? equipmentDb().buildTypeReport(items) : null,
      schema_report: equipmentDb() && equipmentDb().buildSyncSchemaReport ? equipmentDb().buildSyncSchemaReport(items, opts) : null,
      dry_run: sync.report || null
    };
  }

  function renderStatusBadge(sync) {
    const item = sync || { status: STATUS.LOCAL_ONLY, label: 'local only', tone: 'muted' };
    return `<span class="v4-sync-badge ${escapeHtml(item.tone || 'muted')}">${escapeHtml(item.label || item.status)}</span>`;
  }

  function renderEquipmentSyncConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = { report: buildQueueReport(opts) };
    function render() {
      const report = state.report;
      const reasons = (report.dry_run && (report.dry_run.blockers || []).concat(report.dry_run.warnings || [])) || report.validation.warnings || [];
      root.innerHTML = `
        <div class="v4-card v4-sync-console v4-equipment-sync-console">
          <div class="v4-kicker">Backend / Sync · equipment</div>
          <h3>Equipment Server Sync groundwork</h3>
          <p class="v4-muted">Безопасная очередь синхронизации базы оборудования: validation, staged payload, dry-run и подготовка к будущему upsert в <code>equipment_items</code>.</p>
          <div class="v4-mini-grid">
            <div class="v4-mini"><span>Позиций</span><b>${escapeHtml(report.counts.total)}</b></div>
            <div class="v4-mini"><span>Активных</span><b>${escapeHtml(report.counts.active)}</b></div>
            <div class="v4-mini"><span>Stock</span><b>${escapeHtml(report.counts.stockQty)}</b></div>
            <div class="v4-mini"><span>Status</span><b>${renderStatusBadge({ label: report.label, status: report.status, tone: report.status === STATUS.READY ? 'ok' : report.status === STATUS.STAGED ? 'warn' : 'muted' })}</b></div>
          </div>
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-equipment-sync="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-equipment-sync="dry-run">Скачать dry-run</button>
            <button type="button" class="btn-secondary" data-equipment-sync="preview">Скачать preview</button>
            <button type="button" class="btn-secondary" data-equipment-sync="readiness">Скачать readiness</button>
            <button type="button" class="btn-secondary" data-equipment-sync="diff">Скачать diff</button>
            <button type="button" class="btn-secondary" data-equipment-sync="write-plan">Write plan</button>
            <button type="button" class="btn-secondary" data-equipment-sync="stage">Stage equipment</button>
            <button type="button" class="btn-secondary" data-equipment-sync="unstage">Убрать staged</button>
            <button type="button" class="btn-secondary" data-equipment-sync="download-queue">Скачать queue</button>
            <button type="button" class="btn-secondary" data-equipment-sync="download-payload">Скачать payload</button>
          </div>
          <div class="v4-table-wrap">
            <table class="v4-table v4-table--sync"><thead><tr><th>Проверка</th><th>Статус</th><th>Комментарий</th></tr></thead><tbody>
              <tr><td>Обязательные поля</td><td>${report.validation.ok ? 'OK' : 'BLOCKED'}</td><td>${escapeHtml((report.validation.errors || []).slice(0, 4).join('; ') || 'id/name/workspace готовы')}</td></tr>
              <tr><td>Warnings</td><td>${escapeHtml((report.validation.warnings || []).length)}</td><td>${escapeHtml((report.validation.warnings || []).slice(0, 4).join('; ') || 'нет критичных предупреждений')}</td></tr>
              <tr><td>Sync preview</td><td>${report.sync_preview && report.sync_preview.ok ? 'READY' : 'CHECK'}</td><td>${escapeHtml(report.sync_preview ? `${report.sync_preview.rowCount} rows · ${report.sync_preview.blockerCount} blockers · ${report.sync_preview.warningCount} warnings` : 'preview не построен')}</td></tr>
              <tr><td>Readiness</td><td>${report.readiness_report && report.readiness_report.ok ? 'READY' : 'CHECK'}</td><td>${escapeHtml(report.readiness_report ? `${report.readiness_report.score}% · ${report.readiness_report.status} · manual ${report.readiness_report.counts.manual || 0}` : 'readiness не построен')}</td></tr>
              <tr><td>Staged diff</td><td>${report.staged_diff && report.staged_diff.ok ? 'READY' : 'CHECK'}</td><td>${escapeHtml(report.staged_diff ? `${report.staged_diff.localRows} local · insert ${report.staged_diff.statusCounts.insert || 0} · update ${report.staged_diff.statusCounts.update || 0}` : 'diff не построен')}</td></tr>
              <tr><td>Admin write gate</td><td>${report.controlled_write_plan && report.controlled_write_plan.remote_write_armed ? 'ARMED' : 'DRY-RUN'}</td><td>${escapeHtml(report.controlled_write_plan ? `${(report.controlled_write_plan.blockers || []).length} gates closed · remote write disabled by default` : 'write plan не построен')}</td></tr>
              <tr><td>Type schema</td><td>${report.type_report && report.type_report.ok ? 'OK' : 'CHECK'}</td><td>${escapeHtml(report.type_report ? `${(report.type_report.incompatibleTypes || []).length} несоответствий типа/категории` : 'нет отчёта')}</td></tr>
              <tr><td>Staged queue</td><td>${escapeHtml(report.queue.length)}</td><td>${escapeHtml(report.queue[0] && report.queue[0].stagedAt || 'пока пусто')}</td></tr>
            </tbody></table>
          </div>
          <details class="v4-json-details"><summary>JSON equipment sync report</summary><pre>${escapeHtml(safeJson(report))}</pre></details>
          ${reasons.length ? `<div class="v4-muted" style="margin-top:10px">${reasons.slice(0, 5).map(reason => `<div>• ${escapeHtml(reason)}</div>`).join('')}</div>` : ''}
        </div>`;
      root.querySelectorAll('[data-equipment-sync]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-equipment-sync'))));
    }
    function refresh() { state.report = buildQueueReport(opts); render(); }
    function handleAction(action) {
      if (action === 'refresh') return refresh();
      if (action === 'dry-run') return downloadFile('feg_equipment_sync_dry_run.json', safeJson(buildEquipmentWriteDryRun(opts)));
      if (action === 'preview') return downloadFile('feg_equipment_sync_preview.json', safeJson(buildEquipmentSyncPreview(opts)));
      if (action === 'readiness') return downloadFile('feg_equipment_sync_readiness.json', safeJson(buildEquipmentReadinessReport(opts)));
      if (action === 'diff') return downloadFile('feg_equipment_staged_diff.json', safeJson(buildEquipmentStagedDiff(opts)));
      if (action === 'write-plan') return downloadFile('feg_equipment_controlled_write_plan.json', safeJson(buildEquipmentControlledWritePlan(opts)));
      if (action === 'stage') { stageEquipment(opts); return refresh(); }
      if (action === 'unstage') { unstageLatest(opts); return refresh(); }
      if (action === 'download-queue') return downloadFile('feg_equipment_sync_queue.json', safeJson(readQueue(opts.storage)));
      if (action === 'download-payload') return downloadFile('feg_equipment_sync_payload.json', safeJson(buildEquipmentSyncPayload(opts)));
    }
    render();
    return root;
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

  ROOT.EquipmentServerSyncQueue = {
    EQUIPMENT_SYNC_VERSION,
    STORAGE_KEY,
    STATUS,
    readQueue,
    writeQueue,
    listEquipmentItems,
    buildEquipmentSyncPayload,
    validateEquipmentRows,
    buildEquipmentSyncPreview,
    buildEquipmentReadinessReport,
    buildEquipmentWriteDryRun,
    buildEquipmentStagedDiff,
    buildEquipmentControlledWritePlan,
    runControlledEquipmentWrite,
    getSyncStatus,
    stageEquipment,
    unstageLatest,
    buildQueueReport,
    renderStatusBadge,
    renderEquipmentSyncConsole
  };
})();
