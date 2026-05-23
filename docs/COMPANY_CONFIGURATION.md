# Company configuration

Этот документ фиксирует слой настроек конкретной компании внутри single-tenant установки.

## Главный принцип

Pack.it имеет общее ядро, но каждая компания должна иметь возможность настроить приложение под свои процессы, документы, бренд, роли, склад и интеграции без хаотичных правок core-кода.

```text
Core application
    общее ядро Pack.it

Company config
    настройки конкретной компании

Company data
    проекты, склад, база ресурсов, документы и файлы компании
```

Всё, что можно решить настройкой, должно решаться настройкой, а не отдельной правкой кода под каждую компанию.

## Что входит в company config

Company config может включать:

- branding;
- document templates;
- resource categories;
- role presets;
- permissions presets;
- warehouse settings;
- financial settings;
- enabled modules / feature flags;
- integrations;
- localization;
- notification defaults;
- offline settings;
- limits from license;
- custom dictionaries;
- document numbering rules.

## Branding

Компания может настраивать:

- название компании;
- юридическое название;
- логотип;
- фирменные цвета документов;
- адрес;
- телефон;
- email;
- сайт;
- реквизиты;
- подписи;
- печати/штампы, если нужны;
- контактные блоки;
- футер документов.

Эти настройки влияют на КП, PDF, счета, акты и другие внешние документы.

## Document templates

Компания должна иметь возможность подгружать собственные шаблоны документов.

Поддерживаемые типы шаблонов:

- коммерческое предложение;
- счёт;
- акт выполненных работ;
- акт выдачи;
- акт возврата;
- договорное приложение;
- внутренний технический лист;
- складской лист;
- фотоотчёт;
- маршрутный лист;
- custom company document.

## Custom document templates

Компания может загрузить свой шаблон, а Pack.it должен встроить в него данные проекта.

Пример потока:

```text
Компания загружает шаблон КП / счёта / акта
        ↓
админ или менеджер размечает переменные
        ↓
Pack.it проверяет шаблон
        ↓
шаблон становится доступен для генерации документов
        ↓
проектные данные подставляются в нужные поля
        ↓
создаётся versioned document snapshot
```

## Template variables

Шаблоны должны поддерживать безопасные переменные.

Примеры:

```text
{{company.name}}
{{company.logo}}
{{company.legalName}}
{{company.address}}
{{company.bankDetails}}

{{project.title}}
{{project.date}}
{{project.venue}}
{{project.manager.name}}

{{client.name}}
{{client.contact}}

{{quote.total}}
{{quote.discount}}
{{quote.vat}}
{{quote.validUntil}}

{{sections.table}}
{{equipment.table}}
{{services.table}}
{{transport.table}}
{{subrent.table}}

{{payment.terms}}
{{document.number}}
{{document.date}}
{{packit.attribution}}
```

Переменные должны быть whitelist-based. Нельзя позволять шаблону выполнять произвольный код.

## Template blocks

Для сложных документов нужны повторяющиеся блоки:

- строки сметы;
- разделы проекта;
- оборудование;
- услуги;
- складские позиции;
- субаренда;
- транспорт;
- команда;
- итоги;
- условия;
- подписи.

Пример:

```text
{{#quote.rows}}
  {{name}} {{quantity}} {{unit}} {{price}} {{total}}
{{/quote.rows}}
```

Template engine должен быть безопасным и ограниченным.

## Template validation

Перед использованием шаблон должен проходить проверку:

- все обязательные переменные распознаны;
- нет запрещённых переменных;
- нет исполняемого кода;
- нет внешних небезопасных ссылок;
- таблицы корректно размечены;
- документ можно сгенерировать на тестовом проекте;
- PDF/export не ломается.

Если шаблон содержит ошибки, он не должен становиться production-шаблоном.

## Template preview

Нужен preview:

- предпросмотр на тестовом проекте;
- предпросмотр на реальном проекте без сохранения;
- список использованных переменных;
- warnings по пустым полям;
- проверка, что клиент не увидит внутренние данные.

## Template versioning

Шаблоны должны быть версионными.

Поля:

- `templateId`;
- `companyId`;
- `type`;
- `version`;
- `status`;
- `createdBy`;
- `createdAt`;
- `approvedBy`;
- `approvedAt`;
- `fileUrl`;
- `variables`;
- `previewSnapshot`;
- `notes`.

Статусы:

- draft;
- testing;
- active;
- archived;
- rejected.

Если документ уже был сформирован по старой версии шаблона, он не должен измениться при обновлении шаблона.

## Who can manage templates

Управлять шаблонами могут только пользователи с правами:

- администратор компании;
- директор;
- PR/маркетинг;
- пользователь с `canManageDocumentTemplates`;
- менеджер, если ему разрешены проектные/личные шаблоны.

Обычный пользователь не должен менять общие шаблоны компании.

## Template scope

Шаблоны могут иметь scope:

- company-wide — общий шаблон компании;
- department/category — шаблон для направления;
- project-specific — разовый шаблон проекта;
- user-specific — персональный шаблон менеджера, если разрешено;
- license/default — стандартный шаблон Pack.it.

## Pack.it attribution

Шаблоны должны поддерживать переменную:

```text
{{packit.attribution}}
```

Например:

```text
Сформировано в программе Pack.it
```

Показ attribution управляется лицензией и company config.

Если лицензия требует attribution, шаблон не должен обходить это правило ручным удалением.

## Document data safety

Шаблон должен получать только разрешённые данные.

Клиентский документ не должен случайно получить:

- внутреннюю себестоимость;
- маржу;
- складские внутренние комментарии;
- персональные данные сотрудников без необходимости;
- закрытые supplier/subrent costs;
- audit/system fields.

Для каждого типа документа должен быть document data context.

Пример:

```text
Client quote context
    client-safe quote data only

Warehouse list context
    warehouse rows and pick data

Internal tech sheet context
    technical data and risk notes
```

## Supported template formats

На старте можно поддержать безопасные форматы постепенно.

Возможные форматы:

- built-in HTML template;
- editable HTML template;
- DOCX template;
- XLSX template for tables/invoices;
- PDF generation from HTML;
- JSON template config.

Важно: поддержка DOCX/XLSX требует отдельной реализации и проверки, чтобы шаблоны не выполняли опасные макросы.

Макросы офисных документов не должны исполняться.

## Modules and feature flags

Company config управляет включением модулей:

- сметчик;
- склад;
- Resource Database;
- документы/PDF;
- offline warehouse queue;
- 3D-конструктор;
- чаты;
- push;
- интеграции;
- аналитика.

Это должно быть через feature flags, а не через удаление кода.

## Resource categories

Компания может настраивать:

- включённые категории;
- category-specific technicalSpecs;
- порядок категорий;
- видимость категорий;
- иконки/цвета категорий;
- правила качества данных;
- custom fields.

Базовая модель ResourceCategory остаётся общей.

## Roles and permissions

Компания может настраивать preset roles:

- менеджер;
- техдир;
- склад;
- звук;
- свет;
- LED;
- водитель;
- директор;
- приглашённый специалист.

И permissions presets:

- может видеть цены;
- может видеть маржу;
- может редактировать склад;
- может подтверждать проект;
- может управлять пользователями;
- может менять branding;
- может управлять шаблонами документов.

Настройки ролей не должны ломать общую access model.

## Warehouse settings

Компания может настраивать:

- склады / зоны хранения;
- статусы сборки;
- правила выдачи;
- правила возврата;
- правила повреждений;
- нужна ли подпись при выдаче;
- нужны ли фото при повреждении;
- можно ли offline issue/return;
- правила недостач;
- правила замен.

Базовый workflow остаётся:

```text
need → availability → reservation → pick → issue → return → closeout
```

## Financial settings

Настраивается:

- валюта;
- НДС / без НДС;
- скидки;
- минимальная маржа;
- правила округления;
- срок действия КП;
- прайс-листы;
- внутренние цены;
- клиентские цены;
- правила субаренды;
- нумерация счетов и КП.

Финансовые настройки доступны только ролям с соответствующими правами.

## Integrations

Настраиваются:

- email / SMTP;
- push;
- calendar;
- object storage;
- SMS;
- messenger adapters later;
- accounting/1C later.

Секреты интеграций не должны храниться в Git или frontend.

## Localization

Даже если стартовый язык русский, нужно заложить:

- язык интерфейса;
- язык документов;
- формат даты;
- часовой пояс;
- валюта;
- формат номера телефона;
- единицы измерения.

## Config versioning and audit

Company config должен быть версионным.

Важные изменения должны попадать в audit log:

- логотип;
- шаблон документа;
- банковские реквизиты;
- финансовые правила;
- роли и права;
- категории ресурсов;
- включение/отключение модулей;
- интеграции;
- offline settings.

Нужно знать, кто и когда изменил настройки.

## Что нельзя менять через company config

Company config не должен менять:

- core Project / Section / Resource model;
- protected calculations;
- BOM-core;
- security model;
- license checks;
- audit log;
- backend controlled writes;
- критические protected flows.

Если компании нужна особая логика, это должно быть feature flag, custom extension или отдельная контролируемая разработка.

## Итоговый закон

Company config — это слой настроек конкретной компании внутри single-tenant установки. Через него настраиваются бренд, документы, пользовательские шаблоны КП/счетов/актов, категории, роли, права, складские процессы, финансы, интеграции, язык, часовой пояс, модули и лимиты. Собственные шаблоны документов должны поддерживать безопасные переменные, preview, validation, versioning and audit. Company config не должен менять ядро приложения, protected calculations, security, audit и backend controlled flows.
