# Pack.it UI scheme source map

Документ фиксирует, как использовать найденный `PACKIT_Build_To_Target_UI_Reconstruction_MasterSpec_v1_2_1_corrected_schemes.docx` в текущем UI rebuild.

Важно: MasterSpec содержит почти полный набор визуальных схем, но порядок шагов сметчика в нём не должен автоматически заменять текущий функциональный порядок `QuoteWizard.js`.

Этот документ является мостом:

```text
MasterSpec visual schemes -> current functional modules -> Pack.it rebuild phases
```

## 1. Источник

Файл-источник:

```text
PACKIT_Build_To_Target_UI_Reconstruction_MasterSpec_v1_2_1_corrected_schemes.docx
```

Назначение источника:

- взять визуальные схемы разделов;
- взять layout direction;
- взять композиционную логику;
- не смешивать ранние светлые/коллажные мокапы;
- не использовать схемы как прямой порядок бизнес-флоу без сверки с текущим билдом.

## 2. Что из MasterSpec принимаем как актуальное

Принимаем:

- dark Pack.it UI direction;
- left navigation rail;
- top identity/context bar;
- page header;
- stepper/status cards;
- workbench layout;
- right summary/context panel;
- bottom notes/BOM/details;
- bottom workflow action bar;
- quick constructor triad: left params, center constructor, right summary, bottom BOM/analytics;
- визуалы разделов Warehouse, Projects, Equipment, Subrent, Site checklist, Documents, CRM, Reports, Data Quality, Settings.

Не принимаем автоматически:

- порядок шагов сметчика;
- названия шагов, если они конфликтуют с текущим `QuoteWizard.js`;
- любые старые mixed/light collage варианты;
- прямое использование изображений как UI assets.

## 3. Functional source of truth: current QuoteWizard

Текущий функциональный порядок сметчика в коде должен оставаться source of truth до отдельного решения о продуктовой перестройке.

Current `QuoteWizard.js` order:

```text
1. client     — Клиент и проект
2. venue      — Площадка и контакты
3. scope      — Состав сметы
4. stage      — Сцена
5. truss      — Фермы
6. led        — LED экран
7. equipment  — Звук, свет, услуги / оборудование
8. transport  — Транспорт
9. crew       — Команда проекта
10. summary   — Сводка и документы
```

Этот порядок нельзя менять в рамках UI rebuild без отдельной задачи, потому что к нему привязаны:

- validation;
- section binding;
- draft state;
- BOM handoff;
- quote summary;
- document/export flow.

## 4. Corrected visual mapping for current build

### Quote Wizard

| Current step | Functional ID | Current title | MasterSpec visual source | How to use |
|---:|---|---|---|---|
| 1 | `client` | Клиент и проект | `1.png` | Использовать как визуальный ориентир формы клиента/проекта, right summary и bottom action bar. |
| 2 | `venue` | Площадка и контакты | `10.png` | Использовать как визуальный ориентир площадки, контактов, доступа/заезда и правой панели. |
| 3 | `scope` | Состав сметы | `2.png` | Использовать как визуал крупных чек-карточек выбора разделов. |
| 4 | `stage` | Сцена | `Сцена.png` plus quote-mode adaptation | В MasterSpec сцена есть как quick calculator. Для quote step использовать ту же constructor/workbench логику, но с quote bind action. |
| 5 | `truss` | Фермы | `Фермы.png` plus quote-mode adaptation | В MasterSpec фермы есть как quick calculator. Для quote step использовать ту же constructor/workbench логику, но с quote bind action and load checks. |
| 6 | `led` | LED экран | `ЛЭД.png` plus quote-mode adaptation | В MasterSpec LED есть как quick calculator. Для quote step использовать ту же constructor/workbench логику, но с quote bind action. |
| 7 | `equipment` | Звук, свет, услуги | `3.png` and parts of `8.png` | Основной ориентир — tabs/categories, left filters, selected rows, right category summary. `8.png` использовать для источников склад/ручной ввод/аренда. |
| 8 | `transport` | Транспорт | `5.png` | Использовать как визуальный ориентир маршрута, тарифов, расчёта и right summary. |
| 9 | `crew` | Команда проекта | `6.png` | Использовать как визуальный ориентир команды, ролей, доступа, оплаты и таблицы участников. |
| 10 | `summary` | Сводка и документы | `4.png` and `7.png` | Использовать как визуал сводки, документов, финальной проверки, экспорта и сохранения. |

### MasterSpec-only / future quote concepts

| MasterSpec visual | Meaning | Current handling |
|---|---|---|
| `9.png` Финансы и тарифы | Скидки, наценки, НДС, валюта, транспортные тарифы | Пока не является отдельным текущим step. Использовать later как future finance/tariff panel inside summary/settings/quote totals. |
| `7.png` Проверка и финал | Финальная проверка, структура сметы, экспорт | Использовать как часть current step 10 `summary`, не как отдельный step 10 plus another summary step. |
| `8.png` Оборудование | Источники позиций, склад/ручной ввод/аренда | Использовать внутри current step 7 `equipment`, а не как отдельный step 8, чтобы не ломать current flow. |

## 5. Quick constructors mapping

| Section | Current module area | MasterSpec visual source | How to use |
|---|---|---|---|
| Quick Stage | `QuickCalculators`, `V4StructureVisualConfigurator`, `StageCalculator` | `Сцена.png` | Parameters left, constructor center, summary right, BOM/analytics bottom. |
| Quick Truss | `TrussBlockConstructor`, `LoadChecker`, `V4StructureVisualConfigurator` | `Фермы.png` | Params/library left, 2D constructor center, load checks and summary right, BOM/warnings bottom. |
| Quick LED | `LedCalculator`, `LedCalculatorUI` | `ЛЭД.png` | Cabinet grid center, configuration/params left, power/weight/BOM summary right. |
| 3D MDM | future module / placeholder | `3Д вьювер.png` | Asset library, viewer, selected object, snap points, BOM preview. |

## 6. Service sections mapping

| Current section | Current module | MasterSpec visual source | How to use |
|---|---|---|---|
| Warehouse | `WarehouseOperationsHub`, `WarehouseWorkflow`, `AvailabilityChecker` | `warehouse_management_dashboard_overview.png` | KPI, остатки, pick/issue/return, right panel, bottom analytics. |
| Projects | `QuoteProjectsUI`, `QuoteProjectStorage` | `modern_project_management_dashboard_overview.png` | Filters, KPI, project table, statuses, activity/context right. |
| Equipment DB | `EquipmentDatabaseUI`, `EquipmentDatabase` | `dark_themed_inventory_management_dashboard_ui.png` | Catalog filters, KPI, table, selected equipment card right. |
| Subrent | `SubrentorsDirectoryUI`, `SubrentPlanner`, `SupplierDirectory` | `dark_themed_asset_management_dashboard_ui.png` | Suppliers, subrent requests, deficit links, quick actions. |
| Site checklist | `SiteChecklist`, `ProjectReadinessChecklist` | `dark_themed_admin_dashboard_interface_design.png` | Readiness, blockers, check sections, contacts, dates. |
| Documents | `DocumentCenter`, `PdfTemplateEngine`, `QuoteDocumentBuilder` | `document_management_dashboard_interface_design.png` | Document tabs, document table, selected preview, activity log. |
| Clients / CRM | `V4ClientsPanel`, `ClientsStorage`, `ClientsManager` | `modern_crm_dashboard_with_detailed_client_profilin.png` | Filters, KPI, clients table, selected company card. |
| Reports | `ReportsCenter` | `modern_analytics_dashboard_interface_design.png` | Period, KPI, charts, revenue structure, quick reports. |
| Data Quality | `DataQualityCenter` | `modern_enterprise_dashboard_interface.png` | Issues, duplicates, corrections, sync state. |
| Settings | `SettingsPanel`, `WorkspaceSettings`, `AppSettings` | `dark_themed_web_application_settings_dashboard.png` | Workspace/users/notifications/integrations/appearance tabs, right system panel. |

## 7. Implementation priority

### Phase 1 — source preservation

- Keep MasterSpec as design source.
- Extract visual files later into a proper design/reference archive if needed.
- Do not use embedded scheme screenshots as runtime UI assets.

### Phase 2 — CSS primitives

Already started:

- `src/styles/components/primitives.css`;
- `packit-page-header`;
- `packit-workbench`;
- `packit-stepper`;
- `packit-bottom-action-bar`;
- `packit-table`;
- `packit-summary-panel`;
- `packit-constructor-shell`.

### Phase 3 — first real migration target

Recommended first target:

```text
current QuoteWizard step 7 equipment
```

Reason:

- it has the strongest visual reference from MasterSpec/reference image;
- it demonstrates the full workbench pattern;
- it can establish table, filters, right summary and bottom action bar patterns.

### Phase 4 — quote constructors

Migrate current steps 4/5/6:

- stage;
- truss;
- LED.

Use quick constructor visuals adapted for quote-mode.

### Phase 5 — quick constructors

Migrate standalone quick calculators after quote-mode patterns are stable.

### Phase 6 — service sections

Migrate Warehouse, Projects, Equipment DB, Documents, CRM, Reports, Data Quality, Settings.

## 8. QA checklist per screen

For each screen:

- compare with the mapped scheme source;
- check that the functional current module still works;
- check no business logic changed;
- check no mixed light/dark fragments;
- check no raw diagnostics for ordinary users;
- check no inline styles were introduced;
- check no new random breakpoints were introduced;
- check bottom action area is stable;
- check right summary panel is context-relevant;
- check mobile `<=767px` and desktop/tablet `>=768px`.

## 9. Codex/developer instruction

Use MasterSpec visuals as a visual/layout reference only. Preserve current `QuoteWizard.js` functional order unless a separate task explicitly changes product flow.

Do not blindly implement MasterSpec step order. Instead use the corrected mapping from this document.

Business logic, calculations, BOM, warehouse, reservations, deficit logic, PDF/КП and backend writes must remain unchanged unless directly requested.
