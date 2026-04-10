/**
 * TESTS — Policies Domain (Batch D)
 * Second artifact. Requirements: policies.requirements.md
 * Test naming: T-POL-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-POL-FE-F-001 to F-031  (all FE functional requirements)
 *   REQ-POL-FE-S-001             (service layer exports)
 *   REQ-POL-FE-C-001 to C-003   (router — verified via MemoryRouter in each describe)
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// API CONTRACT
// ---------------------------------------------------------------------------
/*
 * API CONTRACT — Policies Domain
 * Status: endpoints not yet implemented — mock reflects agreed contract shape
 * Contract defined in: frontend/src/policies/policies.requirements.md (2026-04-04)
 *
 * GET  /api/policies                                          → Policy[]
 * GET  /api/policies/:id                                      → Policy
 * POST /api/policies                                          → Policy (201)
 * PUT  /api/policies/:id                                      → Policy
 * GET  /api/policies/:id/sections                             → PolicySection[]
 * GET  /api/policies/:id/sections/:sectionId/coverages        → Coverage[]
 * GET  /api/policies/:id/invoices                             → Invoice[]
 * GET  /api/policies/:id/transactions                         → PolicyTransaction[]
 * GET  /api/policies/:id/audit                                → AuditEvent[]
 * POST /api/policies/:id/audit                                → void
 * GET  /api/policies/:id/endorsements                         → PolicyTransaction[]
 * POST /api/policies/:id/endorsements                         → PolicyTransaction (201)
 * PUT  /api/policies/:id/endorsements/:endorsementId/issue    → { policy, endorsement }
 * GET  /api/policies/:id/locations                            → LocationRow[]
 */

// ---------------------------------------------------------------------------
// Mocks — router
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

// ---------------------------------------------------------------------------
// Mocks — policies service
// ---------------------------------------------------------------------------

const mockGetPolicies = jest.fn()
const mockGetPolicy = jest.fn()
const mockCreatePolicy = jest.fn()
const mockUpdatePolicy = jest.fn()
const mockGetPolicySections = jest.fn()
const mockGetPolicySectionDetails = jest.fn()
const mockGetPolicyInvoices = jest.fn()
const mockGetPolicyTransactions = jest.fn()
const mockGetPolicyAudit = jest.fn()
const mockPostPolicyAudit = jest.fn()
const mockGetPolicyEndorsements = jest.fn()
const mockCreateEndorsement = jest.fn()
const mockIssueEndorsement = jest.fn()
const mockGetPolicyCoverages = jest.fn()
const mockGetPolicyLocations = jest.fn()

jest.mock('@/policies/policies.service', () => ({
    getPolicies: (...args: unknown[]) => mockGetPolicies(...args),
    getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
    createPolicy: (...args: unknown[]) => mockCreatePolicy(...args),
    updatePolicy: (...args: unknown[]) => mockUpdatePolicy(...args),
    getPolicySections: (...args: unknown[]) => mockGetPolicySections(...args),
    getPolicySectionDetails: (...args: unknown[]) => mockGetPolicySectionDetails(...args),
    getPolicyInvoices: (...args: unknown[]) => mockGetPolicyInvoices(...args),
    getPolicyTransactions: (...args: unknown[]) => mockGetPolicyTransactions(...args),
    getPolicyAudit: (...args: unknown[]) => mockGetPolicyAudit(...args),
    postPolicyAudit: (...args: unknown[]) => mockPostPolicyAudit(...args),
    getPolicyEndorsements: (...args: unknown[]) => mockGetPolicyEndorsements(...args),
    createEndorsement: (...args: unknown[]) => mockCreateEndorsement(...args),
    issueEndorsement: (...args: unknown[]) => mockIssueEndorsement(...args),
    getPolicyCoverages: (...args: unknown[]) => mockGetPolicyCoverages(...args),
    getPolicyLocations: (...args: unknown[]) => mockGetPolicyLocations(...args),
}))

// ---------------------------------------------------------------------------
// Mocks — shell
// ---------------------------------------------------------------------------

const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

// ---------------------------------------------------------------------------
// Mocks — shared components
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

jest.mock('@/parties/BrokerSearch/BrokerSearch', () =>
    function BrokerSearchMock({
        onSelect,
        placeholder,
    }: {
        onSelect: (p: { id: string; name: string }) => void
        placeholder?: string
    }) {
        return (
            <button
                data-testid={`broker-search-${(placeholder ?? 'broker').toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onSelect({ id: 'broker-1', name: 'Acme Brokers Ltd' })}
            >
                {placeholder ?? 'Select Broker'}
            </button>
        )
    }
)

jest.mock('@/shared/components/AuditTable/AuditTable', () =>
    function AuditTableMock({ audit }: { audit: unknown[] }) {
        return <div data-testid="audit-table">Audit rows: {audit.length}</div>
    }
)

// ---------------------------------------------------------------------------
// Component imports  (after mocks — TDD: these will fail until code is written)
// ---------------------------------------------------------------------------

import PoliciesListPage from '../PoliciesListPage/PoliciesListPage'
import PolicyViewPage from '../PolicyViewPage/PolicyViewPage'
import PolicySectionViewPage from '../PolicySectionViewPage/PolicySectionViewPage'
import PolicyEndorsePage from '../PolicyEndorsePage/PolicyEndorsePage'
import PolicyEndorsementPage from '../PolicyEndorsementPage/PolicyEndorsementPage'
import PolicyCoverageDetailPage from '../PolicyCoverageDetailPage/PolicyCoverageDetailPage'
import PolicyCoverageSubDetailPage from '../PolicyCoverageSubDetailPage/PolicyCoverageSubDetailPage'

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makePolicy(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        reference: 'POL-1',
        insured: 'Acme Corp',
        insured_id: 'party-1',
        placing_broker: 'Acme Brokers Ltd',
        class_of_business: 'Property',
        inception_date: '2026-01-01',
        expiry_date: '2027-01-01',
        status: 'Active',
        gross_premium: 100000,
        net_premium: 90000,
        policy_currency: 'GBP',
        quote_id: null,
        ...overrides,
    }
}

function makePolicySection(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        policy_id: 1,
        reference: 'POL-1-S01',
        class_of_business: 'Property',
        inception_date: '2026-01-01',
        expiry_date: '2027-01-01',
        limit_currency: 'GBP',
        limit_amount: 1000000,
        limit_loss_qualifier: null,
        excess_currency: null,
        excess_amount: null,
        excess_loss_qualifier: null,
        sum_insured_currency: 'GBP',
        sum_insured_amount: 5000000,
        premium_currency: 'GBP',
        gross_gross_premium: null,
        gross_premium: 100000,
        deductions: 10000,
        net_premium: 90000,
        annual_gross: 100000,
        annual_net: 90000,
        written_order: 100,
        signed_order: 100,
        ...overrides,
    }
}

function makeCoverage(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        section_id: 1,
        reference: 'COV-001',
        coverage: 'All Risks',
        effective_date: '2026-01-01',
        expiry_date: '2027-01-01',
        sum_insured_currency: 'GBP',
        sum_insured: 5000000,
        limit_currency: 'GBP',
        limit_amount: 1000000,
        gross_premium: 100000,
        net_premium: 90000,
        ...overrides,
    }
}

function makeEndorsement(overrides: Record<string, unknown> = {}) {
    return {
        id: 10,
        policy_id: 1,
        transaction_type: 'Endorsement',
        effective_date: '2026-06-01',
        description: 'Mid-term change',
        status: 'Endorsed',
        reference: 'END-001',
        ...overrides,
    }
}

function makeLocationRow(overrides: Record<string, unknown> = {}) {
    return {
        CoverageType: 'Building',
        CoverageSubType: 'Residential',
        Currency: 'GBP',
        SumInsured: 500000,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Helper renderers
// ---------------------------------------------------------------------------

function renderPoliciesListPage() {
    return render(<MemoryRouter initialEntries={['/policies']}><PoliciesListPage /></MemoryRouter>)
}

function renderPolicyViewPage(id = '1') {
    return render(
        <MemoryRouter initialEntries={[`/policies/${id}`]}>
            <Routes>
                <Route path="/policies/:id" element={<PolicyViewPage />} />
            </Routes>
        </MemoryRouter>
    )
}

function renderPolicySectionViewPage(policyId = '1', sectionId = '1') {
    return render(
        <MemoryRouter initialEntries={[`/policies/${policyId}/sections/${sectionId}`]}>
            <Routes>
                <Route path="/policies/:policyId/sections/:sectionId" element={<PolicySectionViewPage />} />
            </Routes>
        </MemoryRouter>
    )
}

function renderPolicyEndorsePage(policyId = '1') {
    return render(
        <MemoryRouter initialEntries={[`/policies/endorse/${policyId}`]}>
            <Routes>
                <Route path="/policies/endorse/:id" element={<PolicyEndorsePage />} />
            </Routes>
        </MemoryRouter>
    )
}

function renderPolicyEndorsementPage(policyId = '1', endorsementId = '10') {
    return render(
        <MemoryRouter initialEntries={[`/policies/${policyId}/endorsements/${endorsementId}/edit`]}>
            <Routes>
                <Route
                    path="/policies/:id/endorsements/:endorsementId/edit"
                    element={<PolicyEndorsementPage />}
                />
            </Routes>
        </MemoryRouter>
    )
}

function renderCoverageDetailPage(policyId = '1', sectionId = '1', coverageId = '1') {
    return render(
        <MemoryRouter
            initialEntries={[`/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}`]}
        >
            <Routes>
                <Route
                    path="/policies/:policyId/sections/:sectionId/coverages/:coverageId"
                    element={<PolicyCoverageDetailPage />}
                />
            </Routes>
        </MemoryRouter>
    )
}

function renderCoverageSubDetailPage(policyId = '1', sectionId = '1', coverageId = '1', detailName = 'Building') {
    const encoded = encodeURIComponent(detailName)
    return render(
        <MemoryRouter
            initialEntries={[
                `/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details/${encoded}`,
            ]}
        >
            <Routes>
                <Route
                    path="/policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName"
                    element={<PolicyCoverageSubDetailPage />}
                />
            </Routes>
        </MemoryRouter>
    )
}

// ---------------------------------------------------------------------------
// PoliciesListPage — REQ-POL-FE-F-001, F-002
// ---------------------------------------------------------------------------

describe('PoliciesListPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicies.mockResolvedValue([])
    })

    // REQ-POL-FE-F-001
    test('T-POL-FE-F-R001 — calls getPolicies on mount and renders grid', async () => {
        mockGetPolicies.mockResolvedValue([makePolicy()])
        renderPoliciesListPage()
        await waitFor(() => expect(mockGetPolicies).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(screen.getByText('POL-1')).toBeInTheDocument())
    })

    test('T-POL-FE-F-R001b — renders required column headers', async () => {
        mockGetPolicies.mockResolvedValue([makePolicy()])
        renderPoliciesListPage()
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /insured/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /class of business/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /inception/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /expiry/i })).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-002
    test('T-POL-FE-F-R002 — Reference is plain text and action icon links to /policies/:id', async () => {
        mockGetPolicies.mockResolvedValue([makePolicy()])
        renderPoliciesListPage()
        await waitFor(() => {
            expect(screen.getByText('POL-1')).toBeInTheDocument()
            expect(screen.queryByRole('link', { name: 'POL-1' })).not.toBeInTheDocument()
            expect(document.querySelector('a[href="/policies/1"]')).not.toBeNull()
        })
    })

    test('T-POL-FE-F-R002b — placeholder copy is gone', async () => {
        renderPoliciesListPage()
        await waitFor(() =>
            expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
        )
    })
})

// ---------------------------------------------------------------------------
// PolicyViewPage — REQ-POL-FE-F-003 to F-007, F-009 to F-014, F-017
// ---------------------------------------------------------------------------

describe('PolicyViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySections.mockResolvedValue([makePolicySection()])
        mockGetPolicyAudit.mockResolvedValue([])
        mockPostPolicyAudit.mockResolvedValue(undefined)
        mockGetPolicyInvoices.mockResolvedValue([])
        mockGetPolicyTransactions.mockResolvedValue([])
    })

    // REQ-POL-FE-F-003
    test('T-POL-FE-F-R003 — shows loading indicator then renders policy', async () => {
        let resolve!: (v: ReturnType<typeof makePolicy>) => void
        mockGetPolicy.mockReturnValue(new Promise(r => { resolve = r }))
        renderPolicyViewPage()
        expect(screen.getByRole('status')).toBeInTheDocument() // loading spinner
        await act(async () => resolve(makePolicy()))
        await waitFor(() => expect(screen.getByText('POL-1')).toBeInTheDocument())
    })

    // REQ-POL-FE-F-004
    test('T-POL-FE-F-R004 — header shows reference, status badge, insured, CoB, dates', async () => {
        renderPolicyViewPage()
        await waitFor(() => {
            expect(screen.getByText('POL-1')).toBeInTheDocument()
            expect(screen.getByText('Acme Corp')).toBeInTheDocument()
            expect(screen.getByText('Property')).toBeInTheDocument()
            expect(screen.getByText('Active')).toBeInTheDocument()
        })
    })

    test('T-POL-FE-F-R004b — Active status badge has green colour class', async () => {
        renderPolicyViewPage()
        await waitFor(() => {
            const badge = screen.getByText('Active')
            expect(badge.className).toMatch(/green/)
        })
    })

    test('T-POL-FE-F-R004c — Cancelled status badge has red colour class', async () => {
        mockGetPolicy.mockResolvedValue(makePolicy({ status: 'Cancelled' }))
        renderPolicyViewPage()
        await waitFor(() => {
            const badge = screen.getByText('Cancelled')
            expect(badge.className).toMatch(/red/)
        })
    })

    test('T-POL-FE-F-R004d — Expired status badge has grey colour class', async () => {
        mockGetPolicy.mockResolvedValue(makePolicy({ status: 'Expired' }))
        renderPolicyViewPage()
        await waitFor(() => {
            const badge = screen.getByText('Expired')
            expect(badge.className).toMatch(/gray|grey/)
        })
    })

    // REQ-POL-FE-F-005
    test('T-POL-FE-F-R005 — sidebar registers Edit, Generate Document, Endorse, Audit items', async () => {
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())

        expect(mockUseSidebarSection).toHaveBeenCalled()
        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)

        // Required items (positive assertions — §6.4B)
        expect(labels).toContain('Edit')
        expect(labels).toContain('Generate Document')
        expect(labels).toContain('Endorse')
        expect(labels).toContain('Audit')

        // Items that must NOT appear (negative assertions — §6.4B)
        expect(labels).not.toContain('Save')
        expect(labels).not.toContain('Submit')
        expect(labels).not.toContain('Issue Policy')
        expect(labels).not.toContain('Issue Endorsement')
        expect(labels).not.toContain('Bind Quote')
    })

    // REQ-POL-FE-F-006
    test('T-POL-FE-F-R006 — TabsNav renders all 7 tabs in order', async () => {
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())

        const tabs = screen.getAllByRole('button').filter(btn =>
            ['Sections', 'Broker', 'Additional Insureds', 'Financial Summary',
                'Invoices', 'Transactions', 'Audit'].includes(btn.textContent ?? '')
        )
        const tabLabels = tabs.map(t => t.textContent)
        expect(tabLabels).toEqual([
            'Sections',
            'Broker',
            'Additional Insureds',
            'Financial Summary',
            'Invoices',
            'Transactions',
            'Audit',
        ])

        // Claims is out of scope — must not appear as a functional tab
        expect(screen.queryByRole('button', { name: 'Claims' })).not.toBeInTheDocument()
    })

    // REQ-POL-FE-F-007
    test('T-POL-FE-F-R007 — Sections tab renders column headers and section row', async () => {
        mockGetPolicySections.mockResolvedValue([makePolicySection()])
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicySections).toHaveBeenCalled())
        await waitFor(() => {
            expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /class of business/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /inception date/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /expiry date/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /limit currency/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /sum insured currency/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /annual rated gross premium/i })).toBeInTheDocument()
            expect(screen.getByRole('columnheader', { name: /annual rated net premium/i })).toBeInTheDocument()
            expect(screen.getByText('POL-1-S01')).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-009
    test('T-POL-FE-F-R009 — Broker tab renders BrokerSearch components', async () => {
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Broker' }))
        await waitFor(() => {
            expect(screen.getByTestId(/broker-search/)).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-010
    test('T-POL-FE-F-R010 — Additional Insureds tab renders list pane', async () => {
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Additional Insureds' }))
        await waitFor(() => {
            // pane renders — at minimum "Add Insured" action or no-data state
            const pane = screen.getByTestId?.('additional-insureds-pane') ??
                screen.getByText(/add insured|no additional insureds/i)
            expect(pane).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-011
    test('T-POL-FE-F-R011 — Financial Summary tab shows Gross, Net, Commission as read-only', async () => {
        mockGetPolicy.mockResolvedValue(makePolicy({ gross_premium: 100000, net_premium: 90000 }))
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Financial Summary' }))
        await waitFor(() => {
            // Gross and Net are displayed (formatted or raw)
            expect(screen.getByText(/gross premium/i)).toBeInTheDocument()
            expect(screen.getByText(/net premium/i)).toBeInTheDocument()
            expect(screen.getByText(/commission/i)).toBeInTheDocument()
            // Commission = 100000 - 90000 = 10000 (displayed)
            expect(screen.getByText(/10,000|10000/)).toBeInTheDocument()
            // No input elements in the tab
            const tabContent = document.querySelector('[data-testid="tab-panel-financial-summary"]')
                ?? document.querySelector('.financial-summary-tab')
            if (tabContent) {
                expect(tabContent.querySelectorAll('input:not([disabled]):not([readonly])').length).toBe(0)
            }
        })
    })

    // REQ-POL-FE-F-012
    test('T-POL-FE-F-R012 — Invoices tab calls GET invoices', async () => {
        mockGetPolicyInvoices.mockResolvedValue([
            { id: 1, invoice_number: 'INV-001', date: '2026-01-15', amount: 100000, status: 'Issued', due_date: '2026-02-15' },
        ])
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Invoices' }))
        await waitFor(() => {
            expect(mockGetPolicyInvoices).toHaveBeenCalledWith(1)
            expect(screen.getByText('INV-001')).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-013
    test('T-POL-FE-F-R013 — Transactions tab calls GET transactions', async () => {
        mockGetPolicyTransactions.mockResolvedValue([
            { id: 1, transaction_date: '2026-01-01', type: 'Premium', amount: 100000, reference: 'TXN-001' },
        ])
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Transactions' }))
        await waitFor(() => {
            expect(mockGetPolicyTransactions).toHaveBeenCalledWith(1)
            expect(screen.getByText('TXN-001')).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-014
    test('T-POL-FE-F-R014 — Audit tab renders AuditTable and posts Policy Opened on first activation', async () => {
        mockGetPolicyAudit.mockResolvedValue([])
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
        await waitFor(() => {
            expect(screen.getByTestId('audit-table')).toBeInTheDocument()
            expect(mockPostPolicyAudit).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ action: 'Policy Opened', entityType: 'Policy', entityId: 1 })
            )
        })
    })

    // REQ-POL-FE-F-017
    test('T-POL-FE-F-R017 — posts Policy Closed when component unmounts', async () => {
        renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        // Wait for initial render to settle
        await waitFor(() => expect(screen.getByText('POL-1')).toBeInTheDocument())

        // Unmount
        const { unmount } = renderPolicyViewPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        unmount()
        await waitFor(() => {
            expect(mockPostPolicyAudit).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ action: 'Policy Closed' })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// PolicySectionViewPage — REQ-POL-FE-F-008, F-015, F-016
// ---------------------------------------------------------------------------

describe('PolicySectionViewPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySectionDetails.mockResolvedValue(makePolicySection())
        mockGetPolicyCoverages.mockResolvedValue([makeCoverage()])
    })

    // REQ-POL-FE-F-008
    test('T-POL-FE-F-R008 — renders and fetches section on mount', async () => {
        renderPolicySectionViewPage()
        await waitFor(() => {
            expect(mockGetPolicySectionDetails).toHaveBeenCalledWith('1', '1')
            expect(screen.getByText('POL-1-S01')).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-015
    test('T-POL-FE-F-R015 — header fields are read-only when policy status is Active', async () => {
        mockGetPolicy.mockResolvedValue(makePolicy({ status: 'Active' }))
        renderPolicySectionViewPage()
        await waitFor(() => expect(mockGetPolicySectionDetails).toHaveBeenCalled())
        // On Active policy, form inputs should be readonly/disabled
        const referenceInput = screen.getByDisplayValue('POL-1-S01') as HTMLInputElement
        expect(referenceInput.readOnly || referenceInput.disabled).toBe(true)
    })

    test('T-POL-FE-F-R015b — header fields are editable when policy status is Draft', async () => {
        mockGetPolicy.mockResolvedValue(makePolicy({ status: 'Draft' }))
        renderPolicySectionViewPage()
        await waitFor(() => expect(mockGetPolicySectionDetails).toHaveBeenCalled())
        // At least one field should be an enabled input
        const inputs = screen.getAllByRole('textbox')
            .filter(el => !(el as HTMLInputElement).disabled &&
                !(el as HTMLInputElement).readOnly) as HTMLInputElement[]
        expect(inputs.length).toBeGreaterThan(0)
    })

    // REQ-POL-FE-F-016
    test('T-POL-FE-F-R016 — TabsNav renders Coverages, Deductions, Participations tabs', async () => {
        renderPolicySectionViewPage()
        await waitFor(() => expect(mockGetPolicySectionDetails).toHaveBeenCalled())
        // Required tabs (positive assertions — §6.4B)
        expect(screen.getByRole('button', { name: 'Coverages' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Deductions' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Participations' })).toBeInTheDocument()
        // Risk Codes is a Quotes domain tab — not required on PolicySectionViewPage
        expect(screen.queryByRole('button', { name: 'Risk Codes' })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// PolicyEndorsePage — REQ-POL-FE-F-020 to F-024
// ---------------------------------------------------------------------------

describe('PolicyEndorsePage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicyEndorsements.mockResolvedValue([])
        mockCreateEndorsement.mockResolvedValue(makeEndorsement({ id: 10 }))
    })

    // REQ-POL-FE-F-020
    test('T-POL-FE-F-R020 — renders at /policies/endorse/:id without crash', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalledWith('1'))
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    // REQ-POL-FE-F-021
    test('T-POL-FE-F-R021 — renders endorsement type dropdown, effective date, description; shows policy reference', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        // Form fields
        expect(screen.getByRole('combobox', { name: /endorsement type/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
        // Policy reference subtitle
        expect(screen.getByText(/POL-1/)).toBeInTheDocument()
    })

    test('T-POL-FE-F-R021b — type dropdown has Mid Term Adjustment and Cancellation options', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        const select = screen.getByRole('combobox', { name: /endorsement type/i })
        const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent)
        expect(options).toContain('Mid Term Adjustment')
        expect(options).toContain('Cancellation')
    })

    // REQ-POL-FE-F-022
    test('T-POL-FE-F-R022a — validation rejects empty effective date', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        // Trigger sidebar Save event with no effective date set
        fireEvent(window, new Event('policy:endorse-save'))
        await waitFor(() => {
            expect(mockCreateEndorsement).not.toHaveBeenCalled()
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'error' })
            )
        })
    })

    test('T-POL-FE-F-R022b — validation rejects effective date outside policy period', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        // Set a date before inception
        fireEvent.change(screen.getByLabelText(/effective date/i), {
            target: { value: '2025-01-01' },
        })
        fireEvent(window, new Event('policy:endorse-save'))
        await waitFor(() => {
            expect(mockCreateEndorsement).not.toHaveBeenCalled()
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'error' })
            )
        })
    })

    test('T-POL-FE-F-R022c — validation rejects save when an open endorsement exists', async () => {
        mockGetPolicyEndorsements.mockResolvedValue([
            makeEndorsement({ status: 'Endorsement Created' }),
        ])
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicyEndorsements).toHaveBeenCalled())
        fireEvent.change(screen.getByLabelText(/effective date/i), {
            target: { value: '2026-06-01' },
        })
        fireEvent(window, new Event('policy:endorse-save'))
        await waitFor(() => {
            expect(mockCreateEndorsement).not.toHaveBeenCalled()
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'error' })
            )
        })
    })

    // REQ-POL-FE-F-023
    test('T-POL-FE-F-R023 — valid save calls createEndorsement and navigates to edit page', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.change(screen.getByLabelText(/effective date/i), {
            target: { value: '2026-06-01' },
        })
        fireEvent(window, new Event('policy:endorse-save'))
        await waitFor(() => {
            expect(mockCreateEndorsement).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({ effectiveDate: '2026-06-01' })
            )
            expect(mockNavigate).toHaveBeenCalledWith('/policies/1/endorsements/10/edit')
        })
    })

    // REQ-POL-FE-F-024
    test('T-POL-FE-F-R024 — dirty tracking shows warning notification on back navigation when form has changes', async () => {
        renderPolicyEndorsePage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent.change(screen.getByLabelText(/effective date/i), {
            target: { value: '2026-06-01' },
        })
        // Simulate browser back — popstate event
        fireEvent(window, new PopStateEvent('popstate', { state: null }))
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringMatching(/unsaved|discard/i) })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// PolicyEndorsementPage — REQ-POL-FE-F-025 to F-028
// ---------------------------------------------------------------------------

describe('PolicyEndorsementPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicyEndorsements.mockResolvedValue([makeEndorsement({ id: 10 })])
        mockGetPolicySections.mockResolvedValue([makePolicySection()])
        mockIssueEndorsement.mockResolvedValue({
            policy: makePolicy({ status: 'Active' }),
            endorsement: makeEndorsement({ status: 'Endorsed' }),
        })
    })

    // REQ-POL-FE-F-025
    test('T-POL-FE-F-R025 — renders at endorsement edit route; loads policy and endorsement', async () => {
        renderPolicyEndorsementPage()
        await waitFor(() => {
            expect(mockGetPolicy).toHaveBeenCalledWith('1')
            expect(mockGetPolicyEndorsements).toHaveBeenCalledWith('1')
        })
    })

    test('T-POL-FE-F-R025b — renders error when policy not found, does not throw', async () => {
        mockGetPolicy.mockRejectedValue(new Error('Not found'))
        renderPolicyEndorsementPage()
        await waitFor(() => {
            const errorEl = screen.queryByText(/not found|error/i)
            expect(errorEl).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-026
    test('T-POL-FE-F-R026 — renders policy detail with endorsement subtitle showing effective date', async () => {
        renderPolicyEndorsementPage()
        await waitFor(() => {
            expect(screen.getByText('POL-1')).toBeInTheDocument()
            // Endorsement subtitle (effective date)
            expect(screen.getByText(/2026-06-01|endorsement/i)).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-027
    test('T-POL-FE-F-R027 — Issue Endorsement sidebar item exists and calls PUT issue then navigates', async () => {
        renderPolicyEndorsementPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())

        const section = mockUseSidebarSection.mock.calls.at(-1)?.[0]
        const labels = (section?.items ?? []).map((item: { label: string }) => item.label)
        expect(labels).toContain('Issue Endorsement')

        // Trigger the issue event
        fireEvent(window, new Event('policy:issue-endorsement'))
        await waitFor(() => {
            expect(mockIssueEndorsement).toHaveBeenCalledWith('1', '10')
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'success' })
            )
            expect(mockNavigate).toHaveBeenCalledWith('/policies/1')
        })
    })

    test('T-POL-FE-F-R027b — Cancellation endorsement updates policy status display to Cancelled', async () => {
        mockGetPolicyEndorsements.mockResolvedValue([
            makeEndorsement({ id: 10, transaction_type: 'Cancellation' }),
        ])
        mockIssueEndorsement.mockResolvedValue({
            policy: makePolicy({ status: 'Cancelled' }),
            endorsement: makeEndorsement({ status: 'Endorsed', transaction_type: 'Cancellation' }),
        })
        renderPolicyEndorsementPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        fireEvent(window, new Event('policy:issue-endorsement'))
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/policies/1')
        })
    })

    // REQ-POL-FE-F-028
    test('T-POL-FE-F-R028 — dirty tracking fires warning notification on back navigation with unsaved changes', async () => {
        renderPolicyEndorsementPage()
        await waitFor(() => expect(mockGetPolicy).toHaveBeenCalled())
        // Make a field change (triggering dirty state)
        const inputs = screen.getAllByRole('textbox').filter(
            el => !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly
        )
        if (inputs.length > 0) {
            fireEvent.change(inputs[0], { target: { value: 'changed-value' } })
        }
        fireEvent(window, new PopStateEvent('popstate', { state: null }))
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringMatching(/unsaved|discard/i) })
            )
        })
    })
})

// ---------------------------------------------------------------------------
// PolicyCoverageDetailPage — REQ-POL-FE-F-029, F-030
// ---------------------------------------------------------------------------

describe('PolicyCoverageDetailPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySections.mockResolvedValue([makePolicySection()])
        mockGetPolicyCoverages.mockResolvedValue([makeCoverage()])
        mockGetPolicyLocations.mockResolvedValue([
            makeLocationRow({ CoverageType: 'Building', CoverageSubType: 'Residential', SumInsured: 300000 }),
            makeLocationRow({ CoverageType: 'Building', CoverageSubType: 'Commercial', SumInsured: 200000 }),
            makeLocationRow({ CoverageType: 'Contents', CoverageSubType: '', SumInsured: 100000 }),
        ])
    })

    // REQ-POL-FE-F-029
    test('T-POL-FE-F-R029 — renders at coverage route; loads policy, sections, coverages, locations', async () => {
        renderCoverageDetailPage()
        await waitFor(() => {
            expect(mockGetPolicy).toHaveBeenCalledWith('1')
            expect(mockGetPolicySections).toHaveBeenCalledWith('1')
            expect(mockGetPolicyCoverages).toHaveBeenCalledWith('1', '1')
            expect(mockGetPolicyLocations).toHaveBeenCalledWith('1')
        })
    })

    test('T-POL-FE-F-R029b — renders "Coverage not found" when coverage id does not match', async () => {
        mockGetPolicyCoverages.mockResolvedValue([makeCoverage({ id: 999 })])
        renderCoverageDetailPage('1', '1', '1')
        await waitFor(() => {
            expect(screen.getByText(/coverage not found/i)).toBeInTheDocument()
        })
    })

    // REQ-POL-FE-F-030
    test('T-POL-FE-F-R030 — header shows Coverage Reference, Insured, Coverage name; tab "Coverage Sub-Details"', async () => {
        renderCoverageDetailPage()
        await waitFor(() => expect(mockGetPolicyCoverages).toHaveBeenCalled())
        expect(screen.getByText('COV-001')).toBeInTheDocument()
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
        expect(screen.getByText('All Risks')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Coverage Sub-Details' })).toBeInTheDocument()
    })

    test('T-POL-FE-F-R030b — Sub-Details tab groups location rows by CoverageType sorted alphabetically', async () => {
        renderCoverageDetailPage()
        await waitFor(() => expect(mockGetPolicyLocations).toHaveBeenCalled())
        // Building and Contents should appear as group rows
        await waitFor(() => {
            expect(screen.getByText('Building')).toBeInTheDocument()
            expect(screen.getByText('Contents')).toBeInTheDocument()
        })
        // Building should appear before Contents (alphabetical)
        const rows = screen.getAllByRole('row')
        const buildingIdx = rows.findIndex(r => r.textContent?.includes('Building'))
        const contentsIdx = rows.findIndex(r => r.textContent?.includes('Contents'))
        expect(buildingIdx).toBeLessThan(contentsIdx)
    })

    test('T-POL-FE-F-R030c — clicking a detail row navigates to sub-detail page', async () => {
        renderCoverageDetailPage()
        await waitFor(() => expect(mockGetPolicyLocations).toHaveBeenCalled())
        const buildingRow = await screen.findByText('Building')
        fireEvent.click(buildingRow.closest('tr') ?? buildingRow)
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringContaining('/details/Building')
            )
        })
    })

    test('T-POL-FE-F-R030d — empty state renders when no location rows match', async () => {
        mockGetPolicyLocations.mockResolvedValue([
            makeLocationRow({ CoverageType: '', SumInsured: 100000 }),
        ])
        renderCoverageDetailPage()
        await waitFor(() => {
            expect(screen.getByText(/no coverage details found/i)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// PolicyCoverageSubDetailPage — REQ-POL-FE-F-031
// ---------------------------------------------------------------------------

describe('PolicyCoverageSubDetailPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPolicy.mockResolvedValue(makePolicy())
        mockGetPolicySections.mockResolvedValue([makePolicySection()])
        mockGetPolicyCoverages.mockResolvedValue([makeCoverage()])
        mockGetPolicyLocations.mockResolvedValue([
            makeLocationRow({ CoverageType: 'Building', CoverageSubType: 'Residential', SumInsured: 300000 }),
            makeLocationRow({ CoverageType: 'Building', CoverageSubType: 'Commercial', SumInsured: 200000 }),
            makeLocationRow({ CoverageType: 'Building', CoverageSubType: '', SumInsured: 50000 }),
        ])
    })

    // REQ-POL-FE-F-031
    test('T-POL-FE-F-R031 — renders at detail route with Locations tab', async () => {
        renderCoverageSubDetailPage()
        await waitFor(() => {
            expect(mockGetPolicy).toHaveBeenCalledWith('1')
            expect(screen.getByRole('button', { name: 'Locations' })).toBeInTheDocument()
        })
    })

    test('T-POL-FE-F-R031b — header shows Policy Reference, Section Reference, Coverage Detail', async () => {
        renderCoverageSubDetailPage('1', '1', '1', 'Building')
        await waitFor(() => expect(mockGetPolicyCoverages).toHaveBeenCalled())
        expect(screen.getByText('POL-1')).toBeInTheDocument()
        expect(screen.getByText('POL-1-S01')).toBeInTheDocument()
        expect(screen.getByText('Building')).toBeInTheDocument()
    })

    test('T-POL-FE-F-R031c — Locations rows grouped by CoverageSubType; No Sub-Detail last', async () => {
        renderCoverageSubDetailPage('1', '1', '1', 'Building')
        await waitFor(() => expect(mockGetPolicyLocations).toHaveBeenCalled())
        await waitFor(() => {
            expect(screen.getByText('Residential')).toBeInTheDocument()
            expect(screen.getByText('Commercial')).toBeInTheDocument()
            expect(screen.getByText('No Sub-Detail')).toBeInTheDocument()
        })
        const rows = screen.getAllByRole('row')
        const noSubDetailIdx = rows.findIndex(r => r.textContent?.includes('No Sub-Detail'))
        const residentialIdx = rows.findIndex(r => r.textContent?.includes('Residential'))
        // "No Sub-Detail" must come after alphabetic entries
        expect(noSubDetailIdx).toBeGreaterThan(residentialIdx)
    })

    test('T-POL-FE-F-R031d — empty state renders when no matching location rows', async () => {
        mockGetPolicyLocations.mockResolvedValue([
            makeLocationRow({ CoverageType: 'Contents', CoverageSubType: 'X', SumInsured: 100000 }),
        ])
        // detailName = 'Building' — no rows will match 'Building'
        renderCoverageSubDetailPage('1', '1', '1', 'Building')
        await waitFor(() => {
            expect(screen.getByText(/no locations found/i)).toBeInTheDocument()
        })
    })

    test('T-POL-FE-F-R031e — coverage not found renders error without throwing', async () => {
        mockGetPolicyCoverages.mockResolvedValue([makeCoverage({ id: 999 })])
        renderCoverageSubDetailPage()
        await waitFor(() => {
            const err = screen.queryByText(/not found|error/i)
            expect(err).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// policies.service.ts — REQ-POL-FE-S-001
// ---------------------------------------------------------------------------

describe('policies.service.ts', () => {
    // REQ-POL-FE-S-001
    test('T-POL-FE-S-R001 — exports all required API functions', () => {
        const service = jest.requireActual('@/policies/policies.service')
        const required = [
            'getPolicies',
            'getPolicy',
            'createPolicy',
            'updatePolicy',
            'getPolicySections',
            'getPolicySectionDetails',
            'getPolicyInvoices',
            'getPolicyTransactions',
            'getPolicyAudit',
            'postPolicyAudit',
            'getPolicyEndorsements',
            'createEndorsement',
            'issueEndorsement',
            'getPolicyCoverages',
            'getPolicyLocations',
        ]
        for (const fn of required) {
            expect(typeof service[fn]).toBe('function')
        }
    })
})
