(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function getAssets() {
    return ROOT.PackitAssetManifest || null;
  }

  function resolveSymbol() {
    const assets = getAssets();
    if (!assets || !assets.resolve) return '';
    return assets.resolve('brand.symbol', { theme: 'dark' }) || '';
  }

  function applyShellBranding(root) {
    const scope = root || GLOBAL.document;
    if (!scope || !scope.querySelectorAll) return;

    const symbolSrc = resolveSymbol();
    if (!symbolSrc) return;

    scope.querySelectorAll('.packit-nav-logo').forEach(logo => {
      if (!logo) return;
      const currentImg = logo.querySelector && logo.querySelector('img.packit-nav-logo-symbol');
      if (logo.dataset.packitBrandSafe === symbolSrc && currentImg) return;

      logo.classList.remove('packit-nav-logo--asset-lockup');
      logo.classList.add('packit-nav-logo--safe-lockup');
      logo.setAttribute('aria-label', 'PACK.IT / ПАК.ИТ');
      logo.innerHTML = [
        '<span class="packit-nav-logo-mark packit-nav-logo-mark--asset" aria-hidden="true">',
          '<img class="packit-nav-logo-symbol" src="' + escapeAttr(symbolSrc) + '" alt="" loading="eager">',
        '</span>',
        '<span class="packit-nav-logo-text">',
          '<span class="packit-nav-logo-name">PACK.IT</span>',
          '<span class="packit-nav-logo-sub">Stage PRO</span>',
        '</span>'
      ].join('');
      logo.dataset.packitBrandSafe = symbolSrc;
    });
  }

  function observeShell() {
    if (!GLOBAL.document || !GLOBAL.MutationObserver) return;
    const body = GLOBAL.document.body;
    if (!body || body.dataset.packitBrandObserver === '1') return;
    body.dataset.packitBrandObserver = '1';

    const observer = new GLOBAL.MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length) {
          applyShellBranding(GLOBAL.document);
          break;
        }
      }
    });

    observer.observe(body, { childList: true, subtree: true });
  }

  function startRetryPass() {
    let count = 0;
    const timer = GLOBAL.setInterval(() => {
      count += 1;
      applyShellBranding(GLOBAL.document);
      if (count >= 20) GLOBAL.clearInterval(timer);
    }, 250);
  }

  function init() {
    applyShellBranding(GLOBAL.document);
    observeShell();
    startRetryPass();
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  }

  ROOT.PackitShellBranding = {
    version: '1.3.0',
    applyShellBranding,
    init,
  };

  if (GLOBAL.document) {
    if (GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
