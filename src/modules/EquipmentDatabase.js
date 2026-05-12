(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const EQUIPMENT_STORAGE_KEY = 'fegEquipmentItemsV4';
  const EQUIPMENT_SCHEMA_VERSION = 3;
  const EQUIPMENT_SYNC_PREVIEW_VERSION = '3.12.0';
  const EQUIPMENT_CODE_CATALOG_VERSION = 'category-prefix-v1';
  const EQUIPMENT_CODE_MIGRATION_KEY = 'fegEquipmentCodeCatalogVersionV4';

  const CATEGORY_TREE = Object.freeze([
    { id: 'stage', name: 'Сцены', subcategories: ['настил', 'опоры', 'рамы', 'лестницы', 'ограждения', 'юбки'] },
    { id: 'truss', name: 'Фермы', subcategories: ['прямые фермы', 'углы', 'кубы', 'базы/блины', 'коннекторы', 'крепёж'] },
    { id: 'led', name: 'LED', subcategories: ['кабинеты', 'процессоры', 'питание', 'сигнал', 'крепёж'] },
    { id: 'light', name: 'Свет', subcategories: ['wash', 'beam', 'spot/profile', 'blinder', 'strobe', 'pixel bar', 'led par', 'dmx/artnet', 'стойки/подвес'] },
    { id: 'sound_pa', name: 'Звук ПА', subcategories: ['line array', 'сабвуферы', 'усилители', 'процессоры', 'front fill', 'delay', 'стойки'] },
    { id: 'consoles', name: 'Пульты', subcategories: ['микшерные пульты', 'stagebox', 'карты расширения'] },
    { id: 'monitoring', name: 'Мониторинг', subcategories: ['wedge', 'iem', 'радиосистемы', 'headphone amps'] },
    { id: 'backline', name: 'Бэклайн', subcategories: ['микрофоны', 'di-box', 'барабаны', 'стойки', 'пюпитры', 'dsp', 'роутеры', 'ipad'] },
    { id: 'consumables', name: 'Расходники', subcategories: ['gaffer', 'батарейки', 'стяжки', 'плёнка', 'крепёж'] },
    { id: 'services', name: 'Услуги', subcategories: ['звукорежиссёр', 'светорежиссёр', 'экранщик', 'монтажник', 'грузчик', 'водитель', 'проектирование'] },
    { id: 'commutation', name: 'Коммутация', subcategories: ['xlr', 'powercon', 'dmx', 'rj45', 'socapex', 'schuko', 'cee', 'hdmi/sdi', 'оптика'] }
  ]);

  const CATEGORY_CODE_PREFIXES = Object.freeze({
    stage: 'STG',
    truss: 'TRS',
    led: 'LED',
    light: 'LGT',
    sound_pa: 'SND',
    consoles: 'MIX',
    monitoring: 'MON',
    backline: 'BKL',
    consumables: 'CNS',
    services: 'SRV',
    commutation: 'COM'
  });

  const CATEGORY_ALIASES = Object.freeze({
    stg: 'stage',
    stage: 'stage',
    'сцена': 'stage',
    'сцены': 'stage',
    'настил': 'stage',
    'подиум': 'stage',
    trs: 'truss',
    truss: 'truss',
    'ферма': 'truss',
    'фермы': 'truss',
    'ферменные конструкции': 'truss',
    'трасс': 'truss',
    led: 'led',
    'лед': 'led',
    'экран': 'led',
    'экраны': 'led',
    'led экран': 'led',
    'led экраны': 'led',
    lgt: 'light',
    light: 'light',
    lighting: 'light',
    'свет': 'light',
    'световое оборудование': 'light',
    snd: 'sound_pa',
    sound: 'sound_pa',
    audio: 'sound_pa',
    pa: 'sound_pa',
    'звук': 'sound_pa',
    'звук па': 'sound_pa',
    'звуковое оборудование': 'sound_pa',
    mix: 'consoles',
    console: 'consoles',
    consoles: 'consoles',
    mixer: 'consoles',
    mixers: 'consoles',
    'пульт': 'consoles',
    'пульты': 'consoles',
    'микшер': 'consoles',
    'микшеры': 'consoles',
    mon: 'monitoring',
    monitor: 'monitoring',
    monitoring: 'monitoring',
    'монитор': 'monitoring',
    'мониторы': 'monitoring',
    'мониторинг': 'monitoring',
    bkl: 'backline',
    backline: 'backline',
    'бэклайн': 'backline',
    'беклайн': 'backline',
    com: 'commutation',
    commutation: 'commutation',
    cable: 'commutation',
    cables: 'commutation',
    'коммутация': 'commutation',
    'кабели': 'commutation',
    'кабель': 'commutation',
    srv: 'services',
    service: 'services',
    services: 'services',
    'услуга': 'services',
    'услуги': 'services',
    'работы': 'services',
    cns: 'consumables',
    consumables: 'consumables',
    consumable: 'consumables',
    'расходник': 'consumables',
    'расходники': 'consumables',
    'расходные материалы': 'consumables'
  });

  const CATEGORY_SUBCATEGORY_LOOKUP = Object.freeze(CATEGORY_TREE.reduce((acc, cat) => {
    acc[cat.id] = Object.freeze((cat.subcategories || []).reduce((map, sub) => {
      map[normalizeCategoryToken(sub)] = sub;
      return map;
    }, {}));
    return acc;
  }, {}));

  const ITEM_TYPES = Object.freeze({
    STAGE_DECK: 'stage_deck',
    STAGE_SUPPORT: 'stage_support',
    STAGE_PART: 'stage_part',
    TRUSS_SEGMENT: 'truss_segment',
    TRUSS_NODE: 'truss_node',
    TRUSS_BASE: 'truss_base',
    TRUSS_CONNECTOR: 'truss_connector',
    LED_CABINET: 'led_cabinet',
    LED_ACCESSORY: 'led_accessory',
    LIGHT_FIXTURE: 'light_fixture',
    SOUND: 'sound',
    AUDIO_CONSOLE: 'audio_console',
    MONITORING: 'monitoring',
    BACKLINE: 'backline',
    CABLE: 'cable',
    SERVICE: 'service',
    CONSUMABLE: 'consumable',
    MANUAL: 'manual'
  });

  const ITEM_TYPE_DEFINITIONS = Object.freeze({
    [ITEM_TYPES.STAGE_DECK]: Object.freeze({ label: 'Настил сцены', categories: ['stage'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.STAGE_SUPPORT]: Object.freeze({ label: 'Опора сцены', categories: ['stage'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.STAGE_PART]: Object.freeze({ label: 'Элемент сцены', categories: ['stage'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.TRUSS_SEGMENT]: Object.freeze({ label: 'Прямая ферма', categories: ['truss'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.TRUSS_NODE]: Object.freeze({ label: 'Угол / куб фермы', categories: ['truss'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.TRUSS_BASE]: Object.freeze({ label: 'База / блин фермы', categories: ['truss'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.TRUSS_CONNECTOR]: Object.freeze({ label: 'Крепёж фермы', categories: ['truss'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: false }),
    [ITEM_TYPES.LED_CABINET]: Object.freeze({ label: 'LED кабинет', categories: ['led'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.LED_ACCESSORY]: Object.freeze({ label: 'LED аксессуар / крепёж', categories: ['led'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: false }),
    [ITEM_TYPES.LIGHT_FIXTURE]: Object.freeze({ label: 'Световой прибор', categories: ['light'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.SOUND]: Object.freeze({ label: 'Звуковое оборудование', categories: ['sound_pa', 'consoles', 'monitoring', 'backline'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.AUDIO_CONSOLE]: Object.freeze({ label: 'Микшерный пульт / stagebox', categories: ['consoles'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.MONITORING]: Object.freeze({ label: 'Мониторинг', categories: ['monitoring'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.BACKLINE]: Object.freeze({ label: 'Бэклайн', categories: ['backline'], defaultUnit: 'шт', stockTracked: true, powerTracked: true, priceTracked: true }),
    [ITEM_TYPES.CABLE]: Object.freeze({ label: 'Кабель / коммутация', categories: ['commutation', 'led', 'light', 'sound_pa', 'consoles', 'monitoring', 'backline'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.SERVICE]: Object.freeze({ label: 'Услуга / работа', categories: ['services'], defaultUnit: 'смена', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.CONSUMABLE]: Object.freeze({ label: 'Расходник', categories: ['consumables', 'truss', 'led'], defaultUnit: 'шт', stockTracked: true, powerTracked: false, priceTracked: true }),
    [ITEM_TYPES.MANUAL]: Object.freeze({ label: 'Ручная позиция', categories: [], defaultUnit: 'шт', stockTracked: false, powerTracked: false, priceTracked: true, custom: true })
  });

  const TYPE_ALIASES = Object.freeze({
    deck: ITEM_TYPES.STAGE_DECK,
    'stage deck': ITEM_TYPES.STAGE_DECK,
    'настил': ITEM_TYPES.STAGE_DECK,
    'подиум': ITEM_TYPES.STAGE_DECK,
    leg: ITEM_TYPES.STAGE_SUPPORT,
    support: ITEM_TYPES.STAGE_SUPPORT,
    'опора': ITEM_TYPES.STAGE_SUPPORT,
    'опоры': ITEM_TYPES.STAGE_SUPPORT,
    'нога': ITEM_TYPES.STAGE_SUPPORT,
    'ноги': ITEM_TYPES.STAGE_SUPPORT,
    truss: ITEM_TYPES.TRUSS_SEGMENT,
    segment: ITEM_TYPES.TRUSS_SEGMENT,
    'ферма': ITEM_TYPES.TRUSS_SEGMENT,
    'ферменный сегмент': ITEM_TYPES.TRUSS_SEGMENT,
    corner: ITEM_TYPES.TRUSS_NODE,
    cube: ITEM_TYPES.TRUSS_NODE,
    'угол': ITEM_TYPES.TRUSS_NODE,
    'куб': ITEM_TYPES.TRUSS_NODE,
    base: ITEM_TYPES.TRUSS_BASE,
    plate: ITEM_TYPES.TRUSS_BASE,
    'база': ITEM_TYPES.TRUSS_BASE,
    'блин': ITEM_TYPES.TRUSS_BASE,
    connector: ITEM_TYPES.TRUSS_CONNECTOR,
    pin: ITEM_TYPES.TRUSS_CONNECTOR,
    splint: ITEM_TYPES.TRUSS_CONNECTOR,
    'коннектор': ITEM_TYPES.TRUSS_CONNECTOR,
    'крепеж фермы': ITEM_TYPES.TRUSS_CONNECTOR,
    cabinet: ITEM_TYPES.LED_CABINET,
    'led cabinet': ITEM_TYPES.LED_CABINET,
    'кабинет': ITEM_TYPES.LED_CABINET,
    'лед кабинет': ITEM_TYPES.LED_CABINET,
    accessory: ITEM_TYPES.LED_ACCESSORY,
    'led accessory': ITEM_TYPES.LED_ACCESSORY,
    'крепеж led': ITEM_TYPES.LED_ACCESSORY,
    fixture: ITEM_TYPES.LIGHT_FIXTURE,
    light: ITEM_TYPES.LIGHT_FIXTURE,
    'прибор': ITEM_TYPES.LIGHT_FIXTURE,
    'световой прибор': ITEM_TYPES.LIGHT_FIXTURE,
    audio: ITEM_TYPES.SOUND,
    sound: ITEM_TYPES.SOUND,
    speaker: ITEM_TYPES.SOUND,
    'звук': ITEM_TYPES.SOUND,
    'акустика': ITEM_TYPES.SOUND,
    console: ITEM_TYPES.AUDIO_CONSOLE,
    mixer: ITEM_TYPES.AUDIO_CONSOLE,
    stagebox: ITEM_TYPES.AUDIO_CONSOLE,
    'пульт': ITEM_TYPES.AUDIO_CONSOLE,
    'микшер': ITEM_TYPES.AUDIO_CONSOLE,
    monitor: ITEM_TYPES.MONITORING,
    iem: ITEM_TYPES.MONITORING,
    wedge: ITEM_TYPES.MONITORING,
    'мониторинг': ITEM_TYPES.MONITORING,
    backline: ITEM_TYPES.BACKLINE,
    'бэклайн': ITEM_TYPES.BACKLINE,
    cable: ITEM_TYPES.CABLE,
    cables: ITEM_TYPES.CABLE,
    wire: ITEM_TYPES.CABLE,
    'кабель': ITEM_TYPES.CABLE,
    'кабели': ITEM_TYPES.CABLE,
    'коммутация': ITEM_TYPES.CABLE,
    service: ITEM_TYPES.SERVICE,
    services: ITEM_TYPES.SERVICE,
    'услуга': ITEM_TYPES.SERVICE,
    'услуги': ITEM_TYPES.SERVICE,
    'работа': ITEM_TYPES.SERVICE,
    consumable: ITEM_TYPES.CONSUMABLE,
    consumables: ITEM_TYPES.CONSUMABLE,
    'расходник': ITEM_TYPES.CONSUMABLE,
    'расходники': ITEM_TYPES.CONSUMABLE,
    manual: ITEM_TYPES.MANUAL,
    custom: ITEM_TYPES.MANUAL,
    'ручная позиция': ITEM_TYPES.MANUAL
  });

  function makeId(prefix) {
    return `${prefix || 'eq'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function pick(src, camel, snake, fallback) {
    if (src && Object.prototype.hasOwnProperty.call(src, camel)) return src[camel];
    if (src && Object.prototype.hasOwnProperty.call(src, snake)) return src[snake];
    return fallback;
  }

  function getCategory(id) {
    return CATEGORY_TREE.find(cat => cat.id === id) || null;
  }

  function normalizeCategoryToken(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[._\/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCategoryId(value) {
    const raw = normalizeText(value);
    if (!raw) return '';
    if (getCategory(raw)) return raw;
    return CATEGORY_ALIASES[normalizeCategoryToken(raw)] || '';
  }

  function normalizeSubcategory(categoryId, value) {
    const category = getCategory(categoryId);
    const raw = normalizeText(value);
    if (!category) return raw;
    if (!raw) return category.subcategories[0] || '';
    const token = normalizeCategoryToken(raw);
    const lookup = CATEGORY_SUBCATEGORY_LOOKUP[categoryId] || {};
    return lookup[token] || raw;
  }

  function isKnownSubcategory(categoryId, value) {
    const raw = normalizeText(value);
    if (!getCategory(categoryId) || !raw) return false;
    const lookup = CATEGORY_SUBCATEGORY_LOOKUP[categoryId] || {};
    return Object.prototype.hasOwnProperty.call(lookup, normalizeCategoryToken(raw));
  }

  function getCategoryCodePrefix(categoryId) {
    const id = getCategory(categoryId) ? categoryId : 'stage';
    return CATEGORY_CODE_PREFIXES[id] || 'EQP';
  }

  function generateNextCode(categoryId, items) {
    const prefix = getCategoryCodePrefix(categoryId);
    const source = normalizeItems(items || getStoredItemsOrDemo());
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    const max = source.reduce((acc, item) => {
      const match = String(item.code || '').trim().match(re);
      if (!match) return acc;
      const value = Number(match[1]);
      return Number.isFinite(value) ? Math.max(acc, value) : acc;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }


  function collectLegacyCodes(item) {
    const meta = item && item.meta && typeof item.meta === 'object' ? item.meta : {};
    const values = [];
    if (meta.legacyCode) values.push(meta.legacyCode);
    if (meta.oldCode) values.push(meta.oldCode);
    if (meta.importCode) values.push(meta.importCode);
    if (Array.isArray(meta.legacyCodes)) values.push(...meta.legacyCodes);
    return Array.from(new Set(values.map(value => normalizeText(value)).filter(Boolean)));
  }

  function isGeneratedCodeForCategory(item) {
    const prefix = getCategoryCodePrefix(item && item.category);
    const re = new RegExp(`^${prefix}-(\\d{3,})$`, 'i');
    return re.test(normalizeText(item && item.code));
  }

  function needsCodeCatalogNormalization(items) {
    return normalizeItems(items || []).some(item => !isGeneratedCodeForCategory(item));
  }

  function recodeItemsByCategory(items, opts) {
    const options = opts || {};
    const counters = {};
    const source = normalizeItems(items || []);
    return source.map(item => {
      const prefix = getCategoryCodePrefix(item.category);
      counters[prefix] = (counters[prefix] || 0) + 1;
      const nextCode = `${prefix}-${String(counters[prefix]).padStart(3, '0')}`;
      const previousCode = normalizeText(item.code);
      const legacyCodes = collectLegacyCodes(item);
      if (previousCode && previousCode !== nextCode) legacyCodes.unshift(previousCode);
      const meta = { ...(item.meta || {}), codeSeries: EQUIPMENT_CODE_CATALOG_VERSION };
      const uniqueLegacy = Array.from(new Set(legacyCodes.filter(Boolean)));
      if (uniqueLegacy.length) {
        meta.legacyCode = uniqueLegacy[0];
        meta.legacyCodes = uniqueLegacy;
      }
      return normalizeItem({ ...item, code: nextCode, meta, updatedAt: options.updatedAt || item.updatedAt || new Date().toISOString() });
    });
  }

  function normalizeTypeToken(value) {
    return normalizeCategoryToken(value);
  }

  function normalizeItemType(value) {
    const raw = normalizeText(value);
    if (!raw) return '';
    if (Object.values(ITEM_TYPES).includes(raw)) return raw;
    return TYPE_ALIASES[normalizeTypeToken(raw)] || '';
  }

  function getItemTypeDefinition(type) {
    return ITEM_TYPE_DEFINITIONS[normalizeItemType(type) || type] || ITEM_TYPE_DEFINITIONS[ITEM_TYPES.MANUAL];
  }

  function inferItemType(input, categoryId, subcategory) {
    const src = input || {};
    const category = normalizeCategoryId(categoryId || src.category) || categoryId || 'stage';
    const sub = normalizeCategoryToken(subcategory || src.subcategory);
    const text = normalizeCategoryToken(`${src.name || ''} ${src.model || ''} ${src.notes || ''}`);
    if (category === 'stage') {
      if (sub.includes('настил') || text.includes('настил')) return ITEM_TYPES.STAGE_DECK;
      if (sub.includes('опор') || text.includes('нога') || text.includes('опора')) return ITEM_TYPES.STAGE_SUPPORT;
      return ITEM_TYPES.STAGE_PART;
    }
    if (category === 'truss') {
      if (sub.includes('прям') || text.includes('ферма')) return ITEM_TYPES.TRUSS_SEGMENT;
      if (sub.includes('уг') || sub.includes('куб') || text.includes('куб') || text.includes('угол')) return ITEM_TYPES.TRUSS_NODE;
      if (sub.includes('баз') || sub.includes('блин') || text.includes('база') || text.includes('блин')) return ITEM_TYPES.TRUSS_BASE;
      if (sub.includes('креп') || sub.includes('коннектор') || text.includes('c2-') || text.includes('c3-') || text.includes('шплинт')) return ITEM_TYPES.TRUSS_CONNECTOR;
      return ITEM_TYPES.TRUSS_SEGMENT;
    }
    if (category === 'led') {
      if (sub.includes('кабинет') || text.includes('кабинет')) return ITEM_TYPES.LED_CABINET;
      if (sub.includes('питание') || sub.includes('сигнал') || text.includes('кабель') || text.includes('powercon') || text.includes('rj45')) return ITEM_TYPES.CABLE;
      return ITEM_TYPES.LED_ACCESSORY;
    }
    if (category === 'light') return ITEM_TYPES.LIGHT_FIXTURE;
    if (category === 'sound_pa') return ITEM_TYPES.SOUND;
    if (category === 'consoles') return ITEM_TYPES.AUDIO_CONSOLE;
    if (category === 'monitoring') return ITEM_TYPES.MONITORING;
    if (category === 'backline') return ITEM_TYPES.BACKLINE;
    if (category === 'commutation') return ITEM_TYPES.CABLE;
    if (category === 'services') return ITEM_TYPES.SERVICE;
    if (category === 'consumables') return ITEM_TYPES.CONSUMABLE;
    return ITEM_TYPES.MANUAL;
  }

  function getDefaultTypeForCategory(categoryId, subcategory) {
    return inferItemType({}, categoryId, subcategory);
  }

  function getType(value, categoryId, subcategory, source) {
    const normalized = normalizeItemType(value);
    return normalized || inferItemType(source || {}, categoryId, subcategory);
  }

  function isTypeCompatibleWithCategory(type, categoryId) {
    const normalizedType = normalizeItemType(type) || type;
    if (!normalizedType || normalizedType === ITEM_TYPES.MANUAL) return true;
    const category = normalizeCategoryId(categoryId) || categoryId;
    const def = ITEM_TYPE_DEFINITIONS[normalizedType];
    if (!def || !Array.isArray(def.categories) || !def.categories.length) return true;
    return def.categories.includes(category);
  }

  function getTypeOptionsForCategory(categoryId) {
    const category = normalizeCategoryId(categoryId) || categoryId || '';
    return Object.values(ITEM_TYPES).filter(type => type === ITEM_TYPES.MANUAL || isTypeCompatibleWithCategory(type, category));
  }

  function normalizeItem(input) {
    const src = input || {};
    const categoryCandidate = normalizeText(src.category);
    const normalizedCategory = normalizeCategoryId(categoryCandidate);
    const category = normalizedCategory || 'stage';
    const categoryInfo = getCategory(category);
    const type = getType(src.type, category, src.subcategory, src);
    const typeDefinition = getItemTypeDefinition(type);
    const stockQty = Math.max(0, toNumber(pick(src, 'stockQty', 'stock_qty', 0), 0));
    const reservedQty = Math.max(0, Math.min(stockQty, toNumber(pick(src, 'reservedQty', 'reserved_qty', 0), 0)));
    const unit = normalizeText(src.unit || typeDefinition.defaultUnit || (type === ITEM_TYPES.SERVICE ? 'смена' : 'шт')) || 'шт';
    const meta = src.meta && typeof src.meta === 'object' ? { ...src.meta } : {};
    const rawType = normalizeText(src.type || src.equipmentType || src.kind);
    if (categoryCandidate && categoryCandidate !== category && !meta.originalCategory) meta.originalCategory = categoryCandidate;
    if (categoryCandidate && normalizedCategory && categoryCandidate !== normalizedCategory) meta.categoryAliasMatched = categoryCandidate;
    if (rawType && rawType !== type && !meta.originalType) meta.originalType = rawType;
    if (rawType && rawType !== type) meta.typeAliasMatched = rawType;
    const normalized = {
      id: normalizeText(src.id) || makeId('eq'),
      workspaceId: normalizeText(pick(src, 'workspaceId', 'workspace_id', 'demo-workspace')) || 'demo-workspace',
      category,
      subcategory: normalizeSubcategory(category, src.subcategory || (categoryInfo && categoryInfo.subcategories[0]) || ''),
      type,
      code: normalizeText(src.code),
      name: normalizeText(src.name || 'Новая позиция'),
      manufacturer: normalizeText(src.manufacturer),
      model: normalizeText(src.model),
      unit,
      stockQty,
      reservedQty,
      availableQty: Math.max(0, stockQty - reservedQty),
      weightKg: Math.max(0, toNumber(pick(src, 'weightKg', 'weight_kg', 0), 0)),
      powerW: Math.max(0, toNumber(pick(src, 'powerW', 'power_w', 0), 0)),
      startupPowerW: Math.max(0, toNumber(pick(src, 'startupPowerW', 'startup_power_w', 0), 0)),
      rentalPrice: Math.max(0, toNumber(pick(src, 'rentalPrice', 'rental_price', 0), 0)),
      replacementCost: Math.max(0, toNumber(pick(src, 'replacementCost', 'replacement_cost', 0), 0)),
      isActive: pick(src, 'isActive', 'is_active', true) !== false,
      sourceType: normalizeText(pick(src, 'sourceType', 'source_type', 'own')) || 'own',
      supplierId: normalizeText(pick(src, 'supplierId', 'supplier_id', '')),
      supplierName: normalizeText(pick(src, 'supplierName', 'supplier_name', '')),
      notes: normalizeText(src.notes),
      meta,
      schemaVersion: EQUIPMENT_SCHEMA_VERSION,
      updatedAt: normalizeText(pick(src, 'updatedAt', 'updated_at', '')) || new Date().toISOString()
    };
    normalized.stock_qty = normalized.stockQty;
    normalized.reserved_qty = normalized.reservedQty;
    normalized.available_qty = normalized.availableQty;
    normalized.weight_kg = normalized.weightKg;
    normalized.power_w = normalized.powerW;
    normalized.rental_price = normalized.rentalPrice;
    normalized.replacement_cost = normalized.replacementCost;
    normalized.is_active = normalized.isActive;
    return normalized;
  }

  function normalizeItems(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(normalizeItem).filter(item => {
      const key = (item.id || `${item.category}:${item.code}:${item.name}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => `${a.category}:${a.subcategory}:${a.name}`.localeCompare(`${b.category}:${b.subcategory}:${b.name}`, 'ru'));
  }

  function getDemoItems() {
    const fixtures = ROOT.TestFixtures;
    const items = fixtures && Array.isArray(fixtures.DEMO_EQUIPMENT_ITEMS) ? fixtures.DEMO_EQUIPMENT_ITEMS : [];
    const normalized = normalizeItems(items);
    return needsCodeCatalogNormalization(normalized) ? recodeItemsByCategory(normalized) : normalized;
  }

  function getStoredItemsOrDemo() {
    try {
      if (typeof localStorage === 'undefined') return getDemoItems();
      const raw = localStorage.getItem(EQUIPMENT_STORAGE_KEY);
      if (!raw) return getDemoItems();
      const parsed = JSON.parse(raw);
      let normalized = normalizeItems(parsed);
      if (!normalized.length) return getDemoItems();
      const storedVersion = localStorage.getItem(EQUIPMENT_CODE_MIGRATION_KEY) || '';
      if (storedVersion !== EQUIPMENT_CODE_CATALOG_VERSION && needsCodeCatalogNormalization(normalized)) {
        normalized = recodeItemsByCategory(normalized);
        localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(normalized));
        localStorage.setItem(EQUIPMENT_CODE_MIGRATION_KEY, EQUIPMENT_CODE_CATALOG_VERSION);
      }
      return normalized;
    } catch (_) {
      return getDemoItems();
    }
  }

  function saveItems(items) {
    const normalized = normalizeItems(items);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem(EQUIPMENT_CODE_MIGRATION_KEY, EQUIPMENT_CODE_CATALOG_VERSION);
    }
    return normalized;
  }

  function listItems(opts) {
    const options = opts || {};
    const source = Array.isArray(options.items) ? options.items : getStoredItemsOrDemo();
    const category = normalizeText(options.category);
    const type = normalizeText(options.type);
    const query = normalizeText(options.query).toLowerCase();
    const sourceType = normalizeText(options.sourceType);
    const onlyActive = options.onlyActive !== false;
    return normalizeItems(source).filter(item => {
      if (onlyActive && !item.isActive) return false;
      if (category && item.category !== category) return false;
      if (type && item.type !== type) return false;
      if (sourceType && item.sourceType !== sourceType) return false;
      if (query) {
        const legacyCodes = collectLegacyCodes(item).join(' ');
        const typeLabel = getItemTypeDefinition(item.type).label || '';
        const haystack = `${item.id} ${item.code} ${legacyCodes} ${item.name} ${item.manufacturer} ${item.model} ${item.category} ${item.subcategory} ${item.type} ${typeLabel} ${item.notes}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function findItem(identifier, items) {
    const needle = normalizeText(identifier).toLowerCase();
    if (!needle) return null;
    return normalizeItems(items || getStoredItemsOrDemo()).find(item =>
      item.id.toLowerCase() === needle ||
      item.code.toLowerCase() === needle ||
      collectLegacyCodes(item).some(code => code.toLowerCase() === needle)
    ) || null;
  }

  function summarize(items) {
    const list = normalizeItems(items || getStoredItemsOrDemo());
    const total = list.length;
    const active = list.filter(item => item.isActive).length;
    const own = list.filter(item => item.sourceType === 'own').length;
    const subrent = list.filter(item => item.sourceType === 'subrent').length;
    const stockQty = list.reduce((sum, item) => sum + item.stockQty, 0);
    const reservedQty = list.reduce((sum, item) => sum + item.reservedQty, 0);
    const availableQty = list.reduce((sum, item) => sum + item.availableQty, 0);
    const weightKg = list.reduce((sum, item) => sum + item.weightKg * item.stockQty, 0);
    const powerW = list.reduce((sum, item) => sum + item.powerW * item.stockQty, 0);
    const replacementCost = list.reduce((sum, item) => sum + item.replacementCost * item.stockQty, 0);
    const categories = CATEGORY_TREE.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: list.filter(item => item.category === cat.id).length
    })).filter(row => row.count > 0);
    const types = Object.values(ITEM_TYPES).map(type => ({
      id: type,
      label: getItemTypeDefinition(type).label || type,
      count: list.filter(item => item.type === type).length
    })).filter(row => row.count > 0);
    return { total, active, own, subrent, stockQty, reservedQty, availableQty, weightKg, powerW, replacementCost, categories, types };
  }

  function duplicateGroups(rows, keyGetter) {
    const map = new Map();
    rows.forEach(row => {
      const key = normalizeText(keyGetter(row)).toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()].filter(([, group]) => group.length > 1).map(([key, group]) => ({ key, count: group.length, rows: group }));
  }

  function buildCategoryReport(items) {
    const list = normalizeItems(items || getStoredItemsOrDemo());
    const byCategory = CATEGORY_TREE.map(cat => {
      const rows = list.filter(item => item.category === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        prefix: getCategoryCodePrefix(cat.id),
        count: rows.length,
        active: rows.filter(item => item.isActive).length,
        customSubcategories: Array.from(new Set(rows
          .filter(item => item.subcategory && !isKnownSubcategory(item.category, item.subcategory))
          .map(item => item.subcategory)))
      };
    });
    const codePrefixMismatches = list.filter(item => item.code && !isGeneratedCodeForCategory(item)).map(item => ({
      id: item.id,
      code: item.code,
      expectedPrefix: getCategoryCodePrefix(item.category),
      category: item.category,
      name: item.name
    }));
    const unknownSubcategories = list.filter(item => item.subcategory && !isKnownSubcategory(item.category, item.subcategory)).map(item => ({
      id: item.id,
      code: item.code,
      category: item.category,
      subcategory: item.subcategory,
      name: item.name
    }));
    const normalizedAliases = list.filter(item => item.meta && item.meta.originalCategory && item.meta.originalCategory !== item.category).map(item => ({
      id: item.id,
      code: item.code,
      category: item.category,
      originalCategory: item.meta.originalCategory,
      name: item.name
    }));
    const duplicateCodes = duplicateGroups(list, item => item.code).map(group => ({
      code: group.key,
      count: group.count,
      ids: group.rows.map(item => item.id)
    }));
    return {
      type: 'feg-stage-pro-equipment-category-report',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      total: list.length,
      byCategory,
      codePrefixMismatches,
      unknownSubcategories,
      normalizedAliases,
      duplicateCodes,
      ok: !codePrefixMismatches.length && !duplicateCodes.length
    };
  }

  function buildTypeReport(items) {
    const list = normalizeItems(items || getStoredItemsOrDemo());
    const byType = Object.values(ITEM_TYPES).map(type => {
      const rows = list.filter(item => item.type === type);
      const def = getItemTypeDefinition(type);
      return {
        id: type,
        label: def.label || type,
        count: rows.length,
        active: rows.filter(item => item.isActive).length,
        categories: Array.from(new Set(rows.map(item => item.category))).filter(Boolean)
      };
    }).filter(row => row.count > 0);
    const incompatibleTypes = list.filter(item => !isTypeCompatibleWithCategory(item.type, item.category)).map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      type: item.type,
      allowedCategories: getItemTypeDefinition(item.type).categories || []
    }));
    const manualBaseItems = list.filter(item => item.type === ITEM_TYPES.MANUAL && item.sourceType !== 'manual').map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      suggestedType: inferItemType(item, item.category, item.subcategory)
    }));
    const normalizedTypes = list.filter(item => item.meta && item.meta.originalType && item.meta.originalType !== item.type).map(item => ({
      id: item.id,
      code: item.code,
      type: item.type,
      originalType: item.meta.originalType,
      name: item.name
    }));
    return {
      type: 'feg-stage-pro-equipment-type-report',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      total: list.length,
      byType,
      incompatibleTypes,
      manualBaseItems,
      normalizedTypes,
      ok: !incompatibleTypes.length
    };
  }

  function mapItemToEquipmentRow(item, workspaceId) {
    const normalized = normalizeItem(item);
    const meta = normalized.meta && typeof normalized.meta === 'object' ? { ...normalized.meta } : {};
    return {
      id: normalized.id,
      workspace_id: normalizeText(workspaceId || normalized.workspaceId || 'main') || 'main',
      category: normalized.category,
      subcategory: normalized.subcategory,
      type: normalized.type,
      code: normalized.code,
      name: normalized.name,
      manufacturer: normalized.manufacturer,
      model: normalized.model,
      unit: normalized.unit,
      stock_qty: normalized.stockQty,
      reserved_qty: normalized.reservedQty,
      available_qty: normalized.availableQty,
      weight_kg: normalized.weightKg,
      power_w: normalized.powerW,
      startup_power_w: normalized.startupPowerW,
      rental_price: normalized.rentalPrice,
      replacement_cost: normalized.replacementCost,
      is_active: normalized.isActive,
      source_type: normalized.sourceType,
      supplier_id: normalized.supplierId,
      supplier_name: normalized.supplierName,
      notes: normalized.notes,
      meta,
      schema_version: normalized.schemaVersion,
      updated_at: normalized.updatedAt,
      raw_payload: normalized
    };
  }

  function mapEquipmentRowToItem(row) {
    const src = row || {};
    return normalizeItem({
      id: src.id,
      workspaceId: src.workspace_id || src.workspaceId,
      category: src.category,
      subcategory: src.subcategory,
      type: src.type,
      code: src.code,
      name: src.name,
      manufacturer: src.manufacturer,
      model: src.model,
      unit: src.unit,
      stockQty: src.stock_qty,
      reservedQty: src.reserved_qty,
      weightKg: src.weight_kg,
      powerW: src.power_w,
      startupPowerW: src.startup_power_w,
      rentalPrice: src.rental_price,
      replacementCost: src.replacement_cost,
      isActive: src.is_active,
      sourceType: src.source_type,
      supplierId: src.supplier_id,
      supplierName: src.supplier_name,
      notes: src.notes,
      meta: src.meta || (src.raw_payload && src.raw_payload.meta) || {},
      schemaVersion: src.schema_version,
      updatedAt: src.updated_at
    });
  }

  function buildSyncSchemaReport(items, options) {
    const opts = options || {};
    const list = normalizeItems(items || getStoredItemsOrDemo());
    const rows = list.map(item => mapItemToEquipmentRow(item, opts.workspaceId));
    const requiredFields = ['id', 'workspace_id', 'category', 'type', 'code', 'name', 'unit'];
    const missingRequired = [];
    rows.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!normalizeText(row[field])) missingRequired.push({ index, id: row.id, code: row.code, field });
      });
      if (row.available_qty !== Math.max(0, row.stock_qty - row.reserved_qty)) missingRequired.push({ index, id: row.id, code: row.code, field: 'available_qty', expected: Math.max(0, row.stock_qty - row.reserved_qty), actual: row.available_qty });
    });
    const categoryReport = buildCategoryReport(list);
    const typeReport = buildTypeReport(list);
    return {
      type: 'feg-stage-pro-equipment-sync-schema-report',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      workspaceId: normalizeText(opts.workspaceId || 'main') || 'main',
      requiredFields,
      optionalFields: ['subcategory', 'manufacturer', 'model', 'stock_qty', 'reserved_qty', 'available_qty', 'weight_kg', 'power_w', 'startup_power_w', 'rental_price', 'replacement_cost', 'is_active', 'source_type', 'supplier_id', 'supplier_name', 'notes', 'meta', 'schema_version', 'updated_at', 'raw_payload'],
      rowCount: rows.length,
      sampleRow: rows[0] || null,
      categoryReport,
      typeReport,
      missingRequired,
      ok: !missingRequired.length && categoryReport.ok && typeReport.ok
    };
  }


  function makeSyncPreviewIssue(severity, item, field, message, extra) {
    return Object.assign({
      severity,
      id: item && item.id || '',
      code: item && item.code || '',
      name: item && item.name || '',
      category: item && item.category || '',
      type: item && item.type || '',
      field,
      message
    }, extra || {});
  }

  function buildEquipmentSyncPreview(items, options) {
    const opts = options || {};
    const workspaceId = normalizeText(opts.workspaceId || 'main') || 'main';
    const rawList = Array.isArray(items) ? items : getStoredItemsOrDemo();
    const list = rawList.map(normalizeItem);
    const rows = list.map(item => mapItemToEquipmentRow(item, workspaceId));
    const requiredFields = ['id', 'workspace_id', 'category', 'type', 'code', 'name', 'unit'];
    const idCounts = rows.reduce((map, row) => {
      const key = normalizeText(row.id).toLowerCase();
      if (key) map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    const codeCounts = rows.reduce((map, row) => {
      const key = normalizeText(row.code).toLowerCase();
      if (key) map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    const fieldCoverage = requiredFields.reduce((acc, field) => {
      acc[field] = { filled: 0, missing: 0 };
      return acc;
    }, {});
    const blockers = [];
    const warnings = [];
    const previewRows = rows.map((row, index) => {
      const item = list[index];
      const rowBlockers = [];
      const rowWarnings = [];
      const addBlocker = (field, message, extra) => {
        const issue = makeSyncPreviewIssue('blocker', item, field, message, { index, ...(extra || {}) });
        rowBlockers.push(issue);
        blockers.push(issue);
      };
      const addWarning = (field, message, extra) => {
        const issue = makeSyncPreviewIssue('warning', item, field, message, { index, ...(extra || {}) });
        rowWarnings.push(issue);
        warnings.push(issue);
      };
      requiredFields.forEach(field => {
        if (normalizeText(row[field])) fieldCoverage[field].filled += 1;
        else {
          fieldCoverage[field].missing += 1;
          addBlocker(field, `Required field ${field} is empty`);
        }
      });
      const idKey = normalizeText(row.id).toLowerCase();
      const codeKey = normalizeText(row.code).toLowerCase();
      if (idKey && idCounts.get(idKey) > 1) addBlocker('id', `Duplicate equipment id ${row.id}`);
      if (codeKey && codeCounts.get(codeKey) > 1) addBlocker('code', `Duplicate equipment code ${row.code}`);
      if (!getCategory(row.category)) addBlocker('category', `Unknown category id ${row.category}`);
      if (row.stock_qty < 0) addBlocker('stock_qty', 'stock_qty must be >= 0');
      if (row.reserved_qty < 0) addBlocker('reserved_qty', 'reserved_qty must be >= 0');
      if (row.weight_kg < 0) addBlocker('weight_kg', 'weight_kg must be >= 0');
      if (row.power_w < 0) addBlocker('power_w', 'power_w must be >= 0');
      if (row.rental_price < 0) addBlocker('rental_price', 'rental_price must be >= 0');
      if (row.replacement_cost < 0) addBlocker('replacement_cost', 'replacement_cost must be >= 0');
      if (row.available_qty !== Math.max(0, row.stock_qty - row.reserved_qty)) addWarning('available_qty', 'available_qty will be recalculated from stock_qty - reserved_qty', { expected: Math.max(0, row.stock_qty - row.reserved_qty), actual: row.available_qty });
      if (item.meta && item.meta.originalCategory && !item.meta.categoryAliasMatched && item.meta.originalCategory !== item.category) addWarning('category', `Original category ${item.meta.originalCategory} was not recognized and was normalized to ${item.category}`);
      if (!isGeneratedCodeForCategory(item)) addWarning('code', `Code ${item.code || '—'} does not match category prefix ${getCategoryCodePrefix(item.category)}`);
      if (item.subcategory && !isKnownSubcategory(item.category, item.subcategory)) addWarning('subcategory', `Custom subcategory ${item.subcategory} is not in CATEGORY_TREE`);
      if (!isTypeCompatibleWithCategory(item.type, item.category)) addWarning('type', `Type ${item.type} is not compatible with category ${item.category}`);
      if (item.sourceType === 'subrent' && !item.supplierId && !item.supplierName) addWarning('supplier', 'Subrent item has no supplier_id or supplier_name');
      const def = getItemTypeDefinition(item.type);
      if (def && def.powerTracked && item.isActive && item.powerW === 0) addWarning('power_w', `Power is empty for power-tracked type ${item.type}`);
      if (def && def.stockTracked && item.isActive && item.sourceType === 'own' && item.stockQty === 0) addWarning('stock_qty', `Own stock item has zero stock_qty`);
      const payloadRow = { ...row };
      delete payloadRow.raw_payload;
      return {
        index,
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        type: item.type,
        status: rowBlockers.length ? 'blocked' : rowWarnings.length ? 'warning' : 'ready',
        blockers: rowBlockers,
        warnings: rowWarnings,
        payloadRow
      };
    });
    const statusCounts = previewRows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, { ready: 0, warning: 0, blocked: 0 });
    const categoryReport = buildCategoryReport(list);
    const typeReport = buildTypeReport(list);
    const schemaReport = buildSyncSchemaReport(list, { workspaceId });
    return {
      type: 'feg-stage-pro-equipment-sync-preview',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      workspaceId,
      mode: 'preview-only',
      note: 'No backend writes are executed by this report.',
      rowCount: rows.length,
      statusCounts,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockers,
      warnings,
      fieldCoverage,
      tablePreview: [
        { table: 'equipment_items', operation: 'upsert', conflictTarget: 'id', rowCount: rows.length, readyRows: statusCounts.ready, warningRows: statusCounts.warning, blockedRows: statusCounts.blocked }
      ],
      payloadSampleRows: previewRows.slice(0, opts.sampleLimit || 12).map(row => row.payloadRow),
      rows: opts.includeRows === false ? [] : previewRows,
      categoryReport,
      typeReport,
      schemaReport,
      ok: blockers.length === 0
    };
  }


  function makeReadinessTask(severity, area, item, message, field, extra) {
    return Object.assign({
      severity,
      area,
      id: item && item.id || '',
      code: item && item.code || '',
      name: item && item.name || '',
      category: item && item.category || '',
      type: item && item.type || '',
      field: field || '',
      message
    }, extra || {});
  }

  function buildEquipmentReadinessReport(items, options) {
    const opts = options || {};
    const workspaceId = normalizeText(opts.workspaceId || 'main') || 'main';
    const rawList = Array.isArray(items) ? items : getStoredItemsOrDemo();
    const list = rawList.map(normalizeItem);
    const syncPreview = buildEquipmentSyncPreview(list, { workspaceId, includeRows: opts.includeRows !== false, sampleLimit: opts.sampleLimit || 12 });
    const categoryReport = buildCategoryReport(list);
    const typeReport = buildTypeReport(list);
    const tasks = [];
    const push = (severity, area, item, message, field, extra) => tasks.push(makeReadinessTask(severity, area, item, message, field, extra));

    (syncPreview.blockers || []).forEach(issue => push('blocker', 'sync', issue, issue.message || 'Sync blocker', issue.field || '', issue));
    categoryReport.duplicateCodes.forEach(group => push('blocker', 'codes', { code: group.code, name: group.code }, `Дублирующийся код ${group.code}`, 'code', group));
    categoryReport.codePrefixMismatches.forEach(item => push('safe_fix', 'codes', item, `Код ${item.code} не соответствует серии ${item.expectedPrefix}`, 'code', { expectedPrefix: item.expectedPrefix }));
    categoryReport.unknownSubcategories.forEach(item => push('manual', 'subcategories', item, `Проверить нестандартную подкатегорию: ${item.subcategory}`, 'subcategory'));
    typeReport.incompatibleTypes.forEach(item => push('manual', 'types', item, `Тип ${item.type} не соответствует категории ${item.category}`, 'type', { allowedCategories: item.allowedCategories || [] }));
    typeReport.manualBaseItems.forEach(item => push('safe_fix', 'types', item, `Можно вывести тип из категории/подкатегории: ${item.suggestedType}`, 'type', { suggestedType: item.suggestedType }));

    list.forEach(item => {
      const def = getItemTypeDefinition(item.type);
      if (item.meta && item.meta.originalCategory && item.meta.originalCategory !== item.category) push('safe_fix', 'categories', item, `Категория уже нормализуется из алиаса ${item.meta.originalCategory}`, 'category', { originalCategory: item.meta.originalCategory });
      if (item.meta && item.meta.originalType && item.meta.originalType !== item.type) push('safe_fix', 'types', item, `Тип уже нормализуется из алиаса ${item.meta.originalType}`, 'type', { originalType: item.meta.originalType });
      if (item.sourceType === 'subrent' && !item.supplierId && !item.supplierName) push('manual', 'suppliers', item, 'Для субаренды нужен supplier_id или supplier_name', 'supplier');
      if (def && def.powerTracked && item.isActive && item.powerW === 0) push('manual', 'power', item, `Заполнить мощность для типа ${item.type}`, 'power_w');
      if (item.isActive && item.stockQty > 0 && item.weightKg === 0 && !['service', 'consumable'].includes(item.type)) push('manual', 'weight', item, 'Заполнить вес позиции для техлистов и логистики', 'weight_kg');
      if (def && def.stockTracked && item.isActive && item.sourceType === 'own' && item.stockQty === 0) push('manual', 'stock', item, 'Проверить нулевой остаток собственного складского оборудования', 'stock_qty');
    });

    const byArea = tasks.reduce((acc, task) => {
      const key = task.area || 'other';
      if (!acc[key]) acc[key] = { area: key, total: 0, blocker: 0, safe_fix: 0, manual: 0 };
      acc[key].total += 1;
      acc[key][task.severity] = (acc[key][task.severity] || 0) + 1;
      return acc;
    }, {});
    const counts = tasks.reduce((acc, task) => {
      acc.total += 1;
      acc[task.severity] = (acc[task.severity] || 0) + 1;
      return acc;
    }, { total: 0, blocker: 0, safe_fix: 0, manual: 0 });
    const readinessPenalty = counts.blocker * 18 + counts.manual * 4 + counts.safe_fix * 1.5;
    const score = Math.max(0, Math.min(100, Math.round(100 - readinessPenalty / Math.sqrt(Math.max(1, list.length)))));
    const status = counts.blocker ? 'blocked' : counts.manual ? 'ready_with_manual_tasks' : counts.safe_fix ? 'ready_after_safe_cleanup' : 'ready_clean';
    const safeActions = [];
    if (categoryReport.codePrefixMismatches.length || categoryReport.duplicateCodes.length) safeActions.push('recode_by_category_with_legacy_preserved');
    if (categoryReport.normalizedAliases.length) safeActions.push('persist_normalized_category_aliases');
    if (typeReport.normalizedTypes.length || typeReport.manualBaseItems.length) safeActions.push('persist_normalized_or_inferred_types');
    safeActions.push('recalculate_available_qty_from_stock_minus_reserved');
    return {
      type: 'feg-stage-pro-equipment-readiness-report',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      workspaceId,
      mode: 'preview-only',
      note: 'Readiness report does not fill real weight, power, stock or supplier data automatically.',
      rowCount: list.length,
      status,
      score,
      counts,
      byArea: Object.values(byArea),
      safeActions,
      manualTasks: tasks.filter(task => task.severity === 'manual'),
      safeFixTasks: tasks.filter(task => task.severity === 'safe_fix'),
      blockers: tasks.filter(task => task.severity === 'blocker'),
      topTasks: tasks.slice(0, opts.taskLimit || 80),
      categoryReport,
      typeReport,
      syncPreview,
      ok: !counts.blocker,
      readyForFirstWrite: !counts.blocker
    };
  }

  function applyEquipmentReadinessFixes(items, options) {
    const opts = options || {};
    const updatedAt = opts.updatedAt || new Date().toISOString();
    const source = Array.isArray(items) ? items : getStoredItemsOrDemo();
    const before = buildEquipmentReadinessReport(source, { workspaceId: opts.workspaceId, includeRows: false });
    let list = source.map(item => {
      const normalized = normalizeItem(item);
      const meta = { ...(normalized.meta || {}), readinessSafeFixedAt: updatedAt };
      return normalizeItem({ ...normalized, meta, updatedAt });
    });
    const needRecode = opts.recode !== false && (before.categoryReport.codePrefixMismatches.length || before.categoryReport.duplicateCodes.length);
    const changes = [];
    if (needRecode) {
      list = recodeItemsByCategory(list, { updatedAt });
      changes.push('recode_by_category_with_legacy_preserved');
    }
    list = list.map(item => normalizeItem({ ...item, updatedAt }));
    if (before.categoryReport.normalizedAliases.length) changes.push('persist_normalized_category_aliases');
    if ((before.typeReport.normalizedTypes || []).length || (before.typeReport.manualBaseItems || []).length) changes.push('persist_normalized_or_inferred_types');
    changes.push('recalculate_available_qty_from_stock_minus_reserved');
    const after = buildEquipmentReadinessReport(list, { workspaceId: opts.workspaceId, includeRows: false });
    return {
      type: 'feg-stage-pro-equipment-readiness-fix-result',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: updatedAt,
      changed: changes.length > 0,
      changes: Array.from(new Set(changes)),
      before: { status: before.status, score: before.score, counts: before.counts },
      after: { status: after.status, score: after.score, counts: after.counts },
      report: after,
      items: list
    };
  }

  function applyStoredEquipmentReadinessFixes(options) {
    const result = applyEquipmentReadinessFixes(getStoredItemsOrDemo(), options || {});
    saveItems(result.items);
    return result;
  }


  function makeCompletionIssue(issueKey, area, item, message, field, extra) {
    return Object.assign({
      issueKey,
      area,
      severity: 'manual',
      field: field || '',
      id: item && item.id || '',
      code: item && item.code || '',
      name: item && item.name || '',
      category: item && item.category || '',
      type: item && item.type || '',
      message
    }, extra || {});
  }

  function getManualCompletionIssues(item) {
    const normalized = normalizeItem(item);
    const def = getItemTypeDefinition(normalized.type);
    const issues = [];
    const push = (issueKey, area, message, field, extra) => issues.push(makeCompletionIssue(issueKey, area, normalized, message, field, extra));
    if (normalized.isActive && normalized.stockQty > 0 && normalized.weightKg === 0 && ![ITEM_TYPES.SERVICE, ITEM_TYPES.CONSUMABLE].includes(normalized.type)) {
      push('weight', 'weight', 'Заполнить вес за единицу для техлистов, логистики и общего веса проекта.', 'weightKg');
    }
    if (def && def.powerTracked && normalized.isActive && normalized.powerW === 0) {
      push('power', 'power', 'Заполнить рабочую мощность за единицу.', 'powerW');
    }
    if (def && def.stockTracked && normalized.isActive && normalized.sourceType === 'own' && normalized.stockQty === 0) {
      push('stock', 'stock', 'Проверить нулевой остаток собственного складского оборудования.', 'stockQty');
    }
    if (normalized.sourceType === 'subrent' && !normalized.supplierId && !normalized.supplierName) {
      push('supplier', 'suppliers', 'Для субаренды нужен supplier_id или supplier_name.', 'supplierName');
    }
    if (normalized.subcategory && !isKnownSubcategory(normalized.category, normalized.subcategory)) {
      push('subcategory', 'subcategories', `Проверить нестандартную подкатегорию: ${normalized.subcategory}.`, 'subcategory', { suggestedValues: (getCategory(normalized.category) && getCategory(normalized.category).subcategories) || [] });
    }
    if (!isTypeCompatibleWithCategory(normalized.type, normalized.category)) {
      push('type', 'types', `Тип ${normalized.type} не соответствует категории ${normalized.category}.`, 'type', { allowedTypes: getTypeOptionsForCategory(normalized.category) });
    }
    if (def && def.priceTracked && normalized.isActive && normalized.sourceType !== 'manual' && normalized.rentalPrice === 0) {
      push('rental_price', 'prices', 'Заполнить прокатную цену, если позиция должна попадать в коммерческие расчёты.', 'rentalPrice');
    }
    if (def && def.stockTracked && normalized.isActive && normalized.sourceType === 'own' && normalized.replacementCost === 0 && ![ITEM_TYPES.SERVICE, ITEM_TYPES.CONSUMABLE].includes(normalized.type)) {
      push('replacement_cost', 'replacement', 'Заполнить стоимость замены для складского контроля и ответственности.', 'replacementCost');
    }
    return issues;
  }

  function buildManualCompletionMatrix(items, options) {
    const opts = options || {};
    const issueFilter = normalizeText(opts.issue || opts.issueKey || opts.area || '').toLowerCase();
    const list = normalizeItems(Array.isArray(items) ? items : getStoredItemsOrDemo());
    const allRows = list.map(item => {
      const issues = getManualCompletionIssues(item);
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        type: item.type,
        sourceType: item.sourceType,
        supplierName: item.supplierName,
        unit: item.unit,
        stockQty: item.stockQty,
        reservedQty: item.reservedQty,
        availableQty: item.availableQty,
        weightKg: item.weightKg,
        powerW: item.powerW,
        startupPowerW: item.startupPowerW,
        rentalPrice: item.rentalPrice,
        replacementCost: item.replacementCost,
        issueKeys: issues.map(issue => issue.issueKey),
        areas: Array.from(new Set(issues.map(issue => issue.area))),
        issueCount: issues.length,
        issues,
        editAnchor: item.id,
        item: opts.includeItems === false ? undefined : item
      };
    }).filter(row => row.issueCount > 0);
    const rows = issueFilter
      ? allRows.filter(row => row.issueKeys.includes(issueFilter) || row.areas.includes(issueFilter))
      : allRows;
    const byIssue = allRows.reduce((acc, row) => {
      row.issueKeys.forEach(key => { acc[key] = (acc[key] || 0) + 1; });
      return acc;
    }, {});
    const byArea = allRows.reduce((acc, row) => {
      row.areas.forEach(key => { acc[key] = (acc[key] || 0) + 1; });
      return acc;
    }, {});
    const byCategory = CATEGORY_TREE.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: allRows.filter(row => row.category === cat.id).length,
      visible: rows.filter(row => row.category === cat.id).length
    })).filter(row => row.count || row.visible);
    const issueLabels = {
      weight: 'Вес',
      power: 'Мощность',
      stock: 'Остатки',
      supplier: 'Поставщик',
      subcategory: 'Подкатегория',
      type: 'Тип',
      rental_price: 'Прокатная цена',
      replacement_cost: 'Стоимость замены'
    };
    const totalIssues = Object.values(byIssue).reduce((sum, value) => sum + value, 0);
    const score = Math.max(0, Math.min(100, Math.round(100 - (totalIssues * 3.5) / Math.sqrt(Math.max(1, list.length)))));
    return {
      type: 'feg-stage-pro-equipment-manual-completion-matrix',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      mode: 'local-manual-completion',
      note: 'Matrix only shows fields that need real manual values. It does not auto-fill weight, power, stock, suppliers or prices.',
      rowCount: list.length,
      problemRows: allRows.length,
      visibleRows: rows.length,
      issueCount: totalIssues,
      filter: issueFilter,
      score,
      byIssue,
      byArea,
      byCategory,
      issueOptions: Object.entries(issueLabels).map(([id, label]) => ({ id, label, count: byIssue[id] || 0 })),
      rows: opts.includeRows === false ? [] : rows,
      ok: allRows.length === 0
    };
  }

  function getManualCompletionFilteredItems(issue, items, options) {
    const matrix = buildManualCompletionMatrix(items, Object.assign({}, options || {}, { issue, includeItems: true }));
    return matrix.rows.map(row => row.item || findItem(row.id, items));
  }

  function buildEquipmentPatchExport(items, options) {
    const opts = options || {};
    const list = normalizeItems(Array.isArray(items) ? items : getStoredItemsOrDemo());
    const matrix = buildManualCompletionMatrix(list, { includeRows: true, includeItems: false });
    const patchRows = matrix.rows.map(row => {
      const item = findItem(row.id, list) || normalizeItem(row);
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        type: item.type,
        issueKeys: row.issueKeys,
        fields: {
          subcategory: item.subcategory,
          unit: item.unit,
          stockQty: item.stockQty,
          reservedQty: item.reservedQty,
          weightKg: item.weightKg,
          powerW: item.powerW,
          startupPowerW: item.startupPowerW,
          rentalPrice: item.rentalPrice,
          replacementCost: item.replacementCost,
          sourceType: item.sourceType,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          notes: item.notes,
          isActive: item.isActive
        },
        instructions: 'Заполни только реальные значения. Пустые/нулевые поля можно оставить без изменения, если данных пока нет.'
      };
    });
    return {
      type: 'feg-stage-pro-equipment-manual-completion-patch',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      mode: 'manual-edit-template',
      sourceRowCount: list.length,
      patchRowCount: patchRows.length,
      patchableFields: ['subcategory','type','unit','stockQty','reservedQty','weightKg','powerW','startupPowerW','rentalPrice','replacementCost','sourceType','supplierId','supplierName','notes','isActive'],
      issueOptions: matrix.issueOptions,
      patchRows,
      meta: Object.assign({ exportedBy: 'EquipmentDatabase.buildEquipmentPatchExport' }, opts.meta || {})
    };
  }

  function parseEquipmentPatch(patch) {
    if (!patch) return null;
    if (typeof patch === 'string') {
      try { return JSON.parse(patch); } catch (_) { return null; }
    }
    return patch;
  }

  function applyEquipmentPatch(patch, items, options) {
    const opts = options || {};
    const parsed = parseEquipmentPatch(patch);
    const patchRows = parsed && (Array.isArray(parsed.patchRows) ? parsed.patchRows : (Array.isArray(parsed.rows) ? parsed.rows : []));
    const source = normalizeItems(Array.isArray(items) ? items : getStoredItemsOrDemo());
    const list = source.slice();
    const allowed = new Set(['subcategory','type','unit','stockQty','reservedQty','weightKg','powerW','startupPowerW','rentalPrice','replacementCost','sourceType','supplierId','supplierName','notes','isActive']);
    const changed = [];
    const skipped = [];
    const errors = [];
    if (!parsed || !Array.isArray(patchRows)) {
      return { type: 'feg-stage-pro-equipment-patch-result', version: EQUIPMENT_SYNC_PREVIEW_VERSION, ok: false, changed: [], skipped: [], errors: ['Invalid equipment patch JSON'], items: list };
    }
    patchRows.forEach((row, index) => {
      const id = normalizeText(row.id);
      const code = normalizeText(row.code);
      const idx = list.findIndex(item => (id && item.id === id) || (code && item.code === code));
      if (idx < 0) {
        if (opts.allowCreate) {
          const fields = row.fields && typeof row.fields === 'object' ? row.fields : row;
          const created = normalizeItem(Object.assign({}, fields, { id: id || makeId('eq'), code, name: row.name || fields.name || 'Новая позиция' }));
          list.push(created);
          changed.push({ id: created.id, code: created.code, action: 'created', index });
        } else {
          skipped.push({ id, code, reason: 'not_found', index });
        }
        return;
      }
      const current = list[idx];
      const fields = row.fields && typeof row.fields === 'object' ? row.fields : row;
      const patchData = {};
      Object.keys(fields || {}).forEach(key => {
        if (!allowed.has(key)) return;
        const value = fields[key];
        if (value === undefined || value === null) return;
        patchData[key] = value;
      });
      if (!Object.keys(patchData).length) {
        skipped.push({ id: current.id, code: current.code, reason: 'no_patchable_fields', index });
        return;
      }
      const meta = Object.assign({}, current.meta || {}, { manualPatchAppliedAt: opts.updatedAt || new Date().toISOString() });
      const updated = normalizeItem(Object.assign({}, current, patchData, { meta, updatedAt: opts.updatedAt || new Date().toISOString() }));
      list[idx] = updated;
      changed.push({ id: updated.id, code: updated.code, action: 'updated', fields: Object.keys(patchData), index });
    });
    const normalized = normalizeItems(list);
    const beforeMatrix = buildManualCompletionMatrix(source, { includeRows: false });
    const afterMatrix = buildManualCompletionMatrix(normalized, { includeRows: false });
    if (opts.save) saveItems(normalized);
    return {
      type: 'feg-stage-pro-equipment-patch-result',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      ok: errors.length === 0,
      changed,
      skipped,
      errors,
      before: { problemRows: beforeMatrix.problemRows, issueCount: beforeMatrix.issueCount, score: beforeMatrix.score },
      after: { problemRows: afterMatrix.problemRows, issueCount: afterMatrix.issueCount, score: afterMatrix.score },
      items: normalized
    };
  }

  function applyStoredEquipmentPatch(patch, options) {
    return applyEquipmentPatch(patch, getStoredItemsOrDemo(), Object.assign({}, options || {}, { save: true }));
  }

  function rowComparable(row) {
    const r = row || {};
    const picked = {};
    ['workspace_id','category','subcategory','type','code','name','manufacturer','model','unit','stock_qty','reserved_qty','available_qty','weight_kg','power_w','startup_power_w','rental_price','replacement_cost','is_active','source_type','supplier_id','supplier_name','notes'].forEach(key => { picked[key] = r[key] == null ? '' : r[key]; });
    return picked;
  }

  function buildEquipmentStagedDiff(items, remoteRows, options) {
    const opts = options || {};
    const workspaceId = normalizeText(opts.workspaceId || 'main') || 'main';
    const localItems = normalizeItems(Array.isArray(items) ? items : getStoredItemsOrDemo());
    const localRows = localItems.map(item => mapItemToEquipmentRow(item, workspaceId));
    const remoteList = Array.isArray(remoteRows) ? remoteRows : [];
    const remoteComparableRows = remoteList.map(row => {
      const mapped = row && row.raw_payload && row.workspace_id ? row : mapItemToEquipmentRow(mapEquipmentRowToItem(row), workspaceId);
      return mapped;
    });
    const remoteById = new Map();
    const remoteByCode = new Map();
    remoteComparableRows.forEach(row => {
      if (row.id) remoteById.set(String(row.id), row);
      if (row.code) remoteByCode.set(String(row.code).toLowerCase(), row);
    });
    const matchedRemote = new Set();
    const operations = localRows.map(row => {
      const remote = (row.id && remoteById.get(row.id)) || (row.code && remoteByCode.get(String(row.code).toLowerCase())) || null;
      if (!remote) return { operation: 'insert', id: row.id, code: row.code, name: row.name, category: row.category, changedFields: Object.keys(rowComparable(row)), row };
      matchedRemote.add(remote.id || remote.code);
      const localCmp = rowComparable(row);
      const remoteCmp = rowComparable(remote);
      const changedFields = Object.keys(localCmp).filter(key => JSON.stringify(localCmp[key]) !== JSON.stringify(remoteCmp[key]));
      return { operation: changedFields.length ? 'update' : 'unchanged', id: row.id, code: row.code, name: row.name, category: row.category, changedFields, row, remoteRow: remote };
    });
    remoteComparableRows.forEach(row => {
      const key = row.id || row.code;
      if (!matchedRemote.has(key)) operations.push({ operation: 'remote_only', id: row.id, code: row.code, name: row.name, category: row.category, changedFields: [], remoteRow: row });
    });
    const statusCounts = operations.reduce((acc, op) => {
      acc[op.operation] = (acc[op.operation] || 0) + 1;
      return acc;
    }, { insert: 0, update: 0, unchanged: 0, remote_only: 0 });
    return {
      type: 'feg-stage-pro-equipment-staged-diff',
      version: EQUIPMENT_SYNC_PREVIEW_VERSION,
      generatedAt: new Date().toISOString(),
      workspaceId,
      mode: remoteComparableRows.length ? 'compare-with-baseline' : 'first-write-baseline-empty',
      baselineRows: remoteComparableRows.length,
      localRows: localRows.length,
      statusCounts,
      operations: opts.includeRows === false ? [] : operations,
      tablePreview: [{ table: 'equipment_items', operation: 'upsert', inserts: statusCounts.insert || 0, updates: statusCounts.update || 0, unchanged: statusCounts.unchanged || 0, remoteOnly: statusCounts.remote_only || 0 }],
      ok: true
    };
  }

  function checkAvailability(requestedItems, inventoryItems) {
    const inventory = normalizeItems(inventoryItems || getStoredItemsOrDemo());
    return (Array.isArray(requestedItems) ? requestedItems : []).map(req => {
      const item = findItem(req.itemId || req.id || req.code, inventory) || normalizeItem(req);
      const requestedQty = Math.max(0, toNumber(req.qty || req.quantity || req.requestedQty, 0));
      const availableQty = item.availableQty || 0;
      const deficitQty = Math.max(0, requestedQty - availableQty);
      return {
        itemId: item.id,
        code: item.code,
        name: item.name,
        requestedQty,
        availableQty,
        reservedQty: item.reservedQty,
        deficitQty,
        ok: availableQty >= requestedQty,
        unit: item.unit,
        sourceType: deficitQty > 0 ? 'subrent_needed' : item.sourceType
      };
    });
  }

  function upsertItem(item, existingItems) {
    const list = normalizeItems(existingItems || getStoredItemsOrDemo());
    const normalized = normalizeItem({ ...item, updatedAt: new Date().toISOString() });
    const idx = list.findIndex(row => row.id === normalized.id || (normalized.code && row.code === normalized.code));
    if (idx >= 0) list[idx] = { ...list[idx], ...normalized };
    else list.push(normalized);
    return saveItems(list);
  }

  function reserveItem(identifier, qty, existingItems) {
    const list = normalizeItems(existingItems || getStoredItemsOrDemo());
    const item = findItem(identifier, list);
    if (!item) return list;
    const idx = list.findIndex(row => row.id === item.id);
    const nextReserved = Math.max(0, Math.min(item.stockQty, item.reservedQty + toNumber(qty, 0)));
    list[idx] = normalizeItem({ ...item, reservedQty: nextReserved, updatedAt: new Date().toISOString() });
    return saveItems(list);
  }

  function resetDemoItems() {
    const items = getDemoItems();
    return saveItems(items);
  }


  function recodeStoredItemsByCategory() {
    const recoded = recodeItemsByCategory(getStoredItemsOrDemo());
    return saveItems(recoded);
  }

  function exportItems(items) {
    return JSON.stringify(normalizeItems(items || getStoredItemsOrDemo()), null, 2);
  }

  ROOT.EquipmentDatabase = {
    EQUIPMENT_STORAGE_KEY,
    EQUIPMENT_SCHEMA_VERSION,
    EQUIPMENT_SYNC_PREVIEW_VERSION,
    EQUIPMENT_CODE_CATALOG_VERSION,
    EQUIPMENT_CODE_MIGRATION_KEY,
    CATEGORY_TREE,
    CATEGORY_CODE_PREFIXES,
    CATEGORY_ALIASES,
    CATEGORY_SUBCATEGORY_LOOKUP,
    ITEM_TYPES,
    ITEM_TYPE_DEFINITIONS,
    TYPE_ALIASES,
    makeId,
    getCategory,
    normalizeCategoryToken,
    normalizeCategoryId,
    normalizeSubcategory,
    isKnownSubcategory,
    getCategoryCodePrefix,
    generateNextCode,
    normalizeTypeToken,
    normalizeItemType,
    getItemTypeDefinition,
    inferItemType,
    getDefaultTypeForCategory,
    isTypeCompatibleWithCategory,
    getTypeOptionsForCategory,
    collectLegacyCodes,
    isGeneratedCodeForCategory,
    needsCodeCatalogNormalization,
    recodeItemsByCategory,
    normalizeItem,
    normalizeItems,
    getDemoItems,
    listItems,
    findItem,
    summarize,
    buildCategoryReport,
    buildTypeReport,
    mapItemToEquipmentRow,
    mapEquipmentRowToItem,
    buildSyncSchemaReport,
    buildEquipmentSyncPreview,
    buildEquipmentReadinessReport,
    applyEquipmentReadinessFixes,
    applyStoredEquipmentReadinessFixes,
    getManualCompletionIssues,
    buildManualCompletionMatrix,
    getManualCompletionFilteredItems,
    buildEquipmentPatchExport,
    applyEquipmentPatch,
    applyStoredEquipmentPatch,
    buildEquipmentStagedDiff,
    checkAvailability,
    getStoredItemsOrDemo,
    saveItems,
    upsertItem,
    reserveItem,
    resetDemoItems,
    recodeStoredItemsByCategory,
    exportItems
  };
})();
