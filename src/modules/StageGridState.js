// FEG Stage PRO v3.7.0 — StageGridState module
// Responsibility: pure grid/shape helpers for the stage editor.
// Classic-compatible module: attaches API to window.FEGModules.StageGridState.
(function (global) {
    'use strict';

    function clampGridSize(value, minSize, maxSize, fallback) {
        const min = Number.isFinite(Number(minSize)) ? Number(minSize) : 1;
        const max = Number.isFinite(Number(maxSize)) ? Number(maxSize) : 100;
        const fb = Number.isFinite(Number(fallback)) ? Number(fallback) : min;
        const parsed = Math.round(Number(value));
        if (!Number.isFinite(parsed)) return Math.max(min, Math.min(max, fb));
        return Math.max(min, Math.min(max, parsed));
    }

    function parseModuleKey(value) {
        const parts = String(value || '').split(',').map(Number);
        return { x: Number(parts[0] || 0), y: Number(parts[1] || 0) };
    }

    function moduleKey(x, y) {
        return `${x},${y}`;
    }

    function normalizeSelectedModules(modules) {
        return [...(modules || [])]
            .map(parseModuleKey)
            .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
            .sort((a, b) => a.y - b.y || a.x - b.x)
            .map(point => moduleKey(point.x, point.y));
    }

    function canonicalEdge(a, b) {
        const pa = typeof a === 'string' ? a : moduleKey(a.x, a.y);
        const pb = typeof b === 'string' ? b : moduleKey(b.x, b.y);
        return pa < pb ? `${pa}-${pb}` : `${pb}-${pa}`;
    }

    function getBounds(modules, fallback) {
        const points = normalizeSelectedModules(modules).map(parseModuleKey);
        const fb = fallback || { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        if (!points.length) return { ...fb };
        const minX = Math.min(...points.map(point => point.x));
        const maxX = Math.max(...points.map(point => point.x));
        const minY = Math.min(...points.map(point => point.y));
        const maxY = Math.max(...points.map(point => point.y));
        return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
    }

    function centerModulesInGrid(modules, cols, rows) {
        const normalized = normalizeSelectedModules(modules);
        if (!normalized.length) return [];
        const bounds = getBounds(normalized);
        const offsetX = Math.floor((Number(cols || 0) - bounds.width) / 2) - bounds.minX;
        const offsetY = Math.floor((Number(rows || 0) - bounds.height) / 2) - bounds.minY;
        return normalized.map(item => {
            const point = parseModuleKey(item);
            return moduleKey(point.x + offsetX, point.y + offsetY);
        });
    }

    function buildShapeText(modules, moduleWidthM, moduleDepthM) {
        const normalized = normalizeSelectedModules(modules);
        if (!normalized.length) return 'Схема не выбрана';
        const bounds = getBounds(normalized);
        return `${bounds.width}×${bounds.height} мод. / ${(bounds.width * Number(moduleWidthM || 0)).toFixed(1)}×${(bounds.height * Number(moduleDepthM || 0)).toFixed(1)} м`;
    }

    const api = {
        MODULE_NAME: 'StageGridState',
        MODULE_STATUS: 'runtime-extracted',
        clampGridSize,
        parseModuleKey,
        moduleKey,
        normalizeSelectedModules,
        canonicalEdge,
        getBounds,
        centerModulesInGrid,
        buildShapeText
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.StageGridState = api;
})(typeof window !== 'undefined' ? window : globalThis);
