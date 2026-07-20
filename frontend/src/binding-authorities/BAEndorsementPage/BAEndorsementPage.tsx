/**
 * BAEndorsementPage — /binding-authorities/:id/endorsements/:endorsementId/edit
 *
 * Edit a binding authority during an open endorsement session, then issue or save.
 *
 * Requirements: binding-authorities.requirements.md
 * Tests: binding-authorities/__tests__/binding-authorities.test.tsx
 *
 * REQ-BA-FE-F-128 — renders with BA + endorsement loaded; error messages if not found
 * REQ-BA-FE-F-129 — full BA in editable mode with endorsement subtitle
 * REQ-BA-FE-F-130 — sidebar: Save Endorsement, Issue Binding Authority Endorsement
 * REQ-BA-FE-F-131 — dirty-state back-navigation barrier
 * REQ-BA-FE-F-132 — defaults to current BA snapshot values
 * REQ-BA-FE-F-143 — 7 tabs (no Transactions)
 * REQ-BA-FE-F-144 — endorsement detail fields in header panel
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiSave, FiCheckCircle, FiSettings, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import {
    getBindingAuthority,
    getBASections,
    getBATransactions,
    getClassesOfBusiness,
    getCurrencies,
    updateBindingAuthority,
    updateBATransaction,
    createBASection,
} from '@/binding-authorities/binding-authorities.service'
import type { BATransactionDetails, BindingAuthority, BASection, BAStatus, BATransaction, CreateBASectionInput, ClassOfBusiness } from '@/binding-authorities/binding-authorities.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import BordereauConfigModal from '@/binding-authorities/BordereauConfigModal/BordereauConfigModal'
import CoverholderSearchModal from '@/binding-authorities/CoverholderSearchModal/CoverholderSearchModal'

const labelClass = 'text-xs text-gray-400'
const valClass = 'text-sm font-medium text-gray-900 mt-0.5'
const inputClass = 'border border-gray-300 rounded px-3 py-2 text-sm w-full'

const MINIMUM_SECTION_FIELDS_ERROR = 'Class of Business is required on at least one section before binding or issuing the endorsement.'
const TIME_BASIS_OPTIONS = ['Claims-Made', 'Occurrence', 'Manifest']

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

function isDraftSectionPopulated(section: BASection) {
    return [
        section.class_of_business,
        section.time_basis,
        section.inception_date,
        section.expiry_date,
        section.currency,
    ].some((value) => (value ?? '').toString().trim().length > 0)
        || section.line_size != null
        || section.written_premium_limit != null
}

const STATUS_CLASSES: Record<BAStatus, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

// REQ-BA-FE-F-143 — 7 tabs, Transactions excluded
type Tab = 'sections' | 'financial' | 'gpi' | 'policies' | 'claims' | 'bordeaux' | 'audit'

const TABS: { key: Tab; label: string }[] = [
    { key: 'sections',  label: 'Sections' },
    { key: 'financial', label: 'Financial Summary' },
    { key: 'gpi',       label: 'GPI Monitoring' },
    { key: 'policies',  label: 'Policies' },
    { key: 'claims',    label: 'Claims' },
    { key: 'bordeaux',  label: 'Bordereaux' },
    { key: 'audit',     label: 'Audit' },
]

export default function BAEndorsementPage() {
    const { id, endorsementId } = useParams<{ id: string; endorsementId: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [endorsement, setEndorsement] = useState<BATransaction | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Editable BA fields (snapshot defaults — REQ-BA-FE-F-132)
    const [coverholder, setCoverholder] = useState('')
    const [coverholderId, setCoverholderId] = useState<number | null>(null)
    const [yearOfAccount, setYearOfAccount] = useState('')
    const [inceptionDate, setInceptionDate] = useState('')
    const [expiryDate, setExpiryDate] = useState('')

    const [isDirty, setIsDirty] = useState(false)
    const [bordereauConfigOpen, setBordereauConfigOpen] = useState(false)
    const [coverholderModalOpen, setCoverholderModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('sections')

    // REQ-BA-FE-F-144 — endorsement header editable fields
    const [effectiveDate, setEffectiveDate] = useState('')
    const [endorsementDescription, setEndorsementDescription] = useState('')

    // Sections (editable for Contractual endorsements — REQ-BA-FE-F-145)
    const [baseSections, setBaseSections] = useState<BASection[]>([])
    const [sections, setSections] = useState<BASection[]>([])
    const [sectionsLoaded, setSectionsLoaded] = useState(false)
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [classesOfBusiness, setClassesOfBusiness] = useState<ClassOfBusiness[]>([])
    const [currencies, setCurrencies] = useState<string[]>([])
    const [sectionValidationAttempted, setSectionValidationAttempted] = useState(false)
    const nextTempSectionId = useRef(-1)

    function createDraftSection(reference = ''): BASection {
        const nextId = nextTempSectionId.current
        nextTempSectionId.current -= 1
        return {
            id: nextId,
            binding_authority_id: ba?.id ?? parseInt(id ?? '0', 10),
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

    function isSectionMissingMinimumFields(section: BASection) {
        return (section.class_of_business ?? '').trim().length === 0
    }

    function getPriorTransactionSnapshot(
        transactions: BATransaction[],
        currentId: string,
        currentBa: BindingAuthority,
        currentSections: BASection[],
        currentEndorsement: BATransaction | null,
    ): {
        coverholder: string
        coverholderId: number | null
        yearOfAccount: string
        inceptionDate: string
        expiryDate: string
        sections: BASection[]
    } {
        const currentIndex = transactions.findIndex(tx => String(tx.id) === currentId)
        const priorTransaction = currentIndex >= 0 ? transactions[currentIndex + 1] : null
        const priorDetails = (priorTransaction?.details ?? {}) as BATransactionDetails
        const currentDetails = (currentEndorsement?.details ?? {}) as BATransactionDetails
        const sections = Array.isArray(currentDetails.sections)
            ? currentDetails.sections
            : Array.isArray(priorDetails.sections)
                ? priorDetails.sections
                : currentSections

        return {
            coverholder: String(currentDetails.coverholder ?? priorDetails.coverholder ?? currentBa.coverholder ?? ''),
            coverholderId: typeof currentDetails.coverholder_id === 'number'
                ? currentDetails.coverholder_id
                : typeof priorDetails.coverholder_id === 'number'
                    ? priorDetails.coverholder_id
                    : currentBa.coverholder_id ?? null,
            yearOfAccount: String(currentDetails.year_of_account ?? priorDetails.year_of_account ?? currentBa.year_of_account ?? ''),
            inceptionDate: String(currentDetails.inception_date ?? priorDetails.inception_date ?? currentBa.inception_date ?? ''),
            expiryDate: String(currentDetails.expiry_date ?? priorDetails.expiry_date ?? currentBa.expiry_date ?? ''),
            sections: sections.map((section) => ({ ...section })),
        }
    }

    const buildEndorsementDetails = useCallback((): BATransactionDetails => ({
        coverholder: coverholder || null,
        coverholder_id: coverholderId,
        year_of_account: yearOfAccount ? Number(yearOfAccount) : null,
        inception_date: inceptionDate || null,
        expiry_date: expiryDate || null,
        sections: sections.map((section) => ({
            ...section,
            binding_authority_id: ba?.id ?? section.binding_authority_id,
        })),
    }), [ba?.id, coverholder, coverholderId, yearOfAccount, inceptionDate, expiryDate, sections])

    // REQ-BA-FE-F-131 — dirty-state back barrier
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
                addNotificationRef.current('Unsaved endorsement edits — press Back again to discard.', 'warning')
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [isDirty])

    // Wave 1: load BA + sections
    useEffect(() => {
        if (!id) return
        const baId = parseInt(id, 10)
        Promise.all([
            getBindingAuthority(baId),
            getBASections(baId),
        ])
            .then(([data, sects]) => {
                setBa(data)
                setBaseSections(sects)
                setSections(sects)
                setSectionsLoaded(true)
            })
            .catch(() => setLoadError('Binding authority not found.'))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Wave 2: load transactions and resolve endorsement
    useEffect(() => {
        if (!ba || !id || !sectionsLoaded) return
        const baId = parseInt(id, 10)
        getBATransactions(baId)
            .then(txs => {
                const found = txs.find(tx => String(tx.id) === endorsementId)
                if (found) {
                    // Issued endorsements are immutable — redirect to read-only view
                    if (found.status === 'Issued' || found.status === 'Active') {
                        navigate(`/binding-authorities/${id}/transactions/${endorsementId}`)
                        return
                    }
                    const snapshot = getPriorTransactionSnapshot(txs, endorsementId ?? '', ba, baseSections, found)
                    setCoverholder(snapshot.coverholder)
                    setCoverholderId(snapshot.coverholderId)
                    setYearOfAccount(snapshot.yearOfAccount)
                    setInceptionDate(snapshot.inceptionDate)
                    setExpiryDate(snapshot.expiryDate)
                    const shouldSeedContractualDraftSection = found.type === 'Contractual' && snapshot.sections.length === 0
                    setSections(
                        shouldSeedContractualDraftSection
                            ? [createDraftSection(getNextDraftSectionReference(ba.reference, []))]
                            : snapshot.sections
                    )
                    setEndorsement(found)
                    setEffectiveDate(found.effective_date ?? '')
                    setEndorsementDescription(found.description ?? '')
                } else {
                    setLoadError('Endorsement not found.')
                }
            })
            .catch(() => setLoadError('Endorsement not found.'))
    }, [ba, endorsementId, id, navigate, sectionsLoaded, baseSections]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        getClassesOfBusiness()
            .then((items) => setClassesOfBusiness(items ?? []))
            .catch(() => setClassesOfBusiness([]))
        getCurrencies()
            .then((items) => setCurrencies(items ?? []))
            .catch(() => setCurrencies([]))
    }, [])

    // REQ-BA-FE-F-130 — Save Endorsement handler
    const handleSave = useCallback(async () => {
        if (!ba || !endorsement) return
        if (endorsement.status !== 'Draft') return
        if (!effectiveDate) {
            addNotification('Effective date is required before saving.', 'error')
            return
        }
        const baId = parseInt(id ?? '0', 10)
        const details = buildEndorsementDetails()
        try {
            await updateBATransaction(baId, endorsement.id, {
                effective_date: effectiveDate || undefined,
                description: endorsementDescription || undefined,
                details,
            })
            setEndorsement(prev => prev ? {
                ...prev,
                effective_date: effectiveDate || prev.effective_date,
                description: endorsementDescription || prev.description,
                details,
            } : prev)
            setIsDirty(false)
            addNotification('Endorsement saved.', 'success')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save.'
            addNotification(`Save failed: ${msg}`, 'error')
        }
    }, [ba, endorsement, id, effectiveDate, endorsementDescription, addNotification, buildEndorsementDetails])

    const handleBind = useCallback(async () => {
        if (!ba || !endorsement) return
        if (endorsement.status !== 'Draft') return
        if (!hasMinimumSectionFields(sections)) {
            setSectionValidationAttempted(true)
            addNotification(MINIMUM_SECTION_FIELDS_ERROR, 'error')
            return
        }
        const baId = parseInt(id ?? '0', 10)
        const details = buildEndorsementDetails()
        try {
            await updateBATransaction(baId, endorsement.id, {
                effective_date: effectiveDate || undefined,
                description: endorsementDescription || undefined,
                status: 'Bound',
                details,
            })
            setEndorsement(prev => prev ? {
                ...prev,
                effective_date: effectiveDate || prev.effective_date,
                description: endorsementDescription || prev.description,
                status: 'Bound',
                details,
            } : prev)
            setSectionValidationAttempted(false)
            setIsDirty(false)
            addNotification('Endorsement bound.', 'success')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to bind endorsement.'
            addNotification(`Bind failed: ${msg}`, 'error')
        }
    }, [ba, endorsement, id, effectiveDate, endorsementDescription, addNotification, buildEndorsementDetails, sections])

    // REQ-BA-FE-F-130 — Issue Endorsement handler (Bound → Issued, terminal state)
    // Point 4.1: if sub_type === 'Cancellation' and effectiveDate ≤ today → BA status → Cancelled
    const handleIssue = useCallback(async () => {
        if (!ba || !endorsement) return
        if (endorsement.status !== 'Bound') return
        if (!hasMinimumSectionFields(sections)) {
            setSectionValidationAttempted(true)
            addNotification(MINIMUM_SECTION_FIELDS_ERROR, 'error')
            return
        }
        const baId = parseInt(id ?? '0', 10)
        const details = buildEndorsementDetails()
        try {
            await updateBindingAuthority(baId, {
                coverholder_id: coverholderId ?? undefined,
                coverholder: coverholder || undefined,
                year_of_account: yearOfAccount ? Number(yearOfAccount) : undefined,
                inception_date: inceptionDate || undefined,
                expiry_date: expiryDate || undefined,
            })
            for (const section of sections.filter(section => section.id <= 0 && isDraftSectionPopulated(section))) {
                await createBASection(baId, {
                    class_of_business: section.class_of_business,
                    time_basis: section.time_basis,
                    inception_date: section.inception_date,
                    expiry_date: section.expiry_date,
                    line_size: section.line_size,
                    written_premium_limit: section.written_premium_limit,
                    currency: section.currency,
                })
            }
            await updateBATransaction(baId, endorsement.id, {
                effective_date: effectiveDate || undefined,
                description: endorsementDescription || undefined,
                status: 'Issued',
                details,
            })

            // If this is a Cancellation endorsement, update BA status based on effective date
            if (endorsement.sub_type === 'Cancellation') {
                const today = new Date().toISOString().slice(0, 10)
                if (effectiveDate && effectiveDate <= today) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await updateBindingAuthority(baId, { status: 'Cancelled' as any })
                }
                // If effectiveDate > today: BA remains Active (future-dated cancellation)
            }

            setIsDirty(false)
            setSectionValidationAttempted(false)
            navigate(`/binding-authorities/${baId}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to issue endorsement.'
            addNotification(`Issue failed: ${msg}`, 'error')
        }
    }, [ba, endorsement, id, coverholderId, coverholder, yearOfAccount, inceptionDate, expiryDate, effectiveDate, sections, endorsementDescription, addNotification, navigate, buildEndorsementDetails])

    const sidebarSection = useMemo((): SidebarSection => ({
        title: 'Binding Authority',
        items: [
            // Draft: Save + Bind. Bound: Issue. Configure always available.
            ...(endorsement?.status === 'Draft'
                ? [{ label: 'Save Endorsement', icon: FiSave, event: 'ba:endorse-save' }]
                : []),
            ...(endorsement?.status === 'Draft'
                ? [{ label: 'Bind Endorsement', icon: FiCheckCircle, event: 'ba:bind-endorsement' }]
                : []),
            ...(endorsement?.status === 'Bound'
                ? [{ label: 'Issue Endorsement', icon: FiCheckCircle, event: 'ba:issue-endorsement' }]
                : []),
            { label: 'Configure Bordereau', icon: FiSettings, event: 'ba:configure-bordereau' },
        ],
    }), [endorsement?.status])

    useSidebarSection(sidebarSection)

    useEffect(() => {
        const onSave = () => handleSave()
        window.addEventListener('ba:endorse-save', onSave)
        return () => window.removeEventListener('ba:endorse-save', onSave)
    }, [handleSave])

    useEffect(() => {
        const onBind = () => handleBind()
        window.addEventListener('ba:bind-endorsement', onBind)
        return () => window.removeEventListener('ba:bind-endorsement', onBind)
    }, [handleBind])

    useEffect(() => {
        const onIssue = () => handleIssue()
        window.addEventListener('ba:issue-endorsement', onIssue)
        return () => window.removeEventListener('ba:issue-endorsement', onIssue)
    }, [handleIssue])

    useEffect(() => {
        const onConfig = () => setBordereauConfigOpen(true)
        window.addEventListener('ba:configure-bordereau', onConfig)
        return () => window.removeEventListener('ba:configure-bordereau', onConfig)
    }, [])

    // ── Sections grid config (add allowed for Contractual — REQ-BA-FE-F-145) ——
    // Form fields are read-only once endorsement status is Issued
    const isEditable = endorsement?.status === 'Draft'
    const isContractual = endorsement?.type === 'Contractual'
    const baId = parseInt(id ?? '0', 10)
    const SECTION_COLUMNS: Column[] = [
        { key: 'reference',            label: 'Reference',                      sortable: true,  defaultWidth: 140 },
        { key: 'class_of_business_code', label: 'CoB Code',                     sortable: true,  defaultWidth: 90  },
        { key: 'class_of_business',    label: 'Class of Business',              sortable: true,  defaultWidth: 160 },
        { key: 'inception_date',       label: 'Inception Date',                 sortable: true,  defaultWidth: 130 },
        { key: 'expiry_date',          label: 'Expiry Date',                    sortable: true,  defaultWidth: 120 },
        { key: 'time_basis',           label: 'Time Basis',                     sortable: true,  defaultWidth: 110 },
        { key: 'days_on_cover',        label: 'Max Period of Insurance (days)', sortable: true,  defaultWidth: 180 },
        { key: 'currency',             label: 'Settlement Premium Currency',    sortable: true,  defaultWidth: 160 },
        { key: 'written_premium_limit',label: 'Gross Premium Income Limit',     sortable: true,  defaultWidth: 160 },
        {
            key: '_action',
            label: (isEditable && isContractual ? (
                <button
                    type="button"
                    title="Add Section"
                    aria-label="Add Section"
                    className="text-brand-600 hover:text-brand-800"
                    onClick={() => {
                        setSections((prev) => [createDraftSection(getNextDraftSectionReference(ba?.reference, prev)), ...prev])
                        setIsDirty(true)
                    }}
                >
                    <FiPlus size={14} />
                </button>
            ) : null) as React.ReactNode,
            sortable: false,
            defaultWidth: 64,
        },
    ]

    function handleSectionSort(key: string) {
        setSectionSort(prev =>
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
        setIsDirty(true)
    }

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const draftSection = row as BASection
        if (draftSection.id < 0) {
            if (key === 'reference') return <span className="text-sm font-medium text-gray-700">{draftSection.reference || 'New Section'}</span>
            if (key === 'class_of_business_code') return <span className="text-sm text-gray-500">{draftSection.class_of_business_code || '—'}</span>
            if (key === 'class_of_business') {
                const showFieldError = sectionValidationAttempted && isSectionMissingMinimumFields(draftSection)
                return (
                    <input
                        type="text"
                        list="ba-endorsement-class-of-business-options"
                        placeholder="Class of Business"
                        value={draftSection.class_of_business ?? ''}
                        onChange={(e) => {
                            const name = e.target.value
                            const cob = classesOfBusiness.find(c => c.name.toLowerCase() === name.toLowerCase().trim())
                            updateDraftSection(draftSection.id, { class_of_business: name, class_of_business_code: cob?.code ?? '' })
                        }}
                        aria-invalid={showFieldError}
                        className={`w-full min-w-0 border rounded px-2 py-1 text-sm ${showFieldError ? 'border-red-400 bg-white' : 'border-gray-300'}`}
                    />
                )
            }
            if (key === 'inception_date') {
                return (
                    <input
                        type="date"
                        value={draftSection.inception_date ?? ''}
                        onChange={(e) => updateDraftSection(draftSection.id, { inception_date: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'expiry_date') {
                return (
                    <input
                        type="date"
                        value={draftSection.expiry_date ?? ''}
                        onChange={(e) => updateDraftSection(draftSection.id, { expiry_date: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'time_basis') {
                return (
                    <input
                        type="text"
                        list="ba-endorsement-time-basis-options"
                        placeholder="Time basis"
                        value={draftSection.time_basis ?? ''}
                        onChange={(e) => updateDraftSection(draftSection.id, { time_basis: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'currency') {
                return (
                    <input
                        type="text"
                        list="ba-endorsement-currency-options"
                        placeholder="Currency"
                        value={draftSection.currency ?? ''}
                        onChange={(e) => updateDraftSection(draftSection.id, { currency: e.target.value })}
                        className="w-full min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                )
            }
            if (key === 'written_premium_limit') {
                return (
                    <input
                        type="number"
                        placeholder="0"
                        value={draftSection.written_premium_limit ?? ''}
                        onChange={(e) => updateDraftSection(draftSection.id, {
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
                        onClick={() => {
                            setSections((prev) => prev.filter((section) => section.id !== draftSection.id))
                            setIsDirty(true)
                        }}
                        className="text-gray-300 hover:text-red-500"
                    >
                        <FiX size={14} />
                    </button>
                )
            }
            return '—'
        }

        const sec = row as BASection
        if (key === '_action') {
            return sec.id > 0 ? (
                <span className="flex items-center gap-1">
                    <Link
                        to={`/binding-authorities/${baId}/sections/${sec.id}`}
                        title="Open section"
                        aria-label="Open section"
                        className="text-gray-400 hover:text-brand-600"
                    >
                        <FiSearch size={14} />
                    </Link>
                </span>
            ) : null
        }
        if (key === 'class_of_business_code') return sec.class_of_business_code ?? '—'
        if (key === 'days_on_cover') return sec.days_on_cover?.toLocaleString() ?? '—'
        if (key === 'written_premium_limit') return sec.written_premium_limit?.toLocaleString() ?? '—'
        return (sec as unknown as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (loadError) {
        return (
            <div className="p-6 text-sm text-red-600">
                {loadError}
            </div>
        )
    }

    // Render nothing while data is loading — ensures heading only appears when
    // both ba and endorsement are resolved (so tests can safely await it).
    if (!ba || !endorsement) {
        return null
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Page heading */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Endorsement: {endorsement.type}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {ba.reference} &mdash; Effective {endorsement.effective_date ?? '—'}
                    </p>
                </div>
            </div>

            {/* REQ-BA-FE-F-129/132/144 — Unified header panel: BA fields + endorsement fields */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Column 1 — Contract & Reference */}
                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract &amp; Reference</p>
                        <div>
                            <p className={labelClass}>Reference</p>
                            <p className={valClass}>{ba.reference}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Binding Authority Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[ba.status]}`}>
                                {ba.status}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Coverholder</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    aria-label="Coverholder"
                                    className={`${inputClass} pr-16`}
                                    value={coverholder}
                                    readOnly
                                    placeholder="Select coverholder…"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {coverholder && isEditable && (
                                        <button
                                            type="button"
                                            title="Clear coverholder"
                                            className="text-gray-400 hover:text-red-500"
                                            onClick={() => { setCoverholder(''); setCoverholderId(null); setIsDirty(true) }}
                                        >
                                            <FiX size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        title="Search Coverholder"
                                        className="text-gray-500 hover:text-brand-600"
                                        disabled={!isEditable}
                                        onClick={() => setCoverholderModalOpen(true)}
                                    >
                                        <FiSearch size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className={labelClass}>Year of Account</p>
                            <input
                                type="text"
                                aria-label="Year of Account"
                                className={inputClass}
                                value={yearOfAccount}
                                disabled={!isEditable}
                                onChange={e => { setYearOfAccount(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                    </div>

                    {/* Column 2 — Dates */}
                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</p>
                        <div>
                            <p className={labelClass}>Inception Date</p>
                            <input
                                type="date"
                                aria-label="Inception Date"
                                className={inputClass}
                                value={inceptionDate}
                                disabled={!isEditable}
                                onChange={e => { setInceptionDate(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                        <div>
                            <p className={labelClass}>Expiry Date</p>
                            <input
                                type="date"
                                aria-label="Expiry Date"
                                className={inputClass}
                                value={expiryDate}
                                disabled={!isEditable}
                                onChange={e => { setExpiryDate(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                    </div>

                    {/* Column 3 — Endorsement Details (REQ-BA-FE-F-144) */}
                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endorsement Details</p>
                        <div>
                            <p className={labelClass}>Transaction Number</p>
                            <p className={valClass}>{endorsement.id}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Endorsement Type</p>
                            <p className={valClass}>{endorsement.type ?? '—'}</p>
                        </div>                        <div>
                            <p className={labelClass}>Endorsement Status</p>
                            {(() => {
                                const TX_STATUS_CLASSES: Record<string, string> = {
                                    Draft:    'bg-yellow-100 text-yellow-800',
                                    Bound:    'bg-orange-100 text-orange-800',
                                    Active:   'bg-green-100 text-green-800',
                                    Issued:   'bg-green-100 text-green-800',
                                    Endorsed: 'bg-gray-100 text-gray-600',
                                }
                                const cls = TX_STATUS_CLASSES[endorsement.status ?? ''] ?? 'bg-gray-100 text-gray-500'
                                return (
                                    <span
                                        data-testid="endorsement-status-badge"
                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
                                    >
                                        {endorsement.status ?? '—'}
                                    </span>
                                )
                            })()}
                        </div>                        {endorsement.type === 'Contractual' && (
                            <div>
                                <p className={labelClass}>Endorsement Sub Type</p>
                                <p className={valClass}>{endorsement.sub_type ?? '—'}</p>
                            </div>
                        )}
                        <div>
                            <label htmlFor="endorsement-effective-date" className={labelClass}>
                                Transaction Effective Date
                            </label>
                            <input
                                id="endorsement-effective-date"
                                type="date"
                                aria-label="Transaction Effective Date"
                                className={inputClass}
                                value={effectiveDate}
                                disabled={!isEditable}
                                onChange={e => { setEffectiveDate(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                        <div>
                            <label htmlFor="endorsement-description" className={labelClass}>
                                Endorsement Description
                            </label>
                            <textarea
                                id="endorsement-description"
                                aria-label="Endorsement Description"
                                className={inputClass}
                                rows={3}
                                value={endorsementDescription}
                                disabled={!isEditable}
                                onChange={e => { setEndorsementDescription(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* REQ-BA-FE-F-143 — Tab navigation (7 tabs, no Transactions) */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
                                activeTab === tab.key
                                    ? 'border-brand-600 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Sections tab — editable for Contractual — REQ-BA-FE-F-145 */}
            {activeTab === 'sections' && (
                <div className="flex flex-col gap-4">
                    {!sectionsLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <ResizableGrid
                            columns={SECTION_COLUMNS}
                            rows={displayedSections}
                            storageKey="table-widths-endorsement-sections"
                            sortConfig={sectionSort}
                            onRequestSort={handleSectionSort}
                            renderCell={renderSectionCell}
                            rowKey={(row) => (row as BASection | { id: string }).id}
                            emptyMessage="No sections found."
                        />
                    )}
                </div>
            )}

            {/* Other tabs — stubs for future content */}
            {activeTab !== 'sections' && (
                <div className="text-sm text-gray-400 italic p-4">
                    {TABS.find(t => t.key === activeTab)?.label} content coming soon.
                </div>
            )}

            {bordereauConfigOpen && (
                <BordereauConfigModal
                    isOpen={bordereauConfigOpen}
                    bindingAuthorityId={id}
                    editConfig={null}
                    onClose={() => setBordereauConfigOpen(false)}
                    onSaved={() => setBordereauConfigOpen(false)}
                />
            )}
            <CoverholderSearchModal
                isOpen={coverholderModalOpen}
                onClose={() => setCoverholderModalOpen(false)}
                onSelect={(party) => {
                    setCoverholder(party.name)
                    setCoverholderId(party.id)
                    setIsDirty(true)
                    setCoverholderModalOpen(false)
                }}
            />

            <datalist id="ba-endorsement-class-of-business-options">
                {classesOfBusiness.map((item) => (
                    <option key={item.code} value={item.name} />
                ))}
            </datalist>
            <datalist id="ba-endorsement-time-basis-options">
                {TIME_BASIS_OPTIONS.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>
            <datalist id="ba-endorsement-currency-options">
                {currencies.map((item) => (
                    <option key={item} value={item} />
                ))}
            </datalist>

            {/* Editable status badge */}
            {endorsement && (
                <div className="fixed bottom-20 right-4 z-40">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${isEditable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${isEditable ? 'bg-green-500' : 'bg-amber-400'}`} aria-hidden="true" />
                        <span>{isEditable ? 'Editable' : 'Read-only'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
