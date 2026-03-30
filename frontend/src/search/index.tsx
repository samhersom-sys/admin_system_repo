/**
 * SearchPage — global cross-entity search.
 *
 * REQ-SEARCH-FE-F-001 through F-015.
 *
 * Architecture rules:
 *   - All HTTP via get() from @/lib/api-client.
 *   - URL param ?type= pre-selects the type filter.
 *   - 300 ms debounce before triggering a request.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { get } from '@/shared/lib/api-client/api-client'
import SearchForm, { EMPTY_FILTERS, SearchFilters, RecordType } from './SearchForm'
import SearchResults, { SearchRecord, EntityType } from './SearchResults'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawRecord {
  id: number
  reference?: string
  status?: string
  insured?: string
  name?: string
  broker?: string
  inceptionDate?: string
  expiryDate?: string
  createdDate?: string
  createdBy?: string
  lastOpenedDate?: string | null
}

interface SearchResponse {
  submissions: RawRecord[]
  quotes: RawRecord[]
  policies: RawRecord[]
  bindingAuthorities: RawRecord[]
  parties: RawRecord[]
  claims: RawRecord[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSearchRecord(raw: RawRecord, entityType: EntityType): SearchRecord {
  return { ...raw, entityType }
}

function flattenResponse(resp: SearchResponse): SearchRecord[] {
  return [
    ...resp.submissions.map(r => toSearchRecord(r, 'Submission')),
    ...resp.quotes.map(r => toSearchRecord(r, 'Quote')),
    ...resp.policies.map(r => toSearchRecord(r, 'Policy')),
    ...resp.bindingAuthorities.map(r => toSearchRecord(r, 'BindingAuthority')),
    ...resp.parties.map(r => toSearchRecord(r, 'Party')),
    ...resp.claims.map(r => toSearchRecord(r, 'Claim')),
  ]
}

function buildQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams()
  if (filters.types.length > 0) params.set('types', filters.types.join(','))
  if (filters.reference) params.set('reference', filters.reference)
  if (filters.status) params.set('status', filters.status)
  if (filters.insured) params.set('insured', filters.insured)
  if (filters.broker) params.set('broker', filters.broker)
  if (filters.yearOfAccount) params.set('yearOfAccount', filters.yearOfAccount)
  if (filters.inceptionFrom) params.set('inceptionFrom', filters.inceptionFrom)
  if (filters.inceptionTo) params.set('inceptionTo', filters.inceptionTo)
  if (filters.expiryFrom) params.set('expiryFrom', filters.expiryFrom)
  if (filters.expiryTo) params.set('expiryTo', filters.expiryTo)
  if (filters.lastOpenedFrom) params.set('lastOpenedFrom', filters.lastOpenedFrom)
  if (filters.lastOpenedTo) params.set('lastOpenedTo', filters.lastOpenedTo)
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom)
  if (filters.createdTo) params.set('createdTo', filters.createdTo)
  if (filters.createdBy) params.set('createdBy', filters.createdBy)
  const qs = params.toString()
  return qs ? `/api/search?${qs}` : '/api/search'
}

const DEBOUNCE_MS = 300

// ─── Component ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams()

  // REQ-SEARCH-FE-F-003 — initialise types from URL param (supports legacy ?type= and new ?types=)
  const initialFilters = useMemo<SearchFilters>(() => {
    const ALL_TYPES: RecordType[] = ['Submission', 'Quote', 'Policy', 'BindingAuthority', 'Party', 'Claim']
    const typesParam = searchParams.get('types') ?? ''
    const typeParam = searchParams.get('type') ?? ''
    let preSelected: RecordType[] = []
    if (typesParam) {
      preSelected = typesParam.split(',').filter(t => ALL_TYPES.includes(t as RecordType)) as RecordType[]
    } else if (typeParam && ALL_TYPES.includes(typeParam as RecordType)) {
      preSelected = [typeParam as RecordType]
    }
    return { ...EMPTY_FILTERS, types: preSelected }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — only on mount

  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [records, setRecords] = useState<SearchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRecords = useCallback(
    (activeFilters: SearchFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        setError(null)
        try {
          const url = buildQueryString(activeFilters)
          const resp = await get<SearchResponse>(url)
          setRecords(flattenResponse(resp))
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to load search results'
          setError(msg)
        } finally {
          setLoading(false)
        }
      }, DEBOUNCE_MS)
    },
    []
  )

  // REQ-SEARCH-FE-F-001 — fetch on mount
  useEffect(() => {
    fetchRecords(initialFilters)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  // REQ-SEARCH-FE-F-002 — re-fetch when filters change
  function handleFilterChange(next: SearchFilters) {
    setFilters(next)
    fetchRecords(next)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* REQ-SEARCH-FE-F-008 — filter form */}
      <SearchForm filters={filters} onChange={handleFilterChange} />

      {/* REQ-SEARCH-FE-F-004 — loading state */}
      {loading && (
        <div role="status" className="flex items-center gap-2 py-8 text-sm text-gray-500" aria-label="Loading">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      )}

      {/* REQ-SEARCH-FE-F-005 — error state */}
      {!loading && error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results or empty state */}
      {!loading && !error && (
        <SearchResults records={records} />
      )}
    </div>
  )
}

