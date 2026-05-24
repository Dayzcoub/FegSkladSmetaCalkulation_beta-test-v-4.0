(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const FALLBACK_CATEGORY_BY_SCOPE = Object.freeze({
    sound: Object.freeze(['sound_pa', 'consoles', 'monitoring', 'commutation']),
    light: Object.freeze(['light', 'commutation']),
    backline: Object.freeze(['backline', 'commutation']),
    services: Object.freeze(['services'])
  });

  function text(value) { return String(value == null ? '' : value).trim(); }

  function categoryByScope() {
    return (ROOT.QuoteEquipmentPicker && ROOT.QuoteEquipmentPicker.CATEGORY_BY_SCOPE) || FALLBACK_CATEGORY_BY_SCOPE;
  }

  function scopeFromLabel(label) {
    const value = text(label).toLowerCase();
    if (value.includes('звук')) return 'sound';
    if (value.includes('свет')) return 'light';
    if (value.includes('бэк') || value.includes('back')) return 'backline';
    if (value.includes('услуг')) return 'services';
    return '';
  }

  function scopeLabel(scopeKey) {
    return ({ sound: 'Звук', light: 'Свет', backline: 'Бэклайн', services: 'Услуги' })[scopeKey] || 'Все разделы';
  }

  function allowedCategorySet(scopeKey) {
    const rows = categoryByScope()[scopeKey] || [];
    return new Set(rows);
  }

  function getItems() {
    try {
      const db = ROOT.EquipmentDatabase;
      return db && db.getStoredItemsOrDemo ? db.getStoredItemsOrDemo() : [];
    } catch (_) {
      return [];
    }
  }

  function findItem(itemId) {
    const id = text(itemId);
    if (!id) return null;
    return getItems().find(item => item && item.id === id) || null;
  }

  function getPanel(node) {
    return node && node.closest ? node.closest('[data-quote-equipment-panel]') : null;
  }

  function updateBadgeState(panel) {
    if (!panel) return;
    const activeScope = text(panel.dataset.packitEquipmentScopeFilter);
    panel.querySelectorAll(':scope > .v4-equipment-scope-badges .v4-badge').forEach(badge => {
      const scopeKey = scopeFromLabel(badge.textContent);
      if (!scopeKey) return;
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('data-packit-equipment-scope-tab', scopeKey);
      badge.setAttribute('aria-pressed', activeScope === scopeKey ? 'true' : 'false');
      badge.removeAttribute('title');
      badge.classList.toggle('is-active', activeScope === scopeKey);
    });
  }

  function filterMenu(panel) {
    if (!panel) return;
    const activeScope = text(panel.dataset.packitEquipmentScopeFilter);
    const menu = panel.querySelector('[data-packit-eq-menu]');
    if (!menu) return;

    if (!activeScope) {
      menu.querySelectorAll('[data-packit-suggest]').forEach(button => { button.hidden = false; });
      const empty = menu.querySelector('[data-packit-scope-empty]');
      if (empty) empty.hidden = true;
      return;
    }

    const allowed = allowedCategorySet(activeScope);
    if (!allowed.size) return;

    let visibleCount = 0;
    menu.querySelectorAll('[data-packit-suggest]').forEach(button => {
      const item = findItem(button.getAttribute('data-packit-suggest'));
      const ok = item && allowed.has(item.category);
      button.hidden = !ok;
      if (ok) visibleCount += 1;
    });

    let empty = menu.querySelector('[data-packit-scope-empty]');
    if (!visibleCount && !menu.hidden) {
      if (!empty) {
        empty = GLOBAL.document.createElement('div');
        empty.className = 'packit-equipment-no-results';
        empty.setAttribute('data-packit-scope-empty', 'true');
        menu.appendChild(empty);
      }
      empty.textContent = `Нет позиций в разделе «${scopeLabel(activeScope)}»`;
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  function bindMenuObserver(panel) {
    if (!panel || panel.__packitScopeMenuObserverBound) return;
    const menu = panel.querySelector('[data-packit-eq-menu]');
    if (!menu || typeof MutationObserver === 'undefined') return;
    panel.__packitScopeMenuObserverBound = true;
    const observer = new MutationObserver(() => {
      GLOBAL.setTimeout(() => filterMenu(panel), 0);
    });
    observer.observe(menu, { childList: true, subtree: true });
    panel.__packitScopeMenuObserver = observer;
  }

  function refreshSearch(panel) {
    if (!panel) return;
    const search = panel.querySelector('[data-packit-eq-search]');
    const category = panel.querySelector('[data-packit-eq-category]');
    const activeScope = text(panel.dataset.packitEquipmentScopeFilter);

    bindMenuObserver(panel);
    if (category && activeScope) category.value = '';
    if (search) {
      search.placeholder = activeScope ? `Поиск: ${scopeLabel(activeScope)}...` : 'Shure, SM58, BKL...';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    GLOBAL.setTimeout(() => filterMenu(panel), 0);
    GLOBAL.setTimeout(() => filterMenu(panel), 30);
    GLOBAL.setTimeout(() => filterMenu(panel), 120);
  }

  function setActiveScope(panel, scopeKey) {
    if (!panel || !scopeKey) return;
    const current = text(panel.dataset.packitEquipmentScopeFilter);
    panel.dataset.packitEquipmentScopeFilter = current === scopeKey ? '' : scopeKey;
    updateBadgeState(panel);
    refreshSearch(panel);
  }

  function clearScopeForManualCategory(panel) {
    if (!panel) return;
    if (!text(panel.dataset.packitEquipmentScopeFilter)) return;
    panel.dataset.packitEquipmentScopeFilter = '';
    updateBadgeState(panel);
    refreshSearch(panel);
  }

  function bindGlobalEvents() {
    if (!GLOBAL.document || GLOBAL.document.__packitEquipmentScopeTabsBound) return;
    GLOBAL.document.__packitEquipmentScopeTabsBound = true;

    GLOBAL.document.addEventListener('click', event => {
      const badge = event.target && event.target.closest ? event.target.closest('[data-packit-equipment-scope-tab], .v4-equipment-scope-badges .v4-badge') : null;
      const panel = getPanel(badge);
      if (!badge || !panel) return;
      const scopeKey = badge.getAttribute('data-packit-equipment-scope-tab') || scopeFromLabel(badge.textContent);
      if (!scopeKey) return;
      event.preventDefault();
      setActiveScope(panel, scopeKey);
    }, true);

    GLOBAL.document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const badge = event.target && event.target.closest ? event.target.closest('[data-packit-equipment-scope-tab]') : null;
      const panel = getPanel(badge);
      if (!badge || !panel) return;
      event.preventDefault();
      setActiveScope(panel, badge.getAttribute('data-packit-equipment-scope-tab'));
    }, true);

    GLOBAL.document.addEventListener('input', event => {
      const panel = getPanel(event.target);
      if (panel && event.target.matches && event.target.matches('[data-packit-eq-search]')) {
        bindMenuObserver(panel);
        GLOBAL.setTimeout(() => filterMenu(panel), 0);
        GLOBAL.setTimeout(() => filterMenu(panel), 30);
      }
    }, true);

    GLOBAL.document.addEventListener('focusin', event => {
      const panel = getPanel(event.target);
      if (panel && event.target.matches && event.target.matches('[data-packit-eq-search]')) {
        bindMenuObserver(panel);
        GLOBAL.setTimeout(() => filterMenu(panel), 0);
        GLOBAL.setTimeout(() => filterMenu(panel), 30);
      }
    }, true);

    GLOBAL.document.addEventListener('change', event => {
      const panel = getPanel(event.target);
      if (panel && event.target.matches && event.target.matches('[data-packit-eq-category]')) clearScopeForManualCategory(panel);
    }, true);
  }

  function enhance(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;
    scope.querySelectorAll('[data-quote-equipment-panel]').forEach(panel => {
      updateBadgeState(panel);
      bindMenuObserver(panel);
      GLOBAL.setTimeout(() => filterMenu(panel), 0);
    });
  }

  function init() {
    bindGlobalEvents();
    enhance(GLOBAL.document);
    GLOBAL.setTimeout(() => enhance(GLOBAL.document), 0);
    GLOBAL.setTimeout(() => enhance(GLOBAL.document), 300);
  }

  ROOT.QuoteEquipmentScopeTabs = { version: '1.1.1-no-native-tooltip', init, enhance, filterMenu };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
