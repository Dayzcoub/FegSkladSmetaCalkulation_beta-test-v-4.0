(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const WIZARD_STEPS = Object.freeze([
    { id: 'client', title: 'Клиент и проект', required: true },
    { id: 'venue', title: 'Площадка и контакты', required: true },
    { id: 'scope', title: 'Состав сметы', required: true },
    { id: 'stage', title: 'Сцена', scope: 'stage' },
    { id: 'truss', title: 'Фермы', scope: 'truss' },
    { id: 'led', title: 'LED экран', scope: 'led' },
    { id: 'equipment', title: 'Звук, свет, услуги', scope: 'equipment' },
    { id: 'transport', title: 'Транспорт', required: true },
    { id: 'crew', title: 'Команда проекта', required: true },
    { id: 'summary', title: 'Сводка и документы', required: true }
  ]);

  function model() { return ROOT.QuoteModel || null; }
  function storage() { return ROOT.QuoteDraftStorage || null; }
  function binder() { return ROOT.QuoteSectionBinder || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }
  function pickListBuilder() { return ROOT.WarehousePickListBuilder || null; }
  function readinessChecklist() { return ROOT.ProjectReadinessChecklist || null; }

  // ─── Кеш тяжёлых вычислений ─────────────────────────────────────────────────
  // buildFinalSummary и buildPickLists вызываются только на шаге summary.
  // Кешируем на основе хеша ключевых полей q — не пересчитываем при
  // изменении несвязанных данных.

  const _wizardCache = { summary: null, pickLists: null, qHash: null };

  function _quickHash(q) {
    try {
      const s = q.sections || {};
      const keys = Object.keys(s).filter(k => s[k] && s[k].items && s[k].items.length);
      return keys.join(',') + '|' +
        (q.crewAssignments || []).length + '|' +
        (q.transport && q.transport.mode || '') + '|' +
        (q.status || '');
    } catch (e) { return String(Date.now()); }
  }

  function getCachedFinalSummary(q) {
    if (!summaryBuilder()) return null;
    const hash = _quickHash(q);
    if (_wizardCache.qHash === hash && _wizardCache.summary) return _wizardCache.summary;
    _wizardCache.summary = summaryBuilder().buildFinalSummary(q);
    _wizardCache.pickLists = pickListBuilder() ? pickListBuilder().buildPickLists(q) : null;
    _wizardCache.qHash = hash;
    return _wizardCache.summary;
  }

  function getCachedPickLists(q) {
    getCachedFinalSummary(q); // заполняет кеш если не заполнен
    return _wizardCache.pickLists;
  }
  function documentBuilder() { return ROOT.QuoteDocumentBuilder || null; }
  function currentRoleIsAdmin() {
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer' };
    const role = auth && auth.role || 'viewer';
    return ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) === 'admin' : role === 'admin';
  }

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

  // ─── Helpers для построения HTML по зонам ──────────────────────────────────

  function renderKpiHtml(q) {
    return `<div class="v4-summary-grid v4-summary-grid--compact">
      <div class="v4-mini"><b>${escapeHtml(statusLabel(q.status))}</b><span>Статус</span></div>
      <div class="v4-mini"><b>${formatMoney(q.totals && q.totals.transport)}</b><span>Транспорт</span></div>
      <div class="v4-mini"><b>${formatWeight(q.totals && q.totals.weightKg)}</b><span>Вес</span></div>
      <div class="v4-mini"><b>${formatPower(q.totals && q.totals.powerW)}</b><span>Мощность</span></div>
      <div class="v4-mini"><b>${formatPower(q.totals && q.totals.startupPowerW)}</b><span>Пусковая мощность</span></div>
    </div>`;
  }

  // Частичное обновление — только KPI и шаги, без ре-рендера формы
  function updateWizardZones(root, q, steps, activeStep) {
    const stepsEl = root.querySelector('[data-wizard-zone="steps"]');
    if (stepsEl) stepsEl.innerHTML = renderWizardSteps(steps, activeStep, q);
    const kpiEl = root.querySelector('[data-wizard-zone="kpi"]');
    if (kpiEl) kpiEl.innerHTML = renderKpiHtml(q);
    const validation = model() ? model().validateQuote(q) : { ok: true, errors: [] };
    const noteEl = root.querySelector('[data-wizard-zone="note"]');
    if (noteEl) noteEl.textContent = validation.ok
      ? 'Черновик проходит базовую проверку обязательных шагов.'
      : 'Нужно дозаполнить: ' + validation.errors.map(row => row.message).join(' · ');
  }

  // Полный ре-рендер — только при смене шага или первой загрузке
  function renderWizardMap(target, draft) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const loaded = draft || (storage() && storage().loadActiveDraft && storage().loadActiveDraft()) || { scope: { stage: true, truss: true, led: true, sound: true } };
    const q = prepareDraft(loaded);
    const steps = getEnabledSteps(q);
    const activeStep = getActiveStep(q, steps);
    const validation = model() ? model().validateQuote(q) : { ok: true, errors: [] };
    const activeValidation = validateStep(activeStep, q);

    // Если шаг не изменился — делаем только частичное обновление
    const currentStep = root.querySelector('[data-quote-form]');
    if (currentStep && currentStep.dataset.quoteActiveStep === activeStep) {
      updateWizardZones(root, q, steps, activeStep);
      return root;
    }

    // Полный ре-рендер при смене шага
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
          <div class="v4-quote-overview">
            <div class="v4-quote-overview-main" data-wizard-zone="steps">
              ${renderWizardSteps(steps, activeStep, q)}
            </div>
            <aside class="v4-quote-overview-side" data-wizard-zone="kpi">
              ${renderKpiHtml(q)}
            </aside>
          </div>
          ${renderBoundSectionSummary(q)}
          <form class="v4-quote-form" data-quote-form data-quote-active-step="${escapeAttr(activeStep)}">
            <input type="hidden" name="wizard.activeStep" value="${escapeAttr(activeStep)}">
            ${renderStepErrors(activeValidation, activeStep, steps)}
            ${renderQuoteForm(q, activeStep)}
            ${renderWizardNav(q, activeStep, steps)}
          </form>
        </div>
        <div class="v4-note" data-wizard-zone="note">${validation.ok ? 'Черновик проходит базовую проверку обязательных шагов.' : `Нужно дозаполнить: ${escapeHtml(validation.errors.map(row => row.message).join(' · '))}`}</div>
      </div>`;
    bindWizard(root, q);
    return root;
  }

  function renderWizardSteps(steps, activeStep, q) {
    return `<ol class="v4-steps">${steps.map((step, index) => {
      const isActive = step.id === activeStep;
      const v = validateStep(step.id, q);
      let cls, badge;
      if (isActive) {
        cls = 'v4-step-active';
        badge = 'текущий шаг';
      } else if (v.ok) {
        cls = 'v4-step-ok';
        badge = '✓';
      } else {
        cls = '';
        badge = v.errors && v.errors.length ? v.errors.length + ' ош.' : '';
      }
      return `<li class="${cls}"><button type="button" data-quote-step-target="${escapeAttr(step.id)}"><span>${index + 1}</span><b>${escapeHtml(step.title)}</b><small>${escapeHtml(badge)}</small></button></li>`;
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
    const stepAction = getStepPrimaryAction(activeStep);
    return `<div class="v4-wizard-nav">
      <div class="v4-wizard-nav-group">
        <button type="button" class="btn-secondary" data-quote-prev ${prev ? '' : 'disabled'}>← Назад</button>
      </div>
      <div class="v4-wizard-nav-group v4-wizard-nav-group--end">
        ${stepAction ? `<button type="button" class="btn-secondary" ${stepAction.attr}>${escapeHtml(stepAction.label)}</button>` : `<button type="button" class="btn-secondary" data-quote-save>Сохранить шаг</button>`}
        ${next ? `<button type="button" class="btn-primary" data-quote-next>Далее: ${escapeHtml(next.title)} →</button>` : `<button type="button" class="btn-primary" data-quote-next ${validation.ok ? '' : ''}>Готово к сводке</button>`}
      </div>
    </div>`;
  }

  function getStepPrimaryAction(stepId) {
    if (stepId === 'stage') return { attr: 'data-quote-bind-stage', label: 'Добавить сцену в смету' };
    if (stepId === 'truss') return { attr: 'data-quote-bind-truss', label: 'Добавить фермы в смету' };
    if (stepId === 'led') return { attr: 'data-quote-bind-led', label: 'Добавить LED в смету' };
    if (stepId === 'equipment') return { attr: 'data-quote-bind-equipment', label: 'Добавить оборудование в смету' };
    return null;
  }

  function renderStepErrors(validation, stepId, steps) {
    const safeSteps = Array.isArray(steps) && steps.length ? steps : WIZARD_STEPS;
    const index = Math.max(0, safeSteps.findIndex(step => step.id === stepId));
    const total = safeSteps.length || 1;
    const title = getStepTitle(stepId, safeSteps);
    const meta = `<div class="v4-step-check-meta"><span>Шаг ${escapeHtml(String(index + 1))} из ${escapeHtml(String(total))}</span><b>${escapeHtml(title)}</b></div>`;
    const errors = validation && Array.isArray(validation.errors) ? validation.errors : [];
    if (!errors.length) return `<div class="v4-note v4-step-help v4-step-check-card">${meta}<span>Шаг заполнен корректно, можно двигаться дальше.</span></div>`;
    return `<div class="v4-note v4-step-error v4-step-check-card">${meta}<span><b>Проверь шаг:</b> ${errors.map(escapeHtml).join(' · ')}</span></div>`;
  }

  function fieldErrorClass(condition) {
    return condition ? ' v4-field-error' : '';
  }

  function renderQuoteForm(q, activeStep) {
    if (activeStep === 'client') return renderClientStep(q);
    if (activeStep === 'venue') return renderVenueStep(q);
    if (activeStep === 'transport') return renderTransportStep(q);
    if (activeStep === 'scope') return renderScopeStep(q);
    if (activeStep === 'stage') return renderStructureSectionPanel('stage', q.sections && q.sections.stage);
    if (activeStep === 'truss') return renderStructureSectionPanel('truss', q.sections && q.sections.truss);
    if (activeStep === 'led') return renderLedQuotePanel(q);
    if (activeStep === 'equipment') return renderEquipmentQuotePanel(q);
    if (activeStep === 'crew') return renderProjectCrewStep(q);
    if (activeStep === 'summary') return renderFinalSummaryPanel(q);
    return renderScopeStep(q);
  }

  function clientStorage() { return ROOT.ClientsStorage || null; }

  function listQuoteClients() {
    try {
      const svc = clientStorage();
      const list = svc && svc.getClients ? svc.getClients() : [];
      return Array.isArray(list) ? list.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru')) : [];
    } catch (_) { return []; }
  }

  function clientDisplayName(client) {
    if (!client) return '';
    return client.name || client.company || client.organization || client.title || client.id || '';
  }

  function renderQuoteClientOptions(selectedId, selectedName) {
    const clients = listQuoteClients();
    const selected = String(selectedId || '');
    const options = ['<option value="">Выбрать из базы клиентов…</option>'];
    clients.forEach(client => {
      const id = String(client.id || client.name || '');
      const label = [clientDisplayName(client), client.phone || '', client.email || ''].filter(Boolean).join(' · ');
      options.push(`<option value="${escapeAttr(id)}" data-name="${escapeAttr(clientDisplayName(client))}" data-phone="${escapeAttr(client.phone || '')}" data-email="${escapeAttr(client.email || '')}" ${id === selected || (!selected && selectedName && clientDisplayName(client) === selectedName) ? 'selected' : ''}>${escapeHtml(label)}</option>`);
    });
    return options.join('');
  }

  function renderClientCreateModal() {
    return `<dialog class="v4-quote-client-dialog" data-quote-client-modal>
      <form method="dialog" class="v4-quote-client-modal-card" data-quote-client-modal-form>
        <div class="v4-card-head v4-card-head--compact">
          <div><div class="v4-kicker">База клиентов</div><h4>Новый клиент</h4><p class="v4-muted">Карточка сохранится в базу клиентов и сразу подставится в текущую смету.</p></div>
          <button type="button" class="btn-secondary btn-compact" data-quote-client-cancel>Закрыть</button>
        </div>
        <div class="v4-grid-2">
          <label class="v4-field">Название / организация<input data-quote-client-new-field="name" placeholder="Название клиента"></label>
          <label class="v4-field">Контактное лицо<input data-quote-client-new-field="contact" placeholder="Имя контакта"></label>
          <label class="v4-field">Телефон<input data-quote-client-new-field="phone" placeholder="+7..."></label>
          <label class="v4-field">Email<input data-quote-client-new-field="email" type="email" placeholder="mail@example.com"></label>
          <label class="v4-field v4-grid-span-2">Адрес<input data-quote-client-new-field="address" placeholder="Юридический / рабочий адрес"></label>
          <label class="v4-field v4-grid-span-2">Комментарий<textarea data-quote-client-new-field="note" rows="3" placeholder="Особенности клиента, реквизиты, заметки"></textarea></label>
        </div>
        <div class="v4-actions v4-actions--end"><button type="button" class="btn-primary" data-quote-client-save>Сохранить и выбрать</button></div>
      </form>
    </dialog>`;
  }

  function renderClientStep(q) {
    const client = q.client || {};
    const project = q.project || {};
    return `<div class="v4-note">Клиента можно выбрать из базы. Если клиента ещё нет — создай карточку здесь же, она сохранится в базу клиентов и сразу подставится в смету.</div>
    <div class="v4-grid-3 v4-client-project-grid">
      <label class="v4-field">Клиент из базы<select name="client.id" data-quote-client-select>${renderQuoteClientOptions(client.id, client.name)}</select></label>
      <label class="v4-field"><span style="opacity:0">-</span><button type="button" class="btn-secondary" style="width:100%;height:34px" data-quote-client-open-create>+ новый клиент</button></label>
      <label class="v4-field${fieldErrorClass(!client.name)}">Название клиента<input name="client.name" data-quote-client-field="name" value="${escapeAttr(client.name)}" placeholder="Название клиента"></label>
      <label class="v4-field${fieldErrorClass(!project.name)}">Проект<input name="project.name" value="${escapeAttr(project.name)}" placeholder="Название проекта"></label>
      <label class="v4-field">Статус<select name="status">${(ROOT.QuoteModel ? ROOT.QuoteModel.QUOTE_STATUSES : [{id:'draft',name:'Черновик'}]).map(s => `<option value="${escapeAttr(s.id)}" ${s.id === q.status ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></label>
      <label class="v4-field">Телефон клиента<input name="client.phone" data-quote-client-field="phone" value="${escapeAttr(client.phone)}" placeholder="+7..."></label>
      <label class="v4-field">Email клиента<input name="client.email" data-quote-client-field="email" type="email" value="${escapeAttr(client.email)}" placeholder="mail@example.com"></label>
      <label class="v4-field">Комментарий<input name="project.comment" value="${escapeAttr(project.comment)}" placeholder="Внутренний комментарий"></label>
    </div>${renderClientCreateModal()}`;
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
    return `<div class="v4-note">Выбери разделы, по которым мастер откроет следующие шаги. Транспорт остаётся обязательным разделом и теперь заполняется ближе к финалу — после сборки сметы и перед командой проекта.</div>
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
      truss: 'Мост готов: сюда подключается текущий v4-блочный конструктор ферм и его BOM.',
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

  function renderStageSubrentBlock(input) {
    const src = input || {};
    const enabled = src.subrentEnabled === true || src.subrentEnabled === 'true';
    const data = src.subrent || {};
    return `<div class="v4-linked-subrent-override ${enabled ? 'is-enabled' : ''}" data-quote-stage-subrent-block>
      <label class="v4-equipment-editor-check"><input type="checkbox" data-quote-stage-subrent-enabled ${enabled ? 'checked' : ''}> Сцена в субаренду</label>
      <div class="v4-subrent-fields" data-quote-stage-subrent-fields style="${enabled ? '' : 'display:none'}">
        <div class="v4-subrent-row-5">
          <label class="v4-field">Ширина, м<input data-quote-stage-subrent-field="widthM" type="number" min="0" step="0.1" value="${escapeAttr(data.widthM || src.widthM || '')}" placeholder="7.2"></label>
          <label class="v4-field">Глубина, м<input data-quote-stage-subrent-field="depthM" type="number" min="0" step="0.1" value="${escapeAttr(data.depthM || src.depthM || '')}" placeholder="4.8"></label>
          <label class="v4-field">Высота, м<input data-quote-stage-subrent-field="heightM" type="number" min="0" step="0.1" value="${escapeAttr(data.heightM || src.stageHeightM || '')}" placeholder="0.4"></label>
          <label class="v4-field">Цена субаренды<input data-quote-stage-subrent-field="subrentPrice" type="number" min="0" step="100" value="${escapeAttr(data.subrentPrice || data.price || '')}" placeholder="₽"></label>
          <label class="v4-field">Цена клиенту<input data-quote-stage-subrent-field="clientPrice" type="number" min="0" step="100" value="${escapeAttr(data.clientPrice || '')}" placeholder="если пусто — субаренда"></label>
        </div>
        <div class="v4-subrent-row-supplier">
          <label class="v4-field">У кого берём<select data-quote-stage-subrent-supplier-id>${renderSubrentorSelectOptions(data.supplierId || data.supplier_id || '', data.supplierName || '')}</select></label>
          <button type="button" class="btn-secondary v4-subrent-add-btn" data-quote-stage-add-subrentor>+ добавить</button>
          <input type="hidden" data-quote-stage-subrent-field="supplierId" value="${escapeAttr(data.supplierId || data.supplier_id || '')}">
          <input type="hidden" data-quote-stage-subrent-field="supplierName" value="${escapeAttr(data.supplierName || '')}">
          <label class="v4-field">Комментарий<input data-quote-stage-subrent-field="note" value="${escapeAttr(data.note || '')}" placeholder="условия / состав"></label>
        </div>
      </div>
      <div class="v4-note v4-note--compact">Если чекбокс включён, в смету идёт только заполненная субарендная строка сцены. Расчёт конструктора и его BOM в смету не добавляются.</div>
    </div>`;
  }

  function renderLedSubrentBlock(input) {
    const src = input || {};
    const enabled = src.subrentEnabled === true || src.subrentEnabled === 'true';
    const data = src.subrent || {};
    return `<div class="v4-linked-subrent-override ${enabled ? 'is-enabled' : ''}" data-quote-led-subrent-block>
      <label class="v4-equipment-editor-check"><input type="checkbox" data-quote-led-subrent-enabled ${enabled ? 'checked' : ''}> LED экран в субаренду</label>
      <div class="v4-subrent-fields" data-quote-led-subrent-fields style="${enabled ? '' : 'display:none'}">
        <div class="v4-subrent-row-5">
          <label class="v4-field">Ширина, м<input data-quote-led-subrent-field="widthM" type="number" min="0" step="0.1" value="${escapeAttr(data.widthM || src.widthM || '')}" placeholder="4.48"></label>
          <label class="v4-field">Высота, м<input data-quote-led-subrent-field="heightM" type="number" min="0" step="0.1" value="${escapeAttr(data.heightM || src.heightM || '')}" placeholder="2.56"></label>
          <label class="v4-field">Шаг пикселя<input data-quote-led-subrent-field="pitch" value="${escapeAttr(data.pitch || src.pitch || src.pitchId || 'P4')}" placeholder="P4 / P3.91"></label>
          <label class="v4-field">Цена субаренды<input data-quote-led-subrent-field="subrentPrice" type="number" min="0" step="100" value="${escapeAttr(data.subrentPrice || data.price || '')}" placeholder="₽"></label>
          <label class="v4-field">Цена клиенту<input data-quote-led-subrent-field="clientPrice" type="number" min="0" step="100" value="${escapeAttr(data.clientPrice || '')}" placeholder="если пусто — субаренда"></label>
        </div>
        <div class="v4-subrent-row-supplier">
          <label class="v4-field">У кого берём<select data-quote-led-subrent-supplier-id>${renderSubrentorSelectOptions(data.supplierId || data.supplier_id || '', data.supplierName || '')}</select></label>
          <button type="button" class="btn-secondary v4-subrent-add-btn" data-quote-led-add-subrentor>+ добавить</button>
          <input type="hidden" data-quote-led-subrent-field="supplierId" value="${escapeAttr(data.supplierId || data.supplier_id || '')}">
          <input type="hidden" data-quote-led-subrent-field="supplierName" value="${escapeAttr(data.supplierName || '')}">
          <label class="v4-field">Комментарий<input data-quote-led-subrent-field="note" value="${escapeAttr(data.note || '')}" placeholder="условия / комплект"></label>
        </div>
      </div>
      <div class="v4-note v4-note--compact">Если чекбокс включён, в смету идёт только заполненная субарендная строка LED. Кабинеты, ноги, Hanging Bar, кабели и веса конструктора не добавляются.</div>
    </div>`;
  }

  function buildStageSubrentSection(input, overrides) {
    const src = input || {};
    const data = src.subrent || {};
    const widthM = Number(data.widthM || src.widthM || 0);
    const depthM = Number(data.depthM || src.depthM || 0);
    const heightM = Number(data.heightM || src.heightM || 0);
    const subrentPrice = Number(data.subrentPrice || data.price || 0);
    const clientPrice = Number(data.clientPrice || 0) || subrentPrice;
    const margin = Math.max(0, clientPrice - subrentPrice);
    const supplierId = data.supplierId || data.supplier_id || '';
    const supplierRecord = supplierId && ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(supplierId) : null;
    const supplierName = data.supplierName || (supplierRecord && supplierRecord.name) || '';
    const name = `Сценическая конструкция ${widthM || '—'}×${depthM || '—'}×${heightM || '—'} м`;
    return Object.assign({
      type: 'stage', sectionKey: 'stage', status: 'configured', source: 'quote-stage-subrent-override', title: 'Сцена · субаренда',
      summary: `${name}${supplierName ? ' · ' + supplierName : ''}`,
      input: Object.assign({}, src, { subrentEnabled: true, subrent: { widthM, depthM, heightM, supplierId, supplierName, price: subrentPrice, subrentPrice, clientPrice, margin, note: data.note || '' } }),
      result: { subrentOverride: true, widthM, depthM, heightM },
      bomRows: [{ id: 'stage-subrent-override', code: 'STAGE-SUBRENT', name, qty: 1, unit: 'комплект', sourceType: 'subrent', supplierId, supplierName, subrentPrice, clientPrice, rentalPrice: clientPrice, margin, stagePart: 'subrent_override', note: data.note || '' }],
      rental: clientPrice, weightKg: 0, powerW: 0, subrentOverride: true, updatedAt: new Date().toISOString()
    }, overrides || {});
  }

  function buildLedSubrentSection(input, overrides) {
    const src = input || {};
    const data = src.subrent || {};
    const widthM = Number(data.widthM || src.widthM || 0);
    const heightM = Number(data.heightM || src.heightM || 0);
    const pitch = data.pitch || src.pitch || src.pitchId || 'P4';
    const subrentPrice = Number(data.subrentPrice || data.price || 0);
    const clientPrice = Number(data.clientPrice || 0) || subrentPrice;
    const margin = Math.max(0, clientPrice - subrentPrice);
    const supplierId = data.supplierId || data.supplier_id || '';
    const supplierRecord = supplierId && ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(supplierId) : null;
    const supplierName = data.supplierName || (supplierRecord && supplierRecord.name) || '';
    const name = `LED - Экран ${widthM || '—'}×${heightM || '—'} м`;
    const note = [data.note || '', pitch ? `Шаг пикселя ${pitch}` : ''].filter(Boolean).join(' · ');
    return Object.assign({
      type: 'led', sectionKey: 'led', status: 'configured', source: 'quote-led-subrent-override', title: 'LED экран · субаренда',
      summary: `${name}${supplierName ? ' · ' + supplierName : ''}${pitch ? ' · ' + pitch : ''}`,
      input: Object.assign({}, src, { subrentEnabled: true, subrent: { widthM, heightM, pitch, supplierId, supplierName, price: subrentPrice, subrentPrice, clientPrice, margin, note: data.note || '' } }),
      result: { subrentOverride: true, actualWidthM: widthM, actualHeightM: heightM, pitchName: pitch },
      bomRows: [{ id: 'led-subrent-override', code: 'LED-SUBRENT', name, qty: 1, unit: 'комплект', sourceType: 'subrent', supplierId, supplierName, subrentPrice, clientPrice, rentalPrice: clientPrice, margin, ledPart: 'subrent_override', note }],
      rental: clientPrice, weightKg: 0, powerW: 0, startupPowerW: 0, subrentOverride: true, updatedAt: new Date().toISOString()
    }, overrides || {});
  }
  function renderStructureSectionPanel(key, section) {
    const titles = { stage: 'Сцена в смете', truss: 'Фермы в смете' };
    const state = binder() ? binder().getSectionState(section) : { label: 'ожидает', css: 'v4-step-warn' };
    const configured = section && section.status === 'configured';
    const subtitle = key === 'stage'
      ? 'Собери сцену, проверь итог и затем добавь раздел в смету кнопкой внизу.'
      : 'Собери схему, проверь нагрузки и затем добавь фермы в смету кнопкой внизу.';
    const input = key === 'stage'
      ? (binder() && binder().getStageInputFromQuote ? binder().getStageInputFromQuote({ sections: { stage: section } }) : { widthModules: 4, depthModules: 3 })
      : (binder() && binder().getTrussInputFromQuote ? binder().getTrussInputFromQuote({ sections: { truss: section } }) : { items: [], connectionCount: 0 });
    return `<div class="v4-card v4-section-card v4-quote-structure-panel" data-quote-${escapeAttr(key)}-panel>
      <div class="v4-quote-step-intro">
        <p class="v4-muted">${escapeHtml(subtitle)}</p>
      </div>
      ${key === 'stage' ? renderStageSubrentBlock(input) : ''}
      <div data-quote-structure-visual="${escapeAttr(key)}" data-quote-structure-input="${escapeAttr(JSON.stringify(input || {}))}"></div>
      <div class="v4-note v4-note--compact">Статус: ${escapeHtml(state.label)}${configured && section.updatedAt ? ` · ${escapeHtml(new Date(section.updatedAt).toLocaleString('ru-RU'))}` : ''}</div>
      ${configured ? `<div class="v4-summary-grid">
        <div class="v4-mini"><b>${formatWeight(section.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatMoney(section.rental)}</b><span>Раздел</span></div>
        <div class="v4-mini"><b>${escapeHtml(section.bomRows && section.bomRows.length || 0)}</b><span>BOM строк</span></div>
      </div><p class="v4-muted">${escapeHtml(section.summary || '')}</p>${renderBomRows(section.bomRows)}` : `<div class="v4-note">${escapeHtml(titles[key] || key)} пока не добавлены в смету. После проверки нажми кнопку внизу.</div>`}
    </div>`;
  }

  function resolveLedMountMode(input) {
    const src = input || {};
    const calc = ROOT.LedCalculator;
    const flags = calc && calc.getMountFlags ? calc.getMountFlags(src) : { standing: src.mountStanding !== false, hanging: src.mountHanging === true };
    if (flags.standing && flags.hanging) return 'stand+hanging';
    if (flags.hanging) return 'hanging';
    if (flags.standing) return 'standing';
    return 'none';
  }

  function renderLedMountModeOptions(selectedMode) {
    const selected = selectedMode || 'standing';
    const options = [
      { id: 'standing', label: 'Стоим · ноги, печеньки и болты' },
      { id: 'hanging', label: 'Висим · Hanging Bar + крепёж' },
      { id: 'stand+hanging', label: 'Стоим + висим' },
      { id: 'none', label: 'Без ног и подвеса' }
    ];
    return options.map(item => `<option value="${escapeAttr(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
  }

  function renderLedQuotePanel(q) {
    if (!ROOT.LedCalculator || !binder()) {
      return renderPlaceholderPanel('led', q.sections && q.sections.led);
    }
    const input = binder().getLedInputFromQuote(q);
    const section = q.sections && q.sections.led && q.sections.led.status === 'configured' ? q.sections.led : binder().buildLedSection(input);
    const result = section.result || {};
    const constructorSeed = Object.assign({}, input || {}, section.input || {});
    return `<div class="v4-card v4-section-card" data-quote-led-panel>
      <div class="v4-quote-step-intro">
        <p class="v4-muted">Собери LED-конструкции, проверь итог и затем добавь экран в смету кнопкой внизу.</p>
      </div>
      ${renderLedSubrentBlock(constructorSeed || input || {})}
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(Number(result.actualWidthM || section.factWidthM || 0).toFixed(2))}×${escapeHtml(Number(result.actualHeightM || section.factHeightM || 0).toFixed(2))} м</b><span>Факт. габарит</span></div>
        <div class="v4-mini"><b>${result.constructionCount || (Array.isArray(result.constructions) ? result.constructions.length : 0) || 1}</b><span>LED-конструкций</span></div>
        <div class="v4-mini"><b>${result.cabinetCount || section.cabinetCount || 0}</b><span>Кабинеты</span></div>
        <div class="v4-mini"><b>${formatWeight(section.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatPower(section.powerW)}</b><span>Рабочая мощность</span></div>
        <div class="v4-mini"><b>${formatPower(section.startupPowerW || result.totalStartupPowerW || 0)}</b><span>Пусковая мощность</span></div>
      </div>
      <div class="v4-note">Текущая схема конструктора попадёт в раздел LED после нажатия кнопки «Добавить LED в смету» внизу.</div>
      <div data-quote-led-constructor data-quote-led-input="${escapeAttr(JSON.stringify(constructorSeed || {}))}"></div>
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
    const selected = buildEquipmentSelectionMap(input.items);
    const selectedRows = Array.isArray(preview.items) ? preview.items : [];
    return `<div class="v4-card v4-section-card" data-quote-equipment-panel>

      ${renderEquipmentScopeBadges(q.scope || {})}
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(selectedRows.length || 0)}</b><span>позиций</span></div>
        <div class="v4-mini"><b>${formatWeight(preview.weightKg)}</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatPower(preview.powerW)}</b><span>Мощность</span></div>
        <div class="v4-mini"><b>${escapeHtml(preview.deficitCount || 0)}</b><span>дефицитных позиций</span></div>
      </div>
      ${renderEquipmentSelectedSummary(selectedRows)}
      ${renderEquipmentPickerGroups(availableItems, selected)}
      <div class="v4-kicker" style="padding:8px 0 4px">Ручные / субарендные позиции</div>
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
    const ownRows = safeRows.filter(row => (row.sourceType || 'own') === 'own' && row.itemId);
    const deficitRows = safeRows.filter(row => Number(row.deficitQty || 0) > 0);
    const subrentRows = safeRows.filter(row => row.sourceType === 'subrent' || row.sourceType === 'subrent_needed' || Number(row.subrentQty || 0) > 0);
    const manualRows = safeRows.filter(row => row.sourceType === 'manual' || !row.itemId);
    const ownOkRows = ownRows.filter(row => Number(row.deficitQty || 0) <= 0);
    const totalDeficitQty = deficitRows.reduce((sum, row) => sum + Number(row.deficitQty || 0), 0);
    const totalSubrentQty = subrentRows.reduce((sum, row) => sum + Number(row.subrentQty || row.qty || 0), 0);
    return `<div class="v4-equipment-basket v4-equipment-basket--availability">
      <div class="v4-mini v4-availability-mini is-ok"><b>${escapeHtml(String(ownOkRows.length))}</b><span>склад ок</span></div>
      <div class="v4-mini v4-availability-mini ${deficitRows.length ? 'is-deficit' : 'is-muted'}"><b>${escapeHtml(String(deficitRows.length))}</b><span>дефицит${totalDeficitQty ? ' · ' + escapeHtml(formatNumber(totalDeficitQty, 0)) + ' шт' : ''}</span></div>
      <div class="v4-mini v4-availability-mini ${subrentRows.length ? 'is-subrent' : 'is-muted'}"><b>${escapeHtml(String(subrentRows.length))}</b><span>субаренда${totalSubrentQty ? ' · ' + escapeHtml(formatNumber(totalSubrentQty, 0)) + ' шт' : ''}</span></div>
      <div class="v4-mini v4-availability-mini ${manualRows.length ? 'is-manual' : 'is-muted'}"><b>${escapeHtml(String(manualRows.length))}</b><span>ручные</span></div>
    </div>`;
  }

  function renderEquipmentPickerGroups(items, selected) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '<div class="v4-note">Для выбранных чекбоксов пока нет позиций в базе оборудования.</div>';
    const groups = groupEquipmentItems(safeItems);
    return Object.keys(groups).map(category => renderEquipmentSmartGroup(category, groups[category], selected)).join('');
  }

  function renderEquipmentSmartGroup(category, rows, selected) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const selectedRows = safeRows.filter(item => selected && selected.has(item.id));
    const datalistId = `quote-equipment-list-${safeId(category)}`;
    const pickerRows = selectedRows.concat([null]);
    return `<details class="v4-equipment-group v4-equipment-group--smart" open data-quote-equipment-smart-group="${escapeAttr(category)}">
      <summary><b>${escapeHtml(categoryLabel(category))}</b><span>${escapeHtml(String(selectedRows.length))} выбрано · ${escapeHtml(String(safeRows.length))} в базе</span></summary>
      <datalist id="${escapeAttr(datalistId)}">${safeRows.map(item => `<option value="${escapeAttr(equipmentOptionLabel(item))}">${escapeHtml(item.name)} · ${escapeHtml(item.code || item.id)}</option>`).join('')}</datalist>
      <div class="v4-equipment-smart-list">
        ${pickerRows.map((item, index) => renderEquipmentSmartRow(category, item, selected, datalistId, index)).join('')}
      </div>
      <div class="v4-note v4-note--compact">Начни вводить название или код позиции. Если складского остатка не хватает, после подтверждения появится предупреждение и поля добора в субаренду; клиентская смета останется одной строкой из нашей базы.</div>
    </details>`;
  }

  function buildEquipmentSelectionMap(items) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(row => {
      const itemId = String(row && row.itemId || '').trim();
      if (!itemId) return;
      const entry = map.get(itemId) || { own:null, subrent:[], rows:[] };
      const sourceType = String(row.sourceType || 'own');
      entry.rows.push(row);
      if (sourceType === 'subrent' || Number(row.subrentQty || 0) > 0) entry.subrent.push(row);
      else if (!entry.own) entry.own = row;
      map.set(itemId, entry);
    });
    return map;
  }

  function getSubrentorRows() {
    const dir = ROOT.SupplierDirectory;
    if (!dir) return [];
    if (dir.listSubrentors) return dir.listSubrentors({ onlyActive: true });
    if (dir.listSuppliers) return dir.listSuppliers({ type: 'subrent', onlyActive: true });
    return [];
  }

  function renderSubrentorSelectOptions(selectedId, selectedName) {
    const rows = getSubrentorRows();
    const selected = String(selectedId || '').trim();
    const selectedLabel = String(selectedName || '').trim();
    const known = selected && rows.some(row => row.id === selected);
    const legacy = !known && selectedLabel ? `<option value="${escapeAttr(selected || selectedLabel)}" selected>${escapeHtml(selectedLabel)} · legacy</option>` : '';
    return `<option value="">Выбрать субарендатора</option>${legacy}${rows.map(row => {
      const label = ROOT.SupplierDirectory && ROOT.SupplierDirectory.formatSupplierLabel ? ROOT.SupplierDirectory.formatSupplierLabel(row) : row.name;
      return `<option value="${escapeAttr(row.id)}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('')}`;
  }

  function renderEquipmentSmartRow(category, item, selected, datalistId, index) {
    const selection = item && selected ? selected.get(item.id) || {} : {};
    const subrentLine = selection.subrent && selection.subrent.length ? selection.subrent[0] : {};
    const ownLine = selection.own || (selection.rows || []).find(row => String(row.sourceType || 'own') !== 'subrent') || {};
    const isBlank = !item;
    const ownQty = Number(ownLine.qty || 0);
    const linkedSubrentQty = Number(subrentLine.qty || ownLine.subrentQty || 0);
    const splitTotalQty = ownQty + linkedSubrentQty;
    const requestedQty = isBlank ? 1 : Math.max(1, Number(ownLine.originalRequestedQty || subrentLine.originalRequestedQty || splitTotalQty || ownLine.requestedQty || subrentLine.requestedQty || ownQty || linkedSubrentQty || 1));
    const availableQty = item ? Math.max(0, Number(item.availableQty || item.ownAvailableQty || 0) || 0) : 0;
    const deficitQty = item ? Math.max(0, requestedQty - availableQty) : 0;
    const ownPartQty = item ? Math.min(requestedQty, availableQty) : 0;
    const requiredSubrentQty = deficitQty || linkedSubrentQty;
    const linkedSupplierId = subrentLine.supplierId || ownLine.supplierId || '';
    const linkedSupplierName = subrentLine.supplierName || ownLine.supplierName || '';
    const linkedSubrentPrice = subrentLine.subrentPrice || ownLine.subrentPrice || 0;
    const linkedClientPrice = subrentLine.clientPrice || ownLine.clientPrice || (item && item.rentalPrice) || 0;
    const value = item ? equipmentOptionLabel(item) : '';
    const availability = buildEquipmentAvailabilityMeta(item ? Object.assign({}, item, { qty: requestedQty, sourceType: 'own', availableQty, deficitQty }) : null, { blank: isBlank, mode: 'stock' });
    const subrentBlock = item && requiredSubrentQty > 0 ? `<div class="v4-equipment-deficit-subrent v4-equipment-linked-subrent" data-quote-equipment-deficit-subrent data-quote-equipment-linked-subrent>
        <div class="v4-equipment-linked-subrent-top">
          <div class="v4-equipment-linked-subrent-title"><b>Не хватает на складе</b><span>свой склад ${escapeHtml(formatNumber(ownPartQty, 0))} ${escapeHtml(item.unit || 'шт')} · добрать ${escapeHtml(formatNumber(requiredSubrentQty, 0))} ${escapeHtml(item.unit || 'шт')}</span></div>
          <label class="v4-field">Добрать, шт<input class="v4-mini-input" data-quote-equipment-linked-subrent-qty type="number" min="0" step="1" value="${escapeAttr(requiredSubrentQty)}" readonly></label>
          <label class="v4-field v4-equipment-subrentor-select">У кого берём<select class="v4-mini-input" data-quote-equipment-linked-subrent-supplier-id>${renderSubrentorSelectOptions(linkedSupplierId, linkedSupplierName)}</select></label>
          <button type="button" class="btn-secondary btn-compact v4-equipment-subrentor-add" data-quote-equipment-add-subrentor>+ добавить</button>
        </div>
        <div class="v4-equipment-linked-subrent-prices">
          <label class="v4-field">Субаренда/ед.<input class="v4-mini-input" data-quote-equipment-linked-subrent-price type="number" min="0" step="100" value="${escapeAttr(linkedSubrentPrice || '')}" placeholder="₽"></label>
          <label class="v4-field">Клиент/ед.<input class="v4-mini-input" data-quote-equipment-linked-client-price type="number" min="0" step="100" value="${escapeAttr(linkedClientPrice || '')}" placeholder="если пусто — субаренда"></label>
        </div>
        <input type="hidden" data-quote-equipment-linked-subrent-supplier value="${escapeAttr(linkedSupplierName)}">
      </div>` : '';
    return `<div class="v4-equipment-smart-row ${isBlank ? 'is-empty' : 'is-selected'}" data-quote-equipment-smart-row="${escapeAttr(category)}">
      <label class="v4-field v4-equipment-smart-name">Номенклатура
        <input class="v4-mini-input" data-quote-equipment-choice data-quote-equipment-category="${escapeAttr(category)}" list="${escapeAttr(datalistId)}" value="${escapeAttr(value)}" placeholder="код или название внутри категории">
      </label>
      <label class="v4-field v4-equipment-smart-qty">Кол-во
        <input class="v4-mini-input" data-quote-equipment-qty type="number" min="0" step="1" value="${escapeAttr(requestedQty)}">
      </label>
      <div class="v4-equipment-smart-stock v4-equipment-smart-availability">${renderAvailabilityChip(availability)}${item ? `<small>${escapeHtml(item.subcategory || item.type || item.category || '')}</small>` : '<small>выбор добавит строку</small>'}</div>
      <div class="v4-equipment-row-control">
        <div class="v4-equipment-row-actions" aria-label="Действия со строкой">
          <button type="button" class="v4-equipment-row-icon" data-quote-equipment-row-delete title="Удалить строку" aria-label="Удалить строку"${isBlank ? ' disabled' : ''}>🗑</button>
          <button type="button" class="v4-equipment-row-icon" data-quote-equipment-row-clear title="Очистить строку" aria-label="Очистить строку">⌫</button>
        </div>
        <button type="button" class="btn-secondary btn-compact" data-quote-equipment-commit>${isBlank ? 'Подтвердить' : 'Обновить'}</button>
      </div>
      ${subrentBlock}
    </div>`;
  }

  function equipmentOptionLabel(item) {
    const code = item && (item.code || item.id) ? String(item.code || item.id) : '';
    const name = item && item.name ? String(item.name) : '';
    return code ? `${code} — ${name}` : name;
  }

  function safeId(value) {
    return String(value || 'x').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'x';
  }

  function renderManualEquipmentRows(manualItems) {
    const committedRows = (Array.isArray(manualItems) ? manualItems : []).filter(item => item && (item.name || Number(item.qty || 0) > 0));
    const rows = committedRows.concat([{}]);
    return `<div class="v4-manual-equipment-list">${rows.map((manual, index) => renderManualEquipmentRow(manual, index)).join('')}</div>`;
  }

  function renderManualEquipmentRow(manual, index) {
    const current = manual || {};
    const isBlank = !current.name && !Number(current.qty || 0);
    const sourceType = current.sourceType || 'manual';
    const qty = isBlank ? 1 : (current.qty || 1);
    const availability = buildEquipmentAvailabilityMeta(Object.assign({}, current, { qty, sourceType, unit: current.unit || 'шт' }), { blank: isBlank, mode: 'manual' });
    const priceHint = isBlank
      ? ''
      : `Субаренда: ${formatMoney(current.subrentPrice || current.rentalPrice || 0)} · Клиент: ${formatMoney(current.clientPrice || 0)}`;
    return `<div class="v4-manual-equipment-row ${isBlank ? 'is-empty' : 'is-selected'}" data-quote-equipment-manual-row="${index}">
      <div class="v4-equipment-smart-row ${isBlank ? 'is-empty' : 'is-selected'}">
        <label class="v4-field v4-equipment-smart-name">Номенклатура
          <input class="v4-mini-input" data-quote-equipment-manual-field="name" value="${escapeAttr(current.name || '')}" placeholder="Например, генератор / доп. комплект">
        </label>
        <label class="v4-field v4-equipment-smart-qty">Кол-во
          <input class="v4-mini-input" data-quote-equipment-manual-field="qty" type="number" min="0" step="1" value="${escapeAttr(qty)}">
        </label>
        <label class="v4-field v4-equipment-smart-source">Источник
          <select class="v4-mini-input" data-quote-equipment-manual-field="sourceType"><option value="manual" ${sourceType === 'manual' ? 'selected' : ''}>ручная</option><option value="subrent" ${sourceType === 'subrent' ? 'selected' : ''}>субаренда</option></select>
        </label>
        <div class="v4-equipment-smart-stock v4-equipment-smart-availability">${renderAvailabilityChip(availability)}${priceHint ? `<small>${escapeHtml(priceHint)}</small>` : ''}</div>
        <div class="v4-equipment-row-control">
          <div class="v4-equipment-row-actions" aria-label="Действия со строкой">
            <button type="button" class="v4-equipment-row-icon" data-quote-equipment-row-delete title="Удалить строку" aria-label="Удалить строку"${isBlank ? ' disabled' : ''}>🗑</button>
            <button type="button" class="v4-equipment-row-icon" data-quote-equipment-row-clear title="Очистить строку" aria-label="Очистить строку">⌫</button>
          </div>
          <button type="button" class="btn-secondary btn-compact" data-quote-equipment-commit>${isBlank ? 'Подтвердить' : 'Обновить'}</button>
        </div>
      </div>
      <div class="v4-manual-equipment-details v4-grid-3">
        <label class="v4-field">Ед.<input data-quote-equipment-manual-field="unit" value="${escapeAttr(current.unit || 'шт')}"></label>
        <label class="v4-field">Поставщик<input data-quote-equipment-manual-field="supplierName" value="${escapeAttr(current.supplierName || '')}" placeholder="У кого берём"></label>
        <label class="v4-field">Цена/ед.<input data-quote-equipment-manual-field="rentalPrice" type="number" min="0" step="100" value="${escapeAttr(current.rentalPrice || 0)}"></label>
        <label class="v4-field">Субаренда/ед.<input data-quote-equipment-manual-field="subrentPrice" type="number" min="0" step="100" value="${escapeAttr(current.subrentPrice || current.rentalPrice || 0)}"></label>
        <label class="v4-field">Клиент/ед.<input data-quote-equipment-manual-field="clientPrice" type="number" min="0" step="100" value="${escapeAttr(current.clientPrice || 0)}"></label>
        <label class="v4-field">Маржа<input data-quote-equipment-manual-field="margin" type="number" min="0" step="100" value="${escapeAttr(current.margin || 0)}"></label>
        <label class="v4-field">Комментарий<input data-quote-equipment-manual-field="note" value="${escapeAttr(current.note || '')}" placeholder="Сроки / условия / замена"></label>
        <label class="v4-field">Вес/ед., кг<input data-quote-equipment-manual-field="weightKg" type="number" min="0" step="0.1" value="${escapeAttr(current.weightKg || 0)}"></label>
        <label class="v4-field">Мощность/ед., Вт<input data-quote-equipment-manual-field="powerW" type="number" min="0" step="10" value="${escapeAttr(current.powerW || 0)}"></label>
      </div>
    </div>`;
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
    return `<div class="v4-equipment-compact-list">${safeRows.map(row => {
      const availability = buildEquipmentAvailabilityMeta(row, { mode: 'summary' });
      const sourceLabel = row.sourceType === 'subrent' ? 'субаренда' : row.sourceType === 'manual' ? 'ручная' : 'склад';
      return `<div class="v4-equipment-compact-row is-${escapeAttr(availability.status)}">
        <div class="v4-equipment-compact-main"><b>${escapeHtml(row.name)}</b><span>${escapeHtml(row.code || row.id || '')}${row.subcategory ? ' · ' + escapeHtml(row.subcategory) : ''}</span></div>
        <div class="v4-equipment-compact-qty"><b>${formatNumber(row.qty, 0)}</b><span>${escapeHtml(row.unit || 'шт')}</span></div>
        <div class="v4-equipment-compact-status">${renderAvailabilityChip(availability)}</div>
        <div class="v4-equipment-compact-source"><b>${escapeHtml(sourceLabel)}</b>${row.supplierName ? `<span>${escapeHtml(row.supplierName)}</span>` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function buildEquipmentAvailabilityMeta(row, options) {
    const opts = options || {};
    const unit = row && row.unit ? row.unit : 'шт';
    if (!row || opts.blank) return { status: 'empty', label: '—', hint: 'выбор добавит строку' };
    const sourceType = row.sourceType || 'own';
    const qty = Math.max(0, Number(row.qty == null ? row.requestedQty : row.qty) || 0);
    const availableRaw = row.availableQty == null ? row.ownAvailableQty : row.availableQty;
    const availableQty = Math.max(0, Number(availableRaw == null ? 0 : availableRaw) || 0);
    const stockQty = row.stockQty == null ? null : Math.max(0, Number(row.stockQty) || 0);
    const reservedQty = row.reservedQty == null ? null : Math.max(0, Number(row.reservedQty) || 0);
    const explicitDeficit = row.deficitQty == null ? null : Math.max(0, Number(row.deficitQty) || 0);
    const computedDeficit = sourceType === 'subrent' ? 0 : Math.max(0, qty - availableQty);
    const deficitQty = explicitDeficit == null ? computedDeficit : explicitDeficit;
    const stockHint = stockQty == null ? `${formatNumber(availableQty, 0)} ${unit}` : `${formatNumber(availableQty, 0)} / ${formatNumber(stockQty, 0)} ${unit}`;
    if (sourceType === 'subrent') {
      return { status: 'subrent', label: 'субаренда', hint: row.supplierName ? row.supplierName : 'склад не резервируется' };
    }
    if (sourceType === 'manual' || opts.mode === 'manual' && !row.itemId) {
      return { status: 'manual', label: 'ручная', hint: row.supplierName ? row.supplierName : 'без складского резерва' };
    }
    if (deficitQty > 0) {
      return { status: 'deficit', label: `−${formatNumber(deficitQty, 0)} ${unit}`, hint: `доступно ${stockHint}` };
    }
    const reserveHint = reservedQty == null || reservedQty <= 0 ? '' : ` · резерв ${formatNumber(reservedQty, 0)}`;
    return { status: 'ok', label: `OK ${formatNumber(availableQty, 0)}`, hint: `склад ${stockHint}${reserveHint}` };
  }

  function renderAvailabilityChip(meta) {
    const m = meta || { status: 'empty', label: '—', hint: '' };
    return `<div class="v4-availability-chip is-${escapeAttr(m.status || 'empty')}"><b>${escapeHtml(m.label || '—')}</b>${m.hint ? `<span>${escapeHtml(m.hint)}</span>` : ''}</div>`;
  }

  function renderBomRows(rows) {
    const safeRows = (Array.isArray(rows) ? rows : []).filter(row => Number(row && (row.qty || row.quantity || row.trussStraightCount || row.meters || row.weightKg || row.powerW || row.startupPowerW || 0)) > 0);
    if (!safeRows.length) return '<div class="v4-note">BOM пока пуст.</div>';
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Пуск</th></tr></thead><tbody>${safeRows.map(row => {
      const metersNote = row.meters ? `<br><span class="v4-muted">${formatNumber(row.meters, 1)} м суммарно</span>` : '';
      return `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id)}</span></td><td>${formatNumber(row.trussStraightCount || row.qty || row.quantity || 0, 0)} ${escapeHtml(row.unit || 'шт')}${metersNote}</td><td>${formatWeight(row.weightKg)}</td><td>${row.powerW ? formatPower(row.powerW) : '—'}</td><td>${row.startupPowerW ? formatPower(row.startupPowerW) : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function renderBoundSectionSummary(q) {
    // Информация о секциях отображается в KPI strip — не дублируем здесь
    return '';
  }


  function renderProjectCrewStep(q) {
    const users = getCrewUserOptions();
    const assignments = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.normalizeAssignments ? ROOT.ProjectCrewAssignments.normalizeAssignments(q.crewAssignments || []) : (Array.isArray(q.crewAssignments) ? q.crewAssignments : []);
    const draftRow = { id: '', projectRole: 'stagehand', payMode: 'fixed', keyType: 'temporary', __draft: true };
    const rows = assignments.length ? assignments.concat([draftRow]) : [draftRow];
    const total = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.calculateCrewCost ? ROOT.ProjectCrewAssignments.calculateCrewCost(assignments) : 0;
    return `<div class="v4-card v4-section-card v4-project-crew-panel" data-project-crew-panel>
      <div class="v4-card-head">
        <div><div class="v4-kicker">project crew</div><h4>Команда проекта и доступы</h4><p class="v4-muted">Назначай людей на конкретный проект, фиксируй их рабочую роль и стоимость. Для приглашённых спецов можно сразу создать временный или постоянный ключ доступа.</p></div>
        <div class="v4-mini"><b>${formatMoney(total)}</b><span>Итого работ команды</span></div>
      </div>
      <div class="v4-note">Временный ключ действует только в указанном интервале. Постоянный ключ подходит для штатных сотрудников и не закрывает доступ по дате.</div>
      <div class="v4-project-crew-list" data-project-crew-list>
        ${rows.map((row, index) => renderProjectCrewRow(row, index, users, !!row.__draft)).join('')}
      </div>
      <div class="v4-actions"><button type="button" class="btn-secondary" data-project-crew-add>+ добавить участника</button></div>
    </div>`;
  }

  function renderProjectCrewRow(row, index, users, isDraft) {
    const src = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.normalizeAssignment ? ROOT.ProjectCrewAssignments.normalizeAssignment(row || {}) : (row || {});
    const roles = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.getCrewRoles ? ROOT.ProjectCrewAssignments.getCrewRoles() : [];
    const keyTypes = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.getKeyTypes ? ROOT.ProjectCrewAssignments.getKeyTypes() : [{ id: 'temporary', name: 'Временный ключ' }, { id: 'permanent', name: 'Постоянный ключ' }];
    const payMode = src.payMode === 'hourly' ? 'hourly' : 'fixed';
    return `<div class="v4-project-crew-card${isDraft ? ' v4-project-crew-card--draft' : ''}" data-project-crew-row${isDraft ? ' data-project-crew-draft-row="true"' : ''}>
      <input type="hidden" data-project-crew-field="id" value="${escapeAttr(src.id || '')}">
      <input type="hidden" data-project-crew-field="inviteId" value="${escapeAttr(src.inviteId || '')}">
      <div class="v4-project-crew-grid">
        <label class="v4-field">Пользователь<select data-project-crew-field="userId">${renderCrewUserOptions(users, src.userId, src.userEmail)}</select></label>
        <label class="v4-field">Email / новый спец<input data-project-crew-field="userEmail" type="email" value="${escapeAttr(src.userEmail || '')}" placeholder="name@example.com"></label>
        <label class="v4-field">Имя<input data-project-crew-field="displayName" value="${escapeAttr(src.displayName || '')}" placeholder="ФИО / имя в команде"></label>
        <label class="v4-field">Роль на проекте<select data-project-crew-field="projectRole">${roles.map(role => `<option value="${escapeAttr(role.id)}"${role.id === src.projectRole ? ' selected' : ''}>${escapeHtml(role.name)}</option>`).join('')}</select></label>
        <label class="v4-field">Оплата<select data-project-crew-field="payMode"><option value="fixed"${payMode === 'fixed' ? ' selected' : ''}>Одна сумма за мероприятие</option><option value="hourly"${payMode === 'hourly' ? ' selected' : ''}>Почасовая</option></select></label>
        <label class="v4-field">Сумма за мероприятие<input data-project-crew-field="fixedCost" type="number" min="0" step="100" value="${escapeAttr(src.fixedCost || '')}" placeholder="₽"></label>
        <label class="v4-field">₽/час<input data-project-crew-field="hourlyRate" type="number" min="0" step="100" value="${escapeAttr(src.hourlyRate || '')}"></label>
        <label class="v4-field">Часы<input data-project-crew-field="hours" type="number" min="0" step="0.5" value="${escapeAttr(src.hours || '')}"></label>
      </div>
      <div class="v4-project-crew-access-wrap">
        <label class="v4-equipment-editor-check"><input data-project-crew-field="isGuest" type="checkbox"${src.isGuest ? ' checked' : ''}> приглашённый спец / нужен ключ</label>
      <div class="v4-project-crew-access" style="${src.isGuest ? '' : 'display:none'}">
        <label class="v4-field">Тип ключа<select data-project-crew-field="keyType">${keyTypes.map(type => `<option value="${escapeAttr(type.id)}"${type.id === src.keyType ? ' selected' : ''}>${escapeHtml(type.name)}</option>`).join('')}</select></label>
        <label class="v4-field">Доступ с<input data-project-crew-field="accessFrom" type="date" value="${escapeAttr(src.accessFrom || '')}"></label>
        <label class="v4-field">Доступ по<input data-project-crew-field="accessTo" type="date" value="${escapeAttr(src.accessTo || '')}"></label>
        <label class="v4-field">Ключ<input data-project-crew-field="inviteKey" value="${escapeAttr(src.inviteKey || '')}" readonly placeholder="создать ключ"></label>
        <button type="button" class="btn-secondary" data-project-crew-generate-key>Создать / продлить ключ</button>
        <button type="button" class="btn-secondary" data-project-crew-copy-key ${src.inviteKey ? '' : 'disabled'}">Копировать</button>
        <button type="button" class="btn-secondary" data-project-crew-delete>Удалить</button>
      </div></div>
      <label class="v4-field">Комментарий<input data-project-crew-field="note" value="${escapeAttr(src.note || '')}" placeholder="смена, зона ответственности, условия"></label>
    </div>`;
  }

  function getCrewUserOptions() {
    const admin = ROOT.AdminShell || {};
    const list = admin.loadProfiles ? admin.loadProfiles() : [];
    const current = ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser ? ROOT.AuthProvider.getCurrentUser() : null;
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach(profile => {
      if (profile && (profile.id || profile.email)) map.set(profile.id || profile.email, profile);
    });
    if (current && (current.id || current.email)) map.set(current.id || current.email, current);
    return Array.from(map.values());
  }

  function renderCrewUserOptions(users, selectedId, selectedEmail) {
    const options = ['<option value="">— новый / вручную —</option>'];
    (Array.isArray(users) ? users : []).forEach(user => {
      const value = user.id || user.email || '';
      const label = `${user.displayName || user.name || user.email || value}${user.email ? ' · ' + user.email : ''}`;
      const selected = (selectedId && value === selectedId) || (selectedEmail && user.email === selectedEmail);
      options.push(`<option value="${escapeAttr(value)}" data-email="${escapeAttr(user.email || '')}" data-name="${escapeAttr(user.displayName || user.name || '')}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`);
    });
    return options.join('');
  }

  function renderFinalSummaryPanel(q) {
    if (!summaryBuilder()) return '';
    const finalSummary = getCachedFinalSummary(q);
    const pickLists = getCachedPickLists(q);
    const customerRows = finalSummary.customerRows || [];
    const technicalRows = finalSummary.technicalRows || [];
    const warnings = finalSummary.warnings || [];
    const flowRows = finalSummary.flowRows || [];
    const isAdmin = currentRoleIsAdmin();
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
      ${renderQuoteBomMountPanel(q)}
      ${renderFinalDocumentActions(finalSummary, pickLists)}
      ${renderCustomerEstimateRows(customerRows)}
      ${renderTechnicalSummaryRows(technicalRows)}
      ${isAdmin ? renderSummaryFlowRows(flowRows) : ''}
      ${pickLists ? renderPickLists(pickLists) : ''}
      ${renderSummaryWarnings(warnings)}
    </div>`;
  }


  function renderQuoteBomMountPanel(q) {
    const mount = q && q.v4Bom || null;
    const summary = ROOT.V4QuoteDraftHydrator && ROOT.V4QuoteDraftHydrator.summarizeMount
      ? ROOT.V4QuoteDraftHydrator.summarizeMount(mount)
      : summarizeBomMountFallback(mount);
    const counts = mount && mount.rowCounts || {};
    const totals = mount && mount.totals || {};
    const checks = mount && mount.checks && Array.isArray(mount.checks.rows) ? mount.checks.rows : [];
    const hasMount = !!mount;
    return `<div class="v4-card v4-section-card" data-quote-bom-mount>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">v4 quote BOM mount</div>
          <h4>Снимок общего BOM в черновике</h4>
          <p class="v4-muted">Линейный мастер больше не пересобирает тяжёлый BOM автоматически. Снимок собирается вручную кнопкой ниже или при экспорте BOM-документов.</p>
        </div>
        <div class="v4-actions" style="margin-top:0">
          <button type="button" class="btn-secondary" data-quote-bom-refresh>${hasMount ? 'Обновить BOM snapshot' : 'Собрать BOM snapshot'}</button>
        </div>
      </div>
      ${hasMount ? `<div class="v4-summary-grid">
        <div class="v4-mini"><b>${formatNumber(counts.sharedBom || summary.sharedBom || 0, 0)}</b><span>Shared BOM</span></div>
        <div class="v4-mini"><b>${formatNumber(counts.quoteItems || summary.quoteItems || 0, 0)}</b><span>quote_items</span></div>
        <div class="v4-mini"><b>${formatNumber(counts.warehouse || summary.warehouse || 0, 0)}</b><span>Склад</span></div>
        <div class="v4-mini"><b>${formatWeight(totals.weightKg == null ? summary.weightKg : totals.weightKg)}</b><span>Вес BOM</span></div>
        <div class="v4-mini"><b>${formatPower(totals.powerW == null ? summary.powerW : totals.powerW)}</b><span>Мощность</span></div>
        <div class="v4-mini"><b>${escapeHtml(mount.version || summary.version || '—')}</b><span>Версия</span></div>
        <div class="v4-mini"><b>${escapeHtml(mount.contractReadiness && mount.contractReadiness.ready ? 'ready' : mount.contractReadiness ? 'blocked' : '—')}</b><span>BOM contract</span></div>
        <div class="v4-mini"><b>${escapeHtml(mount.generatedAt ? 'да' : '—')}</b><span>Snapshot</span></div>
      </div>
      ${checks.length ? `<div class="v4-note"><b>Проверки BOM:</b> ${checks.map(row => `${row.ok ? '✓' : '!'} ${escapeHtml(row.label || row.key)}`).join(' · ')}</div>` : ''}` : '<div class="v4-note">BOM snapshot пока не собран для этого черновика. Это нормально: линейный конфигуратор остаётся лёгким, а полный BOM можно собрать по кнопке.</div>'}
    </div>`;
  }

  function summarizeBomMountFallback(mount) {
    const m = mount || {};
    const counts = m.rowCounts || {};
    const totals = m.totals || {};
    return {
      version: m.version || '—',
      sharedBom: Number(counts.sharedBom || 0),
      quoteItems: Number(counts.quoteItems || 0),
      warehouse: Number(counts.warehouse || 0),
      technical: Number(counts.technical || 0),
      weightKg: Number(totals.weightKg || 0),
      powerW: Number(totals.powerW || 0)
    };
  }


  function renderReadinessChecklist(q) {
    if (!readinessChecklist() || !readinessChecklist().buildChecklist) return '';
    const checklist = readinessChecklist().buildChecklist(q);
    const items = Array.isArray(checklist.items) ? checklist.items : [];
    const requiredFailed = checklist.totals && checklist.totals.requiredFailed || 0;
    const warnings = checklist.totals && checklist.totals.warnings || 0;
    const statusLabel = checklist.ready ? (warnings ? 'Готово с предупреждениями' : 'Готово') : 'Нужно доработать';
    return `<div class="v4-readiness-compact" data-project-readiness>
      <div class="v4-readiness-compact-head">
        <div class="v4-readiness-compact-score ${checklist.ready ? 'ok' : (requiredFailed ? 'bad' : 'warn')}">
          <b>${formatNumber(checklist.score, 0)}%</b>
          <span>${escapeHtml(statusLabel)}</span>
        </div>
        <div class="v4-readiness-compact-meta">
          <span class="${requiredFailed ? 'bad' : 'ok'}">обяз: ${requiredFailed ? requiredFailed + ' ✗' : 'ок'}</span>
          <span class="${warnings ? 'warn' : 'ok'}">предупр: ${warnings || 0}</span>
          <span>пунктов: ${items.length}</span>
        </div>
      </div>
      <div class="v4-readiness-tiles">${items.map(item => {
        const cls = item.ok ? 'ok' : item.severity === 'warning' ? 'warn' : 'bad';
        const icon = item.ok ? '✓' : item.severity === 'warning' ? '!' : '×';
        const tooltip = [item.details, item.action].filter(Boolean).join(' · ');
        return `<div class="v4-readiness-tile ${cls}" title="${escapeAttr(tooltip)}"><span class="v4-readiness-tile-icon">${icon}</span><b>${escapeHtml(item.title)}</b>${item.details ? `<small>${escapeHtml(item.details)}</small>` : ''}</div>`;
      }).join('')}</div>
    </div>`;
  }


  function renderFinalDocumentActions(finalSummary, pickLists) {
    const isAdmin = currentRoleIsAdmin();
    const sectionLists = pickLists && Array.isArray(pickLists.sections) ? pickLists.sections.filter(list => list.rows && list.rows.length) : [];
    const sectionButtons = sectionLists.map(list => `<button type="button" class="btn-secondary" data-quote-doc="warehouse:${escapeAttr(list.key)}">${escapeHtml(list.title)}</button>`).join('');
    const deficitButton = pickLists && pickLists.deficits && pickLists.deficits.rows && pickLists.deficits.rows.length ? '<button type="button" class="btn-secondary" data-quote-doc="warehouse:deficits">Дефицит и закрытие</button>' : '';
    const subrentButton = pickLists && pickLists.subrent && pickLists.subrent.rows && pickLists.subrent.rows.length ? '<button type="button" class="btn-secondary" data-quote-doc="subrent">План субаренды</button>' : '';
    return `<div class="v4-card v4-section-card v4-final-doc-actions" data-quote-final-doc-actions>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">documents actions</div>
          <h4>Документы и листы</h4>
          <p class="v4-muted">Рабочие документы сгруппированы по задачам проекта. Технические выгрузки доступны только администратору.</p>
        </div>
      </div>
      <div class="v4-doc-action-groups">
        <section class="v4-doc-action-group v4-doc-action-group--primary">
          <div class="v4-doc-action-title">
            <b>Основные документы</b>
            <span>То, чем менеджер пользуется чаще всего</span>
          </div>
          <div class="v4-actions">
            <button type="button" class="btn-primary" data-quote-save-project>Сохранить смету</button>
            <button type="button" class="btn-primary" data-quote-doc="customer">КП клиенту</button>
            <button type="button" class="btn-secondary" data-quote-doc="technical">Техлист</button>
            <button type="button" class="btn-secondary" data-quote-doc="readiness">Checklist готовности</button>
            <button type="button" class="btn-secondary" data-quote-doc="warehouse:all">Общий складской лист</button>
          </div>
        </section>
        <section class="v4-doc-action-group">
          <div class="v4-doc-action-title">
            <b>Склад и логистика</b>
            <span>Резерв, движения, складской workflow и календарь</span>
          </div>
          <div class="v4-actions">
            <button type="button" class="btn-secondary" data-quote-doc="reservations">План резерва склада</button>
            <button type="button" class="btn-secondary" data-quote-doc="stock-movements">Движение склада</button>
            <button type="button" class="btn-secondary" data-quote-doc="warehouse-workflow">Складской workflow</button>
            <button type="button" class="btn-secondary" data-quote-doc="calendar">Черновик календаря</button>
            <button type="button" class="btn-secondary" data-quote-doc="calendar-ics">ICS календаря</button>
          </div>
        </section>
        ${(sectionButtons || deficitButton || subrentButton) ? `<section class="v4-doc-action-group">
          <div class="v4-doc-action-title">
            <b>Разделы проекта</b>
            <span>Отдельные листы по сцене, фермам, LED и оборудованию</span>
          </div>
          <div class="v4-actions">
            ${sectionButtons}
            ${deficitButton}
            ${subrentButton}
          </div>
        </section>` : ''}
        ${isAdmin ? `<details class="v4-doc-dev-panel" data-quote-doc-dev-panel>
          <summary>
            <span><b>Админ / JSON</b><small>Технические выгрузки модели и служебные проверки</small></span>
          </summary>
          <div class="v4-actions">
            <button type="button" class="btn-secondary" data-quote-doc="warehouse-workflow-json">warehouse_workflow JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="quote-items">quote_items JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-unified-tech">Unified техлист v4</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-unified-warehouse">Unified склад v4</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-unified-json">Unified BOM JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-bom-snapshot">BOM snapshot JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-hydrated-bom-snapshot">Hydrated BOM JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="v4-bom-contract">BOM contract JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="audit-log">audit_log JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="export-pack">Export pack JSON</button>
            <button type="button" class="btn-secondary" data-quote-doc="json">JSON проекта</button>
          </div>
        </details>` : ''}
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


  function renderSummaryFlowRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '<div class="v4-note">Карта прохождения разделов пока пустая.</div>';
    return `<div class="v4-card v4-section-card" data-quote-summary-flow>
      <div class="v4-card-head">
        <div>
          <div class="v4-kicker">summary flow map</div>
          <h4>Карта прохождения разделов</h4>
          <p class="v4-muted">Проверка, что выбранные разделы дошли до summary, shared BOM, quote_items и складских листов. Это диагностический слой: расчёты не меняет.</p>
        </div>
      </div>
      <div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>Раздел</th><th>Статус</th><th>BOM</th><th>quote_items</th><th>Склад</th><th>Проверки</th></tr></thead><tbody>${safeRows.map(row => {
        const checkBits = [];
        if (row.deficitRows) checkBits.push(`дефицит: ${formatNumber(row.deficitRows, 0)}`);
        if (row.subrentRows) checkBits.push(`субаренда: ${formatNumber(row.subrentRows, 0)}`);
        if (row.unmatchedRows) checkBits.push(`нет в базе: ${formatNumber(row.unmatchedRows, 0)}`);
        if (!checkBits.length) checkBits.push(row.ok ? 'ок' : 'проверить');
        return `<tr data-quote-summary-flow-row="${escapeAttr(row.key || '')}" data-flow-status="${escapeAttr(row.flowStatus || '')}">
          <td><b>${escapeHtml(row.title || row.key || '')}</b><br><span class="v4-muted">${escapeHtml(row.key || '')}${row.selected ? ' · выбран' : ' · не выбран'}</span></td>
          <td><b>${escapeHtml(row.flowLabel || '')}</b><br><span class="v4-muted">${escapeHtml(row.sectionLabel || row.sectionStatus || '')}</span></td>
          <td>${formatNumber(row.bomRows || 0, 0)} поз.<br><span class="v4-muted">${formatNumber(row.bomQty || 0, 0)} ед.</span></td>
          <td>${formatNumber(row.quoteItems || 0, 0)} строк</td>
          <td>${formatNumber(row.warehouseRows || 0, 0)} строк</td>
          <td>${checkBits.map(bit => escapeHtml(bit)).join('<br>')}</td>
        </tr>`;
      }).join('')}</tbody></table></div>
    </div>`;
  }

  function renderPickLists(pickLists) {
    const lists = [];
    if (pickLists.all) lists.push(pickLists.all);
    if (pickLists.deficits && pickLists.deficits.rows && pickLists.deficits.rows.length) lists.push(pickLists.deficits);
    (pickLists.sections || []).forEach(list => { if (list.rows && list.rows.length) lists.push(list); });
    if (!lists.length) return '<div class="v4-note">Складские листы пока пустые.</div>';
    return `<div class="v4-note"><b>Складские листы:</b> ${lists.map(list => `${escapeHtml(list.title)} — ${escapeHtml(list.rows.length)} поз.`).join(' · ')}</div>${lists.slice(0, 3).map(renderPickListTable).join('')}`;
  }

  function renderPickListTable(list) {
    const rows = list && list.rows ? list.rows : [];
    if (!rows.length) return '';
    if (list && list.key === 'deficits') return renderDeficitClosureTable(list);
    return `<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>${escapeHtml(list.title)}</th><th>Кол-во</th><th>Вес</th><th>Дефицит</th><th>Источник</th></tr></thead><tbody>${rows.slice(0, 12).map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id || '')} · ${escapeHtml(row.sectionTitle || row.sectionKey || '')}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatWeight(row.weightKg)}</td><td>${row.deficitQty ? '<b>' + formatNumber(row.deficitQty, 0) + '</b>' : '—'}</td><td>${escapeHtml(row.sourceType || 'own')}${row.supplierName ? '<br><span class="v4-muted">' + escapeHtml(row.supplierName) + '</span>' : ''}</td></tr>`).join('')}${rows.length > 12 ? `<tr><td colspan="5" class="v4-muted">…и ещё ${rows.length - 12} поз.</td></tr>` : ''}</tbody></table></div>`;
  }

  function renderDeficitClosureTable(list) {
    const rows = list && list.rows ? list.rows : [];
    return `<div class="v4-table-wrap"><table class="v4-table v4-table--deficit-closure"><thead><tr><th>${escapeHtml(list.title)}</th><th>Нужно</th><th>Склад</th><th>Дефицит</th><th>Закрываем</th><th>У кого / источник</th><th>Себест.</th><th>Клиенту</th><th>Маржа</th></tr></thead><tbody>${rows.slice(0, 14).map(row => {
      const needQty = row.requestedQty || row.qty || 0;
      const stockQty = row.availableQty == null ? row.stockQty : row.availableQty;
      const deficitQty = row.deficitQty || 0;
      const subrentQty = row.subrentQty || (row.sourceType === 'subrent' ? row.qty || 0 : 0);
      const closure = row.sourceType === 'subrent' || subrentQty > 0 ? 'субаренда' : deficitQty > 0 ? 'докупка / решить' : 'проверить';
      const source = row.supplierName || (row.sourceType === 'subrent' ? 'субаренда' : row.sourceType || 'FEG');
      const subrentCost = row.subrentPrice ? formatMoney(row.subrentPrice) : '—';
      const clientCost = row.clientPrice ? formatMoney(row.clientPrice) : '—';
      const margin = row.margin ? formatMoney(row.margin) : '—';
      return `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code || row.id || '')} · ${escapeHtml(row.sectionTitle || row.sectionKey || '')}</span></td><td>${formatNumber(needQty, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${stockQty == null ? '—' : formatNumber(stockQty, 0)}</td><td>${deficitQty ? '<b>' + formatNumber(deficitQty, 0) + '</b>' : '—'}</td><td>${escapeHtml(closure)}${subrentQty ? '<br><span class="v4-muted">' + formatNumber(subrentQty, 0) + ' ' + escapeHtml(row.unit || 'шт') + '</span>' : ''}</td><td>${escapeHtml(source)}</td><td>${subrentCost}</td><td>${clientCost}</td><td>${margin}</td></tr>`;
    }).join('')}${rows.length > 14 ? `<tr><td colspan="9" class="v4-muted">…и ещё ${rows.length - 14} поз.</td></tr>` : ''}</tbody></table></div>`;
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
    const bomRefreshBtn = root.querySelector('[data-quote-bom-refresh]');
    const saveProjectBtn = root.querySelector('[data-quote-save-project]');
    const crewAddBtn = root.querySelector('[data-project-crew-add]');

    const persistDraft = (draft, options) => storage() && storage().saveDraft ? storage().saveDraft(draft, options || {}) : draft;

    const runBusy = (label, task, button) => {
      const busy = ROOT.BusyIndicator;
      if (busy && busy.setButtonBusy) busy.setButtonBusy(button, true, 'Сохраняю…');
      const runner = busy && busy.run ? busy.run(label, task) : Promise.resolve().then(task);
      return runner.finally(() => { if (busy && busy.setButtonBusy) busy.setButtonBusy(button, false); });
    };

    const saveDraft = (draft, message, options) => {
      const saved = persistDraft(draft, options || {});
      if (message) toast(message);
      renderWizardMap(root, saved);
      return saved;
    };

    let autosaveTimer = null;
    const scheduleAutosave = () => {
      if (!form) return;
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        autosaveTimer = null;
        persistDraft(readCurrent(), { source:'quote-wizard-light-autosave' });
      }, 350);
    };

    const handleCrewSmartRowChange = (row) => {
      if (row && isLastProjectCrewRow(row) && isProjectCrewRowMeaningful(row)) {
        saveDraft(readCurrent(), null, { source:'quote-wizard-crew-smart-row' });
        return;
      }
      scheduleAutosave();
    };

    const setActiveStep = (draft, stepId, message) => {
      const base = model() ? model().mergeQuotePatch(draft, { wizard: { activeStep: stepId } }) : Object.assign({}, draft, { wizard: { activeStep: stepId } });
      return saveDraft(base, message || 'Шаг сметы обновлён');
    };

    const readCurrent = () => readFormQuote(form, quote);

    const applyClientToQuoteForm = (client) => {
      if (!form || !client) return;
      const idInput = form.querySelector('[name="client.id"]');
      const nameInput = form.querySelector('[data-quote-client-field="name"]');
      const phoneInput = form.querySelector('[data-quote-client-field="phone"]');
      const emailInput = form.querySelector('[data-quote-client-field="email"]');
      if (idInput) idInput.value = client.id || '';
      if (nameInput) nameInput.value = clientDisplayName(client);
      if (phoneInput) phoneInput.value = client.phone || '';
      if (emailInput) emailInput.value = client.email || '';
    };

    const closeClientModal = () => {
      const modal = root.querySelector('[data-quote-client-modal]');
      if (!modal) return;
      try { if (modal.close) modal.close(); else modal.removeAttribute('open'); } catch (_) { modal.removeAttribute('open'); }
    };

    const readClientModalPayload = () => {
      const card = root.querySelector('[data-quote-client-modal]');
      const value = (key) => card && card.querySelector(`[data-quote-client-new-field="${key}"]`) ? card.querySelector(`[data-quote-client-new-field="${key}"]`).value.trim() : '';
      return { name:value('name'), contact:value('contact'), phone:value('phone'), email:value('email'), address:value('address'), note:value('note') };
    };

    const saveNewClientFromModal = () => {
      const payload = readClientModalPayload();
      if (!payload.name) return toast('Укажи название клиента');
      const svc = clientStorage();
      if (!svc || !svc.upsertClient) return toast('База клиентов не загружена');
      const result = svc.upsertClient(payload);
      const saved = result && result.client ? result.client : result;
      applyClientToQuoteForm(saved);
      closeClientModal();
      saveDraft(readCurrent(), 'Клиент создан и выбран');
      return saved;
    };

    const save = () => saveDraft(readCurrent(), 'Черновик сметы сохранён');

    const autoBindActiveStepBeforeMove = (draft) => {
      if (!form || !binder()) return draft;
      const active = form.getAttribute('data-quote-active-step') || (draft && draft.wizard && draft.wizard.activeStep) || '';
      let next = draft;
      try {
        if (active === 'stage' && next.scope && next.scope.stage) {
          const subrentInput = readStageSubrentInput(form);
          if (subrentInput && subrentInput.subrentEnabled) {
            next = binder().bindSection(next, 'stage', buildStageSubrentSection(subrentInput, { source:'quote-wizard-nav-stage-subrent-autobind' }));
          } else if (ROOT.V4StructureVisualConfigurator && ROOT.V4StructureVisualConfigurator.readStageInput) {
            const panel = form.querySelector('[data-quote-structure-visual="stage"]');
            const input = ROOT.V4StructureVisualConfigurator.readStageInput(panel);
            const hasDecks = Array.isArray(input.modules) && input.modules.length > 0;
            const hasStairs = Array.isArray(input.stairs) && input.stairs.length > 0;
            if (hasDecks || hasStairs || next.sections && next.sections.stage && next.sections.stage.status === 'configured') {
              next = binder().bindStageSection(next, input, { source:'quote-wizard-nav-stage-autobind' });
            }
          }
        }
        if (active === 'truss' && next.scope && next.scope.truss && ROOT.V4StructureVisualConfigurator && ROOT.V4StructureVisualConfigurator.readTrussInput) {
          const panel = form.querySelector('[data-quote-structure-visual="truss"]');
          const input = ROOT.V4StructureVisualConfigurator.readTrussInput(panel);
          const hasItems = Array.isArray(input.items) && input.items.length > 0;
          if (hasItems || next.sections && next.sections.truss && next.sections.truss.status === 'configured') {
            next = binder().bindTrussSection(next, input, { source:'quote-wizard-nav-truss-autobind' });
          }
        }
        if (active === 'led' && next.scope && next.scope.led) {
          const ledInput = readLedInput(form, next);
          if (ledInput && ledInput.subrentEnabled) {
            next = binder().bindSection(next, 'led', buildLedSubrentSection(ledInput, { source:'quote-wizard-nav-led-subrent-autobind' }));
          } else if (ledInput && binder().bindLedSection) {
            next = binder().bindLedSection(next, ledInput, { source:'quote-wizard-nav-led-autobind' });
          }
        }
      } catch (err) {
        if (console && console.warn) console.warn('QuoteWizard active step autobind skipped', active, err);
      }
      return next;
    };

    const tryMove = (directionOrTarget) => {
      let next = autoBindActiveStepBeforeMove(readCurrent());
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



    const initStructureVisuals = () => {
      root.querySelectorAll('[data-quote-structure-visual]').forEach(mount => {
        if (!ROOT.V4StructureVisualConfigurator) {
          mount.innerHTML = '<div class="v4-note">V4StructureVisualConfigurator не загружен.</div>';
          return;
        }
        let input = {};
        try { input = JSON.parse(mount.getAttribute('data-quote-structure-input') || '{}') || {}; } catch (_) { input = {}; }
        const kind = mount.getAttribute('data-quote-structure-visual');
        if (kind === 'stage') ROOT.V4StructureVisualConfigurator.renderStageConfigurator(mount, { mode:'quote', input, title:'Сцена · нарисовать форму для сметы' });
        if (kind === 'truss') ROOT.V4StructureVisualConfigurator.renderTrussConfigurator(mount, { mode:'quote', input, title:'Фермы · блочный конструктор для сметы' });
      });
    };

    const initLedConstructors = () => {
      root.querySelectorAll('[data-quote-led-constructor]').forEach(mount => {
        if (!ROOT.LedCalculatorUI || !ROOT.LedCalculatorUI.renderLedCalculator) {
          mount.innerHTML = '<div class="v4-note">LedCalculatorUI не загружен.</div>';
          return;
        }
        let input = {};
        try { input = JSON.parse(mount.getAttribute('data-quote-led-input') || '{}') || {}; } catch (_) { input = {}; }
        ROOT.LedCalculatorUI.renderLedCalculator(mount, Object.assign({}, input, {
          source: 'quote-wizard-led-constructor',
          mode: 'quote',
          sourceMode: 'quote',
          catalogMode: 'quote',
          onChange: (section, result, ledInput) => {
            mount._v4QuoteLedSection = section || null;
            mount._v4QuoteLedInput = ledInput || null;
            mount._v4QuoteLedResult = result || null;
          }
        }));
      });
    };

    const writeDocumentPreview = (docKind) => {
      let next = readCurrent();
      const directText = buildDirectV4DocumentText(next, docKind);
      if (directText !== null) {
        writePreviewText(next, docKind, directText);
        return;
      }
      if (!documentBuilder()) {
        toast('Модуль документов ещё не загружен');
        return;
      }
      const doc = buildRequestedDocument(next, docKind);
      const text = docKind === 'readiness' && readinessChecklist() ? readinessChecklist().checklistToText(next) : docKind === 'json' ? JSON.stringify(model() ? model().buildQuotePayload(next) : next, null, 2) : docKind === 'quote-items' && ROOT.QuoteItemBuilder ? ROOT.QuoteItemBuilder.exportQuoteItems(next) : docKind === 'audit-log' && ROOT.ProjectAuditLog ? ROOT.ProjectAuditLog.exportAuditLog(next) : docKind === 'export-pack' && ROOT.ProjectAuditLog ? ROOT.ProjectAuditLog.exportProjectPack(next) : docKind === 'reservations' && ROOT.ReservationPlanner ? ROOT.ReservationPlanner.exportReservationPlan(next) : docKind === 'stock-movements' && ROOT.StockMovementPlanner ? ROOT.StockMovementPlanner.exportMovementPlan(next, { action: 'reserve' }) : docKind === 'warehouse-workflow-json' && ROOT.WarehouseWorkflow ? ROOT.WarehouseWorkflow.exportWorkflow(next) : docKind === 'calendar-ics' && ROOT.CalendarIntegration ? ROOT.CalendarIntegration.exportIcs(next) : documentBuilder().documentToText(doc);
      writePreviewText(next, docKind, text);
    };

    const writePreviewText = (draft, docKind, text) => {
      const preview = root.querySelector('[data-quote-doc-preview]');
      if (preview) {
        preview.value = text;
        preview.focus();
        preview.select();
      }
      copyText(text);
      downloadText(getDocumentFilename(draft, docKind), text, getDocumentMimeType(docKind));
      toast(docKind === 'calendar-ics' ? 'ICS календаря сформирован, скопирован и сохранён' : 'Документ сформирован, скопирован и сохранён');
    };

    const buildDirectV4DocumentText = (draft, docKind) => {
      if (docKind === 'v4-unified-tech' && ROOT.V4UnifiedBomExport) {
        return ROOT.V4UnifiedBomExport.documentToText(ROOT.V4UnifiedBomExport.buildUnifiedTechnicalSheet(draft, { source: 'quote-wizard' }));
      }
      if (docKind === 'v4-unified-warehouse' && ROOT.V4UnifiedBomExport) {
        return ROOT.V4UnifiedBomExport.documentToText(ROOT.V4UnifiedBomExport.buildUnifiedWarehouseSheet(draft, { source: 'quote-wizard' }));
      }
      if (docKind === 'v4-unified-json' && ROOT.V4UnifiedBomExport) {
        return ROOT.V4UnifiedBomExport.exportPayloadAsJson(draft, { source: 'quote-wizard' });
      }
      if (docKind === 'v4-bom-snapshot' && ROOT.V4QuoteDraftBomSink) {
        return JSON.stringify(ROOT.V4QuoteDraftBomSink.buildDraftBomMount(draft, { source: 'quote-wizard' }), null, 2);
      }
      if (docKind === 'v4-hydrated-bom-snapshot' && ROOT.V4QuoteDraftHydrator) {
        return ROOT.V4QuoteDraftHydrator.exportHydratedSnapshotJson(draft, { source: 'quote-wizard' });
      }
      if (docKind === 'v4-bom-contract' && ROOT.V4BomContract) {
        return ROOT.V4BomContract.exportContractJson(draft, { source: 'quote-wizard', noPrices: true });
      }
      return null;
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
      const ext = docKind === 'calendar-ics' ? 'ics' : (String(docKind || '').includes('json') || docKind === 'v4-bom-snapshot' || docKind === 'v4-hydrated-bom-snapshot' || docKind === 'v4-bom-contract' ? 'json' : 'txt');
      return `${base}-${suffix}.${ext}`;
    };

    const getDocumentMimeType = (docKind) => {
      if (docKind === 'calendar-ics') return 'text/calendar;charset=utf-8';
      if (String(docKind || '').includes('json') || docKind === 'v4-bom-snapshot' || docKind === 'v4-hydrated-bom-snapshot' || docKind === 'v4-bom-contract') return 'application/json;charset=utf-8';
      return 'text/plain;charset=utf-8';
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

    const readNumber = (input, fallback) => {
      const value = input && input.value;
      const n = Number(value);
      return Number.isFinite(n) ? n : Number(fallback || 0);
    };

    const bindStructureSection = (key) => {
      try {
        let next = readCurrent();
        if (!binder()) throw new Error('QuoteSectionBinder не загружен');
        if (key === 'stage') {
          const subrentInput = readStageSubrentInput(root);
          if (subrentInput && subrentInput.subrentEnabled) {
            next = binder().bindSection(next, 'stage', buildStageSubrentSection(subrentInput, { source: 'quote-wizard-stage-subrent-button' }));
          } else {
            const panel = root.querySelector('[data-quote-structure-visual="stage"]');
            const input = ROOT.V4StructureVisualConfigurator && ROOT.V4StructureVisualConfigurator.readStageInput ? ROOT.V4StructureVisualConfigurator.readStageInput(panel) : {};
            next = binder().bindStageSection(next, input);
          }
        } else {
          const panel = root.querySelector('[data-quote-structure-visual="truss"]');
          const input = ROOT.V4StructureVisualConfigurator && ROOT.V4StructureVisualConfigurator.readTrussInput ? ROOT.V4StructureVisualConfigurator.readTrussInput(panel) : {};
          next = binder().bindTrussSection(next, input);
        }
        saveDraft(next, key === 'stage' ? 'Секция сцены сохранена через v4 BOM' : 'Секция ферм сохранена через v4 BOM');
      } catch (err) {
        toast(err && err.message ? err.message : 'Не удалось сохранить секцию');
        if (console && console.warn) console.warn(err);
      }
    };

    initStructureVisuals();
    initLedConstructors();
    const clientSelect = root.querySelector('[data-quote-client-select]');
    if (clientSelect) clientSelect.addEventListener('change', () => {
      const id = clientSelect.value;
      const svc = clientStorage();
      const client = svc && svc.getClientById ? svc.getClientById(id) : (listQuoteClients().find(row => String(row.id || row.name || '') === String(id)) || null);
      if (client) {
        applyClientToQuoteForm(client);
        saveDraft(readCurrent(), 'Клиент выбран из базы');
      } else {
        scheduleAutosave();
      }
    });
    root.querySelectorAll('[data-quote-client-open-create]').forEach(btn => btn.addEventListener('click', event => {
      event.preventDefault();
      const modal = root.querySelector('[data-quote-client-modal]');
      if (!modal) return;
      try { if (modal.showModal) modal.showModal(); else modal.setAttribute('open', 'open'); } catch (_) { modal.setAttribute('open', 'open'); }
    }));
    root.querySelectorAll('[data-quote-client-cancel]').forEach(btn => btn.addEventListener('click', event => { event.preventDefault(); closeClientModal(); }));
    root.querySelectorAll('[data-quote-client-save]').forEach(btn => btn.addEventListener('click', event => { event.preventDefault(); saveNewClientFromModal(); }));
    saveBtns.forEach(btn => btn.addEventListener('click', save));

    // Toggle subrent fields visibility
    root.querySelectorAll('[data-quote-stage-subrent-enabled]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var block = this.closest('[data-quote-stage-subrent-block]');
        var fields = block && block.querySelector('[data-quote-stage-subrent-fields]');
        if (fields) fields.style.display = this.checked ? '' : 'none';
      });
    });
    // Toggle truss/led subrent fields visibility
    ['truss', 'led'].forEach(function(prefix) {
      root.querySelectorAll('[data-quote-' + prefix + '-subrent-enabled]').forEach(function(cb) {
        cb.addEventListener('change', function() {
          var block = this.closest('[data-quote-' + prefix + '-subrent-block]');
          var fields = block && block.querySelector('[data-quote-' + prefix + '-subrent-fields]');
          if (fields) fields.style.display = this.checked ? '' : 'none';
        });
      });
    });
    // Toggle crew access block when isGuest checked
    root.querySelectorAll('[data-project-crew-field="isGuest"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var wrap = this.closest('.v4-project-crew-access-wrap');
        var access = wrap && wrap.querySelector('.v4-project-crew-access');
        if (access) access.style.display = this.checked ? '' : 'none';
      });
    });
    root.querySelectorAll('[data-quote-equipment-commit]').forEach(btn => btn.addEventListener('click', save));
    root.querySelectorAll('[data-quote-equipment-row-delete], [data-quote-equipment-row-clear]').forEach(btn => btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (clearEquipmentActionRow(btn)) save();
    }));
    ['stage', 'led'].forEach(prefix => {
      root.querySelectorAll(`[data-quote-${prefix}-subrent-supplier-id]`).forEach(select => select.addEventListener('change', () => {
        updateQuoteSubrentorHidden(select, prefix);
        scheduleAutosave();
      }));
      root.querySelectorAll(`[data-quote-${prefix}-add-subrentor]`).forEach(btn => btn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!ROOT.SubrentorsDirectoryUI || !ROOT.SubrentorsDirectoryUI.openSubrentorModal) {
          toast('Справочник субарендаторов не загружен');
          return;
        }
        const block = btn.closest(`[data-quote-${prefix}-subrent-block]`);
        ROOT.SubrentorsDirectoryUI.openSubrentorModal({
          onSave: saved => {
            const select = block && block.querySelector(`[data-quote-${prefix}-subrent-supplier-id]`);
            if (select && saved) {
              const exists = Array.from(select.options || []).some(option => option.value === saved.id);
              if (!exists) select.insertAdjacentHTML('beforeend', `<option value="${escapeAttr(saved.id)}">${escapeHtml(saved.name || saved.id)}</option>`);
              select.value = saved.id;
              updateQuoteSubrentorHidden(select, prefix, saved);
            }
            save();
          }
        });
      }));
    });
    root.querySelectorAll('[data-quote-equipment-add-subrentor]').forEach(btn => btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const row = btn.closest('[data-quote-equipment-smart-row]');
      if (!ROOT.SubrentorsDirectoryUI || !ROOT.SubrentorsDirectoryUI.openSubrentorModal) {
        toast('Справочник субарендаторов не загружен');
        return;
      }
      ROOT.SubrentorsDirectoryUI.openSubrentorModal({
        onSave: saved => {
          if (row && saved) {
            const select = row.querySelector('[data-quote-equipment-linked-subrent-supplier-id]');
            const hidden = row.querySelector('[data-quote-equipment-linked-subrent-supplier]');
            if (select) {
              const exists = Array.from(select.options || []).some(option => option.value === saved.id);
              if (!exists) select.insertAdjacentHTML('beforeend', `<option value="${escapeAttr(saved.id)}">${escapeHtml(saved.name || saved.id)}</option>`);
              select.value = saved.id;
            }
            if (hidden) hidden.value = saved.name || '';
          }
          save();
        }
      });
    }));
    root.querySelectorAll('[data-quote-equipment-linked-subrent-supplier-id]').forEach(select => select.addEventListener('change', () => {
      const row = select.closest('[data-quote-equipment-smart-row]');
      const hidden = row && row.querySelector('[data-quote-equipment-linked-subrent-supplier]');
      const supplier = ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(select.value) : null;
      if (hidden) hidden.value = supplier && supplier.name ? supplier.name : (select.options[select.selectedIndex] && select.options[select.selectedIndex].textContent || '');
      scheduleAutosave();
    }));
    root.querySelectorAll('[data-quote-equipment-choice], [data-quote-equipment-manual-field="name"]').forEach(input => {
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        }
      });
    });
    if (crewAddBtn) crewAddBtn.addEventListener('click', () => {
      const current = readCurrent();
      const rows = ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.normalizeAssignments ? ROOT.ProjectCrewAssignments.normalizeAssignments(current.crewAssignments || []) : (current.crewAssignments || []);
      rows.push({ projectRole: 'stagehand', payMode: 'fixed', keyType: 'temporary' });
      saveDraft(model() ? model().mergeQuotePatch(current, { crewAssignments: rows }) : Object.assign({}, current, { crewAssignments: rows }), 'Участник добавлен');
    });
    root.querySelectorAll('[data-project-crew-delete]').forEach(btn => btn.addEventListener('click', () => {
      const row = btn.closest('[data-project-crew-row]');
      if (row) row.remove();
      saveDraft(readCurrent(), 'Участник удалён');
    }));
    root.querySelectorAll('[data-project-crew-field="userId"]').forEach(select => select.addEventListener('change', () => {
      const row = select.closest('[data-project-crew-row]');
      const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      if (row && option) {
        const email = row.querySelector('[data-project-crew-field="userEmail"]');
        const name = row.querySelector('[data-project-crew-field="displayName"]');
        if (email && option.getAttribute('data-email')) email.value = option.getAttribute('data-email');
        if (name && option.getAttribute('data-name')) name.value = option.getAttribute('data-name');
      }
      handleCrewSmartRowChange(row);
    }));
    root.querySelectorAll('[data-project-crew-field]').forEach(input => {
      if (input.getAttribute('data-project-crew-field') === 'userId') return;
      input.addEventListener('change', () => handleCrewSmartRowChange(input.closest('[data-project-crew-row]')));
    });
    root.querySelectorAll('[data-project-crew-copy-key]').forEach(btn => btn.addEventListener('click', () => {
      const row = btn.closest('[data-project-crew-row]');
      const key = row && row.querySelector('[data-project-crew-field="inviteKey"]') && row.querySelector('[data-project-crew-field="inviteKey"]').value;
      if (!key) return toast('Ключ ещё не создан');
      copyText(key);
      toast('Ключ скопирован');
    }));
    root.querySelectorAll('[data-project-crew-generate-key]').forEach(btn => btn.addEventListener('click', () => {
      const row = btn.closest('[data-project-crew-row]');
      if (!row || !ROOT.ProjectCrewAssignments || !ROOT.ProjectCrewAssignments.createOrExtendInvite) return toast('Модуль проектных ключей не загружен');
      const assignment = readCrewRow(row);
      const current = readCurrent();
      const result = ROOT.ProjectCrewAssignments.createOrExtendInvite(Object.assign({}, assignment, { isGuest: true }), current);
      if (!result || !result.ok) return toast('Не удалось создать ключ');
      const keyInput = row.querySelector('[data-project-crew-field="inviteKey"]');
      const idInput = row.querySelector('[data-project-crew-field="inviteId"]');
      const guestInput = row.querySelector('[data-project-crew-field="isGuest"]');
      if (keyInput) keyInput.value = result.invite.key || '';
      if (idInput) idInput.value = result.invite.id || '';
      if (guestInput) guestInput.checked = true;
      saveDraft(readCurrent(), result.profile ? 'Ключ продлён и пользователь назначен на проект' : 'Ключ создан и привязан к проекту');
    }));
    if (ledBtn) ledBtn.addEventListener('click', () => saveDraft(readCurrent(), 'Секция LED сохранена'));
    if (stageBtn) stageBtn.addEventListener('click', () => bindStructureSection('stage'));
    if (trussBtn) trussBtn.addEventListener('click', () => bindStructureSection('truss'));
    if (equipmentBtn) equipmentBtn.addEventListener('click', save);
    if (prevBtn) prevBtn.addEventListener('click', () => tryMove('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => tryMove('next'));
    stepButtons.forEach(btn => btn.addEventListener('click', () => tryMove(btn.getAttribute('data-quote-step-target'))));
    docButtons.forEach(btn => btn.addEventListener('click', () => writeDocumentPreview(btn.getAttribute('data-quote-doc'))));
    if (bomRefreshBtn) bomRefreshBtn.addEventListener('click', () => {
      if (!ROOT.V4QuoteDraftBomSink || !ROOT.V4QuoteDraftBomSink.attachBomSnapshot) {
        toast('V4QuoteDraftBomSink не загружен');
        return;
      }
      const mounted = ROOT.V4QuoteDraftBomSink.attachBomSnapshot(readCurrent(), { source:'quote-wizard-manual-bom-refresh' });
      saveDraft(mounted, 'BOM snapshot обновлён', { source:'quote-wizard-manual-bom-refresh' });
    });
    if (saveProjectBtn) saveProjectBtn.addEventListener('click', () => {
      runBusy('Сохраняю смету в историю проектов…', () => {
        const current = persistDraft(readCurrent(), { source:'quote-wizard-save-project-preflight' });
        if (!ROOT.QuoteProjectStorage || !ROOT.QuoteProjectStorage.saveQuoteAsProject) throw new Error('QuoteProjectStorage не загружен');
        const saved = ROOT.QuoteProjectStorage.saveQuoteAsProject(current);
        toast(`Смета сохранена: ${saved.projectName || 'проект'}`);
        renderWizardMap(root, current);
        return saved;
      }, saveProjectBtn).catch(err => {
        toast(err && err.message ? err.message : 'Не удалось сохранить смету');
        if (console && console.warn) console.warn(err);
      });
    });
    if (newBtn) newBtn.addEventListener('click', () => {
      const next = prepareDraft({ scope: { stage: true, truss: true, led: true }, wizard: { activeStep: 'client' } });
      saveDraft(next, 'Создан новый черновик сметы');
    });
    if (form) {
      const ledFormat = form.querySelector('[data-quote-led-field="format"]');
      if (ledFormat) {
        ledFormat.addEventListener('change', () => {
          applyLedFormatDefaults(form, ledFormat.value);
          scheduleAutosave();
        });
      }
      form.addEventListener('change', event => {
        const target = event.target;
        if (target && target.matches && (target.matches('[data-quote-stage-subrent-enabled]') || target.matches('[data-quote-led-subrent-enabled]'))) {
          const box = target.closest('[data-quote-stage-subrent-block], [data-quote-led-subrent-block]');
          if (box) box.classList.toggle('is-enabled', !!target.checked);
          scheduleAutosave();
          return;
        }
        if (target && target.closest && target.closest('[data-quote-structure-visual]')) return;
        const active = form.getAttribute('data-quote-active-step') || '';
        if (active === 'scope') save();
        else scheduleAutosave();
      });
    }
  }

  function clearEquipmentSmartRow(row) {
    if (!row) return;
    row.querySelectorAll('[data-quote-equipment-choice]').forEach(input => { input.value = ''; });
    row.querySelectorAll('[data-quote-equipment-qty]').forEach(input => { input.value = '0'; });
    row.querySelectorAll('[data-quote-equipment-linked-subrent-supplier], [data-quote-equipment-linked-subrent-supplier-id], [data-quote-equipment-linked-subrent-price], [data-quote-equipment-linked-client-price]').forEach(input => { input.value = ''; });
    row.classList.add('is-empty');
    row.classList.remove('is-selected');
  }

  function clearManualEquipmentRow(row) {
    if (!row) return;
    row.querySelectorAll('[data-quote-equipment-manual-field]').forEach(input => {
      const key = input.getAttribute('data-quote-equipment-manual-field');
      if (input.tagName === 'SELECT') input.value = key === 'sourceType' ? 'manual' : '';
      else if (key === 'qty') input.value = '0';
      else if (key === 'unit') input.value = 'шт';
      else if (['rentalPrice', 'subrentPrice', 'clientPrice', 'margin', 'weightKg', 'powerW'].includes(key)) input.value = '0';
      else input.value = '';
    });
    row.classList.add('is-empty');
    row.classList.remove('is-selected');
    const inner = row.querySelector('.v4-equipment-smart-row');
    if (inner) {
      inner.classList.add('is-empty');
      inner.classList.remove('is-selected');
    }
  }

  function clearEquipmentActionRow(btn) {
    if (!btn || btn.disabled) return false;
    const manual = btn.closest('[data-quote-equipment-manual-row]');
    if (manual) { clearManualEquipmentRow(manual); return true; }
    const smart = btn.closest('[data-quote-equipment-smart-row]');
    if (smart) { clearEquipmentSmartRow(smart); return true; }
    return false;
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
      next = syncVisibleStructureSections(form, next);
      const ledInput = readLedInput(form);
      if (next.scope && next.scope.led && ledInput) {
        if (ledInput.subrentEnabled) next = binder().bindSection(next, 'led', buildLedSubrentSection(ledInput, { source: 'quote-wizard-visible-led-subrent-autosync' }));
        else next = binder().bindLedSection(next, ledInput, { source: 'quote-wizard-visible-led-autosync' });
      }
      const equipmentInput = readEquipmentInput(form, next);
      if ((next.scope.sound || next.scope.light || next.scope.backline || next.scope.services) && equipmentInput && binder().bindEquipmentSection) next = binder().bindEquipmentSection(next, equipmentInput);
    }
    const crewAssignments = readCrewAssignments(form, next);
    if (crewAssignments) next.crewAssignments = crewAssignments;
    next.totals = model().summarizeQuote(next).totals;
    return model().createQuoteDraft(next);
  }

  function syncVisibleStructureSections(form, draft) {
    if (!form || !binder() || !ROOT.V4StructureVisualConfigurator) return draft;
    let next = draft;
    const mounts = form.querySelectorAll('[data-quote-structure-visual]');
    mounts.forEach(mount => {
      const kind = mount.getAttribute('data-quote-structure-visual');
      try {
        if (kind === 'stage' && next.scope && next.scope.stage && ROOT.V4StructureVisualConfigurator.readStageInput) {
          const subrentInput = readStageSubrentInput(form);
          if (subrentInput && subrentInput.subrentEnabled) {
            next = binder().bindSection(next, 'stage', buildStageSubrentSection(subrentInput, { source: 'quote-wizard-visible-stage-subrent-autosync', autoSynced: true }));
          } else {
            const input = ROOT.V4StructureVisualConfigurator.readStageInput(mount);
            const hasDecks = Array.isArray(input.modules) && input.modules.length > 0;
            const hasStairs = Array.isArray(input.stairs) && input.stairs.length > 0;
            if (hasDecks || hasStairs || next.sections && next.sections.stage && next.sections.stage.status === 'configured') {
              next = binder().bindStageSection(next, input, { source: 'quote-wizard-visible-stage-autosync', autoSynced: true });
            }
          }
        }
        if (kind === 'truss' && next.scope && next.scope.truss && ROOT.V4StructureVisualConfigurator.readTrussInput) {
          const input = ROOT.V4StructureVisualConfigurator.readTrussInput(mount);
          const hasItems = Array.isArray(input.items) && input.items.length > 0;
          if (hasItems || next.sections && next.sections.truss && next.sections.truss.status === 'configured') {
            next = binder().bindTrussSection(next, input, { source: 'quote-wizard-visible-truss-autosync', autoSynced: true });
          }
        }
      } catch (err) {
        if (console && console.warn) console.warn('QuoteWizard structure autosync skipped', kind, err);
      }
    });
    return next;
  }

  function updateQuoteSubrentorHidden(select, prefix, supplierRecord) {
    if (!select || !prefix) return null;
    const block = select.closest(`[data-quote-${prefix}-subrent-block]`) || select.closest('[data-quote-form]') || select.parentElement;
    const supplier = supplierRecord || (ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(select.value) : null);
    const selectedText = select.options && select.selectedIndex >= 0 ? (select.options[select.selectedIndex].textContent || '') : '';
    const supplierName = supplier && supplier.name ? supplier.name : selectedText.replace(/ · legacy$/, '').trim();
    const idInput = block && block.querySelector(`[data-quote-${prefix}-subrent-field="supplierId"]`);
    const nameInput = block && block.querySelector(`[data-quote-${prefix}-subrent-field="supplierName"]`);
    if (idInput) idInput.value = select.value || '';
    if (nameInput) nameInput.value = select.value ? supplierName : '';
    return supplier || { id: select.value || '', name: supplierName };
  }

  function enrichQuoteSubrentorData(root, prefix, data) {
    const select = root && root.querySelector(`[data-quote-${prefix}-subrent-supplier-id]`);
    if (!select) return data;
    const supplier = updateQuoteSubrentorHidden(select, prefix);
    data.supplierId = select.value || data.supplierId || '';
    if (!data.supplierName && supplier && supplier.name) data.supplierName = supplier.name;
    return data;
  }

  function readStageSubrentInput(root) {
    if (!root) return null;
    const enabled = root.querySelector('[data-quote-stage-subrent-enabled]');
    if (!enabled || !enabled.checked) return null;
    const data = {};
    root.querySelectorAll('[data-quote-stage-subrent-field]').forEach(field => { data[field.getAttribute('data-quote-stage-subrent-field')] = field.value; });
    enrichQuoteSubrentorData(root, 'stage', data);
    return { subrentEnabled: true, subrent: data, widthM: data.widthM, depthM: data.depthM, stageHeightM: data.heightM };
  }

  function readLedSubrentInput(root) {
    if (!root) return null;
    const enabled = root.querySelector('[data-quote-led-subrent-enabled]');
    if (!enabled || !enabled.checked) return null;
    const data = {};
    root.querySelectorAll('[data-quote-led-subrent-field]').forEach(field => { data[field.getAttribute('data-quote-led-subrent-field')] = field.value; });
    enrichQuoteSubrentorData(root, 'led', data);
    return { subrentEnabled: true, subrent: data, widthM: data.widthM, heightM: data.heightM, pitch: data.pitch };
  }


  function isProjectCrewRowMeaningful(row) {
    if (!row) return false;
    const get = key => {
      const field = row.querySelector(`[data-project-crew-field="${key}"]`);
      if (!field) return '';
      return field.type === 'checkbox' ? (field.checked ? 'true' : '') : String(field.value || '').trim();
    };
    return Boolean(get('userId') || get('userEmail') || get('displayName') || get('isGuest'));
  }

  function isLastProjectCrewRow(row) {
    const list = row && row.closest('[data-project-crew-list]');
    const rows = list ? Array.from(list.querySelectorAll('[data-project-crew-row]')) : [];
    return rows.length ? rows[rows.length - 1] === row : false;
  }

  function readCrewRow(row) {
    const data = {};
    if (!row) return data;
    row.querySelectorAll('[data-project-crew-field]').forEach(input => {
      const key = input.getAttribute('data-project-crew-field');
      data[key] = input.type === 'checkbox' ? input.checked : input.value;
    });
    const selected = row.querySelector('[data-project-crew-field="userId"]');
    if (selected && selected.value) {
      const option = selected.options && selected.selectedIndex >= 0 ? selected.options[selected.selectedIndex] : null;
      if (option) {
        if (!data.userEmail) data.userEmail = option.getAttribute('data-email') || '';
        if (!data.displayName) data.displayName = option.getAttribute('data-name') || option.textContent || '';
      }
    }
    return ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.normalizeAssignment ? ROOT.ProjectCrewAssignments.normalizeAssignment(data) : data;
  }

  function readCrewAssignments(form, draft) {
    if (!form || !form.querySelector('[data-project-crew-panel]')) return null;
    const rows = Array.from(form.querySelectorAll('[data-project-crew-row]')).map(readCrewRow);
    return ROOT.ProjectCrewAssignments && ROOT.ProjectCrewAssignments.normalizeAssignments ? ROOT.ProjectCrewAssignments.normalizeAssignments(rows) : rows;
  }

  function readLedInput(form) {
    if (!form) return null;
    const subrentInput = readLedSubrentInput(form);
    if (subrentInput) return subrentInput;
    const constructor = form.querySelector('[data-quote-led-constructor]');
    if (constructor) {
      try {
        if (ROOT.LedCalculatorUI && ROOT.LedCalculatorUI.getLedInput) {
          const input = ROOT.LedCalculatorUI.getLedInput(constructor);
          if (input) return input;
        }
        if (constructor._v4QuoteLedInput) return constructor._v4QuoteLedInput;
      } catch (err) {
        if (console && console.warn) console.warn('QuoteWizard LED constructor read skipped', err);
      }
    }
    const fields = form.querySelectorAll('[data-quote-led-field]');
    if (!fields.length) return null;
    const out = {};
    fields.forEach(field => { out[field.dataset.quoteLedField] = field.value; });
    return out;
  }


  function readEquipmentInput(form, quote) {
    if (!form || !ROOT.QuoteEquipmentPicker) return null;
    const hasVisibleEquipmentPanel = Boolean(form.querySelector('[data-quote-equipment-panel]'));
    const hasEquipmentControls = hasVisibleEquipmentPanel || Boolean(form.querySelector('[data-quote-equipment-smart-row], [data-quote-equipment-item], [data-quote-equipment-manual-row], [data-quote-equipment-manual]'));
    if (!hasEquipmentControls) return null;
    const items = [];
    const itemInputs = form.querySelectorAll('[data-quote-equipment-item]');
    itemInputs.forEach(input => {
      const itemId = input.getAttribute('data-quote-equipment-item');
      const qty = Number(input.value || 0);
      if (itemId && qty > 0) {
        const source = form.querySelector(`[data-quote-equipment-source="${cssEscape(itemId)}"]`);
        items.push({ itemId, qty, sourceType: source ? source.value : 'own' });
      }
    });
    const smartRows = form.querySelectorAll('[data-quote-equipment-smart-row]');
    const availableItems = ROOT.QuoteEquipmentPicker.listPickerItems ? ROOT.QuoteEquipmentPicker.listPickerItems(quote && quote.scope || {}) : [];
    smartRows.forEach(row => {
      const choice = row.querySelector('[data-quote-equipment-choice]');
      const qtyInput = row.querySelector('[data-quote-equipment-qty]');
      const category = choice ? choice.getAttribute('data-quote-equipment-category') : row.getAttribute('data-quote-equipment-smart-row');
      const item = resolveEquipmentChoice(choice ? choice.value : '', category, availableItems);
      const requestedQty = Number(qtyInput && qtyInput.value || 0);
      const availableQty = item ? Math.max(0, Number(item.availableQty || item.ownAvailableQty || 0) || 0) : 0;
      const ownQty = item ? Math.min(requestedQty, availableQty) : 0;
      const deficitQty = item ? Math.max(0, requestedQty - availableQty) : 0;
      const linkedSupplierId = row.querySelector('[data-quote-equipment-linked-subrent-supplier-id]') && row.querySelector('[data-quote-equipment-linked-subrent-supplier-id]').value || '';
      const linkedSupplierRecord = linkedSupplierId && ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(linkedSupplierId) : null;
      const linkedSupplier = (linkedSupplierRecord && linkedSupplierRecord.name) || (row.querySelector('[data-quote-equipment-linked-subrent-supplier]') && row.querySelector('[data-quote-equipment-linked-subrent-supplier]').value) || '';
      const linkedSubrentPrice = Number(row.querySelector('[data-quote-equipment-linked-subrent-price]') && row.querySelector('[data-quote-equipment-linked-subrent-price]').value || 0);
      const linkedClientPriceRaw = Number(row.querySelector('[data-quote-equipment-linked-client-price]') && row.querySelector('[data-quote-equipment-linked-client-price]').value || 0);
      const linkedClientPrice = linkedClientPriceRaw || linkedSubrentPrice || Number(item && item.rentalPrice || 0);
      if (item && requestedQty > 0 && ownQty > 0) {
        items.push({
          itemId: item.id,
          qty: ownQty,
          requestedQty: ownQty,
          originalRequestedQty: requestedQty,
          sourceType: 'own',
          note: deficitQty > 0 ? `own_stock_split_from_${requestedQty}` : ''
        });
      }
      if (item && requestedQty > 0 && deficitQty > 0) {
        items.push({
          itemId: item.id,
          qty: deficitQty,
          requestedQty: deficitQty,
          originalRequestedQty: requestedQty,
          sourceType: 'subrent',
          supplierId: linkedSupplierId,
          supplierName: linkedSupplier,
          subrentPrice: linkedSubrentPrice,
          clientPrice: linkedClientPrice,
          linkedSubrent: true,
          note: `auto_deficit_subrent_from_${requestedQty}`
        });
      }
      if (item && requestedQty > 0 && ownQty <= 0 && deficitQty <= 0) {
        items.push({ itemId: item.id, qty: requestedQty, requestedQty, originalRequestedQty: requestedQty, sourceType: 'own' });
      }
    });
    const dedupedItems = mergeEquipmentInputItems(items);
    const manualItems = [];
    const manualRows = form.querySelectorAll('[data-quote-equipment-manual-row]');
    manualRows.forEach(row => {
      const manual = {};
      row.querySelectorAll('[data-quote-equipment-manual-field]').forEach(input => {
        manual[input.getAttribute('data-quote-equipment-manual-field')] = input.value;
      });
      if (manual.name && Number(manual.qty || 0) > 0) {
        if (manual.sourceType === 'subrent' && !Number(manual.clientPrice || 0)) manual.clientPrice = manual.subrentPrice || manual.rentalPrice || manual.price || 0;
        manualItems.push(manual);
      }
    });
    if (!manualRows.length) {
      const manual = {};
      form.querySelectorAll('[data-quote-equipment-manual]').forEach(input => {
        manual[input.getAttribute('data-quote-equipment-manual')] = input.value;
      });
      if (manual.name && Number(manual.qty || 0) > 0) {
        if (manual.sourceType === 'subrent' && !Number(manual.clientPrice || 0)) manual.clientPrice = manual.subrentPrice || manual.rentalPrice || manual.price || 0;
        manualItems.push(manual);
      }
    }
    if (!dedupedItems.length && !manualItems.length && !(quote && quote.sections && quote.sections.equipment)) return null;
    return { scope: quote && quote.scope || {}, items: dedupedItems, manualItems };
  }

  function mergeEquipmentInputItems(items) {
    const byKey = new Map();
    (Array.isArray(items) ? items : []).forEach(row => {
      const itemId = String(row && row.itemId || '').trim();
      if (!itemId) return;
      const sourceType = String(row.sourceType || 'own');
      const supplierId = String(row.supplierId || '').trim();
      const supplierName = String(row.supplierName || '').trim();
      const subrentPrice = Number(row.subrentPrice || 0);
      const clientPrice = Number(row.clientPrice || 0);
      const key = sourceType === 'subrent'
        ? `${itemId}::${sourceType}::${supplierId || supplierName}::${subrentPrice}::${clientPrice}`
        : `${itemId}::${sourceType}`;
      const current = byKey.get(key) || { itemId, qty: 0, sourceType, supplierId, supplierName, subrentPrice, clientPrice, linkedSubrent: row.linkedSubrent === true, note: row.note || '', originalRequestedQty: Number(row.originalRequestedQty || 0) };
      current.qty += Number(row.qty || 0);
      if (row.originalRequestedQty) current.originalRequestedQty = Math.max(Number(current.originalRequestedQty || 0), Number(row.originalRequestedQty || 0));
      if (supplierId) current.supplierId = supplierId;
      if (supplierName) current.supplierName = supplierName;
      if (subrentPrice) current.subrentPrice = subrentPrice;
      if (clientPrice) current.clientPrice = clientPrice;
      if (row.linkedSubrent) current.linkedSubrent = true;
      byKey.set(key, current);
    });
    return Array.from(byKey.values()).filter(row => row.qty > 0);
  }

  function resolveEquipmentChoice(value, category, items) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.toLowerCase();
    const codeLike = raw.split('—')[0].split('- ')[0].trim().toLowerCase();
    const safeItems = (Array.isArray(items) ? items : []).filter(item => !category || item.category === category);
    return safeItems.find(item => String(item.id || '').toLowerCase() === normalized)
      || safeItems.find(item => String(item.code || '').toLowerCase() === normalized || String(item.code || '').toLowerCase() === codeLike)
      || safeItems.find(item => equipmentOptionLabel(item).toLowerCase() === normalized)
      || safeItems.find(item => String(item.name || '').toLowerCase() === normalized)
      || safeItems.find(item => String(item.code || '').toLowerCase().includes(normalized) || String(item.name || '').toLowerCase().includes(normalized));
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
