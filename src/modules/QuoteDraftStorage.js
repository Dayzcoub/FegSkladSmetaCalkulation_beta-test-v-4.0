(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const STORAGE_KEY = 'fegQuoteDraftsV4';
  const ACTIVE_KEY = 'fegActiveQuoteDraftIdV4';
  let memoryDrafts = [];
  let memoryActiveId = '';

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
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeRawList(list) {
    const safe = Array.isArray(list) ? list : [];
    if (!canUseLocalStorage()) {
      memoryDrafts = safe.slice();
      return safe;
    }
    GLOBAL.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  }

  function normalizeList(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map(row => model().createQuoteDraft(row))
      .filter(row => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function listDrafts() {
    return normalizeList(readRawList());
  }

  function saveDraft(draft) {
    const normalized = model().createQuoteDraft({ ...draft, autosavedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const list = listDrafts();
    const index = list.findIndex(row => row.id === normalized.id);
    if (index >= 0) list[index] = normalized;
    else list.unshift(normalized);
    writeRawList(normalizeList(list));
    setActiveDraftId(normalized.id);
    return normalized;
  }

  function loadDraft(id) {
    const targetId = String(id || '').trim();
    return listDrafts().find(row => row.id === targetId) || null;
  }

  function deleteDraft(id) {
    const targetId = String(id || '').trim();
    const next = listDrafts().filter(row => row.id !== targetId);
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

  function loadActiveDraft() {
    const active = getActiveDraftId();
    return (active && loadDraft(active)) || listDrafts()[0] || null;
  }

  function createAndSaveDraft(overrides) {
    return saveDraft(model().createQuoteDraft(overrides || {}));
  }

  function clearDrafts() {
    writeRawList([]);
    setActiveDraftId('');
  }

  ROOT.QuoteDraftStorage = {
    STORAGE_KEY,
    ACTIVE_KEY,
    listDrafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    setActiveDraftId,
    getActiveDraftId,
    loadActiveDraft,
    createAndSaveDraft,
    clearDrafts
  };
})();
