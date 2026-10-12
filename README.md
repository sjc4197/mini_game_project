# 도트 아케이드 (mini_game_project)

도트 고양이 마스코트와 함께하는 미니게임 모음. 캐릭터를 고르면 그 고양이가 게임 옆에서 표정과 말풍선으로 반응하고, 고양이의 상징색이 UI 테마가 됩니다.

- 게임: **지뢰찾기**(초급/중급/고급), **테트리스**(레벨 1/5/10) — 플러그인 구조라 새 게임을 폴더 하나 + 등록 한 줄로 추가
- 캐릭터: 치즈(치즈태비) · 고등어(고등어태비) · 우유(흰 고양이) · 샴 — 같은 도트 템플릿의 팔레트/무늬 변형, 표정 7종 + 식빵 자세
- 기록: 난이도별 BEST · 플레이/클리어율 · 최근 10판 (브라우저 localStorage)
- 설정: 효과음/볼륨 · CRT 스캔라인 · UI 크기 · 마스코트 수다 · 움직임 줄이기 · 테트리스 DAS/ARR
- PC 키보드/마우스 우선, 좁은 화면은 스트립 레이아웃 + 터치 조작 바

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # 타입 검사 + 린트(oxlint) + 테스트(vitest)
npm run build      # dist/ (정적 파일, 상대 경로라 어디에 올려도 됨)
npm run preview
```

Node 20+ · React 19 · Vite · TypeScript · zustand · Galmuri 픽셀 폰트.

개발 빌드 전용 진입점: `#dev/gallery`(캐릭터 전 표정), `#dev/tokens`(디자인 토큰), `#go/<title|select|lobby|records|settings>`, `?touch=1`(터치 바 강제 표시).

## 조작

| 키 | 메뉴 | 지뢰찾기 | 테트리스 |
| --- | --- | --- | --- |
| ←→↑↓ | 포커스 이동 | 커서 이동 | ←→ 이동 · ↓ 소프트 드롭 · ↑ 시계 회전 |
| Enter / Z / Space | 확인 | Enter·Z 열기 · Space 코드 | Z 반시계 · Space 하드 드롭 |
| Esc / X | 뒤로 · 닫기 | Esc 일시정지 · X 깃발 | Esc 일시정지 · X 시계 회전 |
| C / Shift · R · S | — · 기록(로비) · 설정 | — · 재시작 | 홀드 · 재시작 |
| 마우스 | hover = 포커스, 클릭 = 확인 | 좌클릭 열기 · 우클릭 깃발 · 양쪽/가운데 코드 | — |
| 터치 | — | 탭 열기 · 길게 눌러 깃발 · 깃발 모드 토글 | 화면 아래 버튼 |

## 구조

```
src/
├─ app/        스토어(persist) · 화면 상태 머신 · 입력 서비스 · 오디오(WebAudio 칩튠) · 마스코트 리액터 · 기록 병합 · 루프
├─ pixel/      코드로 정의하는 도트 스프라이트 → 래스터 → 캔버스 캐시
├─ characters/ 고양이 템플릿(걷는 포즈 42×39, 식빵 46×34) · 얼굴 타일 · 대사표 · 4종 정의
├─ games/      types.ts(게임 ↔ 셸 계약) · registry.ts · host.ts · minesweeper/ · tetris/ · sample/
├─ ui/         React 화면/컴포넌트/훅/스타일 (전역 토큰 + CSS Modules)
└─ lib/        rng · fit · canvas · format · math
docs/          계획서(00) · 아키텍처(01) · 디자인 시스템(02) · 게임 스펙(03) · art/(캐릭터 도안)
```

핵심 규칙

- 게임 모듈은 React를 모른다. `games/types.ts`의 `GameModule`/`GameInstance`/`GameHost`만 사용하고, 로직은 순수 함수가 의미 이벤트(`reveal`, `clear`, `lost` …)를 돌려주면 `index.ts`가 효과음·마스코트·HUD로 매핑한다.
- 마스코트는 게임이 던지는 **의미 이벤트**(`game.good`, `game.risky` …)에만 반응한다. 표정·우선순위·쿨다운은 `app/mascot.ts` 한 곳, 대사는 캐릭터 파일.
- 모든 치수는 디자인 픽셀(dp) 단위. `1dp = --u` CSS px이며 DPR 보정으로 항상 정수 디바이스 픽셀이라 어떤 화면에서도 도트가 번지지 않는다. 게임 캔버스도 논리 크기만 선언하면 프레임이 정수 배율로 띄운다.

## 새 게임 추가

1. `src/games/sample/`을 복사해 `GameModule`을 구현한다 (`logical` 크기, 난이도, HUD 항목, 채점 규칙, 조작 설명, `create(host)`).
2. `src/games/registry.ts`의 `GAMES`에 한 줄 추가 → 로비 카드·난이도 피커·기록 화면에 자동 노출.
3. 캐릭터별 전용 대사가 필요하면 `registerGameLines(gameId, {...})`.

## 캐릭터 도안

`docs/art/`의 도안(걷는 포즈, 식빵 자세)은 이 프로젝트 소유자가 제작한 원본이며, `src/characters/template.ts`는 그 도안을 픽셀 격자로 샘플링해 정리한 것입니다.
