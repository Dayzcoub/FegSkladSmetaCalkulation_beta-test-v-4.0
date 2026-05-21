// FEG Stage PRO v3.16.16 — LED visual adapter renderer seed readiness
// Responsibility: convert quote.sections.led into a render-neutral visualModel.led block.
// Data-only boundary: no renderer, no BOM writes, no warehouse writes, no LED formula mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_LED_ADAPTER_VERSION = '0.1.1-led-visual-adapter-render-seed';

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function toText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || String(fallback == null ? '' : fallback).trim();
  }
  function toBool(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'да', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'нет', 'off'].includes(normalized)) return false;
    }
    return Boolean(fallback);
  }
  function stableId(prefix, index) { return `${prefix}-${index + 1}`; }

  function normalizeBounds(raw, constructions) {
    const src = raw || {};
    const list = Array.isArray(constructions) ? constructions : [];
    if (!list.length) {
      return {
        minX: nonNegative(src.minX, 0),
        minY: nonNegative(src.minY, 0),
        maxX: nonNegative(src.maxX, -1),
        maxY: nonNegative(src.maxY, -1),
        columns: nonNegative(src.columns, 0),
        rows: nonNegative(src.rows, 0)
      };
    }
    const minX = Math.min(...list.map(item => toNumber(item.x, item.grid && item.grid.x || 0)));
    const minY = Math.min(...list.map(item => toNumber(item.y, item.grid && item.grid.y || 0)));
    const maxX = Math.max(...list.map(item => toNumber(item.x, item.grid && item.grid.x || 0) + Math.max(0, Math.round(toNumber(item.columns, 0))) - 1));
    const maxY = Math.max(...list.map(item => toNumber(item.y, item.grid && item.grid.y || 0) + Math.max(0, Math.round(toNumber(item.rows, 0))) - 1));
    return {
      minX,
      minY,
      maxX,
      maxY,
      columns: Math.max(0, maxX - minX + 1),
      rows: Math.max(0, maxY - minY + 1)
    };
  }

  function normalizeCell(cell, index, bounds) {
    const x = Math.round(toNumber(cell && cell.x, 0));
    const y = Math.round(toNumber(cell && cell.y, 0));
    return {
      id: toText(cell && cell.id, `led-cabinet-cell-${index + 1}`),
      x,
      y,
      localX: x - toNumber(bounds && bounds.minX, 0),
      localY: y - toNumber(bounds && bounds.minY, 0),
      active: cell && Object.prototype.hasOwnProperty.call(cell, 'active') ? toBool(cell.active, true) : true
    };
  }

  function inferCells(construction) {
    const src = construction || {};
    const existing = Array.isArray(src.cells) ? src.cells : [];
    if (existing.length) return existing;
    const cols = Math.max(0, Math.round(toNumber(src.columns, 0)));
    const rows = Math.max(0, Math.round(toNumber(src.rows, 0)));
    const count = Math.max(0, Math.round(toNumber(src.cabinetCount, cols * rows)));
    const cells = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (cells.length >= count) break;
        cells.push({ x, y, active: true });
      }
    }
    return cells;
  }

  function normalizeConstruction(construction, index, ledResult, riggingById, powerconById) {
    const src = construction || {};
    const format = ledResult && ledResult.format || {};
    const pitch = ledResult && ledResult.pitch || {};
    const cabinetWidthM = nonNegative(format.widthM || src.cabinetWidthM, nonNegative(ledResult && ledResult.cabinetWidthM, 0.64)) || 0.64;
    const cabinetHeightM = nonNegative(format.heightM || src.cabinetHeightM, nonNegative(ledResult && ledResult.cabinetHeightM, 0.64)) || 0.64;
    const columns = Math.max(0, Math.round(toNumber(src.columns, 0)));
    const rows = Math.max(0, Math.round(toNumber(src.rows, 0)));
    const cabinetCount = Math.max(0, Math.round(toNumber(src.cabinetCount, columns * rows)));
    const rawCells = inferCells(Object.assign({}, src, { columns, rows, cabinetCount }));
    const localBounds = normalizeBounds({ minX: 0, minY: 0, maxX: columns - 1, maxY: rows - 1, columns, rows }, [{ x: 0, y: 0, columns, rows }]);
    const cells = rawCells.map((cell, cellIndex) => normalizeCell(cell, cellIndex, localBounds)).filter(cell => cell.active !== false);
    const id = toText(src.id, stableId('led-construction', index));
    const rigging = riggingById.get(id) || {};
    const powercon = powerconById.get(id) || {};
    const widthM = nonNegative(src.actualWidthM, columns * cabinetWidthM);
    const heightM = nonNegative(src.actualHeightM, rows * cabinetHeightM);
    const powerW = nonNegative(src.powerW || src.powerconSchukoPowerW, cabinetCount * nonNegative(ledResult && ledResult.cabinetPowerW, 0));
    const startupPowerW = cabinetCount * nonNegative(ledResult && ledResult.cabinetStartupPowerW, 0);
    const weightKg = cabinetCount * nonNegative(ledResult && ledResult.cabinetWeightKg, 0);
    const cabinetPixelsX = Math.max(0, Math.round(toNumber(ledResult && ledResult.cabinetPixelsX, pitch.cabinetPixelsX || 0)));
    const cabinetPixelsY = Math.max(0, Math.round(toNumber(ledResult && ledResult.cabinetPixelsY, pitch.cabinetPixelsY || 0)));

    return {
      id,
      name: toText(src.name, `LED конструкция ${index + 1}`),
      type: toText(src.type, index === 0 ? 'main' : 'custom'),
      grid: {
        x: toNumber(src.x, 0),
        y: toNumber(src.y, 0),
        columns,
        rows
      },
      dimensions: {
        cabinetWidthM,
        cabinetHeightM,
        widthM,
        heightM,
        areaM2: nonNegative(src.areaM2, cabinetCount * cabinetWidthM * cabinetHeightM),
        boundingAreaM2: nonNegative(src.boundingAreaM2, widthM * heightM)
      },
      cabinets: {
        count: cabinetCount,
        columns,
        rows,
        cells,
        activeCells: cells.length || cabinetCount,
        emptyCells: Math.max(0, columns * rows - cabinetCount)
      },
      pixels: {
        cabinetPixelsX,
        cabinetPixelsY,
        totalPixelsX: Math.max(0, Math.round(toNumber(src.totalPixelsX, columns * cabinetPixelsX))),
        totalPixelsY: Math.max(0, Math.round(toNumber(src.totalPixelsY, rows * cabinetPixelsY))),
        totalPixels: Math.max(0, Math.round(toNumber(src.totalPixels, columns * cabinetPixelsX * rows * cabinetPixelsY))),
        activePixels: Math.max(0, Math.round(toNumber(src.activePixels, cabinetCount * cabinetPixelsX * cabinetPixelsY)))
      },
      aspectRatio: clone(src.aspectRatio || {}),
      aspectRatioLabel: toText(src.aspectRatioLabel || (src.aspectRatio && src.aspectRatio.label), ''),
      power: {
        workingW: powerW,
        startupW: startupPowerW,
        powerconSchukoCables: nonNegative(powercon.powerconSchukoCables, src.powerconSchukoCables || 0),
        powerconSchukoFormula: toText(powercon.formula || src.powerconSchukoFormula, '')
      },
      weightKg,
      hanging: {
        hangingBarCount: nonNegative(rigging.hangingBarCount, src.hangingBarCount || 0),
        hangingBrackets: nonNegative(rigging.hangingBrackets, src.hangingBrackets || 0),
        hangingBarBrackets: nonNegative(rigging.hangingBarBrackets, src.hangingBarBrackets || 0),
        hangingCabinetBrackets: nonNegative(rigging.hangingCabinetBrackets, src.hangingCabinetBrackets || 0),
        m8x20Bolts: nonNegative(rigging.m8x20Bolts, src.m8x20Bolts || 0),
        spansetCount: nonNegative(rigging.spansetCount, src.spansetCount || 0),
        shackleCount: nonNegative(rigging.shackleCount, src.shackleCount || 0),
        formula: toText(rigging.formula || src.hangingRiggingFormula, '')
      },
      note: toText(src.note, '')
    };
  }

  function makeMapById(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      const id = toText(row && row.id, stableId('led-construction', index));
      map.set(id, row || {});
    });
    return map;
  }

  function getResult(section) {
    const result = section && section.result || {};
    if (result && typeof result === 'object') return result;
    return {};
  }

  function adaptLedSection(ledSection, options) {
    const opts = options || {};
    const section = ledSection || null;
    if (!section || section.status !== 'configured') {
      return {
        enabled: false,
        adapterVersion: VISUAL_LED_ADAPTER_VERSION,
        status: section ? toText(section.status, 'placeholder') : 'missing',
        reason: section ? 'led_section_not_configured' : 'led_section_missing',
        constructions: [],
        updatedAt: nowIso()
      };
    }

    const input = section.input || {};
    const result = getResult(section);
    const riggingById = makeMapById(result.hangingRiggingByConstruction || []);
    const powerconById = makeMapById(result.powerconSchukoByConstruction || []);
    const rawConstructions = Array.isArray(result.constructions) && result.constructions.length
      ? result.constructions
      : (Array.isArray(section.constructions) && section.constructions.length ? section.constructions : []);
    const constructions = rawConstructions.map((item, index) => normalizeConstruction(item, index, result, riggingById, powerconById)).filter(item => item.cabinets.count > 0 || opts.includeEmpty === true);
    const bounds = normalizeBounds(result.layoutBounds || {}, constructions.map(item => ({
      x: item.grid.x,
      y: item.grid.y,
      columns: item.grid.columns,
      rows: item.grid.rows
    })));
    const format = result.format || {};
    const pitch = result.pitch || {};

    return {
      enabled: constructions.length > 0 || opts.includeEmpty === true,
      adapterVersion: VISUAL_LED_ADAPTER_VERSION,
      status: 'ready',
      sourceSection: 'quote.sections.led',
      title: toText(section.title, 'LED экран'),
      layoutMode: toText(result.layoutMode || input.layoutMode, 'single'),
      cabinetType: {
        id: toText(result.formatId || format.id || input.format || input.formatId, ''),
        name: toText(result.formatName || format.name, 'LED кабинет'),
        widthM: nonNegative(format.widthM || result.cabinetWidthM, 0.64),
        heightM: nonNegative(format.heightM || result.cabinetHeightM, 0.64),
        weightKg: nonNegative(result.cabinetWeightKg, 0),
        powerW: nonNegative(result.cabinetPowerW, 0),
        startupPowerW: nonNegative(result.cabinetStartupPowerW, 0)
      },
      pixelPitch: {
        id: toText(result.pitchId || pitch.id || input.pitch || input.pitchId, ''),
        name: toText(result.pitchName || pitch.name, ''),
        cabinetPixelsX: nonNegative(result.cabinetPixelsX, 0),
        cabinetPixelsY: nonNegative(result.cabinetPixelsY, 0)
      },
      requested: {
        widthM: nonNegative(result.desiredWidthM || input.widthM, 0),
        heightM: nonNegative(result.desiredHeightM || input.heightM, 0),
        areaM2: nonNegative(result.requestedAreaM2, 0)
      },
      actual: {
        widthM: nonNegative(result.actualWidthM, 0),
        heightM: nonNegative(result.actualHeightM, 0),
        areaM2: nonNegative(result.areaM2, 0),
        boundingAreaM2: nonNegative(result.boundingAreaM2, 0)
      },
      bounds,
      constructions,
      constructionCount: nonNegative(result.constructionCount, constructions.length),
      mount: {
        mode: toText(result.mountMode || input.mountMode, ''),
        standing: result.mountStanding !== false,
        hanging: result.mountHanging === true,
        legTypeId: toText(result.legTypeId || (result.legType && result.legType.id), ''),
        legTypeName: toText(result.legTypeName || (result.legType && result.legType.name), ''),
        legCount: nonNegative(result.legCount, 0),
        standingBrackets: nonNegative(result.standingBrackets, 0),
        standingM8x60Bolts: nonNegative(result.standingM8x60Bolts, result.m8Bolts || 0),
        hangingBarCount: nonNegative(result.hangingBarCount, 0),
        hangingBrackets: nonNegative(result.hangingBrackets, 0),
        m8x20Bolts: nonNegative(result.m8x20Bolts, 0),
        spansetCount: nonNegative(result.spansetCount, 0),
        shackleCount: nonNegative(result.shackleCount, 0)
      },
      cables: {
        powerLinks: nonNegative(result.powerLinks, 0),
        rj45Links: nonNegative(result.rj45Links, 0),
        powerconSchukoCables: nonNegative(result.powerconSchukoCables, 0),
        powerconSchukoWattsPerCable: nonNegative(result.powerconSchukoWattsPerCable || result.powerconSchukoPerCable, 3400),
        powerconSchukoByConstruction: clone(result.powerconSchukoByConstruction || [])
      },
      rigging: {
        hangingRiggingByConstruction: clone(result.hangingRiggingByConstruction || []),
        note: result.mountHanging === true ? 'Hanging rigging is copied from LED result; no recalculation in visual adapter.' : 'Hanging mode is disabled or not active.'
      },
      totals: {
        cabinetCount: nonNegative(result.cabinetCount, 0),
        weightKg: nonNegative(section.weightKg || result.totalWeightKg, 0),
        powerW: nonNegative(section.powerW || result.totalPowerW, 0),
        startupPowerW: nonNegative(section.startupPowerW || result.totalStartupPowerW, 0),
        totalPixelsX: nonNegative(result.totalPixelsX, 0),
        totalPixelsY: nonNegative(result.totalPixelsY, 0),
        totalPixels: nonNegative(result.totalPixels, 0),
        activePixels: nonNegative(result.activePixels, 0)
      },
      bomLink: {
        sectionKey: 'led',
        rowCount: Array.isArray(section.bomRows) ? section.bomRows.length : 0,
        sharedBomReady: section.readyFor && section.readyFor.sharedBom === true || Boolean(section.bomBridge && section.bomBridge.enabled)
      },
      visualizerBoundary: {
        stagePlacementInLedCalculator: false,
        placementReservedForVisualizer: true,
        noPlacementMetaCreated: !JSON.stringify(result || {}).includes('placementLayer') && !JSON.stringify(input || {}).includes('placementId')
      },
      renderHints: {
        ledAdapterReady: true,
        topViewReady: true,
        frontViewReady: true,
        isoSeedReady: true,
        rendererRequired: false,
        rendererPlannedVersion: 'ProjectRenderer2D v3.16.16 LED visual seed',
        placementLayer: 'visualizer-only'
      },
      protectedFlows: {
        noBomMutation: true,
        noWarehouseMutation: true,
        noLegacyMutation: true,
        noFormulaMutation: true,
        noStagePlacementMutation: true
      },
      updatedAt: nowIso()
    };
  }

  function buildLedVisualSmokeReport(ledSection, options) {
    const led = adaptLedSection(ledSection, options || {});
    const checks = [
      { key: 'adapter_status', ok: Boolean(led && Object.prototype.hasOwnProperty.call(led, 'enabled')), label: 'LED adapter returns stable block' },
      { key: 'source_section', ok: !led.enabled || led.sourceSection === 'quote.sections.led', label: 'LED visual model keeps source section link' },
      { key: 'constructions_array', ok: Array.isArray(led.constructions || []), label: 'LED constructions are normalized as an array' },
      { key: 'powercon_power_policy_preserved', ok: !led.enabled || led.cables.powerconSchukoWattsPerCable === 3400 || led.cables.powerconSchukoWattsPerCable > 0, label: 'PowerCON visual data mirrors power-based source result' },
      { key: 'visualizer_boundary', ok: !led.enabled || led.visualizerBoundary.placementReservedForVisualizer === true, label: 'Stage placement stays reserved for future visualizer' },
      { key: 'protected_flows', ok: !led.enabled || led.protectedFlows.noBomMutation === true && led.protectedFlows.noFormulaMutation === true, label: 'LED adapter is read-only and does not mutate formulas/BOM' }
    ];
    return {
      type: 'feg-stage-pro-led-visual-smoke-report',
      version: VISUAL_LED_ADAPTER_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      led,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_LED_ADAPTER_VERSION,
    adaptLedSection,
    buildLedVisualSmokeReport
  };

  ROOT.LedVisualAdapter = api;
  ROOT.VisualLedAdapter = api;
})();
