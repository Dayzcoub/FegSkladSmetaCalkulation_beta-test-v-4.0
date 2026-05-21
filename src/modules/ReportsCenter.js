(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const REPORTS_CENTER_VERSION = '3.9.6';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function money(value) { return `${Math.round(toNumber(value, 0)).toLocaleString('ru-RU')} ₽`; }
  function nowIso() { return new Date().toISOString(); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }

  function getEquipmentItems(input) {
    if (Array.isArray(input)) return ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.normalizeItems ? ROOT.EquipmentDatabase.normalizeItems(input) : input.slice();
    const db = ROOT.EquipmentDatabase;
    return db && db.listItems ? db.listItems({ onlyActive: false }) : [];
  }

  function getClients(input) {
    if (Array.isArray(input)) return input.slice();
    return ROOT.ClientsStorage && ROOT.ClientsStorage.getClients ? ROOT.ClientsStorage.getClients() : [];
  }

  function getProjects(input) {
    if (Array.isArray(input)) return input.slice();
    const store = ROOT.QuoteProjectStorage;
    if (store && store.listProjectIndex) return store.listProjectIndex();
    return store && store.listProjects ? store.listProjects() : [];
  }

  function categoryLabel(categoryId) {
    const db = ROOT.EquipmentDatabase;
    const tree = db && db.CATEGORY_TREE ? db.CATEGORY_TREE : [];
    const found = tree.find(cat => cat.id === categoryId);
    return found ? found.name : (categoryId || 'Без категории');
  }

  function buildEquipmentReport(items) {
    const rows = getEquipmentItems(items);
    const active = rows.filter(item => item.isActive !== false);
    const byCategoryMap = new Map();
    rows.forEach(item => {
      const key = item.category || 'unknown';
      const current = byCategoryMap.get(key) || { category: key, label: categoryLabel(key), rows: 0, stockQty: 0, availableQty: 0, replacementValue: 0, rentalValue: 0, weightKg: 0, powerW: 0 };
      current.rows += 1;
      current.stockQty += toNumber(item.stockQty, 0);
      current.availableQty += toNumber(item.availableQty, 0);
      current.replacementValue += toNumber(item.replacementCost, 0) * toNumber(item.stockQty, 0);
      current.rentalValue += toNumber(item.rentalPrice, 0) * toNumber(item.stockQty, 0);
      current.weightKg += toNumber(item.weightKg, 0) * toNumber(item.stockQty, 0);
      current.powerW += toNumber(item.powerW, 0) * toNumber(item.stockQty, 0);
      byCategoryMap.set(key, current);
    });
    const byCategory = [...byCategoryMap.values()].sort((a, b) => b.rows - a.rows || a.label.localeCompare(b.label, 'ru'));
    return {
      totalItems: rows.length,
      activeItems: active.length,
      inactiveItems: rows.length - active.length,
      totalStockQty: rows.reduce((sum, item) => sum + toNumber(item.stockQty, 0), 0),
      totalAvailableQty: rows.reduce((sum, item) => sum + toNumber(item.availableQty, 0), 0),
      replacementValue: rows.reduce((sum, item) => sum + toNumber(item.replacementCost, 0) * toNumber(item.stockQty, 0), 0),
      rentalValue: rows.reduce((sum, item) => sum + toNumber(item.rentalPrice, 0) * toNumber(item.stockQty, 0), 0),
      byCategory
    };
  }

  function buildClientReport(clients) {
    const rows = getClients(clients);
    const withEmail = rows.filter(client => toText(client.email)).length;
    const withPhone = rows.filter(client => toText(client.phone || client.contactPhone)).length;
    return {
      totalClients: rows.length,
      withEmail,
      withPhone,
      contactCoverage: rows.length ? Math.round(((withEmail + withPhone) / (rows.length * 2)) * 100) : 100,
      recent: rows.slice(0, 8).map(client => ({ id: client.id, name: client.name, email: client.email, phone: client.phone || client.contactPhone }))
    };
  }

  function getQuote(project) {
    if (!project) return null;
    if (project.indexOnly) return project.quote || null;
    if (project.quote) return project.quote;
    return ROOT.QuoteModel && ROOT.QuoteModel.createQuoteDraft ? ROOT.QuoteModel.createQuoteDraft(project) : project;
  }

  function getProjectReadinessScore(project, quote) {
    if (project && project.indexOnly) {
      const errors = project.validation && Array.isArray(project.validation.errors) ? project.validation.errors.length : 0;
      return errors ? 65 : 100;
    }
    if (quote && ROOT.ProjectReadinessChecklist && ROOT.ProjectReadinessChecklist.buildChecklist) {
      const checklist = ROOT.ProjectReadinessChecklist.buildChecklist(quote);
      return toNumber(checklist && checklist.score, 0);
    }
    return 0;
  }

  function buildProjectReport(projects) {
    const rows = getProjects(projects);
    const byStatus = {};
    const upcoming = [];
    let readinessSum = 0;
    let readinessCount = 0;
    let totalWeight = 0;
    let totalPower = 0;
    let totalStartupPower = 0;
    rows.forEach(project => {
      const status = toText(project.status || (project.quote && project.quote.status) || 'draft') || 'draft';
      byStatus[status] = (byStatus[status] || 0) + 1;
      const quote = getQuote(project);
      const readinessScore = getProjectReadinessScore(project, quote);
      if (readinessScore > 0) {
        readinessSum += readinessScore;
        readinessCount += 1;
      }
      const totals = project.totals || (quote && quote.totals) || {};
      totalWeight += toNumber(totals.weightKg || totals.totalWeightKg, 0);
      totalPower += toNumber(totals.powerW || totals.totalPowerW, 0);
      totalStartupPower += toNumber(totals.startupPowerW || totals.totalStartupPowerW, 0);
      const date = toText(project.eventDate || (quote && quote.venue && quote.venue.date));
      if (date) upcoming.push({ projectId: project.projectId || project.id || (quote && quote.id), projectName: project.projectName || (quote && quote.project && quote.project.name) || 'Без названия', clientName: project.clientName || (quote && quote.client && quote.client.name) || '', eventDate: date, status });
    });
    upcoming.sort((a, b) => String(a.eventDate).localeCompare(String(b.eventDate)));
    return {
      totalProjects: rows.length,
      byStatus,
      readinessAverage: readinessCount ? Math.round(readinessSum / readinessCount) : 0,
      upcoming: upcoming.slice(0, 10),
      totals: { weightKg: totalWeight, powerW: totalPower, startupPowerW: totalStartupPower }
    };
  }

  function buildWarehouseReport(projects) {
    const rows = getProjects(projects);
    const totals = { projects: rows.length, reservationRows: 0, reservedQty: 0, deficitQty: 0, subrentQty: 0, unmatchedRows: 0 };
    const projectRows = rows.map(project => {
      const quote = getQuote(project);
      let reservation = null;
      if (!(project && project.indexOnly)) {
        try {
          reservation = quote && ROOT.ReservationPlanner && ROOT.ReservationPlanner.buildReservationPlan ? ROOT.ReservationPlanner.buildReservationPlan(quote) : null;
        } catch (_) { reservation = null; }
      }
      const bom = project && project.v4BomSummary || {};
      const rTotals = reservation && reservation.totals || {
        rows: toNumber(bom.warehouse || bom.sharedBom || bom.quoteItems, 0),
        reservedQty: toNumber(project && project.totals && (project.totals.reservedQty || project.totals.warehouseReservedQty), 0),
        deficitQty: toNumber(project && project.totals && (project.totals.deficitQty || project.totals.warehouseDeficitQty), 0),
        subrentQty: toNumber(project && project.totals && (project.totals.subrentQty || project.totals.warehouseSubrentQty), 0)
      };
      totals.reservationRows += toNumber(rTotals.rows, 0);
      totals.reservedQty += toNumber(rTotals.reservedQty, 0);
      totals.deficitQty += toNumber(rTotals.deficitQty, 0);
      totals.subrentQty += toNumber(rTotals.subrentQty, 0);
      totals.unmatchedRows += Array.isArray(reservation && reservation.rows) ? reservation.rows.filter(row => row.status === 'unmatched').length : 0;
      return {
        projectId: project.projectId || project.id || (quote && quote.id),
        projectName: project.projectName || (quote && quote.project && quote.project.name) || 'Без названия',
        clientName: project.clientName || (quote && quote.client && quote.client.name) || '',
        status: project.status || (quote && quote.status) || 'draft',
        warehouseStatus: quote && quote.warehouse && quote.warehouse.status || 'warehouse_draft',
        reservedQty: toNumber(rTotals.reservedQty, 0),
        deficitQty: toNumber(rTotals.deficitQty, 0),
        subrentQty: toNumber(rTotals.subrentQty, 0)
      };
    }).sort((a, b) => b.deficitQty - a.deficitQty || a.projectName.localeCompare(b.projectName, 'ru'));
    return { totals, projects: projectRows.slice(0, 12) };
  }

  function buildOperationsReport(input) {
    const opts = input || {};
    const equipment = buildEquipmentReport(opts.equipmentItems);
    const clients = buildClientReport(opts.clients);
    const projects = buildProjectReport(opts.projects);
    const warehouse = buildWarehouseReport(opts.projects);
    let quality = null;
    try {
      quality = ROOT.DataQualityCenter && ROOT.DataQualityCenter.buildQualityReport ? ROOT.DataQualityCenter.buildQualityReport({ equipmentItems: opts.equipmentItems, clients: opts.clients, projects: opts.projects, deepAudit: false }) : null;
    } catch (_) { quality = null; }
    const healthInputs = [projects.readinessAverage || 0, clients.contactCoverage || 0, quality ? quality.score : 100];
    const healthScore = Math.round(healthInputs.reduce((sum, value) => sum + toNumber(value, 0), 0) / healthInputs.length);
    return {
      type: 'feg-stage-pro-operations-report',
      version: REPORTS_CENTER_VERSION,
      generatedAt: nowIso(),
      healthScore,
      status: healthScore >= 86 ? 'ok' : healthScore >= 65 ? 'warn' : 'bad',
      equipment,
      clients,
      projects,
      warehouse,
      quality: quality ? { score: quality.score, status: quality.status, issues: quality.summary && quality.summary.total || 0, bad: quality.summary && quality.summary.bad || 0, warn: quality.summary && quality.summary.warn || 0 } : null,
      recommendations: buildRecommendations({ equipment, clients, projects, warehouse, quality })
    };
  }

  function buildRecommendations(report) {
    const rec = [];
    if (report.projects.readinessAverage < 70 && report.projects.totalProjects) rec.push('Проверить проекты с низкой готовностью перед отправкой клиенту.');
    if (report.warehouse.totals.deficitQty > 0) rec.push('Закрыть дефицит склада через субаренду или корректировку наличия.');
    if (report.clients.contactCoverage < 80 && report.clients.totalClients) rec.push('Дозаполнить email/телефоны клиентов для CRM и документов.');
    if (report.quality && report.quality.score < 80) rec.push('Открыть «Контроль данных» и исправить критичные замечания перед backend sync.');
    if (!rec.length) rec.push('Операционный контур выглядит стабильно. Можно готовить данные к синхронизации и рабочему тесту.');
    return rec;
  }

  function exportOperationsReport(input) {
    return JSON.stringify(buildOperationsReport(input), null, 2);
  }

  function renderReportsCenter(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const report = buildOperationsReport(options || {});
    root.innerHTML = `
      <div class="v4-card v4-reports-center">
        <div class="v4-section-head">
          <div>
            <div class="v4-kicker">Reports · operations overview</div>
            <h3>Операционные отчёты</h3>
            <p class="v4-muted">Сводка по проектам, клиентам, складу, базе оборудования и качеству данных перед backend sync.</p>
          </div>
          <div class="v4-report-score ${escapeHtml(report.status)}">
            <b>${report.healthScore}%</b>
            <span>${escapeHtml(report.status)}</span>
          </div>
        </div>
        <div class="v4-report-kpi-grid">
          ${renderKpi('Проектов', report.projects.totalProjects, `готовность ${report.projects.readinessAverage}%`)}
          ${renderKpi('Клиентов', report.clients.totalClients, `контакты ${report.clients.contactCoverage}%`)}
          ${renderKpi('Позиций базы', report.equipment.totalItems, `активных ${report.equipment.activeItems}`)}
          ${renderKpi('Дефицит', report.warehouse.totals.deficitQty, `субаренда ${report.warehouse.totals.subrentQty}`)}
        </div>
        <div class="v4-report-layout">
          <div class="v4-report-panel">
            <h4>Рекомендации</h4>
            <div class="v4-mini-list">${report.recommendations.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
            <h4>Статусы проектов</h4>
            <div class="v4-report-status-list">${Object.entries(report.projects.byStatus).map(([status, count]) => `<span><b>${escapeHtml(status)}</b>${count}</span>`).join('') || '<span>Проектов пока нет</span>'}</div>
            <h4>Топ категорий оборудования</h4>
            <div class="v4-report-status-list">${report.equipment.byCategory.slice(0, 8).map(row => `<span><b>${escapeHtml(row.label)}</b>${row.rows}</span>`).join('') || '<span>База пуста</span>'}</div>
          </div>
          <div class="v4-report-panel">
            <div class="v4-table-wrap">
              <table class="v4-table v4-table--reports">
                <thead><tr><th>Проект</th><th>Клиент</th><th>Дата</th><th>Статус</th></tr></thead>
                <tbody>${report.projects.upcoming.map(row => `<tr><td>${escapeHtml(row.projectName)}</td><td>${escapeHtml(row.clientName)}</td><td>${escapeHtml(row.eventDate)}</td><td>${escapeHtml(row.status)}</td></tr>`).join('') || '<tr><td colspan="4">Ближайших проектов пока нет</td></tr>'}</tbody>
              </table>
            </div>
            <div class="v4-table-wrap">
              <table class="v4-table v4-table--reports">
                <thead><tr><th>Складской проект</th><th>Статус склада</th><th>Резерв</th><th>Дефицит</th><th>Субаренда</th></tr></thead>
                <tbody>${report.warehouse.projects.map(row => `<tr><td>${escapeHtml(row.projectName)}</td><td>${escapeHtml(row.warehouseStatus)}</td><td>${row.reservedQty}</td><td>${row.deficitQty}</td><td>${row.subrentQty}</td></tr>`).join('') || '<tr><td colspan="5">Нет складских проектов</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="v4-actions-row">
          <button type="button" class="btn-secondary" data-v4-report-copy>Копировать JSON</button>
          <button type="button" class="btn-secondary" data-v4-report-download>Скачать JSON</button>
        </div>
      </div>`;
    const json = JSON.stringify(report, null, 2);
    const copyBtn = root.querySelector('[data-v4-report-copy]');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(json));
    const downloadBtn = root.querySelector('[data-v4-report-download]');
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadText('feg-operations-report.json', json, 'application/json'));
    return root;
  }

  function renderKpi(title, value, note) {
    return `<div class="v4-report-kpi"><b>${escapeHtml(value)}</b><span>${escapeHtml(title)}</span><small>${escapeHtml(note)}</small></div>`;
  }

  function copyText(text) {
    if (GLOBAL.navigator && GLOBAL.navigator.clipboard && GLOBAL.navigator.clipboard.writeText) {
      GLOBAL.navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function downloadText(filename, text, type) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  ROOT.ReportsCenter = { REPORTS_CENTER_VERSION, buildOperationsReport, buildEquipmentReport, buildClientReport, buildProjectReport, buildWarehouseReport, exportOperationsReport, renderReportsCenter };
})();
