import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/lib/errors'
import Modal from '../../components/Modal'
import FormField, { inputClass } from '../../components/FormField'
import PermissionMatrix from './PermissionMatrix'
import { createRole, updateRole } from '../api'
import type { PermissionCatalog, Role } from '../types'

interface Props {
  catalog: PermissionCatalog
  role: Role | null // null => create
  onClose: () => void
}

export default function RoleEditorModal({ catalog, role, onClose }: Props) {
  const queryClient = useQueryClient()
  const isOwner = role?.is_owner ?? false
  const readOnly = isOwner

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(isOwner ? catalog.keys : role?.permissions ?? []),
  )
  const [error, setError] = useState<string | null>(null)

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleModule = (keys: string[], allOn: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)))
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        permissions: Array.from(selected),
      }
      return role ? updateRole(role.id, payload) : createRole(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access', 'roles'] })
      onClose()
    },
    onError: (e) => setError(extractErrorMessage(e)),
  })

  return (
    <Modal
      title={role ? `Edit role · ${role.name}` : 'Create role'}
      description={
        isOwner
          ? 'Owner roles always have full access — their permissions are locked.'
          : 'Set the modules and actions this role grants by default.'
      }
      size="lg"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          mutation.mutate()
        }}
        className="space-y-5"
      >
        {error && (
          <div className="rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/5 px-4 py-3 text-[0.84rem] text-[#dc2626]">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role name" htmlFor="role-name">
            <input
              id="role-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front Office"
              disabled={readOnly}
              required
            />
          </FormField>
          <FormField label="Description" htmlFor="role-desc">
            <input
              id="role-desc"
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary (optional)"
              disabled={readOnly}
            />
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8rem] font-semibold text-ink/55">Permissions</span>
            {!readOnly && (
              <span className="text-[0.74rem] text-ink/40">
                {selected.size} selected
              </span>
            )}
          </div>
          <PermissionMatrix
            catalog={catalog}
            renderAction={(action, module) => {
              const checked = selected.has(action.key)
              return (
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.78rem] font-medium transition ${
                    checked
                      ? action.is_special
                        ? 'border-[#b45309]/30 bg-[#b45309]/10 text-[#b45309]'
                        : 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-line bg-white text-ink/55 hover:border-accent/40'
                  } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                  title={action.key}
                  onDoubleClick={() => {
                    if (readOnly) return
                    const allOn = module.actions.every((a) => selected.has(a.key))
                    toggleModule(
                      module.actions.map((a) => a.key),
                      allOn,
                    )
                  }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => toggle(action.key)}
                  />
                  <span
                    className={`grid h-3.5 w-3.5 place-items-center rounded-[4px] border text-white ${
                      checked
                        ? action.is_special
                          ? 'border-[#b45309] bg-[#b45309]'
                          : 'border-accent bg-accent'
                        : 'border-ink/25 bg-white'
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" width={10} height={10} fill="currentColor">
                        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                      </svg>
                    )}
                  </span>
                  {action.label}
                </label>
              )
            }}
          />
          {!readOnly && (
            <p className="mt-2 text-[0.74rem] text-ink/40">
              Tip: double-click any action to toggle the whole module.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : role ? 'Save changes' : 'Create role'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
