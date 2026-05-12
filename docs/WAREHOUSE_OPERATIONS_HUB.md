# FEG Stage PRO v3.9.0 — Warehouse & Project Operations Hub

Широкий складской слой v4-preview.

## Назначение

`WarehouseOperationsHub` собирает в один рабочий экран уже подготовленные локальные слои:

- `ReservationPlanner` — план резерва;
- `StockMovementPlanner` — черновик движений склада;
- `WarehouseWorkflow` — статусы складской подготовки;
- `SubrentPlanner` — дефицит и субаренда;
- `ProjectReadinessChecklist` — готовность проекта;
- `ProjectAuditLog` — export pack проекта.

## Что делает UI

Раздел «Склад / Операции» показывает список проектов и по выбранному проекту:

- складской статус;
- health-badge;
- резерв;
- дефицит;
- субаренду;
- несопоставленные позиции;
- движения склада;
- timeline workflow;
- экспорт складского пакета проекта.

## Safety

Остатки не меняются автоматически. Все операции являются планом и черновиком для будущего backend/RLS слоя.
