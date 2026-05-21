// FEG Stage PRO v3.15.52 — V4QuoteDraftBomSink
// Attaches a compact unified v4 BOM snapshot to quote drafts as quote.v4Bom without touching legacy/v3 flows.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUOTE_DRAFT_BOM_SINK_VERSION = '3.17.38-quick-to-quote-catalog-remap';

  function model() { return ROOT.QuoteModel || null; }
  function bridge() { return ROOT.V4SharedBomBridge || null; }
  function exporter() { return ROOT.V4UnifiedBomExport || null; }
  function itemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }
  function contract() { return ROOT.V4BomContract || null; }

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

  function makeId(prefix) {
    return `${prefix || 'quote'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || { sections: {} });
  }

  function compactBomRow(row, index) {
    const src = row || {};
    return {
      n: index + 1,
      sectionKey: toText(src.sectionKey || src.section_key || src.section, 'equipment'),
      sectionTitle: toText(src.sectionTitle || src.section_title),
      id: toText(src.id || src.itemId || src.item_id || src.code || src.name),
      itemId: toText(src.itemId || src.item_id || src.inventoryItemId || src.inventory_item_id),
      inventoryItemId: toText(src.inventoryItemId || src.inventory_item_id),
      code: toText(src.code || src.id || src.itemId || src.item_id, '—'),
      name: toText(src.name || src.label || src.title || src.code, 'Позиция'),
      qty: nonNegative(src.qty == null ? src.quantity : src.qty, 0),
      unit: toText(src.unit, 'шт'),
      weightKg: nonNegative(src.weightKg == null ? src.weight_kg : src.weightKg, 0),
      powerW: nonNegative(src.powerW == null ? src.power_w : src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW == null ? src.startup_power_w : src.startupPowerW, 0),
      sourceType: toText(src.sourceType || src.source_type, 'own'),
      sourceSystem: toText(src.sourceSystem || src.source_system),
      requestedQty: nonNegative(src.requestedQty == null ? src.requested_qty : src.requestedQty, src.qty || 0),
      availableQty: src.availableQty == null && src.available_qty == null ? null : nonNegative(src.availableQty == null ? src.available_qty : src.availableQty, 0),
      deficitQty: nonNegative(src.deficitQty == null ? src.deficit_qty : src.deficitQty, 0),
      subrentQty: nonNegative(src.subrentQty == null ? src.subrent_qty : src.subrentQty, 0),
      inventoryStatus: toText(src.inventoryStatus || src.inventory_status),
      note: toText(src.note || (Array.isArray(src.notes) ? src.notes.join('; ') : src.notes))
    };
  }

  function compactQuoteItem(row, index) {
    const src = row || {};
    const base = compactBomRow(src, index);
    return Object.assign(base, {
      id: toText(src.id || src.quoteItemId || base.id),
      quoteId: toText(src.quoteId || src.quote_id),
      quote_id: toText(src.quote_id || src.quoteId),
      section_key: toText(src.section_key || src.sectionKey || base.sectionKey),
      source_type: toText(src.source_type || src.sourceType || base.sourceType),
      rentalPrice: nonNegative(src.rentalPrice == null ? src.rental_price : src.rentalPrice, 0),
      clientPrice: nonNegative(src.clientPrice == null ? src.client_price : src.clientPrice, 0),
      subrentPrice: nonNegative(src.subrentPrice == null ? src.subrent_price : src.subrentPrice, 0),
      totalRental: nonNegative(src.totalRental == null ? src.total_rental : src.totalRental, 0),
      totalClient: nonNegative(src.totalClient == null ? src.total_client : src.totalClient, 0),
      totalSubrent: nonNegative(src.totalSubrent == null ? src.total_subrent : src.totalSubrent, 0),
      margin: nonNegative(src.margin, 0)
    });
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

  function collectSharedRows(q, options) {
    if (bridge() && bridge().collectQuoteBomRows) return bridge().collectQuoteBomRows(q, Object.assign({ enrichAvailability: false }, options || {}));
    if (ROOT.QuoteSummaryBuilder && ROOT.QuoteSummaryBuilder.collectBomRows) return ROOT.QuoteSummaryBuilder.collectBomRows(q, options || {});
    return [];
  }

  function buildQuoteItems(q, options) {
    if (itemBuilder() && itemBuilder().buildQuoteItems) return itemBuilder().buildQuoteItems(q, Object.assign({ includeTransport: false }, options || {}));
    if (bridge() && bridge().buildQuoteItemRows) return { rows: bridge().buildQuoteItemRows(q, options || {}), totals: {} };
    return { rows: [], totals: {} };
  }

  function buildWarehouseRows(q, options) {
    if (exporter() && exporter().buildUnifiedWarehouseSheet) {
      const sheet = exporter().buildUnifiedWarehouseSheet(q, options || {});
      return { rows: Array.isArray(sheet.rows) ? sheet.rows : [], totals: sheet.totals || {} };
    }
    if (pickLists() && pickLists().buildPickLists) {
      const all = pickLists().buildPickLists(q).all || { rows: [] };
      return { rows: pickLists().getRowsForPrint ? pickLists().getRowsForPrint(all) : (all.rows || []), totals: { rows: (all.rows || []).length, qty: all.totalQty || 0, weightKg: all.totalWeightKg || 0 } };
    }
    return { rows: [], totals: {} };
  }

  function buildTechnicalRows(q, options) {
    if (exporter() && exporter().buildUnifiedTechnicalSheet) {
      const sheet = exporter().buildUnifiedTechnicalSheet(q, options || {});
      return { rows: Array.isArray(sheet.rows) ? sheet.rows : [], totals: sheet.totals || {} };
    }
    const rows = collectSharedRows(q, options || {});
    return { rows, totals: summarizeRows(rows) };
  }

  function sectionUsesQuickIdeal(section) {
    if (!section) return false;
    if (toText(section.catalogMode || section.sourceMode) === 'quick') return true;
    const rows = Array.isArray(section.bomRows) ? section.bomRows : [];
    return rows.some(row => toText(row && (row.sourceType || row.source_type)) === 'quick_ideal' || !!(row && row.meta && row.meta.quickIdealCatalog));
  }

  function rematerializeSectionsForQuoteCatalog(sections) {
    const src = sections || {};
    const next = Object.assign({}, src);
    if (sectionUsesQuickIdeal(src.stage) && ROOT.V4StructureConfigurator && ROOT.V4StructureConfigurator.buildStageSection) {
      next.stage = ROOT.V4StructureConfigurator.buildStageSection(src.stage && src.stage.input || {}, {
        source: 'quick-to-quote-stage-catalog-remap',
        catalogMode: 'quote',
        sourceMode: 'quote'
      });
    }
    if (sectionUsesQuickIdeal(src.truss) && ROOT.V4StructureConfigurator && ROOT.V4StructureConfigurator.buildTrussSection) {
      next.truss = ROOT.V4StructureConfigurator.buildTrussSection(src.truss && src.truss.input || {}, {
        source: 'quick-to-quote-truss-catalog-remap',
        catalogMode: 'quote',
        sourceMode: 'quote'
      });
    }
    if (sectionUsesQuickIdeal(src.led) && ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedSection) {
      next.led = ROOT.V4LedBomBridge.buildLedSection(src.led && src.led.input || {}, {
        source: 'quick-to-quote-led-catalog-remap',
        catalogMode: 'quote',
        sourceMode: 'quote'
      });
    }
    return next;
  }

  function buildSectionMounts(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const key = toText(row.sectionKey || row.section_key, 'equipment');
      const prev = map.get(key) || { sectionKey: key, sectionTitle: toText(row.sectionTitle || row.section_title, key), rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitQty: 0 };
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

  function buildChecks(q, sharedRows, quoteRows, warehouseRows) {
    const enabled = model() && model().getEnabledSectionKeys ? model().getEnabledSectionKeys(q) : [];
    const configuredSections = enabled.filter(key => q.sections && q.sections[key] && q.sections[key].status === 'configured');
    const rows = [
      { key: 'quote_id', ok: Boolean(q.id), label: q.id ? `quote id: ${q.id}` : 'quote id не задан' },
      { key: 'sections', ok: configuredSections.length > 0 || enabled.length === 0, label: configuredSections.length ? `готовые секции: ${configuredSections.join(', ')}` : 'готовых секций пока нет' },
      { key: 'shared_bom', ok: sharedRows.length > 0 || configuredSections.length === 0, label: `shared BOM: ${sharedRows.length} строк` },
      { key: 'quote_items', ok: quoteRows.length >= sharedRows.length || sharedRows.length === 0, label: `quote_items: ${quoteRows.length} строк` },
      { key: 'warehouse', ok: warehouseRows.length >= 0, label: `складской лист: ${warehouseRows.length} строк` }
    ];
    return { ok: rows.every(row => row.ok), rows };
  }

  function buildDraftBomMount(quote, options) {
    const opts = Object.assign({ source: 'quote-draft-bom-sink', enrichAvailability: false }, options || {});
    const q = normalizeQuote(quote || {});
    const sharedRows = collectSharedRows(q, opts);
    const compactSharedRows = sharedRows.map(compactBomRow);
    const quoteItems = buildQuoteItems(q, opts);
    const quoteRows = Array.isArray(quoteItems.rows) ? quoteItems.rows : [];
    const warehouse = buildWarehouseRows(q, opts);
    const warehouseRows = Array.isArray(warehouse.rows) ? warehouse.rows : [];
    const technical = buildTechnicalRows(q, opts);
    const technicalRows = Array.isArray(technical.rows) ? technical.rows : [];
    const totals = summarizeRows(sharedRows);
    const checks = buildChecks(q, sharedRows, quoteRows, warehouseRows);
    const contractReadiness = contract() && contract().buildBomReadinessReport ? contract().buildBomReadinessReport(q, { noPrices: true, requireRows: false }) : null;
    const contractDescriptor = contract() && contract().buildContractDescriptor ? contract().buildContractDescriptor() : null;
    return {
      type: 'feg-stage-pro-v4-quote-draft-bom-mount',
      version: QUOTE_DRAFT_BOM_SINK_VERSION,
      quoteId: q.id,
      quote_id: q.id,
      projectName: q.project && q.project.name || '',
      source: toText(opts.source, 'quote-draft-bom-sink'),
      hasPrices: false,
      contract: contractDescriptor,
      contractReadiness,
      contractOk: contractReadiness ? Boolean(contractReadiness.ready) : checks.ok,
      sharedBom: {
        rows: compactSharedRows,
        totals
      },
      quoteItems: {
        rows: quoteRows.map(compactQuoteItem),
        totals: clone(quoteItems.totals || {}) || {}
      },
      warehouseSheet: {
        rows: warehouseRows.map(compactBomRow),
        totals: clone(warehouse.totals || {}) || {}
      },
      technicalSheet: {
        rows: technicalRows.map(compactBomRow),
        totals: clone(technical.totals || {}) || {}
      },
      sections: buildSectionMounts(sharedRows),
      rowCounts: {
        sharedBom: compactSharedRows.length,
        quoteItems: quoteRows.length,
        warehouse: warehouseRows.length,
        technical: technicalRows.length
      },
      totals,
      checks,
      readyFor: {
        quoteWizard: true,
        documents: true,
        warehousePickList: true,
        backendQuoteItems: contractReadiness && contractReadiness.targets ? Boolean(contractReadiness.targets.backendQuoteItems) : quoteRows.length >= compactSharedRows.length,
        bomContract: contractReadiness ? Boolean(contractReadiness.ready) : checks.ok,
        quickCalculator: true,
        legacyV3Touched: false
      },
      protectedFlows: ['legacy/v3', 'old v3 fallback', 'LED fastener formulas', 'stock movements', 'reservations', 'controlled backend writes'],
      generatedAt: nowIso()
    };
  }

  function attachBomSnapshot(quote, options) {
    const q = normalizeQuote(quote || {});
    const mount = buildDraftBomMount(q, options || {});
    const next = Object.assign({}, q, { v4Bom: mount, updatedAt: nowIso() });
    return model() && model().createQuoteDraft ? model().createQuoteDraft(next) : next;
  }

  function prepareQuoteDraftForSave(quote, options) {
    const opts = options || {};
    let q = normalizeQuote(quote || {});
    if (opts.ensureUniqueId || /^quick_unified_bom_export/.test(String(q.id || ''))) q.id = makeId('quote');
    if (opts.projectName && (!q.project || !q.project.name)) q.project = Object.assign({}, q.project || {}, { name: opts.projectName });
    q.appVersion = `3.15.43-${toText(opts.source, 'quote-draft')}`;
    q.status = toText(q.status, 'draft') || 'draft';
    return attachBomSnapshot(q, opts);
  }

  function makeQuoteDraftFromSections(sections, options) {
    const opts = options || {};
    const quoteSections = rematerializeSectionsForQuoteCatalog(sections || {});
    const quote = exporter() && exporter().makeQuoteFromSections
      ? exporter().makeQuoteFromSections(quoteSections || {}, { source: opts.source || 'quick-to-quote-draft', projectName: opts.projectName || 'Быстрый расчёт v4' })
      : normalizeQuote({ project: { name: opts.projectName || 'Быстрый расчёт v4' }, scope: { stage: Boolean(quoteSections && quoteSections.stage), truss: Boolean(quoteSections && quoteSections.truss), led: Boolean(quoteSections && quoteSections.led), transport: false }, sections: quoteSections || {} });
    return prepareQuoteDraftForSave(quote, Object.assign({}, opts, { source: opts.source || 'quick-to-quote-draft', ensureUniqueId: opts.ensureUniqueId !== false }));
  }

  function mountToText(mount) {
    const m = mount || {};
    const totals = m.totals || {};
    const counts = m.rowCounts || {};
    const lines = [];
    lines.push('V4 quote draft BOM snapshot');
    lines.push(`Версия: ${m.version || QUOTE_DRAFT_BOM_SINK_VERSION}`);
    lines.push(`Quote: ${m.quoteId || '—'}`);
    if (m.projectName) lines.push(`Проект: ${m.projectName}`);
    lines.push(`Shared BOM: ${counts.sharedBom || 0} строк`);
    lines.push(`quote_items: ${counts.quoteItems || 0} строк`);
    lines.push(`Склад: ${counts.warehouse || 0} строк`);
    lines.push(`Вес: ${nonNegative(totals.weightKg, 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`);
    if (totals.powerW) lines.push(`Мощность: ${nonNegative(totals.powerW, 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} Вт`);
    lines.push('');
    lines.push('Разделы:');
    (m.sections || []).forEach(row => lines.push(`- ${row.sectionTitle || row.sectionKey}: ${row.rows || 0} строк, ${row.qty || 0} ед., ${Number(row.weightKg || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`));
    lines.push('');
    lines.push(`Готовность: ${m.checks && m.checks.ok ? 'ok' : 'есть предупреждения'}`);
    if (m.contractReadiness) lines.push(`BOM contract: ${m.contractReadiness.ready ? 'ready' : 'blocked'} · ${m.contractReadiness.version || ''}`);
    (m.checks && m.checks.rows || []).forEach(row => lines.push(`${row.ok ? '✓' : '!'} ${row.label}`));
    (m.contractReadiness && m.contractReadiness.checks || []).forEach(row => lines.push(`${row.ok ? '✓' : '!'} contract/${row.key}: ${row.label}`));
    lines.push('');
    lines.push(`Сформировано: ${m.generatedAt || nowIso()}`);
    return lines.join('\n');
  }

  ROOT.V4QuoteDraftBomSink = {
    QUOTE_DRAFT_BOM_SINK_VERSION,
    buildDraftBomMount,
    attachBomSnapshot,
    prepareQuoteDraftForSave,
    rematerializeSectionsForQuoteCatalog,
    makeQuoteDraftFromSections,
    mountToText
  };
})();
