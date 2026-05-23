(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});

  const DOCUMENT_SNAPSHOT_BUILDER_VERSION = '5.0.0-step3-domain-pipeline-documents';

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function ensureSchemas() {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before DocumentSnapshotBuilder.');
    return S;
  }

  function toText(value) { return ensureSchemas().toText(value); }
  function toMoney(value) { return ensureSchemas().toMoney(value); }
  function clone(value) { return ensureSchemas().clone(value); }

  function buildClientQuoteContext(project, sectionOutputs) {
    const outputs = sectionOutputs || {};
    const quoteRows = Array.isArray(outputs.quoteRows) ? outputs.quoteRows : [];
    return {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        eventDateStart: project.eventDateStart,
        venue: project.venue,
        managerName: project.managerName
      },
      client: project.client || {},
      totals: {
        totalClientPrice: toMoney(outputs.totals && outputs.totals.totalClientPrice),
        totalInternalCost: undefined,
        margin: undefined
      },
      sections: (outputs.outputs || []).map(output => ({
        sectionId: output.sectionId,
        kind: output.kind,
        title: output.documentContext && output.documentContext.clientSafe && output.documentContext.clientSafe.title || output.kind,
        totalClientPrice: output.technicalSummary && output.technicalSummary.totalClientPrice || 0,
        quoteRows: output.documentContext && output.documentContext.clientSafe ? output.documentContext.clientSafe.quoteRows : []
      })),
      quoteRows: quoteRows.map(row => ({
        title: row.title,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        clientPrice: row.clientPrice,
        totalClientPrice: row.totalClientPrice
      }))
    };
  }

  function buildInternalTechContext(project, sectionOutputs, warehouseNeeds) {
    return {
      project: clone(project),
      sectionOutputs: clone(sectionOutputs && sectionOutputs.outputs || []),
      totals: clone(sectionOutputs && sectionOutputs.totals || {}),
      warehouseSummary: clone(warehouseNeeds && warehouseNeeds.summary || {}),
      warehouseNeeds: clone(warehouseNeeds && warehouseNeeds.warehouseNeeds || [])
    };
  }

  function buildWarehouseContext(project, warehouseNeeds) {
    return {
      project: {
        id: project.id,
        title: project.title,
        eventDateStart: project.eventDateStart,
        venue: project.venue,
        managerName: project.managerName
      },
      summary: clone(warehouseNeeds && warehouseNeeds.summary || {}),
      rows: (warehouseNeeds && warehouseNeeds.warehouseNeeds || []).map(row => ({
        resourceItemId: row.resourceItemId,
        code: row.code,
        name: row.name,
        requiredQty: row.requiredQty,
        availableQty: row.availableQty,
        reservedQty: row.reservedQty,
        deficitQty: row.deficitQty,
        status: row.status,
        notes: row.notes
      }))
    };
  }

  function createDocumentSnapshot(project, type, context, options) {
    const S = ensureSchemas();
    const opts = options || {};
    const titleMap = {
      client_quote: 'Клиентское КП',
      internal_tech_sheet: 'Внутренний техлист',
      warehouse_list: 'Складской лист'
    };
    const visibilityMap = {
      client_quote: 'client',
      internal_tech_sheet: 'internal',
      warehouse_list: 'warehouse'
    };
    const document = S.createDocumentArtifact({
      id: opts.id || `${project.id}_${type}_${Date.now().toString(36)}`,
      projectId: project.id,
      type,
      title: opts.title || titleMap[type] || type,
      version: opts.version || '1',
      status: 'prepared',
      visibility: visibilityMap[type] || 'internal',
      snapshotId: opts.snapshotId || `${project.id}_${type}_snapshot`,
      createdBy: opts.createdBy || 'DocumentSnapshotBuilder'
    });
    document.context = context || {};
    document.source = {
      readOnly: true,
      builderVersion: DOCUMENT_SNAPSHOT_BUILDER_VERSION,
      generatedAt: S.nowIso(),
      generatedBy: 'DocumentSnapshotBuilder'
    };
    document.validation = validateDocumentSnapshot(document);
    return document;
  }

  function buildDocumentSnapshots(project, sectionOutputs, warehouseNeeds, options) {
    const opts = options || {};
    const docs = [];
    docs.push(createDocumentSnapshot(project, 'client_quote', buildClientQuoteContext(project, sectionOutputs), opts.clientQuote || {}));
    docs.push(createDocumentSnapshot(project, 'internal_tech_sheet', buildInternalTechContext(project, sectionOutputs, warehouseNeeds), opts.internalTechSheet || {}));
    docs.push(createDocumentSnapshot(project, 'warehouse_list', buildWarehouseContext(project, warehouseNeeds), opts.warehouseList || {}));
    const result = {
      schemaVersion: ensureSchemas().DOMAIN_SCHEMA_VERSION,
      builderVersion: DOCUMENT_SNAPSHOT_BUILDER_VERSION,
      projectId: project.id,
      companyId: project.companyId,
      installationId: project.installationId,
      documents: docs,
      source: {
        readOnly: true,
        generatedBy: 'DocumentSnapshotBuilder',
        generatedAt: ensureSchemas().nowIso()
      }
    };
    result.validation = validateDocumentSnapshotSet(result);
    return result;
  }

  function validateDocumentSnapshot(document) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('DocumentSnapshot');
    if (!toText(document && document.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'Document requires projectId.'));
    if (!toText(document && document.type)) S.addIssue(report, S.createIssue('blocking', 'type', 'Document requires type.'));
    if (!document.source || document.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Document snapshot must be read-only.'));
    return S.finalizeReport(report);
  }

  function validateDocumentSnapshotSet(result) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('DocumentSnapshotSet');
    if (!toText(result && result.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'Document snapshot set requires projectId.'));
    if (!Array.isArray(result && result.documents)) S.addIssue(report, S.createIssue('blocking', 'documents', 'documents must be an array.'));
    (result.documents || []).forEach((doc, index) => {
      const docReport = validateDocumentSnapshot(doc);
      docReport.issues.forEach(issue => S.addIssue(report, Object.assign({}, issue, { path: `documents[${index}].${issue.path || ''}`.replace(/\.$/, '') })));
    });
    if (!result.source || result.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Document snapshot set must be read-only.'));
    return S.finalizeReport(report);
  }

  PACKIT.DocumentSnapshotBuilder = {
    DOCUMENT_SNAPSHOT_BUILDER_VERSION,
    buildClientQuoteContext,
    buildInternalTechContext,
    buildWarehouseContext,
    createDocumentSnapshot,
    buildDocumentSnapshots,
    validateDocumentSnapshot,
    validateDocumentSnapshotSet
  };
})();
