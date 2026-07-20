/**
 * PolicySectionFinanceSummary.test.tsx — Earning Engine Frontend tests
 * Domain: EARN
 * Requirements: backend/nest/src/earnings-config/earning-engine.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests: T-EARN-FE-001 through T-EARN-FE-007
 *
 * RED STATE — PolicySectionFinanceSummary.tsx does not exist yet. The import below
 * will fail at runtime until the component is created. That is the expected RED state
 * per the Three-Artifact Rule (§03). Finance Summary tabs in PolicySectionViewPage
 * and PolicyViewPage are also tested here (REQ-EARN-F-015, REQ-EARN-F-016) — those
 * tests will fail RED until the tabs are added to the existing page components.
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// RED imports — these components do not exist yet.
// ---------------------------------------------------------------------------
import PolicySectionFinanceSummary from '../PolicySectionFinanceSummary'

// ---------------------------------------------------------------------------
// Existing imports (pages modified to add Finance Summary tab).
// ---------------------------------------------------------------------------
import PolicySectionViewPage from '../PolicySectionViewPage/PolicySectionViewPage'
import PolicyViewPage from '../PolicyViewPage/PolicyViewPage'
import EarningsConfigPage from '../../settings/EarningsConfigPage'

// ===========================================================================
// Mocks
// ===========================================================================

// ---------------------------------------------------------------------------
// api-client — named function exports (per copilot-instructions.md §API rule)
// ---------------------------------------------------------------------------
const mockApiGet = jest.fn()
const mockApiPost = jest.fn()
jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: jest.fn(),
    del: jest.fn(),
    patch: jest.fn(),
}))

// ---------------------------------------------------------------------------
// auth-session
// ---------------------------------------------------------------------------
jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'TST', email: 'jane@test.com', role: 'client_admin' },
    }),
}))

// ---------------------------------------------------------------------------
// shell
// ---------------------------------------------------------------------------
const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

// ---------------------------------------------------------------------------
// policies.service (for PolicySectionViewPage and PolicyViewPage)
// ---------------------------------------------------------------------------
const mockGetPolicy = jest.fn()
const mockGetPolicySectionDetails = jest.fn()
const mockGetPolicySections = jest.fn()
const mockGetPolicyCoverages = jest.fn()
const mockGetClassesOfBusiness = jest.fn()
const mockGetPolicyInvoices = jest.fn()
const mockGetPolicyTransactions = jest.fn()
const mockGetPolicyAudit = jest.fn()
const mockPostPolicyAudit = jest.fn()
const mockGetPolicyEndorsements = jest.fn()
const mockGetPolicyLocations = jest.fn()

jest.mock('@/policies/policies.service', () => ({
    getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
    getPolicySectionDetails: (...args: unknown[]) => mockGetPolicySectionDetails(...args),
    getPolicySections: (...args: unknown[]) => mockGetPolicySections(...args),
    getPolicyCoverages: (...args: unknown[]) => mockGetPolicyCoverages(...args),
    getClassesOfBusiness: (...args: unknown[]) => mockGetClassesOfBusiness(...args),
    getPolicyInvoices: (...args: unknown[]) => mockGetPolicyInvoices(...args),
    getPolicyTransactions: (...args: unknown[]) => mockGetPolicyTransactions(...args),
    getPolicyAudit: (...args: unknown[]) => mockGetPolicyAudit(...args),
    postPolicyAudit: (...args: unknown[]) => mockPostPolicyAudit(...args),
    getPolicyEndorsements: (...args: unknown[]) => mockGetPolicyEndorsements(...args),
    getPolicyLocations: (...args: unknown[]) => mockGetPolicyLocations(...args),
    getCurrencies: jest.fn().mockResolvedValue([]),
    getLossQualifiers: jest.fn().mockResolvedValue([]),
    createPolicy: jest.fn(),
    updatePolicy: jest.fn(),
}))

// ---------------------------------------------------------------------------
// settings.service (for EarningsConfigPage / RuleForm)
// ---------------------------------------------------------------------------
const mockGetEarningPatterns = jest.fn()
const mockGetEarningRules = jest.fn()
jest.mock('@/settings/settings.service', () => ({
    getEarningPatterns: (...args: unknown[]) => mockGetEarningPatterns(...args),
    createEarningPattern: jest.fn(),
    deactivateEarningPattern: jest.fn(),
    getPatternPoints: jest.fn().mockResolvedValue([]),
    createPatternPoint: jest.fn(),
    deletePatternPoint: jest.fn(),
    getEarningRules: (...args: unknown[]) => mockGetEarningRules(...args),
    createEarningRule: jest.fn(),
    updateEarningRule: jest.fn(),
    deactivateEarningRule: jest.fn(),
}))

// ---------------------------------------------------------------------------
// Shared UI dependencies (avoid react-icons / design system imports failing)
// ---------------------------------------------------------------------------
jest.mock('@/shared/Card/Card', () =>
    function CardMock({ children }: { children: React.ReactNode }) {
        return <div data-testid="card">{children}</div>
    },
)

jest.mock('@/shared/LoadingSpinner/LoadingSpinner', () =>
    function SpinnerMock() {
        return <div data-testid="loading-spinner" aria-label="Loading" />
    },
)

jest.mock('@/shared/components/TabsNav/TabsNav', () =>
    function TabsNavMock({ tabs, activeKey, onChange }: { tabs: Array<{ key: string; label: string }>; activeKey: string; onChange: (key: string) => void }) {
        return (
            <nav>
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => onChange(t.key)} aria-pressed={t.key === activeKey}>
                        {t.label}
                    </button>
                ))}
            </nav>
        )
    },
)

jest.mock('@/shared/components/ResizableGrid/ResizableGrid', () =>
    function GridMock() {
        return <div data-testid="resizable-grid" />
    },
)

jest.mock('@/shared/components/FieldGroup/FieldGroup', () =>
    function FieldGroupMock({ children }: { children?: React.ReactNode }) {
        return <div data-testid="field-group">{children}</div>
    },
)

jest.mock('@/parties/BrokerSearch/BrokerSearch', () =>
    function BrokerSearchMock() {
        return <div data-testid="broker-search" />
    },
)

jest.mock('@/shared/components/AuditTable/AuditTable', () =>
    function AuditTableMock() {
        return <div data-testid="audit-table" />
    },
)

jest.mock('@/locations/LocationsScheduleTab/LocationsScheduleTab', () =>
    function LocationsMock() {
        return <div data-testid="locations-tab" />
    },
)

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

// ===========================================================================
// Factories
// ===========================================================================

function makeEarningPeriodRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 1,
        policySectionId: 42,
        orgCode: 'TST',
        periodYear: 2026,
        periodMonth: 1,
        totalPremium: '310.0000',
        earnedAmount: '310.0000',
        unearnedAmount: '0.0000',
        daysInPeriod: 31,
        daysEarned: 31,
        earnByBasis: 'day',
        calculatedAt: '2026-06-01T02:00:00Z',
        ...overrides,
    }
}

function makePolicy(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 1,
        reference: 'POL-001',
        insured: 'Acme Corp',
        insured_id: 'party-1',
        status: 'Active',
        gross_premium: 10000,
        net_premium: 9000,
        class_of_business: 'Marine',
        contract_type: 'Open Market',
        inception_date: '2026-01-01',
        expiry_date: '2026-12-31',
        policy_currency: 'GBP',
        business_type: null,
        new_or_renewal: 'New',
        placing_broker: null,
        ...overrides,
    }
}

function makeSection(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 42,
        policyId: 1,
        reference: 'SEC-001',
        class_of_business: 'Marine',
        inception_date: '2026-01-01',
        expiry_date: '2026-12-31',
        gross_written_premium: 10000,
        ...overrides,
    }
}

function makeSamplePattern() {
    return {
        id: 1,
        orgCode: 'TST',
        name: 'Marine Straight Line',
        patternType: 'straight_line',
        earnBy: 'day',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
    }
}

// ===========================================================================
// T-EARN-FE-001 to T-EARN-FE-004: REQ-EARN-F-014 — PolicySectionFinanceSummary component
// ===========================================================================

describe('T-EARN-FE-001 through T-EARN-FE-004: REQ-EARN-F-014 — PolicySectionFinanceSummary component behaviour', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    // @req REQ-EARN-F-014
    it('T-EARN-FE-001: renders loading indicator while API fetch is in flight', async () => {
        // Arrange: API call never resolves
        mockApiGet.mockReturnValue(new Promise(() => { }))

        // Act
        render(<PolicySectionFinanceSummary sectionId={42} />)

        // Assert: loading state is shown immediately
        expect(
            screen.getByTestId('loading-spinner') ||
            screen.getByLabelText(/loading/i) ||
            screen.getByRole('status'),
        ).toBeInTheDocument()
    })

    // @req REQ-EARN-F-014
    it('T-EARN-FE-002: renders empty-state message and no table rows when API returns empty array', async () => {
        // Arrange: API returns empty
        mockApiGet.mockResolvedValue([])

        // Act
        await act(async () => {
            render(<PolicySectionFinanceSummary sectionId={42} />)
        })

        await waitFor(() => {
            expect(mockApiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/earning-engine/sections/42/periods'),
            )
        })

        // Assert: empty state message present, no table rows
        expect(screen.getByText(/no earning periods/i)).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    // @req REQ-EARN-F-014
    it('T-EARN-FE-003: renders table with correct column headers when API returns data', async () => {
        // Arrange: API returns one period row
        const periods = [
            makeEarningPeriodRow({ periodYear: 2026, periodMonth: 1 }),
            makeEarningPeriodRow({ id: 2, periodYear: 2026, periodMonth: 2 }),
        ]
        mockApiGet.mockResolvedValue(periods)

        // Act
        await act(async () => {
            render(<PolicySectionFinanceSummary sectionId={42} />)
        })

        await waitFor(() => expect(screen.queryByRole('table')).toBeInTheDocument())

        // Assert: all six required columns are present
        expect(screen.getByText(/calendar period/i)).toBeInTheDocument()
        expect(screen.getByText(/total premium/i)).toBeInTheDocument()
        expect(screen.getByText(/earned/i)).toBeInTheDocument()
        expect(screen.getByText(/unearned/i)).toBeInTheDocument()
        expect(screen.getByText(/basis/i)).toBeInTheDocument()
        expect(screen.getByText(/days/i)).toBeInTheDocument()
    })

    // @req REQ-EARN-F-014
    it('T-EARN-FE-004: renders error message when API returns an error, without a table', async () => {
        // Arrange: API rejects
        mockApiGet.mockRejectedValue(new Error('Network error'))

        // Act
        await act(async () => {
            render(<PolicySectionFinanceSummary sectionId={42} />)
        })

        await waitFor(() => {
            expect(screen.queryByRole('table')).not.toBeInTheDocument()
        })

        // Assert: error message present
        expect(
            screen.getByText(/error|failed|could not load/i),
        ).toBeInTheDocument()
    })
})

// ===========================================================================
// T-EARN-FE-005: REQ-EARN-F-015 — "Finance Summary" tab on Policy Section view page
// ===========================================================================

describe('T-EARN-FE-005: REQ-EARN-F-015 — Finance Summary tab rendered on PolicySectionViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySectionDetails.mockResolvedValue(makeSection())
        mockGetPolicyCoverages.mockResolvedValue([])
        mockGetClassesOfBusiness.mockResolvedValue([])
        mockApiGet.mockResolvedValue([])
    })

    function renderPolicySectionView() {
        return render(
            <MemoryRouter initialEntries={['/policies/1/sections/42']}>
                <Routes>
                    <Route path="/policies/:policyId/sections/:sectionId" element={<PolicySectionViewPage />} />
                </Routes>
            </MemoryRouter>,
        )
    }

    // @req REQ-EARN-F-015
    it('T-EARN-FE-005a: PolicySectionViewPage renders a tab labelled "Finance Summary"', async () => {
        renderPolicySectionView()

        await waitFor(() => {
            expect(screen.getByText(/Finance Summary/i)).toBeInTheDocument()
        })
    })

    // @req REQ-EARN-F-015
    it('T-EARN-FE-005b: selecting Finance Summary tab triggers a fetch to earning periods endpoint', async () => {
        renderPolicySectionView()

        await waitFor(() => screen.getByText(/Finance Summary/i))

        await act(async () => {
            await userEvent.click(screen.getByText(/Finance Summary/i))
        })

        await waitFor(() => {
            expect(mockApiGet).toHaveBeenCalledWith(
                expect.stringContaining('/api/earning-engine/sections/42/periods'),
            )
        })
    })
})

// ===========================================================================
// T-EARN-FE-006: REQ-EARN-F-016 — "Finance Summary" tab on Policy layer view page
// ===========================================================================

describe('T-EARN-FE-006: REQ-EARN-F-016 — Finance Summary tab rendered on PolicyViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySections.mockResolvedValue([makeSection()])
        mockGetPolicyInvoices.mockResolvedValue([])
        mockGetPolicyTransactions.mockResolvedValue([])
        mockGetPolicyAudit.mockResolvedValue([])
        mockGetPolicyEndorsements.mockResolvedValue([])
        mockGetPolicyLocations.mockResolvedValue([])
        mockPostPolicyAudit.mockResolvedValue(undefined)
        mockApiGet.mockResolvedValue([])
    })

    function renderPolicyView() {
        return render(
            <MemoryRouter initialEntries={['/policies/1']}>
                <Routes>
                    <Route path="/policies/:id" element={<PolicyViewPage />} />
                </Routes>
            </MemoryRouter>,
        )
    }

    // @req REQ-EARN-F-016
    it('T-EARN-FE-006a: PolicyViewPage renders a tab labelled "Finance Summary"', async () => {
        renderPolicyView()

        await waitFor(() => {
            expect(screen.getByText(/Finance Summary/i)).toBeInTheDocument()
        })
    })

    // @req REQ-EARN-F-016
    it('T-EARN-FE-006b: Finance Summary tab on Policy view displays aggregate earned and unearned totals', async () => {
        const aggregatePeriods = [
            { periodYear: 2026, periodMonth: 1, earnedAmount: '500.0000', unearnedAmount: '700.0000' },
            { periodYear: 2026, periodMonth: 2, earnedAmount: '600.0000', unearnedAmount: '600.0000' },
        ]
        mockApiGet.mockImplementation((url: string) => {
            if (url.includes('earning-engine') || url.includes('finance-summary')) {
                return Promise.resolve(aggregatePeriods)
            }
            return Promise.resolve([])
        })

        renderPolicyView()

        await waitFor(() => screen.getByText(/Finance Summary/i))

        await act(async () => {
            await userEvent.click(screen.getByText(/Finance Summary/i))
        })

        // Assert: aggregate totals are displayed
        await waitFor(() => {
            expect(screen.getByText(/earned/i)).toBeInTheDocument()
            expect(screen.getByText(/unearned/i)).toBeInTheDocument()
        })
    })
})

// ===========================================================================
// T-EARN-FE-007: REQ-EARN-F-017 — RuleForm in EarningsConfigPage renders no product selector
// ===========================================================================

describe('T-EARN-FE-007: REQ-EARN-F-017 — RuleForm renders no product selector field', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetEarningPatterns.mockResolvedValue([makeSamplePattern()])
        mockGetEarningRules.mockResolvedValue([])
    })

    function renderEarningsPage() {
        return render(
            <MemoryRouter>
                <EarningsConfigPage />
            </MemoryRouter>,
        )
    }

    // @req REQ-EARN-F-017
    it('T-EARN-FE-007a: RuleForm renders no product selector (no label containing "Product")', async () => {
        renderEarningsPage()

        // Switch to the Rules tab
        await waitFor(() => screen.getByRole('button', { name: /rules/i }))
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: /rules/i }))
        })

        await waitFor(() => mockGetEarningRules.mock.calls.length > 0)

        // Open the rule creation form
        const addRuleBtn = await screen.findByRole('button', { name: /add rule|new rule/i })
        await act(async () => {
            await userEvent.click(addRuleBtn)
        })

        // Assert: RuleForm is rendered but no product selector is present
        expect(screen.getByLabelText(/pattern/i)).toBeInTheDocument()
        expect(screen.queryByLabelText(/product/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/product/i)).not.toBeInTheDocument()
    })

    // @req REQ-EARN-F-017
    it('T-EARN-FE-007b: rule creation payload does not include product_id when form is submitted', async () => {
        const { createEarningRule } = jest.requireMock('@/settings/settings.service')
        createEarningRule.mockResolvedValue({
            id: 99,
            orgCode: 'TST',
            patternId: 1,
            priority: 0,
            classOfBusiness: null,
            contractType: null,
            includeIncepted: true,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
        })

        renderEarningsPage()

        await waitFor(() => screen.getByRole('button', { name: /rules/i }))
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: /rules/i }))
        })

        await waitFor(() => mockGetEarningRules.mock.calls.length > 0)

        const addRuleBtn = await screen.findByRole('button', { name: /add rule|new rule/i })
        await act(async () => {
            await userEvent.click(addRuleBtn)
        })

        // Submit the rule form
        const saveBtn = screen.getByRole('button', { name: /save rule/i })
        await act(async () => {
            await userEvent.click(saveBtn)
        })

        await waitFor(() => expect(createEarningRule).toHaveBeenCalled())

        // Assert: the payload sent to createEarningRule has no product_id key
        const payload = createEarningRule.mock.calls[0][0] as Record<string, unknown>
        expect(Object.prototype.hasOwnProperty.call(payload, 'productId')).toBe(false)
        expect(Object.prototype.hasOwnProperty.call(payload, 'product_id')).toBe(false)
    })
})
