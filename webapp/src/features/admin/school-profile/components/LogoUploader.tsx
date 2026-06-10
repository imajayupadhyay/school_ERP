import { useRef } from 'react'
import { UploadIcon } from '../../components/icons'

interface LogoUploaderProps {
  logoUrl: string | null
  schoolName: string
  canEdit: boolean
  isUploading: boolean
  onUpload: (file: File) => void
  error?: string | null
}

const MAX_SIZE_MB = 2

export default function LogoUploader({
  logoUrl,
  schoolName,
  canEdit,
  isUploading,
  onUpload,
  error,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    onUpload(file)
  }

  return (
    <div className="flex items-center gap-5">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-paper-2">
        {logoUrl ? (
          <img src={logoUrl} alt={`${schoolName} logo`} className="h-full w-full object-contain" />
        ) : (
          <span className="text-[0.7rem] font-medium text-ink/40">No logo</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={!canEdit || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[0.85rem] font-semibold text-ink/75 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadIcon width={16} height={16} />
          {isUploading ? 'Uploading…' : 'Upload logo'}
        </button>
        <p className="text-[0.74rem] text-ink/40">PNG, JPG, WEBP or SVG. Max {MAX_SIZE_MB}MB.</p>
        {error && <p className="text-[0.78rem] font-medium text-[#dc2626]">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
