/**
 * CoverholderSearchModal — REQ-BA-FE-F-024
 *
 * Party search modal filtered to party type = 'Coverholder'.
 * Used by NewBAPage and BAViewPage for coverholder selection.
 */

import { useEffect, useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { listCoverholders, type CoverholderParty } from '../binding-authorities.service'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSelect: (party: CoverholderParty) => void
}

export default function CoverholderSearchModal({ isOpen, onClose, onSelect }: Props) {
    const [parties, setParties] = useState<CoverholderParty[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        setError(null)
        listCoverholders({ type: 'Coverholder' })
            .then((data) => setParties(data))
            .catch(() => setError('Could not load coverholders.'))
            .finally(() => setLoading(false))
    }, [isOpen])

    if (!isOpen) return null

    const filtered = parties.filter((p) => {
        const term = search.toLowerCase()
        return (
            (p.name ?? '').toLowerCase().includes(term) ||
            (p.reference ?? '').toLowerCase().includes(term) ||
            (p.city ?? '').toLowerCase().includes(term)
        )
    })

    return (
        <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[80vh]">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Select Coverholder</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search coverholders…"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm pl-9"
                    />
                </div>

                {loading && <LoadingSpinner label="Loading coverholders…" />}
                {error && <p className="text-sm text-red-500">{error}</p>}

                {!loading && !error && (
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-left sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-gray-600">Name</th>
                                    <th className="px-4 py-2 font-medium text-gray-600">Reference</th>
                                    <th className="px-4 py-2 font-medium text-gray-600">City</th>
                                    <th className="px-4 py-2 font-medium text-gray-600">Postcode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                                            No coverholders found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => { onSelect(p); onClose() }}
                                            className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-2 font-medium">{p.name}</td>
                                            <td className="px-4 py-2">{p.reference ?? '—'}</td>
                                            <td className="px-4 py-2">{p.city ?? '—'}</td>
                                            <td className="px-4 py-2">{p.postcode ?? '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
