# 0003. 다국어는 next-intl, 5개 언어

- 상태: 채택
- 날짜: 2026-07-02

## 배경
글로벌 기도 앱이라 한국어 외 사용자가 들어온다.

## 결정
next-intl URL 라우팅(`/ko /en /es /fr /pt`), 한국어 기본. 문구는 `messages/*.json`.

## 이유
App Router와 맞고 서버/클라이언트 모두 같은 메시지를 쓴다.

## 영향 · 후속
- DB 기본 닉네임 `'기도자'`는 데이터 상수다. 번역 함수로 비교하면 언어별 리다이렉트 루프가 생긴다
- metadata는 `src/app/[locale]/layout.tsx`의 generateMetadata에 모은다. 옮길 때 manifest·icons 등 정적 필드까지 전부 옮긴다
