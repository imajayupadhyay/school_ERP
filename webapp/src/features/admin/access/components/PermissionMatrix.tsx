import type { ReactNode } from 'react'
import type { PermissionAction, PermissionCatalog, PermissionModule } from '../types'

/**
 * Renders the grouped permission catalog (group → module rows → action cells).
 * The consumer supplies the control for each action cell via `renderAction`,
 * so this is reused by both the role editor (checkboxes) and the per-user
 * override editor (3-state toggles).
 */
export default function PermissionMatrix({
  catalog,
  renderAction,
}: {
  catalog: PermissionCatalog
  renderAction: (action: PermissionAction, module: PermissionModule) => ReactNode
}) {
  return (
    <div className="space-y-5">
      {catalog.groups.map((group) => (
        <div key={group.group}>
          <h4 className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink/40">
            {group.group}
          </h4>
          <div className="overflow-hidden rounded-xl border border-line">
            {group.modules.map((module, i) => (
              <div
                key={module.module}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
                  i % 2 === 1 ? 'bg-paper/40' : 'bg-white'
                }`}
              >
                <div className="w-44 shrink-0 text-[0.84rem] font-semibold text-ink/80">
                  {module.label}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {module.actions.map((action) => (
                    <div key={action.key}>{renderAction(action, module)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
