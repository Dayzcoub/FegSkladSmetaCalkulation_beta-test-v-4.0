// FEG Stage PRO v3.15.45 — V4BomInspector
// Read-only diagnostic panel for the shared v4 BOM bridge, quote_items and warehouse pick list snapshots.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const BOM_INSPECTOR_VERSION = '3.15.45';
  const SOURCE_LABELS = Object.freeze({ active: 'Активный черновик', quick: 'Быстрый расчёт', demo: 'Демо BOM' });

  function model() { return ROOT.QuoteModel || null; }
  function drafts() { return ROOT.QuoteDraftStorage || null; }
  function bridge() { return ROOT.V4SharedBomBridge || null; }
  function items() { return ROOT.QuoteItemBuilder || null; }
  function pickLists() { return ROOT.WarehousePickListBuilder || null; }
  function contract() { return ROOT.V4BomContract || null; }
  function binder() { return ROOT.QuoteSectionBinder || null; }
  function ledCalc() { return ROOT.LedCalculator || null; }
  function structure() { return ROOT.V4StructureConfigurator || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function createDraft(input) {
    if (model() && model().createQuoteDraft) return model().createQuoteDraft(input || {});
    return Object.assign({ id: 'quote-inspector-local', scope: {}, sections: {}, transport: {}, totals: {} }, input || {});
  }

  function hasSectionRows(section) {
    if (!section) return false;
    const rows = Array.isArray(section.bomRows) ? section.bomRows : Array.isArray(section.items) ? section.items : [];
    return rows.some(row => nonNegative(row && (row.qty == null ? row.quantity : row.qty), 0) > 0 || nonNegative(row && row.weightKg, 0) > 0);
  }

  function quoteHasSharedRows(quote) {
    const q = createDraft(quote || {});
    const sections = q.sections || {};
    return ['stage', 'truss', 'led', 'equipment'].some(key => hasSectionRows(sections[key]));
  }

  function makeQuoteFromSections(sections, overrides) {
    const src = sections || {};
    const scope = Object.assign({
      stage: Boolean(src.stage),
      truss: Boolean(src.truss),
      led: Boolean(src.led),
      sound: Boolean(src.equipment),
      light: false,
      backline: false,
      services: false,
      transport: true
    }, overrides && overrides.scope || {});
    return createDraft(Object.assign({
      id: overrides && overrides.id || `bom_inspector_${Date.now().toString(36)}`,
      status: 'draft',
      project: { name: overrides && overrides.projectName || 'V4 BOM inspector' },
      scope,
      sections: {
        stage: src.stage || null,
        truss: src.truss || null,
        led: src.led || null,
        equipment: src.equipment || { items: [], notes: '' }
      }
    }, overrides || {}));
  }

  function getQuickSections(options) {
    const opts = options || {};
    if (typeof opts.getQuickSections === 'function') return opts.getQuickSections() || {};
    if (typeof opts.getQuickSection === 'function') {
      return {
        stage: opts.getQuickSection('stage'),
        truss: opts.getQuickSection('truss'),
        led: opts.getQuickSection('led'),
        equipment: opts.getQuickSection('equipment')
      };
    }
    return opts.quickSections || {};
  }

  function buildDemoLedSection() {
    if (!binder() || !binder().buildLedSection || !ledCalc()) return null;
    try {
      return binder().buildLedSection({ widthM: 4, heightM: 2.56, format: '640x640', pitch: 'p4', legType: '3m', legCount: 2 }, { source: 'bom-inspector-demo-led' });
    } catch (_) {
      return null;
    }
  }

  function buildDemoQuote() {
    const svc = structure();
    const sections = {};
    try {
      if (svc && svc.buildStageSection) sections.stage = svc.buildStageSection({ widthModules: 4, depthModules: 3 }, { source: 'bom-inspector-demo-stage' });
    } catch (_) {}
    try {
      if (svc && svc.buildTrussSection) sections.truss = svc.buildTrussSection({ lengthM: 6, baseCount: 2 }, { source: 'bom-inspector-demo-truss' });
    } catch (_) {}
    const led = buildDemoLedSection();
    if (led) sections.led = led;
    if (!sections.stage) {
      sections.stage = {
        type: 'stage', title: 'Сцена', status: 'configured', source: 'bom-inspector-fallback-stage', summary: 'Демо сцена 4×3 модуля', weightKg: 321,
        bomRows: [
          { code: 'STG-901', name: 'Модуль / лист настила сцены 1.2×1.2 м', qty: 12, unit: 'шт', weightKg: 216, sourceType: 'own' },
          { code: 'STG-902', name: 'Столб / опора сцены средняя', qty: 20, unit: 'шт', weightKg: 52, sourceType: 'own' },
          { code: 'STG-903', name: 'Перекладина / рама сцены низкая', qty: 24, unit: 'шт', weightKg: 84, sourceType: 'own' }
        ]
      };
    }
    if (!sections.truss) {
      sections.truss = {
        type: 'truss', title: 'Фермы', status: 'configured', source: 'bom-inspector-fallback-truss', summary: 'Демо ферма 6 м + 2 базы', weightKg: 98,
        bomRows: [
          { code: 'TRS-901', name: 'Ферма прямая 3.0 м', qty: 2, unit: 'шт', weightKg: 35.8, sourceType: 'own' },
          { code: 'TRS-930', name: 'База / блин под ферму', qty: 2, unit: 'шт', weightKg: 58, sourceType: 'own' },
          { code: 'TRS-940', name: 'Конусный коннектор C2-88 / бабышка', qty: 4, unit: 'шт', weightKg: 0.64, sourceType: 'own' },
          { code: 'TRS-942', name: 'Палец C2-67', qty: 8, unit: 'шт', sourceType: 'own' },
          { code: 'TRS-943', name: 'Шплинт игольчатый C2-2-48', qty: 8, unit: 'шт', weightKg: 0.024, sourceType: 'own' }
        ]
      };
    }
    return makeQuoteFromSections(sections, { id: 'bom_inspector_demo_quote', projectName: 'Демо: общий BOM v4' });
  }

  function getActiveQuote() {
    if (drafts() && drafts().loadActiveDraft) {
      try { return drafts().loadActiveDraft(); } catch (_) { return null; }
    }
    return null;
  }

  function resolveQuote(options) {
    const opts = options || {};
    const mode = opts.sourceMode || opts.mode || 'auto';
    if (opts.quote) return { quote: createDraft(opts.quote), sourceMode: 'custom', sourceLabel: 'Переданная quote-модель' };
    if (typeof opts.getQuote === 'function') {
      const q = opts.getQuote();
      if (q) return { quote: createDraft(q), sourceMode: 'custom', sourceLabel: 'Переданная quote-модель' };
    }
    if (mode === 'demo') return { quote: buildDemoQuote(), sourceMode: 'demo', sourceLabel: SOURCE_LABELS.demo };
    if (mode === 'quick') {
      const quick = getQuickSections(opts);
      return { quote: makeQuoteFromSections(quick, { projectName: 'Быстрый расчёт v4' }), sourceMode: 'quick', sourceLabel: SOURCE_LABELS.quick };
    }
    if (mode === 'active') {
      const active = getActiveQuote();
      return { quote: createDraft(active || {}), sourceMode: 'active', sourceLabel: SOURCE_LABELS.active };
    }
    const active = getActiveQuote();
    if (active && quoteHasSharedRows(active)) return { quote: createDraft(active), sourceMode: 'active', sourceLabel: SOURCE_LABELS.active };
    const quick = getQuickSections(opts);
    if (quoteHasSharedRows({ sections: quick })) return { quote: makeQuoteFromSections(quick, { projectName: 'Быстрый расчёт v4' }), sourceMode: 'quick', sourceLabel: SOURCE_LABELS.quick };
    return { quote: buildDemoQuote(), sourceMode: 'demo', sourceLabel: SOURCE_LABELS.demo };
  }

  function emptyBridge(quote) {
    return { type: 'feg-stage-pro-v4-shared-bom-bridge', version: bridge() && bridge().SHARED_BOM_BRIDGE_VERSION || '', quoteId: quote && quote.id || '', rows: [], rowsBySection: {}, totals: { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitRows: 0, deficitQty: 0, subrentRows: 0 }, generatedAt: nowIso() };
  }

  function buildInspectorSnapshot(quote, options) {
    const q = createDraft(quote || {});
    const bomBridge = bridge() && bridge().buildQuoteBomBridge ? bridge().buildQuoteBomBridge(q, { enrichAvailability: false }) : emptyBridge(q);
    const sharedRows = Array.isArray(bomBridge.rows) ? bomBridge.rows : [];
    const quoteItemPayload = items() && items().buildQuoteItems ? items().buildQuoteItems(q, { includeTransport: false }) : { rows: [], totals: {} };
    const pickListPayload = pickLists() && pickLists().buildPickLists ? pickLists().buildPickLists(q) : { all: { rows: [], totalQty: 0, totalWeightKg: 0 }, sections: [], deficits: { rows: [] }, subrent: { rows: [] } };
    const sectionTotals = buildSectionTotals(sharedRows);
    const checks = buildChecks(bomBridge, quoteItemPayload, pickListPayload);
    const contractReadiness = contract() && contract().buildBomReadinessReport ? contract().buildBomReadinessReport(q, { noPrices: true, requireRows: false }) : null;
    return {
      type: 'feg-stage-pro-v4-bom-inspector-snapshot',
      version: BOM_INSPECTOR_VERSION,
      bridgeVersion: bridge() && bridge().SHARED_BOM_BRIDGE_VERSION || '',
      quoteId: q.id,
      quoteProjectName: q.project && q.project.name || '',
      sourceMode: options && options.sourceMode || '',
      sourceLabel: options && options.sourceLabel || '',
      sharedBom: bomBridge,
      quoteItems: quoteItemPayload,
      pickLists: pickListPayload,
      sectionTotals,
      stageFlow: bridge() && bridge().buildStageFlowSnapshot ? bridge().buildStageFlowSnapshot(q, { enrichAvailability: false }) : null,
      ledFlow: bridge() && bridge().buildLedFlowSnapshot ? bridge().buildLedFlowSnapshot(q, { enrichAvailability: false }) : null,
      checks,
      contractReadiness,
      totals: bomBridge.totals || {},
      generatedAt: nowIso()
    };
  }

  function buildSectionTotals(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const key = row.sectionKey || row.section_key || 'equipment';
      const prev = map.get(key) || { sectionKey: key, sectionTitle: row.sectionTitle || row.section_title || key, rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitQty: 0 };
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

  function buildChecks(bomBridge, quoteItemPayload, pickListPayload) {
    const sharedRows = Array.isArray(bomBridge && bomBridge.rows) ? bomBridge.rows : [];
    const quoteRows = Array.isArray(quoteItemPayload && quoteItemPayload.rows) ? quoteItemPayload.rows : [];
    const pickRows = pickListPayload && pickListPayload.all && Array.isArray(pickListPayload.all.rows) ? pickListPayload.all.rows : [];
    const checks = [
      makeCheck('shared_rows', sharedRows.length > 0, `Shared BOM rows: ${sharedRows.length}`, 'Shared BOM пока пустой.'),
      makeCheck('quote_items', quoteRows.length >= sharedRows.length || sharedRows.length === 0, `quote_items rows: ${quoteRows.length}`, `quote_items строк меньше shared BOM: ${quoteRows.length}/${sharedRows.length}`),
      makeCheck('warehouse_picklist', pickRows.length > 0 || sharedRows.length === 0, `Warehouse pick list rows: ${pickRows.length}`, 'Складской лист пока не построился.'),
      makeCheck('source_types', sharedRows.every(row => ['own', 'subrent', 'manual', 'subrent_needed'].includes(row.sourceType || 'own')), 'Типы источников нормализованы.', 'Есть неожиданный sourceType.'),
      makeCheck('weights', nonNegative(bomBridge && bomBridge.totals && bomBridge.totals.weightKg, 0) >= 0, `Вес: ${formatNumber(bomBridge && bomBridge.totals && bomBridge.totals.weightKg, 1)} кг`, 'Вес не удалось посчитать.')
    ];
    const failed = checks.filter(row => !row.ok).length;
    return { ok: failed === 0, failed, rows: checks };
  }

  function makeCheck(key, ok, pass, fail) {
    return { key, ok: Boolean(ok), label: Boolean(ok) ? pass : fail };
  }

  function renderInspector(target, options) {
    const root = typeof target === 'string' ? (GLOBAL.document && document.getElementById(target)) : target;
    if (!root) return null;
    const opts = Object.assign({}, options || {});
    const mode = root._v4BomInspectorMode || opts.sourceMode || opts.mode || 'auto';
    const resolved = resolveQuote(Object.assign({}, opts, { sourceMode: mode }));
    const snapshot = buildInspectorSnapshot(resolved.quote, resolved);
    root._v4BomInspectorOptions = opts;
    root._v4BomInspectorSnapshot = snapshot;
    root.innerHTML = renderInspectorHtml(snapshot, opts);
    root.querySelectorAll('[data-v4-bom-source]').forEach(btn => btn.addEventListener('click', () => {
      root._v4BomInspectorMode = btn.getAttribute('data-v4-bom-source') || 'auto';
      renderInspector(root, opts);
    }));
    const refreshBtn = root.querySelector('[data-v4-bom-refresh]');
    if (refreshBtn) refreshBtn.addEventListener('click', () => renderInspector(root, opts));
    const copyBtn = root.querySelector('[data-v4-bom-copy]');
    if (copyBtn) copyBtn.addEventListener('click', () => copySnapshot(root));
    const downloadBtn = root.querySelector('[data-v4-bom-download]');
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadSnapshot(root));
    return root;
  }

  function refresh(target) {
    const root = typeof target === 'string' ? (GLOBAL.document && document.getElementById(target)) : target;
    if (!root) return null;
    return renderInspector(root, root._v4BomInspectorOptions || {});
  }

  function renderInspectorHtml(snapshot, options) {
    const totals = snapshot.totals || {};
    const rows = snapshot.sharedBom && Array.isArray(snapshot.sharedBom.rows) ? snapshot.sharedBom.rows : [];
    const quoteRows = snapshot.quoteItems && Array.isArray(snapshot.quoteItems.rows) ? snapshot.quoteItems.rows : [];
    const pickRows = snapshot.pickLists && snapshot.pickLists.all && Array.isArray(snapshot.pickLists.all.rows) ? snapshot.pickLists.all.rows : [];
    return `
      <div class="v4-bom-inspector v4-card">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">V4 BOM inspector · ${esc(snapshot.version)}</div>
            <h3>Общий BOM v4</h3>
            <p class="v4-muted">Один поток комплектации: shared BOM → quote_items → складской лист. Диагностика только читает данные и не меняет legacy/v3.</p>
          </div>
          <div class="v4-bom-source-card">
            <span>Источник</span>
            <b>${esc(snapshot.sourceLabel || 'Авто')}</b>
            <small>${esc(snapshot.quoteProjectName || snapshot.quoteId || 'черновик')}</small>
          </div>
        </div>
        <div class="v4-actions v4-bom-actions">
          <button type="button" class="btn-secondary" data-v4-bom-source="auto">Авто</button>
          <button type="button" class="btn-secondary" data-v4-bom-source="quick">Быстрый расчёт</button>
          <button type="button" class="btn-secondary" data-v4-bom-source="active">Черновик</button>
          <button type="button" class="btn-secondary" data-v4-bom-source="demo">Демо</button>
          <button type="button" class="btn-secondary" data-v4-bom-refresh>Обновить</button>
        </div>
        <div class="v4-summary-grid v4-bom-summary-grid">
          <div class="v4-mini"><b>${esc(formatNumber(totals.rows, 0))}</b><span>строк BOM</span><small>shared bridge ${esc(snapshot.bridgeVersion || '—')}</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(totals.qty, 0))}</b><span>единиц всего</span><small>по всем разделам</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(totals.weightKg, 1))} кг</b><span>общий вес</span><small>из BOM-строк</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(totals.powerW, 0))} Вт</b><span>рабочая мощность</span><small>LED/оборудование</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(totals.startupPowerW, 0))} Вт</b><span>пусковая мощность</span><small>если задана</small></div>
          <div class="v4-mini ${snapshot.checks && snapshot.checks.ok ? 'ok' : 'warn'}"><b>${snapshot.checks && snapshot.checks.ok ? 'OK' : 'Проверить'}</b><span>сквозной поток</span><small>${esc((snapshot.checks && snapshot.checks.failed) || 0)} предупреждений</small></div>
        </div>
        <div class="v4-bom-checks">${(snapshot.checks && snapshot.checks.rows || []).map(row => `<span class="${row.ok ? 'ok' : 'warn'}">${row.ok ? '✓' : '⚠'} ${esc(row.label)}</span>`).join('')}</div>
        ${renderContractPanel(snapshot.contractReadiness)}
        ${renderSectionTotals(snapshot.sectionTotals)}
        ${renderStageFlowPanel(snapshot.stageFlow, options)}
        ${renderLedFlowPanel(snapshot.ledFlow, options)}
        <details class="v4-bom-details" open>
          <summary>Shared BOM rows · ${esc(rows.length)}</summary>
          ${renderBomTable(rows, options)}
        </details>
        <details class="v4-bom-details">
          <summary>quote_items preview · ${esc(quoteRows.length)}</summary>
          ${renderQuoteItemsTable(quoteRows, options)}
        </details>
        <details class="v4-bom-details">
          <summary>Складской лист v4 · ${esc(pickRows.length)}</summary>
          ${renderPickListTable(pickRows, options)}
        </details>
        <div class="v4-actions">
          <button type="button" class="btn-secondary" data-v4-bom-copy>Копировать JSON</button>
          <button type="button" class="btn-secondary" data-v4-bom-download>Скачать snapshot</button>
        </div>
      </div>`;
  }

  function renderContractPanel(report) {
    if (!report) return '<div class="v4-note"><b>BOM contract:</b> модуль V4BomContract не загружен.</div>';
    const counts = report.counts || {};
    const totals = report.totals || {};
    const checks = Array.isArray(report.checks) ? report.checks : [];
    const status = report.ready ? 'READY' : 'BLOCKED';
    return `
      <details class="v4-bom-details v4-bom-contract" open>
        <summary>BOM contract · ${esc(status)} · ${esc(report.version || '')}</summary>
        <div class="v4-summary-grid v4-bom-summary-grid">
          <div class="v4-mini ${report.ready ? 'ok' : 'warn'}"><b>${esc(status)}</b><span>контракт</span><small>документы / склад / backend</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(counts.sharedBom, 0))}</b><span>shared BOM</span><small>строк по контракту</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(counts.quoteItems, 0))}</b><span>quote_items</span><small>preview</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(counts.warehouse, 0))}</b><span>склад</span><small>pick list</small></div>
          <div class="v4-mini"><b>${esc(formatNumber(totals.weightKg, 1))} кг</b><span>вес</span><small>из contract rows</small></div>
          <div class="v4-mini"><b>${esc(report.targets && report.targets.backendQuoteItems ? 'да' : 'нет')}</b><span>backend quote_items</span><small>готовность</small></div>
        </div>
        <div class="v4-bom-checks">${checks.map(row => `<span class="${row.ok ? 'ok' : 'warn'}">${row.ok ? '✓' : '⚠'} ${esc(row.label || row.key)}</span>`).join('')}</div>
      </details>`;
  }

  function renderSectionTotals(rows) {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return '<div class="v4-note">Нет разделов с BOM-строками.</div>';
    return `<div class="v4-bom-sections">${list.map(row => `
      <div>
        <b>${esc(row.sectionTitle || row.sectionKey)}</b>
        <span>${esc(formatNumber(row.rows, 0))} строк · ${esc(formatNumber(row.qty, 0))} ед. · ${esc(formatNumber(row.weightKg, 1))} кг</span>
        <small>${esc(formatNumber(row.powerW, 0))} Вт · дефицит ${esc(formatNumber(row.deficitQty, 0))}</small>
      </div>`).join('')}</div>`;
  }


  function renderStageFlowPanel(flow, options) {
    if (!flow || !flow.section) return '<div class="v4-note"><b>Stage flow:</b> сцена пока не найдена в активном источнике BOM.</div>';
    const section = flow.section || {};
    const geometry = section.result && section.result.geometry || flow.geometry || {};
    const cfg = section.stageConfig || flow.stageConfig || {};
    const counts = flow.counts || {};
    const totals = flow.totals || {};
    const checks = flow.checks || { ok: true, rows: [] };
    return `
      <details class="v4-bom-details v4-stage-flow" open>
        <summary>Stage flow · quote.stage → shared BOM → quote_items → склад · ${esc(counts.sharedBomRows || 0)} строк</summary>
        <div class="v4-stage-flow-body">
          <div class="v4-summary-grid v4-stage-flow-grid">
            <div class="v4-mini"><b>${esc(formatNumber(geometry.sheets, 0))}</b><span>листы настила</span><small>${esc(cfg.deckLabel || 'настил')}</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(geometry.columns, 0))}</b><span>опоры</span><small>${esc(cfg.supportLabel || 'столбы')}</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(geometry.frames, 0))}</b><span>перекладины</span><small>${esc(cfg.frameLabel || 'рамы')}</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(geometry.studs, 0))}</b><span>шпильки</span><small>1 шт на опору</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(geometry.feet, 0))}</b><span>пятки</span><small>1 шт на опору</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(totals.weightKg, 1))} кг</b><span>вес сцены</span><small>из shared BOM</small></div>
          </div>
          <div class="v4-bom-checks">${(checks.rows || []).map(row => `<span class="${row.ok ? 'ok' : 'warn'}">${row.ok ? '✓' : '⚠'} ${esc(row.label)}</span>`).join('')}</div>
          <div class="v4-bom-sections">
            <div><b>Shared BOM</b><span>${esc(formatNumber(counts.sharedBomRows, 0))} строк · ${esc(formatNumber(totals.qty, 0))} ед.</span><small>нормализованные позиции STG</small></div>
            <div><b>quote_items</b><span>${esc(formatNumber(counts.quoteItems, 0))} строк</span><small>готово для сметы/backend</small></div>
            <div><b>Складской лист</b><span>${esc(formatNumber(counts.warehouseRows, 0))} строк</span><small>готово для сборки</small></div>
          </div>
          ${renderStageFlowRows(flow.sharedRows || [], options)}
        </div>
      </details>`;
  }

  function renderStageFlowRows(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const list = limitRows(source, options);
    if (!list.length) return '<div class="v4-note">Stage shared BOM пустой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--bom-inspector"><thead><tr><th>STG</th><th>Позиция сцены</th><th>Кол-во</th><th>Вес/шт</th><th>Вес всего</th><th>Маршрут</th></tr></thead><tbody>${list.map(row => `
      <tr>
        <td><code>${esc(row.code || '')}</code></td>
        <td class="v4-name-cell"><b>${esc(row.name || '')}</b>${row.note ? `<br><small>${esc(row.note)}</small>` : ''}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.qty, 0))} ${esc(row.unit || 'шт')}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.unitWeightKg || row.unit_weight_kg, 2))} кг</td>
        <td class="v4-num-cell">${esc(formatNumber(row.weightKg || row.weight_kg, 1))} кг</td>
        <td>quote.stage<br><small>shared BOM → quote_items → warehouse</small></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function renderLedFlowPanel(flow, options) {
    if (!flow || !flow.section) return '<div class="v4-note"><b>LED flow:</b> LED пока не найден в активном источнике BOM.</div>';
    const section = flow.section || {};
    const result = section.result || flow.ledResult || {};
    const counts = flow.counts || {};
    const totals = flow.totals || {};
    const checks = flow.checks || { ok: true, rows: [] };
    return `
      <details class="v4-bom-details v4-led-flow" open>
        <summary>LED flow · quote.led → shared BOM → quote_items → склад · ${esc(counts.sharedBomRows || 0)} строк</summary>
        <div class="v4-stage-flow-body">
          <div class="v4-summary-grid v4-stage-flow-grid">
            <div class="v4-mini"><b>${esc(formatNumber(result.actualWidthM, 2))}×${esc(formatNumber(result.actualHeightM, 2))} м</b><span>фактический размер</span><small>${esc(formatNumber(result.desiredWidthM, 2))}×${esc(formatNumber(result.desiredHeightM, 2))} м запрошено</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(result.columns, 0))}×${esc(formatNumber(result.rows, 0))} = ${esc(formatNumber(result.cabinetCount, 0))}</b><span>кабинеты</span><small>${esc(result.formatName || '')} · ${esc(result.pitchName || '')}</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(result.totalPixelsX, 0))}×${esc(formatNumber(result.totalPixelsY, 0))}</b><span>пиксели</span><small>${esc(formatNumber(result.cabinetPixelsX, 0))}×${esc(formatNumber(result.cabinetPixelsY, 0))} px/каб.</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(result.powerLinks, 0))} / ${esc(formatNumber(result.rj45Links, 0))}</b><span>линки 220 / RJ45</span><small>1 шт на кабинет</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(result.brackets, 0))} / ${esc(formatNumber(result.m8Bolts, 0))}</b><span>печеньки / М8×60</span><small>М8×20: ${esc(formatNumber(result.m8x20Bolts, 0))} · ${esc(formatNumber(result.legCount, 0))} ног</small></div>
            <div class="v4-mini"><b>${esc(formatNumber(totals.weightKg, 1))} кг</b><span>вес LED</span><small>${esc(formatNumber(totals.powerW, 0))} Вт · пуск ${esc(formatNumber(totals.startupPowerW, 0))} Вт</small></div>
          </div>
          <div class="v4-bom-checks">${(checks.rows || []).map(row => `<span class="${row.ok ? 'ok' : 'warn'}">${row.ok ? '✓' : '⚠'} ${esc(row.label)}</span>`).join('')}</div>
          <div class="v4-bom-sections">
            <div><b>Shared BOM</b><span>${esc(formatNumber(counts.sharedBomRows, 0))} строк · ${esc(formatNumber(totals.qty, 0))} ед.</span><small>нормализованные LED позиции</small></div>
            <div><b>quote_items</b><span>${esc(formatNumber(counts.quoteItems, 0))} строк</span><small>готово для сметы/backend</small></div>
            <div><b>Складской лист</b><span>${esc(formatNumber(counts.warehouseRows, 0))} строк</span><small>готово для сборки</small></div>
          </div>
          ${renderLedFlowRows(flow.sharedRows || [], options)}
        </div>
      </details>`;
  }

  function renderLedFlowRows(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const list = limitRows(source, options);
    if (!list.length) return '<div class="v4-note">LED shared BOM пустой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--bom-inspector"><thead><tr><th>LED</th><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Маршрут</th></tr></thead><tbody>${list.map(row => `
      <tr>
        <td><code>${esc(row.code || '')}</code></td>
        <td class="v4-name-cell"><b>${esc(row.name || '')}</b>${row.note ? `<br><small>${esc(row.note)}</small>` : ''}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.qty, 0))} ${esc(row.unit || 'шт')}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.weightKg || row.weight_kg, 1))} кг</td>
        <td class="v4-num-cell">${esc(formatNumber(row.powerW || row.power_w, 0))} Вт${row.startupPowerW || row.startup_power_w ? `<br><small>пуск ${esc(formatNumber(row.startupPowerW || row.startup_power_w, 0))} Вт</small>` : ''}</td>
        <td>quote.led<br><small>shared BOM → quote_items → warehouse</small></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function renderBomTable(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const list = limitRows(source, options);
    if (!list.length) return '<div class="v4-note">Shared BOM пустой. Построй быстрый расчёт или открой черновик со сметой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--bom-inspector"><thead><tr><th>Раздел</th><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Источник</th><th>Статус</th></tr></thead><tbody>${list.map(row => `
      <tr>
        <td>${esc(row.sectionTitle || row.sectionKey)}</td>
        <td><code>${esc(row.code || row.id || '')}</code></td>
        <td class="v4-name-cell"><b>${esc(row.name || 'Позиция')}</b>${row.note ? `<br><small>${esc(row.note)}</small>` : ''}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.qty, row.unit === 'м' ? 1 : 0))} ${esc(row.unit || 'шт')}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.weightKg, 1))} кг</td>
        <td class="v4-source-cell">${esc(row.sourceType || 'own')}${row.sourceSystem ? `<br><small>${esc(row.sourceSystem)}</small>` : ''}</td>
        <td>${esc(row.inventoryStatus || (row.ok === false ? 'warning' : 'ready'))}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function renderQuoteItemsTable(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const list = limitRows(source, options);
    if (!list.length) return '<div class="v4-note">quote_items preview пустой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--bom-inspector"><thead><tr><th>quote_item id</th><th>section</th><th>item</th><th>qty</th><th>source</th><th>weight</th></tr></thead><tbody>${list.map(row => `
      <tr>
        <td><code>${esc(row.id || '')}</code></td>
        <td>${esc(row.sectionTitle || row.section_key || row.sectionKey || '')}</td>
        <td class="v4-name-cell"><b>${esc(row.name || row.itemName || '')}</b><br><small>${esc(row.code || row.item_id || '')}</small></td>
        <td class="v4-num-cell">${esc(formatNumber(row.qty, 0))} ${esc(row.unit || 'шт')}</td>
        <td>${esc(row.sourceType || row.source_type || 'own')}</td>
        <td class="v4-num-cell">${esc(formatNumber(row.weightKg || row.weight_kg, 1))} кг</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function renderPickListTable(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const list = limitRows(source, options);
    if (!list.length) return '<div class="v4-note">Складской список пустой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--bom-inspector"><thead><tr><th>Раздел</th><th>Код</th><th>Позиция</th><th>К сборке</th><th>Наличие</th><th>Дефицит</th></tr></thead><tbody>${list.map(row => `
      <tr>
        <td>${esc(row.sectionTitle || row.sectionKey || '')}</td>
        <td><code>${esc(row.code || '')}</code></td>
        <td class="v4-name-cell"><b>${esc(row.name || '')}</b></td>
        <td class="v4-num-cell">${esc(formatNumber(row.qty, 0))} ${esc(row.unit || 'шт')}</td>
        <td>${row.availableQty == null ? '—' : esc(formatNumber(row.availableQty, 0))}</td>
        <td>${esc(formatNumber(row.deficitQty, 0))}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function maxRows(options) {
    const value = Number(options && options.maxRows);
    return Number.isFinite(value) && value > 0 ? Math.max(5, Math.floor(value)) : 120;
  }

  function limitRows(rows, options) {
    const list = Array.isArray(rows) ? rows : [];
    const max = maxRows(options);
    return list.length > max ? list.slice(0, max) : list;
  }

  function copySnapshot(root) {
    const snapshot = root && root._v4BomInspectorSnapshot;
    if (!snapshot) return;
    const text = JSON.stringify(snapshot, null, 2);
    if (GLOBAL.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => notify('BOM snapshot скопирован')).catch(() => notify('Не удалось скопировать BOM snapshot'));
      return;
    }
    notify('Скопируй JSON вручную');
  }

  function downloadSnapshot(root) {
    const snapshot = root && root._v4BomInspectorSnapshot;
    if (!snapshot || !GLOBAL.document) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feg-v4-bom-inspector-${snapshot.sourceMode || 'snapshot'}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }

  function notify(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (GLOBAL.showToast) GLOBAL.showToast(message);
  }

  function formatNumber(value, digits) {
    const n = Number(value || 0);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.V4BomInspector = {
    BOM_INSPECTOR_VERSION,
    buildDemoQuote,
    makeQuoteFromSections,
    resolveQuote,
    buildInspectorSnapshot,
    renderInspector,
    refresh
  };
})();
