/**
 * BASectionViewPage — REQ-BA-FE-F-073 to F-086
 *
 * 4-tab view: Coverage | Participations | Authorized Risk Codes | GPI Monitoring
 * Participations: share % must total 100 ± 0.0001
 */

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getBASections,
    updateBASection,
    getParticipations,
    saveParticipations,
    getAuthorizedRiskCodes,
    addAuthorizedRiskCode,
    removeAuthorizedRiskCode,
    type BASection,
    type Participation,
} from '../binding-authorities.service'

type Tab = 'coverage' | 'participations' | 'risk-codes' | 'gpi'

const TABS: { key: Tab; label: string }[] = [
    { key: 'coverage', label: 'Coverage' },
    { key: 'participations', label: 'Participations' },
    { key: 'risk-codes', label: 'Authorized Risk Codes' },
    { key: 'gpi', label: 'GPI Monitoring' },
]

export default function BASectionViewPage() {
    const { id, sectionId } = useParams<{ id: string; sectionId: string }>()
    const { addNotification } = useNotifications()

    const baId = parseInt(id ?? '0', 10)
    const secId = parseInt(sectionId ?? '0', 10)

    const [section, setSection] = useState<BASection | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('coverage')
    const [saving, setSaving] = useState(false)

    // Coverage form
    const [coverageForm, setCoverageForm] = useState<Partial<BASection>>({})

    // Participations
    const [participations, setParticipations] = useState<Participation[]>([])
    const [partLoaded, setPartLoaded] = useState(false)
    const [savingPart, setSavingPart] = useState(false)

    // Risk codes
    const [riskCodes, setRiskCodes] = useState<string[]>([])
    const [riskCodesLoaded, setRiskCodesLoaded] = useState(false)
    const [newCode, setNewCode] = useState('')
    const [addingCode, setAddingCode] = useState(false)

    useEffect(() => {
        if (!baId || !secId) return
        setLoading(true)
        getBASections(baId)
            .then((secs) => {
                const found = secs.find((s) => s.id === secId)
                if (found) {
                    setSection(found)
                    setCoverageForm(found)
                }
            })
            .catch(() => addNotification('Could not load section.', 'error'))
            .finally(() => setLoading(false))
    }, [baId, secId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeTab === 'participations' && !partLoaded && secId) {
            getParticipations(secId)
                .then((data) => { setParticipations(data); setPartLoaded(true) })
                .catch(() => addNotification('Could not load participations.', 'error'))
        }
        if (activeTab === 'risk-codes' && !riskCodesLoaded && secId) {
            getAuthorizedRiskCodes(secId)
                .then((data) => { setRiskCodes(data); setRiskCodesLoaded(true) })
                .catch(() => addNotification('Could not load risk codes.', 'error'))
        }
    }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleSaveCoverage() {
        if (!section) return
        setSaving(true)
        try {
            const updated = await updateBASection(secId, coverageForm)
            setSection(updated)
            addNotification('Section updated.', 'success')
        } catch {
            addNotification('Could not save section.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const partTotal = useMemo(
        () => participations.reduce((s, p) => s + (p.share_percent ?? 0), 0),
        [participations]
    )
    const partBalanced = Math.abs(partTotal - 100) <= 0.0001

    function updateParticipation(i: number, field: 'syndicate' | 'share_percent', value: string | number) {
        setParticipations((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
        )
    }

    function addParticipationRow() {
        setParticipations((prev) => [
            ...prev,
            { id: 0, section_id: secId, syndicate: '', share_percent: 0 },
        ])
    }

    function removeParticipationRow(i: number) {
        setParticipations((prev) => prev.filter((_, idx) => idx !== i))
    }

    async function handleSaveParticipations() {
        if (!partBalanced) {
            addNotification('Participation shares must total 100%.', 'error')
            return
        }
        setSavingPart(true)
        try {
            const saved = await saveParticipations(
                secId,
                participations.map(({ syndicate, share_percent }) => ({ syndicate, share_percent }))
            )
            setParticipations(saved)
            addNotification('Participations saved.', 'success')
        } catch {
            addNotification('Could not save participations.', 'error')
        } finally {
            setSavingPart(false)
        }
    }

    async function handleAddRiskCode() {
        if (!newCode.trim()) return
        setAddingCode(true)
        try {
            await addAuthorizedRiskCode(secId, newCode.trim())
            setRiskCodes((prev) => [...prev, newCode.trim()])
            setNewCode('')
            addNotification('Risk code added.', 'success')
        } catch {
            addNotification('Could not add risk code.', 'error')
        } finally {
            setAddingCode(false)
        }
    }

    async function handleRemoveRiskCode(code: string) {
        try {
            await removeAuthorizedRiskCode(secId, code)
            setRiskCodes((prev) => prev.filter((c) => c !== code))
            addNotification('Risk code removed.', 'success')
        } catch {
            addNotification('Could not remove risk code.', 'error')
        }
    }

    if (loading) return <LoadingSpinner />
    if (!section) return <p className="p-6 text-gray-500">Section not found.</p>

    const daysOnCover =
        section.inception_date && section.expiry_date
            ? Math.round(
                (new Date(section.expiry_date).getTime() -
                    new Date(section.inception_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
            : null

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">{section.reference}</h2>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === tab.key
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Coverage tab */}
            {activeTab === 'coverage' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Reference</label>
                        <p className="text-sm text-gray-900 bg-gray-100 border border-gray-200 rounded px-3 py-2">{section.reference}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-cob" className="text-sm font-medium text-gray-700">Class of Business</label>
                        <input id="sec-cob" type="text" value={coverageForm.class_of_business ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, class_of_business: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-time" className="text-sm font-medium text-gray-700">Time Basis</label>
                        <input id="sec-time" type="text" value={coverageForm.time_basis ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, time_basis: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sec-inc" className="text-sm font-medium text-gray-700">Inception Date</label>
                            <input id="sec-inc" type="date" value={coverageForm.inception_date ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, inception_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sec-exp" className="text-sm font-medium text-gray-700">Expiry Date</label>
                            <input id="sec-exp" type="date" value={coverageForm.expiry_date ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, expiry_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Days on Cover</label>
                        <p className="text-sm text-gray-900 bg-gray-100 border border-gray-200 rounded px-3 py-2">{daysOnCover ?? '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sec-line" className="text-sm font-medium text-gray-700">Line Size</label>
                            <input id="sec-line" type="number" value={coverageForm.line_size ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, line_size: parseFloat(e.target.value) || undefined }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="sec-wpl" className="text-sm font-medium text-gray-700">Written Premium Limit</label>
                            <input id="sec-wpl" type="number" value={coverageForm.written_premium_limit ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, written_premium_limit: parseFloat(e.target.value) || undefined }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-currency" className="text-sm font-medium text-gray-700">Currency</label>
                        <input id="sec-currency" type="text" value={coverageForm.currency ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, currency: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm w-28" />
                    </div>
                    <button type="button" onClick={handleSaveCoverage} disabled={saving} className="self-start px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}

            {/* Participations tab */}
            {activeTab === 'participations' && (
                <div className="flex flex-col gap-4">
                    {!partLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${partBalanced ? 'text-green-700' : 'text-red-600'}`}>
                                    Total: {partTotal.toFixed(4)}% {partBalanced ? '✓ Balanced' : '— must equal 100%'}
                                </p>
                                <button type="button" onClick={addParticipationRow} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800">
                                    <FiPlus size={13} /> Add Row
                                </button>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600">Syndicate</th>
                                            <th className="px-4 py-3 font-medium text-gray-600">Share %</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participations.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No participations.</td>
                                            </tr>
                                        ) : (
                                            participations.map((p, i) => (
                                                <tr key={i} className="border-t border-gray-100">
                                                    <td className="px-4 py-2">
                                                        <input type="text" value={p.syndicate ?? ''} onChange={(e) => updateParticipation(i, 'syndicate', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input type="number" min={0} max={100} step={0.01} value={p.share_percent} onChange={(e) => updateParticipation(i, 'share_percent', parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 text-sm w-24" />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <button type="button" onClick={() => removeParticipationRow(i)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={13} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" onClick={handleSaveParticipations} disabled={savingPart || !partBalanced} className="self-start px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                                {savingPart ? 'Saving…' : 'Save Participations'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Authorized Risk Codes tab */}
            {activeTab === 'risk-codes' && (
                <div className="flex flex-col gap-4">
                    {!riskCodesLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Risk code" className="border border-gray-300 rounded px-3 py-2 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleAddRiskCode() }} />
                                <button type="button" onClick={handleAddRiskCode} disabled={addingCode || !newCode.trim()} className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                                    <FiPlus size={13} /> Add
                                </button>
                            </div>
                            {riskCodes.length === 0 ? (
                                <p className="text-sm text-gray-400">No authorized risk codes.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {riskCodes.map((code) => (
                                        <span key={code} className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                                            {code}
                                            <button type="button" onClick={() => handleRemoveRiskCode(code)} className="text-gray-400 hover:text-red-500">
                                                <FiTrash2 size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* GPI Monitoring tab */}
            {activeTab === 'gpi' && (
                <p className="text-sm text-gray-400">GPI Monitoring — progress bars coming soon.</p>
            )}
        </div>
    )
}
