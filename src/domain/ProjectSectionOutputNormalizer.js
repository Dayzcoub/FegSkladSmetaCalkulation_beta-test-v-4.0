(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});

  const NORMALIZER_VERSION = '5.0.0-step2-section-output-normalization';

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function snapshotBuilder() {
    return PACKIT.ProjectSnapshotBuilder;
  }

  function ensureSchemas() {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before ProjectSectionOutputNormalizer.');
    return S;
  }

  function clone(value) {
    const S = ensureSchemas();
    return S.clone(value);
  }

  function toText(value) {
    const S = ensureSchemas();
    return S.toText(value);
  }

  function toNumber(value, fallback) {
    const S = ensureSchemas();
    return S.toNumber(value, fallback);
  }

  function toMoney(value) {
    const S = ensureSchemas();
    return S.toMoney(value);
  }

  function toList(value) {
    const S = ensureSchemas();
    return S.toList(value);
  }

  function readFirstMetric(source, keys, fallback) {
    const src = source || {};
    for (const key of keys) {
      if (src[key] !== undefined && src[key] !== null && src[key] !== '') {
        const value = Number(src[key]);
        if (Number.isFinite(value)) return value;
      }
    }
    return Number(fallback || 0);
  }

  function sumRows(rows, keys) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
      const src = row || {};
      for (const key of keys) {
        if (src[key] !== undefined && src[key] !== null && src[key] !== '') return sum + Number(src[key] || 0);
      }
      return sum;
    }, 0);
  }

  function buildTechnicalSummary(section, output) {
    const src = section || {};
    const bomRows = output && Array.isArray(output.bomRows) ? output.bomRows : [];
    const warehouseRows = output && Array.isArray(output.warehouseRows) ? output.warehouseRows : [];
    const quoteRows = output && Array.isArray(output.quoteRows) ? output.quoteRows : [];
    const totalClientPrice = sumRows(quoteRows, ['totalClientPrice']);
    const totalInternalCost = sumRows(quoteRows, ['totalInternalCost']);
    const bomWeight = sumRows(bomRows, ['totalWeightKg']);

    return {
      sectionId: toText(src.id),
      kind: toText(src.kind),
      title: toText(src.title),
      status: toText(src.status),
      totalClientPrice: toMoney(readFirstMetric(src.technicalResult || src.input || src, ['totalClientPrice', 'total', 'rental', 'price', 'rentalTotal'], totalClientPrice)),
      totalInternalCost: toMoney(readFirstMetric(src.technicalResult || src.input || src, ['totalInternalCost', 'internalCost', 'cost'], totalInternalCost)),
      weightKg: Math.max(0, readFirstMetric(src.technicalResult || src.input || src, ['weightKg', 'weight', 'totalWeightKg'], bomWeight)),
      powerW: Math.max(0, readFirstMetric(src.technicalResult || src.input || src, ['powerW', 'power', 'totalPowerW'], 0)),
      startupPowerW: Math.max(0, readFirstMetric(src.technicalResult || src.input || src, ['startupPowerW', 'totalStartupPowerW'], 0)),
      quoteRowCount: quoteRows.length,
      bomRowCount: bomRows.length,
      warehouseNeedCount: warehouseRows.length,
      deficitCount: warehouseRows.filter(row => Number(row && row.deficitQty) > 0).length,
      riskFlags: toList(src.riskFlags),
      generatedAt: ensureSchemas().nowIso(),
      generatedBy: 'ProjectSectionOutputNormalizer',
      normalizerVersion: NORMALIZER_VERSION
    };
  }

  function buildDocumentContext(section, output) {
    const src = section || {};
    const technicalSummary = output && output.technicalSummary ? output.technicalSummary : buildTechnicalSummary(src, output || {});
    return {
      sectionId: toText(src.id),
      kind: toText(src.kind),
      title: toText(src.title),
      status: toText(src.status),
      clientSafe: {
        title: toText(src.title),
        totalClientPrice: technicalSummary.totalClientPrice,
        quoteRows: toList(output && output.quoteRows).map(row => ({
          title: row.title,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          clientPrice: row.clientPrice,
          totalClientPrice: row.totalClientPrice
        }))
      },
      internalTech: {
        technicalSummary,
        bomRows: toList(output && output.bomRows),
        warehouseRows: toList(output && output.warehouseRows),
        riskFlags: toList(src.riskFlags),
        notes: toText(src.notes)
      },
      warehouse: {
        warehouseRows: toList(output && output.warehouseRows).map(row => ({
          resourceItemId: row.resourceItemId,
          code: row.code,
          name: row.name,
          requiredQty: row.requiredQty,
          unit: row.unit || 'шт',
          status: row.status,
          notes: row.notes
        }))
      },
      generatedAt: ensureSchemas().nowIso(),
      generatedBy: 'ProjectSectionOutputNormalizer'
    };
  }

  function normalizeExistingRows(section, key, factory) {
    const S = ensureSchemas();
    const rows = Array.isArray(section && section[key]) ? section[key] : [];
    return rows.map((row, index) => factory(Object.assign({}, row, {
      id: row && row.id ? row.id : `${section.id || 'section'}_${key}_${index + 1}`,
      sectionId: row && row.sectionId ? row.sectionId : section.id,
      projectId: row && row.projectId ? row.projectId : section.projectId
    })));
  }

  function rebuildRowsFromSnapshotBuilder(section) {
    const SB = snapshotBuilder();
    if (!SB || !SB.buildQuoteRowsForSection || !SB.buildBomRowsForSection || !SB.buildWarehouseRowsFromBom) return null;
    const projectId = toText(section.projectId);
    const sectionId = toText(section.id);
    const kind = toText(section.kind);
    const input = section.input && typeof section.input === 'object' ? section.input : section;
    const quoteRows = SB.buildQuoteRowsForSection(projectId, sectionId, kind, input);
    const bomRows = SB.buildBomRowsForSection(projectId, sectionId, kind, input);
    const warehouseRows = SB.buildWarehouseRowsFromBom(projectId, sectionId, bomRows);
    return { quoteRows, bomRows, warehouseRows };
  }

  function normalizeSectionOutput(section, options) {
    const S = ensureSchemas();
    const src = section || {};
    const opts = options || {};
    const rebuilt = opts.rebuild === true ? rebuildRowsFromSnapshotBuilder(src) : null;

    const quoteRows = rebuilt ? rebuilt.quoteRows : normalizeExistingRows(src, 'quoteRows', S.createQuoteRow);
    const bomRows = rebuilt ? rebuilt.bomRows : normalizeExistingRows(src, 'bomRows', S.createBomRow);
    const warehouseRows = rebuilt ? rebuilt.warehouseRows : normalizeExistingRows(src, 'warehouseRows', S.createWarehouseNeed);

    const output = {
      schemaVersion: S.DOMAIN_SCHEMA_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      sectionId: toText(src.id),
      projectId: toText(src.projectId),
      kind: toText(src.kind),
      type: toText(src.type),
      quoteRows,
      bomRows,
      warehouseRows,
      tasks: toList(src.tasks),
      documents: toList(src.documents),
      generatedAt: S.nowIso(),
      generatedBy: 'ProjectSectionOutputNormalizer',
      source: {
        readOnly: true,
        mode: rebuilt ? 'rebuilt_from_section_input' : 'normalized_existing_output'
      }
    };

    output.technicalSummary = buildTechnicalSummary(src, output);
    output.documentContext = buildDocumentContext(src, output);
    output.validation = validateSectionOutput(output);
    return output;
  }

  function normalizeProjectSectionOutputs(project, options) {
    const S = ensureSchemas();
    const src = project || {};
    const sections = Array.isArray(src.sections) ? src.sections : [];
    const outputs = sections.map(section => normalizeSectionOutput(section, options || {}));
    const quoteRows = outputs.flatMap(output => output.quoteRows);
    const bomRows = outputs.flatMap(output => output.bomRows);
    const warehouseRows = outputs.flatMap(output => output.warehouseRows);
    const totals = {
      totalClientPrice: toMoney(sumRows(outputs.map(output => output.technicalSummary), ['totalClientPrice'])),
      totalInternalCost: toMoney(sumRows(outputs.map(output => output.technicalSummary), ['totalInternalCost'])),
      weightKg: Math.max(0, sumRows(outputs.map(output => output.technicalSummary), ['weightKg'])),
      powerW: Math.max(0, sumRows(outputs.map(output => output.technicalSummary), ['powerW'])),
      startupPowerW: Math.max(0, sumRows(outputs.map(output => output.technicalSummary), ['startupPowerW'])),
      quoteRowCount: quoteRows.length,
      bomRowCount: bomRows.length,
      warehouseNeedCount: warehouseRows.length
    };

    const result = {
      schemaVersion: S.DOMAIN_SCHEMA_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      projectId: toText(src.id),
      companyId: toText(src.companyId || src.workspaceId),
      installationId: toText(src.installationId),
      outputs,
      quoteRows,
      bomRows,
      warehouseRows,
      totals,
      generatedAt: S.nowIso(),
      generatedBy: 'ProjectSectionOutputNormalizer',
      source: {
        readOnly: true,
        projectSnapshotSource: clone(src.source || {})
      }
    };
    result.validation = validateProjectOutputs(result);
    return result;
  }

  function validateSectionOutput(output) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('ProjectSectionOutput');
    const out = output || {};
    if (!toText(out.sectionId)) S.addIssue(report, S.createIssue('blocking', 'sectionId', 'Section output requires sectionId.'));
    ['quoteRows', 'bomRows', 'warehouseRows'].forEach(key => {
      if (!Array.isArray(out[key])) S.addIssue(report, S.createIssue('blocking', key, `${key} must be an array.`));
    });
    if (!out.source || out.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Section output must be read-only.'));
    return S.finalizeReport(report);
  }

  function validateProjectOutputs(outputs) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('ProjectSectionOutputs');
    const src = outputs || {};
    if (!toText(src.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'Project outputs require projectId.'));
    if (!Array.isArray(src.outputs)) S.addIssue(report, S.createIssue('blocking', 'outputs', 'outputs must be an array.'));
    (src.outputs || []).forEach((output, index) => {
      const sectionReport = validateSectionOutput(output);
      sectionReport.issues.forEach(issue => S.addIssue(report, Object.assign({}, issue, {
        path: `outputs[${index}].${issue.path || ''}`.replace(/\.$/, '')
      })));
    });
    if (!src.source || src.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Project outputs must be read-only.'));
    return S.finalizeReport(report);
  }

  PACKIT.ProjectSectionOutputNormalizer = {
    NORMALIZER_VERSION,
    normalizeSectionOutput,
    normalizeProjectSectionOutputs,
    buildTechnicalSummary,
    buildDocumentContext,
    validateSectionOutput,
    validateProjectOutputs
  };
})();
