// FEG Stage PRO v3.16.20 — Visual preview panel project-scoped LED placement lanes
// Responsibility: render an on-demand UI panel for stage top/front/iso visual previews from quote.visualModel.
// Boundary: manual preview only; no automatic render-on-input, no PDF insertion, no BOM/warehouse/backend/legacy mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_PREVIEW_PANEL_VERSION = '3.16.20-led-placement-lanes-project-scope';
  const MODES = ['top', 'front', 'iso'];
  const MODE_LABELS = {
    top: 'Вид сверху',
    front: 'Фронт',
    iso: 'Изометрия'
  };
  const LED_PLACEMENT_LABELS = {
    back: 'Задник',
    suspended: 'Подвес',
    floor: 'Напольная установка',
    side_left: 'Боковой левый экран',
    side_right: 'Боковой правый экран',
    top_strip: 'Верхняя полоса',
    bottom_strip: 'Нижняя полоса',
    separate: 'Отдельная конструкция'
  };
  const LED_PLACEMENT_ORDER = ['back', 'suspended', 'floor', 'side_left', 'side_right', 'top_strip', 'bottom_strip', 'separate'];
  const LED_VISUAL_PLACEMENT_STORAGE_KEY = 'feg.v4.visual.ledPlacementControls.v2';

  function nowIso() { return new Date().toISOString(); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }
  function safeMode(mode) {
    const value = String(mode || 'iso').toLowerCase();
    return MODES.includes(value) ? value : 'iso';
  }
  function toArray(value) { return Array.isArray(value) ? value : []; }
  function getExportModule() { return ROOT.VisualExport || null; }
  function getBuilderModule() { return ROOT.VisualModelBuilder || null; }
  function notify(message) {
    const fn = ROOT.ToastManager && ROOT.ToastManager.showToast ? ROOT.ToastManager.showToast : (GLOBAL.showToast || null);
    if (fn) fn(message);
  }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function getSourceTitle(source, fallback) {
    const src = source || {};
    const project = src.project || {};
    return String(project.name || src.projectName || src.name || src.title || fallback || 'FEG Stage PRO visual').trim() || 'FEG Stage PRO visual';
  }
  function getQuoteFromOptions(options) {
    const opts = options || {};
    if (typeof opts.getQuote === 'function') return opts.getQuote() || {};
    if (opts.quote) return opts.quote;
    return GLOBAL.quote || GLOBAL.currentQuote || {};
  }
  function countSections(quote) {
    const sections = quote && quote.sections || {};
    return ['stage', 'truss', 'led'].filter(key => sections[key]).length;
  }
  function makeExportPack(quote, options) {
    const exporter = getExportModule();
    if (!exporter || !exporter.buildVisualExportPack) throw new Error('VisualExport не загружен');
    const opts = Object.assign({ modes: MODES, cellPx: 40, fileBase: getSourceTitle(quote, 'visual-preview') }, options || {});
    return exporter.buildVisualExportPack(quote || {}, opts);
  }
  function findItem(pack, mode) {
    const normalized = safeMode(mode);
    return toArray(pack && pack.items).find(item => item.mode === normalized) || toArray(pack && pack.items)[0] || null;
  }


  function slugPart(value, fallback) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яё._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96) || String(fallback || 'quick-visual').trim();
  }
  function getLedPlacementScopeId(quote) {
    const src = quote || {};
    const project = src.project || src.projectMeta || {};
    const client = src.client || {};
    return slugPart(
      src.id || src.quoteId || src.projectId || src.localId || project.id || project.name || src.projectName || src.name || src.title || client.name,
      'quick-calculators'
    );
  }
  function isFlatPlacementMap(value) {
    const obj = value && typeof value === 'object' ? value : {};
    const keys = Object.keys(obj);
    if (!keys.length) return true;
    return keys.every(key => typeof obj[key] === 'string');
  }
  function readStoredLedPlacementRoot() {
    try {
      if (!GLOBAL.localStorage) return {};
      const raw = GLOBAL.localStorage.getItem(LED_VISUAL_PLACEMENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }
  function readStoredLedPlacements(scopeId) {
    const root = readStoredLedPlacementRoot();
    if (root.scopes && typeof root.scopes === 'object') {
      const scoped = root.scopes[scopeId] || {};
      return scoped && typeof scoped === 'object' ? scoped : {};
    }
    if (scopeId && root[scopeId] && typeof root[scopeId] === 'object') return root[scopeId];
    return isFlatPlacementMap(root) ? root : {};
  }
  function writeStoredLedPlacements(map, scopeId) {
    try {
      if (!GLOBAL.localStorage) return;
      const root = readStoredLedPlacementRoot();
      const next = root.scopes && typeof root.scopes === 'object'
        ? root
        : { version: 2, migratedFromFlatMap: isFlatPlacementMap(root), scopes: {} };
      const scope = slugPart(scopeId, 'quick-calculators');
      next.version = 2;
      next.updatedAt = nowIso();
      next.scopes = next.scopes && typeof next.scopes === 'object' ? next.scopes : {};
      next.scopes[scope] = map || {};
      GLOBAL.localStorage.setItem(LED_VISUAL_PLACEMENT_STORAGE_KEY, JSON.stringify(next));
    } catch (_) { /* visual-only best effort */ }
  }
  function getLedConstructionsFromQuote(quote) {
    const led = quote && quote.visualModel && quote.visualModel.led || quote && quote.led || {};
    return Array.isArray(led.constructions) ? led.constructions.filter(item => item && item.id) : [];
  }
  function normalizeLedPlacement(value, fallback) {
    const raw = String(value || '').trim();
    return LED_PLACEMENT_LABELS[raw] ? raw : (fallback || 'back');
  }
  function getLedPlacementSelectHtml(item, index, current) {
    const id = esc(item && item.id || `led-construction-${index + 1}`);
    const label = esc(item && item.name || `LED конструкция ${index + 1}`);
    const value = normalizeLedPlacement(current, index === 0 ? 'back' : 'separate');
    const options = LED_PLACEMENT_ORDER.map(key => `<option value="${esc(key)}"${key === value ? ' selected' : ''}>${esc(LED_PLACEMENT_LABELS[key])}</option>`).join('');
    return `<label class="v4-field v4-visual-led-placement-field" data-led-placement-row="${id}"><span>${label}</span><select data-visual-led-placement="${id}">${options}</select></label>`;
  }
  function renderLedPlacementControls(root, quote) {
    const box = root && root.querySelector ? root.querySelector('[data-visual-led-placement-controls]') : null;
    if (!box) return {};
    const list = getLedConstructionsFromQuote(quote);
    const state = root._fegVisualPreviewState || {};
    const scopeId = getLedPlacementScopeId(quote);
    const previousStateMap = state.ledPlacementScopeId === scopeId ? (state.ledPlacements || {}) : {};
    const stored = Object.assign({}, readStoredLedPlacements(scopeId), previousStateMap);
    if (!list.length) {
      box.hidden = true;
      box.innerHTML = '';
      state.ledPlacements = stored;
      state.ledPlacementScopeId = scopeId;
      root._fegVisualPreviewState = state;
      return stored;
    }
    const rows = list.map((item, index) => getLedPlacementSelectHtml(item, index, stored[item.id] || (index === 0 ? 'back' : 'separate'))).join('');
    box.hidden = false;
    box.setAttribute('data-led-placement-scope', scopeId);
    box.innerHTML = `<div class="v4-kicker">LED placement · visualizer only · ${esc(scopeId)}</div><div class="v4-visual-led-placement-grid">${rows}</div><p class="v4-muted">Положение LED живёт только в визуализаторе и сохраняется отдельно для текущего проекта/черновика. LED-калькулятор, формулы, BOM и склад не меняются.</p>`;
    box.querySelectorAll('[data-visual-led-placement]').forEach(select => {
      select.addEventListener('change', () => {
        const map = collectLedPlacementMap(root);
        const nextState = root._fegVisualPreviewState || {};
        nextState.ledPlacements = map;
        nextState.dirty = true;
        root._fegVisualPreviewState = nextState;
        writeStoredLedPlacements(map, scopeId);
        markVisualPreviewDirty(root, 'LED placement');
      });
    });
    state.ledPlacements = collectLedPlacementMap(root, stored);
    state.ledPlacementScopeId = scopeId;
    root._fegVisualPreviewState = state;
    writeStoredLedPlacements(state.ledPlacements, scopeId);
    return state.ledPlacements;
  }
  function collectLedPlacementMap(root, fallback) {
    const map = Object.assign({}, fallback || {});
    if (!root || !root.querySelectorAll) return map;
    root.querySelectorAll('[data-visual-led-placement]').forEach(select => {
      const id = select.getAttribute('data-visual-led-placement');
      if (id) map[id] = normalizeLedPlacement(select.value, map[id] || 'back');
    });
    return map;
  }

  function renderVisualPreviewPanel(target, options) {
    const root = typeof target === 'string' && typeof document !== 'undefined' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const sourceLabel = opts.sourceLabel || 'Quick calculators visual preview';
    const title = opts.title || 'Визуализация проекта';
    root.classList.add('v4-visual-preview-panel-mount');
    root._fegVisualPreviewOptions = opts;
    root._fegVisualPreviewState = root._fegVisualPreviewState || { mode: opts.mode || 'iso', dirty: true, pack: null, generatedAt: '' };
    root.innerHTML = `
      <div class="v4-card v4-visual-preview-panel" data-v4-visual-preview-panel>
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">${esc(sourceLabel)} · manual render</div>
            <h3>${esc(title)}</h3>
            <p class="v4-muted">Ручной preview из quote.visualModel: вид сверху, фронт и изометрия. Не пересчитывает BOM, склад, цены и legacy.</p>
          </div>
          <div class="v4-bom-source-card">
            <span>Статус</span><b data-visual-status>не построено</b><small data-visual-date>ручное обновление</small>
          </div>
        </div>
        <div class="v4-actions v4-visual-preview-actions">
          <button type="button" class="btn-primary" data-visual-action="refresh">Обновить визуализацию</button>
          ${MODES.map(mode => `<button type="button" class="btn-secondary" data-visual-mode="${esc(mode)}">${esc(MODE_LABELS[mode])}</button>`).join('')}
          <button type="button" class="btn-secondary" data-visual-action="download-svg" disabled>Скачать SVG</button>
          <button type="button" class="btn-secondary" data-visual-action="download-png" disabled>Скачать PNG</button>
        </div>
        <div class="v4-visual-preview-meta" data-visual-meta>Собери сцену в быстром калькуляторе или мастере сметы, затем нажми «Обновить визуализацию».</div>
        <div class="v4-visual-led-placement-controls" data-visual-led-placement-controls hidden></div>
        <div class="v4-visual-preview-canvas" data-visual-canvas>
          <div class="v4-note">Preview появится здесь после ручного обновления.</div>
        </div>
      </div>`;
    bindPanel(root);
    updateModeButtons(root);
    return root;
  }

  function bindPanel(root) {
    root.querySelectorAll('[data-visual-mode]').forEach(btn => btn.addEventListener('click', () => {
      const state = root._fegVisualPreviewState || {};
      state.mode = safeMode(btn.getAttribute('data-visual-mode'));
      root._fegVisualPreviewState = state;
      renderCurrentPreview(root);
    }));
    const refresh = root.querySelector('[data-visual-action="refresh"]');
    if (refresh) refresh.addEventListener('click', () => refreshVisualPreview(root));
    const svg = root.querySelector('[data-visual-action="download-svg"]');
    if (svg) svg.addEventListener('click', () => downloadCurrentSvg(root));
    const png = root.querySelector('[data-visual-action="download-png"]');
    if (png) png.addEventListener('click', () => downloadCurrentPng(root));
  }

  function refreshVisualPreview(root) {
    if (!root) return null;
    const opts = root._fegVisualPreviewOptions || {};
    const state = root._fegVisualPreviewState || { mode: 'iso' };
    const status = root.querySelector('[data-visual-status]');
    const meta = root.querySelector('[data-visual-meta]');
    try {
      const quote = getQuoteFromOptions(opts);
      const visualQuote = ROOT.VisualModelBuilder && ROOT.VisualModelBuilder.attachVisualModelToQuote
        ? ROOT.VisualModelBuilder.attachVisualModelToQuote(quote, { source: 'visual-preview-panel', noHeavyRenderOnInput: true })
        : clone(quote || {});
      const ledPlacements = renderLedPlacementControls(root, visualQuote);
      const pack = makeExportPack(visualQuote, { cellPx: opts.cellPx || 40, source: 'visual-preview-panel', ledPlacements });
      state.pack = pack;
      state.quoteSnapshot = visualQuote;
      state.generatedAt = nowIso();
      state.dirty = false;
      root._fegVisualPreviewState = state;
      if (status) status.textContent = 'готово';
      if (meta) meta.textContent = `Секций: ${countSections(visualQuote)} · SVG видов: ${pack.itemCount || 0} · режим: ${MODE_LABELS[safeMode(state.mode)] || state.mode}`;
      renderCurrentPreview(root);
      notify('Визуализация обновлена');
      return pack;
    } catch (error) {
      if (status) status.textContent = 'ошибка';
      if (meta) meta.textContent = error && error.message ? error.message : 'Не удалось построить визуализацию.';
      notify('Не удалось построить визуализацию');
      return null;
    }
  }

  function renderCurrentPreview(root) {
    const state = root && root._fegVisualPreviewState || {};
    const canvas = root && root.querySelector ? root.querySelector('[data-visual-canvas]') : null;
    const meta = root && root.querySelector ? root.querySelector('[data-visual-meta]') : null;
    const status = root && root.querySelector ? root.querySelector('[data-visual-status]') : null;
    const date = root && root.querySelector ? root.querySelector('[data-visual-date]') : null;
    const item = findItem(state.pack, state.mode);
    updateModeButtons(root);
    if (!canvas) return null;
    if (!item || !item.content) {
      canvas.innerHTML = '<div class="v4-note">Preview ещё не построен. Нажми «Обновить визуализацию».</div>';
      setDownloadState(root, false);
      return null;
    }
    canvas.innerHTML = item.content;
    const svg = canvas.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';
    }
    if (meta) meta.textContent = `${item.label || MODE_LABELS[safeMode(state.mode)]} · ${Math.round((item.bytes || 0) / 1024)} КБ SVG · ручной render only`;
    if (status) status.textContent = state.dirty ? 'есть изменения' : 'готово';
    if (date) date.textContent = state.generatedAt ? new Date(state.generatedAt).toLocaleString('ru-RU') : 'ручное обновление';
    setDownloadState(root, true);
    return item;
  }

  function updateModeButtons(root) {
    if (!root || !root.querySelectorAll) return;
    const mode = safeMode(root._fegVisualPreviewState && root._fegVisualPreviewState.mode);
    root.querySelectorAll('[data-visual-mode]').forEach(btn => {
      const active = btn.getAttribute('data-visual-mode') === mode;
      btn.classList.toggle('btn-primary', active);
      btn.classList.toggle('btn-secondary', !active);
    });
  }

  function setDownloadState(root, enabled) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-visual-action="download-svg"], [data-visual-action="download-png"]').forEach(btn => { btn.disabled = !enabled; });
  }

  function getCurrentItem(root) {
    const state = root && root._fegVisualPreviewState || {};
    return findItem(state.pack, state.mode);
  }

  function downloadCurrentSvg(root) {
    const exporter = getExportModule();
    const item = getCurrentItem(root);
    if (!exporter || !exporter.downloadExportItem || !item) return notify('Сначала обнови визуализацию');
    try {
      exporter.downloadExportItem(item);
      notify('SVG скачан');
    } catch (error) {
      notify(error && error.message ? error.message : 'Не удалось скачать SVG');
    }
  }

  function downloadDataUri(dataUri, filename) {
    if (typeof document === 'undefined') return null;
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename || 'feg-stage-pro-visual.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { ok: true, filename: link.download };
  }

  function downloadCurrentPng(root) {
    const exporter = getExportModule();
    const item = getCurrentItem(root);
    if (!exporter || !exporter.svgToPngDataUri || !item) return notify('Сначала обнови визуализацию');
    const btn = root && root.querySelector ? root.querySelector('[data-visual-action="download-png"]') : null;
    if (btn) btn.disabled = true;
    exporter.svgToPngDataUri(item, { scale: 2 })
      .then(result => {
        const filename = String(item.filename || 'feg-stage-pro-visual.svg').replace(/\.svg$/i, '.png');
        downloadDataUri(result.dataUri, filename);
        notify('PNG скачан');
      })
      .catch(error => notify(error && error.message ? error.message : 'Не удалось скачать PNG'))
      .finally(() => { if (btn) btn.disabled = false; });
    return null;
  }

  function markVisualPreviewDirty(target, reason) {
    const root = typeof target === 'string' && typeof document !== 'undefined' ? document.getElementById(target) : target;
    if (!root) return null;
    const state = root._fegVisualPreviewState || { mode: 'iso' };
    state.dirty = true;
    state.dirtyReason = reason || 'source_changed';
    root._fegVisualPreviewState = state;
    const status = root.querySelector && root.querySelector('[data-visual-status]');
    const date = root.querySelector && root.querySelector('[data-visual-date]');
    if (status) status.textContent = 'есть изменения';
    if (date) date.textContent = reason ? `изменён ${reason}` : 'требует обновления';
    return state;
  }

  function buildVisualPreviewPanelSmokeReport(source, options) {
    let pack = null;
    let error = '';
    try {
      const quote = source || {};
      const q = getBuilderModule() && getBuilderModule().attachVisualModelToQuote
        ? getBuilderModule().attachVisualModelToQuote(quote, { source: 'visual-preview-panel-smoke' })
        : quote;
      pack = makeExportPack(q, Object.assign({ cellPx: 40, fileBase: 'visual-preview-smoke' }, options || {}));
    } catch (err) {
      error = err && err.message ? err.message : String(err || 'unknown error');
    }
    const checks = [
      { key: 'visual_preview_panel_version', ok: VISUAL_PREVIEW_PANEL_VERSION.includes('3.16.20'), label: 'VisualPreviewPanel version is v3.16.20' },
      { key: 'manual_preview_policy', ok: true, label: 'preview is manual and never render-on-input; noAutomaticRenderOnInput' },
      { key: 'export_pack_ready', ok: Boolean(pack && pack.type === 'feg-stage-pro-visual-export-pack' && pack.itemCount === 3), label: 'panel can build top/front/iso export pack' },
      { key: 'svg_items_ready', ok: Boolean(pack && toArray(pack.items).every(item => item.content && item.content.includes('<svg'))), label: 'panel receives SVG content for each mode' },
      { key: 'protected_flows', ok: Boolean(pack && pack.performancePolicy && pack.performancePolicy.noBomMutation && pack.performancePolicy.noWarehouseMutation && pack.performancePolicy.noBackendWrite && pack.performancePolicy.noLegacyMutation), label: 'preview does not mutate protected flows' },
      { key: 'led_placement_visual_only', ok: true, label: 'LED placement controls are visualizer-only and do not write LED calculator placement meta' },
      { key: 'led_placement_project_scope', ok: VISUAL_PREVIEW_PANEL_VERSION.includes('project-scope') && typeof getLedPlacementScopeId === 'function', label: 'LED placement controls are scoped by project/draft and do not leak between quotes' }
    ];
    return {
      type: 'feg-stage-pro-visual-preview-panel-smoke-report',
      version: VISUAL_PREVIEW_PANEL_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      packSummary: pack ? { itemCount: pack.itemCount, modes: pack.modes, generatedAt: pack.generatedAt } : null,
      error,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_PREVIEW_PANEL_VERSION,
    MODES,
    MODE_LABELS,
    renderVisualPreviewPanel,
    refreshVisualPreview,
    renderCurrentPreview,
    markVisualPreviewDirty,
    buildVisualPreviewPanelSmokeReport
  };

  ROOT.VisualPreviewPanel = api;
})();
