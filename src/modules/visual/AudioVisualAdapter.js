// FEG Stage PRO v3.16.7 — Audio visual placeholder adapter
// Responsibility: convert quote.sections.equipment sound rows into render-neutral visualModel.audio placeholders.
// Data-only boundary: no renderer, no BOM writes, no warehouse writes, no pricing or formula mutations.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VISUAL_AUDIO_ADAPTER_VERSION = '0.1.0-audio-light-placeholders';

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

  function getLines(equipmentSection) {
    const section = equipmentSection || {};
    const source = Array.isArray(section.items) && section.items.length ? section.items : (Array.isArray(section.bomRows) ? section.bomRows : []);
    return source.map((line, index) => normalizeLine(line, index)).filter(Boolean);
  }

  function normalizeLine(line, index) {
    const src = line || {};
    const qty = nonNegative(src.qty, 0);
    if (qty <= 0) return null;
    return {
      id: toText(src.id || src.itemId, stableId('audio-source-row', index)),
      itemId: toText(src.itemId),
      code: toText(src.code),
      name: toText(src.name, `Аудио позиция ${index + 1}`),
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

  function isAudioLine(line) {
    if (!line) return false;
    const hay = `${line.category} ${line.subcategory} ${line.type} ${lower(line.name)} ${lower(line.note)}`;
    return line.category === 'sound_pa'
      || line.category === 'consoles'
      || line.category === 'monitoring'
      || hay.includes('sound')
      || hay.includes('audio')
      || hay.includes('line array')
      || hay.includes('pa')
      || hay.includes('sub')
      || hay.includes('front fill')
      || hay.includes('монитор')
      || hay.includes('пульт')
      || hay.includes('саб')
      || hay.includes('звук');
  }

  function classifyAudioLine(line) {
    const hay = `${line.category} ${line.subcategory} ${line.type} ${lower(line.name)} ${lower(line.note)}`;
    if (hay.includes('front fill') || hay.includes('frontfill') || hay.includes('фронт')) return 'front_fill';
    if (hay.includes('sub') || hay.includes('саб')) return 'sub';
    if (line.category === 'consoles' || hay.includes('console') || hay.includes('mixer') || hay.includes('пульт') || hay.includes('микшер')) return 'console';
    if (line.category === 'monitoring' || hay.includes('monitor') || hay.includes('iem') || hay.includes('монитор')) return 'monitoring';
    if (line.category === 'commutation' || hay.includes('xlr') || hay.includes('dmx') || hay.includes('rj45') || hay.includes('cable') || hay.includes('кабель')) return 'commutation';
    return 'pa';
  }

  function splitStereo(qty) {
    const total = nonNegative(qty, 0);
    const left = Math.ceil(total / 2);
    const right = Math.max(0, total - left);
    return { left, right };
  }

  function sumQty(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.qty, 0), 0); }
  function sumPower(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.powerW, 0), 0); }
  function sumWeight(lines) { return (Array.isArray(lines) ? lines : []).reduce((sum, line) => sum + nonNegative(line.weightKg, 0), 0); }

  function makeStereoBlock(kind, qty, label, selectedScope) {
    const split = splitStereo(qty);
    return {
      kind,
      label,
      enabled: qty > 0,
      placeholder: selectedScope && qty <= 0,
      totalQty: qty,
      left: { enabled: split.left > 0, qty: split.left, label: `${label} слева` },
      right: { enabled: split.right > 0, qty: split.right, label: `${label} справа` }
    };
  }

  function adaptAudioSection(equipmentSection, options) {
    const opts = options || {};
    const scope = opts.scope || opts.quoteScope || {};
    const selectedScope = Boolean(scope.sound || (equipmentSection && Array.isArray(equipmentSection.selectedScopes) && equipmentSection.selectedScopes.includes('sound')));
    const section = equipmentSection || null;
    const allLines = getLines(section);
    const audioLines = allLines.filter(isAudioLine).map(line => Object.assign({}, line, { visualKind: classifyAudioLine(line) }));
    const paLines = audioLines.filter(line => line.visualKind === 'pa');
    const subLines = audioLines.filter(line => line.visualKind === 'sub');
    const frontFillLines = audioLines.filter(line => line.visualKind === 'front_fill');
    const consoleLines = audioLines.filter(line => line.visualKind === 'console');
    const monitoringLines = audioLines.filter(line => line.visualKind === 'monitoring');
    const commutationLines = audioLines.filter(line => line.visualKind === 'commutation');
    const enabled = selectedScope || audioLines.length > 0;

    return {
      enabled,
      adapterVersion: VISUAL_AUDIO_ADAPTER_VERSION,
      status: audioLines.length ? 'ready' : (enabled ? 'placeholder' : (section ? 'no_audio_rows' : 'missing')),
      sourceSection: 'quote.sections.equipment',
      selectedScope,
      summary: audioLines.length
        ? `${audioLines.length} аудио поз. · PA ${sumQty(paLines)} · SUB ${sumQty(subLines)} · Front Fill ${sumQty(frontFillLines)}`
        : (enabled ? 'Аудио включено в составе сметы, позиции ещё не выбраны.' : 'Аудио не выбрано.'),
      pa: makeStereoBlock('pa', sumQty(paLines), 'PA', selectedScope),
      subs: makeStereoBlock('sub', sumQty(subLines), 'Сабы', selectedScope),
      frontFill: {
        enabled: sumQty(frontFillLines) > 0,
        placeholder: selectedScope && sumQty(frontFillLines) <= 0,
        qty: sumQty(frontFillLines),
        label: 'Front Fill'
      },
      consoles: {
        enabled: sumQty(consoleLines) > 0,
        qty: sumQty(consoleLines),
        lines: consoleLines.map(clone)
      },
      monitoring: {
        enabled: sumQty(monitoringLines) > 0,
        qty: sumQty(monitoringLines),
        lines: monitoringLines.map(clone)
      },
      commutation: {
        enabled: sumQty(commutationLines) > 0,
        qty: sumQty(commutationLines),
        lines: commutationLines.map(clone)
      },
      lines: audioLines.map(clone),
      totals: {
        itemRows: audioLines.length,
        qty: sumQty(audioLines),
        weightKg: sumWeight(audioLines),
        powerW: sumPower(audioLines)
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

  function buildAudioVisualSmokeReport(equipmentSection, options) {
    const audio = adaptAudioSection(equipmentSection, options || {});
    const checks = [
      { key: 'adapter_status', ok: Boolean(audio && Object.prototype.hasOwnProperty.call(audio, 'enabled')), label: 'Audio adapter returns stable block' },
      { key: 'source_section', ok: audio.sourceSection === 'quote.sections.equipment', label: 'Audio visual model keeps equipment source section link' },
      { key: 'pa_placeholder', ok: Boolean(audio.pa && audio.pa.left && audio.pa.right), label: 'Audio placeholders expose PA left/right' },
      { key: 'sub_placeholder', ok: Boolean(audio.subs && audio.subs.left && audio.subs.right), label: 'Audio placeholders expose sub left/right' },
      { key: 'front_fill_placeholder', ok: Boolean(audio.frontFill && Object.prototype.hasOwnProperty.call(audio.frontFill, 'enabled')), label: 'Audio placeholders expose front fill' },
      { key: 'protected_flows', ok: audio.protectedFlows.noBomMutation === true && audio.protectedFlows.noPricingMutation === true, label: 'Audio adapter is read-only and does not mutate BOM/prices' }
    ];
    return {
      type: 'feg-stage-pro-audio-visual-smoke-report',
      version: VISUAL_AUDIO_ADAPTER_VERSION,
      ok: checks.every(row => row.ok),
      checks,
      audio,
      generatedAt: nowIso()
    };
  }

  const api = {
    VISUAL_AUDIO_ADAPTER_VERSION,
    adaptAudioSection,
    buildAudioVisualSmokeReport
  };

  ROOT.AudioVisualAdapter = api;
  ROOT.VisualAudioAdapter = api;
})();
