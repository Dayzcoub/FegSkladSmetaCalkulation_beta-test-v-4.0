// PACK.IT — Quote Truss load modal close guard.
// UI safety patch only: keeps the quote-step truss load-check modal closeable by X, Esc and backdrop click.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quote-truss-load-modal-close-guard';

  function isVisibleModal(node) {
    if (!node || !node.classList) return false;
    if (node.id === 'blockLoadModal') return true;
    const cls = String(node.className || '').toLowerCase();
    return cls.includes('modal') && (cls.includes('load') || cls.includes('truss'));
  }

  function findOpenLoadModal(fromNode) {
    if (fromNode && fromNode.closest) {
      const local = fromNode.closest('#blockLoadModal, .block-load-modal, .v4-truss-load-dialog, [data-truss-load-dialog], [id*="LoadModal"], [class*="load-modal"], [class*="LoadModal"]');
      if (local) return local;
    }

    const direct = document.getElementById('blockLoadModal');
    if (direct && (direct.classList.contains('open') || direct.getAttribute('aria-hidden') === 'false')) return direct;

    return Array.from(document.querySelectorAll('.open, [open], [aria-hidden="false"]')).find(isVisibleModal) || null;
  }

  function closeModal(modal) {
    if (!modal) return false;
    try {
      if (ROOT.LoadChecker && typeof ROOT.LoadChecker.closeLoadModal === 'function') {
        ROOT.LoadChecker.closeLoadModal();
      }
    } catch (_) {}

    try { if (typeof modal.close === 'function' && modal.open) modal.close(); } catch (_) {}
    modal.classList.remove('open', 'is-open', 'active', 'is-active', 'show');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('open');
    if (modal.id === 'blockLoadModal') modal.style.display = '';
    return true;
  }

  function isCloseTarget(target) {
    if (!target || !target.closest) return false;
    const closeEl = target.closest('[data-truss-load-close], [data-close], [data-modal-close], .modal-close, .v4-modal-close, .block-load-close, button, [role="button"]');
    if (!closeEl) return false;
    const text = String(closeEl.textContent || '').trim().toLowerCase();
    const aria = String(closeEl.getAttribute('aria-label') || closeEl.getAttribute('title') || '').trim().toLowerCase();
    const cls = String(closeEl.className || '').toLowerCase();
    return text === '×' || text === 'x' || text === '✕' || text === 'закрыть' || aria.includes('close') || aria.includes('закры') || cls.includes('close');
  }

  function bind() {
    if (document.body.__packitQuoteTrussLoadModalCloseGuard) return;
    document.body.__packitQuoteTrussLoadModalCloseGuard = true;

    document.addEventListener('click', event => {
      const target = event.target;
      if (!target || !target.closest) return;

      const modal = findOpenLoadModal(target);
      if (!modal) return;

      const backdropClick = target === modal;
      if (!backdropClick && !isCloseTarget(target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeModal(modal);
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const modal = findOpenLoadModal(document.activeElement || document.body);
      if (!modal) return;
      event.preventDefault();
      closeModal(modal);
    }, true);
  }

  function init() {
    if (!document.body) return;
    bind();
  }

  ROOT.QuoteTrussLoadModalCloseGuard = { VERSION, init, closeModal, findOpenLoadModal };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
