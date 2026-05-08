/**
 * BordereauConfigModal — REQ-BA-FE-F-117 to F-121
 *
 * 3-step wizard for creating or editing a named bordereau configuration.
 *
 * Steps:
 *   1. Setup   — Name, Type (6 options incl. Paid), Data Style
 *   2. Fields  — Dual-pane Report Builder: Available (left) | Selected + Order (right)
 *   3. Preview — Illustrative data table; Add/Save persists the config
 *
 * Exports:
 *   BordereauConfig, BordType, DataStyle
 *
 * Storage (on Add/Save):
 *   ba:{id}:bordereau:{type}:attributes → string[]  (compat key for BordereauCreateModal)
 * The parent (BAViewPage) manages the ba:{id}:bordeaux list.
 */

import { useEffect, useState } from 'react'
import { FiX, FiChevronUp, FiChevronDown, FiPlus, FiSearch } from 'react-icons/fi'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type BordType = 'Risk' | 'Claims' | 'Paid' | 'ELTO' | 'PoolRe' | 'Aggregation'
export type DataStyle = 'Restating' | 'Transactional'

export interface BordereauConfig {
    id: string
    name: string
    type: BordType
    dataStyle: DataStyle
    fields: string[]   // ordered field keys
    createdAt: string  // YYYY-MM-DD
}

interface AttrDef {
    key: string
    label: string
    domain: string      // display grouping (e.g. "Policy", "Section")
    mandatory?: boolean
}

export interface BordereauConfigModalProps {
    isOpen: boolean
    onClose?: () => void
    bindingAuthorityId?: string | number | null
    editConfig?: BordereauConfig | null
    onSaved?: (config: BordereauConfig) => void
}

// ---------------------------------------------------------------------------
// Wizard step constants — 3 steps (Fields and Order merged into one pane)
// ---------------------------------------------------------------------------

type WizardStep = 'setup' | 'fields' | 'preview'
const STEPS: { key: WizardStep; label: string }[] = [
    { key: 'setup',   label: 'Setup'   },
    { key: 'fields',  label: 'Fields'  },
    { key: 'preview', label: 'Preview' },
]

// ---------------------------------------------------------------------------
// Type options — REQ-BA-FE-F-118
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: BordType; label: string; description: string }[] = [
    { value: 'Risk',        label: 'Risk',              description: 'Policies written / bound' },
    { value: 'Claims',      label: 'Claims',            description: 'Received, paid, outstanding & reserves' },
    { value: 'Paid',        label: 'Paid',              description: 'Invoice created and payment received' },
    { value: 'ELTO',        label: 'ELTO',              description: 'Employers Liability Tracing Office' },
    { value: 'PoolRe',      label: 'Pool Re Terrorism', description: 'Pool Re terrorism scheme (mandatory fields)' },
    { value: 'Aggregation', label: 'Aggregation',       description: 'Locations covered on a policy' },
]

const DATA_STYLE_OPTIONS: { value: DataStyle; label: string; description: string }[] = [
    { value: 'Transactional', label: 'Transactional', description: 'Rows represent individual transactions' },
    { value: 'Restating',     label: 'Restating',     description: 'Rows represent cumulative positions' },
]

// ---------------------------------------------------------------------------
// Attribute definitions — REQ-BA-FE-F-119
// ---------------------------------------------------------------------------

const DEFAULT_ATTRS: Record<BordType, AttrDef[]> = {
    Risk: [
        { key: 'policy.reference',        label: 'Policy Reference',          domain: 'Policy'   },
        { key: 'policy.insuredName',      label: 'Insured Name',              domain: 'Policy'   },
        { key: 'policy.inceptionDate',    label: 'Inception Date',            domain: 'Policy'   },
        { key: 'policy.expiryDate',       label: 'Expiry Date',               domain: 'Policy'   },
        { key: 'section.reference',       label: 'Section Reference',         domain: 'Section'  },
        { key: 'section.classOfBusiness', label: 'Class of Business',         domain: 'Section'  },
        { key: 'section.timeBasis',       label: 'Time Basis',                domain: 'Section'  },
        { key: 'section.premiumCurrency', label: 'Section Premium Currency',  domain: 'Section'  },
        { key: 'section.grossPremium',    label: 'Section Gross Premium',     domain: 'Section'  },
        { key: 'coverage.reference',      label: 'Coverage Reference',        domain: 'Coverage' },
        { key: 'coverage.limitAmount',    label: 'Coverage Limit',            domain: 'Coverage' },
        { key: 'coverage.limitCurrency',  label: 'Coverage Limit Currency',   domain: 'Coverage' },
    ],
    Claims: [
        { key: 'claim.reference',          label: 'Claim Reference',         domain: 'Claim'        },
        { key: 'claim.lossDate',           label: 'Loss Date',               domain: 'Claim'        },
        { key: 'claim.status',             label: 'Claim Status',            domain: 'Claim'        },
        { key: 'claimTxn.paidAmount',      label: 'Paid Amount',             domain: 'Transaction'  },
        { key: 'claimTxn.currency',        label: 'Transaction Currency',    domain: 'Transaction'  },
        { key: 'claimTxn.transactionDate', label: 'Transaction Date',        domain: 'Transaction'  },
        { key: 'policy.reference',         label: 'Policy Reference',        domain: 'Policy'       },
        { key: 'policy.insuredName',       label: 'Insured Name',            domain: 'Policy'       },
    ],
    Paid: [
        { key: 'policy.reference',   label: 'Policy Reference',   domain: 'Policy'  },
        { key: 'policy.insuredName', label: 'Insured Name',        domain: 'Policy'  },
        { key: 'invoice.reference',  label: 'Invoice Reference',   domain: 'Invoice' },
        { key: 'invoice.date',       label: 'Invoice Date',        domain: 'Invoice' },
        { key: 'invoice.amount',     label: 'Invoice Amount',      domain: 'Invoice' },
        { key: 'invoice.currency',   label: 'Invoice Currency',    domain: 'Invoice' },
        { key: 'payment.date',       label: 'Payment Date',        domain: 'Payment' },
        { key: 'payment.reference',  label: 'Payment Reference',   domain: 'Payment' },
    ],
    ELTO: [
        { key: 'policy.reference',     label: 'Policy Reference',  domain: 'Policy'   },
        { key: 'policy.insuredName',   label: 'Insured Name',      domain: 'Policy'   },
        { key: 'elto.employerName',    label: 'Employer Name',     domain: 'Employer' },
        { key: 'elto.employerERN',     label: 'Employer ERN',      domain: 'Employer' },
        { key: 'elto.employerAddress', label: 'Employer Address',  domain: 'Employer' },
        { key: 'policy.inceptionDate', label: 'Inception Date',    domain: 'Policy'   },
        { key: 'policy.expiryDate',    label: 'Expiry Date',       domain: 'Policy'   },
    ],
    PoolRe: [
        { key: 'policy.reference',        label: 'Policy Reference',     domain: 'Policy',   mandatory: true },
        { key: 'risk.address',            label: 'Risk Address',         domain: 'Risk',     mandatory: true },
        { key: 'risk.postcode',           label: 'Postcode',             domain: 'Risk',     mandatory: true },
        { key: 'risk.occupancy',          label: 'Occupancy',            domain: 'Risk',     mandatory: true },
        { key: 'risk.poolReCode',         label: 'Pool Re Code',         domain: 'Risk',     mandatory: true },
        { key: 'section.premiumCurrency', label: 'Premium Currency',     domain: 'Section',  mandatory: true },
        { key: 'section.grossPremium',    label: 'Gross Premium',        domain: 'Section',  mandatory: true },
        { key: 'coverage.limitCurrency',  label: 'Sum Insured Currency', domain: 'Coverage', mandatory: true },
        { key: 'coverage.limitAmount',    label: 'Sum Insured',          domain: 'Coverage', mandatory: true },
    ],
    Aggregation: [
        { key: 'agg.territory',         label: 'Territory',            domain: 'Aggregation' },
        { key: 'agg.classOfBusiness',   label: 'Class of Business',    domain: 'Aggregation' },
        { key: 'agg.countRisks',        label: 'Count of Risks',       domain: 'Aggregation' },
        { key: 'agg.totalSumInsured',   label: 'Total Sum Insured',    domain: 'Aggregation' },
        { key: 'agg.totalGrossPremium', label: 'Total Gross Premium',  domain: 'Aggregation' },
    ],
}

// Illustrative preview data — REQ-BA-FE-F-121
const ILLUSTRATIVE: Record<BordType, Record<string, string>> = {
    Risk: {
        'policy.reference': 'BA/2025/001/001', 'policy.insuredName': 'Acme Industries Ltd',
        'policy.inceptionDate': '01/01/2025',   'policy.expiryDate': '31/12/2025',
        'section.reference': 'SEC-001',          'section.classOfBusiness': 'Property',
        'section.timeBasis': 'Annual',            'section.premiumCurrency': 'GBP',
        'section.grossPremium': '12,500.00',      'coverage.reference': 'COV-001',
        'coverage.limitAmount': '5,000,000.00',  'coverage.limitCurrency': 'GBP',
    },
    Claims: {
        'claim.reference': 'CLM/2025/001',      'claim.lossDate': '15/03/2025',
        'claim.status': 'Open',                  'claimTxn.paidAmount': '2,500.00',
        'claimTxn.currency': 'GBP',              'claimTxn.transactionDate': '20/03/2025',
        'policy.reference': 'BA/2025/001/001',  'policy.insuredName': 'Acme Industries Ltd',
    },
    Paid: {
        'policy.reference': 'BA/2025/001/001',  'policy.insuredName': 'Acme Industries Ltd',
        'invoice.reference': 'INV/2025/001',    'invoice.date': '31/01/2025',
        'invoice.amount': '12,500.00',           'invoice.currency': 'GBP',
        'payment.date': '15/02/2025',            'payment.reference': 'PAY/2025/001',
    },
    ELTO: {
        'policy.reference': 'BA/2025/001/001',  'policy.insuredName': 'Acme Industries Ltd',
        'elto.employerName': 'Widget Mfg Co',   'elto.employerERN': '123/AB45678',
        'elto.employerAddress': '1 Industrial Way, London, EC1A 1BB',
        'policy.inceptionDate': '01/01/2025',    'policy.expiryDate': '31/12/2025',
    },
    PoolRe: {
        'policy.reference': 'BA/2025/001/001',  'risk.address': '10 Downing Street, London',
        'risk.postcode': 'SW1A 2AA',             'risk.occupancy': 'Government / Public Admin',
        'risk.poolReCode': 'GOV001',             'section.premiumCurrency': 'GBP',
        'section.grossPremium': '5,000.00',      'coverage.limitCurrency': 'GBP',
        'coverage.limitAmount': '10,000,000.00',
    },
    Aggregation: {
        'agg.territory': 'United Kingdom',       'agg.classOfBusiness': 'Property',
        'agg.countRisks': '127',                 'agg.totalSumInsured': '250,000,000.00',
        'agg.totalGrossPremium': '1,250,000.00',
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultFields(type: BordType): string[] {
    return (DEFAULT_ATTRS[type] ?? []).map(a => a.key)
}

function mandatoryKeys(type: BordType): Set<string> {
    return new Set((DEFAULT_ATTRS[type] ?? []).filter(a => a.mandatory).map(a => a.key))
}

function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ---------------------------------------------------------------------------
// Component — REQ-BA-FE-F-117
// ---------------------------------------------------------------------------

export default function BordereauConfigModal({
    isOpen,
    onClose,
    bindingAuthorityId,
    editConfig,
    onSaved,
}: BordereauConfigModalProps) {
    // Wizard navigation
    const [step, setStep] = useState<WizardStep>('setup')

    // Step 1: Setup
    const [name, setName]           = useState('')
    const [type, setType]           = useState<BordType>('Risk')
    const [dataStyle, setDataStyle] = useState<DataStyle>('Transactional')

    // Step 2: Dual-pane field builder
    // fieldOrder = ordered list of selected field keys (right pane)
    const [fieldOrder, setFieldOrder] = useState<string[]>([])
    const [search, setSearch]         = useState('')

    // Reset wizard whenever the modal opens
    useEffect(() => {
        if (!isOpen) return
        if (editConfig) {
            setName(editConfig.name)
            setType(editConfig.type)
            setDataStyle(editConfig.dataStyle)
            setFieldOrder(editConfig.fields)
        } else {
            setName('')
            setType('Risk')
            setDataStyle('Transactional')
            setFieldOrder(defaultFields('Risk'))
        }
        setSearch('')
        setStep('setup')
    }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    // Step 1: changing type resets selection to full default for the new type
    const handleTypeChange = (t: BordType) => {
        setType(t)
        setFieldOrder(defaultFields(t))
        setSearch('')
    }

    // Step 2: dual-pane helpers
    const attrs    = DEFAULT_ATTRS[type] ?? []
    const mandatory = mandatoryKeys(type)
    const selectedSet = new Set(fieldOrder)

    // Available fields = not yet selected, filtered by search
    const available = attrs.filter(a => {
        if (selectedSet.has(a.key)) return false
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return a.label.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q)
    })

    const addField = (key: string) => {
        setFieldOrder(prev => [...prev, key])
    }

    const removeField = (key: string) => {
        if (mandatory.has(key)) return
        setFieldOrder(prev => prev.filter(k => k !== key))
    }

    const moveUp = (i: number) => {
        if (i === 0) return
        setFieldOrder(prev => {
            const next = [...prev];
            [next[i - 1], next[i]] = [next[i], next[i - 1]]
            return next
        })
    }

    const moveDown = (i: number) => {
        setFieldOrder(prev => {
            if (i >= prev.length - 1) return prev
            const next = [...prev];
            [next[i], next[i + 1]] = [next[i + 1], next[i]]
            return next
        })
    }

    // Label / domain lookup
    const attrMap = Object.fromEntries(attrs.map(a => [a.key, a]))
    const labelFor  = (key: string) => attrMap[key]?.label  ?? key
    const domainFor = (key: string) => attrMap[key]?.domain ?? ''

    // Step 3: Add / Save — REQ-BA-FE-F-121
    const handleAdd = () => {
        const config: BordereauConfig = {
            id:        editConfig?.id ?? generateId(),
            name:      name.trim(),
            type,
            dataStyle,
            fields:    fieldOrder,
            createdAt: editConfig?.createdAt ?? new Date().toISOString().slice(0, 10),
        }
        onSaved?.(config)
        onClose?.()
    }

    if (!isOpen) return null

    const stepIndex  = STEPS.findIndex(s => s.key === step)
    const isEdit     = !!editConfig
    const previewRow = ILLUSTRATIVE[type] ?? {}

    return (
        <div
            data-testid="bordereau-config-modal"
            className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40"
        >
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[900px] mx-8 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? 'Edit Bordereau' : 'Add Bordereau'}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1 px-6 py-3 border-b bg-gray-50 text-sm">
                    {STEPS.map((s, i) => (
                        <span key={s.key} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-300 mx-1">›</span>}
                            <span className={i <= stepIndex ? 'text-brand-600 font-medium' : 'text-gray-400'}>
                                {i + 1}. {s.label}
                            </span>
                        </span>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* ── Step 1: Setup ── REQ-BA-FE-F-118 */}
                    {step === 'setup' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="bord-name" className="text-sm font-medium text-gray-700">
                                    Bordereau Name <span aria-hidden="true" className="text-red-500">*</span>
                                </label>
                                <input
                                    id="bord-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Q1 2025 Risk Bordereau"
                                    className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                                    autoFocus
                                />
                            </div>

                            <FieldGroup title="Bordereau Type">
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {TYPE_OPTIONS.map(opt => (
                                        <label
                                            key={opt.value}
                                            className="flex items-start gap-2 p-3 rounded border border-gray-200 hover:border-brand-400 cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="bord-type"
                                                value={opt.value}
                                                aria-label={opt.label}
                                                checked={type === opt.value}
                                                onChange={() => handleTypeChange(opt.value)}
                                                className="mt-0.5 shrink-0"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </FieldGroup>

                            <FieldGroup title="Data Style">
                                <div className="flex flex-wrap gap-6 mt-1">
                                    {DATA_STYLE_OPTIONS.map(opt => (
                                        <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bord-datastyle"
                                                value={opt.value}
                                                aria-label={opt.label}
                                                checked={dataStyle === opt.value}
                                                onChange={() => setDataStyle(opt.value)}
                                                className="mt-0.5 shrink-0"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </FieldGroup>
                        </>
                    )}

                    {/* ── Step 2: Field Selection (dual-pane) ── REQ-BA-FE-F-119 + F-120 */}
                    {step === 'fields' && (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-700">Field Selection</p>
                            <div className="flex gap-0 border border-gray-200 rounded overflow-hidden" style={{ height: '380px' }}>

                                {/* ── Left pane: Available Fields ── */}
                                <div className="flex flex-col w-1/2 border-r border-gray-200">
                                    {/* Available header + search */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            Available Fields
                                        </span>
                                    </div>
                                    <div className="px-3 py-2 border-b border-gray-100 shrink-0">
                                        <div className="relative">
                                            <FiSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder="Search fields or domain..."
                                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-white"
                                                aria-label="Search fields"
                                            />
                                        </div>
                                    </div>
                                    {/* Column header */}
                                    <div className="grid grid-cols-[1fr_100px_32px] px-3 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
                                        <span className="text-xs font-semibold text-gray-600">Field</span>
                                        <span className="text-xs font-semibold text-gray-600">Domain</span>
                                        <span />
                                    </div>
                                    {/* Scrollable rows */}
                                    <div className="overflow-y-auto flex-1">
                                        {available.length === 0 ? (
                                            <p className="px-3 py-4 text-xs text-gray-400 text-center">
                                                {search ? 'No fields match your search.' : 'All fields selected.'}
                                            </p>
                                        ) : (
                                            available.map(a => (
                                                <div
                                                    key={a.key}
                                                    className="grid grid-cols-[1fr_100px_32px] items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-50"
                                                >
                                                    <span className="text-xs text-gray-800 truncate pr-2">{a.label}</span>
                                                    <span className="text-xs text-gray-500 truncate">{a.domain}</span>
                                                    <button
                                                        type="button"
                                                        aria-label={`Add ${a.label}`}
                                                        onClick={() => addField(a.key)}
                                                        className="text-brand-500 hover:text-brand-700 flex items-center justify-center"
                                                    >
                                                        <FiPlus size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* ── Right pane: Selected Fields ── */}
                                <div className="flex flex-col w-1/2">
                                    {/* Selected header */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            Selected Fields ({fieldOrder.length})
                                        </span>
                                    </div>
                                    {/* Column header */}
                                    <div className="grid grid-cols-[24px_1fr_80px_72px] px-3 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
                                        <span className="text-xs font-semibold text-gray-600">#</span>
                                        <span className="text-xs font-semibold text-gray-600">Field</span>
                                        <span className="text-xs font-semibold text-gray-600">Domain</span>
                                        <span className="text-xs font-semibold text-gray-600 text-center">Order</span>
                                    </div>
                                    {/* Scrollable rows */}
                                    <div className="overflow-y-auto flex-1">
                                        {fieldOrder.length === 0 ? (
                                            <p className="px-3 py-4 text-xs text-gray-400 text-center">
                                                Add fields from the left panel.
                                            </p>
                                        ) : (
                                            fieldOrder.map((key, i) => (
                                                <div
                                                    key={key}
                                                    className="grid grid-cols-[24px_1fr_80px_72px] items-center px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50"
                                                >
                                                    <span className="text-xs text-gray-400">{i + 1}</span>
                                                    <span className="text-xs text-gray-800 truncate pr-1">{labelFor(key)}</span>
                                                    <span className="text-xs text-gray-500 truncate">{domainFor(key)}</span>
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button
                                                            type="button"
                                                            aria-label={`Move ${labelFor(key)} up`}
                                                            disabled={i === 0}
                                                            onClick={() => moveUp(i)}
                                                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                                                        >
                                                            <FiChevronUp size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label={`Move ${labelFor(key)} down`}
                                                            disabled={i === fieldOrder.length - 1}
                                                            onClick={() => moveDown(i)}
                                                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                                                        >
                                                            <FiChevronDown size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${labelFor(key)}`}
                                                            disabled={!!mandatory.has(key)}
                                                            onClick={() => removeField(key)}
                                                            className="p-0.5 text-gray-300 hover:text-red-500 disabled:opacity-25"
                                                        >
                                                            <FiX size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Preview ── REQ-BA-FE-F-121 */}
                    {step === 'preview' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500">
                                Illustrative preview — real data will be shown when generating reports if available.
                            </p>
                            <div className="overflow-x-auto rounded border border-gray-200">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {fieldOrder.map(key => (
                                                <th
                                                    key={key}
                                                    scope="col"
                                                    className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                                                >
                                                    {labelFor(key)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-gray-100">
                                            {fieldOrder.map(key => (
                                                <td key={key} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                    {previewRow[key] ?? '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    {step === 'setup' ? (
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStep(STEPS[stepIndex - 1].key)}
                        >
                            Back
                        </button>
                    )}

                    {step !== 'preview' ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={step === 'setup' && name.trim() === ''}
                            onClick={() => setStep(STEPS[stepIndex + 1].key)}
                        >
                            Next
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={handleAdd}>
                            {isEdit ? 'Save' : 'Add'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}
