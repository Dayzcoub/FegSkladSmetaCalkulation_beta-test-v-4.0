// FEG Stage PRO v3.6.48 — TrussBootstrap module
// Responsibility: small startup/bootstrap helpers for the truss workspace.
// Classic-compatible module: attaches API to window.FEGModules.TrussBootstrap.
(function (global) {
    'use strict';

    const DEFAULT_DRAFT_KEY = 'trussDraftSettings';
    const DEFAULT_GRID_CONTROL_IDS = ['trussCols', 'trussRows', 'trussCellMeters', 'trussZoom'];
    const DEFAULT_CALCULATION_INPUT_IDS = [
        'trussProjectName',
        'trussClientName',
        'trussSupportCount',
        'trussInstallCost',
        'trussPricePerMeter',
        'trussCornerPrice',
        'trussUprightPrice',
        'trussBasePrice',
        'trussWeightPerMeter',
        'trussCornerWeight',
        'trussUprightWeight',
        'trussBaseWeight'
    ];

    function getWindow(options) {
        return (options && options.window) || global.window || global;
    }

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function getStorage(options) {
        if (options && options.storage) return options.storage;
        const win = getWindow(options);
        return (win && win.localStorage) || global.localStorage || null;
    }

    function call(fn, ...args) {
        if (typeof fn !== 'function') return undefined;
        return fn(...args);
    }

    function getElement(id, options) {
        if (!id) return null;
        if (options && typeof options.getElement === 'function') return options.getElement(id);
        const doc = getDocument(options);
        return doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
    }

    function parseJsonObject(value, fallback) {
        if (!value) return fallback || {};
        try {
            const parsed = JSON.parse(String(value));
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : (fallback || {});
        } catch (err) {
            return fallback || {};
        }
    }

    function normalizeDraftSettings(value, defaults) {
        const source = value && typeof value === 'object' ? value : {};
        const opts = defaults && typeof defaults === 'object' ? defaults : {};
        return {
            cols: Number(source.cols || opts.cols || opts.defaultCols || 16),
            rows: Number(source.rows || opts.rows || opts.defaultRows || 12),
            cellMeters: Number(source.cellMeters || opts.cellMeters || 0.5),
            zoom: Number(source.zoom || opts.zoom || 100)
        };
    }

    function loadDraftSettings(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const storage = getStorage(opts);
        if (!storage || typeof storage.getItem !== 'function') return {};
        return parseJsonObject(storage.getItem(opts.key || DEFAULT_DRAFT_KEY), {});
    }

    function saveDraftSettings(settings, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const storage = getStorage(opts);
        if (!storage || typeof storage.setItem !== 'function') return false;
        storage.setItem(opts.key || DEFAULT_DRAFT_KEY, JSON.stringify(settings || {}));
        return true;
    }

    function bindInputEvent(input, eventName, handler) {
        if (!input || typeof input.addEventListener !== 'function' || typeof handler !== 'function') {
            return function noopUnbindInput() {};
        }
        input.addEventListener(eventName, handler);
        return function unbindInput() {
            input.removeEventListener(eventName, handler);
        };
    }

    function bindTrussInputs(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const gridControlIds = opts.gridControlIds || DEFAULT_GRID_CONTROL_IDS;
        const calculationInputIds = opts.calculationInputIds || DEFAULT_CALCULATION_INPUT_IDS;
        const unbinders = [];

        gridControlIds.forEach(id => {
            const el = getElement(id, opts);
            unbinders.push(bindInputEvent(el, 'change', opts.applyGridSettings));
            if (id === 'trussZoom') {
                unbinders.push(bindInputEvent(el, 'input', opts.applyGridSettings));
            }
        });

        calculationInputIds.forEach(id => {
            const el = getElement(id, opts);
            unbinders.push(bindInputEvent(el, 'input', opts.calculate));
        });

        return function unbindTrussInputs() {
            unbinders.forEach(unbind => call(unbind));
        };
    }

    function initTrussWorkspace(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const grid = getElement(opts.gridId || 'trussGrid', opts);
        if (!grid) return null;

        const rawDraft = typeof opts.loadDraftSettings === 'function'
            ? call(opts.loadDraftSettings)
            : loadDraftSettings(opts);
        const draft = normalizeDraftSettings(rawDraft, opts);

        call(opts.applyDraftSettings, draft);
        call(opts.renderGrid);
        const unbindInputs = typeof opts.bindInputs === 'function'
            ? call(opts.bindInputs)
            : bindTrussInputs(opts);
        call(opts.renderProjects);
        call(opts.calculate);

        return function unbindTrussWorkspace() {
            call(unbindInputs);
        };
    }

    const api = {
        MODULE_NAME: 'TrussBootstrap',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULT_DRAFT_KEY,
        DEFAULT_GRID_CONTROL_IDS,
        DEFAULT_CALCULATION_INPUT_IDS,
        call,
        getElement,
        parseJsonObject,
        normalizeDraftSettings,
        loadDraftSettings,
        saveDraftSettings,
        bindInputEvent,
        bindTrussInputs,
        initTrussWorkspace
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.TrussBootstrap = api;
})(typeof window !== 'undefined' ? window : globalThis);
