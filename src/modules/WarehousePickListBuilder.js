(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const PICKLIST_VERSION = '1.2.0-deficit-closure';

  function summary() { return ROOT.QuoteSummaryBuilder || null; }
  function availability() { return ROOT.AvailabilityChecker || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }

  function collectRows(quote, sectionKey) {
    const rawRows = summary() && summary().collectBomRows ? summary().collectBomRows(quote, sectionKey ? { sectionKey } : {}) : [];
    return availability() && availability().enrichBomRows ? availability().enrichBomRows(rawRows) : rawRows;
  }

  function aggregateRows(rows, options) {
    const opts = options || {};
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      if (!row) return;
      const key = [
        opts.ignoreSection ? '' : row.sectionKey || '',
        row.itemId || row.code || row.id || row.name || '',
        row.name || '',
        row.unit || 'шт',
        row.sourceType || 'own',
        row.supplierName || ''
      ].join('|');
      const prev = map.get(key) || {
        sectionKey: row.sectionKey || '',
        sectionTitle: row.sectionTitle || '',
        id: row.id || row.code || row.name,
        itemId: row.itemId || '',
        code: row.code || row.id || '',
        name: row.name || row.code || 'Позиция',
        unit: row.unit || 'шт',
        sourceType: row.sourceType || 'own',
        supplierId: row.supplierId || '',
        supplierName: row.supplierName || '',
        subrentPrice: nonNegative(row.subrentPrice, 0),
        clientPrice: nonNegative(row.clientPrice, 0),
        margin: nonNegative(row.margin, 0),
        qty: 0,
        weightKg: 0,
        powerW: 0,
        startupPowerW: 0,
        deficitQty: 0,
        subrentQty: 0,
        requestedQty: 0,
        availableQty: row.availableQty == null ? null : nonNegative(row.availableQty, 0),
        stockQty: row.stockQty == null ? null : nonNegative(row.stockQty, 0),
        reservedQty: row.reservedQty == null ? null : nonNegative(row.reservedQty, 0),
        inventoryStatus: row.inventoryStatus || '',
        inventoryItemId: row.inventoryItemId || '',
        sourceTypeSuggestion: row.sourceTypeSuggestion || '',
        stageHeightM: nonNegative(row.stageHeightM == null ? row.stage_height_m : row.stageHeightM, 0),
        meters: 0,
        trussLengthM: nonNegative(row.trussLengthM == null ? row.truss_length_m : row.trussLengthM, 0),
        trussStraightCount: 0,
        notes: []
      };
      prev.qty += nonNegative(row.qty, 0);
      prev.requestedQty += nonNegative(row.requestedQty == null ? row.qty : row.requestedQty, 0);
      prev.weightKg += nonNegative(row.weightKg, 0);
      prev.powerW += nonNegative(row.powerW, 0);
      prev.startupPowerW += nonNegative(row.startupPowerW, 0);
      prev.meters += nonNegative(row.meters, 0);
      prev.trussStraightCount += nonNegative(row.trussStraightCount == null ? row.truss_straight_count : row.trussStraightCount, 0);
      prev.deficitQty += nonNegative(row.deficitQty, 0);
      prev.subrentQty += nonNegative(row.subrentQty, 0);
      if (row.availableQty != null) prev.availableQty = row.availableQty;
      if (row.stockQty != null) prev.stockQty = row.stockQty;
      if (row.reservedQty != null) prev.reservedQty = row.reservedQty;
      if (row.inventoryStatus) prev.inventoryStatus = row.inventoryStatus;
      if (row.inventoryItemId) prev.inventoryItemId = row.inventoryItemId;
      if (row.sourceTypeSuggestion) prev.sourceTypeSuggestion = row.sourceTypeSuggestion;
      if (row.supplierId && !prev.supplierId) prev.supplierId = row.supplierId;
      if (row.supplierName && !prev.supplierName) prev.supplierName = row.supplierName;
      if (row.subrentPrice) prev.subrentPrice = row.subrentPrice;
      if (row.clientPrice) prev.clientPrice = row.clientPrice;
      if (row.margin) prev.margin += nonNegative(row.margin, 0);
      if (row.stageHeightM && !prev.stageHeightM) prev.stageHeightM = nonNegative(row.stageHeightM, 0);
      if (row.note) prev.notes.push(row.note);
      map.set(key, prev);
    });
    return Array.from(map.values()).sort(compareRows);
  }

  function compareRows(a, b) {
    return `${a.sectionKey}|${a.name}`.localeCompare(`${b.sectionKey}|${b.name}`, 'ru');
  }

  function makeList(key, title, rows) {
    const safeRows = aggregateRows(rows || []);
    return {
      key,
      title,
      rows: safeRows,
      totalQty: safeRows.reduce((sum, row) => sum + nonNegative(row.qty, 0), 0),
      totalWeightKg: safeRows.reduce((sum, row) => sum + nonNegative(row.weightKg, 0), 0),
      deficitRows: safeRows.filter(row => nonNegative(row.deficitQty, 0) > 0).length,
      subrentRows: safeRows.filter(row => row.sourceType === 'subrent' || nonNegative(row.subrentQty, 0) > 0).length,
      unmatchedRows: safeRows.filter(row => row.inventoryStatus === 'unmatched').length
    };
  }

  function buildSectionPickList(quote, sectionKey) {
    const titles = summary() && summary().SECTION_TITLES || {};
    const rows = collectRows(quote, sectionKey);
    return makeList(sectionKey, titles[sectionKey] || sectionKey, rows);
  }

  function buildAllPickList(quote) {
    return makeList('all', 'Общий складской лист', collectRows(quote), { ignoreSection: false });
  }

  function isDeficitClosureRow(row) {
    return nonNegative(row && row.deficitQty, 0) > 0 || row && row.sourceType === 'subrent' || nonNegative(row && row.subrentQty, 0) > 0;
  }

  function buildDeficitList(quote) {
    return makeList('deficits', 'Дефицит и закрытие', collectRows(quote).filter(isDeficitClosureRow));
  }

  function buildSubrentList(quote) {
    // Kept as an internal compatibility list for subrent planning documents.
    return makeList('subrent', 'План субаренды', collectRows(quote).filter(row => row.sourceType === 'subrent' || nonNegative(row.subrentQty, 0) > 0));
  }

  function buildPickLists(quote) {
    const allRows = collectRows(quote);
    const presentSections = Array.from(new Set(allRows.map(row => row.sectionKey).filter(Boolean)));
    const sectionLists = presentSections.map(key => buildSectionPickList(quote, key));
    return {
      version: PICKLIST_VERSION,
      all: buildAllPickList(quote),
      sections: sectionLists,
      deficits: buildDeficitList(quote),
      subrent: buildSubrentList(quote),
      generatedAt: new Date().toISOString()
    };
  }

  function getRowsForPrint(pickList) {
    return (pickList && Array.isArray(pickList.rows) ? pickList.rows : []).map((row, index) => ({
      n: index + 1,
      code: toText(row.code),
      name: toText(row.name),
      qty: nonNegative(row.qty, 0),
      unit: toText(row.unit || 'шт'),
      section: toText(row.sectionTitle || row.sectionKey),
      sourceType: toText(row.sourceType || 'own'),
      supplierId: toText(row.supplierId),
      supplierName: toText(row.supplierName),
      subrentPrice: nonNegative(row.subrentPrice, 0),
      clientPrice: nonNegative(row.clientPrice, 0),
      margin: nonNegative(row.margin, 0),
      deficitQty: nonNegative(row.deficitQty, 0),
      subrentQty: nonNegative(row.subrentQty, 0),
      availableQty: row.availableQty == null ? null : nonNegative(row.availableQty, 0),
      stockQty: row.stockQty == null ? null : nonNegative(row.stockQty, 0),
      reservedQty: row.reservedQty == null ? null : nonNegative(row.reservedQty, 0),
      inventoryStatus: toText(row.inventoryStatus),
      weightKg: nonNegative(row.weightKg, 0)
    }));
  }

  ROOT.WarehousePickListBuilder = {
    PICKLIST_VERSION,
    collectRows,
    aggregateRows,
    buildSectionPickList,
    buildAllPickList,
    buildDeficitList,
    buildSubrentList,
    isDeficitClosureRow,
    buildPickLists,
    getRowsForPrint
  };
})();
