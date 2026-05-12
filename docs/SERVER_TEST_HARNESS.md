# Server Test Harness

Версия: v3.10.1

Server Test Harness нужен, чтобы проверять серверную часть без регистрации настоящего администратора.

## Поток проверки

1. `backend-health` — публичная безопасная проверка доступности Edge Functions.
2. `test-seed-workspace` — создание временного test workspace по `x-feg-test-key`.
3. `test-write-quote` — dry-run или тестовая запись проекта/сметы.
4. `test-rls-check` — smoke-проверка будущих RLS-сценариев.
5. `test-cleanup` — очистка тестового workspace.

## Безопасность

- `FEG_SERVER_TEST_KEY` хранится только в Supabase Edge Function env.
- Клиент отправляет ключ только в заголовке `x-feg-test-key`.
- Ключ не сохраняется в `localStorage`.
- Все тестовые данные должны иметь `is_test=true` или отдельный test workspace.
- Cleanup входит в стандартный flow.
- Production-данные не должны затрагиваться тестовыми функциями.

## Runtime config

```js
window.FEG_APP_CONFIG = {
  supabaseUrl: 'https://PROJECT.supabase.co',
  supabaseAnonKey: '...',
  enableServerTestHarness: true,
  serverTestDryRun: true,
  testWorkspaceSlug: 'feg-test-workspace'
};
```

## Edge Functions

Добавлены заготовки:

- `supabase/functions/backend-health`
- `supabase/functions/test-seed-workspace`
- `supabase/functions/test-write-quote`
- `supabase/functions/test-rls-check`
- `supabase/functions/test-cleanup`

По умолчанию реальная запись не выполняется: используем dry-run.


## v3.12.1 equipmentDryRun step

Server Test Harness теперь включает шаг `equipmentDryRun`, который отправляет staged equipment payload в Edge Function `equipment-sync-dry-run`. Этот шаг защищён `x-feg-test-key`, не выполняет запись и нужен перед первым controlled equipment write.


## v3.12.2 — отдельный equipment dry-run

В Server Test Harness добавлена отдельная кнопка `Только equipment dry-run`. Она вызывает только Edge Function `equipment-sync-dry-run`, не запускает controlled write и не меняет данные.


## v3.12.3 — remote dry-run history / preflight

Добавлен безопасный слой между remote dry-run и первым controlled write:

- локальная история последних remote dry-run reports;
- baseline для сравнения повторных запусков;
- controlled write preflight JSON;
- advisory `promotion_gate` в Edge dry-run response;
- write по-прежнему не выполняется из статической сборки.


## v3.12.4 — payload checksum

Equipment dry-run endpoint теперь возвращает `payload_checksum`, который используется approval package перед controlled write.

## v3.12.5 — controlled write stays outside full test-flow

Server Test Harness по-прежнему выполняет только equipment remote dry-run в стандартном flow. Controlled write runner вынесен в Supabase Backend Pack UI и требует отдельного ручного approval/phrase workflow.


## v3.12.6 — post-write verification stays read-only

Post-write verification использует тот же `equipment-sync-dry-run` endpoint и не входит в автоматический полный test-flow, чтобы случайно не маскировать controlled write.
