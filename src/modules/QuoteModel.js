(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const QUOTE_MODEL_VERSION = '1.0.0';
  const QUOTE_APP_VERSION = '3.9.0';

  const QUOTE_STATUSES = Object.freeze([
    { id: 'draft', name: 'Черновик' },
    { id: 'in_work', name: 'В работе' },
    { id: 'sent', name: 'Отправлено клиенту' },
    { id: 'confirmed', name: 'Подтверждён' },
    { id: 'cancelled', name: 'Отменён' },
    { id: 'done', name: 'Завершён' }
  ]);

  const TRANSPORT_VEHICLES = Object.freeze([
    { id: 'cargo', name: 'Грузовой' },
    { id: 'passenger', name: 'Легковой' },
    { id: 'trailer', name: 'Прицеп' }
  ]);

  const DEFAULT_TRANSPORT_TARIFF = Object.freeze({ cityPrice: 4000, pricePerKm: 35 });
  const TRANSPORT_TARIFFS = Object.freeze({
    cargo: Object.freeze({ ...DEFAULT_TRANSPORT_TARIFF }),
    passenger: Object.freeze({ ...DEFAULT_TRANSPORT_TARIFF }),
    trailer: Object.freeze({ ...DEFAULT_TRANSPORT_TARIFF })
  });

  function normalizeTransportVehicle(value) {
    const id = toText(value || 'cargo');
    return TRANSPORT_VEHICLES.some(row => row.id === id) ? id : 'cargo';
  }

  function getTransportVehicleLabel(value) {
    const id = normalizeTransportVehicle(value);
    const row = TRANSPORT_VEHICLES.find(item => item.id === id);
    return row ? row.name : 'Грузовой';
  }

  function normalizeTransportTariff(input) {
    const src = input || {};
    return {
      cityPrice: money(src.cityPrice == null ? DEFAULT_TRANSPORT_TARIFF.cityPrice : src.cityPrice),
      pricePerKm: Math.max(0, toNumber(src.pricePerKm == null ? DEFAULT_TRANSPORT_TARIFF.pricePerKm : src.pricePerKm, DEFAULT_TRANSPORT_TARIFF.pricePerKm))
    };
  }

  function normalizeTransportTariffs(input) {
    const src = input || {};
    return TRANSPORT_VEHICLES.reduce((acc, vehicle) => {
      const fallback = TRANSPORT_TARIFFS[vehicle.id] || DEFAULT_TRANSPORT_TARIFF;
      acc[vehicle.id] = normalizeTransportTariff(Object.assign({}, fallback, src[vehicle.id] || {}));
      return acc;
    }, {});
  }

  function getTransportTariff(vehicleType, tariffs) {
    const id = normalizeTransportVehicle(vehicleType);
    const normalized = tariffs && tariffs[id] ? normalizeTransportTariffs(tariffs) : normalizeTransportTariffs();
    return normalized[id] || normalizeTransportTariff();
  }

  function applySelectedTransportTariff(input) {
    const src = input || {};
    const vehicleType = normalizeTransportVehicle(src.vehicleType || src.vehicle || src.type);
    const tariffs = normalizeTransportTariffs(src.tariffs || src.vehicleTariffs || {});
    const selectedTariff = tariffs[vehicleType] || normalizeTransportTariff();
    return normalizeTransport(Object.assign({}, src, {
      vehicleType,
      tariffs,
      cityPrice: selectedTariff.cityPrice,
      pricePerKm: selectedTariff.pricePerKm
    }));
  }

  const DEFAULT_SCOPE = Object.freeze({
    stage: false,
    truss: false,
    led: false,
    sound: false,
    light: false,
    backline: false,
    services: false,
    transport: true
  });

  const SECTION_KEYS = Object.freeze(['stage', 'truss', 'led', 'equipment']);

  function makeId(prefix) {
    return `${prefix || 'quote'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function money(value) {
    return Math.max(0, Math.round(toNumber(value, 0)));
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value || null)); }
    catch (_) { return value; }
  }

  function normalizeStatus(status) {
    const id = toText(status || 'draft');
    return QUOTE_STATUSES.some(row => row.id === id) ? id : 'draft';
  }

  function normalizeScope(scope) {
    const src = scope || {};
    return Object.keys(DEFAULT_SCOPE).reduce((acc, key) => {
      acc[key] = Boolean(src[key]);
      return acc;
    }, {});
  }

  function normalizeWizard(input, draft) {
    const src = input || {};
    const steps = getEnabledWizardSteps(draft || {});
    const fallback = steps[0] || 'client';
    const activeStep = toText(src.activeStep || fallback);
    return {
      activeStep: steps.includes(activeStep) ? activeStep : fallback
    };
  }

  function normalizeClient(input) {
    const src = input || {};
    return {
      id: toText(src.id),
      name: toText(src.name || src.client || src.company),
      company: toText(src.company),
      phone: toText(src.phone),
      email: toText(src.email),
      contactName: toText(src.contactName),
      contactPhone: toText(src.contactPhone),
      notes: toText(src.notes)
    };
  }

  function normalizeProject(input) {
    const src = input || {};
    return {
      name: toText(src.name || src.projectName),
      manager: toText(src.manager),
      tags: Array.isArray(src.tags) ? src.tags.map(toText).filter(Boolean) : [],
      comment: toText(src.comment || src.notes)
    };
  }

  function normalizeVenue(input) {
    const src = input || {};
    return {
      name: toText(src.name || src.venueName),
      address: toText(src.address),
      date: toText(src.date),
      startTime: toText(src.startTime),
      endTime: toText(src.endTime),
      contactName: toText(src.contactName),
      contactPhone: toText(src.contactPhone),
      notes: toText(src.notes)
    };
  }

  function normalizeTransport(input) {
    const src = input || {};
    const mode = src.mode === 'out_of_city' || src.mode === 'distance' ? 'out_of_city' : 'city';
    const vehicleType = normalizeTransportVehicle(src.vehicleType || src.vehicle || src.type);
    const tariffs = normalizeTransportTariffs(src.tariffs || src.vehicleTariffs || {});
    const selectedTariff = tariffs[vehicleType] || normalizeTransportTariff();
    const cityPrice = money(src.cityPrice == null ? selectedTariff.cityPrice : src.cityPrice);
    const pricePerKm = Math.max(0, toNumber(src.pricePerKm == null ? selectedTariff.pricePerKm : src.pricePerKm, selectedTariff.pricePerKm));
    const distanceKm = Math.max(0, toNumber(src.distanceKm, 0));
    const idleHours = Math.max(0, toNumber(src.idleHours, 0));
    const idlePricePerHour = Math.max(0, toNumber(src.idlePricePerHour, 0));
    const manualPrice = src.manualPrice === '' || src.manualPrice == null ? null : money(src.manualPrice);
    return {
      mode,
      vehicleType,
      vehicleLabel: getTransportVehicleLabel(vehicleType),
      tariffs,
      vehicleTariff: { ...selectedTariff },
      cityPrice,
      pricePerKm,
      distanceKm,
      idleHours,
      idlePricePerHour,
      manualPrice,
      addressFrom: toText(src.addressFrom),
      addressTo: toText(src.addressTo),
      notes: toText(src.notes),
      total: calculateTransportTotal({ mode, vehicleType, cityPrice, pricePerKm, distanceKm, idleHours, idlePricePerHour, manualPrice })
    };
  }

  function calculateTransportTotal(transport) {
    const tr = transport || {};
    const tariff = getTransportTariff(tr.vehicleType, tr.tariffs);
    if (tr.manualPrice !== null && tr.manualPrice !== undefined && tr.manualPrice !== '') return money(tr.manualPrice);
    if (tr.mode === 'out_of_city') {
      return money(toNumber(tr.pricePerKm, tariff.pricePerKm) * toNumber(tr.distanceKm, 0) + toNumber(tr.idleHours, 0) * toNumber(tr.idlePricePerHour, 0));
    }
    return money(tr.cityPrice == null ? tariff.cityPrice : tr.cityPrice);
  }

  function normalizeSections(input) {
    const src = input || {};
    return {
      stage: src.stage || null,
      truss: src.truss || null,
      led: src.led || null,
      equipment: src.equipment || { items: [], notes: '' }
    };
  }

  function createQuoteDraft(overrides) {
    const data = overrides || {};
    const createdAt = toText(data.createdAt) || nowIso();
    const transport = normalizeTransport(data.transport);
    const draft = {
      type: 'feg-stage-pro-quote',
      modelVersion: QUOTE_MODEL_VERSION,
      appVersion: data.appVersion || QUOTE_APP_VERSION,
      id: toText(data.id) || makeId('quote'),
      workspaceId: toText(data.workspaceId || 'demo-workspace'),
      ownerId: toText(data.ownerId),
      status: normalizeStatus(data.status),
      client: normalizeClient(data.client),
      project: normalizeProject(data.project),
      venue: normalizeVenue(data.venue),
      transport,
      scope: normalizeScope(data.scope),
      sections: normalizeSections(data.sections),
      totals: normalizeTotals(data.totals),
      history: Array.isArray(data.history) ? data.history.slice(-50) : [],
      createdAt,
      updatedAt: toText(data.updatedAt) || createdAt,
      autosavedAt: toText(data.autosavedAt)
    };
    draft.wizard = normalizeWizard(data.wizard, draft);
    draft.totals = summarizeQuote(draft).totals;
    return draft;
  }

  function normalizeTotals(input) {
    const src = input || {};
    return {
      rental: money(src.rental),
      transport: money(src.transport),
      total: money(src.total),
      weightKg: Math.max(0, toNumber(src.weightKg, 0)),
      powerW: Math.max(0, toNumber(src.powerW, 0)),
      startupPowerW: Math.max(0, toNumber(src.startupPowerW, 0)),
      deficitCount: Math.max(0, toNumber(src.deficitCount, 0))
    };
  }

  function getEnabledSectionKeys(draft) {
    const src = draft || {};
    const scope = normalizeScope(src.scope || {});
    const keys = [];
    if (scope.stage) keys.push('stage');
    if (scope.truss) keys.push('truss');
    if (scope.led) keys.push('led');
    if (scope.sound || scope.light || scope.backline || scope.services) keys.push('equipment');
    return keys;
  }

  function getEnabledWizardSteps(draft) {
    const enabled = getEnabledSectionKeys(draft);
    const steps = ['client', 'venue', 'transport', 'scope'];
    enabled.forEach(key => steps.push(key));
    steps.push('summary');
    return steps;
  }

  function validateQuoteStep(stepId, draft) {
    const q = createQuoteDraft(draft || {});
    const errors = [];
    if (stepId === 'client') {
      if (!q.client.name) errors.push('Выберите или создайте клиента.');
      if (!q.project.name) errors.push('Укажите название проекта.');
    }
    if (stepId === 'venue') {
      if (!q.venue.name) errors.push('Укажите название площадки.');
      if (!q.venue.address) errors.push('Укажите адрес площадки.');
      if (!q.venue.date) errors.push('Укажите дату мероприятия.');
    }
    if (stepId === 'transport') {
      if (q.transport.mode === 'out_of_city' && q.transport.distanceKm <= 0) errors.push('Для выезда за город укажите километраж туда-обратно.');
    }
    if (stepId === 'scope') {
      const enabled = getEnabledSectionKeys(q);
      if (!enabled.length && !q.scope.transport) errors.push('Выберите хотя бы один раздел сметы.');
    }
    if (stepId === 'led' && q.scope.led && (!q.sections.led || q.sections.led.status !== 'configured')) errors.push('LED-раздел выбран, но расчёт экрана ещё не добавлен.');
    return { ok: errors.length === 0, errors };
  }

  function validateQuote(draft) {
    const q = createQuoteDraft(draft || {});
    const steps = getEnabledWizardSteps(q);
    const errors = steps.flatMap(step => validateQuoteStep(step, q).errors.map(message => ({ step, message })));
    return { ok: errors.length === 0, errors, steps };
  }

  function readSectionMetric(section, keys) {
    const src = section || {};
    for (const key of keys) {
      const value = src[key];
      if (Number.isFinite(Number(value))) return Number(value);
    }
    return 0;
  }

  function summarizeQuote(draft) {
    const q = { ...(draft || {}) };
    const sections = normalizeSections(q.sections);
    const transport = normalizeTransport(q.transport);
    let rental = 0;
    let weightKg = 0;
    let powerW = 0;
    let startupPowerW = 0;

    SECTION_KEYS.forEach(key => {
      const section = sections[key];
      if (!section) return;
      rental += readSectionMetric(section, ['total', 'rental', 'price', 'rentalTotal']);
      weightKg += readSectionMetric(section, ['weightKg', 'weight', 'totalWeightKg']);
      powerW += readSectionMetric(section, ['powerW', 'power', 'totalPowerW']);
      startupPowerW += readSectionMetric(section, ['startupPowerW', 'totalStartupPowerW']);
    });

    const equipmentItems = sections.equipment && Array.isArray(sections.equipment.items) ? sections.equipment.items : [];
    equipmentItems.forEach(row => {
      const qty = Math.max(0, toNumber(row.qty, 0));
      rental += Math.max(0, toNumber(row.rentalPrice || row.price, 0)) * qty;
      weightKg += Math.max(0, toNumber(row.weightKg, 0)) * qty;
      powerW += Math.max(0, toNumber(row.powerW, 0)) * qty;
      startupPowerW += Math.max(0, toNumber(row.startupPowerW, 0)) * qty;
    });

    const transportTotal = calculateTransportTotal(transport);
    const totals = normalizeTotals({ rental, transport: transportTotal, total: rental + transportTotal, weightKg, powerW, startupPowerW });
    const scope = normalizeScope(q.scope || {});
    const enabledSections = [];
    if (scope.stage) enabledSections.push('stage');
    if (scope.truss) enabledSections.push('truss');
    if (scope.led) enabledSections.push('led');
    if (scope.sound || scope.light || scope.backline || scope.services) enabledSections.push('equipment');
    return { totals, enabledSections, transport };
  }

  function setQuoteField(draft, path, value) {
    const q = createQuoteDraft(draft || {});
    const parts = Array.isArray(path) ? path : toText(path).split('.').filter(Boolean);
    if (!parts.length) return q;
    let cursor = q;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
    q.updatedAt = nowIso();
    q.totals = summarizeQuote(q).totals;
    return createQuoteDraft(q);
  }

  function mergeQuotePatch(draft, patch) {
    const q = createQuoteDraft(draft || {});
    const next = deepMerge(q, patch || {});
    next.updatedAt = nowIso();
    next.totals = summarizeQuote(next).totals;
    return createQuoteDraft(next);
  }

  function deepMerge(base, patch) {
    const out = clone(base) || {};
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = deepMerge(out[key], value);
      } else {
        out[key] = clone(value);
      }
    });
    return out;
  }

  function buildQuotePayload(draft) {
    const q = createQuoteDraft(draft || {});
    return {
      ...q,
      totals: summarizeQuote(q).totals,
      validation: validateQuote(q),
      exportedAt: nowIso()
    };
  }

  ROOT.QuoteModel = {
    QUOTE_MODEL_VERSION,
    QUOTE_APP_VERSION,
    QUOTE_STATUSES,
    TRANSPORT_VEHICLES,
    TRANSPORT_TARIFFS,
    DEFAULT_TRANSPORT_TARIFF,
    DEFAULT_SCOPE,
    SECTION_KEYS,
    createQuoteDraft,
    normalizeScope,
    normalizeWizard,
    normalizeTransport,
    normalizeTransportVehicle,
    normalizeTransportTariffs,
    getTransportVehicleLabel,
    getTransportTariff,
    applySelectedTransportTariff,
    calculateTransportTotal,
    getEnabledSectionKeys,
    getEnabledWizardSteps,
    validateQuoteStep,
    validateQuote,
    summarizeQuote,
    setQuoteField,
    mergeQuotePatch,
    buildQuotePayload
  };
})();
