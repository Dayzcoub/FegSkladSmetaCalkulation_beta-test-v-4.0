(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function storage() { return ROOT.QuoteProjectStorage || null; }
  function model() { return ROOT.QuoteModel || null; }

  const ACTION_LABELS = Object.freeze({
    project_created: 'Проект создан',
    project_saved: 'Проект сохранён',
    status_changed: 'Статус изменён',
    client_applied: 'Клиент применён',
    imported: 'Импортирован',
    project_restored: 'Проект открыт',
    project_updated: 'Проект обновлён'
  });

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }

  function normalizeTimelineEvent(event) {
    const src = event || {};
    const payload = src.payload || {};
    const type = toText(src.type || src.action || payload.action || 'project_updated') || 'project_updated';
    return {
      id: toText(src.id) || `timeline-${Math.random().toString(36).slice(2, 9)}`,
      type,
      action: type,
      label: ACTION_LABELS[type] || type.replace(/_/g, ' '),
      at: toText(src.at || src.createdAt || src.timestamp) || new Date().toISOString(),
      actorName: toText(payload.actorName || src.actorName || src.actor || ''),
      actorRole: toText(payload.actorRole || src.actorRole || ''),
      from: toText(payload.from || src.from || ''),
      to: toText(payload.to || src.to || ''),
      note: toText(payload.note || src.note || ''),
      payload: clone(payload)
    };
  }

  function getTimeline(recordOrId, limit) {
    let record = recordOrId;
    if (typeof recordOrId === 'string' && storage() && storage().loadProject) record = storage().loadProject(recordOrId);
    const history = record && record.quote && Array.isArray(record.quote.history) ? record.quote.history : [];
    const rows = history.map(normalizeTimelineEvent).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    return limit ? rows.slice(0, limit) : rows;
  }

  function getLastEvent(recordOrId) {
    return getTimeline(recordOrId, 1)[0] || null;
  }

  function getProjectHealth(record) {
    const rec = record || {};
    const validation = rec.validation || {};
    const errors = Array.isArray(validation.errors) ? validation.errors.length : 0;
    const status = rec.status || rec.quote && rec.quote.status || 'draft';
    if (status === 'confirmed') return { level: 'ok', label: 'Готов к работе', note: 'Проект подтверждён' };
    if (status === 'sent') return { level: 'info', label: 'Ожидает ответа', note: 'КП отправлено клиенту' };
    if (errors > 0) return { level: 'warn', label: 'Нужно заполнить', note: `${errors} обязательных поля/шага требуют внимания` };
    if (status === 'cancelled') return { level: 'muted', label: 'Отменён', note: 'Проект отменён' };
    if (status === 'completed') return { level: 'ok', label: 'Завершён', note: 'Проект выполнен' };
    return { level: 'draft', label: 'Черновик', note: 'Можно продолжать расчёт' };
  }

  function summarizeRecord(record) {
    const rec = record || {};
    const quote = rec.quote || {};
    const totals = rec.totals || quote.totals || {};
    const timeline = getTimeline(rec, 4);
    const lastEvent = timeline[0] || null;
    return {
      projectId: rec.projectId || quote.id || '',
      quoteId: rec.quoteId || quote.id || '',
      status: rec.status || quote.status || 'draft',
      statusLabel: statusLabel(rec.status || quote.status),
      clientName: rec.clientName || quote.client && quote.client.name || 'клиент не указан',
      clientPhone: rec.clientPhone || quote.client && (quote.client.phone || quote.client.contactPhone) || '',
      clientEmail: rec.clientEmail || quote.client && quote.client.email || '',
      projectName: rec.projectName || quote.project && quote.project.name || 'Без названия',
      venueName: rec.venueName || quote.venue && quote.venue.name || '',
      venueAddress: rec.venueAddress || quote.venue && quote.venue.address || '',
      eventDate: rec.eventDate || quote.venue && quote.venue.date || '',
      total: Number(totals.total || 0),
      weightKg: Number(totals.weightKg || 0),
      powerW: Number(totals.powerW || 0),
      updatedAt: rec.updatedAt || quote.updatedAt || '',
      health: getProjectHealth(rec),
      lastEvent,
      timeline
    };
  }

  function renderTimelineList(recordOrId, options) {
    const opts = options || {};
    const rows = getTimeline(recordOrId, opts.limit || 5);
    if (!rows.length) return '<div class="v4-note v4-project-timeline-empty">История действий пока пустая.</div>';
    return `<ol class="v4-project-timeline">${rows.map(renderTimelineItem).join('')}</ol>`;
  }

  function renderTimelineItem(item) {
    const status = item.type === 'status_changed' && item.to ? `<span class="v4-muted">${escapeHtml(statusLabel(item.from))} → ${escapeHtml(statusLabel(item.to))}</span>` : '';
    const actor = item.actorName ? `<span class="v4-muted">${escapeHtml(item.actorName)}${item.actorRole ? ` · ${escapeHtml(item.actorRole)}` : ''}</span>` : '';
    const note = item.note ? `<small>${escapeHtml(item.note)}</small>` : '';
    return `<li><div><b>${escapeHtml(item.label)}</b>${status}${actor}${note}</div><time>${escapeHtml(formatDateTime(item.at))}</time></li>`;
  }

  function renderProjectSnapshot(record) {
    const summary = summarizeRecord(record);
    return `<div class="v4-project-snapshot">
      <div><span>Клиент</span><b>${escapeHtml(summary.clientName)}</b><small>${escapeHtml(summary.clientPhone || summary.clientEmail || 'контакты не указаны')}</small></div>
      <div><span>Площадка</span><b>${escapeHtml(summary.venueName || '—')}</b><small>${escapeHtml(summary.venueAddress || summary.eventDate || 'адрес/дата не указаны')}</small></div>
      <div><span>Итого</span><b>${formatMoney(summary.total)}</b><small>${escapeHtml(summary.statusLabel)}</small></div>
      <div><span>Техника</span><b>${formatWeight(summary.weightKg)}</b><small>${formatPower(summary.powerW)}</small></div>
    </div>`;
  }

  function renderHealthBadge(record) {
    const health = getProjectHealth(record);
    return `<span class="v4-project-health v4-project-health--${escapeAttr(health.level)}" title="${escapeAttr(health.note)}">${escapeHtml(health.label)}</span>`;
  }

  function statusLabel(status) {
    const statuses = model() && model().QUOTE_STATUSES || [];
    const found = statuses.find(row => row.id === status);
    return found ? found.name : String(status || 'Черновик');
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
  }

  function formatWeight(value) {
    const n = Number(value || 0);
    return `${Number(n.toFixed(n >= 100 ? 0 : 1)).toLocaleString('ru-RU')} кг`;
  }

  function formatPower(value) {
    const n = Number(value || 0);
    if (n >= 1000) return `${Number((n / 1000).toFixed(1)).toLocaleString('ru-RU')} кВт`;
    return `${Math.round(n).toLocaleString('ru-RU')} Вт`;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('ru-RU'); }
    catch (_) { return String(value); }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }
  function escapeAttr(value) { return escapeHtml(value); }

  ROOT.ProjectTimelineView = {
    ACTION_LABELS,
    normalizeTimelineEvent,
    getTimeline,
    getLastEvent,
    getProjectHealth,
    summarizeRecord,
    renderTimelineList,
    renderProjectSnapshot,
    renderHealthBadge
  };
})();
