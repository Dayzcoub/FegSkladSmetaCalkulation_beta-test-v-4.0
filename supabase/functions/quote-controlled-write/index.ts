import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import { jsonResponse, jsonHeaders, requireTestKey, readJson } from '../_shared.ts';

type AnyRow = Record<string, unknown>;

function toText(value: unknown) { return String(value ?? '').trim(); }
function isUuid(value: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toText(value)); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asArray(value: unknown): AnyRow[] { return Array.isArray(value) ? value as AnyRow[] : []; }
function localId(value: unknown) { return toText(value).slice(0, 180); }
function validDate(value: unknown) { const t = toText(value); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null; }
function safeStatus(value: unknown) {
  const v = toText(value || 'draft');
  const aliases: Record<string, string> = {
    draft: 'draft', черновик: 'draft',
    in_progress: 'in_progress', work: 'in_progress', 'в работе': 'in_progress',
    sent: 'sent', отправлено: 'sent',
    confirmed: 'confirmed', подтвержден: 'confirmed', 'подтверждён': 'confirmed',
    cancelled: 'cancelled', canceled: 'cancelled', отменен: 'cancelled', 'отменён': 'cancelled',
    completed: 'completed', завершен: 'completed', 'завершён': 'completed'
  };
  return aliases[v.toLowerCase()] || 'draft';
}
function safeSourceType(value: unknown) {
  const v = toText(value || 'own');
  return ['own', 'subrent', 'subrent_needed', 'manual', 'transport', 'service'].includes(v) ? v : 'manual';
}
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
function validateWriteGate(payload: AnyRow, rows: AnyRow) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (payload.dry_run !== false) blockers.push('dry_run must be false for controlled quote write');
  if (toText(payload.confirm_phrase) !== 'WRITE QUOTE') blockers.push('confirm_phrase must be WRITE QUOTE');
  if (Deno.env.get('FEG_ENABLE_QUOTE_REMOTE_WRITE') !== 'true') blockers.push('FEG_ENABLE_QUOTE_REMOTE_WRITE is not true');
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) blockers.push('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  const approval = payload.approval_package as AnyRow | undefined;
  const currentChecksum = quotePayloadChecksum(rows);
  if (!approval) blockers.push('approval_package is required');
  if (approval && approval.approved !== true) blockers.push('approval_package.approved is not true');
  if (approval && toText(approval.payload_checksum) !== currentChecksum) blockers.push('approval_package.payload_checksum does not match current quote payload');
  if (toText(payload.payload_checksum) && toText(payload.payload_checksum) !== currentChecksum) blockers.push('request payload_checksum does not match current quote payload');
  const quotes = asArray(rows.quotes);
  if (!quotes.length) blockers.push('quotes payload is empty');
  const quoteKeys = new Set<string>();
  quotes.forEach((row, index) => {
    const id = localId(row.local_id || row.id);
    if (!id) blockers.push(`quotes[${index}].local_id is required`);
    if (!toText(row.project_name || row.title)) warnings.push(`quotes[${index}].project_name/title is empty`);
    const key = id.toLowerCase();
    if (key && quoteKeys.has(key)) blockers.push(`quotes duplicate local_id: ${id}`);
    if (key) quoteKeys.add(key);
  });
  asArray(rows.clients).forEach((row, index) => {
    if (!toText(row.name)) blockers.push(`clients[${index}].name is required`);
  });
  asArray(rows.quote_items).forEach((row, index) => {
    if (!localId(row.local_id || row.id)) blockers.push(`quote_items[${index}].local_id is required`);
    if (!toText(row.quote_id || row.quote_local_id)) blockers.push(`quote_items[${index}].quote_id is required`);
    if (!toText(row.name)) blockers.push(`quote_items[${index}].name is required`);
  });
  return { ok: blockers.length === 0, blockers, warnings, payload_checksum: currentChecksum };
}
async function registerRun(supabase: ReturnType<typeof createClient>, workspaceId: string, status: string, dryRun: boolean, executed: boolean, counts: AnyRow, blockers: string[], warnings: string[], requestMeta: AnyRow, resultMeta: AnyRow) {
  try {
    await supabase.rpc('feg_register_backend_sync_run', {
      target_workspace_id: workspaceId || null,
      target_run_type: 'quote_controlled_write',
      target_status: status,
      target_dry_run: dryRun,
      target_remote_write_executed: executed,
      target_row_counts: counts,
      target_blockers: blockers,
      target_warnings: warnings,
      target_request_meta: requestMeta,
      target_result_meta: resultMeta
    });
  } catch (_) { /* ledger failure must not mask the guarded result */ }
}
async function resolveWorkspace(supabase: ReturnType<typeof createClient>, payload: AnyRow) {
  const slug = toText(payload.workspace_slug || payload.workspace_id || (payload.quote_sync_payload as AnyRow | undefined)?.workspace_id || 'main') || 'main';
  if (isUuid(slug)) return { slug, id: slug, resolved: true, note: 'workspace id supplied as uuid' };
  const { data, error } = await supabase.from('workspaces').select('id, slug').eq('slug', slug).maybeSingle();
  if (error || !data) return { slug, id: '', resolved: false, note: error?.message || 'workspace not found' };
  return { slug, id: data.id, resolved: true, note: 'workspace resolved by slug' };
}
function sanitizeClient(row: AnyRow, workspaceId: string) {
  return {
    workspace_id: workspaceId,
    local_id: localId(row.local_id || row.id || row.email || row.name),
    name: toText(row.name || row.company_name || row.company || 'Новый клиент') || 'Новый клиент',
    company_name: toText(row.company_name || row.company || row.name),
    company: toText(row.company || row.company_name || row.name),
    contact_name: toText(row.contact_name || row.contactName),
    phone: toText(row.phone),
    email: toText(row.email),
    notes: toText(row.notes),
    raw_payload: row
  };
}
function buildClientKeyMap(clientRows: AnyRow[], remoteClients: AnyRow[]) {
  const map = new Map<string, string>();
  remoteClients.forEach(row => {
    const id = toText(row.id);
    [row.local_id, row.name, row.email].forEach(value => { const k = localId(value).toLowerCase(); if (k && id) map.set(k, id); });
  });
  clientRows.forEach(row => {
    const id = toText((remoteClients.find(remote => localId(remote.local_id).toLowerCase() === localId(row.local_id).toLowerCase()) || {}).id);
    if (id) [row.local_id, row.name, row.email].forEach(value => { const k = localId(value).toLowerCase(); if (k) map.set(k, id); });
  });
  return map;
}
function resolveClientId(row: AnyRow, clientMap: Map<string, string>) {
  const keys = [row.client_id, row.client_local_id, row.client_name, row.contact_email].map(value => localId(value).toLowerCase()).filter(Boolean);
  for (const key of keys) if (clientMap.has(key)) return clientMap.get(key) || null;
  return null;
}
function sanitizeQuote(row: AnyRow, workspaceId: string, clientMap: Map<string, string>) {
  const local = localId(row.local_id || row.id || row.project_name || row.title);
  return {
    workspace_id: workspaceId,
    local_id: local,
    client_id: resolveClientId(row, clientMap),
    project_name: toText(row.project_name || row.title || 'Новый проект') || 'Новый проект',
    venue_name: toText(row.venue_name),
    event_address: toText(row.event_address || row.venue_address),
    event_date: validDate(row.event_date),
    contact_name: toText(row.contact_name),
    contact_phone: toText(row.contact_phone),
    contact_email: toText(row.contact_email),
    status: safeStatus(row.status),
    total_price: toNumber(row.total_price, 0),
    total_weight_kg: toNumber(row.total_weight_kg, 0),
    total_power_w: toNumber(row.total_power_w, 0),
    total_start_power_w: toNumber(row.total_start_power_w, 0),
    quote_data: (row.quote_data && typeof row.quote_data === 'object') ? row.quote_data : (row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {}),
    raw_payload: row
  };
}
async function fetchByLocalIds(supabase: ReturnType<typeof createClient>, table: string, workspaceId: string, localIds: string[]) {
  const ids = Array.from(new Set(localIds.map(localId).filter(Boolean)));
  if (!ids.length) return [];
  const { data, error } = await supabase.from(table).select('*').eq('workspace_id', workspaceId).in('local_id', ids);
  if (error) throw new Error(`${table} local_id fetch failed: ${error.message}`);
  return Array.isArray(data) ? data as AnyRow[] : [];
}
function buildQuoteMap(remoteQuotes: AnyRow[]) {
  const map = new Map<string, string>();
  remoteQuotes.forEach(row => {
    const id = toText(row.id);
    [row.local_id, row.project_name, row.title].forEach(value => { const k = localId(value).toLowerCase(); if (k && id) map.set(k, id); });
  });
  return map;
}
function resolveQuoteId(row: AnyRow, quoteMap: Map<string, string>) {
  const keys = [row.quote_id, row.quote_local_id, row.project_id, row.project_local_id].map(value => localId(value).toLowerCase()).filter(Boolean);
  for (const key of keys) if (quoteMap.has(key)) return quoteMap.get(key) || '';
  return '';
}
function sanitizeSection(row: AnyRow, workspaceId: string, quoteMap: Map<string, string>) {
  const quoteId = resolveQuoteId(row, quoteMap);
  return {
    workspace_id: workspaceId,
    quote_id: quoteId,
    local_id: localId(row.local_id || row.id || `${row.quote_id || row.quote_local_id}-${row.section_key}`),
    section_key: toText(row.section_key || 'general') || 'general',
    title: toText(row.title || row.section_key || 'Раздел') || 'Раздел',
    is_enabled: row.is_enabled == null ? true : Boolean(row.is_enabled),
    summary: (row.summary && typeof row.summary === 'object') ? row.summary : {},
    raw_payload: row
  };
}
function sanitizeItem(row: AnyRow, workspaceId: string, quoteMap: Map<string, string>) {
  const quoteId = resolveQuoteId(row, quoteMap);
  return {
    workspace_id: workspaceId,
    quote_id: quoteId,
    local_id: localId(row.local_id || row.id || `${row.quote_id || row.quote_local_id}-${row.section_key}-${row.code}-${row.name}`),
    section_key: toText(row.section_key || 'general') || 'general',
    item_id: localId(row.item_id || row.itemId),
    source_type: safeSourceType(row.source_type || row.sourceType),
    supplier_name: toText(row.supplier_name || row.supplierName),
    code: toText(row.code),
    name: toText(row.name) || 'Позиция',
    unit: toText(row.unit || 'шт') || 'шт',
    qty: toNumber(row.qty, 1),
    stock_qty: toNumber(row.stock_qty, 0),
    available_qty: toNumber(row.available_qty, 0),
    deficit_qty: toNumber(row.deficit_qty, 0),
    subrent_qty: toNumber(row.subrent_qty, 0),
    weight_kg: toNumber(row.weight_kg, 0),
    power_w: toNumber(row.power_w, 0),
    rental_price: toNumber(row.rental_price, 0),
    subrent_price: toNumber(row.subrent_price, 0),
    client_price: toNumber(row.client_price, 0),
    margin: toNumber(row.margin, 0),
    note: toText(row.note),
    meta: (row.meta && typeof row.meta === 'object') ? row.meta : {},
    raw_payload: row
  };
}
function sanitizeAudit(row: AnyRow, workspaceId: string, quoteMap: Map<string, string>) {
  const quoteId = resolveQuoteId(row, quoteMap);
  return {
    workspace_id: workspaceId,
    local_id: localId(row.local_id || row.id || `${row.quote_id || row.quote_local_id}-${row.action}-${row.created_at}`),
    quote_local_id: localId(row.quote_local_id || row.quote_id),
    project_local_id: localId(row.project_local_id || row.project_id),
    actor_local_id: localId(row.actor_local_id || row.actor_id),
    actor_name: toText(row.actor_name),
    actor_role: toText(row.actor_role),
    quote_id: quoteId || null,
    entity_type: toText(row.entity_type || 'quote') || 'quote',
    action: toText(row.action || 'quote_synced') || 'quote_synced',
    payload: (row.payload && typeof row.payload === 'object') ? row.payload : {},
    raw_payload: row,
    created_at: toText(row.created_at) || new Date().toISOString()
  };
}
function withoutEmptyQuote(rows: AnyRow[]) { return rows.filter(row => toText(row.quote_id)); }
function auditHints(counts: AnyRow, checksumValue: string) {
  return {
    status: 'quote_post_write_verification_required',
    payload_checksum: checksumValue,
    remote_write_executed: true,
    automatic_rollback: false,
    required_next_steps: [
      'Run quote-sync-dry-run again with the same approved payload.',
      'Confirm clients/quotes diff has no pending insert/update for approved rows.',
      'Review remote_only rows manually. This function does not delete remote data.',
      'Stock reservations and stock_movements are intentionally not created by quote-controlled-write.'
    ],
    counts,
    note: 'Controlled quote write upserts clients, quotes, quote_sections, quote_items and audit_log only.'
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
    return jsonResponse({ ok: false, status: 'blocked_by_quote_write_gate', dry_run: payload.dry_run !== false, remote_write_executed: false, workspace, counts, payload_checksum: gate.payload_checksum, blockers: gate.blockers, warnings: gate.warnings }, 400);
  }

  try {
    const clientRows = asArray(rows.clients).map(row => sanitizeClient(row, workspace.id));
    if (clientRows.length) {
      const { error } = await supabase.from('clients').upsert(clientRows, { onConflict: 'workspace_id,local_id' });
      if (error) throw new Error(`clients upsert failed: ${error.message}`);
    }
    const remoteClients = await fetchByLocalIds(supabase, 'clients', workspace.id, clientRows.map(row => toText(row.local_id)));
    const clientMap = buildClientKeyMap(clientRows, remoteClients);

    const quoteRows = asArray(rows.quotes).map(row => sanitizeQuote(row, workspace.id, clientMap));
    if (quoteRows.length) {
      const { error } = await supabase.from('quotes').upsert(quoteRows, { onConflict: 'workspace_id,local_id' });
      if (error) throw new Error(`quotes upsert failed: ${error.message}`);
    }
    const remoteQuotes = await fetchByLocalIds(supabase, 'quotes', workspace.id, quoteRows.map(row => toText(row.local_id)));
    const quoteMap = buildQuoteMap(remoteQuotes);

    const sectionRows = withoutEmptyQuote(asArray(rows.quote_sections).map(row => sanitizeSection(row, workspace.id, quoteMap)));
    if (sectionRows.length) {
      const { error } = await supabase.from('quote_sections').upsert(sectionRows, { onConflict: 'quote_id,section_key' });
      if (error) throw new Error(`quote_sections upsert failed: ${error.message}`);
    }

    const itemRows = withoutEmptyQuote(asArray(rows.quote_items).map(row => sanitizeItem(row, workspace.id, quoteMap)));
    if (itemRows.length) {
      const { error } = await supabase.from('quote_items').upsert(itemRows, { onConflict: 'quote_id,local_id' });
      if (error) throw new Error(`quote_items upsert failed: ${error.message}`);
    }

    const auditRows = asArray(rows.audit_log).map(row => sanitizeAudit(row, workspace.id, quoteMap)).filter(row => toText(row.local_id));
    if (auditRows.length) {
      const { error } = await supabase.from('audit_log').upsert(auditRows, { onConflict: 'workspace_id,local_id' });
      if (error) throw new Error(`audit_log upsert failed: ${error.message}`);
    }

    const executedCounts = { clients: clientRows.length, quotes: quoteRows.length, quote_sections: sectionRows.length, quote_items: itemRows.length, audit_log: auditRows.length, total: clientRows.length + quoteRows.length + sectionRows.length + itemRows.length + auditRows.length };
    await registerRun(supabase, workspace.id, 'executed', false, true, executedCounts, [], gate.warnings, { workspace_slug: workspace.slug }, { upserted: executedCounts, no_stock_movements: true, no_reservations: true });
    return jsonResponse({
      ok: true,
      status: 'quote_controlled_write_executed',
      dry_run: false,
      remote_write_executed: true,
      workspace,
      counts: executedCounts,
      warnings: gate.warnings,
      payload_checksum: gate.payload_checksum,
      no_stock_movements: true,
      no_reservations: true,
      post_write_verification_required: true,
      post_write_verification_hint: 'Run quote-sync-dry-run again with the same approved payload. Verification passes when approved clients/quotes have no pending insert/update operations.',
      sync_audit_required: true,
      rollback_hints: auditHints(executedCounts, gate.payload_checksum),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const message = String((err as Error).message || err);
    await registerRun(supabase, workspace.id, 'failed', false, false, counts, [message], gate.warnings, { workspace_slug: workspace.slug }, { error: message });
    return jsonResponse({ ok: false, status: 'quote_controlled_write_failed', remote_write_executed: false, error: message, workspace, counts, payload_checksum: gate.payload_checksum }, 500);
  }
});
