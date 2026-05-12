# FEG Stage PRO — Warehouse Workflow draft

Версия: v3.8.42

Этот слой добавляет локальные статусы складской подготовки проекта без изменения остатков.

## Статусы

- `draft` — черновик склада
- `ready_to_pick` — к сборке
- `picking` — собирается
- `picked` — собрано
- `issued` — выдано
- `returned` — возвращено
- `closed` — закрыто
- `cancelled` — отменено

## Принцип безопасности

Workflow не меняет `stock_qty`, `reserved_qty` и `available_qty` автоматически. Он только формирует состояние проекта, timeline и заготовки под будущие таблицы `reservations` / `stock_movements` / backend workflow.

## Экспорт

Финальная сводка умеет выгружать:

- текстовый складской workflow;
- JSON workflow;
- `warehouse_workflow` внутри export pack;
- `rows.warehouse_workflows` внутри backend sync payload.
