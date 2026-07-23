/**
 * BAViewPage — REQ-BA-FE-F-016 to F-071
 *
 * 7-tab view: Sections | Financial Summary | Transactions |
 *             GPI Monitoring | Policies | Claims | Audit
 *
 * Header shows BA details with full field set matching backup;
 * locked banner when not Draft.
 * Registers sidebar section via useSidebarSection (REQ-BA-FE-F-020).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX, FiSearch, FiSave, FiCheckCircle, FiEdit2, FiArrowLeft, FiFileText, FiUsers, FiRepeat, FiUploadCloud, FiSettings, FiTrash2, FiPlay } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import { useAudit } from '@/shared/lib/hooks/useAudit'
import { post } from '@/shared/lib/api-client/api-client'
import { buildAuditDiff } from '@/shared/lib/audit/buildAuditDiff'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import CoverholderSearchModal from '../CoverholderSearchModal/CoverholderSearchModal'
import BordereauImportModal from '../BordereauImportModal/BordereauImportModal'
import BordereauCreateModal from '../BordereauCreateModal/BordereauCreateModal'
import BordereauConfigModal, { type BordereauConfig } from '../BordereauConfigModal/BordereauConfigModal'
import {
    getBindingAuthority,
    getClassesOfBusiness,
    getCurrencies,
    updateBindingAuthority,
    getBASections,
    createBASection,
    deleteBASection,
    getBATransactions,
    getPoliciesForBA,
    getBordereauConfigs,
    createBordereauConfig,
    updateBordereauConfig,
    deleteBordereauConfig,
    type BindingAuthority,
    type BAStatus,
    type BASection,
    type BATransaction,
    type CreateBASectionInput,
    type ClassOfBusiness,
} from '../binding-authorities.service'

const STATUS_CLASSES: Record<BAStatus, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

const BORD_TYPE_LABELS: Record<string, string> = {
    Risk: 'Risk', Claims: 'Claims', Paid: 'Paid',
    ELTO: 'ELTO', PoolRe: 'Pool Re Terrorism', Aggregation: 'Aggregation',
}

type Tab = 'sections' | 'financial' | 'transactions' | 'gpi' | 'policies' | 'claims' | 'bordeaux' | 'audit'

const TABS: { key: Tab; label: string }[] = [
    { key: 'sections',     label: 'Sections' },
    { key: 'financial',    label: 'Financial Summary' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'gpi',          label: 'GPI Monitoring' },
    { key: 'policies',     label: 'Policies' },
    { key: 'claims',       label: 'Claims' },
    { key: 'bordeaux',     label: 'Bordereaux' },
    { key: 'audit',        label: 'Audit' },
]

const MINIMUM_SECTION_FIELDS_ERROR = 'Minimum fields for binding authority section have not been met. Please processed minimum fields before proceeding.'
const TIME_BASIS_OPTIONS = ['Claims-Made', 'Occurrence', 'Manifest']

// REQ-BA-FE-F-148 — field labels for BA Updated audit diff
const BA_FIELD_LABELS: Record<string, string> = {
    coverholder: 'Coverholder',
    inception_date: 'Inception Date',
    expiry_date: 'Expiry Date',
    year_of_account: 'Year of Account',
    multi_year: 'Multi-Year',
}

function getNextDraftSectionReference(baseReference: string | null | undefined, sectionList: BASection[]) {
    if (!baseReference) return ''
    const pattern = new RegExp(`^${baseReference.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}-S(\\d+)$`)
    const highestSeq = sectionList.reduce((max, section) => {
        const match = pattern.exec(section.reference ?? '')
        if (!match) return max
        return Math.max(max, parseInt(match[1], 10))
    }, 0)
    const fallbackSeq = sectionList.length
    return `${baseReference}-S${String(Math.max(highestSeq, fallbackSeq) + 1).padStart(2, '0')}`
}

const labelClass = 'text-xs text-gray-400'
const valClass = 'text-sm font-medium text-gray-900 mt-0.5'
const inputClass = 'border border-gray-300 rounded px-3 py-2 text-sm w-full'

export default function BAViewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('sections')
    const [, setSaving] = useState(false)

    // Editable header fields (REQ-BA-FE-F-017, F-027, F-028, F-029)
    const [inceptionTime, setInceptionTime] = useState('00:00:00')
    const [expiryTime, setExpiryTime] = useState('23:59:59')
    const [multiYear, setMultiYear] = useState(false)
    const [renewalDate, setRenewalDate] = useState('')
    const [renewalTime, setRenewalTime] = useState('00:00:00')
    const [renewalStatus, setRenewalStatus] = useState('')
    const [coverholderModalOpen, setCoverholderModalOpen] = useState(false)
    const [bordereauImportOpen, setBordereauImportOpen]   = useState(false)
    const [bordereauCreateOpen, setBordereauCreateOpen]   = useState(false)
    const [bordereauConfigOpen, setBordereauConfigOpen]   = useState(false)
    const [editingBordereauConfig, setEditingBordereauConfig] = useState<BordereauConfig | null>(null)
    const [bordeaux, setBordereaux] = useState<BordereauConfig[]>([])
    const [classesOfBusiness, setClassesOfBusiness] = useState<ClassOfBusiness[]>([])
    const [currencies, setCurrencies] = useState<string[]>([])

    // Sections
    const [sections, setSections] = useState<BASection[]>([])
    const [sectionsLoaded, setSectionsLoaded] = useState(false)
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [nextTempSectionId, setNextTempSectionId] = useState(-1)

    // Transactions
    const [transactions, setTransactions] = useState<BATransaction[]>([])
    const [txLoaded, setTxLoaded] = useState(false)
    const [txSort, setTxSort] = useState<SortConfig>({ key: 'effective_date', direction: 'asc' })

    // Bordereaux sort
    const [bordereauSort, setBordereauSort] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    // Policies
    const [policies, setPolicies] = useState<unknown[]>([])
    const [policiesLoaded, setPoliciesLoaded] = useState(false)

    const baId = parseInt(id ?? '0', 10)

    // Audit (REQ-BA-FE-F-069–F-071)
    const { audit, loading: auditLoading, error: auditError, getAudit } = useAudit({
        entityType: 'Binding Authority',
        entityId: baId || null,
        apiBase: '/api/binding-authorities',
        trackVisits: true,
    })
    const [auditFetched, setAuditFetched] = useState(false)

    // Sidebar section (REQ-BA-FE-F-020)
    const isDraft = ba?.status === 'Draft'
    const canManageDraftSections = ba?.status === 'Draft' || ba?.status === 'Active'

    function createDraftSection(tempId = nextTempSectionId, reference = ''): BASection {
        return {
            id: tempId,
            binding_authority_id: baId,
            reference,
            class_of_business: '',
            class_of_business_code: '',
            time_basis: '',
            inception_date: '',
            expiry_date: '',
            days_on_cover: null,
            line_size: null,
            written_premium_limit: null,
            currency: 'GBP',
        }
    }

    function hasMinimumSectionFields(sectionList: BASection[]) {
        return sectionList.some((section) => (section.class_of_business ?? '').trim().length > 0)
    }
    const sidebarSection = useMemo(() => ({
        title: 'Binding Authority',
        items: [
            ...(isDraft ? [{ label: 'Save', icon: FiSave, event: 'ba:save' }] : []),
            ...(isDraft ? [{ label: 'Issue Binding Authority', icon: FiCheckCircle, event: 'ba:issue' }] : []),
            ...(ba?.status === 'Active' ? [{ label: 'Endorse Binding Authority', icon: FiEdit2, to: `/binding-authorities/endorse/${baId}` }] : []),
            { label: 'Import Bordereaux', icon: FiUploadCloud, event: 'ba:import-bordereaux' },
            ...(isDraft ? [{ label: 'Configure Bordereau', icon: FiSettings, event: 'ba:configure-bordereau' }] : []),
            { label: 'Documents', icon: FiFileText, to: `/binding-authorities/${baId}/documents` },
            { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
            { label: 'Renew Binding Authority', icon: FiRepeat, event: 'ba:renew' },
            ...(ba?.submission_id ? [{ label: 'Back to Submission', icon: FiArrowLeft, to: `/submissions/${ba.submission_id}` }] : []),
        ],
    }), [isDraft, ba?.status, ba?.submission_id, baId])
    useSidebarSection(sidebarSection)

    useEffect(() => {
        if (!baId) return
        setLoading(true)
        Promise.all([
            getBindingAuthority(baId),
            getBASections(baId),
        ])
            .then(([baData, sectData]) => {
                setBa(baData)
                setSections(sectData.length > 0 ? sectData : (baData.status === 'Draft' ? [createDraftSection(-1, getNextDraftSectionReference(baData.reference, []))] : []))
                setNextTempSectionId(-2)
                setSectionsLoaded(true)
                // Populate extra fields from BA payload
                setMultiYear(!!baData.multi_year)
                // Load bordereau configs non-critically so a missing table (migration 112
                // not yet applied) does not block the page from rendering.
                getBordereauConfigs(baId)
                    .then(bordereauData => {
                        setBordereaux(bordereauData.map(c => ({
                            id: c.config_id,
                            name: c.name,
                            type: c.type,
                            dataStyle: c.data_style,
                            fields: c.fields,
                            createdAt: typeof c.created_at === 'string' ? c.created_at.slice(0, 10) : new Date(c.created_at).toISOString().slice(0, 10),
                        })))
                    })
                    .catch(() => { /* bordereau configs are non-critical; ignore failure */ })
                getClassesOfBusiness()
                    .then((items) => setClassesOfBusiness(items ?? []))
                    .catch(() => setClassesOfBusiness([]))
                getCurrencies()
                    .then((items) => setCurrencies(items ?? []))
                    .catch(() => setCurrencies([]))
            })
            .catch(() => addNotification('Could not load binding authority.', 'error'))
            .finally(() => setLoading(false))
    }, [baId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!baId || !ba || ba.status === 'Draft' || txLoaded) return
        getBATransactions(baId)
            .then((data) => { setTransactions(data); setTxLoaded(true) })
            .catch(() => addNotification('Could not load transactions.', 'error'))
    }, [baId, ba, txLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for sidebar events
    useEffect(() => {
        const handleSave = () => handleSaveBA()
        const handleIssue = () => handleIssueBA()
        const handleRenew = () => navigate('/binding-authorities/new')
        const handleImportBordereaux = () => setBordereauImportOpen(true)
        const handleConfigBordereaux = () => { setEditingBordereauConfig(null); setBordereauConfigOpen(true) }
        window.addEventListener('ba:save', handleSave)
        window.addEventListener('ba:issue', handleIssue)
        window.addEventListener('ba:renew', handleRenew)
        window.addEventListener('ba:import-bordereaux', handleImportBordereaux)
        window.addEventListener('ba:configure-bordereau', handleConfigBordereaux)
        return () => {
            window.removeEventListener('ba:save', handleSave)
            window.removeEventListener('ba:issue', handleIssue)
            window.removeEventListener('ba:renew', handleRenew)
            window.removeEventListener('ba:import-bordereaux', handleImportBordereaux)
            window.removeEventListener('ba:configure-bordereau', handleConfigBordereaux)
        }
    }) // intentionally no deps — always latest handlers

    // Lazy-load transactions when tab is activated
    useEffect(() => {
        if (activeTab === 'transactions' && !txLoaded && baId) {
            getBATransactions(baId)
                .then((data) => { setTransactions(data); setTxLoaded(true) })
                .catch(() => addNotification('Could not load transactions.', 'error'))
        }
        if (activeTab === 'policies' && !policiesLoaded && baId) {
            getPoliciesForBA(baId)
                .then((data) => { setPolicies(data); setPoliciesLoaded(true) })
                .catch(() => addNotification('Could not load policies.', 'error'))
        }
        if (activeTab === 'audit' && !auditFetched) {
            getAudit()
            setAuditFetched(true)
        }
    }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleSaveBA() {
        if (!ba) return
        setSaving(true)
        const prevBa: Record<string, unknown> = { ...ba }
        try {
            const updated = await updateBindingAuthority(baId, {
                ...ba,
                multi_year: multiYear,
            })
            setBa(updated)
            // Persist any unsaved draft sections so they get real DB references
            const draftRows = sections.filter((s) => s.id < 0)
            if (draftRows.length > 0) {
                const created = await Promise.all(
                    draftRows.map((s) =>
                        createBASection(baId, {
                            class_of_business: s.class_of_business ?? undefined,
                            class_of_business_code: s.class_of_business_code ?? undefined,
                            time_basis: s.time_basis ?? undefined,
                            inception_date: s.inception_date ?? undefined,
                            expiry_date: s.expiry_date ?? undefined,
                            line_size: s.line_size ?? undefined,
                            written_premium_limit: s.written_premium_limit ?? undefined,
                            currency: s.currency ?? undefined,
                        })
                    )
                )
                setSections((prev) => [...created, ...prev.filter((s) => s.id >= 0)])
            }
            addNotification('Binding authority saved.', 'success')
            // REQ-BA-FE-F-148 — best-effort audit event on save with field diff
            const _nextBa = updated as unknown as Record<string, unknown>
            const _nextBaWithMultiYear = { ..._nextBa, multi_year: multiYear }
            const _diffDesc = buildAuditDiff(prevBa, _nextBaWithMultiYear, BA_FIELD_LABELS)
            post(`/api/binding-authorities/${baId}/audit`, {
                action: 'BA Updated',
                details: _diffDesc ? { description: _diffDesc } : {},
            }).catch(() => undefined)
        } catch {
            addNotification('Could not save binding authority.', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(status: BAStatus) {
        if (!ba) return
        const oldStatus = ba.status
        setSaving(true)
        try {
            const updated = await updateBindingAuthority(baId, { status })
            setBa(updated)
            addNotification('Status updated.', 'success')
            // REQ-BA-FE-F-149 — best-effort BA status-change audit
            post(`/api/binding-authorities/${baId}/audit`, {
                action: 'BA Status Changed',
                details: { description: `Status: ${oldStatus} → ${status}` },
            }).catch(() => undefined)
        } catch {
            addNotification('Could not update status.', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ── Bordeaux configuration handlers — REQ-BA-FE-F-122 ──────────────────
    async function handleBordereauSaved(config: BordereauConfig) {
        try {
            const isEdit = bordeaux.some(c => c.id === config.id)
            if (isEdit) {
                const updated = await updateBordereauConfig(baId, config.id, {
                    name: config.name,
                    type: config.type,
                    data_style: config.dataStyle,
                    fields: config.fields,
                })
                setBordereaux(prev => prev.map(c => c.id === config.id ? {
                    id: updated.config_id,
                    name: updated.name,
                    type: updated.type,
                    dataStyle: updated.data_style,
                    fields: updated.fields,
                    createdAt: typeof updated.created_at === 'string' ? updated.created_at.slice(0, 10) : new Date(updated.created_at).toISOString().slice(0, 10),
                } : c))
            } else {
                const created = await createBordereauConfig(baId, {
                    config_id: config.id,
                    name: config.name,
                    type: config.type,
                    data_style: config.dataStyle,
                    fields: config.fields,
                })
                setBordereaux(prev => [...prev, {
                    id: created.config_id,
                    name: created.name,
                    type: created.type,
                    dataStyle: created.data_style,
                    fields: created.fields,
                    createdAt: typeof created.created_at === 'string' ? created.created_at.slice(0, 10) : new Date(created.created_at).toISOString().slice(0, 10),
                }])
            }
        } catch {
            addNotification('Could not save bordereau configuration.', 'error')
        }
    }

    async function handleDeleteBordereauConfig(configId: string) {
        try {
            await deleteBordereauConfig(baId, configId)
            setBordereaux(prev => prev.filter(c => c.id !== configId))
        } catch {
            addNotification('Could not delete bordereau configuration.', 'error')
        }
    }

    async function handleIssueBA() {
        if (!hasMinimumSectionFields(sections)) {
            addNotification(MINIMUM_SECTION_FIELDS_ERROR, 'error')
            return
        }

        const draftSections = sections.filter((section) => section.id < 0)
        try {
            if (draftSections.length > 0) {
                const createdSections = await Promise.all(
                    draftSections.map((section) => createBASection(baId, {
                        class_of_business: section.class_of_business ?? '',
                        time_basis: section.time_basis ?? '',
                        inception_date: section.inception_date ?? '',
                        expiry_date: section.expiry_date ?? '',
                        line_size: section.line_size ?? undefined,
                        written_premium_limit: section.written_premium_limit ?? undefined,
                        currency: section.currency ?? 'GBP',
                    }))
                )
                setSections((prev) => [...createdSections, ...prev.filter((section) => section.id >= 0)])
            }
            await handleStatusChange('Active')
        } catch {
            addNotification('Could not create section.', 'error')
        }
    }

    function handleCoverholderSelect(party: { id: number; name: string }) {
        if (!ba) return
        setBa({ ...ba, coverholder: party.name, coverholder_id: party.id })
    }

    async function handleDeleteSection(sectionId: number) {
        if (!confirm('Delete this section?')) return
        try {
            await deleteBASection(sectionId)
            setSections((prev) => prev.filter((s) => s.id !== sectionId))
            addNotification('Section deleted.', 'success')
        } catch {
            addNotification('Could not delete section.', 'error')
        }
    }

    // ── Sections ResizableGrid config ────────────────────────────────────────
    const SECTION_COLUMNS: Column[] = [
        { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 140 },
        { key: 'class_of_business_code', label: 'CoB Code', sortable: true, defaultWidth: 90 },
        { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 160 },
        { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
        { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 120 },
        { key: 'time_basis', label: 'Time Basis', sortable: true, defaultWidth: 110 },
        { key: 'days_on_cover', label: 'Max Period of Insurance (days)', sortable: true, defaultWidth: 180 },
        { key: 'currency', label: 'Settlement Premium Currency', sortable: true, defaultWidth: 160 },
        { key: 'written_premium_limit', label: 'Gross Premium Income Limit', sortable: true, defaultWidth: 160 },
        {
            key: '_action', label: (
                canManageDraftSections ? (
                    <button
                        type="button"
                        title="Add Section"
                        aria-label="Add Section"
                        className="text-brand-600 hover:text-brand-800"
                        onClick={() => {
                            setSections((prev) => [createDraftSection(nextTempSectionId, getNextDraftSectionReference(ba?.reference, prev)), ...prev])
                            setNextTempSectionId((prev) => prev - 1)
                        }}
                    >
                        <FiPlus size={14} />
                    </button>
                ) : null
            ) as React.ReactNode,
            sortable: false, defaultWidth: 64,
        },
    ]

    function handleSectionSort(key: string) {
        setSectionSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    const draftSections = sections.filter((section) => section.id < 0)
    const persistedSections = sections.filter((section) => section.id >= 0)
    const sortedSections = [...persistedSections].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sectionSort.key] ?? ''
        const bv = (b as unknown as Record<string, unknown>)[sectionSort.key] ?? ''
        if (av < bv) return sectionSort.direction === 'asc' ? -1 : 1
        if (av > bv) return sectionSort.direction === 'asc' ? 1 : -1
        return 0
    })

    const displayedSections = [...draftSections, ...sortedSections]

    function updateDraftSection(sectionId: number, patch: Partial<CreateBASectionInput>) {
        setSections((prev) => prev.map((section) => section.id === sectionId ? { ...section, ...patch } : section))
    }

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const sec = row as BASection
        if (sec.id < 0) {
            if (key === 'reference') return <span className="text-sm font-medium text-gray-700">{sec.reference || 'New Section'}</span>
            if (key === 'class_of_business_code') return <span className="text-sm text-gray-500">{sec.class_of_business_code || '—'}</span>
            if (key === 'class_of_business') {
                return (
                    <input
                        type="text"
                        list="ba-class-of-business-options"
                        placeholder="Class of Business"
                        value={sec.class_of_business ?? ''}
                        onChange={(e) => {
                            const name = e.target.value
                            const cob = classesOfBusiness.find(c => c.name.toLowerCase() === name.toLowerCase().trim())
                            updateDraftSection(sec.id, { class_of_business: name, class_of_business_code: cob?.code ?? '' })
                        }}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'inception_date') {
                return (
                    <input
                        type="date"
                        value={sec.inception_date ?? ''}
                        onChange={(e) => updateDraftSection(sec.id, { inception_date: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'expiry_date') {
                return (
                    <input
                        type="date"
                        value={sec.expiry_date ?? ''}
                        onChange={(e) => updateDraftSection(sec.id, { expiry_date: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'time_basis') {
                return (
                    <input
                        type="text"
                        list="ba-time-basis-options"
                        placeholder="Time basis"
                        value={sec.time_basis ?? ''}
                        onChange={(e) => updateDraftSection(sec.id, { time_basis: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'currency') {
                return (
                    <input
                        type="text"
                        list="ba-currency-options"
                        placeholder="Currency"
                        value={sec.currency ?? ''}
                        onChange={(e) => updateDraftSection(sec.id, { currency: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'written_premium_limit') {
                return (
                    <input
                        type="number"
                        placeholder="0"
                        value={sec.written_premium_limit ?? ''}
                        onChange={(e) => updateDraftSection(sec.id, {
                            written_premium_limit: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'days_on_cover') return '—'
            if (key === '_action') {
                return (
                    <button
                        type="button"
                        title="Remove draft section"
                        aria-label="Remove draft section"
                        onClick={() => setSections((prev) => prev.filter((section) => section.id !== sec.id))}
                        className="text-gray-300 hover:text-red-500"
                    >
                        <FiX size={14} />
                    </button>
                )
            }
            return '—'
        }
        if (key === 'reference') {
            return (
                <Link
                    to={`/binding-authorities/${baId}/sections/${sec.id}`}
                    className="font-medium text-brand-600 hover:underline"
                >
                    {sec.reference}
                </Link>
            )
        }
        if (key === '_action') {
            return (
                <span className="flex items-center gap-1">
                    <Link
                        to={`/binding-authorities/${baId}/sections/${sec.id}`}
                        title="Open section"
                        aria-label="Open section"
                        className="text-gray-400 hover:text-brand-600"
                    >
                        <FiSearch size={14} />
                    </Link>
                    {isDraft && (
                        <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            aria-label="Delete section"
                            className="text-gray-300 hover:text-red-500"
                        >
                            <FiX size={14} />
                        </button>
                    )}
                </span>
            )
        }
        if (key === 'days_on_cover') return sec.days_on_cover?.toLocaleString() ?? '—'
        if (key === 'written_premium_limit') return sec.written_premium_limit?.toLocaleString() ?? '—'
        return (sec as unknown as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    // ── Transactions ResizableGrid config (REQ-BA-FE-F-139) ──────────────────
    const TX_COLUMNS: Column[] = [
        { key: '_txn_num',       label: 'Txn #',              sortable: false, defaultWidth: 80  },
        { key: 'sequence_number',label: 'Seq #',              sortable: true,  defaultWidth: 70  },
        { key: 'type',           label: 'Type',               sortable: true,  defaultWidth: 150 },
        { key: 'sub_type',       label: 'Sub Type',           sortable: true,  defaultWidth: 160 },
        { key: 'status',         label: 'Transaction Status', sortable: true,  defaultWidth: 140 },
        { key: 'effective_date', label: 'Effective Date',     sortable: true,  defaultWidth: 140 },
        { key: 'created_date',   label: 'Created Date',       sortable: true,  defaultWidth: 140 },
        { key: 'created_by',     label: 'Created By',         sortable: true,  defaultWidth: 160 },
        { key: 'description',    label: 'Description',        sortable: true,  defaultWidth: 200 },
        { key: '_actions',       label: 'Actions',            sortable: false, defaultWidth: 100 },
    ]

    function handleTxSort(key: string) {
        setTxSort(prev =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[txSort.key] ?? ''
        const bv = (b as unknown as Record<string, unknown>)[txSort.key] ?? ''
        if (av < bv) return txSort.direction === 'asc' ? -1 : 1
        if (av > bv) return txSort.direction === 'asc' ? 1 : -1
        return 0
    })

    const transactionNumberById = useMemo(() => {
        const ordered = [...transactions].sort((left, right) => {
            const leftIsInitial = left.type === 'Initial Transaction'
            const rightIsInitial = right.type === 'Initial Transaction'
            if (leftIsInitial && !rightIsInitial) return -1
            if (!leftIsInitial && rightIsInitial) return 1

            const leftTimestamp = left.created_at ?? left.effective_date ?? ''
            const rightTimestamp = right.created_at ?? right.effective_date ?? ''
            if (leftTimestamp < rightTimestamp) return -1
            if (leftTimestamp > rightTimestamp) return 1

            return left.id - right.id
        })

        return new Map(ordered.map((tx, index) => [tx.id, tx.sequence_number ?? index + 1]))
    }, [transactions])

    const hasAppliedEndorsement = useMemo(
        () => transactions.some((tx) =>
            tx.type !== 'Initial Transaction' && ['Bound', 'Issued', 'Active', 'Endorsed'].includes(tx.status ?? ''),
        ),
        [transactions],
    )

    function renderTxCell(key: string, row: unknown, rowIndex: number): React.ReactNode {
        const tx = row as BATransaction
        const txNumber = transactionNumberById.get(tx.id) ?? rowIndex + 1
        if (key === '_txn_num') return txNumber
        if (key === 'sequence_number') return tx.sequence_number != null ? tx.sequence_number : txNumber
        if (key === 'created_date') return (tx as unknown as Record<string, unknown>)['created_at']?.toString() ?? '—'
        if (key === 'status') {
            const TX_STATUS_CLASSES: Record<string, string> = {
                Draft:    'bg-yellow-100 text-yellow-800',
                Issued:   'bg-green-100 text-green-800',
                Active:   'bg-green-100 text-green-800',   // backward-compat
                Endorsed: 'bg-gray-100 text-gray-600',     // backward-compat
                Bound:    'bg-orange-100 text-orange-800', // backward-compat
            }
            const cls = TX_STATUS_CLASSES[tx.status ?? ''] ?? 'bg-gray-100 text-gray-500'
            return (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                    {tx.status ?? '—'}
                </span>
            )
        }
        if (key === '_actions') {
            if (tx.type === 'Initial Transaction' && !hasAppliedEndorsement) return null
            // Draft edits directly. Bound reopens the endorsement page in read-only mode for Issue.
            if (tx.status === 'Draft') {
                return (
                    <button
                        type="button"
                        aria-label="Edit endorsement"
                        title="Edit endorsement (Draft)"
                        className="text-green-600 hover:text-green-800"
                        onClick={() => navigate(`/binding-authorities/${baId}/endorsements/${tx.id}/edit`)}
                    >
                        <FiEdit2 size={14} />
                    </button>
                )
            }
            if (tx.status === 'Bound') {
                return (
                    <button
                        type="button"
                        aria-label="View bound endorsement"
                        title="View bound endorsement"
                        className="text-green-600 hover:text-green-800"
                        onClick={() => navigate(`/binding-authorities/${baId}/endorsements/${tx.id}/edit`)}
                    >
                        <FiEdit2 size={14} />
                    </button>
                )
            }
            return (
                <button
                    type="button"
                    aria-label="View transaction"
                    title="View transaction"
                    className="text-green-600 hover:text-green-800"
                    onClick={() => navigate(`/binding-authorities/${baId}/transactions/${tx.id}`)}
                >
                    <FiSearch size={14} />
                </button>
            )
        }
        return (tx as unknown as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    // ── Bordereaux ResizableGrid config ──────────────────────────────────────
    const BORDEREAU_COLUMNS: Column[] = [
        { key: 'name',      label: 'Name',       sortable: true,  defaultWidth: 220 },
        { key: 'type',      label: 'Type',       sortable: true,  defaultWidth: 150 },
        { key: 'dataStyle', label: 'Data Style', sortable: true,  defaultWidth: 120 },
        { key: 'fields',    label: 'Fields',     sortable: false, defaultWidth: 70  },
        { key: 'createdAt', label: 'Created',    sortable: true,  defaultWidth: 110 },
        { key: '_actions',  label: '',           sortable: false, defaultWidth: 140 },
    ]

    function handleBordereauSort(key: string) {
        setBordereauSort(prev =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    const sortedBordereaux = [...bordeaux].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[bordereauSort.key] ?? ''
        const bv = (b as unknown as Record<string, unknown>)[bordereauSort.key] ?? ''
        if (av < bv) return bordereauSort.direction === 'asc' ? -1 : 1
        if (av > bv) return bordereauSort.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderBordereauCell(key: string, row: unknown): React.ReactNode {
        const cfg = row as BordereauConfig
        if (key === 'type') return BORD_TYPE_LABELS[cfg.type] ?? cfg.type
        if (key === 'fields') return cfg.fields.length
        if (key === '_actions') {
            return (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        aria-label={`Run ${cfg.name}`}
                        title="Run bordereau"
                        className="p-1 text-green-600 hover:text-green-800"
                        onClick={e => { e.stopPropagation(); navigate(`/binding-authorities/${baId}/bordereaux/${cfg.id}/run`, { state: { config: cfg } }) }}
                    >
                        <FiPlay size={14} />
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary text-xs py-0.5 px-2"
                        onClick={e => { e.stopPropagation(); setEditingBordereauConfig(cfg); setBordereauConfigOpen(true) }}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        aria-label={`Delete ${cfg.name}`}
                        className="p-1 text-gray-300 hover:text-red-500"
                        onClick={e => { e.stopPropagation(); handleDeleteBordereauConfig(cfg.id) }}
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>
            )
        }
        return (cfg as unknown as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    if (loading) return <LoadingSpinner />
    if (!ba) return <p className="p-6 text-gray-500">Binding authority not found.</p>

    const isLocked = !isDraft
    const showTransactionsTab = ba.status !== 'Draft' && txLoaded

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold text-gray-900">{ba.reference}</h2>
                    {ba.coverholder && <p className="text-sm text-gray-500">{ba.coverholder}</p>}
                </div>

            </div>

            {/* Details panel — two columns per REQ-BA-FE-F-022 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column — Contract & Reference */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract &amp; Reference</h3>
                        <div>
                            <p className={labelClass}>Reference</p>
                            <p className={valClass}>{ba.reference}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[ba.status]}`}>
                                {ba.status}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Coverholder</p>
                            <div className="flex items-center gap-2">
                                <p className={valClass}>{ba.coverholder ?? '—'}</p>
                                {!isLocked && ba.coverholder && (
                                    <button
                                        type="button"
                                        onClick={() => setBa({ ...ba, coverholder: null, coverholder_id: null })}
                                        title="Clear coverholder"
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <FiX size={14} />
                                    </button>
                                )}
                                {!isLocked && (
                                    <button
                                        type="button"
                                        onClick={() => setCoverholderModalOpen(true)}
                                        title="Search Coverholder"
                                        className="text-gray-500 hover:text-brand-600"
                                    >
                                        <FiSearch size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {ba.submission_id && (
                            <div>
                                <p className={labelClass}>Submission Reference</p>
                                <Link
                                    to={`/submissions/${ba.submission_id}`}
                                    className="text-sm font-medium text-brand-600 hover:underline mt-0.5 block"
                                >
                                    {ba.submission_reference ?? ba.submission_id}
                                </Link>
                            </div>
                        )}
                        <div>
                            <p className={labelClass}>Year of Account</p>
                            {isDraft ? (
                                <input
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    value={ba.year_of_account ?? ''}
                                    onChange={(e) => setBa({ ...ba, year_of_account: parseInt(e.target.value) || null })}
                                    className={`${inputClass} w-32`}
                                />
                            ) : (
                                <p className={valClass}>{ba.year_of_account ?? '—'}</p>
                            )}
                        </div>
                    </div>

                    {/* Right column — Dates */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className={labelClass}>Inception Date</p>
                                {isDraft ? (
                                    <input type="date" value={ba.inception_date ?? ''} onChange={(e) => setBa({ ...ba, inception_date: e.target.value })} className={inputClass} />
                                ) : (
                                    <p className={valClass}>{ba.inception_date ?? '—'}</p>
                                )}
                            </div>
                            <div>
                                <p className={labelClass}>Inception Time</p>
                                {isDraft ? (
                                    <input type="time" step="1" value={inceptionTime} onChange={(e) => setInceptionTime(e.target.value)} className={inputClass} />
                                ) : (
                                    <p className={valClass}>{inceptionTime}</p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className={labelClass}>Expiry Date</p>
                                {isDraft ? (
                                    <input type="date" value={ba.expiry_date ?? ''} onChange={(e) => setBa({ ...ba, expiry_date: e.target.value })} className={inputClass} />
                                ) : (
                                    <p className={valClass}>{ba.expiry_date ?? '—'}</p>
                                )}
                            </div>
                            <div>
                                <p className={labelClass}>Expiry Time</p>
                                {isDraft ? (
                                    <input type="time" step="1" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} className={inputClass} />
                                ) : (
                                    <p className={valClass}>{expiryTime}</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={multiYear}
                                    onChange={(e) => {
                                        setMultiYear(e.target.checked)
                                        if (!e.target.checked) { setRenewalDate(''); setRenewalTime('00:00:00'); setRenewalStatus('') }
                                    }}
                                    disabled={isLocked}
                                    className="rounded border-gray-300"
                                />
                                Multi-Year Contract
                            </label>
                        </div>
                        {multiYear && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className={labelClass}>Renewal Date</p>
                                        {isDraft ? (
                                            <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className={inputClass} />
                                        ) : (
                                            <p className={valClass}>{renewalDate || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className={labelClass}>Renewal Time</p>
                                        {isDraft ? (
                                            <input type="time" step="1" value={renewalTime} onChange={(e) => setRenewalTime(e.target.value)} className={inputClass} />
                                        ) : (
                                            <p className={valClass}>{renewalTime}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className={labelClass}>Renewal Status</p>
                                    {isDraft ? (
                                        <select value={renewalStatus} onChange={(e) => setRenewalStatus(e.target.value)} className={inputClass}>
                                            <option value="">— Select —</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Renewed">Renewed</option>
                                            <option value="Non-Renewed">Non-Renewed</option>
                                            <option value="Lapsed">Lapsed</option>
                                        </select>
                                    ) : (
                                        <p className={valClass}>{renewalStatus || '—'}</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0 overflow-x-auto">
                    {TABS.map((tab) => {
                        if (tab.key === 'transactions' && !showTransactionsTab) return null
                        return (
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
                        )
                    })}
                </nav>
            </div>

            {/* ── Sections tab — ResizableGrid with sort/resize (REQ-BA-FE-F-031) ── */}
            {activeTab === 'sections' && (
                <div className="flex flex-col gap-4">
                    {!sectionsLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <ResizableGrid
                            columns={SECTION_COLUMNS}
                            rows={displayedSections}
                            storageKey="table-widths-ba-sections"
                            sortConfig={sectionSort}
                            onRequestSort={handleSectionSort}
                            renderCell={renderSectionCell}
                            rowKey={(row) => (row as BASection).id}
                            emptyMessage="No sections found."
                            onRowClick={(row) => {
                                const section = row as BASection
                                if (section.id > 0) navigate(`/binding-authorities/${baId}/sections/${section.id}`)
                            }}
                        />
                    )}
                </div>
            )}

            {/* ── Financial Summary tab — REQ-BA-FE-F-041, F-042 ── */}
            {activeTab === 'financial' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {['Gross Premium', 'Net Premium', 'Commission', 'Taxes', 'Fees', 'Total Due'].map((label) => (
                            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                                <p className="text-xs text-gray-400">{label}</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">—</p>
                            </div>
                        ))}
                    </div>
                    <div className="table-wrapper">
                        <table className="app-table">
                            <thead>
                                <tr>
                                    <th>Section Reference</th>
                                    <th>Gross Premium</th>
                                    <th>Net Premium</th>
                                    <th>Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center text-gray-400">No sections — financial data will appear once sections are added.</td></tr>
                                ) : sections.map((sec) => (
                                    <tr key={sec.id}>
                                        <td className="font-medium">{sec.reference}</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Transactions tab — REQ-BA-FE-F-046 to F-050, F-139, F-140 ── */}
            {activeTab === 'transactions' && showTransactionsTab && (
                <div className="flex flex-col gap-4">
                    {!txLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <ResizableGrid
                            columns={TX_COLUMNS}
                            rows={sortedTransactions}
                            storageKey="table-widths-ba-transactions"
                            sortConfig={txSort}
                            onRequestSort={handleTxSort}
                            renderCell={(key, row, rowIndex) => renderTxCell(key, row, rowIndex)}
                            emptyMessage="No transactions found."
                        />
                    )}
                </div>
            )}

            {/* ── GPI Monitoring tab — REQ-BA-FE-F-056 to F-059 ── */}
            {activeTab === 'gpi' && (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="btn btn-secondary inline-flex items-center gap-2 text-sm"
                            onClick={() => setBordereauImportOpen(true)}
                        >
                            <FiUploadCloud size={14} /> Import Bordereaux
                        </button>
                    </div>
                    {sections.filter((s) => s.written_premium_limit).length === 0 ? (
                        <p className="text-sm text-gray-400">No GPI limits configured for this binding authority.</p>
                    ) : (
                        <>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">GPI by Section</h3>
                                <table className="app-table">
                                    <thead>
                                        <tr>
                                            <th>Section</th>
                                            <th>Actual Gross Premium</th>
                                            <th>GPI Limit</th>
                                            <th>Usage %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.filter((s) => s.written_premium_limit).map((sec) => {
                                            const limit = sec.written_premium_limit ?? 0
                                            const actual = 0 // actual from policies — placeholder
                                            const pct = limit > 0 ? (actual / limit) * 100 : 0
                                            const barColor = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'
                                            return (
                                                <tr key={sec.id}>
                                                    <td className="font-medium">{sec.reference}</td>
                                                    <td>{actual.toLocaleString()}</td>
                                                    <td>{limit.toLocaleString()}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                            </div>
                                                            <span className="text-xs">{pct.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Policies tab — REQ-BA-FE-F-061 to F-063 ── */}
            {activeTab === 'policies' && (
                <div className="flex flex-col gap-4">
                    {!policiesLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="table-wrapper">
                            <table className="app-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Insured</th>
                                        <th>Status</th>
                                        <th>Inception Date</th>
                                        <th>Expiry Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(policies as { id: number; reference: string; insured?: string; status?: string; inception_date?: string; expiry_date?: string }[]).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-gray-400">
                                                No policies linked to this binding authority.
                                            </td>
                                        </tr>
                                    ) : (
                                        (policies as { id: number; reference: string; insured?: string; status?: string; inception_date?: string; expiry_date?: string }[]).map((pol) => (
                                            <tr key={pol.id}>
                                                <td>
                                                    <Link to={`/policies/${pol.id}`} className="font-medium text-brand-600 hover:underline">
                                                        {pol.reference}
                                                    </Link>
                                                </td>
                                                <td>{pol.insured ?? '—'}</td>
                                                <td>{pol.status ?? '—'}</td>
                                                <td>{pol.inception_date ?? '—'}</td>
                                                <td>{pol.expiry_date ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Claims tab — REQ-BA-FE-F-066 ── */}
            {activeTab === 'claims' && (
                <div className="table-wrapper">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th>Claim #</th>
                                <th>Status</th>
                                <th>Policy</th>
                                <th>Created Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="text-center text-gray-400">
                                    No claims linked to this binding authority.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Bordereaux tab — REQ-BA-FE-F-122 ── */}
            {activeTab === 'bordeaux' && (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => { setEditingBordereauConfig(null); setBordereauConfigOpen(true) }}
                        >
                            Add Bordereau
                        </button>
                    </div>
                    <ResizableGrid
                        columns={BORDEREAU_COLUMNS}
                        rows={sortedBordereaux}
                        storageKey="table-widths-ba-bordereaux"
                        sortConfig={bordereauSort}
                        onRequestSort={handleBordereauSort}
                        renderCell={renderBordereauCell}
                        rowKey={(row) => (row as BordereauConfig).id}
                        emptyMessage="No bordereau configurations yet. Click 'Add Bordereau' to create one."
                    />
                </div>
            )}

            {/* ── Audit tab — REQ-BA-FE-F-069 to F-070 ── */}
            {activeTab === 'audit' && (
                <AuditTable
                    audit={audit}
                    loading={auditLoading}
                    error={auditError}
                    entityType="Binding Authority"
                    emptyMessage="No audit events recorded."
                />
            )}

            {/* Coverholder Search Modal — REQ-BA-FE-F-024 */}
            <CoverholderSearchModal
                isOpen={coverholderModalOpen}
                onClose={() => setCoverholderModalOpen(false)}
                onSelect={handleCoverholderSelect}
            />

            {/* Bordereaux Import Modal — REQ-BA-FE-F-012 */}
            <BordereauImportModal
                isOpen={bordereauImportOpen}
                onClose={() => setBordereauImportOpen(false)}
                bindingAuthorityId={id}
            />

            {/* Bordereaux Create Modal */}
            <BordereauCreateModal
                isOpen={bordereauCreateOpen}
                onClose={() => setBordereauCreateOpen(false)}
                bindingAuthorityId={id}
            />

            {/* Bordereaux Config Modal — REQ-BA-FE-F-116 to F-122 */}
            <BordereauConfigModal
                isOpen={bordereauConfigOpen}
                onClose={() => { setBordereauConfigOpen(false); setEditingBordereauConfig(null) }}
                bindingAuthorityId={id}
                editConfig={editingBordereauConfig}
                onSaved={handleBordereauSaved}
            />

            <datalist id="ba-class-of-business-options">
                {classesOfBusiness.map((item) => (
                    <option key={item.code} value={item.name} />
                ))}
            </datalist>
            <datalist id="ba-time-basis-options">
                {TIME_BASIS_OPTIONS.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
            <datalist id="ba-currency-options">
                {currencies.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>

            {/* Editable status badge */}
            {ba && (
                <div className="fixed bottom-20 right-4 z-40">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${isDraft ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${isDraft ? 'bg-green-500' : 'bg-amber-400'}`} aria-hidden="true" />
                        <span>{isDraft ? 'Editable' : 'Read-only'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
