import Reveal from './Reveal'
import { useCountUp } from '../hooks/useCountUp'

const checks = [
  'Affordable, transparent pricing',
  'Easy-to-manage admin panel',
  'Enterprise-grade data security',
]

const stats: Array<[number, string, string]> = [
  [150, '+', 'Schools Onboarded'],
  [14, '+', 'Robust Features'],
  [99, '%', 'Uptime Reliability'],
  [24, '/7', 'Dedicated Support'],
]

function StatCard({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp(end, suffix)
  return (
    <Reveal className="border border-paper/20 rounded-[20px] px-[26px] py-[32px] transition duration-500 hover:bg-accent hover:text-white hover:border-accent">
      <div ref={ref} className="text-[clamp(2.4rem,5vw,3.6rem)] font-black tracking-[-0.04em] leading-none">
        {display}
      </div>
      <div className="text-[0.82rem] tracking-[0.12em] uppercase opacity-60 mt-2.5 font-medium">
        {label}
      </div>
    </Reveal>
  )
}

export default function WhySection() {
  return (
    <section id="why" className="relative bg-ink text-paper overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      <svg className="absolute top-[-8%] right-[-8%] w-[520px] opacity-40 z-0" viewBox="0 0 400 400" fill="none">
        <path d="M0,200 Q100,80 200,200 T400,200" stroke="rgba(116,195,74,.4)" fill="none" />
        <path d="M0,240 Q100,120 200,240 T400,240" stroke="rgba(247,244,236,.12)" fill="none" />
        <path d="M0,160 Q100,40 200,160 T400,160" stroke="rgba(116,195,74,.22)" fill="none" />
      </svg>

      <div className="relative z-[2] grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-[70px] items-center">
        <div>
          <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-60 flex items-center gap-3">
            <span className="italic">02</span> — Why SchoolLID
          </Reveal>
          <Reveal as="h2" className="mt-3 text-[clamp(2rem,5vw,3.6rem)] font-extrabold tracking-[-0.03em] leading-[1.04] mb-[26px]">
            The <span className="mk-stroke-paper">pinnacle</span> of
            <br />
            school management.
          </Reveal>
          <Reveal as="p" className="font-light opacity-70 leading-[1.7] max-w-[520px]">
            SchoolLID offers advanced technology, user-friendly features, and personalized solutions. It
            simplifies communication, streamlines administrative tasks, and elevates the educational
            experience for all stakeholders.
          </Reveal>
          <div className="mt-[34px] flex flex-col gap-[18px]">
            {checks.map((c) => (
              <Reveal key={c} className="flex items-center gap-4 font-medium text-[1.05rem]">
                <span className="w-[34px] h-[34px] bg-accent text-white rounded-full grid place-items-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {c}
              </Reveal>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[22px]">
          {stats.map(([end, suffix, label]) => (
            <StatCard key={label} end={end} suffix={suffix} label={label} />
          ))}
        </div>
      </div>
    </section>
  )
}
