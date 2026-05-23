(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});

  const WAREHOUSE_NEED_NORMALIZER_VERSION = '5.0.0-step3-domain-pipeline-warehouse-needs';

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function ensureSchemas() {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before WarehouseNeedNormalizer.');
    return S;
  }

  function toText(value) { return ensureSchemas().toText(value); }
  function toNumber(value, fallback) { return ensureSchemas().toNumber(value, fallback); }
  function toList(value) { return ensureSchemas().toList(value); }

  function keyValues(row) {
    const src = row || {};
    return [src.resourceItemId, src.code, src.name].map(value => toText(value).toLowerCase()).filter(Boolean);
  }

  function buildAvailabilityIndex(resourceItems) {
    const index = new Map();
    (Array.isArray(resourceItems) ? resourceItems : []).forEach(item => {
      keyValues(item).forEach(key => {
        if (!index.has(key)) index.set(key, item);
      });
    });
    return index;
  }

  function findAvailabilitySource(need, index) {
    for (const key of keyValues(need)) {
      if (index.has(key)) return index.get(key);
    }
    return null;
  }

  function normalizeWarehouseNeed(input, availabilityIndex, options) {
    const S = ensureSchemas();
    const opts = options || {};
    const src = input || {};
    const source = availabilityIndex ? findAvailabilitySource(src, availabilityIndex) : null;
    const requiredQty = Math.max(0, toNumber(src.requiredQty || src.quantity || src.qty, 0));
    const availableQty = source
      ? Math.max(0, toNumber(source.stockQty, 0) - toNumber(source.reservedQty, 0))
      : Math.max(0, toNumber(src.availableQty || src.available, 0));
    const reservedQty = source ? Math.max(0, toNumber(source.reservedQty, 0)) : Math.max(0, toNumber(src.reservedQty || src.reserved, 0));
    const deficitQty = Math.max(0, requiredQty - availableQty);
    const status = deficitQty > 0 ? 'deficit' : (reservedQty > 0 ? 'partly_reserved_or_available' : 'available_or_planned');

    const need = S.createWarehouseNeed({
      id: src.id,
      projectId: src.projectId || opts.projectId,
      sectionId: src.sectionId,
      resourceItemId: src.resourceItemId || (source && source.id),
      code: src.code || (source && source.code),
      name: src.name || (source && source.name),
      requiredQty,
      availableQty,
      reservedQty,
      deficitQty,
      status,
      replacementOptions: src.replacementOptions,
      subrentPlanId: src.subrentPlanId,
      notes: src.notes
    });

    need.source = {
      readOnly: true,
      normalizerVersion: WAREHOUSE_NEED_NORMALIZER_VERSION,
      matchedResourceItemId: source && source.id || '',
      matchedBy: source ? 'resourceItemId/code/name' : 'none'
    };
    need.validation = validateWarehouseNeed(need);
    return need;
  }

  function normalizeWarehouseNeeds(inputRows, resourceItems, options) {
    const index = buildAvailabilityIndex(resourceItems || []);
    return (Array.isArray(inputRows) ? inputRows : []).map(row => normalizeWarehouseNeed(row, index, options || {}));
  }

  function normalizeWarehouseNeedsFromProjectOutputs(projectOutputs, resourceItems, options) {
    const src = projectOutputs || {};
    const rows = Array.isArray(src.warehouseRows) ? src.warehouseRows : [];
    const normalized = normalizeWarehouseNeeds(rows, resourceItems || [], Object.assign({}, options || {}, { projectId: src.projectId }));
    const summary = {
      totalNeeds: normalized.length,
      availableNeeds: normalized.filter(row => row.deficitQty <= 0).length,
      deficitNeeds: normalized.filter(row => row.deficitQty > 0).length,
      totalRequiredQty: normalized.reduce((sum, row) => sum + toNumber(row.requiredQty, 0), 0),
      totalDeficitQty: normalized.reduce((sum, row) => sum + toNumber(row.deficitQty, 0), 0)
    };
    const result = {
      schemaVersion: ensureSchemas().DOMAIN_SCHEMA_VERSION,
      normalizerVersion: WAREHOUSE_NEED_NORMALIZER_VERSION,
      projectId: toText(src.projectId),
      companyId: toText(src.companyId),
      installationId: toText(src.installationId),
      warehouseNeeds: normalized,
      summary,
      source: {
        readOnly: true,
        projectOutputsReadOnly: Boolean(src.source && src.source.readOnly)
      },
      generatedAt: ensureSchemas().nowIso(),
      generatedBy: 'WarehouseNeedNormalizer'
    };
    result.validation = validateWarehouseNeedSet(result);
    return result;
  }

  function validateWarehouseNeed(need) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('WarehouseNeed');
    if (!toText(need && need.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'WarehouseNeed requires projectId.'));
    if (!toText(need && (need.resourceItemId || need.code || need.name))) S.addIssue(report, S.createIssue('blocking', 'identity', 'WarehouseNeed requires resource identity.'));
    if (toNumber(need && need.requiredQty, 0) <= 0) S.addIssue(report, S.createIssue('warning', 'requiredQty', 'WarehouseNeed required quantity is zero.'));
    if (!need.source || need.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'WarehouseNeed must be read-only.'));
    return S.finalizeReport(report);
  }

  function validateWarehouseNeedSet(result) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('WarehouseNeedSet');
    if (!toText(result && result.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'WarehouseNeedSet requires projectId.'));
    if (!Array.isArray(result && result.warehouseNeeds)) S.addIssue(report, S.createIssue('blocking', 'warehouseNeeds', 'warehouseNeeds must be an array.'));
    (result.warehouseNeeds || []).forEach((need, index) => {
      const needReport = validateWarehouseNeed(need);
      needReport.issues.forEach(issue => S.addIssue(report, Object.assign({}, issue, { path: `warehouseNeeds[${index}].${issue.path || ''}`.replace(/\.$/, '') })));
    });
    if (!result.source || result.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'WarehouseNeedSet must be read-only.'));
    return S.finalizeReport(report);
  }

  PACKIT.WarehouseNeedNormalizer = {
    WAREHOUSE_NEED_NORMALIZER_VERSION,
    buildAvailabilityIndex,
    normalizeWarehouseNeed,
    normalizeWarehouseNeeds,
    normalizeWarehouseNeedsFromProjectOutputs,
    validateWarehouseNeed,
    validateWarehouseNeedSet
  };
})();
