# FEG Stage PRO v3.8.31 — Import / Restore Center

Назначение: безопасно восстанавливать локальные v4-проекты из JSON-выгрузок без подключения Supabase.

Поддерживаемые форматы:

- `feg-stage-pro-project-export-pack` из кнопки Export pack JSON;
- `feg-stage-pro-backend-sync-payload` из backend sync adapter;
- локальный project record с полем `quote`;
- raw quote JSON.

Что делает восстановление:

1. Нормализует quote через `QuoteModel.createQuoteDraft()`.
2. Сохраняет проект в локальную историю через `QuoteProjectStorage.saveProject()`.
3. Делает восстановленный quote активным черновиком.
4. Импортирует поставщиков из export pack в `SupplierDirectory`.
5. Пишет локальную историю импортов в `fegV4ImportRestoreHistory`.

Ограничения:

- реальный Supabase restore не выполняется;
- `.json` импорт работает только в браузере через FileReader;
- audit-only export можно проверить, но проект из него не восстанавливается.
