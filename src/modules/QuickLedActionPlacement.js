// PACK.IT — quick LED action placement helper.
// Visual/DOM placement only: moves the existing "new construction" button into Active construction actions.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-led-action-placement';
  let raf = 0;

  function moveNewButton(root) {
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-quick-shell[data-packit-quick-target-kind="led"]') : [];
    shells.forEach(shell => {
      const button = shell.querySelector('[data-led-template="new"]');
      const actions = shell.querySelector('.v4-led-panel-block .v4-actions');
      if (!button || !actions) return;
      if (button.parentElement === actions) return;
      button.dataset.packitLedActionPlacement = 'active-construction';
      actions.insertBefore(button, actions.firstElementChild || null);
    });
  }

  function schedule(root) {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => {
      raf = 0;
      moveNewButton(root || document);
    }) : window.setTimeout(() => {
      raf = 0;
      moveNewButton(root || document);
    }, 16);
  }

  function bind() {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          schedule(document);
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    schedule(document);
  }

  function init() {
    if (!document.body || document.body.__packitQuickLedActionPlacement) return;
    document.body.__packitQuickLedActionPlacement = true;
    bind();
  }

  ROOT.QuickLedActionPlacement = { VERSION, init, moveNewButton };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
