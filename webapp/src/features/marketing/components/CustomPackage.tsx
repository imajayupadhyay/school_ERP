import Reveal from './Reveal'

export default function CustomPackage() {
  return (
    <section className="relative bg-ink text-paper text-center overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] opacity-30 z-0"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="199" stroke="rgba(116,195,74,.32)" />
        <circle cx="200" cy="200" r="130" stroke="rgba(247,244,236,.12)" />
        <circle cx="200" cy="200" r="60" stroke="rgba(116,195,74,.2)" />
      </svg>

      <div className="relative z-[2] max-w-[760px] mx-auto">
        <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-60 flex justify-center items-center gap-3">
          <span className="italic">04</span> — Tailored For You
        </Reveal>
        <Reveal as="h2" className="mt-[18px] text-[clamp(2.2rem,7vw,5.5rem)] font-black tracking-[-0.04em] leading-[0.96]">
          Custom <span className="italic font-medium text-accent">Package,</span>
          <br />
          your way.
        </Reveal>
        <Reveal as="p" className="mx-auto mt-7 mb-10 max-w-[520px] font-light opacity-[0.72] leading-[1.7]">
          Tailor your experience with our custom package options. From personalized services to bespoke
          solutions, we offer the flexibility to meet your school's unique needs.
        </Reveal>
        <Reveal>
          <a
            href="#contact"
            data-hover
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-[15px] bg-accent text-white transition hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(86,170,58,.4)]"
          >
            Get In Touch
            <span className="transition-transform group-hover:translate-x-1.5">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  )
}
