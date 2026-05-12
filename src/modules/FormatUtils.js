// FEG Stage PRO v3.6.45 — FormatUtils module
// Responsibility: shared HTML/string/date/number formatting helpers.
// Classic-compatible module: attaches API to window.FEGModules.FormatUtils.
(function (global) {
    'use strict';

    const DEFAULT_LOCALE = 'ru-RU';
    const HTML_ENTITIES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    function toSafeString(value) {
        if (value === null || value === undefined) return '';
        return String(value);
    }

    function escapeHtml(value) {
        return toSafeString(value).replace(/[&<>"']/g, function (ch) {
            return HTML_ENTITIES[ch] || ch;
        });
    }

    function normalizeNumber(value, fallback) {
        const n = Number(value || 0);
        if (Number.isFinite(n)) return n;
        return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    }

    function formatNumber(value, options) {
        const settings = options || {};
        const locale = settings.locale || DEFAULT_LOCALE;
        return normalizeNumber(value, settings.fallback).toLocaleString(locale, settings.formatOptions || {});
    }

    function money(value, options) {
        return formatNumber(value, Object.assign({
            locale: DEFAULT_LOCALE,
            formatOptions: {}
        }, options || {}));
    }

    function moneyWithCurrency(value, options) {
        const settings = Object.assign({ suffix: ' ₽' }, options || {});
        return money(value, settings) + settings.suffix;
    }

    function metric(value, options) {
        const settings = typeof options === 'number'
            ? { digits: options }
            : Object.assign({ digits: 2 }, options || {});
        const rounded = Math.round(normalizeNumber(value, settings.fallback) * 100) / 100;
        return rounded.toLocaleString(settings.locale || DEFAULT_LOCALE, {
            maximumFractionDigits: Number.isFinite(Number(settings.digits)) ? Number(settings.digits) : 2
        });
    }

    function kg(value, options) {
        const settings = typeof options === 'number'
            ? { digits: options }
            : Object.assign({ digits: 1 }, options || {});
        const factor = Math.pow(10, Number.isFinite(Number(settings.digits)) ? Number(settings.digits) : 1);
        const rounded = Math.round(normalizeNumber(value, settings.fallback) * factor) / factor;
        return rounded.toLocaleString(settings.locale || DEFAULT_LOCALE, {
            maximumFractionDigits: Number.isFinite(Number(settings.digits)) ? Number(settings.digits) : 1
        });
    }

    function formatDate(value, options) {
        const settings = options || {};
        const source = (value === null || value === undefined || value === '') ? Date.now() : value;
        const date = value instanceof Date ? value : new Date(source);
        if (Number.isNaN(date.getTime())) return settings.fallback || '';
        return date.toLocaleDateString(settings.locale || DEFAULT_LOCALE, settings.formatOptions || undefined);
    }

    function formatTime(value, options) {
        const settings = Object.assign({ formatOptions: { hour: '2-digit', minute: '2-digit' } }, options || {});
        const source = (value === null || value === undefined || value === '') ? Date.now() : value;
        const date = value instanceof Date ? value : new Date(source);
        if (Number.isNaN(date.getTime())) return settings.fallback || '';
        return date.toLocaleTimeString(settings.locale || DEFAULT_LOCALE, settings.formatOptions || undefined);
    }

    function formatDateTime(value, options) {
        const settings = options || {};
        const source = (value === null || value === undefined || value === '') ? Date.now() : value;
        const date = value instanceof Date ? value : new Date(source);
        if (Number.isNaN(date.getTime())) return settings.fallback || '';
        return date.toLocaleString(settings.locale || DEFAULT_LOCALE, settings.formatOptions || undefined);
    }

    function safeFilePart(value, fallback) {
        const text = toSafeString(value).trim() || toSafeString(fallback || 'file');
        return text.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
    }

    const api = {
        MODULE_NAME: 'FormatUtils',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULT_LOCALE,
        toSafeString,
        escapeHtml,
        normalizeNumber,
        formatNumber,
        money,
        moneyWithCurrency,
        metric,
        kg,
        formatDate,
        formatTime,
        formatDateTime,
        safeFilePart
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.FormatUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
