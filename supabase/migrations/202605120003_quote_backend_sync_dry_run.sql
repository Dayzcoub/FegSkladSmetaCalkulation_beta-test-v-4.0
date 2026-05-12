-- FEG Stage PRO v3.12.8 — clients/quotes backend dry-run hardening
-- Purpose: prepare read-only Edge dry-run for clients and quote/project sync.
-- Safe properties:
--   - No production data is modified by this migration except additive schema helpers.
--   - Controlled quote write is not enabled in v3.12.8.
--   - Stock movements and reservations are intentionally excluded from quote dry-run payloads.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Local-id compatibility for client/quote payloads
-- -----------------------------------------------------------------------------
alter table public.quotes
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.quote_sections
    add column if not exists local_id text,
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.quote_items
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists local_id text,
    add column if not exists item_id text,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.audit_log
    add column if not exists local_id text,
    add column if not exists quote_local_id text,
    add column if not exists project_local_id text,
    add column if not exists actor_local_id text,
    add column if not exists actor_name text,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

-- Keep child workspace ids populated for remote diff and later controlled writes.
update public.quote_sections qs
set workspace_id = q.workspace_id
from public.quotes q
where qs.quote_id = q.id
  and qs.workspace_id is null;

update public.quote_items qi
set workspace_id = q.workspace_id
from public.quotes q
where qi.quote_id = q.id
  and qi.workspace_id is null;

create index if not exists quotes_workspace_local_id_idx
on public.quotes (workspace_id, local_id)
where local_id is not null and local_id <> '';

create index if not exists quote_sections_workspace_local_id_idx
on public.quote_sections (workspace_id, local_id)
where local_id is not null and local_id <> '';

create index if not exists quote_items_workspace_local_id_idx
on public.quote_items (workspace_id, local_id)
where local_id is not null and local_id <> '';

create index if not exists audit_log_workspace_local_id_idx
on public.audit_log (workspace_id, local_id)
where local_id is not null and local_id <> '';

create index if not exists audit_log_quote_local_id_idx
on public.audit_log (workspace_id, quote_local_id, created_at desc)
where quote_local_id is not null and quote_local_id <> '';

-- -----------------------------------------------------------------------------
-- Quote write capability helper for future controlled Edge Function.
-- v3.12.8 only uses it for readiness metadata; no quote write function is enabled.
-- -----------------------------------------------------------------------------
create or replace function public.feg_can_write_quotes()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.feg_current_role() = any(array['admin','manager']), false);
$$;

revoke all on function public.feg_can_write_quotes() from anon;
grant execute on function public.feg_can_write_quotes() to authenticated;

-- Quote dry-run attempts may be registered by service-role Edge Functions through
-- feg_register_backend_sync_run(... target_run_type = 'quote_dry_run' ...).
-- The existing backend_sync_runs table/check constraint already includes quote_dry_run.
