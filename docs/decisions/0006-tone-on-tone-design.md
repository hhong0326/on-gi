# 0006. 톤온톤 디자인 시스템

- 상태: 채택
- 날짜: 2026-11-04

## 배경
화면마다 네이비·회색·앰버·초록이 섞여 있었고, body 폰트가 Arial로 덮여 Geist가 적용되지 않았다. 외부 디자인 스킬(landing-page-design)을 검토했다.

## 결정
스킬의 시각 규칙(Part B)만 전 화면에 적용한다. 랜딩 전용 전략(Part A)은 쓰지 않는다. 웜 블랙 `#131209` 베이스에 골드 단일 색 계열(`night / ivory / gold / gold-light` 토큰), 표면·테두리는 골드 저불투명도. Geist, Phosphor 아이콘, 감속 곡선 `ease-weighted`, 플로팅 pill 탭바.

## 이유
"기도의 빛" 콘셉트와 맞고, 토큰만 쓰면 새 화면도 같은 톤이 된다.

## 영향 · 후속
- 토큰: [src/app/globals.css](../../src/app/globals.css)
- 예외: 메인 버튼은 스킬의 8/12px 패딩 대신 터치를 위해 높이 48px
- 한국어는 `word-break: keep-all`로 단어 단위 줄바꿈
