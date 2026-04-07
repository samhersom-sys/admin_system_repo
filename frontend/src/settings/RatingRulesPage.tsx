/**
 * Rating Rules list page — REQ-SETTINGS-RATING-F-001 through F-003
 * Requirements: settings.requirements.md §3b
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSliders } from 'react-icons/fi'
import { getRatingSchedules, type RatingSchedule } from './settings.service'

function formatDate(value: string | null) {
    if (!value) return '—'
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export default function RatingRulesPage() {
    const navigate = useNavigate()
    const [schedules, setSchedules] = useState<RatingSchedule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getRatingSchedules()
            .then(data => setSchedules(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <FiSliders className="text-brand-500 text-2xl" />
                <h2 className="text-2xl font-semibold text-gray-900">Rating Rules</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Effective From</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Effective To</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No rating schedules found.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map(s => (
                                    <tr
                                        key={s.id}
                                        className="border-b border-gray-100 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => navigate(`/settings/rating-rules/${s.id}`)}
                                    >
                                        <td className="px-4 py-3 text-gray-900 font-medium">{s.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDate(s.effective_date)}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDate(s.expiry_date)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {s.is_active ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
