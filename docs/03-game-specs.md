# 03 · 공통 게임 모듈 / 지뢰찾기 / 테트리스 구현 명세

> 설계 단계(2026-10-07) 참고 문서. 최종 결정·단계 계획은 `docs/00-plan.md`가 우선한다. 원안은 vanilla DOM 기준으로 쓰였다. 호스트 API의 최종 형태(`GameHost.mascot.react(event)` 등)는 `00-plan.md §1.4`, React 쪽 연결은 `01-architecture.md §5`를 따른다. 아래의 규칙·수치·테스트 목록은 그대로 유효하다.

## 0. 전제
- 순수 로직(`logic.ts`, `srs.ts`, `scoring.ts`, `das.ts`)은 DOM·시간·난수에 의존하지 않음: 시간은 `dtMs`로, 난수는 `rng: () => number`로 주입. Vitest는 `environment: 'node'`.
- 기본 타일 크기 `TILE = 16` 논리 px, 캔버스는 논리 크기로 만들고 정수 배율로 확대, `image-rendering: pixelated`, `ctx.imageSmoothingEnabled = false`.
- 캔버스 안 텍스트는 코드로 정의한 5×7 숫자 글리프만 사용(폰트 로딩 타이밍·AA 문제 회피).

---

## A. 공통

### A.1 상태 전이
`created --mount--> mounted --start--> running <--pause/resume--> paused`, `running/paused --host.finish()--> finished`, 어디서든 `destroy()` → `destroyed`. 게임은 `finished` 이후 입력을 무시하고 결과 화면 전환은 호스트가 담당. `mount()`는 canvas 생성·리스너 등록·첫 프레임 렌더까지만(루프는 `start()`에서). `pause()`는 update 중단·타이머 동결·입력 큐 비움·마지막 프레임 유지. `resume()`은 루프 `acc=0` 리셋. `destroy()` 이후 모든 호출 no-op.

### A.2 포인터 계층 (`games/minesweeper/input.ts`, 테트리스 터치 버튼도 같은 원리)

Pointer Events 사용. 주의: 버튼이 하나라도 눌린 상태에서 다른 버튼을 누르거나 떼면 `pointerdown/up`이 아니라 `pointermove`가 발생하고 `e.buttons`만 바뀐다. 따라서 모든 이벤트에서 `prevButtons ^ e.buttons`로 버튼 전이를 계산하는 정규화기를 둔다.

```ts
export interface GridSpec { cols: number; rows: number; cellSize: number; originX: number; originY: number; getScale(): number; }
export type BoardPointerAction =
  | { type: 'hover'; col: number; row: number }                 // 보드 밖이면 col = row = -1
  | { type: 'pressStart'; col: number; row: number; chord: boolean }
  | { type: 'pressMove';  col: number; row: number; chord: boolean }
  | { type: 'pressCancel' }
  | { type: 'primary';   col: number; row: number }             // 좌클릭 release → reveal
  | { type: 'secondary'; col: number; row: number }             // 우클릭 press   → flag
  | { type: 'chord';     col: number; row: number };            // 중클릭 release / 좌+우 동시 release
export interface PointerLayer { onAction(h: (a: BoardPointerAction) => void): void; destroy(): void; }
```

```
state: prev = 0, chordArmed = false, chordDone = false, pressing = false
onPointer(e):                       // pointerdown / pointermove / pointerup / pointercancel 공통
  if e.type === 'pointerdown': canvas.setPointerCapture(e.pointerId)
  cur = e.type === 'pointercancel' ? 0 : e.buttons
  changed = prev ^ cur; pressedNow = changed & cur; releasedNow = changed & prev
  cell = toCell(e)                  // ((clientX - rect.left) / scale - originX) / cellSize, 범위 밖 → (-1,-1)
  if (pressedNow & 2) && !(cur & 1) && !(cur & 4): emit secondary(cell)        // 우클릭 단독 press 즉시 플래그
  if (cur & 3) === 3 || (cur & 4): chordArmed = true; pressing = true; emit pressStart(cell, chord=true)
  else if (cur & 1) && !chordArmed: pressing = true; emit pressStart(cell, chord=false)
  if releasedNow:
    if chordArmed && !chordDone: chordDone = true; emit chord(cell)
    else if (releasedNow & 1) && !chordArmed: emit primary(cell)
  if cur === 0: if pressing: emit pressCancel; pressing = chordArmed = chordDone = false
  else if changed === 0 && e.type === 'pointermove': emit (pressing ? pressMove : hover)(cell)
  prev = cur
canvas 'contextmenu' → e.preventDefault()
canvas 'pointerleave' (버튼 없음) → hover(-1,-1);  window 'blur' → cur=0 처리
```

터치 매핑(15단계): `pointerType === 'touch'`일 때 탭(<300 ms, 이동 < 8px) → `primary`, 길게 누름(≥ 350 ms, 정지) → `secondary` + `navigator.vibrate(20)`. 화면 하단에 "열기/깃발" 토글 버튼(DOM). 테트리스는 화면 버튼(DOM)이 입력 서비스의 액션을 주입하는 방식으로 동일 코드 경로 재사용.

### A.3 고정 타임스텝 루프
`01-architecture.md §7`. 모든 게임 내 타이머(지뢰찾기 경과시간, 테트리스 중력/락/DAS)는 `update(dt)` 누적으로만 진행하므로 pause 시 자동 동결. `maxFrameMs = 250`으로 탭 복귀 시 폭주 방지.

### A.4 렌더 유틸 (`lib/`)
```ts
definePixelSprite(rows: string[], palette: Record<string, string>): PixelSprite;  // '.' = 투명
blit(ctx, sprite, x, y): void;                       // 최초 1회 OffscreenCanvas에 굽고 drawImage
fitIntegerScale(logicalW, logicalH, frameW, frameH, max): number;  // clamp(floor(min(fw/lw, fh/lh)), 1, max)
applyCanvasScale(canvas, logicalW, logicalH, scale): void;
```
리사이즈는 `ResizeObserver`로 프레임 크기 변화 시 `scale`만 재계산(캔버스 논리 크기 불변, 재렌더 1회).

### A.5 마스코트 억제 규칙 (공통)
한 액션/한 락에서 여러 이벤트가 겹치면 우선순위가 가장 높은 것 하나만 보낸다. 지뢰찾기: `fail > win > risky > good > flag-think`. 테트리스: `gameover > tetris > 신기록 > worried > levelup > combo > clear`. `finish()` 호출 후 게임의 `react`는 무시(결과 화면이 win/sad 포즈를 직접 제어).

### A.6 공통 모듈 테스트
- `loop`: 가짜 `now`/raf로 33 ms 프레임 → update 2회, 250 ms 초과 프레임 → 클램프, pause 중 update 0회, resume 후 acc=0.
- `input`: `repeat` 이벤트 무시, `takePress`는 1회만 true, `lastPressed` 순서, `releaseAll`.
- `pointer`: 합성 이벤트 시퀀스(좌 down → 우 down(move 이벤트) → 우 up → 좌 up) → `chord` 1회, `primary` 0회; 중클릭 → `chord`; 우 단독 → `secondary`; `pointercancel` → `pressCancel`.
- `persist`: 봉투 없음 → 기본값, 구버전 → migrate 호출, 손상 JSON → 기본값, 쓰기 예외 → 무시.
- `mascot`: 우선순위 교체/드롭, 키 쿨다운, 전역 간격, 중복 억제, hold 후 idle 복귀, sticky.

---

## B. 지뢰찾기 (Minesweeper)

### B.1 데이터 모델과 난이도

| id | label | cols | rows | mines | 밀도 |
|---|---|---|---|---|---|
| `beginner` | 초급 | 9 | 9 | 10 | 12.3% |
| `intermediate` | 중급 | 16 | 16 | 40 | 15.6% |
| `expert` | 고급 | 30 | 16 | 99 | 20.6% |

```ts
export const CellState = { Hidden: 0, Revealed: 1, Flagged: 2, WrongFlag: 4 } as const   // 3은 '?' 예약(v1 미사용)
export type MsStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface MsBoard {
  cols: number; rows: number; mineCount: number;
  mines: Uint8Array;      // 0/1, index = row * cols + col
  counts: Uint8Array;     // 0..8 (지뢰 칸은 0)
  state: Uint8Array;      // CellState
  revealedCount: number; flagCount: number;
  status: MsStatus;
  explodedIndex: number;  // -1
  elapsedMs: number;      // playing 동안만 누적, 표시 = min(999, floor(/1000))
  scratch: Int32Array;    // flood fill 스택 (cols*rows), 할당 1회
}
export interface RevealResult { revealed: number; hitMine: boolean; }
```

순수 API(`logic.ts`): `createBoard(difficulty)`, `placeMines(board, safeIndex, rng)`, `reveal(board, idx): RevealResult`, `toggleFlag(board, idx): 'flagged'|'unflagged'|'noop'`, `chord(board, idx): RevealResult | null`, `primaryAction(board, idx, rng)` (ready면 placeMines 후 reveal; Revealed 숫자면 chord), `tick(board, dtMs)`, `neighbors(board, idx, out: Int32Array): number` (할당 없이 개수 반환).

'?' 상태: v1에서는 **제외**. 우클릭은 `Hidden ↔ Flagged` 토글만.

### B.2 보드 생성 (첫 클릭 안전)

```
placeMines(board, safeIndex, rng):
  exclude = {safeIndex} ∪ neighbors(safeIndex)                // 모서리면 4개, 가장자리 6개, 내부 9개
  candidates = 모든 index − exclude
  if candidates.length < mineCount: candidates = 모든 index − {safeIndex}   // 폴백 1
  if candidates.length < mineCount: mineCount = candidates.length           // 폴백 2 (표준 난이도에서는 불가능)
  for i in 0 .. mineCount-1:                                   // 부분 Fisher-Yates
    j = i + floor(rng() * (candidates.length - i)); swap(candidates[i], candidates[j]); mines[candidates[i]] = 1
  computeCounts(): 각 지뢰에 대해 8이웃 counts++ (지뢰 칸 자체는 0 유지)
  status = 'playing'
```

3×3 제외 덕분에 첫 클릭은 항상 0 칸 → 영역이 열린다. `rng`는 `mulberry32(seed)`.

### B.3 규칙 로직

```
reveal(board, idx):
  if status ∉ {playing} || state[idx] !== Hidden: return {0,false}
  if mines[idx]: lose(board, idx); return {0,true}
  sp = 0; scratch[sp++] = idx; state[idx] = Revealed; revealedCount++; n = 1
  while sp > 0:
    i = scratch[--sp]
    if counts[i] !== 0: continue
    for each j in 8 neighbors of i (col/row 경계 검사, 할당 없음):
      if state[j] === Hidden:                 // Flagged는 건너뜀 (클래식 동작)
        state[j] = Revealed; revealedCount++; n++; scratch[sp++] = j
  checkWin(board); return {n,false}

toggleFlag(board, idx):
  if status ∉ {ready, playing} || state[idx] === Revealed: return 'noop'
  Hidden → Flagged (flagCount++) / Flagged → Hidden (flagCount--)        // 깃발 수 제한 없음 → 카운터 음수 가능

chord(board, idx):
  if status !== playing || state[idx] !== Revealed || counts[idx] === 0: return null
  if flaggedNeighbors(idx) !== counts[idx]: return null              // 시각적 press만, 액션 없음
  total = 0
  for each Hidden neighbor j: r = reveal(board, j); total += r.revealed; if r.hitMine: return {total,true}   // 첫 지뢰에서 중단
  return {total,false}

checkWin: revealedCount === cols*rows − mineCount → status='won'; 남은 지뢰 전부 Flagged로(flagCount = mineCount); 타이머 정지
lose(idx): status='lost'; explodedIndex=idx; 모든 i: mines && state!==Flagged → Revealed(지뢰 표시); !mines && Flagged → WrongFlag
tick(dt): if status==='playing': elapsedMs += dt
```

지뢰 카운터 표시값 = `mineCount − flagCount` (−99..999 클램프). 타이머는 첫 reveal에서 `playing` 전환과 함께 시작, won/lost에서 정지, 표시 999 캡.

### B.4 렌더링 스펙

논리 캔버스: `W = cols*16 + 2`, `H = rows*16 + 2` (1dp 프레임). 배율은 프레임이 정수로 결정(최대 4). 타이머·지뢰 카운터는 React HUD(GalmuriMono)에 표시.

타일 16×16(모두 오프스크린에 1회 프리렌더, 변형별 1장). 색은 디자인 토큰(02-design-system.md A1):

| 변형 | 그리기 |
|---|---|
| raised (Hidden) | 전체 `--ink` → `(0,0,14,14)` `--line-1` → `(2,2,12,12)` `--bg-3` (좌상 2px 밝음, 우하 2px 어둠) |
| raised-hover | raised와 같되 내부를 `--bg-3`보다 한 단계 밝게 |
| flat (Revealed/pressed) | 전체 `--bg-1`, x=0 열과 y=0 행 1px `--ink` |
| number 1–8 | flat 위에 5×7 글리프(2px 획)를 중앙에, 색 1 blue · 2 lime · 3 red · 4 purple · 5 orange · 6 teal · 7 text-0 · 8 line-1 |
| flag | raised 위에 flag 스프라이트 |
| mine | flat 위에 mine 스프라이트 |
| mine-exploded | 전체 `--red` + `--ink` mine 스프라이트 |
| wrong-flag | flat + mine 스프라이트 + `(2,2)→(13,13)`, `(13,2)→(2,13)` 1px `--red` X |
| cursor (키보드 모드) | 셀 테두리 2px `--yellow` 오버레이 |

스프라이트 정의(`sprites.ts`, `#`=지뢰 몸통 `--line-1`(폭발 셀에서는 `--ink`), `w`=`--text-0`, `r`=`--red`, `.`=투명):

```
MINE = [                      FLAG = [
'................',           '................',
'................',           '................',
'........#.......',           '.......rr#......',
'...#....#....#..',           '.....rrrr#......',
'......#####.....',           '...rrrrrr#......',
'.....#######....',           '.....rrrr#......',
'....##ww#####...',           '.......rr#......',
'....##ww#####...',           '.........#......',
'..#############.',           '.........#......',
'....#########...',           '.........#......',
'....#########...',           '.......#####....',
'.....#######....',           '.....#########..',
'......#####.....',           '................',
'...#....#....#..',           '................',
'........#.......',           '................',
'................']           '................']
```

렌더 정책: `dirty` 플래그가 선 프레임만 전체 재그리기(최대 480 타일 blit, 비용 무시 가능). hover/press 변경도 dirty.

### B.5 상호작용

| 입력 | 동작 |
|---|---|
| 좌클릭 release (`primary`) | Hidden → `reveal`; Revealed 숫자 → `chord`; ready 상태면 지뢰 배치 후 reveal |
| 우클릭 press (`secondary`) | `toggleFlag` |
| 중클릭 release / 좌+우 동시 release (`chord`) | `chord` |
| `pressStart/pressMove` | chord=false: 해당 Hidden 타일 flat 표시. chord=true: 3×3 Hidden 타일 flat 표시 |
| `pressCancel` / 보드 밖 release | press 표시 해제, 액션 없음 |
| `R` | 같은 난이도로 재시작 (새 seed) |
| `P`/`Esc` | `host.requestPause()` |
| 방향키 | 키보드 커서 모드 켜짐, 커서 이동(클램프). 마우스 이동 시 커서 숨김 |
| `Z`/`Enter` | 커서 칸 primary (Hidden → reveal, 숫자 → chord) |
| `X` | 커서 칸 flag |
| `Space` | 커서 칸 chord |

컨텍스트 메뉴: 캔버스 `contextmenu` preventDefault. 게임 종료(won/lost) 후에는 hover만 동작.

사운드 매핑: reveal 1칸 `reveal`, ≥ 2칸 `flood`, flag/unflag `flag`, chord 성공 `reveal`, 폭발 `boom`, 승리 `win`.

### B.6 마스코트 훅 (의미 이벤트로 변환)

| 상황 | 조건 | MascotEvent | line 예시 | 추가 규칙 |
|---|---|---|---|---|
| 시작 | 첫 reveal | game.start | "가자!" | – |
| 대량 공개 | 한 액션에서 `revealed ≥ 8` | game.good | "와, 시원하다!" | 4s 쿨다운 |
| 깃발 | Flagged 전환 | game.think(lineKey 'flag') | "음… 여긴가?" | 6s 쿨다운, 낮은 우선순위 |
| 위험 숫자 | 공개된 칸 `counts ≥ 4` 이고 Hidden 이웃 ≥ 4 | game.risky | "조심조심…" | 8s 쿨다운 |
| 막바지 | 남은 안전 칸 ≤ 10 | game.think | "거의 다 왔어!" | 게임당 1회 |
| 누르는 중 | pointerdown ~ up | `setMood('worried')` → `idle` | – | 말풍선 없음 |
| 폭발 | lose | game.fail | "펑! 으악…" | sticky |
| 승리 | win | game.win / game.record | "클리어!" / "신기록이야!" | sticky |
| 방치 | playing 중 입력 없음 30 s | game.think | "어디부터 열까…" | 15s 쿨다운 |

### B.7 엣지 케이스
- 모서리/가장자리 첫 클릭(제외 영역 4/6칸), 제외 후 후보 부족 폴백.
- 좌/우 어느 버튼을 먼저 누르든 chord 인식; 우클릭을 먼저 누르면 그 칸이 먼저 플래그됨(클래식 동작, 허용).
- chord 후 남은 버튼 release가 reveal로 새지 않도록 `chordDone` 유지.
- 보드 밖에서 release, 포인터 캡처 중 창 blur, `pointercancel` → press 취소.
- Flagged 칸 좌클릭 무시, Revealed 칸 우클릭 무시, 0 칸 chord no-op, 깃발 수 ≠ 숫자면 chord no-op.
- chord로 지뢰를 밟으면 첫 지뢰에서 중단하고 lose; lose가 win보다 우선.
- 마지막 안전 칸을 chord로 열어 승리하는 경우.
- flagCount > mineCount → 카운터 음수 표시.
- 타이머 999 캡, pause 중 정지, 탭 숨김 자동 pause.
- 승리 시 자동 깃발로 `flagCount = mineCount` 보정.
- 플레이 중 리사이즈 → 배율만 재계산, 상태 불변.
- won/lost 이후 모든 보드 액션 무시, `R`만 유효.
- 키보드 커서와 마우스 hover 동시 표시 금지(마우스 이동이 커서를 숨김).
- `destroy()` 후 늦게 도착한 pointer 이벤트 무시.

### B.8 Vitest 테스트 목록 (`logic.test.ts`)
1. `createBoard` 난이도 3종 크기/지뢰 수.
2. `placeMines`: 지뢰 수 정확, safe 3×3에 지뢰 없음(내부/가장자리/모서리 각각), seed 동일 → 배치 동일.
3. `counts` 검증: 무작위 100개 보드에 대해 brute-force 계산과 일치.
4. 폴백: `cols*rows − 9 < mineCount` 커스텀 보드에서 safe 칸만 제외; 그래도 부족하면 mineCount 클램프.
5. `reveal` 0 칸: 기대 집합과 정확히 일치(고정 보드 픽스처), 지뢰 칸은 절대 Revealed 안 됨, Flagged는 flood를 막음.
6. `reveal` 숫자 칸: 1칸만 공개.
7. 지뢰 reveal: `hitMine`, status lost, `explodedIndex`, 모든 지뢰 Revealed, 틀린 깃발 `WrongFlag`, 맞는 깃발 유지.
8. `toggleFlag`: 토글 왕복, Revealed 칸 noop, 종료 후 noop, flagCount 음수 카운터.
9. `chord`: 깃발 수 일치 → 이웃 공개, 불일치 → null, 틀린 깃발로 지뢰 → lost, 0 칸 → null.
10. 승리: 마지막 안전 칸 공개 → won, 남은 지뢰 자동 Flagged, flagCount = mineCount; chord로 승리.
11. 첫 클릭 안전: 1000 seed × 임의 safeIndex에서 `primaryAction`이 절대 hitMine 아님이고 revealed ≥ 1.
12. 타이머: ready에서 tick 누적 없음, playing 누적, won/lost 정지.
13. `neighbors`가 할당 없이 올바른 개수(모서리 3, 가장자리 5, 내부 8).
14. 결정성: 같은 seed + 같은 액션 스크립트 → 같은 최종 state 배열.

---

## C. 테트리스 (Tetris, 가이드라인 스타일)

### C.1 보드와 좌표
- `COLS = 10`, `VISIBLE_ROWS = 20`, `HIDDEN_ROWS = 4`, `ROWS = 24`. 숨김 행 4의 근거: 스폰 셀이 숨김 행 2–3에 놓이고, I 피스 수직 회전(4행)과 최대 2칸 위로 올리는 킥을 수용.
- 좌표: x 0(좌)→9(우), y 0(최상단 숨김)→23(바닥). `board: Uint8Array(240)`, `index = y*COLS + x`. 값 `0` 빈칸, `1..7` = I,O,T,S,Z,J,L 색 id, `8` 가비지(예약).
- `y < 0`, `y ≥ 24`, `x ∉ [0,9]`는 모두 충돌로 취급.

```ts
export type PieceType = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // I O T S Z J L
export interface ActivePiece { type: PieceType; rot: 0 | 1 | 2 | 3; x: number; y: number; }  // (x,y) = 바운딩 박스 좌상단
export type TetrisAction = 'left' | 'right' | 'rotCW' | 'rotCCW' | 'hold' | 'hardDrop';
export interface TetrisInputFrame { actions: TetrisAction[]; softDrop: boolean; }
export type TetrisEvent =
  | { type: 'move' } | { type: 'rotate'; kick: number } | { type: 'hold' } | { type: 'deny' }
  | { type: 'lock' } | { type: 'hardDrop'; rows: number }
  | { type: 'clear'; n: number; points: number; b2b: boolean; combo: number; tspin: 'none' | 'mini' | 'full' }
  | { type: 'levelup'; level: number } | { type: 'gameover'; reason: 'blockout' | 'lockout' };

export interface TetrisState {
  board: Uint8Array; piece: ActivePiece | null; ghostY: number;
  hold: PieceType | null; holdUsed: boolean;
  queue: PieceType[]; bag: PieceType[]; rng: () => number;
  phase: 'falling' | 'clearing' | 'gameover';
  gravityAcc: number; grounded: boolean; lockTimer: number; lockResets: number; lowestY: number;
  clearRows: number[]; clearTimer: number;
  score: number; lines: number; level: number; startLevel: number; combo: number; b2b: boolean;
  lastActionRotation: boolean; lastKickIndex: number;
  elapsedMs: number; idleMs: number;
  stats: { pieces: number; tetrises: number; maxCombo: number; };
}
createTetris(opts: { seed: number; startLevel: number }): TetrisState
step(s: TetrisState, dtMs: number, input: TetrisInputFrame, out: TetrisEvent[]): void   // out 배열 재사용
```

### C.2 테트로미노 정의와 스폰 (`pieces.ts`)

`PIECES[type][rot]`는 바운딩 박스 기준 `[dx,dy]` 4개(y 아래 방향). JLSTZ 3×3, I 4×4, O 3×3 박스(회전 무시).

| 피스 | rot 0 | rot R(1) | rot 2 | rot L(3) |
|---|---|---|---|---|
| I (4×4) | (0,1)(1,1)(2,1)(3,1) | (2,0)(2,1)(2,2)(2,3) | (0,2)(1,2)(2,2)(3,2) | (1,0)(1,1)(1,2)(1,3) |
| O | (1,0)(2,0)(1,1)(2,1) | 동일 | 동일 | 동일 |
| T | (1,0)(0,1)(1,1)(2,1) | (1,0)(1,1)(2,1)(1,2) | (0,1)(1,1)(2,1)(1,2) | (1,0)(0,1)(1,1)(1,2) |
| S | (1,0)(2,0)(0,1)(1,1) | (1,0)(1,1)(2,1)(2,2) | (1,1)(2,1)(0,2)(1,2) | (0,0)(0,1)(1,1)(1,2) |
| Z | (0,0)(1,0)(1,1)(2,1) | (2,0)(1,1)(2,1)(1,2) | (0,1)(1,1)(1,2)(2,2) | (1,0)(0,1)(1,1)(0,2) |
| J | (0,0)(0,1)(1,1)(2,1) | (1,0)(2,0)(1,1)(1,2) | (0,1)(1,1)(2,1)(2,2) | (1,0)(1,1)(0,2)(1,2) |
| L | (2,0)(0,1)(1,1)(2,1) | (1,0)(1,1)(1,2)(2,2) | (0,1)(1,1)(2,1)(0,2) | (0,0)(1,0)(1,1)(1,2) |

구현은 `Int8Array(7*4*8)` 플랫 배열로 저장(핫 루프 할당 없음). O의 회전은 no-op이며 락 리셋에 포함하지 않음.

스폰: 모든 피스 `rot = 0`, 박스 `(x, y) = (3, HIDDEN_ROWS − 2) = (3, 2)` → 셀은 숨김 행 2–3(I는 행 3), 열 3–5(I는 3–6, O는 4–5). 스폰 직후 `fits(0,+1)`이면 즉시 1행 내림(가이드라인 "spawn drop") → 피스의 아래쪽 1행이 보이는 영역에 즉시 나타남.

### C.3 SRS 월킥 테이블 (`srs.ts`)

**우리 보드 좌표(y 아래가 +)** 기준. Tetris Wiki 표와 x는 같고 y 부호만 반대(`srs.test.ts`에서 wiki 표의 y를 뒤집은 값과 동일함을 검증). 각 전이마다 5개 테스트를 순서대로 시도해 첫 번째로 들어맞는 오프셋을 적용. `nx = x + dx, ny = y + dy`.

JLSTZ:

| 전이 | test1 | test2 | test3 | test4 | test5 |
|---|---|---|---|---|---|
| 0→R | (0,0) | (−1,0) | (−1,−1) | (0,+2) | (−1,+2) |
| R→0 | (0,0) | (+1,0) | (+1,+1) | (0,−2) | (+1,−2) |
| R→2 | (0,0) | (+1,0) | (+1,+1) | (0,−2) | (+1,−2) |
| 2→R | (0,0) | (−1,0) | (−1,−1) | (0,+2) | (−1,+2) |
| 2→L | (0,0) | (+1,0) | (+1,−1) | (0,+2) | (+1,+2) |
| L→2 | (0,0) | (−1,0) | (−1,+1) | (0,−2) | (−1,−2) |
| L→0 | (0,0) | (−1,0) | (−1,+1) | (0,−2) | (−1,−2) |
| 0→L | (0,0) | (+1,0) | (+1,−1) | (0,+2) | (+1,+2) |

I:

| 전이 | test1 | test2 | test3 | test4 | test5 |
|---|---|---|---|---|---|
| 0→R | (0,0) | (−2,0) | (+1,0) | (−2,+1) | (+1,−2) |
| R→0 | (0,0) | (+2,0) | (−1,0) | (+2,−1) | (−1,+2) |
| R→2 | (0,0) | (−1,0) | (+2,0) | (−1,−2) | (+2,+1) |
| 2→R | (0,0) | (+1,0) | (−2,0) | (+1,+2) | (−2,−1) |
| 2→L | (0,0) | (+2,0) | (−1,0) | (+2,−1) | (−1,+2) |
| L→2 | (0,0) | (−2,0) | (+1,0) | (−2,+1) | (+1,−2) |
| L→0 | (0,0) | (+1,0) | (−2,0) | (+1,+2) | (−2,−1) |
| 0→L | (0,0) | (−1,0) | (+2,0) | (−1,−2) | (+2,+1) |

(읽는 법: `(−1,−1)` = 왼쪽 1, 위로 1.)

```
tryRotate(s, dir):             // dir = +1 CW, -1 CCW
  p = s.piece; if p.type === O: return false
  to = (p.rot + (dir > 0 ? 1 : 3)) & 3
  table = (p.type === I ? KICK_I : KICK_JLSTZ)[p.rot][to]
  for i in 0..4: if fits(p.type, to, p.x + table[i].dx, p.y + table[i].dy):
    p.rot = to; p.x += dx; p.y += dy; s.lastActionRotation = true; s.lastKickIndex = i; onSuccessfulMove(s); emit rotate; return true
  return false                                                  // 실패: 상태 변화·락 리셋 없음
```

180° 회전: v1에서는 **미지원**. 추후 추가 시 간단 킥 `[(0,0),(0,−1),(+1,−1),(−1,−1),(+1,0),(−1,0)]`.

### C.4 7-bag, 넥스트, 홀드, 고스트
- 7-bag: `[I,O,T,S,Z,J,L]`을 `rng`로 Fisher-Yates 셔플해 `bag`에 채우고 `pop()`; 비면 재충전. 첫 피스 보정 없음(가이드라인 그대로).
- 넥스트 큐: `queue.length` 를 항상 ≥ 5 유지. `takeNext()`: `t = queue.shift(); while (queue.length < 5) queue.push(bag.pop() ?? refill())`.
- 홀드: `holdUsed`가 true면 `deny` 이벤트만. 아니면 `hold === null`이면 현재 피스 type 저장 후 `takeNext()` 스폰, 있으면 교환 스폰. 홀드로 스폰된 피스도 `rot 0`, `(3,2)`, spawn drop 적용, 락 상태 초기화. `holdUsed = true`; 락 후 정규 스폰에서 `false`.
- 고스트: `ghostY = piece.y; while fits(…, ghostY + 1) ghostY++`. 피스 이동/회전/락/스폰 시에만 재계산.

### C.5 중력, 드롭, 락 딜레이, DAS/ARR

중력(가이드라인 식 `secondsPerRow(L) = (0.8 − (L−1)·0.007)^(L−1)`, `L = min(level, 20)`):

| level | s/row | frames/row(60fps) | rows/s |
|---|---|---|---|
| 1 | 1.000 | 60.0 | 1.0 |
| 2 | 0.793 | 47.6 | 1.26 |
| 3 | 0.618 | 37.1 | 1.62 |
| 4 | 0.473 | 28.4 | 2.12 |
| 5 | 0.355 | 21.3 | 2.82 |
| 6 | 0.262 | 15.7 | 3.82 |
| 7 | 0.190 | 11.4 | 5.27 |
| 8 | 0.135 | 8.1 | 7.42 |
| 9 | 0.094 | 5.6 | 10.7 |
| 10 | 0.064 | 3.8 | 15.6 |
| 11 | 0.043 | 2.6 | 23.3 |
| 12 | 0.028 | 1.7 | 35.4 |
| 13 | 0.018 | 1.1 | 55.1 |
| 14 | 0.0114 | 0.69 | 87.4 |
| 15 | 0.0071 | 0.42 | 141.7 |
| 16 | 0.0043 | 0.26 | 234 |
| 17 | 0.0025 | 0.15 | 397 |
| 18 | 0.0015 | 0.09 | 686 |
| 19 | 0.0008 | 0.05 | 1214 |
| 20+ | 0.00046 (사실상 20G) | 0.03 | — |

레벨은 20 이후에도 계속 오르지만(점수 배율) 중력은 20에서 고정.

```
applyGravity(s, dt, softDrop):
  mult = softDrop ? SDF(20) : 1
  s.gravityAcc += (dt / 1000) * mult / secondsPerRow(s.level)
  rows = min(floor(s.gravityAcc), ROWS); s.gravityAcc -= rows
  for k in 1..rows:
    if fits(p, p.x, p.y + 1): p.y++; s.lastActionRotation = false; if softDrop: s.score += 1
      if p.y > s.lowestY: s.lowestY = p.y; s.lockResets = 0; s.lockTimer = 0
    else: s.gravityAcc = 0; break
  s.grounded = !fits(p, p.x, p.y + 1)
```

락 딜레이: `LOCK_DELAY_MS = 500`, `MAX_LOCK_RESETS = 15`.

```
onSuccessfulMove(s):      // 좌우 이동·회전 성공 시 공통
  if s.grounded(이동 전 기준) && s.lockResets < 15: s.lockTimer = 0; s.lockResets++
  recompute grounded; if !grounded: s.lockTimer = 0           // 턱에서 미끄러져 떨어지면 타이머 해제
step 말미: if s.grounded: s.lockTimer += dt; if s.lockTimer >= 500: lock(s)
```

`lockResets`가 15에 도달하면 이후 이동/회전은 되지만 타이머가 리셋되지 않아 500 ms 내 락. 새 최저 행 도달 시 카운터 0으로 복귀.

하드 드롭: `rows = ghostY − y; y = ghostY; score += 2*rows; lock(s)` 즉시. 소프트 드롭: 중력 배수 20, 행당 1점.

DAS/ARR(기본 `DAS = 167 ms`, `ARR = 33 ms`, 설정에서 DAS 50–300, ARR 0–100 조정 가능, ARR 0 = 벽까지 즉시):

```
class DasController { dir = 0; dasTimer = 0; arrAcc = 0;
  update(dt, held: -1|0|1 /* 최근 누른 방향 */): TetrisAction[]
    newDir = held
    if newDir !== dir: dir = newDir; dasTimer = 0; arrAcc = 0; return dir ? [move(dir)] : []   // 방향 전환·첫 입력은 즉시 1회, DAS 재시작
    if dir === 0: return []
    before = dasTimer; dasTimer += dt
    if dasTimer < DAS: return []
    if before < DAS: arrAcc = (dasTimer - DAS) + ARR        // DAS 완충 순간 즉시 1회
    else: arrAcc += dt
    if ARR === 0: return [move(dir)] × COLS                 // 로직이 벽에서 멈춤
    out = []; while arrAcc >= ARR: out.push(move(dir)); arrAcc -= ARR; return out
}
```

DAS 충전은 라인 클리어 애니메이션과 스폰을 가로질러 유지. 회전/홀드/하드드롭은 `takePress`에만 반응(IRS/IHS 없음).

### C.6 라인 클리어, 점수, 레벨, T-spin

```
lock(s):
  write 4 cells (value = type+1); s.stats.pieces++
  if all cells y < HIDDEN_ROWS: gameover('lockout'); return
  full = 피스가 차지한 행(최대 4) 중 가득 찬 행 (오름차순)
  tspin = detectTSpin(s)      // v1: 'none'
  if full.length === 0: s.combo = -1; spawnNext(s); return    // b2b는 유지
  points = scoreClear(s, full.length, tspin); s.score += points; s.lines += full.length
  newLevel = s.startLevel + floor(s.lines / 10); if newLevel > s.level: s.level = newLevel; emit levelup
  s.phase = 'clearing'; s.clearRows = full; s.clearTimer = 0; emit clear
step 'clearing': s.clearTimer += dt; if >= CLEAR_TOTAL_MS(310): collapse(s); spawnNext(s)
collapse: 아래에서 위로 쓰기 포인터로 full이 아닌 행만 복사(Uint8Array.copyWithin), 상단 full.length행 0으로
```

점수표(`scoring.ts`):

| 항목 | 점수 |
|---|---|
| Single / Double / Triple / Tetris | 100 / 300 / 500 / 800 × level |
| Soft drop | 1 / row |
| Hard drop | 2 / row |
| Back-to-Back | 직전 "difficult"(Tetris 또는 T-spin 라인) 클리어에 이어 difficult 클리어 → 라인 점수 `floor(×1.5)` |
| Combo | `50 × combo × level` (combo = 연속 클리어 락 수 − 1, 스폰 시 −1에서 시작, 클리어 없는 락에서 −1로 리셋, combo ≥ 1일 때만 가산) |
| T-spin (추후) | mini 100 / mini single 200 / T-spin 400 / single 800 / double 1200 / triple 1600 × level, B2B 적용 |
| Perfect clear (추후) | single 800 / double 1200 / triple 1800 / tetris 2000 / B2B tetris 3200 × level |

```
scoreClear(s, n, tspin):
  base = BASE[n] * s.level                                // BASE = [0,100,300,500,800]
  difficult = n === 4 || tspin !== 'none'
  if difficult && s.b2b: base = floor(base * 1.5)
  s.b2b = difficult                                       // 일반 클리어는 B2B를 끊음
  s.combo++; bonus = s.combo >= 1 ? 50 * s.combo * s.level : 0
  return base + bonus
```

레벨: `level = startLevel + floor(lines / 10)`. 난이도 옵션 = 시작 레벨 `lv1` / `lv5` / `lv10`.

라인 클리어 애니메이션(`CLEAR_TOTAL_MS = 310`): 0–160 ms 플래시(40 ms마다 흰색 ↔ 원색 토글 4회), 160–310 ms 와이프(30 ms마다 중앙에서 바깥으로 열 `4−k`, `5+k`를 지움, k = 0..4). 종료 후 즉시 collapse + 스폰(ARE = 0). 테트리스일 때는 보드 테두리 2px 흰색 플래시(100 ms) 추가.

T-spin(추후, 3-corner 규칙): T 피스이고 `lastActionRotation`이 true일 때 3×3 박스 네 모서리 `(0,0),(2,0),(0,2),(2,2)` 중 막힌 곳(블록 또는 보드 밖)이 ≥ 3이면 T-spin. "앞쪽" 두 모서리(rot 0: (0,0),(2,0) / R: (2,0),(2,2) / 2: (0,2),(2,2) / L: (0,0),(0,2))가 모두 막히면 full, 아니면 mini. 단 `lastKickIndex === 4`면 항상 full.

### C.7 게임 오버
- Block out: `spawnNext()`에서 스폰 위치 `(3,2)` rot 0의 4셀 중 하나라도 겹침(spawn drop 전에 검사).
- Lock out: 락된 피스의 4셀 전부 `y < HIDDEN_ROWS`.
- 둘 다 `phase = 'gameover'`, `gameover` 이벤트 → 모듈이 `gameover` 효과음 재생, 0.8 s 동안 보드를 위에서 아래로 회색(`--line-0`)으로 덮는 연출 후 `host.finish({ outcome:'lose', score, durationMs, stats:{lines, level, tetrises, maxCombo} })`.

### C.8 조작과 HUD

| 액션 | 키(`KeyboardEvent.code`) | 반응 |
|---|---|---|
| left / right | `ArrowLeft` / `ArrowRight` | DAS/ARR |
| softDrop | `ArrowDown` | 누르는 동안 20× |
| hardDrop | `Space` | takePress |
| rotCW | `ArrowUp`, `KeyX` | takePress |
| rotCCW | `KeyZ`, `ControlLeft` | takePress |
| hold | `KeyC`, `ShiftLeft`, `ShiftRight` | takePress |
| pause | `KeyP`, `Escape` | `host.requestPause()` |
| restart | `KeyR` (gameover 화면에서만) | 새 seed |

HUD(React): 점수 · 레벨 · 라인 · 시간 · 최고 점수 — 값 변경 시에만 `setHUD`. HOLD 박스와 NEXT ×5는 캔버스 안에 그림.

### C.9 렌더링

논리 캔버스 `324 × 340`, `CELL = 16`:

| 영역 | 위치(논리 px) |
|---|---|
| 좌 패널 | x 8–71: "HOLD" 라벨(5×7 글리프) y 8, 홀드 박스 64×48 at (8,20) |
| 보드 프레임 | 외곽 (80,8)–(243,331), 테두리 2px(`--line-0`, 좌상 1px `--line-1`), 셀 원점 (82,10), 160×320 |
| 우 패널 | x 252–315: "NEXT" 라벨 y 8, 프리뷰 박스 64×48 ×5 at y 20/72/124/176/228 (4px 간격) |

배율은 프레임이 정수로 결정(최대 3; 1080p에서는 보통 2).

블록 타일 16×16 3톤 베벨: 전체 `base` → 상·좌 2px `light` → 하·우 2px `dark`. 색은 00-plan.md 부록 B(팔레트 7색 기반).

- 보드 배경 `--bg-0`, 셀 경계 1px 격자 `--bg-1`. 숨김 행은 그리지 않으며 활성 피스/고스트 셀 중 `y < 4`인 셀은 스킵.
- 고스트: 셀마다 1px 테두리를 `base` 색 alpha 0.6으로, 채움 없음. 활성 피스와 겹치면 활성 피스가 위.
- 라인 클리어: C.6 타이밍대로 흰색(`--white`) 채움 ↔ 원색 토글, 와이프 단계는 지운 열을 배경색으로.
- 레벨 업: 보드 테두리를 `--white`로 2프레임 켜고 2프레임 끄기 ×2 + `levelup` 효과음; HUD `level` 강조 1초.
- 프리뷰/홀드: 같은 16px 타일을 박스 중앙 정렬. 홀드 불가 상태(`holdUsed`)면 홀드 박스 타일을 50% 알파.
- 모든 타일 변형(7색 × normal/ghost/dim + white)은 오프스크린에 1회 프리렌더 후 `drawImage`.

### C.10 마스코트 훅 (의미 이벤트로 변환)

| 상황 | MascotEvent | line | 규칙 |
|---|---|---|---|
| single/double | game.good | "좋아!" / "깔끔!" | 4s 쿨다운 |
| triple | game.great | – | |
| tetris | game.great | "테트리스!" | 2s 쿨다운 |
| B2B tetris | game.great | "연속 테트리스!" | |
| combo ≥ 3 | game.good | "3 콤보!" (숫자 치환) | 3s 쿨다운 |
| level up | game.good | "레벨 5!" | |
| 스택 높이 ≥ 14 (`stackHeight = 24 − minFilledY`) | game.risky | "위험해…!" | 히스테리시스: ≤ 10으로 내려가면 game.safe, 그 뒤에만 재발동 |
| 방치 10 s (falling, level ≤ 5, 입력 없음) | game.think | "어디에 놓을까…" | 15s 쿨다운 |
| 최고 점수 갱신(게임 중 처음 넘는 순간) | game.record | "신기록!" | 게임당 1회 |
| game over | game.fail | "으으… 다음엔 꼭!" | sticky |

### C.11 엣지 케이스
- 스폰 겹침(block out) vs 숨김 행 전체 락(lock out) 구분; 스폰 drop이 막혀도 게임 오버 아님.
- 벽/바닥에서의 회전: I 수직→수평 좌측 벽(킥 +2), 바닥에서 위로 올리는 킥, 5개 모두 실패 시 무변화·무리셋.
- `y < 0`로 나가는 킥은 충돌 처리(숨김 행 4개로 정상 범위는 수용).
- 홀드: 락 딜레이 중 허용(락 상태 초기화), 2회째 거부, 홀드로 나온 피스는 `holdUsed` 유지, 라인 클리어 애니메이션 중 입력은 무시(DAS 충전만 유지).
- 좌·우 동시 입력: 최근 누른 키 우선, 떼면 남은 키로 DAS 재시작.
- 한 스텝에 여러 행 낙하(고레벨)·20G: 스폰 즉시 바닥, 락 딜레이는 여전히 적용, 소프트 드롭 점수는 실제 이동 행만.
- 그라운드 상태에서 이동해 공중이 되면 lockTimer 0, 다시 착지 시 타이머 재시작(리셋 카운터는 유지, 새 최저 행이면 0).
- 하드 드롭 직후 같은 스텝의 나머지 액션 무시(`phase` 확인).
- 라인 클리어 + 레벨 업 동시: 다음 스폰부터 새 중력.
- 숨김 행에서 완성된 행도 라인으로 인정(lock out가 먼저 검사되므로 전부 숨김인 피스는 제외).
- B2B는 클리어 없는 락으로 끊기지 않고 일반 클리어로만 끊김; 콤보는 클리어 없는 락에서 끊김.
- pause 중 키 상태: resume 시 `releaseAll()` 후 새로 읽음(DAS 재충전).
- 점수 표시 `toLocaleString('ko-KR')`.
- `destroy()` 중 애니메이션/RAF 취소, 리스너 해제.
- 재시작: 새 seed, bag/queue/hold 초기화, 설정(DAS/ARR) 재로드.

### C.12 Vitest 테스트 목록

`pieces`/`srs.test.ts`
1. 모든 (type, rot)에 셀 4개, 중복 없음, 박스 범위 내.
2. CW 4회 = 원형, CW 후 CCW = 원형(O 제외 무변화 확인).
3. 킥 테이블: 전이 8개 × 5테스트, test1 = (0,0), JLSTZ/I 각각 wiki 표의 y 반전과 일치(테스트 파일에 wiki 표 원본 포함).
4. 시나리오: I 수직(R) 좌측 벽 x=−2 위치에서 R→0 → test2 (+2,0) 적용 성공; T 바닥에서 0→R 킥 test3 (−1,−1); 모든 킥 실패 시 false 및 상태 불변; `lastKickIndex` 기록.

`logic.test.ts`
5. 7-bag: 연속 70개에서 7개 단위마다 각 타입 1회, seed 동일 → 순서 동일.
6. 큐 길이 항상 ≥ 5, `takeNext` 후 보충.
7. 스폰 위치 (3,2) + spawn drop → y 3; 막히면 y 2; block out 판정.
8. 홀드: 첫 홀드 → 큐에서 스폰, 교환, 2회 거부(`deny` 이벤트), 락 후 해제, 홀드 피스 rot 0.
9. 고스트 Y: 빈 보드 I rot0 → ghostY = 22(셀 행 23), 장애물 위 멈춤.
10. 중력 표: `secondsPerRow(1) = 1`, `secondsPerRow(10) ≈ 0.0642`(±1e-3), 20 이상 클램프; 1000 ms 누적 시 레벨 1 피스 1행 낙하.
11. 소프트 드롭: 20배, 행당 1점. 하드 드롭: 고스트 위치 락, `2×rows` 점수, 즉시 락.
12. 락 딜레이: 착지 500 ms 후 락, 이동으로 리셋, 15회 초과 시 리셋 안 됨, 새 최저 행에서 카운터 0, 턱에서 떨어지면 타이머 0.
13. 라인 감지/collapse: single/double/triple/tetris 픽스처, 비연속 2행 클리어, 위 행 정확히 내려옴.
14. 점수: single lv1 = 100, tetris lv2 = 1600, B2B tetris lv1 = 1200, tetris → single → tetris는 B2B 없음, combo 3연속 lv1 = +50, +100, 클리어 없는 락 후 combo 리셋.
15. 레벨: 10라인 → 2, startLevel 5 + 10라인 → 6, `levelup` 이벤트 1회.
16. lock out: 전부 숨김 행에 락 → gameover('lockout'); 일부만 숨김 → 계속.
17. 애니메이션 단계: clearing 310 ms 동안 액션 무시, 종료 후 스폰.
18. 결정성: seed + 입력 스크립트(스텝별 `TetrisInputFrame`) → 최종 board/score 스냅샷 일치.

`das.test.ts`
19. t=0 press → 즉시 1회, 167 ms 전까지 0회, 167 ms에 1회, 이후 33 ms마다 1회(16.667 ms 스텝에서 누적 정확성), 방향 전환 즉시 1회 + 재충전, 양키 동시 → 최근 키, 떼면 남은 키로 재시작, ARR 0 → COLS회.

### C.13 성능 노트
- 고정 스텝 `1000/60`, update는 순수 연산만. 렌더는 `dirty` 플래그 선 프레임에만 전체 재그리기(≈ 200 셀 + 패널 blit, 1 ms 미만).
- 핫 루프 무할당: 피스 정의 `Int8Array`, `fits()`는 인덱스 산술만, `full` 행 버퍼 `Int8Array(4)` 재사용, 이벤트 배열 `out` 재사용, 고스트는 변화 시에만 재계산.
- 문자열 생성은 HUD 값 변경 시에만(`setHUD` 호출도 그때만).
- 타일은 오프스크린 프리렌더 + 정수 좌표 `drawImage`; `imageSmoothingEnabled = false`, 정수 배율.
- 지뢰찾기도 동일: 변경 시 전체 재그리기(480 blit), 부분 갱신 로직 불필요.
