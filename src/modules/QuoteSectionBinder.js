(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SECTION_BINDER_VERSION = '1.2.1-v4-led-freeform-constructor';

  function model() {
    if (!ROOT.QuoteModel) throw new Error('QuoteModel is not available.');
    return ROOT.QuoteModel;
  }

  function structureEngine() {
    if (!ROOT.V4StructureConfigurator) throw new Error('V4StructureConfigurator is not available.');
    return ROOT.V4StructureConfigurator;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clampNonNegative(value, fallback) {
    return Math.max(0, toNumber(value, fallback));
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (_) { return value; }
  }

  function createPlaceholderSection(key, overrides) {
    const labels = {
      stage: 'Сцена',
      truss: 'Фермы',
      led: 'LED экран',
      equipment: 'Оборудование и услуги'
    };
    return Object.assign({
      type: key,
      binderVersion: SECTION_BINDER_VERSION,
      status: 'placeholder',
      title: labels[key] || key,
      summary: 'Секция выбрана в составе сметы, конфигуратор будет подключён следующим шагом.',
      rental: 0,
      weightKg: 0,
      powerW: 0,
      bomRows: [],
      updatedAt: nowIso()
    }, overrides || {});
  }

  function shouldHaveEquipment(scope) {
    const src = scope || {};
    return Boolean(src.sound || src.light || src.backline || src.services);
  }

  function ensureSectionsForScope(draft, options) {
    const opts = options || {};
    const q = model().createQuoteDraft(draft || {});
    const scope = model().normalizeScope(q.scope || {});
    const sections = Object.assign({}, q.sections || {});

    ['stage', 'truss', 'led'].forEach(key => {
      if (scope[key]) {
        if (!sections[key]) sections[key] = createPlaceholderSection(key);
      } else if (opts.pruneDisabled !== false) {
        sections[key] = null;
      }
    });

    if (shouldHaveEquipment(scope)) {
      if (!sections.equipment) {
        sections.equipment = createPlaceholderSection('equipment', { items: [], selectedScopes: getEquipmentScopeList(scope) });
      } else {
        sections.equipment = Object.assign({}, sections.equipment, { selectedScopes: getEquipmentScopeList(scope) });
      }
    } else if (opts.pruneDisabled !== false) {
      sections.equipment = { items: [], notes: '' };
    }

    return model().mergeQuotePatch(q, { sections });
  }

  function getEquipmentScopeList(scope) {
    return ['sound', 'light', 'backline', 'services'].filter(key => Boolean(scope && scope[key]));
  }

  function normalizeLedInput(input) {
    if (ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.normalizeLedInput) {
      const normalized = ROOT.V4LedBomBridge.normalizeLedInput(input || {});
      if (input && (input.subrentEnabled === true || input.subrentEnabled === 'true' || input.subrent)) {
        normalized.subrentEnabled = input.subrentEnabled === true || input.subrentEnabled === 'true';
        normalized.subrent = clone(input.subrent || {});
      }
      return normalized;
    }
    const src = input || {};
    const calc = ROOT.LedCalculator;
    const formatId = toText(src.format || src.formatId) || '640x640';
    const pitchId = toText(src.pitch || src.pitchId) || 'p4';
    const format = calc && calc.getCabinetFormat ? calc.getCabinetFormat(formatId) : { id: '640x640', widthM: 0.64, heightM: 0.64, defaultWeightKg: 14, defaultPowerW: 320, defaultStartupPowerW: 600 };
    const legType = calc && calc.getLegType ? calc.getLegType(src.legType || src.legTypeId || '3m') : { id: '3m' };
    const mount = calc && calc.getMountFlags
      ? calc.getMountFlags(src)
      : { standing: src.mountStanding !== false && src.standing !== false, hanging: src.mountHanging === true || src.mountHanging === 'true' || src.hanging === true || src.hanging === 'true', mode: '' };
    return {
      widthM: clampNonNegative(src.widthM, 4),
      heightM: clampNonNegative(src.heightM, 2.56),
      format: format.id || formatId,
      pitch: pitchId,
      cabinetWeightKg: clampNonNegative(src.cabinetWeightKg, format.defaultWeightKg || 0),
      cabinetPowerW: clampNonNegative(src.cabinetPowerW, format.defaultPowerW || 0),
      cabinetStartupPowerW: clampNonNegative(src.cabinetStartupPowerW, format.defaultStartupPowerW || 0),
      legType: legType.id || '3m',
      legCount: Math.max(0, Math.round(clampNonNegative(src.legCount, 0))),
      mountMode: toText(src.mountMode || src.mount, mount.mode),
      mountStanding: mount.standing,
      mountHanging: mount.hanging,
      explicitEmptyLayout: src.explicitEmptyLayout === true || src.explicitEmptyLayout === 'true',
      layoutMode: Array.isArray(src.layoutBlocks) && src.layoutBlocks.length || src.explicitEmptyLayout === true || src.explicitEmptyLayout === 'true' ? 'freeform' : toText(src.layoutMode, ''),
      layoutBlocks: Array.isArray(src.layoutBlocks) ? clone(src.layoutBlocks) : [],
      subrentEnabled: src.subrentEnabled === true || src.subrentEnabled === 'true',
      subrent: clone(src.subrent || {})
    };
  }

  function buildLedSection(input, overrides) {
    if (ROOT.V4LedBomBridge && ROOT.V4LedBomBridge.buildLedSection) {
      return ROOT.V4LedBomBridge.buildLedSection(input || {}, Object.assign({ binderVersion: SECTION_BINDER_VERSION, source: 'QuoteSectionBinder.v4-led', catalogMode: 'quote', sourceMode: 'quote' }, overrides || {}));
    }
    if (!ROOT.LedCalculator) throw new Error('LedCalculator is not available.');
    const ledInput = normalizeLedInput(input || {});
    const result = ROOT.LedCalculator.calculateLedScreen(ledInput);
    const summary = ROOT.LedCalculator.summarizeLed(result);
    const rows = ROOT.LedCalculator.buildLedBomRows(result);
    return Object.assign({
      type: 'led',
      sectionKey: 'led',
      binderVersion: SECTION_BINDER_VERSION,
      status: 'configured',
      source: 'LedCalculator',
      title: summary.title,
      summary: `${summary.cabinets} · ${summary.actualSize} · ${summary.weightKg.toFixed(1)} кг · ${summary.powerKw.toFixed(2)} кВт · пуск ${summary.startupPowerKw.toFixed(2)} кВт`,
      input: ledInput,
      result: {
        formatId: result.format.id,
        formatName: result.format.name,
        pitchId: result.pitch.id,
        pitchName: result.pitch.name,
        desiredWidthM: result.desiredWidthM,
        desiredHeightM: result.desiredHeightM,
        actualWidthM: result.actualWidthM,
        actualHeightM: result.actualHeightM,
        areaM2: result.areaM2,
        requestedAreaM2: result.requestedAreaM2,
        columns: result.columns,
        rows: result.rows,
        cabinetCount: result.cabinetCount,
        cabinetPixelsX: result.cabinetPixelsX,
        cabinetPixelsY: result.cabinetPixelsY,
        totalPixelsX: result.totalPixelsX,
        totalPixelsY: result.totalPixelsY,
        totalPixels: result.totalPixels,
        legTypeId: result.legType.id,
        legTypeName: result.legType.name,
        mountMode: result.mountMode,
        mountStanding: result.mountStanding,
        mountHanging: result.mountHanging,
        hangingBarCount: result.hangingBarCount || 0,
        spansetCount: result.spansetCount || 0,
        shackleCount: result.shackleCount || 0,
        aspectRatioLabel: result.aspectRatioLabel || '',
        legCount: result.legCount,
        standingBrackets: result.standingBrackets || 0,
        hangingBrackets: result.hangingBrackets || 0,
        hangingBarBrackets: result.hangingBarBrackets || 0,
        hangingCabinetBrackets: result.hangingCabinetBrackets || 0,
        brackets: result.brackets,
        standingM8x60Bolts: result.standingM8x60Bolts || result.m8Bolts || 0,
        m8Bolts: result.m8Bolts,
        m8x20Bolts: result.m8x20Bolts || 0,
        hangingRiggingByConstruction: clone(result.hangingRiggingByConstruction || []),
        powerLinks: result.powerLinks,
        rj45Links: result.rj45Links,
        powerconSchukoCables: result.powerconSchukoCables,
        powerconSchukoWattsPerCable: result.powerconSchukoWattsPerCable || result.powerconSchukoPerCable || 3400,
        powerconSchukoByConstruction: clone(result.powerconSchukoByConstruction || []),
        totalWeightKg: result.totalWeightKg,
        totalPowerW: result.totalPowerW,
        totalPowerKw: result.totalPowerKw,
        totalStartupPowerW: result.totalStartupPowerW,
        totalStartupPowerKw: result.totalStartupPowerKw
      },
      bomRows: rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        qty: row.qty,
        unit: row.unit,
        weightKg: row.weightKg,
        powerW: row.powerW,
        startupPowerW: row.startupPowerW || 0,
        sourceType: 'own',
        sourceSystem: 'equipment_database_system_part',
        ledPart: row.id || row.code,
        note: row.note
      })),
      rental: clampNonNegative(overrides && overrides.rental, 0),
      constructions: clone(result.constructions || []),
      weightKg: result.totalWeightKg,
      powerW: result.totalPowerW,
      startupPowerW: result.totalStartupPowerW,
      readyFor: { sharedBom: true, quoteItems: true, warehousePickList: true, documents: true, bomContract: true, legacyV3Touched: false },
      updatedAt: nowIso()
    }, overrides || {});
  }

  function buildEquipmentSection(input, overrides) {
    if (!ROOT.QuoteEquipmentPicker) throw new Error('QuoteEquipmentPicker is not available.');
    const section = ROOT.QuoteEquipmentPicker.buildEquipmentSection(input || {}, { scope: input && input.scope || {}, inventoryItems: input && input.inventoryItems });
    return Object.assign(section, overrides || {});
  }

  function bindEquipmentSection(draft, input, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    const scope = q.scope || {};
    const normalizedInput = Object.assign({}, input || {}, { scope });
    return bindSection(q, 'equipment', buildEquipmentSection(normalizedInput, overrides || {}));
  }

  function getEquipmentInputFromQuote(draft) {
    const q = model().createQuoteDraft(draft || {});
    const section = q.sections && q.sections.equipment ? q.sections.equipment : null;
    if (ROOT.QuoteEquipmentPicker && ROOT.QuoteEquipmentPicker.getInputFromSection) {
      return ROOT.QuoteEquipmentPicker.getInputFromSection(section, q.scope || {});
    }
    return { scope: q.scope || {}, items: [], manualItems: [] };
  }



  function buildStageSection(source, overrides) {
    if (ROOT.V4StructureConfigurator && ROOT.V4StructureConfigurator.buildStageSection) {
      return ROOT.V4StructureConfigurator.buildStageSection(source || {}, Object.assign({ binderVersion: SECTION_BINDER_VERSION, source: 'QuoteSectionBinder.v4-stage', catalogMode: 'quote', sourceMode: 'quote' }, overrides || {}));
    }
    return structureEngine().buildStageSection(source || {}, Object.assign({ binderVersion: SECTION_BINDER_VERSION, source: 'QuoteSectionBinder.v4-stage-required', catalogMode: 'quote', sourceMode: 'quote' }, overrides || {}));
  }

  function buildTrussSection(source, overrides) {
    if (ROOT.V4StructureConfigurator && ROOT.V4StructureConfigurator.buildTrussSection) {
      return ROOT.V4StructureConfigurator.buildTrussSection(source || {}, Object.assign({ binderVersion: SECTION_BINDER_VERSION, source: 'QuoteSectionBinder.v4-truss', catalogMode: 'quote', sourceMode: 'quote' }, overrides || {}));
    }
    return structureEngine().buildTrussSection(source || {}, Object.assign({ binderVersion: SECTION_BINDER_VERSION, source: 'QuoteSectionBinder.v4-truss-required', catalogMode: 'quote', sourceMode: 'quote' }, overrides || {}));
  }

  function buildStageSectionFromV4(source, overrides) {
    return buildStageSection(source || {}, overrides || {});
  }

  function buildTrussSectionFromV4(source, overrides) {
    return buildTrussSection(source || {}, overrides || {});
  }

  function bindSection(draft, key, section) {
    const q = model().createQuoteDraft(draft || {});
    const sections = Object.assign({}, q.sections || {});
    sections[key] = section ? clone(section) : null;
    return model().mergeQuotePatch(q, { sections });
  }

  function bindLedSection(draft, input, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    return bindSection(q, 'led', buildLedSection(input || {}, overrides || {}));
  }


  function bindStageSection(draft, source, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    return bindSection(q, 'stage', buildStageSection(source || {}, overrides || {}));
  }

  function bindTrussSection(draft, source, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    return bindSection(q, 'truss', buildTrussSection(source || {}, overrides || {}));
  }

  function bindStageFromV4(draft, source, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    return bindSection(q, 'stage', buildStageSectionFromV4(source || {}, overrides || {}));
  }

  function bindTrussFromV4(draft, source, overrides) {
    const q = ensureSectionsForScope(draft || {}, { pruneDisabled: false });
    return bindSection(q, 'truss', buildTrussSectionFromV4(source || {}, overrides || {}));
  }

  function getStageInputFromQuote(draft) {
    const q = model().createQuoteDraft(draft || {});
    const current = q.sections && q.sections.stage && q.sections.stage.input ? q.sections.stage.input : null;
    return current || { explicitEmpty: true, widthModules: 4, depthModules: 3 };
  }

  function getTrussInputFromQuote(draft) {
    const q = model().createQuoteDraft(draft || {});
    const current = q.sections && q.sections.truss && q.sections.truss.input ? q.sections.truss.input : null;
    return current || { lengthM: 6, baseCount: 2, connectionCount: 0 };
  }

  function getLedInputFromQuote(draft) {
    const q = model().createQuoteDraft(draft || {});
    const current = q.sections && q.sections.led && q.sections.led.input ? q.sections.led.input : null;
    return normalizeLedInput(current || { widthM: 4, heightM: 2.56, format: '640x640', pitch: 'p4', legType: '3m', legCount: 0 });
  }

  function isSectionConfigured(section) {
    return Boolean(section && section.status === 'configured');
  }

  function getSectionState(section) {
    if (!section) return { state: 'missing', label: 'не выбрана', css: 'v4-step-warn' };
    if (isSectionConfigured(section)) return { state: 'configured', label: 'расчёт добавлен', css: 'v4-step-ok' };
    return { state: 'placeholder', label: 'ожидает расчёта', css: 'v4-step-warn' };
  }

  function buildSectionSummaryRows(draft) {
    const q = model().createQuoteDraft(draft || {});
    const sections = q.sections || {};
    return model().getEnabledSectionKeys(q).map(key => {
      const section = sections[key];
      const state = getSectionState(section);
      return {
        key,
        title: section && section.title ? section.title : sectionTitle(key),
        status: state.label,
        state: state.state,
        weightKg: clampNonNegative(section && section.weightKg, 0),
        powerW: clampNonNegative(section && section.powerW, 0),
        rental: clampNonNegative(section && section.rental, 0),
        summary: toText(section && section.summary)
      };
    });
  }

  function sectionTitle(key) {
    return ({ stage: 'Сцена', truss: 'Фермы', led: 'LED экран', equipment: 'Оборудование и услуги' })[key] || key;
  }

  ROOT.QuoteSectionBinder = {
    SECTION_BINDER_VERSION,
    createPlaceholderSection,
    ensureSectionsForScope,
    normalizeLedInput,
    buildLedSection,
    buildStageSection,
    buildTrussSection,
    buildStageSectionFromV4,
    buildTrussSectionFromV4,
    bindSection,
    bindLedSection,
    buildEquipmentSection,
    bindEquipmentSection,
    getEquipmentInputFromQuote,
    bindStageSection,
    bindTrussSection,
    bindStageFromV4,
    bindTrussFromV4,
    getStageInputFromQuote,
    getTrussInputFromQuote,
    getLedInputFromQuote,
    isSectionConfigured,
    getSectionState,
    buildSectionSummaryRows
  };
})();
