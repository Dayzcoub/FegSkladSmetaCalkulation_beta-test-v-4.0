(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'fegV4WorkspaceSettings';
  const SETTINGS_VERSION = '3.8.26';

  const DEFAULT_SETTINGS = Object.freeze({
    version: SETTINGS_VERSION,
    workspaceId: 'demo-workspace',
    workspaceName: 'FEG Demo Workspace',
    companyName: 'FEG',
    managerName: '',
    managerEmail: '',
    managerPhone: '',
    locale: 'ru-RU',
    currency: 'RUB',
    documents: {
      customerProposalTitle: 'Коммерческое предложение',
      showWarehouseDetailsInCustomerProposal: false,
      showPricesInTechnicalSheets: false,
      defaultExportFormat: 'txt'
    },
    calendar: {
      enabled: true,
      provider: 'ics',
      defaultCalendarName: 'FEG Projects',
      eventTitleTemplate: 'FEG - {{projectName}}',
      eventDescriptionTemplate: 'Клиент: {{clientName}}\nПлощадка: {{venueName}}\nСостав: {{sections}}\nВес: {{weightKg}} кг\nМощность: {{powerKw}} кВт\nQuote ID: {{quoteId}}'
    },
    dev: {
      enableDemoAuth: true,
      allowLocalExports: true,
      showDebugJson: true
    }
  });

  function storage() {
    try { return GLOBAL.localStorage || null; } catch (err) { return null; }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || String(fallback == null ? '' : fallback);
  }

  function toBool(value, fallback) {
    if (value === true || value === false) return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return Boolean(fallback);
  }

  function deepMerge(base, patch) {
    const out = clone(base || {});
    const src = patch && typeof patch === 'object' ? patch : {};
    Object.keys(src).forEach(key => {
      const value = src[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = deepMerge(out[key], value);
      } else if (value !== undefined) {
        out[key] = value;
      }
    });
    return out;
  }

  function normalizeSettings(raw) {
    const merged = deepMerge(DEFAULT_SETTINGS, raw || {});
    return {
      version: SETTINGS_VERSION,
      workspaceId: toText(merged.workspaceId, DEFAULT_SETTINGS.workspaceId),
      workspaceName: toText(merged.workspaceName, DEFAULT_SETTINGS.workspaceName),
      companyName: toText(merged.companyName, DEFAULT_SETTINGS.companyName),
      managerName: toText(merged.managerName, ''),
      managerEmail: toText(merged.managerEmail, ''),
      managerPhone: toText(merged.managerPhone, ''),
      locale: toText(merged.locale, DEFAULT_SETTINGS.locale),
      currency: toText(merged.currency, DEFAULT_SETTINGS.currency),
      documents: {
        customerProposalTitle: toText(merged.documents && merged.documents.customerProposalTitle, DEFAULT_SETTINGS.documents.customerProposalTitle),
        showWarehouseDetailsInCustomerProposal: toBool(merged.documents && merged.documents.showWarehouseDetailsInCustomerProposal, false),
        showPricesInTechnicalSheets: toBool(merged.documents && merged.documents.showPricesInTechnicalSheets, false),
        defaultExportFormat: ['txt', 'json'].includes(merged.documents && merged.documents.defaultExportFormat) ? merged.documents.defaultExportFormat : DEFAULT_SETTINGS.documents.defaultExportFormat
      },
      calendar: {
        enabled: toBool(merged.calendar && merged.calendar.enabled, true),
        provider: toText(merged.calendar && merged.calendar.provider, DEFAULT_SETTINGS.calendar.provider),
        defaultCalendarName: toText(merged.calendar && merged.calendar.defaultCalendarName, DEFAULT_SETTINGS.calendar.defaultCalendarName),
        eventTitleTemplate: toText(merged.calendar && merged.calendar.eventTitleTemplate, DEFAULT_SETTINGS.calendar.eventTitleTemplate),
        eventDescriptionTemplate: toText(merged.calendar && merged.calendar.eventDescriptionTemplate, DEFAULT_SETTINGS.calendar.eventDescriptionTemplate)
      },
      dev: {
        enableDemoAuth: toBool(merged.dev && merged.dev.enableDemoAuth, true),
        allowLocalExports: toBool(merged.dev && merged.dev.allowLocalExports, true),
        showDebugJson: toBool(merged.dev && merged.dev.showDebugJson, true)
      }
    };
  }

  function loadSettings() {
    const s = storage();
    if (!s) return normalizeSettings(DEFAULT_SETTINGS);
    try {
      const parsed = JSON.parse(s.getItem(STORAGE_KEY) || 'null');
      return normalizeSettings(parsed || DEFAULT_SETTINGS);
    } catch (err) {
      return normalizeSettings(DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    const normalized = normalizeSettings(settings || DEFAULT_SETTINGS);
    const s = storage();
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (err) {}
    }
    return normalized;
  }

  function resetSettings() {
    const normalized = normalizeSettings(DEFAULT_SETTINGS);
    const s = storage();
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (err) {}
    }
    return normalized;
  }

  function replaceTokens(template, context) {
    const ctx = context || {};
    return String(template == null ? '' : template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      const value = Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : '';
      return String(value == null ? '' : value);
    });
  }

  function buildCalendarContext(quote, summary) {
    const q = quote || {};
    const totals = summary && summary.totals ? summary.totals : {};
    const sectionRows = Array.isArray(summary && summary.sectionRows) ? summary.sectionRows : [];
    return {
      projectName: q.project && q.project.name || 'Новый проект',
      clientName: q.client && q.client.name || '—',
      venueName: q.venue && q.venue.name || '—',
      venueAddress: q.venue && q.venue.address || '',
      sections: sectionRows.filter(row => row.configured).map(row => row.title).join(', ') || 'состав уточняется',
      weightKg: Number(totals.weightKg || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 }),
      powerKw: (Number(totals.powerW || 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
      startupPowerKw: (Number(totals.startupPowerW || 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
      quoteId: q.id || '—',
      status: q.status || 'draft'
    };
  }

  function applyCalendarTemplate(quote, summary, settings) {
    const normalized = normalizeSettings(settings || loadSettings());
    const context = buildCalendarContext(quote, summary);
    return {
      title: replaceTokens(normalized.calendar.eventTitleTemplate, context),
      description: replaceTokens(normalized.calendar.eventDescriptionTemplate, context),
      context,
      settings: normalized.calendar
    };
  }

  function exportSettings(settings) {
    return JSON.stringify({
      export_type: 'feg-stage-pro-workspace-settings',
      exported_at: new Date().toISOString(),
      settings: normalizeSettings(settings || loadSettings())
    }, null, 2);
  }

  ROOT.WorkspaceSettings = {
    STORAGE_KEY,
    SETTINGS_VERSION,
    DEFAULT_SETTINGS,
    normalizeSettings,
    loadSettings,
    saveSettings,
    resetSettings,
    replaceTokens,
    buildCalendarContext,
    applyCalendarTemplate,
    exportSettings
  };
})();
