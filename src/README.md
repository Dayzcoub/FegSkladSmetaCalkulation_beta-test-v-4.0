# v3.6.48 — TrussBootstrap bridge

- Added `src/modules/TrussBootstrap.js` for small startup/bootstrap helpers around the 2D truss workspace.
- Legacy `initTrussModule()`, truss draft settings helpers and input binding now delegate to `TrussBootstrap` with fallbacks preserved.
- Calculations, PDF output, 3D mode, Supabase and visual behavior were not changed.

# v3.6.47 — AppBootstrap bridge

- Added `src/modules/AppBootstrap.js` for small startup/bootstrap helpers around the stage workspace.
- Legacy `init()` now delegates to `AppBootstrap.initStageWorkspace()` while preserving the previous fallback path.
- Calculations, PDF output, visual behavior and truss constructor logic were not changed.

## v3.6.46 — dom utils bridge

- Added `src/modules/DomUtils.js` for shared safe DOM access helpers.
- Legacy helpers `q()`, `getValue()`, `setValue()`, `getNumber()`, `setText()` and `setHtml()` now delegate to `DomUtils` with fallbacks preserved.
- Initial DOM references and basic truss input get/set helpers use the shared bridge.
- No calculation, PDF content, Supabase schema or visual behavior changes.

## v3.6.45 — format utils bridge

- Added `src/modules/FormatUtils.js` for shared HTML escaping and number/date/string formatting helpers.
- Legacy global helpers `escapeHtml()`, `money()`, `metric()` and `kg()` now delegate to `FormatUtils` with existing fallbacks preserved.
- No calculation, PDF content, Supabase schema or visual behavior changes.

## v3.6.43 — modal manager bridge

- Added `src/modules/ModalManager.js` for shared modal open/close helpers, backdrop click close and Escape-key close bindings.
- Kept legacy global modal close/open functions as compatibility bridges for existing inline handlers.
- No calculation, PDF content, Supabase schema or visual behavior changes.

## v3.6.41 — navigation init bridge

- Extended `src/modules/NavigationManager.js` with `initNavigation()` for the startup `load/hashchange` wiring.
- Kept global `setAppPage()` in `legacy-app.js` as a compatibility bridge for existing inline handlers.
- Hash navigation, initial clients render and after-switch callbacks are preserved.
- No calculation, PDF, Supabase schema or visual behavior changes.


## v3.6.39 — clients UI bridge

- Added `src/modules/ClientsUI.js` for client select, datalist, form and clients table rendering helpers.
- Kept legacy global functions as compatibility bridges for existing inline handlers.
- No calculation, PDF, Supabase schema or visual behavior changes.

## v3.6.38

Добавлены `ClientsStorage` и `ClientsManager`: локальная база клиентов, legacy-migration ключа `clients`, cloud-payload и cloud-load/save клиентов вынесены в отдельные runtime-модули. UI карточки и таблицы клиентов пока остаётся совместимым bridge-слоем в `legacy-app.js`; расчёты, PDF и визуальное поведение не менялись.

## v3.6.37

ProjectManager подключён к cloud-операциям ферменных проектов: подготовка строки Supabase, save/upload, fetch/load и merge truss-проектов вынесены из прямого блока `legacy-app.js`. UI, расчёты, PDF и таблица Supabase не менялись.

## v3.6.36

Добавлен `ProjectManager`: связующий runtime-модуль между `ProjectStorage` и `SupabaseStorage`. Cloud-save/load заказов сцены, merge облачных проектов и обновление локального снимка теперь проходят через этот слой; UI и расчёты не менялись.

## v3.6.35

- ProjectStorage расширен stage-order save/delete/replace helper-ами.
- legacy-app.js оставлен совместимым UI-мостом; сохранение, удаление и cloud-replace заказов делегируются в ProjectStorage.
- Расчёты, PDF и визуальное поведение не менялись.

## v3.6.34

ProjectStorage cleanup 2: добавлены helpers для JSON-экспорта/импорта stage/truss-проектов, поиска сохранённых проектов, сохранения и удаления ферменных проектов. `legacy-app.js` остаётся совместимым runtime-мостом; расчёты и визуальное поведение не менялись.

## v3.6.33

Вынесен модуль `ProjectStorage`: локальная история заказов сцены и ферменные проекты теперь проходят через общий runtime-мост. Это подготовка к дальнейшему разделению проектов/заказов без изменения расчётов, PDF и визуального поведения.

# FEG Stage PRO modular migration

## v3.6.6 status

Текущая сборка остаётся совместимой со старым приложением: основной рабочий код пока находится в `legacy-app.js`, а новые модули подключаются через `window.FEGModules` и постепенно забирают отдельные зоны ответственности.

### Extracted runtime modules

- `FormatUtils.js` — общие HTML/string/date/number форматтеры и совместимый bridge для `escapeHtml`, `money`, `metric`, `kg`.
- `DomUtils.js` — общие безопасные DOM-helper’ы: `q`, `getValue`, `setValue`, `getNumber`, `setText`, `setHtml`.
- `AppBootstrap.js` — стартовая инициализация stage-workspace через совместимый bridge.
- `TrussBootstrap.js` — стартовая инициализация 2D truss-workspace, черновые настройки и input-listeners через совместимый bridge.
- `AppSettings.js` — тема, окно общих настроек приложения, поля Supabase.
- `SupabaseStorage.js` — создание Supabase-клиента и общие cloud-константы.
- `ProjectStorage.js` — локальная история заказов сцены и ферменные проекты.
- `TransportSettings.js` — общие настройки транспорта, стоимость, подпись и окно транспорта.
- `PriceWeightSettings.js` — цены/вес сцены, высота сцены и окно «Сцена: цены / вес».
- `CalibrationManager.js` — файловая SVG-калибровка, PIN-доступ, локальные черновики и экспорт `feg_svg_calibration.json`.

### Planned modules

- `StageCalculator.js` — расчёт сцены.
- `TrussBlockConstructor.js` — блочный конструктор ферм.
- `PdfGenerator.js` — PDF сцены, ферм и общего КП.

## Migration rules

1. Каждый шаг должен оставлять рабочую сборку.
2. Старые глобальные функции на `window` сохраняются до полного перехода.
3. Поведение приложения не меняется без отдельной задачи.
4. После каждого переноса проверять `node --check`, `sw.js`, `manifest.json`, `feg_svg_calibration.json` и архив.

### v3.6.4

Вынесен модуль `CalibrationManager`: нормализация калибровки, загрузка серверного `feg_svg_calibration.json`, PIN-доступ `7663`, локальные черновики и скачивание файла калибровки. `legacy-app.js` делегирует эти операции модулю, сохраняя прежнее поведение админ-панели.


### v3.6.6
`StageCalculator.js` переведён из заглушки в runtime-модуль. Вынесены чистые функции расчёта геометрии сцены и трансформаций выбранных модулей.

### v3.6.7

`TrussBlockConstructor` phase 1:
- block catalog moved into `src/modules/TrussBlockConstructor.js`;
- object library group definitions moved into module;
- legacy type map moved into module;
- legacy renderer still handles UI, SVG, snap/drag and calculations.


## v3.6.10

В `TrussBlockConstructor` вынесены безопасные edit helpers: нормализация объектов, выбор элемента, создание элемента, удаление по id/координате и поворот выбранного элемента. Drag/snap и SVG-отрисовка остаются в legacy-мосте.

## v3.6.11

`TrussBlockConstructor` phase 5:
- вынесены безопасные snap helpers: `itemPoints`, `connectionMap`, `findNearestEndpoint`, `getSnappedPlacement`;
- legacy-мост продолжает управлять drag-событиями и SVG-отрисовкой;
- логика установки/примагничивания блоков делегируется модулю через callbacks для U-узлов и баз.


## v3.6.12

`TrussBlockConstructor` phase 6:
- вынесены SVG helpers для прямых ферм, U-блоков/углов, 3D-узлов и базы;
- прежние legacy-функции `straightSvg()`, `nodeSvg()`, `baseSvg()` оставлены как мосты.

## v3.6.13

`TrussBlockConstructor` phase 7:
- вынесены render helpers библиотеки объектов: генерация HTML групп и квадратных кнопок выбора;
- вынесены helpers отрисовки элементов на поле: CSS-класс, карта inline-стилей и HTML/SVG-содержимое элемента;
- legacy-мост по-прежнему создаёт DOM-элементы и навешивает pointer/click обработчики.

## v3.6.14

`TrussBlockConstructor` phase 8:
- вынесено создание DOM-элемента блока на поле;
- вынесено применение классов, inline-стилей и SVG-содержимого;
- добавлена пакетная отрисовка элементов поля через `renderFieldItems()`;
- drag/snap-обработчики, расчёты, PDF и админ-калибровка остались в `legacy-app.js`.

## v3.6.15

`TrussBlockConstructor` phase 9:
- вынесены drag helpers: расчёт точки сетки по pointer-событию, создание drag-state, применение движения, отметка `.dragging`;
- обработчики pointer-событий пока остаются в `legacy-app.js` как безопасный мост;
- drag/snap поведение не менялось.


## v3.6.17

Следующий малый шаг миграции `TrussBlockConstructor`: в модуль вынесен слой подключения и снятия pointer-listeners для drag-перетаскивания.

В `legacy-app.js` оставлены сами мосты пересчёта, redraw и сохранения черновика.


## v3.6.18

Аккуратно вынесены UI helpers для блочного конструктора:
- HTML итоговой таблицы комплектации;
- HTML строк ведомости блоков/BOM;
- текст счетчика блоков/метража/CQ2.

Расчет, PDF, нагрузка, drag/snap и отрисовка схемы остались без изменения поведения.
