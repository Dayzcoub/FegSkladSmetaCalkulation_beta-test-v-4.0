# FEG Stage PRO Changelog

This changelog keeps the current release line readable. The full pre-cleanup historical changelog is preserved in Git history at baseline commit `df9da58b13fe9a769f38d439b549cbfb39b52f8d` and in the cleanup PR diff.

## Changelog rules

- Newest entries stay at the top.
- One version gets one section only.
- Do not paste repeated `# Changelog` blocks from old archive handoffs.
- Keep durable architecture, UI, constructor and backend rules in `docs/`, not in release entries.
- Release entries should state what changed and what protected flows were intentionally not changed.

## Unreleased — PACK.IT unified dark UI baseline checkpoint

- Проведён большой UI/CSS-pass по основным разделам PACK.IT / FEG Stage PRO в тёмной теме.
- Приведены к единой структуре и визуальному стилю: линейный мастер сметы, быстрый расчёт, клиенты, база оборудования, субаренда, склад/операции, чек-лист площадки, документы, поиск/команды, chats/notifications, отчёты, контроль данных, настройки, backend/sync и админка.
- Добавлены финальные scoped CSS layers для quick, admin, sync и last-mile `ui-final-audit.css`.
- Quick Stage checkbox переведён на native/system checkbox style, чтобы совпадать с остальными страницами.
- Зафиксирован handoff-документ `docs/HANDOFF_PACKIT_UNIFIED_DARK_UI_BASELINE.md`.
- Расчёты, BOM, склад, резервы, PDF, quick drafts, legacy/v3, backend controlled writes и бизнес-логика намеренно не менялись.

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