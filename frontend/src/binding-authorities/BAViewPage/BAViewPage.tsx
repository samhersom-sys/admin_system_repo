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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX, FiSearch, FiSave, FiCheckCircle, FiEdit2, FiArrowLeft, FiFileText, FiUsers, FiRepeat } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import { useAudit } from '@/shared/lib/hooks/useAudit'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import CoverholderSearchModal from '../CoverholderSearchModal/CoverholderSearchModal'
import {
    getBindingAuthority,
    updateBindingAuthority,
    getBASections,
    createBASection,
    deleteBASection,
    getBATransactions,
    createBATransaction,
    getPoliciesForBA,
    type BindingAuthority,
    type BAStatus,
    type BASection,
    type BATransaction,
    type CreateBASectionInput,
    type CreateBATransactionInput,
} from '../binding-authorities.service'

const STATUS_CLASSES: Record<BAStatus, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

const STATUSES: BAStatus[] = ['Draft', 'Active', 'Bound', 'Expired', 'Cancelled']

type Tab = 'sections' | 'financial' | 'transactions' | 'gpi' | 'policies' | 'claims' | 'audit'

const TABS: { key: Tab; label: string }[] = [
    { key: 'sections', label: 'Sections' },
    { key: 'financial', label: 'Financial Summary' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'gpi', label: 'GPI Monitoring' },
    { key: 'policies', label: 'Policies' },
    { key: 'claims', label: 'Claims' },
    { key: 'audit', label: 'Audit' },
]

const EMPTY_SECTION: CreateBASectionInput = {
    class_of_business: '',
    time_basis: '',
    inception_date: '',
    expiry_date: '',
    line_size: undefined,
    written_premium_limit: undefined,
    currency: 'GBP',
}

const EMPTY_TX: CreateBATransactionInput = {
    type: '',
    amount: 0,
    currency: 'GBP',
    date: '',
    description: '',
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
    const [saving, setSaving] = useState(false)

    // Editable header fields (REQ-BA-FE-F-017, F-027, F-028, F-029)
    const [inceptionTime, setInceptionTime] = useState('00:00:00')
    const [expiryTime, setExpiryTime] = useState('23:59:59')
    const [multiYear, setMultiYear] = useState(false)
    const [renewalDate, setRenewalDate] = useState('')
    const [renewalTime, setRenewalTime] = useState('00:00:00')
    const [renewalStatus, setRenewalStatus] = useState('')
    const [coverholderModalOpen, setCoverholderModalOpen] = useState(false)

    // Sections
    const [sections, setSections] = useState<BASection[]>([])
    const [sectionsLoaded, setSectionsLoaded] = useState(false)
    const [addingSection, setAddingSection] = useState(false)
    const [sectionForm, setSectionForm] = useState<CreateBASectionInput>(EMPTY_SECTION)
    const [savingSection, setSavingSection] = useState(false)

    // Transactions
    const [transactions, setTransactions] = useState<BATransaction[]>([])
    const [txLoaded, setTxLoaded] = useState(false)
    const [showTxModal, setShowTxModal] = useState(false)
    const [txForm, setTxForm] = useState<CreateBATransactionInput>(EMPTY_TX)
    const [savingTx, setSavingTx] = useState(false)

    // Policies
    const [policies, setPolicies] = useState<unknown[]>([])
    const [policiesLoaded, setPoliciesLoaded] = useState(false)

    const baId = parseInt(id ?? '0', 10)

    // Audit (REQ-BA-FE-F-069–F-071)
    const { audit, loading: auditLoading, error: auditError, getAudit } = useAudit({
        entityType: 'BindingAuthority',
        entityId: baId || null,
        apiBase: '/api/binding-authorities',
        trackVisits: true,
    })
    const [auditFetched, setAuditFetched] = useState(false)

    // Sidebar section (REQ-BA-FE-F-020)
    const isDraft = ba?.status === 'Draft'
    const sidebarSection = useMemo(() => ({
        title: 'Binding Authority',
        items: [
            ...(isDraft ? [{ label: 'Save', icon: FiSave, event: 'ba:save' }] : []),
            ...(isDraft ? [{ label: 'Issue BA', icon: FiCheckCircle, event: 'ba:issue' }] : []),
            ...((ba?.status === 'Active' || ba?.status === 'Bound') ? [{ label: 'Create Amendment', icon: FiEdit2, event: 'ba:create-amendment' }] : []),
            { label: 'Documents', icon: FiFileText, to: `/binding-authorities/${baId}/documents` },
            { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
            { label: 'Renew BA Contract', icon: FiRepeat, event: 'ba:renew' },
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
                setSections(sectData)
                setSectionsLoaded(true)
                // Populate extra fields from BA payload
                setMultiYear(!!baData.multi_year)
            })
            .catch(() => addNotification('Could not load binding authority.', 'error'))
            .finally(() => setLoading(false))
    }, [baId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for sidebar events
    useEffect(() => {
        const handleSave = () => handleSaveBA()
        const handleIssue = () => handleIssueBA()
        const handleRenew = () => navigate('/binding-authorities/new')
        window.addEventListener('ba:save', handleSave)
        window.addEventListener('ba:issue', handleIssue)
        window.addEventListener('ba:renew', handleRenew)
        return () => {
            window.removeEventListener('ba:save', handleSave)
            window.removeEventListener('ba:issue', handleIssue)
            window.removeEventListener('ba:renew', handleRenew)
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
        try {
            const updated = await updateBindingAuthority(baId, {
                ...ba,
                multi_year: multiYear,
            })
            setBa(updated)
            addNotification('Binding authority saved.', 'success')
        } catch {
            addNotification('Could not save binding authority.', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(status: BAStatus) {
        if (!ba) return
        setSaving(true)
        try {
            const updated = await updateBindingAuthority(baId, { status })
            setBa(updated)
            addNotification('Status updated.', 'success')
        } catch {
            addNotification('Could not update status.', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleIssueBA() {
        await handleStatusChange('Active')
    }

    function handleCoverholderSelect(party: { id: number; name: string }) {
        if (!ba) return
        setBa({ ...ba, coverholder: party.name, coverholder_id: party.id })
    }

    async function handleAddSection() {
        setSavingSection(true)
        try {
            const created = await createBASection(baId, sectionForm)
            setSections((prev) => [created, ...prev])
            addNotification('Section created.', 'success')
            setAddingSection(false)
            setSectionForm(EMPTY_SECTION)
        } catch {
            addNotification('Could not create section.', 'error')
        } finally {
            setSavingSection(false)
        }
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

    async function handleAddTransaction() {
        setSavingTx(true)
        try {
            const created = await createBATransaction(baId, txForm)
            setTransactions((prev) => [...prev, created])
            addNotification('Transaction added.', 'success')
            setShowTxModal(false)
            setTxForm(EMPTY_TX)
        } catch {
            addNotification('Could not add transaction.', 'error')
        } finally {
            setSavingTx(false)
        }
    }

    if (loading) return <LoadingSpinner />
    if (!ba) return <p className="p-6 text-gray-500">Binding authority not found.</p>

    const isLocked = !isDraft

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Locked banner — REQ-BA-FE-F-030 */}
            {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    This binding authority is <strong>{ba.status}</strong> — changes require an amendment.
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold text-gray-900">{ba.reference}</h2>
                    {ba.coverholder && <p className="text-sm text-gray-500">{ba.coverholder}</p>}
                </div>
                <div className="flex items-center gap-3">
                    {isDraft && (
                        <>
                            <select
                                value={ba.status}
                                onChange={(e) => handleStatusChange(e.target.value as BAStatus)}
                                disabled={saving}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={handleIssueBA}
                                disabled={saving}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                            >
                                Issue BA
                            </button>
                        </>
                    )}
                    {!isDraft && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[ba.status]}`}>
                            {ba.status}
                        </span>
                    )}
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
                            <p className={valClass}>{ba.status}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Coverholder</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={ba.coverholder ?? ''}
                                    readOnly
                                    placeholder="Select coverholder"
                                    className={`${inputClass} ${isLocked ? 'bg-gray-50' : 'bg-white'} pr-10`}
                                />
                                {!isLocked && (
                                    <button
                                        type="button"
                                        onClick={() => setCoverholderModalOpen(true)}
                                        title="Search Coverholder"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-600"
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

            {/* ── Sections tab — table with always-visible headers (REQ-BA-FE-F-031) ── */}
            {activeTab === 'sections' && (
                <div className="flex flex-col gap-4">
                    {!sectionsLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Class of Business</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Time Basis</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Maximum Period of Insurance (days)</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Settlement Premium Currency</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Gross Premium Income Limit</th>
                                        {isDraft && (
                                            <th className="px-4 py-3 font-medium text-gray-600 w-12 text-center">
                                                {!addingSection && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddingSection(true)}
                                                        title="Add Section"
                                                        className="text-brand-600 hover:text-brand-800"
                                                    >
                                                        <FiPlus size={14} />
                                                    </button>
                                                )}
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sections.length === 0 && !addingSection ? (
                                        <tr>
                                            <td colSpan={isDraft ? 9 : 8} className="px-4 py-8 text-center text-gray-400">
                                                No sections found.
                                            </td>
                                        </tr>
                                    ) : (
                                        sections.map((sec) => (
                                            <tr key={sec.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        to={`/binding-authorities/${baId}/sections/${sec.id}`}
                                                        className="font-medium text-brand-600 hover:underline"
                                                    >
                                                        {sec.reference}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">{sec.class_of_business ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.inception_date ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.expiry_date ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.time_basis ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.days_on_cover?.toLocaleString() ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.currency ?? '—'}</td>
                                                <td className="px-4 py-3">{sec.written_premium_limit?.toLocaleString() ?? '—'}</td>
                                                {isDraft && (
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSection(sec.id)}
                                                            className="text-gray-300 hover:text-red-500"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {/* Inline add row — REQ-BA-FE-F-032 (within table, not a button) */}
                                    {isDraft && addingSection && (
                                        <tr className="border-t border-gray-200 bg-brand-50/30">
                                            <td className="px-4 py-2 text-xs text-gray-400 italic">Auto</td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    placeholder="Class of Business"
                                                    value={sectionForm.class_of_business ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, class_of_business: e.target.value }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="date"
                                                    value={sectionForm.inception_date ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, inception_date: e.target.value }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="date"
                                                    value={sectionForm.expiry_date ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, expiry_date: e.target.value }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Annual"
                                                    value={sectionForm.time_basis ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, time_basis: e.target.value }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-400 italic">Computed</td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    placeholder="GBP"
                                                    value={sectionForm.currency ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, currency: e.target.value }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={sectionForm.written_premium_limit ?? ''}
                                                    onChange={(e) => setSectionForm((p) => ({ ...p, written_premium_limit: parseFloat(e.target.value) || undefined }))}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                                                />
                                            </td>
                                            <td className="px-4 py-2 flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handleAddSection}
                                                    disabled={savingSection}
                                                    className="text-brand-600 hover:text-brand-800 disabled:opacity-50"
                                                    title="Save section"
                                                >
                                                    <FiCheckCircle size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddingSection(false); setSectionForm(EMPTY_SECTION) }}
                                                    className="text-gray-400 hover:text-red-500"
                                                    title="Cancel"
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-600">Section Reference</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Gross Premium</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Net Premium</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No sections — financial data will appear once sections are added.</td></tr>
                                ) : sections.map((sec) => (
                                    <tr key={sec.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3 font-medium">{sec.reference}</td>
                                        <td className="px-4 py-3">—</td>
                                        <td className="px-4 py-3">—</td>
                                        <td className="px-4 py-3">—</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Transactions tab — REQ-BA-FE-F-046 to F-050 ── */}
            {activeTab === 'transactions' && (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowTxModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                        >
                            <FiPlus />
                            Add Transaction
                        </button>
                    </div>
                    {!txLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-600">#</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Currency</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                No transactions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx, i) => (
                                            <tr key={tx.id} className="border-t border-gray-100">
                                                <td className="px-4 py-3 font-medium">{i + 1}</td>
                                                <td className="px-4 py-3">{tx.type ?? '—'}</td>
                                                <td className="px-4 py-3">{tx.amount?.toLocaleString() ?? '—'}</td>
                                                <td className="px-4 py-3">{tx.currency ?? '—'}</td>
                                                <td className="px-4 py-3">{tx.date ?? '—'}</td>
                                                <td className="px-4 py-3">{tx.description ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── GPI Monitoring tab — REQ-BA-FE-F-056 to F-059 ── */}
            {activeTab === 'gpi' && (
                <div className="flex flex-col gap-4">
                    {sections.filter((s) => s.written_premium_limit).length === 0 ? (
                        <p className="text-sm text-gray-400">No GPI limits configured for this binding authority.</p>
                    ) : (
                        <>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">GPI by Section</h3>
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100 text-left">
                                        <tr>
                                            <th className="px-4 py-2 font-medium text-gray-600">Section</th>
                                            <th className="px-4 py-2 font-medium text-gray-600">Actual Gross Premium</th>
                                            <th className="px-4 py-2 font-medium text-gray-600">GPI Limit</th>
                                            <th className="px-4 py-2 font-medium text-gray-600">Usage %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.filter((s) => s.written_premium_limit).map((sec) => {
                                            const limit = sec.written_premium_limit ?? 0
                                            const actual = 0 // actual from policies — placeholder
                                            const pct = limit > 0 ? (actual / limit) * 100 : 0
                                            const barColor = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'
                                            return (
                                                <tr key={sec.id} className="border-t border-gray-100">
                                                    <td className="px-4 py-2 font-medium">{sec.reference}</td>
                                                    <td className="px-4 py-2">{actual.toLocaleString()}</td>
                                                    <td className="px-4 py-2">{limit.toLocaleString()}</td>
                                                    <td className="px-4 py-2">
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
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Insured</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Inception Date</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(policies as { id: number; reference: string; insured?: string; status?: string; inception_date?: string; expiry_date?: string }[]).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                No policies linked to this binding authority.
                                            </td>
                                        </tr>
                                    ) : (
                                        (policies as { id: number; reference: string; insured?: string; status?: string; inception_date?: string; expiry_date?: string }[]).map((pol) => (
                                            <tr key={pol.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <Link to={`/policies/${pol.id}`} className="font-medium text-brand-600 hover:underline">
                                                        {pol.reference}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">{pol.insured ?? '—'}</td>
                                                <td className="px-4 py-3">{pol.status ?? '—'}</td>
                                                <td className="px-4 py-3">{pol.inception_date ?? '—'}</td>
                                                <td className="px-4 py-3">{pol.expiry_date ?? '—'}</td>
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
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Claim #</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Policy</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Created Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                    No claims linked to this binding authority.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Audit tab — REQ-BA-FE-F-069 to F-070 ── */}
            {activeTab === 'audit' && (
                <div className="flex flex-col gap-4">
                    {auditLoading ? (
                        <LoadingSpinner />
                    ) : auditError ? (
                        <p className="text-sm text-red-500">{auditError}</p>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">Action</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">User</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audit.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                No audit events recorded.
                                            </td>
                                        </tr>
                                    ) : (
                                        audit.map((evt, i) => (
                                            <tr key={`${evt.date}-${i}`} className="border-t border-gray-100">
                                                <td className="px-4 py-3">{new Date(evt.date).toLocaleString()}</td>
                                                <td className="px-4 py-3">{evt.action}</td>
                                                <td className="px-4 py-3">{evt.user ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Coverholder Search Modal — REQ-BA-FE-F-024 */}
            <CoverholderSearchModal
                isOpen={coverholderModalOpen}
                onClose={() => setCoverholderModalOpen(false)}
                onSelect={handleCoverholderSelect}
            />

            {/* Add Transaction Modal */}
            {showTxModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Add Transaction</h2>
                            <button type="button" onClick={() => setShowTxModal(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="tx-type" className="text-sm font-medium text-gray-700">Type</label>
                                <input id="tx-type" type="text" value={txForm.type ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="tx-amount" className="text-sm font-medium text-gray-700">Amount</label>
                                    <input id="tx-amount" type="number" value={txForm.amount ?? 0} onChange={(e) => setTxForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="tx-currency" className="text-sm font-medium text-gray-700">Currency</label>
                                    <input id="tx-currency" type="text" value={txForm.currency ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, currency: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="tx-date" className="text-sm font-medium text-gray-700">Date</label>
                                <input id="tx-date" type="date" value={txForm.date ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="tx-desc" className="text-sm font-medium text-gray-700">Description</label>
                                <input id="tx-desc" type="text" value={txForm.description ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={handleAddTransaction} disabled={savingTx} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">{savingTx ? 'Saving…' : 'Add Transaction'}</button>
                            <button type="button" onClick={() => setShowTxModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
