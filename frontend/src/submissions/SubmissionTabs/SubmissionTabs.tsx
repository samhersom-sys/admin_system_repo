/**
 * SubmissionTabs — tabbed secondary data sections for a submission.
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { del, get, post, put } from '@/shared/lib/api-client/api-client'
import { listParties } from '@/parties/parties.service'
import type { Party } from '@/parties/parties.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'

export interface SubmissionTabsProps {
    contractType?: string
    submissionId: number
    placingBroker?: string | null
    placingBrokerId?: string | null
    placingBrokerName?: string | null
    insured?: string | null
    insuredId?: string | null
    isEditLocked?: boolean
}

interface AuditEvent {
    action: string
    user: string
    userId?: number | null
    date: string
    changes?: unknown
    details?: unknown
}

interface QuoteRow {
    id: number
    reference?: string | null
    status?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    created_by?: string | null
    updated_by?: string | null
}

interface RelatedSubmissionRow {
    id: number
    reference?: string | null
    insured?: string | null
    placingBroker?: string | null
    status?: string | null
    inceptionDate?: string | null
    inception_date?: string | null
}

function buildTabs(contractType?: string): string[] {
    const isBA = (contractType ?? '').toLowerCase() === 'binding authority contract'
    return isBA
        ? ['Placing Broking', 'Binding Authority Contracts', 'Related Submissions', 'Audit']
        : ['Placing Broking', 'Quotes', 'Policies', 'Related Submissions', 'Audit']
}

function BrokerSearchModal({
    isOpen,
    onClose,
    onSelect,
}: {
    isOpen: boolean
    onClose: () => void
    onSelect: (party: Party) => void
}) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Party[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        setLoading(true)
        listParties({ type: 'Broker', search: query.trim() || undefined })
            .then((rows) => {
                if (!cancelled) setResults(rows)
            })
            .catch(() => {
                if (!cancelled) setResults([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [isOpen, query])

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Select broker">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-8 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900">Select broker</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-sm text-gray-500 hover:text-gray-700">
                        Close
                    </button>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {loading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                ) : results.length === 0 ? (
                    <p className="text-sm text-gray-500">No broker parties found.</p>
                ) : (
                    <ResizableGrid
                        storageKey="table-widths-broker-modal"
                        columns={[
                            { key: 'name', label: 'Name', sortable: true, defaultWidth: 280 },
                            { key: 'type', label: 'Type', sortable: false, defaultWidth: 140 },
                        ]}
                        rows={results}
                        rowKey={(row) => (row as Party).id}
                        emptyMessage="No broker parties found."
                        onRowClick={(row) => onSelect(row as Party)}
                        renderCell={(key, row) => {
                            const party = row as Party
                            if (key === 'name') return party.name
                            if (key === 'type') return party.type
                            return null
                        }}
                    />
                )}
            </div>
        </div>
    )
}

function PlacingBrokingPane({
    submissionId,
    placingBroker,
    placingBrokerId,
    placingBrokerName,
    isEditLocked = false,
}: {
    submissionId: number
    placingBroker?: string | null
    placingBrokerId?: string | null
    placingBrokerName?: string | null
    isEditLocked?: boolean
}) {
    const { addNotification } = useNotifications()
    const [brokerCompany, setBrokerCompany] = useState(placingBroker ?? '')
    const [brokerCompanyId, setBrokerCompanyId] = useState(placingBrokerId ?? '')
    const [brokerIndividualName, setBrokerIndividualName] = useState(placingBrokerName ?? '')
    const [savedCompany, setSavedCompany] = useState(placingBroker ?? '')
    const [savedCompanyId, setSavedCompanyId] = useState(placingBrokerId ?? '')
    const [savedIndividualName, setSavedIndividualName] = useState(placingBrokerName ?? '')
    const [saving, setSaving] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setBrokerCompany(placingBroker ?? '')
        setBrokerCompanyId(placingBrokerId ?? '')
        setBrokerIndividualName(placingBrokerName ?? '')
        setSavedCompany(placingBroker ?? '')
        setSavedCompanyId(placingBrokerId ?? '')
        setSavedIndividualName(placingBrokerName ?? '')
    }, [placingBroker, placingBrokerId, placingBrokerName])

    const isDirty =
        brokerCompany !== savedCompany ||
        brokerCompanyId !== savedCompanyId ||
        brokerIndividualName !== savedIndividualName

    async function saveChanges() {
        if (isEditLocked || !isDirty) return
        setSaving(true)
        setError(null)
        try {
            const result = await put<Record<string, unknown>>(`/api/submissions/${submissionId}`, {
                placingBroker: brokerCompany || null,
                placingBrokerId: brokerCompanyId || null,
                placingBrokerName: brokerIndividualName || null,
            })
            const nextCompany = String(result.placingBroker ?? brokerCompany ?? '')
            const nextCompanyId = String(result.placingBrokerId ?? result.brokerId ?? brokerCompanyId ?? '')
            const nextIndividualName = String(result.placingBrokerName ?? brokerIndividualName ?? '')
            setBrokerCompany(nextCompany)
            setBrokerCompanyId(nextCompanyId)
            setBrokerIndividualName(nextIndividualName)
            setSavedCompany(nextCompany)
            setSavedCompanyId(nextCompanyId)
            setSavedIndividualName(nextIndividualName)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save placing broking details.'
            setError(message)
            addNotification(`Placing broking save failed: ${message}`, 'error')
        } finally {
            setSaving(false)
        }
    }

    function cancelChanges() {
        setBrokerCompany(savedCompany)
        setBrokerCompanyId(savedCompanyId)
        setBrokerIndividualName(savedIndividualName)
        setError(null)
    }

    useEffect(() => {
        function handleSaveEvent() {
            if (isEditLocked) return
            void saveChanges()
        }
        window.addEventListener('submission:save', handleSaveEvent)
        return () => window.removeEventListener('submission:save', handleSaveEvent)
    }, [brokerCompany, brokerCompanyId, brokerIndividualName, isDirty, submissionId, addNotification, isEditLocked])

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700">Placing Broking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1" htmlFor="placingBrokerCompany">Placing Broker Company</label>
                    <div className="relative">
                        <input
                            id="placingBrokerCompany"
                            type="text"
                            readOnly
                            disabled={isEditLocked}
                            aria-label="Placing Broker Company"
                            value={brokerCompany || '— search to select —'}
                            onClick={() => { if (!isEditLocked) setModalOpen(true) }}
                            className="w-full border border-gray-300 rounded px-3 py-2 pr-10 text-sm cursor-pointer bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        />
                        <button
                            type="button"
                            aria-label="Search parties"
                            disabled={isEditLocked}
                            onClick={() => setModalOpen(true)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                            <FiSearch size={16} />
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1" htmlFor="placingBrokerName">Broker (individual name)</label>
                    <input
                        id="placingBrokerName"
                        type="text"
                        aria-label="Broker (individual name)"
                        value={brokerIndividualName}
                        disabled={isEditLocked}
                        onChange={(e) => setBrokerIndividualName(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {isDirty && !isEditLocked && (
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => void saveChanges()} disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white disabled:opacity-50">
                        Save Changes
                    </button>
                    <button type="button" onClick={cancelChanges} disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700">
                        Cancel
                    </button>
                </div>
            )}

            <BrokerSearchModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelect={(party) => {
                    setBrokerCompany(String(party.name ?? ''))
                    setBrokerCompanyId(String(party.id ?? ''))
                    setModalOpen(false)
                }}
            />
        </div>
    )
}

function QuotesPane({ active, submissionId }: { active: boolean; submissionId: number }) {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [rows, setRows] = useState<QuoteRow[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!active || loaded || loading) return
        setLoading(true)
        get<QuoteRow[]>(`/api/quotes?submission_id=${submissionId}`)
            .then((result) => {
                setRows(result)
                setLoaded(true)
            })
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load quotes.')
                setLoaded(true)
                addNotification('Could not load quotes.', 'error')
            })
            .finally(() => setLoading(false))
    }, [active, loaded, loading, submissionId, addNotification])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-700">Quotes</h3>
                <button type="button" onClick={() => navigate(`/quotes/new?submissionId=${submissionId}`)} className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700">
                    New Quote
                </button>
            </div>
            {loading ? (
                <p className="text-sm text-gray-500">Loading quotes…</p>
            ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-gray-500">No quotes linked to this submission.</p>
            ) : (
                <ResizableGrid
                    storageKey="table-widths-submission-quotes"
                    columns={[
                        { key: 'reference',  label: 'Reference',       sortable: true, defaultWidth: 160 },
                        { key: 'status',     label: 'Status',          sortable: true, defaultWidth: 120 },
                        { key: 'createdBy',  label: 'Created By',      sortable: false, defaultWidth: 150 },
                        { key: 'updatedBy',  label: 'Last Updated By', sortable: false, defaultWidth: 150 },
                        { key: 'actions',    label: 'Actions',         sortable: false, defaultWidth: 80 },
                    ]}
                    rows={rows}
                    rowKey={(row) => (row as QuoteRow).id}
                    emptyMessage="No quotes linked to this submission."
                    renderCell={(key, row) => {
                        const qr = row as QuoteRow
                        if (key === 'reference') return qr.reference ?? '—'
                        if (key === 'status')    return qr.status ?? '—'
                        if (key === 'createdBy') return qr.createdBy ?? qr.created_by ?? '—'
                        if (key === 'updatedBy') return qr.updatedBy ?? qr.updated_by ?? '—'
                        if (key === 'actions')   return (
                            <Link to={`/quotes/${qr.id}`} aria-label={`View quote ${qr.reference ?? qr.id}`} className="text-brand-600 hover:underline">
                                View
                            </Link>
                        )
                        return null
                    }}
                />
            )}
        </div>
    )
}

function RelatedSubmissionSearchModal({
    isOpen,
    currentSubmissionId,
    excludeIds,
    onClose,
    onSelect,
}: {
    isOpen: boolean
    currentSubmissionId: number
    excludeIds: number[]
    onClose: () => void
    onSelect: (row: RelatedSubmissionRow) => void
}) {
    const { addNotification } = useNotifications()
    const [rows, setRows] = useState<RelatedSubmissionRow[]>([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        setLoading(true)
        setError(null)
        get<RelatedSubmissionRow[]>('/api/submissions')
            .then((result) => {
                if (!cancelled) setRows(result)
            })
            .catch((err: Error) => {
                if (!cancelled) {
                    setError(err.message ?? 'Failed to load submissions.')
                    addNotification('Could not load submissions for linking.', 'error')
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [isOpen, addNotification])

    const filteredRows = useMemo(() => {
        const lowered = query.trim().toLowerCase()
        return rows.filter((row) => {
            if (row.id === currentSubmissionId || excludeIds.includes(row.id)) return false
            if (!lowered) return true
            return [row.reference, row.insured, row.placingBroker]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(lowered))
        })
    }, [rows, query, currentSubmissionId, excludeIds])

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Link related submission">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-8 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900">Link related submission</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-sm text-gray-500 hover:text-gray-700">
                        Close
                    </button>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search submissions..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {loading ? (
                    <p className="text-sm text-gray-500">Loading submissions…</p>
                ) : error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : filteredRows.length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions available to link.</p>
                ) : (
                    <ResizableGrid
                        storageKey="table-widths-related-submission-modal"
                        columns={[
                            { key: 'reference',    label: 'Reference',      sortable: true, defaultWidth: 160 },
                            { key: 'insured',      label: 'Insured',        sortable: true, defaultWidth: 220 },
                            { key: 'placingBroker', label: 'Placing Broker', sortable: false, defaultWidth: 200 },
                        ]}
                        rows={filteredRows}
                        rowKey={(row) => (row as RelatedSubmissionRow).id}
                        emptyMessage="No submissions available to link."
                        onRowClick={(row) => onSelect(row as RelatedSubmissionRow)}
                        renderCell={(key, row) => {
                            const r = row as RelatedSubmissionRow
                            if (key === 'reference')    return r.reference ?? '—'
                            if (key === 'insured')      return r.insured ?? '—'
                            if (key === 'placingBroker') return r.placingBroker ?? '—'
                            return null
                        }}
                    />
                )}
            </div>
        </div>
    )
}

function RelatedSubmissionsPane({ active, submissionId }: { active: boolean; submissionId: number }) {
    const { addNotification } = useNotifications()
    const [rows, setRows] = useState<RelatedSubmissionRow[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        if (!active || loaded || loading) return
        setLoading(true)
        get<RelatedSubmissionRow[]>(`/api/submissions/${submissionId}/related`)
            .then((result) => {
                setRows(result)
                setLoaded(true)
            })
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load related submissions.')
                setLoaded(true)
                addNotification('Could not load related submissions.', 'error')
            })
            .finally(() => setLoading(false))
    }, [active, loaded, loading, submissionId, addNotification])

    async function removeLink(relatedId: number) {
        try {
            await del(`/api/submissions/${submissionId}/related/${relatedId}`)
            setRows((current) => current.filter((row) => row.id !== relatedId))
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove related submission.'
            addNotification(`Could not remove related submission: ${message}`, 'error')
        }
    }

    async function linkSubmission(row: RelatedSubmissionRow) {
        try {
            const linked = await post<RelatedSubmissionRow>(`/api/submissions/${submissionId}/related`, {
                relatedSubmissionId: row.id,
            })
            setRows((current) => (current.some((item) => item.id === linked.id) ? current : [...current, linked]))
            setModalOpen(false)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to link submission.'
            addNotification(`Could not link related submission: ${message}`, 'error')
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-700">Related Submissions</h3>
                <button type="button" onClick={() => setModalOpen(true)} className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700">
                    Link Submission
                </button>
            </div>
            {loading ? (
                <p className="text-sm text-gray-500">Loading related submissions…</p>
            ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-gray-500">No related submissions linked.</p>
            ) : (
                <ResizableGrid
                    storageKey="table-widths-related-submissions"
                    columns={[
                        { key: 'reference',    label: 'Reference',     sortable: true, defaultWidth: 160 },
                        { key: 'insured',      label: 'Insured',       sortable: true, defaultWidth: 200 },
                        { key: 'status',       label: 'Status',        sortable: true, defaultWidth: 120 },
                        { key: 'inceptionDate', label: 'Inception Date', sortable: false, defaultWidth: 130 },
                        { key: 'actions',      label: 'Actions',       sortable: false, defaultWidth: 120 },
                    ]}
                    rows={rows}
                    rowKey={(row) => (row as RelatedSubmissionRow).id}
                    emptyMessage="No related submissions linked."
                    renderCell={(key, row) => {
                        const r = row as RelatedSubmissionRow
                        if (key === 'reference')    return r.reference ?? '—'
                        if (key === 'insured')      return r.insured ?? '—'
                        if (key === 'status')       return r.status ?? '—'
                        if (key === 'inceptionDate') return r.inceptionDate ?? r.inception_date ?? '—'
                        if (key === 'actions') return (
                            <span className="flex items-center gap-3">
                                <Link to={`/submissions/${r.id}`} aria-label={`View submission ${r.reference ?? r.id}`} className="text-brand-600 hover:underline">
                                    View
                                </Link>
                                <button type="button" onClick={() => void removeLink(r.id)} aria-label={`Remove related submission ${r.reference ?? r.id}`} className="text-sm text-red-600 hover:underline">
                                    Remove
                                </button>
                            </span>
                        )
                        return null
                    }}
                />
            )}

            <RelatedSubmissionSearchModal
                isOpen={modalOpen}
                currentSubmissionId={submissionId}
                excludeIds={rows.map((row) => row.id)}
                onClose={() => setModalOpen(false)}
                onSelect={(row) => { void linkSubmission(row) }}
            />
        </div>
    )
}

function AuditPane({ submissionId }: { submissionId: number }) {    const [events, setEvents] = useState<AuditEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { addNotification } = useNotifications()

    useEffect(() => {
        get<AuditEvent[]>(`/api/audit/Submission/${submissionId}`)
            .then(setEvents)
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load audit trail.')
                addNotification('Could not load audit trail.', 'error')
            })
            .finally(() => setLoading(false))
    }, [submissionId, addNotification])

    if (loading) {
        return <p className="text-sm text-gray-400 py-4 text-center" aria-label="Loading audit trail">Loading audit trail…</p>
    }
    if (error) {
        return <p className="text-sm text-red-600 py-4">{error}</p>
    }

    return (
        <ResizableGrid
            storageKey="table-widths-submission-audit"
            columns={[
                { key: 'date',   label: 'Date',   sortable: false, defaultWidth: 160 },
                { key: 'action', label: 'Action', sortable: false, defaultWidth: 260 },
                { key: 'user',   label: 'User',   sortable: false, defaultWidth: 160 },
            ]}
            rows={events}
            rowKey={(_, idx) => idx}
            emptyMessage="No audit events recorded."
            renderCell={(key, row) => {
                const evt = row as AuditEvent
                if (key === 'date')   return <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(evt.date).toLocaleString()}</span>
                if (key === 'action') return <span className="text-sm">{evt.action}</span>
                if (key === 'user')   return <span className="text-sm text-gray-600">{evt.user}</span>
                return null
            }}
        />
    )
}

interface BAContractRow {
    id: number
    reference?: string | null
    status?: string | null
    yearOfAccount?: string | null
    inceptionDate?: string | null
    expiryDate?: string | null
}

function BAContractsPane({ active, submissionId }: { active: boolean; submissionId: number }) {
    const { addNotification } = useNotifications()
    const [rows, setRows] = useState<BAContractRow[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!active || loaded || loading) return
        setLoading(true)
        get<BAContractRow[]>(`/api/submissions/${submissionId}/binding-authorities`)
            .then((result) => {
                setRows(result)
                setLoaded(true)
            })
            .catch((err: Error) => {
                setError(err.message ?? 'Failed to load binding authority contracts.')
                setLoaded(true)
                addNotification('Could not load binding authority contracts.', 'error')
            })
            .finally(() => setLoading(false))
    }, [active, loaded, loading, submissionId, addNotification])

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700">Binding Authority Contracts</h3>
            {loading ? (
                <p className="text-sm text-gray-500">Loading contracts…</p>
            ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-gray-500">No binding authority contracts found.</p>
            ) : (
                <ResizableGrid
                    storageKey="table-widths-submission-ba-contracts"
                    columns={[
                        { key: 'reference',    label: 'Reference',     sortable: true,  defaultWidth: 200 },
                        { key: 'status',       label: 'Status',        sortable: true,  defaultWidth: 120 },
                        { key: 'yearOfAccount', label: 'Year',         sortable: true,  defaultWidth: 80  },
                        { key: 'inceptionDate', label: 'Inception',    sortable: false, defaultWidth: 120 },
                        { key: 'expiryDate',   label: 'Expiry',        sortable: false, defaultWidth: 120 },
                    ]}
                    rows={rows}
                    rowKey={(row) => (row as BAContractRow).id}
                    emptyMessage="No binding authority contracts found."
                    renderCell={(key, row) => {
                        const r = row as BAContractRow
                        if (key === 'reference') return (
                            <Link to={`/binding-authorities/${r.id}`} aria-label={`View contract ${r.reference ?? r.id}`} className="text-brand-600 hover:underline">
                                {r.reference ?? '—'}
                            </Link>
                        )
                        if (key === 'status')       return r.status ?? '—'
                        if (key === 'yearOfAccount') return r.yearOfAccount ?? '—'
                        if (key === 'inceptionDate') return r.inceptionDate ?? '—'
                        if (key === 'expiryDate')   return r.expiryDate ?? '—'
                        return null
                    }}
                />
            )}
        </div>
    )
}

const PANE_CONTENT: Record<string, string> = {
    Policies: 'Policies — coming soon.',
}

export default function SubmissionTabs({
    contractType,
    submissionId,
    placingBroker,
    placingBrokerId,
    placingBrokerName,
    isEditLocked = false,
}: SubmissionTabsProps) {
    const tabs = buildTabs(contractType)
    const [activeTab, setActiveTab] = useState<string>(tabs[0])

    return (
        <div>
            <div role="tablist" className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-brand-500'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {tabs.map((tab) => (
                <div
                    key={tab}
                    role="tabpanel"
                    hidden={activeTab !== tab}
                    className="bg-white border border-t-0 border-gray-200 rounded-b-md p-4 mt-0"
                >
                    {tab === 'Placing Broking' ? (
                        <PlacingBrokingPane
                            submissionId={submissionId}
                            placingBroker={placingBroker}
                            placingBrokerId={placingBrokerId}
                            placingBrokerName={placingBrokerName}
                            isEditLocked={isEditLocked}
                        />
                    ) : tab === 'Quotes' ? (
                        <QuotesPane active={activeTab === 'Quotes'} submissionId={submissionId} />
                    ) : tab === 'Binding Authority Contracts' ? (
                        <BAContractsPane active={activeTab === 'Binding Authority Contracts'} submissionId={submissionId} />
                    ) : tab === 'Related Submissions' ? (
                        <RelatedSubmissionsPane active={activeTab === 'Related Submissions'} submissionId={submissionId} />
                    ) : tab === 'Audit' ? (
                        <AuditPane submissionId={submissionId} />
                    ) : (
                        <p className="text-sm text-gray-500">{PANE_CONTENT[tab]}</p>
                    )}
                </div>
            ))}
        </div>
    )
}
