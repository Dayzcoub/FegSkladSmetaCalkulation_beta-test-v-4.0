# Architecture map

FEG Stage PRO currently runs as a browser-first Vite/static application. The runtime is assembled by `index.html` through ordered script tags. Modules expose public APIs through `window.FEGModules`.

## Entry points

- `index.html` — script order, external CDN libraries and initial app shell markup.
- `src/styles/main.css` — shared UI system, design tokens, shell layout and technical constructor styling.
- `src/modules/V4AppShell.js` — v4 application shell composition.
- `src/modules/V4DesignSystem.js` — visual design system runtime layer.
- `sw.js` — PWA service worker and asset caching.
- `manifest.json` — PWA metadata.

## Runtime module groups

### Shared utilities

- Formatting: `FormatUtils.js`.
- DOM helpers: `DomUtils.js`.
- Busy/toast/PWA helpers: `BusyIndicator.js`, `ToastManager.js`, `PwaManager.js`.

### Access and workspace

- Roles and permissions: `RolePermissions.js`.
- Auth shell and providers: `AuthShell.js`, `AuthProvider.js`, `AuthGuards.js`, `LocalAuthProvider.js`, `SupabaseAuthAdapter.js`.
- Workspace and settings: `WorkspaceSettings.js`, `SettingsPanel.js`, `AppSettings.js`.
- Admin and operations: `AdminShell.js`, `AdminControlCenter.js`, `DataQualityCenter.js`, `ReportsCenter.js`, `CommandCenter.js`.

### Technical constructors

- Stage calculation: `StageGridState.js`, `StageCalculator.js`.
- Shared structure build: `V4StructureConfigurator.js`, `V4StructureVisualConfigurator.js`.
- Truss blocks and load checks: `TrussBlockConstructor.js`, `LoadChecker.js`.
- LED calculation/UI: `LedCalculator.js`, `LedCalculatorUI.js`.
- Quick flows: `QuickCalculators.js`, `QuickTechnicalSheets.js`, `QuickPdfExport.js`.

### Quote wizard

- Quote state and drafts: `QuoteModel.js`, `QuoteDraftStorage.js`, `QuoteProjectStorage.js`.
- Section binding and summary: `QuoteSectionBinder.js`, `QuoteSummaryBuilder.js`, `QuoteItemBuilder.js`.
- Equipment picker: `QuoteEquipmentPicker.js`.
- Main wizard: `QuoteWizard.js`.
- BOM bridges: `V4SharedBomBridge.js`, `V4LedBomBridge.js`, `V4UnifiedBomExport.js`, `V4BomContract.js`, `V4QuoteDraftBomSink.js`, `V4QuoteDraftHydrator.js`, `V4BomInspector.js`.

### Catalog, warehouse and reservations

- Equipment database: `EquipmentDatabase.js`, `EquipmentDatabaseUI.js`.
- Availability: `AvailabilityChecker.js`.
- Warehouse: `WarehousePickListBuilder.js`, `WarehouseWorkflow.js`, `WarehouseOperationsHub.js`.
- Reservations and stock movements: `ReservationPlanner.js`, `StockMovementPlanner.js`.
- Suppliers and subrent: `SupplierDirectory.js`, `SubrentorsDirectoryUI.js`, `SubrentPlanner.js`.

### Documents and visual output

- Documents: `DocumentCenter.js`, `QuoteDocumentBuilder.js`, `PdfGenerator.js`, `PdfTemplateEngine.js`.
- Visual model: `src/modules/visual/VisualModelBuilder.js`.
- Visual adapters: `StageVisualAdapter.js`, `TrussVisualAdapter.js`, `LedVisualAdapter.js`, `AudioVisualAdapter.js`, `LightVisualAdapter.js`.
- Renderers/export: `ProjectRenderer2D.js`, `ProjectRendererIso.js`, `VisualExport.js`, `VisualPreviewPanel.js`.

### Backend-ready layer

- Supabase storage and packs: `SupabaseStorage.js`, `SupabaseBackendPack.js`, `QuoteBackendSyncPack.js`.
- Sync and dry-run: `BackendSyncAdapter.js`, `SupabaseSyncConsole.js`, `BackendWriteDryRun.js`.
- Queues and audit: `QuoteServerSyncQueue.js`, `EquipmentServerSyncQueue.js`, `ProjectAuditLog.js`.
- Import/restore: `ImportRestoreCenter.js`.

## Architectural rules

1. Preserve script order unless the dependency chain is explicitly reviewed.
2. Preserve `window.FEGModules` public module names until consumers are migrated.
3. Keep quick constructors and quote constructors separated by catalog source, while sharing formulas and build logic.
4. Do not mix UI fixes into business logic changes.
5. Do not add production-visible demo/test fixtures without an environment guard.
6. Global UI fixes belong in shared CSS/tokens/classes, not one-off inline styles.
7. Backend writes, warehouse movements, reservations and quote outputs require focused review before changes.
