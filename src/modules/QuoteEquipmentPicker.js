(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const PICKER_VERSION = '1.0.0';

  const CATEGORY_BY_SCOPE = Object.freeze({
    sound: Object.freeze(['sound_pa', 'consoles', 'monitoring', 'commutation']),
    light: Object.freeze(['light', 'commutation']),
    backline: Object.freeze(['backline', 'commutation']),
    services: Object.freeze(['services'])
  });

  function db() {
    if (!ROOT.EquipmentDatabase) throw new Error('EquipmentDatabase is not available.');
    return ROOT.EquipmentDatabase;
  }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function getSelectedScopes(scope) {
    const src = scope || {};
    return ['sound', 'light', 'backline', 'services'].filter(key => Boolean(src[key]));
  }

  function getCategoriesForScope(scope) {
    const scopes = Array.isArray(scope) ? scope : getSelectedScopes(scope);
    const set = new Set();
    scopes.forEach(scopeKey => (CATEGORY_BY_SCOPE[scopeKey] || []).forEach(cat => set.add(cat)));
    return Array.from(set);
  }

  function listPickerItems(scope, inventoryItems) {
    const inventory = db().normalizeItems(inventoryItems || db().getStoredItemsOrDemo());
    const categories = getCategoriesForScope(scope);
    if (!categories.length) return [];
    return inventory.filter(item => item.isActive !== false && categories.includes(item.category));
  }

  function findItem(itemId, inventoryItems) {
    const id = toText(itemId);
    return db().normalizeItems(inventoryItems || db().getStoredItemsOrDemo()).find(item => item.id === id) || null;
  }

  function normalizeOwnLine(line, inventoryItems) {
    const src = line || {};
    const item = findItem(src.itemId || src.id, inventoryItems);
    if (!item) return null;
    const qty = nonNegative(src.qty, 0);
    const availableQty = nonNegative(item.availableQty, 0);
    const deficitQty = Math.max(0, qty - availableQty);
    return {
      id: `quote-eq-${item.id}`,
      itemId: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      type: item.type,
      unit: item.unit,
      qty,
      sourceType: toText(src.sourceType || 'own') || 'own',
      supplierId: toText(src.supplierId || item.supplierId),
      supplierName: toText(src.supplierName || item.supplierName),
      subrentPrice: nonNegative(src.subrentPrice === undefined ? src.subrent_price : src.subrentPrice, 0),
      clientPrice: nonNegative(src.clientPrice === undefined ? src.client_price : src.clientPrice, 0),
      margin: nonNegative(src.margin, 0),
      availableQty,
      deficitQty,
      ok: deficitQty <= 0,
      weightKg: nonNegative(src.weightKg === undefined ? item.weightKg : src.weightKg, item.weightKg),
      powerW: nonNegative(src.powerW === undefined ? item.powerW : src.powerW, item.powerW),
      startupPowerW: nonNegative(src.startupPowerW === undefined ? item.startupPowerW : src.startupPowerW, item.startupPowerW || 0),
      rentalPrice: nonNegative(src.rentalPrice === undefined ? item.rentalPrice : src.rentalPrice, item.rentalPrice),
      note: toText(src.note || src.notes)
    };
  }

  function normalizeManualLine(line) {
    const src = line || {};
    const name = toText(src.name);
    const qty = nonNegative(src.qty, 0);
    if (!name || qty <= 0) return null;
    const sourceType = toText(src.sourceType || 'manual') || 'manual';
    return {
      id: toText(src.id) || `quote-manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: '',
      code: toText(src.code) || (sourceType === 'subrent' ? 'SUBRENT' : 'MANUAL'),
      name,
      category: toText(src.category || 'manual'),
      subcategory: toText(src.subcategory),
      type: 'manual',
      unit: toText(src.unit || 'шт') || 'шт',
      qty,
      sourceType,
      supplierId: toText(src.supplierId || src.supplier_id),
      supplierName: toText(src.supplierName || src.supplier_name),
      subrentPrice: nonNegative(src.subrentPrice || src.subrent_price || src.rentalPrice || src.price, 0),
      clientPrice: nonNegative(src.clientPrice || src.client_price, 0),
      margin: nonNegative(src.margin, 0),
      availableQty: sourceType === 'subrent' ? qty : 0,
      deficitQty: sourceType === 'subrent' ? 0 : qty,
      ok: sourceType === 'subrent',
      weightKg: nonNegative(src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW, 0),
      rentalPrice: nonNegative(src.rentalPrice || src.price, 0),
      note: toText(src.note || src.notes)
    };
  }

  function normalizeLines(input, inventoryItems) {
    const src = input || {};
    const ownLines = (Array.isArray(src.items) ? src.items : []).map(line => normalizeOwnLine(line, inventoryItems)).filter(Boolean);
    const manualLines = (Array.isArray(src.manualItems) ? src.manualItems : []).map(normalizeManualLine).filter(Boolean);
    return ownLines.concat(manualLines).filter(line => nonNegative(line.qty, 0) > 0);
  }

  function sumLines(lines) {
    const safe = Array.isArray(lines) ? lines : [];
    return safe.reduce((acc, row) => {
      const qty = nonNegative(row.qty, 0);
      acc.weightKg += nonNegative(row.weightKg, 0) * qty;
      acc.powerW += nonNegative(row.powerW, 0) * qty;
      acc.startupPowerW += nonNegative(row.startupPowerW, 0) * qty;
      acc.rental += nonNegative(row.rentalPrice, 0) * qty;
      acc.subrent += nonNegative(row.subrentPrice, 0) * qty;
      acc.client += nonNegative(row.clientPrice, 0) * qty;
      acc.margin += nonNegative(row.margin, 0) * qty;
      acc.deficitCount += nonNegative(row.deficitQty, 0) > 0 ? 1 : 0;
      acc.deficitQty += nonNegative(row.deficitQty, 0);
      return acc;
    }, { weightKg: 0, powerW: 0, startupPowerW: 0, rental: 0, subrent: 0, client: 0, margin: 0, deficitCount: 0, deficitQty: 0 });
  }

  function buildEquipmentSection(input, options) {
    const opts = options || {};
    const scope = input && input.scope ? input.scope : opts.scope || {};
    const selectedScopes = getSelectedScopes(scope);
    const inventoryItems = opts.inventoryItems || db().getStoredItemsOrDemo();
    const lines = normalizeLines(input || {}, inventoryItems);
    const totals = sumLines(lines);
    const status = lines.length ? 'configured' : 'placeholder';
    const title = 'Оборудование и услуги';
    return {
      type: 'equipment',
      pickerVersion: PICKER_VERSION,
      status,
      source: 'EquipmentDatabase',
      title,
      summary: lines.length
        ? `${lines.length} поз. · ${totals.weightKg.toFixed(1)} кг · ${(totals.powerW / 1000).toFixed(2)} кВт · дефицит: ${totals.deficitCount}`
        : 'Секция выбрана, позиции оборудования ещё не добавлены.',
      selectedScopes,
      categories: getCategoriesForScope(selectedScopes),
      items: lines,
      manualItems: lines.filter(row => row.sourceType !== 'own' || !row.itemId),
      bomRows: lines.map(row => ({
        id: row.id,
        itemId: row.itemId,
        code: row.code,
        name: row.name,
        qty: row.qty,
        unit: row.unit,
        weightKg: row.weightKg * row.qty,
        powerW: row.powerW * row.qty,
        startupPowerW: row.startupPowerW * row.qty,
        sourceType: row.sourceType,
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        subrentPrice: row.subrentPrice,
        clientPrice: row.clientPrice,
        margin: row.margin,
        availableQty: row.availableQty,
        deficitQty: row.deficitQty,
        ok: row.ok,
        note: row.note
      })),
      rental: 0,
      equipmentRental: totals.rental,
      subrentCost: totals.subrent,
      clientSubrentTotal: totals.client,
      subrentMargin: totals.margin,
      weightKg: totals.weightKg,
      powerW: totals.powerW,
      startupPowerW: totals.startupPowerW,
      deficitCount: totals.deficitCount,
      deficitQty: totals.deficitQty,
      updatedAt: new Date().toISOString()
    };
  }

  function getInputFromSection(section, scope) {
    const sec = section || {};
    const lines = Array.isArray(sec.items) ? sec.items : [];
    return {
      scope: scope || {},
      items: lines.filter(line => line.itemId).map(line => ({ itemId: line.itemId, qty: line.qty, sourceType: line.sourceType, supplierId: line.supplierId, supplierName: line.supplierName, subrentPrice: line.subrentPrice, clientPrice: line.clientPrice, margin: line.margin })),
      manualItems: lines.filter(line => !line.itemId).map(line => clone(line))
    };
  }

  ROOT.QuoteEquipmentPicker = {
    PICKER_VERSION,
    CATEGORY_BY_SCOPE,
    getSelectedScopes,
    getCategoriesForScope,
    listPickerItems,
    normalizeLines,
    buildEquipmentSection,
    getInputFromSection,
    sumLines
  };
})();
