(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const DOCUMENT_BUILDER_VERSION = '1.4.0';

  function model() { return ROOT.QuoteModel || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }
  function pickListBuilder() { return ROOT.WarehousePickListBuilder || null; }
  function subrentPlanner() { return ROOT.SubrentPlanner || null; }
  function reservationPlanner() { return ROOT.ReservationPlanner || null; }
  function stockMovementPlanner() { return ROOT.StockMovementPlanner || null; }
  function warehouseWorkflow() { return ROOT.WarehouseWorkflow || null; }
  function calendarIntegration() { return ROOT.CalendarIntegration || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function money(value) { return `${Math.round(nonNegative(value, 0)).toLocaleString('ru-RU')} ₽`; }
  function weight(value) { return `${nonNegative(value, 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`; }
  function power(value) { return `${(nonNegative(value, 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кВт`; }
  function count(value, digits) { return nonNegative(value, 0).toLocaleString('ru-RU', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 }); }
  function nowIso() { return new Date().toISOString(); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function getFinalSummary(quote) {
    const q = normalizeQuote(quote);
    if (summaryBuilder() && summaryBuilder().buildFinalSummary) return summaryBuilder().buildFinalSummary(q);
    return { quote: q, totals: q.totals || {}, customerRows: [], technicalRows: [], bomRows: [], warnings: [] };
  }

  function getPickLists(quote) {
    if (pickListBuilder() && pickListBuilder().buildPickLists) return pickListBuilder().buildPickLists(quote);
    return { all: { rows: [] }, sections: [], deficits: { rows: [] }, subrent: { rows: [] } };
  }

  function baseDocument(type, title, quote) {
    const q = normalizeQuote(quote);
    return {
      type,
      title,
      version: DOCUMENT_BUILDER_VERSION,
      quoteId: q.id || '',
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      venueAddress: q.venue && q.venue.address || '',
      eventDate: q.venue && q.venue.date || '',
      generatedAt: nowIso(),
      hasPrices: false,
      rows: [],
      totals: {},
      notes: []
    };
  }

  function buildCustomerProposal(quote) {
    const q = normalizeQuote(quote);
    const summary = getFinalSummary(q);
    const doc = baseDocument('customer-proposal', 'Коммерческое предложение клиенту', q);
    doc.hasPrices = true;
    doc.rows = (summary.customerRows || []).map(row => ({
      title: toText(row.title),
      qty: nonNegative(row.qty, 1),
      unit: toText(row.unit || 'раздел'),
      price: nonNegative(row.price, 0),
      total: nonNegative(row.total, 0),
      note: toText(row.note)
    }));
    doc.totals = {
      rental: nonNegative(summary.totals && summary.totals.rental, 0),
      transport: nonNegative(summary.totals && summary.totals.transport, 0),
      total: nonNegative(summary.totals && summary.totals.total, 0)
    };
    doc.notes.push('КП скрывает складские детали и показывает только клиентские разделы, транспорт и итоговую стоимость.');
    return doc;
  }

  function buildTechnicalSheet(quote) {
    const q = normalizeQuote(quote);
    const summary = getFinalSummary(q);
    const doc = baseDocument('technical-sheet', 'Технический лист проекта', q);
    doc.rows = (summary.sectionRows || []).map(row => ({
      section: toText(row.title),
      status: toText(row.status),
      summary: toText(row.summary || row.source),
      weightKg: nonNegative(row.weightKg, 0),
      powerW: nonNegative(row.powerW, 0),
      startupPowerW: nonNegative(row.startupPowerW, 0),
      bomCount: nonNegative(row.bomCount, 0)
    }));
    doc.totals = {
      weightKg: nonNegative(summary.totals && summary.totals.weightKg, 0),
      powerW: nonNegative(summary.totals && summary.totals.powerW, 0),
      startupPowerW: nonNegative(summary.totals && summary.totals.startupPowerW, 0),
      deficitCount: Array.isArray(summary.warnings) ? summary.warnings.filter(row => row.type === 'deficit').length : 0
    };
    doc.transport = summary.transport || q.transport || {};
    doc.notes.push('Техлист без цен: состав разделов, общий вес, рабочая и пусковая мощность.');
    return doc;
  }

  function selectPickList(pickLists, sectionKey) {
    const key = sectionKey || 'all';
    if (key === 'all') return pickLists.all;
    if (key === 'deficits') return pickLists.deficits;
    if (key === 'subrent') return pickLists.subrent;
    return (pickLists.sections || []).find(list => list.key === key) || { key, title: key, rows: [] };
  }

  function buildWarehouseSheet(quote, sectionKey) {
    const q = normalizeQuote(quote);
    const pickLists = getPickLists(q);
    const list = selectPickList(pickLists, sectionKey || 'all') || { rows: [] };
    const doc = baseDocument(sectionKey && sectionKey !== 'all' ? `warehouse-${sectionKey}` : 'warehouse-all', list.title || 'Общий складской лист', q);
    doc.rows = (list.rows || []).map((row, index) => ({
      n: index + 1,
      section: toText(row.sectionTitle || row.sectionKey),
      code: toText(row.code || row.id),
      name: toText(row.name),
      qty: nonNegative(row.qty, 0),
      unit: toText(row.unit || 'шт'),
      weightKg: nonNegative(row.weightKg, 0),
      availableQty: row.availableQty == null ? null : nonNegative(row.availableQty, 0),
      stockQty: row.stockQty == null ? null : nonNegative(row.stockQty, 0),
      reservedQty: row.reservedQty == null ? null : nonNegative(row.reservedQty, 0),
      deficitQty: nonNegative(row.deficitQty, 0),
      subrentQty: nonNegative(row.subrentQty, 0),
      inventoryStatus: toText(row.inventoryStatus),
      sourceType: toText(row.sourceType || 'own'),
      supplierId: toText(row.supplierId),
      supplierName: toText(row.supplierName),
      subrentPrice: nonNegative(row.subrentPrice, 0),
      clientPrice: nonNegative(row.clientPrice, 0),
      margin: nonNegative(row.margin, 0),
      note: Array.isArray(row.notes) ? row.notes.filter(Boolean).join('; ') : toText(row.note || row.notes)
    }));
    doc.totals = {
      totalRows: doc.rows.length,
      totalQty: nonNegative(list.totalQty, 0),
      totalWeightKg: nonNegative(list.totalWeightKg, 0),
      deficitRows: nonNegative(list.deficitRows, 0),
      subrentRows: nonNegative(list.subrentRows, 0),
      unmatchedRows: nonNegative(list.unmatchedRows, 0),
      subrentCost: doc.rows.reduce((sum, row) => sum + nonNegative(row.subrentPrice, 0) * nonNegative(row.subrentQty || row.qty, 0), 0),
      clientSubrentTotal: doc.rows.reduce((sum, row) => sum + nonNegative(row.clientPrice, 0) * nonNegative(row.subrentQty || row.qty, 0), 0),
      subrentMargin: doc.rows.reduce((sum, row) => sum + nonNegative(row.margin, 0), 0)
    };
    doc.notes.push('Складской лист без цен: позиции, количество, вес, дефицит и источник.');
    return doc;
  }




  function buildReservationSheet(quote) {
    const q = normalizeQuote(quote);
    const planner = reservationPlanner();
    const plan = planner && planner.buildReservationPlan ? planner.buildReservationPlan(q) : { rows: [], totals: {} };
    const doc = baseDocument('reservation-plan', 'План резерва склада', q);
    doc.rows = (plan.rows || []).map((row, index) => ({
      n: index + 1,
      section: toText(row.sectionTitle || row.sectionKey),
      code: toText(row.code),
      name: toText(row.name),
      qty: nonNegative(row.requestedQty, 0),
      unit: toText(row.unit || 'шт'),
      reservedQty: nonNegative(row.reservedQty, 0),
      availableQty: row.availableQty == null ? null : nonNegative(row.availableQty, 0),
      deficitQty: nonNegative(row.deficitQty, 0),
      subrentQty: nonNegative(row.subrentQty, 0),
      status: toText(row.status),
      sourceType: toText(row.sourceType),
      supplierName: toText(row.supplierName),
      note: toText(row.note)
    }));
    doc.totals = plan.totals || {};
    doc.plan = plan;
    doc.notes.push('План резерва склада: что можно зарезервировать со своего склада, что уходит в дефицит и субаренду. Остатки автоматически не меняются.');
    return doc;
  }


  function buildStockMovementSheet(quote, action) {
    const q = normalizeQuote(quote);
    const planner = stockMovementPlanner();
    const plan = planner && planner.buildMovementPlan ? planner.buildMovementPlan(q, { action: action || 'reserve' }) : { rows: [], totals: {}, action: action || 'reserve' };
    const labels = { reserve: 'План движения склада: резерв', issue: 'План движения склада: выдача', return: 'План движения склада: возврат', cancel_reserve: 'План движения склада: отмена резерва', writeoff: 'План движения склада: списание', adjustment: 'План движения склада: корректировка' };
    const doc = baseDocument('stock-movement-plan', labels[plan.action] || 'План движения склада', q);
    doc.action = plan.action || action || 'reserve';
    doc.rows = (plan.rows || []).map((row, index) => ({
      n: index + 1,
      section: toText(row.sectionKey || row.section_key),
      code: toText(row.code),
      name: toText(row.name),
      qty: nonNegative(row.qty, 0),
      unit: toText(row.unit || 'шт'),
      movementType: toText(row.movementType || row.movement_type || row.action),
      status: toText(row.status),
      sourceType: toText(row.sourceType || row.source_type),
      supplierName: toText(row.supplierName || row.supplier_name),
      note: toText(row.note)
    }));
    doc.totals = plan.totals || {};
    doc.plan = plan;
    doc.notes.push('План движения склада: заготовка операций reserve / issue / return под будущую таблицу stock_movements. Остатки автоматически не меняются.');
    return doc;
  }


  function buildWarehouseWorkflowSheet(quote) {
    const q = normalizeQuote(quote);
    const wfModule = warehouseWorkflow();
    const workflow = wfModule && wfModule.buildWarehouseWorkflow ? wfModule.buildWarehouseWorkflow(q) : { rows: [], totals: {}, status: 'draft', statusLabel: 'Черновик склада' };
    const doc = baseDocument('warehouse-workflow', 'Складской workflow проекта', q);
    doc.status = toText(workflow.status || 'draft');
    doc.statusLabel = toText(workflow.statusLabel || workflow.status_label || doc.status);
    doc.nextStatuses = workflow.nextStatuses || workflow.next_statuses || [];
    doc.warehouseAction = toText(workflow.warehouseAction || workflow.warehouse_action);
    doc.workflow = workflow;
    doc.totals = workflow.totals || {};
    doc.timeline = Array.isArray(workflow.timeline) ? workflow.timeline : [];
    doc.notes.push('Складской workflow: локальные статусы подготовки проекта без автоматического изменения остатков.');
    return doc;
  }

  function buildSubrentSheet(quote) {
    const q = normalizeQuote(quote);
    const plan = subrentPlanner() && subrentPlanner().buildSubrentPlan ? subrentPlanner().buildSubrentPlan(q) : { rows: [], suppliers: [], totals: {} };
    const doc = baseDocument('subrent-plan', 'План субаренды', q);
    doc.rows = (plan.rows || []).map((row, index) => ({
      n: index + 1,
      section: toText(row.sectionTitle || row.sectionKey),
      code: toText(row.code),
      name: toText(row.name),
      qty: nonNegative(row.qty, 0),
      unit: toText(row.unit || 'шт'),
      supplierId: toText(row.supplierId),
      supplierName: toText(row.supplierName),
      subrentPrice: nonNegative(row.subrentPrice, 0),
      clientPrice: nonNegative(row.clientPrice, 0),
      totalSubrent: nonNegative(row.totalSubrent, 0),
      totalClient: nonNegative(row.totalClient, 0),
      margin: nonNegative(row.margin, 0),
      sourceType: toText(row.sourceType),
      note: toText(row.note)
    }));
    doc.suppliers = plan.suppliers || [];
    doc.totals = plan.totals || {};
    doc.notes.push('План субаренды: поставщик, закупочная цена, клиентская цена, маржа и примечания. Это заготовка под будущие suppliers/quote_items.');
    return doc;
  }

  function buildCalendarDraft(quote) {
    const q = normalizeQuote(quote);
    if (calendarIntegration() && calendarIntegration().buildCalendarDraft) return calendarIntegration().buildCalendarDraft(q);
    const summary = getFinalSummary(q);
    const sections = (summary.sectionRows || []).filter(row => row.configured).map(row => row.title).join(', ') || 'состав уточняется';
    return {
      type: 'calendar-draft',
      title: `FEG - ${q.project && q.project.name || 'Новый проект'}`,
      date: q.venue && q.venue.date || '',
      location: q.venue && (q.venue.address || q.venue.name) || '',
      description: [
        `Клиент: ${q.client && q.client.name || '—'}`,
        `Площадка: ${q.venue && q.venue.name || '—'}`,
        `Контакт: ${q.venue && q.venue.contactName || q.client && q.client.contactName || '—'} ${q.venue && q.venue.contactPhone || q.client && q.client.phone || ''}`.trim(),
        `Состав: ${sections}`,
        `Вес: ${weight(summary.totals && summary.totals.weightKg)}`,
        `Мощность: ${power(summary.totals && summary.totals.powerW)}`,
        `Статус: ${q.status || 'draft'}`
      ].join('\n'),
      generatedAt: nowIso()
    };
  }

  function buildCalendarIcs(quote) {
    const q = normalizeQuote(quote);
    if (calendarIntegration() && calendarIntegration().exportIcs) return calendarIntegration().exportIcs(q);
    return documentToText(buildCalendarDraft(q));
  }

  function buildAllDocuments(quote) {
    const q = normalizeQuote(quote);
    const pickLists = getPickLists(q);
    const docs = [buildCustomerProposal(q), buildTechnicalSheet(q), buildWarehouseSheet(q, 'all')];
    (pickLists.sections || []).forEach(list => {
      if (list.rows && list.rows.length) docs.push(buildWarehouseSheet(q, list.key));
    });
    if (pickLists.deficits && pickLists.deficits.rows && pickLists.deficits.rows.length) docs.push(buildWarehouseSheet(q, 'deficits'));
    docs.push(buildReservationSheet(q));
    docs.push(buildStockMovementSheet(q, 'reserve'));
    docs.push(buildWarehouseWorkflowSheet(q));
    if (pickLists.subrent && pickLists.subrent.rows && pickLists.subrent.rows.length) {
      docs.push(buildWarehouseSheet(q, 'subrent'));
      docs.push(buildSubrentSheet(q));
    }
    docs.push(buildCalendarDraft(q));
    return docs;
  }

  function documentToText(doc) {
    const d = doc || {};
    const lines = [];
    lines.push(d.title || d.type || 'Документ');
    lines.push('');
    if (d.projectName || d.clientName || d.venueName || d.eventDate) {
      lines.push(`Проект: ${d.projectName || '—'}`);
      lines.push(`Клиент: ${d.clientName || '—'}`);
      lines.push(`Площадка: ${d.venueName || '—'}`);
      lines.push(`Дата: ${d.eventDate || '—'}`);
      if (d.venueAddress) lines.push(`Адрес: ${d.venueAddress}`);
      lines.push('');
    }
    if (d.type === 'customer-proposal') appendCustomerRows(lines, d);
    else if (d.type === 'technical-sheet') appendTechnicalRows(lines, d);
    else if (String(d.type || '').startsWith('warehouse-')) appendWarehouseRows(lines, d);
    else if (d.type === 'subrent-plan') appendSubrentRows(lines, d);
    else if (d.type === 'reservation-plan') appendReservationRows(lines, d);
    else if (d.type === 'stock-movement-plan') appendStockMovementRows(lines, d);
    else if (d.type === 'warehouse-workflow') appendWarehouseWorkflowRows(lines, d);
    else if (d.type === 'calendar-draft') appendCalendarDraft(lines, d);
    else lines.push(JSON.stringify(d, null, 2));
    if (Array.isArray(d.notes) && d.notes.length) {
      lines.push('');
      d.notes.forEach(note => lines.push(`Примечание: ${note}`));
    }
    lines.push('');
    lines.push(`Сформировано: ${d.generatedAt || nowIso()}`);
    return lines.join('\n');
  }

  function appendCustomerRows(lines, doc) {
    lines.push('Позиции для клиента:');
    (doc.rows || []).forEach((row, index) => {
      lines.push(`${index + 1}. ${row.title} — ${count(row.qty)} ${row.unit} × ${money(row.price)} = ${money(row.total)}${row.note ? ` (${row.note})` : ''}`);
    });
    lines.push('');
    lines.push(`Разделы: ${money(doc.totals && doc.totals.rental)}`);
    lines.push(`Транспорт: ${money(doc.totals && doc.totals.transport)}`);
    lines.push(`Итого: ${money(doc.totals && doc.totals.total)}`);
  }

  function appendTechnicalRows(lines, doc) {
    lines.push('Технические параметры:');
    (doc.rows || []).forEach(row => {
      lines.push(`- ${row.section}: ${row.summary || row.status}; вес ${weight(row.weightKg)}, мощность ${power(row.powerW)}, пуск ${power(row.startupPowerW)}, BOM ${count(row.bomCount)} поз.`);
    });
    lines.push('');
    lines.push(`Общий вес: ${weight(doc.totals && doc.totals.weightKg)}`);
    lines.push(`Рабочая мощность: ${power(doc.totals && doc.totals.powerW)}`);
    lines.push(`Пусковая мощность: ${power(doc.totals && doc.totals.startupPowerW)}`);
    lines.push(`Дефицитные позиции: ${count(doc.totals && doc.totals.deficitCount)}`);
  }

  function appendWarehouseRows(lines, doc) {
    lines.push('Складские позиции:');
    (doc.rows || []).forEach(row => {
      const deficit = row.deficitQty ? `, дефицит ${count(row.deficitQty)} ${row.unit}` : '';
      const source = row.sourceType && row.sourceType !== 'own' ? `, источник ${row.sourceType}${row.supplierName ? `: ${row.supplierName}` : ''}` : '';
      lines.push(`${row.n}. [${row.section || '—'}] ${row.code || '—'} ${row.name} — ${count(row.qty)} ${row.unit}, вес ${weight(row.weightKg)}${deficit}${source}`);
    });
    lines.push('');
    lines.push(`Всего позиций: ${count(doc.totals && doc.totals.totalRows)}`);
    lines.push(`Всего единиц: ${count(doc.totals && doc.totals.totalQty)}`);
    lines.push(`Вес листа: ${weight(doc.totals && doc.totals.totalWeightKg)}`);
    lines.push(`Дефицитных строк: ${count(doc.totals && doc.totals.deficitRows)}`);
  }




  function appendReservationRows(lines, doc) {
    lines.push('План резерва:');
    (doc.rows || []).forEach(row => {
      const available = row.availableQty == null ? 'нет данных' : `${count(row.availableQty)} ${row.unit}`;
      const deficit = row.deficitQty ? `, дефицит ${count(row.deficitQty)} ${row.unit}` : '';
      const subrent = row.subrentQty ? `, субаренда ${count(row.subrentQty)} ${row.unit}` : '';
      lines.push(`${row.n}. [${row.section || '—'}] ${row.code || '—'} ${row.name} — нужно ${count(row.qty)} ${row.unit}; резерв ${count(row.reservedQty)}; доступно ${available}${deficit}${subrent}; статус ${row.status || '—'}`);
    });
    lines.push('');
    lines.push(`Строк: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Нужно: ${count(doc.totals && doc.totals.requestedQty)}`);
    lines.push(`В резерв: ${count(doc.totals && doc.totals.reservedQty)}`);
    lines.push(`Дефицит: ${count(doc.totals && doc.totals.deficitQty)}`);
    lines.push(`Субаренда: ${count(doc.totals && doc.totals.subrentQty)}`);
  }


  function appendStockMovementRows(lines, doc) {
    lines.push('Плановые операции склада:');
    (doc.rows || []).forEach(row => {
      const supplier = row.supplierName ? `; поставщик: ${row.supplierName}` : '';
      lines.push(`${row.n}. [${row.section || '—'}] ${row.code || '—'} ${row.name} — ${count(row.qty)} ${row.unit}; операция ${row.movementType || doc.action || 'reserve'}; статус ${row.status || 'planned'}${supplier}${row.note ? ` (${row.note})` : ''}`);
    });
    lines.push('');
    lines.push(`Строк: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Единиц: ${count(doc.totals && doc.totals.totalQty)}`);
  }


  function appendWarehouseWorkflowRows(lines, doc) {
    lines.push(`Статус склада: ${doc.statusLabel || doc.status || '—'}`);
    lines.push(`Следующее складское действие: ${doc.warehouseAction || '—'}`);
    lines.push('');
    lines.push(`Строк склада: ${count(doc.totals && doc.totals.rows)}`);
    lines.push(`Нужно: ${count(doc.totals && doc.totals.requestedQty)}`);
    lines.push(`Резерв: ${count(doc.totals && doc.totals.reservedQty)}`);
    lines.push(`Дефицит: ${count(doc.totals && doc.totals.deficitQty)}`);
    lines.push(`Субаренда: ${count(doc.totals && doc.totals.subrentQty)}`);
    lines.push('');
    lines.push('Timeline:');
    (doc.timeline || []).slice(0, 12).forEach(event => {
      lines.push(`- ${event.at || '—'} · ${event.statusLabel || event.status || '—'} · ${event.actorName || '—'}${event.note ? ` · ${event.note}` : ''}`);
    });
  }

  function appendSubrentRows(lines, doc) {
    lines.push('Позиции субаренды:');
    (doc.rows || []).forEach(row => {
      lines.push(`${row.n}. [${row.section || '—'}] ${row.code || '—'} ${row.name} — ${count(row.qty)} ${row.unit}; поставщик: ${row.supplierName || '—'}; субаренда ${money(row.subrentPrice)} / клиент ${money(row.clientPrice)} / маржа ${money(row.margin)}${row.note ? ` (${row.note})` : ''}`);
    });
    lines.push('');
    lines.push(`Итого субаренда: ${money(doc.totals && doc.totals.subrent)}`);
    lines.push(`Итого клиенту: ${money(doc.totals && doc.totals.client)}`);
    lines.push(`Маржа: ${money(doc.totals && doc.totals.margin)}`);
  }

  function appendCalendarDraft(lines, doc) {
    lines.push(`Название: ${doc.title || '—'}`);
    lines.push(`Дата: ${doc.date || '—'}`);
    lines.push(`Локация: ${doc.location || '—'}`);
    if (doc.fileName) lines.push(`ICS-файл: ${doc.fileName}`);
    lines.push('Описание:');
    lines.push(doc.description || '—');
    if (doc.icsContent) {
      lines.push('');
      lines.push('ICS готов: да');
    }
  }

  ROOT.QuoteDocumentBuilder = {
    DOCUMENT_BUILDER_VERSION,
    buildCustomerProposal,
    buildTechnicalSheet,
    buildWarehouseSheet,
    buildReservationSheet,
    buildStockMovementSheet,
    buildWarehouseWorkflowSheet,
    buildSubrentSheet,
    buildCalendarDraft,
    buildCalendarIcs,
    buildAllDocuments,
    documentToText
  };
})();
