-- FEG Stage PRO v3.14.3
-- Auth action approval / execution templates preflight.
-- Read-only helpers only: no profile writes, no invite consume, no bootstrap mutation.

create or replace function public.feg_auth_action_approval_preflight(
  p_workspace_slug text default 'main',
  p_action text default 'session_restore',
  p_payload_checksum text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_active_admins integer := 0;
  v_active_invites integer := 0;
begin
  select * into v_workspace
  from public.workspaces
  where slug = coalesce(nullif(trim(p_workspace_slug), ''), 'main')
  limit 1;

  if v_workspace.id is not null then
    select count(*) into v_active_admins
    from public.profiles
    where workspace_id = v_workspace.id
      and role = 'admin'
      and status = 'active';

    select count(*) into v_active_invites
    from public.invite_keys
    where workspace_id = v_workspace.id
      and is_active = true;
  end if;

  return jsonb_build_object(
    'type', 'feg-stage-pro-auth-action-approval-preflight',
    'version', '3.14.3',
    'workspace_slug', coalesce(nullif(trim(p_workspace_slug), ''), 'main'),
    'workspace_resolved', v_workspace.id is not null,
    'workspace_id', coalesce(v_workspace.id::text, ''),
    'action', coalesce(nullif(trim(p_action), ''), 'session_restore'),
    'payload_checksum_present', length(coalesce(trim(p_payload_checksum), '')) > 0,
    'active_admin_count', v_active_admins,
    'active_invite_keys_count', v_active_invites,
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true,
    'no_local_session_mutation', true,
    'ready_for_approval_package', length(coalesce(trim(p_payload_checksum), '')) > 0,
    'ready_for_controlled_action_skeleton', false,
    'note', 'Read-only helper for auth action approval/checksum preflight. It never executes auth mutations.'
  );
end;
$$;

comment on function public.feg_auth_action_approval_preflight(text, text, text)
is 'FEG Stage PRO v3.14.3 read-only auth action approval/checksum preflight. No profile writes, invite consume or bootstrap mutation.';
