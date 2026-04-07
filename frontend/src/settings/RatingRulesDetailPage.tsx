/**
 * Rating Rules detail page — REQ-SETTINGS-RATING-F-004 through F-006
 * Requirements: settings.requirements.md §3b
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getRatingSchedule,
    getRatingRules,
    saveRatingSchedule,
    type RatingSchedule,
    type RatingRule,
} from './settings.service'

export default function RatingRulesDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [schedule, setSchedule] = useState<RatingSchedule | null>(null)
    const [rules, setRules] = useState<RatingRule[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!id) return
        Promise.all([
            getRatingSchedule(id),
            getRatingRules(id),
        ])
            .then(([sch, rls]) => {
                setSchedule(sch)
                setRules(Array.isArray(rls) ? rls : [])
            })
            .finally(() => setLoading(false))
    }, [id])

    function handleAddRule() {
        const newRule: RatingRule = {
            id: Date.now(), // temp id
            field_name: 'postcode',
            operator: 'STARTS_WITH',
            field_value: '',
            rate_percentage: 0.15,
        }
        setRules(prev => [...prev, newRule])
    }

    function handleDeleteRule(ruleId: number) {
        setRules(prev => prev.filter(r => r.id !== ruleId))
    }

    async function handleSave() {
        if (!schedule || !id) return
        setSaving(true)
        try {
            await saveRatingSchedule(id, {
                name: schedule.name,
                effective_date: schedule.effective_date,
                expiry_date: schedule.expiry_date,
                is_active: schedule.is_active,
                rules,
            })
            addNotification('Schedule saved successfully', 'success')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/settings/rating-rules')}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <FiArrowLeft className="text-xl" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">Rating Schedule</h2>
            </div>

            {/* Schedule metadata card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="schedule-name">
                        Schedule Name
                    </label>
                    <input
                        id="schedule-name"
                        type="text"
                        className="border border-gray-300 rounded px-3 py-2 text-sm max-w-md"
                        value={schedule?.name ?? ''}
                        onChange={e => setSchedule(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Effective From</label>
                        <input
                            type="date"
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                            value={schedule?.effective_date ?? ''}
                            onChange={e => setSchedule(prev => prev ? { ...prev, effective_date: e.target.value } : prev)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Expiry Date</label>
                        <input
                            type="date"
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                            value={schedule?.expiry_date ?? ''}
                            onChange={e => setSchedule(prev => prev ? { ...prev, expiry_date: e.target.value || null } : prev)}
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={schedule?.is_active ?? false}
                        onChange={e => setSchedule(prev => prev ? { ...prev, is_active: e.target.checked } : prev)}
                        className="w-4 h-4 text-brand-600"
                    />
                    Active
                </label>
            </div>

            {/* Rules table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800">Rules</h3>
                    <button
                        type="button"
                        onClick={handleAddRule}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700"
                    >
                        <FiPlus />
                        Add Rule
                    </button>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Field</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Operator</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Value</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Rate (%)</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No rules defined. Click "Add Rule" to create one.
                                </td>
                            </tr>
                        ) : (
                            rules.map(rule => (
                                <tr key={rule.id} className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-sm text-gray-900">{rule.field_name}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">{rule.operator}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">{rule.field_value}</td>
                                    <td className="px-4 py-2 text-sm text-gray-700">{rule.rate_percentage}</td>
                                    <td className="px-4 py-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}
