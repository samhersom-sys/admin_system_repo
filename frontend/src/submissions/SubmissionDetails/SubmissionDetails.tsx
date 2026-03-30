/**
 * SubmissionDetails — editable dates + contract type card.
 *
 * Listens for the `submission:save` DOM event (fired by the sidebar Save
 * button).  On receipt it validates fields then calls onSave(values).
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 */

import React, { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types (R06)
// ---------------------------------------------------------------------------
export interface SubmissionDetailsValues {
    inceptionDate: string
    expiryDate: string
    renewalDate: string
    contractType: string
}

export interface SubmissionDetailsProps {
    initialValues?: Partial<SubmissionDetailsValues>
    onSave: (values: SubmissionDetailsValues) => void
    onValidationError?: (message: string) => void
}

const CONTRACT_TYPES = [
    'Open Market',
    'Binding Authority Contract',
    'Lineslip',
    'Facultative',
]

// ---------------------------------------------------------------------------
// Helper — add one year to an ISO date string
// ---------------------------------------------------------------------------
function plusOneYear(iso: string): string {
    try {
        const d = new Date(iso)
        d.setFullYear(d.getFullYear() + 1)
        return d.toISOString().slice(0, 10)
    } catch {
        return ''
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SubmissionDetails({
    initialValues,
    onSave,
    onValidationError,
}: SubmissionDetailsProps) {
    const [inceptionDate, setInceptionDate] = useState(initialValues?.inceptionDate ?? '')
    const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate ?? '')
    const [renewalDate, setRenewalDate] = useState(initialValues?.renewalDate ?? '')
    const [contractType, setContractType] = useState(initialValues?.contractType ?? '')

    // Keep refs to latest values so the event handler always reads current state
    const valuesRef = useRef<SubmissionDetailsValues>({ inceptionDate, expiryDate, renewalDate, contractType })
    const onSaveRef = useRef(onSave)
    const onErrRef = useRef(onValidationError)

    useEffect(() => { valuesRef.current = { inceptionDate, expiryDate, renewalDate, contractType } }, [inceptionDate, expiryDate, renewalDate, contractType])
    useEffect(() => { onSaveRef.current = onSave }, [onSave])
    useEffect(() => { onErrRef.current = onValidationError }, [onValidationError])

    // Sync when initialValues prop changes (e.g. after a server reload)
    useEffect(() => {
        if (initialValues?.inceptionDate !== undefined) setInceptionDate(initialValues.inceptionDate)
        if (initialValues?.expiryDate !== undefined) setExpiryDate(initialValues.expiryDate)
        if (initialValues?.renewalDate !== undefined) setRenewalDate(initialValues.renewalDate)
        if (initialValues?.contractType !== undefined) setContractType(initialValues.contractType)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        initialValues?.inceptionDate,
        initialValues?.expiryDate,
        initialValues?.renewalDate,
        initialValues?.contractType,
    ])

    // R05 — submission:save DOM event listener
    useEffect(() => {
        function handler() {
            const vals = valuesRef.current
            if (!vals.inceptionDate) {
                onErrRef.current?.('Inception date is required.')
                return
            }
            if (!vals.expiryDate) {
                onErrRef.current?.('Expiry date is required.')
                return
            }
            onSaveRef.current(vals)
        }
        window.addEventListener('submission:save', handler)
        return () => window.removeEventListener('submission:save', handler)
    }, [])

    // R03 — Expiry auto-population
    function handleInceptionChange(value: string) {
        setInceptionDate(value)
        if (!expiryDate && value) setExpiryDate(plusOneYear(value))
        if (!renewalDate && value) setRenewalDate(plusOneYear(value))  // R04
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* R01 — Inception Date */}
            <div>
                <label htmlFor="sub-inception-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Inception Date
                </label>
                <input
                    id="sub-inception-date"
                    type="date"
                    value={inceptionDate}
                    onChange={(e) => handleInceptionChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>

            {/* R01 — Expiry Date */}
            <div>
                <label htmlFor="sub-expiry-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                </label>
                <input
                    id="sub-expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>

            {/* R01 — Renewal Date */}
            <div>
                <label htmlFor="sub-renewal-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Date
                </label>
                <input
                    id="sub-renewal-date"
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>

            {/* R01 — Contract Type */}
            <div>
                <label htmlFor="sub-contract-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type
                </label>
                <select
                    id="sub-contract-type"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    <option value="">— select —</option>
                    {CONTRACT_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
