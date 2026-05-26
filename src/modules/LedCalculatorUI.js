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
          <label class="v4-field"><span>Монтаж LED</span><select data-led="mountMode">${getMountModeOptionsHtml(resolveMountModeValue(seed.base))}</select><span class="v4-field-subspan">Тип ног</span><select data-led="legType">${Object.values(calc.LEG_TYPES || {}).map(leg => `<option value="${leg.id}" ${leg.id === seed.base.legType ? 'selected' : ''}>${escapeHtml(leg.name)}</option>`).join('')}</select></label>
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