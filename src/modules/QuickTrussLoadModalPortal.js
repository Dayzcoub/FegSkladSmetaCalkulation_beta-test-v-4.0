// PACK.IT — quick truss load modal viewport portal.
// Visual-only helper: moves #blockLoadModal to document.body while open and hard-centers it in viewport.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.1-quick-truss-load-modal-hard-center';
  let pending = 0;
  let placeholder = null;
  let modal = null;
  let centerTimer = 0;

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

  function hardCenter(el) {
    if (!el) return;
    setImportant(el, 'position', 'fixed');
    setImportant(el, 'z-index', '10080');
    setImportant(el, 'top', '50%');
    setImportant(el, 'left', '50%');
    setImportant(el, 'right', 'auto');
    setImportant(el, 'bottom', 'auto');
    setImportant(el, 'transform', 'translate(-50%, -50%)');
    setImportant(el, 'margin', '0');
    setImportant(el, 'display', 'block');
    setImportant(el, 'width', 'min(1040px, calc(100vw - 48px))');
    setImportant(el, 'max-width', 'calc(100vw - 48px)');
    setImportant(el, 'height', 'auto');
    setImportant(el, 'max-height', 'calc(100vh - 48px)');
    setImportant(el, 'overflow', 'auto');
    setImportant(el, 'box-sizing', 'border-box');
    el.dataset.packitHardCentered = 'true';
  }

  function clearHardCenter(el) {
    if (!el || el.dataset.packitHardCentered !== 'true') return;
    clearImportant(el, ['position', 'z-index', 'top', 'left', 'right', 'bottom', 'transform', 'margin', 'display', 'width', 'max-width', 'height', 'max-height', 'overflow', 'box-sizing']);
    delete el.dataset.packitHardCentered;
  }

  function mountToBody(el) {
    if (!el) return;
    if (el.parentElement !== document.body) {
      placeholder = document.createComment('packit:blockLoadModal-original-position');
      el.parentNode.insertBefore(placeholder, el);
      document.body.appendChild(el);
      el.dataset.packitPortalMounted = 'true';
    }
    hardCenter(el);
    document.documentElement.classList.add('packit-block-load-modal-open');
    document.body.classList.add('packit-block-load-modal-open');
  }

  function restoreFromBody(el) {
    if (!el) return;
    clearHardCenter(el);
    document.documentElement.classList.remove('packit-block-load-modal-open');
    document.body.classList.remove('packit-block-load-modal-open');
    if (el.dataset.packitPortalMounted !== 'true') return;
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

  function burstCentering() {
    window.clearTimeout(centerTimer);
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

  ROOT.QuickTrussLoadModalPortal = { VERSION, init, sync, hardCenter };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
