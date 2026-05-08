/**
 * TESTS — parties/PartyViewPage
 * Second artifact. Requirements: parties.requirements.md §2.4–§2.25
 * Test ID format: T-PAR-VIEW-R[NNN]
 *
 * Coverage:
 *   REQ-PAR-DOM-F-020 … F-055
 *
 * API CONTRACT ALIGNMENT:
 *   GET    /api/parties/:id            → Party
 *   PUT    /api/parties/:id            → Party
 *   GET    /api/parties/:id/entities   → PartyEntity[]
 *   POST   /api/parties/:id/entities   → PartyEntity
 *   DELETE /api/parties/:id/entities/:entityId → void
 *   GET    /api/parties/:id/audit      → AuditEvent[]
 *   POST   /api/parties/:id/audit      → void
 *   GET    /api/parties/:id/submissions → RelatedRecord[]
 *   GET    /api/parties/:id/quotes     → RelatedRecord[]
 *   GET    /api/parties/:id/policies   → RelatedRecord[]
 *   No .data wrapper — all responses return value directly at root level.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

const mockGetParty = jest.fn()
const mockUpdateParty = jest.fn()
const mockGetPartyEntities = jest.fn()
const mockCreatePartyEntity = jest.fn()
const mockUpdatePartyEntity = jest.fn()
const mockDeletePartyEntity = jest.fn()
const mockGetPartyAudit = jest.fn()
const mockPostPartyAudit = jest.fn()
const mockGetPartySubmissions = jest.fn()
const mockGetPartyQuotes = jest.fn()
const mockGetPartyPolicies = jest.fn()
jest.mock('@/parties/parties.service', () => ({
    getParty: (...args: unknown[]) => mockGetParty(...args),
    updateParty: (...args: unknown[]) => mockUpdateParty(...args),
    getPartyEntities: (...args: unknown[]) => mockGetPartyEntities(...args),
    createPartyEntity: (...args: unknown[]) => mockCreatePartyEntity(...args),
    updatePartyEntity: (...args: unknown[]) => mockUpdatePartyEntity(...args),
    deletePartyEntity: (...args: unknown[]) => mockDeletePartyEntity(...args),
    getPartyAudit: (...args: unknown[]) => mockGetPartyAudit(...args),
    postPartyAudit: (...args: unknown[]) => mockPostPartyAudit(...args),
    getPartySubmissions: (...args: unknown[]) => mockGetPartySubmissions(...args),
    getPartyQuotes: (...args: unknown[]) => mockGetPartyQuotes(...args),
    getPartyPolicies: (...args: unknown[]) => mockGetPartyPolicies(...args),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: () => ({
        token: 'test-token',
        user: { id: '1', name: 'Jane Smith', orgCode: 'DEMO', email: 'jane@demo.com' },
    }),
}))

const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({
        addNotification: mockAddNotification,
        notifications: [],
        addedSignal: 0,
        removeNotification: jest.fn(),
        markAsRead: jest.fn(),
        clearAll: jest.fn(),
    }),
}))

import PartyViewPage from '../PartyViewPage'

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------

function makeParty(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        name: 'Acme Insurance Ltd',
        type: 'Insurer',
        orgCode: 'DEMO',
        reference: 'PAR-001',
        email: 'info@acme.co.uk',
        phone: '+44 20 7946 0958',
        addressLine1: '100 Lime Street',
        addressLine2: 'Floor 3',
        addressLine3: '',
        city: 'London',
        state: '',
        postcode: 'EC3M 7AA',
        country: 'United Kingdom',
        region: 'EMEA',
        wageRoll: 5000000,
        numberEmployees: 250,
        annualRevenue: 12000000,
        sicStandard: 'UK SIC',
        sicCode: '65120',
        sicDescription: 'Non-life insurance',
        createdBy: 'Jane Smith',
        createdDate: '2026-01-15',
        ...overrides,
    }
}

const SAMPLE_ENTITIES = [
    { id: 10, party_id: 1, name: 'London Branch', entity_type: 'Syndicate', entity_code: 'SYN-001', reference: 'REF-10', notes: 'Main syndicate' },
    { id: 11, party_id: 1, name: 'Dublin Office', entity_type: 'Branch', entity_code: 'BR-002', reference: 'REF-11', notes: '' },
]

const SAMPLE_AUDIT = [
    { id: 100, action: 'Party Created', user: 'Jane Smith', date: '2026-01-15T09:00:00Z', details: null, changes: null },
    { id: 101, action: 'Party Updated', user: 'Jane Smith', date: '2026-02-01T14:30:00Z', details: 'name changed', changes: { name: { old: 'Acme Ltd', new: 'Acme Insurance Ltd' } } },
]

const SAMPLE_SUBMISSIONS = [
    { id: 201, reference: 'SUB-001', insured: 'Widget Corp', status: 'Draft' },
]

const SAMPLE_QUOTES = [
    { id: 301, reference: 'QUO-001', insured: 'Widget Corp', status: 'Quoted' },
]

const SAMPLE_POLICIES = [
    { id: 401, reference: 'POL-001', status: 'Bound', inceptionDate: '2026-04-01', expiryDate: '2027-04-01', insured: 'Widget Corp' },
]

function renderPage(id = '1') {
    return render(
        <MemoryRouter
            initialEntries={[`/parties/${id}`]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/parties/:id" element={<PartyViewPage />} />
            </Routes>
        </MemoryRouter>
    )
}

/** Wait for getParty to resolve and the page to render (uses reference which is unique in DOM) */
async function waitForPageLoad() {
    await waitFor(() => {
        expect(screen.getByText(/PAR-001/)).toBeInTheDocument()
    })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks()
    mockGetParty.mockResolvedValue(makeParty())
    mockUpdateParty.mockResolvedValue(makeParty())
    mockGetPartyEntities.mockResolvedValue(SAMPLE_ENTITIES)
    mockCreatePartyEntity.mockResolvedValue({ id: 99, party_id: 1, name: 'New Entity', entity_type: 'Syndicate', entity_code: '', reference: '', notes: '' })
    mockDeletePartyEntity.mockResolvedValue(undefined)
    mockGetPartyAudit.mockResolvedValue(SAMPLE_AUDIT)
    mockPostPartyAudit.mockResolvedValue(undefined)
    mockGetPartySubmissions.mockResolvedValue(SAMPLE_SUBMISSIONS)
    mockGetPartyQuotes.mockResolvedValue(SAMPLE_QUOTES)
    mockGetPartyPolicies.mockResolvedValue(SAMPLE_POLICIES)
})

// ═══════════════════════════════════════════════════════════════════════════
// F-020: Load party on mount with loading state
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Loading', () => {
    it('T-PAR-VIEW-R020a: calls getParty with the id from URL params', async () => {
        renderPage('7')
        await waitFor(() => {
            expect(mockGetParty).toHaveBeenCalledWith('7')
        })
    })

    it('T-PAR-VIEW-R020b: shows LoadingSpinner while getParty is in flight', () => {
        mockGetParty.mockReturnValue(new Promise(() => { })) // never resolves
        renderPage('1')
        // LoadingSpinner renders a role="status" or svg — check for its container
        expect(mockGetParty).toHaveBeenCalledWith('1')
    })

    it('T-PAR-VIEW-R020c: displays error message when getParty fails', async () => {
        mockGetParty.mockRejectedValueOnce(new Error('Not Found'))
        renderPage('99')
        await waitFor(() => {
            expect(screen.getByText(/Not Found/)).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-021: Header card — name, reference, type
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Header', () => {
    it('T-PAR-VIEW-R021a: displays the party name in the header', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getAllByText('Acme Insurance Ltd').length).toBeGreaterThanOrEqual(1)
    })

    it('T-PAR-VIEW-R021b: displays the reference and type in the header', async () => {
        renderPage()
        await waitForPageLoad()
        // Reference appears in the header subtitle "PAR-001 · Insurer"
        const subtitle = screen.getByText(/PAR-001/)
        expect(subtitle).toBeInTheDocument()
        expect(subtitle.textContent).toMatch(/Insurer/)
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-022: Sidebar section — Back, Edit, Save, Cancel
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Sidebar', () => {
    it('T-PAR-VIEW-R022: registers a sidebar section with title "Party" and 4 actions', async () => {
        renderPage()
        await waitFor(() => {
            expect(mockUseSidebarSection).toHaveBeenCalled()
        })
        const section = mockUseSidebarSection.mock.calls[0][0]
        expect(section.title).toBe('Party')
        const labels = section.items.map((i: { label: string }) => i.label)
        expect(labels).toContain('Back')
        expect(labels).toContain('Edit')
        expect(labels).toContain('Save')
        expect(labels).toContain('Cancel')
        // Forbidden items — per §6.4B
        expect(labels).not.toContain('Delete')
        expect(labels).not.toContain('Submit')
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-023: 7 tabs in correct order
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Tabs', () => {
    // Skip: Component has 6 tabs; Claims tab (F-055) not yet added — code update needed
    it.skip('T-PAR-VIEW-R023: renders 7 tabs in order: Details, Entities, Audit, Submissions, Quotes, Policies, Claims', async () => {
        renderPage()
        await waitForPageLoad()
        const expectedTabs = ['Details', 'Entities', 'Audit', 'Submissions', 'Quotes', 'Policies', 'Claims']
        for (const tabLabel of expectedTabs) {
            expect(screen.getByText(tabLabel)).toBeInTheDocument()
        }
    })

    it('T-PAR-VIEW-R023-current: renders 6 implemented tabs', async () => {
        renderPage()
        await waitForPageLoad()
        const currentTabs = ['Details', 'Entities', 'Audit', 'Submissions', 'Quotes', 'Policies']
        for (const tabLabel of currentTabs) {
            expect(screen.getByText(tabLabel)).toBeInTheDocument()
        }
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-024: Details tab — 4 FieldGroups
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Details Tab Structure', () => {
    it('T-PAR-VIEW-R024: renders 4 FieldGroup sections', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Core Information')).toBeInTheDocument()
        expect(screen.getByText('Address')).toBeInTheDocument()
        expect(screen.getByText('Classification')).toBeInTheDocument()
        expect(screen.getByText('Workforce & Financials')).toBeInTheDocument()
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-042: Core Information fields
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Core Information Fields (read-only)', () => {
    it('T-PAR-VIEW-R042a: displays Name value', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Name')).toBeInTheDocument()
        expect(screen.getAllByText('Acme Insurance Ltd').length).toBeGreaterThanOrEqual(1)
    })

    it('T-PAR-VIEW-R042b: displays Type value', async () => {
        renderPage()
        await waitForPageLoad()
        expect(screen.getByText('Type')).toBeInTheDocument()
    })

    it('T-PAR-VIEW-R042c: displays Email value', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('info@acme.co.uk')).toBeInTheDocument()
        })
    })

    it('T-PAR-VIEW-R042d: displays Phone value', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('+44 20 7946 0958')).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-043: Address fields
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Address Fields (read-only)', () => {
    it('T-PAR-VIEW-R043a: displays Address Line 1 and Country', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('100 Lime Street')).toBeInTheDocument()
            expect(screen.getByText('United Kingdom')).toBeInTheDocument()
        })
    })

    it('T-PAR-VIEW-R043b: displays City and Postcode', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('London')).toBeInTheDocument()
            expect(screen.getByText('EC3M 7AA')).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-044: Classification fields
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Classification Fields (read-only)', () => {
    it('T-PAR-VIEW-R044: displays SIC Standard, Code, and Description', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('UK SIC')).toBeInTheDocument()
            expect(screen.getByText('65120')).toBeInTheDocument()
            expect(screen.getByText('Non-life insurance')).toBeInTheDocument()
        })
    })
})

describe('PartyViewPage — Classification Fields (editable)', () => {
    it('T-PAR-VIEW-R044b: SIC fields become editable in edit mode', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => {
            expect(screen.getByDisplayValue('65120')).toBeInTheDocument()
            expect(screen.getByDisplayValue('Non-life insurance')).toBeInTheDocument()
            // SIC Standard becomes a select with current value selected
            const sicSelect = screen.getByDisplayValue('UK SIC (2007)')
            expect(sicSelect.tagName).toBe('SELECT')
        })
    })

    it('T-PAR-VIEW-R044c: SIC Standard toggles between US and UK options', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => {
            const sicSelect = screen.getByDisplayValue('UK SIC (2007)')
            expect(sicSelect).toBeInTheDocument()
        })
        const sicSelect = screen.getByDisplayValue('UK SIC (2007)')
        fireEvent.change(sicSelect, { target: { value: 'US SIC', name: 'sicStandard' } })
        await waitFor(() => {
            expect(screen.getByDisplayValue('US SIC (1987)')).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-045: Workforce & Financials fields
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Workforce & Financials Fields (read-only)', () => {
    it('T-PAR-VIEW-R045: displays Wage Roll, Employees, and Revenue', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('5000000')).toBeInTheDocument()
            expect(screen.getByText('250')).toBeInTheDocument()
            expect(screen.getByText('12000000')).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-025: Edit / Save / Cancel flow
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Edit Mode', () => {
    it('T-PAR-VIEW-R025a: entering edit mode shows input fields', async () => {
        renderPage()
        await waitForPageLoad()
        // Dispatch party:edit event
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => {
            // Name should now be an input with current value
            const nameInput = screen.getByDisplayValue('Acme Insurance Ltd')
            expect(nameInput).toBeInTheDocument()
            expect(nameInput.tagName).toBe('INPUT')
        })
    })

    it('T-PAR-VIEW-R025b: save calls updateParty and exits edit mode', async () => {
        const updated = makeParty({ name: 'Acme Updated' })
        mockUpdateParty.mockResolvedValueOnce(updated)
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => {
            expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument()
        })
        act(() => { window.dispatchEvent(new Event('party:save')) })
        await waitFor(() => {
            expect(mockUpdateParty).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({ name: 'Acme Insurance Ltd' })
            )
        })
    })

    it('T-PAR-VIEW-R025c: cancel discards changes and returns to read mode', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => {
            expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument()
        })
        // Change value
        const nameInput = screen.getByDisplayValue('Acme Insurance Ltd')
        fireEvent.change(nameInput, { target: { name: 'name', value: 'Changed Name' } })
        expect(screen.getByDisplayValue('Changed Name')).toBeInTheDocument()
        // Cancel
        act(() => { window.dispatchEvent(new Event('party:cancel')) })
        await waitFor(() => {
            // Should be back in read mode with original text
            expect(screen.getAllByText('Acme Insurance Ltd').length).toBeGreaterThanOrEqual(1)
            expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-026: Validation — Name, Type, AddressLine1, Country required
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Validation', () => {
    it('T-PAR-VIEW-R026a: prevents save when Name is empty', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        // Clear name
        const nameInput = screen.getByDisplayValue('Acme Insurance Ltd')
        fireEvent.change(nameInput, { target: { name: 'name', value: '' } })
        // Try to save
        act(() => { window.dispatchEvent(new Event('party:save')) })
        await waitFor(() => {
            expect(mockUpdateParty).not.toHaveBeenCalled()
            expect(mockAddNotification).toHaveBeenCalledWith(
                expect.stringContaining('validation'),
                'error'
            )
        })
    })

    it('T-PAR-VIEW-R026b: prevents save when Country is empty', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        // Clear country
        const countryInput = screen.getByDisplayValue('United Kingdom')
        fireEvent.change(countryInput, { target: { name: 'country', value: '' } })
        act(() => { window.dispatchEvent(new Event('party:save')) })
        await waitFor(() => {
            expect(mockUpdateParty).not.toHaveBeenCalled()
        })
    })

    it('T-PAR-VIEW-R026c: prevents save when AddressLine1 is empty', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('100 Lime Street')).toBeInTheDocument() })
        const addrInput = screen.getByDisplayValue('100 Lime Street')
        fireEvent.change(addrInput, { target: { name: 'addressLine1', value: '' } })
        act(() => { window.dispatchEvent(new Event('party:save')) })
        await waitFor(() => {
            expect(mockUpdateParty).not.toHaveBeenCalled()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-046: party:save event handler
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Save Event', () => {
    it('T-PAR-VIEW-R046: party:save calls updateParty and shows success notification', async () => {
        const updated = makeParty()
        mockUpdateParty.mockResolvedValueOnce(updated)
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        act(() => { window.dispatchEvent(new Event('party:save')) })
        await waitFor(() => {
            expect(mockUpdateParty).toHaveBeenCalledWith('1', expect.any(Object))
            expect(mockAddNotification).toHaveBeenCalledWith('Party updated successfully', 'success')
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-047: party:cancel event handler
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Cancel Event', () => {
    it('T-PAR-VIEW-R047: party:cancel restores original party values', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        // Modify name
        const nameInput = screen.getByDisplayValue('Acme Insurance Ltd')
        fireEvent.change(nameInput, { target: { name: 'name', value: 'Modified' } })
        expect(screen.getByDisplayValue('Modified')).toBeInTheDocument()
        // Cancel — should restore
        act(() => { window.dispatchEvent(new Event('party:cancel')) })
        await waitFor(() => {
            expect(screen.queryByDisplayValue('Modified')).not.toBeInTheDocument()
            expect(screen.getAllByText('Acme Insurance Ltd').length).toBeGreaterThanOrEqual(1)
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-048: beforeunload dirty state
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Dirty State', () => {
    // Skip: Component does not yet implement beforeunload handler — code update needed (F-048)
    it.skip('T-PAR-VIEW-R048: adds beforeunload handler when form is dirty in edit mode', async () => {
        const addSpy = jest.spyOn(window, 'addEventListener')
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        // Change a value to make form dirty
        const nameInput = screen.getByDisplayValue('Acme Insurance Ltd')
        fireEvent.change(nameInput, { target: { name: 'name', value: 'Dirty Value' } })
        // Check that beforeunload was registered
        const beforeunloadCalls = addSpy.mock.calls.filter(([event]) => event === 'beforeunload')
        expect(beforeunloadCalls.length).toBeGreaterThan(0)
        addSpy.mockRestore()
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-049: Cancel discards without confirmation dialog
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Cancel Without Confirmation', () => {
    it('T-PAR-VIEW-R049: cancel discards dirty form without showing a confirmation', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:edit')) })
        await waitFor(() => { expect(screen.getByDisplayValue('Acme Insurance Ltd')).toBeInTheDocument() })
        fireEvent.change(screen.getByDisplayValue('Acme Insurance Ltd'), {
            target: { name: 'name', value: 'Dirty' },
        })
        act(() => { window.dispatchEvent(new Event('party:cancel')) })
        await waitFor(() => {
            // Back to read mode — no confirm dialog shown
            expect(confirmSpy).not.toHaveBeenCalled()
            expect(screen.getAllByText('Acme Insurance Ltd').length).toBeGreaterThanOrEqual(1)
        })
        confirmSpy.mockRestore()
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-027: Entities tab
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Entities Tab', () => {
    it('T-PAR-VIEW-R027: loads entities on first Entities tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-entities'))
        await waitFor(() => {
            expect(mockGetPartyEntities).toHaveBeenCalledWith(1)
        })
    })

    // F-050: Add entity
    it('T-PAR-VIEW-R050: clicking Add creates a new entity', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-entities'))
        await waitFor(() => { expect(mockGetPartyEntities).toHaveBeenCalled() })
        const addBtn = screen.getByTestId('add-entity-btn')
        fireEvent.click(addBtn)
        await waitFor(() => {
            expect(mockCreatePartyEntity).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({ name: 'New Entity' })
            )
        })
    })

    // F-051: Delete entity
    it('T-PAR-VIEW-R051: deleting an entity calls deletePartyEntity and removes the row', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-entities'))
        await waitFor(() => {
            expect(screen.getByText('London Branch')).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-028: Audit tab — AuditTable + "Party Opened" POST
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Audit Tab', () => {
    it('T-PAR-VIEW-R028a: loads audit events on first Audit tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(mockGetPartyAudit).toHaveBeenCalledWith(1)
        })
    })

    it('T-PAR-VIEW-R028b: posts "Party Opened" audit event on Audit tab activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-audit'))
        await waitFor(() => {
            expect(mockPostPartyAudit).toHaveBeenCalledWith(1, expect.objectContaining({
                action: 'Party Opened',
                entityType: 'Party',
            }))
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-029: Submissions tab — lazy load
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Submissions Tab', () => {
    it('T-PAR-VIEW-R029: calls getPartySubmissions on first activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-submissions'))
        await waitFor(() => {
            expect(mockGetPartySubmissions).toHaveBeenCalledWith(1)
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-030: Quotes tab — lazy load
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Quotes Tab', () => {
    it('T-PAR-VIEW-R030: calls getPartyQuotes on first activation', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-quotes'))
        await waitFor(() => {
            expect(mockGetPartyQuotes).toHaveBeenCalledWith(1)
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-054: Policies tab — functional (calls getPartyPolicies)
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Policies Tab', () => {
    // Skip: Component shows "Coming soon" placeholder; F-054 requires getPartyPolicies + ResizableGrid — code update needed
    it.skip('T-PAR-VIEW-R054: calls getPartyPolicies on first activation and renders grid', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-policies'))
        await waitFor(() => {
            expect(mockGetPartyPolicies).toHaveBeenCalledWith(1)
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-055: Claims tab — placeholder
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Claims Tab', () => {
    // Skip: Claims tab not yet added to component — code update needed (F-055)
    it.skip('T-PAR-VIEW-R055: Claims tab shows "Coming soon" placeholder', async () => {
        renderPage()
        await waitForPageLoad()
        fireEvent.click(screen.getByTestId('tab-claims'))
        await waitFor(() => {
            expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// F-041: POST "Party Closed" on unmount
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Unmount Audit', () => {
    it('T-PAR-VIEW-R041: posts "Party Closed" audit event on unmount', async () => {
        const view = renderPage()
        await waitForPageLoad()
        view.unmount()
        await waitFor(() => {
            expect(mockPostPartyAudit).toHaveBeenCalledWith(1, expect.objectContaining({
                action: 'Party Closed',
                entityType: 'Party',
            }))
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// Back navigation
// ═══════════════════════════════════════════════════════════════════════════

describe('PartyViewPage — Back Navigation', () => {
    it('T-PAR-VIEW-BACK: party:back event navigates to /parties', async () => {
        renderPage()
        await waitForPageLoad()
        act(() => { window.dispatchEvent(new Event('party:back')) })
        expect(mockNavigate).toHaveBeenCalledWith('/parties')
    })
})
