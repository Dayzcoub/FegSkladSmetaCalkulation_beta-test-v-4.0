// FEG Stage PRO v3.6.37 — ProjectManager module
// Responsibility: bridge local ProjectStorage with SupabaseStorage for project sync flows.
// Classic-compatible module: attaches API to window.FEGModules.ProjectManager.
(function (global) {
    'use strict';

    const CLOUD_TABLE_NAME = 'projects';
    const DEFAULT_STAGE_APP_VERSION = '3.7.4';
    const DEFAULT_TRUSS_APP_VERSION = '3.7.4';
    const TRUSS_WORKSPACE_SUFFIX = '-truss';

    function getProjectStorage() {
        return global.FEGModules && global.FEGModules.ProjectStorage ? global.FEGModules.ProjectStorage : null;
    }

    function getSupabaseStorage() {
        return global.FEGModules && global.FEGModules.SupabaseStorage ? global.FEGModules.SupabaseStorage : null;
    }

    function defaultFormatStageOrderId(order, fallbackIndex) {
        const raw = String((order && (order.id || order._id || order.orderId)) || Number(fallbackIndex || 0) + 1);
        const suffix = raw.length > 6 ? raw.slice(-6) : raw.padStart(6, '0');
        return `FEG-${suffix}`;
    }

    function getStageOrders() {
        const projectStorage = getProjectStorage();
        return projectStorage && typeof projectStorage.getStageOrders === 'function'
            ? projectStorage.getStageOrders()
            : [];
    }

    function setStageOrders(orders) {
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.setStageOrders === 'function') {
            projectStorage.setStageOrders(Array.isArray(orders) ? orders : []);
        }
    }

    function getTrussProjects() {
        const projectStorage = getProjectStorage();
        return projectStorage && typeof projectStorage.getTrussProjects === 'function'
            ? projectStorage.getTrussProjects()
            : [];
    }

    function setTrussProjects(projects) {
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.setTrussProjects === 'function') {
            projectStorage.setTrussProjects(Array.isArray(projects) ? projects : []);
        }
    }

    function limitProjects(projects, maxItems) {
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.limitProjects === 'function') {
            return projectStorage.limitProjects(projects, maxItems);
        }
        const list = Array.isArray(projects) ? projects : [];
        const limit = Number(maxItems || 0);
        return limit > 0 ? list.slice(0, limit) : list;
    }

    function findStageOrderIndex(orders, order) {
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.findProjectIndex === 'function') {
            return projectStorage.findProjectIndex(orders, order);
        }
        const list = Array.isArray(orders) ? orders : [];
        if (!order) return -1;
        if (order.cloudId) {
            const byCloud = list.findIndex(item => String(item.cloudId || '') === String(order.cloudId));
            if (byCloud >= 0) return byCloud;
        }
        return list.findIndex(item => String(item.id || item._id) === String(order.id || order._id));
    }

    function findTrussProjectIndex(projects, project) {
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.findProjectIndex === 'function') {
            return projectStorage.findProjectIndex(projects, project);
        }
        const list = Array.isArray(projects) ? projects : [];
        if (!project) return -1;
        if (project.cloudId) {
            const byCloud = list.findIndex(item => String(item.cloudId || '') === String(project.cloudId));
            if (byCloud >= 0) return byCloud;
        }
        return list.findIndex(item => String(item.id || item._id) === String(project.id || project._id));
    }

    function prepareStageCloudRow(order, settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.prepareCloudProjectRow !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        const orderIdFormatter = typeof opts.orderIdFormatter === 'function'
            ? opts.orderIdFormatter
            : defaultFormatStageOrderId;
        return supabaseStorage.prepareCloudProjectRow(order, settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            appVersion: opts.appVersion || DEFAULT_STAGE_APP_VERSION,
            orderId: opts.orderId || orderIdFormatter(order, opts.fallbackIndex || 0),
            defaultName: opts.defaultName || 'Без названия'
        });
    }

    function normalizeStageCloudRow(row, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.normalizeCloudProjectRow !== 'function') {
            const project = row && row.project_data && typeof row.project_data === 'object' ? row.project_data : {};
            return {
                ...project,
                id: project.id || (row && row.local_id) || Date.now(),
                cloudId: row && row.id,
                cloudUpdatedAt: row && row.updated_at,
                client: project.client || (row && row.client) || '',
                name: project.name || (row && row.name) || 'Без названия',
                total: project.total !== undefined ? project.total : Number((row && row.total) || 0),
                updatedAt: project.updatedAt || (row && row.updated_at),
                date: project.date || (row && (row.created_at || row.updated_at))
            };
        }
        return supabaseStorage.normalizeCloudProjectRow(row, {
            defaultName: (options && options.defaultName) || 'Без названия'
        });
    }

    async function saveStageOrderToCloud(order, settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.saveProjectToCloud !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        const orderIdFormatter = typeof opts.orderIdFormatter === 'function'
            ? opts.orderIdFormatter
            : defaultFormatStageOrderId;
        return supabaseStorage.saveProjectToCloud(order, settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            appVersion: opts.appVersion || DEFAULT_STAGE_APP_VERSION,
            orderId: opts.orderId || orderIdFormatter(order, opts.fallbackIndex || 0),
            defaultName: opts.defaultName || 'Без названия',
            db: opts.db,
            row: opts.row
        });
    }

    function replaceStageOrderAfterCloudSave(referenceOrder, savedOrder, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const projectStorage = getProjectStorage();
        if (projectStorage && typeof projectStorage.replaceStageOrderSnapshot === 'function') {
            return projectStorage.replaceStageOrderSnapshot(referenceOrder, savedOrder, {
                insertIfMissing: !!opts.insertIfMissing,
                maxItems: opts.maxItems || 100,
                allowIndexFallback: !!opts.allowIndexFallback
            });
        }

        const orders = getStageOrders();
        const idx = findStageOrderIndex(orders, referenceOrder);
        if (idx >= 0) orders[idx] = savedOrder;
        else if (opts.insertIfMissing) orders.unshift(savedOrder);
        const limited = limitProjects(orders, opts.maxItems || 100);
        setStageOrders(limited);
        return {
            orders: limited,
            index: idx,
            wasReplaced: idx >= 0
        };
    }

    async function uploadStageOrderToCloud(order, settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const savedOrder = await saveStageOrderToCloud(order, settings, opts);
        const replaceResult = replaceStageOrderAfterCloudSave(order, savedOrder, {
            insertIfMissing: !!opts.insertIfMissing,
            maxItems: opts.maxItems || 100,
            allowIndexFallback: !!opts.allowIndexFallback
        });
        return {
            order: savedOrder,
            orders: replaceResult.orders || getStageOrders(),
            index: replaceResult.index,
            wasReplaced: replaceResult.wasReplaced
        };
    }

    function mergeStageOrders(localOrders, incomingOrders, options) {
        const supabaseStorage = getSupabaseStorage();
        if (supabaseStorage && typeof supabaseStorage.mergeCloudProjects === 'function') {
            return supabaseStorage.mergeCloudProjects(localOrders, incomingOrders, {
                preserveNewerLocal: options && options.preserveNewerLocal !== undefined ? !!options.preserveNewerLocal : true
            });
        }

        const orders = Array.isArray(localOrders) ? [...localOrders] : [];
        const incoming = Array.isArray(incomingOrders) ? incomingOrders : [];
        incoming.forEach(project => {
            const idx = findStageOrderIndex(orders, project);
            if (idx >= 0) {
                const localUpdated = new Date(orders[idx].updatedAt || orders[idx].date || 0).getTime();
                const cloudUpdated = new Date(project.updatedAt || project.cloudUpdatedAt || 0).getTime();
                if (cloudUpdated >= localUpdated) orders[idx] = project;
                else orders[idx] = { ...orders[idx], cloudId: project.cloudId, cloudUpdatedAt: project.cloudUpdatedAt };
            } else {
                orders.push(project);
            }
        });
        orders.sort((a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0));
        return orders;
    }

    async function fetchStageOrdersFromCloud(settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.fetchProjectsFromCloud !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        return supabaseStorage.fetchProjectsFromCloud(settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            limit: opts.limit || 300,
            defaultName: opts.defaultName || 'Без названия',
            workspaceSuffix: opts.workspaceSuffix || ''
        });
    }

    async function loadStageOrdersFromCloud(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const incoming = await fetchStageOrdersFromCloud(settings, opts);
        const localOrders = getStageOrders();
        const merged = mergeStageOrders(localOrders, incoming, { preserveNewerLocal: true });
        const limited = limitProjects(merged, opts.maxItems || opts.limit || 300);
        setStageOrders(limited);
        return {
            incoming,
            orders: limited
        };
    }

    function defaultFormatTrussOrderId(project) {
        const id = project && (project.id || project._id);
        return (project && project.orderId) || `TR-${id || Date.now()}`;
    }

    function prepareTrussCloudRow(project, settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.prepareCloudProjectRow !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        const orderIdFormatter = typeof opts.orderIdFormatter === 'function'
            ? opts.orderIdFormatter
            : defaultFormatTrussOrderId;
        return supabaseStorage.prepareCloudProjectRow(project, settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            workspaceSuffix: opts.workspaceSuffix || TRUSS_WORKSPACE_SUFFIX,
            appVersion: opts.appVersion || DEFAULT_TRUSS_APP_VERSION,
            orderId: opts.orderId || orderIdFormatter(project),
            defaultName: opts.defaultName || 'Фермы'
        });
    }

    function normalizeTrussCloudRow(row, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.normalizeCloudProjectRow !== 'function') {
            const project = row && row.project_data && typeof row.project_data === 'object' ? row.project_data : {};
            return {
                ...project,
                id: project.id || (row && row.local_id) || Date.now(),
                cloudId: row && row.id,
                cloudUpdatedAt: row && row.updated_at,
                client: project.client || (row && row.client) || '',
                name: project.name || (row && row.name) || 'Фермы',
                total: project.total !== undefined ? project.total : Number((row && row.total) || 0),
                updatedAt: project.updatedAt || (row && row.updated_at),
                date: project.date || (row && (row.created_at || row.updated_at))
            };
        }
        return supabaseStorage.normalizeCloudProjectRow(row, {
            defaultName: (options && options.defaultName) || 'Фермы'
        });
    }

    async function saveTrussProjectToCloud(project, settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.saveProjectToCloud !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        const orderIdFormatter = typeof opts.orderIdFormatter === 'function'
            ? opts.orderIdFormatter
            : defaultFormatTrussOrderId;
        return supabaseStorage.saveProjectToCloud(project, settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            workspaceSuffix: opts.workspaceSuffix || TRUSS_WORKSPACE_SUFFIX,
            appVersion: opts.appVersion || DEFAULT_TRUSS_APP_VERSION,
            orderId: opts.orderId || orderIdFormatter(project),
            defaultName: opts.defaultName || 'Фермы',
            db: opts.db,
            row: opts.row
        });
    }

    function replaceTrussProjectAfterCloudSave(referenceProject, savedProject, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const projects = getTrussProjects();
        const idx = findTrussProjectIndex(projects, referenceProject || savedProject);
        if (idx >= 0) projects[idx] = savedProject;
        else if (opts.insertIfMissing) projects.unshift(savedProject);
        const limited = opts.maxItems ? limitProjects(projects, opts.maxItems) : projects;
        setTrussProjects(limited);
        return {
            projects: limited,
            index: idx,
            wasReplaced: idx >= 0
        };
    }

    async function uploadTrussProjectToCloud(project, settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const savedProject = await saveTrussProjectToCloud(project, settings, opts);
        const replaceResult = replaceTrussProjectAfterCloudSave(project, savedProject, {
            insertIfMissing: !!opts.insertIfMissing,
            maxItems: opts.maxItems || 0
        });
        return {
            project: savedProject,
            projects: replaceResult.projects || getTrussProjects(),
            index: replaceResult.index,
            wasReplaced: replaceResult.wasReplaced
        };
    }

    function mergeTrussProjects(localProjects, incomingProjects, options) {
        const supabaseStorage = getSupabaseStorage();
        if (supabaseStorage && typeof supabaseStorage.mergeCloudProjects === 'function') {
            return supabaseStorage.mergeCloudProjects(localProjects, incomingProjects, {
                preserveNewerLocal: options && options.preserveNewerLocal !== undefined ? !!options.preserveNewerLocal : false
            });
        }

        const projects = Array.isArray(localProjects) ? [...localProjects] : [];
        const incoming = Array.isArray(incomingProjects) ? incomingProjects : [];
        incoming.forEach(project => {
            const idx = findTrussProjectIndex(projects, project);
            if (idx >= 0) projects[idx] = project;
            else projects.push(project);
        });
        projects.sort((a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0));
        return projects;
    }

    async function fetchTrussProjectsFromCloud(settings, options) {
        const supabaseStorage = getSupabaseStorage();
        if (!supabaseStorage || typeof supabaseStorage.fetchProjectsFromCloud !== 'function') {
            throw new Error('Модуль SupabaseStorage недоступен.');
        }
        const opts = options && typeof options === 'object' ? options : {};
        return supabaseStorage.fetchProjectsFromCloud(settings, {
            tableName: opts.tableName || CLOUD_TABLE_NAME,
            workspaceSuffix: opts.workspaceSuffix || TRUSS_WORKSPACE_SUFFIX,
            limit: opts.limit || 300,
            defaultName: opts.defaultName || 'Фермы'
        });
    }

    async function loadTrussProjectsFromCloud(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const incoming = await fetchTrussProjectsFromCloud(settings, opts);
        const localProjects = getTrussProjects();
        const merged = mergeTrussProjects(localProjects, incoming, {
            preserveNewerLocal: opts.preserveNewerLocal !== undefined ? !!opts.preserveNewerLocal : false
        });
        const limited = limitProjects(merged, opts.maxItems || opts.limit || 300);
        setTrussProjects(limited);
        return {
            incoming,
            projects: limited
        };
    }

    const api = {
        MODULE_NAME: 'ProjectManager',
        MODULE_STATUS: 'runtime-extracted',
        CLOUD_TABLE_NAME,
        DEFAULT_STAGE_APP_VERSION,
        DEFAULT_TRUSS_APP_VERSION,
        TRUSS_WORKSPACE_SUFFIX,
        defaultFormatStageOrderId,
        getStageOrders,
        setStageOrders,
        getTrussProjects,
        setTrussProjects,
        limitProjects,
        findStageOrderIndex,
        findTrussProjectIndex,
        prepareStageCloudRow,
        normalizeStageCloudRow,
        saveStageOrderToCloud,
        replaceStageOrderAfterCloudSave,
        uploadStageOrderToCloud,
        mergeStageOrders,
        fetchStageOrdersFromCloud,
        loadStageOrdersFromCloud,
        defaultFormatTrussOrderId,
        prepareTrussCloudRow,
        normalizeTrussCloudRow,
        saveTrussProjectToCloud,
        replaceTrussProjectAfterCloudSave,
        uploadTrussProjectToCloud,
        mergeTrussProjects,
        fetchTrussProjectsFromCloud,
        loadTrussProjectsFromCloud
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ProjectManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
