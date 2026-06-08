import { useEffect, useState } from 'react'

/**
 * Types out an array of lines char-by-char (70ms/char, 300ms between lines,
 * 500ms initial delay) — the hero headline effect from school/index.html.
 * Returns the current visible text per line + which line is active.
 */
export function useTypewriter(lines: string[]) {
  const [typed, setTyped] = useState<string[]>(() => lines.map(() => ''))
  const [activeLine, setActiveLine] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let li = 0
    let ci = 0
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      if (li >= lines.length) {
        setActiveLine(lines.length - 1)
        setDone(true)
        return
      }
      const full = lines[li]
      if (ci <= full.length) {
        const slice = full.slice(0, ci)
        setActiveLine(li)
        setTyped((prev) => {
          const next = [...prev]
          next[li] = slice
          return next
        })
        ci++
        timer = setTimeout(tick, 70)
      } else {
        li++
        ci = 0
        timer = setTimeout(tick, 300)
      }
    }

    timer = setTimeout(tick, 500)
    return () => clearTimeout(timer)
    // lines is a stable literal from the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { typed, activeLine, done }
}
