const CACHE_VERSION = 'PACKIT_HORIZONTAL_LOGO_ASSET_2026_05_23';
const CACHE_NAME = 'packit-horizontal-logo-asset-2026-05-23';
const RUNTIME_CACHE = 'packit-runtime-horizontal-logo-asset-2026-05-23';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './feg_svg_calibration.json',
  './src/README.md',
  './src/styles/main.css',
  './src/styles/tokens.css',
  './src/styles/reset.css',
  './src/styles/base.css',
  './src/styles/components/shell.css',
  './src/styles/components/brand-shell.css',
  './src/styles/components/layout.css',
  './src/styles/components/primitives.css',
  './src/styles/components/buttons-forms.css',
  './src/styles/components/tables-status.css',
  './src/styles/components/modals.css',
  './src/styles/modules/admin.css',
  './src/modules/index.js',
  './src/modules/FormatUtils.js',
  './src/modules/DomUtils.js',
  './src/modules/StageGridState.js',
  './src/modules/StageCalculator.js',
  './src/modules/AppSettings.js',
  './src/modules/SupabaseStorage.js',
  './src/modules/ProjectStorage.js',
  './src/modules/ClientsStorage.js',
  './src/modules/ClientsManager.js',
  './src/modules/PwaManager.js',
  './src/modules/ToastManager.js',
  './src/modules/BusyIndicator.js',
  './src/modules/TransportSettings.js',
  './src/modules/PriceWeightSettings.js',
  './src/modules/CalibrationManager.js',
  './src/modules/PdfGenerator.js',
  './src/modules/PackitAssetManifest.js',
  './src/modules/PackitShellBranding.js',
  './src/modules/TrussBlockConstructor.js',
  './src/modules/LoadChecker.js',
  './src/modules/RolePermissions.js',
  './src/modules/DemoAuthProvider.js',
  './src/modules/LocalAuthProvider.js',
  './src/modules/SupabaseAuthAdapter.js',
  './src/modules/SupabaseBackendPack.js',
  './src/modules/QuoteBackendSyncPack.js',
  './src/modules/ServerTestHarness.js',
  './src/modules/AuthProvider.js',
  './src/modules/AuthGuards.js',
  './src/modules/AuthShell.js',
  './src/modules/AdminShell.js',
  './src/modules/AdminControlCenter.js',
  './src/modules/DataQualityCenter.js',
  './src/modules/ReportsCenter.js',
  './src/modules/CommandCenter.js',
  './src/modules/CommunicationCenter.js',
  './src/modules/AccessOnboardingPanel.js',
  './src/modules/EquipmentDatabase.js',
  './src/modules/EquipmentDatabaseUI.js',
  './src/modules/LedCalculator.js',
  './src/modules/LedCalculatorUI.js',
  './src/modules/V4StructureConfigurator.js',
  './src/modules/V4StructureVisualConfigurator.js',
  './src/modules/V4SharedBomBridge.js',
  './src/modules/V4LedBomBridge.js',
  './src/modules/V4UnifiedBomExport.js',
  './src/modules/V4BomContract.js',
  './src/modules/SiteChecklist.js',
  './src/modules/ProjectCrewAssignments.js',
  './src/modules/UserDashboard.js',
  './src/modules/QuickTechnicalSheets.js',
  './src/modules/QuickCalculators.js',
  './src/modules/QuoteModel.js',
  './src/modules/QuoteDraftStorage.js',
  './src/modules/QuoteProjectStorage.js',
  './src/modules/QuoteEquipmentPicker.js',
  './src/modules/QuoteSectionBinder.js',
  './src/modules/QuoteSummaryBuilder.js',
  './src/modules/AvailabilityChecker.js',
  './src/modules/WarehousePickListBuilder.js',
  './src/modules/V4StabilizationSmokeMap.js',
  './src/modules/visual/StageVisualAdapter.js',
  './src/modules/visual/TrussVisualAdapter.js',
  './src/modules/visual/LedVisualAdapter.js',
  './src/modules/visual/AudioVisualAdapter.js',
  './src/modules/visual/LightVisualAdapter.js',
  './src/modules/visual/VisualModelBuilder.js',
  './src/modules/visual/ProjectRenderer2D.js',
  './src/modules/visual/ProjectRendererIso.js',
  './src/modules/visual/VisualExport.js',
  './src/modules/visual/VisualPreviewPanel.js',
  './src/modules/QuickPdfExport.js',
  './src/modules/SupplierDirectory.js',
  './src/modules/SubrentorsDirectoryUI.js',
  './src/modules/SubrentPlanner.js',
  './src/modules/ReservationPlanner.js',
  './src/modules/StockMovementPlanner.js',
  './src/modules/WarehouseWorkflow.js',
  './src/modules/WarehouseOperationsHub.js',
  './src/modules/PdfTemplateEngine.js',
  './src/modules/DocumentCenter.js',
  './src/modules/WorkspaceSettings.js',
  './src/modules/SettingsPanel.js',
  './src/modules/CalendarIntegration.js',
  './src/modules/QuoteDocumentBuilder.js',
  './src/modules/QuoteItemBuilder.js',
  './src/modules/V4QuoteDraftBomSink.js',
  './src/modules/V4QuoteDraftHydrator.js',
  './src/modules/V4BomInspector.js',
  './src/modules/BackendSyncAdapter.js',
  './src/modules/SupabaseSyncConsole.js',
  './src/modules/BackendWriteDryRun.js',
  './src/modules/QuoteServerSyncQueue.js',
  './src/modules/EquipmentServerSyncQueue.js',
  './src/modules/ProjectAuditLog.js',
  './src/modules/ImportRestoreCenter.js',
  './src/modules/ClientProjectLinks.js',
  './src/modules/ProjectTimelineView.js',
  './src/modules/ProjectReadinessChecklist.js',
  './src/modules/QuoteProjectsUI.js',
  './src/modules/V4ClientsPanel.js',
  './src/modules/QuoteWizard.js',
  './src/modules/V4DesignSystem.js',
  './src/modules/V4AppShell.js',
  './public/assets/packit/brand/dark/packit_symbol.png',
  './public/assets/packit/brand/dark/packit_logo_horizontal.png',
  './stage-deck-texture.png',
  './led-cabinet-texture.png',
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
