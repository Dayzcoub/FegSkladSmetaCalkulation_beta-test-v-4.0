// FEG Stage PRO v3.6.3 — PriceWeightSettings module
// Responsibility: stage rental/install pricing, stage height, stage item weights and stage price/weight modal helpers.
// Classic-compatible module: attaches API to window.FEGModules.PriceWeightSettings.
(function (global) {
    'use strict';

    const STORAGE_KEYS = {
        weights: 'itemWeights',
        stageHeight: 'stageHeightM',
        pricing: 'pricingSettings'
    };

    const DEFAULT_STAGE_HEIGHT_M = 0.6;
    const DEFAULT_PRICING = {
        priceModule: 850,
        installCost: 3500
    };
    const DEFAULT_WEIGHTS = {
        sheet: 18,
        column_low: 0.6,
        column_middle: 2.6,
        column_high: 4.8,
        frame_low: 3.5,
        frame_high: 5,
        stud: 1.5
    };

    const WEIGHT_INPUT_MAP = {
        weightSheet: 'sheet',
        weightColumnLow: 'column_low',
        weightColumnMiddle: 'column_middle',
        weightColumnHigh: 'column_high',
        weightFrameLow: 'frame_low',
        weightFrameHigh: 'frame_high',
        weightStud: 'stud'
    };

    function storage() {
        return global.localStorage;
    }

    function nonNegativeNumber(value, fallback) {
        const parsed = Number(value);
        return isNaN(parsed) || parsed < 0 ? fallback : parsed;
    }

    function normalizeWeights(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const next = { ...DEFAULT_WEIGHTS };
        Object.keys(DEFAULT_WEIGHTS).forEach((key) => {
            next[key] = nonNegativeNumber(source[key], DEFAULT_WEIGHTS[key]);
        });
        return next;
    }

    function loadWeights() {
        try {
            const parsed = JSON.parse(storage().getItem(STORAGE_KEYS.weights) || '{}');
            return normalizeWeights(parsed);
        } catch (err) {
            return { ...DEFAULT_WEIGHTS };
        }
    }

    function saveWeights(weights) {
        const normalized = normalizeWeights(weights || DEFAULT_WEIGHTS);
        try { storage().setItem(STORAGE_KEYS.weights, JSON.stringify(normalized)); } catch (err) {}
        return normalized;
    }

    function normalizeStageHeight(value) {
        return nonNegativeNumber(value, DEFAULT_STAGE_HEIGHT_M);
    }

    function loadStageHeight() {
        try {
            return normalizeStageHeight(storage().getItem(STORAGE_KEYS.stageHeight));
        } catch (err) {
            return DEFAULT_STAGE_HEIGHT_M;
        }
    }

    function saveStageHeight(value) {
        const normalized = normalizeStageHeight(value);
        try { storage().setItem(STORAGE_KEYS.stageHeight, String(normalized)); } catch (err) {}
        return normalized;
    }

    function getStageHeightValue(stageHeightM) {
        const value = Number(stageHeightM);
        return isNaN(value) || value < 0 ? 0 : value;
    }

    function normalizePricingSettings(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            priceModule: nonNegativeNumber(source.priceModule, DEFAULT_PRICING.priceModule),
            installCost: nonNegativeNumber(source.installCost, DEFAULT_PRICING.installCost)
        };
    }

    function loadPricingSettings() {
        try {
            const parsed = JSON.parse(storage().getItem(STORAGE_KEYS.pricing) || 'null');
            return normalizePricingSettings(parsed || DEFAULT_PRICING);
        } catch (err) {
            return { ...DEFAULT_PRICING };
        }
    }

    function savePricingSettings(settings) {
        const normalized = normalizePricingSettings(settings || DEFAULT_PRICING);
        try { storage().setItem(STORAGE_KEYS.pricing, JSON.stringify(normalized)); } catch (err) {}
        return normalized;
    }

    function getWeightValue(weights, key) {
        const normalized = weights && typeof weights === 'object' ? weights : DEFAULT_WEIGHTS;
        const value = Number(normalized[key]);
        return isNaN(value) || value < 0 ? 0 : value;
    }

    function calculateWeightBreakdown(weights, geometry, columnType, frameType, studs) {
        const safeGeometry = geometry && typeof geometry === 'object' ? geometry : {};
        const sheetUnit = getWeightValue(weights, 'sheet');
        const columnUnit = getWeightValue(weights, `column_${columnType || 'middle'}`);
        const frameUnit = getWeightValue(weights, `frame_${frameType || 'low'}`);
        const studUnit = getWeightValue(weights, 'stud');
        const sheetTotal = Number(safeGeometry.sheets || 0) * sheetUnit;
        const columnTotal = Number(safeGeometry.columns || 0) * columnUnit;
        const frameTotal = Number(safeGeometry.frames || 0) * frameUnit;
        const studTotal = Number(studs || 0) * studUnit;
        return {
            sheetUnit, columnUnit, frameUnit, studUnit,
            sheetTotal, columnTotal, frameTotal, studTotal,
            total: sheetTotal + columnTotal + frameTotal + studTotal
        };
    }

    function syncPricingInputs(inputs, pricingSettings) {
        const normalized = normalizePricingSettings(pricingSettings || DEFAULT_PRICING);
        if (inputs && inputs.priceModule) inputs.priceModule.value = normalized.priceModule;
        if (inputs && inputs.installCost) inputs.installCost.value = normalized.installCost;
    }

    function readPricingFromInputs(inputs, currentSettings) {
        const current = normalizePricingSettings(currentSettings || DEFAULT_PRICING);
        return normalizePricingSettings({
            priceModule: inputs && inputs.priceModule ? Number(inputs.priceModule.value) : current.priceModule,
            installCost: inputs && inputs.installCost ? Number(inputs.installCost.value) : current.installCost
        });
    }

    function syncWeightInputs(inputs, weights, stageHeightM, pricingInputs, pricingSettings) {
        const normalizedWeights = normalizeWeights(weights || DEFAULT_WEIGHTS);
        const sourceInputs = inputs || {};
        Object.entries(WEIGHT_INPUT_MAP).forEach(([id, key]) => {
            const input = sourceInputs[id];
            if (input) input.value = getWeightValue(normalizedWeights, key);
        });
        if (sourceInputs.stageHeight) sourceInputs.stageHeight.value = Math.round(getStageHeightValue(stageHeightM) * 100);
        syncPricingInputs(pricingInputs, pricingSettings);
    }

    function readStageHeightFromInput(input, currentStageHeightM) {
        const valueCm = input ? Number(input.value) : Number(currentStageHeightM) * 100;
        return isNaN(valueCm) || valueCm < 0 ? DEFAULT_STAGE_HEIGHT_M : valueCm / 100;
    }

    function readWeightsFromInputs(inputs) {
        const sourceInputs = inputs || {};
        const next = { ...DEFAULT_WEIGHTS };
        Object.entries(WEIGHT_INPUT_MAP).forEach(([id, key]) => {
            const input = sourceInputs[id];
            const value = input ? Number(input.value) : DEFAULT_WEIGHTS[key];
            next[key] = isNaN(value) || value < 0 ? 0 : value;
        });
        return next;
    }

    function saveAll(settings) {
        const source = settings && typeof settings === 'object' ? settings : {};
        return {
            weights: saveWeights(source.weights),
            stageHeightM: saveStageHeight(source.stageHeightM),
            pricing: savePricingSettings(source.pricing)
        };
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
        MODULE_NAME: 'PriceWeightSettings',
        MODULE_STATUS: 'runtime-extracted',
        STORAGE_KEYS,
        DEFAULT_STAGE_HEIGHT_M,
        DEFAULT_PRICING,
        DEFAULT_WEIGHTS,
        WEIGHT_INPUT_MAP,
        normalizeWeights,
        loadWeights,
        saveWeights,
        normalizeStageHeight,
        loadStageHeight,
        saveStageHeight,
        getStageHeightValue,
        normalizePricingSettings,
        loadPricingSettings,
        savePricingSettings,
        getWeightValue,
        calculateWeightBreakdown,
        syncPricingInputs,
        readPricingFromInputs,
        syncWeightInputs,
        readStageHeightFromInput,
        readWeightsFromInputs,
        saveAll,
        openModal,
        closeModal
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.PriceWeightSettings = api;
})(typeof window !== 'undefined' ? window : globalThis);
