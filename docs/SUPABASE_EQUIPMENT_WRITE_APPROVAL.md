# Supabase equipment write approval — v3.12.4

Этот слой добавляет последний предохранитель между remote dry-run и controlled write: approval package с checksum payload.

## Цель

Remote dry-run показывает, что текущий payload можно сравнить с Supabase без записи. Approval package фиксирует именно тот payload, который прошёл remote dry-run, и блокирует дальнейший controlled write template, если база оборудования изменилась после проверки.

## Что добавлено

- `buildEquipmentWriteApprovalPackage()` — собирает approval package из последнего remote dry-run report.
- `equipmentPayloadChecksum()` — считает стабильный checksum по `suppliers` и `equipment_items`.
- `compareApprovalWithCurrentPayload()` — проверяет, что текущий payload совпадает с одобренным.
- `buildApprovedControlledWriteRequest()` — собирает controlled write request только при валидном approval.
- UI-кнопки:
  - `Одобрить payload`;
  - `Скачать approval JSON`;
  - `Сбросить approval`;
  - `Скачать approved write template`.

## Правила approval

Approval считается валидным, только если:

1. есть последний remote dry-run report;
2. remote dry-run не содержит blockers;
3. `remote_diff` построен;
4. remote report содержит `payload_checksum`;
5. текущий payload имеет тот же checksum;
6. preflight без blockers до approval-gate.

Если после approval изменить базу оборудования, checksum изменится. В этом случае нужно заново выполнить remote dry-run и заново создать approval package.

## Edge Function gate

`equipment-controlled-write` теперь требует `approval_package` и сверяет:

- `approval_package.approved === true`;
- `approval_package.payload_checksum` совпадает с checksum текущего request payload;
- `controlled_write_plan.approval_ok !== false`.

Без approval package controlled write блокируется даже при `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.

## Безопасность

Этот слой не выполняет запись в Supabase из статического клиента. Он только формирует approval package и approved controlled write request template.

Фактическая запись всё ещё требует:

- `x-feg-test-key`;
- `dry_run=false`;
- `confirm_phrase=WRITE EQUIPMENT`;
- `approval_package`;
- matching `payload_checksum`;
- clean controlled write plan;
- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.

## Рекомендуемый порядок

1. Подготовить базу оборудования.
2. Stage equipment payload.
3. Запустить remote dry-run.
4. Проверить `remote_diff`.
5. Нажать `Одобрить payload`.
6. Скачать `feg_equipment_write_approval_package.json`.
7. Скачать `feg_equipment_approved_controlled_write_request.json`.
8. Только после отдельной ручной проверки включать controlled write backend gate.

## v3.12.5 — controlled write runner

После approval package добавлен ручной `controlled write Edge runner`.

Runner не делает прямой browser upsert. Он отправляет approved payload в `equipment-controlled-write` только после ручного ввода `FEG_SERVER_TEST_KEY` и контрольной фразы `WRITE EQUIPMENT`.

Даже при ручном запуске фактический upsert выполнится только если Edge Function развёрнута с `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role key.
