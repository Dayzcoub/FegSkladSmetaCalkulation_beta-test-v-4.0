# FEG Stage PRO v3.9.5 — Data Quality Center

Локальный центр контроля качества данных перед переходом к реальной backend-синхронизации.

Проверяет:

- базу оборудования: коды, названия, категории, дубли, вес, мощность, поставщиков субаренды;
- клиентов: название, контакты, дубли email/телефонов;
- проекты: клиент, название, дата, состав сметы, готовность проекта.

Цель слоя — находить проблемы в локальных данных до миграции в Supabase и до боевого складского workflow.

Автоматических изменений данных нет. Это только аудит, отчёт и JSON-экспорт.


## v3.11.0 category normalization note

Data Quality Center дополнительно проверяет категорийную чистоту базы оборудования: соответствие кода категории, нестандартные подкатегории и позиции, где категория была приведена из алиаса через `EquipmentDatabase.normalizeCategoryId()`.


## v3.11.1 — type/schema checks

Data Quality Center дополнительно показывает конфликт `Тип не соответствует категории`, нормализацию типа из алиаса и schema report для будущего `equipment_items` sync.


## v3.11.2 — sync preview blockers

Data Quality Center учитывает `EquipmentDatabase.buildEquipmentSyncPreview()` и показывает отдельные замечания, если перед будущим `equipment_items` upsert есть blockers или warnings.


## v3.11.3 — readiness tasks

Data Quality Center учитывает `buildEquipmentReadinessReport()`: safe-fix задачи показываются как info, ручная добивка веса/мощности/поставщиков — как warning.


## v3.12.0 — manual completion matrix

Data Quality Center учитывает `buildManualCompletionMatrix()` и показывает отдельную рекомендацию по ручной добивке базы оборудования через быстрые фильтры и patch template.
