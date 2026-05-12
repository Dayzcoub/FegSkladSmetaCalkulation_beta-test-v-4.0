(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const WIZARD_STEPS = Object.freeze([
    { id: 'client', title: 'Клиент и проект', required: true },
    { id: 'venue', title: 'Площадка и контакты', required: true },
    { id: 'transport', title: 'Транспорт', required: true },
    { id: 'scope', title: 'Состав сметы', required: true },
    { id: 'stage', title: 'Сцена', scope: 'stage' },
    { id: 'truss', title: 'Фермы', scope: 'truss' },
    { id: 'led', title: 'LED экран', scope: 'led' },
    { id: 'equipment', title: 'Звук, свет, услуги', scope: 'equipment' },
    { id: 'summary', title: 'Сводка и документы', required: true }
  ]);

  function model() { return ROOT.QuoteModel || null; }
  function storage() { return ROOT.QuoteDraftStorage || null; }
  function binder() { return ROOT.QuoteSectionBinder || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }
  function pickListBuilder() { return ROOT.WarehousePickListBuilder || null; }
  function readinessChecklist() { return ROOT.ProjectReadinessChecklist || null; }
  function documentBuilder() { return ROOT.QuoteDocumentBuilder || null; }

  function createDraft(overrides) {
    return model() ? model().createQuoteDraft(overrides || {}) : legacyCreateDraft(overrides || {});
  }

  function prepareDraft(draft) {
    const q = createDraft(draft || {});
    return binder() && model() ? binder().ensureSectionsForScope(q) : q;
  }

  function getEnabledSteps(draft) {
    const q = createDraft(draft || {});
    const enabled = model() ? model().getEnabledSectionKeys(q) : [];
    return WIZARD_STEPS.filter(step => {
      if (!step.scope) return true;
      if (step.scope === 'equipment') return enabled.includes('equipment');
      return enabled.includes(step.scope);
    });
  }

  function validateStep(stepId, draft) {
    return model() ? model().validateQuoteStep(stepId, draft) : legacyValidateStep(stepId, draft);
  }

  function renderWizardMap(target, draft) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const loaded = draft || (storage() && storage().loadActiveDraft && storage().loadActiveDraft()) || { scope: { stage: true, truss: true, led: true, sound: true } };
    const q = prepareDraft(loaded);
    const steps = getEnabledSteps(q);
    const activeStep = getActiveStep(q, steps);
    const validation = model() ? model().validateQuote(q) : { ok: true, errors: [] };
    const activeValidation = validateStep(activeStep, q);
    root.innerHTML = `
      <div class="v4-card">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">Quote Wizard linear flow</div>
            <h3>Линейный мастер сметы</h3>
            <p class="v4-muted">Мастер идёт по шагам ТЗ: клиент, объект, транспорт, состав сметы, выбранные калькуляторы и финальная сводка. Кнопка «Далее» не пропускает шаг, пока обязательные поля не заполнены.</p>
          </div>
          <div class="v4-actions" style="margin-top:0">
            <button type="button" class="btn-secondary" data-quote-new>Новый черновик</button>
            <button type="button" class="btn" data-quote-save>Сохранить черновик</button>
          </div>
        </div>
        <div class="v4-quote-layout">
          <div>
            ${renderWizardSteps(steps, activeStep, q)}
            <div class="v4-summary-grid">
              <div class="v4-mini"><b>${escapeHtml(statusLabel(q.status))}</b><span>Статус</span></div>
              <div class="v4-mini"><b>${formatMoney(q.totals && q.totals.transport)}</b><span>Транспорт</span></div>
              <div class="v4-mini"><b>${formatWeight(q.totals && q.totals.weightKg)}</b><span>Вес</span></div>
              <div class="v4-mini"><b>${formatPower(q.totals && q.totals.powerW)}</b><span>Мощность</span></div>
              <div class="v4-mini"><b>${formatPower(q.totals && q.totals.startupPowerW)}</b><span>Пусковая мощность</span></div>
            </div>
            ${renderBoundSectionSummary(q)}
          </div>
          <form class="v4-quote-form" data-quote-form data-quote-active-step="${escapeAttr(activeStep)}">
            <input type="hidden" name="wizard.activeStep" value="${escapeAttr(activeStep)}">
            <div class="v4-card v4-section-card v4-active-step-card">
              <div class="v4-kicker">Шаг ${escapeHtml(String((steps.findIndex(step => step.id === activeStep) + 1) || 1))} из ${escapeHtml(String(steps.length || 1))}</div>
              <h4>${escapeHtml(getStepTitle(activeStep, steps))}</h4>
              ${renderStepErrors(activeValidation)}
              ${renderQuoteForm(q, activeStep)}
              ${renderWizardNav(q, activeStep, steps)}
            </div>
          </form>
        </div>
        <div class="v4-note">${validation.ok ? 'Черновик проходит базовую проверку обязательных шагов.' : `Нужно дозаполнить: ${escapeHtml(validation.errors.map(row => row.message).join(' · '))}`}</div>
      </div>`;
    bindWizard(root, q);
    return root;
  }

  function renderWizardSteps(steps, activeStep, q) {
    return `<ol class="v4-steps">${steps.map((step, index) => {
      const stepValidation = validateStep(step.id, q);
      const badge = step.id === activeStep ? 'текущий шаг' : (stepValidation.ok ? 'готово' : `${stepValidation.errors.length} ошибок`);
      const classes = [stepValidation.ok ? 'v4-step-ok' : 'v4-step-warn'];
      if (step.id === activeStep) classes.push('v4-step-active');
      return `<li class="${classes.join(' ')}"><button type="button" data-quote-step-target="${escapeAttr(step.id)}"><span>${index + 1}</span><b>${escapeHtml(step.title)}</b><small>${escapeHtml(badge)}</small></button></li>`;
    }).join('')}</ol>`;
  }

  function getActiveStep(q, steps) {
    const safeSteps = Array.isArray(steps) && steps.length ? steps : getEnabledSteps(q);
    const ids = safeSteps.map(step => step.id);
    const requested = q && q.wizard && q.wizard.activeStep ? q.wizard.activeStep : 'client';
    return ids.includes(requested) ? requested : (ids[0] || 'client');
  }

  function getStepTitle(stepId, steps) {
    const row = (steps || WIZARD_STEPS).find(step => step.id === stepId);
    return row ? row.title : stepId;
  }

  function renderWizardNav(q, activeStep, steps) {
    const index = Math.max(0, steps.findIndex(step => step.id === activeStep));
    const prev = steps[index - 1];
    const next = steps[index + 1];
    const validation = validateStep(activeStep, q);
    return `<div class="v4-wizard-nav">
      <button type="button" class="btn-secondary" data-quote-prev ${prev ? '' : 'disabled'}>← Назад</button>
      <button type="button" class="btn-secondary" data-quote-save>Сохранить шаг</button>
      ${next ? `<button type="button" class="btn-primary" data-quote-next>Далее: ${escapeHtml(next.title)} →</button>` : `<button type="button" class="btn-primary" data-quote-next ${validation.ok ? '' : ''}>Готово к сводке</button>`}
    </div>`;
  }

  function renderStepErrors(validation) {
    const errors = validation && Array.isArray(validation.errors) ? validation.errors : [];
    if (!errors.length) return '<div class="v4-note v4-step-help">Шаг заполнен корректно, можно двигаться дальше.</div>';
    return `<div class="v4-note v4-step-error"><b>Проверь шаг:</b> ${errors.map(escapeHtml).join(' · ')}</div>`;
  }

  function fieldErrorClass(condition) {
    return condition ? ' v4-field-error' : '';
  }

  function renderQuoteForm(q, activeStep) {
    if (activeStep === 'client') return renderClientStep(q);
    if (activeStep === 'venue') return renderVenueStep(q);
    if (activeStep === 'transport') return renderTransportStep(q);
    if (activeStep === 'scope') return renderScopeStep(q);
    if (activeStep === 'stage') return renderLegacySectionPanel('stage', q.sections && q.sections.stage);
    if (activeStep === 'truss') return renderLegacySectionPanel('truss', q.sections && q.sections.truss);
    if (activeStep === 'led') return renderLedQuotePanel(q);
    if (activeStep === 'equipment') return renderEquipmentQuotePanel(q);
    if (activeStep === 'summary') return renderFinalSummaryPanel(q);
    return renderScopeStep(q);
  }

  function renderClientStep(q) {
    return `<div class="v4-grid-3">
      <label class="v4-field${fieldErrorClass(!q.client.name)}">Клиент<input name="client.name" value="${escapeAttr(q.client.name)}" placeholder="Название клиента"></label>
      <label class="v4-field${fieldErrorClass(!q.project.name)}">Проект<input name="project.name" value="${escapeAttr(q.project.name)}" placeholder="Название проекта"></label>
      <label class="v4-field">Статус<select name="status">${(ROOT.QuoteModel ? ROOT.QuoteModel.QUOTE_STATUSES : [{id:'draft',name:'Черновик'}]).map(s => `<option value="${escapeAttr(s.id)}" ${s.id === q.status ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></label>
      <label class="v4-field">Телефон клиента<input name="client.phone" value="${escapeAttr(q.client.phone)}" placeholder="+7..."></label>
      <label class="v4-field">Email клиента<input name="client.email" type="email" value="${escapeAttr(q.client.email)}" placeholder="mail@example.com"></label>
      <label class="v4-field">Комментарий<input name="project.comment" value="${escapeAttr(q.project.comment)}" placeholder="Внутренний комментарий"></label>
    </div>`;
  }

  function renderVenueStep(q) {
    return `<div class="v4-grid-3">
      <label class="v4-field${fieldErrorClass(!q.venue.name)}">Площадка<input name="venue.name" value="${escapeAttr(q.venue.name)}" placeholder="Название места"></label>
      <label class="v4-field${fieldErrorClass(!q.venue.address)}">Адрес<input name="venue.address" value="${escapeAttr(q.venue.address)}" placeholder="Адрес проведения"></label>
      <label class="v4-field${fieldErrorClass(!q.venue.date)}">Дата<input name="venue.date" type="date" value="${escapeAttr(q.venue.date)}"></label>
      <label class="v4-field">Контакт<input name="venue.contactName" value="${escapeAttr(q.venue.contactName)}" placeholder="Контактное лицо"></label>
      <label class="v4-field">Телефон<input name="venue.contactPhone" value="${escapeAttr(q.venue.contactPhone)}" placeholder="+7..."></label>
      <label class="v4-field">Время<input name="venue.startTime" type="time" value="${escapeAttr(q.venue.startTime)}"></label>
    </div>`;
  }

  function renderTransportStep(q) {
    const distanceRequired = q.transport.mode === 'out_of_city' && q.transport.distanceKm <= 0;
    return `<div class="v4-grid-3">
      <label class="v4-field">Маршрут<select name="transport.mode"><option value="city" ${q.transport.mode === 'city' ? 'selected' : ''}>По городу</option><option value="out_of_city" ${q.transport.mode === 'out_of_city' ? 'selected' : ''}>За город</option></select></label>
      <label class="v4-field">Тип транспорта<select name="transport.vehicleType">${renderTransportVehicleOptions(q.transport.vehicleType)}</select></label>
      <label class="v4-field${fieldErrorClass(distanceRequired)}">Км туда-обратно<input name="transport.distanceKm" type="number" min="0" step="1" value="${escapeAttr(q.transport.distanceKm)}"></label>
      <label class="v4-field">Простой, часов<input name="transport.idleHours" type="number" min="0" step="0.5" value="${escapeAttr(q.transport.idleHours)}"></label>
      <label class="v4-field">Простой, ₽/час<input name="transport.idlePricePerHour" type="number" min="0" step="100" value="${escapeAttr(q.transport.idlePricePerHour)}"></label>
      <label class="v4-field">Ручная цена<input name="transport.manualPrice" type="number" min="0" step="100" value="${escapeAttr(q.transport.manualPrice == null ? '' : q.transport.manualPrice)}" placeholder="пусто = авто"></label>
      <div class="v4-mini"><b>${formatMoney(q.transport.cityPrice)}</b><span>Город / ${escapeHtml(q.transport.vehicleLabel)}</span></div>
      <div class="v4-mini"><b>${formatNumber(q.transport.pricePerKm, 0)} ₽/км</b><span>За город / ${escapeHtml(q.transport.vehicleLabel)}</span></div>
      <div class="v4-mini"><b>${formatMoney(q.transport.total)}</b><span>Итог транспорта</span></div>
    </div>
    ${renderTransportTariffEditor(q.transport)}`;
  }

  function renderScopeStep(q) {
    const scope = q.scope || {};
    const hasEnabled = model() ? (model().getEnabledSectionKeys(q).length > 0 || Boolean(scope.transport)) : Object.values(scope).some(Boolean);
    return `<div class="v4-note">Выбери разделы, по которым мастер откроет следующие шаги. Транспорт остаётся обязательным разделом и уже заполнен на предыдущем шаге.</div>
      <div class="v4-scope-grid${hasEnabled ? '' : ' v4-scope-grid-error'}">
        ${scopeBox('scope.stage', 'Сцена', scope.stage)}
        ${scopeBox('scope.truss', 'Фермы', scope.truss)}
        ${scopeBox('scope.led', 'LED экран', scope.led)}
        ${scopeBox('scope.sound', 'Звук', scope.sound)}
        ${scopeBox('scope.light', 'Свет', scope.light)}
        ${scopeBox('scope.backline', 'Бэклайн', scope.backline)}
        ${scopeBox('scope.services', 'Услуги', scope.services)}
        ${scopeBox('scope.transport', 'Транспорт', true, true)}
      </div>`;
  }

  function renderPlaceholderPanel(key, section) {
    const titles = { stage: 'Секция сцены', truss: 'Секция ферм', equipment: 'Секция оборудования и услуг' };
    const notes = {
      stage: 'Мост готов: сюда подключим текущий конфигуратор сцены и складской лист.',
      truss: 'Мост готов: сюда подключается только текущий блочный конструктор ферм v3 и его BOM.',
      equipment: 'Мост готов: сюда подключим выбор из единой базы, ручные позиции и субаренду.'
    };
    const state = binder() ? binder().getSectionState(section) : { label: 'ожидает', css: 'v4-step-warn' };
    return `<div class="v4-card v4-section-card">
      <div class="v4-kicker">${escapeHtml(titles[key] || key)}</div>
      <h4>${escapeHtml(section && section.title || titles[key] || key)}</h4>
      <p class="v4-muted">${escapeHtml(notes[key] || 'Секция подготовлена.')}</p>
      <div class="v4-note">Статус: ${escapeHtml(state.label)}</div>
    </div>`;
  }

  function renderLegacySectionPanel(key, section) {
    const titles = { stage: 'Сцена в смете', truss: 'Фермы в смете' };
    const subtitles = {
      stage: 'Подтягивает текущий расчёт сцены из рабочего конфигуратора как snapshot + складской BOM.',
      truss: 'Подтягивает фермы только из блочного конструктора v3 как snapshot + BOM.'
    };
    const action = key === 'stage' ? 'data-quote-bind-stage' : 'data-quote-bind-truss';
    const button = key === 'stage' ? 'Подтянуть сцену' : 'Подтянуть фермы';
    const state = binder() ? binder().getSectionState(section) : { label: 'ожидает', css: 'v4-step-warn' };
    const configured = section && section.status === 'configured';
    return `<div class="v4-card v4-section-card" data-quote-${escapeAttr(key)}-panel>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">legacy bridge</div>
          <h4>${escapeHtml(section && section.title || titles[key] || key)}</h4>
          <p class="v4-muted">${escapeHtml(subtitles[key] || 'Мост секции подготовлен.')}</p>
        </div>
        <button type="button" class="btn-secondary" ${action}>${escapeHtml(button)}</button>
      </div>
      <div class="v4-note">Статус: ${escapeHtml(state.label)}${configured && section.updatedAt ? ` · ${escapeHtml(new Date(section.updatedAt).toLocaleString('ru-RU'))}` : ''}</div>
      ${configured ? `<div class="v4-summary-grid">
        <div class="v4-mini"><b>${formatWeight(section.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatMoney(section.rental)}</b><span>Раздел</span></div>
        <div class="v4-mini"><b>${escapeHtml(section.bomRows && section.bomRows.length || 0)}</b><span>BOM строк</span></div>
      </div><p class="v4-muted">${escapeHtml(section.summary || '')}</p>${renderBomRows(section.bomRows)}` : '<div class="v4-note">Сначала сделай расчёт в рабочем конфигураторе, затем нажми кнопку подтяжки.</div>'}
    </div>`;
  }

  function renderLedQuotePanel(q) {
    if (!ROOT.LedCalculator || !binder()) {
      return renderPlaceholderPanel('led', q.sections && q.sections.led);
    }
    const input = binder().getLedInputFromQuote(q);
    const section = q.sections && q.sections.led && q.sections.led.status === 'configured' ? q.sections.led : binder().buildLedSection(input);
    const formats = ROOT.LedCalculator.CABINET_FORMATS || {};
    const pitches = ROOT.LedCalculator.PIXEL_PITCHES || {};
    const legs = ROOT.LedCalculator.LEG_TYPES || {};
    const result = section.result || {};
    return `<div class="v4-card v4-section-card" data-quote-led-panel>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">LED section binding</div>
          <h4>LED экран в смете</h4>
          <p class="v4-muted">LED-секция сохраняет кабинетную схему, пиксели, пусковую мощность, PowerCON–Schuko, ноги, печеньки и болты.</p>
        </div>
        <button type="button" class="btn-secondary" data-quote-bind-led>Обновить LED</button>
      </div>
      <div class="v4-grid-3">
        <label class="v4-field">Ширина, м<input data-quote-led-field="widthM" type="number" min="0.1" step="0.1" value="${escapeAttr(input.widthM)}"></label>
        <label class="v4-field">Высота, м<input data-quote-led-field="heightM" type="number" min="0.1" step="0.1" value="${escapeAttr(input.heightM)}"></label>
        <label class="v4-field">Кабинет<select data-quote-led-field="format">${Object.keys(formats).map(id => `<option value="${escapeAttr(id)}" ${id === input.format ? 'selected' : ''}>${escapeHtml(formats[id].name)}</option>`).join('')}</select></label>
        <label class="v4-field">Шаг пикселя<select data-quote-led-field="pitch">${Object.keys(pitches).map(id => `<option value="${escapeAttr(id)}" ${id === input.pitch ? 'selected' : ''}>${escapeHtml(pitches[id].name)}</option>`).join('')}</select></label>
        <label class="v4-field">Вес кабинета, кг<input data-quote-led-field="cabinetWeightKg" type="number" min="0" step="0.1" value="${escapeAttr(input.cabinetWeightKg)}"></label>
        <label class="v4-field">Мощность кабинета, Вт<input data-quote-led-field="cabinetPowerW" type="number" min="0" step="10" value="${escapeAttr(input.cabinetPowerW)}"></label>
        <label class="v4-field">Пусковая мощность, Вт<input data-quote-led-field="cabinetStartupPowerW" type="number" min="0" step="10" value="${escapeAttr(input.cabinetStartupPowerW)}"></label>
        <label class="v4-field">Тип ног<select data-quote-led-field="legType">${Object.keys(legs).map(id => `<option value="${escapeAttr(id)}" ${id === input.legType ? 'selected' : ''}>${escapeHtml(legs[id].name)}</option>`).join('')}</select></label>
        <label class="v4-field">Количество ног<input data-quote-led-field="legCount" type="number" min="0" step="1" value="${escapeAttr(input.legCount)}"></label>
      </div>
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(Number(result.actualWidthM || 0).toFixed(2))}×${escapeHtml(Number(result.actualHeightM || 0).toFixed(2))} м</b><span>Факт. размер</span></div>
        <div class="v4-mini"><b>${result.columns || 0}×${result.rows || 0} = ${result.cabinetCount || 0}</b><span>Кабинеты</span></div>
        <div class="v4-mini"><b>${result.totalPixelsX || 0}×${result.totalPixelsY || 0} px</b><span>${result.cabinetPixelsX || 0}×${result.cabinetPixelsY || 0} px/каб.</span></div>
        <div class="v4-mini"><b>${formatWeight(section.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatPower(section.powerW)}</b><span>Рабочая мощность</span></div>
        <div class="v4-mini"><b>${formatPower(result.totalStartupPowerW || 0)}</b><span>Пусковая мощность</span></div>
        <div class="v4-mini"><b>${result.legCount || 0} / ${result.brackets || 0} / ${result.m8Bolts || 0}</b><span>Ноги / печеньки / М8×60</span></div>
        <div class="v4-mini"><b>${result.powerconSchukoCables || 0}</b><span>PowerCON–Schuko</span></div>
      </div>
      ${renderBomRows(section.bomRows)}
    </div>`;
  }


  function renderEquipmentQuotePanel(q) {
    if (!ROOT.QuoteEquipmentPicker || !ROOT.EquipmentDatabase || !binder()) {
      return renderPlaceholderPanel('equipment', q.sections && q.sections.equipment);
    }
    const section = q.sections && q.sections.equipment ? q.sections.equipment : null;
    const input = binder().getEquipmentInputFromQuote ? binder().getEquipmentInputFromQuote(q) : { scope: q.scope || {}, items: [], manualItems: [] };
    const preview = section && section.status === 'configured' ? section : binder().buildEquipmentSection(Object.assign({}, input, { scope: q.scope || {} }));
    const availableItems = ROOT.QuoteEquipmentPicker.listPickerItems(q.scope || {});
    const selected = new Map((Array.isArray(input.items) ? input.items : []).map(row => [row.itemId, row]));
    const selectedRows = Array.isArray(preview.items) ? preview.items : [];
    return `<div class="v4-card v4-section-card" data-quote-equipment-panel>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">equipment section picker</div>
          <h4>Звук, свет, бэклайн, услуги</h4>
          <p class="v4-muted">Выбор из единой базы по выбранным чекбоксам сметы. Можно смешивать свой склад, субаренду и ручные позиции.</p>
        </div>
        <button type="button" class="btn-secondary" data-quote-bind-equipment>Обновить оборудование</button>
      </div>
      ${renderEquipmentScopeBadges(q.scope || {})}
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(selectedRows.length || 0)}</b><span>позиций</span></div>
        <div class="v4-mini"><b>${formatWeight(preview.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatPower(preview.powerW)}</b><span>Мощность</span></div>
        <div class="v4-mini"><b>${escapeHtml(preview.deficitCount || 0)}</b><span>дефицитных позиций</span></div>
      </div>
      ${renderEquipmentSelectedSummary(selectedRows)}
      ${renderEquipmentPickerGroups(availableItems, selected)}
      <div class="v4-note"><b>Ручные / субарендные позиции</b><br><span class="v4-muted">Можно добавить до трёх быстрых строк: генератор, спецкомплект, дополнительная услуга, позиция от подрядчика.</span></div>
      ${renderManualEquipmentRows(input.manualItems)}
      ${renderEquipmentRows(selectedRows)}
    </div>`;
  }

  function renderEquipmentScopeBadges(scope) {
    const selectedScopes = ROOT.QuoteEquipmentPicker && ROOT.QuoteEquipmentPicker.getSelectedScopes ? ROOT.QuoteEquipmentPicker.getSelectedScopes(scope || {}) : [];
    if (!selectedScopes.length) return '<div class="v4-note v4-step-error">В составе сметы не выбран звук, свет, бэклайн или услуги.</div>';
    return `<div class="v4-equipment-scope-badges">${selectedScopes.map(key => `<span class="v4-badge">${escapeHtml(scopeLabel(key))}</span>`).join('')}</div>`;
  }

  function renderEquipmentSelectedSummary(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '<div class="v4-note">Корзина оборудования пока пустая. Укажи количество в нужных строках ниже или добавь ручную позицию.</div>';
    const ownCount = safeRows.filter(row => row.sourceType === 'own').length;
    const subrentCount = safeRows.filter(row => row.sourceType === 'subrent' || row.sourceType === 'manual' || row.sourceType === 'subrent_needed').length;
    return `<div class="v4-equipment-basket">
      <div class="v4-mini"><b>${escapeHtml(String(ownCount))}</b><span>свой склад</span></div>
      <div class="v4-mini"><b>${escapeHtml(String(subrentCount))}</b><span>ручные / субаренда</span></div>
      <div class="v4-mini"><b>${escapeHtml(String(safeRows.filter(row => row.deficitQty > 0).length))}</b><span>дефицит</span></div>
    </div>`;
  }

  function renderEquipmentPickerGroups(items, selected) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '<div class="v4-note">Для выбранных чекбоксов пока нет позиций в базе оборудования.</div>';
    const groups = groupEquipmentItems(safeItems);
    return Object.keys(groups).map(category => {
      const rows = groups[category];
      return `<details class="v4-equipment-group" open>
        <summary><b>${escapeHtml(categoryLabel(category))}</b><span>${escapeHtml(String(rows.length))} поз.</span></summary>
        <div class="v4-table-wrap v4-table-wrap--quote-equipment">
          <table class="v4-table v4-table--quote-equipment">
            <thead><tr><th>Позиция из базы</th><th>Наличие</th><th>Кол-во</th><th>Источник</th></tr></thead>
            <tbody>${rows.map(item => {
              const current = selected.get(item.id) || {};
              const stockText = `${formatNumber(item.availableQty, 0)} / ${formatNumber(item.stockQty, 0)} ${escapeHtml(item.unit)}`;
              return `<tr>
                <td><b>${escapeHtml(item.name)}</b><br><span class="v4-muted">${escapeHtml(item.code || item.id)} · ${escapeHtml(item.subcategory || item.type || item.category)}</span></td>
                <td class="v4-nowrap">${stockText}</td>
                <td><input class="v4-mini-input" data-quote-equipment-item="${escapeAttr(item.id)}" type="number" min="0" step="1" value="${escapeAttr(current.qty || 0)}"></td>
                <td><select class="v4-mini-input" data-quote-equipment-source="${escapeAttr(item.id)}"><option value="own" ${(current.sourceType || 'own') === 'own' ? 'selected' : ''}>свой склад</option><option value="subrent" ${current.sourceType === 'subrent' ? 'selected' : ''}>субаренда</option></select></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </details>`;
    }).join('');
  }

  function renderManualEquipmentRows(manualItems) {
    const rows = Array.isArray(manualItems) ? manualItems.slice(0, 3) : [];
    while (rows.length < 3) rows.push({});
    return `<div class="v4-manual-equipment-list">${rows.map((manual, index) => `<div class="v4-manual-equipment-row" data-quote-equipment-manual-row="${index}">
      <div class="v4-note"><b>Ручная строка ${index + 1}</b></div>
      <div class="v4-grid-3">
        <label class="v4-field">Название<input data-quote-equipment-manual-field="name" value="${escapeAttr(manual.name || '')}" placeholder="Например, генератор / доп. комплект"></label>
        <label class="v4-field">Кол-во<input data-quote-equipment-manual-field="qty" type="number" min="0" step="1" value="${escapeAttr(manual.qty || 0)}"></label>
        <label class="v4-field">Ед.<input data-quote-equipment-manual-field="unit" value="${escapeAttr(manual.unit || 'шт')}"></label>
        <label class="v4-field">Источник<select data-quote-equipment-manual-field="sourceType"><option value="manual" ${(manual.sourceType || 'manual') === 'manual' ? 'selected' : ''}>ручная</option><option value="subrent" ${manual.sourceType === 'subrent' ? 'selected' : ''}>субаренда</option></select></label>
        <label class="v4-field">У кого берём<input data-quote-equipment-manual-field="supplierName" value="${escapeAttr(manual.supplierName || '')}" placeholder="Поставщик"></label>
        <label class="v4-field">Цена/ед.<input data-quote-equipment-manual-field="rentalPrice" type="number" min="0" step="100" value="${escapeAttr(manual.rentalPrice || 0)}"></label>
        <label class="v4-field">Субаренда/ед.<input data-quote-equipment-manual-field="subrentPrice" type="number" min="0" step="100" value="${escapeAttr(manual.subrentPrice || manual.rentalPrice || 0)}"></label>
        <label class="v4-field">Клиент/ед.<input data-quote-equipment-manual-field="clientPrice" type="number" min="0" step="100" value="${escapeAttr(manual.clientPrice || 0)}"></label>
        <label class="v4-field">Маржа<input data-quote-equipment-manual-field="margin" type="number" min="0" step="100" value="${escapeAttr(manual.margin || 0)}"></label>
        <label class="v4-field">Комментарий<input data-quote-equipment-manual-field="note" value="${escapeAttr(manual.note || '')}" placeholder="Сроки / условия / замена"></label>
        <label class="v4-field">Вес/ед., кг<input data-quote-equipment-manual-field="weightKg" type="number" min="0" step="0.1" value="${escapeAttr(manual.weightKg || 0)}"></label>
        <label class="v4-field">Мощность/ед., Вт<input data-quote-equipment-manual-field="powerW" type="number" min="0" step="10" value="${escapeAttr(manual.powerW || 0)}"></label>
      </div>
    </div>`).join('')}</div>`;
  }

  function groupEquipmentItems(items) {
    return (Array.isArray(items) ? items : []).reduce((acc, item) => {
      const key = item.category || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function scopeLabel(key) {
    return ({ sound: 'Звук', light: 'Свет', backline: 'Бэклайн', services: 'Услуги' })[key] || key;
  }

  function categoryLabel(key) {
    return ({
      sound_pa: 'Звук ПА',
      consoles: 'Пульты',
      monitoring: 'Мониторинг',
      backline: 'Бэклайн',
      light: 'Свет',
      services: 'Услуги',
      commutation: 'Коммутация',
      consumables: 'Расходники',
      other: 'Другое'
    })[key] || key;
  }

  function renderEquipmentRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '<div class="v4-note">Позиции оборудования пока не добавлены.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>В смете</th><th>Кол-во</th><th>Наличие</th><th>Дефицит</th><th>Источник</th></tr></thead><tbody>${safeRows.map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id)}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatNumber(row.availableQty, 0)}</td><td>${row.deficitQty ? '<b>' + formatNumber(row.deficitQty, 0) + '</b>' : '—'}</td><td>${escapeHtml(row.sourceType || 'own')}${row.supplierName ? '<br><span class="v4-muted">' + escapeHtml(row.supplierName) + '</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderBomRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '<div class="v4-note">BOM пока пуст.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Пуск</th></tr></thead><tbody>${safeRows.map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id)}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatWeight(row.weightKg)}</td><td>${row.powerW ? formatPower(row.powerW) : '—'}</td><td>${row.startupPowerW ? formatPower(row.startupPowerW) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderBoundSectionSummary(q) {
    if (!binder()) return '';
    const rows = binder().buildSectionSummaryRows(q);
    if (!rows.length) return '<div class="v4-note">Секции сметы пока не выбраны.</div>';
    return `<div class="v4-note"><b>Секции:</b> ${rows.map(row => `${escapeHtml(row.title)} — ${escapeHtml(row.status)}`).join(' · ')}</div>`;
  }

  function renderFinalSummaryPanel(q) {
    if (!summaryBuilder()) return '';
    const finalSummary = summaryBuilder().buildFinalSummary(q);
    const pickLists = pickListBuilder() ? pickListBuilder().buildPickLists(q) : null;
    const customerRows = finalSummary.customerRows || [];
    const technicalRows = finalSummary.technicalRows || [];
    const warnings = finalSummary.warnings || [];
    return `<div class="v4-card v4-section-card" data-quote-final-summary>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">summary foundation</div>
          <h4>Итоговая сводка сметы</h4>
          <p class="v4-muted">Каркас финального окна: клиентская смета, техсводка, складские листы, дефицит и субаренда. Визуал и PDF-документы допилим позже.</p>
        </div>
        <div class="v4-note">${finalSummary.validation && finalSummary.validation.ok ? 'Проверка: ок' : 'Есть незаполненные шаги'}</div>
      </div>
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${formatMoney(finalSummary.totals && finalSummary.totals.rental)}</b><span>Разделы</span></div>
        <div class="v4-mini"><b>${formatMoney(finalSummary.totals && finalSummary.totals.transport)}</b><span>Транспорт</span></div>
        <div class="v4-mini"><b>${formatMoney(finalSummary.totals && finalSummary.totals.total)}</b><span>Итого</span></div>
        <div class="v4-mini"><b>${formatWeight(finalSummary.totals && finalSummary.totals.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatPower(finalSummary.totals && finalSummary.totals.powerW)}</b><span>Рабочая мощность</span></div>
        <div class="v4-mini"><b>${formatPower(finalSummary.totals && finalSummary.totals.startupPowerW)}</b><span>Пусковая мощность</span></div>
      </div>
      ${renderReadinessChecklist(q)}
      ${renderFinalDocumentActions(finalSummary, pickLists)}
      ${renderCustomerEstimateRows(customerRows)}
      ${renderTechnicalSummaryRows(technicalRows)}
      ${pickLists ? renderPickLists(pickLists) : ''}
      ${renderSummaryWarnings(warnings)}
    </div>`;
  }


  function renderReadinessChecklist(q) {
    if (!readinessChecklist() || !readinessChecklist().buildChecklist) return '';
    const checklist = readinessChecklist().buildChecklist(q);
    const items = Array.isArray(checklist.items) ? checklist.items : [];
    const requiredFailed = checklist.totals && checklist.totals.requiredFailed || 0;
    const warnings = checklist.totals && checklist.totals.warnings || 0;
    const statusLabel = checklist.ready ? (warnings ? 'Готово с предупреждениями' : 'Готово') : 'Нужно доработать';
    return `<div class="v4-card v4-section-card v4-readiness-card" data-project-readiness>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">project readiness</div>
          <h4>Checklist готовности проекта</h4>
          <p class="v4-muted">Быстрая проверка перед отправкой клиенту или передачей складу: обязательные поля, выбранные разделы, дефицит, документы и статус.</p>
        </div>
        <div class="v4-readiness-score ${checklist.ready ? 'ok' : 'bad'}">
          <b>${formatNumber(checklist.score, 0)}%</b>
          <span>${escapeHtml(statusLabel)}</span>
        </div>
      </div>
      <div class="v4-readiness-summary">
        <span class="${requiredFailed ? 'bad' : 'ok'}">Обязательные: ${requiredFailed ? requiredFailed + ' не закрыто' : 'ок'}</span>
        <span class="${warnings ? 'warn' : 'ok'}">Предупреждения: ${warnings || 0}</span>
        <span>Пунктов: ${items.length}</span>
      </div>
      <div class="v4-readiness-list">${items.map(item => `<div class="v4-readiness-item ${item.ok ? 'ok' : item.severity === 'warning' ? 'warn' : 'bad'}">
        <b>${item.ok ? '✓' : item.severity === 'warning' ? '!' : '×'} ${escapeHtml(item.title)}</b>
        <span>${escapeHtml(item.details || '')}</span>
        ${item.action ? `<small>${escapeHtml(item.action)}</small>` : ''}
      </div>`).join('')}</div>
    </div>`;
  }


  function renderFinalDocumentActions(finalSummary, pickLists) {
    const sectionLists = pickLists && Array.isArray(pickLists.sections) ? pickLists.sections.filter(list => list.rows && list.rows.length) : [];
    const sectionButtons = sectionLists.map(list => `<button type="button" class="btn-secondary" data-quote-doc="warehouse:${escapeAttr(list.key)}">${escapeHtml(list.title)}</button>`).join('');
    const deficitButton = pickLists && pickLists.deficits && pickLists.deficits.rows && pickLists.deficits.rows.length ? '<button type="button" class="btn-secondary" data-quote-doc="warehouse:deficits">Дефицит</button>' : '';
    const subrentButton = pickLists && pickLists.subrent && pickLists.subrent.rows && pickLists.subrent.rows.length ? '<button type="button" class="btn-secondary" data-quote-doc="warehouse:subrent">Субаренда</button><button type="button" class="btn-secondary" data-quote-doc="subrent">План субаренды</button>' : '';
    return `<div class="v4-card v4-section-card v4-doc-actions">
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">documents actions</div>
          <h4>Документы и листы</h4>
          <p class="v4-muted">Быстрые заготовки без PDF: КП клиенту, техлист, складские листы, черновик события календаря и ICS-файл для импорта.</p>
        </div>
      </div>
      <div class="v4-actions">
        <button type="button" class="btn-primary" data-quote-doc="customer">КП клиенту</button>
        <button type="button" class="btn-secondary" data-quote-doc="technical">Техлист</button>
        <button type="button" class="btn-secondary" data-quote-doc="readiness">Checklist готовности</button>
        <button type="button" class="btn-secondary" data-quote-doc="warehouse:all">Общий складской лист</button>
        <button type="button" class="btn-secondary" data-quote-doc="reservations">План резерва склада</button>
        <button type="button" class="btn-secondary" data-quote-doc="stock-movements">Движение склада</button>
        <button type="button" class="btn-secondary" data-quote-doc="warehouse-workflow">Складской workflow</button>
        <button type="button" class="btn-secondary" data-quote-doc="warehouse-workflow-json">warehouse_workflow JSON</button>
        ${sectionButtons}
        ${deficitButton}
        ${subrentButton}
        <button type="button" class="btn-secondary" data-quote-doc="calendar">Черновик календаря</button>
        <button type="button" class="btn-secondary" data-quote-doc="calendar-ics">ICS календаря</button>
        <button type="button" class="btn-secondary" data-quote-doc="quote-items">quote_items JSON</button>
        <button type="button" class="btn-secondary" data-quote-doc="audit-log">audit_log JSON</button>
        <button type="button" class="btn-secondary" data-quote-doc="export-pack">Export pack JSON</button>
        <button type="button" class="btn-secondary" data-quote-doc="json">JSON проекта</button>
      </div>
      <textarea class="v4-doc-preview" data-quote-doc-preview readonly placeholder="Нажми кнопку документа — здесь появится текст для копирования или проверки."></textarea>
    </div>`;
  }

  function renderCustomerEstimateRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '<div class="v4-note">Клиентская смета пока пустая: добавь хотя бы один рассчитанный раздел.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Раздел для клиента</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>${safeRows.map(row => `<tr><td><b>${escapeHtml(row.title)}</b></td><td>${formatNumber(row.qty || 1, 0)} ${escapeHtml(row.unit || 'раздел')}</td><td>${formatMoney(row.price)}</td><td><b>${formatMoney(row.total)}</b></td><td><span class="v4-muted">${escapeHtml(row.note || '')}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderTechnicalSummaryRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '';
    return `<div class="v4-summary-grid">${safeRows.map(row => {
      const value = row.unit === 'Вт' ? formatPower(row.value) : row.unit === 'кг' ? formatWeight(row.value) : `${formatNumber(row.value || 0, 0)} ${escapeHtml(row.unit || '')}`;
      return `<div class="v4-mini"><b>${value}</b><span>${escapeHtml(row.title)}</span></div>`;
    }).join('')}</div>`;
  }

  function renderPickLists(pickLists) {
    const lists = [];
    if (pickLists.all) lists.push(pickLists.all);
    if (pickLists.deficits && pickLists.deficits.rows && pickLists.deficits.rows.length) lists.push(pickLists.deficits);
    if (pickLists.subrent && pickLists.subrent.rows && pickLists.subrent.rows.length) lists.push(pickLists.subrent);
    (pickLists.sections || []).forEach(list => { if (list.rows && list.rows.length) lists.push(list); });
    if (!lists.length) return '<div class="v4-note">Складские листы пока пустые.</div>';
    return `<div class="v4-note"><b>Складские листы:</b> ${lists.map(list => `${escapeHtml(list.title)} — ${escapeHtml(list.rows.length)} поз.`).join(' · ')}</div>${lists.slice(0, 3).map(renderPickListTable).join('')}`;
  }

  function renderPickListTable(list) {
    const rows = list && list.rows ? list.rows : [];
    if (!rows.length) return '';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>${escapeHtml(list.title)}</th><th>Кол-во</th><th>Вес</th><th>Дефицит</th><th>Источник</th></tr></thead><tbody>${rows.slice(0, 12).map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id || '')} · ${escapeHtml(row.sectionTitle || row.sectionKey || '')}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatWeight(row.weightKg)}</td><td>${row.deficitQty ? '<b>' + formatNumber(row.deficitQty, 0) + '</b>' : '—'}</td><td>${escapeHtml(row.sourceType || 'own')}${row.supplierName ? '<br><span class="v4-muted">' + escapeHtml(row.supplierName) + '</span>' : ''}</td></tr>`).join('')}${rows.length > 12 ? `<tr><td colspan="5" class="v4-muted">…и ещё ${rows.length - 12} поз.</td></tr>` : ''}</tbody></table></div>`;
  }

  function renderSummaryWarnings(warnings) {
    const safeRows = Array.isArray(warnings) ? warnings : [];
    if (!safeRows.length) return '<div class="v4-note">Предупреждений по сводке нет.</div>';
    return `<div class="v4-note"><b>Проверки:</b> ${safeRows.slice(0, 8).map(row => escapeHtml(row.message || row)).join(' · ')}${safeRows.length > 8 ? ` · +${safeRows.length - 8}` : ''}</div>`;
  }

  function getTransportVehicles() {
    return ROOT.QuoteModel && Array.isArray(ROOT.QuoteModel.TRANSPORT_VEHICLES)
      ? ROOT.QuoteModel.TRANSPORT_VEHICLES
      : [{ id: 'cargo', name: 'Грузовой' }, { id: 'passenger', name: 'Легковой' }, { id: 'trailer', name: 'Прицеп' }];
  }

  function renderTransportVehicleOptions(selected) {
    const vehicles = getTransportVehicles();
    const current = selected || 'cargo';
    return vehicles.map(row => `<option value="${escapeAttr(row.id)}" ${row.id === current ? 'selected' : ''}>${escapeHtml(row.name)}</option>`).join('');
  }

  function renderTransportTariffEditor(transport) {
    const tr = model() && model().normalizeTransport ? model().normalizeTransport(transport || {}) : (transport || {});
    const tariffs = model() && model().normalizeTransportTariffs ? model().normalizeTransportTariffs(tr.tariffs || {}) : (tr.tariffs || {});
    const vehicles = getTransportVehicles();
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Тариф транспорта</th><th>Город, ₽</th><th>За город, ₽/км</th></tr></thead><tbody>${vehicles.map(vehicle => {
      const tariff = tariffs[vehicle.id] || { cityPrice: 4000, pricePerKm: 35 };
      const active = vehicle.id === tr.vehicleType ? ' · применяется сейчас' : '';
      return `<tr><td><b>${escapeHtml(vehicle.name)}</b><br><span class="v4-muted">${escapeHtml(vehicle.id)}${active}</span></td><td><input class="v4-mini-input" name="transport.tariffs.${escapeAttr(vehicle.id)}.cityPrice" type="number" min="0" step="100" value="${escapeAttr(tariff.cityPrice)}"></td><td><input class="v4-mini-input" name="transport.tariffs.${escapeAttr(vehicle.id)}.pricePerKm" type="number" min="0" step="1" value="${escapeAttr(tariff.pricePerKm)}"></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function scopeBox(name, label, checked, disabled) {
    return `<label class="v4-scope-item${disabled ? ' v4-scope-item-disabled' : ''}"><input type="checkbox" name="${escapeAttr(name)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}> <span>${escapeHtml(label)}</span></label>`;
  }

  function bindWizard(root, quote) {
    const saveBtns = root.querySelectorAll('[data-quote-save]');
    const newBtn = root.querySelector('[data-quote-new]');
    const form = root.querySelector('[data-quote-form]');
    const ledBtn = root.querySelector('[data-quote-bind-led]');
    const stageBtn = root.querySelector('[data-quote-bind-stage]');
    const trussBtn = root.querySelector('[data-quote-bind-truss]');
    const equipmentBtn = root.querySelector('[data-quote-bind-equipment]');
    const prevBtn = root.querySelector('[data-quote-prev]');
    const nextBtn = root.querySelector('[data-quote-next]');
    const stepButtons = root.querySelectorAll('[data-quote-step-target]');
    const docButtons = root.querySelectorAll('[data-quote-doc]');

    const saveDraft = (draft, message) => {
      const saved = storage() && storage().saveDraft ? storage().saveDraft(draft) : draft;
      if (message) toast(message);
      renderWizardMap(root, saved);
      return saved;
    };

    const setActiveStep = (draft, stepId, message) => {
      const base = model() ? model().mergeQuotePatch(draft, { wizard: { activeStep: stepId } }) : Object.assign({}, draft, { wizard: { activeStep: stepId } });
      return saveDraft(base, message || 'Шаг сметы обновлён');
    };

    const readCurrent = () => readFormQuote(form, quote);

    const save = () => saveDraft(readCurrent(), 'Черновик сметы сохранён');

    const tryMove = (directionOrTarget) => {
      let next = readCurrent();
      const steps = getEnabledSteps(next);
      const active = getActiveStep(next, steps);
      const activeIndex = Math.max(0, steps.findIndex(step => step.id === active));
      let targetIndex = activeIndex;
      if (directionOrTarget === 'next') targetIndex = Math.min(steps.length - 1, activeIndex + 1);
      else if (directionOrTarget === 'prev') targetIndex = Math.max(0, activeIndex - 1);
      else targetIndex = Math.max(0, steps.findIndex(step => step.id === directionOrTarget));
      if (targetIndex > activeIndex) {
        const currentValidation = validateStep(active, next);
        if (!currentValidation.ok) {
          toast(currentValidation.errors[0] || 'Заполните обязательные поля перед переходом дальше');
          return setActiveStep(next, active, null);
        }
      }
      const target = steps[targetIndex] || steps[0];
      if (!target) return saveDraft(next, null);
      next = model() ? model().mergeQuotePatch(next, { wizard: { activeStep: target.id } }) : Object.assign({}, next, { wizard: { activeStep: target.id } });
      return saveDraft(next, null);
    };


    const writeDocumentPreview = (docKind) => {
      let next = readCurrent();
      if (!documentBuilder()) {
        toast('Модуль документов ещё не загружен');
        return;
      }
      const doc = buildRequestedDocument(next, docKind);
      const text = docKind === 'readiness' && readinessChecklist() ? readinessChecklist().checklistToText(next) : docKind === 'json' ? JSON.stringify(model() ? model().buildQuotePayload(next) : next, null, 2) : docKind === 'quote-items' && ROOT.QuoteItemBuilder ? ROOT.QuoteItemBuilder.exportQuoteItems(next) : docKind === 'audit-log' && ROOT.ProjectAuditLog ? ROOT.ProjectAuditLog.exportAuditLog(next) : docKind === 'export-pack' && ROOT.ProjectAuditLog ? ROOT.ProjectAuditLog.exportProjectPack(next) : docKind === 'reservations' && ROOT.ReservationPlanner ? ROOT.ReservationPlanner.exportReservationPlan(next) : docKind === 'stock-movements' && ROOT.StockMovementPlanner ? ROOT.StockMovementPlanner.exportMovementPlan(next, { action: 'reserve' }) : docKind === 'warehouse-workflow-json' && ROOT.WarehouseWorkflow ? ROOT.WarehouseWorkflow.exportWorkflow(next) : docKind === 'calendar-ics' && ROOT.CalendarIntegration ? ROOT.CalendarIntegration.exportIcs(next) : documentBuilder().documentToText(doc);
      const preview = root.querySelector('[data-quote-doc-preview]');
      if (preview) {
        preview.value = text;
        preview.focus();
        preview.select();
      }
      copyText(text);
      downloadText(getDocumentFilename(next, docKind), text, docKind === 'calendar-ics' ? 'text/calendar;charset=utf-8' : 'text/plain;charset=utf-8');
      toast(docKind === 'calendar-ics' ? 'ICS календаря сформирован, скопирован и сохранён' : 'Документ сформирован, скопирован и сохранён как TXT');
    };

    const buildRequestedDocument = (draft, docKind) => {
      if (docKind === 'customer') return documentBuilder().buildCustomerProposal(draft);
      if (docKind === 'technical') return documentBuilder().buildTechnicalSheet(draft);
      if (docKind === 'calendar' || docKind === 'calendar-ics') return documentBuilder().buildCalendarDraft(draft);
      if (docKind === 'subrent') return documentBuilder().buildSubrentSheet(draft);
      if (docKind === 'reservations') return documentBuilder().buildReservationSheet(draft);
      if (docKind === 'stock-movements') return documentBuilder().buildStockMovementSheet(draft, 'reserve');
      if (docKind === 'warehouse-workflow' || docKind === 'warehouse-workflow-json') return documentBuilder().buildWarehouseWorkflowSheet(draft);
      if (docKind === 'readiness') return documentBuilder().buildTechnicalSheet(draft);
      if (docKind === 'quote-items' || docKind === 'audit-log' || docKind === 'export-pack') return documentBuilder().buildTechnicalSheet(draft);
      if (String(docKind || '').startsWith('warehouse:')) return documentBuilder().buildWarehouseSheet(draft, String(docKind).split(':')[1] || 'all');
      return documentBuilder().buildTechnicalSheet(draft);
    };

    const getDocumentFilename = (draft, docKind) => {
      const q = createDraft(draft || {});
      const base = (q.project && q.project.name || q.client && q.client.name || 'feg-project').toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'feg-project';
      const suffix = String(docKind || 'document').replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '') || 'document';
      const ext = docKind === 'calendar-ics' ? 'ics' : 'txt';
      return `${base}-${suffix}.${ext}`;
    };

    const copyText = (text) => {
      try {
        if (GLOBAL.navigator && GLOBAL.navigator.clipboard && GLOBAL.navigator.clipboard.writeText) GLOBAL.navigator.clipboard.writeText(text).catch(() => {});
      } catch (_) {}
    };

    const downloadText = (filename, text, mimeType) => {
      try {
        if (!GLOBAL.Blob || !GLOBAL.URL || !document || !document.createElement) return;
        const blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      } catch (_) {}
    };

    const bindLegacySection = (key) => {
      try {
        let next = readCurrent();
        if (!binder()) throw new Error('QuoteSectionBinder не загружен');
        next = key === 'stage' ? binder().bindStageFromLegacy(next) : binder().bindTrussFromLegacy(next);
        saveDraft(next, key === 'stage' ? 'Секция сцены подтянута в смету' : 'Секция ферм подтянута в смету');
      } catch (err) {
        toast(err && err.message ? err.message : 'Не удалось подтянуть секцию');
        if (console && console.warn) console.warn(err);
      }
    };

    saveBtns.forEach(btn => btn.addEventListener('click', save));
    if (ledBtn) ledBtn.addEventListener('click', save);
    if (stageBtn) stageBtn.addEventListener('click', () => bindLegacySection('stage'));
    if (trussBtn) trussBtn.addEventListener('click', () => bindLegacySection('truss'));
    if (equipmentBtn) equipmentBtn.addEventListener('click', save);
    if (prevBtn) prevBtn.addEventListener('click', () => tryMove('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => tryMove('next'));
    stepButtons.forEach(btn => btn.addEventListener('click', () => tryMove(btn.getAttribute('data-quote-step-target'))));
    docButtons.forEach(btn => btn.addEventListener('click', () => writeDocumentPreview(btn.getAttribute('data-quote-doc'))));
    if (newBtn) newBtn.addEventListener('click', () => {
      const next = prepareDraft({ scope: { stage: true, truss: true, led: true }, wizard: { activeStep: 'client' } });
      saveDraft(next, 'Создан новый черновик сметы');
    });
    if (form) {
      const ledFormat = form.querySelector('[data-quote-led-field="format"]');
      if (ledFormat) {
        ledFormat.addEventListener('change', () => {
          applyLedFormatDefaults(form, ledFormat.value);
          save();
        });
      }
      form.addEventListener('change', save);
    }
  }

  function applyLedFormatDefaults(form, formatId) {
    if (!form || !ROOT.LedCalculator || !ROOT.LedCalculator.getCabinetFormat) return;
    const format = ROOT.LedCalculator.getCabinetFormat(formatId);
    setLedField(form, 'cabinetWeightKg', format.defaultWeightKg || 0);
    setLedField(form, 'cabinetPowerW', format.defaultPowerW || 0);
    setLedField(form, 'cabinetStartupPowerW', format.defaultStartupPowerW || 0);
  }

  function setLedField(form, key, value) {
    const el = form.querySelector(`[data-quote-led-field="${key}"]`);
    if (el) el.value = value;
  }

  function readFormQuote(form, quote) {
    let next = createDraft(quote || {});
    if (!form || !model()) return next;
    const fields = form.querySelectorAll('input[name], select[name], textarea[name]');
    fields.forEach(field => {
      const name = field.name;
      const value = field.type === 'checkbox' ? field.checked : field.value;
      next = model().setQuoteField(next, name, value);
    });
    next.transport = model().applySelectedTransportTariff ? model().applySelectedTransportTariff(next.transport) : model().normalizeTransport(next.transport);
    if (binder()) {
      next = binder().ensureSectionsForScope(next);
      const ledInput = readLedInput(form);
      if (next.scope && next.scope.led && ledInput) next = binder().bindLedSection(next, ledInput);
      const equipmentInput = readEquipmentInput(form, next);
      if ((next.scope.sound || next.scope.light || next.scope.backline || next.scope.services) && equipmentInput && binder().bindEquipmentSection) next = binder().bindEquipmentSection(next, equipmentInput);
    }
    next.totals = model().summarizeQuote(next).totals;
    return model().createQuoteDraft(next);
  }

  function readLedInput(form) {
    if (!form) return null;
    const fields = form.querySelectorAll('[data-quote-led-field]');
    if (!fields.length) return null;
    const out = {};
    fields.forEach(field => { out[field.dataset.quoteLedField] = field.value; });
    return out;
  }


  function readEquipmentInput(form, quote) {
    if (!form || !ROOT.QuoteEquipmentPicker) return null;
    const itemInputs = form.querySelectorAll('[data-quote-equipment-item]');
    const items = [];
    itemInputs.forEach(input => {
      const itemId = input.getAttribute('data-quote-equipment-item');
      const qty = Number(input.value || 0);
      if (itemId && qty > 0) {
        const source = form.querySelector(`[data-quote-equipment-source="${cssEscape(itemId)}"]`);
        items.push({ itemId, qty, sourceType: source ? source.value : 'own' });
      }
    });
    const manualItems = [];
    const manualRows = form.querySelectorAll('[data-quote-equipment-manual-row]');
    manualRows.forEach(row => {
      const manual = {};
      row.querySelectorAll('[data-quote-equipment-manual-field]').forEach(input => {
        manual[input.getAttribute('data-quote-equipment-manual-field')] = input.value;
      });
      if (manual.name && Number(manual.qty || 0) > 0) manualItems.push(manual);
    });
    if (!manualRows.length) {
      const manual = {};
      form.querySelectorAll('[data-quote-equipment-manual]').forEach(input => {
        manual[input.getAttribute('data-quote-equipment-manual')] = input.value;
      });
      if (manual.name && Number(manual.qty || 0) > 0) manualItems.push(manual);
    }
    if (!items.length && !manualItems.length && !(quote && quote.sections && quote.sections.equipment)) return null;
    return { scope: quote && quote.scope || {}, items, manualItems };
  }

  function cssEscape(value) {
    if (GLOBAL.CSS && GLOBAL.CSS.escape) return GLOBAL.CSS.escape(value);
    return String(value).replace(/(["\\])/g, '\\$1');
  }

  function legacyCreateDraft(data) {
    return { id: data.id || `quote-${Date.now()}`, status: data.status || 'draft', client: data.client || {}, venue: data.venue || {}, transport: data.transport || { mode: 'city', vehicleType: 'cargo', cityPrice: 4000, pricePerKm: 35, distanceKm: 0 }, scope: Object.assign({}, data.scope || {}), sections: data.sections || {}, updatedAt: new Date().toISOString(), totals: data.totals || {} };
  }

  function legacyValidateStep(stepId, draft) {
    const q = legacyCreateDraft(draft || {});
    const errors = [];
    if (stepId === 'client' && !(q.client && q.client.name)) errors.push('Выберите или создайте клиента.');
    if (stepId === 'venue' && !(q.venue && q.venue.name && q.venue.address && q.venue.date)) errors.push('Заполните площадку, адрес и дату.');
    if (stepId === 'scope' && !Object.values(q.scope || {}).some(Boolean)) errors.push('Выберите хотя бы один раздел сметы.');
    return { ok: errors.length === 0, errors };
  }

  function statusLabel(status) {
    const statuses = ROOT.QuoteModel && ROOT.QuoteModel.QUOTE_STATUSES ? ROOT.QuoteModel.QUOTE_STATUSES : [];
    const row = statuses.find(item => item.id === status);
    return row ? row.name : status || 'Черновик';
  }

  function formatMoney(value) { return `${Math.round(Number(value || 0)).toLocaleString('ru-RU')} ₽`; }
  function formatWeight(value) { return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`; }
  function formatPower(value) { return `${(Number(value || 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кВт`; }
  function formatNumber(value, digits) { return Number(value || 0).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
  function toast(message) { if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message); else if (GLOBAL.showToast) GLOBAL.showToast(message); }

  ROOT.QuoteWizard = { WIZARD_STEPS, createDraft, getEnabledSteps, validateStep, renderWizardMap, readFormQuote };
})();
