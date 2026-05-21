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
      { id: 'standing', label: 'Стоим · ноги, печеньки и болты' },
      { id: 'hanging', label: 'Висим · Hanging Bar + крепёж' },
      { id: 'stand+hanging', label: 'Стоим + висим' },
      { id: 'none', label: 'Без ног и подвеса' }
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
    const pad = Math.max(1, Number(margin || 2));
    const bounds = getAllBounds(state);
    if (!bounds) {
      ensureGridSize(state, GRID_COLS, GRID_ROWS);
      return;
    }
    let dx = 0;
    let dy = 0;
    if (bounds.minX < pad) dx = pad - bounds.minX;
    if (bounds.minY < pad) dy = pad - bounds.minY;
    if (dx || dy) shiftAllCells(state, dx, dy);
    const shifted = getAllBounds(state) || bounds;
    ensureGridSize(state, shifted.maxX + pad + 1, shifted.maxY + pad + 1);
  }

  function expandGridAroundPoint(state, x, y, pointer) {
    let nx = Number(x || 0);
    let ny = Number(y || 0);
    const pad = pointer ? 1 : 2;
    const startCols = pointer && pointer.startCols ? pointer.startCols : (state.cols || GRID_COLS);
    const startRows = pointer && pointer.startRows ? pointer.startRows : (state.rows || GRID_ROWS);
    const maxCols = pointer ? Math.max(GRID_COLS, startCols + 2) : Infinity;
    const maxRows = pointer ? Math.max(GRID_ROWS, startRows + 2) : Infinity;
    const canGrow = edge => {
      if (!pointer) return true;
      pointer.expandedEdges = pointer.expandedEdges || {};
      if (pointer.expandedEdges[edge]) return false;
      pointer.expandedEdges[edge] = true;
      return true;
    };

    if (nx <= 0 && canGrow('left')) {
      const prevCols = state.cols || GRID_COLS;
      const nextCols = Math.min(maxCols, Math.max(prevCols + pad, GRID_COLS));
      const dx = Math.max(0, nextCols - prevCols);
      if (dx) {
        shiftAllCells(state, dx, 0);
        state.cols = nextCols;
        nx += dx;
      }
    }
    if (ny <= 0 && canGrow('top')) {
      const prevRows = state.rows || GRID_ROWS;
      const nextRows = Math.min(maxRows, Math.max(prevRows + pad, GRID_ROWS));
      const dy = Math.max(0, nextRows - prevRows);
      if (dy) {
        shiftAllCells(state, 0, dy);
        state.rows = nextRows;
        ny += dy;
      }
    }
    if (nx >= (state.cols || GRID_COLS) - 1 && canGrow('right')) {
      state.cols = Math.min(maxCols, Math.max((state.cols || GRID_COLS) + pad, nx + pad + 1));
    }
    if (ny >= (state.rows || GRID_ROWS) - 1 && canGrow('bottom')) {
      state.rows = Math.min(maxRows, Math.max((state.rows || GRID_ROWS) + pad, ny + pad + 1));
    }

    nx = Math.max(0, Math.min(nx, (state.cols || GRID_COLS) - 1));
    ny = Math.max(0, Math.min(ny, (state.rows || GRID_ROWS) - 1));
    return { x: nx, y: ny };
  }

  function getPartBounds(part) {
    const cells = Array.isArray(part && part.cells) ? part.cells : [];
    if (!cells.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, columns: 1, rows: 1 };
    const minX = Math.min(...cells.map(cell => cell.x));
    const minY = Math.min(...cells.map(cell => cell.y));
    const maxX = Math.max(...cells.map(cell => cell.x));
    const maxY = Math.max(...cells.map(cell => cell.y));
    return { minX, minY, maxX, maxY, columns: maxX - minX + 1, rows: maxY - minY + 1 };
  }

  function startDraw(root, event) {
    const cell = resolvePointerCell(event);
    if (!cell) return;
    event.preventDefault();
    const state = root._v4LedState;
    const active = getActivePart(state, true);
    const x = Number(cell.getAttribute('data-x'));
    const y = Number(cell.getAttribute('data-y'));
    const ownsCell = active.cells.some(item => item.x === x && item.y === y);
    if (event.currentTarget && event.currentTarget.setPointerCapture) {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch (err) { /* noop */ }
    }
    root._v4LedPointer = {
      action: ownsCell ? 'erase' : 'paint',
      activeId: active.id,
      pointerId: event.pointerId,
      lastKey: '',
      startCols: state.cols || GRID_COLS,
      startRows: state.rows || GRID_ROWS,
      expandedEdges: {}
    };
    applyDraw(root, x, y);
  }

  function continueDraw(root, event) {
    if (!root._v4LedPointer) return;
    const cell = resolvePointerCell(event);
    if (!cell) return;
    event.preventDefault();
    applyDraw(root, Number(cell.getAttribute('data-x')), Number(cell.getAttribute('data-y')));
  }

  function endDraw(root, event) {
    if (!root._v4LedPointer) return;
    const grid = root.querySelector('[data-led-grid]');
    if (grid && grid.releasePointerCapture && event && event.pointerId != null) {
      try { grid.releasePointerCapture(event.pointerId); } catch (err) { /* noop */ }
    }
    root._v4LedPointer = null;
    renderLedState(root);
  }

  function resolvePointerCell(event) {
    let cell = event.target && event.target.closest ? event.target.closest('[data-led-cell]') : null;
    if (!cell && document.elementFromPoint && event.clientX != null && event.clientY != null) {
      const node = document.elementFromPoint(event.clientX, event.clientY);
      cell = node && node.closest ? node.closest('[data-led-cell]') : null;
    }
    return cell;
  }

  function applyDraw(root, x, y) {
    const state = root._v4LedState;
    const pointer = root._v4LedPointer;
    if (!state || !pointer) return;
    const point = expandGridAroundPoint(state, x, y, pointer);
    x = point.x;
    y = point.y;
    const key = `${x},${y}`;
    if (pointer.lastKey === key) return;
    pointer.lastKey = key;
    const active = getActivePart(state, true);
    if (!active) return;
    state.parts.forEach(part => { if (part.id !== active.id) part.cells = part.cells.filter(cell => !(cell.x === x && cell.y === y)); });
    const exists = active.cells.some(cell => cell.x === x && cell.y === y);
    if (pointer.action === 'paint' && !exists) active.cells.push({ x, y });
    if (pointer.action === 'erase' && exists) active.cells = active.cells.filter(cell => !(cell.x === x && cell.y === y));
    renderLedGrid(root);
    scheduleNotify(root);
  }

  function scheduleNotify(root) {
    if (root._v4LedNotifyTimer) clearTimeout(root._v4LedNotifyTimer);
    root._v4LedNotifyTimer = setTimeout(() => {
      root._v4LedNotifyTimer = null;
      renderLedResult(root);
    }, 120);
  }

  function renderLedState(root) {
    renderActiveSelect(root);
    renderLedGrid(root);
    renderLedResult(root);
  }

  function renderActiveSelect(root) {
    const state = root._v4LedState;
    const select = root.querySelector('[data-led-active]');
    if (!state || !select) return;
    const parts = state.parts || [];
    if (!state.activeId && parts[0]) state.activeId = parts[0].id;
    select.innerHTML = parts.length ? parts.map(part => `<option value="${escapeHtml(part.id)}" ${part.id === state.activeId ? 'selected' : ''}>${escapeHtml(part.name)} · ${part.cells.length} каб.</option>`).join('') : '<option value="">Нет конструкций</option>';
    const list = select.closest('.v4-led-panel-block') ? select.closest('.v4-led-panel-block').querySelector('[data-led-parts-list]') : null;
    if (list) {
      list.innerHTML = parts.length ? parts.map(part => `<button type="button" class="v4-led-part-chip color-${escapeHtml(part.colorKey || 'custom')}${part.id === state.activeId ? ' active' : ''}" data-led-part-select="${escapeHtml(part.id)}"><b>${escapeHtml(part.name)}</b><span>${formatNumber((part.cells || []).length, 0)} каб.</span></button>`).join('') : '<span class="v4-muted">Нет LED-конструкций</span>';
    }
  }

  function getCellOwner(state, x, y) {
    return (state.parts || []).find(part => (part.cells || []).some(cell => cell.x === x && cell.y === y)) || null;
  }

  function renderLedGrid(root) {
    const state = root._v4LedState;
    const grid = root.querySelector('[data-led-grid]');
    const note = root.querySelector('[data-led-grid-note]');
    if (!state || !grid) return;
    grid.style.gridTemplateColumns = `repeat(${state.cols}, var(--led-cell-size, 28px))`;
    grid.innerHTML = '';
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const owner = getCellOwner(state, x, y);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `v4-led-cell${owner ? ' filled' : ''}${owner && owner.id === state.activeId ? ' active' : ''}${owner ? ' color-' + (owner.colorKey || 'custom') : ''}`;
        cell.setAttribute('data-led-cell', '1');
        cell.setAttribute('data-x', String(x));
        cell.setAttribute('data-y', String(y));
        cell.title = owner ? owner.name : 'Пусто';
        cell.innerHTML = owner ? '<span class="v4-led-cell-texture"></span><i></i>' : '';
        grid.appendChild(cell);
      }
    }
    if (note) {
      const active = getActivePart(state, false);
      const count = (state.parts || []).reduce((sum, part) => sum + (part.cells || []).length, 0);
      note.textContent = `${state.parts.length} конструкц. · ${count} кабинетов · активна: ${active ? active.name : 'нет'}`;
    }
  }

  function buildLayoutBlocks(state) {
    return (state.parts || []).filter(part => part.cells && part.cells.length).map(part => ({
      id: part.id,
      name: part.name,
      type: part.type,
      colorKey: part.colorKey || 'custom',
      gridCols: state.cols || GRID_COLS,
      gridRows: state.rows || GRID_ROWS,
      cells: part.cells.map(cell => ({ x: cell.x, y: cell.y }))
    }));
  }

  function buildInput(root) {
    const base = readBaseFields(root);
    const state = root._v4LedState || {};
    const layoutBlocks = buildLayoutBlocks(state);
    const options = root._v4LedOptions || {};
    const catalogMode = options.catalogMode || options.sourceMode || (options.mode === 'quote' ? 'quote' : (String(options.source || '').toLowerCase().includes('quote') ? 'quote' : 'quick'));
    return Object.assign({}, base, { layoutMode: 'freeform', layoutBlocks, explicitEmptyLayout: layoutBlocks.length === 0, sourceMode: catalogMode, catalogMode });
  }

  function calculate(root) {
    const calc = ROOT.LedCalculator;
    const input = buildInput(root);
    const result = calc && calc.calculateLedLayout ? calc.calculateLedLayout(input) : calc.calculateLedScreen(input);
    const section = buildLedSection(input, result);
    root._v4LedSection = section;
    if (typeof root._v4LedOnChange === 'function') root._v4LedOnChange(section, result, input);
    return { input, result, section };
  }

  function renderLedResult(root) {
    const calc = ROOT.LedCalculator;
    const box = root.querySelector('[data-led-result]');
    if (!calc || !box) return;
    const { input, result, section } = calculate(root);
    const summary = calc.summarizeLed(result);
    const rows = section && Array.isArray(section.bomRows) ? section.bomRows : calc.buildLedBomRows(result);
    box.innerHTML = `
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>Фактический габарит</b><span>${escapeHtml(summary.actualSize)}</span><small>${escapeHtml(summary.cabinets)}</small></div>
        <div class="v4-mini"><b>Конструкции</b><span>${formatNumber(summary.constructionCount || 0, 0)} шт</span><small>каждая считается отдельно</small></div>
        <div class="v4-mini"><b>Пиксели</b><span>${escapeHtml(summary.pixelSize)}</span><small>${escapeHtml(summary.cabinetPixelSize)}</small></div>
        <div class="v4-mini"><b>Вес / мощность</b><span>${formatNumber(summary.weightKg, 1)} кг · ${formatNumber(summary.powerKw, 2)} кВт</span><small>пуск: ${formatNumber(summary.startupPowerKw, 2)} кВт</small></div>
        <div class="v4-mini"><b>Монтаж / ноги / Hanging Bar</b><span>${escapeHtml(summary.mountMode)} · ${result.legCount} ног · ${summary.hangingBars || 0} HB</span><small>${escapeHtml(result.legType.name)} · печеньки: ${summary.brackets} · М8×60: ${summary.bolts} · М8×20: ${summary.m8x20Bolts || 0} · Спанцет/шакл: ${summary.spansetCount || 0}/${summary.shackleCount || 0}</small></div>
        <div class="v4-mini"><b>Кабели</b><span>PowerCON–Schuko: ${summary.powerconSchukoCables}</span><small>220В: ${summary.powerLinks} · RJ45: ${summary.rj45Links}</small></div>
        <div class="v4-mini ok"><b>${section && section.readyFor && section.readyFor.bomContract ? 'READY' : 'BOM'}</b><span>LED → общий BOM</span><small>${rows.length} строк · contract-ready</small></div>
      </div>
      ${renderConstructionReport(result)}
      <div class="v4-table-wrap">
        <table class="v4-table">
          <thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Пуск</th><th>Примечание</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code)}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit)}</td><td>${formatNumber(row.weightKg, 1)} кг</td><td>${row.powerW ? formatNumber(row.powerW / 1000, 2) + ' кВт' : '—'}</td><td>${row.startupPowerW ? formatNumber(row.startupPowerW / 1000, 2) + ' кВт' : '—'}</td><td>${escapeHtml(row.note)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="v4-actions">
        <button type="button" class="btn-secondary" data-led-show-tech>Показать техлист без цен</button>
        <button type="button" class="btn-secondary" data-led-show-warehouse>Показать складской лист LED</button>
        <button type="button" class="btn-secondary" data-led-show-bom>Показать LED BOM bridge</button>
      </div>
      ${input && input.catalogMode === 'quote' ? '' : (ROOT.QuickPdfExport && ROOT.QuickPdfExport.renderActionHtml ? ROOT.QuickPdfExport.renderActionHtml('led') : '')}
      <div data-led-export></div>`;

    if (ROOT.QuickPdfExport && ROOT.QuickPdfExport.bindAction && (!input || input.catalogMode !== 'quote')) {
      ROOT.QuickPdfExport.bindAction(box, { kind:'led', title:'Быстрый технический расчёт LED-экрана', getSection:() => getLedSection(root) });
    }
    const techBtn = box.querySelector('[data-led-show-tech]');
    const warehouseBtn = box.querySelector('[data-led-show-warehouse]');
    const bomBtn = box.querySelector('[data-led-show-bom]');
    if (techBtn) techBtn.addEventListener('click', () => {
      if (calc.buildLedTechSheet) renderSheetPanel(box, calc.buildLedTechSheet(result));
    });
    if (warehouseBtn) warehouseBtn.addEventListener('click', () => {
      if (calc.buildLedWarehouseSheet) renderSheetPanel(box, calc.buildLedWarehouseSheet(result));
    });
    if (bomBtn) bomBtn.addEventListener('click', () => renderLedBomBridgePanel(box, section));
  }

  function renderConstructionReport(result) {
    const parts = Array.isArray(result && result.constructions) ? result.constructions : [];
    if (!parts.length) return '';
    return `<div class="v4-led-construction-report">
      <div class="v4-card-head"><div><div class="v4-kicker">LED constructions</div><h4>Отчёт по отдельным конструкциям</h4></div></div>
      <div class="v4-table-wrap"><table class="v4-table v4-table--compact"><thead><tr><th>#</th><th>Конструкция</th><th>Кабинеты</th><th>Размер</th><th>Соотношение</th><th>Пиксели</th><th>px/м</th><th>PowerCON–Schuko</th><th>Hanging Bar</th><th>Спанцет</th><th>Шакл</th><th>Печеньки висим</th><th>М8×20</th><th>Примечание</th></tr></thead><tbody>
        ${parts.map((part, index) => `<tr><td>${index + 1}</td><td><b>${escapeHtml(part.name)}</b><br><span class="v4-muted">${escapeHtml(part.type || '')}</span></td><td>${formatNumber(part.columns, 0)}×${formatNumber(part.rows, 0)} / ${formatNumber(part.cabinetCount, 0)} шт</td><td>${formatNumber(part.actualWidthM, 2)}×${formatNumber(part.actualHeightM, 2)} м</td><td><b>${escapeHtml(part.aspectRatioLabel || (part.aspectRatio && part.aspectRatio.label) || '—')}</b><br><small>${formatNumber(part.actualWidthM / Math.max(0.001, part.actualHeightM), 2)}:1</small></td><td>${formatNumber(part.totalPixelsX, 0)}×${formatNumber(part.totalPixelsY, 0)} px<br><small>активных: ${formatNumber(part.activePixels || part.totalPixels, 0)} px</small></td><td>${formatNumber(part.pixelDensityX, 0)}×${formatNumber(part.pixelDensityY, 0)} px/м</td><td>${formatNumber(part.powerconSchukoCables || 0, 0)} шт<br><small>${formatNumber(part.powerconSchukoPowerW || part.powerW || 0, 0)} Вт</small></td><td>${formatNumber(part.hangingBarCount || 0, 0)} шт</td><td>${formatNumber(part.spansetCount || 0, 0)} шт</td><td>${formatNumber(part.shackleCount || 0, 0)} шт</td><td>${formatNumber(part.hangingBrackets || 0, 0)} шт<br><small>(ширина−1)×ряды</small></td><td>${formatNumber(part.m8x20Bolts || 0, 0)} шт</td><td>${escapeHtml(part.note || '')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  }

  function buildLedSection(input, result) {
    if (ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedSection) {
      return ROOT.V4LedBomBridge.buildLedSection(input || {}, { source: input && input.catalogMode === 'quote' ? 'quote-led-freeform-constructor-ui-v4-shared-bom' : 'quick-led-freeform-constructor-ui-v4-shared-bom', catalogMode: input && input.catalogMode === 'quote' ? 'quote' : 'quick' });
    }
    const calc = ROOT.LedCalculator;
    const res = result || (calc && calc.calculateLedLayout ? calc.calculateLedLayout(input || {}) : calc.calculateLedScreen(input || {}));
    const rows = calc && calc.buildLedBomRows ? calc.buildLedBomRows(res) : [];
    return {
      type: 'led',
      sectionKey: 'led',
      status: 'configured',
      source: 'led-calculator-ui-fallback',
      input: input || {},
      result: res,
      constructions: res.constructions || [],
      bomRows: rows.map(row => Object.assign({}, row, { sourceType: input && input.catalogMode === 'quote' ? 'own' : 'quick_ideal', sourceSystem: input && input.catalogMode === 'quote' ? 'equipment_database_system_part' : 'quick_ideal_catalog', ledPart: row.id || row.code })),
      weightKg: res.totalWeightKg || 0,
      powerW: res.totalPowerW || 0,
      startupPowerW: res.totalStartupPowerW || 0,
      readyFor: { sharedBom: true, quoteItems: true, warehousePickList: true, documents: true, bomContract: true, legacyV3Touched: false }
    };
  }

  function renderLedBomBridgePanel(root, section) {
    const mount = root.querySelector('[data-led-export]');
    if (!mount || !section) return;
    const snapshot = ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedSharedBomSnapshot
      ? ROOT.V4LedBomBridge.buildLedSharedBomSnapshot(section, { source: 'led-calculator-ui-preview' })
      : { section, sharedRows: section.bomRows || [], quoteItems: [], totals: {} };
    const rows = snapshot.sharedRows || [];
    mount.innerHTML = `
      <div class="v4-card" style="margin-top:14px">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">LED BOM bridge</div>
            <h4>LED → shared BOM → quote_items</h4>
            <p class="v4-muted">Диагностический снимок без цен. Формулы LED сохранены, freeform-конструкции нормализуются для общего v4 BOM.</p>
          </div>
          <button type="button" class="btn-secondary" data-led-copy-export>Скопировать JSON</button>
        </div>
        <div class="v4-summary-grid">
          <div class="v4-mini"><b>${formatNumber(rows.length, 0)}</b><span>shared BOM строк</span></div>
          <div class="v4-mini"><b>${formatNumber((snapshot.quoteItems || []).length, 0)}</b><span>quote_items preview</span></div>
          <div class="v4-mini"><b>${formatNumber(snapshot.totals && snapshot.totals.weightKg, 1)} кг</b><span>вес</span></div>
          <div class="v4-mini"><b>${formatNumber(snapshot.totals && snapshot.totals.powerW, 0)} Вт</b><span>мощность</span></div>
        </div>
        <div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Маршрут</th></tr></thead><tbody>${rows.map(row => `<tr><td><code>${escapeHtml(row.code || '')}</code></td><td><b>${escapeHtml(row.name || '')}</b><br><small>${escapeHtml(row.ledPart || '')}</small></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatNumber(row.weightKg, 1)} кг</td><td>quote.led<br><small>shared BOM → quote_items → warehouse</small></td></tr>`).join('')}</tbody></table></div>
      </div>`;
    const copyBtn = mount.querySelector('[data-led-copy-export]');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(JSON.stringify(snapshot, null, 2)));
  }

  function renderSheetPanel(root, sheet) {
    const mount = root.querySelector('[data-led-export]');
    if (!mount || !sheet) return;
    const text = sheetToText(sheet);
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    mount.innerHTML = `
      <div class="v4-card" style="margin-top:14px">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">technical export</div>
            <h4>${escapeHtml(sheet.title || 'LED лист без цен')}</h4>
            <p class="v4-muted">Цены и клиентские данные не выводятся. Подходит для техника и склада.</p>
          </div>
          <button type="button" class="btn-secondary" data-led-copy-export>Скопировать</button>
        </div>
        ${renderSheetSummary(sheet)}
        ${renderSheetConstructionRows(sheet)}
        <div class="v4-table-wrap">
          <table class="v4-table">
            <thead><tr><th>#</th><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Примечание</th></tr></thead>
            <tbody>${rows.map((row, idx) => `<tr><td>${escapeHtml(row.n || idx + 1)}</td><td>${escapeHtml(row.code || '')}</td><td><b>${escapeHtml(row.name || '')}</b></td><td>${formatNumber(row.qty || 0, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatNumber(row.weightKg || 0, 1)} кг</td><td><span class="v4-muted">${escapeHtml(row.note || '')}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
        <textarea readonly class="v4-export-text" data-led-export-text>${escapeHtml(text)}</textarea>
      </div>`;
    const copyBtn = mount.querySelector('[data-led-copy-export]');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(text));
  }

  function renderSheetSummary(sheet) {
    const summary = sheet.summary || {};
    const totals = sheet.totals || {};
    if (sheet.type === 'led-tech-sheet') {
      return `<div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(summary.actualSize || '')}</b><span>Фактический размер</span><small>${escapeHtml(summary.requestedSize || '')}</small></div>
        <div class="v4-mini"><b>${escapeHtml(summary.cabinets || '')}</b><span>Кабинеты</span><small>${escapeHtml(summary.cabinetPixels || '')}</small></div>
        <div class="v4-mini"><b>${formatNumber((summary.weightKg || 0), 1)} кг</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatNumber((summary.powerW || 0) / 1000, 2)} кВт</b><span>Рабочая мощность</span><small>пуск ${formatNumber((summary.startupPowerW || 0) / 1000, 2)} кВт</small></div>
      </div>`;
    }
    return `<div class="v4-summary-grid">
      <div class="v4-mini"><b>${formatNumber(totals.positions || 0, 0)}</b><span>Позиций</span></div>
      <div class="v4-mini"><b>${formatNumber(totals.qty || 0, 0)}</b><span>Всего штук</span></div>
      <div class="v4-mini"><b>${formatNumber(totals.weightKg || 0, 1)} кг</b><span>Вес</span></div>
      <div class="v4-mini"><b>${formatNumber((totals.powerW || 0) / 1000, 2)} кВт</b><span>Рабочая мощность</span></div>
    </div>`;
  }

  function renderSheetConstructionRows(sheet) {
    const rows = Array.isArray(sheet.constructionRows) ? sheet.constructionRows : [];
    if (!rows.length) return '';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--compact"><thead><tr><th>#</th><th>Конструкция</th><th>Кабинеты</th><th>Размер</th><th>Пиксели</th><th>Примечание</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.n || ''}</td><td><b>${escapeHtml(row.name || '')}</b></td><td>${formatNumber(row.columns || 0, 0)}×${formatNumber(row.rows || 0, 0)} / ${formatNumber(row.cabinetCount || 0, 0)} шт</td><td>${formatNumber(row.actualWidthM || 0, 2)}×${formatNumber(row.actualHeightM || 0, 2)} м</td><td>${formatNumber(row.totalPixelsX || 0, 0)}×${formatNumber(row.totalPixelsY || 0, 0)} px</td><td>${escapeHtml(row.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function sheetToText(sheet) {
    const lines = [];
    lines.push(sheet.title || 'LED лист без цен');
    lines.push('Цены: не выводятся');
    if (sheet.summary) {
      const s = sheet.summary;
      lines.push(`Экран: ${s.screen || ''}`);
      lines.push(`Размер: ${s.actualSize || ''} (запрошено ${s.requestedSize || ''})`);
      lines.push(`Кабинеты: ${s.cabinets || ''}`);
      lines.push(`Пиксели: ${s.pixels || ''}`);
      lines.push(`Вес: ${formatNumber(s.weightKg || 0, 1)} кг`);
      lines.push(`Мощность: ${formatNumber((s.powerW || 0) / 1000, 2)} кВт, пуск ${formatNumber((s.startupPowerW || 0) / 1000, 2)} кВт`);
      lines.push(`Кабели: ${s.cables || ''}`);
      lines.push(`Крепеж: ${s.rigging || ''}`);
    }
    if (sheet.totals) {
      const t = sheet.totals;
      lines.push(`Итого позиций: ${formatNumber(t.positions || 0, 0)}`);
      lines.push(`Итого вес: ${formatNumber(t.weightKg || 0, 1)} кг`);
      lines.push(`Мощность: ${formatNumber((t.powerW || 0) / 1000, 2)} кВт, пуск ${formatNumber((t.startupPowerW || 0) / 1000, 2)} кВт`);
    }
    if (Array.isArray(sheet.constructionRows) && sheet.constructionRows.length) {
      lines.push('');
      lines.push('Отдельные LED-конструкции:');
      sheet.constructionRows.forEach(row => {
        lines.push(`${row.n || ''}. ${row.name || ''}: ${formatNumber(row.columns || 0, 0)}×${formatNumber(row.rows || 0, 0)} каб., активных ${formatNumber(row.cabinetCount || 0, 0)} шт; ${formatNumber(row.actualWidthM || 0, 2)}×${formatNumber(row.actualHeightM || 0, 2)} м; ${formatNumber(row.totalPixelsX || 0, 0)}×${formatNumber(row.totalPixelsY || 0, 0)} px${row.note ? '; ' + row.note : ''}`);
      });
    }
    lines.push('');
    lines.push('Комплектация:');
    (sheet.rows || []).forEach((row, idx) => {
      lines.push(`${row.n || idx + 1}. ${row.code || ''} — ${row.name || ''}: ${formatNumber(row.qty || 0, 0)} ${row.unit || 'шт'}; ${formatNumber(row.weightKg || 0, 1)} кг${row.note ? '; ' + row.note : ''}`);
    });
    return lines.join('\n');
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
  }

  function roundLabel(round) {
    if (!round) return '—';
    const dir = round.direction === 'up' ? 'вверх' : round.direction === 'down' ? 'вниз' : round.direction || 'точно';
    return `${formatNumber(round.targetMeters, 2)}→${formatNumber(round.actualMeters, 2)} м (${dir})`;
  }

  function formatNumber(value, digits) {
    const n = Number(value || 0);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function getLedInput(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root || !root._v4LedState) return null;
    return buildInput(root);
  }

  function getLedSection(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root || !root._v4LedState) return null;
    if (root._v4LedSection) return root._v4LedSection;
    const built = calculate(root);
    return built && built.section ? built.section : null;
  }

  ROOT.LedCalculatorUI = { renderLedCalculator, getLedInput, getLedSection };
})();
