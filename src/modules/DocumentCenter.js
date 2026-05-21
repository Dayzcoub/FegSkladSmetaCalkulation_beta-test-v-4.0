(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const DOCUMENT_CENTER_VERSION = '3.17.6';

  function documentBuilder() { return ROOT.QuoteDocumentBuilder || null; }
  function draftStorage() { return ROOT.QuoteDraftStorage || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function quoteModel() { return ROOT.QuoteModel || null; }
  function backendAdapter() { return ROOT.BackendSyncAdapter || null; }
  function auditLog() { return ROOT.ProjectAuditLog || null; }
  function templateEngine() { return ROOT.PdfTemplateEngine || null; }
  function currentRoleIsAdmin() {
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer' };
    const role = auth && auth.role || 'viewer';
    return ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) === 'admin' : role === 'admin';
  }

  function getActiveQuote() {
    const draft = draftStorage() && draftStorage().loadActiveDraft ? draftStorage().loadActiveDraft() : null;
    if (draft) return normalizeQuote(draft);
    const store = projectStorage();
    const projects = store && store.listProjectIndex ? store.listProjectIndex() : (store && store.listProjects ? store.listProjects() : []);
    const project = Array.isArray(projects) && projects[0] ? projects[0] : null;
    if (project && project.projectId && store && store.loadProject) {
      const full = store.loadProject(project.projectId);
      if (full && full.quote) return normalizeQuote(full.quote);
    }
    if (project && project.quote && !project.indexOnly) return normalizeQuote(project.quote);
    return normalizeQuote({});
  }

  function normalizeQuote(quote) {
    if (quoteModel() && quoteModel().normalizeQuote) return quoteModel().normalizeQuote(quote || {});
    if (quoteModel() && quoteModel().createQuoteDraft) return quoteModel().createQuoteDraft(quote || {});
    return quote || {};
  }

  function buildDocumentList(quote, options) {
    const q = normalizeQuote(quote || getActiveQuote());
    const builder = documentBuilder();
    const opts = options || {};
    if (opts.fastIndex === true) return buildFastDocumentIndex(q, opts);
    if (!builder || !builder.buildAllDocuments) return [];
    const docs = builder.buildAllDocuments(q) || [];
    const includeJson = opts.includeJson !== false;
    const unique = [];
    const seen = new Set();
    docs.forEach(doc => {
      const key = `${doc && doc.type || 'doc'}:${doc && doc.title || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(enrichDocument(doc, q, opts));
    });
    if (includeJson) {
      unique.push(enrichDocument(buildQuoteJsonDocument(q), q, opts));
      unique.push(enrichDocument(buildExportPackDocument(q), q, opts));
      unique.push(enrichDocument(buildBackendPayloadDocument(q), q, opts));
    }
    return unique;
  }

  function enrichDocument(doc, quote, options) {
    const d = doc || {};
    const opts = options || {};
    const extension = d.type === 'calendar-ics' ? 'ics' : d.extension || 'txt';
    const id = makeDocumentId(d);
    const shouldBuildText = opts.lazyText !== true;
    const shouldRenderTemplate = opts.renderTemplates !== false;
    const text = shouldBuildText ? documentToText(d) : '';
    const renderedTemplate = shouldRenderTemplate ? buildTemplate(d, quote) : null;
    const htmlFileName = renderedTemplate ? makeFileName(d, quote, 'html') : '';
    return {
      ...d,
      id,
      fileName: d.fileName || makeFileName(d, quote, extension),
      htmlFileName,
      extension,
      text,
      html: renderedTemplate && renderedTemplate.html || '',
      bodyHtml: renderedTemplate && renderedTemplate.bodyHtml || '',
      templateCss: renderedTemplate && renderedTemplate.css || '',
      hasHtmlTemplate: Boolean(renderedTemplate),
      templateDeferred: !shouldRenderTemplate,
      textDeferred: !shouldBuildText,
      size: shouldBuildText ? text.length : estimateDocumentSize(d),
      group: getDocumentGroup(d),
      groupLabel: getGroupLabel(getDocumentGroup(d)),
      label: getDocumentLabel(d),
      safeForClient: isClientSafe(d),
      generatedAt: d.generatedAt || nowIso()
    };
  }

  function materializeDocument(doc, quote, options) {
    const d = doc || {};
    const opts = options || {};
    const q = quote || getActiveQuote();
    if (d.deferBuild) {
      const fullDoc = buildFullDocumentByType(d, q);
      const enriched = enrichDocument(fullDoc, q, { lazyText: opts.text === false, renderTemplates: Boolean(opts.template) });
      Object.keys(enriched).forEach(key => { d[key] = enriched[key]; });
      d.deferBuild = false;
    }
    if (opts.text !== false && (d.textDeferred || !d.text)) {
      d.text = documentToText(d);
      d.textDeferred = false;
      d.size = d.text.length;
    }
    if (opts.template && (d.templateDeferred || !d.html)) {
      const renderedTemplate = buildTemplate(d, q);
      if (renderedTemplate) {
        d.html = renderedTemplate.html || '';
        d.bodyHtml = renderedTemplate.bodyHtml || '';
        d.templateCss = renderedTemplate.css || '';
        d.htmlFileName = d.htmlFileName || makeFileName(d, q, 'html');
        d.hasHtmlTemplate = true;
      }
      d.templateDeferred = false;
    }
    return d;
  }

  function estimateDocumentSize(doc) {
    const d = doc || {};
    const rows = Array.isArray(d.rows) ? d.rows.length : 0;
    const notes = Array.isArray(d.notes) ? d.notes.join(' ').length : 0;
    const base = String(d.title || d.type || '').length + String(d.projectName || '').length + notes + 320;
    return Math.max(0, base + rows * 120);
  }



  function buildFastDocumentIndex(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const docs = [];
    docs.push(makeDeferredDocument('customer-proposal', 'Коммерческое предложение клиенту', q));
    docs.push(makeDeferredDocument('technical-sheet', 'Технический лист проекта', q));
    docs.push(makeDeferredDocument('warehouse-all', 'Общий складской лист', q));
    getLikelySectionKeys(q).forEach(key => {
      docs.push(makeDeferredDocument(`warehouse-${key}`, getWarehouseTitle(key), q, { sectionKey: key }));
    });
    docs.push(makeDeferredDocument('reservation-plan', 'План резерва склада', q));
    docs.push(makeDeferredDocument('stock-movement-plan', 'План движения склада: резерв', q, { action: 'reserve' }));
    docs.push(makeDeferredDocument('warehouse-workflow', 'Складской workflow проекта', q));
    docs.push(makeDeferredDocument('subrent-plan', 'План субаренды', q));
    docs.push(makeDeferredDocument('calendar-draft', `FEG - ${q.project && q.project.name || 'Новый проект'}`, q));
    if (opts.includeJson) {
      docs.push(makeDeferredDocument('quote-json', 'JSON проекта', q, { extension: 'json', deferPayloadType: 'quote-json' }));
      docs.push(makeDeferredDocument('export-pack-json', 'Export pack JSON', q, { extension: 'json', deferPayloadType: 'export-pack-json' }));
      docs.push(makeDeferredDocument('backend-sync-payload-json', 'Backend sync payload JSON', q, { extension: 'json', deferPayloadType: 'backend-sync-payload-json' }));
    }
    const unique = [];
    const seen = new Set();
    docs.forEach(doc => {
      const enriched = enrichDocument(doc, q, { lazyText: true, renderTemplates: false });
      const key = enriched.id;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(enriched);
    });
    return unique;
  }

  function makeDeferredDocument(type, title, quote, extra) {
    const q = quote || {};
    return {
      type,
      title,
      extension: extra && extra.extension || (String(type).includes('json') ? 'json' : 'txt'),
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      eventDate: q.venue && q.venue.date || '',
      generatedAt: nowIso(),
      deferBuild: !(extra && extra.deferPayloadType),
      deferPayloadType: extra && extra.deferPayloadType || '',
      _quote: q,
      sectionKey: extra && extra.sectionKey || '',
      action: extra && extra.action || ''
    };
  }

  function getLikelySectionKeys(quote) {
    const sections = quote && quote.sections || {};
    const preferred = ['stage','truss','led','equipment','audio','light','services'];
    return preferred.filter(key => {
      const section = sections[key];
      if (!section) return false;
      if (section.enabled === false || section.selected === false) return false;
      if (Array.isArray(section.items) && section.items.length) return true;
      if (Array.isArray(section.bomRows) && section.bomRows.length) return true;
      if (Array.isArray(section.rows) && section.rows.length) return true;
      if (section.summary || section.result || section.configured || section.enabled) return true;
      return false;
    });
  }

  function getWarehouseTitle(sectionKey) {
    return {
      stage: 'Складской лист сцены',
      truss: 'Складской лист ферм',
      led: 'Складской лист LED',
      equipment: 'Звук / свет / услуги',
      audio: 'Складской лист звука',
      light: 'Складской лист света',
      services: 'Лист услуг'
    }[sectionKey] || `Складской лист: ${sectionKey}`;
  }

  function buildFullDocumentByType(doc, quote) {
    const builder = documentBuilder();
    const q = normalizeQuote(quote || doc && doc._quote || getActiveQuote());
    const type = String(doc && doc.type || 'document');
    if (type === 'quote-json') return buildQuoteJsonDocument(q);
    if (type === 'export-pack-json') return buildExportPackDocument(q);
    if (type === 'backend-sync-payload-json') return buildBackendPayloadDocument(q);
    if (!builder) return doc || {};
    if (type === 'customer-proposal' && builder.buildCustomerProposal) return builder.buildCustomerProposal(q);
    if (type === 'technical-sheet' && builder.buildTechnicalSheet) return builder.buildTechnicalSheet(q);
    if (type === 'reservation-plan' && builder.buildReservationSheet) return builder.buildReservationSheet(q);
    if (type === 'stock-movement-plan' && builder.buildStockMovementSheet) return builder.buildStockMovementSheet(q, doc && doc.action || 'reserve');
    if (type === 'warehouse-workflow' && builder.buildWarehouseWorkflowSheet) return builder.buildWarehouseWorkflowSheet(q);
    if (type === 'subrent-plan' && builder.buildSubrentSheet) return builder.buildSubrentSheet(q);
    if (type === 'calendar-draft' && builder.buildCalendarDraft) return builder.buildCalendarDraft(q);
    if (type === 'calendar-ics') return { ...buildCalendarDraft(q), type: 'calendar-ics', extension: 'ics', title: 'ICS календаря', icsContent: buildCalendarIcs(q) };
    if (type.startsWith('warehouse-') && builder.buildWarehouseSheet) {
      const key = type === 'warehouse-all' ? 'all' : type.replace(/^warehouse-/, '');
      return builder.buildWarehouseSheet(q, key);
    }
    return doc || {};
  }

  function buildTemplate(doc, quote) {
    const engine = templateEngine();
    if (!engine || !engine.canRender || !engine.renderDocument) return null;
    if (!engine.canRender(doc)) return null;
    try { return engine.renderDocument(doc, { quote }); }
    catch (error) { return null; }
  }

  function buildQuoteJsonDocument(quote) {
    const q = normalizeQuote(quote);
    return {
      type: 'quote-json',
      title: 'JSON проекта',
      extension: 'json',
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      eventDate: q.venue && q.venue.date || '',
      payload: q,
      generatedAt: nowIso()
    };
  }

  function buildExportPackDocument(quote) {
    const q = normalizeQuote(quote);
    return {
      type: 'export-pack-json',
      title: 'Export pack JSON',
      extension: 'json',
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      eventDate: q.venue && q.venue.date || '',
      payload: buildExportPack(q),
      generatedAt: nowIso()
    };
  }

  function buildBackendPayloadDocument(quote) {
    const q = normalizeQuote(quote);
    return {
      type: 'backend-sync-payload-json',
      title: 'Backend sync payload JSON',
      extension: 'json',
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      eventDate: q.venue && q.venue.date || '',
      payload: buildBackendSyncPayload(q),
      generatedAt: nowIso()
    };
  }

  function buildExportPack(quote) {
    const q = normalizeQuote(quote);
    const docs = buildDocumentList(q, { includeJson: false, renderTemplates: false });
    const textDocuments = {};
    docs.forEach(doc => { textDocuments[doc.id || doc.type] = doc.text || documentToText(doc); });
    return {
      type: 'feg-stage-pro-document-export-pack',
      version: DOCUMENT_CENTER_VERSION,
      exportedAt: nowIso(),
      quote: q,
      documents: docs.map(doc => sanitizeDocMeta(doc)),
      text_documents: textDocuments,
      calendar_ics: buildCalendarIcs(q),
      backend_sync_payload: buildBackendSyncPayload(q),
      audit_log: buildAuditLog(q)
    };
  }

  function buildBackendSyncPayload(quote) {
    if (backendAdapter() && backendAdapter().buildSyncPayload) return backendAdapter().buildSyncPayload(quote);
    return { mode: 'local', quote: normalizeQuote(quote), rows: {}, generatedAt: nowIso() };
  }

  function buildAuditLog(quote) {
    if (auditLog() && auditLog().exportAuditLog) return auditLog().exportAuditLog(quote);
    const q = normalizeQuote(quote);
    return q.history || [];
  }

  function buildCalendarIcs(quote) {
    if (documentBuilder() && documentBuilder().buildCalendarIcs) return documentBuilder().buildCalendarIcs(quote);
    return '';
  }

  function sanitizeDocMeta(doc) {
    const d = { ...doc };
    delete d.text;
    delete d.payload;
    return d;
  }

  function documentToText(doc) {
    if (!doc) return '';
    if (doc.deferPayloadType) {
      const payloadDoc = buildFullDocumentByType(doc, doc._quote || getActiveQuote());
      doc.payload = payloadDoc.payload;
      doc.deferPayloadType = '';
    }
    if (doc.extension === 'json' || doc.payload) return JSON.stringify(doc.payload || doc, null, 2);
    if (doc.type === 'calendar-ics' && doc.icsContent) return doc.icsContent;
    if (doc.icsContent && doc.type === 'calendar-draft') return doc.icsContent;
    if (documentBuilder() && documentBuilder().documentToText) return documentBuilder().documentToText(doc);
    return JSON.stringify(doc, null, 2);
  }

  function getDocumentGroup(doc) {
    const type = String(doc && doc.type || 'document');
    if (type === 'customer-proposal') return 'client';
    if (type === 'technical-sheet') return 'technical';
    if (type.startsWith('warehouse-') || type === 'reservation-plan' || type === 'stock-movement-plan') return 'warehouse';
    if (type === 'subrent-plan') return 'subrent';
    if (type === 'calendar-draft' || type === 'calendar-ics') return 'calendar';
    if (type.includes('json')) return 'json';
    return 'other';
  }

  function getGroupLabel(group) {
    return {
      client: 'Клиент',
      technical: 'Техлист',
      warehouse: 'Склад',
      subrent: 'Субаренда',
      calendar: 'Календарь',
      json: 'JSON / Sync',
      other: 'Прочее'
    }[group] || 'Документ';
  }

  function getDocumentLabel(doc) {
    const type = String(doc && doc.type || 'document');
    return {
      'customer-proposal': 'КП',
      'technical-sheet': 'Техлист',
      'warehouse-all': 'Склад',
      'reservation-plan': 'Резерв',
      'stock-movement-plan': 'Движение',
      'warehouse-workflow': 'Workflow',
      'subrent-plan': 'Субаренда',
      'calendar-draft': 'Календарь',
      'calendar-ics': 'ICS',
      'quote-json': 'Quote JSON',
      'export-pack-json': 'Export Pack',
      'backend-sync-payload-json': 'Sync Payload'
    }[type] || type;
  }

  function isClientSafe(doc) {
    const group = getDocumentGroup(doc);
    return group === 'client' || group === 'calendar';
  }

  function makeDocumentId(doc) {
    const raw = `${doc && doc.type || 'document'}-${doc && doc.title || ''}`;
    return slug(raw).slice(0, 72) || `doc-${Date.now()}`;
  }

  function makeFileName(doc, quote, extension) {
    const project = quote && quote.project && quote.project.name || 'project';
    const type = doc && doc.type || 'document';
    return `${slug(project)}_${slug(type)}.${extension || 'txt'}`;
  }

  function buildZipManifest(quote) {
    const q = normalizeQuote(quote || getActiveQuote());
    const docs = buildDocumentList(q, { includeJson: true, lazyText: true, renderTemplates: false, fastIndex: true });
    return {
      type: 'feg-stage-pro-document-manifest',
      version: DOCUMENT_CENTER_VERSION,
      generatedAt: nowIso(),
      project: {
        id: q.id,
        name: q.project && q.project.name || '',
        client: q.client && q.client.name || '',
        date: q.venue && q.venue.date || ''
      },
      files: docs.map(doc => ({ fileName: doc.fileName, type: doc.type, group: doc.group, bytes: doc.size, safeForClient: doc.safeForClient }))
    };
  }

  function renderDocumentCenter(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const state = {
      quote: normalizeQuote(options && options.quote || getActiveQuote()),
      filter: 'all',
      selectedId: '',
      docs: [],
      includeJson: false,
      previewMode: 'fast'
    };
    root._documentCenterState = state;
    root.innerHTML = `<div class="v4-card v4-document-center"><div class="v4-inline-loading"><b>Готовлю центр документов…</b><span>Быстрый режим: список документов без тяжёлых JSON/export pack и HTML-шаблонов. Полные файлы собираются по кнопке.</span></div></div>`;
    const build = () => {
      state.docs = buildDocumentList(state.quote, { includeJson: state.includeJson, lazyText: true, renderTemplates: false, fastIndex: true });
      state.selectedId = state.docs[0] && state.docs[0].id || '';
      if (state.selectedId) materializeDocument(state.docs[0], state.quote, { text: true, template: false });
      render(root, state);
      return root;
    };
    if (ROOT.BusyIndicator && ROOT.BusyIndicator.run) ROOT.BusyIndicator.run('Готовлю документы проекта…', build).catch(() => build());
    else setTimeout(build, 0);
    return root;
  }

  function render(root, state) {
    const isAdmin = currentRoleIsAdmin();
    if (!isAdmin && state.includeJson) state.includeJson = false;
    const docs = filterDocs(state.docs, state.filter);
    const selected = state.docs.find(doc => doc.id === state.selectedId) || docs[0] || state.docs[0] || null;
    if (selected) {
      state.selectedId = selected.id;
      materializeDocument(selected, state.quote, { text: true, template: state.previewMode === 'html' });
    }
    const totals = buildTotals(state.docs);
    root.innerHTML = `
      <div class="v4-card v4-document-center" data-document-center-version="${DOCUMENT_CENTER_VERSION}">
        <div class="v4-section-head">
          <div>
            <div class="v4-kicker">PDF Center & Documents Hub</div>
            <h3>Центр документов проекта</h3>
            <p class="v4-muted">Быстрый центр документов проекта: рабочие листы и клиентские документы доступны сразу. Служебные выгрузки видит только администратор.</p>
          </div>
          <div class="v4-doc-actions-top">
            <button type="button" class="btn-secondary" data-doc-action="refresh">Обновить</button>
            ${isAdmin ? `<button type="button" class="btn-secondary" data-doc-action="toggle-json">${state.includeJson ? 'Скрыть JSON' : 'Показать JSON'}</button>
            <button type="button" class="btn-secondary" data-doc-action="download-manifest">Manifest JSON</button>
            <button type="button" class="btn-secondary" data-doc-action="download-html-pack">HTML pack</button>
            <button type="button" class="btn-primary" data-doc-action="download-all">Скачать пакет</button>` : ''}
          </div>
        </div>
        <div class="v4-doc-stats">
          <span><b>${state.docs.length}</b><small>документов</small></span>
          <span><b>${totals.client}</b><small>клиентских</small></span>
          <span><b>${totals.warehouse}</b><small>складских</small></span>
          <span><b>${formatBytes(totals.bytes)}</b><small>текста</small></span>
          <span><b>${totals.html}</b><small>HTML-шаблонов</small></span>
        </div>
        <div class="v4-doc-filter-row">
          ${getVisibleFilterGroups(state).map(group => `<button type="button" class="${state.filter === group ? 'active' : ''}" data-doc-filter="${group}">${group === 'all' ? 'Все' : getGroupLabel(group)}</button>`).join('')}
        </div>
        <div class="v4-doc-layout">
          <div class="v4-doc-list" role="list">
            ${docs.length ? docs.map(doc => renderDocCard(doc, state.selectedId)).join('') : '<div class="v4-empty">Документы не найдены</div>'}
          </div>
          <div class="v4-doc-preview">
            ${selected ? renderPreview(selected) : '<div class="v4-empty">Выберите документ</div>'}
          </div>
        </div>
      </div>`;
    bind(root, state);
  }

  function renderDocCard(doc, selectedId) {
    return `
      <button type="button" class="v4-doc-card ${doc.id === selectedId ? 'active' : ''}" data-doc-id="${escapeHtml(doc.id)}">
        <span class="v4-doc-badge">${escapeHtml(doc.label)}</span>
        <b>${escapeHtml(doc.title || doc.type)}</b>
        <small>${escapeHtml(doc.groupLabel)} · ${escapeHtml(doc.fileName)} · ${formatBytes(doc.size)}</small>
      </button>`;
  }

  function renderPreview(doc) {
    return `
      <div class="v4-doc-preview-head">
        <div>
          <span class="v4-doc-badge">${escapeHtml(doc.label)}</span>
          <h4>${escapeHtml(doc.title || doc.type)}</h4>
          <small>${escapeHtml(doc.fileName)} · ${formatBytes(doc.size)} · ${doc.safeForClient ? 'клиентский' : 'внутренний'}</small>
        </div>
        <div class="v4-doc-actions">
          <button type="button" class="btn-secondary" data-doc-action="copy" data-doc-id="${escapeHtml(doc.id)}">Копировать</button>
          ${doc.hasHtmlTemplate ? `<button type="button" class="btn-secondary" data-doc-action="copy-html" data-doc-id="${escapeHtml(doc.id)}">HTML</button>` : ''}
          ${doc.templateDeferred ? `<button type="button" class="btn-secondary" data-doc-action="prepare-html" data-doc-id="${escapeHtml(doc.id)}">Подготовить HTML</button>` : ''}
          <button type="button" class="btn-secondary" data-doc-action="download" data-doc-id="${escapeHtml(doc.id)}">Скачать</button>
          ${doc.hasHtmlTemplate ? `<button type="button" class="btn-primary" data-doc-action="download-html" data-doc-id="${escapeHtml(doc.id)}">Скачать HTML</button>` : ''}
        </div>
      </div>
      ${doc.hasHtmlTemplate ? `<div class="v4-doc-template-preview"><style>${doc.templateCss || ''}</style>${doc.bodyHtml}</div>` : ''}
      <details class="v4-doc-raw-text" ${doc.hasHtmlTemplate ? '' : 'open'}>
        <summary>Текстовая версия${isPreviewTrimmed(doc.text) ? ' · предпросмотр обрезан' : ''}</summary>
        <pre class="v4-doc-text">${escapeHtml(previewText(doc.text || ''))}</pre>
      </details>`;
  }

  function bind(root, state) {
    const runBusy = (label, task, button) => {
      const busy = ROOT.BusyIndicator;
      if (busy && busy.setButtonBusy) busy.setButtonBusy(button, true, 'Жду…');
      const done = () => { if (busy && busy.setButtonBusy) busy.setButtonBusy(button, false); };
      if (busy && busy.run) return busy.run(label, task).then(result => { done(); return result; }).catch(err => { done(); throw err; });
      try { const result = task(); done(); return Promise.resolve(result); } catch (err) { done(); return Promise.reject(err); }
    };
    root.querySelectorAll('[data-doc-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.getAttribute('data-doc-filter') || 'all';
        const filtered = filterDocs(state.docs, state.filter);
        if (filtered.length && !filtered.find(doc => doc.id === state.selectedId)) state.selectedId = filtered[0].id;
        render(root, state);
      });
    });
    root.querySelectorAll('[data-doc-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-doc-action');
        const id = btn.getAttribute('data-doc-id');
        if (!action) {
          state.selectedId = id;
          render(root, state);
          return;
        }
        const doc = state.docs.find(item => item.id === id);
        if (!doc) return;
        if (action === 'prepare-html') {
          runBusy('Готовлю HTML-шаблон документа…', () => {
            materializeDocument(doc, state.quote, { text: true, template: true });
            state.previewMode = 'html';
            render(root, state);
          }, btn).catch(() => {});
          return;
        }
        if (action === 'copy') copyText(materializeDocument(doc, state.quote, { text: true, template: false }).text || '');
        if (action === 'copy-html') copyText(materializeDocument(doc, state.quote, { text: false, template: true }).html || '');
        if (action === 'download') downloadText(doc.fileName || 'document.txt', materializeDocument(doc, state.quote, { text: true, template: false }).text || '');
        if (action === 'download-html') downloadHtml(doc.htmlFileName || 'document.html', materializeDocument(doc, state.quote, { text: false, template: true }).html || '');
      });
    });
    root.querySelectorAll('[data-doc-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-doc-action');
        if (action === 'refresh') {
          runBusy('Обновляю документы проекта…', () => {
            state.quote = getActiveQuote();
            state.docs = buildDocumentList(state.quote, { includeJson: state.includeJson, lazyText: true, renderTemplates: false, fastIndex: true });
            state.selectedId = state.docs[0] && state.docs[0].id || '';
            state.previewMode = 'fast';
            render(root, state);
          }, btn).catch(() => {});
        }
        if (action !== 'refresh' && !currentRoleIsAdmin()) return;
        if (action === 'toggle-json') {
          runBusy(state.includeJson ? 'Скрываю JSON-документы…' : 'Готовлю JSON-документы…', () => {
            state.includeJson = !state.includeJson;
            if (!state.includeJson && state.filter === 'json') state.filter = 'all';
            state.docs = buildDocumentList(state.quote, { includeJson: state.includeJson, lazyText: true, renderTemplates: false, fastIndex: true });
            state.selectedId = state.docs[0] && state.docs[0].id || '';
            state.previewMode = 'fast';
            render(root, state);
          }, btn).catch(() => {});
        }
        if (action === 'download-manifest') runBusy('Готовлю manifest документов…', () => downloadText('feg_documents_manifest.json', JSON.stringify(buildZipManifest(state.quote), null, 2)), btn).catch(() => {});
        if (action === 'download-html-pack') runBusy('Готовлю HTML pack документов…', () => downloadText(makeFileName({ type: 'html-document-pack', title: 'HTML Document Pack' }, state.quote, 'json'), JSON.stringify(buildHtmlDocumentPack(state.quote), null, 2)), btn).catch(() => {});
        if (action === 'download-all') runBusy('Готовлю полный пакет документов…', () => downloadText(makeFileName({ type: 'document-pack', title: 'Document Pack' }, state.quote, 'json'), JSON.stringify(buildDocumentDownloadPack(state.quote), null, 2)), btn).catch(() => {});
      });
    });
  }

  function buildDocumentDownloadPack(quote) {
    const q = normalizeQuote(quote || getActiveQuote());
    const docs = buildDocumentList(q, { includeJson: true, renderTemplates: false });
    const files = {};
    docs.forEach(doc => { files[doc.fileName] = doc.text || ''; });
    files['manifest.json'] = JSON.stringify(buildZipManifest(q), null, 2);
    docs.filter(doc => doc.hasHtmlTemplate && doc.html).forEach(doc => { files[doc.htmlFileName] = doc.html || ''; });
    return {
      type: 'feg-stage-pro-document-download-pack',
      version: DOCUMENT_CENTER_VERSION,
      generatedAt: nowIso(),
      files
    };
  }


  function buildHtmlDocumentPack(quote) {
    const q = normalizeQuote(quote || getActiveQuote());
    const docs = buildDocumentList(q, { includeJson: false, renderTemplates: true }).filter(doc => doc.hasHtmlTemplate && doc.html);
    const files = {};
    docs.forEach(doc => { files[doc.htmlFileName] = doc.html; });
    return {
      type: 'feg-stage-pro-html-document-pack',
      version: DOCUMENT_CENTER_VERSION,
      generatedAt: nowIso(),
      files,
      manifest: docs.map(doc => ({ fileName: doc.htmlFileName, type: doc.type, title: doc.title, group: doc.group }))
    };
  }


  function getVisibleFilterGroups(state) {
    const groups = ['all','client','technical','warehouse','subrent','calendar'];
    if (state && state.includeJson) groups.push('json');
    return groups;
  }

  function previewText(text) {
    const value = String(text || '');
    const limit = 24000;
    if (value.length <= limit) return value;
    return `${value.slice(0, limit)}

… предпросмотр обрезан для скорости. Скачивание/копирование отдаёт полный документ.`;
  }

  function isPreviewTrimmed(text) {
    return String(text || '').length > 24000;
  }

  function filterDocs(docs, filter) {
    if (!filter || filter === 'all') return docs.slice();
    return docs.filter(doc => doc.group === filter);
  }

  function buildTotals(docs) {
    return (docs || []).reduce((acc, doc) => {
      acc.bytes += doc.size || 0;
      if (doc.safeForClient) acc.client += 1;
      if (doc.group === 'warehouse') acc.warehouse += 1;
      if (doc.hasHtmlTemplate) acc.html += 1;
      return acc;
    }, { bytes: 0, client: 0, warehouse: 0, html: 0 });
  }

  function downloadHtml(fileName, html) {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([html || ''], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    toast('HTML-документ скачан');
    return true;
  }

  function downloadText(fileName, text) {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    toast('Документ скачан');
    return true;
  }

  function copyText(text) {
    const value = String(text || '');
    if (GLOBAL.navigator && GLOBAL.navigator.clipboard && GLOBAL.navigator.clipboard.writeText) {
      GLOBAL.navigator.clipboard.writeText(value).then(() => toast('Документ скопирован')).catch(() => fallbackCopy(value));
      return true;
    }
    return fallbackCopy(value);
  }

  function fallbackCopy(text) {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); toast('Документ скопирован'); }
    catch (_) { toast('Не удалось скопировать'); }
    area.remove();
    return true;
  }

  function toast(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
  }

  function slug(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[ё]/g, 'e')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'document';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} Б`;
    if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} КБ`;
    return `${Math.round(n / 1024 / 102.4) / 10} МБ`;
  }

  function nowIso() { return new Date().toISOString(); }

  ROOT.DocumentCenter = {
    DOCUMENT_CENTER_VERSION,
    getActiveQuote,
    buildDocumentList,
    materializeDocument,
    buildExportPack,
    buildDocumentDownloadPack,
    buildHtmlDocumentPack,
    buildZipManifest,
    renderDocumentCenter,
    documentToText
  };
})();
