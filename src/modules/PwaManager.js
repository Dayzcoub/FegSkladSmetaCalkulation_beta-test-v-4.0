// FEG Stage PRO v3.6.42 — PwaManager module
// Responsibility: PWA install prompt, iOS install hint and service worker registration.
// Classic-compatible module: attaches API to window.FEGModules.PwaManager.
(function (global) {
    'use strict';

    let deferredPrompt = null;
    let installButton = null;
    let installClickHandler = null;
    let beforeInstallHandlerBound = false;

    function getWindow(options) {
        return (options && options.window) || global.window || global;
    }

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function getNavigator(options) {
        const win = getWindow(options);
        return (options && options.navigator) || (win && win.navigator) || global.navigator || null;
    }

    function getInstallButton(options) {
        const opts = options && typeof options === 'object' ? options : {};
        if (opts.installButton) return opts.installButton;
        const doc = getDocument(opts);
        return doc ? doc.getElementById(opts.installButtonId || 'installBtn') : null;
    }

    function setInstallButtonVisible(button, visible) {
        if (button && button.style) button.style.display = visible ? 'inline-block' : 'none';
    }

    function bindInstallPrompt(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const win = getWindow(opts);
        installButton = getInstallButton(opts);

        if (win && typeof win.addEventListener === 'function' && !beforeInstallHandlerBound) {
            win.addEventListener('beforeinstallprompt', event => {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
                deferredPrompt = event;
                setInstallButtonVisible(installButton || getInstallButton(opts), true);
            });
            beforeInstallHandlerBound = true;
        }

        if (installButton && typeof installButton.addEventListener === 'function' && !installClickHandler) {
            installClickHandler = async () => {
                if (!deferredPrompt) return;
                if (typeof deferredPrompt.prompt === 'function') {
                    await deferredPrompt.prompt();
                }
                deferredPrompt = null;
                setInstallButtonVisible(installButton, false);
            };
            installButton.addEventListener('click', installClickHandler);
        }

        return installButton;
    }

    function isIOS(options) {
        const nav = getNavigator(options);
        return !!(nav && /iphone|ipad|ipod/i.test(nav.userAgent || ''));
    }

    function isStandalone(options) {
        const nav = getNavigator(options);
        const win = getWindow(options);
        return !!((nav && nav.standalone) || (win && win.matchMedia && win.matchMedia('(display-mode: standalone)').matches));
    }

    function showIosInstallHint(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        if (!doc || !doc.body) return null;
        if (!isIOS(opts) || isStandalone(opts)) return null;

        const hint = doc.createElement('div');
        hint.innerHTML = opts.message || '👉 Поделиться → На экран Домой';
        hint.style.position = 'fixed';
        hint.style.bottom = '20px';
        hint.style.left = '50%';
        hint.style.transform = 'translateX(-50%)';
        hint.style.background = '#000';
        hint.style.color = '#fff';
        hint.style.padding = '10px 16px';
        hint.style.borderRadius = '20px';
        hint.style.fontSize = '14px';
        hint.style.zIndex = '999';
        doc.body.appendChild(hint);

        const win = getWindow(opts);
        const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 5000;
        if (win && typeof win.setTimeout === 'function') {
            win.setTimeout(() => hint.remove(), timeoutMs);
        }
        return hint;
    }

    function registerServiceWorker(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const nav = getNavigator(opts);
        if (!nav || !nav.serviceWorker || typeof nav.serviceWorker.register !== 'function') {
            return Promise.resolve(null);
        }
        return nav.serviceWorker.register(opts.serviceWorkerPath || 'sw.js').catch(err => {
            if (opts.silent !== true) console.error(err);
            return null;
        });
    }

    function initPwa(options) {
        const opts = options && typeof options === 'object' ? options : {};
        bindInstallPrompt(opts);
        return registerServiceWorker(opts);
    }

    const api = {
        MODULE_NAME: 'PwaManager',
        MODULE_STATUS: 'runtime-extracted',
        bindInstallPrompt,
        isIOS,
        isStandalone,
        showIosInstallHint,
        registerServiceWorker,
        initPwa
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.PwaManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
