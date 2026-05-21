-- FEG Stage PRO v3.14.6
-- Auth action adapter sandbox / mutation contract preflight.
-- Read-only helper only; does not create users, consume invite keys, bootstrap admins, revoke sessions or mutate profiles.

create or replace function public.feg_auth_action_adapter_sandbox_preflight(p_workspace_slug text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_profiles_count integer := 0;
  v_active_admin_count integer := 0;
  v_active_invite_count integer := 0;
begin
  select id into v_workspace_id
  from public.workspaces
  where slug = coalesce(nullif(p_workspace_slug, ''), 'main')
  limit 1;

  if v_workspace_id is not null then
    select count(*) into v_profiles_count
    from public.profiles
    where workspace_id = v_workspace_id;

    select count(*) into v_active_admin_count
    from public.profiles
    where workspace_id = v_workspace_id
      and role = 'admin'
      and coalesce(status, 'active') <> 'disabled';

    select count(*) into v_active_invite_count
    from public.invite_keys
    where workspace_id = v_workspace_id
      and coalesce(status, 'active') = 'active'
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses);
  end if;

  return jsonb_build_object(
    'type', 'feg-stage-pro-auth-action-adapter-sandbox-preflight',
    'version', '3.14.6',
    'generated_at', now(),
    'workspace_slug', coalesce(nullif(p_workspace_slug, ''), 'main'),
    'workspace_id', v_workspace_id,
    'workspace_resolved', v_workspace_id is not null,
    'profiles_count', v_profiles_count,
    'active_admin_count', v_active_admin_count,
    'active_invite_keys_count', v_active_invite_count,
    'adapter_sandbox_status', 'read_only_non_mutating',
    'remote_write_executed', false,
    'no_profile_write', true,
    'no_invite_consume', true,
    'no_bootstrap_mutation', true,
    'no_session_mutation', true,
    'requires_manual_code_review', true,
    'ready_for_adapter_contract_review', true
  );
end;
$$;

grant execute on function public.feg_auth_action_adapter_sandbox_preflight(text) to authenticated;
