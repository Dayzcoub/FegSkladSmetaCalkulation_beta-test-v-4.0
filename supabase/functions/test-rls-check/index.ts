import { jsonResponse, jsonHeaders, requireTestKey, readJson, testWorkspaceSlug } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const auth = requireTestKey(req);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  const payload = await readJson(req);
  return jsonResponse({
    ok: true,
    type: 'feg-stage-pro-test-rls-check-report',
    workspace_slug: testWorkspaceSlug(payload),
    checks: [
      { key: 'workspace_isolation', ok: true, note: 'Draft check placeholder; verify with real auth sessions before production.' },
      { key: 'viewer_no_prices', ok: true, note: 'Draft check placeholder.' },
      { key: 'technician_no_clients', ok: true, note: 'Draft check placeholder.' },
      { key: 'warehouse_inventory_access', ok: true, note: 'Draft check placeholder.' }
    ],
    dry_run: true,
    timestamp: new Date().toISOString()
  });
});
