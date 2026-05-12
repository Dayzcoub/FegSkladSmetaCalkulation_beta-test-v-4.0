// FEG Stage PRO v3.6.39 — ClientsUI module
// Responsibility: UI helpers for clients page/select/form/table.
// Classic-compatible module: attaches API to window.FEGModules.ClientsUI.
(function (global) {
    'use strict';

    const FORM_FIELD_IDS = [
        'clientDbId',
        'clientDbName',
        'clientDbContact',
        'clientDbPhone',
        'clientDbEmail',
        'clientDbAddress',
        'clientDbNote'
    ];

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function fallbackEscape(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getEscape(options) {
        return options && typeof options.escapeHtml === 'function' ? options.escapeHtml : fallbackEscape;
    }

    function getValue(doc, id) {
        const el = doc ? doc.getElementById(id) : null;
        return el ? String(el.value || '').trim() : '';
    }

    function setValue(doc, id, value) {
        const el = doc ? doc.getElementById(id) : null;
        if (el) el.value = value || '';
    }

    function getClients(options) {
        if (options && Array.isArray(options.clients)) return options.clients;
        if (options && typeof options.getClients === 'function') return options.getClients();
        return [];
    }

    function makeFallbackClientId() {
        return 'CL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    function normalizeFallbackClient(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const name = String(source.name || source.client || source.title || raw || '').trim();
        if (!name) return null;
        return {
            id: source.id || source.local_id || makeFallbackClientId(),
            name,
            contact: String(source.contact || '').trim(),
            phone: String(source.phone || '').trim(),
            email: String(source.email || '').trim(),
            address: String(source.address || '').trim(),
            note: String(source.note || source.comment || '').trim(),
            createdAt: source.createdAt || source.created_at || new Date().toISOString(),
            updatedAt: source.updatedAt || source.updated_at || new Date().toISOString(),
            cloudId: source.cloudId || source.cloud_id || null,
            cloudUpdatedAt: source.cloudUpdatedAt || source.cloud_updated_at || null
        };
    }

    function renderClientSelect(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const clientSelect = opts.clientSelect;
        if (!clientSelect) return;
        const escapeHtml = getEscape(opts);
        const clients = getClients(opts);
        const currentStage = opts.currentStage !== undefined ? opts.currentStage : clientSelect.value;

        clientSelect.innerHTML = '<option value="">— Выберите клиента —</option>';
        clients.forEach(client => {
            const name = typeof client === 'string' ? client : client.name;
            const label = typeof client === 'string' ? name : [client.name, client.contact, client.phone].filter(Boolean).join(' · ');
            clientSelect.innerHTML += `<option value="${escapeHtml(name)}" title="${escapeHtml(label)}">${escapeHtml(name)}</option>`;
        });
        if (clients.length === 0) clientSelect.innerHTML = '<option value="">Нет клиентов, добавьте</option>';
        if (currentStage && clients.some(client => (typeof client === 'string' ? client : client.name) === currentStage)) {
            clientSelect.value = currentStage;
        }
    }

    function renderClientDatalist(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        const datalist = opts.datalist || (doc ? doc.getElementById('clientDatalist') : null);
        if (!datalist) return;
        const escapeHtml = getEscape(opts);
        const clients = getClients(opts);
        datalist.innerHTML = clients.map(client => {
            const name = typeof client === 'string' ? client : client.name;
            return `<option value="${escapeHtml(name)}"></option>`;
        }).join('');
    }

    function renderClients(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const clients = getClients(opts);
        renderClientSelect({ ...opts, clients });
        renderClientDatalist({ ...opts, clients });
        if (typeof opts.renderClientsTable === 'function') opts.renderClientsTable();
        return clients;
    }

    function resetClientForm(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        FORM_FIELD_IDS.forEach(id => setValue(doc, id, ''));
        const title = doc ? doc.getElementById('clientFormTitle') : null;
        if (title) title.textContent = opts.title || 'Карточка клиента';
    }

    function fillClientForm(client, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        if (!client) return null;
        const map = {
            clientDbId: client.id,
            clientDbName: client.name,
            clientDbContact: client.contact,
            clientDbPhone: client.phone,
            clientDbEmail: client.email,
            clientDbAddress: client.address,
            clientDbNote: client.note
        };
        Object.entries(map).forEach(([id, value]) => setValue(doc, id, value));
        const title = doc ? doc.getElementById('clientFormTitle') : null;
        if (title) title.textContent = opts.title || 'Редактирование клиента';
        return client.id || null;
    }

    function readClientForm(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        const val = id => getValue(doc, id);
        const name = val('clientDbName');
        if (!name) throw new Error('Введите название клиента / компании.');

        const clients = getClients(opts);
        const editingClientId = opts.editingClientId || null;
        const old = editingClientId ? clients.find(client => String(client.id) === String(editingClientId)) : null;
        const makeClientId = typeof opts.makeClientId === 'function' ? opts.makeClientId : makeFallbackClientId;
        const normalizeClient = typeof opts.normalizeClient === 'function' ? opts.normalizeClient : normalizeFallbackClient;

        return normalizeClient({
            ...(old || {}),
            id: editingClientId || val('clientDbId') || makeClientId(),
            name,
            contact: val('clientDbContact'),
            phone: val('clientDbPhone'),
            email: val('clientDbEmail'),
            address: val('clientDbAddress'),
            note: val('clientDbNote'),
            createdAt: old && old.createdAt ? old.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cloudId: old && old.cloudId ? old.cloudId : null,
            cloudUpdatedAt: old && old.cloudUpdatedAt ? old.cloudUpdatedAt : null
        });
    }

    function getClientProjectCounts(client, options) {
        if (options && typeof options.getClientProjectCounts === 'function') {
            return options.getClientProjectCounts(client.name || client);
        }
        return { stageCount: 0, trussCount: 0 };
    }

    function renderClientsTable(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        const holder = opts.holder || (doc ? doc.getElementById('clientsTable') : null);
        if (!holder) return { totalStage: 0, totalTruss: 0, clients: [] };

        const escapeHtml = getEscape(opts);
        const clients = getClients(opts);
        let totalStage = 0;
        let totalTruss = 0;

        const rows = clients.map(client => {
            const counts = getClientProjectCounts(client, opts);
            totalStage += counts.stageCount;
            totalTruss += counts.trussCount;
            return `
                <tr>
                    <td><strong>${escapeHtml(client.name)}</strong>${client.cloudId ? ' <span class="client-badge" title="Есть в облаке">☁</span>' : ''}</td>
                    <td>${escapeHtml(client.contact || '—')}</td>
                    <td>${escapeHtml(client.phone || '—')}</td>
                    <td>${escapeHtml(client.email || '—')}</td>
                    <td>${escapeHtml(client.address || '—')}</td>
                    <td><span class="client-badge">Сцены: ${counts.stageCount}</span> <span class="client-badge">Фермы: ${counts.trussCount}</span></td>
                    <td>
                        <div class="client-actions">
                            <button class="client-edit" data-id="${escapeHtml(client.id)}" title="Редактировать">✎</button>
                            <button class="client-stage" data-id="${escapeHtml(client.id)}" title="Выбрать для сцены">▦</button>
                            <button class="client-truss" data-id="${escapeHtml(client.id)}" title="Выбрать для фермы">△</button>
                            <button class="client-cloud" data-id="${escapeHtml(client.id)}" title="Сохранить клиента в облако">☁</button>
                            <button class="client-delete" data-id="${escapeHtml(client.id)}" title="Удалить клиента">🗑</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        const statCount = doc ? doc.getElementById('clientStatCount') : null;
        const statStage = doc ? doc.getElementById('clientStatStageProjects') : null;
        const statTruss = doc ? doc.getElementById('clientStatTrussProjects') : null;
        if (statCount) statCount.textContent = clients.length;
        if (statStage) statStage.textContent = totalStage;
        if (statTruss) statTruss.textContent = totalTruss;

        if (clients.length === 0) {
            holder.innerHTML = '<div class="client-empty-state">Клиентов пока нет. Добавьте первого клиента в карточке слева или загрузите из облака.</div>';
            return { totalStage, totalTruss, clients };
        }

        holder.innerHTML = `
            <div class="client-table-wrap">
                <table class="client-table">
                    <thead><tr><th>Клиент</th><th>Контакт</th><th>Телефон</th><th>Email</th><th>Адрес</th><th>История</th><th>Действия</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

        const findClient = id => clients.find(client => String(client.id) === String(id));
        holder.querySelectorAll('.client-edit').forEach(btn => btn.addEventListener('click', () => {
            const client = findClient(btn.dataset.id);
            if (client && typeof opts.onEdit === 'function') opts.onEdit(client);
        }));
        holder.querySelectorAll('.client-stage').forEach(btn => btn.addEventListener('click', () => {
            const client = findClient(btn.dataset.id);
            if (client && typeof opts.onSelectStage === 'function') opts.onSelectStage(client);
        }));
        holder.querySelectorAll('.client-truss').forEach(btn => btn.addEventListener('click', () => {
            const client = findClient(btn.dataset.id);
            if (client && typeof opts.onSelectTruss === 'function') opts.onSelectTruss(client);
        }));
        holder.querySelectorAll('.client-cloud').forEach(btn => btn.addEventListener('click', async () => {
            const client = findClient(btn.dataset.id);
            if (client && typeof opts.onSaveCloud === 'function') await opts.onSaveCloud(client);
        }));
        holder.querySelectorAll('.client-delete').forEach(btn => btn.addEventListener('click', () => {
            const client = findClient(btn.dataset.id);
            if (!client || typeof opts.onDelete !== 'function') return;
            opts.onDelete(client, getClientProjectCounts(client, opts));
        }));

        return { totalStage, totalTruss, clients };
    }

    const api = {
        MODULE_NAME: 'ClientsUI',
        MODULE_STATUS: 'runtime-extracted',
        FORM_FIELD_IDS,
        renderClientSelect,
        renderClientDatalist,
        renderClients,
        resetClientForm,
        fillClientForm,
        readClientForm,
        renderClientsTable
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ClientsUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
