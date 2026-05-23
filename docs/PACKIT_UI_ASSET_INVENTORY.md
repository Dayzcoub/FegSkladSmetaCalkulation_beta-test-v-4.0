# Pack.it UI / asset inventory

Документ фиксирует первый реальный проход по текущему UI-коду перед нормальным Pack.it UI rebuild.

Цель документа: собрать карту экранов, UI-модулей, CSS-слоёв, ассетов и рисков, чтобы дальше не чинить интерфейс точечными CSS-костылями.

## Статус прохода

- Репозиторий: `Dayzcoub/FegSkladSmetaCalkulation_beta-test-v-4.0`.
- Branch: `main`.
- Код приложения не менялся.
- Расчёты, BOM, склад, PDF, backend writes и бизнес-логика не менялись.
- Добавлен только этот inventory-документ.

## 1. Entry points

### `index.html`

Текущий HTML уже работает как v4-only shell:

- подключает `src/styles/main.css` как единую CSS-точку входа;
- подключает PDF-библиотеки `jspdf` и `html2canvas` через CDN;
- подключает Supabase UMD через CDN;
- содержит корневую страницу `#v4ShellPage`;
- содержит скрытую область `#pdfContent` для генерации документов;
- подключает большой набор модулей через `<script>` в ручном порядке.

Ключевой вывод: UI сейчас живёт в legacy-style vanilla JS + глобальный namespace `window.FEGModules`, без сборки компонентного дерева. Rebuild должен учитывать это и не ломать порядок загрузки модулей.

### `package.json`

Текущий пакет:

- `name`: `feg-stage-pro`;
- `version`: `3.17.50`;
- build/dev через Vite;
- зависимости: Supabase, html2canvas, jspdf;
- проверки: `node scripts/check.mjs`, Vite build/preview, Playwright e2e.

## 2. Shell / navigation inventory

### Core shell modules

- `src/modules/V4AppShell.js`
- `src/modules/UserDashboard.js`
- `src/modules/V4DesignSystem.js`
- `src/modules/RolePermissions.js`
- `src/modules/AuthProvider.js`
- `src/modules/AuthGuards.js`
- `src/modules/AuthShell.js`
- `src/modules/AccessOnboardingPanel.js`

### Current shell behavior

`V4AppShell.js` отвечает за:

- auth screen;
- expired guest screen;
- left nav rail;
- topbar;
- active section mount;
- section routing;
- logout;
- access guard through `AuthProvider` / `RolePermissions`.

`UserDashboard.js` фиксирует список разделов:

- `quick` — Быстрый расчёт;
- `quote` — Оформить смету;
- `projects` — Проекты / история;
- `warehouse` — Склад / наличие;
- `equipment` — База оборудования;
- `subrentors` — Субаренда;
- `site_checklist` — Чек-лист площадки;
- `documents` — Документы;
- `clients` — Клиенты;
- `command` — Поиск / команды;
- `communication` — Chats / Notifications;
- `reports` — Отчёты;
- `quality` — Контроль данных;
- `settings` — Настройки;
- `sync` — Backend / Sync;
- `admin` — Админка.

### Shell rebuild notes

Что оставить:

- разделение на nav rail / topbar / page mount;
- role-based visibility;
- отдельные guards;
- единый active section routing.

Что переделать:

- заменить emoji section icons на нормальные Pack.it UI icons;
- убрать inline styles из shell-разметки;
- унифицировать page header / toolbar / right context panel;
- проверить, чтобы sync/dev/admin не были доступны обычному пользователю;
- сделать mobile shell по контракту `<=767px`, desktop/tablet `>=768px`.

## 3. CSS inventory

### Main entry

- `src/styles/main.css`

Импортирует:

- `tokens.css`;
- `reset.css`;
- `base.css`;
- `components/shell.css`;
- `components/layout.css`;
- `components/buttons-forms.css`;
- `components/tables-status.css`;
- `components/modals.css`;
- `modules/configurators.css`;
- `technical/canvas.css`;
- `modules/quick.css`;
- `modules/summary-kpi.css`;
- `modules/auth.css`;
- `modules/wizard.css`;
- `modules/wizard-steps.css`;
- `modules/projects-warehouse.css`;
- `modules/admin.css`;
- `modules/dashboard.css`;
- `modules/equipment.css`;
- `modules/quote.css`;
- `modules/truss.css`;
- `modules/sync.css`;
- `modules/reports.css`;
- `modules/misc.css`.

### Design token status

`src/styles/tokens.css` уже является хорошей базой для системного rebuild:

- фоны;
- панели;
- поверхности;
- линии;
- текст;
- accent/blue;
- success/warning/danger/info;
- радиусы;
- тени;
- font stacks;
- shell sizes;
- canvas/stage wood variables.

### CSS risks found

1. В `shell.css`, `quick.css`, `configurators.css` есть промежуточные breakpoints:

```text
1200 / 900 / 640 / 520
```

Это конфликтует с текущим переходным правилом:

```text
<=767px mobile
>=768px desktop/tablet
```

2. В CSS есть много точечных module-specific overrides. Их нельзя просто наращивать дальше. Нужно выделить слой общих layout primitives:

- page layout;
- workbench layout;
- side panel;
- summary panel;
- action bar;
- form grid;
- smart table;
- constructor canvas shell.

3. В JS-разметке встречаются inline styles. Их нужно вынести в CSS-классы во время rebuild.

## 4. Quick constructors inventory

### Related modules

- `src/modules/QuickCalculators.js`
- `src/modules/QuickTechnicalSheets.js`
- `src/modules/QuickPdfExport.js`
- `src/modules/QuickIdealCatalog.js`
- `src/modules/StageGridState.js`
- `src/modules/StageCalculator.js`
- `src/modules/V4StructureConfigurator.js`
- `src/modules/V4StructureVisualConfigurator.js`
- `src/modules/TrussBlockConstructor.js`
- `src/modules/LoadChecker.js`
- `src/modules/LedCalculator.js`
- `src/modules/LedCalculatorUI.js`
- `src/modules/V4SharedBomBridge.js`
- `src/modules/V4LedBomBridge.js`
- `src/modules/V4UnifiedBomExport.js`
- `src/modules/V4BomContract.js`

### Current quick screen behavior

Quick section in `V4AppShell.js` renders four tabs:

- Stage;
- Truss;
- LED;
- 3D MDM placeholder.

The active constructor renders inline into `#v4QuickConfigMount`.

The lower area renders:

- technical docs;
- BOM inspector placeholder.

### Rebuild notes

Do not touch:

- calculations;
- BOM generation;
- load checks;
- LED formulas;
- PDF export logic;
- quick draft storage;
- warehouse/quote bridges.

Do rebuild:

- unified constructor shell;
- stable left controls / center canvas / right summary pattern;
- consistent zoom block;
- consistent canvas cards;
- consistent lower technical output panel;
- no modal-backdrop hacks for inline mode;
- real product icons instead of text/emoji tab icons.

## 5. Quote / estimate wizard inventory

### Related modules

- `src/modules/QuoteWizard.js`
- `src/modules/QuoteModel.js`
- `src/modules/QuoteDraftStorage.js`
- `src/modules/QuoteProjectStorage.js`
- `src/modules/QuoteEquipmentPicker.js`
- `src/modules/QuoteSectionBinder.js`
- `src/modules/QuoteSummaryBuilder.js`
- `src/modules/QuoteDocumentBuilder.js`
- `src/modules/QuoteItemBuilder.js`
- `src/modules/V4QuoteDraftBomSink.js`
- `src/modules/V4QuoteDraftHydrator.js`

### Current wizard steps

`QuoteWizard.js` defines:

1. Client and project;
2. Venue and contacts;
3. Scope;
4. Stage;
5. Truss;
6. LED;
7. Sound/light/services/equipment;
8. Transport;
9. Project crew;
10. Summary and documents.

### Quote rebuild notes

Keep:

- step logic;
- validation;
- bind buttons;
- draft save/load;
- section binder;
- final summary builder;
- warehouse picklist builder.

Rebuild UI around:

- stable step rail;
- fixed action area;
- section-specific workbench;
- summary/right panel;
- smart equipment rows;
- subrent/manual rows styled like stock rows;
- no jumping main buttons.

Important existing behavior to preserve:

- Stage button: `Добавить сцену в смету`;
- Truss button: `Добавить фермы в смету`;
- LED button: `Добавить LED в смету`;
- Equipment button: `Добавить оборудование в смету`.

## 6. Warehouse / equipment / operations inventory

### Related modules

- `src/modules/EquipmentDatabase.js`
- `src/modules/EquipmentDatabaseUI.js`
- `src/modules/AvailabilityChecker.js`
- `src/modules/WarehousePickListBuilder.js`
- `src/modules/SupplierDirectory.js`
- `src/modules/SubrentorsDirectoryUI.js`
- `src/modules/SubrentPlanner.js`
- `src/modules/ReservationPlanner.js`
- `src/modules/StockMovementPlanner.js`
- `src/modules/WarehouseWorkflow.js`
- `src/modules/WarehouseOperationsHub.js`

### Rebuild notes

Warehouse UI should show operational statuses, not raw diagnostic payloads:

- what to pick;
- what is available;
- deficit;
- subrent replacement;
- issue/return status;
- project link;
- damage/notes later.

Do not touch:

- equipment data;
- stock movement logic;
- reservations;
- availability calculations;
- supplier/subrent data model.

## 7. Documents / PDF inventory

### Related modules

- `src/modules/PdfGenerator.js`
- `src/modules/QuickPdfExport.js`
- `src/modules/PdfTemplateEngine.js`
- `src/modules/DocumentCenter.js`
- `src/modules/QuoteDocumentBuilder.js`
- `src/modules/VisualExport.js`

### Rebuild notes

Do not break current PDF export.

UI work should focus on:

- export panel layout;
- contrast;
- preview modal layout;
- separation between client documents and dev/admin diagnostics;
- removal of technical second lines in client-facing outputs where already approved.

## 8. Visual preview inventory

### Related modules

- `src/modules/visual/StageVisualAdapter.js`
- `src/modules/visual/TrussVisualAdapter.js`
- `src/modules/visual/LedVisualAdapter.js`
- `src/modules/visual/AudioVisualAdapter.js`
- `src/modules/visual/LightVisualAdapter.js`
- `src/modules/visual/VisualModelBuilder.js`
- `src/modules/visual/ProjectRenderer2D.js`
- `src/modules/visual/ProjectRendererIso.js`
- `src/modules/visual/VisualExport.js`
- `src/modules/visual/VisualPreviewPanel.js`

### Rebuild notes

Keep visual model and renderer logic stable.

UI work should provide:

- consistent preview card;
- top/front/iso tabs or segmented control;
- stable dimensions;
- no mixed theme panels;
- normal empty/error states.

## 9. Admin / diagnostics / sync inventory

### Related modules

- `src/modules/AdminShell.js`
- `src/modules/AdminControlCenter.js`
- `src/modules/DataQualityCenter.js`
- `src/modules/ReportsCenter.js`
- `src/modules/SupabaseBackendPack.js`
- `src/modules/QuoteBackendSyncPack.js`
- `src/modules/SupabaseSyncConsole.js`
- `src/modules/BackendWriteDryRun.js`
- `src/modules/QuoteServerSyncQueue.js`
- `src/modules/EquipmentServerSyncQueue.js`
- `src/modules/ServerTestHarness.js`
- `src/modules/BackendSyncAdapter.js`
- `src/modules/ProjectAuditLog.js`
- `src/modules/ImportRestoreCenter.js`

### Rebuild notes

Strict rule:

- ordinary user must not see raw JSON, snapshots, validation reports, backend payloads, dry-run consoles;
- diagnostics only through permissions, feature flags and environment gates;
- sync/admin screens must remain separate from operational user screens.

## 10. Current asset inventory

### Existing root assets referenced directly

From `index.html` and `manifest.json`:

- `icon-180.png`;
- `icon-192.png`;
- `icon-512.png`;
- `manifest.json`.

### Current asset structure issue

The future target structure is documented as:

```text
/public/assets
    /brand
    /home
    /constructors
        /stage
        /truss
        /led
        /3d
    /documents
    /empty
    /field
    /icons
    /legacy
```

But the current app still references root-level legacy PWA icons. New Pack.it assets should move toward the structured folder layout while keeping legacy compatibility during transition.

### Required missing asset list

Brand:

- `assets/brand/packit-logo.svg`;
- `assets/brand/packit-wordmark.svg`;
- light/dark variants if needed.

PWA:

- `assets/brand/icon-180.png`;
- `assets/brand/icon-192.png`;
- `assets/brand/icon-512.png`;
- `assets/brand/favicon.ico` or PNG favicon set.

Home:

- `assets/home/hero-stage-led-portal-wide.webp`;
- `assets/home/icon-stage-polished.png`;
- `assets/home/icon-truss-round-tubes.png`;
- `assets/home/icon-led-screen.png`;
- `assets/home/icon-project-quote.png`;
- `assets/home/icon-warehouse.png`;
- `assets/home/icon-documents.png`;
- `assets/home/icon-admin.png`;
- `assets/home/icon-field-kit.png` later.

Constructors:

- `assets/constructors/stage/stage-deck-texture.png`;
- `assets/constructors/led/led-cabinet-texture.png`;
- `assets/constructors/truss/...` for truss SVG/PNG artwork;
- `assets/constructors/3d/...` later for MDM GLB previews.

Empty states:

- `assets/empty/no-projects.svg`;
- `assets/empty/no-quotes.svg`;
- `assets/empty/no-documents.svg`;
- `assets/empty/no-equipment.svg`;
- `assets/empty/no-clients.svg`;
- `assets/empty/no-internet.svg`;
- `assets/empty/no-diagnostics.svg`.

## 11. First rebuild plan

### Phase 1 — inventory and constraints

- Keep this document updated while inspecting screens.
- Do not change business logic.
- Mark all inline styles and breakpoint conflicts.
- Mark all emoji/temp icons that need assets.

### Phase 2 — layout primitives

Create or normalize CSS primitives:

- app shell;
- page header;
- page toolbar;
- content layout;
- workbench layout;
- side panel;
- summary panel;
- sticky/fixed action bar;
- smart table;
- empty state;
- status badge;
- diagnostics panel.

### Phase 3 — assets

- Prepare approved Pack.it assets as separate files.
- Do not use preview boards as UI assets.
- Add asset manifest later.
- Keep root icons temporarily until manifest/index migration is done.

### Phase 4 — Home and shell

- Replace current Pack.it mark placeholder and emoji nav icons.
- Add proper Home/Command Center layout.
- Keep role gates.

### Phase 5 — quick constructors

- Rebuild visual layout for Stage, Truss, LED around common constructor shell.
- Preserve calculations and BOM.
- Move all constructor-specific layout hacks into shared patterns.

### Phase 6 — quote wizard

- Rebuild all steps into one stable layout contract.
- Keep primary buttons stable.
- Preserve section binding.

### Phase 7 — warehouse/documents/admin

- Rebuild operational screens.
- Hide diagnostics from ordinary users.
- Keep dev/admin tools isolated.

## 12. Immediate issues to fix during rebuild

1. Replace intermediate breakpoints with the agreed responsive contract.
2. Remove inline styles from JS-generated UI.
3. Replace emoji icons with approved image/SVG assets.
4. Separate user-facing outputs from dev/admin diagnostics.
5. Stop adding local CSS overrides for individual blocks.
6. Normalize constructor layout across Stage / Truss / LED.
7. Normalize quote wizard action area so main buttons do not jump.
8. Move new assets into structured `/public/assets` folders.
9. Add asset manifest after assets are prepared.
10. Keep legacy root PWA icons until the app references are migrated safely.
