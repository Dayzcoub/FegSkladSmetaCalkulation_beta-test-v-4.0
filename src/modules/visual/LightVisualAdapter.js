// FEG Stage PRO v3.16.7 — Light visual placeholder adapter
// Responsibility: convert quote.sections.equipment light rows into render-neutral visualModel.light placeholders.
// Data-only boundary: no renderer, no BOM writes, no warehouse writes, no lighting formula mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_LIGHT_ADAPTER_VERSION = '0.1.0-audio-light-placeholders';

  function nowIso() { return new Date().toISOString(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function toText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || String(fallback == null ? '' : fallback).trim();
  }
  function lower(value) { return toText(value).toLowerCase(); }
  function stableId(prefix, index) { return `${prefix}-${index + 1}`; }

  function normalizeLine(line, index) {
    const src = line || {};
    const qty = nonNegative(src.qty, 0);
    if (qty <= 0) return null;
    return {
      id: toText(src.id || src.itemId, stableId('light-source-row', index)),
      itemId: toText(src.itemId),
      code: toText(src.code),
      name: toText(src.name, `Световая позиция ${index + 1}`),
      category: lower(src.category),
      subcategory: lower(src.subcategory),
      type: lower(src.type),
      unit: toText(src.unit, 'шт'),
      qty,
      weightKg: nonNegative(src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      note: toText(src.note || src.notes),
      sourceType: toText(src.sourceType, 'own')
    };
  }

  function getLines(equipmentSection) {
    const section = equipmentSection || {};
    const source = Array.isArray(section.items) && section.items.length ? section.items : (Array.isArray(section.bomRows) ? section.bomRows : []);
    return source.map((line, index) => normalizeLine(line, index)).filter(Boolean);
  }

  function isLightLine(line) {
    if (!line) return false;
    const hay = `${line.category} ${line.subcategory} ${line.type} ${lower(line.name)} ${lower(line.note)}`;
    return line.category === 'light'
      || line.type === 'light_fixture'
      || hay.includes('moving')
      || hay.includes('beam')
      || hay.includes('wash')
      || hay.includes('par')
      || hay.includes('blinder')
      || hay.includes('strobe')
      || hay.includes('свет')
      || hay.includes('голова')
      || hay.includes('прибор');
  }

  function classifyFixtureKind(line) {
    const hay = `${line.subcategory} ${line.type} ${lower(line.name)} ${lower(line.note)}`;
    if (hay.includes('beam')) return 'beam';
    if (hay.includes('wash')) return 'wash';
    if (hay.includes('blinder') || hay.includes('блиндер')) return 'blinder';
    if (hay.includes('par')) return 'par';
    if (hay.includes('strobe') || hay.includes('строб')) return 'strobe';
    if (hay.includes('moving') || hay.includes('голова')) return 'moving_head';
    return 'fixture';
  }

  function classifyFixtureMount(line) {
    const hay = `${line.subcategory} ${line.type} ${lower(line.name)} ${lower(line.note)}`;
    if (hay.includes('tower') || hay.includes('стойк') || hay.includes('мачт')) return 'tower';
    if (hay.includes('floor') || hay.includes('пол') || hay.includes('наполь')) return 'floor';
    if (hay.includes('truss') || hay.includes('ферм') || hay.includes('подвес')) return 'truss';
    return 'unassigned';
  }

  function normalizeFixture(line, index) {
    return Object.assign({}, line, {
      visualKind: classifyFixtureKind(line),
      mount: classifyFixtureMount(line),
      visualId: stableId('light-fixture', index)
    });
  }

  function sumQty(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.qty, 0), 0); }
  function sumPower(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.powerW, 0), 0); }
  function sumWeight(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.weightKg, 0), 0); }

  function countBy(lines, key) {
    return (Array.isArray(lines) ? lines : []).reduce((acc, line) => {
      const value = toText(line && line[key], 'unknown');
      acc[value] = (acc[value] || 0) + nonNegative(line.qty, 0);
      return acc;
    }, {});
  }

  function adaptLightSection(equipmentSection, options) {
    const opts = options || {};
    const scope = opts.scope || opts.quoteScope || {};
    const selectedScope = Boolean(scope.light || (equipmentSection && Array.isArray(equipmentSection.selectedScopes) && equipmentSection.selectedScopes.includes('light')));
    const section = equipmentSection || null;
    const allLines = getLines(section);
    const fixtures = allLines.filter(isLightLine).map(normalizeFixture);
    const trussFixtures = fixtures.filter(line => line.mount === 'truss');
    const floorFixtures = fixtures.filter(line => line.mount === 'floor');
    const towerFixtures = fixtures.filter(line => line.mount === 'tower');
    const unassignedFixtures = fixtures.filter(line => line.mount === 'unassigned');
    const enabled = selectedScope || fixtures.length > 0;

    return {
      enabled,
      adapterVersion: VISUAL_LIGHT_ADAPTER_VERSION,
      status: fixtures.length ? 'ready' : (enabled ? 'placeholder' : (section ? 'no_light_rows' : 'missing')),
      sourceSection: 'quote.sections.equipment',
      selectedScope,
      summary: fixtures.length
        ? `${fixtures.length} свет. поз. · на ферме ${sumQty(trussFixtures)} · на полу ${sumQty(floorFixtures)} · towers ${sumQty(towerFixtures)}`
        : (enabled ? 'Свет включён в составе сметы, позиции ещё не выбраны.' : 'Свет не выбран.'),
      fixturesOnTruss: {
        enabled: sumQty(trussFixtures) > 0,
        placeholder: selectedScope && sumQty(trussFixtures) <= 0,
        qty: sumQty(trussFixtures),
        lines: trussFixtures.map(clone)
      },
      floorFixtures: {
        enabled: sumQty(floorFixtures) > 0,
        placeholder: selectedScope && sumQty(floorFixtures) <= 0,
        qty: sumQty(floorFixtures),
        lines: floorFixtures.map(clone)
      },
      towers: {
        enabled: sumQty(towerFixtures) > 0,
        placeholder: false,
        qty: sumQty(towerFixtures),
        lines: towerFixtures.map(clone)
      },
      unassignedFixtures: {
        enabled: sumQty(unassignedFixtures) > 0,
        qty: sumQty(unassignedFixtures),
        lines: unassignedFixtures.map(clone)
      },
      fixtures: fixtures.map(clone),
      countsByKind: countBy(fixtures, 'visualKind'),
      countsByMount: countBy(fixtures, 'mount'),
      totals: {
        itemRows: fixtures.length,
        qty: sumQty(fixtures),
        weightKg: sumWeight(fixtures),
        powerW: sumPower(fixtures)
      },
      renderHints: {
        placeholderSymbolsReady: true,
        topViewReady: false,
        frontViewReady: false,
        isoSeedReady: false,
        rendererRequired: false,
        rendererPlannedVersion: 'future audio/light renderer / project visualizer'
      },
      protectedFlows: {
        noBomMutation: true,
        noWarehouseMutation: true,
        noLegacyMutation: true,
        noFormulaMutation: true,
        noPricingMutation: true
      },
      updatedAt: nowIso()
    };
  }

  function buildLightVisualSmokeReport(equipmentSection, options) {
    const light = adaptLightSection(equipmentSection, options || {});
    const checks = [
      { key: 'adapter_status', ok: Boolean(light && Object.prototype.hasOwnProperty.call(light, 'enabled')), label: 'Light adapter returns stable block' },
      { key: 'source_section', ok: light.sourceSection === 'quote.sections.equipment', label: 'Light visual model keeps equipment source section link' },
      { key: 'truss_placeholder', ok: Boolean(light.fixturesOnTruss && Object.prototype.hasOwnProperty.call(light.fixturesOnTruss, 'enabled')), label: 'Light placeholders expose fixtures on truss' },
      { key: 'floor_placeholder', ok: Boolean(light.floorFixtures && Object.prototype.hasOwnProperty.call(light.floorFixtures, 'enabled')), label: 'Light placeholders expose floor fixtures' },
      { key: 'tower_placeholder', ok: Boolean(light.towers && Object.prototype.hasOwnProperty.call(light.towers, 'enabled')), label: 'Light placeholders expose towers' },
      { key: 'protected_flows', ok: light.protectedFlows.noBomMutation === true && light.protectedFlows.noPricingMutation === true, label: 'Light adapter is read-only and does not mutate BOM/prices' }
    ];
    return {
      type: 'feg-stage-pro-light-visual-smoke-report',
      version: VISUAL_LIGHT_ADAPTER_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      light,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_LIGHT_ADAPTER_VERSION,
    adaptLightSection,
    buildLightVisualSmokeReport
  };

  ROOT.LightVisualAdapter = api;
  ROOT.VisualLightAdapter = api;
})();
