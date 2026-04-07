/**
 * CashBatchingPage — REQ-FIN-FE-F-011 to F-018
 *
 * Lists cash batches; remaining shown in red when > 0 and status !== 'Closed'.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { getCashBatches, type CashBatch } from '../finance.service'

const STATUS_CLASSES: Record<string, string> = {
    Open: 'bg-amber-100 text-amber-800',
    Partial: 'bg-blue-100 text-blue-800',
    Closed: 'bg-green-100 text-green-800',
}

export default function CashBatchingPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [batches, setBatches] = useState<CashBatch[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        getCashBatches()
            .then(setBatches)
            .catch(() => addNotification('Could not load cash batches.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Cash Batching</h2>
                <button
                    type="button"
                    onClick={() => navigate('/finance/cash-batching/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    <FiPlus />
                    Create Batch
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Currency</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Allocated</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Remaining</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Assigned To</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Created Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                        No cash batches found.
                                    </td>
                                </tr>
                            ) : (
                                batches.map((b) => (
                                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/finance/cash-batching/${b.id}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {b.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{b.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3">{b.currency}</td>
                                        <td className="px-4 py-3">{b.allocated.toLocaleString()}</td>
                                        <td
                                            className={`px-4 py-3 font-medium ${b.remaining > 0 && b.status !== 'Closed' ? 'text-red-600' : ''}`}
                                        >
                                            {b.remaining.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[b.status] ?? 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{b.assigned_to ?? '—'}</td>
                                        <td className="px-4 py-3">{b.created_date ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
