import { useEffect } from 'react'
import { loadFonts, type FontLoadStatus } from '@/app/fonts'
import styles from './BootScreen.module.css'

const MIN_SHOW_MS = 250

/** 폰트를 기다리는 동안 보여주는 단색 화면. 폰트가 캐시돼 있어도 최소 250ms 는 유지(깜빡임 방지) */
export function BootScreen({ onReady }: { onReady: (status: FontLoadStatus) => void }) {
  useEffect(() => {
    let alive = true
    const started = performance.now()
    loadFonts().then((status) => {
      const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - started))
      setTimeout(() => {
        if (alive) onReady(status)
      }, wait)
    })
    return () => {
      alive = false
    }
  }, [onReady])

  return (
    <div className={styles.boot} role="status" aria-label="불러오는 중">
      <div className={`${styles.square} px-blink-fast`} />
    </div>
  )
}
