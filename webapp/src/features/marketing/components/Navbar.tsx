import { Link } from 'react-router-dom'

interface NavbarProps {
  onOpenTrial: () => void
}

const links = [
  ['Features', '#features'],
  ['Why Us', '#why'],
  ['Schools', '#testi'],
  ['App', '#download'],
  ['Contact', '#contact'],
]

export default function Navbar({ onOpenTrial }: NavbarProps) {
  return (
    <nav className="fixed top-0 inset-x-0 z-[9000] flex items-center justify-between px-5 md:px-16 py-[18px] bg-ink text-paper border-b border-paper/10 shadow-[0_8px_30px_rgba(15,58,49,.25)]">
      <a href="#" data-hover className="flex items-center transition-opacity hover:opacity-80">
        <img
          src="/brand/schoollid-logo-full.png"
          alt="SchoolLID — Building Future-Ready Schools"
          className="h-8 md:h-[42px] w-auto"
        />
      </a>

      <div className="hidden md:flex gap-[34px] text-sm font-medium">
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="relative opacity-80 hover:opacity-100 after:content-[''] after:absolute after:left-0 after:-bottom-1.5 after:h-0.5 after:w-0 after:bg-accent after:transition-[width] after:duration-300 hover:after:w-full"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Link
          to="/login"
          data-hover
          className="px-4 md:px-[22px] py-2 md:py-2.5 rounded-full text-xs md:text-[13px] font-semibold border border-paper/20 text-paper transition hover:bg-paper hover:text-ink hover:border-paper"
        >
          Login
        </Link>
        <button
          type="button"
          data-hover
          onClick={onOpenTrial}
          className="px-4 md:px-[22px] py-2 md:py-2.5 rounded-full text-xs md:text-[13px] font-semibold bg-accent text-white transition hover:bg-accent-2 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(86,170,58,.35)]"
        >
          Start Trial →
        </button>
      </div>
    </nav>
  )
}
