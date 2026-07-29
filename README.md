# ON-GI (기도의 불)

실시간 글로벌 기도를 3D 지구본 위 따뜻한 빛으로 시각화하는 기독교 기도 웹앱 (PWA).

- **스택**: Next.js 16 (App Router) · Supabase (Auth/DB) · Mapbox GL (globe projection) · Tailwind CSS · next-intl (5개 언어)
- **호스팅**: Vercel — `main` 푸시 시 자동 배포

## 개발

```bash
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (sw.js 생성 포함)
npm run lint             # ESLint
npx supabase start       # 로컬 Supabase
npx supabase migration up  # 로컬 DB에 마이그레이션 적용
```

환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN` (`.env.local`)

## 운영 문서

- [app_config — 배포 없이 앱 시스템 값 튜닝](docs/app-config.md): 잔광 색상, 감쇠 곡선, 기능 플래그를 DB에서 SQL로 변경

프로젝트 구조·코딩 규칙은 [CLAUDE.md](CLAUDE.md) 참고.
