import { useRef } from 'react'
import Reveal from './Reveal'
import { features } from '../data/features'

export default function FeaturesCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, sx: 0, sl: 0 })

  const step = () => {
    const track = trackRef.current
    const card = track?.querySelector<HTMLElement>('.mk-feat-card')
    return (card?.offsetWidth ?? 320) + 26
  }
  const scrollBy = (dir: number) =>
    trackRef.current?.scrollBy({ left: dir * step(), behavior: 'smooth' })

  const onDown = (e: React.MouseEvent) => {
    const track = trackRef.current
    if (!track) return
    drag.current = { down: true, sx: e.pageX, sl: track.scrollLeft }
    track.classList.add('drag')
  }
  const onUp = () => {
    drag.current.down = false
    trackRef.current?.classList.remove('drag')
  }
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current.down || !trackRef.current) return
    e.preventDefault()
    trackRef.current.scrollLeft = drag.current.sl - (e.pageX - drag.current.sx) * 1.4
  }

  return (
    <section id="features" className="relative bg-paper overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      {/* grid bg vector */}
      <svg className="absolute top-[6%] left-[-4%] w-[300px] opacity-50 z-0" viewBox="0 0 200 200">
        <defs>
          <pattern id="feat-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" stroke="rgba(86,170,58,.18)" fill="none" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#feat-grid)" />
      </svg>

      <div className="relative z-[2] flex justify-between items-end gap-8 flex-wrap mb-[60px]">
        <div>
          <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-55 flex items-center gap-3">
            <span className="italic">01</span> — Top Features
          </Reveal>
          <Reveal as="h2" className="mt-3 text-[clamp(2.2rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
            Built for <span className="italic font-medium text-accent">every</span>
            <br />
            part of school.
          </Reveal>
        </div>
        <Reveal className="flex gap-3 items-center">
          {[
            ['Previous', 'M15 18l-6-6 6-6', () => scrollBy(-1)],
            ['Next', 'M9 18l6-6-6-6', () => scrollBy(1)],
          ].map(([label, path, onClick]) => (
            <button
              key={label as string}
              type="button"
              data-hover
              aria-label={label as string}
              onClick={onClick as () => void}
              className="w-[54px] h-[54px] rounded-full border border-line grid place-items-center transition hover:bg-accent hover:text-white hover:border-accent hover:scale-105"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={path as string} />
              </svg>
            </button>
          ))}
        </Reveal>
      </div>

      <div className="relative z-[2]">
        <div
          ref={trackRef}
          className="mk-car-track"
          onMouseDown={onDown}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onMouseMove={onMove}
        >
          {features.map((f, i) => (
            <article
              key={f.title}
              data-hover
              className="mk-feat-card flex-[0_0_clamp(260px,30vw,360px)] snap-start bg-ink text-paper rounded-3xl px-[34px] py-[38px] min-h-[330px] flex flex-col justify-between relative overflow-hidden transition-transform duration-500 hover:-translate-y-2.5"
            >
              <div className="mk-ring" />
              <div className="text-[13px] tracking-[0.2em] opacity-50">
                0{i + 1} / 0{features.length}
              </div>
              <div className="w-[58px] h-[58px] rounded-2xl grid place-items-center mt-[26px] mb-auto bg-accent text-white">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d={f.icon} />
                </svg>
              </div>
              <div>
                <h3 className="text-[1.55rem] font-bold tracking-[-0.02em] leading-[1.1] mt-[30px]">
                  {f.title}
                </h3>
                <p className="text-[0.9rem] font-light opacity-65 mt-3 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
