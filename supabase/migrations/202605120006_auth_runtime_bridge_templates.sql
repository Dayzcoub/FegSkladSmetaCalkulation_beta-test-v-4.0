-- FEG Stage PRO v3.14.1 — auth runtime bridge/templates preflight
-- Safe, read-only helper layer. No profile insert/update, no invite consume, no bootstrap mutation.

create index if not exists profiles_workspace_auth_user_id_idx
  on public.profiles(workspace_id, auth_user_id)
  where auth_user_id is not null;

create index if not exists profiles_workspace_email_status_idx
  on public.profiles(workspace_id, lower(email), status);

create index if not exists invite_keys_workspace_role_active_idx
  on public.invite_keys(workspace_id, role, is_active);

create or replace function public.feg_auth_runtime_bridge_preflight(p_workspace_slug text, p_email text default null, p_auth_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_profile_count integer := 0;
  v_matching_profiles integer := 0;
  v_active_admin_count integer := 0;
  v_active_invite_count integer := 0;
begin
  select * into v_workspace
  from public.workspaces
  where slug = coalesce(nullif(trim(p_workspace_slug), ''), 'main')
  limit 1;

  if v_workspace.id is null then
    return jsonb_build_object(
      'ok', true,
      'workspace_resolved', false,
      'remote_write_executed', false,
      'no_profile_write', true,
      'no_invite_consume', true,
      'no_bootstrap_mutation', true,
      'reason', 'workspace_not_found'
    );
  end if;

  select count(*) into v_profile_count from public.profiles where workspace_id = v_workspace.id;
  select count(*) into v_active_admin_count from public.profiles where workspace_id = v_workspace.id and role = 'admin' and status = 'active';
  select count(*) into v_active_invite_count from public.invite_keys where workspace_id = v_workspace.id and is_active = true;

  if p_email is not null and trim(p_email) <> '' then
    select count(*) into v_matching_profiles
    from public.profiles
    where workspace_id = v_workspace.id and lower(email) = lower(trim(p_email));
  elsif p_auth_user_id is not null then
    select count(*) into v_matching_profiles
    from public.profiles
    where workspace_id = v_workspace.id and auth_user_id = p_auth_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'workspace_resolved', true,
    'workspace_id', v_workspace.id,
    'profiles_count', v_profile_count,
    'matching_profiles_count', v_matching_profiles,
    'active_admin_count', v_active_admin_count,
    'active_invite_keys_count', v_active_invite_count,
    'first_admin_required', v_active_admin_count = 0,
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true
  );
end;
$$;

comment on function public.feg_auth_runtime_bridge_preflight(text, text, uuid)
  is 'Read-only auth bridge preflight. Validates workspace/profile/invite readiness without profile writes, invite consumption or bootstrap mutation.';
