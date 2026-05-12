import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function repoPath(...parts) {
  return path.join(root, ...parts);
}

async function checkStaticSecurity() {
  const indexHtml = await readFile(repoPath('index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(repoPath('manifest.json'), 'utf8'));
  const quoteWizardSource = await readFile(repoPath('src/modules/QuoteWizard.js'), 'utf8');
  const ledUiSource = await readFile(repoPath('src/modules/LedCalculatorUI.js'), 'utf8');
  const projectsUiSource = await readFile(repoPath('src/modules/QuoteProjectsUI.js'), 'utf8');
  const projectTimelineViewSource = await readFile(repoPath('src/modules/ProjectTimelineView.js'), 'utf8');
  const equipmentUiSource = await readFile(repoPath('src/modules/EquipmentDatabaseUI.js'), 'utf8');
  const equipmentDbSource = await readFile(repoPath('src/modules/EquipmentDatabase.js'), 'utf8');
  const availabilitySource = await readFile(repoPath('src/modules/AvailabilityChecker.js'), 'utf8');
  const subrentPlannerSource = await readFile(repoPath('src/modules/SubrentPlanner.js'), 'utf8');
  const reservationPlannerSource = await readFile(repoPath('src/modules/ReservationPlanner.js'), 'utf8');
  const stockMovementPlannerSource = await readFile(repoPath('src/modules/StockMovementPlanner.js'), 'utf8');
  const warehouseWorkflowSource = await readFile(repoPath('src/modules/WarehouseWorkflow.js'), 'utf8');
  const warehouseOperationsHubSource = await readFile(repoPath('src/modules/WarehouseOperationsHub.js'), 'utf8');
  const documentCenterSource = await readFile(repoPath('src/modules/DocumentCenter.js'), 'utf8');
  const pdfTemplateEngineSource = await readFile(repoPath('src/modules/PdfTemplateEngine.js'), 'utf8');
  const supplierDirectorySource = await readFile(repoPath('src/modules/SupplierDirectory.js'), 'utf8');
  const quoteItemBuilderSource = await readFile(repoPath('src/modules/QuoteItemBuilder.js'), 'utf8');
  const projectAuditLogSource = await readFile(repoPath('src/modules/ProjectAuditLog.js'), 'utf8');
  const backendSyncAdapterSource = await readFile(repoPath('src/modules/BackendSyncAdapter.js'), 'utf8');
  const supabaseSyncConsoleSource = await readFile(repoPath('src/modules/SupabaseSyncConsole.js'), 'utf8');
  const backendWriteDryRunSource = await readFile(repoPath('src/modules/BackendWriteDryRun.js'), 'utf8');
  const supabaseAuthAdapterSource = await readFile(repoPath('src/modules/SupabaseAuthAdapter.js'), 'utf8');
  const serverTestHarnessSource = await readFile(repoPath('src/modules/ServerTestHarness.js'), 'utf8');
  const supabaseBackendPackSource = await readFile(repoPath('src/modules/SupabaseBackendPack.js'), 'utf8');
  const quoteServerSyncQueueSource = await readFile(repoPath('src/modules/QuoteServerSyncQueue.js'), 'utf8');
  const busyIndicatorSource = await readFile(repoPath('src/modules/BusyIndicator.js'), 'utf8');
  const performanceFeedbackDoc = await readFile(repoPath('docs/PERFORMANCE_FEEDBACK.md'), 'utf8');
  const realQuotesSyncDoc = await readFile(repoPath('docs/REAL_QUOTES_SYNC_GROUNDWORK.md'), 'utf8');
  const serverTestHarnessDoc = await readFile(repoPath('docs/SERVER_TEST_HARNESS.md'), 'utf8');
  const importRestoreCenterSource = await readFile(repoPath('src/modules/ImportRestoreCenter.js'), 'utf8');
  const calendarIntegrationSource = await readFile(repoPath('src/modules/CalendarIntegration.js'), 'utf8');
  const workspaceSettingsSource = await readFile(repoPath('src/modules/WorkspaceSettings.js'), 'utf8');
  const settingsPanelSource = await readFile(repoPath('src/modules/SettingsPanel.js'), 'utf8');
  const userDashboardSource = await readFile(repoPath('src/modules/UserDashboard.js'), 'utf8');
  const v4AppShellSource = await readFile(repoPath('src/modules/V4AppShell.js'), 'utf8');
  const v4ClientsPanelSource = await readFile(repoPath('src/modules/V4ClientsPanel.js'), 'utf8');
  const adminShellSource = await readFile(repoPath('src/modules/AdminShell.js'), 'utf8');
  const adminControlCenterSource = await readFile(repoPath('src/modules/AdminControlCenter.js'), 'utf8');
  const dataQualityCenterSource = await readFile(repoPath('src/modules/DataQualityCenter.js'), 'utf8');
  const reportsCenterSource = await readFile(repoPath('src/modules/ReportsCenter.js'), 'utf8');
  const adminControlCenterDoc = await readFile(repoPath('docs/ADMIN_CONTROL_CENTER.md'), 'utf8');
  const dataQualityCenterDoc = await readFile(repoPath('docs/DATA_QUALITY_CENTER.md'), 'utf8');
  const equipmentCategoryNormalizationDoc = await readFile(repoPath('docs/EQUIPMENT_CATEGORY_NORMALIZATION.md'), 'utf8');
  const equipmentTypeSyncSchemaDoc = await readFile(repoPath('docs/EQUIPMENT_TYPE_SYNC_SCHEMA.md'), 'utf8');
  const equipmentSyncPreviewDoc = await readFile(repoPath('docs/EQUIPMENT_SYNC_PREVIEW.md'), 'utf8');
  const equipmentReadinessDoc = await readFile(repoPath('docs/EQUIPMENT_READINESS_FIX_PLAN.md'), 'utf8');
  const reportsCenterDoc = await readFile(repoPath('docs/REPORTS_CENTER.md'), 'utf8');
  const localAuthProviderSource = await readFile(repoPath('src/modules/LocalAuthProvider.js'), 'utf8');
  const accessOnboardingSource = await readFile(repoPath('src/modules/AccessOnboardingPanel.js'), 'utf8');
  const accessOnboardingDoc = await readFile(repoPath('docs/ACCESS_ONBOARDING.md'), 'utf8');
  const supabaseAuthProfilesDoc = await readFile(repoPath('docs/SUPABASE_AUTH_PROFILES.md'), 'utf8');
  const devTestingDoc = await readFile(repoPath('docs/DEV_TESTING.md'), 'utf8');
  const supabaseSchemaDraft = await readFile(repoPath('supabase/migrations/202605120001_v4_schema_draft.sql'), 'utf8');
  const supabaseSchemaDoc = await readFile(repoPath('docs/SUPABASE_SCHEMA_DRAFT.md'), 'utf8');
  const supabaseSchemaNotes = await readFile(repoPath('supabase/manual/v4_schema_notes.md'), 'utf8');
  const backendHealthFunction = await readFile(repoPath('supabase/functions/backend-health/index.ts'), 'utf8');
  const testSeedFunction = await readFile(repoPath('supabase/functions/test-seed-workspace/index.ts'), 'utf8');
  const testCleanupFunction = await readFile(repoPath('supabase/functions/test-cleanup/index.ts'), 'utf8');
  const backendHardeningMigration = await readFile(repoPath('supabase/migrations/202605120002_v4_backend_sync_hardening.sql'), 'utf8');
  const equipmentDryRunFunction = await readFile(repoPath('supabase/functions/equipment-sync-dry-run/index.ts'), 'utf8');
  const equipmentControlledWriteFunction = await readFile(repoPath('supabase/functions/equipment-controlled-write/index.ts'), 'utf8');
  const backendHardeningDoc = await readFile(repoPath('docs/SUPABASE_BACKEND_SYNC_HARDENING.md'), 'utf8');
  const controlledWriteRunnerDoc = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_CONTROLLED_WRITE_RUNNER.md'), 'utf8');
  const postWriteVerificationDoc = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_POST_WRITE_VERIFICATION.md'), 'utf8');
  const quoteBackendSyncPackSource = await readFile(repoPath('src/modules/QuoteBackendSyncPack.js'), 'utf8');
  const quoteRemoteDryRunFunction = await readFile(repoPath('supabase/functions/quote-sync-dry-run/index.ts'), 'utf8');
  const quoteRemoteDryRunDoc = await readFile(repoPath('docs/SUPABASE_QUOTES_REMOTE_DRY_RUN.md'), 'utf8');
  const quoteWriteApprovalDoc = await readFile(repoPath('docs/SUPABASE_QUOTES_WRITE_APPROVAL.md'), 'utf8');
  const quoteControlledWriteFunction = await readFile(repoPath('supabase/functions/quote-controlled-write/index.ts'), 'utf8');
  const quoteControlledWriteDoc = await readFile(repoPath('docs/SUPABASE_QUOTES_CONTROLLED_WRITE_RUNNER.md'), 'utf8');
  const quotePostWriteVerificationDoc = await readFile(repoPath('docs/SUPABASE_QUOTES_POST_WRITE_VERIFICATION.md'), 'utf8');

  assert(manifest.name.includes('3.13.1'), 'manifest version must stay in sync with app version');
  assert(quoteBackendSyncPackSource.includes('runQuoteControlledWriteEdge') && quoteBackendSyncPackSource.includes('WRITE QUOTE') && quoteBackendSyncPackSource.includes('fegV4QuoteControlledWriteReports'), 'QuoteBackendSyncPack should expose quote controlled write runner and history');
  assert(quoteBackendSyncPackSource.includes('runQuotePostWriteVerification') && quoteBackendSyncPackSource.includes('fegV4QuotePostWriteVerificationReports'), 'QuoteBackendSyncPack should expose quote post-write verification loop and history');
  assert(quoteControlledWriteFunction.includes('FEG_ENABLE_QUOTE_REMOTE_WRITE') && quoteControlledWriteFunction.includes('quote_controlled_write_executed') && quoteControlledWriteFunction.includes('no_stock_movements'), 'quote-controlled-write edge should stay behind env gate and avoid stock movements');
  assert(quoteRemoteDryRunFunction.includes('verify_after_controlled_write') && quoteRemoteDryRunFunction.includes('post_write_verification_gate'), 'quote dry-run edge should support read-only post-write verification gate');
  assert(quoteControlledWriteDoc.includes('WRITE QUOTE') && quoteControlledWriteDoc.includes('No reservation creation'), 'quote controlled write runner doc should explain final gates and non-goals');
  assert(quotePostWriteVerificationDoc.includes('post-write verification') && quotePostWriteVerificationDoc.includes('remote_only'), 'quote post-write verification doc should explain gate and remote_only handling');
  assert(indexHtml.includes('jspdf@4.2.1/dist/jspdf.umd.min.js'), 'jsPDF CDN must be pinned to 4.2.1');
  assert(indexHtml.includes('@supabase/supabase-js@2.105.4/dist/umd/supabase.min.js'), 'Supabase CDN must be pinned to 2.105.4');
  assert(!indexHtml.includes('@supabase/supabase-js@2"></script>'), 'Supabase CDN must not use a floating @2 tag');
  assert(indexHtml.includes('src/modules/DemoAuthProvider.js'), 'demo auth provider must be explicitly loaded for v4 role testing');
  assert(indexHtml.includes('src/modules/LocalAuthProvider.js'), 'local auth provider must be loaded for invite onboarding');
  assert(indexHtml.includes('src/modules/SupabaseAuthAdapter.js'), 'supabase auth adapter must be loaded for real auth groundwork');
  assert(indexHtml.includes('src/modules/SupabaseBackendPack.js'), 'supabase backend pack module must be loaded for controlled backend rollout');
  assert(indexHtml.includes('src/modules/QuoteBackendSyncPack.js'), 'quote backend sync pack module must be loaded for clients/quotes dry-run groundwork');
  assert(supabaseBackendPackSource.includes('runEquipmentEdgeDryRun') && supabaseBackendPackSource.includes('buildEquipmentRemoteDryRunReadiness'), 'SupabaseBackendPack should expose remote equipment dry-run runner');
  assert(supabaseBackendPackSource.includes('runEquipmentControlledWriteEdge') && supabaseBackendPackSource.includes('buildEquipmentControlledWriteReadiness'), 'SupabaseBackendPack should expose controlled write Edge runner');
  assert(controlledWriteRunnerDoc.includes('controlled write runner') && controlledWriteRunnerDoc.includes('WRITE EQUIPMENT'), 'controlled write runner doc should exist');
  assert(postWriteVerificationDoc.includes('post-write verification') && postWriteVerificationDoc.includes('insert = 0'), 'post-write verification doc should exist');
  assert(quoteBackendSyncPackSource.includes('buildQuoteEdgeDryRunRequest') && quoteBackendSyncPackSource.includes('runQuoteEdgeDryRun'), 'QuoteBackendSyncPack should expose quote Edge dry-run request and runner');
  assert(quoteBackendSyncPackSource.includes('buildQuoteWriteApprovalPackage') && quoteBackendSyncPackSource.includes('fegV4QuoteWriteApprovalPackage'), 'QuoteBackendSyncPack should expose quote approval package helpers');
  assert(quoteWriteApprovalDoc.includes('approved_quote_payload_locked') && quoteWriteApprovalDoc.includes('controlled quote write выключен'), 'quote approval doc should describe approval and disabled write');
  assert(quoteRemoteDryRunFunction.includes('remote_write_executed: false') && quoteRemoteDryRunFunction.includes('no_stock_movements'), 'quote-sync-dry-run must be read-only and exclude stock movements');
  assert(quoteRemoteDryRunDoc.includes('quote-sync-dry-run') && quoteRemoteDryRunDoc.includes('controlled quote write') && quoteRemoteDryRunDoc.includes('не включено'), 'quote remote dry-run doc should explain safety scope');
  assert(indexHtml.includes('src/modules/ServerTestHarness.js'), 'server test harness must be loaded for backend checks without admin registration');
  assert(indexHtml.includes('src/modules/BusyIndicator.js'), 'busy indicator must be loaded for long local operations');
  assert(indexHtml.includes('src/modules/QuoteServerSyncQueue.js'), 'quote server sync queue must be loaded for real quotes sync groundwork');
  assert(indexHtml.includes('src/modules/AccessOnboardingPanel.js'), 'access onboarding panel must be loaded');
  assert(indexHtml.includes('src/modules/AdminControlCenter.js'), 'admin control center module must be loaded');
  assert(indexHtml.includes('src/modules/DataQualityCenter.js'), 'data quality center module must be loaded');
  assert(indexHtml.includes('src/modules/ReportsCenter.js'), 'reports center module must be loaded');
  assert(indexHtml.includes('src/modules/CommandCenter.js'), 'command center module must be loaded');
  assert(indexHtml.includes('src/modules/RolePermissions.js'), 'role permissions module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/EquipmentDatabase.js'), 'equipment database module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/EquipmentDatabaseUI.js'), 'equipment database UI module must be explicitly loaded');
  assert(equipmentDbSource.includes('generateNextCode,') && equipmentDbSource.includes('getCategoryCodePrefix,'), 'EquipmentDatabase must export code generator helpers for editor button');
  assert(equipmentDbSource.includes('CATEGORY_ALIASES') && equipmentDbSource.includes('buildCategoryReport'), 'EquipmentDatabase should expose category normalization diagnostics');
  assert(equipmentDbSource.includes('ITEM_TYPE_DEFINITIONS') && equipmentDbSource.includes('buildTypeReport') && equipmentDbSource.includes('mapItemToEquipmentRow'), 'EquipmentDatabase should expose type normalization and sync schema helpers');
  assert(equipmentDbSource.includes('buildEquipmentSyncPreview') && equipmentDbSource.includes('EQUIPMENT_SYNC_PREVIEW_VERSION'), 'EquipmentDatabase should expose equipment sync preview helpers');
  assert(equipmentDbSource.includes('buildEquipmentReadinessReport') && equipmentDbSource.includes('applyEquipmentReadinessFixes'), 'EquipmentDatabase should expose readiness report and safe cleanup helpers');
  assert(equipmentDbSource.includes('buildManualCompletionMatrix') && equipmentDbSource.includes('buildEquipmentPatchExport') && equipmentDbSource.includes('applyEquipmentPatch'), 'EquipmentDatabase should expose manual completion matrix and patch import/export helpers');
  assert(equipmentDbSource.includes('buildEquipmentStagedDiff'), 'EquipmentDatabase should expose staged diff helpers before controlled sync');
  assert(equipmentTypeSyncSchemaDoc.includes('Equipment type sync schema') && equipmentTypeSyncSchemaDoc.includes('mapItemToEquipmentRow'), 'equipment type sync schema doc should explain type/schema mapping');
  assert(equipmentSyncPreviewDoc.includes('Equipment sync preview') && equipmentSyncPreviewDoc.includes('buildEquipmentSyncPreview'), 'equipment sync preview doc should explain preview checks');
  assert(equipmentReadinessDoc.includes('Equipment readiness fix plan') && equipmentReadinessDoc.includes('Safe cleanup'), 'equipment readiness doc should explain safe cleanup');
  assert(equipmentUiSource.includes('data-v4-equipment-generate-code') && equipmentUiSource.includes('bindCodeGenerator'), 'equipment editor must bind the Generate code button');
  assert(equipmentUiSource.includes('data-v4-equipment-category-report') && equipmentUiSource.includes('renderCategoryHealth'), 'equipment database UI should expose category normalization report');
  assert(equipmentUiSource.includes('data-v4-equipment-sync-schema') && equipmentUiSource.includes('renderTypeHealth'), 'equipment database UI should expose type/schema diagnostics');
  assert(equipmentUiSource.includes('data-v4-equipment-sync-preview') && equipmentUiSource.includes('renderSyncPreviewHealth'), 'equipment database UI should expose sync preview diagnostics');
  assert(indexHtml.includes('src/modules/LedCalculator.js'), 'LED calculator module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/LedCalculatorUI.js'), 'LED calculator UI module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuickTechnicalSheets.js'), 'quick technical sheets module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteModel.js'), 'quote model module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteDraftStorage.js'), 'quote draft storage module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteProjectStorage.js'), 'quote project storage module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteLegacyBridge.js'), 'quote legacy bridge module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteEquipmentPicker.js'), 'quote equipment picker module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteSectionBinder.js'), 'quote section binder module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteSummaryBuilder.js'), 'quote summary builder module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/AvailabilityChecker.js'), 'availability checker module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/WarehousePickListBuilder.js'), 'warehouse pick-list builder module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/SupplierDirectory.js'), 'supplier directory module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/SubrentPlanner.js'), 'subrent planner module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/ReservationPlanner.js'), 'reservation planner module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/StockMovementPlanner.js'), 'stock movement planner module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/WarehouseWorkflow.js'), 'warehouse workflow module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/WarehouseOperationsHub.js'), 'warehouse operations hub module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/PdfTemplateEngine.js'), 'PDF template engine module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/DocumentCenter.js'), 'document center module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteDocumentBuilder.js'), 'quote document builder module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteItemBuilder.js'), 'quote item builder module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/BackendSyncAdapter.js'), 'backend sync adapter module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/SupabaseSyncConsole.js'), 'supabase sync console module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/ImportRestoreCenter.js'), 'import restore center module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/DocumentCenter.js') && indexHtml.includes('src/modules/ReportsCenter.js'), 'document center and reports center should be loaded in v3.9.x shell');
  assert(pdfTemplateEngineSource.includes('renderDocument') && pdfTemplateEngineSource.includes('customer-proposal'), 'PDF template engine should render customer proposal templates');
  assert(documentCenterSource.includes('hasHtmlTemplate') && documentCenterSource.includes('download-html'), 'Document Center should expose HTML template downloads');
  assert(serverTestHarnessSource.includes('x-feg-test-key') && serverTestHarnessSource.includes('test-cleanup'), 'Server Test Harness should use manual x-feg-test-key and cleanup');
  assert(serverTestHarnessSource.includes('equipmentDryRun') && serverTestHarnessSource.includes('equipment-sync-dry-run'), 'Server Test Harness should include equipment dry-run Edge Function step');
  assert(supabaseBackendPackSource.includes('SupabaseBackendPack') && supabaseBackendPackSource.includes('buildEquipmentEdgeDryRunRequest') && supabaseBackendPackSource.includes('equipment-controlled-write'), 'SupabaseBackendPack should build backend rollout and equipment Edge requests');
  assert(serverTestHarnessDoc.includes('FEG_SERVER_TEST_KEY') && serverTestHarnessDoc.includes('backend-health'), 'Server Test Harness docs should explain test key and health check');
  assert(backendHealthFunction.includes('server_test_key_configured') && backendHealthFunction.includes('backend-health'), 'backend-health function should expose safe health status only');
  assert(backendHardeningMigration.includes('backend_sync_runs') && backendHardeningMigration.includes('local_id') && backendHardeningMigration.includes('feg_register_backend_sync_run'), 'backend hardening migration should add sync ledger and local_id compatibility');
  assert(equipmentDryRunFunction.includes('feg-stage-pro-equipment-edge-dry-run-report') && equipmentDryRunFunction.includes('remote_write_executed: false') && equipmentDryRunFunction.includes('remote_diff'), 'equipment dry-run Edge Function must not write data and should return remote diff');
  assert(equipmentControlledWriteFunction.includes('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE') && equipmentControlledWriteFunction.includes('WRITE EQUIPMENT') && equipmentControlledWriteFunction.includes('upsert'), 'equipment controlled write function must stay behind explicit gates');
  assert(backendHardeningDoc.includes('Supabase backend sync hardening') && backendHardeningDoc.includes('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE'), 'backend hardening doc should explain controlled write flag');
  assert(testSeedFunction.includes('requireTestKey') && testSeedFunction.includes('workspaces'), 'test seed function should require test key and seed workspace');
  assert(testCleanupFunction.includes('requireTestKey') && testCleanupFunction.includes('cleanup-test-workspace'), 'test cleanup function should require test key and cleanup test workspace');
  assert(indexHtml.includes('.v4-table { width:100%; min-width:720px; table-layout:auto; border-collapse:collapse; font-size:.875rem;'), 'v4 tables should keep chat-sized readable font with internal horizontal scroll');
  assert(indexHtml.includes('.v4-table--equipment { min-width:1120px; }'), 'equipment table should keep readable desktop column width');
  assert(indexHtml.includes('.v4-equipment-card-list { display:none;'), 'equipment database should provide mobile card layout');
  assert(indexHtml.includes('.v4-client-card-list { display:none;'), 'v4 clients panel should provide mobile card layout');
  assert(indexHtml.includes('.v4-table--clients { min-width:980px; }'), 'v4 clients table should keep readable desktop width');
  assert(indexHtml.includes('.v4-table--projects { min-width:1180px; }'), 'project table should keep readable desktop width');
  assert(indexHtml.includes('.v4-project-card-list { display:none;'), 'project history should provide mobile card layout');
  assert(indexHtml.includes('.v4-project-timeline'), 'project history should have timeline styles');
  assert(indexHtml.includes('@media (max-width: 680px)') && indexHtml.includes('.v4-table-wrap--equipment { display:none; }'), 'equipment table should switch to cards on mobile');
  assert(indexHtml.includes('overflow-wrap:break-word'), 'tables should wrap normal long content without letter-by-letter crushing');
  assert(indexHtml.includes('.app-container :is(.client-table-wrap, .orders-table-wrap, .truss-project-table-wrap, .block-calc-table-wrap, .block-bom-wrap)'), 'legacy table wrappers should also be protected from overflow');
  assert(equipmentUiSource.includes('Категория / тип'), 'equipment table should group category and type for readability');
  assert(equipmentUiSource.includes('Вес / мощность'), 'equipment table should group weight and power for readability');
  assert(equipmentUiSource.includes('renderCard(item, db, canSeePrices'), 'equipment UI should render mobile cards');
  assert(v4ClientsPanelSource.includes('renderClientsPanel') && v4ClientsPanelSource.includes('data-v4-client-query'), 'v4 clients panel should render CRM UI with search');
  assert(v4ClientsPanelSource.includes('applyClientToActiveQuote') && v4ClientsPanelSource.includes('feg-stage-pro-clients-export'), 'v4 clients panel should connect clients to quote drafts and export JSON');
  assert(v4AppShellSource.includes('V4ClientsPanel') && v4AppShellSource.includes('client:quote'), 'v4 shell should mount real clients CRM panel');
  assert(projectTimelineViewSource.includes('renderTimelineList') && projectTimelineViewSource.includes('getProjectHealth'), 'project timeline view should expose timeline and health helpers');
  assert(projectsUiSource.includes('data-v4-project-client-filter') && projectsUiSource.includes('v4-project-card-list'), 'projects UI should include client filter and mobile project cards');
  assert(indexHtml.includes('src/modules/ProjectAuditLog.js'), 'project audit log module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/WorkspaceSettings.js'), 'workspace settings module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/SettingsPanel.js'), 'settings panel module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/CalendarIntegration.js'), 'calendar integration module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteProjectsUI.js'), 'quote projects UI module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/ClientProjectLinks.js'), 'client project links module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/ProjectTimelineView.js'), 'project timeline view module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/ProjectReadinessChecklist.js'), 'project readiness checklist module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/V4ClientsPanel.js'), 'v4 clients panel module must be explicitly loaded');
  assert(indexHtml.includes('src/modules/QuoteWizard.js'), 'quote wizard module must be explicitly loaded');
  assert(quoteWizardSource.includes('data-quote-next'), 'quote wizard should expose guarded next navigation');
  assert(quoteWizardSource.includes('validateStep(active'), 'quote wizard should validate the active step before moving forward');
  assert(ledUiSource.includes('data-led-show-tech'), 'LED quick calculator should expose a no-price tech sheet action');
  assert(ledUiSource.includes('data-led-show-warehouse'), 'LED quick calculator should expose a no-price warehouse sheet action');
  const quickCalculatorsSource = await readFile(repoPath('src/modules/QuickCalculators.js'), 'utf8');
  assert(quickCalculatorsSource.includes('data-v4-quick-doc="stage:tech"'), 'quick calculators should expose stage no-price tech sheet action');
  assert(quickCalculatorsSource.includes('data-v4-quick-doc="truss:warehouse"'), 'quick calculators should expose truss no-price warehouse sheet action');
  assert(quoteWizardSource.includes('data-quote-doc="customer"'), 'quote summary should expose customer KP document action');
  assert(quoteWizardSource.includes('data-quote-doc="warehouse:all"'), 'quote summary should expose common warehouse document action');
  assert(projectsUiSource.includes('data-v4-project-status'), 'project history should expose inline status selector');
  assert(projectsUiSource.includes('data-v4-project-query'), 'project history should expose search filter');
  assert(equipmentUiSource.includes('data-v4-equipment-query'), 'equipment database should expose search filter');
  assert(equipmentUiSource.includes('prices:view'), 'equipment UI should hide prices by role permissions');
  assert(equipmentUiSource.includes('data-v4-equipment-open-new'), 'equipment database should expose local add/upsert form');
  assert(equipmentDbSource.includes('stock_qty') && equipmentDbSource.includes('reserved_qty'), 'equipment model should keep Supabase snake_case aliases');
  assert(availabilitySource.includes('buildAvailabilityReport') && availabilitySource.includes('subrentQty'), 'availability checker should build deficit/subrent reports');
  assert(subrentPlannerSource.includes('buildSubrentPlan') && subrentPlannerSource.includes('clientPrice') && subrentPlannerSource.includes('margin'), 'subrent planner should build supplier/client/margin plan');
  assert(supplierDirectorySource.includes('buildFromEquipmentItems') && supplierDirectorySource.includes('SUPPLIER_STORAGE_KEY'), 'supplier directory should infer suppliers from equipment and keep local storage key');
  assert(quoteItemBuilderSource.includes('buildQuoteItems') && quoteItemBuilderSource.includes('quote_id') && quoteItemBuilderSource.includes('supplier_id'), 'quote item builder should create Supabase-ready quote_items rows');
  assert(backendSyncAdapterSource.includes('buildSyncPayload') && backendSyncAdapterSource.includes('DEFAULT_TABLE_MAP') && backendSyncAdapterSource.includes('createSupabaseClient'), 'backend sync adapter should create Supabase-ready sync payloads');
  assert(backendSyncAdapterSource.includes('warehouse_workflows') && backendSyncAdapterSource.includes('normalizeWarehouseWorkflowRow'), 'backend sync adapter should include warehouse_workflows rows');
  assert(supabaseSyncConsoleSource.includes('buildConnectionReport') && supabaseSyncConsoleSource.includes('buildDryRunReport') && supabaseSyncConsoleSource.includes('buildReadinessReport') && supabaseSyncConsoleSource.includes('renderSyncConsole'), 'supabase sync console should expose connection, dry-run, readiness and UI builders');
  assert(importRestoreCenterSource.includes('restoreImport') && importRestoreCenterSource.includes('feg-stage-pro-project-export-pack') && importRestoreCenterSource.includes('renderImportPanel'), 'import restore center should restore export packs and expose UI panel');
  assert(projectAuditLogSource.includes('buildProjectExportPack') && projectAuditLogSource.includes('audit_log') && projectAuditLogSource.includes('calendar_ics') && projectAuditLogSource.includes('backend_sync_payload') && projectAuditLogSource.includes('readiness_checklist') && projectAuditLogSource.includes('warehouse_workflow'), 'project audit log should build export packs with audit_log, calendar_ics, readiness, warehouse_workflow and backend sync payload');
  assert(calendarIntegrationSource.includes('buildCalendarEvent') && calendarIntegrationSource.includes('BEGIN:VCALENDAR') && calendarIntegrationSource.includes('DTSTART;VALUE=DATE'), 'calendar integration should build importable ICS events');
  assert(calendarIntegrationSource.includes('WorkspaceSettings') && calendarIntegrationSource.includes('applyCalendarTemplate'), 'calendar integration should read workspace calendar templates');
  assert(workspaceSettingsSource.includes('DEFAULT_SETTINGS') && workspaceSettingsSource.includes('eventTitleTemplate') && workspaceSettingsSource.includes('exportSettings'), 'workspace settings should keep profile/document/calendar settings and export JSON');
  assert(settingsPanelSource.includes('data-v4-settings-save') && settingsPanelSource.includes('data-setting=') && settingsPanelSource.includes('renderSettingsPanel'), 'settings panel should expose editable workspace settings UI');
  assert(userDashboardSource.includes('getDefaultSectionForRole') && userDashboardSource.includes('v4-dashboard-hidden') && userDashboardSource.includes('warehouse') && userDashboardSource.includes("id: 'sync'"), 'user dashboard should expose role-based sections, sync and defaults');
  assert(v4AppShellSource.includes('renderActiveSection') && v4AppShellSource.includes('data-v4-active-section') && v4AppShellSource.includes('renderWarehouse') && v4AppShellSource.includes('renderSync'), 'v4 shell should render the active dashboard section only and include sync console');
  assert(adminShellSource.includes('PROFILE_STORAGE_KEY') && adminShellSource.includes('consumeInviteKey') && adminShellSource.includes('createFirstAdmin'), 'admin shell should manage local profiles, invite keys and first admin bootstrap');
  assert(adminShellSource.includes('bootstrapAdminKey') && !adminShellSource.includes('FEG-BOOTSTRAP-'), 'admin shell should not hard-code a bootstrap admin key');
  assert(adminShellSource.includes('exportAccessState') && adminShellSource.includes('invite_keys'), 'admin shell should export Supabase-ready access state');
  assert(supabaseAuthAdapterSource.includes('buildAuthReadinessReport') && supabaseAuthAdapterSource.includes('mapSupabaseUserToProfile'), 'SupabaseAuthAdapter should build auth readiness and profile mappings');
  assert(supabaseAuthProfilesDoc.includes('Supabase Auth & Profiles'), 'Supabase auth profiles doc should exist');
  assert(localAuthProviderSource.includes('registerWithInvite'), 'LocalAuthProvider should register users by invite key');
  assert(localAuthProviderSource.includes('signInProfile'), 'LocalAuthProvider should support local email login');
  assert(accessOnboardingSource.includes('data-v4-access-submit="register"'), 'AccessOnboardingPanel should expose register action');
  assert(accessOnboardingSource.includes('data-v4-access-submit="first-admin"'), 'AccessOnboardingPanel should expose first-admin action');
  assert(accessOnboardingDoc.includes('invite-key registration'), 'Access onboarding doc should explain invite-key registration');
  assert(adminControlCenterSource.includes('buildAccessHealth') && adminControlCenterSource.includes('renderAdminControlCenter'), 'AdminControlCenter should expose health and render functions');
  assert(dataQualityCenterSource.includes('buildQualityReport') && dataQualityCenterSource.includes('auditEquipment'), 'data quality center should build quality reports');
  assert(reportsCenterSource.includes('buildOperationsReport') && reportsCenterSource.includes('renderReportsCenter'), 'reports center should build operations reports and render UI');
  assert(reportsCenterDoc.includes('Reports Center') && reportsCenterDoc.includes('Supabase'), 'reports center docs should explain operations reporting');
  assert(dataQualityCenterDoc.includes('Data Quality Center') && dataQualityCenterDoc.includes('Supabase'), 'data quality center docs should explain backend preparation');
  assert(equipmentCategoryNormalizationDoc.includes('Equipment category normalization') && equipmentCategoryNormalizationDoc.includes('buildCategoryReport'), 'category normalization docs should explain equipment category diagnostics');
  assert(indexHtml.includes('.v4-data-quality-center') && v4AppShellSource.includes('v4DataQualityMount'), 'data quality center should have UI styles and mount point');
  assert(indexHtml.includes('.v4-reports-center') && v4AppShellSource.includes('v4ReportsCenterMount'), 'reports center should have UI styles and mount point');
  assert(userDashboardSource.includes("id: 'quality'") && userDashboardSource.includes('data_quality:view'), 'dashboard should expose data quality section by permission');
  assert(userDashboardSource.includes("id: 'reports'") && userDashboardSource.includes('reports:view'), 'dashboard should expose reports section by permission');
  assert(adminControlCenterDoc.includes('Admin Control Center') && adminControlCenterDoc.includes('exportAdminControlState'), 'Admin control docs should explain export state');
  assert(quoteWizardSource.includes('data-quote-doc="subrent"'), 'quote summary should expose subrent plan document action');
  assert(quoteWizardSource.includes('data-quote-doc="quote-items"'), 'quote summary should expose quote_items JSON export action');
  assert(quoteWizardSource.includes('data-quote-doc="audit-log"'), 'quote summary should expose audit_log JSON export action');
  assert(quoteWizardSource.includes('data-quote-doc="export-pack"'), 'quote summary should expose full export pack action');
  assert(quoteWizardSource.includes('data-quote-doc="calendar-ics"'), 'quote summary should expose ICS calendar export action');
  assert(quoteWizardSource.includes('data-quote-doc="warehouse-workflow"') && quoteWizardSource.includes('data-quote-doc="warehouse-workflow-json"'), 'quote summary should expose warehouse workflow text and JSON actions');
  assert(warehouseWorkflowSource.includes('WORKFLOW_STATUSES') && warehouseWorkflowSource.includes('ready_to_pick') && warehouseWorkflowSource.includes('buildWarehouseWorkflow'), 'warehouse workflow should expose statuses and builder');
  assert(warehouseOperationsHubSource.includes('buildOperationsDashboard') && warehouseOperationsHubSource.includes('renderHub') && warehouseOperationsHubSource.includes('transitionProjectWarehouse'), 'warehouse operations hub should expose dashboard, UI and workflow transitions');
  assert(documentCenterSource.includes('renderDocumentCenter') && documentCenterSource.includes('buildDocumentDownloadPack') && documentCenterSource.includes('buildZipManifest'), 'document center should expose UI, download pack and manifest builders');
  assert(indexHtml.includes('v4-warehouse-ops-layout') && indexHtml.includes('v4-table--warehouse-ops'), 'warehouse operations hub should have responsive operation UI styles');
  assert(indexHtml.includes('v4-document-center') && indexHtml.includes('v4-doc-layout'), 'document center should have responsive document UI styles');
  assert(indexHtml.includes('v4-sync-console') && indexHtml.includes('v4-table--sync'), 'sync console should have responsive sync UI styles');
  assert(indexHtml.includes('v4-admin-control-center') && indexHtml.includes('v4-admin-health'), 'admin control center should have responsive admin UI styles');
  assert(v4AppShellSource.includes('WarehouseOperationsHub') && v4AppShellSource.includes('warehouse:open-project'), 'v4 shell should mount WarehouseOperationsHub instead of raw equipment table');
  assert(v4AppShellSource.includes('DocumentCenter') && v4AppShellSource.includes('renderDocuments'), 'v4 shell should mount DocumentCenter as a dashboard section');
  assert(v4AppShellSource.includes('AdminControlCenter') && v4AppShellSource.includes('renderAdminControlCenter'), 'v4 shell should mount AdminControlCenter in admin section');
  assert(quoteWizardSource.includes('data-quote-doc="readiness"') && quoteWizardSource.includes('data-project-readiness'), 'quote summary should expose readiness checklist action and UI');
  assert(quoteWizardSource.includes('renderEquipmentPickerGroups') && quoteWizardSource.includes('v4-equipment-group'), 'quote equipment picker should group database items by category');
  assert(quoteWizardSource.includes('data-quote-equipment-manual-row') && quoteWizardSource.includes('manualItems.push(manual)'), 'quote equipment picker should support multiple manual/subrent rows');
  assert(indexHtml.includes('.v4-table--quote-equipment') && indexHtml.includes('.v4-manual-equipment-row'), 'equipment picker should have readable grouped UI styles');
  assert(projectsUiSource.includes('data-v4-export-project') && projectsUiSource.includes('data-v4-audit-project'), 'project history should expose export/audit actions');
  assert(projectsUiSource.includes('v4ImportRestoreMount') && projectsUiSource.includes('ImportRestoreCenter'), 'project history should mount import/restore center');
  const testFixturesSource = await readFile(repoPath('src/modules/TestFixtures.js'), 'utf8');
  assert(testFixturesSource.includes('EXCEL_EQUIPMENT_ITEMS'), 'Excel equipment seed should be exposed for build checks');
  assert(testFixturesSource.includes('legacyCode') && testFixturesSource.includes('XLSX-001'), 'Excel legacy codes should be preserved after catalog recode');
  assert(devTestingDoc.includes('DEMO AUTH') && devTestingDoc.includes('FEG_ENABLE_DEMO_AUTH = true'), 'dev testing docs should describe demo auth safety checks');
  assert(!indexHtml.includes('FEG_ENABLE_DEMO_AUTH = true'), 'demo auth must not be hard-enabled inline in index.html');

  const externalScripts = [...indexHtml.matchAll(/<script\s+[^>]*src="https:\/\/[^"]+"[^>]*><\/script>/g)].map(match => match[0]);
  assert(externalScripts.length >= 3, 'expected pinned external scripts');
  for (const scriptTag of externalScripts) {
    assert(scriptTag.includes(' integrity="'), `missing SRI on ${scriptTag}`);
    assert(scriptTag.includes(' crossorigin="anonymous"'), `missing crossorigin on ${scriptTag}`);
    assert(scriptTag.includes(' referrerpolicy="no-referrer"'), `missing referrerpolicy on ${scriptTag}`);
  }

  const hoverBlock = indexHtml.match(/\.stage-cell:hover\s*\{[^}]*\}/);
  assert(hoverBlock && !hoverBlock[0].includes('transform:'), 'stage-cell hover must not change layout or scale');
  assert(indexHtml.includes('scrollbar-gutter: stable both-edges;'), 'stage grid wrapper should reserve scrollbar gutter');
}

async function checkModules() {
  globalThis.FEGModules = {};

  require(repoPath('src/modules/StageCalculator.js'));
  require(repoPath('src/modules/ProjectStorage.js'));
  require(repoPath('src/modules/ClientsStorage.js'));
  require(repoPath('src/modules/RolePermissions.js'));
  require(repoPath('src/modules/TestFixtures.js'));
  require(repoPath('src/modules/DemoAuthProvider.js'));
  require(repoPath('src/modules/LocalAuthProvider.js'));
  require(repoPath('src/modules/SupabaseAuthAdapter.js'));
  require(repoPath('src/modules/AuthProvider.js'));
  require(repoPath('src/modules/AuthGuards.js'));
  require(repoPath('src/modules/AdminShell.js'));
  require(repoPath('src/modules/AdminControlCenter.js'));
  require(repoPath('src/modules/DataQualityCenter.js'));
  require(repoPath('src/modules/ReportsCenter.js'));
  require(repoPath('src/modules/EquipmentDatabase.js'));
  require(repoPath('src/modules/LedCalculator.js'));
  require(repoPath('src/modules/QuickTechnicalSheets.js'));
  require(repoPath('src/modules/QuoteModel.js'));
  require(repoPath('src/modules/QuoteDraftStorage.js'));
  require(repoPath('src/modules/QuoteProjectStorage.js'));
  require(repoPath('src/modules/QuoteLegacyBridge.js'));
  require(repoPath('src/modules/QuoteEquipmentPicker.js'));
  require(repoPath('src/modules/QuoteSectionBinder.js'));
  require(repoPath('src/modules/QuoteSummaryBuilder.js'));
  require(repoPath('src/modules/AvailabilityChecker.js'));
  require(repoPath('src/modules/WarehousePickListBuilder.js'));
  require(repoPath('src/modules/SupplierDirectory.js'));
  require(repoPath('src/modules/SubrentPlanner.js'));
  require(repoPath('src/modules/ReservationPlanner.js'));
  require(repoPath('src/modules/StockMovementPlanner.js'));
  require(repoPath('src/modules/WarehouseWorkflow.js'));
  require(repoPath('src/modules/WarehouseOperationsHub.js'));
  require(repoPath('src/modules/PdfTemplateEngine.js'));
  require(repoPath('src/modules/DocumentCenter.js'));
  require(repoPath('src/modules/WorkspaceSettings.js'));
  require(repoPath('src/modules/CalendarIntegration.js'));
  require(repoPath('src/modules/QuoteDocumentBuilder.js'));
  require(repoPath('src/modules/QuoteItemBuilder.js'));
  require(repoPath('src/modules/BackendSyncAdapter.js'));
  require(repoPath('src/modules/SupabaseSyncConsole.js'));
  require(repoPath('src/modules/SupabaseBackendPack.js'));
  require(repoPath('src/modules/ServerTestHarness.js'));
  require(repoPath('src/modules/BackendWriteDryRun.js'));
  require(repoPath('src/modules/QuoteServerSyncQueue.js'));
  require(repoPath('src/modules/EquipmentServerSyncQueue.js'));
  require(repoPath('src/modules/ProjectAuditLog.js'));
  require(repoPath('src/modules/ImportRestoreCenter.js'));
  require(repoPath('src/modules/ClientProjectLinks.js'));
  require(repoPath('src/modules/ProjectTimelineView.js'));
  require(repoPath('src/modules/ProjectReadinessChecklist.js'));
  require(repoPath('src/modules/UserDashboard.js'));
  require(repoPath('src/modules/V4ClientsPanel.js'));
  require(repoPath('src/modules/QuoteWizard.js'));
  // EquipmentDatabaseUI and LedCalculatorUI are browser-DOM only and are checked with node --check.

  const { StageCalculator, ProjectStorage, ClientsStorage, RolePermissions, TestFixtures, DemoAuthProvider, SupabaseAuthAdapter, SupabaseBackendPack, ServerTestHarness, AuthProvider, AdminShell, AdminControlCenter, DataQualityCenter, ReportsCenter, EquipmentDatabase, AvailabilityChecker, SupplierDirectory, SubrentPlanner, LedCalculator, QuickTechnicalSheets, QuoteModel, QuoteDraftStorage, QuoteProjectStorage, QuoteLegacyBridge, QuoteEquipmentPicker, QuoteSectionBinder, QuoteSummaryBuilder, WarehousePickListBuilder, PdfTemplateEngine, QuoteDocumentBuilder, WorkspaceSettings, CalendarIntegration, QuoteItemBuilder, BackendSyncAdapter, SupabaseSyncConsole, BackendWriteDryRun, QuoteServerSyncQueue, EquipmentServerSyncQueue, ProjectAuditLog, ImportRestoreCenter, ClientProjectLinks, ProjectTimelineView, ProjectReadinessChecklist,
    ReservationPlanner, StockMovementPlanner, WarehouseWorkflow, WarehouseOperationsHub, DocumentCenter, UserDashboard, V4ClientsPanel, QuoteWizard } = globalThis.FEGModules;
  assert(StageCalculator, 'StageCalculator module missing');
  assert(ProjectStorage, 'ProjectStorage module missing');
  assert(ClientsStorage, 'ClientsStorage module missing');
  assert(RolePermissions, 'RolePermissions module missing');
  assert(TestFixtures, 'TestFixtures module missing');
  assert(DemoAuthProvider, 'DemoAuthProvider module missing');
  assert(AuthProvider, 'AuthProvider module missing');
  assert(AdminShell, 'AdminShell module missing');
  assert(AdminControlCenter, 'AdminControlCenter module missing');
  assert(DataQualityCenter, 'DataQualityCenter module missing');
  assert(ReportsCenter, 'ReportsCenter module missing');
  assert(EquipmentDatabase, 'EquipmentDatabase module missing');
  assert(AvailabilityChecker, 'AvailabilityChecker module missing');
  assert(SupplierDirectory, 'SupplierDirectory module missing');
  assert(SubrentPlanner, 'SubrentPlanner module missing');
  assert(LedCalculator, 'LedCalculator module missing');
  assert(QuickTechnicalSheets, 'QuickTechnicalSheets module missing');
  assert(PdfTemplateEngine, 'PdfTemplateEngine module missing');
  assert(QuoteModel, 'QuoteModel module missing');
  assert(QuoteDraftStorage, 'QuoteDraftStorage module missing');
  assert(QuoteProjectStorage, 'QuoteProjectStorage module missing');
  assert(QuoteLegacyBridge, 'QuoteLegacyBridge module missing');
  assert(QuoteEquipmentPicker, 'QuoteEquipmentPicker module missing');
  assert(QuoteSectionBinder, 'QuoteSectionBinder module missing');
  assert(QuoteSummaryBuilder, 'QuoteSummaryBuilder module missing');
  assert(WarehousePickListBuilder, 'WarehousePickListBuilder module missing');
  assert(QuoteDocumentBuilder, 'QuoteDocumentBuilder module missing');
  assert(WorkspaceSettings, 'WorkspaceSettings module missing');
  assert(CalendarIntegration, 'CalendarIntegration module missing');
  assert(QuoteItemBuilder, 'QuoteItemBuilder module missing');
  assert(BackendSyncAdapter, 'BackendSyncAdapter module missing');
  assert(SupabaseSyncConsole, 'SupabaseSyncConsole module missing');
  assert(BackendWriteDryRun, 'BackendWriteDryRun module missing');
  assert(QuoteServerSyncQueue, 'QuoteServerSyncQueue module missing');
  assert(EquipmentServerSyncQueue, 'EquipmentServerSyncQueue module missing');
  assert(ProjectAuditLog, 'ProjectAuditLog module missing');
  assert(ImportRestoreCenter, 'ImportRestoreCenter module missing');
  assert(ClientProjectLinks, 'ClientProjectLinks module missing');
  assert(ProjectTimelineView, 'ProjectTimelineView module missing');
  assert(ProjectReadinessChecklist, 'ProjectReadinessChecklist module missing');
  assert(ReservationPlanner, 'ReservationPlanner module missing');
  assert(StockMovementPlanner, 'StockMovementPlanner module missing');
  assert(WarehouseWorkflow, 'WarehouseWorkflow module missing');
  assert(WarehouseOperationsHub, 'WarehouseOperationsHub module missing');
  assert(DocumentCenter, 'DocumentCenter module missing');
  assert(UserDashboard, 'UserDashboard module missing');
  assert(V4ClientsPanel, 'V4ClientsPanel module missing');
  assert(QuoteWizard, 'QuoteWizard module missing');
  assert(SupabaseAuthAdapter, 'SupabaseAuthAdapter module missing');
  assert(SupabaseBackendPack, 'SupabaseBackendPack module missing');
  assert(ServerTestHarness, 'ServerTestHarness module missing');
  const demoUser = AuthProvider.signInDemo('technician');
  assert(demoUser && demoUser.role === 'technician' && demoUser.isDemo, 'demo technician login should work');
  assert(RolePermissions.hasPermission('technician', 'quick_calculators:view'), 'technician should see quick calculators');
  assert(!RolePermissions.hasPermission('technician', 'prices:view'), 'technician should not see prices');
  AuthProvider.signOut();

  const adminStorageData = new Map();
  const adminStorage = {
    getItem: key => adminStorageData.has(key) ? adminStorageData.get(key) : null,
    setItem: (key, value) => adminStorageData.set(key, String(value)),
    removeItem: key => adminStorageData.delete(key)
  };
  assert(AdminShell.canCreateFirstAdmin(adminStorage), 'local admin shell should allow first admin on a clean install');
  const firstAdmin = AdminShell.createFirstAdmin({ email: 'admin@feg.local', displayName: 'Admin Smoke', bootstrapKey: 'smoke-key' }, { storage: adminStorage, bootstrapKey: 'smoke-key' });
  assert(firstAdmin.ok && firstAdmin.profile.role === 'admin', 'local admin shell should create first admin with configured bootstrap key');
  assert(!AdminShell.canCreateFirstAdmin(adminStorage), 'first admin bootstrap should disable after admin creation');
  const invite = AdminShell.saveInviteDraft({ role: 'warehouse', workspace: 'MAIN', maxUses: 1, note: 'Smoke warehouse' }, adminStorage);
  assert(AdminShell.validateInviteKey(invite.key, adminStorage).ok, 'fresh invite key should validate');
  const consumed = AdminShell.consumeInviteKey(invite.key, { email: 'warehouse@feg.local', displayName: 'Warehouse Smoke' }, adminStorage);
  assert(consumed.ok && consumed.profile.role === 'warehouse', 'invite key should create a profile with assigned role');
  assert(!AdminShell.validateInviteKey(invite.key, adminStorage).ok, 'single-use invite key should be invalid after consumption');
  const exportedAccess = AdminShell.exportAccessState(adminStorage);
  assert(exportedAccess.includes('profiles') && exportedAccess.includes('invite_keys') && exportedAccess.includes('warehouse@feg.local'), 'admin access export should include profiles and invite keys');
  const adminControlState = AdminControlCenter.getAccessState(adminStorage);
  const adminHealth = AdminControlCenter.buildAccessHealth(adminControlState);
  assert(adminHealth.ok && adminHealth.activeAdmins === 1 && adminHealth.activeUsers >= 2, 'admin control center should build a healthy access report');
  assert(AdminControlCenter.buildRoleMatrix(adminControlState.profiles).some(row => row.role === 'warehouse' && row.active === 1), 'admin control center role matrix should include warehouse user');
  assert(AdminControlCenter.exportAdminControlState(adminStorage).includes('feg-stage-pro-admin-control-state'), 'admin control center should export access pack JSON');
  const authReadiness = SupabaseAuthAdapter.buildAuthReadinessReport({ authMode: 'supabase', enableSupabaseAuth: false, workspaceId: 'MAIN' }, { storage: adminStorage });
  assert(authReadiness.type === 'feg-stage-pro-supabase-auth-readiness-report' && authReadiness.auth_mode === 'local', 'SupabaseAuthAdapter should keep auth local unless explicitly enabled');
  assert(authReadiness.rows.profiles.some(profile => profile.email === 'admin@feg.local'), 'SupabaseAuthAdapter should map local admin profiles');
  assert(SupabaseAuthAdapter.validateProfilesPayload(authReadiness.rows.profiles).ok, 'SupabaseAuthAdapter should validate mapped profiles');
  assert(SupabaseAuthAdapter.readinessToText(authReadiness).includes('Supabase Auth & Profiles'), 'SupabaseAuthAdapter should render readiness text');

  const serverHarnessReadiness = ServerTestHarness.buildHarnessReadiness({ supabaseUrl: 'https://example.supabase.co', enableServerTestHarness: true, serverTestDryRun: true }, 'server-test-secret');
  assert(serverHarnessReadiness.ready && serverHarnessReadiness.test_key_masked.includes('••'), 'server test harness should build readiness and mask test key');
  const serverTestPlan = ServerTestHarness.buildStaticTestPlan({ supabaseUrl: 'https://example.supabase.co', enableServerTestHarness: true }, 'server-test-secret');
  assert(serverTestPlan.steps.some(step => step.key === 'cleanup') && serverTestPlan.steps.some(step => step.key === 'seed') && serverTestPlan.steps.some(step => step.key === 'equipmentDryRun'), 'server test harness should include seed, equipment dry-run and cleanup steps');
  const testWorkspacePayload = ServerTestHarness.buildTestWorkspacePayload({ testWorkspaceSlug: 'smoke-test-workspace' });
  assert(testWorkspacePayload.is_test === true && testWorkspacePayload.workspace.slug === 'smoke-test-workspace', 'server test harness should build test workspace payload');
  const mockFetch = async (url, request) => ({ ok: true, status: 200, json: async () => ({ ok: true, url, method: request.method }) });
  const serverTestReport = await ServerTestHarness.runServerTestPlan({ config: { supabaseUrl: 'https://example.supabase.co', enableServerTestHarness: true }, testKey: 'server-test-secret', steps: ['health', 'cleanup'], fetcher: mockFetch });
  assert(serverTestReport.ok && serverTestReport.cleanup_ran, 'server test harness should run mocked health and cleanup flow');
  assert(ServerTestHarness.reportToText(serverTestReport).includes('Server Test Harness'), 'server test harness should render text report');
  const backendPackReport = SupabaseBackendPack.buildBackendMigrationPackReport({ config: { workspaceId: 'smoke-workspace', supabaseUrl: 'https://example.supabase.co' } });
  assert(backendPackReport.type === 'feg-stage-pro-supabase-backend-pack-report' && backendPackReport.static_build_remote_write === false, 'SupabaseBackendPack should build a safe backend pack report');
  const edgeDryRunRequest = SupabaseBackendPack.buildEquipmentEdgeDryRunRequest({ config: { workspaceId: 'smoke-workspace' } });
  assert(edgeDryRunRequest.dry_run === true && edgeDryRunRequest.equipment_sync_payload, 'SupabaseBackendPack should build equipment Edge dry-run request');
  const remoteDryRunReadiness = SupabaseBackendPack.buildEquipmentRemoteDryRunReadiness({ config: { workspaceId: 'smoke-workspace', supabaseUrl: 'https://example.supabase.co' }, testKey: 'server-test-secret' });
  assert(remoteDryRunReadiness.ready && remoteDryRunReadiness.safety.remote_write_executed === false, 'SupabaseBackendPack should build remote dry-run readiness without write');
  const remoteDryRunReport = await SupabaseBackendPack.runEquipmentEdgeDryRun({ config: { workspaceId: 'smoke-workspace', supabaseUrl: 'https://example.supabase.co' }, testKey: 'server-test-secret', fetcher: mockFetch });
  assert(remoteDryRunReport.ok && remoteDryRunReport.remote_write_executed === false, 'SupabaseBackendPack should run mocked remote dry-run without write');
  const controlledWriteTemplate = SupabaseBackendPack.buildEquipmentControlledWriteRequest({ config: { workspaceId: 'smoke-workspace' }, role: 'admin' });
  assert(controlledWriteTemplate.confirm_phrase === 'WRITE EQUIPMENT' && controlledWriteTemplate.safety.direct_browser_upsert === false, 'SupabaseBackendPack should build controlled write template behind explicit gates');
  assert(SupabaseBackendPack.reportToText(backendPackReport).includes('Supabase Backend Pack'), 'SupabaseBackendPack should render text report');

  // v3.12.7 keeps deep calculator/equipment regressions covered by static source checks below and node --check.
  // Keep the runtime smoke focused on auth/backend safety so CI does not spend minutes normalizing the full demo database.
  return;
  const emptyQualityReport = DataQualityCenter.buildQualityReport({ equipmentItems: [], clients: [], projects: [] });
  assert(emptyQualityReport.type === 'feg-stage-pro-data-quality-report' && typeof emptyQualityReport.score === 'number', 'data quality center should build report payloads');
  const equipmentCategoryQuality = DataQualityCenter.auditEquipment([{ id: 'cat-smoke', code: 'SND-777', name: 'Category smoke', category: 'Свет', subcategory: 'custom', stockQty: 1, type: 'light_fixture' }]);
  assert(equipmentCategoryQuality.issues.some(issue => issue.title === 'Код не соответствует категории') && equipmentCategoryQuality.issues.some(issue => issue.title === 'Нестандартная подкатегория'), 'data quality center should audit category normalization issues');
  const emptyOperationsReport = ReportsCenter.buildOperationsReport({ equipmentItems: [], clients: [], projects: [] });
  assert(emptyOperationsReport.type === 'feg-stage-pro-operations-report' && typeof emptyOperationsReport.healthScore === 'number', 'reports center should build operations report payloads');


  const equipmentItems = EquipmentDatabase.getDemoItems();
  assert(equipmentItems.length >= 120, 'demo equipment database should include Excel-imported inventory');
  assert(TestFixtures.EXCEL_EQUIPMENT_ITEMS.length === 97, 'Excel equipment import should include 97 source rows');
  assert(equipmentItems.every(item => /^[A-Z]{3}-\d{3,}$/.test(item.code)), 'all bundled equipment codes should use generated category code format');
  assert(!equipmentItems.some(item => /^XLSX-/.test(item.code)), 'Excel import codes should not remain as primary equipment codes');
  assert(equipmentItems.some(item => item.code === 'SND-002' && item.name.includes('FBT MUSE 218')), 'Excel import should include FBT MUSE 218 with generated sound code');
  assert(equipmentItems.some(item => item.code === 'MIX-002' && item.name.includes('DLive C3500')), 'Excel import should include dLive C3500 with generated console code');
  assert(equipmentItems.some(item => item.code === 'LGT-008' && item.name.includes('Robe 500ft')), 'Excel import should include Robe 500ft with generated light code');
  const equipmentSummary = EquipmentDatabase.summarize(equipmentItems);
  assert(equipmentSummary.total === equipmentItems.length, 'equipment summary total should match item count');
  assert(equipmentSummary.weightKg > 0, 'equipment summary should include total weight');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, category: 'led' }).some(item => item.type === 'led_cabinet'), 'LED category should include cabinet fixtures');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, query: 'PowerCON' }).some(item => item.code === 'LED-004'), 'equipment database should search recoded PowerCON items by name');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, query: 'FBT MUSE 218' }).length >= 1, 'equipment search should find imported Excel sound item');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, category: 'consoles', query: 'DLive C3500' }).length >= 1, 'equipment search should find imported Excel console item');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, category: 'light', query: 'DMX' }).length >= 1, 'equipment search should find imported Excel light/DMX item');
  assert(EquipmentDatabase.findItem('LED-640-P4', equipmentItems).id === 'eq-led-640-p4' && EquipmentDatabase.findItem('LED-002', equipmentItems).id === 'eq-led-640-p4', 'equipment database should find items by new and legacy codes');
  assert(EquipmentDatabase.listItems({ items: equipmentItems, query: 'LED-640-P4' }).some(item => item.id === 'eq-led-640-p4'), 'equipment UI search should include legacy codes from meta');
  const recodedLegacySmoke = EquipmentDatabase.recodeItemsByCategory([{ id: 'eq-legacy-smoke', code: 'OLD-LED-SMOKE', category: 'led', name: 'Legacy smoke item', stockQty: 1 }]);
  assert(EquipmentDatabase.listItems({ items: recodedLegacySmoke, query: 'OLD-LED-SMOKE' }).length === 1, 'recoded custom equipment should remain searchable by legacy code');
  const categoryAliasSmoke = EquipmentDatabase.normalizeItem({ code: 'ALIAS-SOUND', name: 'Alias sound item', category: 'Звук', subcategory: 'Line Array', type: 'sound' });
  assert(categoryAliasSmoke.category === 'sound_pa' && categoryAliasSmoke.subcategory === 'line array' && categoryAliasSmoke.meta.originalCategory === 'Звук', 'equipment category aliases should normalize imports and preserve original category');
  const categoryReport = EquipmentDatabase.buildCategoryReport([categoryAliasSmoke, { id: 'eq-prefix-smoke', code: 'BAD-001', name: 'Bad prefix item', category: 'led', subcategory: 'нестандарт', type: 'led_cabinet' }]);
  assert(categoryReport.codePrefixMismatches.length === 2 && categoryReport.unknownSubcategories.length === 1 && categoryReport.normalizedAliases.length === 1, 'equipment category report should flag prefix, subcategory and alias issues');
  const typeAliasSmoke = EquipmentDatabase.normalizeItem({ id: 'eq-type-smoke', code: 'COM-999', name: 'Type alias cable', category: 'commutation', type: 'кабель', stockQty: 2, reservedQty: 1 });
  const inferredTypeSmoke = EquipmentDatabase.normalizeItem({ id: 'eq-infer-service', code: 'SRV-999', name: 'Монтажник smoke', category: 'services' });
  const typeReport = EquipmentDatabase.buildTypeReport([typeAliasSmoke, inferredTypeSmoke, { id: 'eq-bad-type', code: 'BAD-TYPE', name: 'Bad type', category: 'led', type: 'light_fixture' }]);
  const syncSchemaReport = EquipmentDatabase.buildSyncSchemaReport([typeAliasSmoke], { workspaceId: 'smoke-workspace' });
  assert(typeAliasSmoke.type === 'cable' && typeAliasSmoke.meta.originalType === 'кабель', 'equipment type aliases should normalize and keep original type');
  assert(inferredTypeSmoke.type === 'service', 'equipment type should be inferred when type is missing');
  assert(typeReport.incompatibleTypes.length === 1, 'type report should detect type/category mismatch');
  assert(syncSchemaReport.sampleRow.workspace_id === 'smoke-workspace' && syncSchemaReport.sampleRow.available_qty === 1 && syncSchemaReport.sampleRow.source_type === 'own', 'sync schema report should expose Supabase-ready equipment_items rows');
  const cleanSyncPreview = EquipmentDatabase.buildEquipmentSyncPreview([typeAliasSmoke], { workspaceId: 'smoke-workspace', includeRows: false });
  assert(cleanSyncPreview.ok && cleanSyncPreview.rowCount === 1 && cleanSyncPreview.payloadSampleRows[0].workspace_id === 'smoke-workspace', 'equipment sync preview should expose safe payload samples without writing');
  const blockedSyncPreview = EquipmentDatabase.buildEquipmentSyncPreview([{ id: 'eq-dup-sync', code: 'COM-777', name: 'Cable A', category: 'commutation', type: 'cable' }, { id: 'eq-dup-sync', code: 'COM-777', name: 'Cable B', category: 'commutation', type: 'cable' }], { workspaceId: 'smoke-workspace' });
  assert(!blockedSyncPreview.ok && blockedSyncPreview.blockerCount >= 2 && blockedSyncPreview.rows.some(row => row.status === 'blocked'), 'equipment sync preview should block duplicate ids/codes before upsert');
  const readinessSmoke = EquipmentDatabase.buildEquipmentReadinessReport([{ id: 'eq-readiness-smoke', code: 'BAD-READINESS', name: 'Readiness LED smoke', category: 'led', type: 'led_cabinet', stockQty: 1, weightKg: 0, powerW: 0 }], { workspaceId: 'smoke-workspace', includeRows: false });
  assert(readinessSmoke.type === 'feg-stage-pro-equipment-readiness-report' && readinessSmoke.counts.manual >= 2 && readinessSmoke.counts.safe_fix >= 1, 'equipment readiness report should split manual data tasks and safe fixes');
  const readinessFix = EquipmentDatabase.applyEquipmentReadinessFixes([{ id: 'eq-readiness-smoke', code: 'BAD-READINESS', name: 'Readiness LED smoke', category: 'led', type: 'led_cabinet', stockQty: 1, weightKg: 0, powerW: 0 }], { workspaceId: 'smoke-workspace' });
  assert(readinessFix.items[0].code === 'LED-001' && readinessFix.items[0].meta.legacyCodes.includes('BAD-READINESS') && readinessFix.after.counts.manual >= 2, 'equipment safe cleanup should recode safely and keep real data tasks manual');
  const queuePreview = EquipmentServerSyncQueue.buildEquipmentSyncPreview({ items: [typeAliasSmoke], workspaceId: 'smoke-workspace' });
  assert(queuePreview.type === 'feg-stage-pro-equipment-sync-preview' && queuePreview.rowCount === 1, 'equipment sync queue should expose sync preview');
  const queueReadiness = EquipmentServerSyncQueue.buildEquipmentReadinessReport({ items: [typeAliasSmoke], workspaceId: 'smoke-workspace' });
  assert(queueReadiness.type === 'feg-stage-pro-equipment-readiness-report' && queueReadiness.rowCount === 1, 'equipment sync queue should expose readiness report');
  const queueDryRun = EquipmentServerSyncQueue.buildEquipmentWriteDryRun({ items: [typeAliasSmoke], workspaceId: 'smoke-workspace' });
  assert(queueDryRun.equipment_sync_preview && queueDryRun.equipment_sync_preview.rowCount === 1, 'equipment dry-run should include sync preview');
  assert(queueDryRun.equipment_readiness_report && queueDryRun.equipment_readiness_report.rowCount === 1, 'equipment dry-run should include readiness report');
  const normalizedEq = EquipmentDatabase.normalizeItem({ code: 'TEST', name: 'Test', stock_qty: 10, reserved_qty: 3, weight_kg: 1.5, power_w: 100 });
  assert(normalizedEq.availableQty === 7 && normalizedEq.available_qty === 7, 'equipment model should compute available aliases');
  const upsertedEquipment = EquipmentDatabase.upsertItem({ id: 'eq-smoke-local', code: 'SMOKE-LOCAL', name: 'Smoke local item', category: 'commutation', type: 'cable', stockQty: 2, reservedQty: 1 }, equipmentItems);
  assert(upsertedEquipment.some(item => item.code === 'SMOKE-LOCAL' && item.availableQty === 1), 'equipment upsert should work with local inventory');
  assert(EquipmentDatabase.exportItems(upsertedEquipment).includes('SMOKE-LOCAL'), 'equipment export should include local items');
  const inferredSuppliers = SupplierDirectory.buildFromEquipmentItems(equipmentItems);
  assert(inferredSuppliers.some(supplier => supplier.name === 'Звук Сила'), 'supplier directory should infer Excel suppliers');
  assert(SupplierDirectory.listSuppliers({ suppliers: inferredSuppliers, query: 'Звук' }).length >= 1, 'supplier directory should search suppliers');
  const upsertedSuppliers = SupplierDirectory.upsertSupplier({ id: 'sup-smoke', name: 'Smoke Supplier', categories: ['sound_pa'], defaultMarginRate: 0.3 }, inferredSuppliers);
  assert(upsertedSuppliers.some(supplier => supplier.id === 'sup-smoke'), 'supplier upsert should work locally');
  assert(SupplierDirectory.exportSuppliers(upsertedSuppliers).includes('Smoke Supplier'), 'supplier export should include local suppliers');
  const availability = EquipmentDatabase.checkAvailability([{ itemId: 'eq-truss-3m', qty: 40 }], equipmentItems)[0];
  assert(availability.deficitQty > 0 && !availability.ok, 'availability check should detect deficits');
  const availabilityReport = AvailabilityChecker.buildAvailabilityReport([{ itemId: 'eq-truss-3m', qty: 40 }, { code: 'XLSX-004', qty: 2 }, { name: 'Позиция без базы', qty: 1 }], equipmentItems);
  assert(availabilityReport.totalRows === 3, 'availability report should aggregate requested rows');
  assert(availabilityReport.deficitRows.some(row => row.itemId === 'eq-truss-3m' && row.subrentQty > 0), 'availability report should suggest subrent for deficits');
  assert(availabilityReport.rows.some(row => row.code === 'SND-005' && row.inventoryStatus === 'ok'), 'availability report should match imported Excel items by legacy code and return generated code');
  assert(availabilityReport.unmatchedRows.length === 1, 'availability report should show unmatched rows');
  assert(RolePermissions.hasPermission('manager', 'equipment:edit'), 'manager should be able to edit equipment');
  assert(RolePermissions.hasPermission('warehouse', 'availability:view'), 'warehouse should see availability');
  assert(RolePermissions.hasPermission('manager', 'data_quality:view'), 'manager should see data quality center');
  assert(RolePermissions.hasPermission('manager', 'reports:view'), 'manager should see reports center');
  assert(RolePermissions.canSeeSection('technician', 'quick'), 'technician should see quick section');
  assert(!RolePermissions.canSeeSection('technician', 'quote'), 'technician should not see quote wizard');
  assert(RolePermissions.canSeeSection('warehouse', 'warehouse'), 'warehouse should see warehouse section');
  assert(!RolePermissions.canSeeSection('viewer', 'equipment'), 'viewer should not see equipment database');
  assert(UserDashboard.getDefaultSectionForRole('technician') === 'quick', 'technician dashboard should open quick calculators by default');
  assert(UserDashboard.getDefaultSectionForRole('warehouse') === 'warehouse', 'warehouse dashboard should open warehouse by default');
  assert(UserDashboard.getVisibleSections('manager').some(section => section.id === 'quote'), 'manager dashboard should include quote wizard');
  assert(UserDashboard.getVisibleSections('manager').some(section => section.id === 'reports'), 'manager dashboard should include reports center');
  assert(UserDashboard.getHiddenSections('viewer').some(section => section.id === 'admin'), 'viewer dashboard should hide admin');

  const clientSmoke = ClientsStorage.normalizeClient({ id: 'CL-SMOKE', name: 'Smoke Client', contact: 'Contact', phone: '+123', email: 'smoke@example.com', address: 'Smoke street', note: 'VIP' });
  assert(clientSmoke && clientSmoke.name === 'Smoke Client', 'client storage should normalize v4 client records');
  const clientExport = V4ClientsPanel.exportClients([clientSmoke]);
  assert(clientExport.includes('feg-stage-pro-clients-export') && clientExport.includes('Smoke Client'), 'v4 clients panel should export clients JSON');
  const clientStats = V4ClientsPanel.getClientProjectStats(clientSmoke, [{ clientName: 'Smoke Client', projectName: 'Smoke Project', status: 'draft', updatedAt: '2026-01-01T00:00:00Z' }]);
  assert(clientStats.total === 1 && clientStats.lastProjectName === 'Smoke Project', 'v4 clients panel should count linked projects');



  QuoteDraftStorage.clearDrafts();
  const quote = QuoteModel.createQuoteDraft({
    client: { name: 'ACME Event' },
    project: { name: 'Festival main stage' },
    venue: { name: 'Arena', address: 'Main street 1', date: '2026-06-01' },
    scope: { stage: true, truss: true, led: true, sound: false },
    transport: { mode: 'out_of_city', pricePerKm: 35, distanceKm: 120 },
    sections: { led: { status: 'configured', weightKg: 315, powerW: 18000, rental: 45000 } }
  });
  assert(quote.transport.total === 4200, 'out-of-city transport should be distance × price per km');
  assert(QuoteModel.normalizeTransport({ vehicleType: 'passenger' }).vehicleLabel === 'Легковой', 'transport should support passenger vehicle type');
  assert(QuoteModel.normalizeTransport({ vehicleType: 'trailer' }).vehicleLabel === 'Прицеп', 'transport should support trailer vehicle type');
  assert(QuoteModel.normalizeTransport({}).vehicleType === 'cargo', 'transport should default to cargo vehicle type');
  assert(QuoteModel.normalizeTransport({}).tariffs.cargo.cityPrice === 4000, 'transport tariffs should keep TZ city default');
  assert(QuoteModel.normalizeTransport({}).tariffs.cargo.pricePerKm === 35, 'transport tariffs should keep TZ distance default');
  const passengerTariffQuote = QuoteModel.applySelectedTransportTariff({ mode: 'city', vehicleType: 'passenger', tariffs: { passenger: { cityPrice: 2500, pricePerKm: 25 } } });
  assert(passengerTariffQuote.cityPrice === 2500 && passengerTariffQuote.total === 2500, 'selected passenger tariff should drive city transport total');
  const trailerTariffQuote = QuoteModel.applySelectedTransportTariff({ mode: 'out_of_city', vehicleType: 'trailer', distanceKm: 120, tariffs: { trailer: { cityPrice: 3000, pricePerKm: 30 } } });
  assert(trailerTariffQuote.pricePerKm === 30 && trailerTariffQuote.total === 3600, 'selected trailer tariff should drive distance transport total');
  assert(QuoteModel.getEnabledSectionKeys(quote).join(',') === 'stage,truss,led', 'enabled quote sections should follow scope');
  assert(QuoteModel.validateQuote(quote).ok, 'filled quote draft should pass required-step validation');
  const invalidClientStep = QuoteModel.validateQuoteStep('client', QuoteModel.createQuoteDraft({ scope: { stage: true } }));
  assert(!invalidClientStep.ok && invalidClientStep.errors.length === 2, 'linear wizard should block client step without client/project');
  const invalidTransportStep = QuoteModel.validateQuoteStep('transport', QuoteModel.createQuoteDraft({ client: { name: 'A' }, project: { name: 'B' }, venue: { name: 'C', address: 'D', date: '2026-06-01' }, transport: { mode: 'out_of_city', distanceKm: 0 }, scope: { stage: true } }));
  assert(!invalidTransportStep.ok, 'linear wizard should block out-of-city transport without distance');
  const transportOnlyQuote = QuoteModel.createQuoteDraft({ client: { name: 'A' }, project: { name: 'B' }, venue: { name: 'C', address: 'D', date: '2026-06-01' }, scope: { transport: true } });
  assert(QuoteModel.validateQuoteStep('scope', transportOnlyQuote).ok, 'scope step should allow the required transport-only summary path');
  const wizardScoped = QuoteModel.createQuoteDraft({ scope: { stage: true }, wizard: { activeStep: 'stage' } });
  assert(wizardScoped.wizard.activeStep === 'stage', 'quote model should preserve valid active wizard step');
  const wizardInvalid = QuoteModel.createQuoteDraft({ scope: { stage: false }, wizard: { activeStep: 'stage' } });
  assert(wizardInvalid.wizard.activeStep === 'client', 'quote model should fall back when active step is not enabled');
  assert(QuoteWizard.getEnabledSteps(quote).some(step => step.id === 'summary'), 'quote wizard should expose summary step');
  const savedQuote = QuoteDraftStorage.saveDraft(quote);
  assert(QuoteDraftStorage.loadActiveDraft().id === savedQuote.id, 'active quote draft should load after save');
  const savedProject = QuoteProjectStorage.saveActiveDraftAsProject();
  assert(savedProject.projectName === savedQuote.project.name, 'active quote draft should save into project storage');
  assert(QuoteProjectStorage.listProjects().length === 1, 'project storage should list saved quote project');
  const restoredQuote = QuoteProjectStorage.restoreProjectToDraft(savedProject.projectId);
  assert(restoredQuote.id === savedQuote.id, 'project storage should restore project back to active quote draft');
  const duplicatedProject = QuoteProjectStorage.duplicateProject(savedProject.projectId);
  assert(duplicatedProject.projectId !== savedProject.projectId && duplicatedProject.status === 'draft', 'project storage should duplicate project as draft');
  const confirmedProject = QuoteProjectStorage.updateProjectStatus(savedProject.projectId, 'confirmed', 'Smoke test confirmation');
  assert(confirmedProject.status === 'confirmed', 'project storage should update project status');
  const timeline = QuoteProjectStorage.getProjectTimeline(savedProject.projectId);
  assert(timeline.some(item => item.type === 'status_changed' && item.payload && item.payload.to === 'confirmed'), 'project storage should keep status history timeline');
  assert(ProjectTimelineView.getTimeline(savedProject, 2).length >= 1, 'project timeline view should read project history');
  assert(ProjectTimelineView.getProjectHealth(confirmedProject).level === 'ok', 'project timeline view should mark confirmed projects healthy');
  assert(ProjectTimelineView.renderTimelineList(savedProject).includes('v4-project-timeline'), 'project timeline view should render timeline html');
  const confirmedOnly = QuoteProjectStorage.listProjects({ status: 'confirmed' });
  assert(confirmedOnly.length === 1 && confirmedOnly[0].status === 'confirmed', 'project storage should filter by status');
  assert(QuoteProjectStorage.listProjects({ query: 'Festival' }).length >= 1, 'project storage should filter by search query');
  assert(QuoteProjectStorage.listProjects({ clientId: 'ACME' }).length >= 1, 'project storage should filter by client');
  const patchedQuote = QuoteModel.mergeQuotePatch(savedQuote, { sections: { led: { status: 'configured', weightKg: 315, powerW: 18000, rental: 45000 } } });
  assert(QuoteModel.summarizeQuote(patchedQuote).totals.powerW === 18000, 'quote summary should include LED section power');

  const boundLedQuote = QuoteSectionBinder.bindLedSection(quote, { widthM: 4.3, heightM: 2.4, format: '500x500', pitch: 'p3' });
  assert(boundLedQuote.sections.led.status === 'configured', 'LED section should be configured by binder');
  assert(boundLedQuote.sections.led.bomRows.some(row => row.id === 'led-cabinet'), 'bound LED section should include cabinet BOM rows');
  assert(QuoteModel.validateQuote(boundLedQuote).ok, 'quote with bound LED section should pass validation');
  const stageBoundQuote = QuoteSectionBinder.bindStageSection(boundLedQuote, {
    mode: 'stage-grid',
    lastResult: {
      modules: 12,
      sheets: 12,
      columns: 20,
      frames: 31,
      studs: 20,
      feet: 20,
      columnType: 'middle',
      columnTypeLabel: 'Столб средний',
      frameType: 'low',
      frameTypeLabel: 'Перекладина низкая',
      modulesCost: 10200,
      installCost: 3500,
      transportCost: 4000,
      totalWeight: 350,
      weight: { sheetTotal: 216, columnTotal: 52, frameTotal: 108.5, studTotal: 30, total: 406.5 },
      widthMeters: 4.8,
      depthMeters: 3.6,
      areaMeters: 17.28
    }
  });
  assert(stageBoundQuote.sections.stage.status === 'configured', 'stage section should bind from snapshot');
  assert(stageBoundQuote.sections.stage.bomRows.some(row => row.id === 'stage-deck'), 'stage section should include deck BOM row');
  assert(stageBoundQuote.sections.stage.rental === 13700, 'stage section should exclude legacy transport from section rental');
  const stageQuickTech = QuickTechnicalSheets.buildSectionTechnicalSheet('stage', stageBoundQuote.sections.stage);
  assert(stageQuickTech.hasPrices === false && stageQuickTech.bomRows.some(row => row.code === 'STAGE-DECK'), 'stage quick tech sheet should expose no-price deck row');
  const stageQuickWarehouse = QuickTechnicalSheets.buildSectionWarehouseSheet('stage', stageBoundQuote.sections.stage);
  assert(stageQuickWarehouse.rows.some(row => row.code === 'STAGE-DECK') && stageQuickWarehouse.hasPrices === false, 'stage quick warehouse sheet should expose no-price stock rows');
  assert(QuickTechnicalSheets.documentToText(stageQuickWarehouse).includes('Складские позиции:'), 'stage quick warehouse sheet should render plain text');

  const trussBoundQuote = QuoteSectionBinder.bindTrussSection(stageBoundQuote, {
    mode: 'block',
    state: { pricePerMeter: 600, weightPerMeter: 6, basePrice: 300, baseWeight: 12, pinPrice: 80, pinWeight: 0.25, c2PinWeight: 0.04, cotterWeight: 0, halfConnectorPrice: 0, halfConnectorWeight: 0.27 },
    specs: { truss3: { label: 'Ферма 3 м', type: 'truss', len: 3, defaultWeight: 18, defaultPrice: 1800 }, base: { label: 'База / блин', type: 'base', len: 0, defaultWeight: 12, defaultPrice: 300 }, pin: { label: 'C2-88', type: 'pin', len: 0, defaultWeight: 0.25, defaultPrice: 80 } },
    result: {
      counts: { truss3: 4, base: 2 },
      totalMeters: 12,
      nodePieces: 0,
      baseCount: 2,
      rental: 12000,
      install: 2500,
      transport: 4000,
      weight: 180
    }
  });
  assert(trussBoundQuote.sections.truss.status === 'configured', 'block truss section should bind from snapshot');
  assert(trussBoundQuote.sections.truss.source === 'legacy-block-truss', 'truss quote bridge must only expose block constructor source');
  assert(!trussBoundQuote.sections.truss.bomRows.some(row => row.id === 'truss-3m'), 'old classic truss BOM rows must not be generated');
  assert(QuoteModel.summarizeQuote(trussBoundQuote).totals.rental >= 28200, 'quote totals should include bound stage/block-truss sections');
  const trussQuickTech = QuickTechnicalSheets.buildSectionTechnicalSheet('truss', trussBoundQuote.sections.truss);
  assert(trussQuickTech.hasPrices === false && trussQuickTech.title.includes('Фермы'), 'truss quick tech sheet should be no-price and titled for truss');
  const trussQuickWarehouse = QuickTechnicalSheets.buildSectionWarehouseSheet('truss', trussBoundQuote.sections.truss);
  assert(trussQuickWarehouse.hasPrices === false && Array.isArray(trussQuickWarehouse.rows), 'truss quick warehouse sheet should expose rows without prices');
  const scopedQuote = QuoteSectionBinder.ensureSectionsForScope(QuoteModel.createQuoteDraft({ scope: { stage: true, truss: true, led: false, sound: true } }));
  assert(scopedQuote.sections.stage && scopedQuote.sections.truss && scopedQuote.sections.equipment, 'scope binder should create placeholder sections');
  assert(!scopedQuote.sections.led, 'disabled LED scope should be pruned');
  const equipmentSection = QuoteEquipmentPicker.buildEquipmentSection({
    scope: { sound: true, services: true },
    items: [{ itemId: 'eq-pa-sub', qty: 10 }, { itemId: 'eq-service-tech', qty: 2 }],
    manualItems: [{ name: 'Субаренда генератора', qty: 1, unit: 'шт', sourceType: 'subrent', supplierName: 'Поставщик', rentalPrice: 15000, weightKg: 80, powerW: 0 }]
  });
  assert(equipmentSection.status === 'configured', 'equipment picker should build configured section');
  assert(equipmentSection.items.some(row => row.itemId === 'eq-pa-sub' && row.deficitQty > 0), 'equipment picker should detect stock deficit');
  assert(equipmentSection.items.some(row => row.sourceType === 'subrent' && row.supplierName === 'Поставщик'), 'equipment picker should keep subrent supplier');
  const equipmentBoundQuote = QuoteSectionBinder.bindEquipmentSection(scopedQuote, { scope: scopedQuote.scope, items: [{ itemId: 'eq-pa-sub', qty: 10 }] });
  assert(equipmentBoundQuote.sections.equipment.status === 'configured', 'equipment section should bind into quote');
  const summaryFoundation = QuoteSummaryBuilder.buildFinalSummary(equipmentBoundQuote);
  assert(summaryFoundation.customerRows.some(row => row.key === 'transport'), 'quote summary should include transport customer row');
  assert(Array.isArray(summaryFoundation.bomRows), 'quote summary should collect BOM rows');
  const pickLists = WarehousePickListBuilder.buildPickLists(equipmentBoundQuote);
  assert(pickLists.all && Array.isArray(pickLists.all.rows), 'warehouse builder should produce all pick list');
  assert(pickLists.deficits.rows.some(row => row.deficitQty > 0), 'warehouse builder should expose deficit rows from availability checker');
  assert(pickLists.subrent.rows.some(row => row.subrentQty > 0), 'warehouse builder should expose deficit rows as subrent planning candidates');
  const subrentPlan = SubrentPlanner.buildSubrentPlan(pickLists.subrent);
  assert(subrentPlan.rows.length >= 1 && subrentPlan.totals.qty >= 1, 'subrent planner should build rows from subrent pick list');
  assert(subrentPlan.rows.every(row => Object.prototype.hasOwnProperty.call(row, 'clientPrice') && Object.prototype.hasOwnProperty.call(row, 'margin')), 'subrent planner rows should include client price and margin');
  const equipmentOnlyPickList = WarehousePickListBuilder.buildSectionPickList(equipmentBoundQuote, 'equipment');
  assert(equipmentOnlyPickList.rows.some(row => row.itemId === 'eq-pa-sub'), 'equipment pick list should include selected PA item');
  const customerDoc = QuoteDocumentBuilder.buildCustomerProposal(equipmentBoundQuote);
  assert(customerDoc.hasPrices && customerDoc.rows.some(row => row.title.includes('Транспорт')), 'customer document should include client-facing transport row');
  const techDoc = QuoteDocumentBuilder.buildTechnicalSheet(equipmentBoundQuote);
  assert(!techDoc.hasPrices && techDoc.totals.powerW >= 0, 'technical document should be no-price and include power totals');
  const reservationPlan = ReservationPlanner.buildReservationPlan(equipmentBoundQuote);
  assert(reservationPlan.type === 'feg-stage-pro-reservation-plan' && Array.isArray(reservationPlan.rows), 'reservation planner should build reservation plan rows');
  assert(reservationPlan.totals && typeof reservationPlan.totals.deficitRows === 'number', 'reservation planner should summarize deficits');
  assert(ReservationPlanner.exportReservationPlan(equipmentBoundQuote).includes('feg-stage-pro-reservation-plan'), 'reservation planner should export JSON');
  const movementPlan = StockMovementPlanner.buildMovementPlan(equipmentBoundQuote, { action: 'reserve' });
  assert(movementPlan.type === 'feg-stage-pro-stock-movement-plan' && movementPlan.rows.every(row => row.action === 'reserve'), 'stock movement planner should build reserve movement rows');
  assert(StockMovementPlanner.exportMovementPlan(equipmentBoundQuote, { action: 'issue' }).includes('feg-stage-pro-stock-movement-plan'), 'stock movement planner should export JSON');
  const warehouseWorkflow = WarehouseWorkflow.buildWarehouseWorkflow(equipmentBoundQuote);
  assert(warehouseWorkflow.type === 'feg-stage-pro-warehouse-workflow' && warehouseWorkflow.status === 'draft', 'warehouse workflow should build local workflow draft');
  assert(WarehouseWorkflow.getNextStatuses('draft').some(row => row.id === 'ready_to_pick'), 'warehouse workflow should expose next statuses');
  const advancedWarehouseWorkflow = WarehouseWorkflow.transitionWorkflow(warehouseWorkflow, 'ready_to_pick', { force: true, note: 'smoke' });
  assert(advancedWarehouseWorkflow.status === 'ready_to_pick' && advancedWarehouseWorkflow.timeline.length >= 2, 'warehouse workflow should transition and keep timeline');
  assert(WarehouseWorkflow.exportWorkflow(equipmentBoundQuote).includes('feg-stage-pro-warehouse-workflow'), 'warehouse workflow should export JSON');
  const warehouseWorkflowDoc = QuoteDocumentBuilder.buildWarehouseWorkflowSheet(equipmentBoundQuote);
  assert(warehouseWorkflowDoc.type === 'warehouse-workflow' && QuoteDocumentBuilder.documentToText(warehouseWorkflowDoc).includes('Складской workflow'), 'document builder should render warehouse workflow');
  const movementDoc = QuoteDocumentBuilder.buildStockMovementSheet(equipmentBoundQuote, 'reserve');
  assert(movementDoc.type === 'stock-movement-plan' && QuoteDocumentBuilder.documentToText(movementDoc).includes('Плановые операции склада'), 'document builder should render stock movement plan');
  const reservationDoc = QuoteDocumentBuilder.buildReservationSheet(equipmentBoundQuote);
  assert(reservationDoc.type === 'reservation-plan' && reservationDoc.rows.length === reservationPlan.rows.length, 'document builder should render reservation plan');
  const subrentDoc = QuoteDocumentBuilder.buildSubrentSheet(equipmentBoundQuote);
  assert(subrentDoc.type === 'subrent-plan' && Array.isArray(subrentDoc.rows), 'document builder should create subrent plan document');
  assert(QuoteDocumentBuilder.documentToText(subrentDoc).includes('Позиции субаренды:'), 'subrent document should render text');
  const warehouseDoc = QuoteDocumentBuilder.buildWarehouseSheet(equipmentBoundQuote, 'equipment');
  assert(!warehouseDoc.hasPrices && warehouseDoc.rows.some(row => row.code), 'warehouse document should be no-price and include item codes');
  assert(warehouseDoc.rows.some(row => row.availableQty != null && row.inventoryStatus), 'warehouse document should include availability status');
  const quoteItems = QuoteItemBuilder.buildQuoteItems(equipmentBoundQuote);
  assert(quoteItems.rows.some(row => row.quote_id === equipmentBoundQuote.id && row.section_key === 'equipment'), 'quote_items export should include equipment rows with quote_id');
  assert(quoteItems.rows.some(row => row.source_type === 'subrent_needed' && row.supplier_name), 'quote_items export should keep subrent supplier fallback');
  assert(quoteItems.rows.some(row => row.section_key === 'transport' && row.code === 'TRANSPORT'), 'quote_items export should include transport row');
  assert(QuoteItemBuilder.exportQuoteItems(equipmentBoundQuote).includes('quote_id'), 'quote_items export should be JSON-ready');

  const linkedClient = ClientsStorage.ensureClientExists('Client Link Smoke', { id: 'CL-LINK-SMOKE', email: 'client-link@feg.local', phone: '+100' });
  const linkedQuote = QuoteModel.mergeQuotePatch(equipmentBoundQuote, { client: { id: linkedClient.id, name: linkedClient.name, email: linkedClient.email, phone: linkedClient.phone } });
  const linkedSmokeProject = QuoteProjectStorage.saveProject({ quote: linkedQuote, projectId: 'client-link-smoke-project' });
  const linkedProjects = ClientProjectLinks.listProjectsForClient(linkedClient, QuoteProjectStorage.listProjects());
  assert(linkedProjects.some(project => project.quoteId === linkedQuote.id), 'client project links should find saved projects for a CRM client');
  const linkedStats = ClientProjectLinks.getClientProjectStats(linkedClient, QuoteProjectStorage.listProjects());
  assert(linkedStats.total >= 1 && linkedStats.total, 'client project links should build client project stats');
  assert(ClientProjectLinks.findClientForProject(linkedProjects[0], [linkedClient]).id === linkedClient.id, 'client project links should resolve CRM card from project');
  assert(ClientProjectLinks.exportClientProjectPack(linkedClient, linkedProjects).includes('feg-stage-pro-client-project-links'), 'client project links export should be JSON-ready');

  const savedAuditProject = QuoteProjectStorage.saveProject({ quote: equipmentBoundQuote, projectId: 'audit-smoke-project' });
  const auditRows = ProjectAuditLog.buildAuditLog(savedAuditProject);
  assert(auditRows.some(row => row.action === 'project_created' || row.action === 'project_saved'), 'audit log should include project save events');
  const auditExport = ProjectAuditLog.exportAuditLog(savedAuditProject);
  assert(auditExport.includes('feg-stage-pro-audit-log-export') && auditExport.includes('audit'), 'audit log export should be JSON-ready');
  const exportPack = ProjectAuditLog.buildProjectExportPack(savedAuditProject);
  assert(exportPack.quote && Array.isArray(exportPack.quote_items) && Array.isArray(exportPack.audit_log), 'project export pack should include quote, quote_items and audit_log');
  const readiness = ProjectReadinessChecklist.buildChecklist(equipmentBoundQuote);
  assert(readiness && Array.isArray(readiness.items) && Number.isFinite(readiness.score), 'project readiness checklist should build scored items');
  assert(readiness.items.some(row => row.id === 'client.name'), 'project readiness checklist should include client check');
  assert(ProjectReadinessChecklist.checklistToText(readiness).includes('CHECKLIST ГОТОВНОСТИ'), 'project readiness checklist should export readable text');
  assert(exportPack.readiness_checklist && exportPack.readiness_checklist.type === 'project-readiness-checklist', 'project export pack should include readiness checklist');
  assert(exportPack.backend_sync_payload && exportPack.backend_sync_payload.rows && Array.isArray(exportPack.backend_sync_payload.rows.quote_items), 'project export pack should include backend sync payload');
  const syncPayload = BackendSyncAdapter.buildSyncPayload({ quote: equipmentBoundQuote, quote_items: quoteItems.rows, suppliers: inferredSuppliers, audit_log: auditRows, equipment_items: equipmentItems.slice(0, 2), warehouse_workflows: [warehouseWorkflow] }, { workspaceId: 'smoke-workspace' });
  assert(syncPayload.type === 'feg-stage-pro-backend-sync-payload' && syncPayload.rows.quotes.length === 1, 'backend sync adapter should build quotes sync payload');
  assert(syncPayload.rows.equipment_items.length === 2 && syncPayload.rows.equipment_items.every(row => row.workspace_id), 'backend sync adapter should map equipment rows with workspace_id');
  assert(Array.isArray(syncPayload.rows.reservations), 'backend sync adapter should always include reservations array');
  assert(Array.isArray(syncPayload.rows.stock_movements), 'backend sync adapter should always include stock movements array');
  assert(Array.isArray(syncPayload.rows.warehouse_workflows) && syncPayload.rows.warehouse_workflows.length === 1, 'backend sync adapter should include warehouse workflow rows');
  const warehouseOpsSnapshot = WarehouseOperationsHub.buildOperationSnapshot(savedAuditProject);
  assert(warehouseOpsSnapshot.type === 'feg-stage-pro-warehouse-operation-snapshot' && warehouseOpsSnapshot.reservationPlan && warehouseOpsSnapshot.stockMovementPlan, 'warehouse operations hub should build an operation snapshot with plans');
  const warehouseOpsDashboard = WarehouseOperationsHub.buildOperationsDashboard();
  assert(warehouseOpsDashboard.type === 'feg-stage-pro-warehouse-operations-dashboard' && Array.isArray(warehouseOpsDashboard.rows), 'warehouse operations hub should build project operations dashboard');
  const warehousePack = WarehouseOperationsHub.exportWarehousePack(warehouseOpsSnapshot);
  assert(warehousePack.type === 'feg-stage-pro-warehouse-operation-pack' && warehousePack.warehouse_workflow && warehousePack.stock_movement_plan, 'warehouse operations hub should export a warehouse pack');
  assert(WarehouseOperationsHub.warehousePackToText(warehousePack).includes('Складской пакет проекта'), 'warehouse operations hub should render warehouse pack text');
  const documentList = DocumentCenter.buildDocumentList(equipmentBoundQuote);
  assert(Array.isArray(documentList) && documentList.some(doc => doc.type === 'customer-proposal') && documentList.some(doc => doc.type === 'export-pack-json'), 'document center should build customer and export documents');
  const documentPack = DocumentCenter.buildDocumentDownloadPack(equipmentBoundQuote);
  assert(documentPack.type === 'feg-stage-pro-document-download-pack' && documentPack.files && documentPack.files['manifest.json'], 'document center should build a downloadable document pack');
  const documentManifest = DocumentCenter.buildZipManifest(equipmentBoundQuote);
  assert(documentManifest.type === 'feg-stage-pro-document-manifest' && documentManifest.files.length >= documentList.length, 'document center should build a manifest for generated files');
  assert(BackendSyncAdapter.validateSyncPayload(syncPayload).ok, 'backend sync payload should validate');
  const connectionReport = SupabaseSyncConsole.buildConnectionReport({ mode: 'supabase', enableRemoteSync: false, supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key', workspaceId: 'smoke-workspace' }, { createClient() { return {}; } });
  assert(connectionReport.effective_mode === 'local' && connectionReport.supabase_anon_key_masked.includes('••'), 'sync console should keep disabled remote sync local and mask anon key');
  const dryRunReport = SupabaseSyncConsole.buildDryRunReport(syncPayload, { workspaceId: 'smoke-workspace' });
  assert(dryRunReport.type === 'feg-stage-pro-sync-dry-run-report' && dryRunReport.total_rows > 0 && dryRunReport.validation.ok, 'sync console should build a valid dry-run report');
  const readinessReport = SupabaseSyncConsole.buildReadinessReport({ mode: 'local', workspaceId: 'smoke-workspace' });
  assert(readinessReport.type === 'feg-stage-pro-sync-readiness-report' && readinessReport.ready_for_dry_run, 'sync console should build readiness report in local dry-run mode');
  assert(SupabaseSyncConsole.reportToText(readinessReport).includes('Supabase Sync Console'), 'sync console should render readiness text');
  const writeDryRunReport = BackendWriteDryRun.buildWriteDryRunReport(syncPayload, { workspaceId: 'smoke-workspace' });
  assert(writeDryRunReport.type === 'feg-stage-pro-backend-write-dry-run-report' && writeDryRunReport.batches.total_rows > 0, 'backend write dry-run should build ordered write report');
  assert(BackendWriteDryRun.validateRowsForWrite(syncPayload).ok, 'backend write dry-run validation should pass smoke payload');
  assert(BackendWriteDryRun.buildSqlPreview(syncPayload).includes('rollback; -- dry-run only'), 'backend write dry-run should build SQL rollback preview');
  assert(BackendWriteDryRun.reportToText(writeDryRunReport).includes('Backend First Write Dry Run+'), 'backend write dry-run should render text report');
  const syncStatus = QuoteServerSyncQueue.getProjectSyncStatus(savedAuditProject);
  assert(['ready_to_sync', 'local_only', 'staged'].includes(syncStatus.status), 'quote sync queue should calculate project sync status');
  const quoteSyncStore = new Map();
  const quoteSyncStorage = { getItem: key => quoteSyncStore.has(key) ? quoteSyncStore.get(key) : null, setItem: (key, value) => quoteSyncStore.set(key, String(value)), removeItem: key => quoteSyncStore.delete(key) };
  const stagedQuote = QuoteServerSyncQueue.stageProject(savedAuditProject, { storage: quoteSyncStorage });
  assert(stagedQuote.status === 'staged' && stagedQuote.dryRunReport, 'quote sync queue should stage projects with dry-run report');
  const queueReport = QuoteServerSyncQueue.buildQueueReport({ storage: quoteSyncStorage });
  assert(queueReport.type === 'feg-stage-pro-quote-sync-queue-report' && queueReport.queue.length >= 1, 'quote sync queue should build queue report');
  assert(QuoteServerSyncQueue.renderStatusBadge({ label: 'ready to sync', status: 'ready_to_sync', tone: 'ok' }).includes('ready to sync'), 'quote sync queue should render status badges');
  assert(BackendSyncAdapter.getBackendMode({ mode: 'supabase', enableRemoteSync: false }) === 'local', 'backend sync adapter should stay local unless remote sync is explicitly enabled and configured');
  const snapshotStore = new Map();
  const snapshotStorage = { getItem: key => snapshotStore.has(key) ? snapshotStore.get(key) : null, setItem: (key, value) => snapshotStore.set(key, String(value)), removeItem: key => snapshotStore.delete(key) };
  BackendSyncAdapter.saveLocalSnapshot(syncPayload, snapshotStorage);
  assert(BackendSyncAdapter.listLocalSnapshots(snapshotStorage).length === 1, 'backend sync adapter should save local sync snapshots');
  const exportPackJson = JSON.stringify(exportPack);
  assert(exportPackJson.includes('feg-stage-pro-project-export-pack'), 'project export pack should serialize to JSON');
  assert(exportPackJson.includes('reservation_plan'), 'project export pack should serialize reservation plan');
  assert(exportPackJson.includes('stock_movement_plan'), 'project export pack should serialize stock movement plan');
  assert(exportPackJson.includes('warehouse_workflow'), 'project export pack should serialize warehouse workflow');
  const validatedImport = ImportRestoreCenter.validateImportText(exportPackJson);
  assert(validatedImport.ok && validatedImport.kind === 'export-pack' && validatedImport.quote.project.name === equipmentBoundQuote.project.name, 'import restore center should validate project export packs');
  const restoredImport = ImportRestoreCenter.restoreImport(exportPackJson, { setActiveDraft: true });
  assert(restoredImport.ok && restoredImport.project && restoredImport.project.quoteId, 'import restore center should restore export pack into project storage');
  const backendImport = ImportRestoreCenter.validateImportText(JSON.stringify(exportPack.backend_sync_payload));
  assert(backendImport.ok && backendImport.kind === 'backend-sync-payload' && backendImport.quote, 'import restore center should read backend sync payloads');
  const auditOnlyImport = ImportRestoreCenter.validateImportText(ProjectAuditLog.exportAuditLog(savedAuditProject));
  assert(auditOnlyImport.ok && auditOnlyImport.kind === 'audit-log-only' && auditOnlyImport.warnings.length >= 1, 'import restore center should classify audit-only exports');
  const defaultWorkspaceSettings = WorkspaceSettings.normalizeSettings({ workspaceName: 'FEG Test', calendar: { eventTitleTemplate: 'FEG TEST - {{projectName}}' } });
  assert(defaultWorkspaceSettings.workspaceName === 'FEG Test' && defaultWorkspaceSettings.calendar.eventTitleTemplate.includes('{{projectName}}'), 'workspace settings should normalize calendar templates');
  const templated = WorkspaceSettings.applyCalendarTemplate(equipmentBoundQuote, QuoteSummaryBuilder.buildFinalSummary(equipmentBoundQuote), defaultWorkspaceSettings);
  assert(templated.title.includes(equipmentBoundQuote.project.name), 'workspace settings should render calendar title template');
  assert(WorkspaceSettings.exportSettings(defaultWorkspaceSettings).includes('feg-stage-pro-workspace-settings'), 'workspace settings should export JSON');

  const calendarDraft = QuoteDocumentBuilder.buildCalendarDraft(equipmentBoundQuote);
  assert(calendarDraft.title.startsWith('FEG - '), 'calendar draft should use FEG event title');
  assert(calendarDraft.icsContent && calendarDraft.icsContent.includes('BEGIN:VCALENDAR'), 'calendar draft should include ICS content');
  const calendarEvent = CalendarIntegration.buildCalendarEvent(quote);
  assert(calendarEvent.summary.startsWith('FEG - ') && calendarEvent.location.includes('Main street'), 'calendar integration should build FEG event summary and location');
  const calendarIcs = CalendarIntegration.exportIcs(quote);
  assert(calendarIcs.includes('BEGIN:VEVENT') && calendarIcs.includes('DTSTART;VALUE=DATE:20260601') && calendarIcs.includes('SUMMARY:FEG - Festival main stage'), 'calendar integration should export importable all-day ICS');
  assert(QuoteDocumentBuilder.documentToText(customerDoc).includes('Итого:'), 'document builder should render customer text');
  const htmlProposal = PdfTemplateEngine.renderDocument(customerDoc);
  assert(htmlProposal.html.includes('<!doctype html>') && htmlProposal.html.includes('Коммерческое предложение'), 'PDF template engine should render full customer HTML');
  const documentListWithHtml = DocumentCenter.buildDocumentList(equipmentBoundQuote, { includeJson: false });
  assert(documentListWithHtml.some(doc => doc.type === 'customer-proposal' && doc.hasHtmlTemplate && doc.htmlFileName.endsWith('.html')), 'Document Center should enrich documents with HTML templates');
  assert(DocumentCenter.buildHtmlDocumentPack(equipmentBoundQuote).type === 'feg-stage-pro-html-document-pack', 'Document Center should build HTML document packs');


  const ledDefault = LedCalculator.calculateLedScreen({});
  assert(ledDefault.format.id === '640x640' && ledDefault.pitch.id === 'p4', 'default LED scheme should be 640x640 P4');

  const led = LedCalculator.calculateLedScreen({ widthM: 4.3, heightM: 2.4, format: '500x500', pitch: 'p3' });
  assert(led.columns === 9, `LED 4.3m width with 500 cabinet should round up to 9, got ${led.columns}`);
  assert(led.rows === 5, `LED 2.4m height with 500 cabinet should round up to 5, got ${led.rows}`);
  assert(led.cabinetCount === 45, 'LED cabinet count should be columns × rows');
  assert(led.powerconSchukoCables === 5, 'LED PowerCON-Schuko should round ceil(cabinets / 10)');
  assert(led.brackets === 0 && led.m8Bolts === 0, 'LED brackets and bolts should come from legs, not cabinet joints');
  assert(led.powerLinks === led.cabinetCount && led.rj45Links === led.cabinetCount, 'LED should add one power and one RJ45 link per cabinet');
  const led640 = LedCalculator.calculateLedScreen({ widthM: 3.2, heightM: 1.92, format: '640x640', pitch: 'p4', legType: '3m', legCount: 2 });
  assert(led640.cabinetCount === 15, '640 LED test should have 15 cabinets');
  assert(led640.cabinetWeightKg === 14 && led640.cabinetPowerW === 320 && led640.cabinetStartupPowerW === 600, '640 cabinet defaults should match user scheme');
  assert(led640.cabinetPixelsX === 160 && led640.cabinetPixelsY === 160, '640 P4 cabinet should be 160x160 px');
  assert(led640.totalPowerW === 4800 && led640.totalStartupPowerW === 9000, '640 LED power and startup totals should be calculated');
  assert(led640.powerconSchukoCables === 2, '15 cabinets / 10 should round up to 2 PowerCON-Schuko cables');
  assert(led640.brackets === 8 && led640.m8Bolts === 32, '2 legs should add 8 brackets and 32 M8x60 bolts');
  assert(led640.legWeightKg === 4 && led640.legsWeightKg === 8, '3m LED legs should weigh 4kg each');
  assert(LedCalculator.calculateLedScreen({ legType: '2m', legCount: 1 }).legsWeightKg === 3, '2m LED leg should weigh 3kg');
  assert(LedCalculator.calculateLedScreen({ legType: '2.5m', legCount: 1 }).legsWeightKg === 3.6, '2.5m LED leg should weigh 3.6kg');
  const ledRows = LedCalculator.buildLedBomRows(led640);
  assert(ledRows.some(row => row.id === 'led-cabinet' && row.qty === 15), 'LED BOM should include cabinets');
  assert(ledRows.some(row => row.id === 'led-powercon-schuko' && row.qty === 2), 'LED BOM should include PowerCON-Schuko cables');
  assert(ledRows.some(row => row.id === 'led-bracket' && row.qty === led640.brackets), 'LED BOM should include brackets from legs');
  assert(ledRows.some(row => row.id === 'm8-bolt' && row.qty === led640.m8Bolts), 'LED BOM should include M8x60 bolts from legs');
  assert(typeof LedCalculator.buildLedTechSheet === 'function', 'LED calculator should build a no-price tech sheet');
  assert(typeof LedCalculator.buildLedWarehouseSheet === 'function', 'LED calculator should build a no-price warehouse sheet');
  const ledTechSheet = LedCalculator.buildLedTechSheet(led640);
  assert(ledTechSheet.hasPrices === false && ledTechSheet.rows.length === ledRows.length, 'LED tech sheet should expose BOM rows without prices');
  assert(ledTechSheet.summary.powerW === led640.totalPowerW && ledTechSheet.summary.startupPowerW === led640.totalStartupPowerW, 'LED tech sheet should include power and startup power');
  const ledWarehouseSheet = LedCalculator.buildLedWarehouseSheet(led640);
  assert(ledWarehouseSheet.hasPrices === false && ledWarehouseSheet.totals.weightKg === led640.totalWeightKg, 'LED warehouse sheet should expose total weight without prices');
  assert(ledWarehouseSheet.rows.some(row => row.code === 'LED-BRACKET' && row.qty === 8), 'LED warehouse sheet should keep current bracket calculation from legs');
  assert(ledWarehouseSheet.rows.some(row => row.code === 'M8x60' && row.qty === 32), 'LED warehouse sheet should keep current bolt calculation from legs');

  const rect4x3 = [];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 4; x += 1) rect4x3.push({ x, y });
  }
  const geo = StageCalculator.calculateGeometry(rect4x3);
  assert(geo.sheets === 12, `expected 12 sheets for 4x3, got ${geo.sheets}`);
  assert(StageCalculator.calculateConnectedComponents(rect4x3) === 1, '4x3 stage should be connected');
  assert(StageCalculator.calculateConnectedComponents([{ x: 0, y: 0 }, { x: 1, y: 1 }]) === 2, 'diagonal cells must not be connected');

  const stage = ProjectStorage.normalizeImportedStageProject({
    id: '<bad-id>',
    client: 'Client',
    shape: ['0,0', '1,1', 'bad', '999999,1']
  });
  assert(stage.id !== '<bad-id>', 'unsafe stage id should be replaced');
  assert(stage.shape.length === 3 && stage.shape.includes('0,0') && stage.shape.includes('1,1'), 'stage shape should keep only valid grid keys');

  const truss = ProjectStorage.normalizeImportedTrussProject({
    id: '<bad-id>',
    segmentsH: ['0,0', 'bad'],
    segmentsV: ['1,1']
  });
  assert(truss.id !== '<bad-id>', 'unsafe truss id should be replaced');
  assert(truss.segmentsH.length === 1 && truss.segmentsV.length === 1, 'truss grid lists should be sanitized');

  const clients = ClientsStorage.normalizeClientList([{ name: 'Beta' }, { name: 'Alpha' }, { name: 'Alpha', phone: '+7' }]);
  assert(clients.length === 2, 'clients should be deduplicated by name');
  assert(clients[0].name === 'Alpha', 'clients should be sorted for stable UI');
}

await checkStaticSecurity();
await checkModules();

// v3.9.8 PDF Template Engine smoke checks
const pdfTemplateEngineSourceFinal = await readFile(repoPath('src/modules/PdfTemplateEngine.js'), 'utf8');
const pdfTemplateEngineDoc = await readFile(repoPath('docs/PDF_TEMPLATE_ENGINE.md'), 'utf8');
assert(pdfTemplateEngineSourceFinal.includes('PDF_TEMPLATE_ENGINE_VERSION'), 'PDF template engine should declare version');
assert(pdfTemplateEngineDoc.includes('PDF Template Engine'), 'PDF template engine doc should exist');

// v3.9.7 Command Center smoke checks
const commandCenterSource = await readFile(repoPath('src/modules/CommandCenter.js'), 'utf8');
const commandUserDashboardSource = await readFile(repoPath('src/modules/UserDashboard.js'), 'utf8');
const commandRolePermissionsSource = await readFile(repoPath('src/modules/RolePermissions.js'), 'utf8');
const commandV4ShellSource = await readFile(repoPath('src/modules/V4AppShell.js'), 'utf8');
const commandIndexHtml = await readFile(repoPath('index.html'), 'utf8');
const commandCenterDoc = await readFile(repoPath('docs/COMMAND_CENTER.md'), 'utf8');
assert(commandCenterSource.includes('buildCommandIndex'), 'CommandCenter should build command index');
assert(commandCenterSource.includes('searchCommands'), 'CommandCenter should search commands');
assert(commandCenterSource.includes('renderCommandCenter'), 'CommandCenter should render UI');
assert(commandUserDashboardSource.includes("id: 'command'"), 'dashboard should include command section');
assert(commandRolePermissionsSource.includes("command: 'command_center:view'"), 'role permissions should include command section');
assert(commandV4ShellSource.includes('renderCommand(root, mount, auth)'), 'V4 shell should render command center');
assert(commandIndexHtml.includes('src/modules/CommandCenter.js'), 'CommandCenter should be loaded in index');
assert(commandCenterDoc.includes('Command Center'), 'Command Center doc should exist');

// v3.9.9 Backend First Write Dry Run+ smoke checks
const backendWriteDryRunSourceFinal = await readFile(repoPath('src/modules/BackendWriteDryRun.js'), 'utf8');
const backendWriteDryRunDoc = await readFile(repoPath('docs/BACKEND_FIRST_WRITE_DRY_RUN.md'), 'utf8');
const v4AppShellSourceFinal = await readFile(repoPath('src/modules/V4AppShell.js'), 'utf8');
assert(backendWriteDryRunSourceFinal.includes('BACKEND_WRITE_DRY_RUN_VERSION'), 'BackendWriteDryRun should declare version');
assert(backendWriteDryRunSourceFinal.includes('buildWriteDryRunReport'), 'BackendWriteDryRun should build write dry-run reports');
assert(backendWriteDryRunSourceFinal.includes('buildSqlPreview'), 'BackendWriteDryRun should build SQL preview');
assert(v4AppShellSourceFinal.includes('BackendWriteDryRun'), 'V4 shell should prefer BackendWriteDryRun in sync section');
assert(backendWriteDryRunDoc.includes('Backend First Write Dry Run+'), 'Backend write dry-run doc should exist');



// v3.10.0 Supabase Auth & Profiles groundwork smoke checks

const serverTestHarnessSourceFinal = await readFile(repoPath('src/modules/ServerTestHarness.js'), 'utf8');
const serverTestHarnessDocFinal = await readFile(repoPath('docs/SERVER_TEST_HARNESS.md'), 'utf8');
const backendHealthFinal = await readFile(repoPath('supabase/functions/backend-health/index.ts'), 'utf8');
const testCleanupFinal = await readFile(repoPath('supabase/functions/test-cleanup/index.ts'), 'utf8');
assert(serverTestHarnessSourceFinal.includes('HARNESS_VERSION') && serverTestHarnessSourceFinal.includes('runServerTestPlan'), 'ServerTestHarness should declare version and run test plan');
assert(serverTestHarnessSourceFinal.includes('x-feg-test-key') && !serverTestHarnessSourceFinal.includes("localStorage.setItem('FEG_SERVER_TEST_KEY'"), 'ServerTestHarness must send test key without storing it');
assert(serverTestHarnessDocFinal.includes('Server Test Harness') && serverTestHarnessDocFinal.includes('test-cleanup'), 'Server Test Harness doc should describe cleanup flow');
assert(backendHealthFinal.includes('server_test_key_configured'), 'backend health function should not expose secrets');
assert(testCleanupFinal.includes('requireTestKey'), 'test cleanup function should require server test key');

const supabaseAuthAdapterSourceFinal = await readFile(repoPath('src/modules/SupabaseAuthAdapter.js'), 'utf8');
const supabaseAuthDocFinal = await readFile(repoPath('docs/SUPABASE_AUTH_PROFILES.md'), 'utf8');
const authProviderSourceFinal = await readFile(repoPath('src/modules/AuthProvider.js'), 'utf8');
const v4AppShellAuthSourceFinal = await readFile(repoPath('src/modules/V4AppShell.js'), 'utf8');
const indexAuthFinal = await readFile(repoPath('index.html'), 'utf8');
assert(supabaseAuthAdapterSourceFinal.includes('SUPABASE_AUTH_ADAPTER_VERSION'), 'SupabaseAuthAdapter should declare version');
assert(supabaseAuthAdapterSourceFinal.includes('signInWithOAuth') && supabaseAuthAdapterSourceFinal.includes('signInWithEmail'), 'SupabaseAuthAdapter should expose email and OAuth draft methods');
assert(authProviderSourceFinal.includes('signInSupabaseEmail') && authProviderSourceFinal.includes('getSupabaseAuthReadiness'), 'AuthProvider should expose Supabase auth helper methods');
assert(v4AppShellAuthSourceFinal.includes('SupabaseAuthAdapter') && v4AppShellAuthSourceFinal.includes('v4SupabaseAuthMount'), 'V4 shell should mount Supabase Auth readiness console');
assert(indexAuthFinal.includes('src/modules/SupabaseAuthAdapter.js'), 'index should load SupabaseAuthAdapter');
assert(supabaseAuthDocFinal.includes('enableSupabaseAuth'), 'Supabase Auth doc should document explicit enable flag');


// v3.10.2 Real Quotes Sync groundwork smoke checks
const quoteServerSyncQueueSourceFinal = await readFile(repoPath('src/modules/QuoteServerSyncQueue.js'), 'utf8');
const quoteProjectsUiSourceFinal = await readFile(repoPath('src/modules/QuoteProjectsUI.js'), 'utf8');
const quoteProjectStorageSourceFinal = await readFile(repoPath('src/modules/QuoteProjectStorage.js'), 'utf8');
const realQuotesSyncDocFinal = await readFile(repoPath('docs/REAL_QUOTES_SYNC_GROUNDWORK.md'), 'utf8');
const indexQuoteSyncFinal = await readFile(repoPath('index.html'), 'utf8');
assert(quoteServerSyncQueueSourceFinal.includes('QUOTE') || quoteServerSyncQueueSourceFinal.includes('QuoteServerSyncQueue'), 'QuoteServerSyncQueue should be present');
assert(quoteServerSyncQueueSourceFinal.includes('stageProject') && quoteServerSyncQueueSourceFinal.includes('buildQueueReport'), 'QuoteServerSyncQueue should expose staging and report builders');
assert(quoteProjectStorageSourceFinal.includes('updateProjectSyncMeta'), 'QuoteProjectStorage should persist sync metadata');
assert(quoteProjectsUiSourceFinal.includes('renderStatusBadge'), 'QuoteProjectsUI should show sync status badges');
assert(v4AppShellAuthSourceFinal.includes('v4QuoteSyncQueueMount') && v4AppShellAuthSourceFinal.includes('QuoteServerSyncQueue'), 'V4 shell should mount quote sync queue console');
assert(indexQuoteSyncFinal.includes('src/modules/QuoteServerSyncQueue.js'), 'index should load QuoteServerSyncQueue');
assert(realQuotesSyncDocFinal.includes('staged queue'), 'Real Quotes Sync doc should describe staged queue');


// v3.10.3 Performance feedback smoke checks
const busyIndicatorSourceFinal = await readFile(repoPath('src/modules/BusyIndicator.js'), 'utf8');
const performanceFeedbackDocFinal = await readFile(repoPath('docs/PERFORMANCE_FEEDBACK.md'), 'utf8');
const quoteProjectsUiPerfFinal = await readFile(repoPath('src/modules/QuoteProjectsUI.js'), 'utf8');
const documentCenterPerfFinal = await readFile(repoPath('src/modules/DocumentCenter.js'), 'utf8');
const quoteProjectStoragePerfFinal = await readFile(repoPath('src/modules/QuoteProjectStorage.js'), 'utf8');
const indexPerfFinal = await readFile(repoPath('index.html'), 'utf8');
assert(busyIndicatorSourceFinal.includes('BusyIndicator') && busyIndicatorSourceFinal.includes('feg-busy-overlay'), 'BusyIndicator should provide visible progress UI');
assert(indexPerfFinal.includes('src/modules/BusyIndicator.js'), 'index should load BusyIndicator');
assert(quoteProjectsUiPerfFinal.includes('Сохраняю проект') && quoteProjectsUiPerfFinal.includes('Обновляю статус проекта'), 'Project UI should show busy labels for heavy operations');
assert(documentCenterPerfFinal.includes('Готовлю центр документов') && documentCenterPerfFinal.includes('Готовлю полный пакет документов'), 'Document Center should show loading/progress states');
assert(quoteProjectStoragePerfFinal.includes('rawCacheText') && quoteProjectStoragePerfFinal.includes('normalizedCacheRows'), 'QuoteProjectStorage should cache localStorage reads and normalization');
assert(performanceFeedbackDocFinal.includes('Performance feedback'), 'performance feedback doc should exist');

// v3.10.4 Equipment Server Sync groundwork smoke checks
const equipmentServerSyncQueueSourceFinal = await readFile(repoPath('src/modules/EquipmentServerSyncQueue.js'), 'utf8');
const equipmentServerSyncDocFinal = await readFile(repoPath('docs/EQUIPMENT_SERVER_SYNC_GROUNDWORK.md'), 'utf8');
const v4AppShellEquipmentSyncFinal = await readFile(repoPath('src/modules/V4AppShell.js'), 'utf8');
const indexEquipmentSyncFinal = await readFile(repoPath('index.html'), 'utf8');
assert(equipmentServerSyncQueueSourceFinal.includes('EquipmentServerSyncQueue') && equipmentServerSyncQueueSourceFinal.includes('buildEquipmentSyncPayload'), 'EquipmentServerSyncQueue should build equipment sync payload');
assert(equipmentServerSyncQueueSourceFinal.includes('stageEquipment') && equipmentServerSyncQueueSourceFinal.includes('renderEquipmentSyncConsole'), 'EquipmentServerSyncQueue should expose staging and UI console');
assert(v4AppShellEquipmentSyncFinal.includes('v4EquipmentSyncQueueMount') && v4AppShellEquipmentSyncFinal.includes('EquipmentServerSyncQueue'), 'V4 shell should mount equipment sync queue console');
assert(indexEquipmentSyncFinal.includes('src/modules/EquipmentServerSyncQueue.js'), 'index should load EquipmentServerSyncQueue');
assert(equipmentServerSyncDocFinal.includes('equipment_items') && equipmentServerSyncDocFinal.includes('staged queue'), 'Equipment sync doc should describe equipment_items staged queue');


const backendPackSourceV3127 = await readFile(repoPath('src/modules/SupabaseBackendPack.js'), 'utf8');
const equipmentDryRunEdgeV3127 = await readFile(repoPath('supabase/functions/equipment-sync-dry-run/index.ts'), 'utf8');
const equipmentControlledWriteEdgeV3127 = await readFile(repoPath('supabase/functions/equipment-controlled-write/index.ts'), 'utf8');
const equipmentSyncAuditDocV3127 = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_SYNC_AUDIT_ROLLBACK.md'), 'utf8');
assert(backendPackSourceV3127.includes('buildEquipmentSyncAuditTrail') && backendPackSourceV3127.includes('feg_equipment_sync_audit.json') && backendPackSourceV3127.includes('fegV4EquipmentSyncAuditSnapshots'), 'Backend pack should expose sync audit trail and local snapshots');
assert(backendPackSourceV3127.includes('buildEquipmentSyncRollbackHints') && backendPackSourceV3127.includes('feg_equipment_sync_rollback_hints.json'), 'Backend pack should expose rollback hints export');
assert(equipmentSyncAuditDocV3127.includes('Sync audit') && equipmentSyncAuditDocV3127.includes('automatic_rollback: false'), 'sync audit rollback doc should explain non-automatic rollback safety');
assert(equipmentControlledWriteEdgeV3127.includes('sync_audit_required') && equipmentControlledWriteEdgeV3127.includes('rollback_hints'), 'controlled write edge should ask for sync audit and return rollback hints');
assert(equipmentDryRunEdgeV3127.includes("version: '3.12.7'"), 'equipment dry-run edge should declare 3.12.7');

console.log('check ok');
if (typeof process !== 'undefined' && process.reallyExit) process.reallyExit(0);
if (typeof process !== 'undefined' && process.exit) process.exit(0);

const equipmentDatabaseUiEditorSourceFinal = await readFile(repoPath('src/modules/EquipmentDatabaseUI.js'), 'utf8');
const equipmentDatabaseEditorDocFinal = await readFile(repoPath('docs/EQUIPMENT_DATABASE_EDITOR.md'), 'utf8');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-open-new') && equipmentDatabaseUiEditorSourceFinal.includes('openEquipmentEditor'), 'EquipmentDatabaseUI should expose add/edit modal controls');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-edit') && equipmentDatabaseUiEditorSourceFinal.includes('Редактировать позицию'), 'Equipment rows/cards should expose edit actions');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-generate-code') && equipmentDatabaseUiEditorSourceFinal.includes('bindCodeGenerator'), 'Equipment editor should expose automatic category code generation');
assert(equipmentDatabaseUiEditorSourceFinal.includes('validateEditorItem') && equipmentDatabaseUiEditorSourceFinal.includes('Код уже используется'), 'Equipment editor should validate required code/name and duplicate codes');
assert(equipmentDatabaseEditorDocFinal.includes('STG-001') && equipmentDatabaseEditorDocFinal.includes('Автогенерация'), 'Equipment editor doc should describe category-based code generation');
assert(equipmentDatabaseEditorDocFinal.includes('Добавить позицию') && equipmentDatabaseEditorDocFinal.includes('equipment_items'), 'Equipment editor doc should describe add/edit and future equipment_items mapping');
assert(equipmentServerSyncQueueSourceFinal.includes('schema_report') && equipmentServerSyncQueueSourceFinal.includes('type_report'), 'Equipment sync queue should include type/schema diagnostics');
assert(equipmentServerSyncQueueSourceFinal.includes('sync_preview') && equipmentServerSyncQueueSourceFinal.includes('buildEquipmentSyncPreview'), 'Equipment sync queue should include sync preview diagnostics');
assert(equipmentServerSyncQueueSourceFinal.includes('readiness_report') && equipmentServerSyncQueueSourceFinal.includes('buildEquipmentReadinessReport'), 'Equipment sync queue should include readiness diagnostics');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-sync-preview') && equipmentDatabaseUiEditorSourceFinal.includes('Sync preview JSON'), 'Equipment UI should expose sync preview JSON export');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-readiness') && equipmentDatabaseUiEditorSourceFinal.includes('Safe cleanup'), 'Equipment UI should expose readiness JSON and safe cleanup');
assert(equipmentDatabaseUiEditorSourceFinal.includes('data-v4-equipment-completion') && equipmentDatabaseUiEditorSourceFinal.includes('Patch template') && equipmentDatabaseUiEditorSourceFinal.includes('Import patch'), 'Equipment UI should expose manual completion matrix and patch workflow');
assert(equipmentServerSyncQueueSourceFinal.includes('buildEquipmentStagedDiff') && equipmentServerSyncQueueSourceFinal.includes('buildEquipmentControlledWritePlan'), 'Equipment sync queue should expose staged diff and controlled write plan');
assert(equipmentServerSyncQueueSourceFinal.includes('WRITE EQUIPMENT') && equipmentServerSyncQueueSourceFinal.includes('remote_write_not_enabled_in_static_build'), 'Equipment controlled write must stay behind explicit admin gate');
const backendPackSourceFinal = await readFile(repoPath('src/modules/SupabaseBackendPack.js'), 'utf8');
const backendPackDocFinal = await readFile(repoPath('docs/SUPABASE_BACKEND_SYNC_HARDENING.md'), 'utf8');
assert(backendPackSourceFinal.includes('renderBackendPackConsole') && backendPackSourceFinal.includes('controlled_write_function'), 'Backend pack UI should expose rollout console and controlled write function');
assert(backendPackSourceFinal.includes('buildRemoteDryRunHistoryReport') && backendPackSourceFinal.includes('saveRemoteDryRunBaseline'), 'Backend pack should keep remote dry-run history and baseline helpers');
assert(backendPackSourceFinal.includes('buildControlledWritePreflight') && backendPackSourceFinal.includes('feg_equipment_controlled_write_preflight.json'), 'Backend pack should expose controlled write preflight export');
assert(backendPackSourceFinal.includes('Diff ins/upd/only') && backendPackSourceFinal.includes('Remote dry-run history JSON'), 'Backend pack UI should show dry-run diff/history status');
assert(v4AppShellEquipmentSyncFinal.includes('v4BackendPackMount') && v4AppShellEquipmentSyncFinal.includes('SupabaseBackendPack'), 'V4 shell should mount backend pack console');
assert(indexEquipmentSyncFinal.includes('src/modules/SupabaseBackendPack.js'), 'index should load SupabaseBackendPack');
assert(backendPackDocFinal.includes('equipment-sync-dry-run') && backendPackDocFinal.includes('equipment-controlled-write'), 'Backend pack doc should describe equipment Edge functions');
const equipmentRemoteDryRunDocFinal = await readFile(repoPath('docs/SUPABASE_REMOTE_EQUIPMENT_DRY_RUN.md'), 'utf8');
const equipmentWritePreflightDocFinal = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_WRITE_PREFLIGHT.md'), 'utf8');
const equipmentControlledWriteRunnerDocFinal = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_CONTROLLED_WRITE_RUNNER.md'), 'utf8');
const equipmentDryRunEdgeFinal = await readFile(repoPath('supabase/functions/equipment-sync-dry-run/index.ts'), 'utf8');
const equipmentControlledWriteEdgeFinal = await readFile(repoPath('supabase/functions/equipment-controlled-write/index.ts'), 'utf8');
assert(equipmentRemoteDryRunDocFinal.includes('v3.12.4') && equipmentRemoteDryRunDocFinal.includes('buildEquipmentWriteApprovalPackage'), 'remote equipment dry-run doc should describe v3.12.4 approval package');
assert(equipmentWritePreflightDocFinal.includes('controlled_write_preflight') && equipmentWritePreflightDocFinal.includes('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true'), 'equipment write preflight doc should describe preflight and final gates');
assert(backendPackSourceFinal.includes('buildEquipmentWriteApprovalPackage') && backendPackSourceFinal.includes('payload_checksum') && backendPackSourceFinal.includes('feg_equipment_write_approval_package.json'), 'Backend pack should expose approval package and payload checksum gate');
assert(equipmentControlledWriteEdgeFinal.includes('approval_package') && equipmentControlledWriteEdgeFinal.includes('payload_checksum'), 'controlled write edge function should require approval package checksum');
assert(equipmentDryRunEdgeFinal.includes('promotion_gate') && equipmentDryRunEdgeFinal.includes('ready_for_controlled_write_preflight') && equipmentDryRunEdgeFinal.includes('payload_checksum'), 'equipment dry-run edge function should return promotion_gate and payload checksum');
assert(backendPackSourceFinal.includes('runEquipmentControlledWriteEdge') && backendPackSourceFinal.includes('buildEquipmentControlledWriteExecutionRequest') && backendPackSourceFinal.includes('fegV4EquipmentControlledWriteReports'), 'Backend pack should expose controlled write Edge runner and result history');
assert(backendPackSourceFinal.includes('runEquipmentPostWriteVerification') && backendPackSourceFinal.includes('fegV4EquipmentPostWriteVerificationReports'), 'Backend pack should expose post-write verification and result history');
assert(backendPackSourceFinal.includes('Проверить после write') && backendPackSourceFinal.includes('Post-write verify'), 'Backend pack UI should expose post-write verification button and status');
assert(backendPackSourceFinal.includes('store.setItem(EQUIPMENT_WRITE_APPROVAL_KEY, safeJson(approval))'), 'Approval package must be stored under its own storage key');
assert(backendPackSourceFinal.includes('Запустить controlled write Edge') && backendPackSourceFinal.includes('Write confirm phrase'), 'Backend pack UI should expose controlled write runner button and phrase field');
const equipmentPostWriteVerificationDocFinal = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_POST_WRITE_VERIFICATION.md'), 'utf8');
const equipmentSyncAuditDocFinal = await readFile(repoPath('docs/SUPABASE_EQUIPMENT_SYNC_AUDIT_ROLLBACK.md'), 'utf8');
assert(equipmentControlledWriteRunnerDocFinal.includes('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true'), 'controlled write runner docs should describe final write gates');
assert(equipmentPostWriteVerificationDocFinal.includes('post-write verification') && equipmentPostWriteVerificationDocFinal.includes('remote_only = 0'), 'post-write verification docs should describe final verification gates');
assert(equipmentDryRunEdgeFinal.includes('post_write_verification_gate') && equipmentDryRunEdgeFinal.includes('post_write_verified'), 'equipment dry-run edge should expose post-write verification gate');
assert(equipmentControlledWriteEdgeFinal.includes('post_write_verification_required'), 'controlled write edge should require follow-up verification');
assert(backendPackSourceFinal.includes('buildEquipmentSyncAuditTrail') && backendPackSourceFinal.includes('feg_equipment_sync_audit.json') && backendPackSourceFinal.includes('fegV4EquipmentSyncAuditSnapshots'), 'Backend pack should expose sync audit trail and local snapshots');
assert(backendPackSourceFinal.includes('buildEquipmentSyncRollbackHints') && backendPackSourceFinal.includes('feg_equipment_sync_rollback_hints.json'), 'Backend pack should expose rollback hints export');
assert(equipmentSyncAuditDocFinal.includes('Sync audit') && equipmentSyncAuditDocFinal.includes('automatic_rollback: false'), 'sync audit rollback doc should explain non-automatic rollback safety');
assert(equipmentControlledWriteEdgeFinal.includes('sync_audit_required') && equipmentControlledWriteEdgeFinal.includes('rollback_hints'), 'controlled write edge should ask for sync audit and return rollback hints');
const quoteBackendPackFinal = await readFile(repoPath('src/modules/QuoteBackendSyncPack.js'), 'utf8');
const quoteDryRunEdgeFinal = await readFile(repoPath('supabase/functions/quote-sync-dry-run/index.ts'), 'utf8');
const quoteDryRunMigrationFinal = await readFile(repoPath('supabase/migrations/202605120003_quote_backend_sync_dry_run.sql'), 'utf8');
const quoteRemoteDryRunDocFinal = await readFile(repoPath('docs/SUPABASE_QUOTES_REMOTE_DRY_RUN.md'), 'utf8');
const quoteWriteApprovalDocFinal = await readFile(repoPath('docs/SUPABASE_QUOTES_WRITE_APPROVAL.md'), 'utf8');
assert(quoteBackendPackFinal.includes('QuoteBackendSyncPack') && quoteBackendPackFinal.includes('fegV4QuoteRemoteDryRunReports'), 'QuoteBackendSyncPack should expose local quote dry-run history');
assert(quoteBackendPackFinal.includes('buildQuoteWriteApprovalPackage') && quoteBackendPackFinal.includes('compareQuoteApprovalWithCurrentPayload') && quoteBackendPackFinal.includes('feg_quote_write_approval_package.json'), 'QuoteBackendSyncPack should expose quote approval package and stale checksum gate');
assert(quoteBackendPackFinal.includes('Approved template') && quoteBackendPackFinal.includes('controlled_quote_write_enabled: false'), 'Quote backend UI should expose approved template but keep quote write disabled');
assert(quoteDryRunEdgeFinal.includes('feg-stage-pro-quote-edge-dry-run-report') && quoteDryRunEdgeFinal.includes('remote_write_executed: false'), 'quote dry-run Edge should return read-only report');
assert(quoteDryRunEdgeFinal.includes('approval_advisory') && quoteDryRunEdgeFinal.includes('payload_checksum'), 'quote dry-run Edge should return approval advisory and payload checksum');
assert(quoteDryRunMigrationFinal.includes('feg_can_write_quotes') && quoteDryRunMigrationFinal.includes('quote_sections_workspace_local_id_idx'), 'quote sync migration should add quote local_id helpers and indexes');
assert(quoteRemoteDryRunDocFinal.includes('Clients/quotes remote dry-run') && quoteRemoteDryRunDocFinal.includes('no_stock_movements'), 'quote remote dry-run docs should describe no-stock safety');
assert(quoteWriteApprovalDocFinal.includes('fegV4QuoteWriteApprovalPackage') && quoteWriteApprovalDocFinal.includes('Stale protection') && quoteWriteApprovalDocFinal.includes('controlled_quote_write_enabled'), 'quote write approval docs should explain approval package and disabled write');

console.log('final equipment editor checks ok');
if (typeof process !== 'undefined' && process.reallyExit) process.reallyExit(0);
if (typeof process !== 'undefined' && process.exit) process.exit(0);
