(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUPPLIER_DIRECTORY_VERSION = '1.0.0';
  const SUPPLIER_STORAGE_KEY = 'feg.v4.supplierDirectory.v1';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function slug(value) {
    const raw = toText(value).toLowerCase().replace(/ё/g, 'е');
    return raw.replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '') || 'supplier';
  }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function normalizeSupplier(input) {
    const src = input || {};
    const name = toText(src.name || src.supplierName || src.supplier_name || 'Поставщик');
    const id = toText(src.id || src.supplierId || src.supplier_id) || `sup-${slug(name)}`;
    const categories = Array.isArray(src.categories) ? src.categories.map(toText).filter(Boolean) : [];
    return {
      id,
      workspaceId: toText(src.workspaceId || src.workspace_id || 'demo-workspace') || 'demo-workspace',
      name,
      legalName: toText(src.legalName || src.legal_name),
      type: toText(src.type || 'subrent') || 'subrent',
      categories,
      contactName: toText(src.contactName || src.contact_name),
      phone: toText(src.phone),
      email: toText(src.email),
      website: toText(src.website),
      defaultMarginRate: nonNegative(src.defaultMarginRate == null ? src.default_margin_rate : src.defaultMarginRate, 0.25),
      paymentTerms: toText(src.paymentTerms || src.payment_terms),
      notes: toText(src.notes || src.note),
      isActive: (src.isActive == null ? src.is_active : src.isActive) !== false,
      source: toText(src.source || 'local') || 'local',
      meta: src.meta && typeof src.meta === 'object' ? clone(src.meta) : {},
      updatedAt: toText(src.updatedAt || src.updated_at) || new Date().toISOString()
    };
  }

  function normalizeSuppliers(input) {
    const seen = new Set();
    return (Array.isArray(input) ? input : []).map(normalizeSupplier).filter(row => {
      const key = row.id.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  function inferCategoryFromEquipment(item) {
    const src = item || {};
    if (src.category) return toText(src.category);
    if (src.type === 'sound') return 'sound_pa';
    if (src.type === 'light_fixture') return 'light';
    return 'equipment';
  }

  function buildFromEquipmentItems(items) {
    const byName = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      const name = toText(item.supplierName || item.supplier_name);
      if (!name) return;
      const key = name.toLowerCase();
      const prev = byName.get(key) || {
        id: `sup-${slug(name)}`,
        name,
        type: item.sourceType === 'subrent' ? 'subrent' : 'own_supplier',
        categories: [],
        source: item.meta && item.meta.excelSource ? 'excel-import' : 'equipment-database',
        notes: 'Создано автоматически из базы оборудования.'
      };
      const category = inferCategoryFromEquipment(item);
      if (category && !prev.categories.includes(category)) prev.categories.push(category);
      byName.set(key, prev);
    });
    return normalizeSuppliers(Array.from(byName.values()));
  }

  function getBuiltInSuppliers() {
    const equipment = ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.getDemoItems ? ROOT.EquipmentDatabase.getDemoItems() : [];
    const inferred = buildFromEquipmentItems(equipment);
    const defaults = [
      { id: 'sup-feg-stock', name: 'FEG собственный склад', type: 'own', categories: ['stage', 'truss', 'led', 'commutation'], defaultMarginRate: 0, source: 'builtin' },
      { id: 'sup-manual', name: 'Поставщик не указан', type: 'manual', categories: ['manual'], defaultMarginRate: 0.25, source: 'builtin' }
    ];
    return normalizeSuppliers(defaults.concat(inferred));
  }

  function getStoredSuppliersOrDemo() {
    try {
      if (typeof localStorage === 'undefined') return getBuiltInSuppliers();
      const raw = localStorage.getItem(SUPPLIER_STORAGE_KEY);
      if (!raw) return getBuiltInSuppliers();
      const parsed = JSON.parse(raw);
      const normalized = normalizeSuppliers(parsed);
      return normalized.length ? normalized : getBuiltInSuppliers();
    } catch (_) {
      return getBuiltInSuppliers();
    }
  }

  function saveSuppliers(suppliers) {
    const normalized = normalizeSuppliers(suppliers);
    if (typeof localStorage !== 'undefined') localStorage.setItem(SUPPLIER_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function listSuppliers(options) {
    const opts = options || {};
    const query = toText(opts.query).toLowerCase();
    const type = toText(opts.type);
    const category = toText(opts.category);
    const onlyActive = opts.onlyActive !== false;
    return normalizeSuppliers(Array.isArray(opts.suppliers) ? opts.suppliers : getStoredSuppliersOrDemo()).filter(supplier => {
      if (onlyActive && !supplier.isActive) return false;
      if (type && supplier.type !== type) return false;
      if (category && !supplier.categories.includes(category)) return false;
      if (query) {
        const haystack = `${supplier.id} ${supplier.name} ${supplier.legalName} ${supplier.phone} ${supplier.email} ${supplier.categories.join(' ')} ${supplier.notes}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function findSupplier(identifier, suppliers) {
    const needle = toText(identifier).toLowerCase();
    if (!needle) return null;
    return normalizeSuppliers(suppliers || getStoredSuppliersOrDemo()).find(row => row.id.toLowerCase() === needle || row.name.toLowerCase() === needle) || null;
  }

  function upsertSupplier(input, suppliers) {
    const list = normalizeSuppliers(suppliers || getStoredSuppliersOrDemo());
    const normalized = normalizeSupplier({ ...input, updatedAt: new Date().toISOString() });
    const idx = list.findIndex(row => row.id === normalized.id || row.name.toLowerCase() === normalized.name.toLowerCase());
    if (idx >= 0) list[idx] = { ...list[idx], ...normalized };
    else list.push(normalized);
    return saveSuppliers(list);
  }

  function exportSuppliers(suppliers) {
    return JSON.stringify(normalizeSuppliers(suppliers || getStoredSuppliersOrDemo()), null, 2);
  }

  ROOT.SupplierDirectory = {
    SUPPLIER_DIRECTORY_VERSION,
    SUPPLIER_STORAGE_KEY,
    normalizeSupplier,
    normalizeSuppliers,
    buildFromEquipmentItems,
    getBuiltInSuppliers,
    getStoredSuppliersOrDemo,
    saveSuppliers,
    listSuppliers,
    findSupplier,
    upsertSupplier,
    exportSuppliers
  };
})();
