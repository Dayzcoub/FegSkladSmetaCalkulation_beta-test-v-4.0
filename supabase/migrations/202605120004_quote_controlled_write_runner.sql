-- FEG Stage PRO v3.13.0 — quote controlled write runner hardening
-- Purpose: prepare the guarded Edge-only controlled write path for clients/quotes.
-- Safe properties:
--   - Additive unique indexes only.
--   - No stock movements and no reservations are enabled by this migration.
--   - Real quote write must go through quote-controlled-write with service-role gates.

create extension if not exists "pgcrypto";

-- PostgREST/Supabase upsert needs non-partial unique indexes for onConflict.
-- PostgreSQL unique indexes allow multiple NULL local_id values, so legacy rows that
-- do not yet have local_id remain compatible.
create unique index if not exists clients_workspace_local_id_full_uniq
on public.clients (workspace_id, local_id);

create unique index if not exists quote_items_quote_local_id_full_uniq
on public.quote_items (quote_id, local_id);

create unique index if not exists audit_log_workspace_local_id_full_uniq
on public.audit_log (workspace_id, local_id);

create unique index if not exists quote_sections_quote_local_id_full_uniq
on public.quote_sections (quote_id, local_id);

-- Ensure quote-controlled-write run type remains accepted on installations that
-- skipped the earlier hardening migration or edited the check manually.
do $$
begin
    if exists (
        select 1
        from information_schema.constraint_column_usage
        where table_schema = 'public'
          and table_name = 'backend_sync_runs'
          and constraint_name = 'backend_sync_runs_run_type_check'
    ) then
        alter table public.backend_sync_runs drop constraint if exists backend_sync_runs_run_type_check;
        alter table public.backend_sync_runs add constraint backend_sync_runs_run_type_check
        check (run_type in ('equipment_dry_run', 'equipment_controlled_write', 'quote_dry_run', 'quote_controlled_write', 'server_test'));
    end if;
end $$;

comment on index public.clients_workspace_local_id_full_uniq is 'FEG v3.13.0 controlled quote write upsert key.';
comment on index public.quote_items_quote_local_id_full_uniq is 'FEG v3.13.0 controlled quote item upsert key; does not create reservations.';
comment on index public.audit_log_workspace_local_id_full_uniq is 'FEG v3.13.0 controlled quote audit upsert key.';
comment on index public.quote_sections_quote_local_id_full_uniq is 'FEG v3.13.0 controlled quote section upsert key.';
