(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});
  const FEG = GLOBAL.FEGModules || {};

  const RESOURCE_MAPPER_VERSION = '5.0.0-step3-resource-database-mapping';

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function equipmentDb() {
    return FEG.EquipmentDatabase;
  }

  function ensureSchemas() {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before ResourceDatabaseMapper.');
    return S;
  }

  function clone(value) {
    return ensureSchemas().clone(value);
  }

  function toText(value) {
    return ensureSchemas().toText(value);
  }

  function toNumber(value, fallback) {
    return ensureSchemas().toNumber(value, fallback);
  }

  function toMoney(value) {
    return ensureSchemas().toMoney(value);
  }

  function toList(value) {
    return ensureSchemas().toList(value);
  }

  function normalizeEquipmentItem(input) {
    const DB = equipmentDb();
    if (DB && DB.normalizeItem) return DB.normalizeItem(input || {});
    return clone(input || {});
  }

  function normalizeEquipmentItems(items) {
    const DB = equipmentDb();
    if (DB && DB.normalizeItems) return DB.normalizeItems(Array.isArray(items) ? items : []);
    return Array.isArray(items) ? items.map(normalizeEquipmentItem) : [];
  }

  function getLegacyCategories() {
    const DB = equipmentDb();
    return DB && Array.isArray(DB.CATEGORY_TREE) ? DB.CATEGORY_TREE : [];
  }

  function getLegacyTypeDefinition(type) {
    const DB = equipmentDb();
    if (DB && DB.getItemTypeDefinition) return DB.getItemTypeDefinition(type);
    return {};
  }

  function mapSourceTypeToResourceType(sourceType, type) {
    const src = toText(sourceType || '').toLowerCase();
    const itemType = toText(type || '').toLowerCase();
    if (src === 'subrent') return 'subrent';
    if (src === 'supplier' || src === 'supplier_catalog') return 'supplier_catalog';
    if (src === 'manual' || itemType === 'manual') return 'virtual';
    if (itemType === 'service' || src === 'service') return 'service';
    return 'own_stock';
  }

  function inferQualityStatus(item, issues) {
    if (!item || item.isActive === false) return 'archived';
    const list = Array.isArray(issues) ? issues : [];
    if (list.some(issue => issue && issue.level === 'blocking')) return 'not_ready';
    if (list.some(issue => issue && issue.level === 'warning')) return 'warnings';
    return 'ready';
  }

  function createResourceIssue(level, path, message, item, meta) {
    const S = ensureSchemas();
    return S.createIssue(level, path, message, Object.assign({
      itemId: item && item.id || '',
      code: item && item.code || '',
      name: item && item.name || ''
    }, meta || {}));
  }

  function validateResourceItemCandidate(item) {
    const report = ensureSchemas().emptyValidationReport('ResourceItemMappingCandidate');
    const S = ensureSchemas();
    const src = item || {};
    if (!toText(src.id)) S.addIssue(report, createResourceIssue('blocking', 'id', 'Resource id is required.', src));
    if (!toText(src.name)) S.addIssue(report, createResourceIssue('blocking', 'name', 'Resource name is required.', src));
    if (!toText(src.category)) S.addIssue(report, createResourceIssue('blocking', 'category', 'Resource category is required.', src));
    if (!toText(src.code)) S.addIssue(report, createResourceIssue('warning', 'code', 'Resource code is empty.', src));
    if (toText(src.sourceType) === 'subrent' && !toText(src.supplierId || src.supplierName)) {
      S.addIssue(report, createResourceIssue('warning', 'supplier', 'Subrent resource should have supplier id or supplier name.', src));
    }
    if (src.isActive !== false && toNumber(src.stockQty, 0) > 0 && toNumber(src.weightKg, 0) === 0 && !['service', 'consumable'].includes(toText(src.type))) {
      S.addIssue(report, createResourceIssue('warning', 'weightKg', 'Active stock resource has no unit weight.', src));
    }
    if (src.isActive !== false && toNumber(src.rentalPrice, 0) === 0 && !['truss_connector'].includes(toText(src.type))) {
      S.addIssue(report, createResourceIssue('warning', 'rentalPrice', 'Resource has no rental price.', src));
    }
    return S.finalizeReport(report);
  }

  function buildTechnicalSpecs(item) {
    const src = item || {};
    const meta = src.meta && typeof src.meta === 'object' ? src.meta : {};
    const specs = Object.assign({}, meta.technicalSpecs || {}, {
      legacyType: toText(src.type),
      legacyCategory: toText(src.category),
      legacySubcategory: toText(src.subcategory)
    });

    if (toNumber(src.powerW, 0) > 0) specs.powerW = toNumber(src.powerW, 0);
    if (toNumber(src.startupPowerW, 0) > 0) specs.startupPowerW = toNumber(src.startupPowerW, 0);
    if (toNumber(src.weightKg, 0) > 0) specs.weightKg = toNumber(src.weightKg, 0);

    ['trussFamily', 'trussCompatibilityGroup', 'trussInterface', 'trussPartKey', 'trussLengthM', 'pixelPitch', 'cabinetSize', 'resolution', 'powerKw', 'phases'].forEach(key => {
      if (meta[key] !== undefined && meta[key] !== null && meta[key] !== '') specs[key] = meta[key];
      if (src[key] !== undefined && src[key] !== null && src[key] !== '') specs[key] = src[key];
    });

    return specs;
  }

  function buildCompatibility(item) {
    const src = item || {};
    const meta = src.meta && typeof src.meta === 'object' ? src.meta : {};
    return Object.assign({}, meta.compatibility || {}, {
      legacyType: toText(src.type),
      legacyCategory: toText(src.category),
      legacySubcategory: toText(src.subcategory),
      trussFamily: toText(src.trussFamily || meta.trussFamily),
      trussCompatibilityGroup: toText(src.trussCompatibilityGroup || meta.trussCompatibilityGroup),
      trussInterface: toText(src.trussInterface || meta.trussInterface),
      trussPartKey: toText(src.trussPartKey || meta.trussPartKey)
    });
  }

  function mapEquipmentItemToResourceItem(input, options) {
    const S = ensureSchemas();
    const opts = options || {};
    const item = normalizeEquipmentItem(input || {});
    const candidateReport = validateResourceItemCandidate(item);
    const issues = candidateReport.issues || [];
    const resource = S.createResourceItem({
      id: item.id,
      workspaceId: opts.workspaceId || item.workspaceId,
      companyId: opts.companyId || item.companyId || item.workspaceId,
      code: item.code,
      name: item.name,
      categoryId: item.category,
      subcategoryId: item.subcategory,
      resourceType: mapSourceTypeToResourceType(item.sourceType, item.type),
      manufacturer: item.manufacturer,
      model: item.model,
      unit: item.unit,
      stockQty: item.stockQty,
      reservedQty: item.reservedQty,
      rentalPrice: item.rentalPrice,
      costPrice: item.replacementCost,
      weightKg: item.weightKg,
      dimensions: item.dimensions || {},
      power: {
        powerW: toNumber(item.powerW, 0),
        startupPowerW: toNumber(item.startupPowerW, 0)
      },
      supplierId: item.supplierId,
      isActive: item.isActive,
      qualityStatus: inferQualityStatus(item, issues),
      technicalSpecs: buildTechnicalSpecs(item),
      compatibility: buildCompatibility(item),
      notes: item.notes
    });
    resource.source = {
      readOnly: true,
      mapperVersion: RESOURCE_MAPPER_VERSION,
      legacySchemaVersion: item.schemaVersion,
      legacySourceType: item.sourceType,
      original: clone(item)
    };
    resource.validation = candidateReport;
    return resource;
  }

  function buildTechnicalSpecSchemaForCategory(categoryId, rows) {
    const fields = {};
    const add = (key, type, label, required) => { fields[key] = { type, label, required: Boolean(required) }; };
    add('legacyType', 'string', 'Legacy equipment type', false);
    add('legacyCategory', 'string', 'Legacy category', false);
    add('legacySubcategory', 'string', 'Legacy subcategory', false);

    const hasPower = rows.some(row => toNumber(row.powerW, 0) > 0 || toNumber(row.startupPowerW, 0) > 0);
    const hasTruss = categoryId === 'truss';
    const hasLed = categoryId === 'led';
    const hasWeight = rows.some(row => toNumber(row.weightKg, 0) > 0);

    if (hasWeight) add('weightKg', 'number', 'Вес за единицу, кг', false);
    if (hasPower) {
      add('powerW', 'number', 'Рабочая мощность, Вт', false);
      add('startupPowerW', 'number', 'Пусковая мощность, Вт', false);
    }
    if (hasTruss) {
      add('trussFamily', 'string', 'Серия фермы', false);
      add('trussCompatibilityGroup', 'string', 'Группа совместимости', false);
      add('trussInterface', 'string', 'Интерфейс соединения', false);
      add('trussPartKey', 'string', 'Ключ детали фермы', false);
      add('trussLengthM', 'number', 'Длина фермы, м', false);
    }
    if (hasLed) {
      add('pixelPitch', 'string', 'Pixel pitch', false);
      add('cabinetSize', 'string', 'Размер кабинета', false);
      add('resolution', 'string', 'Разрешение', false);
    }
    return { fields };
  }

  function mapEquipmentCategoryToResourceCategory(category, rows, options) {
    const S = ensureSchemas();
    const opts = options || {};
    const cat = category || {};
    const categoryRows = (Array.isArray(rows) ? rows : []).filter(row => row.category === cat.id);
    const typeCounts = categoryRows.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + 1;
      return acc;
    }, {});
    const primaryType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const typeDef = primaryType ? getLegacyTypeDefinition(primaryType[0]) : {};

    const resourceCategory = S.createResourceCategory({
      id: cat.id,
      workspaceId: opts.workspaceId || opts.companyId || 'default-company',
      companyId: opts.companyId || opts.workspaceId || 'default-company',
      name: cat.name || cat.id,
      defaultResourceType: 'own_stock',
      defaultUnit: typeDef.defaultUnit || 'шт',
      technicalSpecSchema: buildTechnicalSpecSchemaForCategory(cat.id, categoryRows),
      warehouseFields: ['stockQty', 'reservedQty', 'availableQty', 'replacementCost'],
      quoteFields: ['rentalPrice', 'unit', 'name', 'code'],
      technicalSheetFields: ['weightKg', 'powerW', 'startupPowerW', 'technicalSpecs'],
      compatibilityRules: cat.id === 'truss' ? { familyAware: true, interfaceAware: true } : {},
      uiSchema: {
        legacySubcategories: Array.isArray(cat.subcategories) ? cat.subcategories.slice() : [],
        legacyTypeCounts: typeCounts
      },
      isActive: categoryRows.length > 0 || opts.includeEmptyCategories === true
    });
    resourceCategory.source = {
      readOnly: true,
      mapperVersion: RESOURCE_MAPPER_VERSION,
      legacyCategory: clone(cat),
      legacyRowCount: categoryRows.length
    };
    return resourceCategory;
  }

  function detectDuplicates(resources) {
    const by = (getter) => {
      const map = new Map();
      (Array.isArray(resources) ? resources : []).forEach(row => {
        const key = toText(getter(row)).toLowerCase();
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
      });
      return [...map.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => ({ key, count: rows.length, resourceIds: rows.map(row => row.id), codes: rows.map(row => row.code).filter(Boolean) }));
    };
    return {
      byCode: by(row => row.code),
      byNameManufacturerModel: by(row => `${row.name}|${row.manufacturer}|${row.model}`)
    };
  }

  function mapEquipmentDatabaseToResourceDatabase(items, options) {
    const S = ensureSchemas();
    const opts = options || {};
    const equipmentItems = normalizeEquipmentItems(Array.isArray(items) ? items : []);
    const resourceItems = equipmentItems.map(item => mapEquipmentItemToResourceItem(item, opts));
    const legacyCategories = getLegacyCategories();
    const resourceCategories = legacyCategories
      .map(category => mapEquipmentCategoryToResourceCategory(category, equipmentItems, opts))
      .filter(category => category.isActive || opts.includeEmptyCategories === true);

    const duplicateReport = detectDuplicates(resourceItems);
    const issues = [];
    resourceItems.forEach(resource => {
      (resource.validation && resource.validation.issues || []).forEach(issue => issues.push(issue));
    });
    duplicateReport.byCode.forEach(group => issues.push(S.createIssue('warning', 'duplicates.code', 'Duplicate resource code detected.', group)));
    duplicateReport.byNameManufacturerModel.forEach(group => issues.push(S.createIssue('warning', 'duplicates.nameManufacturerModel', 'Possible duplicate resource identity detected.', group)));

    const report = S.finalizeReport({
      schemaVersion: S.DOMAIN_SCHEMA_VERSION,
      scope: 'ResourceDatabaseMapping',
      ok: true,
      issues,
      generatedAt: S.nowIso()
    });

    return {
      schemaVersion: S.DOMAIN_SCHEMA_VERSION,
      mapperVersion: RESOURCE_MAPPER_VERSION,
      companyId: toText(opts.companyId || opts.workspaceId || 'default-company'),
      workspaceId: toText(opts.workspaceId || opts.companyId || 'default-company'),
      source: {
        readOnly: true,
        kind: 'legacy_equipment_database',
        generatedBy: 'ResourceDatabaseMapper',
        generatedAt: S.nowIso()
      },
      resourceCategories,
      resourceItems,
      duplicateReport,
      validation: report,
      summary: {
        resourceCategoryCount: resourceCategories.length,
        resourceItemCount: resourceItems.length,
        activeItemCount: resourceItems.filter(item => item.isActive !== false).length,
        archivedItemCount: resourceItems.filter(item => item.qualityStatus === 'archived').length,
        warningItemCount: resourceItems.filter(item => item.qualityStatus === 'warnings').length,
        notReadyItemCount: resourceItems.filter(item => item.qualityStatus === 'not_ready').length
      }
    };
  }

  PACKIT.ResourceDatabaseMapper = {
    RESOURCE_MAPPER_VERSION,
    mapSourceTypeToResourceType,
    validateResourceItemCandidate,
    mapEquipmentItemToResourceItem,
    mapEquipmentCategoryToResourceCategory,
    mapEquipmentDatabaseToResourceDatabase,
    detectDuplicates,
    buildTechnicalSpecs,
    buildCompatibility
  };
})();
