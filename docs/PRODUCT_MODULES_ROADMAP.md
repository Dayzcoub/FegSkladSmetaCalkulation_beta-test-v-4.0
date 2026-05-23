# Product modules roadmap

Этот документ фиксирует порядок развития Pack.it, чтобы разработка не расползалась и не уходила в сложные модули раньше, чем готово ядро.

## Главный принцип

Pack.it должен развиваться от ядра проект-сметы к расширениям.

```text
Project core
    ↓
ProjectSection
    ↓
Resource Database
    ↓
Warehouse
    ↓
Documents
    ↓
Tasks / access
    ↓
Backend / deployment
    ↓
Offline / notifications
    ↓
3D / chat / mobile polish / analytics
```

Нельзя строить сложные модули поверх хаотичной модели данных.

## Что является ядром

Ядро продукта:

- Project / проект-смета;
- Project lifecycle;
- ProjectSection;
- ResourceItem / ResourceCategory;
- QuoteRow;
- BomRow;
- WarehouseNeed;
- ProjectTask;
- ProjectAssignment;
- DocumentArtifact;
- ProjectEvent / AuditLog.

Без этого любые новые функции будут снова превращаться в набор временных экранов и костылей.

## Stage 0 — Current cleanup and documentation

Статус: текущий этап.

Цель:

- очистить проект;
- зафиксировать архитектуру;
- описать правила;
- подготовить v5 migration;
- не писать новые крупные фичи поверх старого хаоса.

Документы этого этапа:

- APP_LOGIC;
- PROJECT_LIFECYCLE;
- FLEXIBLE_QUOTE_SECTIONS;
- FLEXIBLE_RESOURCE_DATABASE;
- ACCESS_CONTROL;
- DEPLOYMENT_AND_SCALING;
- SINGLE_TENANT_DEPLOYMENT;
- LICENSE_AND_INSTALLATION;
- CENTRAL_REGISTRY_AND_COMPANY_ROUTING;
- COMPANY_CONFIGURATION;
- PRODUCT_MODULES_ROADMAP.

## Stage 1 — Domain model and read-only Project snapshot

Первый технический шаг v5.

Цель:

- создать domain schemas/types;
- собрать read-only Project snapshot из текущей сметы;
- ничего не менять в UI и расчётах;
- получить мост между старым приложением и новой архитектурой.

Минимальные сущности:

- Project;
- ProjectSection;
- ResourceItem;
- ResourceCategory;
- QuoteRow;
- BomRow;
- WarehouseNeed;
- ProjectTask;
- ProjectAssignment;
- DocumentArtifact;
- ProjectEvent.

Результат:

```text
current quote state
    ↓
Project domain snapshot
    ↓
validation report
```

Нельзя на этом этапе:

- переписывать сметчик целиком;
- менять расчёты;
- менять BOM;
- менять складские операции;
- менять PDF totals;
- ломать текущий UI.

## Stage 2 — ProjectSection registry

Цель:

- описать все разделы проекта как ProjectSection;
- отделить источник данных от итогового normalized output;
- подготовить гибкий сметчик.

Типы разделов:

- constructor;
- catalog;
- manual construction;
- service;
- external supplier;
- transport;
- crew;
- future/custom section.

Каждый section должен уметь отдавать:

- quoteRows;
- bomRows;
- warehouseRows;
- technical summary;
- document context;
- tasks, если нужно.

## Stage 3 — Resource Database foundation

Цель:

- перевести ресурсную базу в гибкую модель;
- завести категории с category-specific technicalSpecs;
- внедрить качество данных;
- подготовить импорт.

Включает:

- ResourceItem;
- ResourceCategory;
- category schemas;
- data quality status;
- duplicate detection;
- import dry-run;
- external database import;
- archive/replacement model.

На этом этапе нельзя ломать текущие рабочие позиции и старые проекты.

## Stage 4 — Warehouse foundation

Цель:

- нормализовать складскую потребность от проекта;
- разделить проверку наличия и реальный резерв;
- подготовить складской workflow.

Поток:

```text
WarehouseNeed
    ↓
Availability check
    ↓
Deficit / replacement / subrent
    ↓
Reservation after confirmation
    ↓
Pick list
    ↓
Issue
    ↓
Return
    ↓
Closeout
```

MVP:

- проверка наличия;
- дефицит;
- резерв после подтверждения;
- складской лист;
- выдача/возврат;
- ProjectEvent для складских операций.

Later:

- offline warehouse queue;
- barcode/QR scanning;
- damage workflow;
- repair/write-off workflow.

## Stage 5 — Documents and templates

Цель:

- строить документы из Project snapshot;
- сохранить версии КП;
- подключить company document templates.

MVP:

- клиентское КП;
- внутренний техлист;
- складской лист;
- document snapshots;
- versioning;
- company branding;
- Pack.it attribution.

Growth:

- custom templates;
- DOCX/XLSX templates;
- invoice templates;
- acts;
- фотоотчёты;
- preview/validation шаблонов.

## Stage 6 — Tasks, roles and access

Цель:

- связать lifecycle проекта с задачами и доступами;
- использовать project assignments;
- не привязывать пользователя к одной жёсткой роли.

MVP:

- base profile;
- system permissions;
- project assignments;
- project roles;
- access keys;
- tasks from lifecycle events;
- audit log for critical actions.

Growth:

- role presets per company;
- project watchers;
- invited specialists;
- temporary access;
- task comments/files;
- task notifications.

## Stage 7 — Backend and persistence

Цель:

- перевести важные данные из local-only прототипа в backend;
- сохранить controlled writes;
- подготовить single-tenant installation.

MVP:

- auth;
- users;
- projects;
- resource database;
- warehouse;
- documents metadata;
- tasks;
- audit log;
- file storage integration;
- migrations;
- backup/restore.

Нельзя:

- хранить service secrets во frontend;
- делать опасные writes без controlled flow;
- смешивать demo/test data с production.

## Stage 8 — Deployment, license and company routing

Цель:

- подготовить установку под компании;
- связать company license and installation activation;
- реализовать central registry только для маршрутизации и лицензий.

MVP:

- single-tenant installation docs;
- env/secrets;
- install VPS path;
- companyId;
- installationId;
- signed license token;
- central registry lookup;
- companyId/company code routing;
- health checks;
- backup/restore.

Growth:

- managed install process;
- update channel;
- activation/deactivation;
- migration to new VPS;
- staging/dev licenses.

## Stage 9 — Offline and PWA

Цель:

- безопасная работа без интернета;
- локальные очереди;
- sync conflicts.

MVP:

- app shell cache;
- offline project read;
- checklist offline draft;
- photo upload queue;
- offline comments queue;
- sync status.

Growth:

- offline warehouse operation queue;
- issue/return offline events;
- conflict resolution;
- localOperationId idempotency;
- device-scoped offline queue.

Нельзя:

- офлайн подтверждать проект как серверную истину;
- офлайн создавать окончательный резерв;
- смешивать cache разных компаний.

## Stage 10 — Notifications

Цель:

- уведомления от событий, задач и статусов;
- не спамить пользователей;
- связать action-required уведомления с задачами.

MVP:

- notification center;
- task notifications;
- project status notifications;
- warehouse critical notifications;
- license notifications for admins;
- offline queue sync notifications.

Growth:

- push;
- email;
- digest;
- per-role settings;
- company defaults;
- anti-spam grouping;
- integration delivery statuses.

## Stage 11 — 3D constructor

Цель:

- заменить быстрые калькуляторы единым 3D-конструктором;
- использовать Resource Database and ProjectSection model;
- уметь работать standalone и внутри сметчика.

MVP:

- read-only 3D assets registry;
- truss/stage/LED construction model;
- save construction as ProjectSection;
- transfer standalone construction to quote project;
- BOM output;
- warehouseRows output.

Growth:

- MDM model pack;
- full truss structure;
- ground support 39-series;
- scene and LED in one constructor;
- load checks;
- 3D preview/export;
- optimized asset loading.

Нельзя начинать полноценный 3D-конструктор до Resource Database and ProjectSection foundation.

## Stage 12 — Communication and chat

Цель:

- коммуникация внутри компании и проекта;
- связать чаты с задачами и уведомлениями.

MVP:

- project comments;
- task comments;
- role-room comments;
- notification from mentions.

Growth:

- общий чат компании;
- project chat;
- direct messages;
- push notifications;
- moderation/admin controls;
- attachment permissions.

Не делать чат раньше задач, ролей и уведомлений.

## Stage 13 — Analytics and reports

Цель:

- отчёты по проектам, складу, финансам и загрузке.

MVP:

- project status overview;
- warehouse deficit overview;
- active reservations;
- upcoming events;
- overdue tasks.

Growth:

- revenue/margin reports;
- utilization reports;
- resource usage;
- damage/loss analytics;
- team workload;
- client history;
- license/admin telemetry, если согласовано.

## Stage 14 — Mobile polish and native app direction

Цель:

- улучшить мобильный/PWA опыт;
- подготовить возможные native shells.

MVP:

- responsive PWA;
- mobile project view;
- mobile tasks;
- mobile warehouse issue/return;
- QR/invite onboarding;
- offline status.

Growth:

- app store wrappers;
- push reliability;
- camera/file workflows;
- barcode/QR scanner;
- native share/export.

## Что нельзя делать раньше времени

Нельзя начинать с:

- полного 3D-конструктора;
- общего SaaS multi-tenant;
- чатов и пушей без задач;
- сложной аналитики без нормализованных данных;
- кастомных шаблонов без document snapshot model;
- offline warehouse без нормального warehouse workflow;
- лицензирования без single-tenant installation model.

## Приоритет ближайшей разработки

Ближайший технический путь:

```text
1. domain schemas/types
2. read-only Project snapshot
3. ProjectSection output normalization
4. Resource Database schema
5. WarehouseNeed normalization
6. document snapshot generation
7. tasks from lifecycle
```

Только после этого безопасно расширять 3D, offline warehouse, notifications, custom templates and chat.

## Итоговый закон

Pack.it развивается от ядра Project → Section → Resource → Warehouse → Documents → Tasks к расширениям: backend, deployment, offline, notifications, 3D, chat, analytics and mobile polish. Каждый новый модуль должен опираться на доменную модель и не обходить Project lifecycle, access control, warehouse workflow, document snapshots and audit rules.
