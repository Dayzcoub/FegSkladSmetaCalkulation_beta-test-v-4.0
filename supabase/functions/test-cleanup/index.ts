import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson, testWorkspaceSlug } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const auth = requireTestKey(req);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  const payload = await readJson(req);
  const slug = testWorkspaceSlug(payload);
  const dryRun = payload?.dry_run !== false;
  if (dryRun) return jsonResponse({ ok: true, dry_run: true, action: 'cleanup-test-workspace', workspace_slug: slug });
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return jsonResponse({ ok: false, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, 503);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: workspace, error: findError } = await supabase.from('workspaces').select('id, slug').eq('slug', slug).single();
  if (findError) return jsonResponse({ ok: true, dry_run: false, workspace_slug: slug, deleted: false, note: findError.message });
  const { error } = await supabase.from('workspaces').delete().eq('id', workspace.id);
  if (error) return jsonResponse({ ok: false, error: error.message }, 500);
  return jsonResponse({ ok: true, dry_run: false, workspace_slug: slug, deleted: true });
});
