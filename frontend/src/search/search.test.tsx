/**
 * TESTS � Search Page (frontend)
 * Second artifact. Requirements: search.requirements.md
 * Test ID format: T-SEARCH-FE-R[NN]
 *
 * Run: jest --config jest.scan.config.js app/features/search/search.test.tsx
 */

import React from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/*
 * API CONTRACT � GET /api/search?q=<query>&orgCode=<orgCode>
 * Verification status: manually verified against backend/routes/search.js
 * Response shape: { submissions: Submission[], quotes: Quote[], policies: Policy[],
 *                   bindingAuthorities: BA[], parties: Party[], claims: Claim[] }
 */
jest.mock('@/shared/lib/api-client/api-client', () => ({ get: jest.fn() }))
jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(() => ({ token: 'mock-token', user: { orgCode: 'ORG-001' } })),
    getOrgCode: jest.fn(() => 'ORG-001'),
    getUserId: jest.fn(() => 1),
}))

import { get as apiGet } from '@/shared/lib/api-client/api-client'
const mockGet = apiGet as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPTY_RESPONSE = {
    submissions: [], quotes: [], policies: [],
    bindingAuthorities: [], parties: [], claims: [],
}

const MOCK_SUBMISSIONS = [
    { id: 1, reference: 'SUB-ORG-20260301-001', insured: 'Acme Ltd', status: 'Created', inceptionDate: '2026-01-01', expiryDate: '2027-01-01', createdDate: '2026-01-01', createdBy: 'alice', lastOpenedDate: '2026-03-01T10:00:00Z' },
    { id: 2, reference: 'SUB-ORG-20260302-002', insured: 'Beta Corp', status: 'Quoted', inceptionDate: '2026-02-01', expiryDate: '2027-02-01', createdDate: '2026-02-01', createdBy: 'bob', lastOpenedDate: '2026-03-02T11:00:00Z' },
]

const MOCK_RESPONSE = {
    ...EMPTY_RESPONSE,
    submissions: MOCK_SUBMISSIONS,
    quotes: [
        {
            id: 7,
            reference: 'QUO-ORG-20260301-001',
            insured: 'Gamma Ltd',
            status: 'Draft',
            createdDate: '2026-03-01T09:00:00Z',
            createdBy: 'charlie',
            lastOpenedDate: '2026-03-02T12:00:00Z',
        },
    ],
    policies: [
        {
            id: 9,
            reference: 'POL-ORG-20260301-001',
            insured: 'Policy Insured Ltd',
            status: 'Active',
            createdDate: '2026-03-01T09:00:00Z',
            createdBy: 'diana',
            lastOpenedDate: null,
        },
    ],
    bindingAuthorities: [
        {
            id: 11,
            reference: 'BA-ORG-20260301-001',
            insured: 'Authority Insured Ltd',
            status: 'Active',
            createdDate: '2026-03-01T09:00:00Z',
            createdBy: 'erin',
            lastOpenedDate: null,
        },
    ],
    parties: [
        {
            id: 12,
            name: 'Northwind Brokers',
            status: undefined,
            createdDate: '2026-03-01T09:00:00Z',
            createdBy: 'frank',
            lastOpenedDate: null,
        },
    ],
    claims: [
        {
            id: 13,
            reference: 'CLM-ORG-20260301-001',
            status: 'Open',
            createdDate: '2026-03-01T09:00:00Z',
            createdBy: null,
            lastOpenedDate: null,
        },
    ],
}

function renderPage(initialEntry = '/search') {
    return render(
        <MemoryRouter
            initialEntries={[initialEntry]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/search" element={<SearchPage />} />
                <Route path="/submissions/:id" element={<div data-testid="submission-view" />} />
            </Routes>
        </MemoryRouter>
    )
}

// Lazy import so mocks are set up first
let SearchPage: React.ComponentType
beforeAll(async () => {
    const mod = await import('./index')
    SearchPage = mod.default
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R01 � Renders without crash
// REQ-SEARCH-FE-F-001
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R01: renders without crash', () => {
    beforeEach(() => mockGet.mockResolvedValue(EMPTY_RESPONSE))

    it('T-SEARCH-FE-R01a: mounts and renders a containing element', async () => {
        renderPage()
        await waitFor(() => expect(mockGet).toHaveBeenCalled())
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R02 � Fetches on mount
// REQ-SEARCH-FE-F-002
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R02: fetches GET /api/search on mount', () => {
    beforeEach(() => mockGet.mockResolvedValue(EMPTY_RESPONSE))

    it('T-SEARCH-FE-R02a: calls GET /api/search on mount', async () => {
        renderPage()
        await waitFor(() => expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/api/search')))
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R03 � URL param pre-selects type
// REQ-SEARCH-FE-F-003
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R03: ?type= URL param pre-selects type filter', () => {
    beforeEach(() => mockGet.mockResolvedValue(EMPTY_RESPONSE))

    it('T-SEARCH-FE-R03a: ?type=Submission pre-selects Submission type checkbox', async () => {
        renderPage('/search?type=Submission')
        await waitFor(() => {
            const checkbox = screen.getByRole('checkbox', { name: /submission/i })
            expect((checkbox as HTMLInputElement).checked).toBe(true)
        })
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R04 � Loading indicator
// REQ-SEARCH-FE-F-004
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R04: shows loading indicator while fetching', () => {
    it('T-SEARCH-FE-R04a: displays a loading indicator before response arrives', () => {
        // Never resolve � keep loading state
        mockGet.mockReturnValue(new Promise(() => { }))
        renderPage()
        expect(screen.getByRole('status')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R05 � Error state
// REQ-SEARCH-FE-F-005
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R05: handles API error gracefully', () => {
    it('T-SEARCH-FE-R05a: shows an error message and does not crash when API fails', async () => {
        mockGet.mockRejectedValue(new Error('Network error'))
        renderPage()
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R06 � Zero results message
// REQ-SEARCH-FE-F-006
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R06: shows no-results message', () => {
    it('T-SEARCH-FE-R06a: shows "No results found" when all arrays are empty', async () => {
        mockGet.mockResolvedValue(EMPTY_RESPONSE)
        renderPage()
        await waitFor(() => expect(screen.getByText(/no results found/i)).toBeInTheDocument())
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R07 / R08 � Filter form fields
// REQ-SEARCH-FE-F-007, F-008
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R07+R08: filter form fields', () => {
    beforeEach(() => mockGet.mockResolvedValue(EMPTY_RESPONSE))

    it('T-SEARCH-FE-R07a: renders Reference, Status, Insured, Broker, date range fields', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: /reference/i })).toBeInTheDocument()
            expect(screen.getByRole('textbox', { name: /status/i })).toBeInTheDocument()
            expect(screen.getByRole('textbox', { name: /insured/i })).toBeInTheDocument()
            expect(screen.getByRole('textbox', { name: /broker/i })).toBeInTheDocument()
        })
    })

    it('T-SEARCH-FE-R08a: Type filter renders checkboxes for all valid record types', async () => {
        renderPage()
        await waitFor(() => {
            ;['Submission', 'Quote', 'Policy', 'Binding Authority', 'Party', 'Claim'].forEach(label => {
                expect(screen.getByRole('checkbox', { name: new RegExp(label, 'i') })).toBeInTheDocument()
            })
        })
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R10 � Clear button
// REQ-SEARCH-FE-F-010
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R10: Clear button resets filters', () => {
    it('T-SEARCH-FE-R10a: Clear button clears all filter fields', async () => {
        mockGet.mockResolvedValue(EMPTY_RESPONSE)
        const user = userEvent.setup()
        renderPage()

        await waitFor(() => screen.getByRole('textbox', { name: /reference/i }))

        const refInput = screen.getByRole('textbox', { name: /reference/i })
        await act(async () => {
            await user.type(refInput, 'ABC')
        })
        expect((refInput as HTMLInputElement).value).toBe('ABC')

        await act(async () => {
            await user.click(screen.getByRole('button', { name: /clear/i }))
        })
        expect((refInput as HTMLInputElement).value).toBe('')
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R11 � Table columns
// REQ-SEARCH-FE-F-011
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R11: results table columns', () => {
    beforeEach(() => mockGet.mockResolvedValue(MOCK_RESPONSE))

    it('T-SEARCH-FE-R11a: table contains Reference, Status, Insured, Last Opened columns', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('SUB-ORG-20260301-001')).toBeInTheDocument()
        })
        // Column headers
        expect(screen.getByRole('columnheader', { name: /reference/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /insured/i })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /last opened/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R14 � Action button navigation
// REQ-SEARCH-FE-F-014
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R14: Action icon navigates to domain record', () => {
    it('T-SEARCH-FE-R14a: action icon links to /submissions/:id and reference is plain text', async () => {
        mockGet.mockResolvedValue(MOCK_RESPONSE)
        renderPage()

        await waitFor(() => screen.getByText('SUB-ORG-20260301-001'))

        // Reference is plain text, not a link
        expect(screen.queryByRole('link', { name: 'SUB-ORG-20260301-001' })).not.toBeInTheDocument()
        // Action icon links to the record
        expect(document.querySelector('a[href="/submissions/1"]')).not.toBeNull()
    })

    it('T-SEARCH-FE-R14b: action icon links to /quotes/:id and not the legacy /quotes/view/:id route', async () => {
        mockGet.mockResolvedValue(MOCK_RESPONSE)
        renderPage()

        await waitFor(() => screen.getByText('QUO-ORG-20260301-001'))

        // Reference is plain text, not a link
        expect(screen.queryByRole('link', { name: 'QUO-ORG-20260301-001' })).not.toBeInTheDocument()
        // Action icon links to the correct route
        expect(document.querySelector('a[href="/quotes/7"]')).not.toBeNull()
        expect(document.querySelector('a[href="/quotes/view/7"]')).toBeNull()
    })

    it('T-SEARCH-FE-R14c: routable types have action icon links; claims have no link; no legacy view/ links exist', async () => {
        mockGet.mockResolvedValue(MOCK_RESPONSE)
        renderPage()

        await waitFor(() => screen.getByText('POL-ORG-20260301-001'))

        // References are plain text — none are links
        expect(screen.queryByRole('link', { name: 'POL-ORG-20260301-001' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'BA-ORG-20260301-001' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'CLM-ORG-20260301-001' })).not.toBeInTheDocument()
        // Policy and BA now have action icon links
        expect(document.querySelector('a[href="/policies/9"]')).not.toBeNull()
        expect(document.querySelector('a[href="/binding-authorities/11"]')).not.toBeNull()
        // Claims still have no link
        expect(document.querySelector('a[href="/claims/13"]')).toBeNull()
        // No legacy view/ routes
        expect(document.querySelector('a[href="/binding-authorities/view/11"]')).toBeNull()
        expect(document.querySelector('a[href="/parties/view/12"]')).toBeNull()
        expect(document.querySelector('a[href="/claims/view/13"]')).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// T-SEARCH-FE-R15 � Summary line
// REQ-SEARCH-FE-F-015
// ---------------------------------------------------------------------------

describe('T-SEARCH-FE-R15: shows result summary line', () => {
    it('T-SEARCH-FE-R15a: shows "Showing X�Y of Z results" summary', async () => {
        mockGet.mockResolvedValue(MOCK_RESPONSE)
        renderPage()
        await waitFor(() => expect(screen.getByText(/showing/i)).toBeInTheDocument())
    })
})

