// PACK.IT — quick Stage/Truss bottom live panels.
// Visual routing only. Reads already built quick sections; does not change calculations/BOM/PDF/backend.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-stage-truss-bottom-panels';
  let raf = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function number(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function fmt(value, digits) {
    return number(value, 0).toLocaleString('ru-RU', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }

  function lower(value) { return String(value == null ? '' : value).toLowerCase(); }

  function activeBottomTab(tabs) {
    const active = tabs && tabs.querySelector ? tabs.querySelector('button.active') : null;
    return lower(active && active.textContent || 'сводка').trim();
  }

  function ensureLive(bottom) {
    let live = bottom.querySelector(':scope > .packit-stage-truss-bottom-live');
    if (!live) {
      live = document.createElement('div');
      live.className = 'packit-stage-truss-bottom-live packit-led-bottom-live';
      bottom.insertBefore(live, bottom.firstChild);
    }
    return live;
  }

  function findQuickRoot(shell) {
    const config = shell && shell.querySelector ? shell.querySelector('#v4QuickConfigMount') : null;
    if (config && config._quickRoot) return config._quickRoot;
    const page = shell && shell.closest ? (shell.closest('.packit-shell') || shell.closest('.packit-page')) : null;
    const pageConfig = page && page.querySelector ? page.querySelector('#v4QuickConfigMount') : null;
    if (pageConfig && pageConfig._quickRoot) return pageConfig._quickRoot;
    return null;
  }

  function rows(section) {
    return Array.isArray(section && section.bomRows) ? section.bomRows : [];
  }

  function rowQty(section, matcher) {
    return rows(section).reduce((sum, row) => {
      const hay = lower(`${row.code || ''} ${row.name || ''} ${row.note || ''}`);
      return matcher(hay, row) ? sum + number(row.qty == null ? row.count : row.qty, 0) : sum;
    }, 0);
  }

  function rowMeters(section, matcher) {
    return rows(section).reduce((sum, row) => {
      const hay = lower(`${row.code || ''} ${row.name || ''} ${row.note || ''}`);
      if (!matcher(hay, row)) return sum;
      return sum + number(row.meters != null ? row.meters : (lower(row.unit).includes('м') ? (row.qty == null ? row.count : row.qty) : 0), 0);
    }, 0);
  }

  function rowWeight(section) {
    return rows(section).reduce((sum, row) => sum + number(row.weightKg == null ? row.weight : row.weightKg, 0), 0);
  }

  function card(value, label) {
    return `<article><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></article>`;
  }

  function table(section, title, subtitle) {
    const safeRows = rows(section).filter(row => number(row.qty == null ? row.count : row.qty, 0) || number(row.meters, 0) || number(row.weightKg == null ? row.weight : row.weightKg, 0));
    return `<section class="packit-led-bottom-panel"><div class="v4-kicker">${escapeHtml(subtitle || 'BOM')}</div><h4>${escapeHtml(title)}</h4><div class="packit-led-bottom-table"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Примечание</th></tr></thead><tbody>${safeRows.length ? safeRows.slice(0, 14).map(row => `<tr><td><b>${escapeHtml(row.name || row.title || 'Позиция')}</b><br><span class="v4-muted">${escapeHtml(row.code || '')}</span></td><td>${escapeHtml(row.qty == null ? (row.count == null ? '—' : row.count) : row.qty)} ${escapeHtml(row.unit || 'шт')}</td><td>${number(row.weightKg == null ? row.weight : row.weightKg, 0) ? `${fmt(row.weightKg == null ? row.weight : row.weightKg, 1)} кг` : '—'}</td><td>${escapeHtml(row.note || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="v4-muted">Нет строк комплектации</td></tr>'}</tbody></table></div></section>`;
  }

  function parseStageSize(section) {
    const summary = String(section && section.summary || '');
    const match = summary.match(/Сцена\s+([0-9,.]+\s*[×x]\s*[0-9,.]+)\s*м/i);
    return match ? match[1].replace(/\s+/g, '') + ' м' : '—';
  }

  function renderStage(shell, bottom, tabs, quickRoot) {
    const live = ensureLive(bottom);
    const tab = activeBottomTab(tabs);
    const section = quickRoot && quickRoot._quickStageSection || null;
    const docsMount = bottom.querySelector('#v4QuickDocsMount');
    const bomMount = bottom.querySelector('#v4QuickBomMount');
    if (docsMount) docsMount.hidden = tab !== 'экспорт';
    if (bomMount) bomMount.hidden = tab !== 'bom' && tab !== 'экспорт';
    if (tab === 'экспорт') { live.hidden = true; return; }
    live.hidden = false;

    if (!section) {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Stage</div><h4>Сцена ещё не собрана</h4><p class="v4-muted">Построй сцену в верхнем конструкторе, и здесь появится живая сводка.</p></section>`;
      return;
    }

    const sheets = rowQty(section, hay => hay.includes('настил') || hay.includes('stg-901'));
    const columns = rowQty(section, hay => hay.includes('стой') || hay.includes('опор') || hay.includes('stg-902'));
    const frames = rowQty(section, hay => hay.includes('переклад') || hay.includes('рам') || hay.includes('stg-903'));
    const weight = number(section.weightKg, rowWeight(section));
    const height = number(section.stageHeightM, 0);

    if (tab === 'bom' || tab === 'склад' || tab === 'техлист') {
      live.innerHTML = table(section, tab === 'склад' ? 'Складская ведомость сцены' : tab === 'техлист' ? 'Технический лист сцены' : 'BOM сцены', tab);
      return;
    }

    if (tab === 'json') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">JSON</div><h4>Диагностика Stage section</h4><pre class="packit-led-bottom-json">${escapeHtml(JSON.stringify({ summary: section.summary, stageHeightM: section.stageHeightM, weightKg: section.weightKg, bomRows: rows(section).length }, null, 2))}</pre></section>`;
      return;
    }

    live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Summary</div><h4>Живая сводка сцены</h4><div class="packit-led-bottom-cards">${[
      card(parseStageSize(section), 'габарит сцены'),
      card(`${fmt(sheets)} шт`, 'настил'),
      card(`${fmt(columns)} шт`, 'стойки / опоры'),
      card(`${fmt(frames)} шт`, 'рамы / перекладины'),
      card(`${fmt(height, 2)} м`, 'высота сцены'),
      card(`${fmt(weight, 1)} кг`, 'вес'),
      card(`${rows(section).length} строк`, 'BOM'),
      card('готово', 'Stage → общий BOM')
    ].join('')}</div></section>`;
  }

  function renderTruss(shell, bottom, tabs, quickRoot) {
    const live = ensureLive(bottom);
    const tab = activeBottomTab(tabs);
    const section = quickRoot && quickRoot._quickTrussSection || null;
    const docsMount = bottom.querySelector('#v4QuickDocsMount');
    const bomMount = bottom.querySelector('#v4QuickBomMount');
    if (docsMount) docsMount.hidden = tab !== 'экспорт';
    if (bomMount) bomMount.hidden = tab !== 'bom' && tab !== 'экспорт';
    if (tab === 'экспорт') { live.hidden = true; return; }
    live.hidden = false;

    if (!section) {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Truss</div><h4>Фермы ещё не собраны</h4><p class="v4-muted">Построй ферменную конструкцию в верхнем конструкторе, и здесь появится живая сводка.</p></section>`;
      return;
    }

    const meters = rowMeters(section, hay => hay.includes('ферм') || hay.includes('truss') || hay.includes('прям'));
    const nodes = rowQty(section, hay => hay.includes('узел') || hay.includes('угол'));
    const bases = rowQty(section, hay => hay.includes('баз') || hay.includes('блин'));
    const pins = rowQty(section, hay => hay.includes('палец') || hay.includes('c2-') || hay.includes('c2 '));
    const cotters = rowQty(section, hay => hay.includes('шплинт'));
    const weight = number(section.weightKg, rowWeight(section));

    if (tab === 'bom' || tab === 'склад' || tab === 'техлист') {
      live.innerHTML = table(section, tab === 'склад' ? 'Складская ведомость ферм' : tab === 'техлист' ? 'Технический лист ферм' : 'BOM ферм', tab);
      return;
    }

    if (tab === 'json') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">JSON</div><h4>Диагностика Truss section</h4><pre class="packit-led-bottom-json">${escapeHtml(JSON.stringify({ summary: section.summary, weightKg: section.weightKg, bomRows: rows(section).length }, null, 2))}</pre></section>`;
      return;
    }

    live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">${tab === 'нагрузки' ? 'Loads' : 'Summary'}</div><h4>${tab === 'нагрузки' ? 'Сводка ферм и нагрузок' : 'Живая сводка ферм'}</h4><div class="packit-led-bottom-cards">${[
      card(`${fmt(meters, 1)} м`, 'прямые фермы'),
      card(`${fmt(nodes)} шт`, 'узлы / углы'),
      card(`${fmt(bases)} шт`, 'базы'),
      card(`${fmt(pins)} / ${fmt(cotters)}`, 'пальцы / шплинты'),
      card(`${fmt(weight, 1)} кг`, 'вес'),
      card(`${rows(section).length} строк`, 'BOM'),
      card(section.status || 'configured', 'статус'),
      card('готово', 'Truss → общий BOM')
    ].join('')}</div></section>`;
  }

  function apply(shell) {
    if (!shell || !shell.dataset) return;
    const kind = shell.dataset.packitQuickTargetKind;
    if (kind !== 'stage' && kind !== 'truss') return;
    const tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    const bottom = shell.querySelector(':scope > .packit-quick-bottom');
    if (!tabs || !bottom) return;
    const quickRoot = findQuickRoot(shell);
    if (kind === 'stage') renderStage(shell, bottom, tabs, quickRoot);
    else renderTruss(shell, bottom, tabs, quickRoot);
  }

  function run() {
    document.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell').forEach(apply);
  }

  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(() => { raf = 0; run(); }) : window.setTimeout(() => { raf = 0; run(); }, 16);
  }

  function init() {
    if (!document.body || document.body.__packitStageTrussBottomPanels) return;
    document.body.__packitStageTrussBottomPanels = true;
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,.packit-quick-target-bottom-tabs button,[data-packit-quick-target-action]')) {
        window.setTimeout(schedule, 0);
      }
    }, true);
    ['input', 'change', 'pointerup'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-shell[data-packit-quick-target-kind="stage"],.packit-quick-shell[data-packit-quick-target-kind="truss"]')) schedule();
    }, true));
    schedule();
    window.setTimeout(schedule, 120);
    window.setTimeout(schedule, 600);
    window.setTimeout(schedule, 1400);
  }

  ROOT.QuickStageTrussBottomPanels = { VERSION, init, run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
