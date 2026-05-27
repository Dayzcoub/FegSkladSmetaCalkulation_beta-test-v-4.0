// PACK.IT — Quote Wizard constructor layout parity.
// Visual DOM adapter only: activates proven quick-layout CSS for quote Stage/Truss/LED constructors.
// Does not change quote data, calculations, bind buttons, BOM, warehouse, PDF or backend writes.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.1.0-quote-quick-constructor-parity-truss-subrent-accordion';
  let raf = 0;

  function setQuickShell(panel, kind) {
    if (!panel) return;
    panel.classList.add('packit-quick-shell', 'packit-quote-quick-parity');
    panel.dataset.packitQuickTargetKind = kind;
  }

  function getDirectLedParams(calc) {
    return calc && calc.querySelector ? (calc.querySelector(':scope > .v4-grid-3') || calc.querySelector(':scope > .packit-led-control-rail > .v4-grid-3')) : null;
  }

  function ensureLedRail(calc, params) {
    let rail = calc.querySelector(':scope > .packit-led-control-rail');
    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'packit-led-control-rail';
      rail.setAttribute('data-packit-led-control-rail', 'true');
      calc.insertBefore(rail, params);
    }
    return rail;
  }

  function setParamsOpen(params, head, body, open) {
    params.classList.toggle('is-collapsed', !open);
    params.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    head.setAttribute('title', `${open ? 'Свернуть' : 'Развернуть'}: Параметры LED`);
    if (body) body.hidden = !open;
  }

  function enhanceLedParams(params) {
    if (!params) return;
    params.classList.add('packit-led-params-accordion');

    let head = params.querySelector(':scope > .packit-led-params-accordion-head');
    if (!head) {
      head = document.createElement('h4');
      head.className = 'packit-led-params-accordion-head';
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.innerHTML = '<span><small>PARAMETERS</small><b>Параметры LED</b></span><span class="packit-led-panel-chevron" aria-hidden="true">▾</span>';
      params.insertBefore(head, params.firstChild);
    }

    let body = params.querySelector(':scope > .packit-led-params-accordion-body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'packit-led-params-accordion-body';
      Array.from(params.children).filter(node => node.classList && node.classList.contains('v4-field')).forEach(field => body.appendChild(field));
      params.appendChild(body);
    }

    if (params.dataset.packitQuoteLedParamsReady !== 'true') {
      params.dataset.packitQuoteLedParamsReady = 'true';
      setParamsOpen(params, head, body, false);
      const toggle = () => setParamsOpen(params, head, body, params.classList.contains('is-collapsed'));
      head.addEventListener('click', event => {
        if (event.target && event.target.closest && event.target.closest('input,select,button,a')) return;
        toggle();
      });
      head.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle();
      });
    } else {
      body.hidden = params.classList.contains('is-collapsed');
    }
  }

  function panelTitle(panel) {
    const title = panel && panel.querySelector ? panel.querySelector('h4') : null;
    return title ? String(title.textContent || '').trim() : 'Раздел';
  }

  function enhanceLedPanel(panel, index) {
    if (!panel || panel.dataset.packitQuoteLedAccordionReady === 'true') return;
    const title = panel.querySelector('h4');
    if (!title) return;

    panel.dataset.packitQuoteLedAccordionReady = 'true';
    panel.dataset.packitLedAccordion = index === 0 ? 'templates' : 'active';
    panel.classList.add('packit-led-panel-accordion', 'is-collapsed');

    title.classList.add('packit-led-panel-accordion-head');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    title.setAttribute('title', `Развернуть: ${panelTitle(panel)}`);

    if (!title.querySelector('.packit-led-panel-chevron')) {
      const chevron = document.createElement('span');
      chevron.className = 'packit-led-panel-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '▾';
      title.appendChild(chevron);
    }

    const toggle = () => {
      const open = panel.classList.contains('is-collapsed');
      panel.classList.toggle('is-collapsed', !open);
      panel.classList.toggle('is-open', open);
      title.setAttribute('aria-expanded', open ? 'true' : 'false');
      title.setAttribute('title', `${open ? 'Свернуть' : 'Развернуть'}: ${panelTitle(panel)}`);
    };

    title.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('input,select,button,a')) return;
      toggle();
    });
    title.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  function ensureTrussSubrentAccordion(panel) {
    if (!panel || !panel.querySelector) return;
    panel.querySelectorAll('.v4-truss-subrent-panel').forEach(block => {
      block.classList.add('packit-truss-subrent-accordion');
      if (block.dataset.packitTrussSubrentAccordionReady === 'true') return;
      block.dataset.packitTrussSubrentAccordionReady = 'true';
      block.classList.add('is-collapsed');

      const rowCount = block.querySelectorAll('[data-truss-subrent-row]').length;
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'packit-truss-subrent-accordion-head';
      head.setAttribute('aria-expanded', 'false');
      head.innerHTML = `<span><small>SUBRENT</small><b>Добор ферм${rowCount ? ' · ' + rowCount : ''}</b></span><span class="packit-led-panel-chevron" aria-hidden="true">▾</span>`;
      block.insertBefore(head, block.firstChild);

      const toggle = () => {
        const open = block.classList.contains('is-collapsed');
        block.classList.toggle('is-collapsed', !open);
        block.classList.toggle('is-open', open);
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      head.addEventListener('click', event => {
        event.preventDefault();
        toggle();
      });
    });
  }

  function adaptLed(panel) {
    setQuickShell(panel, 'led');
    const calc = panel.querySelector('[data-led-calculator].v4-led-constructor');
    if (!calc) return;
    const params = getDirectLedParams(calc);
    const side = calc.querySelector('.v4-led-workbench > .v4-led-side-panel') || calc.querySelector(':scope > .packit-led-control-rail > .v4-led-side-panel');
    if (!params || !side) return;

    const rail = ensureLedRail(calc, params);
    if (params.parentElement !== rail) rail.appendChild(params);
    if (side.parentElement !== rail) {
      side.setAttribute('data-packit-led-rail-placement', 'left-rail');
      rail.appendChild(side);
    }
    enhanceLedParams(params);
    Array.from(rail.querySelectorAll('.v4-led-side-panel > .v4-led-panel-block')).slice(0, 2).forEach(enhanceLedPanel);
  }

  function adaptStage(panel) {
    setQuickShell(panel, 'stage');
  }

  function adaptTruss(panel) {
    setQuickShell(panel, 'truss');
    ensureTrussSubrentAccordion(panel);
  }

  function run() {
    document.querySelectorAll('[data-quote-stage-panel]').forEach(adaptStage);
    document.querySelectorAll('[data-quote-truss-panel]').forEach(adaptTruss);
    document.querySelectorAll('[data-quote-led-panel]').forEach(adaptLed);
  }

  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => { raf = 0; run(); }) : window.setTimeout(() => { raf = 0; run(); }, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuoteQuickConstructorParity) return;
    document.body.__packitQuoteQuickConstructorParity = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-quote-active-step', 'class'] });
    ['click', 'input', 'change'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('[data-quote-stage-panel],[data-quote-truss-panel],[data-quote-led-panel],[data-quote-step-target],[data-quote-next],[data-quote-prev]')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 120);
      }
    }, true));
    schedule();
    window.setTimeout(schedule, 120);
    window.setTimeout(schedule, 600);
    window.setTimeout(schedule, 1400);
  }

  ROOT.QuoteQuickConstructorParity = { VERSION, init, run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
