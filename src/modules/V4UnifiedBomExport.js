// FEG Stage PRO v3.15.43 — V4UnifiedBomExport
// Builds no-price unified v4 technical and warehouse export documents from the shared BOM bridge.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const UNIFIED_BOM_EXPORT_VERSION = '3.15.43';
  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран',
    equipment: 'Оборудование и услуги',
    transport: 'Транспорт'
  });

  function model() { return ROOT.QuoteModel || null; }
  function bridge() { return ROOT.V4SharedBomBridge || null; }
  function itemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }
  function contract() { return ROOT.V4BomContract || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }

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
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function count(value) { return Number(nonNegative(value, 0)).toLocaleString('ru-RU'); }
  function weight(value) { return `${Number(nonNegative(value, 0)).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`; }
  function power(value) { return `${Number(nonNegative(value, 0)).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} Вт`; }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || { sections: {} });
  }

  function normalizeSection(section, key) {
    if (!section) return null;
    const out = clone(section) || {};
    out.type = toText(out.type || key);
    out.sectionKey = toText(out.sectionKey || key);
    out.title = toText(out.title || SECTION_TITLES[key] || key);
    out.status = toText(out.status || 'configured');
    return out;
  }

  function makeQuoteFromSections(sections, meta) {
    const src = sections || {};
    const enabled = {};
    const normalizedSections = { equipment: { items: [], notes: '' } };
    ['stage', 'truss', 'led', 'equipment'].forEach(key => {
      const section = normalizeSection(src[key], key);
      if (!section) return;
      normalizedSections[key] = section;
      enabled[key] = section.status !== 'disabled';
    });
    return normalizeQuote({
      id: toText(meta && meta.id) || 'quick_unified_bom_export',
      appVersion: `3.15.43-${toText(meta && meta.source || 'quick')}`,
      status: 'draft',
      project: { name: toText(meta && meta.projectName, 'Быстрый расчёт v4') },
      scope: {
        stage: Boolean(enabled.stage),
        truss: Boolean(enabled.truss),
        led: Boolean(enabled.led),
        sound: Boolean(enabled.equipment),
        light: false,
        backline: false,
        services: false,
        transport: false
      },
      sections: normalizedSections,
      transport: { mode: 'city', manualPrice: 0, cityPrice: 0 }
    });
  }

  function rowsFromQuote(quote, options) {
    const q = normalizeQuote(quote || {});
    const opts = options || {};
    if (bridge() && bridge().collectQuoteBomRows) {
      return bridge().collectQuoteBomRows(q, { sectionKey: opts.sectionKey || '', enrichAvailability: Boolean(opts.enrichAvailability) });
    }
    if (summaryBuilder() && summaryBuilder().collectBomRows) return summaryBuilder().collectBomRows(q, opts);
    return [];
  }

  function buildUnifiedSummary(quote, options) {
    const q = normalizeQuote(quote || {});
    if (bridge() && bridge().buildUnifiedBomSummary) return bridge().buildUnifiedBomSummary(q, options || {});
    const rows = rowsFromQuote(q, options || {});
    return {
      type: 'feg-stage-pro-v4-unified-bom-summary-fallback',
      version: UNIFIED_BOM_EXPORT_VERSION,
      quoteId: q.id,
      bridge: { rows, totals: summarizeRows(rows) },
      quoteItems: itemBuilder() && itemBuilder().buildQuoteItems ? itemBuilder().buildQuoteItems(q, { includeTransport: false }) : { rows: [], totals: {} },
      pickLists: pickLists() && pickLists().buildPickLists ? pickLists().buildPickLists(q) : { all: { rows: [] }, sections: [] },
      sectionTotals: buildSectionTotals(rows),
      totals: summarizeRows(rows),
      generatedAt: nowIso()
    };
  }

  function summarizeRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.qty += nonNegative(row.qty == null ? row.quantity : row.qty, 0);
      acc.weightKg += nonNegative(row.weightKg == null ? row.weight_kg : row.weightKg, 0);
      acc.powerW += nonNegative(row.powerW == null ? row.power_w : row.powerW, 0);
      acc.startupPowerW += nonNegative(row.startupPowerW == null ? row.startup_power_w : row.startupPowerW, 0);
      acc.deficitQty += nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0);
      if (nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0) > 0) acc.deficitRows += 1;
      if (toText(row.sourceType || row.source_type) === 'subrent' || nonNegative(row.subrentQty == null ? row.subrent_qty : row.subrentQty, 0) > 0) acc.subrentRows += 1;
      return acc;
    }, { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitRows: 0, deficitQty: 0, subrentRows: 0 });
  }

  function buildSectionTotals(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const key = toText(row.sectionKey || row.section_key || 'equipment');
      const prev = map.get(key) || { sectionKey: key, sectionTitle: toText(row.sectionTitle || row.section_title, SECTION_TITLES[key] || key), rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitQty: 0 };
      prev.rows += 1;
      prev.qty += nonNegative(row.qty == null ? row.quantity : row.qty, 0);
      prev.weightKg += nonNegative(row.weightKg == null ? row.weight_kg : row.weightKg, 0);
      prev.powerW += nonNegative(row.powerW == null ? row.power_w : row.powerW, 0);
      prev.startupPowerW += nonNegative(row.startupPowerW == null ? row.startup_power_w : row.startupPowerW, 0);
      prev.deficitQty += nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0);
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => String(a.sectionKey).localeCompare(String(b.sectionKey), 'ru'));
  }

  function buildUnifiedTechnicalSheet(quote, options) {
    const q = normalizeQuote(quote || {});
    const summary = buildUnifiedSummary(q, options || {});
    const rows = summary.bridge && Array.isArray(summary.bridge.rows) ? summary.bridge.rows : rowsFromQuote(q, options || {});
    const normalizedRows = rows.map((row, index) => ({
      n: index + 1,
      sectionKey: toText(row.sectionKey || row.section_key || 'equipment'),
      sectionTitle: toText(row.sectionTitle || row.section_title, SECTION_TITLES[row.sectionKey] || row.sectionKey || 'Раздел'),
      code: toText(row.code || row.itemId || row.item_id || row.id, '—'),
      name: toText(row.name || row.label || row.title || row.code, 'Позиция'),
      qty: nonNegative(row.qty == null ? row.quantity : row.qty, 0),
      unit: toText(row.unit, 'шт'),
      weightKg: nonNegative(row.weightKg == null ? row.weight_kg : row.weightKg, 0),
      powerW: nonNegative(row.powerW == null ? row.power_w : row.powerW, 0),
      startupPowerW: nonNegative(row.startupPowerW == null ? row.startup_power_w : row.startupPowerW, 0),
      note: toText(row.note || (Array.isArray(row.notes) ? row.notes.join('; ') : row.notes)),
      sourceType: toText(row.sourceType || row.source_type || 'own') || 'own'
    })).filter(row => row.qty > 0 || row.weightKg > 0 || row.powerW > 0 || row.startupPowerW > 0);
    return {
      type: 'v4-unified-technical-sheet',
      version: UNIFIED_BOM_EXPORT_VERSION,
      title: 'Общий техлист v4 — без цен',
      quoteId: q.id,
      projectName: q.project && q.project.name || '',
      hasPrices: false,
      rows: normalizedRows,
      bomRows: normalizedRows,
      sectionTotals: summary.sectionTotals || buildSectionTotals(normalizedRows),
      totals: summarizeRows(normalizedRows),
      source: 'V4SharedBomBridge → V4UnifiedBomExport',
      generatedAt: nowIso(),
      notes: [
        'Документ построен из единого shared BOM v4 без клиентов, цен и коммерческих полей.',
        'Используется как seed для общего техлиста, документов и складского листа.'
      ]
    };
  }

  function buildUnifiedWarehouseSheet(quote, options) {
    const q = normalizeQuote(quote || {});
    const summary = buildUnifiedSummary(q, options || {});
    const pick = summary.pickLists && summary.pickLists.all ? summary.pickLists.all : { rows: [] };
    const rows = pickLists() && pickLists().getRowsForPrint
      ? pickLists().getRowsForPrint(pick)
      : (Array.isArray(pick.rows) ? pick.rows : []).map((row, index) => ({ n: index + 1, code: row.code, name: row.name, qty: row.qty, unit: row.unit, section: row.sectionTitle || row.sectionKey, weightKg: row.weightKg, note: row.note }));
    return {
      type: 'v4-unified-warehouse-sheet',
      version: UNIFIED_BOM_EXPORT_VERSION,
      title: 'Общий складской лист v4 — без цен',
      quoteId: q.id,
      projectName: q.project && q.project.name || '',
      hasPrices: false,
      rows,
      sectionTotals: summary.sectionTotals || [],
      totals: {
        rows: rows.length,
        qty: rows.reduce((sum, row) => sum + nonNegative(row.qty, 0), 0),
        weightKg: rows.reduce((sum, row) => sum + nonNegative(row.weightKg, 0), 0),
        deficitRows: rows.filter(row => nonNegative(row.deficitQty, 0) > 0).length,
        subrentRows: rows.filter(row => row.sourceType === 'subrent' || nonNegative(row.subrentQty, 0) > 0).length
      },
      source: 'V4SharedBomBridge → WarehousePickListBuilder → V4UnifiedBomExport',
      generatedAt: nowIso(),
      notes: [
        'Складской лист агрегируется из общего shared BOM v4.',
        'Цены, клиенты и коммерческие итоги в этот экспорт не попадают.'
      ]
    };
  }

  function buildQuoteItemsExport(quote, options) {
    const q = normalizeQuote(quote || {});
    const payload = itemBuilder() && itemBuilder().buildQuoteItems
      ? itemBuilder().buildQuoteItems(q, Object.assign({ includeTransport: false }, options || {}))
      : { rows: [], totals: {}, generatedAt: nowIso() };
    return Object.assign({}, payload, {
      type: 'v4-unified-quote-items-preview',
      version: UNIFIED_BOM_EXPORT_VERSION,
      hasPrices: false,
      note: 'Предпросмотр quote_items из shared BOM без транспорта и коммерческого документа.'
    });
  }

  function buildUnifiedExportPayload(quote, options) {
    const q = normalizeQuote(quote || {});
    const summary = buildUnifiedSummary(q, Object.assign({ enrichAvailability: false }, options || {}));
    const technicalSheet = buildUnifiedTechnicalSheet(q, options || {});
    const warehouseSheet = buildUnifiedWarehouseSheet(q, options || {});
    const quoteItems = buildQuoteItemsExport(q, options || {});
    const contractReadiness = options && options.skipContract ? null : (contract() && contract().buildBomReadinessReport ? contract().buildBomReadinessReport(q, { noPrices: true, requireRows: false }) : null);
    return {
      type: 'feg-stage-pro-v4-unified-bom-export-payload',
      version: UNIFIED_BOM_EXPORT_VERSION,
      contractReadiness,
      quoteId: q.id,
      projectName: q.project && q.project.name || '',
      hasPrices: false,
      summary,
      technicalSheet,
      warehouseSheet,
      quoteItems,
      exportTargets: {
        quickCalculator: true,
        quoteWizard: true,
        documents: true,
        warehousePickList: true,
        backendQuoteItems: true,
        legacyV3Touched: false
      },
      generatedAt: nowIso()
    };
  }

  function documentToText(doc) {
    const d = doc || {};
    const lines = [];
    lines.push(d.title || 'Документ v4');
    if (d.projectName) lines.push(`Проект: ${d.projectName}`);
    lines.push(`Версия: ${d.version || UNIFIED_BOM_EXPORT_VERSION}`);
    lines.push(`Цены: ${d.hasPrices ? 'да' : 'нет'}`);
    lines.push('');
    if (String(d.type || '').includes('warehouse')) appendWarehouseRows(lines, d);
    else appendTechnicalRows(lines, d);
    if (Array.isArray(d.sectionTotals) && d.sectionTotals.length) {
      lines.push('');
      lines.push('Итого по разделам:');
      d.sectionTotals.forEach(section => {
        lines.push(`- ${section.sectionTitle || section.sectionKey}: ${count(section.rows)} строк, ${count(section.qty)} ед., ${weight(section.weightKg)}${section.powerW ? `, ${power(section.powerW)}` : ''}`);
      });
    }
    if (Array.isArray(d.notes) && d.notes.length) {
      lines.push('');
      d.notes.forEach(note => lines.push(`Примечание: ${note}`));
    }
    lines.push('');
    lines.push(`Сформировано: ${d.generatedAt || nowIso()}`);
    return lines.join('\n');
  }

  function appendTechnicalRows(lines, doc) {
    const rows = Array.isArray(doc.rows || doc.bomRows) ? (doc.rows || doc.bomRows) : [];
    lines.push('Комплектация:');
    if (!rows.length) lines.push('— Нет строк комплектации');
    rows.forEach(row => {
      lines.push(`${row.n || ''}. [${row.sectionTitle || row.section || 'Раздел'}] ${row.code || '—'} ${row.name || 'Позиция'} — ${count(row.qty)} ${row.unit || 'шт'}, вес ${weight(row.weightKg)}${row.powerW ? `, мощность ${power(row.powerW)}` : ''}${row.startupPowerW ? `, пуск ${power(row.startupPowerW)}` : ''}${row.note ? ` (${row.note})` : ''}`.replace(/^\. /, ''));
    });
    lines.push('');
    lines.push(`Всего позиций: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Всего единиц: ${count(doc.totals && doc.totals.qty)}`);
    lines.push(`Общий вес: ${weight(doc.totals && doc.totals.weightKg)}`);
    if (doc.totals && doc.totals.powerW) lines.push(`Рабочая мощность: ${power(doc.totals.powerW)}`);
    if (doc.totals && doc.totals.startupPowerW) lines.push(`Пусковая мощность: ${power(doc.totals.startupPowerW)}`);
  }

  function appendWarehouseRows(lines, doc) {
    const rows = Array.isArray(doc.rows) ? doc.rows : [];
    lines.push('Складские позиции:');
    if (!rows.length) lines.push('— Нет строк комплектации');
    rows.forEach(row => {
      const deficit = nonNegative(row.deficitQty, 0) > 0 ? `, дефицит ${count(row.deficitQty)} ${row.unit || 'шт'}` : '';
      lines.push(`${row.n || ''}. [${row.section || row.sectionTitle || row.sectionKey || 'Раздел'}] ${row.code || '—'} ${row.name || 'Позиция'} — ${count(row.qty)} ${row.unit || 'шт'}, вес ${weight(row.weightKg)}${deficit}`.replace(/^\. /, ''));
    });
    lines.push('');
    lines.push(`Всего позиций: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Всего единиц: ${count(doc.totals && doc.totals.qty)}`);
    lines.push(`Вес листа: ${weight(doc.totals && doc.totals.weightKg)}`);
  }

  function csvEscape(value) {
    const text = String(value == null ? '' : value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function sheetToCsv(doc) {
    const rows = Array.isArray(doc && doc.rows) ? doc.rows : [];
    const header = ['n', 'section', 'code', 'name', 'qty', 'unit', 'weightKg', 'powerW', 'startupPowerW', 'sourceType', 'note'];
    const lines = [header.join(';')];
    rows.forEach((row, index) => {
      lines.push([
        row.n || index + 1,
        row.section || row.sectionTitle || row.sectionKey || '',
        row.code || '',
        row.name || '',
        nonNegative(row.qty, 0),
        row.unit || 'шт',
        nonNegative(row.weightKg, 0),
        nonNegative(row.powerW, 0),
        nonNegative(row.startupPowerW, 0),
        row.sourceType || '',
        row.note || ''
      ].map(csvEscape).join(';'));
    });
    return lines.join('\n');
  }

  function exportPayloadAsJson(quote, options) {
    return JSON.stringify(buildUnifiedExportPayload(quote, options || {}), null, 2);
  }

  function exportContractJson(quote, options) {
    if (contract() && contract().exportContractJson) return contract().exportContractJson(quote, options || {});
    return JSON.stringify(buildUnifiedExportPayload(quote, options || {}), null, 2);
  }

  ROOT.V4UnifiedBomExport = {
    UNIFIED_BOM_EXPORT_VERSION,
    makeQuoteFromSections,
    buildUnifiedSummary,
    buildUnifiedTechnicalSheet,
    buildUnifiedWarehouseSheet,
    buildQuoteItemsExport,
    buildUnifiedExportPayload,
    documentToText,
    sheetToCsv,
    exportPayloadAsJson,
    exportContractJson
  };
})();
