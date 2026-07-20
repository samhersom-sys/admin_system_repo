import React, { useEffect, useState } from 'react'
import { get as apiGet } from '@/shared/lib/api-client/api-client'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

interface EarningPeriod {
    id: number
    periodYear: number
    periodMonth: number
    totalPremium: string
    earnedAmount: string
    unearnedAmount: string
    earnByBasis: string
    daysEarned: number
    daysInPeriod: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
    sectionId: number | string
}

export default function PolicySectionFinanceSummary({ sectionId }: Props) {
    const [periods, setPeriods] = useState<EarningPeriod[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        apiGet<EarningPeriod[]>(`/api/earning-engine/sections/${sectionId}/periods`)
            .then((data: EarningPeriod[]) => {
                setPeriods(data)
                setLoading(false)
            })
            .catch(() => {
                setError('Failed to load earning periods.')
                setLoading(false)
            })
    }, [sectionId])

    if (loading) {
        return (
            <div className="p-4 flex justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    if (error) {
        return <div className="p-4 text-sm text-red-600">{error}</div>
    }

    if (!periods.length) {
        return (
            <div className="p-4 text-sm text-gray-500">
                No earning periods calculated yet. Run the earning engine to generate figures.
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 font-medium text-gray-600">Calendar Period</th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">Total Premium</th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">GWP Earn</th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">Unearned</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Basis</th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">Days</th>
                    </tr>
                </thead>
                <tbody>
                    {periods.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2">{MONTH_NAMES[p.periodMonth - 1]} {p.periodYear}</td>
                            <td className="px-4 py-2 text-right font-mono">
                                {parseFloat(p.totalPremium).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                                {parseFloat(p.earnedAmount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                                {parseFloat(p.unearnedAmount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-4 py-2 capitalize">{p.earnByBasis}</td>
                            <td className="px-4 py-2 text-right">{p.daysEarned} / {p.daysInPeriod}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
