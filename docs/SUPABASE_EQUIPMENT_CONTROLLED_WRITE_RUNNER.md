# Supabase equipment controlled write runner — v3.12.5

Этот слой добавляет ручной запуск `equipment-controlled-write` из Supabase backend pack UI.

## Назначение

До v3.12.5 приложение уже умело:

- построить локальный equipment payload;
- выполнить remote dry-run через `equipment-sync-dry-run`;
- сохранить историю dry-run reports;
- зафиксировать approval package с `payload_checksum`;
- собрать approved controlled write template.

v3.12.5 добавляет следующий controlled step: ручной вызов Edge Function `equipment-controlled-write` из интерфейса.

## Что важно по безопасности

Прямой browser upsert не включён. Клиент не пишет напрямую в таблицы Supabase.

Controlled write runner отправляет approved request только в Edge Function. Фактическая запись возможна только если на стороне Edge Function одновременно выполнены все условия:

- запрос пришёл с валидным `x-feg-test-key`;
- `dry_run=false`;
- `confirm_phrase=WRITE EQUIPMENT`;
- есть `approval_package`;
- `approval_package.approved=true`;
- `approval_package.payload_checksum` совпадает с текущим payload;
- local controlled write plan имеет `remote_write_armed=true`;
- в Edge Function заданы `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`;
- в Edge Function явно включён `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.

Если хотя бы один gate закрыт, Edge Function возвращает blocked result и не делает upsert.

## UI workflow

1. Запустить remote dry-run.
2. Проверить remote diff.
3. Одобрить payload.
4. Ввести `FEG_SERVER_TEST_KEY` во временное поле.
5. Ввести контрольную фразу `WRITE EQUIPMENT`.
6. Нажать `Запустить controlled write Edge`.
7. Проверить result report.

`FEG_SERVER_TEST_KEY` и контрольная фраза не сохраняются в localStorage.

## Новые функции

- `buildEquipmentControlledWriteExecutionRequest()` — собирает request для Edge Function.
- `buildEquipmentControlledWriteReadiness()` — проверяет local gates перед вызовом.
- `runEquipmentControlledWriteEdge()` — вручную вызывает `equipment-controlled-write`.
- `saveControlledWriteReport()` — сохраняет локальную историю результатов.
- `readControlledWriteReports()` — читает локальную историю результатов.

## Что не менялось

- LED-крепёж, печеньки и болты.
- Складские движения.
- Автоматическая запись Supabase/backend.
- Старый v3-интерфейс.
- Старые расчёты.


## v3.12.6 — post-write verification

После controlled write нужно запустить read-only проверку `Проверить после write`. Она вызывает `equipment-sync-dry-run` с `verify_after_controlled_write=true` и принимает результат только если `insert=0`, `update=0`, `remote_only=0`.
