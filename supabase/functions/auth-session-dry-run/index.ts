import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

function toText(value: unknown) { return String(value ?? '').trim(); }
function normalizeRole(value: unknown) {
  const role = toText(value).toLowerCase();
  return ['admin', 'manager', 'technician', 'warehouse', 'viewer'].includes(role) ? role : 'viewer';
}

function maskKey(value: unknown) {
  const text = toText(value);
  if (!text) return '';
  return text.length <= 8 ? `${text.slice(0, 2)}••••${text.slice(-2)}` : `${text.slice(0, 6)}••••${text.slice(-4)}`;
}

function stableStringify(value: any): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function checksumString(value: any) {
  const text = stableStringify(value);
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value53 = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `auth-${value53.toString(16)}`;
}

function authActionChecksumMaterial(req: any) {
  const invite = req?.invite_registration_request?.registration || null;
  const admin = req?.first_admin_bootstrap_request?.first_admin || null;
  return {
    action: toText(req?.action || 'session_restore'),
    provider: toText(req?.provider || ''),
    workspace_slug: toText(req?.workspace_slug || req?.workspace_id || ''),
    redirect_to: toText(req?.redirect_to || ''),
    email_present: Boolean(req?.email_present),
    email_preview: toText(req?.email_preview || ''),
    request_validation_ok: Boolean(req?.request_validation?.ok),
    invite_registration_request: invite ? {
      email: toText(invite.email || ''),
      display_name: toText(invite.display_name || ''),
      company_name: toText(invite.company_name || ''),
      provider: toText(invite.provider || ''),
      requested_role: normalizeRole(invite.requested_role || ''),
      invite_key_present: Boolean(invite.invite_key_present)
    } : null,
    first_admin_bootstrap_request: admin ? {
      email: toText(admin.email || ''),
      display_name: toText(admin.display_name || ''),
      company_name: toText(admin.company_name || ''),
      requested_role: 'admin',
      bootstrap_key_present: Boolean(admin.bootstrap_key_present)
    } : null
  };
}

function authActionChecksum(req: any) {
  return checksumString(authActionChecksumMaterial(req || {}));
}


function buildRoleMatrix(role: string) {
  const permissions: Record<string, string[]> = {
    admin: ['*'],
    manager: ['dashboard:view', 'quotes:create', 'quotes:view', 'quotes:edit', 'clients:view', 'clients:edit', 'prices:view', 'projects:view', 'projects:edit', 'pdf:client', 'calendar:write', 'documents:view', 'command_center:view', 'reports:view', 'data_quality:view', 'equipment:view', 'equipment:edit', 'availability:view', 'stock:view', 'picklists:view'],
    technician: ['dashboard:view', 'quick_calculators:view', 'stage:quick', 'truss:quick', 'led:quick', 'bom:view', 'weights:view', 'power:view', 'equipment:view', 'documents:view', 'command_center:view', 'availability:view', 'prices:hidden', 'clients:hidden'],
    warehouse: ['dashboard:view', 'stock:view', 'picklists:view', 'documents:view', 'bom:view', 'availability:view', 'weights:view', 'equipment:view', 'command_center:view', 'reports:view', 'data_quality:view', 'prices:hidden', 'clients:hidden'],
    viewer: ['dashboard:view', 'projects:view', 'documents:view', 'command_center:view', 'prices:hidden', 'clients:hidden']
  };
  const sections = [
    ['quick', 'quick_calculators:view'], ['quote', 'quotes:create'], ['equipment', 'equipment:view'], ['warehouse', 'stock:view'], ['documents', 'documents:view'], ['projects', 'projects:view'], ['clients', 'clients:view'], ['settings', 'dashboard:view'], ['command', 'command_center:view'], ['reports', 'reports:view'], ['quality', 'data_quality:view'], ['sync', 'admin:access'], ['admin', 'admin:access']
  ];
  const perms = permissions[role] || permissions.viewer;
  const can = (permission: string) => perms.includes('*') || perms.includes(permission);
  const checks = sections.map(([section_id, permission]) => ({ section_id, permission, allowed: section_id === 'admin' || section_id === 'sync' ? role === 'admin' : can(permission) }));
  return { role, permissions: perms, checks, visible_sections: checks.filter((row) => row.allowed), hidden_sections: checks.filter((row) => !row.allowed) };
}


function summarizeBridge(payload: any, requestedRole: string) {
  const bridge = payload?.session_bridge || {};
  const runtimeUser = bridge?.runtime_user_preview || null;
  const supabaseSessionPresent = Boolean(bridge?.supabase_session_present || payload?.supabase_session_present || payload?.session?.user);
  return {
    status: runtimeUser ? 'runtime_user_preview_ready' : 'no_runtime_user_preview',
    requested_role: requestedRole,
    supabase_session_present: supabaseSessionPresent,
    runtime_user_present: Boolean(runtimeUser),
    runtime_email: toText(runtimeUser?.email || ''),
    runtime_workspace_id: toText(runtimeUser?.workspaceId || runtimeUser?.workspace_id || ''),
    no_profile_write: true,
    no_local_session_mutation: true
  };
}

function validateInviteTemplate(payload: any) {
  const req = payload?.invite_registration_request || {};
  const reg = req?.registration || {};
  const errors: string[] = [];
  if (req && Object.keys(req).length) {
    if (!toText(reg.email) || !/^\S+@\S+\.\S+$/.test(toText(reg.email))) errors.push('invite registration email is invalid');
    if (!toText(reg.display_name)) errors.push('invite registration display_name is required');
    if (!reg.invite_key_present) errors.push('invite key presence flag is false');
  }
  return {
    present: Boolean(req && Object.keys(req).length),
    ok: errors.length === 0,
    errors,
    invite_key_preview: maskKey(reg.invite_key_preview || ''),
    no_invite_consume: true,
    no_profile_write: true
  };
}


function validateAuthActionRequest(payload: any, remoteSummary: any) {
  const req = payload?.auth_action_request || {};
  const action = toText(req.action || payload?.requested_action || 'session_restore').toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = ['session_restore', 'email_magic_link', 'oauth_google', 'oauth_apple', 'invite_registration', 'first_admin_bootstrap', 'logout'];
  const normalized = allowed.includes(action) ? action : 'session_restore';
  const validation = req?.request_validation || {};
  const errors: string[] = [];
  const warnings: string[] = [];
  if (validation && Array.isArray(validation.errors)) errors.push(...validation.errors.map(toText).filter(Boolean));
  if (validation && Array.isArray(validation.warnings)) warnings.push(...validation.warnings.map(toText).filter(Boolean));
  if (!req || !Object.keys(req).length) warnings.push('auth_action_request is missing; default session_restore advisory returned.');
  if (normalized === 'email_magic_link' && !req.email_present) errors.push('email_magic_link requires email_present=true.');
  if (normalized === 'invite_registration') {
    const invite = req.invite_registration_request || payload?.invite_registration_request || {};
    if (!invite?.registration?.invite_key_present) errors.push('invite_registration requires invite key presence flag.');
    if (remoteSummary && remoteSummary.workspace_resolved && remoteSummary.active_invite_keys_count <= 0) warnings.push('remote workspace has no active invite keys.');
  }
  if (normalized === 'first_admin_bootstrap') {
    const bootstrap = req.first_admin_bootstrap_request || payload?.first_admin_bootstrap_request || {};
    if (!bootstrap?.first_admin?.bootstrap_key_present) errors.push('first_admin_bootstrap requires bootstrap key presence flag.');
    if (remoteSummary && remoteSummary.workspace_resolved && remoteSummary.active_admin_count > 0) errors.push('remote workspace already has active admin.');
  }
  if ((normalized === 'oauth_google' || normalized === 'oauth_apple') && !toText(req.redirect_to)) warnings.push('OAuth redirect_to is empty.');
  return {
    present: Boolean(req && Object.keys(req).length),
    action: normalized,
    provider: toText(req.provider || normalized),
    ok: errors.length === 0,
    errors,
    warnings,
    dry_run: true,
    remote_write_executed: false,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    no_local_session_mutation: true,
    raw_secret_exported: false,
    request_checksum: authActionChecksum(req),
    approval_ready: errors.length === 0
  };
}


function validateAuthExecutionTemplate(payload: any) {
  const template = payload?.auth_action_execution_template || payload?.execution_template || payload;
  const approval = template?.approval_package || payload?.approval_package || {};
  const request = template?.auth_action_request || payload?.auth_action_request || {};
  const checksum = authActionChecksum(request);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!approval?.approved) errors.push('approval_package.approved must be true');
  if (!toText(approval?.payload_checksum)) errors.push('approval_package.payload_checksum is required');
  if (approval?.payload_checksum && approval.payload_checksum !== checksum) errors.push('approval checksum does not match auth action request checksum');
  if (toText(template?.confirm_phrase || payload?.confirm_phrase || '') !== 'EXECUTE AUTH ACTION') errors.push('confirm_phrase must be EXECUTE AUTH ACTION');
  if (template?.dry_run !== false && payload?.dry_run !== false) errors.push('controlled auth action request must explicitly set dry_run=false');
  warnings.push('v3.14.5 auth-controlled-action is a guarded skeleton and does not execute auth mutations.');
  return {
    present: Boolean(template && Object.keys(template).length),
    action: toText(request?.action || template?.action || 'session_restore'),
    ok: errors.length === 0,
    errors,
    warnings,
    request_checksum: checksum,
    approval_checksum: toText(approval?.payload_checksum || ''),
    remote_write_executed: false,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    no_local_session_mutation: true,
    skeleton_only: true
  };
}

function validateBootstrapTemplate(payload: any, remoteSummary: any) {

  const req = payload?.first_admin_bootstrap_request || {};
  const admin = req?.first_admin || {};
  const errors: string[] = [];
  if (req && Object.keys(req).length) {
    if (!toText(admin.email) || !/^\S+@\S+\.\S+$/.test(toText(admin.email))) errors.push('first admin email is invalid');
    if (!toText(admin.display_name)) errors.push('first admin display_name is required');
    if (!admin.bootstrap_key_present) errors.push('bootstrap key presence flag is false');
    if (remoteSummary && remoteSummary.active_admin_count > 0) errors.push('remote workspace already has active admin');
  }
  return {
    present: Boolean(req && Object.keys(req).length),
    ok: errors.length === 0,
    errors,
    bootstrap_key_preview: maskKey(admin.bootstrap_key_preview || ''),
    first_admin_required_remote: Boolean(remoteSummary && remoteSummary.first_admin_required),
    no_bootstrap_mutation: true,
    no_profile_write: true
  };
}

function buildPostActionVerificationGate(payload: any, remoteSummary: any) {
  const report = payload?.controlled_action_report || {};
  const actionRequest = payload?.auth_action_request || report?.auth_action_request || {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const mutationReported = Boolean(report?.remote_write_executed);
  if (!payload?.verify_after_controlled_action) errors.push('verify_after_controlled_action=true is required for post-action verification.');
  if (!report || !Object.keys(report).length) errors.push('controlled_action_report is required for post-action verification.');
  if (mutationReported) warnings.push('controlled_action_report says remote_write_executed=true; inspect profiles/invite/auth users manually.');
  if (report?.reason === 'auth_remote_actions_not_implemented_in_static_milestone') warnings.push('v3.14.5 controlled auth action is non-mutating; verification confirms no remote auth mutation was expected.');
  if (remoteSummary?.query_error && remoteSummary.query_error !== 'workspace_not_found') warnings.push(`remote summary query warning: ${remoteSummary.query_error}`);
  return {
    present: Boolean(payload?.verify_after_controlled_action),
    action: toText(actionRequest?.action || report?.action || payload?.requested_action || 'session_restore'),
    ok: errors.length === 0,
    status: errors.length ? 'blocked' : mutationReported ? 'mutation_reported_manual_review_required' : 'verified_no_auth_mutation_reported',
    errors,
    blockers: errors,
    warnings,
    remote_write_executed: false,
    controlled_action_remote_write_executed: mutationReported,
    workspace_resolved: Boolean(remoteSummary?.workspace_resolved),
    profiles_count: remoteSummary?.profiles_count || 0,
    active_admin_count: remoteSummary?.active_admin_count || 0,
    active_invite_keys_count: remoteSummary?.active_invite_keys_count || 0,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    no_local_session_mutation: true
  };
}


function buildAuthActionCapabilityMatrix(payload: any, remoteSummary: any) {
  const actionAdvisory = validateAuthActionRequest(payload, remoteSummary);
  const execution = validateAuthExecutionTemplate(payload);
  const remoteActionsEnabled = Deno.env.get('FEG_ENABLE_AUTH_REMOTE_ACTIONS') === 'true';
  const serviceRolePresent = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const supabaseUrlPresent = Boolean(Deno.env.get('SUPABASE_URL'));
  const selected = actionAdvisory.action || 'session_restore';
  const rows = ['session_restore', 'email_magic_link', 'oauth_google', 'oauth_apple', 'invite_registration', 'first_admin_bootstrap', 'logout'].map((action) => {
    const checks: any[] = [
      { key: 'supabase_url', label: 'SUPABASE_URL present', ok: supabaseUrlPresent, severity: supabaseUrlPresent ? 'ok' : 'warning' },
      { key: 'request_valid', label: 'Action request validates', ok: action === selected ? actionAdvisory.ok : true, severity: action === selected && !actionAdvisory.ok ? 'error' : 'ok' }
    ];
    if (['invite_registration', 'first_admin_bootstrap'].includes(action)) {
      checks.push({ key: 'service_role', label: 'SUPABASE_SERVICE_ROLE_KEY present', ok: serviceRolePresent, severity: serviceRolePresent ? 'ok' : 'warning' });
      checks.push({ key: 'env_flag', label: 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true', ok: remoteActionsEnabled, severity: remoteActionsEnabled ? 'ok' : 'warning' });
    }
    if (action === 'invite_registration') checks.push({ key: 'invite_available', label: 'Remote active invite key available', ok: (remoteSummary?.active_invite_keys_count || 0) > 0, severity: (remoteSummary?.active_invite_keys_count || 0) > 0 ? 'ok' : 'warning' });
    if (action === 'first_admin_bootstrap') checks.push({ key: 'no_active_admin', label: 'Remote workspace has no active admin', ok: (remoteSummary?.active_admin_count || 0) === 0, severity: (remoteSummary?.active_admin_count || 0) === 0 ? 'ok' : 'error' });
    const blockers = checks.filter((row) => !row.ok && row.severity === 'error').map((row) => row.label);
    const warnings = checks.filter((row) => !row.ok && row.severity !== 'error').map((row) => row.label);
    return {
      action,
      selected: action === selected,
      status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_future_edge_adapter',
      blockers,
      warnings,
      checks,
      remote_write_executed: false,
      implemented_now: false,
      adapter_mode: 'preview_only_non_mutating'
    };
  });
  const selectedRow = rows.find((row) => row.action === selected) || rows[0];
  return {
    type: 'feg-stage-pro-auth-action-capability-matrix',
    version: '3.14.6',
    selected_action: selected,
    status: selectedRow.blockers.length ? 'blocked' : 'capability_preview_ready_non_mutating',
    rows,
    selected_row: selectedRow,
    execution_advisory: execution,
    remote_actions_enabled: remoteActionsEnabled,
    service_role_present: serviceRolePresent,
    supabase_url_present: supabaseUrlPresent,
    remote_write_executed: false,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    no_local_session_mutation: true
  };
}

function buildAuthAdapterSandbox(payload: any, remoteSummary: any) {
  const capability = buildAuthActionCapabilityMatrix(payload, remoteSummary);
  return {
    type: 'feg-stage-pro-auth-action-adapter-sandbox',
    version: '3.14.6',
    generated_at: new Date().toISOString(),
    selected_action: capability.selected_action,
    status: capability.status === 'blocked' ? 'blocked' : 'sandbox_ready_non_mutating',
    adapter_contracts: (capability.rows || []).map((row: any) => ({
      action: row.action,
      edge_entrypoint: row.action === 'session_restore' ? 'auth-session-dry-run' : 'auth-controlled-action',
      adapter_status: 'sandbox_stub_non_mutating',
      reads: row.reads || [],
      intended_writes: row.future_writes || [],
      required_env: row.required_env || [],
      remote_write_executed: false,
      implemented_now: false,
      rollback_hint: row.rollback_hint || ''
    })),
    blockers: capability.blockers || [],
    warnings: ['Auth adapter sandbox is read-only/non-mutating in v3.14.6.'],
    safety: { remote_write_executed: false, no_profile_write: true, no_invite_consume: true, no_bootstrap_mutation: true, no_local_session_mutation: true }
  };
}

function buildAuthActionMutationContract(payload: any, remoteSummary: any) {
  const sandbox = buildAuthAdapterSandbox(payload, remoteSummary);
  return {
    type: 'feg-stage-pro-auth-action-mutation-contract',
    version: '3.14.6',
    generated_at: new Date().toISOString(),
    selected_action: sandbox.selected_action,
    rows: sandbox.adapter_contracts.map((row: any) => ({
      action: row.action,
      allowed_now: false,
      future_mutation_scope: row.intended_writes,
      hard_stops: ['manual code review required', 'no raw secret persistence', 'no browser profile writes'],
      remote_write_executed: false
    })),
    status: 'contract_review_only',
    remote_write_executed: false
  };
}

function buildAuthRemoteActionsPromotionGate(payload: any, remoteSummary: any) {
  const capability = buildAuthActionCapabilityMatrix(payload, remoteSummary);
  const execution = validateAuthExecutionTemplate(payload);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (capability.selected_row?.blockers?.length) blockers.push(...capability.selected_row.blockers);
  if (!execution.ok) blockers.push(...execution.errors);
  blockers.push('Auth remote actions are intentionally non-mutating in v3.14.5; promote only after code review and manual env change.');
  if (!Deno.env.get('FEG_ENABLE_AUTH_REMOTE_ACTIONS')) warnings.push('FEG_ENABLE_AUTH_REMOTE_ACTIONS is not set.');
  return {
    type: 'feg-stage-pro-auth-remote-actions-promotion-gate',
    version: '3.14.6',
    ready: false,
    status: 'promotion_blocked_non_mutating_milestone',
    selected_action: capability.selected_action,
    capability_matrix: capability,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    remote_write_executed: false,
    requires_code_review: true,
    requires_server_env: 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true'
  };
}


Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const key = requireTestKey(req);
  if (!key.ok) return jsonResponse({ ok: false, type: 'feg-stage-pro-auth-session-dry-run', error: key.error, remote_write_executed: false }, key.status);

  const payload = await readJson(req);
  const workspaceSlug = toText(payload.workspace_slug || payload.workspace_id || 'main') || 'main';
  const requestedRole = normalizeRole(payload.requested_role || payload.auth_session_preflight?.role_matrix?.role || 'viewer');
  const serviceRolePresent = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const supabaseUrlPresent = Boolean(Deno.env.get('SUPABASE_URL'));

  let remoteSummary = {
    workspace_resolved: false,
    workspace_id: '',
    profiles_count: 0,
    active_admin_count: 0,
    invite_keys_count: 0,
    active_invite_keys_count: 0,
    first_admin_required: true,
    query_executed: false,
    query_error: ''
  };

  if (serviceRolePresent && supabaseUrlPresent) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
      const { data: workspace, error: workspaceError } = await client.from('workspaces').select('id, slug, name, is_active').eq('slug', workspaceSlug).maybeSingle();
      if (workspaceError) throw workspaceError;
      if (workspace?.id) {
        const [{ count: profilesCount, error: profilesError }, { count: adminsCount, error: adminsError }, { count: invitesCount, error: invitesError }, { count: activeInvitesCount, error: activeInvitesError }] = await Promise.all([
          client.from('profiles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          client.from('profiles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('role', 'admin').eq('status', 'active'),
          client.from('invite_keys').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          client.from('invite_keys').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('is_active', true)
        ]);
        const firstError = profilesError || adminsError || invitesError || activeInvitesError;
        if (firstError) throw firstError;
        remoteSummary = {
          workspace_resolved: true,
          workspace_id: workspace.id,
          profiles_count: profilesCount || 0,
          active_admin_count: adminsCount || 0,
          invite_keys_count: invitesCount || 0,
          active_invite_keys_count: activeInvitesCount || 0,
          first_admin_required: (adminsCount || 0) === 0,
          query_executed: true,
          query_error: ''
        };
      } else {
        remoteSummary.query_executed = true;
        remoteSummary.query_error = 'workspace_not_found';
      }
    } catch (err) {
      remoteSummary.query_executed = true;
      remoteSummary.query_error = err instanceof Error ? err.message : String(err);
    }
  }

  return jsonResponse({
    ok: true,
    type: 'feg-stage-pro-auth-session-dry-run',
    version: '3.14.6',
    generated_at: new Date().toISOString(),
    workspace_slug: workspaceSlug,
    dry_run: true,
    remote_write_executed: false,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    service_role_present: serviceRolePresent,
    supabase_url_present: supabaseUrlPresent,
    remote_summary: remoteSummary,
    role_matrix: buildRoleMatrix(requestedRole),
    session_bridge_advisory: summarizeBridge(payload, requestedRole),
    invite_registration_advisory: validateInviteTemplate(payload),
    first_admin_bootstrap_advisory: validateBootstrapTemplate(payload, remoteSummary),
    runtime_role_guard_advisory: { role: requestedRole, matrix_ready: true, no_role_mutation: true },
    auth_action_advisory: validateAuthActionRequest(payload, remoteSummary),
    auth_action_checksum: authActionChecksum(payload?.auth_action_request || {}),
    auth_action_execution_advisory: validateAuthExecutionTemplate(payload),
    post_action_verification_gate: buildPostActionVerificationGate(payload, remoteSummary),
    auth_action_capability_matrix: buildAuthActionCapabilityMatrix(payload, remoteSummary),
    auth_remote_actions_promotion_gate: buildAuthRemoteActionsPromotionGate(payload, remoteSummary),
    auth_action_adapter_sandbox: buildAuthAdapterSandbox(payload, remoteSummary),
    auth_action_mutation_contract: buildAuthActionMutationContract(payload, remoteSummary),
    promotion_gate: {
      ready_for_auth_shell_runtime: true,
      ready_for_session_bridge_preview: true,
      ready_for_profile_sync: remoteSummary.workspace_resolved && !remoteSummary.first_admin_required,
      ready_for_auth_action_dry_run: validateAuthActionRequest(payload, remoteSummary).ok,
      ready_for_auth_action_approval: validateAuthActionRequest(payload, remoteSummary).ok,
      ready_for_auth_controlled_action_template: validateAuthExecutionTemplate(payload).ok,
      ready_for_auth_post_action_verification: buildPostActionVerificationGate(payload, remoteSummary).ok,
      ready_for_auth_action_capability_review: buildAuthActionCapabilityMatrix(payload, remoteSummary).status !== 'blocked',
      ready_for_auth_adapter_sandbox_review: buildAuthAdapterSandbox(payload, remoteSummary).status !== 'blocked',
      blockers: remoteSummary.query_error && remoteSummary.query_error !== 'workspace_not_found' ? [remoteSummary.query_error] : [],
      warnings: remoteSummary.workspace_resolved ? [] : ['Workspace не найден или remote query недоступен. Это read-only dry-run.']
    }
  });
});
