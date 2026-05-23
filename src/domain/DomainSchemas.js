(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});

  const DOMAIN_SCHEMA_VERSION = '5.0.0-step1-readonly';

  const PROJECT_STATUSES = Object.freeze([
    'draft',
    'quote_prepared',
    'quote_sent',
    'confirmed',
    'preparing',
    'warehouse_picking',
    'picked',
    'issued',
    'on_site',
    'returning',
    'closed',
    'cancelled'
  ]);

  const SECTION_TYPES = Object.freeze([
    'constructor',
    'catalog',
    'manual_construction',
    'service',
    'external_supplier',
    'transport',
    'crew',
    'future_custom'
  ]);

  const RESOURCE_TYPES = Object.freeze([
    'own_stock',
    'subrent',
    'service',
    'virtual',
    'supplier_catalog'
  ]);

  const QUALITY_STATUSES = Object.freeze([
    'ready',
    'warnings',
    'not_ready',
    'archived'
  ]);

  const TASK_STATUSES = Object.freeze([
    'todo',
    'in_progress',
    'blocked',
    'done',
    'cancelled'
  ]);

  const DOCUMENT_STATUSES = Object.freeze([
    'draft',
    'prepared',
    'sent',
    'confirmed',
    'superseded',
    'archived'
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (_) { return value; }
  }

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function toMoney(value) {
    return Math.max(0, Math.round(toNumber(value, 0)));
  }

  function toList(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function makeStableId(prefix, sourceId, fallback) {
    const id = toText(sourceId);
    if (id) return id;
    const raw = toText(fallback) || nowIso();
    const slug = raw.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return `${prefix || 'id'}_${slug || Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeEnum(value, allowed, fallback) {
    const id = toText(value || fallback);
    return allowed.includes(id) ? id : fallback;
  }

  function createIssue(level, path, message, meta) {
    return {
      level: normalizeEnum(level, ['info', 'warning', 'blocking'], 'warning'),
      path: toText(path),
      message: toText(message),
      meta: meta && typeof meta === 'object' ? clone(meta) : {}
    };
  }

  function emptyValidationReport(scope) {
    return {
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      scope: toText(scope || 'project'),
      ok: true,
      issues: [],
      generatedAt: nowIso()
    };
  }

  function addIssue(report, issue) {
    if (!report || !issue) return report;
    report.issues.push(issue);
    if (issue.level === 'blocking') report.ok = false;
    return report;
  }

  function finalizeReport(report) {
    const issues = Array.isArray(report && report.issues) ? report.issues : [];
    return Object.assign({}, report, {
      ok: !issues.some(issue => issue && issue.level === 'blocking'),
      summary: {
        info: issues.filter(issue => issue.level === 'info').length,
        warning: issues.filter(issue => issue.level === 'warning').length,
        blocking: issues.filter(issue => issue.level === 'blocking').length
      }
    });
  }

  function createProject(overrides) {
    const src = overrides || {};
    const createdAt = toText(src.createdAt) || nowIso();
    return {
      entity: 'Project',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('project', src.id, src.title || src.name),
      workspaceId: toText(src.workspaceId || src.companyId || 'default-company'),
      companyId: toText(src.companyId || src.workspaceId || 'default-company'),
      installationId: toText(src.installationId),
      status: normalizeEnum(src.status, PROJECT_STATUSES, 'draft'),
      title: toText(src.title || src.name),
      clientId: toText(src.clientId),
      client: src.client && typeof src.client === 'object' ? clone(src.client) : {},
      venue: src.venue && typeof src.venue === 'object' ? clone(src.venue) : {},
      eventDateStart: toText(src.eventDateStart || src.eventDate || (src.venue && src.venue.date)),
      eventDateEnd: toText(src.eventDateEnd),
      managerUserId: toText(src.managerUserId),
      managerName: toText(src.managerName || src.manager),
      riskLevel: toText(src.riskLevel || 'unknown'),
      techDirectorUserId: toText(src.techDirectorUserId),
      sections: toList(src.sections),
      assignments: toList(src.assignments),
      readinessChecks: toList(src.readinessChecks),
      quoteSnapshots: toList(src.quoteSnapshots),
      calendarEvents: toList(src.calendarEvents),
      documents: toList(src.documents),
      tasks: toList(src.tasks),
      events: toList(src.events),
      totals: src.totals && typeof src.totals === 'object' ? clone(src.totals) : {},
      source: src.source && typeof src.source === 'object' ? clone(src.source) : {},
      createdAt,
      updatedAt: toText(src.updatedAt) || createdAt
    };
  }

  function createProjectSection(overrides) {
    const src = overrides || {};
    const createdAt = toText(src.createdAt) || nowIso();
    return {
      entity: 'ProjectSection',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('section', src.id, src.title || src.kind || src.type),
      projectId: toText(src.projectId),
      type: normalizeEnum(src.type, SECTION_TYPES, 'future_custom'),
      kind: toText(src.kind),
      title: toText(src.title),
      status: toText(src.status || 'draft'),
      source: toText(src.source || 'manual'),
      responsibleUserId: toText(src.responsibleUserId),
      input: src.input && typeof src.input === 'object' ? clone(src.input) : {},
      technicalResult: src.technicalResult && typeof src.technicalResult === 'object' ? clone(src.technicalResult) : {},
      items: toList(src.items),
      quoteRows: toList(src.quoteRows),
      bomRows: toList(src.bomRows),
      warehouseRows: toList(src.warehouseRows),
      tasks: toList(src.tasks),
      documents: toList(src.documents),
      supplierId: toText(src.supplierId),
      subrentorId: toText(src.subrentorId),
      riskFlags: toList(src.riskFlags),
      notes: toText(src.notes),
      attachments: toList(src.attachments),
      createdAt,
      updatedAt: toText(src.updatedAt) || createdAt
    };
  }

  function createResourceItem(overrides) {
    const src = overrides || {};
    return {
      entity: 'ResourceItem',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('resource', src.id || src.resourceItemId, src.code || src.name),
      workspaceId: toText(src.workspaceId || src.companyId || 'default-company'),
      companyId: toText(src.companyId || src.workspaceId || 'default-company'),
      code: toText(src.code || src.sku || src.article),
      name: toText(src.name || src.title),
      categoryId: toText(src.categoryId || src.category),
      subcategoryId: toText(src.subcategoryId || src.subcategory),
      resourceType: normalizeEnum(src.resourceType, RESOURCE_TYPES, 'own_stock'),
      manufacturer: toText(src.manufacturer || src.brand),
      model: toText(src.model),
      unit: toText(src.unit || 'шт'),
      stockQty: Math.max(0, toNumber(src.stockQty || src.stock || src.quantityOnHand, 0)),
      reservedQty: Math.max(0, toNumber(src.reservedQty || src.reserved, 0)),
      rentalPrice: toMoney(src.rentalPrice || src.price || src.clientPrice),
      costPrice: toMoney(src.costPrice || src.internalCost),
      weightKg: Math.max(0, toNumber(src.weightKg || src.weight, 0)),
      dimensions: src.dimensions && typeof src.dimensions === 'object' ? clone(src.dimensions) : {},
      power: src.power && typeof src.power === 'object' ? clone(src.power) : {},
      supplierId: toText(src.supplierId),
      isActive: src.isActive !== false,
      qualityStatus: normalizeEnum(src.qualityStatus, QUALITY_STATUSES, 'ready'),
      technicalSpecs: src.technicalSpecs && typeof src.technicalSpecs === 'object' ? clone(src.technicalSpecs) : {},
      compatibility: src.compatibility && typeof src.compatibility === 'object' ? clone(src.compatibility) : {},
      attachments: toList(src.attachments),
      notes: toText(src.notes)
    };
  }

  function createResourceCategory(overrides) {
    const src = overrides || {};
    return {
      entity: 'ResourceCategory',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('category', src.id || src.categoryId, src.name),
      workspaceId: toText(src.workspaceId || src.companyId || 'default-company'),
      companyId: toText(src.companyId || src.workspaceId || 'default-company'),
      name: toText(src.name),
      parentId: toText(src.parentId),
      defaultResourceType: normalizeEnum(src.defaultResourceType, RESOURCE_TYPES, 'own_stock'),
      defaultUnit: toText(src.defaultUnit || 'шт'),
      technicalSpecSchema: src.technicalSpecSchema && typeof src.technicalSpecSchema === 'object' ? clone(src.technicalSpecSchema) : {},
      warehouseFields: toList(src.warehouseFields),
      quoteFields: toList(src.quoteFields),
      technicalSheetFields: toList(src.technicalSheetFields),
      compatibilityRules: src.compatibilityRules && typeof src.compatibilityRules === 'object' ? clone(src.compatibilityRules) : {},
      uiSchema: src.uiSchema && typeof src.uiSchema === 'object' ? clone(src.uiSchema) : {},
      isActive: src.isActive !== false
    };
  }

  function createQuoteRow(overrides) {
    const src = overrides || {};
    const qty = Math.max(0, toNumber(src.quantity || src.qty, 0));
    const clientPrice = toMoney(src.clientPrice || src.price || src.rentalPrice);
    const internalCost = toMoney(src.internalCost || src.costPrice);
    return {
      entity: 'QuoteRow',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('quote_row', src.id, src.title || src.name),
      projectId: toText(src.projectId),
      sectionId: toText(src.sectionId),
      sourceType: toText(src.sourceType || 'unknown'),
      resourceItemId: toText(src.resourceItemId || src.itemId),
      title: toText(src.title || src.name),
      description: toText(src.description || src.notes),
      quantity: qty,
      unit: toText(src.unit || 'шт'),
      clientPrice,
      internalCost,
      discount: toMoney(src.discount),
      totalClientPrice: toMoney(src.totalClientPrice == null ? qty * clientPrice : src.totalClientPrice),
      totalInternalCost: toMoney(src.totalInternalCost == null ? qty * internalCost : src.totalInternalCost),
      margin: toMoney(src.margin),
      visibility: toText(src.visibility || 'client'),
      notes: toText(src.notes)
    };
  }

  function createBomRow(overrides) {
    const src = overrides || {};
    const qty = Math.max(0, toNumber(src.quantity || src.qty, 0));
    const weightKg = Math.max(0, toNumber(src.weightKg || src.weight, 0));
    return {
      entity: 'BomRow',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('bom_row', src.id, src.code || src.name),
      projectId: toText(src.projectId),
      sectionId: toText(src.sectionId),
      resourceItemId: toText(src.resourceItemId || src.itemId),
      code: toText(src.code || src.sku),
      name: toText(src.name || src.title),
      quantity: qty,
      unit: toText(src.unit || 'шт'),
      weightKg,
      totalWeightKg: Math.max(0, toNumber(src.totalWeightKg, qty * weightKg)),
      power: src.power && typeof src.power === 'object' ? clone(src.power) : {},
      source: toText(src.source || 'unknown'),
      technicalMeta: src.technicalMeta && typeof src.technicalMeta === 'object' ? clone(src.technicalMeta) : {},
      warehouseRequired: src.warehouseRequired !== false,
      notes: toText(src.notes)
    };
  }

  function createWarehouseNeed(overrides) {
    const src = overrides || {};
    const requiredQty = Math.max(0, toNumber(src.requiredQty || src.quantity || src.qty, 0));
    const availableQty = Math.max(0, toNumber(src.availableQty || src.available, 0));
    const reservedQty = Math.max(0, toNumber(src.reservedQty || src.reserved, 0));
    const deficitQty = Math.max(0, toNumber(src.deficitQty == null ? requiredQty - availableQty : src.deficitQty, 0));
    return {
      entity: 'WarehouseNeed',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('warehouse_need', src.id, src.resourceItemId || src.name),
      projectId: toText(src.projectId),
      sectionId: toText(src.sectionId),
      resourceItemId: toText(src.resourceItemId || src.itemId),
      code: toText(src.code || src.sku),
      name: toText(src.name || src.title),
      requiredQty,
      availableQty,
      reservedQty,
      deficitQty,
      status: toText(src.status || (deficitQty > 0 ? 'deficit' : 'planned')),
      replacementOptions: toList(src.replacementOptions),
      subrentPlanId: toText(src.subrentPlanId),
      notes: toText(src.notes)
    };
  }

  function createProjectTask(overrides) {
    const src = overrides || {};
    const createdAt = toText(src.createdAt) || nowIso();
    return {
      entity: 'ProjectTask',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('task', src.id, src.title),
      projectId: toText(src.projectId),
      sectionId: toText(src.sectionId),
      assignedUserId: toText(src.assignedUserId),
      assignedRole: toText(src.assignedRole),
      title: toText(src.title),
      description: toText(src.description),
      status: normalizeEnum(src.status, TASK_STATUSES, 'todo'),
      priority: toText(src.priority || 'normal'),
      dueAt: toText(src.dueAt),
      documents: toList(src.documents),
      comments: toList(src.comments),
      createdBy: toText(src.createdBy),
      createdAt,
      updatedAt: toText(src.updatedAt) || createdAt
    };
  }

  function createProjectAssignment(overrides) {
    const src = overrides || {};
    return {
      entity: 'ProjectAssignment',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('assignment', src.id, `${src.projectId || ''}-${src.userId || ''}`),
      projectId: toText(src.projectId),
      userId: toText(src.userId),
      projectRoles: toList(src.projectRoles),
      permissions: toList(src.permissions),
      dateStart: toText(src.dateStart),
      dateEnd: toText(src.dateEnd),
      status: toText(src.status || 'active'),
      createdBy: toText(src.createdBy)
    };
  }

  function createDocumentArtifact(overrides) {
    const src = overrides || {};
    const createdAt = toText(src.createdAt) || nowIso();
    return {
      entity: 'DocumentArtifact',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('document', src.id, src.title || src.type),
      projectId: toText(src.projectId),
      sectionId: toText(src.sectionId),
      type: toText(src.type || 'unknown'),
      title: toText(src.title),
      version: toText(src.version || '1'),
      status: normalizeEnum(src.status, DOCUMENT_STATUSES, 'draft'),
      visibility: toText(src.visibility || 'internal'),
      fileUrl: toText(src.fileUrl),
      snapshotId: toText(src.snapshotId),
      createdBy: toText(src.createdBy),
      createdAt
    };
  }

  function createCalendarEvent(overrides) {
    const src = overrides || {};
    return {
      entity: 'CalendarEvent',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('calendar_event', src.id, src.title),
      projectId: toText(src.projectId),
      title: toText(src.title),
      dateStart: toText(src.dateStart),
      dateEnd: toText(src.dateEnd),
      location: toText(src.location),
      participants: toList(src.participants),
      externalCalendarId: toText(src.externalCalendarId),
      status: toText(src.status || 'planned'),
      notes: toText(src.notes)
    };
  }

  function createProjectEvent(overrides) {
    const src = overrides || {};
    return {
      entity: 'ProjectEvent',
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: makeStableId('project_event', src.id, src.type),
      projectId: toText(src.projectId),
      type: toText(src.type || 'unknown'),
      actorUserId: toText(src.actorUserId),
      createdAt: toText(src.createdAt) || nowIso(),
      payload: src.payload && typeof src.payload === 'object' ? clone(src.payload) : {},
      before: src.before && typeof src.before === 'object' ? clone(src.before) : null,
      after: src.after && typeof src.after === 'object' ? clone(src.after) : null,
      visibility: toText(src.visibility || 'internal')
    };
  }

  function validateProject(project) {
    const report = emptyValidationReport('Project');
    const p = project || {};
    if (!toText(p.id)) addIssue(report, createIssue('blocking', 'project.id', 'Project id is required.'));
    if (!toText(p.title)) addIssue(report, createIssue('warning', 'project.title', 'Project title is empty.'));
    if (!toText(p.companyId || p.workspaceId)) addIssue(report, createIssue('blocking', 'project.companyId', 'Company/workspace scope is required.'));
    if (!PROJECT_STATUSES.includes(toText(p.status))) addIssue(report, createIssue('blocking', 'project.status', 'Unknown project status.', { status: p.status }));
    if (!Array.isArray(p.sections)) addIssue(report, createIssue('blocking', 'project.sections', 'Project sections must be an array.'));
    return finalizeReport(report);
  }

  function validateProjectSection(section) {
    const report = emptyValidationReport('ProjectSection');
    const s = section || {};
    if (!toText(s.id)) addIssue(report, createIssue('blocking', 'section.id', 'Section id is required.'));
    if (!SECTION_TYPES.includes(toText(s.type))) addIssue(report, createIssue('blocking', 'section.type', 'Unknown section type.', { type: s.type }));
    if (!toText(s.kind)) addIssue(report, createIssue('warning', 'section.kind', 'Section kind is empty.'));
    ['quoteRows', 'bomRows', 'warehouseRows'].forEach(key => {
      if (!Array.isArray(s[key])) addIssue(report, createIssue('blocking', `section.${key}`, `${key} must be an array.`));
    });
    return finalizeReport(report);
  }

  ROOT.DomainSchemas = {
    DOMAIN_SCHEMA_VERSION,
    PROJECT_STATUSES,
    SECTION_TYPES,
    RESOURCE_TYPES,
    QUALITY_STATUSES,
    TASK_STATUSES,
    DOCUMENT_STATUSES,
    nowIso,
    clone,
    toText,
    toNumber,
    toMoney,
    toList,
    makeStableId,
    createIssue,
    emptyValidationReport,
    addIssue,
    finalizeReport,
    createProject,
    createProjectSection,
    createResourceItem,
    createResourceCategory,
    createQuoteRow,
    createBomRow,
    createWarehouseNeed,
    createProjectTask,
    createProjectAssignment,
    createDocumentArtifact,
    createCalendarEvent,
    createProjectEvent,
    validateProject,
    validateProjectSection
  };
})();
