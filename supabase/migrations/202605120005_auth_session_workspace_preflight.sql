-- FEG Stage PRO v3.14.0 — Auth session/workspace preflight
-- Additive read-only helpers for Supabase AuthShell hardening. No automatic profile writes.

create index if not exists workspaces_slug_active_idx on public.workspaces (slug, is_active);
create index if not exists profiles_workspace_email_idx on public.profiles (workspace_id, lower(email));
create index if not exists profiles_auth_status_idx on public.profiles (id, status, role);
create index if not exists invite_keys_workspace_status_idx on public.invite_keys (workspace_id, is_active, expires_at, used_count, max_uses);

create or replace function public.feg_auth_workspace_preflight(workspace_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  workspace_row public.workspaces%rowtype;
  profiles_count integer := 0;
  active_admin_count integer := 0;
  invite_count integer := 0;
  active_invite_count integer := 0;
begin
  select * into workspace_row
  from public.workspaces
  where slug = workspace_slug
  limit 1;

  if workspace_row.id is null then
    return jsonb_build_object(
      'workspace_resolved', false,
      'workspace_slug', workspace_slug,
      'profiles_count', 0,
      'active_admin_count', 0,
      'invite_keys_count', 0,
      'active_invite_keys_count', 0,
      'first_admin_required', true
    );
  end if;

  select count(*) into profiles_count from public.profiles where workspace_id = workspace_row.id;
  select count(*) into active_admin_count from public.profiles where workspace_id = workspace_row.id and role = 'admin' and status = 'active';
  select count(*) into invite_count from public.invite_keys where workspace_id = workspace_row.id;
  select count(*) into active_invite_count
  from public.invite_keys
  where workspace_id = workspace_row.id
    and is_active = true
    and (expires_at is null or expires_at > now())
    and used_count < max_uses;

  return jsonb_build_object(
    'workspace_resolved', true,
    'workspace_slug', workspace_row.slug,
    'workspace_id', workspace_row.id,
    'workspace_active', workspace_row.is_active,
    'profiles_count', profiles_count,
    'active_admin_count', active_admin_count,
    'invite_keys_count', invite_count,
    'active_invite_keys_count', active_invite_count,
    'first_admin_required', active_admin_count = 0
  );
end;
$$;

revoke all on function public.feg_auth_workspace_preflight(text) from anon;
grant execute on function public.feg_auth_workspace_preflight(text) to authenticated;
