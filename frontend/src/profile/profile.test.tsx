/**
 * TESTS — Profile Page
 * Second artifact. Requirements: frontend/src/profile/profile.requirements.md
 * Test naming: T-PROFILE-{feature}-R{NN}
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// API CONTRACT ALIGNMENT (verified 2026-04-04 against real backend):
//   GET /api/profile → ProfileData (no .data wrapper)
//   PUT /api/profile → ProfileData
//   PUT /api/profile/password → void

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(() => ({
        token: 'tok',
        user: { id: 1, email: 'jane@example.com', fullName: 'Jane Smith', orgCode: 'ORG-001', role: 'underwriter' },
    })),
}))

jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

const mockAddNotification = jest.fn()

import * as apiClient from '@/shared/lib/api-client/api-client'

const MOCK_ME = {
    id: 1,
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    role: 'underwriter',
    orgCode: 'ORG-001',
}

function renderProfile() {
    const { default: ProfilePage } = require('./index')
    return render(
        <MemoryRouter>
            <ProfilePage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue(MOCK_ME);
    (apiClient.put as jest.Mock).mockResolvedValue({ data: MOCK_ME });
    (apiClient.post as jest.Mock).mockResolvedValue({ message: 'Password changed successfully' })
})

// ---------------------------------------------------------------------------
// Page load and display
// ---------------------------------------------------------------------------

describe('T-PROFILE-LOAD-R01: fetches profile on mount', () => {
    it('calls GET /api/auth/me on mount', async () => {
        renderProfile()
        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me')
        })
    })
})

describe('T-PROFILE-LOAD-R02: displays fetched name in editable input', () => {
    it('pre-populates the Full Name field with the fetched fullName', async () => {
        renderProfile()
        await waitFor(() => {
            const nameInput = screen.getByDisplayValue('Jane Smith')
            expect(nameInput).toBeInTheDocument()
        })
    })
})

describe('T-PROFILE-LOAD-R03: read-only fields render email, role, organisation', () => {
    it('shows email as read-only text', async () => {
        renderProfile()
        await waitFor(() => {
            expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        })
    })

    it('shows role as read-only text', async () => {
        renderProfile()
        await waitFor(() => {
            expect(screen.getByText('underwriter')).toBeInTheDocument()
        })
    })

    it('shows organisation as read-only text', async () => {
        renderProfile()
        await waitFor(() => {
            expect(screen.getByText('ORG-001')).toBeInTheDocument()
        })
    })

    it('email input is not an editable field', async () => {
        renderProfile()
        await waitFor(() => expect(apiClient.get).toHaveBeenCalled())
        // email must not appear as an editable <input> — only as text
        const emailInputs = screen.queryAllByRole('textbox')
        const editableEmails = emailInputs.filter(
            (el) => (el as HTMLInputElement).value === 'jane@example.com'
        )
        expect(editableEmails).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// Save profile name
// ---------------------------------------------------------------------------

describe('T-PROFILE-SAVE-R04: Save button calls PUT /api/auth/profile', () => {
    it('calls PUT /api/auth/profile with the current name value', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        const nameInput = screen.getByDisplayValue('Jane Smith')
        await userEvent.clear(nameInput)
        await userEvent.type(nameInput, 'Jane A. Smith')

        const saveBtn = screen.getByRole('button', { name: /save/i })
        await userEvent.click(saveBtn)

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalledWith(
                '/api/auth/profile',
                expect.objectContaining({ name: 'Jane A. Smith' })
            )
        })
    })

    it('shows "Profile updated" toast on success', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        const saveBtn = screen.getByRole('button', { name: /save/i })
        await userEvent.click(saveBtn)

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringMatching(/profile updated/i),
                'success'
            )
        })
    })
})

describe('T-PROFILE-SAVE-R05: inline validation — empty name blocks API call', () => {
    it('shows "Name is required" and does not call PUT when name cleared', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        const nameInput = screen.getByDisplayValue('Jane Smith')
        await userEvent.clear(nameInput)

        const saveBtn = screen.getByRole('button', { name: /save/i })
        await userEvent.click(saveBtn)

        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
        expect(apiClient.put).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------

describe('T-PROFILE-PW-R06: Change Password calls POST /api/auth/change-password', () => {
    it('calls POST /api/auth/change-password with currentPassword and newPassword', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass1')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass1')

        const changePwBtn = screen.getByRole('button', { name: /change password/i })
        await userEvent.click(changePwBtn)

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                '/api/auth/change-password',
                expect.objectContaining({
                    currentPassword: 'OldPass1',
                    newPassword: 'NewPass1',
                })
            )
        })
    })

    it('shows "Password changed successfully" toast and clears fields on success', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass1')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass1')

        await userEvent.click(screen.getByRole('button', { name: /change password/i }))

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringMatching(/password changed successfully/i),
                'success'
            )
        })

        // Fields must be cleared
        expect((screen.getByLabelText(/current password/i) as HTMLInputElement).value).toBe('')
        expect((screen.getByLabelText(/^new password/i) as HTMLInputElement).value).toBe('')
    })
})

describe('T-PROFILE-PW-R07: new password validation — button disabled if rules violated', () => {
    it('shows validation message and keeps button disabled when password is too short', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/^new password/i), 'short')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'short')

        const btn = screen.getByRole('button', { name: /change password/i })
        expect(btn).toBeDisabled()
        expect(btn).toHaveAttribute('title', expect.stringMatching(/password does not meet requirements/i))
    })

    it('shows validation message when no uppercase letter', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/^new password/i), 'lowercase1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'lowercase1')

        expect(screen.getByRole('button', { name: /change password/i })).toHaveAttribute('title', expect.stringMatching(/password does not meet requirements/i))
    })

    it('shows validation message when no digit', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/^new password/i), 'NoDigitHere')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NoDigitHere')

        expect(screen.getByRole('button', { name: /change password/i })).toHaveAttribute('title', expect.stringMatching(/password does not meet requirements/i))
    })

    it('enables button when password meets all rules', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass1')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'ValidPass1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'ValidPass1')

        expect(screen.getByRole('button', { name: /change password/i })).not.toBeDisabled()
    })
})

describe('T-PROFILE-PW-R08: passwords must match', () => {
    it('shows "Passwords do not match" and disables button when confirm differs', async () => {
        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/^new password/i), 'ValidPass1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'ValidPass2')

        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled()
    })
})

describe('T-PROFILE-PW-R09: 401 response shows inline current-password error', () => {
    it('shows "Current password is incorrect" on 401', async () => {
        const err = new Error('Unauthorized') as any
        err.status = 401;
        (apiClient.post as jest.Mock).mockRejectedValueOnce(err)

        renderProfile()
        await waitFor(() => screen.getByDisplayValue('Jane Smith'))

        await userEvent.type(screen.getByLabelText(/current password/i), 'WrongPass1')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'ValidPass1')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'ValidPass1')

        await userEvent.click(screen.getByRole('button', { name: /change password/i }))

        await waitFor(() => {
            expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument()
        })
    })
})
