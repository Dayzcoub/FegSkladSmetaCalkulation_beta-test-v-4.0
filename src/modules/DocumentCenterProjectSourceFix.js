(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'packitDocumentCenterSourceIdV1';

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    }[char]));
  }

  function canUseLocalStorage() {
    try { return typeof GLOBAL.localStorage !== 'undefined' && GLOBAL.localStorage; }
    catch (_) { return false; }
  }

  function getStoredSourceId() {
    if (!canUseLocalStorage()) return '';
    try { return GLOBAL.localStorage.getItem(STORAGE_KEY) || ''; }
    catch (_) { return ''; }
  }

  function setStoredSourceId(id) {
    if (!canUseLocalStorage()) return;
    try {
      if (id) GLOBAL.localStorage.setItem(STORAGE_KEY, id);
      else GLOBAL.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function draftStorage() { return ROOT.QuoteDraftStorage || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function docCenter() { return ROOT.DocumentCenter || null; }

  function normalizeQuote(quote) {
    if (ROOT.QuoteModel && ROOT.QuoteModel.createQuoteDraft) return ROOT.QuoteModel.createQuoteDraft(quote || {});
    return quote || {};
  }

  function sourceFromQuote(id, kind, title, quote, extra) {
    const q = normalizeQuote(quote || {});
    const project = q.project || {};
    const client = q.client || {};
    const venue = q.venue || {};
    return {
      id,
      kind,
      title: toText(title || project.name || 'Без названия'),
      clientName: toText(client.name || client.company || extra && extra.clientName) || 'клиент не указан',
      venueName: toText(venue.name || extra && extra.venueName),
      eventDate: toText(venue.date || extra && extra.eventDate),
      status: toText(q.status || extra && extra.status) || 'draft',
      sourceLabel: extra && extra.sourceLabel || '',
      quote: q
    };
  }

  function buildSources(options) {
    const sources = [];
    const draftStore = draftStorage();
    const projectStore = projectStorage();
    const activeDraft = draftStore && draftStore.loadActiveDraft ? draftStore.loadActiveDraft() : null;
    if (activeDraft) {
      sources.push(sourceFromQuote('draft:active', 'draft', 'Активный черновик', activeDraft, { sourceLabel: 'черновик' }));
    }

    const indexRows = projectStore && projectStore.listProjectIndex ? projectStore.listProjectIndex() : [];
    if (Array.isArray(indexRows)) {
      indexRows.forEach(row => {
        const projectId = toText(row && row.projectId || row && row.quoteId);
        if (!projectId) return;
        const id = `project:${projectId}`;
        if (sources.some(item => item.id === id)) return;
        sources.push({
          id,
          kind: 'project',
          projectId,
          title: toText(row.projectName) || 'Без названия',
          clientName: toText(row.clientName) || 'клиент не указан',
          venueName: toText(row.venueName),
          eventDate: toText(row.eventDate),
          status: toText(row.status) || 'draft',
          sourceLabel: 'проект из истории',
          quote: null
        });
      });
    }

    if (!sources.length && options && options.quote) {
      sources.push(sourceFromQuote('quote:provided', 'quote', 'Переданная смета', options.quote, { sourceLabel: 'текущий контекст' }));
    }

    if (!sources.length && docCenter() && docCenter().getActiveQuote) {
      sources.push(sourceFromQuote('quote:auto', 'quote', 'Авто-источник документов', docCenter().getActiveQuote(), { sourceLabel: 'автоматически' }));
    }

    return sources;
  }

  function loadSourceQuote(source) {
    if (!source) return normalizeQuote({});
    if (source.quote) return normalizeQuote(source.quote);
    if (source.kind === 'project' && source.projectId && projectStorage() && projectStorage().loadProject) {
      const full = projectStorage().loadProject(source.projectId);
      if (full && full.quote) return normalizeQuote(full.quote);
    }
    if (source.kind === 'draft' && draftStorage() && draftStorage().loadActiveDraft) {
      const draft = draftStorage().loadActiveDraft();
      if (draft) return normalizeQuote(draft);
    }
    return docCenter() && docCenter().getActiveQuote ? normalizeQuote(docCenter().getActiveQuote()) : normalizeQuote({});
  }

  function chooseSource(sources) {
    if (!sources.length) return null;
    const stored = getStoredSourceId();
    if (stored) {
      const found = sources.find(source => source.id === stored);
      if (found) return found;
    }
    const activeProjectId = projectStorage() && projectStorage().getActiveProjectId ? projectStorage().getActiveProjectId() : '';
    if (activeProjectId) {
      const found = sources.find(source => source.id === `project:${activeProjectId}`);
      if (found) return found;
    }
    return sources[0];
  }

  function renderSourcePanel(sources, selected) {
    const safeSelected = selected || sources[0] || {};
    return `
      <div class="v4-doc-source-panel">
        <div class="v4-doc-source-head">
          <div>
            <div class="v4-kicker">Источник документов</div>
            <h4>${escapeHtml(safeSelected.title || 'Документы проекта')}</h4>
            <p class="v4-muted">Документы формируются по выбранному проекту или активному черновику. Смена источника сразу пересобирает список документов ниже.</p>
          </div>
          <label class="v4-doc-source-select">
            <span>Проект / черновик</span>
            <select data-doc-source-select>
              ${sources.map(source => `<option value="${escapeHtml(source.id)}" ${source.id === safeSelected.id ? 'selected' : ''}>${escapeHtml(source.title)} · ${escapeHtml(source.clientName)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="v4-doc-source-meta">
          <span><b>${escapeHtml(safeSelected.clientName || '—')}</b><small>клиент</small></span>
          <span><b>${escapeHtml(safeSelected.venueName || '—')}</b><small>площадка</small></span>
          <span><b>${escapeHtml(safeSelected.eventDate || '—')}</b><small>дата</small></span>
          <span><b>${escapeHtml(safeSelected.status || 'draft')}</b><small>статус</small></span>
          <span><b>${escapeHtml(safeSelected.sourceLabel || safeSelected.kind || 'источник')}</b><small>тип источника</small></span>
        </div>
      </div>`;
  }

  function install() {
    const center = docCenter();
    if (!center || !center.renderDocumentCenter || center.__projectSourceWrapped) return false;
    const originalRender = center.renderDocumentCenter;

    center.renderDocumentCenter = function renderDocumentCenterWithSource(target, options) {
      const root = typeof target === 'string' ? document.getElementById(target) : target;
      if (!root) return null;
      const opts = options || {};
      const sources = buildSources(opts);
      const selected = chooseSource(sources);
      if (!selected) return originalRender.call(center, root, opts);
      selected.quote = loadSourceQuote(selected);
      setStoredSourceId(selected.id);

      root.innerHTML = `
        <div class="v4-doc-source-shell">
          ${renderSourcePanel(sources, selected)}
          <div class="v4-doc-source-inner" data-doc-source-inner></div>
        </div>`;

      const inner = root.querySelector('[data-doc-source-inner]');
      const renderOptions = Object.assign({}, opts, { quote: selected.quote });
      originalRender.call(center, inner, renderOptions);

      const select = root.querySelector('[data-doc-source-select]');
      if (select) {
        select.addEventListener('change', () => {
          setStoredSourceId(select.value || '');
          center.renderDocumentCenter(root, opts);
        });
      }

      if (inner) {
        inner.addEventListener('click', event => {
          const refresh = event.target && event.target.closest ? event.target.closest('[data-doc-action="refresh"]') : null;
          if (!refresh) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          center.renderDocumentCenter(root, opts);
        }, true);
      }

      return root;
    };

    center.__projectSourceWrapped = true;
    return true;
  }

  install();
})();
