# V5 domain snapshot step 1

Этот документ фиксирует первый технический шаг v5 migration.

## Цель

Ввести read-only domain layer без изменения текущего UI, расчётов, BOM, склада и backend writes.

## Что добавлено

### `src/domain/DomainSchemas.js`

Базовые доменные фабрики и контракты:

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
- CalendarEvent;
- ProjectEvent.

Также добавлены простые validation helpers and validation reports.

### `src/domain/ProjectSnapshotBuilder.js`

Read-only builder, который принимает текущую legacy quote draft model и собирает нормализованный `Project` snapshot.

Snapshot содержит:

- project metadata;
- company/installation scope;
- sections;
- quoteRows;
- bomRows;
- warehouseRows;
- totals;
- source metadata;
- validation report.

Snapshot отмечается как read-only:

```text
source.readOnly = true
```

### `scripts/check-domain-snapshot.mjs`

Отдельный smoke-check для domain snapshot layer.

Запуск:

```bash
node scripts/check-domain-snapshot.mjs
```

## Что не менялось

- UI;
- расчёты Stage/Truss/LED;
- BOM formulas;
- warehouse operations;
- reservations;
- PDF export;
- backend writes;
- service worker;
- production entrypoint.

Новые domain files не подключены к `index.html` и не влияют на работу приложения.

## Зачем это нужно

Это безопасный мост между текущей моделью сметы и будущей архитектурой Pack.it:

```text
legacy quote draft
    ↓
read-only Project snapshot
    ↓
validation report
    ↓
future ProjectSection / Resource / Warehouse / Documents migration
```

## Следующий шаг

После проверки этого PR можно будет постепенно расширять:

- ProjectSection output normalization;
- Resource Database schema mapping;
- WarehouseNeed normalization;
- document snapshot builders;
- task generation from lifecycle events.
