/**
 * BrokerSearch — click-to-open modal search for Broker parties.
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch } from 'react-icons/fi'
import { listParties } from '@/parties/parties.service'
import type { Party } from '@/parties/parties.service'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BrokerSearchProps {
    selectedParty?: Party | null
    onSelect: (party: Party) => void
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
interface ModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (party: Party) => void
}

function BrokerSearchModal({ isOpen, onClose, onSelect }: ModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Party[]>([])
    const [loading, setLoading] = useState(false)

    // Load all brokers when modal opens
    useEffect(() => {
        if (!isOpen) return
        setQuery('')
        setLoading(true)
        listParties({ type: 'Broker' })
            .then(setResults)
            .catch(() => setResults([]))
            .finally(() => setLoading(false))
    }, [isOpen])

    // Re-query as user types
    useEffect(() => {
        if (!isOpen) return
        if (query.length === 0) {
            setLoading(true)
            listParties({ type: 'Broker' })
                .then(setResults)
                .catch(() => setResults([]))
                .finally(() => setLoading(false))
            return
        }
        setLoading(true)
        listParties({ type: 'Broker', search: query })
            .then(setResults)
            .catch(() => setResults([]))
            .finally(() => setLoading(false))
    }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

    // ESC closes
    useEffect(() => {
        if (!isOpen) return
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-y-0 left-14 right-0 flex items-center justify-center z-50 bg-black bg-opacity-40"
            role="dialog"
            aria-modal="true"
            aria-label="Select broker"
            onClick={onClose}
        >
            <div
                className="bg-white rounded shadow-lg p-6 relative min-w-[300px] w-full max-w-4xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                    ×
                </button>
                <h2 className="text-lg font-semibold mb-4 pr-8">Select Broker</h2>

                <div className="mb-3">
                    <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        type="text"
                        placeholder="Search by name..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                </div>

                {loading ? (
                    <p className="py-6 text-sm text-gray-400 text-center">Loading…</p>
                ) : (
                    <div className="max-h-96 overflow-y-auto border rounded">
                        <ResizableGrid
                            storageKey="table-widths-broker-search"
                            columns={[
                                { key: 'name', label: 'Name', sortable: true, defaultWidth: 220 },
                                { key: 'address', label: 'Address', sortable: false, defaultWidth: 220 },
                                { key: 'city', label: 'City', sortable: true, defaultWidth: 130 },
                                { key: 'postcode', label: 'Postcode / ZIP', sortable: false, defaultWidth: 130 },
                            ]}
                            rows={results}
                            rowKey={(row) => (row as Party).id}
                            emptyMessage="No broker parties found."
                            onRowClick={(row) => onSelect(row as Party)}
                            renderCell={(key, row) => {
                                const party = row as Party
                                if (key === 'name') return party.name
                                if (key === 'address') return (party.addressLine1 as string) || '–'
                                if (key === 'city') return (party.city as string) || '–'
                                if (key === 'postcode') return (party.postcode as string) || (party.zipcode as string) || '–'
                                return null
                            }}
                        />
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

// ---------------------------------------------------------------------------
// BrokerSearch — trigger field + modal
// ---------------------------------------------------------------------------
export default function BrokerSearch({ selectedParty, onSelect }: BrokerSearchProps) {
    const [modalOpen, setModalOpen] = useState(false)

    function handleSelect(party: Party) {
        onSelect(party)
        setModalOpen(false)
    }

    return (
        <div>
            <label
                htmlFor="broker-search-trigger"
                className="block text-sm font-medium text-gray-700 mb-1"
            >
                Placing Broker
            </label>
            <div className="relative">
                <input
                    id="broker-search-trigger"
                    type="text"
                    readOnly
                    aria-label="Search broker"
                    placeholder="Search broker…"
                    value={selectedParty?.name ?? ''}
                    onClick={() => setModalOpen(true)}
                    className="w-full border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    aria-label="Search parties"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-brand-600"
                >
                    <FiSearch size={16} aria-hidden="true" />
                </button>
            </div>

            <BrokerSearchModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelect={handleSelect}
            />
        </div>
    )
}
