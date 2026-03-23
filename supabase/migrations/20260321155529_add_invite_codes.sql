create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.invite_codes enable row level security;

create policy "invite_codes_select_all" on public.invite_codes
  for select using (true);
