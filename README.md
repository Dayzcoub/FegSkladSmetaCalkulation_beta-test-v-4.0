# FEG Stage PRO v3.6.48 — TrussBootstrap bridge

Изменения v3.6.48:
- базой взята `v3.6.47 — AppBootstrap bridge`;
- добавлен runtime-модуль `src/modules/TrussBootstrap.js`;
- часть стартовой инициализации 2D truss-workspace вынесена из `legacy-app.js` в `TrussBootstrap.initTrussWorkspace()`;
- чтение/сохранение `trussDraftSettings` и привязка базовых truss input-listeners делегируются в `TrussBootstrap`;
- старые функции `initTrussModule()`, `bindTrussInputs()`, `loadTrussDraftSettings()`, `saveTrussDraftSettings()` сохранены как совместимые bridge/fallback;
- расчёты, PDF, 3D-режим, проекты, Supabase и визуальное поведение конструктора не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.47 — AppBootstrap bridge

- добавлен runtime-модуль `src/modules/AppBootstrap.js`;
- часть стартовой инициализации stage-workspace вынесена из `legacy-app.js` в `AppBootstrap.initStageWorkspace()`;
- старый `init()` сохранён как совместимый bridge с fallback-логикой;
- расчёты, PDF, визуальное поведение и конструктор ферм не менялись.

# FEG Stage PRO v3.6.46 — dom utils bridge

Изменения v3.6.46:
- базой взята `v3.6.45 — format utils bridge`;
- добавлен runtime-модуль `src/modules/DomUtils.js`;
- общие DOM-helper’ы `q()`, `getValue()`, `setValue()`, `getNumber()`, `setText()`, `setHtml()` теперь делегируются в `DomUtils`;
- первичные DOM-ссылки и базовые truss get/set helpers переведены на общий мост;
- `legacy-app.js` оставлен как совместимый bridge со старыми глобальными helper-функциями;
- расчёты, PDF, Supabase, проекты, клиенты, ферменный конструктор и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.45 — format utils bridge

Изменения v3.6.45:
- базой взята `v3.6.44 — toast manager bridge`;
- добавлен runtime-модуль `src/modules/FormatUtils.js`;
- общие helpers `escapeHtml()`, `money()`, `metric()`, `kg()` теперь делегируются в `FormatUtils`;
- добавлены безопасные общие форматтеры `formatNumber()`, `moneyWithCurrency()`, `formatDate()`, `formatTime()`, `formatDateTime()`, `safeFilePart()` для следующих маленьких переносов;
- `legacy-app.js` оставлен как совместимый bridge со старыми глобальными helper-функциями;
- расчёты, PDF, Supabase, проекты, клиенты, ферменный конструктор и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.43 — modal manager bridge

Изменения v3.6.43:
- базой взята `v3.6.42 — PWA manager bridge`;
- добавлен runtime-модуль `src/modules/ModalManager.js`;
- общие действия модалок `open/close`, закрытие по клику на backdrop и закрытие по Escape вынесены в `ModalManager`;
- `legacy-app.js` оставлен как совместимый bridge: старые функции `closePdfPreview()`, `closeWeightsModal()`, `closeAppSettingsModal()`, `closeTransportModal()` сохранены;
- PDF, настройки веса/цен, настройки приложения и транспорт используют прежние DOM-элементы и прежние close-функции;
- расчёты, PDF-содержимое, Supabase, проекты, клиенты, ферменный конструктор и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.41 — navigation init bridge

Изменения v3.6.41:
- базой взята `v3.6.40 — navigation manager bridge`;
- расширен runtime-модуль `NavigationManager`;
- стартовая навигационная инициализация `load/hashchange` вынесена в `src/modules/NavigationManager.js`;
- переключение страниц `stage / clients / truss` по-прежнему проходит через `NavigationManager`;
- `legacy-app.js` оставлен как совместимый bridge для старого глобального `setAppPage()` и inline-кнопок;
- hash-навигация `#stage / #clients / #truss` сохранена;
- расчёты, PDF, Supabase-схема, проекты, ферменный конструктор и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.39 — clients UI bridge

Изменения v3.6.39:
- базой взята `v3.6.38 — clients storage manager bridge`;
- добавлен runtime-модуль `ClientsUI`;
- UI-helper’ы клиентской базы вынесены в `src/modules/ClientsUI.js`: select клиентов, datalist, форма карточки и таблица клиентов;
- `legacy-app.js` оставлен как совместимый bridge со старыми глобальными функциями и текущими обработчиками;
- расчёты, PDF, Supabase-схема, проекты, ферменный конструктор и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.37 — truss cloud manager bridge

Изменения v3.6.37:
- базой взята `v3.6.36 — project manager bridge`;
- `ProjectManager` расширен cloud-операциями ферменных проектов;
- подготовка truss cloud-row, save/upload и load/merge ферм теперь делегируются через `ProjectManager`;
- `legacy-app.js` оставлен как совместимый UI-мост со старыми fallback-ветками;
- расчёты, PDF, схемы, Supabase-таблица и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.36 — project manager bridge

Изменения v3.6.36:
- базой взята `v3.6.35 — project/orders cleanup 3`;
- добавлен runtime-модуль `ProjectManager`;
- `ProjectManager` связывает `ProjectStorage` и `SupabaseStorage` для cloud-save/load заказов сцены;
- `legacy-app.js` теперь делегирует подготовку cloud-row, сохранение в облако, загрузку/merge из облака и upload сохранённого заказа в `ProjectManager`;
- старые fallback-ветки оставлены для совместимости;
- расчёты, PDF, схемы, таблица Supabase и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.35 — project/orders cleanup 3

Изменения v3.6.35:
- базой взята `v3.6.34 — project/orders cleanup 2`;
- `ProjectStorage` расширен stage-order save/delete/replace операциями;
- `saveOrder()` теперь делегирует сохранение и обновление stage-заказов в storage-модуль;
- удаление stage-заказов и обновление cloud-снимков переведены на единый storage API;
- `legacy-app.js` оставлен как совместимый UI-мост;
- расчёты, PDF, схемы, Supabase-таблица и визуальное поведение не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.34 — project/orders cleanup 2

Изменения v3.6.34:
- базой взята `v3.6.33 — project storage module`;
- `ProjectStorage` расширен helpers для JSON-экспорта/импорта проектов сцены и ферменных проектов;
- поиск сохранённого проекта сцены и ферменного проекта теперь делегируется в `ProjectStorage`;
- сохранение и удаление ферменных проектов переведено на единый storage API;
- `legacy-app.js` оставлен как совместимый мост для старых inline-кнопок и UI;
- расчёты, PDF, Supabase-синхронизация, визуальное поведение конструктора и калибровка не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.33 — project storage module

Изменения v3.6.33:
- базой взята `v3.6.32 — pdf bridge cleanup`;
- добавлен runtime-модуль `ProjectStorage`;
- локальная история заказов сцены и список ферменных проектов теперь читаются/пишутся через общий storage-мост;
- прямые обращения к `localStorage` для stage orders/truss projects в рабочих местах legacy-моста заменены на helper-функции;
- расчёты, PDF, Supabase-синхронизация, визуальное поведение конструктора и калибровка не менялись;
- обновлён `sw.js`, чтобы браузер не держал старый кэш.

# FEG Stage PRO v3.6.18 — truss UI summary module

Изменения v3.6.18:
- базой взята `v3.6.17 — truss actions module`;
- в `TrussBlockConstructor` вынесены helpers итоговой таблицы, ведомости блоков и счетчика конструктора;
- расчеты, PDF, нагрузка, drag/snap и SVG-отрисовка не менялись.

# FEG Stage PRO v3.6.7 — truss catalog module

Изменения v3.6.7:
- Начат осторожный перенос TrussBlockConstructor.
- Каталог блоков, группы библиотеки объектов и legacy-маппинг вынесены в `src/modules/TrussBlockConstructor.js`.
- Отрисовка, drag/snap, BOM, PDF и расчёты пока остаются в `legacy-app.js`.
- Поведение конструктора не менялось.

---

# FEG Stage PRO v3.6.6 — calibration manager module

Изменения v3.6.6:

- базой взята рабочая `v3.6.3 — price/weight settings module`;
- продолжена миграция из `src/legacy-app.js` в отдельные runtime-модули;
- вынесен рабочий модуль `CalibrationManager`:
  - нормализация SVG-калибровки;
  - загрузка `feg_svg_calibration.json`;
  - PIN-доступ `7663` к админ-калибровке;
  - локальные черновики калибровки в браузере;
  - сбор и скачивание серверного файла калибровки;
- `legacy-app.js` пока остаётся совместимым мостом и делегирует калибровочные операции в модуль;
- визуальная логика конструктора, расчёты, PDF, темы, транспорт и настройки цен/веса не менялись.

Проверка:

- `src/legacy-app.js` через `node --check`;
- все `src/modules/*.js` через `node --check`;
- `sw.js`;
- `manifest.json`;
- `feg_svg_calibration.json`;
- архив через `unzip -t`.


## v3.6.39 — clients UI bridge

- Added `src/modules/ClientsUI.js` for client select, datalist, form and clients table rendering helpers.
- Kept legacy global functions as compatibility bridges for existing inline handlers.
- No calculation, PDF, Supabase schema or visual behavior changes.

## Последняя стабильная функциональная точка

`v3.5.62 — combined single transport`.

## Миграционная ветка

- `v3.6.0` — подготовка структуры модулей;
- `v3.6.1` — `AppSettings` + `SupabaseStorage`;
- `v3.6.2` — `TransportSettings`;
- `v3.6.3` — `PriceWeightSettings`;
- `v3.6.6` — `CalibrationManager`.


## v3.6.6

Вынесен runtime-модуль `StageCalculator`: чистая геометрия сцены, связность, габариты, текст формы, отражение, поворот, прямоугольник и базовый snapshot расчёта. Старый `legacy-app.js` остаётся мостом совместимости и делегирует эти операции модулю через `window.FEGModules.StageCalculator`.
