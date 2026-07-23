/**
 * Account Administration page — manage user accounts, roles and active status.
 *
 * REQ-SETTINGS-USERS-F-001 through F-008, R10-R12
 * Requirements: settings/AccountAdministrationPage.requirements.md
 * Test file: settings/__tests__/AccountAdministrationPage.test.tsx
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiPlus } from 'react-icons/fi'
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
    client_admin: 'Company Admin',
    user: 'User',
}



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

const PAGE_SIZE_OPTIONS = [25, 50, 100]

// ---------------------------------------------------------------------------
// Pagination helper (same algorithm as SearchResults)
// ---------------------------------------------------------------------------
function buildPageRange(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AccountAdministrationPage() {
    const navigate = useNavigate()

    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    // Pagination state — REQ-SETTINGS-USERS-F-R10
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)

    // Column definitions — addAction (+ in header) is first; viewAction (FiSearch) is last (REQ-SETTINGS-USERS-F-R11)
    const userColumns: Column[] = useMemo(() => [
        {
            key: 'addAction',
            label: (
                <button
                    type="button"
                    title="New Account"
                    aria-label="New Account"
                    className="text-brand-600 hover:text-brand-800"
                    onClick={() => navigate('/settings/account/new')}
                >
                    <FiPlus size={14} />
                </button>
            ),
            defaultWidth: 60,
        },
        { key: 'name', label: 'Name', sortable: true, defaultWidth: 200 },
        { key: 'email', label: 'Email', sortable: true, defaultWidth: 230 },
        { key: 'orgName', label: 'Organisation', sortable: true, defaultWidth: 200 },
        { key: 'role', label: 'Role', sortable: true, defaultWidth: 150 },
        { key: 'status', label: 'Status', sortable: true, defaultWidth: 100 },
        { key: 'lastLogin', label: 'Last Login', sortable: true, defaultWidth: 140 },
        { key: 'viewAction', label: '', defaultWidth: 60 },
    ], [navigate])

    useEffect(() => {
        getAdminUsers()
            .then(data => setUsers(data))
            .catch((err: Error) => setError(err.message ?? 'Failed to load users.'))
            .finally(() => setLoading(false))
    }, [])

    function setFilter(field: keyof Filters) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setFilters(f => ({ ...f, [field]: e.target.value }))
            setPage(1)
        }
    }

    function clearFilters() {
        setFilters(EMPTY_FILTERS)
        setPage(1)
    }

    const hasFilters = Object.values(filters).some(v => v !== '')

    // Apply filters then sort
    const filtered = useMemo(() => {
        let list = users
        const n = filters.name.toLowerCase()
        const em = filters.email.toLowerCase()
        const og = filters.org.toLowerCase()
        if (n) list = list.filter(u => (u.fullName ?? u.username).toLowerCase().includes(n))
        if (em) list = list.filter(u => u.email.toLowerCase().includes(em))
        if (og) list = list.filter(u =>
            (u.orgName ?? u.orgCode ?? '').toLowerCase().includes(og) ||
            (u.orgCode ?? '').toLowerCase().includes(og)
        )
        if (filters.role) list = list.filter(u => u.role === filters.role)
        if (filters.status) list = list.filter(u =>
            filters.status === 'active' ? u.isActive : !u.isActive
        )
        // Sort
        return [...list].sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1
            let av = '', bv = ''
            switch (sortConfig.key) {
                case 'name': av = a.fullName ?? a.username; bv = b.fullName ?? b.username; break
                case 'email': av = a.email; bv = b.email; break
                case 'orgName': av = a.orgName ?? a.orgCode ?? ''; bv = b.orgName ?? b.orgCode ?? ''; break
                case 'role': av = a.role; bv = b.role; break
                case 'status': av = a.isActive ? '1' : '0'; bv = b.isActive ? '1' : '0'; break
                case 'lastLogin': av = a.lastLogin ?? ''; bv = b.lastLogin ?? ''; break
            }
            return av < bv ? -dir : av > bv ? dir : 0
        })
    }, [users, filters, sortConfig])

    // Pagination — REQ-SETTINGS-USERS-F-R10
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const pageStart = (page - 1) * pageSize
    const pageEnd = Math.min(pageStart + pageSize, filtered.length)
    const visible = filtered.slice(pageStart, pageEnd)

    const btnBase = 'px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
    const btnActive = 'px-2 py-1 text-xs border border-gray-300 rounded bg-[var(--color-primary)] text-white font-semibold'

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
            case 'addAction':
                return null
            case 'viewAction':
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
        setPage(1)
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
            {/* Header — REQ-SETTINGS-USERS-F-R11 */}
            <div>
                <p role="heading" aria-level={1} className="text-xl font-semibold text-gray-900">Account Administration</p>
                <p className="text-sm text-gray-500 mt-1">
                    Manage user accounts, roles and access status across all organisations.
                </p>
            </div>

            {/* Search / filter bar — styled to match SearchForm (REQ-SETTINGS-USERS-F-R09) */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-4 mb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={filters.name}
                            onChange={setFilter('name')}
                            placeholder="Search name…"
                            aria-label="Filter by name"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="text"
                            value={filters.email}
                            onChange={setFilter('email')}
                            placeholder="Search email…"
                            aria-label="Filter by email"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                        <input
                            type="text"
                            value={filters.org}
                            onChange={setFilter('org')}
                            placeholder="Search organisation…"
                            aria-label="Filter by organisation"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={filters.role}
                            onChange={setFilter('role')}
                            aria-label="Filter by role"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All roles</option>
                            <option value="internal_admin">Internal Admin</option>
                            <option value="client_admin">Company Admin</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={setFilter('status')}
                            aria-label="Filter by status"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            aria-label="Clear filters"
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear
                        </button>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                        {filtered.length} of {users.length} accounts
                    </span>
                </div>
            </div>

            {/* Pagination summary — REQ-SETTINGS-USERS-F-R10 */}
            <p className="text-sm text-gray-500 -mb-2" aria-live="polite">
                {filtered.length === 0
                    ? '0 accounts'
                    : `${pageStart + 1}–${pageEnd} of ${filtered.length} accounts`}
            </p>

            {/* Table */}
            <ResizableGrid
                storageKey="table-widths-account-admin"
                columns={userColumns}
                rows={visible}
                renderCell={renderCell}
                sortConfig={sortConfig}
                onRequestSort={handleRequestSort}
                rowKey={(row) => (row as AdminUser).id}
                emptyMessage="No accounts match your filters."
            />

            {/* Pagination controls — REQ-SETTINGS-USERS-F-R10 */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 mr-2">
                    Rows per page
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                        aria-label="Rows per page"
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                        {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>

                <div className="flex items-center gap-1 flex-wrap">
                    <button type="button" className={btnBase} disabled={page <= 1} onClick={() => setPage(1)} title="First page">«&nbsp;First</button>
                    <button type="button" className={btnBase} disabled={page <= 1} onClick={() => setPage(p => p - 1)} title="Previous page">‹&nbsp;Back</button>
                    {buildPageRange(page, totalPages).map((p, i) =>
                        p === '...'
                            ? <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
                            : <button key={p} type="button" className={p === page ? btnActive : btnBase} onClick={() => setPage(p)}>{p}</button>
                    )}
                    <button type="button" className={btnBase} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} title="Next page">Next&nbsp;›</button>
                    <button type="button" className={btnBase} disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">Last&nbsp;»</button>
                </div>

                <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">
                    {filtered.length === 0 ? '0 accounts' : `${pageStart + 1}–${pageEnd} of ${filtered.length}`}
                </span>
            </div>
        </div>
    )
}
