/**
 * SubmissionTabs component - tests
 *
 * Requirements: requirements.md
 */

import React from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { listParties } from '@/parties/parties.service'
import SubmissionTabs from '../SubmissionTabs'

const mockNavigate = jest.fn()
const mockGet = jest.fn()
const mockPut = jest.fn()
const mockPost = jest.fn()
const mockDel = jest.fn()
const mockAddNotification = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}))

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    del: (...args: unknown[]) => mockDel(...args),
}))

jest.mock('@/parties/parties.service', () => ({
    listParties: jest.fn(),
}))

jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

const mockListParties = listParties as jest.Mock

function renderTabs(props: Partial<React.ComponentProps<typeof SubmissionTabs>> = {}) {
    return render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <SubmissionTabs
                submissionId={1}
                contractType="Open Market"
                placingBroker="Marsh Ltd"
                placingBrokerId="20"
                placingBrokerName="Jane Broker"
                insured="Widget Corp"
                insuredId="10"
                isEditLocked={false}
                {...props}
            />
        </MemoryRouter>
    )
}

function mockApiGetByUrl(map: Record<string, unknown | Error>) {
    mockGet.mockImplementation((url: string) => {
        const value = map[url]
        if (value instanceof Error) {
            return Promise.reject(value)
        }
        if (value !== undefined) {
            return Promise.resolve(value)
        }
        return new Promise(() => { })
    })
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(new Promise(() => { }))
    mockPut.mockResolvedValue({})
    mockPost.mockResolvedValue({})
    mockDel.mockResolvedValue({})
    mockListParties.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// R01 - Standard tab set
// ---------------------------------------------------------------------------
describe('R01 - Standard tab set', () => {
    it('T-TABS-R01a: renders five tabs for non-BA contract types', () => {
        renderTabs()
        expect(screen.getByRole('tab', { name: 'Placing Broking' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Quotes' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Policies' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Related Submissions' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Audit' })).toBeInTheDocument()
    })

    it('T-TABS-R01b: does NOT show Binding Authority Contracts tab for Open Market', () => {
        renderTabs()
        expect(screen.queryByRole('tab', { name: 'Binding Authority Contracts' })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 - Binding Authority tab set
// ---------------------------------------------------------------------------
describe('R02 - BA tab set', () => {
    it('T-TABS-R02a: shows BA Contracts tab for Binding Authority Contract type', () => {
        renderTabs({ contractType: 'Binding Authority Contract' })
        expect(screen.getByRole('tab', { name: 'Binding Authority Contracts' })).toBeInTheDocument()
    })

    it('T-TABS-R02b: hides Quotes and Policies tabs for BA contract type', () => {
        renderTabs({ contractType: 'Binding Authority Contract' })
        expect(screen.queryByRole('tab', { name: 'Quotes' })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: 'Policies' })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R03 - Active tab
// ---------------------------------------------------------------------------
describe('R03 - Active tab indicator', () => {
    it('T-TABS-R03a: first tab is active by default', () => {
        renderTabs()
        expect(screen.getByRole('tab', { name: 'Placing Broking' })).toHaveAttribute('aria-selected', 'true')
    })

    it('T-TABS-R03b: clicking a tab makes it active', async () => {
        const user = userEvent.setup()
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Quotes' }))
        expect(screen.getByRole('tab', { name: 'Quotes' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: 'Placing Broking' })).toHaveAttribute('aria-selected', 'false')
    })
})

// ---------------------------------------------------------------------------
// R04 - Tab pane content
// ---------------------------------------------------------------------------
describe('R04 - Tab pane visibility', () => {
    it('T-TABS-R04a: active pane is visible, others are hidden', () => {
        renderTabs()
        const panels = screen.getAllByRole('tabpanel')
        const visible = panels.filter((panel) => !panel.hidden)
        expect(visible).toHaveLength(1)
        expect(visible[0]).toHaveTextContent('Placing Broking')
    })

    it('T-TABS-R04b: switching tabs shows the correct pane', async () => {
        const user = userEvent.setup()
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Quotes' }))
        const panels = screen.getAllByRole('tabpanel')
        const visible = panels.filter((panel) => !panel.hidden)
        expect(visible).toHaveLength(1)
        expect(visible[0]).toHaveTextContent('Quotes')
    })
})

// ---------------------------------------------------------------------------
// R06 - Placing Broking pane - editable
// ---------------------------------------------------------------------------
describe('R06 - Placing Broking pane', () => {
    it('T-TABS-R06a: pre-populates broker company and broker individual name from props', () => {
        renderTabs()
        expect(screen.getByLabelText('Placing Broker Company')).toHaveValue('Marsh Ltd')
        expect(screen.getByLabelText('Broker (individual name)')).toHaveValue('Jane Broker')
    })

    it('T-TABS-R06b: renders a search button for broker party lookup', () => {
        renderTabs()
        expect(screen.getByRole('button', { name: 'Search parties' })).toBeInTheDocument()
    })

    it('T-TABS-R06c: shows placeholder text when no placing broker is set', () => {
        renderTabs({ placingBroker: null, placingBrokerId: null, placingBrokerName: null })
        expect(screen.getByLabelText('Placing Broker Company')).toHaveValue('— search to select —')
    })

    it('T-TABS-R06d: opens the broker search modal when the search button is clicked', async () => {
        const user = userEvent.setup()
        mockListParties.mockResolvedValue([{ id: 5, name: 'Aon', type: 'Broker', orgCode: 'DEMO' }])
        renderTabs()
        await user.click(screen.getByRole('button', { name: 'Search parties' }))
        expect(screen.getByRole('dialog', { name: 'Select broker' })).toBeInTheDocument()
        await waitFor(() => {
            expect(mockListParties).toHaveBeenCalledWith({ type: 'Broker' })
        })
    })

    it('T-TABS-R06e: selecting a broker updates the company field and closes the modal', async () => {
        const user = userEvent.setup()
        mockListParties.mockResolvedValue([{ id: 5, name: 'Aon', type: 'Broker', orgCode: 'DEMO' }])
        renderTabs()
        await user.click(screen.getByRole('button', { name: 'Search parties' }))
        await waitFor(() => {
            expect(screen.getByText('Aon')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Aon'))
        expect(screen.getByLabelText('Placing Broker Company')).toHaveValue('Aon')
        expect(screen.queryByRole('dialog', { name: 'Select broker' })).not.toBeInTheDocument()
    })

    it('T-TABS-R06f: broker individual name is an editable free-text input', async () => {
        const user = userEvent.setup()
        renderTabs()
        const input = screen.getByLabelText('Broker (individual name)')
        await user.clear(input)
        await user.type(input, 'John Smith')
        expect(input).toHaveValue('John Smith')
    })

    it('T-TABS-R06g: changing a field enters dirty state and shows Save Changes and Cancel', async () => {
        const user = userEvent.setup()
        renderTabs()
        const input = screen.getByLabelText('Broker (individual name)')
        await user.clear(input)
        await user.type(input, 'John Smith')
        expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('T-TABS-R06h: Save Changes calls PUT /api/submissions/:id with the edited broker payload', async () => {
        const user = userEvent.setup()
        mockListParties.mockResolvedValue([{ id: 5, name: 'Aon', type: 'Broker', orgCode: 'DEMO' }])
        renderTabs()
        await user.click(screen.getByRole('button', { name: 'Search parties' }))
        await waitFor(() => {
            expect(screen.getByText('Aon')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Aon'))
        const input = screen.getByLabelText('Broker (individual name)')
        await user.clear(input)
        await user.type(input, 'John Smith')
        await user.click(screen.getByRole('button', { name: 'Save Changes' }))
        await waitFor(() => {
            expect(mockPut).toHaveBeenCalledWith('/api/submissions/1', {
                placingBroker: 'Aon',
                placingBrokerId: '5',
                placingBrokerName: 'John Smith',
            })
        })
    })

    it('T-TABS-R06i: Cancel resets fields to their last saved values without saving', async () => {
        const user = userEvent.setup()
        renderTabs()
        const nameInput = screen.getByLabelText('Broker (individual name)')
        await user.clear(nameInput)
        await user.type(nameInput, 'Changed Name')
        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(screen.getByLabelText('Placing Broker Company')).toHaveValue('Marsh Ltd')
        expect(screen.getByLabelText('Broker (individual name)')).toHaveValue('Jane Broker')
        expect(mockPut).not.toHaveBeenCalled()
    })

    it('T-TABS-R06j: submission:save saves the pane when it is dirty', async () => {
        const user = userEvent.setup()
        renderTabs()
        const input = screen.getByLabelText('Broker (individual name)')
        await user.clear(input)
        await user.type(input, 'Saved Via Event')
        await act(async () => {
            window.dispatchEvent(new CustomEvent('submission:save'))
        })
        await waitFor(() => {
            expect(mockPut).toHaveBeenCalledWith('/api/submissions/1', {
                placingBroker: 'Marsh Ltd',
                placingBrokerId: '20',
                placingBrokerName: 'Saved Via Event',
            })
        })
    })

    it('T-TABS-R06k: parent edit lock disables the placing broking controls', () => {
        renderTabs({ isEditLocked: true })
        expect(screen.getByLabelText('Placing Broker Company')).toBeDisabled()
        expect(screen.getByLabelText('Broker (individual name)')).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Search parties' })).toBeDisabled()
    })

    it('T-TABS-R06l: parent edit lock prevents the global save event from issuing a PUT', async () => {
        renderTabs({ isEditLocked: true })
        await act(async () => {
            window.dispatchEvent(new CustomEvent('submission:save'))
        })
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(mockPut).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R07 - Audit pane content
// ---------------------------------------------------------------------------
describe('R07 - Audit pane', () => {
    it('T-TABS-R07a: shows loading indicator while fetch is in flight', async () => {
        mockGet.mockReturnValue(new Promise(() => { }))
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Audit' }))
        expect(screen.getByLabelText('Loading audit trail')).toBeInTheDocument()
    })

    it('T-TABS-R07b: renders event rows after successful fetch', async () => {
        mockApiGetByUrl({
            '/api/audit/Submission/1': [
                { action: 'Submission Created', user: 'Jane Smith', date: '2026-03-14T10:00:00.000Z' },
                { action: 'Submission Updated', user: 'Bob Jones', date: '2026-03-14T11:00:00.000Z' },
            ],
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Audit' }))
        await waitFor(() => {
            expect(screen.getByText('Submission Created')).toBeInTheDocument()
            expect(screen.getByText('Jane Smith')).toBeInTheDocument()
            expect(screen.getByText('Submission Updated')).toBeInTheDocument()
            expect(screen.getByText('Bob Jones')).toBeInTheDocument()
        })
    })

    it('T-TABS-R07c: shows empty state when no events are returned', async () => {
        mockApiGetByUrl({ '/api/audit/Submission/1': [] })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Audit' }))
        await waitFor(() => {
            expect(screen.getByText('No audit events recorded.')).toBeInTheDocument()
        })
    })

    it('T-TABS-R07d: shows error message when fetch fails', async () => {
        mockApiGetByUrl({ '/api/audit/Submission/1': new Error('Network error') })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Audit' }))
        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })
    })

    it('T-TABS-R07e: calls get with the correct URL including submissionId', async () => {
        mockApiGetByUrl({ '/api/audit/Submission/42': [] })
        renderTabs({ submissionId: 42 })
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('/api/audit/Submission/42')
        })
    })
})

// ---------------------------------------------------------------------------
// R08 - Quotes pane - functional
// ---------------------------------------------------------------------------
describe('R08 - Quotes pane', () => {
    it('T-TABS-R08a: fetches quotes lazily on first tab activation', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/quotes?submission_id=1': [],
        })
        renderTabs()
        expect(mockGet).not.toHaveBeenCalledWith('/api/quotes?submission_id=1')
        await user.click(screen.getByRole('tab', { name: 'Quotes' }))
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('/api/quotes?submission_id=1')
        })
    })

    it('T-TABS-R08b: shows loading state while quotes fetch is in flight', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/api/quotes?submission_id=1') return new Promise(() => { })
            if (url === '/api/audit/Submission/1') return Promise.resolve([])
            return new Promise(() => { })
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Quotes' }))
        expect(screen.getByText('Loading quotes…')).toBeInTheDocument()
    })

    it('T-TABS-R08c: renders quotes table rows after successful fetch', async () => {
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/quotes?submission_id=1': [
                { id: 7, reference: 'Q-001', status: 'Quoted', createdBy: 'Jane Smith', updatedBy: 'Bob Jones' },
            ],
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Quotes' }))
        await waitFor(() => {
            expect(screen.getByText('Q-001')).toBeInTheDocument()
            expect(screen.getByText('Quoted')).toBeInTheDocument()
            expect(screen.getByText('Jane Smith')).toBeInTheDocument()
            expect(screen.getByText('Bob Jones')).toBeInTheDocument()
        })
    })

    it('T-TABS-R08d: renders a View link to the quote page', async () => {
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/quotes?submission_id=1': [
                { id: 7, reference: 'Q-001', status: 'Quoted', createdBy: 'Jane Smith', updatedBy: 'Bob Jones' },
            ],
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Quotes' }))
        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'View quote Q-001' })).toHaveAttribute('href', '/quotes/7')
        })
    })

    it('T-TABS-R08e: shows empty state when no quotes are linked', async () => {
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/quotes?submission_id=1': [],
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Quotes' }))
        await waitFor(() => {
            expect(screen.getByText('No quotes linked to this submission.')).toBeInTheDocument()
        })
    })

    it('T-TABS-R08f: New Quote button navigates to the quote creation route with submissionId', async () => {
        const user = userEvent.setup()
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Quotes' }))
        await user.click(screen.getByRole('button', { name: 'New Quote' }))
        expect(mockNavigate).toHaveBeenCalledWith('/quotes/new?submissionId=1')
    })

    it('T-TABS-R08g: shows error message when quotes fetch fails', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/quotes?submission_id=1': new Error('Quotes failed'),
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Quotes' }))
        await waitFor(() => {
            expect(screen.getByText('Quotes failed')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// R09 - Related Submissions pane - functional
// ---------------------------------------------------------------------------
describe('R09 - Related Submissions pane', () => {
    it('T-TABS-R09a: fetches related submissions lazily on first activation', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [],
        })
        renderTabs()
        expect(mockGet).not.toHaveBeenCalledWith('/api/submissions/1/related')
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('/api/submissions/1/related')
        })
    })

    it('T-TABS-R09b: shows loading state while related submissions fetch is in flight', async () => {
        mockGet.mockImplementation((url: string) => {
            if (url === '/api/submissions/1/related') return new Promise(() => { })
            if (url === '/api/audit/Submission/1') return Promise.resolve([])
            return new Promise(() => { })
        })
        renderTabs()
        await userEvent.setup().click(screen.getByRole('tab', { name: 'Related Submissions' }))
        expect(screen.getByText('Loading related submissions…')).toBeInTheDocument()
    })

    it('T-TABS-R09c: renders linked submissions in the table', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [
                { id: 9, reference: 'SUB-009', insured: 'Widget Corp', status: 'Created', inceptionDate: '2026-04-01' },
            ],
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('SUB-009')).toBeInTheDocument()
            expect(screen.getByText('Widget Corp')).toBeInTheDocument()
            expect(screen.getByText('Created')).toBeInTheDocument()
            expect(screen.getByText('2026-04-01')).toBeInTheDocument()
        })
    })

    it('T-TABS-R09d: renders a View link to the related submission page', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [
                { id: 9, reference: 'SUB-009', insured: 'Widget Corp', status: 'Created', inceptionDate: '2026-04-01' },
            ],
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'View submission SUB-009' })).toHaveAttribute('href', '/submissions/9')
        })
    })

    it('T-TABS-R09e: Remove calls DELETE and removes the row from the table', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [
                { id: 9, reference: 'SUB-009', insured: 'Widget Corp', status: 'Created', inceptionDate: '2026-04-01' },
            ],
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('SUB-009')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: 'Remove related submission SUB-009' }))
        await waitFor(() => {
            expect(mockDel).toHaveBeenCalledWith('/api/submissions/1/related/9')
            expect(screen.queryByText('SUB-009')).not.toBeInTheDocument()
        })
    })

    it('T-TABS-R09f: Link Submission button opens the search modal', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [],
            '/api/submissions': [
                { id: 11, reference: 'SUB-011', insured: 'Acme Ltd', placingBroker: 'Aon' },
            ],
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('No related submissions linked.')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: 'Link Submission' }))
        expect(screen.getByRole('dialog', { name: 'Link related submission' })).toBeInTheDocument()
    })

    it('T-TABS-R09g: modal filters results and selecting a submission posts the link and adds the row', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [],
            '/api/submissions': [
                { id: 11, reference: 'SUB-011', insured: 'Acme Ltd', placingBroker: 'Aon', status: 'Created', inceptionDate: '2026-05-01' },
                { id: 12, reference: 'SUB-012', insured: 'Bravo Ltd', placingBroker: 'Marsh', status: 'Created', inceptionDate: '2026-06-01' },
            ],
        })
        mockPost.mockResolvedValue({ id: 12, reference: 'SUB-012', insured: 'Bravo Ltd', placingBroker: 'Marsh', status: 'Created', inceptionDate: '2026-06-01' })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('No related submissions linked.')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: 'Link Submission' }))
        const modal = screen.getByRole('dialog', { name: 'Link related submission' })
        await waitFor(() => {
            expect(within(modal).getByText('SUB-011')).toBeInTheDocument()
            expect(within(modal).getByText('SUB-012')).toBeInTheDocument()
        })
        await user.type(within(modal).getByPlaceholderText('Search submissions...'), 'bravo')
        expect(within(modal).queryByText('SUB-011')).not.toBeInTheDocument()
        expect(within(modal).getByText('SUB-012')).toBeInTheDocument()
        await user.click(within(modal).getByText('SUB-012'))
        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/api/submissions/1/related', { relatedSubmissionId: 12 })
            expect(screen.getByText('SUB-012')).toBeInTheDocument()
            expect(screen.queryByRole('dialog', { name: 'Link related submission' })).not.toBeInTheDocument()
        })
    })

    it('T-TABS-R09h: shows empty state when no related submissions are linked', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': [],
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('No related submissions linked.')).toBeInTheDocument()
        })
    })

    it('T-TABS-R09i: shows error message when related submissions fetch fails', async () => {
        const user = userEvent.setup()
        mockApiGetByUrl({
            '/api/audit/Submission/1': [],
            '/api/submissions/1/related': new Error('Related failed'),
        })
        renderTabs()
        await user.click(screen.getByRole('tab', { name: 'Related Submissions' }))
        await waitFor(() => {
            expect(screen.getByText('Related failed')).toBeInTheDocument()
        })
    })
})
