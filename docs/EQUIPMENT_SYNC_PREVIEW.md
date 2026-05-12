# FEG Stage PRO v3.11.2 — Equipment sync preview

Этот слой добавляет безопасный preview будущей синхронизации базы оборудования в Supabase `equipment_items`.

## Главное правило

Реальная запись в Supabase не выполняется. Preview только показывает, что будет подготовлено для будущего upsert.

## Что добавлено

- `EquipmentDatabase.buildEquipmentSyncPreview(items, options)`;
- статус по каждой позиции: `ready`, `warning`, `blocked`;
- список `blockers` — ошибки, которые нужно убрать перед первым реальным write;
- список `warnings` — замечания, которые не блокируют подготовку payload, но требуют внимания;
- `fieldCoverage` по обязательным полям;
- `tablePreview` для будущего `equipment_items` upsert;
- `payloadSampleRows` и `rows[].payloadRow` в snake_case формате.

## Проверки

Preview проверяет:

- обязательные поля `id`, `workspace_id`, `category`, `type`, `code`, `name`, `unit`;
- дубли `id` и `code`;
- соответствие кода префиксу категории;
- нестандартные подкатегории;
- несовместимость `type/category`;
- `subrent` без поставщика;
- пустую мощность для типов, где мощность важна;
- нулевой склад у активных собственных складских позиций.

## UI

В базе оборудования появился блок **Supabase sync preview** и кнопка **Sync preview JSON**.

В Equipment Server Sync Queue появился экспорт `feg_equipment_sync_preview.json`, а staged queue сохраняет preview внутри строки очереди.

## Что не изменилось

- складские остатки не меняются автоматически;
- backend/Supabase запись не включена;
- LED-крепёж, печеньки и болты не трогались;
- старый v3-интерфейс и старые расчёты не менялись.


## v3.11.3 — readiness перед первым write

Sync preview дополнен readiness checklist: теперь отдельно видно blockers, safe-fix задачи и ручную добивку веса, мощности, остатков и поставщиков.


## v3.12.0 — staged diff перед controlled sync

После sync preview можно построить staged diff: первый write preview показывает все локальные строки как inserts, а сравнение со staged baseline показывает будущие updates/unchanged rows.
