-- Enable Extensions
create extension if not exists "pgcrypto";

-- Custom Types
create type public.user_role as enum ('stargazer', 'astronomer');

-- 1. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'stargazer',
  created_at timestamptz not null default now()
);

-- 2. Equipment Table
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(255) not null,
  type varchar(50) not null check (type in ('telescope', 'eyepiece', 'binoculars')),
  aperture_mm numeric not null check (aperture_mm > 0),
  focal_length_mm numeric not null check (focal_length_mm > 0),
  eyepiece_focal_length_mm numeric check (eyepiece_focal_length_mm is null or eyepiece_focal_length_mm > 0),
  created_at timestamptz not null default now()
);

-- 3. Observations Table
create table public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  title varchar(255) not null,
  notes text not null,
  celestial_target varchar(255) not null,
  location varchar(255) not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now()
);

-- 4. Saved Events Table
create table public.saved_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_title varchar(255) not null,
  event_date timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 5. Community Star Parties Table
create table public.star_parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title varchar(255) not null,
  description text not null,
  location_name varchar(255) not null,
  latitude numeric not null,
  longitude numeric not null,
  event_date timestamptz not null,
  max_attendees integer not null default 20 check (max_attendees > 0),
  created_at timestamptz not null default now()
);

-- 6. Star Party Attendees Junction Table
create table public.party_attendees (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.star_parties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(party_id, user_id)
);

-- 7. User Notification Settings Table
create table public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  discord_webhook text,
  min_score_threshold integer not null default 80 check (min_score_threshold between 0 and 100),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Database Performance Indexes
create index equipment_user_id_idx on public.equipment (user_id);
create index observations_equipment_id_idx on public.observations (equipment_id);
create index observations_user_id_idx on public.observations (user_id);
create index star_parties_host_id_idx on public.star_parties (host_id);
create index party_attendees_party_id_idx on public.party_attendees (party_id);
create index party_attendees_user_id_idx on public.party_attendees (user_id);

-- Helper Functions & Triggers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.notification_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.is_astronomer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'astronomer'
  );
$$;

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.observations enable row level security;
alter table public.saved_events enable row level security;
alter table public.star_parties enable row level security;
alter table public.party_attendees enable row level security;
alter table public.notification_settings enable row level security;

-- RLS Policies: Profiles
create policy "Users can select their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Astronomers can select all profiles"
  on public.profiles for select to authenticated using (public.is_astronomer());

-- RLS Policies: Equipment
create policy "Users can select their own equipment"
  on public.equipment for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own equipment"
  on public.equipment for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own equipment"
  on public.equipment for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own equipment"
  on public.equipment for delete to authenticated using (auth.uid() = user_id);

create policy "Astronomers can select all equipment"
  on public.equipment for select to authenticated using (public.is_astronomer());

create policy "Astronomers can delete all equipment"
  on public.equipment for delete to authenticated using (public.is_astronomer());

-- RLS Policies: Observations
create policy "Users can select their own observations"
  on public.observations for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own observations"
  on public.observations for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own observations"
  on public.observations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own observations"
  on public.observations for delete to authenticated using (auth.uid() = user_id);

create policy "Astronomers can select all observations"
  on public.observations for select to authenticated using (public.is_astronomer());

create policy "Astronomers can delete all observations"
  on public.observations for delete to authenticated using (public.is_astronomer());

-- RLS Policies: Saved Events
create policy "Users can select their own saved events"
  on public.saved_events for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own saved events"
  on public.saved_events for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own saved events"
  on public.saved_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own saved events"
  on public.saved_events for delete to authenticated using (auth.uid() = user_id);

-- RLS Policies: Star Parties
create policy "Authenticated users can select all star parties"
  on public.star_parties for select to authenticated using (true);

create policy "Users can insert their own star parties"
  on public.star_parties for insert to authenticated with check (auth.uid() = host_id);

create policy "Hosts can update their own star parties"
  on public.star_parties for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "Hosts can delete their own star parties"
  on public.star_parties for delete to authenticated using (auth.uid() = host_id);

create policy "Astronomers can delete any star party"
  on public.star_parties for delete to authenticated using (public.is_astronomer());

-- RLS Policies: Party Attendees
create policy "Authenticated users can view party attendees"
  on public.party_attendees for select to authenticated using (true);

create policy "Users can join star parties as themselves"
  on public.party_attendees for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can leave star parties"
  on public.party_attendees for delete to authenticated using (auth.uid() = user_id);

-- RLS Policies: Notification Settings
create policy "Users can select their own notification settings"
  on public.notification_settings for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own notification settings"
  on public.notification_settings for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own notification settings"
  on public.notification_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);