# Supabase clients/quotes write approval — v3.12.9

Этот слой добавляет последний локальный предохранитель перед будущим controlled write клиентов и проектов.

## Цель

Зафиксировать именно тот `clients / quotes / quote_sections / quote_items / audit_log` payload, который уже прошёл remote dry-run через `quote-sync-dry-run`.

Цепочка теперь такая:

```text
quote payload → quote remote dry-run → payload_checksum → approval package → approved template
```

## Что добавлено

- localStorage key `fegV4QuoteWriteApprovalPackage`;
- `buildQuoteWriteApprovalPackage()`;
- `compareQuoteApprovalWithCurrentPayload()`;
- `buildApprovedQuoteWriteTemplate()`;
- `readQuoteWriteApprovalPackage()`;
- `saveQuoteWriteApprovalPackage()`;
- `clearQuoteWriteApprovalPackage()`;
- UI-кнопки:
  - `Одобрить quote payload`;
  - `Approval JSON`;
  - `Сбросить approval`;
  - `Approved template`.

## Когда approval разрешён

Approval получает статус `approved_quote_payload_locked`, только если выполнены условия:

```text
есть последний quote remote dry-run report
remote_write_executed = false
remote dry-run без blockers
remote_diff по clients/quotes построен
payload содержит quotes
remote report содержит payload_checksum
текущий payload checksum совпадает с dry-run checksum
нет складских движений
нет резервов
controlled quote write выключен
```

## Stale protection

Если после approval меняется клиент, проект, section, item или audit payload, текущий checksum меняется.

Тогда `compareQuoteApprovalWithCurrentPayload()` возвращает:

```text
quote_approval_missing_or_payload_changed
```

После этого approved template остаётся безопасным шаблоном, но не считается пригодным для будущего controlled write. Нужно заново выполнить:

```text
quote remote dry-run → approval package
```

## Что не включено

- `quote-controlled-write` Edge Function;
- реальный upsert `clients / quotes`;
- browser upsert;
- складские движения;
- автоматические резервы;
- списания / возвраты склада.

`buildApprovedQuoteWriteTemplate()` намеренно возвращает:

```json
{
  "dry_run": true,
  "controlled_quote_write_enabled": false,
  "remote_write_executed": false
}
```

## Почему так

Equipment sync уже имеет цепочку approval → controlled write → post-write verification → audit. Для клиентов и проектов мы повторяем тот же безопасный путь, но пока останавливаемся на approval package, чтобы не включить запись раньше проверки реального Supabase runtime, RLS и данных.
