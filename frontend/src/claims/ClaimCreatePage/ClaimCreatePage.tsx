/**
 * ClaimCreatePage — /claims/create
 *
 * Requirements: claims.requirements.md §R03
 * Tests: __tests__/ClaimCreatePage.test.tsx
 *
 * REQ-CLM-FE-F-020 — Page renders at /claims/create
 * REQ-CLM-FE-F-021 — Form fields: Policy Reference, Date of Loss, Reported Date,
 *                     Description, Loss Type, Claimant Name, Claimant Contact
 * REQ-CLM-FE-F-022 — Validation: Policy Reference + Date of Loss required
 * REQ-CLM-FE-F-023 — Successful submission → createClaim → navigate to /claims/:id
 * REQ-CLM-FE-F-024 — Cancel button → navigate to /claims
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClaim } from '@/claims/claims.service'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'

const LOSS_TYPES = ['Property Damage', 'Bodily Injury', 'Liability', 'Business Interruption', 'Other']

export default function ClaimCreatePage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policyRef, setPolicyRef] = useState('')
    const [lossDate, setLossDate] = useState('')
    const [reportedDate, setReportedDate] = useState('')
    const [description, setDescription] = useState('')
    const [lossType, setLossType] = useState('')
    const [claimantName, setClaimantName] = useState('')
    const [claimantContact, setClaimantContact] = useState('')

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    function validate(): boolean {
        const next: Record<string, string> = {}
        if (!policyRef.trim()) next.policyRef = 'Policy Reference is required'
        if (!lossDate) next.lossDate = 'Date of Loss is required'
        setErrors(next)
        return Object.keys(next).length === 0
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!validate()) return

        setSaving(true)
        try {
            const result = await createClaim({
                policyId: Number(policyRef.trim()),
                lossDate,
                reportedDate: reportedDate || undefined,
                description: description.trim() || undefined,
                lossType: lossType || undefined,
                claimantName: claimantName.trim() || undefined,
                claimantContact: claimantContact.trim() || undefined,
            })
            navigate(`/claims/${result.id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create claim.'
            addNotification(msg, 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">
                New Claim
            </p>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left — required fields */}
                    <Card title="Claim Details">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="policyRef" className="block text-sm font-medium text-gray-700 mb-1">
                                    Policy Reference <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="policyRef"
                                    type="text"
                                    value={policyRef}
                                    onChange={(e) => setPolicyRef(e.target.value)}
                                    aria-label="Policy Reference"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                {errors.policyRef && (
                                    <p className="text-xs text-red-600 mt-1">{errors.policyRef}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="lossDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Date of Loss <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="lossDate"
                                    type="date"
                                    value={lossDate}
                                    onChange={(e) => setLossDate(e.target.value)}
                                    aria-label="Date of Loss"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                {errors.lossDate && (
                                    <p className="text-xs text-red-600 mt-1">{errors.lossDate}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="reportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reported Date
                                </label>
                                <input
                                    id="reportedDate"
                                    type="date"
                                    value={reportedDate}
                                    onChange={(e) => setReportedDate(e.target.value)}
                                    aria-label="Reported Date"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    aria-label="Description"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Right — optional fields */}
                    <Card title="Additional Information">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="lossType" className="block text-sm font-medium text-gray-700 mb-1">
                                    Loss Type
                                </label>
                                <select
                                    id="lossType"
                                    value={lossType}
                                    onChange={(e) => setLossType(e.target.value)}
                                    aria-label="Loss Type"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    <option value="">Select type…</option>
                                    {LOSS_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="claimantName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Claimant Name
                                </label>
                                <input
                                    id="claimantName"
                                    type="text"
                                    value={claimantName}
                                    onChange={(e) => setClaimantName(e.target.value)}
                                    aria-label="Claimant Name"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="claimantContact" className="block text-sm font-medium text-gray-700 mb-1">
                                    Claimant Contact
                                </label>
                                <input
                                    id="claimantContact"
                                    type="text"
                                    value={claimantContact}
                                    onChange={(e) => setClaimantContact(e.target.value)}
                                    aria-label="Claimant Contact"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded hover:bg-brand-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Create Claim'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/claims')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
