-- Add is_anonymous column (used throughout client code but missing from original schema)
alter table profiles
  add column if not exists is_anonymous boolean not null default false;

-- Make age and gender nullable — anonymous users don't fill these
alter table profiles alter column age drop not null;
alter table profiles alter column gender drop not null;

-- Enable realtime publication for tables used by client subscriptions
-- Wrapped in DO blocks so migration doesn't fail if tables are already published
do $$ begin
  alter publication supabase_realtime add table coffee_shop_sessions;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table profiles;
exception when others then null;
end $$;
