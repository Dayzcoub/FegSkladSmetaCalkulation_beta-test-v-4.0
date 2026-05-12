(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  let styleReady = false;
  let overlay = null;
  let depth = 0;

  function ensureStyle() {
    if (styleReady || typeof document === 'undefined') return;
    styleReady = true;
    const style = document.createElement('style');
    style.id = 'fegBusyIndicatorStyle';
    style.textContent = `
      .feg-busy-overlay {
        position: fixed; inset: auto 16px 16px auto; z-index: 99999;
        min-width: min(360px, calc(100vw - 32px)); max-width: calc(100vw - 32px);
        border: 1px solid rgba(199,167,122,.38); border-radius: 18px;
        background: rgba(14,20,27,.94); color: #f3f6f8; box-shadow: 0 18px 60px rgba(0,0,0,.42);
        padding: 12px 14px; display: none; backdrop-filter: blur(12px);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .feg-busy-overlay.open { display: block; }
      .feg-busy-title { font-size: .9rem; font-weight: 850; margin-bottom: 8px; }
      .feg-busy-hint { font-size: .78rem; color: rgba(243,246,248,.68); line-height: 1.35; }
      .feg-busy-bar { height: 4px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.12); margin: 8px 0; }
      .feg-busy-bar span { display:block; width: 38%; height:100%; border-radius: inherit; background: linear-gradient(90deg,#c7a77a,#f4d7a8); animation: fegBusyMove 1.05s ease-in-out infinite; }
      @keyframes fegBusyMove { 0% { transform: translateX(-110%); } 55% { transform: translateX(190%); } 100% { transform: translateX(190%); } }
      .feg-button-busy { opacity: .72; pointer-events: none; position: relative; }
      .v4-inline-loading { padding: 16px; border: 1px dashed rgba(199,167,122,.35); border-radius: 18px; background: rgba(199,167,122,.08); color: var(--muted, #a6b0bb); }
      .v4-inline-loading b { display:block; color: var(--text, #f3f6f8); margin-bottom: 6px; }
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    ensureStyle();
    if (overlay || typeof document === 'undefined') return overlay;
    overlay = document.createElement('div');
    overlay.className = 'feg-busy-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div class="feg-busy-title"></div><div class="feg-busy-bar"><span></span></div><div class="feg-busy-hint">Операция может занять несколько секунд на больших проектах. Страница не зависла.</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function show(label) {
    const node = ensureOverlay();
    if (!node) return;
    depth += 1;
    const title = node.querySelector('.feg-busy-title');
    if (title) title.textContent = label || 'Выполняю операцию…';
    node.classList.add('open');
  }

  function hide() {
    depth = Math.max(0, depth - 1);
    if (depth > 0) return;
    if (overlay) overlay.classList.remove('open');
  }

  function nextFrame() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(resolve, 0));
      else setTimeout(resolve, 0);
    });
  }

  function run(label, task) {
    show(label);
    return nextFrame().then(() => task()).finally(hide);
  }

  function setButtonBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.fegOriginalText) button.dataset.fegOriginalText = button.textContent || '';
      button.classList.add('feg-button-busy');
      button.disabled = true;
      if (label) button.textContent = label;
    } else {
      button.classList.remove('feg-button-busy');
      button.disabled = false;
      if (button.dataset.fegOriginalText) button.textContent = button.dataset.fegOriginalText;
      delete button.dataset.fegOriginalText;
    }
  }

  ROOT.BusyIndicator = { show, hide, run, setButtonBusy, nextFrame };
})();
