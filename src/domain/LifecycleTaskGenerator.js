(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const PACKIT = (GLOBAL.PackitDomain = GLOBAL.PackitDomain || {});

  const LIFECYCLE_TASK_GENERATOR_VERSION = '5.0.0-step3-domain-pipeline-tasks';

  function schemas() {
    return PACKIT.DomainSchemas;
  }

  function ensureSchemas() {
    const S = schemas();
    if (!S) throw new Error('PackitDomain.DomainSchemas is required before LifecycleTaskGenerator.');
    return S;
  }

  function toText(value) { return ensureSchemas().toText(value); }
  function toNumber(value, fallback) { return ensureSchemas().toNumber(value, fallback); }

  function addTask(tasks, project, data) {
    const S = ensureSchemas();
    tasks.push(S.createProjectTask(Object.assign({
      projectId: project.id,
      status: 'todo',
      priority: 'normal',
      createdBy: 'LifecycleTaskGenerator'
    }, data || {})));
  }

  function generateDraftTasks(project) {
    const tasks = [];
    if (!toText(project.client && project.client.name)) addTask(tasks, project, { id: `${project.id}_task_client`, title: 'Указать клиента', assignedRole: 'manager', priority: 'normal' });
    if (!toText(project.venue && project.venue.name)) addTask(tasks, project, { id: `${project.id}_task_venue`, title: 'Указать площадку', assignedRole: 'manager', priority: 'normal' });
    if (!toText(project.eventDateStart)) addTask(tasks, project, { id: `${project.id}_task_date`, title: 'Указать дату мероприятия', assignedRole: 'manager', priority: 'normal' });
    if (project.techDirectorUserId) addTask(tasks, project, { id: `${project.id}_task_site_checklist`, title: 'Провести обследование площадки и заполнить чек-лист', assignedUserId: project.techDirectorUserId, assignedRole: 'tech_director', priority: 'high' });
    return tasks;
  }

  function generateConfirmedTasks(project, warehouseNeeds) {
    const tasks = [];
    addTask(tasks, project, { id: `${project.id}_task_prepare_warehouse`, title: 'Подготовить складской комплект проекта', assignedRole: 'warehouse', priority: 'high' });
    addTask(tasks, project, { id: `${project.id}_task_prepare_documents`, title: 'Проверить документы проекта', assignedRole: 'manager', priority: 'normal' });
    const deficits = warehouseNeeds && Array.isArray(warehouseNeeds.warehouseNeeds) ? warehouseNeeds.warehouseNeeds.filter(row => toNumber(row.deficitQty, 0) > 0) : [];
    if (deficits.length) {
      addTask(tasks, project, { id: `${project.id}_task_close_deficits`, title: `Закрыть дефицит по складу: ${deficits.length} поз.`, assignedRole: 'manager', priority: 'high', description: 'Проверить замены, субаренду или корректировку комплекта.' });
    }
    return tasks;
  }

  function generateWarehouseTasks(project, warehouseNeeds) {
    const tasks = [];
    const rows = warehouseNeeds && Array.isArray(warehouseNeeds.warehouseNeeds) ? warehouseNeeds.warehouseNeeds : [];
    if (rows.length) addTask(tasks, project, { id: `${project.id}_task_pick_list`, title: 'Собрать позиции по складскому листу', assignedRole: 'warehouse', priority: 'high' });
    if (rows.some(row => toNumber(row.deficitQty, 0) > 0)) addTask(tasks, project, { id: `${project.id}_task_warehouse_deficit_review`, title: 'Разобрать складские дефициты перед выдачей', assignedRole: 'warehouse', priority: 'critical' });
    return tasks;
  }

  function generateTasks(project, warehouseNeeds, options) {
    const opts = options || {};
    const status = toText(project && project.status || 'draft');
    let tasks = [];
    if (status === 'draft' || status === 'quote_prepared' || opts.includeDraftTasks) tasks = tasks.concat(generateDraftTasks(project || {}));
    if (status === 'confirmed' || status === 'preparing' || opts.includeConfirmedTasks) tasks = tasks.concat(generateConfirmedTasks(project || {}, warehouseNeeds || {}));
    if (status === 'warehouse_picking' || status === 'picked' || opts.includeWarehouseTasks) tasks = tasks.concat(generateWarehouseTasks(project || {}, warehouseNeeds || {}));

    const seen = new Set();
    const unique = tasks.filter(task => {
      const key = task.id || `${task.projectId}:${task.title}:${task.assignedRole}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = {
      schemaVersion: ensureSchemas().DOMAIN_SCHEMA_VERSION,
      generatorVersion: LIFECYCLE_TASK_GENERATOR_VERSION,
      projectId: toText(project && project.id),
      companyId: toText(project && project.companyId),
      installationId: toText(project && project.installationId),
      status,
      tasks: unique,
      summary: {
        total: unique.length,
        critical: unique.filter(task => task.priority === 'critical').length,
        high: unique.filter(task => task.priority === 'high').length,
        normal: unique.filter(task => task.priority === 'normal').length
      },
      source: {
        readOnly: true,
        generatedBy: 'LifecycleTaskGenerator',
        generatedAt: ensureSchemas().nowIso()
      }
    };
    result.validation = validateTaskSet(result);
    return result;
  }

  function validateTaskSet(result) {
    const S = ensureSchemas();
    const report = S.emptyValidationReport('LifecycleTaskSet');
    if (!toText(result && result.projectId)) S.addIssue(report, S.createIssue('blocking', 'projectId', 'Task set requires projectId.'));
    if (!Array.isArray(result && result.tasks)) S.addIssue(report, S.createIssue('blocking', 'tasks', 'tasks must be an array.'));
    if (!result.source || result.source.readOnly !== true) S.addIssue(report, S.createIssue('blocking', 'source.readOnly', 'Task set must be read-only.'));
    return S.finalizeReport(report);
  }

  PACKIT.LifecycleTaskGenerator = {
    LIFECYCLE_TASK_GENERATOR_VERSION,
    generateDraftTasks,
    generateConfirmedTasks,
    generateWarehouseTasks,
    generateTasks,
    validateTaskSet
  };
})();
