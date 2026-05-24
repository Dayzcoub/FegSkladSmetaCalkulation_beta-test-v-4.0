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

  function apply() {
    if (!GLOBAL.document) return;
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

  ROOT.QuoteEquipmentReentryGuard = { version: '1.1.0-fast-reentry', init, apply, burst: startBurstWindow };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') {
    GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
