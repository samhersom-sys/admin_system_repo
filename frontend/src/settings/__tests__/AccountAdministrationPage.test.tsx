/**
 * TESTS — Settings: Account Administration Page
 * Second artifact. Requirements: settings/AccountAdministrationPage.requirements.md
 * Test naming: T-SETTINGS-USERS-R{NN}
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountAdministrationPage from '../AccountAdministrationPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../settings.service', () => ({
    getAdminUsers: jest.fn(),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

// Render ResizableGrid as a plain table so interactive controls are accessible
jest.mock('@/shared/components/ResizableGrid/ResizableGrid', () => {
    const React = require('react')
    return {
        __esModule: true,
        default: ({ columns, rows, renderCell, rowKey, emptyMessage }: {
            columns: { key: string; label: React.ReactNode }[]
            rows: unknown[]
            renderCell: (key: string, row: unknown) => React.ReactNode
            rowKey?: (row: unknown, index: number) => string | number
            emptyMessage?: string
        }) => (
            <table>
                <thead>
                    <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr><td colSpan={columns.length}>{emptyMessage ?? 'No records found.'}</td></tr>
                    ) : rows.map((row, i) => (
                        <tr key={rowKey ? rowKey(row, i) : i}>
                            {columns.map((c) => <td key={c.key}>{renderCell(c.key, row)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        ),
    }
})

import * as settingsService from '../settings.service'

const MOCK_USERS = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@policyforge.com',
        fullName: 'Policy Forge Admin',
        orgCode: 'PF',
        orgName: 'Policy Forge',
        role: 'internal_admin',
        isActive: true,
        lastLogin: '2026-05-01T10:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
    },
    {
        id: 2,
        username: 'company_admin',
        email: 'admin@company.com',
        fullName: 'Company Admin',
        orgCode: 'DEMO',
        orgName: 'Demo Corp',
        role: 'client_admin',
        isActive: true,
        lastLogin: '2026-04-15T09:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
    },
    {
        id: 3,
        username: 'testauth',
        email: 'testauth@example.com',
        fullName: null,
        orgCode: 'TESTORG',
        orgName: 'Test Organisation',
        role: 'user',
        isActive: false,
        lastLogin: null,
        createdAt: '2026-01-01T00:00:00Z',
    },
]

function renderPage() {
    return render(
        <MemoryRouter>
            <AccountAdministrationPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.getAdminUsers as jest.Mock).mockResolvedValue(MOCK_USERS)
})

// ---------------------------------------------------------------------------
// R01 — Load user list
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R01: loads users from API', () => {
    it('shows loading spinner initially', async () => {
        (settingsService.getAdminUsers as jest.Mock).mockImplementation(
            () => new Promise(() => { /* never resolves */ })
        )
        renderPage()
        expect(screen.getByLabelText('Loading users')).toBeInTheDocument()
    })

    it('calls getAdminUsers on mount', async () => {
        renderPage()
        await waitFor(() => {
            expect(settingsService.getAdminUsers).toHaveBeenCalledTimes(1)
        })
    })

    it('shows error message when API fails', async () => {
        (settingsService.getAdminUsers as jest.Mock).mockRejectedValue(new Error('Server error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Server error')
        })
    })
})

// ---------------------------------------------------------------------------
// R02 — Single unified table with all users
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R02: unified table shows all accounts', () => {
    it('renders all users in a single table', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Policy Forge Admin')).toBeInTheDocument()
            expect(screen.getByText('admin@company.com')).toBeInTheDocument()
            expect(screen.getByText('testauth@example.com')).toBeInTheDocument()
        })
    })

    it('does not render separate Internal/Company section headings', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.queryByText('Internal Accounts')).not.toBeInTheDocument()
            expect(screen.queryByText('Company Accounts')).not.toBeInTheDocument()
        })
    })

    it('shows username as fallback when fullName is null', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('testauth')).toBeInTheDocument()
        })
    })

    it('shows organisation name from orgName field', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Demo Corp')).toBeInTheDocument()
            expect(screen.getByText('Policy Forge')).toBeInTheDocument()
        })
    })

    it('shows role badges (not dropdowns)', async () => {
        renderPage()
        await waitFor(() => {
            // Role badges appear as non-interactive spans — check at least one per role
            const internalItems = screen.queryAllByText('Internal Admin')
            const companyItems  = screen.queryAllByText('Company Admin')
            expect(internalItems.length).toBeGreaterThanOrEqual(1)
            expect(companyItems.length).toBeGreaterThanOrEqual(1)
        })
        // Filter selects are the only comboboxes — no per-row dropdowns
        const combos = screen.queryAllByRole('combobox')
        // All comboboxes should be filter controls (role + status = 2), not per-row editors
        expect(combos.every(el => {
            const label = el.getAttribute('aria-label') ?? ''
            return label.startsWith('Filter by')
        })).toBe(true)
    })

    it('shows status badges (not toggle buttons)', async () => {
        renderPage()
        await waitFor(() => {
            // At least one Inactive badge from the inactive user row
            const inactiveItems = screen.queryAllByText('Inactive')
            expect(inactiveItems.length).toBeGreaterThanOrEqual(1)
        })
        // Status is read-only badges — no toggle buttons
        expect(screen.queryAllByRole('button', { name: /deactivate/i })).toHaveLength(0)
        expect(screen.queryAllByRole('button', { name: /^activate/i })).toHaveLength(0)
    })

    it('shows view action button for each row', async () => {
        renderPage()
        await waitFor(() => {
            const viewBtns = screen.getAllByRole('button', { name: /view account/i })
            expect(viewBtns).toHaveLength(3)
        })
    })

    it('navigates to account detail page when view button clicked', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getAllByRole('button', { name: /view account/i })).toHaveLength(3)
        })
        const viewBtn = screen.getByRole('button', { name: /view account company admin/i })
        await userEvent.click(viewBtn)
        expect(mockNavigate).toHaveBeenCalledWith('/settings/account/2')
    })
})

// ---------------------------------------------------------------------------
// R03 — Search and filter
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R03: search filters reduce displayed rows', () => {
    it('renders name filter input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
        })
    })

    it('renders email filter input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by email')).toBeInTheDocument()
        })
    })

    it('renders organisation filter input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by organisation')).toBeInTheDocument()
        })
    })

    it('renders role filter select', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by role')).toBeInTheDocument()
        })
    })

    it('renders status filter select', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
        })
    })

    it('filters table by name input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
        })
        const nameInput = screen.getByLabelText('Filter by name')
        await userEvent.type(nameInput, 'Company Admin')
        await waitFor(() => {
            // Policy Forge Admin row should be gone (checked via unique email)
            expect(screen.queryByText('admin@policyforge.com')).not.toBeInTheDocument()
            // Company Admin row should still be visible
            expect(screen.getByText('admin@company.com')).toBeInTheDocument()
        })
    })

    it('filters table by role dropdown', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by role')).toBeInTheDocument()
        })
        const roleSelect = screen.getByLabelText('Filter by role')
        await userEvent.selectOptions(roleSelect, 'internal_admin')
        await waitFor(() => {
            expect(screen.getByText('Policy Forge Admin')).toBeInTheDocument()
            expect(screen.queryByText('admin@company.com')).not.toBeInTheDocument()
        })
    })

    it('filters table by status dropdown', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
        })
        const statusSelect = screen.getByLabelText('Filter by status')
        await userEvent.selectOptions(statusSelect, 'inactive')
        await waitFor(() => {
            expect(screen.getByText('testauth')).toBeInTheDocument()
            expect(screen.queryByText('Policy Forge Admin')).not.toBeInTheDocument()
        })
    })

    it('shows empty message when no users match filters', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
        })
        const nameInput = screen.getByLabelText('Filter by name')
        await userEvent.type(nameInput, 'zzznomatch')
        await waitFor(() => {
            expect(screen.getByText('No accounts match your filters.')).toBeInTheDocument()
        })
    })

    it('shows Clear button when a filter is active and clears on click', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
        })
        const nameInput = screen.getByLabelText('Filter by name')
        await userEvent.type(nameInput, 'Admin')
        await waitFor(() => {
            expect(screen.getByLabelText('Clear filters')).toBeInTheDocument()
        })
        await userEvent.click(screen.getByLabelText('Clear filters'))
        await waitFor(() => {
            expect(screen.queryByLabelText('Clear filters')).not.toBeInTheDocument()
            expect(nameInput).toHaveValue('')
        })
    })
})
