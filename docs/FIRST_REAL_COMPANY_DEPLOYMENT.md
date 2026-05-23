# First real company deployment

Этот документ фиксирует стратегию первого реального запуска Pack.it на VPS и параллельной подготовки продукта к распространению другим компаниям.

## Главный принцип

Текущий VPS используется не как временный тестовый стенд, а как первая реальная single-tenant installation для настоящей компании.

Эта установка должна:

- обслуживать реальную компанию;
- продолжать работать после этапа разработки;
- хранить реальные проекты, склад, документы и пользователей компании;
- постепенно обновляться по мере развития Pack.it;
- стать первым production-like внедрением продукта.

Одновременно этот же код и архитектура должны готовиться к тиражированию как дистрибутив для других компаний.

```text
First real company installation
        ↓
работает на текущем VPS
        ↓
проверяет продукт в реальной эксплуатации
        ↓
формирует требования к дистрибутиву
        ↓
становится основой для продажи другим организациям
```

## Двойная цель текущего VPS

### 1. Реальная рабочая установка

VPS является рабочей средой для первой компании.

На нём должны появиться:

- company installation;
- company database;
- company files;
- users;
- roles;
- resource database;
- warehouse;
- projects;
- documents;
- backups;
- logs;
- license/installation activation.

### 2. Проверка будущего дистрибутива

Параллельно эта установка должна проверять:

- процесс установки;
- структуру env;
- миграции;
- обновления;
- backup/restore;
- переносимость;
- company config;
- licensing;
- central registry routing;
- PWA behavior;
- offline flows;
- document templates;
- warehouse workflow.

То есть каждая техническая доработка должна учитывать не только эту компанию, но и будущие установки для других компаний.

## Не считать текущую установку disposable

Нельзя относиться к этому VPS как к стенду, который можно сломать и пересоздать без последствий.

После начала реальной эксплуатации:

- реальные данные нельзя терять;
- миграции должны быть контролируемыми;
- обновления должны иметь backup plan;
- тестовые данные должны быть отделены от production data;
- dangerous operations должны иметь rollback thinking;
- изменения схемы должны сопровождаться migration path.

## Среды

Даже на одном VPS нужно логически разделить среды.

Рекомендуемая структура:

```text
/packit
    /registry
        central registry dev/production-like service if used

    /companies
        /company-main
            current
            releases
            shared
            uploads
            logs
            backups

    /backups
        registry
        company-main

    /logs
        nginx
        backend
        jobs
```

Если используется Docker, аналогичная структура должна быть выражена через compose services, volumes and env files.

## First company installation

Первая компания должна получить собственные идентификаторы:

- `companyId`;
- `installationId`;
- company code;
- installation URL / domain;
- license token;
- enabled modules;
- company config.

Эти данные не должны быть захардкожены в коде.

## Данные первой компании

Данные первой компании являются production-like данными.

К ним относятся:

- проекты;
- клиенты;
- склад;
- ресурсная база;
- документы;
- шаблоны;
- пользователи;
- роли;
- задачи;
- файлы;
- фото;
- audit log.

Эти данные нужно защищать и регулярно бэкапить.

## Разделение production-like и dev/test

Нужно избегать смешивания:

```text
реальные данные компании
        и
тестовые/demo данные разработки
```

Для тестов лучше использовать:

- отдельную dev company;
- отдельный test project namespace;
- отдельную тестовую базу;
- feature flags;
- seeded test data только в dev/staging режиме.

Demo/test data не должны попадать в рабочую базу первой компании.

## Обновления

Так как первая установка будет жить дальше, обновления должны быть контролируемыми.

Перед обновлением:

1. Сделать backup базы.
2. Сделать backup файлов/config.
3. Проверить changelog.
4. Проверить migrations.
5. Развернуть новую версию в release folder или container tag.
6. Прогнать health checks.
7. Проверить вход, проект, смету, склад, документы.
8. Оставить rollback window.

## Дистрибутив для других компаний

Параллельно нужно готовить Pack.it как тиражируемый продукт.

Дистрибутив должен включать:

- install docs;
- env example;
- migration scripts;
- backup/restore instructions;
- health checks;
- first admin setup;
- company config setup;
- license activation;
- update process;
- optional Docker deployment;
- safe demo seed data for non-production.

## Что должно стать reusable

То, что делается для первой компании, должно по возможности становиться reusable:

- installation scripts;
- deployment structure;
- company config model;
- document template system;
- resource category schemas;
- backup scripts;
- health checks;
- migration process;
- license activation flow;
- central registry routing;
- update process.

Нельзя делать первую установку набором ручных уникальных действий, которые невозможно повторить для другой компании.

## Company-specific customization

Для первой компании допустимы точечные настройки:

- branding;
- документы;
- категории;
- роли;
- складские правила;
- шаблоны;
- интеграции.

Но эти настройки должны жить в company config or extensions, а не в хаотичных правках core-кода.

Если кастомизация полезна другим компаниям, её нужно возвращать в core как feature/config option.

## Лицензия первой установки

Первая установка должна также проходить через лицензионную модель:

```text
companyId
installationId
license token
enabled modules
validity/support plan
```

Даже если это собственная/первая компания, она должна проверять тот же путь, который позже будет использоваться для внешних клиентов.

## Central Registry

Central Registry для первой установки используется только для:

- маршрутизации по companyId/company code;
- хранения installationUrl;
- license status;
- activation status;
- update channel.

Она не хранит рабочие данные первой компании.

## Продажа сторонним организациям

При подготовке продукта к продаже нужно обеспечить:

- повторяемую установку;
- изоляцию данных;
- лицензию и активацию;
- настройку компании;
- переносимость;
- backup/restore;
- обновления;
- документацию администратора;
- поддержку разных тарифов/модулей;
- возможность managed single-tenant install.

## Итоговый закон

Текущий VPS является первой реальной company installation, а не временным disposable стендом. Эта установка должна работать для реальной компании и продолжать жить после разработки. При этом все решения, сделанные для неё, должны по возможности формироваться как часть тиражируемого Pack.it-дистрибутива для других организаций: с установкой, лицензией, company config, backup/restore, обновлениями, central routing and controlled migrations.
