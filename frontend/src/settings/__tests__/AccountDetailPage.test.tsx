/**
 * TESTS — Settings: Account Detail Page
 * Second artifact. Requirements: settings/AccountAdministrationPage.requirements.md
 * Test naming: T-SETTINGS-USERS-D{NN}
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AccountDetailPage from '../AccountDetailPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../settings.service', () => ({
    getUserById: jest.fn(),
    updateUser: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(() => ({
        token: 'tok',
        user: { id: 99, email: 'admin@policyforge.com', orgCode: 'PF', role: 'internal_admin' },
    })),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

import * as settingsService from '../settings.service'

const MOCK_USER = {
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
}

function renderPage(userId = '2') {
    return render(
        <MemoryRouter initialEntries={[`/settings/account/${userId}`]}>
            <Routes>
                <Route path="/settings/account/:id" element={<AccountDetailPage />} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.getUserById as jest.Mock).mockResolvedValue(MOCK_USER);
    (settingsService.updateUser as jest.Mock).mockResolvedValue(MOCK_USER)
})

// ---------------------------------------------------------------------------
// D01 — Load user details
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D01: loads account details from API', () => {
    it('shows loading spinner initially', () => {
        (settingsService.getUserById as jest.Mock).mockImplementation(
            () => new Promise(() => { /* never resolves */ })
        )
        renderPage()
        expect(screen.getByLabelText('Loading account')).toBeInTheDocument()
    })

    it('calls getUserById with parsed id', async () => {
        renderPage()
        await waitFor(() => {
            expect(settingsService.getUserById).toHaveBeenCalledWith(2)
        })
    })

    it('shows error message when API fails', async () => {
        (settingsService.getUserById as jest.Mock).mockRejectedValue(new Error('Not found'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Not found')
        })
    })

    it('displays user name as heading', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Company Admin' })).toBeInTheDocument()
        })
    })

    it('displays user email', async () => {
        renderPage()
        await waitFor(() => {
            const emailNodes = screen.queryAllByText('admin@company.com')
            expect(emailNodes.length).toBeGreaterThanOrEqual(1)
        })
    })

    it('displays organisation name', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Demo Corp')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// D02 — Navigation
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D02: back navigation', () => {
    it('back button navigates to account admin list', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Back to account administration')).toBeInTheDocument()
        })
        await userEvent.click(screen.getByLabelText('Back to account administration'))
        expect(mockNavigate).toHaveBeenCalledWith('/settings/account')
    })
})

// ---------------------------------------------------------------------------
// D03 — Edit and save
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D03: edit and save account', () => {
    it('renders role select for non-internal user', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        expect(screen.getByLabelText('Role')).toHaveValue('client_admin')
    })

    it('calls updateUser with new role on save', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USER, role: 'user' })
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        const roleSelect = screen.getByLabelText('Role')
        await userEvent.selectOptions(roleSelect, 'user')

        const saveBtn = screen.getByLabelText('Save account changes')
        await userEvent.click(saveBtn)

        await waitFor(() => {
            expect(settingsService.updateUser).toHaveBeenCalledWith(2, { role: 'user', isActive: true })
        })
    })

    it('shows success notification on save', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        await userEvent.click(screen.getByLabelText('Save account changes'))
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Account updated successfully.', 'success')
        })
    })

    it('shows error notification when save fails', async () => {
        (settingsService.updateUser as jest.Mock).mockRejectedValue(new Error('Save failed'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        await userEvent.click(screen.getByLabelText('Save account changes'))
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Save failed', 'error')
        })
    })

    it('discard button resets changes', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        expect(screen.getByLabelText('Discard changes')).toBeInTheDocument()
        await userEvent.click(screen.getByLabelText('Discard changes'))
        expect(screen.getByLabelText('Role')).toHaveValue('client_admin')
    })
})

// ---------------------------------------------------------------------------
// D04 — Internal admin account is read-only
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D04: internal admin account shows role as read-only text', () => {
    it('shows internal admin label instead of select when user is internal_admin', async () => {
        (settingsService.getUserById as jest.Mock).mockResolvedValue({
            ...MOCK_USER,
            id: 5,
            role: 'internal_admin',
            fullName: 'Internal User',
        });
        renderPage('5')
        await waitFor(() => {
            expect(screen.getByText('Internal Admin')).toBeInTheDocument()
        })
        expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    })

    it('does not show Save button for internal_admin users', async () => {
        (settingsService.getUserById as jest.Mock).mockResolvedValue({
            ...MOCK_USER,
            id: 5,
            role: 'internal_admin',
        });
        renderPage('5')
        await waitFor(() => {
            expect(screen.getByText('Internal Admin')).toBeInTheDocument()
        })
        expect(screen.queryByLabelText('Save account changes')).not.toBeInTheDocument()
    })
})
