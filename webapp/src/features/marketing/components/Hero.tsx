import Reveal from './Reveal'
import HeroScene from './HeroScene'
import { useTypewriter } from '../hooks/useTypewriter'

const HEADLINE = ['The All-in-One', 'School ERP', 'Platform.']

interface HeroProps {
  onOpenTrial: () => void
}

export default function Hero({ onOpenTrial }: HeroProps) {
  const { typed, activeLine } = useTypewriter(HEADLINE)

  return (
    <header className="relative min-h-screen flex items-center overflow-hidden text-paper pt-[130px] pb-[90px] px-5 md:px-16 bg-[linear-gradient(155deg,#0f3a31_0%,#1c4d42_55%,#0f3a31_100%)]">
      <div className="mk-hero-glow a" />
      <div className="mk-hero-glow b" />

      {/* background vectors */}
      <svg className="absolute z-0 pointer-events-none top-1/2 right-[-12%] -translate-y-1/2 w-[640px] opacity-60" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="199" stroke="rgba(116,195,74,.22)" />
        <circle cx="200" cy="200" r="150" stroke="rgba(247,244,236,.1)" />
        <circle cx="200" cy="200" r="100" stroke="rgba(116,195,74,.14)" />
      </svg>
      <svg className="absolute z-0 pointer-events-none bottom-[4%] left-[-3%] w-[300px] opacity-40" viewBox="0 0 200 200">
        <defs>
          <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="rgba(116,195,74,.5)" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#hero-dots)" />
      </svg>
      <svg className="absolute z-0 pointer-events-none top-[14%] left-[34%] w-[120px] opacity-50" viewBox="0 0 100 100" fill="none">
        <path d="M10 90 L50 10 L90 90 Z" stroke="rgba(247,244,236,.16)" strokeWidth="2" />
      </svg>

      <div className="relative z-[2] w-full grid grid-cols-1 lg:grid-cols-[60%_40%] gap-10 lg:gap-12 items-center">
        {/* left */}
        <div>
          <Reveal as="span" className="inline-flex items-center gap-3 text-xs tracking-[0.3em] uppercase font-medium opacity-85 mb-[30px] px-[18px] py-[9px] border border-paper/20 rounded-full bg-accent/[0.08]">
            <span className="mk-live w-2 h-2 bg-accent rounded-full shadow-[0_0_0_4px_rgba(86,170,58,.2)]" />
            Complete School ERP · Trusted by 150+ schools
          </Reveal>

          <h1 className="text-[clamp(2.6rem,7vw,5.8rem)] font-black leading-[1] tracking-[-0.045em] min-h-[3em]">
            {HEADLINE.map((_, i) => (
              <span
                key={i}
                className={`block min-h-[1em] whitespace-nowrap ${i === 1 ? 'italic font-semibold text-accent' : ''}`}
              >
                {typed[i]}
                {activeLine === i && <span className="mk-caret" />}
              </span>
            ))}
          </h1>

          <Reveal as="p" className="max-w-[500px] mt-[30px] text-[clamp(1rem,1.5vw,1.14rem)] font-light leading-relaxed opacity-[0.78]">
            SchoolLID unifies admissions, attendance, academics, exams, fees and communication into one
            powerful ERP — so your school runs every department from a single, beautifully simple system.
          </Reveal>

          <Reveal className="mt-[38px] flex gap-4 flex-wrap">
            <button
              type="button"
              data-hover
              onClick={onOpenTrial}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-[15px] bg-accent text-white transition hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(86,170,58,.4)]"
            >
              Register Your School
              <span className="transition-transform group-hover:translate-x-1.5">→</span>
            </button>
            <a
              href="#features"
              data-hover
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-[15px] border border-paper/20 text-paper transition hover:bg-paper hover:text-ink"
            >
              Explore Features
            </a>
          </Reveal>

          <Reveal className="mt-[46px] flex gap-[34px] flex-wrap">
            {[
              ['150+', 'Schools'],
              ['14+', 'Features'],
              ['99%', 'Uptime'],
            ].map(([value, label], i) => (
              <div key={label} className="flex items-center gap-[34px]">
                {i > 0 && <span className="w-px self-stretch bg-paper/20" />}
                <span className="flex flex-col">
                  <span className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold tracking-[-0.03em] text-accent-2">
                    {value}
                  </span>
                  <span className="text-[0.74rem] tracking-[0.14em] uppercase opacity-55 mt-1">
                    {label}
                  </span>
                </span>
              </div>
            ))}
          </Reveal>
        </div>

        {/* right — illustration */}
        <Reveal>
          <HeroScene />
        </Reveal>
      </div>

      {/* foot */}
      <div className="hidden md:flex absolute bottom-7 left-5 right-5 md:left-16 md:right-16 justify-between items-end text-[11px] tracking-[0.2em] uppercase opacity-50 z-[2]">
        <span>Modern School Management</span>
        <span className="flex flex-col items-center gap-2">
          Scroll
          <span className="mk-scroll-ln" />
        </span>
        <span>Est. Gurugram, IN</span>
      </div>
    </header>
  )
}
