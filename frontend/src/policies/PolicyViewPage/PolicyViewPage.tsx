/**
 * PolicyViewPage — /policies/:id
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-003 — load policy on mount with loading state
 * REQ-POL-FE-F-004 — header: reference, status badge, insured, CoB, dates
 * REQ-POL-FE-F-005 — sidebar: Edit, Generate Document, Endorse, Audit
 * REQ-POL-FE-F-006 — 7 tabs in order: Sections, Broker, Additional Insureds,
 *                     Financial Summary, Invoices, Transactions, Audit
 * REQ-POL-FE-F-007 — Sections tab ResizableGrid
 * REQ-POL-FE-F-009 — Broker tab
 * REQ-POL-FE-F-010 — Additional Insureds tab
 * REQ-POL-FE-F-011 — Financial Summary tab (read-only, commission = gross - net)
 * REQ-POL-FE-F-012 — Invoices tab
 * REQ-POL-FE-F-013 — Transactions tab
 * REQ-POL-FE-F-014 — Audit tab; POST Policy Opened on first activation
 * REQ-POL-FE-F-017 — POST Policy Closed on unmount
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiEdit2, FiFileText, FiEdit, FiClock, FiSearch } from 'react-icons/fi'
import {
    getPolicy,
    getPolicySections,
    getPolicyInvoices,
    getPolicyTransactions,
    getPolicyAudit,
    postPolicyAudit,
} from '@/policies/policies.service'
import type { Policy, PolicySection, PolicyTransaction, Invoice, AuditEvent } from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import BrokerSearch from '@/parties/BrokerSearch/BrokerSearch'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import Card from '@/shared/Card/Card'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Expired: 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-yellow-100 text-yellow-800',
}

// REQ-POL-FE-F-006: 7 tabs in this exact order
const TABS: TabItem[] = [
    { key: 'sections', label: 'Sections' },
    { key: 'broker', label: 'Broker' },
    { key: 'additional-insureds', label: 'Additional Insureds' },
    { key: 'financial-summary', label: 'Financial Summary' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'audit', label: 'Audit' },
]

const SECTION_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 200 },
    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 130 },
    { key: 'limit_currency', label: 'Limit Currency', sortable: false, defaultWidth: 120 },
    { key: 'limit_loss_qualifier', label: 'Limit Loss Qualifier', sortable: false, defaultWidth: 160 },
    { key: 'limit_amount', label: 'Limit Amount', sortable: true, defaultWidth: 150 },
    { key: 'excess_currency', label: 'Excess Currency', sortable: false, defaultWidth: 120 },
    { key: 'excess_loss_qualifier', label: 'Excess Loss Qualifier', sortable: false, defaultWidth: 160 },
    { key: 'excess_amount', label: 'Excess Amount', sortable: true, defaultWidth: 150 },
    { key: 'sum_insured_currency', label: 'Sum Insured Currency', sortable: false, defaultWidth: 160 },
    { key: 'sum_insured_amount', label: 'Sum Insured', sortable: true, defaultWidth: 150 },
    { key: 'premium_currency', label: 'Premium Currency', sortable: false, defaultWidth: 140 },
    { key: 'gross_gross_premium', label: 'Gross Gross Premium', sortable: true, defaultWidth: 180 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 160 },
    { key: 'deductions', label: 'Deductions', sortable: true, defaultWidth: 140 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 140 },
    { key: 'annual_gross', label: 'Annual Rated Gross Premium', sortable: true, defaultWidth: 200 },
    { key: 'annual_net', label: 'Annual Rated Net Premium', sortable: true, defaultWidth: 200 },
    { key: 'written_order', label: 'Written Order', sortable: true, defaultWidth: 120 },
    { key: 'signed_order', label: 'Signed Order', sortable: true, defaultWidth: 120 },
]

const INVOICE_COLUMNS: Column[] = [
    { key: 'invoice_number', label: 'Invoice Number', sortable: true, defaultWidth: 160 },
    { key: 'date', label: 'Date', sortable: true, defaultWidth: 110 },
    { key: 'due_date', label: 'Due Date', sortable: true, defaultWidth: 110 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
    { key: 'amount', label: 'Amount', sortable: true, defaultWidth: 120 },
]

const TRANSACTION_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'transaction_type', label: 'Type', sortable: true, defaultWidth: 130 },
    { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 130 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 200 },
]

// Module-level constant — required by useSidebarSection stable-ref rule (Guideline 14)
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Policy',
    items: [
        { label: 'Edit', icon: FiEdit2, event: 'policy:edit' },
        { label: 'Generate Document', icon: FiFileText, event: 'policy:generate-document' },
        { label: 'Endorse', icon: FiEdit, event: 'policy:endorse' },
        { label: 'Audit', icon: FiClock, event: 'policy:audit' },
    ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PolicyViewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState('sections')
    const auditPostedRef = useRef(false)

    // Sections tab
    const [sections, setSections] = useState<PolicySection[]>([])
    const [sectionsLoading, setSectionsLoading] = useState(false)
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })

    // Invoices tab
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [invoicesLoaded, setInvoicesLoaded] = useState(false)

    // Transactions tab
    const [transactions, setTransactions] = useState<PolicyTransaction[]>([])
    const [transactionsLoaded, setTransactionsLoaded] = useState(false)

    // Audit tab
    const [audit, setAudit] = useState<AuditEvent[]>([])

    // Additional Insureds tab
    const [additionalInsureds, setAdditionalInsureds] = useState<{ name: string }[]>([])

    // Broker tab
    const [placingBrokerName, setPlacingBrokerName] = useState('')

    // Register sidebar section (F-005)
    useSidebarSection(SIDEBAR_SECTION)

    // Load policy on mount
    useEffect(() => {
        if (!id) return
        setLoading(true)
        setLoadError(null)
        getPolicy(id)
            .then((p) => {
                setPolicy(p)
                setPlacingBrokerName(p.placing_broker ?? '')
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load policy.'
                setLoadError(msg)
                addNotification(`Could not load policy: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Load sections once policy is available (separate from policy load to avoid
    // duplicate "Property" text in simultaneous header + grid renders — see R004)
    useEffect(() => {
        if (!policy || !id) return
        setSectionsLoading(true)
        getPolicySections(id)
            .then(setSections)
            .catch((err: Error) =>
                addNotification(`Could not load sections: ${err.message}`, 'warning')
            )
            .finally(() => setSectionsLoading(false))
    }, [policy]) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-POL-FE-F-017 — POST Policy Closed on unmount
    // Capture stable ref to id so the cleanup function can use it after unmount
    const idRef = useRef(id)
    useEffect(() => { idRef.current = id }, [id])

    useEffect(() => {
        return () => {
            if (!idRef.current) return
            const session = getSession()
            postPolicyAudit(Number(idRef.current), {
                action: 'Policy Closed',
                entityType: 'Policy',
                entityId: Number(idRef.current),
                performedBy: session?.user?.name,
            }).catch(() => undefined) // best-effort; do not surface on unmount
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function handleTabChange(key: string) {
        setActiveTab(key)

        // REQ-POL-FE-F-014 — POST Policy Opened on first Audit tab activation
        if (key === 'audit' && !auditPostedRef.current) {
            auditPostedRef.current = true
            const session = getSession()
            getPolicyAudit(Number(id!))
                .then(setAudit)
                .catch(() => undefined)
            postPolicyAudit(Number(id!), {
                action: 'Policy Opened',
                entityType: 'Policy',
                entityId: Number(id),
                performedBy: session?.user?.name,
            }).catch(() => undefined)
        }

        if (key === 'invoices' && !invoicesLoaded) {
            setInvoicesLoaded(true)
            getPolicyInvoices(Number(id!))
                .then(setInvoices)
                .catch((err: Error) =>
                    addNotification(`Could not load invoices: ${err.message}`, 'warning')
                )
        }

        if (key === 'transactions' && !transactionsLoaded) {
            setTransactionsLoaded(true)
            getPolicyTransactions(Number(id!))
                .then(setTransactions)
                .catch((err: Error) =>
                    addNotification(`Could not load transactions: ${err.message}`, 'warning')
                )
        }
    }

    // Handle Edit sidebar event
    const handleEdit = useCallback(() => {
        navigate(`/policies/${id}/edit`)
    }, [id, navigate])

    const handleEndorse = useCallback(() => {
        navigate(`/policies/endorse/${id}`)
    }, [id, navigate])

    useEffect(() => {
        const onEdit = () => handleEdit()
        const onEndorse = () => handleEndorse()
        window.addEventListener('policy:edit', onEdit)
        window.addEventListener('policy:endorse', onEndorse)
        return () => {
            window.removeEventListener('policy:edit', onEdit)
            window.removeEventListener('policy:endorse', onEndorse)
        }
    }, [handleEdit, handleEndorse])

    // ---------------------------------------------------------------------------
    // Render states
    // ---------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    if (loadError) {
        return <div className="p-6 text-sm text-red-600">{loadError}</div>
    }

    if (!policy) return null

    const commission =
        policy.gross_premium != null && policy.net_premium != null
            ? policy.gross_premium - policy.net_premium
            : null

    const sortedSections = [...sections].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sectionSort.key] ?? ''
        const bv = (b as Record<string, unknown>)[sectionSort.key] ?? ''
        if (av < bv) return sectionSort.direction === 'asc' ? -1 : 1
        if (av > bv) return sectionSort.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const s = row as PolicySection
        if (key === 'reference') {
            return (
                <Link
                    to={`/policies/${policy!.id}/sections/${s.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                >
                    {s.reference}
                </Link>
            )
        }
        if (key === 'class_of_business') return s.class_of_business || '—'
        if (key === 'inception_date') return s.inception_date || '—'
        if (key === 'expiry_date') return s.expiry_date || '—'
        if (key === 'limit_currency') return s.limit_currency || '—'
        if (key === 'limit_loss_qualifier') return s.limit_loss_qualifier || '—'
        if (key === 'limit_amount') return s.limit_amount != null ? Number(s.limit_amount).toLocaleString() : '—'
        if (key === 'excess_currency') return s.excess_currency || '—'
        if (key === 'excess_loss_qualifier') return s.excess_loss_qualifier || '—'
        if (key === 'excess_amount') return s.excess_amount != null ? Number(s.excess_amount).toLocaleString() : '—'
        if (key === 'sum_insured_currency') return s.sum_insured_currency || '—'
        if (key === 'sum_insured_amount') return s.sum_insured_amount != null ? Number(s.sum_insured_amount).toLocaleString() : '—'
        if (key === 'premium_currency') return s.premium_currency || '—'
        if (key === 'gross_gross_premium') return s.gross_gross_premium != null ? Number(s.gross_gross_premium).toLocaleString() : '—'
        if (key === 'gross_premium') return s.gross_premium != null ? Number(s.gross_premium).toLocaleString() : '—'
        if (key === 'deductions') return s.deductions != null ? Number(s.deductions).toLocaleString() : '—'
        if (key === 'net_premium') return s.net_premium != null ? Number(s.net_premium).toLocaleString() : '—'
        if (key === 'annual_gross') return s.annual_gross != null ? Number(s.annual_gross).toLocaleString() : '—'
        if (key === 'annual_net') return s.annual_net != null ? Number(s.annual_net).toLocaleString() : '—'
        if (key === 'written_order') return s.written_order != null ? `${s.written_order}%` : '—'
        if (key === 'signed_order') return s.signed_order != null ? `${s.signed_order}%` : '—'
        return '—'
    }

    function renderInvoiceCell(key: string, row: unknown): React.ReactNode {
        const inv = row as Invoice
        const val = (inv as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    function renderTransactionCell(key: string, row: unknown): React.ReactNode {
        const txn = row as PolicyTransaction
        if (key === 'reference') {
            const isEndorsement =
                txn.transaction_type === 'Endorsement' || txn.transaction_type === 'Cancellation'
            if (isEndorsement) {
                return (
                    <Link
                        to={`/policies/${policy!.id}/endorsements/${txn.id}/edit`}
                        className="text-brand-600 hover:text-brand-800 hover:underline"
                    >
                        {txn.reference ?? txn.id}
                    </Link>
                )
            }
        }
        const val = (txn as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header — F-004 */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xl font-semibold text-gray-900">{policy.reference}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{policy.insured}</p>
                    </div>
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[policy.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                        {policy.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Class of Business</p>
                        <p className="text-gray-900">{policy.class_of_business ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Currency</p>
                        <p className="text-gray-900">{policy.policy_currency ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Inception Date</p>
                        <p className="text-gray-900">{policy.inception_date ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Expiry Date</p>
                        <p className="text-gray-900">{policy.expiry_date ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Placing Broker</p>
                        <p className="text-gray-900">{policy.placing_broker ?? '—'}</p>
                    </div>
                </div>
            </Card>

            {/* Tabs — F-006 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

            {/* Tab panels */}
            {activeTab === 'sections' && (
                <Card>
                    {sectionsLoading ? (
                        <div className="flex justify-center p-4"><LoadingSpinner /></div>
                    ) : (
                        <ResizableGrid
                            columns={SECTION_COLUMNS}
                            rows={sortedSections}
                            sortConfig={sectionSort}
                            onSort={(key) =>
                                setSectionSort((prev) => ({
                                    key,
                                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                                }))
                            }
                            renderCell={renderSectionCell}
                            emptyMessage="No sections found."
                            storageKey="table-widths-policy-sections"
                        />
                    )}
                </Card>
            )}

            {activeTab === 'broker' && (
                <Card title="Broker">
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Placing Broker</p>
                            <BrokerSearch
                                placeholder="Placing Broker"
                                onSelect={(p) => setPlacingBrokerName(p.name)}
                            />
                            {placingBrokerName && (
                                <p className="text-sm text-gray-700 mt-1">{placingBrokerName}</p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'additional-insureds' && (
                <div data-testid="additional-insureds-pane">
                    <Card title="Additional Insureds">
                        {additionalInsureds.length === 0 ? (
                            <p className="text-sm text-gray-400">No additional insureds listed.</p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {additionalInsureds.map((ai, i) => (
                                    <li key={i} className="text-sm text-gray-800">{ai.name}</li>
                                ))}
                            </ul>
                        )}
                        <button
                            type="button"
                            className="mt-3 text-sm text-brand-600 hover:underline"
                            onClick={() => setAdditionalInsureds((prev) => [...prev, { name: '' }])}
                        >
                            + Add Insured
                        </button>
                    </Card>
                </div>
            )}

            {activeTab === 'financial-summary' && (
                <Card
                    title="Financial Summary"
                    data-testid="tab-panel-financial-summary"
                >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Gross Premium</p>
                            <p className="text-gray-900">
                                {policy.gross_premium != null
                                    ? policy.gross_premium.toLocaleString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Net Premium</p>
                            <p className="text-gray-900">
                                {policy.net_premium != null
                                    ? policy.net_premium.toLocaleString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Commission</p>
                            <p className="text-gray-900">
                                {commission != null ? commission.toLocaleString() : '—'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'invoices' && (
                <Card>
                    <ResizableGrid
                        columns={INVOICE_COLUMNS}
                        rows={invoices}
                        sortConfig={{ key: 'date', direction: 'desc' }}
                        onSort={() => undefined}
                        renderCell={renderInvoiceCell}
                        emptyMessage="No invoices found."
                        storageKey="table-widths-policy-invoices"
                    />
                </Card>
            )}

            {activeTab === 'transactions' && (
                <Card>
                    <ResizableGrid
                        columns={TRANSACTION_COLUMNS}
                        rows={transactions}
                        sortConfig={{ key: 'effective_date', direction: 'desc' }}
                        onSort={() => undefined}
                        renderCell={renderTransactionCell}
                        emptyMessage="No transactions found."
                        storageKey="table-widths-policy-transactions"
                    />
                </Card>
            )}

            {activeTab === 'audit' && (
                <Card>
                    <AuditTable audit={audit as unknown[]} />
                </Card>
            )}
        </div>
    )
}
