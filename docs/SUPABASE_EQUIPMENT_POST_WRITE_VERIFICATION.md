# Supabase equipment post-write verification — v3.12.6

v3.12.6 закрывает последний безопасный цикл после controlled equipment write.

Цепочка теперь такая:

```text
remote dry-run → approval package → controlled write Edge → post-write verification
```

## Что проверяет post-write verification

Проверка выполняется через read-only Edge Function `equipment-sync-dry-run` с флагом:

```json
{
  "verify_after_controlled_write": true
}
```

Функция снова строит `remote_diff` между локальным approved payload и текущими строками `equipment_items` на сервере.

Успехом считается только состояние:

```text
insert = 0
update = 0
remote_only = 0
unchanged > 0
remote_write_executed = false
```

То есть после controlled write сервер уже должен полностью совпадать с approved локальной базой оборудования.

## Новые функции SupabaseBackendPack

- `buildEquipmentPostWriteVerificationRequest()`;
- `buildEquipmentPostWriteVerificationReadiness()`;
- `runEquipmentPostWriteVerification()`;
- `summarizePostWriteVerificationReport()`;
- `savePostWriteVerificationReport()`;
- `readPostWriteVerificationReports()`.

## UI

В Backend / Supabase pack добавлены:

- статус `Post-write verify`;
- кнопка `Проверить после write`;
- скачивание `feg_equipment_post_write_verification.json`;
- JSON-блок readiness/result.

## Безопасность

Post-write verification не пишет данные.

Он вызывает только `equipment-sync-dry-run`, требует временно введённый `FEG_SERVER_TEST_KEY` и не сохраняет секреты.

Controlled write по-прежнему возможен только через `equipment-controlled-write` и только при серверном env-флаге:

```text
FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true
```

## Исправление v3.12.6

Исправлено сохранение approval package в localStorage: теперь `saveEquipmentWriteApprovalPackage()` пишет JSON именно в ключ `fegV4EquipmentWriteApprovalPackage`.

До этого approval мог отображаться в текущем runtime, но не фиксироваться корректно между обновлениями страницы.
