create extension if not exists pgcrypto;

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists pulses (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  category text not null,
  emoji text not null,
  body text not null check (char_length(body) between 1 and 120),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid not null references pulses(id) on delete cascade,
  client_id text not null,
  created_at timestamptz not null default now(),
  unique(pulse_id, client_id)
);

insert into places (slug,name,city)
values ('lowinerei','Lowinerei','Münster')
on conflict (slug) do nothing;

alter table places enable row level security;
alter table pulses enable row level security;
alter table reactions enable row level security;

create policy "public read places" on places for select using (true);
create policy "public read active pulses" on pulses for select using (expires_at > now());
create policy "public create pulses" on pulses for insert with check (expires_at <= now() + interval '2 hours');
create policy "public read reactions" on reactions for select using (true);
create policy "public create reactions" on reactions for insert with check (true);
create policy "public delete own-style reactions" on reactions for delete using (true);
