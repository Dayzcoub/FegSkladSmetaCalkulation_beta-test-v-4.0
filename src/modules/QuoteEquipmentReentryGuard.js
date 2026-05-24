(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  let burstTimer = 0;

  function hasVisibleLegacy(panel) {
    if (!panel) return false;
    return Boolean(panel.querySelector(':scope > .v4-equipment-group:not(.packit-equipment-legacy-hidden), :scope > .v4-manual-equipment-list:not(.packit-equipment-legacy-hidden), :scope > .v4-equipment-compact-list:not(.packit-equipment-legacy-hidden)'));
  }

  function needsCompact(panel) {
    if (!panel) return false;
    return !panel.querySelector('[data-packit-equipment-compact-root]') || hasVisibleLegacy(panel);
  }

  function updateSummary(panel) {
    try {
      if (ROOT.QuoteEquipmentLiveStateFix && ROOT.QuoteEquipmentLiveStateFix.updateSummary) {
        ROOT.QuoteEquipmentLiveStateFix.updateSummary(panel);
      }
    } catch (_) {}
  }

  function normalizeWizardFooterContract(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;

    scope.querySelectorAll('[data-quote-form]').forEach(form => {
      const activeStep = form.getAttribute('data-quote-active-step') || '';
      const nav = form.querySelector('.v4-wizard-nav');
      if (!nav) return;

      const back = nav.querySelector('[data-quote-prev]');
      const save = nav.querySelector('[data-quote-save]');
      const next = nav.querySelector('[data-quote-next]');
      const startGroup = back && back.closest('.v4-wizard-nav-group');
      const endGroup = (save || next) && (save || next).closest('.v4-wizard-nav-group');

      nav.classList.add('v4-wizard-nav--contract');
      if (startGroup) startGroup.classList.add('v4-wizard-nav-group--start');
      if (endGroup) endGroup.classList.add('v4-wizard-nav-group--end');
      if (back) back.classList.add('v4-wizard-back-btn');
      if (save) save.classList.add('v4-wizard-action-btn');
      if (next) next.classList.add('v4-wizard-next-btn');

      if (activeStep === 'client' && save) {
        save.textContent = 'Сохранить клиент и проект';
        save.setAttribute('data-quote-client-action', 'true');
      }
    });
  }

  function apply() {
    if (!GLOBAL.document) return;
    normalizeWizardFooterContract(GLOBAL.document);

    const controller = ROOT.QuoteEquipmentUiController;
    if (!controller || !controller.enhance) return;

    GLOBAL.document.querySelectorAll('[data-quote-equipment-panel]').forEach(panel => {
      if (needsCompact(panel)) {
        panel.dataset.packitCompactEquipmentReady = '';
        try { controller.enhance(panel.parentNode || panel); } catch (_) {}
      }
      updateSummary(panel);
    });
  }

  function burst() {
    apply();
    GLOBAL.setTimeout(apply, 16);
    GLOBAL.setTimeout(apply, 80);
    GLOBAL.setTimeout(apply, 180);
    GLOBAL.setTimeout(apply, 420);
    GLOBAL.setTimeout(apply, 900);
  }

  function startBurstWindow() {
    if (burstTimer) GLOBAL.clearInterval(burstTimer);
    const stopAt = Date.now() + 5000;
    burst();
    burstTimer = GLOBAL.setInterval(() => {
      apply();
      if (Date.now() > stopAt) {
        GLOBAL.clearInterval(burstTimer);
        burstTimer = 0;
      }
    }, 120);
  }

  function bindEvents() {
    if (!GLOBAL.document || GLOBAL.document.__packitEquipmentFastReentryBound) return;
    GLOBAL.document.__packitEquipmentFastReentryBound = true;
    ['click', 'input', 'change', 'keydown'].forEach(type => {
      GLOBAL.document.addEventListener(type, startBurstWindow, true);
    });
  }

  function init() {
    bindEvents();
    startBurstWindow();
    GLOBAL.setInterval(apply, 600);
  }

  ROOT.QuoteEquipmentReentryGuard = { version: '1.2.0-footer-contract', init, apply, burst: startBurstWindow, normalizeWizardFooterContract };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') {
    GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
