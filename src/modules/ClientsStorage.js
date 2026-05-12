// FEG Stage PRO v3.6.39 — ClientsStorage module
// Responsibility: local clients database, legacy migration and client list helpers.
// Classic-compatible module: attaches API to window.FEGModules.ClientsStorage.
(function (global) {
    'use strict';

    const STORAGE_KEYS = {
        clients: 'fegClients',
        legacyClients: 'clients'
    };

    function nowIso() {
        return new Date().toISOString();
    }

    function makeClientId() {
        return 'CL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    function safeTrim(value) {
        return String(value || '').trim();
    }

    function normalizeClient(raw) {
        if (typeof raw === 'string') {
            const name = raw.trim();
            return name ? {
                id: makeClientId(),
                name,
                contact: '',
                phone: '',
                email: '',
                address: '',
                note: '',
                createdAt: nowIso(),
                updatedAt: nowIso(),
                cloudId: null,
                cloudUpdatedAt: null
            } : null;
        }

        const source = raw && typeof raw === 'object' ? raw : {};
        const name = safeTrim(source.name || source.client || source.title);
        if (!name) return null;

        return {
            id: source.id || source.local_id || makeClientId(),
            name,
            contact: safeTrim(source.contact),
            phone: safeTrim(source.phone),
            email: safeTrim(source.email),
            address: safeTrim(source.address),
            note: safeTrim(source.note || source.comment),
            createdAt: source.createdAt || source.created_at || nowIso(),
            updatedAt: source.updatedAt || source.updated_at || nowIso(),
            cloudId: source.cloudId || source.cloud_id || null,
            cloudUpdatedAt: source.cloudUpdatedAt || source.cloud_updated_at || null
        };
    }

    function readList(storageKey) {
        try {
            const raw = global.localStorage ? global.localStorage.getItem(storageKey) : null;
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function writeList(storageKey, list) {
        if (!global.localStorage) return;
        global.localStorage.setItem(storageKey, JSON.stringify(Array.isArray(list) ? list : []));
    }

    function normalizeClientList(clients) {
        const seen = new Set();
        const normalized = [];
        (Array.isArray(clients) ? clients : []).forEach(item => {
            const client = normalizeClient(item);
            if (!client) return;
            const key = client.name.toLowerCase();
            if (seen.has(key)) {
                const idx = normalized.findIndex(c => c.name.toLowerCase() === key);
                if (idx >= 0) {
                    normalized[idx] = {
                        ...normalized[idx],
                        ...client,
                        updatedAt: client.updatedAt || normalized[idx].updatedAt
                    };
                }
                return;
            }
            seen.add(key);
            normalized.push(client);
        });
        normalized.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        return normalized;
    }

    function persistClients(clients) {
        const normalized = normalizeClientList(clients);
        writeList(STORAGE_KEYS.clients, normalized);
        writeList(STORAGE_KEYS.legacyClients, normalized.map(client => client.name));
        return normalized;
    }

    function getClients() {
        let result = readList(STORAGE_KEYS.clients);
        if (!result.length) {
            const legacy = readList(STORAGE_KEYS.legacyClients);
            if (legacy.length) result = legacy;
        }
        return persistClients(result);
    }

    function setClients(clients) {
        return persistClients(clients);
    }

    function getClientByName(name) {
        const target = safeTrim(name).toLowerCase();
        if (!target) return null;
        return getClients().find(client => client.name.toLowerCase() === target) || null;
    }

    function findClientIndex(clients, client) {
        const list = Array.isArray(clients) ? clients : [];
        if (!client) return -1;
        const id = client.id || client.local_id;
        const name = safeTrim(client.name || client.client).toLowerCase();
        const cloudId = client.cloudId || client.cloud_id;
        if (id) {
            const byId = list.findIndex(item => String(item.id) === String(id));
            if (byId >= 0) return byId;
        }
        if (cloudId) {
            const byCloud = list.findIndex(item => String(item.cloudId || '') === String(cloudId));
            if (byCloud >= 0) return byCloud;
        }
        if (name) return list.findIndex(item => item.name.toLowerCase() === name);
        return -1;
    }

    function ensureClientExists(name, extra) {
        const clean = safeTrim(name);
        if (!clean) return null;
        const clients = getClients();
        const existingIndex = clients.findIndex(client => client.name.toLowerCase() === clean.toLowerCase());
        const nonEmptyExtra = Object.fromEntries(Object.entries(extra || {}).filter(([, value]) => {
            return value !== undefined && value !== null && String(value).trim() !== '';
        }));

        if (existingIndex >= 0) {
            const next = {
                ...clients[existingIndex],
                ...nonEmptyExtra,
                updatedAt: nowIso()
            };
            clients[existingIndex] = next;
            setClients(clients);
            return next;
        }

        const client = normalizeClient({ name: clean, ...nonEmptyExtra });
        clients.push(client);
        setClients(clients);
        return client;
    }

    function upsertClient(client) {
        const normalized = normalizeClient(client);
        if (!normalized) throw new Error('Введите название клиента / компании.');
        const clients = getClients();
        const idx = findClientIndex(clients, normalized);
        if (idx >= 0) clients[idx] = { ...clients[idx], ...normalized };
        else clients.push(normalized);
        const saved = setClients(clients).find(item => item.id === normalized.id || item.name.toLowerCase() === normalized.name.toLowerCase()) || normalized;
        return { client: saved, clients: getClients(), index: idx, isUpdate: idx >= 0 };
    }

    function deleteClientById(id) {
        const next = getClients().filter(client => String(client.id) !== String(id));
        return setClients(next);
    }

    function mergeClients(localClients, incomingClients) {
        const clients = normalizeClientList(localClients);
        const incoming = normalizeClientList(incomingClients);
        incoming.forEach(client => {
            const idx = findClientIndex(clients, client);
            if (idx >= 0) {
                const localTime = new Date(clients[idx].updatedAt || 0).getTime();
                const cloudTime = new Date(client.updatedAt || client.cloudUpdatedAt || 0).getTime();
                clients[idx] = cloudTime >= localTime
                    ? { ...clients[idx], ...client }
                    : { ...clients[idx], cloudId: client.cloudId, cloudUpdatedAt: client.cloudUpdatedAt };
            } else {
                clients.push(client);
            }
        });
        return normalizeClientList(clients);
    }

    function countClients() {
        return getClients().length;
    }

    const api = {
        MODULE_NAME: 'ClientsStorage',
        MODULE_STATUS: 'runtime-extracted',
        STORAGE_KEYS,
        makeClientId,
        normalizeClient,
        normalizeClientList,
        readList,
        writeList,
        getClients,
        setClients,
        getClientByName,
        findClientIndex,
        ensureClientExists,
        upsertClient,
        deleteClientById,
        mergeClients,
        countClients
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ClientsStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
