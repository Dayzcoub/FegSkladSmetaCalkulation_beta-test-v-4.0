// PACK.IT — quick truss load modal viewport portal.
// Visual-only helper: moves #blockLoadModal to document.body while open so fixed positioning is relative to viewport.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-truss-load-modal-portal';
  let pending = 0;
  let placeholder = null;
  let modal = null;

  function findModal() {
    return document.getElementById('blockLoadModal');
  }

  function isOpen(el) {
    if (!el) return false;
    return el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false' || el.style.display === 'block' || el.style.display === 'flex';
  }

  function mountToBody(el) {
    if (!el || el.parentElement === document.body) return;
    placeholder = document.createComment('packit:blockLoadModal-original-position');
    el.parentNode.insertBefore(placeholder, el);
    document.body.appendChild(el);
    el.dataset.packitPortalMounted = 'true';
  }

  function restoreFromBody(el) {
    if (!el || el.dataset.packitPortalMounted !== 'true') return;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(el, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }
    delete el.dataset.packitPortalMounted;
    placeholder = null;
  }

  function sync() {
    pending = 0;
    modal = findModal();
    if (!modal) return;
    if (isOpen(modal)) mountToBody(modal);
    else restoreFromBody(modal);
  }

  function schedule() {
    if (pending) return;
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(sync) : window.setTimeout(sync, 16);
  }

  function bind() {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });
    document.addEventListener('click', event => {
      const target = event.target && event.target.closest ? event.target.closest('[data-truss-load-open], .v4-load-indicator, #blockLoadModal button') : null;
      if (target) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 80);
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') window.setTimeout(schedule, 0);
    }, true);
    schedule();
  }

  function init() {
    if (!document.body || document.body.__packitQuickTrussLoadModalPortal) return;
    document.body.__packitQuickTrussLoadModalPortal = true;
    bind();
  }

  ROOT.QuickTrussLoadModalPortal = { VERSION, init, sync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
