// FEG Stage PRO v3.6.23 — SupabaseStorage module
// Responsibility: Supabase client creation and shared cloud constants.
// Classic-compatible module: attaches API to window.FEGModules.SupabaseStorage.
(function (global) {
    'use strict';

    const CLOUD_TABLE_NAME = 'projects';

    function normalizeCloudSettings(raw) {
        const appSettings = global.FEGModules && global.FEGModules.AppSettings;
        if (appSettings && typeof appSettings.normalizeCloudSettings === 'function') {
            return appSettings.normalizeCloudSettings(raw);
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            url: String(source.url || '').trim().replace(/\/$/, ''),
            anonKey: String(source.anonKey || '').trim(),
            workspaceKey: String(source.workspaceKey || '').trim()
        };
    }

    function getClient(settings) {
        const cfg = normalizeCloudSettings(settings);
        if (!cfg.url || !cfg.anonKey) {
            throw new Error('Заполните Supabase URL и Anon public key в настройках.');
        }
        if (!global.supabase || !global.supabase.createClient) {
            throw new Error('Библиотека Supabase не загрузилась. Проверьте интернет.');
        }
        return global.supabase.createClient(cfg.url, cfg.anonKey);
    }

    async function getAuthSession(settings, options) {
        const db = (options && options.db) || getClient(settings);
        if (!db.auth || typeof db.auth.getSession !== 'function') return null;
        const { data, error } = await db.auth.getSession();
        if (error) throw error;
        return data && data.session ? data.session : null;
    }

    async function getAuthUser(settings, options) {
        const db = (options && options.db) || getClient(settings);
        if (!db.auth || typeof db.auth.getUser !== 'function') return null;
        const { data, error } = await db.auth.getUser();
        if (error) throw error;
        return data && data.user ? data.user : null;
    }

    async function signInWithEmail(settings, email, options) {
        const db = (options && options.db) || getClient(settings);
        const targetEmail = String(email || '').trim();
        if (!targetEmail) throw new Error('Введите email для входа.');
        if (!db.auth || typeof db.auth.signInWithOtp !== 'function') {
            throw new Error('Supabase Auth недоступен в текущей библиотеке.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        const payload = {
            email: targetEmail,
            options: {}
        };
        if (opts.emailRedirectTo) payload.options.emailRedirectTo = opts.emailRedirectTo;
        const { error } = await db.auth.signInWithOtp(payload);
        if (error) throw error;
        return true;
    }

    async function signOut(settings, options) {
        const db = (options && options.db) || getClient(settings);
        if (!db.auth || typeof db.auth.signOut !== 'function') return false;
        const { error } = await db.auth.signOut();
        if (error) throw error;
        return true;
    }

    function safeParseList(storageKey) {
        try {
            const raw = global.localStorage ? global.localStorage.getItem(storageKey) : null;
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function getLocalProjects(storageKey) {
        return safeParseList(storageKey);
    }

    function setLocalProjects(storageKey, projects) {
        if (!global.localStorage) return;
        global.localStorage.setItem(storageKey, JSON.stringify(Array.isArray(projects) ? projects : []));
    }

    function findLocalProjectIndex(projects, project) {
        const list = Array.isArray(projects) ? projects : [];
        if (!project) return -1;
        if (project.cloudId) {
            const byCloud = list.findIndex(item => String(item.cloudId || '') === String(project.cloudId));
            if (byCloud >= 0) return byCloud;
        }
        return list.findIndex(item => String(item.id || item._id) === String(project.id || project._id));
    }

    function prepareCloudProjectRow(project, settings, options) {
        const cfg = normalizeCloudSettings(settings);
        const opts = options && typeof options === 'object' ? options : {};
        const now = new Date().toISOString();
        const source = project && typeof project === 'object' ? project : {};
        const localId = String(source.id || source._id || Date.now());
        const payload = {
            ...source,
            appVersion: opts.appVersion || source.appVersion || '3.7.4',
            syncedAt: now
        };
        const workspaceSuffix = opts.workspaceSuffix ? String(opts.workspaceSuffix) : '';
        return {
            workspace_key: `${cfg.workspaceKey}${workspaceSuffix}`,
            local_id: localId,
            order_id: opts.orderId || source.orderId || localId,
            client: source.client || '',
            name: source.name || opts.defaultName || 'Без названия',
            total: Number(source.total || 0),
            updated_at: now,
            project_data: payload
        };
    }

    async function saveProjectToCloud(project, settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const db = opts.db || getClient(settings);
        const tableName = opts.tableName || CLOUD_TABLE_NAME;
        const row = opts.row || prepareCloudProjectRow(project, settings, opts);
        const source = project && typeof project === 'object' ? project : {};
        let result;

        if (source.cloudId) {
            result = await db
                .from(tableName)
                .update(row)
                .eq('id', source.cloudId)
                .select()
                .single();
        } else {
            const existing = await db
                .from(tableName)
                .select('id')
                .eq('workspace_key', row.workspace_key)
                .eq('local_id', row.local_id)
                .maybeSingle();

            if (existing.error) throw existing.error;

            if (existing.data && existing.data.id) {
                result = await db
                    .from(tableName)
                    .update(row)
                    .eq('id', existing.data.id)
                    .select()
                    .single();
            } else {
                result = await db
                    .from(tableName)
                    .insert(row)
                    .select()
                    .single();
            }
        }

        if (result.error) throw result.error;
        const saved = result.data || {};
        return {
            ...source,
            cloudId: saved.id,
            cloudUpdatedAt: saved.updated_at,
            updatedAt: row.updated_at
        };
    }

    function normalizeCloudProjectRow(row, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const source = row && row.project_data && typeof row.project_data === 'object' ? row.project_data : {};
        return {
            ...source,
            id: source.id || (row && row.local_id) || Date.now(),
            cloudId: row && row.id,
            cloudUpdatedAt: row && row.updated_at,
            client: source.client || (row && row.client) || '',
            name: source.name || (row && row.name) || opts.defaultName || 'Без названия',
            total: source.total !== undefined ? source.total : Number((row && row.total) || 0),
            updatedAt: source.updatedAt || (row && row.updated_at),
            date: source.date || (row && (row.created_at || row.updated_at))
        };
    }

    async function fetchProjectsFromCloud(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const db = opts.db || getClient(settings);
        const cfg = normalizeCloudSettings(settings);
        const tableName = opts.tableName || CLOUD_TABLE_NAME;
        const workspaceSuffix = opts.workspaceSuffix ? String(opts.workspaceSuffix) : '';
        const limit = Number(opts.limit || 300);
        const { data, error } = await db
            .from(tableName)
            .select('*')
            .eq('workspace_key', `${cfg.workspaceKey}${workspaceSuffix}`)
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(row => normalizeCloudProjectRow(row, opts));
    }

    function mergeCloudProjects(localProjects, incomingProjects, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const list = Array.isArray(localProjects) ? [...localProjects] : [];
        const incoming = Array.isArray(incomingProjects) ? incomingProjects : [];
        incoming.forEach(project => {
            const idx = findLocalProjectIndex(list, project);
            if (idx >= 0) {
                const localUpdated = new Date(list[idx].updatedAt || list[idx].date || 0).getTime();
                const cloudUpdated = new Date(project.updatedAt || project.cloudUpdatedAt || 0).getTime();
                if (opts.preserveNewerLocal && localUpdated > cloudUpdated) {
                    list[idx] = { ...list[idx], cloudId: project.cloudId, cloudUpdatedAt: project.cloudUpdatedAt };
                } else {
                    list[idx] = project;
                }
            } else {
                list.push(project);
            }
        });
        list.sort((a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0));
        return list;
    }

    const api = {
        MODULE_NAME: 'SupabaseStorage',
        MODULE_STATUS: 'runtime-extracted',
        CLOUD_TABLE_NAME,
        normalizeCloudSettings,
        getClient,
        getAuthSession,
        getAuthUser,
        signInWithEmail,
        signOut,
        getLocalProjects,
        setLocalProjects,
        findLocalProjectIndex,
        prepareCloudProjectRow,
        saveProjectToCloud,
        normalizeCloudProjectRow,
        fetchProjectsFromCloud,
        mergeCloudProjects
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.SupabaseStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
