# FEG Stage PRO v3.9.4 — Admin Control Center

Цель слоя: собрать локальные инструменты доступа в один рабочий экран администратора до подключения настоящего Supabase Auth.

## Что входит

- единый dashboard-раздел `Админка`;
- `AdminControlCenter` поверх существующего `AdminShell`;
- пользователи / profiles;
- invite-ключи / invite_keys;
- bootstrap первого администратора;
- health-score доступа;
- матрица ролей;
- сводка invite-ключей;
- workspace-сводка;
- export access pack.

## Безопасная модель

- bootstrap key не хранится в клиентском коде;
- Demo Auth остаётся dev/smoke-инструментом;
- production remote backend не включается автоматически;
- все данные пока локальные и готовы к миграции в Supabase-таблицы `profiles` и `invite_keys`.

## Экспорт

`exportAdminControlState()` возвращает JSON с:

- `profiles`;
- `invite_keys`;
- `role_matrix`;
- `invite_summary`;
- `health`.

Этот export pack нужен для проверки и будущего переноса в backend.
