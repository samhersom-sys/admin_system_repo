/**
 * SearchResults — sortable results table with pagination.
 *
 * Architecture rules:
 *   - Display only. Navigation via useNavigate.
 *   - No data fetching, no domain imports.
 *   - CSS vars only for colours (guideline §7.3 RULE 2).
 */

import React, { useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityType = 'Submission' | 'Quote' | 'Policy' | 'BindingAuthority' | 'Party' | 'Claim'

export interface SearchRecord {
  id: number
  entityType: EntityType
  reference?: string
  status?: string
  insured?: string
  name?: string           // parties use 'name' not 'insured'
  broker?: string
  yearOfAccount?: string | number
  inceptionDate?: string
  expiryDate?: string
  createdDate?: string
  createdBy?: string
  lastOpenedDate?: string | null
}

type SortKey = keyof SearchRecord

const PAGE_SIZE = 50

// REQ-SEARCH-FE-F-014 — domain URL map
function recordUrl(record: SearchRecord): string | null {
  const id = record.id
  switch (record.entityType) {
    case 'Submission': return `/submissions/${id}`
    case 'Quote': return `/quotes/${id}`
    case 'Policy': return `/policies/${id}`
    case 'BindingAuthority': return `/binding-authorities/${id}`
    case 'Party': return `/parties/${id}`
    case 'Claim': return null
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: string | null | undefined, type: 'date' | 'datetime' | 'text' = 'text'): string {
  if (!val) return '—'
  if (type === 'date') {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return d.toLocaleDateString('en-GB')
  }
  if (type === 'datetime') {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
  }
  return val
}

function sortRecords(records: SearchRecord[], key: SortKey, dir: 'asc' | 'desc'): SearchRecord[] {
  return [...records].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Column definitions ──────────────────────────────────────────────────────

// REQ-SHARED-GRID-C-001 — ResizableGrid column definitions
const GRID_COLUMNS: Column[] = [
  { key: 'entityType', label: 'Record Type', sortable: true, defaultWidth: 130 },
  { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 200 },
  { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
  { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 160 },
  { key: 'name', label: 'Party Name', sortable: true, defaultWidth: 160 },
  { key: 'broker', label: 'Broker', sortable: true, defaultWidth: 130 },
  { key: 'yearOfAccount', label: 'YoA', sortable: true, defaultWidth: 60 },
  { key: 'inceptionDate', label: 'Inception', sortable: true, defaultWidth: 100 },
  { key: 'expiryDate', label: 'Expiry', sortable: true, defaultWidth: 100 },
  { key: 'lastOpenedDate', label: 'Last Opened', sortable: true, defaultWidth: 150 },
  { key: 'createdDate', label: 'Created', sortable: true, defaultWidth: 100 },
  { key: 'createdBy', label: 'Created By', sortable: true, defaultWidth: 130 },
  { key: '_action', label: '', sortable: false, defaultWidth: 44 },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface SearchResultsProps {
  records: SearchRecord[]
}

export default function SearchResults({ records }: SearchResultsProps) {

  // REQ-SEARCH-FE-F-012 — sort state; default Last Opened desc
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'lastOpenedDate',
    direction: 'desc',
  })

  // REQ-SEARCH-FE-F-013 — pagination
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () => sortRecords(records, sortConfig.key as SortKey, sortConfig.direction),
    [records, sortConfig]
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length)
  const visible = sorted.slice(pageStart, pageEnd)

  function handleSort(key: string) {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    )
    setPage(1)
  }

  function renderCell(key: string, row: unknown): React.ReactNode {
    const record = row as SearchRecord
    const href = recordUrl(record)
    if (key === 'reference') {
      return <span>{record.reference ?? '—'}</span>
    }
    if (key === '_action') {
      if (!href) {
        return <span className="text-xs text-gray-400">—</span>
      }
      return (
        <a
          href={href}
          className={`inline-flex items-center justify-center ${brandClasses.icon.actionOpen}`}
          aria-label="View record"
        >
          <FiSearch size={15} aria-hidden="true" />
        </a>
      )
    }
    if (key === 'entityType') return record.entityType
    if (key === 'status') return record.status ?? '—'
    if (key === 'insured') return record.entityType === 'Party' ? '—' : (record.insured ?? '—')
    if (key === 'name') return record.entityType === 'Party' ? (record.name ?? '—') : '—'
    if (key === 'broker') return record.broker ?? '\u2014'
    if (key === 'yearOfAccount') return record.yearOfAccount ? String(record.yearOfAccount) : '\u2014'
    if (key === 'inceptionDate') return fmt(record.inceptionDate, 'date')
    if (key === 'expiryDate') return fmt(record.expiryDate, 'date')
    if (key === 'lastOpenedDate') return fmt(record.lastOpenedDate, 'datetime')
    if (key === 'createdDate') return fmt(record.createdDate, 'date')
    if (key === 'createdBy') return record.createdBy ?? '—'
    return '—'
  }

  const btnSm = 'px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40'

  return (
    <div>
      {/* REQ-SEARCH-FE-F-015 — summary line */}
      <p className="text-sm text-gray-500 mb-2" aria-live="polite">
        {sorted.length === 0
          ? '0 results'
          : `Showing ${pageStart + 1}–${pageEnd} of ${sorted.length} results`}
      </p>

      <ResizableGrid
        columns={GRID_COLUMNS}
        rows={visible}
        storageKey="table-widths-search"
        sortConfig={sortConfig}
        onRequestSort={handleSort}
        renderCell={renderCell}
        rowKey={(row, i) => `${(row as SearchRecord).entityType}-${(row as SearchRecord).id}-${i}`}
        emptyMessage="No results found."
      />

      {/* REQ-SEARCH-FE-F-013 — pagination controls */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className={btnSm}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            type="button"
            className={btnSm}
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}