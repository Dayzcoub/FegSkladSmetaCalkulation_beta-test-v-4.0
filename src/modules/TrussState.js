// FEG Stage PRO v3.7.0 — TrussState module
// Responsibility: pure state helpers for 2D truss projects and calculations.
// Classic-compatible module: attaches API to window.FEGModules.TrussState.
(function (global) {
    'use strict';

    function key(x, y) {
        return `${x},${y}`;
    }

    function parseKey(value) {
        const parts = String(value || '').split(',').map(Number);
        return { x: Number(parts[0] || 0), y: Number(parts[1] || 0) };
    }

    function asSet(value) {
        if (value instanceof Set) return value;
        if (Array.isArray(value)) return new Set(value);
        return new Set();
    }

    function cloneSet(value) {
        return new Set([...asSet(value)]);
    }

    function trimSegmentsToGrid(horizontalSegments, verticalSegments, cols, rows) {
        const safeCols = Math.max(0, Number(cols || 0));
        const safeRows = Math.max(0, Number(rows || 0));
        const h = new Set([...asSet(horizontalSegments)].filter(item => {
            const point = parseKey(item);
            return point.x >= 0 && point.y >= 0 && point.x < safeCols && point.y <= safeRows;
        }));
        const v = new Set([...asSet(verticalSegments)].filter(item => {
            const point = parseKey(item);
            return point.x >= 0 && point.y >= 0 && point.x <= safeCols && point.y < safeRows;
        }));
        return { horizontal: h, vertical: v };
    }

    function getNodes(horizontalSegments, verticalSegments) {
        const nodes = new Map();
        function addNode(x, y, dir) {
            const nodeKey = key(x, y);
            const item = nodes.get(nodeKey) || { x, y, h: 0, v: 0, degree: 0 };
            if (dir === 'h') item.h += 1;
            if (dir === 'v') item.v += 1;
            item.degree += 1;
            nodes.set(nodeKey, item);
        }
        asSet(horizontalSegments).forEach(item => {
            const point = parseKey(item);
            addNode(point.x, point.y, 'h');
            addNode(point.x + 1, point.y, 'h');
        });
        asSet(verticalSegments).forEach(item => {
            const point = parseKey(item);
            addNode(point.x, point.y, 'v');
            addNode(point.x, point.y + 1, 'v');
        });
        return nodes;
    }

    function getRunsFromSegments(segments, orientation, cellMeters) {
        const meter = Number(cellMeters || 0);
        const map = new Map();
        asSet(segments).forEach(item => {
            const point = parseKey(item);
            const line = orientation === 'h' ? point.y : point.x;
            const pos = orientation === 'h' ? point.x : point.y;
            if (!map.has(line)) map.set(line, []);
            map.get(line).push(pos);
        });
        const runs = [];
        map.forEach((positions, line) => {
            const sorted = [...new Set(positions)].sort((a, b) => a - b);
            let start = null;
            let prev = null;
            let count = 0;
            sorted.forEach(pos => {
                if (start === null) {
                    start = prev = pos;
                    count = 1;
                    return;
                }
                if (pos === prev + 1) {
                    prev = pos;
                    count += 1;
                    return;
                }
                runs.push({ orientation, line, start, count, meters: count * meter });
                start = prev = pos;
                count = 1;
            });
            if (start !== null) runs.push({ orientation, line, start, count, meters: count * meter });
        });
        return runs;
    }

    function splitLength(meters) {
        const pieces = { 3: 0, 2: 0, 1: 0, 0.5: 0 };
        let rest = Math.round(Number(meters || 0) * 2) / 2;
        [3, 2, 1, 0.5].forEach(len => {
            const qty = Math.floor((rest + 1e-9) / len);
            pieces[len] += qty;
            rest = Math.round((rest - qty * len) * 2) / 2;
        });
        if (rest > 0) pieces[0.5] += 1;
        return pieces;
    }

    function getBoundsFromNodes(nodes, fallback) {
        const list = nodes instanceof Map ? [...nodes.values()] : (Array.isArray(nodes) ? nodes : []);
        const fb = fallback || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        if (!list.length) return { minX: fb.minX || 0, minY: fb.minY || 0, maxX: fb.maxX || 0, maxY: fb.maxY || 0 };
        return {
            minX: Math.min(...list.map(node => Number(node.x || 0))),
            minY: Math.min(...list.map(node => Number(node.y || 0))),
            maxX: Math.max(...list.map(node => Number(node.x || 0))),
            maxY: Math.max(...list.map(node => Number(node.y || 0)))
        };
    }

    function getBounds(horizontalSegments, verticalSegments, fallback) {
        return getBoundsFromNodes(getNodes(horizontalSegments, verticalSegments), fallback);
    }

    function hasScheme(horizontalSegments, verticalSegments) {
        return asSet(horizontalSegments).size > 0 || asSet(verticalSegments).size > 0;
    }

    function buildSnapshot(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const id = opts.id || Date.now();
        const now = opts.now || new Date().toISOString();
        const getText = typeof opts.getText === 'function' ? opts.getText : function () { return ''; };
        const getNumber = typeof opts.getNumber === 'function' ? opts.getNumber : function (_id, fallback) { return Number(fallback || 0); };
        const result = typeof opts.calculate === 'function' ? opts.calculate() : (opts.result || {});
        return {
            type: 'feg-stage-pro-truss-project',
            kind: 'truss',
            appVersion: opts.appVersion || '3.7.4',
            id,
            orderId: `TR-${id}`,
            client: getText('trussClientName') || 'Клиент не указан',
            name: getText('trussProjectName') || 'Ферменная конструкция',
            date: now,
            updatedAt: now,
            cols: Number(opts.cols || 0),
            rows: Number(opts.rows || 0),
            cellMeters: Number(opts.cellMeters || 0.5),
            segmentsH: [...asSet(opts.segmentsH)],
            segmentsV: [...asSet(opts.segmentsV)],
            params: {
                supportCount: getNumber('trussSupportCount', 0),
                installCost: getNumber('trussInstallCost', 0),
                pricePerMeter: getNumber('trussPricePerMeter', 0),
                cornerPrice: getNumber('trussCornerPrice', 0),
                uprightPrice: getNumber('trussUprightPrice', 0),
                basePrice: getNumber('trussBasePrice', 0),
                weightPerMeter: getNumber('trussWeightPerMeter', 0),
                cornerWeight: getNumber('trussCornerWeight', 0),
                uprightWeight: getNumber('trussUprightWeight', 0),
                baseWeight: getNumber('trussBaseWeight', 0),
                widthM: getNumber('trussWidthM', 6),
                heightM: getNumber('trussHeightM', 3)
            },
            result,
            total: Number(result && result.total ? result.total : 0)
        };
    }

    const api = {
        MODULE_NAME: 'TrussState',
        MODULE_STATUS: 'runtime-extracted',
        key,
        parseKey,
        asSet,
        cloneSet,
        trimSegmentsToGrid,
        getNodes,
        getRunsFromSegments,
        splitLength,
        getBoundsFromNodes,
        getBounds,
        hasScheme,
        buildSnapshot
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.TrussState = api;
})(typeof window !== 'undefined' ? window : globalThis);
