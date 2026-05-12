// FEG Stage PRO v3.6.19 — TrussBlockConstructor module, phase 13
// Responsibility: block catalog, legacy type aliases, object library grouping, geometry helpers, BOM calculation helpers, selection/edit helpers, snap helpers, SVG generators, render helpers, drag helpers, action helpers and UI summary helpers, draft/display/export helpers.
// Classic-compatible module: attaches API to window.FEGModules.TrussBlockConstructor.
(function (global) {
    'use strict';

    const DEFAULT_SPECS = {
            truss3:   { id:'truss3',   label:'Ферма 3 м',   short:'3 м',   kind:'straight', length:3,   icon:'▰3' },
            truss25:  { id:'truss25',  label:'Ферма 2.5 м', short:'2.5 м', kind:'straight', length:2.5, icon:'▰2.5' },
            truss2:   { id:'truss2',   label:'Ферма 2 м',   short:'2 м',   kind:'straight', length:2,   icon:'▰2' },
            truss15:  { id:'truss15',  label:'Ферма 1.5 м', short:'1.5 м', kind:'straight', length:1.5, icon:'▰1.5' },
            truss1:   { id:'truss1',   label:'Ферма 1 м',   short:'1 м',   kind:'straight', length:1,   icon:'▰1' },
            truss05:  { id:'truss05',  label:'Ферма 0.5 м', short:'0.5 м', kind:'straight', length:0.5, icon:'▰0.5' },

            cornerU001:{ id:'cornerU001', label:'U001 · угол 45° · 2 направления',  short:'U001 45°', kind:'node', icon:'45°', u:'001', angle:'45°',  directions:2, weights:{T29Q:9.7,  T39Q:11.7} },
            cornerU002:{ id:'cornerU002', label:'U002 · угол 60° · 2 направления',  short:'U002 60°', kind:'node', icon:'60°', u:'002', angle:'60°',  directions:2, weights:{T29Q:9.87, T39Q:11.7} },
            cornerU003:{ id:'cornerU003', label:'U003 · угол 90° · 2 направления',  short:'U003 90°', kind:'node', icon:'∟',   u:'003', angle:'90°',  directions:2, weights:{T29Q:5.2,  T39Q:6.4} },
            cornerU004:{ id:'cornerU004', label:'U004 · угол 120° · 2 направления', short:'U004 120°',kind:'node', icon:'120', u:'004', angle:'120°', directions:2, weights:{T29Q:6.12, T39Q:7.3} },
            cornerU005:{ id:'cornerU005', label:'U005 · угол 135° · 2 направления', short:'U005 135°',kind:'node', icon:'135', u:'005', angle:'135°', directions:2, weights:{T29Q:6.5,  T39Q:8.0} },
            cornerU012:{ id:'cornerU012', label:'U012 · угол 90° · 3 направления',  short:'U012 3н', kind:'node', icon:'┌┐',  u:'012', angle:'90°',  directions:3, weights:{T29Q:7.2,  T39Q:9.0} },
            cornerU016:{ id:'cornerU016', label:'U016 · угол 90° · 4 направления · крест', short:'U016 крест', kind:'node', icon:'✚', u:'016', angle:'90°', directions:4, weights:{T29Q:10.0, T39Q:12.3} },
            cornerU017:{ id:'cornerU017', label:'U017 · угол 90° · 3 направления · Т-образный', short:'U017 Т', kind:'node', icon:'┬', u:'017', angle:'90°', directions:3, weights:{T29Q:8.1, T39Q:9.3} },
            cornerU020:{ id:'cornerU020', label:'U020 · угол 90° · 4 направления', short:'U020 4н', kind:'node', icon:'┼3D', u:'020', angle:'90°', directions:4, weights:{T29Q:10.0, T39Q:12.3} },
            cornerU022:{ id:'cornerU022', label:'U022 · угол 90° · 6 направлений · куб', short:'U022 куб', kind:'node', icon:'◼', u:'022', angle:'90°', directions:6, weights:{T29Q:13.8, T39Q:16.3} },
            cornerU024:{ id:'cornerU024', label:'U024 · угол 90° · 5 направлений', short:'U024 5н', kind:'node', icon:'◫', u:'024', angle:'90°', directions:5, weights:{T29Q:12.1, T39Q:14.1} },

            base:     { id:'base',     label:'База / блин', short:'База',  kind:'base', icon:'◉' },
            pin:      { id:'pin',      label:'Конусный коннектор C2-88 / бабышка', short:'C2-88', kind:'pin', icon:'C2', hidden:true }
        };

    const LEGACY_TYPE_MAP = Object.freeze({ angle90:'cornerU003', cube:'cornerU022', tee:'cornerU017', cross:'cornerU016' });

    const LIBRARY_GROUPS = Object.freeze([
        Object.freeze({ id:'straight', title:'Прямые фермы', icon:'▰', items:Object.freeze(['truss3','truss25','truss2','truss15','truss1','truss05']) }),
        Object.freeze({ id:'angles2d', title:'2D углы', icon:'∟', items:Object.freeze(['cornerU003','cornerU017','cornerU016','cornerU001','cornerU002','cornerU004','cornerU005']) }),
        Object.freeze({ id:'nodes3d', title:'3D узлы', icon:'◼', items:Object.freeze(['cornerU012','cornerU020','cornerU022','cornerU024','base']) })
    ]);

    const STRAIGHT_ORDER = Object.freeze([3, 2.5, 2, 1.5, 1, 0.5]);

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getDefaultSpecs() {
        return clone(DEFAULT_SPECS);
    }

    function getLegacyTypeMap() {
        return Object.assign({}, LEGACY_TYPE_MAP);
    }

    function getLibraryGroupDefs() {
        return LIBRARY_GROUPS.map(group => ({
            id: group.id,
            title: group.title,
            icon: group.icon,
            items: Array.from(group.items)
        }));
    }

    function getLibraryGroups(specs) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        return getLibraryGroupDefs()
            .map(group => Object.assign({}, group, {
                specs: group.items.map(id => source[id]).filter(spec => spec && !spec.hidden)
            }))
            .filter(group => group.specs.length);
    }

    function getSpec(specs, type) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        return source[type] || null;
    }

    function isKnownType(specs, type) {
        return !!getSpec(specs, type);
    }

    function isVisibleType(specs, type) {
        const spec = getSpec(specs, type);
        return !!(spec && !spec.hidden);
    }





    function normalizeRotation(value) {
        const n = Number(value || 0);
        return ((n % 360) + 360) % 360;
    }

    function normalizeItem(item, specs, legacyMap) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const aliases = legacyMap && typeof legacyMap === 'object' ? legacyMap : LEGACY_TYPE_MAP;
        if (!item || typeof item !== 'object') return null;
        const nextType = aliases[item.type] || item.type;
        const spec = source[nextType];
        if (!spec || nextType === 'pin' || nextType === 'outrigger') return null;
        const normalized = Object.assign({}, item, {
            type: nextType,
            x: Number.isFinite(Number(item.x)) ? Number(item.x) : 0,
            y: Number.isFinite(Number(item.y)) ? Number(item.y) : 0,
            o: spec.kind === 'straight' ? (item.o === 'v' ? 'v' : 'h') : 'n',
            r: normalizeRotation(item.r)
        });
        if (item.micro && typeof item.micro === 'object') normalized.micro = Object.assign({}, item.micro);
        return normalized;
    }

    function normalizeItems(items, specs, legacyMap) {
        return (Array.isArray(items) ? items : [])
            .map(item => normalizeItem(item, specs, legacyMap))
            .filter(Boolean);
    }

    function normalizeSelectedType(selected, specs, legacyMap, fallback) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const aliases = legacyMap && typeof legacyMap === 'object' ? legacyMap : LEGACY_TYPE_MAP;
        const safeFallback = fallback && source[fallback] && !source[fallback].hidden ? fallback : 'truss3';
        const mapped = aliases[selected] || selected;
        const spec = source[mapped];
        if (!spec || spec.hidden || mapped === 'pin' || mapped === 'outrigger') return safeFallback;
        return mapped;
    }

    function selectedItemExists(items, selectedItemId) {
        if (!selectedItemId) return false;
        return (Array.isArray(items) ? items : []).some(item => String(item && item.id) === String(selectedItemId));
    }

    function getSelectedItem(items, selectedItemId) {
        if (!selectedItemId) return null;
        return (Array.isArray(items) ? items : []).find(item => String(item && item.id) === String(selectedItemId)) || null;
    }

    function selectItemId(items, id) {
        return selectedItemExists(items, id) ? id : null;
    }

    function createItem(id, type, x, y, orientation, rotation, specs) {
        const spec = getSpec(specs, type);
        if (!id || !spec || type === 'pin' || type === 'outrigger') return null;
        return {
            id,
            type,
            x: Number.isFinite(Number(x)) ? Number(x) : 0,
            y: Number.isFinite(Number(y)) ? Number(y) : 0,
            o: spec.kind === 'straight' ? (orientation === 'v' ? 'v' : 'h') : 'n',
            r: normalizeRotation(rotation)
        };
    }

    function removeItemById(items, selectedItemId, id) {
        const list = Array.isArray(items) ? items : [];
        const idx = list.findIndex(item => String(item && item.id) === String(id));
        if (idx < 0) return { removed:false, items:list, selectedItemId };
        const removed = list[idx];
        list.splice(idx, 1);
        return {
            removed:true,
            removedItem: removed,
            items:list,
            selectedItemId: String(selectedItemId) === String(id) ? null : selectedItemId
        };
    }

    function removeAt(items, selectedItemId, x, y, specs, cellMeters) {
        const list = Array.isArray(items) ? items : [];
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const reverseIndex = [...list].reverse().findIndex(item => containsCell(item, source[item && item.type], x, y, cellMeters));
        if (reverseIndex < 0) return { removed:false, items:list, selectedItemId };
        const realIndex = list.length - 1 - reverseIndex;
        const removed = list[realIndex];
        list.splice(realIndex, 1);
        return {
            removed:true,
            removedItem: removed,
            items:list,
            selectedItemId: removed && String(selectedItemId) === String(removed.id) ? null : selectedItemId
        };
    }

    function rotateSelectedItem(items, selectedItemId, specs, canPlace) {
        const item = getSelectedItem(items, selectedItemId);
        if (!item) return { ok:false, reason:'not-selected' };
        const spec = getSpec(specs, item.type);
        if (!spec) return { ok:false, reason:'unknown-type' };
        if (spec.kind === 'straight') {
            const nextO = item.o === 'v' ? 'h' : 'v';
            if (typeof canPlace === 'function' && !canPlace(item, nextO)) return { ok:false, reason:'out-of-bounds', item };
            item.o = nextO;
        } else {
            item.r = normalizeRotation(Number(item.r || 0) + 90);
        }
        return { ok:true, item };
    }


    function normalizeCellMeters(cellMeters) {
        const n = Number(cellMeters || 0.5);
        return Number.isFinite(n) && n > 0 ? n : 0.5;
    }

    function cellCount(meters, cellMeters) {
        const cellM = normalizeCellMeters(cellMeters);
        return Math.max(1, Math.round(Number(meters || 0) / cellM));
    }

    function pointKey(x, y) {
        return `${x},${y}`;
    }

    function itemCellSpan(item, spec, cellMeters) {
        if (!item || !spec) return { cells: 1, width: 1, height: 1 };
        if (spec.kind !== 'straight') return { cells: 1, width: 1, height: 1 };
        const cells = cellCount(spec.length, cellMeters);
        return item.o === 'v'
            ? { cells, width: 1, height: cells }
            : { cells, width: cells, height: 1 };
    }

    function itemBounds(item, spec, cellMeters) {
        if (!item || !spec) return null;
        const span = itemCellSpan(item, spec, cellMeters);
        return {
            minX: Number(item.x || 0),
            minY: Number(item.y || 0),
            maxX: Number(item.x || 0) + span.width,
            maxY: Number(item.y || 0) + span.height,
            width: span.width,
            height: span.height,
            cells: span.cells
        };
    }

    function containsCell(item, spec, x, y, cellMeters) {
        if (!item || !spec) return false;
        if (spec.kind !== 'straight') return item.x === x && item.y === y;
        const bounds = itemBounds(item, spec, cellMeters);
        if (!bounds) return false;
        return x >= bounds.minX && x < bounds.maxX && y >= bounds.minY && y < bounds.maxY;
    }

    function straightPortPoints(item, spec, cellMeters) {
        if (!item || !spec) return [];
        const cells = cellCount(spec.length, cellMeters);
        return item.o === 'v'
            ? [{ x: item.x + 0.5, y: item.y }, { x: item.x + 0.5, y: item.y + cells }]
            : [{ x: item.x, y: item.y + 0.5 }, { x: item.x + cells, y: item.y + 0.5 }];
    }

    function inBounds(typeOrSpec, x, y, orientation, boundsState, specs, cellMeters) {
        const spec = typeof typeOrSpec === 'string' ? getSpec(specs, typeOrSpec) : typeOrSpec;
        if (!spec || !boundsState) return false;
        const cols = Number(boundsState.cols || 0);
        const rows = Number(boundsState.rows || 0);
        if (x < 0 || y < 0) return false;
        if (spec.kind === 'node') return x + 1 <= cols && y + 1 <= rows;
        if (spec.kind !== 'straight') return x < cols && y < rows;
        const cells = cellCount(spec.length, cellMeters || boundsState.cellMeters);
        return orientation === 'v'
            ? (x < cols && y + cells <= rows)
            : (x + cells <= cols && y < rows);
    }

    function schemeBounds(items, specs, cellMeters) {
        const list = Array.isArray(items) ? items : [];
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const bounds = list
            .map(item => itemBounds(item, source[item && item.type], cellMeters))
            .filter(Boolean);
        if (!bounds.length) return null;
        const minX = Math.min(...bounds.map(b => b.minX));
        const minY = Math.min(...bounds.map(b => b.minY));
        const maxX = Math.max(...bounds.map(b => b.maxX));
        const maxY = Math.max(...bounds.map(b => b.maxY));
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }


    const C2_67_WEIGHT_KG = 0.04;
    const C2_COTTER_WEIGHT_KG = 0;
    const C3_83_WEIGHT_KG = 0.27;

    function nodeWeight(spec, state) {
        if (!spec) return 0;
        const series = state && state.trussSeries ? state.trussSeries : 'T29Q';
        const weights = spec.weights || {};
        const value = weights[series] ?? weights.T29Q ?? (state && state.nodeWeight) ?? 0;
        return Number(value || 0);
    }

    function priceAndWeightFor(spec, count, meters, state) {
        if (!spec) return { price: 0, weight: 0 };
        const st = state || {};
        const c = Number(count || 0);
        const m = Number(meters || 0);
        if (spec.kind === 'straight') return { price: m * Number(st.pricePerMeter || 0), weight: m * Number(st.weightPerMeter || 0) };
        if (spec.kind === 'node') return { price: c * Number(st.nodePrice || 0), weight: c * nodeWeight(spec, st) };
        if (spec.kind === 'base') return { price: c * Number(st.basePrice || 0), weight: c * Number(st.baseWeight || 0) };
        if (spec.kind === 'pin') return { price: c * Number(st.pinPrice || 0), weight: c * Number(st.pinWeight || 0) };
        return { price: 0, weight: 0 };
    }

    function calculateItemCounts(items, specs) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const counts = {};
        const metersByType = {};
        Object.keys(source).forEach(id => { counts[id] = 0; metersByType[id] = 0; });
        (Array.isArray(items) ? items : []).forEach(item => {
            if (!item || !item.type) return;
            const spec = source[item.type];
            if (!spec) return;
            counts[item.type] = (counts[item.type] || 0) + 1;
            if (spec.kind === 'straight') metersByType[item.type] = (metersByType[item.type] || 0) + Number(spec.length || 0);
        });
        return { counts, metersByType };
    }

    function summarizeBom(items, specs, state, options) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const st = state || {};
        const opts = options || {};
        const counted = opts.counts && opts.metersByType ? { counts: opts.counts, metersByType: opts.metersByType } : calculateItemCounts(items, source);
        const counts = counted.counts;
        const metersByType = counted.metersByType;
        const totalMeters = Object.values(metersByType).reduce((a, b) => a + Number(b || 0), 0);
        const angles = counts.cornerU003 || 0;
        const cubes = counts.cornerU022 || 0;
        const tNodes = counts.cornerU017 || 0;
        const crosses = counts.cornerU016 || 0;
        const angledNodes = (counts.cornerU001 || 0) + (counts.cornerU002 || 0) + (counts.cornerU004 || 0) + (counts.cornerU005 || 0);
        const multiNodes = (counts.cornerU012 || 0) + (counts.cornerU020 || 0) + (counts.cornerU024 || 0);
        const nodePieces = Object.entries(source).reduce((sum, [id, spec]) => sum + (spec && spec.kind === 'node' ? Number(counts[id] || 0) : 0), 0);
        const connectionCount = Number(opts.connectionCount || 0);
        const connectorKits = connectionCount;
        const baseCount = Number(counts.base || 0);
        const cq2Cones = connectionCount * 4;
        const cq2Pins = connectionCount * 8;
        const cq2Cotters = connectionCount * 8;
        const baseHalfConnectors = baseCount * 4;
        const baseC2Pins = baseCount * 4;
        const baseCotters = baseCount * 4;
        const totalC2Pins = cq2Pins + baseC2Pins;
        const totalCotters = cq2Cotters + baseCotters;
        const autoPins = cq2Cones;
        const placedPins = 0;
        const manualPins = 0;
        const totalPins = autoPins;
        let rental = 0;
        let weight = 0;
        Object.entries(source).forEach(([id, spec]) => {
            if (!spec || id === 'pin') return;
            const count = Number(counts[id] || 0);
            const meters = Number(metersByType[id] || 0);
            if (!count && !meters) return;
            const pw = priceAndWeightFor(spec, count, meters, st);
            rental += pw.price;
            weight += pw.weight;
        });
        const pinPW = priceAndWeightFor(source.pin, totalPins, 0, st);
        const halfConnectorPrice = Number(st.halfConnectorPrice || 0);
        const halfConnectorWeightPerUnit = Number(st.halfConnectorWeight || C3_83_WEIGHT_KG);
        const halfConnectorWeight = baseHalfConnectors * halfConnectorWeightPerUnit;
        const halfConnectorPriceTotal = baseHalfConnectors * halfConnectorPrice;
        const cq2C2PinWeight = cq2Pins * Number(st.c2PinWeight || C2_67_WEIGHT_KG);
        const baseC2PinWeight = baseC2Pins * Number(st.c2PinWeight || C2_67_WEIGHT_KG);
        const c2PinWeight = cq2C2PinWeight + baseC2PinWeight;
        const cq2CotterWeight = cq2Cotters * Number(st.cotterWeight || C2_COTTER_WEIGHT_KG);
        const baseCotterWeight = baseCotters * Number(st.cotterWeight || C2_COTTER_WEIGHT_KG);
        const c2CotterWeight = cq2CotterWeight + baseCotterWeight;
        rental += pinPW.price + halfConnectorPriceTotal;
        weight += pinPW.weight + halfConnectorWeight + c2PinWeight + c2CotterWeight;
        const install = Math.max(0, Number(st.install || 0));
        const transport = Math.max(0, Number(opts.transport || 0));
        const total = rental + install + transport;
        return { counts, metersByType, totalMeters, angles, cubes, tNodes, crosses, angledNodes, multiNodes, nodePieces, connectionCount, connectorKits, baseCount, cq2Cones, cq2Pins, cq2Cotters, baseHalfConnectors, baseC2Pins, baseCotters, totalC2Pins, totalCotters, autoPins, placedPins, manualPins, totalPins, halfConnectorWeight, halfConnectorPriceTotal, cq2C2PinWeight, baseC2PinWeight, c2PinWeight, cq2CotterWeight, baseCotterWeight, c2CotterWeight, rental, install, transport, total, weight };
    }

    function buildBomRows(result, specs, state, codeFn) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const res = result || {};
        const st = state || {};
        const rows = [];
        Object.keys(source).forEach(id => {
            const spec = source[id];
            if (!spec || spec.hidden || id === 'pin') return;
            const count = Number(res.counts && res.counts[id] || 0);
            const meters = Number(res.metersByType && res.metersByType[id] || 0);
            if (!count && !meters) return;
            const pw = priceAndWeightFor(spec, count, meters, st);
            rows.push({
                id,
                code: typeof codeFn === 'function' ? codeFn(spec) : '',
                name: spec.label || spec.short || id,
                qty: spec.kind === 'straight' ? meters : count,
                unit: spec.kind === 'straight' ? 'м' : 'шт',
                count,
                meters,
                weight: pw.weight,
                price: pw.price,
                note: spec.kind === 'straight' ? 'прямые фермы' : (spec.kind === 'node' ? 'угол / узел' : 'опора')
            });
        });
        if (Number(res.connectorKits || 0) > 0) {
            rows.push({ id:'c288', code:'C2-88', name:'Конусный коннектор C2-88', qty:Number(res.cq2Cones || 0), unit:'шт', count:Number(res.cq2Cones || 0), meters:0, weight:Number(res.cq2Cones || 0) * Number(st.pinWeight || 0), price:Number(res.cq2Cones || 0) * Number(st.pinPrice || 0), note:`${Number(res.connectorKits || 0)} торц. стыков × 4 шт` });
        }
        if (Number(res.baseHalfConnectors || 0) > 0) {
            rows.push({ id:'c383', code:'C3-83', name:'Полуконнектор конусный C3-83', qty:Number(res.baseHalfConnectors || 0), unit:'шт', count:Number(res.baseHalfConnectors || 0), meters:0, weight:Number(res.halfConnectorWeight || 0), price:Number(res.halfConnectorPriceTotal || 0), note:`${Number(res.baseCount || 0)} баз × 4 шт` });
        }
        if (Number(res.totalC2Pins || 0) > 0) {
            const parts = [];
            if (Number(res.connectorKits || 0) > 0) parts.push(`${Number(res.connectorKits || 0)} соед. × 8 шт`);
            if (Number(res.baseCount || 0) > 0) parts.push(`${Number(res.baseCount || 0)} баз × 4 шт`);
            rows.push({ id:'c267', code:'C2-67', name:'Палец C2-67', qty:Number(res.totalC2Pins || 0), unit:'шт', count:Number(res.totalC2Pins || 0), meters:0, weight:Number(res.c2PinWeight || 0), price:0, note:parts.join(' + ') || 'крепёж' });
            rows.push({ id:'cotter', code:'C2-2-48', name:'Шплинт игольчатый C2-2-48', qty:Number(res.totalCotters || 0), unit:'шт', count:Number(res.totalCotters || 0), meters:0, weight:Number(res.c2CotterWeight || 0), price:0, note:parts.join(' + ') || 'крепёж' });
        }
        return rows;
    }


    function itemPoints(item, specs, options) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const opts = options || {};
        const spec = source[item && item.type];
        if (!item || !spec) return [];
        if (spec.kind === 'straight') return straightPortPoints(item, spec, opts.cellMeters);
        if (spec.kind === 'node') {
            if (typeof opts.nodePortPoints === 'function') return opts.nodePortPoints(item, spec) || [];
            return [];
        }
        if (spec.kind === 'base') return [];
        return [{ x: Number(item.x || 0) + 0.5, y: Number(item.y || 0) + 0.5 }];
    }

    function connectionMap(items, specs, options) {
        const map = new Map();
        (Array.isArray(items) ? items : []).forEach(item => itemPoints(item, specs, options).forEach(pt => {
            const key = pointKey(pt.x, pt.y);
            const entry = map.get(key) || { x: pt.x, y: pt.y, count: 0, items: [] };
            entry.count += 1;
            entry.items.push(item);
            map.set(key, entry);
        }));
        return map;
    }

    function findNearestEndpoint(items, x, y, radius, ignoreId, specs, options) {
        const r = Number.isFinite(Number(radius)) ? Number(radius) : 1.15;
        let best = null;
        (Array.isArray(items) ? items : []).forEach(item => {
            if (ignoreId && String(item && item.id) === String(ignoreId)) return;
            itemPoints(item, specs, options).forEach(pt => {
                const dx = Number(pt.x) - Number(x);
                const dy = Number(pt.y) - Number(y);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= r && (!best || dist < best.dist)) best = { x: pt.x, y: pt.y, dist };
            });
        });
        return best;
    }

    function getSnappedPlacement(type, x, y, orientation, items, specs, state, helpers) {
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const spec = source[type];
        if (!spec) return { x, y, o: orientation };
        const opts = helpers || {};
        const list = Array.isArray(items) ? items : [];
        const fixedRotation = opts.fixedRotation;
        const ignoreId = opts.ignoreId || null;
        const o = orientation || 'n';
        const canPlace = typeof opts.inBounds === 'function'
            ? (candidateType, cx, cy, co) => opts.inBounds(candidateType, cx, cy, co)
            : (candidateType, cx, cy, co) => inBounds(candidateType, cx, cy, co, state || {}, source, opts.cellMeters);
        const nearest = (px, py, pradius) => findNearestEndpoint(list, px, py, pradius, ignoreId, source, opts);

        if (spec.kind === 'node') {
            if (typeof opts.nodeBasePortOffsets !== 'function' || typeof opts.rotatePortOffset !== 'function') {
                return { x, y, o: 'n', r: Number(fixedRotation || 0) };
            }
            const candidates = [];
            const rotations = fixedRotation === null || typeof fixedRotation === 'undefined' ? [0, 90, 180, 270] : [Number(fixedRotation || 0)];
            rotations.forEach(r => {
                const ports = (opts.nodeBasePortOffsets(spec) || []).map(p => opts.rotatePortOffset(p, r));
                ports.forEach(p => {
                    const desired = { x: Number(x) + Number(p.x || 0), y: Number(y) + Number(p.y || 0) };
                    const anchor = nearest(desired.x, desired.y, 1.15);
                    if (!anchor) return;
                    const cx = anchor.x - p.x;
                    const cy = anchor.y - p.y;
                    if (!canPlace(type, cx, cy, 'n')) return;
                    let contacts = 0;
                    let contactDistance = 0;
                    ports.forEach(pp => {
                        const a = nearest(cx + pp.x, cy + pp.y, 0.2);
                        if (a) { contacts += 1; contactDistance += a.dist || 0; }
                    });
                    const d = Math.hypot(cx - x, cy - y) + anchor.dist * 0.25 + contactDistance * 0.1;
                    candidates.push({ x: cx, y: cy, o: 'n', r, d, contacts });
                });
            });
            candidates.sort((a, b) => (b.contacts || 0) - (a.contacts || 0) || a.d - b.d);
            return candidates[0] || { x, y, o: 'n', r: Number(fixedRotation || 0) };
        }

        if (spec.kind === 'straight') {
            const cells = cellCount(spec.length, opts.cellMeters || (state && state.cellMeters));
            const candidates = [];
            const pts = o === 'v'
                ? [{ x: Number(x) + 0.5, y: Number(y), end: false }, { x: Number(x) + 0.5, y: Number(y) + cells, end: true }]
                : [{ x: Number(x), y: Number(y) + 0.5, end: false }, { x: Number(x) + cells, y: Number(y) + 0.5, end: true }];
            pts.forEach(pt => {
                const anchor = nearest(pt.x, pt.y, 1.15);
                if (!anchor) return;
                const candidate = o === 'v'
                    ? { x: anchor.x - 0.5, y: pt.end ? anchor.y - cells : anchor.y, o }
                    : { x: pt.end ? anchor.x - cells : anchor.x, y: anchor.y - 0.5, o };
                if (!canPlace(type, candidate.x, candidate.y, o)) return;
                candidate.d = Math.hypot(candidate.x - x, candidate.y - y) + anchor.dist * 0.25;
                candidates.push(candidate);
            });
            candidates.sort((a, b) => a.d - b.d);
            return candidates[0] || { x, y, o };
        }

        if (spec.kind === 'base') {
            if (typeof opts.baseSnapOffsets !== 'function') return { x, y, o: 'n' };
            const candidates = [];
            (opts.baseSnapOffsets() || []).forEach(p => {
                const desired = { x: Number(x) + Number(p.x || 0), y: Number(y) + Number(p.y || 0) };
                const anchor = nearest(desired.x, desired.y, 1.2);
                if (!anchor) return;
                const cx = anchor.x - p.x;
                const cy = anchor.y - p.y;
                if (!canPlace(type, cx, cy, 'n')) return;
                const centerPenalty = p.edge === 'C' ? 0.35 : 0;
                const d = Math.hypot(cx - x, cy - y) + anchor.dist * 0.25 + centerPenalty;
                candidates.push({ x: cx, y: cy, o: 'n', d });
            });
            candidates.sort((a, b) => a.d - b.d);
            return candidates[0] || { x, y, o: 'n' };
        }

        const anchor = nearest(Number(x) + 0.5, Number(y) + 0.5, 1.15);
        if (!anchor) return { x, y, o };
        return { x: anchor.x - 0.5, y: anchor.y - 0.5, o: 'n' };
    }


    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

        function renderStraightSvg(item, spec){
            const label = esc(spec.short || '');
            if ((item.o || 'h') === 'v') {
                return `<svg class="truss-svg truss-v" viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden="true">
                    <line class="truss-rail" x1="8" y1="4" x2="8" y2="96"></line><line class="truss-rail" x1="24" y1="4" x2="24" y2="96"></line>
                    <line class="truss-end" x1="6" y1="4" x2="26" y2="4"></line><line class="truss-end" x1="6" y1="96" x2="26" y2="96"></line>
                    <path class="truss-web" d="M8 6 L24 18 L8 30 L24 42 L8 54 L24 66 L8 78 L24 92"></path>
                    <text class="truss-label" x="16" y="52" text-anchor="middle" dominant-baseline="middle" font-size="12" transform="rotate(-90 16 52)">${label}</text>
                </svg>`;
            }
            return `<svg class="truss-svg truss-h" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
                <line class="truss-rail" x1="4" y1="8" x2="96" y2="8"></line><line class="truss-rail" x1="4" y1="24" x2="96" y2="24"></line>
                <line class="truss-end" x1="4" y1="6" x2="4" y2="26"></line><line class="truss-end" x1="96" y1="6" x2="96" y2="26"></line>
                <path class="truss-web" d="M6 8 L18 24 L30 8 L42 24 L54 8 L66 24 L78 8 L92 24"></path>
                <text class="truss-label" x="50" y="18" text-anchor="middle" dominant-baseline="middle" font-size="12">${label}</text>
            </svg>`;
        }
        function nodePorts(spec){
            const map = {
                cornerU001:['E','SE'], cornerU002:['E','SE'], cornerU003:['E','S'], cornerU004:['E','SW'], cornerU005:['E','SW'],
                cornerU012:['E','S','N'], cornerU016:['N','E','S','W'], cornerU017:['W','E','S'], cornerU020:['N','E','S','W'],
                cornerU022:['N','E','S','W','Z'], cornerU024:['N','E','S','W','Z']
            };
            return map[spec.id] || ['E','S'];
        }
        function nodeTubeSvg(port){
            const arm = {
                E: `<line class="node-truss-rail" x1="50" y1="42" x2="96" y2="42"></line><line class="node-truss-rail" x1="50" y1="58" x2="96" y2="58"></line><path class="node-truss-web" d="M54 42 L66 58 L78 42 L91 58"></path><line class="node-end-plate" x1="96" y1="38" x2="96" y2="62"></line><circle class="node-port-dot" cx="96" cy="50" r="5"></circle>`,
                W: `<line class="node-truss-rail" x1="4" y1="42" x2="50" y2="42"></line><line class="node-truss-rail" x1="4" y1="58" x2="50" y2="58"></line><path class="node-truss-web" d="M8 58 L21 42 L34 58 L46 42"></path><line class="node-end-plate" x1="4" y1="38" x2="4" y2="62"></line><circle class="node-port-dot" cx="4" cy="50" r="5"></circle>`,
                N: `<line class="node-truss-rail" x1="42" y1="4" x2="42" y2="50"></line><line class="node-truss-rail" x1="58" y1="4" x2="58" y2="50"></line><path class="node-truss-web" d="M42 8 L58 21 L42 34 L58 46"></path><line class="node-end-plate" x1="38" y1="4" x2="62" y2="4"></line><circle class="node-port-dot" cx="50" cy="4" r="5"></circle>`,
                S: `<line class="node-truss-rail" x1="42" y1="50" x2="42" y2="96"></line><line class="node-truss-rail" x1="58" y1="50" x2="58" y2="96"></line><path class="node-truss-web" d="M58 54 L42 66 L58 78 L42 91"></path><line class="node-end-plate" x1="38" y1="96" x2="62" y2="96"></line><circle class="node-port-dot" cx="50" cy="96" r="5"></circle>`,
                NE:`<line class="node-truss-rail" x1="54" y1="46" x2="90" y2="10"></line><line class="node-truss-rail" x1="66" y1="58" x2="98" y2="26"></line><path class="node-truss-web" d="M61 48 L73 44 L76 32 L89 28"></path><circle class="node-port-dot" cx="94" cy="18" r="5"></circle>`,
                SE:`<line class="node-truss-rail" x1="54" y1="54" x2="90" y2="90"></line><line class="node-truss-rail" x1="66" y1="42" x2="98" y2="74"></line><path class="node-truss-web" d="M62 52 L74 56 L77 68 L90 72"></path><circle class="node-port-dot" cx="94" cy="82" r="5"></circle>`,
                SW:`<line class="node-truss-rail" x1="46" y1="54" x2="10" y2="90"></line><line class="node-truss-rail" x1="34" y1="42" x2="2" y2="74"></line><path class="node-truss-web" d="M38 52 L26 56 L23 68 L10 72"></path><circle class="node-port-dot" cx="6" cy="82" r="5"></circle>`,
                NW:`<line class="node-truss-rail" x1="46" y1="46" x2="10" y2="10"></line><line class="node-truss-rail" x1="34" y1="58" x2="2" y2="26"></line><path class="node-truss-web" d="M39 48 L27 44 L24 32 L11 28"></path><circle class="node-port-dot" cx="6" cy="18" r="5"></circle>`,
                Z: `<line class="node-truss-rail" x1="54" y1="46" x2="82" y2="18"></line><line class="node-truss-rail" x1="66" y1="58" x2="94" y2="30"></line><path class="node-truss-web" d="M61 48 L72 46 L78 36 L88 34"></path><circle class="node-port-dot" cx="88" cy="24" r="5"></circle>`
            }[port];
            return arm || '';
        }
        function nodeBasePortOffsets(spec){
            // Вся 2D-геометрия узлов переведена на центровые торцы.
            // Теперь прямые фермы и U-узлы стыкуются по центрам торцов, а не по углам ячейки.
            const PORT_OFFSETS = {
                E:{x:1,y:0.5}, W:{x:0,y:0.5}, N:{x:0.5,y:0}, S:{x:0.5,y:1},
                NE:{x:1,y:0}, SE:{x:1,y:1}, SW:{x:0,y:1}, NW:{x:0,y:0},
                Z:{x:0.5,y:0.5}
            };
            return nodePorts(spec).map(port => {
                const p = PORT_OFFSETS[port] || PORT_OFFSETS.E;
                return { x:Number(p.x), y:Number(p.y) };
            });
        }
        function rotatePortOffset(p, deg){
            const steps = ((((Math.round(Number(deg || 0) / 90) % 4) + 4) % 4));
            let x = Number(p.x || 0), y = Number(p.y || 0);
            for (let i = 0; i < steps; i++) {
                const nx = 1 - y;
                const ny = x;
                x = nx; y = ny;
            }
            return { x, y };
        }
        function nodePortPoints(item, spec){
            const r = Number(item.r || 0);
            return nodeBasePortOffsets(spec).map(p => rotatePortOffset(p, r)).map(p => ({ x:item.x + p.x, y:item.y + p.y }));
        }
        function nodeStyleSvg(content, label, r, vb='0 0 100 100', cx=50, cy=50, lx=50, ly=56){
            return `<svg class="node-svg" viewBox="${vb}" aria-hidden="true"><g transform="rotate(${r} ${cx} ${cy})">${content}</g><text class="node-label" x="${lx}" y="${ly}" text-anchor="middle">${label}</text></svg>`;
        }
        function renderAngledNode(kind){
            if (kind === 'u001') {
                return `
                    <line class="node-truss-rail" x1="18" y1="22" x2="82" y2="22"></line>
                    <line class="node-truss-rail" x1="18" y1="38" x2="66" y2="38"></line>
                    <line class="node-truss-rail" x1="24" y1="30" x2="78" y2="84"></line>
                    <line class="node-truss-rail" x1="36" y1="18" x2="90" y2="72"></line>
                    <path class="node-truss-web" d="M26 22 L42 38 L58 22 M34 40 L50 56 L66 72"></path>
                    <line class="node-end-plate" x1="86" y1="18" x2="86" y2="42"></line>
                    <line class="node-end-plate" x1="82" y1="78" x2="94" y2="90"></line>
                    <circle class="node-port-dot" cx="86" cy="30" r="4.6"></circle>
                    <circle class="node-port-dot" cx="86" cy="86" r="4.6"></circle>
                    <rect class="node-core" x="28" y="32" width="18" height="18" rx="4"></rect>`;
            }
            if (kind === 'u002') {
                return `
                    <line class="node-truss-rail" x1="16" y1="24" x2="82" y2="24"></line>
                    <line class="node-truss-rail" x1="16" y1="40" x2="60" y2="40"></line>
                    <line class="node-truss-rail" x1="24" y1="34" x2="62" y2="84"></line>
                    <line class="node-truss-rail" x1="38" y1="24" x2="76" y2="74"></line>
                    <path class="node-truss-web" d="M26 24 L40 40 L52 56 M38 40 L50 56 L62 72"></path>
                    <line class="node-end-plate" x1="86" y1="20" x2="86" y2="44"></line>
                    <line class="node-end-plate" x1="66" y1="78" x2="82" y2="90"></line>
                    <circle class="node-port-dot" cx="86" cy="32" r="4.6"></circle>
                    <circle class="node-port-dot" cx="74" cy="86" r="4.6"></circle>
                    <rect class="node-core" x="28" y="34" width="18" height="18" rx="4"></rect>`;
            }
            if (kind === 'u004') {
                return `
                    <line class="node-truss-rail" x1="18" y1="22" x2="82" y2="22"></line>
                    <line class="node-truss-rail" x1="34" y1="38" x2="82" y2="38"></line>
                    <line class="node-truss-rail" x1="22" y1="78" x2="76" y2="24"></line>
                    <line class="node-truss-rail" x1="10" y1="90" x2="64" y2="36"></line>
                    <path class="node-truss-web" d="M42 22 L58 38 L74 22 M20 78 L36 62 L52 46"></path>
                    <line class="node-end-plate" x1="86" y1="18" x2="86" y2="42"></line>
                    <line class="node-end-plate" x1="8" y1="78" x2="20" y2="90"></line>
                    <circle class="node-port-dot" cx="86" cy="30" r="4.6"></circle>
                    <circle class="node-port-dot" cx="14" cy="86" r="4.6"></circle>
                    <rect class="node-core" x="54" y="32" width="18" height="18" rx="4"></rect>`;
            }
            if (kind === 'u005') {
                return `
                    <line class="node-truss-rail" x1="18" y1="24" x2="82" y2="24"></line>
                    <line class="node-truss-rail" x1="40" y1="40" x2="82" y2="40"></line>
                    <line class="node-truss-rail" x1="18" y1="68" x2="62" y2="24"></line>
                    <line class="node-truss-rail" x1="6" y1="80" x2="50" y2="36"></line>
                    <path class="node-truss-web" d="M42 24 L54 40 L66 24 M18 68 L30 56 L42 44"></path>
                    <line class="node-end-plate" x1="86" y1="20" x2="86" y2="44"></line>
                    <line class="node-end-plate" x1="6" y1="70" x2="18" y2="82"></line>
                    <circle class="node-port-dot" cx="86" cy="32" r="4.6"></circle>
                    <circle class="node-port-dot" cx="12" cy="76" r="4.6"></circle>
                    <rect class="node-core" x="52" y="34" width="18" height="18" rx="4"></rect>`;
            }
            if (kind === 'u012') {
                return `
                    <line class="node-truss-rail" x1="42" y1="6" x2="42" y2="94"></line>
                    <line class="node-truss-rail" x1="58" y1="6" x2="58" y2="60"></line>
                    <line class="node-truss-rail" x1="58" y1="42" x2="94" y2="42"></line>
                    <line class="node-truss-rail" x1="58" y1="58" x2="94" y2="58"></line>
                    <path class="node-truss-web" d="M42 12 L58 24 L42 36 L58 48 L42 60 L58 72 L42 84 M62 42 L76 58 L90 42"></path>
                    <line class="node-end-plate" x1="38" y1="4" x2="62" y2="4"></line>
                    <line class="node-end-plate" x1="38" y1="96" x2="62" y2="96"></line>
                    <line class="node-end-plate" x1="96" y1="38" x2="96" y2="62"></line>
                    <circle class="node-port-dot" cx="50" cy="4" r="4.6"></circle>
                    <circle class="node-port-dot" cx="50" cy="96" r="4.6"></circle>
                    <circle class="node-port-dot" cx="96" cy="50" r="4.6"></circle>
                    <rect class="node-core" x="42" y="42" width="16" height="16" rx="4"></rect>`;
            }
            if (kind === 'u017') {
                return `
                    <line class="node-truss-rail" x1="4" y1="42" x2="96" y2="42"></line>
                    <line class="node-truss-rail" x1="4" y1="58" x2="58" y2="58"></line>
                    <line class="node-truss-rail" x1="42" y1="58" x2="42" y2="94"></line>
                    <line class="node-truss-rail" x1="58" y1="58" x2="58" y2="94"></line>
                    <path class="node-truss-web" d="M8 58 L22 42 L36 58 L50 42 L64 58 L78 42 L92 58 M42 62 L58 76 L42 90"></path>
                    <line class="node-end-plate" x1="4" y1="38" x2="4" y2="62"></line>
                    <line class="node-end-plate" x1="96" y1="38" x2="96" y2="62"></line>
                    <line class="node-end-plate" x1="38" y1="96" x2="62" y2="96"></line>
                    <circle class="node-port-dot" cx="4" cy="50" r="4.6"></circle>
                    <circle class="node-port-dot" cx="96" cy="50" r="4.6"></circle>
                    <circle class="node-port-dot" cx="50" cy="96" r="4.6"></circle>
                    <rect class="node-core" x="42" y="42" width="16" height="16" rx="4"></rect>`;
            }
            if (kind === 'u016' || kind === 'u020' || kind === 'u022' || kind === 'u024') {
                const centerMark = kind === 'u022'
                    ? '<circle cx="50" cy="50" r="11" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.6)" stroke-width="2"></circle>'
                    : kind === 'u024'
                        ? '<path d="M50 36 L64 50 L50 64 L36 50 Z" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.6)" stroke-width="2"></path>'
                        : kind === 'u020'
                            ? '<rect x="39" y="39" width="22" height="22" rx="5" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.6)" stroke-width="2"></rect>'
                            : '';
                return `
                    <line class="node-truss-rail" x1="42" y1="4" x2="42" y2="96"></line>
                    <line class="node-truss-rail" x1="58" y1="4" x2="58" y2="96"></line>
                    <line class="node-truss-rail" x1="4" y1="42" x2="96" y2="42"></line>
                    <line class="node-truss-rail" x1="4" y1="58" x2="96" y2="58"></line>
                    <path class="node-truss-web" d="M42 8 L58 22 L42 36 M42 64 L58 78 L42 92 M8 58 L22 42 L36 58 M64 58 L78 42 L92 58"></path>
                    <line class="node-end-plate" x1="38" y1="4" x2="62" y2="4"></line>
                    <line class="node-end-plate" x1="38" y1="96" x2="62" y2="96"></line>
                    <line class="node-end-plate" x1="4" y1="38" x2="4" y2="62"></line>
                    <line class="node-end-plate" x1="96" y1="38" x2="96" y2="62"></line>
                    <circle class="node-port-dot" cx="50" cy="4" r="4.6"></circle>
                    <circle class="node-port-dot" cx="50" cy="96" r="4.6"></circle>
                    <circle class="node-port-dot" cx="4" cy="50" r="4.6"></circle>
                    <circle class="node-port-dot" cx="96" cy="50" r="4.6"></circle>
                    <rect class="node-core" x="42" y="42" width="16" height="16" rx="4"></rect>${centerMark}`;
            }
            return '';
        }
function renderNodeSvg(item, spec){
            const r = Number(item.r || 0);
            const label = spec.u ? `U${spec.u}` : esc(spec.short || '');
            if (spec.id === 'cornerU003') {
                return `<svg class="node-svg u003-reference-svg" viewBox="215 414 150 150" aria-hidden="true">
                    <g transform="rotate(${r} 290 489)">
                        <g class="u003-shape" opacity="0.94">
                            <path class="u003-ref-tube" d="M352.4,419.7c-36.4,0-72.8,0-109.2,0c-5.2,0-10.4,0-15.6,0c-11.6,0-11.6,18,0,18c36.4,0,72.8,0,109.2,0 c5.2,0,10.4,0,15.6,0C364,437.7,364,419.7,352.4,419.7L352.4,419.7z"></path>
                            <path class="u003-ref-tube" d="M236.6,549.1c0-35.1,0-70.2,0-105.3c0-5,0-10,0-15c0-11.6-18-11.6-18,0c0,35.1,0,70.2,0,105.3c0,5,0,10,0,15 C218.6,560.7,236.6,560.7,236.6,549.1L236.6,549.1z"></path>
                            <path class="u003-ref-tube" d="M302.7,549.1c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C284.7,560.7,302.7,560.7,302.7,549.1L302.7,549.1z"></path>
                            <path class="u003-ref-tube" d="M352.4,485.9c-19.5,0-39.1,0-58.6,0c-11.6,0-11.6,18,0,18c19.5,0,39.1,0,58.6,0 C364,503.9,364,485.9,352.4,485.9L352.4,485.9z"></path>
                            <path class="u003-ref-tube" d="M337.4,494.9c0-22.1,0-44.1,0-66.2c0-11.6-18-11.6-18,0c0,22.1,0,44.1,0,66.2 C319.4,506.5,337.4,506.5,337.4,494.9L337.4,494.9z"></path>
                            <path class="u003-ref-tube" d="M293.7,519.2c-22.1,0-44.1,0-66.2,0c-11.6,0-11.6,18,0,18c22.1,0,44.1,0,66.2,0 C305.3,537.2,305.3,519.2,293.7,519.2L293.7,519.2z"></path>
                            <path class="u003-ref-tube" d="M312.6,491.1c-15.1-22.1-30.3-44.1-45.4-66.2c-5.4-7.9-18.4-0.4-13,7.6c15.1,22.1,30.3,44.1,45.4,66.2 C305,506.6,318,499.1,312.6,491.1L312.6,491.1z"></path>
                            <path class="u003-ref-tube" d="M297.5,501.5c-22.1-15.4-44.1-30.7-66.2-46.1c-7.9-5.5-15.4,7.5-7.6,13c22.1,15.4,44.1,30.7,66.2,46.1 C297.9,520,305.4,507,297.5,501.5L297.5,501.5z"></path>
                        </g>
                    </g>
                </svg>`;
            }
            if (spec.id === 'cornerU016') {
                return `<svg class="node-svg u003-reference-svg" viewBox="160 360 215 210" aria-hidden="true">
                    <g transform="rotate(${r} 266.5 466.6)">
                        <g class="u016-shape" opacity="0.94">
                            <path class="u003-ref-tube" d="M352.4,419.7c-18.2,0-36.5,0-54.7,0c-11.6,0-11.6,18,0,18c18.2,0,36.5,0,54.7,0 C364,437.7,364,419.7,352.4,419.7L352.4,419.7z"></path>
                            <path class="u003-ref-tube" d="M236.6,549.1c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C218.6,560.7,236.6,560.7,236.6,549.1L236.6,549.1z"></path>
                            <path class="u003-ref-tube" d="M302.7,549.1c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C284.7,560.7,302.7,560.7,302.7,549.1L302.7,549.1z"></path>
                            <path class="u003-ref-tube" d="M352.4,485.9c-19.5,0-39.1,0-58.6,0c-11.6,0-11.6,18,0,18c19.5,0,39.1,0,58.6,0 C364,503.9,364,485.9,352.4,485.9L352.4,485.9z"></path>
                            <path class="u003-ref-tube" d="M337.4,494.9c0-22.1,0-44.1,0-66.2c0-11.6-18-11.6-18,0c0,22.1,0,44.1,0,66.2 C319.4,506.5,337.4,506.5,337.4,494.9L337.4,494.9z"></path>
                            <path class="u003-ref-tube" d="M293.7,519.2c-22.1,0-44.1,0-66.2,0c-11.6,0-11.6,18,0,18c22.1,0,44.1,0,66.2,0 C305.3,537.2,305.3,519.2,293.7,519.2L293.7,519.2z"></path>
                            <path class="u003-ref-tube" d="M299,489.6c-19.3-19.9-38.6-39.8-58-59.7c-2.7-2.8-5.5-5.6-8.2-8.5c-6.7-6.9-17.3,3.7-10.6,10.6c19.3,19.9,38.6,39.8,58,59.7c2.7,2.8,5.5,5.6,8.2,8.5C295.2,507.2,305.8,496.5,299,489.6L299,489.6z"></path>
                            <path class="u003-ref-tube" d="M292.3,423.4c-20.4,19.3-40.9,38.6-61.3,57.9c-2.9,2.7-5.8,5.5-8.7,8.2c-7,6.6,3.6,17.2,10.6,10.6c20.4-19.3,40.9-38.6,61.3-57.9c2.9-2.7,5.8-5.5,8.7-8.2C310,427.4,299.4,416.8,292.3,423.4L292.3,423.4z"></path>
                            <path class="u003-ref-tube" d="M227.6,485.9c-19.5,0-39.1,0-58.6,0c-11.6,0-11.6,18,0,18c19.5,0,39.1,0,58.6,0 C239.2,503.9,239.2,485.9,227.6,485.9L227.6,485.9z"></path>
                            <path class="u003-ref-tube" d="M202,494.9c0-22.1,0-44.1,0-66.2c0-11.6-18-11.6-18,0c0,22.1,0,44.1,0,66.2C184,506.5,202,506.5,202,494.9 L202,494.9z"></path>
                            <path class="u003-ref-tube" d="M306.6,426.7c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C288.6,438.3,306.6,438.3,306.6,426.7L306.6,426.7z"></path>
                            <path class="u003-ref-tube" d="M236.6,426.7c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C218.6,438.3,236.6,438.3,236.6,426.7L236.6,426.7z"></path>
                            <path class="u003-ref-tube" d="M295.7,378.9c-22.1,0-44.1,0-66.2,0c-11.6,0-11.6,18,0,18c22.1,0,44.1,0,66.2,0 C307.3,396.9,307.3,378.9,295.7,378.9L295.7,378.9z"></path>
                            <path class="u003-ref-tube" d="M225.6,417.7c-18.2,0-36.5,0-54.7,0c-11.6,0-11.6,18,0,18c18.2,0,36.5,0,54.7,0 C237.2,435.7,237.2,417.7,225.6,417.7L225.6,417.7z"></path>
                        </g>
                    </g>
                </svg>`;
            }
            if (spec.id === 'cornerU017') {
                return `<svg class="node-svg u003-reference-svg" viewBox="160 410 215 160" aria-hidden="true">
                    <g transform="rotate(${r} 266.5 490.2)">
                        <g class="u017-shape" opacity="0.94">
                            <path class="u003-ref-tube" d="M352.4,419.7c-20.6,0-41.2,0-61.8,0c-32.9,0-65.8,0-98.7,0c-7.6,0-15.3,0-22.9,0c-11.6,0-11.6,18,0,18 c20.6,0,41.2,0,61.8,0c32.9,0,65.8,0,98.7,0c7.6,0,15.3,0,22.9,0C364,437.7,364,419.7,352.4,419.7L352.4,419.7z"></path>
                            <path class="u003-ref-tube" d="M236.6,549.1c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C218.6,560.7,236.6,560.7,236.6,549.1L236.6,549.1z"></path>
                            <path class="u003-ref-tube" d="M302.7,549.1c0-18.1,0-36.1,0-54.2c0-11.6-18-11.6-18,0c0,18.1,0,36.1,0,54.2 C284.7,560.7,302.7,560.7,302.7,549.1L302.7,549.1z"></path>
                            <path class="u003-ref-tube" d="M352.4,485.9c-19.5,0-39.1,0-58.6,0c-11.6,0-11.6,18,0,18c19.5,0,39.1,0,58.6,0 C364,503.9,364,485.9,352.4,485.9L352.4,485.9z"></path>
                            <path class="u003-ref-tube" d="M337.4,494.9c0-22.1,0-44.1,0-66.2c0-11.6-18-11.6-18,0c0,22.1,0,44.1,0,66.2 C319.4,506.5,337.4,506.5,337.4,494.9L337.4,494.9z"></path>
                            <path class="u003-ref-tube" d="M293.7,519.2c-22.1,0-44.1,0-66.2,0c-11.6,0-11.6,18,0,18c22.1,0,44.1,0,66.2,0 C305.3,537.2,305.3,519.2,293.7,519.2L293.7,519.2z"></path>
                            <path class="u003-ref-tube" d="M300.2,491.1c-11-22.1-22.1-44.1-33.1-66.2c-4.3-8.6-17.3-1-13,7.6c11,22.1,22.1,44.1,33.1,66.2 C291.6,507.3,304.5,499.7,300.2,491.1L300.2,491.1z"></path>
                            <path class="u003-ref-tube" d="M254.2,425c-11,22.1-22.1,44.1-33.1,66.2c-4.3,8.6,8.6,16.2,13,7.6c11-22.1,22.1-44.1,33.1-66.2 C271.4,423.9,258.5,416.3,254.2,425L254.2,425z"></path>
                            <path class="u003-ref-tube" d="M227.6,485.9c-19.5,0-39.1,0-58.6,0c-11.6,0-11.6,18,0,18c19.5,0,39.1,0,58.6,0 C239.2,503.9,239.2,485.9,227.6,485.9L227.6,485.9z"></path>
                            <path class="u003-ref-tube" d="M202,494.9c0-22.1,0-44.1,0-66.2c0-11.6-18-11.6-18,0c0,22.1,0,44.1,0,66.2C184,506.5,202,506.5,202,494.9 L202,494.9z"></path>
                        </g>
                    </g>
                </svg>`;
            }
            const kindMap = {
                cornerU001:'u001', cornerU002:'u002', cornerU004:'u004', cornerU005:'u005',
                cornerU012:'u012', cornerU020:'u020', cornerU022:'u022', cornerU024:'u024'
            };
            if (kindMap[spec.id]) {
                return nodeStyleSvg(renderAngledNode(kindMap[spec.id]), label, r);
            }
            const ports = nodePorts(spec).map(nodeTubeSvg).join('');
            const cubeMark = ['cornerU020','cornerU022','cornerU024'].includes(spec.id) ? '<circle cx="50" cy="50" r="25" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.45)" stroke-width="2"></circle>' : '';
            return `<svg class="node-svg" viewBox="0 0 100 100" aria-hidden="true">
                <g transform="rotate(${r} 50 50)">${ports}<rect class="node-core" x="29" y="29" width="42" height="42" rx="10"></rect>${cubeMark}</g>
                <text class="node-label" x="50" y="56" text-anchor="middle">${label}</text>
            </svg>`;
        }
        function baseSnapOffsets(){
            return [
                { x:0.5, y:0, edge:'N' },
                { x:1, y:0.5, edge:'E' },
                { x:0.5, y:1, edge:'S' },
                { x:0, y:0.5, edge:'W' },
                { x:0.5, y:0.5, edge:'C' }
            ];
        }
        function renderBaseSvg(){
            return `<svg class="base-svg" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                    <radialGradient id="baseMetal" cx="35%" cy="30%" r="75%">
                        <stop offset="0%" stop-color="#eef2f6"></stop>
                        <stop offset="50%" stop-color="#c7ced7"></stop>
                        <stop offset="100%" stop-color="#7a838e"></stop>
                    </radialGradient>
                </defs>
                <ellipse cx="50" cy="52" rx="44" ry="40" fill="url(#baseMetal)" stroke="#f5f8fb" stroke-width="2"></ellipse>
                <ellipse cx="50" cy="52" rx="18" ry="17" fill="#929ca7" stroke="rgba(255,255,255,.65)" stroke-width="1.8"></ellipse>
                <path d="M50 24 A28 24 0 0 1 78 52" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="8" stroke-linecap="round"></path>
                <path d="M22 52 A28 24 0 0 1 50 24" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="8" stroke-linecap="round"></path>
                <circle cx="50" cy="30" r="4.8" fill="#dfe5ec" stroke="#ffffff" stroke-width="1.4"></circle>
                <circle cx="72" cy="52" r="4.8" fill="#dfe5ec" stroke="#ffffff" stroke-width="1.4"></circle>
                <circle cx="50" cy="74" r="4.8" fill="#dfe5ec" stroke="#ffffff" stroke-width="1.4"></circle>
                <circle cx="28" cy="52" r="4.8" fill="#dfe5ec" stroke="#ffffff" stroke-width="1.4"></circle>
                <rect x="16" y="22" width="15" height="4" rx="2" fill="#adb6c0" transform="rotate(-24 16 22)"></rect>
                <rect x="69" y="78" width="15" height="4" rx="2" fill="#adb6c0" transform="rotate(28 69 78)"></rect>
                <circle cx="50" cy="52" r="2.8" fill="#5b6470"></circle>
            </svg>`;
        }


    function renderLibraryHtml(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const specs = opts.specs || DEFAULT_SPECS;
        const groups = Array.isArray(opts.groups) ? opts.groups : getLibraryGroups(specs);
        const selected = opts.selected || '';
        const escFn = typeof opts.escape === 'function' ? opts.escape : escapeHtml;
        const displayNameFn = typeof opts.specDisplayName === 'function' ? opts.specDisplayName : (spec => spec && (spec.label || spec.short || spec.id) || '');
        const mdmtCodeFn = typeof opts.mdmtCode === 'function' ? opts.mdmtCode : (() => '');
        const nodeWeightFn = typeof opts.nodeWeight === 'function' ? opts.nodeWeight : (spec => nodeWeight(spec, opts.mdmtType));
        const metricFn = typeof opts.metric === 'function' ? opts.metric : ((value, digits) => Number(value || 0).toFixed(Number.isFinite(Number(digits)) ? Number(digits) : 2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
        const selectCall = opts.selectCall || 'FEG35BlockConstructor.select';

        const makeButton = (spec) => {
            if (!spec || spec.hidden) return '';
            const code = mdmtCodeFn(spec);
            const weight = spec.kind === 'node' ? ` · ${metricFn(nodeWeightFn(spec), 2)} кг` : '';
            const detail = code ? `${code}${weight}` : spec.label;
            const tooltip = `${displayNameFn(spec)} · ${detail}`;
            return `
                    <button type="button" class="${selected === spec.id ? 'active' : ''}" data-kind="${escFn(spec.kind)}" onclick="${selectCall}('${escFn(spec.id)}')" title="${escFn(tooltip)}" aria-label="${escFn(tooltip)}">
                        <span class="block-object-icon" aria-hidden="true">${escFn(spec.icon)}</span>
                    </button>`;
        };

        return groups.map((group, index) => {
            const groupSpecs = Array.isArray(group.specs)
                ? group.specs
                : (Array.isArray(group.items) ? group.items.map(id => specs[id]).filter(spec => spec && !spec.hidden) : []);
            if (!groupSpecs.length) return '';
            const active = groupSpecs.some(spec => spec.id === selected);
            const open = active || (!selected && index === 0);
            const title = `${group.title}: ${groupSpecs.map(spec => spec.short || spec.label).join(', ')}`;
            return `
                    <details class="block-object-group ${active ? 'active' : ''}" data-group="${escFn(group.id)}" ${open ? 'open' : ''}>
                        <summary title="${escFn(title)}" aria-label="${escFn(group.title)}">
                            <span class="block-group-icon" aria-hidden="true">${escFn(group.icon)}</span>
                            <span class="block-group-title">${escFn(group.title)}</span>
                            <span class="block-group-count">${groupSpecs.length}</span>
                        </summary>
                        <div class="block-object-group-body">${groupSpecs.map(makeButton).join('')}</div>
                    </details>`;
        }).join('');
    }

    function renderItemClass(item, spec, selectedItemId) {
        if (!item || !spec) return 'block-item';
        const isStraight = spec.kind === 'straight';
        return `block-item ${isStraight ? 'block-item-straight ' + (item.o || 'h') : 'block-item-' + spec.kind}${String(selectedItemId || '') === String(item.id || '') ? ' selected' : ''}`;
    }

    function itemStyleMap(item, spec, cellPx, cellMeters) {
        if (!item || !spec) return {};
        const px = Number(cellPx || 0);
        const isStraight = spec.kind === 'straight';
        const cells = isStraight ? cellCount(spec.length, cellMeters) : 1;
        const style = {
            left: `${Number(item.x || 0) * px + 3}px`,
            top: `${Number(item.y || 0) * px + 3}px`,
            width: `${((isStraight && item.o === 'h') ? cells : 1) * px - 6}px`,
            height: `${((isStraight && item.o === 'v') ? cells : 1) * px - 6}px`
        };
        if (spec.kind === 'node') {
            const scale = spec.id === 'cornerU003' ? 1.00 : 1.24;
            const extra = ((scale - 1) * px) / 2;
            let shiftX = 0;
            let shiftY = 0;
            if (spec.id === 'cornerU003') {
                shiftX = 0;
                shiftY = 0;
            }
            style.left = `${Number(item.x || 0) * px + 3 - extra + shiftX}px`;
            style.top = `${Number(item.y || 0) * px + 3 - extra + shiftY}px`;
            style.width = `${px * scale - 6}px`;
            style.height = `${px * scale - 6}px`;
        }
        if (!isStraight && spec.kind !== 'node' && Number(item.r || 0)) style.transform = `rotate(${Number(item.r || 0)}deg)`;
        return style;
    }

    function applyStyleMap(el, style) {
        if (!el || !style) return el;
        Object.keys(style).forEach(key => { el.style[key] = style[key]; });
        return el;
    }

    function renderItemMarkup(item, spec) {
        if (!item || !spec) return '';
        if (spec.kind === 'straight') return renderStraightSvg(item, spec);
        if (spec.kind === 'node') return renderNodeSvg(item, spec);
        if (spec.kind === 'base') return renderBaseSvg();
        return escapeHtml(spec.short || spec.label || spec.id || '');
    }



    function createFieldItemElement(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const doc = opts.document || (typeof global !== 'undefined' ? global.document : null);
        const item = opts.item;
        const spec = opts.spec;
        if (!doc || !item || !spec) return null;
        const div = doc.createElement('div');
        div.className = renderItemClass(item, spec, opts.selectedItemId);
        const displayNameFn = typeof opts.specDisplayName === 'function' ? opts.specDisplayName : (s => s && (s.label || s.short || s.id) || '');
        div.title = `${displayNameFn(spec)} · клик: выбрать`;
        div.dataset.itemId = item.id;
        applyStyleMap(div, itemStyleMap(item, spec, opts.cellPx, opts.cellMeters));
        div.innerHTML = renderItemMarkup(item, spec);
        if (typeof opts.calibrate === 'function') opts.calibrate(div, item, spec);
        if (typeof opts.onPointerDown === 'function') {
            div.addEventListener('pointerdown', event => opts.onPointerDown(event, item, div));
        }
        if (typeof opts.onClick === 'function') {
            div.addEventListener('click', event => opts.onClick(event, item, div));
        }
        return div;
    }

    function renderFieldItems(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const grid = opts.grid;
        const items = Array.isArray(opts.items) ? opts.items : [];
        const specs = opts.specs || DEFAULT_SPECS;
        const fragment = (opts.document || (typeof global !== 'undefined' ? global.document : null)).createDocumentFragment();
        items.forEach(item => {
            const spec = specs[item && item.type];
            if (!spec) return;
            const el = createFieldItemElement(Object.assign({}, opts, { item, spec }));
            if (el) fragment.appendChild(el);
        });
        if (grid) grid.appendChild(fragment);
        return fragment;
    }




    function gridPointFromEvent(event, grid, cellPx) {
        if (!event || !grid || typeof grid.getBoundingClientRect !== 'function') return { x:0, y:0 };
        const rect = grid.getBoundingClientRect();
        const cell = Math.max(1, Number(cellPx || 1));
        return {
            x: (Number(event.clientX || 0) - rect.left) / cell,
            y: (Number(event.clientY || 0) - rect.top) / cell
        };
    }

    function createItemDragState(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const event = opts.event;
        const item = opts.item;
        if (!event || !item) return null;
        const raw = gridPointFromEvent(event, opts.grid, opts.cellPx);
        return {
            id: item.id,
            startClientX: Number(event.clientX || 0),
            startClientY: Number(event.clientY || 0),
            offsetX: raw.x - Number(item.x || 0),
            offsetY: raw.y - Number(item.y || 0),
            moved: false
        };
    }

    function applyItemDragMove(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const dragState = opts.dragState;
        const event = opts.event;
        const item = opts.item;
        const spec = opts.spec;
        if (!dragState || !event || !item || !spec) return { changed:false, moved:false, item };
        const movedPx = Math.hypot(
            Number(event.clientX || 0) - Number(dragState.startClientX || 0),
            Number(event.clientY || 0) - Number(dragState.startClientY || 0)
        );
        if (movedPx < Number(opts.thresholdPx || 3) && !dragState.moved) return { changed:false, moved:false, item };
        dragState.moved = true;
        const raw = gridPointFromEvent(event, opts.grid, opts.cellPx);
        const nx = Math.round(raw.x - Number(dragState.offsetX || 0));
        const ny = Math.round(raw.y - Number(dragState.offsetY || 0));
        const snapFn = typeof opts.getSnappedPlacement === 'function' ? opts.getSnappedPlacement : null;
        const boundsFn = typeof opts.inBounds === 'function' ? opts.inBounds : null;
        const place = snapFn
            ? snapFn(item.type, nx, ny, item.o || 'n', item.id, spec.kind === 'node' ? item.r : null)
            : { x:nx, y:ny, o:item.o || 'n', r:item.r };
        if (boundsFn && !boundsFn(item.type, place.x, place.y, place.o || item.o || 'n')) {
            return { changed:false, moved:true, blocked:true, item, place };
        }
        item.x = place.x;
        item.y = place.y;
        if (spec.kind === 'straight') item.o = place.o || item.o || 'h';
        if (spec.kind === 'node') item.r = Number(place.r ?? item.r ?? 0);
        return { changed:true, moved:true, item, place };
    }

    function markDragging(grid, itemId) {
        if (!grid || !itemId || typeof grid.querySelector !== 'function') return null;
        const el = grid.querySelector(`[data-item-id="${String(itemId)}"]`);
        if (el && el.classList) el.classList.add('dragging');
        return el || null;
    }

    function didDragMove(dragState) {
        return !!(dragState && dragState.moved);
    }

    function attachItemDragListeners(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const target = opts.target || (typeof global !== 'undefined' ? global : null);
        if (!target || typeof target.addEventListener !== 'function') return false;
        if (typeof opts.onMove !== 'function' || typeof opts.onFinish !== 'function') return false;
        const moveOptions = opts.moveOptions || { passive:false };
        const finishOptions = opts.finishOptions || { passive:false, once:true };
        target.addEventListener('pointermove', opts.onMove, moveOptions);
        target.addEventListener('pointerup', opts.onFinish, finishOptions);
        target.addEventListener('pointercancel', opts.onFinish, finishOptions);
        return true;
    }

    function detachItemDragListeners(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const target = opts.target || (typeof global !== 'undefined' ? global : null);
        if (!target || typeof target.removeEventListener !== 'function') return false;
        if (typeof opts.onMove === 'function') target.removeEventListener('pointermove', opts.onMove);
        if (typeof opts.onFinish === 'function') {
            target.removeEventListener('pointerup', opts.onFinish);
            target.removeEventListener('pointercancel', opts.onFinish);
        }
        return true;
    }


    function addAndSelectItem(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const type = opts.type;
        const specs = opts.specs || DEFAULT_SPECS;
        const spec = getSpec(specs, type);
        if (!spec || type === 'pin' || type === 'outrigger') {
            return { ok:false, reason:'unknown-type', items:Array.isArray(opts.items) ? opts.items : [], selectedItemId:opts.selectedItemId || null };
        }
        const items = Array.isArray(opts.items) ? opts.items : [];
        const snapFn = typeof opts.getSnappedPlacement === 'function' ? opts.getSnappedPlacement : null;
        const boundsFn = typeof opts.inBounds === 'function' ? opts.inBounds : null;
        const place = snapFn
            ? snapFn(type, Number(opts.x || 0), Number(opts.y || 0), opts.orientation || 'h')
            : { x:Number(opts.x || 0), y:Number(opts.y || 0), o:opts.orientation || 'h', r:0 };
        const orientation = spec.kind === 'straight' ? (place.o === 'v' ? 'v' : 'h') : 'n';
        if (boundsFn && !boundsFn(type, place.x, place.y, orientation)) {
            return { ok:false, reason:'out-of-bounds', place, items, selectedItemId:opts.selectedItemId || null };
        }
        const makeId = typeof opts.makeId === 'function' ? opts.makeId : (() => `b${Date.now()}${Math.floor(Math.random()*10000)}`);
        const item = createItem(makeId(), type, place.x, place.y, orientation, place.r || 0, specs);
        if (!item) return { ok:false, reason:'create-failed', place, items, selectedItemId:opts.selectedItemId || null };
        items.push(item);
        return { ok:true, item, items, selectedItemId:item.id, place };
    }

    function deleteSelectedAction(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const items = Array.isArray(opts.items) ? opts.items : [];
        const selectedItemId = opts.selectedItemId || null;
        if (!selectedItemId) return { ok:false, reason:'not-selected', items, selectedItemId:null };
        const res = removeItemById(items, selectedItemId, selectedItemId);
        if (!res.removed) return { ok:false, reason:'not-selected', items:res.items || items, selectedItemId:res.selectedItemId || null };
        return { ok:true, reason:'deleted', removedItem:res.removedItem, items:res.items || items, selectedItemId:res.selectedItemId || null };
    }

    function rotateSelectedAction(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const res = rotateSelectedItem(
            Array.isArray(opts.items) ? opts.items : [],
            opts.selectedItemId || null,
            opts.specs || DEFAULT_SPECS,
            typeof opts.canPlace === 'function' ? opts.canPlace : null
        );
        return res.ok ? Object.assign({ reason:'rotated' }, res) : res;
    }

    function selectItemAction(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const id = selectItemId(Array.isArray(opts.items) ? opts.items : [], opts.id);
        return { ok:!!id, selectedItemId:id, reason:id ? 'selected' : 'not-found' };
    }

    function removeAtAction(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const res = removeAt(
            Array.isArray(opts.items) ? opts.items : [],
            opts.selectedItemId || null,
            opts.x,
            opts.y,
            opts.specs || DEFAULT_SPECS,
            opts.cellMeters
        );
        return res.removed ? Object.assign({ ok:true, reason:'deleted' }, res) : Object.assign({ ok:false, reason:'not-found' }, res);
    }

    function handleCellClickAction(options) {
        const opts = options && typeof options === 'object' ? options : {};
        if (opts.mode === 'remove') return removeAtAction(opts);
        return addAndSelectItem(opts);
    }

    function defaultMoney(value) {
        return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
    }

    function defaultMetric(value, digits) {
        const d = typeof digits === 'number' ? digits : 1;
        return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits:d });
    }

    function renderSummaryHtml(result, state, helpers) {
        const res = result || {};
        const st = state || {};
        const opts = helpers || {};
        const money = typeof opts.money === 'function' ? opts.money : defaultMoney;
        const metric = typeof opts.metric === 'function' ? opts.metric : defaultMetric;
        const esc = typeof opts.escapeHtml === 'function' ? opts.escapeHtml : escapeHtml;
        const effective = res.loadCheck && res.loadCheck.spanInfo ? metric(res.loadCheck.spanInfo.maxEffective) + ' м' : '—';
        const baseCount = Number(res.counts && res.counts.base || 0);
        const rows = [
            ['Прямые фермы', `${metric(res.totalMeters)} м`, 'метраж'],
            ['Макс. габарит с U-блоками', effective, 'расчётный'],
            ['U003 угол 90°', `${Number(res.angles || 0)} шт`, 'узлы'],
            ['U022 куб 6 направл.', `${Number(res.cubes || 0)} шт`, 'узлы'],
            ['U017 / U016 Т+крест', `${Number(res.tNodes || 0) + Number(res.crosses || 0)} шт`, 'узлы'],
            ['Прочие угловые U-блоки', `${Number(res.angledNodes || 0) + Number(res.multiNodes || 0)} шт`, 'узлы'],
            ['Всего узлов МДМТ', `${Number(res.nodePieces || 0)} шт`, 'узлы'],
            ['Базы / блины', `${baseCount} шт · ${metric(baseCount * Number(st.baseWeight || 0))} кг`, 'опоры'],
            ['Крепление баз C3-83 / пальцы / шплинты', `${Number(res.baseHalfConnectors || 0)} / ${Number(res.baseC2Pins || 0)} / ${Number(res.baseCotters || 0)} шт`, 'крепёж'],
            ['Торцевые соединения CQ2', `${Number(res.connectorKits || 0)} компл.`, 'крепёж'],
            ['CQ2: C2-88 / пальцы / шплинты', `${Number(res.cq2Cones || 0)} / ${Number(res.cq2Pins || 0)} / ${Number(res.cq2Cotters || 0)} шт`, 'крепёж'],
            ['Крепёж всего: C2-88 / C3-83 / пальцы / шплинты', `${Number(res.cq2Cones || 0)} / ${Number(res.baseHalfConnectors || 0)} / ${Number(res.totalC2Pins || 0)} / ${Number(res.totalCotters || 0)} шт`, 'крепёж'],
            ['Вес комплекта', `${metric(res.weight)} кг`, 'масса'],
            ['Прокат блоков', money(res.rental), 'стоимость'],
            ['Монтаж', money(res.install), 'стоимость'],
            ['Транспорт', money(res.transport), 'стоимость']
        ];
        return `<table class="block-calc-table block-calc-summary" aria-label="Итог расчёта блочной комплектации">
                <caption>Итог комплектации</caption>
                <thead><tr><th>Позиция</th><th>Значение</th><th>Группа</th></tr></thead>
                <tbody>${rows.map(row => `<tr><td>${esc(row[0])}</td><td>${row[1]}</td><td class="block-muted-cell">${esc(row[2])}</td></tr>`).join('')}
                <tr class="block-total-row"><td>ИТОГО</td><td>${money(res.total)}</td><td>к оплате</td></tr></tbody>
            </table>`;
    }

    function renderBomRowsHtml(result, specs, state, helpers) {
        const res = result || {};
        const source = specs && typeof specs === 'object' ? specs : DEFAULT_SPECS;
        const st = state || {};
        const opts = helpers || {};
        const money = typeof opts.money === 'function' ? opts.money : defaultMoney;
        const metric = typeof opts.metric === 'function' ? opts.metric : defaultMetric;
        const esc = typeof opts.escapeHtml === 'function' ? opts.escapeHtml : escapeHtml;
        const codeFn = typeof opts.codeFn === 'function' ? opts.codeFn : null;
        const rows = [];
        buildBomRows(res, source, st, codeFn).forEach(row => {
            if (row.id === 'c288') {
                rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">торцевые стыки: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
            } else if (row.id === 'c383') {
                rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">крепление баз / блинов: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
            } else if (row.id === 'c267') {
                rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">крепёж: ${esc(row.note || '')} · 0.04 кг/шт</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>—</td></tr>`);
            } else if (row.id === 'cotter') {
                rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">крепёж: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${row.weight ? metric(row.weight) + ' кг' : '—'}</td><td>—</td></tr>`);
            } else {
                const label = row.code ? `<b>${esc(row.code)}</b><br><span style="color:var(--muted)">${esc(row.name)}</span>` : esc(row.name);
                rows.push(`<tr><td>${label}</td><td>${metric(row.count,0)} шт</td><td>${row.meters ? metric(row.meters) + ' м' : '—'}</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
            }
        });
        if (!rows.length) rows.push('<tr><td colspan="5" style="text-align:center;color:var(--muted);">Пока нет блоков. Выберите элемент и поставьте его на сетку.</td></tr>');
        return rows.join('');
    }

    function renderCountLabelText(result, items, loadCheck, helpers) {
        const res = result || {};
        const list = Array.isArray(items) ? items : [];
        const load = loadCheck || res.loadCheck || {};
        const metric = helpers && typeof helpers.metric === 'function' ? helpers.metric : defaultMetric;
        const maxEffective = load && load.spanInfo ? Number(load.spanInfo.maxEffective || 0) : 0;
        return `Блоков: ${list.length} · Прямые: ${metric(res.totalMeters)} м · габарит с U: ${metric(maxEffective)} м · CQ2: ${Number(res.connectorKits || 0)} компл.`;
    }


    function normalizeDisplaySettings(state) {
        const next = Object.assign({}, state || {});
        if (!['clean', 'grid'].includes(next.bgMode)) next.bgMode = 'clean';
        if (!['thin', 'medium', 'dense'].includes(next.gridDensity)) next.gridDensity = 'medium';
        return next;
    }

    function densityLabel(value) {
        if (value === 'thin') return 'тонкая';
        if (value === 'dense') return 'плотная';
        return 'средняя';
    }

    function displaySummaryText(state) {
        const normalized = normalizeDisplaySettings(state);
        return normalized.bgMode === 'grid'
            ? `сетка · ${densityLabel(normalized.gridDensity)}`
            : 'чистый фон';
    }

    function setDisplayGridEnabled(state, enabled) {
        const next = normalizeDisplaySettings(state);
        next.bgMode = enabled ? 'grid' : 'clean';
        return next;
    }

    function setDisplayDensity(state, density) {
        const next = normalizeDisplaySettings(state);
        next.bgMode = 'grid';
        next.gridDensity = ['thin', 'medium', 'dense'].includes(density) ? density : 'medium';
        return next;
    }

    function normalizeGridSettings(state) {
        const next = Object.assign({}, state || {});
        next.cols = Math.max(6, Math.min(60, Math.round(Number(next.cols || 24))));
        next.rows = Math.max(6, Math.min(40, Math.round(Number(next.rows || 14))));
        next.cellMeters = normalizeCellMeters(next.cellMeters);
        next.zoom = Math.max(60, Math.min(180, Math.round(Number(next.zoom || 100))));
        next.orientation = next.orientation === 'v' ? 'v' : 'h';
        next.mode = 'place';
        next.templateWidthM = Math.max(1, Number(next.templateWidthM || 6));
        next.templateHeightM = Math.max(1, Number(next.templateHeightM || 3));
        return normalizeDisplaySettings(next);
    }

    function normalizeDraftState(saved, current, defaults, specs, legacyMap) {
        const base = Object.assign({}, defaults || {}, current || {}, saved || {});
        base.items = normalizeItems(base.items || [], specs, legacyMap);
        base.selected = normalizeSelectedType(base.selected, specs, legacyMap, 'truss3');
        base.selectedItemId = selectedItemExists(base.items, base.selectedItemId) ? base.selectedItemId : null;
        return normalizeGridSettings(base);
    }

    function loadDraftState(storageKey, current, defaults, specs, legacyMap, storage) {
        const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        let saved = {};
        if (store && storageKey) {
            try { saved = JSON.parse(store.getItem(storageKey) || '{}') || {}; } catch (err) { saved = {}; }
        }
        return normalizeDraftState(saved, current, defaults, specs, legacyMap);
    }

    function saveDraftState(storageKey, state, storage) {
        const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!store || !storageKey) return false;
        try {
            store.setItem(storageKey, JSON.stringify(state || {}));
            return true;
        } catch (err) {
            return false;
        }
    }

    function sanitizeFilePart(value, fallback) {
        const raw = String(value || '').trim() || String(fallback || 'block_truss');
        return raw.replace(/[\\/:*?"<>|]/g, '_');
    }

    function createExportPayload(options) {
        const opts = options || {};
        return {
            type: 'feg-stage-pro-block-truss-export',
            version: opts.version || '',
            exportedAt: opts.exportedAt || new Date().toISOString(),
            state: opts.state || {},
            result: opts.result || null
        };
    }


    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    }


    global.FEGModules = global.FEGModules || {};
    global.FEGModules.TrussBlockConstructor = {
        DEFAULT_SPECS,
        STRAIGHT_ORDER,
        getDefaultSpecs,
        getLegacyTypeMap,
        getLibraryGroupDefs,
        getLibraryGroups,
        getSpec,
        isKnownType,
        isVisibleType,
        normalizeRotation,
        normalizeItem,
        normalizeItems,
        normalizeSelectedType,
        selectedItemExists,
        getSelectedItem,
        selectItemId,
        createItem,
        removeItemById,
        removeAt,
        rotateSelectedItem,
        normalizeCellMeters,
        cellCount,
        pointKey,
        itemCellSpan,
        itemBounds,
        containsCell,
        straightPortPoints,
        itemPoints,
        connectionMap,
        findNearestEndpoint,
        getSnappedPlacement,
        inBounds,
        schemeBounds,
        C2_67_WEIGHT_KG,
        C2_COTTER_WEIGHT_KG,
        nodeWeight,
        priceAndWeightFor,
        calculateItemCounts,
        summarizeBom,
        buildBomRows,
        renderStraightSvg,
        nodePorts,
        nodeTubeSvg,
        nodeBasePortOffsets,
        rotatePortOffset,
        nodePortPoints,
        nodeStyleSvg,
        renderAngledNode,
        renderNodeSvg,
        baseSnapOffsets,
        renderBaseSvg,
        renderLibraryHtml,
        renderItemClass,
        itemStyleMap,
        applyStyleMap,
        renderItemMarkup,
        createFieldItemElement,
        renderFieldItems,
        gridPointFromEvent,
        createItemDragState,
        applyItemDragMove,
        markDragging,
        didDragMove,
        attachItemDragListeners,
        detachItemDragListeners,
        addAndSelectItem,
        deleteSelectedAction,
        rotateSelectedAction,
        selectItemAction,
        removeAtAction,
        handleCellClickAction,
        renderSummaryHtml,
        renderBomRowsHtml,
        renderCountLabelText,
        normalizeDisplaySettings,
        densityLabel,
        displaySummaryText,
        setDisplayGridEnabled,
        setDisplayDensity,
        normalizeGridSettings,
        normalizeDraftState,
        loadDraftState,
        saveDraftState,
        sanitizeFilePart,
        createExportPayload,
        escapeHtml
    };
})(window);
