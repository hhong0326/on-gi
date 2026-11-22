-- 지구본 교회 아이콘 (교회에 빛 보내기 1단계)
-- 다른 교회는 모두 같은 아이콘으로 표시한다 — 단계·누적 시간은 내보내지 않는다 (0010).
-- 탭하면 이름과 짧은 설명(등록할 때 20자 이내, 선택)을 보여준다. 만든 사람·초대 코드는 내보내지 않는다.

-- ─────────────────────────────────────────────
-- 1. 교회 설명 (선택, 20자)
-- ─────────────────────────────────────────────
alter table public.churches
  add column description text,
  add constraint churches_description_length
    check (description is null or char_length(description) between 1 and 20);

-- ─────────────────────────────────────────────
-- 2. create_church: 설명 인자 추가
-- 옛 3인자 함수를 남겨두면 3인자 호출이 두 함수에 다 맞아 모호해지므로 교체한다.
-- 새 인자에 기본값이 있어 옛 클라이언트의 3인자 호출도 그대로 동작한다.
-- ─────────────────────────────────────────────
drop function public.create_church(text, float8, float8);

create function public.create_church(
  p_name text,
  p_lat float8,
  p_lng float8,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid location';
  end if;
  if v_description is not null and char_length(v_description) > 20 then
    raise exception 'description too long';
  end if;
  if (select count(*) from public.churches
      where created_by = v_uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'daily church limit reached';
  end if;

  insert into public.churches (name, description, lat, lng, created_by)
  values (btrim(p_name), v_description, p_lat, p_lng, v_uid)
  returning id into v_id;

  perform public.set_my_church(v_id);
  return v_id;
end;
$$;

revoke execute on function public.create_church(text, float8, float8, text) from public, anon;
grant execute on function public.create_church(text, float8, float8, text) to authenticated;

-- ─────────────────────────────────────────────
-- 3. 지구본용 교회 목록: 위치·이름·설명·내 교회 여부만
-- 교회 수가 늘면 범위(bbox) 조회로 바꾼다 — 상한은 그때까지의 안전장치
-- ─────────────────────────────────────────────
create function public.get_church_map()
returns table (id uuid, name text, description text, lat float8, lng float8, is_mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.description, c.lat, c.lng,
    c.id is not distinct from (select u.church_id from public.users u where u.id = auth.uid()) as is_mine
  from public.churches c
  where c.lat is not null and c.lng is not null and auth.uid() is not null
  order by c.created_at
  limit 5000
$$;

revoke execute on function public.get_church_map() from public, anon;
grant execute on function public.get_church_map() to authenticated;
