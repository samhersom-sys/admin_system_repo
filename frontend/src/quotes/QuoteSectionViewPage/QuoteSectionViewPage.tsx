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
import SearchableSelect from '@/shared/components/SearchableSelect/SearchableSelect'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

import {
    getQuote,
    listSections,
    updateSection,
    listCoverages,
    listParticipations,
    saveParticipations,
    isQuoteEditable,
    getCurrencies,
    getClassesOfBusiness,
    getLossQualifiers,
    getRiskCodes,
    type Quote,
    type QuoteSection,
    type Coverage,
    type Participation,
} from '@/quotes/quotes.service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionTabKey = 'coverages' | 'deductions' | 'riskCodes' | 'participations' | 'sectionFinancialSummary' | 'signings'

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

function computeDaysOnCover(inceptionDate: string | null | undefined, expiryDate: string | null | undefined): number | null {
    if (!inceptionDate || !expiryDate) return null
    const msPerDay = 86_400_000
    const diff = Math.floor((new Date(expiryDate).getTime() - new Date(inceptionDate).getTime()) / msPerDay)
    return diff >= 0 ? diff : null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
    { key: 'coverages', label: 'Coverages' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'riskCodes', label: 'Risk Codes' },
    { key: 'participations', label: 'Participations' },
    { key: 'sectionFinancialSummary', label: 'Section Financial Summary' },
    { key: 'signings', label: 'Signings' },
]

const CONTROL_CLASS = 'block w-full border border-gray-300 rounded bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
const CONTROL_SMALL_CLASS = 'block w-full border border-gray-300 rounded bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed'

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
                                                        className={CONTROL_SMALL_CLASS}
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
                                                        className={CONTROL_SMALL_CLASS}
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
                                                        className={CONTROL_SMALL_CLASS}
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
                                                        className={`${CONTROL_SMALL_CLASS} text-right`}
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
                                                        className={CONTROL_SMALL_CLASS}
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
                                                        className={CONTROL_SMALL_CLASS}
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
                                                    className={`${CONTROL_SMALL_CLASS} text-right`}
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
    const [classesOfBusiness, setClassesOfBusiness] = useState<string[]>([])
    const [currencyOptions, setCurrencyOptions] = useState<string[]>([])
    const [lossQualifierOptions, setLossQualifierOptions] = useState<string[]>([])

    // Participations tab state
    const [participations, setParticipations] = useState<Participation[]>([])
    const [participationsLoaded, setParticipationsLoaded] = useState(false)
    const [participationError, setParticipationError] = useState<string | null>(null)

    // Action state
    const [actionError, setActionError] = useState<string | null>(null)

    // Sort state for tables
    const [coverageSort, setCoverageSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [participationSort, setParticipationSort] = useState<SortConfig>({ key: 'market_name', direction: 'asc' })

    const editable = quote ? isQuoteEditable(quote.status) : false

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
                    setSection({
                        ...matched,
                        inception_date: matched.inception_date ?? q.inception_date ?? null,
                        effective_date: matched.effective_date ?? matched.inception_date ?? q.inception_date ?? null,
                        inception_time: matched.inception_time ?? q.inception_time ?? '00:00:00',
                        effective_time: matched.effective_time ?? matched.inception_time ?? q.inception_time ?? '00:00:00',
                        expiry_time: matched.expiry_time ?? q.expiry_time ?? '23:59:59',
                    })
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
        getClassesOfBusiness()
            .then((items) => setClassesOfBusiness(items ?? []))
            .catch(() => setClassesOfBusiness([]))
    }, [])

    useEffect(() => {
        getCurrencies()
            .then((items) => setCurrencyOptions(items ?? []))
            .catch(() => setCurrencyOptions([]))
    }, [])

    useEffect(() => {
        getLossQualifiers()
            .then((items) => setLossQualifierOptions(items ?? []))
            .catch(() => setLossQualifierOptions([]))
    }, [])

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
                gross_deductions: section.gross_deductions,
                net_premium: section.net_premium,
                tax_receivable: section.tax_receivable,
                tax_payable: section.tax_payable,
                gross_gross_premium_written: section.gross_gross_premium_written,
                gross_gross_premium_signed: section.gross_gross_premium_signed,
                gross_deductions_written: section.gross_deductions_written,
                gross_deductions_signed: section.gross_deductions_signed,
                gross_premium_written: section.gross_premium_written,
                gross_premium_signed: section.gross_premium_signed,
                deductions_written: section.deductions_written,
                deductions_signed: section.deductions_signed,
                net_premium_written: section.net_premium_written,
                net_premium_signed: section.net_premium_signed,
                tax_receivable_written: section.tax_receivable_written,
                tax_receivable_signed: section.tax_receivable_signed,
                tax_payable_written: section.tax_payable_written,
                tax_payable_signed: section.tax_payable_signed,
                annual_gross_premium: section.annual_gross_premium,
                annual_net_premium: section.annual_net_premium,
                written_order: section.written_order,
                signed_order: section.signed_order,
                time_basis: section.time_basis ?? null,
                written_order_basis: section.written_order_basis ?? null,
                signed_order_basis: section.signed_order_basis ?? null,
                written_line_total: section.written_line_total ?? null,
                signed_line_total: section.signed_line_total ?? null,
                delegated_authority_ref: section.delegated_authority_ref ?? null,
                delegated_authority_section_ref: section.delegated_authority_section_ref ?? null,
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
            <div className="flex flex-col gap-3">
                {actionError && <p className="text-sm text-red-600">{actionError}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    <FieldGroup title="Contract & Reference">
                        <div className="flex flex-col gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reference</label>
                                <p className="text-sm text-gray-900">{section.reference}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Class of Business</label>
                                {editable ? (
                                    <SearchableSelect id="quote-section-class-of-business" ariaLabel="Class of Business" value={section.class_of_business ?? ''} options={classesOfBusiness} onChange={(nextValue) => setSection((s) => s ? { ...s, class_of_business: nextValue } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.class_of_business ?? '—'}</p>}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Delegated Authority">
                        <div className="flex flex-col gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delegated Authority Reference</label>
                                {editable ? (
                                    <input aria-label="Delegated Authority Reference" type="text" className={CONTROL_CLASS} value={section.delegated_authority_ref ?? ''} onChange={(e) => setSection((s) => s ? { ...s, delegated_authority_ref: e.target.value } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.delegated_authority_ref ?? '—'}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delegated Authority Section Reference</label>
                                {editable ? (
                                    <input aria-label="Delegated Authority Section Reference" type="text" className={CONTROL_CLASS} value={section.delegated_authority_section_ref ?? ''} onChange={(e) => setSection((s) => s ? { ...s, delegated_authority_section_ref: e.target.value } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.delegated_authority_section_ref ?? '—'}</p>}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Limit">
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-limit-currency" ariaLabel="Limit Currency" value={section.limit_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, limit_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.limit_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Limit Amount</label>
                                    {editable ? (
                                        <input type="number" className={CONTROL_SMALL_CLASS} value={section.limit_amount ?? ''} onChange={(e) => setSection((s) => s ? { ...s, limit_amount: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.limit_amount != null ? Number(section.limit_amount).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.limit_amount_movement != null ? Number(section.limit_amount_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Limit Loss Qualifier</label>
                                {editable ? (
                                    <SearchableSelect id="quote-section-limit-loss-qualifier" ariaLabel="Limit Loss Qualifier" value={section.limit_loss_qualifier ?? ''} options={lossQualifierOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, limit_loss_qualifier: nextValue } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.limit_loss_qualifier ?? '—'}</p>}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Insured">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Insured</label>
                            <p className="text-sm text-gray-900">{quote?.insured ?? '—'}</p>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Annual Rating">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-premium-currency" ariaLabel="Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, premium_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.premium_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gross Premium</label>
                                    {editable ? (
                                        <input type="number" step="0.01" className={CONTROL_SMALL_CLASS} value={section.gross_premium ?? ''} onChange={(e) => setSection((s) => s ? { ...s, gross_premium: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.gross_premium != null ? Number(section.gross_premium).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.gross_premium_movement != null ? Number(section.gross_premium_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-annual-gross-currency" ariaLabel="Annual Rated Gross Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, premium_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.premium_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Annual Rated Gross Premium</label>
                                    {editable ? (
                                        <input type="number" step="0.01" className={CONTROL_SMALL_CLASS} value={section.annual_gross_premium ?? ''} onChange={(e) => setSection((s) => s ? { ...s, annual_gross_premium: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.annual_gross_premium != null ? Number(section.annual_gross_premium).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.annual_gross_premium_movement != null ? Number(section.annual_gross_premium_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-annual-net-currency" ariaLabel="Annual Rated Net Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, premium_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.premium_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Annual Rated Net Premium</label>
                                    {editable ? (
                                        <input type="number" step="0.01" className={CONTROL_SMALL_CLASS} value={section.annual_net_premium ?? ''} onChange={(e) => setSection((s) => s ? { ...s, annual_net_premium: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.annual_net_premium != null ? Number(section.annual_net_premium).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.annual_net_premium_movement != null ? Number(section.annual_net_premium_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Dates">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Inception Date</label>
                                    {editable ? (
                                        <input type="date" className={CONTROL_CLASS} value={section.inception_date ?? ''} onChange={(e) => setSection((s) => s ? { ...s, inception_date: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.inception_date ?? '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Inception Time</label>
                                    {editable ? (
                                        <input id="section-inception-time" aria-label="Inception Time" type="time" step="1" className={CONTROL_CLASS} value={section.inception_time ?? '00:00:00'} onChange={(e) => setSection((s) => s ? { ...s, inception_time: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.inception_time ?? '—'}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Effective Date</label>
                                    {editable ? (
                                        <input type="date" className={CONTROL_CLASS} value={section.effective_date ?? ''} onChange={(e) => setSection((s) => s ? { ...s, effective_date: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.effective_date ?? '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Effective Time</label>
                                    {editable ? (
                                        <input id="section-effective-time" aria-label="Effective Time" type="time" step="1" className={CONTROL_CLASS} value={section.effective_time ?? '00:00:00'} onChange={(e) => setSection((s) => s ? { ...s, effective_time: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.effective_time ?? '—'}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Expiry Date</label>
                                    {editable ? (
                                        <input type="date" className={CONTROL_CLASS} value={section.expiry_date ?? ''} onChange={(e) => setSection((s) => s ? { ...s, expiry_date: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.expiry_date ?? '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Expiry Time</label>
                                    {editable ? (
                                        <input id="section-expiry-time" aria-label="Expiry Time" type="time" step="1" className={CONTROL_CLASS} value={section.expiry_time ?? '23:59:59'} onChange={(e) => setSection((s) => s ? { ...s, expiry_time: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.expiry_time ?? '—'}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Days on Cover</label>
                                <p className="text-sm text-gray-900">{computeDaysOnCover(section.inception_date, section.expiry_date) ?? '—'}</p>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Order & Lines">
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time Basis</label>
                                {editable ? (
                                    <input aria-label="Time Basis" type="text" className={CONTROL_CLASS} value={section.time_basis ?? ''} onChange={(e) => setSection((s) => s ? { ...s, time_basis: e.target.value } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.time_basis ?? '—'}</p>}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Written Order %</label>
                                    {editable ? (
                                        <input aria-label="Written Order %" type="number" step="0.01" min="0" max="100" className={CONTROL_CLASS} value={section.written_order ?? ''} onChange={(e) => setSection((s) => s ? { ...s, written_order: Number(e.target.value) } : s)} />
                                    ) : <p className="text-sm text-gray-900 text-right">{section.written_order != null ? `${section.written_order}%` : '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Written Order Basis</label>
                                    {editable ? (
                                        <input aria-label="Written Order Basis" type="text" className={CONTROL_CLASS} value={section.written_order_basis ?? ''} onChange={(e) => setSection((s) => s ? { ...s, written_order_basis: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.written_order_basis ?? '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Written Line Total</label>
                                    {editable ? (
                                        <input aria-label="Written Line Total" type="number" step="0.01" className={CONTROL_CLASS} value={section.written_line_total ?? ''} onChange={(e) => setSection((s) => s ? { ...s, written_line_total: Number(e.target.value) } : s)} />
                                    ) : <p className="text-sm text-gray-900 text-right">{section.written_line_total != null ? Number(section.written_line_total).toLocaleString() : '—'}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Signed Order %</label>
                                    {editable ? (
                                        <input aria-label="Signed Order %" type="number" step="0.01" min="0" max="100" className={CONTROL_CLASS} value={section.signed_order ?? ''} onChange={(e) => setSection((s) => s ? { ...s, signed_order: Number(e.target.value) } : s)} />
                                    ) : <p className="text-sm text-gray-900 text-right">{section.signed_order != null ? `${section.signed_order}%` : '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Signed Order Basis</label>
                                    {editable ? (
                                        <input aria-label="Signed Order Basis" type="text" className={CONTROL_CLASS} value={section.signed_order_basis ?? ''} onChange={(e) => setSection((s) => s ? { ...s, signed_order_basis: e.target.value } : s)} />
                                    ) : <p className="text-sm text-gray-900">{section.signed_order_basis ?? '—'}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Signed Line Total</label>
                                    {editable ? (
                                        <input aria-label="Signed Line Total" type="number" step="0.01" className={CONTROL_CLASS} value={section.signed_line_total ?? ''} onChange={(e) => setSection((s) => s ? { ...s, signed_line_total: Number(e.target.value) } : s)} />
                                    ) : <p className="text-sm text-gray-900 text-right">{section.signed_line_total != null ? Number(section.signed_line_total).toLocaleString() : '—'}</p>}
                                </div>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Renewal">
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Renewal Date</label>
                                <p className="text-sm text-gray-900">{quote?.renewal_date ?? '—'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Renewal Status</label>
                                <p className="text-sm text-gray-900">{quote?.renewal_status ?? '—'}</p>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Excess">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-excess-currency" ariaLabel="Excess Currency" value={section.excess_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, excess_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.excess_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Excess Amount</label>
                                    {editable ? (
                                        <input type="number" className={CONTROL_SMALL_CLASS} value={section.excess_amount ?? ''} onChange={(e) => setSection((s) => s ? { ...s, excess_amount: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.excess_amount != null ? Number(section.excess_amount).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.excess_amount_movement != null ? Number(section.excess_amount_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Excess Loss Qualifier</label>
                                {editable ? (
                                    <SearchableSelect id="quote-section-excess-loss-qualifier" ariaLabel="Excess Loss Qualifier" value={section.excess_loss_qualifier ?? ''} options={lossQualifierOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, excess_loss_qualifier: nextValue } : s)} />
                                ) : <p className="text-sm text-gray-900">{section.excess_loss_qualifier ?? '—'}</p>}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Sum Insured">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="quote-section-sum-insured-currency" ariaLabel="Sum Insured Currency" value={section.sum_insured_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((s) => s ? { ...s, sum_insured_currency: nextValue } : s)} />
                                    ) : <input readOnly className={CONTROL_SMALL_CLASS} value={section.sum_insured_currency ?? '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sum Insured Amount</label>
                                    {editable ? (
                                        <input type="number" className={CONTROL_SMALL_CLASS} value={section.sum_insured_amount ?? ''} onChange={(e) => setSection((s) => s ? { ...s, sum_insured_amount: Number(e.target.value) } : s)} />
                                    ) : <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.sum_insured_amount != null ? Number(section.sum_insured_amount).toLocaleString() : '—'} />}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Movement</label>
                                    <input readOnly className={`${CONTROL_SMALL_CLASS} text-right`} value={section.sum_insured_amount_movement != null ? Number(section.sum_insured_amount_movement).toLocaleString() : '—'} />
                                </div>
                            </div>
                        </div>
                    </FieldGroup>
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
                                { key: 'limit_currency', label: 'Limit Currency', defaultWidth: 130 },
                                { key: 'limit_amount', label: 'Limit Amount', defaultWidth: 140 },
                                { key: 'sum_insured_currency', label: 'Sum Insured Currency', defaultWidth: 150 },
                                { key: 'sum_insured', label: 'Sum Insured', defaultWidth: 130 },
                                { key: 'annual_gross_premium', label: 'Annual Gross Premium', defaultWidth: 170 },
                                { key: 'annual_net_premium', label: 'Annual Net Premium', defaultWidth: 170 },
                                { key: 'gross_premium', label: 'Gross Premium', defaultWidth: 130 },
                                { key: 'net_premium', label: 'Net Premium', defaultWidth: 120 },
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
                                                        effective_date: section.effective_date ?? section.inception_date ?? null,
                                                        expiry_date: section.expiry_date ?? null,
                                                        annual_gross_premium: null,
                                                        annual_net_premium: null,
                                                        limit_currency: section.limit_currency ?? null,
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
                                if (key === 'sum_insured_currency') return cov.sum_insured_currency ?? '—'
                                if (key === 'sum_insured') return cov.sum_insured?.toLocaleString() ?? '—'
                                if (key === 'gross_premium') return cov.gross_premium?.toLocaleString() ?? '—'
                                if (key === 'net_premium') return cov.net_premium?.toLocaleString() ?? '—'
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
                                        className={CONTROL_SMALL_CLASS}
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
                                        className={`${CONTROL_SMALL_CLASS} text-right`}
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
                                        className={`${CONTROL_SMALL_CLASS} text-right`}
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
                                        className={CONTROL_SMALL_CLASS}
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
                                        className={CONTROL_SMALL_CLASS}
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
                                        className={CONTROL_SMALL_CLASS}
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

            {activeTab === 'sectionFinancialSummary' && (
                <div className="grid grid-cols-1 gap-4">
                    <div className="table-wrapper">
                        <table className="app-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Measure</th>
                                    <th className="text-right">Base</th>
                                    <th className="text-right">Written</th>
                                    <th className="text-right">Signed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Gross Gross Premium', section.gross_gross_premium, section.gross_gross_premium_written, section.gross_gross_premium_signed],
                                    ['Gross Deductions', section.gross_deductions, section.gross_deductions_written, section.gross_deductions_signed],
                                    ['Gross Premium', section.gross_premium, section.gross_premium_written, section.gross_premium_signed],
                                    ['Deductions', section.deductions, section.deductions_written, section.deductions_signed],
                                    ['Gross Net Premium', section.net_premium, section.net_premium_written, section.net_premium_signed],
                                    ['Tax Receivable', section.tax_receivable, section.tax_receivable_written, section.tax_receivable_signed],
                                    ['Tax Payable', section.tax_payable, section.tax_payable_written, section.tax_payable_signed],
                                ].map(([name, base, written, signed]) => (
                                    <tr key={String(name)}>
                                        <td>{String(name)}</td>
                                        <td className="text-right">{typeof base === 'number' ? base.toLocaleString() : '—'}</td>
                                        <td className="text-right">{typeof written === 'number' ? written.toLocaleString() : '—'}</td>
                                        <td className="text-right">{typeof signed === 'number' ? signed.toLocaleString() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'signings' && (
                <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-500">
                    Signings placeholder.
                </div>
            )}

            <datalist id="quote-section-class-of-business-options">
                {classesOfBusiness.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>

            {/* Editable status badge */}
            {quote && (
                <div className="fixed bottom-20 right-4 z-40">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${editable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${editable ? 'bg-green-500' : 'bg-amber-400'}`} aria-hidden="true" />
                        <span>{editable ? 'Editable' : 'Read-only'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
