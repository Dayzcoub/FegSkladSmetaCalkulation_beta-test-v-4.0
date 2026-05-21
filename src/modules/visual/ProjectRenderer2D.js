// FEG Stage PRO v3.16.20 — ProjectRenderer2D LED multi-construction placement lanes
// Responsibility: render lightweight SVG top/front/isometric views from quote.visualModel on demand, with a live truss overlay from visualModel blocks.
// No Canvas/WebGL, no BOM writes, no warehouse writes and no legacy/v3 mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const PROJECT_RENDERER_2D_VERSION = '3.16.20-led-multi-construction-placement-lanes';
  const DEFAULT_CELL_PX = 48;
  const DEFAULT_PADDING_PX = 44;
  const DEFAULT_HEADER_PX = 54;
  const DEFAULT_FOOTER_PX = 54;

  function nowIso() { return new Date().toISOString(); }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function positiveNumber(value, fallback) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const f = Number(fallback);
    return Number.isFinite(f) && f > 0 ? f : 0;
  }
  function toText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || String(fallback == null ? '' : fallback).trim();
  }
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  function escapeSvg(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function numberLabel(value, precision) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(precision == null ? 2 : precision).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }
  function attrs(map) {
    return Object.keys(map || {})
      .filter(key => map[key] !== undefined && map[key] !== null && map[key] !== false)
      .map(key => `${key}="${escapeSvg(map[key])}"`)
      .join(' ');
  }
  function tag(name, map, content) {
    const attrText = attrs(map);
    if (content == null) return `<${name}${attrText ? ' ' + attrText : ''}/>`;
    return `<${name}${attrText ? ' ' + attrText : ''}>${content}</${name}>`;
  }

  function resolveVisualModel(source, options) {
    const src = source || {};
    if (src.type === 'feg-stage-pro-visual-model') return src;
    if (src.visualModel && src.visualModel.type === 'feg-stage-pro-visual-model') return src.visualModel;
    const builder = ROOT.VisualModelBuilder;
    if (builder && builder.buildVisualModel) return builder.buildVisualModel(src, options || {});
    return {
      type: 'feg-stage-pro-visual-model',
      version: '0.1',
      generatedAt: nowIso(),
      stage: { enabled: false, decks: [], stairs: [], edgeClosure: { enabled: false } },
      renderStatus: 'renderer_input_missing_visual_model'
    };
  }

  function getStageBounds(stage) {
    const decks = Array.isArray(stage && stage.decks) ? stage.decks : [];
    const maxX = decks.reduce((max, deck) => Math.max(max, Math.round(toNumber(deck.x, 0))), -1);
    const maxY = decks.reduce((max, deck) => Math.max(max, Math.round(toNumber(deck.y, 0))), -1);
    const bounds = stage && stage.bounds || {};
    return {
      columns: Math.max(0, Math.round(toNumber(bounds.columns, maxX + 1))),
      rows: Math.max(0, Math.round(toNumber(bounds.rows, maxY + 1)))
    };
  }


  function getStageWidthM(stage, columns) {
    const moduleW = positiveNumber(stage && stage.moduleWidthM, 1.2);
    return positiveNumber(stage && stage.widthM, Math.max(1, columns || 1) * moduleW) || Math.max(1, columns || 1);
  }

  function getStageDepthM(stage, rows) {
    const moduleD = positiveNumber(stage && stage.moduleDepthM, 1.2);
    return positiveNumber(stage && stage.depthM, Math.max(1, rows || 1) * moduleD) || Math.max(1, rows || 1);
  }

  function isPlanCellStair(stair) {
    if (!stair) return false;
    if (stair.placementMode === 'plan-cell') return true;
    return Number.isFinite(Number(stair.x)) && Number.isFinite(Number(stair.y)) && (stair.sourceX != null || stair.sourceY != null || stair.key);
  }

  function getStagePlanBounds(stage, stageBounds) {
    const bounds = stageBounds || getStageBounds(stage);
    const stairs = Array.isArray(stage && stage.stairs) ? stage.stairs : [];
    return stairs.reduce((acc, stair) => {
      if (!isPlanCellStair(stair)) return acc;
      const x = Math.round(toNumber(stair.x, 0));
      const y = Math.round(toNumber(stair.y, 0));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return acc;
      acc.minX = Math.min(acc.minX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxX = Math.max(acc.maxX, x);
      acc.maxY = Math.max(acc.maxY, y);
      return acc;
    }, { minX: 0, minY: 0, maxX: Math.max(0, bounds.columns - 1), maxY: Math.max(0, bounds.rows - 1) });
  }

  function makeDefs() {
    return [
      '<defs>',
      '<pattern id="feg-stage-deck-top-texture" width="16" height="16" patternUnits="userSpaceOnUse">',
      '<rect width="16" height="16" fill="#202832"/>',
      '<path d="M0 4 H16 M0 12 H16" stroke="#2d3845" stroke-width="1" opacity="0.85"/>',
      '<path d="M4 0 V16 M12 0 V16" stroke="#111820" stroke-width="1" opacity="0.55"/>',
      '<path d="M0 0 L16 16 M16 0 L0 16" stroke="#394656" stroke-width="0.55" opacity="0.28"/>',
      '</pattern>',
      '<pattern id="feg-stage-front-skirt-texture" width="28" height="18" patternUnits="userSpaceOnUse">',
      '<rect width="28" height="18" fill="#172232"/>',
      '<path d="M3 0 V18 M14 0 V18 M25 0 V18" stroke="#344256" stroke-width="1" opacity="0.75"/>',
      '<path d="M0 5 H28 M0 14 H28" stroke="#0f1722" stroke-width="1" opacity="0.55"/>',
      '</pattern>',
      '<linearGradient id="feg-stage-front-banner-gradient" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0%" stop-color="#123042"/>',
      '<stop offset="50%" stop-color="#0f4f63"/>',
      '<stop offset="100%" stop-color="#123042"/>',
      '</linearGradient>',
      '<linearGradient id="feg-stage-iso-side-gradient" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#263241"/>',
      '<stop offset="100%" stop-color="#121a24"/>',
      '</linearGradient>',
      '<linearGradient id="feg-stage-iso-banner-gradient" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0%" stop-color="#0f3447"/>',
      '<stop offset="50%" stop-color="#0e7490"/>',
      '<stop offset="100%" stop-color="#0f3447"/>',
      '</linearGradient>',
      '<marker id="feg-dimension-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto" markerUnits="strokeWidth">',
      '<path d="M0,0 L7,3.5 L0,7 z" fill="#9fb3c8"/>',
      '</marker>',
      '</defs>'
    ].join('');
  }

  function renderDimensionLine(x1, y1, x2, y2, label, labelX, labelY, rotate) {
    const textAttrs = { x: labelX, y: labelY, 'text-anchor': 'middle', class: 'feg-dim-label' };
    if (rotate) textAttrs.transform = `rotate(${rotate} ${labelX} ${labelY})`;
    return [
      tag('line', {
        x1, y1, x2, y2,
        class: 'feg-dim-line',
        'marker-start': 'url(#feg-dimension-arrow)',
        'marker-end': 'url(#feg-dimension-arrow)'
      }),
      tag('text', textAttrs, escapeSvg(label))
    ].join('');
  }

  function normalizeStairSide(side) {
    const raw = toText(side, 'front').toLowerCase();
    if (['back', 'rear', 'зад', 'сзади'].includes(raw)) return 'back';
    if (['left', 'лево', 'слева'].includes(raw)) return 'left';
    if (['right', 'право', 'справа'].includes(raw)) return 'right';
    return 'front';
  }

  function renderPlanCellStair(stair, index, layout) {
    const cell = layout.cellPx;
    const x = layout.originX + Math.round(toNumber(stair && stair.x, 0)) * cell;
    const y = layout.originY + Math.round(toNumber(stair && stair.y, 0)) * cell;
    const w = Math.max(18, Math.round(nonNegative(stair && stair.widthCells, 1) * cell));
    const h = Math.max(18, Math.round(nonNegative(stair && stair.depthCells, 1) * cell));
    const label = toText(stair && stair.label, 'Лестница');
    return [
      tag('rect', { x, y, width: w, height: h, rx: 6, class: 'feg-stair feg-stair-plan-cell', 'data-stair-id': toText(stair && stair.id, `stage-stair-${index + 1}`), 'data-source-x': stair && stair.sourceX, 'data-source-y': stair && stair.sourceY }),
      tag('path', { d: `M${x + 7} ${y + h * 0.34} H${x + w - 7} M${x + 7} ${y + h * 0.64} H${x + w - 7}`, class: 'feg-stair-step' }),
      tag('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', class: 'feg-small-label' }, escapeSvg(label))
    ].join('');
  }

  function renderEdgeStair(stair, index, layout, stage) {
    const side = normalizeStairSide(stair && stair.side);
    const pos = Math.round(nonNegative(stair && stair.position, index));
    const cell = layout.cellPx;
    const gap = Math.max(6, Math.round(cell * 0.16));
    const stairDepth = Math.max(18, Math.round(cell * 0.58));
    const stageW = layout.columns * cell;
    const stageH = layout.rows * cell;
    const maxCol = Math.max(0, layout.columns - 1);
    const maxRow = Math.max(0, layout.rows - 1);
    let x = layout.originX;
    let y = layout.originY;
    let w = cell;
    let h = stairDepth;

    if (side === 'back') {
      x = layout.originX + clamp(pos, 0, maxCol) * cell;
      y = layout.originY - stairDepth - gap;
    } else if (side === 'left') {
      x = layout.originX - stairDepth - gap;
      y = layout.originY + clamp(pos, 0, maxRow) * cell;
      w = stairDepth;
      h = cell;
    } else if (side === 'right') {
      x = layout.originX + stageW + gap;
      y = layout.originY + clamp(pos, 0, maxRow) * cell;
      w = stairDepth;
      h = cell;
    } else {
      x = layout.originX + clamp(pos, 0, maxCol) * cell;
      y = layout.originY + stageH + gap;
    }

    const label = toText(stair && stair.label, 'Лестница');
    return [
      tag('rect', { x, y, width: w, height: h, rx: 6, class: 'feg-stair', 'data-stair-id': toText(stair && stair.id, `stage-stair-${index + 1}`) }),
      tag('path', { d: `M${x + 6} ${y + h / 3} H${x + w - 6} M${x + 6} ${y + (h * 2) / 3} H${x + w - 6}`, class: 'feg-stair-step' }),
      tag('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', class: 'feg-small-label' }, escapeSvg(label))
    ].join('');
  }

  function renderStair(stair, index, layout, stage) {
    return isPlanCellStair(stair) ? renderPlanCellStair(stair, index, layout) : renderEdgeStair(stair, index, layout, stage);
  }

  function renderMissingStageSvg(model, options) {
    const title = toText(options && options.title, 'Вид сверху — сцена');
    const width = nonNegative(options && options.width, 680) || 680;
    const height = nonNegative(options && options.height, 220) || 220;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-feg-renderer="ProjectRenderer2D" data-feg-renderer-version="${PROJECT_RENDERER_2D_VERSION}">`,
      tag('title', {}, escapeSvg(title)),
      tag('desc', {}, 'FEG Stage PRO visual top view placeholder. Stage section is missing or not configured.'),
      '<style>.bg{fill:#0b1118}.card{fill:#111820;stroke:#2d3845;stroke-width:1.5}.title{font:700 18px system-ui,Segoe UI,sans-serif;fill:#e5edf6}.muted{font:500 13px system-ui,Segoe UI,sans-serif;fill:#9fb3c8}</style>',
      tag('rect', { x: 0, y: 0, width, height, class: 'bg' }),
      tag('rect', { x: 24, y: 24, width: width - 48, height: height - 48, rx: 18, class: 'card' }),
      tag('text', { x: 48, y: 78, class: 'title' }, escapeSvg(title)),
      tag('text', { x: 48, y: 112, class: 'muted' }, 'Сцена не настроена или visualModel.stage выключен.'),
      tag('text', { x: 48, y: 140, class: 'muted' }, 'Рендер не меняет расчёты, BOM, склад и legacy/v3.'),
      '</svg>'
    ].join('');
  }

  function renderStageTopViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const stage = model.stage || {};
    if (!stage.enabled) return renderMissingStageSvg(model, opts);

    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 26, 96);
    const padding = Math.max(26, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(44, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const footer = Math.max(42, Math.round(nonNegative(opts.footerPx, DEFAULT_FOOTER_PX) || DEFAULT_FOOTER_PX));
    const columns = Math.max(1, bounds.columns);
    const rows = Math.max(1, bounds.rows);
    const planBounds = getStagePlanBounds(stage, { columns, rows });
    const extraLeft = Math.max(0, -planBounds.minX) * cellPx;
    const extraTop = Math.max(0, -planBounds.minY) * cellPx;
    const extraRight = Math.max(0, planBounds.maxX - (columns - 1)) * cellPx;
    const extraBottom = Math.max(0, planBounds.maxY - (rows - 1)) * cellPx;
    const stageW = columns * cellPx;
    const stageH = rows * cellPx;
    const originX = padding + 40 + extraLeft;
    const originY = padding + header + extraTop;
    const sideSpace = padding + 86;
    const width = originX + stageW + extraRight + sideSpace;
    const height = originY + stageH + extraBottom + footer + padding;
    const layout = { originX, originY, columns, rows, cellPx, planBounds, extraLeft, extraTop, extraRight, extraBottom };
    const title = toText(opts.title, 'Вид сверху — сцена');
    const subtitle = `${numberLabel(stage.widthM, 2)} × ${numberLabel(stage.depthM, 2)} м · высота ${numberLabel(stage.heightM, 2)} м · настилов ${stage.totals && stage.totals.deckCount || (stage.decks || []).length}`;
    const decks = Array.isArray(stage.decks) ? stage.decks : [];
    const stairs = Array.isArray(stage.stairs) ? stage.stairs : [];
    const edgeClosure = stage.edgeClosure || {};
    const svg = [];

    svg.push(`<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-feg-renderer="ProjectRenderer2D" data-feg-renderer-version="${PROJECT_RENDERER_2D_VERSION}" data-feg-view="stage-top">`);
    svg.push(tag('title', {}, escapeSvg(title)));
    svg.push(tag('desc', {}, `Stage top view generated from quote.visualModel. Generated at ${nowIso()}.`));
    svg.push(makeDefs());
    svg.push('<style>');
    svg.push('.feg-bg{fill:#070b10}.feg-card{fill:#0d141c;stroke:#26313d;stroke-width:1.25}.feg-title{font:800 18px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f3f7fb}.feg-subtitle{font:500 12px system-ui,-apple-system,Segoe UI,sans-serif;fill:#9fb3c8}.feg-grid{stroke:#334150;stroke-width:1;opacity:.5}.feg-deck{fill:url(#feg-stage-deck-top-texture);stroke:#718094;stroke-width:1.25}.feg-deck-label{font:700 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#d9e4ef;opacity:.82}.feg-outline{fill:none;stroke:#7dd3fc;stroke-width:2.5;stroke-dasharray:8 6}.feg-stair{fill:#172232;stroke:#facc15;stroke-width:1.6}.feg-stair-plan-cell{stroke-width:2}.feg-stair-step{stroke:#fef3c7;stroke-width:1;opacity:.8}.feg-small-label{font:700 9px system-ui,-apple-system,Segoe UI,sans-serif;fill:#fef3c7}.feg-dim-line{stroke:#9fb3c8;stroke-width:1.2}.feg-dim-label{font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#dce8f4}.feg-meta{font:500 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#8195aa}.feg-edge-label{font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#7dd3fc}</style>');
    svg.push(tag('rect', { x: 0, y: 0, width, height, class: 'feg-bg' }));
    svg.push(tag('rect', { x: 14, y: 14, width: width - 28, height: height - 28, rx: 18, class: 'feg-card' }));
    svg.push(tag('text', { x: padding, y: 42, class: 'feg-title' }, escapeSvg(title)));
    svg.push(tag('text', { x: padding, y: 62, class: 'feg-subtitle' }, escapeSvg(subtitle)));

    if (opts.showGrid !== false) {
      for (let x = 0; x <= columns; x += 1) {
        svg.push(tag('line', { x1: originX + x * cellPx, y1: originY, x2: originX + x * cellPx, y2: originY + stageH, class: 'feg-grid' }));
      }
      for (let y = 0; y <= rows; y += 1) {
        svg.push(tag('line', { x1: originX, y1: originY + y * cellPx, x2: originX + stageW, y2: originY + y * cellPx, class: 'feg-grid' }));
      }
    }

    if (edgeClosure.enabled) {
      svg.push(tag('rect', { x: originX - 5, y: originY - 5, width: stageW + 10, height: stageH + 10, rx: 8, class: 'feg-outline' }));
      svg.push(tag('text', { x: originX + stageW / 2, y: originY - 14, 'text-anchor': 'middle', class: 'feg-edge-label' }, escapeSvg(`${toText(edgeClosure.label, 'Закрытие торцов')} · ${numberLabel(edgeClosure.perimeterM, 1)} м`)));
    }

    decks.forEach((deck, index) => {
      const x = originX + Math.round(toNumber(deck.x, 0)) * cellPx;
      const y = originY + Math.round(toNumber(deck.y, 0)) * cellPx;
      svg.push(tag('rect', { x, y, width: cellPx, height: cellPx, rx: 4, class: 'feg-deck', 'data-deck-id': toText(deck.id, `stage-deck-${index + 1}`) }));
      if (cellPx >= 38 && opts.showDeckLabels !== false) {
        svg.push(tag('text', { x: x + cellPx / 2, y: y + cellPx / 2 + 4, 'text-anchor': 'middle', class: 'feg-deck-label' }, `${Math.round(toNumber(deck.x, 0)) + 1}.${Math.round(toNumber(deck.y, 0)) + 1}`));
      }
    });

    stairs.forEach((stair, index) => svg.push(renderStair(stair, index, layout, stage)));

    if (opts.showDimensions !== false) {
      const dimY = originY + stageH + extraBottom + 38;
      const dimX = originX + stageW + extraRight + 38;
      svg.push(renderDimensionLine(originX, dimY, originX + stageW, dimY, `${numberLabel(stage.widthM, 2)} м`, originX + stageW / 2, dimY + 20));
      svg.push(renderDimensionLine(dimX, originY, dimX, originY + stageH, `${numberLabel(stage.depthM, 2)} м`, dimX + 20, originY + stageH / 2, 90));
    }

    svg.push(tag('text', { x: padding, y: height - 28, class: 'feg-meta' }, escapeSvg(`visualModel ${model.version || '0.1'} · ${PROJECT_RENDERER_2D_VERSION} · ручной SVG-рендер без BOM/склад/legacy мутаций`)));
    svg.push('</svg>');
    return svg.join('');
  }

  function renderStageFrontStairs(stairs, layout) {
    const list = (Array.isArray(stairs) ? stairs : []).filter(stair => normalizeStairSide(stair && stair.side) === 'front');
    if (!list.length) return '';
    const cell = layout.cellPx;
    const maxCol = Math.max(0, layout.columns - 1);
    const stairW = Math.max(46, Math.round(cell * 0.9));
    const stairH = Math.max(28, Math.round(layout.stageHeightPx * 0.42));
    return list.map((stair, index) => {
      const pos = clamp(Math.round(nonNegative(stair && stair.position, index)), 0, maxCol);
      const x = layout.originX + pos * cell + Math.max(0, (cell - stairW) / 2);
      const y = layout.deckY + layout.deckH + layout.stageHeightPx + 8;
      const label = toText(stair && stair.label, 'Лестница');
      return [
        tag('rect', { x, y, width: stairW, height: stairH, rx: 7, class: 'feg-front-stair' }),
        tag('path', { d: `M${x + 7} ${y + stairH * 0.34} H${x + stairW - 7} M${x + 7} ${y + stairH * 0.64} H${x + stairW - 7}`, class: 'feg-front-stair-step' }),
        tag('text', { x: x + stairW / 2, y: y + stairH / 2 + 4, 'text-anchor': 'middle', class: 'feg-front-small-label' }, escapeSvg(label))
      ].join('');
    }).join('');
  }

  function renderStageFrontViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const stage = model.stage || {};
    if (!stage.enabled) return renderMissingStageSvg(model, Object.assign({}, opts, { title: toText(opts.title, 'Фронтальный вид — сцена') }));

    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 28, 98);
    const padding = Math.max(30, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(52, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const footer = Math.max(58, Math.round(nonNegative(opts.footerPx, DEFAULT_FOOTER_PX) || DEFAULT_FOOTER_PX));
    const columns = Math.max(1, bounds.columns);
    const stageW = columns * cellPx;
    const stageHeightM = Math.max(0, nonNegative(stage.heightM, 0));
    const stageHeightPx = clamp(Math.round(stageHeightM * 96), 26, 150);
    const deckH = Math.max(16, Math.round(cellPx * 0.28));
    const originX = padding + 58;
    const deckY = padding + header + 16;
    const baseY = deckY + deckH + stageHeightPx;
    const rightSpace = padding + 92;
    const extraStairSpace = (Array.isArray(stage.stairs) && stage.stairs.some(stair => normalizeStairSide(stair && stair.side) === 'front')) ? Math.max(44, Math.round(stageHeightPx * 0.55)) : 0;
    const width = originX + stageW + rightSpace;
    const height = baseY + footer + padding + extraStairSpace;
    const title = toText(opts.title, 'Фронтальный вид — сцена');
    const edgeClosure = stage.edgeClosure || {};
    const edgeType = toText(edgeClosure.type, 'none');
    const edgeLabel = edgeClosure.enabled ? toText(edgeClosure.label, edgeType === 'raus_banner' ? 'Раус с баннером' : 'Тканевая юбка') : 'Без закрытия торцов';
    const subtitle = `${numberLabel(stage.widthM, 2)} м ширина · высота ${numberLabel(stage.heightM, 2)} м · ${edgeLabel}`;
    const svg = [];
    const layout = { originX, deckY, deckH, stageHeightPx, columns, cellPx };

    svg.push(`<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-feg-renderer="ProjectRenderer2D" data-feg-renderer-version="${PROJECT_RENDERER_2D_VERSION}" data-feg-view="stage-front">`);
    svg.push(tag('title', {}, escapeSvg(title)));
    svg.push(tag('desc', {}, `Stage front view generated from quote.visualModel. Generated at ${nowIso()}.`));
    svg.push(makeDefs());
    svg.push('<style>');
    svg.push('.feg-bg{fill:#070b10}.feg-card{fill:#0d141c;stroke:#26313d;stroke-width:1.25}.feg-title{font:800 18px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f3f7fb}.feg-subtitle{font:500 12px system-ui,-apple-system,Segoe UI,sans-serif;fill:#9fb3c8}.feg-front-deck{fill:url(#feg-stage-deck-top-texture);stroke:#718094;stroke-width:1.3}.feg-front-deck-split{stroke:#8fa0b2;stroke-width:1;opacity:.48}.feg-front-support{fill:#1e2938;stroke:#64748b;stroke-width:1}.feg-front-skirt{fill:url(#feg-stage-front-skirt-texture);stroke:#475569;stroke-width:1.2}.feg-front-banner{fill:url(#feg-stage-front-banner-gradient);stroke:#38bdf8;stroke-width:1.35}.feg-front-banner-text{font:800 13px system-ui,-apple-system,Segoe UI,sans-serif;fill:#e0f7ff;letter-spacing:.08em}.feg-front-edge-label{font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#7dd3fc}.feg-front-base{stroke:#475569;stroke-width:1.4}.feg-front-stair{fill:#172232;stroke:#facc15;stroke-width:1.6}.feg-front-stair-step{stroke:#fef3c7;stroke-width:1;opacity:.85}.feg-front-small-label{font:700 9px system-ui,-apple-system,Segoe UI,sans-serif;fill:#fef3c7}.feg-dim-line{stroke:#9fb3c8;stroke-width:1.2}.feg-dim-label{font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#dce8f4}.feg-meta{font:500 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#8195aa}</style>');
    svg.push(tag('rect', { x: 0, y: 0, width, height, class: 'feg-bg' }));
    svg.push(tag('rect', { x: 14, y: 14, width: width - 28, height: height - 28, rx: 18, class: 'feg-card' }));
    svg.push(tag('text', { x: padding, y: 42, class: 'feg-title' }, escapeSvg(title)));
    svg.push(tag('text', { x: padding, y: 62, class: 'feg-subtitle' }, escapeSvg(subtitle)));

    svg.push(tag('line', { x1: originX - 18, y1: baseY, x2: originX + stageW + 18, y2: baseY, class: 'feg-front-base' }));

    if (edgeClosure.enabled) {
      const panelClass = edgeType === 'raus_banner' ? 'feg-front-banner' : 'feg-front-skirt';
      svg.push(tag('rect', { x: originX, y: deckY + deckH, width: stageW, height: stageHeightPx, rx: 4, class: panelClass }));
      if (edgeType === 'raus_banner') {
        svg.push(tag('text', { x: originX + stageW / 2, y: deckY + deckH + stageHeightPx / 2 + 5, 'text-anchor': 'middle', class: 'feg-front-banner-text' }, 'БАННЕР'));
      }
      svg.push(tag('text', { x: originX + stageW / 2, y: deckY + deckH + 18, 'text-anchor': 'middle', class: 'feg-front-edge-label' }, escapeSvg(`${edgeLabel}${edgeClosure.perimeterM ? ' · ' + numberLabel(edgeClosure.perimeterM, 1) + ' м' : ''}`)));
    } else if (opts.showSupports !== false) {
      const supportW = Math.max(5, Math.round(cellPx * 0.12));
      for (let x = 0; x <= columns; x += 1) {
        const sx = originX + x * cellPx - supportW / 2;
        svg.push(tag('rect', { x: sx, y: deckY + deckH + 2, width: supportW, height: Math.max(0, stageHeightPx - 2), rx: 2, class: 'feg-front-support' }));
      }
    }

    svg.push(tag('rect', { x: originX, y: deckY, width: stageW, height: deckH, rx: 4, class: 'feg-front-deck' }));
    for (let x = 1; x < columns; x += 1) {
      svg.push(tag('line', { x1: originX + x * cellPx, y1: deckY, x2: originX + x * cellPx, y2: deckY + deckH, class: 'feg-front-deck-split' }));
    }

    svg.push(renderStageFrontStairs(stage.stairs, layout));

    if (opts.showDimensions !== false) {
      const dimY = baseY + 34 + extraStairSpace;
      const dimX = originX + stageW + 38;
      svg.push(renderDimensionLine(originX, dimY, originX + stageW, dimY, `${numberLabel(stage.widthM, 2)} м`, originX + stageW / 2, dimY + 20));
      svg.push(renderDimensionLine(dimX, deckY + deckH, dimX, baseY, `${numberLabel(stage.heightM, 2)} м`, dimX + 20, deckY + deckH + stageHeightPx / 2, 90));
    }

    svg.push(tag('text', { x: padding, y: height - 28, class: 'feg-meta' }, escapeSvg(`visualModel ${model.version || '0.1'} · ${PROJECT_RENDERER_2D_VERSION} · фронтальный SVG-рендер без BOM/склад/legacy мутаций`)));
    svg.push('</svg>');
    return svg.join('');
  }



  function makeDeckSet(stage) {
    const decks = Array.isArray(stage && stage.decks) ? stage.decks : [];
    return new Set(decks.map(deck => `${Math.round(toNumber(deck.x, 0))},${Math.round(toNumber(deck.y, 0))}`));
  }

  function isoPoint(layout, x, y, z) {
    return {
      x: layout.originX + (x - y) * layout.tileW / 2,
      y: layout.originY + (x + y) * layout.tileH / 2 - z
    };
  }

  function isoPath(points) {
    return points.map((pt, index) => `${index === 0 ? 'M' : 'L'}${numberLabel(pt.x, 2)} ${numberLabel(pt.y, 2)}`).join(' ') + ' Z';
  }

  function renderIsoFace(layout, x, y, edge, edgeClosure) {
    const topZ = layout.stageHeightPx;
    const bottomZ = 0;
    let topA;
    let topB;
    let bottomB;
    let bottomA;
    if (edge === 'front') {
      topA = isoPoint(layout, x, y + 1, topZ);
      topB = isoPoint(layout, x + 1, y + 1, topZ);
      bottomB = isoPoint(layout, x + 1, y + 1, bottomZ);
      bottomA = isoPoint(layout, x, y + 1, bottomZ);
    } else if (edge === 'back') {
      topA = isoPoint(layout, x + 1, y, topZ);
      topB = isoPoint(layout, x, y, topZ);
      bottomB = isoPoint(layout, x, y, bottomZ);
      bottomA = isoPoint(layout, x + 1, y, bottomZ);
    } else if (edge === 'right') {
      topA = isoPoint(layout, x + 1, y + 1, topZ);
      topB = isoPoint(layout, x + 1, y, topZ);
      bottomB = isoPoint(layout, x + 1, y, bottomZ);
      bottomA = isoPoint(layout, x + 1, y + 1, bottomZ);
    } else {
      topA = isoPoint(layout, x, y, topZ);
      topB = isoPoint(layout, x, y + 1, topZ);
      bottomB = isoPoint(layout, x, y + 1, bottomZ);
      bottomA = isoPoint(layout, x, y, bottomZ);
    }
    const edgeType = toText(edgeClosure && edgeClosure.type, 'none');
    const cls = edgeClosure && edgeClosure.enabled ? (edgeType === 'raus_banner' ? 'feg-iso-banner-face' : 'feg-iso-skirt-face') : `feg-iso-side-${edge === 'front' || edge === 'back' ? 'front' : 'side'}`;
    return tag('path', { d: isoPath([topA, topB, bottomB, bottomA]), class: cls, 'data-edge': edge });
  }

  function renderIsoDeck(layout, deck, deckSet, edgeClosure) {
    const x = Math.round(toNumber(deck && deck.x, 0));
    const y = Math.round(toNumber(deck && deck.y, 0));
    const z = layout.stageHeightPx;
    const p00 = isoPoint(layout, x, y, z);
    const p10 = isoPoint(layout, x + 1, y, z);
    const p11 = isoPoint(layout, x + 1, y + 1, z);
    const p01 = isoPoint(layout, x, y + 1, z);
    const parts = [];
    if (!deckSet.has(`${x},${y + 1}`)) parts.push(renderIsoFace(layout, x, y, 'front', edgeClosure));
    if (!deckSet.has(`${x + 1},${y}`)) parts.push(renderIsoFace(layout, x, y, 'right', edgeClosure));
    if (!deckSet.has(`${x - 1},${y}`)) parts.push(renderIsoFace(layout, x, y, 'left', edgeClosure));
    if (!deckSet.has(`${x},${y - 1}`)) parts.push(renderIsoFace(layout, x, y, 'back', edgeClosure));
    parts.push(tag('path', { d: isoPath([p00, p10, p11, p01]), class: 'feg-iso-deck-top', 'data-deck-id': toText(deck && deck.id, `stage-deck-${x}-${y}`) }));
    parts.push(tag('path', { d: `M${numberLabel(p00.x, 2)} ${numberLabel(p00.y, 2)} L${numberLabel(p11.x, 2)} ${numberLabel(p11.y, 2)} M${numberLabel(p10.x, 2)} ${numberLabel(p10.y, 2)} L${numberLabel(p01.x, 2)} ${numberLabel(p01.y, 2)}`, class: 'feg-iso-deck-cross' }));
    return parts.join('');
  }

  function isoStairAnchor(layout, stair, index) {
    if (isPlanCellStair(stair)) {
      return { side: normalizeStairSide(stair && stair.side), x: Math.round(toNumber(stair && stair.x, 0)), y: Math.round(toNumber(stair && stair.y, 0)) };
    }
    const side = normalizeStairSide(stair && stair.side);
    const pos = Math.round(nonNegative(stair && stair.position, index));
    const maxCol = Math.max(0, layout.columns - 1);
    const maxRow = Math.max(0, layout.rows - 1);
    if (side === 'back') return { side, x: clamp(pos, 0, maxCol), y: -1 };
    if (side === 'left') return { side, x: -1, y: clamp(pos, 0, maxRow) };
    if (side === 'right') return { side, x: layout.columns, y: clamp(pos, 0, maxRow) };
    return { side: 'front', x: clamp(pos, 0, maxCol), y: layout.rows };
  }

  function renderIsoStair(stair, index, layout) {
    const anchor = isoStairAnchor(layout, stair, index);
    const z = Math.max(8, Math.round(layout.stageHeightPx * 0.55));
    const label = toText(stair && stair.label, 'Лестница');
    const x0 = anchor.x;
    const y0 = anchor.y;
    const p00 = isoPoint(layout, x0, y0, z);
    const p10 = isoPoint(layout, x0 + 1, y0, z);
    const p11 = isoPoint(layout, x0 + 1, y0 + 1, z);
    const p01 = isoPoint(layout, x0, y0 + 1, z);
    const center = isoPoint(layout, x0 + 0.5, y0 + 0.5, z - 5);
    return [
      tag('path', { d: isoPath([p00, p10, p11, p01]), class: 'feg-iso-stair' }),
      tag('path', { d: `M${numberLabel((p00.x + p01.x) / 2, 2)} ${numberLabel((p00.y + p01.y) / 2, 2)} L${numberLabel((p10.x + p11.x) / 2, 2)} ${numberLabel((p10.y + p11.y) / 2, 2)} M${numberLabel((p00.x + p10.x) / 2, 2)} ${numberLabel((p00.y + p10.y) / 2, 2)} L${numberLabel((p01.x + p11.x) / 2, 2)} ${numberLabel((p01.y + p11.y) / 2, 2)}`, class: 'feg-iso-stair-step' }),
      tag('text', { x: center.x, y: center.y + 3, 'text-anchor': 'middle', class: 'feg-iso-small-label' }, escapeSvg(label))
    ].join('');
  }

  function renderStageIsoViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const stage = model.stage || {};
    if (!stage.enabled) return renderMissingStageSvg(model, Object.assign({}, opts, { title: toText(opts.title, 'Изометрия — сцена') }));

    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 30, 92);
    const padding = Math.max(34, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(56, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const footer = Math.max(56, Math.round(nonNegative(opts.footerPx, DEFAULT_FOOTER_PX) || DEFAULT_FOOTER_PX));
    const columns = Math.max(1, bounds.columns);
    const rows = Math.max(1, bounds.rows);
    const tileW = Math.round(cellPx * 1.42);
    const tileH = Math.round(cellPx * 0.76);
    const stageHeightPx = clamp(Math.round(nonNegative(stage.heightM, 0) * 82), 22, 150);
    const isoHalfW = (columns + rows) * tileW / 2;
    const isoTopH = (columns + rows) * tileH / 2;
    const width = Math.ceil(isoHalfW + padding * 2 + 112);
    const height = Math.ceil(header + padding * 2 + isoTopH + stageHeightPx + footer + 34);
    const originX = width / 2 - (columns - rows) * tileW / 4;
    const originY = padding + header + stageHeightPx + 16;
    const layout = { originX, originY, tileW, tileH, stageHeightPx, columns, rows };
    const decks = (Array.isArray(stage.decks) ? stage.decks : []).slice().sort((a, b) => (toNumber(a.y, 0) + toNumber(a.x, 0)) - (toNumber(b.y, 0) + toNumber(b.x, 0)) || toNumber(a.y, 0) - toNumber(b.y, 0));
    const deckSet = makeDeckSet(stage);
    const stairs = Array.isArray(stage.stairs) ? stage.stairs : [];
    const edgeClosure = stage.edgeClosure || {};
    const edgeLabel = edgeClosure.enabled ? toText(edgeClosure.label, 'Закрытие торцов') : 'Без закрытия торцов';
    const title = toText(opts.title, 'Изометрия — сцена');
    const subtitle = `${numberLabel(stage.widthM, 2)} × ${numberLabel(stage.depthM, 2)} м · высота ${numberLabel(stage.heightM, 2)} м · ${edgeLabel}`;
    const svg = [];

    svg.push(`<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-feg-renderer="ProjectRenderer2D" data-feg-renderer-version="${PROJECT_RENDERER_2D_VERSION}" data-feg-view="stage-iso">`);
    svg.push(tag('title', {}, escapeSvg(title)));
    svg.push(tag('desc', {}, `Stage isometric 2.5D preview generated from quote.visualModel. Generated at ${nowIso()}.`));
    svg.push(makeDefs());
    svg.push('<style>');
    svg.push('.feg-bg{fill:#070b10}.feg-card{fill:#0d141c;stroke:#26313d;stroke-width:1.25}.feg-title{font:800 18px system-ui,-apple-system,Segoe UI,sans-serif;fill:#f3f7fb}.feg-subtitle{font:500 12px system-ui,-apple-system,Segoe UI,sans-serif;fill:#9fb3c8}.feg-iso-ground{fill:#0a111a;stroke:#1f2a37;stroke-width:1}.feg-iso-deck-top{fill:url(#feg-stage-deck-top-texture);stroke:#90a4b8;stroke-width:1.2}.feg-iso-deck-cross{stroke:#64748b;stroke-width:.75;opacity:.45}.feg-iso-side-front{fill:url(#feg-stage-iso-side-gradient);stroke:#475569;stroke-width:1}.feg-iso-side-side{fill:#182331;stroke:#405167;stroke-width:1}.feg-iso-skirt-face{fill:url(#feg-stage-front-skirt-texture);stroke:#5d7088;stroke-width:1.15}.feg-iso-banner-face{fill:url(#feg-stage-iso-banner-gradient);stroke:#38bdf8;stroke-width:1.15}.feg-iso-stair{fill:#1c2736;stroke:#facc15;stroke-width:1.3}.feg-iso-stair-step{stroke:#fef3c7;stroke-width:.9;opacity:.75}.feg-iso-small-label{font:700 8px system-ui,-apple-system,Segoe UI,sans-serif;fill:#fef3c7}.feg-iso-edge-label{font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#7dd3fc}.feg-dim-line{stroke:#9fb3c8;stroke-width:1.15}.feg-dim-label{font:700 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#dce8f4}.feg-meta{font:500 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#8195aa}</style>');
    svg.push(tag('rect', { x: 0, y: 0, width, height, class: 'feg-bg' }));
    svg.push(tag('rect', { x: 14, y: 14, width: width - 28, height: height - 28, rx: 18, class: 'feg-card' }));
    svg.push(tag('text', { x: padding, y: 42, class: 'feg-title' }, escapeSvg(title)));
    svg.push(tag('text', { x: padding, y: 62, class: 'feg-subtitle' }, escapeSvg(subtitle)));

    const g1 = isoPoint(layout, -0.45, rows + 0.45, 0);
    const g2 = isoPoint(layout, columns + 0.45, rows + 0.45, 0);
    const g3 = isoPoint(layout, columns + 0.45, -0.45, 0);
    const g4 = isoPoint(layout, -0.45, -0.45, 0);
    svg.push(tag('path', { d: isoPath([g1, g2, g3, g4]), class: 'feg-iso-ground' }));

    decks.forEach(deck => svg.push(renderIsoDeck(layout, deck, deckSet, edgeClosure)));
    stairs.forEach((stair, index) => svg.push(renderIsoStair(stair, index, layout)));

    if (edgeClosure.enabled) {
      const labelY = Math.max(82, originY + isoTopH / 2 - stageHeightPx - 18);
      svg.push(tag('text', { x: width - padding - 18, y: labelY, 'text-anchor': 'end', class: 'feg-iso-edge-label' }, escapeSvg(`${toText(edgeClosure.label, 'Закрытие торцов')}${edgeClosure.perimeterM ? ' · ' + numberLabel(edgeClosure.perimeterM, 1) + ' м' : ''}`)));
    }

    if (opts.showDimensions !== false) {
      const wA = isoPoint(layout, 0, rows + 0.18, 0);
      const wB = isoPoint(layout, columns, rows + 0.18, 0);
      const dA = isoPoint(layout, columns + 0.18, rows, 0);
      const dB = isoPoint(layout, columns + 0.18, 0, 0);
      svg.push(renderDimensionLine(wA.x, wA.y + 22, wB.x, wB.y + 22, `${numberLabel(stage.widthM, 2)} м`, (wA.x + wB.x) / 2, (wA.y + wB.y) / 2 + 42));
      svg.push(renderDimensionLine(dA.x, dA.y + 22, dB.x, dB.y + 22, `${numberLabel(stage.depthM, 2)} м`, (dA.x + dB.x) / 2 + 24, (dA.y + dB.y) / 2 + 34));
      const hBase = isoPoint(layout, columns + 0.72, rows + 0.2, 0);
      svg.push(renderDimensionLine(hBase.x, hBase.y, hBase.x, hBase.y - stageHeightPx, `${numberLabel(stage.heightM, 2)} м`, hBase.x + 22, hBase.y - stageHeightPx / 2, 90));
    }

    svg.push(tag('text', { x: padding, y: height - 28, class: 'feg-meta' }, escapeSvg(`visualModel ${model.version || '0.1'} · ${PROJECT_RENDERER_2D_VERSION} · изометрический SVG-рендер без BOM/склад/legacy мутаций`)));
    svg.push('</svg>');
    return svg.join('');
  }


  function hasTrussVisual(model) {
    const truss = model && model.truss || {};
    return Boolean(truss.enabled && Array.isArray(truss.blocks) && truss.blocks.length);
  }

  function getTrussPhysicalBounds(truss) {
    const blocks = Array.isArray(truss && truss.blocks) ? truss.blocks : [];
    const direct = truss && truss.bounds && truss.bounds.physical || {};
    const fallback = blocks.reduce((acc, block) => {
      const m = block && block.meters || {};
      const x = toNumber(m.x, 0);
      const y = toNumber(m.y, 0);
      const w = Math.max(0.08, nonNegative(m.width, 0.5));
      const h = Math.max(0.08, nonNegative(m.height, 0.5));
      acc.minX = Math.min(acc.minX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxX = Math.max(acc.maxX, x + w);
      acc.maxY = Math.max(acc.maxY, y + h);
      return acc;
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const validFallback = Number.isFinite(fallback.minX) && Number.isFinite(fallback.maxX) && fallback.maxX > fallback.minX;
    const minX = Number.isFinite(Number(direct.minX)) ? Number(direct.minX) : (validFallback ? fallback.minX : 0);
    const minY = Number.isFinite(Number(direct.minY)) ? Number(direct.minY) : (validFallback ? fallback.minY : 0);
    const maxX = Number.isFinite(Number(direct.maxX)) ? Number(direct.maxX) : (validFallback ? fallback.maxX : minX + nonNegative(direct.width, 1));
    const maxY = Number.isFinite(Number(direct.maxY)) ? Number(direct.maxY) : (validFallback ? fallback.maxY : minY + nonNegative(direct.height, 1));
    const width = Math.max(0.5, nonNegative(direct.width, maxX - minX));
    const height = Math.max(0.5, nonNegative(direct.height, maxY - minY));
    return { minX, minY, maxX: minX + width, maxY: minY + height, width, height };
  }

  function makeStageTopLayoutForOverlay(stage, options) {
    const opts = options || {};
    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 26, 96);
    const padding = Math.max(26, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(44, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const columns = Math.max(1, bounds.columns);
    const rows = Math.max(1, bounds.rows);
    const planBounds = getStagePlanBounds(stage, { columns, rows });
    const extraLeft = Math.max(0, -planBounds.minX) * cellPx;
    const extraTop = Math.max(0, -planBounds.minY) * cellPx;
    const stageW = columns * cellPx;
    const stageH = rows * cellPx;
    return {
      originX: padding + 40 + extraLeft,
      originY: padding + header + extraTop,
      stageW,
      stageH,
      columns,
      rows,
      cellPx
    };
  }

  function renderPortalTopOverlay(model, options, layout, bounds) {
    const truss = model.truss || {};
    const stage = model.stage || {};
    const metrics = portalBeamMetrics(truss, bounds || getTrussPhysicalBounds(truss));
    const stageWidthM = getStageWidthM(stage, layout.columns);
    const meterPx = layout.stageW / Math.max(0.1, stageWidthM);
    const portalWidthPx = Math.max(layout.cellPx * 0.75, metrics.widthM * meterPx);
    const centerX = layout.originX + layout.stageW / 2;
    const xLeft = centerX - portalWidthPx / 2;
    const xRight = centerX + portalWidthPx / 2;
    const y = Math.max(32, layout.originY - Math.max(16, Math.round(layout.cellPx * 0.45)));
    const strokeW = clamp(Math.round(layout.cellPx * 0.12), 4, 8);
    const baseSize = Math.max(11, strokeW * 1.8);
    const parts = [];
    parts.push(`<g data-feg-layer="truss" data-feg-truss-view="top" data-feg-truss-live="true" data-feg-truss-layout="portal_top_projection" data-feg-scale-mode="meter-proportional" data-stage-width-m="${escapeSvg(numberLabel(stageWidthM, 2))}" data-portal-width-m="${escapeSvg(numberLabel(metrics.widthM, 2))}">`);
    parts.push(tag('line', { x1: xLeft, y1: y, x2: xRight, y2: y, class: 'feg-truss-portal-beam feg-truss-portal-top-beam' }));
    [xLeft, xRight].forEach((x, index) => {
      parts.push(tag('rect', { x: x - baseSize / 2, y: y - baseSize / 2, width: baseSize, height: baseSize, rx: 3, class: 'feg-truss-base', 'data-truss-id': `portal-top-base-${index + 1}` }));
    });
    metrics.middlePosts.forEach((post, index) => {
      const ratio = metrics.rightX > metrics.leftX ? (toNumber(post && post.xM, metrics.leftX) - metrics.leftX) / Math.max(0.1, metrics.rightX - metrics.leftX) : 0.5;
      const x = xLeft + clamp(ratio, 0.08, 0.92) * (xRight - xLeft);
      parts.push(tag('rect', { x: x - baseSize / 2, y: y - baseSize / 2, width: baseSize, height: baseSize, rx: 3, class: 'feg-truss-base feg-truss-portal-mid-post', 'data-truss-id': toText(post && post.id, `portal-top-mid-${index + 1}`) }));
    });
    parts.push(tag('text', { x: xRight, y: y - 12, 'text-anchor': 'end', class: 'feg-truss-label' }, escapeSvg(`${toText(truss.structureType, 'Портал')} · ${numberLabel(metrics.widthM, 2)} м`)));
    parts.push('</g>');
    return parts.join('');
  }

  function renderTrussTopOverlay(model, options) {
    if (!hasTrussVisual(model) || !model.stage || !model.stage.enabled) return '';
    const truss = model.truss;
    const blocks = Array.isArray(truss.blocks) ? truss.blocks : [];
    const layout = makeStageTopLayoutForOverlay(model.stage, options || {});
    const bounds = getTrussPhysicalBounds(truss);
    if (isPortalTwoPostsBeam(truss)) return renderPortalTopOverlay(model, options || {}, layout, bounds);
    const scaleX = layout.stageW / Math.max(0.5, bounds.width);
    const scaleY = layout.stageH / Math.max(0.5, bounds.height);
    const strokeW = clamp(Math.round(layout.cellPx * 0.16), 4, 10);
    const parts = [];
    parts.push('<g data-feg-layer="truss" data-feg-truss-view="top">');
    parts.push(tag('text', { x: layout.originX, y: Math.max(20, layout.originY - 34), class: 'feg-truss-label' }, escapeSvg(`${toText(truss.structureType, 'Фермы')} · ${toText(truss.trussSeries, 'T29Q')}`)));
    blocks.forEach((block, index) => {
      const m = block && block.meters || {};
      const kind = toText(block && block.kind, 'unknown');
      const x = layout.originX + (toNumber(m.x, bounds.minX) - bounds.minX) * scaleX;
      const y = layout.originY + (toNumber(m.y, bounds.minY) - bounds.minY) * scaleY;
      const w = Math.max(strokeW, nonNegative(m.width, 0.5) * scaleX);
      const h = Math.max(strokeW, nonNegative(m.height, 0.5) * scaleY);
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (kind === 'straight') {
        const horizontal = w >= h;
        parts.push(tag('rect', {
          x: horizontal ? x : cx - strokeW / 2,
          y: horizontal ? cy - strokeW / 2 : y,
          width: horizontal ? w : strokeW,
          height: horizontal ? strokeW : h,
          rx: strokeW / 2,
          class: 'feg-truss-segment',
          'data-truss-id': toText(block && block.id, `truss-${index + 1}`)
        }));
      } else if (kind === 'base') {
        const size = Math.max(12, strokeW * 1.7);
        parts.push(tag('rect', { x: cx - size / 2, y: cy - size / 2, width: size, height: size, rx: 3, class: 'feg-truss-base', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      } else {
        parts.push(tag('circle', { cx, cy, r: Math.max(6, strokeW * 0.86), class: 'feg-truss-node', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      }
    });
    parts.push('</g>');
    return parts.join('');
  }

  function getTrussLayoutMode(truss) {
    const profile = truss && truss.layoutProfile || {};
    const mode = toText(profile.mode || (truss && truss.renderHints && truss.renderHints.layoutProfile), '').toLowerCase();
    if (mode) return mode;
    const structure = toText(truss && truss.structureType, '').toLowerCase();
    return (structure.includes('portal') || structure.includes('портал')) ? 'portal_two_posts_beam' : 'freeform_blocks';
  }

  function isPortalTwoPostsBeam(truss) {
    return getTrussLayoutMode(truss) === 'portal_two_posts_beam';
  }

  function portalBeamMetrics(truss, bounds) {
    const profile = truss && truss.layoutProfile || {};
    const portal = profile.portal || {};
    const dims = truss && truss.dimensions || {};
    const minX = Number.isFinite(Number(portal.leftX)) ? Number(portal.leftX) : (bounds && bounds.minX || 0);
    const maxX = Number.isFinite(Number(portal.rightX)) ? Number(portal.rightX) : (bounds && bounds.maxX || minX + 1);
    const topY = Number.isFinite(Number(portal.topY)) ? Number(portal.topY) : (bounds && bounds.minY || 0);
    const bottomY = Number.isFinite(Number(portal.bottomY)) ? Number(portal.bottomY) : (bounds && bounds.maxY || topY + 1);
    const fallbackWidth = positiveNumber(portal.widthM, bounds && bounds.width || Math.abs(maxX - minX));
    const fallbackHeight = positiveNumber(portal.heightM, bounds && bounds.height || Math.abs(bottomY - topY));
    return {
      leftX: Math.min(minX, maxX),
      rightX: Math.max(minX, maxX),
      topY: Math.min(topY, bottomY),
      bottomY: Math.max(topY, bottomY),
      widthM: positiveNumber(dims.widthM, fallbackWidth) || Math.max(0.5, Math.abs(maxX - minX)),
      heightM: positiveNumber(dims.heightM, fallbackHeight) || Math.max(1, Math.abs(bottomY - topY)),
      middlePosts: Array.isArray(portal.middlePosts) ? portal.middlePosts : []
    };
  }


  function makeStageFrontLayoutForOverlay(stage, options) {
    const opts = options || {};
    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 28, 98);
    const padding = Math.max(30, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(52, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const columns = Math.max(1, bounds.columns);
    const stageW = columns * cellPx;
    const stageHeightPx = clamp(Math.round(nonNegative(stage.heightM, 0) * 96), 26, 150);
    const deckH = Math.max(16, Math.round(cellPx * 0.28));
    const originX = padding + 58;
    const deckY = padding + header + 16;
    const baseY = deckY + deckH + stageHeightPx;
    const stageWidthM = getStageWidthM(stage, columns);
    const stageDepthM = getStageDepthM(stage, Math.max(1, bounds.rows));
    return { originX, deckY, baseY, stageW, stageHeightPx, deckH, cellPx, padding, columns, stageWidthM, stageDepthM };
  }

  function renderPortalFrontOverlay(model, options, layout, bounds) {
    const truss = model.truss || {};
    const metrics = portalBeamMetrics(truss, bounds || getTrussPhysicalBounds(truss));
    const stageWidthM = positiveNumber(layout.stageWidthM, 1);
    const meterPx = layout.stageW / Math.max(0.1, stageWidthM);
    const portalWidthPx = Math.max(layout.cellPx * 0.75, metrics.widthM * meterPx);
    const centerX = layout.originX + layout.stageW / 2;
    const xLeft = centerX - portalWidthPx / 2;
    const xRight = centerX + portalWidthPx / 2;
    const yBase = layout.baseY;
    const heightM = Math.max(1, positiveNumber(metrics.heightM, truss.dimensions && truss.dimensions.heightM));
    const yTop = Math.max(58, layout.deckY - clamp(Math.round(heightM * 42), 78, 184));
    const strokeW = clamp(Math.round(layout.cellPx * 0.16), 6, 11);
    const parts = [];
    parts.push(`<g data-feg-layer="truss" data-feg-truss-view="front" data-feg-truss-live="true" data-feg-truss-layout="portal_two_posts_beam" data-feg-scale-mode="meter-proportional" data-stage-width-m="${escapeSvg(numberLabel(stageWidthM, 2))}" data-portal-width-m="${escapeSvg(numberLabel(metrics.widthM, 2))}">`);
    parts.push(tag('line', { x1: xLeft, y1: yBase, x2: xLeft, y2: yTop, class: 'feg-truss-portal-post' }));
    parts.push(tag('line', { x1: xRight, y1: yBase, x2: xRight, y2: yTop, class: 'feg-truss-portal-post' }));
    parts.push(tag('line', { x1: xLeft, y1: yTop, x2: xRight, y2: yTop, class: 'feg-truss-portal-beam' }));
    metrics.middlePosts.forEach((post, index) => {
      const ratio = metrics.rightX > metrics.leftX ? (toNumber(post && post.xM, metrics.leftX) - metrics.leftX) / Math.max(0.1, metrics.rightX - metrics.leftX) : 0.5;
      const x = xLeft + clamp(ratio, 0.08, 0.92) * (xRight - xLeft);
      parts.push(tag('line', { x1: x, y1: yBase, x2: x, y2: yTop, class: 'feg-truss-portal-post feg-truss-portal-mid-post', 'data-truss-id': toText(post && post.id, `portal-mid-${index + 1}`) }));
    });
    const baseSize = Math.max(12, strokeW * 1.55);
    [xLeft, xRight].forEach((x, index) => {
      parts.push(tag('rect', { x: x - baseSize / 2, y: yBase - baseSize / 2, width: baseSize, height: baseSize, rx: 3, class: 'feg-truss-base', 'data-truss-id': `portal-base-${index + 1}` }));
      parts.push(tag('circle', { cx: x, cy: yTop, r: Math.max(5, strokeW * 0.65), class: 'feg-truss-node' }));
    });
    parts.push(tag('text', { x: xRight, y: yTop - 10, 'text-anchor': 'end', class: 'feg-truss-label' }, escapeSvg(`${toText(truss.structureType, 'Портал')} · перекладина на 2 ногах`)));
    parts.push('</g>');
    return parts.join('');
  }


  function renderTrussFrontOverlay(model, options) {
    if (!hasTrussVisual(model) || !model.stage || !model.stage.enabled) return '';
    const truss = model.truss;
    const blocks = Array.isArray(truss.blocks) ? truss.blocks : [];
    const layout = makeStageFrontLayoutForOverlay(model.stage, options || {});
    const bounds = getTrussPhysicalBounds(truss);
    if (isPortalTwoPostsBeam(truss)) return renderPortalFrontOverlay(model, options || {}, layout, bounds);
    const trussHeightM = Math.max(1, nonNegative(truss.dimensions && truss.dimensions.heightM, truss.dimensions && truss.dimensions.physicalHeightM));
    const visualHeight = clamp(Math.round(trussHeightM * 34), 54, 150);
    const yTop = Math.max(76, layout.deckY - Math.min(58, visualHeight * 0.6));
    const yBase = layout.baseY;
    const xLeft = layout.originX + Math.max(8, layout.stageW * 0.04);
    const xRight = layout.originX + layout.stageW - Math.max(8, layout.stageW * 0.04);
    const scaleX = (xRight - xLeft) / Math.max(0.5, bounds.width);
    const scaleY = Math.max(24, Math.min(visualHeight, yBase - yTop)) / Math.max(0.5, bounds.height);
    const strokeW = clamp(Math.round(layout.cellPx * 0.14), 4, 9);
    const xOf = value => xLeft + (toNumber(value, bounds.minX) - bounds.minX) * scaleX;
    const yOf = value => yTop + (toNumber(value, bounds.minY) - bounds.minY) * scaleY;
    const parts = [];
    parts.push('<g data-feg-layer="truss" data-feg-truss-view="front" data-feg-truss-live="true">');
    blocks.forEach((block, index) => {
      const m = block && block.meters || {};
      const kind = toText(block && block.kind, 'unknown');
      const x1 = xOf(m.x);
      const x2 = xOf(toNumber(m.x, bounds.minX) + nonNegative(m.width, 0.5));
      const y1 = yOf(m.y);
      const y2 = yOf(toNumber(m.y, bounds.minY) + nonNegative(m.height, 0.5));
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      if (kind === 'straight') {
        const horizontal = (block && block.orientation) !== 'vertical' && Math.abs(x2 - x1) >= Math.abs(y2 - y1);
        parts.push(tag('line', {
          x1: horizontal ? x1 : cx,
          y1: horizontal ? cy : y1,
          x2: horizontal ? x2 : cx,
          y2: horizontal ? cy : y2,
          class: 'feg-truss-front-segment',
          'data-truss-id': toText(block && block.id, `truss-${index + 1}`)
        }));
      } else if (kind === 'base') {
        const size = Math.max(10, strokeW * 1.6);
        parts.push(tag('rect', { x: cx - size / 2, y: yBase - size / 2, width: size, height: size, rx: 3, class: 'feg-truss-base', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      } else {
        parts.push(tag('circle', { cx, cy, r: Math.max(5, strokeW * 0.82), class: 'feg-truss-node', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      }
    });
    if (truss.roof && truss.roof.enabled && truss.roof.roofType !== 'none') {
      const roofLabel = toText(truss.roof.label, truss.roof.roofType);
      parts.push(tag('path', { d: `M${xLeft} ${yTop} L${(xLeft + xRight) / 2} ${Math.max(56, yTop - 24)} L${xRight} ${yTop}`, class: 'feg-truss-roof-seed' }));
      parts.push(tag('text', { x: (xLeft + xRight) / 2, y: Math.max(52, yTop - 30), 'text-anchor': 'middle', class: 'feg-truss-label' }, escapeSvg(roofLabel)));
    }
    parts.push(tag('text', { x: xRight, y: yTop - 8, 'text-anchor': 'end', class: 'feg-truss-label' }, escapeSvg(`${toText(truss.structureType, 'Фермы')} · ${blocks.length} блок.`)));
    parts.push('</g>');
    return parts.join('');
  }


  function makeStageIsoLayoutForOverlay(stage, options) {
    const opts = options || {};
    const bounds = getStageBounds(stage);
    const cellPx = clamp(Math.round(nonNegative(opts.cellPx, DEFAULT_CELL_PX) || DEFAULT_CELL_PX), 30, 92);
    const padding = Math.max(34, Math.round(nonNegative(opts.paddingPx, DEFAULT_PADDING_PX) || DEFAULT_PADDING_PX));
    const header = Math.max(56, Math.round(nonNegative(opts.headerPx, DEFAULT_HEADER_PX) || DEFAULT_HEADER_PX));
    const columns = Math.max(1, bounds.columns);
    const rows = Math.max(1, bounds.rows);
    const tileW = Math.round(cellPx * 1.42);
    const tileH = Math.round(cellPx * 0.76);
    const stageHeightPx = clamp(Math.round(nonNegative(stage.heightM, 0) * 82), 22, 150);
    const isoHalfW = (columns + rows) * tileW / 2;
    const width = Math.ceil(isoHalfW + padding * 2 + 112);
    const originX = width / 2 - (columns - rows) * tileW / 4;
    const originY = padding + header + stageHeightPx + 16;
    const stageWidthM = getStageWidthM(stage, columns);
    const stageDepthM = getStageDepthM(stage, rows);
    const moduleWidthM = stageWidthM / Math.max(1, columns);
    const moduleDepthM = stageDepthM / Math.max(1, rows);
    return { originX, originY, tileW, tileH, stageHeightPx, columns, rows, stageWidthM, stageDepthM, moduleWidthM, moduleDepthM };
  }

  function renderPortalIsoOverlay(model, options, layout, bounds) {
    const truss = model.truss || {};
    const metrics = portalBeamMetrics(truss, bounds || getTrussPhysicalBounds(truss));
    const zTop = layout.stageHeightPx + clamp(Math.round(Math.max(1, positiveNumber(metrics.heightM, truss.dimensions && truss.dimensions.heightM)) * 24), 54, 122);
    const moduleWidthM = positiveNumber(layout.moduleWidthM, Math.max(0.1, positiveNumber(layout.stageWidthM, layout.columns) / Math.max(1, layout.columns)));
    const portalWidthCells = Math.max(0.5, metrics.widthM / Math.max(0.1, moduleWidthM));
    const centerCellX = layout.columns / 2;
    const depthCell = -0.16;
    const leftCellX = centerCellX - portalWidthCells / 2;
    const rightCellX = centerCellX + portalWidthCells / 2;
    const pLeftBase = isoPoint(layout, leftCellX, depthCell, layout.stageHeightPx);
    const pRightBase = isoPoint(layout, rightCellX, depthCell, layout.stageHeightPx);
    const pLeftTop = isoPoint(layout, leftCellX, depthCell, zTop);
    const pRightTop = isoPoint(layout, rightCellX, depthCell, zTop);
    const parts = [];
    parts.push(`<g data-feg-layer="truss" data-feg-truss-view="iso" data-feg-truss-live="true" data-feg-truss-layout="portal_two_posts_beam" data-feg-scale-mode="meter-proportional" data-stage-width-m="${escapeSvg(numberLabel(layout.stageWidthM, 2))}" data-portal-width-m="${escapeSvg(numberLabel(metrics.widthM, 2))}">`);
    parts.push(tag('line', { x1: pLeftBase.x, y1: pLeftBase.y, x2: pLeftTop.x, y2: pLeftTop.y, class: 'feg-truss-portal-post' }));
    parts.push(tag('line', { x1: pRightBase.x, y1: pRightBase.y, x2: pRightTop.x, y2: pRightTop.y, class: 'feg-truss-portal-post' }));
    parts.push(tag('line', { x1: pLeftTop.x, y1: pLeftTop.y, x2: pRightTop.x, y2: pRightTop.y, class: 'feg-truss-portal-beam' }));
    metrics.middlePosts.forEach((post, index) => {
      const ratio = metrics.rightX > metrics.leftX ? (toNumber(post && post.xM, metrics.leftX) - metrics.leftX) / Math.max(0.1, metrics.rightX - metrics.leftX) : 0.5;
      const xCell = leftCellX + clamp(ratio, 0.08, 0.92) * (rightCellX - leftCellX);
      const b = isoPoint(layout, xCell, depthCell, layout.stageHeightPx);
      const t = isoPoint(layout, xCell, depthCell, zTop);
      parts.push(tag('line', { x1: b.x, y1: b.y, x2: t.x, y2: t.y, class: 'feg-truss-portal-post feg-truss-portal-mid-post', 'data-truss-id': toText(post && post.id, `portal-mid-${index + 1}`) }));
    });
    const baseSize = 10;
    [pLeftBase, pRightBase].forEach((p, index) => parts.push(tag('rect', { x: p.x - baseSize / 2, y: p.y - baseSize / 2, width: baseSize, height: baseSize, rx: 2, class: 'feg-truss-base', 'data-truss-id': `portal-base-${index + 1}` })));
    parts.push(tag('text', { x: (pLeftTop.x + pRightTop.x) / 2, y: Math.min(pLeftTop.y, pRightTop.y) - 12, 'text-anchor': 'middle', class: 'feg-truss-label' }, escapeSvg(`${toText(truss.trussSeries, 'T29Q')} · портал`)));
    parts.push('</g>');
    return parts.join('');
  }


  function renderTrussIsoOverlay(model, options) {
    if (!hasTrussVisual(model) || !model.stage || !model.stage.enabled) return '';
    const truss = model.truss;
    const blocks = Array.isArray(truss.blocks) ? truss.blocks : [];
    const layout = makeStageIsoLayoutForOverlay(model.stage, options || {});
    const bounds = getTrussPhysicalBounds(truss);
    if (isPortalTwoPostsBeam(truss)) return renderPortalIsoOverlay(model, options || {}, layout, bounds);
    const z = layout.stageHeightPx + clamp(Math.round(nonNegative(truss.dimensions && truss.dimensions.heightM, 1) * 22), 34, 98);
    const scaleX = layout.columns / Math.max(0.5, bounds.width);
    const scaleY = layout.rows / Math.max(0.5, bounds.height);
    const cellX = value => (toNumber(value, bounds.minX) - bounds.minX) * scaleX;
    const cellY = value => (toNumber(value, bounds.minY) - bounds.minY) * scaleY;
    const parts = [];
    parts.push('<g data-feg-layer="truss" data-feg-truss-view="iso" data-feg-truss-live="true">');
    blocks.forEach((block, index) => {
      const m = block && block.meters || {};
      const kind = toText(block && block.kind, 'unknown');
      const x1 = cellX(m.x);
      const y1 = cellY(m.y);
      const x2 = cellX(toNumber(m.x, bounds.minX) + nonNegative(m.width, 0.5));
      const y2 = cellY(toNumber(m.y, bounds.minY) + nonNegative(m.height, 0.5));
      const p1 = isoPoint(layout, x1, y1, z);
      const p2 = isoPoint(layout, x2, y2, z);
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const pc = isoPoint(layout, cx, cy, z);
      if (kind === 'straight') {
        parts.push(tag('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: 'feg-truss-iso-post', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      } else if (kind === 'base') {
        const base = isoPoint(layout, cx, cy, layout.stageHeightPx);
        parts.push(tag('rect', { x: base.x - 5, y: base.y - 5, width: 10, height: 10, rx: 2, class: 'feg-truss-base', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
        parts.push(tag('line', { x1: pc.x, y1: pc.y, x2: base.x, y2: base.y, class: 'feg-truss-iso-post' }));
      } else {
        parts.push(tag('circle', { cx: pc.x, cy: pc.y, r: 5, class: 'feg-truss-node', 'data-truss-id': toText(block && block.id, `truss-${index + 1}`) }));
      }
    });
    if (truss.roof && truss.roof.enabled && truss.roof.roofType !== 'none') {
      const p1 = isoPoint(layout, 0, layout.rows, z);
      const p3 = isoPoint(layout, layout.columns, 0, z);
      const peak = isoPoint(layout, layout.columns / 2, layout.rows / 2, z + 30);
      parts.push(tag('path', { d: `M${numberLabel(p1.x,2)} ${numberLabel(p1.y,2)} L${numberLabel(peak.x,2)} ${numberLabel(peak.y,2)} L${numberLabel(p3.x,2)} ${numberLabel(p3.y,2)}`, class: 'feg-truss-roof-seed' }));
    }
    parts.push(tag('text', { x: layout.originX, y: layout.originY - z - 10, 'text-anchor': 'middle', class: 'feg-truss-label' }, escapeSvg(`${toText(truss.trussSeries, 'T29Q')} · ${blocks.length} блок.`)));
    parts.push('</g>');
    return parts.join('');
  }


  function hasLedVisual(model) {
    const led = model && model.led || {};
    return Boolean(led.enabled && Array.isArray(led.constructions) && led.constructions.length);
  }

  function getLedConstructions(model) {
    const led = model && model.led || {};
    return (Array.isArray(led.constructions) ? led.constructions : []).filter(item => item && item.cabinets && nonNegative(item.cabinets.count, 0) > 0);
  }

  function ledConstructionMetrics(item, led) {
    const dims = item && item.dimensions || {};
    const cabs = item && item.cabinets || {};
    const cabinetType = led && led.cabinetType || {};
    const cabinetW = positiveNumber(dims.cabinetWidthM, positiveNumber(cabinetType.widthM, 0.64)) || 0.64;
    const cabinetH = positiveNumber(dims.cabinetHeightM, positiveNumber(cabinetType.heightM, 0.64)) || 0.64;
    const columns = Math.max(1, Math.round(nonNegative(cabs.columns || (item && item.grid && item.grid.columns), 1)));
    const rows = Math.max(1, Math.round(nonNegative(cabs.rows || (item && item.grid && item.grid.rows), 1)));
    return {
      columns,
      rows,
      widthM: positiveNumber(dims.widthM, columns * cabinetW) || columns * cabinetW,
      heightM: positiveNumber(dims.heightM, rows * cabinetH) || rows * cabinetH,
      cabinetCount: Math.max(0, Math.round(nonNegative(cabs.count, columns * rows))),
      name: toText(item && item.name, 'LED экран')
    };
  }


  const LED_VISUAL_PLACEMENTS = {
    back: { id: 'back', label: 'Задник', front: 'center_backdrop', top: 'backline', iso: 'back_plane' },
    suspended: { id: 'suspended', label: 'Подвес', front: 'center_suspended', top: 'center_hang', iso: 'back_plane_high' },
    floor: { id: 'floor', label: 'Напольная установка', front: 'floor_stand', top: 'front_floor', iso: 'front_floor' },
    side_left: { id: 'side_left', label: 'Боковой левый', front: 'side_left', top: 'left_side', iso: 'left_side' },
    side_right: { id: 'side_right', label: 'Боковой правый', front: 'side_right', top: 'right_side', iso: 'right_side' },
    top_strip: { id: 'top_strip', label: 'Верхняя полоса', front: 'top_strip', top: 'backline_top_strip', iso: 'top_strip' },
    bottom_strip: { id: 'bottom_strip', label: 'Нижняя полоса', front: 'bottom_strip', top: 'front_bottom_strip', iso: 'bottom_strip' },
    separate: { id: 'separate', label: 'Отдельная конструкция', front: 'separate_right', top: 'separate_right', iso: 'separate_right' }
  };

  function normalizeLedPlacement(value, index) {
    const raw = toText(value, '').toLowerCase();
    if (LED_VISUAL_PLACEMENTS[raw]) return raw;
    if (['backdrop', 'backline', 'rear', 'задник'].includes(raw)) return 'back';
    if (['hang', 'hanging', 'подвес'].includes(raw)) return 'suspended';
    if (['standing', 'stand', 'floor_stand', 'напольная'].includes(raw)) return 'floor';
    if (['left', 'sideleft', 'левый'].includes(raw)) return 'side_left';
    if (['right', 'sideright', 'правый'].includes(raw)) return 'side_right';
    if (index === 0) return 'back';
    return 'separate';
  }

  function getLedPlacementMap(options) {
    const opts = options || {};
    const source = opts.ledPlacements || opts.visualLedPlacements || opts.ledPlacementMap || {};
    return source && typeof source === 'object' ? source : {};
  }

  function getLedPlacementFor(item, index, options) {
    const map = getLedPlacementMap(options || {});
    const id = toText(item && item.id, `led-construction-${index + 1}`);
    const direct = map[id] || map[String(index)] || map[index + 1] || map[toText(item && item.name, '')];
    const itemVisual = item && (item.visualPlacement || item.visualizerPlacement || item.renderPlacement || item.placement);
    const normalized = normalizeLedPlacement(direct || itemVisual, index);
    const info = LED_VISUAL_PLACEMENTS[normalized] || LED_VISUAL_PLACEMENTS.back;
    return Object.assign({}, info, { id: normalized });
  }

  function buildLedPlacementContexts(list, options) {
    const source = Array.isArray(list) ? list : [];
    const seen = {};
    const contexts = source.map((item, index) => {
      const placement = getLedPlacementFor(item, index, options || {});
      const key = placement.id || 'back';
      const slot = seen[key] || 0;
      seen[key] = slot + 1;
      return { placement, slot, total: 0, groupKey: key };
    });
    const totals = contexts.reduce((acc, ctx) => {
      acc[ctx.groupKey] = (acc[ctx.groupKey] || 0) + 1;
      return acc;
    }, {});
    contexts.forEach(ctx => { ctx.total = totals[ctx.groupKey] || 1; });
    return contexts;
  }

  function centeredSlotOffset(slot, total, step) {
    const count = Math.max(1, Math.round(nonNegative(total, 1)));
    const index = clamp(Math.round(nonNegative(slot, 0)), 0, count - 1);
    return (index - (count - 1) / 2) * Math.max(0, nonNegative(step, 0));
  }

  function ledPlacementAttrs(item, index, placement, slotInfo) {
    const info = slotInfo || {};
    return {
      'data-led-id': toText(item && item.id, `led-${index + 1}`),
      'data-feg-led-placement': placement.id,
      'data-feg-led-placement-label': placement.label,
      'data-feg-led-placement-slot': Math.round(nonNegative(info.slot, 0)),
      'data-feg-led-placement-total': Math.max(1, Math.round(nonNegative(info.total, 1)))
    };
  }

  function getStageDepthRows(stage) {
    const bounds = getStageBounds(stage || {});
    return Math.max(1, bounds.rows || 1);
  }

  function renderLedCabinetGrid(x, y, w, h, columns, rows, className, prefix) {
    const parts = [];
    parts.push(tag('rect', { x, y, width: w, height: h, rx: 5, class: className || 'feg-led-screen' }));
    const maxLines = 18;
    if (columns > 1 && columns <= maxLines) {
      for (let c = 1; c < columns; c += 1) {
        const lx = x + (w * c) / columns;
        parts.push(tag('line', { x1: lx, y1: y, x2: lx, y2: y + h, class: `${prefix || 'feg-led'}-grid` }));
      }
    }
    if (rows > 1 && rows <= maxLines) {
      for (let r = 1; r < rows; r += 1) {
        const ly = y + (h * r) / rows;
        parts.push(tag('line', { x1: x, y1: ly, x2: x + w, y2: ly, class: `${prefix || 'feg-led'}-grid` }));
      }
    }
    return parts.join('');
  }

  function renderLedTopOverlay(model, options) {
    if (!hasLedVisual(model) || !model.stage || !model.stage.enabled) return '';
    const opts = options || {};
    const led = model.led || {};
    const list = getLedConstructions(model);
    if (!list.length) return '';
    const layout = makeStageTopLayoutForOverlay(model.stage, opts);
    const stageWidthM = getStageWidthM(model.stage, layout.columns);
    const stageDepthM = getStageDepthM(model.stage, layout.rows);
    const meterPx = layout.stageW / Math.max(0.1, stageWidthM);
    const parts = [];
    const contexts = buildLedPlacementContexts(list, opts);
    parts.push('<g data-feg-layer="led" data-feg-led-view="top" data-feg-led-placement-source="visualizer-controls" data-feg-led-layout="placement_lanes">');
    list.forEach((item, index) => {
      const ctx = contexts[index] || { placement: getLedPlacementFor(item, index, opts), slot: index, total: list.length };
      const m = ledConstructionMetrics(item, led);
      const placement = ctx.placement;
      const baseW = clamp(Math.round(m.widthM * meterPx), Math.round(layout.cellPx * 0.55), Math.round(layout.stageW * 1.25));
      const h = Math.max(9, Math.round(layout.cellPx * 0.18));
      const laneGap = h + 8;
      const sideLaneGap = h + 6;
      let w = baseW;
      let x = layout.originX + layout.stageW / 2 - w / 2;
      let y = layout.originY - 22 - ctx.slot * laneGap;
      if (placement.id === 'back') x += centeredSlotOffset(ctx.slot, ctx.total, Math.min(layout.cellPx * 0.22, 14));
      if (placement.id === 'suspended') {
        x += centeredSlotOffset(ctx.slot, ctx.total, Math.min(layout.cellPx * 0.24, 16));
        y = layout.originY + Math.max(8, layout.stageH * 0.42) + ctx.slot * laneGap;
      }
      if (placement.id === 'floor' || placement.id === 'bottom_strip') {
        x += centeredSlotOffset(ctx.slot, ctx.total, Math.min(layout.cellPx * 0.24, 16));
        y = layout.originY + layout.stageH + 16 + ctx.slot * laneGap;
      }
      if (placement.id === 'top_strip') y = layout.originY - 28 - ctx.slot * laneGap;
      if (placement.id === 'side_left') { w = Math.min(baseW, layout.stageH * 0.95); x = layout.originX - w - 22; y = layout.originY + layout.stageH / 2 - h / 2 + centeredSlotOffset(ctx.slot, ctx.total, sideLaneGap); }
      if (placement.id === 'side_right') { w = Math.min(baseW, layout.stageH * 0.95); x = layout.originX + layout.stageW + 22; y = layout.originY + layout.stageH / 2 - h / 2 + centeredSlotOffset(ctx.slot, ctx.total, sideLaneGap); }
      if (placement.id === 'separate') { x = layout.originX + layout.stageW + 24 + ctx.slot * 8; y = layout.originY + layout.stageH + 18 + ctx.slot * laneGap; }
      parts.push(tag('rect', Object.assign({ x, y, width: w, height: h, rx: 4, class: 'feg-led-top-screen', 'data-led-width-m': numberLabel(m.widthM, 2), 'data-led-height-m': numberLabel(m.heightM, 2), 'data-stage-depth-m': numberLabel(stageDepthM, 2) }, ledPlacementAttrs(item, index, placement, ctx))));
      parts.push(tag('text', { x: x + w / 2, y: y - 5, 'text-anchor': 'middle', class: 'feg-led-label' }, escapeSvg(`${m.name} · ${placement.label} · ${numberLabel(m.widthM, 2)}×${numberLabel(m.heightM, 2)} м`)));
    });
    parts.push('</g>');
    return parts.join('');
  }

  function renderLedFrontOverlay(model, options) {
    if (!hasLedVisual(model) || !model.stage || !model.stage.enabled) return '';
    const opts = options || {};
    const led = model.led || {};
    const list = getLedConstructions(model);
    if (!list.length) return '';
    const layout = makeStageFrontLayoutForOverlay(model.stage, opts);
    const stageWidthM = getStageWidthM(model.stage, layout.columns);
    const meterPx = layout.stageW / Math.max(0.1, stageWidthM);
    const availableTop = Math.max(58, layout.deckY - 18);
    const screenBottom = layout.deckY - 5;
    const parts = [];
    const contexts = buildLedPlacementContexts(list, opts);
    parts.push('<g data-feg-layer="led" data-feg-led-view="front" data-feg-led-placement-source="visualizer-controls" data-feg-led-layout="placement_lanes">');
    list.forEach((item, index) => {
      const ctx = contexts[index] || { placement: getLedPlacementFor(item, index, opts), slot: index, total: list.length };
      const m = ledConstructionMetrics(item, led);
      const placement = ctx.placement;
      let w = Math.max(34, m.widthM * meterPx);
      let h = Math.max(24, w * (m.heightM / Math.max(0.1, m.widthM)));
      const side = placement.id === 'side_left' || placement.id === 'side_right' || placement.id === 'separate';
      const maxW = side ? layout.stageW * 0.42 : layout.stageW * 1.08;
      const maxH = Math.max(24, screenBottom - availableTop - ctx.slot * 8);
      const k = Math.min(1, maxW / Math.max(1, w), maxH / Math.max(1, h));
      w *= k;
      h *= k;
      let x = layout.originX + layout.stageW / 2 - w / 2 + centeredSlotOffset(ctx.slot, ctx.total, Math.min(24, w * 0.08));
      let y = screenBottom - h - ctx.slot * 9;
      if (placement.id === 'suspended') y = Math.max(availableTop + 6, screenBottom - h - 28 - ctx.slot * 12);
      if (placement.id === 'floor') y = layout.deckY + layout.deckH - h * 0.16 + ctx.slot * 5;
      if (placement.id === 'side_left') { x = layout.originX - w - 22; y = screenBottom - h - ctx.slot * 10; }
      if (placement.id === 'side_right') { x = layout.originX + layout.stageW + 22; y = screenBottom - h - ctx.slot * 10; }
      if (placement.id === 'top_strip') { y = availableTop + 8 + ctx.slot * 16; h = Math.max(14, Math.min(h, 30)); }
      if (placement.id === 'bottom_strip') { y = screenBottom - Math.max(14, Math.min(h, 30)) - ctx.slot * 16; h = Math.max(14, Math.min(h, 30)); }
      if (placement.id === 'separate') { x = layout.originX + layout.stageW + 22; y = screenBottom - h - 28 - ctx.slot * (h + 24); }
      parts.push(renderLedCabinetGrid(x, y, w, h, m.columns, m.rows, 'feg-led-screen', 'feg-led'));
      parts.push(tag('rect', Object.assign({ x, y, width: w, height: h, rx: 5, fill: 'none', class: 'feg-led-placement-hitbox', 'data-led-width-m': numberLabel(m.widthM, 2), 'data-led-height-m': numberLabel(m.heightM, 2) }, ledPlacementAttrs(item, index, placement, ctx))));
      parts.push(tag('text', { x: x + w / 2, y: y - 7, 'text-anchor': 'middle', class: 'feg-led-label' }, escapeSvg(`${m.name} · ${placement.label} · ${m.columns}×${m.rows}`)));
      if (item && item.hanging && nonNegative(item.hanging.hangingBarCount, 0) > 0) {
        parts.push(tag('text', { x: x + w / 2, y: y + h + 14, 'text-anchor': 'middle', class: 'feg-led-meta' }, escapeSvg(`Hanging Bar: ${Math.round(nonNegative(item.hanging.hangingBarCount, 0))}`)));
      }
    });
    parts.push('</g>');
    return parts.join('');
  }

  function renderLedIsoOverlay(model, options) {
    if (!hasLedVisual(model) || !model.stage || !model.stage.enabled) return '';
    const opts = options || {};
    const led = model.led || {};
    const list = getLedConstructions(model);
    if (!list.length) return '';
    const layout = makeStageIsoLayoutForOverlay(model.stage, opts);
    const moduleWidthM = positiveNumber(layout.moduleWidthM, Math.max(0.1, positiveNumber(layout.stageWidthM, layout.columns) / Math.max(1, layout.columns)));
    const parts = [];
    const contexts = buildLedPlacementContexts(list, opts);
    parts.push('<g data-feg-layer="led" data-feg-led-view="iso" data-feg-led-placement-source="visualizer-controls" data-feg-led-layout="placement_lanes">');
    list.forEach((item, index) => {
      const ctx = contexts[index] || { placement: getLedPlacementFor(item, index, opts), slot: index, total: list.length };
      const m = ledConstructionMetrics(item, led);
      const placement = ctx.placement;
      const widthCells = Math.max(0.25, m.widthM / Math.max(0.1, moduleWidthM));
      let centerX = layout.columns / 2 + centeredSlotOffset(ctx.slot, ctx.total, 0.16);
      let yCell = -0.08 - ctx.slot * 0.08;
      let bottomZ = layout.stageHeightPx + 2;
      if (placement.id === 'suspended') bottomZ += 20 + ctx.slot * 8;
      if (placement.id === 'floor') { yCell = layout.rows + 0.18 + ctx.slot * 0.12; bottomZ = layout.stageHeightPx + 2; }
      if (placement.id === 'side_left') { centerX = -0.45 - ctx.slot * 0.18; yCell = layout.rows / 2 + centeredSlotOffset(ctx.slot, ctx.total, 0.18); }
      if (placement.id === 'side_right') { centerX = layout.columns + 0.45 + ctx.slot * 0.18; yCell = layout.rows / 2 + centeredSlotOffset(ctx.slot, ctx.total, 0.18); }
      if (placement.id === 'top_strip') { bottomZ += 42 + ctx.slot * 8; yCell = -0.1 - ctx.slot * 0.08; }
      if (placement.id === 'bottom_strip') { yCell = layout.rows + 0.16 + ctx.slot * 0.1; }
      if (placement.id === 'separate') { centerX = layout.columns + 0.75 + ctx.slot * 0.25; yCell = layout.rows + 0.25 + ctx.slot * 0.18; }
      const heightPx = clamp(Math.round(m.heightM * 28), 28, 128);
      const left = centerX - widthCells / 2;
      const right = centerX + widthCells / 2;
      const pBL = isoPoint(layout, left, yCell, bottomZ);
      const pBR = isoPoint(layout, right, yCell, bottomZ);
      const pTR = isoPoint(layout, right, yCell, bottomZ + heightPx);
      const pTL = isoPoint(layout, left, yCell, bottomZ + heightPx);
      parts.push(tag('path', Object.assign({ d: isoPath([pBL, pBR, pTR, pTL]), class: 'feg-led-iso-screen', 'data-led-width-m': numberLabel(m.widthM, 2), 'data-led-height-m': numberLabel(m.heightM, 2) }, ledPlacementAttrs(item, index, placement, ctx))));
      const label = isoPoint(layout, centerX, yCell, bottomZ + heightPx + 10);
      parts.push(tag('text', { x: label.x, y: label.y, 'text-anchor': 'middle', class: 'feg-led-label' }, escapeSvg(`${m.name} · ${placement.label}`)));
    });
    parts.push('</g>');
    return parts.join('');
  }

  function injectLedOverlay(svg, overlay, view) {
    if (!overlay) return svg;
    const style = '.feg-led-screen{fill:#0f1c1c;stroke:#6f9999;stroke-width:2;opacity:.96}.feg-led-grid{stroke:#92abab;stroke-width:.65;opacity:.34}.feg-led-top-screen{fill:#122121;stroke:#6f9999;stroke-width:1.6;opacity:.95}.feg-led-iso-screen{fill:#0f1c1c;stroke:#6f9999;stroke-width:1.7;opacity:.92}.feg-led-label{font:800 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#dce8e8}.feg-led-meta{font:700 9px system-ui,-apple-system,Segoe UI,sans-serif;fill:#b9cccc}';
    const withStyle = svg.replace('</style>', `${style}</style>`);
    return withStyle.replace('</svg>', `${overlay}<text x="44" y="102" class="feg-meta" data-feg-led-renderer="placement-controls">LED: visualizer placement v3.16.20 · ${escapeSvg(view)} · placement только в визуализаторе</text></svg>`);
  }


  function injectTrussOverlay(svg, overlay, view) {
    if (!overlay) return svg;
    const style = '.feg-truss-segment{fill:#d7dde6;stroke:#aeb8c6;stroke-width:1.1;opacity:.94}.feg-truss-node{fill:#e5e7eb;stroke:#94a3b8;stroke-width:1.4}.feg-truss-base{fill:#111827;stroke:#fbbf24;stroke-width:1.4}.feg-truss-label{font:800 10px system-ui,-apple-system,Segoe UI,sans-serif;fill:#dbeafe}.feg-truss-front-segment{stroke:#d7dde6;stroke-width:7;stroke-linecap:round;opacity:.95}.feg-truss-roof-seed{fill:none;stroke:#38bdf8;stroke-width:2;stroke-dasharray:6 4;opacity:.9}.feg-truss-iso-frame{fill:none;stroke:#d7dde6;stroke-width:4;stroke-linejoin:round;opacity:.95}.feg-truss-iso-post{stroke:#aeb8c6;stroke-width:3;stroke-linecap:round;opacity:.95}.feg-truss-portal-post{stroke:#aeb8c6;stroke-width:7;stroke-linecap:round;opacity:.98}.feg-truss-portal-mid-post{stroke-dasharray:5 4}.feg-truss-portal-beam{stroke:#d7dde6;stroke-width:9;stroke-linecap:round;opacity:.98}.feg-truss-portal-top-beam{stroke-width:7;stroke-dasharray:0;opacity:.96}';
    const withStyle = svg.replace('</style>', `${style}</style>`);
    return withStyle.replace('</svg>', `${overlay}<text x="44" y="86" class="feg-meta" data-feg-truss-renderer="seed">Фермы: live renderer v3.16.15 · ${escapeSvg(view)}</text></svg>`);
  }

  function renderProjectTopViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const base = renderStageTopViewSvg(model, Object.assign({ title: 'Вид сверху — проект' }, opts));
    return injectLedOverlay(injectTrussOverlay(base, renderTrussTopOverlay(model, opts), 'top'), renderLedTopOverlay(model, opts), 'top');
  }

  function renderProjectFrontViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const base = renderStageFrontViewSvg(model, Object.assign({ title: 'Фронтальный вид — проект' }, opts));
    return injectLedOverlay(injectTrussOverlay(base, renderTrussFrontOverlay(model, opts), 'front'), renderLedFrontOverlay(model, opts), 'front');
  }

  function renderProjectIsoViewSvg(source, options) {
    const opts = options || {};
    const model = resolveVisualModel(source, opts);
    const base = renderStageIsoViewSvg(model, Object.assign({ title: 'Изометрия — проект' }, opts));
    return injectLedOverlay(injectTrussOverlay(base, renderTrussIsoOverlay(model, opts), 'iso'), renderLedIsoOverlay(model, opts), 'iso');
  }

  function renderStageTopViewDataUri(source, options) {
    const svg = renderStageTopViewSvg(source, options || {});
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function renderStageFrontViewDataUri(source, options) {
    const svg = renderStageFrontViewSvg(source, options || {});
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function renderStageIsoViewDataUri(source, options) {
    const svg = renderStageIsoViewSvg(source, options || {});
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function buildRendererSmokeReport(source, options) {
    const model = resolveVisualModel(source, options || {});
    const topSvg = renderProjectTopViewSvg(model, options || {});
    const frontSvg = renderProjectFrontViewSvg(model, options || {});
    const isoSvg = renderProjectIsoViewSvg(model, options || {});
    const checks = [
      { key: 'renderer_version', ok: PROJECT_RENDERER_2D_VERSION.includes('3.16.20'), label: 'renderer version is v3.16.20' },
      { key: 'top_svg_output', ok: /^<svg[\s>]/.test(topSvg) && topSvg.includes('</svg>'), label: 'renderer returns top SVG string' },
      { key: 'front_svg_output', ok: /^<svg[\s>]/.test(frontSvg) && frontSvg.includes('</svg>'), label: 'renderer returns front SVG string' },
      { key: 'iso_svg_output', ok: /^<svg[\s>]/.test(isoSvg) && isoSvg.includes('</svg>'), label: 'renderer returns iso SVG string' },
      { key: 'stage_top_view_marker', ok: topSvg.includes('data-feg-view="stage-top"') || topSvg.includes('Stage section is missing'), label: 'stage top view marker exists' },
      { key: 'stage_front_view_marker', ok: frontSvg.includes('data-feg-view="stage-front"') || frontSvg.includes('Stage section is missing'), label: 'stage front view marker exists' },
      { key: 'stage_iso_view_marker', ok: isoSvg.includes('data-feg-view="stage-iso"') || isoSvg.includes('Stage section is missing'), label: 'stage iso view marker exists' },
      { key: 'front_view_height_dimension', ok: frontSvg.includes('фронтальный SVG-рендер') || frontSvg.includes('Stage section is missing'), label: 'front view documents manual renderer policy' },
      { key: 'iso_view_manual_policy', ok: isoSvg.includes('изометрический SVG-рендер') || isoSvg.includes('Stage section is missing'), label: 'iso view documents manual renderer policy' },
      { key: 'deck_texture', ok: topSvg.includes('feg-stage-deck-top-texture') || !model.stage || !model.stage.enabled, label: 'stage deck texture pattern is embedded' },
      { key: 'manual_no_mutation_policy', ok: (topSvg.includes('без BOM/склад/legacy') && frontSvg.includes('без BOM/склад/legacy')) || !model.stage || !model.stage.enabled, label: 'renderer documents no mutation policy' },
      { key: 'truss_visual_seed', ok: !hasTrussVisual(model) || (topSvg.includes('data-feg-layer="truss"') && frontSvg.includes('data-feg-truss-view="front"') && isoSvg.includes('data-feg-truss-view="iso"')), label: 'project renderer includes live truss overlays from visualModel blocks when truss visualModel is ready' },
      { key: 'portal_two_posts_beam', ok: !hasTrussVisual(model) || !isPortalTwoPostsBeam(model.truss) || (frontSvg.includes('data-feg-truss-layout="portal_two_posts_beam"') && isoSvg.includes('data-feg-truss-layout="portal_two_posts_beam"')), label: 'portal truss renders as two posts plus top beam in front/iso views' },
      { key: 'portal_meter_proportional', ok: !hasTrussVisual(model) || !isPortalTwoPostsBeam(model.truss) || (topSvg.includes('data-feg-truss-layout="portal_top_projection"') && topSvg.includes('data-feg-scale-mode="meter-proportional"') && frontSvg.includes('data-feg-scale-mode="meter-proportional"') && isoSvg.includes('data-feg-scale-mode="meter-proportional"')), label: 'portal width is scaled from real meters and top view uses canonical beam projection instead of live depth blocks' },
      { key: 'led_visual_seed', ok: !hasLedVisual(model) || (topSvg.includes('data-feg-layer="led"') && frontSvg.includes('data-feg-led-view="front"') && isoSvg.includes('data-feg-led-view="iso"')), label: 'project renderer includes read-only LED overlays from visualModel constructions when LED visualModel is ready' },
      { key: 'led_visualizer_boundary', ok: !hasLedVisual(model) || (frontSvg.includes('data-feg-led-placement-source="visualizer-controls"') && isoSvg.includes('placement только в визуализаторе')), label: 'LED placement stays in visualizer layer and is not returned to LED calculator' },
      { key: 'led_visual_placement_controls', ok: !hasLedVisual(model) || (frontSvg.includes('data-feg-led-placement=') && topSvg.includes('data-feg-led-placement-label=')), label: 'LED placement is driven by visualizer controls and SVG data markers only' },
      { key: 'led_multi_construction_lanes', ok: !hasLedVisual(model) || (frontSvg.includes('data-feg-led-layout="placement_lanes"') && topSvg.includes('data-feg-led-placement-slot=')), label: 'multiple LED constructions use per-placement visual lanes without calculator/BOM mutations' }
    ];
    return {
      type: 'feg-stage-pro-project-renderer-2d-smoke-report',
      version: PROJECT_RENDERER_2D_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      svgLength: topSvg.length,
      topSvgLength: topSvg.length,
      frontSvgLength: frontSvg.length,
      isoSvgLength: isoSvg.length,
      stageEnabled: Boolean(model.stage && model.stage.enabled),
      generatedAt: nowIso()
    };
  }

  const api = {
    PROJECT_RENDERER_2D_VERSION,
    DEFAULT_CELL_PX,
    renderStageTopViewSvg,
    renderStageFrontViewSvg,
    renderStageIsoViewSvg,
    renderTrussTopOverlay,
    renderTrussFrontOverlay,
    renderTrussIsoOverlay,
    renderLedTopOverlay,
    renderLedFrontOverlay,
    renderLedIsoOverlay,
    renderProjectTopViewSvg,
    renderProjectFrontViewSvg,
    renderProjectIsoViewSvg,
    renderStageTopViewDataUri,
    renderStageFrontViewDataUri,
    renderStageIsoViewDataUri,
    buildRendererSmokeReport
  };

  ROOT.ProjectRenderer2D = api;
  ROOT.VisualProjectRenderer2D = api;
})();
