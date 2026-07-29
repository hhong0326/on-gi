# app_config — 배포 없이 앱 시스템 값 튜닝하기

`public.app_config` 테이블(key + jsonb value)의 값을 바꾸면 **배포 없이** 앱 동작을 조정할 수 있다.
사용자에게는 **다음 앱 로드부터** 반영된다 (실행 중인 세션에는 적용되지 않음).

## 동작 원리

- 코드에 하드코딩된 기본값이 항상 존재하고([src/lib/app-config.ts](../src/lib/app-config.ts)의 `DEFAULTS`), DB 값은 **override**로만 동작한다.
- 앱 초기 로드 시 다른 쿼리와 병렬로 1회 조회한다 (로딩 성능 영향 없음).
- DB 값은 **필드 단위로 검증**된다 — 형식이 잘못된 필드(예: hex가 아닌 색상)는 그 필드만 무시되고 기본값이 쓰인다. 값 실수로 앱이 깨지지 않는다.
- RLS: 모든 클라이언트가 읽기 가능, **쓰기 정책은 의도적으로 없음** — 수정은 Supabase Studio나 psql로만 한다.

## 값 변경 방법

### 클라우드 (프로덕션)

[Supabase Studio](https://supabase.com/dashboard) → 프로젝트 선택 → **SQL Editor**에서 아래 SQL 실행.
(Table Editor에서 `app_config` 테이블의 value 셀을 직접 편집해도 된다.)

### 로컬 (개발)

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## 설정 키와 예시

### `residual_colors` — 잔광 색상 팔레트

내(`mine`) / 남(`others`)의 잔광 색. 각각 `bloom`(바깥 블룸), `glow`(안쪽 글로우), `shadow`(코어 그림자) 3색, `#RRGGBB` 형식.

```sql
-- 내 잔광 블룸 색만 변경
update app_config
set value = jsonb_set(value, '{mine,bloom}', '"#FF4422"'), updated_at = now()
where key = 'residual_colors';

-- 내 잔광 팔레트 전체 교체
update app_config
set value = jsonb_set(value, '{mine}',
  '{"bloom": "#E8632F", "glow": "#FFA274", "shadow": "#F0703E"}'), updated_at = now()
where key = 'residual_colors';
```

참고: 잔광 코어의 중심 이미지 그라디언트는 SVG 파일(`public/잔상_중심*.svg`)이라 DB로 바꿀 수 없다.
색감 대부분은 bloom/glow/shadow가 결정하므로 보통은 이 세 값으로 충분하다.

### `decay` — 잔광 감쇠 곡선

`days`: 잔광이 완전히 희미해지기까지의 일수 (양수) / `minIntensity`: 최소 밝기 (0~1, 오래된 잔광도 이 밝기로는 남음).

```sql
update app_config
set value = '{"days": 14, "minIntensity": 0.15}', updated_at = now()
where key = 'decay';
```

### `features` — 기능 플래그

#### `audio` — 기도 음원 재생

기도 시작 시 앰비언트 음원(`public/audio/prayer-ambient-v2.m4a`, 10분 루프) 재생 여부.
`false`면 음원이 재생되지 않고 기도 중 음소거(🔊/🔇) 버튼도 숨겨진다.
플래그는 **앱 로드 시점에 1회 읽으므로**, 켠 뒤 사용자는 다음 접속부터 적용된다.

```sql
-- 음원 켜기
update app_config
set value = jsonb_set(value, '{audio}', 'true'), updated_at = now()
where key = 'features';

-- 음원 끄기 (문제 발생 시 즉시 비활성화 — 배포 불필요)
update app_config
set value = jsonb_set(value, '{audio}', 'false'), updated_at = now()
where key = 'features';
```

음원 파일 교체 시: 새 파일을 `public/audio/prayer-ambient-v3.m4a`처럼 버전을 올려 추가하고
`src/lib/audio.ts`의 `AUDIO_SRC` 상수를 변경해 배포한다 (파일명 버저닝은 immutable 캐시 때문에 필수).

## 현재 값 확인

```sql
select key, value, updated_at from app_config;
```

## 새 설정 키 추가 절차

1. [src/lib/app-config.ts](../src/lib/app-config.ts): `AppConfig` 타입 + `DEFAULTS` + `loadAppConfig`의 검증/병합 분기 추가
2. 시드 마이그레이션 생성: `npx supabase migration new <name>` → `insert into app_config ...`
3. 로컬 적용·확인: `npx supabase migration up`
4. 클라우드 적용: `npx supabase db push` (사전에 `npx supabase login` 필요)
