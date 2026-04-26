-- 1. UPDATE RLS 정책: 자기 기도의 duration_seconds만 업데이트 가능
create policy "prayers_update_own" on public.prayers
  for update using (auth.uid() = user_id);

-- 2. 인덱스: 유저별 기도 기록 조회 최적화 (주간/월간)
create index idx_prayers_user_prayed_at
  on public.prayers (user_id, prayed_at desc);

-- 3. RPC 함수: 기도 통계 조회
-- period: 'week' (이번 주 일요일~), 'prev_week' (지난주), 'month' (이번 달), 'all' (전체)
create or replace function public.get_prayer_stats(
  p_user_id uuid,
  p_period text default 'week'
)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
  -- 일요일 기준 이번 주 시작
  v_this_sunday timestamptz := date_trunc('week', now() + interval '1 day') - interval '1 day';
begin
  case p_period
    when 'week' then
      v_start := v_this_sunday;
      v_end := now();
    when 'prev_week' then
      v_start := v_this_sunday - interval '7 days';
      v_end := v_this_sunday;
    when 'month' then
      v_start := date_trunc('month', now());
      v_end := now();
    when 'all' then
      v_start := '1970-01-01'::timestamptz;
      v_end := now();
    else
      v_start := v_this_sunday;
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
  where user_id = p_user_id
    and prayed_at >= v_start
    and prayed_at < v_end
    and duration_seconds is not null;

  return v_result;
end;
$$;
