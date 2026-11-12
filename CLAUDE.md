# ON-GI (기도의 불)

실시간 글로벌 기도를 3D 지구본 위 따뜻한 빛으로 시각화하는 기독교 기도 웹앱 (PWA). 오픈소스(MIT).

## 컨텍스트 프로토콜 (먼저 읽기)

이 프로젝트는 결정을 로그로 쌓고, 그 요약을 메모리처럼 읽어 이어서 작업한다 (ADR + Memory Bank).

1. **세션 시작**: [docs/memory/project-state.md](docs/memory/project-state.md)(현재 기능·함정·백로그)와 [docs/memory/working-agreements.md](docs/memory/working-agreements.md)(작업 방식)를 읽는다
2. **결정이 생기면**: [docs/decisions/](docs/decisions/)에 ADR을 추가한다. 기존 ADR은 고치지 않고, 뒤집을 때는 새 ADR로 대체한다
3. **작업을 마치면**: project-state.md의 기능·함정·백로그를 갱신한다
4. 저장소가 공개이므로 개인 정보·키·비밀번호는 어디에도 적지 않는다

## 기술 스택

- Next.js 16 (App Router, TypeScript strict) · React 19
- Supabase (익명 Auth, Postgres + RLS, RPC 함수). 별도 백엔드 서버 없음
- Mapbox GL JS (globe projection) — [0001](docs/decisions/0001-map-engine-mapbox.md)
- next-intl (ko 기본, en/es/fr/pt) — [0003](docs/decisions/0003-i18n-next-intl.md)
- Tailwind CSS v4 · Phosphor 아이콘 (`@phosphor-icons/react`)
- PWA (서비스 워커는 `public/sw.template.js` → 빌드 시 `scripts/generate-sw.mjs`가 `public/sw.js` 생성)
- 호스팅: Vercel (`main` 푸시 시 자동 배포)

## MCP 서버

- Playwright: 화면 확인·스크린샷 (모바일 뷰포트 필수)
- Context7: Next.js, Supabase, Mapbox 등 최신 공식 문서

Supabase MCP, GitHub MCP는 사용하지 않는다. DB 작업은 Supabase CLI로 직접 한다.

## 폴더 구조

```
src/
├── app/[locale]/
│   ├── (auth)/onboarding/  # 닉네임 온보딩 (타이핑 데모)
│   ├── (main)/page.tsx     # 메인 지구본 화면 + 패널/모달 상태
│   ├── invite/[code]/      # 초대 링크 OG 메타 전용
│   └── layout.tsx          # generateMetadata (manifest/icons 포함)
├── components/
│   ├── mapbox/             # MapboxView (지구본, 마커, 회전)
│   ├── church/             # 우리 교회 (ChurchView, ChurchPinMap)
│   ├── shared/             # 기도 불빛 마커 렌더링
│   └── ui/                 # 오버레이, 탭바, 기록/설정, 모달
├── hooks/                  # usePrayerState, usePrayerStats, useMyChurch
├── lib/
│   ├── supabase/           # client.ts / server.ts (임의 수정 금지)
│   ├── app-config.ts       # app_config 로딩·검증
│   ├── church.ts           # 교회 RPC 래퍼
│   ├── map-tone.ts         # 지도 웜 톤 덮어쓰기
│   ├── format.ts           # 시간·조사 포맷
│   ├── audio.ts            # 기도 음원
│   └── bridge.ts           # GPS 등 네이티브 브릿지 추상화
├── i18n/                   # next-intl 라우팅
└── types/                  # supabase.ts(생성), prayer.ts
messages/                   # ko/en/es/fr/pt.json
supabase/migrations/        # DB 마이그레이션 SQL
public/churches/            # 교회 8단계 일러스트 (디자이너 교체 대상)
docs/                       # app-config 운영 가이드, decisions(ADR), memory
```

## 데이터 모델 요약

| 테이블 | 용도 |
|---|---|
| `users` | 익명 사용자, 닉네임(기본값 `'기도자'`는 데이터 상수), `church_id` |
| `prayers` | 기도 기록. **사용자당 하루 1행**, 같은 날 다시 기도하면 시간 누적. 위치는 0.1도 격자 |
| `churches` | 교회 (정확한 위치, 만든 사람, 초대 코드). 생성은 `create_church` RPC로만 |
| `church_warmth` | 이웃 교회가 받은 온기. 트리거가 계산, 클라이언트 접근 불가 |
| `app_config` | 무배포 튜닝 값 — [docs/app-config.md](docs/app-config.md) |

모든 테이블에 RLS 필수. 다른 교회의 누적 시간·성도 수는 클라이언트로 내보내지 않는다 ([0010](docs/decisions/0010-no-competition-neighbor-warmth.md)).

## 디자인 규약 (톤온톤) — [0006](docs/decisions/0006-tone-on-tone-design.md)

- 색: `night #131209`(배경) · `ivory`(텍스트, 불투명도 100/70/45/30) · `gold` · `gold-light`. 표면·테두리는 새 색 대신 `gold/5~15`
- 폰트 Geist, 아이콘 Phosphor, 이모지 아이콘 쓰지 않음
- 간격은 Tailwind 기본 단위(2/4/8/12/16/24/32/40/48/64/80/96px), 임의 크기 값(`text-[19px]` 등) 금지. safe-area 같은 `env()` 값만 예외
- 모션은 `ease-weighted`(cubic-bezier(0.22,1,0.36,1)), 색 변화 300ms / 위치 500ms, `transform`·`opacity`만
- 모든 버튼에 hover · active · `focus-visible` 링. 로딩은 `LogoPulse`
- 터치 대상은 최소 48px (메인 버튼 `h-12`)

## 코딩 규칙

- Server Component 기본. `'use client'`는 지도, 인터랙티브 UI 등 필요할 때만
- TypeScript strict, `any` 금지
- Tailwind만 사용. 인라인 스타일은 동적 값(입력 폭, 진행률 등)에만
- named export (page.tsx, layout.tsx 제외), 함수형 컴포넌트만
- Supabase 클라이언트는 반드시 `src/lib/supabase/`에서 import
- import 순서: react → next → 외부 라이브러리 → `@/` 내부 경로
- 브라우저 전용 라이브러리(mapbox-gl)는 `next/dynamic`의 `ssr: false`로 불러온다

## 명령어

```bash
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (sw.js 생성 포함)
npm run lint             # ESLint

# Supabase CLI는 2.122.0 고정 (3.x는 config.toml을 거부) — docs/decisions/0012
npx -y supabase@2.122.0 start                 # 로컬 Supabase (Docker 필요)
npx -y supabase@2.122.0 migration new <name>  # 새 마이그레이션
npx -y supabase@2.122.0 migration up          # 로컬 적용 (실행 전 확인받기)
npx -y supabase@2.122.0 gen types typescript --local > src/types/supabase.ts
npx -y supabase@2.122.0 db push               # 운영 적용 (실행 전 확인받기)
```

## 하지 말 것

- `src/lib/supabase/` 설정 파일 임의 수정
- RLS 정책 없이 테이블 생성
- 지도 렌더링 루프에 불필요한 React 상태 추가
- 확인 없이 의존성 설치, DB 마이그레이션 실행, 배포
- WebSocket 사용 (polling 방식)
- 초대코드 입력 UI 재도입

## 웹뷰 대비

베타 이후 네이티브 앱 웹뷰에 들어갈 수 있다. 지금부터 지킬 것:
- viewport 메타 + safe-area-inset 적용
- GPS는 `src/lib/bridge.ts`의 래퍼로만 호출 (웹뷰에서 네이티브 브릿지로 교체)
- `window.postMessage` 기반 네이티브 통신은 `bridge.ts`에 추상화
- PWA manifest/서비스 워커 유지, 웹뷰 환경 감지 시 비활성화
