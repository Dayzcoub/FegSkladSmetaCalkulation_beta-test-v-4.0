import http from 'node:http';
import { URL } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const PORT = Number(process.env.PACKIT_API_PORT || process.env.PORT || 8090);
const DATABASE_URL = process.env.PACKIT_DATABASE_URL || '';
const DB_CONFIG = DATABASE_URL
  ? { connectionString: DATABASE_URL }
  : {
      host: process.env.PACKIT_DB_HOST || '127.0.0.1',
      port: Number(process.env.PACKIT_DB_PORT || 5432),
      database: process.env.PACKIT_DB_NAME || 'packit_company_main',
      user: process.env.PACKIT_DB_USER || 'packit_app',
      password: process.env.PACKIT_DB_PASSWORD || '',
    };

const pool = new Pool({
  ...DB_CONFIG,
  max: Number(process.env.PACKIT_DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    console.error('[packit-api] unhandled error', error);
    json(res, 500, { ok: false, error: 'internal_error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[packit-api] listening on 127.0.0.1:${PORT}`);
});

async function route(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'OPTIONS') return cors(res, 204).end();
  if (req.method === 'GET' && url.pathname === '/health') return health(res);
  if (req.method === 'GET' && url.pathname === '/api/health') return health(res);
  if (req.method === 'GET' && url.pathname === '/api/equipment') return equipmentList(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/equipment/categories') return categoriesList(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/stock/balances') return stockBalances(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/subrentors') return subrentorsList(req, res, url);

  json(res, 404, { ok: false, error: 'not_found' });
}

async function health(res) {
  const db = await pool.query('select now() as now');
  json(res, 200, {
    ok: true,
    service: 'packit-company-main-api',
    time: new Date().toISOString(),
    dbTime: db.rows[0]?.now || null,
  });
}

async function equipmentList(req, res, url) {
  const workspaceKey = url.searchParams.get('workspace') || 'MAIN';
  const category = url.searchParams.get('category') || '';
  const search = normalizeSearch(url.searchParams.get('q') || '');
  const values = [workspaceKey];
  const where = ['w.workspace_key = $1', 'ei.is_active = true'];

  if (category) {
    values.push(category);
    where.push(`ei.category_key = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(lower(ei.name) like $${values.length} or lower(ei.code) like $${values.length} or lower(ei.manufacturer) like $${values.length} or lower(ei.model) like $${values.length})`);
  }

  const result = await pool.query(`
    select
      ei.id,
      ei.item_key,
      ei.code,
      ei.name,
      ei.category_key,
      ec.title as category_title,
      ei.subcategory,
      ei.item_type,
      ei.manufacturer,
      ei.model,
      ei.unit,
      ei.rental_price,
      ei.replacement_cost,
      ei.weight_kg,
      ei.power_w,
      ei.startup_power_w,
      coalesce(sb.qty_total, 0) as stock_qty,
      coalesce(sb.qty_reserved, 0) as reserved_qty,
      coalesce(sb.qty_available, 0) as available_qty
    from equipment_items ei
    join workspaces w on w.id = ei.workspace_id
    left join equipment_categories ec on ec.category_key = ei.category_key
    left join stock_balances sb on sb.workspace_id = ei.workspace_id and sb.equipment_item_id = ei.id and sb.location_key = 'main'
    where ${where.join(' and ')}
    order by ec.sort_order nulls last, ei.category_key, ei.name
    limit 500
  `, values);

  json(res, 200, {
    ok: true,
    workspace: workspaceKey,
    items: result.rows.map(mapEquipmentRow),
  });
}

async function categoriesList(req, res, url) {
  const result = await pool.query(`
    select category_key, title, parent_key, sort_order
    from equipment_categories
    order by sort_order, title
  `);
  json(res, 200, { ok: true, categories: result.rows });
}

async function stockBalances(req, res, url) {
  const workspaceKey = url.searchParams.get('workspace') || 'MAIN';
  const result = await pool.query(`
    select ei.item_key, ei.code, ei.name, sb.location_key, sb.qty_total, sb.qty_reserved, sb.qty_available
    from stock_balances sb
    join workspaces w on w.id = sb.workspace_id
    join equipment_items ei on ei.id = sb.equipment_item_id
    where w.workspace_key = $1
    order by ei.name
  `, [workspaceKey]);
  json(res, 200, { ok: true, workspace: workspaceKey, balances: result.rows });
}

async function subrentorsList(req, res, url) {
  const workspaceKey = url.searchParams.get('workspace') || 'MAIN';
  const result = await pool.query(`
    select s.id, s.supplier_key, s.name, s.supplier_type, s.status, s.contact_name, s.phone, s.email, s.notes
    from suppliers s
    join workspaces w on w.id = s.workspace_id
    where w.workspace_key = $1 and s.status = 'active' and s.supplier_type in ('subrentor', 'supplier')
    order by s.supplier_type, s.name
  `, [workspaceKey]);
  json(res, 200, { ok: true, workspace: workspaceKey, subrentors: result.rows });
}

function mapEquipmentRow(row) {
  return {
    id: row.item_key,
    serverId: row.id,
    itemKey: row.item_key,
    code: row.code,
    name: row.name,
    category: row.category_key,
    categoryTitle: row.category_title,
    subcategory: row.subcategory,
    type: row.item_type,
    manufacturer: row.manufacturer,
    model: row.model,
    unit: row.unit,
    rentalPrice: Number(row.rental_price || 0),
    replacementCost: Number(row.replacement_cost || 0),
    weightKg: Number(row.weight_kg || 0),
    powerW: Number(row.power_w || 0),
    startupPowerW: Number(row.startup_power_w || 0),
    stockQty: Number(row.stock_qty || 0),
    reservedQty: Number(row.reserved_qty || 0),
    availableQty: Number(row.available_qty || 0),
    sourceSystem: 'postgres',
    isActive: true,
  };
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase().slice(0, 120);
}

function json(res, status, payload) {
  cors(res, status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function cors(res, status) {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', process.env.PACKIT_API_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  return res;
}

process.on('SIGTERM', async () => {
  console.log('[packit-api] SIGTERM');
  await pool.end();
  process.exit(0);
});
