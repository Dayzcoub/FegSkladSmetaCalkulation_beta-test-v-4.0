# Equipment Server Sync groundwork

Версия: v3.10.4

Этот слой готовит локальную базу оборудования к будущей серверной синхронизации с Supabase `equipment_items`.

## Что делает

- собирает `equipment_items` из локальной базы;
- добавляет связанных поставщиков, если они есть;
- строит `backend_sync_payload`;
- запускает write dry-run validation;
- ведёт staged queue в `fegV4EquipmentServerSyncQueue`;
- позволяет скачать dry-run, payload и queue JSON.

## Безопасность

Реальная запись в Supabase не выполняется. Это только подготовка: validation → staged payload → будущий write executor.

## Где смотреть

Dashboard → Backend / Sync → Equipment Server Sync groundwork.


## v3.11.1 — type/schema diagnostics

Equipment Server Sync теперь использует `EquipmentDatabase.mapItemToEquipmentRow()` при наличии модуля базы. Dry-run и queue report дополняются `schema_report` и `type_report`, чтобы перед реальным backend upsert видеть конфликты типов/категорий и обязательных полей.


## v3.11.2 — sync preview

Equipment Server Sync Queue теперь добавляет `sync_preview` к queue report, dry-run и staged queue. В UI есть экспорт `feg_equipment_sync_preview.json`. Preview показывает будущий `equipment_items` upsert по строкам и не выполняет серверную запись.


## v3.11.3 — readiness report

Equipment Server Sync Queue добавляет `readiness_report` в queue report и dry-run. Отчёт можно скачать отдельным JSON без серверной записи.


## v3.12.0 — staged diff и controlled write gate

Equipment Server Sync Queue теперь строит `staged_diff` и `controlled_write_plan`. Write plan закрыт admin-only gate и требует staged payload, чистый dry-run, Supabase mode, явный write toggle, `dryRun=false` и фразу `WRITE EQUIPMENT`. В статической сборке remote write не выполняется.
