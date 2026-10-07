# 02 · 디자인 시스템 & 도트 캐릭터 파이프라인 설계서

> 설계 단계(2026-10-07) 참고 문서. 최종 결정·단계 계획은 `docs/00-plan.md`가 우선한다. 이 문서는 팔레트·타이포·픽셀 UI 기법·화면 와이어프레임·스프라이트 파이프라인·캐릭터 시안·마스코트 시스템의 상세 근거를 담는다. (원안은 vanilla DOM 기준으로 쓰였으며, React 적용 방식은 `01-architecture.md` 참고.)

결정 원칙 세 가지:
1. **모든 치수는 "디자인 픽셀(dp)" 단위로 정의하고, CSS 변수 `--u`(1dp가 몇 CSS px인지) 하나로 전체 UI를 정수 배율 확대한다.** 폰트 크기, 여백, 테두리 두께, 스프라이트 배율이 전부 `--u`의 정수배이므로 어떤 화면에서도 도트가 깨지지 않는다.
2. **캐릭터의 몸통 색 = 캐릭터의 accent 색.** 캐릭터를 고르면 UI 전체가 그 몸통 색으로 물드는 것이 직관적이고, 팔레트도 한 벌로 끝난다.
3. **게임 모듈은 "무드"가 아니라 "이벤트"를 던진다.** 어떤 캐릭터가 어떤 표정과 대사로 반응할지는 마스코트 시스템이 결정하므로, 게임을 추가해도 캐릭터 코드를 건드리지 않는다.

---

## A. 디자인 시스템

### A1. 컬러 팔레트 (UI 토큰 19색)

**중성색 램프 (배경 → 텍스트)**

| 토큰 | HEX | 용도 |
|---|---|---|
| `--ink` | `#0D1020` | 스프라이트 외곽선, 하드 섀도, 오버레이 딤(알파 적용). 넓은 면에는 쓰지 않음 |
| `--bg-0` | `#141A2E` | 페이지 배경 |
| `--bg-1` | `#1C2440` | 패널 배경, 게임 캔버스 주변 레터박스, 지뢰찾기 "열린 셀" |
| `--bg-2` | `#27305A` | 카드/버튼 기본 면 |
| `--bg-3` | `#354074` | hover 면, 지뢰찾기 "안 열린 셀", 마스코트 발판 |
| `--line-0` | `#4C5A94` | 기본 테두리 |
| `--line-1` | `#7C88B8` | 베벨 하이라이트, 비활성(disabled) 텍스트, 지뢰 숫자 8 |
| `--text-1` | `#B4BDDC` | 보조 텍스트, 힌트 |
| `--text-0` | `#F4F1E8` | 기본 텍스트(웜 화이트) |
| `--white` | `#FFFFFF` | 스프라이트 눈 흰자/반짝임 전용. UI 텍스트에는 사용 금지(눈부심) |

**유채색 9색**

| 토큰 | HEX | 주 용도 |
|---|---|---|
| `--red` | `#FF5E5B` | 펑이 accent, danger, 지뢰 숫자 3, 테트리스 Z |
| `--orange` | `#FFA94D` | 지뢰 숫자 5, 테트리스 L, 불꽃 |
| `--yellow` | `#FFD166` | warning, 별/하이라이트, 테트리스 O, 불꽃 |
| `--lime` | `#9BE564` | 말랑이 accent, success, 지뢰 숫자 2, 테트리스 S |
| `--teal` | `#3FBFB2` | 지뢰 숫자 6 |
| `--cyan` | `#4FD6E8` | 큐보 accent, 테트리스 I |
| `--blue` | `#6E9BFF` | info, 지뢰 숫자 1, 테트리스 J, 땀방울 |
| `--purple` | `#C792EA` | 달냥 accent, 지뢰 숫자 4, 테트리스 T |
| `--pink` | `#FF8FB1` | 볼터치, 하트/보너스 |

유채색 7색(red/orange/yellow/lime/cyan/blue/purple)이 정확히 테트로미노 7종의 관례 색(Z/L/O/S/I/J/T)과 1:1 대응하므로 테트리스는 별도 팔레트가 필요 없다.

**시맨틱 별칭**

```css
--danger: var(--red);  --success: var(--lime);  --warning: var(--yellow);  --info: var(--blue);
--accent: ...; --accent-dark: ...; --accent-light: ...;   /* 캐릭터 선택 시 JS가 주입 */
--accent-text: var(--accent-light);                       /* 작은 글자에 accent를 쓸 때 */
--accent-ink: var(--ink);                                 /* accent 채움 위의 글자색 */
--focus: var(--accent);
```

**지뢰찾기 숫자 1–8 (어두운 배경용 재해석)**

| 숫자 | 클래식 | 이 팔레트 | 열린 셀 `--bg-1` 대비 |
|---|---|---|---|
| 1 | 파랑 | `--blue` | ≈5.7:1 |
| 2 | 초록 | `--lime` | ≈10:1 |
| 3 | 빨강 | `--red` | ≈5.1:1 |
| 4 | 남색 | `--purple` (남색은 어두운 배경에서 죽으므로 보라로) | ≈6.3:1 |
| 5 | 적갈 | `--orange` | ≈8:1 |
| 6 | 청록 | `--teal` | ≈6.8:1 |
| 7 | 검정 | `--text-0` (검정의 반전) | ≈12.8:1 |
| 8 | 회색 | `--line-1` | ≈4.4:1 (희귀, 굵은 글리프라 허용) |

지뢰/깃발 아이콘: 지뢰 몸통은 `--line-1` + `--text-0` 하이라이트(검정 지뢰는 어두운 셀에서 사라짐), 밟은 지뢰 셀 배경은 `--red` 위에 `--ink` 지뢰. 깃발은 `--red` 천 + `--text-0` 깃대.

**대비 고려 (WCAG 상대휘도 기준 근사값)**

| 색 | `--bg-0` 위 | `--bg-2` 위 | `--ink` 글자를 올렸을 때 |
|---|---|---|---|
| `--text-0` | 15.3 | 11.2 | – |
| `--text-1` | 9.2 | 6.8 | – |
| `--line-1` | 5.0 | 3.7 | – |
| `--red` | 5.7 | 4.2 | 6.3 |
| `--cyan` | 9.9 | 7.3 | 10.9 |
| `--lime` | 11.3 | 8.3 | 12.4 |
| `--purple` | 7.2 | 5.3 | 7.8 |
| `--yellow` | 12.0 | 8.8 | 13.1 |
| `--blue` | 6.4 | 4.7 | – |

규칙:
- 본문 텍스트는 `--text-0`/`--text-1`만 사용. `--line-1`은 disabled 전용.
- **accent로 채운 버튼의 글자는 흰색이 아니라 `--ink`**. 네 accent 모두 `--ink`와 6.3:1 이상이고, 흰 글자는 lime/cyan/yellow 위에서 2:1 미만.
- 가장 약한 accent는 red(카드 위 4.2:1). 작은 accent 글자는 항상 `--accent-text`(= light 변형), base는 테두리·채움·커서에만.
- 스캔라인 오버레이는 대비를 최대 25% 깎는다. 기본 꺼짐.

**캐릭터 accent 3단 (스프라이트 음영 겸용)**

| 캐릭터 | base (`--accent`) | dark | light |
|---|---|---|---|
| 펑이 | `#FF5E5B` | `#C13B49` | `#FF9E8A` |
| 큐보 | `#4FD6E8` | `#2A93B0` | `#A8EEF7` |
| 말랑이 | `#9BE564` | `#5EA83E` | `#D2F7A6` |
| 달냥 | `#C792EA` | `#8A5BBF` | `#E6C6FA` |

### A2. 타이포그래피

| | Galmuri (npm `galmuri`) | 둥근모꼴 / Neo둥근모 |
|---|---|---|
| 크기 체계 | 4단: Galmuri7/9/11/14 + Mono 7/9/11. Galmuri11은 Regular/Bold/Condensed | 단일 16px |
| 네이티브 em 크기 | **8 / 10 / 12 / 15 px** (패밀리명은 글리프 높이, em은 1px 더 큼 — 정수 배율 계산의 기준) | 16px |
| 글리프 | 한글 11,172자 전부 + 가나 + JIS 한자 + Latin-1 | 원본 2,350자 / Neo 11,172자 |
| 라이선스 | OFL 1.1 | 무료 배포 / OFL 1.1 |
| 로딩 | `import 'galmuri/dist/galmuri.css'`. 9개 `@font-face`(woff2+ttf), `font-display: swap`, unicode-range 서브셋 **없음** | CDN |

**결정: Galmuri 단일 패밀리 체계.** 역할별로 크기가 다른 비트맵이 필요한데 둥근모꼴은 한 사이즈뿐이다.

**역할별 배정 (`--u` = 1dp의 CSS px, 기본 2px)**

| 역할 | 패밀리 | `font-size` | `line-height` | u=2 | u=3 |
|---|---|---|---|---|---|
| Display(타이틀 로고) | Galmuri14 | 30u | 36u | 60/72 | 90/108 |
| H1(화면 제목) | Galmuri14 | 15u | 18u | 30/36 | 45/54 |
| H2(카드 제목, 버튼) | Galmuri11 `font-weight:700` | 12u | 14u | 24/28 | 36/42 |
| Body(메뉴, 말풍선, 설명) | Galmuri11 | 12u | 14u | 24/28 | 36/42 |
| Small(힌트, 라벨) | Galmuri9 | 10u | 12u | 20/24 | 30/36 |
| Caption(푸터, 버전) | Galmuri7 | 8u | 10u | 16/20 | 24/30 |
| Number(HUD 점수·시간) | GalmuriMono11 | 12u | 14u | 24/28 | 36/42 |
| Number-L(결과 화면 숫자) | GalmuriMono11 | 24u | 28u | 48/56 | 72/84 |

- 숫자는 반드시 Mono: 타이머가 흐를 때 글자 폭이 흔들리지 않는다.
- 게임 캔버스 안의 숫자(지뢰 1–8)는 폰트를 쓰지 않고 **5×7 숫자 스프라이트**를 그린다.

**로딩 전략**
1. `main.tsx`에서 `import 'galmuri/dist/galmuri.css'`. Vite가 참조된 woff2를 자동 번들.
2. `font-display: swap` 때문에 FOUT가 난다. **부트 화면**(`--bg-0` 단색 + 깜빡이는 작은 사각형)에서 `document.fonts.load('12px Galmuri11')`, `'10px Galmuri9'`, `'12px GalmuriMono11'`, `'15px Galmuri14'`를 `Promise.all`로 기다린 뒤 타이틀을 그린다. `index.html`에 네 파일 `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
3. 서브셋이 없어 각 패밀리가 MB급이다. 2차 최적화로 한글 2,350자+Latin 서브셋(`pyftsubset`)을 직접 만들고, **대사 테이블의 모든 글자가 서브셋에 포함되는지 검사하는 단위 테스트**를 둔다.

**렌더링 설정 (전역)**

```css
html {
  font-family: Galmuri11, sans-serif;
  font-size: calc(12 * var(--u));
  line-height: calc(14 * var(--u));
  -webkit-font-smoothing: none;     /* macOS에서만 효과. Windows는 CSS로 AA를 끌 수 없음 */
  text-rendering: optimizeSpeed;
  font-kerning: none;
  letter-spacing: 0;
  font-synthesis: none;             /* 가짜 볼드/이탤릭이 도트를 뭉개는 것을 원천 차단 */
}
```

Windows Chrome은 가로 서브픽셀 글리프 배치를 하므로 100% 보장은 없다. 할 수 있는 최선은 (a) 정수 배율 크기, (b) 텍스트 컨테이너에 소수 좌표 transform 금지, (c) A3의 DPR 보정 `--u`.

### A3. 픽셀 UI CSS 기법

**기본 단위와 간격 스케일**

```css
:root { --u: 2px; }                                         /* 1dp */
@media (min-width: 1800px) and (min-height: 1000px) { :root { --u: 3px; } }
html[data-ui="2"] { --u: 2px; }  html[data-ui="3"] { --u: 3px; }   /* 설정 화면 강제값 */

:root {
  --sp-1: calc(1 * var(--u));  --sp-2: calc(2 * var(--u));  --sp-4: calc(4 * var(--u));
  --sp-6: calc(6 * var(--u));  --sp-8: calc(8 * var(--u));  --sp-12: calc(12 * var(--u));
  --sp-16: calc(16 * var(--u)); --sp-24: calc(24 * var(--u)); --sp-32: calc(32 * var(--u));
}
canvas, img.sprite { image-rendering: pixelated; }
```

DPR 보정: 부트 시와 `matchMedia('(resolution: Ndppx)')` 변경 시 JS가 `--u`를 **디바이스 픽셀 정수배**로 재설정한다. 예: 기본 2, DPR 1.25 → 2×1.25=2.5 → 반올림 3 디바이스px → `--u: 2.4px`. 12u 폰트(28.8px)는 디바이스 36px = 네이티브 3배로 떨어져 선명하다. 캔버스 배율도 같은 정수를 공유한다.

**픽셀 테두리 — 세 기법 비교와 결정**

| 기법 | 장점 | 단점 | 결정 |
|---|---|---|---|
| `box-shadow` 적층 | 에셋 0, `var(--accent)`로 즉시 재색상, `--u` 연동, 베벨·드롭섀도까지 레이어로 표현 | 레이아웃에 포함되지 않아 여백 확보 필요, 복잡한 장식 불가 | **모든 일반 UI 채택** |
| `border-image` 9-slice | 장식 프레임 가능 | 이미지 필요(런타임 `toDataURL`), 색 바꾸려면 재생성 | **로고 프레임·말풍선·결과 다이얼로그 3곳만.** 현재 `--u×dpr` 배율로 미리 확대해 생성 |
| `clip-path` | 그라데이션 배경도 깎을 수 있음 | 테두리를 못 그림 | 와이프 전환 애니메이션에만 |

버튼 레시피(1dp 테두리 + 베벨 + 2dp 하드 섀도):

```css
.btn {
  background: var(--bg-2); color: var(--text-0); border: 0;
  padding: var(--sp-2) var(--sp-6); margin: var(--sp-2);   /* 섀도 공간 */
  box-shadow:
    0 calc(-1*var(--u)) 0 0 var(--line-0),  0 var(--u) 0 0 var(--line-0),
    calc(-1*var(--u)) 0 0 0 var(--line-0),  var(--u) 0 0 0 var(--line-0),
    inset var(--u) var(--u) 0 0 var(--line-1),
    inset calc(-1*var(--u)) calc(-1*var(--u)) 0 0 var(--ink),
    calc(2*var(--u)) calc(2*var(--u)) 0 0 var(--ink);
  transition: none;                                           /* 눌림은 즉시 */
}
.btn:active, .btn[aria-pressed="true"] {
  transform: translate(calc(2*var(--u)), calc(2*var(--u)));
  box-shadow: /* 4방향 테두리 동일 */ ...,
    inset var(--u) var(--u) 0 0 var(--ink), inset calc(-1*var(--u)) calc(-1*var(--u)) 0 0 var(--line-1);
}
.btn.primary { background: var(--accent); color: var(--accent-ink); }
.btn:disabled { color: var(--line-1); background: var(--bg-1); box-shadow: 0 0 0 var(--u) var(--line-0); }
```

**포커스 링과 메뉴 커서**

마우스 hover와 키보드 포커스가 완전히 같은 모양이어야 한다. `:focus-visible` 휴리스틱은 마우스 포커스를 제외하므로 쓰지 않고, `FocusGroup`이 `.is-focused` 클래스를 관리한다.

```css
[data-nav].is-focused { outline: calc(2*var(--u)) solid var(--focus); outline-offset: calc(2*var(--u)); }
.menu > [data-nav].is-focused::before {              /* ▶ 커서 스프라이트(8×8dp, 데이터 URL) */
  content: ''; position: absolute; left: calc(-12*var(--u));
  width: calc(8*var(--u)); height: calc(8*var(--u));
  background: var(--cursor-img) 0 0 / 100% 100%;
  animation: px-blink 600ms step-end infinite;
}
```

**스텝 전환, 깜빡임**

```css
.card { transition: transform 120ms steps(2, jump-end); }
.card.is-focused { transform: translateY(calc(-2*var(--u))); }
@keyframes px-blink { 0%, 49.99% { visibility: visible; } 50%, 100% { visibility: hidden; } }
.press-start { color: var(--accent); animation: px-blink 1s step-end infinite; }
@media (prefers-reduced-motion: reduce) { .press-start { animation: none; } * { transition-duration: 0ms !important; } }
```

`opacity`나 `transform`을 보간하면 중간 프레임에서 도트가 반투명·소수 좌표로 뭉개진다. 모든 모션은 `steps()`/`step-end`이고, 이동 거리는 `--u`의 정수배로만 쓴다.

**스캔라인/CRT 오버레이 (토글, 기본 꺼짐)**

```css
html[data-crt="on"] body::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999;
  background:
    repeating-linear-gradient(to bottom, rgba(13,16,32,.22) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 55%, rgba(13,16,32,.45) 100%);
}
```

`backdrop-filter`·`mix-blend-mode`는 쓰지 않는다(전체 화면 합성 비용).

**화면 전환**: 고정 오버레이 `#fx`(`--ink` 단색) 하나로 `fade`(`opacity 0→1` 180ms `steps(4)` → DOM 교체 → `1→0`) / `wipe`(`clip-path: inset(0 100% 0 0)` → `inset(0)` 240ms `steps(8)`, 게임 시작 시).

### A4. 화면 레이아웃

**공통 입력 규약**

| 키 | 메뉴/오버레이 | 지뢰찾기 | 테트리스 |
|---|---|---|---|
| ←→↑↓ | 포커스 이동(그리드는 2D 탐색, 끝에서 멈춤) | 키보드 커서 이동 | ←→ 이동, ↓ 소프트드롭, ↑ 회전 |
| Enter / Z / Space | 확인 | Enter·Z 열기, Space 코드 | Z 반시계 회전, Space 하드드롭 |
| Esc | 뒤로·닫기 | 일시정지 | 일시정지 |
| X | 취소(= Esc) | 깃발 토글 | 시계 회전 |
| C / Shift | – | – | 홀드 |
| R | 기록(로비), 다시하기(결과) | 재시작 | 재시작 |
| S | 설정(타이틀/로비) | – | – |

마우스: hover 시 포커스가 따라옴(`pointermove` → `FocusGroup.focus(item)`), 클릭 = 확인, 지뢰찾기 우클릭 = 깃발, 양클릭 = 코드. 오버레이가 열리면 포커스는 오버레이 안에 가둔다.

`FocusGroup` API: `new FocusGroup(root, { mode: 'list' | 'grid', wrap: false })`, `focus(el)`, `move(dir)`, `onConfirm(cb)`, `onCancel(cb)`. 포커스된 항목에 `.is-focused` + `aria-selected`.

**타이틀**

```
┌────────────────────────────────────────────────────────────────┐
│               ╔════════════════════════════════╗               │
│               ║   도 트   아 케 이 드              ║   Display 30u, text-shadow 2단(--ink), 9-slice 프레임(--accent)
│               ╚════════════════════════════════╝               │
│        [펑이]       [큐보]       [말랑이]       [달냥]           │   4개 Animator, 2u, idle 위상 각각 다르게
│                       ▶ PRESS START ◀                          │   px-blink, --accent
│   v0.1        S 설정        R 기록                               │   Caption, --text-1
└────────────────────────────────────────────────────────────────┘
```

아무 키/클릭 → 저장된 캐릭터가 있으면 로비, 없으면 캐릭터 선택. 타이틀 로고는 v1에서는 텍스트(Galmuri14)로 가고, 전용 로고 스프라이트는 후순위.

**캐릭터 선택**

```
┌────────────────────────────────────────────────────────────────┐
│ ◀ Esc 타이틀                 캐릭터 선택                         │
├──────────────────────────┬─────────────────────────────────────┤
│  ┌────────┐ ┌────────┐   │   ┌────────────────┐                │
│  │ ▶      │ │        │   │   │                │   펑이          │  H1, --accent-text
│  │ (펑이)  │ │ (큐보)  │   │   │   3u 프리뷰     │   "터지기 싫어서 │
│  │   2u   │ │   2u   │   │   │   idle 재생     │    지뢰를 찾는   │
│  └────────┘ └────────┘   │   │                │    폭탄"        │
│  ┌────────┐ ┌────────┐   │   └────────────────┘                │
│  │        │ │        │   │   성격   허세 많은 겁쟁이             │
│  │(말랑이) │ │ (달냥)  │   │   전문   지뢰찾기                   │
│  │   2u   │ │   2u   │   │   컬러   ■ #FF5E5B                  │
│  └────────┘ └────────┘   │   [ 이 캐릭터로 시작   Enter / Z ]    │  .btn.primary
├──────────────────────────┴─────────────────────────────────────┤
│  ←→↑↓ 이동    Enter/Z 선택    Esc/X 뒤로                         │
└────────────────────────────────────────────────────────────────┘
```

포커스가 옮겨질 때마다 `--accent`를 **즉시 미리보기**로 바꿔 화면 전체가 그 캐릭터 색으로 물든다(확정 전까지는 미저장, Esc로 나가면 원래 값 복구). 포커스된 카드의 캐릭터는 `happy`, 나머지는 `idle`.

**로비**

```
┌────────────────────────────────────────────────────────────────┐
│ ◀ Esc 캐릭터 변경           게임 선택            [기록 R] [설정 S] │
├────────────────────────────────────────┬───────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │  ┌──────────────────┐ │
│  │ ▶ 지뢰찾기     │  │   테트리스     │    │  │ 지뢰찾기는        │ │  말풍선: 포커스된 게임에 대한 대사
│  │  (아이콘 1u)  │  │  (아이콘 1u)  │    │  │ 내 전공이야!      │ │
│  │  BEST 00:31  │  │  BEST 12,400 │    │  └────────┬─────────┘ │
│  └──────────────┘  └──────────────┘    │        (펑이 2u)      │
│  ┌──────────────┐  ┌──────────────┐    │         펑이          │
│  │ ░  COMING  ░ │  │ ░  COMING  ░ │    │  플레이 128회          │  Small, --text-1
│  │ ░  SOON 🔒 ░ │  │ ░  SOON 🔒 ░ │    │  클리어율 32%          │
│  └──────────────┘  └──────────────┘    │                       │
├────────────────────────────────────────┴───────────────────────┤
│  ←→↑↓ 이동    Enter/Z 시작    Esc/X 뒤로                         │
└────────────────────────────────────────────────────────────────┘
```

잠긴 슬롯: 1dp 체커 디더(`repeating-conic-gradient(var(--bg-1) 0 25%, var(--bg-2) 0 50%) 0 0 / calc(2*var(--u)) calc(2*var(--u))`) + 자물쇠 스프라이트(8×10dp) + Galmuri9 "COMING SOON". 포커스는 되지만(마스코트가 "아직 준비 중이야" 반응) Enter 시 ±1u 좌우 흔들림 `steps(4)`로 거부. 게임 목록은 `GameRegistry` 배열에서 렌더링되므로 게임 추가 = 모듈 등록 한 줄.

**게임 화면 공통 프레임 (wide ≥ 1280px)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◀ Esc 로비   지뢰찾기 · 중급 16×16          ⏱ 00:42   ⚑ 10/40   [II]   │  hud: hud-left | hud-center | hud-right
├──────────────┬──────────────────────────────────┬────────────────────┤
│  PANEL(게임)  │                                  │  MASCOT            │
│              │   ┌──────────────────────────┐    │  ┌──────────────┐  │
│  (선택)       │   │       GAME CANVAS        │    │  │ 거기 진짜     │  │  bubble (border-image 9-slice,
│              │   │   정수 배율, 레터박스,     │    │  │ 괜찮아?      │  │   꼬리는 ::after 스프라이트)
│              │   │   1dp 픽셀 프레임          │    │  └──────┬───────┘  │
│              │   │                          │    │      (펑이 2u)     │  32×32dp 스테이지
│              │   └──────────────────────────┘    │  BEST   00:31      │  Number
│              │                                  │  NEW RECORD! ✦     │  px-blink, 갱신 시에만
├──────────────┴──────────────────────────────────┴────────────────────┤
│  좌클릭 열기 · 우클릭 깃발 · Space 코드 · Esc 일시정지                      │  footer: 게임이 제공하는 조작 힌트
└──────────────────────────────────────────────────────────────────────┘
```

마스코트 패널은 프레임 소유이며 게임은 `mascot.react()`만 호출한다. 클래식 지뢰찾기의 스마일 버튼은 마스코트 얼굴이 대신한다(셀을 누르고 있는 동안 `worried`).

**일시정지 오버레이**: H1 "일시정지", 메뉴(계속하기 Esc / 다시 시작 R / 설정 / 로비로). 배경 `rgba(13,16,32,.72)` 딤, 캔버스는 `visibility:hidden`(일시정지 중 보드 관찰 방지), 마스코트는 think.

**결과 오버레이**: "★ 클리어! ★"(--lime) / "게임 오버"(--red), 마스코트 얼굴 2u(win/sad), Number-L 시간/점수 + 최고 + NEW RECORD ✦(갱신 시 px-blink + --accent), [다시하기 R] [로비 Esc].

**기록**: 게임 탭(←→) → 난이도 필터 → `#  캐릭터(1u)  기록  날짜` 표 → 플레이/클리어/클리어율 → [기록 초기화].

**설정**: UI 크기(자동/2×/3×) · CRT 효과 · 마스코트 수다(조용/보통/수다쟁이) · 움직임 줄이기(시스템/켬) · 사운드 · 조작키 보기 · 기록 초기화. ↑↓ 항목, ←→ 값 변경, Esc 저장 후 닫기.

### A5. 반응형

**게임 캔버스 배율**: 게임은 논리 크기(dp)만 선언한다. 게임 로직은 논리 크기의 오프스크린 캔버스에만 그리고, 프레임이 디스플레이 캔버스로 확대 복사한다.

```ts
const k = Math.max(1, Math.floor(Math.min(availW * dpr / logicalW, availH * dpr / logicalH)));
display.width  = logicalW * k;  display.height = logicalH * k;             // 디바이스 px (정수배)
display.style.width = `${logicalW * k / dpr}px`; display.style.height = `${logicalH * k / dpr}px`;
ctx.imageSmoothingEnabled = false; ctx.drawImage(offscreen, 0, 0, display.width, display.height);
```

`ResizeObserver`가 게임 영역 크기를 감시해 `k`를 재계산한다. 레터박스는 `--bg-1`, 캔버스 둘레에 1dp `box-shadow` 프레임. `k`는 UI의 `--u` 디바이스 배율과 같지 않아도 된다.

**브레이크포인트 (grid-template-areas)**

| 폭 | 구성 |
|---|---|
| ≥ 1280 (wide) | `"hud hud hud" / "panel board mascot" / "foot foot foot"`, 컬럼 `minmax(80u,1fr) auto minmax(100u,1fr)` |
| 960–1279 (medium) | `"hud hud" / "board mascot" / "panel panel" / "foot foot"` |
| < 960 (narrow) | 단일 컬럼 `"hud" / "strip" / "board" / "panel" / "foot"`. 마스코트는 **스트립**(1u 스프라이트 왼쪽 + 한 줄 말풍선 오른쪽, 높이 40u) |

최소 지원 폭 640px. 높이가 부족하면 캔버스 배율이 먼저 내려가고, 그래도 안 맞으면 세로 스크롤(HUD는 `position: sticky`).

---

## B. 도트 스프라이트 파이프라인

### B1. 데이터 형식

```ts
export type Hex = `#${string}`;                       // '#RRGGBB' 또는 '#RRGGBBAA'
export type PaletteRef = '$base' | '$dark' | '$light' | '$ink' | '$white';
export interface Point { x: number; y: number }

export interface SpriteDef {
  id: string;
  w: number; h: number;
  rows: string[];                                     // 길이 h, 각 행 길이 w, '.' = 투명
  palette: Record<string, Hex | PaletteRef>;          // 한 글자 키 → 색 또는 캐릭터 참조
  anchor?: Point;                                     // 기본 (floor(w/2), h) = 발 중심
  points?: Record<string, Point>;                     // face / side / think 등 오버레이 기준점(음수 허용)
}

export interface Layer { sprite: SpriteDef; at: Point; clear?: boolean }   // clear: 영역을 지우고 그림

export interface Raster {                             // compose 결과(문자열이 아닌 인덱스 버퍼)
  w: number; h: number; data: Uint8Array;             // 0 = 투명, n = colors[n-1]
  colors: Hex[];
}

export type Mood = 'idle' | 'happy' | 'worried' | 'sad' | 'win' | 'think';

export interface CharacterDef {
  id: 'peong' | 'cubo' | 'mallang' | 'dalnyang';
  name: string; bio: string; personality: string;
  accent: { base: Hex; dark: Hex; light: Hex };
  body: SpriteDef;                                    // 24×24
  idle: { kind: 'squash' | 'bob'; row?: number };     // 2프레임 생성 규칙
  faces?: Partial<Record<Mood | 'blink', SpriteDef>>; // 공용 얼굴 세트 오버라이드
  lines: LineTable;
}
```

`$base/$dark/$light`는 compose 시 `CharacterDef.accent`로 치환된다. 개발 시 검증: 모든 행 길이 = `w`, 모든 문자가 팔레트에 있음을 단위 테스트로 보장(`validateSprite`).

### B2. 크기 결정

| | 16×16 | 24×24 | 32×32 |
|---|---|---|---|
| 셀 수 / 작성 난이도 | 256, 매우 쉬움 | 576, 쉬움(행이 24자라 한눈에 읽힘) | 1,024, 본격 작화 필요 |
| 표정 표현 | 눈 2~3px, 6가지 무드 구분이 어려움 | 눈 4×5, 2×2 동공, 입 모양·땀·반짝이 배치 가능 | 매우 풍부하지만 작업량 3~4배 |
| 4캐릭터 × 6무드 × idle 2프레임 | 가능하지만 밋밋 | 몸통 4장 + 얼굴 7장 + 부속 5장이면 끝 | 몸통 4장이 큰 부담 |

**결정: 몸통 24×24, 합성 스테이지 32×32.** 몸통은 스테이지 (4,8)에 놓이므로 머리 위 8dp·좌우 4dp가 반짝이/생각 점/바운스 공간으로 남는다.

표시 배율(`--u` 배수; u=2 기준 CSS px):

| 용도 | 배율 | 몸통 크기 | 스테이지 크기 |
|---|---|---|---|
| 기록표·설정 소형 아이콘 (몸통만 크롭) | 1u | 48px | – |
| 로비 가이드, 게임 내 마스코트 패널, 타이틀 줄 | 2u | 96px | 128px |
| 캐릭터 선택 프리뷰 | 3u | 144px | 192px |

### B3. 레이어 합성

**레이어 구성 (스테이지 좌표 = 몸통 좌표 + (4,8))**
1. 몸통 base(캐릭터별 1장, 얼굴 없음)
2. 얼굴 타일 12×8 (`points.face`에 배치) — 무드별 7장(idle/happy/worried/sad/win/think/blink)은 **4캐릭터 공용**. 큐보처럼 네모 LED 눈이 필요하면 `faces` 오버라이드로 해당 무드만 교체
3. 부속(extras): `sweat` 4×6 (`points.side`), `sparkle` 5×5 ×2변형 (`points.head`), `dots` 7×3 ×3변형 (`points.think`), `tears`는 sad 얼굴 타일에 포함
4. 발 그림자 12×2 (`#0D1020AA`) — 알파 포함 HEX로 팔레트에 선언

무드 → 레이어 조합표:

| 무드 | 얼굴 | 부속 | 클립(fps) |
|---|---|---|---|
| idle | idle (4초마다 1프레임 blink) | – | 2프레임 2fps |
| happy | happy(^^ 눈, 벌린 입) | – | 2프레임 4fps |
| worried | worried(곁눈질, 물결 입) | sweat (프레임 B에서 1dp 아래) | 2프레임 3fps |
| sad | sad(처진 눈, 눈물) | – | 2프레임 1fps |
| win | win(별 눈, 활짝 웃음) | sparkle 교대 | 2프레임 4fps |
| think | think(옆 보는 눈, 작은 입) | dots `.`→`..`→`...` | 3프레임 2fps |

**idle 2프레임 생성(재작화 없음)**: 프레임 A = 합성 결과, 프레임 B = 합성 결과에 변환 적용.
- `squash(raster, row)`: 지정 행(몸통 좌표 `idle.row`, 보통 배 부근)을 삭제하고 맨 위에 빈 행을 삽입 → 발은 고정, 머리가 1dp 내려와 "숨 쉬는" 느낌. 펑이·말랑이·달냥.
- `bob(raster, -1)`: 전체를 1dp 위로 이동 → 떠다니는 느낌. 큐보(호버 로봇).
변환은 얼굴·부속을 포함한 합성 결과 전체에 걸기 때문에 기준점 보정이 필요 없다.

**compose 단계와 캐시**

```
compose(char, mood, frame)
  → stage Raster 32×32 (투명 초기화)
  → body blit at (4,8)  (팔레트 $ref 치환)
  → face blit at (4,8)+points.face
  → extras blit (variant = frame)
  → frame === 1 이면 squash/bob
  → composeCache.set(`${char}:${mood}:${frame}`, raster)
```

문자열 병합 대신 `Uint8Array` 인덱스 버퍼로 합성하므로 레이어 간 팔레트 키 충돌이 없다. 캐시 키는 `char:mood:frame` 48개가 전부이고, 래스터 하나가 1KB라 메모리는 무시해도 된다.

### B4. 렌더링

**래스터 → 캔버스 캐시**

```ts
rasterize(raster: Raster, scale: number): HTMLCanvasElement
  // 1) 1× ImageData를 만들어 putImageData
  // 2) scale× 크기의 캔버스에 imageSmoothingEnabled=false 로 drawImage 확대
  // 캐시: Map<`${rasterKey}@${scale}`, HTMLCanvasElement>, --u/dpr 변경 시 전체 clear
```

`scale`은 **디바이스 픽셀 기준 정수**다: `scale = k * uDevice`. 표시 캔버스는 `width/height`를 디바이스 px로, `style.width/height`를 `/dpr`로 둔다. 전역 `DisplayMetrics`가 `{ u, uDevice, dpr }`를 소유하고 변경 이벤트를 쏜다; 캐시와 Animator는 이를 구독한다.

**DOM 삽입 — 두 경로**

| 경로 | 쓰는 곳 | 이유 |
|---|---|---|
| `<canvas class="sprite">` + Animator | 타이틀 줄, 캐릭터 선택 프리뷰, 로비 가이드, 게임 마스코트, 결과 얼굴 | 애니메이션 프레임 교체가 `drawImage` 한 번, DOM 변경 없음 |
| `canvas.toDataURL()` → `<img>` 또는 CSS `url()` | 기록표 아이콘, 게임 카드 아이콘, 메뉴 커서(`--cursor-img`), 9-slice `border-image`, 자물쇠 등 정적 아이콘 | 인스턴스가 많아도 가볍고 CSS에서 바로 참조 가능 |

**Animator**: 전역 `Ticker` 하나가 `requestAnimationFrame`으로 등록된 Animator를 돌리며 `document.hidden`이면 멈춘다. 각 Animator는 `acc += dt`, `acc >= 1000/fps`일 때만 프레임을 넘기고, **프레임 인덱스가 바뀔 때만** `clearRect + drawImage(cached)`. 타이틀 화면의 네 캐릭터는 시작 위상을 `index * 250ms`로 어긋나게.

### B5. 캐릭터 4종

| | 펑이 | 큐보 | 말랑이 | 달냥 |
|---|---|---|---|---|
| 콘셉트 | 체리폭탄. 동그란 빨간 몸통, 회색 뚜껑, 짧은 심지와 노란 불꽃 | 블록 로봇. 각진 하늘색 몸통, 안테나, 네모 LED 눈, 몸통에 T블록 무늬 | 슬라임. 연두색 물방울형, 꼭지가 뾰족, 눈만 크고 입은 작음 | 밤고양이. 보라색, 뾰족 귀 두 개, 이마에 초승달, 반쯤 감은 눈 |
| 실루엣 | 원 + 위쪽 심지 | 사각 + 안테나 | 아래가 넓은 물방울 | 원 + 삼각 귀 |
| 성격 | 허세 많고 다혈질이지만 사실 겁쟁이 | 침착한 분석형, 수치를 인용하는 말투 | 느긋하고 긍정적, 의성어 많음 | 도도한 츤데레, 늘 졸림 |
| accent | `#FF5E5B` red | `#4FD6E8` cyan | `#9BE564` lime | `#C792EA` purple |
| 한 줄 소개 | 터지기 싫어서 누구보다 열심히 지뢰를 찾는 폭탄 | 최적해를 찾기 위해 만들어진 블록 정리 로봇 | 뭐든 말랑하게 받아넘기는 젤리 응원단장 | 달빛 아래서만 깨어 있는 고양이, 칭찬은 하루 한 번 |
| idle 변환 | squash(row 16) | bob | squash(row 14) | squash(row 15) |

**대사 테이블 (무드별 2개 예시; 실제 테이블은 3~4개, 마지막 2개 제외 무작위)**

| 무드 | 펑이 | 큐보 | 말랑이 | 달냥 |
|---|---|---|---|---|
| idle | "심심해… 뭐든 눌러 봐." / "오늘은 안 터질 거야. 아마도." | "대기 모드. 입력을 기다리는 중." / "블록 정렬 알고리즘 로드 완료." | "말랑말랑… 졸려…" / "나 여기 있어~ (출렁)" | "…냐암. (하품)" / "날 깨운 건 너냐옹?" |
| happy | "오, 거기! 거기 맞아!" / "이 정도면 나도 안심이지!" | "효율 98%. 훌륭한 배치." / "라인 삭제 확인. 기분 좋음(추정)." | "우와~ 잘한다 잘한다!" / "출렁출렁! 신난다~" | "흥, 제법이냐옹." / "…조금은 봐줄 만하다냥." |
| worried | "잠깐, 잠깐… 거기 진짜 괜찮아?" / "심지가 떨린다…" | "경고: 스택 높이 임계치 접근." / "계산이… 따라가지 못한다." | "어, 어… 괜찮은 거지…?" / "나 조금 굳는 것 같아…" | "야, 그거 아니지 않냐옹…?" / "꼬리가 곤두선다냥." |
| sad | "펑… 했구나…" / "내 사촌이 거기 있을 줄은…" | "오버플로우… 재부팅이 필요하다." / "결과 기록. 다음엔 더 나아질 것." | "흑… 녹아내릴 것 같아…" / "괜찮아, 다시 하면 되지… 흑." | "…그래서 내가 말했잖냐옹." / "하아… 낮잠이나 자야겠다냥." |
| win | "지뢰밭 정복! 역시 나야!" / "안 터졌다! 안 터졌다고!" | "테트리스! 이것이 최적해다." / "목표 달성. 자축 루틴 실행." | "해냈다~! 기뻐서 두 배로 커졌어!" / "최고야! 젤리 파티!" | "뭐, 당연한 결과다냥." / "오늘만 칭찬해 준다냥. 잘했다냥." |
| think | "흠… 숫자를 세어 보자." / "여기 아니면 저기인데…" | "다음 블록 예측 중…" / "회전 경우의 수: 4. 선택은 네 몫." | "음… 음… (출렁)" / "천천히 생각해도 돼~" | "달도 기다려 주지 않는다냥." / "…(꼬리를 흔든다)" |
| lobby:minesweeper | "지뢰찾기는 내 전공이야!" | "확률 계산은 내게 맡겨." | "조심조심… 터지면 나 튄다~" | "지뢰는 밟지 마라냥. 발 아프다냥." |
| lobby:tetris | "블록? 나도 둥근 블록이라고 치자." | "테트리스는 내 고향이지." | "네모네모 블록, 말랑이가 응원해~" | "고양이는 높은 곳을 좋아한다냥." |
| lobby:locked | "아직 심지에 불도 안 붙었어." | "모듈 미설치. 업데이트 대기." | "아직 말랑하게 익는 중이래~" | "기다리는 건 질색이다냥." |

### B6. 실증: 펑이 몸통 base + idle 얼굴 타일

몸통 24×24 (얼굴 없음, 좌표계 x→, y↓). 각 행 24자.

```ts
export const PEONG_BODY: SpriteDef = {
  id: 'peong.body', w: 24, h: 24,
  palette: {
    k: '$ink',      // 외곽선 #0D1020
    r: '$base',     // 몸통 #FF5E5B
    d: '$dark',     // 음영 #C13B49
    h: '$light',    // 하이라이트 #FF9E8A
    c: '#7C88B8',   // 뚜껑
    t: '#B4BDDC',   // 심지
    s: '#FFD166',   // 불꽃
    o: '#FFA94D',   // 불꽃 중심
  },
  points: { face: { x: 6, y: 12 }, side: { x: 19, y: 7 }, head: { x: 2, y: -4 }, think: { x: -3, y: -2 } },
  idle: { kind: 'squash', row: 16 },
  rows: [
    '................s.......',  //  0  불꽃
    '...............sos......',  //  1
    '...............ts.......',  //  2  심지 시작
    '.............tt.........',  //  3
    '............t...........',  //  4
    '..........kkkk..........',  //  5  뚜껑
    '.........kcccck.........',  //  6
    '.........kcccck.........',  //  7
    '.........kkkkkk.........',  //  8  몸통 상단
    '.......kkhhrrrrkk.......',  //  9  하이라이트 시작
    '......krhhrrrrrrrk......',  // 10
    '.....krhhrrrrrrrrrk.....',  // 11
    '.....krrrrrrrrrrrrk.....',  // 12  ← face 타일 top-left (6,12)
    '....krrrrrrrrrrrrrrk....',  // 13
    '....krrrrrrrrrrrrrdk....',  // 14  우하단 음영 시작
    '....krrrrrrrrrrrrrdk....',  // 15
    '....krrrrrrrrrrrrrdk....',  // 16  ← squash 행
    '....krrrrrrrrrrrrrdk....',  // 17
    '....krrrrrrrrrrrrrdk....',  // 18
    '.....krrrrrrrrrrddk.....',  // 19
    '.....krrrrrrrrrdddk.....',  // 20
    '......krrrrrrddddk......',  // 21
    '.......kkddddddkk.......',  // 22
    '.........kkkkkk.........',  // 23
  ],
};
```

공용 얼굴 타일 12×8:

```ts
export const FACE_IDLE: SpriteDef = {
  id: 'face.idle', w: 12, h: 8,
  palette: { w: '$white', k: '$ink' },
  rows: [
    '..ww....ww..',  // 눈 흰자 4×5 두 개, 동공 2×2
    '.wwww..wwww.',
    '.wkkw..wkkw.',
    '.wkkw..wkkw.',
    '..ww....ww..',
    '............',
    '...k....k...',  // 미소
    '....kkkk....',
  ],
};

export const FACE_WORRIED: SpriteDef = {
  id: 'face.worried', w: 12, h: 8,
  palette: { w: '$white', k: '$ink' },
  rows: [
    '............',  // 눈이 1dp 눌림(불안)
    '.wwww..wwww.',
    '.kkww..kkww.',  // 곁눈질
    '.kkww..kkww.',
    '..ww....ww..',
    '............',
    '...kk..kk...',  // 물결 입
    '.....kk.....',
  ],
};

export const EXTRA_SWEAT: SpriteDef = {
  id: 'extra.sweat', w: 4, h: 6,
  palette: { b: '#6E9BFF', w: '$white' },
  rows: ['..b.', '..b.', '.bbb', 'bwbb', 'bbbb', '.bb.'],
};
```

몸통 + idle 얼굴을 (6,12)에 합성한 결과(검증용, 24×24):

```
................s.......
...............sos......
...............ts.......
.............tt.........
............t...........
..........kkkk..........
.........kcccck.........
.........kcccck.........
.........kkkkkk.........
.......kkhhrrrrkk.......
......krhhrrrrrrrk......
.....krhhrrrrrrrrrk.....
.....krrwwrrrrwwrrk.....
....krrwwwwrrwwwwrrk....
....krrwkkwrrwkkwrdk....
....krrwkkwrrwkkwrdk....
....krrrwwrrrrwwrrdk....
....krrrrrrrrrrrrrdk....
....krrrrkrrrrkrrrdk....
.....krrrrkkkkrrddk.....
.....krrrrrrrrrdddk.....
......krrrrrrddddk......
.......kkddddddkk.......
.........kkkkkk.........
```

읽히는 요소: 지름 16dp의 둥근 빨간 몸통, 좌상단 하이라이트 띠, 우하단 음영, 회색 뚜껑과 대각선 심지, 끝의 노란 불꽃, 4×5 흰자에 2×2 동공의 큰 눈 두 개, 4dp 폭의 미소. `worried`로 바꾸면 타일 교체 + `side`(19,7)에 땀방울. 프레임 B는 16행을 지우고 맨 위에 빈 행을 넣으므로 불꽃·뚜껑·눈이 1dp 내려오고 입과 바닥은 그대로 — 폭탄이 숨을 쉰다. (00-plan.md §3.1 귀여움 기준에 따라 3단계에서 볼터치·눈 하이라이트를 추가한다.)

---

## C. 마스코트 리액션 시스템

### C1. API 형태

```ts
export type MascotEvent =
  | 'game.start' | 'game.good' | 'game.great' | 'game.risky' | 'game.safe'
  | 'game.mistake' | 'game.think' | 'game.fail' | 'game.win' | 'game.record'
  | 'ui.lobby.hover' | 'ui.locked' | 'ui.idle';

export interface ReactOptions {
  line?: string;        // 게임이 직접 대사를 지정(예: "테트리스!")
  lineKey?: string;     // 테이블 키 오버라이드(예: 'lobby:tetris')
  hold?: number;        // 무드 유지 ms, Infinity = sticky
  priority?: 0 | 1 | 2 | 3;
}

export interface Mascot {
  react(event: MascotEvent, opts?: ReactOptions): void;
  setMood(mood: Mood, hold?: number): void;      // 말풍선 없이 표정만 (예: 셀 누르는 동안 worried)
  say(text: string, opts?: ReactOptions): void;  // 표정 변화 없이 말만
  clear(): void;                                 // 말풍선 제거 + idle 복귀 (게임 재시작/화면 이탈 시)
  setCharacter(id: CharId): void;
  setChatter(level: 'quiet' | 'normal' | 'chatty'): void;
}
```

이벤트 → 무드/우선순위/쿨다운 매핑(단일 테이블):

| 이벤트 | 무드 | 우선순위 | 쿨다운 | hold |
|---|---|---|---|---|
| game.start | happy | 2 | – | 2.5s |
| game.good | happy | 1 | 4s | 2s |
| game.great | win | 2 | 2s | 3s |
| game.risky | worried | 2 | 6s | `game.safe`까지 또는 5s |
| game.mistake | sad | 2 | 3s | 2s |
| game.think | think | 1 | 15s | 4s |
| game.fail | sad | 3 | – | sticky |
| game.win / game.record | win | 3 | – | sticky |
| ui.lobby.hover | idle | 1 | 1.5s | – (말만) |

게임별 매핑 예: 지뢰찾기 — 첫 클릭 `start`, 연쇄 오픈 8셀↑ `good`, 셀 pointerdown 동안 `setMood('worried')`/pointerup `idle`, 30초 무입력 `think`, 지뢰 `fail`, 완료 `win`, 신기록 `record`. 테트리스 — 1~2줄 `good`, 3줄 `great`, 4줄 `great` + `line:'테트리스!'`, 스택 70%↑ `risky`/40%↓ `safe`, 게임오버 `fail`.

### C2. 말풍선 동작
- **표시 시간**: `clamp(1500, 900 + 90 × 글자수, 5000)` ms. 12자 대사 ≈ 2초.
- **등장/퇴장**: `visibility` + `translateY(2u→0)` 2단계 `steps(2)` 120ms, 퇴장은 즉시. 타자기 효과는 줄바꿈과 충돌하므로 v1 제외.
- **우선순위 규칙**: 새 이벤트의 우선순위 ≥ 현재 표시 중 → 즉시 교체. 낮으면 대기열(길이 1, 최신 우선)에 넣고 현재 말풍선이 끝난 뒤 1.5초 이내면 재생, 지났으면 폐기.
- **쿨다운**: 이벤트별 테이블 값 × 수다 레벨 계수(quiet ×2 + 우선순위 2 이상만 표시, normal ×1, chatty ×0.5).
- **대사 선택**: 이벤트별 링 버퍼로 마지막 2개를 제외하고 무작위.
- **무드 복귀**: `hold` 만료 시 idle. sticky(fail/win)는 `clear()`가 호출될 때까지 유지.
- **접근성**: 말풍선은 `role="status" aria-live="polite"`. `prefers-reduced-motion`이면 등장 애니메이션 생략.
- narrow 레이아웃에서는 패널 대신 HUD 아래 스트립의 한 줄 말풍선으로 렌더링(같은 큐, 다른 DOM).

### C3. 대사 테이블 구조

```ts
export type LineTable = Partial<Record<MascotEvent | `lobby:${string}` | 'lobby:locked', string[]>>;
// 조회 순서: 게임 전용 테이블(gameId, charId) → 캐릭터 테이블 → DEFAULT_LINES
registerGameLines(gameId: GameId, table: Partial<Record<CharId, LineTable>>): void;
```

새 이벤트가 추가되어도 `DEFAULT_LINES`에만 있으면 모든 캐릭터가 동작하고, 캐릭터별 개성 대사는 점진적으로 채운다. 테이블의 모든 문자열은 폰트 서브셋 테스트와 길이 테스트(≤ 24자, 말풍선 2줄 한계)를 통과해야 한다.

### C4. accent 전파

```ts
export function applyCharacterTheme(c: CharacterDef, persist = true) {
  const r = document.documentElement;
  r.dataset.char = c.id;                                  // html[data-char="peong"] 훅
  r.style.setProperty('--accent', c.accent.base);
  r.style.setProperty('--accent-dark', c.accent.dark);
  r.style.setProperty('--accent-light', c.accent.light);
  if (persist) /* 스토어에 selectedCharacterId 저장 */;
  spriteCache.clearAccentDependent();                     // 데이터 URL 아이콘·9-slice 재생성
}
```

- 부트 시 저장된 캐릭터를 읽어 **첫 페인트 전에** 호출(플래시 방지). 저장값이 없으면 중립 accent(`--cyan`)로 시작.
- 캐릭터 선택 화면은 `persist=false`로 미리보기하고 확정 시 `true`.
- `--accent`가 쓰이는 곳: 포커스 링, 메뉴 커서, 선택된 카드 테두리, `.btn.primary` 채움, PRESS START, HUD 라벨 밑줄, 말풍선 테두리, 결과 화면 NEW RECORD, 레벨/진행 바. 틴트 면은 `color-mix(in srgb, var(--accent) 18%, var(--bg-1))`. 게임 보드 내부 색(지뢰 숫자, 테트로미노)은 게임 소유라 accent의 영향을 받지 않는다.

참고 링크: [Galmuri GitHub](https://github.com/quiple/galmuri), [galmuri.css on jsDelivr](https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css)
