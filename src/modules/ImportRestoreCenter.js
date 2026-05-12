(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const IMPORT_CENTER_VERSION = '1.0.0';
  const IMPORT_HISTORY_KEY = 'fegV4ImportRestoreHistory';

  function model() { return ROOT.QuoteModel || null; }
  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function draftStorage() { return ROOT.QuoteDraftStorage || null; }
  function supplierDirectory() { return ROOT.SupplierDirectory || null; }
  function backendAdapter() { return ROOT.BackendSyncAdapter || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function canUseLocalStorage() {
    try { return typeof GLOBAL.localStorage !== 'undefined' && GLOBAL.localStorage; }
    catch (_) { return false; }
  }

  function parseImportText(text) {
    const raw = toText(text);
    if (!raw) return { ok: false, error: 'Пустой импорт.' };
    try {
      return normalizeImportObject(JSON.parse(raw));
    } catch (err) {
      return { ok: false, error: `Не удалось прочитать JSON: ${err && err.message ? err.message : err}` };
    }
  }

  function normalizeImportObject(input) {
    const source = input || {};
    const type = toText(source.type || source.exportType || '');
    const warnings = [];
    let kind = 'unknown';
    let quote = null;
    let projectId = '';
    let suppliers = [];
    let backendSyncPayload = null;
    let auditLog = [];
    let documents = [];

    if (type === 'feg-stage-pro-project-export-pack') {
      kind = 'export-pack';
      quote = source.quote || null;
      projectId = toText(source.projectId || source.project_id);
      suppliers = Array.isArray(source.suppliers) ? source.suppliers : [];
      backendSyncPayload = source.backend_sync_payload || null;
      auditLog = Array.isArray(source.audit_log) ? source.audit_log : [];
      documents = Array.isArray(source.documents) ? source.documents : [];
    } else if (type === 'feg-stage-pro-backend-sync-payload') {
      kind = 'backend-sync-payload';
      backendSyncPayload = source;
      const rows = source.rows || {};
      const firstQuoteRow = Array.isArray(rows.quotes) ? rows.quotes[0] : null;
      quote = firstQuoteRow && firstQuoteRow.raw_payload ? firstQuoteRow.raw_payload : null;
      projectId = toText(firstQuoteRow && (firstQuoteRow.project_id || firstQuoteRow.id));
      suppliers = Array.isArray(rows.suppliers) ? rows.suppliers.map(row => row.raw_payload || row) : [];
      auditLog = Array.isArray(rows.audit_log) ? rows.audit_log : [];
    } else if (type === 'feg-stage-pro-audit-log-export') {
      kind = 'audit-log-only';
      auditLog = Array.isArray(source.rows) ? source.rows : [];
      warnings.push('Это только audit_log: проект из него восстановить нельзя, но журнал можно проверить/архивировать.');
    } else if (source.quote) {
      kind = 'project-record';
      quote = source.quote;
      projectId = toText(source.projectId || source.id);
    } else if (source.client || source.project || source.venue || source.sections || source.transport || source.scope) {
      kind = 'quote-json';
      quote = source;
    } else if (Array.isArray(source.quotes) && source.quotes[0]) {
      kind = 'quotes-array';
      quote = source.quotes[0].raw_payload || source.quotes[0];
    }

    let normalizedQuote = null;
    if (quote) {
      if (!model() || !model().createQuoteDraft) return { ok: false, error: 'QuoteModel недоступен для нормализации импорта.' };
      normalizedQuote = model().createQuoteDraft({
        ...quote,
        updatedAt: nowIso(),
        importMeta: {
          importedAt: nowIso(),
          importKind: kind,
          sourceType: type || kind,
          sourceProjectId: projectId || toText(source.projectId),
          sourceQuoteId: toText(source.quoteId || source.quote_id || quote.id)
        }
      });
      if (Array.isArray(auditLog) && auditLog.length) {
        const existing = Array.isArray(normalizedQuote.history) ? normalizedQuote.history : [];
        const importedEvents = auditLog.slice(0, 40).map(row => ({
          id: toText(row.id) || `import-${Math.random().toString(36).slice(2, 8)}`,
          type: `imported:${toText(row.action || 'audit_event')}`,
          at: toText(row.at) || nowIso(),
          payload: clone(row.payload || row)
        }));
        normalizedQuote.history = existing.concat(importedEvents).slice(-120);
      }
    }

    if (!normalizedQuote && kind !== 'audit-log-only') return { ok: false, error: 'В импорте не найден проект или quote.' };

    const validation = normalizedQuote && model() && model().validateQuote ? model().validateQuote(normalizedQuote) : { ok: true, errors: [] };
    if (validation && !validation.ok) warnings.push(...(validation.errors || []).map(String));

    return {
      ok: true,
      kind,
      type: type || kind,
      quote: normalizedQuote,
      projectId,
      suppliers: Array.isArray(suppliers) ? suppliers : [],
      backendSyncPayload,
      auditLog,
      documents,
      warnings,
      validation,
      summary: buildImportSummary({ kind, type, quote: normalizedQuote, suppliers, auditLog, documents, backendSyncPayload, warnings })
    };
  }

  function buildImportSummary(normalized) {
    const q = normalized.quote || {};
    return {
      kind: normalized.kind,
      type: normalized.type || normalized.kind,
      quoteId: toText(q.id),
      projectName: q.project && q.project.name || 'Без названия',
      clientName: q.client && q.client.name || 'Клиент не указан',
      status: toText(q.status || ''),
      eventDate: q.venue && q.venue.date || '',
      suppliers: Array.isArray(normalized.suppliers) ? normalized.suppliers.length : 0,
      auditRows: Array.isArray(normalized.auditLog) ? normalized.auditLog.length : 0,
      documents: Array.isArray(normalized.documents) ? normalized.documents.length : 0,
      hasBackendPayload: Boolean(normalized.backendSyncPayload),
      warnings: Array.isArray(normalized.warnings) ? normalized.warnings.length : 0
    };
  }

  function restoreImport(input, options) {
    const opts = options || {};
    const normalized = typeof input === 'string' ? parseImportText(input) : normalizeImportObject(input);
    if (!normalized.ok) return normalized;
    if (!normalized.quote) return { ok: false, error: 'Этот импорт не содержит проект для восстановления.', normalized };
    const storage = projectStorage();
    if (!storage || !storage.saveProject) return { ok: false, error: 'QuoteProjectStorage недоступен для восстановления.' };

    const quote = model().createQuoteDraft({
      ...normalized.quote,
      id: opts.keepQuoteId === false ? '' : normalized.quote.id,
      updatedAt: nowIso()
    });
    const saved = storage.saveProject({ quote, projectId: opts.keepProjectId === false ? '' : normalized.projectId });
    if (opts.setActiveDraft !== false && draftStorage() && draftStorage().saveDraft) draftStorage().saveDraft(saved.quote);
    const supplierResult = restoreSuppliers(normalized.suppliers, opts);
    const historyRow = recordImportHistory({ normalized, saved, supplierResult });
    return {
      ok: true,
      importKind: normalized.kind,
      project: saved,
      quote: saved.quote,
      suppliersImported: supplierResult.imported,
      warnings: normalized.warnings || [],
      history: historyRow
    };
  }

  function restoreSuppliers(suppliers, options) {
    const opts = options || {};
    const directory = supplierDirectory();
    if (!directory || !directory.upsertSupplier || opts.importSuppliers === false) return { imported: 0, skipped: Array.isArray(suppliers) ? suppliers.length : 0 };
    let imported = 0;
    (Array.isArray(suppliers) ? suppliers : []).forEach(supplier => {
      if (!supplier) return;
      directory.upsertSupplier(supplier);
      imported += 1;
    });
    return { imported, skipped: 0 };
  }

  function recordImportHistory(payload) {
    const normalized = payload.normalized || {};
    const saved = payload.saved || {};
    const row = {
      id: `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      version: IMPORT_CENTER_VERSION,
      at: nowIso(),
      kind: normalized.kind,
      type: normalized.type,
      projectId: saved.projectId || '',
      quoteId: saved.quoteId || saved.quote && saved.quote.id || '',
      projectName: saved.projectName || saved.quote && saved.quote.project && saved.quote.project.name || '',
      suppliersImported: payload.supplierResult && payload.supplierResult.imported || 0,
      warnings: normalized.warnings || []
    };
    if (!canUseLocalStorage()) return row;
    try {
      const raw = GLOBAL.localStorage.getItem(IMPORT_HISTORY_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = [row].concat(Array.isArray(list) ? list : []).slice(0, 60);
      GLOBAL.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(next));
    } catch (_) {}
    return row;
  }

  function listImportHistory() {
    if (!canUseLocalStorage()) return [];
    try {
      const raw = GLOBAL.localStorage.getItem(IMPORT_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function validateImportText(text) {
    const parsed = parseImportText(text);
    if (!parsed.ok) return parsed;
    if (parsed.backendSyncPayload && backendAdapter() && backendAdapter().validateSyncPayload) {
      const syncValidation = backendAdapter().validateSyncPayload(parsed.backendSyncPayload);
      if (!syncValidation.ok) parsed.warnings = (parsed.warnings || []).concat(syncValidation.errors || []);
    }
    return parsed;
  }

  function renderImportPanel(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const history = listImportHistory();
    root.innerHTML = `
      <div class="v4-card v4-section-card" data-v4-import-restore>
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">import / restore center</div>
            <h4>Импорт / восстановление проекта</h4>
            <p class="v4-muted">Вставь Export pack JSON, backend_sync_payload или обычный JSON проекта — центр проверит структуру и восстановит проект в локальную историю.</p>
          </div>
        </div>
        <div class="v4-note">
          <label style="display:flex;flex-direction:column;gap:6px">JSON для импорта
            <textarea class="v4-doc-preview" data-v4-import-text placeholder="Вставь сюда export-pack JSON или JSON проекта"></textarea>
          </label>
          <div class="v4-actions">
            <button type="button" class="btn-secondary" data-v4-import-validate>Проверить</button>
            <button type="button" class="btn-primary" data-v4-import-restore>Восстановить проект</button>
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">Файл JSON<input type="file" accept="application/json,.json" data-v4-import-file style="display:none"></label>
          </div>
          <pre class="v4-note" data-v4-import-result style="white-space:pre-wrap;max-height:260px;overflow:auto">История импортов: ${history.length}</pre>
        </div>
      </div>`;
    bindImportPanel(root, opts);
    return root;
  }

  function bindImportPanel(root, options) {
    const textarea = root.querySelector('[data-v4-import-text]');
    const result = root.querySelector('[data-v4-import-result]');
    const setResult = value => { if (result) result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); };
    const validateBtn = root.querySelector('[data-v4-import-validate]');
    const restoreBtn = root.querySelector('[data-v4-import-restore]');
    const fileInput = root.querySelector('[data-v4-import-file]');
    if (validateBtn) validateBtn.addEventListener('click', () => setResult(validateImportText(textarea ? textarea.value : '')));
    if (restoreBtn) restoreBtn.addEventListener('click', () => {
      const restored = restoreImport(textarea ? textarea.value : '', { setActiveDraft: true });
      setResult(restored);
      if (restored.ok) {
        toast(`Проект восстановлен: ${restored.project.projectName}`);
        if (options && typeof options.onRestore === 'function') options.onRestore(restored);
      }
    });
    if (fileInput) fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file || !GLOBAL.FileReader) return;
      const reader = new FileReader();
      reader.onload = () => { if (textarea) textarea.value = String(reader.result || ''); setResult(validateImportText(textarea ? textarea.value : '')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  function toast(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (GLOBAL.showToast) GLOBAL.showToast(message);
  }

  ROOT.ImportRestoreCenter = {
    IMPORT_CENTER_VERSION,
    IMPORT_HISTORY_KEY,
    parseImportText,
    normalizeImportObject,
    validateImportText,
    restoreImport,
    restoreSuppliers,
    listImportHistory,
    renderImportPanel
  };
})();
