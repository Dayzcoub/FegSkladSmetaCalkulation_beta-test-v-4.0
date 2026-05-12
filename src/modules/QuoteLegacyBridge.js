(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const BRIDGE_VERSION = '1.0.0';

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (_) { return value; }
  }

  function text(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function nonNegative(value, fallback) {
    return Math.max(0, num(value, fallback));
  }

  function row(id, code, name, qty, unit, weightKg, powerW, note, extra) {
    return Object.assign({
      id,
      code: code || id,
      name: name || id,
      qty: nonNegative(qty, 0),
      unit: unit || 'шт',
      weightKg: nonNegative(weightKg, 0),
      powerW: nonNegative(powerW, 0),
      note: text(note)
    }, extra || {});
  }

  function maybeCall(fn, fallback) {
    try {
      if (typeof fn === 'function') return fn();
    } catch (err) {
      if (GLOBAL.console && console.warn) console.warn('QuoteLegacyBridge call failed', err);
    }
    return fallback;
  }

  function getLiveBridge() {
    return GLOBAL.FEGQuoteLegacyBridge || null;
  }

  function getBlockBridge() {
    return GLOBAL.FEG35BlockConstructor || null;
  }

  function getStageSnapshotFromLegacy() {
    const bridge = getLiveBridge();
    if (bridge && typeof bridge.getStageSnapshot === 'function') return bridge.getStageSnapshot();
    return null;
  }

  function getTrussSnapshotFromLegacy() {
    const bridge = getLiveBridge();
    if (bridge && typeof bridge.getBlockTrussSnapshot === 'function') return bridge.getBlockTrussSnapshot();
    const block = getBlockBridge();
    if (block && typeof block.hasScheme === 'function' && block.hasScheme()) {
      return {
        mode: 'block',
        state: maybeCall(() => block.getState(), null),
        specs: maybeCall(() => block.getSpecs(), null),
        result: maybeCall(() => block.getResult(), null)
      };
    }
    return null;
  }

  function buildStageBomRows(result) {
    const r = result || {};
    const w = r.weight || {};
    const rows = [];
    if (r.sheets || r.modules) rows.push(row('stage-deck', 'STAGE-DECK', 'Лист настила сцены', r.sheets || r.modules, 'шт', w.sheetTotal, 0, `${num(r.widthMeters, 0).toFixed(2)} × ${num(r.depthMeters, 0).toFixed(2)} м`));
    if (r.columns) rows.push(row('stage-column', String(r.columnType || 'COLUMN').toUpperCase(), r.columnTypeLabel || 'Столб-опора', r.columns, 'шт', w.columnTotal, 0, 'опоры сцены'));
    if (r.frames) rows.push(row('stage-frame', String(r.frameType || 'FRAME').toUpperCase(), r.frameTypeLabel || 'Перекладина / рама', r.frames, 'шт', w.frameTotal, 0, 'периметр и связи настила'));
    if (r.studs) rows.push(row('stage-stud', 'STAGE-STUD', 'Шпилька / крепёж сцены', r.studs, 'шт', w.studTotal, 0, 'по количеству опор'));
    if (r.feet) rows.push(row('stage-foot', 'STAGE-FOOT', 'Пятка / основание опоры', r.feet, 'шт', 0, 0, 'по количеству опор'));
    return rows;
  }

  function buildStageSection(source, overrides) {
    const snapshot = source && source.lastResult ? source : { lastResult: source || null };
    const result = snapshot.lastResult || source || null;
    if (!result) throw new Error('Нет текущего расчёта сцены для привязки к смете.');
    const width = nonNegative(result.widthMeters, 0);
    const depth = nonNegative(result.depthMeters, 0);
    const area = nonNegative(result.areaMeters, 0);
    const modules = nonNegative(result.modules || result.sheets, 0);
    const rental = nonNegative(result.modulesCost, 0) + nonNegative(result.installCost, 0);
    const weightKg = nonNegative(result.totalWeight || (result.weight && result.weight.total), 0);
    return Object.assign({
      type: 'stage',
      bridgeVersion: BRIDGE_VERSION,
      status: 'configured',
      source: 'legacy-stage',
      title: 'Сцена',
      summary: `${width.toFixed(2)} × ${depth.toFixed(2)} м · ${area.toFixed(2)} м² · ${modules} мод.`,
      rental,
      install: nonNegative(result.installCost, 0),
      sectionTotal: rental,
      weightKg,
      powerW: 0,
      bomRows: buildStageBomRows(result),
      snapshot: clone(snapshot),
      updatedAt: nowIso()
    }, overrides || {});
  }

  function getBlockBomRows(result, state, specs) {
    const mod = ROOT.TrussBlockConstructor;
    if (mod && typeof mod.buildBomRows === 'function') {
      try {
        return mod.buildBomRows(result || {}, specs || {}, state || {}).map(src => row(
          src.id,
          src.code,
          src.name,
          src.qty == null ? src.count : src.qty,
          src.unit,
          src.weight == null ? src.weightKg : src.weight,
          src.powerW,
          src.note,
          { meters: src.meters, price: src.price }
        ));
      } catch (err) {
        if (GLOBAL.console && console.warn) console.warn('Block BOM bridge failed', err);
      }
    }
    return [];
  }

  function getTrussBomRows(snapshot) {
    const snap = snapshot || {};
    if (!(snap.mode === 'block' || snap.state || (snap.result && snap.result.counts))) return [];
    return getBlockBomRows(snap.result, snap.state, snap.specs);
  }

  function buildTrussSummary(snapshot) {
    const snap = snapshot || {};
    const r = snap.result || snap || {};
    const meters = nonNegative(r.totalMeters, 0).toFixed(2);
    const nodes = nonNegative(r.nodePieces || r.angles + r.cubes + r.tNodes + r.crosses, 0);
    const bases = nonNegative((r.counts && r.counts.base) || r.baseCount, 0);
    return `${meters} м · узлы ${nodes} · базы ${bases}`;
  }

  function buildTrussSection(source, overrides) {
    const snapshot = source && source.result ? source : { mode: 'block', result: source || null };
    const result = snapshot.result || source || null;
    if (!result || !(snapshot.mode === 'block' || snapshot.state || result.counts)) {
      throw new Error('Фермы для сметчика берутся только из блочного конструктора v3. Старый 2D/3D расчёт отключён.');
    }
    const rental = nonNegative(result.rental, 0) || nonNegative(result.rentalCost, 0);
    const install = nonNegative(result.install, 0);
    const weightKg = nonNegative(result.weight, 0) || nonNegative(result.totalWeight, 0);
    return Object.assign({
      type: 'truss',
      bridgeVersion: BRIDGE_VERSION,
      status: 'configured',
      source: 'legacy-block-truss',
      title: 'Фермы / блочный конструктор',
      summary: buildTrussSummary(snapshot),
      rental: rental + install,
      install,
      sectionTotal: rental + install,
      weightKg,
      powerW: 0,
      bomRows: getTrussBomRows(snapshot),
      snapshot: clone(snapshot),
      updatedAt: nowIso()
    }, overrides || {});
  }

  function buildStageSectionFromLegacy(overrides) {
    return buildStageSection(getStageSnapshotFromLegacy(), overrides || {});
  }

  function buildTrussSectionFromLegacy(overrides) {
    return buildTrussSection(getTrussSnapshotFromLegacy(), overrides || {});
  }

  function hasLiveStage() {
    const bridge = getLiveBridge();
    if (bridge && typeof bridge.hasStage === 'function') return Boolean(bridge.hasStage());
    const snap = getStageSnapshotFromLegacy();
    return Boolean(snap && snap.lastResult);
  }

  function hasLiveTruss() {
    const bridge = getLiveBridge();
    if (bridge && typeof bridge.hasBlockTruss === 'function') return Boolean(bridge.hasBlockTruss());
    const snap = getTrussSnapshotFromLegacy();
    return Boolean(snap && snap.mode === 'block' && snap.result);
  }

  ROOT.QuoteLegacyBridge = {
    BRIDGE_VERSION,
    buildStageBomRows,
    buildStageSection,
    buildTrussSection,
    buildStageSectionFromLegacy,
    buildTrussSectionFromLegacy,
    getStageSnapshotFromLegacy,
    getTrussSnapshotFromLegacy,
    hasLiveStage,
    hasLiveTruss
  };
})();
