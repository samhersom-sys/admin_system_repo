/**
 * QuoteSearchModal — reusable modal for searching and selecting an existing quote.
 *
 * Requirements: frontend/src/quotes/quotes.requirements.md
 * Tests: frontend/src/quotes/quotes.test.tsx
 *
 * REQ-QUO-FE-F-066 — component + props
 * REQ-QUO-FE-F-067 — loading indicator
 * REQ-QUO-FE-F-068 — filter input + results table
 * REQ-QUO-FE-F-069 — excludeIds filtering
 * REQ-QUO-FE-F-070 — row click → onSelect + onClose
 * REQ-QUO-FE-F-071 — empty state
 * REQ-QUO-FE-F-072 — error state
 * REQ-QUO-FE-F-073 — cancel / backdrop dismiss
 */

import { useEffect, useState } from 'react'
import { FiX, FiSearch } from 'react-icons/fi'
import { listQuotes } from '@/quotes/quotes.service'
import type { Quote } from '@/quotes/quotes.service'

interface QuoteSearchModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (quote: Quote) => void
    excludeIds?: number[]
}

export default function QuoteSearchModal({ isOpen, onClose, onSelect, excludeIds }: QuoteSearchModalProps) {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setSearch('')
        setError(null)
        setLoading(true)
        listQuotes()
            .then((data) => setQuotes(Array.isArray(data) ? data : []))
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false))
    }, [isOpen])

    if (!isOpen) return null

    const lower = search.toLowerCase()
    const filtered = quotes
        .filter((q) => !excludeIds?.includes(q.id))
        .filter((q) => {
            if (!lower) return true
            return (
                (q.reference || '').toLowerCase().includes(lower) ||
                (q.insured || '').toLowerCase().includes(lower) ||
                (q.status || '').toLowerCase().includes(lower)
            )
        })

    function handleRowClick(quote: Quote) {
        onSelect(quote)
        onClose()
    }

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) onClose()
    }

    return (
        <div
            className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Link Existing Quote</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                        <FiX />
                    </button>
                </div>

                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by reference, insured or status…"
                        className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm"
                        autoFocus
                    />
                </div>

                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : loading ? (
                    <p className="text-xs text-gray-500">Loading quotes…</p>
                ) : (
                    <div className="max-h-96 overflow-y-auto border rounded">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Insured</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Business Type</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                            No quotes found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((q) => (
                                        <tr
                                            key={q.id}
                                            className="cursor-pointer hover:bg-brand-50 border-b border-gray-100"
                                            onClick={() => handleRowClick(q)}
                                        >
                                            <td className="px-4 py-2 text-brand-600">{q.reference}</td>
                                            <td className="px-4 py-2 text-gray-700">{q.insured || '—'}</td>
                                            <td className="px-4 py-2 text-gray-700">{q.status || '—'}</td>
                                            <td className="px-4 py-2 text-gray-700">{q.business_type || '—'}</td>
                                            <td className="px-4 py-2 text-gray-700">{q.inception_date || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
