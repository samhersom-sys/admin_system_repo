/**
 * Account Administration page — manage user accounts, roles and active status.
 *
 * REQ-SETTINGS-USERS-F-001 through F-006
 * Requirements: settings/AccountAdministrationPage.requirements.md
 * Test file: settings/__tests__/AccountAdministrationPage.test.tsx
 */
import { useEffect, useState } from 'react'
import { FiShield, FiUser } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import Card from '@/shared/Card/Card'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import {
    getAdminUsers,
    updateUser,
    type AdminUser,
} from './settings.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
    { value: 'client_admin', label: 'Company Admin' },
    { value: 'user', label: 'User' },
]

const USER_COLUMNS: Column[] = [
    { key: 'name',      label: 'Name',         sortable: true, defaultWidth: 200 },
    { key: 'email',     label: 'Email',        sortable: true, defaultWidth: 230 },
    { key: 'orgCode',   label: 'Organisation', sortable: true, defaultWidth: 140 },
    { key: 'role',      label: 'Role',                         defaultWidth: 170 },
    { key: 'status',    label: 'Status',                       defaultWidth: 110 },
    { key: 'lastLogin', label: 'Last Login',   sortable: true, defaultWidth: 140 },
]

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

// ---------------------------------------------------------------------------
// Per-row optimistic state
// ---------------------------------------------------------------------------

interface RowState {
    role: string
    isActive: boolean
    updating: boolean
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountAdministrationPage() {
    const { addNotification } = useNotifications()
    const session = getSession()
    const currentUserId = session?.user?.id ?? null

    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [rowState, setRowState] = useState<Record<number, RowState>>({})
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    useEffect(() => {
        getAdminUsers()
            .then(data => {
                setUsers(data)
                const init: Record<number, RowState> = {}
                data.forEach(u => {
                    init[u.id] = { role: u.role, isActive: u.isActive, updating: false }
                })
                setRowState(init)
            })
            .catch((err: Error) => setError(err.message ?? 'Failed to load users.'))
            .finally(() => setLoading(false))
    }, [])

    async function handleRoleChange(userId: number, newRole: string) {
        const prevRole = rowState[userId]?.role
        setRowState(s => ({ ...s, [userId]: { ...s[userId], role: newRole, updating: true } }))
        try {
            await updateUser(userId, { role: newRole })
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update role.'
            addNotification(msg, 'error')
            setRowState(s => ({ ...s, [userId]: { ...s[userId], role: prevRole, updating: false } }))
            return
        }
        setRowState(s => ({ ...s, [userId]: { ...s[userId], updating: false } }))
    }

    async function handleToggleActive(userId: number) {
        const prevActive = rowState[userId]?.isActive
        const nextActive = !prevActive
        setRowState(s => ({ ...s, [userId]: { ...s[userId], isActive: nextActive, updating: true } }))
        try {
            await updateUser(userId, { isActive: nextActive })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update account status.'
            addNotification(msg, 'error')
            setRowState(s => ({ ...s, [userId]: { ...s[userId], isActive: prevActive, updating: false } }))
            return
        }
        setRowState(s => ({ ...s, [userId]: { ...s[userId], updating: false } }))
    }

    function sortUsers(list: AdminUser[]): AdminUser[] {
        return [...list].sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1
            let av = '', bv = ''
            if (sortConfig.key === 'name')      { av = a.fullName ?? a.username; bv = b.fullName ?? b.username }
            else if (sortConfig.key === 'email')     { av = a.email;         bv = b.email }
            else if (sortConfig.key === 'orgCode')   { av = a.orgCode ?? ''; bv = b.orgCode ?? '' }
            else if (sortConfig.key === 'lastLogin') { av = a.lastLogin ?? ''; bv = b.lastLogin ?? '' }
            return av < bv ? -dir : av > bv ? dir : 0
        })
    }

    function renderCell(key: string, row: unknown): React.ReactNode {
        const user = row as AdminUser
        const rs = rowState[user.id] ?? { role: user.role, isActive: user.isActive, updating: false }
        const isOwn = currentUserId === user.id
        const ownTitle = isOwn ? 'You cannot modify your own account.' : undefined

        switch (key) {
            case 'name':
                return <span className="font-medium text-gray-900">{user.fullName ?? user.username}</span>
            case 'email':
                return <span className="text-gray-600 text-sm">{user.email}</span>
            case 'orgCode':
                return <span className="text-gray-600 text-sm">{user.orgCode ?? '—'}</span>
            case 'role':
                return (
                    <select
                        value={rs.role}
                        disabled={isOwn || rs.updating}
                        title={ownTitle}
                        aria-label={`Role for ${user.fullName ?? user.username}`}
                        className={`text-sm rounded border border-gray-300 px-2 py-1 bg-white ${
                            isOwn || rs.updating
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer hover:border-gray-400'
                        }`}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                    >
                        {rs.role === 'internal_admin' && (
                            <option value="internal_admin" disabled>Internal Admin</option>
                        )}
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )
            case 'status':
                return (
                    <button
                        disabled={isOwn || rs.updating}
                        title={ownTitle}
                        aria-label={
                            rs.isActive
                                ? `Deactivate ${user.fullName ?? user.username}`
                                : `Activate ${user.fullName ?? user.username}`
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            rs.isActive
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        } ${isOwn || rs.updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => handleToggleActive(user.id)}
                    >
                        {rs.isActive ? 'Active' : 'Inactive'}
                    </button>
                )
            case 'lastLogin':
                return <span className="text-gray-500 text-sm">{formatDate(user.lastLogin)}</span>
            default:
                return null
        }
    }

    function handleRequestSort(key: string) {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }))
    }

    const internal = sortUsers(users.filter(u => u.role === 'internal_admin'))
    const company  = sortUsers(users.filter(u => u.role !== 'internal_admin'))

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center" aria-label="Loading users">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div role="alert" className="text-red-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Account Administration</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage user accounts, roles and access status across all organisations.
                </p>
            </div>

            {/* Internal Accounts */}
            <Card title="Internal Accounts">
                <div className="flex items-center gap-2 mb-4">
                    <FiShield className="text-purple-600" size={14} />
                    <span className="text-xs text-gray-500">
                        {internal.length} internal account{internal.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <ResizableGrid
                    storageKey="table-widths-account-admin-internal"
                    columns={USER_COLUMNS}
                    rows={internal}
                    sortConfig={sortConfig}
                    onRequestSort={handleRequestSort}
                    rowKey={(row) => (row as AdminUser).id}
                    renderCell={renderCell}
                    emptyMessage="No accounts."
                />
            </Card>

            {/* Company Accounts */}
            <Card title="Company Accounts">
                <div className="flex items-center gap-2 mb-4">
                    <FiUser className="text-blue-600" size={14} />
                    <span className="text-xs text-gray-500">
                        {company.length} company account{company.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <ResizableGrid
                    storageKey="table-widths-account-admin-company"
                    columns={USER_COLUMNS}
                    rows={company}
                    sortConfig={sortConfig}
                    onRequestSort={handleRequestSort}
                    rowKey={(row) => (row as AdminUser).id}
                    renderCell={renderCell}
                    emptyMessage="No accounts."
                />
            </Card>
        </div>
    )
}
