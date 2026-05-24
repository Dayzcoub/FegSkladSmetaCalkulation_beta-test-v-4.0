(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

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

  function init() {
    apply();
    GLOBAL.setTimeout(apply, 250);
    GLOBAL.setTimeout(apply, 750);
    GLOBAL.setInterval(apply, 1200);
  }

  ROOT.QuoteEquipmentReentryGuard = { version: '1.0.0', init, apply };

  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') {
    GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
