import type { InputHTMLAttributes, ReactNode } from 'react'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: ReactNode
  /** Optional element rendered at the trailing edge (e.g. password toggle). */
  trailing?: ReactNode
}

/** Labeled input with a leading icon, coral focus ring, and optional trailing slot. */
export default function AuthField({ label, icon, trailing, id, ...props }: AuthFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[0.82rem] font-semibold text-ink mb-2">{label}</span>
      <div className="group relative flex items-center rounded-xl border border-line bg-white transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(86,170,58,.12)]">
        <span className="pl-3.5 text-ink/40 group-focus-within:text-accent transition-colors">
          {icon}
        </span>
        <input
          id={id}
          className="w-full bg-transparent px-3 py-3 text-[0.95rem] text-ink outline-none placeholder:text-ink/35"
          {...props}
        />
        {trailing && <span className="pr-2">{trailing}</span>}
      </div>
    </label>
  )
}
