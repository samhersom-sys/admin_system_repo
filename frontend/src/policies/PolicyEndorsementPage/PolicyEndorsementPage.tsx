/**
 * PolicyEndorsementPage — /policies/:id/endorsements/:endorsementId/edit
 *
 * View and edit an existing endorsement on a policy.  Issue / cancel it.
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-025 — renders with policy + endorsement loaded; error if not found
 * REQ-POL-FE-F-026 — policy in editable mode with endorsement subtitle
 * REQ-POL-FE-F-027 — Issue Endorsement PUT, Cancellation sets Cancelled
 * REQ-POL-FE-F-028 — dirty-state back-navigation barrier
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi'
import {
    getPolicy,
    getPolicyEndorsements,
    issueEndorsement,
} from '@/policies/policies.service'
import type { Policy, PolicyTransaction } from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'

const STATUS_CLASSES: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Expired: 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-yellow-100 text-yellow-800',
}

export default function PolicyEndorsementPage() {
    const { id, endorsementId } = useParams<{ id: string; endorsementId: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [endorsement, setEndorsement] = useState<PolicyTransaction | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Editable fields for the endorsement
    const [effectiveDate, setEffectiveDate] = useState('')
    const [description, setDescription] = useState('')

    // Wave 1: load policy on mount
    useEffect(() => {
        if (!id) return
        getPolicy(id)
            .then((pol) => setPolicy(pol))
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load policy.'
                setLoadError(msg)
                addNotification({ message: `Could not load policy: ${msg}`, type: 'error' })
            })
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Wave 2: once policy loaded, load endorsements and find the target
    useEffect(() => {
        if (!policy || !id) return
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

    // REQ-POL-FE-F-028 — back-navigation barrier when dirty
    const [isDirty, setIsDirty] = useState(false)
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

    // REQ-POL-FE-F-027 — Issue Endorsement action
    const handleIssue = useCallback(async () => {
        if (!id || !endorsementId) return
        try {
            await issueEndorsement(id, endorsementId)
            addNotification({ message: 'Endorsement issued successfully.', type: 'success' })
            setIsDirty(false)
            navigate(`/policies/${id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to issue endorsement.'
            addNotification({ message: `Issue endorsement failed: ${msg}`, type: 'error' })
        }
    }, [id, endorsementId, addNotification, navigate])

    // Build sidebar section
    const sidebarSection = useMemo((): SidebarSection => {
        const items: SidebarSection['items'] = [
            { label: 'Issue Endorsement', icon: FiCheckCircle, event: 'policy:issue-endorsement' },
            { label: 'Back to Policy', icon: FiArrowLeft, to: `/policies/${id}` },
        ]
        return { title: 'Endorsement', items }
    }, [id])

    useSidebarSection(sidebarSection)

    useEffect(() => {
        const onIssue = () => handleIssue()
        window.addEventListener('policy:issue-endorsement', onIssue)
        return () => window.removeEventListener('policy:issue-endorsement', onIssue)
    }, [handleIssue])

    // ---------------------------------------------------------------------------
    // Render
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

    const inputCls = 'block w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500'

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header — F-026 */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xl font-semibold text-gray-900">{policy?.reference ?? '…'}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Endorsement — Effective{' '}
                            {endorsement?.effective_date ?? '—'}
                        </p>
                    </div>
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[policy?.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                        {policy?.status ?? '—'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Insured</p>
                        <p className="text-gray-900">{policy?.insured ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-gray-900">{endorsement?.status ?? '—'}</p>
                    </div>
                </div>
            </Card>

            {/* Endorsement details form */}
            <Card>
                <FieldGroup title="Details">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Effective Date
                            </label>
                            <input
                                type="date"
                                className={inputCls}
                                value={effectiveDate}
                                onChange={(e) => { setEffectiveDate(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                className={inputCls}
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
                            />
                        </div>
                    </div>
                </FieldGroup>
            </Card>
        </div>
    )
}
