// FEG Stage PRO v3.7.1 - TrussProjectsUI module
// Responsibility: render saved 2D truss project list without owning project data.
// Classic-compatible module: attaches API to window.FEGModules.TrussProjectsUI.
(function (global) {
    'use strict';

    function fallbackEscape(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fallbackMoney(value) {
        return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
    }

    function formatProjectDate(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('ru-RU');
        return date.toLocaleDateString('ru-RU');
    }

    function projectTotal(project) {
        return project.total || (project.result && project.result.total) || 0;
    }

    function getProjectActionId(project, idx) {
        return String(project && project.id != null ? project.id : idx);
    }

    function renderRows(projects, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const escape = typeof opts.escapeHtml === 'function' ? opts.escapeHtml : fallbackEscape;
        const money = typeof opts.money === 'function' ? opts.money : fallbackMoney;

        return (Array.isArray(projects) ? projects : []).map((project, idx) => {
            const id = getProjectActionId(project, idx);
            const orderId = project.orderId || ('TR-' + id);
            return `
            <tr>
                <td><strong>${escape(orderId)}${project.cloudId ? ' &#9729;' : ''}</strong></td>
                <td>${escape(project.client || '—')}</td>
                <td>${escape(project.name || '—')}</td>
                <td>${formatProjectDate(project.updatedAt || project.date || Date.now())}</td>
                <td><strong>${money(projectTotal(project))}</strong></td>
                <td><div class="truss-project-actions">
                    <button type="button" title="Открыть" data-truss-action="open" data-id="${escape(id)}">✎</button>
                    <button type="button" title="Тех PDF" data-truss-action="tech" data-id="${escape(id)}">PDF</button>
                    <button type="button" title="КП PDF" data-truss-action="client" data-id="${escape(id)}">КП</button>
                    <button type="button" title="Облако" data-truss-action="cloud" data-id="${escape(id)}">&#9729;</button>
                    <button type="button" title="Удалить" data-truss-action="delete" data-id="${escape(id)}">🗑</button>
                </div></td>
            </tr>`;
        }).join('');
    }

    function renderProjectsHtml(projects, options) {
        const list = Array.isArray(projects) ? projects : [];
        if (!list.length) return '<div class="orders-empty-state">Нет сохранённых ферменных проектов.</div>';
        const rows = renderRows(list, options);
        return `<div class="truss-project-table-wrap"><table class="truss-project-table"><thead><tr><th>ID</th><th>Клиент</th><th>Проект</th><th>Дата</th><th>Стоимость</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    function bindProjectActions(container, projects, options) {
        if (!container || typeof container.querySelectorAll !== 'function') return;
        const opts = options && typeof options === 'object' ? options : {};
        const list = Array.isArray(projects) ? projects : [];
        const callbacks = {
            open: opts.onOpen || global.openTrussProject,
            tech: opts.onTechPdf || ((id) => global.downloadSavedTrussPdf && global.downloadSavedTrussPdf(id, 'tech')),
            client: opts.onClientPdf || ((id) => global.downloadSavedTrussPdf && global.downloadSavedTrussPdf(id, 'client')),
            cloud: opts.onCloud || global.uploadSavedTrussToCloud,
            delete: opts.onDelete || global.deleteTrussProject
        };
        const findProject = (id) => list.find((project, idx) => getProjectActionId(project, idx) === String(id)) || null;

        container.querySelectorAll('[data-truss-action]').forEach(button => {
            button.addEventListener('click', async () => {
                const action = button.getAttribute('data-truss-action');
                const id = button.getAttribute('data-id');
                const handler = callbacks[action];
                if (typeof handler !== 'function') return;
                await handler(id, findProject(id));
            });
        });
    }

    function renderProjectsList(container, projects, options) {
        if (!container) return '';
        const html = renderProjectsHtml(projects, options);
        container.innerHTML = html;
        bindProjectActions(container, projects, options);
        return html;
    }

    const api = {
        MODULE_NAME: 'TrussProjectsUI',
        MODULE_STATUS: 'runtime-extracted',
        fallbackEscape,
        fallbackMoney,
        formatProjectDate,
        projectTotal,
        getProjectActionId,
        renderRows,
        renderProjectsHtml,
        bindProjectActions,
        renderProjectsList
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.TrussProjectsUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
