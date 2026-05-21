# Source module map

`src/` contains browser runtime code for the v4-only FEG Stage PRO shell.

The app does not use a bundled framework runtime. Modules are loaded by `index.html` in a fixed order and attach their public API to `window.FEGModules`.

## Runtime areas

- `FormatUtils.js`, `DomUtils.js` — shared formatting and DOM helpers.
- `AppSettings.js`, `WorkspaceSettings.js`, `SettingsPanel.js` — app and workspace configuration.
- `AuthShell.js`, `AuthProvider.js`, `AuthGuards.js`, `RolePermissions.js` — access flow and permissions.
- `AdminShell.js`, `AdminControlCenter.js`, `DataQualityCenter.js`, `ReportsCenter.js`, `CommandCenter.js` — admin and operations panels.
- `StageCalculator.js`, `V4StructureConfigurator.js`, `V4StructureVisualConfigurator.js`, `TrussBlockConstructor.js`, `LedCalculator.js`, `LedCalculatorUI.js` — technical constructors and calculations.
- `QuickCalculators.js`, `QuickTechnicalSheets.js`, `QuickPdfExport.js` — quick constructor UI, technical sheets and PDF export.
- `QuoteModel.js`, `QuoteWizard.js`, `QuoteSectionBinder.js`, `QuoteSummaryBuilder.js`, `QuoteItemBuilder.js` — quote wizard core.
- `EquipmentDatabase.js`, `EquipmentDatabaseUI.js`, `AvailabilityChecker.js` — equipment catalog and availability layer.
- `WarehousePickListBuilder.js`, `WarehouseWorkflow.js`, `WarehouseOperationsHub.js`, `ReservationPlanner.js`, `StockMovementPlanner.js` — warehouse and reservation workflows.
- `DocumentCenter.js`, `PdfGenerator.js`, `PdfTemplateEngine.js`, `QuoteDocumentBuilder.js` — document and PDF generation.
- `SupplierDirectory.js`, `SubrentorsDirectoryUI.js`, `SubrentPlanner.js` — suppliers and subrent planning.
- `SupabaseStorage.js`, `SupabaseBackendPack.js`, `BackendSyncAdapter.js`, `QuoteServerSyncQueue.js`, `EquipmentServerSyncQueue.js`, `ProjectAuditLog.js` — backend-ready sync and audit modules.
- `visual/` — visual model adapters, 2D/isometric renderers and visual export helpers.

## Module rules

- Keep modules small enough to own one area of responsibility.
- Preserve the `window.FEGModules` public contract unless a migration plan updates all consumers.
- Do not add one-off inline styles or local CSS patches for shared UI problems; use shared classes, tokens and `src/styles/main.css`.
- Demo/test data must be guarded and must not be loaded in production by default.
- Historical migration notes belong in `CHANGELOG.md` or archived docs, not in this file.
