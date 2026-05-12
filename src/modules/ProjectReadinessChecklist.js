(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const READINESS_VERSION = '1.0.0';

  function model() { return ROOT.QuoteModel || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }
  function pickListBuilder() { return ROOT.WarehousePickListBuilder || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }

  const SECTION_LABELS = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED',
    equipment: 'Звук / свет / услуги'
  });

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function makeItem(id, title, ok, details, options) {
    const opts = options || {};
    return {
      id,
      title,
      ok: Boolean(ok),
      severity: opts.severity || (ok ? 'ok' : 'required'),
      group: opts.group || 'main',
      details: toText(details || ''),
      action: toText(opts.action || '')
    };
  }

  function getEnabledSectionKeys(q) {
    if (model() && model().getEnabledSectionKeys) return model().getEnabledSectionKeys(q);
    const scope = q.scope || {};
    const keys = [];
    if (scope.stage) keys.push('stage');
    if (scope.truss) keys.push('truss');
    if (scope.led) keys.push('led');
    if (scope.sound || scope.light || scope.backline || scope.services) keys.push('equipment');
    return keys;
  }

  function buildSectionItems(q) {
    const sections = q.sections || {};
    const enabled = getEnabledSectionKeys(q);
    if (!enabled.length) {
      return [makeItem('sections.empty', 'Разделы сметы', Boolean(q.scope && q.scope.transport), 'Выбран только транспорт или разделы ещё не выбраны.', { group: 'sections', severity: q.scope && q.scope.transport ? 'ok' : 'required', action: 'Выбрать состав сметы' })];
    }
    return enabled.map(key => {
      const section = sections[key] || null;
      const ok = Boolean(section && section.status === 'configured');
      const bomCount = section && Array.isArray(section.bomRows) ? section.bomRows.length : section && Array.isArray(section.items) ? section.items.length : 0;
      return makeItem(`section.${key}`, SECTION_LABELS[key] || key, ok, ok ? `Раздел рассчитан, BOM: ${bomCount} поз.` : 'Раздел выбран, но ещё не рассчитан/не подтянут в смету.', { group: 'sections', action: ok ? '' : `Заполнить раздел «${SECTION_LABELS[key] || key}»` });
    });
  }

  function buildAvailabilityItems(q) {
    const items = [];
    const pickLists = pickListBuilder() && pickListBuilder().buildPickLists ? pickListBuilder().buildPickLists(q) : null;
    const allRows = pickLists && pickLists.all && Array.isArray(pickLists.all.rows) ? pickLists.all.rows : [];
    const deficits = pickLists && pickLists.deficits && Array.isArray(pickLists.deficits.rows) ? pickLists.deficits.rows : [];
    const subrent = pickLists && pickLists.subrent && Array.isArray(pickLists.subrent.rows) ? pickLists.subrent.rows : [];
    const unmatched = allRows.filter(row => row.availabilityStatus === 'unmatched' || row.status === 'unmatched' || row.unmatched);
    items.push(makeItem('availability.rows', 'Складской лист', allRows.length > 0, allRows.length ? `${allRows.length} складских строк.` : 'Нет складских строк для проверки.', { group: 'availability', severity: allRows.length ? 'ok' : 'warning', action: allRows.length ? '' : 'Добавить расчётные разделы или позиции' }));
    items.push(makeItem('availability.deficit', 'Дефицит', deficits.length === 0, deficits.length ? `Дефицитных строк: ${deficits.length}.` : 'Дефицит не найден.', { group: 'availability', severity: deficits.length ? 'warning' : 'ok', action: deficits.length ? 'Проверить лист дефицита / субаренду' : '' }));
    items.push(makeItem('availability.subrent', 'Субаренда', true, subrent.length ? `Планируемых строк субаренды: ${subrent.length}.` : 'Субаренда не требуется или ещё не запланирована.', { group: 'availability', severity: subrent.length ? 'warning' : 'ok' }));
    items.push(makeItem('availability.unmatched', 'Сопоставление с базой', unmatched.length === 0, unmatched.length ? `Не сопоставлено с базой: ${unmatched.length} строк.` : 'Все проверенные строки сопоставлены или не требуют сопоставления.', { group: 'availability', severity: unmatched.length ? 'warning' : 'ok', action: unmatched.length ? 'Завести позиции в базу оборудования' : '' }));
    return items;
  }

  function buildDocumentItems(q) {
    const summary = summaryBuilder() && summaryBuilder().buildFinalSummary ? summaryBuilder().buildFinalSummary(q) : null;
    const customerRows = summary && Array.isArray(summary.customerRows) ? summary.customerRows : [];
    const technicalRows = summary && Array.isArray(summary.technicalRows) ? summary.technicalRows : [];
    const hasDocuments = Boolean(ROOT.QuoteDocumentBuilder && ROOT.QuoteDocumentBuilder.buildCustomerProposal && ROOT.QuoteDocumentBuilder.buildTechnicalSheet);
    return [
      makeItem('docs.module', 'Модуль документов', hasDocuments, hasDocuments ? 'КП, техлист и складские листы доступны.' : 'Модуль документов не загружен.', { group: 'documents' }),
      makeItem('docs.customer', 'КП клиенту', customerRows.length > 0, customerRows.length ? `Клиентских строк: ${customerRows.length}.` : 'КП пока пустое.', { group: 'documents', severity: customerRows.length ? 'ok' : 'warning', action: customerRows.length ? '' : 'Добавить рассчитанные разделы' }),
      makeItem('docs.technical', 'Техлист', technicalRows.length > 0, technicalRows.length ? `Технических показателей: ${technicalRows.length}.` : 'Техническая сводка пока пустая.', { group: 'documents', severity: technicalRows.length ? 'ok' : 'warning' })
    ];
  }

  function buildChecklist(input) {
    const q = normalizeQuote(input);
    const validation = model() && model().validateQuote ? model().validateQuote(q) : { ok: true, errors: [] };
    const items = [];
    items.push(makeItem('client.name', 'Клиент', Boolean(q.client && q.client.name), q.client && q.client.name ? q.client.name : 'Клиент не выбран.', { group: 'required', action: 'Заполнить шаг «Клиент»' }));
    items.push(makeItem('project.name', 'Название проекта', Boolean(q.project && q.project.name), q.project && q.project.name ? q.project.name : 'Название проекта не указано.', { group: 'required', action: 'Заполнить название проекта' }));
    items.push(makeItem('venue.name', 'Площадка', Boolean(q.venue && q.venue.name), q.venue && q.venue.name ? q.venue.name : 'Площадка не указана.', { group: 'required', action: 'Заполнить шаг «Площадка»' }));
    items.push(makeItem('venue.address', 'Адрес', Boolean(q.venue && q.venue.address), q.venue && q.venue.address ? q.venue.address : 'Адрес не указан.', { group: 'required', action: 'Заполнить адрес' }));
    items.push(makeItem('venue.date', 'Дата', Boolean(q.venue && q.venue.date), q.venue && q.venue.date ? q.venue.date : 'Дата мероприятия не указана.', { group: 'required', action: 'Заполнить дату' }));
    const tr = q.transport || {};
    const transportOk = tr.mode !== 'out_of_city' || nonNegative(tr.distanceKm, 0) > 0;
    items.push(makeItem('transport.ready', 'Транспорт', transportOk, tr.mode === 'out_of_city' ? `${tr.vehicleLabel || 'Транспорт'} · ${nonNegative(tr.distanceKm, 0)} км · ${nonNegative(tr.total, 0)} ₽` : `${tr.vehicleLabel || 'Транспорт'} · город · ${nonNegative(tr.total, 0)} ₽`, { group: 'required', action: transportOk ? '' : 'Указать километраж за город' }));
    items.push(...buildSectionItems(q));
    items.push(...buildAvailabilityItems(q));
    items.push(...buildDocumentItems(q));
    const status = toText(q.status || 'draft');
    items.push(makeItem('status.ready', 'Статус проекта', !['sent', 'confirmed'].includes(status) || validation.ok, `Текущий статус: ${status}.`, { group: 'status', severity: validation.ok ? 'ok' : 'warning', action: validation.ok ? '' : 'Перед отправкой закрыть обязательные ошибки' }));

    const required = items.filter(row => row.severity === 'required');
    const warnings = items.filter(row => row.severity === 'warning');
    const failedRequired = required.filter(row => !row.ok);
    const failedWarnings = warnings.filter(row => !row.ok || row.severity === 'warning');
    const okCount = items.filter(row => row.ok && row.severity !== 'warning').length;
    const score = items.length ? Math.round((items.filter(row => row.ok).length / items.length) * 100) : 100;
    const ready = failedRequired.length === 0 && validation.ok;
    return {
      type: 'project-readiness-checklist',
      version: READINESS_VERSION,
      ready,
      score,
      status: ready ? (failedWarnings.length ? 'ready_with_warnings' : 'ready') : 'not_ready',
      totals: {
        total: items.length,
        ok: okCount,
        requiredFailed: failedRequired.length,
        warnings: failedWarnings.length,
        validationErrors: Array.isArray(validation.errors) ? validation.errors.length : 0
      },
      items,
      validation,
      generatedAt: new Date().toISOString()
    };
  }

  function checklistToText(input) {
    const data = input && input.type === 'project-readiness-checklist' ? input : buildChecklist(input);
    const lines = [];
    lines.push('CHECKLIST ГОТОВНОСТИ ПРОЕКТА');
    lines.push('');
    lines.push(`Статус: ${data.ready ? 'готов к отправке/работе' : 'нужно доработать'}`);
    lines.push(`Оценка: ${data.score}%`);
    lines.push(`Ошибки обязательных пунктов: ${data.totals.requiredFailed}`);
    lines.push(`Предупреждения: ${data.totals.warnings}`);
    lines.push('');
    data.items.forEach(item => {
      const mark = item.ok ? '✓' : item.severity === 'warning' ? '!' : '×';
      lines.push(`${mark} ${item.title}: ${item.details || (item.ok ? 'ок' : 'требует внимания')}`);
      if (item.action) lines.push(`  Действие: ${item.action}`);
    });
    if (data.validation && Array.isArray(data.validation.errors) && data.validation.errors.length) {
      lines.push('');
      lines.push('Ошибки мастера:');
      data.validation.errors.forEach(row => lines.push(`- ${row.step}: ${row.message}`));
    }
    lines.push('');
    lines.push(`Сформировано: ${data.generatedAt}`);
    return lines.join('\n');
  }

  ROOT.ProjectReadinessChecklist = {
    READINESS_VERSION,
    buildChecklist,
    checklistToText
  };
})();
