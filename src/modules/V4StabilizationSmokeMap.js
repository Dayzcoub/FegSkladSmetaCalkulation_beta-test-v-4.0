// FEG Stage PRO v3.15.64 — V4 stabilization smoke map
// Read-only diagnostics for Stage / Truss / LED summary and BOM flow before visualizer foundation.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STABILIZATION_SMOKE_VERSION = '3.15.64';
  const DEFAULT_SECTION_KEYS = Object.freeze(['stage', 'truss', 'led']);
  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран'
  });
  const PROTECTED_FLOWS = Object.freeze([
    'legacy/v3',
    'old v3 fallback',
    'LED formulas',
    'stage formulas',
    'truss load checks',
    'spanInfo',
    'auto C2 joints',
    'stock movements',
    'reservations',
    'controlled backend writes'
  ]);

  function nowIso() { return new Date().toISOString(); }
  function toText(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (_) { return value; }
  }
  function sectionTitle(key, section) {
    return toText(section && section.title) || SECTION_TITLES[key] || key || 'Раздел';
  }
  function getSection(quote, key) {
    return quote && quote.sections && quote.sections[key] || null;
  }
  function getSummaryRow(quote, key) {
    if (!ROOT.QuoteSummaryBuilder || typeof ROOT.QuoteSummaryBuilder.getSectionRows !== 'function') return null;
    const rows = ROOT.QuoteSummaryBuilder.getSectionRows(quote || {});
    return rows.find(row => row.key === key) || null;
  }
  function getFlowSnapshot(quote, key, options) {
    if (ROOT.V4SharedBomBridge && typeof ROOT.V4SharedBomBridge.buildSectionFlowSnapshot === 'function') {
      return ROOT.V4SharedBomBridge.buildSectionFlowSnapshot(quote || {}, key, Object.assign({ enrichAvailability: false }, options || {}));
    }
    const section = getSection(quote, key);
    const rows = section && Array.isArray(section.bomRows) ? section.bomRows : [];
    return {
      type: 'feg-stage-pro-v4-section-flow-snapshot-fallback',
      version: STABILIZATION_SMOKE_VERSION,
      sectionKey: key,
      sectionTitle: sectionTitle(key, section),
      sectionStatus: section && section.status || 'missing',
      sharedRows: rows,
      quoteItems: rows,
      pickList: { rows },
      totals: summarizeRows(rows),
      counts: { sharedBomRows: rows.length, quoteItems: rows.length, warehouseRows: rows.length },
      checks: { ok: Boolean(section), failed: section ? 0 : 1, rows: [] }
    };
  }
  function getQuickSheets(section, key) {
    if (!ROOT.QuickTechnicalSheets) return { technical: null, warehouse: null };
    const svc = ROOT.QuickTechnicalSheets;
    const technical = typeof svc.buildSectionTechnicalSheet === 'function' ? svc.buildSectionTechnicalSheet(key, section) : null;
    const warehouse = typeof svc.buildSectionWarehouseSheet === 'function' ? svc.buildSectionWarehouseSheet(key, section) : null;
    return { technical, warehouse };
  }
  function summarizeRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += nonNegative(row && (row.qty == null ? row.quantity : row.qty), 0);
      acc.weightKg += nonNegative(row && (row.weightKg == null ? row.weight_kg : row.weightKg), 0);
      acc.powerW += nonNegative(row && (row.powerW == null ? row.power_w : row.powerW), 0);
      acc.startupPowerW += nonNegative(row && (row.startupPowerW == null ? row.startup_power_w : row.startupPowerW), 0);
      return acc;
    }, { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0 });
  }
  function sameCountOrEmpty(left, right) {
    return nonNegative(left, 0) === nonNegative(right, 0) || nonNegative(left, 0) === 0 || nonNegative(right, 0) === 0;
  }
  function check(key, ok, pass, fail, meta) {
    return Object.assign({ key, ok: Boolean(ok), label: Boolean(ok) ? pass : fail }, meta || {});
  }
  function hasPlacementLeak(section) {
    const text = JSON.stringify(section || {});
    return ['placementLayer', 'placementId', 'placementLabel', 'stageRelation', 'stageAnchor', 'visualSlot'].some(marker => text.includes(marker));
  }
  function buildSectionSmokeRow(quote, sectionKey, options) {
    const key = toText(sectionKey, 'section');
    const section = getSection(quote, key);
    const summaryRow = getSummaryRow(quote, key);
    const flow = getFlowSnapshot(quote, key, options || {});
    const sharedRows = Array.isArray(flow && flow.sharedRows) ? flow.sharedRows : [];
    const quoteItems = Array.isArray(flow && flow.quoteItems) ? flow.quoteItems : [];
    const warehouseRows = flow && flow.pickList && Array.isArray(flow.pickList.rows) ? flow.pickList.rows : [];
    const quick = getQuickSheets(section, key);
    const techRows = quick.technical && Array.isArray(quick.technical.bomRows) ? quick.technical.bomRows : [];
    const warehouseSheetRows = quick.warehouse && Array.isArray(quick.warehouse.rows) ? quick.warehouse.rows : [];
    const sectionBomRows = section && Array.isArray(section.bomRows) ? section.bomRows : [];
    const checks = [
      check('section_configured', section && section.status === 'configured', `${key}: section configured`, `${key}: section не configured`),
      check('summary_row', Boolean(summaryRow && summaryRow.configured), `${key}: есть configured summary row`, `${key}: нет configured summary row`),
      check('summary_text', Boolean(summaryRow && summaryRow.summary || section && section.summary), `${key}: summary text заполнен`, `${key}: summary text пустой`),
      check('section_bom_rows', sectionBomRows.length > 0, `${key}: section BOM ${sectionBomRows.length} строк`, `${key}: section BOM пустой`),
      check('shared_bom_rows', sharedRows.length > 0, `${key}: shared BOM ${sharedRows.length} строк`, `${key}: shared BOM пустой`),
      check('quote_items_rows', quoteItems.length >= sharedRows.length, `${key}: quote_items ${quoteItems.length} строк`, `${key}: quote_items меньше shared BOM ${quoteItems.length}/${sharedRows.length}`),
      check('warehouse_rows', warehouseRows.length >= sharedRows.length, `${key}: склад ${warehouseRows.length} строк`, `${key}: склад меньше shared BOM ${warehouseRows.length}/${sharedRows.length}`),
      check('quick_tech_rows', sameCountOrEmpty(techRows.length, sectionBomRows.length), `${key}: техлист ${techRows.length} строк`, `${key}: техлист не совпал с section BOM ${techRows.length}/${sectionBomRows.length}`),
      check('quick_warehouse_rows', sameCountOrEmpty(warehouseSheetRows.length, sectionBomRows.length), `${key}: складской лист ${warehouseSheetRows.length} строк`, `${key}: складской лист не совпал с section BOM ${warehouseSheetRows.length}/${sectionBomRows.length}`)
    ];
    if (flow && flow.checks && flow.checks.ok === false) {
      checks.push(check('flow_snapshot', false, `${key}: flow snapshot ok`, `${key}: flow snapshot failed`, { failed: flow.checks.failed || 0 }));
    } else {
      checks.push(check('flow_snapshot', true, `${key}: flow snapshot ok`, `${key}: flow snapshot failed`));
    }
    if (key === 'led') {
      const result = section && section.result || {};
      checks.push(check('led_no_placement_meta', !hasPlacementLeak(section), 'led: placement meta отсутствует в калькуляторе', 'led: найден placement meta leak'));
      checks.push(check('led_powercon_by_power', Array.isArray(result.powerconSchukoByConstruction) && result.powerconSchukoWattsPerCable === 3400, 'led: PowerCON по мощности конструкций', 'led: PowerCON не подтверждён по мощности'));
      if (result.mountHanging) {
        checks.push(check('led_hanging_rigging_rows', Array.isArray(result.hangingRiggingByConstruction) && result.hangingRiggingByConstruction.length > 0, 'led: hanging rigging по конструкциям', 'led: нет hanging rigging по конструкциям'));
        checks.push(check('led_spanset_shackle_parity', nonNegative(result.spansetCount, 0) === nonNegative(result.hangingBarCount, 0) && nonNegative(result.shackleCount, 0) === nonNegative(result.hangingBarCount, 0), 'led: Спанцет/Шакл = Hanging Bar', 'led: Спанцет/Шакл не равны Hanging Bar'));
      }
    }
    const failed = checks.filter(row => !row.ok);
    return {
      sectionKey: key,
      title: sectionTitle(key, section),
      ok: failed.length === 0,
      status: section && section.status || 'missing',
      summary: toText(section && section.summary || summaryRow && summaryRow.summary),
      counts: {
        sectionBomRows: sectionBomRows.length,
        sharedBomRows: sharedRows.length,
        quoteItems: quoteItems.length,
        warehouseRows: warehouseRows.length,
        quickTechRows: techRows.length,
        quickWarehouseRows: warehouseSheetRows.length
      },
      totals: {
        sectionWeightKg: nonNegative(section && (section.weightKg == null ? section.totalWeightKg : section.weightKg), 0),
        summaryWeightKg: nonNegative(summaryRow && summaryRow.weightKg, 0),
        sharedWeightKg: nonNegative(flow && flow.totals && flow.totals.weightKg, 0),
        sectionPowerW: nonNegative(section && (section.powerW == null ? section.totalPowerW : section.powerW), 0),
        summaryPowerW: nonNegative(summaryRow && summaryRow.powerW, 0),
        sharedPowerW: nonNegative(flow && flow.totals && flow.totals.powerW, 0),
        startupPowerW: nonNegative(section && (section.startupPowerW == null ? section.totalStartupPowerW : section.startupPowerW), 0)
      },
      checks,
      failedChecks: failed.map(row => row.key),
      flowType: flow && flow.type || '',
      generatedAt: nowIso()
    };
  }
  function buildStabilizationSmokeMap(quote, options) {
    const opts = options || {};
    const keys = Array.isArray(opts.sectionKeys) && opts.sectionKeys.length ? opts.sectionKeys : DEFAULT_SECTION_KEYS;
    const q = quote || {};
    const sections = keys.map(key => buildSectionSmokeRow(q, key, opts));
    const failedSections = sections.filter(row => !row.ok);
    return {
      type: 'feg-stage-pro-v4-stabilization-smoke-map',
      version: STABILIZATION_SMOKE_VERSION,
      ok: failedSections.length === 0,
      quoteId: toText(q.id),
      sectionKeys: keys.slice(),
      sections,
      failedSections: failedSections.map(row => row.sectionKey),
      summaryRows: ROOT.QuoteSummaryBuilder && ROOT.QuoteSummaryBuilder.getSectionRows ? clone(ROOT.QuoteSummaryBuilder.getSectionRows(q)) : [],
      protectedFlows: PROTECTED_FLOWS.slice(),
      generatedAt: nowIso()
    };
  }
  function buildSmokeMapText(smokeMap) {
    const map = smokeMap || {};
    const lines = [];
    lines.push(`FEG Stage PRO v${STABILIZATION_SMOKE_VERSION} — stabilization smoke map`);
    lines.push(`Статус: ${map.ok ? 'OK' : 'FAILED'}`);
    (Array.isArray(map.sections) ? map.sections : []).forEach(section => {
      lines.push('');
      lines.push(`${section.ok ? '✓' : '✕'} ${section.title || section.sectionKey}`);
      lines.push(`Summary: ${section.summary || '—'}`);
      lines.push(`Rows: section ${section.counts && section.counts.sectionBomRows || 0}, shared ${section.counts && section.counts.sharedBomRows || 0}, quote_items ${section.counts && section.counts.quoteItems || 0}, warehouse ${section.counts && section.counts.warehouseRows || 0}`);
      (section.checks || []).forEach(row => lines.push(`- ${row.ok ? 'OK' : 'FAIL'} ${row.label}`));
    });
    lines.push('');
    lines.push(`Protected flows: ${(map.protectedFlows || PROTECTED_FLOWS).join(', ')}`);
    return lines.join('\n');
  }

  ROOT.V4StabilizationSmokeMap = {
    STABILIZATION_SMOKE_VERSION,
    DEFAULT_SECTION_KEYS,
    PROTECTED_FLOWS,
    buildSectionSmokeRow,
    buildStabilizationSmokeMap,
    buildSmokeMapText
  };
})();
