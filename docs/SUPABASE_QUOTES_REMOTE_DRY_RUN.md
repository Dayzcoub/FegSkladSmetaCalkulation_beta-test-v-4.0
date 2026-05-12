# Supabase clients/quotes remote dry-run — v3.12.8

Этот слой добавляет безопасную подготовку серверной синхронизации клиентов и проектов после завершения equipment sync safety loop.

## Что входит

- новый UI-модуль `QuoteBackendSyncPack`;
- новая Edge Function `quote-sync-dry-run`;
- новая миграция `202605120003_quote_backend_sync_dry_run.sql`;
- подготовка payload для:
  - `clients`;
  - `quotes`;
  - `quote_sections`;
  - `quote_items`;
  - `audit_log`;
- `payload_checksum` для quote payload;
- read-only `remote_diff` по `clients` и `quotes`;
- отдельная история remote dry-run reports в `fegV4QuoteRemoteDryRunReports`;
- отдельный шаг `quoteDryRun` в Server Test Harness.

## Что специально не включено

- controlled quote write;
- browser upsert;
- автоматическая запись в Supabase;
- складские движения;
- автоматические резервы;
- списания/возвраты склада.

`quote-sync-dry-run` всегда возвращает:

```json
{
  "dry_run": true,
  "remote_write_executed": false,
  "safety": {
    "no_upsert": true,
    "no_stock_movements": true,
    "no_reservations": true,
    "no_browser_write": true
  }
}
```

## Как использовать

1. Открыть раздел Backend / Sync.
2. В блоке `Clients/quotes remote dry-run` проверить preview.
3. Ввести временный `FEG_SERVER_TEST_KEY`.
4. Нажать `Запустить quote dry-run`.
5. Скачать `feg_quote_remote_dry_run_report.json`.

Ключ не сохраняется в localStorage.

## Зачем это нужно

Equipment sync уже дошёл до approval/write/verification/audit safety. Следующий крупный блок ТЗ — серверное сохранение клиентов и проектов. v3.12.8 не включает запись, а готовит безопасную диагностику будущего sync:

```text
local clients/projects → quote payload → Edge dry-run → remote diff → report
```

## Следующий шаг

После нескольких чистых dry-run можно делать отдельный слой:

```text
v3.12.9 — quote sync approval package
v3.13.0 — controlled quote write runner
```

Но только после проверки схемы, RLS и реальных данных.

## Обновление v3.12.9

После успешного remote dry-run можно создать approval package для quote payload:

```text
quote remote dry-run → payload_checksum → Одобрить quote payload
```

Approval хранится в `fegV4QuoteWriteApprovalPackage` и становится stale, если текущий payload клиентов/проектов изменился после dry-run.

Controlled quote write всё ещё не включён.
