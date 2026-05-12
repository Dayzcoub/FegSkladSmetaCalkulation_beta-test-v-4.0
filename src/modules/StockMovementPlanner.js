(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STOCK_MOVEMENT_PLANNER_VERSION = '1.0.0';
  const STOCK_MOVEMENT_STORAGE_KEY = 'fegV4StockMovementDrafts';

  function reservationPlanner() { return ROOT.ReservationPlanner || null; }
  function model() { return ROOT.QuoteModel || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function makeMovementId(quoteId, action, row, index) {
    const base = [quoteId || 'quote', action || 'movement', row.reservationId || row.code || row.name || index].join('-');
    return `mov-${String(base).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '')}`;
  }

  function normalizeAction(action) {
    const value = toText(action || 'reserve').toLowerCase();
    if (['reserve', 'issue', 'return', 'cancel_reserve', 'writeoff', 'adjustment'].includes(value)) return value;
    return 'reserve';
  }

  function buildMovementFromReservation(row, context) {
    const src = row || {};
    const ctx = context || {};
    const action = normalizeAction(ctx.action);
    const qtyByAction = {
      reserve: nonNegative(src.reservedQty != null ? src.reservedQty : src.reserved_qty, 0),
      issue: nonNegative(src.reservedQty != null ? src.reservedQty : src.reserved_qty, 0),
      return: nonNegative(src.reservedQty != null ? src.reservedQty : src.reserved_qty, 0),
      cancel_reserve: nonNegative(src.reservedQty != null ? src.reservedQty : src.reserved_qty, 0),
      writeoff: nonNegative(src.writeoffQty != null ? src.writeoffQty : src.writeoff_qty, 0),
      adjustment: nonNegative(src.adjustmentQty != null ? src.adjustmentQty : src.adjustment_qty, 0)
    };
    const qty = qtyByAction[action] || 0;
    const quoteId = toText(ctx.quoteId || src.quoteId || src.quote_id);
    const id = makeMovementId(quoteId, action, src, ctx.index || 0);
    return {
      id,
      movementId: id,
      movement_id: id,
      version: STOCK_MOVEMENT_PLANNER_VERSION,
      workspaceId: toText(ctx.workspaceId || src.workspaceId || src.workspace_id || 'demo-workspace'),
      workspace_id: toText(ctx.workspaceId || src.workspaceId || src.workspace_id || 'demo-workspace'),
      quoteId,
      quote_id: quoteId,
      reservationId: toText(src.reservationId || src.reservation_id),
      reservation_id: toText(src.reservationId || src.reservation_id),
      sectionKey: toText(src.sectionKey || src.section_key),
      section_key: toText(src.sectionKey || src.section_key),
      itemId: toText(src.itemId || src.item_id),
      item_id: toText(src.itemId || src.item_id),
      code: toText(src.code),
      name: toText(src.name || 'Позиция'),
      unit: toText(src.unit || 'шт') || 'шт',
      action,
      movementType: action,
      movement_type: action,
      qty,
      quantity: qty,
      plannedQty: qty,
      planned_qty: qty,
      status: qty > 0 ? 'planned' : 'empty',
      sourceType: toText(src.sourceType || src.source_type || 'own'),
      source_type: toText(src.sourceType || src.source_type || 'own'),
      supplierId: toText(src.supplierId || src.supplier_id),
      supplier_id: toText(src.supplierId || src.supplier_id),
      supplierName: toText(src.supplierName || src.supplier_name),
      supplier_name: toText(src.supplierName || src.supplier_name),
      note: toText(ctx.note || src.note || ''),
      createdAt: nowIso(),
      created_at: nowIso(),
      rawPayload: clone(src),
      raw_payload: clone(src)
    };
  }

  function buildMovementPlan(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const action = normalizeAction(opts.action || 'reserve');
    const res = reservationPlanner();
    const reservationPlan = opts.reservationPlan || (res && res.buildReservationPlan ? res.buildReservationPlan(q, opts) : { rows: [], totals: {} });
    const rows = (reservationPlan.rows || [])
      .map((row, index) => buildMovementFromReservation(row, {
        quoteId: q.id,
        workspaceId: q.workspaceId || opts.workspaceId,
        action,
        index: index + 1,
        note: opts.note
      }))
      .filter(row => row.qty > 0 || opts.includeEmpty === true);
    return {
      type: 'feg-stage-pro-stock-movement-plan',
      version: STOCK_MOVEMENT_PLANNER_VERSION,
      generatedAt: nowIso(),
      generated_at: nowIso(),
      quoteId: q.id,
      quote_id: q.id,
      workspaceId: q.workspaceId || opts.workspaceId || 'demo-workspace',
      workspace_id: q.workspaceId || opts.workspaceId || 'demo-workspace',
      projectName: q.project && q.project.name || '',
      project_name: q.project && q.project.name || '',
      action,
      status: 'draft',
      rows,
      totals: summarizeMovementRows(rows),
      notes: [
        'Это локальный план движения склада. Он не меняет остатки автоматически.',
        'Для фактического списания/резерва используйте будущий backend и таблицу stock_movements.'
      ]
    };
  }

  function buildDefaultMovementPlans(quote, options) {
    return {
      reserve: buildMovementPlan(quote, Object.assign({}, options || {}, { action: 'reserve' })),
      issue: buildMovementPlan(quote, Object.assign({}, options || {}, { action: 'issue' })),
      return: buildMovementPlan(quote, Object.assign({}, options || {}, { action: 'return' }))
    };
  }

  function summarizeMovementRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      const qty = nonNegative(row.qty, 0);
      acc.rows += 1;
      acc.totalQty += qty;
      acc.byAction[row.action] = (acc.byAction[row.action] || 0) + qty;
      acc.byStatus[row.status] = (acc.byStatus[row.status] || 0) + 1;
      return acc;
    }, { rows: 0, totalQty: 0, byAction: {}, byStatus: {} });
  }

  function movementPlanToText(plan) {
    const p = plan && plan.type === 'feg-stage-pro-stock-movement-plan' ? plan : buildMovementPlan(plan || {});
    const actionLabels = { reserve: 'Резерв', issue: 'Выдача', return: 'Возврат', cancel_reserve: 'Отмена резерва', writeoff: 'Списание', adjustment: 'Корректировка' };
    const lines = [];
    lines.push(`План движения склада: ${actionLabels[p.action] || p.action}`);
    lines.push('');
    lines.push(`Проект: ${p.projectName || '—'}`);
    lines.push(`Quote ID: ${p.quoteId || '—'}`);
    lines.push('');
    (p.rows || []).forEach((row, index) => {
      lines.push(`${index + 1}. [${row.sectionKey || '—'}] ${row.code || '—'} ${row.name} — ${row.qty} ${row.unit}; операция: ${row.action}; статус: ${row.status}`);
    });
    lines.push('');
    lines.push(`Строк: ${p.totals.rows}`);
    lines.push(`Единиц: ${p.totals.totalQty}`);
    if (Array.isArray(p.notes)) p.notes.forEach(note => lines.push(`Примечание: ${note}`));
    return lines.join('\n');
  }

  function exportMovementPlan(quote, options) {
    return JSON.stringify(buildMovementPlan(quote, options), null, 2);
  }

  function readDrafts(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(STOCK_MOVEMENT_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveMovementDraft(plan, storage) {
    const p = plan && plan.type === 'feg-stage-pro-stock-movement-plan' ? plan : buildMovementPlan(plan || {});
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return p;
    const rows = readDrafts(store).filter(item => item && item.quoteId !== p.quoteId + ':' + p.action);
    rows.unshift(Object.assign({}, p, { quoteId: `${p.quoteId}:${p.action}` }));
    store.setItem(STOCK_MOVEMENT_STORAGE_KEY, JSON.stringify(rows.slice(0, 50)));
    return p;
  }

  function listMovementDrafts(storage) {
    return readDrafts(storage);
  }

  ROOT.StockMovementPlanner = {
    STOCK_MOVEMENT_PLANNER_VERSION,
    STOCK_MOVEMENT_STORAGE_KEY,
    normalizeAction,
    buildMovementFromReservation,
    buildMovementPlan,
    buildDefaultMovementPlans,
    summarizeMovementRows,
    movementPlanToText,
    exportMovementPlan,
    saveMovementDraft,
    listMovementDrafts
  };
})();
