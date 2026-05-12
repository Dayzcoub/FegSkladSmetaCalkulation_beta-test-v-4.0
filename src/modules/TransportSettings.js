// FEG Stage PRO v3.6.2 — TransportSettings module
// Responsibility: shared transport settings, transport modal helpers and transport cost/label calculation.
// Classic-compatible module: attaches API to window.FEGModules.TransportSettings.
(function (global) {
    'use strict';

    const STORAGE_KEY = 'transportSettings';
    const DEFAULT_TRANSPORT_SETTINGS = {
        type: 'city',
        cityPrice: 0,
        kmPrice: 0,
        km: 0
    };

    function storage() {
        return global.localStorage;
    }

    function defaultMoney(value) {
        return Number(value || 0).toLocaleString('ru-RU');
    }

    function defaultMetric(value) {
        const rounded = Math.round((Number(value) || 0) * 100) / 100;
        return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    }

    function normalizeTransportSettings(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const type = source.type === 'intercity' ? 'intercity' : 'city';
        const cityPrice = Number(source.cityPrice);
        const kmPrice = Number(source.kmPrice);
        const km = Number(source.km);
        return {
            type,
            cityPrice: isNaN(cityPrice) || cityPrice < 0 ? DEFAULT_TRANSPORT_SETTINGS.cityPrice : cityPrice,
            kmPrice: isNaN(kmPrice) || kmPrice < 0 ? DEFAULT_TRANSPORT_SETTINGS.kmPrice : kmPrice,
            km: isNaN(km) || km < 0 ? DEFAULT_TRANSPORT_SETTINGS.km : km
        };
    }

    function loadTransportSettings() {
        try {
            const parsed = JSON.parse(storage().getItem(STORAGE_KEY) || 'null');
            return normalizeTransportSettings(parsed || DEFAULT_TRANSPORT_SETTINGS);
        } catch (err) {
            return { ...DEFAULT_TRANSPORT_SETTINGS };
        }
    }

    function saveTransportSettings(settings) {
        const normalized = normalizeTransportSettings(settings || DEFAULT_TRANSPORT_SETTINGS);
        try { storage().setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (err) {}
        return normalized;
    }

    function calculateTransportCost(settings) {
        const normalized = normalizeTransportSettings(settings || loadTransportSettings());
        return normalized.type === 'intercity'
            ? normalized.kmPrice * normalized.km
            : normalized.cityPrice;
    }

    function getTransportLabel(settings, formatters) {
        const normalized = normalizeTransportSettings(settings || loadTransportSettings());
        const metric = formatters && typeof formatters.metric === 'function' ? formatters.metric : defaultMetric;
        const money = formatters && typeof formatters.money === 'function' ? formatters.money : defaultMoney;
        if (normalized.type === 'intercity') {
            return `Межгород · ${metric(normalized.km)} км × ${money(normalized.kmPrice)} ₽/км`;
        }
        return 'По городу · фиксированная стоимость';
    }

    function syncTransportInputs(inputs, settings) {
        const normalized = normalizeTransportSettings(settings || loadTransportSettings());
        if (inputs && inputs.type) inputs.type.value = normalized.type;
        if (inputs && inputs.cityPrice) inputs.cityPrice.value = normalized.cityPrice;
        if (inputs && inputs.kmPrice) inputs.kmPrice.value = normalized.kmPrice;
        if (inputs && inputs.km) inputs.km.value = normalized.km;
    }

    function readTransportFromInputs(inputs, currentSettings) {
        const current = normalizeTransportSettings(currentSettings || DEFAULT_TRANSPORT_SETTINGS);
        return normalizeTransportSettings({
            type: inputs && inputs.type ? inputs.type.value : current.type,
            cityPrice: inputs && inputs.cityPrice ? Number(inputs.cityPrice.value) : current.cityPrice,
            kmPrice: inputs && inputs.kmPrice ? Number(inputs.kmPrice.value) : current.kmPrice,
            km: inputs && inputs.km ? Number(inputs.km.value) : current.km
        });
    }

    function openTransportModal(modal) {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeTransportModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    const api = {
        MODULE_NAME: 'TransportSettings',
        MODULE_STATUS: 'runtime-extracted',
        STORAGE_KEY,
        DEFAULT_TRANSPORT_SETTINGS,
        normalizeTransportSettings,
        loadTransportSettings,
        saveTransportSettings,
        calculateTransportCost,
        getTransportLabel,
        syncTransportInputs,
        readTransportFromInputs,
        openTransportModal,
        closeTransportModal
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.TransportSettings = api;
})(typeof window !== 'undefined' ? window : globalThis);
