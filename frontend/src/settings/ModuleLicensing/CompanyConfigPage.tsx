/**
 * CompanyConfigPage — Module Licensing: per-company module toggle configuration.
 *
 * Route: /settings/module-licensing/:orgCode
 * Visible to: internal_admin only
 *
 * STRAWMAN — uses hardcoded mock data keyed by orgCode.
 * Replace INITIAL_STATE with GET /api/admin/orgs/:orgCode/modules once the
 * org_modules DB migration is in place (12-Module-Access-Control.md §10 step 1).
 *
 * Requirements: settings.requirements.md REQ-SETTINGS-ADMIN-F-003 through F-006
 */
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'
import {
  MODULE_KEYS,
  MODULE_LABELS,
  MODULE_DESCRIPTIONS,
  MODULE_REQUIRES,
} from '@/settings/moduleCatalogue'
import type { ModuleKey } from '@/settings/moduleCatalogue'

// REQUIRES is the UX alias for the shared MODULE_REQUIRES map
const REQUIRES = MODULE_REQUIRES

// ── Mock data ─────────────────────────────────────────────────────────────────

type OrgModules = Record<ModuleKey, boolean>

function makeModules(enabled: ModuleKey[]): OrgModules {
  return Object.fromEntries(
    MODULE_KEYS.map(k => [k, enabled.includes(k)])
  ) as OrgModules
}

const ORG_NAMES: Record<string, string> = {
  ALLIED: 'Allied Insurance Group',
  SYNAP: 'Synaptic Re',
  TPA1: 'ClaimsPro TPA',
}

const INITIAL_STATE: Record<string, OrgModules> = {
  ALLIED: makeModules([...MODULE_KEYS]),
  SYNAP: makeModules([
    'module:binding-authorities',
    'module:claims',
    'module:finance',
    'module:reporting',
  ]),
  TPA1: makeModules(['module:claims']),
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompanyConfigPage() {
  const { orgCode = '' } = useParams<{ orgCode: string }>()
  const navigate = useNavigate()

  const orgName = ORG_NAMES[orgCode] ?? orgCode
  const initial = INITIAL_STATE[orgCode] ?? makeModules([])

  const [modules, setModules] = useState<OrgModules>({ ...initial })
  const [dirty, setDirty] = useState(false)
  const [alert, setAlert] = useState<string | null>(null)

  function toggle(key: ModuleKey) {
    setAlert(null)
    const next = !modules[key]

    if (next) {
      // Enable: check dependency
      const dep = REQUIRES[key]
      if (dep && !modules[dep]) {
        setAlert(
          `Cannot enable "${MODULE_LABELS[key]}" — "${MODULE_LABELS[dep]}" must be enabled first.`
        )
        return
      }
    } else {
      // Disable: cascade dependants
      const cascaded = MODULE_KEYS.filter(k => REQUIRES[k] === key && modules[k])
      if (cascaded.length > 0) {
        const labels = cascaded.map(k => `"${MODULE_LABELS[k]}"`).join(', ')
        setAlert(`"${MODULE_LABELS[key]}" was disabled. ${labels} was also disabled due to a dependency.`)
        setModules(prev => {
          const updated = { ...prev, [key]: false }
          cascaded.forEach(k => { updated[k] = false })
          return updated
        })
        setDirty(true)
        return
      }
    }

    setModules(prev => ({ ...prev, [key]: next }))
    setDirty(true)
  }

  function handleSave() {
    // STUB — replace with PUT /api/admin/orgs/:orgCode/modules
    console.info(`[STUB] Saving modules for ${orgCode}:`, modules)
    setDirty(false)
    setAlert('Module configuration saved (mock).')
  }

  return (
    <div className="p-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/settings/module-licensing')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back to companies
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{orgName}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Module configuration for <span className="font-mono text-xs">{orgCode}</span>
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div role="alert" className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
          {alert}
        </div>
      )}

      {/* Module list */}
      <div className="flex flex-col gap-3 mb-8">
        {MODULE_KEYS.map(key => (
          <label
            key={key}
            className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{MODULE_LABELS[key]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{MODULE_DESCRIPTIONS[key]}</p>
            </div>
            <input
              type="checkbox"
              checked={modules[key]}
              onChange={() => toggle(key)}
              className="mt-0.5 w-4 h-4 cursor-pointer accent-[var(--color-brand)] flex-shrink-0"
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!dirty}
        className={`${brandClasses.button.primaryMedium} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Save changes
      </button>
    </div>
  )
}
