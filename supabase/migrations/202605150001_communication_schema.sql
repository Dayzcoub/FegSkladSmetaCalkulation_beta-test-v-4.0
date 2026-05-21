-- FEG Stage PRO v3.17.8 - communication, notifications and push schema
-- Additive migration for the v4 communication center.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Chat rooms / members / messages
-- -----------------------------------------------------------------------------
create table if not exists public.chat_rooms (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    room_type text not null default 'workspace' check (room_type in ('workspace', 'project', 'role', 'direct')),
    project_id uuid references public.quotes(id) on delete set null,
    role_scope text check (role_scope in ('admin', 'manager', 'technician', 'warehouse', 'viewer') or role_scope is null),
    title text not null,
    is_archived boolean not null default false,
    created_by uuid references public.profiles(id) on delete set null,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    room_id uuid not null references public.chat_rooms(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    member_role text not null default 'member' check (member_role in ('owner', 'moderator', 'member')),
    notification_level text not null default 'mentions' check (notification_level in ('all', 'mentions', 'muted')),
    last_read_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (room_id, profile_id)
);

create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    room_id uuid not null references public.chat_rooms(id) on delete cascade,
    author_id uuid references public.profiles(id) on delete set null,
    message_type text not null default 'text' check (message_type in ('text', 'system', 'status')),
    body text not null check (char_length(body) between 1 and 5000),
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    edited_at timestamptz,
    deleted_at timestamptz
);

-- -----------------------------------------------------------------------------
-- Notification events / push subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.notification_events (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    recipient_id uuid references public.profiles(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    event_type text not null,
    title text not null,
    body text,
    entity_type text,
    entity_id uuid,
    payload jsonb not null default '{}'::jsonb,
    delivery_channels jsonb not null default '["in_app"]'::jsonb,
    delivered_at timestamptz,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    endpoint_hash text not null unique,
    endpoint_ciphertext text not null,
    p256dh_ciphertext text,
    auth_ciphertext text,
    user_agent text,
    status text not null default 'active' check (status in ('active', 'revoked')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists chat_rooms_workspace_type_idx on public.chat_rooms (workspace_id, room_type, is_archived, updated_at desc);
create index if not exists chat_room_members_workspace_profile_idx on public.chat_room_members (workspace_id, profile_id, room_id);
create index if not exists chat_messages_room_created_idx on public.chat_messages (room_id, created_at desc);
create index if not exists notification_events_recipient_idx on public.notification_events (workspace_id, recipient_id, read_at, created_at desc);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (workspace_id, profile_id, status);

do $$
declare
    table_name text;
begin
    foreach table_name in array array['chat_rooms','chat_room_members','push_subscriptions'] loop
        execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
        execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS helpers / policies
-- -----------------------------------------------------------------------------
create or replace function public.feg_can_access_chat_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.chat_rooms room
        where room.id = target_room_id
          and room.workspace_id = public.feg_current_workspace_id()
          and room.is_archived = false
          and (
            room.room_type in ('workspace', 'project')
            or (room.room_type = 'role' and room.role_scope = public.feg_current_role())
            or public.feg_has_role(array['admin'])
            or exists (
                select 1
                from public.chat_room_members member
                where member.room_id = room.id
                  and member.profile_id = auth.uid()
            )
          )
    );
$$;

revoke all on function public.feg_can_access_chat_room(uuid) from anon;
grant execute on function public.feg_can_access_chat_room(uuid) to authenticated;

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notification_events enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.chat_rooms, public.chat_room_members, public.chat_messages, public.notification_events, public.push_subscriptions from anon;
grant select, insert, update, delete on public.chat_rooms, public.chat_room_members, public.chat_messages, public.notification_events, public.push_subscriptions to authenticated;

drop policy if exists "feg_chat_rooms_select" on public.chat_rooms;
create policy "feg_chat_rooms_select" on public.chat_rooms for select to authenticated
using (public.feg_can_access_chat_room(id));

drop policy if exists "feg_chat_rooms_write" on public.chat_rooms;
create policy "feg_chat_rooms_write" on public.chat_rooms for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']));

drop policy if exists "feg_chat_room_members_select" on public.chat_room_members;
create policy "feg_chat_room_members_select" on public.chat_room_members for select to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_can_access_chat_room(room_id));

drop policy if exists "feg_chat_room_members_write" on public.chat_room_members;
create policy "feg_chat_room_members_write" on public.chat_room_members for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']))
with check (workspace_id = public.feg_current_workspace_id() and public.feg_has_role(array['admin','manager']));

drop policy if exists "feg_chat_messages_select" on public.chat_messages;
create policy "feg_chat_messages_select" on public.chat_messages for select to authenticated
using (workspace_id = public.feg_current_workspace_id() and public.feg_can_access_chat_room(room_id));

drop policy if exists "feg_chat_messages_insert" on public.chat_messages;
create policy "feg_chat_messages_insert" on public.chat_messages for insert to authenticated
with check (
    workspace_id = public.feg_current_workspace_id()
    and public.feg_can_access_chat_room(room_id)
    and author_id = auth.uid()
    and public.feg_has_role(array['admin','manager','technician','warehouse'])
);

drop policy if exists "feg_chat_messages_update_own" on public.chat_messages;
create policy "feg_chat_messages_update_own" on public.chat_messages for update to authenticated
using (workspace_id = public.feg_current_workspace_id() and author_id = auth.uid())
with check (workspace_id = public.feg_current_workspace_id() and author_id = auth.uid());

drop policy if exists "feg_notification_events_select" on public.notification_events;
create policy "feg_notification_events_select" on public.notification_events for select to authenticated
using (
    workspace_id = public.feg_current_workspace_id()
    and (recipient_id = auth.uid() or public.feg_has_role(array['admin']))
);

drop policy if exists "feg_notification_events_insert" on public.notification_events;
create policy "feg_notification_events_insert" on public.notification_events for insert to authenticated
with check (
    workspace_id = public.feg_current_workspace_id()
    and public.feg_has_role(array['admin','manager'])
);

drop policy if exists "feg_notification_events_update_read" on public.notification_events;
create policy "feg_notification_events_update_read" on public.notification_events for update to authenticated
using (workspace_id = public.feg_current_workspace_id() and recipient_id = auth.uid())
with check (workspace_id = public.feg_current_workspace_id() and recipient_id = auth.uid());

drop policy if exists "feg_push_subscriptions_select_own" on public.push_subscriptions;
create policy "feg_push_subscriptions_select_own" on public.push_subscriptions for select to authenticated
using (workspace_id = public.feg_current_workspace_id() and profile_id = auth.uid());

drop policy if exists "feg_push_subscriptions_write_own" on public.push_subscriptions;
create policy "feg_push_subscriptions_write_own" on public.push_subscriptions for all to authenticated
using (workspace_id = public.feg_current_workspace_id() and profile_id = auth.uid())
with check (workspace_id = public.feg_current_workspace_id() and profile_id = auth.uid());
