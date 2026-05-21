# FEG Stage PRO Changelog

This changelog keeps the current release line readable. The full pre-cleanup historical changelog is preserved in Git history at baseline commit `df9da58b13fe9a769f38d439b549cbfb39b52f8d` and in the cleanup PR diff.

## Changelog rules

- Newest entries stay at the top.
- One version gets one section only.
- Do not paste repeated `# Changelog` blocks from old archive handoffs.
- Keep durable architecture, UI, constructor and backend rules in `docs/`, not in release entries.
- Release entries should state what changed and what protected flows were intentionally not changed.

## v3.17.50 — Quick PDF summary dark text

- Усилен контраст текста в верхних сводных карточках quick PDF для сцены, ферм и LED.
- Для карточек добавлены inline light styles, чтобы тёмная тема не ломала читаемость при PDF-render.
- Остальная логика quick PDF и сметчика не менялась.

## v3.17.49 — Quick PDF readable scheme fallback

- Исправлен контраст quick PDF: таблицы и коды получают light styles.
- Для quick Stage и quick LED добавлен data-driven SVG fallback схемы из текущего конфига, если `html2canvas` не может снять DOM-поле конструктора.
- Quick Truss продолжает использовать снимок текущего поля с тем же high-contrast PDF layer.
- Сметчик, склад, дефицит, совместимые замены, BOM-формулы и backend-записи не менялись.

## v3.17.48 — Quick PDF constructor scheme snapshot

- Быстрый PDF Stage / Truss / LED теперь использует снимок текущего поля конструктора, а не общий project visualizer.
- PDF-блок переименован в «Схема из конструктора».
- Текст PDF переведён на светлую print-тему: тёмный текст, светлый hero-блок, читаемые карточки, таблицы и footer.
- Предпросмотр, скачивание и отправка через system share сохранены.

## v3.17.47 — Quick PDF modal overlay fix

- Исправлено открытие PDF-предпросмотра в быстрых конструкторах Stage / Truss / LED: модалка создаётся внутри fixed backdrop.
- Кнопка закрытия, закрытие по фону и Esc восстановлены.
- Добавлен recovery для старой некорректно созданной v3.17.46-модалки.
- PDF-генерация, quick/quote-конструкторы, BOM, склад и сметчик не менялись.

## v3.17.46 — Quick calculators PDF export

- Добавлен `src/modules/QuickPdfExport.js` для PDF-экспорта быстрых конструкторов Stage / Truss / LED.
- В quick-режиме появилась кнопка PDF с предпросмотром.
- PDF содержит сводные карточки, схему текущего конфига и таблицу комплектации/BOM.
- Изменения ограничены быстрыми конструкторами.

## v3.17.45 — Truss balanced template split

- Добавлен общий shared-алгоритм `balancedStraightSegmentTypes` для разбиения прямых пролётов шаблонов ферменного конструктора.
- Quick и Quote конструкторы ферм при автопостроении порталов, рам и табуреток стараются избегать коротких модулей, если есть более ровное точное деление.
- Пример: 4.5 м строится как 2.5 м + 2.0 м.

## v3.17.44 — Truss stool paired leg layout

- В shared-логике ферменного конструктора табуретки ноги раскладываются визуальными парами с промежутком между парами.
- Правило применяется и в quick, и в quote mode через общий `V4StructureVisualConfigurator`.
- Расчёты, BOM, реальные габариты по верхней раме, склад, дефицит, совместимые замены и субаренда не менялись.

## v3.17.43 — Truss stool shared quick/quote dimensions

- Синхронизирована логика табуретки между быстрым конструктором ферм и конструктором ферм в сметчике.
- Реальный габарит табуретки в обоих режимах считается по верхней раме; ноги и базы остаются в BOM, весе и крепеже.
- Quote-режим сохраняет склад, совместимые замены, альтернативные длины и субаренду; quick-режим остаётся на `quick_ideal_catalog`.

## v3.17.42 — Quick truss manual zoom and auto-fit field

- В быстром конструкторе ферм добавлена панель масштаба: минус, плюс, range 35–220%, «По размеру» и auto-fit.
- Большие конструкции автоматически уменьшаются, чтобы помещаться в видимую область поля.
- Snap, клики и drag используют текущий render-cell size.

## v3.17.41 — Quick truss stool real dimensions and final kit

- В quick truss табуретке реальные габариты и расчётный пролёт считаются по верхней раме.
- Ноги, прямые фермы ног и базы остаются в комплектации, весе и крепеже, но не увеличивают размер конструкции.
- U017 / T-угол зафиксирован как узел 710×500 мм для габаритного расчёта и 500 мм по высоте.
- Итоговые блоки объединены в таблицу `Итоговая комплектация ферм`.

## v3.17.40 — Quick truss no subrent panel and fine weight step

- В quick truss скрыт блок складского наличия и субаренды.
- Quote truss сохраняет проверку наличия, дефицита, совместимых замен и субаренды.
- В редакторе базы оборудования поле веса использует шаг `0.0001`.

## v3.17.39 — MDM truss catalog cleanup

- Ферменный каталог конструктора нормализован под МДМ-Технология T29Q.
- Прямые фермы получили цены 500 ₽/м.п.; углы, узлы, кубы и базы — 500 ₽/блок.
- C2-88, C3-83, пальцы и шплинты оставлены без отдельной цены, так как включены в стоимость ферм/узлов.
- Совместимость будущих партий сохранена через `trussCompatibilityGroup = T29Q-C2-BOX-290`.

## v3.17.38 — Truss compatibility groups and alternative lengths

- Добавлен слой совместимости ферм через compatibility group, family, interface, part key and length metadata.
- Quote truss может использовать совместимые складские позиции разных производителей при совпадении группы, типа и длины.
- При нехватке прямой длины конструктор пробует альтернативную сборку из доступных совместимых длин.
- При альтернативной сборке добавляются дополнительные стыки и крепёж.

## v3.17.37 — Truss catalog stock binding

- Проверены реальные позиции ферменного конструктора в `catalogMode: quote`.
- Старые складские позиции с остатками получают `meta.systemPartKey` и производителя `FEG`.
- Нулевые системные дубликаты схлопываются в пользу реальных FEG-позиций с остатками.
- При дефиците сметчик оставляет дефицит и subrent suggestion вместо тихой замены.

## v3.17.36 — Quick ideal catalog isolation

- Разделены источники каталога: quick использует `QuickIdealCatalog`, quote использует `EquipmentDatabase`.
- Шаблоны, визуал, геометрия, нагрузки и BOM-правила остаются общими.
- Передача quick-расчёта в смету пересобирает секции в `catalogMode: quote`.

## v3.17.35 — Truss final kit rows without v3 ведомость

- Видимая таблица `Ведомость v3` убрана из ферменного конструктора как устаревший UI-артефакт.
- Вместо неё показывается `Итоговая комплектация ферм` из v4 BOM.
- Нулевые позиции скрываются.
- Нормализованные строки сохраняют метраж и длины прямых ферм для документов и склада.

## v3.17.34 — Truss straight lengths BOM export fix

- Зафиксирована выгрузка всех прямых ферм: 3 / 2.5 / 2 / 1.5 / 1 / 0.5 м.
- Добавлены aliases для старых вариантов 0.5 м.
- Shared BOM строит прямые фермы в фиксированном порядке длин.

## v3.17.33 — Truss rental pricing defaults

- Добавлен прокат в расчёт ферм: прямые фермы по 500 ₽/пог. м.
- Углы, узлы, базы и блины — 500 ₽/шт.
- C2-88, C2-67, C2-2-48 и C3-83 остаются в ведомости и весе, но по умолчанию входят в прокат.

## v3.17.32 — Stool T-support distribution

- В табуретке дополнительные ноги получают полноценный U017 / T-узел с разрывом прямой фермы в верхней раме.
- Ручное количество ног распределяется примерно равномерно по ширине и глубине.
- Пустое поле ног сохраняет автоматическую логику дополнительных опор.

## v3.17.31 — Truss constructor repair and template split

- Починен runtime-сбой ферменного конструктора после v3.17.30.
- Параметры быстрого построения разделены: портал/рама и табуретка имеют разные наборы полей.
- Для табуретки пустое поле ног сохраняет auto-support logic, ручное значение пересчитывает стойки и базы.

## v3.17.30 — Client picker and truss 3D height correction

- В шаге `Клиент и проект` добавлен выбор клиента из базы.
- Зафиксирована высота верхних узлов U012 и U017 / T-перемычки: 500 мм.
- При использовании U012 конструкция помечается как 3D и получает ширину, высоту и глубину.

## v3.17.29 — Quote wizard truss navigation and late transport order

- Починен переход из шага `Фермы`: мастер синхронизирует активную визуальную секцию перед проверкой и переходом.
- Шаг `Транспорт` перенесён ближе к финалу.
- Подсказка шага `Состав сметы` обновлена.

## v3.17.28 — Unified deficit closure summary

- В финальной сводке объединены дублирующие блоки дефицита и субаренды в `Дефицит и закрытие`.
- Таблица показывает раздел, позицию, потребность, склад, дефицит, способ закрытия, источник, себестоимость, цену клиенту и маржу.
- Клиентская смета, BOM, расчёты, склад и backend controlled writes не менялись.

## v3.17.27 — Crew role-only client rows and smart assignment rows

- В клиентской смете строки команды показывают только роль без ФИО/email.
- Техническая сводка и техлисты сохраняют подробные данные.
- В шаге команды добавлена smart-row логика добавления участников.

## v3.17.26 — Project crew summary binding

- Назначенные пользователи и приглашённые специалисты попадают в клиентскую смету отдельными строками работ.
- Работы команды добавлены в `quote_items` как labor layer `sectionKey=crew`.
- Техлист получает `crewRows`.

## v3.17.25 — Project crew assignments and access keys

- Ключи доступа разделены на временные и постоянные.
- В линейный мастер добавлен шаг `Команда проекта`.
- Добавлен справочник проектных рабочих ролей.
- Приглашённому специалисту можно создать/продлить доступ на проектный интервал.

## v3.17.24 — Admin user permissions and password recovery

- В админке добавлено ручное управление пользователями, ролями, workspace и статусом.
- Показываются эффективные разрешения и overrides.
- Добавлен reset-код для восстановления пароля.

## v3.17.23 — Director roles and tech director site checklist

- Добавлены роли `Директор` и `ТехДиректор`.
- Для техдиректора добавлен `Чек-лист площадки` с параметрами помещения, электрики, оборудования, контактов, фото и схемой.

## v3.17.22 — Role access cleanup and specialist roles

- Dev/JSON/diagnostic panels убраны из рабочих ролей и оставлены админу.
- Добавлены профильные роли: звук, свет, экраны, фермы/сцены, приглашённый спец.
- Приглашённый специалист получает ограниченный доступ к чатам и документам активного проекта по сроку ключа.

## v3.17.21 — Compact subrent layout polish

- Подровнены блоки дефицита/субаренды в оборудовании и ферменных дефицитах.
- Изменение UI-only: расчёты, BOM, смета, склад, резервы и backend writes не менялись.

## v3.17.20 — Subrent client pricing and margin fallback

- Для субаренды сцены и LED разделены цена субаренды и цена клиенту.
- Если цена клиенту пустая, используется цена субаренды.
- Маржа считается как разница между клиентской ценой и себестоимостью субаренды.

## v3.17.19 — Shared subrentor pickers for structure subrent

- Сцена, LED и ферменные дефициты используют общий справочник субарендаторов.
- Добавлена кнопка `+ добавить`, создающая субарендатора и сразу выбирающая его в строке.

## v3.17.18 — Subrentors directory and quote deficit selector

- Добавлен раздел `Субаренда` с карточками субарендаторов.
- SupplierDirectory расширен subrentor helpers.
- Добавлена Supabase-ready миграция `public.subrentors`.

## v3.17.17 — Active step frame cleanup

- В линейном сметчике убрана внутренняя карточка активного шага с дублирующей рамкой.
- Номер и название шага перенесены в существующий блок проверки заполнения.

## v3.17.16 — Equipment row actions

- В smart rows оборудования добавлены действия удалить/очистить.
- Такие же действия добавлены для ручных и субарендных строк.

## v3.17.15 — Structure subrent overrides for truss/stage/LED

- В фермах добавлены поля добора для недостающих BOM-позиций.
- В сцене и LED добавлены режимы полной субаренды конструкции.
- Если субаренда не включена, сохраняется стандартный расчёт конструктора.

## v3.17.14 — Automatic deficit subrent split for quote equipment

- Складская smart row работает от нашей номенклатуры и общего количества.
- При нехватке склада система раскрывает поля добора и считает недостающее количество.
- Клиентская смета остаётся одной строкой, внутренняя сводка разделяет own/subrent.

## v3.17.13 — Stage configurator layout polish

- Верхняя панель параметров сцены перестроена по логическим колонкам.
- Инструменты построения и памятка вынесены ниже.
- Изменение UI-only.

## v3.17.12 — Compact availability polish for quote equipment

- Наличие в smart rows заменено на компактные status badges.
- Верхняя корзина показывает сводку по доступности.
- Нижний список выбранных позиций стал компактным.

## v3.17.11 — Quote wizard manual subrent rows smart flow

- Ручные/субарендные строки приведены к визуальному паттерну складских smart rows.
- После подтверждения строки автоматически появляется новая пустая строка.
- Добавлен Enter-save для названия ручной позиции.

## v3.17.10 — Quote wizard layout cleanup pass 1

- Верхний блок линейного мастера перестроен: шаги слева, summary справа.
- Основные действия конструкторов перенесены вниз рядом с переходом к следующему шагу.
- Quote-mode stage/truss configurators сделаны компактнее.

## v3.17.9 — Compact Linear UI polish pass

- UI приближен к компактному Linear-like reference: меньше визуального шума, плотнее отступы, аккуратнее границы.
- Унифицированы радиусы карточек, кнопок, таблиц, модалок и inputs.
- Technical canvas exceptions сохранены.

## v3.17.8 — Version metadata sync and communication / iso foundation

- Выровнены version markers в package, manifest, sw, index, design system and changelog.
- Добавлен `CommunicationCenter` и dashboard-раздел communication.
- Добавлена Supabase migration для chat rooms, messages, notification events and push subscriptions.
- Добавлен `ProjectRendererIso` facade.

## v3.17.7 — Compact Linear reference UI

- V4 design layer переработан под compact Linear reference.
- Заданы targets типографики: 14px headings, 11px main text, 10px labels/table headers.
- Technical constructor exceptions сохранены.

## v3.17.6 — Fast lazy Document Center

- Documents section открывается в lightweight lazy mode.
- Документы материализуются только при выборе, копировании, скачивании или экспорте.
- JSON и HTML templates стали opt-in/deferred.

## v3.17.5 — LED constructor reset canvas and guarded edge auto-expand

- `Очистить схему` в LED freeform возвращает canvas к default 18×10.
- Edge auto-expansion ограничен на drag gesture.

## v3.17.4 — Linear UI safe technical canvas fix

- Global Linear-style UI layer не должен искажать technical constructor canvases.
- LED cabinet cells восстановлены как square tiles с текстурой.

## v3.17.3 — Unified Linear-style UI

- Добавлен `V4DesignSystem.js` как v4-only visual design layer.
- Изменение UI-only: quote/BOM/warehouse/auth/calculation logic не менялась.

## v3.17.2 — V4-only dashboard polish

- Главное окно v4 после удаления legacy/v3 переведено на компактную навигацию workspace.
- Dashboard сгруппирован по рабочим разделам и быстрым действиям роли.
- Hero v4-only shell очищен от dev-формулировок.

## v3.17.1 — V4-only cleanup and fast warehouse/reports/quality sections

- Cleanup после удаления старого v3 UI entrypoint.
- Warehouse, Reports, Data Quality and Command Center получили lightweight index paths вместо тяжёлой нормализации всей истории при открытии.
- Calculation, BOM, warehouse movements, reservations and backend controlled-write logic не менялись.

## v3.17.0 — V4-only app shell

- Старый видимый v3 route удалён из `index.html`.
- `src/legacy-app.js` удалён из package and service-worker precache.
- `V4AppShell` загружается сразу: если есть сессия — dashboard, если нет — login/registration/onboarding.
- V4 shared calculation engines and data modules сохранены.

## Earlier history

Detailed historical entries from v3.16.x and earlier were compacted during documentation cleanup because the file contained repeated pasted changelog blocks from archive handoffs. The full old changelog remains available in Git history before this cleanup branch at commit `df9da58b13fe9a769f38d439b549cbfb39b52f8d`.
