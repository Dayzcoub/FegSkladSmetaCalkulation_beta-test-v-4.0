(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STORAGE_KEY = 'fegQuoteProjectsV4';
  const ACTIVE_PROJECT_KEY = 'fegActiveQuoteProjectIdV4';
  const PROJECT_STORAGE_VERSION = 1;
  let memoryProjects = [];
  let memoryActiveProjectId = '';
  let rawCacheText = null;
  let rawCacheRows = null;
  let normalizedCacheRows = null;

  function quoteModel() {
    if (!ROOT.QuoteModel) throw new Error('QuoteModel is not available.');
    return ROOT.QuoteModel;
  }

  function draftStorage() {
    return ROOT.QuoteDraftStorage || null;
  }

  function canUseLocalStorage() {
    try { return typeof GLOBAL.localStorage !== 'undefined' && GLOBAL.localStorage; }
    catch (_) { return false; }
  }

  function readRawList() {
    if (!canUseLocalStorage()) return memoryProjects;
    try {
      const raw = GLOBAL.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      if (rawCacheText === raw && rawCacheRows) return rawCacheRows;
      const parsed = JSON.parse(raw);
      rawCacheText = raw;
      rawCacheRows = Array.isArray(parsed) ? parsed : [];
      normalizedCacheRows = null;
      return rawCacheRows;
    } catch (_) {
      return [];
    }
  }

  function writeRawList(list) {
    const safe = Array.isArray(list) ? list : [];
    if (!canUseLocalStorage()) {
      memoryProjects = safe.slice();
      rawCacheRows = memoryProjects;
      normalizedCacheRows = null;
      return safe;
    }
    const raw = JSON.stringify(safe);
    GLOBAL.localStorage.setItem(STORAGE_KEY, raw);
    rawCacheText = raw;
    rawCacheRows = safe;
    normalizedCacheRows = null;
    return safe;
  }

  function makeProjectId() {
    return `quote-project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function getActorSnapshot() {
    try {
      const provider = ROOT.AuthProvider || ROOT.DemoAuthProvider;
      const user = provider && provider.getCurrentUser ? provider.getCurrentUser() : null;
      return user ? { actorId: toText(user.id || user.userId), actorRole: toText(user.role), actorName: toText(user.name || user.email) } : {};
    } catch (_) { return {}; }
  }

  function makeHistoryEvent(type, payload) {
    const actor = getActorSnapshot();
    return {
      id: `history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      type: toText(type || 'project_updated'),
      at: new Date().toISOString(),
      payload: clone(Object.assign({}, actor, payload || {}))
    };
  }

  function appendHistory(quote, event) {
    const q = quoteModel().createQuoteDraft(quote || {});
    const history = Array.isArray(q.history) ? q.history.slice() : [];
    history.push(event);
    q.history = history.slice(-80);
    q.updatedAt = new Date().toISOString();
    return quoteModel().createQuoteDraft(q);
  }

  function normalizeProjectRecord(input) {
    const src = input || {};
    const model = quoteModel();
    const quote = model.createQuoteDraft(src.quote || src);
    const summary = model.summarizeQuote(quote);
    const projectId = toText(src.projectId || src.id) || makeProjectId();
    const savedAt = toText(src.savedAt) || new Date().toISOString();
    return {
      type: 'feg-stage-pro-quote-project',
      storageVersion: PROJECT_STORAGE_VERSION,
      projectId,
      quoteId: quote.id,
      workspaceId: quote.workspaceId,
      ownerId: quote.ownerId,
      status: quote.status,
      clientId: quote.client && quote.client.id || '',
      clientEmail: quote.client && quote.client.email || '',
      clientPhone: quote.client && (quote.client.phone || quote.client.contactPhone) || '',
      clientName: quote.client && quote.client.name || '',
      projectName: quote.project && quote.project.name || 'Без названия',
      venueName: quote.venue && quote.venue.name || '',
      venueAddress: quote.venue && quote.venue.address || '',
      eventDate: quote.venue && quote.venue.date || '',
      scope: clone(quote.scope || {}),
      totals: clone(summary.totals || quote.totals || {}),
      validation: model.validateQuote ? clone(model.validateQuote(quote)) : { ok: true, errors: [] },
      syncStatus: toText(src.syncStatus || quote.syncStatus || src.backendSync && src.backendSync.status || quote.backendSync && quote.backendSync.status) || 'local_only',
      backendSync: clone(src.backendSync || quote.backendSync || {}),
      quote,
      createdAt: toText(src.createdAt) || quote.createdAt || savedAt,
      updatedAt: new Date().toISOString(),
      savedAt
    };
  }

  function normalizeList(list) {
    if (list === rawCacheRows && normalizedCacheRows) return normalizedCacheRows.slice();
    const seen = new Set();
    const normalized = (Array.isArray(list) ? list : [])
      .map(row => normalizeProjectRecord(row))
      .filter(row => {
        if (seen.has(row.projectId)) return false;
        seen.add(row.projectId);
        return true;
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    if (list === rawCacheRows) normalizedCacheRows = normalized;
    return normalized.slice();
  }

  function listProjects(filters) {
    const opts = filters || {};
    let rows = normalizeList(readRawList());
    if (opts.status) rows = rows.filter(row => row.status === opts.status);
    if (opts.clientId) {
      const clientId = toText(opts.clientId).toLowerCase();
      rows = rows.filter(row => [row.clientId, row.clientEmail, row.clientPhone, row.clientName].join(' ').toLowerCase().includes(clientId));
    }
    if (opts.query) {
      const q = toText(opts.query).toLowerCase();
      rows = rows.filter(row => [row.clientId, row.clientEmail, row.clientPhone, row.clientName, row.projectName, row.venueName, row.venueAddress, row.eventDate]
        .join(' ')
        .toLowerCase()
        .includes(q));
    }
    return rows;
  }

  function saveProject(input) {
    const nextRecord = normalizeProjectRecord(input || {});
    const rows = listProjects();
    const index = rows.findIndex(row => row.projectId === nextRecord.projectId || row.quoteId === nextRecord.quoteId);
    const isUpdate = index >= 0;
    if (isUpdate) {
      nextRecord.projectId = rows[index].projectId;
      nextRecord.createdAt = rows[index].createdAt;
    }
    nextRecord.quote = appendHistory(nextRecord.quote, makeHistoryEvent(isUpdate ? 'project_saved' : 'project_created', {
      projectId: nextRecord.projectId,
      quoteId: nextRecord.quoteId,
      status: nextRecord.status,
      projectName: nextRecord.projectName,
      clientName: nextRecord.clientName
    }));
    const normalizedRecord = normalizeProjectRecord(nextRecord);
    if (isUpdate) rows[index] = normalizedRecord;
    else rows.unshift(normalizedRecord);
    writeRawList(normalizeList(rows));
    setActiveProjectId(normalizedRecord.projectId);
    return normalizedRecord;
  }

  function saveQuoteAsProject(quote) {
    return saveProject({ quote: quoteModel().createQuoteDraft(quote || {}) });
  }

  function saveActiveDraftAsProject() {
    const storage = draftStorage();
    const activeDraft = storage && storage.loadActiveDraft ? storage.loadActiveDraft() : null;
    if (!activeDraft) throw new Error('Нет активного черновика сметы для сохранения в проекты.');
    return saveQuoteAsProject(activeDraft);
  }

  function loadProject(projectId) {
    const id = toText(projectId);
    return listProjects().find(row => row.projectId === id || row.quoteId === id) || null;
  }

  function deleteProject(projectId) {
    const id = toText(projectId);
    const rows = listProjects().filter(row => row.projectId !== id && row.quoteId !== id);
    writeRawList(rows);
    if (getActiveProjectId() === id) setActiveProjectId(rows[0] ? rows[0].projectId : '');
    return rows;
  }

  function restoreProjectToDraft(projectId) {
    const record = loadProject(projectId);
    if (!record) throw new Error('Проект сметы не найден.');
    const quote = quoteModel().createQuoteDraft(record.quote);
    const storage = draftStorage();
    if (storage && storage.saveDraft) storage.saveDraft(quote);
    setActiveProjectId(record.projectId);
    return quote;
  }

  function duplicateProject(projectId) {
    const record = loadProject(projectId);
    if (!record) throw new Error('Проект сметы не найден.');
    const quote = quoteModel().createQuoteDraft({
      ...record.quote,
      id: '',
      status: 'draft',
      project: { ...(record.quote.project || {}), name: `${record.projectName || 'Проект'} — копия` },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return saveProject({ quote, projectId: makeProjectId() });
  }

  function updateProjectStatus(projectId, status, note) {
    const id = toText(projectId);
    const rows = listProjects();
    const index = rows.findIndex(row => row.projectId === id || row.quoteId === id);
    if (index < 0) throw new Error('Проект сметы не найден.');
    const record = rows[index];
    const previousStatus = record.status || record.quote && record.quote.status || 'draft';
    const normalized = quoteModel().createQuoteDraft({ status }).status;
    let quote = quoteModel().mergeQuotePatch(record.quote, { status: normalized });
    quote = appendHistory(quote, makeHistoryEvent('status_changed', {
      from: previousStatus,
      to: normalized,
      note: toText(note)
    }));
    const next = normalizeProjectRecord(Object.assign({}, record, {
      status: normalized,
      quote,
      updatedAt: new Date().toISOString(),
      savedAt: new Date().toISOString()
    }));
    rows[index] = next;
    writeRawList(normalizeList(rows));
    return next;
  }

  function updateProjectSyncMeta(projectId, patch) {
    const id = toText(projectId);
    const rows = listProjects();
    const index = rows.findIndex(row => row.projectId === id || row.quoteId === id);
    if (index < 0) throw new Error('Проект сметы не найден.');
    const record = rows[index];
    const meta = Object.assign({}, record.backendSync || record.quote && record.quote.backendSync || {}, patch || {}, { updatedAt: new Date().toISOString() });
    const quote = quoteModel().createQuoteDraft(Object.assign({}, record.quote || {}, {
      syncStatus: toText(meta.status || record.syncStatus || 'local_only'),
      backendSync: clone(meta)
    }));
    const next = normalizeProjectRecord(Object.assign({}, record, {
      syncStatus: toText(meta.status || record.syncStatus || 'local_only'),
      backendSync: clone(meta),
      quote,
      updatedAt: new Date().toISOString()
    }));
    rows[index] = next;
    writeRawList(normalizeList(rows));
    return next;
  }

  function getProjectTimeline(projectId) {
    const record = loadProject(projectId);
    if (!record) return [];
    const history = record.quote && Array.isArray(record.quote.history) ? record.quote.history : [];
    return history.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }

  function getStatusCounts() {
    return listProjects().reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { total: 0 });
  }

  function setActiveProjectId(id) {
    const value = toText(id);
    if (!canUseLocalStorage()) {
      memoryActiveProjectId = value;
      return value;
    }
    if (value) GLOBAL.localStorage.setItem(ACTIVE_PROJECT_KEY, value);
    else GLOBAL.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return value;
  }

  function getActiveProjectId() {
    if (!canUseLocalStorage()) return memoryActiveProjectId;
    try { return GLOBAL.localStorage.getItem(ACTIVE_PROJECT_KEY) || ''; }
    catch (_) { return ''; }
  }

  function clearProjects() {
    writeRawList([]);
    setActiveProjectId('');
  }

  ROOT.QuoteProjectStorage = {
    STORAGE_KEY,
    ACTIVE_PROJECT_KEY,
    PROJECT_STORAGE_VERSION,
    normalizeProjectRecord,
    listProjects,
    saveProject,
    saveQuoteAsProject,
    saveActiveDraftAsProject,
    loadProject,
    deleteProject,
    restoreProjectToDraft,
    duplicateProject,
    updateProjectStatus,
    updateProjectSyncMeta,
    getProjectTimeline,
    makeHistoryEvent,
    getStatusCounts,
    setActiveProjectId,
    getActiveProjectId,
    clearProjects
  };
})();
