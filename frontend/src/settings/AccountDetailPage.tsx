/**
 * Account Detail page — view and edit a single user account.
 *
 * REQ-SETTINGS-USERS-F-009 through F-012
 * REQ-SETTINGS-USERS-D-D01 through D05
 * Requirements: settings/AccountDetailPage.requirements.md
 * Test file: settings/__tests__/AccountDetailPage.test.tsx
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import type { AuditEvent } from '@/shared/lib/hooks/useAudit'
import { useSidebarSection } from '@/shell/SidebarContext'
import {
    getUserById,
    updateUser,
    getUserAudit,
    postUserAudit,
    type AdminUser,
} from './settings.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
    { key: 'details', label: 'Details' },
    { key: 'audit', label: 'Audit' },
]

const ROLE_LABELS: Record<string, string> = {
    internal_admin: 'Internal Admin',
    client_admin: 'Company Admin',
    user: 'User',
}

const EDITABLE_ROLES = [
    { value: 'client_admin', label: 'Company Admin' },
    { value: 'user', label: 'User' },
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

    const [user, setUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Tab state
    const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details')

    // Audit state
    const [audit, setAudit] = useState<AuditEvent[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditError, setAuditError] = useState<string | null>(null)
    const auditLoadedRef = useRef(false)

    // Editable fields
    const [role, setRole] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')

    // Keep snapshots for audit change tracking
    const savedRoleRef = useRef('')
    const savedIsActiveRef = useRef(true)
    const savedFullNameRef = useRef('')
    const savedEmailRef = useRef('')

    const userId = id ? parseInt(id, 10) : NaN
    const isOwn = currentUserId === userId
    const isInternal = role === 'internal_admin'
    const isDirty = role !== savedRoleRef.current || isActive !== savedIsActiveRef.current ||
        fullName !== savedFullNameRef.current || email !== savedEmailRef.current

    // Sidebar section — REQ-SETTINGS-USERS-D-D06/D07 (must be before early returns)
    const sidebarSection = useMemo(() => ({
        title: 'Account Administration',
        items: [
            {
                label: 'Save',
                icon: FiSave,
                event: 'settings:account:save',
                disabled: !isDirty || isOwn || isInternal,
            },
        ],
    }), [isDirty, isOwn, isInternal])
    useSidebarSection(sidebarSection)

    // Load user on mount
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
                setFullName(u.fullName ?? '')
                setEmail(u.email ?? '')
                savedRoleRef.current = u.role
                savedIsActiveRef.current = u.isActive
                savedFullNameRef.current = u.fullName ?? ''
                savedEmailRef.current = u.email ?? ''
            })
            .catch((err: Error) => setError(err.message ?? 'Failed to load account.'))
            .finally(() => setLoading(false))
    }, [userId])

    // Lifecycle audit events — "Account Opened" on mount, "Account Closed" on unmount
    // REQ-SETTINGS-USERS-D-D03
    useEffect(() => {
        if (isNaN(userId)) return
        const s = getSession()
        const userName = s?.user?.name ?? s?.user?.email ?? 'Unknown'
        const userIdVal = s?.user?.id ?? null
        postUserAudit(userId, { action: 'Account Opened', user: userName, userId: userIdVal }).catch(() => { })
        return () => {
            postUserAudit(userId, { action: 'Account Closed', user: userName, userId: userIdVal }).catch(() => { })
        }
    }, [userId])

    // Listen for sidebar Save event (must be before early returns)
    useEffect(() => {
        function onSave() { handleSave() }
        window.addEventListener('settings:account:save', onSave)
        return () => window.removeEventListener('settings:account:save', onSave)
    }, [role, isActive, fullName, email, user])

    function handleTabChange(key: string) {
        setActiveTab(key as 'details' | 'audit')
        if (key === 'audit' && !auditLoadedRef.current) {
            auditLoadedRef.current = true
            setAuditLoading(true)
            setAuditError(null)
            getUserAudit(userId)
                .then(setAudit)
                .catch((err: Error) => setAuditError(err.message ?? 'Failed to load audit history.'))
                .finally(() => setAuditLoading(false))
        }
    }

    async function handleSave() {
        if (!user) return
        setSaving(true)
        try {
            const updated = await updateUser(userId, { role, isActive, fullName, email })

            // Build change record — REQ-SETTINGS-USERS-D-D04
            const changes: Record<string, { old: string; new: string }> = {}
            if (role !== savedRoleRef.current) {
                changes['Role'] = { old: savedRoleRef.current, new: role }
            }
            if (isActive !== savedIsActiveRef.current) {
                changes['Active Status'] = {
                    old: savedIsActiveRef.current ? 'Active' : 'Inactive',
                    new: isActive ? 'Active' : 'Inactive',
                }
            }
            if (fullName !== savedFullNameRef.current) {
                changes['Full Name'] = { old: savedFullNameRef.current, new: fullName }
            }
            if (email !== savedEmailRef.current) {
                changes['Email'] = { old: savedEmailRef.current, new: email }
            }
            if (Object.keys(changes).length > 0) {
                postUserAudit(userId, { action: 'Account Updated', changes }).catch(() => { })
            }

            setUser(updated)
            setRole(updated.role)
            setIsActive(updated.isActive)
            setFullName(updated.fullName ?? '')
            setEmail(updated.email ?? '')
            savedRoleRef.current = updated.role
            savedIsActiveRef.current = updated.isActive
            savedFullNameRef.current = updated.fullName ?? ''
            savedEmailRef.current = updated.email ?? ''
            addNotification('Account updated successfully.', 'success')

            // Refresh audit if it's been loaded
            if (auditLoadedRef.current) {
                getUserAudit(userId).then(setAudit).catch(() => { })
            }
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

    return (
        <div className="p-6 flex flex-col gap-6 max-w-2xl">
            {/* Header — no back button (REQ-SETTINGS-USERS-D-D08) */}
            <div>
                <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">{displayName}</p>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>

            {/* Tab navigation — REQ-SETTINGS-USERS-D-D01 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

            {/* Details tab */}
            {activeTab === 'details' && (
                <>
                    {/* Account Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h2>

                        {/* ID — read-only (REQ-SETTINGS-USERS-D-D09) */}
                        <Field label="ID"><span>{user.id}</span></Field>

                        {/* Editable: Full Name (REQ-SETTINGS-USERS-D-D09) */}
                        <div className="flex flex-col gap-1 py-3 border-b border-gray-100">
                            <label htmlFor="account-fullname" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                            <input
                                id="account-fullname"
                                aria-label="Full Name"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                disabled={isOwn || saving}
                                className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                            />
                        </div>

                        {/* Editable: Email (REQ-SETTINGS-USERS-D-D09) */}
                        <div className="flex flex-col gap-1 py-3 border-b border-gray-100">
                            <label htmlFor="account-email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                            <input
                                id="account-email"
                                aria-label="Email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={isOwn || saving}
                                className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                            />
                        </div>

                        <Field label="Username">{user.username}</Field>
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
                                    <div className="text-sm text-gray-700 px-2 py-1.5 border border-gray-200 rounded">
                                        {ROLE_LABELS.internal_admin}
                                        <span className="text-xs text-gray-400 ml-2">(cannot be changed here)</span>
                                    </div>
                                ) : (
                                    <select
                                        id="account-role"
                                        value={role}
                                        disabled={isOwn || saving}
                                        aria-label="Role"
                                        className={`text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${isOwn || saving ? 'opacity-50 cursor-not-allowed' : ''
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
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-green-500' : 'bg-gray-300'
                                        } ${isOwn || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    onClick={() => { if (!isOwn && !saving) setIsActive(v => !v) }}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                                <span className="text-sm text-gray-700">{isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Discard button — visible when dirty (Save is in sidebar) */}
                    {isDirty && !isOwn && !isInternal && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setRole(savedRoleRef.current)
                                    setIsActive(savedIsActiveRef.current)
                                    setFullName(savedFullNameRef.current)
                                    setEmail(savedEmailRef.current)
                                }}
                                aria-label="Discard changes"
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Discard
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Audit tab — REQ-SETTINGS-USERS-D-D02 */}
            {activeTab === 'audit' && (
                <AuditTable
                    audit={audit}
                    loading={auditLoading}
                    error={auditError}
                    entityType="Account"
                    emptyMessage="No audit history for this account."
                />
            )}
        </div>
    )
}
