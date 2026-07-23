/**
 * TESTS — Settings: Account Create Page
 * Second artifact. Requirements: settings/AccountCreatePage.requirements.md
 * Test naming: T-SETTINGS-USERS-C{NN}
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AccountCreatePage from '../AccountCreatePage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../settings.service', () => ({
    createUser: jest.fn(),
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

const MOCK_CREATED = {
    id: 10,
    username: 'newuser',
    email: 'new@company.com',
    fullName: 'New User',
    orgCode: 'DEMO',
    orgName: 'Demo Corp',
    role: 'user',
    isActive: true,
    lastLogin: null,
    createdAt: '2026-05-10T00:00:00Z',
    tempPassword: 'TempAbc123!',
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/settings/account/new']}>
            <Routes>
                <Route path="/settings/account/new" element={<AccountCreatePage />} />
                <Route path="/settings/account/:id" element={<div>Account Detail</div>} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks();
    (settingsService.createUser as jest.Mock).mockResolvedValue(MOCK_CREATED)
})

// ---------------------------------------------------------------------------
// C01 — Form fields rendered
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-C01: create form has required fields', () => {
    it('renders Full Name input', () => {
        renderPage()
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    })

    it('renders Email input', () => {
        renderPage()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('renders Username input', () => {
        renderPage()
        expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('renders Role select', () => {
        renderPage()
        expect(screen.getByLabelText('Role')).toBeInTheDocument()
    })

    it('renders Organisation Code input', () => {
        renderPage()
        expect(screen.getByLabelText('Organisation Code')).toBeInTheDocument()
    })

    it('renders ID as read-only placeholder', () => {
        renderPage()
        expect(screen.getByText(/assigned on save/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// C02 — Save creates account via API
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-C02: save creates account', () => {
    it('calls createUser with form values on sidebar save event', async () => {
        renderPage()
        await userEvent.type(screen.getByLabelText('Full Name'), 'New User')
        await userEvent.type(screen.getByLabelText('Email'), 'new@company.com')
        await userEvent.type(screen.getByLabelText('Username'), 'newuser')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        await userEvent.type(screen.getByLabelText('Organisation Code'), 'DEMO')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(settingsService.createUser).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'new@company.com', username: 'newuser', role: 'user' })
            )
        })
    })

    it('navigates to new account detail page on success', async () => {
        renderPage()
        await userEvent.type(screen.getByLabelText('Email'), 'new@company.com')
        await userEvent.type(screen.getByLabelText('Username'), 'newuser')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/settings/account/10')
        })
    })

    it('shows temp password in notification on success', async () => {
        renderPage()
        await userEvent.type(screen.getByLabelText('Email'), 'new@company.com')
        await userEvent.type(screen.getByLabelText('Username'), 'newuser')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringContaining('TempAbc123!'),
                'success'
            )
        })
    })

    it('shows error notification when createUser fails', async () => {
        (settingsService.createUser as jest.Mock).mockRejectedValue(new Error('Email already exists'))
        renderPage()
        await userEvent.type(screen.getByLabelText('Email'), 'new@company.com')
        await userEvent.type(screen.getByLabelText('Username'), 'newuser')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Email already exists', 'error')
        })
    })
})

// ---------------------------------------------------------------------------
// C03 — Validation prevents empty required fields
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-C03: validation', () => {
    it('does not call createUser when email is empty', async () => {
        renderPage()
        await userEvent.type(screen.getByLabelText('Username'), 'newuser')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(settingsService.createUser).not.toHaveBeenCalled()
        })
    })

    it('does not call createUser when username is empty', async () => {
        renderPage()
        await userEvent.type(screen.getByLabelText('Email'), 'test@test.com')
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')

        fireEvent(window, new CustomEvent('settings:account:save'))

        await waitFor(() => {
            expect(settingsService.createUser).not.toHaveBeenCalled()
        })
    })
})

// ---------------------------------------------------------------------------
// C04 — Sidebar section registered
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-C04: sidebar section registered', () => {
    it('calls useSidebarSection with Account Administration title', () => {
        const { useSidebarSection } = require('@/shell/SidebarContext')
        renderPage()
        expect(useSidebarSection).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Account Administration' })
        )
    })
})
