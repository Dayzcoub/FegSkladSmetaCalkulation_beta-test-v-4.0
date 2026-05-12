import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

type AnyRow = Record<string, unknown>;

function toText(value: unknown) { return String(value ?? '').trim(); }
function isUuid(value: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toText(value)); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asArray(value: unknown): AnyRow[] { return Array.isArray(value) ? value as AnyRow[] : []; }
function localId(value: unknown) { return toText(value).slice(0, 180); }

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

function validateWriteGate(payload: AnyRow, rows: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (payload.dry_run !== false) blockers.push('dry_run must be false for controlled write');
  if (toText(payload.confirm_phrase) !== 'WRITE EQUIPMENT') blockers.push('confirm_phrase must be WRITE EQUIPMENT');
  if (Deno.env.get('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE') !== 'true') blockers.push('FEG_ENABLE_EQUIPMENT_REMOTE_WRITE is not true');
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) blockers.push('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  const plan = payload.controlled_write_plan as AnyRow | undefined;
  if (plan && plan.remote_write_armed !== true) blockers.push('controlled_write_plan.remote_write_armed is not true');
  const approval = payload.approval_package as AnyRow | undefined;
  const currentChecksum = payloadChecksum(rows);
  if (!approval) blockers.push('approval_package is required');
  if (approval && approval.approved !== true) blockers.push('approval_package.approved is not true');
  if (approval && toText(approval.payload_checksum) !== currentChecksum) blockers.push('approval_package.payload_checksum does not match current payload');
  if (plan && plan.approval_ok === false) blockers.push('controlled_write_plan.approval_ok is false');
  const equipment = asArray(rows.equipment_items);
  if (!equipment.length) blockers.push('equipment_items payload is empty');
  const codes = new Set<string>();
  equipment.forEach((row, index) => {
    const code = toText(row.code);
    const name = toText(row.name);
    if (!code) blockers.push(`equipment_items[${index}].code is required`);
    if (!name) blockers.push(`equipment_items[${index}].name is required`);
    const key = code.toLowerCase();
    if (key && codes.has(key)) blockers.push(`equipment_items duplicate code: ${code}`);
    if (key) codes.add(key);
  });
  return { ok: blockers.length === 0, blockers, warnings, payload_checksum: payloadChecksum(rows) };
}

async function resolveWorkspace(supabase: ReturnType<typeof createClient>, payload: AnyRow) {
  const slug = toText(payload.workspace_slug || payload.workspace_id || (payload.equipment_sync_payload as AnyRow | undefined)?.workspace_id || 'main') || 'main';
  if (isUuid(slug)) return { slug, id: slug, resolved: true, note: 'workspace id supplied as uuid' };
  const { data, error } = await supabase.from('workspaces').select('id, slug').eq('slug', slug).maybeSingle();
  if (error || !data) return { slug, id: '', resolved: false, note: error?.message || 'workspace not found' };
  return { slug, id: data.id, resolved: true, note: 'workspace resolved by slug' };
}

function sanitizeSupplier(row: AnyRow, workspaceId: string) {
  return {
    workspace_id: workspaceId,
    local_id: localId(row.id || row.local_id),
    name: toText(row.name || row.supplier_name) || 'Unnamed supplier',
    phone: toText(row.phone),
    email: toText(row.email),
    categories: Array.isArray(row.categories) ? row.categories : [],
    default_margin_rate: toNumber(row.default_margin_rate || row.defaultMarginRate, 0),
    notes: toText(row.notes),
    raw_payload: row
  };
}

function sanitizeEquipment(row: AnyRow, workspaceId: string) {
  const stockQty = toNumber(row.stock_qty ?? row.stockQty, 0);
  const reservedQty = Math.max(0, Math.min(stockQty, toNumber(row.reserved_qty ?? row.reservedQty, 0)));
  return {
    workspace_id: workspaceId,
    local_id: localId(row.id || row.local_id),
    category: toText(row.category),
    subcategory: toText(row.subcategory),
    type: toText(row.type),
    code: toText(row.code),
    name: toText(row.name),
    manufacturer: toText(row.manufacturer),
    model: toText(row.model),
    unit: toText(row.unit || 'шт') || 'шт',
    stock_qty: stockQty,
    reserved_qty: reservedQty,
    weight_kg: toNumber(row.weight_kg ?? row.weightKg, 0),
    power_w: toNumber(row.power_w ?? row.powerW, 0),
    startup_power_w: toNumber(row.startup_power_w ?? row.startupPowerW, 0),
    rental_price: toNumber(row.rental_price ?? row.rentalPrice, 0),
    replacement_cost: toNumber(row.replacement_cost ?? row.replacementCost, 0),
    source_type: toText(row.source_type || row.sourceType || 'own') || 'own',
    supplier_name: toText(row.supplier_name || row.supplierName),
    supplier_local_id: localId(row.supplier_id || row.supplierId),
    is_active: row.is_active == null ? row.isActive !== false : Boolean(row.is_active),
    notes: toText(row.notes),
    meta: row.meta && typeof row.meta === 'object' ? row.meta : {},
    schema_version: Math.trunc(toNumber(row.schema_version ?? row.schemaVersion, 0)),
    raw_payload: row
  };
}

async function registerRun(supabase: ReturnType<typeof createClient>, workspaceId: string, status: string, dryRun: boolean, executed: boolean, counts: AnyRow, blockers: string[], warnings: string[], requestMeta: AnyRow, resultMeta: AnyRow) {
  try {
    await supabase.rpc('feg_register_backend_sync_run', {
      target_workspace_id: workspaceId || null,
      target_run_type: 'equipment_controlled_write',
      target_status: status,
      target_dry_run: dryRun,
      target_remote_write_executed: executed,
      target_row_counts: counts,
      target_blockers: blockers,
      target_warnings: warnings,
      target_request_meta: requestMeta,
      target_result_meta: resultMeta
    });
  } catch (_) { /* ledger failure must not mask the main guarded result */ }
}

function buildControlledWriteAuditHints(counts: AnyRow, payloadChecksumValue: string) {
  return {
    status: 'post_write_verification_required',
    payload_checksum: payloadChecksumValue,
    remote_write_executed: true,
    automatic_rollback: false,
    required_next_steps: [
      'Run equipment-sync-dry-run with verify_after_controlled_write=true and the same approved payload.',
      'Archive feg_equipment_sync_audit.json after post-write verification passes.',
      'If remote_only rows appear, review them manually; this function does not delete remote rows.'
    ],
    counts,
    note: 'Controlled write only upserts approved payload. Rollback/cleanup is never automatic.'
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  const auth = requireTestKey(req);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  const payload = await readJson(req) as AnyRow;
  const rows = getRows(payload);
  const counts = summarizeRows(rows);
  const gate = validateWriteGate(payload, rows);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return jsonResponse({ ok: false, dry_run: payload.dry_run !== false, remote_write_executed: false, status: 'blocked_by_env', counts, blockers: gate.blockers, payload_checksum: gate.payload_checksum }, 503);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const workspace = await resolveWorkspace(supabase, payload);
  if (!workspace.resolved) gate.blockers.push(`workspace not resolved: ${workspace.note}`);
  if (!gate.ok || !workspace.resolved || gate.blockers.length) {
    await registerRun(supabase, workspace.id, 'blocked', payload.dry_run !== false, false, counts, gate.blockers, gate.warnings, { workspace_slug: workspace.slug }, { workspace });
    return jsonResponse({ ok: false, status: 'blocked_by_write_gate', dry_run: payload.dry_run !== false, remote_write_executed: false, workspace, counts, payload_checksum: gate.payload_checksum, blockers: gate.blockers, warnings: gate.warnings }, 400);
  }

  const supplierRows = asArray(rows.suppliers).map(row => sanitizeSupplier(row, workspace.id));
  const equipmentRows = asArray(rows.equipment_items).map(row => sanitizeEquipment(row, workspace.id));

  if (supplierRows.length) {
    const { error } = await supabase.from('suppliers').upsert(supplierRows, { onConflict: 'workspace_id,local_id' });
    if (error) {
      await registerRun(supabase, workspace.id, 'failed', false, false, counts, [error.message], gate.warnings, { workspace_slug: workspace.slug }, { stage: 'suppliers' });
      return jsonResponse({ ok: false, status: 'supplier_upsert_failed', remote_write_executed: false, error: error.message, workspace, counts }, 500);
    }
  }

  if (equipmentRows.length) {
    const { error } = await supabase.from('equipment_items').upsert(equipmentRows, { onConflict: 'workspace_id,code' });
    if (error) {
      await registerRun(supabase, workspace.id, 'failed', false, false, counts, [error.message], gate.warnings, { workspace_slug: workspace.slug }, { stage: 'equipment_items' });
      return jsonResponse({ ok: false, status: 'equipment_upsert_failed', remote_write_executed: false, error: error.message, workspace, counts }, 500);
    }
  }

  await registerRun(supabase, workspace.id, 'executed', false, true, counts, [], gate.warnings, { workspace_slug: workspace.slug }, { upserted: counts });
  return jsonResponse({ ok: true, status: 'equipment_controlled_write_executed', dry_run: false, remote_write_executed: true, workspace, counts, warnings: gate.warnings, payload_checksum: gate.payload_checksum, post_write_verification_required: true, post_write_verification_hint: 'Call equipment-sync-dry-run with verify_after_controlled_write=true and the same approved payload. Verification passes only when insert/update/remote_only are all zero.', sync_audit_required: true, rollback_hints: buildControlledWriteAuditHints(counts, gate.payload_checksum), timestamp: new Date().toISOString() });
});
