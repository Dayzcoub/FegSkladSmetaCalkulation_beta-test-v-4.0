(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUOTE_ITEM_BUILDER_VERSION = '1.0.1-project-crew-labor';

  function model() { return ROOT.QuoteModel || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }
  function sharedBomBridge() { return ROOT.V4SharedBomBridge || null; }
  function suppliers() { return ROOT.SupplierDirectory || null; }
  function crewModule() { return ROOT.ProjectCrewAssignments || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function money(value) { return Math.round(nonNegative(value, 0)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  const SECTION_KIND = Object.freeze({
    stage: 'stage',
    truss: 'truss',
    led: 'led',
    equipment: 'equipment',
    transport: 'transport',
    services: 'services',
    crew: 'crew'
  });

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function makeQuoteItemId(quoteId, row, index) {
    const base = [quoteId || 'quote', row.sectionKey || 'section', row.itemId || row.code || row.id || row.name || index].join('-');
    return `qi-${String(base).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '')}`;
  }

  function resolveSupplier(row, supplierList) {
    const dir = suppliers();
    const supplierId = toText(row.supplierId || row.supplier_id);
    const supplierName = toText(row.supplierName || row.supplier_name);
    if (dir && (supplierId || supplierName)) {
      const found = dir.findSupplier(supplierId || supplierName, supplierList);
      if (found) return { supplierId: found.id, supplierName: found.name, supplier: found };
    }
    if (supplierId || supplierName) return { supplierId, supplierName: supplierName || supplierId, supplier: null };
    if (row.sourceType === 'subrent' || nonNegative(row.deficitQty, 0) > 0 || nonNegative(row.subrentQty, 0) > 0) {
      const fallback = dir && dir.findSupplier('sup-manual', supplierList);
      return { supplierId: fallback ? fallback.id : '', supplierName: fallback ? fallback.name : 'Поставщик не указан', supplier: fallback || null };
    }
    return { supplierId: '', supplierName: '', supplier: null };
  }

  function normalizeQuoteItem(row, context) {
    const src = row || {};
    const ctx = context || {};
    const qty = nonNegative(src.qty == null ? src.requestedQty : src.qty, 0);
    const supplierInfo = resolveSupplier(src, ctx.suppliers || []);
    const subrentQty = nonNegative(src.subrentQty || src.deficitQty, 0);
    const sourceType = toText(src.sourceTypeSuggestion || (subrentQty > 0 && src.sourceType === 'own' ? 'subrent_needed' : src.sourceType) || (subrentQty > 0 ? 'subrent_needed' : 'own')) || 'own';
    const subrentPrice = money(src.subrentPrice == null ? src.subrent_price : src.subrentPrice);
    const clientPrice = money(src.clientPrice == null ? src.client_price : src.clientPrice);
    const rentalPrice = money(src.rentalPrice == null ? src.rental_price : src.rentalPrice);
    return {
      id: toText(src.quoteItemId || (src.id && String(src.id).startsWith('qi-') ? src.id : '')) || makeQuoteItemId(ctx.quoteId, src, ctx.index || 0),
      quoteId: toText(ctx.quoteId),
      quote_id: toText(ctx.quoteId),
      sectionKey: toText(src.sectionKey || ctx.sectionKey),
      section_key: toText(src.sectionKey || ctx.sectionKey),
      sectionTitle: toText(src.sectionTitle || ctx.sectionTitle),
      itemId: toText(src.itemId || src.inventoryItemId),
      item_id: toText(src.itemId || src.inventoryItemId),
      sourceType,
      source_type: sourceType,
      supplierId: supplierInfo.supplierId,
      supplier_id: supplierInfo.supplierId,
      supplierName: supplierInfo.supplierName,
      supplier_name: supplierInfo.supplierName,
      code: toText(src.code || src.id),
      name: toText(src.name || 'Позиция'),
      unit: toText(src.unit || 'шт') || 'шт',
      qty,
      quantity: qty,
      requestedQty: nonNegative(src.requestedQty == null ? qty : src.requestedQty, qty),
      requested_qty: nonNegative(src.requestedQty == null ? qty : src.requestedQty, qty),
      rentalPrice,
      rental_price: rentalPrice,
      subrentPrice,
      subrent_price: subrentPrice,
      clientPrice,
      client_price: clientPrice,
      margin: money(src.margin || (clientPrice && subrentPrice ? (clientPrice - subrentPrice) * Math.max(qty, subrentQty || 1) : 0)),
      totalRental: money(rentalPrice * qty),
      total_rental: money(rentalPrice * qty),
      totalSubrent: money(subrentPrice * (subrentQty || qty)),
      total_subrent: money(subrentPrice * (subrentQty || qty)),
      totalClient: money(clientPrice * (subrentQty || qty)),
      total_client: money(clientPrice * (subrentQty || qty)),
      weightKg: nonNegative(src.weightKg, 0),
      weight_kg: nonNegative(src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      power_w: nonNegative(src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW, 0),
      startup_power_w: nonNegative(src.startupPowerW, 0),
      stockQty: src.stockQty == null ? null : nonNegative(src.stockQty, 0),
      stock_qty: src.stockQty == null ? null : nonNegative(src.stockQty, 0),
      reservedQty: src.reservedQty == null ? null : nonNegative(src.reservedQty, 0),
      reserved_qty: src.reservedQty == null ? null : nonNegative(src.reservedQty, 0),
      availableQty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      available_qty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      deficitQty: nonNegative(src.deficitQty, 0),
      deficit_qty: nonNegative(src.deficitQty, 0),
      subrentQty,
      subrent_qty: subrentQty,
      inventoryStatus: toText(src.inventoryStatus),
      inventory_status: toText(src.inventoryStatus),
      note: toText(src.note || (Array.isArray(src.notes) ? src.notes.join('; ') : src.notes)),
      stageHeightM: nonNegative(src.stageHeightM == null ? src.stage_height_m : src.stageHeightM, 0),
      stage_height_m: nonNegative(src.stageHeightM == null ? src.stage_height_m : src.stageHeightM, 0),
      meters: nonNegative(src.meters, 0),
      trussLengthM: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0),
      truss_length_m: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0),
      trussStraightCount: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0),
      truss_straight_count: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0),
      meta: { source: 'QuoteItemBuilder', stageHeightM: nonNegative(src.stageHeightM == null ? src.stage_height_m : src.stageHeightM, 0), meters: nonNegative(src.meters, 0), trussLengthM: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0), trussStraightCount: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0), raw: clone(src.raw || null) }
    };
  }

  function normalizeCrewAssignments(quote) {
    const q = quote || {};
    const list = q.crewAssignments || q.projectCrew || q.team || [];
    return crewModule() && crewModule().normalizeAssignments ? crewModule().normalizeAssignments(list) : (Array.isArray(list) ? list : []);
  }

  function crewRoleLabel(row) {
    const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
    if (src.projectRoleLabel) return src.projectRoleLabel;
    return crewModule() && crewModule().getCrewRoleLabel ? crewModule().getCrewRoleLabel(src.projectRole || src.role) : toText(src.projectRole || src.role || 'Роль');
  }

  function buildCrewQuoteItems(quote) {
    const q = quote || {};
    return normalizeCrewAssignments(q).map((row, index) => {
      const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
      const hourly = src.payMode === 'hourly';
      const hours = nonNegative(src.hours, 0);
      const total = money(src.totalCost || (hourly ? nonNegative(src.hourlyRate, 0) * hours : src.fixedCost));
      if (total <= 0) return null;
      const qty = hourly ? hours : 1;
      const unitPrice = hourly ? money(src.hourlyRate) : total;
      const role = crewRoleLabel(src);
      return normalizeQuoteItem({
        id: src.id || `crew-${index + 1}`,
        sectionKey: 'crew',
        sectionTitle: 'Команда проекта',
        code: `CREW-${index + 1}`,
        name: `Работы: ${role}`,
        qty: qty || 1,
        requestedQty: qty || 1,
        unit: hourly ? 'ч' : 'усл.',
        sourceType: 'labor',
        clientPrice: unitPrice,
        rentalPrice: unitPrice,
        subrentPrice: 0,
        margin: 0,
        note: hourly ? `${money(src.hourlyRate)} ₽/ч × ${hours} ч` : 'фиксированная стоимость'
      }, { quoteId: q.id, sectionKey: 'crew', sectionTitle: 'Команда проекта', index: 1000 + index, suppliers: [] });
    }).filter(Boolean);
  }

  function buildTransportQuoteItem(quote) {
    const q = quote || {};
    const tr = q.transport || {};
    const total = money(tr.total);
    if (total <= 0) return null;
    return normalizeQuoteItem({
      id: 'transport',
      sectionKey: 'transport',
      sectionTitle: 'Транспорт',
      code: 'TRANSPORT',
      name: `Транспорт · ${tr.vehicleLabel || 'Грузовой'} · ${tr.mode === 'out_of_city' ? 'за город' : 'город'}`,
      qty: 1,
      unit: 'рейс',
      sourceType: 'manual',
      clientPrice: total,
      rentalPrice: total,
      note: tr.notes || ''
    }, { quoteId: q.id, sectionKey: 'transport', sectionTitle: 'Транспорт', index: 0, suppliers: [] });
  }

  function buildQuoteItems(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const supplierList = suppliers() && suppliers().getStoredSuppliersOrDemo ? suppliers().getStoredSuppliersOrDemo() : [];
    let rows = [];
    if (sharedBomBridge() && sharedBomBridge().collectQuoteBomRows) {
      rows = sharedBomBridge().collectQuoteBomRows(q, { enrichAvailability: true });
    }
    if (!rows.length) {
      const list = pickLists() && pickLists().buildPickLists ? pickLists().buildPickLists(q) : { all: { rows: [] } };
      rows = list && list.all && Array.isArray(list.all.rows) ? list.all.rows : [];
    }
    const items = rows.map((row, index) => normalizeQuoteItem(row, { quoteId: q.id, sectionKey: row.sectionKey, sectionTitle: row.sectionTitle, index: index + 1, suppliers: supplierList }));
    buildCrewQuoteItems(q).forEach(item => items.push(item));
    const transportItem = opts.includeTransport === false ? null : buildTransportQuoteItem(q);
    if (transportItem) items.push(transportItem);
    return {
      version: QUOTE_ITEM_BUILDER_VERSION,
      quoteId: q.id,
      quote_id: q.id,
      rows: items,
      totals: summarizeQuoteItems(items),
      generatedAt: new Date().toISOString()
    };
  }

  function summarizeQuoteItems(items) {
    const rows = Array.isArray(items) ? items : [];
    return rows.reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += nonNegative(row.qty, 0);
      acc.weightKg += nonNegative(row.weightKg, 0);
      acc.powerW += nonNegative(row.powerW, 0);
      acc.rental += nonNegative(row.totalRental, 0);
      acc.subrent += nonNegative(row.totalSubrent, 0);
      acc.client += nonNegative(row.totalClient, 0);
      acc.margin += nonNegative(row.margin, 0);
      acc.deficitRows += nonNegative(row.deficitQty, 0) > 0 ? 1 : 0;
      acc.subrentRows += row.sourceType === 'subrent' || row.sourceType === 'subrent_needed' || nonNegative(row.subrentQty, 0) > 0 ? 1 : 0;
      return acc;
    }, { rows: 0, qty: 0, weightKg: 0, powerW: 0, rental: 0, subrent: 0, client: 0, margin: 0, deficitRows: 0, subrentRows: 0 });
  }

  function exportQuoteItems(quote, options) {
    return JSON.stringify(buildQuoteItems(quote, options), null, 2);
  }

  ROOT.QuoteItemBuilder = {
    QUOTE_ITEM_BUILDER_VERSION,
    SECTION_KIND,
    normalizeQuoteItem,
    buildCrewQuoteItems,
    buildTransportQuoteItem,
    buildQuoteItems,
    summarizeQuoteItems,
    exportQuoteItems
  };
})();
