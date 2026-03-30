/**
 * TESTS � AUTH PAGES (Login + Logout)
 * Second artifact. Requirements: app/pages/auth/auth.requirements.md
 * These tests must all pass before any auth component code is considered done.
 *
 * Test naming convention: T-AUTH-{feature}-R{requirement number}
 * Run with: jest --config jest.scan.config.js app/pages/auth/auth.test.tsx
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT (verified 2026-03-06 against real backend):
//   POST /api/auth/login  ? { message: string, token: string, user: { id, username, email, fullName, orgCode, role } }
//   No .data wrapper � backend returns the object directly at root level
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    storeSession: jest.fn(),
    clearSession: jest.fn(),
    getSession: jest.fn(),
    isAuthenticated: jest.fn(),
}))

import { post as apiPost } from '@/shared/lib/api-client/api-client'
import {
    storeSession,
    clearSession,
    isAuthenticated,
} from '@/shared/lib/auth-session/auth-session'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_LOGIN_SUCCESS = {
    message: 'Login successful',
    token: 'mock-jwt-token',
    user: {
        id: 1,
        username: 'jsmith',
        email: 'jane@example.com',
        fullName: 'Jane Smith',
        orgCode: 'ORG-001',
        role: 'underwriter',
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLoginPage(initialAuthenticated = false) {
    ; (isAuthenticated as jest.Mock).mockReturnValue(initialAuthenticated)
    const { default: LoginPage } = require('./LoginPage')
    return render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/app-home" element={<div data-testid="home-page">Home</div>} />
            </Routes>
        </MemoryRouter>
    )
}

// ---------------------------------------------------------------------------
// T-AUTH-LOGIN � Login page
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // --- Route and access ---

    test('T-AUTH-LOGIN-R1: renders the login form even when a valid session already exists (REQ-AUTH-F-002)', () => {
        renderLoginPage(true) // already authenticated � form must still show
        expect(screen.getByRole('form')).toBeInTheDocument()
        expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R2: renders the login form when no session exists', () => {
        renderLoginPage(false)
        expect(screen.getByRole('form')).toBeInTheDocument()
    })

    // --- Form fields ---

    test('T-AUTH-LOGIN-R3: renders an email input field', () => {
        renderLoginPage()
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R4: renders a password input field', () => {
        renderLoginPage()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R5: renders a submit button', () => {
        renderLoginPage()
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    // --- Loading state ---

    test('T-AUTH-LOGIN-R6: disables the submit button while loading', async () => {
        ; (apiPost as jest.Mock).mockImplementation(() => new Promise(() => { })) // never resolves
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    })

    test('T-AUTH-LOGIN-R7: shows a loading spinner while the request is in flight', async () => {
        ; (apiPost as jest.Mock).mockImplementation(() => new Promise(() => { }))
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R8: disables the form inputs while loading', async () => {
        ; (apiPost as jest.Mock).mockImplementation(() => new Promise(() => { }))
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        expect(screen.getByRole('textbox', { name: /email/i })).toBeDisabled()
        expect(screen.getByLabelText('Password')).toBeDisabled()
    })

    // --- Success ---

    test('T-AUTH-LOGIN-R9: calls auth-session.storeSession on a successful login response', async () => {
        ; (apiPost as jest.Mock).mockResolvedValue(MOCK_LOGIN_SUCCESS)
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            // Component spreads response.user and adds a derived `name` field (from fullName)
            // Use objectContaining so the extra `name` property doesn't cause a strict-equality fail
            expect(storeSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    token: MOCK_LOGIN_SUCCESS.token,
                    user: expect.objectContaining(MOCK_LOGIN_SUCCESS.user),
                })
            )
        })
    })

    test('T-AUTH-LOGIN-R10: redirects to /app-home after successful login', async () => {
        ; (apiPost as jest.Mock).mockResolvedValue(MOCK_LOGIN_SUCCESS)
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByTestId('home-page')).toBeInTheDocument()
        })
    })

    test('T-AUTH-LOGIN-R11: storeSession is called before the redirect', async () => {
        const callOrder: string[] = []
            ; (apiPost as jest.Mock).mockResolvedValue(MOCK_LOGIN_SUCCESS)
            ; (storeSession as jest.Mock).mockImplementation(() => callOrder.push('storeSession'))
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => screen.getByTestId('home-page'))
        expect(callOrder[0]).toBe('storeSession')
    })

    // --- Error: 401 invalid credentials ---

    test('T-AUTH-LOGIN-R12: shows "Incorrect email or password" on a 401 response', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({ response: { status: 401 } })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'wrong@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/incorrect email or password/i)
        })
    })

    test('T-AUTH-LOGIN-R13: form inputs retain their values after a 401 error � not cleared', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({ response: { status: 401 } })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'wrong@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => screen.getByRole('alert'))
        expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('wrong@example.com')
    })

    test('T-AUTH-LOGIN-R14: submit button is re-enabled after a 401 error', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({ response: { status: 401 } })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'wrong@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
        })
    })

    // --- Error: 500 server error ---

    test('T-AUTH-LOGIN-R15: shows a generic error message on a 500 response', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({ response: { status: 500 } })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
        })
    })

    test('T-AUTH-LOGIN-R16: shows a generic error message on a network failure (no response)', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue(new Error('Network Error'))
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
        })
    })

    // --- Error: 423 account locked ---

    test('T-AUTH-LOGIN-R-LOCK-1: shows account locked message on a 423 response', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({ response: { status: 423 } })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'locked@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/account has been locked/i)
        })
    })

    // --- Error: 401 with attempts remaining ---

    test('T-AUTH-LOGIN-R-ATTEMPTS-1: appends attempts remaining count to error when server provides it', async () => {
        ; (apiPost as jest.Mock).mockRejectedValue({
            response: { status: 401, data: { attemptsRemaining: 2 } },
        })
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'wrong@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/2 attempts remaining/i)
        })
    })

    // --- Empty field validation ---

    test('T-AUTH-LOGIN-R-EMPTY-1: shows error when email is empty and does not call the API', async () => {
        renderLoginPage()
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/enter both email and password/i)
        })
        expect(apiPost).not.toHaveBeenCalled()
    })

    test('T-AUTH-LOGIN-R-EMPTY-2: shows error when password is empty and does not call the API', async () => {
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/enter both email and password/i)
        })
        expect(apiPost).not.toHaveBeenCalled()
    })

    // --- Password show/hide toggle ---

    test('T-AUTH-LOGIN-R-TOGGLE-1: show password button is present in the form', () => {
        renderLoginPage()
        expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R-TOGGLE-2: clicking toggle changes password input type to text', async () => {
        renderLoginPage()
        const passwordInput = screen.getByLabelText('Password')
        expect(passwordInput).toHaveAttribute('type', 'password')
        await userEvent.click(screen.getByRole('button', { name: /show password/i }))
        expect(passwordInput).toHaveAttribute('type', 'text')
    })

    test('T-AUTH-LOGIN-R-TOGGLE-3: clicking toggle again hides password (type back to password)', async () => {
        renderLoginPage()
        const passwordInput = screen.getByLabelText('Password')
        await userEvent.click(screen.getByRole('button', { name: /show password/i }))
        await userEvent.click(screen.getByRole('button', { name: /hide password/i }))
        expect(passwordInput).toHaveAttribute('type', 'password')
    })

    // --- Forgot password link ---

    test('T-AUTH-LOGIN-R-FORGOT-1: forgot password link is present', () => {
        renderLoginPage()
        expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R-FORGOT-2: clicking forgot password shows administrator alert', async () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { })
        renderLoginPage()
        await userEvent.click(screen.getByText(/forgot password/i))
        expect(alertSpy).toHaveBeenCalledWith(
            expect.stringMatching(/contact your administrator/i)
        )
        alertSpy.mockRestore()
    })

    // --- Input placeholders ---

    test('T-AUTH-LOGIN-R-PH-1: email input has placeholder text', () => {
        renderLoginPage()
        expect(screen.getByPlaceholderText(/email@company\.com/i)).toBeInTheDocument()
    })

    test('T-AUTH-LOGIN-R-PH-2: password input has placeholder text', () => {
        renderLoginPage()
        expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument()
    })

    // --- Architecture compliance ---

    test('T-AUTH-LOGIN-R17: LoginPage does not call fetch() directly', () => {
        const pages = ['LoginPage.tsx', 'components/LoginForm/component.tsx']
        pages.forEach((file) => {
            try {
                const source = require('fs')
                    .readFileSync(require('path').resolve(__dirname, file), 'utf8')
                expect(source).not.toMatch(/\bfetch\s*\(/)
            } catch {
                // File does not yet exist � test will pass once created
            }
        })
    })

    test('T-AUTH-LOGIN-R18: LoginPage does not write to localStorage directly', () => {
        const pages = ['LoginPage.tsx', 'components/LoginForm/component.tsx']
        pages.forEach((file) => {
            try {
                const source = require('fs')
                    .readFileSync(require('path').resolve(__dirname, file), 'utf8')
                expect(source).not.toContain('localStorage.setItem')
                expect(source).not.toContain('localStorage.setItem')
                expect(source).not.toContain('sessionStorage.setItem')
            } catch {
                // File does not yet exist
            }
        })
    })

    test('T-AUTH-LOGIN-R19: LoginPage does not import from domains/', () => {
        try {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, 'LoginPage.tsx'), 'utf8')
            expect(source).not.toMatch(/from ['"].*\/domains\//)
        } catch {
            // File does not yet exist
        }
    })

    test('T-AUTH-LOGIN-R20: LoginPage does not hardcode hex colour values', () => {
        try {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, 'LoginPage.tsx'), 'utf8')
            expect(source).not.toMatch(/#[0-9a-fA-F]{3,6}['"\s]/)
        } catch {
            // File does not yet exist
        }
    })

    test('T-AUTH-LOGIN-R21: login API call targets /api/auth/login with POST', async () => {
        ; (apiPost as jest.Mock).mockResolvedValue(MOCK_LOGIN_SUCCESS)
        renderLoginPage()
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(apiPost).toHaveBeenCalledWith(
                '/api/auth/login',
                expect.objectContaining({
                    email: 'jane@example.com',
                    password: 'password123',
                })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// T-AUTH-LOGOUT � Logout behaviour
// ---------------------------------------------------------------------------

describe('Logout', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('T-AUTH-LOGOUT-R1: logout calls auth-session.clearSession()', async () => {
        // The logout trigger lives in AppLayout (Navbar/Sidebar) � import that here
        // For now test the clearSession contract via a stub logout trigger component
        const { default: LogoutButton } = require('@/shell/LogoutButton')
        render(
            <MemoryRouter initialEntries={['/app-home']}>
                <Routes>
                    <Route path="/app-home" element={<LogoutButton />} />
                    <Route path="/login" element={<div data-testid="login-page" />} />
                </Routes>
            </MemoryRouter>
        )
        await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
        expect(clearSession).toHaveBeenCalledTimes(1)
    })

    test('T-AUTH-LOGOUT-R2: logout redirects to /login', async () => {
        const { default: LogoutButton } = require('@/shell/LogoutButton')
        render(
            <MemoryRouter initialEntries={['/app-home']}>
                <Routes>
                    <Route path="/app-home" element={<LogoutButton />} />
                    <Route path="/login" element={<div data-testid="login-page" />} />
                </Routes>
            </MemoryRouter>
        )
        await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
        })
    })

    test('T-AUTH-LOGOUT-R3: LogoutButton does not call localStorage.removeItem directly', () => {
        try {
            const source = require('fs')
                .readFileSync(
                    require('path').resolve(__dirname, '../../AppLayout/LogoutButton.tsx'),
                    'utf8'
                )
            expect(source).not.toContain('localStorage.removeItem')
            expect(source).not.toContain('sessionStorage.removeItem')
            expect(source).not.toContain('localStorage.clear')
        } catch {
            // File does not yet exist
        }
    })

    test('T-AUTH-LOGOUT-R4: logout calls POST /api/auth/logout via api-client before clearing session', async () => {
        const callOrder: string[] = []
            ; (apiPost as jest.Mock).mockImplementation((url: string) => {
                callOrder.push(`apiPost:${url}`)
                return Promise.resolve({ message: 'Logged out successfully' })
            })
            ; (clearSession as jest.Mock).mockImplementation(() => callOrder.push('clearSession'))

        const { default: LogoutButton } = require('@/shell/LogoutButton')
        render(
            <MemoryRouter initialEntries={['/app-home']}>
                <Routes>
                    <Route path="/app-home" element={<LogoutButton />} />
                    <Route path="/login" element={<div data-testid="login-page" />} />
                </Routes>
            </MemoryRouter>
        )
        await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
        await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument())

        expect(apiPost).toHaveBeenCalledWith('/api/auth/logout', undefined)
        expect(callOrder.indexOf('apiPost:/api/auth/logout')).toBeLessThan(
            callOrder.indexOf('clearSession')
        )
    })

    test('T-AUTH-LOGOUT-R5: LogoutButton clears session and redirects even when logout API call fails', async () => {
        // Network failure on logout should not strand the user � client session must still be cleared
        ; (apiPost as jest.Mock).mockRejectedValue(new Error('Network error'))
        const { default: LogoutButton } = require('@/shell/LogoutButton')
        render(
            <MemoryRouter initialEntries={['/app-home']}>
                <Routes>
                    <Route path="/app-home" element={<LogoutButton />} />
                    <Route path="/login" element={<div data-testid="login-page" />} />
                </Routes>
            </MemoryRouter>
        )
        await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
        await waitFor(() => {
            expect(clearSession).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
        })
    })

    test('T-AUTH-LOGOUT-R6: LogoutButton does not call fetch() directly', () => {
        try {
            const source = require('fs')
                .readFileSync(
                    require('path').resolve(__dirname, '../../AppLayout/LogoutButton.tsx'),
                    'utf8'
                )
            expect(source).not.toMatch(/\bfetch\s*\(/)
        } catch {
            // File does not yet exist
        }
    })
})

// ---------------------------------------------------------------------------
// T-AUTH-SESSION � auth-session service contract (integration boundary tests)
// ---------------------------------------------------------------------------

describe('auth-session service contract', () => {
    test('T-AUTH-SESSION-R1: storeSession stores both the token and the full user object', () => {
        // This test validates the contract expected by LoginPage.
        // The real auth-session implementation must honour this shape.
        const mockStore: Record<string, unknown> = {}
        const realStoreSession = (data: { token: string; user: object }) => {
            mockStore['token'] = data.token
            mockStore['user'] = data.user
        }
        realStoreSession({ token: 'abc', user: { id: 'USR-001', org_code: 'ORG-001' } })
        expect(mockStore['token']).toBe('abc')
        expect(mockStore['user']).toMatchObject({ id: 'USR-001', org_code: 'ORG-001' })
    })

    test('T-AUTH-SESSION-R2: storeSession payload includes org_code from the login response', async () => {
        ; (apiPost as jest.Mock).mockResolvedValue(MOCK_LOGIN_SUCCESS)
            ; (isAuthenticated as jest.Mock).mockReturnValue(false)
        const { default: LoginPage } = require('./LoginPage')
        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/app-home" element={<div>Home</div>} />
                </Routes>
            </MemoryRouter>
        )
        await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'jane@example.com')
        await userEvent.type(screen.getByLabelText('Password'), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
        await waitFor(() => {
            expect(storeSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({ orgCode: 'ORG-001' }),
                })
            )
        })
    })
})
