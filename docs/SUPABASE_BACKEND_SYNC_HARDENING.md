# Supabase backend sync hardening — v3.12.1

Этот слой готовит первый controlled equipment sync через Edge Functions, но не включает автоматическую запись из статической сборки.

## Что добавлено

- `supabase/migrations/202605120002_v4_backend_sync_hardening.sql`.
- `backend_sync_runs` — журнал dry-run/write попыток.
- `local_id` для `suppliers`, `equipment_items`, `clients`, `quote_items` — совместимость с локальными строковыми ID фронтенда.
- Дополнительные payload-поля: `startup_power_w`, `supplier_name`, `supplier_local_id`, `schema_version`, `raw_payload`.
- Helper-функции: `feg_is_admin()`, `feg_can_write_equipment()`, `feg_workspace_id_from_slug()`, `feg_register_backend_sync_run()`.
- Edge Function `equipment-sync-dry-run` — проверяет equipment payload без записи.
- Edge Function `equipment-controlled-write` — skeleton реального upsert, закрытый несколькими gate-проверками.
- UI-модуль `SupabaseBackendPack` — показывает migrations/functions checklist и скачивает request-шаблоны.

## Почему нужен Edge слой

Локальная база использует человекочитаемые строковые ID и `workspaceId` вроде `main`. Supabase-таблицы используют server-side UUID. Поэтому прямой browser upsert небезопасен и несовместим. Edge Function должна:

1. принять staged payload;
2. проверить gate;
3. найти workspace по slug;
4. записать локальные ID в `local_id`, а не в UUID `id`;
5. выполнить upsert через service role;
6. записать результат в `backend_sync_runs`.

## Gate для controlled write

`equipment-controlled-write` не пишет данные, пока одновременно не выполнено всё:

- запрос прошёл `x-feg-test-key`;
- `dry_run === false`;
- `confirm_phrase === "WRITE EQUIPMENT"`;
- передан clean `controlled_write_plan`;
- есть `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`;
- Edge env `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.

Без последнего флага функция возвращает blocked result. Статическая сборка не выполняет прямой remote upsert.

## Рекомендуемый порядок

1. Применить миграции в disposable Supabase project.
2. Развернуть функции `backend-health`, `equipment-sync-dry-run`, `equipment-controlled-write`.
3. Выполнить Server Test Harness с `equipmentDryRun`.
4. Скачать `feg_equipment_edge_dry_run_request.json` из Backend Pack и отправить в dry-run функцию.
5. Проверить `backend_sync_runs`.
6. Только после этого на тестовом workspace включить `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и прогнать controlled write.

## Не менялось

- расчёт LED-крепежа/печенек/болтов;
- складские движения;
- автоматическая запись Supabase из клиента;
- старый v3-интерфейс и старые расчёты.


## v3.12.2 — remote dry-run

Следующий безопасный слой добавляет запуск `equipment-sync-dry-run` из UI и read-only `remote_diff` по текущим `equipment_items`. Реальная запись остаётся только за `equipment-controlled-write` и env-флагом `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.


## v3.12.3 — remote dry-run history / preflight

Добавлен безопасный слой между remote dry-run и первым controlled write:

- локальная история последних remote dry-run reports;
- baseline для сравнения повторных запусков;
- controlled write preflight JSON;
- advisory `promotion_gate` в Edge dry-run response;
- write по-прежнему не выполняется из статической сборки.


## v3.12.4 — approval package before controlled write

Добавлен последний предохранитель перед equipment controlled write: approval package с `payload_checksum`. Он создаётся после успешного remote dry-run и блокирует write template, если payload изменился после проверки.

## v3.12.5 — controlled write Edge runner

Backend pack получил ручной runner для `equipment-controlled-write`.

Runner требует локально готовый approval package, контрольную фразу `WRITE EQUIPMENT`, временно введённый `FEG_SERVER_TEST_KEY` и armed controlled write plan. Серверная запись всё равно остаётся за Edge Function и включается только через env `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.


## v3.12.6 — post-write verification loop

Backend pack теперь закрывает полный цикл: dry-run, approval, controlled write и read-only post-write verification. Прямой browser upsert не включается.
