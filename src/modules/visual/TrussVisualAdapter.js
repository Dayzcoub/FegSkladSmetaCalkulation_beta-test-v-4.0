// FEG Stage PRO v3.16.15 — Truss visual adapter with portal layout profile
// Responsibility: convert quote.sections.truss into a render-neutral visualModel.truss block with roof seed and layout metadata.
// Data-only boundary: no renderer, no BOM writes, no warehouse writes, no legacy/v3 mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_TRUSS_ADAPTER_VERSION = '0.1.3-portal-proportional-contract';
  const DEFAULT_CELL_METERS = 0.5;

  const FALLBACK_SPECS = Object.freeze({
    truss3:   Object.freeze({ id:'truss3',   label:'Ферма 3 м',   short:'3 м',   kind:'straight', length:3 }),
    truss25:  Object.freeze({ id:'truss25',  label:'Ферма 2.5 м', short:'2.5 м', kind:'straight', length:2.5 }),
    truss2:   Object.freeze({ id:'truss2',   label:'Ферма 2 м',   short:'2 м',   kind:'straight', length:2 }),
    truss15:  Object.freeze({ id:'truss15',  label:'Ферма 1.5 м', short:'1.5 м', kind:'straight', length:1.5 }),
    truss1:   Object.freeze({ id:'truss1',   label:'Ферма 1 м',   short:'1 м',   kind:'straight', length:1 }),
    truss05:  Object.freeze({ id:'truss05',  label:'Ферма 0.5 м', short:'0.5 м', kind:'straight', length:0.5 }),
    cornerU001:Object.freeze({ id:'cornerU001', label:'U001 · угол 45°', short:'U001', kind:'node', directions:2 }),
    cornerU002:Object.freeze({ id:'cornerU002', label:'U002 · угол 60°', short:'U002', kind:'node', directions:2 }),
    cornerU003:Object.freeze({ id:'cornerU003', label:'U003 · угол 90°', short:'U003', kind:'node', directions:2 }),
    cornerU004:Object.freeze({ id:'cornerU004', label:'U004 · угол 120°', short:'U004', kind:'node', directions:2 }),
    cornerU005:Object.freeze({ id:'cornerU005', label:'U005 · угол 135°', short:'U005', kind:'node', directions:2 }),
    cornerU012:Object.freeze({ id:'cornerU012', label:'U012 · угол 90° · 3D', short:'U012', kind:'node', directions:3, dimensionsM:{ w:0.50, h:0.50, z:0.50 } }),
    cornerU016:Object.freeze({ id:'cornerU016', label:'U016 · крест', short:'U016', kind:'node', directions:4, dimensionsM:{ w:0.71, h:0.71, z:0.29 } }),
    cornerU017:Object.freeze({ id:'cornerU017', label:'U017 · Т-узел', short:'U017', kind:'node', directions:3, dimensionsM:{ w:0.71, h:0.50, z:0.29 } }),
    cornerU020:Object.freeze({ id:'cornerU020', label:'U020 · 4 направления', short:'U020', kind:'node', directions:4, dimensionsM:{ w:0.71, h:0.50, z:0.50 } }),
    cornerU022:Object.freeze({ id:'cornerU022', label:'U022 · куб', short:'U022', kind:'node', directions:6, dimensionsM:{ w:0.71, h:0.71, z:0.71 } }),
    cornerU024:Object.freeze({ id:'cornerU024', label:'U024 · 5 направлений', short:'U024', kind:'node', directions:5, dimensionsM:{ w:0.71, h:0.71, z:0.50 } }),
    base:     Object.freeze({ id:'base', label:'База / блин', short:'База', kind:'base', dimensionsM:{ w:0.50, h:0.50, z:0.03 } })
  });

  const LEGACY_TYPE_MAP = Object.freeze({ angle90:'cornerU003', cube:'cornerU022', tee:'cornerU017', cross:'cornerU016' });
  const ROOF_TYPES = Object.freeze({
    none: Object.freeze({ id:'none', label:'Без крыши', kind:'none' }),
    flat: Object.freeze({ id:'flat', label:'Плоская крыша', kind:'roof' }),
    gable: Object.freeze({ id:'gable', label:'Двускатная крыша', kind:'roof' }),
    arch: Object.freeze({ id:'arch', label:'Арочная крыша', kind:'roof' }),
    single_slope: Object.freeze({ id:'single_slope', label:'Односкатная крыша', kind:'roof' })
  });

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
  function normalizeRotation(value) {
    const n = Number(value || 0);
    return ((n % 360) + 360) % 360;
  }
  function normalizeCellMeters(value) {
    const n = Number(value || DEFAULT_CELL_METERS);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_CELL_METERS;
  }
  function cellCount(meters, cellMeters) {
    const cellM = normalizeCellMeters(cellMeters);
    return Math.max(1, Math.round(Number(meters || 0) / cellM));
  }

  function getSpecs() {
    const truss = ROOT.TrussBlockConstructor;
    if (truss && typeof truss.getDefaultSpecs === 'function') {
      try { return Object.assign({}, FALLBACK_SPECS, truss.getDefaultSpecs() || {}); } catch (_) { /* fallback below */ }
    }
    return clone(FALLBACK_SPECS) || {};
  }

  function getSpec(specs, type) {
    const mapped = LEGACY_TYPE_MAP[type] || type;
    return specs && specs[mapped] ? specs[mapped] : null;
  }

  function normalizeItem(item, specs) {
    if (!item || typeof item !== 'object') return null;
    const type = LEGACY_TYPE_MAP[item.type] || item.type;
    const spec = getSpec(specs, type);
    if (!spec || spec.hidden || type === 'pin') return null;
    return Object.assign({}, clone(item) || {}, {
      id: toText(item.id, `truss-visual-${type}-${Math.round(toNumber(item.x, 0))}-${Math.round(toNumber(item.y, 0))}`),
      type,
      x: toNumber(item.x, 0),
      y: toNumber(item.y, 0),
      o: spec.kind === 'straight' ? (item.o === 'v' ? 'v' : 'h') : 'n',
      r: normalizeRotation(item.r)
    });
  }

  function normalizeItems(items, specs) {
    const truss = ROOT.TrussBlockConstructor;
    if (truss && typeof truss.normalizeItems === 'function') {
      try { return truss.normalizeItems(items || [], specs || getSpecs()).map(item => normalizeItem(item, specs || getSpecs())).filter(Boolean); } catch (_) { /* fallback below */ }
    }
    return (Array.isArray(items) ? items : []).map(item => normalizeItem(item, specs || getSpecs())).filter(Boolean);
  }

  function itemCellSpan(item, spec, cellMeters) {
    if (!item || !spec) return { cells: 1, width: 1, height: 1 };
    if (spec.kind !== 'straight') return { cells: 1, width: 1, height: 1 };
    const cells = cellCount(spec.length, cellMeters);
    return item.o === 'v'
      ? { cells, width: 1, height: cells }
      : { cells, width: cells, height: 1 };
  }

  function itemBoundsCells(item, spec, cellMeters) {
    const span = itemCellSpan(item, spec, cellMeters);
    const x = toNumber(item && item.x, 0);
    const y = toNumber(item && item.y, 0);
    return {
      minX: x,
      minY: y,
      maxX: x + span.width,
      maxY: y + span.height,
      width: span.width,
      height: span.height,
      cells: span.cells
    };
  }

  function nodePhysicalSize(spec, rotation, cellMeters) {
    const fallback = normalizeCellMeters(cellMeters);
    const dims = (spec && spec.dimensionsM) || {};
    const base = {
      w: nonNegative(dims.w, fallback) || fallback,
      h: nonNegative(dims.h, fallback) || fallback,
      z: nonNegative(dims.z, spec && spec.kind === 'base' ? 0.03 : fallback)
    };
    const r = normalizeRotation(rotation);
    const swap = r === 90 || r === 270;
    return swap ? { w: base.h, h: base.w, z: base.z } : base;
  }

  function itemBoundsMeters(item, spec, cellMeters) {
    const cellM = normalizeCellMeters(cellMeters);
    const x = toNumber(item && item.x, 0) * cellM;
    const y = toNumber(item && item.y, 0) * cellM;
    if (spec && spec.kind === 'straight') {
      const length = nonNegative(spec.length, cellM) || cellM;
      return item.o === 'v'
        ? { minX: x, minY: y, maxX: x + cellM, maxY: y + length, width: cellM, height: length, lengthM: length }
        : { minX: x, minY: y, maxX: x + length, maxY: y + cellM, width: length, height: cellM, lengthM: length };
    }
    const size = nodePhysicalSize(spec || {}, item && item.r, cellM);
    return { minX: x, minY: y, maxX: x + size.w, maxY: y + size.h, width: size.w, height: size.h, lengthM: 0, zM: size.z };
  }

  function calcBounds(items, specs, cellMeters, mode) {
    const bounds = (Array.isArray(items) ? items : [])
      .map(item => {
        const spec = getSpec(specs, item && item.type);
        return mode === 'meters' ? itemBoundsMeters(item, spec, cellMeters) : itemBoundsCells(item, spec, cellMeters);
      })
      .filter(Boolean);
    if (!bounds.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    const minX = Math.min(...bounds.map(row => row.minX));
    const minY = Math.min(...bounds.map(row => row.minY));
    const maxX = Math.max(...bounds.map(row => row.maxX));
    const maxY = Math.max(...bounds.map(row => row.maxY));
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  function readInputItems(section) {
    const input = section && section.input || {};
    const snapshot = section && section.snapshot || {};
    if (Array.isArray(input.items)) return input.items;
    if (Array.isArray(snapshot.items)) return snapshot.items;
    if (snapshot.state && Array.isArray(snapshot.state.items)) return snapshot.state.items;
    return [];
  }

  function readState(section) {
    const input = section && section.input || {};
    const snapshot = section && section.snapshot || {};
    return Object.assign({}, snapshot.state || {}, input.state || {}, {
      trussSeries: toText(input.trussSeries || (snapshot.state && snapshot.state.trussSeries), 'T29Q'),
      cellMeters: normalizeCellMeters((input.state && input.state.cellMeters) || (snapshot.state && snapshot.state.cellMeters) || input.cellMeters || DEFAULT_CELL_METERS)
    });
  }

  function countItems(items, specs) {
    return (Array.isArray(items) ? items : []).reduce((acc, item) => {
      const spec = getSpec(specs, item && item.type);
      if (!spec) return acc;
      acc[item.type] = (acc[item.type] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      acc[spec.kind] = (acc[spec.kind] || 0) + 1;
      return acc;
    }, { total: 0, straight: 0, node: 0, base: 0 });
  }

  function makeBlock(item, specs, cellMeters, index) {
    const spec = getSpec(specs, item && item.type) || {};
    const boundsCells = itemBoundsCells(item, spec, cellMeters);
    const boundsM = itemBoundsMeters(item, spec, cellMeters);
    return {
      id: toText(item && item.id, `truss-block-${index + 1}`),
      type: toText(item && item.type),
      label: toText(spec.label || spec.short, item && item.type),
      kind: toText(spec.kind, 'unknown'),
      orientation: spec.kind === 'straight' ? (item.o === 'v' ? 'vertical' : 'horizontal') : 'node',
      rotation: normalizeRotation(item && item.r),
      grid: { x: toNumber(item && item.x, 0), y: toNumber(item && item.y, 0), bounds: boundsCells },
      meters: { x: boundsM.minX, y: boundsM.minY, width: boundsM.width, height: boundsM.height, lengthM: boundsM.lengthM || 0 },
      directions: nonNegative(spec.directions, 0),
      source: 'quote.sections.truss.input.items',
      visualRole: spec.kind === 'straight' ? 'truss_segment' : (spec.kind === 'base' ? 'support_base' : 'truss_node')
    };
  }

  function getResultCounts(section, items, specs) {
    const result = section && section.result || (section && section.snapshot && section.snapshot.result) || {};
    const fallback = countItems(items, specs);
    return Object.assign({}, fallback, result.counts || {});
  }

  function inferStructureType(section, blocks, counts, physicalBounds) {
    const input = section && section.input || {};
    const snapshot = section && section.snapshot || {};
    const explicit = toText(input.structureType || input.templateType || section && section.structureType || snapshot.structureType || snapshot.templateType);
    if (explicit) return explicit;
    if (!blocks.length && snapshot.mode === 'block') return 'legacy_block_truss';
    const straight = blocks.filter(block => block.kind === 'straight');
    const horizontal = straight.filter(block => block.orientation === 'horizontal').length;
    const vertical = straight.filter(block => block.orientation === 'vertical').length;
    const baseCount = nonNegative(counts && counts.base, blocks.filter(block => block.kind === 'base').length);
    const width = nonNegative(physicalBounds && physicalBounds.width, 0);
    const height = nonNegative(physicalBounds && physicalBounds.height, 0);
    if (baseCount >= 4 && horizontal > 0 && vertical > 0) return 'ground_support_or_stool';
    if (baseCount >= 2 && horizontal > 0 && vertical >= 2) return 'portal';
    if (horizontal > 0 && vertical > 0 && width > 0 && height > 0) return 'frame';
    if (horizontal > 0 && vertical === 0) return 'horizontal_run';
    if (vertical > 0 && horizontal === 0) return 'vertical_run';
    return blocks.length ? 'freeform_truss' : 'configured_without_visual_items';
  }

  function collectBomLink(section) {
    const bomRows = Array.isArray(section && section.bomRows) ? section.bomRows : [];
    return {
      sectionKey: 'truss',
      rowCount: bomRows.length,
      sharedBomReady: section && section.sharedBomReady === true || Boolean(section && section.bomBridge && section.bomBridge.enabled),
      source: 'quote.sections.truss.bomRows'
    };
  }

  function normalizeStructureKind(value) {
    const raw = toText(value, 'freeform_truss').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    if (['portal', 'портал', 'portal_truss', 'truss_portal'].includes(raw)) return 'portal';
    if (['frame', 'рама', 'truss_frame'].includes(raw)) return 'frame';
    if (['stool', 'taburetka', 'tabouretka', 'табуретка', 'ground_support_or_stool'].includes(raw)) return 'stool';
    if (raw.includes('portal') || raw.includes('портал')) return 'portal';
    if (raw.includes('frame') || raw.includes('рама')) return 'frame';
    if (raw.includes('stool') || raw.includes('табур')) return 'stool';
    return raw || 'freeform_truss';
  }

  function buildPortalLayoutProfile(blocks, physicalBounds) {
    const list = Array.isArray(blocks) ? blocks : [];
    const straight = list.filter(block => block && block.kind === 'straight');
    const verticals = straight.filter(block => block.orientation === 'vertical');
    const horizontals = straight.filter(block => block.orientation === 'horizontal');
    const bounds = physicalBounds || { minX:0, minY:0, maxX:0, maxY:0, width:0, height:0 };
    const cx = block => toNumber(block && block.meters && block.meters.x, bounds.minX) + nonNegative(block && block.meters && block.meters.width, 0) / 2;
    const leftX = verticals.length ? Math.min(...verticals.map(cx)) : bounds.minX;
    const rightX = verticals.length ? Math.max(...verticals.map(cx)) : bounds.maxX;
    const topY = horizontals.length ? Math.min(...horizontals.map(block => toNumber(block && block.meters && block.meters.y, bounds.minY))) : bounds.minY;
    const bottomY = verticals.length ? Math.max(...verticals.map(block => toNumber(block && block.meters && block.meters.y, bounds.minY) + nonNegative(block && block.meters && block.meters.height, 0))) : bounds.maxY;
    const middlePosts = verticals
      .map(block => ({ id: block.id, xM: cx(block) }))
      .filter(post => post.xM > Math.min(leftX, rightX) + 0.35 && post.xM < Math.max(leftX, rightX) - 0.35);
    return {
      mode: 'portal_two_posts_beam',
      label: 'Портал: верхняя перекладина на стойках',
      rendererContract: 'front_and_iso_use_canonical_two_posts_beam',
      source: 'TrussVisualAdapter.layoutProfile.v3.16.15',
      drawAs: 'two_posts_top_beam',
      preserveLiveBlocks: true,
      protectedFlows: {
        noBomRowsCreated: true,
        noLoadFormulaChanged: true,
        noWarehouseMutation: true,
        noLegacyMutation: true
      },
      portal: {
        leftX: Number.isFinite(leftX) ? leftX : bounds.minX,
        rightX: Number.isFinite(rightX) ? rightX : bounds.maxX,
        topY: Number.isFinite(topY) ? topY : bounds.minY,
        bottomY: Number.isFinite(bottomY) ? bottomY : bounds.maxY,
        widthM: nonNegative(bounds && bounds.width, Math.abs(rightX - leftX)),
        heightM: nonNegative(bounds && bounds.height, Math.abs(bottomY - topY)),
        postCount: Math.max(2, verticals.length || 2),
        middlePosts
      }
    };
  }

  function buildTrussLayoutProfile(structureType, blocks, physicalBounds, counts) {
    const kind = normalizeStructureKind(structureType);
    if (kind === 'portal') return buildPortalLayoutProfile(blocks, physicalBounds);
    return {
      mode: kind === 'frame' ? 'freeform_frame_blocks' : (kind === 'stool' ? 'stool_freeform_blocks' : 'freeform_blocks'),
      label: kind === 'frame' ? 'Рама: свободная блочная схема' : (kind === 'stool' ? 'Табуретка: свободная блочная схема' : 'Свободная ферменная схема'),
      rendererContract: 'render_live_blocks_without_canonical_projection',
      source: 'TrussVisualAdapter.layoutProfile.v3.16.15',
      drawAs: 'live_blocks',
      preserveLiveBlocks: true,
      counts: clone(counts || {})
    };
  }


  function normalizeRoofType(value) {
    const raw = toText(value, 'none').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    if (['flat', 'плоская', 'flat_roof'].includes(raw)) return 'flat';
    if (['gable', 'двускатная', 'двускат', 'gable_roof'].includes(raw)) return 'gable';
    if (['arch', 'arched', 'арка', 'арочная'].includes(raw)) return 'arch';
    if (['single_slope', 'single', 'slope', 'односкатная', 'односкат'].includes(raw)) return 'single_slope';
    return 'none';
  }

  function readRoofOptions(section, options) {
    const input = section && section.input || {};
    const snapshot = section && section.snapshot || {};
    const state = (snapshot && snapshot.state) || {};
    const roof = input.roof || section && section.roof || snapshot.roof || state.roof || {};
    const explicitType = roof.type || roof.roofType || input.roofType || section && section.roofType || snapshot.roofType || state.roofType || options && options.roofType;
    const roofType = normalizeRoofType(explicitType);
    return {
      roofType,
      enabled: roofType !== 'none' || roof.enabled === true || input.roofEnabled === true || section && section.roofEnabled === true,
      riseM: nonNegative(roof.riseM || roof.roofRiseM || input.roofRiseM || options && options.roofRiseM, 0),
      depthM: nonNegative(roof.depthM || input.roofDepthM || section && section.depthM || input.depthM, 0),
      overhangM: nonNegative(roof.overhangM || input.roofOverhangM || options && options.roofOverhangM, 0),
      slopeDirection: toText(roof.slopeDirection || input.roofSlopeDirection || options && options.slopeDirection, 'front_to_back'),
      material: toText(roof.material || input.roofMaterial, 'visual_placeholder')
    };
  }

  function buildRoofSeed(section, structureType, physicalBounds, bases, nodes, options) {
    const roofOptions = readRoofOptions(section, options || {});
    const roofType = roofOptions.enabled && roofOptions.roofType === 'none' ? 'flat' : roofOptions.roofType;
    const roofSpec = ROOF_TYPES[roofType] || ROOF_TYPES.none;
    const widthM = nonNegative(section && (section.widthM || section.input && section.input.widthM), physicalBounds && physicalBounds.width);
    const trussHeightM = nonNegative(section && (section.heightM || section.input && section.input.heightM), physicalBounds && physicalBounds.height);
    const depthM = nonNegative(roofOptions.depthM, section && (section.depthM || section.input && section.input.depthM)) || nonNegative(physicalBounds && physicalBounds.height, 0);
    const defaultRise = roofType === 'gable' || roofType === 'arch'
      ? Math.max(0.35, Math.min(1.2, widthM * 0.12 || 0.6))
      : (roofType === 'single_slope' ? Math.max(0.25, Math.min(0.9, depthM * 0.1 || 0.4)) : 0);
    const riseM = roofOptions.riseM || defaultRise;
    const enabled = roofType !== 'none';
    const baseIds = (Array.isArray(bases) ? bases : []).map(base => base.id).filter(Boolean);
    const nodeIds = (Array.isArray(nodes) ? nodes : []).map(node => node.id).filter(Boolean);
    return {
      enabled,
      status: enabled ? 'seed_ready' : 'reserved_for_future_roof_visualization',
      roofType,
      label: roofSpec.label,
      supportedTypes: Object.keys(ROOF_TYPES),
      source: 'quote.sections.truss.input.roof / roofType',
      engineeringStatus: 'visual_only_no_load_calculation',
      geometry: {
        basis: 'truss_visual_bounds',
        widthM,
        depthM,
        trussHeightM,
        eaveHeightM: trussHeightM,
        ridgeHeightM: trussHeightM + (enabled ? riseM : 0),
        riseM: enabled ? riseM : 0,
        overhangM: enabled ? roofOptions.overhangM : 0,
        slopeDirection: roofOptions.slopeDirection
      },
      anchors: {
        basis: baseIds.length ? 'bases' : 'nodes_or_bounds',
        supportCount: baseIds.length || nodeIds.length,
        baseIds,
        nodeIds: baseIds.length ? [] : nodeIds.slice(0, 8)
      },
      renderHints: {
        rendererRequired: false,
        frontViewSeedReady: enabled && widthM > 0,
        isoSeedReady: enabled && widthM > 0,
        topViewSeedReady: enabled && (widthM > 0 || depthM > 0),
        drawAs: roofType === 'arch' ? 'curved_roof_placeholder' : (roofType === 'gable' ? 'ridge_roof_placeholder' : (roofType === 'single_slope' ? 'sloped_roof_placeholder' : 'flat_roof_placeholder'))
      },
      protectedFlows: {
        noBomRowsCreated: true,
        noLoadFormulaChanged: true,
        noWarehouseMutation: true,
        noLegacyMutation: true
      }
    };
  }

  function adaptTrussSection(trussSection, options) {
    const opts = options || {};
    const section = trussSection || null;
    if (!section || section.status !== 'configured') {
      return {
        enabled: false,
        adapterVersion: VISUAL_TRUSS_ADAPTER_VERSION,
        status: section ? toText(section.status, 'placeholder') : 'missing',
        reason: section ? 'truss_section_not_configured' : 'truss_section_missing',
        blocks: [],
        nodes: [],
        bases: [],
        straightRuns: [],
        roof: buildRoofSeed(section, 'missing', { width:0, height:0 }, [], [], opts),
        updatedAt: nowIso()
      };
    }

    const specs = getSpecs();
    const state = readState(section);
    const cellMeters = normalizeCellMeters(state.cellMeters);
    const items = normalizeItems(readInputItems(section), specs);
    const blocks = items.map((item, index) => makeBlock(item, specs, cellMeters, index));
    const result = section.result || (section.snapshot && section.snapshot.result) || {};
    const counts = getResultCounts(section, items, specs);
    const gridBounds = calcBounds(items, specs, cellMeters, 'cells');
    const calculatedPhysicalBounds = calcBounds(items, specs, cellMeters, 'meters');
    const resultPhysical = result.physicalBounds || {};
    const physicalBounds = {
      minX: nonNegative(resultPhysical.minX, calculatedPhysicalBounds.minX),
      minY: nonNegative(resultPhysical.minY, calculatedPhysicalBounds.minY),
      maxX: nonNegative(resultPhysical.maxX, calculatedPhysicalBounds.maxX),
      maxY: nonNegative(resultPhysical.maxY, calculatedPhysicalBounds.maxY),
      width: nonNegative(resultPhysical.width, calculatedPhysicalBounds.width),
      height: nonNegative(resultPhysical.height, calculatedPhysicalBounds.height)
    };
    const structureType = inferStructureType(section, blocks, counts, physicalBounds);
    const nodes = blocks.filter(block => block.kind === 'node');
    const bases = blocks.filter(block => block.kind === 'base');
    const straightRuns = blocks.filter(block => block.kind === 'straight');
    const spanInfo = result.spanInfo || (result.loadCheck && result.loadCheck.spanInfo) || null;
    const roof = buildRoofSeed(section, structureType, physicalBounds, bases, nodes, opts);
    const layoutProfile = buildTrussLayoutProfile(structureType, blocks, physicalBounds, counts);

    return {
      enabled: blocks.length > 0 || collectBomLink(section).rowCount > 0 || opts.includeEmpty === true,
      adapterVersion: VISUAL_TRUSS_ADAPTER_VERSION,
      status: 'ready',
      sourceSection: 'quote.sections.truss',
      title: toText(section.title, 'Фермы'),
      source: toText(section.source, 'truss-section'),
      structureType,
      trussSeries: toText(state.trussSeries, 'T29Q'),
      cellMeters,
      dimensions: {
        widthM: nonNegative(section.widthM || (section.input && section.input.widthM), physicalBounds.width),
        heightM: nonNegative(section.heightM || (section.input && section.input.heightM), physicalBounds.height),
        depthM: nonNegative(section.depthM || (section.input && section.input.depthM), 0),
        physicalWidthM: physicalBounds.width,
        physicalHeightM: physicalBounds.height,
        maxEffectiveSpanM: nonNegative(spanInfo && spanInfo.maxEffective, 0)
      },
      roof,
      roofType: roof.roofType,
      layoutProfile,
      bounds: { grid: gridBounds, physical: physicalBounds },
      blocks,
      straightRuns,
      nodes,
      bases,
      counts: {
        totalBlocks: blocks.length,
        straightCount: straightRuns.length || nonNegative(counts.straight, 0),
        nodeCount: nodes.length || nonNegative(result.nodePieces, nonNegative(counts.node, 0)),
        baseCount: bases.length || nonNegative(result.baseCount, nonNegative(counts.base, 0)),
        connectionCount: nonNegative(result.connectionCount || (section.input && section.input.connectionCount), 0),
        totalMeters: nonNegative(result.totalMeters, Object.keys(counts || {}).reduce((sum, key) => {
          const spec = getSpec(specs, key);
          return spec && spec.kind === 'straight' ? sum + nonNegative(counts[key], 0) * nonNegative(spec.length, 0) : sum;
        }, 0))
      },
      bomLink: collectBomLink(section),
      load: {
        spanInfo: spanInfo ? clone(spanInfo) : null,
        loadCheck: result.loadCheck ? clone(result.loadCheck) : null,
        indicatorReady: Boolean(result.loadCheck || spanInfo)
      },
      totals: {
        weightKg: nonNegative(section.weightKg, result.weight),
        powerW: nonNegative(section.powerW, 0)
      },
      renderHints: {
        adapterReady: true,
        rendererRequired: false,
        layoutProfile: layoutProfile.mode,
        portalTwoPostsBeamReady: layoutProfile.mode === 'portal_two_posts_beam',
        topViewSeedReady: blocks.length > 0,
        frontViewSeedReady: blocks.length > 0,
        isoSeedReady: blocks.length > 0,
        roofSeedReady: Boolean(roof && roof.renderHints && (roof.renderHints.frontViewSeedReady || roof.renderHints.isoSeedReady || roof.status === 'reserved_for_future_roof_visualization')),
        legacySnapshotOnly: blocks.length === 0 && collectBomLink(section).rowCount > 0
      },
      updatedAt: nowIso()
    };
  }

  function buildTrussVisualSmokeReport(trussSection, options) {
    const truss = adaptTrussSection(trussSection || null, options || {});
    const checks = [
      { key:'adapter_version', ok: truss.adapterVersion === VISUAL_TRUSS_ADAPTER_VERSION, label:'truss adapter version is stable' },
      { key:'stable_block', ok: Object.prototype.hasOwnProperty.call(truss, 'enabled') && Array.isArray(truss.blocks), label:'truss adapter returns stable block list' },
      { key:'bom_link', ok: !truss.enabled || Boolean(truss.bomLink && truss.bomLink.sectionKey === 'truss'), label:'truss visual block carries BOM link when configured' },
      { key:'data_only', ok: !truss.renderHints || truss.renderHints.rendererRequired === false, label:'truss adapter does not render or mutate protected flows' },
      { key:'roof_seed', ok: Boolean(truss.roof && truss.roof.engineeringStatus === 'visual_only_no_load_calculation' && truss.roof.protectedFlows && truss.roof.protectedFlows.noBomRowsCreated === true), label:'roof visual seed is present and does not affect load/BOM flows' },
      { key:'portal_layout_profile', ok: !truss.enabled || Boolean(truss.layoutProfile && truss.layoutProfile.rendererContract), label:'truss visual adapter exposes layout profile for portal/front/iso rendering' }
    ];
    return {
      type: 'feg-stage-pro-truss-visual-adapter-smoke-report',
      version: VISUAL_TRUSS_ADAPTER_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      truss,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_TRUSS_ADAPTER_VERSION,
    DEFAULT_CELL_METERS,
    ROOF_TYPES,
    normalizeRoofType,
    normalizeStructureKind,
    buildRoofSeed,
    buildTrussLayoutProfile,
    normalizeItems,
    calcBounds,
    adaptTrussSection,
    buildTrussVisualSmokeReport
  };

  ROOT.TrussVisualAdapter = api;
  ROOT.VisualTrussAdapter = api;
})();
