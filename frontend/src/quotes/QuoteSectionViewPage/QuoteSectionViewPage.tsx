/**
 * QuoteSectionViewPage — Block 4
 *
 * Requirements: quotes.requirements.md §4.7 (REQ-QUO-FE-F-051 – F-060)
 * Tests: frontend/src/quotes/quotes.test.tsx (T-quotes-section-R01 – R10)
 *
 * Route: /quotes/:id/sections/:sectionId
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiSave } from 'react-icons/fi'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'

import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'

import {
    getQuote,
    listSections,
    updateSection,
    listCoverages,
    listParticipations,
    saveParticipations,
    getRiskCodes,
    type Quote,
    type QuoteSection,
    type Coverage,
    type Participation,
} from '@/quotes/quotes.service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionTabKey = 'coverages' | 'deductions' | 'riskCodes' | 'participations'

interface TaxOverrideRow {
    country: string
    deductionType: string
    basis: string
    rate: string
}

interface RiskSplitRow {
    riskCode: string
    allocation: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
    { key: 'coverages', label: 'Coverages' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'riskCodes', label: 'Risk Codes' },
    { key: 'participations', label: 'Participations' },
]

// ---------------------------------------------------------------------------
// DeductionsTable — inline-editable table with resizable columns
// ---------------------------------------------------------------------------

function DeductionsTable({
    editable,
    rows,
    grossPremium,
    onChange,
}: {
    editable: boolean
    rows: TaxOverrideRow[]
    grossPremium: number
    onChange: React.Dispatch<React.SetStateAction<TaxOverrideRow[]>>
}) {
    const colKeys = editable
        ? ['country', 'deductionType', 'basis', 'rate', 'computed', 'actions']
        : ['country', 'deductionType', 'basis', 'rate', 'computed']
    const { startResize, getWidth } = useResizableColumns({
        defaultWidths: { country: 160, deductionType: 160, basis: 140, rate: 110, computed: 150, actions: 80 },
        storageKey: 'table-widths-section-deductions',
    })
    const totalComputed = rows.reduce((acc, r) => acc + (grossPremium * Number(r.rate)) / 100, 0)
    return (
        <div>
            <div className="table-wrapper">
                <table className="app-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                        {colKeys.map((k) => (
                            <col key={k} style={{ width: getWidth(k) }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {colKeys.map((k) => (
                                <th key={k} style={{ position: 'relative' }}>
                                    {k === 'country' && 'Country'}
                                    {k === 'deductionType' && 'Deduction Type'}
                                    {k === 'basis' && 'Basis'}
                                    {k === 'rate' && 'Rate %'}
                                    {k === 'computed' && 'Computed Amount'}
                                    {k === 'actions' && editable && (
                                        <button
                                            type="button"
                                            title="Add Deduction"
                                            className="text-brand-600 hover:text-brand-800"
                                            onClick={() =>
                                                onChange((rs) => [...rs, { country: '', deductionType: 'Tax', basis: 'Gross', rate: '0' }])
                                            }
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    )}
                                    <span
                                        className="col-resizer"
                                        style={{
                                            position: 'absolute', right: 0, top: 0, bottom: 0,
                                            width: 6, cursor: 'col-resize', userSelect: 'none',
                                        }}
                                        onMouseDown={(e) => startResize(k, e)}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={colKeys.length} className="text-center text-gray-500 py-4">
                                    No deductions.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rows.map((row, idx) => {
                                    const computed = (grossPremium * Number(row.rate)) / 100
                                    return (
                                        <tr key={idx}>
                                            <td>
                                                {editable ? (
                                                    <input
                                                        type="text"
                                                        className="input-field-sm"
                                                        value={row.country}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, country: e.target.value } : r))
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    row.country
                                                )}
                                            </td>
                                            <td>
                                                {editable ? (
                                                    <select
                                                        className="input-field-sm"
                                                        value={row.deductionType}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, deductionType: e.target.value } : r))
                                                            )
                                                        }
                                                    >
                                                        <option>Tax</option>
                                                        <option>Fee</option>
                                                    </select>
                                                ) : (
                                                    row.deductionType
                                                )}
                                            </td>
                                            <td>
                                                {editable ? (
                                                    <input
                                                        type="text"
                                                        className="input-field-sm"
                                                        value={row.basis}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, basis: e.target.value } : r))
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    row.basis
                                                )}
                                            </td>
                                            <td className="text-right">
                                                {editable ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        className="input-field-sm text-right"
                                                        value={row.rate}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, rate: e.target.value } : r))
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    `${row.rate}%`
                                                )}
                                            </td>
                                            <td className="text-right">{computed.toFixed(2)}</td>
                                            {editable && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="text-red-500 text-xs"
                                                        onClick={() => onChange((rs) => rs.filter((_, i) => i !== idx))}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                                <tr className="font-semibold">
                                    <td colSpan={editable ? 5 : 4} className="text-right">
                                        Total
                                    </td>
                                    <td className="text-right">{totalComputed.toFixed(2)}</td>
                                    {editable && <td />}
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// RiskCodesTable — inline-editable table with resizable columns
// ---------------------------------------------------------------------------

function RiskCodesTable({
    editable,
    rows,
    riskCodeOptions,
    onChange,
}: {
    editable: boolean
    rows: RiskSplitRow[]
    riskCodeOptions: string[]
    onChange: React.Dispatch<React.SetStateAction<RiskSplitRow[]>>
}) {
    const colKeys = editable ? ['riskCode', 'allocation', 'actions'] : ['riskCode', 'allocation']
    const { startResize, getWidth } = useResizableColumns({
        defaultWidths: { riskCode: 240, allocation: 160, actions: 80 },
        storageKey: 'table-widths-section-risk-codes',
    })
    const totalAllocation = rows.reduce((acc, r) => acc + Number(r.allocation), 0)
    return (
        <div>
            <div className="table-wrapper">
                <table className="app-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                        {colKeys.map((k) => (
                            <col key={k} style={{ width: getWidth(k) }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {colKeys.map((k) => (
                                <th key={k} style={{ position: 'relative' }}>
                                    {k === 'riskCode' && 'Risk Code'}
                                    {k === 'allocation' && 'Allocation %'}
                                    {k === 'actions' && editable && (
                                        <button
                                            type="button"
                                            title="Add Risk Code"
                                            className="text-brand-600 hover:text-brand-800"
                                            onClick={() => onChange((rs) => [...rs, { riskCode: '', allocation: '0' }])}
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    )}
                                    <span
                                        className="col-resizer"
                                        style={{
                                            position: 'absolute', right: 0, top: 0, bottom: 0,
                                            width: 6, cursor: 'col-resize', userSelect: 'none',
                                        }}
                                        onMouseDown={(e) => startResize(k, e)}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={colKeys.length} className="text-center text-gray-500 py-4">
                                    No risk codes.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rows.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            {editable ? (
                                                riskCodeOptions.length > 0 ? (
                                                    <select
                                                        className="input-field-sm"
                                                        value={row.riskCode}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, riskCode: e.target.value } : r))
                                                            )
                                                        }
                                                    >
                                                        <option value="">— Select —</option>
                                                        {riskCodeOptions.map((code) => (
                                                            <option key={code} value={code}>{code}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="input-field-sm"
                                                        value={row.riskCode}
                                                        onChange={(e) =>
                                                            onChange((rs) =>
                                                                rs.map((r, i) => (i === idx ? { ...r, riskCode: e.target.value } : r))
                                                            )
                                                        }
                                                    />
                                                )
                                            ) : (
                                                row.riskCode
                                            )}
                                        </td>
                                        <td className="text-right">
                                            {editable ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="input-field-sm text-right"
                                                    value={row.allocation}
                                                    onChange={(e) =>
                                                        onChange((rs) =>
                                                            rs.map((r, i) => (i === idx ? { ...r, allocation: e.target.value } : r))
                                                        )
                                                    }
                                                />
                                            ) : (
                                                `${row.allocation}%`
                                            )}
                                        </td>
                                        {editable && (
                                            <td>
                                                <button
                                                    type="button"
                                                    className="text-red-500 text-xs"
                                                    onClick={() => onChange((rs) => rs.filter((_, i) => i !== idx))}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="text-right">Total</td>
                                    <td className="text-right">{totalAllocation.toFixed(2)}%</td>
                                    {editable && <td />}
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function QuoteSectionViewPage() {
    const { id, sectionId } = useParams<{ id: string; sectionId: string }>()
    const { addNotification } = useNotifications()

    // Data
    const [quote, setQuote] = useState<Quote | null>(null)
    const [section, setSection] = useState<QuoteSection | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [loading, setLoading] = useState(true)

    // Tabs
    const [activeTab, setActiveTab] = useState<SectionTabKey>('coverages')

    // Coverages tab state
    const [coverages, setCoverages] = useState<Coverage[]>([])
    const [coveragesLoading, setCoveragesLoading] = useState(true)

    // Deductions tab state — sourced from section.payload.taxOverrides
    const [deductionRows, setDeductionRows] = useState<TaxOverrideRow[]>([])

    // Risk Codes tab state — sourced from section.payload.riskSplits
    const [riskSplitRows, setRiskSplitRows] = useState<RiskSplitRow[]>([])
    const [riskCodeOptions, setRiskCodeOptions] = useState<string[]>([])

    // Participations tab state
    const [participations, setParticipations] = useState<Participation[]>([])
    const [participationsLoaded, setParticipationsLoaded] = useState(false)
    const [participationError, setParticipationError] = useState<string | null>(null)

    // Action state
    const [actionError, setActionError] = useState<string | null>(null)

    // Sort state for tables
    const [coverageSort, setCoverageSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [participationSort, setParticipationSort] = useState<SortConfig>({ key: 'market_name', direction: 'asc' })

    const editable = quote?.status === 'Draft'

    // ---------------------------------------------------------------------------
    // Load quote + section on mount (F-051)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!id || !sectionId) return
        const quoteId = Number(id)
        const secId = Number(sectionId)

        setLoading(true)
        Promise.all([getQuote(quoteId), listSections(quoteId)])
            .then(([q, sections]) => {
                setQuote(q)
                const matched = sections.find((s) => s.id === secId)
                if (!matched) {
                    setNotFound(true)
                } else {
                    setSection(matched)
                    const pl = (matched.payload ?? {}) as Record<string, unknown>
                    if (Array.isArray(pl.taxOverrides)) {
                        setDeductionRows(pl.taxOverrides as TaxOverrideRow[])
                    }
                    if (Array.isArray(pl.riskSplits)) {
                        setRiskSplitRows(pl.riskSplits as RiskSplitRow[])
                    }
                }
            })
            .catch(() => {
                setNotFound(true)
            })
            .finally(() => setLoading(false))
    }, [id, sectionId])

    // ---------------------------------------------------------------------------
    // Load coverages immediately (F-055)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!id || !sectionId) return
        const quoteId = Number(id)
        const secId = Number(sectionId)
        setCoveragesLoading(true)
        listCoverages(quoteId, secId)
            .then(setCoverages)
            .catch(() => setCoverages([]))
            .finally(() => setCoveragesLoading(false))
    }, [id, sectionId])

    // ---------------------------------------------------------------------------
    // Load risk code lookup on mount (F-057)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        getRiskCodes()
            .then(setRiskCodeOptions)
            .catch(() => setRiskCodeOptions([]))
    }, [])

    // ---------------------------------------------------------------------------
    // Load participations on first tab activation (F-058)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (activeTab !== 'participations' || participationsLoaded || !sectionId) return
        const secId = Number(sectionId)
        listParticipations(secId)
            .then((rows) => {
                setParticipations(rows)
                setParticipationsLoaded(true)
            })
            .catch(() => {
                setParticipations([])
                setParticipationsLoaded(true)
            })
    }, [activeTab, participationsLoaded, sectionId])

    // ---------------------------------------------------------------------------
    // Sidebar (F-053, F-059)
    // ---------------------------------------------------------------------------

    const handleSave = useCallback(async () => {
        if (!quote || !section || !editable) return
        setActionError(null)
        try {
            const saved = await updateSection(Number(id), section.id, {
                class_of_business: section.class_of_business ?? undefined,
                inception_date: section.inception_date ?? undefined,
                expiry_date: section.expiry_date ?? undefined,
                inception_time: section.inception_time ?? undefined,
                expiry_time: section.expiry_time ?? undefined,
                limit_currency: section.limit_currency ?? undefined,
                limit_amount: section.limit_amount,
                limit_loss_qualifier: section.limit_loss_qualifier ?? undefined,
                excess_currency: section.excess_currency ?? undefined,
                excess_amount: section.excess_amount,
                excess_loss_qualifier: section.excess_loss_qualifier ?? undefined,
                sum_insured_currency: section.sum_insured_currency ?? undefined,
                sum_insured_amount: section.sum_insured_amount,
                premium_currency: section.premium_currency ?? undefined,
                gross_premium: section.gross_premium,
                annual_net_premium: section.annual_net_premium,
                written_order: section.written_order,
                signed_order: section.signed_order,
                payload: {
                    ...(section.payload as Record<string, unknown>),
                    taxOverrides: deductionRows,
                    riskSplits: riskSplitRows,
                },
            })
            setSection(saved)
            addNotification('Section saved.', 'success')
        } catch {
            setActionError('Failed to save section.')
            addNotification('Failed to save section.', 'error')
        }
    }, [quote, section, editable, id, deductionRows, riskSplitRows, addNotification])

    const sidebarSection = useMemo((): SidebarSection => {
        const items: SidebarSection['items'] = []
        if (editable) {
            items.push({ label: 'Save', icon: FiSave, event: 'section:save' })
        }
        items.push({ label: 'Back to Quote', icon: FiArrowLeft, to: `/quotes/${id}` })
        return { title: 'Quote Section', items }
    }, [editable, id])

    useSidebarSection(sidebarSection)

    // ---------------------------------------------------------------------------
    // DOM event listener for sidebar Save event
    // ---------------------------------------------------------------------------

    useEffect(() => {
        const handler = () => void handleSave()
        window.addEventListener('section:save', handler)
        return () => window.removeEventListener('section:save', handler)
    }, [handleSave])

    // ---------------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse h-6 bg-gray-200 rounded w-48" />
            </div>
        )
    }

    if (notFound || !section) {
        return (
            <div className="p-6 flex flex-col gap-4">
                <p className="text-gray-600">Section not found.</p>
                <Link to={`/quotes/${id}`} className="text-brand-600 hover:underline text-sm">
                    Back to Quote
                </Link>
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* ------------------------------------------------------------------ */}
            {/* Section details header (F-052) */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Section Details</h2>

                {actionError && (
                    <p className="text-sm text-red-600">{actionError}</p>
                )}

                {/* Two-column field group */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Left column — dates & reference */}
                    <div className="flex flex-col gap-3">
                        {/* Reference — always read-only (F-052) */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Reference
                            </label>
                            <p className="text-sm text-gray-900">{section.reference}</p>
                        </div>

                        {/* Class of Business */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Class of Business
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.class_of_business ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, class_of_business: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.class_of_business ?? '—'}</p>
                            )}
                        </div>

                        {/* Inception Date */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Inception Date
                            </label>
                            {editable ? (
                                <input
                                    type="date"
                                    className="input-field"
                                    value={section.inception_date ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, inception_date: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.inception_date ?? '—'}</p>
                            )}
                        </div>

                        {/* Expiry Date */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Expiry Date
                            </label>
                            {editable ? (
                                <input
                                    type="date"
                                    className="input-field"
                                    value={section.expiry_date ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, expiry_date: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.expiry_date ?? '—'}</p>
                            )}
                        </div>

                        {/* Inception Time (F-052) */}
                        <div>
                            <label htmlFor="section-inception-time" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Inception Time
                            </label>
                            {editable ? (
                                <input
                                    id="section-inception-time"
                                    aria-label="Inception Time"
                                    type="time"
                                    step="1"
                                    className="input-field"
                                    value={section.inception_time ?? '00:00:00'}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, inception_time: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.inception_time ?? '—'}</p>
                            )}
                        </div>

                        {/* Expiry Time (F-052) */}
                        <div>
                            <label htmlFor="section-expiry-time" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Expiry Time
                            </label>
                            {editable ? (
                                <input
                                    id="section-expiry-time"
                                    aria-label="Expiry Time"
                                    type="time"
                                    step="1"
                                    className="input-field"
                                    value={section.expiry_time ?? '23:59:59'}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, expiry_time: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.expiry_time ?? '—'}</p>
                            )}
                        </div>

                        {/* Days on Cover (F-052) — read-only computed */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Days on Cover
                            </label>
                            <p className="text-sm text-gray-900">
                                {section.inception_date && section.expiry_date
                                    ? Math.max(0, Math.ceil((new Date(section.expiry_date).getTime() - new Date(section.inception_date).getTime()) / 86400000))
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Right column — limits, premium, order */}
                    <div className="flex flex-col gap-3">
                        {/* Limit */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Limit Currency
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.limit_currency ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, limit_currency: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.limit_currency ?? '—'}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Limit Amount
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    className="input-field"
                                    value={section.limit_amount ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, limit_amount: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.limit_amount != null ? Number(section.limit_amount).toLocaleString() : '—'}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Limit Loss Qualifier
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.limit_loss_qualifier ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, limit_loss_qualifier: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.limit_loss_qualifier ?? '—'}</p>
                            )}
                        </div>

                        {/* Premium Currency */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Premium Currency
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.premium_currency ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, premium_currency: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.premium_currency ?? '—'}</p>
                            )}
                        </div>

                        {/* Gross Premium */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Gross Premium
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input-field"
                                    value={section.gross_premium ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, gross_premium: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.gross_premium != null ? Number(section.gross_premium).toLocaleString() : '—'}
                                </p>
                            )}
                        </div>

                        {/* Annual Net Premium (F-052) */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Annual Net Premium
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input-field"
                                    value={section.annual_net_premium ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, annual_net_premium: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.annual_net_premium != null ? Number(section.annual_net_premium).toLocaleString() : '—'}
                                </p>
                            )}
                        </div>

                        {/* Written / Signed Order */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Written Order %
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="input-field"
                                    value={section.written_order ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, written_order: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.written_order != null ? `${section.written_order}%` : '—'}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Signed Order %
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="input-field"
                                    value={section.signed_order ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, signed_order: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.signed_order != null ? `${section.signed_order}%` : '—'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Excess & Sum Insured — full-width group */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    {/* Excess */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Excess</h3>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Excess Currency
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.excess_currency ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, excess_currency: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.excess_currency ?? '—'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Excess Amount
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    className="input-field"
                                    value={section.excess_amount ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, excess_amount: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.excess_amount != null ? Number(section.excess_amount).toLocaleString() : '—'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Excess Loss Qualifier
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.excess_loss_qualifier ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, excess_loss_qualifier: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.excess_loss_qualifier ?? '—'}</p>
                            )}
                        </div>
                    </div>

                    {/* Sum Insured */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sum Insured</h3>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Sum Insured Currency
                            </label>
                            {editable ? (
                                <input
                                    type="text"
                                    className="input-field"
                                    value={section.sum_insured_currency ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, sum_insured_currency: e.target.value } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900">{section.sum_insured_currency ?? '—'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Sum Insured Amount
                            </label>
                            {editable ? (
                                <input
                                    type="number"
                                    className="input-field"
                                    value={section.sum_insured_amount ?? ''}
                                    onChange={(e) =>
                                        setSection((s) => s ? { ...s, sum_insured_amount: Number(e.target.value) } : s)
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-900 text-right">
                                    {section.sum_insured_amount != null ? Number(section.sum_insured_amount).toLocaleString() : '—'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Tabs (F-054) */}
            {/* ------------------------------------------------------------------ */}
            <TabsNav
                tabs={TABS}
                activeTab={activeTab}
                onChange={(key) => setActiveTab(key as SectionTabKey)}
            />

            {/* ------------------------------------------------------------------ */}
            {/* Coverages tab (F-055) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'coverages' && (
                <div>
                    {coveragesLoading ? (
                        <div className="animate-pulse h-4 bg-gray-200 rounded w-32" />
                    ) : (
                        <ResizableGrid
                            storageKey="table-widths-section-coverages"
                            columns={[
                                { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 120 },
                                { key: 'coverage', label: 'Coverage', sortable: true, defaultWidth: 200 },
                                { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
                                { key: 'expiry_date', label: 'Expiry Date', defaultWidth: 130 },
                                { key: 'annual_gross_premium', label: 'Annual Gross Premium', defaultWidth: 170 },
                                { key: 'annual_net_premium', label: 'Annual Net Premium', defaultWidth: 170 },
                                { key: 'limit_currency', label: 'Limit Currency', defaultWidth: 130 },
                                { key: 'limit_amount', label: 'Limit Amount', defaultWidth: 140 },
                                ...(editable ? [{
                                    key: 'actions',
                                    label: (
                                        <button
                                            type="button"
                                            title="Add Coverage"
                                            className="text-brand-600 hover:text-brand-800"
                                            onClick={() => {
                                                setCoverages((cs) => [
                                                    ...cs,
                                                    {
                                                        id: Date.now(),
                                                        section_id: Number(sectionId),
                                                        reference: '',
                                                        coverage: '',
                                                        effective_date: null,
                                                        expiry_date: null,
                                                        annual_gross_premium: null,
                                                        annual_net_premium: null,
                                                        limit_currency: null,
                                                        limit_amount: null,
                                                    },
                                                ])
                                            }}
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    ),
                                    defaultWidth: 60,
                                }] : []),
                            ]}
                            rows={[...coverages].sort((a, b) => {
                                const dir = coverageSort.direction === 'asc' ? 1 : -1
                                const k = coverageSort.key as keyof Coverage
                                const av = ((a[k] ?? '') as string | number).toString()
                                const bv = ((b[k] ?? '') as string | number).toString()
                                return av < bv ? -dir : av > bv ? dir : 0
                            })}
                            sortConfig={coverageSort}
                            onRequestSort={(key) =>
                                setCoverageSort((prev) => ({
                                    key,
                                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                                }))
                            }
                            rowKey={(row) => (row as Coverage).id}
                            emptyMessage="No coverages found."
                            renderCell={(key, row) => {
                                const cov = row as Coverage
                                if (key === 'reference') return cov.reference || '—'
                                if (key === 'coverage') return cov.coverage ?? '—'
                                if (key === 'effective_date') return cov.effective_date ?? '—'
                                if (key === 'expiry_date') return cov.expiry_date ?? '—'
                                if (key === 'annual_gross_premium') return cov.annual_gross_premium?.toLocaleString() ?? '—'
                                if (key === 'annual_net_premium') return cov.annual_net_premium?.toLocaleString() ?? '—'
                                if (key === 'limit_currency') return cov.limit_currency ?? '—'
                                if (key === 'limit_amount') return cov.limit_amount?.toLocaleString() ?? '—'
                                if (key === 'actions') {
                                    return (
                                        <button
                                            type="button"
                                            className="text-red-500 text-xs"
                                            onClick={() =>
                                                setCoverages((cs) => cs.filter((c) => c.id !== cov.id))
                                            }
                                        >
                                            Delete
                                        </button>
                                    )
                                }
                                return null
                            }}
                        />
                    )}
                </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Deductions tab (F-056) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'deductions' && (
                <DeductionsTable
                    editable={editable}
                    rows={deductionRows}
                    grossPremium={Number(section.gross_premium ?? 0)}
                    onChange={setDeductionRows}
                />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Risk Codes tab (F-057) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'riskCodes' && (
                <RiskCodesTable
                    editable={editable}
                    rows={riskSplitRows}
                    riskCodeOptions={riskCodeOptions}
                    onChange={setRiskSplitRows}
                />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Participations tab (F-058) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'participations' && (
                <div>
                    {participationError && (
                        <p className="text-sm text-red-600 mb-2">{participationError}</p>
                    )}
                    <ResizableGrid
                        storageKey="table-widths-section-participations"
                        columns={[
                            { key: 'market_name', label: 'Market Name', sortable: true, defaultWidth: 200 },
                            { key: 'written_line', label: 'Written Line %', sortable: true, defaultWidth: 140 },
                            { key: 'signed_line', label: 'Signed Line %', defaultWidth: 140 },
                            { key: 'role', label: 'Role', defaultWidth: 120 },
                            { key: 'reference', label: 'Reference', defaultWidth: 130 },
                            { key: 'notes', label: 'Notes', defaultWidth: 200 },
                            ...(editable ? [{ key: 'actions', label: '', defaultWidth: 80 }] : []),
                        ]}
                        rows={!participationsLoaded ? [] : [...participations].sort((a, b) => {
                            const dir = participationSort.direction === 'asc' ? 1 : -1
                            const k = participationSort.key as keyof Participation
                            const av = ((a[k] ?? '') as string | number).toString()
                            const bv = ((b[k] ?? '') as string | number).toString()
                            return av < bv ? -dir : av > bv ? dir : 0
                        })}
                        sortConfig={participationSort}
                        onRequestSort={(key) =>
                            setParticipationSort((prev) => ({
                                key,
                                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                            }))
                        }
                        rowKey={(row, idx) => (row as Participation).id ?? idx}
                        emptyMessage={!participationsLoaded ? 'Loading…' : 'No participations found.'}
                        renderCell={(key, row, idx) => {
                            const p = row as Participation
                            if (key === 'market_name') {
                                return editable ? (
                                    <input
                                        type="text"
                                        className="input-field-sm"
                                        value={p.market_name ?? ''}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, market_name: e.target.value } : r))
                                            )
                                        }
                                    />
                                ) : (p.market_name ?? '—')
                            }
                            if (key === 'written_line') {
                                return editable ? (
                                    <input
                                        type="number"
                                        step="0.000001"
                                        min="0"
                                        max="100"
                                        className="input-field-sm text-right"
                                        value={p.written_line ?? 0}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, written_line: Number(e.target.value) } : r))
                                            )
                                        }
                                    />
                                ) : (p.written_line ?? '—')
                            }
                            if (key === 'signed_line') {
                                return editable ? (
                                    <input
                                        type="number"
                                        step="0.000001"
                                        min="0"
                                        max="100"
                                        className="input-field-sm text-right"
                                        value={p.signed_line ?? 0}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, signed_line: Number(e.target.value) } : r))
                                            )
                                        }
                                    />
                                ) : (p.signed_line ?? '—')
                            }
                            if (key === 'role') {
                                return editable ? (
                                    <input
                                        type="text"
                                        className="input-field-sm"
                                        value={p.role ?? ''}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, role: e.target.value } : r))
                                            )
                                        }
                                    />
                                ) : (p.role ?? '—')
                            }
                            if (key === 'reference') {
                                return editable ? (
                                    <input
                                        type="text"
                                        className="input-field-sm"
                                        value={p.reference ?? ''}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, reference: e.target.value } : r))
                                            )
                                        }
                                    />
                                ) : (p.reference ?? '—')
                            }
                            if (key === 'notes') {
                                return editable ? (
                                    <input
                                        type="text"
                                        className="input-field-sm"
                                        value={p.notes ?? ''}
                                        onChange={(e) =>
                                            setParticipations((ps) =>
                                                ps.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r))
                                            )
                                        }
                                    />
                                ) : (p.notes ?? '—')
                            }
                            if (key === 'actions') {
                                return (
                                    <button
                                        type="button"
                                        className="text-red-500 text-xs"
                                        onClick={() =>
                                            setParticipations((ps) => ps.filter((_, i) => i !== idx))
                                        }
                                    >
                                        Delete
                                    </button>
                                )
                            }
                            return null
                        }}
                    />
                    {editable && (
                        <div className="flex items-center gap-4 mt-3">
                            <button
                                type="button"
                                className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                                onClick={() =>
                                    setParticipations((ps) => [
                                        ...ps,
                                        { section_id: Number(sectionId), market_name: '', written_line: 0, signed_line: 0, role: 'Follow', reference: null, notes: null },
                                    ])
                                }
                            >
                                + Add Participation
                            </button>
                            <button
                                type="button"
                                className="px-4 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
                                onClick={async () => {
                                    setParticipationError(null)
                                    const totalWritten = participations.reduce((s, p) => s + (Number(p.written_line) || 0), 0)
                                    const totalSigned = participations.reduce((s, p) => s + (Number(p.signed_line) || 0), 0)
                                    if (Math.abs(totalWritten - 100) > 0.0001) {
                                        setParticipationError(`Written Line % must total 100%. Current total: ${totalWritten.toFixed(4)}%`)
                                        return
                                    }
                                    if (Math.abs(totalSigned - 100) > 0.0001) {
                                        setParticipationError(`Signed Line % must total 100%. Current total: ${totalSigned.toFixed(4)}%`)
                                        return
                                    }
                                    try {
                                        const saved = await saveParticipations(
                                            Number(sectionId),
                                            participations.map(({ market_name, written_line, signed_line, role, reference, notes }) => ({
                                                market_name, written_line, signed_line, role, reference, notes,
                                            }))
                                        )
                                        setParticipations(saved)
                                        addNotification('Participations saved.', 'success')
                                    } catch {
                                        setParticipationError('Failed to save participations.')
                                        addNotification('Failed to save participations.', 'error')
                                    }
                                }}
                            >
                                Save Participations
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
