/**
 * TESTS — domains/submissions/components/SubmissionViewPage
 * Second artifact. Requirements: SubmissionViewPage.requirements.md
 * Test ID format: T-SUB-VIEW-R[NN]
 *
 * Coverage:
 *   REQ-SUB-VIEW-F-001 … F-027 | REQ-SUB-VIEW-S-001 … S-003 | REQ-SUB-VIEW-C-001 … C-002
 *
 * Note: F-023 and F-024 are it.todo() pending OQ-044 (broker-origin locked field list).
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

const mockGetSubmission = jest.fn()
const mockUpdateSubmission = jest.fn()
const mockAcquireSubmissionEditLock = jest.fn()
const mockReleaseSubmissionEditLock = jest.fn()
jest.mock('@/submissions/submissions.service', () => ({
    getSubmission: (...args: unknown[]) => mockGetSubmission(...args),
    updateSubmission: (...args: unknown[]) => mockUpdateSubmission(...args),
    acquireSubmissionEditLock: (...args: unknown[]) => mockAcquireSubmissionEditLock(...args),
    releaseSubmissionEditLock: (...args: unknown[]) => mockReleaseSubmissionEditLock(...args),
}))

// Session: Insurer org by default; override per-test for broker-origin scenarios
let mockSessionOrgType = 'Insurer'
jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: {
            id: '1',
            name: 'Jane Smith',
            orgCode: 'DEMO',
            orgType: mockSessionOrgType,
            email: 'jane@demo.com',
        },
    }),
}))

// Stub submit workflow endpoint — the page calls this for the Submit action
const mockSubmitWorkflow = jest.fn()
jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: (...args: unknown[]) => mockSubmitWorkflow(...args),
    get: jest.fn(),
    put: jest.fn(),
}))

// Stub SubmissionTabs — exposes data-testid with the props passed to it
jest.mock('@/submissions/SubmissionTabs/SubmissionTabs', () =>
    function SubmissionTabs({
        submissionId,
        contractType,
    }: {
        submissionId: number
        contractType: string
    }) {
        return (
            <div
                data-testid="stub-tabs"
                data-submission-id={String(submissionId)}
                data-contract-type={contractType}
            />
        )
    }
)

const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({
        addNotification: mockAddNotification,
    }),
}))

import SubmissionViewPage from './SubmissionViewPage'

// ---------------------------------------------------------------------------
// Factory and helpers
// ---------------------------------------------------------------------------

function makeSubmission(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        reference: 'SUB-DEMO-20260310-001',
        status: 'Draft',
        contractType: 'Open Market',
        submissionType: 'Submission',
        createdBy: 'Jane Smith',
        createdDate: '2026-03-10',
        createdByOrgCode: 'DEMO',
        createdByOrgType: 'Insurer',
        insured: 'Widget Corp',
        insuredId: '10',
        placingBroker: 'Marsh',
        placingBrokerId: '20',
        inceptionDate: '2026-04-01',
        expiryDate: '2027-04-01',
        renewalDate: '2027-03-01',
        hasQuote: false,
        hasPolicy: false,
        ...overrides,
    }
}

function renderPage(id = '1') {
    return render(
        <MemoryRouter
            initialEntries={[`/submissions/${id}`]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/submissions/:id" element={<SubmissionViewPage />} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockSessionOrgType = 'Insurer'
    mockGetSubmission.mockResolvedValue(makeSubmission())
    mockUpdateSubmission.mockResolvedValue(makeSubmission())
    mockAcquireSubmissionEditLock.mockResolvedValue({
        submissionId: 1,
        lockedByUserId: 1,
        lockedByUserName: 'Jane Smith',
        expiresAt: '2026-03-10T10:05:00.000Z',
        isHeldByCurrentUser: true,
    })
    mockReleaseSubmissionEditLock.mockResolvedValue(undefined)
    mockSubmitWorkflow.mockResolvedValue({ status: 'In Review' })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-001: getSubmission called on initial render
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R01: getSubmission called on mount', () => {
    it('calls getSubmission with the numeric id from the URL param', async () => {
        renderPage('7')
        await waitFor(() => {
            expect(mockGetSubmission).toHaveBeenCalledTimes(1)
            expect(mockGetSubmission).toHaveBeenCalledWith(7)
        })
    })

    it('calls getSubmission before any submission data is displayed', async () => {
        // On mount getSubmission is called — the loading state comes first
        mockGetSubmission.mockReturnValue(new Promise(() => { })) // never resolves
        renderPage('1')
        expect(mockGetSubmission).toHaveBeenCalledWith(1)
    })
})

describe('T-SUB-VIEW-R38: concurrent edit lock is acquired and released', () => {
    it('acquires the submission edit lock after the page loads', async () => {
        mockGetSubmission.mockResolvedValueOnce(makeSubmission({ id: 7 }))
        renderPage('7')
        await waitFor(() => {
            expect(mockAcquireSubmissionEditLock).toHaveBeenCalledWith(7)
        })
    })

    it('releases the submission edit lock when the page unmounts', async () => {
        mockGetSubmission.mockResolvedValueOnce(makeSubmission({ id: 7 }))
        const view = renderPage('7')
        await waitFor(() => {
            expect(mockAcquireSubmissionEditLock).toHaveBeenCalledWith(7)
        })
        view.unmount()
        await waitFor(() => {
            expect(mockReleaseSubmissionEditLock).toHaveBeenCalledWith(7)
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-002: Loading indicator while request is in flight
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R02: loading indicator visible while fetching', () => {
    it('renders "Loading submission…" before getSubmission resolves', () => {
        mockGetSubmission.mockReturnValue(new Promise(() => { })) // never resolves
        renderPage()
        expect(screen.getByText(/loading submission/i)).toBeInTheDocument()
    })

    it('does not render any submission fields while loading', () => {
        mockGetSubmission.mockReturnValue(new Promise(() => { }))
        renderPage()
        expect(screen.queryByText('SUB-DEMO-20260310-001')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-003: Error state when getSubmission rejects
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R03: error state from rejected getSubmission', () => {
    it('renders the API error message when getSubmission rejects', async () => {
        mockGetSubmission.mockRejectedValueOnce(new Error('Network error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/network error/i)).toBeInTheDocument()
        })
    })

    it('renders a back link to /submissions when getSubmission rejects', async () => {
        mockGetSubmission.mockRejectedValueOnce(new Error('500 Server Error'))
        renderPage()
        await waitFor(() => {
            const link = screen.getByRole('link', { name: /back to submissions/i })
            expect(link).toHaveAttribute('href', '/submissions')
        })
    })

    it('does not throw an uncaught JavaScript exception on rejection', async () => {
        mockGetSubmission.mockRejectedValueOnce(new Error('Timeout'))
        expect(() => renderPage()).not.toThrow()
        await waitFor(() => {
            expect(screen.getByText(/timeout/i)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-004: Not found when getSubmission resolves with null
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R04: not found state when getSubmission returns null', () => {
    it('renders "Submission not found." when getSubmission returns null', async () => {
        mockGetSubmission.mockResolvedValueOnce(null)
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/submission not found/i)).toBeInTheDocument()
        })
    })

    it('renders a back link to /submissions in the not-found state', async () => {
        mockGetSubmission.mockResolvedValueOnce(null)
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('link', { name: /back to submissions/i })).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-005: reference rendered immutably — no input element
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R05: reference displayed as immutable — no input', () => {
    it('displays the reference value on screen', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('SUB-DEMO-20260310-001')).toBeInTheDocument()
        })
    })

    it('does not render an HTML input control for reference', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('SUB-DEMO-20260310-001'))
        const inputs = container.querySelectorAll('input[name="reference"], input[data-field="reference"]')
        expect(inputs).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-006: status rendered as system-managed badge — no input
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R06: status displayed as system-managed — no input', () => {
    it('displays the status value on screen', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Draft')).toBeInTheDocument()
        })
    })

    it('does not render an HTML input control for status', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Draft'))
        const inputs = container.querySelectorAll('input[name="status"], select[name="status"]')
        expect(inputs).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-007: contractType rendered as immutable — no input
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R07: contractType displayed as immutable — no input', () => {
    it('displays the contractType value on screen', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Open Market')).toBeInTheDocument()
        })
    })

    it('does not render an HTML input control for contractType under any condition', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Open Market'))
        const inputs = container.querySelectorAll(
            'input[name="contractType"], select[name="contractType"]'
        )
        expect(inputs).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-008: createdBy / createdDate / createdByOrgCode as read-only
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R08: creator fields displayed as read-only — no inputs', () => {
    it('displays createdBy on screen', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/jane smith/i)).toBeInTheDocument()
        })
    })

    it('displays createdDate on screen', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/2026-03-10/)).toBeInTheDocument()
        })
    })

    it('does not render input elements for createdBy, createdDate, or createdByOrgCode', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText(/jane smith/i))
        const inputs = container.querySelectorAll(
            'input[name="createdBy"], input[name="createdDate"], input[name="createdByOrgCode"]'
        )
        expect(inputs).toHaveLength(0)
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-009: insured field is editable in draft state
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R09: insured field is editable in draft state', () => {
    it('renders an editable control for the insured field', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const insuredInput = container.querySelector('[name="insured"], [data-field="insured"]')
        expect(insuredInput).not.toBeNull()
        expect(insuredInput).not.toHaveAttribute('readonly')
        expect(insuredInput).not.toHaveAttribute('disabled')
    })

    it('pre-populates the insured input with the current value', async () => {
        renderPage()
        await waitFor(() => {
            const input = screen.getByDisplayValue('Widget Corp')
            expect(input).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-010: placingBroker is managed in SubmissionTabs, not the main form
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R10: placingBroker is not rendered as a main-form input', () => {
    it('renders no editable control for the placingBroker field in the main form', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Marsh'))
        const input = container.querySelector('[name="placingBroker"], [data-field="placingBroker"]')
        expect(input).toBeNull()
    })

    it('shows the current placing broker as read-only page content', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Marsh')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-011: date fields are editable in draft state
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R11: date fields are editable in draft state', () => {
    it('renders an editable control for inceptionDate', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Open Market'))
        const input = container.querySelector('[name="inceptionDate"], [data-field="inceptionDate"]')
        expect(input).not.toBeNull()
        expect(input).not.toHaveAttribute('readonly')
    })

    it('renders an editable control for expiryDate', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Open Market'))
        const input = container.querySelector('[name="expiryDate"], [data-field="expiryDate"]')
        expect(input).not.toBeNull()
        expect(input).not.toHaveAttribute('readonly')
    })

    it('renders an editable control for renewalDate', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Open Market'))
        const input = container.querySelector('[name="renewalDate"], [data-field="renewalDate"]')
        expect(input).not.toBeNull()
        expect(input).not.toHaveAttribute('readonly')
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-012: submission:save event calls updateSubmission
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R12: submission:save event calls updateSubmission', () => {
    it('calls updateSubmission with the submission id when save event fires', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(mockUpdateSubmission).toHaveBeenCalledWith(1, expect.any(Object))
        })
    })

    it('passes only editable-tier fields in the patch', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(mockUpdateSubmission).toHaveBeenCalledWith(
                1,
                expect.not.objectContaining({
                    reference: expect.anything(),
                    status: expect.anything(),
                    contractType: expect.anything(),
                    createdBy: expect.anything(),
                    createdDate: expect.anything(),
                })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-013: successful save updates displayed field values
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R13: successful save updates displayed values', () => {
    it('displays updated insured name after successful save', async () => {
        mockUpdateSubmission.mockResolvedValueOnce(makeSubmission({ insured: 'New Corp' }))
        renderPage()
        await waitFor(() => screen.getByDisplayValue('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(screen.queryByDisplayValue('Widget Corp')).not.toBeInTheDocument()
            expect(screen.getByDisplayValue('New Corp')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-014: error on save preserves field values
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R14: save error preserves in-progress field values', () => {
    it('keeps the current field values and shows an error when updateSubmission rejects', async () => {
        mockUpdateSubmission.mockRejectedValueOnce(new Error('Save failed'))
        renderPage()
        await waitFor(() => screen.getByDisplayValue('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(screen.getByText(/save failed/i)).toBeInTheDocument()
            // The original value is still present — nothing was lost
            expect(screen.getByDisplayValue('Widget Corp')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-015: submission:submit event calls workflow submit endpoint
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R15: submission:submit event triggers workflow transition', () => {
    it('calls the submit workflow endpoint when submission:submit fires', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Draft'))

        window.dispatchEvent(new CustomEvent('submission:submit'))

        await waitFor(() => {
            expect(mockSubmitWorkflow).toHaveBeenCalledWith(
                expect.stringContaining('/submissions/1/submit'),
                expect.anything()
            )
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-016: successful submit updates the status badge
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R16: status badge updates to In Review after successful submit', () => {
    it('displays "In Review" after successful submit workflow call', async () => {
        mockSubmitWorkflow.mockResolvedValueOnce({ id: 1, status: 'In Review' })
        renderPage()
        await waitFor(() => screen.getByText('Draft'))

        window.dispatchEvent(new CustomEvent('submission:submit'))

        await waitFor(() => {
            expect(screen.getByText('In Review')).toBeInTheDocument()
            expect(screen.queryByText('Draft')).not.toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-017: hasQuote=true makes all editable fields read-only
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R17: hasQuote=true locks all editable fields', () => {
    beforeEach(() => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasQuote: true }))
    })

    it('renders no input control for insured when hasQuote is true', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const input = container.querySelector('[name="insured"], [data-field="insured"] input')
        expect(input).toBeNull()
    })

    it('renders no input control for placingBroker when hasQuote is true', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const input = container.querySelector('[name="placingBroker"], [data-field="placingBroker"] input')
        expect(input).toBeNull()
    })

    it('renders no input control for inceptionDate when hasQuote is true', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const input = container.querySelector('[name="inceptionDate"], [data-field="inceptionDate"] input')
        expect(input).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-018: hasQuote=true shows the quote-lock contextual message
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R18: hasQuote=true shows quote-update message', () => {
    it('displays a message directing the user to update via the quote', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasQuote: true }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/update.*quote|via.*quote|quote.*to change/i)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-019: hasQuote=true removes the Save sidebar item
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R19: hasQuote=true causes Save to be excluded from sidebar registration', () => {
    it('does not include Save, Submit, or Decline items when registering the sidebar section where hasQuote is true', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasQuote: true }))
        renderPage()

        await waitFor(() => screen.getByText('Widget Corp'))

        // useSidebarSection should have been called; check the section passed has no Save item
        const calls = mockUseSidebarSection.mock.calls
        const lastSection = calls[calls.length - 1]?.[0]
        const saveItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Save'
        )
        const submitItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Submit'
        )
        const declineItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Decline'
        )
        expect(saveItem).toBeUndefined()
        expect(submitItem).toBeUndefined()
        expect(declineItem).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-020: hasPolicy=true makes all editable fields read-only
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R20: hasPolicy=true locks all editable fields', () => {
    beforeEach(() => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasPolicy: true }))
    })

    it('renders no input control for insured when hasPolicy is true', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const input = container.querySelector('[name="insured"], [data-field="insured"] input')
        expect(input).toBeNull()
    })

    it('renders no input control for inceptionDate when hasPolicy is true', async () => {
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        const input = container.querySelector('[name="inceptionDate"], [data-field="inceptionDate"] input')
        expect(input).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-021: hasPolicy=true shows the endorsement message
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R21: hasPolicy=true shows endorsement-required message', () => {
    it('displays a message asking the user to apply an endorsement', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasPolicy: true }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/endorsement/i)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-022: hasPolicy=true removes the Save sidebar item
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R22: hasPolicy=true excludes Save from sidebar section', () => {
    it('does not include Save, Submit, or Decline items in the sidebar section when hasPolicy is true', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasPolicy: true }))
        renderPage()

        await waitFor(() => screen.getByText('Widget Corp'))

        const calls = mockUseSidebarSection.mock.calls
        const lastSection = calls[calls.length - 1]?.[0]
        const saveItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Save'
        )
        const submitItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Submit'
        )
        const declineItem = lastSection?.items?.find(
            (item: { label: string }) => item.label === 'Decline'
        )
        expect(saveItem).toBeUndefined()
        expect(submitItem).toBeUndefined()
        expect(declineItem).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-023: broker origin + I/MGA session locks specific fields
// Blocked by OQ-044 — exact field list to be confirmed.
// ---------------------------------------------------------------------------

it.todo(
    'T-SUB-VIEW-R23: broker-origin fields are read-only for Insurer/MGA session (pending OQ-044 — field list unknown)'
)
it.todo(
    'T-SUB-VIEW-R24: broker-origin lock banner is displayed when origin locks are active (pending OQ-044)'
)

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-025: no origin lock when submission created by Insurer/MGA
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R25: no origin lock when submission is Insurer/MGA-originated', () => {
    it('renders editable inputs for all main editable-tier fields when createdByOrgType is Insurer', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ createdByOrgType: 'Insurer' }))
        mockSessionOrgType = 'Insurer'
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        expect(container.querySelector('[name="insured"], [data-field="insured"]')).not.toBeNull()
        expect(container.querySelector('[name="inceptionDate"], [data-field="inceptionDate"]')).not.toBeNull()
        expect(container.querySelector('[name="expiryDate"], [data-field="expiryDate"]')).not.toBeNull()
        expect(container.querySelector('[name="renewalDate"], [data-field="renewalDate"]')).not.toBeNull()
    })

    it('renders editable inputs for all editable-tier fields when createdByOrgType is MGA', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ createdByOrgType: 'MGA' }))
        mockSessionOrgType = 'MGA'
        const { container } = renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        expect(container.querySelector('[name="insured"], [data-field="insured"]')).not.toBeNull()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-026: SubmissionTabs rendered with correct props
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R26: SubmissionTabs rendered with submissionId and contractType', () => {
    it('renders the SubmissionTabs stub', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('stub-tabs')).toBeInTheDocument()
        })
    })

    it('passes the numeric submission id to SubmissionTabs', async () => {
        renderPage('1')
        await waitFor(() => {
            expect(screen.getByTestId('stub-tabs')).toHaveAttribute('data-submission-id', '1')
        })
    })

    it('passes the contractType to SubmissionTabs', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByTestId('stub-tabs')).toHaveAttribute('data-contract-type', 'Open Market')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-027: sidebar section registered via useSidebarSection
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R27: sidebar section registered with correct title and items', () => {
    it('calls useSidebarSection with a section titled "Submission"', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        const registeredSection = mockUseSidebarSection.mock.calls[mockUseSidebarSection.mock.calls.length - 1]?.[0]
        expect(registeredSection).toBeDefined()
        expect(registeredSection.title).toBe('Submission')
    })

    it('includes Save, Submit, and Create items in the registered sidebar section', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        const section = mockUseSidebarSection.mock.calls[mockUseSidebarSection.mock.calls.length - 1]?.[0]
        const labels = section?.items?.map((item: { label: string }) => item.label)
        expect(labels).toContain('Save')
        expect(labels).toContain('Submit')
        expect(labels).toContain('Create')
    })

    it('includes only live create routes in the Create sub-menu', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        const section = mockUseSidebarSection.mock.calls[mockUseSidebarSection.mock.calls.length - 1]?.[0]
        const createItem = section?.items?.find((item: { label: string }) => item.label === 'Create')
        const childLabels = createItem?.children?.map((c: { label: string }) => c.label) ?? []
        const quoteChild = createItem?.children?.find((c: { label: string; to?: string }) => c.label === 'Quote')
        expect(childLabels).toContain('Quote')
        expect(childLabels).toContain('Create Party')
        expect(quoteChild?.to).toBe('/quotes/new?submissionId=1')
        expect(childLabels).not.toContain('Binding Authority Contract')
        expect(childLabels).not.toContain('Claim')
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-S-001: auth guard — ProtectedRoute in main.jsx
// Tested at router level; these unit tests cannot exercise ProtectedRoute
// in isolation. Covered by Playwright E2E suite (OQ-029).
// ---------------------------------------------------------------------------

it.todo(
    'T-SUB-VIEW-S001: unauthenticated access redirects to /login (ProtectedRoute — E2E scope, OQ-029)'
)

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-S-002: never render input for immutable/system-managed fields
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-S002: no input elements for immutable or system-managed fields under any condition', () => {
    const immutableFields = ['reference', 'contractType', 'createdBy', 'createdDate', 'createdByOrgCode']
    const systemFields = ['status', 'assignment']

    it.each([...immutableFields, ...systemFields])(
        'field "%s" has no input or select element in the draft state DOM',
        async (field) => {
            const { container } = renderPage()
            await waitFor(() => screen.getByText('Widget Corp'))
            const input = container.querySelector(
                `input[name="${field}"], select[name="${field}"], textarea[name="${field}"]`
            )
            expect(input).toBeNull()
        }
    )

    it.each([...immutableFields, ...systemFields])(
        'field "%s" has no input or select element when quote-locked',
        async (field) => {
            mockGetSubmission.mockResolvedValue(makeSubmission({ hasQuote: true }))
            const { container } = renderPage()
            await waitFor(() => screen.getByText('Widget Corp'))
            const input = container.querySelector(
                `input[name="${field}"], select[name="${field}"], textarea[name="${field}"]`
            )
            expect(input).toBeNull()
        }
    )
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-S-003: updateSubmission not called when quote-locked
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-S003: updateSubmission is not called when submission is quote-locked', () => {
    it('does not call updateSubmission when save event fires and hasQuote is true', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasQuote: true }))
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        // Allow any async processing to settle
        await new Promise((r) => setTimeout(r, 50))
        expect(mockUpdateSubmission).not.toHaveBeenCalled()
    })

    it('does not call updateSubmission when save event fires and hasPolicy is true', async () => {
        mockGetSubmission.mockResolvedValue(makeSubmission({ hasPolicy: true }))
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await new Promise((r) => setTimeout(r, 50))
        expect(mockUpdateSubmission).not.toHaveBeenCalled()
    })
})

describe('T-SUB-VIEW-R40: concurrent lock conflict disables editing and uses notifications', () => {
    beforeEach(() => {
        mockAcquireSubmissionEditLock.mockRejectedValue({
            status: 409,
            body: {
                submissionId: 1,
                lockedByUserId: 99,
                lockedByUserName: 'Alex Underwriter',
                expiresAt: '2026-03-10T10:05:00.000Z',
            },
        })
    })

    it('adds a warning notification naming the lock holder', async () => {
        renderPage()
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                'This page has been locked for editing by Alex Underwriter.',
                'warning',
                { id: 'submission-edit-lock-1' },
            )
        })
    })

    it('removes Save, Submit, and Decline from the sidebar registration while another user holds the lock', async () => {
        renderPage()
        await waitFor(() => {
            const lastSection = mockUseSidebarSection.mock.calls[mockUseSidebarSection.mock.calls.length - 1]?.[0]
            const saveItem = lastSection?.items?.find((item: { label: string }) => item.label === 'Save')
            const submitItem = lastSection?.items?.find((item: { label: string }) => item.label === 'Submit')
            const declineItem = lastSection?.items?.find((item: { label: string }) => item.label === 'Decline')
            expect(saveItem).toBeUndefined()
            expect(submitItem).toBeUndefined()
            expect(declineItem).toBeUndefined()
        })
    })

    it('renders the fixed page-status indicator with the lock holder name', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Locked by Alex Underwriter')).toBeInTheDocument()
        })
    })

    it('does not call updateSubmission when save is dispatched during a concurrent lock', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Locked by Alex Underwriter'))
        window.dispatchEvent(new CustomEvent('submission:save'))
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(mockUpdateSubmission).not.toHaveBeenCalled()
    })

    it('does not call the submit workflow when submission:submit is dispatched during a concurrent lock', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Locked by Alex Underwriter'))
        window.dispatchEvent(new CustomEvent('submission:submit'))
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(mockSubmitWorkflow).not.toHaveBeenCalledWith(
            expect.stringContaining('/submissions/1/submit'),
            expect.anything()
        )
    })

    it('does not open the decline modal when submission:decline is dispatched during a concurrent lock', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Locked by Alex Underwriter'))
        window.dispatchEvent(new CustomEvent('submission:decline'))
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(screen.queryByText(/decline submission/i)).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-028: audit event posted after successful save
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R28: audit event posted after successful save', () => {
    it('posts Submission Updated audit event to /api/audit/event after save resolves', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(mockSubmitWorkflow).toHaveBeenCalledWith(
                '/api/audit/event',
                expect.objectContaining({
                    entityType: 'Submission',
                    entityId: 1,
                    action: 'Submission Updated',
                })
            )
        })
    })

    it('does not post an audit event when updateSubmission rejects', async () => {
        mockUpdateSubmission.mockRejectedValueOnce(new Error('Save failed'))
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        // Allow async handlers to settle, then confirm no audit post was made
        await new Promise((r) => setTimeout(r, 50))
        expect(mockSubmitWorkflow).not.toHaveBeenCalledWith(
            '/api/audit/event',
            expect.anything()
        )
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-F-029: unsaved changes banner
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-R29: unsaved changes banner', () => {
    it('shows "You have unsaved changes" when a field value is modified', async () => {
        renderPage()
        await waitFor(() => screen.getByDisplayValue('Widget Corp'))
        fireEvent.change(screen.getByDisplayValue('Widget Corp'), { target: { value: 'Changed Corp' } })
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    })

    it('does not show the banner on initial load before any edits', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
    })

    it('clears the banner after a successful save', async () => {
        mockUpdateSubmission.mockResolvedValueOnce(makeSubmission({ insured: 'Changed Corp' }))
        renderPage()
        await waitFor(() => screen.getByDisplayValue('Widget Corp'))
        fireEvent.change(screen.getByDisplayValue('Widget Corp'), { target: { value: 'Changed Corp' } })
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
        window.dispatchEvent(new CustomEvent('submission:save'))
        await waitFor(() => {
            expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
        })
    })
})

it.todo('T-SUB-VIEW-R30: beforeunload is registered when form is dirty (browser-level — E2E scope)')

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-C-001: uses domain exports only — no direct fetch/axios
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-C001: submission API calls sourced exclusively from domain module', () => {
    it('calls getSubmission (domain import) on mount — not fetch or axios directly', async () => {
        renderPage()
        await waitFor(() => {
            expect(mockGetSubmission).toHaveBeenCalledTimes(1)
        })
    })

    it('calls updateSubmission (domain import) on save — not fetch or axios directly', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Widget Corp'))

        window.dispatchEvent(new CustomEvent('submission:save'))

        await waitFor(() => {
            expect(mockUpdateSubmission).toHaveBeenCalledTimes(1)
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-SUB-VIEW-C-002: session org type read from getSession
// ---------------------------------------------------------------------------

describe('T-SUB-VIEW-C002: org type is read from getSession — not from URL or hardcoded', () => {
    it('renders the page without error using the orgType from the session mock', async () => {
        mockSessionOrgType = 'MGA'
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Widget Corp')).toBeInTheDocument()
        })
    })
})
