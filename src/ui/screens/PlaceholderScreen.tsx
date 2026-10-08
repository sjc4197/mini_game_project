import { useEffect } from 'react'
import { input } from '@/app/input/input'
import { useStore } from '@/app/store'
import { MenuList } from '@/ui/components/MenuList'
import styles from './PlaceholderScreen.module.css'

interface Props {
  title: string
  note: string
}

/** 아직 구현되지 않은 화면의 자리 표시 — 화면 상태 머신/전환/Esc 동작 검증용 */
export function PlaceholderScreen({ title, note }: Props) {
  const back = useStore((s) => s.back)
  useEffect(() => input.on('back', () => (back(), true), { scope: 'ui' }), [back])

  return (
    <main className={styles.screen}>
      <h1 className="t-h1">{title}</h1>
      <p className={`t-small ${styles.note}`}>{note}</p>
      <MenuList
        items={[{ id: 'back', label: '뒤로', hint: 'Esc', onSelect: back }]}
        onCancel={back}
      />
    </main>
  )
}
