import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import { testimonials } from '../data/testimonials'

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval>>(null)

  const reset = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => setActive((i) => (i + 1) % testimonials.length), 5000)
  }

  useEffect(() => {
    reset()
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  const go = (i: number) => {
    setActive(i)
    reset()
  }

  return (
    <section id="testi" className="relative bg-paper-2 overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      <svg className="absolute bottom-[-6%] right-[-4%] w-[360px] opacity-45 z-0" viewBox="0 0 200 200">
        <defs>
          <pattern id="testi-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" stroke="rgba(86,170,58,.16)" fill="none" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#testi-grid)" />
      </svg>

      <div className="relative z-[2] flex justify-between items-end gap-8 flex-wrap mb-[60px]">
        <div>
          <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-55 flex items-center gap-3">
            <span className="italic">03</span> — Loved by Schools
          </Reveal>
          <Reveal as="h2" className="mt-3 text-[clamp(2.2rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
            A modern &amp;
            <br />
            <span className="italic font-medium text-accent">unique</span> style.
          </Reveal>
        </div>
      </div>

      <div className="relative z-[2] min-h-[300px]">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out ${
              i === active
                ? 'opacity-100 translate-y-0 pointer-events-auto relative'
                : 'opacity-0 translate-y-[30px] pointer-events-none'
            }`}
          >
            <blockquote className="text-[clamp(1.4rem,3.6vw,2.7rem)] font-medium leading-[1.32] tracking-[-0.025em] max-w-[900px]">
              &ldquo;{t.quote} <span className="italic text-accent">{t.accent}</span> {t.rest}&rdquo;
            </blockquote>
            <div className="mt-[34px] flex items-center gap-[18px]">
              <div className="w-[56px] h-[56px] rounded-full bg-accent text-white grid place-items-center font-bold text-[1.1rem]">
                {t.initials}
              </div>
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-[0.85rem] opacity-60">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 mt-12 items-center">
        {testimonials.map((t, i) => (
          <button
            key={t.name}
            type="button"
            data-hover
            aria-label={`Show testimonial ${i + 1}`}
            onClick={() => go(i)}
            className={`h-1 rounded transition-all duration-300 ${
              i === active ? 'bg-accent w-[62px]' : 'bg-line w-[38px]'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
