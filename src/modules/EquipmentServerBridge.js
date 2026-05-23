(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'fegEquipmentItemsV4';
  const CODE_KEY = 'fegEquipmentCodeCatalogVersionV4';
  const META_KEY = 'packitEquipmentServerCacheMetaV1';

  function text(value) { return String(value == null ? '' : value).trim(); }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

  function mapRow(row) {
    const src = row || {};
    return {
      id: text(src.id || src.itemKey || src.code),
      workspaceId: 'MAIN',
      category: text(src.category),
      subcategory: text(src.subcategory),
      type: text(src.type),
      code: text(src.code),
      name: text(src.name),
      manufacturer: text(src.manufacturer),
      model: text(src.model),
      unit: text(src.unit || 'шт'),
      stockQty: num(src.stockQty),
      reservedQty: num(src.reservedQty),
      availableQty: num(src.availableQty),
      weightKg: num(src.weightKg),
      powerW: num(src.powerW),
      startupPowerW: num(src.startupPowerW),
      rentalPrice: num(src.rentalPrice),
      replacementCost: num(src.replacementCost),
      isActive: src.isActive !== false,
      sourceType: 'own',
      supplierId: '',
      supplierName: '',
      notes: 'postgres api',
      meta: { sourceSystem: 'postgres', serverId: text(src.serverId), itemKey: text(src.itemKey) },
      schemaVersion: 3,
      updatedAt: new Date().toISOString()
    };
  }

  function normalize(rows) {
    const db = ROOT.EquipmentDatabase;
    const mapped = (Array.isArray(rows) ? rows : []).map(mapRow).filter(row => row.id && row.name && row.category);
    return db && typeof db.normalizeItems === 'function' ? db.normalizeItems(mapped) : mapped;
  }

  async function sync() {
    if (!GLOBAL.fetch || typeof localStorage === 'undefined') return;
    try {
      const response = await GLOBAL.fetch('/api/equipment', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const items = normalize(payload.items || []);
      if (!items.length) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(CODE_KEY, 'category-prefix-v1');
      localStorage.setItem(META_KEY, JSON.stringify({ source: 'postgres-api', count: items.length, syncedAt: new Date().toISOString() }));
      try { GLOBAL.dispatchEvent(new CustomEvent('packit:equipment-server-sync', { detail: { count: items.length } })); } catch (_) {}
    } catch (error) {
      try { console.warn('[EquipmentServerBridge] sync failed', error); } catch (_) {}
    }
  }

  ROOT.EquipmentServerBridge = { version: '1.0.0', sync };
  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', sync, { once: true });
  else sync();
})();
