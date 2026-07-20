import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '@/shell/NotificationDock'
import { getRatingSchedules, type RatingSchedule } from '@/settings/settings.service'

function formatDate(value: string | null): string {
    if (!value) return '\u2014'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '\u2014'
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
    baId: number
}

export default function BASectionRatingConfiguration({ baId }: Props) {
    const { addNotification } = useNotifications()
    const [schedules, setSchedules] = useState<RatingSchedule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        getRatingSchedules({ binding_authority_id: baId })
            .then(setSchedules)
            .catch(() => {
                addNotification('Could not load rating schedules.', 'error')
            })
            .finally(() => setLoading(false))
    }, [baId])

    if (loading) {
        return <p className="text-sm text-gray-500 py-4">Loading rating schedules&hellip;</p>
    }

    if (schedules.length === 0) {
        return (
            <p className="text-sm text-gray-500 py-4">
                No rating schedules configured for this binding authority.
            </p>
        )
    }

    return (
        <div className="table-wrapper rounded-lg shadow-sm">
            <table className="app-table">
                <thead>
                    <tr>
                        <th>Schedule Name</th>
                        <th>Effective From</th>
                        <th>Effective To</th>
                        <th>Status</th>
                        <th>Rules</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {schedules.map((s) => (
                        <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>{formatDate(s.effective_date)}</td>
                            <td>{formatDate(s.expiry_date)}</td>
                            <td>
                                {s.is_active ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        Inactive
                                    </span>
                                )}
                            </td>
                            <td>{s.rules_count ?? 0} rules</td>
                            <td>
                                <Link
                                    to={`/settings/rating-rules/${s.id}`}
                                    className="text-blue-600 hover:underline text-sm"
                                >
                                    View Schedule
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
