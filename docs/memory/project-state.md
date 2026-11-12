# 프로젝트 현재 상태

> 세션을 시작할 때 먼저 읽는 요약. 결정의 근거는 [docs/decisions/](../decisions/)에 있다.
> 작업을 마치면 이 파일을 갱신한다 (마지막 갱신: 2026-11-12).

## 한 줄 요약

실시간 글로벌 기도를 3D 지구본 위 따뜻한 빛으로 보여주는 기독교 기도 PWA. 베타(2026-06) 이후 다국어, 톤온톤 디자인, 우리 교회 세우기 MVP까지 운영 중.

## 지금 있는 기능

- **익명 온보딩**: Supabase 익명 인증 + 닉네임. 빈칸 타이핑 데모로 입력 안내 ([0002](../decisions/0002-remove-invite-code-input.md), [0008](../decisions/0008-onboarding-typing-demo.md))
- **지구본**: Mapbox GL globe, 첫 터치까지 자동 회전, 회전 재개 버튼(줌 2 이하), 웜 톤 ([0001](../decisions/0001-map-engine-mapbox.md), [0007](../decisions/0007-globe-warm-tone.md))
- **기도**: 시작 시 내 위치로 flyTo(줌 8), 3초 폴링으로 다른 사람 기도 표시, 백그라운드에서도 시간 유지, 잔광(7일 감쇠), 마커 탭 툴팁
- **기도 음원**: 10분 루프, `features.audio` 플래그로 켜고 끔
- **기도 기록**: 기간별 통계와 목록
- **설정**: 우리 교회 카드, 닉네임, 초대 링크 복사, 언어
- **우리 교회 세우기 MVP**: 검색(거리순) · 지도 핀으로 세우기(근처 같은 이름 경고) · 내 교회(8단계, 진행바, 이번 주 함께 기도, 받은 온기) · 이웃 교회 온기 나눔 · 교회 없는 사용자 안내 ([0009](../decisions/0009-church-builder.md)~[0011](../decisions/0011-church-nudge.md))
- **다국어**: ko(기본) / en / es / fr / pt ([0003](../decisions/0003-i18n-next-intl.md))
- **예루살렘 이스터에그**: 전구 마커 + 창립 이야기 모달
- **PWA**: 홈 화면 설치, 빌드마다 서비스 워커 캐시 버전 자동 갱신 (dev에서는 SW 미등록)
- **SEO**: robots, sitemap, OG 이미지, 봇 감지

## 인프라 · 배포

| 항목 | 내용 |
|---|---|
| 호스팅 | Vercel — `main` 푸시 시 자동 배포 (on-gi-five.vercel.app) |
| DB/인증 | Supabase 프로젝트 "Ongi" (도쿄 리전) |
| 지도 | Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`) |
| CLI | `npx -y supabase@2.122.0` 고정 ([0012](../decisions/0012-pin-supabase-cli.md)) |
| 운영 튜닝 | `app_config` 테이블 ([docs/app-config.md](../app-config.md)) |

**배포 순서 (DB 변경이 있을 때)**: 로컬 확인 → 실행 전 확인받기 → `npx -y supabase@2.122.0 db push` → 원격 적용 확인(`migration list --linked`) → `git push origin main` → Vercel 상태 확인.
반대로 하면 배포와 DB 적용 사이에 새 화면이 에러를 낸다.

## 알려진 함정

- 지도 래퍼의 `z-0`을 지우면 마커의 큰 z-index가 모달을 뚫는다
- Mapbox 마커 element에 custom transform 금지 (위치 흔들림)
- `mapbox-gl.css`가 `.mapboxgl-map`에 `position: relative`를 강제한다 → 지도 컨테이너에 `absolute inset-0` 대신 크기를 직접 지정
- `.gitignore`가 `*.png`를 막는다 → 새 PNG는 `!public/...` 허용 줄 필요
- DB 닉네임 기본값 `'기도자'`는 데이터 상수 (번역 비교 금지)
- 기도 기록은 **사용자당 하루 1행**이고 같은 날 다시 기도하면 그 행에 시간이 누적된다 (`usePrayerState.ts`)
- 개인 기도 위치는 0.1도 격자라 반경 계산은 10km 이상에서만 의미가 있다
- `next start` 프로세스명은 `next-server`라 `pkill -f "next start"`로 안 죽는다 → 포트 기준으로 종료하고, 서빙 중인 청크에 새 코드가 있는지 확인 후 검증
- 기도 완료 모달의 `onClose`는 `useCallback`으로 고정해야 한다 (아니면 리렌더마다 자동 닫힘 타이머가 재시작)
- 오늘 기도 행 조회의 `.single()`이 행이 없을 때 콘솔에 406을 남긴다 (동작에는 영향 없음, 백로그)

## 백로그

**우리 교회 2차 이후**
- [ ] 지구본 교회 아이콘 + 기도 중 내 교회 항로선(대권 곡선) + 이웃 교회로 가는 약한 빛
- [ ] 단계 상승 연출
- [ ] 교회 초대 링크로 바로 가입 (`churches.invite_code` 활용)
- [ ] 이름 신고·숨김, 중복 교회 병합
- [ ] 디자이너가 `public/churches/lv1~8.svg` 다듬어 교체 (톤온톤 규약)
- [ ] `church_sharing` 비율·반경 확정, 단계 기준 시간 실제 데이터 보고 조정
- [ ] 외국어 성경 구절 검토 (특히 fr 시편 96:6)

**기술 부채**
- [ ] `src/hooks/usePrayerStats.ts` 린트 에러 (effect 안 동기 setState)
- [ ] 오늘 기도 조회 `.single()` → `.maybeSingle()` (406 제거)
- [ ] 기도 시간 서버측 검증 (현재 클라이언트가 저장)
- [ ] Supabase CLI 3.x 대응 (`config.toml`의 `[inbucket]` → `[local_smtp]`)
- [ ] 운영 DB에 생긴 테스트 데이터가 있으면 정리

**예정**
- [ ] 네이티브 앱 웹뷰 임베딩 (`src/lib/bridge.ts` 브릿지 교체)
