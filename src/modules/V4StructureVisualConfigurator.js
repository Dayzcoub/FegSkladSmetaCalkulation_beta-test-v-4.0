// FEG Stage PRO v3.17.43 — V4StructureVisualConfigurator
// Shared visual stage/truss configurators for technicians and managers.
// One UI layer, one V4StructureConfigurator BOM source, legacy v3 kept as fallback only.
// v3.17.43: quick and quote truss stools share top-frame dimension policy.
(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '3.15.51';
  const DEFAULT_STAGE_GRID_COLS = 14;
  const DEFAULT_STAGE_GRID_ROWS = 10;
  const DEFAULT_STAGE_HEIGHT_M = 0.8;
  const TRUSS_TOP_NODE_HEIGHT_M = 0.5;
  const TRUSS_3D_NODE_TYPES = Object.freeze(['cornerU012','cornerU020','cornerU022','cornerU024']);
  const TRUSS_T_NODE_TYPES = Object.freeze(['cornerU017']);

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
  function attr(value) { return esc(value).replace(/'/g, '&#39;'); }
  function num(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function clamp(value, min, max, fallback) { const n = Math.round(num(value, fallback)); return Math.max(min, Math.min(max, n)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function money(value) { return `${Number(value || 0).toLocaleString('ru-RU')} ₽`; }
  function metric(value, digits) { return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: typeof digits === 'number' ? digits : 1 }); }
  function weight(value) { return `${metric(value, 1)} кг`; }
  function stageDefaultHeightForSupport(supportKey) {
    const svc = structure();
    if (svc && svc.getStageDefaultHeightForSupport) return svc.getStageDefaultHeightForSupport(supportKey);
    return String(supportKey || '') === 'stage_support_low' ? 0.4 : (String(supportKey || '') === 'stage_support_high' ? 1.1 : DEFAULT_STAGE_HEIGHT_M);
  }

  function hasStageHeightValue(source) {
    const src = source || {};
    const value = src.stageHeightM != null ? src.stageHeightM : (src.heightM != null ? src.heightM : (src.stageHeight != null ? src.stageHeight : src.height));
    return value != null && String(value).trim() !== '';
  }

  function stageHeightFromSource(source) {
    const src = source || {};
    const value = src.stageHeightM != null ? src.stageHeightM : (src.heightM != null ? src.heightM : (src.stageHeight != null ? src.stageHeight : src.height));
    const fallback = stageDefaultHeightForSupport(src.supportKey || src.stageSupportKey || src.columnType && `stage_support_${src.columnType}` || 'stage_support_middle');
    const height = hasStageHeightValue(src) ? num(value, fallback) : fallback;
    return Math.max(0, Math.round(height * 100) / 100);
  }
  function stageHeightText(value) {
    return `${metric(stageHeightFromSource({ stageHeightM:value }), 2)} м`;
  }
  let activeStageDrawRoot = null;
  function stopStageDrawTracking(root) {
    if (activeStageDrawRoot && (!root || activeStageDrawRoot === root)) activeStageDrawRoot = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointermove', onStageDocumentPointerMove);
      document.removeEventListener('pointerup', onStageDocumentPointerUp);
      document.removeEventListener('pointercancel', onStageDocumentPointerUp);
    }
  }
  function startStageDrawTracking(root) {
    stopStageDrawTracking();
    activeStageDrawRoot = root || null;
    if (activeStageDrawRoot && typeof document !== 'undefined') {
      document.addEventListener('pointermove', onStageDocumentPointerMove, { passive:false });
      document.addEventListener('pointerup', onStageDocumentPointerUp);
      document.addEventListener('pointercancel', onStageDocumentPointerUp);
    }
  }
  function onStageDocumentPointerMove(event) {
    if (activeStageDrawRoot) handleStageGridPointerMove(activeStageDrawRoot, event);
  }
  function onStageDocumentPointerUp() {
    const root = activeStageDrawRoot;
    if (root) finishStageDrawing(root);
    else stopStageDrawTracking();
  }
  function makeId(prefix) { return `${prefix || 'v4'}_${Date.now().toString(36)}_${Math.floor(Math.random() * 100000).toString(36)}`; }
  function calcStage() { return ROOT.StageCalculator || null; }
  function structure() { return ROOT.V4StructureConfigurator || null; }
  function trussModule() { return ROOT.TrussBlockConstructor || null; }
  function loadChecker() { return ROOT.LoadChecker || null; }
  function stageCatalog() {
    const svc = structure();
    return svc && svc.getStageConstructiveCatalog ? svc.getStageConstructiveCatalog() : { deckVariants:[], supportVariants:[], frameVariants:[] };
  }
  function optionHtml(items, selected) {
    return (Array.isArray(items) ? items : []).map(item => `<option value="${attr(item.key)}"${String(selected || '') === String(item.key) ? ' selected' : ''}>${esc(item.label || item.key)}</option>`).join('');
  }

  function subrentorRows() {
    const dir = ROOT.SupplierDirectory;
    if (!dir) return [];
    if (dir.listSubrentors) return dir.listSubrentors({ onlyActive:true });
    if (dir.listSuppliers) return dir.listSuppliers({ type:'subrent', onlyActive:true });
    return [];
  }

  function subrentorLabel(row) {
    if (!row) return '';
    if (ROOT.SupplierDirectory && ROOT.SupplierDirectory.formatSupplierLabel) return ROOT.SupplierDirectory.formatSupplierLabel(row);
    return row.name || row.id || '';
  }

  function renderTrussSubrentorOptions(selectedId, selectedName) {
    const rows = subrentorRows();
    const selected = String(selectedId || '').trim();
    const selectedLabel = String(selectedName || '').trim();
    const known = selected && rows.some(row => String(row.id || '') === selected);
    const legacy = !known && selectedLabel ? `<option value="${attr(selected || selectedLabel)}" selected>${esc(selectedLabel)} · legacy</option>` : '';
    return `<option value="">Выбрать субарендатора</option>${legacy}${rows.map(row => `<option value="${attr(row.id)}"${String(row.id || '') === selected ? ' selected' : ''}>${esc(subrentorLabel(row))}</option>`).join('')}`;
  }

  function updateTrussSubrentorHidden(row, supplierRecord) {
    if (!row) return null;
    const select = row.querySelector('[data-truss-subrent-field="supplierId"]');
    const hidden = row.querySelector('[data-truss-subrent-field="supplierName"]');
    const supplier = supplierRecord || (select && select.value && ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(select.value) : null);
    const selectedText = select && select.options && select.selectedIndex >= 0 ? (select.options[select.selectedIndex].textContent || '') : '';
    const name = supplier && supplier.name ? supplier.name : selectedText.replace(/ · legacy$/, '').trim();
    if (hidden) hidden.value = select && select.value ? name : '';
    return supplier || { id: select && select.value || '', name };
  }
  function currentStageConfig(root) {
    const svc = structure();
    if (!svc || !svc.normalizeStageConfig) return { deckKey:'stage_deck_1200', moduleWidthM:1.2, moduleDepthM:1.2, supportKey:'stage_support_middle', frameKey:'stage_frame_low' };
    return svc.normalizeStageConfig({
      deckKey: root && root.querySelector('[data-stage-deck]') && root.querySelector('[data-stage-deck]').value,
      supportKey: root && root.querySelector('[data-stage-support]') && root.querySelector('[data-stage-support]').value,
      frameKey: root && root.querySelector('[data-stage-frame]') && root.querySelector('[data-stage-frame]').value
    });
  }


  function stageFrameKeyForSupport(supportKey) {
    const svc = structure();
    if (svc && svc.getStageFrameKeyForSupport) return svc.getStageFrameKeyForSupport(supportKey);
    return String(supportKey || '') === 'stage_support_low' ? 'stage_frame_low' : 'stage_frame_high';
  }

  function stageFrameDependencyText(supportKey) {
    return String(supportKey || '') === 'stage_support_low'
      ? 'Низкий столб → низкая перекладина.'
      : 'Средний/высокий столб → средняя перекладина.';
  }

  function stageFrameLabelForKey(frameKey) {
    const variants = stageCatalog().frameVariants || [];
    const found = variants.find(item => item && item.key === frameKey);
    return found && found.label || (frameKey === 'stage_frame_low' ? 'Перекладина низкая' : 'Перекладина средняя');
  }

  function stageHeightDefaultText(supportKey) {
    return `По умолчанию для выбранного столба: ${stageHeightText(stageDefaultHeightForSupport(supportKey))}`;
  }

  function syncStageHeightWithSupport(root, options) {
    const supportEl = root && root.querySelector ? root.querySelector('[data-stage-support]') : null;
    const heightEl = root && root.querySelector ? root.querySelector('[data-stage-height]') : null;
    const noteEl = root && root.querySelector ? root.querySelector('[data-stage-height-default-note]') : null;
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!supportEl || !heightEl || !state) return null;
    const supportKey = supportEl.value || 'stage_support_middle';
    const nextDefault = stageDefaultHeightForSupport(supportKey);
    const previousSupport = state.lastSupportKey || supportKey;
    const previousDefault = stageDefaultHeightForSupport(previousSupport);
    const currentValue = stageHeightFromSource({ stageHeightM:heightEl.value, supportKey:previousSupport });
    const opts = options || {};
    const canAutoSet = opts.force || !state.heightWasManual || Math.abs(currentValue - previousDefault) < 0.001;
    if (canAutoSet) {
      state.stageHeightM = nextDefault;
      state.heightWasManual = false;
      state.stageHeightAutoForSupport = true;
      heightEl.value = String(nextDefault);
    } else {
      state.stageHeightM = currentValue;
      state.stageHeightAutoForSupport = false;
    }
    state.lastSupportKey = supportKey;
    if (noteEl) noteEl.textContent = `${stageHeightDefaultText(supportKey)}${state.stageHeightAutoForSupport ? '' : ' · сейчас вручную скорректировано'}`;
    return { supportKey, defaultHeightM:nextDefault, autoApplied:!!canAutoSet };
  }

  function syncStageFrameWithSupport(root) {
    const supportEl = root && root.querySelector ? root.querySelector('[data-stage-support]') : null;
    const frameEl = root && root.querySelector ? root.querySelector('[data-stage-frame]') : null;
    const noteEl = root && root.querySelector ? root.querySelector('[data-stage-frame-dependency-note]') : null;
    const labelEl = root && root.querySelector ? root.querySelector('[data-stage-frame-label]') : null;
    if (!supportEl || !frameEl) return null;
    const required = stageFrameKeyForSupport(supportEl.value);
    const before = frameEl.value;
    frameEl.value = required;
    frameEl.dataset.autoFrameForSupport = supportEl.value || '';
    frameEl.title = stageFrameDependencyText(supportEl.value);
    if (labelEl) labelEl.textContent = stageFrameLabelForKey(required);
    if (noteEl) noteEl.textContent = stageFrameDependencyText(supportEl.value);
    return { requiredFrameKey:required, changed:before !== required };
  }

  function stageModulesFromInput(input) {
    const calc = calcStage();
    const source = input || {};
    if (Array.isArray(source.modules)) return source.modules.map(p => ({ x:num(p.x, 0), y:num(p.y, 0) }));
    if (source.explicitEmpty || source.startEmpty || source.cleanStart) return [];
    const hasPreset = source.widthModules != null || source.depthModules != null;
    if (!hasPreset) return [];
    const w = clamp(source.widthModules || 4, 1, 40, 4);
    const d = clamp(source.depthModules || 3, 1, 40, 3);
    if (calc && calc.rectangleModules) {
      const rect = calc.rectangleModules(w, d, Math.max(8, w + 4), Math.max(6, d + 3));
      return rect && Array.isArray(rect.modules) ? rect.modules : [];
    }
    const out = [];
    for (let y = 0; y < d; y += 1) for (let x = 0; x < w; x += 1) out.push({ x, y });
    return out;
  }

  function stageSetFromModules(modules, calc) {
    const c = calc || calcStage();
    return new Set((Array.isArray(modules) ? modules : [])
      .filter(p => Number.isFinite(Number(p && p.x)) && Number.isFinite(Number(p && p.y)))
      .map(p => c && c.moduleKey ? c.moduleKey(Math.round(num(p.x, 0)), Math.round(num(p.y, 0))) : `${Math.round(num(p.x, 0))},${Math.round(num(p.y, 0))}`));
  }

  function stageStairsFromInput(input) {
    const source = input || {};
    const raw = Array.isArray(source.stairs) ? source.stairs : (source.accessories && Array.isArray(source.accessories.stairs) ? source.accessories.stairs : (Array.isArray(source.stairBlocks) ? source.stairBlocks : []));
    return (Array.isArray(raw) ? raw : [])
      .filter(p => Number.isFinite(Number(p && p.x)) && Number.isFinite(Number(p && p.y)))
      .map(p => ({ x:Math.round(num(p.x, 0)), y:Math.round(num(p.y, 0)), orientation:p.orientation || 'front' }));
  }

  function getStageStairs(state) {
    const calc = calcStage();
    if (!state || !calc) return [];
    return Array.from(state.stairs || []).map(key => {
      const [x, y] = String(key).split(',').map(Number);
      return { x, y, key, orientation:'front' };
    }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  function getStagePlanPoints(state) {
    return getStageModules(state).concat(getStageStairs(state));
  }

  function getStageModules(state) {
    const calc = calcStage();
    if (!state || !calc) return [];
    return calc.modulesFromSet ? calc.modulesFromSet(state.selected || new Set()) : Array.from(state.selected || []).map(key => {
      const [x, y] = String(key).split(',').map(Number);
      return { x, y };
    }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  function ensureStageCanvasFits(state, modules, padding) {
    if (!state) return;
    const list = Array.isArray(modules) ? modules : getStageModules(state);
    const pad = Math.max(1, Math.round(num(padding, 2)));
    if (!list.length) {
      state.gridCols = Math.max(DEFAULT_STAGE_GRID_COLS, Math.round(num(state.gridCols, DEFAULT_STAGE_GRID_COLS)));
      state.gridRows = Math.max(DEFAULT_STAGE_GRID_ROWS, Math.round(num(state.gridRows, DEFAULT_STAGE_GRID_ROWS)));
      return;
    }
    const maxX = Math.max(...list.map(p => Math.round(num(p.x, 0))));
    const maxY = Math.max(...list.map(p => Math.round(num(p.y, 0))));
    state.gridCols = Math.max(DEFAULT_STAGE_GRID_COLS, Math.round(num(state.gridCols, DEFAULT_STAGE_GRID_COLS)), maxX + 1 + pad);
    state.gridRows = Math.max(DEFAULT_STAGE_GRID_ROWS, Math.round(num(state.gridRows, DEFAULT_STAGE_GRID_ROWS)), maxY + 1 + pad);
  }

  function centerStageModulesInCanvas(modules, state) {
    const calc = calcStage();
    const list = Array.isArray(modules) ? modules : [];
    if (!list.length || !calc || !calc.centerModulesInGrid) return list;
    ensureStageCanvasFits(state, list, 2);
    return calc.centerModulesInGrid(list, state.gridCols, state.gridRows);
  }

  function shouldPreserveStagePlanCoordinates(source) {
    const s = source || {};
    return Array.isArray(s.modules) && (
      s.preserveGridCoordinates === true ||
      s.coordinateMode === 'grid-preserve' ||
      s.stageDraftMode === 'grid-preserve' ||
      s.gridCols != null ||
      s.gridRows != null ||
      s.mode === 'toggle' ||
      s.source === 'quick-calculators-local-draft'
    );
  }

  function normalizeStageInputModules(modules, state, source) {
    const calc = calcStage();
    const list = Array.isArray(modules) ? modules : [];
    if (!list.length || !calc || !calc.centerModulesInGrid) return list;
    if (shouldPreserveStagePlanCoordinates(source)) return list;
    return calc.centerModulesInGrid(list, state.gridCols, state.gridRows);
  }

  function normalizeStageState(input) {
    const calc = calcStage();
    const source = input || {};
    const modules = stageModulesFromInput(source);
    const bounds = calc && calc.getStageBounds ? calc.getStageBounds(modules) : { width: 0, depth: 0 };
    const cols = Math.max(DEFAULT_STAGE_GRID_COLS, clamp(source.gridCols, 6, 40, Math.max(DEFAULT_STAGE_GRID_COLS, (bounds.width || 0) + 4)));
    const rows = Math.max(DEFAULT_STAGE_GRID_ROWS, clamp(source.gridRows, 6, 32, Math.max(DEFAULT_STAGE_GRID_ROWS, (bounds.depth || 0) + 3)));
    const supportKey = source.supportKey || source.stageSupportKey || source.columnType && `stage_support_${source.columnType}` || 'stage_support_middle';
    const hasHeight = hasStageHeightValue(source);
    const state = {
      kind:'stage',
      version:VERSION,
      gridCols:cols,
      gridRows:rows,
      mode:'toggle',
      activeTool:(source.activeTool === 'stair' ? 'stair' : 'deck'),
      selected:new Set(),
      stairs:new Set(),
      stageHeightM:stageHeightFromSource(Object.assign({}, source, { supportKey })),
      heightWasManual:hasHeight,
      stageHeightAutoForSupport:!hasHeight,
      lastSupportKey:supportKey,
      lastSection:null,
      lastWarnings:[],
      preserveGridCoordinates:shouldPreserveStagePlanCoordinates(source)
    };
    const normalized = normalizeStageInputModules(modules, state, source);
    state.selected = stageSetFromModules(normalized, calc);
    state.stairs = stageSetFromModules(stageStairsFromInput(source), calc);
    ensureStageCanvasFits(state, normalized.concat(getStageStairs(state)), 2);
    return state;
  }

  function renderStageConfigurator(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    if (!calcStage() || !structure()) {
      root.innerHTML = '<div class="v4-note">StageCalculator или V4StructureConfigurator не загружен.</div>';
      return null;
    }
    const opts = options || {};
    const compactQuote = opts.mode === 'quote';
    const input = opts.input || { explicitEmpty:true };
    const initialSupportKey = input.supportKey || input.stageSupportKey || input.columnType && `stage_support_${input.columnType}` || 'stage_support_middle';
    const initialFrameKey = stageFrameKeyForSupport(initialSupportKey);
    const initialHeightM = stageHeightFromSource(Object.assign({}, input, { supportKey:initialSupportKey }));
    const state = normalizeStageState(input);
    root._v4StructureVisual = { kind:'stage', state, options:opts };
    root.innerHTML = `
      <div class="v4-structure-editor v4-structure-stage v4-stage-polish" data-v4-structure-stage>
        ${compactQuote ? '' : `<div class="v4-structure-toolbar">
          <div>
            <div class="v4-kicker">${esc('technician quick stage configurator')}</div>
            <h4>${esc(opts.title || 'Сцена · визуальный конструктор')}</h4>
            <p class="v4-muted">Сцена v4 теперь работает как чистый блочный конструктор: добавляй/удаляй модули, собирай пресеты, а BOM сразу идёт в общий контракт STG-901…911.</p>
          </div>
        </div>`}
        <div class="v4-stage-template-panel">
          <div class="v4-truss-template-head">
            <div class="v4-kicker">быстрое построение сцены</div>
            <div class="v4-truss-mode-pill v4-stage-draw-pill" data-stage-draw-label>Клик / протяжка: добавить или удалить</div>
          </div>
          <div class="v4-stage-controls-layout">
            <div class="v4-stage-control-stack v4-stage-control-stack--build">
              <label class="v4-field">Тип настила<select data-stage-deck>${optionHtml(stageCatalog().deckVariants, input.deckKey || 'stage_deck_1200')}</select></label>
              <label class="v4-field">Тип столбов<select data-stage-support>${optionHtml(stageCatalog().supportVariants, initialSupportKey)}</select></label>
              <div class="v4-stage-frame-auto-card v4-stage-frame-auto-card--compact">
                <input type="hidden" data-stage-frame value="${attr(initialFrameKey)}">
                <span>Перекладина</span>
                <b data-stage-frame-label>${esc(stageFrameLabelForKey(initialFrameKey))}</b>
                <small data-stage-frame-dependency-note class="v4-stage-frame-note">${esc(stageFrameDependencyText(initialSupportKey))}</small>
              </div>
            </div>
            <div class="v4-stage-control-stack v4-stage-control-stack--dimensions">
              <label class="v4-field">Ширина, мод.<input data-stage-preset="w" type="number" min="1" step="1" value="${attr(input.widthModules || 4)}"></label>
              <label class="v4-field">Глубина, мод.<input data-stage-preset="d" type="number" min="1" step="1" value="${attr(input.depthModules || 3)}"></label>
              <label class="v4-field">Высота сцены, м<input data-stage-height type="number" min="0" step="0.1" value="${attr(initialHeightM)}"><small data-stage-height-default-note>${esc(stageHeightDefaultText(initialSupportKey))}</small></label>
            </div>
            <div class="v4-stage-control-stack v4-stage-control-stack--closure">
              <label class="v4-stage-check v4-stage-check--edge"><input data-stage-edge-enabled type="checkbox"${opts.input && opts.input.edgeClosureEnabled ? ' checked' : ''}> Включить закрытие торцов</label>
              <label class="v4-field">Тип закрытия торцов<select data-stage-edge-type>${optionHtml(stageCatalog().edgeClosureVariants, opts.input && opts.input.edgeClosureType || 'fabric_skirt')}</select></label>
            </div>
          </div>
          <div class="v4-stage-secondary-layout">
            <div class="v4-stage-tool-box">
              <span>Блок построения</span>
              <div class="v4-stage-tool-buttons">
                <button type="button" data-stage-tool="deck">Настил</button>
                <button type="button" data-stage-tool="stair">Лестница</button>
              </div>
            </div>
            <div class="v4-stage-draw-help"><b>Рисование как в v3:</b> в режиме «Настил» клик добавляет/удаляет настил. В режиме «Лестница» клик ставит/убирает отдельный блок лестницы на плане.</div>
          </div>
          <div class="v4-template-actions">
            <button type="button" class="btn-secondary" data-stage-action="rect">Собрать прямоугольник</button>
            <button type="button" class="btn-secondary" data-stage-action="walkway">Полоса / подиум</button>
            <button type="button" class="btn-secondary" data-stage-template="2x2">2×2</button>
            <button type="button" class="btn-secondary" data-stage-template="4x3">4×3</button>
            <button type="button" class="btn-secondary" data-stage-template="6x4">6×4</button>
            <small class="v4-muted">Пресеты сначала очищают поле, затем строят сцену. Размер поля расширяется автоматически.</small>
            <button type="button" class="btn-secondary danger v4-stage-clear-action" data-stage-action="clear">Очистить</button>
          </div>
        </div>
        <div class="v4-stage-canvas-wrap"><div class="v4-visual-stage-grid" data-stage-grid></div></div>
        <div data-stage-summary></div>
      </div>`;
    root.querySelectorAll('[data-stage-action]').forEach(btn => btn.addEventListener('click', () => handleStageAction(root, btn.getAttribute('data-stage-action'))));
    root.querySelectorAll('[data-stage-template]').forEach(btn => btn.addEventListener('click', () => {
      const [w, d] = String(btn.getAttribute('data-stage-template') || '').split('x').map(Number);
      buildStagePreset(root, w || 4, d || 3);
    }));
    const supportSelect = root.querySelector('[data-stage-support]');
    const frameSelect = root.querySelector('[data-stage-frame]');
    if (supportSelect) supportSelect.addEventListener('change', () => { syncStageFrameWithSupport(root); syncStageHeightWithSupport(root); renderStageState(root); });
    if (frameSelect) frameSelect.addEventListener('change', () => { syncStageFrameWithSupport(root); renderStageState(root); });
    const heightControl = root.querySelector('[data-stage-height]');
    if (heightControl) {
      ['input','change'].forEach(eventName => heightControl.addEventListener(eventName, () => {
        const st = root._v4StructureVisual && root._v4StructureVisual.state;
        if (st) { st.heightWasManual = true; st.stageHeightAutoForSupport = false; }
        renderStageState(root);
      }));
    }
    root.querySelectorAll('[data-stage-deck],[data-stage-edge-enabled],[data-stage-edge-type]').forEach(input => input.addEventListener('change', () => renderStageState(root)));
    root.querySelectorAll('[data-stage-tool]').forEach(btn => btn.addEventListener('click', () => {
      const st = root._v4StructureVisual && root._v4StructureVisual.state;
      if (st) st.activeTool = btn.getAttribute('data-stage-tool') === 'stair' ? 'stair' : 'deck';
      renderStageToolState(root);
    }));
    const stageGridEl = root.querySelector('[data-stage-grid]');
    if (stageGridEl) {
      stageGridEl.addEventListener('pointermove', event => handleStageGridPointerMove(root, event), { passive:false });
      stageGridEl.addEventListener('pointerup', () => finishStageDrawing(root));
      stageGridEl.addEventListener('pointercancel', () => finishStageDrawing(root));
      stageGridEl.addEventListener('pointerleave', () => finishStageDrawing(root));
    }
    root.querySelectorAll('[data-stage-preset]').forEach(input => input.addEventListener('change', () => {
      const st = root._v4StructureVisual && root._v4StructureVisual.state;
      if (st) ensureStageCanvasFits(st, getStageModules(st), 2);
      renderStageState(root);
    }));
    syncStageFrameWithSupport(root);
    syncStageHeightWithSupport(root, { force:state.stageHeightAutoForSupport });
    renderStageState(root);
    return root;
  }

  function ensureStageGridForShape(state, width, depth, padding) {
    if (!state) return;
    const w = Math.max(1, Math.round(num(width, 1)));
    const d = Math.max(1, Math.round(num(depth, 1)));
    const pad = Math.max(2, Math.round(num(padding, 2)));
    state.gridCols = Math.max(DEFAULT_STAGE_GRID_COLS, Math.round(num(state.gridCols, DEFAULT_STAGE_GRID_COLS)), w + pad * 2);
    state.gridRows = Math.max(DEFAULT_STAGE_GRID_ROWS, Math.round(num(state.gridRows, DEFAULT_STAGE_GRID_ROWS)), d + pad * 2);
  }

  function centeredStageRectModules(width, depth, state) {
    const w = Math.max(1, Math.round(num(width, 4)));
    const d = Math.max(1, Math.round(num(depth, 3)));
    ensureStageGridForShape(state, w, d, 2);
    const startX = Math.max(0, Math.floor((state.gridCols - w) / 2));
    const startY = Math.max(0, Math.floor((state.gridRows - d) / 2));
    const modules = [];
    for (let y = startY; y < startY + d; y += 1) {
      for (let x = startX; x < startX + w; x += 1) modules.push({ x, y });
    }
    return modules;
  }

  function buildStagePreset(root, width, depth, mode) {
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    const calc = calcStage();
    if (!state || !calc) return;
    const w = Math.max(1, Math.round(num(width, 4)));
    const d = Math.max(1, Math.round(num(depth, 3)));
    const modules = centeredStageRectModules(w, d, state);
    state.selected = stageSetFromModules(modules, calc);
    state.stairs = new Set();
    ensureStageCanvasFits(state, modules, 2);
    renderStageState(root);
  }

  function handleStageAction(root, action) {
    const ctx = root._v4StructureVisual;
    const state = ctx && ctx.state;
    const calc = calcStage();
    if (!state || !calc) return;
    if (action === 'add' || action === 'remove') {
      state.mode = action;
      renderStageState(root);
      return;
    }
    if (action === 'clear') { state.selected.clear(); state.stairs = new Set(); }
    if (action === 'rect') {
      const w = Math.max(1, Math.round(num(root.querySelector('[data-stage-preset="w"]') && root.querySelector('[data-stage-preset="w"]').value, 4)));
      const d = Math.max(1, Math.round(num(root.querySelector('[data-stage-preset="d"]') && root.querySelector('[data-stage-preset="d"]').value, 3)));
      buildStagePreset(root, w, d);
      return;
    }
    if (action === 'walkway') {
      const w = Math.max(1, Math.round(num(root.querySelector('[data-stage-preset="w"]') && root.querySelector('[data-stage-preset="w"]').value, 4)));
      buildStagePreset(root, w, 1, 'walkway');
      return;
    }
    if (action === 'rotate') {
      const rotated = calc.rotateModules ? (calc.rotateModules(getStageModules(state), state.gridCols, state.gridRows) || []) : [];
      ensureStageCanvasFits(state, rotated, 2);
      state.selected = stageSetFromModules(rotated, calc);
    }
    if (action === 'mirror') {
      const mirrored = calc.mirrorModules ? (calc.mirrorModules(getStageModules(state)) || []) : [];
      const centered = centerStageModulesInCanvas(mirrored, state);
      state.selected = stageSetFromModules(centered, calc);
    }
    ensureStageCanvasFits(state, getStagePlanPoints(state), 2);
    renderStageState(root);
  }

  function renderStageState(root) {
    const ctx = root._v4StructureVisual || {};
    const state = ctx.state;
    const opts = ctx.options || {};
    const calc = calcStage();
    const svc = structure();
    const grid = root.querySelector('[data-stage-grid]');
    if (!state || !calc || !grid || !svc) return;
    ensureStageCanvasFits(state, getStagePlanPoints(state), 2);
    renderStageToolState(root);
    const drawLabel = root.querySelector('[data-stage-draw-label]');
    if (drawLabel) drawLabel.textContent = state.activeTool === 'stair' ? 'Клик / протяжка: лестница' : 'Клик / протяжка: настил';
    const heightInput = root.querySelector('[data-stage-height]');
    const supportEl = root.querySelector('[data-stage-support]');
    state.stageHeightM = stageHeightFromSource({ stageHeightM: heightInput && heightInput.value != null ? heightInput.value : state.stageHeightM, supportKey:supportEl && supportEl.value || state.lastSupportKey });
    syncStageFrameWithSupport(root);
    const heightNote = root.querySelector('[data-stage-height-default-note]');
    if (heightNote) heightNote.textContent = `${stageHeightDefaultText(supportEl && supportEl.value || state.lastSupportKey)}${state.stageHeightAutoForSupport ? '' : ' · сейчас вручную скорректировано'}`;
    const cfg = currentStageConfig(root);
    grid.style.gridTemplateColumns = `repeat(${state.gridCols}, 40px)`;
    grid.style.setProperty('--stage-cell-ratio', `${num(cfg.moduleWidthM, 1.2)} / ${num(cfg.moduleDepthM, 1.2)}`);
    grid.innerHTML = '';
    for (let y = 0; y < state.gridRows; y += 1) {
      for (let x = 0; x < state.gridCols; x += 1) {
        const key = calc.moduleKey(x, y);
        const selected = state.selected.has(key);
        const hasStair = state.stairs && state.stairs.has(key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `v4-stage-cell${selected ? ' selected' : ''}${hasStair ? ' has-stair' : ''}`;
        btn.dataset.stageKey = key;
        btn.dataset.x = String(x);
        btn.dataset.y = String(y);
        btn.style.aspectRatio = `${num(cfg.moduleWidthM, 1.2)} / ${num(cfg.moduleDepthM, 1.2)}`;
        btn.innerHTML = hasStair ? '<span class="v4-stage-stair-icon" aria-hidden="true">▰</span>' : '';
        btn.title = `${x + 1}:${y + 1} · ${hasStair ? 'лестница' : (selected ? 'настил' : 'пусто')} · клик/протяжка`;
        btn.addEventListener('pointerdown', event => handleStageCellPointerDown(root, event));
        btn.addEventListener('pointerenter', event => handleStageCellPointerEnter(root, event));
        grid.appendChild(btn);
      }
    }
    const input = readStageInput(root);
    const section = svc.buildStageSection(input, { source: opts.mode === 'quote' ? 'quote-visual-stage-v4-polish' : 'quick-visual-stage-v4-polish', catalogMode: opts.mode === 'quote' ? 'quote' : 'quick' });
    state.lastSection = section;
    const result = section.result || {};
    const geometry = result.geometry || {};
    // v3.15.45: keep the visual stage editor light. The full Stage flow
    // snapshot (shared BOM → quote_items → warehouse → contract) is now built
    // on demand by V4BomInspector / document buttons instead of on every cell click.
    const bridgeTotals = section.sharedBomTotals || { rows: Array.isArray(section.bomRows) ? section.bomRows.length : 0 };
    const contractStatus = section.readyFor && section.readyFor.bomContract ? 'ready' : 'not checked';
    const summary = root.querySelector('[data-stage-summary]');
    if (summary) summary.innerHTML = `
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${esc(geometry.sheets || 0)}</b><span>${esc((section.stageConfig && section.stageConfig.deckLabel) || 'Листы')}</span></div>
        <div class="v4-mini"><b>${esc(geometry.columns || 0)}</b><span>${esc((section.stageConfig && section.stageConfig.supportLabel) || 'Опоры')}</span></div>
        <div class="v4-mini"><b>${esc(geometry.frames || 0)}</b><span>${esc((section.stageConfig && section.stageConfig.frameLabel) || 'Перекладины')}</span></div>
        <div class="v4-mini"><b>${esc(geometry.studs || 0)} / ${esc(geometry.feet || 0)}</b><span>Шпильки / пятки</span></div>
        <div class="v4-mini"><b>${esc(Number(result.widthMeters || 0).toFixed(1))}×${esc(Number(result.depthMeters || 0).toFixed(1))} м</b><span>Габарит · модуль ${esc((section.stageConfig && section.stageConfig.moduleWidthM) || 1.2)}×${esc((section.stageConfig && section.stageConfig.moduleDepthM) || 1.2)} м</span></div>
        <div class="v4-mini"><b>${esc(stageHeightText(section.stageHeightM || state.stageHeightM))}</b><span>Высота сцены</span></div>
        <div class="v4-mini"><b>${esc((geometry.stairs || 0))} шт</b><span>Лестницы на плане</span></div>
        <div class="v4-mini"><b>${esc(Number(geometry.edgeClosureMeters || 0).toFixed(2))} м.п.</b><span>Закрытие торцов</span><small>${esc(section.stageConfig && section.stageConfig.edgeClosureEnabled ? section.stageConfig.edgeClosureLabel : 'не выбрано')}</small></div>
        <div class="v4-mini"><b>${weight(section.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${esc(bridgeTotals.rows || 0)} строк</b><span>Shared BOM stage</span><small>quote_items: по кнопке Общий BOM</small></div>
        <div class="v4-mini"><b>${esc(contractStatus)}</b><span>BOM contract</span><small>лёгкий режим без авто-пересчёта</small></div>
      </div>
      <div class="v4-note"><b>Связь столб/перекладина:</b> ${esc(section.stageConfig && section.stageConfig.frameDependency && section.stageConfig.frameDependency.rule || stageFrameDependencyText(section.stageConfig && section.stageConfig.supportKey))}</div>
      <div class="v4-note"><b>Stage BOM bridge:</b> quote.stage → shared BOM → quote_items → складской лист. Сцена стартует с чистого листа; старый v3 и складские движения не затрагиваются.</div>
      ${renderBomRows(section.bomRows)}
      ${ctx.options && ctx.options.mode === 'quote' ? '' : (ROOT.QuickPdfExport && ROOT.QuickPdfExport.renderActionHtml ? ROOT.QuickPdfExport.renderActionHtml('stage') : '')}
      <div class="v4-note">${esc(section.summary || 'Сцена готова к сохранению.')}</div>`;
    if (ROOT.QuickPdfExport && ROOT.QuickPdfExport.bindAction) {
      ROOT.QuickPdfExport.bindAction(summary, { kind:'stage', title:'Быстрый технический расчёт сцены', getSection:() => readStageSection(root) });
    }
    if (typeof opts.onChange === 'function') opts.onChange(section, input);
  }


  function updateStageCellVisual(cell, selected, hasStair) {
    if (!cell) return;
    cell.classList.toggle('selected', !!selected);
    cell.classList.toggle('has-stair', !!hasStair);
    cell.innerHTML = hasStair ? '<span class="v4-stage-stair-icon" aria-hidden="true">▰</span>' : '';
    const title = cell.title || '';
    const prefix = title.split('·')[0].trim();
    cell.title = `${prefix} · ${hasStair ? 'лестница' : (selected ? 'настил' : 'пусто')} · клик/протяжка`;
  }

  function renderStageToolState(root) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    const tool = state && state.activeTool === 'stair' ? 'stair' : 'deck';
    if (state) state.activeTool = tool;
    root.querySelectorAll('[data-stage-tool]').forEach(btn => {
      const active = btn.getAttribute('data-stage-tool') === tool;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function getStageCellFromEvent(root, event) {
    const grid = root && root.querySelector ? root.querySelector('[data-stage-grid]') : null;
    const direct = event && event.target && event.target.closest ? event.target.closest('.v4-stage-cell') : null;
    if (direct && grid && grid.contains(direct)) return direct;
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const cell = element && element.closest ? element.closest('.v4-stage-cell') : null;
      if (cell && grid && grid.contains(cell)) return cell;
    }
    return null;
  }

  function applyStageDrawToCell(root, cell) {
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    if (!state || !cell) return;
    const key = cell.dataset.stageKey || `${cell.dataset.x},${cell.dataset.y}`;
    if (state.lastDrawnKey === key) return;
    state.lastDrawnKey = key;
    const shouldAdd = state.drawMode !== 'remove';
    const tool = state.drawTool === 'stair' || state.activeTool === 'stair' ? 'stair' : 'deck';
    if (tool === 'stair') {
      state.stairs = state.stairs || new Set();
      if (shouldAdd) state.stairs.add(key);
      else state.stairs.delete(key);
    } else {
      if (shouldAdd) state.selected.add(key);
      else state.selected.delete(key);
    }
    updateStageCellVisual(cell, state.selected.has(key), state.stairs && state.stairs.has(key));
  }

  function handleStageCellPointerDown(root, event) {
    if (event && event.pointerType === 'mouse' && event.button !== 0) return;
    if (event) event.preventDefault();
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    if (!state) return;
    const cell = getStageCellFromEvent(root, event);
    if (!cell) return;
    const key = cell.dataset.stageKey || `${cell.dataset.x},${cell.dataset.y}`;
    state.drawTool = state.activeTool === 'stair' ? 'stair' : 'deck';
    state.drawMode = state.drawTool === 'stair' ? ((state.stairs && state.stairs.has(key)) ? 'remove' : 'add') : (state.selected.has(key) ? 'remove' : 'add');
    state.isDrawing = true;
    state.lastDrawnKey = null;
    startStageDrawTracking(root);
    applyStageDrawToCell(root, cell);
  }

  function handleStageCellPointerEnter(root, event) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!state || !state.isDrawing) return;
    if (event) event.preventDefault();
    applyStageDrawToCell(root, getStageCellFromEvent(root, event));
  }

  function handleStageGridPointerMove(root, event) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!state || !state.isDrawing) return;
    if (event) event.preventDefault();
    applyStageDrawToCell(root, getStageCellFromEvent(root, event));
  }

  function finishStageDrawing(root) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!state || !state.isDrawing) return;
    state.isDrawing = false;
    state.lastDrawnKey = null;
    stopStageDrawTracking(root);
    ensureStageCanvasFits(state, getStagePlanPoints(state), 2);
    renderStageState(root);
  }

  function readStageInput(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    const calc = calcStage();
    if (!state || !calc) return { modules: [], explicitEmpty:true };
    const modules = getStageModules(state);
    const cfg = currentStageConfig(root);
    const heightInput = root.querySelector('[data-stage-height]');
    const stageHeightM = stageHeightFromSource({ stageHeightM: heightInput && heightInput.value != null ? heightInput.value : state.stageHeightM });
    state.stageHeightM = stageHeightM;
    const edgeEnabled = !!(root.querySelector('[data-stage-edge-enabled]') && root.querySelector('[data-stage-edge-enabled]').checked);
    const edgeTypeEl = root.querySelector('[data-stage-edge-type]');
    return { modules, explicitEmpty: modules.length === 0, gridCols:state.gridCols, gridRows:state.gridRows, mode:'toggle', coordinateMode:'grid-preserve', preserveGridCoordinates:true, stageDraftMode:'grid-preserve', stageDraftVersion:'3.16.13-stage-coordinate-preserve', deckKey:cfg.deckKey, supportKey:cfg.supportKey, frameKey:cfg.frameKey, frameDependency:clone(cfg.frameDependency || {}), moduleWidthM:cfg.moduleWidthM, moduleDepthM:cfg.moduleDepthM, stageHeightM, stairs:getStageStairs(state), edgeClosureEnabled:edgeEnabled, edgeClosureType:edgeTypeEl && edgeTypeEl.value || 'fabric_skirt' }; 
  }

  function readStageSection(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    const ctx = root && root._v4StructureVisual;
    if (ctx && ctx.state && ctx.state.lastSection) return ctx.state.lastSection;
    return structure().buildStageSection(readStageInput(root), { source: ctx && ctx.options && ctx.options.mode === 'quote' ? 'read-quote-stage-section' : 'read-quick-stage-section', catalogMode: ctx && ctx.options && ctx.options.mode === 'quote' ? 'quote' : 'quick' });
  }

  function normalizeTrussState(input) {
    const truss = trussModule();
    const specs = truss && truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const state = Object.assign({
      kind:'truss', version:VERSION, cols:18, rows:10, cellPx:44, baseCellPx:44, zoom:100, autoFit:true, cellMeters:0.5,
      selected:'truss3', selectedItemId:null, mode:'add', connectionCount:num(input && input.connectionCount, 0), items:[],
      trussSeries:(input && input.trussSeries) || 'T29Q', spanManual:num(input && input.spanManual, 0),
      factDistributedKgM:num(input && input.factDistributedKgM, 0), pointScheme:(input && input.pointScheme) || 'p1',
      factPointKg:num(input && input.factPointKg, 0), cantileverLength:num(input && input.cantileverLength, 0), cantileverView:(input && input.cantileverView) || 'Q',
      baseWeight:num(input && input.baseWeight, 29), pinWeight:num(input && input.pinWeight, 0.16),
      subrentAssignments:Array.isArray(input && input.subrentAssignments) ? clone(input.subrentAssignments) : [],
      structureMode:(input && (input.structureMode || input.trussStructureMode)) || (input && input.state && input.state.structureMode) || '2d',
      truss3d:!!(input && (input.truss3d || input.is3d || input.state && input.state.truss3d)),
      trussGeometry:clone((input && (input.trussGeometry || input.geometry)) || (input && input.state && input.state.trussGeometry) || {})
    }, input && input.state || {});
    state.items = truss && truss.normalizeItems ? truss.normalizeItems((input && input.items) || state.items || [], specs) : ((input && input.items) || []);
    state.selected = truss && truss.normalizeSelectedType ? truss.normalizeSelectedType(state.selected || 'truss3', specs, null, 'truss3') : (state.selected || 'truss3');
    state.connectionCount = 0;
    return state;
  }

  function renderTrussConfigurator(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const truss = trussModule();
    if (!truss || !structure()) {
      root.innerHTML = '<div class="v4-note">TrussBlockConstructor или V4StructureConfigurator не загружен.</div>';
      return null;
    }
    const opts = options || {};
    const compactQuote = opts.mode === 'quote';
    const state = normalizeTrussState(opts.input || {});
    root._v4StructureVisual = { kind:'truss', state, options:opts };
    root.innerHTML = `
      <div class="v4-structure-editor v4-structure-truss" data-v4-structure-truss>
        <div class="v4-structure-toolbar${compactQuote ? ' v4-structure-toolbar--compact' : ''}">
          ${compactQuote ? `<div class="v4-note v4-note--compact">Собери схему и проверь расчёт нагрузки перед добавлением в смету.</div>` : `<div>
            <div class="v4-kicker">${esc('technician quick truss block constructor')}</div>
            <h4>${esc(opts.title || 'Фермы · блочный конструктор')}</h4>
            <p class="v4-muted">Это v4-обёртка над блочной логикой: библиотека блоков, snap, поворот, удаление, базы и BOM. В quick-режиме используется идеальный локальный каталог без проверки склада.</p>
          </div>`}
          <div class="v4-structure-toolbar-actions v4-truss-load-toolbar">
            <button type="button" class="btn-secondary v4-load-indicator" data-truss-load-open data-truss-load-indicator><b>⚖ Проверка нагрузок</b><span>открыть расчёт</span></button>
          </div>
        </div>

        <div class="v4-truss-template-panel">
          <div class="v4-truss-template-head">
            <div class="v4-kicker">быстрое построение ферм</div>
            <div class="v4-truss-mode-pill" data-truss-mode-label>Добавлять</div>
          </div>
          <div class="v4-truss-template-split">
            <div class="v4-truss-template-card" data-truss-template-card="flat">
              <div class="v4-truss-template-card-head"><b>Портал / рама</b><span>плоскость: ширина + высота</span></div>
              <div class="v4-grid-2">
                <label class="v4-field">Ширина, м<input data-truss-flat-width data-truss-template-width type="number" min="0.5" step="0.5" value="6"></label>
                <label class="v4-field">Высота, м<input data-truss-flat-height data-truss-template-height type="number" min="0.5" step="0.5" value="3"></label>
              </div>
              <div class="v4-template-actions">
                <button type="button" class="btn-secondary" data-truss-template-action="portal">Добавить портал</button>
                <button type="button" class="btn-secondary" data-truss-template-action="frame">Добавить раму</button>
              </div>
            </div>
            <div class="v4-truss-template-card" data-truss-template-card="stool">
              <div class="v4-truss-template-card-head"><b>Табуретка</b><span>3D: ширина + глубина + высота + ноги</span></div>
              <div class="v4-grid-4 v4-truss-stool-grid">
                <label class="v4-field">Ширина, м<input data-truss-stool-width type="number" min="0.5" step="0.5" value="6"></label>
                <label class="v4-field">Глубина, м<input data-truss-stool-depth data-truss-template-depth type="number" min="0.5" step="0.5" value="3"></label>
                <label class="v4-field">Высота, м<input data-truss-stool-height type="number" min="0.5" step="0.5" value="3"></label>
                <label class="v4-field">Кол-во ног<input data-truss-stool-legs type="number" min="0" step="1" value="" placeholder="авто"></label>
              </div>
              <div class="v4-template-actions">
                <button type="button" class="btn-secondary" data-truss-template-action="stool">Добавить табуретку</button>
                <small class="v4-muted">Пустое поле ног = текущая автоматическая логика. Если указать количество, расчёт добавит нужное число стоек и баз.</small>
              </div>
            </div>
          </div>
          <small class="v4-muted">Портал длиннее 9 м получает T-узел, среднюю ногу и базу. Табуретка строится с U012 по углам, а стойки с блинами выводятся отдельно снизу.</small>
        </div>
        <div class="v4-truss-layout">
          <div class="v4-truss-sidebar">
            <div class="v4-truss-library" data-truss-library></div>
            <div class="v4-truss-edit-tools" aria-label="Редактирование выбранного блока">
              <div class="v4-truss-edit-row">
                <button type="button" class="v4-icon-btn" data-truss-action="rotate" title="Повернуть выбранное" aria-label="Повернуть выбранное"><span class="v4-icon-glyph" aria-hidden="true">↻</span></button>
                <button type="button" class="v4-icon-btn" data-truss-action="delete" title="Удалить выбранное" aria-label="Удалить выбранное"><span class="v4-icon-glyph" aria-hidden="true">⌫</span></button>
                <button type="button" class="v4-icon-btn danger" data-truss-action="clear" title="Очистить схему" aria-label="Очистить схему"><span class="v4-icon-glyph" aria-hidden="true">✕</span></button>
              </div>
              <div class="v4-truss-mode-actions" aria-label="Режим конструктора">
                <button type="button" class="v4-mode-btn" data-truss-action="add" data-truss-mode-button="add">Добавлять</button>
                <button type="button" class="v4-mode-btn" data-truss-action="remove" data-truss-mode-button="remove">Удалять</button>
              </div>
            </div>
          </div>
          <div class="v4-truss-workspace">
            ${compactQuote ? '' : `<div class="v4-truss-zoom-panel" data-truss-zoom-panel>
              <div><b>Масштаб поля</b><span data-truss-zoom-value>100%</span></div>
              <div class="v4-truss-zoom-controls">
                <button type="button" class="v4-icon-btn" data-truss-zoom-action="out" title="Уменьшить масштаб" aria-label="Уменьшить масштаб">−</button>
                <input data-truss-zoom type="range" min="35" max="220" step="5" value="100" aria-label="Масштаб поля конструктора">
                <button type="button" class="v4-icon-btn" data-truss-zoom-action="in" title="Увеличить масштаб" aria-label="Увеличить масштаб">+</button>
                <button type="button" class="btn-secondary" data-truss-zoom-action="fit">По размеру</button>
                <label class="v4-truss-autofit"><input data-truss-autofit type="checkbox" checked> авто-fit</label>
              </div>
            </div>`}
            <div class="v4-truss-field-wrap" data-truss-field-wrap>
              <div class="v4-truss-field" data-truss-field></div>
            </div>
            <p class="v4-muted">Клик по сетке добавляет выбранный блок. Клик по блоку выбирает его. Прямые фермы можно поворачивать. Перетаскивание использует snap из TrussBlockConstructor.</p>
          </div>
        </div>
        <div data-truss-summary></div>
        <dialog class="v4-truss-load-dialog" data-truss-load-dialog>
          <form method="dialog" class="v4-truss-load-dialog-card v4-truss-load-panel">
            <div class="v4-truss-dialog-head"><b>Проверка нагрузок</b><button type="submit" class="v4-icon-btn" aria-label="Закрыть"><span class="v4-icon-glyph" aria-hidden="true">✕</span></button></div>
          <div class="v4-kicker">проверка нагрузок v3 · MDM T29/T39</div>
          <div class="v4-grid-3">
            <label class="v4-field">Серия<select data-truss-load="trussSeries"><option value="T29Q"${state.trussSeries === 'T29Q' ? ' selected' : ''}>T29 вид Q</option><option value="T39Q"${state.trussSeries === 'T39Q' ? ' selected' : ''}>T39 вид Q</option></select></label>
            <label class="v4-field">Пролёт L, м<input data-truss-load="spanManual" type="number" min="0" step="0.5" value="${attr(state.spanManual)}"><small>0 = авто с U-блоками</small></label>
            <label class="v4-field">Распред. нагрузка, кг/м<input data-truss-load="factDistributedKgM" type="number" min="0" step="1" value="${attr(state.factDistributedKgM)}"></label>
            <label class="v4-field">Схема точки<select data-truss-load="pointScheme"><option value="p1"${state.pointScheme === 'p1' ? ' selected' : ''}>P1</option><option value="p2"${state.pointScheme === 'p2' ? ' selected' : ''}>P2</option><option value="p3"${state.pointScheme === 'p3' ? ' selected' : ''}>P3</option><option value="p4"${state.pointScheme === 'p4' ? ' selected' : ''}>P4</option></select></label>
            <label class="v4-field">Точечная нагрузка, кг<input data-truss-load="factPointKg" type="number" min="0" step="1" value="${attr(state.factPointKg)}"></label>
            <label class="v4-field">Консоль Lк, м<input data-truss-load="cantileverLength" type="number" min="0" step="0.5" value="${attr(state.cantileverLength)}"></label>
            <label class="v4-field">Вид консоли<select data-truss-load="cantileverView"><option value="Q"${state.cantileverView === 'Q' ? ' selected' : ''}>Q</option><option value="T"${state.cantileverView === 'T' ? ' selected' : ''}>T</option></select></label>
          </div>
          <div data-truss-load-detail></div>
          </form>
        </dialog>
      </div>`;
    renderTrussState(root);
    root.addEventListener('click', event => {
      const libBtn = event.target && event.target.closest ? event.target.closest('[data-truss-type]') : null;
      if (libBtn) { state.selected = libBtn.getAttribute('data-truss-type') || state.selected; state.mode = 'add'; renderTrussState(root); return; }
      const actionBtn = event.target && event.target.closest ? event.target.closest('[data-truss-action]') : null;
      if (actionBtn) { handleTrussAction(root, actionBtn.getAttribute('data-truss-action')); return; }
      const loadOpenBtn = event.target && event.target.closest ? event.target.closest('[data-truss-load-open]') : null;
      if (loadOpenBtn) {
        const dlg = root.querySelector('[data-truss-load-dialog]');
        if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
        else if (dlg) dlg.setAttribute('open', 'open');
        return;
      }
      const subrentorBtn = event.target && event.target.closest ? event.target.closest('[data-truss-add-subrentor]') : null;
      if (subrentorBtn) {
        const row = subrentorBtn.closest('[data-truss-subrent-row]');
        if (!ROOT.SubrentorsDirectoryUI || !ROOT.SubrentorsDirectoryUI.openSubrentorModal) {
          if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast('Справочник субарендаторов не загружен');
          return;
        }
        ROOT.SubrentorsDirectoryUI.openSubrentorModal({
          onSave: saved => {
            const select = row && row.querySelector('[data-truss-subrent-field="supplierId"]');
            if (select && saved) {
              const exists = Array.from(select.options || []).some(option => option.value === saved.id);
              if (!exists) select.insertAdjacentHTML('beforeend', `<option value="${attr(saved.id)}">${esc(saved.name || saved.id)}</option>`);
              select.value = saved.id;
              updateTrussSubrentorHidden(row, saved);
            }
            readTrussSubrentAssignments(root);
          }
        });
        return;
      }
      const zoomBtn = event.target && event.target.closest ? event.target.closest('[data-truss-zoom-action]') : null;
      if (zoomBtn) { handleTrussZoomAction(root, zoomBtn.getAttribute('data-truss-zoom-action')); return; }
      const templateBtn = event.target && event.target.closest ? event.target.closest('[data-truss-template-action]') : null;
      if (templateBtn) { addTrussTemplate(root, templateBtn.getAttribute('data-truss-template-action')); return; }
    });
    root.querySelectorAll('[data-truss-zoom]').forEach(input => input.addEventListener('input', () => {
      state.autoFit = false;
      state.zoom = clampTrussZoom(input.value);
      renderTrussState(root);
    }));
    root.querySelectorAll('[data-truss-autofit]').forEach(input => input.addEventListener('change', () => {
      state.autoFit = !!input.checked;
      if (state.autoFit) fitTrussCanvasToViewport(root, 'manual');
      renderTrussState(root);
    }));
    root.querySelectorAll('[data-truss-load]').forEach(input => input.addEventListener('input', () => { readTrussLoadControls(root); renderTrussSummary(root); }));
    root.querySelectorAll('select[data-truss-load]').forEach(input => input.addEventListener('change', () => { readTrussLoadControls(root); renderTrussSummary(root); }));
    root.addEventListener('input', event => { if (event.target && event.target.closest && event.target.closest('[data-truss-subrent-row]')) readTrussSubrentAssignments(root); });
    root.addEventListener('change', event => {
      const target = event.target;
      if (target && target.matches && target.matches('[data-truss-subrent-field="supplierId"]')) {
        updateTrussSubrentorHidden(target.closest('[data-truss-subrent-row]'));
        readTrussSubrentAssignments(root);
      }
    });
    return root;
  }

  function renderTrussLibrary(root) {
    const truss = trussModule();
    const ctx = root._v4StructureVisual;
    const state = ctx.state;
    const specs = truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const v4Groups = [
      { id:'straight', title:'Прямые фермы', icon:'▰', items:['truss3','truss25','truss2','truss15','truss1','truss05'] },
      { id:'angles2d', title:'2D узлы', icon:'∟', items:['cornerU003','cornerU017','cornerU016','cornerU001','cornerU002','cornerU004','cornerU005'] },
      { id:'nodes3d', title:'3D узлы', icon:'◼', items:['cornerU012','cornerU020','cornerU022','cornerU024','base'] }
    ];
    const v4Icons = {
      truss3:'▰3', truss25:'▰2.5', truss2:'▰2', truss15:'▰1.5', truss1:'▰1', truss05:'▰0.5',
      cornerU003:'L', cornerU017:'T', cornerU016:'✚', cornerU001:'45°', cornerU002:'60°', cornerU004:'120', cornerU005:'135',
      cornerU012:'┐', cornerU020:'+3D', cornerU022:'■', cornerU024:'◫', base:'◉'
    };
    const lib = root.querySelector('[data-truss-library]');
    if (!lib) return;
    lib.innerHTML = v4Groups.map((group) => {
      const items = (group.items || []).map(id => specs[id]).filter(s => s && !s.hidden && s.id !== 'pin' && s.id !== 'outrigger');
      if (!items.length) return '';
      const active = items.some(spec => spec.id === state.selected);
      return `<details class="v4-truss-group ${active ? 'active' : ''}" data-truss-group="${attr(group.id)}" open>
        <summary><span class="v4-truss-group-mark">${esc(group.icon || '□')}</span><b>${esc(group.title || group.id)}</b><em>${items.length}</em></summary>
        <div class="v4-truss-group-body">${items.map(spec => {
          const icon = v4Icons[spec.id] || spec.icon || '□';
          const title = spec.label || spec.short || spec.id;
          return `<button type="button" class="${state.selected === spec.id ? 'active' : ''}" data-kind="${attr(spec.kind || '')}" data-truss-type="${attr(spec.id)}" title="${attr(title)}" aria-label="${attr(title)}"><span class="v4-truss-btn-icon">${esc(icon)}</span></button>`;
        }).join('')}</div>
      </details>`;
    }).join('');
  }

  function trussHelpers(root) {
    const truss = trussModule();
    const state = root._v4StructureVisual.state;
    const specs = truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const opts = {
      cellMeters:state.cellMeters,
      nodePortPoints:(item, spec) => truss.nodePortPoints ? truss.nodePortPoints(item, spec) : [],
      nodeBasePortOffsets:(spec) => truss.nodeBasePortOffsets ? truss.nodeBasePortOffsets(spec) : [],
      rotatePortOffset:(p, deg) => truss.rotatePortOffset ? truss.rotatePortOffset(p, deg) : p
    };
    const inBounds = (type, x, y, o) => truss.inBounds ? truss.inBounds(type, x, y, o, state, specs, state.cellMeters) : true;
    const snap = (type, x, y, o, ignoreId, fixedRotation) => truss.getSnappedPlacement ? truss.getSnappedPlacement(type, x, y, o, state.items, specs, state, Object.assign({}, opts, { inBounds, ignoreId, fixedRotation })) : { x, y, o };
    return { truss, specs, opts, inBounds, snap };
  }
  function isQuickTrussMode(root) {
    const ctx = root && root._v4StructureVisual;
    return !!(ctx && ctx.kind === 'truss' && (!ctx.options || ctx.options.mode !== 'quote'));
  }

  function clampTrussZoom(value) {
    const raw = Math.round(num(value, 100));
    return Math.max(35, Math.min(220, raw || 100));
  }

  function getTrussBaseCellPx(state) {
    if (!state) return 44;
    const base = Math.max(24, Math.min(72, Math.round(num(state.baseCellPx || state.cellPx, 44))));
    state.baseCellPx = base;
    return base;
  }

  function getTrussZoom(state) {
    if (!state) return 100;
    state.zoom = clampTrussZoom(state.zoom || 100);
    return state.zoom;
  }

  function getTrussRenderCellPx(state) {
    return Math.max(14, Math.round(getTrussBaseCellPx(state) * getTrussZoom(state) / 100));
  }

  function getTrussContentCellBounds(state, specs, truss) {
    const items = Array.isArray(state && state.items) ? state.items : [];
    if (!items.length) return { minX:0, minY:0, maxX:Math.max(1, Number(state && state.cols || 18)), maxY:Math.max(1, Number(state && state.rows || 10)), width:Math.max(1, Number(state && state.cols || 18)), height:Math.max(1, Number(state && state.rows || 10)), empty:true };
    const bounds = truss && truss.schemeBounds ? truss.schemeBounds(items, specs, state && state.cellMeters) : null;
    if (bounds) return Object.assign({}, bounds, { width:Math.max(1, Number(bounds.width || 0)), height:Math.max(1, Number(bounds.height || 0)) });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const cellM = Math.max(0.5, num(state && state.cellMeters, 0.5));
    items.forEach(item => {
      if (!item) return;
      const spec = specs && specs[item.type] || {};
      const x = Math.max(0, Math.round(num(item.x, 0)));
      const y = Math.max(0, Math.round(num(item.y, 0)));
      let w = 1;
      let h = 1;
      if (spec.kind === 'straight') {
        const cells = Math.max(1, Math.round(num(spec.length, 0.5) / cellM));
        if (item.o === 'v') h = cells;
        else w = cells;
      }
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    });
    if (!Number.isFinite(minX)) return { minX:0, minY:0, maxX:18, maxY:10, width:18, height:10, empty:true };
    return { minX, minY, maxX, maxY, width:Math.max(1, maxX - minX), height:Math.max(1, maxY - minY) };
  }

  function fitTrussCanvasToViewport(root, reason) {
    if (!isQuickTrussMode(root)) return false;
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    if (!state) return false;
    const { truss, specs } = trussHelpers(root);
    const wrap = root.querySelector('[data-truss-field-wrap]');
    const field = root.querySelector('[data-truss-field]');
    const basePx = getTrussBaseCellPx(state);
    const content = getTrussContentCellBounds(state, specs, truss);
    const fieldCols = Math.max(Number(state.cols || 18), Number(content.maxX || 0) + 2, 18);
    const fieldRows = Math.max(Number(state.rows || 10), Number(content.maxY || 0) + 2, 10);
    const availableW = Math.max(280, Math.floor(num(wrap && wrap.clientWidth, (field && field.parentElement && field.parentElement.clientWidth) || 820) - 28));
    const availableH = Math.max(300, Math.floor(num(wrap && wrap.clientHeight, field && field.clientHeight || 560) - 28));
    const contentW = Math.max(1, (Number(content.width || 1) + 3) * basePx);
    const contentH = Math.max(1, (Number(content.height || 1) + 3) * basePx);
    const fullW = Math.max(contentW, Math.min(fieldCols * basePx, contentW + 4 * basePx));
    const fullH = Math.max(contentH, Math.min(fieldRows * basePx, contentH + 4 * basePx));
    const target = clampTrussZoom(Math.floor(Math.min(220, 100, availableW / fullW * 100, availableH / fullH * 100)));
    const current = getTrussZoom(state);
    if (reason === 'manual' || Math.abs(current - target) >= 2) {
      state.zoom = target;
      return true;
    }
    return false;
  }

  function syncTrussZoomControls(root) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!state) return;
    const zoom = getTrussZoom(state);
    root.querySelectorAll('[data-truss-zoom-value]').forEach(el => { el.textContent = `${zoom}%`; });
    root.querySelectorAll('[data-truss-zoom]').forEach(input => { if ('value' in input) input.value = String(zoom); });
    root.querySelectorAll('[data-truss-autofit]').forEach(input => { if ('checked' in input) input.checked = state.autoFit !== false; });
  }

  function handleTrussZoomAction(root, action) {
    const state = root && root._v4StructureVisual && root._v4StructureVisual.state;
    if (!state) return;
    if (action === 'fit') {
      state.autoFit = true;
      fitTrussCanvasToViewport(root, 'manual');
    } else if (action === 'in') {
      state.autoFit = false;
      state.zoom = clampTrussZoom(getTrussZoom(state) + 10);
    } else if (action === 'out') {
      state.autoFit = false;
      state.zoom = clampTrussZoom(getTrussZoom(state) - 10);
    } else if (action === 'reset') {
      state.autoFit = false;
      state.zoom = 100;
    }
    renderTrussState(root);
  }


  function ensureTrussCanvasFits(root) {
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    const truss = trussModule();
    if (!state || !truss || !Array.isArray(state.items) || !state.items.length) return;
    const specs = truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    const cellM = Math.max(0.5, num(state.cellMeters, 0.5));
    let maxX = 0;
    let maxY = 0;
    state.items.forEach(item => {
      const spec = specs[item && item.type] || {};
      const x = Math.max(0, Math.round(num(item && item.x, 0)));
      const y = Math.max(0, Math.round(num(item && item.y, 0)));
      let w = 1;
      let h = 1;
      if (spec.kind === 'straight') {
        const cells = Math.max(1, Math.round(num(spec.length, 0.5) / cellM));
        if ((item && item.o) === 'v') h = cells;
        else w = cells;
      }
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    state.cols = Math.max(Number(state.cols || 0), maxX + 2, 18);
    state.rows = Math.max(Number(state.rows || 0), maxY + 2, 10);
    if (isQuickTrussMode(root) && state.autoFit !== false) fitTrussCanvasToViewport(root, 'auto');
  }

  function renderTrussState(root) {
    const ctx = root._v4StructureVisual || {};
    const state = ctx.state;
    if (!state) return;
    const { truss, specs, inBounds, snap } = trussHelpers(root);
    state.zoom = clampTrussZoom(state.zoom || 100);
    state.baseCellPx = getTrussBaseCellPx(state);
    renderTrussLibrary(root);
    const modeLabel = root.querySelector('[data-truss-mode-label]');
    if (modeLabel) {
      const label = state.mode === 'remove' ? 'Режим: удалять' : 'Режим: добавлять';
      if ('value' in modeLabel) modeLabel.value = state.mode === 'remove' ? 'Удалять' : 'Добавлять';
      else modeLabel.textContent = label;
      modeLabel.classList.toggle('remove', state.mode === 'remove');
      modeLabel.classList.toggle('add', state.mode !== 'remove');
    }
    root.querySelectorAll('[data-truss-mode-button]').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-truss-mode-button') === (state.mode === 'remove' ? 'remove' : 'add')));
    ensureTrussCanvasFits(root);
    const field = root.querySelector('[data-truss-field]');
    if (!field) return;
    const renderCellPx = getTrussRenderCellPx(state);
    const width = state.cols * renderCellPx;
    const height = state.rows * renderCellPx;
    field.style.width = `${width}px`;
    field.style.height = `${height}px`;
    field.style.gridTemplateColumns = `repeat(${state.cols}, ${renderCellPx}px)`;
    field.style.gridTemplateRows = `repeat(${state.rows}, ${renderCellPx}px)`;
    field.style.backgroundSize = `${renderCellPx}px ${renderCellPx}px`;
    field.style.setProperty('--truss-cell-px', `${renderCellPx}px`);
    field.innerHTML = '';
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'v4-truss-cell';
        cell.style.left = `${x * renderCellPx}px`;
        cell.style.top = `${y * renderCellPx}px`;
        cell.style.width = `${renderCellPx}px`;
        cell.style.height = `${renderCellPx}px`;
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.addEventListener('click', () => {
          const res = truss.handleCellClickAction ? truss.handleCellClickAction({
            mode:state.mode, items:state.items, selectedItemId:state.selectedItemId, type:state.selected,
            x, y, orientation:'h', specs, cellMeters:state.cellMeters, inBounds, getSnappedPlacement:snap, makeId:() => makeId('truss')
          }) : null;
          if (res) { state.items = res.items || state.items; state.selectedItemId = res.selectedItemId || null; }
          renderTrussState(root);
        });
        field.appendChild(cell);
      }
    }
    if (truss.renderFieldItems) {
      truss.renderFieldItems({
        grid:field, items:state.items, specs, selectedItemId:state.selectedItemId, cellPx:renderCellPx, cellMeters:state.cellMeters, document,
        onClick:(event, item) => {
          event.stopPropagation();
          if (state.mode === 'remove') {
            const res = truss.removeAtAction ? truss.removeAtAction({ items:state.items, selectedItemId:state.selectedItemId, x:item.x, y:item.y, specs, cellMeters:state.cellMeters }) : null;
            if (res) { state.items = res.items || state.items; state.selectedItemId = res.selectedItemId || null; }
          } else {
            state.selectedItemId = item.id;
          }
          renderTrussState(root);
        },
        onPointerDown:(event, item, el) => {
          if (!event.isPrimary) return;
          if (state.mode === 'remove') {
            event.preventDefault();
            event.stopPropagation();
            const res = truss.removeAtAction ? truss.removeAtAction({ items:state.items, selectedItemId:state.selectedItemId, x:item.x, y:item.y, specs, cellMeters:state.cellMeters }) : null;
            if (res) { state.items = res.items || state.items; state.selectedItemId = res.selectedItemId || null; }
            renderTrussState(root);
            return;
          }
          event.preventDefault();
          state.selectedItemId = item.id;
          const spec = specs[item.type];
          const drag = truss.createItemDragState ? truss.createItemDragState({ event, item, grid:field, cellPx:renderCellPx }) : null;
          if (!drag) return;
          if (truss.markDragging) truss.markDragging(field, item.id);
          const onMove = moveEvent => {
            if (moveEvent.cancelable) moveEvent.preventDefault();
            truss.applyItemDragMove && truss.applyItemDragMove({ dragState:drag, event:moveEvent, item, spec, grid:field, cellPx:renderCellPx, getSnappedPlacement:snap, inBounds });
            renderTrussFieldOnly(root);
          };
          const onFinish = finishEvent => {
            if (finishEvent && finishEvent.cancelable) finishEvent.preventDefault();
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onFinish);
            window.removeEventListener('pointercancel', onFinish);
            renderTrussState(root);
          };
          window.addEventListener('pointermove', onMove, { passive:false });
          window.addEventListener('pointerup', onFinish, { passive:false, once:true });
          window.addEventListener('pointercancel', onFinish, { passive:false, once:true });
        }
      });
    }
    syncTrussZoomControls(root);
    renderTrussSummary(root);
  }

  function renderTrussFieldOnly(root) {
    // Keep implementation conservative: full render after moves is safer than partial DOM math.
    const field = root.querySelector('[data-truss-field]');
    if (!field) return;
    const cells = Array.from(field.querySelectorAll('.v4-truss-cell'));
    field.querySelectorAll('.block-item').forEach(el => el.remove());
    const { truss, specs } = trussHelpers(root);
    const state = root._v4StructureVisual.state;
    const renderCellPx = getTrussRenderCellPx(state);
    cells.forEach(cell => field.appendChild(cell));
    truss.renderFieldItems && truss.renderFieldItems({
      grid:field, items:state.items, specs, selectedItemId:state.selectedItemId, cellPx:renderCellPx, cellMeters:state.cellMeters, document,
      onClick:(event, item) => {
        event.stopPropagation();
        if (state.mode === 'remove') {
          const res = truss.removeAtAction ? truss.removeAtAction({ items:state.items, selectedItemId:state.selectedItemId, x:item.x, y:item.y, specs, cellMeters:state.cellMeters }) : null;
          if (res) { state.items = res.items || state.items; state.selectedItemId = res.selectedItemId || null; }
        } else {
          state.selectedItemId = item.id;
        }
        renderTrussState(root);
      }
    });
  }


  function rotateSelectedV4(root, state, helpers) {
    const h = helpers || trussHelpers(root);
    const specs = h.specs || {};
    const item = (state.items || []).find(row => String(row && row.id) === String(state.selectedItemId || ''));
    if (!item) return false;
    const spec = specs[item.type];
    if (!spec) return false;
    if (spec.kind === 'straight') {
      const nextO = item.o === 'v' ? 'h' : 'v';
      // v3.15.32: rotation is always allowed. The constructor canvas grows to fit
      // the rotated straight truss instead of clamping the block or rejecting rotation.
      item.x = Math.max(0, Math.round(num(item.x, 0)));
      item.y = Math.max(0, Math.round(num(item.y, 0)));
      item.o = nextO;
      ensureTrussCanvasFits(root);
      return true;
    }
    if (spec.kind === 'node' || spec.kind === 'base') {
      item.r = ((Math.round(num(item.r, 0) / 90) * 90) + 90) % 360;
      return true;
    }
    return false;
  }

  function handleTrussAction(root, action) {
    const ctx = root._v4StructureVisual || {};
    const state = ctx.state;
    if (!state) return;
    const { truss, specs, inBounds } = trussHelpers(root);
    if (action === 'add') state.mode = 'add';
    if (action === 'remove') state.mode = 'remove';
    if (action === 'clear') { state.items = []; state.selectedItemId = null; }
    if (action === 'delete' && truss.deleteSelectedAction) {
      const res = truss.deleteSelectedAction({ items:state.items, selectedItemId:state.selectedItemId });
      state.items = res.items || state.items;
      state.selectedItemId = res.selectedItemId || null;
    }
    if (action === 'rotate') {
      const rotated = rotateSelectedV4(root, state, { truss, specs, inBounds });
      if (!rotated && truss.rotateSelectedAction) {
        const res = truss.rotateSelectedAction({ items:state.items, selectedItemId:state.selectedItemId, specs, canPlace:inBounds });
        state.items = res.items || state.items;
        state.selectedItemId = res.selectedItemId || state.selectedItemId;
      }
    }
    renderTrussState(root);
  }

  function addStraightSegments(out, specs, startX, startY, meters, orientation, prefix) {
    const truss = trussModule();
    const source = specs && typeof specs === 'object' ? specs : (truss && truss.getDefaultSpecs ? truss.getDefaultSpecs() : {});
    const types = truss && truss.balancedStraightSegmentTypes
      ? truss.balancedStraightSegmentTypes(meters, source, { maxPieces:16 })
      : [];
    const order = types.length ? types : ['truss3','truss25','truss2','truss15','truss1','truss05'];
    let remain = Math.max(0, num(meters, 0));
    let x = startX;
    let y = startY;
    order.forEach(type => {
      const len = num(source[type] && source[type].length, 0);
      const canPlace = types.length ? len > 0 : (len > 0 && remain + 0.0001 >= len);
      while (canPlace && remain + 0.0001 >= len) {
        out.push({ id:makeId(prefix || 'tmpl'), type, x, y, o:orientation === 'v' ? 'v' : 'h', r:0, micro:{ templateSplitPolicy:'balanced-v3.17.45' } });
        const cells = Math.max(1, Math.round(len / 0.5));
        if (orientation === 'v') y += cells;
        else x += cells;
        remain -= len;
        if (types.length) break;
      }
    });
    return { x, y, remain };
  }

  function addNode(out, x, y, id, rotation, extra) {
    const item = { id:makeId('node'), type:id || 'cornerU003', x, y, o:'n', r:num(rotation, 0) };
    if (extra && typeof extra === 'object') item.micro = Object.assign({}, extra);
    out.push(item);
  }

  const STOOL_NODE_DIMENSIONS_M = Object.freeze({
    cornerU012:{ w:0.50, h:0.50, z:0.50, label:'U012' },
    cornerU016:{ w:0.71, h:0.71, z:0.29, label:'U016' },
    cornerU017:{ w:0.71, h:0.50, z:0.50, label:'U017' },
    cornerU020:{ w:0.71, h:0.50, z:0.50, label:'U020' },
    cornerU024:{ w:0.71, h:0.71, z:0.50, label:'U024' },
    cornerU022:{ w:0.71, h:0.71, z:0.71, label:'U022' }
  });

  function equipmentAvailableByTrussSpec() {
    const db = ROOT.EquipmentDatabase;
    const map = {};
    if (!db || !db.listItems) return map;
    try {
      const list = db.listItems({ onlyActive:true }) || [];
      list.forEach(item => {
        const key = item && item.meta && item.meta.trussSpecType;
        if (!key) return;
        const available = Math.max(0, Number(item.availableQty ?? item.available_qty ?? item.stockQty ?? item.stock_qty ?? 0));
        map[key] = (map[key] || 0) + available;
      });
    } catch (_) {}
    return map;
  }

  function pickStoolCornerNodes(requiredQty) {
    const available = equipmentAvailableByTrussSpec();
    const fallbackOrder = ['cornerU012','cornerU016','cornerU017','cornerU020','cornerU024','cornerU022'];
    const picks = [];
    const warnings = [];
    let remaining = Math.max(0, Math.round(Number(requiredQty || 0)));
    fallbackOrder.forEach(type => {
      if (remaining <= 0) return;
      const qty = Math.min(remaining, Math.max(0, Math.floor(Number(available[type] || 0))));
      for (let i = 0; i < qty; i += 1) picks.push(type);
      remaining -= qty;
    });
    if (remaining > 0) {
      for (let i = 0; i < remaining; i += 1) picks.push('cornerU012');
      warnings.push({ type:'subrent', text:`Не хватает 3D-углов: добрать в субаренду U012 — ${remaining} шт.` });
    }
    const replacements = picks.filter(type => type !== 'cornerU012');
    if (replacements.length) {
      const grouped = replacements.reduce((acc, type) => (acc[type] = (acc[type] || 0) + 1, acc), {});
      Object.entries(grouped).forEach(([type, qty]) => {
        const dim = STOOL_NODE_DIMENSIONS_M[type] || { w:0.5, h:0.5, z:0.5, label:type };
        const dx = Math.max(0, Math.round((Number(dim.w || 0.5) - 0.5) * 100));
        const dy = Math.max(0, Math.round((Number(dim.h || 0.5) - 0.5) * 100));
        const dz = Math.max(0, Math.round((Number(dim.z || 0.5) - 0.5) * 100));
        warnings.push({ type:'replacement', text:`Замена U012 → ${(STOOL_NODE_DIMENSIONS_M[type] && STOOL_NODE_DIMENSIONS_M[type].label) || type}: ${qty} шт. Габарит может увеличиться примерно на +${dx} см по X, +${dy} см по Y, +${dz} см по Z на каждый такой узел по задействованной оси.` });
      });
    }
    return { picks, warnings, available };
  }

  function addTemplateWarning(state, warning) {
    if (!state) return;
    state.templateWarnings = Array.isArray(state.templateWarnings) ? state.templateWarnings.slice(-6) : [];
    if (warning) state.templateWarnings.push(warning);
  }

  function isTruss3DNodeType(type) { return TRUSS_3D_NODE_TYPES.includes(String(type || '')); }
  function isTrussTNodeType(type) { return TRUSS_T_NODE_TYPES.includes(String(type || '')); }
  function trussTopNodeHeightM(type) { return (isTruss3DNodeType(type) || isTrussTNodeType(type)) ? TRUSS_TOP_NODE_HEIGHT_M : 0; }
  function netLegStraightHeightM(totalHeightM, topType) {
    return Math.max(0, Math.round((Math.max(0, Number(totalHeightM || 0)) - trussTopNodeHeightM(topType)) * 100) / 100);
  }
  function readTemplateNumber(root, selector, fallbackSelector, fallback) {
    const field = root && (root.querySelector(selector) || (fallbackSelector ? root.querySelector(fallbackSelector) : null));
    return num(field && field.value, fallback);
  }
  function readStoolLegCount(root) {
    const field = root && root.querySelector('[data-truss-stool-legs]');
    const raw = field && String(field.value || '').trim();
    if (!raw) return 0;
    return Math.max(0, Math.round(num(raw, 0)));
  }
  function setTrussGeometryState(state, patch) {
    if (!state) return;
    const geometry = Object.assign({}, state.trussGeometry || {}, patch || {});
    const is3d = geometry.is3d || geometry.mode === '3d' || geometry.usesU012 || geometry.uses3dNodes;
    geometry.is3d = !!is3d;
    geometry.mode = is3d ? '3d' : (geometry.mode || '2d');
    state.trussGeometry = geometry;
    state.structureMode = geometry.mode;
    state.truss3d = !!is3d;
  }
  function deriveTrussVisualGeometry(state) {
    const st = state || {};
    const items = Array.isArray(st.items) ? st.items : [];
    const cellM = Math.max(0.5, num(st.cellMeters, 0.5));
    const specs = trussModule() && trussModule().getDefaultSpecs ? trussModule().getDefaultSpecs() : {};
    const stored = clone(st.trussGeometry || {});
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let usesU012 = false, uses3dNodes = false, usesTJoints = false;
    items.forEach(item => {
      if (!item) return;
      const type = String(item.type || '');
      if (type === 'cornerU012') usesU012 = true;
      if (isTruss3DNodeType(type)) uses3dNodes = true;
      if (isTrussTNodeType(type)) usesTJoints = true;
      const spec = specs[type] || {};
      const x = Number(item.x || 0);
      const y = Number(item.y || 0);
      const lenCells = spec.kind === 'straight' ? Math.max(1, Math.round(Number(spec.length || 0) / cellM)) : 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + (item.o === 'h' ? lenCells : 1));
      maxY = Math.max(maxY, y + (item.o === 'v' ? lenCells : 1));
    });
    const spanWidthM = Number.isFinite(maxX - minX) ? Math.max(0, Math.round((maxX - minX) * cellM * 100) / 100) : 0;
    const spanDepthM = Number.isFinite(maxY - minY) ? Math.max(0, Math.round((maxY - minY) * cellM * 100) / 100) : 0;
    const is3d = !!(stored.is3d || stored.mode === '3d' || usesU012 || uses3dNodes);
    return Object.assign({}, stored, {
      mode:is3d ? '3d' : (stored.mode || '2d'),
      is3d,
      usesU012,
      uses3dNodes,
      usesTJoints,
      topNodeHeightM:TRUSS_TOP_NODE_HEIGHT_M,
      widthM:Number(stored.widthM || stored.width || spanWidthM || 0),
      depthM:Number(stored.depthM || stored.depth || (is3d ? spanDepthM : 0) || 0),
      heightM:Number(stored.heightM || stored.height || (is3d ? stored.totalHeightM || spanDepthM || 0 : 0) || 0),
      footprintWidthM:spanWidthM,
      footprintDepthM:spanDepthM
    });
  }

  function buildStoolTemplate(root, state, specs, truss) {
    const cellM = Math.max(0.5, num(state.cellMeters, 0.5));
    const maxSpanM = 9;
    const widthM = Math.max(1.0, readTemplateNumber(root, '[data-truss-stool-width]', '[data-truss-template-width]', 6));
    const depthM = Math.max(1.0, readTemplateNumber(root, '[data-truss-stool-depth]', '[data-truss-template-depth]', 3));
    const heightM = Math.max(1.0, readTemplateNumber(root, '[data-truss-stool-height]', '[data-truss-template-height]', 3));
    const requestedLegCount = readStoolLegCount(root);
    const targetLegs = requestedLegCount > 0 ? Math.max(4, requestedLegCount) : 0;
    const cornerM = 0.5;
    const startX = 2;
    const startY = 2;
    const spanXM = Math.max(0, widthM - 2 * cornerM);
    const spanYM = Math.max(0, depthM - 2 * cornerM);
    const xCells = Math.max(0, Math.round(spanXM / cellM));
    const yCells = Math.max(0, Math.round(spanYM / cellM));
    const rightX = startX + 1 + xCells;
    const bottomY = startY + 1 + yCells;
    const items = [];
    const cornerPick = pickStoolCornerNodes(4);
    const topNodeHeightM = TRUSS_TOP_NODE_HEIGHT_M;
    const legStraightHeightM = Math.max(cellM, netLegStraightHeightM(heightM, 'cornerU012') || cellM);
    const corners = [
      { x:startX, y:startY, r:0, group:'left-corners' }, { x:rightX, y:startY, r:90, group:'right-corners' },
      { x:startX, y:bottomY, r:270, group:'left-corners' }, { x:rightX, y:bottomY, r:180, group:'right-corners' }
    ];
    corners.forEach((p, idx) => addNode(items, p.x, p.y, cornerPick.picks[idx] || 'cornerU012', p.r, { template:'stool-corner' }));

    function requiredInternalCount(lengthM) {
      return Math.max(0, Math.ceil(Math.max(0, Number(lengthM || 0)) / maxSpanM) - 1);
    }
    function evenlySpacedCoords(start, end, count) {
      const n = Math.max(0, Math.round(Number(count || 0)));
      const coords = [];
      if (n <= 0 || end - start <= 2) return coords;
      const used = new Set();
      for (let i = 1; i <= n; i += 1) {
        let coord = Math.round(start + ((end - start) * i) / (n + 1));
        coord = Math.max(start + 1, Math.min(end - 1, coord));
        while (used.has(coord) && coord < end - 1) coord += 1;
        while (used.has(coord) && coord > start + 1) coord -= 1;
        if (!used.has(coord) && coord > start && coord < end) {
          used.add(coord);
          coords.push(coord);
        }
      }
      return coords.sort((a, b) => a - b);
    }
    function maxGapMeters(coords, start, end) {
      const sorted = [start].concat((coords || []).slice().sort((a, b) => a - b), [end]);
      let maxGap = 0;
      for (let i = 0; i < sorted.length - 1; i += 1) {
        maxGap = Math.max(maxGap, Math.max(0, sorted[i + 1] - sorted[i] - 1) * cellM);
      }
      return Math.round(maxGap * 100) / 100;
    }
    function allocateManualSupportPairs() {
      const reqX = requiredInternalCount(widthM);
      const reqY = requiredInternalCount(depthM);
      if (targetLegs <= 0) {
        return {
          xInternal:widthM > maxSpanM ? 1 : 0,
          yInternal:depthM > maxSpanM ? 1 : 0,
          singleAxis:null,
          reqX,
          reqY,
          enough:true,
          auto:true
        };
      }
      const pairBudget = Math.max(0, Math.floor((targetLegs - 4) / 2));
      let xInternal = 0;
      let yInternal = 0;
      let pairsLeft = pairBudget;
      const minPairs = reqX + reqY;
      while (pairsLeft > 0 && (xInternal < reqX || yInternal < reqY)) {
        const xNeed = xInternal < reqX;
        const yNeed = yInternal < reqY;
        const xGap = xNeed ? widthM / Math.max(1, xInternal + 1) : -1;
        const yGap = yNeed ? depthM / Math.max(1, yInternal + 1) : -1;
        if (xNeed && (!yNeed || xGap >= yGap)) xInternal += 1;
        else if (yNeed) yInternal += 1;
        pairsLeft -= 1;
      }
      while (pairsLeft > 0) {
        const xGap = widthM / Math.max(1, xInternal + 1);
        const yGap = depthM / Math.max(1, yInternal + 1);
        if (xGap >= yGap) xInternal += 1;
        else yInternal += 1;
        pairsLeft -= 1;
      }
      let singleAxis = null;
      if ((targetLegs - 4) % 2 === 1) {
        const xGap = widthM / Math.max(1, xInternal + 1);
        const yGap = depthM / Math.max(1, yInternal + 1);
        singleAxis = xGap >= yGap ? 'x-top' : 'y-left';
      }
      return { xInternal, yInternal, singleAxis, reqX, reqY, enough:pairBudget >= minPairs, auto:false };
    }

    const allocation = allocateManualSupportPairs();
    const xInternalCoords = evenlySpacedCoords(startX, rightX, allocation.xInternal);
    const yInternalCoords = evenlySpacedCoords(startY, bottomY, allocation.yInternal);
    const xTopCoords = xInternalCoords.slice();
    const xBottomCoords = xInternalCoords.slice();
    const yLeftCoords = yInternalCoords.slice();
    const yRightCoords = yInternalCoords.slice();
    if (allocation.singleAxis === 'x-top') {
      const extra = evenlySpacedCoords(startX, rightX, allocation.xInternal + 1).find(x => !xTopCoords.includes(x));
      if (extra != null) xTopCoords.push(extra);
    }
    if (allocation.singleAxis === 'y-left') {
      const extra = evenlySpacedCoords(startY, bottomY, allocation.yInternal + 1).find(y => !yLeftCoords.includes(y));
      if (extra != null) yLeftCoords.push(extra);
    }
    xTopCoords.sort((a, b) => a - b); xBottomCoords.sort((a, b) => a - b);
    yLeftCoords.sort((a, b) => a - b); yRightCoords.sort((a, b) => a - b);

    function addHorizontalRunSplit(y, supportXs, tag) {
      if (spanXM <= 0) return;
      const xs = [startX].concat((supportXs || []).filter(x => x > startX && x < rightX).sort((a, b) => a - b), [rightX]);
      for (let i = 0; i < xs.length - 1; i += 1) {
        const lenM = Math.max(0, (xs[i + 1] - xs[i] - 1) * cellM);
        if (lenM > 0) addStraightSegments(items, specs, xs[i] + 1, y, lenM, 'h', `${tag}_${i}`);
      }
    }
    function addVerticalRunSplit(x, supportYs, tag) {
      if (spanYM <= 0) return;
      const ys = [startY].concat((supportYs || []).filter(y => y > startY && y < bottomY).sort((a, b) => a - b), [bottomY]);
      for (let i = 0; i < ys.length - 1; i += 1) {
        const lenM = Math.max(0, (ys[i + 1] - ys[i] - 1) * cellM);
        if (lenM > 0) addStraightSegments(items, specs, x, ys[i] + 1, lenM, 'v', `${tag}_${i}`);
      }
    }

    addHorizontalRunSplit(startY, xTopCoords, 'stool_top');
    addHorizontalRunSplit(bottomY, xBottomCoords, 'stool_bottom');
    addVerticalRunSplit(startX, yLeftCoords, 'stool_left');
    addVerticalRunSplit(rightX, yRightCoords, 'stool_right');

    const supportPoints = corners.map(p => ({ x:p.x, y:p.y, kind:'corner', group:p.group }));
    const supportKeySet = new Set(supportPoints.map(p => `${p.x}:${p.y}`));
    function addSupportPoint(x, y, kind, group, rotation) {
      const key = `${x}:${y}`;
      if (supportKeySet.has(key)) return;
      supportKeySet.add(key);
      addNode(items, x, y, 'cornerU017', rotation, { template:kind, insertedIntoRun:true });
      supportPoints.push({ x, y, kind, group });
    }
    xTopCoords.forEach(x => addSupportPoint(x, startY, targetLegs > 0 ? 'stool-manual-leg-support' : 'stool-long-side-support', `x-top-${x}`, 0));
    xBottomCoords.forEach(x => addSupportPoint(x, bottomY, targetLegs > 0 ? 'stool-manual-leg-support' : 'stool-long-side-support', `x-bottom-${x}`, 180));
    yLeftCoords.forEach(y => addSupportPoint(startX, y, targetLegs > 0 ? 'stool-manual-leg-support' : 'stool-long-side-support', `y-left-${y}`, 270));
    yRightCoords.forEach(y => addSupportPoint(rightX, y, targetLegs > 0 ? 'stool-manual-leg-support' : 'stool-long-side-support', `y-right-${y}`, 90));

    // Legs are displayed below the top-view frame as readable horizontal pairs.
    // v3.17.44: every stool support is paired for display, not only the first two corner pairs:
    // - top/bottom T-supports with the same X coordinate become one visual pair;
    // - left/right T-supports with the same Y coordinate become one visual pair;
    // - odd manual leftovers remain as a single last group, without changing BOM/calculation.
    const legCells = Math.max(1, Math.round(legStraightHeightM / cellM));
    const legBlockStartY = bottomY + 2;
    const pairGap = 3;
    const pairStartX = startX;
    function stoolLegPairKey(point) {
      const group = String(point && point.group || '');
      if (group === 'left-corners' || group === 'right-corners') return group;
      const xMatch = group.match(/^x-(top|bottom)-(-?\d+)/);
      if (xMatch) return `x-pair-${xMatch[2]}`;
      const yMatch = group.match(/^y-(left|right)-(-?\d+)/);
      if (yMatch) return `y-pair-${yMatch[2]}`;
      return group || `single-${point && point.x}:${point && point.y}`;
    }
    function stoolLegPairOrder(group) {
      const id = String(group && group.id || '');
      if (id === 'left-corners') return -200000;
      if (id === 'right-corners') return -199000;
      const minX = Math.min.apply(null, group.items.map(p => Number(p.x || 0)));
      const minY = Math.min.apply(null, group.items.map(p => Number(p.y || 0)));
      if (id.indexOf('x-pair-') === 0) return 1000 + minX;
      if (id.indexOf('y-pair-') === 0) return 2000 + minY;
      return 3000 + minY * 100 + minX;
    }
    function buildStoolLegPairGroups(points) {
      const buckets = [];
      const byKey = new Map();
      (points || []).forEach((point) => {
        const key = stoolLegPairKey(point);
        let group = byKey.get(key);
        if (!group) {
          group = { id:key, items:[] };
          byKey.set(key, group);
          buckets.push(group);
        }
        group.items.push(point);
      });
      return buckets
        .map(group => Object.assign({}, group, { items:group.items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)) }))
        .sort((a, b) => stoolLegPairOrder(a) - stoolLegPairOrder(b));
    }
    const legPairGroups = buildStoolLegPairGroups(supportPoints);
    legPairGroups.forEach((group, groupIndex) => {
      const baseX = pairStartX + groupIndex * pairGap;
      group.items.forEach((p, pairIndex) => {
        const legX = baseX + pairIndex;
        const rowBaseY = legBlockStartY + legCells;
        const topType = p.kind === 'corner' ? (cornerPick.picks[corners.findIndex(c => c.x === p.x && c.y === p.y)] || 'cornerU012') : 'cornerU017';
        const straightHeightM = Math.max(cellM, netLegStraightHeightM(heightM, topType) || cellM);
        addStraightSegments(items, specs, legX, legBlockStartY, straightHeightM, 'v', `stool_leg_${groupIndex}_${pairIndex}`);
        items.push({ id:makeId('base'), type:'base', x:legX, y:rowBaseY, o:'n', r:0, micro:{ template:'stool-base', sourceX:p.x, sourceY:p.y, pair:groupIndex, pairIndex } });
      });
    });
    state.templateWarnings = [];
    cornerPick.warnings.forEach(w => addTemplateWarning(state, w.text));
    if (supportPoints.length > 4) addTemplateWarning(state, `Табуретка: добавлены дополнительные опоры с базами: ${supportPoints.length - 4} шт.`);
    if (requestedLegCount > 0) {
      addTemplateWarning(state, `Ручной расчёт табуретки: задано ${supportPoints.length} ног, каждая получает стойку и базу.`);
      if (!allocation.enough) addTemplateWarning(state, `Внимание: ${targetLegs} ног недостаточно, чтобы гарантировать пролёты не больше 9 м по ширине/глубине. Увеличь количество ног минимум до ${4 + 2 * (allocation.reqX + allocation.reqY)}.`);
      else addTemplateWarning(state, `Ручное распределение ног: пролёты по X ≈ ${metric(maxGapMeters(xInternalCoords, startX, rightX), 2)} м, по Y ≈ ${metric(maxGapMeters(yInternalCoords, startY, bottomY), 2)} м.`);
    }
    addTemplateWarning(state, `Табуретка: U017 для дополнительных ног врезается в раму и разрывает прямую ферму, а не накладывается сверху.`);
    addTemplateWarning(state, `Стойки ${supportPoints.length}: прямая нога ${metric(legStraightHeightM, 2)} м + верхний узел ${metric(topNodeHeightM, 2)} м = общая высота ${metric(heightM, 2)} м.`);
    addTemplateWarning(state, `Основной 3D-угол табуретки: U012 500×500×500 мм. Если используется замена по наличию, общий габарит может увеличиться.`);
    setTrussGeometryState(state, { mode:'3d', is3d:true, source:'stool-template', widthM, depthM, heightM, legStraightHeightM, topNodeHeightM, usesU012:true, usesTJoints:supportPoints.length > 4, supportPoints:supportPoints.length, requestedLegCount, stoolSupportLayout:{ xTop:xTopCoords.length, xBottom:xBottomCoords.length, yLeft:yLeftCoords.length, yRight:yRightCoords.length, manual:requestedLegCount > 0, maxSpanM } });
    const normalized = truss.normalizeItems ? truss.normalizeItems(items, specs) : items;
    state.items = state.items.concat(normalized);
    state.cols = Math.max(state.cols || 18, rightX + 3, pairStartX + legPairGroups.length * pairGap + 2);
    state.rows = Math.max(state.rows || 10, legBlockStartY + legCells + 2);
  }

  function addTrussTemplate(root, kind) {
    const ctx = root._v4StructureVisual || {};
    const state = ctx.state;
    const truss = trussModule();
    if (!state || !truss) return;
    const specs = truss.getDefaultSpecs ? truss.getDefaultSpecs() : {};
    // v3.15.31: template buttons are rebuild actions, not append actions.
    // Clear the constructor first, then build the selected portal/frame/stool template.
    state.items = [];
    state.selectedItemId = null;
    state.templateWarnings = [];
    state.cols = 18;
    state.rows = 10;
    const cellM = Math.max(0.5, num(state.cellMeters, 0.5));
    const cornerM = 0.5;
    const widthM = Math.max(1.0, readTemplateNumber(root, '[data-truss-flat-width]', '[data-truss-template-width]', 6));
    const heightM = Math.max(1.0, readTemplateNumber(root, '[data-truss-flat-height]', '[data-truss-template-height]', 3));
    const depthM = heightM;
    if (kind === 'stool') {
      buildStoolTemplate(root, state, specs, truss);
      renderTrussState(root);
      return;
    }
    const effectiveDepthM = kind === 'frame' ? depthM : heightM;
    const bases = kind === 'frame' ? 0 : 2;
    const startX = 2;
    const startY = 2;
    const topStraightLen = Math.max(0, widthM - (2 * cornerM));
    const topNodeHeightM = TRUSS_TOP_NODE_HEIGHT_M;
    const verticalStraightLen = Math.max(0, effectiveDepthM - (kind === 'frame' ? 2 * cornerM : topNodeHeightM));
    const topCells = Math.max(0, Math.round(topStraightLen / cellM));
    const verticalCells = Math.max(0, Math.round(verticalStraightLen / cellM));
    const rightX = startX + 1 + topCells;
    const bottomY = startY + 1 + verticalCells;
    const items = [];
    const longPortal = kind === 'portal' && widthM > 9;
    const midTopCells = longPortal ? Math.max(1, Math.floor(topCells / 2)) : 0;
    const midX = longPortal ? startX + 1 + midTopCells : null;
    const midLeftLen = longPortal ? Math.max(0, midTopCells * cellM) : 0;
    const midRightLen = longPortal ? Math.max(0, (rightX - (midX + 1)) * cellM) : 0;

    // Build by port-to-port coordinates: every straight segment starts after a node
    // and ends exactly at the next node boundary. This prevents visual overlap between corners and trusses.
    if (topStraightLen > 0) {
      if (longPortal && midX !== null) {
        if (midLeftLen > 0) addStraightSegments(items, specs, startX + 1, startY, midLeftLen, 'h', 'tmpl_top_left');
        if (midRightLen > 0) addStraightSegments(items, specs, midX + 1, startY, midRightLen, 'h', 'tmpl_top_right');
      } else {
        addStraightSegments(items, specs, startX + 1, startY, topStraightLen, 'h', 'tmpl_top');
      }
    }
    if (kind === 'frame' && topStraightLen > 0) addStraightSegments(items, specs, startX + 1, bottomY, topStraightLen, 'h', 'tmpl_bottom');
    if (verticalStraightLen > 0) addStraightSegments(items, specs, startX, startY + 1, verticalStraightLen, 'v', 'tmpl_left');
    if (verticalStraightLen > 0) addStraightSegments(items, specs, rightX, startY + 1, verticalStraightLen, 'v', 'tmpl_right');
    if (longPortal && verticalStraightLen > 0 && midX !== null) addStraightSegments(items, specs, midX, startY + 1, verticalStraightLen, 'v', 'tmpl_mid');

    addNode(items, startX, startY, 'cornerU003', 0);
    addNode(items, rightX, startY, 'cornerU003', 90);
    if (longPortal && midX !== null) addNode(items, midX, startY, 'cornerU017', 0);
    if (kind === 'frame') addNode(items, startX, bottomY, 'cornerU003', 270);
    if (kind === 'frame') addNode(items, rightX, bottomY, 'cornerU003', 180);

    if (kind === 'portal' && bases > 0) {
      const baseY = startY + 1 + verticalCells;
      const basePoints = [{ x:startX, y:baseY }, { x:rightX, y:baseY }];
      const baseTotal = bases + (longPortal && midX !== null ? 1 : 0);
      if (longPortal && midX !== null) basePoints.push({ x:midX, y:baseY });
      for (let i = 0; i < baseTotal; i += 1) {
        const p = basePoints[i % basePoints.length] || basePoints[0];
        items.push({ id:makeId('base'), type:'base', x:p.x, y:p.y + Math.floor(i / basePoints.length), o:'n', r:0 });
      }
    }

    state.templateWarnings = [];
    if (kind === 'portal') addTemplateWarning(state, `Ноги портала: прямая стойка ${metric(verticalStraightLen, 2)} м + верхний узел ${metric(topNodeHeightM, 2)} м = общая высота ${metric(heightM, 2)} м.`);
    if (longPortal && midX !== null) addTemplateWarning(state, `Пролёт больше 9 м: добавлена центральная стойка с Т-перемычкой U017 высотой ${metric(TRUSS_TOP_NODE_HEIGHT_M, 2)} м.`);
    setTrussGeometryState(state, { mode:'2d', is3d:false, source:`${kind}-template`, widthM, depthM:0, heightM, legStraightHeightM:verticalStraightLen, topNodeHeightM, usesTJoints:!!(longPortal && midX !== null) });
    const normalized = truss.normalizeItems ? truss.normalizeItems(items, specs) : items;
    state.items = state.items.concat(normalized);
    state.cols = Math.max(state.cols || 18, rightX + 3);
    state.rows = Math.max(state.rows || 10, (kind === 'portal' ? bottomY + 2 : bottomY + 2));
    state.selectedItemId = null;
    renderTrussState(root);
  }


  function readTrussLoadControls(root) {
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    if (!state) return state;
    const read = (name) => root.querySelector(`[data-truss-load="${name}"]`);
    state.trussSeries = read('trussSeries') ? read('trussSeries').value : (state.trussSeries || 'T29Q');
    if (!['T29Q','T39Q'].includes(state.trussSeries)) state.trussSeries = 'T29Q';
    state.spanManual = Math.max(0, num(read('spanManual') && read('spanManual').value, state.spanManual || 0));
    state.factDistributedKgM = Math.max(0, num(read('factDistributedKgM') && read('factDistributedKgM').value, state.factDistributedKgM || 0));
    state.pointScheme = read('pointScheme') ? read('pointScheme').value : (state.pointScheme || 'p1');
    if (!['p1','p2','p3','p4'].includes(state.pointScheme)) state.pointScheme = 'p1';
    state.factPointKg = Math.max(0, num(read('factPointKg') && read('factPointKg').value, state.factPointKg || 0));
    state.cantileverLength = Math.max(0, num(read('cantileverLength') && read('cantileverLength').value, state.cantileverLength || 0));
    state.cantileverView = read('cantileverView') ? read('cantileverView').value : (state.cantileverView || 'Q');
    if (!['Q','T'].includes(state.cantileverView)) state.cantileverView = 'Q';
    return state;
  }

  function getTrussLoadStatus(section) {
    const checker = loadChecker();
    const load = section && section.result && section.result.loadCheck;
    if (!checker || !checker.getLoadStatus || !load) return { statusClass:'', launcherText:'не задано', launcherSub:'LoadChecker недоступен', statusText:'Проверка нагрузок недоступна' };
    return checker.getLoadStatus(load) || { statusClass:'', launcherText:'не задано', launcherSub:'', statusText:'' };
  }

  function renderV3LoadSummary(section, state) {
    const checker = loadChecker();
    const load = section && section.result && section.result.loadCheck;
    if (!checker || !checker.renderLoadSummaryHtml || !load) return '<div class="v4-note">Проверка нагрузок недоступна: LoadChecker не загружен.</div>';
    const status = getTrussLoadStatus(section);
    return `<div class="v4-truss-v3-load-summary ${esc(status.statusClass || '')}">
      <div class="v4-truss-load-header"><b>⚖ ${esc(status.launcherText || status.statusText || 'нагрузка')}</b><span>${esc(status.launcherSub || '')}</span></div>
      ${checker.renderLoadSummaryHtml(load, { state, escapeHtml:esc })}
    </div>`;
  }

  function renderLoadMainIndicator(root, section) {
    const btn = root && root.querySelector ? root.querySelector('[data-truss-load-indicator]') : null;
    if (!btn) return;
    const status = getTrussLoadStatus(section);
    const cls = status.statusClass || '';
    btn.classList.remove('ok','risk','bad','na');
    btn.classList.add(cls || 'na');
    const title = cls === 'bad' ? '⚠ Превышение нагрузки' : cls === 'risk' ? '⚠ Малый запас' : cls === 'ok' ? '✓ Нагрузка OK' : '⚖ Проверка нагрузок';
    const row = status.row || (section && section.result && section.result.loadCheck && section.result.loadCheck.main && section.result.loadCheck.main.row) || null;
    const allowed = row ? `Доп. распр.: ${metric(row.udlKgM, 0)} кг/м · максимум ${metric(row.udlMaxKg, 0)} кг` : 'Допустимая распределённая нагрузка: —';
    btn.innerHTML = `<b>${esc(title)}</b><span>${esc(status.launcherSub || status.statusText || 'открыть расчёт')}</span><small>${esc(allowed)}</small>`;
  }

  function readTrussSubrentAssignments(root) {
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    const rows = [];
    if (!root || !state) return rows;
    root.querySelectorAll('[data-truss-subrent-row]').forEach(row => {
      const qtyInput = row.querySelector('[data-truss-subrent-field="qty"]');
      const supplierInput = row.querySelector('[data-truss-subrent-field="supplierName"]');
      const supplierIdInput = row.querySelector('[data-truss-subrent-field="supplierId"]');
      const priceInput = row.querySelector('[data-truss-subrent-field="subrentPrice"]');
      const clientPriceInput = row.querySelector('[data-truss-subrent-field="clientPrice"]');
      const qty = Math.max(0, Math.round(num(qtyInput && qtyInput.value, 0)));
      if (!qty) return;
      const supplierId = supplierIdInput ? supplierIdInput.value : '';
      const supplierRecord = supplierId && ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(supplierId) : null;
      const supplierName = supplierRecord && supplierRecord.name ? supplierRecord.name : (supplierInput ? supplierInput.value : '');
      rows.push({
        key: row.getAttribute('data-truss-subrent-row') || '',
        itemId: row.getAttribute('data-truss-subrent-item-id') || '',
        code: row.getAttribute('data-truss-subrent-code') || '',
        trussPart: row.getAttribute('data-truss-subrent-part') || '',
        qty,
        supplierId,
        supplierName,
        subrentPrice: num(priceInput && priceInput.value, 0),
        clientPrice: num(clientPriceInput && clientPriceInput.value, 0) || num(priceInput && priceInput.value, 0)
      });
    });
    state.subrentAssignments = rows;
    return rows;
  }

  function trussAvailabilityForRow(row) {
    const db = ROOT.EquipmentDatabase;
    let available = row && row.availableQty != null ? num(row.availableQty, 0) : null;
    if (db && db.listItems) {
      try {
        const items = db.listItems({ onlyActive:true }) || [];
        const itemId = String(row.itemId || row.id || '').trim();
        const code = String(row.code || '').trim();
        const part = String(row.trussPart || row.truss_part || '').trim();
        const matches = items.filter(item => {
          const metaPart = item && item.meta && item.meta.trussSpecType;
          return (itemId && String(item.id || '') === itemId) || (code && String(item.code || '') === code) || (part && metaPart === part);
        });
        if (matches.length) {
          available = matches.reduce((sum, item) => sum + Math.max(0, num(item.availableQty ?? item.available_qty ?? item.stockQty ?? item.stock_qty, 0)), 0);
        }
      } catch (_) {}
    }
    return Math.max(0, num(available, 0));
  }

  // quote-only: quick mode must not render stock/subrent needs because it uses the ideal local catalog.
  function renderTrussSubrentNeeds(section, state) {
    const rows = Array.isArray(section && section.bomRows) ? section.bomRows : [];
    const existing = new Map((Array.isArray(state && state.subrentAssignments) ? state.subrentAssignments : []).map(row => [String(row.key || row.itemId || row.code || row.trussPart || ''), row]));
    const needRows = rows.map(row => {
      const qty = Math.max(0, num(row.qty || row.quantity, 0));
      const available = trussAvailabilityForRow(row);
      const shortage = Math.max(0, qty - available);
      if (!shortage) return null;
      const key = String(row.itemId || row.id || row.code || row.trussPart || row.truss_part || '').trim();
      const saved = existing.get(key) || {};
      return Object.assign({}, row, { key, qty, available, shortage, saved });
    }).filter(Boolean);
    if (!needRows.length) return '<div class="v4-note v4-truss-subrent-ok">Нехватки по ферменным позициям не обнаружено.</div>';
    return `<div class="v4-truss-subrent-panel" data-truss-subrent-panel>
      <div class="v4-note v4-step-warn"><b>Недостающие позиции ферм</b><br><span class="v4-muted">Заполни у кого добираем и цену. В смете остаются позиции конструктора, а внутренняя сводка получает отметку субаренды.</span></div>
      ${needRows.map(row => `<div class="v4-truss-subrent-row" data-truss-subrent-row="${attr(row.key)}" data-truss-subrent-item-id="${attr(row.itemId || row.id || '')}" data-truss-subrent-code="${attr(row.code || '')}" data-truss-subrent-part="${attr(row.trussPart || row.truss_part || '')}">
        <div class="v4-truss-subrent-main">
          <div class="v4-truss-subrent-meta"><b>${esc(row.name || row.itemName || row.code || 'Позиция')}</b><small>${esc(row.code || '')} · нужно ${esc(row.qty)} ${esc(row.unit || 'шт')} · склад ${esc(row.available)} · добрать ${esc(row.shortage)}</small></div>
          <label class="v4-field">Сколько<input class="v4-mini-input" data-truss-subrent-field="qty" type="number" min="0" step="1" value="${attr(row.saved.qty || row.shortage)}" readonly></label>
          <label class="v4-field v4-truss-subrentor-select">У кого берём<select class="v4-mini-input" data-truss-subrent-field="supplierId">${renderTrussSubrentorOptions(row.saved.supplierId || row.saved.supplier_id || '', row.saved.supplierName || '')}</select></label>
          <button type="button" class="btn-secondary btn-compact v4-truss-subrentor-add" data-truss-add-subrentor>+ добавить</button>
        </div>
        <div class="v4-truss-subrent-prices">
          <label class="v4-field">Субаренда/ед.<input class="v4-mini-input" data-truss-subrent-field="subrentPrice" type="number" min="0" step="100" value="${attr(row.saved.subrentPrice || '')}" placeholder="₽"></label>
          <label class="v4-field">Клиент/ед.<input class="v4-mini-input" data-truss-subrent-field="clientPrice" type="number" min="0" step="100" value="${attr(row.saved.clientPrice || '')}" placeholder="если пусто — субаренда"></label>
        </div>
        <input type="hidden" data-truss-subrent-field="supplierName" value="${attr(row.saved.supplierName || '')}">
      </div>`).join('')}
    </div>`;
  }
  function trussFinalKitRows(section) {
    const rows = Array.isArray(section && section.bomRows) ? section.bomRows : [];
    const straightOrder = { truss3: 0, truss25: 1, truss2: 2, truss15: 3, truss1: 4, truss05: 5 };
    return rows.filter(row => Number(row && (row.qty || row.quantity || row.trussStraightCount || row.meters || row.weightKg || row.weight || 0)) > 0)
      .slice()
      .sort((a, b) => {
        const ak = Object.prototype.hasOwnProperty.call(straightOrder, a.trussPart) ? straightOrder[a.trussPart] : 100;
        const bk = Object.prototype.hasOwnProperty.call(straightOrder, b.trussPart) ? straightOrder[b.trussPart] : 100;
        if (ak !== bk) return ak - bk;
        return String(a.name || a.code || '').localeCompare(String(b.name || b.code || ''), 'ru');
      });
  }

  function renderTrussFinalKitTable(section, state) {
    const res = section && section.result ? section.result : {};
    const rows = trussFinalKitRows(section);
    const spanInfo = res.spanInfo || (res.loadCheck && res.loadCheck.spanInfo) || {};
    const bounds = res.physicalBounds || {};
    const dimensionLabel = bounds && Number(bounds.width || 0) > 0
      ? `${metric(bounds.width, 2)}×${metric(bounds.height || 0, 2)} м`
      : '—';
    const dimensionNote = res.dimensionSource === 'stool-top-frame'
      ? 'реальный габарит верхней рамы табуретки, без вынесенного блока ног'
      : 'реальный габарит построенной схемы';
    const body = rows.length ? rows.map(row => {
      const qty = Number(row.trussStraightCount || row.qty || row.quantity || 0);
      const meters = Number(row.meters || 0);
      const rentalTotal = Number(row.totalRental || row.total_rental || (row.rentalPrice || 0) * (row.qty || 0));
      const unit = row.unit || 'шт';
      return `<tr>
        <td><b>${esc(row.name || row.itemName || row.code || '')}</b><br><span class="v4-muted">${esc(row.code || row.id || '')}</span></td>
        <td>${metric(qty, 0)} ${esc(unit)}</td>
        <td>${meters ? metric(meters, 1) + ' м' : '—'}</td>
        <td>${weight(row.weightKg || row.weight || 0)}</td>
        <td>${rentalTotal ? money(rentalTotal) : '—'}</td>
        <td><span class="v4-muted">${esc(row.note || '')}</span></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" class="v4-muted">Нет строк итоговой комплектации.</td></tr>';
    const footer = `<tfoot>
      <tr class="v4-total-row">
        <td><b>Итого по ферменной конструкции</b><br><span class="v4-muted">Габарит: ${esc(dimensionLabel)} · ${esc(dimensionNote)}</span></td>
        <td>${metric(res.nodePieces || 0, 0)} узл. · ${metric(res.baseCount || 0, 0)} баз</td>
        <td>${metric(res.totalMeters || 0, 1)} м</td>
        <td>${weight(section && (section.weightKg || section.weight) || res.weight || 0)}</td>
        <td>${money(res.rental || 0)}</td>
        <td><span class="v4-muted">Стыки: ${metric(res.connectionCount || 0, 0)} · расчётный пролёт: ${metric(spanInfo.maxEffective || 0, 1)} м</span></td>
      </tr>
    </tfoot>`;
    return `<div class="v4-truss-final-kit"><div class="v4-table-wrap"><table class="v4-table v4-truss-final-kit-table"><caption>Итоговая комплектация ферм</caption><thead><tr><th>Позиция</th><th>Кол-во</th><th>Метраж</th><th>Вес</th><th>Прокат</th><th>Примечание</th></tr></thead><tbody>${body}</tbody>${footer}</table></div></div>`;
  }

  function renderTrussSummary(root) {
    const ctx = root._v4StructureVisual || {};
    const state = ctx.state;
    const svc = structure();
    if (!state || !svc) return;
    readTrussLoadControls(root);
    readTrussSubrentAssignments(root);
    const input = readTrussInput(root);
    const section = svc.buildTrussSection(input, { source: ctx.options && ctx.options.mode === 'quote' ? 'quote-visual-truss-v4' : 'quick-visual-truss-v4', catalogMode: ctx.options && ctx.options.mode === 'quote' ? 'quote' : 'quick' });
    state.lastSection = section;
    const res = section.result || {};
    const spanInfo = res.spanInfo || (res.loadCheck && res.loadCheck.spanInfo) || {};
    const box = root.querySelector('[data-truss-summary]');
    if (box) box.innerHTML = `
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${metric(res.totalMeters, 1)} м</b><span>Прямые фермы</span></div>
        <div class="v4-mini"><b>${metric(spanInfo.maxEffective || 0, 1)} м</b><span>Расчётный пролёт с U</span></div>
        <div class="v4-mini"><b>${metric(res.physicalBounds && res.physicalBounds.width || 0, 2)}×${metric(res.physicalBounds && res.physicalBounds.height || 0, 2)} м</b><span>${res.dimensionSource === 'stool-top-frame' ? 'Габарит верхней рамы' : 'Габарит с T/X узлами'}</span></div>
        <div class="v4-mini"><b>${esc(res.nodePieces || 0)}</b><span>Узлы / углы</span></div>
        <div class="v4-mini"><b>${esc(res.baseCount || 0)}</b><span>Базы TRS-930</span></div>
        <div class="v4-mini"><b>${esc(res.connectionCount || 0)}</b><span>Стыки C2-88 авто</span></div>
        <div class="v4-mini"><b>${weight(section.weightKg || res.weight)}</b><span>Вес</span></div>
      </div>
      ${Array.isArray(state.templateWarnings) && state.templateWarnings.length ? `<div class="v4-note v4-truss-template-warnings"><b>Предупреждения шаблона</b><br>${state.templateWarnings.map(w => `• ${esc(w)}`).join('<br>')}</div>` : ''}
      ${renderTrussFinalKitTable(section, state)}
      ${ctx.options && ctx.options.mode === 'quote' ? renderTrussSubrentNeeds(section, state) : (ROOT.QuickPdfExport && ROOT.QuickPdfExport.renderActionHtml ? ROOT.QuickPdfExport.renderActionHtml('truss') : '')}
      <div class="v4-note">${esc(section.summary || 'Фермы готовы к сохранению.')} · Детальная проверка нагрузок открывается через индикатор сверху.</div>`;
    if (ROOT.QuickPdfExport && ROOT.QuickPdfExport.bindAction) {
      ROOT.QuickPdfExport.bindAction(box, { kind:'truss', title:'Быстрый технический расчёт ферм', getSection:() => readTrussSection(root) });
    }
    renderLoadMainIndicator(root, section);
    const detail = root.querySelector('[data-truss-load-detail]');
    if (detail) detail.innerHTML = renderV3LoadSummary(section, state);
    if (typeof ctx.options.onChange === 'function') ctx.options.onChange(section, input);
  }

  function readTrussInput(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    const ctx = root && root._v4StructureVisual;
    const state = ctx && ctx.state;
    if (!state) return { items: [], state:{} };
    readTrussSubrentAssignments(root);
    const geometry = deriveTrussVisualGeometry(state);
    setTrussGeometryState(state, geometry);
    return { items:clone(state.items || []), trussSeries:state.trussSeries, spanManual:state.spanManual, factDistributedKgM:state.factDistributedKgM, pointScheme:state.pointScheme, factPointKg:state.factPointKg, cantileverLength:state.cantileverLength, cantileverView:state.cantileverView, structureMode:geometry.mode, truss3d:!!geometry.is3d, trussGeometry:clone(geometry), subrentAssignments:clone(state.subrentAssignments || []), state:{ cellMeters:state.cellMeters, cols:state.cols, rows:state.rows, structureMode:geometry.mode, truss3d:!!geometry.is3d, trussGeometry:clone(geometry), trussSeries:state.trussSeries, spanManual:state.spanManual, factDistributedKgM:state.factDistributedKgM, pointScheme:state.pointScheme, factPointKg:state.factPointKg, cantileverLength:state.cantileverLength, cantileverView:state.cantileverView, subrentAssignments:clone(state.subrentAssignments || []) } };
  }

  function readTrussSection(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    const ctx = root && root._v4StructureVisual;
    if (ctx && ctx.state && ctx.state.lastSection) return ctx.state.lastSection;
    return structure().buildTrussSection(readTrussInput(root), { source: ctx && ctx.options && ctx.options.mode === 'quote' ? 'read-quote-truss-section' : 'read-quick-truss-section', catalogMode: ctx && ctx.options && ctx.options.mode === 'quote' ? 'quote' : 'quick' });
  }

  function renderBomRows(rows) {
    const list = (Array.isArray(rows) ? rows : []).filter(row => Number(row && (row.qty || row.quantity || row.meters || row.weightKg || row.weight || 0)) > 0);
    if (!list.length) return '<div class="v4-note">BOM пока пустой.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Метраж</th><th>Вес</th></tr></thead><tbody>${list.map(row => `<tr><td>${esc(row.code || '')}</td><td>${esc(row.name || row.itemName || '')}<small>${row.note ? esc(row.note) : ''}</small></td><td>${esc(row.trussStraightCount || row.qty || row.quantity || 0)} ${esc(row.unit || 'шт')}</td><td>${row.meters ? metric(row.meters, 1) + ' м' : '—'}</td><td>${weight(row.weightKg || row.weight || 0)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function buildVisualConfiguratorReport() {
    return {
      type:'feg-stage-pro-v4-structure-visual-configurator-report', version:VERSION, generatedAt:new Date().toISOString(),
      stage:{ visual:true, sharedBom:true, stageSharedBomSnapshot:true, quoteItemsPreview:true, warehousePickListPreview:true, deckAwareGrid:true, usedBy:['QuickCalculators','QuoteWizard'], systemParts:['STG-901..908'] },
      truss:{ visual:true, source:'TrussBlockConstructor + LoadChecker v3 full logic wrapped in v4', portalAndFrameTemplates:true, v3LoadTables:true, finalKitTable:true, v3WeightTables:false, autoConnectionCount:true, darkTheme:true, sharedBom:true, usedBy:['QuickCalculators','QuoteWizard'], systemParts:['TRS-901..TRS-943'] },
      protected:['LED fastener formulas','legacy fallback','stock movements','reservations','remote writes']
    };
  }

  ROOT.V4StructureVisualConfigurator = {
    VERSION,
    renderStageConfigurator,
    renderTrussConfigurator,
    readStageInput,
    readStageSection,
    readTrussInput,
    readTrussSection,
    buildVisualConfiguratorReport
  };
})();
