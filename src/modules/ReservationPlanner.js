(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const RESERVATION_PLANNER_VERSION = '1.0.0';
  const RESERVATION_STORAGE_KEY = 'fegV4ReservationDrafts';

  function model() { return ROOT.QuoteModel || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }
  function equipmentDb() { return ROOT.EquipmentDatabase || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function getInventory(options) {
    const opts = options || {};
    if (Array.isArray(opts.inventoryItems)) return opts.inventoryItems;
    return equipmentDb() && equipmentDb().getStoredItemsOrDemo ? equipmentDb().getStoredItemsOrDemo() : [];
  }

  function findInventoryItem(row, inventory) {
    const db = equipmentDb();
    if (!db || !db.findItem) return null;
    return db.findItem(row.itemId || row.inventoryItemId || row.code || row.id, inventory) || null;
  }

  function makeReservationId(quoteId, row, index) {
    const base = [quoteId || 'quote', row.sectionKey || 'section', row.itemId || row.code || row.id || row.name || index].join('-');
    return `res-${String(base).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '')}`;
  }

  function classifyReservation(row, inventoryItem, requestedQty, ownReservedQty, deficitQty) {
    if (row.sourceType === 'subrent' || row.sourceType === 'subrent_needed' || nonNegative(row.subrentQty, 0) > 0) return 'subrent';
    if (!inventoryItem || row.inventoryStatus === 'unmatched') return 'unmatched';
    if (requestedQty <= 0) return 'empty';
    if (ownReservedQty >= requestedQty) return 'reserved';
    if (ownReservedQty > 0 && deficitQty > 0) return 'partial';
    if (deficitQty > 0) return 'deficit';
    return 'reserved';
  }

  function normalizeReservationRow(row, context) {
    const src = row || {};
    const ctx = context || {};
    const inventory = ctx.inventory || [];
    const inventoryItem = findInventoryItem(src, inventory);
    const requestedQty = nonNegative(src.qty == null ? src.requestedQty : src.qty, 0);
    const availableQty = inventoryItem ? nonNegative(inventoryItem.availableQty, 0) : (src.availableQty == null ? null : nonNegative(src.availableQty, 0));
    const knownDeficit = nonNegative(src.deficitQty, 0);
    const ownReservedQty = src.sourceType === 'subrent' || src.sourceType === 'subrent_needed'
      ? 0
      : availableQty == null ? 0 : Math.min(requestedQty, availableQty);
    const deficitQty = Math.max(knownDeficit, requestedQty - ownReservedQty);
    const status = classifyReservation(src, inventoryItem, requestedQty, ownReservedQty, deficitQty);
    const quoteId = toText(ctx.quoteId);
    const id = toText(src.reservationId || src.reservation_id) || makeReservationId(quoteId, src, ctx.index || 0);
    return {
      id,
      reservationId: id,
      reservation_id: id,
      version: RESERVATION_PLANNER_VERSION,
      workspaceId: toText(ctx.workspaceId || (inventoryItem && inventoryItem.workspaceId) || 'demo-workspace'),
      workspace_id: toText(ctx.workspaceId || (inventoryItem && inventoryItem.workspaceId) || 'demo-workspace'),
      quoteId,
      quote_id: quoteId,
      sectionKey: toText(src.sectionKey || ctx.sectionKey),
      section_key: toText(src.sectionKey || ctx.sectionKey),
      sectionTitle: toText(src.sectionTitle || ctx.sectionTitle),
      itemId: toText(inventoryItem && inventoryItem.id || src.itemId || src.inventoryItemId),
      item_id: toText(inventoryItem && inventoryItem.id || src.itemId || src.inventoryItemId),
      code: toText(inventoryItem && inventoryItem.code || src.code || src.id),
      name: toText(inventoryItem && inventoryItem.name || src.name || 'Позиция'),
      unit: toText(src.unit || inventoryItem && inventoryItem.unit || 'шт') || 'шт',
      requestedQty,
      requested_qty: requestedQty,
      reservedQty: ownReservedQty,
      reserved_qty: ownReservedQty,
      availableQty,
      available_qty: availableQty,
      stockQty: inventoryItem ? nonNegative(inventoryItem.stockQty, 0) : (src.stockQty == null ? null : nonNegative(src.stockQty, 0)),
      stock_qty: inventoryItem ? nonNegative(inventoryItem.stockQty, 0) : (src.stockQty == null ? null : nonNegative(src.stockQty, 0)),
      alreadyReservedQty: inventoryItem ? nonNegative(inventoryItem.reservedQty, 0) : (src.reservedQty == null ? null : nonNegative(src.reservedQty, 0)),
      already_reserved_qty: inventoryItem ? nonNegative(inventoryItem.reservedQty, 0) : (src.reservedQty == null ? null : nonNegative(src.reservedQty, 0)),
      deficitQty,
      deficit_qty: deficitQty,
      subrentQty: Math.max(nonNegative(src.subrentQty, 0), status === 'subrent' ? requestedQty : deficitQty),
      subrent_qty: Math.max(nonNegative(src.subrentQty, 0), status === 'subrent' ? requestedQty : deficitQty),
      status,
      sourceType: toText(src.sourceType || (status === 'subrent' ? 'subrent' : 'own')),
      source_type: toText(src.sourceType || (status === 'subrent' ? 'subrent' : 'own')),
      supplierId: toText(src.supplierId),
      supplier_id: toText(src.supplierId),
      supplierName: toText(src.supplierName),
      supplier_name: toText(src.supplierName),
      note: toText(src.note || (Array.isArray(src.notes) ? src.notes.join('; ') : src.notes)),
      rawPayload: clone(src),
      raw_payload: clone(src)
    };
  }

  function buildReservationPlan(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const inventory = getInventory(opts);
    const lists = pickLists() && pickLists().buildPickLists ? pickLists().buildPickLists(q) : { all: { rows: [] } };
    const rows = lists && lists.all && Array.isArray(lists.all.rows) ? lists.all.rows : [];
    const reservationRows = rows.map((row, index) => normalizeReservationRow(row, {
      quoteId: q.id,
      workspaceId: q.workspaceId || opts.workspaceId,
      inventory,
      index: index + 1
    }));
    const plan = {
      type: 'feg-stage-pro-reservation-plan',
      version: RESERVATION_PLANNER_VERSION,
      generatedAt: nowIso(),
      generated_at: nowIso(),
      quoteId: q.id,
      quote_id: q.id,
      workspaceId: q.workspaceId || opts.workspaceId || 'demo-workspace',
      workspace_id: q.workspaceId || opts.workspaceId || 'demo-workspace',
      projectName: q.project && q.project.name || '',
      project_name: q.project && q.project.name || '',
      status: q.status || 'draft',
      rows: reservationRows,
      totals: summarizeReservationRows(reservationRows),
      notes: [
        'Это локальный план резерва склада. Он не меняет остатки автоматически.',
        'Для фактического резерва используйте подтверждение проекта и будущий backend / reservations table.'
      ]
    };
    return plan;
  }

  function summarizeReservationRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      const requested = nonNegative(row.requestedQty, 0);
      const reserved = nonNegative(row.reservedQty, 0);
      const deficit = nonNegative(row.deficitQty, 0);
      const subrent = nonNegative(row.subrentQty, 0);
      acc.rows += 1;
      acc.requestedQty += requested;
      acc.reservedQty += reserved;
      acc.deficitQty += deficit;
      acc.subrentQty += subrent;
      acc.reservedRows += reserved > 0 && deficit === 0 ? 1 : 0;
      acc.partialRows += reserved > 0 && deficit > 0 ? 1 : 0;
      acc.deficitRows += deficit > 0 ? 1 : 0;
      acc.subrentRows += row.status === 'subrent' || subrent > 0 ? 1 : 0;
      acc.unmatchedRows += row.status === 'unmatched' ? 1 : 0;
      return acc;
    }, { rows: 0, requestedQty: 0, reservedQty: 0, deficitQty: 0, subrentQty: 0, reservedRows: 0, partialRows: 0, deficitRows: 0, subrentRows: 0, unmatchedRows: 0 });
  }

  function reservationPlanToText(plan) {
    const p = plan && plan.type === 'feg-stage-pro-reservation-plan' ? plan : buildReservationPlan(plan || {});
    const lines = [];
    lines.push('План резерва склада');
    lines.push('');
    lines.push(`Проект: ${p.projectName || '—'}`);
    lines.push(`Quote ID: ${p.quoteId || '—'}`);
    lines.push(`Статус: ${p.status || 'draft'}`);
    lines.push('');
    (p.rows || []).forEach((row, index) => {
      const stock = row.availableQty == null ? 'нет данных' : `${row.availableQty} доступно`;
      const deficit = row.deficitQty ? `, дефицит ${row.deficitQty} ${row.unit}` : '';
      const subrent = row.subrentQty ? `, субаренда ${row.subrentQty} ${row.unit}` : '';
      lines.push(`${index + 1}. [${row.sectionTitle || row.sectionKey || '—'}] ${row.code || '—'} ${row.name} — нужно ${row.requestedQty} ${row.unit}, резерв ${row.reservedQty} (${stock})${deficit}${subrent}; статус: ${row.status}`);
    });
    lines.push('');
    lines.push(`Строк: ${p.totals.rows}`);
    lines.push(`Нужно: ${p.totals.requestedQty}`);
    lines.push(`В резерв: ${p.totals.reservedQty}`);
    lines.push(`Дефицит: ${p.totals.deficitQty}`);
    lines.push(`Субаренда: ${p.totals.subrentQty}`);
    if (Array.isArray(p.notes)) p.notes.forEach(note => lines.push(`Примечание: ${note}`));
    return lines.join('\n');
  }

  function readDrafts(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(RESERVATION_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveReservationDraft(plan, storage) {
    const p = plan && plan.type === 'feg-stage-pro-reservation-plan' ? plan : buildReservationPlan(plan || {});
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return p;
    const rows = readDrafts(store).filter(item => item && item.quoteId !== p.quoteId);
    rows.unshift(p);
    store.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(rows.slice(0, 50)));
    return p;
  }

  function listReservationDrafts(storage) {
    return readDrafts(storage);
  }

  function exportReservationPlan(quote, options) {
    return JSON.stringify(buildReservationPlan(quote, options), null, 2);
  }

  ROOT.ReservationPlanner = {
    RESERVATION_PLANNER_VERSION,
    RESERVATION_STORAGE_KEY,
    normalizeReservationRow,
    buildReservationPlan,
    summarizeReservationRows,
    reservationPlanToText,
    saveReservationDraft,
    listReservationDrafts,
    exportReservationPlan
  };
})();
