# V5 ProjectSection output normalization

Этот документ фиксирует второй изолированный технический шаг v5 migration.

## Цель

Нормализовать выход каждого `ProjectSection` в единый read-only формат:

- `quoteRows`;
- `bomRows`;
- `warehouseRows`;
- `technicalSummary`;
- `documentContext`;
- validation report.

## Что добавлено

### `src/domain/ProjectSectionOutputNormalizer.js`

Read-only normalizer для секций проекта.

Он принимает `Project` snapshot и строит normalized outputs:

```text
Project snapshot
    ↓
ProjectSectionOutputNormalizer
    ↓
section outputs
    ↓
project-level quoteRows / bomRows / warehouseRows / totals
```

## Что получает каждая секция

Каждая секция получает output:

```text
sectionId
projectId
kind
type
quoteRows
bomRows
warehouseRows
tasks
documents
technicalSummary
documentContext
validation
source.readOnly = true
```

## Technical summary

`technicalSummary` содержит:

- totalClientPrice;
- totalInternalCost;
- weightKg;
- powerW;
- startupPowerW;
- quoteRowCount;
- bomRowCount;
- warehouseNeedCount;
- deficitCount;
- riskFlags;
- normalizerVersion.

## Document context

`documentContext` разделён на безопасные контексты:

- `clientSafe` — данные для клиентских документов;
- `internalTech` — внутренние технические данные;
- `warehouse` — данные для складских документов.

Это нужно, чтобы клиентский документ случайно не получил внутреннюю себестоимость, маржу, складские комментарии или закрытые поля.

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

Новый файл не подключён к `index.html` и не влияет на работу приложения.

## Проверка

Добавлен smoke-check:

```bash
node scripts/check-section-output-normalization.mjs
```

Он:

1. создаёт тестовый legacy quote через текущий `QuoteModel`;
2. строит read-only `Project` snapshot;
3. нормализует outputs секций;
4. проверяет quoteRows, bomRows, warehouseRows, technicalSummary, documentContext and validation reports.

## Следующий шаг

После этого шага можно переходить к:

- Resource Database schema mapping;
- WarehouseNeed normalization;
- document snapshot builders;
- lifecycle task generation.
