# Dev/admin diagnostics visibility

Этот документ фиксирует правило видимости технической, диагностической и разработческой информации.

## Главный принцип

Обычный пользователь должен видеть только то, что нужно для его работы.

Всё, что связано с разработкой, внутренней диагностикой, snapshots, validation reports, JSON, pipeline checks and debug data, должно быть скрыто от обычных пользователей и доступно только dev/admin пользователям с соответствующими правами.

```text
Regular user
    рабочие экраны, задачи, документы, проекты, склад в рамках роли

Admin / Dev
    diagnostics, validation, snapshots, JSON, pipeline reports, technical checks
```

## Что обычный пользователь НЕ должен видеть

Обычный пользователь не должен видеть:

- raw JSON проекта;
- raw Project snapshot;
- domain validation reports;
- read-only pipeline output;
- internal technical debug panels;
- dev-only buttons;
- smoke-check results;
- stack traces;
- внутренние идентификаторы, если они не нужны для работы;
- backend/internal sync payloads;
- license internals;
- registry internals;
- feature flag internals;
- service worker/cache diagnostics;
- localStorage/internal storage keys;
- raw warehouse matching diagnostics;
- raw document context with internal fields;
- internal себестоимость/margin, если роль не имеет права это видеть.

## Что обычный пользователь должен видеть

Пользователь должен видеть только рабочий результат в рамках своей роли:

- свои проекты;
- назначенные задачи;
- проектные документы;
- клиентское КП, если роль имеет доступ;
- складской лист, если роль складская;
- техлист, если роль техническая;
- уведомления, которые требуют действия;
- статус проекта;
- ошибки в понятном человекочитаемом виде;
- подсказки, что нужно заполнить или исправить.

Пример правильного пользовательского сообщения:

```text
В проекте есть дефицит по 3 позициям. Откройте задачу закрытия дефицита.
```

Пример неправильного пользовательского сообщения:

```text
WarehouseNeedNormalizer validation warning: warehouseNeeds[2].resourceItemId unmatched.
```

## Dev/admin diagnostics

Dev/admin diagnostics могут включать:

- Project snapshot;
- ProjectSection outputs;
- ResourceDatabase mapping report;
- WarehouseNeed normalization report;
- Document snapshot contexts;
- Lifecycle task generation report;
- validation reports;
- JSON payloads;
- backend sync dry-run;
- controlled write preview;
- import dry-run;
- migration report;
- service worker/cache diagnostics;
- performance counters;
- audit export;
- feature flag state;
- license/installation technical status.

Эти данные должны быть доступны только при выполнении условий:

```text
user has admin/dev permission
    AND
feature flag/dev diagnostics enabled
    AND
environment allows diagnostics
```

## Visibility gates

Доступ к diagnostics должен проходить через несколько gates.

### Role/permission gate

Пользователь должен иметь одно из прав:

- `canViewDevDiagnostics`;
- `canViewAdminDiagnostics`;
- `canViewAuditLog` for audit-only data;
- `canRunDryRunChecks`;
- `canViewBackendSyncStatus`.

### Environment gate

Diagnostics по умолчанию разрешены в:

- development;
- staging;
- first-company controlled admin mode.

В production-like установке diagnostics должны быть скрыты, если не включены явно админом/разработчиком.

### Feature flag gate

Нужен отдельный feature flag:

```text
features.devDiagnostics = true/false
```

Для отдельных блоков можно использовать:

```text
features.domainSnapshotDiagnostics
features.resourceMappingDiagnostics
features.warehouseDiagnostics
features.documentContextDiagnostics
features.backendSyncDiagnostics
```

### Data sensitivity gate

Даже admin/dev diagnostics должны учитывать чувствительность данных.

Например:

- client-safe context можно показывать менеджеру;
- internal cost/margin — только тем, у кого есть `canViewMargin`;
- license internals — только admin/dev;
- audit log — только admin/director/dev;
- raw personal data — только если действительно нужно.

## UI rule

Не должно быть смешения рабочих экранов и dev-информации.

Плохо:

```text
На экране менеджера рядом с КП показывается JSON snapshot и validation output.
```

Хорошо:

```text
Менеджер видит: "КП готово / есть 2 предупреждения".
Dev/admin в отдельной диагностической панели видит raw validation report.
```

## Diagnostics placement

Diagnostics должны жить в отдельных местах:

- admin/debug panel;
- dev-only route;
- hidden diagnostics drawer;
- отдельный раздел Admin Center;
- downloadable debug report for support.

Они не должны появляться в основном workflow обычного пользователя.

## Error messages

Ошибки должны иметь два слоя.

### User-facing layer

Понятное сообщение:

```text
Не удалось сохранить проект. Проверьте соединение и попробуйте ещё раз.
```

### Admin/dev layer

Технические детали:

```text
BackendSyncAdapter write failed: status 409, conflict on quote_version.
```

Технические детали не показываются обычному пользователю, но могут быть доступны в diagnostics/logs.

## Documents visibility

В документах нельзя случайно выводить diagnostics.

Клиентские документы не должны содержать:

- internal costs;
- margin;
- supplier costs;
- raw validation;
- debug ids;
- warehouse matching report;
- raw JSON;
- stack traces;
- comments for internal team only.

Dev/admin exports могут включать diagnostics, но должны быть явно помечены как internal/debug.

## First real company deployment

Для первой реальной company installation на VPS особенно важно не смешать development и рабочий UX.

Правила:

- обычные сотрудники первой компании видят только рабочие экраны;
- dev/admin diagnostics доступны только назначенным пользователям;
- debug panels выключены по умолчанию;
- включение diagnostics попадает в audit log;
- demo/test data не должны появляться в рабочих списках;
- TestFixtures не должны грузиться в production entrypoint.

## Audit

Доступ к diagnostics должен логироваться для чувствительных блоков:

- raw project snapshot;
- backend payload;
- license status;
- audit export;
- internal cost/margin;
- personal data;
- document context.

Audit event должен содержать:

- userId;
- companyId;
- diagnostic area;
- projectId, если применимо;
- timestamp;
- reason/action.

## Итоговый закон

Обычные пользователи Pack.it не должны видеть лишнюю информацию разработки, raw JSON, snapshots, validation reports, technical payloads and debug panels. Они видят только рабочие данные и понятные человекочитаемые статусы в рамках своих ролей. Всё разработческое и диагностическое должно быть вынесено в dev/admin-only зоны, защищено правами, feature flags and environment gates, а доступ к чувствительным diagnostics должен логироваться.
