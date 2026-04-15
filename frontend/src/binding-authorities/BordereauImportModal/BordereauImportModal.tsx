/**
 * BordereauImportModal — 4-step wizard for importing Risk or Claims bordereaux from CSV/XLSX.
 *
 * Ported from backup: BindingAuthorityBordereauImportModal.jsx
 * REQ-BA-FE-F-012  Import wizard (3–4 step flow)
 * REQ-BA-BE-F-008  POST /api/bordereaux/import
 *
 * Steps:
 *   1. Setup      — select Type / Sub-Type / Data-Type, upload file
 *   2. Mapping    — map spreadsheet headers to model fields (auto-hints + manual)
 *   3. Preview    — review first 5 rows + validation summary
 *   4. Done       — confirmation
 */

import React from 'react'
import { FiX, FiUploadCloud } from 'react-icons/fi'
import { get as apiGet, post as apiPost } from '@/shared/lib/api-client/api-client'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'
import {
    buildNormalizedRow,
    validateRows,
    type ValidationIssue,
} from '@/lib/bordereauValidations'

// ---------------------------------------------------------------------------
// Field target definitions
// ---------------------------------------------------------------------------
const policyTargets = [
    { key: 'policy.reference', label: 'Policy Reference' },
    { key: 'policy.insuredName', label: 'Insured Name' },
    { key: 'policy.inceptionDate', label: 'Inception Date' },
    { key: 'policy.expiryDate', label: 'Expiry Date' },
    { key: 'policy.currency', label: 'Policy Currency' },
    { key: 'policy.grossPremium', label: 'Policy Gross Premium' },
]
const sectionTargets = [
    { key: 'section.reference', label: 'Section Reference' },
    { key: 'section.classOfBusiness', label: 'Class of Business' },
    { key: 'section.premiumCurrency', label: 'Section Premium Currency' },
    { key: 'section.grossPremium', label: 'Section Gross Premium' },
]
const coverageTargets = [
    { key: 'coverage.reference', label: 'Coverage Reference' },
    { key: 'coverage.limitAmount', label: 'Coverage Limit' },
    { key: 'coverage.limitCurrency', label: 'Coverage Limit Currency' },
]
const policyTxnTargets = [
    { key: 'policyTxn.transactionReference', label: 'Policy Transaction Reference' },
    { key: 'policyTxn.transactionType', label: 'Policy Transaction Type' },
    { key: 'policyTxn.effectiveDate', label: 'Policy Transaction Effective Date' },
]
const partyTargets = [
    { key: 'party.reference', label: 'Party Reference' },
    { key: 'party.name', label: 'Party Name' },
]
const partyTypeOptions = ['Insured', 'Broker', 'Underwriter', 'Claimant', 'Other']
const claimTargets = [
    { key: 'claim.reference', label: 'Claim Reference' },
    { key: 'claim.lossDate', label: 'Loss Date' },
    { key: 'claim.status', label: 'Claim Status' },
]
const claimTxnTargets = [
    { key: 'claimTxn.paidAmount', label: 'Paid Amount' },
    { key: 'claimTxn.currency', label: 'Currency' },
    { key: 'claimTxn.transactionDate', label: 'Transaction Date' },
]

const STEP = { Setup: 1, MappingColumns: 2, Preview: 3, Done: 4 } as const
type Step = (typeof STEP)[keyof typeof STEP]
type MainType = 'Risk' | 'Claims'

interface Props {
    isOpen: boolean
    onClose: () => void
    bindingAuthorityId?: string | number
}

// ---------------------------------------------------------------------------
// Validation summary sub-component
// ---------------------------------------------------------------------------
function ValidationSummary({ issues }: { issues: ValidationIssue[] }) {
    if (!issues.length) return <p className="text-xs text-gray-700">No issues detected in sample.</p>
    const top = issues.slice(0, 10)
    return (
        <div className="space-y-1 max-h-40 overflow-auto text-xs">
            {top.map((iss, i) => (
                <div
                    key={i}
                    className={`flex items-start gap-2 rounded border px-2 py-1 ${
                        iss.severity === 'error'
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                    }`}
                >
                    <span className="shrink-0 font-semibold uppercase">{iss.severity}</span>
                    <span className="flex-1">
                        {iss.message}
                        {iss.row ? ` (row ${iss.row})` : iss.policyRef ? ` (policy ${iss.policyRef})` : ''}
                    </span>
                </div>
            ))}
            {issues.length > 10 && (
                <p className="text-[10px] text-gray-500">+{issues.length - 10} more not shown</p>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BordereauImportModal({ isOpen, onClose, bindingAuthorityId }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [step, setStep] = React.useState<Step>(STEP.Setup)
    const [mainType, setMainType] = React.useState<MainType>('Risk')
    const [subType, setSubType] = React.useState('Written')
    const [dataType, setDataType] = React.useState('Transactional')
    const [headers, setHeaders] = React.useState<string[]>([])
    const [rows, setRows] = React.useState<Record<string, unknown>[]>([])
    const [previewRowsBySource, setPreviewRowsBySource] = React.useState<Record<string, unknown>[]>([])
    const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({})
    const [partyTypeMapping, setPartyTypeMapping] = React.useState<Record<string, { partyType: string }>>({})
    const [parsing, setParsing] = React.useState(false)
    const [error, setError] = React.useState('')
    const [usedSavedMapping, setUsedSavedMapping] = React.useState(false)
    const [classesOfBusiness, setClassesOfBusiness] = React.useState<{ name: string }[]>([])
    const [validationIssues, setValidationIssues] = React.useState<ValidationIssue[]>([])

    // Resizable preview columns
    const defaultPreviewWidths = React.useMemo(() => {
        const out: Record<string, number> = {}
        headers.forEach((h) => {
            out[h] = Math.max(100, Math.min(160, 10 * String(h).length))
        })
        return out
    }, [headers])
    const { startResize: startPreviewResize, getWidth: getPreviewWidth } = useResizableColumns({
        storageKey: `ba:${bindingAuthorityId ?? 'unknown'}:import-preview-colwidths`,
        defaultWidths: defaultPreviewWidths,
        minWidth: 90,
    })

    // Reset on close
    React.useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setStep(STEP.Setup)
                setMainType('Risk')
                setSubType('Written')
                setDataType('Transactional')
                setHeaders([])
                setRows([])
                setColumnMapping({})
                setPartyTypeMapping({})
                setParsing(false)
                setError('')
            }, 100)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    // Persistence key
    const storageKey = React.useMemo(
        () => (bindingAuthorityId ? `ba:${bindingAuthorityId}:import:${mainType}:${subType}:${dataType}:mapping` : null),
        [bindingAuthorityId, mainType, subType, dataType],
    )
    const storageKeyMeta = React.useMemo(
        () => (bindingAuthorityId ? `ba:${bindingAuthorityId}:import:${mainType}:${subType}:${dataType}:mappingMeta` : null),
        [bindingAuthorityId, mainType, subType, dataType],
    )

    // Load saved mapping when entering mapping step
    React.useEffect(() => {
        if (!storageKey || step !== STEP.MappingColumns || !headers.length) return
        try {
            const raw = localStorage.getItem(storageKey)
            if (raw) {
                const saved = JSON.parse(raw) as Record<string, string>
                const next: Record<string, string> = {}
                let applied = 0
                for (const [src, target] of Object.entries(saved)) {
                    if (headers.includes(src)) { next[src] = target; applied++ }
                }
                if (applied > 0) { setColumnMapping(next); setUsedSavedMapping(true) }
                else setUsedSavedMapping(false)
            } else {
                setUsedSavedMapping(false)
            }
            if (storageKeyMeta) {
                const rawMeta = localStorage.getItem(storageKeyMeta)
                if (rawMeta) {
                    const savedMeta = JSON.parse(rawMeta) as Record<string, { partyType: string }>
                    const filtered: Record<string, { partyType: string }> = {}
                    for (const [src, meta] of Object.entries(savedMeta)) {
                        if (headers.includes(src) && typeof meta?.partyType === 'string') filtered[src] = { partyType: meta.partyType }
                    }
                    setPartyTypeMapping(filtered)
                }
            }
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, step, headers.join('|')])

    // Persist mapping whenever it changes
    React.useEffect(() => {
        if (!storageKey) return
        try {
            const toSave: Record<string, string> = {}
            for (const [src, target] of Object.entries(columnMapping)) { if (target) toSave[src] = target }
            localStorage.setItem(storageKey, JSON.stringify(toSave))
            if (storageKeyMeta) {
                const toSaveMeta: Record<string, { partyType: string }> = {}
                for (const [src, meta] of Object.entries(partyTypeMapping)) { if (meta?.partyType) toSaveMeta[src] = { partyType: meta.partyType } }
                localStorage.setItem(storageKeyMeta, JSON.stringify(toSaveMeta))
            }
        } catch { /* ignore */ }
    }, [storageKey, storageKeyMeta, columnMapping, partyTypeMapping])

    // Load COB lookup
    React.useEffect(() => {
        let active = true
        apiGet<{ items?: string[] } | string[]>('/api/lookups/classesOfBusiness')
            .then((data) => { if (active) setClassesOfBusiness(Array.isArray(data) ? data : (data as { items?: string[] })?.items ?? []) })
            .catch(() => {})
        return () => { active = false }
    }, [])

    // Re-run validation when entering Preview step or mapping changes
    React.useEffect(() => {
        if (step !== STEP.Preview) return
        const sample = rows.slice(0, 50).map((r) => buildNormalizedRow(r as Record<string, unknown>, columnMapping))
        setValidationIssues(validateRows(sample, { classesOfBusiness }))
    }, [step, rows, columnMapping, classesOfBusiness])

    // ---------------------------------------------------------------------------
    // XLSX loader — uses CDN injection (xlsx is not bundled)
    // Dynamic import via variable string bypasses Vite's static analysis.
    // ---------------------------------------------------------------------------
    async function loadXLSX(): Promise<unknown> {
        const w = window as unknown as { XLSX?: unknown }
        if (w.XLSX) return w.XLSX

        // Inject CDN script once
        await new Promise<void>((resolve, reject) => {
            const id = 'xlsx-cdn-script'
            if (document.getElementById(id)) { resolve(); return }
            const s = document.createElement('script')
            s.id = id
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('Failed to load xlsx from CDN'))
            document.head.appendChild(s)
        })

        if (w.XLSX) return w.XLSX
        throw new Error('Unable to load xlsx parser module')
    }

    // ---------------------------------------------------------------------------
    // File parsing
    // ---------------------------------------------------------------------------
    const onChooseFile = async (file: File | undefined) => {
        if (!file) return
        setParsing(true)
        setError('')
        try {
            const XLSX = await loadXLSX() as {
                read: (data: ArrayBuffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
                utils: {
                    sheet_to_json: <T>(sheet: unknown, opts?: { defval?: string; header?: number; blankrows?: boolean }) => T[]
                }
            }
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0] ?? ''
            if (!sheetName) throw new Error('No sheets found in workbook')
            const sheet = workbook.Sheets[sheetName]

            let json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
            let hdrs = Object.keys(json[0] ?? {})

            // Fallback: if no headers detected, use first row as headers
            if (!hdrs.length) {
                const arr = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
                if (arr.length) {
                    const first = arr[0] as unknown[]
                    const fallbackHeaders = first.map((v, i) => (v ? String(v).trim() : `Column ${i + 1}`))
                    const objRows = arr.slice(1).map((row) => {
                        const o: Record<string, unknown> = {}
                        fallbackHeaders.forEach((h, i) => { o[h] = Array.isArray(row) ? row[i] ?? '' : '' })
                        return o
                    })
                    if (fallbackHeaders.length) { hdrs = fallbackHeaders; json = objRows }
                }
            }

            setHeaders(hdrs)
            setRows(json)
            setPreviewRowsBySource(json.slice(0, 5).map((r) => Object.fromEntries(hdrs.map((h) => [h, r[h] ?? '']))))

            // Auto-map by header name heuristics
            const auto: Record<string, string> = {}
            const lc = (s: string) => s.toLowerCase()
            hdrs.forEach((h) => {
                const l = lc(h)
                if (l.includes('policy') && l.includes('ref'))   auto[h] = 'policy.reference'
                else if (l.includes('insured') && l.includes('name')) auto[h] = 'policy.insuredName'
                else if (l.includes('inception'))                auto[h] = 'policy.inceptionDate'
                else if (l.includes('expiry'))                   auto[h] = 'policy.expiryDate'
                else if (l.includes('currency'))                 auto[h] = mainType === 'Claims' ? 'claimTxn.currency' : 'policy.currency'
                else if (l.includes('gross') && l.includes('premium')) auto[h] = 'section.grossPremium'
                else if (l.includes('section') && l.includes('ref')) auto[h] = 'section.reference'
                else if (l.includes('class'))                    auto[h] = 'section.classOfBusiness'
                else if (l.includes('premium') && l.includes('currency')) auto[h] = 'section.premiumCurrency'
                else if (l.includes('coverage') && l.includes('ref')) auto[h] = 'coverage.reference'
                else if (l.includes('limit'))                    auto[h] = 'coverage.limitAmount'
                else if (l.includes('party') && l.includes('name')) auto[h] = 'party.name'
                else if (l.includes('claim') && l.includes('ref')) auto[h] = 'claim.reference'
                else if (l.includes('loss') && l.includes('date')) auto[h] = 'claim.lossDate'
                else if (l.includes('paid'))                     auto[h] = 'claimTxn.paidAmount'
                else if (l.includes('transaction') && l.includes('date')) auto[h] = 'claimTxn.transactionDate'
            })
            setColumnMapping(auto)
            setStep(STEP.MappingColumns)
        } catch (err) {
            setError((err as Error)?.message ?? 'Failed to parse file')
        } finally {
            setParsing(false)
        }
    }

    // ---------------------------------------------------------------------------
    // Normalised preview rows (first 5, structured by entity)
    // ---------------------------------------------------------------------------
    const normalizedPreview = React.useMemo(() => {
        return rows.slice(0, 5).map((r, idx) => {
            const getVal = (targetKey: string) => {
                const srcHeader = Object.entries(columnMapping).find(([, t]) => t === targetKey)?.[0]
                return srcHeader ? String(r[srcHeader] ?? '') : ''
            }
            const getPartyType = () => {
                const header = Object.entries(columnMapping).find(([, t]) => t === 'party.name')?.[0]
                return header ? (partyTypeMapping[header]?.partyType ?? '') : ''
            }
            if (mainType === 'Claims') {
                return {
                    i: idx + 1,
                    claim: { reference: getVal('claim.reference'), lossDate: getVal('claim.lossDate'), status: getVal('claim.status') },
                    claimTxn: { paidAmount: getVal('claimTxn.paidAmount'), currency: getVal('claimTxn.currency'), transactionDate: getVal('claimTxn.transactionDate') },
                    policy: { reference: getVal('policy.reference'), insuredName: getVal('policy.insuredName') },
                    party: { reference: getVal('party.reference'), name: getVal('party.name'), type: getPartyType() },
                }
            }
            return {
                i: idx + 1,
                policy: {
                    reference: getVal('policy.reference'),
                    insuredName: getVal('policy.insuredName'),
                    inceptionDate: getVal('policy.inceptionDate'),
                    expiryDate: getVal('policy.expiryDate'),
                    currency: getVal('policy.currency'),
                    grossPremium: getVal('policy.grossPremium'),
                    methodOfPlacement: 'Binding Authority Contract with Declarations',
                },
                section: { reference: getVal('section.reference'), classOfBusiness: getVal('section.classOfBusiness'), premiumCurrency: getVal('section.premiumCurrency'), grossPremium: getVal('section.grossPremium') },
                policyTransaction: { transactionReference: getVal('policyTxn.transactionReference'), transactionType: getVal('policyTxn.transactionType'), effectiveDate: getVal('policyTxn.effectiveDate') },
                coverage: { reference: getVal('coverage.reference'), limitAmount: getVal('coverage.limitAmount'), limitCurrency: getVal('coverage.limitCurrency') },
                party: { reference: getVal('party.reference'), name: getVal('party.name'), type: getPartyType() },
            }
        })
    }, [rows, columnMapping, partyTypeMapping, mainType])

    // ---------------------------------------------------------------------------
    // Submit
    // ---------------------------------------------------------------------------
    const onSubmit = async () => {
        try {
            // Compute GPI actuals from entire sheet and emit to localStorage
            try {
                const getSrcFor = (k: string) => Object.entries(columnMapping).find(([, t]) => t === k)?.[0] ?? null
                const secGrossHdr = getSrcFor('section.grossPremium')
                const secRefHdr = getSrcFor('section.reference')
                const polGrossHdr = getSrcFor('policy.grossPremium')
                let totalGross = 0
                const sectionsMap: Record<string, number> = {}
                const parseNum = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n }
                rows.forEach((r) => {
                    if (secGrossHdr && Object.prototype.hasOwnProperty.call(r, secGrossHdr)) {
                        const g = parseNum(r[secGrossHdr]); totalGross += g
                        const sref = secRefHdr && r[secRefHdr] ? String(r[secRefHdr]) : ''
                        if (sref) sectionsMap[sref] = (sectionsMap[sref] ?? 0) + g
                    } else if (polGrossHdr && Object.prototype.hasOwnProperty.call(r, polGrossHdr)) {
                        totalGross += parseNum(r[polGrossHdr])
                    }
                })
                if (bindingAuthorityId) {
                    localStorage.setItem(`ba:${bindingAuthorityId}:gpi:actuals`, JSON.stringify({
                        totalGross, sections: sectionsMap,
                        lastUpdated: new Date().toISOString(),
                        meta: { mainType, subType, dataType },
                    }))
                    window.dispatchEvent(new CustomEvent('ba:gpi-actuals-updated', { detail: { baId: String(bindingAuthorityId) } }))
                }
            } catch { /* ignore GPI calc errors */ }

            await apiPost('/api/bordereaux/import', { type: mainType, subType, dataType, rows: normalizedPreview })
            setStep(STEP.Done)
        } catch (err) {
            setError((err as Error)?.message ?? 'Import failed')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded shadow-lg w-[960px] max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold">Import Bordereaux</h2>
                    <button type="button" className="text-gray-500 hover:text-gray-800" onClick={onClose} aria-label="Close">
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
                    )}

                    {/* ── Step 1: Setup ── */}
                    {step === STEP.Setup && (
                        <div className="space-y-4">
                            <FieldGroup title="Bordereaux Type">
                                <div className="flex gap-4">
                                    {(['Risk', 'Claims'] as MainType[]).map((opt) => (
                                        <label key={opt} className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="bordereauMainType"
                                                value={opt}
                                                checked={mainType === opt}
                                                onChange={() => { setMainType(opt); setSubType(opt === 'Claims' ? 'Paid' : 'Written') }}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </FieldGroup>

                            <FieldGroup title="Bordereaux Sub-Type">
                                <div className="flex gap-4">
                                    {(mainType === 'Claims' ? ['Paid', 'Reported'] : ['Written']).map((opt) => (
                                        <label key={opt} className="inline-flex items-center gap-2 text-sm">
                                            <input type="radio" name="bordereauSubType" value={opt} checked={subType === opt} onChange={() => setSubType(opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </FieldGroup>

                            <FieldGroup title="Bordereaux Data Type">
                                <div className="flex gap-4">
                                    {['Transactional', 'Restating'].map((opt) => (
                                        <label key={opt} className="inline-flex items-center gap-2 text-sm">
                                            <input type="radio" name="bordereauDataType" value={opt} checked={dataType === opt} onChange={() => setDataType(opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </FieldGroup>

                            <FieldGroup title="Upload File (.xlsx, .xls, .csv)">
                                <div className="border-2 border-dashed rounded p-6 text-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => onChooseFile(e.target.files?.[0])}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary inline-flex items-center gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={parsing}
                                    >
                                        <FiUploadCloud /> {parsing ? 'Parsing…' : 'Choose File'}
                                    </button>
                                </div>
                            </FieldGroup>
                        </div>
                    )}

                    {/* ── Step 2: Column Mapping ── */}
                    {step === STEP.MappingColumns && (
                        <div className="space-y-4">
                            <FieldGroup title="Map each column to a field">
                                <div className="grid grid-cols-1 gap-2">
                                    {!headers.length && (
                                        <p className="text-sm text-red-600">No columns detected. Ensure the first row contains column names and re-upload.</p>
                                    )}
                                    {headers.map((h) => {
                                        const mapped = columnMapping[h] ?? ''
                                        const isPartyName = mapped === 'party.name'
                                        const partyMeta = partyTypeMapping[h]?.partyType ?? ''
                                        return (
                                            <div key={h} className="grid grid-cols-[220px,1fr,auto] items-center gap-2 min-w-0">
                                                <span className="text-sm text-gray-700 truncate pr-2" title={h}>{h}</span>
                                                <select
                                                    value={mapped}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setColumnMapping((m) => ({ ...m, [h]: val }))
                                                        if (val !== 'party.name') setPartyTypeMapping((pm) => { const next = { ...pm }; delete next[h]; return next })
                                                    }}
                                                    className={`border rounded px-2 py-1 text-sm h-8 w-full sm:w-[440px] min-w-0 max-w-[440px] ${mapped ? 'border-gray-500 bg-gray-50' : 'border-gray-300'} text-gray-700`}
                                                >
                                                    <option value="">-- Not mapped --</option>
                                                    {mainType === 'Claims' ? (
                                                        <>
                                                            <optgroup label="Claim">{claimTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Claim Transaction">{claimTxnTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Policy Transaction">{policyTxnTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Policy">{policyTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Party">{partyTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <optgroup label="Policy">{policyTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Policy Transaction">{policyTxnTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Policy Section">{sectionTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Policy Coverage (Risk)">{coverageTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                            <optgroup label="Party">{partyTargets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>
                                                        </>
                                                    )}
                                                </select>
                                                {isPartyName && (
                                                    <select
                                                        value={partyMeta}
                                                        onChange={(e) => setPartyTypeMapping((pm) => ({ ...pm, [h]: { partyType: e.target.value } }))}
                                                        className={`border rounded px-2 py-1 text-sm h-8 w-36 ${partyMeta ? 'border-gray-500 bg-gray-50' : 'border-red-400 bg-red-50'} text-gray-700`}
                                                        title="Select Party Type"
                                                    >
                                                        <option value="">-- Party Type --</option>
                                                        {partyTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </FieldGroup>

                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-gray-600">
                                    {usedSavedMapping ? 'Using your last saved mapping for this contract.' : 'Auto-mapped from headers; adjust as needed.'}
                                </p>
                                <button type="button" className="btn btn-secondary" onClick={() => setStep(STEP.Setup)}>Back</button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const missing = Object.entries(columnMapping)
                                            .filter(([, v]) => v === 'party.name')
                                            .some(([src]) => !partyTypeMapping[src]?.partyType)
                                        if (missing) { setError('Please select a Party Type for each column mapped to Party Name.'); return }
                                        setError('')
                                        setStep(STEP.Preview)
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Preview ── */}
                    {step === STEP.Preview && (
                        <div className="space-y-4">
                            <FieldGroup title="Preview (first 5 rows)">
                                <div
                                    className="overflow-x-scroll border rounded w-full max-w-full pb-6 mb-1"
                                    style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable both-edges' } as React.CSSProperties}
                                >
                                    <table className="app-table min-w-full w-max whitespace-nowrap">
                                        <colgroup>
                                            <col style={{ width: '48px' }} />
                                            {headers.map((h) => <col key={h} style={{ width: getPreviewWidth(h) }} />)}
                                        </colgroup>
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="text-gray-700">#</th>
                                                {headers.map((h) => (
                                                    <th key={h} className="text-gray-700 relative select-none">
                                                        <div className="relative pr-2 truncate">
                                                            {h}
                                                            <span
                                                                className="col-resizer"
                                                                onMouseDown={(e) => startPreviewResize(h, e)}
                                                                title="Drag to resize"
                                                            />
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                            <tr>
                                                <th className="text-xs text-gray-500">&nbsp;</th>
                                                {headers.map((h) => (
                                                    <th key={h} className="text-xs text-gray-500 font-normal">{columnMapping[h] ?? '-- Not mapped --'}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRowsBySource.map((r, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    {headers.map((h) => <td key={`${i}-${h}`} className="text-gray-700">{String(r[h] ?? '')}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </FieldGroup>

                            <FieldGroup title="Validation summary (sample)">
                                <ValidationSummary issues={validationIssues} />
                            </FieldGroup>

                            <div className="flex justify-between">
                                <button type="button" className="btn btn-secondary" onClick={() => setStep(STEP.MappingColumns)}>Back</button>
                                <div className="space-x-2">
                                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={onSubmit}>Import</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 4: Done ── */}
                    {step === STEP.Done && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm">
                                Import submitted. Policies, sections, and coverages will be created or matched by reference.
                            </div>
                            <div className="text-right">
                                <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
