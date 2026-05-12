(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUMMARY_VERSION = '1.1.0';

  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран',
    equipment: 'Звук / свет / услуги'
  });

  function model() { return ROOT.QuoteModel || null; }
  function availability() { return ROOT.AvailabilityChecker || null; }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function readSectionMetric(section, keys) {
    const src = section || {};
    for (const key of keys) {
      const value = src[key];
      if (Number.isFinite(Number(value))) return Number(value);
    }
    return 0;
  }

  function getSectionRental(section) {
    if (!section) return 0;
    const direct = readSectionMetric(section, ['total', 'rental', 'price', 'rentalTotal']);
    if (direct) return direct;
    if (section.type === 'equipment') return readSectionMetric(section, ['equipmentRental']);
    return 0;
  }

  function getSectionRows(quote) {
    const q = normalizeQuote(quote);
    const sections = q.sections || {};
    return ['stage', 'truss', 'led', 'equipment']
      .filter(key => Boolean(sections[key]))
      .map(key => {
        const section = sections[key] || {};
        return {
          key,
          title: section.title || SECTION_TITLES[key] || key,
          status: section.status || 'placeholder',
          source: section.source || '',
          summary: section.summary || '',
          rental: getSectionRental(section),
          weightKg: readSectionMetric(section, ['weightKg', 'weight', 'totalWeightKg']),
          powerW: readSectionMetric(section, ['powerW', 'power', 'totalPowerW']),
          startupPowerW: readSectionMetric(section, ['startupPowerW', 'totalStartupPowerW']),
          deficitCount: readSectionMetric(section, ['deficitCount']),
          bomCount: Array.isArray(section.bomRows) ? section.bomRows.length : Array.isArray(section.items) ? section.items.length : 0,
          configured: section.status === 'configured'
        };
      });
  }

  function getConfiguredSectionRows(quote) {
    return getSectionRows(quote).filter(row => row.configured);
  }

  function getSectionStatusRows(quote) {
    const q = normalizeQuote(quote);
    const scope = q.scope || {};
    const rows = [];
    if (scope.stage) rows.push(statusRow('stage', q.sections && q.sections.stage));
    if (scope.truss) rows.push(statusRow('truss', q.sections && q.sections.truss));
    if (scope.led) rows.push(statusRow('led', q.sections && q.sections.led));
    if (scope.sound || scope.light || scope.backline || scope.services) rows.push(statusRow('equipment', q.sections && q.sections.equipment));
    return rows;
  }

  function statusRow(key, section) {
    const sec = section || {};
    const status = sec.status || 'placeholder';
    return {
      key,
      title: sec.title || SECTION_TITLES[key] || key,
      status,
      ok: status === 'configured',
      label: status === 'configured' ? 'готово' : status === 'disabled' ? 'не выбрано' : 'ожидает заполнения'
    };
  }

  function getCustomerEstimateRows(quote) {
    const q = normalizeQuote(quote);
    const rows = getConfiguredSectionRows(q).map(row => ({
      key: row.key,
      title: row.title,
      qty: 1,
      unit: 'раздел',
      price: row.rental,
      total: row.rental,
      note: row.summary || row.source || ''
    }));
    const transport = model() && model().normalizeTransport ? model().normalizeTransport(q.transport || {}) : (q.transport || {});
    const transportTotal = nonNegative(transport.total, 0);
    if (transportTotal > 0) {
      rows.push({
        key: 'transport',
        title: transport.mode === 'out_of_city' ? 'Транспорт за город' : 'Транспорт по городу',
        qty: 1,
        unit: 'усл.',
        price: transportTotal,
        total: transportTotal,
        note: `${transport.vehicleLabel || 'Грузовой'} · ${transport.mode === 'out_of_city' ? `${nonNegative(transport.distanceKm, 0)} км × ${nonNegative(transport.pricePerKm, 0)} ₽/км` : `${nonNegative(transport.cityPrice, 0)} ₽ по городу`}`
      });
    }
    return rows;
  }

  function getTechnicalSummaryRows(quote) {
    const q = normalizeQuote(quote);
    const summary = model() && model().summarizeQuote ? model().summarizeQuote(q) : { totals: q.totals || {} };
    const totals = summary.totals || {};
    return [
      { key: 'weight', title: 'Общий вес', value: nonNegative(totals.weightKg, 0), unit: 'кг' },
      { key: 'power', title: 'Рабочая мощность', value: nonNegative(totals.powerW, 0), unit: 'Вт' },
      { key: 'startupPower', title: 'Пусковая мощность', value: nonNegative(totals.startupPowerW, 0), unit: 'Вт' },
      { key: 'sections', title: 'Готовые разделы', value: getConfiguredSectionRows(q).length, unit: 'разд.' },
      { key: 'deficits', title: 'Дефицитные позиции', value: countDeficitRows(q), unit: 'поз.' }
    ];
  }

  function countDeficitRows(quote) {
    const rows = collectBomRows(quote);
    return rows.filter(row => nonNegative(row.deficitQty, 0) > 0).length;
  }

  function collectBomRows(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const sections = q.sections || {};
    const keys = opts.sectionKey ? [opts.sectionKey] : ['stage', 'truss', 'led', 'equipment'];
    const out = [];
    keys.forEach(key => {
      const section = sections[key];
      if (!section) return;
      const rows = Array.isArray(section.bomRows) ? section.bomRows : Array.isArray(section.items) ? section.items : [];
      rows.forEach(row => out.push(normalizeBomRow(row, key, section)));
    });
    const rows = out.filter(row => row.qty > 0 || row.weightKg > 0 || row.powerW > 0);
    return availability() && availability().enrichBomRows ? availability().enrichBomRows(rows) : rows;
  }

  function normalizeBomRow(row, sectionKey, section) {
    const src = row || {};
    return {
      sectionKey,
      sectionTitle: section && section.title || SECTION_TITLES[sectionKey] || sectionKey,
      id: toText(src.id || src.itemId || src.code || src.name),
      itemId: toText(src.itemId),
      code: toText(src.code || src.id || src.itemId),
      name: toText(src.name || src.label || src.title || src.code || 'Позиция'),
      qty: nonNegative(src.qty == null ? src.count : src.qty, 0),
      unit: toText(src.unit || 'шт') || 'шт',
      weightKg: nonNegative(src.weightKg == null ? src.weight : src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW, 0),
      sourceType: toText(src.sourceType || 'own') || 'own',
      supplierName: toText(src.supplierName),
      availableQty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      stockQty: src.stockQty == null ? null : nonNegative(src.stockQty, 0),
      reservedQty: src.reservedQty == null ? null : nonNegative(src.reservedQty, 0),
      requestedQty: nonNegative(src.requestedQty == null ? (src.qty == null ? src.count : src.qty) : src.requestedQty, 0),
      deficitQty: nonNegative(src.deficitQty, 0),
      subrentQty: nonNegative(src.subrentQty, 0),
      inventoryStatus: toText(src.inventoryStatus),
      inventoryItemId: toText(src.inventoryItemId),
      ok: src.ok !== false && nonNegative(src.deficitQty, 0) <= 0,
      note: toText(src.note || src.notes)
    };
  }

  function buildFinalSummary(quote) {
    const q = normalizeQuote(quote);
    const summary = model() && model().summarizeQuote ? model().summarizeQuote(q) : { totals: q.totals || {} };
    const validation = model() && model().validateQuote ? model().validateQuote(q) : { ok: true, errors: [] };
    return {
      version: SUMMARY_VERSION,
      quote: q,
      totals: clone(summary.totals || q.totals || {}),
      transport: clone(summary.transport || q.transport || {}),
      sectionRows: getSectionRows(q),
      sectionStatusRows: getSectionStatusRows(q),
      customerRows: getCustomerEstimateRows(q),
      technicalRows: getTechnicalSummaryRows(q),
      bomRows: collectBomRows(q),
      validation,
      warnings: buildWarnings(q, validation),
      builtAt: new Date().toISOString()
    };
  }

  function buildWarnings(quote, validation) {
    const q = normalizeQuote(quote);
    const warnings = [];
    (validation && validation.errors || []).forEach(row => warnings.push({ type: 'validation', message: row.message || String(row) }));
    getSectionStatusRows(q).forEach(row => {
      if (!row.ok) warnings.push({ type: 'section', sectionKey: row.key, message: `${row.title}: ${row.label}` });
    });
    collectBomRows(q).forEach(row => {
      if (row.deficitQty > 0) warnings.push({ type: 'deficit', sectionKey: row.sectionKey, message: `${row.name}: дефицит ${row.deficitQty} ${row.unit}` });
      if (row.inventoryStatus === 'unmatched') warnings.push({ type: 'inventory', sectionKey: row.sectionKey, message: `${row.name}: нет сопоставления с базой оборудования` });
      if ((row.sourceType === 'subrent' || row.subrentQty > 0) && !row.supplierName) warnings.push({ type: 'subrent', sectionKey: row.sectionKey, message: `${row.name}: не указан поставщик субаренды` });
    });
    return warnings;
  }

  ROOT.QuoteSummaryBuilder = {
    SUMMARY_VERSION,
    SECTION_TITLES,
    normalizeQuote,
    getSectionRows,
    getConfiguredSectionRows,
    getSectionStatusRows,
    getCustomerEstimateRows,
    getTechnicalSummaryRows,
    collectBomRows,
    normalizeBomRow,
    buildFinalSummary
  };
})();
