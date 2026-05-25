# PACK.IT / FEG Stage PRO — unified dark UI baseline handoff

Дата фиксации: 2026-05-25

## Текущее состояние

Зафиксирован большой проход по приведению интерфейса PACK.IT / FEG Stage PRO к единому тёмному рабочему стилю. Работы велись как UI/CSS-layer поверх существующей логики. Расчёты, BOM, складские формулы, резервы, PDF-экспорт, backend-controlled writes и бизнес-логика не должны считаться изменёнными этим проходом.

## Что приведено в порядок

- Линейный мастер сметы: шаги 1–10, футеры, summary, шаговые карточки, первый шаг, блок звука/света/услуг.
- Быстрый расчёт: общий quick hub, вкладки Сцена / Фермы / LED экран / 3D фермы MDM, внутренние поля quick-конструкторов, checkbox в Stage приведён к native/system style.
- Клиенты: CRM-экран, карточка нового клиента, таблица, действия.
- База оборудования: read-only/admin layout, статистика, фильтры, таблица, active checkbox, служебные блоки.
- Субаренда: карточки субарендаторов и общий справочник.
- Склад / операции: warehouse hub и будущая заметка по отдельной аренде/резерву без большого сметчика.
- Чек-лист площадки: компактная форма, схема площадки, осмотры.
- Документы: выбранный проект/черновик как источник документов, центр документов, список и preview.
- Поиск / Команды: command center, разделы, действия, клиенты, оборудование.
- Chats / Notifications: заготовка под будущую коммуникацию оставлена визуально рабочей; полноценная логика будет полироваться отдельно при запуске realtime/push.
- Отчёты: пересобран смысл в будущий management dashboard: операции, финансы, склад, клиенты, команда.
- Контроль данных: QA-экран качества базы, клиентов и проектов.
- Настройки: внешний вид, workspace, КП/документы, календарь, dev-переключатели.
- Backend / Sync: верхний sync hub и внутренние технические консоли приведены в порядок до базового состояния.
- Админка: AdminControlCenter, AdminShell, пользователи, роли, ключи, формы и таблицы.

## Добавленные/важные CSS-слои

- `src/styles/modules/quote-wizard-footer-final.css`
- `src/styles/modules/quote-client-dialog-final.css`
- `src/styles/modules/quote-equipment-layout.css`
- `src/styles/modules/quote-equipment-tighten.css`
- `src/styles/modules/quote-equipment-server-pass.css`
- `src/styles/modules/quote-equipment-toolbar-final.css`
- `src/styles/modules/quick-polish.css`
- `src/styles/modules/quick-controls-final.css`
- `src/styles/modules/admin-polish.css`
- `src/styles/modules/admin-forms-final.css`
- `src/styles/modules/sync-internals.css`
- `src/styles/modules/ui-final-audit.css`

`ui-final-audit.css` должен оставаться последним импортом в `src/styles/main.css`.

## Важные правила продолжения

1. Не откатывать тёмный unified UI pass точечными inline-стилями.
2. Не добавлять CSS-костыли локально без необходимости: сначала использовать tokens, shared classes и отдельные scoped modules.
3. Не менять расчёты, BOM, склад, резервы, PDF, quick drafts, legacy/v3 и backend writes без прямой задачи.
4. Quick-конструкторы остаются отдельными от сметчика: quick использует идеальный локальный каталог, сметчик использует реальную базу/склад/дефицит.
5. Chats / Notifications и Backend / Sync пока можно считать визуальными/служебными заготовками; глубокая полировка нужна после включения реальной логики.
6. Light theme пока не считать готовой: этот checkpoint относится к dark UI baseline.

## Зафиксированная будущая задача

Нужно добавить отдельный механизм аренды/резерва со склада без запуска большого сметчика:

- отдельная форма, близкая по логике к шагу 7 сметчика;
- выбор оборудования/услуг/коммутации;
- указание кому сдаётся, на какой срок, кто выдал, кто принял, когда вернуть, где забрать/вернуть;
- последующее резервирование на складе;
- история выдачи/возврата;
- связь с субарендой и warehouse workflows;
- не смешивать с полным quote wizard, но использовать общую базу оборудования и складскую доступность.

## Следующий чат — рекомендуемый старт

Начинать с проверки текущего состояния после deploy + hard refresh:

1. Быстро пройти все пункты меню на desktop.
2. Отдельно проверить mobile/responsive для: quick, quote wizard, clients, equipment, documents, warehouse, admin.
3. При отсутствии явных визуальных багов зафиксировать этот UI pass как новый рабочий baseline.
4. После фиксации можно переходить к следующему крупному этапу: либо мобильный аудит, либо отдельный warehouse rental/reservation flow, либо light theme pass.

## Последний значимый коммит перед handoff

Последняя правка перед handoff: quick checkbox переведён на native/system style.
Commit: `17c5990c29031da8245ad05343b32aaeda71ff3c`.
