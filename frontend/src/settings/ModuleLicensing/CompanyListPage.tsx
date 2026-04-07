/**
 * CompanyListPage — Module Licensing: list all tenant organisations.
 *
 * Route: /settings/module-licensing
 * Visible to: internal_admin only
 *
 * STRAWMAN — uses hardcoded mock data. Replace with API call once
 * org_modules DB migration is in place.
 * Requirements: settings.requirements.md REQ-SETTINGS-ADMIN-F-001, F-002
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlusCircle } from 'react-icons/fi'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'

interface OrgSummary {
  orgCode: string
  orgName: string
  activeModules: number
  totalModules: number
}

// STUB — replace with GET /api/admin/orgs once the migration is done
const MOCK_ORGS: OrgSummary[] = [
  { orgCode: 'ALLIED', orgName: 'Allied Insurance Group', activeModules: 6, totalModules: 6 },
  { orgCode: 'SYNAP', orgName: 'Synaptic Re', activeModules: 4, totalModules: 6 },
  { orgCode: 'TPA1', orgName: 'ClaimsPro TPA', activeModules: 1, totalModules: 6 },
]

export default function CompanyListPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Module Licensing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage per-organisation module access. Select a company to configure its modules.
          </p>
        </div>
        {/* Add Company — deferred: OQ-040 / OQ-041 (party search modal) */}
        <button
          disabled
          title="Add Company — coming soon (OQ-041)"
          className={`${brandClasses.button.primaryMedium} opacity-50 cursor-not-allowed flex items-center gap-1.5`}
        >
          <FiPlusCircle className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <ResizableGrid
        storageKey="table-widths-company-list"
        columns={[
          { key: 'orgName',       label: 'Organisation',   sortable: true, defaultWidth: 280 },
          { key: 'orgCode',       label: 'Org Code',       sortable: true, defaultWidth: 130 },
          { key: 'activeModules', label: 'Active Modules', sortable: false, defaultWidth: 140 },
          { key: 'navigate',      label: '',               sortable: false, defaultWidth: 60 },
        ]}
        rows={MOCK_ORGS}
        rowKey={(row) => (row as OrgSummary).orgCode}
        emptyMessage="No organisations found."
        onRowClick={(row) => navigate(`/settings/module-licensing/${(row as OrgSummary).orgCode}`)}
        renderCell={(key, row) => {
          const org = row as OrgSummary
          if (key === 'orgName')       return <span className="font-medium text-gray-900">{org.orgName}</span>
          if (key === 'orgCode')       return <span className="text-gray-500 font-mono text-xs">{org.orgCode}</span>
          if (key === 'activeModules') return <span className="text-gray-700">{org.activeModules} / {org.totalModules}</span>
          if (key === 'navigate')      return <span className="text-right block text-gray-400">›</span>
          return null
        }}
      />
    </div>
  )
}
