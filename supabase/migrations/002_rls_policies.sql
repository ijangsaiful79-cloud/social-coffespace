-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table coffee_shops enable row level security;
alter table profiles enable row level security;
alter table coffee_shop_sessions enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table interactions enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;

-- =============================================
-- COFFEE SHOPS POLICIES
-- =============================================
-- Public can read active coffee shops
create policy "coffee_shops_public_read" on coffee_shops
  for select using (is_active = true);

-- Only service role can insert/update/delete (admin via service key)
create policy "coffee_shops_admin_all" on coffee_shops
  for all using (auth.role() = 'service_role');

-- =============================================
-- PROFILES POLICIES
-- =============================================
-- Users can read any profile (needed for People Here)
create policy "profiles_public_read" on profiles
  for select using (true);

-- Users can only update their own profile
create policy "profiles_own_insert" on profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_own_update" on profiles
  for update using (auth.uid() = user_id);

-- =============================================
-- SESSIONS POLICIES
-- =============================================
-- Users can see sessions in same coffee shop (for People Here)
create policy "sessions_read_same_shop" on coffee_shop_sessions
  for select using (
    status = 'active'
    and expires_at > now()
    and coffee_shop_id in (
      select coffee_shop_id from coffee_shop_sessions
      where user_id = auth.uid()
        and status = 'active'
        and expires_at > now()
    )
  );

-- Users can manage their own sessions
create policy "sessions_own_insert" on coffee_shop_sessions
  for insert with check (auth.uid() = user_id);

create policy "sessions_own_update" on coffee_shop_sessions
  for update using (auth.uid() = user_id);

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================
create policy "conversations_own_read" on conversations
  for select using (
    auth.uid() = user_one_id or auth.uid() = user_two_id
  );

create policy "conversations_own_insert" on conversations
  for insert with check (
    auth.uid() = user_one_id or auth.uid() = user_two_id
  );

-- =============================================
-- MESSAGES POLICIES
-- =============================================
create policy "messages_own_read" on messages
  for select using (
    conversation_id in (
      select id from conversations
      where user_one_id = auth.uid() or user_two_id = auth.uid()
    )
  );

create policy "messages_own_insert" on messages
  for insert with check (
    auth.uid() = sender_id
    and conversation_id in (
      select id from conversations
      where user_one_id = auth.uid() or user_two_id = auth.uid()
    )
  );

create policy "messages_mark_read" on messages
  for update using (
    conversation_id in (
      select id from conversations
      where user_one_id = auth.uid() or user_two_id = auth.uid()
    )
  );

-- =============================================
-- INTERACTIONS POLICIES
-- =============================================
create policy "interactions_own_send" on interactions
  for insert with check (auth.uid() = sender_id);

create policy "interactions_own_read" on interactions
  for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

-- =============================================
-- REPORTS POLICIES
-- =============================================
create policy "reports_own_insert" on reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_own_read" on reports
  for select using (auth.uid() = reporter_id);

-- =============================================
-- BLOCKS POLICIES
-- =============================================
create policy "blocks_own_all" on blocks
  for all using (auth.uid() = user_id);
