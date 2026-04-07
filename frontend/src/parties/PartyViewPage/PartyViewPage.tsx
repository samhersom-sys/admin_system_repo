/**
 * PartyViewPage — /parties/:id
 *
 * Requirements: frontend/src/parties/parties.requirements.md
 * Tests: frontend/src/parties/__tests__/PartyViewPage.test.tsx
 *
 * REQ-PAR-DOM-F-020 — load party on mount with loading state
 * REQ-PAR-DOM-F-021 — header: name, reference, type
 * REQ-PAR-DOM-F-022 — sidebar: Back, Edit, Save, Cancel
 * REQ-PAR-DOM-F-023 — 6 tabs: Details, Entities, Audit, Submissions, Quotes, Policies
 * REQ-PAR-DOM-F-024 — Details tab with 4 FieldGroups
 * REQ-PAR-DOM-F-025 — Edit/Save/Cancel flow
 * REQ-PAR-DOM-F-026 — Validation: Name, Type, AddressLine1, Country required
 * REQ-PAR-DOM-F-027 — Entities tab with ResizableGrid
 * REQ-PAR-DOM-F-028 — Audit tab with AuditTable + "Party Opened" POST
 * REQ-PAR-DOM-F-029 — Submissions tab (lazy)
 * REQ-PAR-DOM-F-030 — Quotes tab (lazy)
 * REQ-PAR-DOM-F-031 — Policies tab (placeholder)
 * REQ-PAR-DOM-F-041 — POST "Party Closed" on unmount
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi'
import {
    getParty,
    updateParty,
    getPartyEntities,
    createPartyEntity,
    updatePartyEntity,
    deletePartyEntity,
    getPartyAudit,
    postPartyAudit,
    getPartySubmissions,
    getPartyQuotes,
} from '@/parties/parties.service'
import type { Party, PartyEntity, AuditEvent } from '@/parties/parties.service'
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

// REQ-PAR-DOM-F-023: 6 tabs in this exact order
const TABS: TabItem[] = [
    { key: 'details', label: 'Details' },
    { key: 'entities', label: 'Entities' },
    { key: 'audit', label: 'Audit' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'policies', label: 'Policies' },
]

const ENTITY_COLUMNS: Column[] = [
    { key: 'name', label: 'Name', sortable: true, defaultWidth: 250 },
    { key: 'entity_type', label: 'Type', sortable: true, defaultWidth: 150 },
    { key: 'entity_code', label: 'Code', sortable: true, defaultWidth: 120 },
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 150 },
    { key: 'notes', label: 'Notes', sortable: false, defaultWidth: 300 },
]

const SUBMISSION_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 200 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 120 },
]

const QUOTE_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'insured', label: 'Insured', sortable: true, defaultWidth: 200 },
    { key: 'status', label: 'Status', sortable: true, defaultWidth: 120 },
]

// Module-level constant — required by useSidebarSection stable-ref rule (Guideline 14)
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Party',
    items: [
        { label: 'Back', icon: FiArrowLeft, event: 'party:back' },
        { label: 'Edit', icon: FiEdit2, event: 'party:edit' },
        { label: 'Save', icon: FiSave, event: 'party:save' },
        { label: 'Cancel', icon: FiX, event: 'party:cancel' },
    ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FormState {
    name: string
    type: string
    email: string
    phone: string
    addressLine1: string
    addressLine2: string
    addressLine3: string
    city: string
    state: string
    postcode: string
    country: string
    region: string
    wageRoll: string
    numberEmployees: string
    annualRevenue: string
    sicStandard: string
    sicCode: string
    sicDescription: string
}

function partyToForm(p: Party): FormState {
    return {
        name: p.name ?? '',
        type: p.type ?? '',
        email: (p.email as string) ?? '',
        phone: (p.phone as string) ?? '',
        addressLine1: (p.addressLine1 as string) ?? '',
        addressLine2: (p.addressLine2 as string) ?? '',
        addressLine3: (p.addressLine3 as string) ?? '',
        city: (p.city as string) ?? '',
        state: (p.state as string) ?? '',
        postcode: (p.postcode as string) ?? '',
        country: (p.country as string) ?? '',
        region: (p.region as string) ?? '',
        wageRoll: String(p.wageRoll ?? ''),
        numberEmployees: String(p.numberEmployees ?? ''),
        annualRevenue: String(p.annualRevenue ?? ''),
        sicStandard: (p.sicStandard as string) ?? 'US',
        sicCode: (p.sicCode as string) ?? '',
        sicDescription: (p.sicDescription as string) ?? '',
    }
}

function validateForm(f: FormState): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!f.name.trim()) errors.name = 'Name is required'
    if (!f.type.trim()) errors.type = 'Type is required'
    if (!f.addressLine1.trim()) errors.addressLine1 = 'Address Line 1 is required'
    if (!f.country.trim()) errors.country = 'Country is required'
    return errors
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartyViewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    // Core state
    const [party, setParty] = useState<Party | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('details')
    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<FormState | null>(null)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const auditPostedRef = useRef(false)

    // Entities tab
    const [entities, setEntities] = useState<PartyEntity[]>([])
    const [entitiesLoaded, setEntitiesLoaded] = useState(false)

    // Audit tab
    const [audit, setAudit] = useState<AuditEvent[]>([])

    // Submissions tab
    const [submissions, setSubmissions] = useState<unknown[]>([])
    const [submissionsLoaded, setSubmissionsLoaded] = useState(false)

    // Quotes tab
    const [quotes, setQuotes] = useState<unknown[]>([])
    const [quotesLoaded, setQuotesLoaded] = useState(false)

    // Register sidebar section (F-022)
    useSidebarSection(SIDEBAR_SECTION)

    // ---------------------------------------------------------------------------
    // Data loading — sequential pattern (proven in Batch D)
    // ---------------------------------------------------------------------------

    // Wave 1: load party
    useEffect(() => {
        if (!id) return
        setLoading(true)
        setLoadError(null)
        getParty(id)
            .then((p) => {
                setParty(p)
                setForm(partyToForm(p))
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load party.'
                setLoadError(msg)
                addNotification(`Could not load party: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // REQ-PAR-DOM-F-041 — POST "Party Closed" on unmount
    const idRef = useRef(id)
    useEffect(() => { idRef.current = id }, [id])

    useEffect(() => {
        return () => {
            if (!idRef.current) return
            const session = getSession()
            postPartyAudit(Number(idRef.current), {
                action: 'Party Closed',
                entityType: 'Party',
                entityId: Number(idRef.current),
                performedBy: session?.user?.name,
            }).catch(() => undefined)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ---------------------------------------------------------------------------
    // Tab change handler (lazy loading)
    // ---------------------------------------------------------------------------

    function handleTabChange(key: string) {
        setActiveTab(key)

        // F-027: load entities on first Entities tab activation
        if (key === 'entities' && !entitiesLoaded) {
            setEntitiesLoaded(true)
            getPartyEntities(Number(id!))
                .then(setEntities)
                .catch(() => undefined)
        }

        // F-028: load audit + POST "Party Opened" on first Audit tab activation
        if (key === 'audit' && !auditPostedRef.current) {
            auditPostedRef.current = true
            const session = getSession()
            getPartyAudit(Number(id!))
                .then(setAudit)
                .catch(() => undefined)
            postPartyAudit(Number(id!), {
                action: 'Party Opened',
                entityType: 'Party',
                entityId: Number(id),
                performedBy: session?.user?.name,
            }).catch(() => undefined)
        }

        // F-029: load submissions on first Submissions tab activation
        if (key === 'submissions' && !submissionsLoaded) {
            setSubmissionsLoaded(true)
            getPartySubmissions(Number(id!))
                .then(setSubmissions)
                .catch(() => undefined)
        }

        // F-030: load quotes on first Quotes tab activation
        if (key === 'quotes' && !quotesLoaded) {
            setQuotesLoaded(true)
            getPartyQuotes(Number(id!))
                .then(setQuotes)
                .catch(() => undefined)
        }
    }

    // ---------------------------------------------------------------------------
    // Sidebar event handlers
    // ---------------------------------------------------------------------------

    const handleBack = useCallback(() => navigate('/parties'), [navigate])
    const handleEdit = useCallback(() => {
        if (party) {
            setForm(partyToForm(party))
            setValidationErrors({})
            setIsEditing(true)
        }
    }, [party])

    const handleSave = useCallback(async () => {
        if (!form || !party || !id) return
        const errors = validateForm(form)
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            addNotification('Please fix validation errors before saving.', 'error')
            return
        }
        try {
            const updated = await updateParty(id, {
                name: form.name,
                type: form.type,
                email: form.email || undefined,
                phone: form.phone || undefined,
                addressLine1: form.addressLine1 || undefined,
                addressLine2: form.addressLine2 || undefined,
                addressLine3: form.addressLine3 || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                postcode: form.postcode || undefined,
                country: form.country || undefined,
                region: form.region || undefined,
                wageRoll: form.wageRoll || undefined,
                numberEmployees: form.numberEmployees || undefined,
                annualRevenue: form.annualRevenue || undefined,
                sicStandard: form.sicStandard || undefined,
                sicCode: form.sicCode || undefined,
                sicDescription: form.sicDescription || undefined,
            })
            setParty(updated)
            setForm(partyToForm(updated))
            setIsEditing(false)
            setValidationErrors({})
            addNotification('Party updated successfully', 'success')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Save failed'
            addNotification(`Failed to save: ${msg}`, 'error')
        }
    }, [form, party, id, addNotification])

    const handleCancel = useCallback(() => {
        if (party) setForm(partyToForm(party))
        setIsEditing(false)
        setValidationErrors({})
    }, [party])

    // Wire sidebar events
    useEffect(() => {
        const onBack = () => handleBack()
        const onEdit = () => handleEdit()
        const onSave = () => { handleSave() }
        const onCancel = () => handleCancel()
        window.addEventListener('party:back', onBack)
        window.addEventListener('party:edit', onEdit)
        window.addEventListener('party:save', onSave)
        window.addEventListener('party:cancel', onCancel)
        return () => {
            window.removeEventListener('party:back', onBack)
            window.removeEventListener('party:edit', onEdit)
            window.removeEventListener('party:save', onSave)
            window.removeEventListener('party:cancel', onCancel)
        }
    }, [handleBack, handleEdit, handleSave, handleCancel])

    // ---------------------------------------------------------------------------
    // Form change handler
    // ---------------------------------------------------------------------------

    function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        if (!form) return
        const { name, value } = e.target
        setForm({ ...form, [name]: value })
        if (validationErrors[name]) {
            const next = { ...validationErrors }
            delete next[name]
            setValidationErrors(next)
        }
    }

    // ---------------------------------------------------------------------------
    // Entity CRUD handlers
    // ---------------------------------------------------------------------------

    async function handleAddEntity() {
        if (!id) return
        try {
            const created = await createPartyEntity(id, {
                name: 'New Entity',
                entity_type: 'Syndicate',
            })
            setEntities((prev) => [...prev, created])
        } catch {
            addNotification('Failed to create entity', 'error')
        }
    }

    async function handleDeleteEntity(entityId: number) {
        if (!id) return
        try {
            await deletePartyEntity(id, entityId)
            setEntities((prev) => prev.filter((e) => e.id !== entityId))
            addNotification('Entity deleted', 'success')
        } catch {
            addNotification('Failed to delete entity', 'error')
        }
    }

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

    if (!party || !form) return null

    // ---------------------------------------------------------------------------
    // Cell renderers
    // ---------------------------------------------------------------------------

    function renderEntityCell(key: string, row: unknown): React.ReactNode {
        const e = row as PartyEntity
        if (key === 'name') {
            return (
                <span className="font-medium">{e.name || '\u2014'}</span>
            )
        }
        const val = (e as Record<string, unknown>)[key]
        return val != null ? String(val) : '\u2014'
    }

    function renderSubmissionCell(key: string, row: unknown): React.ReactNode {
        const val = (row as Record<string, unknown>)[key]
        return val != null ? String(val) : '\u2014'
    }

    function renderQuoteCell(key: string, row: unknown): React.ReactNode {
        const val = (row as Record<string, unknown>)[key]
        return val != null ? String(val) : '\u2014'
    }

    // ---------------------------------------------------------------------------
    // JSX
    // ---------------------------------------------------------------------------

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header — F-021 */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xl font-semibold text-gray-900">{party.name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                            {party.reference ?? `PAR-${party.id}`} &middot; {party.type}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Tabs — F-023 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

            {/* Details Tab — F-024, F-025, F-026 */}
            {activeTab === 'details' && (
                <div className="flex flex-col gap-4">
                    <FieldGroup title="Core Information">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600">Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleFieldChange}
                                        className={`w-full border rounded px-2 py-1 text-sm ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{party.name || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Type</label>
                                {isEditing ? (
                                    <select
                                        name="type"
                                        value={form.type}
                                        onChange={handleFieldChange}
                                        className={`w-full border rounded px-2 py-1 text-sm ${validationErrors.type ? 'border-red-500' : 'border-gray-300'}`}
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="Insured">Insured</option>
                                        <option value="Broker">Broker</option>
                                        <option value="Insurer">Insurer</option>
                                        <option value="Coverholder">Coverholder</option>
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-900">{party.type || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.email as string) || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Phone</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.phone as string) || '\u2014'}</p>
                                )}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Address">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-3">
                                <label className="text-xs font-medium text-gray-600">Address Line 1</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="addressLine1"
                                        value={form.addressLine1}
                                        onChange={handleFieldChange}
                                        className={`w-full border rounded px-2 py-1 text-sm ${validationErrors.addressLine1 ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.addressLine1 as string) || '\u2014'}</p>
                                )}
                            </div>
                            <div className="col-span-3">
                                <label className="text-xs font-medium text-gray-600">Address Line 2</label>
                                {isEditing ? (
                                    <input type="text" name="addressLine2" value={form.addressLine2} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.addressLine2 as string) || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">City</label>
                                {isEditing ? (
                                    <input type="text" name="city" value={form.city} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.city as string) || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Country</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="country"
                                        value={form.country}
                                        onChange={handleFieldChange}
                                        className={`w-full border rounded px-2 py-1 text-sm ${validationErrors.country ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.country as string) || '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Postcode</label>
                                {isEditing ? (
                                    <input type="text" name="postcode" value={form.postcode} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{(party.postcode as string) || '\u2014'}</p>
                                )}
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Classification">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600">SIC Standard</label>
                                <p className="text-sm text-gray-900">{(party.sicStandard as string) || '\u2014'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">SIC Code</label>
                                <p className="text-sm text-gray-900">{(party.sicCode as string) || '\u2014'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">SIC Description</label>
                                <p className="text-sm text-gray-900">{(party.sicDescription as string) || '\u2014'}</p>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Workforce & Financials">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600">Wage Roll</label>
                                {isEditing ? (
                                    <input type="number" name="wageRoll" value={form.wageRoll} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{party.wageRoll ?? '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Number of Employees</label>
                                {isEditing ? (
                                    <input type="number" name="numberEmployees" value={form.numberEmployees} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{party.numberEmployees ?? '\u2014'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Annual Revenue</label>
                                {isEditing ? (
                                    <input type="number" name="annualRevenue" value={form.annualRevenue} onChange={handleFieldChange}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                ) : (
                                    <p className="text-sm text-gray-900">{party.annualRevenue ?? '\u2014'}</p>
                                )}
                            </div>
                        </div>
                    </FieldGroup>
                </div>
            )}

            {/* Entities Tab — F-027 */}
            {activeTab === 'entities' && (
                <div>
                    <div className="flex justify-end mb-2">
                        <button
                            type="button"
                            onClick={handleAddEntity}
                            className="text-sm text-brand-600 hover:text-brand-800"
                            data-testid="add-entity-btn"
                        >
                            + Add Entity
                        </button>
                    </div>
                    <ResizableGrid
                        columns={ENTITY_COLUMNS}
                        rows={entities}
                        storageKey="table-widths-party-entities"
                        renderCell={renderEntityCell}
                        rowKey={(row) => (row as PartyEntity).id}
                        emptyMessage="No entities found."
                    />
                </div>
            )}

            {/* Audit Tab — F-028 */}
            {activeTab === 'audit' && (
                <AuditTable audit={audit} entityType="party" />
            )}

            {/* Submissions Tab — F-029 */}
            {activeTab === 'submissions' && (
                <ResizableGrid
                    columns={SUBMISSION_COLUMNS}
                    rows={submissions}
                    storageKey="table-widths-party-submissions"
                    renderCell={renderSubmissionCell}
                    emptyMessage="No related submissions."
                />
            )}

            {/* Quotes Tab — F-030 */}
            {activeTab === 'quotes' && (
                <ResizableGrid
                    columns={QUOTE_COLUMNS}
                    rows={quotes}
                    storageKey="table-widths-party-quotes"
                    renderCell={renderQuoteCell}
                    emptyMessage="No related quotes."
                />
            )}

            {/* Policies Tab — F-031 (placeholder) */}
            {activeTab === 'policies' && (
                <Card>
                    <p className="text-sm text-gray-500 italic">Coming soon</p>
                </Card>
            )}
        </div>
    )
}
