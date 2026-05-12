(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const AUDIT_LOG_VERSION = '1.0.0';

  function model() { return ROOT.QuoteModel || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function documentBuilder() { return ROOT.QuoteDocumentBuilder || null; }
  function quoteItemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function supplierDirectory() { return ROOT.SupplierDirectory || null; }
  function calendarIntegration() { return ROOT.CalendarIntegration || null; }
  function backendSyncAdapter() { return ROOT.BackendSyncAdapter || null; }
  function readinessChecklist() { return ROOT.ProjectReadinessChecklist || null; }
  function reservationPlanner() { return ROOT.ReservationPlanner || null; }
  function stockMovementPlanner() { return ROOT.StockMovementPlanner || null; }
  function warehouseWorkflow() { return ROOT.WarehouseWorkflow || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function makeAuditEvent(action, payload, actor) {
    const safePayload = payload || {};
    const user = actor || getActor();
    return {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      version: AUDIT_LOG_VERSION,
      at: nowIso(),
      action: toText(action || 'project_updated'),
      actorId: toText(user.id || user.userId || ''),
      actorRole: toText(user.role || 'demo'),
      actorName: toText(user.name || user.email || 'DEMO AUTH'),
      workspaceId: toText(safePayload.workspaceId),
      quoteId: toText(safePayload.quoteId),
      projectId: toText(safePayload.projectId),
      payload: clone(safePayload.payload || safePayload)
    };
  }

  function getActor() {
    try {
      if (ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser) return ROOT.AuthProvider.getCurrentUser() || {};
      if (ROOT.DemoAuthProvider && ROOT.DemoAuthProvider.getCurrentUser) return ROOT.DemoAuthProvider.getCurrentUser() || {};
    } catch (_) {}
    return { id: 'local-demo-user', role: 'demo', name: 'Local demo user' };
  }

  function fromHistoryEvent(event, quote, projectId) {
    const q = quote || {};
    const ev = event || {};
    const payload = ev.payload || {};
    return {
      id: toText(ev.id) || `history-${Math.random().toString(36).slice(2, 8)}`,
      version: AUDIT_LOG_VERSION,
      at: toText(ev.at) || nowIso(),
      action: toText(ev.type || 'history_event'),
      actorId: toText(payload.actorId || q.ownerId),
      actorRole: toText(payload.actorRole || 'local'),
      actorName: toText(payload.actorName || ''),
      workspaceId: toText(q.workspaceId),
      quoteId: toText(q.id),
      projectId: toText(projectId || q.projectId || ''),
      payload: clone(payload)
    };
  }

  function buildAuditLog(input, options) {
    const opts = options || {};
    const record = input && input.quote ? input : null;
    const q = normalizeQuote(record ? record.quote : input || {});
    const history = Array.isArray(q.history) ? q.history : [];
    const events = history.map(ev => fromHistoryEvent(ev, q, record && record.projectId));

    if (opts.includeSnapshot !== false) {
      events.push(makeAuditEvent('project_snapshot_exported', {
        workspaceId: q.workspaceId,
        quoteId: q.id,
        projectId: record && record.projectId || '',
        payload: {
          status: q.status,
          appVersion: q.appVersion,
          projectName: q.project && q.project.name || '',
          clientName: q.client && q.client.name || '',
          generatedAt: nowIso()
        }
      }));
    }

    return events.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  }

  function buildProjectAuditLog(projectId) {
    const storage = projectStorage();
    const record = storage && storage.loadProject ? storage.loadProject(projectId) : null;
    if (!record) return [];
    return buildAuditLog(record);
  }

  function exportAuditLog(input, options) {
    const record = input && input.quote ? input : null;
    const q = normalizeQuote(record ? record.quote : input || {});
    return JSON.stringify({
      type: 'feg-stage-pro-audit-log-export',
      version: AUDIT_LOG_VERSION,
      generatedAt: nowIso(),
      quoteId: q.id,
      projectId: record && record.projectId || '',
      workspaceId: q.workspaceId,
      rows: buildAuditLog(record || q, options)
    }, null, 2);
  }

  function buildProjectExportPack(input) {
    const record = input && input.quote ? input : null;
    const q = normalizeQuote(record ? record.quote : input || {});
    const docs = documentBuilder() && documentBuilder().buildAllDocuments ? documentBuilder().buildAllDocuments(q) : [];
    const docTexts = documentBuilder() && documentBuilder().documentToText ? docs.map(doc => ({ type: doc.type, title: doc.title, text: documentBuilder().documentToText(doc) })) : [];
    let quoteItems = [];
    if (quoteItemBuilder() && quoteItemBuilder().buildQuoteItems) {
      const builtItems = quoteItemBuilder().buildQuoteItems(q);
      quoteItems = Array.isArray(builtItems) ? builtItems : (builtItems && Array.isArray(builtItems.rows) ? builtItems.rows : []);
    }
    const suppliers = supplierDirectory() && supplierDirectory().listSuppliers ? supplierDirectory().listSuppliers() : [];
    const auditLog = buildAuditLog(record || q);
    const reservationPlan = reservationPlanner() && reservationPlanner().buildReservationPlan ? reservationPlanner().buildReservationPlan(q) : null;
    const stockMovementPlan = stockMovementPlanner() && stockMovementPlanner().buildMovementPlan ? stockMovementPlanner().buildMovementPlan(q, { action: 'reserve' }) : null;
    const warehouseWorkflowPlan = warehouseWorkflow() && warehouseWorkflow().buildWarehouseWorkflow ? warehouseWorkflow().buildWarehouseWorkflow(q) : null;
    const pack = {
      type: 'feg-stage-pro-project-export-pack',
      version: AUDIT_LOG_VERSION,
      generatedAt: nowIso(),
      appVersion: q.appVersion,
      projectId: record && record.projectId || '',
      quoteId: q.id,
      workspaceId: q.workspaceId,
      status: q.status,
      quote: clone(model() && model().buildQuotePayload ? model().buildQuotePayload(q) : q),
      quote_items: quoteItems,
      documents: docs,
      document_texts: docTexts,
      calendar_ics: calendarIntegration() && calendarIntegration().exportIcs ? calendarIntegration().exportIcs(q) : '',
      readiness_checklist: readinessChecklist() && readinessChecklist().buildChecklist ? readinessChecklist().buildChecklist(q) : null,
      reservation_plan: reservationPlan,
      stock_movement_plan: stockMovementPlan,
      warehouse_workflow: warehouseWorkflowPlan,
      suppliers,
      audit_log: auditLog
    };
    if (backendSyncAdapter() && backendSyncAdapter().buildSyncPayload) {
      pack.backend_sync_payload = backendSyncAdapter().buildSyncPayload({
        workspaceId: q.workspaceId,
        quote: pack.quote,
        quote_items: quoteItems,
        suppliers,
        audit_log: auditLog,
        reservations: reservationPlan && Array.isArray(reservationPlan.rows) ? reservationPlan.rows : [],
        stock_movements: stockMovementPlan && Array.isArray(stockMovementPlan.rows) ? stockMovementPlan.rows : [],
        warehouse_workflows: warehouseWorkflowPlan ? [warehouseWorkflowPlan] : []
      });
    }
    return pack;
  }

  function exportProjectPack(input) {
    return JSON.stringify(buildProjectExportPack(input), null, 2);
  }

  ROOT.ProjectAuditLog = {
    AUDIT_LOG_VERSION,
    makeAuditEvent,
    buildAuditLog,
    buildProjectAuditLog,
    exportAuditLog,
    buildProjectExportPack,
    exportProjectPack
  };
})();
