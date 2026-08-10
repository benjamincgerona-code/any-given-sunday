-- Any Given Sunday — Database Schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- ============================================================
-- LEAGUES
-- ============================================================
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,               -- 6-char code players use to join
  commissioner_pin text not null,                -- simple PIN the commissioner uses to unlock admin powers
  entry_fee_cents integer not null default 500,  -- $5.00 default
  season_year integer not null,
  logo_color text default '#0b0f1a',             -- for future custom branding
  announcement text,                             -- commissioner message shown on homepage
  created_at timestamptz not null default now()
);

-- ============================================================
-- PLAYERS (nickname-based, no real auth accounts)
-- ============================================================
create table players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  nickname text not null,
  session_token uuid not null default gen_random_uuid(), -- used as their "login"
  is_commissioner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (league_id, nickname)
);

-- ============================================================
-- WEEKS
-- ============================================================
create table weeks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  week_number integer not null,
  status text not null default 'setup',  -- setup | open | locked | scored | archived
  pot_cents integer not null default 0,
  winner_player_id uuid references players(id),
  opened_at timestamptz,
  locked_at timestamptz,           -- kickoff of the first game that week
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (league_id, week_number)
);

-- ============================================================
-- PAYMENTS (per player, per week — commissioner approves manually)
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'unpaid',  -- unpaid | pending | approved
  marked_at timestamptz,
  approved_at timestamptz,
  unique (week_id, player_id)
);

-- ============================================================
-- GAMES (auto-loaded from NFL schedule feed each week)
-- ============================================================
create table games (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  external_game_id text not null,   -- id from the data source, for re-syncing scores
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  is_mnf boolean not null default false,   -- flags the Monday Night tiebreaker game
  home_score integer,
  away_score integer,
  status text not null default 'scheduled', -- scheduled | in_progress | final
  created_at timestamptz not null default now()
);

-- ============================================================
-- PICKS
-- ============================================================
create table picks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  picked_team text not null,      -- must equal games.home_team or games.away_team
  is_correct boolean,             -- filled in once the game is final
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, player_id)
);

-- Tiebreaker guess: total combined points in the MNF game
create table tiebreakers (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  guessed_total_points integer not null,
  created_at timestamptz not null default now(),
  unique (week_id, player_id)
);

-- ============================================================
-- Helpful indexes
-- ============================================================
create index idx_players_league on players(league_id);
create index idx_weeks_league on weeks(league_id);
create index idx_games_week on games(week_id);
create index idx_picks_player on picks(player_id);
create index idx_picks_game on picks(game_id);
create index idx_payments_week on payments(week_id);
