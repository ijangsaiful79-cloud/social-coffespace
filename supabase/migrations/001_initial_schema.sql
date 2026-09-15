-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- COFFEE SHOPS
-- =============================================
create table coffee_shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meter integer not null default 100,
  access_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coffee_shops_access_token on coffee_shops(access_token);
create index idx_coffee_shops_is_active on coffee_shops(is_active);

-- =============================================
-- PROFILES
-- =============================================
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text not null,
  age integer not null check (age >= 17 and age <= 99),
  gender text not null check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  bio text,
  avatar_url text,
  instagram text,
  tiktok text,
  whatsapp text,
  chat_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_user_id on profiles(user_id);

-- =============================================
-- COFFEE SHOP SESSIONS
-- =============================================
create table coffee_shop_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coffee_shop_id uuid not null references coffee_shops(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  gps_verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'expired', 'left')),
  created_at timestamptz not null default now()
);

create index idx_sessions_user_id on coffee_shop_sessions(user_id);
create index idx_sessions_coffee_shop_id on coffee_shop_sessions(coffee_shop_id);
create index idx_sessions_status on coffee_shop_sessions(status);
create index idx_sessions_expires_at on coffee_shop_sessions(expires_at);

-- =============================================
-- CONVERSATIONS
-- =============================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_conversation check (user_one_id != user_two_id)
);

create index idx_conversations_user_one on conversations(user_one_id);
create index idx_conversations_user_two on conversations(user_two_id);
create unique index unique_conversation on conversations (
  least(user_one_id::text, user_two_id::text),
  greatest(user_one_id::text, user_two_id::text)
);

-- =============================================
-- MESSAGES
-- =============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_messages_conversation_id on messages(conversation_id);
create index idx_messages_sender_id on messages(sender_id);
create index idx_messages_created_at on messages(created_at);

-- =============================================
-- INTERACTIONS
-- =============================================
create table interactions (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('say_hi', 'view')),
  created_at timestamptz not null default now()
);

create index idx_interactions_sender on interactions(sender_id);
create index idx_interactions_receiver on interactions(receiver_id);

-- =============================================
-- REPORTS
-- =============================================
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_reports_status on reports(status);
create index idx_reports_reported_user on reports(reported_user_id);

-- =============================================
-- BLOCKS
-- =============================================
create table blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_block check (user_id != blocked_user_id),
  constraint unique_block unique (user_id, blocked_user_id)
);

create index idx_blocks_user_id on blocks(user_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger coffee_shops_updated_at before update on coffee_shops
  for each row execute function update_updated_at();

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();

-- =============================================
-- AUTO EXPIRE SESSIONS FUNCTION
-- =============================================
create or replace function expire_old_sessions()
returns void as $$
begin
  update coffee_shop_sessions
  set status = 'expired'
  where status = 'active' and expires_at < now();
end;
$$ language plpgsql;
