# 0005. 시스템 값은 app_config로 배포 없이 조정

- 상태: 채택
- 날짜: 2026-07-28

## 배경
잔광 색·감쇠·기능 플래그를 바꿀 때마다 배포하는 것은 느리다.

## 결정
`public.app_config`(key + jsonb) 테이블. 코드 기본값이 항상 있고 DB 값은 필드 단위로 검증한 override다. RLS는 전체 읽기, 클라이언트 쓰기 정책 없음.

## 이유
잘못된 값이 들어가도 앱이 깨지지 않고, SQL 한 줄로 운영 중 조정할 수 있다.

## 영향 · 후속
- 운영 가이드: [docs/app-config.md](../app-config.md)
- 새 키 추가 시 DEFAULTS + 검증 + 시드 마이그레이션을 함께 추가한다
- 교회 관련 키(church_levels, church_sharing)는 DB 함수가 매번 읽어 즉시 반영된다
