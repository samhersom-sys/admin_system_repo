/**
 * TESTS — Settings: Account Detail Page
 * Second artifact. Requirements: settings/AccountAdministrationPage.requirements.md
 * Test naming: T-SETTINGS-USERS-D{NN}
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    getUserAudit: jest.fn(),
    postUserAudit: jest.fn(),
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

const MOCK_AUDIT = [
    { action: 'Account Opened', user: 'admin@policyforge.com', date: '2026-05-01T10:00:00Z', details: null, changes: null },
    { action: 'Account Updated', user: 'admin@policyforge.com', date: '2026-05-02T11:00:00Z', details: null, changes: { Role: { old: 'client_admin', new: 'user' } } },
]

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
    (settingsService.updateUser as jest.Mock).mockResolvedValue(MOCK_USER);
    (settingsService.getUserAudit as jest.Mock).mockResolvedValue(MOCK_AUDIT);
    (settingsService.postUserAudit as jest.Mock).mockResolvedValue(undefined)
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
// D02 — No in-page back button (REQ-SETTINGS-USERS-D-D07)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D02: no in-page back button', () => {
    it('does not render a back button in the page body', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Company Admin' })).toBeInTheDocument()
        })
        expect(screen.queryByLabelText('Back to account administration')).not.toBeInTheDocument()
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

    it('calls updateUser with new role on save via sidebar event', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USER, role: 'user' })
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        // Trigger save via custom event (sidebar)
        fireEvent(window, new CustomEvent('settings:account:save'))
        await waitFor(() => {
            expect(settingsService.updateUser).toHaveBeenCalledWith(
                2,
                expect.objectContaining({ role: 'user', isActive: true })
            )
        })
    })

    it('shows success notification on save', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        fireEvent(window, new CustomEvent('settings:account:save'))
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
        fireEvent(window, new CustomEvent('settings:account:save'))
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

    it('does not render a Save button in the page body for internal_admin users', async () => {
        (settingsService.getUserById as jest.Mock).mockResolvedValue({
            ...MOCK_USER,
            id: 5,
            role: 'internal_admin',
        });
        renderPage('5')
        await waitFor(() => {
            expect(screen.getByText('Internal Admin')).toBeInTheDocument()
        })
        // Save is in sidebar, not as a page button
        expect(screen.queryByLabelText('Save account changes')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// D05 — Tab navigation (REQ-SETTINGS-USERS-D-D01)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D05: tab navigation renders Details and Audit tabs', () => {
    it('renders both Details and Audit tabs', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-details')).toBeInTheDocument()
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
    })

    it('Details tab is active by default', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-details')).toBeInTheDocument()
        })
        // Details content (role select) is visible by default
        expect(screen.getByLabelText('Role')).toBeInTheDocument()
    })

    it('clicking Audit tab hides Details content', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// D06 — Audit tab content (REQ-SETTINGS-USERS-D-D02)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D06: audit tab shows AuditTable with events', () => {
    it('calls getUserAudit on first audit tab activation', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(settingsService.getUserAudit).toHaveBeenCalledWith(2)
        })
    })

    it('does not call getUserAudit until audit tab is clicked', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        expect(settingsService.getUserAudit).not.toHaveBeenCalled()
    })

    it('renders audit event actions in the table', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(screen.getByText('Account Opened')).toBeInTheDocument()
            expect(screen.getByText('Account Updated')).toBeInTheDocument()
        })
    })

    it('shows empty state when no audit events exist', async () => {
        (settingsService.getUserAudit as jest.Mock).mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(screen.getByText(/no audit history/i)).toBeInTheDocument()
        })
    })

    it('shows error when audit fetch fails', async () => {
        (settingsService.getUserAudit as jest.Mock).mockRejectedValue(new Error('Audit load failed'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(screen.getByText('Audit load failed')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// D07 — Lifecycle audit events (REQ-SETTINGS-USERS-D-D03)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D07: lifecycle audit events posted on mount/unmount', () => {
    it('posts Account Opened event on mount', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await waitFor(() => {
            expect(settingsService.postUserAudit).toHaveBeenCalledWith(
                2,
                expect.objectContaining({ action: 'Account Opened' })
            )
        })
    })

    it('posts Account Closed event on unmount', async () => {
        const { unmount } = renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        unmount()
        await waitFor(() => {
            expect(settingsService.postUserAudit).toHaveBeenCalledWith(
                2,
                expect.objectContaining({ action: 'Account Closed' })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// D08 — Field change audit on save (REQ-SETTINGS-USERS-D-D04)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D08: Account Updated audit event posted on save', () => {
    it('posts Account Updated with changes when role is changed and saved', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USER, role: 'user' })
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Role')).toBeInTheDocument()
        })
        await userEvent.selectOptions(screen.getByLabelText('Role'), 'user')
        fireEvent(window, new CustomEvent('settings:account:save'))
        await waitFor(() => {
            expect(settingsService.postUserAudit).toHaveBeenCalledWith(
                2,
                expect.objectContaining({
                    action: 'Account Updated',
                    changes: expect.objectContaining({
                        Role: { old: 'client_admin', new: 'user' },
                    }),
                })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// D09 — Sidebar section registered (REQ-SETTINGS-USERS-D-D08)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D09: sidebar section registered', () => {
    it('calls useSidebarSection with Account Administration title', async () => {
        const { useSidebarSection } = require('@/shell/SidebarContext')
        renderPage()
        await waitFor(() => {
            expect(useSidebarSection).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Account Administration' })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// D10 — More editable fields + ID read-only (REQ-SETTINGS-USERS-D-D06)
// ---------------------------------------------------------------------------

describe('T-SETTINGS-USERS-D10: editable fields and read-only ID', () => {
    it('shows ID as read-only text', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('2')).toBeInTheDocument()
        })
        expect(screen.queryByLabelText('ID')).not.toBeInTheDocument()
    })

    it('renders Full Name as an editable input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
        })
        expect(screen.getByLabelText('Full Name')).toHaveValue('Company Admin')
    })

    it('renders Email as an editable input', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Email')).toBeInTheDocument()
        })
        expect(screen.getByLabelText('Email')).toHaveValue('admin@company.com')
    })

    it('includes Full Name change in audit when fullName is changed and saved', async () => {
        (settingsService.updateUser as jest.Mock).mockResolvedValue({ ...MOCK_USER, fullName: 'Updated Name' })
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
        })
        const nameInput = screen.getByLabelText('Full Name')
        await userEvent.clear(nameInput)
        await userEvent.type(nameInput, 'Updated Name')
        fireEvent(window, new CustomEvent('settings:account:save'))
        await waitFor(() => {
            expect(settingsService.postUserAudit).toHaveBeenCalledWith(
                2,
                expect.objectContaining({
                    action: 'Account Updated',
                    changes: expect.objectContaining({
                        'Full Name': { old: 'Company Admin', new: 'Updated Name' },
                    }),
                })
            )
        })
    })
})
