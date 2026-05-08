/**
 * TESTS — Settings: Account Administration Page
 * Second artifact. Requirements: settings/AccountAdministrationPage.requirements.md
 * Test naming: T-SETTINGS-USERS-R{NN}
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountAdministrationPage from '../AccountAdministrationPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../settings.service', () => ({
    getAdminUsers: jest.fn(),
    updateUser: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(() => ({
        token: 'tok',
        user: { id: 1, email: 'admin@policyforge.com', orgCode: 'DEMO', role: 'internal_admin' },
    })),
}))

jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
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

const mockAddNotification = jest.fn()

import * as settingsService from '../settings.service'

const MOCK_USERS = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@policyforge.com',
        fullName: 'Policy Forge Admin',
        orgCode: 'DEMO',
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
    (settingsService.getAdminUsers as jest.Mock).mockResolvedValue(MOCK_USERS);
    (settingsService.updateUser as jest.Mock).mockResolvedValue(MOCK_USERS[1])
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
// R02 — Two user groups
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R02: users split into correct sections', () => {
    it('renders an Internal Accounts card', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Internal Accounts')).toBeInTheDocument()
        })
    })

    it('renders a Company Accounts card', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Company Accounts')).toBeInTheDocument()
        })
    })

    it('places internal_admin user in Internal Accounts section', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Internal Accounts')).toBeInTheDocument()
        })
        const internalCard = screen.getByText('Internal Accounts').closest('[class*="rounded-lg"]') as HTMLElement
        expect(within(internalCard).getByText('Policy Forge Admin')).toBeInTheDocument()
    })

    it('places client_admin and user in Company Accounts section', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Company Accounts')).toBeInTheDocument()
        })
        const companyCard = screen.getByText('Company Accounts').closest('[class*="rounded-lg"]') as HTMLElement
        // Check by email to avoid matching <option> elements with the same text
        expect(within(companyCard).getByText('admin@company.com')).toBeInTheDocument()
        expect(within(companyCard).getByText('testauth@example.com')).toBeInTheDocument()
    })

    it('shows username as fallback when fullName is null', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('testauth')).toBeInTheDocument()
        })
    })

    it('shows "No accounts." placeholder in empty section when no internal users', async () => {
        (settingsService.getAdminUsers as jest.Mock).mockResolvedValue([MOCK_USERS[1]])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('No accounts.')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// R04 — Change role
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R04: role change calls updateUser', () => {
    it('calls updateUser with new role when dropdown changes', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USERS[1], role: 'user' })
        renderPage()
        await waitFor(() => {
            expect(screen.getAllByRole('combobox')).not.toHaveLength(0)
        })

        // Find the role dropdown for Company Admin (id: 2)
        const roleSelect = screen.getByRole('combobox', { name: /role for company admin/i })
        await userEvent.selectOptions(roleSelect, 'user')

        await waitFor(() => {
            expect(settingsService.updateUser).toHaveBeenCalledWith(2, { role: 'user' })
        })
    })

    it('shows error notification and reverts role on API failure', async () => {
        (settingsService.updateUser as jest.Mock).mockRejectedValue(new Error('Update failed'))
        renderPage()
        await waitFor(() => {
            expect(screen.getAllByRole('combobox')).not.toHaveLength(0)
        })

        const roleSelect = screen.getByRole('combobox', { name: /role for company admin/i })
        await userEvent.selectOptions(roleSelect, 'user')

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Update failed', 'error')
        })
        // Role should revert to client_admin
        expect(roleSelect).toHaveValue('client_admin')
    })

    it('does not offer internal_admin as a selectable option', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getAllByRole('combobox')).not.toHaveLength(0)
        })
        const selects = screen.getAllByRole('combobox')
        selects.forEach(sel => {
            const internalOption = Array.from(sel.querySelectorAll('option'))
                .find(o => o.value === 'internal_admin' && !(o as HTMLOptionElement).disabled)
            expect(internalOption).toBeUndefined()
        })
    })
})

// ---------------------------------------------------------------------------
// R05 — Toggle active status
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R05: active toggle calls updateUser', () => {
    it('calls updateUser with isActive: false when Active button clicked', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USERS[1], isActive: false })
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /deactivate company admin/i })).toBeInTheDocument()
        })

        const btn = screen.getByRole('button', { name: /deactivate company admin/i })
        await userEvent.click(btn)

        await waitFor(() => {
            expect(settingsService.updateUser).toHaveBeenCalledWith(2, { isActive: false })
        })
    })

    it('calls updateUser with isActive: true when Inactive button clicked', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USERS[2], isActive: true })
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /activate testauth/i })).toBeInTheDocument()
        })

        const btn = screen.getByRole('button', { name: /activate testauth/i })
        await userEvent.click(btn)

        await waitFor(() => {
            expect(settingsService.updateUser).toHaveBeenCalledWith(3, { isActive: true })
        })
    })

    it('shows error notification and reverts state on API failure', async () => {
        (settingsService.updateUser as jest.Mock).mockRejectedValue(new Error('Toggle failed'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /deactivate company admin/i })).toBeInTheDocument()
        })

        const btn = screen.getByRole('button', { name: /deactivate company admin/i })
        await userEvent.click(btn)

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Toggle failed', 'error')
        })
        // State should revert — button should be Active again
        expect(screen.getByRole('button', { name: /deactivate company admin/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R06 — Own account locked
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-R06: own account controls are disabled', () => {
    it('disables the role dropdown for the current user\'s row', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('combobox', { name: /role for policy forge admin/i })).toBeInTheDocument()
        })
        const ownSelect = screen.getByRole('combobox', { name: /role for policy forge admin/i })
        expect(ownSelect).toBeDisabled()
    })

    it('disables the status button for the current user\'s row', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /deactivate policy forge admin/i })).toBeInTheDocument()
        })
        const ownBtn = screen.getByRole('button', { name: /deactivate policy forge admin/i })
        expect(ownBtn).toBeDisabled()
    })

    it('does not disable role dropdown for other users', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('combobox', { name: /role for company admin/i })).toBeInTheDocument()
        })
        const otherSelect = screen.getByRole('combobox', { name: /role for company admin/i })
        expect(otherSelect).not.toBeDisabled()
    })
})
