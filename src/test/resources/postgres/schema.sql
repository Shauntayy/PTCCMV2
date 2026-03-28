create extension if not exists pgcrypto;

create table if not exists game_series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists card_sets (
  id uuid primary key default gen_random_uuid(),
  game_series_id uuid references game_series(id) on delete cascade not null,
  name text not null,
  total_cards integer,
  created_at timestamptz default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  card_set_id uuid references card_sets(id) on delete cascade not null,
  name text not null,
  card_number text,
  card_type text,
  rarity text,
  created_at timestamptz default now()
);

create table if not exists user_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
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

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  trade_partner text,
  status text not null default 'proposed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
