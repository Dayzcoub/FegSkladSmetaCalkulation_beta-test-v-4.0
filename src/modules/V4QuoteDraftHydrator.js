// FEG Stage PRO v3.15.52 — V4QuoteDraftHydrator
// Restores/hydrates quote.v4Bom snapshots when drafts/projects are loaded back into v4 UI.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const V4_QUOTE_DRAFT_HYDRATOR_VERSION = '3.15.52';

  function model() { return ROOT.QuoteModel || null; }
  function sink() { return ROOT.V4QuoteDraftBomSink || null; }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toText(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || { sections: {} });
  }

  function getStoredMount(draft) {
    const src = draft || {};
    const mount = src.v4Bom || src.v4_bom || null;
    return mount && typeof mount === 'object' ? mount : null;
  }

  function getRowCounts(mount) {
    const m = mount || {};
    const counts = m.rowCounts || {};
    const sharedRows = m.sharedBom && Array.isArray(m.sharedBom.rows) ? m.sharedBom.rows.length : 0;
    const quoteRows = m.quoteItems && Array.isArray(m.quoteItems.rows) ? m.quoteItems.rows.length : 0;
    const warehouseRows = m.warehouseSheet && Array.isArray(m.warehouseSheet.rows) ? m.warehouseSheet.rows.length : 0;
    const technicalRows = m.technicalSheet && Array.isArray(m.technicalSheet.rows) ? m.technicalSheet.rows.length : 0;
    return {
      sharedBom: Math.max(0, Number(counts.sharedBom || sharedRows || 0)),
      quoteItems: Math.max(0, Number(counts.quoteItems || quoteRows || 0)),
      warehouse: Math.max(0, Number(counts.warehouse || warehouseRows || 0)),
      technical: Math.max(0, Number(counts.technical || technicalRows || 0))
    };
  }

  function hasAnyConfiguredSection(quote) {
    const sections = quote && quote.sections || {};
    return ['stage', 'truss', 'led', 'equipment'].some(key => sections[key] && sections[key].status === 'configured');
  }

  function isValidMount(mount) {
    if (!mount || typeof mount !== 'object') return false;
    const counts = getRowCounts(mount);
    const hasRows = counts.sharedBom > 0 || counts.quoteItems > 0 || counts.warehouse > 0 || counts.technical > 0;
    return Boolean(mount.type || mount.version || hasRows) && Boolean(mount.sharedBom || mount.quoteItems || mount.warehouseSheet || mount.technicalSheet || hasRows);
  }

  function summarizeMount(mount) {
    const m = mount || {};
    const counts = getRowCounts(m);
    const totals = m.totals || m.sharedBom && m.sharedBom.totals || {};
    const checks = m.checks || {};
    return {
      version: toText(m.version, '—'),
      quoteId: toText(m.quoteId || m.quote_id),
      projectName: toText(m.projectName),
      rows: counts.sharedBom,
      sharedBom: counts.sharedBom,
      quoteItems: counts.quoteItems,
      warehouse: counts.warehouse,
      technical: counts.technical,
      weightKg: nonNegative(totals.weightKg == null ? totals.weight_kg : totals.weightKg, 0),
      powerW: nonNegative(totals.powerW == null ? totals.power_w : totals.powerW, 0),
      startupPowerW: nonNegative(totals.startupPowerW == null ? totals.startup_power_w : totals.startupPowerW, 0),
      deficitQty: nonNegative(totals.deficitQty == null ? totals.deficit_qty : totals.deficitQty, 0),
      deficitRows: nonNegative(totals.deficitRows == null ? totals.deficit_rows : totals.deficitRows, 0),
      ok: checks && Object.prototype.hasOwnProperty.call(checks, 'ok') ? Boolean(checks.ok) : counts.sharedBom > 0,
      contractOk: m.contractReadiness ? Boolean(m.contractReadiness.ready) : (Object.prototype.hasOwnProperty.call(m, 'contractOk') ? Boolean(m.contractOk) : null),
      contractVersion: toText(m.contractVersion || m.contract && m.contract.version || m.contractReadiness && m.contractReadiness.version),
      generatedAt: toText(m.generatedAt),
      restoredAt: toText(m.restoredAt),
      source: toText(m.source)
    };
  }

  function buildMountFromQuote(quote, options) {
    const opts = Object.assign({ source: 'quote-draft-hydrator', hydrateMode: 'rebuilt' }, options || {});
    if (sink() && sink().buildDraftBomMount) return sink().buildDraftBomMount(quote, opts);
    return getStoredMount(quote);
  }

  function markRestoredMount(mount, quote, options) {
    if (!mount || typeof mount !== 'object') return null;
    const q = quote || {};
    const opts = options || {};
    const next = clone(mount) || {};
    const history = Array.isArray(next.restoreHistory) ? next.restoreHistory.slice(-9) : [];
    history.push({
      at: nowIso(),
      source: toText(opts.source, 'quote-draft-hydrator'),
      mode: toText(opts.hydrateMode, 'restored'),
      quoteId: toText(q.id || next.quoteId || next.quote_id)
    });
    next.version = toText(next.version, V4_QUOTE_DRAFT_HYDRATOR_VERSION);
    next.quoteId = toText(q.id || next.quoteId || next.quote_id);
    next.quote_id = next.quoteId;
    next.projectName = toText(q.project && q.project.name || next.projectName);
    next.restoredAt = nowIso();
    next.restoredBy = 'V4QuoteDraftHydrator';
    next.restoreVersion = V4_QUOTE_DRAFT_HYDRATOR_VERSION;
    next.restoreHistory = history;
    next.readyFor = Object.assign({}, next.readyFor || {}, {
      quoteDraftRestore: true,
      quoteProjectRestore: true,
      quoteWizard: true,
      bomContract: next.contractReadiness ? Boolean(next.contractReadiness.ready) : Boolean(next.contractOk),
      documents: true,
      warehousePickList: true,
      legacyV3Touched: false
    });
    return next;
  }

  function hydrateDraft(draft, options) {
    const opts = Object.assign({ source: 'quote-draft-hydrator', forceRebuild: false, rebuildMissing: true, markRestored: true }, options || {});
    const q = normalizeQuote(draft || {});
    const stored = getStoredMount(q);
    let mount = null;
    let mode = 'none';

    if (!opts.forceRebuild && isValidMount(stored)) {
      mount = stored;
      mode = 'restored';
    } else if (opts.forceRebuild || opts.rebuildMissing || hasAnyConfiguredSection(q)) {
      mount = buildMountFromQuote(q, Object.assign({}, opts, { source: opts.source || 'quote-draft-hydrator' }));
      mode = opts.forceRebuild ? 'rebuilt-force' : 'rebuilt-missing';
    }

    if (!mount) return q;
    const nextMount = opts.markRestored === false ? clone(mount) : markRestoredMount(mount, q, Object.assign({}, opts, { hydrateMode: mode }));
    return normalizeQuote(Object.assign({}, q, { v4Bom: nextMount }));
  }

  function hydrateDraftList(list, options) {
    return (Array.isArray(list) ? list : []).map(row => hydrateDraft(row, options || {}));
  }

  function hydrateProjectRecord(record, options) {
    const src = record || {};
    const quote = hydrateDraft(src.quote || src, Object.assign({ source: 'quote-project-storage', rebuildMissing: true }, options || {}));
    const summary = summarizeMount(quote && quote.v4Bom);
    return Object.assign({}, src, {
      quote,
      v4BomSummary: summary,
      v4BomReady: Boolean(summary && summary.sharedBom > 0),
      v4BomHydratedAt: nowIso()
    });
  }

  function exportHydratedSnapshotJson(draft, options) {
    const quote = hydrateDraft(draft, Object.assign({ source: 'quote-draft-hydrator-export' }, options || {}));
    return JSON.stringify({
      type: 'feg-stage-pro-v4-hydrated-bom-snapshot',
      version: V4_QUOTE_DRAFT_HYDRATOR_VERSION,
      exportedAt: nowIso(),
      quoteId: quote && quote.id,
      summary: summarizeMount(quote && quote.v4Bom),
      v4Bom: quote && quote.v4Bom || null
    }, null, 2);
  }

  ROOT.V4QuoteDraftHydrator = {
    V4_QUOTE_DRAFT_HYDRATOR_VERSION,
    getStoredMount,
    getRowCounts,
    isValidMount,
    summarizeMount,
    hydrateDraft,
    hydrateDraftList,
    hydrateProjectRecord,
    exportHydratedSnapshotJson
  };
})();
