# FEG Stage PRO v3.11.3 — Equipment readiness fix plan

Этот слой добивает базу оборудования перед реальным Supabase sync, но не включает серверную запись.

## Зачем нужен слой

`buildEquipmentSyncPreview()` уже показывает, можно ли технически собрать payload для `equipment_items`. Новый `buildEquipmentReadinessReport()` делает следующий шаг: разделяет замечания на безопасные авто-исправления и реальные данные, которые нельзя придумывать автоматически.

## Что считается safe cleanup

Safe cleanup может:

- сохранить нормализованные категории и типы;
- привести коды к сериям категорий, сохранив старые коды в `meta.legacyCode` / `meta.legacyCodes`;
- пересчитать derived-поля вроде `availableQty = stockQty - reservedQty`;
- зафиксировать время безопасной добивки в `meta.readinessSafeFixedAt`.

Safe cleanup не заполняет автоматически:

- вес;
- мощность;
- остатки;
- поставщиков субаренды;
- реальные цены.

Эти поля требуют фактических данных склада или поставщика.

## Новые функции

- `EquipmentDatabase.buildEquipmentReadinessReport(items, options)` — readiness checklist перед первым write.
- `EquipmentDatabase.applyEquipmentReadinessFixes(items, options)` — безопасная подготовка массива без записи.
- `EquipmentDatabase.applyStoredEquipmentReadinessFixes(options)` — безопасная подготовка локальной базы с сохранением в localStorage.
- `EquipmentServerSyncQueue.buildEquipmentReadinessReport(options)` — readiness report в очереди sync.

## UI

В базе оборудования добавлен блок `Sync readiness checklist`.

Кнопки:

- `Readiness JSON` — показать полный readiness report;
- `Safe cleanup` — применить только безопасные исправления.

## Ограничения

Реальный backend/Supabase write не включён. Складские остатки не меняются автоматически. Расчёты LED-крепежа, печенек и болтов не затронуты.


## v3.12.0 — переход к ручной матрице добивки

Readiness report теперь дополняется manual completion matrix. Readiness отвечает на вопрос «что мешает чистому sync», а manual completion matrix даёт рабочий список полей и patch-шаблон для фактической добивки.
