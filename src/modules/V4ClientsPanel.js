(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function storage() {
    if (!ROOT.ClientsStorage) throw new Error('ClientsStorage is not available.');
    return ROOT.ClientsStorage;
  }

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function normalizeQuery(value) {
    return toText(value).toLowerCase();
  }

  function listClients(filters) {
    const opts = filters || {};
    const query = normalizeQuery(opts.query);
    const rows = storage().getClients ? storage().getClients() : [];
    return rows.filter(client => {
      if (!query) return true;
      return [client.name, client.contact, client.phone, client.email, client.address, client.note]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }

  function getClientProjectStats(client, projects) {
    if (ROOT.ClientProjectLinks && ROOT.ClientProjectLinks.getClientProjectStats) {
      return ROOT.ClientProjectLinks.getClientProjectStats(client, projects);
    }
    const name = normalizeQuery(client && client.name);
    const clientId = toText(client && client.id);
    const rows = Array.isArray(projects)
      ? projects
      : (ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.listProjects ? ROOT.QuoteProjectStorage.listProjects() : []);
    const matched = rows.filter(project => {
      const qClient = project.quote && project.quote.client ? project.quote.client : {};
      return (clientId && toText(qClient.id) === clientId)
        || (name && normalizeQuery(project.clientName || qClient.name) === name);
    });
    const last = matched.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
    const statuses = matched.reduce((acc, project) => {
      const status = project.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: matched.length,
      projects: matched,
      lastProjectId: last ? (last.projectId || '') : '',
      lastProjectName: last ? (last.projectName || '') : '',
      lastProjectDate: last ? (last.eventDate || '') : '',
      lastUpdatedAt: last ? (last.updatedAt || '') : '',
      statuses
    };
  }

  function buildClientPayloadFromForm(root) {
    const get = name => toText(root.querySelector(`[data-v4-client-field="${name}"]`) && root.querySelector(`[data-v4-client-field="${name}"]`).value);
    const id = get('id');
    return {
      id: id || undefined,
      name: get('name'),
      contact: get('contact'),
      phone: get('phone'),
      email: get('email'),
      address: get('address'),
      note: get('note')
    };
  }

  function exportClients(clients) {
    return JSON.stringify({
      type: 'feg-stage-pro-clients-export',
      version: '3.8.36',
      exportedAt: new Date().toISOString(),
      clients: Array.isArray(clients) ? clients : listClients()
    }, null, 2);
  }

  function applyClientToActiveQuote(client) {
    if (!client || !ROOT.QuoteDraftStorage || !ROOT.QuoteModel) return null;
    const current = ROOT.QuoteDraftStorage.loadActiveDraft ? ROOT.QuoteDraftStorage.loadActiveDraft() : ROOT.QuoteModel.createQuoteDraft({});
    const next = ROOT.QuoteModel.mergeQuotePatch(current || {}, {
      client: {
        id: client.id,
        name: client.name,
        company: client.name,
        phone: client.phone,
        email: client.email,
        contactName: client.contact,
        contactPhone: client.phone,
        notes: client.note
      }
    });
    ROOT.QuoteDraftStorage.saveDraft && ROOT.QuoteDraftStorage.saveDraft(next);
    return next;
  }

  function renderClientsPanel(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const state = root._v4ClientsState || { query: '', editingId: '' };
    root._v4ClientsState = state;
    const clients = listClients({ query: state.query });
    const allClients = storage().getClients ? storage().getClients() : [];
    const canEdit = can('clients:edit') || can('clients:create');
    const canCreateQuote = can('quotes:create');
    root.innerHTML = `
      <div class="v4-card v4-clients-panel">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">CRM · local clients</div>
            <h3>Клиенты</h3>
            <p class="v4-muted">Локальная v4 CRM-панель: поиск, карточки клиентов, история проектов и быстрый перенос клиента в черновик сметы.</p>
          </div>
          <div class="v4-auth-actions">
            <button type="button" class="btn-secondary" data-v4-clients-export>JSON клиентов</button>
            ${canCreateQuote ? '<button type="button" class="btn-primary" data-v4-clients-open-quote>Оформить смету</button>' : ''}
          </div>
        </div>
        <div class="v4-grid-3 v4-client-stats">
          <div class="v4-mini"><b>${allClients.length}</b><span>клиентов в базе</span></div>
          <div class="v4-mini"><b>${clients.length}</b><span>найдено по фильтру</span></div>
          <div class="v4-mini"><b>${ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.listProjects ? ROOT.QuoteProjectStorage.listProjects().length : 0}</b><span>проектов в истории</span></div>
        </div>
        <div class="v4-settings-grid v4-settings-grid-2">
          <label class="v4-field">Поиск клиента
            <input type="search" data-v4-client-query value="${escapeHtml(state.query)}" placeholder="Название, контакт, телефон, email, адрес">
          </label>
          <label class="v4-field">Быстрое действие
            <select data-v4-client-quick-action>
              <option value="">Выберите действие</option>
              <option value="new">Новая карточка клиента</option>
              <option value="export">Экспорт JSON</option>
            </select>
          </label>
        </div>
        ${canEdit ? renderClientForm(state.editingId) : '<div class="v4-note">У вашей роли нет права редактирования клиентов. Доступен только просмотр.</div>'}
        <div class="v4-table-wrap v4-table-wrap--clients">
          <table class="v4-table v4-table--clients">
            <thead><tr><th>Клиент</th><th>Контакты</th><th>Адрес / заметки</th><th>Проекты</th><th>Действия</th></tr></thead>
            <tbody>${clients.length ? clients.map(client => renderClientRow(client, canEdit, canCreateQuote)).join('') : '<tr><td colspan="5">Клиентов пока нет или фильтр ничего не нашёл.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="v4-client-card-list">
          ${clients.length ? clients.map(client => renderClientCard(client, canEdit, canCreateQuote)).join('') : '<div class="v4-equipment-card">Клиентов пока нет или фильтр ничего не нашёл.</div>'}
        </div>
        <textarea class="v4-export-text" data-v4-client-export-preview readonly hidden></textarea>
      </div>`;
    bind(root, opts);
    return root;
  }

  function renderClientForm(editingId) {
    const client = editingId ? (storage().getClients().find(row => String(row.id) === String(editingId)) || null) : null;
    return `
      <details class="v4-client-form" ${client ? 'open' : ''}>
        <summary>${client ? 'Редактирование клиента' : 'Новая карточка клиента'}</summary>
        <input type="hidden" data-v4-client-field="id" value="${escapeHtml(client && client.id || '')}">
        <div class="v4-settings-grid v4-settings-grid-3">
          <label class="v4-field">Клиент / компания *<input data-v4-client-field="name" value="${escapeHtml(client && client.name || '')}" placeholder="ООО Ромашка"></label>
          <label class="v4-field">Контактное лицо<input data-v4-client-field="contact" value="${escapeHtml(client && client.contact || '')}" placeholder="Имя контактного лица"></label>
          <label class="v4-field">Телефон<input data-v4-client-field="phone" value="${escapeHtml(client && client.phone || '')}" placeholder="+7..."></label>
          <label class="v4-field">Email<input data-v4-client-field="email" value="${escapeHtml(client && client.email || '')}" placeholder="mail@example.com"></label>
          <label class="v4-field v4-settings-wide">Адрес<input data-v4-client-field="address" value="${escapeHtml(client && client.address || '')}" placeholder="Адрес клиента / площадки по умолчанию"></label>
          <label class="v4-field v4-settings-wide">Комментарий<input data-v4-client-field="note" value="${escapeHtml(client && client.note || '')}" placeholder="Особенности работы, реквизиты, заметки"></label>
        </div>
        <div class="v4-actions">
          <button type="button" class="btn-primary" data-v4-client-save>${client ? 'Сохранить изменения' : 'Добавить клиента'}</button>
          <button type="button" class="btn-secondary" data-v4-client-reset>Очистить</button>
        </div>
      </details>`;
  }

  function renderClientProjectsMini(stats) {
    const projects = Array.isArray(stats.projects) ? stats.projects.slice(0, 3) : [];
    if (!projects.length) return '<small>Связанных проектов пока нет</small>';
    return `<div class="v4-client-project-links">${projects.map(project => `
      <button type="button" class="v4-mini-link" data-v4-client-open-project="${escapeHtml(project.projectId)}">${escapeHtml(project.projectName || 'Проект')}</button>
    `).join('')}</div>`;
  }

  function renderClientRow(client, canEdit, canCreateQuote) {
    const stats = getClientProjectStats(client);
    return `
      <tr>
        <td class="v4-name-cell"><b>${escapeHtml(client.name)}</b><br><small>${escapeHtml(client.id)}</small></td>
        <td class="v4-wide-cell">${escapeHtml(client.contact || '—')}<br><span>${escapeHtml(client.phone || '—')}</span><br><small>${escapeHtml(client.email || '—')}</small></td>
        <td class="v4-wide-cell">${escapeHtml(client.address || '—')}<br><small>${escapeHtml(client.note || '')}</small></td>
        <td class="v4-num-cell"><b>${stats.total}</b><br><small>${escapeHtml(stats.lastProjectName || 'нет проектов')}</small>${renderClientProjectsMini(stats)}</td>
        <td class="v4-actions-cell"><div class="v4-actions">
          ${canCreateQuote ? `<button type="button" class="btn-secondary" data-v4-client-to-quote="${escapeHtml(client.id)}">В смету</button>` : ''}
          ${stats.total ? `<button type="button" class="btn-secondary" data-v4-client-export-projects="${escapeHtml(client.id)}">Проекты JSON</button>` : ''}
          ${canEdit ? `<button type="button" class="btn-secondary" data-v4-client-edit="${escapeHtml(client.id)}">Править</button><button type="button" class="btn-danger" data-v4-client-delete="${escapeHtml(client.id)}">Удалить</button>` : ''}
        </div></td>
      </tr>`;
  }

  function renderClientCard(client, canEdit, canCreateQuote) {
    const stats = getClientProjectStats(client);
    return `
      <div class="v4-equipment-card v4-client-card">
        <div class="v4-equipment-card-top"><span class="v4-equipment-code">${escapeHtml(client.id)}</span><small>${escapeHtml(stats.total)} проектов</small></div>
        <h4>${escapeHtml(client.name)}</h4>
        <p>${escapeHtml(client.contact || 'Контакт не указан')} · ${escapeHtml(client.phone || 'телефон не указан')} · ${escapeHtml(client.email || 'email не указан')}</p>
        <div class="v4-equipment-card-grid">
          <div><span>Адрес</span><b>${escapeHtml(client.address || '—')}</b></div>
          <div><span>Последний проект</span><b>${escapeHtml(stats.lastProjectName || '—')}</b></div>
          <div><span>Проекты клиента</span><b>${escapeHtml(stats.total || 0)}</b></div>
          <div><span>Комментарий</span><b>${escapeHtml(client.note || '—')}</b></div>
          <div><span>Обновлено</span><b>${escapeHtml(formatDate(client.updatedAt))}</b></div>
        </div>
        ${renderClientProjectsMini(stats)}
        <div class="v4-actions">
          ${canCreateQuote ? `<button type="button" class="btn-secondary" data-v4-client-to-quote="${escapeHtml(client.id)}">В смету</button>` : ''}
          ${stats.total ? `<button type="button" class="btn-secondary" data-v4-client-export-projects="${escapeHtml(client.id)}">Проекты JSON</button>` : ''}
          ${canEdit ? `<button type="button" class="btn-secondary" data-v4-client-edit="${escapeHtml(client.id)}">Править</button><button type="button" class="btn-danger" data-v4-client-delete="${escapeHtml(client.id)}">Удалить</button>` : ''}
        </div>
      </div>`;
  }

  function bind(root, opts) {
    const state = root._v4ClientsState;
    const query = root.querySelector('[data-v4-client-query]');
    if (query) query.addEventListener('input', () => { state.query = query.value; renderClientsPanel(root, opts); });
    const quick = root.querySelector('[data-v4-client-quick-action]');
    if (quick) quick.addEventListener('change', () => {
      if (quick.value === 'new') { state.editingId = ''; renderClientsPanel(root, opts); const d = root.querySelector('.v4-client-form'); if (d) d.open = true; }
      if (quick.value === 'export') showExport(root);
    });
    const saveBtn = root.querySelector('[data-v4-client-save]');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      try {
        const payload = buildClientPayloadFromForm(root);
        const result = storage().upsertClient(payload);
        state.editingId = result.client.id;
        notify(result.isUpdate ? 'Клиент обновлён' : 'Клиент добавлен');
        renderClientsPanel(root, opts);
      } catch (err) { notify(err.message || 'Не удалось сохранить клиента'); }
    });
    const resetBtn = root.querySelector('[data-v4-client-reset]');
    if (resetBtn) resetBtn.addEventListener('click', () => { state.editingId = ''; renderClientsPanel(root, opts); });
    root.querySelectorAll('[data-v4-client-edit]').forEach(btn => btn.addEventListener('click', () => { state.editingId = btn.getAttribute('data-v4-client-edit'); renderClientsPanel(root, opts); }));
    root.querySelectorAll('[data-v4-client-delete]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-client-delete');
      storage().deleteClientById(id);
      if (state.editingId === id) state.editingId = '';
      notify('Клиент удалён из локальной базы');
      renderClientsPanel(root, opts);
    }));
    root.querySelectorAll('[data-v4-client-to-quote]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-client-to-quote');
      const client = storage().getClients().find(row => String(row.id) === String(id));
      if (!client) return;
      applyClientToActiveQuote(client);
      notify('Клиент перенесён в черновик сметы');
      if (opts && typeof opts.onOpenQuote === 'function') opts.onOpenQuote(client);
    }));
    root.querySelectorAll('[data-v4-client-open-project]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-client-open-project');
      try {
        const quote = ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.restoreProjectToDraft ? ROOT.QuoteProjectStorage.restoreProjectToDraft(id) : null;
        notify('Проект клиента открыт в сметчике');
        if (opts && typeof opts.onOpenQuote === 'function') opts.onOpenQuote(quote);
      } catch (err) { notify(err && err.message ? err.message : 'Не удалось открыть проект клиента'); }
    }));
    root.querySelectorAll('[data-v4-client-export-projects]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-client-export-projects');
      const client = storage().getClients().find(row => String(row.id) === String(id));
      if (!client || !ROOT.ClientProjectLinks || !ROOT.ClientProjectLinks.exportClientProjectPack) return;
      const text = ROOT.ClientProjectLinks.exportClientProjectPack(client);
      const area = root.querySelector('[data-v4-client-export-preview]');
      if (area) {
        area.hidden = false;
        area.value = text;
        try { area.focus(); area.select(); } catch (_) {}
      }
      notify('Связанные проекты клиента выгружены в JSON');
    }));
    const exportBtn = root.querySelector('[data-v4-clients-export]');
    if (exportBtn) exportBtn.addEventListener('click', () => showExport(root));
    const openQuote = root.querySelector('[data-v4-clients-open-quote]');
    if (openQuote) openQuote.addEventListener('click', () => { if (opts && typeof opts.onOpenQuote === 'function') opts.onOpenQuote(); });
  }

  function showExport(root) {
    const area = root.querySelector('[data-v4-client-export-preview]');
    if (!area) return;
    area.hidden = false;
    area.value = exportClients(storage().getClients());
    try { area.focus(); area.select(); } catch (_) {}
  }

  function can(permission) {
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer' };
    return ROOT.RolePermissions && ROOT.RolePermissions.hasPermission ? ROOT.RolePermissions.hasPermission(auth.role, permission) : true;
  }

  function formatDate(value) {
    if (!value) return '—';
    return String(value).slice(0, 10);
  }

  function notify(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
  }

  ROOT.V4ClientsPanel = {
    listClients,
    getClientProjectStats,
    buildClientPayloadFromForm,
    exportClients,
    applyClientToActiveQuote,
    renderClientsPanel
  };
})();
