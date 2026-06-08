const columns: Array<[string, string[]]> = [
  ['Links', ['Home', 'Features', 'Pricing', 'Student Login']],
  ['Info', ['About Us', 'Contact', 'Privacy Policy', 'Terms & Conditions', 'Refund & Cancellation']],
  ['Follow', ['Facebook', 'Instagram', 'LinkedIn']],
]

export default function Footer() {
  return (
    <footer className="relative bg-ink text-paper overflow-hidden pt-20 pb-9 px-5 md:px-16">
      <div className="relative z-[2] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
        <div>
          <img
            src="/brand/schoollid-logo-full.png"
            alt="Schoolid — Building Future-Ready Schools"
            className="h-12 w-auto mb-[22px]"
          />
          <p className="font-light opacity-60 max-w-[280px] leading-relaxed">
            Manage your school with technology built for every stakeholder. Your school deserves good tech.
          </p>
        </div>
        {columns.map(([title, items]) => (
          <div key={title}>
            <h4 className="text-[0.78rem] tracking-[0.2em] uppercase opacity-50 mb-[22px] font-semibold">
              {title}
            </h4>
            {items.map((item) => (
              <a
                key={item}
                href="#"
                data-hover
                className="block font-normal opacity-80 mb-[13px] w-fit transition hover:opacity-100 hover:translate-x-[5px]"
              >
                {item}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="relative z-[2] mt-[70px] pt-[26px] border-t border-paper/20 flex justify-between flex-wrap gap-3.5 text-[0.82rem] opacity-55">
        <span>© 2026 SchoolLID. All rights reserved.</span>
        <span>Manage Your School</span>
      </div>

      <div className="absolute bottom-[-4vw] inset-x-0 text-center text-[25vw] font-black tracking-[-0.05em] leading-none text-transparent [-webkit-text-stroke:1px_rgba(247,244,236,0.18)] z-[1] pointer-events-none whitespace-nowrap">
        SCHOOLLID
      </div>
    </footer>
  )
}
