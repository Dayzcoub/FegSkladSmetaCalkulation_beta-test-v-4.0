export const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-feg-test-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS'
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: jsonHeaders });
}

export function requireTestKey(req: Request) {
  const expected = Deno.env.get('FEG_SERVER_TEST_KEY') || '';
  const actual = req.headers.get('x-feg-test-key') || '';
  if (!expected) return { ok: false, status: 503, error: 'FEG_SERVER_TEST_KEY is not configured' };
  if (!actual || actual !== expected) return { ok: false, status: 401, error: 'Invalid or missing x-feg-test-key' };
  return { ok: true };
}

export async function readJson(req: Request) {
  try { return await req.json(); }
  catch (_) { return {}; }
}

export function testWorkspaceSlug(payload: any) {
  return String(payload?.test_workspace_slug || payload?.workspace?.slug || 'feg-test-workspace').trim();
}
