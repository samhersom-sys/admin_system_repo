/**
 * Account Create page — create a new user account.
 *
 * REQ-SETTINGS-USERS-C-C01 through C05
 * Requirements: settings/AccountCreatePage.requirements.md
 * Test file: settings/__tests__/AccountCreatePage.test.tsx
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import { createUser } from './settings.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
    { value: 'client_admin', label: 'Company Admin' },
    { value: 'user',         label: 'User' },
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountCreatePage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [saving, setSaving]       = useState(false)
    const [username, setUsername]   = useState('')
    const [email, setEmail]         = useState('')
    const [fullName, setFullName]   = useState('')
    const [role, setRole]           = useState('user')
    const [isActive, setIsActive]   = useState(true)
    const [orgCode, setOrgCode]     = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    // Sidebar section — REQ-SETTINGS-USERS-C-C01
    const sidebarSection = useMemo(() => ({
        title: 'Account Administration',
        items: [
            {
                label: 'Save',
                icon: FiSave,
                event: 'settings:account:save',
            },
        ],
    }), [])
    useSidebarSection(sidebarSection)

    // Listen for sidebar Save event — REQ-SETTINGS-USERS-C-C02
    useEffect(() => {
        function onSave() { handleSave() }
        window.addEventListener('settings:account:save', onSave)
        return () => window.removeEventListener('settings:account:save', onSave)
    }, [username, email, fullName, role, isActive, orgCode])

    async function handleSave() {
        setValidationError(null)

        // Validate — REQ-SETTINGS-USERS-C-C03
        if (!email.trim()) {
            setValidationError('Email is required.')
            return
        }
        if (!username.trim()) {
            setValidationError('Username is required.')
            return
        }
        if (!role) {
            setValidationError('Role is required.')
            return
        }

        setSaving(true)
        try {
            const newUser = await createUser({
                username: username.trim(),
                email: email.trim(),
                fullName: fullName.trim() || undefined,
                role,
                isActive,
                orgCode: orgCode.trim() || undefined,
            })

            // Show temp password in notification — REQ-SETTINGS-USERS-C-C04
            addNotification(
                `Account created. Temporary password: ${newUser.tempPassword}`,
                'success',
            )

            // Navigate to the new account detail page — REQ-SETTINGS-USERS-C-C04
            navigate(`/settings/account/${newUser.id}`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create account.'
            addNotification(msg, 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6 max-w-2xl">
            {/* Header — REQ-SETTINGS-USERS-C-C01 */}
            <div>
                <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">New Account</p>
                <p className="text-sm text-gray-500 mt-1">Create a new user account.</p>
            </div>

            {validationError && (
                <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                    {validationError}
                </div>
            )}

            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
                {/* ID — read-only placeholder */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</label>
                    <div className="text-sm text-gray-400 italic">(assigned on save)</div>
                </div>

                {/* Full Name */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="create-fullname" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                    <input
                        id="create-fullname"
                        aria-label="Full Name"
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                </div>

                {/* Email — required */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="create-email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                    <input
                        id="create-email"
                        aria-label="Email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                </div>

                {/* Username — required */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="create-username" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username <span className="text-red-500">*</span></label>
                    <input
                        id="create-username"
                        aria-label="Username"
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                </div>

                {/* Role — required */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="create-role" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role <span className="text-red-500">*</span></label>
                    <select
                        id="create-role"
                        aria-label="Role"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    >
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Is Active toggle */}
                <div className="flex items-center gap-3">
                    <label htmlFor="create-active" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account active</label>
                    <button
                        id="create-active"
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={isActive ? 'Deactivate account' : 'Activate account'}
                        disabled={saving}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            isActive ? 'bg-green-500' : 'bg-gray-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => { if (!saving) setIsActive(v => !v) }}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                isActive ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                    <span className="text-sm text-gray-700">{isActive ? 'Active' : 'Inactive'}</span>
                </div>

                {/* Organisation Code */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="create-orgcode" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organisation Code</label>
                    <input
                        id="create-orgcode"
                        aria-label="Organisation Code"
                        type="text"
                        value={orgCode}
                        onChange={e => setOrgCode(e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                </div>
            </div>
        </div>
    )
}
