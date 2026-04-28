-- Replace get_prayer_stats with timezone-aware version
create or replace function public.get_prayer_stats(
  p_user_id uuid,
  p_period text default 'week',
  p_timezone text default 'UTC'
)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_result json;
  v_now_local timestamp := now() at time zone p_timezone;
  v_this_sunday timestamp := date_trunc('week', v_now_local + interval '1 day') - interval '1 day';
begin
  case p_period
    when 'week' then
      v_start := v_this_sunday at time zone p_timezone;
      v_end := now();
    when 'prev_week' then
      v_start := (v_this_sunday - interval '7 days') at time zone p_timezone;
      v_end := v_this_sunday at time zone p_timezone;
    when 'month' then
      v_start := date_trunc('month', v_now_local) at time zone p_timezone;
      v_end := now();
    when 'all' then
      v_start := '1970-01-01'::timestamptz;
      v_end := now();
    else
      v_start := v_this_sunday at time zone p_timezone;
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
