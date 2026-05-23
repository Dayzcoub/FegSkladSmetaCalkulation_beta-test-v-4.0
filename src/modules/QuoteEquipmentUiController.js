(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function hasManualContent(list) {
    if (!list) return false;
    const rows = Array.from(list.querySelectorAll('[data-quote-equipment-manual-row]'));
    return rows.some(row => {
      if (row.classList.contains('is-empty')) return false;
      const name = row.querySelector('[data-quote-equipment-manual-field="name"]');
      const qty = row.querySelector('[data-quote-equipment-manual-field="qty"]');
      return String(name && name.value || '').trim() || Number(qty && qty.value || 0) > 0;
    });
  }

  function setManualOpen(panel, open) {
    panel.dataset.packitManualOpen = open ? 'true' : 'false';
    const checkbox = panel.querySelector('[data-packit-equipment-manual-checkbox]');
    if (checkbox) checkbox.checked = Boolean(open);
  }

  function ensureManualToggle(panel) {
    const manualList = panel.querySelector('.v4-manual-equipment-list');
    if (!manualList) return;
    const manualKicker = manualList.previousElementSibling && manualList.previousElementSibling.classList && manualList.previousElementSibling.classList.contains('v4-kicker')
      ? manualList.previousElementSibling
      : null;
    if (manualKicker) manualKicker.textContent = 'Ручная позиция без базы';

    let card = panel.querySelector('[data-packit-equipment-manual-toggle]');
    if (!card) {
      card = GLOBAL.document.createElement('div');
      card.className = 'v4-equipment-manual-toggle-card';
      card.setAttribute('data-packit-equipment-manual-toggle', 'true');
      card.innerHTML = '<div class="v4-equipment-manual-toggle-copy"><b>Ручная позиция без базы</b><span>Скрыто по умолчанию. Используй только если позиции нет в базе или нет доступа быстро добавить её в каталог. Обычный дефицит склада закрывается субарендой внутри складской строки.</span></div><label class="v4-equipment-manual-toggle-check"><input type="checkbox" data-packit-equipment-manual-checkbox> показать ручные</label>';
      const anchor = manualKicker || manualList;
      anchor.parentNode.insertBefore(card, anchor);
      const checkbox = card.querySelector('[data-packit-equipment-manual-checkbox]');
      checkbox.addEventListener('change', () => setManualOpen(panel, checkbox.checked));
    }

    const shouldOpen = panel.dataset.packitManualOpen === 'true' || hasManualContent(manualList);
    setManualOpen(panel, shouldOpen);
  }

  function tagEquipmentZones(panel) {
    if (!panel) return;
    panel.classList.add('v4-equipment-panel--structured');
    const groups = panel.querySelectorAll(':scope > .v4-equipment-group');
    groups.forEach(group => group.setAttribute('data-packit-equipment-zone', 'stock'));
    const summary = panel.querySelector(':scope > .v4-summary-grid');
    if (summary) summary.setAttribute('data-packit-equipment-zone', 'summary');
    const basket = panel.querySelector(':scope > .v4-equipment-basket, :scope > .v4-note:nth-child(3)');
    if (basket) basket.setAttribute('data-packit-equipment-zone', 'basket');
    const compact = panel.querySelector(':scope > .v4-equipment-compact-list');
    if (compact) compact.setAttribute('data-packit-equipment-zone', 'selected');
    ensureManualToggle(panel);
  }

  function enhance(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;
    scope.querySelectorAll('[data-quote-equipment-panel]').forEach(tagEquipmentZones);
  }

  function wrapQuoteWizardRender() {
    const wizard = ROOT.QuoteWizard;
    if (!wizard || !wizard.renderWizardMap || wizard.__packitEquipmentUiWrapped) return false;
    const original = wizard.renderWizardMap.bind(wizard);
    wizard.renderWizardMap = function wrappedRenderWizardMap(target, draft) {
      const result = original(target, draft);
      const targetRoot = result || (typeof target === 'string' ? GLOBAL.document.getElementById(target) : target);
      GLOBAL.requestAnimationFrame ? GLOBAL.requestAnimationFrame(() => enhance(targetRoot)) : GLOBAL.setTimeout(() => enhance(targetRoot), 0);
      return result;
    };
    wizard.__packitEquipmentUiWrapped = true;
    return true;
  }

  function init() {
    wrapQuoteWizardRender();
    enhance(GLOBAL.document);
  }

  ROOT.QuoteEquipmentUiController = {
    version: '1.0.0',
    init,
    enhance,
    setManualOpen
  };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') {
    GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  GLOBAL.setTimeout(init, 250);
})();
