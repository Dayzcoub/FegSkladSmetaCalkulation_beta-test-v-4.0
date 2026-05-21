// FEG Stage PRO v3.15.43 — V4BomContract
// Final read-only BOM contract and readiness validator for v4 shared BOM flows.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const V4_BOM_CONTRACT_VERSION = '3.15.43';
  const CONTRACT_TYPE = 'feg-stage-pro-v4-bom-contract';
  const ALLOWED_SECTION_KEYS = Object.freeze(['stage', 'truss', 'led', 'equipment']);
  const ALLOWED_SOURCE_TYPES = Object.freeze(['own', 'subrent', 'manual', 'subrent_needed']);
  const REQUIRED_ROW_FIELDS = Object.freeze(['sectionKey', 'code', 'name', 'qty', 'unit', 'sourceType']);
  const NO_PRICE_FIELDS = Object.freeze(['rentalPrice', 'rental_price', 'clientPrice', 'client_price', 'subrentPrice', 'subrent_price', 'totalRental', 'total_rental', 'totalClient', 'total_client', 'totalSubrent', 'total_subrent', 'margin']);

  function model() { return ROOT.QuoteModel || null; }
  function bridge() { return ROOT.V4SharedBomBridge || null; }
  function exporter() { return ROOT.V4UnifiedBomExport || null; }
  function itemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }

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
  function rounded(value, digits) {
    const p = Math.pow(10, digits || 3);
    return Math.round(toNumber(value, 0) * p) / p;
  }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || { sections: {} });
  }

  function normalizeSourceType(value) {
    const text = toText(value, 'own');
    if (text === 'equipment_database_system_part' || text === 'system_part' || text === 'stock' || text === 'inventory') return 'own';
    if (text === 'manual_subrent') return 'subrent';
    return text || 'own';
  }

  function normalizeContractRow(row, index) {
    const normalized = bridge() && bridge().normalizeBomRow
      ? bridge().normalizeBomRow(row || {}, row && (row.sectionKey || row.section_key) || 'equipment')
      : (row || {});
    const qty = nonNegative(normalized.qty == null ? normalized.quantity : normalized.qty, 0);
    const weightKg = nonNegative(normalized.weightKg == null ? normalized.weight_kg : normalized.weightKg, 0);
    const powerW = nonNegative(normalized.powerW == null ? normalized.power_w : normalized.powerW, 0);
    const startupPowerW = nonNegative(normalized.startupPowerW == null ? normalized.startup_power_w : normalized.startupPowerW, 0);
    const sectionKey = toText(normalized.sectionKey || normalized.section_key, 'equipment');
    const code = toText(normalized.code || normalized.itemId || normalized.item_id || normalized.id, '—');
    const name = toText(normalized.name || normalized.label || normalized.title || code, 'Позиция');
    const sourceType = normalizeSourceType(normalized.sourceType || normalized.source_type);
    const contractRow = Object.assign({}, normalized, {
      n: index + 1,
      sectionKey,
      section_key: sectionKey,
      sectionTitle: toText(normalized.sectionTitle || normalized.section_title, sectionKey),
      code,
      name,
      unit: toText(normalized.unit, 'шт'),
      qty,
      quantity: qty,
      requestedQty: nonNegative(normalized.requestedQty == null ? normalized.requested_qty : normalized.requestedQty, qty),
      requested_qty: nonNegative(normalized.requestedQty == null ? normalized.requested_qty : normalized.requestedQty, qty),
      weightKg,
      weight_kg: weightKg,
      powerW,
      power_w: powerW,
      startupPowerW,
      startup_power_w: startupPowerW,
      sourceType,
      source_type: sourceType,
      sourceSystem: toText(normalized.sourceSystem || normalized.source_system),
      source_system: toText(normalized.sourceSystem || normalized.source_system),
      inventoryItemId: toText(normalized.inventoryItemId || normalized.inventory_item_id || normalized.itemId || normalized.item_id),
      inventory_item_id: toText(normalized.inventoryItemId || normalized.inventory_item_id || normalized.itemId || normalized.item_id),
      itemId: toText(normalized.itemId || normalized.item_id || normalized.inventoryItemId || normalized.inventory_item_id || code),
      item_id: toText(normalized.itemId || normalized.item_id || normalized.inventoryItemId || normalized.inventory_item_id || code),
      note: toText(normalized.note || (Array.isArray(normalized.notes) ? normalized.notes.join('; ') : normalized.notes)),
      contract: {
        type: CONTRACT_TYPE,
        version: V4_BOM_CONTRACT_VERSION,
        rowKey: buildRowKey(normalized, sectionKey, code, name, index),
        target: 'shared-bom-row'
      }
    });
    return contractRow;
  }

  function buildRowKey(row, sectionKey, code, name, index) {
    return [sectionKey, row && (row.itemId || row.item_id || row.inventoryItemId || row.inventory_item_id) || code, name, index + 1]
      .join('|')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё|.-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || `bom-row-${index + 1}`;
  }

  function summarizeRows(rows) {
    if (bridge() && bridge().summarizeRows) return bridge().summarizeRows(rows || []);
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

  function groupBySection(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const key = toText(row.sectionKey || row.section_key, 'equipment');
      const prev = map.get(key) || { sectionKey: key, sectionTitle: toText(row.sectionTitle || row.section_title, key), rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitQty: 0, sourceTypes: [] };
      prev.rows += 1;
      prev.qty += nonNegative(row.qty == null ? row.quantity : row.qty, 0);
      prev.weightKg += nonNegative(row.weightKg == null ? row.weight_kg : row.weightKg, 0);
      prev.powerW += nonNegative(row.powerW == null ? row.power_w : row.powerW, 0);
      prev.startupPowerW += nonNegative(row.startupPowerW == null ? row.startup_power_w : row.startupPowerW, 0);
      prev.deficitQty += nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0);
      const src = normalizeSourceType(row.sourceType || row.source_type);
      if (!prev.sourceTypes.includes(src)) prev.sourceTypes.push(src);
      map.set(key, prev);
    });
    return Array.from(map.values()).map(row => Object.assign({}, row, {
      qty: rounded(row.qty, 3),
      weightKg: rounded(row.weightKg, 3),
      powerW: rounded(row.powerW, 3),
      startupPowerW: rounded(row.startupPowerW, 3),
      deficitQty: rounded(row.deficitQty, 3)
    })).sort((a, b) => String(a.sectionKey).localeCompare(String(b.sectionKey), 'ru'));
  }

  function makeIssue(level, key, message, details) {
    return { level, key, message, details: details || {}, ok: level === 'info' };
  }

  function validateBomRows(rows, options) {
    const opts = Object.assign({ noPrices: true, allowEmpty: false }, options || {});
    const normalizedRows = (Array.isArray(rows) ? rows : []).map(normalizeContractRow);
    const issues = [];
    const seenKeys = new Set();

    if (!normalizedRows.length && !opts.allowEmpty) issues.push(makeIssue('error', 'shared_bom_empty', 'Shared BOM пустой: нет строк для документов/склада/backend.'));

    normalizedRows.forEach((row, index) => {
      const rowLabel = `${row.sectionKey || 'section'}:${row.code || row.name || index + 1}`;
      REQUIRED_ROW_FIELDS.forEach(field => {
        if (field === 'qty') {
          if (nonNegative(row.qty, 0) <= 0 && nonNegative(row.weightKg, 0) <= 0 && nonNegative(row.powerW, 0) <= 0 && nonNegative(row.startupPowerW, 0) <= 0) {
            issues.push(makeIssue('error', `row_${index + 1}_qty`, `${rowLabel}: количество/вес/мощность не заданы.`));
          }
          return;
        }
        if (!toText(row[field])) issues.push(makeIssue('error', `row_${index + 1}_${field}`, `${rowLabel}: обязательное поле ${field} пустое.`));
      });
      if (!ALLOWED_SECTION_KEYS.includes(row.sectionKey)) issues.push(makeIssue('warning', `row_${index + 1}_section`, `${rowLabel}: нестандартный раздел ${row.sectionKey}.`, { sectionKey: row.sectionKey }));
      if (!ALLOWED_SOURCE_TYPES.includes(row.sourceType)) issues.push(makeIssue('error', `row_${index + 1}_source_type`, `${rowLabel}: неожиданный sourceType ${row.sourceType}.`, { sourceType: row.sourceType }));
      if (row.sourceSystem === 'equipment_database_system_part' && row.sourceType !== 'own') issues.push(makeIssue('error', `row_${index + 1}_source_system`, `${rowLabel}: system part должен идти как sourceType=own.`));
      ['qty', 'weightKg', 'powerW', 'startupPowerW'].forEach(field => {
        if (!Number.isFinite(Number(row[field]))) issues.push(makeIssue('error', `row_${index + 1}_${field}_number`, `${rowLabel}: ${field} должен быть числом.`));
      });
      if (opts.noPrices) {
        NO_PRICE_FIELDS.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(row, field) && nonNegative(row[field], 0) > 0) issues.push(makeIssue('warning', `row_${index + 1}_${field}`, `${rowLabel}: в no-price BOM найдено ценовое поле ${field}.`));
        });
      }
      const key = toText(row.contract && row.contract.rowKey) || buildRowKey(row, row.sectionKey, row.code, row.name, index);
      if (seenKeys.has(key)) issues.push(makeIssue('warning', `row_${index + 1}_duplicate_key`, `${rowLabel}: повтор rowKey ${key}.`, { rowKey: key }));
      seenKeys.add(key);
    });

    const errors = issues.filter(row => row.level === 'error');
    const warnings = issues.filter(row => row.level === 'warning');
    const totals = summarizeRows(normalizedRows);
    return {
      type: 'feg-stage-pro-v4-bom-row-validation',
      version: V4_BOM_CONTRACT_VERSION,
      ok: errors.length === 0,
      level: errors.length ? 'error' : (warnings.length ? 'warning' : 'ok'),
      rows: normalizedRows,
      totals,
      sections: groupBySection(normalizedRows),
      issues,
      errors,
      warnings,
      generatedAt: nowIso()
    };
  }

  function buildFlowPayload(quote, options) {
    const q = normalizeQuote(quote || {});
    const opts = Object.assign({ noPrices: true, enrichAvailability: false }, options || {});
    const sharedRows = bridge() && bridge().collectQuoteBomRows ? bridge().collectQuoteBomRows(q, { enrichAvailability: opts.enrichAvailability === true }) : [];
    const normalizedRows = sharedRows.map(normalizeContractRow);
    const bridgePayload = bridge() && bridge().buildQuoteBomBridge ? bridge().buildQuoteBomBridge(q, { enrichAvailability: opts.enrichAvailability === true }) : { rows: normalizedRows, totals: summarizeRows(normalizedRows) };
    const quoteItems = itemBuilder() && itemBuilder().buildQuoteItems ? itemBuilder().buildQuoteItems(q, { includeTransport: false }) : (bridge() && bridge().buildQuoteItemRows ? { rows: bridge().buildQuoteItemRows(q, opts), totals: {} } : { rows: [], totals: {} });
    const pickPayload = pickLists() && pickLists().buildPickLists ? pickLists().buildPickLists(q) : { all: { rows: [] }, sections: [] };
    const unifiedPayload = exporter() && exporter().buildUnifiedExportPayload ? exporter().buildUnifiedExportPayload(q, Object.assign({}, opts, { skipContract: true })) : null;
    return {
      quote: q,
      sharedRows: normalizedRows,
      bridge: bridgePayload,
      quoteItems,
      pickLists: pickPayload,
      warehouseRows: pickPayload && pickPayload.all && Array.isArray(pickPayload.all.rows) ? pickPayload.all.rows : [],
      unifiedPayload
    };
  }

  function validateQuoteBomContract(quote, options) {
    const opts = Object.assign({ noPrices: true, requireRows: false }, options || {});
    const payload = buildFlowPayload(quote, opts);
    const q = payload.quote;
    const rowValidation = validateBomRows(payload.sharedRows, { noPrices: opts.noPrices, allowEmpty: opts.requireRows !== true });
    const quoteRows = payload.quoteItems && Array.isArray(payload.quoteItems.rows) ? payload.quoteItems.rows : [];
    const warehouseRows = Array.isArray(payload.warehouseRows) ? payload.warehouseRows : [];
    const sharedCount = payload.sharedRows.length;
    const checks = [
      makeContractCheck('contract_loaded', true, 'BOM contract loaded', 'BOM contract не загружен'),
      makeContractCheck('quote_present', Boolean(q && q.id), `quote id: ${q && q.id || '—'}`, 'quote id пустой'),
      makeContractCheck('row_contract', rowValidation.ok, rowValidation.ok ? 'BOM-строки проходят контракт' : `${rowValidation.errors.length} ошибок в BOM-строках`, rowValidation.errors.map(row => row.message).join(' · ')),
      makeContractCheck('quote_items_flow', quoteRows.length >= sharedCount || sharedCount === 0, `quote_items: ${quoteRows.length}/${sharedCount}`, `quote_items меньше shared BOM: ${quoteRows.length}/${sharedCount}`),
      makeContractCheck('warehouse_flow', warehouseRows.length > 0 || sharedCount === 0, `склад: ${warehouseRows.length} строк`, 'складской лист не построился'),
      makeContractCheck('no_price_contract', opts.noPrices ? !hasPriceLeaks(payload.sharedRows) : true, 'no-price контракт чистый', 'в shared BOM есть ценовые значения'),
      makeContractCheck('backend_payload', sharedCount === 0 || quoteRows.length >= sharedCount, 'готово для quote_items preview', 'backend quote_items preview неполный')
    ];
    const errors = checks.filter(row => !row.ok && row.severity === 'error').length + rowValidation.errors.length;
    const warnings = checks.filter(row => !row.ok && row.severity !== 'error').length + rowValidation.warnings.length;
    return {
      type: 'feg-stage-pro-v4-bom-contract-validation',
      version: V4_BOM_CONTRACT_VERSION,
      contract: buildContractDescriptor(),
      quoteId: q && q.id || '',
      projectName: q && q.project && q.project.name || '',
      ok: errors === 0,
      level: errors ? 'error' : (warnings ? 'warning' : 'ok'),
      checks,
      issues: rowValidation.issues,
      rowValidation,
      counts: {
        sharedBom: sharedCount,
        quoteItems: quoteRows.length,
        warehouse: warehouseRows.length,
        technical: payload.unifiedPayload && payload.unifiedPayload.technicalSheet && Array.isArray(payload.unifiedPayload.technicalSheet.rows) ? payload.unifiedPayload.technicalSheet.rows.length : 0
      },
      totals: summarizeRows(payload.sharedRows),
      sections: groupBySection(payload.sharedRows),
      targets: {
        quickCalculator: true,
        quoteWizard: errors === 0,
        documents: errors === 0,
        warehousePickList: errors === 0 && (warehouseRows.length > 0 || sharedCount === 0),
        backendQuoteItems: errors === 0 && (quoteRows.length >= sharedCount || sharedCount === 0),
        legacyV3Touched: false
      },
      protectedFlows: ['legacy/v3', 'old v3 fallback', 'LED fastener formulas', 'stock movements', 'reservations', 'controlled backend writes'],
      generatedAt: nowIso()
    };
  }

  function makeContractCheck(key, ok, pass, fail, severity) {
    return { key, ok: Boolean(ok), severity: severity || 'error', label: Boolean(ok) ? pass : fail };
  }

  function hasPriceLeaks(rows) {
    return (Array.isArray(rows) ? rows : []).some(row => NO_PRICE_FIELDS.some(field => Object.prototype.hasOwnProperty.call(row, field) && nonNegative(row[field], 0) > 0));
  }

  function buildContractDescriptor() {
    return {
      type: CONTRACT_TYPE,
      version: V4_BOM_CONTRACT_VERSION,
      requiredRowFields: REQUIRED_ROW_FIELDS.slice(),
      allowedSectionKeys: ALLOWED_SECTION_KEYS.slice(),
      allowedSourceTypes: ALLOWED_SOURCE_TYPES.slice(),
      noPriceFields: NO_PRICE_FIELDS.slice(),
      canonicalPath: 'quote.sections → V4SharedBomBridge → quote_items → warehouse/documents/backend',
      rowIdentity: 'sectionKey + itemId/inventoryItemId/code + name + index',
      protectedLegacy: true
    };
  }

  function buildBomReadinessReport(quote, options) {
    const validation = validateQuoteBomContract(quote, options || {});
    const blockers = [];
    const warnings = [];
    (validation.checks || []).forEach(row => {
      if (row.ok) return;
      if (row.severity === 'error') blockers.push(row.label);
      else warnings.push(row.label);
    });
    (validation.rowValidation && validation.rowValidation.errors || []).forEach(row => blockers.push(row.message));
    (validation.rowValidation && validation.rowValidation.warnings || []).forEach(row => warnings.push(row.message));
    return Object.assign({}, validation, {
      type: 'feg-stage-pro-v4-bom-readiness-report',
      ready: blockers.length === 0,
      blockers,
      warnings,
      summary: {
        status: blockers.length ? 'blocked' : (warnings.length ? 'ready_with_warnings' : 'ready'),
        sharedBomRows: validation.counts.sharedBom,
        quoteItemsRows: validation.counts.quoteItems,
        warehouseRows: validation.counts.warehouse,
        weightKg: validation.totals.weightKg,
        powerW: validation.totals.powerW,
        startupPowerW: validation.totals.startupPowerW
      }
    });
  }

  function buildContractPayload(quote, options) {
    const payload = buildFlowPayload(quote, options || {});
    const readiness = buildBomReadinessReport(payload.quote, options || {});
    return {
      type: 'feg-stage-pro-v4-bom-contract-payload',
      version: V4_BOM_CONTRACT_VERSION,
      contract: buildContractDescriptor(),
      quoteId: payload.quote && payload.quote.id || '',
      projectName: payload.quote && payload.quote.project && payload.quote.project.name || '',
      hasPrices: false,
      sharedBomRows: payload.sharedRows,
      quoteItemsPreview: clone(payload.quoteItems || { rows: [] }),
      warehousePreview: clone(payload.pickLists && payload.pickLists.all || { rows: [] }),
      readiness,
      generatedAt: nowIso()
    };
  }

  function applyContractToMount(mount, quote, options) {
    const src = mount || {};
    const readiness = buildBomReadinessReport(quote || src, Object.assign({ noPrices: true }, options || {}));
    return Object.assign({}, clone(src) || {}, {
      contract: buildContractDescriptor(),
      contractReadiness: readiness,
      contractOk: readiness.ready,
      contractVersion: V4_BOM_CONTRACT_VERSION,
      readyFor: Object.assign({}, src.readyFor || {}, readiness.targets || {}, {
        bomContract: readiness.ready,
        backendQuoteItems: readiness.targets && readiness.targets.backendQuoteItems,
        documents: readiness.targets && readiness.targets.documents,
        warehousePickList: readiness.targets && readiness.targets.warehousePickList,
        legacyV3Touched: false
      })
    });
  }

  function reportToText(report) {
    const r = report || {};
    const totals = r.totals || r.summary || {};
    const counts = r.counts || {};
    const lines = [];
    lines.push('V4 BOM contract readiness');
    lines.push(`Версия: ${r.version || V4_BOM_CONTRACT_VERSION}`);
    if (r.quoteId) lines.push(`Quote: ${r.quoteId}`);
    if (r.projectName) lines.push(`Проект: ${r.projectName}`);
    lines.push(`Статус: ${r.ready || r.ok ? 'ready' : 'blocked'}`);
    lines.push(`Shared BOM: ${counts.sharedBom || 0} строк`);
    lines.push(`quote_items: ${counts.quoteItems || 0} строк`);
    lines.push(`Склад: ${counts.warehouse || 0} строк`);
    lines.push(`Вес: ${Number(totals.weightKg || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`);
    if (totals.powerW) lines.push(`Мощность: ${Number(totals.powerW || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} Вт`);
    lines.push('');
    lines.push('Проверки:');
    (r.checks || []).forEach(row => lines.push(`${row.ok ? '✓' : '⚠'} ${row.label || row.key}`));
    if (r.blockers && r.blockers.length) {
      lines.push('');
      lines.push('Блокеры:');
      r.blockers.forEach(row => lines.push(`- ${row}`));
    }
    if (r.warnings && r.warnings.length) {
      lines.push('');
      lines.push('Предупреждения:');
      r.warnings.forEach(row => lines.push(`- ${row}`));
    }
    lines.push('');
    lines.push('Готово для:');
    Object.entries(r.targets || {}).forEach(([key, value]) => lines.push(`- ${key}: ${value ? 'да' : 'нет'}`));
    lines.push('');
    lines.push(`Сформировано: ${r.generatedAt || nowIso()}`);
    return lines.join('\n');
  }

  function exportContractJson(quote, options) {
    return JSON.stringify(buildContractPayload(quote, options || {}), null, 2);
  }

  ROOT.V4BomContract = {
    V4_BOM_CONTRACT_VERSION,
    CONTRACT_TYPE,
    ALLOWED_SECTION_KEYS,
    ALLOWED_SOURCE_TYPES,
    REQUIRED_ROW_FIELDS,
    buildContractDescriptor,
    normalizeContractRow,
    validateBomRows,
    validateQuoteBomContract,
    buildBomReadinessReport,
    buildContractPayload,
    applyContractToMount,
    reportToText,
    exportContractJson
  };
})();
