-- 우리 교회 세우기 (MVP)
-- 교회 공동 기도 시간으로 건물이 8단계로 성장 + 이웃 교회에 온기 나눔.
-- 다른 교회의 누적 시간은 클라이언트에 노출하지 않는다 (순위/경쟁 방지) — 단계(level)만 공개.

-- ─────────────────────────────────────────────
-- 1. churches: 위치(정확) + 만든 사람
-- ─────────────────────────────────────────────
alter table public.churches
  add column lat float8,
  add column lng float8,
  add column created_by uuid references public.users(id) on delete set null;

alter table public.churches
  alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

alter table public.churches
  add constraint churches_name_length check (char_length(btrim(name)) between 1 and 40);

create index idx_churches_lat on public.churches (lat) where lat is not null;
create index idx_prayers_church on public.prayers (church_id) where church_id is not null;

-- 교회 생성은 create_church RPC로만 (insert 정책을 두지 않음)

-- ─────────────────────────────────────────────
-- 2. 이웃 교회 온기 기록
-- ─────────────────────────────────────────────
create table public.church_warmth (
  prayer_id uuid not null references public.prayers(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  seconds int4 not null check (seconds >= 0),
  created_at timestamptz not null default now(),
  primary key (prayer_id, church_id)
);

create index idx_church_warmth_church on public.church_warmth (church_id);

-- RLS만 켜고 정책 없음: 클라이언트 직접 읽기/쓰기 불가, 아래 security definer 함수로만 접근
alter table public.church_warmth enable row level security;

-- ─────────────────────────────────────────────
-- 3. 설정값 (배포 없이 조정, 테스트 시 값을 줄여서 단계 확인)
-- ─────────────────────────────────────────────
-- thresholds: 단계별 누적 기도 시간(초). LV1 0 / LV2 1h / LV3 5h / LV4 15h / LV5 40h / LV6 100h / LV7 250h / LV8 600h
-- church_sharing: 이웃 나눔 비율 / 반경(km) / 최대 교회 수 — 임시값, 운영하며 조정
-- radiusKm 10: 개인 기도 위치가 0.1도(~11km) 격자로 흐려져 저장되므로 그보다 작으면 이웃이 거의 안 잡힘
insert into public.app_config (key, value) values
  ('church_levels', '{ "thresholds": [0, 3600, 18000, 54000, 144000, 360000, 900000, 2160000] }'),
  ('church_sharing', '{ "ratio": 0.1, "radiusKm": 10, "maxChurches": 5 }');

-- ─────────────────────────────────────────────
-- 4. 내부 헬퍼 (클라이언트 실행 권한 회수)
-- ─────────────────────────────────────────────
create or replace function public.distance_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8
language sql
immutable
set search_path = ''
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- 교회 누적 시간 = 그 교회로 기록된 기도 시간 + 이웃에게 받은 온기
create or replace function public.church_total_seconds(p_church_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(p.duration_seconds) from public.prayers p
              where p.church_id = p_church_id and p.duration_seconds is not null), 0)
    + coalesce((select sum(w.seconds) from public.church_warmth w
                where w.church_id = p_church_id), 0)
$$;

create or replace function public.church_level_for(p_seconds bigint)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1, (
    select count(*)::int
    from jsonb_array_elements(
      coalesce((select value -> 'thresholds' from public.app_config where key = 'church_levels'), '[0]'::jsonb)
    ) t
    where (t #>> '{}')::bigint <= p_seconds
  ))
$$;

revoke execute on function public.distance_km(float8, float8, float8, float8) from public, anon, authenticated;
revoke execute on function public.church_total_seconds(uuid) from public, anon, authenticated;
revoke execute on function public.church_level_for(bigint) from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 5. 트리거: 기도에 내 교회 기록 + 이웃 온기 재계산
-- ─────────────────────────────────────────────
-- 기도 시작(insert / 같은 날 재시작 시 prayed_at 갱신) 시점의 내 교회를 기록
create or replace function public.set_prayer_church()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.church_id into new.church_id from public.users u where u.id = new.user_id;
  return new;
end;
$$;

create trigger prayers_set_church
  before insert or update of prayed_at on public.prayers
  for each row execute function public.set_prayer_church();

-- 기도 시간이 저장될 때마다 그 기도의 온기를 지우고 다시 계산 (같은 날 이어서 기도해도 중복 없음)
-- 받는 교회: 내 교회 제외, 반경 안 가까운 순 최대 N곳, 단계가 낮을수록 가중치 큼
create or replace function public.recompute_prayer_warmth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb;
  v_ratio float8;
  v_radius float8;
  v_max int;
  v_share bigint;
begin
  delete from public.church_warmth where prayer_id = new.id;

  if new.duration_seconds is null or new.duration_seconds <= 0 then
    return new;
  end if;

  select value into v_cfg from public.app_config where key = 'church_sharing';
  v_ratio := coalesce((v_cfg ->> 'ratio')::float8, 0.1);
  v_radius := coalesce((v_cfg ->> 'radiusKm')::float8, 10);
  v_max := coalesce((v_cfg ->> 'maxChurches')::int, 5);
  v_share := floor(new.duration_seconds * v_ratio);

  if v_share <= 0 or v_max <= 0 then
    return new;
  end if;

  insert into public.church_warmth (prayer_id, church_id, seconds)
  select new.id, s.id, s.seconds
  from (
    select c.id, floor(v_share * c.weight / sum(c.weight) over ())::int as seconds
    from (
    select n.id, greatest(1, 9 - public.church_level_for(public.church_total_seconds(n.id)))::float8 as weight
    from (
      select ch.id, public.distance_km(new.lat, new.lng, ch.lat, ch.lng) as d
      from public.churches ch
      where ch.lat is not null
        and ch.id is distinct from new.church_id
        and ch.lat between new.lat - v_radius / 111.0 and new.lat + v_radius / 111.0
    ) n
    where n.d <= v_radius
    order by n.d
    limit v_max
    ) c
  ) s
  where s.seconds > 0;

  return new;
end;
$$;

create trigger prayers_recompute_warmth
  after update of duration_seconds, church_id on public.prayers
  for each row execute function public.recompute_prayer_warmth();

-- ─────────────────────────────────────────────
-- 6. 클라이언트용 RPC
-- ─────────────────────────────────────────────
-- 교회 검색: 거리순, 이름·거리·단계만 (시간/성도 수 비공개)
create or replace function public.search_churches(
  p_query text default '',
  p_lat float8 default null,
  p_lng float8 default null,
  p_limit int default 20
)
returns table (id uuid, name text, lat float8, lng float8, distance_km float8, level int)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.lat, c.lng,
    case when p_lat is null or p_lng is null then null
         else public.distance_km(p_lat, p_lng, c.lat, c.lng) end as distance_km,
    public.church_level_for(public.church_total_seconds(c.id)) as level
  from public.churches c
  where c.lat is not null
    and (coalesce(btrim(p_query), '') = ''
         or position(lower(btrim(p_query)) in lower(c.name)) > 0)
  order by distance_km nulls last, c.created_at
  limit least(greatest(p_limit, 1), 50)
$$;

-- 새로 세우기 전 중복 확인: 반경 안 비슷한 이름
create or replace function public.find_similar_churches(
  p_name text,
  p_lat float8,
  p_lng float8,
  p_radius_km float8 default 2
)
returns table (id uuid, name text, distance_km float8)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, public.distance_km(p_lat, p_lng, c.lat, c.lng) as distance_km
  from public.churches c
  where c.lat is not null
    and public.distance_km(p_lat, p_lng, c.lat, c.lng) <= p_radius_km
    and (position(lower(btrim(p_name)) in lower(c.name)) > 0
         or position(lower(c.name) in lower(btrim(p_name))) > 0)
  order by distance_km
  limit 3
$$;

-- 교회 세우기 + 내 교회로 등록 (하루 생성 개수 제한으로 남용 방지)
create or replace function public.create_church(p_name text, p_lat float8, p_lng float8)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid location';
  end if;
  if (select count(*) from public.churches
      where created_by = v_uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'daily church limit reached';
  end if;

  insert into public.churches (name, lat, lng, created_by)
  values (btrim(p_name), p_lat, p_lng, v_uid)
  returning id into v_id;

  perform public.set_my_church(v_id);
  return v_id;
end;
$$;

-- 내 교회 등록/변경/해제 (제한 없음). 진행 중인 오늘 기도도 새 교회로 옮긴다
create or replace function public.set_my_church(p_church_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_church_id is not null and not exists (select 1 from public.churches where id = p_church_id) then
    raise exception 'church not found';
  end if;

  update public.users set church_id = p_church_id where id = v_uid;
  update public.prayers set church_id = p_church_id
  where user_id = v_uid and duration_seconds is null;
end;
$$;

-- 내 교회 현황: 단계, 진행, 이번 주 함께 기도한 성도, 받은 온기
create or replace function public.get_my_church()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_church public.churches%rowtype;
  v_own bigint;
  v_warmth bigint;
  v_total bigint;
  v_level int;
  v_thresholds jsonb;
  v_week_start timestamptz := date_trunc('week', now() + interval '1 day') - interval '1 day';
begin
  select c.* into v_church
  from public.churches c join public.users u on u.church_id = c.id
  where u.id = v_uid;

  if not found then
    return null;
  end if;

  v_own := coalesce((select sum(duration_seconds) from public.prayers
                     where church_id = v_church.id and duration_seconds is not null), 0);
  v_warmth := coalesce((select sum(seconds) from public.church_warmth where church_id = v_church.id), 0);
  v_total := v_own + v_warmth;
  v_level := public.church_level_for(v_total);
  v_thresholds := coalesce((select value -> 'thresholds' from public.app_config where key = 'church_levels'), '[0]'::jsonb);

  return json_build_object(
    'id', v_church.id,
    'name', v_church.name,
    'lat', v_church.lat,
    'lng', v_church.lng,
    'invite_code', v_church.invite_code,
    'level', v_level,
    'max_level', jsonb_array_length(v_thresholds),
    'total_seconds', v_total,
    'warmth_seconds', v_warmth,
    'level_start_seconds', (v_thresholds ->> (v_level - 1))::bigint,
    'next_level_seconds', (v_thresholds ->> v_level)::bigint,
    'members_this_week', (select count(distinct user_id) from public.prayers
                          where church_id = v_church.id and prayed_at >= v_week_start)
  );
end;
$$;

-- 기도 완료 모달용: 이번 기도가 온기를 전한 이웃 교회 수 + 내 교회 진행
create or replace function public.get_prayer_contribution(p_prayer_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'neighbor_count', (select count(*) from public.church_warmth w where w.prayer_id = p.id),
    'church', public.get_my_church()
  )
  from public.prayers p
  where p.id = p_prayer_id and p.user_id = auth.uid()
$$;

revoke execute on function public.search_churches(text, float8, float8, int) from public, anon;
revoke execute on function public.find_similar_churches(text, float8, float8, float8) from public, anon;
revoke execute on function public.create_church(text, float8, float8) from public, anon;
revoke execute on function public.set_my_church(uuid) from public, anon;
revoke execute on function public.get_my_church() from public, anon;
revoke execute on function public.get_prayer_contribution(uuid) from public, anon;

grant execute on function public.search_churches(text, float8, float8, int) to authenticated;
grant execute on function public.find_similar_churches(text, float8, float8, float8) to authenticated;
grant execute on function public.create_church(text, float8, float8) to authenticated;
grant execute on function public.set_my_church(uuid) to authenticated;
grant execute on function public.get_my_church() to authenticated;
grant execute on function public.get_prayer_contribution(uuid) to authenticated;
