# Pack.it UI concept and layout contract

Этот документ фиксирует продуктовый UI-контракт Pack.it. Он дополняет технический `UI_SYSTEM.md` и нужен, чтобы разработка интерфейса не превращалась в набор точечных правок.

## Главный принцип

Pack.it должен выглядеть как современное рабочее приложение для техпродакшена, а не как набор отдельных калькуляторов.

Интерфейс должен быть:

- цельным;
- спокойным;
- плотным, но читаемым;
- одинаковым по логике во всех разделах;
- пригодным для долгой работы;
- удобным на объекте, в офисе и на ноутбуке;
- без смешения разных тем, случайных карточек, лишних рамок и визуального шума.

## Продуктовая сущность интерфейса

Главная сущность интерфейса — `Project / проект-смета`.

Все остальные сущности должны быть подчинены проекту или связаны с ним:

- клиент;
- площадка;
- дата;
- смета;
- конструкторы;
- склад;
- документы;
- задачи;
- роли;
- чек-листы;
- логистика;
- Field Kit;
- коммуникация;
- отчёты.

UI не должен создавать ощущение, что пользователь прыгает между разными несвязанными приложениями.

## Основные рабочие зоны

### 1. Home / Command Center

Главный экран должен давать быстрый доступ к:

- проектам;
- новой смете/проекту;
- быстрым конструкторам;
- складу;
- задачам;
- календарю;
- документам;
- админке;
- Field Kit later.

На главном экране не должно быть лишней технической информации.

### 2. Project workspace

Главная рабочая зона проекта.

Должна показывать:

- статус проекта;
- клиента;
- площадку;
- дату;
- ответственных;
- готовность КП;
- готовность склада;
- задачи;
- предупреждения;
- документы;
- быстрые действия.

Project workspace должен стать центральной точкой входа в смету, склад, документы, задачи и коммуникацию.

### 3. Quote / estimate workspace

Сметчик должен быть гибким и секционным.

Основная идея:

```text
Project
    ↓
Sections
    ↓
Rows / Constructors / Services / Suppliers
    ↓
Quote / BOM / Warehouse / Documents
```

Сметчик не должен выглядеть как бесконечная таблица со всем подряд.

Он должен иметь:

- понятные шаги;
- постоянные основные кнопки;
- одинаковое положение действий;
- итоговую панель;
- предупреждения без перегруза;
- секции, которые можно включать/выключать;
- гибкую поддержку новых категорий.

### 4. Constructor workspace

Конструктор должен существовать в двух режимах:

- standalone quick mode;
- quote/project section mode.

В standalone режиме пользователь быстро строит конструкцию.

В quote/project mode конструкция становится `ProjectSection`.

Нужна возможность:

```text
standalone construction
    ↓
transfer to quote/project
    ↓
becomes ProjectSection
```

В будущем единый 3D-конструктор должен заменить три быстрых калькулятора, но UI-контракт должен заранее поддерживать оба режима.

### 5. Warehouse workspace

Склад должен показывать рабочие статусы, а не сырые diagnostics.

Пользователь склада должен видеть:

- что собрать;
- сколько нужно;
- что есть;
- чего не хватает;
- что заменить;
- что выдать;
- что вернуть;
- повреждения/заметки;
- статус проекта.

### 6. Documents workspace

Документы должны строиться из snapshot/model, но пользователь видит только нормальные документы:

- КП;
- техлист;
- складской лист;
- логистика;
- счета/акты later;
- фотоотчёт later.

Dev/admin diagnostics не должны попадать в клиентские документы.

### 7. Admin Center

Admin Center должен быть отдельной зоной.

Там живут:

- company settings;
- пользователи;
- роли;
- права;
- складские категории;
- шаблоны документов;
- branding;
- integrations;
- diagnostics;
- license/install status.

Обычный пользователь не должен видеть админский мусор.

### 8. Field Mode

Field Mode должен быть отдельным компактным режимом для площадки:

- проект;
- задачи;
- чат;
- голос;
- роли;
- локальная сеть;
- offline/sync status;
- большие простые элементы;
- минимум визуального шума.

## Shell layout

### Desktop

Desktop layout должен держать стабильную структуру:

```text
left navigation / control rail
center workspace
right summary/context panel
bottom detailed tables/logs when needed
```

Кнопки основных действий не должны прыгать между экранами.

### Mobile

Mobile layout должен быть не просто сжатой desktop-версией.

Основная логика:

```text
top project/status header
main work card
sticky bottom action bar where needed
collapsible details
role-specific short flows
```

На мобильном нельзя показывать слишком много технических таблиц сразу.

### Tablet

Текущий responsive contract:

```text
<=767px mobile
>=768px desktop/tablet
```

Не восстанавливать хаотичные промежуточные брейкпоинты без отдельного решения.

## Visual direction

Рабочее направление:

- современный light SaaS-style для мобильного и будущего продукта;
- тёмная тема как fallback / рабочий режим / legacy continuity;
- чистые панели;
- аккуратные тени;
- читаемые контрасты;
- меньше случайного glassmorphism;
- меньше смешения dark/light внутри одного экрана;
- техничный, но не перегруженный стиль.

## Theme rules

Нельзя смешивать элементы светлой и тёмной темы случайно.

Каждый экран должен иметь:

- light theme tokens;
- dark theme tokens;
- одинаковую структуру;
- проверенный контраст;
- одинаковые радиусы, отступы, высоты контролов.

Theme switching не должен ломать модалки, таблицы, конструкторы и preview.

## Component rules

Базовые компоненты:

- AppShell;
- PageHeader;
- ProjectHeader;
- SectionCard;
- SummaryPanel;
- ActionBar;
- Stepper;
- StatusPill;
- WarningBanner;
- EmptyState;
- DataTable;
- FormField;
- SearchSelect;
- ConstructorCanvasShell;
- ModalShell;
- Drawer;
- AdminPanel;
- FieldStatusBar.

Новые экраны должны строиться из общих компонентов, а не через локальные костыли.

## Buttons and actions

Основные кнопки должны иметь стабильные роли:

- primary action;
- secondary action;
- destructive action;
- save/add to project;
- next step;
- export/share;
- diagnostics/admin-only.

Кнопки не должны прыгать по разным местам при переходе между шагами.

## User-facing vs dev/admin

Обычный пользователь видит:

- рабочие статусы;
- задачи;
- документы;
- понятные предупреждения.

Dev/admin видит:

- diagnostics;
- snapshots;
- validation reports;
- raw JSON;
- pipeline reports.

Это должно соблюдаться на уровне UI.

## Empty states

Все пустые состояния должны быть нормальными, а не выглядеть как сломанный экран.

Примеры:

- нет проектов;
- нет задач;
- нет складских дефицитов;
- ещё не выбран клиент;
- ещё не добавлены секции;
- нет документов;
- offline queue empty;
- field mode not active.

## Loading/error states

Каждый экран должен иметь:

- loading state;
- empty state;
- recoverable error state;
- permission denied state;
- offline state;
- degraded mode state.

Не показывать пользователю stack trace.

## UI migration rule

До полного UI rebuild нельзя бесконечно наслаивать CSS.

Правило:

```text
fix systemically through tokens/components/layout patterns
not through one-off local hacks
```

## MVP UI deliverables

Перед серьёзной доработкой приложения нужны:

1. full UI map;
2. screen inventory;
3. component inventory;
4. asset inventory;
5. theme tokens;
6. icon/illustration set;
7. layout templates;
8. mobile patterns;
9. admin/dev diagnostics placement;
10. empty/error/loading states.

## Итоговый закон

Pack.it UI должен быть описан и собран как цельная продуктовая система вокруг Project. Все рабочие зоны должны использовать единые layout patterns, компоненты, темы и asset rules. Быстрые калькуляторы, сметчик, склад, документы, админка и Field Mode не должны выглядеть как разные приложения. Обычный пользователь не видит dev-информацию, а все diagnostics живут в dev/admin-only зонах.
