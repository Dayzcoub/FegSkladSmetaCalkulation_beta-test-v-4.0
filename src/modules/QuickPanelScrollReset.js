// PACK.IT — quick nested panels scroll reset.
// Visual-only helper: resets scroll position of quick calculator internal panels after tab switches/rerenders.
(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-panel-scroll-reset';
  let pending = 0;
  let lastKind = '';

  function activeKind(shell) {
    const active = shell && shell.querySelector ? shell.querySelector('.packit-quick-tab.active[data-quick-kind]') : null;
    return active && active.getAttribute('data-quick-kind') || shell && shell.dataset && shell.dataset.packitQuickTargetKind || '';
  }

  function resetPanels(shell) {
    if (!shell || !shell.querySelectorAll) return;
    const selectors = [
      '.v4-stage-template-panel', '[data-stage-summary]', '.v4-stage-canvas-wrap',
      '.v4-truss-template-panel', '.v4-truss-sidebar', '[data-truss-summary]', '.v4-truss-field-wrap',
      '.v4-led-constructor > .v4-grid-3', '.v4-led-side-panel', '[data-led-result]', '.v4-led-grid-wrap'
    ];
    selectors.forEach(selector => {
      shell.querySelectorAll(selector).forEach(el => {
        try {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        } catch (_) {}
      });
    });
  }

  function run(force) {
    pending = 0;
    const shell = document.querySelector('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell');
    if (!shell) return;
    const kind = activeKind(shell);
    if (!kind) return;
    if (force || kind !== lastKind) {
      lastKind = kind;
      resetPanels(shell);
      window.setTimeout(() => resetPanels(shell), 60);
      window.setTimeout(() => resetPanels(shell), 180);
    }
  }

  function schedule(force) {
    if (force) {
      window.setTimeout(() => run(true), 0);
      window.setTimeout(() => run(true), 80);
      return;
    }
    if (pending) return;
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(() => run(false)) : window.setTimeout(() => run(false), 16);
  }

  function bind() {
    document.addEventListener('click', event => {
      const target = event.target && event.target.closest ? event.target.closest('.packit-quick-tab[data-quick-kind], [data-packit-quick-target-action="load"]') : null;
      if (target) schedule(true);
    }, true);
    const observer = new MutationObserver(() => schedule(false));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    schedule(true);
  }

  function init() {
    if (!document.body || document.body.__packitQuickPanelScrollReset) return;
    document.body.__packitQuickPanelScrollReset = true;
    bind();
  }

  ROOT.QuickPanelScrollReset = { VERSION, init, resetPanels };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
