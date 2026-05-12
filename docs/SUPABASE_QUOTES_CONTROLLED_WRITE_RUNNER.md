# Supabase clients/quotes controlled write runner — v3.13.0

This layer adds the guarded Edge-only runner for the future clients/quotes write path.

## Scope

The runner can send an approved payload to the `quote-controlled-write` Edge Function. The payload may include:

- `clients`
- `quotes`
- `quote_sections`
- `quote_items`
- `audit_log`

It intentionally does **not** create or update:

- `stock_movements`
- `reservations`
- automatic warehouse movements
- browser-side Supabase upserts

## Safety gates

`quote-controlled-write` is blocked unless all gates pass:

- `x-feg-test-key` is valid;
- `dry_run === false`;
- `confirm_phrase === "WRITE QUOTE"`;
- `approval_package.approved === true`;
- `approval_package.payload_checksum` matches the current payload;
- `payload_checksum` matches the current payload when supplied;
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist in Edge Function environment;
- `FEG_ENABLE_QUOTE_REMOTE_WRITE=true` exists in Edge Function environment.

The temporary test key and confirmation phrase are not stored in localStorage.

## UI

The Backend / Sync block `Clients/quotes remote dry-run` now includes:

- `Write confirm phrase` field;
- `Quote write runner` status;
- `Write readiness JSON` export;
- `Запустить quote controlled write Edge` button;
- latest controlled write report preview.

## Database hardening

Migration `202605120004_quote_controlled_write_runner.sql` adds non-partial unique indexes needed by PostgREST upsert:

- `clients(workspace_id, local_id)`;
- `quote_items(quote_id, local_id)`;
- `audit_log(workspace_id, local_id)`;
- `quote_sections(quote_id, local_id)`.

PostgreSQL unique indexes still allow multiple `NULL` local IDs, so legacy rows without `local_id` remain compatible.

## Post-write expectations

A successful controlled write returns:

- `remote_write_executed: true`;
- `post_write_verification_required: true`;
- `sync_audit_required: true`;
- rollback hints.

The next required step is another quote dry-run with the same approved payload. It should show no pending `insert/update` for approved client/quote rows.

## Non-goals in v3.13.0

- No reservation creation.
- No stock movement creation.
- No automatic rollback/delete.
- No direct browser upsert.
- No changes to LED fastener calculations or legacy v3 calculations.


## v3.13.1 post-write verification

После controlled write следующий шаг — read-only `quote-sync-dry-run` с `verify_after_controlled_write=true`. Он проверяет pending insert/update для approved clients/quotes payload, не создаёт резервы и не удаляет remote-only строки.
