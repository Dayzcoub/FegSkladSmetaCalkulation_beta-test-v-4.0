// FEG Stage PRO v3.16.10 — Stage visual adapter stairs plan-cell fix
// Responsibility: convert quote.sections.stage into a render-neutral visualModel.stage block.
// No renderer, no BOM writes, no legacy/v3 mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_STAGE_ADAPTER_VERSION = '0.1.1-stage-stairs-plan-cells';
  const DEFAULT_DECK_WIDTH_M = 1.2;
  const DEFAULT_DECK_DEPTH_M = 1.2;

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
  function moduleKey(cell) { return `${Math.round(toNumber(cell && cell.x, 0))},${Math.round(toNumber(cell && cell.y, 0))}`; }

  function normalizeCells(cells) {
    const seen = new Set();
    return (Array.isArray(cells) ? cells : [])
      .map(cell => ({ x: Math.round(toNumber(cell && cell.x, 0)), y: Math.round(toNumber(cell && cell.y, 0)) }))
      .filter(cell => {
        const key = moduleKey(cell);
        if (seen.has(key)) return false;
        seen.add(key);
        return Number.isFinite(cell.x) && Number.isFinite(cell.y);
      });
  }

  function getBounds(cells) {
    const list = normalizeCells(cells);
    if (!list.length) return { minX: 0, minY: 0, maxX: -1, maxY: -1, columns: 0, rows: 0 };
    const xs = list.map(cell => cell.x);
    const ys = list.map(cell => cell.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, minY, maxX, maxY, columns: maxX - minX + 1, rows: maxY - minY + 1 };
  }

  function normalizeDecks(cells, moduleWidthM, moduleDepthM) {
    const list = normalizeCells(cells);
    const bounds = getBounds(list);
    return list.map((cell, index) => ({
      id: `stage-deck-${index + 1}`,
      x: cell.x - bounds.minX,
      y: cell.y - bounds.minY,
      sourceX: cell.x,
      sourceY: cell.y,
      widthM: moduleWidthM,
      depthM: moduleDepthM,
      source: 'quote.sections.stage.input.modules'
    })).sort((a, b) => (a.y - b.y) || (a.x - b.x));
  }

  function normalizeStairSideToken(value) {
    const raw = toText(value, '').toLowerCase();
    if (['back', 'rear', 'зад', 'сзади'].includes(raw)) return 'back';
    if (['left', 'лево', 'слева'].includes(raw)) return 'left';
    if (['right', 'право', 'справа'].includes(raw)) return 'right';
    if (['front', 'forward', 'перед', 'спереди'].includes(raw)) return 'front';
    return '';
  }

  function inferStairSideFromGrid(sourceX, sourceY, bounds, fallback) {
    const b = bounds || {};
    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY) || b.maxX < b.minX || b.maxY < b.minY) {
      return normalizeStairSideToken(fallback) || 'front';
    }
    if (sourceY > b.maxY) return 'front';
    if (sourceY < b.minY) return 'back';
    if (sourceX < b.minX) return 'left';
    if (sourceX > b.maxX) return 'right';
    return normalizeStairSideToken(fallback) || 'front';
  }

  function getStairPosition(side, gridX, gridY, fallback) {
    if (side === 'left' || side === 'right') return nonNegative(gridY, fallback);
    return nonNegative(gridX, fallback);
  }

  function normalizeStairs(stageSection, moduleWidthM, moduleDepthM, bounds) {
    const input = stageSection && stageSection.input || {};
    const result = stageSection && stageSection.result || {};
    const accessories = result.stageAccessories || {};
    const raw = Array.isArray(input.stairs) ? input.stairs : (Array.isArray(accessories.stairs) ? accessories.stairs : []);
    const b = bounds || getBounds(input.modules || result.modules || []);
    return raw.map((item, index) => {
      const src = item || {};
      const sourceX = toNumber(src.x, NaN);
      const sourceY = toNumber(src.y, NaN);
      const hasGridPosition = Number.isFinite(sourceX) && Number.isFinite(sourceY);
      const gridX = hasGridPosition ? sourceX - b.minX : toNumber(src.gridX, src.position == null ? src.offset : src.position);
      const gridY = hasGridPosition ? sourceY - b.minY : toNumber(src.gridY, 0);
      const explicitSide = normalizeStairSideToken(src.side || src.edge);
      const side = explicitSide || inferStairSideFromGrid(sourceX, sourceY, b, src.orientation);
      const rawPosition = src.position == null ? src.offset : src.position;
      const position = getStairPosition(side, gridX, gridY, rawPosition == null ? index : rawPosition);
      return {
        id: toText(src.id, `stage-stair-${index + 1}`),
        side,
        position,
        x: Number.isFinite(gridX) ? gridX : position,
        y: Number.isFinite(gridY) ? gridY : (side === 'front' ? Math.max(0, b.rows || 0) : side === 'back' ? -1 : position),
        gridX: Number.isFinite(gridX) ? gridX : position,
        gridY: Number.isFinite(gridY) ? gridY : 0,
        sourceX: Number.isFinite(sourceX) ? sourceX : null,
        sourceY: Number.isFinite(sourceY) ? sourceY : null,
        key: toText(src.key, hasGridPosition ? `${Math.round(sourceX)},${Math.round(sourceY)}` : `stage-stair-${index + 1}`),
        orientation: toText(src.orientation, side),
        placementMode: hasGridPosition ? 'plan-cell' : 'edge-position',
        widthCells: 1,
        depthCells: 1,
        widthM: nonNegative(src.widthM, moduleWidthM),
        depthM: nonNegative(src.depthM, moduleDepthM),
        label: toText(src.label, 'Лестница'),
        note: toText(src.note)
      };
    }).sort((a, bItem) => (a.y - bItem.y) || (a.x - bItem.x));
  }

  function getEdgeClosure(stageSection) {
    const input = stageSection && stageSection.input || {};
    const result = stageSection && stageSection.result || {};
    const accessories = result.stageAccessories || {};
    const enabled = Boolean(input.edgeClosureEnabled || accessories.edgeClosureEnabled || nonNegative(accessories.edgeClosureMeters, 0) > 0);
    const type = toText(input.edgeClosureType || accessories.edgeClosureType, enabled ? 'fabric_skirt' : 'none');
    const label = toText(accessories.edgeClosureLabel || (type === 'raus_banner' ? 'Раус с баннером' : type === 'fabric_skirt' ? 'Тканевая юбка' : ''), enabled ? 'Закрытие торцов' : 'Нет');
    return {
      enabled,
      type,
      label,
      perimeterM: enabled ? nonNegative(accessories.edgeClosureMeters == null ? accessories.perimeterMeters : accessories.edgeClosureMeters, 0) : 0,
      source: 'quote.sections.stage.result.stageAccessories'
    };
  }

  function adaptStageSection(stageSection, options) {
    const opts = options || {};
    const section = stageSection || null;
    if (!section || section.status !== 'configured') {
      return {
        enabled: false,
        adapterVersion: VISUAL_STAGE_ADAPTER_VERSION,
        status: section ? toText(section.status, 'placeholder') : 'missing',
        reason: section ? 'stage_section_not_configured' : 'stage_section_missing',
        decks: [],
        stairs: [],
        edgeClosure: { enabled: false, type: 'none', label: 'Нет', perimeterM: 0 },
        updatedAt: nowIso()
      };
    }

    const input = section.input || {};
    const result = section.result || {};
    const config = section.stageConfig || {};
    const modules = normalizeCells(input.modules || result.modules || []);
    const bounds = getBounds(modules);
    const moduleWidthM = nonNegative(input.moduleWidthM == null ? config.moduleWidthM : input.moduleWidthM, DEFAULT_DECK_WIDTH_M) || DEFAULT_DECK_WIDTH_M;
    const moduleDepthM = nonNegative(input.moduleDepthM == null ? config.moduleDepthM : input.moduleDepthM, DEFAULT_DECK_DEPTH_M) || DEFAULT_DECK_DEPTH_M;
    const widthM = nonNegative(result.widthMeters == null ? result.widthM : result.widthMeters, bounds.columns * moduleWidthM);
    const depthM = nonNegative(result.depthMeters == null ? result.depthM : result.depthMeters, bounds.rows * moduleDepthM);
    const heightM = nonNegative(section.stageHeightM == null ? (section.heightM == null ? result.stageHeightM : section.heightM) : section.stageHeightM, 0);
    const decks = normalizeDecks(modules, moduleWidthM, moduleDepthM);
    const stairs = normalizeStairs(section, moduleWidthM, moduleDepthM, bounds);

    return {
      enabled: decks.length > 0 || opts.includeEmpty === true,
      adapterVersion: VISUAL_STAGE_ADAPTER_VERSION,
      status: 'ready',
      sourceSection: 'quote.sections.stage',
      title: toText(section.title, 'Сцена'),
      widthM,
      depthM,
      heightM,
      moduleWidthM,
      moduleDepthM,
      bounds,
      shape: 'grid',
      decks,
      stairs,
      supportType: toText(input.supportKey || config.supportKey),
      frameType: toText(input.frameKey || config.frameKey),
      edgeClosure: getEdgeClosure(section),
      bomLink: {
        sectionKey: 'stage',
        rowCount: Array.isArray(section.bomRows) ? section.bomRows.length : 0,
        sharedBomReady: section.sharedBomReady === true || Boolean(section.bomBridge && section.bomBridge.enabled)
      },
      totals: {
        deckCount: decks.length,
        stairCount: stairs.length,
        weightKg: nonNegative(section.weightKg, 0),
        powerW: nonNegative(section.powerW, 0)
      },
      renderHints: {
        topViewReady: true,
        frontViewReady: true,
        isoSeedReady: true,
        stairsPlanCellsReady: true,
        rendererRequired: false
      },
      updatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_STAGE_ADAPTER_VERSION,
    DEFAULT_DECK_WIDTH_M,
    DEFAULT_DECK_DEPTH_M,
    normalizeCells,
    getBounds,
    adaptStageSection
  };

  ROOT.StageVisualAdapter = api;
  ROOT.VisualStageAdapter = api;
})();
