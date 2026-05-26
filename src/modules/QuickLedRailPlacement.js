// PACK.IT — quick LED rail placement helper.
// Moves the existing quick LED side panel next to params so the left control rail is one column.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-led-rail-placement';
  let raf = 0;

  function placeRail(root) {
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-quick-shell[data-packit-quick-target-kind="led"]') : [];
    shells.forEach(shell => {
      const calc = shell.querySelector('[data-led-calculator].v4-led-constructor');
      if (!calc) return;
      const params = calc.querySelector(':scope > .v4-grid-3');
      const workbench = calc.querySelector(':scope > .v4-led-workbench');
      const side = calc.querySelector('.v4-led-side-panel');
      const canvas = calc.querySelector('.v4-led-canvas-panel');
      if (!params || !workbench || !side || !canvas) return;

      if (side.parentElement !== calc) {
        side.dataset.packitLedRailPlacement = 'left-rail';
        calc.insertBefore(side, workbench);
      }
    });
  }

  function schedule(root) {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => {
      raf = 0;
      placeRail(root || document);
    }) : window.setTimeout(() => {
      raf = 0;
      placeRail(root || document);
    }, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuickLedRailPlacement) return;
    document.body.__packitQuickLedRailPlacement = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule(document);
    window.setTimeout(() => schedule(document), 120);
  }

  ROOT.QuickLedRailPlacement = { VERSION, init, placeRail };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
