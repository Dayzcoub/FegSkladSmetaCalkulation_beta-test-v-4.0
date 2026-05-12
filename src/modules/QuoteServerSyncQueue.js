(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUEUE_VERSION = '3.10.2';
  const STORAGE_KEY = 'fegV4QuoteServerSyncQueue';
  const STATUS = Object.freeze({
    LOCAL_ONLY: 'local_only',
    READY: 'ready_to_sync',
    STAGED: 'staged',
    SYNCED: 'synced',
    ERROR: 'sync_error'
  });

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function safeJson(value) { return JSON.stringify(value, null, 2); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function projectStorage() { return ROOT.QuoteProjectStorage || null; }
  function syncConsole() { return ROOT.SupabaseSyncConsole || null; }
  function dryRun() { return ROOT.BackendWriteDryRun || null; }
  function auditLog() { return ROOT.ProjectAuditLog || null; }

  function getStorage(storage) {
    if (storage) return storage;
    try { if (GLOBAL.localStorage) return GLOBAL.localStorage; } catch (_) {}
    return null;
  }

  function readQueue(storage) {
    const store = getStorage(storage);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeQueue(rows, storage) {
    const safe = Array.isArray(rows) ? rows : [];
    const store = getStorage(storage);
    if (store) store.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  }

  function makeQueueId(projectId) {
    return `quote-sync-${toText(projectId) || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function loadProject(projectOrId) {
    if (projectOrId && typeof projectOrId === 'object' && projectOrId.quote) return projectOrId;
    const id = toText(projectOrId);
    return projectStorage() && projectStorage().loadProject ? projectStorage().loadProject(id) : null;
  }

  function getQueueRow(projectId, storage) {
    const id = toText(projectId);
    return readQueue(storage).find(row => row.projectId === id || row.quoteId === id) || null;
  }

  function buildProjectSyncPayload(projectOrId, options) {
    const opts = options || {};
    const record = loadProject(projectOrId);
    if (!record) throw new Error('Проект для синхронизации не найден.');
    if (syncConsole() && syncConsole().buildSeedSyncPayload) {
      return syncConsole().buildSeedSyncPayload({
        config: opts.config,
        quote: record.quote,
        projectRecord: record,
        workspaceId: opts.workspaceId || record.workspaceId || record.quote && record.quote.workspaceId || 'main',
        includeEquipment: opts.includeEquipment !== false,
        includeSuppliers: opts.includeSuppliers !== false
      });
    }
    throw new Error('SupabaseSyncConsole недоступен для сборки sync payload.');
  }

  function buildProjectWriteDryRun(projectOrId, options) {
    const payload = buildProjectSyncPayload(projectOrId, options || {});
    if (dryRun() && dryRun().buildWriteDryRunReport) return dryRun().buildWriteDryRunReport(payload, options || {});
    return { type: 'feg-stage-pro-project-write-dry-run', safe_for_first_write: false, blockers: ['BackendWriteDryRun не загружен'], warnings: [], payload };
  }

  function getProjectSyncStatus(projectOrId, options) {
    const opts = options || {};
    const record = loadProject(projectOrId);
    if (!record) return { status: STATUS.LOCAL_ONLY, label: 'нет проекта', tone: 'muted', reasons: ['Проект не найден'] };
    const meta = record.backendSync || record.quote && record.quote.backendSync || {};
    const queued = getQueueRow(record.projectId, opts.storage);
    if (meta.status === STATUS.SYNCED || meta.lastSyncedAt) {
      return { status: STATUS.SYNCED, label: 'synced', tone: 'ok', reasons: [`Синхронизировано: ${meta.lastSyncedAt || meta.updatedAt || ''}`], queue: queued, meta };
    }
    if (meta.status === STATUS.ERROR || meta.lastError) {
      return { status: STATUS.ERROR, label: 'sync error', tone: 'bad', reasons: [meta.lastError || 'Ошибка синхронизации'], queue: queued, meta };
    }
    if (queued && queued.status === STATUS.STAGED) {
      return { status: STATUS.STAGED, label: 'staged', tone: 'warn', reasons: [`В очереди: ${queued.stagedAt || queued.updatedAt || ''}`], queue: queued, meta };
    }
    try {
      const report = buildProjectWriteDryRun(record, opts);
      if (report.safe_for_first_write && !(report.blockers || []).length) {
        return { status: STATUS.READY, label: 'ready to sync', tone: 'ok', reasons: (report.warnings || []).slice(0, 4), report, meta };
      }
      return { status: STATUS.LOCAL_ONLY, label: 'local only', tone: 'muted', reasons: (report.blockers || []).concat(report.warnings || []).slice(0, 6), report, meta };
    } catch (err) {
      return { status: STATUS.LOCAL_ONLY, label: 'local only', tone: 'muted', reasons: [err && err.message || 'Не удалось проверить sync-ready'], meta };
    }
  }

  function stageProject(projectOrId, options) {
    const opts = options || {};
    const record = loadProject(projectOrId);
    if (!record) throw new Error('Проект для staging не найден.');
    const report = buildProjectWriteDryRun(record, opts);
    const row = {
      type: 'feg-stage-pro-quote-sync-queue-row',
      version: QUEUE_VERSION,
      id: makeQueueId(record.projectId),
      projectId: record.projectId,
      quoteId: record.quoteId,
      workspaceId: record.workspaceId || report.workspace_id || 'main',
      projectName: record.projectName,
      clientName: record.clientName,
      status: STATUS.STAGED,
      stagedAt: nowIso(),
      updatedAt: nowIso(),
      payloadSummary: report.validation && report.validation.payload_summary || (dryRun() && dryRun().buildPayloadSummary ? dryRun().buildPayloadSummary(report.payload) : {}),
      safeForFirstWrite: Boolean(report.safe_for_first_write),
      blockers: clone(report.blockers || []),
      warnings: clone(report.warnings || []),
      dryRunReport: report
    };
    const rows = readQueue(opts.storage).filter(item => item.projectId !== record.projectId && item.quoteId !== record.quoteId);
    rows.unshift(row);
    writeQueue(rows, opts.storage);
    if (projectStorage() && projectStorage().updateProjectSyncMeta) {
      projectStorage().updateProjectSyncMeta(record.projectId, {
        status: STATUS.STAGED,
        stagedAt: row.stagedAt,
        queueId: row.id,
        lastDryRunAt: row.stagedAt,
        lastDryRunSafe: row.safeForFirstWrite,
        blockers: row.blockers,
        warnings: row.warnings
      });
    }
    return row;
  }

  function unstageProject(projectId, options) {
    const opts = options || {};
    const id = toText(projectId);
    const rows = readQueue(opts.storage).filter(item => item.projectId !== id && item.quoteId !== id && item.id !== id);
    writeQueue(rows, opts.storage);
    if (projectStorage() && projectStorage().updateProjectSyncMeta) {
      projectStorage().updateProjectSyncMeta(id, { status: STATUS.LOCAL_ONLY, queueId: '', unstagedAt: nowIso() });
    }
    return rows;
  }

  function markProjectSynced(projectId, details, options) {
    const opts = options || {};
    const id = toText(projectId);
    unstageProject(id, opts);
    const meta = Object.assign({ status: STATUS.SYNCED, lastSyncedAt: nowIso(), lastError: '' }, details || {});
    if (projectStorage() && projectStorage().updateProjectSyncMeta) return projectStorage().updateProjectSyncMeta(id, meta);
    return meta;
  }

  function markProjectSyncError(projectId, error, options) {
    const message = toText(error && error.message || error || 'Sync error');
    const meta = { status: STATUS.ERROR, lastError: message, lastErrorAt: nowIso() };
    if (projectStorage() && projectStorage().updateProjectSyncMeta) return projectStorage().updateProjectSyncMeta(projectId, meta);
    return meta;
  }

  function buildQueueReport(options) {
    const opts = options || {};
    const projects = projectStorage() && projectStorage().listProjects ? projectStorage().listProjects() : [];
    const queue = readQueue(opts.storage);
    const statuses = projects.map(record => ({
      projectId: record.projectId,
      quoteId: record.quoteId,
      projectName: record.projectName,
      clientName: record.clientName,
      sync: getProjectSyncStatus(record, opts)
    }));
    const counts = statuses.reduce((acc, row) => {
      const status = row.sync && row.sync.status || STATUS.LOCAL_ONLY;
      acc[status] = (acc[status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { total: 0, local_only: 0, ready_to_sync: 0, staged: 0, synced: 0, sync_error: 0 });
    return {
      type: 'feg-stage-pro-quote-sync-queue-report',
      version: QUEUE_VERSION,
      generated_at: nowIso(),
      counts,
      queue,
      projects: statuses
    };
  }

  function renderStatusBadge(sync) {
    const item = sync || { status: STATUS.LOCAL_ONLY, label: 'local only', tone: 'muted' };
    return `<span class="v4-sync-badge ${escapeHtml(item.tone || 'muted')}">${escapeHtml(item.label || item.status)}</span>`;
  }

  function renderQueueConsole(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = { report: buildQueueReport(opts), selectedProjectId: '' };
    function render() {
      const report = state.report;
      root.innerHTML = `
        <div class="v4-card v4-sync-console v4-quote-sync-console">
          <div class="v4-kicker">Backend / Sync · quotes</div>
          <h3>Real Quotes Sync groundwork</h3>
          <p class="v4-muted">Безопасная очередь серверной синхронизации проектов: sync-status, staged payload, dry-run и подготовка к будущему upsert в Supabase.</p>
          <div class="v4-mini-grid">
            <div class="v4-mini"><span>Проектов</span><b>${escapeHtml(report.counts.total)}</b></div>
            <div class="v4-mini"><span>Ready</span><b>${escapeHtml(report.counts.ready_to_sync)}</b></div>
            <div class="v4-mini"><span>Staged</span><b>${escapeHtml(report.counts.staged)}</b></div>
            <div class="v4-mini"><span>Synced</span><b>${escapeHtml(report.counts.synced)}</b></div>
          </div>
          <div class="v4-table-wrap">
            <table class="v4-table v4-table--sync"><thead><tr><th>Проект</th><th>Клиент</th><th>Sync status</th><th>Причины / warnings</th><th>Действия</th></tr></thead><tbody>
              ${report.projects.map(row => renderProjectRow(row)).join('') || '<tr><td colspan="5">Нет локальных проектов для синхронизации</td></tr>'}
            </tbody></table>
          </div>
          <div class="v4-doc-actions v4-sync-actions">
            <button type="button" class="btn-secondary" data-quote-sync="refresh">Обновить</button>
            <button type="button" class="btn-secondary" data-quote-sync="download-report">Скачать queue report</button>
            <button type="button" class="btn-secondary" data-quote-sync="download-queue">Скачать staged queue</button>
          </div>
          <details class="v4-json-details"><summary>JSON queue report</summary><pre>${escapeHtml(safeJson(report))}</pre></details>
        </div>`;
      root.querySelectorAll('[data-quote-sync]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.getAttribute('data-quote-sync'), btn)));
      root.querySelectorAll('[data-quote-sync-stage]').forEach(btn => btn.addEventListener('click', () => { stageProject(btn.getAttribute('data-quote-sync-stage'), opts); refresh(); }));
      root.querySelectorAll('[data-quote-sync-unstage]').forEach(btn => btn.addEventListener('click', () => { unstageProject(btn.getAttribute('data-quote-sync-unstage'), opts); refresh(); }));
      root.querySelectorAll('[data-quote-sync-dry-run]').forEach(btn => btn.addEventListener('click', () => downloadProjectDryRun(btn.getAttribute('data-quote-sync-dry-run'))));
    }
    function renderProjectRow(row) {
      const reasons = row.sync && Array.isArray(row.sync.reasons) ? row.sync.reasons : [];
      const status = row.sync && row.sync.status;
      const staged = status === STATUS.STAGED;
      return `<tr><td><b>${escapeHtml(row.projectName || 'Без названия')}</b><br><span class="v4-muted">${escapeHtml(row.quoteId || row.projectId)}</span></td><td>${escapeHtml(row.clientName || '—')}</td><td>${renderStatusBadge(row.sync)}</td><td>${reasons.slice(0, 3).map(reason => `<div class="v4-muted">${escapeHtml(reason)}</div>`).join('') || '<span class="v4-muted">готово</span>'}</td><td><div class="v4-actions" style="margin-top:0"><button type="button" class="btn-secondary" data-quote-sync-dry-run="${escapeHtml(row.projectId)}">Dry-run</button>${staged ? `<button type="button" class="btn-secondary" data-quote-sync-unstage="${escapeHtml(row.projectId)}">Убрать</button>` : `<button type="button" class="btn-secondary" data-quote-sync-stage="${escapeHtml(row.projectId)}">Stage</button>`}</div></td></tr>`;
    }
    function refresh() { state.report = buildQueueReport(opts); render(); }
    function handleAction(action) {
      if (action === 'refresh') return refresh();
      if (action === 'download-report') return downloadFile('feg_quote_sync_queue_report.json', safeJson(state.report));
      if (action === 'download-queue') return downloadFile('feg_quote_sync_staged_queue.json', safeJson(readQueue(opts.storage)));
    }
    function downloadProjectDryRun(projectId) {
      try {
        const report = buildProjectWriteDryRun(projectId, opts);
        downloadFile(`feg_quote_sync_dry_run_${toText(projectId) || 'project'}.json`, safeJson(report));
      } catch (err) {
        downloadFile('feg_quote_sync_dry_run_error.txt', err && err.message || 'dry-run error', 'text/plain;charset=utf-8');
      }
    }
    render();
    return root;
  }

  function downloadFile(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (_) {}
  }

  ROOT.QuoteServerSyncQueue = {
    QUEUE_VERSION,
    STORAGE_KEY,
    STATUS,
    readQueue,
    writeQueue,
    buildProjectSyncPayload,
    buildProjectWriteDryRun,
    getProjectSyncStatus,
    renderStatusBadge,
    stageProject,
    unstageProject,
    markProjectSynced,
    markProjectSyncError,
    buildQueueReport,
    renderQueueConsole
  };
})();
