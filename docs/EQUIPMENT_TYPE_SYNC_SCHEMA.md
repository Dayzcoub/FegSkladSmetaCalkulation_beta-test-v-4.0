# FEG Stage PRO v3.11.1 — Equipment type sync schema

Этот слой продолжает нормализацию базы оборудования и готовит справочник к будущему реальному `equipment_items` sync.

## Что добавлено

- `ITEM_TYPE_DEFINITIONS` — единый справочник типов оборудования с человекочитаемым названием, допустимыми категориями и единицей измерения по умолчанию.
- `TYPE_ALIASES` — приведение импортных и ручных вариантов типа к стабильным значениям: `кабель` → `cable`, `услуга` → `service`, `кабинет` → `led_cabinet` и т.д.
- `inferItemType()` — безопасный вывод типа по категории/подкатегории, если тип не указан.
- `buildTypeReport()` — диагностика распределения по типам, конфликтов тип/категория и ручных позиций внутри базы.
- `mapItemToEquipmentRow()` — подготовка строки будущей таблицы `equipment_items` в snake_case.
- `mapEquipmentRowToItem()` — обратное чтение строки backend payload обратно в локальную модель.
- `buildSyncSchemaReport()` — итоговый отчёт по обязательным полям, sample row, category report и type report.

## Поля sync row

`mapItemToEquipmentRow()` формирует безопасную строку для будущего payload:

- `id`
- `workspace_id`
- `category`
- `subcategory`
- `type`
- `code`
- `name`
- `manufacturer`
- `model`
- `unit`
- `stock_qty`
- `reserved_qty`
- `available_qty`
- `weight_kg`
- `power_w`
- `startup_power_w`
- `rental_price`
- `replacement_cost`
- `is_active`
- `source_type`
- `supplier_id`
- `supplier_name`
- `notes`
- `meta`
- `schema_version`
- `updated_at`
- `raw_payload`

`available_qty` остаётся вычисляемым полем: `stock_qty - reserved_qty` с защитой от отрицательных значений.

## UI

В базе оборудования добавлен блок `Типы и sync schema` и кнопка `Sync schema JSON`.

В карточке позиции список типов теперь показывает понятные названия и фильтруется по категории. При смене категории для новой позиции подставляется безопасный тип по умолчанию.

## Ограничения

- Реальная запись в Supabase не включена.
- Складские остатки автоматически не меняются.
- LED-печеньки, болты и старые расчёты не трогались.
- Старый v3-интерфейс не менялся.


## v3.11.2 — preview перед upsert

Поверх type/schema mapping добавлен `buildEquipmentSyncPreview()`: он использует snake_case row mapping, показывает blockers/warnings по каждой позиции и помогает подготовить базу к безопасному первому Supabase upsert.
