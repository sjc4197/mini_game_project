import { useEffect, useState } from 'react'
import { loadFonts, type FontLoadStatus } from '@/app/fonts'

export function useFontsReady(): FontLoadStatus | null {
  const [status, setStatus] = useState<FontLoadStatus | null>(null)
  useEffect(() => {
    let alive = true
    loadFonts().then((s) => {
      if (alive) setStatus(s)
    })
    return () => {
      alive = false
    }
  }, [])
  return status
}
