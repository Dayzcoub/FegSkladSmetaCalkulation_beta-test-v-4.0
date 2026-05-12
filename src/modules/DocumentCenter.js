(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const DOCUMENT_CENTER_VERSION = '3.9.8';

  function documentBuilder() { return ROOT.QuoteDocumentBuilder || null; }
  function draftStorage() { return ROOT.QuoteDraftStorage || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function quoteModel() { return ROOT.QuoteModel || null; }
  function backendAdapter() { return ROOT.BackendSyncAdapter || null; }
  function auditLog() { return ROOT.ProjectAuditLog || null; }
  function templateEngine() { return ROOT.PdfTemplateEngine || null; }

  function getActiveQuote() {
    const draft = draftStorage() && draftStorage().loadActiveDraft ? draftStorage().loadActiveDraft() : null;
    if (draft) return normalizeQuote(draft);
    const projects = projectStorage() && projectStorage().listProjects ? projectStorage().listProjects() : [];
    const project = Array.isArray(projects) && projects[0] ? projects[0] : null;
    if (project && project.quote) return normalizeQuote(project.quote);
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
    if (!builder || !builder.buildAllDocuments) return [];
    const docs = builder.buildAllDocuments(q) || [];
    const includeJson = !options || options.includeJson !== false;
    const unique = [];
    const seen = new Set();
    docs.forEach(doc => {
      const key = `${doc && doc.type || 'doc'}:${doc && doc.title || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(enrichDocument(doc, q));
    });
    if (includeJson) {
      unique.push(enrichDocument(buildQuoteJsonDocument(q), q));
      unique.push(enrichDocument(buildExportPackDocument(q), q));
      unique.push(enrichDocument(buildBackendPayloadDocument(q), q));
    }
    return unique;
  }

  function enrichDocument(doc, quote) {
    const d = doc || {};
    const text = documentToText(d);
    const extension = d.type === 'calendar-ics' ? 'ics' : d.extension || 'txt';
    const id = makeDocumentId(d);
    const renderedTemplate = buildTemplate(d, quote);
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
      size: text.length,
      group: getDocumentGroup(d),
      groupLabel: getGroupLabel(getDocumentGroup(d)),
      label: getDocumentLabel(d),
      safeForClient: isClientSafe(d),
      generatedAt: d.generatedAt || nowIso()
    };
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
    const docs = buildDocumentList(q, { includeJson: false });
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
    const docs = buildDocumentList(q);
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
      docs: []
    };
    root._documentCenterState = state;
    root.innerHTML = `<div class="v4-card v4-document-center"><div class="v4-inline-loading"><b>Готовлю центр документов…</b><span>Собираю КП, техлист, складские листы и HTML-шаблоны. На больших проектах это может занять несколько секунд.</span></div></div>`;
    const build = () => {
      state.docs = buildDocumentList(state.quote);
      state.selectedId = state.docs[0] && state.docs[0].id || '';
      render(root, state);
      return root;
    };
    if (ROOT.BusyIndicator && ROOT.BusyIndicator.run) ROOT.BusyIndicator.run('Готовлю документы проекта…', build).catch(() => build());
    else setTimeout(build, 0);
    return root;
  }

  function render(root, state) {
    const docs = filterDocs(state.docs, state.filter);
    const selected = state.docs.find(doc => doc.id === state.selectedId) || docs[0] || state.docs[0] || null;
    if (selected) state.selectedId = selected.id;
    const totals = buildTotals(state.docs);
    root.innerHTML = `
      <div class="v4-card v4-document-center" data-document-center-version="${DOCUMENT_CENTER_VERSION}">
        <div class="v4-section-head">
          <div>
            <div class="v4-kicker">PDF Center & Documents Hub</div>
            <h3>Центр документов проекта</h3>
            <p class="v4-muted">Все документы проекта в одном месте: КП, техлист, склад, резерв, субаренда, календарь, export pack и backend payload.</p>
          </div>
          <div class="v4-doc-actions-top">
            <button type="button" class="btn-secondary" data-doc-action="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-doc-action="download-manifest">Manifest JSON</button>
            <button type="button" class="btn-secondary" data-doc-action="download-html-pack">HTML pack</button>
            <button type="button" class="btn-primary" data-doc-action="download-all">Скачать пакет</button>
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
          ${['all','client','technical','warehouse','subrent','calendar','json'].map(group => `<button type="button" class="${state.filter === group ? 'active' : ''}" data-doc-filter="${group}">${group === 'all' ? 'Все' : getGroupLabel(group)}</button>`).join('')}
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
          <button type="button" class="btn-secondary" data-doc-action="download" data-doc-id="${escapeHtml(doc.id)}">Скачать</button>
          ${doc.hasHtmlTemplate ? `<button type="button" class="btn-primary" data-doc-action="download-html" data-doc-id="${escapeHtml(doc.id)}">Скачать HTML</button>` : ''}
        </div>
      </div>
      ${doc.hasHtmlTemplate ? `<div class="v4-doc-template-preview"><style>${doc.templateCss || ''}</style>${doc.bodyHtml}</div>` : ''}
      <details class="v4-doc-raw-text" ${doc.hasHtmlTemplate ? '' : 'open'}>
        <summary>Текстовая версия</summary>
        <pre class="v4-doc-text">${escapeHtml(doc.text || '')}</pre>
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
        if (action === 'copy') copyText(doc && doc.text || '');
        if (action === 'copy-html') copyText(doc && doc.html || '');
        if (action === 'download') downloadText(doc && doc.fileName || 'document.txt', doc && doc.text || '');
        if (action === 'download-html') downloadHtml(doc && doc.htmlFileName || 'document.html', doc && doc.html || '');
      });
    });
    root.querySelectorAll('[data-doc-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-doc-action');
        if (action === 'refresh') {
          runBusy('Обновляю документы проекта…', () => {
            state.quote = getActiveQuote();
            state.docs = buildDocumentList(state.quote);
            state.selectedId = state.docs[0] && state.docs[0].id || '';
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
    const docs = buildDocumentList(q);
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
    const docs = buildDocumentList(q).filter(doc => doc.hasHtmlTemplate && doc.html);
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
    buildExportPack,
    buildDocumentDownloadPack,
    buildHtmlDocumentPack,
    buildZipManifest,
    renderDocumentCenter,
    documentToText
  };
})();
