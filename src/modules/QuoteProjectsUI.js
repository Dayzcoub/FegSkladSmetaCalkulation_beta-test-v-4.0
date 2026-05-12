(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function storage() { return ROOT.QuoteProjectStorage || null; }
  function draftStorage() { return ROOT.QuoteDraftStorage || null; }
  function model() { return ROOT.QuoteModel || null; }

  function renderProjects(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = getFilterState(root, opts);
    const rows = storage() ? storage().listProjects(state) : [];
    const allRows = storage() ? storage().listProjects() : [];
    const counts = storage() ? storage().getStatusCounts() : { total: 0 };
    root.innerHTML = `
      <div class="v4-card" data-v4-projects>
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">quote project storage</div>
            <h3>Проекты / история смет</h3>
            <p class="v4-muted">Каркас хранения v4-смет: черновики, статусы, возврат к проекту и сохранение активного мастера.</p>
          </div>
          <div class="v4-actions" style="margin-top:0">
            <button type="button" class="btn" data-v4-save-active-project>Сохранить активную смету в проекты</button>
          </div>
        </div>
        <div class="v4-summary-grid">
          <div class="v4-mini"><b>${formatNumber(counts.total || 0, 0)}</b><span>Всего проектов</span></div>
          <div class="v4-mini"><b>${formatNumber(counts.draft || 0, 0)}</b><span>Черновики</span></div>
          <div class="v4-mini"><b>${formatNumber(counts.confirmed || 0, 0)}</b><span>Подтверждено</span></div>
        </div>
        ${renderActiveDraftNote()}
        ${renderProjectFilters(state, allRows.length, allRows)}
        ${rows.length ? renderProjectTable(rows) : '<div class="v4-note">По текущему фильтру проектов нет. Сохрани активную смету или сбрось фильтр.</div>'}
        <div id="v4ImportRestoreMount" style="margin-top:14px"></div>
      </div>`;
    bindProjects(root, opts);
    return root;
  }

  function renderActiveDraftNote() {
    const active = draftStorage() && draftStorage().loadActiveDraft ? draftStorage().loadActiveDraft() : null;
    if (!active) return '<div class="v4-note">Активный черновик сметы пока не создан.</div>';
    return `<div class="v4-note"><b>Активный черновик:</b> ${escapeHtml(active.project && active.project.name || 'Без названия')} · ${escapeHtml(active.client && active.client.name || 'клиент не указан')} · ${escapeHtml(statusLabel(active.status))}</div>`;
  }


  function getFilterState(root, opts) {
    const prev = root && root._fegProjectFilters ? root._fegProjectFilters : {};
    return {
      status: opts && opts.status !== undefined ? opts.status : (prev.status || ''),
      clientId: opts && opts.clientId !== undefined ? opts.clientId : (prev.clientId || ''),
      query: opts && opts.query !== undefined ? opts.query : (prev.query || '')
    };
  }

  function renderProjectFilters(state, totalRows, allRows) {
    const statuses = model() && model().QUOTE_STATUSES || [];
    const options = ['<option value="">Все статусы</option>'].concat(statuses.map(row => `<option value="${escapeAttr(row.id)}" ${row.id === state.status ? 'selected' : ''}>${escapeHtml(row.name)}</option>`)).join('');
    const clientOptions = buildClientFilterOptions(allRows || [], state.clientId);
    return `
      <div class="v4-note v4-project-filter-grid">
        <label>Поиск проекта / клиента / площадки
          <input type="search" data-v4-project-query value="${escapeAttr(state.query || '')}" placeholder="Например: фестиваль, ACME, Arena">
        </label>
        <label>Клиент
          <select data-v4-project-client-filter>${clientOptions}</select>
        </label>
        <label>Статус
          <select data-v4-project-status-filter>${options}</select>
        </label>
        <button type="button" class="btn-secondary" data-v4-project-reset-filter>Сбросить</button>
        <div class="v4-muted">Показаны локальные проекты. Всего в истории: ${formatNumber(totalRows || 0, 0)}.</div>
      </div>`;
  }

  function buildClientFilterOptions(rows, selectedId) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const id = row.clientId || row.clientEmail || row.clientPhone || row.clientName || '';
      const name = row.clientName || row.clientEmail || row.clientPhone || 'клиент не указан';
      if (!id && map.has('__empty__')) return;
      map.set(id || '__empty__', name);
    });
    const items = ['<option value="">Все клиенты</option>'];
    Array.from(map.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'ru')).forEach(([id, name]) => {
      items.push(`<option value="${escapeAttr(id)}" ${id === selectedId ? 'selected' : ''}>${escapeHtml(name)}</option>`);
    });
    return items.join('');
  }

  function renderProjectTable(rows) {
    const tableRows = rows.map(row => {
      const client = ROOT.ClientProjectLinks && ROOT.ClientProjectLinks.findClientForProject ? ROOT.ClientProjectLinks.findClientForProject(row) : null;
      const clientSnapshot = ROOT.ClientProjectLinks && ROOT.ClientProjectLinks.getProjectClientSnapshot ? ROOT.ClientProjectLinks.getProjectClientSnapshot(row) : { name: row.clientName || '', id: '' };
      const timeline = ROOT.ProjectTimelineView || null;
      const summary = timeline && timeline.summarizeRecord ? timeline.summarizeRecord(row) : null;
      const lastEvent = summary && summary.lastEvent;
      const sync = ROOT.QuoteServerSyncQueue && ROOT.QuoteServerSyncQueue.getProjectSyncStatus ? ROOT.QuoteServerSyncQueue.getProjectSyncStatus(row) : null;
      const syncBadge = ROOT.QuoteServerSyncQueue && ROOT.QuoteServerSyncQueue.renderStatusBadge ? ROOT.QuoteServerSyncQueue.renderStatusBadge(sync) : '';
      return `
      <tr data-v4-project-row="${escapeAttr(row.projectId)}">
        <td><b>${escapeHtml(row.projectName)}</b><br><span class="v4-muted">${escapeHtml(row.venueName || row.venueAddress || '')}</span>${timeline && timeline.renderHealthBadge ? `<br>${timeline.renderHealthBadge(row)}` : ''}${syncBadge ? `<br>${syncBadge}` : ''}</td>
        <td><b>${escapeHtml(clientSnapshot.name || row.clientName || 'клиент не указан')}</b><br><span class="v4-muted">${escapeHtml(client ? client.id : (clientSnapshot.id || 'нет карточки CRM'))}</span><br><small>${escapeHtml(clientSnapshot.phone || clientSnapshot.email || '')}</small></td>
        <td>${renderStatusSelect(row)}</td>
        <td>${escapeHtml(row.eventDate || '—')}<br><span class="v4-muted">${escapeHtml(formatDateTime(row.updatedAt))}</span>${renderTimelineHint(row)}</td>
        <td><b>${formatMoney(row.totals && row.totals.total)}</b><br><span class="v4-muted">транспорт ${formatMoney(row.totals && row.totals.transport)}</span></td>
        <td>${formatWeight(row.totals && row.totals.weightKg)}<br><span class="v4-muted">${formatPower(row.totals && row.totals.powerW)}</span></td>
        <td>${lastEvent ? `<b>${escapeHtml(lastEvent.label)}</b><br><span class="v4-muted">${escapeHtml(formatDateTime(lastEvent.at))}</span>` : '<span class="v4-muted">—</span>'}</td>
        <td><div class="v4-actions" style="margin-top:0"><button type="button" class="btn-secondary" data-v4-open-project="${escapeAttr(row.projectId)}">Открыть</button><button type="button" class="btn-secondary" data-v4-export-project="${escapeAttr(row.projectId)}">Export</button><button type="button" class="btn-secondary" data-v4-audit-project="${escapeAttr(row.projectId)}">Audit</button><button type="button" class="btn-secondary" data-v4-export-project-client="${escapeAttr(row.projectId)}">Клиент JSON</button><button type="button" class="btn-secondary" data-v4-duplicate-project="${escapeAttr(row.projectId)}">Копия</button><button type="button" class="btn-secondary" data-v4-delete-project="${escapeAttr(row.projectId)}">Удалить</button></div></td>
      </tr>
      <tr class="v4-project-details-row"><td colspan="8">${renderProjectDetails(row)}</td></tr>`;
    }).join('');
    return `<div class="v4-table-wrap v4-table-wrap--projects"><table class="v4-table v4-table--projects"><thead><tr><th>Проект</th><th>Клиент</th><th>Статус</th><th>Дата</th><th>Итого</th><th>Вес / мощность</th><th>Последнее событие</th><th>Действия</th></tr></thead><tbody>${tableRows}</tbody></table></div>${renderProjectCards(rows)}`;
  }

  function renderProjectDetails(row) {
    const timeline = ROOT.ProjectTimelineView || null;
    if (!timeline) return '<div class="v4-note">Timeline module is not loaded.</div>';
    return `<div class="v4-project-details">
      ${timeline.renderProjectSnapshot(row)}
      <div class="v4-project-timeline-box"><div class="v4-kicker">timeline</div>${timeline.renderTimelineList(row, { limit: 4 })}</div>
    </div>`;
  }

  function renderProjectCards(rows) {
    const timeline = ROOT.ProjectTimelineView || null;
    return `<div class="v4-project-card-list">${rows.map(row => {
      const summary = timeline && timeline.summarizeRecord ? timeline.summarizeRecord(row) : null;
      const health = timeline && timeline.renderHealthBadge ? timeline.renderHealthBadge(row) : '';
      const sync = ROOT.QuoteServerSyncQueue && ROOT.QuoteServerSyncQueue.getProjectSyncStatus ? ROOT.QuoteServerSyncQueue.getProjectSyncStatus(row) : null;
      const syncBadge = ROOT.QuoteServerSyncQueue && ROOT.QuoteServerSyncQueue.renderStatusBadge ? ROOT.QuoteServerSyncQueue.renderStatusBadge(sync) : '';
      return `<article class="v4-project-card" data-v4-project-row="${escapeAttr(row.projectId)}">
        <div class="v4-project-card-top"><div><span class="v4-equipment-code">${escapeHtml(row.status || 'draft')}</span><h4>${escapeHtml(row.projectName)}</h4><p>${escapeHtml(row.clientName || 'клиент не указан')}</p>${syncBadge}</div>${health}</div>
        <div class="v4-equipment-card-grid">
          <div><span>Дата</span><b>${escapeHtml(row.eventDate || '—')}</b></div>
          <div><span>Итого</span><b>${formatMoney(row.totals && row.totals.total)}</b></div>
          <div><span>Вес</span><b>${formatWeight(row.totals && row.totals.weightKg)}</b></div>
          <div><span>Мощность</span><b>${formatPower(row.totals && row.totals.powerW)}</b></div>
        </div>
        <div class="v4-project-timeline-box">${timeline && timeline.renderTimelineList ? timeline.renderTimelineList(row, { limit: 3 }) : ''}</div>
        <div class="v4-actions"><button type="button" class="btn-secondary" data-v4-open-project="${escapeAttr(row.projectId)}">Открыть</button><button type="button" class="btn-secondary" data-v4-export-project="${escapeAttr(row.projectId)}">Export</button><button type="button" class="btn-secondary" data-v4-audit-project="${escapeAttr(row.projectId)}">Audit</button></div>
      </article>`;
    }).join('')}</div>`;
  }


  function renderStatusSelect(row) {
    const statuses = model() && model().QUOTE_STATUSES || [];
    const options = statuses.map(status => `<option value="${escapeAttr(status.id)}" ${status.id === row.status ? 'selected' : ''}>${escapeHtml(status.name)}</option>`).join('');
    return `<select data-v4-project-status="${escapeAttr(row.projectId)}" aria-label="Статус проекта">${options}</select>`;
  }

  function renderTimelineHint(row) {
    const history = row && row.quote && Array.isArray(row.quote.history) ? row.quote.history : [];
    const lastStatus = history.slice().reverse().find(item => item && item.type === 'status_changed');
    if (!lastStatus) return '';
    return `<br><span class="v4-muted">статус: ${escapeHtml(formatDateTime(lastStatus.at))}</span>`;
  }

  function bindProjects(root, opts) {
    const refresh = () => renderProjects(root, opts);
    const runBusy = (label, task, button) => {
      const busy = ROOT.BusyIndicator;
      if (busy && busy.setButtonBusy) busy.setButtonBusy(button, true, 'Жду…');
      const done = () => { if (busy && busy.setButtonBusy) busy.setButtonBusy(button, false); };
      if (busy && busy.run) return busy.run(label, task).then(result => { done(); return result; }).catch(err => { done(); throw err; });
      try { const result = task(); done(); return Promise.resolve(result); } catch (err) { done(); return Promise.reject(err); }
    };
    const queryInput = root.querySelector('[data-v4-project-query]');
    const statusFilter = root.querySelector('[data-v4-project-status-filter]');
    const clientFilter = root.querySelector('[data-v4-project-client-filter]');
    const resetFilter = root.querySelector('[data-v4-project-reset-filter]');
    const updateFilters = () => {
      root._fegProjectFilters = {
        query: queryInput ? queryInput.value : '',
        status: statusFilter ? statusFilter.value : '',
        clientId: clientFilter ? clientFilter.value : ''
      };
      refresh();
    };
    if (queryInput) queryInput.addEventListener('input', updateFilters);
    if (statusFilter) statusFilter.addEventListener('change', updateFilters);
    if (clientFilter) clientFilter.addEventListener('change', updateFilters);
    if (resetFilter) resetFilter.addEventListener('click', () => { root._fegProjectFilters = { query: '', status: '', clientId: '' }; refresh(); });

    root.querySelectorAll('[data-v4-project-status]').forEach(select => select.addEventListener('change', () => {
      const previousValue = select.dataset.previousValue || '';
      runBusy('Обновляю статус проекта…', () => {
        const saved = storage().updateProjectStatus(select.getAttribute('data-v4-project-status'), select.value, 'Изменено из локальной истории проектов');
        toast(`Статус обновлён: ${statusLabel(saved.status)}`);
        refresh();
        return saved;
      }).catch(err => {
        if (previousValue) select.value = previousValue;
        toast(err && err.message ? err.message : 'Не удалось обновить статус');
      });
    }));
    root.querySelectorAll('[data-v4-project-status]').forEach(select => { select.dataset.previousValue = select.value || ''; });

    const saveBtn = root.querySelector('[data-v4-save-active-project]');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      runBusy('Сохраняю проект в локальную историю…', () => {
        const saved = storage().saveActiveDraftAsProject();
        toast(`Проект сохранён: ${saved.projectName}`);
        refresh();
        return saved;
      }, saveBtn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось сохранить проект');
      });
    });
    root.querySelectorAll('[data-v4-open-project]').forEach(btn => btn.addEventListener('click', () => {
      runBusy('Открываю проект…', () => {
        const quote = storage().restoreProjectToDraft(btn.getAttribute('data-v4-open-project'));
        toast('Проект открыт в линейном сметчике');
        if (opts.onOpen) opts.onOpen(quote);
        refresh();
        return quote;
      }, btn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось открыть проект');
      });
    }));

    root.querySelectorAll('[data-v4-export-project]').forEach(btn => btn.addEventListener('click', () => {
      runBusy('Готовлю export pack проекта…', () => {
        const record = storage().loadProject(btn.getAttribute('data-v4-export-project'));
        const text = ROOT.ProjectAuditLog && ROOT.ProjectAuditLog.exportProjectPack ? ROOT.ProjectAuditLog.exportProjectPack(record) : JSON.stringify(record, null, 2);
        downloadText(projectFilename(record, 'export-pack'), text);
        copyText(text);
        toast('Пакет проекта экспортирован');
      }, btn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось экспортировать проект');
      });
    }));
    root.querySelectorAll('[data-v4-audit-project]').forEach(btn => btn.addEventListener('click', () => {
      runBusy('Готовлю audit log проекта…', () => {
        const record = storage().loadProject(btn.getAttribute('data-v4-audit-project'));
        const text = ROOT.ProjectAuditLog && ROOT.ProjectAuditLog.exportAuditLog ? ROOT.ProjectAuditLog.exportAuditLog(record) : JSON.stringify(record && record.quote && record.quote.history || [], null, 2);
        downloadText(projectFilename(record, 'audit-log'), text);
        copyText(text);
        toast('Audit log проекта экспортирован');
      }, btn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось экспортировать audit log');
      });
    }));
    root.querySelectorAll('[data-v4-export-project-client]').forEach(btn => btn.addEventListener('click', () => {
      try {
        const record = storage().loadProject(btn.getAttribute('data-v4-export-project-client'));
        const client = ROOT.ClientProjectLinks && ROOT.ClientProjectLinks.findClientForProject ? ROOT.ClientProjectLinks.findClientForProject(record) : null;
        const snapshot = ROOT.ClientProjectLinks && ROOT.ClientProjectLinks.getProjectClientSnapshot ? ROOT.ClientProjectLinks.getProjectClientSnapshot(record) : { name: record && record.clientName };
        const text = JSON.stringify({ type: 'feg-stage-pro-project-client-link', version: '3.8.38', exportedAt: new Date().toISOString(), projectId: record && record.projectId, quoteId: record && record.quoteId, client: client || snapshot }, null, 2);
        downloadText(projectFilename(record, 'client-link'), text);
        copyText(text);
        toast('Клиентская связка проекта экспортирована');
      } catch (err) {
        toast(err && err.message ? err.message : 'Не удалось экспортировать клиентскую связку');
      }
    }));

    root.querySelectorAll('[data-v4-duplicate-project]').forEach(btn => btn.addEventListener('click', () => {
      runBusy('Создаю копию проекта…', () => {
        storage().duplicateProject(btn.getAttribute('data-v4-duplicate-project'));
        toast('Создана копия проекта');
        refresh();
      }, btn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось создать копию');
      });
    }));
    root.querySelectorAll('[data-v4-delete-project]').forEach(btn => btn.addEventListener('click', () => {
      runBusy('Удаляю проект из истории…', () => {
        storage().deleteProject(btn.getAttribute('data-v4-delete-project'));
        toast('Проект удалён из локальной истории');
        refresh();
      }, btn).catch(err => toast(err && err.message ? err.message : 'Не удалось удалить проект'));
    }));

    const importMount = root.querySelector('#v4ImportRestoreMount');
    if (importMount && ROOT.ImportRestoreCenter && ROOT.ImportRestoreCenter.renderImportPanel) {
      ROOT.ImportRestoreCenter.renderImportPanel(importMount, {
        onRestore: () => {
          toast('Импортированный проект добавлен в локальную историю');
          refresh();
        }
      });
    }
  }



  function projectFilename(record, suffix) {
    const base = (record && (record.projectName || record.clientName) || 'feg-project').toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'feg-project';
    return `${base}-${suffix || 'export'}.json`;
  }

  function copyText(text) {
    try {
      if (GLOBAL.navigator && GLOBAL.navigator.clipboard && GLOBAL.navigator.clipboard.writeText) GLOBAL.navigator.clipboard.writeText(text).catch(() => {});
    } catch (_) {}
  }

  function downloadText(filename, text) {
    try {
      if (!GLOBAL.Blob || !GLOBAL.URL || !document || !document.createElement) return;
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    } catch (_) {}
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

  function formatNumber(value, digits) {
    return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: digits == null ? 1 : digits });
  }

  function formatDateTime(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('ru-RU'); }
    catch (_) { return String(value); }
  }

  function toast(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (GLOBAL.showToast) GLOBAL.showToast(message);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function escapeAttr(value) { return escapeHtml(value); }

  ROOT.QuoteProjectsUI = { renderProjects };
})();
