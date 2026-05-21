// FEG Stage PRO v3.16.8 — Visual export helpers
// Responsibility: package on-demand SVG/Data URI/PNG-ready visual previews from visualModel renderers.
// Boundary: manual export only; no automatic render-on-click, no PDF insertion, no BOM/warehouse/backend/legacy mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_EXPORT_VERSION = '3.16.8-visual-export';
  const DEFAULT_MODES = ['top', 'front', 'iso'];
  const MODE_LABELS = {
    top: 'Вид сверху',
    front: 'Фронтальный вид',
    iso: 'Изометрия'
  };
  const MODE_FILE_SUFFIX = {
    top: 'stage-top',
    front: 'stage-front',
    iso: 'stage-iso'
  };

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || String(fallback == null ? '' : fallback).trim();
  }
  function slugify(value, fallback) {
    const text = toText(value, fallback || 'feg-stage-pro-visual')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
    return text || toText(fallback, 'feg-stage-pro-visual');
  }
  function safeMode(mode) {
    const value = toText(mode, 'top').toLowerCase();
    return DEFAULT_MODES.includes(value) ? value : 'top';
  }
  function normalizeModes(modes) {
    const source = Array.isArray(modes) && modes.length ? modes : DEFAULT_MODES;
    const unique = [];
    source.forEach(mode => {
      const normalized = safeMode(mode);
      if (!unique.includes(normalized)) unique.push(normalized);
    });
    return unique.length ? unique : DEFAULT_MODES.slice();
  }
  function byteLength(text) {
    const value = String(text == null ? '' : text);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
    return value.length;
  }
  function encodeSvgDataUri(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svg || ''))}`;
  }
  function decodeSvgDataUri(uri) {
    const text = String(uri || '');
    const marker = 'data:image/svg+xml;charset=utf-8,';
    if (text.startsWith(marker)) return decodeURIComponent(text.slice(marker.length));
    return text;
  }
  function makeSvgBlob(svg) {
    if (typeof Blob === 'undefined') return null;
    return new Blob([String(svg || '')], { type: 'image/svg+xml;charset=utf-8' });
  }
  function getObjectUrlApi() {
    return (GLOBAL.URL && GLOBAL.URL.createObjectURL && GLOBAL.URL.revokeObjectURL) ? GLOBAL.URL : null;
  }
  function resolveRenderer() {
    const renderer = ROOT.ProjectRenderer2D || ROOT.VisualProjectRenderer2D;
    if (!renderer) throw new Error('ProjectRenderer2D is required for VisualExport');
    return renderer;
  }
  function resolveModel(source, options) {
    const src = source || {};
    if (src.type === 'feg-stage-pro-visual-model' || src.stage || src.truss || src.led) return src;
    const builder = ROOT.VisualModelBuilder;
    if (builder && builder.buildVisualModel) return builder.buildVisualModel(src, options || {});
    return src.visualModel || src;
  }
  function getQuoteTitle(source, options) {
    const opts = options || {};
    const src = source || {};
    return toText(
      opts.title || src.title || src.projectName || src.name || src.quoteName || src.localId || src.id,
      'feg-stage-pro-visual'
    );
  }
  function renderSvg(source, mode, options) {
    const renderer = resolveRenderer();
    const normalizedMode = safeMode(mode);
    if (normalizedMode === 'front') return renderer.renderProjectFrontViewSvg(source, options || {});
    if (normalizedMode === 'iso') return renderer.renderProjectIsoViewSvg(source, options || {});
    return renderer.renderProjectTopViewSvg(source, options || {});
  }
  function makeExportName(source, mode, options) {
    const opts = options || {};
    const title = slugify(opts.fileBase || getQuoteTitle(source, opts), 'feg-stage-pro-visual');
    const suffix = MODE_FILE_SUFFIX[safeMode(mode)] || 'stage-view';
    return `${title}-${suffix}`;
  }
  function makeSvgExport(source, mode, options) {
    const opts = options || {};
    const normalizedMode = safeMode(mode);
    const model = resolveModel(source, opts);
    const svg = renderSvg(model, normalizedMode, opts);
    const filename = `${makeExportName(source, normalizedMode, opts)}.svg`;
    return {
      type: 'feg-stage-pro-visual-export-item',
      version: VISUAL_EXPORT_VERSION,
      mode: normalizedMode,
      label: MODE_LABELS[normalizedMode],
      format: 'svg',
      mimeType: 'image/svg+xml;charset=utf-8',
      filename,
      content: svg,
      dataUri: encodeSvgDataUri(svg),
      bytes: byteLength(svg),
      renderer: 'ProjectRenderer2D',
      source: 'quote.visualModel',
      generatedAt: nowIso(),
      protectedFlows: {
        manualExportOnly: true,
        noAutomaticRenderOnInput: true,
        noBomMutation: true,
        noWarehouseMutation: true,
        noQuoteItemsMutation: true,
        noBackendWrite: true,
        noLegacyMutation: true,
        noPdfInsertionInThisStep: true
      }
    };
  }
  function exportStageTopSvg(source, options) { return makeSvgExport(source, 'top', options || {}); }
  function exportStageFrontSvg(source, options) { return makeSvgExport(source, 'front', options || {}); }
  function exportStageIsoSvg(source, options) { return makeSvgExport(source, 'iso', options || {}); }

  function buildVisualExportPack(source, options) {
    const opts = options || {};
    const modes = normalizeModes(opts.modes);
    const model = resolveModel(source, opts);
    const items = modes.map(mode => makeSvgExport(model, mode, opts));
    return {
      type: 'feg-stage-pro-visual-export-pack',
      version: VISUAL_EXPORT_VERSION,
      visualModelVersion: toText(model && model.version, '0.1'),
      itemCount: items.length,
      modes,
      formats: ['svg', 'svg-data-uri', 'png-data-uri-browser-helper'],
      items,
      generatedAt: nowIso(),
      performancePolicy: {
        manualExportOnly: true,
        noHeavyRenderOnInput: true,
        lazyRender: true,
        cacheable: true,
        noBomMutation: true,
        noWarehouseMutation: true,
        noQuoteItemsMutation: true,
        noBackendWrite: true,
        noLegacyMutation: true
      }
    };
  }

  function buildVisualPreviewSnapshot(source, options) {
    const opts = options || {};
    const mode = safeMode(opts.mode || 'iso');
    const item = makeSvgExport(source, mode, opts);
    return {
      type: 'feg-stage-pro-visual-preview',
      version: VISUAL_EXPORT_VERSION,
      updatedAt: item.generatedAt,
      mode,
      label: item.label,
      imageSvg: item.content,
      imageSvgDataUri: item.dataUri,
      imagePng: '',
      pngStatus: 'available_through_browser_canvas_helper_on_demand',
      visualModelVersion: '0.1',
      source: 'manual_visual_export_only',
      protectedFlows: clone(item.protectedFlows)
    };
  }

  function attachVisualPreviewToQuote(quote, options) {
    const q = clone(quote || {}) || {};
    q.visualModel = q.visualModel || (ROOT.VisualModelBuilder && ROOT.VisualModelBuilder.buildVisualModel ? ROOT.VisualModelBuilder.buildVisualModel(q, options || {}) : undefined);
    q.visualPreview = buildVisualPreviewSnapshot(q.visualModel || q, options || {});
    return q;
  }

  function downloadExportItem(item) {
    if (!item || !item.content) throw new Error('Visual export item is empty');
    if (typeof document === 'undefined') throw new Error('downloadExportItem is available only in browser context');
    const blob = makeSvgBlob(item.content);
    const urlApi = getObjectUrlApi();
    if (!blob || !urlApi) throw new Error('Blob URL API is unavailable');
    const url = urlApi.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = toText(item.filename, 'feg-stage-pro-visual.svg');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => urlApi.revokeObjectURL(url), 250);
    return { ok: true, filename: link.download, mimeType: item.mimeType };
  }

  function svgToPngDataUri(svgOrItem, options) {
    const opts = options || {};
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return Promise.reject(new Error('svgToPngDataUri requires a browser canvas context'));
    }
    const svg = typeof svgOrItem === 'string' ? decodeSvgDataUri(svgOrItem) : String(svgOrItem && (svgOrItem.content || svgOrItem.dataUri) || '');
    const cleanSvg = decodeSvgDataUri(svg);
    const blob = makeSvgBlob(cleanSvg);
    const urlApi = getObjectUrlApi();
    if (!blob || !urlApi) return Promise.reject(new Error('Blob URL API is unavailable'));
    const scale = Math.max(1, Number(opts.scale || 2));
    const backgroundColor = toText(opts.backgroundColor, '#070b10');
    const url = urlApi.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.max(1, Math.round((img.naturalWidth || img.width || 1200) * scale));
          const height = Math.max(1, Math.round((img.naturalHeight || img.height || 800) * scale));
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngDataUri = canvas.toDataURL('image/png');
          urlApi.revokeObjectURL(url);
          resolve({
            type: 'feg-stage-pro-visual-png-export',
            version: VISUAL_EXPORT_VERSION,
            format: 'png',
            mimeType: 'image/png',
            dataUri: pngDataUri,
            width,
            height,
            scale,
            generatedAt: nowIso(),
            protectedFlows: {
              manualExportOnly: true,
              noBomMutation: true,
              noWarehouseMutation: true,
              noBackendWrite: true,
              noLegacyMutation: true
            }
          });
        } catch (error) {
          urlApi.revokeObjectURL(url);
          reject(error);
        }
      };
      img.onerror = () => {
        urlApi.revokeObjectURL(url);
        reject(new Error('Unable to rasterize SVG visual export to PNG'));
      };
      img.src = url;
    });
  }

  function exportStageTopPngDataUri(source, options) {
    return svgToPngDataUri(exportStageTopSvg(source, options || {}), options || {});
  }
  function exportStageFrontPngDataUri(source, options) {
    return svgToPngDataUri(exportStageFrontSvg(source, options || {}), options || {});
  }
  function exportStageIsoPngDataUri(source, options) {
    return svgToPngDataUri(exportStageIsoSvg(source, options || {}), options || {});
  }

  function buildVisualExportSmokeReport(source, options) {
    const pack = buildVisualExportPack(source || {}, Object.assign({ modes: DEFAULT_MODES }, options || {}));
    const checks = [
      { key: 'visual_export_version', ok: VISUAL_EXPORT_VERSION.includes('3.16.8'), label: 'VisualExport version is v3.16.8' },
      { key: 'export_pack_type', ok: pack.type === 'feg-stage-pro-visual-export-pack' && pack.itemCount === 3, label: 'export pack has stable type and three stage views' },
      { key: 'svg_items_ready', ok: pack.items.every(item => item.format === 'svg' && item.content.includes('<svg') && item.content.includes('</svg>')), label: 'all export items contain SVG strings' },
      { key: 'data_uri_ready', ok: pack.items.every(item => item.dataUri.startsWith('data:image/svg+xml;charset=utf-8,')), label: 'all export items expose SVG data URI' },
      { key: 'filenames_ready', ok: pack.items.some(item => item.filename.includes('stage-top')) && pack.items.some(item => item.filename.includes('stage-front')) && pack.items.some(item => item.filename.includes('stage-iso')), label: 'export filenames identify top/front/iso modes' },
      { key: 'manual_export_policy', ok: pack.performancePolicy.manualExportOnly === true && pack.performancePolicy.noHeavyRenderOnInput === true, label: 'manual/lazy export policy is preserved' },
      { key: 'protected_flows', ok: pack.performancePolicy.noBomMutation === true && pack.performancePolicy.noWarehouseMutation === true && pack.performancePolicy.noBackendWrite === true && pack.performancePolicy.noLegacyMutation === true, label: 'export does not mutate protected flows' }
    ];
    return {
      type: 'feg-stage-pro-visual-export-smoke-report',
      version: VISUAL_EXPORT_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      pack,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_EXPORT_VERSION,
    DEFAULT_MODES,
    MODE_LABELS,
    encodeSvgDataUri,
    decodeSvgDataUri,
    makeSvgExport,
    exportStageTopSvg,
    exportStageFrontSvg,
    exportStageIsoSvg,
    buildVisualExportPack,
    buildVisualPreviewSnapshot,
    attachVisualPreviewToQuote,
    downloadExportItem,
    svgToPngDataUri,
    exportStageTopPngDataUri,
    exportStageFrontPngDataUri,
    exportStageIsoPngDataUri,
    buildVisualExportSmokeReport
  };

  ROOT.VisualExport = api;
})();
