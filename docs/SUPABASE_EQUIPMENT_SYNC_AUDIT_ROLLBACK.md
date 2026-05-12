# Supabase equipment sync audit + rollback safety — v3.12.7

v3.12.7 добавляет слой закрытия controlled equipment sync после post-write verification.
Цель: перед тем как считать первый sync завершённым, сохранить понятный audit package и rollback hints.

## Что добавлено

`SupabaseBackendPack` получил:

- `buildEquipmentSyncAuditTrail()`;
- `buildEquipmentSyncRollbackHints()`;
- `saveEquipmentSyncAuditSnapshot()`;
- `readEquipmentSyncAuditSnapshots()`;
- localStorage key `fegV4EquipmentSyncAuditSnapshots`.

В UI backend pack добавлены:

- статус `Sync audit`;
- кнопка `Скачать sync audit JSON`;
- кнопка `Сохранить audit snapshot`;
- кнопка `Скачать rollback hints JSON`.

## Что попадает в audit trail

Audit trail связывает цепочку:

1. remote dry-run;
2. approval package;
3. controlled write report;
4. post-write verification report.

Для каждого шага сохраняются статус, время, checksum и итог `ok`.

Успешный финальный статус:

```text
status = equipment_sync_verified_and_audited
```

Он возможен только если:

```text
remote dry-run есть
approval package совпадает с текущим payload
controlled write реально выполнил remote write
post-write verification подтверждён
```

## Rollback hints

Rollback hints — это не автоматический откат.

Они показывают, что делать, если после write verification не чистый:

```text
insert > 0      → не хватает строк на сервере, проверить workspace и повторить controlled write
update > 0      → есть отличающиеся поля, проверить changed_fields
remote_only > 0 → на сервере есть лишние строки, решать вручную
```

Автоматическое удаление remote rows специально не выполняется.

## Safety rules

v3.12.7 не делает:

- прямой browser upsert;
- автоматический rollback;
- автоматическое удаление `remote_only` строк;
- складские движения;
- изменение LED-крепежа/печенек/болтов.


Audit safety flags:

```text
automatic_rollback: false
automatic_delete: false
stock_movements_changed: false
```
