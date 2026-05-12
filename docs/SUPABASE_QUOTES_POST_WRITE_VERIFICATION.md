# Supabase clients/quotes post-write verification — v3.13.1

Этот слой закрывает цепочку `quote remote dry-run → approval package → quote controlled write → post-write verification`.

## Назначение

После ручного запуска `quote-controlled-write` нужно убедиться, что серверная база совпала с approved payload. Для этого используется только read-only Edge Function `quote-sync-dry-run` с флагом:

```json
{
  "verify_after_controlled_write": true
}
```

Verification не делает upsert, не создаёт складские движения и не создаёт резервы.

## UI

В блоке `Clients/quotes remote dry-run` добавлены:

- статус `Quote post-write verify`;
- `Verify readiness JSON`;
- `Проверить quote после write`;
- `Скачать verify JSON`;
- latest verification report.

## Local history

Отчёты сохраняются локально в:

```text
fegV4QuotePostWriteVerificationReports
```

`FEG_SERVER_TEST_KEY` не сохраняется.

## Gate

Verification readiness требует:

- endpoint `quote-sync-dry-run`;
- временно введённый `x-feg-test-key`;
- successful `quote controlled write` report;
- свежий approval package, совпадающий с текущим payload;
- quotes в payload;
- read-only mode.

## Успех

`post_write_verification_gate` считается успешным, когда:

- нет pending `insert`;
- нет pending `update`;
- есть `unchanged` rows;
- remote diff готов;
- workspace resolved.

`remote_only` не удаляется автоматически и остаётся ручным предупреждением, потому что на сервере могут быть другие проекты/клиенты, не входящие в текущий approved payload.

## Non-goals

- Нет автоматического удаления remote-only строк.
- Нет rollback/delete.
- Нет `stock_movements`.
- Нет `reservations`.
- Нет прямого browser upsert.
- Старый v3-интерфейс и расчёты не меняются.
