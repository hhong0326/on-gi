# 지구본 빛(Glow) 튜닝 가이드

파일: `src/components/globe/GlobeView.tsx`

## 빛의 구성 요소

| 요소 | 역할 | 수정 위치 |
|------|------|----------|
| **pointsData** | 표면에 깔리는 원형 빛 | `pointRadius`, `pointColor`, `pointAltitude` |
| **ringsData** | 빛에서 퍼져나가는 펄스 링 | `ringMaxRadius`, `ringColor`, `ringPropagationSpeed` |
| **atmosphere** | 지구본 전체 대기광 | `atmosphereColor`, `atmosphereAltitude` |

## 주요 파라미터

### 빛 크기 (pointRadius)
```ts
// 현재: 0.4 ~ 2.4 (weight에 비례)
return 0.4 + Math.min(p.weight, 5) * 0.4;
```
- 더 크게: 계수 `0.4` → `0.8`
- 유저 빛: `1.2` → 더 크게 하면 본인 위치 강조

### 빛 높이 (pointAltitude)
```ts
// 현재: 0.001 (거의 표면에 붙어있음)
pointAltitude={0.001}
```
- `0.01` ~ `0.05`: 표면에서 살짝 떠오르는 효과
- `0`: 완전히 납작 (순수 조명)

### 빛 색상 (getGlowColor)
```ts
// dim amber → bright gold (weight에 따라)
const r = Math.round(200 + t * 55);  // 200~255
const g = Math.round(120 + t * 95);  // 120~215
const b = Math.round(20 + t * 20);   // 20~40
const a = 0.4 + t * 0.5;             // 투명도 0.4~0.9
```
- 더 따뜻하게: `g` 범위 낮추기 (붉은 톤)
- 더 밝게: `a` 시작값 올리기
- 유저 빛: 현재 흰색 `rgba(255,255,255,0.95)`

### 펄스 링 반경 (ringMaxRadius)
```ts
// 현재: 2 ~ 9.5 (weight에 비례)
return 2 + Math.min(p.weight, 5) * 1.5;
```
- 더 넓게 퍼지게: `1.5` → `3`
- 유저 링: `4` → 더 크게 하면 파동 효과 강화

### 펄스 링 속도 (ringPropagationSpeed)
```ts
// 현재: 1.5 (글로벌)
ringPropagationSpeed={1.5}
```
- 느리게: `0.5` (명상적)
- 빠르게: `3` (활발한 느낌)

### 펄스 링 반복 주기 (ringRepeatPeriod)
```ts
// 현재: 유저 800ms, 기본 1500~2000ms
return p.isUser ? 800 : 1500 + (1 / Math.max(p.weight, 0.5)) * 500;
```
- 짧게: 더 자주 펄스
- 길게: 차분한 느낌

### 대기광
```ts
atmosphereColor="#F0AA40"   // 앰버 톤
atmosphereAltitude={0.25}   // 대기 두께
```
- 색상: `#FFD700` (골드), `#FF6B35` (주황), `#E8D5B7` (크림)
- 두께: `0.1` (얇게) ~ `0.5` (두껍게)

## 클러스터링 (그룹핑)

```ts
// clusterPoints(points, radius)
// radius = 5 → 위경도 5도 이내 포인트를 하나로 묶음
```
- `radius` 크게: 더 넓은 범위를 하나의 빛으로 합침
- `radius` 작게: 개별 포인트가 더 많이 보임
- `weight`: 클러스터에 합쳐진 포인트 수 (밝기/크기 결정)

## 빛 시뮬레이션 (page.tsx)

```ts
// 3초마다 랜덤 위치에 새 포인트 추가
setInterval(() => { ... }, 3000);
```
- 간격: `3000` → `1000` (빠르게 늘어남)
- intensity 범위: `0.4 + Math.random() * 0.6` (0.4~1.0)
