// PACK.IT — quick bottom panel restore.
// Visual/DOM placement only: restores and routes existing quick docs + BOM inspector UI under target bottom tabs.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.4.0-quick-bottom-panel-restore';
  let raf = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function closestPage(shell) {
    return shell && shell.closest ? (shell.closest('.packit-page') || shell.closest('.packit-shell') || document) : document;
  }

  function ensureQuickRoot(page) {
    if (!page) return null;
    if (!page._packitBottomQuickRoot) page._packitBottomQuickRoot = document.createElement('div');
    return page._packitBottomQuickRoot;
  }

  function copySectionsFromPage(page, quickRoot) {
    if (!page || !quickRoot) return quickRoot;
    const roots = [page._quickRoot, page._packitBottomQuickRoot].filter(Boolean);
    roots.forEach(src => {
      ['Stage', 'Truss', 'Led'].forEach(key => {
        const sectionKey = `_quick${key}Section`;
        const inputKey = `_quick${key}Input`;
        if (src && src[sectionKey]) quickRoot[sectionKey] = src[sectionKey];
        if (src && src[inputKey]) quickRoot[inputKey] = src[inputKey];
      });
    });
    return quickRoot;
  }

  function readField(calcRoot, key) {
    const el = calcRoot && calcRoot.querySelector ? calcRoot.querySelector(`[data-led="${key}"]`) : null;
    return el ? el.value : '';
  }

  function findStateOwner(calcRoot) {
    let node = calcRoot;
    while (node && node !== document.body) {
      if (node._v4LedState) return node;
      node = node.parentElement;
    }
    return calcRoot;
  }

  function buildLedPayload(shell) {
    const calcRoot = shell && shell.querySelector ? shell.querySelector('[data-led-calculator].v4-led-constructor') : null;
    const owner = findStateOwner(calcRoot);
    const state = owner && owner._v4LedState;
    const base = Object.assign({}, state && state.base ? state.base : {}, {
      widthM: readField(calcRoot, 'widthM') || (state && state.base && state.base.widthM),
      heightM: readField(calcRoot, 'heightM') || (state && state.base && state.base.heightM),
      format: readField(calcRoot, 'format') || (state && state.base && state.base.format),
      pitch: readField(calcRoot, 'pitch') || (state && state.base && state.base.pitch),
      cabinetWeightKg: readField(calcRoot, 'cabinetWeightKg') || (state && state.base && state.base.cabinetWeightKg),
      cabinetPowerW: readField(calcRoot, 'cabinetPowerW') || (state && state.base && state.base.cabinetPowerW),
      cabinetStartupPowerW: readField(calcRoot, 'cabinetStartupPowerW') || (state && state.base && state.base.cabinetStartupPowerW),
      legType: readField(calcRoot, 'legType') || (state && state.base && state.base.legType),
      legCount: readField(calcRoot, 'legCount') || (state && state.base && state.base.legCount),
      mountMode: readField(calcRoot, 'mountMode') || (state && state.base && state.base.mountMode)
    });
    return Object.assign({}, base, {
      layoutBlocks: (state && Array.isArray(state.parts) ? state.parts : []).map(part => ({
        id: part.id,
        name: part.name,
        type: part.type,
        colorKey: part.colorKey,
        cells: (part.cells || []).map(cell => ({ x: cell.x, y: cell.y }))
      }))
    });
  }

  function calculateLed(shell) {
    const calc = ROOT.LedCalculator;
    if (!calc || typeof calc.calculateLedLayout !== 'function') return null;
    try { return calc.calculateLedLayout(buildLedPayload(shell)); }
    catch (error) { console.warn('[PACK.IT][quick-bottom] LED summary failed', error); return null; }
  }

  function formatM(value) { return toNumber(value, 0).toFixed(2); }
  function formatKg(value) { return `${toNumber(value, 0).toFixed(1)} кг`; }
  function formatKw(value) { return `${toNumber(value, 0).toFixed(2)} кВт`; }

  function renderDocs(docsMount, page) {
    if (!docsMount || docsMount.dataset.packitQuickDocsRestored === 'true') return;
    docsMount.dataset.packitQuickDocsRestored = 'true';
    docsMount.innerHTML = `
      <div class="v4-quick-docs" data-v4-quick-docs>
        <div class="v4-kicker">No-price sheets</div>
        <h4>Техлисты сцены и ферм из shared BOM</h4>
        <p class="v4-muted">Быстрый экспорт без клиентов, цен и КП. Общий BOM теперь открывается вручную, чтобы сцена/фермы/LED не зависали от постоянной диагностики.</p>
        <div class="v4-doc-actions">
          <button type="button" class="btn-secondary" data-v4-quick-doc="stage:tech">Сцена · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="stage:warehouse">Сцена · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="truss:tech">Фермы · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="truss:warehouse">Фермы · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="led:tech">LED · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="led:warehouse">LED · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:tech">Общий техлист v4</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:warehouse">Общий склад v4</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:json">Unified JSON</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:contract">BOM contract</button>
          <button type="button" class="btn-primary" data-v4-quick-draft>В черновик сметы v4</button>
        </div>
        <pre class="v4-quick-doc-output" data-v4-quick-doc-output>Выбери лист, чтобы увидеть текст для копирования или скачивания.</pre>
        <div class="v4-doc-actions">
          <button type="button" class="btn-secondary" data-v4-quick-doc-copy disabled>Копировать</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc-download disabled>Скачать .txt</button>
        </div>
      </div>`;

    const quickRoot = ensureQuickRoot(page);
    quickRoot._v4QuickDocText = '';
    quickRoot._v4QuickDocName = 'quick-sheet.txt';
    quickRoot.querySelector = selector => docsMount.querySelector(selector) || (page && page.querySelector ? page.querySelector(selector) : null);
    quickRoot.querySelectorAll = selector => docsMount.querySelectorAll(selector);

    docsMount.querySelectorAll('[data-v4-quick-doc]').forEach(btn => btn.addEventListener('click', () => {
      const QC = ROOT.QuickCalculators;
      if (!QC || !QC.renderQuickDoc) return;
      copySectionsFromPage(page, quickRoot);
      QC.renderQuickDoc(quickRoot, btn.getAttribute('data-v4-quick-doc'));
    }));

    const draftBtn = docsMount.querySelector('[data-v4-quick-draft]');
    if (draftBtn) draftBtn.addEventListener('click', () => {
      const QC = ROOT.QuickCalculators;
      if (!QC || !QC.saveQuickQuoteDraft) return;
      copySectionsFromPage(page, quickRoot);
      QC.saveQuickQuoteDraft(quickRoot);
    });

    const copyBtn = docsMount.querySelector('[data-v4-quick-doc-copy]');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const text = quickRoot._v4QuickDocText || '';
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    });

    const downloadBtn = docsMount.querySelector('[data-v4-quick-doc-download]');
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
      const text = quickRoot._v4QuickDocText || '';
      if (!text) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = quickRoot._v4QuickDocName || 'quick-sheet.txt';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
    });
  }

  function renderBom(bomMount, page) {
    if (!bomMount || bomMount.dataset.packitQuickBomRestored === 'true') return;
    bomMount.dataset.packitQuickBomRestored = 'true';
    bomMount.innerHTML = `<div data-v4-bom-inspector></div>`;
    const slot = bomMount.querySelector('[data-v4-bom-inspector]');
    const quickRoot = ensureQuickRoot(page);
    quickRoot.querySelector = selector => {
      if (selector === '[data-v4-bom-inspector]') return slot;
      return (page && page.querySelector ? page.querySelector(selector) : null);
    };
    const QC = ROOT.QuickCalculators;
    if (QC && QC.renderQuickBomInspectorPlaceholder) QC.renderQuickBomInspectorPlaceholder(quickRoot);
  }

  function ensureLedLive(bottom) {
    let live = bottom.querySelector(':scope > .packit-led-bottom-live');
    if (!live) {
      live = document.createElement('div');
      live.className = 'packit-led-bottom-live';
      bottom.insertBefore(live, bottom.firstChild);
    }
    return live;
  }

  function activeBottomTab(tabs) {
    const active = tabs && tabs.querySelector ? tabs.querySelector('button.active') : null;
    return (active && active.textContent || 'Сводка').trim().toLowerCase();
  }

  function renderLedLive(shell, bottom, tabs) {
    const live = ensureLedLive(bottom);
    const result = calculateLed(shell) || {};
    const tab = activeBottomTab(tabs);
    const constructionCount = result.constructionCount || (Array.isArray(result.constructions) ? result.constructions.length : 0);
    const cabinetCount = result.cabinetCount || 0;
    const powerKw = result.totalPowerKw != null ? result.totalPowerKw : toNumber(result.totalPowerW, 0) / 1000;
    const startupKw = result.totalStartupPowerKw != null ? result.totalStartupPowerKw : toNumber(result.totalStartupPowerW, 0) / 1000;
    const pixels = `${result.totalPixelsX || 0}×${result.totalPixelsY || 0}`;
    const aspect = result.aspectRatioLabel || '—';
    const rows = Array.isArray(result.bomPreview) ? result.bomPreview : [];
    const powerLinks = result.powerLinks || 0;
    const rj45Links = result.rj45Links || 0;
    const powerconSchuko = result.powerconSchukoCables || 0;
    const perCable = result.powerconSchukoWattsPerCable || result.powerconSchukoPerCable || 3400;

    if (tab === 'экспорт') {
      live.hidden = true;
      return;
    }
    live.hidden = false;

    if (tab === 'bom') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">BOM preview</div><h4>Быстрый состав LED</h4><div class="packit-led-bottom-table"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th></tr></thead><tbody>${rows.slice(0, 8).map(row => `<tr><td>${escapeHtml(row.name || row.title || 'Позиция')}</td><td>${escapeHtml(row.qty || row.count || '—')}</td><td>${escapeHtml(row.weightKg != null ? formatKg(row.weightKg) : '—')}</td></tr>`).join('') || '<tr><td>LED кабинет / кабели / подвес</td><td>по расчёту</td><td>—</td></tr>'}</tbody></table></div></section>`;
      return;
    }

    if (tab === 'кабинеты') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Cabinets</div><h4>Кабинеты и геометрия</h4><div class="packit-led-bottom-cards"><article><b>${cabinetCount} шт</b><span>активные кабинеты</span></article><article><b>${formatM(result.actualWidthM)}×${formatM(result.actualHeightM)} м</b><span>фактический габарит</span></article><article><b>${pixels}</b><span>разрешение</span></article><article><b>${aspect}</b><span>соотношение сторон</span></article></div></section>`;
      return;
    }

    if (tab === 'кабели') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Cables</div><h4>Кабельная часть</h4><div class="packit-led-bottom-cards"><article><b>${powerconSchuko} шт</b><span>PowerCON–Schuko ввод</span></article><article><b>${powerLinks} шт</b><span>LED power link 220</span></article><article><b>${rj45Links} шт</b><span>RJ45 signal link</span></article><article><b>${perCable} Вт</b><span>лимит на вводную линию</span></article></div></section>`;
      return;
    }

    if (tab === 'питание') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Power</div><h4>Питание LED</h4><div class="packit-led-bottom-cards"><article><b>${formatKw(powerKw)}</b><span>макс. мощность</span></article><article><b>${formatKw(startupKw)}</b><span>пусковая мощность</span></article><article><b>${formatKw(powerKw / 2)}</b><span>средняя оценка</span></article><article><b>AC 230V</b><span>тип питания</span></article></div></section>`;
      return;
    }

    if (tab === 'json') {
      live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">JSON</div><h4>Диагностика LED state</h4><pre class="packit-led-bottom-json">${escapeHtml(JSON.stringify({ constructionCount, cabinetCount, actualWidthM: result.actualWidthM, actualHeightM: result.actualHeightM, totalWeightKg: result.totalWeightKg, totalPowerKw: powerKw, powerLinks, rj45Links, powerconSchukoCables: powerconSchuko }, null, 2))}</pre></section>`;
      return;
    }

    live.innerHTML = `<section class="packit-led-bottom-panel"><div class="v4-kicker">Summary</div><h4>Живая сводка LED-экрана</h4><div class="packit-led-bottom-cards"><article><b>${formatM(result.actualWidthM)}×${formatM(result.actualHeightM)} м</b><span>фактический габарит</span></article><article><b>${constructionCount} шт</b><span>конструкции</span></article><article><b>${cabinetCount} шт</b><span>кабинеты</span></article><article><b>${pixels}</b><span>пиксели</span></article><article><b>${formatKg(result.totalWeightKg)}</b><span>общий вес</span></article><article><b>${formatKw(powerKw)}</b><span>макс. мощность</span></article><article><b>${result.hangingBarCount || 0} / ${result.legCount || 0}</b><span>подвесы / ноги</span></article><article><b>${powerLinks} / ${rj45Links}</b><span>220 / RJ45 линки</span></article></div></section>`;
  }

  function routeBottom(shell, bottom, tabs) {
    const kind = shell && shell.dataset ? shell.dataset.packitQuickTargetKind : '';
    const tab = activeBottomTab(tabs);
    const docsMount = bottom.querySelector('#v4QuickDocsMount');
    const bomMount = bottom.querySelector('#v4QuickBomMount');
    const isLed = kind === 'led';
    if (isLed) renderLedLive(shell, bottom, tabs);
    if (docsMount) docsMount.hidden = isLed ? tab !== 'экспорт' : false;
    if (bomMount) bomMount.hidden = isLed ? tab !== 'bom' && tab !== 'экспорт' : false;
  }

  function placeBottom(shell) {
    if (!shell || !shell.querySelector) return;
    const tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    const bottom = shell.querySelector(':scope > .packit-quick-bottom');
    if (!tabs || !bottom) return;
    if (bottom.previousElementSibling !== tabs) tabs.insertAdjacentElement('afterend', bottom);

    const page = closestPage(shell);
    const docsMount = bottom.querySelector('#v4QuickDocsMount') || bottom.querySelector('[data-v4-quick-docs]') && bottom;
    const bomMount = bottom.querySelector('#v4QuickBomMount') || bottom.querySelector('[data-v4-bom-inspector]') && bottom;
    renderDocs(docsMount, page);
    renderBom(bomMount, page);
    routeBottom(shell, bottom, tabs);
    bottom.removeAttribute('data-packit-restored-bottom-empty');
  }

  function restoreAll(root) {
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell') : [];
    shells.forEach(placeBottom);
  }

  function schedule(root) {
    if (raf) return;
    const run = () => {
      raf = 0;
      restoreAll(root || document);
    };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuickBottomPanelRestore) return;
    document.body.__packitQuickBottomPanelRestore = true;
    const observer = new MutationObserver(() => schedule(document));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-v4-active-section', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,[data-packit-quick-target-action],.packit-quick-target-bottom-tabs button')) {
        window.setTimeout(() => schedule(document), 0);
      }
    }, true);
    ['input', 'change', 'pointerup'].forEach(type => document.addEventListener(type, event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-shell[data-packit-quick-target-kind="led"]')) schedule(document);
    }, true));
    schedule(document);
    window.setTimeout(() => schedule(document), 120);
    window.setTimeout(() => schedule(document), 500);
    window.setTimeout(() => schedule(document), 1200);
  }

  ROOT.QuickBottomPanelRestore = { VERSION, init, restoreAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
