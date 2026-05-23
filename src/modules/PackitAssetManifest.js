(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const BASE_PATH = GLOBAL.PACKIT_ASSET_BASE_PATH || 'public/assets/packit';

  const ASSETS = Object.freeze({
    brand: Object.freeze({
      logo: Object.freeze({
        horizontal: Object.freeze({
          light: `${BASE_PATH}/brand/light/packit_logo_horizontal.png`,
          dark: `${BASE_PATH}/brand/dark/packit_logo_horizontal.png`,
        }),
      }),
      symbol: Object.freeze({
        light: `${BASE_PATH}/brand/light/packit_symbol.png`,
        dark: `${BASE_PATH}/brand/dark/packit_symbol.png`,
      }),
      appIcon: Object.freeze({
        light: `${BASE_PATH}/brand/light/packit_app_icon_light.png`,
        dark: `${BASE_PATH}/brand/dark/packit_app_icon_light.png`,
      }),
      splash: Object.freeze({
        dark: `${BASE_PATH}/brand/dark/packit_splash_dark.png`,
      }),
    }),

    empty: Object.freeze({
      noProjects: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_no_projects_open_flight_case.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_no_projects_open_flight_case.png`,
      }),
      warehouseEmpty: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_warehouse_empty_shelf.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_warehouse_empty_shelf.png`,
      }),
      noDocuments: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_no_documents_tech_folder.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_no_documents_tech_folder.png`,
      }),
      noNotifications: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_no_notifications_bell.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_no_notifications_bell.png`,
      }),
      searchNotFound: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_search_not_found_magnifier.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_search_not_found_magnifier.png`,
      }),
      noReports: Object.freeze({
        light: `${BASE_PATH}/empty-states/light/empty_no_reports_report_sheet.png`,
        dark: `${BASE_PATH}/empty-states/dark/empty_no_reports_report_sheet.png`,
      }),
    }),

    support: Object.freeze({
      equipmentCase: makeSupport('support_equipment_case'),
      checklistComplete: makeSupport('support_checklist_complete'),
      deliveryTruck: makeSupport('support_delivery_truck'),
      documentFile: makeSupport('support_document_file'),
      pieChart: makeSupport('support_pie_chart'),
      securityShield: makeSupport('support_security_shield'),
      moduleCubes: makeSupport('support_module_cubes'),
      cloudUpload: makeSupport('support_cloud_upload'),
      routeMap: makeSupport('support_route_map'),
      fileUploadDropzone: makeSupport('support_file_upload_dropzone'),
      filter: makeSupport('support_filter'),
      serverStack: makeSupport('support_server_stack'),
      userAdd: makeSupport('support_user_add'),
      calendar: makeSupport('support_calendar'),
      folder: makeSupport('support_folder'),
      settingsGears: makeSupport('support_settings_gears'),
    }),
  });

  const ALIASES = Object.freeze({
    'brand.logo.horizontal': 'brand.logo.horizontal',
    'brand.symbol': 'brand.symbol',
    'brand.appIcon': 'brand.appIcon',
    'brand.splash': 'brand.splash',

    'empty.noProjects': 'empty.noProjects',
    'empty.warehouseEmpty': 'empty.warehouseEmpty',
    'empty.noDocuments': 'empty.noDocuments',
    'empty.noNotifications': 'empty.noNotifications',
    'empty.searchNotFound': 'empty.searchNotFound',
    'empty.noReports': 'empty.noReports',

    'support.equipmentCase': 'support.equipmentCase',
    'support.checklistComplete': 'support.checklistComplete',
    'support.deliveryTruck': 'support.deliveryTruck',
    'support.documentFile': 'support.documentFile',
    'support.pieChart': 'support.pieChart',
    'support.securityShield': 'support.securityShield',
    'support.moduleCubes': 'support.moduleCubes',
    'support.cloudUpload': 'support.cloudUpload',
    'support.routeMap': 'support.routeMap',
    'support.fileUploadDropzone': 'support.fileUploadDropzone',
    'support.filter': 'support.filter',
    'support.serverStack': 'support.serverStack',
    'support.userAdd': 'support.userAdd',
    'support.calendar': 'support.calendar',
    'support.folder': 'support.folder',
    'support.settingsGears': 'support.settingsGears',
  });

  function makeSupport(name) {
    return Object.freeze({
      light: `${BASE_PATH}/support/light/${name}.png`,
      dark: `${BASE_PATH}/support/dark/${name}.png`,
    });
  }

  function normalizeTheme(theme) {
    const value = String(theme || '').toLowerCase();
    if (value === 'light') return 'light';
    return 'dark';
  }

  function getByPath(object, path) {
    return String(path || '').split('.').reduce((cursor, key) => {
      if (!cursor || !Object.prototype.hasOwnProperty.call(cursor, key)) return null;
      return cursor[key];
    }, object);
  }

  function resolve(id, options) {
    const opts = options || {};
    const canonicalId = ALIASES[id] || id;
    const asset = getByPath(ASSETS, canonicalId);
    const theme = normalizeTheme(opts.theme || detectTheme());

    if (!asset) return opts.fallback || '';
    if (typeof asset === 'string') return asset;
    if (asset[theme]) return asset[theme];
    if (asset.dark) return asset.dark;
    if (asset.light) return asset.light;
    return opts.fallback || '';
  }

  function detectTheme() {
    try {
      const body = GLOBAL.document && GLOBAL.document.body;
      if (!body) return 'dark';
      if (body.classList.contains('light-theme') || body.classList.contains('packit-light-theme')) return 'light';
      if (body.dataset && body.dataset.theme === 'light') return 'light';
    } catch (_) {}
    return 'dark';
  }

  function has(id) {
    return Boolean(getByPath(ASSETS, ALIASES[id] || id));
  }

  function imageHtml(id, options) {
    const opts = options || {};
    const src = resolve(id, opts);
    if (!src) return '';
    const alt = escapeHtml(opts.alt || '');
    const className = opts.className ? ` class="${escapeHtml(opts.className)}"` : '';
    const loading = opts.eager ? '' : ' loading="lazy"';
    return `<img src="${escapeHtml(src)}" alt="${alt}"${className}${loading}>`;
  }

  function list() {
    return ASSETS;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  }

  ROOT.PackitAssetManifest = {
    version: '1.0.2',
    basePath: BASE_PATH,
    assets: ASSETS,
    resolve,
    has,
    imageHtml,
    list,
    detectTheme,
  };
})();
