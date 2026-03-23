# ON-GI (기도의 불)

실시간 글로벌 기도를 3D 지구본 위 따뜻한 빛으로 시각화하는 기독교 기도 웹앱.

## 기술 스택

- Next.js 16 (App Router, TypeScript strict mode)
- Supabase (Auth, Database, Realtime — 별도 백엔드 서버 없음)
- Globe.gl + Three.js (3D 지구본 렌더링)
- Supercluster (줌 레벨 기반 기도 클러스터링)
- Tailwind CSS
- PWA (베타 이후 네이티브 앱 웹뷰 임베딩 가능)

## MCP 서버

- Playwright: UI 시각 디버깅, localhost 화면 확인
- Context7: Next.js, Supabase, Globe.gl 등 최신 공식 문서 참조

Supabase MCP, GitHub MCP는 사용하지 않음.
DB 작업은 Supabase CLI(npx supabase ...)로 직접 수행.

## 폴더 구조

```
src/
├── app/
│   ├── (landing)/          # 시네마틱 인트로 → 지구본 전환
│   ├── (main)/             # 메인 지구본 화면
│   └── (auth)/             # 초대코드 기반 온보딩 (S00)
├── components/
│   ├── ui/                 # 공통 UI 컴포넌트
│   └── globe/              # Globe.gl 관련 컴포넌트
├── lib/
│   ├── supabase/           # 클라이언트(client.ts) / 서버(server.ts) 설정
│   └── bridge.ts           # 네이티브 웹뷰 브릿지 추상화
├── hooks/                  # React 커스텀 훅
└── types/                  # TypeScript 타입 정의
supabase/
├── migrations/             # DB 마이그레이션 SQL
└── config.toml
public/
├── videos/                 # 시네마틱 인트로 영상
└── textures/               # 지구본 텍스처 (earth_vintage_balanced.jpg 등)
```

## DB 스키마

### prayers 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | 사용자 (anonymous UUID) |
| church_id | uuid | nullable, 소속 교회 |
| lat | float8 | 위도 |
| lng | float8 | 경도 |
| prayed_at | timestamptz | 기도 시작 시각 |
| duration_seconds | int4 | 기도 지속 시간 |

잔광(residual light) 강도는 prayed_at으로부터 실시간 계산. 별도 컬럼 없음.
감쇠 함수(decay curve)는 디자인 튜닝 후 별도 정의 예정.

## 핵심 개념

### 잔광 시스템 (Residual Light)
- intensity = f(now - prayed_at)로 렌더링 시 계산
- 오래된 기도도 희미한 빛으로 남음 → 지구본이 비어보이지 않음
- 감쇠 함수는 별도 정의 예정

### 하이브리드 랜딩 (MVP 선택사항)
- 시네마틱 영상 재생 중 Globe.gl 백그라운드 로딩 → fade 전환
- MVP에서는 영상 없이 바로 지구본 줌인도 가능

### 익명 온보딩
- 전통적 회원가입 없음
- UUID 기반 세션
- 초대코드 입력 화면(S00)으로 진입
- 최소 마찰 설계

## 코딩 규칙

- Server Component 기본. 'use client'는 Globe.gl, 인터랙티브 UI 등 필요 시만
- TypeScript strict mode. any 타입 금지
- Tailwind CSS만 사용. 인라인 스타일, CSS 모듈 금지
- named export 사용 (page.tsx, layout.tsx 제외)
- 함수형 컴포넌트만 사용
- Supabase 클라이언트는 반드시 /src/lib/supabase/에서 import
- 모든 테이블에 RLS 정책 필수
- import 순서: react → next → 외부 라이브러리 → @/ 내부 경로

## 명령어

```bash
npm run dev              # 개발 서버 (Turbopack)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npx supabase start       # 로컬 Supabase 시작
npx supabase db reset    # DB 리셋 (마이그레이션 재적용)
npx supabase migration new <name>  # 새 마이그레이션
npx supabase gen types typescript --local > src/types/supabase.ts  # 타입 생성
```

## 하지 말 것

- /src/lib/supabase/ 설정 파일 임의 수정 금지
- RLS 정책 없이 테이블 생성 금지
- Globe.gl 렌더링 루프에 불필요한 React 상태 추가 금지
- 의존성 설치 전 반드시 확인 받기
- DB 마이그레이션 실행 전 반드시 확인 받기
- WebSocket 사용 금지 (초기 구현은 polling 방식)

## 웹뷰 대비

베타 이후 네이티브 앱 웹뷰에 들어갈 수 있음. 지금부터 지킬 것:
- viewport 메타 태그 + safe-area-inset CSS 변수 적용
- GPS는 래퍼 함수로 감싸기 (웹뷰에서 네이티브 브릿지로 교체 가능)
- window.postMessage 기반 네이티브 통신은 /src/lib/bridge.ts에 추상화
- PWA manifest/service worker 유지, 웹뷰 환경 감지 시 비활성화
