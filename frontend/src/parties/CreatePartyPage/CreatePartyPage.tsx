/**
 * CreatePartyPage — /parties/new
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 *
 * Features:
 *  - Full-page form for creating a new party (R01–R06)
 *  - Sidebar contextual section: Back (navigate) + Save (event) per RULE 9 (R00)
 *  - Validates Name (R04a) and Type (R04b) before submit
 *  - Calls createParty() and navigates to /parties on success (R05)
 *  - Back navigation handled by sidebar Back item (R06)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { createParty } from '@/parties/parties.service'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import Card from '@/shared/Card/Card'

const PARTY_ROLES = ['Insured', 'Broker', 'Insurer', 'Coverholder']

// Module-level constant — required by RULE 9 (must not be inside component)
// Back navigation handled by the global sidebar Back button (§14 — no duplicate Back)
const SIDEBAR_SECTION: SidebarSection = {
    title: 'Party',
    items: [
        { label: 'Save', icon: FiSave, event: 'party:save' },
    ],
}

export default function CreatePartyPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const returnTo = searchParams.get('returnTo')
    const presetType = searchParams.get('type') ?? ''

    const [name, setName] = useState('')
    const [type, setType] = useState(presetType)
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [addressLine1, setAddressLine1] = useState('')
    const [city, setCity] = useState('')
    const [postcode, setPostcode] = useState('')
    const [country, setCountry] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useSidebarSection(SIDEBAR_SECTION)

    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            setValidationError('Name is required.')
            return
        }
        if (!type) {
            setValidationError('Type is required.')
            return
        }

        const session = getSession()
        setSaving(true)
        setValidationError(null)
        try {
            await createParty({
                name: name.trim(),
                type,
                orgCode: session?.user?.orgCode ?? '',
                createdBy: session?.user?.name ?? '',
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                addressLine1: addressLine1.trim() || undefined,
                city: city.trim() || undefined,
                postcode: postcode.trim() || undefined,
                country: country.trim() || undefined,
            })
            navigate(returnTo || '/parties')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create party.'
            setValidationError(msg)
        } finally {
            setSaving(false)
        }
    }, [name, type, email, phone, addressLine1, city, postcode, country, navigate])

    // Listen for Save event dispatched by sidebar (RULE 9 / R00)
    useEffect(() => {
        window.addEventListener('party:save', handleSave)
        return () => window.removeEventListener('party:save', handleSave)
    }, [handleSave])

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header (R01) */}
            <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">Create Party</p>

            {/* Validation / API error (R04, R05c) */}
            {validationError && (
                <p className="text-sm text-red-600" role="alert">{validationError}</p>
            )}
            {saving && (
                <p className="text-sm text-gray-500">Saving…</p>
            )}

            {/* Two-column layout on lg+ (RULE 10) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left column — required fields */}
                <Card title="Required Details">
                    <div className="flex flex-col gap-4">

                        {/* Name (R02a) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                aria-label="Party name"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Type (R02b) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                aria-label="Party type"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="">Select type…</option>
                                {PARTY_ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="Email"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                aria-label="Phone"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                </Card>

                {/* Right column — optional address fields */}
                <Card title="Address">
                    <div className="flex flex-col gap-4">

                        {/* Address Line 1 (R03a) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                            <input
                                type="text"
                                value={addressLine1}
                                onChange={(e) => setAddressLine1(e.target.value)}
                                aria-label="Address line 1"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* City / Postcode (R03b, R03c) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    aria-label="City"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                                <input
                                    type="text"
                                    value={postcode}
                                    onChange={(e) => setPostcode(e.target.value)}
                                    aria-label="Postcode"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Country (R03d) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                aria-label="Country"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
