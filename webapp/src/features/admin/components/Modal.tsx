import type { ReactNode } from 'react'
import { CloseIcon } from './icons'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, description, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.05rem] font-bold tracking-[-0.01em] text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[0.82rem] text-ink/50">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/40 transition hover:bg-paper-2 hover:text-ink"
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
