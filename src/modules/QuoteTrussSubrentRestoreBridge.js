// PACK.IT — Quote Truss subrent restore bridge.
// UI state bridge only: restores saved bottom "Добор ферм" values after quote truss rerender.
// Does not change calculations, warehouse, reservations, backend writes or constructor BOM.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.0.0-quote-truss-subrent-restore-bridge';
  let raf = 0;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function num(value, fallback) {
    const n = Number(String(value == null ? '' : value).replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function activeDraft() {
    try {
      if (ROOT.QuoteDraftStorage && ROOT.QuoteDraftStorage.loadActiveDraft) {
        return ROOT.QuoteDraftStorage.loadActiveDraft({ hydrateBom:false }) || null;
      }
    } catch (_) {}
    return null;
  }

  function savedRows() {
    const draft = activeDraft();
    const truss = draft && draft.sections && draft.sections.truss || null;
    const input = truss && truss.input || {};
    const state = input && input.state || {};
    const rows = Array.isArray(truss && truss.subrentRows) ? truss.subrentRows
      : Array.isArray(input.subrentRows) ? input.subrentRows
        : Array.isArray(input.subrentAssignments) ? input.subrentAssignments
          : Array.isArray(state.subrentAssignments) ? state.subrentAssignments
            : [];
    return rows.filter(row => row && num(row.qty == null ? row.subrentQty : row.qty, 0) > 0 && text(row.supplierName || row.supplier_name) && num(row.subrentPrice == null ? row.subrent_price : row.subrentPrice, 0) > 0);
  }

  function rowKeys(row) {
    return [row.key, row.itemId, row.item_id, row.code, row.sku, row.trussPart, row.truss_part, row.id]
      .map(text)
      .filter(Boolean);
  }

  function domMeta(row) {
    const meta = row && (row.querySelector('.v4-truss-subrent-meta') || row);
    const title = text(meta && meta.querySelector && (meta.querySelector('b, strong') || {}).textContent);
    const small = text(meta && meta.querySelector && (meta.querySelector('small') || {}).textContent);
    const codeFromSmall = text((small.split('·')[0] || '').trim());
    return { title, small, codeFromSmall };
  }

  function domKeys(row) {
    const meta = domMeta(row);
    return [
      row && row.getAttribute('data-truss-subrent-row'),
      row && row.getAttribute('data-truss-subrent-item-id'),
      row && row.getAttribute('data-truss-subrent-code'),
      row && row.getAttribute('data-truss-subrent-part'),
      meta.codeFromSmall,
      meta.title
    ].map(text).filter(Boolean);
  }

  function buildMap(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      rowKeys(row).forEach(key => {
        if (!map.has(key)) map.set(key, row);
      });
    });
    return map;
  }

  function setValue(input, value) {
    if (!input) return false;
    const next = text(value);
    if (text(input.value) === next) return false;
    input.value = next;
    return true;
  }

  function ensureOption(select, id, name) {
    if (!select) return false;
    const value = text(id || name);
    const label = text(name || id);
    if (!value) return false;
    const exists = Array.from(select.options || []).some(option => String(option.value) === value);
    if (!exists) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label || value;
      select.appendChild(option);
    }
    if (String(select.value) === value) return false;
    select.value = value;
    return true;
  }

  function restore() {
    const rows = savedRows();
    if (!rows.length) return false;
    const map = buildMap(rows);
    let changed = false;
    document.querySelectorAll('[data-truss-subrent-row], .v4-truss-subrent-row').forEach(domRow => {
      const saved = domKeys(domRow).map(key => map.get(key)).find(Boolean);
      if (!saved) return;
      const supplierId = text(saved.supplierId || saved.supplier_id || saved.supplierName || saved.supplier_name);
      const supplierName = text(saved.supplierName || saved.supplier_name || supplierId);
      changed = setValue(domRow.querySelector('[data-truss-subrent-field="qty"]'), saved.qty == null ? saved.subrentQty : saved.qty) || changed;
      changed = ensureOption(domRow.querySelector('[data-truss-subrent-field="supplierId"]'), supplierId, supplierName) || changed;
      changed = setValue(domRow.querySelector('[data-truss-subrent-field="supplierName"]'), supplierName) || changed;
      changed = setValue(domRow.querySelector('[data-truss-subrent-field="subrentPrice"]'), saved.subrentPrice == null ? saved.subrent_price : saved.subrentPrice) || changed;
      changed = setValue(domRow.querySelector('[data-truss-subrent-field="clientPrice"]'), saved.clientPrice == null ? (saved.client_price == null ? saved.subrentPrice : saved.client_price) : saved.clientPrice) || changed;
    });
    if (changed) {
      document.querySelectorAll('[data-quote-structure-visual="truss"]').forEach(panel => {
        try {
          if (ROOT.V4StructureVisualConfigurator && ROOT.V4StructureVisualConfigurator.readTrussInput) ROOT.V4StructureVisualConfigurator.readTrussInput(panel);
        } catch (_) {}
      });
    }
    return changed;
  }

  function schedule() {
    if (raf) return;
    raf = GLOBAL.requestAnimationFrame ? GLOBAL.requestAnimationFrame(() => { raf = 0; restore(); }) : GLOBAL.setTimeout(() => { raf = 0; restore(); }, 32);
  }

  function init() {
    if (!document.body || document.body.__packitTrussSubrentRestoreBridge) return;
    document.body.__packitTrussSubrentRestoreBridge = true;
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => Array.from(m.addedNodes || []).some(node => node && node.querySelector && (node.matches && node.matches('[data-truss-subrent-row], .v4-truss-subrent-row') || node.querySelector('[data-truss-subrent-row], .v4-truss-subrent-row'))))) schedule();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    ['click', 'change', 'input'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('[data-quote-truss-panel], [data-packit-truss-subrent-bottom-host], [data-quote-step-target], [data-quote-prev], [data-quote-next]')) {
        GLOBAL.setTimeout(schedule, 0);
        GLOBAL.setTimeout(schedule, 120);
        GLOBAL.setTimeout(schedule, 500);
      }
    }, true));
    GLOBAL.setTimeout(schedule, 120);
    GLOBAL.setTimeout(schedule, 600);
    GLOBAL.setTimeout(schedule, 1400);
  }

  ROOT.QuoteTrussSubrentRestoreBridge = { VERSION, init, restore };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
