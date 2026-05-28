// PACK.IT — Quote Truss subrent bottom deduper.
// UI safety patch only: prevents duplicated bottom subrent accordions after truss add/delete rerenders.
// Does not change calculations, BOM, warehouse or quote data.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-quote-truss-subrent-deduper';
  let raf = 0;

  function rowCount(panel) {
    return panel ? panel.querySelectorAll('[data-truss-subrent-row], .v4-truss-subrent-row').length : 0;
  }

  function scorePanel(panel, index) {
    if (!panel) return -1;
    let score = index;
    score += rowCount(panel) * 1000;
    if (panel.classList.contains('is-open')) score += 100000;
    if (panel.querySelector('select, input, button')) score += 100;
    return score;
  }

  function syncHeader(panel) {
    if (!panel) return;
    const head = panel.querySelector(':scope > .packit-truss-subrent-accordion-head');
    const count = rowCount(panel);
    if (!head) return;
    const label = head.querySelector('b');
    if (label) label.textContent = `Добор ферм${count ? ' · ' + count : ''}`;
  }

  function dedupeHost(host) {
    if (!host || !host.querySelectorAll) return;
    const panels = Array.from(host.querySelectorAll(':scope > .v4-truss-subrent-panel, :scope > .packit-truss-subrent-accordion'));
    if (!panels.length) return;
    if (panels.length === 1) {
      syncHeader(panels[0]);
      return;
    }

    const shouldStayOpen = panels.some(panel => panel.classList.contains('is-open') || panel.dataset.packitTrussSubrentUserState === 'open');
    const keep = panels
      .map((panel, index) => ({ panel, score: scorePanel(panel, index) }))
      .sort((a, b) => b.score - a.score)[0].panel;

    panels.forEach(panel => {
      if (panel !== keep && panel.parentElement) panel.parentElement.removeChild(panel);
    });

    if (shouldStayOpen) {
      keep.classList.add('is-open');
      keep.classList.remove('is-collapsed');
      keep.dataset.packitTrussSubrentUserState = 'open';
      const head = keep.querySelector(':scope > .packit-truss-subrent-accordion-head');
      if (head) head.setAttribute('aria-expanded', 'true');
    }
    syncHeader(keep);
  }

  function run() {
    document.querySelectorAll('[data-packit-truss-subrent-bottom-host]').forEach(dedupeHost);
  }

  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => { raf = 0; run(); }) : window.setTimeout(() => { raf = 0; run(); }, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuoteTrussSubrentDeduper) return;
    document.body.__packitQuoteTrussSubrentDeduper = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    ['click', 'input', 'change'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('[data-quote-truss-panel], [data-packit-truss-subrent-bottom-host]')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 80);
        window.setTimeout(schedule, 220);
      }
    }, true));
    schedule();
    window.setTimeout(schedule, 300);
    window.setTimeout(schedule, 900);
  }

  ROOT.QuoteTrussSubrentDeduper = { VERSION, init, run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
