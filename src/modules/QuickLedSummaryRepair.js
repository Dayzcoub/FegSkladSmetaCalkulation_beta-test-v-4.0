// PACK.IT — quick LED summary repair.
// Visual/render-only helper: fills the right quick LED summary from existing LedCalculator result fields.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.1.0-quick-led-summary-repair';
  let raf = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function formatM(value) { return toNumber(value, 0).toFixed(2); }
  function formatKg(value) { return `${toNumber(value, 0).toFixed(2)} кг`; }
  function formatKw(value) { return `${toNumber(value, 0).toFixed(2)} кВт`; }

  function findStateOwner(calcRoot) {
    let node = calcRoot;
    while (node && node !== document.body) {
      if (node._v4LedState) return node;
      node = node.parentElement;
    }
    return calcRoot;
  }

  function readField(calcRoot, key) {
    const el = calcRoot && calcRoot.querySelector ? calcRoot.querySelector(`[data-led="${key}"]`) : null;
    return el ? el.value : '';
  }

  function buildPayload(calcRoot) {
    const owner = findStateOwner(calcRoot);
    const state = owner && owner._v4LedState;
    const base = Object.assign({}, state && state.base ? state.base : {}, {
      widthM: readField(calcRoot, 'widthM') || (state && state.base && state.base.widthM),
      heightM: readField(calcRoot, 'heightM') || (state && state.base && state.base.heightM),
      format: readField(calcRoot, 'format') || (state && state.base && state.base.format),
      pitch: readField(calcRoot, 'pitch') || (state && state.base && state.base.pitch),
      cabinetWeightKg: readField(calcRoot, 'cabinetWeightKg') || (state && state.base && state.base.cabinetWeightKg),
      cabinetPowerW: readField(calcRoot, 'cabinetPowerW') || (state && state.base && state.base.cabinetPowerW),
      cabinetStartupPowerW: readField(calcRoot, 'cabinetStartupPowerW') || (state && state.base && state.base.cabinetStartupPowerW),
      legType: readField(calcRoot, 'legType') || (state && state.base && state.base.legType),
      legCount: readField(calcRoot, 'legCount') || (state && state.base && state.base.legCount),
      mountMode: readField(calcRoot, 'mountMode') || (state && state.base && state.base.mountMode)
    });
    return Object.assign({}, base, {
      layoutBlocks: (state && Array.isArray(state.parts) ? state.parts : []).map(part => ({
        id: part.id,
        name: part.name,
        type: part.type,
        colorKey: part.colorKey,
        cells: (part.cells || []).map(cell => ({ x: cell.x, y: cell.y }))
      }))
    });
  }

  function calculate(calcRoot) {
    const calc = ROOT.LedCalculator;
    if (!calc || typeof calc.calculateLedLayout !== 'function') return null;
    try {
      return calc.calculateLedLayout(buildPayload(calcRoot));
    } catch (error) {
      console.warn('[PACK.IT][quick-led-summary] calculate failed', error);
      return null;
    }
  }

  function renderOne(calcRoot) {
    if (!calcRoot) return;
    const box = calcRoot.querySelector(':scope > [data-led-result]');
    if (!box) return;
    const result = calculate(calcRoot);
    if (!result) return;

    const constructionCount = result.constructionCount || (Array.isArray(result.constructions) ? result.constructions.length : 0);
    const cabinetCount = result.cabinetCount || result.totalCabinets || 0;
    const pixelsX = result.totalPixelsX || (result.resolution && result.resolution.width) || 0;
    const pixelsY = result.totalPixelsY || (result.resolution && result.resolution.height) || 0;
    const powerKw = result.totalPowerKw != null ? result.totalPowerKw : (toNumber(result.totalPowerW, 0) / 1000);
    const startupKw = result.totalStartupPowerKw != null ? result.totalStartupPowerKw : (toNumber(result.totalStartupPowerW, 0) / 1000);
    const hangingBars = result.hangingBarCount || result.totalHangingBars || 0;
    const legs = result.legCount || 0;
    const cables = result.powerconSchukoCables || 0;
    const aspect = result.aspectRatioLabel || (result.aspectRatio && result.aspectRatio.label) || '—';

    box.innerHTML = `
      <div class="v4-summary-strip packit-led-summary-restored" data-packit-led-summary-restored="true">
        <div><b>${formatM(result.actualWidthM)}×${formatM(result.actualHeightM)} м</b><span>Фактический габарит</span></div>
        <div><b>${constructionCount} шт</b><span>Конструкции</span></div>
        <div><b>${cabinetCount} шт</b><span>Кабинеты</span></div>
        <div><b>${pixelsX}×${pixelsY}</b><span>Пиксели</span></div>
        <div><b>${formatKg(result.totalWeightKg)}</b><span>Вес</span></div>
        <div><b>${formatKw(powerKw)}</b><span>Макс. мощность</span></div>
        <div><b>${formatKw(startupKw)}</b><span>Пусковая мощность</span></div>
        <div><b>${hangingBars} / ${legs}</b><span>Hanging Bar / ноги</span></div>
        <div><b>${cables} шт</b><span>PowerCON–Schuko</span></div>
        <div><b>${escapeHtml(aspect)}</b><span>Соотношение</span></div>
      </div>`;
  }

  function renderAll(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll ? scope.querySelectorAll('.packit-quick-shell[data-packit-quick-target-kind="led"] [data-led-calculator].v4-led-constructor') : [];
    nodes.forEach(renderOne);
  }

  function schedule(root) {
    if (raf) return;
    const run = () => {
      raf = 0;
      renderAll(root || document);
    };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  function bindInteractions(root) {
    const scope = root || document;
    if (!scope.addEventListener || scope.__packitQuickLedSummaryRepairBound) return;
    scope.__packitQuickLedSummaryRepairBound = true;
    ['input', 'change', 'click', 'pointerup', 'pointercancel'].forEach(type => {
      scope.addEventListener(type, event => {
        const target = event.target;
        if (target && target.closest && target.closest('.packit-quick-shell[data-packit-quick-target-kind="led"]')) {
          schedule(document);
        }
      }, true);
    });
  }

  function init() {
    if (!document.body || document.body.__packitQuickLedSummaryRepair) return;
    document.body.__packitQuickLedSummaryRepair = true;
    bindInteractions(document);
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => Array.from(m.addedNodes || []).some(node => node.nodeType === 1 && (node.matches && node.matches('[data-led-calculator], .packit-quick-shell') || node.querySelector && node.querySelector('[data-led-calculator]'))))) {
        schedule(document);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    schedule(document);
    window.setTimeout(() => schedule(document), 120);
    window.setTimeout(() => schedule(document), 500);
    window.setTimeout(() => schedule(document), 1200);
  }

  ROOT.QuickLedSummaryRepair = { VERSION, init, renderAll };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
