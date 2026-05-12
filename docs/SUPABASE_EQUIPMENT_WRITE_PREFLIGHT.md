# Supabase equipment write preflight — v3.12.3

Этот слой стоит между `equipment-sync-dry-run` и первым controlled write.

## Что делает

- сохраняет локальную историю последних remote dry-run отчётов;
- позволяет зафиксировать baseline dry-run;
- сравнивает текущий dry-run с baseline по `insert`, `update`, `unchanged`, `remote_only`;
- строит `controlled_write_preflight` перед реальной записью;
- скачивает `feg_equipment_remote_dry_run_history.json` и `feg_equipment_controlled_write_preflight.json`.

## Что не делает

- не выполняет `equipment-controlled-write`;
- не делает прямой browser upsert;
- не меняет складские остатки;
- не создаёт stock movements;
- не трогает LED-крепёж и старые расчёты.

## Основные функции

- `summarizeRemoteDryRunReport(report)` — превращает сырой Edge-ответ в короткий статус.
- `buildRemoteDryRunHistoryReport()` — история и сравнение с baseline.
- `saveRemoteDryRunBaseline(report)` — фиксирует эталонный dry-run.
- `buildControlledWritePreflight()` — проверочный пакет перед controlled write.

## Gate-логика

Preflight считается готовым, если:

- есть последний remote dry-run report;
- Edge response не содержит blockers;
- `remote_write_executed=false`;
- `remote_diff` построен;
- локальный controlled write plan доступен.

Даже при готовом preflight реальный write остаётся закрытым отдельными условиями: `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`, `dry_run=false`, `WRITE EQUIPMENT`, service role и `x-feg-test-key`.


## v3.12.4 — approval gate

Controlled write preflight теперь учитывает approval package. Перед final write нужно выполнить remote dry-run, затем собрать `feg_equipment_write_approval_package.json`. Edge Function `equipment-controlled-write` дополнительно требует `approval_package` и совпадающий `payload_checksum`, даже если `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.

## v3.12.5 — runner after preflight

Preflight теперь используется как один из обязательных local gates для `runEquipmentControlledWriteEdge()`.

Перед вызовом `equipment-controlled-write` проверяются approval package, checksum, test key, контрольная фраза, `dry_run=false`, наличие payload rows и armed controlled write plan.
