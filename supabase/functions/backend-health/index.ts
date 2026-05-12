import { jsonResponse, jsonHeaders } from '../_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const env = Deno.env.get('FEG_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
  return jsonResponse({
    ok: true,
    type: 'feg-stage-pro-backend-health',
    env,
    supabase_url_present: Boolean(Deno.env.get('SUPABASE_URL')),
    service_role_present: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
    server_test_key_configured: Boolean(Deno.env.get('FEG_SERVER_TEST_KEY')),
    migrations: 'v4_schema_draft + v4_backend_sync_hardening',
    rls: 'expected-enabled',
    timestamp: new Date().toISOString()
  });
});
