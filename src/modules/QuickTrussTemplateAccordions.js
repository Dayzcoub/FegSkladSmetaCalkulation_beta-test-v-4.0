// PACK.IT — quick truss template accordions.
// Visual-only helper: collapses Portal/Frame and Stool template cards in quick truss UI.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quick-truss-template-accordions';
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

  function titleForCard(card) {
    const key = card && card.getAttribute ? card.getAttribute('data-truss-template-card') : '';
    if (key === 'flat') return 'Портал / рама';
    if (key === 'stool') return 'Табуретка';
    const text = card && card.querySelector ? card.querySelector('.v4-truss-template-card-head b') : null;
    return text ? String(text.textContent || '').trim() : 'Параметры';
  }

  function enhanceCard(card) {
    if (!card || card.dataset.packitTrussAccordionReady === 'true') return;
    const head = card.querySelector('.v4-truss-template-card-head');
    if (!head) return;
    card.dataset.packitTrussAccordionReady = 'true';
    card.classList.add('packit-truss-template-accordion', 'is-collapsed');
    head.classList.add('packit-truss-template-accordion-head');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('title', `Развернуть: ${titleForCard(card)}`);
    if (!head.querySelector('.packit-truss-template-chevron')) {
      const chevron = document.createElement('span');
      chevron.className = 'packit-truss-template-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '▾';
      head.appendChild(chevron);
    }
    const toggle = () => {
      const nextOpen = card.classList.contains('is-collapsed');
      card.classList.toggle('is-collapsed', !nextOpen);
      card.classList.toggle('is-open', nextOpen);
      head.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      head.setAttribute('title', `${nextOpen ? 'Свернуть' : 'Развернуть'}: ${titleForCard(card)}`);
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
    const shell = document.querySelector('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell[data-packit-quick-target-kind="truss"]');
    if (!shell) return;
    shell.querySelectorAll('.v4-truss-template-card[data-truss-template-card="flat"], .v4-truss-template-card[data-truss-template-card="stool"]').forEach(enhanceCard);
  }

  function init() {
    if (!document.body || document.body.__packitQuickTrussTemplateAccordions) return;
    document.body.__packitQuickTrussTemplateAccordions = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab[data-quick-kind="truss"]')) window.setTimeout(schedule, 0);
    }, true);
    schedule();
    window.setTimeout(schedule, 120);
  }

  ROOT.QuickTrussTemplateAccordions = { VERSION, init, enhanceAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
