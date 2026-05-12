# FEG Stage PRO v3.8.40 — Reservation Planner

Локальный слой планирования резерва склада под будущую таблицу `reservations`.

## Что делает

- собирает строки из общего складского листа;
- сопоставляет их с локальной базой оборудования;
- считает `requested_qty`, `reserved_qty`, `deficit_qty`, `subrent_qty`;
- помечает строки статусами `reserved`, `partial`, `deficit`, `subrent`, `unmatched`;
- добавляет `reservation_plan` в Export pack;
- добавляет `rows.reservations` в backend sync payload.

## Важно

Слой не меняет остатки автоматически. Он только готовит план резерва. Фактическое изменение склада будет отдельным backend-слоем с RLS и журналом действий.
