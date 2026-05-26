(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  const GRID_COLS = 18;
  const GRID_ROWS = 10;
  const DEFAULT_COLORS = ['main', 'side', 'side2', 'top', 'bottom', 'custom'];

  function renderLedCalculator(target, initial) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const calc = ROOT.LedCalculator;
    if (!calc) {
      root.innerHTML = '<div class="v4-card"><p class="v4-muted">LED Calculator module is not loaded.</p></div>';
      return root;
    }
    const initialOptions = initial || {};
    const defaultFormat = calc.getCabinetFormat ? calc.getCabinetFormat('640x640') : { widthM: 0.64, heightM: 0.64, defaultWeightKg: 14, defaultPowerW: 320, defaultStartupPowerW: 600 };
    const baseState = Object.assign({
      widthM: 4,
      heightM: 2.56,
      format: '640x640',
      pitch: 'p4',
      cabinetWeightKg: defaultFormat.defaultWeightKg,
      cabinetPowerW: defaultFormat.defaultPowerW,
      cabinetStartupPowerW: defaultFormat.defaultStartupPowerW,
      legType: '3m',
      legCount: 0,
      mountMode: 'standing',
      mountStanding: true,
      mountHanging: false
    }, initialOptions);
    const callbacks = initialOptions.callbacks || {};
    const onChange = typeof initialOptions.onChange === 'function' ? initialOptions.onChange : callbacks.onChange;
    const seed = makeInitialState(baseState);

    root.innerHTML = `
      <div class="v4-card v4-led-constructor" data-led-calculator>
        <div class="v4-kicker">LED Calculator</div>
        <h3>Гибкий конструктор LED-экрана</h3>
        <p class="v4-muted">Рисуй основной экран и отдельные LED-конструкции: боковые вертикальные полосы, верх/низ, дополнительные блоки. Общие формулы LED сохранены, итог складывается из активных кабинетов.</p>

        <div class="v4-grid-3">
          <label class="v4-field"><span>Ширина основного экрана, м</span><input type="number" min="0.1" step="0.1" data-led="widthM" value="${escapeHtml(seed.base.widthM)}"></label>
          <label class="v4-field"><span>Высота основного экрана, м</span><input type="number" min="0.1" step="0.1" data-led="heightM" value="${escapeHtml(seed.base.heightM)}"></label>
          <label class="v4-field"><span>Форм-фактор</span><select data-led="format">${Object.values(calc.CABINET_FORMATS).map(f => `<option value="${f.id}" ${f.id === seed.base.format ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}</select></label>
          <label class="v4-field"><span>Шаг пикселя</span><select data-led="pitch">${Object.values(calc.PIXEL_PITCHES).map(p => `<option value="${p.id}" ${p.id === seed.base.pitch ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>
          <label class="v4-field"><span>Вес кабинета, кг</span><input type="number" min="0" step="0.1" data-led="cabinetWeightKg" value="${escapeHtml(seed.base.cabinetWeightKg)}"></label>
          <label class="v4-field"><span>Мощность кабинета, Вт</span><input type="number" min="0" step="10" data-led="cabinetPowerW" value="${escapeHtml(seed.base.cabinetPowerW)}"></label>
          <label class="v4-field"><span>Пусковая мощность, Вт</span><input type="number" min="0" step="10" data-led="cabinetStartupPowerW" value="${escapeHtml(seed.base.cabinetStartupPowerW)}"></label>
          <label class="v4-field"><span>Тип ног</span><select data-led="legType">${Object.values(calc.LEG_TYPES || {}).map(leg => `<option value="${leg.id}" ${leg.id === seed.base.legType ? 'selected' : ''}>${escapeHtml(leg.name)}</option>`).join('')}</select><span class="v4-field-subspan">Монтаж LED</span><select data-led="mountMode">${getMountModeOptionsHtml(resolveMountModeValue(seed.base))}</select></label>
          <label class="v4-field"><span>Количество ног</span><input type="number" min="0" step="1" data-led="legCount" value="${escapeHtml(seed.base.legCount)}"></label>
        </div>

        <div class="v4-led-workbench">
          <div class="v4-led-side-panel">
            <div class="v4-led-panel-block">
              <div class="v4-kicker">templates</div>
              <h4>Быстрое построение</h4>
              <div class="v4-led-template-grid">
                <button type="button" class="btn-secondary" data-led-template="main">Основной экран</button>
                <button type="button" class="btn-secondary" data-led-template="left">Левая вертикальная</button>
                <button type="button" class="btn-secondary" data-led-template="right">Правая вертикальная</button>
                <button type="button" class="btn-secondary" data-led-template="top">Полоса сверху</button>
                <button type="button" class="btn-secondary" data-led-template="bottom">Полоса снизу</button>
                <button type="button" class="btn-secondary" data-led-template="new">Новая пустая конструкция</button>
                <button type="button" class="btn-secondary danger" data-led-template="clear">Очистить схему</button>
              </div>
              <p class="v4-muted">Каждый шаблон создаёт отдельную конструкцию. Конструкции могут примыкать друг к другу, но считаются отдельно в отчёте.</p>
            </div>

            <div class="v4-led-panel-block">
              <div class="v4-kicker">active construction</div>
              <h4>Рисование от руки</h4>
              <label class="v4-field"><span>Активная конструкция</span><select data-led-active></select></label>
              <div class="v4-actions">
                <button type="button" class="btn-secondary" data-led-action="rename">Переименовать</button>
                <button type="button" class="btn-secondary" data-led-action="copy-active">Копировать</button>
                <button type="button" class="btn-secondary" data-led-action="clear-active">Очистить активную</button>
                <button type="button" class="btn-secondary danger" data-led-action="remove-active">Удалить активную</button>
              </div>
              <div class="v4-led-parts-list" data-led-parts-list></div>
              <p class="v4-muted">Клик по клетке ставит кабинет в активную конструкцию. Повторный клик по своему кабинету удаляет его. Протяжка мышью/пальцем работает тем же действием. Поле автоматически расширяется при рисовании у края.</p>
            </div>
          </div>

          <div class="v4-led-canvas-panel">
            <div class="v4-led-grid-head">
              <div>
                <div class="v4-kicker">cabinet layout</div>
                <h4>План кабинетов</h4>
              </div>
              <div class="v4-led-grid-note" data-led-grid-note></div>
            </div>
            <div class="v4-led-grid-wrap">
              <div class="v4-led-grid" data-led-grid></div>
            </div>
          </div>
        </div>

        <div data-led-result></div>
      </div>`;

    root._v4LedState = seed;
    root._v4LedOptions = initialOptions;
    root._v4LedOnChange = onChange;
    root._v4LedPointer = null;
    root._v4LedNotifyTimer = null;
    bindLedUi(root);
    renderLedState(root);
    return root;
  }

  function makeInitialState(baseState) {
    const savedParts = Array.isArray(baseState.layoutBlocks) ? baseState.layoutBlocks.map((block, index) => makePartFromLayoutBlock(block, index)).filter(part => part.cells.length) : [];
    if (savedParts.length) {
      const cols = Math.max(GRID_COLS, ...savedParts.map(part => Math.max(...part.cells.map(cell => cell.x)) + 3));
      const rows = Math.max(GRID_ROWS, ...savedParts.map(part => Math.max(...part.cells.map(cell => cell.y)) + 3));
      return {
        base: Object.assign({}, baseState),
        cols,
        rows,
        activeId: savedParts[0].id,
        nextId: savedParts.length + 2,
        parts: savedParts
      };
    }
    const calc = ROOT.LedCalculator;
    const format = calc && calc.getCabinetFormat ? calc.getCabinetFormat(baseState.format || '640x640') : { widthM: 0.64, heightM: 0.64 };
    const widthRound = calc && calc.roundCabinetCount ? calc.roundCabinetCount(baseState.widthM || 4, format.widthM) : { roundedCount: 6 };
    const heightRound = calc && calc.roundCabinetCount ? calc.roundCabinetCount(baseState.heightM || 2.56, format.heightM) : { roundedCount: 4 };
    const columns = Math.max(1, Math.round(widthRound.roundedCount || 6));
    const rows = Math.max(1, Math.round(heightRound.roundedCount || 4));
    const x0 = Math.max(1, Math.floor((GRID_COLS - columns) / 2));
    const y0 = Math.max(1, Math.floor((GRID_ROWS - rows) / 2));
    return {
      base: Object.assign({}, baseState),
      cols: GRID_COLS,
      rows: GRID_ROWS,
      activeId: 'main',
      nextId: 2,
      parts: [makeRectPart('main', 'Основной экран', 'main', x0, y0, columns, rows, 0)]
    };
  }

  function resolveMountModeValue(base) {
    const src = base || {};
    const calc = ROOT.LedCalculator;
    const flags = calc && calc.getMountFlags ? calc.getMountFlags(src) : { standing: src.mountStanding !== false, hanging: src.mountHanging === true };
    if (flags.standing && flags.hanging) return 'stand+hanging';
    if (flags.hanging) return 'hanging';
    if (flags.standing) return 'standing';
    return 'none';
  }

  function getMountModeOptionsHtml(selectedMode) {
    const selected = selectedMode || 'standing';
    const options = [
      { id: 'standing', label: 'Стоим' },
      { id: 'hanging', label: 'Висим' },
      { id: 'stand+hanging', label: 'Стоим + Висим' },
      { id: 'none', label: 'Без всего' }
    ];
    return options.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
  }

  function getMountFlagsFromUiMode(mode) {
    const calc = ROOT.LedCalculator;
    if (calc && calc.getMountFlags) return calc.getMountFlags({ mountMode: mode || 'standing' });
    const key = String(mode || 'standing').toLowerCase();
    return { standing: key.includes('stand') || key.includes('сто'), hanging: key.includes('hang') || key.includes('вис'), mode: key || 'standing' };
  }

  function makePartFromLayoutBlock(block, index) {
    const src = block || {};
    const cells = Array.isArray(src.cells) ? src.cells.map(cell => ({ x: Math.max(0, Math.round(Number(cell && cell.x || 0))), y: Math.max(0, Math.round(Number(cell && cell.y || 0))) })) : [];
    const type = src.type || (index === 0 ? 'main' : 'custom');
    return {
      id: src.id || (index === 0 ? 'main' : `custom-${index + 1}`),
      name: src.name || src.label || (index === 0 ? 'Основной экран' : `LED конструкция ${index + 1}`),
      type,
      colorKey: src.colorKey || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      cells
    };
  }

  function makeRectPart(id, name, type, x, y, columns, rows, colorIndex) {
    const cells = [];
    for (let yy = 0; yy < rows; yy += 1) {
      for (let xx = 0; xx < columns; xx += 1) cells.push({ x: x + xx, y: y + yy });
    }
    return { id, name, type, colorKey: DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length], cells };
  }

  function bindLedUi(root) {
    const formatEl = root.querySelector('[data-led="format"]');
    if (formatEl) formatEl.addEventListener('change', () => {
      applyFormatDefaults(root, formatEl.value);
      buildMainTemplate(root, true);
      renderLedState(root);
    });
    root.querySelectorAll('[data-led]').forEach(input => input.addEventListener('input', () => {
      readBaseFields(root);
      if (input.getAttribute('data-led') === 'widthM' || input.getAttribute('data-led') === 'heightM') buildMainTemplate(root, true);
      renderLedState(root);
    }));
    root.querySelectorAll('[data-led-check]').forEach(input => input.addEventListener('change', () => {
      readBaseFields(root);
      renderLedState(root);
    }));
    root.querySelectorAll('[data-led-template]').forEach(btn => btn.addEventListener('click', () => {
      handleTemplate(root, btn.getAttribute('data-led-template'));
      renderLedState(root);
    }));
    const activeSelect = root.querySelector('[data-led-active]');
    if (activeSelect) activeSelect.addEventListener('change', () => {
      root._v4LedState.activeId = activeSelect.value;
      renderActiveSelect(root);
      renderLedGrid(root);
    });
    const partsList = root.querySelector('[data-led-parts-list]');
    if (partsList) partsList.addEventListener('click', event => {
      const btn = event.target && event.target.closest ? event.target.closest('[data-led-part-select]') : null;
      if (!btn || !root._v4LedState) return;
      root._v4LedState.activeId = btn.getAttribute('data-led-part-select') || root._v4LedState.activeId;
      renderActiveSelect(root);
      renderLedGrid(root);
    });
    root.querySelectorAll('[data-led-action]').forEach(btn => btn.addEventListener('click', () => {
      handleAction(root, btn.getAttribute('data-led-action'));
      renderLedState(root);
    }));
    const grid = root.querySelector('[data-led-grid]');
    if (grid) {
      grid.addEventListener('pointerdown', event => startDraw(root, event));
      grid.addEventListener('pointermove', event => continueDraw(root, event));
      grid.addEventListener('pointerup', event => endDraw(root, event));
      grid.addEventListener('pointercancel', event => endDraw(root, event));
      grid.addEventListener('pointerleave', event => endDraw(root, event));
    }
  }

  function applyFormatDefaults(root, formatId) {
    const calc = ROOT.LedCalculator;
    if (!calc || !calc.getCabinetFormat) return;
    const format = calc.getCabinetFormat(formatId);
    setField(root, 'cabinetWeightKg', format.defaultWeightKg || 0);
    setField(root, 'cabinetPowerW', format.defaultPowerW || 0);
    setField(root, 'cabinetStartupPowerW', format.defaultStartupPowerW || 0);
    readBaseFields(root);
  }

  function setField(root, key, value) {
    const el = root.querySelector(`[data-led="${key}"]`);
    if (el) el.value = value;
  }

  function readBaseFields(root) {
    const get = key => {
      const el = root.querySelector(`[data-led="${key}"]`);
      return el ? el.value : '';
    };
    const getCheck = key => {
      const el = root.querySelector(`[data-led-check="${key}"]`);
      return !!(el && el.checked);
    };
    const state = root._v4LedState || makeInitialState({});
    const mountModeValue = get('mountMode') || resolveMountModeValue({ mountStanding: getCheck('mountStanding'), mountHanging: getCheck('mountHanging') });
    const mountFlags = getMountFlagsFromUiMode(mountModeValue);
    state.base = Object.assign({}, state.base || {}, {
      widthM: get('widthM'),
      heightM: get('heightM'),
      format: get('format'),
      pitch: get('pitch'),
      cabinetWeightKg: get('cabinetWeightKg'),
      cabinetPowerW: get('cabinetPowerW'),
      cabinetStartupPowerW: get('cabinetStartupPowerW'),
      legType: get('legType'),
      legCount: get('legCount'),
      mountMode: mountFlags.mode,
      mountStanding: mountFlags.standing,
      mountHanging: mountFlags.hanging
    });
    root._v4LedState = state;
    return state.base;
  }

  function buildMainTemplate(root, keepSideParts) {
    const state = root._v4LedState;
    const calc = ROOT.LedCalculator;
    const base = readBaseFields(root);
    const format = calc && calc.getCabinetFormat ? calc.getCabinetFormat(base.format || '640x640') : { widthM: 0.64, heightM: 0.64 };
    const w = calc && calc.roundCabinetCount ? calc.roundCabinetCount(base.widthM || 4, format.widthM).roundedCount : 6;
    const h = calc && calc.roundCabinetCount ? calc.roundCabinetCount(base.heightM || 2.56, format.heightM).roundedCount : 4;
    const columns = Math.max(1, Math.round(w || 1));
    const rows = Math.max(1, Math.round(h || 1));
    ensureGridSize(state, columns + 4, rows + 4);
    const x0 = Math.max(1, Math.floor((state.cols - columns) / 2));
    const y0 = Math.max(1, Math.floor((state.rows - rows) / 2));
    const main = makeRectPart('main', 'Основной экран', 'main', x0, y0, columns, rows, 0);
    const rest = keepSideParts ? state.parts.filter(part => part.id !== 'main') : [];
    state.parts = [main].concat(rest);
    state.activeId = 'main';
    normalizeGridBounds(state, 2);
  }

  function handleTemplate(root, action) {
    const state = root._v4LedState;
    if (!state) return;
    readBaseFields(root);
    if (action === 'clear') {
      resetLedGridCanvas(state);
      return;
    }
    if (action === 'main') {
      buildMainTemplate(root, false);
      return;
    }
    if (action === 'new') {
      const id = `custom-${state.nextId++}`;
      const part = { id, name: `LED конструкция ${state.parts.length + 1}`, type: 'custom', colorKey: DEFAULT_COLORS[state.parts.length % DEFAULT_COLORS.length], cells: [] };
      state.parts.push(part);
      state.activeId = id;
      normalizeGridBounds(state, 2);
      return;
    }
    const main = getMainPart(state) || state.parts[0];
    if (!main) {
      buildMainTemplate(root, false);
      return;
    }
    const box = getPartBounds(main);
    const id = `${action}-${state.nextId++}`;
    const labels = { left: 'Левая вертикальная полоса', right: 'Правая вертикальная полоса', top: 'Верхняя горизонтальная полоса', bottom: 'Нижняя горизонтальная полоса' };
    let x = box.minX;
    let y = box.minY;
    let w = 1;
    let h = box.rows;
    if (action === 'left') x = box.minX - 1;
    if (action === 'right') x = box.maxX + 1;
    if (action === 'top') { x = box.minX; y = box.minY - 1; w = box.columns; h = 1; }
    if (action === 'bottom') { x = box.minX; y = box.maxY + 1; w = box.columns; h = 1; }
    ensureGridSize(state, x + w + 4, y + h + 4);
    const part = makeRectPart(id, labels[action] || 'LED конструкция', action, x, y, w, h, state.parts.length);
    state.parts.push(part);
    state.activeId = id;
    normalizeGridBounds(state, 2);
  }

  function handleAction(root, action) {
    const state = root._v4LedState;
    if (!state) return;
    const active = getActivePart(state, true);
    if (action === 'remove-active' && active) {
      state.parts = state.parts.filter(part => part.id !== active.id);
      state.activeId = state.parts[0] ? state.parts[0].id : '';
    }
    if (action === 'clear-active' && active) {
      active.cells = [];
    }
    if (action === 'copy-active' && active) {
      const box = getPartBounds(active);
      const id = `${active.type || 'copy'}-${state.nextId++}`;
      const copy = {
        id,
        name: `${active.name || 'LED конструкция'} копия`,
        type: active.type || 'custom',
        colorKey: DEFAULT_COLORS[state.parts.length % DEFAULT_COLORS.length],
        cells: (active.cells || []).map(cell => ({ x: cell.x + Math.max(1, box.columns), y: cell.y + 1 }))
      };
      state.parts.push(copy);
      state.activeId = id;
      normalizeGridBounds(state, 2);
    }
    if (action === 'rename' && active) {
      const next = window.prompt('Название LED-конструкции', active.name || 'LED конструкция');
      if (next != null && String(next).trim()) active.name = String(next).trim();
    }
  }

  function getMainPart(state) { return (state.parts || []).find(part => part.id === 'main') || null; }

  function getActivePart(state, createIfMissing) {
    let part = (state.parts || []).find(item => item.id === state.activeId) || null;
    if (!part && createIfMissing) {
      const id = state.activeId || `custom-${state.nextId++}`;
      part = { id, name: `LED конструкция ${state.parts.length + 1}`, type: 'custom', colorKey: DEFAULT_COLORS[state.parts.length % DEFAULT_COLORS.length], cells: [] };
      state.parts.push(part);
      state.activeId = id;
    }
    return part;
  }

  function ensureGridSize(state, minCols, minRows) {
    state.cols = Math.max(state.cols || GRID_COLS, minCols || 0, GRID_COLS);
    state.rows = Math.max(state.rows || GRID_ROWS, minRows || 0, GRID_ROWS);
  }

  function resetLedGridCanvas(state) {
    if (!state) return;
    state.cols = GRID_COLS;
    state.rows = GRID_ROWS;
    state.parts = [];
    state.activeId = '';
    state.nextId = 1;
  }

  function shiftAllCells(state, dx, dy) {
    (state.parts || []).forEach(part => {
      part.cells = (part.cells || []).map(cell => ({ x: cell.x + dx, y: cell.y + dy }));
    });
  }

  function getAllBounds(state) {
    const cells = [];
    (state.parts || []).forEach(part => (part.cells || []).forEach(cell => cells.push(cell)));
    if (!cells.length) return null;
    const minX = Math.min(...cells.map(cell => cell.x));
    const minY = Math.min(...cells.map(cell => cell.y));
    const maxX = Math.max(...cells.map(cell => cell.x));
    const maxY = Math.max(...cells.map(cell => cell.y));
    return { minX, minY, maxX, maxY, columns: maxX - minX + 1, rows: maxY - minY + 1 };
  }

  function normalizeGridBounds(state, margin) {
    const pad = margin == null ? 2 : margin;
    const bounds = getAllBounds(state);
    if (!bounds) {
      state.cols = Math.max(state.cols || GRID_COLS, GRID_COLS);
      state.rows = Math.max(state.rows || GRID_ROWS, GRID_ROWS);
      return;
    }
    if (bounds.minX < pad || bounds.minY < pad) {
      const dx = Math.max(0, pad - bounds.minX);
      const dy = Math.max(0, pad - bounds.minY);
      shiftAllCells(state, dx, dy);
    }
    const nextBounds = getAllBounds(state) || bounds;
    state.cols = Math.max(GRID_COLS, state.cols || GRID_COLS, nextBounds.maxX + pad + 1);
    state.rows = Math.max(GRID_ROWS, state.rows || GRID_ROWS, nextBounds.maxY + pad + 1);
  }

  function expandForCell(state, x, y) {
    let changed = false;
    if (x >= state.cols - 1) { state.cols = x + 3; changed = true; }
    if (y >= state.rows - 1) { state.rows = y + 3; changed = true; }
    if (x < 1 || y < 1) {
      shiftAllCells(state, x < 1 ? 2 : 0, y < 1 ? 2 : 0);
      state.cols += x < 1 ? 2 : 0;
      state.rows += y < 1 ? 2 : 0;
      changed = true;
    }
    return changed;
  }

  function getPartBounds(part) {
    const cells = (part && part.cells) || [];
    if (!cells.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, columns: 0, rows: 0 };
    const minX = Math.min(...cells.map(cell => cell.x));
    const minY = Math.min(...cells.map(cell => cell.y));
    const maxX = Math.max(...cells.map(cell => cell.x));
    const maxY = Math.max(...cells.map(cell => cell.y));
    return { minX, minY, maxX, maxY, columns: maxX - minX + 1, rows: maxY - minY + 1 };
  }

  function renderLedState(root) {
    readBaseFields(root);
    renderActiveSelect(root);
    renderLedGrid(root);
    renderLedResult(root);
    notifyLedChange(root);
  }

  function notifyLedChange(root) {
    const onChange = root._v4LedOnChange;
    if (typeof onChange !== 'function') return;
    window.clearTimeout(root._v4LedNotifyTimer);
    root._v4LedNotifyTimer = window.setTimeout(() => {
      try { onChange(getLedQuotePayload(root)); } catch (error) { console.warn('[LED] onChange failed', error); }
    }, 0);
  }

  function renderActiveSelect(root) {
    const state = root._v4LedState;
    const select = root.querySelector('[data-led-active]');
    const list = root.querySelector('[data-led-parts-list]');
    if (select) {
      select.innerHTML = (state.parts || []).map(part => `<option value="${escapeHtml(part.id)}" ${part.id === state.activeId ? 'selected' : ''}>${escapeHtml(part.name)} · ${part.cells.length} каб.</option>`).join('');
    }
    if (list) {
      const parts = state.parts || [];
      list.innerHTML = parts.map(part => `<button type="button" class="${part.id === state.activeId ? 'active' : ''}" data-led-part-select="${escapeHtml(part.id)}">${escapeHtml(part.name)} <span>${part.cells.length} каб.</span></button>`).join('');
    }
  }

  function renderLedGrid(root) {
    const state = root._v4LedState;
    const grid = root.querySelector('[data-led-grid]');
    if (!grid || !state) return;
    grid.style.gridTemplateColumns = `repeat(${state.cols}, minmax(18px, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${state.rows}, minmax(18px, 1fr))`;
    const activeId = state.activeId;
    const partMap = new Map();
    (state.parts || []).forEach(part => (part.cells || []).forEach(cell => partMap.set(`${cell.x}:${cell.y}`, part)));
    let html = '';
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const part = partMap.get(`${x}:${y}`);
        const classes = ['v4-led-cell'];
        if (part) classes.push('filled', `color-${part.colorKey || 'main'}`);
        if (part && part.id === activeId) classes.push('active-part');
        html += `<button type="button" class="${classes.join(' ')}" data-x="${x}" data-y="${y}" title="${part ? escapeHtml(part.name) : 'Пустая ячейка'}"></button>`;
      }
    }
    grid.innerHTML = html;
    const note = root.querySelector('[data-led-grid-note]');
    if (note) {
      const totalCells = (state.parts || []).reduce((sum, part) => sum + part.cells.length, 0);
      const active = getActivePart(state, false);
      note.textContent = `${state.parts.length} конструкц. · ${totalCells} кабинетов · активна: ${active ? active.name : 'нет'}`;
    }
  }

  function getCellFromEvent(event) {
    const target = event.target && event.target.closest ? event.target.closest('.v4-led-cell') : null;
    if (!target) return null;
    return { x: Number(target.getAttribute('data-x')), y: Number(target.getAttribute('data-y')) };
  }

  function startDraw(root, event) {
    const cell = getCellFromEvent(event);
    if (!cell) return;
    event.preventDefault();
    const state = root._v4LedState;
    const active = getActivePart(state, true);
    const exists = active.cells.some(item => item.x === cell.x && item.y === cell.y);
    root._v4LedPointer = { pointerId: event.pointerId, mode: exists ? 'remove' : 'add', touched: new Set() };
    try { event.target.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
    toggleCell(root, cell.x, cell.y, root._v4LedPointer.mode);
  }

  function continueDraw(root, event) {
    const pointer = root._v4LedPointer;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const cell = getCellFromEvent(event);
    if (!cell) return;
    event.preventDefault();
    toggleCell(root, cell.x, cell.y, pointer.mode);
  }

  function endDraw(root, event) {
    const pointer = root._v4LedPointer;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    root._v4LedPointer = null;
    try { event.target.releasePointerCapture(event.pointerId); } catch (error) { /* noop */ }
  }

  function toggleCell(root, x, y, mode) {
    const state = root._v4LedState;
    const pointer = root._v4LedPointer;
    const key = `${x}:${y}`;
    if (pointer && pointer.touched.has(key)) return;
    if (pointer) pointer.touched.add(key);
    const active = getActivePart(state, true);
    if (!active) return;
    expandForCell(state, x, y);
    active.cells = active.cells || [];
    const idx = active.cells.findIndex(cell => cell.x === x && cell.y === y);
    if (mode === 'add' && idx < 0) active.cells.push({ x, y });
    if (mode === 'remove' && idx >= 0) active.cells.splice(idx, 1);
    normalizeGridBounds(state, 2);
    renderLedState(root);
  }

  function buildPayload(root) {
    const state = root._v4LedState;
    const base = readBaseFields(root);
    return Object.assign({}, base, {
      layoutBlocks: (state.parts || []).map(part => ({ id: part.id, name: part.name, type: part.type, colorKey: part.colorKey, cells: (part.cells || []).map(cell => ({ x: cell.x, y: cell.y })) }))
    });
  }

  function renderLedResult(root) {
    const calc = ROOT.LedCalculator;
    const box = root.querySelector('[data-led-result]');
    if (!calc || !box) return;
    const payload = buildPayload(root);
    const result = calc.calculateLed(payload);
    root._v4LedResult = result;
    const constructions = result.constructions || [];
    const rows = constructions.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.typeLabel)}</span></td>
        <td>${item.cabinets} шт</td>
        <td>${formatM(item.widthM)}×${formatM(item.heightM)} м</td>
        <td>${item.aspectRatio}</td>
        <td>${item.pixelsWidth}×${item.pixelsHeight} px</td>
        <td>${formatKg(item.totalWeightKg)}</td>
        <td>${formatKw(item.maxPowerKw)} / ${formatKw(item.averagePowerKw)}</td>
        <td>${item.powerconSchuko}</td>
        <td>${item.hangingBars}</td>
        <td>${item.standing ? item.legTypeName : '—'}</td>
        <td>${item.legs}</td>
        <td>${item.halfCouplers}</td>
        <td>${item.mmBolts}</td>
        <td>${escapeHtml(item.note || '')}</td>
      </tr>`).join('');
    box.innerHTML = `
      <div class="v4-summary-strip">
        <div><b>${formatM(result.actualWidthM)}×${formatM(result.actualHeightM)} м</b><span>Фактический габарит</span></div>
        <div><b>${result.totalCabinets} шт</b><span>Кабинеты</span></div>
        <div><b>${result.resolution.width}×${result.resolution.height}</b><span>Пиксели</span></div>
        <div><b>${formatKg(result.totalWeightKg)}</b><span>Вес</span></div>
        <div><b>${formatKw(result.totalMaxPowerKw)}</b><span>Макс. мощность</span></div>
        <div><b>${result.totalHangingBars} шт</b><span>Hanging Bar</span></div>
      </div>
      <div class="v4-card compact-card">
        <div class="v4-kicker">LED constructions</div>
        <h4>Отчёт по отдельным конструкциям</h4>
        <div class="v4-table-scroll"><table class="v4-table"><thead><tr><th>#</th><th>Конструкция</th><th>Кабинеты</th><th>Размер</th><th>Соотношение</th><th>Пиксели</th><th>Вес</th><th>Мощность</th><th>Powercon-Schuko</th><th>Hanging Bar</th><th>Стандарт</th><th>Ноги</th><th>Печеньки</th><th>М8×20</th><th>Примечание</th></tr></thead><tbody>${rows || '<tr><td colspan="15">Нет активных кабинетов</td></tr>'}</tbody></table></div>
      </div>
      <div class="v4-table-scroll"><table class="v4-table"><thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Пуск</th><th>Примечание</th></tr></thead><tbody>${result.items.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.code || '')}</span></td><td>${item.qty} ${item.unit}</td><td>${item.weightKg ? formatKg(item.weightKg) : '—'}</td><td>${item.powerW ? formatKw(item.powerW / 1000) : '—'}</td><td>${item.startupPowerW ? formatKw(item.startupPowerW / 1000) : '—'}</td><td>${escapeHtml(item.note || '')}</td></tr>`).join('')}</tbody></table></div>
      <button type="button" class="btn-secondary" data-led-export="tech">Показать техлист LED</button>
      <button type="button" class="btn-secondary" data-led-export="bom">Показать LED BOM bridge</button>
    `;
    const techBtn = box.querySelector('[data-led-export="tech"]');
    const bomBtn = box.querySelector('[data-led-export="bom"]');
    if (techBtn) techBtn.addEventListener('click', () => showTextExport(root, result.technicalSheet, 'Техлист LED'));
    if (bomBtn) bomBtn.addEventListener('click', () => showTextExport(root, JSON.stringify((ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedBom) ? ROOT.V4LedBomBridge.buildLedBom(result) : {}, null, 2), 'LED BOM bridge'));
  }

  function showTextExport(root, text, title) {
    const panel = root.querySelector('[data-led-export-panel]') || document.createElement('div');
    panel.setAttribute('data-led-export-panel', '');
    panel.className = 'v4-card compact-card';
    panel.innerHTML = `<div class="v4-kicker">${escapeHtml(title)}</div><textarea class="v4-textarea" rows="12">${escapeHtml(text || '')}</textarea>`;
    root.appendChild(panel);
  }

  function getLedQuotePayload(root) {
    const calc = ROOT.LedCalculator;
    if (!calc) return null;
    const result = root._v4LedResult || calc.calculateLed(buildPayload(root));
    return result;
  }

  function formatM(value) { return (Number(value) || 0).toFixed(2); }
  function formatKg(value) { return `${(Number(value) || 0).toFixed(2)} кг`; }
  function formatKw(value) { return `${(Number(value) || 0).toFixed(2)} кВт`; }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  ROOT.LedCalculatorUI = { renderLedCalculator, getLedQuotePayload };
})();
