(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const AVAILABILITY_VERSION = '1.2.0-quick-ideal-isolation';

  function db() { return ROOT.EquipmentDatabase || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function normalizeKey(value) {
    return toText(value).toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function isQuickIdealSource(value) {
    const src = toText(value).toLowerCase();
    return src === 'quick_ideal' || src === 'quick ideal' || src === 'ideal' || src === 'quick';
  }
  function isQuickIdealRow(row) {
    const src = row || {};
    return isQuickIdealSource(src.sourceType || src.source_type) || !!(src.meta && src.meta.quickIdealCatalog);
  }

  function getInventory(items) {
    const mod = db();
    if (mod && mod.normalizeItems) return mod.normalizeItems(items || mod.getStoredItemsOrDemo());
    return Array.isArray(items) ? items.slice() : [];
  }

  function normalizeNeedRow(row) {
    const src = row || {};
    return {
      sectionKey: toText(src.sectionKey),
      sectionTitle: toText(src.sectionTitle),
      id: toText(src.id || src.itemId || src.code || src.name),
      itemId: toText(src.itemId),
      code: toText(src.code || src.id || src.itemId),
      name: toText(src.name || src.label || src.title || src.code || 'Позиция'),
      qty: nonNegative(src.qty == null ? src.count : src.qty, 0),
      unit: toText(src.unit || 'шт') || 'шт',
      weightKg: nonNegative(src.weightKg == null ? src.weight : src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW, 0),
      sourceType: toText(src.sourceType || src.source_type || 'own') || 'own',
      supplierId: toText(src.supplierId || src.supplier_id),
      supplierName: toText(src.supplierName || src.supplier_name),
      subrentPrice: nonNegative(src.subrentPrice || src.subrent_price || 0, 0),
      clientPrice: nonNegative(src.clientPrice || src.client_price || 0, 0),
      margin: nonNegative(src.margin, 0),
      availableQty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      deficitQty: nonNegative(src.deficitQty, 0),
      note: toText(src.note || src.notes),
      raw: src
    };
  }

  function exactItemMatch(row, inventory) {
    const mod = db();
    if (mod && mod.findItem) {
      const byItem = row.itemId ? mod.findItem(row.itemId, inventory) : null;
      if (byItem) return byItem;
      const byCode = row.code ? mod.findItem(row.code, inventory) : null;
      if (byCode) return byCode;
      const byId = row.id ? mod.findItem(row.id, inventory) : null;
      if (byId) return byId;
    }
    const needles = [row.itemId, row.code, row.id].map(normalizeKey).filter(Boolean);
    return inventory.find(item => {
      const keys = [item.id, item.code].map(normalizeKey).filter(Boolean);
      return needles.some(needle => keys.includes(needle));
    }) || null;
  }

  function fuzzyItemMatch(row, inventory) {
    const name = normalizeKey(row.name);
    if (!name) return null;
    const sectionHint = normalizeKey(row.sectionKey || row.sectionTitle);
    const scored = inventory.map(item => {
      const itemName = normalizeKey(item.name);
      const itemModel = normalizeKey(item.model);
      const itemCategory = normalizeKey(item.category);
      const itemSubcategory = normalizeKey(item.subcategory);
      let score = 0;
      if (itemName === name) score += 100;
      if (itemModel && itemModel === name) score += 80;
      if (itemName && name && itemName.includes(name)) score += 45;
      if (itemName && name && name.includes(itemName)) score += 35;
      if (itemModel && name.includes(itemModel)) score += 30;
      if (sectionHint && (itemCategory.includes(sectionHint) || itemSubcategory.includes(sectionHint))) score += 10;
      return { item, score };
    }).filter(row => row.score > 0).sort((a, b) => b.score - a.score);
    return scored.length && scored[0].score >= 70 ? scored[0].item : null;
  }

  function matchInventoryItem(row, inventoryItems) {
    const inventory = getInventory(inventoryItems);
    const normalized = normalizeNeedRow(row);
    return exactItemMatch(normalized, inventory) || fuzzyItemMatch(normalized, inventory);
  }

  function makeAggregateKey(row, matchedItem) {
    const sourceType = normalizeKey(row.sourceType || row.source_type || 'own') || 'own';
    const supplierName = normalizeKey(row.supplierName || row.supplier_name || '');
    const supplierId = normalizeKey(row.supplierId || row.supplier_id || '');
    const subrentPrice = normalizeKey(row.subrentPrice == null ? row.subrent_price : row.subrentPrice);
    const clientPrice = normalizeKey(row.clientPrice == null ? row.client_price : row.clientPrice);
    const sourcePart = sourceType === 'subrent' || sourceType === 'manual subrent'
      ? `|source:${sourceType}|supplier:${supplierId || supplierName}|subrent:${subrentPrice}|client:${clientPrice}`
      : `|source:${sourceType}`;
    if (matchedItem && matchedItem.id) return `item:${matchedItem.id}${sourcePart}`;
    const code = normalizeKey(row.code || row.itemId || row.id);
    if (code) return `code:${code}${sourcePart}`;
    return `name:${normalizeKey(row.name)}|${normalizeKey(row.unit)}|${normalizeKey(row.sectionKey)}${sourcePart}`;
  }

  function aggregateNeeds(rows, inventoryItems) {
    const inventory = getInventory(inventoryItems);
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(rawRow => {
      const row = normalizeNeedRow(rawRow);
      if (row.qty <= 0 && row.weightKg <= 0 && row.powerW <= 0) return;
      const matchedItem = isQuickIdealRow(row.raw || row) ? null : matchInventoryItem(row, inventory);
      const key = makeAggregateKey(row, matchedItem);
      const prev = map.get(key) || {
        ...row,
        qty: 0,
        weightKg: 0,
        powerW: 0,
        startupPowerW: 0,
        deficitQty: 0,
        matchedItem,
        sourceRows: []
      };
      prev.qty += row.qty;
      prev.weightKg += row.weightKg;
      prev.powerW += row.powerW;
      prev.startupPowerW += row.startupPowerW;
      prev.deficitQty += row.deficitQty;
      if (!prev.code && row.code) prev.code = row.code;
      if (!prev.itemId && row.itemId) prev.itemId = row.itemId;
      if (!prev.sectionKey && row.sectionKey) prev.sectionKey = row.sectionKey;
      if (!prev.sectionTitle && row.sectionTitle) prev.sectionTitle = row.sectionTitle;
      if (!prev.sourceType && row.sourceType) prev.sourceType = row.sourceType;
      if (!prev.supplierId && row.supplierId) prev.supplierId = row.supplierId;
      if (!prev.supplierName && row.supplierName) prev.supplierName = row.supplierName;
      if (!prev.subrentPrice && row.subrentPrice) prev.subrentPrice = row.subrentPrice;
      if (!prev.clientPrice && row.clientPrice) prev.clientPrice = row.clientPrice;
      if (!prev.margin && row.margin) prev.margin = row.margin;
      if (row.note) prev.note = prev.note ? `${prev.note}; ${row.note}` : row.note;
      prev.sourceRows.push(row);
      map.set(key, prev);
    });
    return Array.from(map.values());
  }

  function enrichNeedRow(row, inventoryItems) {
    const normalized = normalizeNeedRow(row);
    if (isQuickIdealRow(row) || isQuickIdealRow(normalized.raw) || isQuickIdealSource(normalized.sourceType)) {
      const requestedQty = nonNegative(normalized.qty, 0);
      const note = normalized.note || 'Быстрый идеальный расчёт: склад, резервы и дефицит не проверяются.';
      return {
        ...normalized,
        sourceType: 'quick_ideal',
        requestedQty,
        availableQty: null,
        stockQty: null,
        reservedQty: null,
        deficitQty: 0,
        subrentQty: 0,
        ok: true,
        inventoryStatus: 'quick_ideal',
        inventoryItemId: '',
        inventoryCode: '',
        sourceTypeSuggestion: 'quick_ideal',
        note,
        matchedItem: null
      };
    }
    const inventory = getInventory(inventoryItems);
    const item = normalized.matchedItem || matchInventoryItem(normalized, inventory);
    const isSubrent = normalized.sourceType === 'subrent' || normalized.sourceType === 'manual_subrent';
    const requestedQty = nonNegative(normalized.qty, 0);
    const availableQty = item ? nonNegative(item.availableQty, 0) : normalized.availableQty;
    const stockQty = item ? nonNegative(item.stockQty, 0) : null;
    const reservedQty = item ? nonNegative(item.reservedQty, 0) : null;
    const deficitQty = isSubrent
      ? 0
      : item
        ? Math.max(0, requestedQty - availableQty)
        : nonNegative(normalized.deficitQty, 0);
    const inventoryStatus = isSubrent
      ? 'subrent'
      : item
        ? (deficitQty > 0 ? 'deficit' : 'ok')
        : 'unmatched';
    const subrentQty = inventoryStatus === 'deficit' ? deficitQty : 0;
    const resolvedSourceType = isSubrent ? 'subrent' : normalized.sourceType;
    const notes = [];
    if (normalized.note) notes.push(normalized.note);
    if (inventoryStatus === 'unmatched') notes.push('Не сопоставлено с базой оборудования');
    if (inventoryStatus === 'deficit') notes.push(`Дефицит ${deficitQty} ${normalized.unit}`);
    return {
      ...normalized,
      itemId: item && item.id || normalized.itemId,
      code: item && item.code || normalized.code,
      name: item && item.name || normalized.name,
      unit: item && item.unit || normalized.unit,
      sourceType: resolvedSourceType,
      supplierId: normalized.supplierId || (item && item.supplierId) || '',
      supplierName: normalized.supplierName || (item && item.supplierName) || '',
      subrentPrice: normalized.subrentPrice,
      clientPrice: normalized.clientPrice,
      margin: normalized.margin,
      requestedQty,
      availableQty,
      stockQty,
      reservedQty,
      deficitQty,
      subrentQty,
      ok: inventoryStatus === 'ok' || inventoryStatus === 'subrent',
      inventoryStatus,
      inventoryItemId: item && item.id || '',
      inventoryCode: item && item.code || '',
      sourceTypeSuggestion: subrentQty > 0 ? 'subrent_needed' : resolvedSourceType,
      note: notes.join('; '),
      matchedItem: item || null
    };
  }

  function enrichBomRows(rows, inventoryItems) {
    return aggregateNeeds(rows, inventoryItems).map(row => enrichNeedRow(row, inventoryItems));
  }

  function buildAvailabilityReport(rows, inventoryItems) {
    const enrichedRows = enrichBomRows(rows, inventoryItems);
    const deficitRows = enrichedRows.filter(row => row.deficitQty > 0);
    const unmatchedRows = enrichedRows.filter(row => row.inventoryStatus === 'unmatched');
    const subrentRows = enrichedRows.filter(row => row.sourceType === 'subrent' || row.subrentQty > 0);
    const totalRequestedQty = enrichedRows.reduce((sum, row) => sum + nonNegative(row.requestedQty == null ? row.qty : row.requestedQty, 0), 0);
    const totalDeficitQty = deficitRows.reduce((sum, row) => sum + nonNegative(row.deficitQty, 0), 0);
    const totalSubrentQty = enrichedRows.reduce((sum, row) => sum + nonNegative(row.subrentQty, 0), 0);
    return {
      version: AVAILABILITY_VERSION,
      rows: enrichedRows,
      okRows: enrichedRows.filter(row => row.inventoryStatus === 'ok').length,
      deficitRows,
      unmatchedRows,
      subrentRows,
      totalRows: enrichedRows.length,
      totalRequestedQty,
      totalDeficitQty,
      totalSubrentQty,
      hasProblems: deficitRows.length > 0 || unmatchedRows.length > 0,
      generatedAt: new Date().toISOString()
    };
  }

  ROOT.AvailabilityChecker = {
    AVAILABILITY_VERSION,
    normalizeNeedRow,
    isQuickIdealSource,
    isQuickIdealRow,
    matchInventoryItem,
    aggregateNeeds,
    enrichNeedRow,
    enrichBomRows,
    buildAvailabilityReport
  };
})();
