# Central Registry and company routing

Этот документ фиксирует роль центральной базы компаний для распространения приложения, проверки лицензий и маршрутизации пользователей.

## Главный принцип

Несмотря на single-tenant модель рабочих данных, нужна небольшая центральная registry/licensing база.

Она нужна только для:

- распространения приложения;
- проверки лицензий;
- активации установок;
- маршрутизации пользователей в нужную company installation;
- хранения адресов установок;
- управления каналами обновлений.

Она не должна хранить рабочие данные компаний.

## Что хранит Central Registry

Central Registry может хранить:

- `companyId`;
- публичное название компании или короткий company code;
- `installationId`;
- адрес установки / `installationUrl`;
- разрешённые домены;
- статус лицензии;
- срок действия лицензии;
- enabled modules / feature flags;
- версию приложения;
- activation status;
- support plan;
- update channel;
- технические данные маршрутизации.

## Что Central Registry НЕ хранит

Central Registry не должна хранить:

- проекты компании;
- сметы;
- клиентов;
- складские остатки;
- документы;
- файлы;
- фото площадок;
- финансовые данные;
- маржу;
- внутренние задачи;
- чаты;
- ресурсную базу компании;
- персональные рабочие данные сотрудников, кроме минимально нужного для маршрутизации/активации.

Все эти данные хранятся только внутри отдельной company installation на сервере компании или выделенной инфраструктуре под неё.

## Архитектура маршрутизации

```text
PC / Mobile / PWA
        ↓
companyId / company code / QR / invite link
        ↓
Central Registry
        ↓
installationUrl + license status
        ↓
Company Installation
        ↓
company database / files / users / projects / warehouse
```

## Вход с ПК

Пользователь может открыть общий вход:

```text
app.packit.example
```

Дальше он вводит:

- ID компании;
- короткий код компании;
- домен компании;
- invite code.

Central Registry находит нужную установку и перенаправляет пользователя на company installation.

После маршрутизации логин происходит уже внутри конкретной инсталляции компании.

## Вход с мобильного / PWA

Мобильное приложение или PWA должны работать так же:

```text
Открыть приложение
    ↓
Указать ID компании или сканировать QR
    ↓
Получить installationUrl из Central Registry
    ↓
Подключиться к company installation
    ↓
Сохранить companyId / installationId / baseUrl локально
```

После первого подключения приложение может помнить последнюю компанию, но кэш и offline queue должны быть привязаны к `companyId`, `installationId`, `userId` и `baseUrl`.

## QR и invite routing

QR-код или invite link может содержать:

- company code или companyId;
- installation routing hint;
- invite token;
- environment, если нужно.

QR/invite не должен раскрывать секреты или давать доступ без проверки внутри company installation.

Central Registry только направляет пользователя. Права доступа проверяются уже в company backend.

## License check

Central Registry может отвечать:

- активна ли лицензия;
- разрешена ли инсталляция;
- не отозвана ли установка;
- какие модули доступны;
- доступен ли канал обновлений;
- разрешён ли перенос/реактивация.

Но рабочие операции компании не должны зависеть от постоянного онлайн-доступа к Central Registry. Для этого используется signed license token and grace period.

## Адреса установок

Central Registry хранит адреса установок:

```text
companyId
installationId
installationUrl
allowedDomains
environment
status
```

Если компания переезжает на новый VPS, registry обновляет installation routing после controlled migration/reactivation.

## Безопасность

Central Registry должна быть максимально маленькой по данным.

Это снижает риск: даже если registry недоступна или ограничена, рабочие данные компаний остаются в их отдельных инсталляциях.

Нужно защищать:

- license records;
- routing records;
- installation activation;
- update channel;
- admin access to registry.

## Offline behavior

Если Central Registry временно недоступна:

- уже подключённая company installation продолжает работать по своему license token/grace period;
- пользователи с сохранённым baseUrl могут открывать свою company installation напрямую;
- новые подключения по companyId/QR могут быть недоступны до восстановления registry.

## Не превращать registry в SaaS-монолит

Central Registry не должна со временем незаметно стать общей рабочей базой всех компаний.

Запрещено переносить туда:

- project data;
- warehouse data;
- client data;
- company financial data;
- documents;
- chat messages;
- resource database;
- internal tasks.

Если нужно собрать аналитику или telemetry, это должно быть отдельным осознанным решением с согласованием, минимизацией данных и безопасностью.

## Итоговый закон

Central Registry существует только для распространения приложения, проверки лицензий, активации установок и маршрутизации пользователей в нужную company installation. Она хранит `companyId`, `installationId`, адрес установки, статус лицензии, разрешённые домены, модули и служебную информацию. Все внутренние базы компаний, проекты, склад, клиенты, документы, файлы, финансы и рабочие процессы хранятся только на серверах конкретной компании или в выделенной инфраструктуре этой компании с отдельной защитой.
