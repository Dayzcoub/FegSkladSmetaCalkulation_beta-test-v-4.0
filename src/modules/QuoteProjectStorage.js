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

  function hydrateQuoteForProject(quote, source, options) {
    const opts = options || {};
    if (!opts.forceRebuild && !opts.rebuildMissing && !opts.rebuildMissingBom && !opts.forceHydrateBom) {
      return quoteModel().createQuoteDraft(quote || {});
    }
    if (ROOT.V4QuoteDraftHydrator && ROOT.V4QuoteDraftHydrator.hydrateDraft) {
      try {
        return ROOT.V4QuoteDraftHydrator.hydrateDraft(quote, Object.assign({ source: source || 'quote-project-storage', rebuildMissing: opts.rebuildMissing === true || opts.rebuildMissingBom === true }, opts));
      } catch (err) {
        try { if (console && console.warn) console.warn('[FEG] V4 project BOM hydrate skipped', err); } catch (_) {}
      }
    }
    return quoteModel().createQuoteDraft(quote || {});
  }

  function summarizeProjectBom(quote) {
    if (ROOT.V4QuoteDraftHydrator && ROOT.V4QuoteDraftHydrator.summarizeMount) {
      return ROOT.V4QuoteDraftHydrator.summarizeMount(quote && quote.v4Bom);
    }
    const mount = quote && quote.v4Bom || {};
    const counts = mount.rowCounts || {};
    const totals = mount.totals || {};
    return {
      version: toText(mount.version || ''),
      sharedBom: Math.max(0, Number(counts.sharedBom || 0)),
      quoteItems: Math.max(0, Number(counts.quoteItems || 0)),
      warehouse: Math.max(0, Number(counts.warehouse || 0)),
      weightKg: Math.max(0, Number(totals.weightKg || 0)),
      powerW: Math.max(0, Number(totals.powerW || 0)),
      ok: mount.checks ? Boolean(mount.checks.ok) : false
    };
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
    const quote = hydrateQuoteForProject(model.createQuoteDraft(src.quote || src), 'quote-project-storage-normalize', { rebuildMissing:false });
    const summary = model.summarizeQuote(quote);
    const v4BomSummary = summarizeProjectBom(quote);
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
      v4BomSummary: clone(v4BomSummary),
      v4BomReady: Boolean(v4BomSummary && v4BomSummary.sharedBom > 0),
      backendSync: clone(src.backendSync || quote.backendSync || {}),
      quote,
      createdAt: toText(src.createdAt) || quote.createdAt || savedAt,
      updatedAt: new Date().toISOString(),
      savedAt
    };
  }


  function getQuoteSource(input) {
    const src = input || {};
    return src.quote && typeof src.quote === 'object' ? src.quote : src;
  }

  function getRawProjectKey(row) {
    const ids = rawProjectIds(row);
    return ids.projectId || ids.quoteId || '';
  }

  function createProjectIndexRecord(input) {
    const src = input || {};
    const quote = getQuoteSource(src) || {};
    const client = quote.client || src.client || {};
    const project = quote.project || src.project || {};
    const venue = quote.venue || src.venue || {};
    const projectId = toText(src.projectId || src.id || quote.projectId || quote.project_id || quote.id) || makeProjectId();
    const quoteId = toText(src.quoteId || quote.id || src.id || '');
    const totals = src.totals || quote.totals || {};
    const v4BomSummary = src.v4BomSummary || summarizeProjectBom(quote);
    const backendSync = src.backendSync || quote.backendSync || {};
    const validation = src.validation || quote.validation || { ok: true, errors: [] };
    const history = Array.isArray(quote.history) ? quote.history.slice(-8) : [];
    const savedAt = toText(src.savedAt || quote.savedAt || src.updatedAt || quote.updatedAt || src.createdAt || quote.createdAt) || new Date().toISOString();
    const updatedAt = toText(src.updatedAt || quote.updatedAt || savedAt) || savedAt;
    return {
      type: 'feg-stage-pro-quote-project-index',
      storageVersion: PROJECT_STORAGE_VERSION,
      projectId,
      quoteId,
      workspaceId: toText(src.workspaceId || quote.workspaceId),
      ownerId: toText(src.ownerId || quote.ownerId),
      status: toText(src.status || quote.status) || 'draft',
      clientId: toText(src.clientId || client.id || client.clientId),
      clientEmail: toText(src.clientEmail || client.email),
      clientPhone: toText(src.clientPhone || client.phone || client.contactPhone),
      clientName: toText(src.clientName || client.name || client.company) || 'клиент не указан',
      projectName: toText(src.projectName || project.name) || 'Без названия',
      venueName: toText(src.venueName || venue.name),
      venueAddress: toText(src.venueAddress || venue.address),
      eventDate: toText(src.eventDate || venue.date),
      scope: clone(src.scope || quote.scope || {}),
      totals: clone(totals || {}),
      validation: clone(validation || { ok: true, errors: [] }),
      syncStatus: toText(src.syncStatus || quote.syncStatus || backendSync.status) || 'local_only',
      v4BomSummary: clone(v4BomSummary),
      v4BomReady: Boolean(v4BomSummary && v4BomSummary.sharedBom > 0),
      backendSync: clone(backendSync || {}),
      quote: { id: quoteId, status: toText(src.status || quote.status) || 'draft', history },
      createdAt: toText(src.createdAt || quote.createdAt || savedAt),
      updatedAt,
      savedAt,
      indexOnly: true
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

  function rawProjectIds(row) {
    const src = row || {};
    const quote = src.quote || src;
    return {
      projectId: toText(src.projectId || src.id),
      quoteId: toText(src.quoteId || quote.id)
    };
  }

  function sortAndDedupeProjects(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .filter(row => {
        const ids = rawProjectIds(row);
        const key = ids.projectId || ids.quoteId;
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => String(b && (b.updatedAt || b.savedAt) || '').localeCompare(String(a && (a.updatedAt || a.savedAt) || '')));
  }

  function applyProjectFilters(rows, filters) {
    const opts = filters || {};
    let result = Array.isArray(rows) ? rows.slice() : [];
    if (opts.status) result = result.filter(row => row.status === opts.status);
    if (opts.clientId) {
      const clientId = toText(opts.clientId).toLowerCase();
      result = result.filter(row => [row.clientId, row.clientEmail, row.clientPhone, row.clientName].join(' ').toLowerCase().includes(clientId));
    }
    if (opts.query) {
      const q = toText(opts.query).toLowerCase();
      result = result.filter(row => [row.clientId, row.clientEmail, row.clientPhone, row.clientName, row.projectName, row.venueName, row.venueAddress, row.eventDate]
        .join(' ')
        .toLowerCase()
        .includes(q));
    }
    return result;
  }

  function listProjectIndex(filters) {
    const seen = new Set();
    const rows = (Array.isArray(readRawList()) ? readRawList() : [])
      .map(row => createProjectIndexRecord(row))
      .filter(row => {
        const key = row.projectId || row.quoteId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => String(b.updatedAt || b.savedAt || '').localeCompare(String(a.updatedAt || a.savedAt || '')));
    return applyProjectFilters(rows, filters);
  }

  function listProjects(filters) {
    return applyProjectFilters(normalizeList(readRawList()), filters);
  }

  function saveProject(input) {
    let nextRecord = normalizeProjectRecord(input || {});
    const rows = readRawList();
    const index = rows.findIndex(row => {
      const ids = rawProjectIds(row);
      return (nextRecord.projectId && ids.projectId === nextRecord.projectId) || (nextRecord.quoteId && ids.quoteId === nextRecord.quoteId);
    });
    const isUpdate = index >= 0;
    if (isUpdate) {
      const existing = createProjectIndexRecord(rows[index]);
      nextRecord.projectId = existing.projectId;
      nextRecord.createdAt = existing.createdAt;
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
    writeRawList(sortAndDedupeProjects(rows));
    setActiveProjectId(normalizedRecord.projectId);
    return normalizedRecord;
  }

  function saveQuoteAsProject(quote) {
    return saveProject({ quote: hydrateQuoteForProject(quoteModel().createQuoteDraft(quote || {}), 'quote-project-storage-save', { rebuildMissing:false }) });
  }

  function saveActiveDraftAsProject() {
    const storage = draftStorage();
    const activeDraft = storage && storage.loadActiveDraft ? storage.loadActiveDraft() : null;
    if (!activeDraft) throw new Error('Нет активного черновика сметы для сохранения в проекты.');
    return saveQuoteAsProject(activeDraft);
  }

  function loadProject(projectId) {
    const id = toText(projectId);
    const row = readRawList().find(item => {
      const ids = rawProjectIds(item);
      return ids.projectId === id || ids.quoteId === id;
    });
    return row ? normalizeProjectRecord(row) : null;
  }

  function deleteProject(projectId) {
    const id = toText(projectId);
    const rows = readRawList().filter(row => {
      const ids = rawProjectIds(row);
      return ids.projectId !== id && ids.quoteId !== id;
    });
    writeRawList(rows);
    if (getActiveProjectId() === id) {
      const next = rows[0] ? createProjectIndexRecord(rows[0]) : null;
      setActiveProjectId(next ? next.projectId : '');
    }
    return listProjectIndex();
  }

  function restoreProjectToDraft(projectId) {
    const record = loadProject(projectId);
    if (!record) throw new Error('Проект сметы не найден.');
    const quote = hydrateQuoteForProject(quoteModel().createQuoteDraft(record.quote), 'quote-project-storage-restore', { rebuildMissing:false });
    const storage = draftStorage();
    if (storage && storage.saveDraft) storage.saveDraft(quote, { source:'quote-project-storage-restore' });
    setActiveProjectId(record.projectId);
    return quote;
  }

  function duplicateProject(projectId) {
    const record = loadProject(projectId);
    if (!record) throw new Error('Проект сметы не найден.');
    const quote = hydrateQuoteForProject(quoteModel().createQuoteDraft({
      ...record.quote,
      id: '',
      status: 'draft',
      project: { ...(record.quote.project || {}), name: `${record.projectName || 'Проект'} — копия` },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }), 'quote-project-storage-duplicate', { forceRebuild: false, rebuildMissing:false });
    return saveProject({ quote, projectId: makeProjectId() });
  }

  function updateProjectStatus(projectId, status, note) {
    const id = toText(projectId);
    const rows = readRawList().slice();
    const index = rows.findIndex(row => {
      const ids = rawProjectIds(row);
      return ids.projectId === id || ids.quoteId === id;
    });
    if (index < 0) throw new Error('Проект сметы не найден.');
    const record = normalizeProjectRecord(rows[index]);
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
    writeRawList(sortAndDedupeProjects(rows));
    return next;
  }

  function updateProjectSyncMeta(projectId, patch) {
    const id = toText(projectId);
    const rows = readRawList().slice();
    const index = rows.findIndex(row => {
      const ids = rawProjectIds(row);
      return ids.projectId === id || ids.quoteId === id;
    });
    if (index < 0) throw new Error('Проект сметы не найден.');
    const record = normalizeProjectRecord(rows[index]);
    const meta = Object.assign({}, record.backendSync || record.quote && record.quote.backendSync || {}, patch || {}, { updatedAt: new Date().toISOString() });
    const quote = hydrateQuoteForProject(quoteModel().createQuoteDraft(Object.assign({}, record.quote || {}, {
      syncStatus: toText(meta.status || record.syncStatus || 'local_only'),
      backendSync: clone(meta)
    })), 'quote-project-storage-sync-meta', { rebuildMissing:false });
    const next = normalizeProjectRecord(Object.assign({}, record, {
      syncStatus: toText(meta.status || record.syncStatus || 'local_only'),
      backendSync: clone(meta),
      quote,
      updatedAt: new Date().toISOString()
    }));
    rows[index] = next;
    writeRawList(sortAndDedupeProjects(rows));
    return next;
  }

  function getProjectTimeline(projectId) {
    const record = loadProject(projectId);
    if (!record) return [];
    const history = record.quote && Array.isArray(record.quote.history) ? record.quote.history : [];
    return history.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }

  function getStatusCounts() {
    return listProjectIndex().reduce((acc, row) => {
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
    hydrateQuoteForProject,
    summarizeProjectBom,
    createProjectIndexRecord,
    listProjectIndex,
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
