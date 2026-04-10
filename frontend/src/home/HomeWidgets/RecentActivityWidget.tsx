import { useEffect, useMemo, useState } from 'react'
import { get } from '@/shared/lib/api-client/api-client'
import { relativeTime } from '@/shared/lib/formatters/formatters'
import { FiSearch } from 'react-icons/fi'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'

/**
 * RecentActivityWidget � unified list of recent records matching the backup RecentRecords table.
 *
 * Columns: Reference, Record Type, Submission Type, Policy Status, Record Status,
 *          Insured, Broker, Last Opened, Action
 * All columns are sortable.  Shows at most 50 records.
 * Architecture rules: no hex literals, no direct fetch, no domains/ imports.
 */

const TYPE_ROUTES = {
  submission: '/submissions',
  policy: '/policies',
  quote: '/quotes',
  'binding-authority': '/binding-authorities',
  claim: '/claims',
}

const COLUMNS = [
  { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 140 },
  { key: 'recordType', label: 'Record Type', sortable: true, defaultWidth: 130 },
  { key: 'submissionType', label: 'Submission Type', sortable: true, defaultWidth: 140 },
  { key: 'policyStatus', label: 'Policy Status', sortable: true, defaultWidth: 120 },
  { key: 'recordStatus', label: 'Record Status', sortable: true, defaultWidth: 120 },
  { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 160 },
  { key: 'broker', label: 'Broker', sortable: true, defaultWidth: 150 },
  { key: 'lastOpened', label: 'Last Opened', sortable: true, defaultWidth: 130 },
  { key: 'action', label: 'Action', sortable: false, defaultWidth: 70 },
]

interface ActivityItem {
  id: string | number
  reference: string
  type: string
  submissionType: string
  policyStatus: string
  status: string
  insuredName: string
  broker: string
  lastUpdated: string | null
}

function buildHref(item: ActivityItem) {
  const base = (TYPE_ROUTES as Record<string, string>)[item.type] ?? '/submissions'
  return `${base}/${String(item.id)}`
}

function formatRecordStatus(item: ActivityItem) {
  switch (item.type) {
    case 'submission': return item.status || 'Open'
    case 'binding-authority': return item.status || 'Draft'
    case 'quote': return item.status === 'Quote Created' ? 'Draft' : (item.status || 'Draft')
    case 'policy': return item.status || 'Active'
    default: return item.status || '—'
  }
}

export default function RecentActivityWidget({ orgCode }: { orgCode: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ActivityItem[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastOpened', direction: 'desc' })

  useEffect(() => {
    let cancelled = false

    async function fetchActivity() {
      try {
        const res = await get<{ submissions: unknown[]; quotes: unknown[]; policies: unknown[]; bindingAuthorities: unknown[] }>(`/api/recent-records-data`, {})

        const flatten = (rows: unknown[], type: string, refKey = 'reference'): ActivityItem[] =>
          (Array.isArray(rows) ? rows : []).map((r) => {
            const row = r as Record<string, unknown>
            return {
              id: (row.id as string | number) ?? '',
              reference: String((row[refKey] ?? row['reference']) ?? ''),
              type,
              submissionType: type === 'submission' ? String(row.submissionType ?? row.submission_type ?? '') : '',
              policyStatus: type === 'policy' ? String(row.policyStatus ?? row.policy_status ?? row.status ?? '') : '',
              status: String(row.status ?? ''),
              insuredName: String(row.insuredName ?? row.insured ?? row.name ?? ''),
              broker: String(row.placingBroker ?? row.broker ?? row.placingBrokerName ?? ''),
              lastUpdated: (row.lastOpenedDate ?? row.lastOpened ?? row.createdDate) as string | null,
            }
          })

        const combined = [
          ...flatten(res.submissions, 'submission'),
          ...flatten(res.quotes, 'quote'),
          ...flatten(res.policies, 'policy'),
          ...flatten(res.bindingAuthorities, 'binding-authority'),
        ].sort((a, b) => {
          const ta = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0
          const tb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0
          return tb - ta
        })

        if (!cancelled) setItems(combined.slice(0, 10))
      } catch (err) {
        if (!cancelled) setError('Unable to load recent activity.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchActivity()
    return () => { cancelled = true }
  }, [orgCode])

  const getValue = (item: ActivityItem, key: string): string => {
    switch (key) {
      case 'reference': return item.reference ?? ''
      case 'recordType': return item.type ?? ''
      case 'submissionType': return item.submissionType ?? ''
      case 'policyStatus': return item.policyStatus ?? ''
      case 'recordStatus': return formatRecordStatus(item)
      case 'insured': return item.insuredName ?? ''
      case 'broker': return item.broker ?? ''
      case 'lastOpened': return item.lastUpdated ?? ''
      default: return ''
    }
  }

  const sorted = useMemo(() => {
    const arr = [...items]
    const isDate = sortConfig.key === 'lastOpened'
    arr.sort((a, b) => {
      const va = getValue(a, sortConfig.key)
      const vb = getValue(b, sortConfig.key)
      if (isDate) {
        const da = va ? new Date(va).getTime() : 0
        const db = vb ? new Date(vb).getTime() : 0
        return sortConfig.direction === 'asc' ? da - db : db - da
      }
      const sa = (va ?? '').toString().toLowerCase()
      const sb = (vb ?? '').toString().toLowerCase()
      if (sa < sb) return sortConfig.direction === 'asc' ? -1 : 1
      if (sa > sb) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [items, sortConfig])

  return (
    <div data-testid="recent-activity-widget">
      <Card title="Recent Activity">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Loading recent activity" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ResizableGrid
            storageKey="table-widths-recent-activity"
            columns={COLUMNS}
            rows={sorted}
            sortConfig={sortConfig}
            onRequestSort={(key) =>
              setSortConfig((prev) => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
              }))
            }
            rowKey={(row, idx) => {
              const item = row as ActivityItem
              return `${item.type}-${item.id}-${idx}`
            }}
            emptyMessage="No recent activity."
            renderCell={(key, row) => {
              const item = row as ActivityItem
              if (key === 'reference') {
                return <span>{item.reference}</span>
              }
              if (key === 'recordType') return <span className="capitalize text-gray-600">{item.type.replace('-', ' ')}</span>
              if (key === 'submissionType') return <span className="text-gray-600">{item.submissionType || '—'}</span>
              if (key === 'policyStatus') return <span className="text-gray-600">{item.policyStatus || '—'}</span>
              if (key === 'recordStatus') return (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {formatRecordStatus(item)}
                </span>
              )
              if (key === 'insured') return item.insuredName || '—'
              if (key === 'broker') return <span className="text-gray-600">{item.broker || '—'}</span>
              if (key === 'lastOpened') return <span className="text-gray-500">{relativeTime(item.lastUpdated ?? '')}</span>
              if (key === 'action') return (
                <a
                  href={buildHref(item)}
                  className={`inline-flex items-center justify-center ${brandClasses.icon.actionOpen}`}
                  aria-label="View record"
                >
                  <FiSearch size={15} aria-hidden="true" />
                </a>
              )
              return null
            }}
          />
        )}
      </Card>
    </div>
  )
}
