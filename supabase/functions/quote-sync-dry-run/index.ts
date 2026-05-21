import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

type AnyRow = Record<string, unknown>;

function toText(value: unknown) { return String(value ?? '').trim(); }
function isUuid(value: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toText(value)); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asArray(value: unknown): AnyRow[] { return Array.isArray(value) ? value as AnyRow[] : []; }
function key(value: unknown) { return toText(value).toLowerCase(); }

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const row = value as AnyRow;
  return `{${Object.keys(row).sort().map(name => `${JSON.stringify(name)}:${stableStringify(row[name])}`).join(',')}}`;
}

function checksum(value: unknown) {
  const input = stableStringify(value);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ code, 2246822519) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function checksumRow(row: AnyRow) {
  const clean: AnyRow = {};
  const skip = new Set(['raw_payload', 'created_at', 'updated_at', 'synced_at']);
  Object.keys(row || {}).sort().forEach(field => { if (!skip.has(field)) clean[field] = row[field]; });
  return clean;
}

function checksumRows(rows: AnyRow[], primaryKeys: string[]) {
  return asArray(rows).map(checksumRow).sort((a, b) => primaryKeys.map(field => toText(a[field])).join('|').localeCompare(primaryKeys.map(field => toText(b[field])).join('|')));
}

function quotePayloadChecksum(rows: AnyRow) {
  return checksum({
    clients: checksumRows(asArray(rows.clients), ['local_id', 'email', 'name']),
    quotes: checksumRows(asArray(rows.quotes), ['local_id', 'id', 'title', 'project_name']),
    quote_sections: checksumRows(asArray(rows.quote_sections), ['quote_id', 'section_key']),
    quote_items: checksumRows(asArray(rows.quote_items), ['quote_id', 'section_key', 'local_id', 'id', 'name']),
    audit_log: checksumRows(asArray(rows.audit_log), ['quote_id', 'local_id', 'id', 'action'])
  });
}

function getRows(payload: AnyRow) {
  const direct = payload?.rows as AnyRow | undefined;
  const nested = (payload?.quote_sync_payload as AnyRow | undefined)?.rows as AnyRow | undefined;
  const backend = (payload?.backend_sync_payload as AnyRow | undefined)?.rows as AnyRow | undefined;
  const preview = (payload?.quote_sync_preview as AnyRow | undefined)?.payload as AnyRow | undefined;
  return direct || nested || backend || (preview?.rows as AnyRow | undefined) || {};
}

function summarizeRows(rows: AnyRow) {
  const counts = {
    clients: asArray(rows.clients).length,
    quotes: asArray(rows.quotes).length,
    quote_sections: asArray(rows.quote_sections).length,
    quote_items: asArray(rows.quote_items).length,
    audit_log: asArray(rows.audit_log).length,
    total: 0
  };
  counts.total = counts.clients + counts.quotes + counts.quote_sections + counts.quote_items + counts.audit_log;
  return counts;
}

function validateRows(rows: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const quoteKeys = new Set<string>();
  const clientKeys = new Set<string>();
  const clients = asArray(rows.clients);
  const quotes = asArray(rows.quotes);
  if (!quotes.length) warnings.push('quotes payload is empty');
  clients.forEach((row, index) => {
    if (!toText(row.name)) blockers.push(`clients[${index}].name is required`);
    const id = key(row.local_id || row.id || row.email || row.name);
    if (id && clientKeys.has(id)) warnings.push(`clients duplicate key: ${id}`);
    if (id) clientKeys.add(id);
  });
  quotes.forEach((row, index) => {
    const id = toText(row.local_id || row.id);
    if (!id) blockers.push(`quotes[${index}].local_id is required`);
    if (!toText(row.title || row.project_name)) warnings.push(`quotes[${index}].title/project_name is empty`);
    const idKey = key(id);
    if (idKey && quoteKeys.has(idKey)) blockers.push(`quotes duplicate local_id: ${id}`);
    if (idKey) quoteKeys.add(idKey);
  });
  asArray(rows.quote_sections).forEach((row, index) => {
    if (!toText(row.quote_id || row.quote_local_id)) blockers.push(`quote_sections[${index}].quote_id is required`);
    if (!toText(row.section_key)) blockers.push(`quote_sections[${index}].section_key is required`);
  });
  asArray(rows.quote_items).forEach((row, index) => {
    if (!toText(row.quote_id || row.quote_local_id)) blockers.push(`quote_items[${index}].quote_id is required`);
    if (!toText(row.name)) blockers.push(`quote_items[${index}].name is required`);
    if (toNumber(row.qty, 0) <= 0) warnings.push(`quote_items[${index}].qty is zero or empty`);
  });
  return { ok: blockers.length === 0, blockers, warnings };
}

async function resolveWorkspace(payload: AnyRow) {
  const slug = toText(payload.workspace_slug || payload.workspace_id || (payload.quote_sync_payload as AnyRow | undefined)?.workspace_id || 'main') || 'main';
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return { slug, id: '', resolved: false, note: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  if (isUuid(slug)) return { slug, id: slug, resolved: true, note: 'workspace id supplied as uuid' };
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('workspaces').select('id, slug').eq('slug', slug).maybeSingle();
  if (error || !data) return { slug, id: '', resolved: false, note: error?.message || 'workspace not found' };
  return { slug, id: data.id, resolved: true, note: 'workspace resolved by slug' };
}

function comparableClient(row: AnyRow) {
  return {
    name: toText(row.name),
    company: toText(row.company || row.company_name),
    contact_name: toText(row.contact_name || row.contactName),
    phone: toText(row.phone),
    email: toText(row.email),
    notes: toText(row.notes)
  };
}

function comparableQuote(row: AnyRow) {
  return {
    title: toText(row.title || row.project_name),
    status: toText(row.status || 'draft'),
    venue_name: toText(row.venue_name),
    venue_address: toText(row.venue_address || row.event_address),
    event_date: toText(row.event_date),
    total_price: toNumber(row.total_price, 0),
    total_weight_kg: toNumber(row.total_weight_kg, 0),
    total_power_w: toNumber(row.total_power_w, 0)
  };
}

function changedFields(local: AnyRow, remote: AnyRow, mode: 'client' | 'quote') {
  const left = mode === 'client' ? comparableClient(local) : comparableQuote(local);
  const right = mode === 'client' ? comparableClient(remote) : comparableQuote(remote);
  return Object.keys(left).filter(field => String((left as AnyRow)[field]) !== String((right as AnyRow)[field]));
}

function diffRows(localRows: AnyRow[], remoteRows: AnyRow[], mode: 'client' | 'quote') {
  const remoteByLocalId = new Map(remoteRows.map(row => [key(row.local_id || row.id), row]).filter(([id]) => Boolean(id)));
  const remoteByName = new Map(remoteRows.map(row => [key(mode === 'client' ? row.name : (row.project_name || row.title)), row]).filter(([id]) => Boolean(id)));
  const seenRemoteIds = new Set<string>();
  const operations = localRows.map(row => {
    const localKey = key(row.local_id || row.id);
    const nameKey = key(mode === 'client' ? row.name : (row.project_name || row.title));
    const remote = remoteByLocalId.get(localKey) || remoteByName.get(nameKey);
    const label = mode === 'client' ? toText(row.name) : toText(row.project_name || row.title);
    if (!remote) return { operation: 'insert', local_id: toText(row.local_id || row.id), label, changed_fields: [], remote_id: '' };
    seenRemoteIds.add(toText(remote.id));
    const fields = changedFields(row, remote, mode);
    return { operation: fields.length ? 'update' : 'unchanged', local_id: toText(row.local_id || row.id), label, changed_fields: fields, remote_id: toText(remote.id) };
  });
  remoteRows.forEach(row => {
    if (!seenRemoteIds.has(toText(row.id))) operations.push({ operation: 'remote_only', local_id: toText(row.local_id), label: mode === 'client' ? toText(row.name) : toText(row.project_name || row.title), changed_fields: [], remote_id: toText(row.id) });
  });
  return operations;
}

function countOperations(operations: AnyRow[]) {
  return operations.reduce((acc, row) => {
    const op = toText(row.operation) || 'unknown';
    acc[op] = (acc[op] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

async function buildRemoteDiff(rows: AnyRow, workspace: { id: string; resolved: boolean }) {
  if (!workspace.resolved || !workspace.id) return null;
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return null;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [{ data: clients, error: clientsError }, { data: quotes, error: quotesError }] = await Promise.all([
    supabase.from('clients').select('id,local_id,name,company,company_name,contact_name,phone,email,notes,updated_at').eq('workspace_id', workspace.id).limit(5000),
    supabase.from('quotes').select('id,local_id,project_name,status,venue_name,event_address,event_date,total_price,total_weight_kg,total_power_w,updated_at').eq('workspace_id', workspace.id).limit(5000)
  ]);
  if (clientsError || quotesError) return { ok: false, status: 'remote_query_failed', error: clientsError?.message || quotesError?.message, status_counts: {}, operations_sample: [] };
  const clientOps = diffRows(asArray(rows.clients), Array.isArray(clients) ? clients as AnyRow[] : [], 'client');
  const quoteOps = diffRows(asArray(rows.quotes), Array.isArray(quotes) ? quotes as AnyRow[] : [], 'quote');
  return {
    ok: true,
    status: 'remote_diff_ready',
    baseline_rows: { clients: Array.isArray(clients) ? clients.length : 0, quotes: Array.isArray(quotes) ? quotes.length : 0 },
    local_rows: { clients: asArray(rows.clients).length, quotes: asArray(rows.quotes).length },
    status_counts: { clients: countOperations(clientOps), quotes: countOperations(quoteOps) },
    operations_sample: { clients: clientOps.slice(0, 50), quotes: quoteOps.slice(0, 50) },
    note: 'Quote sync diff is read-only. It does not execute upsert, stock movement, or reservation writes.'
  };
}

function buildPromotionGate(validation: { ok: boolean; blockers: string[]; warnings: string[] }, workspace: { resolved: boolean; note: string }, remoteDiff: AnyRow | null, counts: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!validation.ok) blockers.push(...validation.blockers);
  if (!workspace.resolved) blockers.push(`workspace not resolved: ${workspace.note}`);
  if (!remoteDiff) warnings.push('remote_diff is missing');
  if (remoteDiff && remoteDiff.ok === false) blockers.push(`remote_diff failed: ${toText(remoteDiff.error || remoteDiff.status)}`);
  if (toNumber(counts.quotes, 0) <= 0) warnings.push('quotes payload is empty');
  return {
    status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_quote_sync_groundwork',
    ready_for_quote_sync_groundwork: blockers.length === 0,
    remote_write_executed: false,
    blockers,
    warnings,
    checks: [
      { key: 'payload_valid', ok: validation.ok },
      { key: 'workspace_resolved', ok: workspace.resolved },
      { key: 'remote_diff_ready', ok: Boolean(remoteDiff && remoteDiff.ok !== false) },
      { key: 'no_quote_write', ok: true },
      { key: 'no_stock_movements', ok: true },
      { key: 'no_reservations', ok: true }
    ],
    note: 'This is a read-only quote dry-run. Controlled quote write is available only through quote-controlled-write with approval checksum, WRITE QUOTE phrase, service role and FEG_ENABLE_QUOTE_REMOTE_WRITE=true. Stock movements and reservations remain disabled.'
  };
}

function nestedCount(statusCounts: AnyRow, operation: string) {
  const counts = statusCounts || {};
  if (typeof counts[operation] === 'number') return Number(counts[operation]) || 0;
  return Object.keys(counts).reduce((sum, table) => sum + toNumber((counts[table] as AnyRow | undefined)?.[operation], 0), 0);
}

function buildPostWriteVerificationGate(validation: { ok: boolean; blockers: string[]; warnings: string[] }, workspace: { resolved: boolean; note: string }, remoteDiff: AnyRow | null, payloadChecksum: string) {
  const statusCounts = (remoteDiff?.status_counts || {}) as AnyRow;
  const insert = nestedCount(statusCounts, 'insert');
  const update = nestedCount(statusCounts, 'update');
  const remoteOnly = nestedCount(statusCounts, 'remote_only');
  const unchanged = nestedCount(statusCounts, 'unchanged');
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!validation.ok) blockers.push(...validation.blockers);
  if (!workspace.resolved) blockers.push(`workspace not resolved: ${workspace.note}`);
  if (!remoteDiff || remoteDiff.ok === false) blockers.push(`remote_diff failed: ${toText(remoteDiff?.error || remoteDiff?.status || 'missing')}`);
  if (insert > 0) blockers.push(`pending insert operations after quote write: ${insert}`);
  if (update > 0) blockers.push(`pending update operations after quote write: ${update}`);
  if (unchanged <= 0) blockers.push('no unchanged clients/quotes rows detected after quote write');
  if (remoteOnly > 0) warnings.push(`remote_only rows require manual review: ${remoteOnly}`);
  return {
    status: blockers.length ? 'quote_post_write_verification_failed' : 'quote_post_write_verified',
    verified: blockers.length === 0,
    remote_write_executed: false,
    payload_checksum: payloadChecksum,
    totals: { insert, update, unchanged, remote_only: remoteOnly },
    blockers,
    warnings,
    checks: [
      { key: 'payload_valid', ok: validation.ok },
      { key: 'workspace_resolved', ok: workspace.resolved },
      { key: 'remote_diff_ready', ok: Boolean(remoteDiff && remoteDiff.ok !== false) },
      { key: 'no_pending_inserts', ok: insert === 0 },
      { key: 'no_pending_updates', ok: update === 0 },
      { key: 'has_unchanged_rows', ok: unchanged > 0 },
      { key: 'read_only_verification', ok: true },
      { key: 'no_stock_movements', ok: true },
      { key: 'no_reservations', ok: true }
    ],
    note: 'Post-write verification is read-only. remote_only rows are advisory and are never deleted automatically.'
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const auth = requireTestKey(req);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  const payload = await readJson(req) as AnyRow;
  const rows = getRows(payload);
  const validation = validateRows(rows);
  const workspace = await resolveWorkspace(payload);
  const counts = summarizeRows(rows);
  const remoteDiff = await buildRemoteDiff(rows, workspace);
  const payloadChecksum = quotePayloadChecksum(rows);
  return jsonResponse({
    ok: validation.ok,
    type: 'feg-stage-pro-quote-edge-dry-run-report',
    version: '3.13.2',
    dry_run: true,
    remote_write_executed: false,
    workspace,
    counts,
    payload_checksum: payloadChecksum,
    blockers: validation.blockers,
    warnings: validation.warnings.concat(workspace.resolved ? [] : [`workspace not resolved: ${workspace.note}`]),
    remote_diff: remoteDiff,
    promotion_gate: buildPromotionGate(validation, workspace, remoteDiff, counts),
    post_write_verification_gate: payload.verify_after_controlled_write === true ? buildPostWriteVerificationGate(validation, workspace, remoteDiff, payloadChecksum) : null,
    approval_advisory: {
      next_step: 'build_quote_write_approval_package',
      requires_payload_checksum: true,
      stale_payload_blocked: true,
      controlled_quote_write_enabled: true
    },
    required_env: {
      supabase_url_present: Boolean(Deno.env.get('SUPABASE_URL')),
      service_role_present: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
      quote_remote_write_enabled: Deno.env.get('FEG_ENABLE_QUOTE_REMOTE_WRITE') === 'true'
    },
    safety: {
      no_upsert: true,
      no_stock_movements: true,
      no_reservations: true,
      no_browser_write: true
    },
    timestamp: new Date().toISOString()
  });
});
