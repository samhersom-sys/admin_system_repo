/**
 * PolicyEndorsementPage — /policies/:id/endorsements/:endorsementId/edit
 *
 * Full policy view in editable mode for an active endorsement.
 * Tabs: Sections, Broker, Additional Insureds, Financial Summary, Invoices,
 *       Endorsement, Audit. Transactions tab is intentionally excluded
 *       (matches BA endorsement pattern — REQ-POL-FE-F-026).
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-025 — renders with policy + endorsement loaded; error if not found
 * REQ-POL-FE-F-026 — 7 tabs (no Transactions); Endorsement tab for endorsement fields
 * REQ-POL-FE-F-027 — Issue Endorsement PUT, Cancellation sets Cancelled
 * REQ-POL-FE-F-028 — dirty-state back-navigation barrier
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiArrowLeft, FiPlus, FiSearch } from 'react-icons/fi'
import {
    getPolicy,
    getPolicySections,
    createPolicySection,
    getPolicyEndorsements,
    getPolicyAudit,
    postPolicyAudit,
    issueEndorsement,
} from '@/policies/policies.service'
import type { Policy, PolicySection, PolicyTransaction, AuditEvent } from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import { post, get } from '@/shared/lib/api-client/api-client'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import BrokerSearch from '@/parties/BrokerSearch/BrokerSearch'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

const STATUS_CLASSES: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Expired: 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-yellow-100 text-yellow-800',
}

// REQ-POL-FE-F-026: 7 tabs — Transactions tab intentionally absent
const ENDORSEMENT_TABS: TabItem[] = [
    { key: 'sections', label: 'Sections' },
    { key: 'broker', label: 'Broker' },
    { key: 'additional-insureds', label: 'Additional Insureds' },
    { key: 'financial-summary', label: 'Financial Summary' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'endorsement', label: 'Endorsement' },
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
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 140 },
    { key: 'deductions', label: 'Deductions', sortable: true, defaultWidth: 140 },
    { key: 'tax_receivable', label: 'Tax Receivable', sortable: true, defaultWidth: 140 },
    { key: 'annual_gross_premium', label: 'Annual Rated GP', sortable: true, defaultWidth: 180 },
    { key: 'annual_net_premium', label: 'Annual Rated NP', sortable: true, defaultWidth: 180 },
    { key: 'written_order', label: 'Written Order %', sortable: true, defaultWidth: 130 },
    { key: 'signed_order', label: 'Signed Order %', sortable: true, defaultWidth: 130 },
    { key: 'time_basis', label: 'Time Basis', sortable: true, defaultWidth: 140 },
    { key: 'written_order_basis', label: 'Written Order Basis', sortable: true, defaultWidth: 170 },
    { key: 'signed_order_basis', label: 'Signed Order Basis', sortable: true, defaultWidth: 170 },
    { key: 'written_line_total', label: 'Written Line Total', sortable: true, defaultWidth: 160 },
    { key: 'signed_line_total', label: 'Signed Line Total', sortable: true, defaultWidth: 160 },
    { key: 'delegated_authority_ref', label: 'DA Ref', sortable: true, defaultWidth: 130 },
    { key: 'delegated_authority_section_ref', label: 'DA Section Ref', sortable: true, defaultWidth: 160 },
]

export default function PolicyEndorsementPage() {
    const { id, endorsementId } = useParams<{ id: string; endorsementId: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [endorsement, setEndorsement] = useState<PolicyTransaction | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('sections')

    // Sections tab
    const [sections, setSections] = useState<PolicySection[]>([])
    const [sectionsLoading, setSectionsLoading] = useState(false)

    // Broker tab
    const [placingBrokerName, setPlacingBrokerName] = useState('')

    // Additional Insureds tab
    const [additionalInsureds, setAdditionalInsureds] = useState<{ name: string }[]>([])

    // Audit tab
    const [audit, setAudit] = useState<AuditEvent[]>([])
    const auditPostedRef = useRef(false)
    // REQ-POL-FE-F-045/046 — endorsement-specific audit open/close tracking
    const endorsementAuditPostedRef = useRef(false)
    const endorsementCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const endorsementIdRef = useRef(endorsementId)

    // Endorsement fields
    const [effectiveDate, setEffectiveDate] = useState('')
    const [description, setDescription] = useState('')
    const [isDirty, setIsDirty] = useState(false)

    // Wave 1: load policy on mount
    useEffect(() => {
        if (!id) return
        getPolicy(id)
            .then((pol) => {
                setPolicy(pol)
                setPlacingBrokerName(pol.placing_broker ?? '')
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load policy.'
                setLoadError(msg)
                addNotification({ message: `Could not load policy: ${msg}`, type: 'error' })
            })
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Wave 2: once policy loaded, fetch sections and endorsements in parallel
    useEffect(() => {
        if (!policy || !id) return

        setSectionsLoading(true)
        getPolicySections(id)
            .then(setSections)
            .catch((err: Error) =>
                addNotification({ message: `Could not load sections: ${err.message}`, type: 'warning' })
            )
            .finally(() => setSectionsLoading(false))

        getPolicyEndorsements(id)
            .then((ends) => {
                const found = ends.find((e) => String(e.id) === endorsementId)
                if (found) {
                    setEndorsement(found)
                    setEffectiveDate(found.effective_date ?? '')
                    setDescription(found.description ?? '')
                } else {
                    setLoadError('Endorsement not found.')
                }
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load endorsements.'
                setLoadError(msg)
                addNotification({ message: `Could not load endorsements: ${msg}`, type: 'error' })
            })
    }, [policy]) // eslint-disable-line react-hooks/exhaustive-deps

    function handleTabChange(key: string) {
        setActiveTab(key)
        // REQ-POL-FE-F-047 — endorsement audit tab fetches endorsement-specific events
        if (key === 'audit' && endorsementId) {
            get<AuditEvent[]>(`/api/audit/PolicyEndorsement/${endorsementId}`)
                .then(setAudit)
                .catch(() => undefined)
        }
    }

    // REQ-POL-FE-F-045 — POST Endorsement Opened on mount
    useEffect(() => {
        if (endorsementCloseTimerRef.current !== null) {
            clearTimeout(endorsementCloseTimerRef.current)
            endorsementCloseTimerRef.current = null
        }
        if (!endorsementId || endorsementAuditPostedRef.current) return
        endorsementAuditPostedRef.current = true
        post('/api/audit/event', {
            entityType: 'PolicyEndorsement',
            entityId: Number(endorsementId),
            action: 'Endorsement Opened',
            details: {},
        }).catch(() => undefined)
    }, [endorsementId]) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-POL-FE-F-046 — POST Endorsement Closed on unmount
    useEffect(() => {
        endorsementIdRef.current = endorsementId
    }, [endorsementId])

    useEffect(() => {
        return () => {
            if (!endorsementIdRef.current || !endorsementAuditPostedRef.current) return
            const capturedEndId = endorsementIdRef.current
            endorsementCloseTimerRef.current = setTimeout(() => {
                endorsementCloseTimerRef.current = null
                post('/api/audit/event', {
                    entityType: 'PolicyEndorsement',
                    entityId: Number(capturedEndId),
                    action: 'Endorsement Closed',
                    details: {},
                }).catch(() => undefined)
            }, 0)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-POL-FE-F-026/014 parity — POST Policy Opened on initial page load
    // closeTimerRef lets this effect cancel a pending Closed post that was
    // scheduled during a React StrictMode fake-unmount cycle.
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        // Cancel any pending Closed from StrictMode fake-unmount.
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

    const idRef = useRef(id)
    useEffect(() => { idRef.current = id }, [id])

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

    // REQ-POL-FE-F-028 — back-navigation barrier when dirty
    const addNotificationRef = useRef(addNotification)
    useEffect(() => { addNotificationRef.current = addNotification }, [addNotification])

    useEffect(() => {
        if (!isDirty) return
        window.history.pushState(null, '', window.location.href)
        let warned = false
        function onPopState() {
            if (!warned) {
                warned = true
                window.history.pushState(null, '', window.location.href)
                addNotificationRef.current({
                    message: 'You have unsaved changes — press Back again to discard',
                    type: 'warning',
                })
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [isDirty])

    // REQ-POL-FE-F-048/049 — Issue Endorsement action
    const handleIssue = useCallback(async () => {
        if (!id || !endorsementId) return
        try {
            await issueEndorsement(id, endorsementId)
            // REQ-POL-FE-F-048 — best-effort endorsement issued event
            const session = getSession()
            post('/api/audit/event', {
                entityType: 'PolicyEndorsement',
                entityId: Number(endorsementId),
                action: 'Endorsement Issued',
                details: {},
            }).catch(() => undefined)
            // REQ-POL-FE-F-049 — cross-post Policy Cancelled for cancellation endorsements
            if (endorsement?.transaction_type === 'Cancellation') {
                postPolicyAudit(Number(id), {
                    action: 'Policy Cancelled',
                    entityType: 'Policy',
                    entityId: Number(id),
                    performedBy: session?.user?.name,
                }).catch(() => undefined)
            }
            addNotification({ message: 'Endorsement issued successfully.', type: 'success' })
            setIsDirty(false)
            navigate(`/policies/${id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to issue endorsement.'
            addNotification({ message: `Issue endorsement failed: ${msg}`, type: 'error' })
        }
    }, [id, endorsementId, endorsement, addNotification, navigate])

    const sidebarSection = useMemo((): SidebarSection => ({
        title: 'Endorsement',
        items: [
            { label: 'Issue Endorsement', icon: FiCheckCircle, event: 'policy:issue-endorsement' },
            { label: 'Back to Policy', icon: FiArrowLeft, to: `/policies/${id}` },
        ],
    }), [id])

    useSidebarSection(sidebarSection)

    useEffect(() => {
        const onIssue = () => handleIssue()
        window.addEventListener('policy:issue-endorsement', onIssue)
        return () => window.removeEventListener('policy:issue-endorsement', onIssue)
    }, [handleIssue])

    // ---------------------------------------------------------------------------
    // Render states
    // ---------------------------------------------------------------------------

    if (loadError) {
        return (
            <div className="p-6 text-sm text-red-600">
                {loadError}{' '}
                <Link to={`/policies/${id}`} className="text-brand-600 hover:underline">
                    Back to Policy
                </Link>
            </div>
        )
    }

    if (!policy) {
        return (
            <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    const inputCls = 'block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500'

    const commission =
        policy.gross_premium != null && policy.net_premium != null
            ? policy.gross_premium - policy.net_premium
            : null

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const s = row as PolicySection
        if (key === '_actions') {
            return (
                <button
                    type="button"
                    title="Open Section"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => navigate(`/policies/${id}/sections/${s.id}`)}
                >
                    <FiSearch size={14} />
                </button>
            )
        }
        if (key === 'reference') {
            return (
                <Link
                    to={`/policies/${id}/sections/${s.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                >
                    {s.reference}
                </Link>
            )
        }
        if (key === 'effective_date') return ((s as unknown as Record<string, unknown>).effective_date as string) || '—'
        if (key === 'days_on_cover') {
            const days = (s as unknown as Record<string, unknown>).days_on_cover
            return days != null ? String(days) : '—'
        }
        if (key === 'limit_loss_qualifier') return ((s as unknown as Record<string, unknown>).limit_loss_qualifier as string) || '—'
        if (key === 'excess_currency') return ((s as unknown as Record<string, unknown>).excess_currency as string) || '—'
        if (key === 'excess_loss_qualifier') return ((s as unknown as Record<string, unknown>).excess_loss_qualifier as string) || '—'
        if (key === 'sum_insured_currency') return ((s as unknown as Record<string, unknown>).sum_insured_currency as string) || '—'
        if (key === 'sum_insured_amount') {
            const sum = (s as unknown as Record<string, unknown>).sum_insured_amount
                ?? (s as unknown as Record<string, unknown>).sum_insured
            return sum != null ? Number(sum).toLocaleString() : '—'
        }
        if (key === 'premium_currency') return ((s as unknown as Record<string, unknown>).premium_currency as string) || '—'
        if (key === 'gross_gross_premium') {
            const ggp = (s as unknown as Record<string, unknown>).gross_gross_premium
            return ggp != null ? Number(ggp).toLocaleString() : '—'
        }
        if (key === 'deductions') {
            const d = (s as unknown as Record<string, unknown>).deductions
            return d != null ? Number(d).toLocaleString() : '—'
        }
        if (key === 'tax_receivable') {
            const tax = (s as unknown as Record<string, unknown>).tax_receivable
            return tax != null ? Number(tax).toLocaleString() : '—'
        }
        if (key === 'annual_gross_premium') {
            const ag = (s as unknown as Record<string, unknown>).annual_gross_premium
                ?? (s as unknown as Record<string, unknown>).annual_gross
            return ag != null ? Number(ag).toLocaleString() : '—'
        }
        if (key === 'annual_net_premium') {
            const an = (s as unknown as Record<string, unknown>).annual_net_premium
                ?? (s as unknown as Record<string, unknown>).annual_net
            return an != null ? Number(an).toLocaleString() : '—'
        }
        if (key === 'time_basis') return ((s as unknown as Record<string, unknown>).time_basis as string) || '—'
        if (key === 'written_order_basis') return ((s as unknown as Record<string, unknown>).written_order_basis as string) || '—'
        if (key === 'signed_order_basis') return ((s as unknown as Record<string, unknown>).signed_order_basis as string) || '—'
        if (key === 'written_line_total') {
            const wl = (s as unknown as Record<string, unknown>).written_line_total
            return wl != null ? Number(wl).toLocaleString() : '—'
        }
        if (key === 'signed_line_total') {
            const sl = (s as unknown as Record<string, unknown>).signed_line_total
            return sl != null ? Number(sl).toLocaleString() : '—'
        }
        if (key === 'delegated_authority_ref') return ((s as unknown as Record<string, unknown>).delegated_authority_ref as string) || '—'
        if (key === 'delegated_authority_section_ref') return ((s as unknown as Record<string, unknown>).delegated_authority_section_ref as string) || '—'
        if (key === 'written_order' || key === 'signed_order') {
            const v = (s as Record<string, unknown>)[key]
            return v != null ? `${v}%` : '—'
        }
        if (key === 'limit_amount' || key === 'gross_premium' || key === 'net_premium') {
            const v = (s as Record<string, unknown>)[key]
            return v != null ? Number(v).toLocaleString() : '—'
        }
        const val = (s as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    async function handleAddSection() {
        if (!id || !policy) return
        try {
            await createPolicySection(id, {
                class_of_business: policy.class_of_business ?? undefined,
                inception_date: policy.inception_date ?? undefined,
                expiry_date: policy.expiry_date ?? undefined,
                limit_currency: policy.policy_currency ?? undefined,
                premium_currency: policy.policy_currency ?? undefined,
                gross_premium: policy.gross_premium ?? undefined,
            })
            const refreshed = await getPolicySections(id)
            setSections(refreshed)
            addNotification({ message: 'Section added.', type: 'success' })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to add section.'
            addNotification({ message: `Add section failed: ${msg}`, type: 'error' })
        }
    }

    const readPolicy = (snake: keyof Policy, camel?: string): string => {
        const val = (policy as unknown as Record<string, unknown>)[snake as string]
            ?? (camel ? (policy as unknown as Record<string, unknown>)[camel] : undefined)
        return val != null && String(val).length > 0 ? String(val) : '—'
    }

    const endorsementColumns: Column[] = SECTION_COLUMNS.map((col) =>
        col.key === '_actions'
            ? {
                ...col,
                label: (
                    <button
                        type="button"
                        title="Add Section"
                        className="text-brand-600 hover:text-brand-800"
                        onClick={handleAddSection}
                    >
                        <FiPlus size={14} />
                    </button>
                ),
            }
            : col
    )

    const policyProduct = (() => {
        const payload = (policy?.payload ?? {}) as Record<string, unknown>
        return (payload.product as Record<string, unknown> | undefined) ?? null
    })()

    return (
        <div className="p-6 flex flex-col gap-4">
            {/* Header — F-026 */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xl font-semibold text-gray-900">{policy.reference}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {endorsement?.transaction_type ?? 'Endorsement'}
                            {endorsement?.sub_type ? ` — ${endorsement.sub_type}` : ''}
                            {endorsement?.effective_date ? ` — Effective ${endorsement.effective_date}` : ''}
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[policy.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {policy.status}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract &amp; Reference</h3>
                        <div>
                            <p className="text-xs text-gray-500">Insured</p>
                            <p className="text-gray-900">{policy.insured ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Class of Business</p>
                            <p className="text-gray-900">{readPolicy('class_of_business', 'classOfBusiness')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Business Type</p>
                            <p className="text-gray-900">{readPolicy('business_type', 'businessType')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">New or Renewal</p>
                            <p className="text-gray-900">{readPolicy('new_or_renewal', 'newOrRenewal')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Currency</p>
                            <p className="text-gray-900">{readPolicy('policy_currency', 'policyCurrency')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Placing Broker</p>
                            <p className="text-gray-900">{readPolicy('placing_broker', 'placingBroker')}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <FieldGroup title="Product">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Product Category</p>
                                    <p className="text-gray-900">{typeof policyProduct?.category === 'string' && policyProduct.category ? policyProduct.category : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Product</p>
                                    <p className="text-gray-900">{typeof policyProduct?.name === 'string' && policyProduct.name ? policyProduct.name : '—'}</p>
                                </div>
                            </div>
                        </FieldGroup>

                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</h3>
                            <div>
                                <p className="text-xs text-gray-500">Inception Date</p>
                                <p className="text-gray-900">{readPolicy('inception_date', 'inceptionDate')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Inception Time</p>
                                <p className="text-gray-900">{readPolicy('inception_time', 'inceptionTime')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Expiry Date</p>
                                <p className="text-gray-900">{readPolicy('expiry_date', 'expiryDate')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Expiry Time</p>
                                <p className="text-gray-900">{readPolicy('expiry_time', 'expiryTime')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">LTA Applicable</p>
                                <p className="text-gray-900">{readPolicy('lta_applicable', 'ltaApplicable')}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract / Placement</h3>
                            <div>
                                <p className="text-xs text-gray-500">Contract Type</p>
                                <p className="text-gray-900">{readPolicy('contract_type', 'contractType')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Method of Placement</p>
                                <p className="text-gray-900">{readPolicy('method_of_placement', 'methodOfPlacement')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Unique Market Reference</p>
                                <p className="text-gray-900">{readPolicy('unique_market_reference', 'uniqueMarketReference')}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Renewal</h3>
                            <div>
                                <p className="text-xs text-gray-500">Renewable</p>
                                <p className="text-gray-900">{readPolicy('renewable_indicator', 'renewable')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Renewal Date</p>
                                <p className="text-gray-900">{readPolicy('renewal_date', 'renewalDate')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Renewal Status</p>
                                <p className="text-gray-900">{readPolicy('renewal_status', 'renewalStatus')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Endorsement Status</p>
                                <p className="text-gray-900">{endorsement?.status ?? '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tabs — F-026: 7 tabs, no Transactions */}
            <TabsNav tabs={ENDORSEMENT_TABS} activeTab={activeTab} onChange={handleTabChange} />

            {activeTab === 'sections' && (
                <Card>
                    {sectionsLoading ? (
                        <div className="flex justify-center p-4"><LoadingSpinner /></div>
                    ) : (
                        <ResizableGrid
                            columns={endorsementColumns}
                            rows={sections}
                            sortConfig={{ key: 'reference', direction: 'asc' }}
                            onSort={() => undefined}
                            renderCell={renderSectionCell}
                            emptyMessage="No sections found."
                            storageKey="table-widths-endorsement-sections"
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
                                onSelect={(p) => { setPlacingBrokerName(p.name); setIsDirty(true) }}
                            />
                            {placingBrokerName && (
                                <p className="text-sm text-gray-700 mt-1">{placingBrokerName}</p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'additional-insureds' && (
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
                        onClick={() => { setAdditionalInsureds((prev) => [...prev, { name: '' }]); setIsDirty(true) }}
                    >
                        + Add Insured
                    </button>
                </Card>
            )}

            {activeTab === 'financial-summary' && (
                <Card title="Financial Summary">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Gross Premium</p>
                            <p className="text-gray-900">
                                {policy.gross_premium != null ? policy.gross_premium.toLocaleString() : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Net Premium</p>
                            <p className="text-gray-900">
                                {policy.net_premium != null ? policy.net_premium.toLocaleString() : '—'}
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
                <Card title="Invoices">
                    <p className="text-sm text-gray-400">Invoices will be available here.</p>
                </Card>
            )}

            {activeTab === 'endorsement' && (
                <Card>
                    <FieldGroup title="Endorsement Details">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label
                                    className="block text-xs text-gray-500 mb-1"
                                    htmlFor="endorsement-effective-date"
                                >
                                    Effective Date
                                </label>
                                <input
                                    id="endorsement-effective-date"
                                    type="date"
                                    aria-label="Effective Date"
                                    className={inputCls}
                                    value={effectiveDate}
                                    onChange={(e) => { setEffectiveDate(e.target.value); setIsDirty(true) }}
                                />
                            </div>
                            <div>
                                <label
                                    className="block text-xs text-gray-500 mb-1"
                                    htmlFor="endorsement-description"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="endorsement-description"
                                    aria-label="Description"
                                    rows={3}
                                    className={inputCls}
                                    value={description}
                                    onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
                                />
                            </div>
                        </div>
                    </FieldGroup>
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
