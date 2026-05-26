// PACK.IT — quick truss load modal viewport portal.
// Visual-only helper: turns #blockLoadModal into viewport overlay and wraps its content into a centered dialog.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.1.0-quick-truss-load-modal-overlay-dialog';
  let pending = 0;
  let placeholder = null;
  let modal = null;

  const OVERLAY_PROPS = ['position', 'z-index', 'top', 'left', 'right', 'bottom', 'transform', 'margin', 'display', 'width', 'max-width', 'height', 'max-height', 'overflow', 'box-sizing', 'padding', 'align-items', 'justify-content', 'background'];

  function findModal() {
    return document.getElementById('blockLoadModal');
  }

  function isOpen(el) {
    if (!el) return false;
    return el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false' || el.style.display === 'block' || el.style.display === 'flex';
  }

  function setImportant(el, prop, value) {
    if (!el || !el.style) return;
    try { el.style.setProperty(prop, value, 'important'); } catch (_) { el.style[prop] = value; }
  }

  function clearImportant(el, props) {
    if (!el || !el.style) return;
    (props || []).forEach(prop => {
      try { el.style.removeProperty(prop); } catch (_) {}
    });
  }

  function ensureDialog(el) {
    if (!el) return null;
    let dialog = Array.from(el.children || []).find(child => child.classList && child.classList.contains('packit-block-load-dialog'));
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.className = 'packit-block-load-dialog';
    while (el.firstChild) dialog.appendChild(el.firstChild);
    el.appendChild(dialog);
    return dialog;
  }

  function applyOverlay(el) {
    if (!el) return;
    ensureDialog(el);
    setImportant(el, 'position', 'fixed');
    setImportant(el, 'z-index', '10080');
    setImportant(el, 'top', '0');
    setImportant(el, 'left', '0');
    setImportant(el, 'right', '0');
    setImportant(el, 'bottom', '0');
    setImportant(el, 'transform', 'none');
    setImportant(el, 'margin', '0');
    setImportant(el, 'display', 'flex');
    setImportant(el, 'width', '100vw');
    setImportant(el, 'max-width', '100vw');
    setImportant(el, 'height', '100vh');
    setImportant(el, 'max-height', '100vh');
    setImportant(el, 'overflow', 'auto');
    setImportant(el, 'box-sizing', 'border-box');
    setImportant(el, 'padding', '24px');
    setImportant(el, 'align-items', 'center');
    setImportant(el, 'justify-content', 'center');
    setImportant(el, 'background', 'rgba(0,0,0,.72)');
    el.dataset.packitOverlayDialog = 'true';
  }

  function mountToBody(el) {
    if (!el) return;
    if (el.parentElement !== document.body) {
      placeholder = document.createComment('packit:blockLoadModal-original-position');
      el.parentNode.insertBefore(placeholder, el);
      document.body.appendChild(el);
      el.dataset.packitPortalMounted = 'true';
    }
    applyOverlay(el);
    document.documentElement.classList.add('packit-block-load-modal-open');
    document.body.classList.add('packit-block-load-modal-open');
  }

  function restoreFromBody(el) {
    if (!el) return;
    clearImportant(el, OVERLAY_PROPS);
    document.documentElement.classList.remove('packit-block-load-modal-open');
    document.body.classList.remove('packit-block-load-modal-open');
    if (el.dataset.packitPortalMounted !== 'true') return;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(el, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    }
    delete el.dataset.packitPortalMounted;
    delete el.dataset.packitOverlayDialog;
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

  function burstCentering() {
    schedule();
    [0, 40, 120, 260, 520].forEach(delay => window.setTimeout(schedule, delay));
  }

  function bind() {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });
    document.addEventListener('click', event => {
      const target = event.target && event.target.closest ? event.target.closest('[data-truss-load-open], .v4-load-indicator, #blockLoadModal button') : null;
      if (target) burstCentering();
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') window.setTimeout(schedule, 0);
    }, true);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    burstCentering();
  }

  function init() {
    if (!document.body || document.body.__packitQuickTrussLoadModalPortal) return;
    document.body.__packitQuickTrussLoadModalPortal = true;
    bind();
  }

  ROOT.QuickTrussLoadModalPortal = { VERSION, init, sync, ensureDialog, applyOverlay };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
