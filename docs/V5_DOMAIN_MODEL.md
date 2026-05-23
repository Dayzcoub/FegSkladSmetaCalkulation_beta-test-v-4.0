# V5 domain model

Этот документ задаёт первый словарь доменных сущностей для архитектурной миграции v5.

## Главный принцип

UI, документы, склад, задачи и backend должны опираться на общую доменную модель, а не на случайные DOM-состояния и локальные временные структуры.

```text
Project
    ↓
ProjectSection
    ↓
QuoteRow / BomRow / WarehouseNeed / Task / Document
```

## Project

Центральная сущность приложения.

Поля:

- `id`;
- `workspaceId`;
- `status`;
- `title`;
- `clientId`;
- `venue`;
- `eventDateStart`;
- `eventDateEnd`;
- `managerUserId`;
- `riskLevel`;
- `techDirectorUserId`;
- `sections`;
- `assignments`;
- `readinessChecks`;
- `quoteSnapshots`;
- `calendarEvents`;
- `documents`;
- `tasks`;
- `events`;
- `createdAt`;
- `updatedAt`.

## ProjectSection

Универсальный раздел проект-сметы.

Поля:

- `id`;
- `projectId`;
- `type`;
- `kind`;
- `title`;
- `status`;
- `source`;
- `responsibleUserId`;
- `input`;
- `technicalResult`;
- `items`;
- `bomRows`;
- `quoteRows`;
- `warehouseRows`;
- `tasks`;
- `documents`;
- `supplierId`;
- `subrentorId`;
- `riskFlags`;
- `notes`;
- `attachments`.

Section types:

- `constructor`;
- `catalog`;
- `manual_construction`;
- `service`;
- `external_supplier`;
- `transport`;
- `crew`.

## ResourceItem

Позиция гибкой ресурсной базы.

Поля:

- `id`;
- `workspaceId`;
- `code`;
- `name`;
- `categoryId`;
- `subcategoryId`;
- `resourceType`;
- `manufacturer`;
- `model`;
- `unit`;
- `stockQty`;
- `reservedQty`;
- `rentalPrice`;
- `costPrice`;
- `weightKg`;
- `dimensions`;
- `power`;
- `supplierId`;
- `isActive`;
- `technicalSpecs`;
- `compatibility`;
- `attachments`;
- `notes`.

## ResourceCategory

Категория ресурсов с собственной схемой технических параметров.

Поля:

- `id`;
- `workspaceId`;
- `name`;
- `parentId`;
- `defaultResourceType`;
- `defaultUnit`;
- `technicalSpecSchema`;
- `warehouseFields`;
- `quoteFields`;
- `technicalSheetFields`;
- `compatibilityRules`;
- `uiSchema`;
- `isActive`.

## QuoteRow

Строка клиентской или внутренней сметы.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `sourceType`;
- `resourceItemId`;
- `title`;
- `description`;
- `quantity`;
- `unit`;
- `clientPrice`;
- `internalCost`;
- `discount`;
- `totalClientPrice`;
- `totalInternalCost`;
- `margin`;
- `visibility`;
- `notes`.

## BomRow

Нормализованная комплектация.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `resourceItemId`;
- `code`;
- `name`;
- `quantity`;
- `unit`;
- `weightKg`;
- `power`;
- `source`;
- `technicalMeta`;
- `warehouseRequired`;
- `notes`.

## WarehouseNeed

Потребность склада по проекту.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `resourceItemId`;
- `requiredQty`;
- `availableQty`;
- `reservedQty`;
- `deficitQty`;
- `status`;
- `replacementOptions`;
- `subrentPlanId`;
- `notes`.

## AvailabilityResult

Результат проверки наличия.

Поля:

- `projectId`;
- `checkedAt`;
- `eventDateStart`;
- `eventDateEnd`;
- `rows`;
- `warnings`;
- `blocked`;
- `summary`.

## Reservation

Резерв склада после подтверждения проекта.

Поля:

- `id`;
- `projectId`;
- `resourceItemId`;
- `quantity`;
- `dateStart`;
- `dateEnd`;
- `status`;
- `createdBy`;
- `createdAt`;
- `releasedAt`;
- `notes`.

## SubrentPlan

План закрытия дефицита внешним ресурсом.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `resourceItemId`;
- `subrentorId`;
- `quantity`;
- `internalCost`;
- `clientPrice`;
- `margin`;
- `status`;
- `responsibleUserId`;
- `documents`;
- `notes`.

## ProjectTask

Задача пользователя.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `assignedUserId`;
- `assignedRole`;
- `title`;
- `description`;
- `status`;
- `priority`;
- `dueAt`;
- `documents`;
- `comments`;
- `createdBy`;
- `createdAt`;
- `updatedAt`.

## ProjectAssignment

Назначение пользователя на проектную роль.

Поля:

- `id`;
- `projectId`;
- `userId`;
- `projectRoles`;
- `permissions`;
- `dateStart`;
- `dateEnd`;
- `status`;
- `createdBy`.

## AccessKey

Ключ доступа.

Поля:

- `id`;
- `workspaceId`;
- `projectId`;
- `issuedTo`;
- `issuedBy`;
- `role`;
- `permissions`;
- `validFrom`;
- `validUntil`;
- `status`;
- `usageLog`.

## DocumentArtifact

Документ или export.

Поля:

- `id`;
- `projectId`;
- `sectionId`;
- `type`;
- `title`;
- `version`;
- `visibility`;
- `fileUrl`;
- `snapshotId`;
- `createdBy`;
- `createdAt`.

## CalendarEvent

Календарное событие проекта.

Поля:

- `id`;
- `projectId`;
- `title`;
- `dateStart`;
- `dateEnd`;
- `location`;
- `participants`;
- `externalCalendarId`;
- `status`;
- `notes`.

## ProjectEvent

Событие истории проекта.

Поля:

- `id`;
- `projectId`;
- `type`;
- `actorUserId`;
- `createdAt`;
- `payload`;
- `before`;
- `after`;
- `visibility`.

## Следующий технический шаг

Эту модель нужно перевести в первые схемы `src/domain/` или TypeScript-типы. До этого не начинать крупную перестройку сметчика.
