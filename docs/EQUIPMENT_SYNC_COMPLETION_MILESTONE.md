# FEG Stage PRO v3.12.0 — Equipment sync completion milestone

Этот слой объединяет цепочку добивки базы оборудования перед первым controlled sync.

## Что добавлено

### Manual completion matrix

`EquipmentDatabase.buildManualCompletionMatrix()` строит матрицу ручной добивки по проблемным полям:

- вес;
- мощность;
- остатки;
- поставщики субаренды;
- нестандартные подкатегории;
- конфликт типа и категории;
- прокатная цена;
- стоимость замены.

Матрица ничего не заполняет автоматически. Она только показывает, какие позиции надо открыть и какие поля требуют фактических значений.

### Patch export/import

`EquipmentDatabase.buildEquipmentPatchExport()` создаёт JSON-шаблон ручной добивки. Его можно скопировать, заполнить реальные значения в `fields` и импортировать обратно через `applyEquipmentPatch()` / `applyStoredEquipmentPatch()`.

Импорт принимает только разрешённые поля ручной добивки и не выполняет складские движения.

### Staged diff

`EquipmentDatabase.buildEquipmentStagedDiff()` и `EquipmentServerSyncQueue.buildEquipmentStagedDiff()` сравнивают локальный `equipment_items` payload с baseline:

- пустой baseline — первый write preview;
- staged payload — diff текущей базы относительно staged состояния;
- внешний `remoteRows` — будущая проверка против Supabase rows.

### Controlled write gate

`EquipmentServerSyncQueue.buildEquipmentControlledWritePlan()` добавляет admin-only gate перед будущей серверной записью.

Write gate проверяет:

- роль `admin`;
- наличие staged payload;
- clean dry-run без blockers;
- backend mode `supabase` + `enableRemoteSync`;
- явный equipment write toggle;
- `dryRun=false`;
- контрольную фразу `WRITE EQUIPMENT`.

Даже при прохождении gate текущая статическая сборка не выполняет remote upsert. `runControlledEquipmentWrite()` возвращает controlled result с `remote_write_executed: false`, пока отдельный backend write executor не будет подключён.

## UI

В базе оборудования добавлены:

- блок `Manual completion matrix`;
- фильтр `Добивка`;
- быстрые кнопки по типам задач;
- `Completion JSON`;
- `Patch template`;
- `Import patch`.

В Equipment Server Sync Queue добавлены:

- `Скачать diff`;
- `Write plan`;
- строки `Staged diff` и `Admin write gate` в таблице проверок.

## Ограничения

- Реальная Supabase/backend запись не включена автоматически.
- Складские остатки не меняются движениями.
- Вес, мощность, поставщики и цены не придумываются автоматически.
- Расчёты LED-крепежа, печенек и болтов не затронуты.
- Старый v3-интерфейс не менялся.
