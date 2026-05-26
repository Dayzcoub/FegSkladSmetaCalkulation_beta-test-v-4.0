// PACK.IT — quick LED rail placement helper.
// DOM-only visual helper: groups params and LED side panels into one left control rail.
(function(){
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.1.0-quick-led-rail-placement';
  let raf = 0;

  function getDirectParams(calc){
    return calc.querySelector(':scope > .v4-grid-3') || calc.querySelector(':scope > .packit-led-control-rail > .v4-grid-3');
  }

  function ensureRail(calc, params){
    let rail = calc.querySelector(':scope > .packit-led-control-rail');
    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'packit-led-control-rail';
      rail.setAttribute('data-packit-led-control-rail','true');
      calc.insertBefore(rail, params);
    }
    return rail;
  }

  function placeRail(root){
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-quick-shell[data-packit-quick-target-kind="led"]') : [];
    shells.forEach(shell => {
      const calc = shell.querySelector('[data-led-calculator].v4-led-constructor');
      if (!calc) return;
      const params = getDirectParams(calc);
      const side = calc.querySelector('.v4-led-side-panel');
      if (!params || !side) return;
      const rail = ensureRail(calc, params);
      if (params.parentElement !== rail) rail.appendChild(params);
      if (side.parentElement !== rail) {
        side.setAttribute('data-packit-led-rail-placement','left-rail');
        rail.appendChild(side);
      }
    });
  }

  function schedule(root){
    if (raf) return;
    const run = function(){ raf = 0; placeRail(root || document); };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  function init(){
    if (!document.body || document.body.__packitQuickLedRailPlacement) return;
    document.body.__packitQuickLedRailPlacement = true;
    const observer = new MutationObserver(function(){ schedule(document); });
    observer.observe(document.body, { childList:true, subtree:true });
    schedule(document);
    window.setTimeout(function(){ schedule(document); }, 120);
  }

  ROOT.QuickLedRailPlacement = { VERSION: VERSION, init: init, placeRail: placeRail };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
