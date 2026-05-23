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

  function getManualKey(row) {
    return [
      text(row && row.name).toLowerCase(),
      qty(row && row.qty),
      qty(row && (row.clientPrice || row.rentalPrice || row.subrentPrice)),
      text(row && row.unit).toLowerCase()
    ].join('|');
  }

  function cleanupManualDuplicates(panel) {
    if (!panel) return;

    if (panel.__packitEquipmentState && Array.isArray(panel.__packitEquipmentState.manualRows)) {
      const seen = new Set();
      panel.__packitEquipmentState.manualRows = panel.__packitEquipmentState.manualRows.filter(row => {
        const key = getManualKey(row);
        if (!text(row && row.name)) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const seenDom = new Set();
    panel.querySelectorAll('[data-packit-manual-row-visible]').forEach(rowEl => {
      const name = text(rowEl.querySelector('.packit-equipment-name b') && rowEl.querySelector('.packit-equipment-name b').textContent).toLowerCase();
      const amount = text(rowEl.querySelector('.packit-equipment-stat b') && rowEl.querySelector('.packit-equipment-stat b').textContent);
      const price = text(rowEl.querySelector('.packit-equipment-price b') && rowEl.querySelector('.packit-equipment-price b').textContent);
      const key = [name, amount, price].join('|');
      if (!name || seenDom.has(key)) rowEl.remove();
      else seenDom.add(key);
    });

    const state = panel.querySelector('[data-packit-equipment-state]');
    if (state) {
      const seenHidden = new Set();
      state.querySelectorAll('[data-quote-equipment-manual-row]').forEach(rowEl => {
        const nameInput = rowEl.querySelector('[data-quote-equipment-manual-field="name"]');
        const qtyInput = rowEl.querySelector('[data-quote-equipment-manual-field="qty"]');
        const priceInput = rowEl.querySelector('[data-quote-equipment-manual-field="clientPrice"]');
        const key = [text(nameInput && nameInput.value).toLowerCase(), qty(qtyInput && qtyInput.value), qty(priceInput && priceInput.value)].join('|');
        if (!text(nameInput && nameInput.value) || seenHidden.has(key)) rowEl.remove();
        else seenHidden.add(key);
      });
    }
  }

  function updateSummary(panel) {
    if (!panel) return;
    cleanupManualDuplicates(panel);

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

  function updateAll() {
    if (!GLOBAL.document) return;
    GLOBAL.document.querySelectorAll('[data-quote-equipment-panel]').forEach(updateSummary);
  }

  function scheduleUpdate(panel) {
    if (!panel) return;
    updateSummary(panel);
    GLOBAL.setTimeout(() => updateSummary(panel), 80);
    GLOBAL.setTimeout(() => updateSummary(panel), 420);
    GLOBAL.setTimeout(() => updateSummary(panel), 900);
  }

  function closeSearchMenus(exceptWrap) {
    if (!GLOBAL.document) return;
    GLOBAL.document.querySelectorAll('[data-packit-eq-menu]').forEach(menu => {
      if (exceptWrap && exceptWrap.contains(menu)) return;
      menu.hidden = true;
    });
  }

  function clearSearchSelection(input) {
    const wrap = input && input.closest ? input.closest('.packit-equipment-search-wrap') : null;
    const menu = wrap && wrap.querySelector('[data-packit-eq-menu]');
    if (menu) menu.hidden = true;
  }

  function bindSearchCloseEvents() {
    if (!GLOBAL.document || GLOBAL.document.__packitEquipmentSearchCloseBound) return;
    GLOBAL.document.__packitEquipmentSearchCloseBound = true;

    GLOBAL.document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSearchMenus();
        const active = GLOBAL.document.activeElement;
        if (active && active.matches && active.matches('[data-packit-eq-search]')) active.blur();
      }
    }, true);

    GLOBAL.document.addEventListener('pointerdown', event => {
      const wrap = event.target && event.target.closest ? event.target.closest('.packit-equipment-search-wrap') : null;
      if (!wrap) closeSearchMenus();
    }, true);

    GLOBAL.document.addEventListener('focusin', event => {
      const wrap = event.target && event.target.closest ? event.target.closest('.packit-equipment-search-wrap') : null;
      if (!wrap) closeSearchMenus();
    }, true);

    GLOBAL.document.addEventListener('change', event => {
      if (event.target && event.target.matches && event.target.matches('[data-packit-eq-category]')) {
        closeSearchMenus();
      }
    }, true);

    GLOBAL.document.addEventListener('blur', event => {
      if (event.target && event.target.matches && event.target.matches('[data-packit-eq-search]')) {
        GLOBAL.setTimeout(() => clearSearchSelection(event.target), 120);
      }
    }, true);
  }

  function bindLiveEvents() {
    if (!GLOBAL.document || GLOBAL.document.__packitEquipmentSafeLiveFixBound) return;
    GLOBAL.document.__packitEquipmentSafeLiveFixBound = true;
    const handler = event => {
      if (!event.target || !event.target.closest) return;
      const panel = event.target.closest('[data-quote-equipment-panel]');
      if (!panel) return;
      if (event.target.matches('[data-packit-row-qty], [data-packit-subrent-supplier], [data-packit-subrent-price], [data-packit-client-price]')) {
        scheduleUpdate(panel);
      }
    };
    GLOBAL.document.addEventListener('input', handler, true);
    GLOBAL.document.addEventListener('change', handler, true);
    GLOBAL.document.addEventListener('click', event => {
      const panel = event.target && event.target.closest ? event.target.closest('[data-quote-equipment-panel]') : null;
      if (panel) GLOBAL.setTimeout(() => scheduleUpdate(panel), 0);
    }, true);
  }

  function init() {
    bindLiveEvents();
    bindSearchCloseEvents();
    updateAll();
    GLOBAL.setTimeout(updateAll, 300);
    GLOBAL.setTimeout(updateAll, 900);
  }

  ROOT.QuoteEquipmentLiveStateFix = { version: '1.2.0-safe-dropdown-summary', init, updateSummary, cleanupManualDuplicates, closeSearchMenus };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
