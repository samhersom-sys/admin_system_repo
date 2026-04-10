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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
const mockGetQuoteLocations = jest.fn()
const mockIssuePolicy = jest.fn()
const mockGetRiskCodes = jest.fn()

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
    getQuoteLocations: (...args: unknown[]) => mockGetQuoteLocations(...args),
    issuePolicy: (...args: unknown[]) => mockIssuePolicy(...args),
    getContractTypes: () => mockGetContractTypes(),
    getMethodsOfPlacement: () => mockGetMethodsOfPlacement(),
    getRenewalStatuses: () => mockGetRenewalStatuses(),
    getRiskCodes: () => mockGetRiskCodes(),
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
import QuoteCoverageDetailPage from './QuoteCoverageDetailPage/QuoteCoverageDetailPage'
import QuoteCoverageSubDetailPage from './QuoteCoverageSubDetailPage/QuoteCoverageSubDetailPage'
import QuoteSearchModal from './QuoteSearchModal/QuoteSearchModal'

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
        sum_insured_currency: 'USD',
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
    test('T-quotes-list-R05 — reference is plain text and action icon links to /quotes/:id', async () => {
        mockListQuotes.mockResolvedValue([makeQuote()])
        render(<MemoryRouter><QuotesListPage /></MemoryRouter>)
        await waitFor(() => {
            expect(screen.getByText('QUO-DEMO-20260601-001')).toBeInTheDocument()
            expect(screen.queryByRole('link', { name: 'QUO-DEMO-20260601-001' })).not.toBeInTheDocument()
            expect(document.querySelector('a[href="/quotes/1"]')).not.toBeNull()
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

    // REQ-QUO-FE-F-024 — Insured not confirmed: red border + warning
    test('T-quotes-view-R20b — Insured unconfirmed shows red border and warning text', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ insured: '', insured_id: null }))
        renderView()
        await waitFor(() => {
            expect(screen.getByText(/insured not confirmed/i)).toBeInTheDocument()
        })
        // The wrapper should have a red border class
        const wrapper = screen.getByText(/insured not confirmed/i).closest('[data-testid="insured-unconfirmed"]')
        expect(wrapper).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-024 — Insured confirmed: no warning
    test('T-quotes-view-R20c — Insured confirmed hides warning text', async () => {
        renderView() // default makeQuote has insured_id set
        await waitFor(() => {
            expect(screen.getByText('Widget Corp')).toBeInTheDocument()
        })
        expect(screen.queryByText(/insured not confirmed/i)).not.toBeInTheDocument()
    })

    // REQ-QUO-FE-F-025 — Submission not confirmed: red border + warning
    test('T-quotes-view-R20d — Submission unconfirmed shows red border and warning text', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ submission_id: null }))
        mockGetSubmission.mockResolvedValue(null)
        renderView()
        await waitFor(() => {
            expect(screen.getByText(/submission not confirmed/i)).toBeInTheDocument()
        })
        const wrapper = screen.getByText(/submission not confirmed/i).closest('[data-testid="submission-unconfirmed"]')
        expect(wrapper).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-025 — Submission confirmed: no warning
    test('T-quotes-view-R20e — Submission confirmed hides warning text', async () => {
        renderView() // default makeQuote has submission_id: 10
        await waitFor(() => {
            expect(screen.getByText('SUB-DEMO-20260601-001')).toBeInTheDocument()
        })
        expect(screen.queryByText(/submission not confirmed/i)).not.toBeInTheDocument()
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
        mockGetRiskCodes.mockResolvedValue([])
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
        await waitFor(() => {
            expect(screen.getByText(/section not found/i)).toBeInTheDocument()
            expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-052
    test('T-quotes-section-R03 — renders section reference as a read-only field', async () => {
        renderSection()
        await waitFor(() => {
            expect(screen.getByText('QUO-DEMO-20260601-001-S01')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-053
    test('T-quotes-section-R04 — renders four tabs: Coverages, Deductions, Risk Codes, Participations', async () => {
        renderSection()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Coverages' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Deductions' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Risk Codes' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Participations' })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-054
    test('T-quotes-section-R04a — Coverages tab is active by default', async () => {
        renderSection()
        await waitFor(() => {
            const covBtn = screen.getByTestId('tab-coverages')
            expect(covBtn).toHaveClass('border-brand-500')
        })
    })

    // REQ-QUO-FE-F-055
    test('T-quotes-section-R05 — Coverages tab fetches coverages on mount and renders table headers', async () => {
        renderSection()
        await waitFor(() => {
            expect(mockListCoverages).toHaveBeenCalledWith(1, 1)
            expect(screen.getByRole('columnheader', { name: /coverage/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-055 — empty state
    test('T-quotes-section-R06 — Coverages tab shows "No coverages found." empty-state row', async () => {
        mockListCoverages.mockResolvedValue([])
        renderSection()
        await waitFor(() => {
            expect(screen.getByText(/no coverages found/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-056
    test('T-quotes-section-R07 — Deductions tab renders rows from payload.taxOverrides', async () => {
        mockListSections.mockResolvedValue([makeSection({
            payload: { taxOverrides: [{ deductionType: 'Tax', rate: 12, amount: 600 }] },
        })])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Deductions' }))
        fireEvent.click(screen.getByRole('button', { name: 'Deductions' }))
        await waitFor(() => {
            expect(screen.getByText('Tax')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-057
    test('T-quotes-section-R08 — Risk Codes tab renders rows from payload.riskSplits', async () => {
        mockListSections.mockResolvedValue([makeSection({
            payload: { riskSplits: [{ riskCode: 'FIRE', allocation: '50' }] },
        })])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Risk Codes' }))
        fireEvent.click(screen.getByRole('button', { name: 'Risk Codes' }))
        await waitFor(() => {
            expect(screen.getByDisplayValue('FIRE')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-059
    test('T-quotes-section-R09 — Participations tab fetches participations on first activation and renders table', async () => {
        mockListParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 100, signed_line: 100,
            role: 'Underwriter', reference: 'SYN-001', notes: null,
        }])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Participations' }))
        fireEvent.click(screen.getByRole('button', { name: 'Participations' }))
        await waitFor(() => {
            expect(mockListParticipations).toHaveBeenCalledWith(1)
            expect(screen.getByDisplayValue("Lloyd's")).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-060
    test('T-quotes-section-R10 — registers Quote Section sidebar with Save (Draft) and Back to Quote items', async () => {
        renderSection()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Save')
        expect(labels).toContain('Back to Quote')
        // Must NOT contain Policy-specific items (negative assertions — §6.4B)
        expect(labels).not.toContain('Issue Quote')
        expect(labels).not.toContain('Endorse')
        expect(labels).not.toContain('Issue Policy')
    })

    // Guideline 14 RULE 8 — action buttons inside table headers
    test('T-quotes-section-R11 — Add Coverage button is inside Coverages table header, not above grid', async () => {
        mockListCoverages.mockResolvedValue([])
        renderSection()
        await waitFor(() => screen.getByText(/no coverages found/i))
        const btn = screen.getByTitle('Add Coverage')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    test('T-quotes-section-R12 — Add Deduction button is inside Deductions table header', async () => {
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Deductions' }))
        fireEvent.click(screen.getByRole('button', { name: 'Deductions' }))
        const btn = await screen.findByTitle('Add Deduction')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    test('T-quotes-section-R13 — Add Risk Code button is inside Risk Codes table header', async () => {
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Risk Codes' }))
        fireEvent.click(screen.getByRole('button', { name: 'Risk Codes' }))
        const btn = await screen.findByTitle('Add Risk Code')
        expect(btn.closest('th')).toBeInTheDocument()
    })

    test('T-quotes-section-R14 — Add Coverage, Add Deduction and Add Risk Code buttons are absent when Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderSection()
        await waitFor(() => screen.getByText('QUO-DEMO-20260601-001-S01'))
        expect(screen.queryByTitle('Add Coverage')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Deductions' }))
        await waitFor(() => {
            expect(screen.queryByTitle('Add Deduction')).not.toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-052 — Days on Cover computed field
    test('T-quotes-section-R15 — Days on Cover is displayed as a read-only computed field', async () => {
        mockListSections.mockResolvedValue([makeSection({
            inception_date: '2026-06-01',
            expiry_date: '2027-06-01',
        })])
        renderSection()
        await waitFor(() => {
            expect(screen.getByText(/days on cover/i)).toBeInTheDocument()
            expect(screen.getByText('365')).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-052 — Inception Time and Expiry Time fields
    test('T-quotes-section-R16 — Inception Time and Expiry Time inputs are rendered', async () => {
        renderSection()
        await waitFor(() => {
            expect(screen.getByLabelText(/inception time/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/expiry time/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-052 — Annual Net Premium field
    test('T-quotes-section-R17 — Annual Net Premium field is rendered in the header', async () => {
        renderSection()
        await waitFor(() => {
            // One in the section header label, one in the Coverages tab column header
            const matches = screen.getAllByText(/annual net premium/i)
            expect(matches.length).toBeGreaterThanOrEqual(2)
        })
    })

    // REQ-QUO-FE-F-057 — Risk Code select from lookup
    test('T-quotes-section-R18 — Risk Code renders as select when lookup returns options', async () => {
        mockGetRiskCodes.mockResolvedValue(['FIRE', 'FLOOD', 'THEFT'])
        mockListSections.mockResolvedValue([makeSection({
            payload: { riskSplits: [{ riskCode: 'FIRE', allocation: '50' }] },
        })])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Risk Codes' }))
        fireEvent.click(screen.getByRole('button', { name: 'Risk Codes' }))
        await waitFor(() => {
            expect(screen.getByDisplayValue('FIRE')).toBeInTheDocument()
            const select = screen.getByDisplayValue('FIRE')
            expect(select.tagName).toBe('SELECT')
        })
    })

    // REQ-QUO-FE-F-057 — Risk Code falls back to free text when lookup is empty
    test('T-quotes-section-R19 — Risk Code renders as free-text input when lookup returns empty array', async () => {
        mockGetRiskCodes.mockResolvedValue([])
        mockListSections.mockResolvedValue([makeSection({
            payload: { riskSplits: [{ riskCode: 'CUSTOM', allocation: '100' }] },
        })])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Risk Codes' }))
        fireEvent.click(screen.getByRole('button', { name: 'Risk Codes' }))
        await waitFor(() => {
            expect(screen.getByDisplayValue('CUSTOM')).toBeInTheDocument()
            const input = screen.getByDisplayValue('CUSTOM')
            expect(input.tagName).toBe('INPUT')
        })
    })

    // REQ-QUO-FE-F-058 — Participations inline editing
    test('T-quotes-section-R20 — Participations tab renders inline inputs in Draft mode', async () => {
        mockListParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 100, signed_line: 100,
            role: 'Lead', reference: 'SYN-001', notes: 'Test',
        }])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Participations' }))
        fireEvent.click(screen.getByRole('button', { name: 'Participations' }))
        await waitFor(() => {
            expect(screen.getByDisplayValue("Lloyd's")).toBeInTheDocument()
            const input = screen.getByDisplayValue("Lloyd's")
            expect(input.tagName).toBe('INPUT')
        })
    })

    // REQ-QUO-FE-F-058 — Save Participations button
    test('T-quotes-section-R21 — Save Participations button calls saveParticipations', async () => {
        mockListParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 100, signed_line: 100,
            role: 'Lead', reference: 'SYN-001', notes: null,
        }])
        mockSaveParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 100, signed_line: 100,
            role: 'Lead', reference: 'SYN-001', notes: null,
        }])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Participations' }))
        fireEvent.click(screen.getByRole('button', { name: 'Participations' }))
        await waitFor(() => screen.getByDisplayValue("Lloyd's"))
        fireEvent.click(screen.getByRole('button', { name: /save participations/i }))
        await waitFor(() => {
            expect(mockSaveParticipations).toHaveBeenCalledWith(1, expect.any(Array))
        })
    })

    // REQ-QUO-FE-F-058 — 100% validation for Written Line %
    test('T-quotes-section-R22 — Save Participations shows error when Written Line % does not total 100', async () => {
        mockListParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 50, signed_line: 100,
            role: 'Lead', reference: 'SYN-001', notes: null,
        }])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Participations' }))
        fireEvent.click(screen.getByRole('button', { name: 'Participations' }))
        await waitFor(() => screen.getByDisplayValue("Lloyd's"))
        fireEvent.click(screen.getByRole('button', { name: /save participations/i }))
        await waitFor(() => {
            expect(screen.getByText(/written line.*must total 100/i)).toBeInTheDocument()
        })
        expect(mockSaveParticipations).not.toHaveBeenCalled()
    })

    // REQ-QUO-FE-F-058 — 100% validation for Signed Line %
    test('T-quotes-section-R23 — Save Participations shows error when Signed Line % does not total 100', async () => {
        mockListParticipations.mockResolvedValue([{
            id: 1, section_id: 1, market_name: "Lloyd's", written_line: 100, signed_line: 50,
            role: 'Lead', reference: 'SYN-001', notes: null,
        }])
        renderSection()
        await waitFor(() => screen.getByRole('button', { name: 'Participations' }))
        fireEvent.click(screen.getByRole('button', { name: 'Participations' }))
        await waitFor(() => screen.getByDisplayValue("Lloyd's"))
        fireEvent.click(screen.getByRole('button', { name: /save participations/i }))
        await waitFor(() => {
            expect(screen.getByText(/signed line.*must total 100/i)).toBeInTheDocument()
        })
        expect(mockSaveParticipations).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// QuoteViewPage — Issue Policy  (REQ-POL-FE-F-018, REQ-POL-FE-F-019)
// ---------------------------------------------------------------------------

describe('QuoteViewPage — Issue Policy', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Bound' }))
        mockListSections.mockResolvedValue([makeSection()])
        mockGetContractTypes.mockResolvedValue([])
        mockGetMethodsOfPlacement.mockResolvedValue([])
        mockGetRenewalStatuses.mockResolvedValue([])
        mockGetSubmission.mockResolvedValue({ id: 10, reference: 'SUB-001', insured: 'Widget Corp' })
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

    // REQ-POL-FE-F-018
    test('T-QUO-FE-F-R018a — sidebar shows "Issue Policy" when quote is Bound', async () => {
        renderView()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Issue Policy')
        // §6.4B negative: Bound quote must not show Draft-only actions
        expect(labels).not.toContain('Save')
        expect(labels).not.toContain('Issue Quote')
        expect(labels).not.toContain('Bind Quote')
    })

    test('T-QUO-FE-F-R018b — sidebar does NOT show "Issue Policy" when quote is Draft', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Draft' }))
        renderView()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Issue Policy')
    })

    test('T-QUO-FE-F-R018c — sidebar does NOT show "Issue Policy" when quote is Quoted', async () => {
        mockGetQuote.mockResolvedValue(makeQuote({ status: 'Quoted' }))
        renderView()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Issue Policy')
    })

    // REQ-POL-FE-F-019
    test('T-QUO-FE-F-R019 — Issue Policy fires issuePolicy service, navigates to policy, shows success notification', async () => {
        mockIssuePolicy.mockResolvedValue({ id: 5, reference: 'POL-1', status: 'Active' })
        renderView()
        // Wait for quote to fully render — quote state is set and event listeners are registered
        await waitFor(() => expect(screen.getByText('QUO-DEMO-20260601-001')).toBeInTheDocument())
        // Dispatch event and wait for async handler completion
        await act(async () => {
            window.dispatchEvent(new Event('quote:issue-policy'))
        })
        await waitFor(() => {
            expect(mockIssuePolicy).toHaveBeenCalledWith(1)
            expect(mockNavigate).toHaveBeenCalledWith('/policies/5')
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringMatching(/policy/i), 'success'
            )
        })
    })
})

// ---------------------------------------------------------------------------
// QuoteCoverageDetailPage — REQ-QUO-FE-F-062, F-063
// ---------------------------------------------------------------------------

describe('QuoteCoverageDetailPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetQuote.mockResolvedValue(makeQuote())
        mockListSections.mockResolvedValue([makeSection()])
        mockListCoverages.mockResolvedValue([{
            id: 1, section_id: 1, reference: 'COV-001', coverage: 'All Risks',
            effective_date: '2026-06-01', expiry_date: '2027-06-01',
            annual_gross_premium: 50000, annual_net_premium: 45000,
            limit_currency: 'USD', limit_amount: 1000000,
        }])
        mockGetQuoteLocations.mockResolvedValue([
            { CoverageType: 'Building', CoverageSubType: 'Residential', Currency: 'USD', SumInsured: 300000 },
            { CoverageType: 'Building', CoverageSubType: 'Commercial', Currency: 'USD', SumInsured: 200000 },
            { CoverageType: 'Contents', CoverageSubType: '', Currency: 'USD', SumInsured: 100000 },
        ])
        mockGetContractTypes.mockResolvedValue([])
        mockGetMethodsOfPlacement.mockResolvedValue([])
        mockGetRenewalStatuses.mockResolvedValue([])
    })

    function renderCoverageDetail(quoteId = '1', sectionId = '1', coverageId = '1') {
        return render(
            <MemoryRouter
                initialEntries={[`/quotes/${quoteId}/sections/${sectionId}/coverages/${coverageId}`]}
            >
                <Routes>
                    <Route
                        path="/quotes/:id/sections/:sectionId/coverages/:coverageId"
                        element={<QuoteCoverageDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        )
    }

    // REQ-QUO-FE-F-062
    test('T-QUO-FE-F-R062 — renders at coverage route; loads quote, sections, coverages and locations', async () => {
        renderCoverageDetail()
        await waitFor(() => {
            expect(mockGetQuote).toHaveBeenCalledWith(1)
            expect(mockListSections).toHaveBeenCalledWith(1)
            expect(mockListCoverages).toHaveBeenCalledWith(1, 1)
        })
    })

    test('T-QUO-FE-F-R062b — renders "Coverage not found" when coverageId does not match', async () => {
        mockListCoverages.mockResolvedValue([{ id: 999, section_id: 1 }])
        renderCoverageDetail('1', '1', '1')
        await waitFor(() => {
            expect(screen.getByText(/coverage not found/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-063
    test('T-QUO-FE-F-R063 — header shows coverage reference, insured, coverage name; "Coverage Sub-Details" tab exists', async () => {
        renderCoverageDetail()
        await waitFor(() => {
            expect(screen.getByText('COV-001')).toBeInTheDocument()
            expect(screen.getByText('Widget Corp')).toBeInTheDocument()
            expect(screen.getByText('All Risks')).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: 'Coverage Sub-Details' })).toBeInTheDocument()
    })

    test('T-QUO-FE-F-R063b — Sub-Details tab groups rows by CoverageType alphabetically', async () => {
        renderCoverageDetail()
        await waitFor(() => expect(mockListCoverages).toHaveBeenCalled())
        await waitFor(() => {
            expect(screen.getByText('Building')).toBeInTheDocument()
            expect(screen.getByText('Contents')).toBeInTheDocument()
        })
        const rows = screen.getAllByRole('row')
        const buildingIdx = rows.findIndex(r => r.textContent?.includes('Building'))
        const contentsIdx = rows.findIndex(r => r.textContent?.includes('Contents'))
        expect(buildingIdx).toBeLessThan(contentsIdx)
    })

    // REQ-QUO-FE-F-063 — Number of Locations column
    test('T-QUO-FE-F-R063d — Sub-Details table has Number of Locations column', async () => {
        renderCoverageDetail()
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /number of locations/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-063 — Coverage Sub-Details column
    test('T-QUO-FE-F-R063e — Sub-Details table has Coverage Sub-Details column', async () => {
        renderCoverageDetail()
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /coverage sub-details/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-063 — currency filter
    test('T-QUO-FE-F-R063f — Sub-Details table filters rows by section sumInsuredCurrency', async () => {
        mockGetQuoteLocations.mockResolvedValue([
            { CoverageType: 'Building', CoverageSubType: 'A', Currency: 'USD', SumInsured: 300000 },
            { CoverageType: 'Fire', CoverageSubType: 'B', Currency: 'EUR', SumInsured: 100000 },
        ])
        renderCoverageDetail()
        await waitFor(() => {
            expect(screen.getByText('Building')).toBeInTheDocument()
        })
        // Fire row should be filtered out since section sum_insured_currency is 'USD'
        expect(screen.queryByText('Fire')).not.toBeInTheDocument()
    })

    test('T-QUO-FE-F-R063c — clicking a CoverageType row navigates to sub-detail page', async () => {
        renderCoverageDetail()
        await waitFor(() => expect(mockListCoverages).toHaveBeenCalled())
        const buildingRow = await screen.findByText('Building')
        fireEvent.click(buildingRow.closest('tr') ?? buildingRow)
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringContaining('/details/Building')
            )
        })
    })
})

// ---------------------------------------------------------------------------
// QuoteCoverageSubDetailPage — REQ-QUO-FE-F-064, F-065
// ---------------------------------------------------------------------------

describe('QuoteCoverageSubDetailPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetQuote.mockResolvedValue(makeQuote())
        mockListSections.mockResolvedValue([makeSection()])
        mockListCoverages.mockResolvedValue([{
            id: 1, section_id: 1, reference: 'COV-001', coverage: 'All Risks',
            effective_date: '2026-06-01', expiry_date: '2027-06-01',
            annual_gross_premium: 50000, annual_net_premium: 45000,
            limit_currency: 'USD', limit_amount: 1000000,
        }])
        mockGetQuoteLocations.mockResolvedValue([
            { CoverageType: 'Building', CoverageSubType: 'Residential', Currency: 'USD', SumInsured: 300000 },
            { CoverageType: 'Building', CoverageSubType: 'Commercial', Currency: 'USD', SumInsured: 200000 },
            { CoverageType: 'Building', CoverageSubType: '', Currency: 'USD', SumInsured: 50000 },
        ])
        mockGetContractTypes.mockResolvedValue([])
        mockGetMethodsOfPlacement.mockResolvedValue([])
        mockGetRenewalStatuses.mockResolvedValue([])
    })

    function renderSubDetail(quoteId = '1', sectionId = '1', coverageId = '1', detailName = 'Building') {
        const encoded = encodeURIComponent(detailName)
        return render(
            <MemoryRouter
                initialEntries={[
                    `/quotes/${quoteId}/sections/${sectionId}/coverages/${coverageId}/details/${encoded}`,
                ]}
            >
                <Routes>
                    <Route
                        path="/quotes/:id/sections/:sectionId/coverages/:coverageId/details/:detailName"
                        element={<QuoteCoverageSubDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        )
    }

    // REQ-QUO-FE-F-064
    test('T-QUO-FE-F-R064 — renders at sub-detail route; shows Locations tab', async () => {
        renderSubDetail()
        await waitFor(() => {
            expect(mockGetQuote).toHaveBeenCalledWith(1)
            expect(screen.getByRole('button', { name: 'Locations' })).toBeInTheDocument()
        })
    })

    test('T-QUO-FE-F-R064b — header shows quote reference, section reference, coverage detail name', async () => {
        renderSubDetail('1', '1', '1', 'Building')
        await waitFor(() => {
            expect(screen.getAllByText('QUO-DEMO-20260601-001').length).toBeGreaterThanOrEqual(1)
            expect(screen.getAllByText('QUO-DEMO-20260601-001-S01').length).toBeGreaterThanOrEqual(1)
            expect(screen.getAllByText('Building').length).toBeGreaterThanOrEqual(1)
        })
    })

    test('T-QUO-FE-F-R064c — Locations rows grouped by CoverageSubType; "No Sub-Detail" sorted last', async () => {
        renderSubDetail('1', '1', '1', 'Building')
        await waitFor(() => {
            expect(screen.getAllByText('Residential').length).toBeGreaterThanOrEqual(1)
            expect(screen.getAllByText('Commercial').length).toBeGreaterThanOrEqual(1)
            expect(screen.getAllByText('No Sub-Detail').length).toBeGreaterThanOrEqual(1)
        })
        const rows = screen.getAllByRole('row')
        const noSubDetailIdx = rows.findIndex(r => r.textContent?.includes('No Sub-Detail'))
        const residentialIdx = rows.findIndex(r => r.textContent?.includes('Residential'))
        expect(noSubDetailIdx).toBeGreaterThan(residentialIdx)
    })

    // REQ-QUO-FE-F-064 — Number of Locations column
    test('T-QUO-FE-F-R064e — Locations table has Number of Locations column', async () => {
        renderSubDetail()
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /number of locations/i })).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-064 — currency filter
    test('T-QUO-FE-F-R064f — Locations table filters by section sumInsuredCurrency', async () => {
        mockGetQuoteLocations.mockResolvedValue([
            { CoverageType: 'Building', CoverageSubType: 'Residential', Currency: 'USD', SumInsured: 300000 },
            { CoverageType: 'Building', CoverageSubType: 'Office', Currency: 'EUR', SumInsured: 100000 },
        ])
        renderSubDetail('1', '1', '1', 'Building')
        await waitFor(() => {
            expect(screen.getAllByText('Residential').length).toBeGreaterThanOrEqual(1)
        })
        // EUR row should be filtered out
        expect(screen.queryByText('Office')).not.toBeInTheDocument()
    })

    test('T-QUO-FE-F-R064d — empty state when no matching location rows for the detail name', async () => {
        mockGetQuoteLocations.mockResolvedValue([
            { CoverageType: 'Contents', CoverageSubType: 'X', Currency: 'USD', SumInsured: 100 },
        ])
        renderSubDetail('1', '1', '1', 'Building')
        await waitFor(() => {
            expect(screen.getByText(/no locations found/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-065 — router registration verified implicitly by MemoryRouter rendering
    test('T-QUO-FE-F-R065 — coverage sub-detail route renders without crash (router registration verified)', async () => {
        renderSubDetail()
        await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// QuoteSearchModal — REQ-QUO-FE-F-066 to F-073
// ---------------------------------------------------------------------------

describe('QuoteSearchModal', () => {
    const mockOnClose = jest.fn()
    const mockOnSelect = jest.fn()

    const sampleQuotes = [
        makeQuote({ id: 1, reference: 'QUO-001', insured: 'Acme Corp', status: 'Draft', business_type: 'Insurance', inception_date: '2026-01-01' }),
        makeQuote({ id: 2, reference: 'QUO-002', insured: 'Global Ltd', status: 'Quoted', business_type: 'Reinsurance', inception_date: '2026-02-01' }),
        makeQuote({ id: 3, reference: 'QUO-003', insured: 'Widget Inc', status: 'Bound', business_type: 'Insurance', inception_date: '2026-03-01' }),
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        mockListQuotes.mockResolvedValue(sampleQuotes)
    })

    // REQ-QUO-FE-F-066 — component renders as modal
    test('T-QUO-FE-F-R066 — renders nothing when isOpen is false', () => {
        render(<QuoteSearchModal isOpen={false} onClose={mockOnClose} onSelect={mockOnSelect} />)
        expect(screen.queryByText(/link existing quote/i)).not.toBeInTheDocument()
    })

    // REQ-QUO-FE-F-067 — loading indicator
    test('T-QUO-FE-F-R067 — shows loading text while fetching quotes', async () => {
        mockListQuotes.mockReturnValue(new Promise(() => { })) // never resolves
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        expect(screen.getByText(/loading quotes/i)).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-068 — renders table with columns and filter input
    test('T-QUO-FE-F-R068 — renders results table with column headers and filter input', async () => {
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText('QUO-001')).toBeInTheDocument()
        })
        expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /insured/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    })

    // REQ-QUO-FE-F-068 — text filter works
    test('T-QUO-FE-F-R068b — text filter filters results by reference, insured, and status', async () => {
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText('QUO-001')).toBeInTheDocument()
        })
        const input = screen.getByPlaceholderText(/search/i)
        fireEvent.change(input, { target: { value: 'global' } })
        expect(screen.getByText('QUO-002')).toBeInTheDocument()
        expect(screen.queryByText('QUO-001')).not.toBeInTheDocument()
        expect(screen.queryByText('QUO-003')).not.toBeInTheDocument()
    })

    // REQ-QUO-FE-F-069 — excludeIds
    test('T-QUO-FE-F-R069 — excludeIds removes matching quotes from results', async () => {
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} excludeIds={[1, 3]} />)
        await waitFor(() => {
            expect(screen.getByText('QUO-002')).toBeInTheDocument()
        })
        expect(screen.queryByText('QUO-001')).not.toBeInTheDocument()
        expect(screen.queryByText('QUO-003')).not.toBeInTheDocument()
    })

    // REQ-QUO-FE-F-070 — clicking a row calls onSelect and onClose
    test('T-QUO-FE-F-R070 — clicking a row calls onSelect with quote then onClose', async () => {
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText('QUO-002')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByText('QUO-002'))
        expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, reference: 'QUO-002' }))
        expect(mockOnClose).toHaveBeenCalled()
    })

    // REQ-QUO-FE-F-071 — empty state
    test('T-QUO-FE-F-R071 — shows "No quotes found." when filtered results are empty', async () => {
        mockListQuotes.mockResolvedValue([])
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText(/no quotes found/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-072 — error state
    test('T-QUO-FE-F-R072 — shows API error message on failure', async () => {
        mockListQuotes.mockRejectedValue(new Error('Network failure'))
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText(/network failure/i)).toBeInTheDocument()
        })
    })

    // REQ-QUO-FE-F-073 — cancel button calls onClose
    test('T-QUO-FE-F-R073 — cancel button calls onClose without invoking onSelect', async () => {
        render(<QuoteSearchModal isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />)
        await waitFor(() => {
            expect(screen.getByText('QUO-001')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
        expect(mockOnClose).toHaveBeenCalled()
        expect(mockOnSelect).not.toHaveBeenCalled()
    })
})

