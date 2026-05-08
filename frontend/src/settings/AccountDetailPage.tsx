/**
 * Account Detail page — view and edit a single user account.
 *
 * REQ-SETTINGS-USERS-F-009 through F-012
 * Requirements: settings/AccountAdministrationPage.requirements.md
 * Test file: settings/__tests__/AccountDetailPage.test.tsx
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import {
    getUserById,
    updateUser,
    type AdminUser,
} from './settings.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
    internal_admin: 'Internal Admin',
    client_admin:   'Company Admin',
    user:           'User',
}

const EDITABLE_ROLES = [
    { value: 'client_admin', label: 'Company Admin' },
    { value: 'user',         label: 'User' },
]

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------------------------------------------------------------------------
// Field row helper
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1 py-3 border-b border-gray-100 last:border-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
            <div className="text-sm text-gray-900">{children}</div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const session = getSession()
    const currentUserId = session?.user?.id ?? null

    const [user, setUser]       = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [error, setError]     = useState<string | null>(null)

    // Editable fields
    const [role, setRole]       = useState('')
    const [isActive, setIsActive] = useState(true)

    const userId = id ? parseInt(id, 10) : NaN
    const isOwn  = currentUserId === userId
    const isInternal = role === 'internal_admin'

    useEffect(() => {
        if (isNaN(userId)) {
            setError('Invalid user ID.')
            setLoading(false)
            return
        }
        getUserById(userId)
            .then(u => {
                setUser(u)
                setRole(u.role)
                setIsActive(u.isActive)
            })
            .catch((err: Error) => setError(err.message ?? 'Failed to load account.'))
            .finally(() => setLoading(false))
    }, [userId])

    async function handleSave() {
        if (!user) return
        setSaving(true)
        try {
            const updated = await updateUser(userId, { role, isActive })
            setUser(updated)
            setRole(updated.role)
            setIsActive(updated.isActive)
            addNotification('Account updated successfully.', 'success')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save account.'
            addNotification(msg, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center" aria-label="Loading account">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error || !user) {
        return (
            <div className="p-6">
                <div role="alert" className="text-red-600">{error ?? 'Account not found.'}</div>
            </div>
        )
    }

    const displayName = user.fullName ?? user.username
    const isDirty = role !== user.role || isActive !== user.isActive

    return (
        <div className="p-6 flex flex-col gap-6 max-w-2xl">
            {/* Back navigation */}
            <button
                onClick={() => navigate('/settings/account')}
                aria-label="Back to account administration"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 self-start"
            >
                <FiArrowLeft size={14} />
                Back to Account Administration
            </button>

            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">{displayName}</h1>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>

            {/* Account Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h2>
                <Field label="Full name">{displayName}</Field>
                <Field label="Username">{user.username}</Field>
                <Field label="Email">{user.email}</Field>
                <Field label="Organisation">{user.orgName ?? user.orgCode ?? '—'}</Field>
                <Field label="Member since">{formatDate(user.createdAt)}</Field>
                <Field label="Last login">{formatDate(user.lastLogin)}</Field>
            </div>

            {/* Access Control */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Access Control</h2>

                {isOwn && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
                        You cannot modify your own account.
                    </p>
                )}

                <div className="flex flex-col gap-4">
                    {/* Role */}
                    <div className="flex flex-col gap-1">
                        <label
                            htmlFor="account-role"
                            className="text-xs font-medium text-gray-600"
                        >
                            Role
                        </label>
                        {isInternal ? (
                            <div className="text-sm text-gray-700 px-2 py-1.5 border border-gray-200 rounded bg-gray-50">
                                {ROLE_LABELS.internal_admin}
                                <span className="text-xs text-gray-400 ml-2">(cannot be changed here)</span>
                            </div>
                        ) : (
                            <select
                                id="account-role"
                                value={role}
                                disabled={isOwn || saving}
                                aria-label="Role"
                                className={`text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                                    isOwn || saving ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onChange={e => setRole(e.target.value)}
                            >
                                {EDITABLE_ROLES.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Active status */}
                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="account-active"
                            className="text-xs font-medium text-gray-600"
                        >
                            Account active
                        </label>
                        <button
                            id="account-active"
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            aria-label={isActive ? 'Deactivate account' : 'Activate account'}
                            disabled={isOwn || saving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                isActive ? 'bg-green-500' : 'bg-gray-300'
                            } ${isOwn || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={() => { if (!isOwn && !saving) setIsActive(v => !v) }}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    isActive ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                            />
                        </button>
                        <span className="text-sm text-gray-700">{isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
            </div>

            {/* Save */}
            {!isOwn && !isInternal && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        aria-label="Save account changes"
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white transition-colors ${
                            saving || !isDirty
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        <FiSave size={14} />
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    {isDirty && (
                        <button
                            onClick={() => { setRole(user.role); setIsActive(user.isActive) }}
                            aria-label="Discard changes"
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Discard
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
