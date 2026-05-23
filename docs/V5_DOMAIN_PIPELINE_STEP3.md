# V5 domain pipeline step 3

Этот документ фиксирует объединённый третий технический шаг v5 migration.

## Цель

Собрать изолированный read-only domain pipeline:

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

## Что добавлено

### `src/domain/ResourceDatabaseMapper.js`

Read-only mapping legacy EquipmentDatabase в будущую Resource Database:

- ResourceItem;
- ResourceCategory;
- technicalSpecs;
- compatibility;
- qualityStatus;
- duplicate report;
- validation report.

### `src/domain/WarehouseNeedNormalizer.js`

Read-only normalization складских потребностей:

- сопоставляет warehouseRows с ResourceItems;
- считает available/reserved/deficit;
- формирует WarehouseNeed set;
- не создаёт резерв;
- не меняет склад;
- не пишет в backend/localStorage.

### `src/domain/DocumentSnapshotBuilder.js`

Read-only document snapshot builder:

- client quote context;
- internal tech sheet context;
- warehouse list context;
- client-safe vs internal/warehouse data separation.

### `src/domain/LifecycleTaskGenerator.js`

Read-only task generation from lifecycle context:

- draft tasks;
- confirmed project tasks;
- warehouse tasks;
- deficit tasks.

### Smoke checks

Existing:

```bash
node scripts/check-resource-database-mapping.mjs
```

Combined pipeline:

```bash
node scripts/check-v5-domain-pipeline.mjs
```

## Что важно

Все новые modules are read-only and isolated.

Они не подключены к `index.html` and do not affect production runtime.

## Что не менялось

- UI;
- current EquipmentDatabase behavior;
- localStorage writes;
- backend writes;
- warehouse operations;
- reservations;
- calculations;
- PDF export;
- service worker;
- production entrypoint.

## Что проверяет combined smoke-check

`check-v5-domain-pipeline.mjs`:

1. creates smoke EquipmentDatabase items;
2. maps them to ResourceItem/ResourceCategory;
3. creates smoke legacy quote;
4. builds read-only Project snapshot;
5. normalizes ProjectSection outputs;
6. normalizes WarehouseNeeds with availability/deficit;
7. builds document snapshots;
8. generates lifecycle tasks;
9. checks validation reports;
10. checks `source.readOnly = true` for all outputs.

## Следующий шаг

После этого шага можно переходить к controlled integration planning:

- deciding where to expose read-only snapshot diagnostics;
- connecting domain checks to dev/admin-only panels;
- planning backend persistence for Project/Resource/Warehouse entities;
- preparing first VPS installation scripts.
