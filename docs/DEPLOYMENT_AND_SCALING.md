# Установка, переносимость и масштабирование

Этот документ фиксирует требования к установке приложения и будущему масштабированию инфраструктуры.

## Главный принцип

Приложение должно спокойно запускаться на обычном VPS для MVP и небольшой команды, но архитектура не должна быть привязана к одному маленькому серверу навсегда.

Базовая модель внедрения — **single-tenant**: для каждой компании разворачивается отдельная закрытая копия приложения со своей базой, файлами, пользователями, настройками и возможностью точечной кастомизации. Подробно это описано в `docs/SINGLE_TENANT_DEPLOYMENT.md`.

Если нагрузка растёт, штат компании увеличивается, появляется больше проектов, складских операций, файлов, фото, документов, чатов и 3D-ассетов — систему нужно уметь перенести на более мощный сервер или разнести по компонентам без переписывания бизнес-логики.

```text
MVP / small team
    one VPS
        ↓
Growing team
    stronger VPS + managed database / backups
        ↓
Large production company
    separated frontend, backend, database, file storage, background jobs
```

## Цели установки

Установка должна быть:

- понятной;
- повторяемой;
- документированной;
- переносимой;
- пригодной для backup/restore;
- не завязанной на конкретный локальный компьютер разработчика;
- готовой к переходу на более мощный сервер.

Нельзя рассчитывать на ручную магию, случайные локальные файлы и неописанные команды.

## Режимы развёртывания

### 1. Local development

Для разработки на локальном компьютере.

Используется для:

- разработки UI;
- проверки логики;
- локального тестирования;
- подготовки PR;
- smoke checks.

Ожидаемые команды:

```bash
npm install
npm run dev
npm run check
npm run build
```

### 2. Single VPS MVP

Один VPS обслуживает приложение на старте.

Подходит для:

- демо;
- внутреннего теста;
- небольшой команды;
- первого production-like запуска.

Минимально разумная конфигурация:

```text
2 vCPU
4 GB RAM
50–80 GB SSD/NVMe
Ubuntu / Debian
Nginx
Node.js runtime
PostgreSQL или внешний Supabase
```

Для фронтенда как static/PWA этого достаточно. Узким местом станет не UI, а база, файлы, фоновые задачи и одновременная работа пользователей.

### 3. Stronger VPS

Один более мощный сервер для растущей команды.

Рекомендуемый уровень:

```text
4 vCPU
8 GB RAM
100–200 GB NVMe
Nginx
Backend API
PostgreSQL
Автоматические бэкапы
Мониторинг
```

Подходит для компании, где уже есть регулярные проекты, несколько менеджеров, складские операции, документы и пользователи.

### 4. Split infrastructure

Разнесённая инфраструктура для крупного техпродакшена.

```text
Frontend / static app
        ↓
Backend API
        ↓
Managed PostgreSQL / Supabase
        ↓
Object Storage for files
        ↓
Background jobs / workers
        ↓
Monitoring and backups
```

Этот режим нужен, когда появляются:

- много пользователей;
- много проектов;
- активные складские резервы;
- фото площадок;
- PDF-документы;
- 3D-модели;
- чаты и push-уведомления;
- высокая важность отказоустойчивости;
- требования к регулярным бэкапам и восстановлению.

## Что должно быть отделяемым

Система должна быть спроектирована так, чтобы при росте нагрузки можно было отдельно масштабировать:

- frontend/static files;
- backend API;
- PostgreSQL database;
- file/object storage;
- PDF/export jobs;
- notification/push jobs;
- calendar sync jobs;
- 3D asset storage;
- background workers;
- backups.

## Конфигурация через environment

Все настройки окружения должны задаваться через environment variables или `.env` файлы, которые не коммитятся в репозиторий.

Примеры настроек:

```text
APP_ENV
APP_BASE_URL
API_BASE_URL
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OBJECT_STORAGE_URL
SMTP_HOST
PUSH_PUBLIC_KEY
PUSH_PRIVATE_KEY
```

В репозитории должен быть только безопасный пример:

```text
.env.example
```

Реальные ключи, пароли, токены, service role keys и private keys нельзя хранить в Git.

## Структура server deployment

Для production-like установки должна быть понятная структура:

```text
/app
    current/          текущая версия приложения
    releases/         предыдущие релизы
    shared/           общие файлы, env, uploads если локально
    logs/             логи
    backups/          локальные backup snapshots, если применимо
```

Или аналогичная структура, если используется Docker.

## Docker-ready направление

Желательно подготовить проект к Docker-развёртыванию.

Минимальная цель:

```text
frontend container
backend/api container
postgres container for local/staging only
nginx/reverse proxy
```

Для production database предпочтительно использовать отдельный managed PostgreSQL или Supabase, а не держать всё навсегда внутри одного Docker Compose на маленьком VPS.

## Backup/restore как обязательная часть

Установка считается неполной, если нет понятного backup/restore процесса.

Нужно предусмотреть:

- backup PostgreSQL;
- backup uploaded files;
- backup generated documents, если они хранятся;
- backup environment/config, без раскрытия секретов;
- restore procedure на другой сервер;
- проверку восстановления.

Минимальное правило:

```text
Если систему нельзя восстановить на новом сервере по инструкции — установка не готова к production.
```

## Перенос на новый сервер

Переезд должен быть документирован как повторяемый процесс:

1. Подготовить новый VPS.
2. Установить system dependencies.
3. Развернуть код нужной версии.
4. Перенести `.env` / secrets безопасным способом.
5. Восстановить базу из backup или подключить managed database.
6. Перенести файлы / object storage или подключить внешний storage.
7. Запустить migrations.
8. Запустить health checks.
9. Проверить вход, проект, смету, склад, документы.
10. Переключить домен / DNS.
11. Проверить logs and monitoring.
12. Оставить старый сервер как rollback window до финального отключения.

## Health checks

Нужны простые проверки, которые показывают, что система жива:

- frontend доступен;
- backend API отвечает;
- database connection работает;
- migrations актуальны;
- storage доступен;
- auth работает;
- PDF/export не падает;
- background jobs живы, если они есть.

## Monitoring and logs

Даже для MVP нужны базовые логи.

Минимально:

- access/error logs Nginx;
- backend logs;
- database backup logs;
- failed jobs logs;
- error tracking для frontend, если возможно;
- место на диске;
- RAM/CPU;
- uptime.

## Файлы и 3D-ассеты

Файлы, фото площадок, PDF, вложения и 3D-модели не должны навсегда зависеть от локального диска маленького VPS.

Для MVP можно хранить локально, но архитектура должна поддерживать переход на object storage.

```text
MVP: local uploads
Growth: S3-compatible object storage
Large: object storage + CDN/cache where needed
```

3D-конструктор в основном нагружает браузер пользователя. Сервер должен отдавать модели, текстуры, метаданные и сохранять проектные данные. Тяжёлую серверную генерацию рендеров/PDF нужно выносить в отдельные jobs.

## Database scaling

Для маленькой команды можно начать с PostgreSQL на VPS или Supabase.

При росте лучше отделить базу:

```text
App VPS
    ↓
Managed PostgreSQL / Supabase
```

Причины:

- проще бэкапы;
- выше надёжность;
- легче масштабировать app server;
- меньше риск потерять данные при проблеме VPS;
- проще переносить frontend/backend.

## Что нельзя делать

Запрещается проектировать систему так, будто навсегда всё будет жить на одном маленьком сервере:

- frontend;
- backend;
- database;
- files;
- 3D assets;
- PDF generation;
- chat;
- push;
- backups.

Также нельзя:

- хранить secrets в репозитории;
- делать установку, которая работает только на одном компьютере разработчика;
- держать backup только на том же диске, что и production data;
- делать ручные неописанные миграции;
- смешивать test/demo data с production;
- запускать опасные backend writes без controlled flow.

## Документация установки

Перед production-like запуском нужно иметь отдельные инструкции:

- `docs/INSTALL_LOCAL.md` — локальная разработка;
- `docs/INSTALL_VPS.md` — установка на один VPS;
- `docs/ENVIRONMENT.md` — env variables and secrets;
- `docs/BACKUP_RESTORE.md` — backup and restore;
- `docs/MIGRATION_SERVER.md` — перенос на другой сервер;
- `docs/HEALTH_CHECKS.md` — проверки после установки.

Эти документы можно добавлять по мере технической реализации.

## Итоговый принцип

Проект должен стартовать просто, но не быть архитектурно заперт на маленьком VPS.

```text
Сегодня: один VPS для MVP.
Завтра: более мощный сервер.
Потом: разнесённые frontend, backend, database, storage and jobs.
```

Это требование должно учитываться при v5 migration, backend design, file storage, 3D assets, PDF export, chats, notifications and warehouse operations.
