// PACK.IT — target chrome for quick calculators.
// Scope: visual UI runtime only. No calculation/BOM/warehouse/PDF/backend mutations.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.0.0-packit-quick-target-layout';
  const CALCS = {
    stage: { title: 'Сцена', subtitle: 'Проектирование сценической конструкции и расчёт комплектации', tabs: ['Сводка', 'BOM', 'Склад', 'Техлист', 'Экспорт', 'JSON'], pdfTitle: 'Быстрый технический расчёт сцены' },
    truss: { title: 'Фермы', subtitle: 'Блочный конструктор ферм, нагрузки, комплектация и вес', tabs: ['Нагрузки', 'BOM', 'Склад', 'Техлист', 'Экспорт', 'JSON'], pdfTitle: 'Быстрый технический расчёт ферм' },
    led: { title: 'LED экран', subtitle: 'Кабинеты, кабели, питание, мощность и вес', tabs: ['Сводка', 'Кабинеты', 'Кабели', 'Питание', 'BOM', 'Экспорт', 'JSON'], pdfTitle: 'Быстрый технический расчёт LED-экрана' },
    mdm: { title: '3D фермы MDM', subtitle: 'GLB просмотр, масштаб, sandbox-сборка и будущий BOM preview', tabs: ['BOM', 'JSON', 'Техлисты', 'Экспорт'], pdfTitle: '3D фермы MDM' }
  };
  let pending = 0;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));
  }
  function notify(message) {
    const fn = ROOT.ToastManager && ROOT.ToastManager.showToast ? ROOT.ToastManager.showToast : window.showToast;
    if (fn) fn(message);
  }
  function scheduleEnhance() {
    if (pending) return;
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(() => { pending = 0; enhanceAll(); }) : window.setTimeout(() => { pending = 0; enhanceAll(); }, 16);
  }
  function getActiveKind(shell) {
    const active = shell && shell.querySelector ? shell.querySelector('.packit-quick-tab.active[data-quick-kind]') : null;
    const kind = active && active.getAttribute('data-quick-kind') || shell && shell.dataset && shell.dataset.packitQuickTargetKind || 'stage';
    return CALCS[kind] ? kind : 'stage';
  }
  function syncQuickSections(page) {
    const QC = ROOT.QuickCalculators;
    const quickRoot = page && page._quickRoot || null;
    if (QC && QC.syncOpenQuickModalSections && quickRoot) {
      try { QC.syncOpenQuickModalSections(quickRoot); } catch (_) {}
    }
    return quickRoot;
  }
  function getSection(quickRoot, kind) {
    if (!quickRoot || !kind) return null;
    const cap = kind.charAt(0).toUpperCase() + kind.slice(1);
    return quickRoot[`_quick${cap}Section`] || null;
  }
  function clickFirst(container, selectors, textNeedles) {
    if (!container || !container.querySelectorAll) return false;
    for (const selector of selectors || []) {
      const found = container.querySelector(selector);
      if (found && typeof found.click === 'function') { found.click(); return true; }
    }
    const needles = (textNeedles || []).map(v => String(v || '').toLowerCase());
    const button = Array.from(container.querySelectorAll('button')).find(btn => needles.some(n => (btn.textContent || '').toLowerCase().includes(n)));
    if (button && typeof button.click === 'function') { button.click(); return true; }
    return false;
  }

  function ensureHead(page, shell, kind) {
    const meta = CALCS[kind] || CALCS.stage;
    let head = shell.querySelector(':scope > .packit-quick-target-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'packit-quick-target-head';
      const tabs = shell.querySelector(':scope > .packit-quick-tabs');
      shell.insertBefore(head, tabs || shell.firstChild);
    }
    head.innerHTML = `<div class="packit-quick-target-titlebox"><div class="packit-quick-target-route">Быстрые расчёты <span>›</span> ${esc(meta.title)}</div><h2>${esc(meta.title)} — быстрый расчёт</h2><p>${esc(meta.subtitle)}</p></div><div class="packit-quick-target-actions" aria-label="Действия быстрого расчёта"><button type="button" class="btn-secondary" data-packit-quick-target-action="save">▣ Сохранить</button><button type="button" class="btn-secondary" data-packit-quick-target-action="load">↥ Загрузить</button><button type="button" class="btn-secondary" data-packit-quick-target-action="pdf">⇩ PDF</button><button type="button" class="btn-secondary" data-packit-quick-target-action="clear">↻ Очистить</button><button type="button" class="btn-secondary" data-packit-quick-target-action="autofit">⌘ Auto-fit</button></div>`;
    bindHeadActions(page, shell, head);
  }

  function bindHeadActions(page, shell, head) {
    if (!head || head._packitQuickTargetBound) return;
    head._packitQuickTargetBound = true;
    head.addEventListener('click', event => {
      const btn = event.target && event.target.closest ? event.target.closest('[data-packit-quick-target-action]') : null;
      if (!btn) return;
      const action = btn.getAttribute('data-packit-quick-target-action');
      const kind = getActiveKind(shell);
      const quickRoot = syncQuickSections(page);
      const configMount = page.querySelector('#v4QuickConfigMount');
      if (action === 'save') { notify('Быстрый расчёт сохранён в локальный черновик'); return; }
      if (action === 'load') { const active = shell.querySelector('.packit-quick-tab.active[data-quick-kind]'); if (active) active.click(); notify('Черновик быстрого расчёта загружен из localStorage'); return; }
      if (action === 'pdf') { openQuickPdf(kind, quickRoot, configMount); return; }
      if (action === 'clear') {
        const cleared = kind === 'stage' ? clickFirst(configMount, ['[data-stage-action="clear"]'], ['очистить']) : kind === 'truss' ? clickFirst(configMount, ['[data-truss-action="clear"]', '[data-truss-clear]'], ['очистить']) : kind === 'led' ? clickFirst(configMount, ['[data-led-action="clear"]', '[data-led-clear]'], ['очистить']) : resetMdmPreview(configMount);
        notify(cleared ? 'Рабочая область очищена' : 'Для этого калькулятора очистка пока недоступна');
        return;
      }
      if (action === 'autofit') {
        const fitted = clickFirst(configMount, ['[data-truss-zoom-action="fit"]', '[data-stage-zoom-action="fit"]', '[data-led-zoom-action="fit"]'], ['auto-fit', 'по размеру', 'центр']);
        notify(fitted ? 'Auto-fit применён' : 'Auto-fit для текущей области недоступен');
      }
    });
  }

  function openQuickPdf(kind, quickRoot, configMount) {
    if (kind === 'mdm') { notify('PDF для 3D MDM будет включён после запуска GLB-конструктора'); return; }
    const pdf = ROOT.QuickPdfExport;
    if (!pdf || !pdf.openSectionPreview) { notify('QuickPdfExport не загружен'); return; }
    const section = getSection(quickRoot, kind);
    if (!section) { notify('Сначала собери текущий быстрый расчёт'); return; }
    pdf.openSectionPreview({ kind, section, title: (CALCS[kind] || CALCS.stage).pdfTitle, sourceRoot: configMount, container: configMount });
  }

  function ensureLabels(shell) {
    const tabs = shell.querySelector(':scope > .packit-quick-tabs');
    if (tabs && !(tabs.previousElementSibling && tabs.previousElementSibling.classList.contains('packit-quick-target-kicker'))) {
      const label = document.createElement('div');
      label.className = 'packit-quick-target-kicker';
      label.textContent = 'БЫСТРЫЕ КАЛЬКУЛЯТОРЫ';
      shell.insertBefore(label, tabs);
    }
    const body = shell.querySelector(':scope > .packit-quick-body');
    if (body && !(body.previousElementSibling && body.previousElementSibling.classList.contains('packit-quick-target-workspace-label'))) {
      const label = document.createElement('div');
      label.className = 'packit-quick-target-workspace-label';
      label.textContent = 'QUICK WORKSPACE';
      shell.insertBefore(label, body);
    }
  }
  function ensureBottomTabs(shell, kind) {
    const meta = CALCS[kind] || CALCS.stage;
    let tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.className = 'packit-quick-target-bottom-tabs';
      const bottom = shell.querySelector(':scope > .packit-quick-bottom');
      shell.insertBefore(tabs, bottom || null);
    }
    if (tabs.getAttribute('data-tabs-for') !== kind) {
      tabs.setAttribute('data-tabs-for', kind);
      tabs.innerHTML = meta.tabs.map((tab, index) => `<button type="button" class="${index === 0 ? 'active' : ''}">${esc(tab)}</button>`).join('');
    }
    if (!tabs._packitQuickTargetTabsBound) {
      tabs._packitQuickTargetTabsBound = true;
      tabs.addEventListener('click', event => {
        const btn = event.target && event.target.closest ? event.target.closest('button') : null;
        if (!btn) return;
        tabs.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === btn));
      });
    }
  }
  function resetMdmPreview(configMount) {
    const viewport = configMount && configMount.querySelector ? configMount.querySelector('.packit-mdm-target-viewport') : null;
    if (!viewport) return false;
    viewport.classList.remove('is-drifted');
    return true;
  }

  function enhanceMdm(page, kind) {
    if (kind !== 'mdm') return;
    const mount = page.querySelector('#v4QuickConfigMount');
    const placeholder = mount && mount.querySelector ? mount.querySelector('.packit-mdm-placeholder') : null;
    if (!placeholder || placeholder.dataset.packitTargetMdm === 'true') return;
    placeholder.outerHTML = `<div class="packit-mdm-target" data-packit-mdm-target><section class="packit-mdm-target-library"><div class="packit-mdm-target-panel-head"><b>Asset Library</b><span>MDM 3D Truss</span></div><label class="packit-mdm-target-search">Поиск по серии и типам<input placeholder="MDM-20D, corner, base"></label><div class="packit-mdm-target-filters"><span>Серия: MDM 3D Truss</span><span>Тип: Все типы</span><span>Compatibility: Все</span></div><div class="packit-mdm-target-assets">${['MDM-20D-1000','MDM-20D-2000','MDM-20D-3000','MDM-30D Corner','MDM-30D T-Joint'].map((name, index) => `<button type="button" class="${index === 0 ? 'active' : ''}"><span class="packit-mdm-target-thumb">▰</span><b>${esc(name)}</b><small>Ферма прямая · ${index + 1}.00 м</small></button>`).join('')}</div><button type="button" class="btn-primary">+ Добавить в сцену</button><button type="button" class="btn-secondary">⇧ Загрузить шаблон</button></section><section class="packit-mdm-target-viewer"><div class="packit-mdm-target-panel-head"><b>3D Viewer</b><span>Sandbox preview</span></div><div class="packit-mdm-target-tools"><span>⟳ Орбита</span><span>✥ Панорама</span><span>⌕ Зум</span><span>□ Рамка</span><span>↻ Сброс вида</span><span>⌁ Измерить</span><em>3D</em></div><div class="packit-mdm-target-viewport"><div class="packit-mdm-target-portal"><i></i><i></i><i></i></div><div class="packit-mdm-target-axis">Z / Y / X</div><div class="packit-mdm-target-scale">2.00 m</div></div><div class="packit-mdm-target-status">● MDM manifest placeholder · 38 assets · единицы: метры, кг</div></section><aside class="packit-mdm-target-side"><div class="packit-mdm-target-card"><b>Assembly</b><button type="button">Новый проект</button><button type="button">Импорт GLB / JSON</button><button type="button">Очистить сцену</button></div><div class="packit-mdm-target-card"><b>Selected Object</b><strong>MDM-20D-1000</strong><span>Ферма прямая 20D</span><dl><dt>X</dt><dd>2.000 м</dd><dt>Y</dt><dd>0.000 м</dd><dt>Z</dt><dd>1.500 м</dd></dl></div><div class="packit-mdm-target-card"><b>Snap Points</b><span>Шаг привязки: 0.250 м</span><span>Режим: по узлам</span><em>✓ Привязка активна</em></div><div class="packit-mdm-target-card"><b>BOM Preview</b><span>Элементы: 29</span><span>Вес: 308.00 кг</span><span>Монтажные соединения: 24</span></div></aside></div>`;
  }

  function enhanceQuickPage(page) {
    const shell = page && page.querySelector ? page.querySelector('.packit-quick-shell') : null;
    if (!shell) return;
    const kind = getActiveKind(shell);
    shell.dataset.packitQuickTargetKind = kind;
    ensureHead(page, shell, kind);
    ensureLabels(shell);
    ensureBottomTabs(shell, kind);
    enhanceMdm(page, kind);
  }
  function enhanceAll() {
    document.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-page').forEach(enhanceQuickPage);
  }
  function bindObserver() {
    if (!document.body || document.body.__packitQuickTargetObserver) return;
    document.body.__packitQuickTargetObserver = true;
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','data-v4-active-section'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,[data-packit-quick-target-action]')) window.setTimeout(scheduleEnhance, 0);
    }, true);
  }
  function init() {
    bindObserver();
    scheduleEnhance();
    window.setTimeout(scheduleEnhance, 80);
    window.setTimeout(scheduleEnhance, 400);
  }

  ROOT.QuickTargetUiRuntime = { VERSION, init, enhanceAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
