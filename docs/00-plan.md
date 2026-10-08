# mini_game_project — 도트 미니게임 모음 개발 계획

## Context (왜 만드는가)

- 빈 디렉터리 `C:\Users\jcsuh\Desktop\project\test\game_project\mine` 에 "미니게임 천국" 스타일의 미니게임 모음 웹앱을 새로 만든다. (작업 제목 "도트 아케이드" — 상수 1개라 언제든 변경 가능)
- 1차 게임: 지뢰찾기, 테트리스. 이후 게임을 계속 추가할 수 있어야 한다 → **게임 = 플러그인 모듈** (폴더 추가 + 등록 1줄).
- 컨셉: **아주 귀여운 도트 캐릭터** + 캐릭터 선택 화면. 선택한 캐릭터는 게임 중 보드 옆 **마스코트**로 등장해 상황에 반응(표정 + 말풍선 대사)하고, 캐릭터의 몸통 색이 UI **테마 색(accent)** 이 된다. 게임 밸런스에는 영향 없음.
- 개발 방식: **기능 하나씩** 구현하고, **각 단계가 끝날 때마다 사용자 확인** 후 다음 단계. 단계마다 커밋 + 푸시.

## 확정된 결정 사항 (사용자 답변)

| 항목 | 결정 |
|---|---|
| 기술 스택 | **React 19 + Vite + TypeScript**. 셸 UI(화면/오버레이/HUD)는 React, 게임 보드는 프레임워크 독립 Canvas 모듈 |
| 캐릭터 역할 | **마스코트 + 테마** (반응/대사/테마 색상, 게임 능력 없음. 추후 능력 추가 가능하게 구조만 열어둠) |
| 캐릭터 디자인 | **아주 귀엽게** (사용자 강조) → §3.1 귀여움 기준, 3단계에서 시안 검수 통과 전엔 다음 단계로 안 감 |
| 진행 방식 | **단계마다 멈춤** — 각 단계 완료 시 보고 → 확인 후 다음 단계 |
| 대상 환경 | **PC 브라우저 우선 + 반응형** — 키보드/마우스 기준, 터치는 마지막 단계 |
| UI 언어 | 한국어 |

## 환경 (확인 완료)

- Windows 11, Node 24.11, npm 11.6, git 2.52, pnpm 없음, gh CLI 없음
- `create-vite@9.2.1` react-ts 템플릿: React 19.3, Vite ^8.3 (Rolldown), `@vitejs/plugin-react` ^6.1 (Oxc 변환), **TypeScript ~6.0.2**, 린터 **oxlint**(ESLint 아님), `erasableSyntaxOnly`/`verbatimModuleSyntax` 켜짐 → `enum` 금지, 타입은 `import type`
- **`typescript@7.0.2` 설치 금지** (네이티브 컴파일러, `tsserver` 없음 → 에디터 연동 깨짐). 템플릿 고정 버전 사용, 문제 시 `~5.9.3`
- vitest 5.0 (리포트 `.vitest/` → gitignore), zustand 5.0, prettier 3.9
- galmuri 2.40: `dist/galmuri.css` + woff2, 9개 `@font-face` 전부 `font-display: swap`, unicode-range 서브셋 없음. **네이티브 em 크기는 Galmuri7/9/11/14 = 8/10/12/15px** (이름은 글리프 높이) → 정수 배율의 기준값

## GitHub 형상관리 (사용자 답변으로 확정)

| 항목 | 결정 |
|---|---|
| 계정 | 개인 GitHub `sjc4197` (숫자 ID 63084925). `jcsuh`는 회사 GitLab 계정이므로 사용하지 않음 |
| 인증 | **SSH 키** — `~/.ssh/id_rsa.pub`(RSA 3072, passphrase 없음) 등록 완료. `ssh -T git@github.com` → "Hi sjc4197!" 확인됨 |
| 저장소 | `https://github.com/sjc4197/mini_game_project` → `git@github.com:sjc4197/mini_game_project.git`. public, 기본 브랜치 `main`, GitHub가 만든 `README.md`(`# mini_game_project`) 1개 커밋 존재 |
| 커밋 작성자 | **저장소 전용** 설정: `user.name=sjc4197`, `user.email=63084925+sjc4197@users.noreply.github.com` (전역 설정은 건드리지 않음) |
| 커밋 주기 | **단계마다 커밋 + 푸시** — 각 단계 완료·확인 후 `main`에 커밋하고 바로 푸시 |
| 커밋 메시지 | `step-NN: <한글 요약>` + 본문에 변경 요점. 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` |

0단계 절차: `ssh-keyscan github.com >> ~/.ssh/known_hosts`(현재 미등록) → 빈 프로젝트 폴더에 `git clone git@github.com:sjc4197/mini_game_project.git .` → 저장소 전용 user 설정 + `core.autocrlf=false` → Vite 스캐폴드는 **임시 폴더에 생성 후 복사**(README는 마지막 단계에서 교체) → `.gitignore` → 설계 문서 3편을 `docs/`에 저장 → 첫 커밋 → `git push -u origin main`.

---

## 1. 아키텍처 (React 19 + Vite + TS)

### 1.1 폴더 구조

```
src/
├─ main.tsx                  createRoot + StrictMode(유지). 전역 CSS·galmuri CSS import, 폰트 로드 대기, 테마 선적용, input.install(), audio 언락, settings→audio 구독
├─ App.tsx                   <ScreenRouter/> + <Scanlines/> (accent는 html 루트 CSS 변수로 주입)
├─ types/css.d.ts            React.CSSProperties에 `--custom-prop` 키 허용
├─ app/                      React 비의존 서비스 + 전역 상태 (DOM 허용, React import 금지)
│  ├─ store.ts               zustand+persist: screen(비영속), selectedCharacterId, settings, records + 액션
│  ├─ persist.ts             키 'minigames.store', version 1, migrate 사다리, try/catch safeStorage
│  ├─ screen.ts              Screen 유니온, screenKey(), parentOf()
│  ├─ session.ts             비영속 인게임 스토어: status/hud/mood/line/result
│  ├─ records.ts (+test)     mergeResult() 순수 함수
│  ├─ metrics.ts             DisplayMetrics: --u(1dp의 CSS px) 결정, DPR 보정, 변경 이벤트
│  ├─ theme.ts               applyCharacterTheme(): html[data-char], --accent/-dark/-light 주입, accent 의존 캐시 초기화
│  ├─ mascot.ts (+test)      MascotReactor: 이벤트→무드 테이블, 우선순위/쿨다운/큐, 대사 선택, 수다 레벨
│  ├─ loop.ts (+test)        createLoop(): rAF + 고정 타임스텝 누산기, raf 주입 가능
│  ├─ input/bindings.ts      Action 유니온 + 기본 키 바인딩 (e.code)
│  ├─ input/input.ts         InputService 싱글턴: scope(ui/game/overlay), isDown/takePress/heldMs/lastPressed, on()
│  ├─ audio/{audio,sfx,synth}.ts  WebAudio 칩튠 SFX (부록 C)
│  └─ dev.ts                 DEV: location.hash === '#dev' → 스프라이트 갤러리 화면
├─ lib/                      순수 유틸: rng.ts(mulberry32), fit.ts(정수 배율), canvas.ts(crisp canvas), math.ts
├─ pixel/                    스프라이트 엔진 (부록 D 형식)
│  ├─ types.ts               SpriteDef / Raster / Layer / Clip / Mood
│  ├─ compose.ts (+test)     compose(layers) → Raster(Uint8Array 인덱스 버퍼), $base/$dark/$light 치환, squash(), bob(), validateSprite()
│  ├─ raster.ts              rasterize(raster, scale) → canvas 캐시, toDataURL 메모, --u/dpr 변경 시 clear
│  ├─ nineslice.ts           border-image용 9-slice 데이터 URL 생성 (말풍선·결과창·로고 프레임)
│  └─ ticker.ts              공용 애니 티커: rAF 1개 공유, document.hidden 시 정지
├─ characters/
│  ├─ types.ts               CharacterDef { id, name, bio, personality, accent{base,dark,light}, body, idle{kind,row}, faces?, lines }
│  ├─ faces.ts / extras.ts   공용 얼굴 타일 12×8 ×7(idle/happy/worried/sad/win/think/blink) + 부속(sweat/sparkle/dots/shadow)
│  ├─ lines.ts               DEFAULT_LINES + 게임별 오버라이드 registerGameLines()
│  ├─ index.ts               characters[], getCharacter(id), DEFAULT_CHARACTER_ID
│  └─ peong.ts cubo.ts mallang.ts dalnyang.ts   몸통 24×24 + points + 대사표
├─ games/
│  ├─ types.ts               GameModule / GameInstance / GameHost / GameResult / ScoringSpec — 경계 계약의 단일 출처
│  ├─ registry.ts            games: GameModule[], getGame(id), listGames({ includeDev })
│  ├─ host.ts                createHost(): 세션/오디오/입력/마스코트 브리지, alive 가드, HUD 코얼레싱
│  ├─ sample/index.ts        인터페이스 검증용 더미 게임 (devOnly, 새 게임 템플릿)
│  ├─ minesweeper/           index.ts types.ts logic.ts(순수) logic.test.ts render.ts input.ts(포인터) sprites.ts(지뢰/깃발/숫자 5×7)
│  └─ tetris/                index.ts types.ts pieces.ts srs.ts scoring.ts das.ts logic.ts(순수) *.test.ts render.ts input.ts
└─ ui/
   ├─ ScreenRouter.tsx       store.screen → 화면 매핑 + 커튼 전환(fade/wipe)
   ├─ ScreenTransition.tsx   <Curtain phase fx> steps() 오버레이 (+400ms setTimeout 폴백)
   ├─ screens/               Boot, Title, CharacterSelect, Lobby, Game, Records, Settings, DevGallery(lazy, DEV만)
   ├─ components/            PixelSprite, Mascot, MascotPanel, SpeechBubble, PixelButton, PixelPanel, MenuList(FocusGroup),
   │                         Hud, Overlay, PauseOverlay, ResultOverlay, DifficultyPicker, Scanlines
   ├─ hooks/                 useKeyNav, useFontsReady, useMetrics
   └─ styles/                tokens.css fonts.css base.css ui.css layout.css effects.css (+ 컴포넌트별 *.module.css)
```

- 스타일: 전역 토큰(CSS 변수) + CSS Modules. Tailwind 등 추가 안 함.
- 도구: oxlint 유지, Prettier 추가(`semi: false, singleQuote, printWidth 100, endOfLine lf`), `.editorconfig`. scripts: `dev / build(tsc -b && vite build) / preview / test(vitest run) / typecheck / lint / format / check`.
- `vite.config.ts`: `defineConfig` from `vitest/config`, `base: './'`, alias `@`→`src`, `test: { environment:'node', include:['src/**/*.test.ts'] }`. `tsconfig.app.json`: `noImplicitOverride`, `paths {"@/*"}`(baseUrl 없이), `noUncheckedIndexedAccess` 끔.
- `games/**`에서 `react` import 금지(oxlint `no-restricted-imports`).

### 1.2 화면 상태 머신 (라우터 라이브러리·URL 해시 없음)

```ts
type Screen = { kind:'boot' } | { kind:'title' } | { kind:'select' } | { kind:'lobby' }
  | { kind:'game'; gameId:string; difficulty:string }
  | { kind:'records'; gameId?:string } | { kind:'settings'; from:'title'|'lobby' }
  | { kind:'dev'; page:'gallery' }   // import.meta.env.DEV 에서만
```
- `screen`은 저장하지 않음 → 새로고침하면 항상 부트→타이틀.
- 전환은 **커튼 방식**: `#fx` 오버레이(`--ink`)가 화면을 덮으면 그 순간 화면을 교체하고 걷음. `fade`(180ms `steps(4)`, 기본) / `wipe`(`clip-path inset` 240ms `steps(8)`, 게임 시작 시). 전환 중 클릭 차단, 연속 `navigate`는 닫힘 시점의 최신 목적지로 1회 교체. reduced-motion은 1ms(animationend 보장) + setTimeout 폴백.
- 흐름: 부트(폰트 대기) → 타이틀 → (저장 캐릭터 없으면) 선택 → 로비 → (난이도 피커) → 게임 → 결과 → 로비. 로비에서 기록(R)/설정(S)/캐릭터 변경(Esc). `Esc` = `parentOf()`.

### 1.3 상태 — zustand 5 (+ persist, subscribeWithSelector)

- **영속 스토어** `useStore`: `selectedCharacterId`, `settings`, `records`. `partialize`로 이 3개만. 키 `minigames.store`, `version: 1`, `migrate` 폴스루(절대 throw 안 함), `safeStorage`로 예외 흡수.
  - `settings`: `{ sound: true, volume: 0.8, crt: false, uiScale: 'auto'|2|3, chatter: 'quiet'|'normal'|'chatty', reducedMotion: 'system'|'on', tetris: { das: 167, arr: 33 } }`
  - `records[gameId][difficulty]`: `{ best: { value, characterId, date } | null, plays, wins, lastScore, lastPlayedAt, history: { score, outcome, characterId, at }[](최근 10) }`. best 방향은 `GameModule.scoring.betterIs`.
- **세션 스토어** `useSession`(비영속): `status('idle'|'running'|'paused'|'finished')`, `hud`, `mood`, `line`, `result`. HUD/말풍선만 구독 → 캔버스 컨테이너는 리렌더되지 않음.
- 서비스는 `useStore.subscribe(selector, cb, { fireImmediately })`로 React 밖에서 설정 구독(오디오, CRT, uiScale, chatter).

### 1.4 React ↔ 게임 모듈 경계 (`games/types.ts`, 단일 출처)

```ts
type Mood = 'idle'|'happy'|'worried'|'sad'|'win'|'think'
type MascotEvent = 'game.start'|'game.good'|'game.great'|'game.risky'|'game.safe'|'game.mistake'
  |'game.think'|'game.fail'|'game.win'|'game.record'|'ui.lobby.hover'|'ui.locked'|'ui.idle'
interface MascotApi {
  react(event: MascotEvent, opts?: { line?: string; lineKey?: string; hold?: number; priority?: 0|1|2|3 }): void
  setMood(mood: Mood, hold?: number): void     // 말풍선 없이 표정만 (예: 셀 누르는 동안 worried)
  say(text: string): void; clear(): void
}
interface GameResult { outcome:'win'|'lose'|'quit'; score:number; durationMs:number; stats?:Record<string,number> }
interface ScoringSpec { betterIs:'lower'|'higher'; countsWhen:'win'|'any'; format(v:number):string }
interface GameModule {
  id:string; title:string; description:string; icon?:SpriteDef
  difficulties: readonly { id:string; label:string; description?:string }[]; defaultDifficulty:string
  hud: readonly { key:string; label:string; format?(v:string|number):string }[]
  scoring: ScoringSpec; controls: { keyboard:string[]; mouse?:string[] }; devOnly?:boolean
  logical: { w:number; h:number }                        // 캔버스 논리 크기(dp) — 프레임이 정수 배율 결정
  create(host: GameHost): GameInstance
}
interface GameInstance { mount(el:HTMLElement):void; start():void; pause():void; resume():void; destroy():void; readonly state:'created'|'mounted'|'running'|'paused'|'finished'|'destroyed' }
interface GameHost {
  readonly character: CharacterDef; readonly difficulty: string; readonly settings: Readonly<Settings>
  mascot: MascotApi; setHUD(patch: Record<string, string|number>): void   // rAF 코얼레싱
  audio: { play(name: SfxName): void }; input: InputService
  finish(result: GameResult): void; requestPause(): void; now(): number
}
```
- 원칙 ① `logic.ts`는 호스트를 모른다: 순수 함수가 `{ state, events }`를 반환, `index.ts`가 이벤트를 `audio.play / mascot.react / setHUD / finish`로 매핑. 테스트는 이벤트 배열만 검사.
- 원칙 ② 게임은 **의미 이벤트**만 던진다(`game.good` 등). 어떤 표정·대사로 반응할지는 `app/mascot.ts`의 단일 테이블 + 캐릭터 대사표가 결정 → 게임을 추가해도 캐릭터 코드를 안 건드림.
- `<GameScreen>`: 인스턴스를 **`useEffect` 안에서** `createHost → game.create → mount → start`, cleanup에서 `destroy + dispose`. `runId` 증가로 재시작. StrictMode 이중 실행에서도 매번 새로 만들고 완전히 파괴. `visibilitychange`/`blur`/`Esc` → pause 오버레이(캔버스 `visibility:hidden`, 마스코트 think). `finished` → `result.id`로 중복 방지하며 `saveResult()`. 보드 컨테이너 `memo`, `tabIndex=0`.
- `createHost()`: `alive` 가드, `setHUD` rAF 코얼레싱, `mascot`는 `app/mascot.ts` 인스턴스에 위임.

### 1.5 입력 · 루프 · 오디오 · 렌더

- **InputService**: `window` `keydown/keyup/blur`, **`e.code`**(한글 IME 시 `e.key`='Process'), `e.repeat` 무시. scope `ui/game/overlay`: game/overlay에서만 방향키/Space `preventDefault`. 폴링 `isDown/takePress/heldMs/lastPressed`, 이벤트 `on(action, cb, {scope})`. `setScope()` 시 `releaseAll()`. HUD 버튼 `tabIndex=-1` + mousedown preventDefault.
- **FocusGroup / MenuList**: 마우스 hover와 키보드 포커스가 **같은 모양**(`:focus-visible` 대신 `.is-focused` 클래스). list/grid 2D 탐색, 끝에서 멈춤, 오버레이 열리면 포커스 가둠.
- **createLoop({ update(dt), render(alpha), stepMs=1000/60, maxFrameMs=250, raf? })**: 누산기, 프레임 클램프, `pause/resume`. 모든 게임 타이머는 `update(dt)` 누산 → pause 시 자동 동결.
- **AudioService**: 첫 제스처에서 AudioContext 동기 생성+resume. 음 → Gain(엔벨로프) → master → destination, `master.gain = sound ? volume : 0`. 동시 발음 8. 레시피 데이터 표(부록 C). React는 `import { audio }` 직접 호출, `PixelButton`이 hover→select / activate→confirm 자동.
- **DisplayMetrics(`--u`)**: 1dp = `--u` CSS px. 기본 2px, ≥1800×1000 화면은 3px, 설정 `uiScale`로 강제 가능. DPR 보정: `--u × dpr`이 **정수 디바이스 px**가 되도록 반올림(예: DPR 1.25 → `--u: 2.4px` = 3 device px). 모든 폰트/여백/테두리/스프라이트 배율이 `--u` 정수배 → 어느 화면에서도 도트가 안 깨짐.
- **게임 캔버스 배율**: 게임은 논리 크기(dp)만 선언, 오프스크린에 그리고 프레임이 `k = floor(min(availW·dpr/w, availH·dpr/h))` 정수 배율로 표시 캔버스에 확대(`imageSmoothingEnabled=false`, `width=w·k`, `style.width=w·k/dpr`). `ResizeObserver`로 재계산. 레터박스 `--bg-1`.
- **스프라이트 렌더**: `compose()` → `Raster`(인덱스 버퍼) → `rasterize(raster, scale)` 캔버스 캐시(키 `char:mood:frame@scale`, scale은 디바이스 px 정수 = `k·uDevice`). 애니는 `<PixelSprite>`가 canvas 1개를 ref로 유지하고 공용 ticker 구독, **프레임 인덱스가 바뀔 때만** drawImage. 정적 아이콘(기록표·카드·커서·9-slice)은 `toDataURL` 메모 → `<img>`/CSS `url()`.

---

## 2. 디자인 시스템

### 2.1 팔레트 (`tokens.css`, 19색 + 캐릭터 accent)

중성색 램프 (네이비, 순검정/순백 금지):

| 토큰 | HEX | 용도 |
|---|---|---|
| `--ink` | `#0D1020` | 스프라이트 외곽선, 하드 섀도, 오버레이 딤 |
| `--bg-0` | `#141A2E` | 페이지 배경 |
| `--bg-1` | `#1C2440` | 패널, 레터박스, 지뢰찾기 열린 셀 |
| `--bg-2` | `#27305A` | 카드/버튼 면 |
| `--bg-3` | `#354074` | hover 면, 지뢰찾기 안 열린 셀 |
| `--line-0` | `#4C5A94` | 기본 테두리 |
| `--line-1` | `#7C88B8` | 베벨 하이라이트, disabled 텍스트, 지뢰 숫자 8 |
| `--text-1` | `#B4BDDC` | 보조 텍스트 |
| `--text-0` | `#F4F1E8` | 기본 텍스트(웜 화이트) |
| `--white` | `#FFFFFF` | 스프라이트 눈 흰자/반짝임 전용 |

유채색 9: `--red #FF5E5B` · `--orange #FFA94D` · `--yellow #FFD166` · `--lime #9BE564` · `--teal #3FBFB2` · `--cyan #4FD6E8` · `--blue #6E9BFF` · `--purple #C792EA` · `--pink #FF8FB1`. 시맨틱: `--danger=red, --success=lime, --warning=yellow, --info=blue, --focus=--accent`.
- 테트로미노 7색 = Z red / L orange / O yellow / S lime / I cyan / J blue / T purple (별도 팔레트 불필요).
- 지뢰찾기 숫자: 1 blue · 2 lime · 3 red · 4 purple · 5 orange · 6 teal · 7 text-0 · 8 line-1 (열린 셀 `--bg-1` 위 대비 4.4:1 이상). 지뢰 몸통 `--line-1`+`--text-0` 하이라이트, 밟은 셀 `--red` 배경 + `--ink` 지뢰, 깃발 `--red` 천 + `--text-0` 깃대.
- **대비 규칙**: 본문은 `--text-0/1`만. **accent 채움 버튼의 글자는 `--ink`**(흰 글자는 lime/cyan/yellow 위에서 2:1 미만). 작은 accent 글자는 `--accent-light`. CRT 오버레이는 대비를 최대 25% 깎으므로 **기본 꺼짐**.

캐릭터 accent 3단(UI + 스프라이트 음영 겸용): 펑이 `#FF5E5B / #C13B49 / #FF9E8A`, 큐보 `#4FD6E8 / #2A93B0 / #A8EEF7`, 말랑이 `#9BE564 / #5EA83E / #D2F7A6`, 달냥 `#C792EA / #8A5BBF / #E6C6FA`. 저장 캐릭터 없을 때 중립 accent = `--cyan`.

### 2.2 타이포그래피 (Galmuri 단일 체계, em 8/10/12/15px 기준)

| 역할 | 패밀리 | 크기 / 행간 (u=2 → px) |
|---|---|---|
| Display(로고) | Galmuri14 | 30u/36u (60/72) |
| H1(화면 제목) | Galmuri14 | 15u/18u (30/36) |
| H2·버튼 | Galmuri11 Bold | 12u/14u (24/28) |
| Body(메뉴·말풍선) | Galmuri11 | 12u/14u (24/28) |
| Small(힌트·라벨) | Galmuri9 | 10u/12u (20/24) |
| Caption | Galmuri7 | 8u/10u (16/20) |
| Number(HUD) / Number-L(결과) | GalmuriMono11 | 12u/14u · 24u/28u |

- 숫자는 반드시 Mono(타이머 폭 고정). 캔버스 안 숫자(지뢰 1~8)는 폰트 대신 **5×7 숫자 스프라이트**.
- 로딩: `import 'galmuri/dist/galmuri.css'`(Vite 번들). `index.html`에 사용 4패밀리 woff2 `<link rel="preload" as="font" crossorigin>`. **부트 화면**(`--bg-0` + 깜빡이는 사각형)에서 `document.fonts.load()` ×4 + `fonts.ready`(최대 2초)를 기다린 뒤 타이틀 → FOUT 원천 차단. 2차 최적화: `pyftsubset`로 한글 2,350자+Latin 서브셋 + 대사표 전 글자 포함 테스트.
- 전역: `font-smooth/-webkit-font-smoothing: none`, `text-rendering: optimizeSpeed`, `font-kerning: none`, `font-synthesis: none`(가짜 볼드 금지), 소수 좌표 transform 금지.

### 2.3 픽셀 UI CSS 기법

- 간격 스케일 `--sp-N = N × --u` (1,2,4,6,8,12,16,24,32). `canvas, img.sprite { image-rendering: pixelated }`.
- **테두리 = `box-shadow` 적층**(4방향 1dp 섀도 → 모서리 1dp 빠진 둥근 도트 테두리 + inset 베벨 + 2dp 하드 드롭섀도). accent 재색상 즉시, 에셋 0. 컴포넌트는 섀도 공간만큼 `margin` 규약. `border-image` 9-slice는 말풍선·결과창·로고 프레임 3곳만(현재 배율로 미리 생성). `clip-path`는 wipe 전환만.
- 버튼: 기본 `--bg-2`, hover `--bg-3`, pressed = `translate(2u,2u)` + 베벨 반전, primary = accent 채움 + `--ink` 글자, disabled `--line-1` 글자. `transition: none`(눌림 즉시).
- 포커스/커서: `.is-focused { outline: 2u solid var(--focus); outline-offset: 2u }` + 메뉴 왼쪽 ▶ 커서 스프라이트(8×8dp) `step-end` 깜빡임. 카드 포커스는 `translateY(-2u)` `steps(2)`.
- 모션: 전부 `steps()/step-end`, 이동 거리는 `--u` 정수배. PRESS START `px-blink 1s step-end`. `prefers-reduced-motion`: 깜빡임 끔, transition 0.
- CRT(토글, 기본 꺼짐): `html[data-crt="on"] body::after` 스캔라인 `repeating-linear-gradient` + 비네트. `backdrop-filter`/`mix-blend-mode` 불사용.
- 잠긴 슬롯: 1dp 체커 디더(`repeating-conic-gradient`) + 자물쇠 스프라이트 + "COMING SOON", Enter 시 ±1u 흔들림 거부.

### 2.4 화면 레이아웃 & 입력 규약

| 키 | 메뉴/오버레이 | 지뢰찾기 | 테트리스 |
|---|---|---|---|
| ←→↑↓ | 포커스 이동(그리드 2D, 끝에서 멈춤) | 키보드 커서 | ←→ 이동 · ↓ 소프트 · ↑ 시계 회전 |
| Enter / Z / Space | 확인 | Enter·Z 열기, Space 코드 | Z 반시계 · Space 하드드롭 |
| Esc / X | 뒤로·닫기 | Esc 일시정지 · X 깃발 | Esc 일시정지 · X 시계 회전 |
| C / Shift · R · S | – · 기록(로비)/다시(결과) · 설정 | – · 재시작 · – | 홀드 · 재시작 · – |

마우스: hover = 포커스 추종, 클릭 = 확인. 지뢰찾기 우클릭 깃발, 양클릭/가운데 코드.

```
[부트] --bg-0 + 깜빡이는 사각형 (폰트 로드 대기, 최대 2초)

[타이틀]                                        [캐릭터 선택]
┌────────────────────────────────────────┐      ┌────────────────────────────────────────┐
│      ╔══════════════════════════╗       │      │ ◀ Esc 타이틀        캐릭터 선택          │
│      ║   도 트   아 케 이 드      ║       │      │ ┌──────┐┌──────┐ │ ┌──────────┐ 펑이   │
│      ╚══════════════════════════╝       │      │ │▶(펑이)││ (큐보)│ │ │ 3u 프리뷰 │ "터지기 │
│   [펑이]   [큐보]   [말랑이]   [달냥]     │      │ └──────┘└──────┘ │ │ idle 재생 │  싫어서…"│
│   (4마리 idle, 위상 250ms씩 어긋남)       │      │ ┌──────┐┌──────┐ │ └──────────┘ 성격·전문 │
│           ▶ PRESS START ◀               │      │ │(말랑이)││ (달냥)│ │ 컬러 ■      [이 캐릭터로│
│  v0.1        S 설정      R 기록           │      │ └──────┘└──────┘ │              시작 Enter]│
└────────────────────────────────────────┘      └────────────────────────────────────────┘
  포커스 이동 시 --accent 즉시 미리보기(확정 전 미저장, Esc로 복구). 포커스된 캐릭터는 happy, 나머지 idle.

[로비]                                          [게임 화면 공통 프레임 (≥1280)]
┌────────────────────────────────────────┐      ┌──────────────────────────────────────────┐
│ ◀ Esc 캐릭터 변경   게임 선택  [기록][설정] │      │ ◀ Esc 로비  지뢰찾기·중급   ⏱00:42 ⚑10  [II]│
│ ┌───────────┐ ┌───────────┐ │ ┌────────┐ │      │ ┌────────────────────────┐ ┌───────────┐  │
│ │▶ 지뢰찾기   │ │  테트리스   │ │ 지뢰찾기는│ │      │ │                        │ │ 거기 진짜  │  │
│ │ 아이콘 BEST│ │ 아이콘 BEST│ │ 내 전공! │ │      │ │   GAME CANVAS (정수배율) │ │ 괜찮아?   │  │
│ └───────────┘ └───────────┘ │  (펑이 2u)│ │      │ │                        │ └─────┬─────┘  │
│ ┌───────────┐ ┌───────────┐ │ 플레이 128 │ │      │ │                        │   (펑이 2u)    │
│ │░ COMING  ░│ │░ COMING  ░│ │ 클리어 32% │ │      │ └────────────────────────┘   BEST 00:31   │
│ └───────────┘ └───────────┘ └────────┘ │      │ 좌클릭 열기 · 우클릭 깃발 · Space 코드 · Esc   │
└────────────────────────────────────────┘      └──────────────────────────────────────────┘
```
- 로비 카드 Enter → **난이도 피커**(모달, 게임이 정의) → `wipe` 전환으로 게임 시작. 잠긴 카드는 포커스 가능(마스코트 "아직 준비 중")·시작 거부.
- 게임 프레임: 상단 HUD(좌 제목·중 HUD 값·우 일시정지), 중앙 캔버스, 우측 마스코트 패널(32×32dp 스테이지 2u + 말풍선 + BEST + NEW RECORD 깜빡임), 하단 조작 힌트(게임 제공). 테트리스 HOLD/NEXT는 캔버스 안에 그림.
- 일시정지: 딤 `rgba(13,16,32,.72)`, 캔버스 `visibility:hidden`, 메뉴(계속/다시 시작/설정/로비), 마스코트 think.
- 결과: "★ 클리어! ★"(lime) / "게임 오버"(red), 마스코트 얼굴 win/sad(sticky), Number-L로 점수/시간 + 최고, NEW RECORD 깜빡임, [다시하기 R] [로비 Esc].
- 기록: 게임 탭(←→) → 난이도 필터 → 순위표(캐릭터 1u 아이콘 · 기록 · 날짜) + 플레이/클리어율 + [기록 초기화](확인 모달).
- 설정: UI 크기(자동/2×/3×) · CRT · 마스코트 수다(조용/보통/수다쟁이) · 움직임 줄이기 · 사운드/볼륨 · 테트리스 DAS/ARR · 조작키 보기 · 기록 초기화. ↑↓ 항목, ←→ 값, Esc 저장 후 닫기.

### 2.5 반응형 (`grid-template-areas`)

| 폭 | 구성 |
|---|---|
| ≥1280 | `"hud hud hud" / "panel board mascot" / "foot foot foot"` |
| 960–1279 | `"hud hud" / "board mascot" / "panel panel" / "foot foot"` |
| <960 | 단일 컬럼 `"hud" / "strip" / "board" / "panel" / "foot"`, 마스코트는 **스트립**(1u 스프라이트 + 한 줄 말풍선, 40u 높이) |

최소 폭 640px. 높이 부족 시 캔버스 배율이 먼저 내려가고, 그래도 안 맞으면 세로 스크롤(HUD sticky).

---

## 3. 캐릭터 & 스프라이트

### 3.1 귀여움 기준 (사용자 요구 "아주 귀엽게" — 10/7 레퍼런스: 푸신(Pusheen)풍 뚱냥이)
- **통통한 한 덩어리**: 몸이 넓고(≈28dp) 둥글넓적한 블롭. 머리/몸 구분 없음. 1dp 잉크 외곽선, 파스텔 단색 채움, 음영은 바닥 한 줄 정도만.
- **아주 작은 얼굴**: 점 눈 2×2 두 개를 멀리 떨어뜨리고, 입은 3~4dp 작은 미소/ω, 눈 양옆에 분홍 볼터치 2×2. 큰 눈·눈 하이라이트·눈썹·큰 입 금지 (1차 시안의 애니메이션풍 큰 눈은 "하나도 안 귀엽다"로 반려됨).
- **작은 부속으로 개성**: 짧은 발 두 개, 작은 귀·꼬리·수염·안테나·심지처럼 1~4dp 포인트만. 디테일은 최소.
- **동작**: idle 2프레임 squash/bob + 4초마다 깜빡임. 표정은 눈 모양(점/^^/별/감김/위 보기)과 입 모양만으로 표현하고 눈물·땀·반짝·생각 점은 부속으로 붙인다.
- **검수 체크포인트**: 3단계에서 `#dev/gallery`(4캐릭터 × 6무드 × 배율) 스크린샷으로 보고. **사용자 OK까지 수정 반복, 통과 전엔 4단계로 안 감.**

### 3.2 캐릭터 4종 — 전부 고양이 (10/7 사용자 지시: "컨셉을 고양이로만", 푸신풍 식빵 자세)

| id | 이름 | 종류 | 털색 / 무늬 | 성격 | accent(UI) |
|---|---|---|---|---|---|
| cheese | 치즈 | 치즈태비 | 주황 `#FFB85C`, 진한 주황 줄무늬 | 먹보, 느긋함 | orange `#FFA94D` |
| mackerel | 고등어 | 고등어태비 | 회청색 `#A9BBD3`, 짙은 줄무늬 많음 | 활발, 장난꾸러기 | cyan `#4FD6E8` |
| milk | 우유 | 흰 고양이 | 흰색 `#FBF6EC`, 무늬 없음, 분홍 귀 속 | 수줍음, 다정함 | pink `#FF8FB1` |
| siam | 샴 | 샴 | 크림 `#F3E3C3` + 초콜릿 포인트(귀·얼굴 타원 마스크·꼬리·발), 파란 눈 | 도도한 츤데레, 늘 졸림 | blue `#6E9BFF` |

- 네 마리가 **같은 식빵 템플릿**(`characters/loaf.ts`, 32×24)을 공유. 템플릿은 **사용자가 준 레퍼런스 픽셀아트(주황 식빵 고양이, 36×24 격자)를 그대로 읽어 들인 것**(10/8, 손으로 그린 시안은 전부 반려됨). 종류별 차이는 팔레트 + `paintRect` 포인트뿐. 새 포즈/캐릭터가 필요하면 레퍼런스 이미지를 먼저 받는다.
- 얼굴 타일 12×4 공용(레퍼런스의 얼굴 배치 그대로: 눈 1픽셀 둘, ω 입 3픽셀, 볼 1픽셀). 샴만 눈을 파란색, 입을 크림색으로 재색상.
- 털색은 accent 와 별개(리얼한 고양이 색). accent 는 UI 테마용 상징색.

대사표 `lines: Partial<Record<MascotEvent | 'lobby:<gameId>' | 'lobby:locked', string[]>>`, 이벤트당 3~4개, 마지막 2개 제외 무작위. 조회 순서: 게임별 오버라이드 → 캐릭터 → `DEFAULT_LINES`. 모든 대사 ≤24자(말풍선 2줄) 테스트.

### 3.3 스프라이트 파이프라인 (형식은 부록 D)
- **식빵 고양이 32×24(내용 21행), 합성 스테이지 32×32**(몸통은 (0,10)에 배치 → 위 10dp가 반짝이/생각 점 공간).
- **레이어**: ① 몸통 base(캐릭터별 1장, 얼굴 없음, `$base/$dark/$light` 팔레트 참조) ② 공용 얼굴 타일 12×4 ×7(idle/happy/worried/sad/win/think/blink, `points.face`에 배치; 큐보 LED 눈 등은 `faces` 오버라이드) ③ 부속 sweat 4×6 / sparkle 5×5 ×2 / dots 7×3 ×3 / 발 그림자 12×2(알파 HEX) ④ 무드별 조합·클립: idle 2f 2fps(+blink) · happy 2f 4fps · worried 2f 3fps(+sweat) · sad 2f 1fps · win 2f 4fps(+sparkle 교대) · think 3f 2fps(+dots).
- **idle 프레임 B는 재작화 없이 변환**: `squash(row)` = 지정 행 삭제 + 맨 위 빈 행 삽입(발 고정, 머리 1dp 하강 = 숨쉬기) / `bob` = 전체 1dp 상승(호버 로봇).
- **compose → Raster(Uint8Array 인덱스 버퍼)** 로 레이어 간 팔레트 키 충돌 없음. 캐시 키 `char:mood:frame`(48개, 각 1KB). `validateSprite`로 행 길이·팔레트 키 테스트.
- 표시 배율: 기록표/카드 아이콘 1u(몸통 크롭), 로비·게임 마스코트·타이틀 2u(128px), 선택 프리뷰 3u(192px). 타이틀 4마리는 위상 250ms씩 어긋남.

### 3.4 마스코트 리액션 (`app/mascot.ts`)

| 이벤트 | 무드 | 우선순위 | 쿨다운 | hold |
|---|---|---|---|---|
| game.start | happy | 2 | – | 2.5s |
| game.good | happy | 1 | 4s | 2s |
| game.great | win | 2 | 2s | 3s |
| game.risky / game.safe | worried / idle | 2 | 6s | safe까지 또는 5s |
| game.mistake | sad | 2 | 3s | 2s |
| game.think | think | 1 | 15s | 4s |
| game.fail | sad | 3 | – | sticky |
| game.win / game.record | win | 3 | – | sticky |
| ui.lobby.hover / ui.locked | idle | 1 | 1.5s | 말만 |

- 규칙: 새 이벤트 우선순위 ≥ 현재 → 즉시 교체, 낮으면 대기열(길이 1, 최신 우선)에서 현재 말풍선 종료 후 1.5초 내 재생 아니면 폐기. 쿨다운 × 수다 계수(quiet ×2·우선순위 2 이상만 / normal ×1 / chatty ×0.5). 말풍선 표시 `clamp(1500, 900 + 90×글자수, 5000)`ms, 등장 `steps(2)` 120ms, 퇴장 즉시. hold 만료 시 idle, sticky는 `clear()`까지(결과창 닫힘/재시작 시 프레임이 호출). `role="status" aria-live="polite"`.
- 게임 매핑 — 지뢰찾기: 첫 클릭 `start`, 연쇄 ≥8칸 `good`, 셀 pointerdown 동안 `setMood('worried')`/up `idle`(스마일 버튼 대체), 4 이상 숫자+미공개 이웃 ≥4 `risky`, 남은 안전 칸 ≤10 `think`, 30초 무입력 `think`, 지뢰 `fail`, 완료 `win`, 신기록 `record`. 테트리스: 1~2줄 `good`, 3줄 `great`, 4줄 `great`+`line:'테트리스!'`, B2B `line:'연속 테트리스!'`, 콤보 ≥3 `good`+`line:'N 콤보!'`, 레벨업 `good`+`line`, 스택 ≥70% `risky`/≤40% `safe`, 10초 무입력 `think`, 최고점 갱신 순간 `record`, 게임오버 `fail`.
- accent 전파 `applyCharacterTheme(c, persist)`: `html[data-char]` + `--accent/-dark/-light` 주입, 부트 시 **첫 페인트 전** 적용(플래시 방지), 선택 화면은 `persist=false` 미리보기. accent 쓰는 곳: 포커스 링·메뉴 커서·선택 카드 테두리·primary 버튼·PRESS START·HUD 라벨 밑줄·말풍선 테두리·NEW RECORD·진행 바. 틴트 면 `color-mix(in srgb, var(--accent) 18%, var(--bg-1))`. 보드 내부 색(숫자·테트로미노)은 accent 영향 없음.

---

## 4. 게임 스펙 (상세는 부록 A/B)

### 4.1 지뢰찾기
- 난이도: 초급 9×9/10 · 중급 16×16/40 · 고급 30×16/99. 기록 = 난이도별 최단 시간(승리 시만, `betterIs:'lower'`).
- 모델(순수, `Uint8Array`): `mines / counts / state(Hidden|Revealed|Flagged|WrongFlag)`, `status ready|playing|won|lost`, `elapsedMs`는 `tick(dt)` 누산. flood fill은 스택 기반 반복(scratch 버퍼 1회 할당). `rng` 주입(mulberry32).
- 규칙: 첫 클릭 후 지뢰 배치(클릭 칸 + 3×3 제외, 부족 시 폴백) → 첫 클릭은 항상 0칸. 우클릭 = 깃발 토글만(`?` 없음). 코드 = 열린 숫자 주변 깃발 수 일치 시 나머지 열기(가운데 / 좌+우 / 숫자 좌클릭 / Space). 승리 = 안전 칸 전부(남은 지뢰 자동 깃발). 패배 = 전체 지뢰 표시 + 터진 칸 강조 + 틀린 깃발 X. 남은 지뢰 = 지뢰 − 깃발(음수 허용), 타이머 999 캡.
- 입력: Pointer Events + `prevButtons ^ e.buttons` 전이(부록 A). `contextmenu` 차단. 키보드 커서 모드(마우스 움직이면 숨김). `R` 재시작.
- 렌더: 셀 16dp, 논리 캔버스 `cols×16 + 2` 프레임. 안 열린 셀 `--bg-3` 볼록 베벨(`--line-1`/`--ink`), 열린 셀 `--bg-1` 평면, 숫자 5×7 스프라이트(§2.1 색), 지뢰/깃발/X 8×8~16×16 스프라이트, hover `--bg-3` 밝힘, 키보드 커서 `--yellow` 2dp. `dirty` 시 전체 재그리기. HUD: ⏱ 시간 · ⚑ 남은 지뢰 · BEST.

### 4.2 테트리스 (모던 가이드라인)
- 보드 10 × (20 가시 + 4 숨김). 스폰 `(3,2)` rot 0 + spawn drop 1행. **SRS** 4상태 + 월킥(부록 B), 180° 미지원. **7-bag**, **Next 5**, **Hold**(조각당 1회, 거부 `deny` 음), **고스트**.
- 중력 `초/행 = (0.8 − (L−1)·0.007)^(L−1)`, L은 20에서 고정. 소프트 20배(행당 1점), 하드 즉시 락(행당 2점). **락 딜레이 500ms**, 리셋 최대 15회, 새 최저 행에서 0. **DAS 167 / ARR 33ms**(설정 조정, ARR 0 = 벽까지), DAS 충전은 클리어/스폰을 가로질러 유지.
- 점수: 1/2/3/4줄 = 100/300/500/800 × 레벨, B2B ×1.5, 콤보 50×콤보×레벨. 레벨 = 시작 + ⌊라인/10⌋. 난이도 = 시작 레벨 `lv1 / lv5 / lv10`. T-spin·퍼펙트클리어 후속.
- 클리어 애니 310ms(플래시 4회 160ms → 중앙 바깥 와이프 150ms) 후 collapse, ARE 0. 테트리스 시 테두리 플래시. 게임오버 = block out / lock out → 0.8초 회색 덮임 → `finish`.
- 조작: ←→(DAS) ↓ Space ↑/X Z/Ctrl C/Shift Esc/P R.
- 렌더: 논리 캔버스 324×340(좌 HOLD, 중앙 보드 160×320, 우 NEXT×5), 블록 3톤 베벨 타일(팔레트 7색 + light/dark), 고스트 1px 테두리 α0.6, 숨김 행 미표시. HUD: 점수 · 레벨 · 라인 · 시간 · BEST.
- 기록: 시작 레벨별 최고 점수(`betterIs:'higher'`, `countsWhen:'any'`), stats에 lines/level/tetrises/maxCombo.

---

## 5. 단계별 개발 계획 (단계 완료 → 보고 → 사용자 확인 → 커밋/푸시 → 다음)

| # | 단계 | 산출물 / 주요 파일 | 사용자 확인 방법 |
|---|---|---|---|
| 0 | 저장소 연결 + 스캐폴드 + 도구 | known_hosts, `git clone … .`, 저장소 전용 user 설정, Vite react-ts(임시 폴더→복사), 샘플 제거, zustand/galmuri/vitest/prettier, `@` alias, scripts, `.gitignore`(+`.vitest/`), `.prettierrc`, `.editorconfig`, 폴더 뼈대, `docs/`(설계 문서 3편) | `npm run dev` → 어두운 화면에 "mini_game_project". `npm run check` 통과. GitHub에 커밋 보임 |
| 1 | 디자인 토큰 + 폰트 + `--u` + 스토어 골격 | `tokens/fonts/base/ui/effects.css`, `index.html(lang=ko, 폰트 preload)`, `app/metrics.ts`, `useFontsReady`+부트 화면, `app/{store,persist,screen,session}.ts`, `types/css.d.ts`, 토큰 견본 임시 화면 | 한글이 Galmuri로 선명(125% DPI 포함), 창 크기/배율 바꿔도 안 깨짐, 부트 후 타이틀 자리 표시, `localStorage['minigames.store']` 생성 |
| 2 | 스프라이트 엔진 + DEV 갤러리 | `pixel/{types,compose,raster,ticker,nineslice}.ts`(+compose.test), `PixelSprite.tsx`, `DevGalleryScreen`(lazy), `app/dev.ts`, 테스트 스프라이트 | `#dev` → 샘플 스프라이트 1/2/3u, 번짐 없음, 애니/squash 토글 |
| 3 | **캐릭터 4종 제작 (귀여움 검수)** | `characters/*`(몸통 4 + 얼굴 7 + 부속), `lines.ts`(대사표), 갤러리에 4캐릭터 × 6무드 × 배율 + accent 견본 | 스크린샷 첨부 보고. §3.1 기준 + **사용자 OK까지 수정 반복** |
| 4 | 공용 UI + 입력 + 화면 머신 + 타이틀 | `PixelButton/Panel/MenuList(FocusGroup)/Overlay/Scanlines`, `useKeyNav`, `app/input/*`, `app/theme.ts`, `ScreenRouter/Transition`, `TitleScreen`(4마리 idle) | PRESS START 깜빡임, Enter/클릭 → 커튼(fade) → 임시 화면, Esc 복귀, 연타해도 안 깨짐, hover=포커스 동일 |
| 5 | 캐릭터 선택 화면 | `CharacterSelectScreen`, `Mascot.tsx` | ←→↑↓/마우스로 이동 시 accent 즉시 미리보기, 포커스 캐릭터 happy, 3u 프리뷰 idle, Enter 저장 → 새로고침 후 유지, Esc 시 accent 복구 |
| 6 | 로비 + 게임 호스트 골격 + 샘플 게임 + 마스코트 패널 | `games/{types,registry,host}.ts`, `games/sample`, `app/{loop,mascot}.ts`(+test), `LobbyScreen`, `DifficultyPicker`, `GameScreen`, `Hud/MascotPanel/SpeechBubble/PauseOverlay/ResultOverlay`, 반응형 그리드 | 로비 카드 + COMING SOON(흔들림 거부) + 마스코트 로비 대사. 샘플 게임: 방향키 이동, HUD 점수, Space → `game.good` 말풍선, Esc 일시정지(캔버스 숨김), 탭 전환 자동 정지, 결과·다시하기. StrictMode에서 캔버스 중복 없음 |
| 7 | 오디오 + 설정 화면 | `app/audio/*`, `SettingsScreen`(사운드/볼륨/CRT/UI 크기/수다/움직임/DAS·ARR/조작키/초기화) | 첫 클릭 후 효과음, OFF → 무음, CRT·UI 크기 즉시 반영, 새로고침 후 유지 |
| 8 | 지뢰찾기 ① 로직 + 테스트 | `minesweeper/{types,logic,logic.test}.ts`, `lib/rng.ts` | `npm test` 녹색 (부록 A 14개) |
| 9 | 지뢰찾기 ② 렌더·입력 | `minesweeper/{sprites,render,input,index}.ts`, `lib/{fit,canvas}.ts` | 세 난이도 플레이, 첫 클릭 안전, 우클릭 깃발(메뉴 없음), 코드, 키보드 커서, 125% DPI 선명 |
| 10 | 지뢰찾기 ③ 마스코트·기록·폴리시 | 이벤트→SFX/마스코트 매핑, `app/records.ts`(+test), 캐스케이드·폭발 연출, 결과 신기록 | 누르는 동안 worried, 폭발 → boom + sad, 클리어 → win + 대사, 결과에 시간·신기록, 새로고침 후 기록 유지 |
| 11 | 기록 화면 | `RecordsScreen` | 게임 탭/난이도 필터/순위표(캐릭터 아이콘)/통계/초기화 모달 |
| 12 | 테트리스 ① 로직 + 테스트 | `tetris/{types,pieces,srs,scoring,das,logic}.ts` + 테스트 | `npm test` 녹색 (부록 B 19개) |
| 13 | 테트리스 ② 렌더·입력·루프 | `tetris/{render,input,index}.ts` | 60fps, DAS/ARR 체감, 벽킥·홀드·하드드롭·고스트·Next, 일시정지 중 정지 |
| 14 | 테트리스 ③ 마스코트·기록·폴리시 | 클리어/레벨업/게임오버 연출, 마스코트 매핑, 하이스코어, SFX | "테트리스!" + 전용 음, 위험 높이 worried, 기록 반영 |
| 15 | 반응형·터치 + README + 마무리 | narrow 스트립 레이아웃, 테트리스 가상 버튼(DOM→input 주입), 지뢰찾기 탭/길게 눌러 깃발 + 토글, `favicon.svg`, README, 서브셋 폰트(여유 시), `npm run build && preview` | <960px에서 스트립, 모바일 폭에서 플레이 가능, 빌드 성공 |

- 단계 중 발견된 버그는 그 단계에서 수정. 단계가 커지면 보고 후 분할.
- 새 게임 추가 절차: `games/<id>/`(`sample/` 복사) → `GameModule` 구현 → `registry.ts` 1줄 → 로비 자동 노출 → `registerGameLines()`로 캐릭터 대사(선택).

## 6. 검증 방법

- 매 단계: `npm run dev` 브라우저 확인(표의 "확인 방법"), `npm run check`(typecheck + oxlint + vitest), 수시 `npm run build`.
- 로직 테스트 Vitest `node` 환경, colocate, 결정적 RNG 주입. RTL/jsdom은 추가하지 않음.
- 브라우저 확인은 `run` 스킬로 dev 서버를 띄워 스크린샷을 찍고 사용자에게 첨부(특히 3단계 캐릭터 시안, 125% DPI 선명도).

## 7. 리스크 & 대응

- StrictMode 이중 effect → 인스턴스는 `useEffect` 안에서 생성/파괴, `mount/destroy` 멱등, host `alive` 가드, `result.id` 중복 저장 방지.
- 소수 DPR 블러(Windows 125%/150%) → `--u`와 캔버스 배율 모두 **디바이스 픽셀 정수** 원칙. Windows Chrome 서브픽셀 텍스트는 완전 해결 불가(정수 좌표·`--u` 보정으로 최소화).
- 한글 IME → `e.code`. 버튼 포커스가 Space를 먹음 → HUD 버튼 `tabIndex=-1`. 창 blur → `releaseAll()`.
- 폰트 FOUT(`swap`) → 부트 화면 대기 + preload, 패밀리 4개 제한, 2차 서브셋. 용량(MB급) 주의.
- TS 6 `erasableSyntaxOnly` → `as const` 객체. TS 7 설치 금지.
- `box-shadow` 테두리가 레이아웃 밖 → 컴포넌트 margin 규약. `border-image`는 현재 배율로 미리 생성.
- 커튼 전환 고착 → reduced-motion 1ms + setTimeout 폴백.
- localStorage 예외/손상 → safeStorage + migrate 기본값. `screen` 영속 금지.
- AudioContext 자동재생 → 첫 제스처 동기 언락. 말풍선 스팸 → 우선순위·쿨다운·큐 길이 1.
- Windows CRLF → `.editorconfig` + Prettier `lf` + `core.autocrlf=false`.

---

## 부록 A. 지뢰찾기 상세

**포인터 상태기계** (`games/minesweeper/input.ts`): 버튼이 눌린 상태에서 다른 버튼을 누르거나 떼면 `pointerdown/up`이 아니라 `pointermove`가 오고 `e.buttons`만 바뀜 → 모든 이벤트에서 `changed = prev ^ cur`.
```
pressedNow = changed & cur ; releasedNow = changed & prev ; cell = toCell(e) (보드 밖 → -1)
우(2) 단독 press 즉시                      → secondary(cell)  (깃발)
(cur&3)===3 또는 중(4) 눌림                → chordArmed, pressStart(cell, chord=true)  (3×3 눌림 표시)
좌(1)만 & !chordArmed                      → pressStart(cell, chord=false)
release: chordArmed && !chordDone → chord(cell) ; else 좌 release & !chordArmed → primary(cell)
cur===0 → pressCancel ; changed===0 && move → pressing ? pressMove : hover
canvas contextmenu preventDefault, pointerleave → hover(-1,-1), window blur → cur=0, setPointerCapture
```
터치(15단계): 탭(<300ms, 이동 <8px) → primary, 길게(≥350ms) → secondary + `vibrate(20)`, 하단 "열기/깃발" 토글.

**테스트 14**: ① 난이도 크기/지뢰 수 ② placeMines 지뢰 수·safe 3×3 비어 있음(내부/가장자리/모서리)·seed 결정성 ③ counts를 brute-force와 비교(랜덤 100보드) ④ 후보 부족 폴백 ⑤ 0칸 reveal 집합 정확, 지뢰 절대 안 열림, 깃발이 flood 막음 ⑥ 숫자 칸 1칸만 ⑦ 지뢰 reveal → lost·explodedIndex·전체 지뢰·WrongFlag ⑧ toggleFlag 왕복/Revealed noop/종료 후 noop/음수 카운터 ⑨ chord 일치/불일치/틀린 깃발→lost/0칸 null ⑩ 마지막 안전 칸 → won + 자동 깃발, chord로 승리 ⑪ 1000 seed × 임의 첫 클릭 → hitMine 없음 ⑫ 타이머 ready 미누적/playing 누적/종료 정지 ⑬ neighbors 3/5/8 ⑭ 같은 seed+액션 스크립트 → 같은 최종 상태.

## 부록 B. 테트리스 상세

**조각 정의** `PIECES[type][rot]` = 바운딩 박스 기준 `(dx,dy)`(y 아래 +). I 4×4, 나머지 3×3, O 회전 no-op. `Int8Array` 플랫 저장.

| 피스 | rot 0 | R | 2 | L |
|---|---|---|---|---|
| I | (0,1)(1,1)(2,1)(3,1) | (2,0)(2,1)(2,2)(2,3) | (0,2)(1,2)(2,2)(3,2) | (1,0)(1,1)(1,2)(1,3) |
| O | (1,0)(2,0)(1,1)(2,1) | 동일 | 동일 | 동일 |
| T | (1,0)(0,1)(1,1)(2,1) | (1,0)(1,1)(2,1)(1,2) | (0,1)(1,1)(2,1)(1,2) | (1,0)(0,1)(1,1)(1,2) |
| S | (1,0)(2,0)(0,1)(1,1) | (1,0)(1,1)(2,1)(2,2) | (1,1)(2,1)(0,2)(1,2) | (0,0)(0,1)(1,1)(1,2) |
| Z | (0,0)(1,0)(1,1)(2,1) | (2,0)(1,1)(2,1)(1,2) | (0,1)(1,1)(1,2)(2,2) | (1,0)(0,1)(1,1)(0,2) |
| J | (0,0)(0,1)(1,1)(2,1) | (1,0)(2,0)(1,1)(1,2) | (0,1)(1,1)(2,1)(2,2) | (1,0)(1,1)(0,2)(1,2) |
| L | (2,0)(0,1)(1,1)(2,1) | (1,0)(1,1)(1,2)(2,2) | (0,1)(1,1)(2,1)(0,2) | (0,0)(1,0)(1,1)(1,2) |

**SRS 월킥** (화면 좌표 y 아래 +. Tetris Wiki 표에서 y 부호만 반전 — `srs.test.ts`에 wiki 원본을 넣고 반전 일치 검증). 5개 순서대로 시도, 첫 성공 적용, 전부 실패 시 무변화·락 리셋 없음.

```
JLSTZ  0→R (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)   R→0 (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)
       R→2 (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)   2→R (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)
       2→L (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)   L→2 (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)
       L→0 (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)   0→L (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)
I      0→R (0,0)(-2,0)(+1,0)(-2,+1)(+1,-2)   R→0 (0,0)(+2,0)(-1,0)(+2,-1)(-1,+2)
       R→2 (0,0)(-1,0)(+2,0)(-1,-2)(+2,+1)   2→R (0,0)(+1,0)(-2,0)(+1,+2)(-2,-1)
       2→L (0,0)(+2,0)(-1,0)(+2,-1)(-1,+2)   L→2 (0,0)(-2,0)(+1,0)(-2,+1)(+1,-2)
       L→0 (0,0)(+1,0)(-2,0)(+1,+2)(-2,-1)   0→L (0,0)(-1,0)(+2,0)(-1,-2)(+2,+1)
```

**중력표** (초/행): L1 1.000 · L2 0.793 · L3 0.618 · L4 0.473 · L5 0.355 · L6 0.262 · L7 0.190 · L8 0.135 · L9 0.094 · L10 0.064 · L11 0.043 · L12 0.028 · L13 0.018 · L14 0.011 · L15 0.007 · … L20+ 고정. `gravityAcc += dt/1000 × (softDrop ? 20 : 1) / secPerRow(L)`, 정수 부분만큼 낙하.

**락 딜레이**: 착지 중 `lockTimer += dt`, 500ms에 락. 이동/회전 성공 시 `lockResets < 15`면 타이머 0·카운터++. 턱에서 미끄러져 공중이면 타이머 0. 새 최저 행 도달 시 카운터 0.

**DAS 컨트롤러**(순수 `das.ts`): 방향 전환/첫 입력 즉시 1회 + DAS 재시작, `dasTimer ≥ 167`부터 ARR 33ms마다(완충 순간 즉시 1회), 양키 동시 → 최근 키, 떼면 남은 키로 재시작, ARR 0 → 벽까지. 회전/홀드/하드드롭은 `takePress`(IRS/IHS 없음).

**점수/콤보/B2B**: `base = [0,100,300,500,800][n] × level`; `difficult = n===4 || tspin`; B2B면 `floor(base×1.5)`; `b2b = difficult`(일반 클리어가 끊음, 클리어 없는 락은 안 끊음); `combo++`(스폰 −1, 클리어 없는 락에서 −1), `combo ≥ 1`이면 `+50×combo×level`.

**블록 색**: 팔레트 7색을 base로, light/dark는 `color-mix` 또는 수동(I `#4FD6E8/#A8EEF7/#2A93B0`, O `#FFD166/#FFE9A8/#B8912E`, T `#C792EA/#E6C6FA/#8A5BBF`, S `#9BE564/#D2F7A6/#5EA83E`, Z `#FF5E5B/#FF9E8A/#C13B49`, J `#6E9BFF/#B5CBFF/#3F63C2`, L `#FFA94D/#FFD2A0/#C2742A`). 보드 배경 `--bg-0`, 격자 `--bg-1`.

**테스트 19**: ① 모든 (type,rot) 셀 4개·중복 없음 ② CW×4 원형, CW→CCW 원형 ③ 킥 8전이×5, wiki 반전 일치 ④ I 좌벽 R→0 (+2,0), T 바닥 0→R (−1,−1), 전부 실패 시 불변 ⑤ 7-bag 70개 분포·seed ⑥ 큐 ≥5 ⑦ 스폰 (3,2)+drop→y3, block out ⑧ 홀드 첫/교환/2회 거부/락 후 해제 ⑨ 고스트 Y ⑩ 중력(L1=1, L10≈0.0642, 20+ 클램프), 1000ms에 1행 ⑪ 소프트 20배·1점, 하드 2점·즉시 락 ⑫ 락 딜레이 500ms·리셋·15회·새 최저 행·턱 ⑬ 클리어 1~4줄·비연속·collapse ⑭ 점수(single lv1 100, tetris lv2 1600, B2B 1200, 끊김, 콤보 +50/+100, 리셋) ⑮ 레벨업·startLevel ⑯ lock out ⑰ clearing 310ms 입력 무시 ⑱ 결정성 스냅샷 ⑲ DAS 타이밍.

## 부록 C. SFX 레시피 (`app/audio/sfx.ts`)

| id | 파형 | 스텝 (Hz/ms) | 비고 |
|---|---|---|---|
| select | square | 880/25 | 메뉴 이동, gain 0.08 |
| confirm | square | 660/60 → 990/90 | |
| back | square | 440/60 → 330/90 | |
| deny | square | 200/60 | 잠긴 카드·홀드 거부 |
| reveal | triangle | 880/25 | gain 0.1 |
| flood | triangle | 660/30 → 880/30 → 1100/40 | 연쇄 열림 |
| flag | square | 523/40 → 784/40 | |
| boom | noise | 800/350 slide↓ | gain 0.5, lowpass |
| win | square | 523/90 → 659/90 → 784/90 → 1047/240 | |
| move | square | 2000/15 | gain 0.05 |
| rotate | triangle | 900/20 → 1200/25 | |
| drop | square | 300/40 slide↓ | 하드드롭 |
| lock | noise | 2000/40 | gain 0.2 |
| clear | square | 784/60 → 1047/100 | |
| tetris | square | 659/70 → 784/70 → 988/70 → 1319/220 | |
| levelup | triangle | 523 → 659 → 784 → 1047 (60ms) → 1319/150 | |
| gameover | triangle | 440/150 → 349/150 → 262/400 | |

## 부록 D. 스프라이트 형식 & 펑이 실증

```ts
type PaletteRef = '$base' | '$dark' | '$light' | '$ink' | '$white'
interface SpriteDef { id: string; w: number; h: number; rows: string[]          // '.' = 투명, 행 길이 = w
  palette: Record<string, `#${string}` | PaletteRef>; anchor?: Point; points?: Record<string, Point> }
interface Raster { w: number; h: number; data: Uint8Array /* 0 투명, n = colors[n-1] */; colors: string[] }
interface Clip { frames: Raster[]; fps: number; loop: boolean }
interface CharacterDef { id; name; bio; personality; accent: { base; dark; light }; body: SpriteDef /*24×24*/
  idle: { kind: 'squash'|'bob'; row?: number }; faces?: Partial<Record<Mood|'blink', SpriteDef>>; lines: LineTable }
```

펑이 몸통 24×24 (얼굴 없음; `k`=$ink, `r`=$base, `d`=$dark, `h`=$light, `c` 뚜껑 `#7C88B8`, `t` 심지 `#B4BDDC`, `s` 불꽃 `#FFD166`, `o` `#FFA94D`; `points: face(6,12) side(19,7) head(2,-4) think(-3,-2)`; `idle: squash row 16`):

```
................s.......      .........kkkkkk.........   (8)
...............sos......      .......kkhhrrrrkk.......   (9)
...............ts.......      ......krhhrrrrrrrk......
.............tt.........      .....krhhrrrrrrrrrk.....
............t...........      .....krrrrrrrrrrrrk.....   (12) ← face 타일 좌상단 (6,12)
..........kkkk..........      ....krrrrrrrrrrrrrrk....
.........kcccck.........      ....krrrrrrrrrrrrrdk....   ×4 (14~17), 16행 = squash
.........kcccck.........      .....krrrrrrrrrrddk.....   (19)
  (0~7행)                     .....krrrrrrrrrdddk.....
                              ......krrrrrrddddk......
                              .......kkddddddkk.......
                              .........kkkkkk.........   (23)
```

공용 얼굴 타일 12×8 idle (`w`=$white, `k`=$ink, 볼터치 `p`=`#FF8FB1`는 3단계에서 5행 양끝에 추가):
```
..ww....ww..      worried:  ............      sweat 4×6 (b=#6E9BFF, w=$white):
.wwww..wwww.                .wwww..wwww.      ..b.
.wkkw..wkkw.                .kkww..kkww.      ..b.
.wkkw..wkkw.                .kkww..kkww.      .bbb
..ww....ww..                ..ww....ww..      bwbb
............                ............      bbbb
...k....k...                ...kk..kk...      .bb.
....kkkk....                .....kk.....
```
읽히는 요소: 지름 16dp 둥근 빨간 몸, 좌상단 하이라이트 띠, 우하단 음영, 회색 뚜껑+대각 심지+노란 불꽃, 4×5 흰자·2×2 동공의 큰 눈, 4dp 미소. 프레임 B(squash 16행)는 불꽃·뚜껑·눈이 1dp 내려오고 입·바닥은 그대로 → 숨쉬는 폭탄. 3단계에서 이 기준으로 나머지 3마리를 만들고 §3.1 기준(볼터치·하이라이트 눈)을 전부 적용해 검수받는다.
