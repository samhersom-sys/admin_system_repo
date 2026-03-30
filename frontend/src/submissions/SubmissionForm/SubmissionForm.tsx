/**
 * SubmissionForm — controlled form for creating a new submission.
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 *
 * Does NOT make API calls. Navigation is handled by the parent page.
 */

import React, { useState } from 'react'
import { defaultExpiryDate } from '@/submissions/submissions.service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionFormValues {
    insuredName: string
    insuredId: string
    inceptionDate: string
    expiryDate: string
    contractType: string
}

interface FormErrors {
    insuredName?: string
    inceptionDate?: string
    expiryDate?: string
}

export interface SubmissionFormProps {
    /** System-generated reference — read-only display only */
    reference: string
    onSubmit: (values: SubmissionFormValues) => void
    isLoading: boolean
    errorMessage?: string
}

const CONTRACT_TYPES = [
    'Open Market',
    'Binding Authority Contract',
    'Lineslip',
    'Facultative',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubmissionForm({
    reference,
    onSubmit,
    isLoading,
    errorMessage,
}: SubmissionFormProps) {
    const [insuredName, setInsuredName] = useState('')
    const [insuredId, setInsuredId] = useState('')
    const [inceptionDate, setInceptionDate] = useState('')
    const [expiryDate, setExpiryDate] = useState('')
    const [contractType, setContractType] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})

    // R02 — Auto-populate expiry when inception set and expiry is blank
    function handleInceptionChange(value: string) {
        setInceptionDate(value)
        if (value && !expiryDate) {
            setExpiryDate(defaultExpiryDate(value, undefined))
        }
    }

    // R03 — Client-side validation
    function validate(): FormErrors {
        const errs: FormErrors = {}
        if (!insuredName.trim()) errs.insuredName = 'Insured name is required'
        if (!inceptionDate) errs.inceptionDate = 'Inception date is required'
        if (!expiryDate) errs.expiryDate = 'Expiry date is required'
        return errs
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        setErrors(errs)
        if (Object.keys(errs).length > 0) return
        onSubmit({ insuredName, insuredId, inceptionDate, expiryDate, contractType })
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* R06 — API-level error message from parent */}
            {errorMessage && (
                <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            {/* ── System-generated read-only fields ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="sub-reference" className="block text-sm font-medium text-gray-700 mb-1">
                        Reference
                    </label>
                    <input
                        id="sub-reference"
                        type="text"
                        readOnly
                        value={reference}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                        title="System generated"
                    />
                </div>
                <div>
                    <label htmlFor="sub-status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <input
                        id="sub-status"
                        type="text"
                        readOnly
                        value="Created"
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                        title="System generated"
                    />
                </div>
            </div>

            {/* ── Insured ── */}
            <div>
                <label htmlFor="sub-insured-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Insured Name <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                    <input
                        id="sub-insured-name"
                        type="text"
                        value={insuredName}
                        onChange={(e) => setInsuredName(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        aria-describedby={errors.insuredName ? 'insured-name-error' : undefined}
                    />
                    <button
                        type="button"
                        aria-label="Search Insured"
                        onClick={() => {/* TODO: open party search modal */ }}
                        className="absolute right-2 text-gray-400 hover:text-brand-600"
                    >
                        {/* Magnifier icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
                {errors.insuredName && (
                    <p id="insured-name-error" className="mt-1 text-sm text-red-600">
                        {errors.insuredName}
                    </p>
                )}
            </div>

            {/* ── Dates ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="sub-inception-date" className="block text-sm font-medium text-gray-700 mb-1">
                        Inception Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="sub-inception-date"
                        type="date"
                        value={inceptionDate}
                        onChange={(e) => handleInceptionChange(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        aria-describedby={errors.inceptionDate ? 'inception-date-error' : undefined}
                    />
                    {errors.inceptionDate && (
                        <p id="inception-date-error" className="mt-1 text-sm text-red-600">
                            {errors.inceptionDate}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="sub-expiry-date" className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="sub-expiry-date"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        aria-describedby={errors.expiryDate ? 'expiry-date-error' : undefined}
                    />
                    {errors.expiryDate && (
                        <p id="expiry-date-error" className="mt-1 text-sm text-red-600">
                            {errors.expiryDate}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Contract Type ── */}
            <div>
                <label htmlFor="sub-contract-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type
                </label>
                <select
                    id="sub-contract-type"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    <option value="">— select —</option>
                    {CONTRACT_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>
            </div>

            {/* ── Submit ── */}
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    {isLoading ? 'Saving…' : 'Create Submission'}
                </button>
            </div>

        </form>
    )
}
