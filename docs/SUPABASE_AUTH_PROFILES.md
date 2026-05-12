# FEG Stage PRO v3.10.0 — Supabase Auth & Profiles groundwork

Этот слой готовит реальный backend-auth этап, но не переключает приложение на Supabase принудительно.

## Что добавлено

- `src/modules/SupabaseAuthAdapter.js`
- auth readiness report
- профили в формате будущей таблицы `profiles`
- invite keys в формате будущей таблицы `invite_keys`
- dry-run методы email magic link и OAuth Google/Apple
- snapshot отчёта готовности
- UI-блок в `Backend / Sync`

## Безопасный режим

По умолчанию приложение остаётся в local/demo auth.
Supabase Auth включается только если одновременно заданы:

```js
window.FEG_APP_CONFIG = {
  authMode: 'supabase',
  enableSupabaseAuth: true,
  supabaseUrl: 'https://...supabase.co',
  supabaseAnonKey: '...',
  workspaceId: 'main'
};
```

Если хотя бы один параметр отсутствует, `SupabaseAuthAdapter.getAuthMode()` вернёт `local`.

## Что пока не делаем

- не создаём реальных пользователей в Supabase Auth;
- не пишем профили в backend;
- не валидируем invite keys через Edge Function;
- не включаем OAuth без явного config.

Следующий большой слой: реальная настройка Supabase project + first backend write/auth sandbox.
