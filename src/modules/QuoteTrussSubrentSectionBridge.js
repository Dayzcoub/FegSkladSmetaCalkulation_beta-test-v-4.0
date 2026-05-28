// PACK.IT — Quote Truss subrent section bridge.
// Logic bridge only: when the quote wizard binds the truss section, copy the bottom
// "Добор ферм" rows into sections.truss.bomRows as sourceType=subrent so final
// summary, warehouse deficit/subrent lists and documents can see them.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.0.0-quote-truss-subrent-section-bridge';

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
    return {
      supplierId: toText(select.value),
      supplierName: toText(option && option.textContent) || toText(select.value)
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
    const margin = Math.max(0, (clientPrice || 0) - (subrentPrice || 0)) * qty;
    const noteParts = [meta.note];
    if (supplier.supplierName) noteParts.push(`субаренда: ${supplier.supplierName}`);

    return {
      id: `quote-truss-subrent:${meta.code || index}:${index}`,
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
      note: noteParts.filter(Boolean).join('; '),
      meta: {
        bridgeVersion: VERSION,
        source: 'quote-truss-bottom-subrent-form',
        rowIndex: index
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
    if (!section || !Array.isArray(rows) || !rows.length) return section;
    const next = clone(section) || {};
    const ownRows = removeBridgeRows(next.bomRows || []);
    const subrentTotal = rows.reduce((sum, row) => sum + nonNegative(row.clientPrice || row.subrentPrice, 0) * nonNegative(row.qty, 0), 0);
    next.bomRows = ownRows.concat(rows);
    next.items = Array.isArray(next.items) && next.items.length ? next.items : next.bomRows.slice();
    next.subrentRows = rows;
    next.subrentTotal = subrentTotal;
    next.subrentOverride = false;
    next.summary = [toText(next.summary), rows.length ? `субаренда ${rows.length} поз.` : ''].filter(Boolean).join(' · ');
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
        const rows = collectRows(document);
        if (!rows.length || !next || !next.sections || !next.sections.truss) return next;
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
