# ON-GI (기도의 불)

**Real-time prayer around the world, shown as warm light on a 3D globe.**
Start praying and your light appears on the globe alongside others praying right now. Join or build your church, and the prayer time of everyone in it grows the building from a simple booth into a church of light, while a little warmth reaches neighboring churches too.

- Live: https://on-gi-five.vercel.app
- Stack: Next.js 16 · Supabase · Mapbox GL (globe) · Tailwind CSS v4 · next-intl (ko, en, es, fr, pt) · PWA
- License: [MIT](LICENSE) · Contributions welcome: [CONTRIBUTING.md](CONTRIBUTING.md)

## Local setup

Requirements: Node 20, Docker (for local Supabase).

```bash
npm install
cp .env.example .env.local            # fill in values (see comments in the file)

npx -y supabase@2.122.0 start         # local Supabase in Docker
npx -y supabase@2.122.0 migration up  # apply migrations to the local DB
npx -y supabase@2.122.0 status        # copy API URL + anon key into .env.local

npm run dev                           # http://localhost:3000
```

The Supabase CLI is pinned to **2.122.0**. Newer 3.x versions reject `supabase/config.toml` ([why](docs/decisions/0012-pin-supabase-cli.md)).

---

## 한국어 안내

실시간 글로벌 기도를 3D 지구본 위 따뜻한 빛으로 시각화하는 기독교 기도 웹앱(PWA)입니다.

### 개발

```bash
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (sw.js 생성 포함)
npm run lint             # ESLint
```

환경 변수는 [.env.example](.env.example)을 `.env.local`로 복사해서 채웁니다.

### 배포

Vercel이 `main` 푸시마다 자동 배포합니다. DB 변경이 있으면 **운영 DB에 먼저 적용한 뒤** 푸시합니다.

```bash
npx -y supabase@2.122.0 db push                 # 운영 DB 적용 (사전에 supabase login, link)
npx -y supabase@2.122.0 migration list --linked # 적용 확인
git push origin main                            # 배포
```

### 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 프로젝트 구조, 코딩·디자인 규약, 명령어 (AI 에이전트 진입점) |
| [docs/memory/](docs/memory/) | 현재 상태 요약(기능·함정·백로그)과 작업 방식 — 세션 시작 시 먼저 읽기 |
| [docs/decisions/](docs/decisions/) | 결정 로그(ADR) — 왜 이렇게 만들었는지 |
| [docs/app-config.md](docs/app-config.md) | 배포 없이 운영 값 튜닝 (잔광 색, 음원, 교회 단계 기준, 이웃 나눔) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 방법 |

### 새 컴퓨터에서 이어서 작업하기

1. 위 "Local setup" 순서대로 설치 (Node 20, Docker, `.env.local`)
2. 운영 DB 작업이 필요하면 `npx -y supabase@2.122.0 login` → `npx -y supabase@2.122.0 link --project-ref <프로젝트 ref>`
3. Vercel 대시보드 접근 권한 확인 (환경 변수는 Vercel 프로젝트 설정에 있음)
4. AI 에이전트와 작업한다면 [CLAUDE.md](CLAUDE.md)의 컨텍스트 프로토콜을 따릅니다
