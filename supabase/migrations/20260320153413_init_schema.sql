-- 1. churches
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

alter table public.churches enable row level security;

create policy "churches_select_all" on public.churches
  for select using (true);

-- 2. users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '기도자' check (char_length(nickname) <= 20),
  country text,
  church_id uuid references public.churches(id),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- 3. prayers
create table public.prayers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  church_id uuid references public.churches(id),
  lat float8 not null,
  lng float8 not null,
  prayed_at timestamptz default now(),
  duration_seconds int4
);

alter table public.prayers enable row level security;

create policy "prayers_select_all" on public.prayers
  for select using (true);

create policy "prayers_insert_own" on public.prayers
  for insert with check (auth.uid() = user_id);

-- 4. prayer_topics
create table public.prayer_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  prayer_id uuid references public.prayers(id),
  title text not null,
  is_representative boolean default false,
  is_public boolean default false,
  created_at timestamptz default now()
);

create index idx_prayer_topics_prayer_id on public.prayer_topics (prayer_id);
create index idx_prayer_topics_user_representative on public.prayer_topics (user_id, is_representative);

alter table public.prayer_topics enable row level security;

create policy "prayer_topics_select_public" on public.prayer_topics
  for select using (is_public = true);

create policy "prayer_topics_select_own" on public.prayer_topics
  for select using (auth.uid() = user_id);

create policy "prayer_topics_insert_own" on public.prayer_topics
  for insert with check (auth.uid() = user_id);

create policy "prayer_topics_update_own" on public.prayer_topics
  for update using (auth.uid() = user_id);

create policy "prayer_topics_delete_own" on public.prayer_topics
  for delete using (auth.uid() = user_id);

-- 5. Trigger: auto-create user row on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
