/**
 * BASearchModal — REQ-BA-FE-F-091 to F-098
 *
 * Debounced search for binding authorities.
 * Props: onSelect(ba) callback; onClose callback.
 */

import { useState, useEffect, useRef } from 'react'
import { FiX, FiSearch } from 'react-icons/fi'
import { getBindingAuthorities, type BindingAuthority, type BAStatus } from '../binding-authorities.service'

const STATUS_CLASSES: Record<BAStatus, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

interface BASearchModalProps {
    onSelect: (ba: BindingAuthority) => void
    onClose: () => void
}

export default function BASearchModal({ onSelect, onClose }: BASearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<BindingAuthority[]>([])
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!query.trim()) {
            setResults([])
            return
        }
        debounceRef.current = setTimeout(() => {
            setLoading(true)
            getBindingAuthorities(query.trim())
                .then(setResults)
                .catch(() => setResults([]))
                .finally(() => setLoading(false))
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query])

    function handleClear() {
        setQuery('')
        setResults([])
    }

    return (
        <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Search Binding Authorities</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FiX />
                    </button>
                </div>

                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by reference or coverholder…"
                        className="w-full border border-gray-300 rounded pl-9 pr-9 py-2 text-sm"
                        autoFocus
                    />
                    {query && (
                        <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <FiX size={14} />
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Coverholder</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Searching…</td>
                                </tr>
                            ) : results.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                        {query.trim() ? 'No results found.' : 'Type to search.'}
                                    </td>
                                </tr>
                            ) : (
                                results.map((ba) => (
                                    <tr
                                        key={ba.id}
                                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => onSelect(ba)}
                                    >
                                        <td className="px-4 py-3 font-medium text-brand-600">{ba.reference}</td>
                                        <td className="px-4 py-3">{ba.coverholder ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[ba.status]}`}>
                                                {ba.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{ba.inception_date ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
