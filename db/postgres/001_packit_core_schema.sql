-- PACK.IT / FEG Stage PRO PostgreSQL core schema
-- First server-side persistence layer for company-main.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  title text not null,
  scope text not null default 'workspace',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role_key text not null references roles(role_key),
  status text not null default 'active',
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists invite_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  invite_code text not null unique,
  role_key text not null references roles(role_key),
  status text not null default 'active',
  expires_at timestamptz,
  used_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists equipment_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null unique,
  title text not null,
  parent_key text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists equipment_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  item_key text not null,
  code text not null,
  name text not null,
  category_key text not null references equipment_categories(category_key),
  subcategory text not null default '',
  item_type text not null default 'equipment',
  manufacturer text not null default '',
  model text not null default '',
  unit text not null default 'шт',
  rental_price numeric(14,2) not null default 0,
  replacement_cost numeric(14,2) not null default 0,
  weight_kg numeric(14,3) not null default 0,
  power_w numeric(14,2) not null default 0,
  startup_power_w numeric(14,2) not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, item_key),
  unique(workspace_id, code)
);

create table if not exists stock_balances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  equipment_item_id uuid not null references equipment_items(id) on delete cascade,
  location_key text not null default 'main',
  qty_total numeric(14,3) not null default 0,
  qty_reserved numeric(14,3) not null default 0,
  qty_available numeric(14,3) generated always as (greatest(qty_total - qty_reserved, 0)) stored,
  updated_at timestamptz not null default now(),
  unique(workspace_id, equipment_item_id, location_key)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  equipment_item_id uuid references equipment_items(id) on delete set null,
  movement_type text not null,
  qty numeric(14,3) not null,
  location_key text not null default 'main',
  source_type text not null default 'manual',
  source_id uuid,
  comment text not null default '',
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  supplier_key text not null,
  name text not null,
  supplier_type text not null default 'supplier',
  status text not null default 'active',
  contact_name text,
  phone text,
  email text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, supplier_key)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_key text not null,
  name text not null,
  phone text,
  email text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, client_key)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_key text not null,
  title text not null,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, project_key)
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  quote_key text not null,
  title text not null,
  status text not null default 'draft',
  currency text not null default 'RUB',
  rent_days numeric(8,2) not null default 1,
  totals jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, quote_key)
);

create table if not exists quote_sections (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  section_key text not null,
  title text not null,
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quote_id, section_key)
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  section_key text not null default 'equipment',
  equipment_item_id uuid references equipment_items(id) on delete set null,
  manual_name text,
  code text,
  name text not null,
  qty numeric(14,3) not null default 0,
  unit text not null default 'шт',
  source_type text not null default 'stock',
  stock_qty numeric(14,3) not null default 0,
  deficit_qty numeric(14,3) not null default 0,
  subrent_qty numeric(14,3) not null default 0,
  subrent_supplier_id uuid references suppliers(id) on delete set null,
  subrent_unit_cost numeric(14,2) not null default 0,
  client_unit_price numeric(14,2) not null default 0,
  margin numeric(14,2) not null default 0,
  weight_kg numeric(14,3) not null default 0,
  power_w numeric(14,2) not null default 0,
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  quote_id uuid references quotes(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  equipment_item_id uuid not null references equipment_items(id) on delete cascade,
  qty numeric(14,3) not null default 0,
  status text not null default 'active',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_payload jsonb,
  after_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_equipment_items_workspace_category on equipment_items(workspace_id, category_key);
create index if not exists idx_quote_items_quote on quote_items(quote_id, section_key);
create index if not exists idx_reservations_item_dates on reservations(equipment_item_id, starts_at, ends_at);
create index if not exists idx_stock_balances_workspace_item on stock_balances(workspace_id, equipment_item_id);
