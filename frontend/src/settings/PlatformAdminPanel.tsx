/**
 * PlatformAdminPanel — internal_admin: manage per-org module licensing.
 *
 * STRAWMAN — uses hardcoded mock data. Replace INITIAL_ORGS with API calls once
 * the org_modules DB migration is in place (12-Module-Access-Control.md §10 step 1).
 *
 * Architecture: 12-Module-Access-Control.md §6
 * Requirements: settings.requirements.md REQ-SETTINGS-ADMIN-*
 */
import React, { useMemo, useState } from 'react'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'
import {
  MODULE_KEYS,
  MODULE_LABELS,
  MODULE_REQUIRES,
} from '@/settings/moduleCatalogue'
import type { ModuleKey } from '@/settings/moduleCatalogue'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'

// REQUIRES is the UX alias for the shared MODULE_REQUIRES map
const REQUIRES = MODULE_REQUIRES

// -- Mock data -----------------------------------------------------------------

type OrgModules = Record<ModuleKey, boolean>

interface MockOrg {
  orgCode: string
  orgName: string
  modules: OrgModules
}

function makeModules(enabled: ModuleKey[]): OrgModules {
  return Object.fromEntries(
    MODULE_KEYS.map(k => [k, enabled.includes(k)])
  ) as OrgModules
}

const INITIAL_ORGS: MockOrg[] = [
  {
    orgCode: 'ALLIED',
    orgName: 'Allied Insurance Group',
    modules: makeModules([...MODULE_KEYS]),
  },
  {
    orgCode: 'SYNAP',
    orgName: 'Synaptic Re',
    modules: makeModules([
      'module:binding-authorities',
      'module:claims',
      'module:finance',
      'module:reporting',
    ]),
  },
  {
    orgCode: 'TPA1',
    orgName: 'ClaimsPro TPA',
    modules: makeModules(['module:claims']),
  },
]

// -- Component -----------------------------------------------------------------

export default function PlatformAdminPanel() {
  const [orgs, setOrgs] = useState<MockOrg[]>(INITIAL_ORGS)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [depWarning, setDepWarning] = useState<string | null>(null)

  const defaultWidths = useMemo(() => {
    const widths: Record<string, number> = { org: 220 }
    MODULE_KEYS.forEach((k) => { widths[k] = 110 })
    return widths
  }, [])
  const colKeys = useMemo(() => ['org', ...MODULE_KEYS], [])
  const { startResize, getWidth } = useResizableColumns({
    defaultWidths,
    storageKey: 'table-widths-platform-modules',
  })

  function toggle(orgCode: string, key: ModuleKey) {
    setDepWarning(null)
    setSaved(false)

    setOrgs(prev =>
      prev.map(org => {
        if (org.orgCode !== orgCode) return org

        const next: OrgModules = { ...org.modules }
        const enabling = !next[key]

        // Block enabling if a required module is off
        if (enabling) {
          const required = REQUIRES[key]
          if (required && !next[required]) {
            setDepWarning(
              `Cannot enable "${MODULE_LABELS[key]}" — "${MODULE_LABELS[required]}" must be enabled first.`
            )
            return org
          }
        }

        // Disabling binding-authorities cascades to bordereau-import
        if (!enabling && key === 'module:binding-authorities' && next['module:bordereau-import']) {
          next['module:bordereau-import'] = false
          setDepWarning(
            `"Bordereau Import" was also disabled as it requires "${MODULE_LABELS[key]}".`
          )
        }

        next[key] = enabling
        setDirty(true)
        return { ...org, modules: next }
      })
    )
  }

  function handleSave() {
    // TODO: PUT /api/admin/orgs/:orgCode/modules for each dirty org once org_modules table exists
    setSaved(true)
    setDirty(false)
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Module changes take effect on each user's <strong>next login</strong>.
          Changes are per-org — never per-user.
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span
              className={`text-sm px-2 py-1 rounded border ${brandClasses.badge.success}`}
              role="status"
            >
              Saved (mock)
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty}
            data-testid="save-button"
            className={`${brandClasses.button.primaryMedium} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Save changes
          </button>
        </div>
      </div>

      {/* Dependency warning */}
      {depWarning && (
        <div
          className={`text-sm px-3 py-2 rounded border ${brandClasses.badge.warning}`}
          role="alert"
          data-testid="dep-warning"
        >
          {depWarning}
        </div>
      )}

      {/* Module table */}
      <div className="table-wrapper">
        <table className="app-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            {colKeys.map((k) => (
              <col key={k} style={{ width: getWidth(k) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={{ position: 'relative' }}>
                Organisation
                <span
                  className="col-resizer"
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                  onMouseDown={(e) => startResize('org', e)}
                />
              </th>
              {MODULE_KEYS.map(key => (
                <th key={key} style={{ position: 'relative' }}>
                  {MODULE_LABELS[key]}
                  {REQUIRES[key] && (
                    <span className="block text-xs font-normal" style={{ color: 'var(--table-header-text)', opacity: 0.7 }}>
                      requires BA
                    </span>
                  )}
                  <span
                    className="col-resizer"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                    onMouseDown={(e) => startResize(key, e)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.orgCode}>
                <td>
                  <span className="font-medium text-gray-900">{org.orgName}</span>
                  <span className="block text-xs text-gray-400">{org.orgCode}</span>
                </td>
                {MODULE_KEYS.map(key => (
                  <td key={key} className="text-center">
                    <input
                      type="checkbox"
                      aria-label={`${org.orgName} — ${MODULE_LABELS[key]}`}
                      checked={org.modules[key]}
                      onChange={() => toggle(org.orgCode, key)}
                      className="w-4 h-4 cursor-pointer accent-[var(--color-brand)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ? Strawman — mock data only. Requires org_modules DB migration before saves reach the
        database. See <em>12-Module-Access-Control.md §10</em>.
      </p>
    </div>
  )
}
