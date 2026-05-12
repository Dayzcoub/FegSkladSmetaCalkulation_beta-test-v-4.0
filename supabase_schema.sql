-- FEG Stage PRO 3.7.4 - Supabase schema, production-safe baseline
-- Run in Supabase SQL Editor.
--
-- This schema is safe-by-default: cloud rows belong to auth.uid().
-- workspace_key is still useful for separating workspaces inside one account,
-- but it is not treated as a secret access token.
--
-- Important: the browser anon key is public. Do not use anon policies with
-- using (true) in production.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid default auth.uid(),
    workspace_key text not null,
    local_id text,
    order_id text,
    client text,
    name text,
    total numeric default 0,
    project_data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.projects
    add column if not exists owner_id uuid default auth.uid();

alter table public.projects
    alter column owner_id set default auth.uid();

create index if not exists projects_owner_workspace_updated_idx
on public.projects (owner_id, workspace_key, updated_at desc);

drop index if exists projects_workspace_updated_idx;
drop index if exists projects_workspace_local_id_idx;

create unique index if not exists projects_owner_workspace_local_id_idx
on public.projects (owner_id, workspace_key, local_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on public.projects;

create trigger trg_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create table if not exists public.project_memberships (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null,
    role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (project_id, user_id)
);

create index if not exists project_memberships_user_idx
on public.project_memberships (user_id, role);

drop trigger if exists trg_project_memberships_updated_at on public.project_memberships;

create trigger trg_project_memberships_updated_at
before update on public.project_memberships
for each row
execute function public.set_updated_at();

create or replace function public.feg_project_role(target_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(
        (
            select 'owner'
            from public.projects p
            where p.id = target_project_id
              and p.owner_id = auth.uid()
            limit 1
        ),
        (
            select pm.role
            from public.project_memberships pm
            where pm.project_id = target_project_id
              and pm.user_id = auth.uid()
            limit 1
        )
    );
$$;

revoke all on function public.feg_project_role(uuid) from anon;
grant execute on function public.feg_project_role(uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.projects force row level security;

revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;

drop policy if exists "feg_projects_select" on public.projects;
drop policy if exists "feg_projects_insert" on public.projects;
drop policy if exists "feg_projects_update" on public.projects;
drop policy if exists "feg_projects_delete" on public.projects;
drop policy if exists "feg_projects_select_own" on public.projects;
drop policy if exists "feg_projects_insert_own" on public.projects;
drop policy if exists "feg_projects_update_own" on public.projects;
drop policy if exists "feg_projects_delete_own" on public.projects;

create policy "feg_projects_select_own"
on public.projects for select
to authenticated
using (
    public.feg_project_role(id) in ('owner', 'editor', 'viewer')
);

create policy "feg_projects_insert_own"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

create policy "feg_projects_update_own"
on public.projects for update
to authenticated
using (
    public.feg_project_role(id) in ('owner', 'editor')
)
with check (
    public.feg_project_role(id) in ('owner', 'editor')
);

create policy "feg_projects_delete_own"
on public.projects for delete
to authenticated
using (public.feg_project_role(id) = 'owner');

alter table public.project_memberships enable row level security;
alter table public.project_memberships force row level security;

revoke all on public.project_memberships from anon;
grant select, insert, update, delete on public.project_memberships to authenticated;

drop policy if exists "feg_project_memberships_select" on public.project_memberships;
drop policy if exists "feg_project_memberships_insert_owner" on public.project_memberships;
drop policy if exists "feg_project_memberships_update_owner" on public.project_memberships;
drop policy if exists "feg_project_memberships_delete_owner" on public.project_memberships;

create policy "feg_project_memberships_select"
on public.project_memberships for select
to authenticated
using (
    user_id = auth.uid()
    or public.feg_project_role(project_id) = 'owner'
);

create policy "feg_project_memberships_insert_owner"
on public.project_memberships for insert
to authenticated
with check (
    public.feg_project_role(project_id) = 'owner'
);

create policy "feg_project_memberships_update_owner"
on public.project_memberships for update
to authenticated
using (
    public.feg_project_role(project_id) = 'owner'
)
with check (
    public.feg_project_role(project_id) = 'owner'
);

create policy "feg_project_memberships_delete_owner"
on public.project_memberships for delete
to authenticated
using (
    public.feg_project_role(project_id) = 'owner'
);
