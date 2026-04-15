/**
 * SearchForm — filter bar for the global Search page.
 *
 * Architecture rules:
 *   - No data fetching. Emits filter state changes via onFilterChange.
 *   - No domain imports.
 *   - CSS vars only for colours (guideline §7.3 RULE 2).
 */

import React, { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiX } from 'react-icons/fi'

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecordType = 'Submission' | 'Quote' | 'Policy' | 'Binding Authority' | 'Party' | 'Claim'

const ALL_RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: 'Submission', label: 'Submission' },
  { value: 'Quote', label: 'Quote' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Binding Authority', label: 'Binding Authority' },
  { value: 'Party', label: 'Party' },
  { value: 'Claim', label: 'Claim' },
]

export interface SearchFilters {
  types: RecordType[]        // REQ-SEARCH-FE-F-008 — multi-select
  reference: string
  status: string
  insured: string            // REQ-SEARCH-FE-F-016
  broker: string             // REQ-SEARCH-FE-F-017
  yearOfAccount: string      // REQ-SEARCH-FE-F-018
  inceptionFrom: string
  inceptionTo: string
  expiryFrom: string
  expiryTo: string
  lastOpenedFrom: string     // REQ-SEARCH-FE-F-019
  lastOpenedTo: string
  createdFrom: string        // REQ-SEARCH-FE-F-020
  createdTo: string
  createdBy: string          // REQ-SEARCH-FE-F-021
}

export const EMPTY_FILTERS: SearchFilters = {
  types: [],
  reference: '',
  status: '',
  insured: '',
  broker: '',
  yearOfAccount: '',
  inceptionFrom: '',
  inceptionTo: '',
  expiryFrom: '',
  expiryTo: '',
  lastOpenedFrom: '',
  lastOpenedTo: '',
  createdFrom: '',
  createdTo: '',
  createdBy: '',
}

interface SearchFormProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SearchForm({ filters, onChange }: SearchFormProps) {
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [typeSearch, setTypeSearch] = useState('')
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const filteredTypeOptions = ALL_RECORD_TYPES.filter(({ label }) =>
    label.toLowerCase().includes(typeSearch.toLowerCase())
  )

  function set(field: keyof SearchFilters) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...filters, [field]: e.target.value })
    }
  }

  function toggleType(type: RecordType) {
    const next = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type]
    onChange({ ...filters, types: next })
  }

  function handleClear() {
    onChange({ ...EMPTY_FILTERS })
  }

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-4 mb-4">

      {/* Row 0 — Type multi-select dropdown (REQ-SEARCH-FE-F-007, F-008) */}
      <div ref={typeDropdownRef} className="relative max-w-xs">
        <span className={labelCls}>Type</span>
        <button
          type="button"
          onClick={() => setIsTypeOpen(prev => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isTypeOpen}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span className="truncate text-gray-700">
            {filters.types.length === 0
              ? 'All types'
              : ALL_RECORD_TYPES
                .filter(({ value }) => filters.types.includes(value))
                .map(({ label }) => label)
                .join(', ')}
          </span>
          <FiChevronDown
            aria-hidden="true"
            className={`ml-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-150 ${isTypeOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/*
          Panel is always in the DOM (max-h clipping, not display:none)
          so existing RTL tests can still find checkboxes by role.
        */}
        <div
          className={`absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg transition-all duration-150 ${isTypeOpen
              ? 'max-h-72 overflow-y-auto opacity-100'
              : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
            }`}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <input
              type="text"
              value={typeSearch}
              onChange={e => setTypeSearch(e.target.value)}
              placeholder="Search types…"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {/* Options */}
          <div className="py-1">
            {filteredTypeOptions.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  aria-label={label}
                  checked={filters.types.includes(value)}
                  onChange={() => toggleType(value)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1 — text filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">

        {/* Reference */}
        <div>
          <label htmlFor="sf-reference" className={labelCls}>Reference</label>
          <input
            id="sf-reference"
            aria-label="Reference"
            type="text"
            className={inputCls}
            value={filters.reference}
            onChange={set('reference')}
            placeholder="SUB-…"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="sf-status" className={labelCls}>Status</label>
          <input
            id="sf-status"
            aria-label="Status"
            type="text"
            className={inputCls}
            value={filters.status}
            onChange={set('status')}
            placeholder="Created, Quoted…"
          />
        </div>

        {/* Insured (REQ-SEARCH-FE-F-016) */}
        <div>
          <label htmlFor="sf-insured" className={labelCls}>Insured</label>
          <input
            id="sf-insured"
            aria-label="Insured"
            type="text"
            className={inputCls}
            value={filters.insured}
            onChange={set('insured')}
            placeholder="Insured name…"
          />
        </div>

        {/* Broker (REQ-SEARCH-FE-F-017) */}
        <div>
          <label htmlFor="sf-broker" className={labelCls}>Broker</label>
          <input
            id="sf-broker"
            aria-label="Broker"
            type="text"
            className={inputCls}
            value={filters.broker}
            onChange={set('broker')}
            placeholder="Broker name…"
          />
        </div>

        {/* Year of Account (REQ-SEARCH-FE-F-018) */}
        <div>
          <label htmlFor="sf-yoa" className={labelCls}>Year of Account</label>
          <input
            id="sf-yoa"
            aria-label="Year of Account"
            type="text"
            className={inputCls}
            value={filters.yearOfAccount}
            onChange={set('yearOfAccount')}
            placeholder="2026"
          />
        </div>

      </div>

      {/* Row 2 — inception + expiry date ranges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">

        <div>
          <label htmlFor="sf-inception-from" className={labelCls}>Inception From</label>
          <input id="sf-inception-from" aria-label="Inception From" type="date" className={inputCls} value={filters.inceptionFrom} onChange={set('inceptionFrom')} />
        </div>

        <div>
          <label htmlFor="sf-inception-to" className={labelCls}>Inception To</label>
          <input id="sf-inception-to" aria-label="Inception To" type="date" className={inputCls} value={filters.inceptionTo} onChange={set('inceptionTo')} />
        </div>

        <div>
          <label htmlFor="sf-expiry-from" className={labelCls}>Expiry From</label>
          <input id="sf-expiry-from" aria-label="Expiry From" type="date" className={inputCls} value={filters.expiryFrom} onChange={set('expiryFrom')} />
        </div>

        <div>
          <label htmlFor="sf-expiry-to" className={labelCls}>Expiry To</label>
          <input id="sf-expiry-to" aria-label="Expiry To" type="date" className={inputCls} value={filters.expiryTo} onChange={set('expiryTo')} />
        </div>

      </div>

      {/* Row 3 — last opened + created date ranges + created by + clear */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">

        <div>
          <label htmlFor="sf-last-opened-from" className={labelCls}>Last Opened From</label>
          <input id="sf-last-opened-from" aria-label="Last Opened From" type="date" className={inputCls} value={filters.lastOpenedFrom} onChange={set('lastOpenedFrom')} />
        </div>

        <div>
          <label htmlFor="sf-last-opened-to" className={labelCls}>Last Opened To</label>
          <input id="sf-last-opened-to" aria-label="Last Opened To" type="date" className={inputCls} value={filters.lastOpenedTo} onChange={set('lastOpenedTo')} />
        </div>

        <div>
          <label htmlFor="sf-created-from" className={labelCls}>Created From</label>
          <input id="sf-created-from" aria-label="Created From" type="date" className={inputCls} value={filters.createdFrom} onChange={set('createdFrom')} />
        </div>

        <div>
          <label htmlFor="sf-created-to" className={labelCls}>Created To</label>
          <input id="sf-created-to" aria-label="Created To" type="date" className={inputCls} value={filters.createdTo} onChange={set('createdTo')} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sf-created-by" className={labelCls}>Created By</label>
          <input id="sf-created-by" aria-label="Created By" type="text" className={inputCls} value={filters.createdBy} onChange={set('createdBy')} placeholder="User name…" />
        </div>

      </div>

      {/* Clear button */}
      <div className="flex justify-end">
        {/* REQ-SEARCH-FE-F-010 */}
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
          onClick={handleClear}
          aria-label="Clear"
        >
          <FiX aria-hidden="true" />
          Clear
        </button>
      </div>

    </div>
  )
}
