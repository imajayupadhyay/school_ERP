import type { ReactNode } from 'react'
import Reveal from './Reveal'

const labelCls =
  'absolute left-0 top-[18px] text-[1.05rem] opacity-45 pointer-events-none transition-all ' +
  'peer-focus:-top-1.5 peer-focus:text-[0.72rem] peer-focus:tracking-[0.12em] peer-focus:uppercase peer-focus:opacity-70 ' +
  'peer-[:not(:placeholder-shown)]:-top-1.5 peer-[:not(:placeholder-shown)]:text-[0.72rem] peer-[:not(:placeholder-shown)]:tracking-[0.12em] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:opacity-70'

function InfoRow({ icon, k, v, last }: { icon: ReactNode; k: string; v: string; last?: boolean }) {
  return (
    <Reveal className={`flex gap-5 items-start pb-[26px] ${last ? '' : 'border-b border-line'}`}>
      <span className="w-12 h-12 bg-accent text-white rounded-full grid place-items-center shrink-0">
        {icon}
      </span>
      <div>
        <div className="text-[0.78rem] tracking-[0.18em] uppercase opacity-50">{k}</div>
        <div className="text-[1.15rem] font-semibold mt-1">{v}</div>
      </div>
    </Reveal>
  )
}

export default function Contact() {
  return (
    <section id="contact" className="relative bg-paper-2 overflow-hidden py-[clamp(80px,12vh,150px)] px-5 md:px-16">
      <div className="flex justify-between items-end gap-8 flex-wrap mb-[60px]">
        <div>
          <Reveal className="text-xs tracking-[0.3em] uppercase font-semibold opacity-55 flex items-center gap-3">
            <span className="italic">06</span> — Say Hello
          </Reveal>
          <Reveal as="h2" className="mt-3 text-[clamp(2.2rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
            Let's get
            <br />
            in <span className="italic font-medium text-accent">touch.</span>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] relative z-[2]">
        <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
          <div className="relative border-b border-line py-[18px]">
            <input id="c-name" type="text" placeholder=" " className="peer w-full bg-transparent outline-none text-[1.05rem] text-ink" />
            <label htmlFor="c-name" className={labelCls}>Enter your name</label>
          </div>
          <div className="relative border-b border-line py-[18px]">
            <input id="c-email" type="email" placeholder=" " className="peer w-full bg-transparent outline-none text-[1.05rem] text-ink" />
            <label htmlFor="c-email" className={labelCls}>Enter your email</label>
          </div>
          <div className="relative border-b border-line py-[18px]">
            <textarea id="c-msg" rows={3} placeholder=" " className="peer w-full bg-transparent outline-none text-[1.05rem] text-ink resize-none" />
            <label htmlFor="c-msg" className={labelCls}>Your message</label>
          </div>
          <button
            type="submit"
            data-hover
            className="group inline-flex items-center gap-3 self-start mt-6 px-8 py-4 rounded-full font-semibold text-[15px] bg-ink text-paper transition hover:-translate-y-[3px]"
          >
            Send Your Message
            <span className="transition-transform group-hover:translate-x-1.5">→</span>
          </button>
        </form>

        <div className="flex flex-col gap-[30px]">
          <InfoRow
            k="Phone"
            v="+91 70113 63737"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
          />
          <InfoRow
            k="Email"
            v="support@schoollid.com"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 4h16v16H4z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            }
          />
          <InfoRow
            last
            k="Location"
            v="76-D Udyog Vihar, Gurugram"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  )
}
