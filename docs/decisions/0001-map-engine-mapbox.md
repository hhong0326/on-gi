# 0001. 지도 엔진은 Mapbox GL globe

- 상태: 채택
- 날짜: 2026-04-13

## 배경
3D 지구본 위에 기도 불빛을 올리는 화면이 핵심이다. react-globe.gl, Google Maps(위성/다크/하이브리드)를 A/B/C/D 테스트 페이지로 비교했다.

## 결정
Mapbox GL JS의 globe projection 단일 뷰로 간다. 다른 지도 실험 코드는 제거했다.

## 이유
지구본과 지도 줌이 한 화면에서 끊김 없이 이어지고, 대기(fog)·라벨·레이어 색을 코드로 조정할 수 있다.

## 영향 · 후속
- 마커 element에 custom transform 금지 (Mapbox가 transform을 덮어써 위치가 흔들림)
- 지도 래퍼 `z-0`이 마커의 큰 z-index를 격리한다. 제거하면 마커가 모달을 뚫는다
- 기존 CLAUDE.md의 Globe.gl/Supercluster 언급은 이 결정으로 대체됨
