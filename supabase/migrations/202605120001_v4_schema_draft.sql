-- FEG Stage PRO v3.8.29 — v4 Supabase schema draft
-- Apply later with: supabase db push
-- Purpose: draft server schema for the v4 architecture while the UI still works locally.
-- This migration is additive and keeps legacy public.projects from v3.7.x/v3.8.x intact.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Workspace / profiles / invite keys
-- -----------------------------------------------------------------------------
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    slug text unique,
    name text not null,
    company_name text,
    settings jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    workspace_id uuid references public.workspaces(id) on delete set null,
    email text not null,
    display_name text,
    company_name text,
    role text not null default 'viewer' check (role in ('admin', 'manager', 'technician', 'warehouse', 'viewer')),
    status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
    is_first_admin boolean not null default false,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.invite_keys (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    key_hash text not null unique,
    role text not null default 'viewer' check (role in ('admin', 'manager', 'technician', 'warehouse', 'viewer')),
    note text,
    max_uses integer not null default 1 check (max_uses > 0),
    used_count integer not null default 0 check (used_count >= 0),
    expires_at timestamptz,
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Equipment / suppliers / inventory
-- -----------------------------------------------------------------------------
create table if not exists public.equipment_categories (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    parent_id uuid references public.equipment_categories(id) on delete cascade,
    code text not null,
    name text not null,
    sort_order integer not null default 100,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, code)
);

create table if not exists public.suppliers (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    contact_name text,
    phone text,
    email text,
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, name)
);

create table if not exists public.equipment_items (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    category text not null,
    subcategory text,
    type text not null,
    code text not null,
    name text not null,
    manufacturer text,
    model text,
    unit text not null default 'шт',
    stock_qty numeric not null default 0,
    reserved_qty numeric not null default 0,
    available_qty numeric generated always as (stock_qty - reserved_qty) stored,
    weight_kg numeric not null default 0,
    power_w numeric not null default 0,
    rental_price numeric not null default 0,
    replacement_cost numeric not null default 0,
    supplier_id uuid references public.suppliers(id) on delete set null,
    source_type text not null default 'own' check (source_type in ('own', 'subrent', 'manual')),
    is_active boolean not null default true,
    notes text,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, code)
);

-- -----------------------------------------------------------------------------
-- Clients / quotes / sections / items
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    company_name text,
    phone text,
    email text,
    notes text,
    meta jsonb not null default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    client_id uuid references public.clients(id) on delete set null,
    owner_id uuid references public.profiles(id) on delete set null,
    local_id text,
    project_name text,
    venue_name text,
    event_address text,
    event_date date,
    contact_name text,
    contact_phone text,
    contact_email text,
    status text not null default 'draft' check (status in ('draft', 'in_progress', 'sent', 'confirmed', 'cancelled', 'completed')),
    total_price numeric not null default 0,
    total_weight_kg numeric not null default 0,
    total_power_w numeric not null default 0,
    total_start_power_w numeric not null default 0,
    quote_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, local_id)
);

create table if not exists public.quote_sections (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid not null references public.quotes(id) on delete cascade,
    section_key text not null,
    title text not null,
    is_enabled boolean not null default true,
    summary jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (quote_id, section_key)
);

create table if not exists public.quote_items (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid not null references public.quotes(id) on delete cascade,
    section_key text not null,
    equipment_item_id uuid references public.equipment_items(id) on delete set null,
    source_type text not null default 'own' check (source_type in ('own', 'subrent', 'subrent_needed', 'manual', 'transport', 'service')),
    supplier_id uuid references public.suppliers(id) on delete set null,
    supplier_name text,
    code text,
    name text not null,
    unit text not null default 'шт',
    qty numeric not null default 1,
    stock_qty numeric not null default 0,
    available_qty numeric not null default 0,
    deficit_qty numeric not null default 0,
    subrent_qty numeric not null default 0,
    weight_kg numeric not null default 0,
    power_w numeric not null default 0,
    rental_price numeric not null default 0,
    subrent_price numeric not null default 0,
    client_price numeric not null default 0,
    margin numeric not null default 0,
    note text,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Stock movements / reservations / calendar / audit
-- -----------------------------------------------------------------------------
create table if not exists public.stock_movements (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    equipment_item_id uuid not null references public.equipment_items(id) on delete cascade,
    quote_id uuid references public.quotes(id) on delete set null,
    movement_type text not null check (movement_type in ('in', 'out', 'reserve', 'release', 'adjust')),
    qty numeric not null,
    note text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.reservations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    quote_id uuid not null references public.quotes(id) on delete cascade,
    equipment_item_id uuid not null references public.equipment_items(id) on delete cascade,
    qty numeric not null default 0,
    status text not null default 'active' check (status in ('active', 'released', 'fulfilled', 'cancelled')),
    starts_at timestamptz,
    ends_at timestamptz,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (quote_id, equipment_item_id)
);

create table if not exists public.calendar_integrations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    provider text not null default 'google' check (provider in ('google', 'ics', 'apple', 'outlook')),
    calendar_id text,
    settings jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.workspaces(id) on delete set null,
    actor_id uuid references public.profiles(id) on delete set null,
    actor_role text,
    quote_id uuid references public.quotes(id) on delete set null,
    entity_type text not null,
    entity_id uuid,
    action text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists profiles_workspace_role_idx on public.profiles (workspace_id, role, status);
create index if not exists invite_keys_workspace_active_idx on public.invite_keys (workspace_id, is_active, expires_at);
create index if not exists equipment_items_workspace_category_idx on public.equipment_items (workspace_id, category, type, is_active);
create index if not exists equipment_items_workspace_name_idx on public.equipment_items using gin (to_tsvector('simple', coalesce(code,'') || ' ' || coalesce(name,'') || ' ' || coalesce(manufacturer,'') || ' ' || coalesce(model,'')));
create index if not exists quotes_workspace_status_date_idx on public.quotes (workspace_id, status, event_date desc, updated_at desc);
create index if not exists quote_items_quote_section_idx on public.quote_items (quote_id, section_key);
create index if not exists stock_movements_workspace_item_idx on public.stock_movements (workspace_id, equipment_item_id, created_at desc);
create index if not exists reservations_workspace_quote_idx on public.reservations (workspace_id, quote_id, status);
create index if not exists audit_log_workspace_created_idx on public.audit_log (workspace_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Shared triggers / helper functions
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace function public.feg_current_workspace_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select p.workspace_id
    from public.profiles p
    where p.id = auth.uid()
    limit 1;
$$;

create or replace function public.feg_current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
    select p.role
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
    limit 1;
$$;

create or replace function public.feg_has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.feg_current_role() = any(required_roles), false);
$$;

revoke all on function public.feg_current_workspace_id() from anon;
revoke all on function public.feg_current_role() from anon;
revoke all on function public.feg_has_role(text[]) from anon;
grant execute on function public.feg_current_workspace_id() to authenticated;
grant execute on function public.feg_current_role() to authenticated;
grant execute on function public.feg_has_role(text[]) to authenticated;

-- updated_at triggers
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'workspaces','profiles','invite_keys','equipment_categories','suppliers','equipment_items','clients','quotes','quote_sections','quote_items','reservations','calendar_integrations'
    ] LOOP
        EXECUTE format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
        EXECUTE format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- RLS draft policies
-- -----------------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.invite_keys enable row level security;
alter table public.equipment_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.equipment_items enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_sections enable row level security;
alter table public.quote_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.reservations enable row level security;
alter table public.calendar_integrations enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.workspaces, public.profiles, public.invite_keys, public.equipment_categories, public.suppliers, public.equipment_items, public.clients, public.quotes, public.quote_sections, public.quote_items, public.stock_movements, public.reservations, public.calendar_integrations, public.audit_log from anon;
grant select, insert, update, delete on public.workspaces, public.profiles, public.invite_keys, public.equipment_categories, public.suppliers, public.equipment_items, public.clients, public.quotes, public.quote_sections, public.quote_items, public.stock_movements, public.reservations, public.calendar_integrations, public.audit_log to authenticated;

-- Workspaces: members see their workspace; admins can update it.
drop policy if exists "feg_workspaces_select" on public.workspaces;
drop policy if exists "feg_workspaces_update_admin" on public.workspaces;
create policy "feg_workspaces_select" on public.workspaces for select to authenticated
using (id = public.feg_current_workspace_id());
create policy "feg_workspaces_update_admin" on public.workspaces for update to authenticated
using (id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']))
with check (id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']));

-- Profiles: users see workspace profiles; only admin changes roles/status.
drop policy if exists "feg_profiles_select_workspace" on public.profiles;
drop policy if exists "feg_profiles_update_self" on public.profiles;
drop policy if exists "feg_profiles_admin_manage" on public.profiles;
create policy "feg_profiles_select_workspace" on public.profiles for select to authenticated
using (id = auth.uid() or workspace_id = public.feg_current_workspace_id());
create policy "feg_profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = public.feg_current_role());
create policy "feg_profiles_admin_manage" on public.profiles for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']));

-- Generic workspace-scoped policy set.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['invite_keys','equipment_categories','suppliers','equipment_items','clients','quotes','stock_movements','reservations','calendar_integrations','audit_log'] LOOP
        EXECUTE format('drop policy if exists "feg_%s_select_workspace" on public.%I', t, t);
        EXECUTE format('create policy "feg_%s_select_workspace" on public.%I for select to authenticated using (workspace_id = public.feg_current_workspace_id())', t, t);
    END LOOP;
END $$;

-- Write policies by role. These are intentionally conservative for the draft.
drop policy if exists "feg_invite_keys_admin_write" on public.invite_keys;
create policy "feg_invite_keys_admin_write" on public.invite_keys for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin']));

drop policy if exists "feg_equipment_write" on public.equipment_items;
create policy "feg_equipment_write" on public.equipment_items for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager','warehouse']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager','warehouse']));

drop policy if exists "feg_clients_write" on public.clients;
create policy "feg_clients_write" on public.clients for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']));

drop policy if exists "feg_quotes_write" on public.quotes;
create policy "feg_quotes_write" on public.quotes for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']));

drop policy if exists "feg_inventory_write" on public.stock_movements;
create policy "feg_inventory_write" on public.stock_movements for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','warehouse']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','warehouse']));

drop policy if exists "feg_reservations_write" on public.reservations;
create policy "feg_reservations_write" on public.reservations for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager','warehouse']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager','warehouse']));

-- Quote children inherit access from their parent quote.
drop policy if exists "feg_quote_sections_select" on public.quote_sections;
drop policy if exists "feg_quote_sections_write" on public.quote_sections;
create policy "feg_quote_sections_select" on public.quote_sections for select to authenticated
using (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()));
create policy "feg_quote_sections_write" on public.quote_sections for all to authenticated
using (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()) and public.feg_has_role(array['admin','manager']))
with check (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()) and public.feg_has_role(array['admin','manager']));

drop policy if exists "feg_quote_items_select" on public.quote_items;
drop policy if exists "feg_quote_items_write" on public.quote_items;
create policy "feg_quote_items_select" on public.quote_items for select to authenticated
using (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()));
create policy "feg_quote_items_write" on public.quote_items for all to authenticated
using (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()) and public.feg_has_role(array['admin','manager']))
with check (exists (select 1 from public.quotes q where q.id = quote_id and q.workspace_id = public.feg_current_workspace_id()) and public.feg_has_role(array['admin','manager']));
