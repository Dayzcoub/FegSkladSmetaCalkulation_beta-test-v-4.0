// FEG Stage PRO v3.6.44 — ToastManager module
// Responsibility: shared lightweight toast notifications.
// Classic-compatible module: attaches API to window.FEGModules.ToastManager.
(function (global) {
    'use strict';

    const DEFAULT_OPTIONS = {
        duration: 2000,
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#c4a06f',
        color: '#111820',
        padding: '10px 20px',
        borderRadius: '60px',
        fontWeight: 'bold',
        zIndex: '999'
    };

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function applyStyles(element, options) {
        const settings = Object.assign({}, DEFAULT_OPTIONS, options || {});
        element.style.position = settings.position;
        element.style.bottom = settings.bottom;
        element.style.left = settings.left;
        element.style.transform = settings.transform;
        element.style.backgroundColor = settings.backgroundColor;
        element.style.color = settings.color;
        element.style.padding = settings.padding;
        element.style.borderRadius = settings.borderRadius;
        element.style.fontWeight = settings.fontWeight;
        element.style.zIndex = settings.zIndex;
        return settings;
    }

    function showToast(text, options) {
        const doc = getDocument(options);
        if (!doc || !doc.createElement || !doc.body) return null;

        const toastMsg = doc.createElement('div');
        toastMsg.textContent = text == null ? '' : String(text);
        const settings = applyStyles(toastMsg, options);
        doc.body.appendChild(toastMsg);

        const timeoutFn = (options && options.setTimeout) || global.setTimeout;
        const duration = Number.isFinite(Number(settings.duration)) ? Number(settings.duration) : DEFAULT_OPTIONS.duration;
        if (typeof timeoutFn === 'function' && duration >= 0) {
            timeoutFn(function () {
                if (toastMsg && typeof toastMsg.remove === 'function') toastMsg.remove();
                else if (toastMsg && toastMsg.parentNode) toastMsg.parentNode.removeChild(toastMsg);
            }, duration);
        }

        return toastMsg;
    }

    const api = {
        MODULE_NAME: 'ToastManager',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULT_OPTIONS,
        showToast,
        show: showToast
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ToastManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
