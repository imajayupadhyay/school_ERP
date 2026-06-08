import { useEffect, useRef, useState } from 'react'

/**
 * Counts from 0 to `end` once the element enters the viewport (threshold 0.5),
 * matching the count-up in school/index.html. Returns a ref + the display string.
 */
export function useCountUp(end: number, suffix = '') {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          let n = 0
          const inc = Math.max(1, end / 45)
          const timer = setInterval(() => {
            n += inc
            if (n >= end) {
              n = end
              clearInterval(timer)
            }
            setDisplay(Math.floor(n) + suffix)
          }, 26)
          io.unobserve(el)
        })
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [end, suffix])

  return { ref, display }
}
