// FEG Stage PRO v3.6.39 — ClientsManager module
// Responsibility: bridge local ClientsStorage with SupabaseStorage for client sync flows.
// Classic-compatible module: attaches API to window.FEGModules.ClientsManager.
(function (global) {
    'use strict';

    const CLOUD_TABLE_NAME = 'projects';
    const CLIENTS_WORKSPACE_SUFFIX = '-clients';
    const CLIENTS_EXPORT_VERSION = '3.4';

    function getClientsStorage() {
        return global.FEGModules && global.FEGModules.ClientsStorage ? global.FEGModules.ClientsStorage : null;
    }

    function getSupabaseStorage() {
        return global.FEGModules && global.FEGModules.SupabaseStorage ? global.FEGModules.SupabaseStorage : null;
    }

    function normalizeCloudSettings(settings) {
        const supabaseStorage = getSupabaseStorage();
        if (supabaseStorage && typeof supabaseStorage.normalizeCloudSettings === 'function') {
            return supabaseStorage.normalizeCloudSettings(settings);
        }
        const source = settings && typeof settings === 'object' ? settings : {};
        return {
            url: String(source.url || '').trim().replace(/\/$/, ''),
            anonKey: String(source.anonKey || '').trim(),
            workspaceKey: String(source.workspaceKey || '').trim()
        };
    }

    function getDb(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        if (opts.db) return opts.db;
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.getClient !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        return supabaseStorage.getClient(settings);
    }

    function getClientsWorkspaceKey(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const cfg = normalizeCloudSettings(settings);
        const base = cfg.workspaceKey || opts.fallbackWorkspaceKey || 'local-workspace';
        return `${base}${opts.workspaceSuffix || CLIENTS_WORKSPACE_SUFFIX}`;
    }

    function normalizeClient(raw) {
        const clientsStorage = getClientsStorage();
        if (clientsStorage && typeof clientsStorage.normalizeClient === 'function') {
            return clientsStorage.normalizeClient(raw);
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        const name = String(source.name || source.client || source.title || raw || '').trim();
        return name ? { ...source, id: source.id || source.local_id || Date.now(), name } : null;
    }

    function clientCloudPayload(client, settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const normalized = normalizeClient(client);
        if (!normalized) throw new Error('Нет данных клиента для сохранения.');
        return {
            workspace_key: getClientsWorkspaceKey(settings, opts),
            local_id: String(normalized.id),
            order_id: String(normalized.id),
            client: normalized.name,
            name: normalized.name,
            total: 0,
            project_data: {
                type: 'feg-stage-pro-client',
                version: opts.version || CLIENTS_EXPORT_VERSION,
                client: normalized
            }
        };
    }

    function shouldRetryLegacyConflict(error) {
        const message = String((error && (error.message || error.details || error.hint || error.code)) || error || '');
        return /constraint|unique|conflict|owner_id|column|schema cache|PGRST204|does not exist/i.test(message);
    }

    function clientFromCloudRow(row) {
        const data = row && row.project_data && row.project_data.client ? row.project_data.client : (row && row.project_data ? row.project_data : {});
        const client = normalizeClient({
            ...data,
            id: data.id || (row && row.local_id),
            name: data.name || (row && (row.name || row.client))
        });
        if (!client) return null;
        client.cloudId = row && row.id;
        client.cloudUpdatedAt = row && row.updated_at;
        client.updatedAt = client.updatedAt || (row && row.updated_at);
        return client;
    }

    async function saveClientToCloud(client, settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const db = getDb(settings, opts);
        const tableName = opts.tableName || CLOUD_TABLE_NAME;
        const payload = clientCloudPayload(client, settings, opts);
        const onConflict = opts.onConflict || 'owner_id,workspace_key,local_id';
        let { data, error } = await db
            .from(tableName)
            .upsert(payload, { onConflict })
            .select()
            .single();
        if (error && !opts.onConflict && shouldRetryLegacyConflict(error)) {
            ({ data, error } = await db
                .from(tableName)
                .upsert(payload, { onConflict: 'workspace_key,local_id' })
                .select()
                .single());
        }
        if (error) throw error;
        return clientFromCloudRow(data) || normalizeClient(client);
    }

    async function fetchClientsFromCloud(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const db = getDb(settings, opts);
        const tableName = opts.tableName || CLOUD_TABLE_NAME;
        const limit = Number(opts.limit || 500);
        const { data, error } = await db
            .from(tableName)
            .select('*')
            .eq('workspace_key', getClientsWorkspaceKey(settings, opts))
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(clientFromCloudRow).filter(Boolean);
    }

    async function loadClientsFromCloud(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const clientsStorage = getClientsStorage();
        if (!clientsStorage || typeof clientsStorage.getClients !== 'function' || typeof clientsStorage.setClients !== 'function') {
            throw new Error('Модуль ClientsStorage недоступен.');
        }
        const incoming = await fetchClientsFromCloud(settings, opts);
        const merged = clientsStorage.mergeClients(clientsStorage.getClients(), incoming);
        clientsStorage.setClients(merged);
        return { incoming, clients: merged };
    }

    async function saveAllClientsToCloud(settings, options) {
        const clientsStorage = getClientsStorage();
        if (!clientsStorage || typeof clientsStorage.getClients !== 'function') {
            throw new Error('Модуль ClientsStorage недоступен.');
        }
        const saved = [];
        for (const client of clientsStorage.getClients()) {
            saved.push(await saveClientToCloud(client, settings, options));
        }
        return saved;
    }

    const api = {
        MODULE_NAME: 'ClientsManager',
        MODULE_STATUS: 'runtime-extracted',
        CLOUD_TABLE_NAME,
        CLIENTS_WORKSPACE_SUFFIX,
        CLIENTS_EXPORT_VERSION,
        normalizeCloudSettings,
        getClientsWorkspaceKey,
        clientCloudPayload,
        clientFromCloudRow,
        shouldRetryLegacyConflict,
        saveClientToCloud,
        fetchClientsFromCloud,
        loadClientsFromCloud,
        saveAllClientsToCloud
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ClientsManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
