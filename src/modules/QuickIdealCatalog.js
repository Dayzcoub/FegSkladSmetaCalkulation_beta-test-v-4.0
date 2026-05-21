// FEG Stage PRO v3.17.38 — QuickIdealCatalog
// Local ideal catalog for quick technical calculators. It mirrors the shared
// construction keys but intentionally does not bind quick rows to the real
// equipment database, warehouse stock, reservations or deficits.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUICK_IDEAL_CATALOG_VERSION = '3.17.38';

  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }
  function nowIso() { return new Date().toISOString(); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function normalizeKey(value) { return toText(value).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').replace(/^_+|_+$/g, '') || 'item'; }

  function decorateQuickItem(item, sectionKey) {
    const src = clone(item || {}) || {};
    const key = toText(src.key || (src.meta && src.meta.systemPartKey) || src.id || src.code || src.name) || 'item';
    const id = `quick_ideal_${normalizeKey(key)}`;
    return Object.assign({}, src, {
      id,
      itemId: id,
      item_id: id,
      inventoryItemId: '',
      inventory_item_id: '',
      code: src.code ? `Q-${src.code}` : `Q-${normalizeKey(key).toUpperCase()}`,
      manufacturer: src.manufacturer || 'FEG',
      model: src.model || '',
      sourceType: 'quick_ideal',
      source_type: 'quick_ideal',
      sourceSystem: 'quick_ideal_catalog',
      source_system: 'quick_ideal_catalog',
      stockQty: null,
      stock_qty: null,
      reservedQty: null,
      reserved_qty: null,
      availableQty: null,
      available_qty: null,
      isActive: true,
      createdAt: src.createdAt || nowIso(),
      updatedAt: nowIso(),
      meta: Object.assign({}, clone(src.meta || {}) || {}, {
        systemPart: true,
        systemPartKey: key,
        quickIdealCatalog: true,
        catalogMode: 'quick',
        sectionType: sectionKey || src.category || '',
        quickIdealCatalogVersion: QUICK_IDEAL_CATALOG_VERSION
      }),
      notes: [src.notes || '', 'Локальная идеальная позиция быстрого технического расчёта: не проверяется по складу и не создаёт дефицит.'].filter(Boolean).join(' ')
    });
  }

  function getStructureDefinitions() {
    const structure = ROOT.V4StructureConfigurator;
    if (structure && structure.getSystemPartDefinitions) return structure.getSystemPartDefinitions();
    return [];
  }

  function getStructureItems(sectionKey, options) {
    const key = toText(sectionKey).toLowerCase();
    const definitions = Array.isArray(options && options.structureParts) ? options.structureParts : getStructureDefinitions();
    return definitions
      .filter(item => key === 'stage' ? item.category === 'stage' : key === 'truss' ? item.category === 'truss' : true)
      .map(item => decorateQuickItem(item, key || item.category || 'structure'));
  }

  function getLedItems() {
    const base = [
      { key:'led_cabinet', id:'led-cabinet', code:'LED-901', name:'LED кабинет', category:'led', subcategory:'кабинеты', type:'led_cabinet', unit:'шт', weightKg:14, powerW:320 },
      { key:'led_power_link_220', id:'led-power-link-220', code:'LED-902', name:'Кабель link 220 для LED', category:'led', subcategory:'питание', type:'cable', unit:'шт' },
      { key:'led_rj45_link', id:'led-rj45-link', code:'LED-903', name:'Кабель RJ45 link для LED', category:'led', subcategory:'сигнал', type:'cable', unit:'шт' },
      { key:'led_powercon_schuko', id:'led-powercon-schuko', code:'LED-904', name:'Кабель PowerCon-Schuko для LED', category:'led', subcategory:'питание', type:'cable', unit:'шт' },
      { key:'led_bracket_cookie', id:'led-bracket-cookie', code:'LED-905', name:'Скоба / печенька LED', category:'led', subcategory:'крепёж', type:'led_fastener', unit:'шт' },
      { key:'led_m8_bolt', id:'led-m8-bolt', code:'LED-906', name:'Болт М8 для LED', category:'led', subcategory:'крепёж', type:'led_fastener', unit:'шт' },
      { key:'led_m8x20_bolt', id:'led-m8x20-bolt', code:'LED-907', name:'Болт М8×20 для Hanging Bar', category:'led', subcategory:'крепёж', type:'led_fastener', unit:'шт' },
      { key:'led_leg', id:'led-leg', code:'LED-908', name:'Нога LED экрана', category:'led', subcategory:'опоры', type:'led_support', unit:'шт' },
      { key:'led_hanging_bar', id:'led-hanging-bar', code:'LED-909', name:'Подвес для LED экрана Hanging Bar', category:'led', subcategory:'подвес', type:'led_rigging', unit:'шт' },
      { key:'led_spanset', id:'led-spanset', code:'LED-910', name:'Спанцет / стропа для LED', category:'led', subcategory:'подвес', type:'rigging', unit:'шт' },
      { key:'led_shackle', id:'led-shackle', code:'LED-911', name:'Шакл для LED подвеса', category:'led', subcategory:'подвес', type:'rigging', unit:'шт' }
    ];
    return base.map(item => decorateQuickItem(item, 'led'));
  }

  function getItemsForSection(sectionKey, options) {
    const key = toText(sectionKey || 'all').toLowerCase();
    if (key === 'led') return getLedItems();
    if (key === 'stage' || key === 'truss' || key === 'structure') return getStructureItems(key === 'structure' ? '' : key, options || {});
    return getStructureItems('', options || {}).concat(getLedItems());
  }

  function isQuickIdealRow(row) {
    const src = row || {};
    return toText(src.sourceType || src.source_type) === 'quick_ideal' || !!(src.meta && src.meta.quickIdealCatalog);
  }

  function decorateBomRow(row, sectionKey) {
    const src = clone(row || {}) || {};
    return Object.assign(src, {
      sourceType: 'quick_ideal',
      source_type: 'quick_ideal',
      sourceSystem: 'quick_ideal_catalog',
      source_system: 'quick_ideal_catalog',
      inventoryStatus: 'quick_ideal',
      inventory_status: 'quick_ideal',
      deficitQty: 0,
      deficit_qty: 0,
      subrentQty: 0,
      subrent_qty: 0,
      ok: true,
      meta: Object.assign({}, clone(src.meta || {}) || {}, {
        quickIdealCatalog: true,
        catalogMode: 'quick',
        sectionType: sectionKey || src.sectionKey || src.section_key || '',
        quickIdealCatalogVersion: QUICK_IDEAL_CATALOG_VERSION
      })
    });
  }

  ROOT.QuickIdealCatalog = {
    QUICK_IDEAL_CATALOG_VERSION,
    decorateQuickItem,
    decorateBomRow,
    getItemsForSection,
    getStructureItems,
    getLedItems,
    isQuickIdealRow
  };
})();
