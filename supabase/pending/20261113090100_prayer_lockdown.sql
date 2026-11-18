-- 직접 접근 잠그기 (2/2) — prayer_rpc 적용 + 새 클라이언트 배포가 끝난 뒤 적용한다
-- 먼저 적용하면 옛 클라이언트의 기도 시작/마치기가 실패한다.

-- ─────────────────────────────────────────────
-- 1. prayers: 본인 기록 읽기만 (기록 화면용). 쓰기는 start_prayer / end_prayer RPC로만
-- ─────────────────────────────────────────────
drop policy "prayers_select_all" on public.prayers;
drop policy "prayers_insert_own" on public.prayers;
drop policy "prayers_update_own" on public.prayers;

create policy "prayers_select_own" on public.prayers
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.prayers from anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. churches: 클라이언트 직접 읽기 차단 (초대 코드·만든 사람 비공개). 조회는 RPC로만
-- ─────────────────────────────────────────────
drop policy "churches_select_all" on public.churches;
revoke select, insert, update, delete on public.churches from anon, authenticated;

-- ─────────────────────────────────────────────
-- 3. users: 닉네임만 직접 수정 가능 (교회 등록은 set_my_church RPC로만)
-- ─────────────────────────────────────────────
revoke update on public.users from anon, authenticated;
grant update (nickname) on public.users to authenticated;

-- ─────────────────────────────────────────────
-- 4. 남의 통계를 조회할 수 있던 옛 함수 삭제 (get_my_prayer_stats로 대체)
-- ─────────────────────────────────────────────
drop function public.get_prayer_stats(uuid, text, text);
drop function if exists public.get_prayer_stats(uuid, text);
