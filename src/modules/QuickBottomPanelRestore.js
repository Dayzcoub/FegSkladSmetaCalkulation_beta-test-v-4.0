// PACK.IT — quick bottom panel restore.
// Visual/DOM placement only: restores the existing quick docs + BOM inspector UI under target bottom tabs.
(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const VERSION = '1.2.0-quick-bottom-panel-restore';
  let raf = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function closestPage(shell) {
    return shell && shell.closest ? (shell.closest('.packit-page') || shell.closest('.packit-shell') || document) : document;
  }

  function ensureQuickRoot(page) {
    if (!page) return null;
    if (!page._packitBottomQuickRoot) page._packitBottomQuickRoot = document.createElement('div');
    return page._packitBottomQuickRoot;
  }

  function copySectionsFromPage(page, quickRoot) {
    if (!page || !quickRoot) return quickRoot;
    const roots = [page._quickRoot, page._packitBottomQuickRoot].filter(Boolean);
    roots.forEach(src => {
      ['Stage', 'Truss', 'Led'].forEach(key => {
        const sectionKey = `_quick${key}Section`;
        const inputKey = `_quick${key}Input`;
        if (src && src[sectionKey]) quickRoot[sectionKey] = src[sectionKey];
        if (src && src[inputKey]) quickRoot[inputKey] = src[inputKey];
      });
    });
    return quickRoot;
  }

  function renderDocs(docsMount, page) {
    if (!docsMount || docsMount.dataset.packitQuickDocsRestored === 'true') return;
    docsMount.dataset.packitQuickDocsRestored = 'true';
    docsMount.innerHTML = `
      <div class="v4-quick-docs" data-v4-quick-docs>
        <div class="v4-kicker">No-price sheets</div>
        <h4>Техлисты сцены и ферм из shared BOM</h4>
        <p class="v4-muted">Быстрый экспорт без клиентов, цен и КП. Общий BOM теперь открывается вручную, чтобы сцена/фермы/LED не зависали от постоянной диагностики.</p>
        <div class="v4-doc-actions">
          <button type="button" class="btn-secondary" data-v4-quick-doc="stage:tech">Сцена · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="stage:warehouse">Сцена · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="truss:tech">Фермы · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="truss:warehouse">Фермы · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="led:tech">LED · техлист</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="led:warehouse">LED · склад</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:tech">Общий техлист v4</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:warehouse">Общий склад v4</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:json">Unified JSON</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc="unified:contract">BOM contract</button>
          <button type="button" class="btn-primary" data-v4-quick-draft>В черновик сметы v4</button>
        </div>
        <pre class="v4-quick-doc-output" data-v4-quick-doc-output>Выбери лист, чтобы увидеть текст для копирования или скачивания.</pre>
        <div class="v4-doc-actions">
          <button type="button" class="btn-secondary" data-v4-quick-doc-copy disabled>Копировать</button>
          <button type="button" class="btn-secondary" data-v4-quick-doc-download disabled>Скачать .txt</button>
        </div>
      </div>`;

    const quickRoot = ensureQuickRoot(page);
    quickRoot._v4QuickDocText = '';
    quickRoot._v4QuickDocName = 'quick-sheet.txt';
    quickRoot.querySelector = selector => docsMount.querySelector(selector) || (page && page.querySelector ? page.querySelector(selector) : null);
    quickRoot.querySelectorAll = selector => docsMount.querySelectorAll(selector);

    docsMount.querySelectorAll('[data-v4-quick-doc]').forEach(btn => btn.addEventListener('click', () => {
      const QC = ROOT.QuickCalculators;
      if (!QC || !QC.renderQuickDoc) return;
      copySectionsFromPage(page, quickRoot);
      QC.renderQuickDoc(quickRoot, btn.getAttribute('data-v4-quick-doc'));
    }));

    const draftBtn = docsMount.querySelector('[data-v4-quick-draft]');
    if (draftBtn) draftBtn.addEventListener('click', () => {
      const QC = ROOT.QuickCalculators;
      if (!QC || !QC.saveQuickQuoteDraft) return;
      copySectionsFromPage(page, quickRoot);
      QC.saveQuickQuoteDraft(quickRoot);
    });

    const copyBtn = docsMount.querySelector('[data-v4-quick-doc-copy]');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const text = quickRoot._v4QuickDocText || '';
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    });

    const downloadBtn = docsMount.querySelector('[data-v4-quick-doc-download]');
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
      const text = quickRoot._v4QuickDocText || '';
      if (!text) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = quickRoot._v4QuickDocName || 'quick-sheet.txt';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
    });
  }

  function renderBom(bomMount, page) {
    if (!bomMount || bomMount.dataset.packitQuickBomRestored === 'true') return;
    bomMount.dataset.packitQuickBomRestored = 'true';
    bomMount.innerHTML = `<div data-v4-bom-inspector></div>`;
    const slot = bomMount.querySelector('[data-v4-bom-inspector]');
    const quickRoot = ensureQuickRoot(page);
    quickRoot.querySelector = selector => {
      if (selector === '[data-v4-bom-inspector]') return slot;
      return (page && page.querySelector ? page.querySelector(selector) : null);
    };
    const QC = ROOT.QuickCalculators;
    if (QC && QC.renderQuickBomInspectorPlaceholder) QC.renderQuickBomInspectorPlaceholder(quickRoot);
  }

  function placeBottom(shell) {
    if (!shell || !shell.querySelector) return;
    const tabs = shell.querySelector(':scope > .packit-quick-target-bottom-tabs');
    const bottom = shell.querySelector(':scope > .packit-quick-bottom');
    if (!tabs || !bottom) return;
    if (bottom.previousElementSibling !== tabs) tabs.insertAdjacentElement('afterend', bottom);

    const page = closestPage(shell);
    const docsMount = bottom.querySelector('#v4QuickDocsMount') || bottom.querySelector('[data-v4-quick-docs]') && bottom;
    const bomMount = bottom.querySelector('#v4QuickBomMount') || bottom.querySelector('[data-v4-bom-inspector]') && bottom;
    renderDocs(docsMount, page);
    renderBom(bomMount, page);
    bottom.removeAttribute('data-packit-restored-bottom-empty');
  }

  function restoreAll(root) {
    const scope = root || document;
    const shells = scope.querySelectorAll ? scope.querySelectorAll('.packit-shell[data-v4-active-section="quick"] .packit-quick-shell') : [];
    shells.forEach(placeBottom);
  }

  function schedule(root) {
    if (raf) return;
    const run = () => {
      raf = 0;
      restoreAll(root || document);
    };
    raf = window.requestAnimationFrame ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  function init() {
    if (!document.body || document.body.__packitQuickBottomPanelRestore) return;
    document.body.__packitQuickBottomPanelRestore = true;
    const observer = new MutationObserver(() => schedule(document));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-v4-active-section', 'data-packit-quick-target-kind'] });
    document.addEventListener('click', event => {
      if (event.target && event.target.closest && event.target.closest('.packit-quick-tab,[data-packit-quick-target-action]')) {
        window.setTimeout(() => schedule(document), 0);
      }
    }, true);
    schedule(document);
    window.setTimeout(() => schedule(document), 120);
    window.setTimeout(() => schedule(document), 500);
    window.setTimeout(() => schedule(document), 1200);
  }

  ROOT.QuickBottomPanelRestore = { VERSION, init, restoreAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
