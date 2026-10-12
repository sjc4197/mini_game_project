import { MenuList } from './MenuList'
import { Overlay } from './Overlay'
import styles from './ControlsOverlay.module.css'

type Row = readonly [
  key: string,
  menu: string,
  minesweeper: string,
  tetris: string,
  omok: string,
  snake: string,
]
const ROWS: readonly Row[] = [
  [
    '←→↑↓',
    '포커스 이동',
    '커서 이동',
    '←→ 이동 · ↓ 소프트 드롭 · ↑ 시계 회전',
    '커서 이동',
    '방향 (첫 입력이 출발)',
  ],
  [
    'Enter / Z / Space',
    '확인',
    'Enter·Z 열기 · Space 코드',
    'Z 반시계 · Space 하드 드롭',
    '착수',
    '—',
  ],
  [
    'Esc / X',
    '뒤로 · 닫기',
    'Esc 일시정지 · X 깃발',
    'Esc 일시정지 · X 시계 회전',
    'Esc 일시정지',
    'Esc 일시정지',
  ],
  ['C / Shift', '—', '—', '홀드', '—', '—'],
  ['R', '기록(로비) · 다시(결과)', '재시작', '재시작', '재시작', '재시작'],
  ['S', '설정', '—', '—', '—', '—'],
  [
    '마우스',
    'hover 포커스 · 클릭 확인',
    '좌 열기 · 우 깃발 · 양쪽/가운데 코드',
    '—',
    'hover 미리보기 · 클릭 착수',
    '드래그 = 방향',
  ],
]

/** 조작키 표 (설정 화면 "조작키 보기") */
export function ControlsOverlay({ onClose }: { onClose(): void }) {
  return (
    <Overlay title="조작키">
      <table className={`t-small ${styles.table}`}>
        <thead>
          <tr>
            <th>키</th>
            <th>메뉴</th>
            <th>지뢰찾기</th>
            <th>테트리스</th>
            <th>오목</th>
            <th>스네이크</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([key, menu, mine, tetris, omok, snake]) => (
            <tr key={key}>
              <th scope="row">{key}</th>
              <td>{menu}</td>
              <td>{mine}</td>
              <td>{tetris}</td>
              <td>{omok}</td>
              <td>{snake}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <MenuList
        scope="overlay"
        items={[{ id: 'close', label: '닫기', hint: 'Esc', onSelect: onClose }]}
        onCancel={onClose}
      />
    </Overlay>
  )
}
