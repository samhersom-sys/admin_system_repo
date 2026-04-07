/**
 * BAViewPage — REQ-BA-FE-F-016 to F-071
 *
 * 7-tab view: Sections | Financial Summary | Transactions |
 *             GPI Monitoring | Policies | Claims | Audit
 *
 * Header shows BA details; locked banner when not Draft.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
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

export default function BAViewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('sections')
    const [saving, setSaving] = useState(false)

    // Sections
    const [sections, setSections] = useState<BASection[]>([])
    const [sectionsLoaded, setSectionsLoaded] = useState(false)
    const [showSectionModal, setShowSectionModal] = useState(false)
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
            })
            .catch(() => addNotification('Could not load binding authority.', 'error'))
            .finally(() => setLoading(false))
    }, [baId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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

    async function handleAddSection() {
        setSavingSection(true)
        try {
            const created = await createBASection(baId, sectionForm)
            setSections((prev) => [...prev, created])
            addNotification('Section created.', 'success')
            setShowSectionModal(false)
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

    const isDraft = ba.status === 'Draft'
    const isLocked = !isDraft

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Locked banner */}
            {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    This binding authority is <strong>{ba.status}</strong> and cannot be edited.
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

            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white rounded-lg border border-gray-200 p-4">
                <div>
                    <p className="text-xs text-gray-400">Inception Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{ba.inception_date ?? '—'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400">Expiry Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{ba.expiry_date ?? '—'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400">Year of Account</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{ba.year_of_account ?? '—'}</p>
                </div>
                {ba.submission_id && (
                    <div>
                        <p className="text-xs text-gray-400">Submission</p>
                        <Link
                            to={`/submissions/${ba.submission_id}`}
                            className="text-sm font-medium text-brand-600 hover:underline mt-0.5 block"
                        >
                            {ba.submission_reference ?? ba.submission_id}
                        </Link>
                    </div>
                )}
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

            {/* Sections tab */}
            {activeTab === 'sections' && (
                <div className="flex flex-col gap-4">
                    {isDraft && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowSectionModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                            >
                                <FiPlus />
                                Add Section
                            </button>
                        </div>
                    )}
                    {!sectionsLoaded ? (
                        <LoadingSpinner />
                    ) : sections.length === 0 ? (
                        <p className="text-sm text-gray-400">No sections added.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sections.map((sec) => (
                                <div key={sec.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-2">
                                    <div className="flex items-start justify-between">
                                        <Link
                                            to={`/binding-authorities/${baId}/sections/${sec.id}`}
                                            className="font-semibold text-brand-600 hover:underline"
                                        >
                                            {sec.reference}
                                        </Link>
                                        {isDraft && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSection(sec.id)}
                                                className="text-gray-300 hover:text-red-500"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{sec.class_of_business ?? '—'}</p>
                                    <div className="flex gap-4 text-xs text-gray-400">
                                        <span>{sec.inception_date}</span>
                                        <span>→</span>
                                        <span>{sec.expiry_date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Financial Summary tab */}
            {activeTab === 'financial' && (
                <p className="text-sm text-gray-400">Financial summary — aggregated data from sections.</p>
            )}

            {/* Transactions tab */}
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
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                No transactions.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="border-t border-gray-100">
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

            {/* GPI Monitoring tab */}
            {activeTab === 'gpi' && (
                <p className="text-sm text-gray-400">GPI Monitoring — progress data from sections.</p>
            )}

            {/* Policies tab */}
            {activeTab === 'policies' && (
                <div className="flex flex-col gap-4">
                    {!policiesLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <p className="text-sm text-gray-400">
                            {policies.length === 0 ? 'No policies under this binding authority.' : `${policies.length} policies.`}
                        </p>
                    )}
                </div>
            )}

            {/* Claims tab */}
            {activeTab === 'claims' && (
                <p className="text-sm text-gray-400">Claims — coming soon.</p>
            )}

            {/* Audit tab */}
            {activeTab === 'audit' && (
                <p className="text-sm text-gray-400">Audit history — coming soon.</p>
            )}

            {/* Add Section Modal */}
            {showSectionModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Add Section</h2>
                            <button type="button" onClick={() => setShowSectionModal(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="sec-cob" className="text-sm font-medium text-gray-700">Class of Business</label>
                                <input id="sec-cob" type="text" value={sectionForm.class_of_business ?? ''} onChange={(e) => setSectionForm((p) => ({ ...p, class_of_business: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sec-inc" className="text-sm font-medium text-gray-700">Inception Date</label>
                                    <input id="sec-inc" type="date" value={sectionForm.inception_date ?? ''} onChange={(e) => setSectionForm((p) => ({ ...p, inception_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sec-exp" className="text-sm font-medium text-gray-700">Expiry Date</label>
                                    <input id="sec-exp" type="date" value={sectionForm.expiry_date ?? ''} onChange={(e) => setSectionForm((p) => ({ ...p, expiry_date: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="sec-currency" className="text-sm font-medium text-gray-700">Currency</label>
                                <input id="sec-currency" type="text" value={sectionForm.currency ?? ''} onChange={(e) => setSectionForm((p) => ({ ...p, currency: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={handleAddSection} disabled={savingSection} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">{savingSection ? 'Saving…' : 'Add Section'}</button>
                            <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

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
