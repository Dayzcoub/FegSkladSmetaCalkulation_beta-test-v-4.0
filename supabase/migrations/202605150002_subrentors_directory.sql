-- FEG Stage PRO v3.17.18 — subrentors directory layer
-- Purpose: separate reference layer for people/organizations used for equipment subrent.
-- The static build still uses localStorage fallback; this schema is additive and Supabase-ready.

create extension if not exists "pgcrypto";

create table if not exists public.subrentors (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    supplier_id uuid references public.suppliers(id) on delete set null,
    first_name text,
    last_name text,
    organization_name text,
    display_name text generated always as (
        nullif(trim(coalesce(organization_name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    ) stored,
    phone text,
    email text,
    notes text,
    is_active boolean not null default true,
    meta jsonb not null default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, phone)
);

create index if not exists subrentors_workspace_active_idx on public.subrentors(workspace_id, is_active);
create index if not exists subrentors_workspace_org_idx on public.subrentors(workspace_id, organization_name);

comment on table public.subrentors is 'Separate directory of people/organizations used for equipment subrent selection in FEG Stage PRO.';
comment on column public.subrentors.supplier_id is 'Optional bridge to generic suppliers table for quote_items.supplier_id compatibility.';
