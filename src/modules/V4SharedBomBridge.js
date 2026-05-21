// FEG Stage PRO v3.15.49 — V4SharedBomBridge
// Normalizes configured v4 sections into one BOM stream for quote_items, documents and warehouse flows.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SHARED_BOM_BRIDGE_VERSION = '3.17.38-quick-ideal-aware';
  const SECTION_ORDER = Object.freeze(['stage', 'truss', 'led', 'equipment']);
  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран',
    equipment: 'Оборудование и услуги'
  });

  function model() { return ROOT.QuoteModel || null; }
  function binder() { return ROOT.QuoteSectionBinder || null; }
  function availability() { return ROOT.AvailabilityChecker || null; }
  function itemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function contract() { return ROOT.V4BomContract || null; }

  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || { sections: {} });
  }

  function normalizeSourceType(value) {
    const src = toText(value || 'own');
    if (!src || src === 'equipment_database_system_part' || src === 'system_part' || src === 'stock' || src === 'inventory') return 'own';
    if (src === 'manual_subrent') return 'subrent';
    return src;
  }

  function sourceSystem(value) {
    const src = toText(value);
    if (src === 'quick_ideal' || src === 'quick_ideal_catalog') return 'quick_ideal_catalog';
    if (src === 'equipment_database_system_part' || src === 'system_part') return 'equipment_database_system_part';
    return '';
  }

  function sectionTitle(key, section) {
    return toText(section && section.title) || SECTION_TITLES[key] || key || 'Раздел';
  }

  function normalizeBomRow(row, context, sectionArg) {
    const src = row || {};
    const ctx = typeof context === 'string'
      ? { sectionKey: context, section: sectionArg || null }
      : (context || {});
    const section = ctx.section || {};
    const sectionKey = toText(src.sectionKey || src.section_key || ctx.sectionKey || section.type || 'equipment') || 'equipment';
    const sourceTypeRaw = toText(src.sourceType || src.source_type || 'own') || 'own';
    const qty = nonNegative(src.qty == null ? (src.quantity == null ? src.count : src.quantity) : src.qty, 0);
    const weightKg = nonNegative(src.weightKg == null ? (src.weight_kg == null ? src.weight : src.weight_kg) : src.weightKg, 0);
    const powerW = nonNegative(src.powerW == null ? src.power_w : src.powerW, 0);
    const startupPowerW = nonNegative(src.startupPowerW == null ? src.startup_power_w : src.startupPowerW, 0);
    const note = toText(src.note || (Array.isArray(src.notes) ? src.notes.join('; ') : src.notes));
    const normalized = {
      sectionKey,
      section_key: sectionKey,
      sectionTitle: toText(src.sectionTitle || src.section_title) || sectionTitle(sectionKey, section),
      id: toText(src.id || src.itemId || src.item_id || src.inventoryItemId || src.code || src.name),
      itemId: toText(src.itemId || src.item_id || src.inventoryItemId || src.inventory_item_id || src.id),
      item_id: toText(src.itemId || src.item_id || src.inventoryItemId || src.inventory_item_id || src.id),
      code: toText(src.code || src.sku || src.id || src.itemId || src.item_id),
      name: toText(src.name || src.label || src.title || src.code || 'Позиция'),
      unit: toText(src.unit || 'шт') || 'шт',
      qty,
      quantity: qty,
      requestedQty: nonNegative(src.requestedQty == null ? (src.requested_qty == null ? qty : src.requested_qty) : src.requestedQty, qty),
      requested_qty: nonNegative(src.requestedQty == null ? (src.requested_qty == null ? qty : src.requested_qty) : src.requestedQty, qty),
      weightKg,
      weight_kg: weightKg,
      powerW,
      power_w: powerW,
      startupPowerW,
      startup_power_w: startupPowerW,
      sourceType: normalizeSourceType(sourceTypeRaw),
      source_type: normalizeSourceType(sourceTypeRaw),
      sourceSystem: toText(src.sourceSystem || src.source_system) || sourceSystem(sourceTypeRaw),
      source_system: toText(src.sourceSystem || src.source_system) || sourceSystem(sourceTypeRaw),
      supplierId: toText(src.supplierId || src.supplier_id),
      supplier_id: toText(src.supplierId || src.supplier_id),
      supplierName: toText(src.supplierName || src.supplier_name),
      supplier_name: toText(src.supplierName || src.supplier_name),
      rentalPrice: nonNegative(src.rentalPrice == null ? src.rental_price : src.rentalPrice, 0),
      rental_price: nonNegative(src.rentalPrice == null ? src.rental_price : src.rentalPrice, 0),
      subrentPrice: nonNegative(src.subrentPrice == null ? src.subrent_price : src.subrentPrice, 0),
      subrent_price: nonNegative(src.subrentPrice == null ? src.subrent_price : src.subrentPrice, 0),
      clientPrice: nonNegative(src.clientPrice == null ? src.client_price : src.clientPrice, 0),
      client_price: nonNegative(src.clientPrice == null ? src.client_price : src.clientPrice, 0),
      margin: nonNegative(src.margin, 0),
      stockQty: src.stockQty == null && src.stock_qty == null ? null : nonNegative(src.stockQty == null ? src.stock_qty : src.stockQty, 0),
      stock_qty: src.stockQty == null && src.stock_qty == null ? null : nonNegative(src.stockQty == null ? src.stock_qty : src.stockQty, 0),
      reservedQty: src.reservedQty == null && src.reserved_qty == null ? null : nonNegative(src.reservedQty == null ? src.reserved_qty : src.reservedQty, 0),
      reserved_qty: src.reservedQty == null && src.reserved_qty == null ? null : nonNegative(src.reservedQty == null ? src.reserved_qty : src.reservedQty, 0),
      availableQty: src.availableQty == null && src.available_qty == null ? null : nonNegative(src.availableQty == null ? src.available_qty : src.availableQty, 0),
      available_qty: src.availableQty == null && src.available_qty == null ? null : nonNegative(src.availableQty == null ? src.available_qty : src.availableQty, 0),
      deficitQty: nonNegative(src.deficitQty == null ? src.deficit_qty : src.deficitQty, 0),
      deficit_qty: nonNegative(src.deficitQty == null ? src.deficit_qty : src.deficitQty, 0),
      subrentQty: nonNegative(src.subrentQty == null ? src.subrent_qty : src.subrentQty, 0),
      subrent_qty: nonNegative(src.subrentQty == null ? src.subrent_qty : src.subrentQty, 0),
      inventoryStatus: toText(src.inventoryStatus || src.inventory_status),
      inventory_status: toText(src.inventoryStatus || src.inventory_status),
      inventoryItemId: toText(src.inventoryItemId || src.inventory_item_id),
      inventory_item_id: toText(src.inventoryItemId || src.inventory_item_id),
      sourceTypeSuggestion: toText(src.sourceTypeSuggestion || src.source_type_suggestion),
      source_type_suggestion: toText(src.sourceTypeSuggestion || src.source_type_suggestion),
      note,
      ok: src.ok !== false,
      stagePart: toText(src.stagePart),
      trussPart: toText(src.trussPart),
      ledPart: toText(src.ledPart),
      stageHeightM: nonNegative(src.stageHeightM == null ? (src.stage_height_m == null ? (section.stageHeightM || (section.result && section.result.stageHeightM)) : src.stage_height_m) : src.stageHeightM, 0),
      stage_height_m: nonNegative(src.stageHeightM == null ? (src.stage_height_m == null ? (section.stageHeightM || (section.result && section.result.stageHeightM)) : src.stage_height_m) : src.stageHeightM, 0),
      meters: nonNegative(src.meters, 0),
      trussLengthM: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0),
      truss_length_m: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0),
      trussStraightCount: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0),
      truss_straight_count: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0),
      meta: Object.assign({}, clone(src.meta || {}) || {}, {
        sharedBomBridgeVersion: SHARED_BOM_BRIDGE_VERSION,
        originalSourceType: sourceTypeRaw,
        sectionType: toText(section.type || sectionKey)
      })
    };
    if (!normalized.itemId && normalized.inventoryItemId) normalized.itemId = normalized.inventoryItemId;
    if (!normalized.item_id && normalized.itemId) normalized.item_id = normalized.itemId;
    return normalized;
  }

  function collectSectionBomRows(section, sectionKey, options) {
    const opts = options || {};
    if (!section) return [];
    const key = toText(sectionKey || section.type || 'equipment') || 'equipment';
    const rawRows = Array.isArray(section.bomRows)
      ? section.bomRows
      : Array.isArray(section.items)
        ? section.items
        : [];
    return rawRows
      .map(row => normalizeBomRow(row, { sectionKey: key, section }))
      .filter(row => opts.includeZeroRows || row.qty > 0 || row.weightKg > 0 || row.powerW > 0 || row.startupPowerW > 0);
  }

  function collectQuoteBomRows(quote, options) {
    const opts = options || {};
    const q = normalizeQuote(quote || {});
    const sections = q.sections || {};
    const keys = opts.sectionKey ? [opts.sectionKey] : SECTION_ORDER;
    let rows = [];
    keys.forEach(key => { rows = rows.concat(collectSectionBomRows(sections[key], key, opts)); });
    if (opts.aggregate) rows = aggregateBomRows(rows, opts);
    if (opts.enrichAvailability && availability() && availability().enrichBomRows) {
      rows = availability().enrichBomRows(rows, opts.inventoryItems);
    }
    return rows;
  }

  function aggregateBomRows(rows, options) {
    const opts = options || {};
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const normalized = normalizeBomRow(row, row && row.sectionKey || 'equipment');
      const key = [
        opts.ignoreSection ? '' : normalized.sectionKey,
        normalized.itemId || normalized.code || normalized.id || normalized.name,
        normalized.name,
        normalized.unit,
        normalized.sourceType,
        normalized.supplierName
      ].join('|');
      const prev = map.get(key) || Object.assign({}, normalized, {
        qty: 0,
        quantity: 0,
        requestedQty: 0,
        requested_qty: 0,
        weightKg: 0,
        weight_kg: 0,
        powerW: 0,
        power_w: 0,
        startupPowerW: 0,
        startup_power_w: 0,
        deficitQty: 0,
        deficit_qty: 0,
        subrentQty: 0,
        subrent_qty: 0,
        notes: []
      });
      prev.qty += normalized.qty;
      prev.quantity = prev.qty;
      prev.requestedQty += normalized.requestedQty;
      prev.requested_qty = prev.requestedQty;
      prev.weightKg += normalized.weightKg;
      prev.weight_kg = prev.weightKg;
      prev.powerW += normalized.powerW;
      prev.power_w = prev.powerW;
      prev.startupPowerW += normalized.startupPowerW;
      prev.startup_power_w = prev.startupPowerW;
      prev.deficitQty += normalized.deficitQty;
      prev.deficit_qty = prev.deficitQty;
      prev.subrentQty += normalized.subrentQty;
      prev.subrent_qty = prev.subrentQty;
      if (normalized.note) prev.notes.push(normalized.note);
      prev.note = prev.notes.join('; ');
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => `${a.sectionKey}|${a.name}`.localeCompare(`${b.sectionKey}|${b.name}`, 'ru'));
  }

  function summarizeRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += nonNegative(row.qty, 0);
      acc.weightKg += nonNegative(row.weightKg, 0);
      acc.powerW += nonNegative(row.powerW, 0);
      acc.startupPowerW += nonNegative(row.startupPowerW, 0);
      acc.deficitRows += nonNegative(row.deficitQty, 0) > 0 ? 1 : 0;
      acc.deficitQty += nonNegative(row.deficitQty, 0);
      acc.subrentRows += row.sourceType === 'subrent' || nonNegative(row.subrentQty, 0) > 0 ? 1 : 0;
      return acc;
    }, { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitRows: 0, deficitQty: 0, subrentRows: 0 });
  }

  function groupRowsBySection(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      const key = row.sectionKey || 'equipment';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }

  function buildSectionBridge(section, sectionKey, options) {
    const opts = options || {};
    let rows = collectSectionBomRows(section, sectionKey, opts);
    if (opts.aggregate) rows = aggregateBomRows(rows, opts);
    if (opts.enrichAvailability && availability() && availability().enrichBomRows) rows = availability().enrichBomRows(rows, opts.inventoryItems);
    return {
      type: 'feg-stage-pro-v4-shared-bom-section',
      version: SHARED_BOM_BRIDGE_VERSION,
      sectionKey: toText(sectionKey || section && section.type),
      sectionTitle: sectionTitle(toText(sectionKey || section && section.type), section),
      rows,
      totals: summarizeRows(rows),
      generatedAt: nowIso()
    };
  }

  function buildQuoteBomBridge(quote, options) {
    const opts = Object.assign({ enrichAvailability: true }, options || {});
    const q = normalizeQuote(quote || {});
    const rows = collectQuoteBomRows(q, opts);
    return {
      type: 'feg-stage-pro-v4-shared-bom-bridge',
      version: SHARED_BOM_BRIDGE_VERSION,
      quoteId: toText(q.id),
      quote_id: toText(q.id),
      rows,
      rowsBySection: groupRowsBySection(rows),
      totals: summarizeRows(rows),
      generatedAt: nowIso(),
      protectedFlows: ['legacy/v3', 'LED fastener formulas', 'stock movements', 'reservations', 'controlled backend writes']
    };
  }

  function buildQuoteItemRows(quote, options) {
    const q = normalizeQuote(quote || {});
    const rows = collectQuoteBomRows(q, Object.assign({ enrichAvailability: true }, options || {}));
    return rows.map((row, index) => {
      if (itemBuilder() && itemBuilder().normalizeQuoteItem) {
        return itemBuilder().normalizeQuoteItem(row, { quoteId: q.id, sectionKey: row.sectionKey, sectionTitle: row.sectionTitle, index: index + 1, suppliers: options && options.suppliers || [] });
      }
      const idBase = [q.id, row.sectionKey, row.itemId || row.code || row.name || index].join('-').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || `item-${index + 1}`;
      return Object.assign({}, row, {
        id: `qi-${idBase}`,
        quoteId: q.id,
        quote_id: q.id,
        sectionKey: row.sectionKey,
        section_key: row.sectionKey,
        itemId: row.itemId,
        item_id: row.itemId,
        sourceType: row.sourceType,
        source_type: row.sourceType
      });
    });
  }

  function bindSectionToQuote(quote, sectionKey, section) {
    const q = normalizeQuote(quote || {});
    const key = toText(sectionKey);
    if (binder() && binder().bindSection) return binder().bindSection(q, key, section);
    const sections = Object.assign({}, q.sections || {});
    sections[key] = clone(section || null);
    return model() && model().mergeQuotePatch ? model().mergeQuotePatch(q, { sections }) : Object.assign({}, q, { sections });
  }

  function bindStageInputToQuote(quote, input, overrides) {
    if (!binder() || !binder().bindStageSection) throw new Error('QuoteSectionBinder is not available for stage binding.');
    const bound = binder().bindStageSection(quote || {}, input || {}, overrides || {});
    return { quote: bound, section: bound.sections && bound.sections.stage, bridge: buildQuoteBomBridge(bound) };
  }

  function bindTrussInputToQuote(quote, input, overrides) {
    if (!binder() || !binder().bindTrussSection) throw new Error('QuoteSectionBinder is not available for truss binding.');
    const bound = binder().bindTrussSection(quote || {}, input || {}, overrides || {});
    return { quote: bound, section: bound.sections && bound.sections.truss, bridge: buildQuoteBomBridge(bound) };
  }



  function bindLedInputToQuote(quote, input, overrides) {
    let q = normalizeQuote(quote || {});
    let section = null;
    if (ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedSection) {
      section = ROOT.V4LedBomBridge.buildLedSection(input || {}, Object.assign({ source: 'V4SharedBomBridge.v4-led' }, overrides || {}));
      q = bindSectionToQuote(q, 'led', section);
    } else {
      if (!binder() || !binder().bindLedSection) throw new Error('QuoteSectionBinder is not available for LED binding.');
      q = binder().bindLedSection(q, input || {}, overrides || {});
      section = q.sections && q.sections.led;
    }
    return { quote: q, section, bridge: buildQuoteBomBridge(q) };
  }



  function flowCheck(key, ok, pass, fail) {
    return { key, ok: Boolean(ok), label: Boolean(ok) ? pass : fail };
  }

  function buildSectionFlowChecks(section, sharedRows, quoteItems, pickRows, sectionKey) {
    const rows = Array.isArray(sharedRows) ? sharedRows : [];
    const qRows = Array.isArray(quoteItems) ? quoteItems : [];
    const wRows = Array.isArray(pickRows) ? pickRows : [];
    const key = toText(sectionKey || 'section');
    const checks = [
      flowCheck('section_present', Boolean(section), `${key}: section есть в quote`, `${key}: section не найден в quote`),
      flowCheck('shared_rows', rows.length > 0 || !section, `${key}: shared BOM ${rows.length} строк`, `${key}: shared BOM пустой`),
      flowCheck('quote_items', qRows.length >= rows.length || rows.length === 0, `${key}: quote_items ${qRows.length} строк`, `${key}: quote_items меньше shared BOM ${qRows.length}/${rows.length}`),
      flowCheck('warehouse_picklist', wRows.length >= rows.length || rows.length === 0, `${key}: склад ${wRows.length} строк`, `${key}: складской лист меньше shared BOM ${wRows.length}/${rows.length}`),
      flowCheck('source_type_own', rows.every(row => row.sourceType === 'own' || row.sourceType === 'quick_ideal' || row.sourceType === 'subrent' || row.sourceType === 'manual' || row.sourceType === 'subrent_needed'), `${key}: sourceType нормализован`, `${key}: есть неожиданный sourceType`)
    ];
    const failed = checks.filter(row => !row.ok).length;
    return { ok: failed === 0, failed, rows: checks };
  }

  function buildSectionFlowSnapshot(quote, sectionKey, options) {
    const opts = options || {};
    const key = toText(sectionKey || opts.sectionKey || 'equipment') || 'equipment';
    let q = normalizeQuote(quote || {});
    let sections = Object.assign({}, q.sections || {});
    if (!sections[key] && opts.section) {
      sections[key] = clone(opts.section);
      q = model() && model().mergeQuotePatch ? model().mergeQuotePatch(q, { sections }) : Object.assign({}, q, { sections });
    }
    const section = sections[key] || null;
    const sharedRows = collectQuoteBomRows(q, Object.assign({}, opts, { sectionKey: key, enrichAvailability: opts.enrichAvailability === true }));
    const sectionBridge = section
      ? buildSectionBridge(section, key, Object.assign({}, opts, { enrichAvailability: opts.enrichAvailability === true }))
      : { type: 'feg-stage-pro-v4-shared-bom-section', version: SHARED_BOM_BRIDGE_VERSION, sectionKey: key, sectionTitle: SECTION_TITLES[key] || key, rows: [], totals: summarizeRows([]), generatedAt: nowIso() };
    const quoteItems = buildQuoteItemRows(q, Object.assign({}, opts, { sectionKey: key, enrichAvailability: opts.enrichAvailability === true }));
    const canBuildPickList = ROOT.WarehousePickListBuilder && ROOT.WarehousePickListBuilder.buildSectionPickList && ROOT.QuoteSummaryBuilder && ROOT.QuoteSummaryBuilder.collectBomRows;
    const pickList = canBuildPickList
      ? ROOT.WarehousePickListBuilder.buildSectionPickList(q, key)
      : { key, title: SECTION_TITLES[key] || key, rows: sharedRows, totalQty: sectionBridge.totals.qty, totalWeightKg: sectionBridge.totals.weightKg };
    const pickRows = pickList && Array.isArray(pickList.rows) ? pickList.rows : [];
    return {
      type: 'feg-stage-pro-v4-section-flow-snapshot',
      version: SHARED_BOM_BRIDGE_VERSION,
      sectionKey: key,
      sectionTitle: sectionTitle(key, section),
      sectionStatus: section && section.status || 'missing',
      section: clone(section),
      sharedRows,
      quoteItems,
      pickList,
      totals: summarizeRows(sharedRows),
      counts: { sharedBomRows: sharedRows.length, quoteItems: quoteItems.length, warehouseRows: pickRows.length },
      checks: buildSectionFlowChecks(section, sharedRows, quoteItems, pickRows, key),
      generatedAt: nowIso(),
      protectedFlows: ['legacy/v3', 'old v3 fallback', 'stock movements', 'reservations', 'controlled backend writes']
    };
  }

  function buildStageFlowSnapshot(quote, options) {
    const flow = buildSectionFlowSnapshot(quote, 'stage', options || {});
    return Object.assign({}, flow, {
      type: 'feg-stage-pro-v4-stage-flow-snapshot',
      geometry: clone(flow.section && flow.section.result && flow.section.result.geometry || {}),
      stageConfig: clone(flow.section && flow.section.stageConfig || {}),
      input: clone(flow.section && flow.section.input || {})
    });
  }

  function buildLedFlowSnapshot(quote, options) {
    if (ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedFlowSnapshot) {
      return ROOT.V4LedBomBridge.buildLedFlowSnapshot(quote || {}, options || {});
    }
    const flow = buildSectionFlowSnapshot(quote, 'led', options || {});
    return Object.assign({}, flow, {
      type: 'feg-stage-pro-v4-led-flow-snapshot',
      ledResult: clone(flow.section && flow.section.result || {}),
      input: clone(flow.section && flow.section.input || {})
    });
  }

  function buildUnifiedBomSummary(quote, options) {
    const q = normalizeQuote(quote || {});
    const bridge = buildQuoteBomBridge(q, Object.assign({ enrichAvailability: false }, options || {}));
    const quoteItems = itemBuilder() && itemBuilder().buildQuoteItems
      ? itemBuilder().buildQuoteItems(q, { includeTransport: false })
      : { rows: buildQuoteItemRows(q, options || {}), totals: {} };
    const pickLists = ROOT.WarehousePickListBuilder && ROOT.WarehousePickListBuilder.buildPickLists
      ? ROOT.WarehousePickListBuilder.buildPickLists(q)
      : { all: { rows: [] }, sections: [] };
    const sectionTotals = Object.entries(groupRowsBySection(bridge.rows)).map(([key, rows]) => {
      const totals = summarizeRows(rows);
      return {
        sectionKey: key,
        sectionTitle: rows[0] && rows[0].sectionTitle || SECTION_TITLES[key] || key,
        rows: totals.rows,
        qty: totals.qty,
        weightKg: totals.weightKg,
        powerW: totals.powerW,
        startupPowerW: totals.startupPowerW,
        deficitQty: totals.deficitQty,
        subrentRows: totals.subrentRows
      };
    }).sort((a, b) => String(a.sectionKey).localeCompare(String(b.sectionKey), 'ru'));
    const contractReadiness = options && options.skipContract ? null : (contract() && contract().buildBomReadinessReport ? contract().buildBomReadinessReport(q, { noPrices: true, requireRows: false }) : null);
    return {
      type: 'feg-stage-pro-v4-unified-bom-summary',
      version: SHARED_BOM_BRIDGE_VERSION,
      contractReadiness,
      quoteId: q.id,
      quote_id: q.id,
      bridge,
      quoteItems,
      pickLists,
      sectionTotals,
      totals: bridge.totals,
      generatedAt: nowIso()
    };
  }

  function buildBridgeReport(quote) {
    const q = normalizeQuote(quote || {});
    const bridge = buildQuoteBomBridge(q, { enrichAvailability: false });
    return {
      type: 'feg-stage-pro-v4-shared-bom-bridge-report',
      version: SHARED_BOM_BRIDGE_VERSION,
      quoteId: q.id,
      configuredSections: SECTION_ORDER.filter(key => q.sections && q.sections[key] && q.sections[key].status === 'configured'),
      rowCount: bridge.rows.length,
      totals: bridge.totals,
      quoteItemsReady: Boolean(itemBuilder() && itemBuilder().normalizeQuoteItem),
      pickListsReady: Boolean(ROOT.WarehousePickListBuilder && ROOT.WarehousePickListBuilder.buildPickLists),
      documentsReady: Boolean(ROOT.QuoteDocumentBuilder && ROOT.QuoteDocumentBuilder.buildTechnicalSheet),
      generatedAt: nowIso()
    };
  }


  function buildBomContractReport(quote, options) {
    const q = normalizeQuote(quote || {});
    if (contract() && contract().buildBomReadinessReport) return contract().buildBomReadinessReport(q, options || {});
    const bridge = buildQuoteBomBridge(q, { enrichAvailability: false });
    return {
      type: 'feg-stage-pro-v4-bom-readiness-report-fallback',
      version: SHARED_BOM_BRIDGE_VERSION,
      quoteId: q.id,
      ready: bridge.rows.length > 0,
      counts: { sharedBom: bridge.rows.length, quoteItems: buildQuoteItemRows(q, options || {}).length, warehouse: 0 },
      totals: bridge.totals,
      targets: { quoteWizard: true, documents: true, warehousePickList: false, backendQuoteItems: true, legacyV3Touched: false },
      generatedAt: nowIso()
    };
  }

  ROOT.V4SharedBomBridge = {
    SHARED_BOM_BRIDGE_VERSION,
    SECTION_ORDER,
    SECTION_TITLES,
    normalizeBomRow,
    collectSectionBomRows,
    collectQuoteBomRows,
    aggregateBomRows,
    summarizeRows,
    buildSectionBridge,
    buildQuoteBomBridge,
    buildQuoteItemRows,
    buildSectionFlowSnapshot,
    buildStageFlowSnapshot,
    buildLedFlowSnapshot,
    buildUnifiedBomSummary,
    buildBomContractReport,
    bindSectionToQuote,
    bindStageInputToQuote,
    bindTrussInputToQuote,
    bindLedInputToQuote,
    buildBridgeReport
  };
})();
