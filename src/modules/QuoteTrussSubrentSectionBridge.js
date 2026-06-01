// PACK.IT — Quote Truss subrent section bridge.
// Logic bridge only: when the quote wizard binds or saves the truss section, copy only FILLED
// bottom "Добор ферм" rows into sections.truss.subrentRows and seed the truss input.
// Important: do NOT append these rows to sections.truss.bomRows, otherwise the truss
// step position table duplicates the constructor BOM. Final summary/subrent documents
// must read sections.truss.subrentRows separately.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.4.0-quote-truss-subrent-input-seed';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) {
    const n = Number(String(value == null ? '' : value).replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function fieldText(field) {
    if (!field) return '';
    const copy = field.cloneNode(true);
    Array.from(copy.querySelectorAll('input, select, textarea, button')).forEach(node => node.remove());
    return toText(copy.textContent || '');
  }

  function valueOfField(field) {
    const input = field && field.querySelector('input, select, textarea');
    if (!input) return '';
    return toText(input.value);
  }

  function findField(row, patterns) {
    const list = Array.from(row.querySelectorAll('.v4-field, label'));
    const rx = Array.isArray(patterns) ? patterns : [patterns];
    return list.find(field => {
      const text = fieldText(field).toLowerCase();
      return rx.some(pattern => text.includes(String(pattern).toLowerCase()));
    }) || null;
  }

  function parseMeta(row) {
    const meta = row.querySelector('.v4-truss-subrent-meta') || row;
    const title = toText((meta.querySelector('b, strong') || {}).textContent) || 'Позиция субаренды ферм';
    const small = toText((meta.querySelector('small') || {}).textContent);
    const code = toText(row.getAttribute('data-truss-subrent-code')) || toText((small.split('·')[0] || '').trim()) || title;
    return { title, code, note: small };
  }

  function selectedSupplier(row) {
    const field = findField(row, ['у кого', 'субарендатор', 'поставщик']);
    const select = field && field.querySelector('select') || row.querySelector('select');
    if (!select) return { supplierId: '', supplierName: '' };
    const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    const supplierId = toText(select.value);
    const supplierName = toText(option && option.textContent) || supplierId;
    const lowerName = supplierName.toLowerCase();
    const isPlaceholder = !supplierId || lowerName.includes('выбрать') || lowerName.includes('субарендатор');
    return {
      supplierId: isPlaceholder ? '' : supplierId,
      supplierName: isPlaceholder ? '' : supplierName
    };
  }

  function normalizeSubrentRow(raw, index, metaPatch) {
    const row = raw || {};
    const qty = nonNegative(row.qty == null ? (row.subrentQty == null ? row.quantity : row.subrentQty) : row.qty, 0);
    if (qty <= 0) return null;

    const supplierId = toText(row.supplierId || row.supplier_id);
    const supplierName = toText(row.supplierName || row.supplier_name);
    const subrentPrice = nonNegative(row.subrentPrice == null ? row.subrent_price : row.subrentPrice, 0);
    const clientPrice = nonNegative(row.clientPrice == null ? row.client_price : row.clientPrice, subrentPrice || 0);

    // Critical contract: empty rows are deficit hints only. They must NOT go to final summary.
    // A row is filled only after the user chose a real subrentor and entered a positive price.
    if (!supplierName || subrentPrice <= 0) return null;

    const itemId = toText(row.itemId || row.item_id);
    const code = toText(row.code || row.sku || row.itemCode || row.item_code || row.key || row.trussPart || row.truss_part) || `TRUSS-SUBRENT-${index + 1}`;
    const name = toText(row.name || row.title || row.itemName || row.item_name) || 'Позиция субаренды ферм';
    const note = [toText(row.note), `субаренда: ${supplierName}`].filter(Boolean).join('; ');
    const margin = Math.max(0, (clientPrice || 0) - (subrentPrice || 0)) * qty;

    return {
      id: toText(row.id) || `quote-truss-subrent:${itemId || code}:${supplierId || supplierName}:${index}`,
      itemId,
      code,
      name,
      qty,
      unit: toText(row.unit || 'шт') || 'шт',
      requestedQty: nonNegative(row.requestedQty == null ? row.requested_qty : row.requestedQty, qty),
      sourceType: 'subrent',
      sourceSystem: 'quote_truss_subrent_bottom',
      supplierId,
      supplierName,
      subrentQty: qty,
      deficitQty: nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, qty),
      subrentPrice,
      clientPrice,
      rentalPrice: clientPrice || subrentPrice || 0,
      margin,
      weightKg: 0,
      powerW: 0,
      startupPowerW: 0,
      trussPart: toText(row.trussPart || row.truss_part || 'subrent') || 'subrent',
      uiHidden: true,
      hiddenFromSectionBom: true,
      note,
      meta: Object.assign({}, clone(row.meta || {}) || {}, metaPatch || {}, {
        bridgeVersion: VERSION,
        source: 'quote-truss-bottom-subrent-form',
        rowIndex: index,
        uiHidden: true
      })
    };
  }

  function parseRow(row, index) {
    const meta = parseMeta(row);
    const qtyField = findField(row, ['сколько', 'кол-во', 'количество']);
    const subrentPriceField = findField(row, ['субаренда/ед', 'субаренда', 'себест']);
    const clientPriceField = findField(row, ['клиент/ед', 'клиент', 'цена клиенту']);
    const supplier = selectedSupplier(row);
    const clientPriceRaw = valueOfField(clientPriceField);
    const itemId = row.getAttribute('data-truss-subrent-item-id') || '';
    const code = row.getAttribute('data-truss-subrent-code') || meta.code || `TRUSS-SUBRENT-${index + 1}`;
    return normalizeSubrentRow({
      id: `quote-truss-subrent:${itemId || code}:${supplier.supplierId || supplier.supplierName}:${index}`,
      itemId,
      code,
      name: meta.title || 'Позиция субаренды ферм',
      qty: valueOfField(qtyField),
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      subrentPrice: valueOfField(subrentPriceField),
      clientPrice: clientPriceRaw || valueOfField(subrentPriceField),
      note: meta.note,
      trussPart: row.getAttribute('data-truss-subrent-part') || 'subrent'
    }, index, { sourceMode: 'dom' });
  }

  function normalizeSourceRows(source) {
    const src = source || {};
    const section = src.sections && src.sections.truss ? src.sections.truss : null;
    const sectionInput = section && section.input || {};
    const sectionState = sectionInput && sectionInput.state || {};
    const list = Array.isArray(src.subrentRows)
      ? src.subrentRows
      : Array.isArray(src.subrentAssignments)
        ? src.subrentAssignments
        : Array.isArray(src.state && src.state.subrentAssignments)
          ? src.state.subrentAssignments
          : Array.isArray(section && section.subrentRows)
            ? section.subrentRows
            : Array.isArray(sectionInput.subrentRows)
              ? sectionInput.subrentRows
              : Array.isArray(sectionInput.subrentAssignments)
                ? sectionInput.subrentAssignments
                : Array.isArray(sectionState.subrentAssignments)
                  ? sectionState.subrentAssignments
                  : [];
    return list.map((row, index) => normalizeSubrentRow(row, index, { sourceMode: 'source' })).filter(Boolean);
  }

  function collectRows(root, source) {
    const scope = root || document;
    const sourceRows = normalizeSourceRows(source || {});
    const host = scope.querySelector('[data-packit-truss-subrent-bottom-host]') || document.querySelector('[data-packit-truss-subrent-bottom-host]');
    const domRoot = host || (scope.querySelector('[data-quote-truss-panel]') || scope);
    const domRows = domRoot && domRoot.querySelectorAll
      ? Array.from(domRoot.querySelectorAll('[data-truss-subrent-row], .v4-truss-subrent-row')).map(parseRow).filter(Boolean)
      : [];

    // Prefer live DOM because it contains the latest typed supplier/price values before autosave.
    const primary = domRows.length ? domRows : sourceRows;
    const byKey = new Map();
    primary.forEach(row => {
      const key = [row.itemId || row.code, row.supplierId || row.supplierName, row.qty, row.subrentPrice].join('|');
      byKey.set(key, row);
    });
    return Array.from(byKey.values());
  }

  function removeBridgeRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(row => {
      const src = toText(row && (row.sourceSystem || row.source_system));
      const metaSrc = toText(row && row.meta && row.meta.source);
      return src !== 'quote_truss_subrent_bottom' && metaSrc !== 'quote-truss-bottom-subrent-form';
    });
  }

  function toAssignment(row) {
    return {
      key: toText(row.itemId || row.code || row.trussPart),
      itemId: toText(row.itemId),
      code: toText(row.code),
      trussPart: toText(row.trussPart || 'subrent'),
      qty: nonNegative(row.qty, 0),
      supplierId: toText(row.supplierId),
      supplierName: toText(row.supplierName),
      subrentPrice: nonNegative(row.subrentPrice, 0),
      clientPrice: nonNegative(row.clientPrice, 0) || nonNegative(row.subrentPrice, 0),
      note: toText(row.note)
    };
  }

  function seedInputWithRows(input, rows) {
    const cleanRows = Array.isArray(rows) ? rows : [];
    const assignments = cleanRows.map(toAssignment);
    const nextInput = Object.assign({}, input || {}, {
      subrentRows: cleanRows,
      subrentAssignments: assignments
    });
    nextInput.state = Object.assign({}, nextInput.state || {}, { subrentAssignments: assignments });
    return nextInput;
  }

  function attachRowsToSection(section, rows) {
    if (!section) return section;
    const next = clone(section) || {};
    const cleanBomRows = removeBridgeRows(next.bomRows || []);
    const cleanItems = removeBridgeRows(next.items || []);
    const cleanRows = Array.isArray(rows) ? rows : [];
    const subrentTotal = cleanRows.reduce((sum, row) => sum + nonNegative(row.clientPrice || row.subrentPrice, 0) * nonNegative(row.qty, 0), 0);
    const previousSubrentTotal = nonNegative(next.subrentTotal, 0);

    // Keep constructor BOM clean. Subrent rows live in a separate section field.
    next.bomRows = cleanBomRows;
    next.items = Array.isArray(next.items) && next.items.length ? cleanItems : cleanBomRows.slice();
    next.subrentRows = cleanRows;
    next.subrentTotal = subrentTotal;
    next.subrentOverride = false;
    next.input = seedInputWithRows(next.input || {}, cleanRows);

    const baseSummary = toText(next.summary).replace(/\s*·\s*субаренда\s+\d+\s+поз\./i, '');
    next.summary = [baseSummary, cleanRows.length ? `субаренда ${cleanRows.length} поз.` : ''].filter(Boolean).join(' · ');
    next.rental = Math.max(0, nonNegative(next.rental, 0) - previousSubrentTotal) + subrentTotal;
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function attachRowsToDraft(draft, source) {
    const q = clone(draft || {}) || {};
    const sections = Object.assign({}, q.sections || {});
    if (!sections.truss) return draft;
    const rows = collectRows(document, source || sections.truss || q);
    sections.truss = attachRowsToSection(sections.truss, rows);
    const next = Object.assign({}, q, { sections });
    return ROOT.QuoteModel && ROOT.QuoteModel.createQuoteDraft ? ROOT.QuoteModel.createQuoteDraft(next) : next;
  }

  function activeTrussRows() {
    try {
      if (ROOT.QuoteDraftStorage && ROOT.QuoteDraftStorage.loadActiveDraft) {
        return normalizeSourceRows(ROOT.QuoteDraftStorage.loadActiveDraft({ hydrateBom:false }) || {});
      }
    } catch (_) {}
    return [];
  }

  function patchVisualRender() {
    const visual = ROOT.V4StructureVisualConfigurator;
    if (!visual || typeof visual.renderTrussConfigurator !== 'function') return false;
    if (visual.__packitTrussSubrentInputSeed) return true;
    const original = visual.renderTrussConfigurator.bind(visual);
    visual.renderTrussConfigurator = function patchedRenderTrussConfigurator(target, options) {
      const opts = Object.assign({}, options || {});
      if (opts.mode === 'quote') {
        const ownRows = normalizeSourceRows(opts.input || {});
        const rows = ownRows.length ? ownRows : activeTrussRows();
        if (rows.length) opts.input = seedInputWithRows(opts.input || {}, rows);
      }
      return original(target, opts);
    };
    visual.__packitTrussSubrentInputSeed = true;
    return true;
  }

  function patchBinder() {
    const binder = ROOT.QuoteSectionBinder;
    if (!binder || typeof binder.bindTrussSection !== 'function') return false;
    if (binder.__packitTrussSubrentSectionBridge) return true;
    const original = binder.bindTrussSection.bind(binder);
    binder.bindTrussSection = function patchedBindTrussSection(draft, source, overrides) {
      let next = original(draft, source, overrides);
      try { next = attachRowsToDraft(next, source || {}); }
      catch (err) { try { if (console && console.warn) console.warn('QuoteTrussSubrentSectionBridge bind skipped', err); } catch (_) {} }
      return next;
    };
    binder.__packitTrussSubrentSectionBridge = true;
    return true;
  }

  function patchStorage() {
    const storage = ROOT.QuoteDraftStorage;
    if (!storage || typeof storage.saveDraft !== 'function') return false;
    if (storage.__packitTrussSubrentSectionBridge) return true;
    const original = storage.saveDraft.bind(storage);
    storage.saveDraft = function patchedSaveDraft(draft, options) {
      let next = draft;
      try { next = attachRowsToDraft(draft, draft); }
      catch (err) { try { if (console && console.warn) console.warn('QuoteTrussSubrentSectionBridge save skipped', err); } catch (_) {} }
      return original(next, options || {});
    };
    storage.__packitTrussSubrentSectionBridge = true;
    return true;
  }

  function init() {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const okBinder = patchBinder();
      const okStorage = patchStorage();
      const okVisual = patchVisualRender();
      if ((okBinder && okStorage && okVisual) || tries > 60) return true;
      return false;
    };
    if (tick()) return;
    const timer = setInterval(() => { if (tick()) clearInterval(timer); }, 100);
  }

  ROOT.QuoteTrussSubrentSectionBridge = { VERSION, init, collectRows, attachRowsToSection, attachRowsToDraft, normalizeSourceRows, seedInputWithRows };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
