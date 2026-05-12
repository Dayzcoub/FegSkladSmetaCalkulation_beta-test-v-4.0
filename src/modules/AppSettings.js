// FEG Stage PRO v3.6.2 — AppSettings module
// Responsibility: app-level theme, app settings modal helpers and Supabase settings form state.
// Classic-compatible module: attaches API to window.FEGModules.AppSettings and can also be parsed as an ES module.
(function (global) {
    'use strict';

    const DEFAULT_APP_THEME = 'dark';
    const DEFAULT_CLOUD_SETTINGS = {
        url: '',
        anonKey: '',
        workspaceKey: ''
    };

    function storage() {
        return global.localStorage;
    }

    function loadAppTheme() {
        try {
            const saved = storage().getItem('appTheme');
            return saved === 'light' ? 'light' : DEFAULT_APP_THEME;
        } catch (err) {
            return DEFAULT_APP_THEME;
        }
    }

    function saveAppTheme(theme) {
        const normalized = theme === 'light' ? 'light' : 'dark';
        try { storage().setItem('appTheme', normalized); } catch (err) {}
        return normalized;
    }

    function applyAppTheme(theme, options) {
        const doc = (options && options.document) || global.document;
        const normalized = theme === 'light' ? 'light' : 'dark';
        if (doc && doc.body && doc.body.classList) {
            doc.body.classList.toggle('theme-light', normalized === 'light');
            doc.body.classList.toggle('theme-dark', normalized === 'dark');
        }
        const metaTheme = doc ? doc.querySelector('meta[name="theme-color"]') : null;
        if (metaTheme) metaTheme.setAttribute('content', normalized === 'light' ? '#f3f0ea' : '#111820');
        return normalized;
    }

    function syncThemeInput(select, theme) {
        if (select) select.value = theme === 'light' ? 'light' : 'dark';
    }

    function readThemeFromInput(select) {
        return select && select.value === 'light' ? 'light' : 'dark';
    }

    function makeLocalWorkspaceKey() {
        const cryptoRef = global.crypto;
        if (cryptoRef && cryptoRef.randomUUID) return `feg-${cryptoRef.randomUUID()}`;
        return `feg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizeCloudSettings(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        let workspaceKey = String(source.workspaceKey || '').trim();
        if (!workspaceKey) {
            try { workspaceKey = storage().getItem('cloudWorkspaceKey') || ''; } catch (err) { workspaceKey = ''; }
        }
        if (!workspaceKey) workspaceKey = makeLocalWorkspaceKey();
        return {
            url: String(source.url || '').trim().replace(/\/$/, ''),
            anonKey: String(source.anonKey || '').trim(),
            workspaceKey
        };
    }

    function loadCloudSettings() {
        try {
            const parsed = JSON.parse(storage().getItem('cloudSettings') || 'null');
            const normalized = normalizeCloudSettings(parsed || DEFAULT_CLOUD_SETTINGS);
            storage().setItem('cloudWorkspaceKey', normalized.workspaceKey);
            return normalized;
        } catch (err) {
            const normalized = normalizeCloudSettings(DEFAULT_CLOUD_SETTINGS);
            try { storage().setItem('cloudWorkspaceKey', normalized.workspaceKey); } catch (e) {}
            return normalized;
        }
    }

    function syncCloudInputs(inputs, settings) {
        const normalized = normalizeCloudSettings(settings || DEFAULT_CLOUD_SETTINGS);
        if (inputs && inputs.url) inputs.url.value = normalized.url;
        if (inputs && inputs.anonKey) inputs.anonKey.value = normalized.anonKey;
        if (inputs && inputs.workspaceKey) inputs.workspaceKey.value = normalized.workspaceKey;
    }

    function readCloudSettingsFromInputs(inputs, currentSettings) {
        const current = normalizeCloudSettings(currentSettings || DEFAULT_CLOUD_SETTINGS);
        return normalizeCloudSettings({
            url: inputs && inputs.url ? inputs.url.value : current.url,
            anonKey: inputs && inputs.anonKey ? inputs.anonKey.value : current.anonKey,
            workspaceKey: inputs && inputs.workspaceKey ? inputs.workspaceKey.value : current.workspaceKey
        });
    }

    function saveCloudSettings(settings) {
        const normalized = normalizeCloudSettings(settings || DEFAULT_CLOUD_SETTINGS);
        try {
            storage().setItem('cloudSettings', JSON.stringify(normalized));
            storage().setItem('cloudWorkspaceKey', normalized.workspaceKey);
        } catch (err) {}
        return normalized;
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    const api = {
        MODULE_NAME: 'AppSettings',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULT_APP_THEME,
        DEFAULT_CLOUD_SETTINGS,
        loadAppTheme,
        saveAppTheme,
        applyAppTheme,
        syncThemeInput,
        readThemeFromInput,
        makeLocalWorkspaceKey,
        normalizeCloudSettings,
        loadCloudSettings,
        syncCloudInputs,
        readCloudSettingsFromInputs,
        saveCloudSettings,
        openModal,
        closeModal
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.AppSettings = api;
})(typeof window !== 'undefined' ? window : globalThis);
