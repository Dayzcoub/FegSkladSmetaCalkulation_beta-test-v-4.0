# CHANGELOG

## v3.13.1 — Clients/quotes post-write verification loop

- Добавлен read-only post-write verification loop для clients/quotes после `quote-controlled-write`.
- `QuoteBackendSyncPack` обновлён до 3.13.1: добавлены `buildQuotePostWriteVerificationRequest()`, `buildQuotePostWriteVerificationReadiness()`, `runQuotePostWriteVerification()`, `summarizeQuotePostWriteVerificationReport()`, `saveQuotePostWriteVerificationReport()` и `readQuotePostWriteVerificationReports()`.
- UI-блок `Clients/quotes remote dry-run` получил статус `Quote post-write verify`, кнопки `Verify readiness JSON`, `Проверить quote после write`, `Скачать verify JSON` и latest verification report.
- `quote-sync-dry-run` обновлён до 3.13.1 и поддерживает `verify_after_controlled_write=true`, возвращая `post_write_verification_gate`.
- Verification проходит только через dry-run Edge Function и не создаёт `stock_movements` / `reservations`; `remote_only` остаётся ручной проверкой, автоматический delete/rollback не выполняется.
- LED-крепёж/печеньки/болты, складские движения, резервы, автоматическая browser-запись Supabase/backend и старый v3-интерфейс не менялись.

# Changelog

## v3.13.0 — Clients/quotes controlled write Edge runner

- Добавлен Edge Function `quote-controlled-write` для guarded clients/quotes upsert через service-role backend.
- `QuoteBackendSyncPack` обновлён до 3.13.0: добавлены controlled write execution request, readiness, Edge runner и local history `fegV4QuoteControlledWriteReports`.
- UI-блок `Clients/quotes remote dry-run` получил `Write confirm phrase`, статус `Quote write runner`, `Write readiness JSON` и кнопку `Запустить quote controlled write Edge`.
- Добавлена миграция `202605120004_quote_controlled_write_runner.sql` с non-partial unique indexes для безопасного upsert по local_id.
- `quote-controlled-write` требует `WRITE QUOTE`, valid approval package, checksum match, service role и `FEG_ENABLE_QUOTE_REMOTE_WRITE=true`.
- Складские движения, резервы, browser upsert, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.9 — Clients/quotes approval package

- Добавлен approval package для будущего clients/quotes controlled write без включения самой записи.
- `QuoteBackendSyncPack` получил `fegV4QuoteWriteApprovalPackage`, `buildQuoteWriteApprovalPackage()`, `compareQuoteApprovalWithCurrentPayload()`, `buildApprovedQuoteWriteTemplate()`, save/read/clear helpers.
- UI-блок `Clients/quotes remote dry-run` получил статус `Approval`, кнопки `Одобрить quote payload`, `Approval JSON`, `Сбросить approval`, `Approved template`.
- Approval создаётся только после clean remote dry-run, готового `remote_diff`, наличия `payload_checksum`, quotes в payload и совпадения текущего payload с dry-run checksum.
- Если клиент/проект/quote payload меняется после approval, approval становится stale и approved template блокируется до нового dry-run.
- Edge Function `quote-sync-dry-run` обновлена до 3.12.9 и возвращает `approval_advisory`; она по-прежнему read-only.
- Controlled quote write, складские движения, резервы, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.8 — Clients/quotes remote dry-run groundwork

- Добавлен безопасный слой подготовки sync для клиентов и проектов без записи в Supabase.
- Новый модуль `QuoteBackendSyncPack` строит `clients / quotes / quote_sections / quote_items / audit_log` payload, preview и `payload_checksum`.
- Добавлена Edge Function `quote-sync-dry-run`: read-only remote diff по `clients` и `quotes`, `remote_write_executed:false`.
- Добавлена миграция `202605120003_quote_backend_sync_dry_run.sql` с local_id-совместимостью для quote child/audit rows и helper `feg_can_write_quotes()`.
- Backend / Sync получил блок `Clients/quotes remote dry-run`; `FEG_SERVER_TEST_KEY` вводится временно и не сохраняется.
- Server Test Harness получил шаг `quoteDryRun` и кнопку `Только quote dry-run`.
- Складские движения, резервы, controlled quote write, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.7 — Sync audit and rollback safety

- Добавлен слой финального audit после post-write verification.
- `SupabaseBackendPack` получил `buildEquipmentSyncAuditTrail()`, `buildEquipmentSyncRollbackHints()`, `saveEquipmentSyncAuditSnapshot()` и `readEquipmentSyncAuditSnapshots()`.
- В UI backend pack добавлены статус `Sync audit`, экспорт `feg_equipment_sync_audit.json`, сохранение audit snapshot и экспорт `feg_equipment_sync_rollback_hints.json`.
- Rollback hints не выполняют автоматический rollback: они только показывают, что делать при pending insert/update/remote_only.
- `equipment-controlled-write` теперь возвращает `sync_audit_required` и `rollback_hints` после успешного controlled write.
- `equipment-sync-dry-run` обновлён до 3.12.7.
- LED-крепёж/печеньки/болты, складские движения, автоматическая browser-запись и старый v3-интерфейс не менялись.

## v3.12.6 — Post-write verification loop

- Добавлен post-write verification после controlled equipment write.
- `SupabaseBackendPack` получил `buildEquipmentPostWriteVerificationRequest()`, `buildEquipmentPostWriteVerificationReadiness()`, `runEquipmentPostWriteVerification()`, `summarizePostWriteVerificationReport()`, `savePostWriteVerificationReport()` и `readPostWriteVerificationReports()`.
- В UI backend pack добавлены статус `Post-write verify`, кнопка `Проверить после write` и экспорт `feg_equipment_post_write_verification.json`.
- `equipment-sync-dry-run` теперь принимает verification mode `verify_after_controlled_write=true` и возвращает `post_write_verification_gate`.
- Проверка считается успешной только если после write `remote_diff` показывает `insert=0`, `update=0`, `remote_only=0` и есть unchanged rows.
- `equipment-controlled-write` возвращает `post_write_verification_required` и подсказку следующего шага.
- Исправлено сохранение approval package в localStorage: `saveEquipmentWriteApprovalPackage()` теперь пишет JSON в правильный ключ `fegV4EquipmentWriteApprovalPackage`.
- Post-write verification остаётся read-only; LED-крепёж/печеньки/болты, складские движения, автоматическая browser-запись и старый v3-интерфейс не менялись.

## v3.12.5 — Controlled write Edge runner + post-write reports

- Добавлен controlled write runner в `SupabaseBackendPack`: `buildEquipmentControlledWriteExecutionRequest()`, `buildEquipmentControlledWriteReadiness()`, `runEquipmentControlledWriteEdge()`.
- В UI backend pack добавлены поле контрольной фразы `WRITE EQUIPMENT`, статус `Write runner`, кнопка `Запустить controlled write Edge` и отчёт controlled write result.
- Controlled write выполняется только через Edge Function `equipment-controlled-write`, без прямого browser upsert.
- Перед вызовом Edge Function проверяются: test key, approval package, preflight, `payload_checksum`, local controlled write plan, `dry_run=false`, контрольная фраза и наличие payload rows.
- Результаты controlled write сохраняются в локальную историю `fegV4EquipmentControlledWriteReports`; `FEG_SERVER_TEST_KEY` и фраза подтверждения не сохраняются.
- Реальная запись всё ещё невозможна без серверного env-флага `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role на Edge Function.
- Складские движения, автоматическая запись Supabase/backend, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.4 — Remote dry-run approval package + payload checksum gate

- Добавлен approval package между remote dry-run и controlled write.
- Добавлен стабильный `payload_checksum` для `suppliers` + `equipment_items`.
- `SupabaseBackendPack` получил `buildEquipmentWriteApprovalPackage()`, `compareApprovalWithCurrentPayload()` и `buildApprovedControlledWriteRequest()`.
- В UI backend pack добавлены кнопки `Одобрить payload`, `Скачать approval JSON`, `Сбросить approval`, `Скачать approved write template`.
- Edge Function `equipment-sync-dry-run` возвращает `payload_checksum`.
- Edge Function `equipment-controlled-write` требует `approval_package` и сверяет checksum перед upsert.
- Controlled write execution из статического клиента, складские движения и автоматическая Supabase/backend запись не включались.

## v3.12.3 — Remote dry-run history + controlled write preflight

- Добавлена локальная история remote dry-run reports без сохранения `FEG_SERVER_TEST_KEY`.
- Добавлен baseline для сравнения повторных dry-run запусков.
- Добавлены `summarizeRemoteDryRunReport()`, `buildRemoteDryRunHistoryReport()`, `saveRemoteDryRunBaseline()` и `buildControlledWritePreflight()`.
- В Supabase backend pack UI добавлены статусы latest report, diff insert/update/remote_only, preflight, history JSON и preflight JSON.
- Edge Function `equipment-sync-dry-run` возвращает advisory `promotion_gate`, но по-прежнему не выполняет upsert.
- Controlled write, складские движения и автоматическая Supabase/backend запись не включались.

## v3.12.2 — Remote equipment sync dry-run

- Добавлен UI-запуск remote dry-run для `equipment-sync-dry-run` из блока Supabase backend pack.
- `FEG_SERVER_TEST_KEY` вводится временно и не сохраняется.
- Edge Function `equipment-sync-dry-run` теперь строит read-only `remote_diff` против текущих `equipment_items` workspace.
- Server Test Harness получил отдельную кнопку `Только equipment dry-run`.
- Добавлена документация `docs/SUPABASE_REMOTE_EQUIPMENT_DRY_RUN.md`.
- Controlled write и прямой browser upsert по-прежнему выключены.

## v3.12.1 — Supabase backend sync hardening pack

- Добавлен backend/Supabase hardening слой для первого controlled equipment sync без автоматической записи из клиента.
- Добавлена миграция `202605120002_v4_backend_sync_hardening.sql`: `local_id` совместимость для frontend ID, `backend_sync_runs`, helper-функции, индексы и RLS для sync ledger.
- Добавлены Edge Functions `equipment-sync-dry-run` и `equipment-controlled-write`. Dry-run не пишет данные; controlled write закрыт test key, `dry_run=false`, фразой `WRITE EQUIPMENT`, clean plan, service role и env-флагом `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.
- Добавлен UI-модуль `SupabaseBackendPack`: migrations/functions checklist, backend pack JSON, Edge dry-run request и controlled write template.
- Server Test Harness теперь включает шаг `equipmentDryRun`.
- Статическая сборка по-прежнему не выполняет прямой Supabase upsert.
- Расчёты LED-крепежа/печенек/болтов, складские движения, автоматическая запись Supabase/backend и старый v3-интерфейс не менялись.

## v3.12.0 — Equipment sync completion milestone

- Одним controlled milestone добавлена ручная добивка базы оборудования перед первым sync.
- Добавлен `buildManualCompletionMatrix()` — матрица проблемных полей: вес, мощность, остатки, поставщики, подкатегории, типы, цены и replacement cost.
- В UI базы оборудования добавлены `Manual completion matrix`, фильтр «Добивка», быстрые фильтры задач, `Completion JSON`, `Patch template` и `Import patch`.
- Добавлен JSON patch workflow: `buildEquipmentPatchExport()`, `applyEquipmentPatch()`, `applyStoredEquipmentPatch()`.
- Добавлен staged diff: `buildEquipmentStagedDiff()` в EquipmentDatabase и EquipmentServerSyncQueue.
- Добавлен admin-only controlled write gate: `buildEquipmentControlledWritePlan()` и `runControlledEquipmentWrite()`. Remote write остаётся выключенным в статической сборке и требует отдельного backend executor.
- Equipment Server Sync Queue теперь скачивает `feg_equipment_staged_diff.json` и `feg_equipment_controlled_write_plan.json`.
- Data Quality Center учитывает manual completion matrix.
- Расчёты LED-крепежа/печенек/болтов, складские движения, автоматическая Supabase/backend запись и старый v3-интерфейс не менялись.

## v3.11.3 — Equipment readiness fix plan

- Добавлен `EquipmentDatabase.buildEquipmentReadinessReport()` — checklist добивки базы перед реальным `equipment_items` sync.
- Добавлен safe cleanup: `applyEquipmentReadinessFixes()` / `applyStoredEquipmentReadinessFixes()` безопасно сохраняют нормализацию, приводят коды к сериям с сохранением legacy-кодов и пересчитывают derived-поля.
- Реальные данные — вес, мощность, остатки, поставщики и цены — не заполняются автоматически и остаются ручной добивкой.
- В UI базы оборудования добавлены `Sync readiness checklist`, кнопки `Readiness JSON` и `Safe cleanup`.
- Equipment Server Sync Queue добавляет `readiness_report` в queue report, dry-run и staged queue, а также скачивает `feg_equipment_sync_readiness.json`.
- Data Quality Center учитывает readiness manual/safe-fix tasks.
- Расчёты LED-крепежа/печенек/болтов, складские остатки, автоматическая Supabase/backend запись и старый v3-интерфейс не менялись.

# FEG Stage PRO ChangeLog

## v3.11.2 — Equipment sync preview

Изменения:
- добавлен `buildEquipmentSyncPreview()` для preview будущего upsert в Supabase `equipment_items` без серверной записи;
- preview показывает по каждой позиции статус `ready` / `warning` / `blocked`, blockers, warnings и подготовленную snake_case строку payload;
- проверяются обязательные поля, дубли `id`/`code`, соответствие кода категории, нестандартные подкатегории, конфликт type/category, subrent без поставщика и coverage обязательных полей;
- UI базы оборудования получил блок «Supabase sync preview» и кнопку `Sync preview JSON`;
- Equipment Server Sync Queue теперь включает `sync_preview`, умеет скачать preview JSON и сохраняет preview в staged queue;
- Data Quality Center учитывает blockers/warnings из sync preview;
- расчёты LED-крепежа, складские остатки, автоматическая Supabase/backend запись и старый v3-интерфейс не менялись.

## v3.11.1 — Equipment type sync schema

Изменения:
- добавлен справочник `ITEM_TYPE_DEFINITIONS` для типов оборудования с label, допустимыми категориями и единицей измерения по умолчанию;
- добавлены `TYPE_ALIASES` и нормализация типов: `кабель`, `услуга`, `кабинет`, `пульт` и т.д. приводятся к стабильным type id;
- добавлен вывод типа по категории/подкатегории, если тип не указан;
- добавлены `buildTypeReport()` и `buildSyncSchemaReport()` для диагностики type/category и готовности `equipment_items`;
- добавлен `mapItemToEquipmentRow()` / `mapEquipmentRowToItem()` для snake_case payload будущего Supabase sync;
- Equipment Server Sync Queue теперь включает `type_report` и `schema_report`;
- UI базы оборудования получил блок «Типы и sync schema» и кнопку `Sync schema JSON`;
- расчёты LED-крепежа, складские остатки, backend/Supabase запись и старый v3-интерфейс не менялись.

## v3.11.0 — Equipment category normalization

Изменения:
- добавлен слой нормализации категорий базы оборудования: алиасы вроде `звук`, `свет`, `кабели`, `услуги`, `фермы`, `LED` приводятся к стабильным `category id`;
- исходная категория из импорта сохраняется в `meta.originalCategory`, если она была приведена из алиаса;
- добавлен `buildCategoryReport()` для проверки префиксов кодов, нестандартных подкатегорий, дублей и нормализованных алиасов;
- в UI базы оборудования добавлен блок «Нормализация категорий» и экспорт `Категории JSON`;
- Data Quality Center теперь подсвечивает код не по категории, нестандартные подкатегории и нормализованные алиасы;
- расчёты LED-крепежа, складские остатки, backend/Supabase запись и старый v3-интерфейс не менялись.

## v3.10.9 — Equipment legacy search hardening

Изменения:
- UI-поиск базы оборудования теперь учитывает `meta.legacyCode` и `meta.legacyCodes`, а не только основной `code`;
- добавлен smoke-check: recoded custom item остаётся доступен по старому legacy-коду;
- подтверждены добавление/редактирование позиции и генерация следующего кода по выбранной категории;
- расчёт LED-крепежа, складские остатки, backend/Supabase запись и старый v3-интерфейс не менялись.

## v3.10.8 — Equipment code catalog cleanup

Изменения:
- вся demo/Excel-база оборудования переведена на единую кодировку по категориям: STG/TRS/LED/SND/MIX/MON/BKL/LGT/COM/SRV/CNS + порядковый номер;
- старые коды вроде XLSX-001, LED-640-P4, C2-67, POWERCON-SCHUKO сохранены в meta.legacyCode/meta.legacyCodes для совместимости и поиска;
- EquipmentDatabase теперь умеет искать позиции по новому и старому коду;
- добавлена миграция существующей localStorage-базы на новую кодировку;
- в базе оборудования добавлена кнопка «Привести коды»;
- smoke-checks обновлены на новую схему кодов.

# CHANGELOG

## v3.12.1 — Supabase backend sync hardening pack

- Добавлен backend/Supabase hardening слой для первого controlled equipment sync без автоматической записи из клиента.
- Добавлена миграция `202605120002_v4_backend_sync_hardening.sql`: `local_id` совместимость для frontend ID, `backend_sync_runs`, helper-функции, индексы и RLS для sync ledger.
- Добавлены Edge Functions `equipment-sync-dry-run` и `equipment-controlled-write`. Dry-run не пишет данные; controlled write закрыт test key, `dry_run=false`, фразой `WRITE EQUIPMENT`, clean plan, service role и env-флагом `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true`.
- Добавлен UI-модуль `SupabaseBackendPack`: migrations/functions checklist, backend pack JSON, Edge dry-run request и controlled write template.
- Server Test Harness теперь включает шаг `equipmentDryRun`.
- Статическая сборка по-прежнему не выполняет прямой Supabase upsert.
- Расчёты LED-крепежа/печенек/болтов, складские движения, автоматическая запись Supabase/backend и старый v3-интерфейс не менялись.

## v3.10.6 — Equipment code generator

- Added automatic equipment code generation by selected category.
- Codes use a three-letter category prefix plus sequence number, e.g. `STG-001`, `TRS-001`, `LED-001`, `SND-001`.
- New equipment items receive the next available code automatically.
- Changing category in a new item updates the generated code until the user edits the code manually.
- Added a manual **Generate** button in the equipment editor card.
- Updated equipment editor documentation and smoke checks.

# FEG Stage PRO Changelog

## v3.10.5 — Equipment database editor

- В базе оборудования добавлена явная кнопка `Добавить позицию`.
- Для каждой позиции добавлена карточка редактирования через модальное окно.
- Редактор поддерживает код, название, категорию, тип, производителя, модель, единицу измерения, склад, резерв, вес, мощность, цены, источник, поставщика, комментарий и активность.
- В таблице и мобильных карточках добавлены действия `Редактировать`.
- Добавлена проверка обязательных полей и дублей кода.
- Быстрое inline-добавление заменено полноценной карточкой позиции.
- Расчёты, складские остатки, backend-запись и старый v3-интерфейс не менялись.

## v3.10.4 — Equipment Server Sync groundwork

- Добавлен модуль `EquipmentServerSyncQueue`.
- База оборудования получила отдельную staged queue для будущей синхронизации `equipment_items`.
- В Backend / Sync добавлен блок Equipment Server Sync groundwork.
- Добавлены dry-run, validation, staged payload и export queue/payload JSON.
- Реальная запись в Supabase не включена; слой работает безопасно через подготовку и отчёты.
- Расчёты, складские остатки и старый v3-интерфейс не менялись.

## v3.10.3 — Performance feedback for projects and documents

- Добавлен модуль `BusyIndicator` с видимым прогресс-индикатором для тяжёлых локальных операций.
- История проектов показывает состояние выполнения при сохранении, открытии, экспорте, удалении и смене статуса.
- Оптимизирован `QuoteProjectStorage`: добавлен кэш чтения/нормализации localStorage.
- Смена статуса проекта больше не добавляет лишнее событие `project_saved`, а сохраняет только `status_changed`.
- Центр документов сначала показывает loading-состояние и только потом собирает тяжёлые HTML/JSON-документы.
- Добавлен прогресс при скачивании больших document packs.
- Расчёты, складские остатки, backend-запись и старый v3-интерфейс не менялись.

## v3.10.2 — Real Quotes Sync groundwork

- Добавлен модуль `QuoteServerSyncQueue`.
- Добавлен sync-status проектов: `local_only`, `ready_to_sync`, `staged`, `synced`, `sync_error`.
- В `Backend / Sync` добавлен блок очереди серверной синхронизации проектов.
- В истории проектов добавлены sync-badges.
- Добавлена локальная staged queue `fegV4QuoteServerSyncQueue`.
- Реальная запись в Supabase не включена; слой работает через dry-run и staged payload.
- Расчёты, складские остатки и старый v3-интерфейс не менялись.

# Changelog

## v3.12.9 — Clients/quotes approval package

- Добавлен approval package для будущего clients/quotes controlled write без включения самой записи.
- `QuoteBackendSyncPack` получил `fegV4QuoteWriteApprovalPackage`, `buildQuoteWriteApprovalPackage()`, `compareQuoteApprovalWithCurrentPayload()`, `buildApprovedQuoteWriteTemplate()`, save/read/clear helpers.
- UI-блок `Clients/quotes remote dry-run` получил статус `Approval`, кнопки `Одобрить quote payload`, `Approval JSON`, `Сбросить approval`, `Approved template`.
- Approval создаётся только после clean remote dry-run, готового `remote_diff`, наличия `payload_checksum`, quotes в payload и совпадения текущего payload с dry-run checksum.
- Если клиент/проект/quote payload меняется после approval, approval становится stale и approved template блокируется до нового dry-run.
- Edge Function `quote-sync-dry-run` обновлена до 3.12.9 и возвращает `approval_advisory`; она по-прежнему read-only.
- Controlled quote write, складские движения, резервы, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.5 — Controlled write Edge runner + post-write reports

- Добавлен controlled write runner в `SupabaseBackendPack`: `buildEquipmentControlledWriteExecutionRequest()`, `buildEquipmentControlledWriteReadiness()`, `runEquipmentControlledWriteEdge()`.
- В UI backend pack добавлены поле контрольной фразы `WRITE EQUIPMENT`, статус `Write runner`, кнопка `Запустить controlled write Edge` и отчёт controlled write result.
- Controlled write выполняется только через Edge Function `equipment-controlled-write`, без прямого browser upsert.
- Перед вызовом Edge Function проверяются: test key, approval package, preflight, `payload_checksum`, local controlled write plan, `dry_run=false`, контрольная фраза и наличие payload rows.
- Результаты controlled write сохраняются в локальную историю `fegV4EquipmentControlledWriteReports`; `FEG_SERVER_TEST_KEY` и фраза подтверждения не сохраняются.
- Реальная запись всё ещё невозможна без серверного env-флага `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role на Edge Function.
- Складские движения, автоматическая запись Supabase/backend, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.10.7 — Equipment code generator fix

- Исправлена кнопка «Сгенерировать» в карточке оборудования.
- `EquipmentDatabase` теперь явно экспортирует `generateNextCode()` и `getCategoryCodePrefix()`, поэтому UI-генератор кода получает доступ к логике префиксов категорий.
- Принудительная генерация кода работает и для новых, и для редактируемых позиций.
- Расчёты, sync-очереди, backend-запись и старый v3-интерфейс не менялись.

## v3.10.1 — Server Test Harness

- Added `ServerTestHarness` for safe backend checks without registering a real admin.
- Added Edge Function drafts: `backend-health`, `test-seed-workspace`, `test-write-quote`, `test-rls-check`, `test-cleanup`.
- Added Backend / Sync UI block for health → test seed → dry write → RLS check → cleanup.
- Test key is entered manually, sent only as `x-feg-test-key` and is not stored in localStorage.
- Added server test plan/report JSON exports and documentation.
- Remote backend writes remain disabled by default; local/demo auth and current calculations are unchanged.

## v3.10.0 — Supabase Auth & Profiles groundwork

- Added `SupabaseAuthAdapter` as a safe bridge toward real Supabase Auth.
- Added auth readiness report for runtime config, SDK, profiles and invite keys.
- Added Supabase-ready profile and invite key payload builders.
- Added dry-run email magic link and OAuth Google/Apple methods that stay disabled unless auth is explicitly configured.
- Mounted Auth / Profiles readiness inside Backend / Sync.
- Updated app version, service worker cache and smoke checks.
- Local/demo auth remains the default; no backend writes and no forced Supabase Auth.

# FEG Stage PRO v3.9.9 — Backend First Write Dry Run+

Изменения:
- добавлен модуль BackendWriteDryRun;
- усилена консоль Backend / Sync перед первой реальной записью в Supabase;
- добавлен ordered write plan по таблицам;
- добавлена проверка обязательных полей, дублей id, workspace_id и ссылок quote/equipment/supplier;
- добавлен SQL preview с rollback/dry-run;
- добавлены экспорты write dry-run report, SQL preview и backend payload;
- реальная запись в Supabase по-прежнему не выполняется без явного включения remote sync и non-dry-run режима.

---

# FEG Stage PRO v3.9.8 — PDF Template Engine

- Added `PdfTemplateEngine` with styled HTML templates for customer proposal, technical sheet, warehouse sheets, reservation, stock movement, workflow, subrent and calendar drafts.
- Document Center now previews rendered HTML documents and keeps the raw text version available below the preview.
- Added HTML download per document and HTML document-pack export.
- Updated app version, manifest, service worker cache and smoke-checks.

---

# FEG Stage PRO v3.9.7 — App Navigation & Command Center

Изменения:
- добавлен Command Center для быстрого поиска по разделам, проектам, клиентам, оборудованию и документам;
- результаты фильтруются по роли пользователя;
- добавлен раздел «Поиск / Команды» в role-based dashboard;
- команды умеют открывать разделы и проекты;
- добавлена документация docs/COMMAND_CENTER.md;
- обновлены smoke-checks.

---

# FEG Stage PRO v3.9.6 — Reports Center

- Добавлен ReportsCenter для операционной сводки по проектам, клиентам, складу, базе оборудования и качеству данных.
- Добавлен раздел dashboard «Отчёты».
- Добавлен JSON export операционного отчёта.
- Данные, расчёты, складские остатки и backend-запись не менялись.

---

# FEG Stage PRO v3.9.5 — Data Quality Center

Изменения в этой версии:
- добавлен DataQualityCenter для локального контроля качества данных;
- проверяются база оборудования, клиенты и проекты;
- добавлен раздел «Контроль данных» в v4 dashboard;
- добавлен JSON-экспорт отчёта качества;
- добавлены smoke-checks на аудит данных и права доступа;
- расчёты, складские остатки, LED-печеньки/болты и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.9.4 — Admin Control Center

Изменения в этой версии:
- добавлен модуль `AdminControlCenter`;
- dashboard-раздел `Админка` теперь монтирует единый Admin Control Center поверх `AdminShell`;
- добавлены health-метрики доступа: active admins, active users, active invites и общий score;
- добавлены матрица ролей и сводка invite-ключей;
- добавлен export access pack с `profiles`, `invite_keys`, `role_matrix`, `invite_summary` и `health`;
- добавлены быстрые действия Demo seed и export access pack;
- workspace-сводка показывает workspace id, company name, количество профилей и ключей;
- добавлена документация `docs/ADMIN_CONTROL_CENTER.md`;
- backend, OAuth, расчёты и складские остатки не менялись.

# FEG Stage PRO v3.9.2 — Supabase Connection & Sync Console

- добавлен модуль `SupabaseSyncConsole`;
- добавлен dashboard-раздел `Backend / Sync` для admin;
- добавлены connection report, readiness report и dry-run report для будущего Supabase sync;
- добавлен экспорт `backend_sync_payload` и readiness JSON из консоли;
- добавлено сохранение local sync snapshots без записи в Supabase;
- добавлена документация `docs/SUPABASE_SYNC_CONSOLE.md`;
- remote sync по-прежнему выключен по умолчанию, реальная запись в backend не выполняется.

# FEG Stage PRO v3.9.1 — PDF Center & Documents Hub

Изменения в этой версии:
- добавлен модуль `DocumentCenter`;
- добавлен отдельный раздел dashboard «Документы»;
- все документы проекта собраны в один центр: КП, техлист, складские листы, резерв, движение склада, workflow, субаренда, календарь, JSON и backend payload;
- добавлены фильтры по группам документов, предпросмотр, копирование и скачивание;
- добавлен manifest JSON и единый document download pack;
- dashboard и права получили раздел `documents`;
- расчёты, складские остатки и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.9.0 — Warehouse & Project Operations Hub

Изменения в этой версии:
- добавлен модуль `WarehouseOperationsHub`;
- раздел «Склад / наличие» превращён в рабочий экран «Склад / Операции»;
- в одном месте собраны проекты, readiness, дефицит, субаренда, резерв, движения склада и warehouse workflow;
- добавлены действия смены складского статуса проекта;
- добавлен export складского пакета проекта;
- добавлена документация `docs/WAREHOUSE_OPERATIONS_HUB.md`;
- остатки и расчёты не меняются автоматически.

---

# FEG Stage PRO v3.8.42 — warehouse workflow states

Изменения в этой версии:
- добавлен модуль `WarehouseWorkflow`;
- добавлены локальные статусы складской подготовки: черновик, к сборке, собирается, собрано, выдано, возвращено, закрыто, отменено;
- финальная сводка получила документы `Складской workflow` и `warehouse_workflow JSON`;
- export pack теперь содержит `warehouse_workflow`;
- backend sync payload теперь содержит `rows.warehouse_workflows`;
- добавлена документация `docs/WAREHOUSE_WORKFLOW.md`;
- остатки и расчёты не меняются автоматически.

---

# FEG Stage PRO v3.8.41 — stock movement planner

Изменения в этой версии:
- добавлен локальный ReservationPlanner под будущую таблицу reservations;
- финальная сводка получила кнопку «План резерва склада»;
- Export pack JSON теперь содержит reservation_plan;
- backend_sync_payload теперь содержит rows.reservations;
- резерв считается как план: нужно / можно зарезервировать / дефицит / субаренда / не сопоставлено;
- остатки автоматически не меняются;
- расчёты сцены, ферм, LED, транспорт и старый v3-интерфейс не трогались.

---

# FEG Stage PRO v3.8.39 — project readiness checklist

Изменения в этой версии:
- добавлен модуль ProjectReadinessChecklist;
- в финальной сводке мастера появился checklist готовности проекта;
- проверяются обязательные поля клиента, проекта, площадки, даты и транспорта;
- проверяются выбранные разделы, складской лист, дефицит, субаренда и несопоставленные позиции;
- добавлена кнопка экспорта Checklist готовности в документы финальной сводки;
- export pack дополнен readiness_checklist;
- добавлены smoke-checks на readiness-модуль и UI финальной сводки.

---

# FEG Stage PRO v3.8.38 — equipment picker UX

Изменения:
- улучшен шаг «Звук, свет, бэклайн, услуги» в линейном мастере сметы;
- позиции из единой базы теперь сгруппированы по категориям;
- добавлены бейджи выбранных разделов сметы;
- добавлена мини-корзина: свой склад / ручные и субаренда / дефицит;
- ручные и субарендные позиции расширены до трёх быстрых строк;
- сохранение ручных строк теперь собирает массив manualItems;
- расчёты сцены, ферм, LED, транспорт и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.37 — project timeline dashboard

- Добавлен модуль `ProjectTimelineView` для карточек проекта, timeline и health-badge.
- Раздел «Проекты / история» получил фильтр по клиенту, расширенную строку проекта и последние события.
- Для мобильных экранов проекты показываются карточками вместо широкой таблицы.
- `QuoteProjectStorage.listProjects()` теперь поддерживает фильтр `clientId`.
- Подготовлен UI-слой под будущий CRM/project activity workflow без изменения расчётов.

---

# FEG Stage PRO v3.8.36 — client project links

Изменения:
- добавлен модуль ClientProjectLinks для связи CRM-клиентов и проектов/смет;
- карточка клиента теперь показывает связанные проекты и быстрый переход в проект;
- добавлен JSON export связки клиент → проекты;
- история проектов показывает клиентскую карточку/контакты и export клиентской связки;
- QuoteProjectStorage сохраняет clientId/email/phone на уровне project record для будущих clients/quotes связей;
- подготовлен локальный слой под будущие отношения clients ↔ quotes в Supabase.

Проверки:
- node --check src/legacy-app.js;
- node --check src/modules/*.js;
- node --check sw.js;
- node --check scripts/*.mjs;
- node scripts/check.mjs;
- unzip -t.

---

# FEG Stage PRO v3.8.35 — v4 clients CRM panel

Изменения:
- добавлена полноценная v4-панель клиентов вместо заглушки;
- клиентская база теперь доступна из role-based dashboard для manager/admin;
- добавлены поиск, карточка клиента, редактирование, удаление и JSON export;
- добавлена связь клиента с историей проектов и быстрый перенос клиента в активный черновик сметы;
- на мобильном клиенты отображаются карточками вместо широкой таблицы;
- расчёты сцены, ферм, LED, транспорт, печеньки/болты и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.34 — responsive equipment cards

Изменения в этой версии:
- таблицы v4 получили чуть меньший базовый шрифт `.875rem`, ближе к размеру текста в чате;
- desktop/tablet: таблица оборудования остаётся широкой и читаемой, со скроллом внутри карточки при нехватке места;
- mobile: база оборудования показывается карточками вместо многоколонной таблицы;
- длинные названия оборудования переносятся словами, а не по буквам;
- коды, количества и короткие значения не ломаются на символы;
- расчёты, база, импорт, роли и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.33 — readable table layout fix

Изменения в этой версии:
- исправлена читаемость таблиц v4-preview после v3.8.32;
- убрано принудительное сжатие таблиц до микроколонок и перенос по буквам;
- широкие таблицы теперь скроллятся внутри своей карточки, не распирая страницу;
- таблица базы оборудования сгруппирована в более крупные читаемые колонки: категория/тип, склад, вес/мощность, цена/замена;
- коды, количества и короткие значения держатся одной строкой;
- длинные наименования переносятся словами, а не по 1–2 буквы;
- расчёты, данные, роли, база оборудования, импорт/экспорт и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.31 — import restore center

- Added `ImportRestoreCenter` for local import/restore of project export packs.
- Supports `feg-stage-pro-project-export-pack`, `feg-stage-pro-backend-sync-payload`, project records and raw quote JSON.
- Project history UI now includes an Import/Restore panel with JSON textarea, file input, validation and restore action.
- Restored projects are saved into local project history and active quote draft.
- Imported suppliers from export packs are upserted into the local supplier directory.
- Import history is stored locally under `fegV4ImportRestoreHistory`.
- Existing calculations and v3 UI are unchanged.

# FEG Stage PRO v3.8.30 — backend sync adapter draft

- Added `BackendSyncAdapter` as the first safe bridge between local v3.8.x data and the future Supabase backend.
- Added runtime backend config detection, local/supabase mode selection and guarded Supabase client creation.
- Added Supabase-ready row mappers for clients, quotes, quote sections, quote items, equipment items, suppliers and audit log rows.
- Added backend sync payload export and local sync snapshots for dry-run testing.
- Project export packs now include `backend_sync_payload` alongside quote, quote_items, documents, calendar_ics, suppliers and audit_log.
- Remote sync remains disabled unless explicitly configured; local app behavior stays unchanged.
- No changes to stage, truss, LED, transport calculations, bolt/bracket logic, or legacy v3 UI.

---

# FEG Stage PRO v3.8.29 — Supabase v4 schema draft

- Added the first additive Supabase schema draft for the v4 architecture.
- Added migration `supabase/migrations/202605120001_v4_schema_draft.sql`.
- Covered `workspaces`, `profiles`, `invite_keys`, `equipment_categories`, `equipment_items`, `clients`, `quotes`, `quote_sections`, `quote_items`, `suppliers`, `stock_movements`, `reservations`, `calendar_integrations` and `audit_log`.
- Added workspace-scoped RLS draft helpers and role-based policy placeholders.
- Added schema notes and documentation for backend review.
- Backend is not wired to the UI yet; local v3.8.x behavior remains unchanged.
- No changes to stage, truss, LED, transport calculations, bolt/bracket logic, or legacy v3 UI.

---

# FEG Stage PRO v3.8.28 — local admin access layer

- Added a local AdminShell access-management layer for future Supabase `profiles` and `invite_keys`.
- Added local profiles with roles, workspace IDs and status fields.
- Added invite key validation, consumption, disabling, usage limits and expiration status.
- Added first-admin bootstrap helper that reads the key from runtime config/backend env, not from hard-coded client source.
- Added access-state JSON export for migration/testing.
- Added smoke-checks for profiles, invite keys, first admin bootstrap and access export.
- No changes to stage, truss, LED, transport calculations, bolt/bracket logic, or legacy v3 UI.

---

# FEG Stage PRO v3.8.27 — role-based user dashboard

- Added a role-based v4 User Dashboard as the main menu after Demo/Auth login.
- Dashboard now exposes sections by role: quick calculators, quote wizard, equipment database, warehouse, projects, clients, settings and admin.
- Added default landing section per role: admin → admin, manager → quote, technician → quick, warehouse → warehouse, viewer → projects.
- Reworked V4AppShell to render one active section from the dashboard instead of dumping every panel at once.
- Added warehouse dashboard panel with availability/deficit context and quick jumps to projects/equipment.
- Added visible role hints and hidden-section disclosure for role testing without real admin login.
- Kept legacy v3 UI, stage/truss/LED calculations, transport, печеньки/болты, PDFs and existing storage untouched.

# FEG Stage PRO v3.8.26 — workspace settings layer

Изменения:
- добавлен модуль `WorkspaceSettings` для локальных настроек workspace, профиля, документов, календаря и dev-переключателей;
- добавлен модуль `SettingsPanel` и панель «Настройки workspace» в v4-preview;
- настройки готовы к будущему переносу в Supabase/workspaces: workspaceId, workspaceName, companyName, manager contacts, document settings, calendar template, dev flags;
- `CalendarIntegration` теперь может использовать шаблоны события из настроек workspace;
- добавлен JSON export настроек;
- обновлены smoke-checks на настройки, шаблоны календаря и UI-панель.

---

# FEG Stage PRO v3.8.25 — calendar integration draft

Изменения:
- добавлен модуль `CalendarIntegration` для подготовки события проекта под будущий Google Calendar;
- черновик календаря теперь собирается из quote: название `FEG - <Название проекта>`, дата, адрес, клиент, состав, вес, мощность и статус;
- добавлен экспорт `.ics` для импорта в Google Calendar, Apple Calendar, Outlook и другие календари без OAuth;
- в финальной сводке добавлена кнопка `ICS календаря`;
- export pack теперь содержит `calendar_ics`;
- обновлены smoke-checks на CalendarIntegration, ICS и кнопку календаря.

---

# FEG Stage PRO v3.8.24 — project audit log export pack

Изменения:
- добавлен ProjectAuditLog для локального audit_log слоя под будущую таблицу Supabase;
- события истории проекта теперь включают actorId / actorRole / actorName из Demo Auth;
- сохранение проекта пишет project_created / project_saved в history;
- в финальной сводке добавлены export-кнопки audit_log JSON и Export pack JSON;
- пакет экспорта проекта содержит quote, quote_items, документы, текстовые документы, поставщиков и audit_log;
- в истории проектов добавлены быстрые кнопки Export и Audit для каждого проекта;
- добавлены smoke-checks на audit_log и export pack.

---

# FEG Stage PRO v3.8.23 — quote items supplier directory

Изменения в этой версии:
- добавлен локальный справочник поставщиков `SupplierDirectory`;
- поставщики автоматически выводятся из базы оборудования/Excel-импорта по `supplierName`;
- добавлены локальные операции поиска, экспорта и upsert поставщика;
- добавлен модуль `QuoteItemBuilder` для Supabase-ready структуры `quote_items`;
- `quote_items` получает `quote_id`, `section_key`, `item_id`, `source_type`, `supplier_id`, `supplier_name`, количество, цены, вес, мощность, наличие, дефицит и субаренду;
- в финальной сводке добавлена кнопка `quote_items JSON`;
- обновлены smoke-checks на поставщиков и экспорт quote_items;
- расчёты сцены, ферм, LED, печеньки/болты и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.22 — subrent planning layer

Изменения в этой версии:
- добавлен модуль `SubrentPlanner` для формирования плана субаренды из дефицита и ручных субарендных позиций;
- субаренда теперь хранит поля: поставщик, цена субаренды, цена клиенту, маржа и примечание;
- лист субаренды теперь включает не только явно выбранную субаренду, но и позиции с дефицитом, которые нужно закрыть;
- в финальной сводке добавлена кнопка `План субаренды`;
- документы и складские листы получили поля `supplierId`, `supplierName`, `subrentPrice`, `clientPrice`, `margin`;
- добавлены smoke-checks на план субаренды, группировку по поставщикам и текстовый документ;
- расчёты сцены, ферм, LED, печеньки/болты и старый v3-интерфейс не менялись.

---

# FEG Stage PRO v3.8.21 — availability deficit prototype

Изменения в этой версии:
- добавлен модуль `AvailabilityChecker` для проверки потребности по единой базе оборудования;
- складские листы теперь обогащаются полями: нужно, доступно, остаток, резерв, дефицит, рекомендуемая субаренда;
- общий складской лист, дефицит и документы используют сопоставление с `EquipmentDatabase`;
- добавлены статусы наличия: ok, deficit, subrent, unmatched;
- строки без сопоставления с базой помечаются отдельно, чтобы их можно было завести в справочник;
- обновлены smoke-checks на дефицит, субаренду, Excel-позиции и складские документы;
- расчёты сцены, ферм, LED, печеньки/болты и старый v3-интерфейс не менялись.

---

# Changelog

## v3.12.9 — Clients/quotes approval package

- Добавлен approval package для будущего clients/quotes controlled write без включения самой записи.
- `QuoteBackendSyncPack` получил `fegV4QuoteWriteApprovalPackage`, `buildQuoteWriteApprovalPackage()`, `compareQuoteApprovalWithCurrentPayload()`, `buildApprovedQuoteWriteTemplate()`, save/read/clear helpers.
- UI-блок `Clients/quotes remote dry-run` получил статус `Approval`, кнопки `Одобрить quote payload`, `Approval JSON`, `Сбросить approval`, `Approved template`.
- Approval создаётся только после clean remote dry-run, готового `remote_diff`, наличия `payload_checksum`, quotes в payload и совпадения текущего payload с dry-run checksum.
- Если клиент/проект/quote payload меняется после approval, approval становится stale и approved template блокируется до нового dry-run.
- Edge Function `quote-sync-dry-run` обновлена до 3.12.9 и возвращает `approval_advisory`; она по-прежнему read-only.
- Controlled quote write, складские движения, резервы, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.5 — Controlled write Edge runner + post-write reports

- Добавлен controlled write runner в `SupabaseBackendPack`: `buildEquipmentControlledWriteExecutionRequest()`, `buildEquipmentControlledWriteReadiness()`, `runEquipmentControlledWriteEdge()`.
- В UI backend pack добавлены поле контрольной фразы `WRITE EQUIPMENT`, статус `Write runner`, кнопка `Запустить controlled write Edge` и отчёт controlled write result.
- Controlled write выполняется только через Edge Function `equipment-controlled-write`, без прямого browser upsert.
- Перед вызовом Edge Function проверяются: test key, approval package, preflight, `payload_checksum`, local controlled write plan, `dry_run=false`, контрольная фраза и наличие payload rows.
- Результаты controlled write сохраняются в локальную историю `fegV4EquipmentControlledWriteReports`; `FEG_SERVER_TEST_KEY` и фраза подтверждения не сохраняются.
- Реальная запись всё ещё невозможна без серверного env-флага `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role на Edge Function.
- Складские движения, автоматическая запись Supabase/backend, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.10.7 — Equipment code generator fix

- Исправлена кнопка «Сгенерировать» в карточке оборудования.
- `EquipmentDatabase` теперь явно экспортирует `generateNextCode()` и `getCategoryCodePrefix()`, поэтому UI-генератор кода получает доступ к логике префиксов категорий.
- Принудительная генерация кода работает и для новых, и для редактируемых позиций.
- Расчёты, sync-очереди, backend-запись и старый v3-интерфейс не менялись.

## v3.10.1 — Server Test Harness

- Added `ServerTestHarness` for safe backend checks without registering a real admin.
- Added Edge Function drafts: `backend-health`, `test-seed-workspace`, `test-write-quote`, `test-rls-check`, `test-cleanup`.
- Added Backend / Sync UI block for health → test seed → dry write → RLS check → cleanup.
- Test key is entered manually, sent only as `x-feg-test-key` and is not stored in localStorage.
- Added server test plan/report JSON exports and documentation.
- Remote backend writes remain disabled by default; local/demo auth and current calculations are unchanged.

## v3.8.20 — Excel equipment database import

- Imported 97 equipment rows from `FEG_БАЗА оборудования и формирование Смет beta v0.98 Clear.xlsx`, sheet `База`, into the local v4 equipment seed.
- Mapped Excel columns to the app `equipment_items` prototype: category, subcategory, type, code, name, unit, stock, weight, power consumption, rental price, source, status and Excel metadata.
- Preserved the existing handcrafted demo stage/truss/LED seed items and appended Excel positions as `XLSX-001` … `XLSX-097`.
- Added `TestFixtures.EXCEL_EQUIPMENT_ITEMS` and smoke-checks for imported FBT MUSE, dLive C3500 and Robe/DMX search cases.
- Added `docs/excel_equipment_import_summary.json` as a reviewable import summary.
- Existing stage/truss/LED calculations, LED cookies/bolts logic, v3 UI and PDFs were not changed.

## v3.8.19 — Local equipment database prototype

- Strengthened the local `EquipmentDatabase` prototype as a v4 `equipment_items` bridge.
- Added Supabase-ready aliases: `stock_qty`, `reserved_qty`, `available_qty`, `weight_kg`, `power_w`, `rental_price`, `replacement_cost`, `is_active`.
- Added richer demo inventory for stage legs, truss segments, corners, cubes, bases, C2-67, splints, LED link 220, PowerCON, RJ45, cookies and M8 bolts.
- Added search, category filter, type filter, active-only filter, JSON export and local upsert form to the equipment UI.
- Equipment UI now hides prices/replacement cost for roles without `prices:view`.
- Added smoke-checks for search, code lookup, availability aliases, local upsert and JSON export.
- Existing stage/truss/LED calculations, LED cookies/bolts logic, v3 UI and PDFs were not changed.

## v3.8.18 — Stage/truss quick tech sheets

- Added QuickTechnicalSheets module for no-price technical and warehouse sheets.
- Added quick actions for stage and truss sheets in v4 quick calculators.
- Sheets read current legacy stage / block-truss results through QuoteLegacyBridge without changing calculation formulas.
- Stage/truss quick sheets expose copy/download-ready plain text.
- Updated app version, manifest, service worker cache and smoke-checks.
- Legacy v3 UI and stage/truss calculations are untouched.

---

## v3.8.17 — Project history statuses

- Усилена локальная история v4-проектов: поиск, фильтр по статусу и быстрый статус прямо в таблице.
- При смене статуса пишется событие в `quote.history` с from/to/note и временем изменения.
- Добавлена подсказка последнего изменения статуса в таблице проектов.
- Добавлена dev-памятка `docs/DEV_TESTING.md` для проверки сборок через Demo Auth без реального admin-логина.
- Обновлены smoke-checks на историю статусов и dev-документацию.
- Старый v3-интерфейс и расчёты не трогались.

---

## v3.8.16 — Final document actions

- Финальная сводка v4-мастера получила действия документов: КП клиенту, техлист, общий складской лист, складские листы по разделам, дефицит/субаренда и черновик события календаря.
- Добавлен `QuoteDocumentBuilder`: формирует текстовые заготовки документов из единой структуры `quote` без изменения расчётов сцены, ферм, LED и оборудования.
- КП содержит только клиентские разделы, транспорт и итоги; складские детали туда не попадают.
- Техлист и складские листы формируются без цен: вес, мощность, состав, коды, количество, дефицит и источник.
- Черновик календаря готовит название `FEG - <Название проекта>`, дату, локацию и описание для будущей интеграции Google Calendar.
- Обновлены smoke-checks на действия финальной сводки; старый v3-интерфейс и расчёты не трогались.

## v3.8.15 — LED technical exports without prices

- Быстрый LED-калькулятор получил техлист без цен: фактический размер, кабинеты, пиксели, вес, рабочая и пусковая мощность, кабели и крепёж.
- Добавлен складской лист LED без цен с позициями BOM, количеством, весом и примечаниями для техники/склада.
- В `LedCalculator` добавлены `buildLedTechSheet()` и `buildLedWarehouseSheet()`; оба экспортируют только технические данные без клиентских цен.
- Расчёт печенек и болтов не менялся: он по-прежнему идёт от количества LED-ног, как было специально зафиксировано в текущей схеме.
- Обновлены smoke-checks на LED-техлист и складской лист; старый v3-интерфейс и расчёты не трогались.

## v3.8.14 — Linear quote wizard guards

- Quote Wizard переведён из общего полотна в линейный пошаговый режим: клиент, объект, транспорт, состав сметы, выбранные калькуляторы и итоговая сводка.
- Добавлено состояние активного шага `quote.wizard.activeStep`; оно нормализуется через `QuoteModel` и сохраняется вместе с черновиком.
- Добавлены кнопки «Назад», «Далее» и «Сохранить шаг»; переход вперёд блокируется, если текущий обязательный шаг не заполнен.
- Поля с ошибками подсвечиваются, а над шагом показывается предупреждение по требованиям ТЗ v4.0.0.
- Шаг «Состав сметы» теперь явно показывает обязательный транспорт и оставляет следующие шаги только по выбранным разделам.
- Обновлены smoke-checks на линейную навигацию и guard-проверки; старый v3-интерфейс и расчёты не трогались.

## v3.8.13 — Transport tariffs by vehicle type

- В v4-сметчике добавлена расширяемая таблица тарифов транспорта по типам: грузовой, легковой, прицеп.
- Базовые значения оставлены по ТЗ: 4000 ₽ по городу и 35 ₽/км за город, чтобы не менять текущие итоги без явной правки тарифа.
- Расчёт транспорта теперь применяет тариф выбранного типа и сохраняет применённые значения в `quote.transport.cityPrice` и `quote.transport.pricePerKm`.
- В модель добавлены `quote.transport.tariffs`, `quote.transport.vehicleTariff`, `QuoteModel.normalizeTransportTariffs()`, `QuoteModel.getTransportTariff()` и `QuoteModel.applySelectedTransportTariff()`.
- Клиентская сводка транспорта показывает выбранный тип и конкретную ставку: городскую цену или километраж × ₽/км.
- Обновлены smoke-checks на тарифы транспорта; старый v3-интерфейс и расчёты не трогались.

## v3.8.12 — Transport vehicle type foundation

- В транспорт v4-сметчика добавлен выбор типа транспорта: грузовой, легковой, прицеп.
- По умолчанию выбран грузовой транспорт.
- Тип транспорта сохраняется в `quote.transport.vehicleType` и нормализуется через `QuoteModel`.
- В клиентской сводке транспорт теперь показывает выбранный тип вместе с городским/загородным расчётом.
- Старый рабочий интерфейс v3, расчёты сцены/ферм/LED, PDF и Supabase не менялись.

## v3.8.10 — Quote summary and warehouse pick-list foundation

- Added `QuoteSummaryBuilder` for final quote aggregation: customer rows, technical rows, section status rows, BOM collection, warnings and validation summary.
- Added `WarehousePickListBuilder` for warehouse-facing lists: all sections, per-section pick lists, deficits and subrent rows.
- Extended `QuoteWizard` summary step with a foundation final summary panel: totals, customer estimate rows, technical totals and first warehouse lists.
- Kept v3 stage/truss/LED/equipment calculation behavior unchanged; this is a v4 quote-shell aggregation layer.

## v3.8.9 — LED leg weights + equipment picker foundation

- Added LED leg weights: 2 m = 3 kg, 2.5 m = 3.6 kg, 3 m = 4 kg.
- Kept 640×640 P4 as the default LED cabinet scheme.
- Added QuoteEquipmentPicker foundation for equipment/services section: database item selection, quantities, availability, deficits, manual and subrent draft rows.
- Quote Wizard equipment section now reads/writes selected equipment into quote.sections.equipment.
- Updated PWA cache and smoke checks.

## v3.8.8 — block truss bridge hotfix

- Исправлен Quote Wizard bridge для ферм: секция `quote.sections.truss` теперь берётся только из актуального блочного конструктора v3 (`FEG35BlockConstructor`).
- Убраны fallback-ветки на старый удалённый 2D/3D расчёт ферм (`calculateTruss` / `lastTrussResult`) из v4 snapshot-моста.
- Убрана генерация старых классических BOM-строк `truss-3m / truss-2m / truss-base` из QuoteLegacyBridge.
- Текущая сцена, LED-схема, база оборудования, PDF и старый рабочий интерфейс не менялись.

## v3.8.7 — LED rigging schema + quote layout

- Quote Wizard in v4 preview moved to a full-width linear block.
- Quick calculators in v4 preview are now compact square tiles.
- LED 640×640 defaults updated: 14 kg, 320 W working power, 600 W startup power, 160×160 px per cabinet.
- LED calculation now tracks pixel resolution per cabinet and for the whole screen.
- Added PowerCON–Schuko cable calculation: ceil(cabinetCount / 10).
- Added LED legs 3 m / 2.5 m / 2 m with configurable quantity.
- LED brackets and M8×60 bolts are now calculated from legs: 4 brackets and 16 bolts per leg.
- Updated Quote Wizard LED section binding and smoke tests for the new rigging scheme.

## v3.8.6 — Quote Wizard Stage/Truss bridge

- Added `QuoteLegacyBridge.js` as a safe snapshot/BOM adapter between the existing v3 stage/truss calculators and the future v4 quote model.
- Exposed `window.FEGQuoteLegacyBridge` from `legacy-app.js` for current stage and truss snapshots without rewriting the old configurators.
- Added `QuoteSectionBinder` methods for binding live stage/truss sections into `quote.sections.stage` and `quote.sections.truss`.
- Quote Wizard preview can now pull the current stage and truss calculations into the draft quote as configured sections.
- Existing stage/truss calculations, PDFs, Supabase and the old UI remain unchanged.

## v3.8.5 — Quote Wizard section binding

- Добавлен `QuoteSectionBinder.js` для связки выбранного состава сметы с секциями `stage / truss / led / equipment`.
- LED-раздел первым подключён как живой расчёт внутри `quote.sections.led`: параметры, фактический размер, BOM, вес и мощность.
- Для сцены, ферм и оборудования добавлены placeholder-секции/мосты без подключения старых конфигураторов.
- Quote Wizard теперь показывает статус секций, общий вес и мощность.
- Старый рабочий интерфейс, расчёты сцены/ферм, PDF и Supabase не изменялись.

## v3.8.4 — Quote Wizard data model

- Added `QuoteModel` as the unified future quote object: client, project, venue, transport, selected scope, sections, totals, status and validation.
- Added `QuoteDraftStorage` for local draft autosave/list/load/delete behavior in the v4 layer.
- Expanded `QuoteWizard` preview into an editable draft panel with client, project, venue, transport, status and scope fields.
- Added base validation for required wizard steps and enabled-section resolution.
- Kept the legacy v3 UI, stage/truss calculations, PDF and Supabase flows unchanged.

## v3.8.3 — LED Calculator foundation

- Added `LedCalculator` and `LedCalculatorUI` modules.
- Added LED cabinet formats: 500×500, 640×640, 500×1000.
- Added pixel pitch variants: P2, P3, P4, P5.
- Added 50% rounding rule for requested screen width/height.
- Added LED BOM rows for cabinets, 220V links, RJ45 links, brackets and M8 bolts.
- Added LED total weight and power calculations.
- Wired LED calculator preview into the v4 shell without changing the legacy v3 UI.

# Changelog

## v3.12.9 — Clients/quotes approval package

- Добавлен approval package для будущего clients/quotes controlled write без включения самой записи.
- `QuoteBackendSyncPack` получил `fegV4QuoteWriteApprovalPackage`, `buildQuoteWriteApprovalPackage()`, `compareQuoteApprovalWithCurrentPayload()`, `buildApprovedQuoteWriteTemplate()`, save/read/clear helpers.
- UI-блок `Clients/quotes remote dry-run` получил статус `Approval`, кнопки `Одобрить quote payload`, `Approval JSON`, `Сбросить approval`, `Approved template`.
- Approval создаётся только после clean remote dry-run, готового `remote_diff`, наличия `payload_checksum`, quotes в payload и совпадения текущего payload с dry-run checksum.
- Если клиент/проект/quote payload меняется после approval, approval становится stale и approved template блокируется до нового dry-run.
- Edge Function `quote-sync-dry-run` обновлена до 3.12.9 и возвращает `approval_advisory`; она по-прежнему read-only.
- Controlled quote write, складские движения, резервы, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.5 — Controlled write Edge runner + post-write reports

- Добавлен controlled write runner в `SupabaseBackendPack`: `buildEquipmentControlledWriteExecutionRequest()`, `buildEquipmentControlledWriteReadiness()`, `runEquipmentControlledWriteEdge()`.
- В UI backend pack добавлены поле контрольной фразы `WRITE EQUIPMENT`, статус `Write runner`, кнопка `Запустить controlled write Edge` и отчёт controlled write result.
- Controlled write выполняется только через Edge Function `equipment-controlled-write`, без прямого browser upsert.
- Перед вызовом Edge Function проверяются: test key, approval package, preflight, `payload_checksum`, local controlled write plan, `dry_run=false`, контрольная фраза и наличие payload rows.
- Результаты controlled write сохраняются в локальную историю `fegV4EquipmentControlledWriteReports`; `FEG_SERVER_TEST_KEY` и фраза подтверждения не сохраняются.
- Реальная запись всё ещё невозможна без серверного env-флага `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role на Edge Function.
- Складские движения, автоматическая запись Supabase/backend, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.10.7 — Equipment code generator fix

- Исправлена кнопка «Сгенерировать» в карточке оборудования.
- `EquipmentDatabase` теперь явно экспортирует `generateNextCode()` и `getCategoryCodePrefix()`, поэтому UI-генератор кода получает доступ к логике префиксов категорий.
- Принудительная генерация кода работает и для новых, и для редактируемых позиций.
- Расчёты, sync-очереди, backend-запись и старый v3-интерфейс не менялись.

## v3.10.1 — Server Test Harness

- Added `ServerTestHarness` for safe backend checks without registering a real admin.
- Added Edge Function drafts: `backend-health`, `test-seed-workspace`, `test-write-quote`, `test-rls-check`, `test-cleanup`.
- Added Backend / Sync UI block for health → test seed → dry write → RLS check → cleanup.
- Test key is entered manually, sent only as `x-feg-test-key` and is not stored in localStorage.
- Added server test plan/report JSON exports and documentation.
- Remote backend writes remain disabled by default; local/demo auth and current calculations are unchanged.

## v3.8.2 — Equipment Database foundation

- Added unified `EquipmentDatabase` model for stage, truss, LED, light, sound, services, commutation and consumables.
- Added `EquipmentDatabaseUI` preview panel inside v4 shell.
- Added demo equipment fixtures for role testing.
- Added stock/availability summary helpers.
- Kept v3 working UI, calculations, PDF and Supabase flows unchanged.


## 3.8.1 — Demo Auth & Role Testing Layer

- Добавлен безопасный demo-вход для разработки v4 без реального admin/invite key.
- Добавлены роли демо-пользователей: `admin`, `manager`, `technician`, `warehouse`, `viewer`.
- Добавлены модули `RolePermissions`, `TestFixtures`, `DemoAuthProvider`, `AuthProvider`, `AuthGuards`.
- v4 preview теперь показывает плашку `DEMO MODE`, текущего пользователя, роль и workspace.
- Dashboard v4 фильтрует разделы по правам роли: техник не видит цены/сметы, склад не видит клиентские цены, admin видит админку.
- Добавлен smoke-test demo auth и role permissions в `scripts/check.mjs`.
- Текущие расчёты, PDF, Supabase-сохранение, сцена, фермы и клиенты не изменялись.
- Service worker обновлён до кэша v3.8.1 и включает новые auth/role-модули.

# Changelog

## v3.12.9 — Clients/quotes approval package

- Добавлен approval package для будущего clients/quotes controlled write без включения самой записи.
- `QuoteBackendSyncPack` получил `fegV4QuoteWriteApprovalPackage`, `buildQuoteWriteApprovalPackage()`, `compareQuoteApprovalWithCurrentPayload()`, `buildApprovedQuoteWriteTemplate()`, save/read/clear helpers.
- UI-блок `Clients/quotes remote dry-run` получил статус `Approval`, кнопки `Одобрить quote payload`, `Approval JSON`, `Сбросить approval`, `Approved template`.
- Approval создаётся только после clean remote dry-run, готового `remote_diff`, наличия `payload_checksum`, quotes в payload и совпадения текущего payload с dry-run checksum.
- Если клиент/проект/quote payload меняется после approval, approval становится stale и approved template блокируется до нового dry-run.
- Edge Function `quote-sync-dry-run` обновлена до 3.12.9 и возвращает `approval_advisory`; она по-прежнему read-only.
- Controlled quote write, складские движения, резервы, автоматическая Supabase/backend запись, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.12.5 — Controlled write Edge runner + post-write reports

- Добавлен controlled write runner в `SupabaseBackendPack`: `buildEquipmentControlledWriteExecutionRequest()`, `buildEquipmentControlledWriteReadiness()`, `runEquipmentControlledWriteEdge()`.
- В UI backend pack добавлены поле контрольной фразы `WRITE EQUIPMENT`, статус `Write runner`, кнопка `Запустить controlled write Edge` и отчёт controlled write result.
- Controlled write выполняется только через Edge Function `equipment-controlled-write`, без прямого browser upsert.
- Перед вызовом Edge Function проверяются: test key, approval package, preflight, `payload_checksum`, local controlled write plan, `dry_run=false`, контрольная фраза и наличие payload rows.
- Результаты controlled write сохраняются в локальную историю `fegV4EquipmentControlledWriteReports`; `FEG_SERVER_TEST_KEY` и фраза подтверждения не сохраняются.
- Реальная запись всё ещё невозможна без серверного env-флага `FEG_ENABLE_EQUIPMENT_REMOTE_WRITE=true` и service role на Edge Function.
- Складские движения, автоматическая запись Supabase/backend, LED-крепёж/печеньки/болты и старый v3-интерфейс не менялись.

## v3.10.7 — Equipment code generator fix

- Исправлена кнопка «Сгенерировать» в карточке оборудования.
- `EquipmentDatabase` теперь явно экспортирует `generateNextCode()` и `getCategoryCodePrefix()`, поэтому UI-генератор кода получает доступ к логике префиксов категорий.
- Принудительная генерация кода работает и для новых, и для редактируемых позиций.
- Расчёты, sync-очереди, backend-запись и старый v3-интерфейс не менялись.

## v3.10.1 — Server Test Harness

- Added `ServerTestHarness` for safe backend checks without registering a real admin.
- Added Edge Function drafts: `backend-health`, `test-seed-workspace`, `test-write-quote`, `test-rls-check`, `test-cleanup`.
- Added Backend / Sync UI block for health → test seed → dry write → RLS check → cleanup.
- Test key is entered manually, sent only as `x-feg-test-key` and is not stored in localStorage.
- Added server test plan/report JSON exports and documentation.
- Remote backend writes remain disabled by default; local/demo auth and current calculations are unchanged.

## 3.7.4 - Security hotfix for cache and legacy cloud fallback

- Updated service worker optional CDN cache entries to the same pinned jsPDF, html2canvas, and Supabase URLs used by `index.html`.
- Extended `ClientsManager` legacy Supabase fallback to retry old `workspace_key,local_id` conflict handling when `owner_id` is missing or not yet in the schema cache.
- Added a manual Supabase owner backfill template for existing `projects` rows before enabling strict RLS.
- Documented the intentional stage-connectivity change: diagonal modules are not treated as connected; only side-adjacent cells form one stage component.

## 3.7.3 - Security hardening and reliability pass

- Pinned external CDN scripts and added SRI hashes for jsPDF, html2canvas, and Supabase.
- Updated Supabase browser SDK to `2.105.4`.
- Added Vite development/build scripts and Playwright e2e test scaffolding.
- Added local Node smoke checks for calculation, import sanitizing, and CDN hardening.
- Added Supabase CLI migration for RLS, authenticated ownership, and project membership roles.
- Added local project history export and guarded backup restore.
- Fixed stage editor jitter by removing hover scaling and making grid auto-fit independent of scrollbar changes.
- Kept static `index.html` compatibility for offline/simple hosting.
