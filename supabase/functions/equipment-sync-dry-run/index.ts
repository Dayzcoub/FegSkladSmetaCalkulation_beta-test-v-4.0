import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

type AnyRow = Record<string, unknown>;

function toText(value: unknown) { return String(value ?? '').trim(); }
function isUuid(value: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(toText(value)); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asArray(value: unknown): AnyRow[] { return Array.isArray(value) ? value as AnyRow[] : []; }
function key(value: unknown) { return toText(value).toLowerCase(); }

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const row = value as AnyRow;
  return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${stableStringify(row[key])}`).join(',')}}`;
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
  Object.keys(row || {}).sort().forEach((field) => { if (!skip.has(field)) clean[field] = row[field]; });
  return clean;
}

function checksumRows(rows: AnyRow[], primaryKey: string) {
  return asArray(rows).map(checksumRow).sort((a, b) => toText(a[primaryKey] || a.code || a.local_id || a.id || a.name).localeCompare(toText(b[primaryKey] || b.code || b.local_id || b.id || b.name)));
}

function payloadChecksum(rows: AnyRow) {
  return checksum({ suppliers: checksumRows(asArray(rows.suppliers), 'name'), equipment_items: checksumRows(asArray(rows.equipment_items), 'code') });
}

function getRows(payload: AnyRow) {
  const direct = payload?.rows as AnyRow | undefined;
  const nested = (payload?.equipment_sync_payload as AnyRow | undefined)?.rows as AnyRow | undefined;
  const staged = (payload?.staged_payload as AnyRow | undefined)?.rows as AnyRow | undefined;
  return direct || nested || staged || {};
}

function summarizeRows(rows: AnyRow) {
  const suppliers = asArray(rows.suppliers);
  const equipment = asArray(rows.equipment_items);
  return { suppliers: suppliers.length, equipment_items: equipment.length, total: suppliers.length + equipment.length };
}

function validateRows(rows: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const equipment = asArray(rows.equipment_items);
  const suppliers = asArray(rows.suppliers);
  if (!equipment.length) blockers.push('equipment_items payload is empty');
  const codes = new Set<string>();
  equipment.forEach((row, index) => {
    const code = toText(row.code);
    const name = toText(row.name);
    const category = toText(row.category);
    const type = toText(row.type);
    if (!code) blockers.push(`equipment_items[${index}].code is required`);
    if (!name) blockers.push(`equipment_items[${index}].name is required`);
    if (!category) blockers.push(`equipment_items[${index}].category is required`);
    if (!type) blockers.push(`equipment_items[${index}].type is required`);
    const codeKey = code.toLowerCase();
    if (codeKey && codes.has(codeKey)) blockers.push(`equipment_items duplicate code: ${code}`);
    if (codeKey) codes.add(codeKey);
    if (toNumber(row.stock_qty) < 0) blockers.push(`equipment_items[${index}].stock_qty must be >= 0`);
    if (toNumber(row.reserved_qty) < 0) blockers.push(`equipment_items[${index}].reserved_qty must be >= 0`);
    if (toText(row.source_type) === 'subrent' && !toText(row.supplier_id) && !toText(row.supplier_name)) warnings.push(`equipment_items[${index}] subrent row has no supplier`);
  });
  suppliers.forEach((row, index) => { if (!toText(row.name)) warnings.push(`suppliers[${index}].name is empty`); });
  return { ok: blockers.length === 0, blockers, warnings };
}

async function resolveWorkspace(payload: AnyRow) {
  const slug = toText(payload.workspace_slug || payload.workspace_id || (payload.equipment_sync_payload as AnyRow | undefined)?.workspace_id || 'main') || 'main';
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return { slug, id: '', resolved: false, note: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  if (isUuid(slug)) return { slug, id: slug, resolved: true, note: 'workspace id supplied as uuid' };
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('workspaces').select('id, slug').eq('slug', slug).maybeSingle();
  if (error || !data) return { slug, id: '', resolved: false, note: error?.message || 'workspace not found' };
  return { slug, id: data.id, resolved: true, note: 'workspace resolved by slug' };
}

function comparable(row: AnyRow) {
  return {
    code: toText(row.code),
    name: toText(row.name),
    category: toText(row.category),
    subcategory: toText(row.subcategory),
    type: toText(row.type),
    unit: toText(row.unit || 'шт'),
    stock_qty: toNumber(row.stock_qty ?? row.stockQty, 0),
    reserved_qty: toNumber(row.reserved_qty ?? row.reservedQty, 0),
    weight_kg: toNumber(row.weight_kg ?? row.weightKg, 0),
    power_w: toNumber(row.power_w ?? row.powerW, 0),
    startup_power_w: toNumber(row.startup_power_w ?? row.startupPowerW, 0),
    rental_price: toNumber(row.rental_price ?? row.rentalPrice, 0),
    replacement_cost: toNumber(row.replacement_cost ?? row.replacementCost, 0),
    source_type: toText(row.source_type || row.sourceType || 'own'),
    is_active: row.is_active == null ? row.isActive !== false : Boolean(row.is_active)
  };
}

function changedFields(local: AnyRow, remote: AnyRow) {
  const left = comparable(local);
  const right = comparable(remote);
  return Object.keys(left).filter(field => String((left as AnyRow)[field]) !== String((right as AnyRow)[field]));
}

async function buildRemoteDiff(payloadRows: AnyRow, workspace: { id: string; resolved: boolean }) {
  if (!workspace.resolved || !workspace.id) return null;
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return null;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('equipment_items')
    .select('id,local_id,code,name,category,subcategory,type,unit,stock_qty,reserved_qty,weight_kg,power_w,startup_power_w,rental_price,replacement_cost,source_type,is_active,updated_at')
    .eq('workspace_id', workspace.id)
    .limit(5000);
  if (error) return { ok: false, status: 'remote_query_failed', error: error.message, status_counts: {}, operations_sample: [] };
  const remoteRows = Array.isArray(data) ? data as AnyRow[] : [];
  const remoteByCode = new Map(remoteRows.map(row => [key(row.code), row]));
  const remoteByLocalId = new Map(remoteRows.map(row => [key(row.local_id), row]).filter(([id]) => Boolean(id)));
  const localRows = asArray(payloadRows.equipment_items);
  const seenRemoteIds = new Set<string>();
  const operations = localRows.map(row => {
    const remote = remoteByCode.get(key(row.code)) || remoteByLocalId.get(key(row.id || row.local_id));
    if (!remote) return { operation: 'insert', code: toText(row.code), local_id: toText(row.id || row.local_id), name: toText(row.name), changed_fields: [], remote_id: '' };
    seenRemoteIds.add(toText(remote.id));
    const fields = changedFields(row, remote);
    return { operation: fields.length ? 'update' : 'unchanged', code: toText(row.code), local_id: toText(row.id || row.local_id), name: toText(row.name), changed_fields: fields, remote_id: toText(remote.id) };
  });
  remoteRows.forEach(row => {
    if (!seenRemoteIds.has(toText(row.id))) operations.push({ operation: 'remote_only', code: toText(row.code), local_id: toText(row.local_id), name: toText(row.name), changed_fields: [], remote_id: toText(row.id) });
  });
  const statusCounts = operations.reduce((acc, row) => {
    const op = toText(row.operation) || 'unknown';
    acc[op] = (acc[op] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    ok: true,
    status: 'remote_diff_ready',
    baseline_rows: remoteRows.length,
    local_rows: localRows.length,
    status_counts: statusCounts,
    operations_sample: operations.slice(0, 80),
    note: 'Diff is read-only. It does not execute upsert or stock movement.'
  };
}



function buildPostWriteVerificationGate(payload: AnyRow, validation: { ok: boolean; blockers: string[]; warnings: string[] }, workspace: { resolved: boolean; note: string }, remoteDiff: AnyRow | null, counts: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!payload.verify_after_controlled_write && !(payload.post_write_verification as AnyRow | undefined)) return null;
  if (!validation.ok) blockers.push(...validation.blockers);
  if (!workspace.resolved) blockers.push(`workspace not resolved: ${workspace.note}`);
  if (!remoteDiff) blockers.push('remote_diff is missing');
  if (remoteDiff && remoteDiff.ok === false) blockers.push(`remote_diff failed: ${toText(remoteDiff.error || remoteDiff.status)}`);
  const statusCounts = remoteDiff && typeof remoteDiff.status_counts === 'object' ? remoteDiff.status_counts as AnyRow : {};
  const inserts = toNumber(statusCounts.insert, 0);
  const updates = toNumber(statusCounts.update, 0);
  const remoteOnly = toNumber(statusCounts.remote_only, 0);
  const unchanged = toNumber(statusCounts.unchanged, 0);
  if (inserts > 0) blockers.push(`post-write verification pending inserts: ${inserts}`);
  if (updates > 0) blockers.push(`post-write verification pending updates: ${updates}`);
  if (remoteOnly > 0) blockers.push(`post-write verification remote_only rows: ${remoteOnly}`);
  if (unchanged < toNumber(counts.equipment_items, 0)) warnings.push(`unchanged rows ${unchanged} are lower than local equipment payload ${toNumber(counts.equipment_items, 0)}`);
  const verification = payload.post_write_verification as AnyRow | undefined;
  const expectedChecksum = toText(verification?.expected_payload_checksum || verification?.approval_checksum || '');
  const currentChecksum = payloadChecksum(getRows(payload));
  if (expectedChecksum && expectedChecksum !== currentChecksum) blockers.push('post-write expected payload checksum does not match current payload');
  return {
    status: blockers.length ? 'post_write_verification_failed' : 'post_write_verified',
    verified: blockers.length === 0,
    remote_write_executed: false,
    expected_payload_checksum: expectedChecksum,
    payload_checksum: currentChecksum,
    status_counts: { insert: inserts, update: updates, unchanged, remote_only: remoteOnly },
    blockers,
    warnings,
    checks: [
      { key: 'payload_valid', ok: validation.ok },
      { key: 'workspace_resolved', ok: workspace.resolved },
      { key: 'remote_diff_ready', ok: Boolean(remoteDiff && remoteDiff.ok !== false) },
      { key: 'no_pending_inserts', ok: inserts === 0 },
      { key: 'no_pending_updates', ok: updates === 0 },
      { key: 'no_remote_only_rows', ok: remoteOnly === 0 },
      { key: 'read_only_verification', ok: true }
    ],
    note: 'Post-write verification is read-only and succeeds only when server rows already match the approved local equipment payload.'
  };
}

function buildPromotionGate(validation: { ok: boolean; blockers: string[]; warnings: string[] }, workspace: { resolved: boolean; note: string }, remoteDiff: AnyRow | null, counts: AnyRow) {

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!validation.ok) blockers.push(...validation.blockers);
  if (!workspace.resolved) blockers.push(`workspace not resolved: ${workspace.note}`);
  if (!remoteDiff) warnings.push('remote_diff is missing');
  if (remoteDiff && remoteDiff.ok === false) blockers.push(`remote_diff failed: ${toText(remoteDiff.error || remoteDiff.status)}`);
  const statusCounts = remoteDiff && typeof remoteDiff.status_counts === 'object' ? remoteDiff.status_counts as AnyRow : {};
  const remoteOnly = toNumber(statusCounts.remote_only, 0);
  const updates = toNumber(statusCounts.update, 0);
  if (remoteOnly > 0) warnings.push(`remote_only rows present: ${remoteOnly}`);
  if (updates > 0) warnings.push(`updates pending: ${updates}`);
  if (toNumber(counts.equipment_items, 0) <= 0) blockers.push('equipment_items payload is empty');
  return {
    status: blockers.length ? 'blocked' : warnings.length ? 'ready_with_warnings' : 'ready_for_controlled_write_preflight',
    ready_for_controlled_write_preflight: blockers.length === 0,
    remote_write_executed: false,
    blockers,
    warnings,
    checks: [
      { key: 'payload_valid', ok: validation.ok },
      { key: 'workspace_resolved', ok: workspace.resolved },
      { key: 'remote_diff_ready', ok: Boolean(remoteDiff && remoteDiff.ok !== false) },
      { key: 'no_equipment_write', ok: true }
    ],
    note: 'This gate is advisory. Controlled write still requires the separate equipment-controlled-write function, env flag and WRITE EQUIPMENT phrase.'
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
  return jsonResponse({
    ok: validation.ok,
    type: 'feg-stage-pro-equipment-edge-dry-run-report',
    version: '3.12.7',
    dry_run: true,
    remote_write_executed: false,
    workspace,
    counts,
    payload_checksum: payloadChecksum(rows),
    blockers: validation.blockers,
    warnings: validation.warnings.concat(workspace.resolved ? [] : [`workspace not resolved: ${workspace.note}`]),
    remote_diff: remoteDiff,
    promotion_gate: buildPromotionGate(validation, workspace, remoteDiff, counts),
    post_write_verification_gate: buildPostWriteVerificationGate(payload, validation, workspace, remoteDiff, counts),
    required_env: {
      supabase_url_present: Boolean(Deno.env.get('SUPABASE_URL')),
      service_role_present: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
      remote_write_flag_enabled: Deno.env.get('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE') === 'true'
    },
    timestamp: new Date().toISOString()
  });
});
