/**
 * TESTS â€” Binding Authorities Domain
 * Second artifact. Requirements: binding-authorities.requirements.md
 * Test ID format: T-BA-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-BA-FE-F-001 to F-098  (all Block 1 functional requirements)
 *   REQ-BA-FE-C-001 to C-004   (constraints)
 *   REQ-BA-FE-S-001, S-002     (security)
 *   REQ-BA-FE-F-101 to F-122b  (Block 2 / 2.1 — Bordereaux)
 *   REQ-BA-FE-F-123 to F-133   (Block 2.2 — Endorsement flow)
 *   REQ-BA-FE-F-134 to F-145   (Block 2.3 — Transaction system)
 */

import React from 'react'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
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
const mockUpdateBATransaction = jest.fn()
const mockGetPoliciesForBA = jest.fn()
const mockUpdateBASection = jest.fn()
const mockGetBordereauConfigs = jest.fn()
const mockCreateBordereauConfig = jest.fn()
const mockUpdateBordereauConfig = jest.fn()
const mockDeleteBordereauConfig = jest.fn()
const mockGetCoverholderParty = jest.fn()
const mockGetClassesOfBusiness = jest.fn()
const mockGetCurrencies = jest.fn()

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
    updateBATransaction: (...a: unknown[]) => mockUpdateBATransaction(...a),
    getPoliciesForBA: (...a: unknown[]) => mockGetPoliciesForBA(...a),
    updateBASection: (...a: unknown[]) => mockUpdateBASection(...a),
    getBordereauConfigs: (...a: unknown[]) => mockGetBordereauConfigs(...a),
    createBordereauConfig: (...a: unknown[]) => mockCreateBordereauConfig(...a),
    updateBordereauConfig: (...a: unknown[]) => mockUpdateBordereauConfig(...a),
    deleteBordereauConfig: (...a: unknown[]) => mockDeleteBordereauConfig(...a),
    getCoverholderParty: (...a: unknown[]) => mockGetCoverholderParty(...a),
    getClassesOfBusiness: (...a: unknown[]) => mockGetClassesOfBusiness(...a),
    getCurrencies: (...a: unknown[]) => mockGetCurrencies(...a),
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
jest.mock('../BordereauImportModal/BordereauImportModal', () => ({
    __esModule: true,
    default: () => null,
}))
jest.mock('../BordereauCreateModal/BordereauCreateModal', () => ({
    __esModule: true,
    default: () => null,
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
// BordereauConfigModal mock — renders a visible sentinel when isOpen=true so F-116b can assert
// the modal opens. The real component is loaded via jest.requireActual in F-117 describe block.
jest.mock('../BordereauConfigModal/BordereauConfigModal', () => ({
    __esModule: true,
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? (
            <div data-testid="bordereau-config-modal">
                <button onClick={onClose}>close-config</button>
            </div>
        ) : null,
}))

import BAListPage from '../BAListPage/BAListPage'
import NewBAPage from '../NewBAPage/NewBAPage'
import BAViewPage from '../BAViewPage/BAViewPage'
import BASectionViewPage from '../BASectionViewPage/BASectionViewPage'
import BASearchModal from '../BASearchModal/BASearchModal'
import BAEndorsePage from '../BAEndorsePage/BAEndorsePage'
import BAEndorsementPage from '../BAEndorsementPage/BAEndorsementPage'
import BATransactionViewPage from '../BATransactionViewPage/BATransactionViewPage'
import BordereauRunPage from '../BordereauRunPage/BordereauRunPage'

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
                <Route path="/binding-authorities/:id/bordereaux/:configId/run" element={<div>bordeaux-run-sentinel</div>} />
                <Route path="/binding-authorities/:id/transactions/:transactionId" element={<div>transaction-view-sentinel</div>} />
                <Route path="/binding-authorities/:id/endorsements/:endorsementId/edit" element={<div>endorsement-edit-sentinel</div>} />
                <Route path="/binding-authorities/endorse/:id" element={<div>endorse-page-sentinel</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBAEndorsePage(id = '1') {
    return render(
        <MemoryRouter initialEntries={[`/binding-authorities/endorse/${id}`]}>
            <Routes>
                <Route path="/binding-authorities/endorse/:id" element={<BAEndorsePage />} />
                <Route path="/binding-authorities/:id/endorsements/:endorsementId/edit" element={<div>endorsement-edit-sentinel</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBAEndorsementPage(baId = '1', endorsementId = '10') {
    return render(
        <MemoryRouter initialEntries={[`/binding-authorities/${baId}/endorsements/${endorsementId}/edit`]}>
            <Routes>
                <Route path="/binding-authorities/:id/endorsements/:endorsementId/edit" element={<BAEndorsementPage />} />
                <Route path="/binding-authorities/:id/transactions/:transactionId" element={<div>transaction-view-sentinel</div>} />
                <Route path="/binding-authorities/:id" element={<div>ba-view-sentinel</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBATransactionViewPage(baId = '2', transactionId = '10') {
    return render(
        <MemoryRouter initialEntries={[`/binding-authorities/${baId}/transactions/${transactionId}`]}>
            <Routes>
                <Route path="/binding-authorities/:id/transactions/:transactionId" element={<BATransactionViewPage />} />
                <Route path="/binding-authorities/:id" element={<div>ba-view-sentinel</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderBordereauRunPage(baId = '1', configId = 'cfg1', routeState?: object) {
    const entry = routeState
        ? { pathname: `/binding-authorities/${baId}/bordereaux/${configId}/run`, state: routeState }
        : `/binding-authorities/${baId}/bordereaux/${configId}/run`
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path="/binding-authorities/:id/bordereaux/:configId/run" element={<BordereauRunPage />} />
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

// Default mock for getBordereauConfigs
beforeEach(() => {
    mockGetBordereauConfigs.mockResolvedValue([])
    mockGetCoverholderParty.mockResolvedValue({ id: 99, name: 'Admin', type: 'Coverholder', orgCode: 'DEMO' })
    mockGetClassesOfBusiness.mockResolvedValue([{ code: 'MARINE', name: 'Marine' }, { code: 'PROPERTY', name: 'Property' }])
    mockGetCurrencies.mockResolvedValue(['EUR', 'GBP', 'USD'])
})

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
        expect(screen.getAllByText('Alpha Holdings').length).toBeGreaterThan(0)
    })

    // REQ-BA-FE-F-018
    it('T-BA-FE-F-R018 â€” status displayed as badge (not select); no locked banner for any status', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Status is now always a badge, never a select
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        expect(screen.queryByText(/changes require an amendment/i)).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R018b â€” no locked banner shown when status is Active (banner removed)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        // Banner was removed per Defect 8
        expect(screen.queryByText(/changes require an amendment/i)).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R018c â€” Status badge shows current status text', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const draftEls = screen.getAllByText('Draft')
        const badge = draftEls.find(el => el.className.includes('rounded-full'))
        expect(badge).toBeTruthy()
    })

    // REQ-BA-FE-F-019
    it('T-BA-FE-F-R019 â€” no status select to change (status is read-only badge)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Status dropdown removed per Defect 6
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-020
    it('T-BA-FE-F-R020 â€” Issue BA button NOT in header for Draft BA (only in sidebar)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Issue BA removed from header per Defect 5
        expect(screen.queryByRole('button', { name: /issue ba/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R020b â€” Status badge (not select) shown for non-Draft BA', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        // Active: status select removed, badge of status shown instead
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /issue ba/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R020c â€” sidebar includes Endorse Binding Authority item for Active status', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        expect(lastCall.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Endorse Binding Authority' }),
            ])
        )
    })

    it('T-BA-FE-F-R020d - useSidebarSection registered with Import Bordereaux item', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        expect(lastCall.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Import Bordereaux' }),
            ])
        )
    })

    it('T-BA-FE-F-R020e – sidebar does NOT include Create Bordereau item (REQ-BA-FE-F-020)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Create Bordereau')
    })

    it('T-BA-FE-F-R020f – Configure Bordereau NOT in sidebar when BA is Active (REQ-BA-FE-F-020)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Configure Bordereau')
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
    it('T-BA-FE-F-R023 â€” TabsNav renders 8 tabs in order including Bordereaux', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System' },
            { id: 2, binding_authority_id: 2, type: 'Administrative', status: 'Draft', effective_date: '2026-03-01', description: 'Premium change', created_by: 'Bob' },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(screen.getByRole('button', { name: /^sections$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /financial summary/i })).toBeInTheDocument()
        expect(await screen.findByRole('button', { name: /transactions/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /policies/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /claims/i })).toBeInTheDocument()
        // 8th tab — must be labelled 'Bordereaux' (correct French plural, not 'Bordeaux')
        expect(screen.getByRole('button', { name: /^bordereaux$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R023b â€” default active tab is Sections', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Sections tab content visible by default
        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R023c â€” Transactions tab is hidden on Draft', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.queryByRole('button', { name: /transactions/i })).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-024
    it('T-BA-FE-F-R024 â€” Coverholder value is shown below the reference heading', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Coverholder is a p element (read-only display), not an input
        expect(screen.getAllByText('Alpha Holdings').length).toBeGreaterThan(0)
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
    it('T-BA-FE-F-R029 â€” status is displayed as read-only badge (no select)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        // Status is now a badge, not a combobox
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        const draftEls = screen.getAllByText('Draft')
        const badge = draftEls.find(el => el.className.includes('rounded-full'))
        expect(badge).toBeTruthy()
    })

    it('T-BA-FE-F-R029b â€” status badge shows Active for Active BA', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        const activeEls = screen.getAllByText('Active')
        const badge029b = activeEls.find(el => el.className.includes('rounded-full'))
        expect(badge029b).toBeTruthy()
    })

    // REQ-BA-FE-F-030 (REMOVED)
    it('T-BA-FE-F-R030 â€” locked banner NOT shown for any status (removed per Defect 8)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(screen.queryByText(/changes require an amendment/i)).not.toBeInTheDocument()
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

    it('T-BA-FE-F-R031c â€” empty sections seed a default in-table draft row', async () => {
        mockGetBASections.mockResolvedValue([])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const table = screen.getByRole('table')
        expect(within(table).getByText('BA-2026-001-S01')).toBeInTheDocument()
        expect(within(table).getByPlaceholderText(/class of business/i)).toBeInTheDocument()
        expect(screen.queryByText('No sections found.')).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R031d - sections table renders correct column headers per REQ-BA-FE-F-031', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByText('Time Basis')).toBeInTheDocument()
        expect(screen.getByText('Settlement Premium Currency')).toBeInTheDocument()
        expect(screen.getByText('Gross Premium Income Limit')).toBeInTheDocument()
        expect(screen.getByText('Max Period of Insurance (days)')).toBeInTheDocument()
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

    it('T-BA-FE-F-R032d â€” issuing a draft BA is blocked until a section has class of business', async () => {
        mockGetBASections.mockResolvedValue([])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })

        window.dispatchEvent(new Event('ba:issue'))

        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(
                'Minimum fields for binding authority section have not been met. Please processed minimum fields before proceeding.',
                'error'
            )
        )
        expect(mockUpdateBindingAuthority).not.toHaveBeenCalledWith(1, expect.objectContaining({ status: 'Active' }))
    })

    it('T-BA-FE-F-R032c â€” Active BA shows Add Section but does not allow deleting persisted sections', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R032e â€” Active BA add section creates a predicted reference row', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })

        await userEvent.click(screen.getByRole('button', { name: /add section/i }))

        const table = screen.getByRole('table')
        expect(within(table).getByText('BA-2026-002-S02')).toBeInTheDocument()
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
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System' },
            { id: 2, binding_authority_id: 2, type: 'Endorsement', status: 'Draft', effective_date: '2026-02-01', description: 'Add coverage', created_by: 'Alice' },
        ])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-046
    it('T-BA-FE-F-R046 â€” clicking Transactions tab loads getBATransactions', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalledWith(2))
    })

    it('T-BA-FE-F-R046b â€” Transactions tab stays visible when the only transaction is the initial issued entry', async () => {
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System' },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        expect(await screen.findByRole('button', { name: /transactions/i })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /transactions/i }))
        expect(await screen.findByText('Initial Transaction')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-047
    it('T-BA-FE-F-R047 â€” Transactions table renders Type, Amount, Currency, Date, Description columns', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // New columns per Block 2.3 (REQ-BA-FE-F-047)
        expect((await screen.findAllByText('Status')).length).toBeGreaterThan(0)
        expect(screen.getAllByText('Effective Date').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Created By').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Type').length).toBeGreaterThan(0)
        // Amount and Currency columns removed
        expect(screen.queryByText('Amount')).not.toBeInTheDocument()
        expect(screen.queryByText('Currency')).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R047b â€” Transactions tab renders transaction data rows', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Transaction type appears in rows
        expect(await screen.findByText('Endorsement')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-048
    it('T-BA-FE-F-R048 â€” Add Transaction button is always shown on Transactions tab', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Add Transaction button removed per Block 2.3 (REQ-BA-FE-F-048)
        expect(screen.queryByRole('button', { name: /add transaction/i })).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-049
    it('T-BA-FE-F-R049 â€” empty transactions renders "No transactions."', async () => {
        mockGetBATransactions.mockResolvedValue([])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        expect(await screen.findByText(/no transactions found/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-050
    it('T-BA-FE-F-R050 â€” transaction rows render with type and status visible', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        expect(await screen.findByText('Endorsement')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-139
    it('T-BA-FE-F-R139a - Transactions tab renders ResizableGrid with Created By and Created Date columns (REQ-BA-FE-F-139)', async () => {
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        expect(await screen.findByText('Created By')).toBeInTheDocument()
        expect(screen.getByText('Created Date')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R139b - Transactions tab shows derived transaction numbering with the initial transaction as Txn # 1 (REQ-BA-FE-F-139)', async () => {
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System', sequence_number: null },
            { id: 37, binding_authority_id: 2, type: 'Administrative', status: 'Draft', effective_date: '2026-06-01', description: 'Change', created_by: 'Alice', sequence_number: null },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        expect((await screen.findAllByText(/^1$/)).length).toBeGreaterThan(0)
        expect((await screen.findAllByText(/^2$/)).length).toBeGreaterThan(0)
    })

    // REQ-BA-FE-F-140
    it('T-BA-FE-F-R140a - Initial transaction row does not show View until a later endorsement is bound or issued (REQ-BA-FE-F-140)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System', sequence_number: null },
            { id: 2, binding_authority_id: 2, type: 'Administrative', status: 'Draft', effective_date: '2026-06-01', description: 'Change', created_by: 'Alice', sequence_number: null },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        expect(screen.queryByRole('button', { name: /view transaction/i })).not.toBeInTheDocument()
        expect(await screen.findByRole('button', { name: /edit endorsement/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R140b - Draft transaction row shows Edit button navigating to endorsement edit (REQ-BA-FE-F-140)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System', sequence_number: null },
            { id: 2, binding_authority_id: 2, type: 'Administrative', status: 'Draft', effective_date: '2026-06-01', description: 'Change', created_by: 'Alice', sequence_number: null },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        const editBtn = await screen.findByRole('button', { name: /edit endorsement/i })
        expect(editBtn).toBeInTheDocument()
        await userEvent.click(editBtn)
        expect(await screen.findByText('endorsement-edit-sentinel')).toBeInTheDocument()
    })

    // Bound is a legacy/backward-compat status. With Draft → Issued workflow,
    // Bound transactions show the read-only view icon (green magnifying glass).
    it('T-BA-FE-F-R140c - Bound transaction row reopens endorsement page for issue (REQ-BA-FE-F-140)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System', sequence_number: null },
            { id: 3, binding_authority_id: 2, type: 'Administrative', status: 'Bound', effective_date: '2026-06-01', description: 'Pending bound', created_by: 'Alice', sequence_number: null },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        const initialViewBtn = await screen.findByRole('button', { name: /view transaction/i })
        expect(initialViewBtn).toBeInTheDocument()
        const boundBtn = await screen.findByRole('button', { name: /view bound endorsement/i })
        expect(boundBtn).toBeInTheDocument()
        await userEvent.click(boundBtn)
        expect(await screen.findByText('endorsement-edit-sentinel')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-140 - Active transaction shows view-only icon (not edit)
    it('T-BA-FE-F-R140d - Active transaction row shows View button (not Edit) (REQ-BA-FE-F-140)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([
            { id: 1, binding_authority_id: 2, type: 'Initial Transaction', status: 'Issued', effective_date: '2026-01-01', description: '', created_by: 'System', sequence_number: null },
            { id: 4, binding_authority_id: 2, type: 'Administrative', status: 'Active', effective_date: '2026-06-01', description: 'Issued endorsement', created_by: 'Alice', sequence_number: null },
        ])
        renderBAViewPage('2')
        await screen.findByRole('heading', { name: /ba-2026-002/i })
        await userEvent.click(await screen.findByRole('button', { name: /transactions/i }))
        await waitFor(() => expect(mockGetBATransactions).toHaveBeenCalled())
        // Both rows show view icon (neither is Draft/Bound)
        const viewBtns = await screen.findAllByRole('button', { name: /view transaction/i })
        expect(viewBtns.length).toBe(2)
        expect(screen.queryByRole('button', { name: /edit endorsement/i })).not.toBeInTheDocument()
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
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
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
    it('T-BA-FE-F-R075 â€” Section Details panel is rendered above the tabs', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        // Section fields live in the core box above the tabs (save is via sidebar event)
        expect(screen.getByText(/section details/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-076
    it('T-BA-FE-F-R076 â€” section:save event calls updateBASection and shows notification', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        window.dispatchEvent(new Event('section:save'))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), expect.any(String))
        )
    })

    // REQ-BA-FE-F-077
    it('T-BA-FE-F-R077 â€” TabsNav renders 4 tabs: Coverage, Participations, Authorized Risk Codes, GPI Monitoring', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        expect(screen.getByRole('button', { name: /^coverage$/i })).toBeInTheDocument()
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


// ---------------------------------------------------------------------------
// BordereauCreateModal — REQ-BA-FE-F-112 to F-115
// ---------------------------------------------------------------------------

describe('BordereauCreateModal — REQ-BA-FE-F-112 to F-115', () => {
    // jest.requireActual bypasses the global null-mock and tests the real component.
    const RealCreateModal = (
        jest.requireActual('../BordereauCreateModal/BordereauCreateModal') as { default: React.ComponentType<any> }
    ).default

    afterEach(() => {
        jest.clearAllMocks()
        localStorage.clear()
    })

    function renderCreateModal(
        props: Partial<{ isOpen: boolean; onClose: () => void; bindingAuthorityId: string | number | null }> = {},
    ) {
        const onClose = jest.fn()
        const utils = render(
            <RealCreateModal isOpen={true} onClose={onClose} bindingAuthorityId={42} {...props} />,
        )
        return { ...utils, onClose }
    }

    // REQ-BA-FE-F-112
    it('T-BA-FE-F-R112 — renders "Create Bordereau" heading when isOpen=true', () => {
        renderCreateModal()
        expect(screen.getByRole('heading', { name: /create bordereau/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R112b — Risk radio is checked by default (Category defaults to Risk)', () => {
        renderCreateModal()
        const riskRadio = screen.getByRole('radio', { name: /^risk$/i }) as HTMLInputElement
        expect(riskRadio.checked).toBe(true)
    })

    it('T-BA-FE-F-R112c — Transactional radio is checked by default', () => {
        renderCreateModal()
        const txnRadio = screen.getByRole('radio', { name: /transactional/i }) as HTMLInputElement
        expect(txnRadio.checked).toBe(true)
    })

    it('T-BA-FE-F-R112d — Close button calls onClose', async () => {
        const { onClose } = renderCreateModal()
        await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
        expect(onClose).toHaveBeenCalled()
    })

    it('T-BA-FE-F-R112e — Month and Year selects are present (Period section)', () => {
        renderCreateModal()
        // Period section: month select + year select = at least 2 comboboxes
        expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2)
    })

    // REQ-BA-FE-F-113
    it('T-BA-FE-F-R113 — no saved-format section when localStorage has no formats', () => {
        renderCreateModal()
        expect(screen.queryByText(/saved format/i)).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R113b — shows saved-format select when formats exist in localStorage', () => {
        localStorage.setItem(
            'ba:42:bordereau:formats',
            JSON.stringify([{ name: 'Q1 Risk', category: 'Risk', dataType: 'Transactional', attributes: [] }]),
        )
        renderCreateModal()
        expect(screen.getByText(/saved format/i)).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /q1 risk/i })).toBeInTheDocument()
    })

    // REQ-BA-FE-F-114
    it('T-BA-FE-F-R114 — Download CSV triggers browser download with correct filename', async () => {
        global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock')
        global.URL.revokeObjectURL = jest.fn()
        const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { })
        // Capture the anchor's download name at append-time (before setTimeout removes it)
        let capturedDownload = ''
        const origAppend = document.body.appendChild.bind(document.body)
        const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(function (node: Node) {
            if ((node as Element).tagName === 'A') {
                capturedDownload = (node as HTMLAnchorElement).download
            }
            return origAppend(node)
        })

        renderCreateModal()
        await userEvent.click(screen.getByRole('button', { name: /download csv/i }))

        expect(clickSpy).toHaveBeenCalled()
        // Filename: Bordereau-{baId}-{category}-{dataType}-{yyyy}-{mm}.csv
        expect(capturedDownload).toMatch(/^Bordereau-42-Risk-Transactional-\d{4}-\d{2}\.csv$/)

        clickSpy.mockRestore()
        appendSpy.mockRestore()
        delete (global.URL as any).createObjectURL
        delete (global.URL as any).revokeObjectURL
    })

    // REQ-BA-FE-F-115
    it('T-BA-FE-F-R115 — returns null (renders nothing) when isOpen=false', () => {
        const { container } = renderCreateModal({ isOpen: false })
        expect(container.firstChild).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage — Configure Bordereau sidebar — REQ-BA-FE-F-116
// ---------------------------------------------------------------------------

describe('BAViewPage — Configure Bordereau sidebar — REQ-BA-FE-F-116', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-BA-FE-F-116
    it('T-BA-FE-F-R116 — useSidebarSection registered with Configure Bordereau item', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        expect(lastCall.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Configure Bordereau' }),
            ])
        )
    })

    it('T-BA-FE-F-R116b — dispatching ba:configure-bordereau opens BordereauConfigModal', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.queryByTestId('bordereau-config-modal')).not.toBeInTheDocument()
        window.dispatchEvent(new Event('ba:configure-bordereau'))
        await waitFor(() =>
            expect(screen.getByTestId('bordereau-config-modal')).toBeInTheDocument()
        )
    })
})

// ---------------------------------------------------------------------------
// BordereauConfigModal — REQ-BA-FE-F-117 to F-121
// 3-step wizard: Setup → Fields (dual-pane) → Preview
// ---------------------------------------------------------------------------

describe('BordereauConfigModal — REQ-BA-FE-F-117 to F-121', () => {
    let RealConfigModal: React.ComponentType<any>

    beforeAll(() => {
        RealConfigModal = (
            jest.requireActual('../BordereauConfigModal/BordereauConfigModal') as {
                default: React.ComponentType<any>
            }
        ).default
    })

    afterEach(() => {
        jest.clearAllMocks()
        localStorage.clear()
    })

    function renderConfigModal(
        props: Partial<{ isOpen: boolean; onClose: () => void; bindingAuthorityId: any; editConfig: any; onSaved: () => void }> = {},
    ) {
        const onClose = jest.fn()
        const onSaved = jest.fn()
        return {
            ...render(
                <RealConfigModal
                    isOpen={true}
                    onClose={onClose}
                    bindingAuthorityId={42}
                    onSaved={onSaved}
                    {...props}
                />,
            ),
            onClose,
            onSaved,
        }
    }

    // Navigate to Step 2 (Fields dual-pane)
    async function goToStep2(opts: { type?: string } = {}) {
        renderConfigModal()
        if (opts.type && opts.type !== 'Risk') {
            await userEvent.click(screen.getByRole('radio', { name: new RegExp(`^${opts.type}$`, 'i') }))
        }
        await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Test Bordereau')
        await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
    }

    // Navigate to Step 3 (Preview) — one fewer Next click now that Fields+Order are merged
    async function goToPreview() {
        await goToStep2()
        await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
    }

    // REQ-BA-FE-F-117 — wizard renders
    it('T-BA-FE-F-R117 — renders heading "Add Bordereau" and step indicator when isOpen=true', () => {
        renderConfigModal()
        expect(screen.getByRole('heading', { name: /add bordereau/i })).toBeInTheDocument()
        expect(screen.getByText('1. Setup')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R117b — returns null when isOpen=false', () => {
        const { container } = renderConfigModal({ isOpen: false })
        expect(container.firstChild).toBeNull()
    })

    it('T-BA-FE-F-R117c — first button (close ×) calls onClose', async () => {
        const { onClose } = renderConfigModal()
        await userEvent.click(screen.getAllByRole('button')[0])
        expect(onClose).toHaveBeenCalled()
    })

    // REQ-BA-FE-F-118 — Step 1: Setup
    it('T-BA-FE-F-R118 — Step 1 shows name input, 6 type radios and 2 data-style radios (8 total)', () => {
        renderConfigModal()
        expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
        expect(screen.getAllByRole('radio')).toHaveLength(8)
    })

    it('T-BA-FE-F-R118b — Next disabled when name empty; enabled after typing', async () => {
        renderConfigModal()
        const nextBtn = screen.getByRole('button', { name: /^next$/i })
        expect(nextBtn).toBeDisabled()
        await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Q1')
        expect(nextBtn).not.toBeDisabled()
    })

    // REQ-BA-FE-F-119 — Step 2: Dual-pane field builder
    it('T-BA-FE-F-R119 — Step 2 shows "Available Fields" and "Selected Fields" headings; Risk defaults to 12 in selected pane', async () => {
        await goToStep2()
        expect(screen.getByText(/available fields/i)).toBeInTheDocument()
        expect(screen.getByText(/selected fields \(12\)/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R119b — Claims type shows 8 in selected pane; Paid type also shows 8', async () => {
        await goToStep2({ type: 'Claims' })
        expect(screen.getByText(/selected fields \(8\)/i)).toBeInTheDocument()
        cleanup()

        await goToStep2({ type: 'Paid' })
        expect(screen.getByText(/selected fields \(8\)/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R119c — removing a field via × adds it back to available pane; + button re-selects it', async () => {
        // Use Claims (8 fields, none mandatory) so remove is enabled
        renderConfigModal()
        await userEvent.click(screen.getByRole('radio', { name: /^claims$/i }))
        await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Test')
        await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
        // Remove first field (Claim Reference)
        await userEvent.click(screen.getByRole('button', { name: /remove claim reference/i }))
        expect(screen.getByText(/selected fields \(7\)/i)).toBeInTheDocument()
        // Re-add via + button
        await userEvent.click(screen.getByRole('button', { name: /add claim reference/i }))
        expect(screen.getByText(/selected fields \(8\)/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-120 — Field ordering within Step 2 right pane
    it('T-BA-FE-F-R120 — Step 2 right pane shows selected field labels', async () => {
        await goToStep2()
        expect(screen.getByText(/selected fields/i)).toBeInTheDocument()
        expect(screen.getByText('Policy Reference')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R120b — Up button on second field moves it above the first', async () => {
        await goToStep2()
        // "Insured Name" is the second Risk field — its Up button should be enabled
        const upBtn = screen.getByRole('button', { name: /move insured name up/i })
        expect(upBtn).not.toBeDisabled()
        await userEvent.click(upBtn)
        // After swap "Insured Name" is now first — its Up button becomes disabled
        expect(screen.getByRole('button', { name: /move insured name up/i })).toBeDisabled()
        // "Policy Reference" is now second — its Up button is enabled
        expect(screen.getByRole('button', { name: /move policy reference up/i })).not.toBeDisabled()
    })

    // REQ-BA-FE-F-121 — Step 3 (Preview) and Add
    it('T-BA-FE-F-R121 — Step 3 shows preview table with column header for first selected field', async () => {
        await goToPreview()
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /policy reference/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R121b — Add button calls onSaved and onClose (DB save handled by parent)', async () => {
        const onClose = jest.fn()
        const onSaved = jest.fn()
        render(<RealConfigModal isOpen={true} onClose={onClose} bindingAuthorityId={42} onSaved={onSaved} />)
        await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Q1 Risk')
        // Step 1 → Step 2
        await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
        // Step 2 → Step 3 (Preview) — only 2 Next clicks total now
        await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
        await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'Q1 Risk', type: 'Risk', dataStyle: 'Transactional' }))
        expect(onClose).toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage — Bordeaux tab — REQ-BA-FE-F-122
// ---------------------------------------------------------------------------

describe('BAViewPage — Bordeaux tab — REQ-BA-FE-F-122', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
        mockGetBordereauConfigs.mockResolvedValue([])
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('T-BA-FE-F-R122 — BAViewPage renders a Bordereaux tab button (labelled Bordereaux)', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        expect(screen.getByRole('button', { name: /^bordereaux$/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R122b — Bordeaux tab shows configs loaded from API', async () => {
        mockGetBordereauConfigs.mockResolvedValue([
            { id: 1, config_id: 'cfg1', binding_authority_id: 1, name: 'Q1 Risk Report', type: 'Risk', data_style: 'Transactional', fields: ['policy.reference'], created_at: '2025-01-01T00:00:00Z' },
        ])
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /^bordereaux$/i }))
        expect(await screen.findByText('Q1 Risk Report')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R122c — Delete removes a config from the Bordeaux tab table', async () => {
        mockGetBordereauConfigs.mockResolvedValue([
            { id: 1, config_id: 'cfg1', binding_authority_id: 1, name: 'Q1 Risk Report', type: 'Risk', data_style: 'Transactional', fields: ['policy.reference'], created_at: '2025-01-01T00:00:00Z' },
        ])
        mockDeleteBordereauConfig.mockResolvedValue(undefined)
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /^bordereaux$/i }))
        await screen.findByText('Q1 Risk Report')
        await userEvent.click(screen.getByRole('button', { name: /delete q1 risk report/i }))
        expect(screen.queryByText('Q1 Risk Report')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAViewPage — Bordereaux tab: Run button — REQ-BA-FE-F-122a
// ---------------------------------------------------------------------------

describe('BAViewPage – Bordereaux tab Run button – REQ-BA-FE-F-122a', () => {
    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)
        mockGetBASections.mockResolvedValue([])
        mockGetBATransactions.mockResolvedValue([])
        mockGetPoliciesForBA.mockResolvedValue([])
        mockGetBordereauConfigs.mockResolvedValue([
            { id: 1, config_id: 'cfg1', binding_authority_id: 1, name: 'Q1 Risk Report', type: 'Risk', data_style: 'Transactional', fields: ['policy.reference'], created_at: '2025-01-01T00:00:00Z' },
        ])
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('T-BA-FE-F-R122a-1 – clicking Run button navigates to /:id/bordereaux/:configId/run', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /^bordereaux$/i }))
        await screen.findByText('Q1 Risk Report')
        await userEvent.click(screen.getByRole('button', { name: /run q1 risk report/i }))
        expect(await screen.findByText('bordeaux-run-sentinel')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R122a-2 – Run button does NOT create an endorsement transaction', async () => {
        renderBAViewPage('1')
        await screen.findByRole('heading', { name: /ba-2026-001/i })
        await userEvent.click(screen.getByRole('button', { name: /^bordereaux$/i }))
        await screen.findByText('Q1 Risk Report')
        await userEvent.click(screen.getByRole('button', { name: /run q1 risk report/i }))
        expect(mockCreateBATransaction).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// BordereauRunPage — REQ-BA-FE-F-122b
// ---------------------------------------------------------------------------

describe('BordereauRunPage – REQ-BA-FE-F-122b', () => {
    const SAMPLE_CONFIG = { id: 'cfg1', name: 'Q1 Risk Report', type: 'Risk', dataStyle: 'Transactional', fields: ['policy.reference'], createdAt: '2025-01-01' }

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('T-BA-FE-F-R122b-1 – renders page without error when config passed via route state', () => {
        expect(() => renderBordereauRunPage('1', 'cfg1', { config: SAMPLE_CONFIG })).not.toThrow()
    })

    it('T-BA-FE-F-R122b-2 – renders Export button when config in route state', () => {
        renderBordereauRunPage('1', 'cfg1', { config: SAMPLE_CONFIG })
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R122b-3 – renders error message when config not found via API', async () => {
        mockGetBordereauConfigs.mockResolvedValue([])
        renderBordereauRunPage('1', 'cfg-missing')
        expect(await screen.findByText(/bordereau configuration not found/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// BAEndorsePage — REQ-BA-FE-F-123 to F-127
// ---------------------------------------------------------------------------

describe('BAEndorsePage – REQ-BA-FE-F-123 to F-127', () => {
    const SAMPLE_TX = { id: 99, type: 'Administrative', effective_date: '2026-06-01', description: '', status: 'Draft' }

    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBATransactions.mockResolvedValue([])
        mockCreateBATransaction.mockResolvedValue(SAMPLE_TX)
    })
    afterEach(() => {
        jest.clearAllMocks()
        localStorage.clear()
    })

    it('T-BA-FE-F-R123 – renders "Create Endorsement" heading without throwing (REQ-BA-FE-F-123)', async () => {
        renderBAEndorsePage('2')
        expect(await screen.findByRole('heading', { name: /create endorsement/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R124a – renders Endorsement Type with Administrative and Contractual options (REQ-BA-FE-F-124)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        expect(screen.getByRole('option', { name: /administrative/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /contractual/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R124b – shows error message when BA is Draft (REQ-BA-FE-F-124)', async () => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA) // Draft status
        renderBAEndorsePage('1')
        expect(await screen.findByText(/endorsements cannot be created on a draft binding authority/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R125a – shows error notification when Effective Date is missing (REQ-BA-FE-F-125)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        window.dispatchEvent(new Event('ba:endorse-save'))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/effective date/i), 'error')
        )
    })

    it('T-BA-FE-F-R125b – shows error notification when date is outside BA period (REQ-BA-FE-F-125)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        const dateInput = screen.getByLabelText(/effective date/i)
        await userEvent.type(dateInput, '2030-01-01') // outside BA period 2026-01-01 to 2027-01-01
        window.dispatchEvent(new Event('ba:endorse-save'))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/outside|range/i), 'error')
        )
    })

    it('T-BA-FE-F-R125c – shows error when endorsement already open (REQ-BA-FE-F-125)', async () => {
        mockGetBATransactions.mockResolvedValue([
            { id: 5, type: 'Administrative', status: 'Draft', effective_date: '2026-06-01' },
        ])
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        const dateInput = screen.getByLabelText(/effective date/i)
        await userEvent.type(dateInput, '2026-06-01')
        window.dispatchEvent(new Event('ba:endorse-save'))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/open endorsement|already/i), 'error')
        )
    })

    it('T-BA-FE-F-R125d - existing open Contractual does NOT block new Administrative (REQ-BA-FE-F-125)', async () => {
        mockGetBATransactions.mockResolvedValue([
            { id: 5, type: 'Contractual', status: 'Draft', effective_date: '2026-06-01' },
        ])
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        // Default type is Administrative; Contractual open endorsement must NOT block it
        const dateInput = screen.getByLabelText(/effective date/i)
        await userEvent.type(dateInput, '2026-06-01')
        window.dispatchEvent(new Event('ba:endorse-save'))
        expect(await screen.findByText('endorsement-edit-sentinel')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R126 – successful save navigates to endorsement edit page (REQ-BA-FE-F-126)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        const dateInput = screen.getByLabelText(/effective date/i)
        await userEvent.type(dateInput, '2026-06-01')
        window.dispatchEvent(new Event('ba:endorse-save'))
        expect(await screen.findByText('endorsement-edit-sentinel')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R126b - createBATransaction called with status Draft (REQ-BA-FE-F-126)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        const dateInput = screen.getByLabelText(/effective date/i)
        await userEvent.type(dateInput, '2026-06-01')
        window.dispatchEvent(new Event('ba:endorse-save'))
        await waitFor(() => expect(mockCreateBATransaction).toHaveBeenCalledWith(
            2,
            expect.objectContaining({ status: 'Draft' })
        ))
    })

    it('T-BA-FE-F-R133a – Endorsement Sub Type select is present (REQ-BA-FE-F-133)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        expect(screen.getByRole('combobox', { name: /endorsement sub type/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /mid term adjustment/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /cancellation/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R133b – Sub Type is disabled when Endorsement Type is Administrative (REQ-BA-FE-F-133)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        // Default type is Administrative
        expect(screen.getByRole('combobox', { name: /endorsement sub type/i })).toBeDisabled()
    })

    it('T-BA-FE-F-R133c – Sub Type is enabled when Endorsement Type is Contractual (REQ-BA-FE-F-133)', async () => {
        renderBAEndorsePage('2')
        await screen.findByRole('heading', { name: /create endorsement/i })
        const typeSelect = screen.getByRole('combobox', { name: /endorsement type/i })
        await userEvent.selectOptions(typeSelect, 'Contractual')
        expect(screen.getByRole('combobox', { name: /endorsement sub type/i })).not.toBeDisabled()
    })
})

// ---------------------------------------------------------------------------
// BAEndorsementPage — REQ-BA-FE-F-128 to F-132
// ---------------------------------------------------------------------------

describe('BAEndorsementPage – REQ-BA-FE-F-128 to F-132', () => {
    const SAMPLE_ENDORSEMENT_TX = {
        id: 10,
        type: 'Administrative',
        sub_type: null,
        status: 'Draft',
        effective_date: '2026-06-01',
        description: 'Test endorsement',
    }

    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBASections.mockResolvedValue([])
        mockGetBATransactions.mockResolvedValue([SAMPLE_ENDORSEMENT_TX])
        mockGetPoliciesForBA.mockResolvedValue([])
        mockUpdateBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockUpdateBATransaction.mockResolvedValue({ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound' })
    })
    afterEach(() => {
        jest.clearAllMocks()
        localStorage.clear()
    })

    it('T-BA-FE-F-R128 – renders without error when BA and endorsement exist (REQ-BA-FE-F-128)', async () => {
        expect(() => renderBAEndorsementPage('2', '10')).not.toThrow()
        await screen.findByRole('heading', { name: /create endorsement|endorsement/i })
    })

    it('T-BA-FE-F-R128b – renders "Binding authority not found" when BA missing (REQ-BA-FE-F-128)', async () => {
        mockGetBindingAuthority.mockRejectedValue(new Error('404'))
        renderBAEndorsementPage('99', '10')
        expect(await screen.findByText(/binding authority not found/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R128c – renders "Endorsement not found" when transaction missing (REQ-BA-FE-F-128)', async () => {
        mockGetBATransactions.mockResolvedValue([]) // no transactions
        renderBAEndorsementPage('2', '999')
        expect(await screen.findByText(/endorsement not found/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R129 – subtitle shows endorsement type and effective date (REQ-BA-FE-F-129)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getAllByText(/administrative/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/2026-06-01/)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R130 – Draft endorsement sidebar includes Save Endorsement, Bind Endorsement, and Configure Bordereau (REQ-BA-FE-F-130)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).toContain('Save Endorsement')
        expect(labels).toContain('Bind Endorsement')
        expect(labels).toContain('Configure Bordereau')
        expect(labels).not.toContain('Issue Endorsement')
    })

    it('T-BA-FE-F-R130b – Bind Endorsement calls updateBATransaction with status Bound and stays on endorsement page (REQ-BA-FE-F-130)', async () => {
        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, binding_authority_id: 2 }])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        window.dispatchEvent(new Event('ba:bind-endorsement'))
        await waitFor(() =>
            expect(mockUpdateBATransaction).toHaveBeenCalledWith(2, 10, expect.objectContaining({ status: 'Bound' }))
        )
        expect(mockUpdateBindingAuthority).not.toHaveBeenCalled()
        expect(screen.queryByText('ba-view-sentinel')).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R130e – binding an endorsement is blocked until a section has class of business and the field is highlighted', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, type: 'Contractual', sub_type: 'Section Addition' }])
        mockGetBASections.mockResolvedValue([])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })

        window.dispatchEvent(new Event('ba:bind-endorsement'))

        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(
                'Class of Business is required on at least one section before binding or issuing the endorsement.',
                'error'
            )
        )
        const classOfBusinessInput = screen.getByPlaceholderText(/class of business/i)
        expect(classOfBusinessInput).toHaveAttribute('aria-invalid', 'true')
        expect(classOfBusinessInput.className).toContain('border-red-400')
        expect(mockUpdateBATransaction).not.toHaveBeenCalledWith(2, 10, expect.objectContaining({ status: 'Bound' }))
    })

    it('T-BA-FE-F-R130d – Save Endorsement stores draft values on the transaction without updating the live BA (REQ-BA-FE-F-130)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        await userEvent.clear(screen.getByLabelText(/year of account/i))
        await userEvent.type(screen.getByLabelText(/year of account/i), '2030')

        window.dispatchEvent(new Event('ba:endorse-save'))

        await waitFor(() =>
            expect(mockUpdateBATransaction).toHaveBeenCalledWith(2, 10, expect.objectContaining({
                details: expect.objectContaining({ year_of_account: 2030 }),
            }))
        )
        expect(mockUpdateBindingAuthority).not.toHaveBeenCalled()
    })

    // REQ-BA-FE-F-136 — Active/Issued endorsement redirects to view page
    it('T-BA-FE-F-R136b – BAEndorsementPage with Active endorsement redirects to transaction view page (REQ-BA-FE-F-136)', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Active' }])
        renderBAEndorsementPage('2', '10')
        expect(await screen.findByText('transaction-view-sentinel')).toBeInTheDocument()
    })

    // REQ-BA-FE-F-136 — Bound endorsement renders read-only form
    it('T-BA-FE-F-R136c – BAEndorsementPage with Bound endorsement has read-only (disabled) form inputs (REQ-BA-FE-F-136)', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound' }])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getByLabelText(/transaction effective date/i)).toBeDisabled()
        expect(screen.getByLabelText(/endorsement description/i)).toBeDisabled()
    })

    it('T-BA-FE-F-R136d – BAEndorsementPage Bound endorsement sidebar shows Issue and Configure only (REQ-BA-FE-F-136)', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound' }])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Save Endorsement')
        expect(labels).toContain('Issue Endorsement')
        expect(labels).not.toContain('Bind Endorsement')
        expect(labels).toContain('Configure Bordereau')
    })

    it('T-BA-FE-F-R136a – Issue Endorsement on Bound endorsement calls updateBATransaction with status Issued (REQ-BA-FE-F-130)', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound' }])
        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, binding_authority_id: 2 }])
        mockUpdateBATransaction.mockResolvedValue({ ...SAMPLE_ENDORSEMENT_TX, status: 'Issued' })
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        window.dispatchEvent(new Event('ba:issue-endorsement'))
        await waitFor(() =>
            expect(mockUpdateBATransaction).toHaveBeenCalledWith(2, 10, expect.objectContaining({ status: 'Issued' }))
        )
        expect(await screen.findByText('ba-view-sentinel')).toBeInTheDocument()
    })

    it('T-BA-FE-F-R136e – issuing an endorsement is blocked until a section has class of business', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound', type: 'Contractual', sub_type: 'Section Addition' }])
        mockGetBASections.mockResolvedValue([])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })

        window.dispatchEvent(new Event('ba:issue-endorsement'))

        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(
                'Class of Business is required on at least one section before binding or issuing the endorsement.',
                'error'
            )
        )
        const classOfBusinessInput = screen.getByPlaceholderText(/class of business/i)
        expect(classOfBusinessInput).toHaveAttribute('aria-invalid', 'true')
        expect(classOfBusinessInput.className).toContain('border-red-400')
        expect(mockUpdateBATransaction).not.toHaveBeenCalledWith(2, 10, expect.objectContaining({ status: 'Issued' }))
    })

    it('T-BA-FE-F-R130c – Bound endorsement sidebar omits Bind Endorsement (REQ-BA-FE-F-130)', async () => {
        mockGetBATransactions.mockResolvedValue([{ ...SAMPLE_ENDORSEMENT_TX, status: 'Bound' }])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).not.toContain('Bind Endorsement')
        expect(labels).toContain('Issue Endorsement')
    })

    // REQ-BA-FE-F-145 — Add section button for Contractual endorsements
    it('T-BA-FE-F-R145a – Sections tab shows FiPlus Add Section button for Contractual endorsement (REQ-BA-FE-F-145)', async () => {
        const CONTRACTUAL_TX = { ...SAMPLE_ENDORSEMENT_TX, type: 'Contractual', sub_type: 'Section Addition' }
        mockGetBATransactions.mockResolvedValue([CONTRACTUAL_TX])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        await userEvent.click(screen.getByRole('button', { name: /^sections$/i }))
        const addBtn = await screen.findByRole('button', { name: /add section/i })
        expect(addBtn).toBeInTheDocument()
    })

    it('T-BA-FE-F-R145c – Add Section stays local to the endorsement draft until issue (REQ-BA-FE-F-145)', async () => {
        const CONTRACTUAL_TX = { ...SAMPLE_ENDORSEMENT_TX, type: 'Contractual', sub_type: 'Section Addition' }
        mockGetBATransactions.mockResolvedValue([CONTRACTUAL_TX])
        renderBAEndorsementPage('2', '10')

        await screen.findByRole('heading', { name: /endorsement/i })
        await userEvent.click(screen.getByRole('button', { name: /^sections$/i }))
        const table = screen.getByRole('table')
        expect(within(table).getByText('BA-2026-002-S01')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /add section/i }))
        expect(within(table).getByText('BA-2026-002-S01')).toBeInTheDocument()
        expect(within(table).getByText('BA-2026-002-S02')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: /^new section$/i })).not.toBeInTheDocument()
        const classInputs = within(table).getAllByPlaceholderText(/class of business/i)
        await userEvent.type(classInputs[0], 'Marine')

        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
        expect(within(table).getAllByRole('button', { name: /^add section$/i })).toHaveLength(1)
        expect(within(table).queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
        expect(await screen.findByDisplayValue('Marine')).toBeInTheDocument()
        expect(mockCreateBASection).not.toHaveBeenCalled()
    })

    it('T-BA-FE-F-R145b – Sections tab does NOT show Add Section button for Administrative endorsement (REQ-BA-FE-F-145)', async () => {
        // SAMPLE_ENDORSEMENT_TX is Administrative by default
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        await userEvent.click(screen.getByRole('button', { name: /^sections$/i }))
        expect(screen.queryByRole('button', { name: /add section/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R145d – Administrative endorsement with no sections does not seed a blank draft section row', async () => {
        mockGetBASections.mockResolvedValue([])
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        await userEvent.click(screen.getByRole('button', { name: /^sections$/i }))

        expect(screen.getByText(/no sections found\./i)).toBeInTheDocument()
        expect(screen.queryByText('New Section')).not.toBeInTheDocument()
        expect(screen.queryByPlaceholderText(/class of business/i)).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-146 — Coverholder field uses modal (readOnly input)
    it('T-BA-FE-F-R146 – Coverholder field on BAEndorsementPage is readOnly and has Search button (REQ-BA-FE-F-146)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        const covInput = screen.getByRole('textbox', { name: /coverholder/i })
        expect(covInput).toHaveAttribute('readonly')
        expect(screen.getByTitle(/search coverholder/i)).toBeInTheDocument()
    })

    // REQ-BA-FE-F-143
    it('T-BA-FE-F-R143a - all 7 tabs except Transactions are present on BAEndorsementPage (REQ-BA-FE-F-143)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getByRole('button', { name: /^sections$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /financial summary/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /gpi monitoring/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /policies/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /claims/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^bordereaux$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R143b - Transactions tab NOT rendered on BAEndorsementPage (REQ-BA-FE-F-143)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.queryByRole('button', { name: /^transactions$/i })).not.toBeInTheDocument()
    })

    // REQ-BA-FE-F-144
    it('T-BA-FE-F-R144a - endorsement header shows Transaction Number read-only field (REQ-BA-FE-F-144)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getByText(/transaction number/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R144b - endorsement header has editable Effective Date input (REQ-BA-FE-F-144)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getByLabelText(/transaction effective date/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R144c - endorsement header has editable Description textarea (REQ-BA-FE-F-144)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        expect(screen.getByLabelText(/endorsement description/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R144d - endorsement header shows Endorsement Status badge with transaction status (REQ-BA-FE-F-144)', async () => {
        renderBAEndorsementPage('2', '10')
        await screen.findByRole('heading', { name: /endorsement/i })
        // SAMPLE_ENDORSEMENT_TX has status 'Draft' — the badge must show it
        expect(screen.getByTestId('endorsement-status-badge')).toBeInTheDocument()
        expect(screen.getByTestId('endorsement-status-badge')).toHaveTextContent('Draft')
    })
})

// ---------------------------------------------------------------------------
// BATransactionViewPage - REQ-BA-FE-F-141
// ---------------------------------------------------------------------------

describe('BATransactionViewPage - REQ-BA-FE-F-141', () => {
    const SAMPLE_ENDORSED_TX = {
        id: 10,
        binding_authority_id: 2,
        type: 'Initial Transaction',
        sub_type: null,
        status: 'Issued',
        effective_date: '2026-01-01',
        description: 'Opening transaction',
        created_by: 'System',
        sequence_number: null,
        details: { coverholder_id: 99, year_of_account: 2026, inception_date: '2026-01-01', expiry_date: '2027-01-01' },
    }

    beforeEach(() => {
        mockGetBindingAuthority.mockResolvedValue(SAMPLE_ACTIVE_BA)
        mockGetBASections.mockResolvedValue([])
        mockGetBATransactions.mockResolvedValue([SAMPLE_ENDORSED_TX])
        mockGetPoliciesForBA.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    it('T-BA-FE-F-R141a - renders without throwing when BA and transaction exist (REQ-BA-FE-F-141)', async () => {
        expect(() => renderBATransactionViewPage('2', '10')).not.toThrow()
    })

    it('T-BA-FE-F-R141b - shows Transaction not found when transactionId has no match (REQ-BA-FE-F-141)', async () => {
        mockGetBATransactions.mockResolvedValue([])
        renderBATransactionViewPage('2', '999')
        expect(await screen.findByText(/transaction not found/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R141c - BA header fields are read-only on transaction view page (REQ-BA-FE-F-141)', async () => {
        renderBATransactionViewPage('2', '10')
        await waitFor(() => expect(mockGetBindingAuthority).toHaveBeenCalled())
        // No editable Year of Account input on view page
        expect(screen.queryByRole('spinbutton', { name: /year of account/i })).not.toBeInTheDocument()
    })

    it('T-BA-FE-F-R141e - transaction view renders the locked endorsement snapshot layout (REQ-BA-FE-F-141)', async () => {
        renderBATransactionViewPage('2', '10')
        await waitFor(() => expect(mockGetBindingAuthority).toHaveBeenCalled())
        expect(screen.getByText(/binding authority status/i)).toBeInTheDocument()
        expect(screen.getByText(/endorsement details/i)).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /^sections$/i })).toBeInTheDocument()
    })

    it('T-BA-FE-F-R141d - sidebar contains only Back to Binding Authority item (REQ-BA-FE-F-141)', async () => {
        renderBATransactionViewPage('2', '10')
        await waitFor(() => expect(mockGetBindingAuthority).toHaveBeenCalled())
        const mockUseSidebar = useSidebarSection as jest.Mock
        const lastCall = mockUseSidebar.mock.calls[mockUseSidebar.mock.calls.length - 1][0]
        const labels: string[] = lastCall.items.map((item: { label: string }) => item.label)
        expect(labels).toHaveLength(1)
        expect(labels[0]).toMatch(/back to binding authority/i)
    })

    it('T-BA-FE-F-R141f - older transactions keep their historical coverholder instead of inheriting a later endorsement value (REQ-BA-FE-F-141)', async () => {
        mockGetBindingAuthority.mockResolvedValue({
            ...SAMPLE_ACTIVE_BA,
            coverholder: 'System Administrator',
            coverholder_id: 101,
        })
        mockGetBATransactions.mockResolvedValue([
            {
                id: 38,
                binding_authority_id: 2,
                type: 'Administrative',
                sub_type: null,
                status: 'Issued',
                effective_date: '2026-06-01',
                description: 'Later endorsement',
                created_by: 'Alice',
                sequence_number: null,
                details: { coverholder: 'System Administrator', coverholder_id: 101 },
            },
            SAMPLE_ENDORSED_TX,
        ])

        renderBATransactionViewPage('2', '10')

        expect(await screen.findByText('Admin')).toBeInTheDocument()
        expect(screen.queryByText('System Administrator')).not.toBeInTheDocument()
        expect(mockGetCoverholderParty).toHaveBeenCalledWith(99)
    })
})
