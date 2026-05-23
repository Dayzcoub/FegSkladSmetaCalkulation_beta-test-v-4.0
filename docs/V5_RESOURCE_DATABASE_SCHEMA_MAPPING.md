# V5 Resource Database schema mapping

Этот документ фиксирует третий изолированный технический шаг v5 migration.

## Цель

Научиться приводить текущую legacy EquipmentDatabase к будущей гибкой Resource Database:

```text
legacy equipment items/categories
    ↓
ResourceDatabaseMapper
    ↓
ResourceItem / ResourceCategory
    ↓
read-only mapping report
```

## Что добавлено

### `src/domain/ResourceDatabaseMapper.js`

Read-only mapper для текущей базы оборудования.

Он умеет:

- маппить legacy equipment item → `ResourceItem`;
- маппить legacy category → `ResourceCategory`;
- переносить company/workspace scope;
- переносить stock/reserved/rental/weight/power fields;
- переносить truss/LED metadata в `technicalSpecs`;
- переносить compatibility metadata;
- определять `resourceType` из `sourceType`;
- строить duplicate report;
- строить validation report;
- формировать summary.

## Read-only режим

Mapper ничего не пишет в текущую базу, localStorage, backend или склад.

Результат содержит:

```text
source.readOnly = true
```

## ResourceItem mapping

Legacy поля приводятся к доменным полям:

```text
id              → id
workspaceId     → workspaceId/companyId
category        → categoryId
subcategory     → subcategoryId
type            → technicalSpecs.legacyType / compatibility.legacyType
code            → code
name            → name
manufacturer    → manufacturer
model           → model
unit            → unit
stockQty        → stockQty
reservedQty     → reservedQty
rentalPrice     → rentalPrice
replacementCost → costPrice
weightKg        → weightKg
powerW          → power.powerW
startupPowerW   → power.startupPowerW
sourceType      → resourceType
meta            → technicalSpecs / compatibility / source.original
```

## ResourceCategory mapping

Legacy categories map to `ResourceCategory` with:

- technicalSpecSchema;
- warehouseFields;
- quoteFields;
- technicalSheetFields;
- compatibilityRules;
- uiSchema with legacy subcategories and type counts.

## Quality status

Quality status is inferred from mapping issues:

- active valid item → `ready`;
- item with warnings → `warnings`;
- item with blockers → `not_ready`;
- inactive item → `archived`.

## Duplicate report

Mapper detects possible duplicates by:

- code;
- name + manufacturer + model.

Duplicates are warnings only. They are not merged automatically.

## What did not change

- UI;
- current EquipmentDatabase behavior;
- localStorage;
- backend writes;
- warehouse operations;
- reservations;
- calculations;
- PDF export;
- service worker;
- production entrypoint.

The new mapper is not connected to `index.html`.

## Проверка

Added smoke-check:

```bash
node scripts/check-resource-database-mapping.mjs
```

It loads current `EquipmentDatabase`, domain schemas and mapper, then maps smoke items for truss, LED and subrent resources.

## Следующий шаг

После этого шага можно переходить к:

- WarehouseNeed normalization;
- document snapshot builders;
- lifecycle task generation;
- future import/dry-run bridge for Resource Database.
