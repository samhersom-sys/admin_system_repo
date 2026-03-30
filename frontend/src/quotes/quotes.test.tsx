/**
 * TESTS — domains/quotes/components
 *
 * Requirements: quotes.requirements.md
 * Test ID format: T-quotes-{list|new|view}-R[NN]
 *
 * Coverage:
 *   REQ-QUO-FE-F-001 — F-022
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

const mockListQuotes = jest.fn()
const mockCreateQuote = jest.fn()
const mockGetQuote = jest.fn()
const mockUpdateQuote = jest.fn()
const mockMarkQuoteAsQuoted = jest.fn()
const mockBindQuote = jest.fn()
const mockDeclineQuote = jest.fn()
const mockCopyQuote = jest.fn()
const mockGetContractTypes = jest.fn()
const mockGetMethodsOfPlacement = jest.fn()
const mockGetRenewalStatuses = jest.fn()
const mockListSections = jest.fn()
const mockGetSubmission = jest.fn()
const mockUpdateSection = jest.fn()
const mockListCoverages = jest.fn()
const mockCreateCoverage = jest.fn()
const mockDeleteCoverage = jest.fn()
const mockListParticipations = jest.fn()
const mockSaveParticipations = jest.fn()

jest.mock('@/quotes/quotes.service', () => ({
    ...jest.requireActual('@/quotes/quotes.service'),
    listQuotes: (...args: unknown[]) => mockListQuotes(...args),
    createQuote: (...args: unknown[]) => mockCreateQuote(...args),
    getQuote: (...args: unknown[]) => mockGetQuote(...args),
    updateQuote: (...args: unknown[]) => mockUpdateQuote(...args),
    markQuoteAsQuoted: (...args: unknown[]) => mockMarkQuoteAsQuoted(...args),
    bindQuote: (...args: unknown[]) => mockBindQuote(...args),
    declineQuote: (...args: unknown[]) => mockDeclineQuote(...args),
    copyQuote: (...args: unknown[]) => mockCopyQuote(...args),
    listSections: (...args: unknown[]) => mockListSections(...args),
    createSection: jest.fn().mockResolvedValue({ id: 99, reference: 'QUO-DEMO-20260601-001-S01' }),
    deleteSection: jest.fn().mockResolvedValue(undefined),
    updateSection: (...args: unknown[]) => mockUpdateSection(...args),
    listCoverages: (...args: unknown[]) => mockListCoverages(...args),
    createCoverage: (...args: unknown[]) => mockCreateCoverage(...args),
    deleteCoverage: (...args: unknown[]) => mockDeleteCoverage(...args),
    listParticipations: (...args: unknown[]) => mockListParticipations(...args),
    saveParticipations: (...args: unknown[]) => mockSaveParticipations(...args),
    getContractTypes: () => mockGetContractTypes(),
    getMethodsOfPlacement: () => mockGetMethodsOfPlacement(),
    getRenewalStatuses: () => mockGetRenewalStatuses(),
}))

jest.mock('@/submissions/submissions.service', () => ({
    getSubmission: (...args: unknown[]) => mockGetSubmission(...args),
    listSubmissions: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

/*
 * API CONTRACT
 * Endpoints exercised by quotes service functions:
 *   POST   /api/quotes                  — createQuote
 *   GET    /api/quotes/:id              — getQuote
 *   PUT    /api/quotes/:id              — updateQuote
 *   POST   /api/quotes/:id/bind        — bindQuote
 *   POST   /api/quotes/:id/copy        — copyQuote
 *   GET    /api/quotes/:id/sections    — listSections
 * Verification: api-client is stubbed; service responses are provided via
 * named mock functions. Backend contract is covered by backend integration tests.
 * Response shape: see quotes.service.ts and makeQuote() factory above.
 */
const mockPost = jest.fn()
jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: (...args: unknown[]) => mockPost(...args),
    get: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
}))

jest.mock('@/parties/InsuredSearch/InsuredSearch', () =>
    function InsuredSearch({ onSelect }: { onSelect: (p: { id: string; name: string }) => void }) {
        return (
            <button
                data-testid="insured-search"
                onClick={() => onSelect({ id: 'party-1', name: 'Widget Corp' })}
            >
                Select Insured
            </button>
        )
    }
)

jest.mock('@/parties/BrokerSearch/BrokerSearch', () =>
    function BrokerSearchMock({ onSelect, placeholder }: { onSelect: (p: { id: string; name: string; type: string; orgCode: string }) => void; placeholder?: string }) {
        const label = placeholder ?? 'Select Broker'
        return (
            <button
                data-testid={`broker-search-${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onSelect({ id: 'broker-1', name: 'Acme Brokers Ltd', type: 'Broker', orgCode: 'ACME' })}
            >
                {label}
            </button>
        )
    }
)

const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

const mockAddNotification = jest.fn()
const mockRemoveNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification, removeNotification: mockRemoveNotification }),
}))

jest.mock('@/submissions/SubmissionSearch/SubmissionSearch', () =>
    function SubmissionSearchMock({ onSelect }: { onSelect: (s: { id: number; reference: string; insured: string; insuredId: string; createdByOrgCode: string }) => void }) {
        return (
            <button
                data-testid="submission-search-trigger"
                onClick={() => onSelect({ id: 10, reference: 'SUB-DEMO-20260601-001', insured: 'Widget Corp', insuredId: 'party-1', createdByOrgCode: 'DEMO' })}
            >
                Search Submission
            </button>
        )
    }
)

// ---------------------------------------------------------------------------
// Block 3 mocks — useAudit + AuditTable
// ---------------------------------------------------------------------------

const mockGetAudit = jest.fn()
const mockUseAuditFn = jest.fn(() => ({
    audit: [],
    loading: false,
    error: null,
    getAudit: mockGetAudit,
}))

jest.mock('@/shared/lib/hooks/useAudit', () => ({
    useAudit: (...args: unknown[]) => mockUseAuditFn(...args),
}))

jest.mock('@/shared/components/AuditTable/AuditTable', () =>
    function AuditTableMock({ audit }: { audit: unknown[] }) {
        return <div data-testid="audit-table">Audit rows: {audit.length}</div>
    }
)

import QuotesListPage from './QuotesListPage/QuotesListPage'
import NewQuotePage from './NewQuotePage/NewQuotePage'
import QuoteViewPage from './QuoteViewPage/QuoteViewPage'
import QuoteSectionViewPage from './QuoteSectionViewPage/QuoteSectionViewPage'

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeQuote(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        reference: 'QUO-DEMO-20260601-001',
        submission_id: 10,
        insured: 'Widget Corp',
        insured_id: 'party-1',
        status: 'Draft',
        business_type: 'Insurance',
        inception_date: '2026-06-01',
        expiry_date: '2027-06-01',
        inception_time: '00:00:00',
        expiry_time: '23:59:59',
        quote_currency: 'USD',
        created_date: '2026-06-01T12:00:00Z',
        created_by: 'Jane Smith',
        created_by_org_code: 'DEMO',
        // Block 2 fields
        year_of_account: '',
        lta_applicable: false,
        lta_start_date: null,
        lta_start_time: '00:00:00',
        lta_expiry_date: null,
        lta_expiry_time: '23:59:59',
        contract_type: null,
        method_of_placement: null,
        unique_market_reference: null,
        renewable_indicator: 'No',
        renewal_date: null,
        renewal_status: null,
        payload: {},
        ...overrides,
    }
}

function makeSection(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        quote_id: 1,
        reference: 'QUO-DEMO-20260601-001-S01',
        class_of_business: 'Property',
        inception_date: '2026-06-01',
        expiry_date: '2027-06-01',
        inception_time: '00:00:00',
        expiry_time: '23:59:59',
        limit_currency: 'USD',
        limit_amount: 1000000,
        limit_loss_qualifier: null,
        excess_currency: null,
        excess_amount: null,
        excess_loss_qualifier: null,
        sum_insured_currency: null,
        sum_insured_amount: null,
        premium_currency: 'USD',
        gross_premium: 50000,
        gross_gross_premium: null,
        deductions: null,
        net_premium: null,
        annual_gross_premium: null,
        annual_net_premium: null,
        written_order: null,
        signed_order: null,
        payload: {},
        is_current: true,
        created_at: '2026-06-01T12:00:00Z',
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// QuotesListPage
// ---------------------------------------------------------------------------

describe('QuotesListPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockListQuotes.mockResolvedValue([])
    })

    // REQ-QUO-FE-F-001
    test('T-quotes-list-R01 — renders Quotes heading without crash', async () => {
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: /quotes/i })).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-002
    test('T-quotes-list-R02 — renders New Quote link to /quotes/new', async () => {
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() => {
            const link = screen.getByRole('link', { name: /new quote/i })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute('href', '/quotes/new')
        })
    })

    // REQ-QUO-FE-F-003
    test('T-quotes-list-R03 — calls listQuotes on mount', async () => {
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() => expect(mockListQuotes).toHaveBeenCalledTimes(1))
    })

    // REQ-QUO-FE-F-004
    test('T-quotes-list-R04 — renders table column headers', async () => {
        mockListQuotes.mockResolvedValue([makeQuote()])
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /insured/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /business type/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /inception/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /expiry/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-005
    test('T-quotes-list-R05 — reference is a navigation link to /quotes/:id', async () => {
        mockListQuotes.mockResolvedValue([makeQuote()])
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() => {
            const link = screen.getByRole('link', { name: 'QUO-DEMO-20260601-001' })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute('href', '/quotes/1')
        })
    })

    // REQ-QUO-FE-F-006
    test('T-quotes-list-R06 — renders empty-state message when no quotes', async () => {
        mockListQuotes.mockResolvedValue([])
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() =>
            expect(screen.getByText(/no quotes found/i)).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-007
    test('T-quotes-list-R07 — shows error message on API failure', async () => {
        mockListQuotes.mockRejectedValue(new Error('Network error'))
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() =>
            expect(screen.getByText(/network error/i)).toBeInTheDocument()
        )
    })
})

// ---------------------------------------------------------------------------
// NewQuotePage
// ---------------------------------------------------------------------------

describe('NewQuotePage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetSubmission.mockResolvedValue({
            id: 10,
            insured: 'Widget Corp',
            insuredId: '1',
            createdByOrgCode: 'DEMO',
        })
    })

    test('T-quotes-new-R00 — registers Quote sidebar with Save only and excludes retired items', () => {
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)

        expect(mockUseSidebarSection).toHaveBeenCalled()
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        expect(section?.title).toBe('Quote')

        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Save')
        expect(labels).not.toContain('All Quotes')
        expect(labels).not.toContain('Bind Quote')
        expect(labels).not.toContain('Decline Quote')
        expect(labels).not.toContain('Copy Quote')
        expect(labels).not.toContain('Issue Policy')
        expect(labels).not.toContain('Back to Submission')
    })

    // REQ-QUO-FE-F-009
    test('T-quotes-new-R01 — renders New Quote heading without crash', () => {
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)
        expect(screen.getByRole('heading', { name: /new quote/i })).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-010
    test('T-quotes-new-R02 — renders form fields', () => {
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)
        expect(screen.getByLabelText(/inception date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/business type/i)).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-011, F-012
    test('T-quotes-new-R03 — submits form and navigates on success', async () => {
        mockCreateQuote.mockResolvedValue(makeQuote({ id: 42 }))
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)

        // Link a submission (required before save)
        fireEvent.click(screen.getByTestId('submission-search-trigger'))

        // Select insured
        fireEvent.click(screen.getByTestId('insured-search'))

        // Fill inception date
        fireEvent.change(screen.getByLabelText(/inception date/i), {
            target: { value: '2026-06-01' },
        })

        // Trigger save event
        fireEvent(window, new Event('submission:save'))

        await waitFor(() => {
            expect(mockCreateQuote).toHaveBeenCalled()
            expect(mockNavigate).toHaveBeenCalledWith('/quotes/42')
        })
    })

    // REQ-QUO-FE-F-013
    test('T-quotes-new-R04 — shows error message on API failure', async () => {
        mockCreateQuote.mockRejectedValue(new Error('Server error'))
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)

        // Link a submission (required before save)
        fireEvent.click(screen.getByTestId('submission-search-trigger'))

        // Select insured to enable save
        fireEvent.click(screen.getByTestId('insured-search'))
        fireEvent.change(screen.getByLabelText(/inception date/i), {
            target: { value: '2026-06-01' },
        })

        fireEvent(window, new Event('submission:save'))

        await waitFor(() =>
            expect(screen.getByText(/server error/i)).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-014
    test('T-quotes-new-R05 — shows unsaved-changes banner after insured selection', async () => {
        render(<MemoryRouter><NewQuotePage /></MemoryRouter>)
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
        fireEvent.click(screen.getByTestId('insured-search'))
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    })

    test('T-quotes-new-R06 — preloads insured from linked submissionId query param', async () => {
        render(
            <MemoryRouter initialEntries={['/quotes/new?submissionId=10']}>
                <Routes>
                    <Route path="/quotes/new" element={<NewQuotePage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(mockGetSubmission).toHaveBeenCalledWith(10)
            expect(screen.getByText(/selected:/i)).toHaveTextContent('Selected: Widget Corp')
        })
    })

    test('T-quotes-new-R07 — saves using the inherited insured from the linked submission', async () => {
        mockCreateQuote.mockResolvedValue(makeQuote({ id: 42 }))
        render(
            <MemoryRouter initialEntries={['/quotes/new?submissionId=10']}>
                <Routes>
                    <Route path="/quotes/new" element={<NewQuotePage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => expect(screen.getByText(/selected:/i)).toHaveTextContent('Selected: Widget Corp'))
        fireEvent.change(screen.getByLabelText(/inception date/i), {
            target: { value: '2026-06-01' },
        })
        fireEvent(window, new Event('submission:save'))

        await waitFor(() => {
            expect(mockCreateQuote).toHaveBeenCalledWith(expect.objectContaining({
                insured: 'Widget Corp',
                insured_id: 1,
                submission_id: 10,
            }))
        })
    })
})

// ---------------------------------------------------------------------------
// QuoteViewPage
// ---------------------------------------------------------------------------

describe('QuoteViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetQuote.mockResolvedValue(makeQuote())
        mockGetContractTypes.mockResolvedValue(['Open Market', 'Binding Authority'])
        mockGetMethodsOfPlacement.mockResolvedValue(['Open Market', 'Delegated Authority'])
        mockGetRenewalStatuses.mockResolvedValue(['New Business', 'Renewal'])
        mockListSections.mockResolvedValue([])
        mockGetSubmission.mockResolvedValue({
            id: 10,
            reference: 'SUB-DEMO-20260601-001',
            insured: 'Widget Corp',
            insuredId: 'party-1',
            createdByOrgCode: 'DEMO',
            status: 'Quote Created',
            placingBroker: 'Broker Co',
            placingBrokerName: 'Broker Co Ltd',
            inceptionDate: '2026-06-01',
        })
    })

    function renderView(id = '1') {
        return render(
            <MemoryRouter initialEntries={[`/quotes/${id}`]}>
                <Routes>
                    <Route path="/quotes/:id" element={<QuoteViewPage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    // REQ-QUO-FE-F-016
    test('T-quotes-view-R01 — fetches quote on mount and renders reference', async () => {
        renderView()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalledWith(1))
        await waitFor(() =>
            expect(screen.getByText('QUO-DEMO-20260601-001')).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-017
    test('T-quotes-view-R02 — renders identity panel fields', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByText('QUO-DEMO-20260601-001')).toBeInTheDocument()
            expect(screen.getByText('Widget Corp')).toBeInTheDocument()
            expect(screen.getByText('Insurance')).toBeInTheDocument()
            expect(screen.getByDisplayValue('USD')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-018 — editable in Draft
    test('T-quotes-view-R03 — renders editable inputs in Draft status', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByLabelText(/inception date/i)).not.toHaveAttribute('disabled')
        })
    })

    // REQ-QUO-FE-F-019
    test('T-quotes-view-R04 — saves updated fields via updateQuote', async () => {
        mockUpdateQuote.mockResolvedValue(makeQuote({ business_type: 'Reinsurance' }))
        renderView()
        await waitFor(() => screen.getByLabelText(/business type/i))

        fireEvent.change(screen.getByLabelText(/business type/i), {
            target: { value: 'Reinsurance' },
        })
        fireEvent(window, new Event('submission:save'))

        await waitFor(() =>
            expect(mockUpdateQuote).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ business_type: 'Reinsurance' })
            )
        )
    })

    // REQ-QUO-FE-F-021
    test('T-quotes-view-R05 — shows error on load failure', async () => {
        mockGetQuote.mockRejectedValue(new Error('Quote not found'))
        renderView('999')
        await waitFor(() =>
            expect(screen.getByText(/quote not found/i)).toBeInTheDocument()
        )
    })

    test('T-quotes-view-R05a — Draft quote registers expected sidebar items and excludes forbidden ones', async () => {
        renderView()

        await waitFor(() => {
            expect(mockUseSidebarSection).toHaveBeenCalled()
        })

        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        expect(section?.title).toBe('Quote')

        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Save')
        expect(labels).toContain('Issue Quote')
        expect(labels).toContain('Decline Quote')
        expect(labels).toContain('Back to Submission')
        expect(labels).toContain('Copy Quote')
        expect(labels).not.toContain('Bind Quote')
        expect(labels).not.toContain('All Quotes')
        expect(labels).not.toContain('Issue Policy')
    })

    test('T-quotes-view-R05b — Quoted quote swaps to Bind Quote and excludes retired items', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderView()

        await waitFor(() => {
            expect(mockUseSidebarSection).toHaveBeenCalled()
        })

        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        expect(section?.title).toBe('Quote')

        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Bind Quote')
        expect(labels).toContain('Decline Quote')
        expect(labels).toContain('Back to Submission')
        expect(labels).toContain('Copy Quote')
        expect(labels).not.toContain('Save')
        expect(labels).not.toContain('Issue Quote')
        expect(labels).not.toContain('All Quotes')
        expect(labels).not.toContain('Issue Policy')
    })

    // REQ-QUO-FE-F-022
    test('T-quotes-view-R06 — renders submission reference link when submission_id is set', async () => {
        renderView()
        await waitFor(() => {
            const link = screen.getByRole('link', { name: /SUB-DEMO-20260601-001/i })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute('href', '/submissions/10')
        })
    })

    // REQ-QUO-FE-F-018 — read-only in Bound
    test('T-quotes-view-R07 — renders read-only display when status is Bound', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Bound' }))
        renderView()
        await waitFor(() => {
            // In Bound state editable inputs are replaced with read-only text
            expect(screen.queryByLabelText(/inception date/i)).toBeNull()
        })
    })
    // REQ-QUO-FE-F-026
    test('T-quotes-view-R08 — renders Year of Account input in Draft mode', async () => {
        renderView()
        await waitFor(() =>
            expect(screen.getByLabelText(/year of account/i)).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-027
    test('T-quotes-view-R09 — renders inception and expiry time inputs in Draft mode', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByLabelText(/inception time/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/expiry time/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-028
    test('T-quotes-view-R10 — LTA toggle reveals LTA date fields', async () => {
        renderView()
        await waitFor(() => screen.getByLabelText(/lta applicable/i))

        // LTA date fields are hidden initially
        expect(screen.queryByLabelText(/lta start date/i)).toBeNull()

        // Toggle LTA on
        fireEvent.click(screen.getByLabelText(/lta applicable/i))

        await waitFor(() =>
            expect(screen.getByLabelText(/lta start date/i)).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-029
    test('T-quotes-view-R11 — Contract Type select is populated from lookup', async () => {
        renderView()
        await waitFor(() => {
            const select = screen.getByLabelText(/contract type/i) as HTMLSelectElement
            expect(select).toBeInTheDocument()
            const optionTexts = Array.from(select.options).map((o) => o.text)
            expect(optionTexts).toContain('Open Market')
            expect(optionTexts).toContain('Binding Authority')
        })
    })

    // REQ-QUO-FE-F-030
    test('T-quotes-view-R12 — Method of Placement select is populated from lookup', async () => {
        renderView()
        await waitFor(() => {
            const select = screen.getByLabelText(/method of placement/i) as HTMLSelectElement
            expect(select).toBeInTheDocument()
            const optionTexts = Array.from(select.options).map((o) => o.text)
            expect(optionTexts).toContain('Delegated Authority')
        })
    })

    // REQ-QUO-FE-F-032
    test('T-quotes-view-R13 — Renewable Yes reveals Renewal Date and Renewal Status', async () => {
        renderView()
        await waitFor(() => screen.getByLabelText(/renewable/i))

        // Renewal fields hidden initially
        expect(screen.queryByLabelText(/renewal date/i)).toBeNull()

        // Change Renewable to Yes
        fireEvent.change(screen.getByLabelText(/renewable/i), { target: { value: 'Yes' } })

        await waitFor(() => {
            expect(screen.getByLabelText(/renewal date/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/renewal status/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-033 — locked notification (panel, not banner)
    test('T-quotes-view-R14 — calls addNotification with locked warning when status is Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderView()
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(
                'This quote is locked and cannot be edited.',
                'warning',
                expect.objectContaining({ id: 'quote-1-locked' })
            )
        )
        // Banner must NOT be in the DOM
        expect(screen.queryByText(/this quote is locked/i)).not.toBeInTheDocument()
    })

    // REQ-QUO-FE-C-003
    test('T-quotes-view-R15 — back barrier fires addNotification on first popstate when dirty', async () => {
        mockGetQuote.mockResolvedValue(makeQuote())
        const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => undefined)

        renderView()
        await waitFor(() => screen.getByLabelText(/business type/i))

        // Make form dirty
        fireEvent.change(screen.getByLabelText(/business type/i), { target: { value: 'Reinsurance' } })

        // Wait for C-003 effect to attach the listener
        await waitFor(() => expect(pushStateSpy).toHaveBeenCalled())

        // Simulate browser back press
        fireEvent(window, new PopStateEvent('popstate', { bubbles: true }))

        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringMatching(/unsaved changes/i),
                'warning'
            )
        )

        pushStateSpy.mockRestore()
    })

    // ---------------------------------------------------------------------------
    // Block 3 — Tabs + FieldGroups + Audit (REQ-QUO-FE-F-034 to F-044)
    // ---------------------------------------------------------------------------

    // REQ-QUO-FE-F-034
    test('T-quotes-view-R16 — renders Sections and Audit tabs (no Details tab)', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.queryByTestId('tab-details')).toBeNull()
            expect(screen.getByTestId('tab-sections')).toBeInTheDocument()
            expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
            // New tabs
            expect(screen.getByTestId('tab-brokers')).toBeInTheDocument()
            expect(screen.getByTestId('tab-additional-insureds')).toBeInTheDocument()
            expect(screen.getByTestId('tab-financial-summary')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-034 — default tab
    test('T-quotes-view-R17 — Sections tab is active by default', async () => {
        renderView()
        await waitFor(() => {
            const sectionsBtn = screen.getByTestId('tab-sections')
            expect(sectionsBtn).toHaveClass('border-brand-500')
        })
    })

    // REQ-QUO-FE-F-036 — form is always visible above tab strip
    test('T-quotes-view-R18 — form always shows two-column layout with fieldset elements regardless of active tab', async () => {
        renderView()
        await waitFor(() => {
            const fieldsets = document.querySelectorAll('fieldset')
            expect(fieldsets.length).toBeGreaterThanOrEqual(2)
        })
    })

    // REQ-QUO-FE-F-037 — Quote & Referencing FieldGroup
    test('T-quotes-view-R19 — Quote & Referencing FieldGroup contains reference text', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByText('QUO-DEMO-20260601-001')).toBeInTheDocument()
            expect(screen.getByText(/quote.*referencing/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-038 — Insured FieldGroup
    test('T-quotes-view-R20 — Insured FieldGroup renders InsuredSearch in Draft mode', async () => {
        // Quote with no linked insured party so InsuredSearch is shown (not the Clear button)
        mockGetQuote.mockResolvedValue(makeQuote({ insured: '', insured_id: null }))
        renderView()
        await waitFor(() => {
            // InsuredSearch mock renders "Select Insured" button
            expect(screen.getByTestId('insured-search')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-039 — Dates FieldGroup
    test('T-quotes-view-R21 — Dates FieldGroup contains inception date input', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByLabelText(/inception date/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-040 — Contract/Placement FieldGroup
    test('T-quotes-view-R22 — Contract/Placement FieldGroup contains Contract Type select', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByLabelText(/contract type/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-041 — Renewal FieldGroup
    test('T-quotes-view-R23 — Renewal FieldGroup contains Renewable select', async () => {
        renderView()
        await waitFor(() => {
            expect(screen.getByLabelText(/renewable/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-042 — Sections tab (default tab, shows empty state as table row when no sections)
    test('T-quotes-view-R24 — Sections tab shows empty-state table row when quote has no sections', async () => {
        mockListSections.mockResolvedValue([])
        renderView()
        await waitFor(() =>
            expect(screen.getByText(/no sections found/i)).toBeInTheDocument()
        )
        // table headers must still be visible (RULE 8)
        expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-043 — Audit tab renders AuditTable
    test('T-quotes-view-R25 — Audit tab renders the AuditTable component', async () => {
        renderView()
        await waitFor(() => screen.getByTestId('tab-audit'))
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() =>
            expect(screen.getByTestId('audit-table')).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-044 — useAudit called with correct options
    test('T-quotes-view-R26 — useAudit called with entityType Quote, trackVisits true', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        expect(mockUseAuditFn).toHaveBeenCalledWith(
            expect.objectContaining({
                entityType: 'Quote',
                entityId: 1,
                apiBase: '/api/quotes',
                trackVisits: true,
            })
        )
    })

    // ---------------------------------------------------------------------------
    // Block 3 remaining — Brokers tab (REQ-QUO-FE-F-048)
    // ---------------------------------------------------------------------------

    // REQ-QUO-FE-F-048
    test('T-quotes-view-R27 — Brokers tab shows Placing Broker and Surplus Lines Broker headings in Draft', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-brokers'))
        await waitFor(() => {
            expect(screen.getByText(/placing broker/i)).toBeInTheDocument()
            expect(screen.getByText(/surplus lines broker/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-048
    test('T-quotes-view-R28 — Brokers tab shows BrokerSearch components in Draft mode', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-brokers'))
        await waitFor(() => {
            // BrokerSearch mock renders a button for each un-selected broker
            const brokerButtons = screen.getAllByRole('button', { name: /select broker/i })
            expect(brokerButtons.length).toBeGreaterThanOrEqual(1)
        })
    })

    // REQ-QUO-FE-F-048 — broker tab is read-only when not Draft
    test('T-quotes-view-R29 — Brokers tab shows read-only names and hides BrokerSearch when Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({
            status: 'Quoted',
            payload: { placingBrokerName: 'Acme Brokers', surplusLinesBrokerName: null },
        }))
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-brokers'))
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /select broker/i })).toBeNull()
            expect(screen.getByText('Acme Brokers')).toBeInTheDocument()
        })
    })

    // ---------------------------------------------------------------------------
    // Block 3 remaining — Additional Insureds tab (REQ-QUO-FE-F-049)
    // ---------------------------------------------------------------------------

    // REQ-QUO-FE-F-049
    test('T-quotes-view-R30 — Additional Insureds tab renders table with Name column header', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-additional-insureds'))
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-049
    test('T-quotes-view-R31 — Additional Insureds tab shows no-parties row when payload is empty', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-additional-insureds'))
        await waitFor(() => {
            expect(screen.getByText(/no additional insured parties listed/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-049
    test('T-quotes-view-R32 — Additional Insureds tab shows Add Row button in Draft mode', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-additional-insureds'))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^\+ add$/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-049 — no Add button when not Draft
    test('T-quotes-view-R33 — Additional Insureds tab hides Add Row button when Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-additional-insureds'))
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /^\+ add$/i })).toBeNull()
        })
    })

    // ---------------------------------------------------------------------------
    // Block 3 remaining — Financial Summary tab (REQ-QUO-FE-F-050)
    // ---------------------------------------------------------------------------

    // REQ-QUO-FE-F-050
    test('T-quotes-view-R34 — Financial Summary tab renders Gross Premium, Net Premium, Commission inputs', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-financial-summary'))
        await waitFor(() => {
            expect(screen.getByLabelText(/gross premium/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/net premium/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/commission/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-050 — inputs disabled when not Draft
    test('T-quotes-view-R35 — Financial Summary inputs are disabled when quote is Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({
            status: 'Quoted',
            payload: { financials: { grossPremium: '10000', netPremium: '9000', commission: '1000' } },
        }))
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-financial-summary'))
        await waitFor(() => {
            expect(screen.getByLabelText(/gross premium/i)).toBeDisabled()
            expect(screen.getByLabelText(/net premium/i)).toBeDisabled()
            expect(screen.getByLabelText(/commission/i)).toBeDisabled()
        })
    })

    // REQ-QUO-FE-F-050 — inputs enabled in Draft
    test('T-quotes-view-R36 — Financial Summary inputs are enabled when quote is Draft', async () => {
        renderView()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001'))
        fireEvent.click(screen.getByTestId('tab-financial-summary'))
        await waitFor(() => {
            expect(screen.getByLabelText(/gross premium/i)).not.toBeDisabled()
        })
    })

    // REQ-QUO-FE-F-042 — Add Section button placement in Draft
    test('T-quotes-view-R37 — Add Section button is inside the sections table header, not above the table, when quote is Draft', async () => {
        mockListSections.mockResolvedValue([])
        renderView()
        await waitFor(() => screen.getByText(/no sections found/i))
        const btn = screen.getByTitle('Add Section')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-042 — Section row icons when sections exist
    test('T-quotes-view-R38 — Sections tab shows Open Section (FiSearch) and Delete Section (FiTrash2) icons per row in Draft', async () => {
        mockListSections.mockResolvedValue([makeSection()])
        renderView()
        await waitFor(() => screen.getByTitle('Open Section'))
        expect(screen.getByTitle('Open Section')).toBeInTheDocument()
        expect(screen.getByTitle('Delete Section')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// QuoteSectionViewPage — Block 4 (REQ-QUO-FE-F-051 to F-060)
// ---------------------------------------------------------------------------

describe('QuoteSectionViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetQuote.mockResolvedValue(makeQuote())
        mockListSections.mockResolvedValue([makeSection()])
        mockListCoverages.mockResolvedValue([])
        mockListParticipations.mockResolvedValue([])
        mockGetContractTypes.mockResolvedValue([])
        mockGetMethodsOfPlacement.mockResolvedValue([])
        mockGetRenewalStatuses.mockResolvedValue([])
    })

    function renderSection(quoteId = '1', sectionId = '1') {
        return render(
            <MemoryRouter initialEntries={[`/quotes/${quoteId}/sections/${sectionId}`]}>
                <Routes>
                    <Route path="/quotes/:id/sections/:sectionId" element={<QuoteSectionViewPage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    // REQ-QUO-FE-F-051
    test('T-quotes-section-R01 — fetches quote and sections on mount', async () => {
        renderSection()
        await waitFor(() => {
            expect(mockGetQuote).toHaveBeenCalledWith(1)
            expect(mockListSections).toHaveBeenCalledWith(1)
        })
    })

    // REQ-QUO-FE-F-051 — not found
    test('T-quotes-section-R02 — shows "Section not found" with back link when sectionId has no match', async () => {
        renderSection('1', '999')
        await waitFor(() =>
            expect(screen.getByText(/section not found/i)).toBeInTheDocument()
        )
        expect(screen.getByRole('link', { name: /back to quote/i })).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-052
    test('T-quotes-section-R03 — renders section reference as read-only field', async () => {
        renderSection()
        await waitFor(() =>
            expect(screen.getByText('QUO-DEMO-20260601-001-S01')).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-054
    test('T-quotes-section-R04 — renders four tabs: Coverages, Deductions, Risk Codes, Participations', async () => {
        renderSection()
        await waitFor(() => {
            expect(screen.getByTestId('tab-coverages')).toBeInTheDocument()
            expect(screen.getByTestId('tab-deductions')).toBeInTheDocument()
            expect(screen.getByTestId('tab-riskCodes')).toBeInTheDocument()
            expect(screen.getByTestId('tab-participations')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-054 — default tab
    test('T-quotes-section-R04a — Coverages tab is active by default', async () => {
        renderSection()
        await waitFor(() => {
            expect(screen.getByTestId('tab-coverages')).toHaveClass('border-brand-500')
        })
    })

    // REQ-QUO-FE-F-055
    test('T-quotes-section-R05 — Coverages tab fetches coverages on mount and renders table headers', async () => {
        renderSection()
        await waitFor(() => {
            expect(mockListCoverages).toHaveBeenCalledWith(1, 1)
            expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-055 — empty state
    test('T-quotes-section-R06 — Coverages tab shows "No coverages found." empty-state row', async () => {
        mockListCoverages.mockResolvedValue([])
        renderSection()
        await waitFor(() =>
            expect(screen.getByText(/no coverages found/i)).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-056
    test('T-quotes-section-R07 — Deductions tab renders rows from payload.taxOverrides', async () => {
        mockListSections.mockResolvedValue([makeSection({
            payload: { taxOverrides: [{ country: 'US', deductionType: 'Tax', basis: 'Gross', rate: '5' }] },
        })])
        renderSection()
        await waitFor(() => screen.getByTestId('tab-deductions'))
        fireEvent.click(screen.getByTestId('tab-deductions'))
        await waitFor(() =>
            expect(screen.getByDisplayValue('US')).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-057
    test('T-quotes-section-R08 — Risk Codes tab renders rows from payload.riskSplits', async () => {
        mockListSections.mockResolvedValue([makeSection({
            payload: { riskSplits: [{ riskCode: 'PROP', allocation: '100' }] },
        })])
        renderSection()
        await waitFor(() => screen.getByTestId('tab-riskCodes'))
        fireEvent.click(screen.getByTestId('tab-riskCodes'))
        await waitFor(() =>
            expect(screen.getByDisplayValue('PROP')).toBeInTheDocument()
        )
    })

    // REQ-QUO-FE-F-058
    test('T-quotes-section-R09 — Participations tab fetches participations on first activation and renders table', async () => {
        renderSection()
        await waitFor(() => screen.getByTestId('tab-participations'))
        fireEvent.click(screen.getByTestId('tab-participations'))
        await waitFor(() => {
            expect(mockListParticipations).toHaveBeenCalledWith(1)
            expect(screen.getByRole('columnheader', { name: /market name/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-053 + sidebar
    test('T-quotes-section-R10 — registers Quote Section sidebar with Save and Back to Quote items', async () => {
        renderSection()
        await waitFor(() => {
            expect(mockUseSidebarSection).toHaveBeenCalled()
        })
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        expect(section?.title).toBe('Quote Section')
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Save')
        expect(labels).toContain('Back to Quote')
    })

    // REQ-QUO-FE-F-055 — Add Coverage button placement
    test('T-quotes-section-R11 — Add Coverage button is inside Coverages table header, not above grid, when quote is Draft', async () => {
        renderSection()
        await waitFor(() => screen.getByTestId('tab-coverages'))
        const btn = await screen.findByTitle('Add Coverage')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-056 — Add Deduction button placement
    test('T-quotes-section-R12 — Add Deduction button is inside Deductions table header when quote is Draft', async () => {
        renderSection()
        await waitFor(() => screen.getByTestId('tab-deductions'))
        fireEvent.click(screen.getByTestId('tab-deductions'))
        const btn = await screen.findByTitle('Add Deduction')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-057 — Add Risk Code button placement
    test('T-quotes-section-R13 — Add Risk Code button is inside Risk Codes table header when quote is Draft', async () => {
        renderSection()
        await waitFor(() => screen.getByTestId('tab-riskCodes'))
        fireEvent.click(screen.getByTestId('tab-riskCodes'))
        const btn = await screen.findByTitle('Add Risk Code')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-054 — Add buttons hidden in non-Draft quotes
    test('T-quotes-section-R14 — Add Coverage, Add Deduction and Add Risk Code buttons are absent when quote is not Draft', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderSection()
        await waitFor(() => screen.getByTestId('tab-coverages'))
        expect(screen.queryByTitle('Add Coverage')).not.toBeInTheDocument()

        fireEvent.click(screen.getByTestId('tab-deductions'))
        await waitFor(() => expect(screen.queryByTitle('Add Deduction')).not.toBeInTheDocument())

        fireEvent.click(screen.getByTestId('tab-riskCodes'))
        await waitFor(() => expect(screen.queryByTitle('Add Risk Code')).not.toBeInTheDocument())
    })
})

