// FEG Stage PRO v3.6.43 — ModalManager module
// Responsibility: shared modal open/close helpers and common backdrop/Escape bindings.
// Classic-compatible module: attaches API to window.FEGModules.ModalManager.
(function (global) {
    'use strict';

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function getWindow(options) {
        return (options && options.window) || global.window || global;
    }

    function openModal(modal) {
        if (!modal) return false;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        return true;
    }

    function closeModal(modal) {
        if (!modal) return false;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        return true;
    }

    function isOpen(modal) {
        return !!(modal && modal.classList && modal.classList.contains('open'));
    }

    function normalizeItem(item) {
        if (!item) return null;
        if (item.nodeType === 1) return { modal: item, close: function () { closeModal(item); } };
        const modal = item.modal || item.element || null;
        if (!modal) return null;
        const close = typeof item.close === 'function' ? item.close : function () { closeModal(modal); };
        return { modal, close };
    }

    function bindBackdropClose(item) {
        const normalized = normalizeItem(item);
        if (!normalized || !normalized.modal || typeof normalized.modal.addEventListener !== 'function') {
            return function noopUnbind() {};
        }

        const modal = normalized.modal;
        const handler = function (event) {
            if (event && event.target === modal) normalized.close(event);
        };

        modal.addEventListener('click', handler);
        return function unbindBackdropClose() {
            modal.removeEventListener('click', handler);
        };
    }

    function bindEscapeClose(items, options) {
        const list = (Array.isArray(items) ? items : [items]).map(normalizeItem).filter(Boolean);
        const win = getWindow(options);
        if (!list.length || !win || typeof win.addEventListener !== 'function') {
            return function noopUnbind() {};
        }

        const closeOnlyOpen = !options || options.closeOnlyOpen !== false;
        const handler = function (event) {
            if (!event || event.key !== 'Escape') return;
            list.forEach(function (item) {
                if (!closeOnlyOpen || isOpen(item.modal)) item.close(event);
            });
        };

        win.addEventListener('keydown', handler);
        return function unbindEscapeClose() {
            win.removeEventListener('keydown', handler);
        };
    }

    function bindModalGroup(items, options) {
        const list = (Array.isArray(items) ? items : [items]).map(normalizeItem).filter(Boolean);
        const unbinders = [];
        list.forEach(function (item) {
            unbinders.push(bindBackdropClose(item));
        });
        unbinders.push(bindEscapeClose(list, options));
        return function unbindModalGroup() {
            unbinders.forEach(function (unbind) {
                if (typeof unbind === 'function') unbind();
            });
        };
    }

    function closeAll(items) {
        const list = (Array.isArray(items) ? items : [items]).map(normalizeItem).filter(Boolean);
        list.forEach(function (item) { item.close(); });
    }

    const api = {
        MODULE_NAME: 'ModalManager',
        MODULE_STATUS: 'runtime-extracted',
        openModal,
        closeModal,
        isOpen,
        closeAll,
        bindBackdropClose,
        bindEscapeClose,
        bindModalGroup
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.ModalManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
