/**
 * BASectionViewPage — REQ-BA-FE-F-073 to F-087
 *
 * 5-tab view: Coverage | Participations | Authorized Risk Codes | GPI Monitoring | Rating Configuration
 * Participations: share % must total 100 ± 0.0001
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlus, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import {
    getBASections,
    getBindingAuthority,
    updateBASection,
    getParticipations,
    saveParticipations,
    getAuthorizedRiskCodes,
    addAuthorizedRiskCode,
    removeAuthorizedRiskCode,
    getClassesOfBusiness,
    getCurrencies,
    type BASection,
    type BindingAuthority,
    type Participation,
    type ClassOfBusiness,
} from '../binding-authorities.service'
import BASectionRatingConfiguration from './BASectionRatingConfiguration'

const TIME_BASIS_OPTIONS = ['Claims-Made', 'Occurrence', 'Manifest']

type Tab = 'coverage' | 'participations' | 'risk-codes' | 'gpi' | 'rating'

const TABS: { key: Tab; label: string }[] = [
    { key: 'coverage', label: 'Coverage' },
    { key: 'participations', label: 'Participations' },
    { key: 'risk-codes', label: 'Authorized Risk Codes' },
    { key: 'gpi', label: 'GPI Monitoring' },
    { key: 'rating', label: 'Rating Configuration' },
]

export default function BASectionViewPage() {
    const { id, sectionId } = useParams<{ id: string; sectionId: string }>()
    const { addNotification } = useNotifications()

    const baId = parseInt(id ?? '0', 10)
    const secId = parseInt(sectionId ?? '0', 10)

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [section, setSection] = useState<BASection | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('coverage')
    const [saving, setSaving] = useState(false)

    // Coverage rows — UI-only; persistent via future ba_section_coverages table
    type CoverageRow = { _id: number; coverage: string; limit_ccy: string; limit_amount: string; excess_ccy: string; excess_amount: string; si_ccy: string; si: string }
    const [coverageRows, setCoverageRows] = useState<CoverageRow[]>([])
    const nextCovRowId = useRef(1)

    // Coverage form
    const [coverageForm, setCoverageForm] = useState<Partial<BASection>>({})
    const [classesOfBusiness, setClassesOfBusiness] = useState<ClassOfBusiness[]>([])
    const [currencies, setCurrencies] = useState<string[]>([])

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
        Promise.all([
            getBASections(baId),
            getBindingAuthority(baId),
        ])
            .then(([secs, baData]) => {
                const found = secs.find((s) => s.id === secId)
                if (found) {
                    setSection(found)
                    setCoverageForm(found)
                }
                setBa(baData as BindingAuthority)
            })
            .catch(() => addNotification('Could not load section.', 'error'))
            .finally(() => setLoading(false))
    }, [baId, secId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        getClassesOfBusiness()
            .then((items) => setClassesOfBusiness(items ?? []))
            .catch(() => setClassesOfBusiness([]))
        getCurrencies()
            .then((items) => setCurrencies(items ?? []))
            .catch(() => setCurrencies([]))
    }, [])

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

    const handleSaveCoverage = useCallback(async () => {
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
    }, [section, secId, coverageForm, addNotification])

    const sidebarSection = useMemo((): SidebarSection => ({
        title: 'BA Section',
        items: [
            { label: 'Back to Binding Authority', icon: FiArrowLeft, to: `/binding-authorities/${id}` },
            { label: 'Save Section', icon: FiSave, event: 'section:save' },
        ],
    }), [id])
    useSidebarSection(sidebarSection)

    useEffect(() => {
        const onSave = () => { void handleSaveCoverage() }
        window.addEventListener('section:save', onSave)
        return () => window.removeEventListener('section:save', onSave)
    }, [handleSaveCoverage])

    function addCoverageRow() {
        const rowId = nextCovRowId.current++
        setCoverageRows(prev => [...prev, {
            _id: rowId,
            coverage: '',
            limit_ccy: section?.currency ?? 'GBP',
            limit_amount: '',
            excess_ccy: section?.currency ?? 'GBP',
            excess_amount: '',
            si_ccy: section?.currency ?? 'GBP',
            si: '',
        }])
    }

    function removeCoverageRow(_id: number) {
        setCoverageRows(prev => prev.filter(r => r._id !== _id))
    }

    function updateCoverageRow(_id: number, field: string, value: string) {
        setCoverageRows(prev => prev.map(r => r._id === _id ? { ...r, [field]: value } : r))
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
            {/* Page header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">
                    {ba?.reference ?? '—'} — {ba?.coverholder ?? '—'}
                </h2>
                <h3 className="text-sm font-medium text-gray-500 mt-0.5">{section.reference}</h3>
            </div>

            {/* Core section fields */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Section Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Reference</label>
                        <p className="text-sm text-gray-900 bg-gray-100 border border-gray-200 rounded px-3 py-2">{section.reference}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">CoB Code</label>
                        <p className="text-sm text-gray-900 bg-gray-100 border border-gray-200 rounded px-3 py-2">{coverageForm.class_of_business_code || '—'}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-cob" className="text-xs text-gray-400">Class of Business</label>
                        <input id="sec-cob" list="ba-section-class-of-business-options" type="text" value={coverageForm.class_of_business ?? ''} onChange={(e) => {
                            const name = e.target.value
                            const cob = classesOfBusiness.find(c => c.name.toLowerCase() === name.toLowerCase().trim())
                            setCoverageForm((p) => ({ ...p, class_of_business: name, class_of_business_code: cob?.code ?? p.class_of_business_code ?? '' }))
                        }} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-time" className="text-xs text-gray-400">Time Basis</label>
                        <input id="sec-time" list="ba-section-time-basis-options" type="text" value={coverageForm.time_basis ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, time_basis: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-inc" className="text-xs text-gray-400">Inception Date</label>
                        <input id="sec-inc" type="date" value={coverageForm.inception_date ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, inception_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-exp" className="text-xs text-gray-400">Expiry Date</label>
                        <input id="sec-exp" type="date" value={coverageForm.expiry_date ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, expiry_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Days on Cover</label>
                        <p className="text-sm text-gray-900 bg-gray-100 border border-gray-200 rounded px-3 py-2">{daysOnCover ?? '—'}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-currency" className="text-xs text-gray-400">Currency</label>
                        <input id="sec-currency" list="ba-section-currency-options" type="text" value={coverageForm.currency ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, currency: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm w-28" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-line" className="text-xs text-gray-400">Line Size</label>
                        <input id="sec-line" type="number" value={coverageForm.line_size ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, line_size: parseFloat(e.target.value) || undefined }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="sec-wpl" className="text-xs text-gray-400">Written Premium Limit</label>
                        <input id="sec-wpl" type="number" value={coverageForm.written_premium_limit ?? ''} onChange={(e) => setCoverageForm((p) => ({ ...p, written_premium_limit: parseFloat(e.target.value) || undefined }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                </div>
            </div>

            {/* Tabs nav */}
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

            {/* Coverage tab — coverage lines table */}
            {activeTab === 'coverage' && (
                <div className="table-wrapper">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Coverage</th>
                                <th>Limit CCY</th>
                                <th>Limit Amount</th>
                                <th>Excess CCY</th>
                                <th>Excess Amount</th>
                                <th>Sum Insured CCY</th>
                                <th>Sum Insured</th>
                                <th>
                                    <button
                                        type="button"
                                        title="Add Coverage"
                                        aria-label="Add Coverage"
                                        className="text-brand-600 hover:text-brand-800"
                                        onClick={addCoverageRow}
                                    >
                                        <FiPlus size={14} />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {coverageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-400">
                                        No coverage lines added yet.
                                    </td>
                                </tr>
                            ) : (
                                coverageRows.map((row) => (
                                    <tr key={row._id}>
                                        <td><input type="text" value={row.coverage} onChange={(e) => updateCoverageRow(row._id, 'coverage', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full min-w-[160px]" /></td>
                                        <td><input type="text" value={row.limit_ccy} onChange={(e) => updateCoverageRow(row._id, 'limit_ccy', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-20" /></td>
                                        <td><input type="number" value={row.limit_amount} onChange={(e) => updateCoverageRow(row._id, 'limit_amount', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-28" /></td>
                                        <td><input type="text" value={row.excess_ccy} onChange={(e) => updateCoverageRow(row._id, 'excess_ccy', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-20" /></td>
                                        <td><input type="number" value={row.excess_amount} onChange={(e) => updateCoverageRow(row._id, 'excess_amount', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-28" /></td>
                                        <td><input type="text" value={row.si_ccy} onChange={(e) => updateCoverageRow(row._id, 'si_ccy', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-20" /></td>
                                        <td><input type="number" value={row.si} onChange={(e) => updateCoverageRow(row._id, 'si', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-28" /></td>
                                        <td><button type="button" onClick={() => removeCoverageRow(row._id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={13} /></button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                            <div className="table-wrapper">
                                <table className="app-table">
                                    <thead>
                                        <tr>
                                            <th>Syndicate</th>
                                            <th>Share %</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participations.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center text-gray-400">No participations.</td>
                                            </tr>
                                        ) : (
                                            participations.map((p, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <input type="text" value={p.syndicate ?? ''} onChange={(e) => updateParticipation(i, 'syndicate', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                                                    </td>
                                                    <td>
                                                        <input type="number" min={0} max={100} step={0.01} value={p.share_percent} onChange={(e) => updateParticipation(i, 'share_percent', parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 text-sm w-24" />
                                                    </td>
                                                    <td>
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
                <div className="flex flex-col gap-4">
                    {!section.written_premium_limit ? (
                        <p className="text-sm text-gray-400">
                            No GPI limit configured for this section. Set a Written Premium Limit in Section Details to enable GPI monitoring.
                        </p>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                            <h3 className="text-sm font-semibold text-gray-700">GPI Limit Monitoring</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400">GPI Limit ({section.currency ?? 'GBP'})</p>
                                    <p className="text-lg font-semibold text-gray-900 mt-0.5">
                                        {section.written_premium_limit.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Actual Gross Premium</p>
                                    <p className="text-lg font-semibold text-gray-900 mt-0.5">—</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Populated from bordereau data</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Usage</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }} />
                                        </div>
                                        <span className="text-sm text-gray-500">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Rating Configuration tab */}
            {activeTab === 'rating' && (
                <BASectionRatingConfiguration baId={baId} />
            )}

            <datalist id="ba-section-class-of-business-options">
                {classesOfBusiness.map((item) => (
                    <option key={item.code} value={item.name} />
                ))}
            </datalist>
            <datalist id="ba-section-time-basis-options">
                {TIME_BASIS_OPTIONS.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
            <datalist id="ba-section-currency-options">
                {currencies.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
        </div>
    )
}
