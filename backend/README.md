# PACK.IT company-main backend API

Минимальный backend-слой для перехода от localStorage/demo/fallback к PostgreSQL.

## Что уже есть

- `db/postgres/001_packit_core_schema.sql` — базовая схема.
- `db/postgres/002_packit_seed_core.sql` — стартовые роли, workspace, категории, оборудование и остатки.
- `backend/src/server.mjs` — read-only API поверх PostgreSQL.

## Переменные окружения

Секреты не хранятся в репозитории. На VPS они должны лежать в env-файле сервиса.

```bash
PACKIT_API_PORT=8090
PACKIT_DB_HOST=127.0.0.1
PACKIT_DB_PORT=5432
PACKIT_DB_NAME=packit_company_main
PACKIT_DB_USER=packit_app
PACKIT_DB_PASSWORD=<secret>
# или одной строкой:
PACKIT_DATABASE_URL=postgresql://packit_app:<secret>@127.0.0.1:5432/packit_company_main
```

## Первый ручной bootstrap на VPS

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib nodejs npm
sudo systemctl enable --now postgresql

sudo -u postgres psql
```

В psql:

```sql
create role packit_app login password '<secret>';
create database packit_company_main owner packit_app;
\q
```

Дальше из текущего релиза приложения:

```bash
cd /opt/packit/apps/company-main/current
sudo -u postgres psql -d packit_company_main -f db/postgres/001_packit_core_schema.sql
sudo -u postgres psql -d packit_company_main -f db/postgres/002_packit_seed_core.sql
sudo -u postgres psql -d packit_company_main -c "grant usage on schema public to packit_app; grant select, insert, update, delete on all tables in schema public to packit_app; grant usage, select on all sequences in schema public to packit_app;"
```

## Локальный запуск API на VPS

```bash
cd /opt/packit/apps/company-main/current/backend
npm install --omit=dev
PACKIT_API_PORT=8090 PACKIT_DB_PASSWORD='<secret>' npm start
```

Проверка:

```bash
curl http://127.0.0.1:8090/health
curl http://127.0.0.1:8090/api/equipment
curl http://127.0.0.1:8090/api/stock/balances
```

## Цель следующего шага

После проверки API подключаем фронт не напрямую к PostgreSQL, а через backend endpoint:

```text
PWA → /api/equipment → backend → PostgreSQL
```

Runtime/fallback-мосты после этого удаляются.
