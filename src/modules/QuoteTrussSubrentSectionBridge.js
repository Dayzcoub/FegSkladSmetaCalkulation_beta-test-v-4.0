// PACK.IT — Quote Truss subrent section bridge.
// Logic bridge only: when the quote wizard binds the truss section, copy only FILLED
// bottom "Добор ферм" rows into sections.truss.subrentRows.
// Important: do NOT append these rows to sections.truss.bomRows, otherwise the truss
// step position table duplicates the constructor BOM. Final summary/subrent documents
// must read sections.truss.subrentRows separately.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.1.0-quote-truss-subrent-section-bridge-filled-only';

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
    const code = toText((small.split('·')[0] || '').trim()) || title;
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

  function parseRow(row, index) {
    const meta = parseMeta(row);
    const qtyField = findField(row, ['сколько', 'кол-во', 'количество']);
    const subrentPriceField = findField(row, ['субаренда/ед', 'субаренда', 'себест']);
    const clientPriceField = findField(row, ['клиент/ед', 'клиент', 'цена клиенту']);
    const qty = nonNegative(valueOfField(qtyField), 0);
    if (qty <= 0) return null;

    const supplier = selectedSupplier(row);
    const subrentPrice = nonNegative(valueOfField(subrentPriceField), 0);
    const clientPriceRaw = valueOfField(clientPriceField);
    const clientPrice = nonNegative(clientPriceRaw, subrentPrice || 0);

    // Critical contract: empty rows are deficit hints only. They must NOT go to final summary.
    // A row is filled only after the user chose a real subrentor and entered a positive price.
    if (!supplier.supplierName || subrentPrice <= 0) return null;

    const margin = Math.max(0, (clientPrice || 0) - (subrentPrice || 0)) * qty;
    const noteParts = [meta.note, `субаренда: ${supplier.supplierName}`];

    return {
      id: `quote-truss-subrent:${meta.code || index}:${supplier.supplierId || supplier.supplierName}:${index}`,
      itemId: '',
      code: meta.code || `TRUSS-SUBRENT-${index + 1}`,
      name: meta.title || 'Позиция субаренды ферм',
      qty,
      unit: 'шт',
      requestedQty: qty,
      sourceType: 'subrent',
      sourceSystem: 'quote_truss_subrent_bottom',
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      subrentQty: qty,
      deficitQty: qty,
      subrentPrice,
      clientPrice,
      rentalPrice: clientPrice || subrentPrice || 0,
      margin,
      weightKg: 0,
      powerW: 0,
      startupPowerW: 0,
      trussPart: 'subrent',
      uiHidden: true,
      hiddenFromSectionBom: true,
      note: noteParts.filter(Boolean).join('; '),
      meta: {
        bridgeVersion: VERSION,
        source: 'quote-truss-bottom-subrent-form',
        rowIndex: index,
        uiHidden: true
      }
    };
  }

  function collectRows(root) {
    const scope = root || document;
    const host = scope.querySelector('[data-packit-truss-subrent-bottom-host]') || document.querySelector('[data-packit-truss-subrent-bottom-host]');
    if (!host) return [];
    return Array.from(host.querySelectorAll('[data-truss-subrent-row], .v4-truss-subrent-row'))
      .map(parseRow)
      .filter(Boolean);
  }

  function removeBridgeRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(row => {
      const src = toText(row && (row.sourceSystem || row.source_system));
      const metaSrc = toText(row && row.meta && row.meta.source);
      return src !== 'quote_truss_subrent_bottom' && metaSrc !== 'quote-truss-bottom-subrent-form';
    });
  }

  function attachRowsToSection(section, rows) {
    if (!section) return section;
    const next = clone(section) || {};
    const cleanBomRows = removeBridgeRows(next.bomRows || []);
    const cleanItems = removeBridgeRows(next.items || []);
    const cleanRows = Array.isArray(rows) ? rows : [];
    const subrentTotal = cleanRows.reduce((sum, row) => sum + nonNegative(row.clientPrice || row.subrentPrice, 0) * nonNegative(row.qty, 0), 0);

    // Keep constructor BOM clean. Subrent rows live in a separate section field.
    next.bomRows = cleanBomRows;
    next.items = Array.isArray(next.items) && next.items.length ? cleanItems : cleanBomRows.slice();
    next.subrentRows = cleanRows;
    next.subrentTotal = subrentTotal;
    next.subrentOverride = false;

    const baseSummary = toText(next.summary).replace(/\s*·\s*субаренда\s+\d+\s+поз\./i, '');
    next.summary = [baseSummary, cleanRows.length ? `субаренда ${cleanRows.length} поз.` : ''].filter(Boolean).join(' · ');
    next.rental = nonNegative(next.rental, 0) + subrentTotal;
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function patchBinder() {
    const binder = ROOT.QuoteSectionBinder;
    if (!binder || typeof binder.bindTrussSection !== 'function') return false;
    if (binder.__packitTrussSubrentSectionBridge) return true;
    const original = binder.bindTrussSection.bind(binder);
    binder.bindTrussSection = function patchedBindTrussSection(draft, source, overrides) {
      let next = original(draft, source, overrides);
      try {
        if (!next || !next.sections || !next.sections.truss) return next;
        const rows = collectRows(document);
        const sections = Object.assign({}, next.sections || {});
        sections.truss = attachRowsToSection(sections.truss, rows);
        if (ROOT.QuoteModel && ROOT.QuoteModel.mergeQuotePatch) {
          next = ROOT.QuoteModel.mergeQuotePatch(next, { sections });
        } else {
          next = Object.assign({}, next, { sections });
        }
      } catch (err) {
        try { if (console && console.warn) console.warn('QuoteTrussSubrentSectionBridge skipped', err); } catch (_) {}
      }
      return next;
    };
    binder.__packitTrussSubrentSectionBridge = true;
    return true;
  }

  function init() {
    if (patchBinder()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (patchBinder() || tries > 40) clearInterval(timer);
    }, 100);
  }

  ROOT.QuoteTrussSubrentSectionBridge = { VERSION, init, collectRows, attachRowsToSection };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
