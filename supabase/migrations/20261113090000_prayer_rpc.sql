-- 기도 쓰기·피드를 RPC로 옮기기 (1/2, 추가만 — 기존 클라이언트와 호환)
-- 다음 마이그레이션(prayer_lockdown)이 직접 접근을 막는다. 순서: 이 파일 적용 → 새 클라이언트 배포 → lockdown 적용.
-- 이유: 기도 시간·교회를 클라이언트가 직접 쓰면 교회 단계를 임의로 올릴 수 있고,
--       prayers 전체 SELECT가 user_id·church_id·시간을 노출해 0004·0010 원칙이 깨진다.

-- ─────────────────────────────────────────────
-- 1. 컬럼: 변경 시각(폴링 기준) + 같은 날 이전 기도 누적
-- ─────────────────────────────────────────────
alter table public.prayers
  add column updated_at timestamptz not null default now(),
  add column prior_seconds int4 not null default 0 check (prior_seconds >= 0);

create index idx_prayers_updated_at on public.prayers (updated_at);

create or replace function public.touch_prayer_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger prayers_touch_updated_at
  before update on public.prayers
  for each row execute function public.touch_prayer_updated_at();

-- 한 번 기도의 최대 인정 시간(초). 넘는 부분은 기록하지 않는다
insert into public.app_config (key, value) values
  ('prayer_limits', '{ "maxSessionSeconds": 10800 }')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────
-- 2. 지구본 피드: 위치·시각·상태만 (user_id·church_id·시간 비공개)
-- ─────────────────────────────────────────────
-- p_since 없음: 최근(감쇠 기간) 기도를 최신순 p_limit개
-- p_since 있음: 그 뒤로 바뀐 기도를 오래된 순 (시작·종료·재시작 모두 잡힘)
create or replace function public.get_prayer_feed(
  p_since timestamptz default null,
  p_limit int default 200
)
returns table (
  id uuid,
  lat float8,
  lng float8,
  prayed_at timestamptz,
  updated_at timestamptz,
  is_active boolean,
  is_mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days float8 := coalesce(
    (select (value ->> 'days')::float8 from public.app_config where key = 'decay'), 7);
  v_limit int := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if p_since is null then
    return query
      select p.id, p.lat, p.lng, p.prayed_at, p.updated_at,
        p.duration_seconds is null and p.prayed_at > now() - interval '30 minutes',
        p.user_id = auth.uid()
      from public.prayers p
      where p.prayed_at > now() - make_interval(secs => v_days * 86400)
      order by p.updated_at desc
      limit v_limit;
  else
    return query
      select p.id, p.lat, p.lng, p.prayed_at, p.updated_at,
        p.duration_seconds is null and p.prayed_at > now() - interval '30 minutes',
        p.user_id = auth.uid()
      from public.prayers p
      where p.updated_at > p_since
        and p.prayed_at > now() - make_interval(secs => v_days * 86400)
      order by p.updated_at asc
      limit v_limit;
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- 3. 기도 시작: 위치는 서버가 0.1도 격자로 흐림, 사용자 시간대 기준 하루 1행
-- ─────────────────────────────────────────────
create or replace function public.start_prayer(
  p_lat float8,
  p_lng float8,
  p_timezone text default 'UTC'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day_start timestamptz;
  v_row public.prayers%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid location';
  end if;

  begin
    v_day_start := date_trunc('day', now() at time zone p_timezone) at time zone p_timezone;
  exception when others then
    v_day_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  end;

  -- 같은 사용자의 동시 시작을 직렬화 (하루 1행 보장)
  perform 1 from public.users where id = v_uid for update;

  select * into v_row
  from public.prayers
  where user_id = v_uid and prayed_at >= v_day_start
  order by prayed_at desc
  limit 1;

  if found then
    -- 오늘 이미 마친 기도가 있으면 그 시간을 prior로 옮기고 다시 시작.
    -- 마치지 못한(방치된) 기도는 prior를 그대로 둔다 (이전 누적 보존)
    update public.prayers
    set lat = round(p_lat::numeric, 1)::float8,
        lng = round(p_lng::numeric, 1)::float8,
        prayed_at = now(),
        prior_seconds = coalesce(v_row.duration_seconds, v_row.prior_seconds),
        duration_seconds = null
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.prayers (user_id, lat, lng)
    values (v_uid, round(p_lat::numeric, 1)::float8, round(p_lng::numeric, 1)::float8)
    returning * into v_row;
  end if;

  return json_build_object(
    'id', v_row.id,
    'lat', v_row.lat,
    'lng', v_row.lng,
    'prayed_at', v_row.prayed_at
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 4. 기도 마치기: 이번 시간 = min(클라이언트 측정, 서버 경과, 상한)
-- ─────────────────────────────────────────────
-- 클라이언트 값을 함께 받는 이유: 저장 실패 후 다음 실행에서 재시도할 때
-- 서버 경과만 쓰면 그 사이 시간까지 기도로 잡힌다. 서버 경과가 상한 역할을 한다.
-- 이미 마친 기도면 저장된 값을 그대로 돌려준다 (재시도 안전)
create or replace function public.end_prayer(
  p_prayer_id uuid,
  p_client_seconds int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.prayers%rowtype;
  v_max int;
  v_session int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.prayers
  where id = p_prayer_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'prayer not found';
  end if;
  if v_row.duration_seconds is not null then
    return v_row.duration_seconds;
  end if;

  v_max := coalesce(
    (select (value ->> 'maxSessionSeconds')::int from public.app_config where key = 'prayer_limits'), 10800);
  v_session := least(
    greatest(coalesce(p_client_seconds, 0), 0),
    greatest(floor(extract(epoch from now() - v_row.prayed_at))::int, 0),
    v_max
  );

  update public.prayers
  set duration_seconds = v_row.prior_seconds + v_session
  where id = v_row.id;

  return v_row.prior_seconds + v_session;
end;
$$;

-- ─────────────────────────────────────────────
-- 5. 기도 통계: 본인 것만 (p_user_id 인자 없는 새 버전, 옛 버전은 lockdown에서 삭제)
-- ─────────────────────────────────────────────
create or replace function public.get_my_prayer_stats(
  p_period text default 'week',
  p_timezone text default 'UTC'
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := p_timezone;
  v_start timestamptz;
  v_end timestamptz;
  v_now_local timestamp;
  v_this_sunday timestamp;
  v_result json;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  begin
    v_now_local := now() at time zone v_tz;
  exception when others then
    v_tz := 'UTC';
    v_now_local := now() at time zone v_tz;
  end;
  v_this_sunday := date_trunc('week', v_now_local + interval '1 day') - interval '1 day';

  case p_period
    when 'prev_week' then
      v_start := (v_this_sunday - interval '7 days') at time zone v_tz;
      v_end := v_this_sunday at time zone v_tz;
    when 'month' then
      v_start := date_trunc('month', v_now_local) at time zone v_tz;
      v_end := now();
    when 'all' then
      v_start := '1970-01-01'::timestamptz;
      v_end := now();
    else
      v_start := v_this_sunday at time zone v_tz;
      v_end := now();
  end case;

  select json_build_object(
    'total_count', count(*),
    'total_seconds', coalesce(sum(duration_seconds), 0),
    'avg_seconds', coalesce(round(avg(duration_seconds)), 0),
    'period', p_period,
    'period_start', v_start,
    'period_end', v_end
  )
  into v_result
  from public.prayers
  where user_id = v_uid
    and prayed_at >= v_start
    and prayed_at < v_end
    and duration_seconds is not null;

  return v_result;
end;
$$;

-- ─────────────────────────────────────────────
-- 6. 권한: 로그인(익명 포함) 사용자만
-- ─────────────────────────────────────────────
revoke execute on function public.touch_prayer_updated_at() from public, anon, authenticated;
revoke execute on function public.get_prayer_feed(timestamptz, int) from public, anon;
revoke execute on function public.start_prayer(float8, float8, text) from public, anon;
revoke execute on function public.end_prayer(uuid, int) from public, anon;
revoke execute on function public.get_my_prayer_stats(text, text) from public, anon;

grant execute on function public.get_prayer_feed(timestamptz, int) to authenticated;
grant execute on function public.start_prayer(float8, float8, text) to authenticated;
grant execute on function public.end_prayer(uuid, int) to authenticated;
grant execute on function public.get_my_prayer_stats(text, text) to authenticated;
