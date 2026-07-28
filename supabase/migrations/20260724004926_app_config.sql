-- 앱 시스템 설정 (배포 없이 런타임 튜닝)
-- 값 변경: Supabase Studio 또는 SQL로만 (클라이언트 쓰기 정책 없음)
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- 모든 클라이언트 읽기 허용, 쓰기 정책은 의도적으로 없음 (service role만 수정 가능)
create policy "app_config_read_all"
  on public.app_config for select
  to authenticated, anon
  using (true);

-- 초기값 (코드의 하드코딩 기본값과 동일 — DB 값은 override로 동작)
insert into public.app_config (key, value) values
  ('residual_colors', '{
    "mine":   { "bloom": "#E8632F", "glow": "#FFA274", "shadow": "#F0703E" },
    "others": { "bloom": "#AA8833", "glow": "#BB9944", "shadow": "#AA8833" }
  }'),
  ('decay', '{ "days": 7, "minIntensity": 0.1 }'),
  ('features', '{ "audio": false }');
