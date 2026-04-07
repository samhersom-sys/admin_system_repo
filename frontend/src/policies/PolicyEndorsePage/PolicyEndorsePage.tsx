/**
 * PolicyEndorsePage — /policies/endorse/:id
 *
 * Create a new endorsement on an existing policy.
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-020 — renders at /policies/endorse/:id
 * REQ-POL-FE-F-021 — form: type dropdown, effective date, description; shows policy ref
 * REQ-POL-FE-F-022 — validation: empty date, out-of-range, open endorsement
 * REQ-POL-FE-F-023 — valid save POSTs and navigates to endorsement edit page
 * REQ-POL-FE-F-024 — dirty-state back-navigation barrier
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import {
    getPolicy,
    getPolicyEndorsements,
    createEndorsement,
} from '@/policies/policies.service'
import type { Policy, PolicyTransaction } from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

// Module-level sidebar section (stable reference)
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Policy Endorsement',
    items: [
        { label: 'Save', icon: FiSave, event: 'policy:endorse-save' },
    ],
}

export default function PolicyEndorsePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [endorsements, setEndorsements] = useState<PolicyTransaction[]>([])

    const [endorsementType, setEndorsementType] = useState('Mid Term Adjustment')
    const [effectiveDate, setEffectiveDate] = useState('')
    const [description, setDescription] = useState('')

    // Dirty tracking state
    const [isDirty, setIsDirty] = useState(false)

    useSidebarSection(SIDEBAR_SECTION)

    // Wave 1: load policy on mount
    useEffect(() => {
        if (!id) return
        getPolicy(id)
            .then((pol) => setPolicy(pol))
            .catch((err: Error) =>
                addNotification({ message: `Could not load policy: ${err.message}`, type: 'error' })
            )
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Wave 2: once policy loaded, load endorsements
    useEffect(() => {
        if (!policy || !id) return
        getPolicyEndorsements(id)
            .then((ends) => setEndorsements(ends))
            .catch((err: Error) =>
                addNotification({ message: `Could not load endorsements: ${err.message}`, type: 'error' })
            )
    }, [policy]) // eslint-disable-line react-hooks/exhaustive-deps

    // Mark form dirty when any field changes
    useEffect(() => {
        if (effectiveDate || description) {
            setIsDirty(true)
        }
    }, [effectiveDate, description])

    // REQ-POL-FE-F-024 — back-navigation barrier when dirty
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

    // REQ-POL-FE-F-022, F-023 — save handler
    const handleSave = useCallback(async () => {
        if (!policy) return

        // Validation
        if (!effectiveDate) {
            addNotification({ message: 'Effective date is required.', type: 'error' })
            return
        }

        const inception = policy.inception_date
        const expiry = policy.expiry_date
        if (inception && effectiveDate < inception) {
            addNotification({ message: 'Effective date must be on or after the policy inception date.', type: 'error' })
            return
        }
        if (expiry && effectiveDate > expiry) {
            addNotification({ message: 'Effective date must be on or before the policy expiry date.', type: 'error' })
            return
        }

        const openEndorsement = endorsements.find(
            (e) => e.status === 'Endorsement Created'
        )
        if (openEndorsement) {
            addNotification({
                message: 'A pending endorsement already exists on this policy. Issue or cancel it before creating another.',
                type: 'error',
            })
            return
        }

        try {
            const newEnd = await createEndorsement(id!, {
                transactionType: endorsementType,
                effectiveDate,
                description: description || undefined,
            })
            setIsDirty(false)
            navigate(`/policies/${id}/endorsements/${newEnd.id}/edit`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create endorsement.'
            addNotification({ message: `Endorsement creation failed: ${msg}`, type: 'error' })
        }
    }, [policy, endorsements, id, effectiveDate, endorsementType, description, addNotification, navigate])

    useEffect(() => {
        const onSave = () => handleSave()
        window.addEventListener('policy:endorse-save', onSave)
        return () => window.removeEventListener('policy:endorse-save', onSave)
    }, [handleSave])

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xl font-semibold text-gray-900">Create Endorsement</p>
                    <p className="text-sm text-gray-500 mt-0.5">{policy?.reference ?? '…'}</p>
                </div>
                <Link to={`/policies/${id}`} className="text-sm text-brand-600 hover:underline">
                    ← Back to Policy
                </Link>
            </div>

            <Card>
                <FieldGroup title="Endorsement Details">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label
                                htmlFor="endorse-type"
                                className="block text-xs text-gray-500 mb-1"
                            >
                                Endorsement Type
                            </label>
                            <select
                                id="endorse-type"
                                aria-label="Endorsement Type"
                                className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                value={endorsementType}
                                onChange={(e) => setEndorsementType(e.target.value)}
                            >
                                <option>Mid Term Adjustment</option>
                                <option>Cancellation</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="endorse-date"
                                className="block text-xs text-gray-500 mb-1"
                            >
                                Effective Date
                            </label>
                            <input
                                id="endorse-date"
                                type="date"
                                aria-label="Effective Date"
                                className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="endorse-description"
                                className="block text-xs text-gray-500 mb-1"
                            >
                                Description
                            </label>
                            <textarea
                                id="endorse-description"
                                aria-label="Description"
                                rows={3}
                                className="block w-full border border-gray-300 rounded px-3 py-1.5 text-sm resize-none"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </FieldGroup>
            </Card>
        </div>
    )
}
