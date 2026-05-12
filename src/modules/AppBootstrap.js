// FEG Stage PRO v3.6.47 — AppBootstrap module
// Responsibility: small startup/bootstrap helpers for the legacy stage workspace.
// Classic-compatible module: attaches API to window.FEGModules.AppBootstrap.
(function (global) {
    'use strict';

    function getWindow(options) {
        return (options && options.window) || global.window || global;
    }

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function call(fn, ...args) {
        if (typeof fn !== 'function') return undefined;
        return fn(...args);
    }

    function setDefaultValue(input, value) {
        if (input && !input.value) input.value = value;
        return input;
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

    function bindGridZoom(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const input = opts.gridZoom;
        if (!input || typeof opts.setGridZoom !== 'function') return function noopUnbindGridZoom() {};
        opts.setGridZoom(input.value);
        return bindInputEvent(input, 'input', () => opts.setGridZoom(input.value));
    }

    function bindGridDimensions(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const unbinders = [];
        if (typeof opts.applyGridDimensionsFromInputs === 'function') {
            unbinders.push(bindInputEvent(opts.gridColsInput, 'change', opts.applyGridDimensionsFromInputs));
            unbinders.push(bindInputEvent(opts.gridRowsInput, 'change', opts.applyGridDimensionsFromInputs));
        }
        return function unbindGridDimensions() {
            unbinders.forEach(unbind => call(unbind));
        };
    }

    function bindGridResize(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const win = getWindow(opts);
        const unbinders = [];
        let resizeObserver = null;

        if (win && typeof win.addEventListener === 'function' && typeof opts.fitGridToScreen === 'function') {
            win.addEventListener('resize', opts.fitGridToScreen);
            unbinders.push(() => win.removeEventListener('resize', opts.fitGridToScreen));
        }

        const ResizeObserverCtor = (win && win.ResizeObserver) || global.ResizeObserver;
        if (ResizeObserverCtor && opts.stageGrid && opts.stageGrid.parentElement && typeof opts.fitGridToScreen === 'function') {
            resizeObserver = new ResizeObserverCtor(opts.fitGridToScreen);
            resizeObserver.observe(opts.stageGrid.parentElement);
            unbinders.push(() => resizeObserver.disconnect());
        }

        return function unbindGridResize() {
            unbinders.forEach(unbind => call(unbind));
        };
    }

    function bindStageInputs(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const unbinders = [];

        if (typeof opts.calc === 'function') {
            const recalc = () => opts.calc(false);
            unbinders.push(bindInputEvent(opts.columnTypeSelect, 'change', recalc));
            unbinders.push(bindInputEvent(opts.frameTypeSelect, 'change', recalc));
        }

        if (typeof opts.applyRectangle === 'function') {
            unbinders.push(bindInputEvent(opts.widthInput, 'change', opts.applyRectangle));
            unbinders.push(bindInputEvent(opts.depthInput, 'change', opts.applyRectangle));
        }

        return function unbindStageInputs() {
            unbinders.forEach(unbind => call(unbind));
        };
    }

    function initStageWorkspace(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const unbinders = [];

        call(opts.applyAppTheme, opts.appTheme);
        call(opts.renderClients);
        call(opts.setGridDimensions, opts.defaultGridCols, opts.defaultGridRows, false);
        call(opts.renderOrders);

        setDefaultValue(opts.widthInput, opts.defaultWidth == null ? 4 : opts.defaultWidth);
        setDefaultValue(opts.depthInput, opts.defaultDepth == null ? 3 : opts.defaultDepth);

        call(opts.syncWeightInputs);
        unbinders.push(bindGridZoom(opts));
        unbinders.push(bindGridDimensions(opts));
        unbinders.push(bindGridResize(opts));

        call(opts.applyRectangle);
        unbinders.push(bindStageInputs(opts));
        call(opts.syncTransportInputs);
        call(opts.updateSaveOrderMode);
        call(opts.showIosHint);

        return function unbindStageWorkspace() {
            unbinders.forEach(unbind => call(unbind));
        };
    }

    const api = {
        MODULE_NAME: 'AppBootstrap',
        MODULE_STATUS: 'runtime-extracted',
        call,
        setDefaultValue,
        bindInputEvent,
        bindGridZoom,
        bindGridDimensions,
        bindGridResize,
        bindStageInputs,
        initStageWorkspace
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.AppBootstrap = api;
})(typeof window !== 'undefined' ? window : globalThis);
