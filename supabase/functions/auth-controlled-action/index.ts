import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

function toText(value: unknown) { return String(value ?? '').trim(); }
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
function normalizeRole(value: unknown) {
  const role = toText(value).toLowerCase();
  return ['admin', 'manager', 'technician', 'warehouse', 'viewer'].includes(role) ? role : 'viewer';
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
function authActionChecksum(req: any) { return checksumString(authActionChecksumMaterial(req || {})); }


function buildActionAdapterPlan(action: string, remoteActionsEnabled: boolean, serviceRolePresent: boolean, supabaseUrlPresent: boolean) {
  const normalized = toText(action || 'session_restore').toLowerCase().replace(/[\s-]+/g, '_');
  const map: Record<string, any> = {
    session_restore: { reads: ['auth session', 'profile bridge'], future_writes: [], enabled_by_env: false },
    email_magic_link: { reads: ['workspace config'], future_writes: ['Supabase Auth OTP request'], enabled_by_env: false },
    oauth_google: { reads: ['OAuth provider config'], future_writes: ['Supabase Auth OAuth redirect'], enabled_by_env: false },
    oauth_apple: { reads: ['OAuth provider config'], future_writes: ['Supabase Auth OAuth redirect'], enabled_by_env: false },
    invite_registration: { reads: ['workspace', 'invite_keys', 'profiles duplicate email'], future_writes: ['profiles insert', 'invite_keys consume', 'audit_log'], enabled_by_env: remoteActionsEnabled && serviceRolePresent && supabaseUrlPresent },
    first_admin_bootstrap: { reads: ['workspace', 'profiles active admin check', 'bootstrap key validation'], future_writes: ['profiles admin insert', 'bootstrap close', 'audit_log'], enabled_by_env: remoteActionsEnabled && serviceRolePresent && supabaseUrlPresent },
    logout: { reads: ['current session'], future_writes: ['Supabase Auth signOut/revoke'], enabled_by_env: false }
  };
  const plan = map[normalized] || map.session_restore;
  return {
    action: map[normalized] ? normalized : 'session_restore',
    adapter_status: 'preview_only_non_mutating',
    reads: plan.reads,
    future_writes: plan.future_writes,
    enabled_by_env: Boolean(plan.enabled_by_env),
    implemented_now: false,
    remote_write_executed: false,
    blockers: ['Auth action adapter is intentionally non-mutating in v3.14.6.'],
    warnings: remoteActionsEnabled ? ['FEG_ENABLE_AUTH_REMOTE_ACTIONS=true is set, but v3.14.6 still does not execute auth mutations.'] : ['FEG_ENABLE_AUTH_REMOTE_ACTIONS is false/not set.']
  };
}


function buildMutationContract(action: string, plan: any) {
  return {
    action: plan.action || action,
    adapter_status: 'sandbox_contract_non_mutating',
    allowed_now: false,
    reads: plan.reads || [],
    intended_writes: plan.future_writes || [],
    hard_stops: [
      'no raw invite/bootstrap secret persistence',
      'no browser-side profile write',
      'no invite consume without service-role Edge gate',
      'no first admin bootstrap if active admin exists',
      'manual code review required before mutating implementation'
    ],
    required_confirmation: 'EXECUTE AUTH ACTION',
    required_env: ['FEG_ENABLE_AUTH_REMOTE_ACTIONS=true', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    remote_write_executed: false
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const key = requireTestKey(req);
  if (!key.ok) return jsonResponse({ ok: false, type: 'feg-stage-pro-auth-controlled-action-report', error: key.error, remote_write_executed: false }, key.status);

  const payload = await readJson(req);
  const actionRequest = payload?.auth_action_request || {};
  const approval = payload?.approval_package || {};
  const checksum = authActionChecksum(actionRequest);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const remoteActionsEnabled = Deno.env.get('FEG_ENABLE_AUTH_REMOTE_ACTIONS') === 'true';
  const serviceRolePresent = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const supabaseUrlPresent = Boolean(Deno.env.get('SUPABASE_URL'));

  if (payload?.dry_run !== false) blockers.push('dry_run must be false for controlled auth action request.');
  if (toText(payload?.confirm_phrase) !== 'EXECUTE AUTH ACTION') blockers.push('confirm_phrase must be EXECUTE AUTH ACTION.');
  if (!approval?.approved) blockers.push('approval_package.approved must be true.');
  if (!toText(approval?.payload_checksum)) blockers.push('approval_package.payload_checksum is required.');
  if (approval?.payload_checksum && approval.payload_checksum !== checksum) blockers.push('approval checksum does not match auth_action_request checksum.');
  if (!remoteActionsEnabled) blockers.push('FEG_ENABLE_AUTH_REMOTE_ACTIONS is not true.');
  if (!serviceRolePresent) warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  if (!supabaseUrlPresent) warnings.push('SUPABASE_URL is not configured.');

  return jsonResponse({
    ok: blockers.length === 0 ? false : false,
    type: 'feg-stage-pro-auth-controlled-action-report',
    version: '3.14.6',
    generated_at: new Date().toISOString(),
    action: toText(actionRequest?.action || payload?.action || 'session_restore'),
    dry_run: payload?.dry_run !== false,
    remote_write_executed: false,
    no_profile_write: true,
    no_invite_consume: true,
    no_bootstrap_mutation: true,
    no_local_session_mutation: true,
    raw_secret_exported: false,
    remote_actions_enabled: remoteActionsEnabled,
    service_role_present: serviceRolePresent,
    supabase_url_present: supabaseUrlPresent,
    request_checksum: checksum,
    action_adapter_plan: buildActionAdapterPlan(toText(actionRequest?.action || payload?.action || 'session_restore'), remoteActionsEnabled, serviceRolePresent, supabaseUrlPresent),
    mutation_contract: buildMutationContract(toText(actionRequest?.action || payload?.action || 'session_restore'), buildActionAdapterPlan(toText(actionRequest?.action || payload?.action || 'session_restore'), remoteActionsEnabled, serviceRolePresent, supabaseUrlPresent)),
    adapter_sandbox: { status: 'sandbox_stub_non_mutating', implemented_now: false, remote_write_executed: false, blocks_real_auth_mutations: true, next_required_step: 'manual code review + separate implementation commit' },
    promotion_gate: { ready: false, status: 'promotion_blocked_sandbox_only_milestone', requires_code_review: true, requires_server_env: 'FEG_ENABLE_AUTH_REMOTE_ACTIONS=true', requires_adapter_promotion: true, remote_write_executed: false },
    approval_checksum: toText(approval?.payload_checksum || ''),
    blockers: blockers.length ? blockers : ['Auth controlled actions are intentionally not implemented in v3.14.6.'],
    warnings,
    reason: 'auth_remote_actions_sandbox_only_not_implemented',
    next_step_hint: 'Run auth-session-dry-run with verify_after_controlled_action=true, then save the safety audit before promoting real Supabase Auth action implementation.',
    post_action_verification_required: true,
    sync_audit_required: true,
    rollback_hints: [{ severity: 'ok', action: 'No rollback needed in v3.14.6 because auth-controlled-action is non-mutating.', automatic: false }]
  }, blockers.length ? 409 : 501);
});
