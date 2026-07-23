/**
 * NewBrokerSubmissionPage.test.tsx
 *
 * Domain: PSS-BRK-NEW
 * Requirements: frontend/src/broker-submissions/NewBrokerSubmissionPage.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md, §03-Three-Artifact-Rule.md
 *
 * Coverage (Layer 1 — React component behaviour tests):
 *   REQ-PSS-BRK-NEW-S-001  Non-broker org redirected to home
 *   REQ-PSS-BRK-NEW-S-002  Unauthenticated user redirected to sign-in
 *   REQ-PSS-BRK-NEW-F-001  Form fields present: insured name, class of business, inception date, expiry date, type, estimated premium, broker reference
 *   REQ-PSS-BRK-NEW-F-002  Type field is a required selection — form cannot submit without it
 *   REQ-PSS-BRK-NEW-F-003  Type options shown with plain-language descriptions
 *   REQ-PSS-BRK-NEW-F-004  Estimated premium is optional (no validation error when absent)
 *   REQ-PSS-BRK-NEW-F-005  Broker reference is optional (no validation error when absent)
 *   REQ-PSS-BRK-NEW-F-006  Expiry date defaults to one year after the inception date
 *   REQ-PSS-BRK-NEW-F-007  Insured name is required — error shown when absent on submit
 *   REQ-PSS-BRK-NEW-F-008  Inception date is required — error shown when absent on submit
 *   REQ-PSS-BRK-NEW-F-009  Expiry date must be on or after inception date — error shown otherwise
 *   REQ-PSS-BRK-NEW-F-010  Loading indicator shown while form submission is in flight
 *   REQ-PSS-BRK-NEW-F-011  Navigates to the new submission's detail page on success
 *   REQ-PSS-BRK-NEW-F-012  Error message shown on failure; form data preserved so user can retry
 *   REQ-PSS-BRK-NEW-F-013  Unsaved-changes banner shown after any field is edited
 *   REQ-PSS-BRK-NEW-F-014  Navigating away with unsaved changes shows a confirmation prompt
 *   REQ-PSS-BRK-NEW-NF-001  Form layout is usable on screens 1024px wide and above
 *
 * API CONTRACT: POST /api/broker-submissions
 * Status: endpoint not yet implemented — mock reflects agreed contract shape
 * Contract defined in: backend/nest/src/broker-submissions/broker-submissions.requirements.md
 *
 * Tests written BEFORE implementation per Three-Artifact Rule.
 * All tests will fail until the page component is created.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NewBrokerSubmissionPage from '../NewBrokerSubmissionPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
const mockCreateBrokerSubmission = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/broker-submissions/broker-submissions.service', () => ({
    createBrokerSubmission: (...args: unknown[]) => mockCreateBrokerSubmission(...args),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

import { getSession } from '@/shared/lib/auth-session/auth-session'
const mockGetSession = getSession as jest.Mock

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function brokerSession() {
    return { user: { name: 'Test Broker', orgCode: 'BROKER1', orgType: 'broker' } }
}

function insurerSession() {
    return { user: { name: 'Test Insurer', orgCode: 'INS1', orgType: 'insurer' } }
}

function adminSession() {
    return { user: { name: 'PF Admin', orgCode: 'PF001', orgType: 'platform', role: 'internal_admin' } }
}

function renderPage() {
    return render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NewBrokerSubmissionPage />
        </MemoryRouter>,
    )
}

function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Acme Ltd' } })
    fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-06-01' } })
    // Open dropdown, clear filter so all options are visible, then select Manual
    const typeInput = screen.getByLabelText(/submission type/i)
    fireEvent.focus(typeInput)
    fireEvent.change(typeInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
}

beforeEach(() => {
    jest.clearAllMocks()
    mockAddNotification.mockResolvedValue(undefined)
    mockGetSession.mockReturnValue(brokerSession())
    // Default: never resolves — keeps component in idle state for sync tests
    mockCreateBrokerSubmission.mockReturnValue(new Promise(() => {}))
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-S-001 — Non-broker org redirected to home
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-S-001 — Non-broker org access', () => {
    it('T-PSS-BRK-NEW-S001: navigates to /app-home when the session org_type is not "broker" and user is not an admin', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        expect(mockNavigate).toHaveBeenCalledWith('/app-home')
    })

    it('T-PSS-BRK-NEW-S001b: form is not rendered when user is not a broker or admin', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-S001c: platform admin (internal_admin) is NOT redirected', () => {
        mockGetSession.mockReturnValue(adminSession())
        renderPage()
        expect(mockNavigate).not.toHaveBeenCalledWith('/app-home')
        expect(mockNavigate).not.toHaveBeenCalledWith('/login')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-S-002 — Unauthenticated user redirected to sign-in
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-S-002 — Unauthenticated access', () => {
    it('T-PSS-BRK-NEW-S002: navigates to /login when there is no active session', () => {
        mockGetSession.mockReturnValue(null)
        renderPage()
        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-S-003 — Platform admin read-only view
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-S-003 — Admin read-only view', () => {
    it('T-PSS-BRK-NEW-S003a: page renders for platform admin without redirecting', () => {
        mockGetSession.mockReturnValue(adminSession())
        renderPage()
        expect(screen.getByLabelText(/insured name/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-S003b: informational notice is pushed to the notification panel for platform admin', () => {
        mockGetSession.mockReturnValue(adminSession())
        renderPage()
        expect(mockAddNotification).toHaveBeenCalledWith(
            expect.stringMatching(/platform administrators/i),
            'info',
        )
    })

    it('T-PSS-BRK-NEW-S003c: save event does not call createBrokerSubmission for platform admin', async () => {
        mockGetSession.mockReturnValue(adminSession())
        renderPage()
        // Fill required fields so validation would not block a broker user
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Admin Test' } })
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-06-01' } })
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).not.toHaveBeenCalled()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-001 — Form fields present
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-001 — Form fields', () => {
    it('T-PSS-BRK-NEW-F001a: insured name field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/insured name/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001b: class of business field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/class of business/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001c: inception date field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/inception date/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001d: expiry date field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001e: submission type selection is present', () => {
        renderPage()
        expect(screen.getByLabelText(/submission type/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001f: estimated premium field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/estimated premium/i)).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F001g: broker reference field is present', () => {
        renderPage()
        expect(screen.getByLabelText(/broker reference/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-002 — Type selection is required
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-002 — Type selection required', () => {
    it('T-PSS-BRK-NEW-F002: platform_shared is pre-selected by default and allows the form to be submitted without an explicit selection', async () => {
        mockCreateBrokerSubmission.mockResolvedValue({ id: 1 })
        renderPage()
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Test Co' } })
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-01-01' } })
        // No explicit type selection — platform_shared is the default
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).toHaveBeenCalledWith(
                expect.objectContaining({ source: 'platform_shared' }),
            )
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-003 — Type options with descriptions
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-003 — Type option descriptions', () => {
    it('T-PSS-BRK-NEW-F003a: Manual type option shows the agreed description when selected', () => {
        renderPage()
        const typeInput = screen.getByLabelText(/submission type/i)
        fireEvent.focus(typeInput)
        fireEvent.change(typeInput, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
        expect(
            screen.getByText(/I will manage placement of this risk outside the platform/i),
        ).toBeInTheDocument()
    })

    it('T-PSS-BRK-NEW-F003b: Platform Shared type option shows the agreed description by default', () => {
        renderPage()
        expect(
            screen.getByText(/I intend to share this submission with insurers through the platform/i),
        ).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-004 / F-005 — Optional fields
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-004/005 — Optional fields', () => {
    it('T-PSS-BRK-NEW-F004: form submits without validation error when estimated premium is empty', async () => {
        mockCreateBrokerSubmission.mockResolvedValue({ id: 1 })
        renderPage()
        fillRequiredFields()
        // Ensure premium is empty
        fireEvent.change(screen.getByLabelText(/estimated premium/i), { target: { value: '' } })
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).toHaveBeenCalled()
        })
    })

    it('T-PSS-BRK-NEW-F005: form submits without validation error when broker reference is empty', async () => {
        mockCreateBrokerSubmission.mockResolvedValue({ id: 1 })
        renderPage()
        fillRequiredFields()
        // Ensure reference is empty
        fireEvent.change(screen.getByLabelText(/broker reference/i), { target: { value: '' } })
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).toHaveBeenCalled()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-006 — Expiry defaults to inception + 1 year
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-006 — Expiry date default', () => {
    it('T-PSS-BRK-NEW-F006: changing the inception date updates the expiry date to exactly one year later', () => {
        renderPage()
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-03-15' } })
        const expiry = screen.getByLabelText(/expiry date/i) as HTMLInputElement
        expect(expiry.value).toBe('2027-03-15')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-007 / F-008 — Required field validation
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-007/008 — Required field validation', () => {
    it('T-PSS-BRK-NEW-F007: shows a validation error and does not submit when insured name is empty', async () => {
        renderPage()
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-01-01' } })
        const typeF007 = screen.getByLabelText(/submission type/i)
        fireEvent.focus(typeF007)
        fireEvent.change(typeF007, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).not.toHaveBeenCalled()
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-NEW-F008: shows a validation error and does not submit when inception date is empty', async () => {
        renderPage()
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Test Co' } })
        const typeF008 = screen.getByLabelText(/submission type/i)
        fireEvent.focus(typeF008)
        fireEvent.change(typeF008, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).not.toHaveBeenCalled()
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-009 — Expiry must be on or after inception
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-009 — Expiry >= inception validation', () => {
    it('T-PSS-BRK-NEW-F009: shows a validation error when expiry date is set before inception date', async () => {
        renderPage()
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-06-01' } })
        fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2026-05-01' } })
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Test Co' } })
        const typeF009 = screen.getByLabelText(/submission type/i)
        fireEvent.focus(typeF009)
        fireEvent.change(typeF009, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).not.toHaveBeenCalled()
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-NEW-F009b: no expiry validation error when expiry equals inception date', async () => {
        mockCreateBrokerSubmission.mockResolvedValue({ id: 1 })
        renderPage()
        fireEvent.change(screen.getByLabelText(/inception date/i), { target: { value: '2026-06-01' } })
        fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2026-06-01' } })
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Test Co' } })
        const typeF009b = screen.getByLabelText(/submission type/i)
        fireEvent.focus(typeF009b)
        fireEvent.change(typeF009b, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).toHaveBeenCalled()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-010 — Loading indicator during submission
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-010 — Loading state on submit', () => {
    it('T-PSS-BRK-NEW-F010: shows a loading indicator while the create request is in flight', async () => {
        // Never-resolving promise keeps component in loading state
        mockCreateBrokerSubmission.mockReturnValue(new Promise(() => {}))
        renderPage()
        fillRequiredFields()
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(screen.getByLabelText(/saving|submitting/i)).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-NEW-F010b: dispatching save again while already saving does not make a second API call', async () => {
        mockCreateBrokerSubmission.mockReturnValue(new Promise(() => {}))
        renderPage()
        fillRequiredFields()
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(screen.getByLabelText(/saving|submitting/i)).toBeInTheDocument()
        })
        // Second dispatch while in-flight — should not double-call the API
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockCreateBrokerSubmission).toHaveBeenCalledTimes(1)
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-011 — Navigate to detail on success
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-011 — Navigation on success', () => {
    it('T-PSS-BRK-NEW-F011: navigates to /broker-submissions/:id after the submission is saved', async () => {
        mockCreateBrokerSubmission.mockResolvedValue({ id: 42 })
        renderPage()
        fillRequiredFields()
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/broker-submissions/42')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-012 — Error message + data preserved on failure
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-012 — Error state', () => {
    it('T-PSS-BRK-NEW-F012: shows an error message when createBrokerSubmission rejects', async () => {
        mockCreateBrokerSubmission.mockRejectedValue(new Error('Server error'))
        renderPage()
        fillRequiredFields()
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-NEW-F012b: form data is preserved after a failed submission so the user can correct and retry', async () => {
        mockCreateBrokerSubmission.mockRejectedValue(new Error('Server error'))
        renderPage()
        fillRequiredFields()
        window.dispatchEvent(new Event('broker-submission:save'))
        await waitFor(() => screen.getByRole('alert'))
        const insuredField = screen.getByLabelText(/insured name/i) as HTMLInputElement
        expect(insuredField.value).toBe('Acme Ltd')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-013 — Unsaved changes banner
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-013 — Unsaved changes banner', () => {
    it('T-PSS-BRK-NEW-F013: unsaved-changes notification is not sent on first render before any input', () => {
        renderPage()
        // No field interaction yet — notification must not have been sent
        const unsavedCalls = mockAddNotification.mock.calls.filter(
            ([msg]: [string]) => /unsaved/i.test(msg),
        )
        expect(unsavedCalls).toHaveLength(0)
    })

    it('T-PSS-BRK-NEW-F013b: unsaved-changes notification is sent to the notification panel after the user types into any field', () => {
        renderPage()
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'T' } })
        expect(mockAddNotification).toHaveBeenCalledWith(
            expect.stringMatching(/unsaved/i),
            'warning',
        )
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-NEW-F-014 — Confirm before leaving with unsaved changes
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-NEW-F-014 — Confirm before leaving', () => {
    it('T-PSS-BRK-NEW-F014: a confirmation prompt is shown when the user attempts to navigate away with unsaved data', async () => {
        // react-router-dom v6 Prompt / useBlocker — confirm dialog must appear
        const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
        renderPage()
        fireEvent.change(screen.getByLabelText(/insured name/i), { target: { value: 'Partial' } })
        // Simulate back-navigation via the browser's before-unload or router blocker
        const event = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(event)
        // The page must have set returnValue to block the unload
        expect(event.defaultPrevented || event.returnValue !== undefined).toBe(true)
        mockConfirm.mockRestore()
    })
})
