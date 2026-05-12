const CACHE_VERSION = 'FEG_STAGE_PRO_3_13_1_QUOTES_POST_WRITE_VERIFY';
const CACHE_NAME = 'feg-stage-pro-v3-13-1-quotes-post-write-verify';
const RUNTIME_CACHE = 'feg-stage-runtime-v3-13-1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './feg_svg_calibration.json',
  './src/legacy-app.js',
  './src/README.md',
  './src/modules/index.js',
  './src/modules/FormatUtils.js',
  './src/modules/DomUtils.js',
  './src/modules/AppBootstrap.js',
  './src/modules/TrussBootstrap.js',
  './src/modules/TrussState.js',
  './src/modules/TrussProjectsUI.js',
  './src/modules/StageGridState.js',
  './src/modules/StageCalculator.js',
  './src/modules/TrussBlockConstructor.js',
  './src/modules/LoadChecker.js',
  './src/modules/RolePermissions.js',
  './src/modules/TestFixtures.js',
  './src/modules/DemoAuthProvider.js',
  './src/modules/SupabaseAuthAdapter.js',
  './src/modules/SupabaseBackendPack.js',
  './src/modules/QuoteBackendSyncPack.js',
  './src/modules/AuthProvider.js',
  './src/modules/AuthGuards.js',
  './src/modules/AuthShell.js',
  './src/modules/AdminShell.js',
  './src/modules/EquipmentDatabase.js',
  './src/modules/EquipmentDatabaseUI.js',
  './src/modules/LedCalculator.js',
  './src/modules/LedCalculatorUI.js',
  './src/modules/UserDashboard.js',
  './src/modules/QuickTechnicalSheets.js',
  './src/modules/QuickCalculators.js',
  './src/modules/QuoteModel.js',
  './src/modules/QuoteDraftStorage.js',
  './src/modules/QuoteProjectStorage.js',
  './src/modules/QuoteLegacyBridge.js',
  './src/modules/QuoteEquipmentPicker.js',
  './src/modules/QuoteSectionBinder.js',
  './src/modules/QuoteSummaryBuilder.js',
  './src/modules/WarehousePickListBuilder.js',
  './src/modules/ProjectAuditLog.js',
  './src/modules/BackendSyncAdapter.js',
  './src/modules/SupabaseSyncConsole.js',
  './src/modules/ImportRestoreCenter.js',
  './src/modules/ClientProjectLinks.js',
  './src/modules/QuoteItemBuilder.js',
  './src/modules/SubrentPlanner.js',
  './src/modules/ReservationPlanner.js',
  './src/modules/StockMovementPlanner.js',
  './src/modules/WarehouseWorkflow.js',
  './src/modules/WarehouseOperationsHub.js',
  './src/modules/SupplierDirectory.js',
  './src/modules/AvailabilityChecker.js',
  './src/modules/CalendarIntegration.js',
  './src/modules/WorkspaceSettings.js',
  './src/modules/SettingsPanel.js',
  './src/modules/QuoteDocumentBuilder.js',
  './src/modules/ProjectTimelineView.js',
  './src/modules/ProjectReadinessChecklist.js',
  './src/modules/V4ClientsPanel.js',
  './src/modules/QuoteProjectsUI.js',
  './src/modules/QuoteWizard.js',
  './src/modules/V4AppShell.js',
  './src/modules/PdfGenerator.js',
  './src/modules/TransportSettings.js',
  './src/modules/AppSettings.js',
  './src/modules/SupabaseStorage.js',
  './src/modules/ProjectStorage.js',
  './src/modules/ProjectManager.js',
  './src/modules/ClientsStorage.js',
  './src/modules/ClientsManager.js',
  './src/modules/ClientsUI.js',
  './src/modules/PwaManager.js',
  './src/modules/NavigationManager.js',
  './src/modules/ModalManager.js',
  './src/modules/ToastManager.js',
  './src/modules/BusyIndicator.js',
  './src/modules/CalibrationManager.js',
  './src/modules/PriceWeightSettings.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

const OPTIONAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.4/dist/umd/supabase.min.js'
];

function isCoreAssetRequest(url) {
  if (url.origin !== self.location.origin) return false;
  return CORE_ASSETS.some(asset => {
    const assetUrl = new URL(asset, self.location.href);
    return url.pathname === assetUrl.pathname;
  });
}

function isOptionalAssetRequest(url) {
  return OPTIONAL_ASSETS.includes(url.href);
}

function isSensitiveOrApiRequest(url) {
  return url.hostname.includes('supabase.co')
    || url.pathname.includes('/rest/v1/')
    || url.pathname.includes('/auth/v1/')
    || url.pathname.includes('/storage/v1/');
}

function canUseRuntimeCache(url) {
  if (isSensitiveOrApiRequest(url)) return false;
  return url.origin === self.location.origin || isOptionalAssetRequest(url);
}

function putCache(cacheName, request, response) {
  if (!response || response.status !== 200) return response;
  const copy = response.clone();
  caches.open(cacheName).then(cache => cache.put(request, copy)).catch(() => null);
  return response;
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS)
        .then(() => cache.addAll(OPTIONAL_ASSETS).catch(() => null)))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_RUNTIME_CACHE') event.waitUntil(caches.delete(RUNTIME_CACHE));
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (isCoreAssetRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => putCache(CACHE_NAME, event.request, response))
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (!canUseRuntimeCache(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => putCache(RUNTIME_CACHE, event.request, response))
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
