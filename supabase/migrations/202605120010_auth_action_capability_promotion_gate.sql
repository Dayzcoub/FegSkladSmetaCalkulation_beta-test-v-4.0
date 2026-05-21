-- FEG Stage PRO v3.14.5 — auth action capability / promotion gate helper
-- Read-only helper. It audits server-side auth action prerequisites without creating users,
-- writing profiles, consuming invite keys, bootstrapping admins or mutating sessions.

create or replace function public.feg_auth_action_capability_preflight(
  target_workspace_slug text default 'main',
  requested_action text default 'session_restore'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws record;
  normalized_action text := lower(replace(coalesce(nullif(requested_action, ''), 'session_restore'), '-', '_'));
  profile_count integer := 0;
  admin_count integer := 0;
  invite_count integer := 0;
  active_invite_count integer := 0;
  action_blockers jsonb := '[]'::jsonb;
  action_warnings jsonb := '[]'::jsonb;
begin
  if normalized_action not in ('session_restore', 'email_magic_link', 'oauth_google', 'oauth_apple', 'invite_registration', 'first_admin_bootstrap', 'logout') then
    normalized_action := 'session_restore';
  end if;

  select id, slug, name, is_active
    into ws
    from public.workspaces
   where slug = coalesce(nullif(target_workspace_slug, ''), 'main')
   limit 1;

  if ws.id is null then
    return jsonb_build_object(
      'ok', true,
      'type', 'feg-stage-pro-auth-action-capability-preflight',
      'version', '3.14.5',
      'workspace_resolved', false,
      'requested_action', normalized_action,
      'status', 'workspace_not_found_read_only',
      'remote_write_executed', false,
      'no_profile_write', true,
      'no_invite_consume', true,
      'no_bootstrap_mutation', true,
      'promotion_ready', false,
      'promotion_gate', jsonb_build_object(
        'ready', false,
        'status', 'promotion_blocked_non_mutating_milestone',
        'requires_code_review', true,
        'requires_server_env', 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true'
      )
    );
  end if;

  select count(*) into profile_count from public.profiles where workspace_id = ws.id;
  select count(*) into admin_count from public.profiles where workspace_id = ws.id and role = 'admin' and status = 'active';
  select count(*) into invite_count from public.invite_keys where workspace_id = ws.id;
  select count(*) into active_invite_count from public.invite_keys where workspace_id = ws.id and is_active = true;

  if normalized_action = 'invite_registration' and active_invite_count = 0 then
    action_warnings := action_warnings || jsonb_build_array('No active invite keys found for workspace.');
  end if;
  if normalized_action = 'first_admin_bootstrap' and admin_count > 0 then
    action_blockers := action_blockers || jsonb_build_array('Workspace already has active admin.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'type', 'feg-stage-pro-auth-action-capability-preflight',
    'version', '3.14.5',
    'workspace_resolved', true,
    'workspace_id', ws.id,
    'workspace_slug', ws.slug,
    'requested_action', normalized_action,
    'profiles_count', profile_count,
    'active_admin_count', admin_count,
    'invite_keys_count', invite_count,
    'active_invite_keys_count', active_invite_count,
    'first_admin_required', admin_count = 0,
    'action_blockers', action_blockers,
    'action_warnings', action_warnings,
    'status', case when jsonb_array_length(action_blockers) > 0 then 'blocked' else 'capability_preview_ready_non_mutating' end,
    'promotion_ready', false,
    'promotion_gate', jsonb_build_object(
      'ready', false,
      'status', 'promotion_blocked_non_mutating_milestone',
      'requires_code_review', true,
      'requires_server_env', 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true',
      'remote_write_executed', false
    ),
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true,
    'no_local_session_mutation', true,
    'note', 'Read-only auth action capability helper. v3.14.5 audits promotion readiness but does not execute auth actions.'
  );
end;
$$;

grant execute on function public.feg_auth_action_capability_preflight(text, text) to authenticated;
