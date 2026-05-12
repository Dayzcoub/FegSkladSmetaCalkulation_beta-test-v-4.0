import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson, testWorkspaceSlug } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const auth = requireTestKey(req);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  const payload = await readJson(req);
  const dryRun = payload?.dry_run !== false;
  const rows = payload?.backend_sync_payload?.rows || {};
  const counts = Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));
  if (dryRun) return jsonResponse({ ok: true, dry_run: true, action: 'write-test-quote', workspace_slug: testWorkspaceSlug(payload), counts });
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return jsonResponse({ ok: false, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, 503);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const quote = Array.isArray(rows.quotes) ? rows.quotes[0] : null;
  if (!quote) return jsonResponse({ ok: false, error: 'No quote row in backend_sync_payload.rows.quotes' }, 400);
  const { data, error } = await supabase.from('quotes').upsert({ ...quote, quote_data: { ...(quote.quote_data || {}), is_test: true } }, { onConflict: 'workspace_id,local_id' }).select('id, local_id').single();
  if (error) return jsonResponse({ ok: false, error: error.message }, 500);
  return jsonResponse({ ok: true, dry_run: false, quote: data, counts });
});
