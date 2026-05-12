(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const ADAPTER_VERSION = '1.0.0';
  const LOCAL_SYNC_STORAGE_KEY = 'fegV4BackendSyncSnapshots';
  const DEFAULT_TABLE_MAP = Object.freeze({
    workspaces: 'workspaces',
    profiles: 'profiles',
    inviteKeys: 'invite_keys',
    equipmentCategories: 'equipment_categories',
    equipmentItems: 'equipment_items',
    clients: 'clients',
    quotes: 'quotes',
    quoteSections: 'quote_sections',
    quoteItems: 'quote_items',
    suppliers: 'suppliers',
    stockMovements: 'stock_movements',
    warehouseWorkflows: 'warehouse_workflows',
    reservations: 'reservations',
    calendarIntegrations: 'calendar_integrations',
    auditLog: 'audit_log'
  });

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function getStorage(storage) {
    if (storage) return storage;
    try { if (GLOBAL.localStorage) return GLOBAL.localStorage; } catch (_) {}
    return null;
  }

  function readJson(storage, key, fallback) {
    const store = getStorage(storage);
    if (!store) return clone(fallback);
    try {
      const raw = store.getItem(key);
      if (!raw) return clone(fallback);
      return JSON.parse(raw);
    } catch (_) { return clone(fallback); }
  }

  function writeJson(storage, key, value) {
    const store = getStorage(storage);
    if (!store) return false;
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  function getRuntimeConfig(input) {
    const cfg = input || GLOBAL.FEG_APP_CONFIG || {};
    return {
      mode: toText(cfg.backendMode || cfg.mode || cfg.syncMode || 'local').toLowerCase(),
      supabaseUrl: toText(cfg.supabaseUrl || cfg.SUPABASE_URL || ''),
      supabaseAnonKey: toText(cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || ''),
      workspaceId: toText(cfg.workspaceId || cfg.defaultWorkspaceId || 'main'),
      enableRemoteSync: Boolean(cfg.enableRemoteSync || cfg.enableSupabaseSync || false),
      dryRun: cfg.dryRun !== false,
      tableMap: Object.assign({}, DEFAULT_TABLE_MAP, cfg.tableMap || {})
    };
  }

  function isSupabaseConfigured(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    const sdk = supabaseGlobal || GLOBAL.supabase;
    return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && sdk && typeof sdk.createClient === 'function');
  }

  function getBackendMode(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    if (cfg.mode === 'supabase' && isSupabaseConfigured(cfg, supabaseGlobal) && cfg.enableRemoteSync) return 'supabase';
    return 'local';
  }

  function createSupabaseClient(config, supabaseGlobal) {
    const cfg = getRuntimeConfig(config);
    const sdk = supabaseGlobal || GLOBAL.supabase;
    if (!isSupabaseConfigured(cfg, sdk)) return null;
    return sdk.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function normalizeId(value, prefix) {
    const text = toText(value);
    if (text) return text;
    return `${prefix || 'row'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function mapClientToRow(client, workspaceId) {
    const c = client || {};
    return {
      id: normalizeId(c.id || c.clientId, 'client'),
      local_id: normalizeId(c.id || c.clientId, 'client'),
      workspace_id: toText(c.workspaceId || workspaceId),
      name: toText(c.name || c.company || c.title || 'Новый клиент'),
      company: toText(c.company || c.name || ''),
      company_name: toText(c.company || c.name || ''),
      contact_name: toText(c.contactName || c.contact || ''),
      phone: toText(c.phone || ''),
      email: toText(c.email || ''),
      notes: toText(c.notes || c.comment || ''),
      raw_payload: clone(c)
    };
  }

  function mapQuoteToRow(quote, workspaceId) {
    const q = quote || {};
    const project = q.project || {};
    const venue = q.venue || {};
    const client = q.client || {};
    return {
      id: normalizeId(q.id || q.quoteId, 'quote'),
      local_id: normalizeId(q.id || q.quoteId, 'quote'),
      workspace_id: toText(q.workspaceId || workspaceId),
      client_id: toText(client.id || client.clientId || ''),
      status: toText(q.status || 'draft'),
      title: toText(project.name || q.name || 'Новый проект'),
      project_name: toText(project.name || q.name || 'Новый проект'),
      event_date: toText(project.date || q.date || ''),
      venue_name: toText(venue.name || ''),
      venue_address: toText(venue.address || ''),
      event_address: toText(venue.address || ''),
      contact_name: toText(project.contactName || client.contactName || ''),
      contact_phone: toText(project.contactPhone || client.phone || ''),
      contact_email: toText(project.contactEmail || client.email || ''),
      total_price: toNumber(q.totals && (q.totals.price || q.totals.total || q.totals.rental) || q.totalPrice, 0),
      total_weight_kg: toNumber(q.totals && q.totals.weightKg || q.totalWeightKg, 0),
      total_power_w: toNumber(q.totals && q.totals.powerW || q.totalPowerW, 0),
      raw_payload: clone(q)
    };
  }

  function mapQuoteSectionRows(quote, workspaceId) {
    const q = quote || {};
    const quoteId = normalizeId(q.id || q.quoteId, 'quote');
    const sections = q.sections || q.scope || {};
    const keys = ['stage', 'truss', 'led', 'light', 'sound', 'backline', 'services', 'transport'];
    return keys
      .filter(key => sections[key] || (q[key] && Object.keys(q[key]).length))
      .map(key => ({
        id: `${quoteId}-${key}`,
        local_id: `${quoteId}-${key}`,
        workspace_id: toText(q.workspaceId || workspaceId),
        quote_id: quoteId,
        section_key: key,
        is_enabled: true,
        raw_payload: clone(q[key] || {})
      }));
  }

  function mapEquipmentItemToRow(item, workspaceId) {
    const db = ROOT.EquipmentDatabase;
    if (db && db.mapItemToEquipmentRow) return db.mapItemToEquipmentRow(item, workspaceId);
    const it = item || {};
    const stockQty = toNumber(it.stock_qty != null ? it.stock_qty : it.stockQty, 0);
    const reservedQty = Math.max(0, Math.min(stockQty, toNumber(it.reserved_qty != null ? it.reserved_qty : it.reservedQty, 0)));
    return {
      id: normalizeId(it.id, 'eq'),
      workspace_id: toText(it.workspaceId || workspaceId),
      category: toText(it.category),
      subcategory: toText(it.subcategory),
      type: toText(it.type),
      code: toText(it.code),
      name: toText(it.name),
      manufacturer: toText(it.manufacturer),
      model: toText(it.model),
      unit: toText(it.unit || 'шт'),
      stock_qty: stockQty,
      reserved_qty: reservedQty,
      available_qty: Math.max(0, stockQty - reservedQty),
      weight_kg: toNumber(it.weight_kg != null ? it.weight_kg : it.weightKg, 0),
      power_w: toNumber(it.power_w != null ? it.power_w : it.powerW, 0),
      startup_power_w: toNumber(it.startup_power_w != null ? it.startup_power_w : it.startupPowerW, 0),
      rental_price: toNumber(it.rental_price != null ? it.rental_price : it.rentalPrice, 0),
      replacement_cost: toNumber(it.replacement_cost != null ? it.replacement_cost : it.replacementCost, 0),
      is_active: it.is_active != null ? Boolean(it.is_active) : it.isActive !== false,
      source_type: toText(it.source_type || it.sourceType || 'own') || 'own',
      supplier_id: toText(it.supplier_id || it.supplierId || ''),
      supplier_name: toText(it.supplier_name || it.supplierName || ''),
      notes: toText(it.notes || it.comment || ''),
      meta: clone(it.meta || {}),
      schema_version: toNumber(it.schemaVersion || it.schema_version, 0),
      updated_at: toText(it.updatedAt || it.updated_at || nowIso()),
      raw_payload: clone(it)
    };
  }

  function mapSupplierToRow(supplier, workspaceId) {
    const s = supplier || {};
    return {
      id: normalizeId(s.id, 'supplier'),
      workspace_id: toText(s.workspaceId || workspaceId),
      name: toText(s.name || s.supplierName),
      phone: toText(s.phone || ''),
      email: toText(s.email || ''),
      categories: Array.isArray(s.categories) ? s.categories.slice() : [],
      default_margin_rate: toNumber(s.defaultMarginRate || s.default_margin_rate, 0),
      notes: toText(s.notes || ''),
      raw_payload: clone(s)
    };
  }

  function normalizeQuoteItemRow(row, workspaceId) {
    const r = row || {};
    return {
      id: normalizeId(r.id, 'quote-item'),
      local_id: normalizeId(r.id || r.local_id || r.localId, 'quote-item'),
      workspace_id: toText(r.workspace_id || r.workspaceId || workspaceId),
      quote_id: toText(r.quote_id || r.quoteId),
      section_key: toText(r.section_key || r.sectionKey),
      item_id: toText(r.item_id || r.itemId),
      source_type: toText(r.source_type || r.sourceType || 'own'),
      supplier_id: toText(r.supplier_id || r.supplierId),
      supplier_name: toText(r.supplier_name || r.supplierName),
      code: toText(r.code),
      name: toText(r.name),
      unit: toText(r.unit || 'шт'),
      qty: toNumber(r.qty || r.quantity, 0),
      client_price: toNumber(r.client_price != null ? r.client_price : r.clientPrice, 0),
      subrent_price: toNumber(r.subrent_price != null ? r.subrent_price : r.subrentPrice, 0),
      margin: toNumber(r.margin, 0),
      weight_kg: toNumber(r.weight_kg != null ? r.weight_kg : r.weightKg, 0),
      power_w: toNumber(r.power_w != null ? r.power_w : r.powerW, 0),
      stock_qty: toNumber(r.stock_qty != null ? r.stock_qty : r.stockQty, 0),
      available_qty: toNumber(r.available_qty != null ? r.available_qty : r.availableQty, 0),
      deficit_qty: toNumber(r.deficit_qty != null ? r.deficit_qty : r.deficitQty, 0),
      raw_payload: clone(r.raw_payload || r.rawPayload || r)
    };
  }


  function normalizeReservationRow(row, workspaceId) {
    const r = row || {};
    return {
      id: normalizeId(r.id || r.reservation_id || r.reservationId, 'reservation'),
      workspace_id: toText(r.workspace_id || r.workspaceId || workspaceId),
      quote_id: toText(r.quote_id || r.quoteId),
      item_id: toText(r.item_id || r.itemId),
      section_key: toText(r.section_key || r.sectionKey),
      requested_qty: toNumber(r.requested_qty != null ? r.requested_qty : r.requestedQty, 0),
      reserved_qty: toNumber(r.reserved_qty != null ? r.reserved_qty : r.reservedQty, 0),
      deficit_qty: toNumber(r.deficit_qty != null ? r.deficit_qty : r.deficitQty, 0),
      subrent_qty: toNumber(r.subrent_qty != null ? r.subrent_qty : r.subrentQty, 0),
      status: toText(r.status || 'draft'),
      note: toText(r.note || ''),
      raw_payload: clone(r.raw_payload || r.rawPayload || r)
    };
  }


  function normalizeStockMovementRow(row, workspaceId) {
    const r = row || {};
    return {
      id: normalizeId(r.id || r.movement_id || r.movementId, 'stock-movement'),
      workspace_id: toText(r.workspace_id || r.workspaceId || workspaceId),
      quote_id: toText(r.quote_id || r.quoteId),
      reservation_id: toText(r.reservation_id || r.reservationId),
      item_id: toText(r.item_id || r.itemId),
      section_key: toText(r.section_key || r.sectionKey),
      movement_type: toText(r.movement_type || r.movementType || r.action || 'reserve'),
      qty: toNumber(r.qty != null ? r.qty : r.quantity, 0),
      unit: toText(r.unit || 'шт'),
      status: toText(r.status || 'planned'),
      source_type: toText(r.source_type || r.sourceType || 'own'),
      supplier_id: toText(r.supplier_id || r.supplierId),
      supplier_name: toText(r.supplier_name || r.supplierName),
      note: toText(r.note || ''),
      raw_payload: clone(r.raw_payload || r.rawPayload || r)
    };
  }


  function normalizeWarehouseWorkflowRow(row, workspaceId) {
    const src = row || {};
    const id = toText(src.workflow_id || src.workflowId || src.id || `warehouse-${src.quote_id || src.quoteId || Date.now().toString(36)}`);
    return {
      id,
      workspace_id: toText(src.workspace_id || src.workspaceId || workspaceId || 'main'),
      quote_id: toText(src.quote_id || src.quoteId),
      project_name: toText(src.project_name || src.projectName),
      client_name: toText(src.client_name || src.clientName),
      status: toText(src.status || 'draft'),
      status_label: toText(src.status_label || src.statusLabel || src.status || 'draft'),
      warehouse_action: toText(src.warehouse_action || src.warehouseAction || 'reserve'),
      totals: clone(src.totals || {}),
      reservation_plan: clone(src.reservation_plan || src.reservationPlan || null),
      stock_movement_plan: clone(src.stock_movement_plan || src.stockMovementPlan || null),
      timeline: clone(Array.isArray(src.timeline) ? src.timeline : []),
      raw_payload: clone(src),
      generated_at: toText(src.generated_at || src.generatedAt || nowIso()),
      updated_at: toText(src.updated_at || src.updatedAt || src.generated_at || src.generatedAt || nowIso())
    };
  }

  function normalizeAuditRow(row, workspaceId) {
    const r = row || {};
    return {
      id: normalizeId(r.id, 'audit'),
      local_id: normalizeId(r.id || r.local_id || r.localId, 'audit'),
      workspace_id: toText(r.workspace_id || r.workspaceId || workspaceId),
      quote_id: toText(r.quote_id || r.quoteId),
      quote_local_id: toText(r.quote_id || r.quoteId),
      project_id: toText(r.project_id || r.projectId),
      project_local_id: toText(r.project_id || r.projectId),
      action: toText(r.action || 'project_updated'),
      actor_id: toText(r.actor_id || r.actorId),
      actor_local_id: toText(r.actor_id || r.actorId),
      actor_role: toText(r.actor_role || r.actorRole),
      actor_name: toText(r.actor_name || r.actorName),
      payload: clone(r.payload || {}),
      raw_payload: clone(r),
      created_at: toText(r.created_at || r.at || nowIso())
    };
  }

  function buildSyncPayload(input, options) {
    const opts = options || {};
    const cfg = getRuntimeConfig(opts.config);
    const workspaceId = toText(opts.workspaceId || cfg.workspaceId || input && input.workspaceId || 'main');
    const quote = input && input.quote ? input.quote : (input || {});
    const quoteItems = Array.isArray(input && input.quote_items) ? input.quote_items : (Array.isArray(input && input.quoteItems) ? input.quoteItems : []);
    const equipmentItems = Array.isArray(input && input.equipment_items) ? input.equipment_items : (Array.isArray(input && input.equipmentItems) ? input.equipmentItems : []);
    const suppliers = Array.isArray(input && input.suppliers) ? input.suppliers : [];
    const auditLog = Array.isArray(input && input.audit_log) ? input.audit_log : (Array.isArray(input && input.auditLog) ? input.auditLog : []);
    const reservations = Array.isArray(input && input.reservations) ? input.reservations : (Array.isArray(input && input.reservationRows) ? input.reservationRows : []);
    const stockMovements = Array.isArray(input && input.stock_movements) ? input.stock_movements : (Array.isArray(input && input.stockMovements) ? input.stockMovements : []);
    const warehouseWorkflows = Array.isArray(input && input.warehouse_workflows) ? input.warehouse_workflows : (Array.isArray(input && input.warehouseWorkflows) ? input.warehouseWorkflows : []);
    const clients = quote.client ? [quote.client] : (Array.isArray(input && input.clients) ? input.clients : []);
    return {
      type: 'feg-stage-pro-backend-sync-payload',
      version: ADAPTER_VERSION,
      generated_at: nowIso(),
      mode: getBackendMode(cfg),
      workspace_id: workspaceId,
      table_map: cfg.tableMap,
      rows: {
        clients: clients.map(client => mapClientToRow(client, workspaceId)),
        quotes: quote && Object.keys(quote).length ? [mapQuoteToRow(quote, workspaceId)] : [],
        quote_sections: quote && Object.keys(quote).length ? mapQuoteSectionRows(quote, workspaceId) : [],
        quote_items: quoteItems.map(row => normalizeQuoteItemRow(row, workspaceId)),
        equipment_items: equipmentItems.map(item => mapEquipmentItemToRow(item, workspaceId)),
        suppliers: suppliers.map(supplier => mapSupplierToRow(supplier, workspaceId)),
        reservations: reservations.map(row => normalizeReservationRow(row, workspaceId)),
        stock_movements: stockMovements.map(row => normalizeStockMovementRow(row, workspaceId)),
        warehouse_workflows: warehouseWorkflows.map(row => normalizeWarehouseWorkflowRow(row, workspaceId)),
        audit_log: auditLog.map(row => normalizeAuditRow(row, workspaceId))
      }
    };
  }

  function validateSyncPayload(payload) {
    const p = payload || {};
    const errors = [];
    if (p.type !== 'feg-stage-pro-backend-sync-payload') errors.push('invalid payload type');
    if (!toText(p.workspace_id)) errors.push('workspace_id is required');
    const rows = p.rows || {};
    ['clients', 'quotes', 'quote_sections', 'quote_items', 'equipment_items', 'suppliers', 'reservations', 'stock_movements', 'warehouse_workflows', 'audit_log'].forEach(key => {
      if (!Array.isArray(rows[key])) errors.push(`rows.${key} must be an array`);
    });
    (rows.quotes || []).forEach((row, index) => {
      if (!row.id) errors.push(`quotes[${index}].id is required`);
      if (!row.workspace_id) errors.push(`quotes[${index}].workspace_id is required`);
    });
    (rows.equipment_items || []).forEach((row, index) => {
      if (!row.code && !row.name) errors.push(`equipment_items[${index}] needs code or name`);
    });
    return { ok: errors.length === 0, errors };
  }

  function saveLocalSnapshot(payload, storage) {
    const p = payload && payload.type === 'feg-stage-pro-backend-sync-payload' ? payload : buildSyncPayload(payload || {});
    const snapshots = readJson(storage, LOCAL_SYNC_STORAGE_KEY, []);
    const next = Array.isArray(snapshots) ? snapshots.slice() : [];
    next.unshift({ id: `sync-${Date.now().toString(36)}`, saved_at: nowIso(), payload: p });
    writeJson(storage, LOCAL_SYNC_STORAGE_KEY, next.slice(0, 25));
    return next[0];
  }

  function listLocalSnapshots(storage) {
    const snapshots = readJson(storage, LOCAL_SYNC_STORAGE_KEY, []);
    return Array.isArray(snapshots) ? snapshots : [];
  }

  function exportSyncPayload(input, options) {
    return JSON.stringify(buildSyncPayload(input, options), null, 2);
  }

  ROOT.BackendSyncAdapter = {
    ADAPTER_VERSION,
    LOCAL_SYNC_STORAGE_KEY,
    DEFAULT_TABLE_MAP,
    getRuntimeConfig,
    isSupabaseConfigured,
    getBackendMode,
    createSupabaseClient,
    mapClientToRow,
    mapQuoteToRow,
    mapQuoteSectionRows,
    mapEquipmentItemToRow,
    mapSupplierToRow,
    normalizeQuoteItemRow,
    normalizeReservationRow,
    normalizeStockMovementRow,
    normalizeWarehouseWorkflowRow,
    normalizeAuditRow,
    buildSyncPayload,
    validateSyncPayload,
    saveLocalSnapshot,
    listLocalSnapshots,
    exportSyncPayload
  };
})();
