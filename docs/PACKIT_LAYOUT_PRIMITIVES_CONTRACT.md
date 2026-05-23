# Pack.it layout primitives contract

Документ фиксирует целевой слой общих UI/layout primitives для Pack.it rebuild.

Это не замена бизнес-логики и не переписывание расчётов. Это контракт CSS/HTML-компоновки, по которому дальше нужно приводить Home, Quote Wizard, Quick Constructors, Warehouse, Documents и Admin к единому виду.

## 1. Зачем нужен этот слой

Сейчас в приложении уже есть:

- `src/styles/main.css` как единая CSS-точка входа;
- `tokens.css` как база дизайн-токенов;
- `components/shell.css`;
- `components/layout.css`;
- модульные CSS для wizard, quick, configurators, warehouse, equipment и т.д.;
- много legacy/v4 классов;
- точечные overrides, `!important`, `:has(...)`, inline styles в JS-разметке;
- промежуточные breakpoints.

Цель rebuild — не наслаивать новые локальные правки, а ввести стабильный слой primitives:

```text
Pack.it primitives -> feature modules -> legacy compatibility
```

Новые экраны и переделанные старые экраны должны собираться из primitives.

## 2. Naming convention

Новые целевые классы должны использовать префикс:

```text
packit-
```

Legacy классы `v4-*` можно временно оставлять, но не использовать как основу новых layout-решений.

Хорошо:

```text
packit-page-header
packit-workbench
packit-summary-panel
packit-bottom-action-bar
```

Плохо:

```text
v4-this-one-screen-fix
quote-step-7-special-row
stage-mobile-fix-final
```

## 3. Responsive contract

Единый контракт:

```text
<=767px  mobile
>=768px  desktop/tablet
```

Запрещено возвращать хаотичные промежуточные breakpoints без отдельного решения:

```text
860 / 900 / 1024 / 1179 / 1180
```

Текущие найденные legacy breakpoints:

```text
1200 / 900 / 720 / 640 / 600 / 520
```

Они должны быть постепенно заменены или сведены к целевому контракту.

## 4. Core page primitives

### 4.1 `packit-page`

Назначение: корневая рабочая область внутри shell.

```html
<main class="packit-page">
  ...
</main>
```

Правила:

- занимает всё доступное место справа от nav rail;
- управляет общим page padding;
- не должен содержать page-specific размеры;
- scroll остаётся native browser scroll.

### 4.2 `packit-page-stack`

Назначение: вертикальный стек секций страницы.

```html
<div class="packit-page-stack">
  <section class="packit-page-header">...</section>
  <section class="packit-workbench">...</section>
  <section class="packit-bottom-action-bar">...</section>
</div>
```

Правила:

- единый gap между крупными блоками;
- используется во всех разделах.

### 4.3 `packit-page-header`

Назначение: верхняя карточка страницы.

```html
<section class="packit-page-header">
  <div class="packit-page-header-main">
    <div class="packit-kicker">QUOTE WIZARD LINEAR FLOW</div>
    <h1>Линейный мастер сметы</h1>
    <p>Описание flow...</p>
  </div>
  <div class="packit-page-header-actions">...</div>
</section>
```

Должна содержать:

- kicker;
- title;
- short description;
- primary/secondary page actions.

Не должна содержать:

- raw JSON;
- diagnostics;
- огромные таблицы;
- inline styles.

### 4.4 `packit-kicker`

Новый общий kicker. Заменяет зависимость от `v4-kicker`.

Правила:

- uppercase;
- small text;
- muted color;
- letter spacing;
- единая высота/line-height.

## 5. Workflow primitives

### 5.1 `packit-stepper`

Назначение: горизонтальный wizard/status stepper.

```html
<ol class="packit-stepper">
  <li class="packit-step is-done">...</li>
  <li class="packit-step is-active">...</li>
  <li class="packit-step is-waiting">...</li>
</ol>
```

Состояния:

- `is-done`;
- `is-active`;
- `is-waiting`;
- `is-warning`;
- `is-error`;
- `is-disabled`.

Правила:

- desktop: равные карточки или controlled horizontal layout;
- mobile: horizontal scroll или collapsed flow summary;
- активный шаг выделяется accent/orange;
- done — success/green;
- error — danger/red;
- text не должен выпадать из карточки.

### 5.2 `packit-flow-status`

Назначение: короткое состояние текущего workflow.

Пример:

```html
<div class="packit-flow-status is-ok">
  Шаг заполнен корректно, можно двигаться дальше.
</div>
```

Состояния:

- `is-ok`;
- `is-warning`;
- `is-error`;
- `is-info`.

### 5.3 `packit-bottom-action-bar`

Назначение: постоянная нижняя зона действий.

```html
<div class="packit-bottom-action-bar">
  <div class="packit-bottom-action-left">
    <button>Назад</button>
  </div>
  <div class="packit-bottom-action-right">
    <button>Сохранить шаг</button>
    <button class="packit-btn packit-btn-primary">Далее</button>
  </div>
</div>
```

Правила:

- основные workflow-кнопки всегда в одном месте;
- `Далее` / primary action справа;
- `Назад` слева;
- save/secondary рядом с primary;
- constructor bind action должен встраиваться в этот же паттерн;
- mobile: sticky bottom или fixed within safe area.

## 6. Workbench primitives

Workbench — главный паттерн из утверждённого референса.

### 6.1 `packit-workbench`

Назначение: основная рабочая зона экрана.

```html
<section class="packit-workbench">
  <div class="packit-workbench-head">...</div>
  <div class="packit-workbench-tabs">...</div>
  <div class="packit-workbench-grid">
    <aside class="packit-workbench-left">...</aside>
    <div class="packit-workbench-main">...</div>
    <aside class="packit-workbench-right">...</aside>
  </div>
  <div class="packit-workbench-bottom">...</div>
</section>
```

Desktop/tablet layout:

```text
left tools/filters | main editor/table/canvas | right summary/actions
bottom notes/BOM/details
```

Mobile layout:

```text
head
tabs
main
summary collapsible
tools collapsible
bottom context
sticky actions
```

### 6.2 `packit-workbench-left`

Для:

- filters;
- templates;
- quick add;
- modes;
- search;
- category controls.

Не использовать для итогов.

### 6.3 `packit-workbench-main`

Для:

- tables;
- selected rows;
- constructor canvas;
- document preview;
- warehouse pick list.

### 6.4 `packit-workbench-right`

Для:

- totals;
- package parameters;
- current section actions;
- warnings;
- status cards.

Это целевой аналог правой панели из референса.

### 6.5 `packit-workbench-bottom`

Для:

- notes;
- short BOM;
- compact metrics;
- current step context;
- non-dev user-facing messages.

Не использовать для raw diagnostics.

## 7. Tabs / segmented controls

### 7.1 `packit-segmented-tabs`

```html
<div class="packit-segmented-tabs" role="tablist">
  <button class="packit-segment is-active">Звук</button>
  <button class="packit-segment">Свет</button>
</div>
```

Используется для:

- quote equipment categories;
- Stage / Truss / LED / 3D tabs;
- top/front/iso visual modes;
- document categories;
- warehouse modes.

Правила:

- одинаковая высота;
- active — accent/orange border;
- inactive — calm surface;
- no layout jumps;
- icons optional, from asset system, not emoji.

## 8. Data/table primitives

### 8.1 `packit-table-card`

Обёртка вокруг таблиц.

```html
<div class="packit-table-card">
  <div class="packit-table-head">...</div>
  <table class="packit-table">...</table>
</div>
```

### 8.2 `packit-table`

Единый стиль таблиц для:

- selected equipment rows;
- warehouse rows;
- BOM rows;
- project rows;
- document rows.

Правила:

- compact but readable;
- consistent row height;
- consistent borders;
- thumbnails optional;
- row actions always right;
- money/qty columns aligned;
- source/status columns use badges.

### 8.3 `packit-qty-control`

```html
<div class="packit-qty-control">
  <button>-</button>
  <span>16</span>
  <button>+</button>
</div>
```

Используется для equipment, manual rows, subrent rows, warehouse pick quantities.

### 8.4 `packit-row-actions`

```html
<div class="packit-row-actions">
  <button aria-label="duplicate">...</button>
  <button aria-label="delete">...</button>
</div>
```

Row actions always right.

## 9. Summary primitives

### 9.1 `packit-summary-panel`

Правая панель итогов.

```html
<aside class="packit-summary-panel">
  <section class="packit-summary-card">...</section>
  <section class="packit-summary-card">...</section>
</aside>
```

### 9.2 `packit-summary-card`

Для:

- итог по категории;
- выбранный пакет;
- status;
- warning;
- action group.

### 9.3 `packit-kpi-strip`

Горизонтальная или grid-полоса KPI.

Используется:

- wizard overview;
- project status;
- quick constructor summary;
- warehouse summary.

## 10. Constructor primitives

### 10.1 `packit-constructor-shell`

Общий контейнер быстрых и quote-mode конструкторов.

```html
<section class="packit-constructor-shell">
  <div class="packit-constructor-controls">...</div>
  <div class="packit-constructor-canvas">...</div>
  <div class="packit-constructor-summary">...</div>
</section>
```

### 10.2 `packit-constructor-controls`

Для:

- templates;
- dimensions;
- modes;
- add/remove tools;
- mount type.

### 10.3 `packit-constructor-canvas`

Для:

- stage grid;
- truss block field;
- LED cabinet grid;
- future 3D viewer.

Правила:

- canvas style controlled by theme tokens;
- no random background cards inside items;
- no scroll hacks;
- native scroll only.

### 10.4 `packit-constructor-summary`

Для:

- dimensions;
- weight;
- power;
- BOM count;
- warnings;
- PDF/export actions;
- add to quote/project actions.

### 10.5 `packit-zoom-control`

Единый zoom pattern:

```text
row 1: − / slider / +
row 2: По размеру / Центр / Auto-fit
```

Rules:

- equal button heights;
- no tall columns;
- mobile safe;
- no overflow.

## 11. Form primitives

### 11.1 `packit-field`

```html
<label class="packit-field">
  <span>Название</span>
  <input>
</label>
```

States:

- `is-error`;
- `is-disabled`;
- `is-required`;
- `is-compact`.

### 11.2 `packit-form-grid`

Variants:

- `packit-form-grid--2`;
- `packit-form-grid--3`;
- `packit-form-grid--auto`.

Mobile: one column.

## 12. State primitives

### 12.1 Status badges

```html
<span class="packit-badge is-ok">готово</span>
<span class="packit-badge is-warning">ожидает</span>
<span class="packit-badge is-danger">дефицит</span>
```

States:

- `is-ok`;
- `is-warning`;
- `is-danger`;
- `is-info`;
- `is-muted`;
- `is-accent`.

### 12.2 Empty/loading/error

```html
<div class="packit-empty-state">...</div>
<div class="packit-loading-state">...</div>
<div class="packit-error-state">...</div>
```

Empty states should use asset system illustrations when available.

## 13. Diagnostics primitives

### 13.1 `packit-diagnostics-panel`

Only for dev/admin.

Rules:

- not rendered for ordinary users;
- behind permissions/feature flags/environment gates;
- never mixed into client-facing documents;
- raw JSON only inside diagnostics areas.

## 14. Migration strategy

### Step 1 — no code behavior changes

Add primitives CSS and compatibility wrappers, without replacing business logic.

### Step 2 — Home / Command Center

Move Home to primitives first because it sets the visual language.

### Step 3 — Quote Wizard shell

Migrate wizard page header, stepper, workbench and action bar.

Keep:

- wizard steps;
- validation;
- draft storage;
- section binding;
- summary builder.

### Step 4 — Quote equipment step

Use the approved reference as the first full implementation:

```text
left filters
main selected rows
right summary/actions
bottom notes/BOM
bottom nav
```

### Step 5 — Quick constructors

Migrate Stage / Truss / LED to `packit-constructor-shell`.

Keep:

- calculations;
- BOM;
- load checks;
- LED formulas;
- PDF export.

### Step 6 — Warehouse/Documents/Admin

Migrate operational screens after core flows are stable.

## 15. Hard restrictions

Do not:

- change calculations, BOM, warehouse logic, PDF export, backend writes or business logic without direct task;
- add inline styles in JS-generated UI;
- add one-off CSS hacks for a single screen;
- add new random breakpoints;
- mix light/dark blocks randomly;
- use emoji as final icons;
- expose diagnostics to ordinary users;
- use huge preview boards as UI assets.

## 16. Target file structure

Preferred CSS structure after migration:

```text
src/styles/main.css
src/styles/tokens.css
src/styles/reset.css
src/styles/base.css
src/styles/components/shell.css
src/styles/components/primitives.css
src/styles/components/buttons-forms.css
src/styles/components/tables-status.css
src/styles/components/modals.css
src/styles/modules/home.css
src/styles/modules/quote.css
src/styles/modules/constructors.css
src/styles/modules/warehouse.css
src/styles/modules/documents.css
src/styles/modules/admin.css
src/styles/legacy/v4-compat.css
```

Do not move everything at once. Migrate in safe phases.

## 17. Acceptance checklist

A screen is considered migrated to Pack.it primitives only if:

- it uses `packit-page-header`;
- main area uses `packit-workbench` or an explicit primitive layout;
- primary actions are in stable positions;
- no inline styles were introduced;
- no new random breakpoint was introduced;
- theme tokens are used;
- ordinary users do not see diagnostics;
- mobile `<=767px` works;
- desktop/tablet `>=768px` works;
- existing calculations/business behavior are unchanged.
