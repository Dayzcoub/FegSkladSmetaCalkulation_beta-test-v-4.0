(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return toText(value).toLowerCase(); }
  function nowIso() { return new Date().toISOString(); }

  function getEquipmentItems(items) {
    const db = ROOT.EquipmentDatabase;
    if (!db) return [];
    return db.normalizeItems ? db.normalizeItems(Array.isArray(items) ? items : db.listItems({ onlyActive: false })) : [];
  }

  function getClients(clients) {
    if (Array.isArray(clients)) return clients.slice();
    return ROOT.ClientsStorage && ROOT.ClientsStorage.getClients ? ROOT.ClientsStorage.getClients() : [];
  }

  function getProjects(projects) {
    if (Array.isArray(projects)) return projects.slice();
    return ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.listProjects ? ROOT.QuoteProjectStorage.listProjects() : [];
  }

  function duplicateGroups(rows, keyGetter) {
    const map = new Map();
    rows.forEach(row => {
      const key = lower(keyGetter(row));
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()].filter(([, group]) => group.length > 1).map(([key, group]) => ({ key, count: group.length, rows: group }));
  }

  function makeIssue(area, severity, title, detail, payload) {
    return { area, severity, title, detail: toText(detail), payload: payload || {}, at: nowIso() };
  }

  function auditEquipment(items) {
    const db = ROOT.EquipmentDatabase;
    const rows = getEquipmentItems(items);
    const issues = [];
    rows.forEach(item => {
      if (!item.code) issues.push(makeIssue('equipment', 'warn', 'Нет кода позиции', item.name || item.id, { id: item.id }));
      if (item.code && db && db.isGeneratedCodeForCategory && !db.isGeneratedCodeForCategory(item)) issues.push(makeIssue('equipment', 'warn', 'Код не соответствует категории', `${item.code} → ${item.category}`, { id: item.id, expectedPrefix: db.getCategoryCodePrefix ? db.getCategoryCodePrefix(item.category) : '' }));
      if (!item.name || item.name === 'Новая позиция') issues.push(makeIssue('equipment', 'bad', 'Нет нормального названия', item.code || item.id, { id: item.id }));
      if (!item.category) issues.push(makeIssue('equipment', 'bad', 'Нет категории', item.code || item.name, { id: item.id }));
      if (db && db.isKnownSubcategory && item.subcategory && !db.isKnownSubcategory(item.category, item.subcategory)) issues.push(makeIssue('equipment', 'info', 'Нестандартная подкатегория', `${item.code || item.name}: ${item.subcategory}`, { id: item.id, category: item.category }));
      if (db && db.isTypeCompatibleWithCategory && item.type && item.category && !db.isTypeCompatibleWithCategory(item.type, item.category)) issues.push(makeIssue('equipment', 'warn', 'Тип не соответствует категории', `${item.code || item.name}: ${item.type} → ${item.category}`, { id: item.id, type: item.type, category: item.category }));
      if (item.meta && item.meta.originalCategory && item.meta.originalCategory !== item.category) issues.push(makeIssue('equipment', 'info', 'Категория нормализована из алиаса', `${item.meta.originalCategory} → ${item.category}`, { id: item.id }));
      if (item.meta && item.meta.originalType && item.meta.originalType !== item.type) issues.push(makeIssue('equipment', 'info', 'Тип нормализован из алиаса', `${item.meta.originalType} → ${item.type}`, { id: item.id }));
      if (item.sourceType === 'subrent' && !item.supplierName) issues.push(makeIssue('equipment', 'warn', 'Субаренда без поставщика', item.code || item.name, { id: item.id }));
      if (item.availableQty !== Math.max(0, item.stockQty - item.reservedQty)) issues.push(makeIssue('equipment', 'warn', 'Доступно не совпадает со складом и резервом', item.code || item.name, { id: item.id, availableQty: item.availableQty }));
      if (item.stockQty > 0 && item.weightKg === 0 && !['service', 'consumable'].includes(item.type)) issues.push(makeIssue('equipment', 'info', 'Нет веса', item.code || item.name, { id: item.id }));
      if (item.powerW === 0 && ['light_fixture', 'sound', 'audio_console', 'monitoring', 'backline', 'led_cabinet'].includes(item.type)) issues.push(makeIssue('equipment', 'info', 'Нет мощности', item.code || item.name, { id: item.id }));
      if (!item.isActive) issues.push(makeIssue('equipment', 'info', 'Позиция отключена', item.code || item.name, { id: item.id }));
    });
    duplicateGroups(rows, item => item.code).forEach(group => issues.push(makeIssue('equipment', 'bad', 'Дублирующийся код', group.key, { count: group.count })));
    duplicateGroups(rows, item => `${item.category}:${item.name}`).forEach(group => issues.push(makeIssue('equipment', 'warn', 'Похожее название в категории', group.key, { count: group.count })));
    const syncPreview = db && db.buildEquipmentSyncPreview ? db.buildEquipmentSyncPreview(rows, { includeRows: false }) : null;
    const readinessReport = db && db.buildEquipmentReadinessReport ? db.buildEquipmentReadinessReport(rows, { includeRows: false }) : null;
    const completionMatrix = db && db.buildManualCompletionMatrix ? db.buildManualCompletionMatrix(rows, { includeRows: false }) : null;
    if (syncPreview && syncPreview.blockerCount) issues.push(makeIssue('equipment', 'bad', 'Sync preview blockers', `${syncPreview.blockerCount} blockers before equipment_items upsert`, { blockerCount: syncPreview.blockerCount }));
    if (syncPreview && syncPreview.warningCount) issues.push(makeIssue('equipment', 'warn', 'Sync preview warnings', `${syncPreview.warningCount} warnings before equipment_items upsert`, { warningCount: syncPreview.warningCount }));
    if (readinessReport && readinessReport.counts && readinessReport.counts.manual) issues.push(makeIssue('equipment', 'warn', 'Readiness manual tasks', `${readinessReport.counts.manual} задач ручной добивки перед sync`, { manualTasks: readinessReport.counts.manual, score: readinessReport.score }));
    if (readinessReport && readinessReport.counts && readinessReport.counts.safe_fix) issues.push(makeIssue('equipment', 'info', 'Readiness safe-fix tasks', `${readinessReport.counts.safe_fix} безопасных авто-исправлений доступно`, { safeFixTasks: readinessReport.counts.safe_fix }));
    if (completionMatrix && completionMatrix.issueCount) issues.push(makeIssue('equipment', 'warn', 'Manual completion matrix', `${completionMatrix.issueCount} задач ручной добивки в ${completionMatrix.problemRows} позициях`, { issueCount: completionMatrix.issueCount, problemRows: completionMatrix.problemRows, byIssue: completionMatrix.byIssue }));
    return {
      area: 'equipment',
      total: rows.length,
      active: rows.filter(item => item.isActive).length,
      categoryReport: db && db.buildCategoryReport ? db.buildCategoryReport(rows) : null,
      typeReport: db && db.buildTypeReport ? db.buildTypeReport(rows) : null,
      schemaReport: db && db.buildSyncSchemaReport ? db.buildSyncSchemaReport(rows) : null,
      syncPreview,
      readinessReport,
      completionMatrix,
      issues,
      score: scoreFromIssues(rows.length, issues)
    };
  }

  function auditClients(clients) {
    const rows = getClients(clients);
    const issues = [];
    rows.forEach(client => {
      if (!toText(client.name)) issues.push(makeIssue('clients', 'bad', 'Клиент без названия', client.id || 'без id', { id: client.id }));
      if (!toText(client.phone) && !toText(client.email) && !toText(client.contact)) issues.push(makeIssue('clients', 'warn', 'Нет контактных данных', client.name || client.id, { id: client.id }));
    });
    duplicateGroups(rows, client => client.email).forEach(group => issues.push(makeIssue('clients', 'warn', 'Дублирующийся email', group.key, { count: group.count })));
    duplicateGroups(rows, client => client.phone).forEach(group => issues.push(makeIssue('clients', 'warn', 'Дублирующийся телефон', group.key, { count: group.count })));
    duplicateGroups(rows, client => client.name).forEach(group => issues.push(makeIssue('clients', 'info', 'Похожее название клиента', group.key, { count: group.count })));
    return { area: 'clients', total: rows.length, issues, score: scoreFromIssues(rows.length || 1, issues) };
  }

  function auditProjects(projects) {
    const rows = getProjects(projects);
    const issues = [];
    rows.forEach(project => {
      const quote = project.quote || {};
      const scope = quote.scope || project.scope || {};
      const hasScope = Object.keys(scope).some(key => scope[key]);
      if (!toText(project.projectName)) issues.push(makeIssue('projects', 'bad', 'Проект без названия', project.projectId, { projectId: project.projectId }));
      if (!toText(project.clientName)) issues.push(makeIssue('projects', 'bad', 'Проект без клиента', project.projectName || project.projectId, { projectId: project.projectId }));
      if (!toText(project.eventDate)) issues.push(makeIssue('projects', 'warn', 'Нет даты мероприятия', project.projectName || project.projectId, { projectId: project.projectId }));
      if (!hasScope) issues.push(makeIssue('projects', 'warn', 'Не выбран состав сметы', project.projectName || project.projectId, { projectId: project.projectId }));
      if (ROOT.ProjectReadinessChecklist && ROOT.ProjectReadinessChecklist.buildChecklist) {
        const checklist = ROOT.ProjectReadinessChecklist.buildChecklist(quote);
        if (checklist && checklist.score < 70) issues.push(makeIssue('projects', 'warn', 'Низкая готовность проекта', `${project.projectName || project.projectId}: ${checklist.score}%`, { projectId: project.projectId, score: checklist.score }));
      }
    });
    return { area: 'projects', total: rows.length, issues, score: scoreFromIssues(rows.length || 1, issues) };
  }

  function scoreFromIssues(total, issues) {
    const count = Math.max(1, Number(total || 1));
    const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'bad' ? 18 : issue.severity === 'warn' ? 8 : 3), 0);
    return Math.max(0, Math.min(100, Math.round(100 - penalty / Math.sqrt(count))));
  }

  function summarizeIssues(reports) {
    const list = reports.flatMap(report => report.issues || []);
    return {
      total: list.length,
      bad: list.filter(issue => issue.severity === 'bad').length,
      warn: list.filter(issue => issue.severity === 'warn').length,
      info: list.filter(issue => issue.severity === 'info').length,
      byArea: reports.map(report => ({ area: report.area, total: report.total, issues: report.issues.length, score: report.score }))
    };
  }

  function buildQualityReport(input) {
    const opts = input || {};
    const reports = [
      auditEquipment(opts.equipmentItems),
      auditClients(opts.clients),
      auditProjects(opts.projects)
    ];
    const summary = summarizeIssues(reports);
    const score = Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length);
    return {
      type: 'feg-stage-pro-data-quality-report',
      version: '3.12.0',
      generatedAt: nowIso(),
      score,
      status: score >= 86 ? 'ok' : score >= 65 ? 'warn' : 'bad',
      summary,
      reports,
      recommendations: buildRecommendations(summary, reports)
    };
  }

  function buildRecommendations(summary, reports) {
    const rec = [];
    if (summary.bad) rec.push('Сначала исправить критичные проблемы: пустые названия, дубли кодов, проекты без клиента.');
    if (summary.warn) rec.push('Затем закрыть предупреждения: контакты клиентов, даты мероприятий, поставщики субаренды.');
    const equipment = reports.find(report => report.area === 'equipment');
    if (equipment && equipment.issues.some(issue => issue.title === 'Нет веса')) rec.push('Дозаполнить вес по складу, чтобы техлисты и логистика считались точнее.');
    if (equipment && equipment.issues.some(issue => issue.title === 'Нет мощности')) rec.push('Дозаполнить мощность для света, звука и LED, чтобы итоговая мощность была полной.');
    if (equipment && equipment.issues.some(issue => issue.title === 'Код не соответствует категории')) rec.push('Привести коды оборудования к серии категории перед реальным Supabase sync.');
    if (equipment && equipment.issues.some(issue => issue.title === 'Нестандартная подкатегория')) rec.push('Проверить нестандартные подкатегории: часть можно добавить в дерево, часть исправить в карточке позиции.');
    if (equipment && equipment.issues.some(issue => issue.title === 'Тип не соответствует категории')) rec.push('Сверить типы оборудования с категориями: это важно перед реальным upsert в equipment_items.');
    if (equipment && equipment.schemaReport && !equipment.schemaReport.ok) rec.push('Перед backend sync проверить schema report: обязательные поля и calculated available_qty должны быть чистыми.');
    if (equipment && equipment.syncPreview && equipment.syncPreview.blockerCount) rec.push('Открыть Sync preview и убрать blockers перед реальным Supabase upsert.');
    if (equipment && equipment.syncPreview && !equipment.syncPreview.blockerCount && equipment.syncPreview.warningCount) rec.push('Sync preview уже без blockers; оставшиеся warnings можно закрывать постепенно перед первым write.');
    if (equipment && equipment.readinessReport && equipment.readinessReport.counts && equipment.readinessReport.counts.safe_fix) rec.push('В базе оборудования доступен Safe cleanup: он сохранит нормализацию, приведёт коды к сериям и не будет выдумывать реальные вес/мощность/остатки.');
    if (equipment && equipment.readinessReport && equipment.readinessReport.counts && equipment.readinessReport.counts.manual) rec.push('Readiness checklist показывает ручную добивку: вес, мощность, остатки и поставщики требуют фактических данных.');
    if (equipment && equipment.completionMatrix && equipment.completionMatrix.issueCount) rec.push('Открыть Manual completion matrix в базе оборудования: там есть быстрые фильтры и patch template для ручной добивки.');
    if (!rec.length) rec.push('Критичных замечаний нет. Можно готовить данные к backend sync.');
    return rec;
  }

  function exportReport(input) {
    return JSON.stringify(buildQualityReport(input), null, 2);
  }

  function renderDataQualityCenter(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const report = buildQualityReport(options || {});
    const activeArea = root._v4QualityArea || 'all';
    const issues = report.reports.flatMap(area => (area.issues || []).map(issue => Object.assign({ areaScore: area.score }, issue)))
      .filter(issue => activeArea === 'all' || issue.area === activeArea);
    root.innerHTML = `
      <div class="v4-card v4-data-quality-center">
        <div class="v4-section-head">
          <div>
            <div class="v4-kicker">Data Quality · local QA</div>
            <h3>Контроль качества данных</h3>
            <p class="v4-muted">Проверка базы оборудования, клиентов и проектов перед синхронизацией с backend и реальной эксплуатацией.</p>
          </div>
          <div class="v4-sync-score ${escapeHtml(report.status)}"><span>${report.score}%</span><small>${escapeHtml(report.status)}</small></div>
        </div>
        <div class="v4-data-quality-stats">
          ${report.reports.map(renderAreaStat).join('')}
        </div>
        <div class="v4-doc-filter-row">
          ${['all','equipment','clients','projects'].map(area => `<button type="button" class="${activeArea === area ? 'active' : ''}" data-v4-quality-area="${area}">${labelArea(area)}</button>`).join('')}
        </div>
        <div class="v4-data-quality-layout">
          <div class="v4-sync-panel">
            <h4>Рекомендации</h4>
            <div class="v4-sync-issues ${escapeHtml(report.status)}">
              ${report.recommendations.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
            </div>
            <div class="v4-actions">
              <button type="button" class="btn-secondary" data-v4-quality-export>Quality JSON</button>
            </div>
          </div>
          <div class="v4-sync-panel">
            <h4>Замечания · ${issues.length}</h4>
            ${issues.length ? `<div class="v4-table-wrap"><table class="v4-table v4-table--quality"><thead><tr><th>Уровень</th><th>Блок</th><th>Проблема</th><th>Деталь</th></tr></thead><tbody>${issues.slice(0, 120).map(renderIssueRow).join('')}</tbody></table></div>` : '<div class="v4-empty">Замечаний по выбранному блоку нет.</div>'}
          </div>
        </div>
        <div data-v4-quality-output></div>
      </div>`;
    root.querySelectorAll('[data-v4-quality-area]').forEach(btn => btn.addEventListener('click', () => { root._v4QualityArea = btn.getAttribute('data-v4-quality-area') || 'all'; renderDataQualityCenter(root, options); }));
    const exportBtn = root.querySelector('[data-v4-quality-export]');
    if (exportBtn) exportBtn.addEventListener('click', () => showExport(root, report));
    return root;
  }

  function renderAreaStat(report) {
    const cls = report.score >= 86 ? 'ok' : report.score >= 65 ? 'warn' : 'bad';
    return `<div class="v4-data-quality-stat ${cls}"><b>${report.score}%</b><span>${escapeHtml(labelArea(report.area))}</span><small>${report.total} строк · ${report.issues.length} замечаний</small></div>`;
  }

  function renderIssueRow(issue) {
    return `<tr><td><span class="v4-quality-severity ${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span></td><td>${escapeHtml(labelArea(issue.area))}</td><td><b>${escapeHtml(issue.title)}</b></td><td>${escapeHtml(issue.detail || '—')}</td></tr>`;
  }

  function showExport(root, report) {
    const output = root.querySelector('[data-v4-quality-output]');
    if (!output) return;
    output.innerHTML = `<textarea class="v4-export-text" readonly>${escapeHtml(JSON.stringify(report, null, 2))}</textarea>`;
  }

  function labelArea(area) {
    return ({ all: 'Все', equipment: 'База оборудования', clients: 'Клиенты', projects: 'Проекты' })[area] || area;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.DataQualityCenter = {
    auditEquipment,
    auditClients,
    auditProjects,
    buildQualityReport,
    exportReport,
    renderDataQualityCenter
  };
})();
