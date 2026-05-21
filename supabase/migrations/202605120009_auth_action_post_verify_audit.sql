-- FEG Stage PRO v3.14.4 — auth action post-action verification / audit helper
-- Read-only helper. It does not create users, profiles, consume invite keys, bootstrap admins or mutate sessions.

create or replace function public.feg_auth_action_post_verify_preflight(target_workspace_slug text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws record;
  profile_count integer := 0;
  admin_count integer := 0;
  invite_count integer := 0;
  active_invite_count integer := 0;
begin
  select id, slug, name, is_active
    into ws
    from public.workspaces
   where slug = coalesce(nullif(target_workspace_slug, ''), 'main')
   limit 1;

  if ws.id is null then
    return jsonb_build_object(
      'ok', true,
      'type', 'feg-stage-pro-auth-action-post-verify-preflight',
      'version', '3.14.4',
      'workspace_resolved', false,
      'remote_write_executed', false,
      'no_profile_write', true,
      'no_invite_consume', true,
      'no_bootstrap_mutation', true,
      'rollback_automatic', false,
      'reason', 'workspace_not_found'
    );
  end if;

  select count(*) into profile_count from public.profiles where workspace_id = ws.id;
  select count(*) into admin_count from public.profiles where workspace_id = ws.id and role = 'admin' and status = 'active';
  select count(*) into invite_count from public.invite_keys where workspace_id = ws.id;
  select count(*) into active_invite_count from public.invite_keys where workspace_id = ws.id and is_active = true;

  return jsonb_build_object(
    'ok', true,
    'type', 'feg-stage-pro-auth-action-post-verify-preflight',
    'version', '3.14.4',
    'workspace_resolved', true,
    'workspace_id', ws.id,
    'workspace_slug', ws.slug,
    'profiles_count', profile_count,
    'active_admin_count', admin_count,
    'invite_keys_count', invite_count,
    'active_invite_keys_count', active_invite_count,
    'first_admin_required', admin_count = 0,
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true,
    'no_local_session_mutation', true,
    'rollback_automatic', false,
    'note', 'Read-only post-action verification helper. It is safe to call before/after auth-controlled-action skeleton.'
  );
end;
$$;

grant execute on function public.feg_auth_action_post_verify_preflight(text) to authenticated;
