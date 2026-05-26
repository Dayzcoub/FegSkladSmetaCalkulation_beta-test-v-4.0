// PACK.IT — quick LED params accordion.
// Visual-only helper: collapses the left LED parameters block into an accordion header.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-led-params-accordion';
  let pending = 0;

  function schedule() {
    if (pending) return;
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(() => {
      pending = 0;
      enhanceAll();
    }) : window.setTimeout(() => {
      pending = 0;
      enhanceAll();
    }, 16);
  }

  function findParams(shell) {
    return shell && shell.querySelector ? shell.querySelector('.packit-led-control-rail > .v4-grid-3') : null;
  }

  function enhanceParams(params) {
    if (!params || params.dataset.packitLedParamsAccordionReady === 'true') return;
    params.dataset.packitLedParamsAccordionReady = 'true';
    params.classList.add('packit-led-params-accordion', 'is-collapsed');

    const head = document.createElement('h4');
    head.className = 'packit-led-params-accordion-head';
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('title', 'Развернуть: Параметры LED');
    head.innerHTML = '<span><small>PARAMETERS</small><b>Параметры LED</b></span><span class="packit-led-panel-chevron" aria-hidden="true">▾</span>';
    params.insertBefore(head, params.firstChild);

    const toggle = () => {
      const nextOpen = params.classList.contains('is-collapsed');
      params.classList.toggle('is-collapsed', !nextOpen);
      params.classList.toggle('is-open', nextOpen);
      head.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      head.setAttribute('title', `${nextOpen ? 'Свернуть' : 'Развернуть'}: Параметры LED`);
    };

    head.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('input,select,button,a')) return;
      toggle();
    });

    head.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  function enhanceAll() {
    const shell = document.querySelector('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell[data-packit-quick-target-kind="led"]');
    if (!shell) return;
    const params = findParams(shell);
    enhanceParams(params);
  }

  function init() {
    if (!document.body || document.body.__packitQuickLedParamsAccordion) return;
    document.body.__packitQuickLedParamsAccordion = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab[data-quick-kind="led"]')) window.setTimeout(schedule, 0);
    }, true);
    schedule();
    window.setTimeout(schedule, 120);
  }

  ROOT.QuickLedParamsAccordion = { VERSION, init, enhanceAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
