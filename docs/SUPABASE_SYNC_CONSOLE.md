# FEG Stage PRO v3.9.2 — Supabase Connection & Sync Console

Этот слой добавляет безопасную консоль подготовки backend-синхронизации.

## Что делает

- Проверяет runtime config: `backendMode`, `enableRemoteSync`, `supabaseUrl`, `supabaseAnonKey`, `workspaceId`.
- Проверяет наличие Supabase SDK.
- Собирает `backend_sync_payload` через `BackendSyncAdapter`.
- Выполняет validation payload без записи на сервер.
- Показывает dry-run операции по будущим таблицам Supabase.
- Позволяет скачать readiness report и payload JSON.
- Позволяет сохранить local snapshot для отладки.

## Чего не делает

- Не пишет данные в Supabase.
- Не меняет остатки склада.
- Не включает remote sync по умолчанию.
- Не хранит bootstrap/admin secrets в клиентском коде.

## Safe mode

Даже если Supabase SDK загружен, режим остаётся `local`, пока явно не задано:

```js
window.FEG_APP_CONFIG = {
  backendMode: 'supabase',
  enableRemoteSync: true,
  supabaseUrl: 'https://PROJECT.supabase.co',
  supabaseAnonKey: '...',
  workspaceId: 'main',
  dryRun: true
};
```

`dryRun: true` должен оставаться включённым до проверки RLS, миграций и тестового workspace.
