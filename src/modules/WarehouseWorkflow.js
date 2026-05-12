(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const WAREHOUSE_WORKFLOW_VERSION = '1.0.0';
  const WAREHOUSE_WORKFLOW_STORAGE_KEY = 'fegV4WarehouseWorkflowDrafts';

  const WORKFLOW_STATUSES = Object.freeze([
    { id: 'draft', label: 'Черновик склада', order: 0 },
    { id: 'ready_to_pick', label: 'К сборке', order: 10 },
    { id: 'picking', label: 'Собирается', order: 20 },
    { id: 'picked', label: 'Собрано', order: 30 },
    { id: 'issued', label: 'Выдано', order: 40 },
    { id: 'returned', label: 'Возвращено', order: 50 },
    { id: 'closed', label: 'Закрыто', order: 60 },
    { id: 'cancelled', label: 'Отменено', order: 99 }
  ]);

  const STATUS_MAP = WORKFLOW_STATUSES.reduce((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});

  const ACTION_BY_STATUS = Object.freeze({
    draft: 'reserve',
    ready_to_pick: 'reserve',
    picking: 'reserve',
    picked: 'reserve',
    issued: 'issue',
    returned: 'return',
    closed: 'return',
    cancelled: 'cancel_reserve'
  });

  function model() { return ROOT.QuoteModel || null; }
  function reservationPlanner() { return ROOT.ReservationPlanner || null; }
  function stockMovementPlanner() { return ROOT.StockMovementPlanner || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function normalizeStatus(status) {
    const value = toText(status || 'draft').toLowerCase();
    return STATUS_MAP[value] ? value : 'draft';
  }

  function getStatusLabel(status) {
    const key = normalizeStatus(status);
    return STATUS_MAP[key] ? STATUS_MAP[key].label : STATUS_MAP.draft.label;
  }

  function getNextStatuses(status) {
    const key = normalizeStatus(status);
    const map = {
      draft: ['ready_to_pick', 'cancelled'],
      ready_to_pick: ['picking', 'cancelled'],
      picking: ['picked', 'cancelled'],
      picked: ['issued', 'cancelled'],
      issued: ['returned'],
      returned: ['closed'],
      closed: [],
      cancelled: []
    };
    return (map[key] || []).map(id => STATUS_MAP[id]).filter(Boolean);
  }

  function makeWorkflowId(quoteId) {
    return `warehouse-${toText(quoteId || 'quote').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '')}`;
  }

  function getRequestedWarehouseRows(quote, options) {
    const q = normalizeQuote(quote);
    const planner = reservationPlanner();
    const plan = options && options.reservationPlan ? options.reservationPlan : (planner && planner.buildReservationPlan ? planner.buildReservationPlan(q, options || {}) : { rows: [], totals: {} });
    return { plan, rows: Array.isArray(plan.rows) ? plan.rows : [] };
  }

  function getActionForStatus(status) {
    return ACTION_BY_STATUS[normalizeStatus(status)] || 'reserve';
  }

  function summarizeWorkflowRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      acc.rows += 1;
      acc.requestedQty += nonNegative(row.requestedQty, 0);
      acc.reservedQty += nonNegative(row.reservedQty, 0);
      acc.deficitQty += nonNegative(row.deficitQty, 0);
      acc.subrentQty += nonNegative(row.subrentQty, 0);
      acc.unmatchedRows += row.status === 'unmatched' ? 1 : 0;
      acc.deficitRows += nonNegative(row.deficitQty, 0) > 0 ? 1 : 0;
      acc.subrentRows += nonNegative(row.subrentQty, 0) > 0 || row.status === 'subrent' ? 1 : 0;
      return acc;
    }, { rows: 0, requestedQty: 0, reservedQty: 0, deficitQty: 0, subrentQty: 0, unmatchedRows: 0, deficitRows: 0, subrentRows: 0 });
  }

  function makeTimelineEvent(action, status, actor, note) {
    const user = actor || {};
    return {
      id: `wh-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      action: toText(action || 'workflow_updated'),
      status: normalizeStatus(status),
      statusLabel: getStatusLabel(status),
      status_label: getStatusLabel(status),
      actorId: toText(user.id || user.userId || user.email || 'local-user'),
      actor_id: toText(user.id || user.userId || user.email || 'local-user'),
      actorRole: toText(user.role || 'demo'),
      actor_role: toText(user.role || 'demo'),
      actorName: toText(user.name || user.email || 'Demo user'),
      actor_name: toText(user.name || user.email || 'Demo user'),
      note: toText(note),
      at: nowIso()
    };
  }

  function buildWarehouseWorkflow(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const status = normalizeStatus(opts.status || q.warehouseStatus || q.warehouse_status || 'draft');
    const reservationData = getRequestedWarehouseRows(q, opts);
    const movementPlanner = stockMovementPlanner();
    const action = getActionForStatus(status);
    const movementPlan = opts.stockMovementPlan || (movementPlanner && movementPlanner.buildMovementPlan ? movementPlanner.buildMovementPlan(q, { action }) : { rows: [], totals: {}, action });
    const workflow = {
      type: 'feg-stage-pro-warehouse-workflow',
      version: WAREHOUSE_WORKFLOW_VERSION,
      id: makeWorkflowId(q.id),
      workflowId: makeWorkflowId(q.id),
      workflow_id: makeWorkflowId(q.id),
      generatedAt: nowIso(),
      generated_at: nowIso(),
      workspaceId: toText(q.workspaceId || opts.workspaceId || 'demo-workspace'),
      workspace_id: toText(q.workspaceId || opts.workspaceId || 'demo-workspace'),
      quoteId: toText(q.id),
      quote_id: toText(q.id),
      projectName: q.project && q.project.name || '',
      project_name: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      client_name: q.client && q.client.name || '',
      eventDate: q.venue && q.venue.date || '',
      event_date: q.venue && q.venue.date || '',
      status,
      statusLabel: getStatusLabel(status),
      status_label: getStatusLabel(status),
      nextStatuses: getNextStatuses(status).map(row => ({ id: row.id, label: row.label })),
      next_statuses: getNextStatuses(status).map(row => row.id),
      warehouseAction: action,
      warehouse_action: action,
      totals: summarizeWorkflowRows(reservationData.rows),
      reservationPlan: reservationData.plan,
      reservation_plan: reservationData.plan,
      stockMovementPlan: movementPlan,
      stock_movement_plan: movementPlan,
      timeline: Array.isArray(opts.timeline) ? clone(opts.timeline) : [makeTimelineEvent('workflow_created', status, opts.actor, 'Локальный черновик складского workflow')],
      notes: [
        'Это локальный workflow склада. Он не меняет остатки автоматически.',
        'Статусы нужны для подготовки будущих операций reservations / stock_movements в backend.'
      ]
    };
    return workflow;
  }

  function transitionWorkflow(workflowOrQuote, nextStatus, options) {
    const opts = options || {};
    const current = workflowOrQuote && workflowOrQuote.type === 'feg-stage-pro-warehouse-workflow'
      ? clone(workflowOrQuote)
      : buildWarehouseWorkflow(workflowOrQuote || {}, opts);
    const target = normalizeStatus(nextStatus);
    const allowed = getNextStatuses(current.status).map(row => row.id);
    if (!allowed.includes(target) && opts.force !== true && current.status !== target) {
      return Object.assign({}, current, {
        transitionError: `Переход ${current.status} → ${target} не разрешён`,
        transition_error: `Переход ${current.status} → ${target} не разрешён`
      });
    }
    current.status = target;
    current.statusLabel = getStatusLabel(target);
    current.status_label = getStatusLabel(target);
    current.nextStatuses = getNextStatuses(target).map(row => ({ id: row.id, label: row.label }));
    current.next_statuses = getNextStatuses(target).map(row => row.id);
    current.warehouseAction = getActionForStatus(target);
    current.warehouse_action = getActionForStatus(target);
    current.updatedAt = nowIso();
    current.updated_at = current.updatedAt;
    current.timeline = Array.isArray(current.timeline) ? current.timeline : [];
    current.timeline.unshift(makeTimelineEvent('workflow_status_changed', target, opts.actor, opts.note || `Статус склада: ${getStatusLabel(target)}`));
    return current;
  }

  function workflowToBackendRow(workflow) {
    const row = workflow && workflow.type === 'feg-stage-pro-warehouse-workflow' ? workflow : buildWarehouseWorkflow(workflow || {});
    return {
      id: row.workflow_id || row.workflowId || row.id,
      workspace_id: row.workspace_id || row.workspaceId,
      quote_id: row.quote_id || row.quoteId,
      project_name: row.project_name || row.projectName,
      client_name: row.client_name || row.clientName,
      status: row.status,
      status_label: row.status_label || row.statusLabel,
      warehouse_action: row.warehouse_action || row.warehouseAction,
      totals: clone(row.totals || {}),
      reservation_plan: clone(row.reservation_plan || row.reservationPlan || null),
      stock_movement_plan: clone(row.stock_movement_plan || row.stockMovementPlan || null),
      timeline: clone(row.timeline || []),
      generated_at: row.generated_at || row.generatedAt || nowIso(),
      updated_at: row.updated_at || row.updatedAt || row.generated_at || row.generatedAt || nowIso()
    };
  }

  function workflowToText(input) {
    const wf = input && input.type === 'feg-stage-pro-warehouse-workflow' ? input : buildWarehouseWorkflow(input || {});
    const lines = [];
    lines.push('Складской workflow проекта');
    lines.push('');
    lines.push(`Проект: ${wf.projectName || '—'}`);
    lines.push(`Клиент: ${wf.clientName || '—'}`);
    lines.push(`Дата: ${wf.eventDate || '—'}`);
    lines.push(`Статус склада: ${wf.statusLabel || getStatusLabel(wf.status)}`);
    lines.push(`Следующее действие: ${wf.warehouseAction || getActionForStatus(wf.status)}`);
    lines.push('');
    lines.push(`Строк склада: ${nonNegative(wf.totals && wf.totals.rows, 0)}`);
    lines.push(`Нужно: ${nonNegative(wf.totals && wf.totals.requestedQty, 0)}`);
    lines.push(`Резерв: ${nonNegative(wf.totals && wf.totals.reservedQty, 0)}`);
    lines.push(`Дефицит: ${nonNegative(wf.totals && wf.totals.deficitQty, 0)}`);
    lines.push(`Субаренда: ${nonNegative(wf.totals && wf.totals.subrentQty, 0)}`);
    lines.push('');
    lines.push('Timeline:');
    (wf.timeline || []).slice(0, 12).forEach(event => {
      lines.push(`- ${event.at || '—'} · ${event.statusLabel || event.status || '—'} · ${event.actorName || '—'}${event.note ? ` · ${event.note}` : ''}`);
    });
    if (Array.isArray(wf.notes)) {
      lines.push('');
      wf.notes.forEach(note => lines.push(`Примечание: ${note}`));
    }
    return lines.join('\n');
  }

  function readDrafts(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(WAREHOUSE_WORKFLOW_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveWorkflowDraft(workflow, storage) {
    const wf = workflow && workflow.type === 'feg-stage-pro-warehouse-workflow' ? workflow : buildWarehouseWorkflow(workflow || {});
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return wf;
    const rows = readDrafts(store).filter(row => row && row.quoteId !== wf.quoteId && row.quote_id !== wf.quote_id);
    rows.unshift(wf);
    store.setItem(WAREHOUSE_WORKFLOW_STORAGE_KEY, JSON.stringify(rows.slice(0, 50)));
    return wf;
  }

  function listWorkflowDrafts(storage) {
    return readDrafts(storage);
  }

  function exportWorkflow(quoteOrWorkflow, options) {
    const wf = quoteOrWorkflow && quoteOrWorkflow.type === 'feg-stage-pro-warehouse-workflow' ? quoteOrWorkflow : buildWarehouseWorkflow(quoteOrWorkflow || {}, options || {});
    return JSON.stringify(wf, null, 2);
  }

  ROOT.WarehouseWorkflow = {
    WAREHOUSE_WORKFLOW_VERSION,
    WAREHOUSE_WORKFLOW_STORAGE_KEY,
    WORKFLOW_STATUSES,
    normalizeStatus,
    getStatusLabel,
    getNextStatuses,
    getActionForStatus,
    buildWarehouseWorkflow,
    transitionWorkflow,
    workflowToBackendRow,
    workflowToText,
    exportWorkflow,
    saveWorkflowDraft,
    listWorkflowDrafts
  };
})();
