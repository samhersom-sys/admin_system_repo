/**
 * BAListPage — REQ-BA-FE-F-001 to F-008
 *
 * Lists binding authorities; links to /binding-authorities/:id.
 * Supports optional ?submission_id filter (reads from URL params).
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { getBindingAuthorities, type BindingAuthority, type BAStatus } from '../binding-authorities.service'

const STATUS_CLASSES: Record<BAStatus, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

export default function BAListPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [searchParams] = useSearchParams()

    const [bas, setBas] = useState<BindingAuthority[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        getBindingAuthorities()
            .then((data) => {
                const submissionId = searchParams.get('submission_id')
                if (submissionId) {
                    setBas(data.filter((b) => String(b.submission_id) === submissionId))
                } else {
                    setBas(data)
                }
            })
            .catch(() => addNotification('Could not load binding authorities.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Binding Authorities</h2>
                <button
                    type="button"
                    onClick={() => navigate('/binding-authorities/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    <FiPlus />
                    New Binding Authority
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
                                <th className="px-4 py-3 font-medium text-gray-600">Coverholder</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Year of Account</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                        No binding authorities found.
                                    </td>
                                </tr>
                            ) : (
                                bas.map((ba) => (
                                    <tr key={ba.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/binding-authorities/${ba.id}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {ba.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{ba.coverholder ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[ba.status]}`}>
                                                {ba.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{ba.inception_date ?? '—'}</td>
                                        <td className="px-4 py-3">{ba.expiry_date ?? '—'}</td>
                                        <td className="px-4 py-3">{ba.year_of_account ?? '—'}</td>
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
