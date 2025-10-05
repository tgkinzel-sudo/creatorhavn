create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  display_name text not null,
  avatar_url text,
  platforms text[] default '{}',        -- z.B. {'youtube','tiktok'}
  categories text[] default '{}',       -- z.B. {'tech','comedy'}
  followers_estimate int,
  language text default 'de',
  country text,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(handle)
);

create table if not exists creator_sources (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  source_type text not null,           -- 'seed','agent','manual'
  source_ref text,                     -- z.B. channel id / url
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpful index
create index if not exists creators_last_seen_idx on creators(last_seen_at desc);
