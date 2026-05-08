/**
 * BAEndorsePage — /binding-authorities/endorse/:id
 *
 * Create a new endorsement on an existing binding authority.
 *
 * Requirements: binding-authorities.requirements.md
 * Tests: binding-authorities/__tests__/binding-authorities.test.tsx
 *
 * REQ-BA-FE-F-123 — renders at /binding-authorities/endorse/:id
 * REQ-BA-FE-F-124 — form: type select (Administrative/Contractual), effective date, description; Draft BA shows error
 * REQ-BA-FE-F-125 — validation: empty date, out-of-range, open endorsement
 * REQ-BA-FE-F-126 — valid save POSTs and navigates to endorsement edit page
 * REQ-BA-FE-F-127 — dirty-state back-navigation barrier
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import {
    getBindingAuthority,
    getBATransactions,
    createBATransaction,
} from '@/binding-authorities/binding-authorities.service'
import type { BindingAuthority, BATransaction } from '@/binding-authorities/binding-authorities.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

const SIDEBAR_SECTION: SidebarSection = {
    title: 'Binding Authority',
    items: [
        { label: 'Save', icon: FiSave, event: 'ba:endorse-save' },
    ],
}

export default function BAEndorsePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [transactions, setTransactions] = useState<BATransaction[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)

    const [endorsementType, setEndorsementType] = useState('Administrative')
    const [endorsementSubType, setEndorsementSubType] = useState('Mid Term Adjustment')
    const [effectiveDate, setEffectiveDate] = useState('')
    const [description, setDescription] = useState('')

    const [isDirty, setIsDirty] = useState(false)

    useSidebarSection(SIDEBAR_SECTION)

    useEffect(() => {
        if (!id) return
        getBindingAuthority(id as unknown as number)
            .then(data => setBa(data))
            .catch((err: Error) => setLoadError(err.message))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!ba || !id) return
        getBATransactions(id as unknown as number)
            .then(txs => setTransactions(txs))
            .catch(() => { /* non-blocking */ })
    }, [ba]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (endorsementType !== 'Administrative' || effectiveDate || description) {
            setIsDirty(true)
        }
    }, [endorsementType, effectiveDate, description])

    // REQ-BA-FE-F-127 — back-navigation barrier when dirty
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
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [isDirty])

    // REQ-BA-FE-F-125, F-126 — save handler
    const handleSave = useCallback(async () => {
        if (!ba) return

        if (!effectiveDate) {
            addNotification('Effective date is required.', 'error')
            return
        }

        const inception = ba.inception_date
        const expiry = ba.expiry_date
        if (inception && effectiveDate < inception) {
            addNotification('Effective date is outside the binding authority contract period.', 'error')
            return
        }
        if (expiry && effectiveDate > expiry) {
            addNotification('Effective date is outside the binding authority contract period.', 'error')
            return
        }

        // One Draft endorsement allowed per type (Contractual or Administrative)
        const openEndorsement = transactions.find(
            tx => tx.status === 'Draft' && tx.type === endorsementType
        )
        if (openEndorsement) {
            addNotification('An open endorsement already exists on this binding authority. Issue it before creating another.', 'error')
            return
        }

        try {
            const tx = await createBATransaction(ba.id, {
                type: endorsementType,
                ...(endorsementType !== 'Administrative' ? { sub_type: endorsementSubType } : {}),
                effective_date: effectiveDate,
                description: description || undefined,
                status: 'Draft',
            })
            setIsDirty(false)
            navigate(`/binding-authorities/${ba.id}/endorsements/${tx.id}/edit`, { replace: true })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create endorsement.'
            addNotification(`Endorsement creation failed: ${msg}`, 'error')
        }
    }, [ba, transactions, effectiveDate, endorsementType, endorsementSubType, description, addNotification, navigate])

    useEffect(() => {
        const onSave = () => handleSave()
        window.addEventListener('ba:endorse-save', onSave)
        return () => window.removeEventListener('ba:endorse-save', onSave)
    }, [handleSave])

    if (loadError) return <p className="p-6 text-red-600">Could not load binding authority: {loadError}</p>

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Create Endorsement</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {ba?.reference ?? '…'} &mdash; {ba?.status ?? '…'}
                        {ba?.inception_date && ba?.expiry_date
                            ? ` (${ba.inception_date} – ${ba.expiry_date})`
                            : ''}
                    </p>
                </div>
                <Link
                    to={`/binding-authorities/${id}`}
                    className="text-sm text-brand-600 hover:underline"
                >
                    ← Back to Binding Authority
                </Link>
            </div>

            {ba?.status !== 'Active' ? (
                <Card>
                    <p className="text-sm text-red-600">
                        {ba?.status === 'Draft'
                            ? 'Endorsements cannot be created on a Draft binding authority. Issue the binding authority first.'
                            : `Endorsements cannot be created on a ${ba?.status ?? ''} binding authority.`}
                    </p>
                </Card>
            ) : (
                <Card>
                    <FieldGroup title="Endorsement Details">
                        <div className="flex flex-col gap-4">
                            {/* Endorsement Type + Sub Type in a 2-column row (REQ-BA-FE-F-124, F-133) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="ba-endorse-type"
                                        className="block text-xs text-gray-500 mb-1"
                                    >
                                        Endorsement Type
                                    </label>
                                    <select
                                        id="ba-endorse-type"
                                        aria-label="Endorsement Type"
                                        className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                        value={endorsementType}
                                        onChange={e => {
                                            setEndorsementType(e.target.value)
                                            setEndorsementSubType('Mid Term Adjustment')
                                        }}
                                    >
                                        <option value="Administrative">Administrative</option>
                                        <option value="Contractual">Contractual</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="ba-endorse-subtype"
                                        className="block text-xs text-gray-500 mb-1"
                                    >
                                        Endorsement Sub Type
                                    </label>
                                    <select
                                        id="ba-endorse-subtype"
                                        aria-label="Endorsement Sub Type"
                                        className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        value={endorsementSubType}
                                        disabled={endorsementType === 'Administrative'}
                                        onChange={e => setEndorsementSubType(e.target.value)}
                                    >
                                        <option value="Mid Term Adjustment">Mid Term Adjustment</option>
                                        <option value="Cancellation">Cancellation</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="ba-endorse-date"
                                    className="block text-xs text-gray-500 mb-1"
                                >
                                    Effective Date
                                </label>
                                <input
                                    id="ba-endorse-date"
                                    type="date"
                                    aria-label="Effective Date"
                                    className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    value={effectiveDate}
                                    onChange={e => setEffectiveDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="ba-endorse-description"
                                    className="block text-xs text-gray-500 mb-1"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="ba-endorse-description"
                                    aria-label="Description"
                                    rows={3}
                                    placeholder="Describe the reason for this endorsement…"
                                    className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </FieldGroup>
                </Card>
            )}
        </div>
    )
}
