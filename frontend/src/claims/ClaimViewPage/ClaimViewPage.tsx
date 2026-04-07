/**
 * ClaimViewPage — /claims/:id
 *
 * REQ-CLM-FE-F-010 — load claim on mount with loading state
 * REQ-CLM-FE-F-011 — header: reference, status badge, insured, policy reference
 * REQ-CLM-FE-F-012 — sidebar: Back button
 * REQ-CLM-FE-F-013 — 4 tabs: Details, Transactions, Audit, Policy
 * REQ-CLM-FE-F-014 — Details tab with FieldGroups (claim info + loss info)
 * REQ-CLM-FE-F-015 — Transactions tab with ResizableGrid
 * REQ-CLM-FE-F-016 — Audit tab + POST "Claim Opened" on first activation
 * REQ-CLM-FE-F-017 — POST "Claim Closed" on unmount
 */

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import {
    getClaim,
    getClaimTransactions,
    getClaimAudit,
    postClaimAudit,
} from '@/claims/claims.service'
import type { Claim, ClaimTransaction, AuditEvent } from '@/claims/claims.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import Card from '@/shared/Card/Card'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
    Open: 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    Closed: 'bg-gray-100 text-gray-700',
    Declined: 'bg-red-100 text-red-700',
}

// REQ-CLM-FE-F-013: tabs in order
const TABS: TabItem[] = [
    { key: 'details', label: 'Details' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'audit', label: 'Audit' },
    { key: 'policy', label: 'Policy' },
]

const TRANSACTION_COLUMNS: Column[] = [
    { key: 'type', label: 'Type', sortable: true, defaultWidth: 160 },
    { key: 'amount', label: 'Amount', sortable: true, defaultWidth: 120 },
    { key: 'date', label: 'Date', sortable: true, defaultWidth: 120 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 250 },
    { key: 'createdBy', label: 'Created By', sortable: false, defaultWidth: 160 },
]

// Module-level constant for stable sidebar section reference
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Claim',
    items: [
        { label: 'Back to Claims', icon: FiArrowLeft, event: 'claim:back' },
    ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClaimViewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [claim, setClaim] = useState<Claim | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState('details')
    const auditPostedRef = useRef(false)

    // Transactions tab
    const [transactions, setTransactions] = useState<ClaimTransaction[]>([])
    const [transactionsLoaded, setTransactionsLoaded] = useState(false)
    const [transactionSort, setTransactionSort] = useState<SortConfig>({ key: 'date', direction: 'desc' })

    // Audit tab
    const [audit, setAudit] = useState<AuditEvent[]>([])

    // Register sidebar section
    useSidebarSection(SIDEBAR_SECTION)

    // Load claim on mount
    useEffect(() => {
        if (!id) return
        setLoading(true)
        setLoadError(null)
        getClaim(Number(id))
            .then(setClaim)
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load claim.'
                setLoadError(msg)
                addNotification(`Could not load claim: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-CLM-FE-F-017 — POST "Claim Closed" on unmount
    const idRef = useRef(id)
    useEffect(() => { idRef.current = id }, [id])

    useEffect(() => {
        return () => {
            if (!idRef.current) return
            postClaimAudit(Number(idRef.current), 'Claim Closed').catch(() => undefined)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle sidebar "Back to Claims" event
    useEffect(() => {
        const onBack = () => navigate('/claims')
        window.addEventListener('claim:back', onBack)
        return () => window.removeEventListener('claim:back', onBack)
    }, [navigate])

    function handleTabChange(key: string) {
        setActiveTab(key)

        // REQ-CLM-FE-F-016 — POST "Claim Opened" on first Audit tab activation
        if (key === 'audit' && !auditPostedRef.current) {
            auditPostedRef.current = true
            const session = getSession()
            getClaimAudit(Number(id!))
                .then(setAudit)
                .catch(() => undefined)
            postClaimAudit(Number(id!), 'Claim Opened').catch(() => undefined)
        }

        if (key === 'transactions' && !transactionsLoaded) {
            setTransactionsLoaded(true)
            getClaimTransactions(Number(id!))
                .then(setTransactions)
                .catch((err: Error) =>
                    addNotification(`Could not load transactions: ${err.message}`, 'warning')
                )
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (loading) return <LoadingSpinner />
    if (loadError) return <div className="p-6 text-red-600">{loadError}</div>
    if (!claim) return <div className="p-6 text-gray-600">Claim not found.</div>

    const statusCls = STATUS_CLASSES[claim.status] ?? 'bg-gray-100 text-gray-700'

    // REQ-CLM-FE-F-014 — Details tab FieldGroups
    const claimInfoFields = [
        { label: 'Reference', value: claim.reference },
        { label: 'Claim Number', value: claim.claimNumber },
        { label: 'Status', value: claim.status },
        { label: 'Policy', value: claim.policyReference ?? '—' },
        { label: 'Insured', value: claim.insured ?? '—' },
        { label: 'Reported Date', value: claim.reportedDate ?? '—' },
    ]

    const lossInfoFields = [
        { label: 'Date of Loss', value: claim.lossDate ?? '—' },
        { label: 'Description', value: claim.description ?? '—' },
        { label: 'Loss Type', value: claim.payload?.lossType ?? '—' },
        { label: 'Claimant Name', value: claim.payload?.claimantName ?? '—' },
        { label: 'Claimant Contact', value: claim.payload?.claimantContact ?? '—' },
    ]

    // Sorted transactions
    const sortedTransactions = [...transactions].sort((a, b) => {
        const av = (a as Record<string, unknown>)[transactionSort.key] ?? ''
        const bv = (b as Record<string, unknown>)[transactionSort.key] ?? ''
        const cmp = String(av).localeCompare(String(bv))
        return transactionSort.direction === 'asc' ? cmp : -cmp
    })

    return (
        <div className="flex flex-col h-full">
            {/* REQ-CLM-FE-F-011 — Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-bold text-gray-900">{claim.reference}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusCls}`}>
                        {claim.status}
                    </span>
                    {claim.insured && (
                        <span className="text-gray-600 text-sm">{claim.insured}</span>
                    )}
                    {claim.policyReference && (
                        <span className="text-gray-500 text-sm">
                            Policy: {claim.policyReference}
                        </span>
                    )}
                </div>
            </div>

            {/* REQ-CLM-FE-F-013 — Tabs */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">
                {/* Details */}
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card title="Claim Information">
                            <FieldGroup title="Claim Information">
                                <div className="grid grid-cols-2 gap-3">
                                    {claimInfoFields.map((f) => (
                                        <div key={f.label}>
                                            <label className="text-xs font-medium text-gray-600">{f.label}</label>
                                            <p className="text-sm text-gray-900">{f.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </FieldGroup>
                        </Card>
                        <Card title="Loss Information">
                            <FieldGroup title="Loss Information">
                                <div className="grid grid-cols-2 gap-3">
                                    {lossInfoFields.map((f) => (
                                        <div key={f.label}>
                                            <label className="text-xs font-medium text-gray-600">{f.label}</label>
                                            <p className="text-sm text-gray-900">{f.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </FieldGroup>
                        </Card>
                    </div>
                )}

                {/* Transactions */}
                {activeTab === 'transactions' && (
                    <ResizableGrid
                        columns={TRANSACTION_COLUMNS}
                        rows={sortedTransactions}
                        storageKey="table-widths-claim-transactions"
                        sortConfig={transactionSort}
                        onRequestSort={(key) =>
                            setTransactionSort((prev) => ({
                                key,
                                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                            }))
                        }
                        renderCell={(key, row) =>
                            String((row as Record<string, unknown>)[key] ?? '')
                        }
                    />
                )}

                {/* Audit */}
                {activeTab === 'audit' && (
                    <AuditTable audit={audit} entityType="claim" />
                )}

                {/* Policy */}
                {activeTab === 'policy' && (
                    <Card title="Policy Details">
                        {claim.policyReference ? (
                            <FieldGroup title="Policy">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Policy Reference</label>
                                        <p className="text-sm text-gray-900">{claim.policyReference}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Insured</label>
                                        <p className="text-sm text-gray-900">{claim.insured ?? '—'}</p>
                                    </div>
                                </div>
                            </FieldGroup>
                        ) : (
                            <p className="text-gray-500 text-sm">No policy linked.</p>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}
