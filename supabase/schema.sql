-- ============================================================
-- TupperAware — Supabase Schema
-- Run this entire file in the Supabase SQL Editor to set up
-- the database from scratch.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Households ───────────────────────────────────────────────
create table if not exists households (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now()
);

-- ── Household members ────────────────────────────────────────
create table if not exists household_members (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz default now(),
  unique(household_id, user_id)
);

-- ── Locations ────────────────────────────────────────────────
create table if not exists locations (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  icon          text,
  created_at    timestamptz default now()
);

-- ── Items ────────────────────────────────────────────────────
create table if not exists items (
  id              uuid primary key default uuid_generate_v4(),
  location_id     uuid not null references locations(id) on delete cascade,
  name            text not null,
  category        text not null default 'Other'
                    check (category in ('Dairy','Produce','Meat','Frozen','Pantry','Other')),
  quantity        text,
  expiry_date     date not null,
  barcode         text,
  emoji           text,
  status          text not null default 'active'
                    check (status in ('active','used','discarded')),
  partially_used  boolean default false,
  use_notes       text,
  added_by        uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Auto-update updated_at on items ──────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_updated_at on items;
create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
-- NOTE: RLS may cause household registration insertion due to JWT configuration

alter table households        enable row level security;
alter table household_members enable row level security;
alter table locations         enable row level security;
alter table items             enable row level security;


-- Helper function: is current user a member of a given household?
create or replace function is_household_member(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid
    and user_id = auth.uid()
  );
$$ language sql security definer;

-- Households
drop policy if exists "anyone can insert households" on households;
create policy "anyone can insert households"
  on households for insert
  with check (true);

drop policy if exists "members can view their household" on households;
create policy "members can view their household"
  on households for select
  using (
    id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "owners can update household" on households;
create policy "owners can update household"
  on households for update
  using (
    id in (
      select household_id from household_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

-- Household members
drop policy if exists "members can view membership" on household_members;
create policy "members can view membership"
  on household_members for select
  using (is_household_member(household_id));

drop policy if exists "allow insert membership" on household_members;
create policy "allow insert membership"
  on household_members for insert
  with check (true);

-- Locations
drop policy if exists "members can view locations" on locations;
create policy "members can view locations"
  on locations for select
  using (is_household_member(household_id));

drop policy if exists "members can insert locations" on locations;
create policy "members can insert locations"
  on locations for insert
  with check (is_household_member(household_id));

drop policy if exists "members can update locations" on locations;
create policy "members can update locations"
  on locations for update
  using (is_household_member(household_id));

drop policy if exists "members can delete locations" on locations;
create policy "members can delete locations"
  on locations for delete
  using (is_household_member(household_id));

-- Items
drop policy if exists "members can view items" on items;
create policy "members can view items"
  on items for select
  using (exists (
    select 1 from locations l
    where l.id = location_id
    and is_household_member(l.household_id)
  ));

drop policy if exists "members can insert items" on items;
create policy "members can insert items"
  on items for insert
  with check (exists (
    select 1 from locations l
    where l.id = location_id
    and is_household_member(l.household_id)
  ));

drop policy if exists "members can update items" on items;
create policy "members can update items"
  on items for update
  using (exists (
    select 1 from locations l
    where l.id = location_id
    and is_household_member(l.household_id)
  ));

drop policy if exists "members can delete items" on items;
create policy "members can delete items"
  on items for delete
  using (exists (
    select 1 from locations l
    where l.id = location_id
    and is_household_member(l.household_id)
  ));

-- ── Grants ───────────────────────────────────────────────────
grant insert on households to anon;
grant insert on households to authenticated;
grant insert on household_members to anon;
grant insert on household_members to authenticated;
grant insert on locations to anon;
grant insert on locations to authenticated;
grant insert on items to anon;
grant insert on items to authenticated;