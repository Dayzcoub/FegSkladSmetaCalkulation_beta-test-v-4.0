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
    bracketsPerLeg: 4,
    m8BoltsPerLeg: 16,
    powerLinkWeightKg: 0.35,
    rj45LinkWeightKg: 0.2,
    powerconSchukoWeightKg: 0.75,
    bracketWeightKg: 0.18,
    m8BoltWeightKg: 0.02,
    legWeightKg: 0
  });

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
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

  function calculateLedScreen(input) {
    const opts = input || {};
    const format = getCabinetFormat(opts.format || opts.formatId || DEFAULT_FORMAT_ID);
    const pitch = getPitch(opts.pitch || opts.pitchId || DEFAULT_PITCH_ID);
    const legType = getLegType(opts.legType || opts.legTypeId);
    const accessories = Object.assign({}, DEFAULT_ACCESSORIES, opts.accessories || {});
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
    const legCount = Math.max(0, Math.round(clampPositive(opts.legCount, 0)));
    const powerLinks = cabinetCount * Math.max(0, toNumber(accessories.powerLinkPerCabinet, 1));
    const rj45Links = cabinetCount * Math.max(0, toNumber(accessories.rj45LinkPerCabinet, 1));
    const powerconSchukoPerCable = Math.max(1, toNumber(accessories.powerconSchukoCabinetsPerCable, 10));
    const powerconSchukoCables = Math.ceil(cabinetCount / powerconSchukoPerCable);
    const fourCabinetJoints = Math.max(0, columns - 1) * Math.max(0, rows - 1);
    const brackets = legCount * Math.max(0, toNumber(accessories.bracketsPerLeg, 4));
    const m8Bolts = legCount * Math.max(0, toNumber(accessories.m8BoltsPerLeg, 16));
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
    const customAccessories = opts.accessories || {};
    const hasCustomLegWeight = Object.prototype.hasOwnProperty.call(customAccessories, 'legWeightKg');
    const legWeightKg = hasCustomLegWeight ? clampPositive(customAccessories.legWeightKg, legType.defaultWeightKg || 0) : clampPositive(legType.defaultWeightKg, 0);
    const legsWeightKg = legCount * legWeightKg;
    const totalWeightKg = cabinetsWeightKg + powerLinksWeightKg + rj45LinksWeightKg + powerconSchukoWeightKg + bracketsWeightKg + m8BoltsWeightKg + legsWeightKg;
    const totalPowerW = cabinetCount * cabinetPowerW;
    const totalStartupPowerW = cabinetCount * cabinetStartupPowerW;
    return {
      format,
      pitch,
      legType,
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
      legCount,
      legWeightKg,
      brackets,
      m8Bolts,
      powerLinks,
      rj45Links,
      powerconSchukoCables,
      powerconSchukoPerCable,
      accessories,
      powerLinksWeightKg,
      rj45LinksWeightKg,
      powerconSchukoWeightKg,
      bracketsWeightKg,
      m8BoltsWeightKg,
      legsWeightKg
    };
  }

  function buildLedBomRows(result) {
    const res = result || calculateLedScreen({});
    return [
      { id: 'led-cabinet', code: `LED-${res.format.id}-${res.pitch.name}`, name: `LED кабинет ${res.format.name} ${res.pitch.name}`, qty: res.cabinetCount, unit: 'шт', weightKg: res.cabinetsWeightKg, powerW: res.totalPowerW, startupPowerW: res.totalStartupPowerW, note: `${res.columns} × ${res.rows} кабинетов · ${res.cabinetPixelsX}×${res.cabinetPixelsY} px/каб.` },
      { id: 'led-power-link', code: 'LED-POWER-LINK', name: 'Линк питания 220 В', qty: res.powerLinks, unit: 'шт', weightKg: res.powerLinksWeightKg, powerW: 0, startupPowerW: 0, note: '1 шт на каждый кабинет' },
      { id: 'led-rj45-link', code: 'LED-RJ45-LINK', name: 'Линк RJ45', qty: res.rj45Links, unit: 'шт', weightKg: res.rj45LinksWeightKg, powerW: 0, startupPowerW: 0, note: '1 шт на каждый кабинет' },
      { id: 'led-powercon-schuko', code: 'POWERCON-SCHUKO', name: 'Провод питания PowerCON–Schuko', qty: res.powerconSchukoCables, unit: 'шт', weightKg: res.powerconSchukoWeightKg, powerW: 0, startupPowerW: 0, note: `${res.cabinetCount} кабинетов / ${res.powerconSchukoPerCable} = ${res.cabinetCount / res.powerconSchukoPerCable}, округление вверх` },
      { id: 'led-leg', code: `LED-LEG-${res.legType.id}`, name: res.legType.name, qty: res.legCount, unit: 'шт', weightKg: res.legsWeightKg, powerW: 0, startupPowerW: 0, note: 'Количество и тип указываются в конфигураторе' },
      { id: 'led-bracket', code: 'LED-BRACKET', name: 'Печенька / скоба LED', qty: res.brackets, unit: 'шт', weightKg: res.bracketsWeightKg, powerW: 0, startupPowerW: 0, note: `${res.legCount} ног × 4 шт` },
      { id: 'm8-bolt', code: 'M8x60', name: 'Болт М8×60', qty: res.m8Bolts, unit: 'шт', weightKg: res.m8BoltsWeightKg, powerW: 0, startupPowerW: 0, note: `${res.legCount} ног × 16 шт` }
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
        legs: summary.legs,
        cables: `220 В: ${res.powerLinks} · RJ45: ${res.rj45Links} · PowerCON–Schuko: ${res.powerconSchukoCables}`,
        rigging: `Печеньки: ${res.brackets} · Болты М8×60: ${res.m8Bolts}`
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
      generatedAt: new Date().toISOString()
    };
  }

  function summarizeLed(result) {
    const res = result || calculateLedScreen({});
    return {
      title: `LED экран ${res.actualWidthM.toFixed(2)}×${res.actualHeightM.toFixed(2)} м · ${res.format.name} · ${res.pitch.name}`,
      cabinets: `${res.columns}×${res.rows} = ${res.cabinetCount} шт`,
      requestedSize: `${res.desiredWidthM.toFixed(2)}×${res.desiredHeightM.toFixed(2)} м`,
      actualSize: `${res.actualWidthM.toFixed(2)}×${res.actualHeightM.toFixed(2)} м`,
      pixelSize: `${res.totalPixelsX}×${res.totalPixelsY} px`,
      cabinetPixelSize: `${res.cabinetPixelsX}×${res.cabinetPixelsY} px/каб.`,
      weightKg: res.totalWeightKg,
      powerKw: res.totalPowerKw,
      startupPowerKw: res.totalStartupPowerKw,
      legs: `${res.legType.name}: ${res.legCount} шт`,
      brackets: res.brackets,
      bolts: res.m8Bolts,
      powerLinks: res.powerLinks,
      rj45Links: res.rj45Links,
      powerconSchukoCables: res.powerconSchukoCables
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
    calculateLedScreen,
    buildLedBomRows,
    buildLedTechSheet,
    buildLedWarehouseSheet,
    summarizeLed
  };
})();
