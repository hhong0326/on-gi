-- 교회에 빛 보내기 3단계: 기도 중 이웃 교회로 가는 희미한 빛 (0017)
-- 내 기도가 온기를 나눌 이웃 교회의 위치만 돌려준다.
-- 고르는 규칙은 recompute_prayer_warmth 트리거와 같다: 기도 위치(0.1도 격자) 반경 radiusKm 안,
-- 그 기도의 교회(prayers.church_id) 제외, 가까운 순 최대 maxChurches곳.
-- 나눔 시간·교회 단계는 내보내지 않는다 (0010). 교회 위치는 이미 지구본에 공개된 값이다.

create or replace function public.get_prayer_neighbors(p_prayer_id uuid)
returns table (id uuid, lat float8, lng float8)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_prayer public.prayers%rowtype;
  v_cfg jsonb;
  v_radius float8;
  v_max int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- 내 기도만
  select * into v_prayer from public.prayers p where p.id = p_prayer_id and p.user_id = v_uid;
  if not found or v_prayer.lat is null or v_prayer.lng is null then
    return;
  end if;

  select value into v_cfg from public.app_config where key = 'church_sharing';
  v_radius := coalesce((v_cfg ->> 'radiusKm')::float8, 10);
  v_max := coalesce((v_cfg ->> 'maxChurches')::int, 5);
  if v_max <= 0 or (coalesce((v_cfg ->> 'ratio')::float8, 0.1)) <= 0 then
    return;
  end if;

  return query
  select n.id, n.lat, n.lng
  from (
    select ch.id, ch.lat, ch.lng, public.distance_km(v_prayer.lat, v_prayer.lng, ch.lat, ch.lng) as d
    from public.churches ch
    where ch.lat is not null
      and ch.id is distinct from v_prayer.church_id
      and ch.lat between v_prayer.lat - v_radius / 111.0 and v_prayer.lat + v_radius / 111.0
  ) n
  where n.d <= v_radius
  order by n.d
  limit v_max;
end;
$$;

revoke execute on function public.get_prayer_neighbors(uuid) from public, anon;
grant execute on function public.get_prayer_neighbors(uuid) to authenticated;
