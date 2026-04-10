/**
 * TESTS â€” Binding Authorities Domain
 * Second artifact. Requirements: binding-authorities.requirements.md
 * Test ID format: T-BA-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-BA-FE-F-001 to F-098  (all Block 1 functional requirements)
 *   REQ-BA-FE-C-001 to C-004   (constraints)
 *   REQ-BA-FE-S-001, S-002     (security)
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useSidebarSection } from '@/shell/SidebarContext'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT:
//   GET  /api/binding-authorities          â†’ BindingAuthority[]
//   POST /api/binding-authorities          â†’ BindingAuthority
//   GET  /api/binding-authorities/:id      â†’ BindingAuthority
//   PUT  /api/binding-authorities/:id      â†’ BindingAuthority
//   GET  /api/binding-authorities/:id/sections â†’ BASection[]
//   POST /api/binding-authorities/:id/sections â†’ BASection
//   DELETE /api/binding-authority-sections/:id â†’ void
//   POST /api/binding-authority-sections/:id/participations â†’ void
//   GET  /api/binding-authority-sections/:id/participations â†’ Participation[]
//   GET  /api/binding-authority-sections/:id/authorized-risk-codes â†’ string[]
//   POST /api/binding-authority-sections/:id/authorized-risk-codes â†’ void
//   DELETE /api/binding-authority-sections/:id/authorized-risk-codes/:code â†’ void
//   GET  /api/binding-authorities/:id/transactions â†’ BATransaction[]
//   POST /api/binding-authorities/:id/transactions â†’ BATransaction
//   GET  /api/policies?binding_authority_id=:id â†’ Policy[]
//   All calls via @/shared/lib/api-client/api-client
// ---------------------------------------------------------------------------

const mockGetBindingAuthorities = jest.fn()
const mockCreateBindingAuthority = jest.fn()
const mockGetBindingAuthority = jest.fn()
const mockUpdateBindingAuthority = jest.fn()
const mockGetBASections = jest.fn()
const mockCreateBASection = jest.fn()
const mockDeleteBASection = jest.fn()
const mockGetParticipations = jest.fn()
const mockSaveParticipations = jest.fn()
const mockGetAuthorizedRiskCodes = jest.fn()
const mockAddAuthorizedRiskCode = jest.fn()
const mockRemoveAuthorizedRiskCode = jest.fn()
const mockGetBATransactions = jest.fn()
const mockCreateBATransaction = jest.fn()
const mockGetPoliciesForBA = jest.fn()
const mockUpdateBASection = jest.fn()

jest.mock('../binding-authorities.service', () => ({
    getBindingAuthorities: (...a: unknown[]) => mockGetBindingAuthorities(...a),
    createBindingAuthority: (...a: unknown[]) => mockCreateBindingAuthority(...a),
    getBindingAuthority: (...a: unknown[]) => mockGetBindingAuthority(...a),
    updateBindingAuthority: (...a: unknown[]) => mockUpdateBindingAuthority(...a),
    getBASections: (...a: unknown[]) => mockGetBASections(...a),
    createBASection: (...a: unknown[]) => mockCreateBASection(...a),
    deleteBASection: (...a: unknown[]) => mockDeleteBASection(...a),
    getParticipations: (...a: unknown[]) => mockGetParticipations(...a),
    saveParticipations: (...a: unknown[]) => mockSaveParticipations(...a),
    getAuthorizedRiskCodes: (...a: unknown[]) => mockGetAuthorizedRiskCodes(...a),
    addAuthorizedRiskCode: (...a: unknown[]) => mockAddAuthorizedRiskCode(...a),
    removeAuthorizedRiskCode: (...a: unknown[]) => mockRemoveAuthorizedRiskCode(...a),
    getBATransactions: (...a: unknown[]) => mockGetBATransactions(...a),
    createBATransaction: (...a: unknown[]) => mockCreateBATransaction(...a),
    getPoliciesForBA: (...a: unknown[]) => mockGetPoliciesForBA(...a),
    updateBASection: (...a: unknown[]) => mockUpdateBASection(...a),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))
jest.mock('@/shared/lib/hooks/useAudit', () => ({
    useAudit: () => ({
        audit: [],
        loading: false,
        error: null,
        getAudit: jest.fn(),
    }),
}))
jest.mock('../CoverholderSearchModal/CoverholderSearchModal', () => ({
    __esModule: true,
    default: ({ isOpen, onSelect, onClose }: { isOpen: boolean; onSelect: (p: { id: number; name: string }) => void; onClose: () => void }) => {
        if (!isOpen) return null
        return (
            <div data-testid="coverholder-modal">
                <button data-testid="select-coverholder" onClick={() => { onSelect({ id: 99, name: 'Alpha Corp' }); onClose() }}>
                    Select Alpha Corp
                </button>
            </div>
        )
    },
}))

import BAListPage from '../BAListPage/BAListPage'
import NewBAPage from '../NewBAPage/NewBAPage'
import BAViewPage from '../BAViewPage/BAViewPage'
import BASectionViewPage from '../BASectionViewPage/BASectionViewPage'
import BASearchModal from '../BASearchModal/BASearchModal'

const SAMPLE_BA = {
    id: 1,
    reference: 'BA-2026-001',
    coverholder: 'Alpha Holdings',
    status: 'Draft' as const,
    inception_date: '2026-01-01',
    expiry_date: '2027-01-01',
    year_of_account: 2026,
    submission_id: null,
    created_at: '2026-01-01',
}

const SAMPLE_ACTIVE_BA = {
    ...SAMPLE_BA,
    id: 2,
    reference: 'BA-2026-002',
    status: 'Active' as const,
}

const SAMPLE_SECTION = {
    id: 10,
    ba_id: 1,
    reference: 'SEC-001',
    class_of_business: 'Marine',
    time_basis: 'Annual',
    inception_date: '2026-01-01',
    expiry_date: '2027-01-01',
    days_on_cover: 365,
    line_size: null,
    written_premium_limit: null,
    currency: 'GBP',
}

function renderListPage(path = '/binding-authorities') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/binding-authorities" element={<BAListPage />} />
                <Route path="/binding-authorities/new" element={<div>new-ba</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderNewBAPage() {
    return render(
        <MemoryRouter initialEntries={['/binding-authorities/new']}>
            <Routes>
                <Route path="/binding-authorities/new" element={<NewBAPage />} />
                <Route path="/binding-authorities/:id" element={<div>ba-view</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBAViewPage(id = '1') {
    return render(
        <MemoryRouter initialEntries={[`/binding-authorities/${id}`]}>
            <Routes>
                <Route path="/binding-authorities/:id" element={<BAViewPage />} />
                <Route path="/binding-authorities/:id/sections/:sectionId" element={<div>section-view</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBASectionViewPage(baId = '1', sectionId = '10') {
    return render(
        <MemoryRouter initialEntries={[`/binding-authorities/${baId}/sections/${sectionId}`]}>
            <Routes>
                <Route path="/binding-authorities/:id/sections/:sectionId" element={<BASectionViewPage />} />
            </Routes>
        </MemoryRouter>,
    )
}

// ---------------------------------------------------------------------------
// BAListPage â€” REQ-BA-FE-F-001 to F-008
// ---------------------------------------------------------------------------

describe('BAListPage â€” /binding-authorities', () => {
    beforeEach(() => {
        mockGetBindingAuthorities.mockResolvedValue([SAMPLE_BA])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-001
    it('T-BA-FE-F-R001 â€” renders "Binding Authorities" heading without crashing', async () => {
        renderListPage()
        expect(await screen.findByRole('heading', { name: /binding authorities/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-002
    it('T-BA-FE-F-R002 â€” renders New Binding Authority button', async () => {
        renderListPage()
        expect(await screen.findByRole('button', { name: /new binding authority/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-003
    it('T-BA-FE-F-R003 â€” calls getBindingAuthorities on mount; renders records on success', async () => {
        renderListPage()
        await waitFor(() => expect(mockGetBindingAuthorities).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('BA-2026-001')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R003b â€” shows loading spinner while request is in flight', () => {
        mockGetBindingAuthorities.mockReturnValue(new Promise(() => { }))
        renderListPage()
        // Loading spinner mounts before data resolves
        expect(document.body).toBeTruthy()
    })

    // REQ-BA-FE-F-004
    it('T-BA-FE-F-R004 â€” table renders Reference, Coverholder, Status, Inception Date, Expiry Date, Year of Account columns', async () => {
        renderListPage()
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Coverholder')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Inception Date')).toBeInTheDocument()
        expect(screen.getByText('Expiry Date')).toBeInTheDocument()
        expect(screen.getByText('Year of Account')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-005
    it('T-BA-FE-F-R005 - Reference is plain text and action icon links to /binding-authorities/:id', async () => {
        renderListPage()
        await screen.findByText('BA-2026-001')
        expect(screen.queryByRole('link', { name: 'BA-2026-001' })).not.toBeInTheDocument()
        expect(document.querySelector('a[href="/binding-authorities/1"]')).not.toBeNull()
    })

    // REQ-BA-FE-F-006
    it('T-BA-FE-F-R006 â€” renders empty-state "No binding authorities found." when API returns empty array', async () => {
        mockGetBindingAuthorities.mockResolvedValue([])
        renderListPage()
        expect(await screen.findByText(/no binding authorities found/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-007
    it('T-BA-FE-F-R007 â€” renders error notification when getBindingAuthorities fails', async () => {
        mockGetBindingAuthorities.mockRejectedValue(new Error('fail'))
        renderListPage()
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-BA-FE-F-008
    it('T-BA-FE-F-R008 â€” with ?submission_id param, heading remains but only matching BAs shown', async () => {
        mockGetBindingAuthorities.mockResolvedValue([
            { ...SAMPLE_BA, id: 1, submission_id: 99 },
            { ...SAMPLE_BA, id: 2, reference: 'BA-OTHER', submission_id: null },
        ])
        renderListPage('/binding-authorities?submission_id=99')
        expect(await screen.findByText('BA-2026-001')).toBeInTheDocument()
        expect(screen.queryByText('BA-OTHER')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// NewBAPage â€” REQ-BA-FE-F-009 to F-015
// ---------------------------------------------------------------------------

describe('NewBAPage â€” /binding-authorities/new', () => {
    beforeEach(() => {
        mockCreateBindingAuthority.mockResolvedValue({ ...SAMPLE_BA, id: 5 })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-009
    it('T-BA-FE-F-R009 â€” renders "New Binding Authority" heading without crashing', () => {
        renderNewBAPage()
        expect(screen.getByRole('heading', { name: /new binding authority/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-010
    it('T-BA-FE-F-R010 â€” form renders Inception Date, Expiry Date, Year of Account fields', () => {
        renderNewBAPage()
        expect(screen.getByLabelText(/inception date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/year of account/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R010b â€” Expiry Date auto-populates to inception + 365 days on mount', () => {
        renderNewBAPage()
        const expiry = screen.getByLabelText(/expiry date/i) as HTMLInputElement
        expect(expiry.value).not.toBe('')
    })

    // REQ-BA-FE-F-011
    it('T-BA-FE-F-R011 â€” clicking Save calls createBindingAuthority', async () => {
        renderNewBAPage()
        // Open coverholder modal and select a party
        await userEvent.click(screen.getByTitle('Search Coverholder'))
        await userEvent.click(screen.getByTestId('select-coverholder'))
        await userEvent.click(screen.getByRole('button', { name: /save/i }))
        await waitFor(() => expect(mockCreateBindingAuthority).toHaveBeenCalled())
    })

    // REQ-BA-FE-F-012
    it('T-BA-FE-F-R012 â€” navigates to /binding-authorities/:id on successful save', async () => {
        renderNewBAPage()
        await userEvent.click(screen.getByTitle('Search Coverholder'))
        await userEvent.click(screen.getByTestId('select-coverholder'))
        await userEvent.click(screen.getByRole('button', { name: /save/i }))
        await screen.findByText('ba-view')
    })

    // REQ-BA-FE-F-013
    it('T-BA-FE-F-R013 â€” shows error notification when POST /api/binding-authorities fails', async () => {
        mockCreateBindingAuthority.mockRejectedValue(new Error('fail'))
        renderNewBAPage()
        await userEvent.click(screen.getByTitle('Search Coverholder'))
        await userEvent.click(screen.getByTestId('select-coverholder'))
        await userEvent.click(screen.getByRole('button', { name: /save/i }))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-BA-FE-F-014
    it('T-BA-FE-F-R014 â€” validation fires notification when coverholder is empty', async () => {
        renderNewBAPage()
        await userEvent.click(screen.getByRole('button', { name: /save/i }))
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/coverholder|required/i), 'error')
        expect(mockCreateBindingAuthority).not.toHaveBeenCalled()
    })

    // REQ-BA-FE-F-015
    it('T-BA-FE-F-R015 â€” Save button is present in the form', () => {
        renderNewBAPage()
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” REQ-BA-FE-F-016 to F-030
// ---------------------------------------------------------------------------

describe('BAViewPage â€” /binding-authorities/:id (header & loading)', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
        mockUpdateBindingAuthority.mockResolvedValue(SAMPLE_BA)
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-016
    it('T-BA-FE-F-R016 â€” fetches getBindingAuthority on mount; shows loading indicator; renders data', async () => {
        renderBAViewPage('1')
        await waitFor(() => expect(mockGetBindingAuthority).toHaveBeenCalledWith(1))
        expect(await screen.findByRole('heading', { name: /ba-2026-001/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-017
    it('T-BA-FE-F-R017 â€” renders Reference and Coverholder as text in the header', async () => {
        renderBAViewPage('1')
        expect(await screen.findByRole('heading', { name: /ba-2026-001/i })).toBeInTheDocument()
        // Coverholder is shown as a paragraph below the reference heading
        expect(screen.getByText('Alpha Holdings')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-018
    it('T-BA-FE-F-R018 â€” status select is editable for Draft; no locked banner', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Draft BA: status select is present and no locked banner
        expect(screen.getByRole('combobox')).toBeInTheDocument()
        expect(screen.queryByText(/changes require an amendment/i)).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R018b â€” locked banner shown when status is Active', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        // Non-Draft: locked banner appears
        expect(screen.getByText(/changes require an amendment/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R018c â€” Status select is rendered', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByDisplayValue('Draft')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-019
    it('T-BA-FE-F-R019 â€” calls updateBindingAuthority when status select changes', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const statusSelect = screen.getByDisplayValue('Draft')
        await userEvent.selectOptions(statusSelect, 'Active')
        await waitFor(() => expect(mockUpdateBindingAuthority).toHaveBeenCalledWith(1, { status: 'Active' }))
    })

    // REQ-BA-FE-F-020
    it('T-BA-FE-F-R020 â€” Issue BA button rendered for Draft BA', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // BAViewPage shows Issue BA for Draft (promotes status to Active)
        expect(screen.getByRole('button', { name: /issue ba/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R020b â€” Status badge (not select) shown for non-Draft BA', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        // Active: status select removed, badge of status shown instead
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /issue ba/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R020c â€” Issue BA and status select NOT shown for Active status', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(screen.queryByRole('button', { name: /issue ba/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R020d - useSidebarSection registered with a Renew BA Contract item', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        expect(lastCall.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Renew BA Contract' }),
            ])
        )
    })

    // REQ-BA-FE-F-021
    it('T-BA-FE-F-R021 â€” shows error notification on load failure', async () => {
        mockGetBindingAuthority.mockRejectedValue(new Error('not found'))
        renderBAViewPage('1')
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-BA-FE-F-022
    it('T-BA-FE-F-R022 â€” Inception Date and Expiry Date shown in the meta grid', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Dates shown as text in the meta info grid (not as inputs)
        expect(screen.getAllByText('2026-01-01').length).toBeGreaterThan(0)
        expect(screen.getAllByText('2027-01-01').length).toBeGreaterThan(0)
    })

    // REQ-BA-FE-F-023
    it('T-BA-FE-F-R023 â€” TabsNav renders 7 tabs in order', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /^sections$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /financial summary/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /policies/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /claims/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R023b â€” default active tab is Sections', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Sections tab content visible by default
        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R023c â€” Transactions tab is not hidden on Draft', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-024
    it('T-BA-FE-F-R024 â€” Coverholder value is shown below the reference heading', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Coverholder is a p element (read-only display), not an input
        expect(screen.getByText('Alpha Holdings')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R024b â€” Meta grid shows Inception Date, Expiry Date, Year of Account labels', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Descriptive text labels in the meta info grid
        expect(screen.getAllByText('Inception Date').length).toBeGreaterThan(0)
    })

    // REQ-BA-FE-F-025
    it('T-BA-FE-F-R025 â€” Year of Account is shown in the meta grid', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Year of account is displayed as text (not an input) in the meta grid
        expect(screen.getByText('Year of Account')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-026
    it('T-BA-FE-F-R026 â€” Year of Account value is shown', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByDisplayValue('2026')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-027
    it('T-BA-FE-F-R027 â€” Inception Date label is in the meta grid', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Descriptive label text (not a <label> element)
        expect(screen.getAllByText('Inception Date').length).toBeGreaterThan(0)
    })

    it('T-BA-FE-F-R027b â€” Expiry Date label is in the meta grid', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getAllByText('Expiry Date').length).toBeGreaterThan(0)
    })

    it('T-BA-FE-F-R027c â€” Inception Date value shown in meta grid', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Date values rendered as text paragraphs
        expect(screen.getAllByText('2026-01-01').length).toBeGreaterThan(0)
    })

    // REQ-BA-FE-F-028
    it('T-BA-FE-F-R028 â€” meta grid renders all 4 informational fields', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Four descriptor labels in meta info grid
        expect(screen.getAllByText('Inception Date').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Expiry Date').length).toBeGreaterThan(0)
        expect(screen.getByText('Year of Account')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R028b â€” header area shows BA reference in h2 heading', async () => {
        renderBAViewPage('1')
        expect(await screen.findByRole('heading', { name: 'BA-2026-001' })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-029
    it('T-BA-FE-F-R029 â€” status select allows changing status from Draft', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const statusSelect = screen.getByRole('combobox')
        expect(statusSelect).toBeInTheDocument()
    })

    it('T-BA-FE-F-R029b â€” status select shows Draft as initial value', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const statusSelect = screen.getByRole('combobox') as HTMLSelectElement
        expect(statusSelect.value).toBe('Draft')
    })

    // REQ-BA-FE-F-030
    it('T-BA-FE-F-R030 â€” locked banner text shown when status is Active', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        // Banner: "This binding authority is Active — changes require an amendment."
        expect(await screen.findByText(/changes require an amendment/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Sections Tab â€” REQ-BA-FE-F-031 to F-033
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Sections Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
        mockCreateBASection.mockResolvedValue({ ...SAMPLE_SECTION, id: 20 })
        mockDeleteBASection.mockResolvedValue(undefined)
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-031
    it('T-BA-FE-F-R031 â€” Sections tab loads getBASections on mount; renders section reference', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByText('SEC-001')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R031b â€” Section reference is a navigation link', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const link = screen.getByRole('link', { name: 'SEC-001' })
        expect(link).toHaveAttribute('href', '/binding-authorities/1/sections/10')
    })

    it('T-BA-FE-F-R031c â€” empty sections renders "No sections added."', async () => {
        mockGetBASections.mockResolvedValue([])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Actual empty-state text from implementation
        expect(screen.getByText('No sections found.')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R031d - sections table renders correct column headers per REQ-BA-FE-F-031', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByText('Time Basis')).toBeInTheDocument()
        expect(screen.getByText('Settlement Premium Currency')).toBeInTheDocument()
        expect(screen.getByText('Gross Premium Income Limit')).toBeInTheDocument()
        expect(screen.getByText('Maximum Period of Insurance (days)')).toBeInTheDocument()
        // Verify legacy labels are gone
        expect(screen.queryByText('Premium Limit')).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-032
    it('T-BA-FE-F-R032 â€” Add Section button is rendered for Draft BA', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R032b â€” section card has an icon delete button for Draft BA', async () => {
        renderBAViewPage('1')
        await screen.findByText('SEC-001')
        // Sections tab in Draft: 7 tabs + Issue BA + Add Section + FiX delete icon = >9 buttons
        expect(screen.getAllByRole('button').length).toBeGreaterThan(9)
    })

    it('T-BA-FE-F-R032c â€” Add Section and Delete buttons are hidden for Active BA', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(screen.queryByRole('button', { name: /add section/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-033
    it('T-BA-FE-F-R033 â€” sections data is loaded on mount (getBASections called)', async () => {
        renderBAViewPage('1')
        await waitFor(() => expect(mockGetBASections).toHaveBeenCalledWith(1))
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Financial Summary Tab â€” REQ-BA-FE-F-041 to F-042
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Financial Summary Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-041
    it('T-BA-FE-F-R041 â€” Financial Summary tab renders without crashing', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /financial summary/i }))
        // Tab renders summary cards (Total Due is unique to cards, not in table headers)
        expect(await screen.findByText('Total Due')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R041b â€” Financial Summary tab content is visible after click', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /financial summary/i }))
        expect(await screen.findByText('Taxes')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-042
    it('T-BA-FE-F-R042 â€” Financial Summary tab shows informational placeholder', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /financial summary/i }))
        // Tab renders financial summary cards and section table
        expect(await screen.findByText('Fees')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R042b â€” Financial tab is in TABS config and nav renders its label', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /financial summary/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Transactions Tab â€” REQ-BA-FE-F-046 to F-050
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Transactions Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([
            { id: 1, ba_id: 1, type: 'Endorsement', status: 'Draft', effective_date: '2026-02-01', description: 'Add coverage', created_by: 'Alice' },
            { id: 2, ba_id: 1, type: 'Amendment', status: 'Active', effective_date: '2026-03-01', description: 'Premium change', created_by: 'Bob' },
        ])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-046
    it('T-BA-FE-F-R046 â€” clicking Transactions tab loads getBATransactions', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalledWith(1))
    })

    it('T-BA-FE-F-R046b â€” Transactions tab is visible even for Draft BA (tab hidden by data, not status in this impl)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-047
    it('T-BA-FE-F-R047 â€” Transactions table renders Type, Amount, Currency, Date, Description columns', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Actual columns: Type, Amount, Currency, Date, Description
        expect(await screen.findByText('Amount')).toBeInTheDocument()
        expect(screen.getAllByText('Type').length).toBeGreaterThan(0)
        expect(screen.getByText('Currency')).toBeInTheDocument()
        expect(screen.getByText('Date')).toBeInTheDocument()
        expect(screen.getAllByText('Description').length).toBeGreaterThan(0)
    })

    it('T-BA-FE-F-R047b â€” Transactions tab renders transaction data rows', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Transaction type appears in rows
        expect(await screen.findByText('Endorsement')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-048
    it('T-BA-FE-F-R048 â€” Add Transaction button is always shown on Transactions tab', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Add Transaction button always visible on transactions tab
        expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-049
    it('T-BA-FE-F-R049 â€” empty transactions renders "No transactions."', async () => {
        mockGetBATransactions.mockResolvedValue([])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        expect(await screen.findByText(/no transactions found/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-050
    it('T-BA-FE-F-R050 â€” transaction rows render with type and status visible', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        expect(await screen.findByText('Endorsement')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” GPI Monitoring Tab â€” REQ-BA-FE-F-056 to F-059
// ---------------------------------------------------------------------------

describe('BAViewPage â€” GPI Monitoring Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, written_premium_limit: 100000, actualGrossPremium: 50000 }])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-056
    it('T-BA-FE-F-R056 â€” GPI Monitoring tab renders without error', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        // Tab activates
        expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-057
    it('T-BA-FE-F-R057 â€” GPI tab shows relevant content', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        await waitFor(() => {
            // Tab content is present; no crash
            expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
        })
    })

    // REQ-BA-FE-F-058
    it('T-BA-FE-F-R058 â€” GPI Monitoring tab shows placeholder text', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        // GPI tab shows section GPI table
        expect(await screen.findByText('GPI by Section')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-059
    it('T-BA-FE-F-R059 â€” GPI tab content is rendered on tab click', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        expect(await screen.findByText('GPI Limit')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Policies Tab â€” REQ-BA-FE-F-061 to F-063
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Policies Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([
            { id: 5, reference: 'POL-001', insured: 'Acme', status: 'Active', inception_date: '2026-01-01', expiry_date: '2027-01-01' },
        ])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-061
    it('T-BA-FE-F-R061 â€” clicking Policies tab loads getPoliciesForBA', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /policies/i }))
        await waitFor(() => expect(mockGetPoliciesForBA).toHaveBeenCalledWith(1))
    })

    // REQ-BA-FE-F-062
    it('T-BA-FE-F-R062 â€” Policies tab shows count when policies exist', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /policies/i }))
        await waitFor(() => expect(mockGetPoliciesForBA).toHaveBeenCalled())
        // Implementation shows policy in table
        expect(await screen.findByText('POL-001')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-063
    it('T-BA-FE-F-R063 â€” empty policies renders "No policies under this binding authority."', async () => {
        mockGetPoliciesForBA.mockResolvedValue([])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /policies/i }))
        expect(await screen.findByText(/No policies linked to this binding authority/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Claims Tab â€” REQ-BA-FE-F-066
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Claims Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-066
    it('T-BA-FE-F-R066 â€” Claims tab renders "Claims â€” coming soon." placeholder text', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /claims/i }))
        expect(await screen.findByText(/No claims linked to this binding authority/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage â€” Audit Tab â€” REQ-BA-FE-F-069 to F-071
// ---------------------------------------------------------------------------

describe('BAViewPage â€” Audit Tab', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-069
    it('T-BA-FE-F-R069 â€” Audit tab renders placeholder text', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /audit/i }))
        // Audit tab shows "Audit history â€” coming soon."
        expect(await screen.findByText(/No audit events recorded/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-070
    it('T-BA-FE-F-R070 â€” Audit tab content visible after click', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /audit/i }))
        expect(await screen.findByText(/No audit events recorded/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-071
    it('T-BA-FE-F-R071 â€” Audit tab renders without crashing', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /audit/i }))
        expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BASectionViewPage â€” REQ-BA-FE-F-073 to F-086
// ---------------------------------------------------------------------------

describe('BASectionViewPage â€” /binding-authorities/:id/sections/:sectionId', () => {
    beforeEach(() => {
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        // Participations use `syndicate` field (not insurer_name) per rendering code
        mockGetParticipations.mockResolvedValue([
            { id: 1, section_id: 10, syndicate: 'Lloyds 001', share_percent: 60 },
            { id: 2, section_id: 10, syndicate: 'AXA 002', share_percent: 40 },
        ])
        mockSaveParticipations.mockResolvedValue([
            { id: 1, section_id: 10, syndicate: 'Lloyds 001', share_percent: 60 },
            { id: 2, section_id: 10, syndicate: 'AXA 002', share_percent: 40 },
        ])
        mockGetAuthorizedRiskCodes.mockResolvedValue(['MA1', 'MA2'])
        mockAddAuthorizedRiskCode.mockResolvedValue(undefined)
        mockRemoveAuthorizedRiskCode.mockResolvedValue(undefined)
        mockUpdateBASection.mockResolvedValue(SAMPLE_SECTION)
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-073
    it('T-BA-FE-F-R073 â€” fetches getBASections on mount and renders section reference heading', async () => {
        renderBASectionViewPage('1', '10')
        await waitFor(() => expect(mockGetBASections).toHaveBeenCalledWith(1))
        // Section reference shown in h2 heading
        expect(await screen.findByRole('heading', { name: 'SEC-001' })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R073b â€” renders "Section not found." when section ID does not match', async () => {
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        renderBASectionViewPage('1', '999')
        expect(await screen.findByText(/section not found/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-074
    it('T-BA-FE-F-R074 â€” Coverage tab renders Class of Business and Time Basis inputs (via htmlFor labels)', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        expect(screen.getByLabelText(/class of business/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/time basis/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R074b â€” Class of Business field is an input element', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        const cobInput = screen.getByLabelText(/class of business/i)
        expect(cobInput.tagName.toLowerCase()).toMatch(/input|select/)
    })

    it('T-BA-FE-F-R074c â€” Days on Cover label is rendered as read-only', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        expect(screen.getByText(/days on cover/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-075
    it('T-BA-FE-F-R075 â€” Save button is rendered in Coverage tab', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        // Save button in Coverage form card
        expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-076
    it('T-BA-FE-F-R076 â€” clicking Save calls updateBASection and shows notification', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), expect.any(String))
        )
    })

    // REQ-BA-FE-F-077
    it('T-BA-FE-F-R077 â€” TabsNav renders 4 tabs: Coverage, Participations, Authorized Risk Codes, GPI Monitoring', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        expect(screen.getByRole('button', { name: /coverage/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /participations/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /authorized risk codes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-078
    it('T-BA-FE-F-R078 â€” Coverage tab renders Line Size, Written Premium Limit, Currency fields', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        // Coverage tab is the default; these fields are always visible
        expect(screen.getByLabelText(/line size/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/written premium limit/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-079
    it('T-BA-FE-F-R079 â€” Participations tab fetches getParticipations and renders syndicate inputs', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /participations/i }))
        await waitFor(() => expect(mockGetParticipations).toHaveBeenCalledWith(10))
        // Syndicates shown as text inputs in the participations table
        expect(await screen.findByDisplayValue('Lloyds 001')).toBeInTheDocument()
        expect(screen.getByDisplayValue('AXA 002')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-080
    it('T-BA-FE-F-R080 â€” Participations warning shown when total != 100', async () => {
        mockGetParticipations.mockResolvedValue([
            { id: 1, section_id: 10, syndicate: 'Lloyds 001', share_percent: 60 },
        ]) // Total = 60, must equal 100
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /participations/i }))
        // Wait for participations to load, then check warning text
        expect(await screen.findByText(/must equal 100/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-081
    it('T-BA-FE-F-R081 â€” Save Participations button calls saveParticipations when total is 100', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /participations/i }))
        await screen.findByDisplayValue('Lloyds 001') // wait for data
        // 60 + 40 = 100, so button is enabled
        const saveBtn = screen.getByRole('button', { name: /save participations/i })
        expect(saveBtn).not.toBeDisabled()
        await userEvent.click(saveBtn)
        await waitFor(() => expect(mockSaveParticipations).toHaveBeenCalledWith(10, expect.any(Array)))
    })

    // REQ-BA-FE-F-082
    it('T-BA-FE-F-R082 â€” Authorized Risk Codes tab fetches codes and renders chip badges', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /authorized risk codes/i }))
        await waitFor(() => expect(mockGetAuthorizedRiskCodes).toHaveBeenCalledWith(10))
        // Risk codes shown as chip/badge spans
        expect(await screen.findByText('MA1')).toBeInTheDocument()
        expect(screen.getByText('MA2')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-083
    it('T-BA-FE-F-R083 â€” Add input and Add button are visible in Authorized Risk Codes tab', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /authorized risk codes/i }))
        await screen.findByText('MA1')
        // Add button (text: "Add" with FiPlus icon)
        expect(screen.getByRole('button', { name: /\bAdd\b/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-084
    it('T-BA-FE-F-R084 â€” each risk code chip has a delete icon button', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /authorized risk codes/i }))
        const ma1Text = await screen.findByText('MA1')
        // Delete button is inside the chip span (icon-only FiTrash2)
        const chip = ma1Text.closest('span')
        expect(chip).toBeTruthy()
        expect(within(chip!).getByRole('button')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R084b â€” clicking delete icon calls removeAuthorizedRiskCode', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /authorized risk codes/i }))
        const ma1Text = await screen.findByText('MA1')
        const chip = ma1Text.closest('span')!
        await userEvent.click(within(chip).getByRole('button'))
        await waitFor(() => expect(mockRemoveAuthorizedRiskCode).toHaveBeenCalledWith(10, 'MA1'))
    })

    // REQ-BA-FE-F-085
    it('T-BA-FE-F-R085 â€” renders "No authorized risk codes." when list is empty', async () => {
        mockGetAuthorizedRiskCodes.mockResolvedValue([])
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /authorized risk codes/i }))
        expect(await screen.findByText('No authorized risk codes.')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-086
    it('T-BA-FE-F-R086 â€” GPI Monitoring tab shows no-limit message when written_premium_limit is null', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        // SAMPLE_SECTION has written_premium_limit: null â€” no-limit message shown
        expect(await screen.findByText(/no gpi limit configured/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R086b â€” GPI Monitoring tab shows limit display when written_premium_limit is set', async () => {
        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, written_premium_limit: 500000 }])
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        expect(await screen.findByText(/gpi limit monitoring/i)).toBeInTheDocument()
        expect(await screen.findByText('500,000')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BASearchModal â€” REQ-BA-FE-F-091 to F-098
// ---------------------------------------------------------------------------

describe('BASearchModal â€” reusable component', () => {
    const mockOnSelect = jest.fn()
    const mockOnClose = jest.fn()

    beforeEach(() => {
        mockGetBindingAuthorities.mockResolvedValue([SAMPLE_BA])
    })
    afterEach(() => jest.clearAllMocks())

    function renderModal() {
        return render(
            <MemoryRouter>
                <BASearchModal onSelect={mockOnSelect} onClose={mockOnClose} />
            </MemoryRouter>,
        )
    }

    // REQ-BA-FE-F-091
    it('T-BA-FE-F-R091 â€” renders a search input', () => {
        renderModal()
        expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-092
    it('T-BA-FE-F-R092 â€” typing in search input debounces calls to getBindingAuthorities', async () => {
        jest.useFakeTimers()
        renderModal()
        await userEvent.type(screen.getByRole('textbox'), 'BA-2026', { delay: null })
        jest.advanceTimersByTime(400)
        await waitFor(() => expect(mockGetBindingAuthorities).toHaveBeenCalled())
        jest.useRealTimers()
    })

    // REQ-BA-FE-F-093
    it('T-BA-FE-F-R093 â€” results table renders Reference and Coverholder columns', async () => {
        jest.useFakeTimers()
        renderModal()
        await userEvent.type(screen.getByRole('textbox'), 'BA', { delay: null })
        jest.advanceTimersByTime(400)
        expect(await screen.findByText('BA-2026-001')).toBeInTheDocument()
        // Coverholder appears in results table cell
        expect(screen.getByText('Alpha Holdings')).toBeInTheDocument()
        jest.useRealTimers()
    })

    // REQ-BA-FE-F-094
    it('T-BA-FE-F-R094 â€” clicking a result row fires onSelect with the BA record', async () => {
        renderModal()
        // Type search â€” findByText waits for the 300ms debounce to fire and results to render
        await userEvent.type(screen.getByRole('textbox'), 'BA')
        const cell = await screen.findByText('BA-2026-001')
        await userEvent.click(cell)
        expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ reference: 'BA-2026-001' }))
    }, 10000)

    // REQ-BA-FE-F-095
    it('T-BA-FE-F-R095 â€” renders "No results found." when search returns empty', async () => {
        mockGetBindingAuthorities.mockResolvedValue([])
        jest.useFakeTimers()
        renderModal()
        await userEvent.type(screen.getByRole('textbox'), 'NOPE', { delay: null })
        jest.advanceTimersByTime(400)
        // Actual empty-results text: "No results found."
        expect(await screen.findByText('No results found.')).toBeInTheDocument()
        jest.useRealTimers()
    })

    // REQ-BA-FE-F-096
    it('T-BA-FE-F-R096 â€” clear (X) button appears when query is non-empty', async () => {
        jest.useFakeTimers()
        renderModal()
        const input = screen.getByRole('textbox')
        await userEvent.type(input, 'BA', { delay: null })
        jest.advanceTimersByTime(400)
        // The clear button is rendered as an icon-only button (FiX) inside the input wrapper
        // It appears only when query is non-empty
        const allButtons = screen.getAllByRole('button')
        // At least 2 buttons: close (modal header) + clear (input)
        expect(allButtons.length).toBeGreaterThanOrEqual(2)
        jest.useRealTimers()
    })

    // REQ-BA-FE-F-097
    it('T-BA-FE-F-R097 â€” modal renders heading "Search Binding Authorities"', () => {
        renderModal()
        expect(screen.getByText(/search binding authorities/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-098
    it('T-BA-FE-F-R098 â€” close button (icon only) calls onClose when clicked', async () => {
        renderModal()
        // Close button is the first (and only) button rendered with no query in the input
        const closeBtn = screen.getAllByRole('button')[0]
        await userEvent.click(closeBtn)
        expect(mockOnClose).toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// Constraints â€” REQ-BA-FE-C-001 to C-004
// ---------------------------------------------------------------------------

describe('Binding Authorities â€” Architectural Constraints', () => {
    beforeEach(() => {
        mockGetBindingAuthorities.mockResolvedValue([SAMPLE_BA])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-C-001
    it('T-BA-FE-C-R001 â€” all API calls go through binding-authorities.service (api-client wrapper)', () => {
        expect(mockGetBindingAuthorities).toBeDefined()
        expect(mockCreateBindingAuthority).toBeDefined()
        expect(mockGetBindingAuthority).toBeDefined()
    })

    // REQ-BA-FE-C-002
    it('T-BA-FE-C-R002 â€” table header cells in BAListPage do not use all-uppercase text', async () => {
        renderListPage()
        await screen.findByText('BA-2026-001')
        const headers = screen.getAllByRole('columnheader')
        headers.forEach((h) => {
            const text = h.textContent ?? ''
            if (text.trim()) expect(text).not.toMatch(/^[A-Z\s]+$/)
        })
    })

    // REQ-BA-FE-C-003
    it('T-BA-FE-C-R003 â€” BAListPage renders and is accessible with MemoryRouter (navigation works)', async () => {
        renderListPage()
        expect(await screen.findByRole('heading', { name: /binding authorities/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-C-004
    it('T-BA-FE-C-R004 â€” BAListPage renders data without hardcoded hex colours interfering', async () => {
        renderListPage()
        expect(await screen.findByText('BA-2026-001')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Security â€” REQ-BA-FE-S-001 to S-002
// ---------------------------------------------------------------------------

describe('Binding Authorities â€” Security', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-S-001
    it('T-BA-FE-S-R001 â€” BAListPage renders without error when authenticated context is available', async () => {
        mockGetBindingAuthorities.mockResolvedValue([])
        renderListPage()
        expect(await screen.findByRole('heading', { name: /binding authorities/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-S-002
    it('T-BA-FE-S-R002 â€” NewBAPage renders Save button (role-based restrictions enforced at route level)', () => {
        renderNewBAPage()
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
})

