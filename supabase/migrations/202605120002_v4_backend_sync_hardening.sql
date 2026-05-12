-- FEG Stage PRO v3.12.1 — v4 backend sync hardening
-- Purpose: prepare controlled Edge Function based sync without enabling client-side writes.
-- Safe properties:
--   - No data is written by this migration except schema helpers/triggers/policies.
--   - Frontend local string ids are stored as local_id; server primary ids remain uuid.
--   - Real equipment upsert must go through an Edge Function service-role gate.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Payload compatibility columns for controlled server mapping
-- -----------------------------------------------------------------------------
alter table public.suppliers
    add column if not exists local_id text,
    add column if not exists categories jsonb not null default '[]'::jsonb,
    add column if not exists default_margin_rate numeric not null default 0,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.equipment_items
    add column if not exists local_id text,
    add column if not exists startup_power_w numeric not null default 0,
    add column if not exists supplier_name text,
    add column if not exists supplier_local_id text,
    add column if not exists schema_version integer not null default 0,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.clients
    add column if not exists local_id text,
    add column if not exists company text,
    add column if not exists contact_name text,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.quotes
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.quote_sections
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.quote_items
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists local_id text,
    add column if not exists item_id text,
    add column if not exists raw_payload jsonb not null default '{}'::jsonb;

-- Backfill quote child workspace ids from parent quotes for installations that already applied the draft.
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

-- Keep local ids unique per workspace where they exist. These are non-breaking
-- partial indexes because legacy/imported rows may not have local_id yet.
create unique index if not exists suppliers_workspace_local_id_idx
on public.suppliers (workspace_id, local_id)
where local_id is not null and local_id <> '';

create unique index if not exists equipment_items_workspace_local_id_idx
on public.equipment_items (workspace_id, local_id)
where local_id is not null and local_id <> '';

create unique index if not exists clients_workspace_local_id_idx
on public.clients (workspace_id, local_id)
where local_id is not null and local_id <> '';

create index if not exists equipment_items_workspace_source_idx
on public.equipment_items (workspace_id, source_type, is_active);

create index if not exists quote_sections_workspace_idx
on public.quote_sections (workspace_id, quote_id, section_key);

create index if not exists quote_items_workspace_idx
on public.quote_items (workspace_id, quote_id, section_key);

-- -----------------------------------------------------------------------------
-- Backend sync run ledger
-- -----------------------------------------------------------------------------
create table if not exists public.backend_sync_runs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.workspaces(id) on delete set null,
    actor_id uuid references public.profiles(id) on delete set null,
    run_type text not null check (run_type in ('equipment_dry_run', 'equipment_controlled_write', 'quote_dry_run', 'quote_controlled_write', 'server_test')),
    status text not null default 'created' check (status in ('created', 'dry_run', 'blocked', 'executed', 'failed')),
    dry_run boolean not null default true,
    remote_write_executed boolean not null default false,
    row_counts jsonb not null default '{}'::jsonb,
    blockers jsonb not null default '[]'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    request_meta jsonb not null default '{}'::jsonb,
    result_meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists backend_sync_runs_workspace_created_idx
on public.backend_sync_runs (workspace_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Helper functions used by RLS and Edge Function checks
-- -----------------------------------------------------------------------------
create or replace function public.feg_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.feg_current_role() = 'admin', false);
$$;

create or replace function public.feg_can_write_equipment()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.feg_current_role() = any(array['admin','warehouse']), false);
$$;

create or replace function public.feg_workspace_id_from_slug(workspace_slug text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select w.id
    from public.workspaces w
    where w.slug = workspace_slug
       or w.id::text = workspace_slug
    limit 1;
$$;

create or replace function public.feg_register_backend_sync_run(
    target_workspace_id uuid,
    target_run_type text,
    target_status text,
    target_dry_run boolean,
    target_remote_write_executed boolean,
    target_row_counts jsonb,
    target_blockers jsonb,
    target_warnings jsonb,
    target_request_meta jsonb,
    target_result_meta jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_id uuid;
begin
    insert into public.backend_sync_runs (
        workspace_id,
        actor_id,
        run_type,
        status,
        dry_run,
        remote_write_executed,
        row_counts,
        blockers,
        warnings,
        request_meta,
        result_meta
    ) values (
        target_workspace_id,
        auth.uid(),
        target_run_type,
        target_status,
        coalesce(target_dry_run, true),
        coalesce(target_remote_write_executed, false),
        coalesce(target_row_counts, '{}'::jsonb),
        coalesce(target_blockers, '[]'::jsonb),
        coalesce(target_warnings, '[]'::jsonb),
        coalesce(target_request_meta, '{}'::jsonb),
        coalesce(target_result_meta, '{}'::jsonb)
    ) returning id into new_id;
    return new_id;
end;
$$;

revoke all on function public.feg_is_admin() from anon;
revoke all on function public.feg_can_write_equipment() from anon;
revoke all on function public.feg_workspace_id_from_slug(text) from anon;
revoke all on function public.feg_register_backend_sync_run(uuid, text, text, boolean, boolean, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.feg_is_admin() to authenticated;
grant execute on function public.feg_can_write_equipment() to authenticated;
grant execute on function public.feg_workspace_id_from_slug(text) to authenticated;
grant execute on function public.feg_register_backend_sync_run(uuid, text, text, boolean, boolean, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- updated_at trigger for backend_sync_runs
DO $$
BEGIN
    IF to_regclass('public.backend_sync_runs') IS NOT NULL THEN
        drop trigger if exists trg_backend_sync_runs_updated_at on public.backend_sync_runs;
        create trigger trg_backend_sync_runs_updated_at
        before update on public.backend_sync_runs
        for each row execute function public.set_updated_at();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- RLS hardening for sync ledger and quote child workspace ids
-- -----------------------------------------------------------------------------
alter table public.backend_sync_runs enable row level security;
revoke all on public.backend_sync_runs from anon;
grant select, insert, update on public.backend_sync_runs to authenticated;

drop policy if exists "feg_backend_sync_runs_select_workspace" on public.backend_sync_runs;
drop policy if exists "feg_backend_sync_runs_insert_admin" on public.backend_sync_runs;
drop policy if exists "feg_backend_sync_runs_update_admin" on public.backend_sync_runs;

create policy "feg_backend_sync_runs_select_workspace"
on public.backend_sync_runs for select to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager','warehouse']));

create policy "feg_backend_sync_runs_insert_admin"
on public.backend_sync_runs for insert to authenticated
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','warehouse']));

create policy "feg_backend_sync_runs_update_admin"
on public.backend_sync_runs for update to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']));

-- Managers may edit quotes, but quote child rows remain protected by parent quote.
-- Warehouse/admin may edit equipment and inventory only; direct browser writes still remain gated by RLS.
