/**
 * BordereauCreateModal — Downloads a blank CSV header template for a bordereaux period.
 *
 * Allows the user to select a bordereau category (Risk, Claims, ELTO, PoolRe, Aggregation),
 * data type (Transactional / Restating), and reporting period (month + year), then downloads
 * a CSV file whose header row matches the configured attribute set for that category.
 *
 * Attribute sets are resolved in priority order:
 *   1. Saved format from localStorage (key: ba:{id}:bordereau:formats)
 *   2. Per-BA selection (key: ba:{id}:bordereau:{category}:attributes)
 *   3. Global defaults (key: bordereau:defaults:{category})
 *   4. Hard-coded DEFAULT_ATTRS fallback
 */

import { useEffect, useMemo, useState } from 'react'
import { FiDownloadCloud, FiX } from 'react-icons/fi'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'Risk' | 'Claims' | 'ELTO' | 'PoolRe' | 'Aggregation'
type DataType = 'Transactional' | 'Restating'

interface SavedFormat {
    name?: string
    category?: Category
    dataType?: DataType
    attributes?: string[]
}

export interface BordereauCreateModalProps {
    isOpen: boolean
    onClose: () => void
    bindingAuthorityId?: string | number | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
    { value: 'Risk', label: 'Risk' },
    { value: 'Claims', label: 'Claims' },
    { value: 'ELTO', label: 'ELTO' },
    { value: 'PoolRe', label: 'Pool Re Terrorism' },
    { value: 'Aggregation', label: 'Aggregation' },
]

const DATATYPE_OPTIONS: { value: DataType; label: string }[] = [
    { value: 'Transactional', label: 'Transactional' },
    { value: 'Restating', label: 'Restating' },
]

const DEFAULT_ATTRS: Record<Category, { key: string; label: string }[]> = {
    Risk: [
        { key: 'policy.reference', label: 'Policy Reference' },
        { key: 'policy.insuredName', label: 'Insured Name' },
        { key: 'policy.inceptionDate', label: 'Inception Date' },
        { key: 'policy.expiryDate', label: 'Expiry Date' },
        { key: 'section.reference', label: 'Section Reference' },
        { key: 'section.classOfBusiness', label: 'Class of Business' },
        { key: 'section.timeBasis', label: 'Time Basis' },
        { key: 'section.premiumCurrency', label: 'Section Premium Currency' },
        { key: 'section.grossPremium', label: 'Section Gross Premium' },
        { key: 'coverage.reference', label: 'Coverage Reference' },
        { key: 'coverage.limitAmount', label: 'Coverage Limit' },
        { key: 'coverage.limitCurrency', label: 'Coverage Limit Currency' },
    ],
    Claims: [
        { key: 'claim.reference', label: 'Claim Reference' },
        { key: 'claim.lossDate', label: 'Loss Date' },
        { key: 'claim.status', label: 'Claim Status' },
        { key: 'claimTxn.paidAmount', label: 'Paid Amount' },
        { key: 'claimTxn.currency', label: 'Transaction Currency' },
        { key: 'claimTxn.transactionDate', label: 'Transaction Date' },
        { key: 'policy.reference', label: 'Policy Reference' },
        { key: 'policy.insuredName', label: 'Insured Name' },
    ],
    ELTO: [
        { key: 'policy.reference', label: 'Policy Reference' },
        { key: 'policy.insuredName', label: 'Insured Name' },
        { key: 'elto.employerName', label: 'Employer Name' },
        { key: 'elto.employerERN', label: 'Employer ERN' },
        { key: 'elto.employerAddress', label: 'Employer Address' },
        { key: 'policy.inceptionDate', label: 'Inception Date' },
        { key: 'policy.expiryDate', label: 'Expiry Date' },
    ],
    PoolRe: [
        { key: 'policy.reference', label: 'Policy Reference' },
        { key: 'risk.address', label: 'Risk Address' },
        { key: 'risk.postcode', label: 'Postcode' },
        { key: 'risk.occupancy', label: 'Occupancy' },
        { key: 'risk.poolReCode', label: 'Pool Re Code' },
        { key: 'section.premiumCurrency', label: 'Premium Currency' },
        { key: 'section.grossPremium', label: 'Gross Premium' },
        { key: 'coverage.limitCurrency', label: 'Sum Insured Currency' },
        { key: 'coverage.limitAmount', label: 'Sum Insured' },
    ],
    Aggregation: [
        { key: 'agg.territory', label: 'Territory' },
        { key: 'agg.classOfBusiness', label: 'Class of Business' },
        { key: 'agg.countRisks', label: 'Count of Risks' },
        { key: 'agg.totalSumInsured', label: 'Total Sum Insured' },
        { key: 'agg.totalGrossPremium', label: 'Total Gross Premium' },
    ],
}

// ---------------------------------------------------------------------------
// BordereauCreateModal
// ---------------------------------------------------------------------------

export default function BordereauCreateModal({ isOpen, onClose, bindingAuthorityId }: BordereauCreateModalProps) {
    const [formats, setFormats] = useState<SavedFormat[]>([])
    const [formatIndex, setFormatIndex] = useState(-1)
    const [category, setCategory] = useState<Category>('Risk')
    const [dataType, setDataType] = useState<DataType>('Transactional')
    const [month, setMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'))
    const [year, setYear] = useState(() => String(new Date().getFullYear()))

    // Reset fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setCategory('Risk')
                setDataType('Transactional')
                setMonth(String(new Date().getMonth() + 1).padStart(2, '0'))
                setYear(String(new Date().getFullYear()))
            }, 100)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    // Load saved formats for this BA from localStorage
    useEffect(() => {
        if (!isOpen) return
        try {
            const key = bindingAuthorityId ? `ba:${bindingAuthorityId}:bordereau:formats` : null
            if (key) {
                const raw = localStorage.getItem(key)
                setFormats(raw ? (JSON.parse(raw) as SavedFormat[]) : [])
            } else {
                setFormats([])
            }
            setFormatIndex(-1)
        } catch {
            setFormats([])
            setFormatIndex(-1)
        }
    }, [isOpen, bindingAuthorityId])

    const headers = useMemo(() => {
        const chosenFormat = formatIndex >= 0 ? formats[formatIndex] : null
        const cat: Category = (chosenFormat?.category ?? category) as Category
        const attrMap = new Map((DEFAULT_ATTRS[cat] ?? []).map((a) => [a.key, a.label]))

        if (chosenFormat && Array.isArray(chosenFormat.attributes) && chosenFormat.attributes.length) {
            return chosenFormat.attributes.map((k) => attrMap.get(k) ?? k)
        }

        // Try per-BA then global defaults from localStorage
        let selectedKeys: string[] = []
        try {
            const baKey = bindingAuthorityId ? `ba:${bindingAuthorityId}:bordereau:${cat}:attributes` : null
            if (baKey) {
                const raw = localStorage.getItem(baKey)
                if (raw) selectedKeys = JSON.parse(raw) as string[]
            }
            if (!selectedKeys.length) {
                const gRaw = localStorage.getItem(`bordereau:defaults:${cat}`)
                if (gRaw) selectedKeys = JSON.parse(gRaw) as string[]
            }
        } catch { /* ignore */ }

        const chosen = selectedKeys.length ? selectedKeys : (DEFAULT_ATTRS[cat] ?? []).map((a) => a.key)
        return chosen.map((k) => attrMap.get(k) ?? k)
    }, [bindingAuthorityId, category, formats, formatIndex])

    function downloadCsv() {
        const csv = headers.join(',') + '\r\n'
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const chosenFormat = formatIndex >= 0 ? formats[formatIndex] : null
        const fmtName = chosenFormat ? `-${(chosenFormat.name ?? '').replace(/[^a-z0-9]+/gi, '_')}` : ''
        const cat = chosenFormat?.category ?? category
        const type = chosenFormat?.dataType ?? dataType
        const ba = bindingAuthorityId ?? 'BA'
        const filename = `Bordereau-${ba}-${cat}-${type}-${year}-${month}${fmtName}.csv`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }, 0)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded shadow-lg w-[720px] max-w-[95vw] max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold">Create Bordereau</h2>
                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-800"
                        onClick={onClose}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {formats.length > 0 && (
                        <FieldGroup title="Use Saved Format (optional)">
                            <div className="flex items-center gap-2">
                                <select
                                    className="border rounded px-2 py-1"
                                    value={formatIndex}
                                    onChange={(e) => setFormatIndex(Number(e.target.value))}
                                >
                                    <option value={-1}>-- None --</option>
                                    {formats.map((f, i) => (
                                        <option key={`${f.name ?? ''}-${i}`} value={i}>
                                            {f.name} · {f.category} · {f.dataType}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </FieldGroup>
                    )}

                    <FieldGroup title="Bordereau Category">
                        <div className="flex gap-4 flex-wrap">
                            {CATEGORY_OPTIONS.map((opt) => (
                                <label key={opt.value} className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="create-bordereau-category"
                                        value={opt.value}
                                        checked={(formatIndex >= 0 ? formats[formatIndex]?.category : category) === opt.value}
                                        onChange={() => {
                                            setFormatIndex(-1)
                                            setCategory(opt.value)
                                        }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Bordereau Type">
                        <div className="flex gap-4">
                            {DATATYPE_OPTIONS.map((opt) => (
                                <label key={opt.value} className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="create-bordereau-type"
                                        value={opt.value}
                                        checked={(formatIndex >= 0 ? formats[formatIndex]?.dataType : dataType) === opt.value}
                                        onChange={() => {
                                            setFormatIndex(-1)
                                            setDataType(opt.value)
                                        }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Period">
                        <div className="flex items-center gap-2">
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="border rounded px-2 py-1"
                            >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="border rounded px-2 py-1"
                            >
                                {Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </FieldGroup>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            This creates a blank CSV header template for the selected category and data type.
                        </div>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700"
                            onClick={downloadCsv}
                        >
                            <FiDownloadCloud size={16} /> Download CSV
                        </button>
                    </div>

                    <div className="text-right">
                        <button
                            type="button"
                            className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
