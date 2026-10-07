# 01 · 애플리케이션 골격 설계 (React 19 + Vite + TS)

> 설계 단계(2026-10-07) 참고 문서. 최종 결정·단계 계획은 `docs/00-plan.md`가 우선한다. 이 문서는 앱 스캐폴드, 상태/화면 구조, React ↔ 명령형 게임 모듈 경계, 입력/루프/오디오 서비스, 테스트의 상세 근거를 담는다.

확인된 사실(설계에 직접 반영):
- `create-vite@9.2.1`의 `react-ts` 템플릿: `typescript ~6.0.2`, `vite ^8.3`, `@vitejs/plugin-react ^6.1`, React 19, 린터는 **oxlint**(`.oxlintrc.json`), 스크립트 `dev/build(tsc -b && vite build)/lint(oxlint)/preview`. tsconfig는 `tsconfig.json`(references) + `tsconfig.app.json` + `tsconfig.node.json` 구조이며 `erasableSyntaxOnly`, `verbatimModuleSyntax`가 켜져 있음.
- `typescript@7.0.2`는 네이티브(Go) 컴파일러로 `bin`에 `tsc`만 있고 `tsserver`가 없음 → 에디터 연동/옵션 호환 리스크. 설치하지 않는다.
- `vitest@5`: Node ≥22.12, Vite ≥6.4 요구, 리포트가 `.vitest/`로 감.
- `galmuri@2.40`: `dist/galmuri.css`에 9개 `@font-face`가 모두 `font-display: swap`으로 선언, woff2 우선.
- `zustand@5`, `prettier@3`. 포매터는 Prettier(oxfmt는 아직 비안정).

## 1. 스캐폴드

### 1.1 템플릿 기본값 — 유지/삭제

| 항목 | 결정 |
|---|---|
| `src/main.tsx`의 `<StrictMode>` | **유지**. 게임 인스턴스의 이중 마운트 버그를 개발 중 즉시 드러내는 안전장치 |
| `src/App.css`, `src/assets/*`, `public/icons.svg` | 삭제 |
| `src/index.css` | 삭제 → `src/ui/styles/*.css`로 대체 |
| `index.html` | `lang="ko"`, `<title>`, `<meta name="color-scheme" content="dark">` |
| `.oxlintrc.json` | 유지 + `games/**`에서 React import 금지 override |
| `tsconfig.*.json` | 유지하고 `strict`, `noImplicitOverride`, `paths` 추가 |
| `README.md` | 마지막 단계에서 재작성 |

### 1.2 tsconfig 메모
- `paths: { "@/*": ["./src/*"] }`는 `baseUrl` 없이 사용(TS 6 deprecated / TS 7 제거 대상 옵션 회피).
- `noUncheckedIndexedAccess`는 끔: 보드 배열 접근이 매우 많아 노이즈 과다. 경계 검사는 logic의 `inBounds()`로 통일.
- `erasableSyntaxOnly: true` → `enum`, `namespace`, 생성자 파라미터 프로퍼티 금지. 게임 로직에서는 `as const` 유니온을 쓴다.
- `include: ["src"]` → `*.test.ts`도 `tsc -b`에서 타입검사됨(의도).

### 1.3 Vite 8 / TS 6 호환성
- Vite 8(Rolldown 기반): `@vitejs/plugin-react@6`는 Babel 대신 Oxc 변환 → Babel 플러그인(React Compiler 등)은 쓰지 않는다. 청크 분할 설정 불필요.
- TS 폴백: TS 6에서 타입 패키지 호환 문제가 생기면 `npm i -D typescript@~5.9.3` — 이 설계의 모든 옵션은 5.8+에 존재.

## 2. 폴더 구조 (00-plan.md §1.1이 최신)

컴포넌트 스타일은 **CSS Modules**(`*.module.css`), 토큰은 전역 CSS 커스텀 프로퍼티. Tailwind 등은 추가하지 않는다(픽셀 UI는 손으로 쓴 CSS가 더 짧고, 토큰 소유권이 디자인 시스템 쪽에 있음).

## 3. 라우터 대신 화면 상태 머신

### 3.1 `Screen` 유니온 (`app/screen.ts`)

```ts
export type Screen =
  | { kind: 'boot' }
  | { kind: 'title' }
  | { kind: 'select' }
  | { kind: 'lobby' }
  | { kind: 'game'; gameId: string; difficulty: string }
  | { kind: 'records'; gameId?: string }
  | { kind: 'settings'; from: 'title' | 'lobby' }
  | { kind: 'dev'; page: 'gallery' }          // import.meta.env.DEV 에서만 도달 가능

export const screenKey = (s: Screen) =>
  s.kind === 'game' ? `game:${s.gameId}:${s.difficulty}` : s.kind

// Esc/뒤로가기 목적지 표. 게임 화면은 여기 없음 (게임은 Pause 오버레이가 처리)
export const parentOf = (s: Screen): Screen => {
  switch (s.kind) {
    case 'select':   return { kind: 'title' }
    case 'lobby':    return { kind: 'select' }
    case 'records':  return { kind: 'lobby' }
    case 'settings': return { kind: s.from }
    default:         return { kind: 'title' }
  }
}
```

`screen`은 스토어에 있지만 **영속하지 않는다**(새로고침하면 항상 타이틀 — 콘솔 게임기 느낌 유지, 게임 중 상태 복원 문제 회피).

### 3.2 `<ScreenRouter>` + 스텝 페이드 커튼

두 화면을 동시에 렌더링하는 크로스페이드 대신 **커튼 방식**: 커튼이 화면을 덮은 순간 화면을 교체하고 다시 걷는다. (1) 이전 화면이 완전히 가려진 상태에서 언마운트되므로 `GameScreen`의 `destroy()`가 눈에 띄지 않고, (2) 화면 컴포넌트가 전환 상태를 전혀 몰라도 된다.

```tsx
export function ScreenRouter() {
  const target = useStore((s) => s.screen)
  const [shown, setShown] = useState(target)
  const [phase, setPhase] = useState<'idle' | 'closing' | 'opening'>('idle')

  const targetKey = screenKey(target), shownKey = screenKey(shown)
  useEffect(() => {
    if (phase === 'idle' && targetKey !== shownKey) setPhase('closing')
  }, [phase, targetKey, shownKey])

  const onCurtainEnd = () => {
    if (phase === 'closing') { setShown(useStore.getState().screen); setPhase('opening') } // 최신 목적지로 교체
    else if (phase === 'opening') setPhase('idle')
  }

  return (
    <>
      <ScreenView key={shownKey} screen={shown} />
      <Curtain phase={phase} onEnd={onCurtainEnd} />
    </>
  )
}
```

커튼 CSS 핵심:

```css
.curtain { position: fixed; inset: 0; background: var(--ink); opacity: 0; pointer-events: none; }
.closing { animation: curtainClose 180ms steps(4, end) forwards; pointer-events: auto; } /* 전환 중 클릭 차단 */
.opening { animation: curtainOpen  180ms steps(4, end) forwards; }
@keyframes curtainClose { from { opacity: 0 } to { opacity: 1 } }
@keyframes curtainOpen  { from { opacity: 1 } to { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .closing, .opening { animation-duration: 1ms; } } /* none이 아니라 1ms — animationend가 반드시 발생해야 함 */
```

`<Curtain>`은 `onAnimationEnd` 외에 **400ms setTimeout 폴백**으로 `onEnd`를 보장한다(탭이 숨겨진 상태에서는 애니메이션 이벤트가 지연될 수 있음). 전환 중 `navigate()`가 여러 번 호출되어도 `closing` 종료 시점의 최신 `screen`으로 한 번만 교체된다. `wipe` 변형은 `clip-path: inset(0 100% 0 0) → inset(0)` 240ms `steps(8)`.

### 3.3 `location.hash` 동기화 — v1에서는 하지 않음
딥링크는 "항상 타이틀에서 시작" 원칙과 충돌하고, 브라우저 뒤로가기로 플레이 중 게임을 이탈하는 엣지 케이스를 추가로 다뤄야 한다. 나중에 `useStore.subscribe(screen → hash)` + `hashchange → navigate` 10여 줄로 확장 가능. 유일한 예외는 DEV 빌드에서 `#dev`로 갤러리 화면에 바로 들어가는 것(`app/dev.ts`가 부팅 시 1회 읽음).

## 4. 상태 관리

### 4.1 선택: Zustand 5 + `persist`

| 후보 | 평가 |
|---|---|
| **Zustand + persist** (채택) | ~1KB. 셀렉터로 부분 구독 → HUD만 리렌더. `useStore.getState()`로 **React 밖(오디오/입력 서비스, 게임 호스트)에서 읽기/쓰기 가능**. `persist`가 `version`/`migrate`/`partialize`를 내장 |
| `useSyncExternalStore` 수제 스토어 | persist/migrate/shallow 비교를 재구현하게 됨 |
| Context + useReducer | React 밖에서 접근 불가, Context 변경 시 하위 전체 리렌더 |

### 4.2 스토어 형태 (`app/store.ts`)

```ts
export interface Settings {
  sound: boolean; volume: number /* 0..1 */; crt: boolean
  uiScale: 'auto' | 2 | 3; chatter: 'quiet' | 'normal' | 'chatty'
  reducedMotion: 'system' | 'on'; tetris: { das: number; arr: number }
}
export interface RecordEntry {
  best: { value: number; characterId: string; date: string } | null
  plays: number; wins: number
  lastScore: number | null; lastPlayedAt: number
  history: { score: number; outcome: GameResult['outcome']; characterId: string; at: number }[]  // 최근 10개
}
export type GameRecords = Record<string /* difficulty */, RecordEntry>

interface PersistedState {
  selectedCharacterId: string | null
  settings: Settings
  records: Record<string /* gameId */, GameRecords>
}
export interface AppState extends PersistedState {
  screen: Screen                                     // 비영속
  navigate(to: Screen): void
  back(): void
  selectCharacter(id: string): void
  updateSettings(patch: Partial<Settings>): void
  saveResult(gameId: string, difficulty: string, characterId: string, result: GameResult, scoring: ScoringSpec): RecordEntry
  resetRecords(gameId?: string): void
}

export const useStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({ /* ... */ }),
      {
        name: PERSIST_KEY,            // 'minigames.store'
        version: PERSIST_VERSION,     // 1
        storage: createJSONStorage(() => safeStorage),
        partialize: (s) => ({ selectedCharacterId: s.selectedCharacterId, settings: s.settings, records: s.records }),
        migrate: migratePersisted,    // (state, fromVersion) => PersistedState
      },
    ),
  ),
)
```

`app/persist.ts`:
- `PERSIST_KEY = 'minigames.store'`, `PERSIST_VERSION = 1`. 완전히 호환 불가능한 변경이 생기면 키 자체를 올리고 구 키는 `migrate`에서 1회 읽어 흡수한 뒤 삭제.
- `migratePersisted(state, from)`: `switch (from) { case 0: ... }` 폴스루 사다리. 알 수 없는 형태면 기본값 반환(절대 throw하지 않음).
- `safeStorage`: `localStorage`의 `getItem/setItem/removeItem`을 try/catch로 감싼 `StateStorage`. 프라이빗 모드/쿼터 초과에서 `setItem`이 throw해도 게임은 계속된다.

`subscribeWithSelector`는 서비스가 설정 변경을 구독하기 위해 필요: `useStore.subscribe((s) => s.settings, audio.applySettings, { fireImmediately: true })`.

### 4.3 비영속 인게임 세션 (`app/session.ts`)

HUD/기분/대사/상태는 초당 수십 번 바뀔 수 있고 새로고침 후 남을 이유가 없으므로 **별도의 Zustand 스토어**(persist 없음). `GameScreen` 마운트 시 `reset()`.

```ts
export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished'
interface SessionState {
  status: SessionStatus
  hud: Record<string, string | number>
  mood: Mood
  line: string | null
  result: (GameResult & { id: string }) | null
  reset(hud: Record<string, string | number>): void
  patchHud(patch: Record<string, string | number>): void
  setMascot(mood: Mood, line: string | null): void
  setStatus(s: SessionStatus): void
  finish(result: GameResult & { id: string }): void
}
```

`Hud`는 `useSession((s) => s.hud)`, `MascotPanel`은 `mood/line`만 구독하므로 캔버스 컨테이너는 리렌더되지 않는다.

## 5. React ↔ 명령형 게임 모듈 경계

### 5.1 계약 — `games/types.ts` (00-plan.md §1.4가 최신)

설계 원칙:
1. **`logic.ts`는 호스트를 모른다.** 순수 함수가 `{ state, events }`를 돌려주고, `index.ts`가 이벤트를 `host.audio.play` / `host.mascot.react`로 매핑한다. 테스트는 이벤트 배열만 검사.
2. **호스트 콜백은 모두 세션 스토어로 흘러간다.** 게임 모듈은 React를 import하지 않는다(oxlint `no-restricted-imports`).

### 5.2 `games/host.ts` — `createHost()`
- `alive` 플래그: `dispose()` 후 들어오는 `setHUD/react/finish`는 무시(StrictMode 1차 인스턴스의 늦은 콜백, 파괴 후 타이머 등).
- `setHUD`는 rAF 한 프레임 단위로 **코얼레싱**.
- `mascot`은 `app/mascot.ts`의 MascotReactor에 위임.
- `finish(result)`: `result.id = crypto.randomUUID()` 부여 후 `useSession.finish()`. 호스트는 기록을 저장하지 않는다 — 저장은 `GameScreen`이 한다.

### 5.3 `<GameScreen>` 스켈레톤

```tsx
export function GameScreen({ gameId, difficulty }: { gameId: string; difficulty: string }) {
  const game = getGame(gameId)
  const character = useStore((s) => getCharacter(s.selectedCharacterId))
  const navigate = useStore((s) => s.navigate)
  const status = useSession((s) => s.status)
  const [runId, setRunId] = useState(0)                 // 재시작 = runId 증가 → 효과 재실행으로 완전 재생성
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<GameInstance | null>(null)

  // 인스턴스 수명 = 이 효과의 수명. StrictMode(mount→cleanup→mount)에서도 매 실행마다 새로 만들고 완전히 파괴하므로 안전.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { host, dispose } = createHost({ game, character, difficulty })
    const instance = game.create(host)
    instanceRef.current = instance
    useSession.getState().reset(initialHud(game))
    instance.mount(el)
    input.setScope('game')
    el.focus({ preventScroll: true })
    instance.start()
    useSession.getState().setStatus('running')
    return () => {
      instanceRef.current = null
      instance.destroy()
      dispose()
      input.setScope('ui')
    }
  }, [game, character, difficulty, runId])

  const pause = useCallback(() => {
    if (useSession.getState().status !== 'running') return
    instanceRef.current?.pause()
    useSession.getState().setStatus('paused')
    input.setScope('overlay')
  }, [])
  const resume = useCallback(() => {
    if (useSession.getState().status !== 'paused') return
    instanceRef.current?.resume()
    useSession.getState().setStatus('running')
    input.setScope('game')
    containerRef.current?.focus({ preventScroll: true })
  }, [])

  // Esc / P : 게임·오버레이 스코프 모두에서 토글
  useEffect(() => input.on('pause', () =>
    useSession.getState().status === 'running' ? pause() : resume(), { scope: ['game', 'overlay'] }),
  [pause, resume])

  // 탭 숨김 / 창 포커스 상실 → 일시정지
  useEffect(() => {
    const onHide = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', pause)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('blur', pause) }
  }, [pause])

  // 종료 → 기록 저장 (result.id로 중복 저장 방지)
  const savedRef = useRef<string | null>(null)
  useEffect(() => {
    const result = useSession.getState().result
    if (status !== 'finished' || !result || savedRef.current === result.id) return
    savedRef.current = result.id
    useStore.getState().saveResult(gameId, difficulty, character.id, result, game.scoring)
    input.setScope('overlay')
  }, [status, gameId, difficulty, game, character])

  return (
    <div className={styles.screen}>
      <Hud items={game.hud} onPause={pause} />
      <BoardMount ref={containerRef} />                       {/* memo: 절대 리렌더되지 않음 */}
      <MascotPanel character={character} />
      {status === 'paused' && <PauseOverlay onResume={resume} onRestart={() => setRunId((n) => n + 1)} onQuit={() => navigate({ kind: 'lobby' })} />}
      {status === 'finished' && <ResultOverlay game={game} difficulty={difficulty} onRetry={() => setRunId((n) => n + 1)} onQuit={() => navigate({ kind: 'lobby' })} />}
    </div>
  )
}

// React 19: ref는 일반 prop. props가 바뀌지 않으므로 memo로 리렌더 차단.
const BoardMount = memo(function BoardMount({ ref }: { ref: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={styles.board} tabIndex={0} aria-label="게임 보드" />
})
```

StrictMode 안전성의 핵심은 **인스턴스를 render나 `useRef` 초기화가 아닌 `useEffect` 안에서 만들고, cleanup에서 완전히 파괴**하는 것. `mount/destroy`는 멱등으로 구현(`state` 체크)하고, `destroy()`는 루프 정지 → 리스너 해제 → `container.replaceChildren()` 순.

### 5.4 `GameInstance` 내부 표준 구조 (`games/<id>/index.ts`)

```ts
create(host) {
  let state = createInitialState(...)          // logic.ts
  let canvas: HTMLCanvasElement | null = null
  const loop = createLoop({
    update(dt) { const r = tick(state, dt); state = r.state; dispatch(r.events) },   // logic 순수 호출
    render()   { if (dirty) { draw(ctx, state, view); dirty = false } },
  })
  const dispatch = (events: LogicEvent[]) => { for (const e of events) { /* → host.audio.play / host.mascot.react / host.setHUD / host.finish */ } }
  return {
    mount(el) { canvas = createCanvas(...); el.append(canvas); attachInput(...) },
    start()   { loop.start() },  pause() { loop.pause() },  resume() { loop.resume() },
    destroy() { loop.stop(); detachInput(); canvas?.remove() },
    get state() { ... },
  }
}
```

## 6. 키보드 입력 서비스 (`app/input/`)

```ts
export type Action =
  | 'left' | 'right' | 'up' | 'down'
  | 'rotateCw' | 'rotateCcw' | 'hardDrop' | 'hold'
  | 'confirm' | 'back' | 'pause' | 'restart'
export type InputScope = 'ui' | 'game' | 'overlay'

// e.code(물리 키) 기준. 한국어 IME가 켜져 있으면 e.key가 'Process'로 바뀌므로 e.key를 쓰면 안 됨.
export const defaultBindings: Record<Action, string[]> = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  rotateCw: ['ArrowUp', 'KeyX'], rotateCcw: ['KeyZ', 'ControlLeft'], hardDrop: ['Space'], hold: ['KeyC', 'ShiftLeft'],
  confirm: ['Enter', 'Space'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'], restart: ['KeyR'],
}
const PREVENT_IN_GAME = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])
```

`InputService` 싱글톤(`export const input = new InputService()`):
- `install()`: `window`에 `keydown/keyup`, `blur`(→ `releaseAll()`: 키 고착 방지). `main.tsx`에서 1회.
- 편집 가능한 타깃(`input/textarea/contenteditable`)에서 온 이벤트는 무시.
- `preventDefault`: `scope !== 'ui'`이고 `PREVENT_IN_GAME`에 든 코드일 때만. UI 스코프에서는 건드리지 않아 React 버튼의 Space/Enter 활성화가 정상 동작.
- `e.repeat`인 keydown은 무시(OS 키 반복 제거 — DAS/ARR은 게임이 직접 계산).
- **폴링 API**(게임 루프용, `scope === 'game'`일 때만 true 반환): `isDown(action)`, `takePress(action)`(마지막 호출 이후 새로 눌렸으면 true, 소비됨), `heldMs(action, now?)`, `lastPressed(a, b)`(두 액션 중 나중에 눌린 쪽).
- **이벤트 API**(UI/오버레이용): `on(action, cb, { scope })` → 해제 함수 반환. 등록된 스코프에서만 발화.
- `setScope(s)`: 전환 시 `releaseAll()`.

포커스 정책:
- 게임 보드 컨테이너는 `tabIndex={0}`, 진입/재개 시 `focus({ preventScroll: true })`. 서비스는 `window`에서 듣기 때문에 포커스 자체는 입력 수신에 필요 없고, **React 버튼이 Space/Enter를 가로채지 못하게 하는 것**이 목적.
- 게임 중 HUD의 버튼은 `tabIndex={-1}` + `onMouseDown={(e) => e.preventDefault()}`(포커스 탈취 방지).

DAS/ARR 훅: `tetris/input.ts`가 매 `update(dt)`마다
```
dir = input.lastPressed('left','right'); held = input.heldMs(dir)
if (input.takePress(dir)) move(dir); dasTimer = 0
else if (held !== null && held >= DAS) { arrAcc += dt; while (arrAcc >= ARR) { move(dir); arrAcc -= ARR } }   // ARR === 0 → 벽까지 즉시
```

## 7. 게임 루프 (`app/loop.ts`)

```ts
export interface LoopOptions {
  update(dtMs: number): void       // 고정 스텝으로 0~N회 호출
  render(alpha: number): void      // rAF당 1회, alpha = 누산 잔여/step
  stepMs?: number                  // 기본 1000/60
  maxFrameMs?: number              // 기본 250 — 탭 복귀/디버거 정지 후 폭주(spiral of death) 방지
  raf?: (cb: FrameRequestCallback) => number   // 테스트 주입용
  caf?: (id: number) => void
}
export interface Loop { start(): void; stop(): void; pause(): void; resume(): void; readonly running: boolean }

export function createLoop(o: LoopOptions): Loop {
  const step = o.stepMs ?? 1000 / 60, maxFrame = o.maxFrameMs ?? 250
  const raf = o.raf ?? requestAnimationFrame, caf = o.caf ?? cancelAnimationFrame
  let id = 0, last = 0, acc = 0, running = false
  const frame = (t: number) => {
    if (!running) return
    acc += Math.min(t - last, maxFrame); last = t
    while (acc >= step) { o.update(step); acc -= step }
    o.render(acc / step)
    id = raf(frame)
  }
  const start = () => { if (running) return; running = true; last = performance.now(); acc = 0; id = raf(frame) }
  const stop = () => { running = false; caf(id) }
  return { start, stop, pause: stop, resume: start, get running() { return running } }
}
```

- `pause/resume`는 `stop/start`의 별칭이지만 의미를 구분(resume 시 `last`를 리셋하므로 멈춘 시간이 dt로 유입되지 않음).
- 지뢰찾기는 이벤트 구동이지만 타이머 때문에 같은 루프를 쓰고 `render`는 `dirty` 플래그가 있을 때만 그린다.
- 테스트: `raf`를 수동 호출 큐로 주입해 "33ms 프레임 → update 2회, 잔여 보존", "1000ms 프레임 → 250ms로 클램프" 검증.

## 8. 오디오 서비스 (`app/audio/`)

- `AudioService` 싱글톤. `AudioContext`는 첫 제스처(`pointerdown`/`keydown`, `once`)에서 생성+`resume()`. 생성 전 `play()`는 조용히 무시.
- 그래프: 각 음 → `GainNode`(엔벨로프) → `master: GainNode` → `destination`. `master.gain = settings.sound ? settings.volume : 0`.
- 설정 반영: `main.tsx`에서 `useStore.subscribe((s) => s.settings, (st) => audio.applySettings(st), { fireImmediately: true })`.
- 동시 발음 상한 8. 같은 이름 SFX가 같은 프레임에 중복 요청되면 1회만.
- 레시피 데이터(`sfx.ts`)는 00-plan.md 부록 C. `synth.ts`: `steps`를 `ctx.currentTime` 기준으로 `frequency.setValueAtTime`(또는 `slide`면 `exponentialRampToValueAtTime`)으로 스케줄, 게인은 짧은 어택 + 선형 릴리즈. `noise`는 1초짜리 백색소음 `AudioBuffer`를 1회 생성해 재사용하고 `BiquadFilter`(lowpass)로 질감.
- React에서의 호출: **직접 import**(`import { audio } from '@/app/audio/audio'`). `PixelButton`이 hover→select, activate→confirm을 자동 재생. `useSfx()` 훅은 만들지 않는다.
- 자동재생 정책: 타이틀의 PRESS START 입력이 첫 제스처가 되므로, 언락 핸들러에서 `ctx.resume()` 직후 같은 틱에 `play`를 허용하도록 `unlock()`이 동기적으로 컨텍스트를 만든다.

## 9. `<PixelSprite>`와 액센트 색 전파

```tsx
interface Props { clip: Clip; scaleU?: 1 | 2 | 3; animate?: boolean; frame?: number; className?: string }

export function PixelSprite({ clip, scaleU = 2, animate = false, frame = 0, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const metrics = useMetrics()              // { u, uDevice, dpr }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const scale = scaleU * metrics.uDevice  // 디바이스 px 정수 배율
    const ctx = canvas.getContext('2d')!
    canvas.width = clip.frames[0].w * scale; canvas.height = clip.frames[0].h * scale
    ctx.imageSmoothingEnabled = false
    let i = frame
    const draw = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(rasterize(clip.frames[i], scale), 0, 0) }
    draw()
    if (!animate || clip.frames.length < 2) return
    return ticker.subscribe(clip.fps, () => { i = (i + 1) % clip.frames.length; draw() })
  }, [clip, scaleU, animate, frame, metrics])
  return <canvas ref={ref} className={className} style={{ width: clip.frames[0].w * scaleU * metrics.u, height: clip.frames[0].h * scaleU * metrics.u }} aria-hidden />
}
```

- `<canvas>` 엘리먼트는 컴포넌트 수명 동안 하나. `mood`가 바뀌면 `clip` prop만 바뀌고 효과가 다시 그린다(캐시 히트). 캔버스 재생성 없음.
- 액센트: `app/theme.ts`의 `applyCharacterTheme()`가 `document.documentElement`에 `--accent/--accent-dark/--accent-light`와 `data-char`를 주입. 포털 없이 `.app` 안에 렌더링하므로 변수를 상속. `types/css.d.ts`에 `declare module 'react' { interface CSSProperties { [key: \`--${string}\`]: string | number | undefined } }`.

## 10. 테스트 & 품질

- Vitest 5, `environment: 'node'`. 로직 테스트는 DOM이 없어야 통과하도록 `logic.ts`가 `window/document/canvas`를 import하지 않게 강제.
- 테스트 파일은 **동일 디렉터리 colocate**. `import { describe, it, expect } from 'vitest'` 명시(globals 끔).
- 결정적 RNG(`lib/rng.ts`)를 로직에 주입해 보드 생성·7-bag을 고정값으로 검증.
- jsdom/React Testing Library: **지금은 추가하지 않음**. 추후 필요 시 `test.projects`로 `jsdom` 프로젝트를 `*.test.tsx`에만 추가.

## 11. 리스크 & 함정

1. **StrictMode 이중 효과**: 인스턴스를 `useEffect` 밖(render/`useRef(createInstance())`/`useState(() => …)`)에서 만들면 1차 인스턴스가 파괴되지 않고 캔버스가 두 개 붙는다. 반드시 효과 안에서 생성, cleanup에서 파괴.
2. **캔버스 DPR/선명도**: Windows 125%/150% 배율. `dpr=1.25`에서 CSS 배율 `s`가 정수여도 디바이스 픽셀은 `1.25s`라 줄무늬가 생긴다. 디바이스 픽셀 정수 배율 원칙(02-design-system.md A3/B4).
3. **키보드 포커스/IME**: `e.key`는 한국어 IME 활성 시 `'Process'`가 되므로 반드시 `e.code`. 버튼이 포커스를 가지면 Space가 버튼을 누르므로 HUD 버튼은 `tabIndex=-1` + mousedown preventDefault. 창 `blur`에서 `releaseAll()`.
4. **localStorage**: 쿼터 초과/프라이빗 모드에서 `setItem`이 throw → `safeStorage`로 흡수. JSON 손상은 `migrate`가 기본값으로 복구. `screen`은 영속 금지.
5. **Vite base 경로**: 서브경로 배포를 위해 `base: './'`. `public/` 자산은 `import.meta.env.BASE_URL`로 참조.
6. **한글 픽셀 폰트 FOUT**: galmuri CSS는 `font-display: swap` → 부트 화면에서 `document.fonts.load()` + `fonts.ready`(최대 2초)를 기다린 뒤 타이틀. 패키지 CSS를 `main.tsx`에서 import해 Vite가 woff2를 번들/해시하게 둔다.
7. **TS 6 `erasableSyntaxOnly`**: `enum` 금지 → `const CellState = { Hidden: 0, … } as const` + `type CellState = (typeof CellState)[keyof typeof CellState]`.
8. **oxlint ≠ ESLint**: 규칙 이름/설정 형식이 다르다.
9. **rAF와 백그라운드 탭**: 숨김 탭에서는 rAF가 멈춘다. `visibilitychange` 일시정지 + `maxFrameMs` 클램프.
10. **커튼 전환 고착**: `animation: none`이면 `animationend`가 안 와서 `phase`가 멈춘다. reduced-motion은 1ms + setTimeout 폴백.
11. **Windows 줄바꿈/경로**: `.editorconfig`+Prettier `endOfLine: lf`, `core.autocrlf=false`. Vite 별칭은 `fileURLToPath(new URL(...))`.
