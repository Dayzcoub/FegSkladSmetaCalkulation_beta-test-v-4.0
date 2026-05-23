# First VPS implementation plan

Этот документ фиксирует первый практический план внедрения Pack.it на VPS для первой реальной компании.

## Главный принцип

VPS используется как первая реальная company installation, а не как disposable dev-сервер.

При этом установка должна стать повторяемым шаблоном для будущих внедрений другим компаниям.

```text
Первый VPS
    реальная компания
    production-like данные
    controlled updates
    backup/restore
    reusable install pattern
```

## Цели первого внедрения

1. Развернуть Pack.it в реальном server окружении.
2. Подготовить первую company installation.
3. Разделить real company data and dev/demo data.
4. Подготовить структуру папок, env, logs and backups.
5. Проверить PWA/static frontend.
6. Подготовить будущий backend/database path.
7. Зафиксировать installationId/companyId/license placeholders.
8. Сделать установку повторяемой для будущих клиентов.

## Что пока не делаем

На первом этапе не нужно сразу строить всё:

- полноценный central registry production service;
- финальный license server;
- полноценный backend v5;
- 3D-конструктор;
- чаты;
- push production infrastructure;
- сложный multi-server deployment.

Но структура должна быть готова к этим слоям.

## Рекомендуемая структура VPS

Базовая структура:

```text
/opt/packit
    /apps
        /company-main
            /current
            /releases
            /shared
                /env
                /uploads
                /config
                /storage
            /logs
            /backups

        /registry
            /current
            /releases
            /shared
                /env
            /logs
            /backups

    /backups
        /company-main
        /registry
        /manual

    /scripts
        deploy
        backup
        restore
        health

    /docs
        install-notes
```

Если используется Docker, эта структура может быть выражена через volumes, compose files and env files.

## Company installation

Для первой компании нужно зафиксировать:

- `companyId`;
- `companyCode`;
- `installationId`;
- `installationUrl`;
- environment: `production-like` или `first-company-production`;
- enabled modules;
- initial admin user;
- company config;
- backup policy.

Эти значения не должны быть разбросаны по коду. Они должны жить в env/config/backend setup.

## Домен и маршрутизация

Возможные варианты:

### Вариант A — прямой домен первой компании

```text
app.company-domain.ru
```

Пользователь сразу попадает в installation первой компании.

### Вариант B — Pack.it subdomain

```text
company-code.packit.app
```

Подходит для managed installation.

### Вариант C — временный технический домен

```text
vps-ip-or-temp-domain
```

Допустимо только для раннего этапа. Перед реальной эксплуатацией лучше перейти на нормальный домен и HTTPS.

## HTTPS

Перед реальной эксплуатацией должен быть HTTPS.

Минимально:

- Nginx reverse proxy;
- Let's Encrypt certificate;
- redirect HTTP → HTTPS;
- security headers без фанатизма на первом этапе;
- проверка PWA service worker under HTTPS.

## Environment files

Все секреты и настройки должны быть вне Git.

Пример:

```text
/opt/packit/apps/company-main/shared/env/.env
/opt/packit/apps/registry/shared/env/.env
```

В репозитории может быть только безопасный `.env.example`.

Нельзя хранить в Git:

- DB password;
- service keys;
- SMTP password;
- license signing secrets;
- push private keys;
- object storage secrets.

## Database plan

Для первого этапа возможны варианты.

### Вариант A — PostgreSQL на VPS

Подходит для старта и контролируемого MVP.

Требования:

- отдельная база для первой компании;
- отдельная база для registry, если registry разворачивается;
- регулярный backup;
- отдельный пользователь БД;
- запрет test/demo seed в real database.

### Вариант B — managed PostgreSQL / Supabase

Лучше для надёжности и backup, но требует отдельной настройки.

Подходит, если сразу хотим меньше риска потери данных.

## Files and uploads

На первом этапе можно хранить файлы локально:

```text
/opt/packit/apps/company-main/shared/uploads
```

Но архитектура должна учитывать будущий переход на object storage.

Категории файлов:

- company logos;
- document templates;
- generated PDFs;
- project attachments;
- site photos;
- damage photos;
- 3D assets, если используются.

## Backups

Backup обязателен с первого дня реальных данных.

Минимальный backup:

- PostgreSQL dump;
- uploads/templates/files archive;
- company config;
- env inventory without exposing secrets;
- current release version;
- backup log.

Рекомендуемый режим:

```text
Daily DB backup
Weekly full files backup
Manual backup before every deployment
Restore test periodically
```

Backup не должен храниться только в том же месте, что и production data. Хотя бы периодически нужно копировать его вне VPS.

## Release structure

Обновления должны идти через releases, а не через хаотичную замену файлов.

```text
releases/2026-05-23_001
releases/2026-05-23_002
current -> releases/2026-05-23_002
shared -> persistent files/env/uploads
```

Это позволит откатиться на предыдущую версию, если новая сломалась.

## Deployment flow

Перед каждым обновлением:

1. Проверить git branch/tag.
2. Собрать production build.
3. Сделать backup базы.
4. Сделать backup shared config/files if needed.
5. Создать новый release folder.
6. Скопировать build.
7. Обновить symlink `current`.
8. Перезапустить сервисы, если есть backend.
9. Проверить health checks.
10. Проверить login/project/quote/documents/warehouse smoke.
11. Оставить rollback window.

## Health checks

Минимальные проверки после деплоя:

- frontend открывается;
- PWA manifest доступен;
- service worker не отдаёт старый критичный cache;
- login screen открывается;
- company config загружается;
- проект создаётся/открывается в допустимом тестовом режиме;
- PDF/export не падает, если доступен;
- backend/API отвечает, если уже есть;
- database connection работает, если уже есть;
- uploads path доступен;
- logs пишутся.

## Real data vs demo data

Нельзя смешивать реальные данные первой компании и demo/test seed.

Правила:

- demo data только в dev/test installation;
- test project в real company database допускается только с явной пометкой `TEST` и правами админа;
- TestFixtures не должны грузиться в production entry;
- seeded fake clients/resources не должны попадать в real company database;
- cleanup scripts должны быть осторожными и не удалять реальные данные.

## First admin setup

При первой установке нужно создать первого администратора компании.

Он должен иметь права:

- manage company config;
- manage users;
- manage resource database;
- manage warehouse;
- manage document templates;
- view audit log;
- manage roles/permissions;
- run backup/export actions, если доступно.

Первый админ не должен быть захардкожен в frontend.

## Installation records

Для первой установки нужно сохранить installation record:

```text
companyId
companyCode
installationId
installationUrl
licenseId
licenseStatus
enabledModules
createdAt
activatedAt
appVersion
supportPlan
```

Если central registry ещё не реализован, можно начать с local installation record file/backend table, но формат должен быть совместим с будущим registry.

## Security baseline

Минимально:

- SSH key login;
- отключить password login, если возможно;
- firewall only needed ports;
- HTTPS;
- secrets outside Git;
- DB not publicly open;
- backups protected;
- logs without secrets;
- admin accounts protected;
- regular updates.

## Monitoring baseline

Минимально отслеживать:

- uptime;
- disk usage;
- memory;
- CPU;
- nginx errors;
- backend errors;
- backup success/failure;
- certificate expiration;
- database size;
- uploads size.

## Migration toward distributable product

Каждый ручной шаг установки должен либо попасть в документ, либо превратиться в скрипт.

Reusable artifacts:

- install checklist;
- env example;
- nginx config example;
- backup script;
- restore script;
- health check script;
- release/deploy script;
- first admin setup instructions;
- company config template;
- license activation placeholder.

## Итоговый закон

Первый VPS должен быть оформлен как первая реальная Pack.it company installation. Он должен хранить реальные данные аккуратно, обновляться контролируемо, иметь backup/restore, health checks, env separation and release structure. Одновременно каждый шаг установки должен формироваться как повторяемый шаблон для будущего Pack.it-дистрибутива, который можно будет продавать и разворачивать для сторонних организаций.
