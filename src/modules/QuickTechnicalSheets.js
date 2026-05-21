(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUICK_TECH_VERSION = '1.0.3-v4-led-freeform-report';
  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран'
  });

  function nowIso() { return new Date().toISOString(); }
  function toText(value, fallback) {
    const out = String(value == null ? '' : value).trim();
    return out || String(fallback == null ? '' : fallback);
  }
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function count(value) { return Number(nonNegative(value, 0)).toLocaleString('ru-RU'); }
  function weight(value) { return `${Number(nonNegative(value, 0)).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`; }
  function power(value) { return `${Number(nonNegative(value, 0)).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} Вт`; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function normalizeBomRow(row, sectionKey, sectionTitle) {
    if (ROOT.V4SharedBomBridge && ROOT.V4SharedBomBridge.normalizeBomRow) {
      const normalized = ROOT.V4SharedBomBridge.normalizeBomRow(row || {}, { sectionKey, section:{ title:sectionTitle } });
      return Object.assign({}, normalized, {
        sectionKey,
        sectionTitle,
        weightKg: nonNegative(normalized.weightKg == null ? normalized.weight_kg : normalized.weightKg, 0),
        powerW: nonNegative(normalized.powerW == null ? normalized.power_w : normalized.powerW, 0),
        note: toText(normalized.note || normalized.notes)
      });
    }
    const src = row || {};
    const qty = nonNegative(src.qty == null ? src.count : src.qty, 0);
    const unitWeight = src.unitWeightKg == null ? null : nonNegative(src.unitWeightKg, 0);
    const weightKg = src.weightKg == null
      ? (src.weight == null ? (unitWeight == null ? 0 : unitWeight * qty) : nonNegative(src.weight, 0))
      : nonNegative(src.weightKg, 0);
    return {
      sectionKey,
      sectionTitle,
      id: toText(src.id || src.itemId || src.code || src.name, 'item'),
      code: toText(src.code || src.id || src.itemId, '—'),
      name: toText(src.name || src.label || src.title || src.code, 'Позиция'),
      qty,
      unit: toText(src.unit, 'шт'),
      weightKg,
      powerW: nonNegative(src.powerW, 0),
      note: toText(src.note || src.notes)
    };
  }

  function readSection(input, sectionKey) {
    const key = sectionKey || (input && input.type) || 'stage';
    const section = input && input.sections ? input.sections[key] : input;
    return section || null;
  }

  function getStageSectionFromLive() {
    return null;
  }

  function getTrussSectionFromLive() {
    return null;
  }

  function getLiveSection(sectionKey) {
    if (sectionKey === 'truss') return getTrussSectionFromLive();
    if (sectionKey === 'stage') return getStageSectionFromLive();
    return null;
  }

  function getLedConstructionRows(section) {
    const list = section && Array.isArray(section.constructions) ? section.constructions : (section && section.result && Array.isArray(section.result.constructions) ? section.result.constructions : []);
    return list.map((part, index) => ({
      n: index + 1,
      name: toText(part.name, `LED конструкция ${index + 1}`),
      type: toText(part.type, ''),
      columns: nonNegative(part.columns, 0),
      rows: nonNegative(part.rows, 0),
      cabinetCount: nonNegative(part.cabinetCount, 0),
      actualWidthM: nonNegative(part.actualWidthM, 0),
      actualHeightM: nonNegative(part.actualHeightM, 0),
      totalPixelsX: nonNegative(part.totalPixelsX, 0),
      totalPixelsY: nonNegative(part.totalPixelsY, 0),
      activePixels: nonNegative(part.activePixels, part.totalPixels || 0),
      pixelDensityX: nonNegative(part.pixelDensityX, 0),
      pixelDensityY: nonNegative(part.pixelDensityY, 0),
      note: toText(part.note, '')
    }));
  }

  function buildSectionTechnicalSheet(sectionKey, sectionInput, options) {
    const key = sectionKey || 'stage';
    const title = SECTION_TITLES[key] || key;
    const section = readSection(sectionInput, key) || getLiveSection(key);
    const rows = section && Array.isArray(section.bomRows) ? section.bomRows : [];
    const bomRows = rows.map(row => normalizeBomRow(row, key, title)).filter(row => row.qty > 0 || row.weightKg > 0 || row.powerW > 0);
    const totalWeight = nonNegative(section && (section.weightKg == null ? section.totalWeightKg : section.weightKg), 0) || bomRows.reduce((sum, row) => sum + nonNegative(row.weightKg, 0), 0);
    const totalPower = nonNegative(section && (section.powerW == null ? section.totalPowerW : section.powerW), 0) || bomRows.reduce((sum, row) => sum + nonNegative(row.powerW, 0), 0);
    return {
      type: `${key}-quick-tech-sheet`,
      sectionKey: key,
      title: `${title} — технический лист без цен`,
      version: QUICK_TECH_VERSION,
      status: section ? (section.status || 'configured') : 'empty',
      summary: section ? toText(section.summary, 'Расчёт без описания') : `Нет текущего расчёта: сначала соберите ${title.toLowerCase()} в калькуляторе.`,
      hasPrices: false,
      source: section ? toText(section.source || section.bridgeVersion || section.bomBridge && section.bomBridge.bridgeVersion || 'quote-section') : 'empty',
      totals: {
        rows: bomRows.length,
        qty: bomRows.reduce((sum, row) => sum + nonNegative(row.qty, 0), 0),
        weightKg: totalWeight,
        powerW: totalPower
      },
      bomRows,
      generatedAt: nowIso(),
      notes: [
        `${title}: быстрый техлист без клиентов, цен и КП.`,
        'Расчётные количества взяты из текущего результата без изменения формул.'
      ],
      constructionRows: key === 'led' ? getLedConstructionRows(section) : [],
      rawSection: options && options.includeRaw ? clone(section) : undefined
    };
  }

  function buildSectionWarehouseSheet(sectionKey, sectionInput, options) {
    const tech = buildSectionTechnicalSheet(sectionKey, sectionInput, options || {});
    return {
      type: `${tech.sectionKey}-quick-warehouse-sheet`,
      sectionKey: tech.sectionKey,
      title: `${SECTION_TITLES[tech.sectionKey] || tech.sectionKey} — складской лист без цен`,
      version: QUICK_TECH_VERSION,
      status: tech.status,
      summary: tech.summary,
      hasPrices: false,
      rows: tech.bomRows.map((row, index) => ({
        n: index + 1,
        code: row.code,
        name: row.name,
        qty: row.qty,
        unit: row.unit,
        weightKg: row.weightKg,
        note: row.note
      })),
      totals: tech.totals,
      constructionRows: tech.constructionRows || [],
      generatedAt: tech.generatedAt,
      notes: [
        `${SECTION_TITLES[tech.sectionKey] || tech.sectionKey}: складской лист для сборки без цен.`,
        'Позиции агрегируются из BOM текущего расчёта.'
      ]
    };
  }

  function buildQuickSheets(sectionKey, sectionInput) {
    return {
      technical: buildSectionTechnicalSheet(sectionKey, sectionInput),
      warehouse: buildSectionWarehouseSheet(sectionKey, sectionInput)
    };
  }

  function documentToText(doc) {
    const d = doc || {};
    const lines = [];
    lines.push(d.title || 'Технический лист');
    lines.push('');
    lines.push(`Статус: ${d.status || '—'}`);
    lines.push(`Сводка: ${d.summary || '—'}`);
    lines.push('');
    if (String(d.type || '').includes('warehouse')) appendWarehouseRows(lines, d);
    else appendTechnicalRows(lines, d);
    appendConstructionRows(lines, d);
    if (Array.isArray(d.notes) && d.notes.length) {
      lines.push('');
      d.notes.forEach(note => lines.push(`Примечание: ${note}`));
    }
    lines.push('');
    lines.push(`Сформировано: ${d.generatedAt || nowIso()}`);
    return lines.join('\n');
  }

  function appendConstructionRows(lines, doc) {
    const rows = Array.isArray(doc && doc.constructionRows) ? doc.constructionRows : [];
    if (!rows.length) return;
    lines.push('');
    lines.push('Отдельные LED-конструкции:');
    rows.forEach(row => {
      lines.push(`${row.n}. ${row.name || 'LED конструкция'} — ${count(row.columns)}×${count(row.rows)} каб., активных ${count(row.cabinetCount)} шт; ${Number(row.actualWidthM || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}×${Number(row.actualHeightM || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м; ${count(row.totalPixelsX)}×${count(row.totalPixelsY)} px; ${count(row.pixelDensityX)}×${count(row.pixelDensityY)} px/м${row.note ? ` (${row.note})` : ''}`);
    });
  }

  function appendTechnicalRows(lines, doc) {
    lines.push('Комплектация:');
    const rows = doc.bomRows || [];
    if (!rows.length) lines.push('— Нет строк комплектации');
    rows.forEach((row, index) => {
      lines.push(`${index + 1}. ${row.code || '—'} ${row.name} — ${count(row.qty)} ${row.unit}, вес ${weight(row.weightKg)}${row.powerW ? `, мощность ${power(row.powerW)}` : ''}${row.note ? ` (${row.note})` : ''}`);
    });
    lines.push('');
    lines.push(`Всего позиций: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Всего единиц: ${count(doc.totals && doc.totals.qty)}`);
    lines.push(`Общий вес: ${weight(doc.totals && doc.totals.weightKg)}`);
    if (doc.totals && doc.totals.powerW) lines.push(`Рабочая мощность: ${power(doc.totals.powerW)}`);
  }

  function appendWarehouseRows(lines, doc) {
    lines.push('Складские позиции:');
    const rows = doc.rows || [];
    if (!rows.length) lines.push('— Нет строк комплектации');
    rows.forEach(row => {
      lines.push(`${row.n}. ${row.code || '—'} ${row.name} — ${count(row.qty)} ${row.unit}, вес ${weight(row.weightKg)}${row.note ? ` (${row.note})` : ''}`);
    });
    lines.push('');
    lines.push(`Всего позиций: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Всего единиц: ${count(doc.totals && doc.totals.qty)}`);
    lines.push(`Вес листа: ${weight(doc.totals && doc.totals.weightKg)}`);
  }

  ROOT.QuickTechnicalSheets = {
    QUICK_TECH_VERSION,
    buildSectionTechnicalSheet,
    buildSectionWarehouseSheet,
    buildQuickSheets,
    documentToText,
    getLiveSection
  };
})();
