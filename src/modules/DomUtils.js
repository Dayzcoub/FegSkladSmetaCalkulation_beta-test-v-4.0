// FEG Stage PRO v3.6.46 — DomUtils module
// Responsibility: shared safe DOM access helpers for legacy bridge code.
// Classic-compatible module: attaches API to window.FEGModules.DomUtils.
(function (global) {
    'use strict';

    function rootScope(root) {
        return root || (global && global.document) || null;
    }

    function getElementById(id, root) {
        const scope = rootScope(root);
        if (!scope || typeof scope.getElementById !== 'function') return null;
        return scope.getElementById(String(id));
    }

    function q(id, root) {
        return getElementById(id, root);
    }

    function query(selector, root) {
        const scope = rootScope(root);
        if (!scope || typeof scope.querySelector !== 'function') return null;
        return scope.querySelector(String(selector));
    }

    function queryAll(selector, root) {
        const scope = rootScope(root);
        if (!scope || typeof scope.querySelectorAll !== 'function') return [];
        return Array.from(scope.querySelectorAll(String(selector)));
    }

    function getValue(id, fallback, root) {
        const el = getElementById(id, root);
        if (!el) return fallback === undefined ? '' : fallback;
        return el.value;
    }

    function setValue(id, value, root) {
        const el = getElementById(id, root);
        if (el) el.value = value == null ? '' : value;
        return el;
    }

    function getNumber(id, fallback, root) {
        const raw = getValue(id, fallback, root);
        const text = String(raw == null ? '' : raw).replace(',', '.').trim();
        const n = Number(text);
        return Number.isFinite(n) ? n : (Number.isFinite(Number(fallback)) ? Number(fallback) : 0);
    }

    function setText(id, value, root) {
        const el = getElementById(id, root);
        if (el) el.textContent = value == null ? '' : String(value);
        return el;
    }

    function setHtml(id, value, root) {
        const el = getElementById(id, root);
        if (el) el.innerHTML = value == null ? '' : String(value);
        return el;
    }

    function addClass(id, className, root) {
        const el = getElementById(id, root);
        if (el && className) el.classList.add(String(className));
        return el;
    }

    function removeClass(id, className, root) {
        const el = getElementById(id, root);
        if (el && className) el.classList.remove(String(className));
        return el;
    }

    function toggleClass(id, className, force, root) {
        const el = getElementById(id, root);
        if (el && className) el.classList.toggle(String(className), force);
        return el;
    }

    function on(target, eventName, handler, options) {
        if (!target || typeof target.addEventListener !== 'function' || !eventName || typeof handler !== 'function') return null;
        target.addEventListener(eventName, handler, options);
        return function off() {
            target.removeEventListener(eventName, handler, options);
        };
    }

    const api = {
        MODULE_NAME: 'DomUtils',
        MODULE_STATUS: 'runtime-extracted',
        getElementById,
        q,
        query,
        queryAll,
        getValue,
        setValue,
        getNumber,
        setText,
        setHtml,
        addClass,
        removeClass,
        toggleClass,
        on
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.DomUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
