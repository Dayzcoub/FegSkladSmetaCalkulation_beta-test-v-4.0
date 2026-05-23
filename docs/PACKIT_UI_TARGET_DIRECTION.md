# Pack.it target UI direction

Этот документ фиксирует целевое направление UI Pack.it / FEG Stage PRO после перехода к нормальному UI rebuild.

Ориентир основан на утверждённой пользователем компоновке экрана Quote Wizard / шаг 7: звук, свет, бэклайн. Это не просто пример красивого экрана, а базовый layout-contract для будущего интерфейса.

## 1. Главная цель

Pack.it должен выглядеть как единое рабочее приложение для управления техпродакшеном, а не как набор отдельных калькуляторов и таблиц.

Целевой образ:

```text
modern production operations cockpit
```

Смысл:

- проект в центре;
- смета, конструкторы, склад, документы и команда связаны вокруг проекта;
- интерфейс плотный, но читаемый;
- все действия находятся в предсказуемых местах;
- технический объём данных не превращается в визуальный шум;
- обычный пользователь не видит dev diagnostics и raw payloads.

## 2. Общий визуальный стиль

Целевое направление:

```text
clean SaaS + technical production + operations dashboard
```

Характер:

- тёмный профессиональный рабочий режим допустим как основной текущий режим;
- будущая light theme должна повторять ту же структуру, а не быть отдельным интерфейсом;
- фон глубокий, спокойный, без случайного glassmorphism;
- карточки мягкие, с тонкими линиями;
- оранжевый используется как основной action/accent;
- зелёный только для успешных статусов и денег/итогов;
- красный только для опасных/удаляющих действий;
- синий/серый для информационных и вторичных состояний;
- иконки должны быть системными ассетами, а не emoji.

## 3. Базовая компоновка desktop/tablet

Целевой desktop/tablet layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Left role/navigation rail │ Top identity / workspace / user bar            │
│                           ├────────────────────────────────────────────────┤
│                           │ Page header / wizard status / primary actions  │
│                           ├────────────────────────────────────────────────┤
│                           │ Main work area                  │ Right panel   │
│                           │                                │ summary/actions│
│                           ├────────────────────────────────────────────────┤
│                           │ Notes / short BOM / step context               │
│                           ├────────────────────────────────────────────────┤
│                           │ Bottom navigation/action bar                    │
└────────────────────────────────────────────────────────────────────────────┘
```

Эта структура должна применяться к:

- Home / Command Center;
- Project Workspace;
- Quote Wizard;
- Quick Stage;
- Quick Truss;
- Quick LED;
- Warehouse;
- Documents;
- Admin/Dev screens.

## 4. Ключевой layout из референса

На референсе правильная логика такая:

### 4.1 Left navigation rail

Левая панель:

- фиксированная;
- содержит роль пользователя;
- содержит основные разделы;
- разделы сгруппированы визуальными divider lines;
- активный раздел выделяется мягкой карточкой;
- внизу есть role/access switch или user/workspace state.

Для rebuild:

- оставить rail как постоянную навигационную ось;
- заменить emoji на нормальные Pack.it icons;
- не перегружать пунктами обычного пользователя;
- dev/admin/sync показывать только ролям с доступом.

### 4.2 Top identity bar

Верхняя строка:

- слева branding/workspace;
- справа user card и logout;
- не конкурирует с основным заголовком страницы;
- создаёт ощущение приложения, а не одиночного экрана.

Для rebuild:

- логотип и wordmark должны прийти из asset system;
- убрать placeholder-логотип;
- topbar должен быть единым для всех разделов.

### 4.3 Page header

Верхняя карточка страницы должна содержать:

- технический kicker;
- главный заголовок;
- краткое объяснение текущего flow;
- первичные действия страницы справа;
- stepper/status row ниже.

Для Quote Wizard это:

- название мастера;
- описание линейного flow;
- действия `Новый черновик`, `Сохранить черновик`;
- stepper из 10 шагов.

### 4.4 Wizard stepper

Stepper должен быть:

- горизонтальным на desktop;
- карточным;
- с номером шага;
- с названием;
- со статусом `готово`, `текущий шаг`, `ожидает`;
- активный шаг выделен оранжевой линией/рамкой;
- готовые шаги показывают зелёный статус;
- основной workflow сразу читается сверху.

Принцип:

```text
пользователь всегда понимает где он, что уже готово и что дальше
```

### 4.5 Main work card

Основная рабочая карточка делится на:

```text
left filters / tools
center selected rows / canvas / main editor
right summary / package / actions
bottom notes + short BOM
```

На шаге оборудования это выглядит так:

- слева фильтры и быстрое добавление;
- в центре выбранные позиции таблицей;
- справа итог по категории, параметры пакета и действия;
- снизу примечания и краткий BOM.

Эту схему нужно использовать как универсальный workbench pattern.

### 4.6 Tabs / segmented controls

Внутри шага правильно используются tabs:

- звук;
- свет;
- бэклайн;
- услуги.

Правила:

- active tab выделяется оранжевой рамкой;
- inactive tabs спокойные;
- tabs не должны прыгать по высоте;
- одинаковая высота и padding.

Такая же логика должна быть у:

- Stage / Truss / LED / 3D quick tabs;
- view tabs top/front/iso;
- document tabs;
- warehouse modes.

### 4.7 Tables / selected rows

Таблица в референсе правильная по идее:

- компактная;
- с миниатюрой оборудования;
- есть позиция;
- количество регулируется `− qty +`;
- цена;
- единица;
- источник;
- комментарий;
- row actions справа.

Для rebuild:

- привести все таблицы к одному виду;
- ручные/субарендные строки делать такой же логикой, как складские;
- не делать отдельные визуальные стили под каждую категорию;
- row density должна быть рабочей, но читаемой.

### 4.8 Right summary panel

Правая панель должна быть стабильным местом для:

- итогов;
- параметров текущего пакета/конструкции;
- действий;
- warnings;
- статусов.

В Quote step это:

- итог по категории;
- выбранный пакет;
- действия `Добавить позицию`, `Дублировать`, `Удалить все`.

В конструкторах это должно стать:

- габариты;
- вес;
- мощность;
- BOM count;
- предупреждения;
- добавить в смету / PDF / сохранить.

### 4.9 Bottom context block

Нижний блок должен содержать:

- примечания к шагу;
- краткий BOM;
- итоги текущего шага;
- служебный контекст без перегруза.

Важно: это не место для raw JSON или diagnostics.

### 4.10 Bottom navigation/action bar

Внизу должны быть постоянные workflow-действия:

- назад;
- сохранить шаг;
- далее.

Правило:

```text
основные кнопки не прыгают между шагами
```

Для constructor steps:

- кнопка `Добавить ... в смету` должна быть встроена в этот же action area или рядом с ним по единому паттерну;
- пользователь должен завершать шаг логически: построил → проверил → добавил → дальше.

## 5. Универсальные layout primitives

Для rebuild нужны не локальные CSS-правки, а набор общих primitives:

### Application

- `packit-shell`
- `packit-nav-rail`
- `packit-topbar`
- `packit-page`
- `packit-page-header`

### Workflow

- `packit-stepper`
- `packit-step-card`
- `packit-bottom-action-bar`
- `packit-flow-status`

### Workbench

- `packit-workbench`
- `packit-workbench-left`
- `packit-workbench-main`
- `packit-workbench-right`
- `packit-workbench-bottom`

### Controls

- `packit-segmented-tabs`
- `packit-filter-panel`
- `packit-search-field`
- `packit-qty-control`
- `packit-action-row`

### Data

- `packit-table`
- `packit-row-actions`
- `packit-summary-card`
- `packit-kpi-strip`
- `packit-bom-brief`

### State

- `packit-status-ok`
- `packit-status-warn`
- `packit-status-danger`
- `packit-empty-state`
- `packit-loading-state`
- `packit-error-state`

## 6. Applying the reference to Quote Wizard

The quote wizard should be rebuilt around the reference structure.

Target structure:

```text
Page header
Stepper
Current step card
    Step title/status
    Step tabs if needed
    Workbench
        Left filters/tools
        Main editor/table/constructor
        Right summary/actions
    Bottom notes/BOM
Bottom action bar
```

Every quote step should fit into this contract:

- client/project;
- venue;
- scope;
- stage;
- truss;
- LED;
- equipment/services;
- transport;
- crew;
- summary/documents.

No custom layout per step unless truly necessary.

## 7. Applying the reference to Quick Constructors

Quick constructors should use the same workbench pattern:

```text
Quick page header
Constructor tabs: Stage / Truss / LED / 3D
Workbench
    Left: templates, dimensions, modes
    Main: canvas / visual constructor
    Right: summary, warnings, actions
Bottom
    tech sheet / BOM / PDF export
```

Stage / Truss / LED must feel like three modes of one system, not three separate apps.

## 8. Applying the reference to Warehouse

Warehouse screen should use:

```text
Header / filters
Workbench
    Left: project/category filters
    Main: pick list / availability table
    Right: deficit/subrent/actions summary
Bottom: movement notes / issue-return status
```

The warehouse UI should answer operational questions:

- what to pick;
- what is available;
- what is missing;
- what to replace;
- what to subrent;
- what to issue/return.

## 9. Applying the reference to Documents

Documents screen should use:

```text
Header / document actions
Workbench
    Left: document type list
    Main: preview
    Right: export/send/settings
Bottom: document history / notes
```

Client-facing documents must stay clean:

- no raw payloads;
- no validation dumps;
- no snapshots;
- no backend diagnostic text.

## 10. Mobile target

The reference is desktop-first. Mobile adaptation should keep the same hierarchy, but stack zones:

```text
Topbar compact
Page title/status
Stepper collapsed or horizontal scroll
Main work card
Right summary becomes collapsible summary block
Bottom action bar sticky
```

Rules:

- `<=767px` mobile;
- `>=768px` desktop/tablet;
- no chaotic 860/900/1024/1179/1180 breakpoint logic;
- no manual scroll bridge;
- native scroll only.

## 11. What not to do

Do not rebuild by adding:

- one-off CSS patches;
- inline styles in JS markup;
- page-specific button heights;
- random breakpoints;
- mixed dark/light blocks;
- emoji icons;
- giant preview boards as UI assets;
- duplicated table styles;
- special layout hacks for only one step.

## 12. Final direction sentence

Pack.it UI target:

```text
A unified technical production cockpit: project-centered, dense but readable, with stable navigation, stable workflow actions, consistent workbench layouts, clean Pack.it assets, and strict separation between user-facing operations and dev/admin diagnostics.
```

Or shorter:

```text
One product. One shell. One workflow layout. One UI kit. Project in the center. No hacks.
```
