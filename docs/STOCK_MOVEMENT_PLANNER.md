# FEG Stage PRO v3.8.41 — Stock Movement Planner

Слой планирования движения склада под будущую таблицу `stock_movements`.

## Назначение

Модуль `StockMovementPlanner` строит локальные черновики операций склада из плана резерва:

- `reserve` — зарезервировать;
- `issue` — выдать со склада;
- `return` — вернуть на склад;
- `cancel_reserve` — отменить резерв;
- `writeoff` — списать;
- `adjustment` — корректировка.

## Важно

Этот слой **не меняет остатки автоматически**. Он только формирует план операций, который позже можно будет отправлять в Supabase `stock_movements` после полноценного backend/RLS-слоя.

## Экспорт

План движения добавлен в:

- финальные документы мастера;
- `Export pack JSON` как `stock_movement_plan`;
- `backend_sync_payload.rows.stock_movements`.
