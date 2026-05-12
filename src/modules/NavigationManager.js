// FEG Stage PRO v3.6.41 — NavigationManager module
// Responsibility: page switching and navigation bootstrap bridge for stage / clients / truss pages.
// Classic-compatible module: attaches API to window.FEGModules.NavigationManager.
(function (global) {
    'use strict';

    const PAGES = ['stage', 'clients', 'truss', 'v4'];

    function getDocument(options) {
        return (options && options.document) || global.document || null;
    }

    function getWindow(options) {
        return (options && options.window) || global.window || global;
    }

    function normalizePage(page) {
        const value = String(page || '').replace(/^#/, '').trim().toLowerCase();
        return PAGES.includes(value) ? value : 'stage';
    }

    function pageFromHash(hash) {
        return normalizePage(hash || (global.location && global.location.hash) || 'stage');
    }

    function getRefs(doc) {
        return {
            pages: {
                stage: doc ? doc.getElementById('stagePage') : null,
                clients: doc ? doc.getElementById('clientsPage') : null,
                truss: doc ? doc.getElementById('trussPage') : null,
                v4: doc ? doc.getElementById('v4ShellPage') : null
            },
            buttons: {
                stage: doc ? doc.getElementById('navStageBtn') : null,
                clients: doc ? doc.getElementById('navClientsBtn') : null,
                truss: doc ? doc.getElementById('navTrussBtn') : null,
                v4: doc ? doc.getElementById('navV4Btn') : null
            }
        };
    }

    function applyPageState(target, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = getDocument(opts);
        const normalized = normalizePage(target);
        const refs = getRefs(doc);

        PAGES.forEach(page => {
            const active = page === normalized;
            const pageEl = refs.pages[page];
            const btn = refs.buttons[page];

            if (pageEl) pageEl.classList.toggle('active-page', active);
            if (doc && doc.body) doc.body.classList.toggle(`page-${page}`, active);

            if (btn) {
                btn.classList.toggle('active', active);
                btn.classList.toggle('btn-primary', active);
                btn.classList.toggle('btn-secondary', !active);
                btn.setAttribute('aria-current', active ? 'page' : 'false');
            }
        });

        return normalized;
    }

    function syncHash(target, options) {
        const opts = options && typeof options === 'object' ? options : {};
        if (!opts.updateHash) return;
        const win = getWindow(opts);
        const desired = `#${normalizePage(target)}`;
        if (!win || !win.location || win.location.hash === desired) return;
        if (win.history && typeof win.history.replaceState === 'function') {
            win.history.replaceState(null, '', desired);
        } else {
            win.location.hash = desired;
        }
    }

    function runAfterSwitch(target, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const win = getWindow(opts);
        const doc = getDocument(opts);
        const normalized = normalizePage(target);
        const callbacks = opts.callbacks || {};
        const delay = Number.isFinite(opts.delayMs) ? opts.delayMs : 40;

        const runner = () => {
            if (normalized === 'truss') {
                if (typeof callbacks.renderTrussGrid === 'function') callbacks.renderTrussGrid();
                if (typeof callbacks.calculateTruss === 'function') callbacks.calculateTruss();
            } else if (normalized === 'clients') {
                if (typeof callbacks.renderClients === 'function') callbacks.renderClients();
            } else if (normalized === 'v4') {
                if (global.FEGModules && global.FEGModules.V4AppShell && typeof global.FEGModules.V4AppShell.renderShell === 'function') {
                    const pageEl = doc ? doc.getElementById('v4ShellPage') : null;
                    if (pageEl) global.FEGModules.V4AppShell.renderShell(pageEl);
                }
            } else {
                if (typeof callbacks.fitGridToScreen === 'function') callbacks.fitGridToScreen();
                if (typeof callbacks.calc === 'function') callbacks.calc(false);
            }

            if (win && typeof win.scrollTo === 'function' && opts.scroll !== false) {
                try {
                    win.scrollTo({ top: 0, behavior: opts.scrollBehavior || 'smooth' });
                } catch (err) {
                    win.scrollTo(0, 0);
                }
            }
        };

        if (win && typeof win.setTimeout === 'function') {
            win.setTimeout(runner, delay);
        } else {
            runner();
        }
    }

    function setPage(page, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const normalized = applyPageState(page, opts);
        syncHash(normalized, { ...opts, updateHash: opts.updateHash !== false });
        runAfterSwitch(normalized, opts);
        return normalized;
    }

    function bindHashNavigation(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const win = getWindow(opts);
        if (!win || typeof win.addEventListener !== 'function' || typeof opts.onNavigate !== 'function') {
            return function noopUnbind() {};
        }
        const handler = () => opts.onNavigate(pageFromHash(win.location && win.location.hash), false);
        win.addEventListener('hashchange', handler);
        return function unbindHashNavigation() {
            win.removeEventListener('hashchange', handler);
        };
    }

    function initNavigation(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const win = getWindow(opts);
        if (!win || typeof win.addEventListener !== 'function') {
            return function noopUnbind() {};
        }

        const readPage = () => {
            if (typeof opts.getPage === 'function') {
                return normalizePage(opts.getPage());
            }
            return pageFromHash(win.location && win.location.hash);
        };

        const navigate = (page, updateHash) => {
            const target = normalizePage(page);
            if (typeof opts.onNavigate === 'function') {
                return opts.onNavigate(target, updateHash);
            }
            return setPage(target, { ...opts, updateHash, callbacks: opts.callbacks || {} });
        };

        const initialHandler = () => {
            const target = navigate(readPage(), false);
            if (typeof opts.afterInitialRender === 'function') {
                opts.afterInitialRender(target);
            }
        };

        const hashHandler = () => {
            const target = navigate(readPage(), false);
            if (typeof opts.afterHashRender === 'function') {
                opts.afterHashRender(target);
            }
        };

        win.addEventListener('load', initialHandler);
        if (opts.bindHash !== false) {
            win.addEventListener('hashchange', hashHandler);
        }

        return function unbindNavigation() {
            win.removeEventListener('load', initialHandler);
            if (opts.bindHash !== false) {
                win.removeEventListener('hashchange', hashHandler);
            }
        };
    }

    const api = {
        MODULE_NAME: 'NavigationManager',
        MODULE_STATUS: 'runtime-extracted',
        PAGES,
        normalizePage,
        pageFromHash,
        applyPageState,
        runAfterSwitch,
        setPage,
        bindHashNavigation,
        initNavigation
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.NavigationManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
