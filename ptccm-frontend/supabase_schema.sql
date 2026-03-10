-- ============================================================
-- PTCCM – Personal Trading Card Collection Manager
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Game Series (reference table)
create table if not exists game_series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 2. Card Sets (one per game, e.g. "Scarlet & Violet")
create table if not exists card_sets (
  id uuid primary key default gen_random_uuid(),
  game_series_id uuid references game_series(id) on delete cascade not null,
  name text not null,
  total_cards integer,
  created_at timestamptz default now()
);

-- 3. Cards – master card definitions
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  card_set_id uuid references card_sets(id) on delete cascade not null,
  name text not null,
  card_number text,
  card_type text,
  rarity text,
  created_at timestamptz default now()
);

-- 4. User Collection – what a user owns
create table if not exists user_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id uuid references cards(id) on delete cascade not null,
  quantity integer not null default 1,
  estimated_value numeric(10,2) not null default 0,
  condition text not null default 'Near Mint',
  duplicate_action text not null default 'keep',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, card_id)
);

-- 5. Trades – trade proposals
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  trade_partner text,
  status text not null default 'proposed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Trade Items – cards offered or requested in a trade
create table if not exists trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references trades(id) on delete cascade not null,
  card_id uuid references cards(id) on delete set null,
  card_name text,
  direction text not null check (direction in ('offering', 'requesting')),
  quantity integer not null default 1,
  estimated_value numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table game_series enable row level security;
alter table card_sets enable row level security;
alter table cards enable row level security;
alter table user_collection enable row level security;
alter table trades enable row level security;
alter table trade_items enable row level security;

-- game_series: all authenticated users can read/insert
create policy "game_series_select" on game_series for select to authenticated using (true);
create policy "game_series_insert" on game_series for insert to authenticated with check (true);

-- card_sets: all authenticated users can read/insert
create policy "card_sets_select" on card_sets for select to authenticated using (true);
create policy "card_sets_insert" on card_sets for insert to authenticated with check (true);

-- cards: all authenticated users can read/insert
create policy "cards_select" on cards for select to authenticated using (true);
create policy "cards_insert" on cards for insert to authenticated with check (true);

-- user_collection: user's own rows only
create policy "uc_select" on user_collection for select to authenticated using (auth.uid() = user_id);
create policy "uc_insert" on user_collection for insert to authenticated with check (auth.uid() = user_id);
create policy "uc_update" on user_collection for update to authenticated using (auth.uid() = user_id);
create policy "uc_delete" on user_collection for delete to authenticated using (auth.uid() = user_id);

-- trades: user's own rows only
create policy "trades_select" on trades for select to authenticated using (auth.uid() = user_id);
create policy "trades_insert" on trades for insert to authenticated with check (auth.uid() = user_id);
create policy "trades_update" on trades for update to authenticated using (auth.uid() = user_id);
create policy "trades_delete" on trades for delete to authenticated using (auth.uid() = user_id);

-- trade_items: user can access items in their own trades
create policy "ti_select" on trade_items for select to authenticated using (
  exists (select 1 from trades where trades.id = trade_items.trade_id and trades.user_id = auth.uid())
);
create policy "ti_insert" on trade_items for insert to authenticated with check (
  exists (select 1 from trades where trades.id = trade_items.trade_id and trades.user_id = auth.uid())
);
create policy "ti_update" on trade_items for update to authenticated using (
  exists (select 1 from trades where trades.id = trade_items.trade_id and trades.user_id = auth.uid())
);
create policy "ti_delete" on trade_items for delete to authenticated using (
  exists (select 1 from trades where trades.id = trade_items.trade_id and trades.user_id = auth.uid())
);

-- ============================================================
-- Seed Data
-- ============================================================

insert into game_series (name) values
  ('Pokémon'),
  ('One Piece'),
  ('Magic: The Gathering')
on conflict (name) do nothing;

do $$
declare
  pokemon_id uuid;
  onepiece_id uuid;
  mtg_id uuid;
begin
  select id into pokemon_id from game_series where name = 'Pokémon';
  select id into onepiece_id from game_series where name = 'One Piece';
  select id into mtg_id from game_series where name = 'Magic: The Gathering';

  insert into card_sets (game_series_id, name, total_cards) values
    (pokemon_id, 'Scarlet & Violet Base Set', 258),
    (pokemon_id, 'Paldea Evolved', 279),
    (pokemon_id, 'Obsidian Flames', 230),
    (pokemon_id, 'Paradox Rift', 266),
    (onepiece_id, 'Romance Dawn (OP-01)', 121),
    (onepiece_id, 'Paramount War (OP-02)', 121),
    (onepiece_id, 'Pillars of Strength (OP-03)', 121),
    (onepiece_id, 'Kingdoms of Intrigue (OP-04)', 121),
    (mtg_id, 'Foundations', 309),
    (mtg_id, 'Duskmourn: House of Horror', 291),
    (mtg_id, 'Bloomburrow', 266),
    (mtg_id, 'Aetherdrift', 276)
  on conflict do nothing;
end $$;
