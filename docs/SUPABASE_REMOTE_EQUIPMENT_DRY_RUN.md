# Supabase remote equipment dry-run — v3.12.3

Этот слой подключает безопасную проверку `equipment-sync-dry-run` к UI и Server Test Harness.

## Что делает

- собирает локальный `equipment_sync_payload` из базы оборудования;
- отправляет его в Edge Function `equipment-sync-dry-run`;
- передаёт `x-feg-test-key` только из временного поля ввода;
- не сохраняет test key в `localStorage`;
- получает серверный отчёт с `workspace` resolution, counts, blockers/warnings и `remote_diff`;
- сохраняет только отчёты dry-run, без ключа.

## Что не делает

- не вызывает `equipment-controlled-write`;
- не выполняет `upsert`;
- не меняет складские остатки;
- не создаёт `stock_movements`;
- не включает `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE`.

## Edge Function report

`equipment-sync-dry-run` в v3.12.2 остаётся read-only, но при наличии `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` дополнительно читает текущие `equipment_items` workspace и строит `remote_diff`:

```json
{
  "remote_write_executed": false,
  "remote_diff": {
    "status": "remote_diff_ready",
    "baseline_rows": 130,
    "local_rows": 130,
    "status_counts": {
      "insert": 0,
      "update": 2,
      "unchanged": 128,
      "remote_only": 0
    }
  }
}
```

## UI

В блоке `Supabase backend pack` появилась кнопка:

- `Запустить remote dry-run`.

Нужен вручную введённый `FEG_SERVER_TEST_KEY`. Ключ не сохраняется.

## Следующий gate

После чистого remote dry-run можно переходить к первому controlled write только через отдельный gate:

- admin role;
- staged payload;
- clean local dry-run;
- clean remote dry-run;
- `dry_run=false`;
- `confirm_phrase=WRITE EQUIPMENT`;
- `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` на Edge runtime.


## v3.12.3 — history + preflight

Добавлен слой истории remote dry-run reports и controlled write preflight:

- `saveRemoteDryRunReport()` сохраняет последние отчёты локально без сохранения `FEG_SERVER_TEST_KEY`.
- `buildRemoteDryRunHistoryReport()` показывает последний статус, baseline и diff-сравнение.
- `saveRemoteDryRunBaseline()` фиксирует выбранный dry-run как baseline для будущего сравнения.
- `summarizeRemoteDryRunReport()` сводит Edge-ответ к понятному статусу `blocked` / `ready_with_warnings` / `ready_for_controlled_write_preflight`.
- `buildControlledWritePreflight()` собирает проверочный пакет перед controlled write, но не выполняет запись.
- Edge Function `equipment-sync-dry-run` дополнительно возвращает `promotion_gate`; он только советует, можно ли переходить к preflight, и не выполняет upsert.

Controlled write остаётся отдельной функцией и требует `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`, `dry_run=false`, `WRITE EQUIPMENT` и server test key.


## v3.12.4 — approval package / checksum

После remote dry-run можно собрать `buildEquipmentWriteApprovalPackage()`. Он фиксирует `payload_checksum`, который прошёл dry-run. Если локальная база оборудования изменилась, approval становится stale и approved write template не собирается без нового dry-run.

## v3.12.5 — transition to controlled write runner

Remote dry-run остаётся read-only. После clean dry-run и approval package можно перейти к ручному `controlled write Edge runner`, который вызывает отдельную Edge Function `equipment-controlled-write` и не выполняет прямой browser upsert.


## v3.12.6 — verification mode

`equipment-sync-dry-run` теперь может работать как post-write verifier. В этом режиме он не пишет данные и возвращает `post_write_verification_gate`.
