-- FEG Stage PRO v3.14.2
-- Auth action dry-run/audit helper.
-- Read-only helper for validating auth action intent before enabling real auth mutations.

create or replace function public.feg_auth_action_dry_run_preflight(
  p_workspace_slug text default 'main',
  p_action text default 'session_restore'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_action text := lower(trim(coalesce(p_action, 'session_restore')));
  v_active_admin_count integer := 0;
  v_active_invite_count integer := 0;
begin
  select * into v_workspace
  from public.workspaces
  where slug = coalesce(nullif(trim(p_workspace_slug), ''), 'main')
  limit 1;

  if v_action not in ('session_restore', 'email_magic_link', 'oauth_google', 'oauth_apple', 'invite_registration', 'first_admin_bootstrap', 'logout') then
    v_action := 'session_restore';
  end if;

  if v_workspace.id is not null then
    select count(*) into v_active_admin_count
    from public.profiles
    where workspace_id = v_workspace.id
      and role = 'admin'
      and status = 'active';

    select count(*) into v_active_invite_count
    from public.invite_keys
    where workspace_id = v_workspace.id
      and is_active = true;
  end if;

  return jsonb_build_object(
    'type', 'feg-stage-pro-auth-action-dry-run-preflight',
    'version', '3.14.2',
    'workspace_slug', coalesce(nullif(trim(p_workspace_slug), ''), 'main'),
    'workspace_resolved', v_workspace.id is not null,
    'workspace_id', coalesce(v_workspace.id::text, ''),
    'action', v_action,
    'active_admin_count', v_active_admin_count,
    'active_invite_keys_count', v_active_invite_count,
    'first_admin_required', v_workspace.id is null or v_active_admin_count = 0,
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true,
    'no_local_session_mutation', true
  );
end;
$$;

comment on function public.feg_auth_action_dry_run_preflight(text, text) is 'FEG read-only auth action dry-run preflight. Does not create profiles, consume invites or bootstrap admins.';
