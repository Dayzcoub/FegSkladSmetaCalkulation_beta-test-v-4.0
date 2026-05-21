(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const DEFAULT_FORMAT_ID = '640x640';
  const DEFAULT_PITCH_ID = 'p4';

  const CABINET_FORMATS = Object.freeze({
    '500x500': Object.freeze({ id: '500x500', name: '500×500', widthM: 0.5, heightM: 0.5, defaultWeightKg: 7.5, defaultPowerW: 160, defaultStartupPowerW: 0 }),
    '640x640': Object.freeze({ id: '640x640', name: '640×640', widthM: 0.64, heightM: 0.64, defaultWeightKg: 14, defaultPowerW: 320, defaultStartupPowerW: 600, defaultPixelsX: 160, defaultPixelsY: 160 }),
    '500x1000': Object.freeze({ id: '500x1000', name: '500×1000', widthM: 0.5, heightM: 1.0, defaultWeightKg: 13.5, defaultPowerW: 300, defaultStartupPowerW: 0 })
  });

  const PIXEL_PITCHES = Object.freeze({
    p2: Object.freeze({ id: 'p2', name: 'P2', pixelPitchMm: 2 }),
    p3: Object.freeze({ id: 'p3', name: 'P3', pixelPitchMm: 3 }),
    p4: Object.freeze({ id: 'p4', name: 'P4', pixelPitchMm: 4 }),
    p5: Object.freeze({ id: 'p5', name: 'P5', pixelPitchMm: 5 })
  });

  const LEG_TYPES = Object.freeze({
    '3m': Object.freeze({ id: '3m', name: 'Нога LED 3 м', heightM: 3, defaultWeightKg: 4 }),
    '2.5m': Object.freeze({ id: '2.5m', name: 'Нога LED 2,5 м', heightM: 2.5, defaultWeightKg: 3.6 }),
    '2m': Object.freeze({ id: '2m', name: 'Нога LED 2 м', heightM: 2, defaultWeightKg: 3 })
  });

  const DEFAULT_ACCESSORIES = Object.freeze({
    powerLinkPerCabinet: 1,
    rj45LinkPerCabinet: 1,
    powerconSchukoCabinetsPerCable: 10,
    powerconSchukoWattsPerCable: 3400,
    bracketsPerLeg: 4,
    m8BoltsPerLeg: 16,
    m8x20BoltsPerHangingBracket: 4,
    powerLinkWeightKg: 0.35,
    rj45LinkWeightKg: 0.2,
    powerconSchukoWeightKg: 0.75,
    bracketWeightKg: 0.18,
    m8BoltWeightKg: 0.02,
    m8x20BoltWeightKg: 0.02,
    legWeightKg: 0,
    hangingBarWeightKg: 0,
    spansetWeightKg: 0,
    shackleWeightKg: 0
  });


  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function toText(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }

  function clampPositive(value, fallback) {
    return Math.max(0, toNumber(value, fallback));
  }

  function getCabinetFormat(id) {
    return CABINET_FORMATS[id] || CABINET_FORMATS[DEFAULT_FORMAT_ID];
  }

  function getPitch(id) {
    return PIXEL_PITCHES[id] || PIXEL_PITCHES[DEFAULT_PITCH_ID];
  }

  function getLegType(id) {
    return LEG_TYPES[id] || LEG_TYPES['3m'];
  }

  function roundCabinetCount(targetMeters, cabinetMeters) {
    const target = clampPositive(targetMeters, cabinetMeters);
    const unit = Math.max(0.001, clampPositive(cabinetMeters, 1));
    const raw = target / unit;
    const whole = Math.floor(raw);
    const fraction = raw - whole;
    const count = Math.max(1, fraction >= 0.5 ? Math.ceil(raw) : Math.floor(raw));
    return {
      targetMeters: target,
      cabinetMeters: unit,
      rawCount: raw,
      wholeCount: whole,
      remainderMeters: target - whole * unit,
      remainderRatio: fraction,
      roundedCount: count,
      actualMeters: count * unit,
      direction: fraction >= 0.5 ? 'up' : 'down'
    };
  }

  function calculatePixelCount(format, pitch) {
    const px = Math.round((format.widthM * 1000) / Math.max(0.001, pitch.pixelPitchMm));
    const py = Math.round((format.heightM * 1000) / Math.max(0.001, pitch.pixelPitchMm));
    return {
      cabinetPixelsX: Number(format.defaultPixelsX || px),
      cabinetPixelsY: Number(format.defaultPixelsY || py),
      calculatedPixelsX: px,
      calculatedPixelsY: py
    };
  }


  function toBool(value, fallback) {
    if (value === true || value === 'true' || value === '1' || value === 1 || value === 'yes' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 0 || value === 'no' || value === 'off') return false;
    return !!fallback;
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a || 0));
    let y = Math.abs(Math.round(b || 0));
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  function makeAspectRatio(widthUnits, heightUnits) {
    const w = Math.max(0, Math.round(widthUnits || 0));
    const h = Math.max(0, Math.round(heightUnits || 0));
    if (!w || !h) return { x: w, y: h, ratio: 0, label: '—' };
    const d = gcd(w, h);
    return { x: w / d, y: h / d, ratio: w / h, label: `${w / d}:${h / d}` };
  }

  function countTopCabinets(cells) {
    const safeCells = Array.isArray(cells) ? cells : [];
    if (!safeCells.length) return 0;
    const minY = Math.min(...safeCells.map(cell => Math.round(toNumber(cell && cell.y, 0))));
    return safeCells.filter(cell => Math.round(toNumber(cell && cell.y, 0)) === minY).length;
  }

  function countHorizontalModuleConnections(columns, rows) {
    const c = Math.max(0, Math.round(toNumber(columns, 0)));
    const r = Math.max(0, Math.round(toNumber(rows, 0)));
    return Math.max(0, c - 1) * r;
  }



  function calculateHangingRiggingForCounts(enabled, hangingBarCount, cabinetCount, horizontalConnectionCount, columns, rows) {
    const bars = enabled ? Math.max(0, Math.round(toNumber(hangingBarCount, 0))) : 0;
    const cabinets = enabled ? Math.max(0, Math.round(toNumber(cabinetCount, 0))) : 0;
    const horizontalConnections = enabled ? Math.max(0, Math.round(toNumber(horizontalConnectionCount, 0))) : 0;
    const hangingBrackets = horizontalConnections;
    const m8x20Bolts = hangingBrackets * 4;
    const safeColumns = enabled ? Math.max(0, Math.round(toNumber(columns, 0))) : 0;
    const safeRows = enabled ? Math.max(0, Math.round(toNumber(rows, 0))) : 0;
    return {
      hangingBarCount: bars,
      cabinetCount: cabinets,
      columns: safeColumns,
      rows: safeRows,
      horizontalConnectionCount: horizontalConnections,
      verticalConnectionCount: horizontalConnections,
      hangingBarBrackets: 0,
      hangingCabinetBrackets: horizontalConnections,
      hangingBrackets,
      m8x20Bolts,
      spansetCount: bars,
      shackleCount: bars,
      formula: enabled ? `(${safeColumns} - 1) × ${safeRows} = ${hangingBrackets} печ.; ${bars} бар = ${bars} спанцет + ${bars} шакл` : '0'
    };
  }

  function buildHangingRiggingByConstruction(blocks, enabled) {
    return (Array.isArray(blocks) ? blocks : []).map((block, index) => {
      const cells = Array.isArray(block && block.cells) ? block.cells : [];
      const cabinets = Math.max(0, Math.round(toNumber(block && block.cabinetCount, 0)));
      const columns = Math.max(0, Math.round(toNumber(block && block.columns, 0)));
      const rows = Math.max(0, Math.round(toNumber(block && block.rows, 0)));
      const bars = enabled ? (cells.length ? countTopCabinets(cells) : columns) : 0;
      const horizontalConnections = enabled ? countHorizontalModuleConnections(columns, rows) : 0;
      return Object.assign({
        id: block && block.id || makeStableId('led-construction', index),
        name: block && block.name || `LED конструкция ${index + 1}`
      }, calculateHangingRiggingForCounts(enabled, bars, cabinets, horizontalConnections, columns, rows));
    });
  }

  function calculatePowerconSchukoCablesForCount(cabinetCount, perCable) {
    const cabinets = Math.max(0, Math.round(toNumber(cabinetCount, 0)));
    if (!cabinets) return 0;
    return Math.ceil(cabinets / Math.max(1, toNumber(perCable, 10)));
  }

  function calculatePowerconSchukoCablesForPower(powerW, wattsPerCable) {
    const watts = Math.max(0, Math.round(toNumber(powerW, 0)));
    if (!watts) return 0;
    return Math.ceil(watts / Math.max(1, toNumber(wattsPerCable, 3400)));
  }

  function buildPowerconSchukoByConstruction(blocks, wattsPerCable, cabinetPowerW) {
    const limitW = Math.max(1, toNumber(wattsPerCable, 3400));
    const defaultCabinetPowerW = Math.max(0, toNumber(cabinetPowerW, CABINET_FORMATS[DEFAULT_FORMAT_ID].defaultPowerW));
    return (Array.isArray(blocks) ? blocks : []).map((block, index) => {
      const cabinets = Math.max(0, Math.round(toNumber(block && block.cabinetCount, 0)));
      const unitPowerW = Math.max(0, toNumber(block && block.cabinetPowerW, defaultCabinetPowerW));
      const powerW = Math.max(0, toNumber(block && block.totalPowerW, cabinets * unitPowerW));
      const cables = calculatePowerconSchukoCablesForPower(powerW, limitW);
      return {
        id: block && block.id || makeStableId('led-construction', index),
        name: block && block.name || `LED конструкция ${index + 1}`,
        cabinetCount: cabinets,
        cabinetPowerW: unitPowerW,
        powerW,
        powerconSchukoCables: cables,
        wattsPerCable: limitW,
        perCable: limitW,
        formula: powerW ? `ceil(${powerW}Вт/${limitW}Вт)` : '0'
      };
    });
  }

  function getMountFlags(opts) {
    const src = opts || {};
    const rawMode = String(src.mountMode || src.mount || '').trim().toLowerCase();
    const modeKey = rawMode.replace(/[\s_\-+]+/g, '');
    const hasMode = rawMode.length > 0;
    const hasStanding = Object.prototype.hasOwnProperty.call(src, 'mountStanding') || Object.prototype.hasOwnProperty.call(src, 'standing');
    const hasHanging = Object.prototype.hasOwnProperty.call(src, 'mountHanging') || Object.prototype.hasOwnProperty.call(src, 'hanging');
    let modeStanding = false;
    let modeHanging = false;
    if (hasMode) {
      if (modeKey === 'none' || modeKey === 'off' || rawMode.includes('без')) {
        modeStanding = false;
        modeHanging = false;
      } else {
        modeStanding = rawMode.includes('stand') || rawMode.includes('standing') || rawMode.includes('сто') || modeKey === 'legs';
        modeHanging = rawMode.includes('hang') || rawMode.includes('hanging') || rawMode.includes('вис') || modeKey.includes('hb');
        if (modeKey === 'standhanging' || modeKey === 'standinghanging' || modeKey === 'both' || rawMode.includes('оба')) {
          modeStanding = true;
          modeHanging = true;
        }
      }
    }
    const standing = hasStanding ? toBool(src.mountStanding == null ? src.standing : src.mountStanding, true) : (hasMode ? modeStanding : true);
    const hanging = hasHanging ? toBool(src.mountHanging == null ? src.hanging : src.mountHanging, false) : (hasMode ? modeHanging : false);
    return { standing, hanging, mode: standing && hanging ? 'stand+hanging' : (hanging ? 'hanging' : (standing ? 'standing' : 'none')) };
  }

  function calculateLedScreen(input) {
    const opts = input || {};
    const format = getCabinetFormat(opts.format || opts.formatId || DEFAULT_FORMAT_ID);
    const pitch = getPitch(opts.pitch || opts.pitchId || DEFAULT_PITCH_ID);
    const legType = getLegType(opts.legType || opts.legTypeId);
    const accessories = Object.assign({}, DEFAULT_ACCESSORIES, opts.accessories || {});
    const mount = getMountFlags(opts);
    const desiredWidthM = clampPositive(opts.widthM, format.widthM);
    const desiredHeightM = clampPositive(opts.heightM, format.heightM);
    const widthRound = roundCabinetCount(desiredWidthM, format.widthM);
    const heightRound = roundCabinetCount(desiredHeightM, format.heightM);
    const columns = widthRound.roundedCount;
    const rows = heightRound.roundedCount;
    const cabinetCount = columns * rows;
    const areaM2 = widthRound.actualMeters * heightRound.actualMeters;
    const requestedAreaM2 = desiredWidthM * desiredHeightM;
    const cabinetWeightKg = clampPositive(opts.cabinetWeightKg, format.defaultWeightKg);
    const cabinetPowerW = clampPositive(opts.cabinetPowerW, format.defaultPowerW);
    const cabinetStartupPowerW = clampPositive(opts.cabinetStartupPowerW, format.defaultStartupPowerW || 0);
    const legCount = mount.standing ? Math.max(0, Math.round(clampPositive(opts.legCount, 0))) : 0;
    const powerLinks = cabinetCount * Math.max(0, toNumber(accessories.powerLinkPerCabinet, 1));
    const rj45Links = cabinetCount * Math.max(0, toNumber(accessories.rj45LinkPerCabinet, 1));
    const powerconSchukoWattsPerCable = Math.max(1, toNumber(accessories.powerconSchukoWattsPerCable, 3400));
    const powerconSchukoByConstruction = buildPowerconSchukoByConstruction([{ id: 'led-construction-main', name: 'Основной экран', cabinetCount, cabinetPowerW }], powerconSchukoWattsPerCable, cabinetPowerW);
    const powerconSchukoCables = powerconSchukoByConstruction.reduce((sum, row) => sum + row.powerconSchukoCables, 0);
    const fourCabinetJoints = Math.max(0, columns - 1) * Math.max(0, rows - 1);
    const hangingBarCount = mount.hanging ? columns : 0;
    const hangingRiggingByConstruction = buildHangingRiggingByConstruction([{ id: 'led-construction-main', name: 'Основной экран', columns, rows, cabinetCount }], mount.hanging);
    const hangingRigging = hangingRiggingByConstruction[0] || calculateHangingRiggingForCounts(false, 0, 0);
    const standingBrackets = legCount * Math.max(0, toNumber(accessories.bracketsPerLeg, 4));
    const hangingBrackets = hangingRigging.hangingBrackets || 0;
    const brackets = standingBrackets + hangingBrackets;
    const standingM8x60Bolts = legCount * Math.max(0, toNumber(accessories.m8BoltsPerLeg, 16));
    const m8Bolts = standingM8x60Bolts;
    const m8x20Bolts = hangingRigging.m8x20Bolts || 0;
    const spansetCount = hangingRigging.spansetCount || 0;
    const shackleCount = hangingRigging.shackleCount || 0;
    const pixel = calculatePixelCount(format, pitch);
    const totalPixelsX = columns * pixel.cabinetPixelsX;
    const totalPixelsY = rows * pixel.cabinetPixelsY;
    const totalPixels = totalPixelsX * totalPixelsY;
    const cabinetsWeightKg = cabinetCount * cabinetWeightKg;
    const powerLinksWeightKg = powerLinks * clampPositive(accessories.powerLinkWeightKg, 0);
    const rj45LinksWeightKg = rj45Links * clampPositive(accessories.rj45LinkWeightKg, 0);
    const powerconSchukoWeightKg = powerconSchukoCables * clampPositive(accessories.powerconSchukoWeightKg, 0);
    const bracketsWeightKg = brackets * clampPositive(accessories.bracketWeightKg, 0);
    const m8BoltsWeightKg = m8Bolts * clampPositive(accessories.m8BoltWeightKg, 0);
    const m8x20BoltsWeightKg = m8x20Bolts * clampPositive(accessories.m8x20BoltWeightKg, accessories.m8BoltWeightKg || 0);
    const hangingBarsWeightKg = hangingBarCount * clampPositive(accessories.hangingBarWeightKg, 0);
    const spansetsWeightKg = spansetCount * clampPositive(accessories.spansetWeightKg, 0);
    const shacklesWeightKg = shackleCount * clampPositive(accessories.shackleWeightKg, 0);
    const customAccessories = opts.accessories || {};
    const hasCustomLegWeight = Object.prototype.hasOwnProperty.call(customAccessories, 'legWeightKg');
    const legWeightKg = hasCustomLegWeight ? clampPositive(customAccessories.legWeightKg, legType.defaultWeightKg || 0) : clampPositive(legType.defaultWeightKg, 0);
    const legsWeightKg = legCount * legWeightKg;
    const totalWeightKg = cabinetsWeightKg + powerLinksWeightKg + rj45LinksWeightKg + powerconSchukoWeightKg + bracketsWeightKg + m8BoltsWeightKg + m8x20BoltsWeightKg + legsWeightKg + hangingBarsWeightKg + spansetsWeightKg + shacklesWeightKg;
    const totalPowerW = cabinetCount * cabinetPowerW;
    const totalStartupPowerW = cabinetCount * cabinetStartupPowerW;
    return {
      format,
      pitch,
      legType,
      mountMode: mount.mode,
      mountStanding: mount.standing,
      mountHanging: mount.hanging,
      desiredWidthM,
      desiredHeightM,
      requestedAreaM2,
      actualWidthM: widthRound.actualMeters,
      actualHeightM: heightRound.actualMeters,
      areaM2,
      columns,
      rows,
      cabinetCount,
      cabinetWeightKg,
      cabinetPowerW,
      cabinetStartupPowerW,
      totalPowerW,
      totalPowerKw: totalPowerW / 1000,
      totalStartupPowerW,
      totalStartupPowerKw: totalStartupPowerW / 1000,
      cabinetPixelsX: pixel.cabinetPixelsX,
      cabinetPixelsY: pixel.cabinetPixelsY,
      calculatedCabinetPixelsX: pixel.calculatedPixelsX,
      calculatedCabinetPixelsY: pixel.calculatedPixelsY,
      totalPixelsX,
      totalPixelsY,
      totalPixels,
      cabinetsWeightKg,
      totalWeightKg,
      widthRound,
      heightRound,
      fourCabinetJoints,
      hangingBarCount,
      hangingBarsWeightKg,
      spansetCount,
      spansetsWeightKg,
      shackleCount,
      shacklesWeightKg,
      legCount,
      legWeightKg,
      standingBrackets,
      hangingBrackets,
      hangingBarBrackets: hangingRigging.hangingBarBrackets || 0,
      hangingCabinetBrackets: hangingRigging.hangingCabinetBrackets || 0,
      brackets,
      standingM8x60Bolts,
      m8Bolts,
      m8x20Bolts,
      hangingRiggingByConstruction,
      powerLinks,
      rj45Links,
      powerconSchukoCables,
      powerconSchukoPerCable: powerconSchukoWattsPerCable,
      powerconSchukoWattsPerCable,
      powerconSchukoByConstruction,
      accessories,
      powerLinksWeightKg,
      rj45LinksWeightKg,
      powerconSchukoWeightKg,
      bracketsWeightKg,
      m8BoltsWeightKg,
      m8x20BoltsWeightKg,
      spansetsWeightKg,
      shacklesWeightKg,
      legsWeightKg,
      aspectRatio: makeAspectRatio(columns, rows),
      aspectRatioLabel: makeAspectRatio(columns, rows).label
    };
  }

  function makeStableId(prefix, index) {
    return `${prefix || 'led-part'}-${index + 1}`;
  }

  function normalizeLayoutBlock(block, index) {
    const src = block || {};
    const rawCells = Array.isArray(src.cells) ? src.cells : [];
    const cells = rawCells.map(cell => ({
      x: Math.max(0, Math.round(toNumber(cell && cell.x, 0))),
      y: Math.max(0, Math.round(toNumber(cell && cell.y, 0)))
    })).filter((cell, cellIndex, arr) => arr.findIndex(other => other.x === cell.x && other.y === cell.y) === cellIndex);
    let minX = Math.max(0, Math.round(toNumber(src.x, 0)));
    let minY = Math.max(0, Math.round(toNumber(src.y, 0)));
    let columns = Math.max(1, Math.round(toNumber(src.columns == null ? src.w : src.columns, 1)));
    let rows = Math.max(1, Math.round(toNumber(src.rows == null ? src.h : src.rows, 1)));
    if (cells.length) {
      minX = Math.min(...cells.map(cell => cell.x));
      minY = Math.min(...cells.map(cell => cell.y));
      const maxX = Math.max(...cells.map(cell => cell.x));
      const maxY = Math.max(...cells.map(cell => cell.y));
      columns = Math.max(1, maxX - minX + 1);
      rows = Math.max(1, maxY - minY + 1);
    } else {
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) cells.push({ x: minX + x, y: minY + y });
      }
    }
    const type = toText(src.type, index === 0 ? 'main' : 'custom');
    return {
      id: toText(src.id, makeStableId('led-construction', index)),
      name: toText(src.name || src.label || src.title, index === 0 ? 'Основной экран' : `LED конструкция ${index + 1}`),
      type,
      x: minX,
      y: minY,
      columns,
      rows,
      cells,
      cabinetCount: cells.length
    };
  }

  function calculateEmptyLedLayout(input) {
    const opts = input || {};
    const format = getCabinetFormat(opts.format || opts.formatId || DEFAULT_FORMAT_ID);
    const pitch = getPitch(opts.pitch || opts.pitchId || DEFAULT_PITCH_ID);
    const legType = getLegType(opts.legType || opts.legTypeId);
    const accessories = Object.assign({}, DEFAULT_ACCESSORIES, opts.accessories || {});
    const mount = getMountFlags(opts);
    const cabinetWeightKg = clampPositive(opts.cabinetWeightKg, format.defaultWeightKg);
    const cabinetPowerW = clampPositive(opts.cabinetPowerW, format.defaultPowerW);
    const cabinetStartupPowerW = clampPositive(opts.cabinetStartupPowerW, format.defaultStartupPowerW || 0);
    const pixel = calculatePixelCount(format, pitch);
    return {
      layoutMode: 'freeform',
      explicitEmptyLayout: true,
      format,
      pitch,
      legType,
      mountMode: mount.mode,
      mountStanding: mount.standing,
      mountHanging: mount.hanging,
      desiredWidthM: clampPositive(opts.widthM, 0),
      desiredHeightM: clampPositive(opts.heightM, 0),
      requestedAreaM2: 0,
      actualWidthM: 0,
      actualHeightM: 0,
      areaM2: 0,
      boundingAreaM2: 0,
      columns: 0,
      rows: 0,
      cabinetCount: 0,
      constructionCount: 0,
      cabinetWeightKg,
      cabinetPowerW,
      cabinetStartupPowerW,
      totalPowerW: 0,
      totalPowerKw: 0,
      totalStartupPowerW: 0,
      totalStartupPowerKw: 0,
      cabinetPixelsX: pixel.cabinetPixelsX,
      cabinetPixelsY: pixel.cabinetPixelsY,
      calculatedCabinetPixelsX: pixel.calculatedPixelsX,
      calculatedCabinetPixelsY: pixel.calculatedPixelsY,
      totalPixelsX: 0,
      totalPixelsY: 0,
      totalPixels: 0,
      activePixels: 0,
      cabinetsWeightKg: 0,
      totalWeightKg: 0,
      widthRound: { targetMeters: 0, actualMeters: 0, roundedCount: 0, direction: 'empty' },
      heightRound: { targetMeters: 0, actualMeters: 0, roundedCount: 0, direction: 'empty' },
      fourCabinetJoints: 0,
      hangingBarCount: 0,
      hangingBarsWeightKg: 0,
      spansetCount: 0,
      spansetsWeightKg: 0,
      shackleCount: 0,
      shacklesWeightKg: 0,
      legCount: 0,
      legWeightKg: 0,
      standingBrackets: 0,
      hangingBrackets: 0,
      hangingBarBrackets: 0,
      hangingCabinetBrackets: 0,
      brackets: 0,
      standingM8x60Bolts: 0,
      m8Bolts: 0,
      m8x20Bolts: 0,
      hangingRiggingByConstruction: [],
      powerLinks: 0,
      rj45Links: 0,
      powerconSchukoCables: 0,
      powerconSchukoPerCable: Math.max(1, toNumber(accessories.powerconSchukoWattsPerCable, 3400)),
      powerconSchukoWattsPerCable: Math.max(1, toNumber(accessories.powerconSchukoWattsPerCable, 3400)),
      powerconSchukoByConstruction: [],
      accessories,
      powerLinksWeightKg: 0,
      rj45LinksWeightKg: 0,
      powerconSchukoWeightKg: 0,
      bracketsWeightKg: 0,
      m8BoltsWeightKg: 0,
      m8x20BoltsWeightKg: 0,
      spansetsWeightKg: 0,
      shacklesWeightKg: 0,
      legsWeightKg: 0,
      constructions: [],
      layoutBounds: { minX: 0, minY: 0, maxX: -1, maxY: -1, columns: 0, rows: 0 }
    };
  }

  function calculateLedLayout(input) {
    const opts = input || {};
    const rawBlocks = Array.isArray(opts.layoutBlocks) ? opts.layoutBlocks : [];
    if (!rawBlocks.length && opts.explicitEmptyLayout) return calculateEmptyLedLayout(opts);
    if (!rawBlocks.length) {
      const single = calculateLedScreen(opts);
      single.layoutMode = 'single';
      single.constructions = [{
        id: 'led-construction-main',
        name: 'Основной экран',
        type: 'main',
        x: 0,
        y: 0,
        columns: single.columns,
        rows: single.rows,
        cabinetCount: single.cabinetCount,
        cabinetPowerW: single.cabinetPowerW,
        totalPowerW: single.totalPowerW,
        actualWidthM: single.actualWidthM,
        actualHeightM: single.actualHeightM,
        areaM2: single.areaM2,
        totalPixelsX: single.totalPixelsX,
        totalPixelsY: single.totalPixelsY,
        totalPixels: single.totalPixels,
        pixelDensityX: single.totalPixelsX / Math.max(0.001, single.actualWidthM),
        pixelDensityY: single.totalPixelsY / Math.max(0.001, single.actualHeightM),
        aspectRatio: makeAspectRatio(single.columns, single.rows),
        aspectRatioLabel: makeAspectRatio(single.columns, single.rows).label,
        hangingBarCount: single.mountHanging ? single.columns : 0,
        spansetCount: single.spansetCount || 0,
        shackleCount: single.shackleCount || 0,
        hangingBarBrackets: single.hangingBarBrackets || 0,
        hangingCabinetBrackets: single.hangingCabinetBrackets || 0,
        hangingBrackets: single.hangingBrackets || 0,
        m8x20Bolts: single.m8x20Bolts || 0,
        hangingRiggingFormula: single.hangingRiggingByConstruction && single.hangingRiggingByConstruction[0] ? single.hangingRiggingByConstruction[0].formula : '0',
        cells: []
      }];
      single.powerconSchukoByConstruction = buildPowerconSchukoByConstruction(single.constructions, single.powerconSchukoWattsPerCable || single.powerconSchukoPerCable, single.cabinetPowerW);
      single.powerconSchukoCables = single.powerconSchukoByConstruction.reduce((sum, row) => sum + row.powerconSchukoCables, 0);
      single.powerconSchukoWeightKg = single.powerconSchukoCables * clampPositive(single.accessories.powerconSchukoWeightKg, 0);
      single.totalWeightKg = single.cabinetsWeightKg + single.powerLinksWeightKg + single.rj45LinksWeightKg + single.powerconSchukoWeightKg + single.bracketsWeightKg + single.m8BoltsWeightKg + single.m8x20BoltsWeightKg + single.legsWeightKg + single.hangingBarsWeightKg + (single.spansetsWeightKg || 0) + (single.shacklesWeightKg || 0);
      single.constructionCount = 1;
      single.layoutBounds = { minX: 0, minY: 0, maxX: Math.max(0, single.columns - 1), maxY: Math.max(0, single.rows - 1), columns: single.columns, rows: single.rows };
      return single;
    }

    const format = getCabinetFormat(opts.format || opts.formatId || DEFAULT_FORMAT_ID);
    const pitch = getPitch(opts.pitch || opts.pitchId || DEFAULT_PITCH_ID);
    const legType = getLegType(opts.legType || opts.legTypeId);
    const accessories = Object.assign({}, DEFAULT_ACCESSORIES, opts.accessories || {});
    const mount = getMountFlags(opts);
    const cabinetWeightKg = clampPositive(opts.cabinetWeightKg, format.defaultWeightKg);
    const cabinetPowerW = clampPositive(opts.cabinetPowerW, format.defaultPowerW);
    const cabinetStartupPowerW = clampPositive(opts.cabinetStartupPowerW, format.defaultStartupPowerW || 0);
    const pixel = calculatePixelCount(format, pitch);
    const blocks = rawBlocks.map(normalizeLayoutBlock).filter(block => block.cabinetCount > 0);
    const safeBlocks = blocks.length ? blocks : [normalizeLayoutBlock({ id: 'led-construction-main', name: 'Основной экран', x: 0, y: 0, columns: 1, rows: 1 }, 0)];
    const minX = Math.min(...safeBlocks.map(block => block.x));
    const minY = Math.min(...safeBlocks.map(block => block.y));
    const maxX = Math.max(...safeBlocks.map(block => block.x + block.columns - 1));
    const maxY = Math.max(...safeBlocks.map(block => block.y + block.rows - 1));
    const layoutColumns = Math.max(1, maxX - minX + 1);
    const layoutRows = Math.max(1, maxY - minY + 1);
    const cabinetCount = safeBlocks.reduce((sum, block) => sum + block.cabinetCount, 0);
    const legCount = mount.standing ? Math.max(0, Math.round(clampPositive(opts.legCount, 0))) : 0;
    const powerLinks = cabinetCount * Math.max(0, toNumber(accessories.powerLinkPerCabinet, 1));
    const rj45Links = cabinetCount * Math.max(0, toNumber(accessories.rj45LinkPerCabinet, 1));
    const powerconSchukoWattsPerCable = Math.max(1, toNumber(accessories.powerconSchukoWattsPerCable, 3400));
    const powerconSchukoByConstruction = buildPowerconSchukoByConstruction(safeBlocks, powerconSchukoWattsPerCable, cabinetPowerW);
    const powerconSchukoCables = powerconSchukoByConstruction.reduce((sum, row) => sum + row.powerconSchukoCables, 0);
    const hangingRiggingByConstruction = buildHangingRiggingByConstruction(safeBlocks, mount.hanging);
    const hangingBarCount = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.hangingBarCount || 0), 0);
    const spansetCount = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.spansetCount || 0), 0);
    const shackleCount = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.shackleCount || 0), 0);
    const standingBrackets = legCount * Math.max(0, toNumber(accessories.bracketsPerLeg, 4));
    const hangingBrackets = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.hangingBrackets || 0), 0);
    const hangingBarBrackets = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.hangingBarBrackets || 0), 0);
    const hangingCabinetBrackets = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.hangingCabinetBrackets || 0), 0);
    const brackets = standingBrackets + hangingBrackets;
    const standingM8x60Bolts = legCount * Math.max(0, toNumber(accessories.m8BoltsPerLeg, 16));
    const m8Bolts = standingM8x60Bolts;
    const m8x20Bolts = hangingRiggingByConstruction.reduce((sum, row) => sum + (row.m8x20Bolts || 0), 0);
    const hasCustomLegWeight = Object.prototype.hasOwnProperty.call(opts.accessories || {}, 'legWeightKg');
    const legWeightKg = hasCustomLegWeight ? clampPositive((opts.accessories || {}).legWeightKg, legType.defaultWeightKg || 0) : clampPositive(legType.defaultWeightKg, 0);
    const cabinetsWeightKg = cabinetCount * cabinetWeightKg;
    const powerLinksWeightKg = powerLinks * clampPositive(accessories.powerLinkWeightKg, 0);
    const rj45LinksWeightKg = rj45Links * clampPositive(accessories.rj45LinkWeightKg, 0);
    const powerconSchukoWeightKg = powerconSchukoCables * clampPositive(accessories.powerconSchukoWeightKg, 0);
    const bracketsWeightKg = brackets * clampPositive(accessories.bracketWeightKg, 0);
    const m8BoltsWeightKg = m8Bolts * clampPositive(accessories.m8BoltWeightKg, 0);
    const m8x20BoltsWeightKg = m8x20Bolts * clampPositive(accessories.m8x20BoltWeightKg, accessories.m8BoltWeightKg || 0);
    const hangingBarsWeightKg = hangingBarCount * clampPositive(accessories.hangingBarWeightKg, 0);
    const spansetsWeightKg = spansetCount * clampPositive(accessories.spansetWeightKg, 0);
    const shacklesWeightKg = shackleCount * clampPositive(accessories.shackleWeightKg, 0);
    const legsWeightKg = legCount * legWeightKg;
    const totalWeightKg = cabinetsWeightKg + powerLinksWeightKg + rj45LinksWeightKg + powerconSchukoWeightKg + bracketsWeightKg + m8BoltsWeightKg + m8x20BoltsWeightKg + legsWeightKg + hangingBarsWeightKg + spansetsWeightKg + shacklesWeightKg;
    const totalPowerW = cabinetCount * cabinetPowerW;
    const totalStartupPowerW = cabinetCount * cabinetStartupPowerW;
    const powerconSchukoById = new Map(powerconSchukoByConstruction.map(row => [row.id, row]));
    const hangingRiggingById = new Map(hangingRiggingByConstruction.map(row => [row.id, row]));
    const constructions = safeBlocks.map(block => {
      const actualWidthM = block.columns * format.widthM;
      const actualHeightM = block.rows * format.heightM;
      const activeAreaM2 = block.cabinetCount * format.widthM * format.heightM;
      const boundingAreaM2 = actualWidthM * actualHeightM;
      const totalPixelsX = block.columns * pixel.cabinetPixelsX;
      const totalPixelsY = block.rows * pixel.cabinetPixelsY;
      const totalPixels = totalPixelsX * totalPixelsY;
      const activePixels = block.cabinetCount * pixel.cabinetPixelsX * pixel.cabinetPixelsY;
      const aspectRatio = makeAspectRatio(block.columns, block.rows);
      const hangingRow = hangingRiggingById.get(block.id) || calculateHangingRiggingForCounts(false, 0, 0);
      const hangingBarCount = hangingRow.hangingBarCount || 0;
      const powerconRow = powerconSchukoById.get(block.id) || { powerconSchukoCables: 0, formula: '0' };
      return Object.assign({}, block, {
        actualWidthM,
        actualHeightM,
        areaM2: activeAreaM2,
        boundingAreaM2,
        totalPixelsX,
        totalPixelsY,
        totalPixels,
        activePixels,
        pixelDensityX: totalPixelsX / Math.max(0.001, actualWidthM),
        pixelDensityY: totalPixelsY / Math.max(0.001, actualHeightM),
        aspectRatio,
        aspectRatioLabel: aspectRatio.label,
        powerW: block.cabinetCount * cabinetPowerW,
        powerconSchukoCables: powerconRow.powerconSchukoCables,
        powerconSchukoPowerW: powerconRow.powerW || 0,
        powerconSchukoFormula: powerconRow.formula,
        hangingBarCount,
        spansetCount: hangingRow.spansetCount || 0,
        shackleCount: hangingRow.shackleCount || 0,
        hangingBarBrackets: hangingRow.hangingBarBrackets || 0,
        hangingCabinetBrackets: hangingRow.hangingCabinetBrackets || 0,
        hangingBrackets: hangingRow.hangingBrackets || 0,
        m8x20Bolts: hangingRow.m8x20Bolts || 0,
        hangingRiggingFormula: hangingRow.formula || '0',
        note: block.cabinetCount === block.columns * block.rows ? 'прямоугольный блок' : `свободная форма: ${block.cabinetCount} активных кабинетов из ${block.columns * block.rows}`
      });
    });
    return {
      layoutMode: 'freeform',
      format,
      pitch,
      legType,
      mountMode: mount.mode,
      mountStanding: mount.standing,
      mountHanging: mount.hanging,
      desiredWidthM: clampPositive(opts.widthM, layoutColumns * format.widthM),
      desiredHeightM: clampPositive(opts.heightM, layoutRows * format.heightM),
      requestedAreaM2: clampPositive(opts.widthM, layoutColumns * format.widthM) * clampPositive(opts.heightM, layoutRows * format.heightM),
      actualWidthM: layoutColumns * format.widthM,
      actualHeightM: layoutRows * format.heightM,
      areaM2: cabinetCount * format.widthM * format.heightM,
      boundingAreaM2: layoutColumns * layoutRows * format.widthM * format.heightM,
      columns: layoutColumns,
      rows: layoutRows,
      cabinetCount,
      constructionCount: constructions.length,
      cabinetWeightKg,
      cabinetPowerW,
      cabinetStartupPowerW,
      totalPowerW,
      totalPowerKw: totalPowerW / 1000,
      totalStartupPowerW,
      totalStartupPowerKw: totalStartupPowerW / 1000,
      cabinetPixelsX: pixel.cabinetPixelsX,
      cabinetPixelsY: pixel.cabinetPixelsY,
      calculatedCabinetPixelsX: pixel.calculatedPixelsX,
      calculatedCabinetPixelsY: pixel.calculatedPixelsY,
      totalPixelsX: layoutColumns * pixel.cabinetPixelsX,
      totalPixelsY: layoutRows * pixel.cabinetPixelsY,
      totalPixels: layoutColumns * pixel.cabinetPixelsX * layoutRows * pixel.cabinetPixelsY,
      activePixels: cabinetCount * pixel.cabinetPixelsX * pixel.cabinetPixelsY,
      cabinetsWeightKg,
      totalWeightKg,
      widthRound: { targetMeters: layoutColumns * format.widthM, actualMeters: layoutColumns * format.widthM, roundedCount: layoutColumns, direction: 'layout' },
      heightRound: { targetMeters: layoutRows * format.heightM, actualMeters: layoutRows * format.heightM, roundedCount: layoutRows, direction: 'layout' },
      fourCabinetJoints: safeBlocks.reduce((sum, block) => sum + Math.max(0, block.columns - 1) * Math.max(0, block.rows - 1), 0),
      hangingBarCount,
      hangingBarsWeightKg,
      spansetCount,
      spansetsWeightKg,
      shackleCount,
      shacklesWeightKg,
      legCount,
      legWeightKg,
      standingBrackets,
      hangingBrackets,
      hangingBarBrackets,
      hangingCabinetBrackets,
      brackets,
      standingM8x60Bolts,
      m8Bolts,
      m8x20Bolts,
      hangingRiggingByConstruction,
      powerLinks,
      rj45Links,
      powerconSchukoCables,
      powerconSchukoPerCable: powerconSchukoWattsPerCable,
      powerconSchukoWattsPerCable,
      powerconSchukoByConstruction,
      accessories,
      powerLinksWeightKg,
      rj45LinksWeightKg,
      powerconSchukoWeightKg,
      bracketsWeightKg,
      m8BoltsWeightKg,
      m8x20BoltsWeightKg,
      spansetsWeightKg,
      shacklesWeightKg,
      legsWeightKg,
      constructions,
      aspectRatio: makeAspectRatio(layoutColumns, layoutRows),
      aspectRatioLabel: makeAspectRatio(layoutColumns, layoutRows).label,
      layoutBounds: { minX, minY, maxX, maxY, columns: layoutColumns, rows: layoutRows }
    };
  }


  function makePowerconSchukoNote(result) {
    const res = result || {};
    const wattsPerCable = Math.max(1, toNumber(res.powerconSchukoWattsPerCable == null ? res.powerconSchukoPerCable : res.powerconSchukoWattsPerCable, 3400));
    const rows = Array.isArray(res.powerconSchukoByConstruction) ? res.powerconSchukoByConstruction.filter(row => row && row.powerW > 0) : [];
    if (rows.length > 1) {
      const details = rows.map(row => `${row.name || row.id}: ${row.powerW || 0}Вт/${wattsPerCable}Вт → ${row.powerconSchukoCables}`).join('; ');
      return `По мощности каждой отдельной LED-конструкции: ${details}. Итого ${res.powerconSchukoCables || 0} шт`;
    }
    return `${res.totalPowerW || 0} Вт / ${wattsPerCable} Вт = ${(res.totalPowerW || 0) / wattsPerCable}, округление вверх`;
  }



  function makeLedBracketNote(result) {
    const res = result || {};
    const parts = [];
    if (res.standingBrackets) parts.push(`стоим: ${res.legCount || 0} ног × ${Math.max(0, toNumber((res.accessories || {}).bracketsPerLeg, 4))} = ${res.standingBrackets}`);
    if (res.hangingBrackets) parts.push(`висим: (ширина − 1) × высота = ${res.hangingCabinetBrackets || 0}`);
    return parts.length ? parts.join('; ') : 'Печеньки не требуются';
  }

  function makeM8x20Note(result) {
    const res = result || {};
    if (!res.m8x20Bolts) return 'Режим «висим» не активен';
    return `Режим «висим»: ${(res.hangingBrackets || 0)} печ. × 4 болта М8×20 = ${res.m8x20Bolts} шт`;
  }

  function buildLedBomRows(result) {
    const res = result || calculateLedScreen({});
    const constructionNote = res.layoutMode === 'freeform'
      ? `${res.constructionCount || 0} конструкц. · ${res.cabinetCount} активных кабинетов · габарит ${res.columns}×${res.rows} каб.`
      : `${res.columns} × ${res.rows} кабинетов · ${res.cabinetPixelsX}×${res.cabinetPixelsY} px/каб.`;
    return [
      { id: 'led-cabinet', code: `LED-${res.format.id}-${res.pitch.name}`, name: `LED кабинет ${res.format.name} ${res.pitch.name}`, qty: res.cabinetCount, unit: 'шт', weightKg: res.cabinetsWeightKg, powerW: res.totalPowerW, startupPowerW: res.totalStartupPowerW, note: constructionNote, constructions: res.constructions || [] },
      { id: 'led-power-link', code: 'LED-POWER-LINK', name: 'Линк питания 220 В', qty: res.powerLinks, unit: 'шт', weightKg: res.powerLinksWeightKg, powerW: 0, startupPowerW: 0, note: '1 шт на каждый активный кабинет' },
      { id: 'led-rj45-link', code: 'LED-RJ45-LINK', name: 'Линк RJ45', qty: res.rj45Links, unit: 'шт', weightKg: res.rj45LinksWeightKg, powerW: 0, startupPowerW: 0, note: '1 шт на каждый активный кабинет' },
      { id: 'led-powercon-schuko', code: 'POWERCON-SCHUKO', name: 'Провод питания PowerCON–Schuko', qty: res.powerconSchukoCables, unit: 'шт', weightKg: res.powerconSchukoWeightKg, powerW: 0, startupPowerW: 0, note: makePowerconSchukoNote(res) },
      { id: 'led-hanging-bar', code: 'LED-HANGING-BAR', name: 'Подвес для LED экрана Hanging Bar', qty: res.hangingBarCount || 0, unit: 'шт', weightKg: res.hangingBarsWeightKg || 0, powerW: 0, startupPowerW: 0, note: 'Режим «висим»: 1 шт на каждый верхний кабинет каждой LED-конструкции' },
      { id: 'led-spanset', code: 'LED-SPANSET', name: 'Спанцет', qty: res.spansetCount || 0, unit: 'шт', weightKg: res.spansetsWeightKg || 0, powerW: 0, startupPowerW: 0, note: 'Режим «висим»: 1 шт на каждый Hanging Bar' },
      { id: 'led-shackle', code: 'LED-SHACKLE', name: 'Шакл', qty: res.shackleCount || 0, unit: 'шт', weightKg: res.shacklesWeightKg || 0, powerW: 0, startupPowerW: 0, note: 'Режим «висим»: 1 шт на каждый Hanging Bar' },
      { id: 'led-leg', code: `LED-LEG-${res.legType.id}`, name: res.legType.name, qty: res.legCount, unit: 'шт', weightKg: res.legsWeightKg, powerW: 0, startupPowerW: 0, note: 'Режим «стоим»: количество и тип указываются в конфигураторе' },
      { id: 'led-bracket', code: 'LED-BRACKET', name: 'Печенька / скоба LED', qty: res.brackets, unit: 'шт', weightKg: res.bracketsWeightKg, powerW: 0, startupPowerW: 0, note: makeLedBracketNote(res) },
      { id: 'm8-bolt', code: 'M8x60', name: 'Болт М8×60', qty: res.m8Bolts, unit: 'шт', weightKg: res.m8BoltsWeightKg, powerW: 0, startupPowerW: 0, note: `${res.legCount} ног × 16 шт` },
      { id: 'm8x20-bolt', code: 'M8x20', name: 'Болт М8×20', qty: res.m8x20Bolts || 0, unit: 'шт', weightKg: res.m8x20BoltsWeightKg || 0, powerW: 0, startupPowerW: 0, note: makeM8x20Note(res) }
    ].filter(row => row.qty > 0);
  }



  function buildLedTechSheet(result) {
    const res = result || calculateLedScreen({});
    const summary = summarizeLed(res);
    return {
      type: 'led-tech-sheet',
      title: 'Техлист LED без цен',
      hasPrices: false,
      summary: {
        screen: summary.title,
        requestedSize: summary.requestedSize,
        actualSize: summary.actualSize,
        cabinets: summary.cabinets,
        pixels: summary.pixelSize,
        cabinetPixels: summary.cabinetPixelSize,
        weightKg: res.totalWeightKg,
        powerW: res.totalPowerW,
        startupPowerW: res.totalStartupPowerW,
        mountMode: summary.mountMode,
        hangingBars: res.hangingBarCount || 0,
        legs: summary.legs,
        cables: `220 В: ${res.powerLinks} · RJ45: ${res.rj45Links} · PowerCON–Schuko: ${res.powerconSchukoCables}`,
        rigging: `Печеньки: ${res.brackets} · Болты М8×60: ${res.m8Bolts} · Болты М8×20: ${res.m8x20Bolts || 0} · Спанцет: ${res.spansetCount || 0} · Шакл: ${res.shackleCount || 0}`
      },
      rows: buildLedBomRows(res).map(row => ({
        code: row.code,
        name: row.name,
        qty: row.qty,
        unit: row.unit,
        weightKg: row.weightKg,
        powerW: row.powerW,
        startupPowerW: row.startupPowerW || 0,
        note: row.note
      })),
      constructionRows: (res.constructions || []).map((part, index) => ({
        n: index + 1,
        id: part.id,
        name: part.name,
        type: part.type,
        columns: part.columns,
        rows: part.rows,
        cabinetCount: part.cabinetCount,
        actualWidthM: part.actualWidthM,
        actualHeightM: part.actualHeightM,
        totalPixelsX: part.totalPixelsX,
        totalPixelsY: part.totalPixelsY,
        totalPixels: part.totalPixels,
        activePixels: part.activePixels || part.totalPixels,
        pixelDensityX: part.pixelDensityX,
        pixelDensityY: part.pixelDensityY,
        aspectRatio: part.aspectRatioLabel || (part.aspectRatio && part.aspectRatio.label) || '',
        powerW: part.powerW || part.powerconSchukoPowerW || 0,
        powerconSchukoCables: part.powerconSchukoCables || 0,
        powerconSchukoPowerW: part.powerconSchukoPowerW || part.powerW || 0,
        powerconSchukoFormula: part.powerconSchukoFormula || '',
        hangingBarCount: part.hangingBarCount || 0,
        spansetCount: part.spansetCount || 0,
        shackleCount: part.shackleCount || 0,
        horizontalConnectionCount: part.hangingCabinetBrackets || part.horizontalConnectionCount || 0,
        hangingBrackets: part.hangingBrackets || 0,
        m8x20Bolts: part.m8x20Bolts || 0,
        note: part.note || ''
      })),
      generatedAt: new Date().toISOString()
    };
  }

  function buildLedWarehouseSheet(result) {
    const res = result || calculateLedScreen({});
    const rows = buildLedBomRows(res).map((row, index) => ({
      n: index + 1,
      code: row.code,
      name: row.name,
      qty: row.qty,
      unit: row.unit,
      weightKg: row.weightKg,
      note: row.note
    }));
    return {
      type: 'led-warehouse-sheet',
      title: 'Складской лист LED без цен',
      hasPrices: false,
      rows,
      totals: {
        positions: rows.length,
        qty: rows.reduce((sum, row) => sum + clampPositive(row.qty, 0), 0),
        weightKg: rows.reduce((sum, row) => sum + clampPositive(row.weightKg, 0), 0),
        powerW: res.totalPowerW,
        startupPowerW: res.totalStartupPowerW
      },
      constructionRows: (res.constructions || []).map((part, index) => ({
        n: index + 1,
        name: part.name,
        columns: part.columns,
        rows: part.rows,
        cabinetCount: part.cabinetCount,
        actualWidthM: part.actualWidthM,
        actualHeightM: part.actualHeightM,
        totalPixelsX: part.totalPixelsX,
        totalPixelsY: part.totalPixelsY,
        aspectRatio: part.aspectRatioLabel || (part.aspectRatio && part.aspectRatio.label) || '',
        powerW: part.powerW || part.powerconSchukoPowerW || 0,
        powerconSchukoCables: part.powerconSchukoCables || 0,
        powerconSchukoPowerW: part.powerconSchukoPowerW || part.powerW || 0,
        powerconSchukoFormula: part.powerconSchukoFormula || '',
        hangingBarCount: part.hangingBarCount || 0,
        spansetCount: part.spansetCount || 0,
        shackleCount: part.shackleCount || 0,
        horizontalConnectionCount: part.hangingCabinetBrackets || part.horizontalConnectionCount || 0,
        hangingBrackets: part.hangingBrackets || 0,
        m8x20Bolts: part.m8x20Bolts || 0,
        note: part.note || ''
      })),
      generatedAt: new Date().toISOString()
    };
  }

  function summarizeLed(result) {
    const res = result || calculateLedScreen({});
    const freeform = res.layoutMode === 'freeform';
    return {
      title: freeform
        ? `LED схема ${res.constructionCount || 0} конструкц. · ${res.actualWidthM.toFixed(2)}×${res.actualHeightM.toFixed(2)} м · ${res.format.name} · ${res.pitch.name}`
        : `LED экран ${res.actualWidthM.toFixed(2)}×${res.actualHeightM.toFixed(2)} м · ${res.format.name} · ${res.pitch.name}`,
      cabinets: freeform ? `${res.cabinetCount} шт · ${res.constructionCount || 0} конструкц. · габарит ${res.columns}×${res.rows} каб.` : `${res.columns}×${res.rows} = ${res.cabinetCount} шт`,
      requestedSize: `${res.desiredWidthM.toFixed(2)}×${res.desiredHeightM.toFixed(2)} м`,
      actualSize: `${res.actualWidthM.toFixed(2)}×${res.actualHeightM.toFixed(2)} м`,
      pixelSize: freeform ? `${res.totalPixelsX}×${res.totalPixelsY} px габарит · активных ${res.activePixels || res.totalPixels} px` : `${res.totalPixelsX}×${res.totalPixelsY} px`,
      cabinetPixelSize: `${res.cabinetPixelsX}×${res.cabinetPixelsY} px/каб.`,
      weightKg: res.totalWeightKg,
      powerKw: res.totalPowerKw,
      startupPowerKw: res.totalStartupPowerKw,
      legs: res.mountStanding === false ? 'Ноги отключены' : `${res.legType.name}: ${res.legCount} шт`,
      mountMode: res.mountStanding && res.mountHanging ? 'стоим + висим' : (res.mountHanging ? 'висим' : 'стоим'),
      hangingBars: res.hangingBarCount || 0,
      spansetCount: res.spansetCount || 0,
      shackleCount: res.shackleCount || 0,
      brackets: res.brackets,
      standingBrackets: res.standingBrackets || 0,
      hangingBrackets: res.hangingBrackets || 0,
      bolts: res.m8Bolts,
      m8x20Bolts: res.m8x20Bolts || 0,
      powerLinks: res.powerLinks,
      rj45Links: res.rj45Links,
      powerconSchukoCables: res.powerconSchukoCables,
      powerconSchukoByConstruction: res.powerconSchukoByConstruction || [],
      constructionCount: res.constructionCount || 1,
      layoutMode: res.layoutMode || 'single'
    };
  }

  ROOT.LedCalculator = {
    CABINET_FORMATS,
    PIXEL_PITCHES,
    LEG_TYPES,
    DEFAULT_FORMAT_ID,
    DEFAULT_PITCH_ID,
    DEFAULT_ACCESSORIES,
    getCabinetFormat,
    getPitch,
    getLegType,
    roundCabinetCount,
    getMountFlags,
    calculatePowerconSchukoCablesForCount,
    calculatePowerconSchukoCablesForPower,
    buildPowerconSchukoByConstruction,
    countHorizontalModuleConnections,
    calculateHangingRiggingForCounts,
    buildHangingRiggingByConstruction,
    calculateLedScreen,
    calculateLedLayout,
    buildLedBomRows,
    buildLedTechSheet,
    buildLedWarehouseSheet,
    summarizeLed
  };
})();
