/**
 * QuoteViewPage — /quotes/:id
 *
 * Requirements: frontend/src/quotes/quotes.requirements.md
 * Tests: frontend/src/quotes/__tests__/quotes.test.tsx
 *
 * REQ-QUO-FE-F-016 — load quote on mount
 * REQ-QUO-FE-F-017 — full header fields panel
 * REQ-QUO-FE-F-018 — editable in Draft only; locked when Quoted/Bound/Declined
 * REQ-QUO-FE-F-019 — PUT save
 * REQ-QUO-FE-F-020 — sidebar actions
 * REQ-QUO-FE-F-021 — load error
 * REQ-QUO-FE-F-022 — submission navigation link
 * REQ-QUO-FE-F-024 — insured search + confirmed/clear UX
 * REQ-QUO-FE-F-025 — submission link/unlink
 * REQ-QUO-FE-F-026 — Year of Account
 * REQ-QUO-FE-F-027 — inception/expiry time fields
 * REQ-QUO-FE-F-028 — LTA toggle + fields
 * REQ-QUO-FE-F-029 — Contract Type lookup
 * REQ-QUO-FE-F-030 — Method of Placement lookup
 * REQ-QUO-FE-F-031 — Unique Market Reference
 * REQ-QUO-FE-F-032 — Renewable indicator + Renewal fields
 * REQ-QUO-FE-F-033 — locked quote banner
 * REQ-QUO-FE-C-003 — dirty-state back-navigation barrier (addNotification)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiSave, FiArrowLeft, FiCheckCircle, FiXCircle, FiCopy, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'
import {
    getQuote,
    updateQuote,
    markQuoteAsQuoted,
    bindQuote,
    declineQuote,
    copyQuote,
    isQuoteEditable,
    getContractTypes,
    getMethodsOfPlacement,
    getRenewalStatuses,
    listSections,
    createSection,
    deleteSection,
    issuePolicy,
} from '@/quotes/quotes.service'
import type { Quote, QuoteSection, CreateSectionInput } from '@/quotes/quotes.service'
import { getSubmission } from '@/submissions/submissions.service'
import type { Submission } from '@/submissions/submissions.service'
import InsuredSearch from '@/parties/InsuredSearch/InsuredSearch'
import BrokerSearch from '@/parties/BrokerSearch/BrokerSearch'
import type { Party } from '@/parties/parties.service'
import SubmissionSearch from '@/submissions/SubmissionSearch/SubmissionSearch'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import { useAudit } from '@/shared/lib/hooks/useAudit'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Quoted: 'bg-blue-100 text-blue-800',
    Bound: 'bg-green-100 text-green-800',
    Declined: 'bg-red-100 text-red-700',
}

const TABS: TabItem[] = [
    { key: 'sections', label: 'Sections' },
    { key: 'brokers', label: 'Brokers' },
    { key: 'additional-insureds', label: 'Additional Insureds' },
    { key: 'financial-summary', label: 'Financial Summary' },
    { key: 'audit', label: 'Audit' },
]

// ---------------------------------------------------------------------------
// Broker state shape
// ---------------------------------------------------------------------------

interface BrokerFields {
    placingBrokerParty: Party | null
    placingBrokerContact: string
    surplusLinesBrokerParty: Party | null
}

// ---------------------------------------------------------------------------
// Financial summary state shape
// ---------------------------------------------------------------------------

interface FinancialsState {
    grossPremium: string
    netPremium: string
    commission: string
}

// ---------------------------------------------------------------------------
// Form shape — all editable fields
// ---------------------------------------------------------------------------

interface FormValues {
    insured: string
    insured_id: number | null
    submission_id: number | null
    year_of_account: string
    business_type: string
    inception_date: string
    inception_time: string
    expiry_date: string
    expiry_time: string
    quote_currency: string
    lta_applicable: boolean
    lta_start_date: string
    lta_start_time: string
    lta_expiry_date: string
    lta_expiry_time: string
    contract_type: string
    method_of_placement: string
    unique_market_reference: string
    renewable_indicator: string
    renewal_date: string
    renewal_status: string
}

function quoteToForm(q: Quote): FormValues {
    return {
        insured: q.insured ?? '',
        insured_id: q.insured_id ? Number(q.insured_id) : null,
        submission_id: q.submission_id ?? null,
        year_of_account: q.year_of_account ?? '',
        business_type: q.business_type ?? '',
        inception_date: q.inception_date ?? '',
        inception_time: q.inception_time ?? '00:00:00',
        expiry_date: q.expiry_date ?? '',
        expiry_time: q.expiry_time ?? '23:59:59',
        quote_currency: q.quote_currency ?? 'USD',
        lta_applicable: q.lta_applicable ?? false,
        lta_start_date: q.lta_start_date ?? '',
        lta_start_time: q.lta_start_time ?? '00:00:00',
        lta_expiry_date: q.lta_expiry_date ?? '',
        lta_expiry_time: q.lta_expiry_time ?? '23:59:59',
        contract_type: q.contract_type ?? '',
        method_of_placement: q.method_of_placement ?? '',
        unique_market_reference: q.unique_market_reference ?? '',
        renewable_indicator: q.renewable_indicator ?? 'No',
        renewal_date: q.renewal_date ?? '',
        renewal_status: q.renewal_status ?? '',
    }
}

// Deterministic comparison for dirty detection (sorted-key serialisation)
function serialise(v: FormValues): string {
    return JSON.stringify(v, Object.keys(v).sort())
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuoteViewPage() {
    const { id } = useParams<{ id: string }>()
    const quoteId = Number(id)
    const navigate = useNavigate()

    const { addNotification, removeNotification } = useNotifications()

    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    const [formValues, setFormValues] = useState<FormValues>({
        insured: '', insured_id: null, submission_id: null,
        year_of_account: '', business_type: '',
        inception_date: '', inception_time: '00:00:00',
        expiry_date: '', expiry_time: '23:59:59',
        quote_currency: 'USD', lta_applicable: false,
        lta_start_date: '', lta_start_time: '00:00:00',
        lta_expiry_date: '', lta_expiry_time: '23:59:59',
        contract_type: '', method_of_placement: '',
        unique_market_reference: '', renewable_indicator: 'No',
        renewal_date: '', renewal_status: '',
    })
    const [savedSnapshot, setSavedSnapshot] = useState('')

    // Insured selection state (F-024)
    const [insuredParty, setInsuredParty] = useState<Party | null>(null)

    // Linked Submission (F-025) — loaded from API for reference display
    const [linkedSubmission, setLinkedSubmission] = useState<Submission | null>(null)

    // Lookup lists (F-029, F-030, F-032)
    const [contractTypes, setContractTypes] = useState<string[]>([])
    const [methodsOfPlacement, setMethodsOfPlacement] = useState<string[]>([])
    const [renewalStatuses, setRenewalStatuses] = useState<string[]>([])

    // Decline modal
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineReasonCode, setDeclineReasonCode] = useState('')
    const [declineReasonText, setDeclineReasonText] = useState('')
    const [declineError, setDeclineError] = useState<string | null>(null)

    // Tabs
    type TabKey = 'sections' | 'brokers' | 'additional-insureds' | 'financial-summary' | 'audit'
    const [activeTab, setActiveTab] = useState<TabKey>('sections')
    const auditLoadedRef = useRef(false)

    // Sections tab state
    const [sections, setSections] = useState<QuoteSection[]>([])
    const [sectionsLoading, setSectionsLoading] = useState(false)
    const [sectionsLoaded, setSectionsLoaded] = useState(false)
    const [sectionsError, setSectionsError] = useState<string | null>(null)
    const [showAddSectionModal, setShowAddSectionModal] = useState(false)
    const [sectionForm, setSectionForm] = useState<CreateSectionInput>({})
    const [sectionSaving, setSectionSaving] = useState(false)
    const [sectionError, setSectionError] = useState<string | null>(null)
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })

    // Additional Insureds tab state — backed by payload.additionalInsured (F-049)
    const [additionalInsuredRows, setAdditionalInsuredRows] = useState<{ name: string }[]>([])
    const { startResize: startResizeInsured, getWidth: getWidthInsured } = useResizableColumns({
        defaultWidths: { name: 400, actions: 100 },
        storageKey: 'table-widths-quote-additional-insureds',
    })

    // Broker tab state (F-048)
    const [brokerFields, setBrokerFields] = useState<BrokerFields>({
        placingBrokerParty: null,
        placingBrokerContact: '',
        surplusLinesBrokerParty: null,
    })

    // Financial Summary tab state (F-050)
    const [financials, setFinancials] = useState<FinancialsState>({
        grossPremium: '',
        netPremium: '',
        commission: '',
    })

    // F-044 — Audit lifecycle tracking
    const { audit, loading: auditLoading, error: auditError, getAudit } = useAudit({
        entityType: 'Quote',
        entityId: quoteId,
        apiBase: '/api/quotes',
        trackVisits: true,
    })

    function handleTabChange(key: string) {
        setActiveTab(key as TabKey)
        // Load audit on first selection
        if (key === 'audit' && !auditLoadedRef.current) {
            auditLoadedRef.current = true
            getAudit()
        }
        // Load sections on first selection
        if (key === 'sections' && !sectionsLoaded) {
            setSectionsLoaded(true)
            setSectionsLoading(true)
            setSectionsError(null)
            listSections(quoteId)
                .then(setSections)
                .catch((err: Error) => {
                    setSectionsError(err.message ?? 'Failed to load sections.')
                    addNotification('Sections could not be loaded. The rest of the quote is unaffected.', 'warning')
                })
                .finally(() => setSectionsLoading(false))
        }
    }

    // Fetch quote on mount; load sections independently so a sections failure
    // does not block the quote page from rendering.
    useEffect(() => {
        setLoading(true)
        setLoadError(null)

        // Quote load is critical — failure shows full-page error
        getQuote(quoteId)
            .then((q) => {
                setQuote(q)
                const initial = quoteToForm(q)
                setFormValues(initial)
                setSavedSnapshot(serialise(initial))
                if (q.insured_id) {
                    setInsuredParty({ id: Number(q.insured_id), name: q.insured, type: 'Insured', orgCode: q.created_by_org_code })
                }
                // Load payload-backed state
                const pl = (q.payload ?? {}) as Record<string, unknown>
                // F-049 — additional insured rows
                const ai = pl.additionalInsured
                if (Array.isArray(ai)) setAdditionalInsuredRows(ai as { name: string }[])
                // F-048 — broker fields
                if (pl.placingBrokerId) {
                    setBrokerFields((prev) => ({
                        ...prev,
                        placingBrokerParty: {
                            id: Number(pl.placingBrokerId),
                            name: String(pl.placingBrokerName ?? ''),
                            type: 'Broker',
                            orgCode: '',
                        },
                        placingBrokerContact: String(pl.placingBrokerContact ?? ''),
                    }))
                }
                if (pl.surplusLinesBrokerId) {
                    setBrokerFields((prev) => ({
                        ...prev,
                        surplusLinesBrokerParty: {
                            id: Number(pl.surplusLinesBrokerId),
                            name: String(pl.surplusLinesBrokerName ?? ''),
                            type: 'Broker',
                            orgCode: '',
                        },
                    }))
                }
                // F-050 — financial summary
                const fin = pl.financials as Record<string, unknown> | undefined
                if (fin) {
                    setFinancials({
                        grossPremium: fin.grossPremium != null ? String(fin.grossPremium) : '',
                        netPremium: fin.netPremium != null ? String(fin.netPremium) : '',
                        commission: fin.commission != null ? String(fin.commission) : '',
                    })
                }
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load quote.'
                setLoadError(msg)
                addNotification(`Could not load quote: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))

        // Sections load is non-critical — failure shows an error inside the tab
        setSectionsLoading(true)
        setSectionsError(null)
        listSections(quoteId)
            .then((secs) => { setSections(secs); setSectionsLoaded(true) })
            .catch((err: Error) => {
                setSectionsLoaded(true)
                setSectionsError(err.message ?? 'Failed to load sections.')
                addNotification('Sections could not be loaded. The rest of the quote is unaffected.', 'warning')
            })
            .finally(() => setSectionsLoading(false))
    }, [quoteId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch linked submission for reference display whenever submission_id changes
    useEffect(() => {
        const sid = formValues.submission_id
        if (!sid) { setLinkedSubmission(null); return }
        if (linkedSubmission?.id === sid) return
        getSubmission(sid)
            .then(setLinkedSubmission)
            .catch(() => setLinkedSubmission(null))
    }, [formValues.submission_id]) // eslint-disable-line react-hooks/exhaustive-deps

    const editable = quote ? isQuoteEditable(quote.status) : false

    // F-033 — show locked notification (replaces in-page banner) and remove on unmount
    useEffect(() => {
        if (!quote || editable) return
        const clientId = `quote-${quoteId}-locked`
        addNotification('This quote is locked and cannot be edited.', 'warning', { id: clientId })
        return () => { void removeNotification(clientId) }
    }, [quote?.id, editable]) // eslint-disable-line react-hooks/exhaustive-deps

    // Load lookups (F-029, F-030, F-032)
    useEffect(() => {
        getContractTypes().then(setContractTypes).catch(() => setContractTypes([]))
        getMethodsOfPlacement().then(setMethodsOfPlacement).catch(() => setMethodsOfPlacement([]))
        getRenewalStatuses().then(setRenewalStatuses).catch(() => setRenewalStatuses([]))
    }, [])

    const isDirty = savedSnapshot !== '' && serialise(formValues) !== savedSnapshot

    // ---------------------------------------------------------------------------
    // C-003 — Back-navigation barrier while dirty
    // ---------------------------------------------------------------------------

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
                addNotificationRef.current('You have unsaved changes — press Back again to discard', 'warning')
            }
            // second press: listener removed by cleanup, navigation proceeds
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [isDirty])

    // ---------------------------------------------------------------------------
    // Sidebar section — items depend on quote state
    // ---------------------------------------------------------------------------

    // Build sidebar section — useMemo ensures a stable reference (changes only when
    // editable or quote changes), satisfying the useSidebarSection stable-ref contract.
    const sidebarSection = useMemo((): SidebarSection => {
        const items: SidebarSection['items'] = []
        if (editable) {
            items.push({ label: 'Save', icon: FiSave, event: 'submission:save' })
        }
        if (quote?.status === 'Draft') {
            items.push({ label: 'Issue Quote', icon: FiCheckCircle, event: 'quote:mark-quoted' })
        }
        if (quote?.status === 'Quoted') {
            items.push({ label: 'Bind Quote', icon: FiCheckCircle, event: 'quote:bind' })
        }
        if (quote && !['Bound', 'Declined'].includes(quote.status)) {
            items.push({ label: 'Decline Quote', icon: FiXCircle, event: 'quote:decline' })
        }
        // Issue Policy when Bound
        if (quote?.status === 'Bound') {
            items.push({ label: 'Issue Policy', icon: FiCheckCircle, event: 'quote:issue-policy' })
        }
        // Copy Quote available in all states
        if (quote) {
            items.push({ label: 'Copy Quote', icon: FiCopy, event: 'quote:copy' })
        }
        if (quote?.submission_id) {
            items.push({ label: 'Back to Submission', icon: FiArrowLeft, to: `/submissions/${quote.submission_id}` })
        }
        return { title: 'Quote', items }
    }, [editable, quote])

    useSidebarSection(sidebarSection)

    // ---------------------------------------------------------------------------
    // DOM event handlers
    // ---------------------------------------------------------------------------

    const handleSave = useCallback(async () => {
        if (!quote || !editable) return
        if (!formValues.submission_id) {
            setActionError('A linked submission is required before saving.')
            addNotification('Quote not saved: a linked submission is required.', 'error')
            return
        }
        setActionError(null)
        try {
            const updatedPayload: Record<string, unknown> = {
                ...(quote.payload ?? {}),
                // F-048 — broker fields
                placingBrokerId: brokerFields.placingBrokerParty?.id ?? null,
                placingBrokerName: brokerFields.placingBrokerParty?.name ?? null,
                placingBrokerContact: brokerFields.placingBrokerContact || null,
                surplusLinesBrokerId: brokerFields.surplusLinesBrokerParty?.id ?? null,
                surplusLinesBrokerName: brokerFields.surplusLinesBrokerParty?.name ?? null,
                // F-049 — additional insured
                additionalInsured: additionalInsuredRows,
                // F-050 — financials
                financials: {
                    grossPremium: financials.grossPremium || null,
                    netPremium: financials.netPremium || null,
                    commission: financials.commission || null,
                },
            }
            const updated = await updateQuote(quoteId, { ...formValues, payload: updatedPayload })
            setQuote(updated)
            const next = quoteToForm(updated)
            setFormValues(next)
            setSavedSnapshot(serialise(next))
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save.'
            setActionError(msg)
            addNotification(`Quote save failed: ${msg}`, 'error')
        }
    }, [quote, editable, quoteId, formValues, brokerFields, additionalInsuredRows, financials, addNotification])

    const handleMarkQuoted = useCallback(async () => {
        if (!quote) return
        if (!formValues.submission_id) {
            addNotification('Cannot issue quote: a linked submission is required.', 'error')
            return
        }
        setActionError(null)
        try {
            const updated = await markQuoteAsQuoted(quoteId)
            setQuote(updated)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to mark as Quoted.'
            setActionError(msg)
            addNotification(`Failed to mark as Quoted: ${msg}`, 'error')
        }
    }, [quote, quoteId, formValues.submission_id, addNotification])

    const handleBind = useCallback(async () => {
        if (!quote) return
        setActionError(null)
        try {
            const updated = await bindQuote(quoteId)
            setQuote(updated)
            addNotification('Quote bound. Any other quotes on this submission have been declined.', 'success')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to bind.'
            setActionError(msg)
            addNotification(`Bind failed: ${msg}`, 'error')
        }
    }, [quote, quoteId, addNotification])

    const handleCopyQuote = useCallback(async () => {
        if (!quote) return
        try {
            const copied = await copyQuote(quoteId)
            addNotification(`Quote copied — new reference: ${copied.reference}`, 'success')
            navigate(`/quotes/${copied.id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to copy quote.'
            addNotification(`Copy failed: ${msg}`, 'error')
        }
    }, [quote, quoteId, addNotification, navigate])

    const handleIssuePolicy = useCallback(async () => {
        if (!quote) return
        try {
            const policy = await issuePolicy(quoteId)
            addNotification(`Policy created: ${policy.reference}`, 'success')
            navigate(`/policies/${policy.id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to issue policy.'
            addNotification(`Issue Policy failed: ${msg}`, 'error')
        }
    }, [quote, quoteId, addNotification, navigate])

    const handleDeclineSubmit = useCallback(async () => {
        if (!declineReasonCode.trim()) {
            setDeclineError('Reason code is required.')
            return
        }
        setDeclineError(null)
        try {
            const updated = await declineQuote(quoteId, declineReasonCode, declineReasonText)
            setQuote(updated)
            setShowDeclineModal(false)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to decline.'
            setDeclineError(msg)
            addNotification(`Decline failed: ${msg}`, 'error')
        }
    }, [quoteId, declineReasonCode, declineReasonText, addNotification])

    // Register DOM event listeners
    useEffect(() => {
        const onSave = () => handleSave()
        const onMarkQuoted = () => handleMarkQuoted()
        const onBind = () => handleBind()
        const onDecline = () => setShowDeclineModal(true)
        const onCopy = () => handleCopyQuote()
        const onIssuePolicy = () => handleIssuePolicy()

        const onAddSection = () => { setSectionForm({}); setSectionError(null); setShowAddSectionModal(true) }

        window.addEventListener('submission:save', onSave)
        window.addEventListener('quote:mark-quoted', onMarkQuoted)
        window.addEventListener('quote:bind', onBind)
        window.addEventListener('quote:decline', onDecline)
        window.addEventListener('quote:copy', onCopy)
        window.addEventListener('quote:issue-policy', onIssuePolicy)
        window.addEventListener('quote:add-section', onAddSection)

        return () => {
            window.removeEventListener('submission:save', onSave)
            window.removeEventListener('quote:mark-quoted', onMarkQuoted)
            window.removeEventListener('quote:bind', onBind)
            window.removeEventListener('quote:decline', onDecline)
            window.removeEventListener('quote:copy', onCopy)
            window.removeEventListener('quote:issue-policy', onIssuePolicy)
            window.removeEventListener('quote:add-section', onAddSection)
        }
    }, [handleSave, handleMarkQuoted, handleBind, handleCopyQuote, handleIssuePolicy])

    // Sections: add handler
    const handleAddSection = useCallback(async () => {
        setSectionSaving(true)
        setSectionError(null)
        try {
            const created = await createSection(quoteId, sectionForm)
            setSections((prev) => [...prev, created])
            setSectionForm({})
            setShowAddSectionModal(false)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to add section.'
            setSectionError(msg)
        } finally {
            setSectionSaving(false)
        }
    }, [quoteId, sectionForm])

    // Sections: delete handler
    const handleDeleteSection = useCallback(async (sectionId: number) => {
        try {
            await deleteSection(quoteId, sectionId)
            setSections((prev) => prev.filter((s) => s.id !== sectionId))
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete section.'
            addNotification(`Delete section failed: ${msg}`, 'error')
        }
    }, [quoteId, addNotification])

    // Additional Insureds: add/remove rows (no immediate API save — saved on sidebar Save per F-049)
    const handleAddAdditionalInsuredRow = useCallback(() => {
        setAdditionalInsuredRows((prev) => [...prev, { name: '' }])
    }, [])

    const handleChangeAdditionalInsuredRow = useCallback((idx: number, name: string) => {
        setAdditionalInsuredRows((prev) => prev.map((r, i) => i === idx ? { name } : r))
    }, [])

    const handleRemoveAdditionalInsuredRow = useCallback((idx: number) => {
        setAdditionalInsuredRows((prev) => prev.filter((_, i) => i !== idx))
    }, [])

    // Inception date ? auto-default expiry to +365 days
    useEffect(() => {
        if (!editable || !formValues.inception_date || formValues.expiry_date) return
        const d = new Date(formValues.inception_date)
        d.setDate(d.getDate() + 365)
        setFormValues((v) => ({ ...v, expiry_date: d.toISOString().slice(0, 10) }))
    }, [formValues.inception_date]) // eslint-disable-line react-hooks/exhaustive-deps

    // LTA toggle — auto-populate LTA dates from quote inception/expiry when toggled on
    useEffect(() => {
        if (!editable || !formValues.lta_applicable) return
        setFormValues((v) => ({
            ...v,
            lta_start_date: v.lta_start_date || v.inception_date,
            lta_start_time: v.lta_start_time || v.inception_time,
            lta_expiry_date: v.lta_expiry_date || v.expiry_date,
            lta_expiry_time: v.lta_expiry_time || v.expiry_time,
        }))
    }, [formValues.lta_applicable]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---------------------------------------------------------------------------
    // Render states
    // ---------------------------------------------------------------------------

    if (loading) {
        return <div className="p-6 text-sm text-gray-400">Loading quote—</div>
    }

    if (loadError) {
        return <div className="p-6 text-sm text-red-600">{loadError}</div>
    }

    if (!quote) return null

    const field = (label: string, content: React.ReactNode) => (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            {content}
        </div>
    )

    const readText = (val: string | null | undefined) => (
        <p className="text-sm text-gray-900">{val || '—'}</p>
    )

    const inputCls = 'block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500'

    return (
        <div className="p-6 flex flex-col gap-4">
            {/* Unsaved changes indicator */}
            {isDirty && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                    You have unsaved changes.
                </div>
            )}

            {/* Action error */}
            {actionError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                    {actionError}
                </div>
            )}

            {/* F-035 / F-036 — Always-visible form in two-column FieldGroup layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Left column */}
                <div className="flex flex-col gap-4">
                    {/* F-037 — Quote & Referencing */}
                    <FieldGroup title="Quote & Referencing">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Reference</p>
                                    <p className="text-base font-semibold text-gray-900">{quote.reference}</p>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[quote.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {quote.status}
                                </span>
                            </div>

                            {/* F-025 — Submission */}
                            <div>
                                {field('Linked Submission',
                                    editable ? (
                                        linkedSubmission ? (
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/submissions/${linkedSubmission.id}`}
                                                    className="text-sm text-brand-600 hover:text-brand-800 hover:underline flex-1"
                                                >
                                                    {linkedSubmission.reference}
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setLinkedSubmission(null)
                                                        setFormValues((v) => ({ ...v, submission_id: null }))
                                                    }}
                                                    className="text-xs text-red-600 hover:text-red-800"
                                                >
                                                    Unlink
                                                </button>
                                            </div>
                                        ) : (
                                            <div data-testid="submission-unconfirmed" className="border border-red-500 ring-1 ring-red-400 rounded p-2">
                                                <SubmissionSearch
                                                    hideLabel
                                                    onSelect={(s) => {
                                                        setLinkedSubmission(s)
                                                        setFormValues((v) => ({ ...v, submission_id: s.id }))
                                                    }}
                                                />
                                                <p className="text-xs text-red-500 mt-1">Submission not confirmed — please search and select</p>
                                            </div>
                                        )
                                    ) : linkedSubmission ? (
                                        <Link
                                            to={`/submissions/${linkedSubmission.id}`}
                                            className="text-sm text-brand-600 hover:text-brand-800 hover:underline"
                                        >
                                            {linkedSubmission.reference}
                                        </Link>
                                    ) : quote.submission_id ? (
                                        <span className="text-sm text-gray-500">Loading…</span>
                                    ) : readText(null)
                                )}
                            </div>

                            {/* F-026 — Year of Account */}
                            {field('Year of Account',
                                editable
                                    ? <input aria-label="Year of Account" type="text" value={formValues.year_of_account} onChange={(e) => setFormValues((v) => ({ ...v, year_of_account: e.target.value }))} className={inputCls} />
                                    : readText(quote.year_of_account)
                            )}

                            {/* Business Type */}
                            {field('Business Type',
                                editable
                                    ? <select aria-label="Business Type" value={formValues.business_type} onChange={(e) => setFormValues((v) => ({ ...v, business_type: e.target.value }))} className={inputCls}>
                                        <option value="">— Select —</option>
                                        <option value="Insurance">Insurance</option>
                                        <option value="Reinsurance">Reinsurance</option>
                                    </select>
                                    : readText(quote.business_type)
                            )}

                            {/* Quote Currency */}
                            {field('Quote Currency',
                                editable
                                    ? <input aria-label="Quote Currency" type="text" value={formValues.quote_currency} onChange={(e) => setFormValues((v) => ({ ...v, quote_currency: e.target.value.toUpperCase() }))} maxLength={8} className={inputCls} />
                                    : readText(quote.quote_currency)
                            )}
                        </div>
                    </FieldGroup>

                    {/* F-038 / F-024 — Insured */}
                    <FieldGroup title="Insured">
                        {editable ? (
                            insuredParty ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900 flex-1">{insuredParty.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setInsuredParty(null)
                                            setFormValues((v) => ({ ...v, insured: '', insured_id: null }))
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800"
                                    >
                                        Clear
                                    </button>
                                </div>
                            ) : (
                                <div data-testid="insured-unconfirmed" className="border border-red-500 ring-1 ring-red-400 rounded p-2">
                                    <InsuredSearch
                                        hideLabel
                                        selectedParty={null}
                                        onSelect={(party: Party) => {
                                            setInsuredParty(party)
                                            setFormValues((v) => ({ ...v, insured: party.name, insured_id: party.id }))
                                        }}
                                    />
                                    <p className="text-xs text-red-500 mt-1">Insured not confirmed — please search and select</p>
                                </div>
                            )
                        ) : (
                            readText(quote.insured)
                        )}
                    </FieldGroup>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    {/* F-039 — Dates */}
                    <FieldGroup title="Dates">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                {field('Inception Date',
                                    editable
                                        ? <input id="inception-date" aria-label="Inception Date" type="date" value={formValues.inception_date} onChange={(e) => setFormValues((v) => ({ ...v, inception_date: e.target.value }))} className={inputCls} />
                                        : readText(quote.inception_date)
                                )}
                                {field('Inception Time',
                                    editable
                                        ? <input aria-label="Inception Time" type="time" step="1" value={formValues.inception_time} onChange={(e) => setFormValues((v) => ({ ...v, inception_time: e.target.value }))} className={inputCls} />
                                        : readText(quote.inception_time)
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {field('Expiry Date',
                                    editable
                                        ? <input id="expiry-date" aria-label="Expiry Date" type="date" value={formValues.expiry_date} onChange={(e) => setFormValues((v) => ({ ...v, expiry_date: e.target.value }))} className={inputCls} />
                                        : readText(quote.expiry_date)
                                )}
                                {field('Expiry Time',
                                    editable
                                        ? <input aria-label="Expiry Time" type="time" step="1" value={formValues.expiry_time} onChange={(e) => setFormValues((v) => ({ ...v, expiry_time: e.target.value }))} className={inputCls} />
                                        : readText(quote.expiry_time)
                                )}
                            </div>

                            {/* F-028 — LTA Applicable */}
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    aria-label="LTA Applicable"
                                    checked={formValues.lta_applicable}
                                    disabled={!editable}
                                    onChange={(e) => {
                                        const on = e.target.checked
                                        setFormValues((v) => ({
                                            ...v,
                                            lta_applicable: on,
                                            lta_start_date: on ? (v.lta_start_date || v.inception_date) : '',
                                            lta_start_time: on ? (v.lta_start_time || v.inception_time) : '00:00:00',
                                            lta_expiry_date: on ? (v.lta_expiry_date || v.expiry_date) : '',
                                            lta_expiry_time: on ? (v.lta_expiry_time || v.expiry_time) : '23:59:59',
                                        }))
                                    }}
                                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                LTA Applicable
                            </label>

                            {/* F-028 — LTA date/time fields */}
                            {formValues.lta_applicable && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        {field('LTA Start Date',
                                            editable
                                                ? <input aria-label="LTA Start Date" type="date" value={formValues.lta_start_date} onChange={(e) => setFormValues((v) => ({ ...v, lta_start_date: e.target.value }))} className={inputCls} />
                                                : readText(quote.lta_start_date)
                                        )}
                                        {field('LTA Start Time',
                                            editable
                                                ? <input aria-label="LTA Start Time" type="time" step="1" value={formValues.lta_start_time} onChange={(e) => setFormValues((v) => ({ ...v, lta_start_time: e.target.value }))} className={inputCls} />
                                                : readText(quote.lta_start_time)
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {field('LTA Expiry Date',
                                            editable
                                                ? <input aria-label="LTA Expiry Date" type="date" value={formValues.lta_expiry_date} onChange={(e) => setFormValues((v) => ({ ...v, lta_expiry_date: e.target.value }))} className={inputCls} />
                                                : readText(quote.lta_expiry_date)
                                        )}
                                        {field('LTA Expiry Time',
                                            editable
                                                ? <input aria-label="LTA Expiry Time" type="time" step="1" value={formValues.lta_expiry_time} onChange={(e) => setFormValues((v) => ({ ...v, lta_expiry_time: e.target.value }))} className={inputCls} />
                                                : readText(quote.lta_expiry_time)
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </FieldGroup>

                    {/* F-040 — Contract / Placement */}
                    <FieldGroup title="Contract / Placement">
                        <div className="flex flex-col gap-3">
                            {/* F-029 */}
                            {field('Contract Type',
                                editable
                                    ? <select aria-label="Contract Type" value={formValues.contract_type} onChange={(e) => setFormValues((v) => ({ ...v, contract_type: e.target.value }))} className={inputCls}>
                                        <option value="">— Select —</option>
                                        {contractTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                                    </select>
                                    : readText(quote.contract_type)
                            )}
                            {/* F-030 */}
                            {field('Method of Placement',
                                editable
                                    ? <select aria-label="Method of Placement" value={formValues.method_of_placement} onChange={(e) => setFormValues((v) => ({ ...v, method_of_placement: e.target.value }))} className={inputCls}>
                                        <option value="">— Select —</option>
                                        {methodsOfPlacement.map((mp) => <option key={mp} value={mp}>{mp}</option>)}
                                    </select>
                                    : readText(quote.method_of_placement)
                            )}
                            {/* F-031 */}
                            {field('Unique Market Reference',
                                editable
                                    ? <input aria-label="Unique Market Reference" type="text" value={formValues.unique_market_reference} onChange={(e) => setFormValues((v) => ({ ...v, unique_market_reference: e.target.value }))} className={inputCls} />
                                    : readText(quote.unique_market_reference)
                            )}
                        </div>
                    </FieldGroup>

                    {/* F-041 — Renewal */}
                    <FieldGroup title="Renewal">
                        <div className="flex flex-col gap-3">
                            {field('Renewable',
                                editable
                                    ? <select aria-label="Renewable" value={formValues.renewable_indicator} onChange={(e) => setFormValues((v) => ({ ...v, renewable_indicator: e.target.value, renewal_date: e.target.value === 'No' ? '' : v.renewal_date, renewal_status: e.target.value === 'No' ? '' : v.renewal_status }))} className={inputCls}>
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                    : readText(quote.renewable_indicator)
                            )}
                            {formValues.renewable_indicator === 'Yes' && (
                                <>
                                    {field('Renewal Date',
                                        editable
                                            ? <input aria-label="Renewal Date" type="date" value={formValues.renewal_date} onChange={(e) => setFormValues((v) => ({ ...v, renewal_date: e.target.value }))} className={inputCls} />
                                            : readText(quote.renewal_date)
                                    )}
                                    {field('Renewal Status',
                                        editable
                                            ? <select aria-label="Renewal Status" value={formValues.renewal_status} onChange={(e) => setFormValues((v) => ({ ...v, renewal_status: e.target.value }))} className={inputCls}>
                                                <option value="">— Select —</option>
                                                {renewalStatuses.map((rs) => <option key={rs} value={rs}>{rs}</option>)}
                                            </select>
                                            : readText(quote.renewal_status)
                                    )}
                                </>
                            )}
                        </div>
                    </FieldGroup>
                </div>
            </div>

            {/* F-034 — Tab navigation */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

            {/* ----------------------------------------------------------------
                Sections tab
            ---------------------------------------------------------------- */}
            {activeTab === 'sections' && (
                <Card>
                    <div className="p-4 flex flex-col gap-3">

                        {sectionsLoading ? (
                            <p className="text-sm text-gray-400 py-4 text-center">Loading sections…</p>
                        ) : sectionsError ? (
                            <div className="flex flex-col items-center gap-2 py-8">
                                <p className="text-sm text-red-600 font-medium">Could not load sections</p>
                                <p className="text-xs text-gray-500">{sectionsError}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSectionsError(null)
                                        setSectionsLoading(true)
                                        listSections(quoteId)
                                            .then((secs) => { setSections(secs); setSectionsLoaded(true) })
                                            .catch((err: Error) => {
                                                setSectionsError(err.message ?? 'Failed to load sections.')
                                                addNotification('Sections could not be loaded. The rest of the quote is unaffected.', 'warning')
                                            })
                                            .finally(() => setSectionsLoading(false))
                                    }}
                                    className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <ResizableGrid
                                storageKey="table-widths-quote-sections"
                                columns={[
                                    {
                                        key: 'actions',
                                        label: editable ? (
                                            <button
                                                type="button"
                                                title="Add Section"
                                                className="text-brand-600 hover:text-brand-800"
                                                onClick={() => { setSectionForm({}); setSectionError(null); setShowAddSectionModal(true) }}
                                            >
                                                <FiPlus size={14} />
                                            </button>
                                        ) : '',
                                        defaultWidth: 72,
                                    },
                                    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 120 },
                                    { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 200 },
                                    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
                                    { key: 'expiry_date', label: 'Expiry Date', defaultWidth: 130 },
                                    { key: 'limit_currency', label: 'Limit Currency', defaultWidth: 120 },
                                    { key: 'limit_amount', label: 'Limit Amount', defaultWidth: 150 },
                                    { key: 'limit_loss_qualifier', label: 'Limit Loss Qualifier', defaultWidth: 160 },
                                    { key: 'excess_currency', label: 'Excess Currency', defaultWidth: 120 },
                                    { key: 'excess_amount', label: 'Excess Amount', defaultWidth: 150 },
                                    { key: 'excess_loss_qualifier', label: 'Excess Loss Qualifier', defaultWidth: 160 },
                                    { key: 'sum_insured_currency', label: 'Sum Insured Currency', defaultWidth: 160 },
                                    { key: 'sum_insured_amount', label: 'Sum Insured', defaultWidth: 150 },
                                    { key: 'premium_currency', label: 'Premium Currency', defaultWidth: 140 },
                                    { key: 'gross_gross_premium', label: 'Gross Gross Premium', defaultWidth: 180 },
                                    { key: 'gross_premium', label: 'Gross Premium', defaultWidth: 160 },
                                    { key: 'deductions', label: 'Deductions', defaultWidth: 140 },
                                    { key: 'net_premium', label: 'Net Premium', defaultWidth: 140 },
                                    { key: 'annual_gross_premium', label: 'Annual Gross Premium', defaultWidth: 180 },
                                    { key: 'annual_net_premium', label: 'Annual Net Premium', defaultWidth: 180 },
                                    { key: 'written_order', label: 'Written Order %', defaultWidth: 130 },
                                    { key: 'signed_order', label: 'Signed Order %', defaultWidth: 130 },
                                ]}
                                rows={[...sections].sort((a, b) => {
                                    const dir = sectionSort.direction === 'asc' ? 1 : -1
                                    const k = sectionSort.key as keyof QuoteSection
                                    const av = (a[k] ?? '') as string
                                    const bv = (b[k] ?? '') as string
                                    return av < bv ? -dir : av > bv ? dir : 0
                                })}
                                sortConfig={sectionSort}
                                onRequestSort={(key) =>
                                    setSectionSort((prev) => ({
                                        key,
                                        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                                    }))
                                }
                                rowKey={(row) => (row as QuoteSection).id}
                                emptyMessage="No sections found."
                                renderCell={(key, row) => {
                                    const s = row as QuoteSection
                                    if (key === 'actions') {
                                        return (
                                            <span className="flex items-center gap-2">
                                                <Link
                                                    to={`/quotes/${quoteId}/sections/${s.id}`}
                                                    className="text-gray-500 hover:text-gray-700"
                                                    title="Open Section"
                                                >
                                                    <FiSearch size={14} />
                                                </Link>
                                                {editable && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSection(s.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                        title="Delete Section"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        )
                                    }
                                    if (key === 'reference') {
                                        return (
                                            <Link
                                                to={`/quotes/${quoteId}/sections/${s.id}`}
                                                className="text-brand-600 hover:text-brand-800 font-medium"
                                            >
                                                {s.reference}
                                            </Link>
                                        )
                                    }
                                    if (key === 'class_of_business') return s.class_of_business || '—'
                                    if (key === 'inception_date') return s.inception_date || '—'
                                    if (key === 'expiry_date') return s.expiry_date || '—'
                                    if (key === 'limit_currency') return s.limit_currency || '—'
                                    if (key === 'limit_amount') return s.limit_amount != null ? Number(s.limit_amount).toLocaleString() : '—'
                                    if (key === 'limit_loss_qualifier') return s.limit_loss_qualifier || '—'
                                    if (key === 'excess_currency') return s.excess_currency || '—'
                                    if (key === 'excess_amount') return s.excess_amount != null ? Number(s.excess_amount).toLocaleString() : '—'
                                    if (key === 'excess_loss_qualifier') return s.excess_loss_qualifier || '—'
                                    if (key === 'sum_insured_currency') return s.sum_insured_currency || '—'
                                    if (key === 'sum_insured_amount') return s.sum_insured_amount != null ? Number(s.sum_insured_amount).toLocaleString() : '—'
                                    if (key === 'premium_currency') return s.premium_currency || '—'
                                    if (key === 'gross_gross_premium') return s.gross_gross_premium != null ? Number(s.gross_gross_premium).toLocaleString() : '—'
                                    if (key === 'gross_premium') return s.gross_premium != null ? Number(s.gross_premium).toLocaleString() : '—'
                                    if (key === 'deductions') return s.deductions != null ? Number(s.deductions).toLocaleString() : '—'
                                    if (key === 'net_premium') return s.net_premium != null ? Number(s.net_premium).toLocaleString() : '—'
                                    if (key === 'annual_gross_premium') return s.annual_gross_premium != null ? Number(s.annual_gross_premium).toLocaleString() : '—'
                                    if (key === 'annual_net_premium') return s.annual_net_premium != null ? Number(s.annual_net_premium).toLocaleString() : '—'
                                    if (key === 'written_order') return s.written_order != null ? `${s.written_order}%` : '—'
                                    if (key === 'signed_order') return s.signed_order != null ? `${s.signed_order}%` : '—'
                                    return null
                                }}
                            />
                        )}
                    </div>
                </Card>
            )}

            {/* ----------------------------------------------------------------
                Brokers tab
            ---------------------------------------------------------------- */}
            {activeTab === 'brokers' && (
                <Card>
                    <div className="p-4 flex flex-col gap-6">
                        {/* Placing Broker sub-section */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Placing Broker</h4>
                            {editable ? (
                                brokerFields.placingBrokerParty ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-900 flex-1">{brokerFields.placingBrokerParty.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setBrokerFields((b) => ({ ...b, placingBrokerParty: null, placingBrokerContact: '' }))}
                                            className="text-xs text-red-600 hover:text-red-800"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                ) : (
                                    <BrokerSearch
                                        onSelect={(party) => setBrokerFields((b) => ({ ...b, placingBrokerParty: party }))}
                                    />
                                )
                            ) : (
                                <p className="text-sm text-gray-900">
                                    {brokerFields.placingBrokerParty?.name || (quote.payload?.placingBrokerName as string) || '—'}
                                </p>
                            )}
                            {/* Broker Contact text input */}
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Broker Contact</label>
                                {editable ? (
                                    <input
                                        type="text"
                                        value={brokerFields.placingBrokerContact}
                                        onChange={(e) => setBrokerFields((b) => ({ ...b, placingBrokerContact: e.target.value }))}
                                        className={inputCls}
                                        placeholder="Contact name"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{brokerFields.placingBrokerContact || '—'}</p>
                                )}
                            </div>
                        </div>

                        {/* Surplus Lines Broker sub-section */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Surplus Lines Broker</h4>
                            {editable ? (
                                brokerFields.surplusLinesBrokerParty ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-900 flex-1">{brokerFields.surplusLinesBrokerParty.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setBrokerFields((b) => ({ ...b, surplusLinesBrokerParty: null }))}
                                            className="text-xs text-red-600 hover:text-red-800"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                ) : (
                                    <BrokerSearch
                                        onSelect={(party) => setBrokerFields((b) => ({ ...b, surplusLinesBrokerParty: party }))}
                                    />
                                )
                            ) : (
                                <p className="text-sm text-gray-900">
                                    {brokerFields.surplusLinesBrokerParty?.name || (quote.payload?.surplusLinesBrokerName as string) || '—'}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* ----------------------------------------------------------------
                Additional Insureds tab
            ---------------------------------------------------------------- */}
            {activeTab === 'additional-insureds' && (
                <Card>
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Additional Insureds</h3>
                            {editable && (
                                <button
                                    type="button"
                                    onClick={handleAddAdditionalInsuredRow}
                                    className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700"
                                >
                                    + Add
                                </button>
                            )}
                        </div>
                        <div className="table-wrapper overflow-x-auto">
                            <table className="app-table w-full" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: getWidthInsured('name') }} />
                                    {editable && <col style={{ width: getWidthInsured('actions') }} />}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ position: 'relative' }}>
                                            Name
                                            <span
                                                className="col-resizer"
                                                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                onMouseDown={(e) => startResizeInsured('name', e)}
                                            />
                                        </th>
                                        {editable && (
                                            <th style={{ position: 'relative' }}>
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResizeInsured('actions', e)}
                                                />
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {additionalInsuredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={editable ? 2 : 1} className="text-center text-gray-400 italic py-4">
                                                No additional insured parties listed.
                                            </td>
                                        </tr>
                                    ) : (
                                        additionalInsuredRows.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {editable ? (
                                                        <input
                                                            type="text"
                                                            value={row.name}
                                                            onChange={(e) => handleChangeAdditionalInsuredRow(idx, e.target.value)}
                                                            className={inputCls}
                                                            placeholder="Party name"
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-gray-900">{row.name || '—'}</span>
                                                    )}
                                                </td>
                                                {editable && (
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAdditionalInsuredRow(idx)}
                                                            className="text-xs text-red-600 hover:text-red-800"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}

            {/* ----------------------------------------------------------------
                Financial Summary tab
            ---------------------------------------------------------------- */}
            {activeTab === 'financial-summary' && (
                <Card>
                    <div className="p-4 flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-gray-700">Financial Summary</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="fin-gross-premium" className="block text-xs text-gray-500 mb-0.5">Gross Premium</label>
                                <input
                                    id="fin-gross-premium"
                                    aria-label="Gross Premium"
                                    type="number"
                                    step="0.01"
                                    value={financials.grossPremium}
                                    onChange={(e) => setFinancials((f) => ({ ...f, grossPremium: e.target.value }))}
                                    disabled={!editable}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label htmlFor="fin-net-premium" className="block text-xs text-gray-500 mb-0.5">Net Premium</label>
                                <input
                                    id="fin-net-premium"
                                    aria-label="Net Premium"
                                    type="number"
                                    step="0.01"
                                    value={financials.netPremium}
                                    onChange={(e) => setFinancials((f) => ({ ...f, netPremium: e.target.value }))}
                                    disabled={!editable}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label htmlFor="fin-commission" className="block text-xs text-gray-500 mb-0.5">Commission</label>
                                <input
                                    id="fin-commission"
                                    aria-label="Commission"
                                    type="number"
                                    step="0.01"
                                    value={financials.commission}
                                    onChange={(e) => setFinancials((f) => ({ ...f, commission: e.target.value }))}
                                    disabled={!editable}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* ----------------------------------------------------------------
                Audit tab
            ---------------------------------------------------------------- */}
            {activeTab === 'audit' && (
                <AuditTable
                    audit={audit}
                    loading={auditLoading}
                    error={auditError}
                    entityType="Quote"
                />
            )}

            {/* Add Section modal */}
            {showAddSectionModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-gray-900">Add Section</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Class of Business</label>
                                <input type="text" value={sectionForm.class_of_business ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, class_of_business: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Inception Date</label>
                                <input type="date" value={sectionForm.inception_date ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, inception_date: e.target.value || undefined }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Expiry Date</label>
                                <input type="date" value={sectionForm.expiry_date ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, expiry_date: e.target.value || undefined }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Limit Currency</label>
                                <input type="text" maxLength={8} value={sectionForm.limit_currency ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, limit_currency: e.target.value.toUpperCase() }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Limit Amount</label>
                                <input type="number" min={0} value={sectionForm.limit_amount ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, limit_amount: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Premium Currency</label>
                                <input type="text" maxLength={8} value={sectionForm.premium_currency ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, premium_currency: e.target.value.toUpperCase() }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Gross Premium</label>
                                <input type="number" min={0} value={sectionForm.gross_premium ?? ''} onChange={(e) => setSectionForm((v) => ({ ...v, gross_premium: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
                            </div>
                        </div>
                        {sectionError && <p className="text-sm text-red-600">{sectionError}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowAddSectionModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
                            <button type="button" onClick={handleAddSection} disabled={sectionSaving} className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                                {sectionSaving ? 'Adding…' : 'Add Section'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Decline modal */}
            {showDeclineModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-gray-900">Decline Quote</h2>
                        <div>
                            <label htmlFor="decline-reason-code" className="block text-sm font-medium text-gray-700 mb-1">
                                Reason Code
                            </label>
                            <input
                                id="decline-reason-code"
                                type="text"
                                value={declineReasonCode}
                                onChange={(e) => setDeclineReasonCode(e.target.value)}
                                className={inputCls}
                                placeholder="e.g. capacity"
                            />
                        </div>
                        <div>
                            <label htmlFor="decline-reason-text" className="block text-sm font-medium text-gray-700 mb-1">
                                Reason (optional)
                            </label>
                            <textarea
                                id="decline-reason-text"
                                value={declineReasonText}
                                onChange={(e) => setDeclineReasonText(e.target.value)}
                                rows={3}
                                className={inputCls}
                            />
                        </div>
                        {declineError && <p className="text-sm text-red-600">{declineError}</p>}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeclineModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeclineSubmit}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Confirm Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
