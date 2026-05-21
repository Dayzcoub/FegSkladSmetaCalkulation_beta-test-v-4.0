// FEG Stage PRO v3.17.38 — V4LedBomBridge
// Connects single and freeform LED constructions to the shared v4 BOM/quote_items/warehouse/contract flow without changing LED formulas.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const V4_LED_BOM_BRIDGE_VERSION = '3.17.38';
  const SECTION_KEY = 'led';
  const SECTION_TITLE = 'LED экран';

  function calc() { return ROOT.LedCalculator || null; }
  function bridge() { return ROOT.V4SharedBomBridge || null; }
  function model() { return ROOT.QuoteModel || null; }

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toText(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function formatNumber(value, digits) {
    const n = Number(value || 0);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }

  function isQuickCatalogMode(input, overrides) {
    const src = input || {};
    const ov = overrides || {};
    const explicit = toText(ov.catalogMode || ov.sourceMode || src.catalogMode || src.sourceMode).toLowerCase();
    if (explicit === 'quick' || explicit === 'quick_ideal' || explicit === 'ideal') return true;
    if (explicit === 'quote' || explicit === 'inventory' || explicit === 'warehouse' || explicit === 'real') return false;
    const source = toText(ov.source || src.source).toLowerCase();
    return /(^|[-_.:])quick($|[-_.:])|quick-/.test(source) || source.includes('quick_');
  }

  function getCatalogMode(input, overrides) { return isQuickCatalogMode(input || {}, overrides || {}) ? 'quick' : 'quote'; }

  function getCatalogRowContext(input, overrides) {
    const catalogMode = getCatalogMode(input || {}, overrides || {});
    return {
      catalogMode,
      sourceType: catalogMode === 'quick' ? 'quick_ideal' : 'own',
      sourceSystem: catalogMode === 'quick' ? 'quick_ideal_catalog' : 'equipment_database_system_part'
    };
  }

  function getFormat(formatId) {
    return calc() && calc().getCabinetFormat ? calc().getCabinetFormat(formatId || '640x640') : { id: '640x640', defaultWeightKg: 14, defaultPowerW: 320, defaultStartupPowerW: 600 };
  }

  function getLeg(legTypeId) {
    return calc() && calc().getLegType ? calc().getLegType(legTypeId || '3m') : { id: '3m', defaultWeightKg: 4 };
  }

  function normalizeLedInput(input) {
    const src = input || {};
    const format = getFormat(src.format || src.formatId);
    const leg = getLeg(src.legType || src.legTypeId);
    const layoutBlocks = Array.isArray(src.layoutBlocks) ? clone(src.layoutBlocks) : [];
    const explicitEmptyLayout = src.explicitEmptyLayout === true || src.explicitEmptyLayout === 'true';
    const mount = calc() && calc().getMountFlags
      ? calc().getMountFlags(src)
      : { standing: src.mountStanding !== false && src.standing !== false, hanging: src.mountHanging === true || src.mountHanging === 'true' || src.hanging === true || src.hanging === 'true', mode: '' };
    return {
      widthM: nonNegative(src.widthM, 4),
      heightM: nonNegative(src.heightM, 2.56),
      format: toText(src.format || src.formatId, format.id || '640x640'),
      pitch: toText(src.pitch || src.pitchId, 'p4'),
      cabinetWeightKg: nonNegative(src.cabinetWeightKg, format.defaultWeightKg || 0),
      cabinetPowerW: nonNegative(src.cabinetPowerW, format.defaultPowerW || 0),
      cabinetStartupPowerW: nonNegative(src.cabinetStartupPowerW, format.defaultStartupPowerW || 0),
      legType: toText(src.legType || src.legTypeId, leg.id || '3m'),
      legCount: Math.max(0, Math.round(nonNegative(src.legCount, 0))),
      mountMode: toText(src.mountMode || src.mount, mount.mode),
      mountStanding: mount.standing,
      mountHanging: mount.hanging,
      explicitEmptyLayout,
      layoutMode: layoutBlocks.length || explicitEmptyLayout ? 'freeform' : toText(src.layoutMode, ''),
      layoutBlocks,
      sourceMode: toText(src.sourceMode || src.catalogMode),
      catalogMode: toText(src.catalogMode || src.sourceMode)
    };
  }

  function calculateLedResult(ledInput) {
    const input = ledInput || {};
    if (calc() && calc().calculateLedLayout && (input.explicitEmptyLayout || input.layoutMode === 'freeform' || (Array.isArray(input.layoutBlocks) && input.layoutBlocks.length))) {
      return calc().calculateLedLayout(input);
    }
    return calc().calculateLedScreen(input);
  }

  function ledPartForRow(row) {
    const id = toText(row && (row.id || row.itemId || row.code)).toLowerCase();
    if (id.includes('cabinet')) return 'cabinet';
    if (id.includes('power-link')) return 'power_link_220';
    if (id.includes('rj45')) return 'rj45_link';
    if (id.includes('powercon')) return 'powercon_schuko';
    if (id.includes('spanset') || id.includes('спанц')) return 'led_spanset';
    if (id.includes('shackle') || id.includes('шакл')) return 'led_shackle';
    if (id.includes('hanging') || id.includes('hang')) return 'hanging_bar';
    if (id.includes('leg')) return 'leg';
    if (id.includes('bracket')) return 'bracket_cookie';
    if (id.includes('m8x20')) return 'm8x20_bolt';
    if (id.includes('m8') || id.includes('bolt')) return 'm8_bolt';
    return 'led_accessory';
  }

  function buildInventoryId(row, result) {
    const id = toText(row && (row.id || row.code || row.name), 'led-item').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '');
    const format = result && result.format && result.format.id ? result.format.id : '';
    const pitch = result && result.pitch && result.pitch.id ? result.pitch.id : '';
    if (id === 'led-cabinet' && format) return `led-cabinet-${format}-${pitch || 'pitch'}`;
    if (id === 'led-leg' && result && result.legType && result.legType.id) return `led-leg-${result.legType.id}`;
    return id || 'led-item';
  }

  function normalizeLedBomRow(row, result, index, context) {
    const src = row || {};
    const qty = nonNegative(src.qty == null ? src.quantity : src.qty, 0);
    const weightKg = nonNegative(src.weightKg == null ? src.weight_kg : src.weightKg, 0);
    const powerW = nonNegative(src.powerW == null ? src.power_w : src.powerW, 0);
    const startupPowerW = nonNegative(src.startupPowerW == null ? src.startup_power_w : src.startupPowerW, 0);
    const ctx = context || {};
    const isQuick = ctx.catalogMode === 'quick';
    const itemId = buildInventoryId(src, result);
    const unitWeightKg = qty > 0 ? weightKg / qty : 0;
    return Object.assign({}, clone(src) || {}, {
      id: toText(src.id || itemId || `led-row-${index + 1}`),
      itemId,
      item_id: itemId,
      inventoryItemId: isQuick ? '' : itemId,
      inventory_item_id: isQuick ? '' : itemId,
      code: toText(src.code || itemId).toUpperCase(),
      name: toText(src.name || src.label || src.title, 'LED позиция'),
      unit: toText(src.unit, 'шт'),
      qty,
      quantity: qty,
      requestedQty: qty,
      requested_qty: qty,
      unitWeightKg,
      unit_weight_kg: unitWeightKg,
      weightKg,
      weight_kg: weightKg,
      powerW,
      power_w: powerW,
      startupPowerW,
      startup_power_w: startupPowerW,
      sourceType: ctx.sourceType || 'own',
      source_type: ctx.sourceType || 'own',
      sourceSystem: ctx.sourceSystem || 'equipment_database_system_part',
      source_system: ctx.sourceSystem || 'equipment_database_system_part',
      inventoryStatus: isQuick ? 'quick_ideal' : toText(src.inventoryStatus || src.inventory_status),
      inventory_status: isQuick ? 'quick_ideal' : toText(src.inventoryStatus || src.inventory_status),
      deficitQty: 0,
      deficit_qty: 0,
      ledPart: ledPartForRow(src),
      led_part: ledPartForRow(src),
      note: toText(src.note || src.notes),
      ok: src.ok !== false,
      meta: Object.assign({}, clone(src.meta || {}) || {}, {
        v4LedBomBridgeVersion: V4_LED_BOM_BRIDGE_VERSION,
        formulaPreserved: true,
        sectionType: SECTION_KEY,
        catalogMode: ctx.catalogMode || 'quote',
        quickIdealCatalog: isQuick
      })
    });
  }

  function buildLedBomRows(result, options) {
    if (!calc() || !calc().buildLedBomRows) return [];
    const res = result || calc().calculateLedScreen({});
    const ctx = getCatalogRowContext(options || {}, options || {});
    return calc().buildLedBomRows(res).map((row, index) => normalizeLedBomRow(row, res, index, ctx)).filter(row => row.qty > 0 || row.weightKg > 0 || row.powerW > 0 || row.startupPowerW > 0);
  }

  function extractLedResult(result) {
    const res = result || {};
    return {
      formatId: res.format && res.format.id || '',
      formatName: res.format && res.format.name || '',
      pitchId: res.pitch && res.pitch.id || '',
      pitchName: res.pitch && res.pitch.name || '',
      desiredWidthM: nonNegative(res.desiredWidthM, 0),
      desiredHeightM: nonNegative(res.desiredHeightM, 0),
      actualWidthM: nonNegative(res.actualWidthM, 0),
      actualHeightM: nonNegative(res.actualHeightM, 0),
      areaM2: nonNegative(res.areaM2, 0),
      requestedAreaM2: nonNegative(res.requestedAreaM2, 0),
      columns: nonNegative(res.columns, 0),
      rows: nonNegative(res.rows, 0),
      cabinetCount: nonNegative(res.cabinetCount, 0),
      cabinetWeightKg: nonNegative(res.cabinetWeightKg, 0),
      cabinetPowerW: nonNegative(res.cabinetPowerW, 0),
      cabinetStartupPowerW: nonNegative(res.cabinetStartupPowerW, 0),
      cabinetPixelsX: nonNegative(res.cabinetPixelsX, 0),
      cabinetPixelsY: nonNegative(res.cabinetPixelsY, 0),
      totalPixelsX: nonNegative(res.totalPixelsX, 0),
      totalPixelsY: nonNegative(res.totalPixelsY, 0),
      totalPixels: nonNegative(res.totalPixels, 0),
      activePixels: nonNegative(res.activePixels, res.totalPixels || 0),
      layoutMode: toText(res.layoutMode, 'single'),
      constructionCount: nonNegative(res.constructionCount, Array.isArray(res.constructions) ? res.constructions.length : 1),
      constructions: clone(res.constructions || []),
      layoutBounds: clone(res.layoutBounds || {}),
      legTypeId: res.legType && res.legType.id || '',
      legTypeName: res.legType && res.legType.name || '',
      mountMode: toText(res.mountMode, ''),
      mountStanding: res.mountStanding !== false,
      mountHanging: res.mountHanging === true,
      hangingBarCount: nonNegative(res.hangingBarCount, 0),
      hangingBarsWeightKg: nonNegative(res.hangingBarsWeightKg, 0),
      spansetCount: nonNegative(res.spansetCount, 0),
      spansetsWeightKg: nonNegative(res.spansetsWeightKg, 0),
      shackleCount: nonNegative(res.shackleCount, 0),
      shacklesWeightKg: nonNegative(res.shacklesWeightKg, 0),
      aspectRatioLabel: toText(res.aspectRatioLabel, ''),
      legCount: nonNegative(res.legCount, 0),
      legWeightKg: nonNegative(res.legWeightKg, 0),
      standingBrackets: nonNegative(res.standingBrackets, 0),
      hangingBrackets: nonNegative(res.hangingBrackets, 0),
      hangingBarBrackets: nonNegative(res.hangingBarBrackets, 0),
      hangingCabinetBrackets: nonNegative(res.hangingCabinetBrackets, 0),
      brackets: nonNegative(res.brackets, 0),
      standingM8x60Bolts: nonNegative(res.standingM8x60Bolts, res.m8Bolts || 0),
      m8Bolts: nonNegative(res.m8Bolts, 0),
      m8x20Bolts: nonNegative(res.m8x20Bolts, 0),
      hangingRiggingByConstruction: clone(res.hangingRiggingByConstruction || []),
      powerLinks: nonNegative(res.powerLinks, 0),
      rj45Links: nonNegative(res.rj45Links, 0),
      powerconSchukoCables: nonNegative(res.powerconSchukoCables, 0),
      powerconSchukoWattsPerCable: nonNegative(res.powerconSchukoWattsPerCable, res.powerconSchukoPerCable || 3400),
      powerconSchukoByConstruction: clone(res.powerconSchukoByConstruction || []),
      fourCabinetJoints: nonNegative(res.fourCabinetJoints, 0),
      totalWeightKg: nonNegative(res.totalWeightKg, 0),
      totalPowerW: nonNegative(res.totalPowerW, 0),
      totalPowerKw: nonNegative(res.totalPowerKw, 0),
      totalStartupPowerW: nonNegative(res.totalStartupPowerW, 0),
      totalStartupPowerKw: nonNegative(res.totalStartupPowerKw, 0),
      widthRound: clone(res.widthRound || {}),
      heightRound: clone(res.heightRound || {})
    };
  }

  function buildLedSection(input, overrides) {
    if (!calc()) throw new Error('LedCalculator is not available.');
    const opts = overrides || {};
    const ledInput = normalizeLedInput(input || {});
    const result = calculateLedResult(ledInput);
    const summary = calc().summarizeLed(result);
    const catalogMode = getCatalogMode(ledInput, opts);
    ledInput.catalogMode = catalogMode;
    ledInput.sourceMode = catalogMode;
    const rows = buildLedBomRows(result, Object.assign({}, opts, { catalogMode, sourceMode: catalogMode }));
    const section = Object.assign({
      type: SECTION_KEY,
      sectionKey: SECTION_KEY,
      binderVersion: toText(opts.binderVersion, 'V4LedBomBridge'),
      bomBridgeVersion: V4_LED_BOM_BRIDGE_VERSION,
      status: 'configured',
      source: toText(opts.source, 'V4LedBomBridge'),
      catalogMode,
      sourceMode: catalogMode,
      title: summary.title,
      summary: `${summary.cabinets} · ${summary.actualSize} · ${formatNumber(summary.weightKg, 1)} кг · ${formatNumber(summary.powerKw, 2)} кВт · пуск ${formatNumber(summary.startupPowerKw, 2)} кВт`,
      input: ledInput,
      result: extractLedResult(result),
      constructions: clone(result.constructions || []),
      bomRows: rows,
      rental: nonNegative(opts.rental, 0),
      weightKg: result.totalWeightKg,
      totalWeightKg: result.totalWeightKg,
      powerW: result.totalPowerW,
      totalPowerW: result.totalPowerW,
      startupPowerW: result.totalStartupPowerW,
      totalStartupPowerW: result.totalStartupPowerW,
      pixelSummary: `${result.totalPixelsX}×${result.totalPixelsY} px`,
      readyFor: {
        sharedBom: true,
        quoteItems: true,
        warehousePickList: true,
        documents: true,
        bomContract: true,
        backendQuoteItems: true,
        legacyV3Touched: false
      },
      protectedFlows: ['legacy/v3', 'old v3 fallback', 'stage/truss formulas', 'stock movements', 'reservations', 'controlled backend writes'],
      updatedAt: nowIso()
    }, opts);
    section.bomRows = rows;
    section.input = ledInput;
    section.result = extractLedResult(result);
    section.constructions = clone(result.constructions || []);
    section.sectionKey = SECTION_KEY;
    section.type = SECTION_KEY;
    section.status = 'configured';
    return section;
  }

  function makeLedQuote(section, meta) {
    const q = model() && model().createQuoteDraft ? model().createQuoteDraft({
      id: toText(meta && meta.id, 'led_bom_bridge_preview'),
      status: 'draft',
      project: { name: toText(meta && meta.projectName, 'LED BOM preview') },
      scope: { stage: false, truss: false, led: true, transport: false },
      sections: { stage: null, truss: null, led: section || null, equipment: { items: [], notes: '' } }
    }) : { id: 'led_bom_bridge_preview', sections: { led: section } };
    return q;
  }

  function buildLedSharedBomSnapshot(inputOrSection, options) {
    const opts = options || {};
    const section = inputOrSection && inputOrSection.type === SECTION_KEY && Array.isArray(inputOrSection.bomRows)
      ? clone(inputOrSection)
      : buildLedSection(inputOrSection || {}, opts);
    const quote = makeLedQuote(section, opts);
    const sectionBridge = bridge() && bridge().buildSectionBridge ? bridge().buildSectionBridge(section, SECTION_KEY, { enrichAvailability: opts.enrichAvailability === true }) : { rows: section.bomRows || [], totals: summarizeRows(section.bomRows || []) };
    const quoteItems = bridge() && bridge().buildQuoteItemRows ? bridge().buildQuoteItemRows(quote, { sectionKey: SECTION_KEY, enrichAvailability: opts.enrichAvailability === true }) : [];
    return {
      type: 'feg-stage-pro-v4-led-shared-bom-snapshot',
      version: V4_LED_BOM_BRIDGE_VERSION,
      section,
      sharedRows: sectionBridge.rows || [],
      quoteItems,
      totals: sectionBridge.totals || summarizeRows(sectionBridge.rows || []),
      generatedAt: nowIso()
    };
  }

  function buildLedFlowSnapshot(quote, options) {
    const q = quote || makeLedQuote(buildLedSection({}, options || {}), options || {});
    const flow = bridge() && bridge().buildSectionFlowSnapshot
      ? bridge().buildSectionFlowSnapshot(q, SECTION_KEY, options || {})
      : null;
    if (!flow) return null;
    const section = flow.section || {};
    const result = section.result || {};
    return Object.assign({}, flow, {
      type: 'feg-stage-pro-v4-led-flow-snapshot',
      version: V4_LED_BOM_BRIDGE_VERSION,
      ledResult: clone(result),
      input: clone(section.input || {}),
      screen: {
        actualSize: `${formatNumber(result.actualWidthM, 2)}×${formatNumber(result.actualHeightM, 2)} м`,
        requestedSize: `${formatNumber(result.desiredWidthM, 2)}×${formatNumber(result.desiredHeightM, 2)} м`,
        cabinets: `${formatNumber(result.columns, 0)}×${formatNumber(result.rows, 0)} = ${formatNumber(result.cabinetCount, 0)} шт`,
        pixels: `${formatNumber(result.totalPixelsX, 0)}×${formatNumber(result.totalPixelsY, 0)} px`,
        power: `${formatNumber(result.totalPowerW, 0)} Вт`,
        startupPower: `${formatNumber(result.totalStartupPowerW, 0)} Вт`
      }
    });
  }

  function summarizeRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += nonNegative(row.qty, 0);
      acc.weightKg += nonNegative(row.weightKg, 0);
      acc.powerW += nonNegative(row.powerW, 0);
      acc.startupPowerW += nonNegative(row.startupPowerW, 0);
      return acc;
    }, { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0 });
  }

  ROOT.V4LedBomBridge = {
    V4_LED_BOM_BRIDGE_VERSION,
    normalizeLedInput,
    calculateLedResult,
    normalizeLedBomRow,
    getCatalogMode,
    buildLedBomRows,
    buildLedSection,
    buildLedSharedBomSnapshot,
    buildLedFlowSnapshot,
    extractLedResult,
    makeLedQuote
  };
})();
