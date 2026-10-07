import 'react'

// style={{ '--accent': '#fff' }} 처럼 CSS 커스텀 프로퍼티를 캐스팅 없이 쓰기 위한 확장
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
