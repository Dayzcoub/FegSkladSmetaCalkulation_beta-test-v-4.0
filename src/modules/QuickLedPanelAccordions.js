// PACK.IT — quick LED side panel accordions.
// Visual-only helper: collapses Templates and Active construction blocks in quick LED UI.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-led-panel-accordions';
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

  function panelTitle(panel) {
    const title = panel && panel.querySelector ? panel.querySelector('h4') : null;
    return title ? String(title.textContent || '').trim() : 'Раздел';
  }

  function enhancePanel(panel, index) {
    if (!panel || panel.dataset.packitLedAccordionReady === 'true') return;
    const title = panel.querySelector('h4');
    if (!title) return;

    panel.dataset.packitLedAccordionReady = 'true';
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
      const nextOpen = panel.classList.contains('is-collapsed');
      panel.classList.toggle('is-collapsed', !nextOpen);
      panel.classList.toggle('is-open', nextOpen);
      title.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      title.setAttribute('title', `${nextOpen ? 'Свернуть' : 'Развернуть'}: ${panelTitle(panel)}`);
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

  function enhanceAll() {
    const shell = document.querySelector('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell[data-packit-quick-target-kind="led"]');
    if (!shell) return;
    const panels = Array.from(shell.querySelectorAll('.v4-led-side-panel > .v4-led-panel-block'));
    panels.slice(0, 2).forEach(enhancePanel);
  }

  function init() {
    if (!document.body || document.body.__packitQuickLedPanelAccordions) return;
    document.body.__packitQuickLedPanelAccordions = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab[data-quick-kind="led"]')) window.setTimeout(schedule, 0);
    }, true);
    schedule();
    window.setTimeout(schedule, 120);
  }

  ROOT.QuickLedPanelAccordions = { VERSION, init, enhanceAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
