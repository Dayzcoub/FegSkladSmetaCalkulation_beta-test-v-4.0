(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function getAssets() { return ROOT.PackitAssetManifest || null; }

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

  function installDocumentSourceSelector() {
    const center = ROOT.DocumentCenter;
    if (!center || !center.renderDocumentCenter || center.__projectSourceWrapped) return;
    const original = center.renderDocumentCenter;
    center.renderDocumentCenter = function wrappedDocumentCenter(target, options) {
      const root = typeof target === 'string' ? GLOBAL.document.getElementById(target) : target;
      if (!root) return null;
      const opts = options || {};
      const sources = buildDocumentSources(opts);
      const selected = chooseDocumentSource(sources);
      if (!selected) return original.call(center, root, opts);
      selected.quote = loadSourceQuote(selected);
      storeDocumentSourceId(selected.id);
      root.innerHTML = '<div class="v4-doc-source-shell">' + renderDocumentSourcePanel(sources, selected) + '<div class="v4-doc-source-inner" data-doc-source-inner></div></div>';
      const inner = root.querySelector('[data-doc-source-inner]');
      original.call(center, inner, Object.assign({}, opts, { quote: selected.quote }));
      const select = root.querySelector('[data-doc-source-select]');
      if (select) select.addEventListener('change', () => { storeDocumentSourceId(select.value || ''); center.renderDocumentCenter(root, opts); });
      return root;
    };
    center.__projectSourceWrapped = true;
  }

  function buildDocumentSources(options) {
    const list = [];
    const draftStore = ROOT.QuoteDraftStorage;
    const projectStore = ROOT.QuoteProjectStorage;
    const draft = draftStore && draftStore.loadActiveDraft ? draftStore.loadActiveDraft() : null;
    if (draft) list.push(sourceFromQuote('draft:active', 'Активный черновик', 'черновик', draft));
    const projects = projectStore && projectStore.listProjectIndex ? projectStore.listProjectIndex() : [];
    if (Array.isArray(projects)) projects.forEach(row => {
      const projectId = text(row && (row.projectId || row.quoteId));
      if (!projectId) return;
      list.push({
        id: 'project:' + projectId,
        projectId,
        title: text(row.projectName) || 'Без названия',
        clientName: text(row.clientName) || 'клиент не указан',
        venueName: text(row.venueName),
        eventDate: text(row.eventDate),
        status: text(row.status) || 'draft',
        sourceLabel: 'проект из истории',
        quote: null
      });
    });
    if (!list.length && options && options.quote) list.push(sourceFromQuote('quote:provided', 'Переданная смета', 'текущий контекст', options.quote));
    if (!list.length && ROOT.DocumentCenter && ROOT.DocumentCenter.getActiveQuote) list.push(sourceFromQuote('quote:auto', 'Авто-источник документов', 'автоматически', ROOT.DocumentCenter.getActiveQuote()));
    return list;
  }

  function sourceFromQuote(id, title, label, quote) {
    const q = normalizeQuote(quote || {});
    return {
      id,
      title: text(q.project && q.project.name) || title || 'Без названия',
      clientName: text(q.client && (q.client.name || q.client.company)) || 'клиент не указан',
      venueName: text(q.venue && q.venue.name),
      eventDate: text(q.venue && q.venue.date),
      status: text(q.status) || 'draft',
      sourceLabel: label || 'источник',
      quote: q
    };
  }

  function chooseDocumentSource(sources) {
    if (!sources.length) return null;
    const stored = readDocumentSourceId();
    if (stored) {
      const found = sources.find(item => item.id === stored);
      if (found) return found;
    }
    const projectStore = ROOT.QuoteProjectStorage;
    const activeId = projectStore && projectStore.getActiveProjectId ? projectStore.getActiveProjectId() : '';
    if (activeId) {
      const found = sources.find(item => item.id === 'project:' + activeId);
      if (found) return found;
    }
    return sources[0];
  }

  function loadSourceQuote(source) {
    if (!source) return normalizeQuote({});
    if (source.quote) return normalizeQuote(source.quote);
    const store = ROOT.QuoteProjectStorage;
    if (source.projectId && store && store.loadProject) {
      const full = store.loadProject(source.projectId);
      if (full && full.quote) return normalizeQuote(full.quote);
    }
    return ROOT.DocumentCenter && ROOT.DocumentCenter.getActiveQuote ? normalizeQuote(ROOT.DocumentCenter.getActiveQuote()) : normalizeQuote({});
  }

  function renderDocumentSourcePanel(sources, selected) {
    return '<div class="v4-doc-source-panel"><div class="v4-doc-source-head"><div><div class="v4-kicker">Источник документов</div><h4>Выбранный проект: ' + escapeHtml(selected.title || 'Без названия') + '</h4><p class="v4-muted">Документы ниже собраны из этого проекта/черновика.</p></div><label class="v4-doc-source-select"><span>Проект / черновик</span><select data-doc-source-select>' + sources.map(source => '<option value="' + escapeAttr(source.id) + '"' + (source.id === selected.id ? ' selected' : '') + '>' + escapeHtml(source.title) + ' · ' + escapeHtml(source.clientName) + '</option>').join('') + '</select></label></div><div class="v4-doc-source-meta"><span><b>' + escapeHtml(selected.clientName || '—') + '</b><small>клиент</small></span><span><b>' + escapeHtml(selected.venueName || '—') + '</b><small>площадка</small></span><span><b>' + escapeHtml(selected.eventDate || '—') + '</b><small>дата</small></span><span><b>' + escapeHtml(selected.status || 'draft') + '</b><small>статус</small></span><span><b>' + escapeHtml(selected.sourceLabel || 'источник') + '</b><small>тип источника</small></span></div></div>';
  }

  function readDocumentSourceId() {
    try { return GLOBAL.localStorage ? GLOBAL.localStorage.getItem('packitDocumentCenterSourceIdV1') || '' : ''; }
    catch (_) { return ''; }
  }

  function storeDocumentSourceId(id) {
    try {
      if (!GLOBAL.localStorage) return;
      if (id) GLOBAL.localStorage.setItem('packitDocumentCenterSourceIdV1', id);
      else GLOBAL.localStorage.removeItem('packitDocumentCenterSourceIdV1');
    } catch (_) {}
  }

  function normalizeQuote(quote) {
    return ROOT.QuoteModel && ROOT.QuoteModel.createQuoteDraft ? ROOT.QuoteModel.createQuoteDraft(quote || {}) : (quote || {});
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
          installDocumentSourceSelector();
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
      installDocumentSourceSelector();
      if (count >= 20) GLOBAL.clearInterval(timer);
    }, 250);
  }

  function init() {
    applyShellBranding(GLOBAL.document);
    installDocumentSourceSelector();
    observeShell();
    startRetryPass();
  }

  function text(value) { return String(value == null ? '' : value).trim(); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
  function escapeAttr(value) { return escapeHtml(value); }

  ROOT.PackitShellBranding = { version: '1.4.1', applyShellBranding, installDocumentSourceSelector, init };

  if (GLOBAL.document) {
    if (GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
