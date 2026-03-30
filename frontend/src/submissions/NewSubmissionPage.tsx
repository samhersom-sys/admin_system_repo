/**
 * New Submission Page — /submissions/new
 *
 * Composes InsuredSearch, SubmissionIdentity, and SubmissionDetails.
 * Save is triggered via the sidebar "Save" button which fires the
 * `submission:save` DOM event.  SubmissionDetails validates fields and
 * calls onSave(values) which this page handles by calling createSubmission.
 *
 * Requirements: requirements.md
 * Tests: new.test.tsx
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave, FiUsers, FiFile } from 'react-icons/fi'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import {
    createSubmission,
} from '@/submissions/submissions.service'
import SubmissionIdentity from '@/submissions/SubmissionIdentity/SubmissionIdentity'
import SubmissionDetails from '@/submissions/SubmissionDetails/SubmissionDetails'
import type { SubmissionDetailsValues } from '@/submissions/SubmissionDetails/SubmissionDetails'
import InsuredSearch from '@/parties/InsuredSearch/InsuredSearch'
import BrokerSearch from '@/parties/BrokerSearch/BrokerSearch'
import type { Party } from '@/parties/parties.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'

// ---------------------------------------------------------------------------
// Sidebar section (per guideline §14 Rule 7)
// ---------------------------------------------------------------------------
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Submission',
    items: [
        { label: 'Save', icon: FiSave, event: 'submission:save' },
        { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
        { label: 'Quote', icon: FiFile, to: '/quotes/new' },
    ],
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NewSubmissionPage() {
    const navigate = useNavigate()
    const session = getSession()
    const orgCode = session?.user?.orgCode ?? 'ORG'
    const createdBy = session?.user?.name ?? 'Unknown'

    const { addNotification } = useNotifications()

    const [insuredParty, setInsuredParty] = useState<Party | null>(null)
    const [insuredError, setInsuredError] = useState<string | null>(null)
    const [brokerParty, setBrokerParty] = useState<Party | null>(null)
    const [saveError, setSaveError] = useState<string | undefined>(undefined)
    const [isSaving, setIsSaving] = useState(false)

    // Register sidebar Save action
    useSidebarSection(SIDEBAR_SECTION)

    // Dirty: insured or broker selected but not yet saved
    const isDirty = !isSaving && (insuredParty !== null || brokerParty !== null)

    // Prevent accidental browser close/refresh when form has selections
    useEffect(() => {
        if (!isDirty) return
        function handler(e: BeforeUnloadEvent) {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    // SubmissionDetails.onSave is called when submission:save fires and fields
    // are valid.  At this point insuredParty is available via closure.
    const handleDetailsSave = useCallback(async (values: SubmissionDetailsValues) => {
        if (!insuredParty) {
            setInsuredError('Please select an insured before saving.')
            addNotification('Submission not saved: insured is required.', 'error')
            return
        }
        setInsuredError(null)
        setSaveError(undefined)
        setIsSaving(true)
        try {
            const submission = await createSubmission({
                insuredId: String(insuredParty.id),
                insuredName: insuredParty.name,
                placingBrokerId: brokerParty ? String(brokerParty.id) : undefined,
                placingBroker: brokerParty?.name,
                inceptionDate: values.inceptionDate,
                expiryDate: values.expiryDate,
                renewalDate: values.renewalDate,
                contractType: values.contractType,
                orgCode,
                createdBy,
                submissionType: 'Submission',
            })
            navigate(`/submissions/${submission.id}`)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred'
            setSaveError(message)
            addNotification(`Submission save failed: ${message}`, 'error')
            setIsSaving(false)
        }
    }, [insuredParty, orgCode, createdBy, navigate, addNotification])

    const handleValidationError = useCallback((msg: string) => {
        setSaveError(msg)
        addNotification(`Submission not saved: ${msg}`, 'error')
    }, [addNotification])

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Error / saving banners */}
            {(saveError || insuredError) && (
                <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {insuredError ?? saveError}
                </div>
            )}
            {isSaving && <p className="text-sm text-gray-400">Saving…</p>}

            {/* Unsaved changes banner */}
            {isDirty && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    You have unsaved changes.
                </p>
            )}

            {/* SubmissionIdentity */}
            <Card>
                <SubmissionIdentity reference="" status="Created" />
            </Card>

            {/* InsuredSearch + BrokerSearch — side by side on wide screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <InsuredSearch
                        selectedParty={insuredParty}
                        onSelect={(party) => { setInsuredParty(party); setInsuredError(null) }}
                    />
                </Card>

                <Card>
                    <BrokerSearch
                        selectedParty={brokerParty}
                        onSelect={setBrokerParty}
                    />
                </Card>
            </div>

            {/* SubmissionDetails */}
            <Card title="Submission Details">
                <SubmissionDetails
                    onSave={handleDetailsSave}
                    onValidationError={handleValidationError}
                />
            </Card>
        </div>
    )
}
