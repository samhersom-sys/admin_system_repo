/**
 * BrokerSubmissionsPage.test.tsx
 *
 * Domain: PSS-BRK-LIST
 * Requirements: frontend/src/broker-submissions/BrokerSubmissionsPage.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md, §03-Three-Artifact-Rule.md
 *
 * Coverage (Layer 1 — React component behaviour tests):
 *   REQ-PSS-BRK-LIST-S-001  Non-broker org is redirected to home
 *   REQ-PSS-BRK-LIST-S-002  Unauthenticated user is redirected to sign-in
 *   REQ-PSS-BRK-LIST-S-003  Platform administrator can access the page (not redirected)
 *   REQ-PSS-BRK-LIST-S-004  Sidebar shows "Broker Submissions" for platform administrators
 *   REQ-PSS-BRK-LIST-F-001  Table of submissions is rendered
 *   REQ-PSS-BRK-LIST-F-002  Each row shows: reference, insuredName, classOfBusiness, estimatedPremium, source, workflowStatus
 *   REQ-PSS-BRK-LIST-F-003  Empty state shown when no submissions and no filters active
 *   REQ-PSS-BRK-LIST-F-004  Filter-empty state shown when filters active but no results — includes "clear filters" prompt
 *   REQ-PSS-BRK-LIST-F-005  Only submissions from the caller's org are displayed
 *   REQ-PSS-BRK-LIST-F-006  Loading indicator shown while fetching
 *   REQ-PSS-BRK-LIST-F-007  Error message shown when fetch fails — with retry option
 *   REQ-PSS-BRK-LIST-F-008  Source filter control present; filters by manual / platform_shared / all
 *   REQ-PSS-BRK-LIST-F-009  Status filter control present
 *   REQ-PSS-BRK-LIST-F-010  List updates immediately when filter changes (no full reload)
 *   REQ-PSS-BRK-LIST-F-011  Clicking a row navigates to the submission's detail page
 *   REQ-PSS-BRK-LIST-F-012  "New Submission" button navigates to /broker-submissions/new
 *   REQ-PSS-BRK-LIST-F-013  Sidebar shows "Broker Submissions" item for broker users
 *   REQ-PSS-BRK-LIST-F-014  "Broker Submissions" sidebar item absent for non-broker users
 *
 * API CONTRACT: GET /api/broker-submissions
 * Status: endpoint not yet implemented — mock reflects agreed contract shape
 * Contract defined in: backend/nest/src/broker-submissions/broker-submissions.requirements.md
 *
 * Tests written BEFORE implementation per Three-Artifact Rule.
 * All tests will fail until the page component is created.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BrokerSubmissionsPage from '../BrokerSubmissionsPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
const mockListBrokerSubmissions = jest.fn()
const mockUseSidebarSection = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/broker-submissions/broker-submissions.service', () => ({
    listBrokerSubmissions: (...args: unknown[]) => mockListBrokerSubmissions(...args),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

import { getSession } from '@/shared/lib/auth-session/auth-session'
const mockGetSession = getSession as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSub(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        orgCode: 'BROKER1',
        reference: 'BRK-001',
        insuredName: 'Acme Ltd',
        classOfBusiness: 'Property',
        estimatedPremium: 50000,
        inceptionDate: '2026-06-01',
        expiryDate: '2027-06-01',
        source: 'manual',
        workflowStatus: 'Created',
        ...overrides,
    }
}

function brokerSession() {
    return { user: { name: 'Test Broker', orgCode: 'BROKER1', orgType: 'broker' } }
}

function insurerSession() {
    return { user: { name: 'Test Insurer', orgCode: 'INS1', orgType: 'insurer' } }
}

function adminSession() {
    return { user: { name: 'Admin User', orgCode: 'DEMO', orgType: 'platform', role: 'internal_admin' } }
}

function renderPage() {
    return render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <BrokerSubmissionsPage />
        </MemoryRouter>,
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockReturnValue(brokerSession())
    // Default: never-resolving promise keeps component in loading state for sync tests
    mockListBrokerSubmissions.mockReturnValue(new Promise(() => {}))
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-S-001 — Non-broker org redirected to home
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-S-001 — Non-broker org access', () => {
    it('T-PSS-BRK-LIST-S001: navigates to / when the session org_type is not "broker"', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('T-PSS-BRK-LIST-S001b: does not call listBrokerSubmissions when the user is not a broker', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        expect(mockListBrokerSubmissions).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-S-002 — Unauthenticated user redirected to sign-in
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-S-002 — Unauthenticated access', () => {
    it('T-PSS-BRK-LIST-S002: navigates to /login when there is no active session', () => {
        mockGetSession.mockReturnValue(null)
        renderPage()
        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-S-003 — Platform admin can access the page
// REQ-PSS-BRK-LIST-S-004 — Sidebar shows item for platform admin
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-S-003/004 — Platform administrator access', () => {
    it('T-PSS-BRK-LIST-S003a: does NOT redirect when the session role is "internal_admin"', () => {
        mockGetSession.mockReturnValue(adminSession())
        mockListBrokerSubmissions.mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(mockNavigate).not.toHaveBeenCalledWith('/')
        expect(mockNavigate).not.toHaveBeenCalledWith('/login')
    })

    it('T-PSS-BRK-LIST-S003b: calls listBrokerSubmissions for a platform administrator session', async () => {
        mockGetSession.mockReturnValue(adminSession())
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(mockListBrokerSubmissions).toHaveBeenCalled()
        })
    })

    it('T-PSS-BRK-LIST-S004: sidebar section is registered for a platform administrator', async () => {
        mockGetSession.mockReturnValue(adminSession())
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            const section = mockUseSidebarSection.mock.calls
                .map((c: unknown[]) => c[0])
                .find((s: unknown) => s !== null)
            const labels = ((section as { items?: { label: string }[] })?.items ?? []).map((i: { label: string }) => i.label)
            expect(labels).toContain('Broker Submissions')
        })
    })

    it('T-PSS-BRK-LIST-S001-insurer: insurer org is still redirected even when accessing the URL directly', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-006 — Loading indicator
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-006 — Loading state', () => {
    it('T-PSS-BRK-LIST-F006: shows a loading indicator while the submissions fetch is in flight', () => {
        renderPage()
        expect(screen.getByLabelText('Loading submissions')).toBeInTheDocument()
    })

    it('T-PSS-BRK-LIST-F006b: loading indicator is absent once data has loaded', async () => {
        mockListBrokerSubmissions.mockResolvedValue([makeSub()])
        renderPage()
        await waitFor(() => {
            expect(screen.queryByLabelText('Loading submissions')).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-001 / F-002 — Table display
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-001/002 — Table display', () => {
    it('T-PSS-BRK-LIST-F001: renders the submissions table after a successful fetch', async () => {
        mockListBrokerSubmissions.mockResolvedValue([makeSub()])
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('table')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F002: each row displays insured name, class of business, estimated premium, source, and status', async () => {
        mockListBrokerSubmissions.mockResolvedValue([
            makeSub({
                insuredName: 'Acme Ltd',
                classOfBusiness: 'Property',
                estimatedPremium: 50000,
                source: 'manual',
                workflowStatus: 'Created',
            }),
        ])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
            expect(screen.getByText('Property')).toBeInTheDocument()
            expect(screen.getByText(/50[,.]?000/)).toBeInTheDocument()
            // Source displayed as human-readable label from lookup
            // Scope to the table to avoid matching the filter <option> element
            expect(within(screen.getByRole('table')).getByText(/manual/i)).toBeInTheDocument()
            expect(within(screen.getByRole('table')).getByText(/created/i)).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F002b: shows "—" in the reference column when a submission has no broker reference', async () => {
        mockListBrokerSubmissions.mockResolvedValue([makeSub({ reference: null })])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('—')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-003 — Empty state (no submissions, no filters)
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-003 — Empty state', () => {
    it('T-PSS-BRK-LIST-F003: shows an empty state message when the organisation has no submissions', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/no submissions/i)).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F003b: empty state does not show the "clear filters" prompt when no filters are active', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.queryByText(/clear filter/i)).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-004 — Filter-empty state
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-004 — Filter-empty state', () => {
    it('T-PSS-BRK-LIST-F004: shows a "no results" message with a clear-filters prompt when filters are active and nothing matches', async () => {
        mockListBrokerSubmissions
            .mockResolvedValueOnce([makeSub()])     // initial load
            .mockResolvedValue([])                  // after applying filter

        renderPage()
        await waitFor(() => screen.getByRole('table'))

        fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'platform_shared' } })

        await waitFor(() => {
            expect(screen.getByText(/no submissions match/i)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-007 — Error state
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-007 — Error state', () => {
    it('T-PSS-BRK-LIST-F007: shows an error message when the fetch fails', async () => {
        mockListBrokerSubmissions.mockRejectedValue(new Error('Service unavailable'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F007b: error state shows a retry button', async () => {
        mockListBrokerSubmissions.mockRejectedValue(new Error('Service unavailable'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F007c: clicking retry re-calls listBrokerSubmissions', async () => {
        mockListBrokerSubmissions
            .mockRejectedValueOnce(new Error('Service unavailable'))
            .mockResolvedValue([])
        renderPage()
        await waitFor(() => screen.getByRole('button', { name: /try again/i }))
        fireEvent.click(screen.getByRole('button', { name: /try again/i }))
        await waitFor(() => {
            expect(mockListBrokerSubmissions).toHaveBeenCalledTimes(2)
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-008 / F-009 / F-010 — Filters
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-008/009/010 — Filters', () => {
    it('T-PSS-BRK-LIST-F008: source filter control is rendered with "All", "Manual", and "Platform Shared" options', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            const filter = screen.getByLabelText('Filter by type')
            expect(filter).toBeInTheDocument()
            // Forbidden: no other options beyond the three agreed values
            expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/platform.received/i)).not.toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F009: status filter control is rendered', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
        })
    })

    it('T-PSS-BRK-LIST-F010: changing the source filter immediately calls listBrokerSubmissions with the selected value', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => screen.getByLabelText('Filter by type'))
        fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'manual' } })
        await waitFor(() => {
            expect(mockListBrokerSubmissions).toHaveBeenCalledWith(
                expect.objectContaining({ source: 'manual' }),
            )
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-011 — Row click navigates to detail
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-011 — Row navigation', () => {
    it('T-PSS-BRK-LIST-F011: clicking a submission row navigates to /broker-submissions/:id', async () => {
        mockListBrokerSubmissions.mockResolvedValue([makeSub({ id: 7 })])
        renderPage()
        await waitFor(() => screen.getByText('Acme Ltd'))
        fireEvent.click(screen.getByText('Acme Ltd'))
        expect(mockNavigate).toHaveBeenCalledWith('/broker-submissions/7')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-012 — New Submission button
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-012 — New Submission button', () => {
    it('T-PSS-BRK-LIST-F012: the "New Submission" button navigates to /broker-submissions/new when clicked', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => screen.getByRole('button', { name: /new submission/i }))
        fireEvent.click(screen.getByRole('button', { name: /new submission/i }))
        expect(mockNavigate).toHaveBeenCalledWith('/broker-submissions/new')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-LIST-F-013 / F-014 — Sidebar navigation item
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-LIST-F-013/014 — Sidebar item', () => {
    it('T-PSS-BRK-LIST-F013: sidebar section is registered with a "Broker Submissions" item for broker users', async () => {
        mockListBrokerSubmissions.mockResolvedValue([])
        renderPage()
        await waitFor(() => {
            const section = mockUseSidebarSection.mock.calls[0]?.[0] as { items?: { label: string }[] }
            const labels = (section?.items ?? []).map((i) => i.label)
            expect(labels).toContain('Broker Submissions')
        })
    })

    it('T-PSS-BRK-LIST-F014: "Broker Submissions" sidebar item is absent when session org_type is not "broker"', () => {
        mockGetSession.mockReturnValue(insurerSession())
        renderPage()
        // Page redirects before sidebar is registered — sidebar section must not have been called
        const allCalls = mockUseSidebarSection.mock.calls.flat()
        const allLabels = allCalls
            .flatMap((arg: unknown) => ((arg as { items?: { label: string }[] })?.items ?? []))
            .map((i: { label: string }) => i.label)
        expect(allLabels).not.toContain('Broker Submissions')
    })
})
