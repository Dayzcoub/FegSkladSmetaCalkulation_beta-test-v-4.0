-- PACK.IT / FEG Stage PRO PostgreSQL seed data
-- Safe to run multiple times.

insert into workspaces (workspace_key, name, status)
values ('MAIN', 'PACK.IT Main Workspace', 'active')
on conflict (workspace_key) do update set name = excluded.name, status = excluded.status, updated_at = now();

insert into roles (role_key, title, permissions)
values
  ('admin', 'Администратор', '{"all":true}'::jsonb),
  ('manager', 'Менеджер', '{"quotes":true,"projects":true,"clients":true}'::jsonb),
  ('tech', 'Техник', '{"warehouse":true,"projects":true}'::jsonb),
  ('warehouse', 'Склад', '{"warehouse":true}'::jsonb),
  ('viewer', 'Просмотр', '{"read":true}'::jsonb),
  ('sound', 'Звук', '{"equipment.sound":true}'::jsonb),
  ('light', 'Свет', '{"equipment.light":true}'::jsonb),
  ('screens', 'Экраны', '{"equipment.led":true}'::jsonb),
  ('truss_stage', 'Фермы и сцены', '{"equipment.stage":true,"equipment.truss":true}'::jsonb),
  ('guest_specialist', 'Приглашённый спец', '{"limited":true}'::jsonb)
on conflict (role_key) do update set title = excluded.title, permissions = excluded.permissions;

insert into profiles (workspace_id, email, display_name, role_key, status)
select w.id, 'admin@feg.local', 'Администратор', 'admin', 'active'
from workspaces w where w.workspace_key = 'MAIN'
on conflict (workspace_id, email) do update set display_name = excluded.display_name, role_key = excluded.role_key, status = excluded.status, updated_at = now();

insert into equipment_categories (category_key, title, parent_key, sort_order)
values
  ('sound_pa', 'Звук / PA', null, 10),
  ('consoles', 'Пульты / управление', null, 20),
  ('monitoring', 'Мониторинг', null, 30),
  ('light', 'Свет', null, 40),
  ('backline', 'Бэклайн', null, 50),
  ('commutation', 'Коммутация', null, 60),
  ('services', 'Услуги', null, 70),
  ('stage', 'Сцены', null, 80),
  ('truss', 'Фермы', null, 90),
  ('led', 'LED экраны', null, 100)
on conflict (category_key) do update set title = excluded.title, parent_key = excluded.parent_key, sort_order = excluded.sort_order;

insert into suppliers (workspace_id, supplier_key, name, supplier_type, status, notes)
select w.id, x.supplier_key, x.name, x.supplier_type, 'active', x.notes
from workspaces w
cross join (values
  ('subrent-default', 'Субарендатор / временный', 'subrentor', 'Заполняется при дефиците складской позиции'),
  ('feg-internal', 'FEG / собственный склад', 'internal', 'Основной склад')
) as x(supplier_key, name, supplier_type, notes)
where w.workspace_key = 'MAIN'
on conflict (workspace_id, supplier_key) do update set name = excluded.name, supplier_type = excluded.supplier_type, status = excluded.status, notes = excluded.notes, updated_at = now();

with ws as (select id from workspaces where workspace_key = 'MAIN'),
seed(item_key, code, name, category_key, subcategory, item_type, manufacturer, model, unit, rental_price, replacement_cost, weight_kg, power_w, startup_power_w, stock_qty) as (
  values
  ('snd-la-k2', 'SND-LA-K2', 'L-Acoustics K2', 'sound_pa', 'line array', 'sound', 'L-Acoustics', 'K2', 'шт', 2200, 0, 56, 0, 0, 24),
  ('snd-la-ks28', 'SND-LA-KS28', 'L-Acoustics KS28', 'sound_pa', 'subwoofer', 'sound', 'L-Acoustics', 'KS28', 'шт', 2500, 0, 79, 0, 0, 12),
  ('snd-la-la12x', 'SND-LA-LA12X', 'L-Acoustics LA12X', 'sound_pa', 'amplifier', 'sound', 'L-Acoustics', 'LA12X', 'шт', 1200, 0, 14.5, 1000, 1000, 10),
  ('mix-digico-sd12', 'MIX-DIGICO-SD12', 'DiGiCo SD12', 'consoles', 'console', 'audio_console', 'DiGiCo', 'SD12', 'шт', 7500, 0, 29, 300, 300, 1),
  ('bkl-shure-sm58', 'BKL-SHURE-SM58', 'Shure SM58', 'backline', 'microphone', 'backline', 'Shure', 'SM58', 'шт', 250, 0, 0.3, 0, 0, 20),
  ('bkl-radial-j48', 'BKL-RADIAL-J48', 'Radial J48 DI', 'backline', 'di-box', 'backline', 'Radial', 'J48', 'шт', 700, 0, 0.7, 0, 0, 8),
  ('com-xlr-20m', 'COM-XLR-20M', 'Кабель XLR 20 м', 'commutation', 'xlr', 'cable', 'Proel', 'BULK250LU20', 'шт', 150, 0, 1.2, 0, 0, 30),
  ('com-powercon-10m', 'COM-POWERCON-10M', 'PowerCON TRUE1 10 м', 'commutation', 'powercon', 'cable', 'Neutrik', 'TRUE1', 'шт', 180, 0, 1.1, 0, 0, 24),
  ('lgt-robe-pointe', 'LGT-ROBE-POINTE', 'Robe Pointe', 'light', 'beam', 'light_fixture', 'Robe', 'Pointe', 'шт', 1800, 0, 15, 470, 470, 16),
  ('lgt-led-par-rgbw', 'LGT-LED-PAR-RGBW', 'LED PAR RGBW', 'light', 'led par', 'light_fixture', 'FEG', 'RGBW PAR', 'шт', 400, 0, 3, 120, 120, 24),
  ('lgt-grandma2-light', 'LGT-GRANDMA2-LIGHT', 'grandMA2 light', 'light', 'control', 'light_console', 'MA Lighting', 'grandMA2 light', 'шт', 6500, 0, 20, 250, 250, 1),
  ('srv-sound-engineer', 'SRV-SOUND-ENGINEER', 'Звукорежиссёр', 'services', 'sound engineer', 'service', 'FEG', 'service', 'смена', 12000, 0, 0, 0, 0, 12),
  ('srv-light-engineer', 'SRV-LIGHT-ENGINEER', 'Светорежиссёр', 'services', 'light engineer', 'service', 'FEG', 'service', 'смена', 12000, 0, 0, 0, 0, 12),
  ('srv-stagehand', 'SRV-STAGEHAND', 'Монтажник сцены / техники', 'services', 'stagehand', 'service', 'FEG', 'service', 'смена', 6000, 0, 0, 0, 0, 30)
)
insert into equipment_items (workspace_id, item_key, code, name, category_key, subcategory, item_type, manufacturer, model, unit, rental_price, replacement_cost, weight_kg, power_w, startup_power_w, is_active)
select ws.id, seed.item_key, seed.code, seed.name, seed.category_key, seed.subcategory, seed.item_type, seed.manufacturer, seed.model, seed.unit, seed.rental_price, seed.replacement_cost, seed.weight_kg, seed.power_w, seed.startup_power_w, true
from ws, seed
on conflict (workspace_id, item_key) do update set
  code = excluded.code,
  name = excluded.name,
  category_key = excluded.category_key,
  subcategory = excluded.subcategory,
  item_type = excluded.item_type,
  manufacturer = excluded.manufacturer,
  model = excluded.model,
  unit = excluded.unit,
  rental_price = excluded.rental_price,
  replacement_cost = excluded.replacement_cost,
  weight_kg = excluded.weight_kg,
  power_w = excluded.power_w,
  startup_power_w = excluded.startup_power_w,
  is_active = true,
  updated_at = now();

with ws as (select id from workspaces where workspace_key = 'MAIN'),
seed(item_key, stock_qty) as (
  values
  ('snd-la-k2', 24), ('snd-la-ks28', 12), ('snd-la-la12x', 10), ('mix-digico-sd12', 1),
  ('bkl-shure-sm58', 20), ('bkl-radial-j48', 8), ('com-xlr-20m', 30), ('com-powercon-10m', 24),
  ('lgt-robe-pointe', 16), ('lgt-led-par-rgbw', 24), ('lgt-grandma2-light', 1),
  ('srv-sound-engineer', 12), ('srv-light-engineer', 12), ('srv-stagehand', 30)
)
insert into stock_balances (workspace_id, equipment_item_id, location_key, qty_total, qty_reserved)
select ws.id, ei.id, 'main', seed.stock_qty, 0
from ws
join equipment_items ei on ei.workspace_id = ws.id
join seed on seed.item_key = ei.item_key
on conflict (workspace_id, equipment_item_id, location_key) do update set qty_total = excluded.qty_total, updated_at = now();
