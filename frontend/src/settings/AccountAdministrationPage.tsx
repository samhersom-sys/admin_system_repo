/**
 * Account Administration page — manage user accounts, roles and active status.
 *
 * REQ-SETTINGS-USERS-F-001 through F-008
 * Requirements: settings/AccountAdministrationPage.requirements.md
 * Test file: settings/__tests__/AccountAdministrationPage.test.tsx
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { brandColors } from '@/shared/lib/design-tokens/brandColors'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import {
    getAdminUsers,
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

const USER_COLUMNS: Column[] = [
    { key: 'name',      label: 'Name',         sortable: true, defaultWidth: 200 },
    { key: 'email',     label: 'Email',        sortable: true, defaultWidth: 230 },
    { key: 'orgName',   label: 'Organisation', sortable: true, defaultWidth: 200 },
    { key: 'role',      label: 'Role',         sortable: true, defaultWidth: 150 },
    { key: 'status',    label: 'Status',       sortable: true, defaultWidth: 100 },
    { key: 'lastLogin', label: 'Last Login',   sortable: true, defaultWidth: 140 },
    { key: 'action',    label: '',                              defaultWidth: 60  },
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
// Role badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
    const label = ROLE_LABELS[role] ?? role
    const cls =
        role === 'internal_admin'
            ? 'bg-purple-100 text-purple-800 border-purple-200'
            : role === 'client_admin'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-gray-100 text-gray-700 border-gray-200'
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            {label}
        </span>
    )
}

// ---------------------------------------------------------------------------
// Search/filter state
// ---------------------------------------------------------------------------

interface Filters {
    name: string
    email: string
    org: string
    role: string
    status: string
}

const EMPTY_FILTERS: Filters = { name: '', email: '', org: '', role: '', status: '' }

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountAdministrationPage() {
    const navigate = useNavigate()

    const [users, setUsers]       = useState<AdminUser[]>([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState<string | null>(null)
    const [filters, setFilters]   = useState<Filters>(EMPTY_FILTERS)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    useEffect(() => {
        getAdminUsers()
            .then(data => setUsers(data))
            .catch((err: Error) => setError(err.message ?? 'Failed to load users.'))
            .finally(() => setLoading(false))
    }, [])

    function setFilter(field: keyof Filters) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setFilters(f => ({ ...f, [field]: e.target.value }))
    }

    function clearFilters() {
        setFilters(EMPTY_FILTERS)
    }

    const hasFilters = Object.values(filters).some(v => v !== '')

    // Apply filters then sort
    const filtered = useMemo(() => {
        let list = users
        const n = filters.name.toLowerCase()
        const em = filters.email.toLowerCase()
        const og = filters.org.toLowerCase()
        if (n)  list = list.filter(u => (u.fullName ?? u.username).toLowerCase().includes(n))
        if (em) list = list.filter(u => u.email.toLowerCase().includes(em))
        if (og) list = list.filter(u =>
            (u.orgName ?? u.orgCode ?? '').toLowerCase().includes(og) ||
            (u.orgCode ?? '').toLowerCase().includes(og)
        )
        if (filters.role)   list = list.filter(u => u.role === filters.role)
        if (filters.status) list = list.filter(u =>
            filters.status === 'active' ? u.isActive : !u.isActive
        )
        // Sort
        return [...list].sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1
            let av = '', bv = ''
            switch (sortConfig.key) {
                case 'name':      av = a.fullName ?? a.username; bv = b.fullName ?? b.username; break
                case 'email':     av = a.email;                  bv = b.email;                  break
                case 'orgName':   av = a.orgName ?? a.orgCode ?? ''; bv = b.orgName ?? b.orgCode ?? ''; break
                case 'role':      av = a.role;                   bv = b.role;                   break
                case 'status':    av = a.isActive ? '1' : '0';   bv = b.isActive ? '1' : '0';  break
                case 'lastLogin': av = a.lastLogin ?? '';         bv = b.lastLogin ?? '';        break
            }
            return av < bv ? -dir : av > bv ? dir : 0
        })
    }, [users, filters, sortConfig])

    function renderCell(key: string, row: unknown): React.ReactNode {
        const user = row as AdminUser
        switch (key) {
            case 'name':
                return <span className="font-medium text-gray-900">{user.fullName ?? user.username}</span>
            case 'email':
                return <span className="text-gray-600 text-sm">{user.email}</span>
            case 'orgName':
                return (
                    <span className="text-gray-600 text-sm">
                        {user.orgName ?? user.orgCode ?? '—'}
                    </span>
                )
            case 'role':
                return <RoleBadge role={user.role} />
            case 'status':
                return user.isActive
                    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Active</span>
                    : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Inactive</span>
            case 'lastLogin':
                return <span className="text-gray-500 text-sm">{formatDate(user.lastLogin)}</span>
            case 'action':
                return (
                    <button
                        aria-label={`View account ${user.fullName ?? user.username}`}
                        title="View account"
                        className="p-1.5 rounded hover:bg-green-50 transition-colors"
                        style={{ color: brandColors.success }}
                        onClick={() => navigate(`/settings/account/${user.id}`)}
                    >
                        <FiSearch size={16} />
                    </button>
                )
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
        <div className="p-6 flex flex-col gap-4">
            {/* Header */}
            <div>
                <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">Account Administration</p>
                <p className="text-sm text-gray-500 mt-1">
                    Manage user accounts, roles and access status across all organisations.
                </p>
            </div>

            {/* Search / filter bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-xs font-medium text-gray-600">Name</label>
                    <input
                        type="text"
                        value={filters.name}
                        onChange={setFilter('name')}
                        placeholder="Search name…"
                        aria-label="Filter by name"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
                <div className="flex flex-col gap-1 min-w-[180px]">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <input
                        type="text"
                        value={filters.email}
                        onChange={setFilter('email')}
                        placeholder="Search email…"
                        aria-label="Filter by email"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-xs font-medium text-gray-600">Organisation</label>
                    <input
                        type="text"
                        value={filters.org}
                        onChange={setFilter('org')}
                        placeholder="Search organisation…"
                        aria-label="Filter by organisation"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs font-medium text-gray-600">Role</label>
                    <select
                        value={filters.role}
                        onChange={setFilter('role')}
                        aria-label="Filter by role"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                        <option value="">All roles</option>
                        <option value="internal_admin">Internal Admin</option>
                        <option value="client_admin">Company Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <label className="text-xs font-medium text-gray-600">Status</label>
                    <select
                        value={filters.status}
                        onChange={setFilter('status')}
                        aria-label="Filter by status"
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        aria-label="Clear filters"
                        className="text-sm text-gray-500 hover:text-gray-700 underline self-end pb-1.5"
                    >
                        Clear
                    </button>
                )}
                <div className="self-end pb-1.5 ml-auto text-xs text-gray-400">
                    {filtered.length} of {users.length} accounts
                </div>
            </div>

            {/* Table */}
            <ResizableGrid
                storageKey="table-widths-account-admin"
                columns={USER_COLUMNS}
                rows={filtered}
                renderCell={renderCell}
                sortConfig={sortConfig}
                onRequestSort={handleRequestSort}
                rowKey={(row) => (row as AdminUser).id}
                emptyMessage="No accounts match your filters."
            />
        </div>
    )
}
