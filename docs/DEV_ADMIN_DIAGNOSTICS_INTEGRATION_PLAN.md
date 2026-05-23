# Dev/admin diagnostics integration plan

Этот документ фиксирует план безопасного подключения read-only v5 diagnostics в Pack.it.

## Главный принцип

Read-only diagnostics нужны разработчикам и администраторам для проверки новой доменной архитектуры, но не должны попадать в обычный рабочий UX пользователей.

```text
Regular user
    видит рабочие статусы, задачи и понятные предупреждения

Dev/Admin
    может открыть snapshots, validation reports, mapping reports, raw technical diagnostics
```

Diagnostics должны быть подключены только через отдельные gates:

```text
permission gate
    + environment gate
    + feature flag gate
    + data sensitivity gate
```

## Зачем нужен этот план

В main уже добавлен read-only v5 domain pipeline:

```text
legacy EquipmentDatabase
legacy QuoteModel
        ↓
Resource mapping
Project snapshot
ProjectSection outputs
WarehouseNeed normalization
Document snapshots
Lifecycle tasks
        ↓
validation reports
```

Этот pipeline нельзя сразу показывать всем пользователям. Он должен сначала использоваться как controlled diagnostics layer.

## Что можно показывать обычному пользователю

Обычный пользователь может видеть только понятные итоговые статусы:

- проект готов / не готов;
- есть предупреждения;
- есть складской дефицит;
- нужно заполнить данные;
- задача создана;
- документ готов;
- синхронизация ожидает интернет;
- полевая связь доступна / недоступна.

Пример:

```text
В проекте есть 3 складских дефицита. Откройте задачу закрытия дефицита.
```

## Что нельзя показывать обычному пользователю

Нельзя показывать:

- raw Project snapshot;
- raw Resource mapping output;
- raw WarehouseNeed normalization output;
- raw DocumentContext;
- raw LifecycleTaskGenerator report;
- JSON payloads;
- validation stack;
- internal ids unless needed;
- dev-only buttons;
- smoke-check output;
- stack traces;
- service worker/cache internals;
- backend payloads;
- license/registry internals;
- internal costs/margin without permissions.

## Diagnostics areas

Diagnostics should be split into areas.

### Domain Snapshot Diagnostics

Shows:

- Project snapshot summary;
- sections count;
- quoteRows count;
- bomRows count;
- warehouseRows count;
- validation summary;
- read-only source metadata.

Raw JSON only for dev/admin.

### Resource Mapping Diagnostics

Shows:

- ResourceItem count;
- ResourceCategory count;
- duplicate report;
- qualityStatus counts;
- mapping warnings;
- technicalSpecs preview;
- compatibility preview.

### Warehouse Diagnostics

Shows:

- normalized WarehouseNeeds;
- availability/deficit summary;
- matched/unmatched resources;
- replacement/subrent candidates later;
- conflict warnings later.

### Document Context Diagnostics

Shows:

- generated document snapshots;
- client-safe context preview;
- internal tech context preview;
- warehouse context preview;
- fields excluded from client context.

### Lifecycle Task Diagnostics

Shows:

- generated tasks;
- assigned roles/users;
- status/priority;
- lifecycle reason;
- duplicate suppression.

### Field Mode Diagnostics later

Shows only for dev/admin:

- fieldSessionId;
- local queue;
- sync status;
- connected devices;
- voice relay status;
- LAN server status;
- WebRTC/voice debug.

## Permission model

Add future permissions:

```text
canViewDevDiagnostics
canViewAdminDiagnostics
canRunDomainDiagnostics
canViewResourceMappingDiagnostics
canViewWarehouseDiagnostics
canViewDocumentContextDiagnostics
canViewLifecycleTaskDiagnostics
canExportDebugReport
```

Minimum access:

- developer / system admin — all diagnostics;
- company admin — admin diagnostics, no raw secrets;
- director — limited admin summary, no raw technical payloads by default;
- manager — only user-facing warnings unless explicitly granted;
- warehouse — only warehouse user-facing warnings unless explicitly granted.

## Feature flags

Add future flags:

```text
features.devDiagnostics
features.domainSnapshotDiagnostics
features.resourceMappingDiagnostics
features.warehouseDiagnostics
features.documentContextDiagnostics
features.lifecycleTaskDiagnostics
features.fieldDiagnostics
```

Default values:

```text
development: true for dev users
staging: true for dev/admin users
first-company-production: false by default, enable manually for admin/dev
production: false by default
```

## Environment gate

Diagnostics should be allowed by environment.

Possible environment values:

```text
development
staging
first-company-production
production
```

Rules:

- development — diagnostics can be visible to dev users;
- staging — diagnostics can be visible to dev/admin users;
- first-company-production — diagnostics off by default, enabled per session/user/feature flag;
- production — diagnostics off by default, only controlled support/debug mode.

## Data sensitivity gate

Even dev/admin diagnostics must respect sensitivity.

Examples:

- internal margin requires `canViewMargin`;
- client personal data requires role/project access;
- license internals require system admin/dev;
- backend secrets must never be shown;
- document client context can be shown more broadly than internal context;
- audit export requires audit permission.

## UI placement

Diagnostics should live in separate dev/admin places:

- Admin Center → Diagnostics;
- project admin/debug drawer;
- dev-only route;
- downloadable debug report;
- support mode panel.

Diagnostics must not appear inside the normal flow as raw data.

Good:

```text
Project page: "Есть 3 предупреждения"
Admin diagnostics: opens raw validation report
```

Bad:

```text
Project page shows full JSON snapshot to manager.
```

## User-facing summary layer

Every technical diagnostic should have a user-facing summary mapper.

Examples:

### WarehouseNeed unmatched

Dev/admin:

```text
WarehouseNeedNormalizer: unmatched resourceItemId TRS-001.
```

User:

```text
Позиция склада не найдена в базе. Проверьте складскую позицию или замену.
```

### Document context warning

Dev/admin:

```text
DocumentSnapshotBuilder: internalTech context contains supplierCost field.
```

User:

```text
Документ требует проверки перед отправкой клиенту.
```

### Resource mapping warning

Dev/admin:

```text
ResourceDatabaseMapper: item has missing weightKg.
```

User/admin database editor:

```text
У позиции не заполнен вес. Это может повлиять на логистику и техлист.
```

## Audit requirements

Diagnostics access should be logged for sensitive areas.

Log events:

- user opened raw project snapshot;
- user exported debug report;
- user opened backend payload;
- user opened license/installation diagnostics;
- user opened internal cost/margin diagnostics;
- support mode enabled/disabled.

Audit payload:

```text
userId
companyId
projectId
area
action
timestamp
reason / support ticket id if available
```

## Support/debug mode

For real company installations, diagnostics should be possible through temporary support/debug mode.

Rules:

- disabled by default;
- enabled by admin/dev;
- time-limited;
- audited;
- can be scoped to project/module;
- no secrets shown;
- downloadable debug report can redact sensitive values.

## Debug report export

A debug report can include:

- app version;
- companyId;
- installationId;
- projectId;
- domain snapshot summary;
- validation summary;
- resource mapping summary;
- warehouse deficit summary;
- document snapshot summary;
- lifecycle task summary;
- recent non-sensitive errors.

It must redact:

- secrets;
- tokens;
- passwords;
- private keys;
- raw personal data unless needed and allowed;
- internal margin unless permission allows.

## Implementation order

### Step 1 — Keep diagnostics isolated

Current state: domain pipeline exists, but is not connected to production UI.

### Step 2 — Add diagnostics permission constants

Add permission names but do not expose UI yet.

### Step 3 — Add feature flag config

Add disabled-by-default flags.

### Step 4 — Add dev/admin diagnostic service

Service can run read-only pipeline and return:

- user-facing summary;
- admin summary;
- raw diagnostics only if allowed.

### Step 5 — Add dev/admin-only UI route/panel

Only after gates are implemented.

### Step 6 — Add audit events

Audit sensitive diagnostics access.

### Step 7 — Add support/debug report export

Redacted report for support.

## Non-goals

Do not:

- add diagnostics to regular user screens;
- show JSON to normal users;
- expose raw validation to clients;
- use diagnostics to mutate data;
- run pipeline as final source of truth before backend migration;
- skip permission/feature/environment gates.

## Итоговый закон

Read-only v5 diagnostics must be integrated only through dev/admin-only gates. Regular users see simple work-oriented statuses and tasks, while developers/admins can inspect snapshots, validation reports, mapping results, warehouse diagnostics, document contexts and generated lifecycle tasks. Raw diagnostics must be hidden behind permissions, feature flags, environment gates and audit logging for sensitive areas.
