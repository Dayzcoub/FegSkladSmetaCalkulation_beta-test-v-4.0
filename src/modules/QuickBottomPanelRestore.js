// PACK.IT — quick bottom panel restore.
// Visual/DOM placement only: restores existing quick docs + BOM inspector under target bottom tabs.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.1.0-quick-bottom-panel-restore';
  let raf = 0;

  function closestPage(shell) {
    return shell && shell.closest ? (shell.closest('.packit-page') || shell.closest('.packit-shell') || document) : document;
  }

  function findExisting(page, selector, bottom) {
    if (!page || !page.querySelectorAll) return null;
    const nodes = Array.from(page.querySelectorAll(selector));
    return nodes.find(node => node && node !== bottom && !node.closest('.v4-quick-modal-backdrop')) || null;
  }

  function placeBottom(shell) {
    if (!shell || !shell.querySelector) return;
    const tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    if (!tabs) return;

    let bottom = shell.querySelector(':scope > .packit-quick-bottom');
    if (!bottom) {
      bottom = document.createElement('div');
      bottom.className = 'packit-quick-bottom';
      tabs.insertAdjacentElement('afterend', bottom);
    } else if (bottom.previousElementSibling !== tabs) {
      tabs.insertAdjacentElement('afterend', bottom);
    }

    const page = closestPage(shell);
    const docs = findExisting(page, '[data-v4-quick-docs]', bottom);
    const bom = findExisting(page, '[data-v4-bom-inspector]', bottom);
    const visual = findExisting(page, '[data-v4-quick-visual-preview]', bottom);

    if (docs && docs.parentElement !== bottom) bottom.appendChild(docs);
    if (bom && bom.parentElement !== bottom) bottom.appendChild(bom);
    if (visual && visual.parentElement && visual.parentElement !== bottom) {
      visual.setAttribute('data-packit-quick-visual-parked', 'true');
      visual.hidden = true;
    }

    bottom.toggleAttribute('data-packit-restored-bottom-empty', !bottom.children.length);
  }

  function restoreAll(root) {
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell') : [];
    shells.forEach(placeBottom);
  }

  function schedule(root) {
    if (raf) return;
    const run = () => {
      raf = 0;
      restoreAll(root || document);
    };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuickBottomPanelRestore) return;
    document.body.__packitQuickBottomPanelRestore = true;
    const observer = new MutationObserver(() => schedule(document));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-v4-active-section', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,[data-packit-quick-target-action]')) {
        window.setTimeout(() => schedule(document), 0);
      }
    }, true);
    schedule(document);
    window.setTimeout(() => schedule(document), 120);
    window.setTimeout(() => schedule(document), 500);
    window.setTimeout(() => schedule(document), 1200);
  }

  ROOT.QuickBottomPanelRestore = { VERSION, init, restoreAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
