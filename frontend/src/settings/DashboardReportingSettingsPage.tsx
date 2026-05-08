/**
 * Dashboard & Reporting Settings page
 *
 * REQ-SETTINGS-DASH-F-001 through F-007
 * Requirements: settings.requirements.md §2
 *
 * Allows tenant admins to view all measures (internal read-only, custom editable)
 * and create or deactivate custom measures for their organisation.
 */

import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getMeasures,
    createMeasure,
    deactivateMeasure,
    type Measure,
} from './settings.service'

const AVAILABLE_SOURCES = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'policies', label: 'Policies' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'bindingAuthorities', label: 'Binding Authorities' },
]

const EMPTY_FORM = { key: '', label: '', sourceKey: 'policies', measureType: 'count' as const }

export default function DashboardReportingSettingsPage() {
    const { addNotification } = useNotifications()
    const [measures, setMeasures] = useState<Measure[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getMeasures()
            .then(setMeasures)
            .catch((err: Error) => setError(err.message ?? 'Failed to load measures.'))
            .finally(() => setLoading(false))
    }, [])

    const internal = measures.filter(m => m.createdByType === 'internal')
    const custom = measures.filter(m => m.createdByType === 'tenant')

    async function handleDeactivate(id: number) {
        try {
            await deactivateMeasure(id)
            setMeasures(prev => prev.filter(m => m.id !== id))
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to deactivate measure.'
            addNotification(msg, 'error')
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!form.key.trim() || !form.label.trim()) return
        setSaving(true)
        try {
            const created = await createMeasure({
                key: form.key.trim(),
                label: form.label.trim(),
                sourceKey: form.sourceKey,
                measureType: form.measureType,
            })
            setMeasures(prev => [...prev, created])
            setForm(EMPTY_FORM)
            setShowForm(false)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create measure.'
            addNotification(msg, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center" aria-label="Loading measures">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div role="alert" className="text-red-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl flex flex-col gap-8">

            {/* Internal measures — read-only */}
            <section aria-labelledby="internal-measures-heading">
                <h2 id="internal-measures-heading" className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Internal Measures
                </h2>
                {internal.length === 0 ? (
                    <p className="text-sm text-gray-400">No internal measures.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {internal.map(m => (
                            <MeasureRow key={m.id} measure={m} />
                        ))}
                    </div>
                )}
            </section>

            {/* Custom (tenant) measures */}
            <section aria-labelledby="custom-measures-heading">
                <div className="flex items-center justify-between mb-3">
                    <h2 id="custom-measures-heading" className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Custom Measures
                    </h2>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                        <FiPlus className="w-4 h-4" />
                        Add Custom Measure
                    </button>
                </div>

                {showForm && (
                    <form
                        onSubmit={handleCreate}
                        className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-col gap-3"
                        aria-label="Add custom measure form"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Key</label>
                                <input
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    placeholder="e.g. countActiveRenewals"
                                    value={form.key}
                                    onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Label</label>
                                <input
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    placeholder="e.g. Active Renewals"
                                    value={form.label}
                                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Source</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    value={form.sourceKey}
                                    onChange={e => setForm(f => ({ ...f, sourceKey: e.target.value }))}
                                >
                                    {AVAILABLE_SOURCES.map(s => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Measure Type</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    value={form.measureType}
                                    onChange={e => setForm(f => ({ ...f, measureType: e.target.value as 'count' | 'sum' | 'ratio' }))}
                                >
                                    <option value="count">Count</option>
                                    <option value="sum">Sum</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save Measure'}
                            </button>
                        </div>
                    </form>
                )}

                {custom.length === 0 ? (
                    <p className="text-sm text-gray-400">No custom measures yet.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {custom.map(m => (
                            <MeasureRow key={m.id} measure={m} onDeactivate={() => handleDeactivate(m.id)} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

function MeasureRow({ measure, onDeactivate }: { measure: Measure; onDeactivate?: () => void }) {
    const sourceLabel = AVAILABLE_SOURCES.find(s => s.key === measure.sourceKey)?.label ?? measure.sourceKey
    return (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div>
                <span className="font-medium text-gray-900 text-sm">{measure.label}</span>
                <span className="ml-2 text-xs text-gray-400">{sourceLabel} · {measure.measureType}</span>
            </div>
            {onDeactivate && (
                <button
                    onClick={onDeactivate}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    aria-label={`Deactivate ${measure.label}`}
                >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    Deactivate
                </button>
            )}
        </div>
    )
}
