(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const WAREHOUSE_OPERATIONS_HUB_VERSION = '3.9.0';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }

  function getModule(name) { return ROOT[name] || null; }
  function model() { return getModule('QuoteModel'); }
  function storage() { return getModule('QuoteProjectStorage'); }
  function draftStorage() { return getModule('QuoteDraftStorage'); }
  function reservationPlanner() { return getModule('ReservationPlanner'); }
  function movementPlanner() { return getModule('StockMovementPlanner'); }
  function workflowModule() { return getModule('WarehouseWorkflow'); }
  function subrentPlanner() { return getModule('SubrentPlanner'); }
  function auditLog() { return getModule('ProjectAuditLog'); }
  function readinessModule() { return getModule('ProjectReadinessChecklist'); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function projectRecordFrom(input) {
    if (input && input.type === 'feg-stage-pro-quote-project') return input;
    const q = normalizeQuote(input && input.quote ? input.quote : input || {});
    return storage() && storage().normalizeProjectRecord ? storage().normalizeProjectRecord({ quote: q }) : {
      projectId: q.id || '', quoteId: q.id || '', projectName: q.project && q.project.name || '', clientName: q.client && q.client.name || '', eventDate: q.venue && q.venue.date || '', status: q.status || 'draft', quote: q
    };
  }

  function findSavedWorkflow(quoteId) {
    const wf = workflowModule();
    if (!wf || !wf.listWorkflowDrafts) return null;
    const id = toText(quoteId);
    return wf.listWorkflowDrafts().find(row => row && [row.quoteId, row.quote_id].map(toText).includes(id)) || null;
  }

  function buildWorkflow(record, options) {
    const wf = workflowModule();
    const rec = projectRecordFrom(record);
    const saved = findSavedWorkflow(rec.quoteId);
    if (saved && !(options && options.ignoreSavedWorkflow)) return saved;
    return wf && wf.buildWarehouseWorkflow ? wf.buildWarehouseWorkflow(rec.quote || {}, options || {}) : null;
  }

  function buildOperationSnapshot(record, options) {
    const rec = projectRecordFrom(record);
    const q = normalizeQuote(rec.quote || {});
    const reservationPlan = reservationPlanner() && reservationPlanner().buildReservationPlan ? reservationPlanner().buildReservationPlan(q) : { rows: [], totals: {} };
    const workflow = buildWorkflow(rec, options || {}) || { status: 'draft', statusLabel: 'Черновик склада', warehouseAction: 'reserve', totals: {} };
    const action = workflow.warehouseAction || workflow.warehouse_action || (workflowModule() && workflowModule().getActionForStatus ? workflowModule().getActionForStatus(workflow.status) : 'reserve');
    const stockMovementPlan = movementPlanner() && movementPlanner().buildMovementPlan ? movementPlanner().buildMovementPlan(q, { action }) : { action, rows: [], totals: {} };
    const subrentPlan = subrentPlanner() && subrentPlanner().buildSubrentPlan ? subrentPlanner().buildSubrentPlan(reservationPlan) : { rows: [], totals: {} };
    const readiness = readinessModule() && readinessModule().buildChecklist ? readinessModule().buildChecklist(q) : null;
    const totals = reservationPlan && reservationPlan.totals || workflow.totals || {};
    const health = getWarehouseHealth({ reservationPlan, workflow, stockMovementPlan, subrentPlan, readiness });
    return {
      type: 'feg-stage-pro-warehouse-operation-snapshot',
      version: WAREHOUSE_OPERATIONS_HUB_VERSION,
      generatedAt: nowIso(),
      projectId: rec.projectId || '',
      quoteId: rec.quoteId || q.id || '',
      projectName: rec.projectName || q.project && q.project.name || 'Без названия',
      clientName: rec.clientName || q.client && q.client.name || 'клиент не указан',
      eventDate: rec.eventDate || q.venue && q.venue.date || '',
      projectStatus: rec.status || q.status || 'draft',
      warehouseStatus: workflow.status || 'draft',
      warehouseStatusLabel: workflow.statusLabel || workflow.status_label || '',
      warehouseAction: action,
      readiness,
      health,
      totals: {
        requestedQty: nonNegative(totals.requestedQty, 0),
        reservedQty: nonNegative(totals.reservedQty, 0),
        deficitQty: nonNegative(totals.deficitQty, 0),
        subrentQty: nonNegative(totals.subrentQty, 0),
        unmatchedRows: nonNegative(totals.unmatchedRows, 0),
        rows: nonNegative(totals.rows || (reservationPlan.rows || []).length, 0)
      },
      reservationPlan,
      stockMovementPlan,
      subrentPlan,
      warehouseWorkflow: workflow
    };
  }

  function getWarehouseHealth(data) {
    const source = data || {};
    const plan = source.reservationPlan || {};
    const workflow = source.workflow || {};
    const totals = plan.totals || workflow.totals || {};
    const readiness = source.readiness || {};
    const deficitQty = nonNegative(totals.deficitQty, 0);
    const subrentQty = nonNegative(totals.subrentQty, 0);
    const unmatchedRows = nonNegative(totals.unmatchedRows, 0);
    const readinessErrors = Array.isArray(readiness.errors) ? readiness.errors.length : nonNegative(readiness.errorCount, 0);
    if (workflow.status === 'closed') return { status: 'closed', label: 'Склад закрыт', level: 'ok' };
    if (workflow.status === 'issued') return { status: 'issued', label: 'Выдано', level: 'ok' };
    if (deficitQty > 0) return { status: 'deficit', label: `Дефицит: ${deficitQty}`, level: 'bad' };
    if (subrentQty > 0) return { status: 'subrent', label: `Субаренда: ${subrentQty}`, level: 'warn' };
    if (unmatchedRows > 0) return { status: 'unmatched', label: `Не сопоставлено: ${unmatchedRows}`, level: 'warn' };
    if (readinessErrors > 0) return { status: 'not_ready', label: 'Есть незаполненные поля', level: 'warn' };
    return { status: 'ready', label: 'Готово к складу', level: 'ok' };
  }

  function getWorkflowDraftMap() {
    const wf = workflowModule();
    if (!wf || !wf.listWorkflowDrafts) return new Map();
    try {
      return (wf.listWorkflowDrafts() || []).reduce((map, row) => {
        const id = toText(row && (row.quoteId || row.quote_id));
        if (id) map.set(id, row);
        return map;
      }, new Map());
    } catch (_) {
      return new Map();
    }
  }

  function buildOperationIndexSnapshot(row, options) {
    const src = row || {};
    const opts = options || {};
    const workflowMap = opts.workflowMap || getWorkflowDraftMap();
    const quoteId = toText(src.quoteId || src.quote && src.quote.id);
    const savedWorkflow = workflowMap.get(quoteId) || null;
    const bom = src.v4BomSummary || {};
    const totals = src.totals || {};
    const warehouseRows = nonNegative(bom.warehouse || bom.sharedBom || bom.quoteItems, 0);
    const reservedQty = nonNegative(totals.reservedQty || totals.warehouseReservedQty, 0);
    const deficitQty = nonNegative(totals.deficitQty || totals.warehouseDeficitQty, 0);
    const subrentQty = nonNegative(totals.subrentQty || totals.warehouseSubrentQty, 0);
    const unmatchedRows = nonNegative(totals.unmatchedRows || totals.warehouseUnmatchedRows, 0);
    const warehouseStatus = toText(savedWorkflow && savedWorkflow.status) || 'draft';
    const warehouseStatusLabel = toText(savedWorkflow && (savedWorkflow.statusLabel || savedWorkflow.status_label)) || 'Черновик склада';
    const health = getWarehouseHealth({
      reservationPlan: { totals: { deficitQty, subrentQty, unmatchedRows } },
      workflow: { status: warehouseStatus },
      readiness: null
    });
    return {
      type: 'feg-stage-pro-warehouse-operation-index-snapshot',
      version: WAREHOUSE_OPERATIONS_HUB_VERSION,
      generatedAt: nowIso(),
      projectId: src.projectId || '',
      quoteId,
      projectName: src.projectName || 'Без названия',
      clientName: src.clientName || 'клиент не указан',
      eventDate: src.eventDate || '',
      projectStatus: src.status || 'draft',
      warehouseStatus,
      warehouseStatusLabel,
      warehouseAction: savedWorkflow && (savedWorkflow.warehouseAction || savedWorkflow.warehouse_action) || 'reserve',
      readiness: null,
      health,
      totals: {
        requestedQty: nonNegative(totals.requestedQty || warehouseRows, 0),
        reservedQty,
        deficitQty,
        subrentQty,
        unmatchedRows,
        rows: warehouseRows
      },
      reservationPlan: { rows: [], totals: { rows: warehouseRows, reservedQty, deficitQty, subrentQty, unmatchedRows } },
      stockMovementPlan: { action: 'reserve', rows: [], totals: {} },
      subrentPlan: { rows: [], totals: {} },
      warehouseWorkflow: savedWorkflow || { status: warehouseStatus, statusLabel: warehouseStatusLabel, timeline: [] },
      indexOnly: true
    };
  }

  function listOperationProjects(filters) {
    const opts = filters || {};
    const store = storage();
    const rows = opts.full && store && store.listProjects
      ? store.listProjects(opts.projectFilters || {})
      : (store && store.listProjectIndex ? store.listProjectIndex(opts.projectFilters || {}) : (store && store.listProjects ? store.listProjects(opts.projectFilters || {}) : []));
    const workflowMap = getWorkflowDraftMap();
    return rows.map(row => opts.full ? buildOperationSnapshot(row, opts) : buildOperationIndexSnapshot(row, Object.assign({}, opts, { workflowMap }))).filter(snapshot => {
      if (opts.warehouseStatus && snapshot.warehouseStatus !== opts.warehouseStatus) return false;
      if (opts.onlyActionable && ['closed', 'cancelled'].includes(snapshot.warehouseStatus)) return false;
      if (opts.query) {
        const q = toText(opts.query).toLowerCase();
        const haystack = [snapshot.projectName, snapshot.clientName, snapshot.eventDate, snapshot.projectStatus, snapshot.warehouseStatusLabel, snapshot.health && snapshot.health.label].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function buildOperationsDashboard(filters) {
    const rows = listOperationProjects(filters || {});
    const totals = rows.reduce((acc, row) => {
      acc.projects += 1;
      acc.requestedQty += nonNegative(row.totals.requestedQty, 0);
      acc.reservedQty += nonNegative(row.totals.reservedQty, 0);
      acc.deficitQty += nonNegative(row.totals.deficitQty, 0);
      acc.subrentQty += nonNegative(row.totals.subrentQty, 0);
      acc.unmatchedRows += nonNegative(row.totals.unmatchedRows, 0);
      acc[row.health && row.health.status || 'ready'] = (acc[row.health && row.health.status || 'ready'] || 0) + 1;
      return acc;
    }, { projects: 0, requestedQty: 0, reservedQty: 0, deficitQty: 0, subrentQty: 0, unmatchedRows: 0 });
    return { type: 'feg-stage-pro-warehouse-operations-dashboard', version: WAREHOUSE_OPERATIONS_HUB_VERSION, generatedAt: nowIso(), totals, rows, fastIndex: !(filters && filters.full) };
  }

  function transitionProjectWarehouse(projectId, nextStatus, options) {
    if (!storage() || !storage().loadProject) throw new Error('QuoteProjectStorage is not available.');
    const record = storage().loadProject(projectId);
    if (!record) throw new Error('Проект не найден.');
    const wf = workflowModule();
    if (!wf || !wf.transitionWorkflow) throw new Error('WarehouseWorkflow is not available.');
    const current = buildWorkflow(record, { ignoreSavedWorkflow: false });
    const transitioned = wf.transitionWorkflow(current, nextStatus, options || {});
    wf.saveWorkflowDraft && wf.saveWorkflowDraft(transitioned);
    return buildOperationSnapshot(record, { ignoreSavedWorkflow: false });
  }

  function exportWarehousePack(recordOrSnapshot) {
    const snapshot = recordOrSnapshot && recordOrSnapshot.type === 'feg-stage-pro-warehouse-operation-snapshot'
      ? recordOrSnapshot
      : buildOperationSnapshot(recordOrSnapshot || {});
    let projectExport = null;
    if (auditLog() && auditLog().buildProjectExportPack && snapshot.projectId && storage() && storage().loadProject) {
      const record = storage().loadProject(snapshot.projectId);
      if (record) projectExport = auditLog().buildProjectExportPack(record);
    }
    return {
      type: 'feg-stage-pro-warehouse-operation-pack',
      version: WAREHOUSE_OPERATIONS_HUB_VERSION,
      generatedAt: nowIso(),
      projectId: snapshot.projectId,
      quoteId: snapshot.quoteId,
      projectName: snapshot.projectName,
      clientName: snapshot.clientName,
      warehouseStatus: snapshot.warehouseStatus,
      health: clone(snapshot.health),
      reservation_plan: clone(snapshot.reservationPlan),
      subrent_plan: clone(snapshot.subrentPlan),
      stock_movement_plan: clone(snapshot.stockMovementPlan),
      warehouse_workflow: clone(snapshot.warehouseWorkflow),
      project_export_pack: projectExport
    };
  }

  function warehousePackToText(packOrSnapshot) {
    const pack = packOrSnapshot && packOrSnapshot.type === 'feg-stage-pro-warehouse-operation-pack' ? packOrSnapshot : exportWarehousePack(packOrSnapshot || {});
    const totals = pack.reservation_plan && pack.reservation_plan.totals || {};
    const lines = [];
    lines.push('Складской пакет проекта');
    lines.push('');
    lines.push(`Проект: ${pack.projectName || '—'}`);
    lines.push(`Клиент: ${pack.clientName || '—'}`);
    lines.push(`Статус склада: ${pack.warehouseStatus || 'draft'}`);
    lines.push(`Готовность: ${pack.health && pack.health.label || '—'}`);
    lines.push('');
    lines.push(`Нужно: ${nonNegative(totals.requestedQty, 0)}`);
    lines.push(`Резерв: ${nonNegative(totals.reservedQty, 0)}`);
    lines.push(`Дефицит: ${nonNegative(totals.deficitQty, 0)}`);
    lines.push(`Субаренда: ${nonNegative(totals.subrentQty, 0)}`);
    lines.push(`Не сопоставлено: ${nonNegative(totals.unmatchedRows, 0)}`);
    lines.push('');
    lines.push('Следующие складские операции:');
    const movements = pack.stock_movement_plan && Array.isArray(pack.stock_movement_plan.rows) ? pack.stock_movement_plan.rows : [];
    movements.slice(0, 80).forEach(row => lines.push(`- ${row.action || 'reserve'} · ${row.code || row.itemId || '—'} · ${row.name || '—'} · ${row.qty || row.quantity || row.reservedQty || 0}`));
    return lines.join('\n');
  }

  function renderHub(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = root._fegWarehouseHubState || { query: '', warehouseStatus: '', selectedProjectId: '' };
    const dashboard = buildOperationsDashboard({ query: state.query, warehouseStatus: state.warehouseStatus, onlyActionable: false });
    const selectedIndex = dashboard.rows.find(row => row.projectId === state.selectedProjectId) || dashboard.rows[0] || null;
    let selected = null;
    if (selectedIndex && selectedIndex.projectId && storage() && storage().loadProject) {
      try { selected = buildOperationSnapshot(storage().loadProject(selectedIndex.projectId), { ignoreSavedWorkflow: false }); } catch (_) { selected = null; }
    }
    if (!selected) selected = selectedIndex;
    root.innerHTML = `
      <div class="v4-card v4-warehouse-ops" data-v4-warehouse-operations-hub>
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">Warehouse & Project Operations Hub</div>
            <h3>Склад / Операции</h3>
            <p class="v4-muted">Единый рабочий экран склада: проекты, готовность, дефицит, субаренда, резерв, движения и workflow.</p>
          </div>
          <div class="v4-auth-actions">
            <button type="button" class="btn-secondary" data-wh-open-projects>Проекты</button>
            <button type="button" class="btn-secondary" data-wh-open-equipment>База оборудования</button>
            <button type="button" class="btn-secondary" data-wh-export-dashboard>Export dashboard</button>
          </div>
        </div>
        <div class="v4-summary-grid v4-warehouse-ops-summary">
          <div class="v4-mini"><b>${formatNumber(dashboard.totals.projects)}</b><span>Проектов в работе</span></div>
          <div class="v4-mini"><b>${formatNumber(dashboard.totals.reservedQty)}</b><span>К резерву / резерв</span></div>
          <div class="v4-mini"><b>${formatNumber(dashboard.totals.deficitQty)}</b><span>Дефицит</span></div>
          <div class="v4-mini"><b>${formatNumber(dashboard.totals.subrentQty)}</b><span>Субаренда</span></div>
        </div>
        <div class="v4-note v4-warehouse-ops-filters">
          <label>Поиск<input type="search" data-wh-query value="${escapeAttr(state.query)}" placeholder="проект, клиент, статус"></label>
          <label>Статус склада<select data-wh-status>${renderStatusOptions(state.warehouseStatus)}</select></label>
          <button type="button" class="btn-secondary" data-wh-reset>Сбросить</button>
        </div>
        <div class="v4-warehouse-ops-layout">
          <div class="v4-warehouse-project-list">
            ${dashboard.rows.length ? dashboard.rows.slice(0, 80).map(row => renderProjectButton(row, selectedIndex && selectedIndex.projectId === row.projectId)).join('') : '<div class="v4-note">Пока нет сохранённых проектов. Сохрани смету в «Проекты / история».</div>'}
            ${dashboard.rows.length > 80 ? `<div class="v4-note">Показаны первые 80 проектов из ${formatNumber(dashboard.rows.length)}. Используй поиск или фильтр статуса.</div>` : ''}
          </div>
          <div class="v4-warehouse-detail">
            ${selected ? renderOperationDetail(selected) : '<div class="v4-note">Выбери проект для складских операций.</div>'}
          </div>
        </div>
      </div>`;
    bindHub(root, opts, dashboard, selected);
    return root;
  }

  function renderStatusOptions(selected) {
    const statuses = workflowModule() && workflowModule().WORKFLOW_STATUSES ? workflowModule().WORKFLOW_STATUSES : [];
    return ['<option value="">Все статусы</option>'].concat(statuses.map(row => `<option value="${escapeAttr(row.id)}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(row.label)}</option>`)).join('');
  }

  function renderProjectButton(row, active) {
    return `<button type="button" class="v4-warehouse-project ${active ? 'active' : ''}" data-wh-select="${escapeAttr(row.projectId)}">
      <span class="v4-project-health v4-project-health--${escapeAttr(row.health && row.health.level || 'info')}">${escapeHtml(row.health && row.health.label || '—')}</span>
      <b>${escapeHtml(row.projectName)}</b>
      <small>${escapeHtml(row.clientName)} · ${escapeHtml(row.eventDate || 'без даты')}</small>
      <span>${escapeHtml(row.warehouseStatusLabel || row.warehouseStatus)} · резерв ${formatNumber(row.totals.reservedQty)} · дефицит ${formatNumber(row.totals.deficitQty)}</span>
    </button>`;
  }

  function renderOperationDetail(snapshot) {
    const next = workflowModule() && workflowModule().getNextStatuses ? workflowModule().getNextStatuses(snapshot.warehouseStatus) : [];
    const movements = snapshot.stockMovementPlan && Array.isArray(snapshot.stockMovementPlan.rows) ? snapshot.stockMovementPlan.rows : [];
    const reserveRows = snapshot.reservationPlan && Array.isArray(snapshot.reservationPlan.rows) ? snapshot.reservationPlan.rows : [];
    const subrentRows = snapshot.subrentPlan && Array.isArray(snapshot.subrentPlan.rows) ? snapshot.subrentPlan.rows : [];
    return `
      <div class="v4-warehouse-detail-head">
        <div>
          <div class="v4-kicker">project operations</div>
          <h4>${escapeHtml(snapshot.projectName)}</h4>
          <p class="v4-muted">${escapeHtml(snapshot.clientName)} · ${escapeHtml(snapshot.eventDate || 'дата не указана')}</p>
        </div>
        <span class="v4-project-health v4-project-health--${escapeAttr(snapshot.health && snapshot.health.level || 'info')}">${escapeHtml(snapshot.health && snapshot.health.label || '—')}</span>
      </div>
      <div class="v4-equipment-card-grid v4-warehouse-metrics">
        <div><span>Статус склада</span><b>${escapeHtml(snapshot.warehouseStatusLabel || snapshot.warehouseStatus)}</b></div>
        <div><span>Операция</span><b>${escapeHtml(snapshot.warehouseAction)}</b></div>
        <div><span>Нужно</span><b>${formatNumber(snapshot.totals.requestedQty)}</b></div>
        <div><span>Резерв</span><b>${formatNumber(snapshot.totals.reservedQty)}</b></div>
        <div><span>Дефицит</span><b>${formatNumber(snapshot.totals.deficitQty)}</b></div>
        <div><span>Субаренда</span><b>${formatNumber(snapshot.totals.subrentQty)}</b></div>
      </div>
      <div class="v4-actions">
        ${next.map(row => `<button type="button" class="btn" data-wh-transition="${escapeAttr(row.id)}">${escapeHtml(row.label)}</button>`).join('') || '<span class="v4-muted">Нет следующих статусов</span>'}
        <button type="button" class="btn-secondary" data-wh-open="${escapeAttr(snapshot.projectId)}">Открыть смету</button>
        <button type="button" class="btn-secondary" data-wh-export-pack="${escapeAttr(snapshot.projectId)}">Складской пакет</button>
      </div>
      <div class="v4-warehouse-tabs">
        <details open><summary>Резерв · ${formatNumber(reserveRows.length)}</summary>${renderRowsTable(reserveRows, 'reserve')}</details>
        <details ${snapshot.totals.deficitQty ? 'open' : ''}><summary>Дефицит / субаренда · ${formatNumber(subrentRows.length)}</summary>${renderRowsTable(subrentRows, 'subrent')}</details>
        <details><summary>Движение склада · ${formatNumber(movements.length)}</summary>${renderRowsTable(movements, 'movement')}</details>
        <details><summary>Workflow timeline</summary>${renderWorkflowTimeline(snapshot.warehouseWorkflow)}</details>
      </div>`;
  }

  function renderRowsTable(rows, kind) {
    const safe = Array.isArray(rows) ? rows : [];
    if (!safe.length) return '<div class="v4-note">Нет строк.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--compact v4-table--warehouse-ops"><thead><tr><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Статус</th></tr></thead><tbody>${safe.slice(0, 120).map(row => `<tr><td><code>${escapeHtml(row.code || row.itemId || row.id || '—')}</code></td><td><b>${escapeHtml(row.name || row.title || '—')}</b><br><span class="v4-muted">${escapeHtml(row.sectionTitle || row.supplierName || row.action || kind)}</span></td><td class="v4-num-cell">${formatNumber(row.qty || row.quantity || row.requestedQty || row.reservedQty || row.subrentQty || 0)}</td><td>${escapeHtml(row.status || row.inventoryStatus || row.sourceType || row.action || '—')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderWorkflowTimeline(workflow) {
    const rows = workflow && Array.isArray(workflow.timeline) ? workflow.timeline : [];
    if (!rows.length) return '<div class="v4-note">Timeline пока пуст.</div>';
    return `<ul class="v4-project-timeline">${rows.slice(0, 12).map(event => `<li><span><b>${escapeHtml(event.statusLabel || event.status || event.action || 'workflow')}</b><small>${escapeHtml(event.note || event.actorName || '')}</small></span><time>${escapeHtml(formatDate(event.at))}</time></li>`).join('')}</ul>`;
  }

  function bindHub(root, opts, dashboard, selected) {
    const refresh = () => renderHub(root, opts);
    const query = root.querySelector('[data-wh-query]');
    const status = root.querySelector('[data-wh-status]');
    const updateState = () => { root._fegWarehouseHubState = { ...(root._fegWarehouseHubState || {}), query: query ? query.value : '', warehouseStatus: status ? status.value : '' }; refresh(); };
    if (query) query.addEventListener('input', updateState);
    if (status) status.addEventListener('change', updateState);
    const reset = root.querySelector('[data-wh-reset]');
    if (reset) reset.addEventListener('click', () => { root._fegWarehouseHubState = { query: '', warehouseStatus: '', selectedProjectId: '' }; refresh(); });
    root.querySelectorAll('[data-wh-select]').forEach(btn => btn.addEventListener('click', () => { root._fegWarehouseHubState = { ...(root._fegWarehouseHubState || {}), selectedProjectId: btn.getAttribute('data-wh-select') }; refresh(); }));
    root.querySelectorAll('[data-wh-transition]').forEach(btn => btn.addEventListener('click', () => {
      if (!selected) return;
      try {
        transitionProjectWarehouse(selected.projectId, btn.getAttribute('data-wh-transition'), { note: 'Изменено из Warehouse Operations Hub' });
        toast('Статус склада обновлён');
        refresh();
      } catch (err) { toast(err && err.message ? err.message : 'Не удалось изменить статус склада'); }
    }));
    const openProjects = root.querySelector('[data-wh-open-projects]');
    if (openProjects) openProjects.addEventListener('click', () => opts.onOpenProjects && opts.onOpenProjects());
    const openEquipment = root.querySelector('[data-wh-open-equipment]');
    if (openEquipment) openEquipment.addEventListener('click', () => opts.onOpenEquipment && opts.onOpenEquipment());
    root.querySelectorAll('[data-wh-open]').forEach(btn => btn.addEventListener('click', () => opts.onOpenProject && opts.onOpenProject(btn.getAttribute('data-wh-open'))));
    root.querySelectorAll('[data-wh-export-pack]').forEach(btn => btn.addEventListener('click', () => {
      const projectId = btn.getAttribute('data-wh-export-pack');
      const record = storage() && storage().loadProject ? storage().loadProject(projectId) : null;
      const pack = exportWarehousePack(record || (dashboard.rows || []).find(row => row.projectId === projectId) || {});
      const text = JSON.stringify(pack, null, 2);
      downloadText(`feg-warehouse-pack-${pack.projectId || 'project'}.json`, text);
      copyText(text);
      toast('Складской пакет экспортирован');
    }));
    const exportDashboard = root.querySelector('[data-wh-export-dashboard]');
    if (exportDashboard) exportDashboard.addEventListener('click', () => {
      const text = JSON.stringify(dashboard, null, 2);
      downloadText('feg-warehouse-operations-dashboard.json', text);
      copyText(text);
      toast('Warehouse dashboard экспортирован');
    });
  }

  function formatNumber(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(nonNegative(value, 0)); }
  function formatDate(value) { return toText(value).slice(0, 16).replace('T', ' ') || '—'; }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
  function toast(message) { if (ROOT.ToastManager && ROOT.ToastManager.show) ROOT.ToastManager.show(message); }
  function copyText(text) { try { if (GLOBAL.navigator && GLOBAL.navigator.clipboard) GLOBAL.navigator.clipboard.writeText(String(text || '')); } catch (_) {} }
  function downloadText(filename, text) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  ROOT.WarehouseOperationsHub = {
    WAREHOUSE_OPERATIONS_HUB_VERSION,
    buildOperationSnapshot,
    buildOperationsDashboard,
    listOperationProjects,
    buildOperationIndexSnapshot,
    transitionProjectWarehouse,
    exportWarehousePack,
    warehousePackToText,
    renderHub
  };
})();
