(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});
  const FEG = GLOBAL.FEGModules || {};

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function quoteModel() {
    return FEG.QuoteModel;
  }

  function clone(value) {
    const S = schemas();
    return S && S.clone ? S.clone(value) : JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function toText(value) {
    const S = schemas();
    return S && S.toText ? S.toText(value) : String(value == null ? '' : value).trim();
  }

  function toNumber(value, fallback) {
    const S = schemas();
    return S && S.toNumber ? S.toNumber(value, fallback) : (Number.isFinite(Number(value)) ? Number(value) : Number(fallback || 0));
  }

  function makeStableId(prefix, sourceId, fallback) {
    const S = schemas();
    return S.makeStableId(prefix, sourceId, fallback);
  }

  function normalizeQuote(input) {
    const QM = quoteModel();
    if (QM && QM.createQuoteDraft) return QM.createQuoteDraft(input || {});
    return clone(input || {});
  }

  function readSectionMetric(section, keys) {
    const src = section || {};
    for (const key of keys) {
      const value = src[key];
      if (Number.isFinite(Number(value))) return Number(value);
    }
    return 0;
  }

  function detectSectionType(kind, section) {
    if (kind === 'stage' || kind === 'truss' || kind === 'led') return 'constructor';
    if (kind === 'transport') return 'transport';
    if (kind === 'crew') return 'crew';
    if (kind === 'equipment') return 'catalog';
    const src = section || {};
    if (src.supplierId || src.subrentorId) return 'external_supplier';
    return 'future_custom';
  }

  function buildSectionTitle(kind) {
    const map = {
      stage: 'Сцена',
      truss: 'Фермы',
      led: 'LED',
      equipment: 'Оборудование и услуги',
      transport: 'Транспорт',
      crew: 'Команда'
    };
    return map[kind] || kind;
  }

  function buildQuoteRowsForSection(projectId, sectionId, kind, section) {
    const S = schemas();
    const src = section || {};
    const rows = [];

    if (kind === 'equipment') {
      const items = Array.isArray(src.items) ? src.items : [];
      return items.map((item, index) => S.createQuoteRow({
        id: item.id || `${sectionId}_quote_${index + 1}`,
        projectId,
        sectionId,
        sourceType: 'equipment_item',
        resourceItemId: item.resourceItemId || item.itemId || item.id,
        title: item.name || item.title || item.label,
        description: item.description || item.notes,
        quantity: item.qty || item.quantity || 1,
        unit: item.unit || 'шт',
        clientPrice: item.rentalPrice || item.price || item.clientPrice || 0,
        internalCost: item.internalCost || item.costPrice || 0,
        visibility: 'client',
        notes: item.notes
      }));
    }

    if (kind === 'transport') {
      const total = readSectionMetric(src, ['total']);
      if (total > 0) rows.push(S.createQuoteRow({
        id: `${sectionId}_transport_quote`,
        projectId,
        sectionId,
        sourceType: 'transport',
        title: src.vehicleLabel ? `Транспорт · ${src.vehicleLabel}` : 'Транспорт',
        quantity: 1,
        unit: 'усл.',
        clientPrice: total,
        visibility: 'client',
        notes: src.notes
      }));
      return rows;
    }

    if (kind === 'crew') return rows;

    const total = readSectionMetric(src, ['total', 'rental', 'price', 'rentalTotal']);
    if (total > 0 || src.status === 'configured') rows.push(S.createQuoteRow({
      id: `${sectionId}_summary_quote`,
      projectId,
      sectionId,
      sourceType: `${kind}_summary`,
      title: buildSectionTitle(kind),
      quantity: 1,
      unit: 'компл.',
      clientPrice: total,
      visibility: 'client',
      notes: src.notes
    }));
    return rows;
  }

  function buildBomRowsForSection(projectId, sectionId, kind, section) {
    const S = schemas();
    const src = section || {};
    const rawRows = [];

    const candidates = [
      src.bomRows,
      src.bom,
      src.itemsForBom,
      src.kitItems,
      src.finalKit,
      src.parts
    ];
    candidates.forEach(value => {
      if (Array.isArray(value)) rawRows.push(...value);
    });

    if (kind === 'equipment' && Array.isArray(src.items)) rawRows.push(...src.items);

    return rawRows.map((row, index) => S.createBomRow({
      id: row.id || `${sectionId}_bom_${index + 1}`,
      projectId,
      sectionId,
      resourceItemId: row.resourceItemId || row.itemId || row.id,
      code: row.code || row.sku,
      name: row.name || row.title || row.label,
      quantity: row.quantity || row.qty || row.count || 1,
      unit: row.unit || 'шт',
      weightKg: row.weightKg || row.weight,
      totalWeightKg: row.totalWeightKg,
      source: kind,
      technicalMeta: row.technicalMeta || row.meta,
      warehouseRequired: row.warehouseRequired !== false,
      notes: row.notes
    }));
  }

  function buildWarehouseRowsFromBom(projectId, sectionId, bomRows) {
    const S = schemas();
    return (Array.isArray(bomRows) ? bomRows : [])
      .filter(row => row && row.warehouseRequired !== false)
      .map((row, index) => S.createWarehouseNeed({
        id: `${row.id || sectionId}_${index + 1}_need`,
        projectId,
        sectionId,
        resourceItemId: row.resourceItemId,
        code: row.code,
        name: row.name,
        requiredQty: row.quantity,
        availableQty: 0,
        reservedQty: 0,
        status: 'planned',
        notes: row.notes
      }));
  }

  function buildProjectSection(projectId, kind, section) {
    const S = schemas();
    const src = section || {};
    const sectionId = makeStableId('section', src.id || `${projectId}_${kind}`, `${projectId}_${kind}`);
    const quoteRows = buildQuoteRowsForSection(projectId, sectionId, kind, src);
    const bomRows = buildBomRowsForSection(projectId, sectionId, kind, src);
    const warehouseRows = buildWarehouseRowsFromBom(projectId, sectionId, bomRows);

    return S.createProjectSection({
      id: sectionId,
      projectId,
      type: detectSectionType(kind, src),
      kind,
      title: src.title || buildSectionTitle(kind),
      status: src.status || (src ? 'configured' : 'draft'),
      source: src.source || 'quote_snapshot_builder',
      input: src,
      technicalResult: {
        total: readSectionMetric(src, ['total', 'rental', 'price', 'rentalTotal']),
        weightKg: readSectionMetric(src, ['weightKg', 'weight', 'totalWeightKg']),
        powerW: readSectionMetric(src, ['powerW', 'power', 'totalPowerW']),
        startupPowerW: readSectionMetric(src, ['startupPowerW', 'totalStartupPowerW'])
      },
      items: Array.isArray(src.items) ? src.items : [],
      quoteRows,
      bomRows,
      warehouseRows,
      notes: src.notes
    });
  }

  function buildSections(projectId, quote) {
    const sections = quote.sections || {};
    const out = [];
    ['stage', 'truss', 'led', 'equipment'].forEach(kind => {
      const section = sections[kind];
      if (!section) return;
      if (kind !== 'equipment' && quote.scope && quote.scope[kind] === false) return;
      if (kind === 'equipment') {
        const scope = quote.scope || {};
        const enabled = scope.sound || scope.light || scope.backline || scope.services || (section.items && section.items.length);
        if (!enabled) return;
      }
      out.push(buildProjectSection(projectId, kind, section));
    });

    if (quote.transport) out.push(buildProjectSection(projectId, 'transport', quote.transport));
    if (Array.isArray(quote.crewAssignments) && quote.crewAssignments.length) {
      out.push(buildProjectSection(projectId, 'crew', {
        status: 'configured',
        items: quote.crewAssignments,
        notes: ''
      }));
    }
    return out;
  }

  function collectRows(project, key) {
    return (project.sections || []).flatMap(section => Array.isArray(section[key]) ? section[key] : []);
  }

  function validateSnapshot(project) {
    const S = schemas();
    const report = S.emptyValidationReport('ProjectSnapshot');
    const projectReport = S.validateProject(project);
    projectReport.issues.forEach(issue => S.addIssue(report, issue));
    (project.sections || []).forEach((section, index) => {
      const sectionReport = S.validateProjectSection(section);
      sectionReport.issues.forEach(issue => S.addIssue(report, Object.assign({}, issue, {
        path: `sections[${index}].${issue.path || ''}`.replace(/\.$/, '')
      })));
    });

    if (!project.source || project.source.readOnly !== true) {
      S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Project snapshot must be read-only.'));
    }
    return S.finalizeReport(report);
  }

  function buildProjectSnapshot(input, options) {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before ProjectSnapshotBuilder.');

    const opts = options || {};
    const quote = normalizeQuote(input || {});
    const projectId = makeStableId('project', quote.id, quote.project && quote.project.name);
    const sections = buildSections(projectId, quote);
    const project = S.createProject({
      id: projectId,
      workspaceId: quote.workspaceId,
      companyId: opts.companyId || quote.companyId || quote.workspaceId,
      installationId: opts.installationId || quote.installationId,
      status: quote.status === 'sent' ? 'quote_sent' : quote.status === 'confirmed' ? 'confirmed' : 'draft',
      title: quote.project && quote.project.name,
      clientId: quote.client && quote.client.id,
      client: quote.client,
      venue: quote.venue,
      eventDateStart: quote.venue && quote.venue.date,
      managerName: quote.project && quote.project.manager,
      sections,
      assignments: quote.crewAssignments || [],
      totals: quote.totals || {},
      source: {
        kind: 'legacy_quote_draft',
        quoteId: quote.id,
        quoteModelVersion: quote.modelVersion,
        quoteAppVersion: quote.appVersion,
        readOnly: true,
        generatedBy: 'ProjectSnapshotBuilder',
        generatedAt: S.nowIso()
      },
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt
    });

    project.quoteRows = collectRows(project, 'quoteRows');
    project.bomRows = collectRows(project, 'bomRows');
    project.warehouseRows = collectRows(project, 'warehouseRows');
    project.validation = validateSnapshot(project);
    return project;
  }

  PACKIT.ProjectSnapshotBuilder = {
    buildProjectSnapshot,
    validateSnapshot,
    buildSections,
    buildProjectSection,
    buildQuoteRowsForSection,
    buildBomRowsForSection,
    buildWarehouseRowsFromBom
  };
})();
