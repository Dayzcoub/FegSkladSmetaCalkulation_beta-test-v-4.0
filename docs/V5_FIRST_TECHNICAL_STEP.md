# Первый технический шаг v5

Этот документ фиксирует первый кодовый шаг после документации v5.

## Цель

Не переписывать приложение сразу. Сначала ввести доменный слой, который станет основой будущей миграции.

## Что сделать первым

Создать `src/domain/` или `src/domain/types/`.

Минимальные схемы:

```text
Project
ProjectSection
ResourceItem
ResourceCategory
QuoteRow
BomRow
WarehouseNeed
ProjectTask
ProjectAssignment
DocumentArtifact
CalendarEvent
ProjectEvent
```

## Формат

Возможные варианты:

1. JSDoc + runtime validation в текущем JS-проекте.
2. JSON Schema для проверки payload.
3. Постепенный TypeScript layer.

Предпочтительное направление — TypeScript или TypeScript-ready схемы, но без резкого переписывания всего проекта.

## Что нельзя трогать на первом шаге

- UI сметчика;
- расчёты Stage/Truss/LED;
- BOM formulas;
- складские операции;
- backend writes;
- PDF export;
- PWA cache behavior.

## Что можно сделать

- добавить схемы;
- добавить валидаторы;
- добавить тестовые примеры payload;
- добавить mapping из текущей quote model в Project draft model;
- добавить read-only inspector для сравнения текущих данных с новой моделью.

## Первый полезный результат

После первого шага приложение должно уметь собрать read-only `Project` snapshot из текущей сметы без изменения поведения UI.

```text
Current quote state
        ↓
Project domain snapshot
        ↓
validation report
        ↓
read-only debug/inspector output
```

## Почему так

Это безопасный мост. Мы не ломаем старое приложение, но начинаем переводить данные в новую архитектурную модель.

## Проверки

- существующие node checks;
- schema validation examples;
- snapshot generation smoke test;
- no changes in visible quote totals;
- no changes in BOM output;
- no changes in warehouse calculations.

## Следующий шаг после этого

После появления Project snapshot можно постепенно подключать:

- ProjectSection registry;
- ResourceCategory schemas;
- warehouseNeeds normalization;
- document builders from Project model;
- tasks from lifecycle events.
