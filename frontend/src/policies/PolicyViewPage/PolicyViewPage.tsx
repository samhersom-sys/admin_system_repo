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
import { FiEdit2, FiFileText, FiEdit, FiClock, FiSearch, FiMapPin } from 'react-icons/fi'
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
import { get as apiGet } from '@/shared/lib/api-client/api-client'
import BrokerSearch from '@/parties/BrokerSearch/BrokerSearch'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
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
    { key: 'finance-earning', label: 'Finance Summary' },
    { key: 'audit', label: 'Audit' },
]

const SECTION_COLUMNS: Column[] = [
    { key: '_actions', label: 'Action', sortable: false, defaultWidth: 72 },
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 120 },
    { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 200 },
    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 130 },
    { key: 'days_on_cover', label: 'Days on Cover', sortable: true, defaultWidth: 120 },
    { key: 'limit_currency', label: 'Limit Currency', sortable: false, defaultWidth: 120 },
    { key: 'limit_amount', label: 'Limit Amount', sortable: true, defaultWidth: 150 },
    { key: 'limit_loss_qualifier', label: 'Limit Loss Qualifier', sortable: false, defaultWidth: 160 },
    { key: 'excess_currency', label: 'Excess Currency', sortable: false, defaultWidth: 120 },
    { key: 'excess_amount', label: 'Excess Amount', sortable: true, defaultWidth: 150 },
    { key: 'excess_loss_qualifier', label: 'Excess Loss Qualifier', sortable: false, defaultWidth: 160 },
    { key: 'sum_insured_currency', label: 'Sum Insured Currency', sortable: false, defaultWidth: 160 },
    { key: 'sum_insured_amount', label: 'Sum Insured', sortable: true, defaultWidth: 150 },
    { key: 'premium_currency', label: 'Premium Currency', sortable: false, defaultWidth: 140 },
    { key: 'gross_gross_premium', label: 'Gross Gross Premium', sortable: true, defaultWidth: 180 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 160 },
    { key: 'deductions', label: 'Deductions', sortable: true, defaultWidth: 140 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 140 },
    { key: 'tax_receivable', label: 'Tax Receivable', sortable: true, defaultWidth: 140 },
    { key: 'annual_gross_premium', label: 'Annual Rated GP', sortable: true, defaultWidth: 180 },
    { key: 'annual_net_premium', label: 'Annual Rated NP', sortable: true, defaultWidth: 180 },
]

const INVOICE_COLUMNS: Column[] = [
    { key: 'invoice_number', label: 'Invoice Number', sortable: true, defaultWidth: 160 },
    { key: 'date', label: 'Date', sortable: true, defaultWidth: 110 },
    { key: 'due_date', label: 'Due Date', sortable: true, defaultWidth: 110 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
    { key: 'amount', label: 'Amount', sortable: true, defaultWidth: 120 },
]

const TRANSACTION_COLUMNS: Column[] = [
    { key: '_txn_num', label: '#', sortable: true, defaultWidth: 70 },
    { key: 'transaction_type', label: 'Type', sortable: true, defaultWidth: 180 },
    { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 130 },
    { key: 'created_by', label: 'Created By', sortable: true, defaultWidth: 140 },
    { key: 'created_at', label: 'Created Date', sortable: true, defaultWidth: 140 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 200 },
    { key: '_actions', label: '', sortable: false, defaultWidth: 90 },
]

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

    // Finance Summary (earning) tab
    const [earningPeriods, setEarningPeriods] = useState<{ periodYear: number; periodMonth: number; earnedAmount: string; unearnedAmount: string }[]>([])
    const [earningLoaded, setEarningLoaded] = useState(false)

    // Register sidebar section (F-005)
    const sidebarSection = useMemo((): SidebarSection => {
        const idSegment = id ?? ''
        return {
            title: 'Policy',
            items: [
                { label: 'Edit', icon: FiEdit2, event: 'policy:edit' },
                { label: 'Generate Document', icon: FiFileText, event: 'policy:generate-document' },
                { label: 'Endorse Policy', icon: FiEdit, event: 'policy:endorse' },
                { label: 'Schedule of Values', icon: FiMapPin, to: `/policies/${idSegment}/locations` },
                { label: 'Audit', icon: FiClock, event: 'policy:audit' },
            ],
        }
    }, [id])
    useSidebarSection(sidebarSection)

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

    // closeTimerRef lets the Opened effect cancel a pending Closed post that
    // was scheduled during a React StrictMode fake-unmount cycle (REQ-POL-FE-F-017).
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            // Only post Closed if Opened was actually posted this session.
            // Defer via setTimeout(0) so StrictMode remount can cancel it.
            if (!idRef.current || !auditPostedRef.current) return
            const capturedId = idRef.current
            const session = getSession()
            closeTimerRef.current = setTimeout(() => {
                closeTimerRef.current = null
                postPolicyAudit(Number(capturedId), {
                    action: 'Policy Closed',
                    entityType: 'Policy',
                    entityId: Number(capturedId),
                    performedBy: session?.user?.name,
                }).catch(() => undefined)
            }, 0)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-POL-FE-F-014 — POST Policy Opened on initial page load
    useEffect(() => {
        // If StrictMode queued a Closed from the previous fake unmount, cancel it now.
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current)
            closeTimerRef.current = null
        }
        if (!id || auditPostedRef.current) return
        auditPostedRef.current = true
        const session = getSession()
        postPolicyAudit(Number(id), {
            action: 'Policy Opened',
            entityType: 'Policy',
            entityId: Number(id),
            performedBy: session?.user?.name,
        })
            .catch(() => undefined)
            .finally(() => {
                getPolicyAudit(Number(id))
                    .then(setAudit)
                    .catch(() => undefined)
            })
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    function handleTabChange(key: string) {
        setActiveTab(key)

        if (key === 'finance-earning' && !earningLoaded) {
            setEarningLoaded(true)
            const currentSections = sections
            Promise.all(
                currentSections.map((s) =>
                    apiGet<{ earnedAmount: string; unearnedAmount: string }[]>(
                        `/api/earning-engine/sections/${s.id}/periods`,
                    ).catch(() => [] as { periodYear: number; periodMonth: number; earnedAmount: string; unearnedAmount: string }[]),
                ),
            ).then((results) => {
                const all = results.flat()
                setEarningPeriods(all)
            })
        }

        // Audit tab displays latest history
        if (key === 'audit') {
            getPolicyAudit(Number(id!))
                .then(setAudit)
                .catch(() => undefined)
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
        const onAudit = () => setActiveTab('audit')
        window.addEventListener('policy:edit', onEdit)
        window.addEventListener('policy:endorse', onEndorse)
        window.addEventListener('policy:audit', onAudit)
        return () => {
            window.removeEventListener('policy:edit', onEdit)
            window.removeEventListener('policy:endorse', onEndorse)
            window.removeEventListener('policy:audit', onAudit)
        }
    }, [handleEdit, handleEndorse])

    const transactionNumberById = useMemo(() => {
        const ordered = [...transactions].sort((left, right) => {
            const leftIsInitial = left.transaction_type === 'Initial Transaction'
            const rightIsInitial = right.transaction_type === 'Initial Transaction'
            if (leftIsInitial && !rightIsInitial) return -1
            if (!leftIsInitial && rightIsInitial) return 1

            const leftTimestamp = left.created_at ?? left.effective_date ?? ''
            const rightTimestamp = right.created_at ?? right.effective_date ?? ''
            if (leftTimestamp < rightTimestamp) return -1
            if (leftTimestamp > rightTimestamp) return 1

            return left.id - right.id
        })

        return new Map(ordered.map((tx, index) => [tx.id, tx.sequence_number ?? tx.number ?? index + 1]))
    }, [transactions])

    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((left, right) => {
            const leftNumber = transactionNumberById.get(left.id) ?? left.id
            const rightNumber = transactionNumberById.get(right.id) ?? right.id
            return rightNumber - leftNumber
        })
    }, [transactionNumberById, transactions])

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

    const readPolicy = (snake: keyof Policy, camel?: string): string => {
        const val = (policy as unknown as Record<string, unknown>)[snake as string]
            ?? (camel ? (policy as unknown as Record<string, unknown>)[camel] : undefined)
        return val != null && String(val).length > 0 ? String(val) : '—'
    }

    const sortedSections = [...sections].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sectionSort.key] ?? ''
        const bv = (b as Record<string, unknown>)[sectionSort.key] ?? ''
        if (av < bv) return sectionSort.direction === 'asc' ? -1 : 1
        if (av > bv) return sectionSort.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const s = row as PolicySection
        if (key === '_actions') {
            return (
                <button
                    type="button"
                    title="Open Section"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => navigate(`/policies/${policy!.id}/sections/${s.id}`)}
                >
                    <FiSearch size={14} />
                </button>
            )
        }
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
        if (key === 'effective_date') return s.effective_date || '—'
        if (key === 'expiry_date') return s.expiry_date || '—'
        if (key === 'days_on_cover') return s.days_on_cover != null ? String(s.days_on_cover) : '—'
        if (key === 'limit_currency') return s.limit_currency || '—'
        if (key === 'limit_loss_qualifier') return s.limit_loss_qualifier || '—'
        if (key === 'limit_amount') return s.limit_amount != null ? Number(s.limit_amount).toLocaleString() : '—'
        if (key === 'excess_currency') return s.excess_currency || '—'
        if (key === 'excess_loss_qualifier') return s.excess_loss_qualifier || '—'
        if (key === 'excess_amount') return s.excess_amount != null ? Number(s.excess_amount).toLocaleString() : '—'
        if (key === 'sum_insured_currency') return s.sum_insured_currency || '—'
        if (key === 'sum_insured_amount') {
            const val = s.sum_insured_amount ?? s.sum_insured
            return val != null ? Number(val).toLocaleString() : '—'
        }
        if (key === 'premium_currency') return s.premium_currency || '—'
        if (key === 'gross_gross_premium') return s.gross_gross_premium != null ? Number(s.gross_gross_premium).toLocaleString() : '—'
        if (key === 'gross_premium') return s.gross_premium != null ? Number(s.gross_premium).toLocaleString() : '—'
        if (key === 'deductions') return s.deductions != null ? Number(s.deductions).toLocaleString() : '—'
        if (key === 'net_premium') return s.net_premium != null ? Number(s.net_premium).toLocaleString() : '—'
        if (key === 'tax_receivable') return s.tax_receivable != null ? Number(s.tax_receivable).toLocaleString() : '—'
        if (key === 'annual_gross_premium') {
            const val = s.annual_gross_premium ?? s.annual_gross
            return val != null ? Number(val).toLocaleString() : '—'
        }
        if (key === 'annual_net_premium') {
            const val = s.annual_net_premium ?? s.annual_net
            return val != null ? Number(val).toLocaleString() : '—'
        }
        if (key === 'written_order') return s.written_order != null ? `${s.written_order}%` : '—'
        if (key === 'signed_order') return s.signed_order != null ? `${s.signed_order}%` : '—'
        if (key === 'time_basis') return s.time_basis || '—'
        if (key === 'written_order_basis') return s.written_order_basis || '—'
        if (key === 'signed_order_basis') return s.signed_order_basis || '—'
        if (key === 'written_line_total') return s.written_line_total != null ? Number(s.written_line_total).toLocaleString() : '—'
        if (key === 'signed_line_total') return s.signed_line_total != null ? Number(s.signed_line_total).toLocaleString() : '—'
        if (key === 'delegated_authority_ref') return s.delegated_authority_ref || '—'
        if (key === 'delegated_authority_section_ref') return s.delegated_authority_section_ref || '—'
        return '—'
    }

    function renderInvoiceCell(key: string, row: unknown): React.ReactNode {
        const inv = row as Invoice
        const val = (inv as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    function renderTransactionCell(key: string, row: unknown): React.ReactNode {
        const txn = row as PolicyTransaction
        const isEndorsement = ['Administrative', 'Contractual'].includes(txn.transaction_type)
        const isEditableEndorsement = isEndorsement && ['Draft', 'Bound'].includes(txn.status)

        if (key === '_txn_num') {
            return transactionNumberById.get(txn.id) ?? '—'
        }
        if (key === 'transaction_type') {
            const subType = txn.sub_type
                ?? (typeof txn.payload?.sub_type === 'string' ? txn.payload.sub_type : null)
            return subType ? `${txn.transaction_type} - ${subType}` : txn.transaction_type
        }
        if (key === 'status') {
            const cls = STATUS_CLASSES[txn.status] ?? 'bg-gray-100 text-gray-600'
            return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                    {txn.status ?? '—'}
                </span>
            )
        }
        if (key === 'created_at') {
            return txn.created_at ?? '—'
        }
        if (key === '_actions') {
            if (isEditableEndorsement) {
                return (
                    <button
                        type="button"
                        aria-label="Edit endorsement"
                        title="Edit endorsement"
                        className="text-green-600 hover:text-green-800"
                        onClick={() => navigate(`/policies/${policy!.id}/endorsements/${txn.id}/edit`)}
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
                    onClick={() => navigate(`/policies/${policy!.id}/transactions/${txn.id}`)}
                >
                    <FiSearch size={14} />
                </button>
            )
        }
        const val = (txn as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    const policyProduct = (() => {
        const payload = (policy.payload ?? {}) as Record<string, unknown>
        return (payload.product as Record<string, unknown> | undefined) ?? null
    })()

    return (
        <div className="p-6 flex flex-col gap-4">
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

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <FieldGroup title="Contract & Reference">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Class of Business</p>
                                    <p className="text-sm text-gray-900">{readPolicy('class_of_business', 'classOfBusiness')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Business Type</p>
                                    <p className="text-sm text-gray-900">{readPolicy('business_type', 'businessType')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">New or Renewal</p>
                                    <p className="text-sm text-gray-900">{readPolicy('new_or_renewal', 'newOrRenewal')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Currency</p>
                                    <p className="text-sm text-gray-900">{readPolicy('policy_currency', 'policyCurrency')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Placing Broker</p>
                                    <p className="text-sm text-gray-900">{readPolicy('placing_broker', 'placingBroker')}</p>
                                </div>
                            </div>
                        </FieldGroup>

                        <FieldGroup title="Product">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Product Category</p>
                                    <p className="text-sm text-gray-900">{typeof policyProduct?.category === 'string' && policyProduct.category ? policyProduct.category : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Product</p>
                                    <p className="text-sm text-gray-900">{typeof policyProduct?.name === 'string' && policyProduct.name ? policyProduct.name : '—'}</p>
                                </div>
                            </div>
                        </FieldGroup>

                        <FieldGroup title="Insured">
                            <p className="text-sm text-gray-900">{policy.insured ?? '—'}</p>
                        </FieldGroup>
                    </div>

                    <div className="flex flex-col gap-3">
                        <FieldGroup title="Dates">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Inception Date</p>
                                    <p className="text-sm text-gray-900">{readPolicy('inception_date', 'inceptionDate')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Inception Time</p>
                                    <p className="text-sm text-gray-900">{readPolicy('inception_time', 'inceptionTime')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Expiry Date</p>
                                    <p className="text-sm text-gray-900">{readPolicy('expiry_date', 'expiryDate')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Expiry Time</p>
                                    <p className="text-sm text-gray-900">{readPolicy('expiry_time', 'expiryTime')}</p>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                                    <input
                                        type="checkbox"
                                        aria-label="LTA Applicable"
                                        checked={readPolicy('lta_applicable', 'ltaApplicable') === 'true'}
                                        disabled
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    LTA Applicable
                                </label>
                            </div>
                        </FieldGroup>

                        <FieldGroup title="Contract / Placement">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Contract Type</p>
                                    <p className="text-sm text-gray-900">{readPolicy('contract_type', 'contractType')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Method of Placement</p>
                                    <p className="text-sm text-gray-900">{readPolicy('method_of_placement', 'methodOfPlacement')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Unique Market Reference</p>
                                    <p className="text-sm text-gray-900">{readPolicy('unique_market_reference', 'uniqueMarketReference')}</p>
                                </div>
                            </div>
                        </FieldGroup>

                        <FieldGroup title="Renewal">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Renewable</p>
                                    <p className="text-sm text-gray-900">{readPolicy('renewable_indicator', 'renewable')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Renewal Date</p>
                                    <p className="text-sm text-gray-900">{readPolicy('renewal_date', 'renewalDate')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Renewal Status</p>
                                    <p className="text-sm text-gray-900">{readPolicy('renewal_status', 'renewalStatus')}</p>
                                </div>
                            </div>
                        </FieldGroup>
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
                        rows={sortedTransactions}
                        sortConfig={{ key: 'effective_date', direction: 'desc' }}
                        onSort={() => undefined}
                        renderCell={renderTransactionCell}
                        emptyMessage="No transactions found."
                        storageKey="table-widths-policy-transactions"
                    />
                </Card>
            )}

            {activeTab === 'finance-earning' && (
                <Card title="Finance Summary">
                    {earningPeriods.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            No earning data available. Run the earning engine to generate figures.
                        </p>
                    ) : (() => {
                        // Group by calendar period across all sections — REQ-EARN-F-016
                        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        const periodMap = new Map<string, { earned: number; unearned: number }>()
                        earningPeriods.forEach(p => {
                            const key = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`
                            const existing = periodMap.get(key) ?? { earned: 0, unearned: 0 }
                            periodMap.set(key, {
                                earned: existing.earned + parseFloat(p.earnedAmount),
                                unearned: existing.unearned + parseFloat(p.unearnedAmount),
                            })
                        })
                        const rows = Array.from(periodMap.entries())
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([key, { earned, unearned }]) => {
                                const [yr, mo] = key.split('-')
                                return { label: `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`, earned, unearned }
                            })
                        return (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 font-medium text-gray-600">Period</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 text-right">GWP Earn</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 text-right">Unearned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(r => (
                                            <tr key={r.label} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2">{r.label}</td>
                                                <td className="px-4 py-2 text-right font-mono">{r.earned.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                                <td className="px-4 py-2 text-right font-mono">{r.unearned.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })()}
                </Card>
            )}

            {activeTab === 'audit' && (
                <Card>
                    <AuditTable audit={audit as unknown[]} />
                </Card>
            )}

            {/* Editable status badge */}
            {policy && (
                <div className="fixed bottom-20 right-4 z-40">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${policy.status === 'Draft' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${policy.status === 'Draft' ? 'bg-green-500' : 'bg-amber-400'}`} aria-hidden="true" />
                        <span>{policy.status === 'Draft' ? 'Editable' : 'Read-only'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
