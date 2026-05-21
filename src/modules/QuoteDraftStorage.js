(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STORAGE_KEY = 'fegQuoteDraftsV4';
  const ACTIVE_KEY = 'fegActiveQuoteDraftIdV4';
  let memoryDrafts = [];
  let memoryActiveId = '';
  let rawCacheText = null;
  let rawCacheRows = null;

  function model() {
    if (!ROOT.QuoteModel) throw new Error('QuoteModel is not available.');
    return ROOT.QuoteModel;
  }

  function canUseLocalStorage() {
    try { return typeof GLOBAL.localStorage !== 'undefined' && GLOBAL.localStorage; }
    catch (_) { return false; }
  }

  function readRawList() {
    if (!canUseLocalStorage()) return memoryDrafts.slice();
    try {
      const raw = GLOBAL.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      if (rawCacheText === raw && rawCacheRows) return rawCacheRows.slice();
      const parsed = JSON.parse(raw);
      rawCacheText = raw;
      rawCacheRows = Array.isArray(parsed) ? parsed : [];
      return rawCacheRows.slice();
    } catch (_) {
      return [];
    }
  }

  function writeRawList(list) {
    const safe = Array.isArray(list) ? list : [];
    if (!canUseLocalStorage()) {
      memoryDrafts = safe.slice();
      rawCacheRows = memoryDrafts.slice();
      rawCacheText = null;
      return safe;
    }
    const raw = JSON.stringify(safe);
    GLOBAL.localStorage.setItem(STORAGE_KEY, raw);
    rawCacheText = raw;
    rawCacheRows = safe.slice();
    return safe;
  }

  function rawDraftId(row) {
    try { return String(row && row.id || '').trim(); } catch (_) { return ''; }
  }

  function sortAndDedupeRaw(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .filter(row => {
        const id = rawDraftId(row);
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => String(b && b.updatedAt || b && b.autosavedAt || '').localeCompare(String(a && a.updatedAt || a && a.autosavedAt || '')));
  }

  function attachV4BomSnapshot(draft, source) {
    if (ROOT.V4QuoteDraftBomSink && ROOT.V4QuoteDraftBomSink.attachBomSnapshot) {
      try {
        return ROOT.V4QuoteDraftBomSink.attachBomSnapshot(draft, { source: source || 'quote-draft-storage' });
      } catch (err) {
        try { if (console && console.warn) console.warn('[FEG] V4 quote draft BOM sink skipped', err); } catch (_) {}
      }
    }
    return draft;
  }

  function hydrateV4BomSnapshot(draft, source) {
    if (ROOT.V4QuoteDraftHydrator && ROOT.V4QuoteDraftHydrator.hydrateDraft) {
      try {
        return ROOT.V4QuoteDraftHydrator.hydrateDraft(draft, { source: source || 'quote-draft-storage-load', rebuildMissing: true });
      } catch (err) {
        try { if (console && console.warn) console.warn('[FEG] V4 quote draft BOM hydrate skipped', err); } catch (_) {}
      }
    }
    return draft;
  }

  function shouldHydrateBom(options) {
    const opts = options || {};
    return opts.hydrateBom === true || opts.rebuildMissingBom === true || opts.forceHydrateBom === true;
  }

  function shouldAttachBom(options) {
    const opts = options || {};
    return opts.attachBom === true || opts.rebuildBom === true || opts.forceBomSnapshot === true;
  }

  function normalizeList(list, options) {
    const opts = options || {};
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map(row => {
        const draft = model().createQuoteDraft(row);
        return shouldHydrateBom(opts) ? hydrateV4BomSnapshot(draft, opts.source || 'quote-draft-storage-list') : draft;
      })
      .filter(row => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function listDrafts(options) {
    return normalizeList(readRawList(), options || {});
  }

  function saveDraft(draft, options) {
    const opts = options || {};
    const stamp = new Date().toISOString();
    let normalized = model().createQuoteDraft({ ...draft, autosavedAt: stamp, updatedAt: stamp });
    if (shouldAttachBom(opts)) {
      normalized = model().createQuoteDraft(attachV4BomSnapshot(normalized, opts.source || 'quote-draft-storage-manual-bom'));
    }
    if (shouldHydrateBom(opts)) {
      normalized = model().createQuoteDraft(hydrateV4BomSnapshot(normalized, opts.source || 'quote-draft-storage-save'));
    }
    const list = readRawList();
    const index = list.findIndex(row => rawDraftId(row) === normalized.id);
    if (index >= 0) list[index] = normalized;
    else list.unshift(normalized);
    writeRawList(sortAndDedupeRaw(list));
    setActiveDraftId(normalized.id);
    return normalized;
  }

  function saveDraftWithBom(draft, options) {
    return saveDraft(draft, Object.assign({}, options || {}, { attachBom:true }));
  }

  function loadDraft(id, options) {
    const targetId = String(id || '').trim();
    if (!targetId) return null;
    const raw = readRawList().find(row => rawDraftId(row) === targetId);
    if (!raw) return null;
    let draft = model().createQuoteDraft(raw);
    if (shouldHydrateBom(options || {})) draft = hydrateV4BomSnapshot(draft, (options || {}).source || 'quote-draft-storage-load');
    return draft;
  }

  function deleteDraft(id) {
    const targetId = String(id || '').trim();
    const next = listDrafts({ hydrateBom:false }).filter(row => row.id !== targetId);
    writeRawList(next);
    if (getActiveDraftId() === targetId) setActiveDraftId(next[0] ? next[0].id : '');
    return next;
  }

  function setActiveDraftId(id) {
    const value = String(id || '').trim();
    if (!canUseLocalStorage()) {
      memoryActiveId = value;
      return value;
    }
    if (value) GLOBAL.localStorage.setItem(ACTIVE_KEY, value);
    else GLOBAL.localStorage.removeItem(ACTIVE_KEY);
    return value;
  }

  function getActiveDraftId() {
    if (!canUseLocalStorage()) return memoryActiveId;
    try { return GLOBAL.localStorage.getItem(ACTIVE_KEY) || ''; }
    catch (_) { return ''; }
  }

  function loadActiveDraft(options) {
    const active = getActiveDraftId();
    const activeDraft = active && loadDraft(active, options || {});
    if (activeDraft) return activeDraft;
    const first = sortAndDedupeRaw(readRawList())[0];
    if (!first) return null;
    let draft = model().createQuoteDraft(first);
    if (shouldHydrateBom(options || {})) draft = hydrateV4BomSnapshot(draft, (options || {}).source || 'quote-draft-storage-load-active');
    return draft;
  }

  function createAndSaveDraft(overrides, options) {
    return saveDraft(model().createQuoteDraft(overrides || {}), options || {});
  }

  function clearDrafts() {
    writeRawList([]);
    setActiveDraftId('');
  }

  ROOT.QuoteDraftStorage = {
    STORAGE_KEY,
    ACTIVE_KEY,
    listDrafts,
    attachV4BomSnapshot,
    hydrateV4BomSnapshot,
    saveDraft,
    saveDraftWithBom,
    loadDraft,
    deleteDraft,
    setActiveDraftId,
    getActiveDraftId,
    loadActiveDraft,
    createAndSaveDraft,
    clearDrafts
  };
})();
