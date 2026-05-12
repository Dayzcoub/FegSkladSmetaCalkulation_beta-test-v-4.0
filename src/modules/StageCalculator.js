// FEG Stage PRO v3.6.5 — StageCalculator module
// Responsibility: pure stage geometry helpers, grid shape transforms and stage quote snapshot calculations.
// Classic-compatible module: attaches API to window.FEGModules.StageCalculator.
(function (global) {
    'use strict';

    const DEFAULT_GRID_COLS = 20;
    const DEFAULT_GRID_ROWS = 20;
    const MIN_GRID_SIZE = 6;
    const MAX_GRID_SIZE = 40;
    const MODULE_WIDTH_M = 1.2;
    const MODULE_DEPTH_M = 1.2;

    function moduleKey(x, y) {
        return `${Number(x)},${Number(y)}`;
    }

    function parseModuleKey(key) {
        const [x, y] = String(key).split(',').map(Number);
        return { x, y };
    }

    function clampGridSize(value, fallback, limits) {
        const min = limits && Number(limits.min) ? Number(limits.min) : MIN_GRID_SIZE;
        const max = limits && Number(limits.max) ? Number(limits.max) : MAX_GRID_SIZE;
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return fallback;
        return Math.max(min, Math.min(max, parsed));
    }

    function modulesFromSet(selectedModules) {
        if (!selectedModules || typeof selectedModules[Symbol.iterator] !== 'function') return [];
        return Array.from(selectedModules).map(parseModuleKey).filter(m => !isNaN(m.x) && !isNaN(m.y));
    }

    function canonicalEdge(a, b) {
        const first = `${a.x},${a.y}`;
        const second = `${b.x},${b.y}`;
        return first < second ? `${first}-${second}` : `${second}-${first}`;
    }

    function calculateGeometry(modules) {
        const list = Array.isArray(modules) ? modules : [];
        const vertices = new Set();
        const edges = new Set();

        list.forEach(({ x, y }) => {
            vertices.add(`${x},${y}`);
            vertices.add(`${x + 1},${y}`);
            vertices.add(`${x},${y + 1}`);
            vertices.add(`${x + 1},${y + 1}`);

            edges.add(canonicalEdge({ x, y }, { x: x + 1, y }));
            edges.add(canonicalEdge({ x, y: y + 1 }, { x: x + 1, y: y + 1 }));
            edges.add(canonicalEdge({ x, y }, { x, y: y + 1 }));
            edges.add(canonicalEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 }));
        });

        return {
            sheets: list.length,
            columns: vertices.size,
            frames: edges.size
        };
    }

    function calculateConnectedComponents(modules) {
        const list = Array.isArray(modules) ? modules : [];
        const keys = new Set(list.map(m => moduleKey(m.x, m.y)));
        const visited = new Set();
        let components = 0;
        const directions = [
            [0,-1],
            [-1, 0], [1, 0],
            [0, 1]
        ];

        list.forEach(({ x, y }) => {
            const start = moduleKey(x, y);
            if (visited.has(start)) return;
            components += 1;
            const stack = [start];
            visited.add(start);
            while (stack.length) {
                const current = stack.pop();
                const { x: cx, y: cy } = parseModuleKey(current);
                directions.forEach(([dx, dy]) => {
                    const next = moduleKey(cx + dx, cy + dy);
                    if (keys.has(next) && !visited.has(next)) {
                        visited.add(next);
                        stack.push(next);
                    }
                });
            }
        });
        return components;
    }

    function getDetachedNotice(components) {
        const count = Number(components) || 0;
        if (count <= 1) return 'Единая конструкция';
        return `${count} отдельные конструкции`;
    }

    function getStageBounds(modules) {
        const list = Array.isArray(modules) ? modules : [];
        if (!list.length) return { width: 0, depth: 0 };
        const xs = list.map(m => m.x);
        const ys = list.map(m => m.y);
        return {
            width: Math.max(...xs) - Math.min(...xs) + 1,
            depth: Math.max(...ys) - Math.min(...ys) + 1
        };
    }

    function normalizeSelectedModules(modules) {
        const list = Array.isArray(modules) ? modules : [];
        if (!list.length) return [];
        const minX = Math.min(...list.map(m => m.x));
        const minY = Math.min(...list.map(m => m.y));
        return list.map(m => ({ x: m.x - minX, y: m.y - minY }));
    }

    function centerModulesInGrid(modules, gridColsCount, gridRowsCount) {
        const list = Array.isArray(modules) ? modules : [];
        const cols = Number(gridColsCount) || DEFAULT_GRID_COLS;
        const rows = Number(gridRowsCount) || DEFAULT_GRID_ROWS;
        if (!list.length) return [];
        const width = Math.max(...list.map(m => m.x)) + 1;
        const depth = Math.max(...list.map(m => m.y)) + 1;
        const offsetX = Math.floor((cols - width) / 2);
        const offsetY = Math.floor((rows - depth) / 2);
        return list.map(m => ({ x: m.x + offsetX, y: m.y + offsetY }))
            .filter(m => m.x >= 0 && m.x < cols && m.y >= 0 && m.y < rows);
    }

    function mirrorModules(modules) {
        const list = Array.isArray(modules) ? modules : [];
        if (!list.length) return [];
        const minX = Math.min(...list.map(m => m.x));
        const maxX = Math.max(...list.map(m => m.x));
        return list.map(m => ({ x: maxX - (m.x - minX), y: m.y }));
    }

    function rotateModules(modules, gridColsCount, gridRowsCount) {
        const normalized = normalizeSelectedModules(modules);
        if (!normalized.length) return [];
        const maxY = Math.max(...normalized.map(m => m.y));
        const rotated = normalized.map(m => ({ x: maxY - m.y, y: m.x }));
        return centerModulesInGrid(rotated, gridColsCount, gridRowsCount);
    }

    function rectangleModules(width, depth, gridColsCount, gridRowsCount) {
        const w = parseInt(width, 10);
        const d = parseInt(depth, 10);
        const cols = Number(gridColsCount) || DEFAULT_GRID_COLS;
        const rows = Number(gridRowsCount) || DEFAULT_GRID_ROWS;
        if (isNaN(w) || isNaN(d) || w <= 0 || d <= 0 || w > cols || d > rows) {
            return { ok: false, modules: [] };
        }
        const modules = [];
        const startX = Math.floor((cols - w) / 2);
        const startY = rows - d;
        for (let y = startY; y < startY + d; y++) {
            for (let x = startX; x < startX + w; x++) modules.push({ x, y });
        }
        return { ok: true, modules };
    }

    function buildShapeText(modules) {
        const list = Array.isArray(modules) ? modules : [];
        if (!list.length) return 'Нет модулей';
        const keys = new Set(list.map(m => moduleKey(m.x, m.y)));
        const xs = list.map(m => m.x);
        const ys = list.map(m => m.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const rows = [];
        for (let y = minY; y <= maxY; y++) {
            let row = '';
            for (let x = minX; x <= maxX; x++) row += keys.has(moduleKey(x, y)) ? '■' : '□';
            rows.push(row);
        }
        return rows.join('<br>');
    }

    function calculateStageQuoteSnapshot(options) {
        const source = options || {};
        const modules = Array.isArray(source.modules) ? source.modules : [];
        const moduleWidthM = Number(source.moduleWidthM) || MODULE_WIDTH_M;
        const moduleDepthM = Number(source.moduleDepthM) || MODULE_DEPTH_M;
        const price = Number(source.price);
        const installCost = Math.max(0, Number(source.installCost) || 0);
        const transportCost = Math.max(0, Number(source.transportCost) || 0);
        const geometry = calculateGeometry(modules);
        const components = calculateConnectedComponents(modules);
        const bounds = getStageBounds(modules);
        const modulesCost = geometry.sheets * (isNaN(price) ? 0 : price);
        return {
            geometry,
            components,
            bounds,
            modulesCost,
            installCost,
            transportCost,
            total: modulesCost + installCost + transportCost,
            widthMeters: bounds.width * moduleWidthM,
            depthMeters: bounds.depth * moduleDepthM,
            areaMeters: geometry.sheets * moduleWidthM * moduleDepthM,
            shapeText: buildShapeText(modules)
        };
    }

    const api = {
        MODULE_NAME: 'StageCalculator',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULT_GRID_COLS,
        DEFAULT_GRID_ROWS,
        MIN_GRID_SIZE,
        MAX_GRID_SIZE,
        MODULE_WIDTH_M,
        MODULE_DEPTH_M,
        moduleKey,
        parseModuleKey,
        modulesFromSet,
        clampGridSize,
        canonicalEdge,
        calculateGeometry,
        calculateConnectedComponents,
        getDetachedNotice,
        getStageBounds,
        normalizeSelectedModules,
        centerModulesInGrid,
        mirrorModules,
        rotateModules,
        rectangleModules,
        buildShapeText,
        calculateStageQuoteSnapshot
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.StageCalculator = api;
})(typeof window !== 'undefined' ? window : globalThis);
