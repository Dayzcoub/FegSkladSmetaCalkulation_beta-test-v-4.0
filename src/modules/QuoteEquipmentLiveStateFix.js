(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function text(value) { return String(value == null ? '' : value).trim(); }
  function num(value) {
    const cleaned = typeof value === 'string' ? value.replace(/[^0-9.,-]/g, '').replace(',', '.') : value;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  function qty(value) {
    const n = num(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  function getItems() {
    try {
      const db = ROOT.EquipmentDatabase;
      return db && db.getStoredItemsOrDemo ? db.getStoredItemsOrDemo() : [];
    } catch (_) {
      return [];
    }
  }

  function getItemById(id) {
    const safeId = text(id);
    return getItems().find(item => item && item.id === safeId) || null;
  }

  function getRowStatus(rowEl) {
    const item = getItemById(rowEl.getAttribute('data-packit-row'));
    const requested = Math.max(0, num(rowEl.querySelector('[data-packit-row-qty]') && rowEl.querySelector('[data-packit-row-qty]').value));
    const available = Math.max(0, num(item && (item.availableQty == null ? item.stockQty : item.availableQty)));
    const stock = Math.min(requested, available);
    const deficit = Math.max(0, requested - available);
    return { item, requested, available, stock, deficit, subrent: deficit };
  }

  function updateVisibleRow(rowEl) {
    const status = getRowStatus(rowEl);
    const stats = rowEl.querySelectorAll('.packit-equipment-stat');
    if (stats[0]) {
      const b = stats[0].querySelector('b');
      if (b) b.textContent = qty(status.stock);
    }
    if (stats[1]) {
      const b = stats[1].querySelector('b');
      if (b) b.textContent = qty(status.deficit);
      stats[1].classList.toggle('bad', status.deficit > 0);
      stats[1].classList.toggle('muted', status.deficit <= 0);
    }
    if (stats[2]) {
      const b = stats[2].querySelector('b');
      if (b) b.textContent = qty(status.subrent);
      stats[2].classList.toggle('warn', status.subrent > 0);
      stats[2].classList.toggle('muted', status.subrent <= 0);
    }
    const source = rowEl.querySelector('.packit-equipment-source b');
    if (source) source.textContent = status.deficit > 0 ? 'склад + субаренда' : 'склад';
    const subrentQty = rowEl.querySelector('[data-packit-subrent-qty]');
    if (subrentQty) subrentQty.value = qty(status.subrent);
  }

  function updateSummary(panel) {
    const summary = panel.querySelector(':scope > .v4-summary-grid') || panel.querySelector('.v4-summary-grid');
    if (!summary) return;

    let stockQty = 0;
    let stockRows = 0;
    let deficitQty = 0;
    let deficitRows = 0;
    let subrentQty = 0;
    let subrentRows = 0;

    panel.querySelectorAll('[data-packit-row]').forEach(rowEl => {
      const status = getRowStatus(rowEl);
      if (!status.item || status.requested <= 0) return;
      stockQty += status.stock;
      if (status.stock > 0) stockRows += 1;
      deficitQty += status.deficit;
      subrentQty += status.subrent;
      if (status.deficit > 0) deficitRows += 1;
      if (status.subrent > 0) subrentRows += 1;
      updateVisibleRow(rowEl);
    });

    const manualRows = panel.querySelectorAll('[data-packit-manual-row-visible]').length;
    summary.innerHTML = `<div class="packit-live-summary-card ok"><b>${qty(stockQty)}</b><span>складом · ${qty(stockRows)} поз.</span></div>
      <div class="packit-live-summary-card bad"><b>${qty(deficitQty)}</b><span>дефицит · ${qty(deficitRows)} поз.</span></div>
      <div class="packit-live-summary-card warn"><b>${qty(subrentQty)}</b><span>субаренда · ${qty(subrentRows)} поз.</span></div>
      ${manualRows ? `<div class="packit-live-summary-card"><b>${qty(manualRows)}</b><span>ручные позиции</span></div>` : ''}`;
  }

  function forceCompact(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;
    scope.querySelectorAll('[data-quote-equipment-panel]').forEach(panel => {
      const hasCompact = Boolean(panel.querySelector('[data-packit-equipment-compact-root]'));
      const hasLegacyVisible = Boolean(panel.querySelector(':scope > .v4-equipment-group:not(.packit-equipment-legacy-hidden)'));
      if (!hasCompact || hasLegacyVisible) {
        panel.dataset.packitCompactEquipmentReady = '';
        if (ROOT.QuoteEquipmentUiController && ROOT.QuoteEquipmentUiController.enhance) {
          ROOT.QuoteEquipmentUiController.enhance(panel.parentNode || panel);
        }
      }
      updateSummary(panel);
    });
  }

  function wrapWizard() {
    const wizard = ROOT.QuoteWizard;
    if (!wizard || !wizard.renderWizardMap || wizard.__packitEquipmentLiveFixWrapped) return false;
    const original = wizard.renderWizardMap.bind(wizard);
    wizard.renderWizardMap = function packitLiveFixRender(target, draft) {
      const result = original(target, draft);
      const targetRoot = result || (typeof target === 'string' ? GLOBAL.document.getElementById(target) : target);
      const run = () => forceCompact(targetRoot || GLOBAL.document);
      if (GLOBAL.requestAnimationFrame) GLOBAL.requestAnimationFrame(run);
      else GLOBAL.setTimeout(run, 0);
      return result;
    };
    wizard.__packitEquipmentLiveFixWrapped = true;
    return true;
  }

  function bindLiveEvents() {
    if (!GLOBAL.document || GLOBAL.document.__packitEquipmentLiveFixBound) return;
    GLOBAL.document.__packitEquipmentLiveFixBound = true;
    const handler = event => {
      if (!event.target || !event.target.closest) return;
      const panel = event.target.closest('[data-quote-equipment-panel]');
      if (!panel) return;
      if (event.target.matches('[data-packit-row-qty], [data-packit-subrent-supplier], [data-packit-subrent-price], [data-packit-client-price]')) {
        updateSummary(panel);
      }
    };
    GLOBAL.document.addEventListener('input', handler, true);
    GLOBAL.document.addEventListener('change', handler, true);
    GLOBAL.document.addEventListener('click', event => {
      const panel = event.target && event.target.closest ? event.target.closest('[data-quote-equipment-panel]') : null;
      if (panel) GLOBAL.setTimeout(() => updateSummary(panel), 0);
    }, true);
  }

  function init() {
    wrapWizard();
    bindLiveEvents();
    forceCompact(GLOBAL.document);
  }

  ROOT.QuoteEquipmentLiveStateFix = { version: '1.0.0', init, updateSummary, forceCompact };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  GLOBAL.setTimeout(init, 300);
})();
