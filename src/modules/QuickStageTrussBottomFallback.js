// PACK.IT — quick Stage/Truss bottom fallback.
// Uses visible top summary when the section root is not reachable by bottom live panels.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-stage-truss-bottom-fallback';
  let raf = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function activeTab(tabs) {
    const active = tabs && tabs.querySelector ? tabs.querySelector('button.active') : null;
    return String(active && active.textContent || 'Сводка').trim().toLowerCase();
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 4 && rect.height > 4;
  }

  function findTopSummary(shell) {
    if (!shell || !shell.querySelectorAll) return null;
    const strips = Array.from(shell.querySelectorAll('.v4-summary-strip,.v4-summary-grid'));
    return strips.find(strip => strip && !strip.closest('.packit-quick-bottom') && isVisible(strip)) || null;
  }

  function readCards(strip) {
    if (!strip) return [];
    const children = Array.from(strip.children || []);
    return children.map(item => {
      const value = item.querySelector('b') ? item.querySelector('b').textContent.trim() : '';
      const label = item.querySelector('span') ? item.querySelector('span').textContent.trim() : '';
      const note = item.querySelector('small') ? item.querySelector('small').textContent.trim() : '';
      return { value, label, note };
    }).filter(card => card.value || card.label);
  }

  function cardHtml(card) {
    return `<article><b>${escapeHtml(card.value || '—')}</b><span>${escapeHtml(card.label || card.note || 'показатель')}</span></article>`;
  }

  function apply(shell) {
    if (!shell || !shell.dataset) return;
    const kind = shell.dataset.packitQuickTargetKind;
    if (kind !== 'stage' && kind !== 'truss') return;

    const tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    const bottom = shell.querySelector(':scope > .packit-quick-bottom');
    if (!tabs || !bottom) return;

    const tab = activeTab(tabs);
    if (tab !== 'сводка' && tab !== 'нагрузки') return;

    const live = bottom.querySelector(':scope > .packit-stage-truss-bottom-live');
    if (!live || live.hidden) return;
    if (!/ещ[ёе]\s+не\s+собран/i.test(live.textContent || '')) return;

    const strip = findTopSummary(shell);
    const cards = readCards(strip);
    if (!cards.length) return;

    const title = kind === 'stage'
      ? 'Живая сводка сцены'
      : (tab === 'нагрузки' ? 'Сводка ферм и нагрузок' : 'Живая сводка ферм');
    const kicker = kind === 'stage' ? 'Stage summary' : 'Truss summary';
    const footerCard = kind === 'stage'
      ? { value: 'готово', label: 'Stage → общий BOM' }
      : { value: 'готово', label: 'Truss → общий BOM' };

    live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">${escapeHtml(kicker)}</div><h4>${escapeHtml(title)}</h4><div class="packit-led-bottom-cards">${cards.slice(0, 7).map(cardHtml).join('')}${cardHtml(footerCard)}</div></section>`;
  }

  function run() {
    document.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell').forEach(apply);
  }

  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => { raf = 0; run(); }) : window.setTimeout(() => { raf = 0; run(); }, 16);
  }

  function init() {
    if (!document.body || document.body.__packitStageTrussBottomFallback) return;
    document.body.__packitStageTrussBottomFallback = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,.packit-quick-target-bottom-tabs button,[data-packit-quick-target-action]')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 120);
      }
    }, true);
    ['input', 'change', 'pointerup'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-shell[data-packit-quick-target-kind="stage"],.packit-quick-shell[data-packit-quick-target-kind="truss"]')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 120);
      }
    }, true));
    schedule();
    window.setTimeout(schedule, 120);
    window.setTimeout(schedule, 600);
    window.setTimeout(schedule, 1400);
  }

  ROOT.QuickStageTrussBottomFallback = { VERSION, init, run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
