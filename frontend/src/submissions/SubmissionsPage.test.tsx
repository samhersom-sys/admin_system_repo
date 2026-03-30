/**
 * TESTS — SubmissionsPage
 * Second artifact. Requirements: submissions.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 * Test ID format: T-SUB-LIST-R[NN]
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SubmissionsPage from './SubmissionsPage'
import { get } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT (unverified — backend endpoint pending implementation):
//   GET /api/submissions  → [{ id, reference, insured, placingBroker, contractType, inceptionDate, status }]
//   Response is an array at root level (no .data wrapper)
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
}))

const mockGet = get as jest.Mock

const SAMPLE_SUBMISSIONS = [
    {
        id: 1,
        reference: 'SUB-TST-20260101-001',
        insured: 'Alpha Corp',
        placingBroker: 'Broker A',
        contractType: 'Insurance',
        inceptionDate: '2026-01-01',
        status: 'Created',
    },
    {
        id: 2,
        reference: 'SUB-TST-20260201-002',
        insured: 'Beta Ltd',
        placingBroker: 'Broker B',
        contractType: 'Reinsurance',
        inceptionDate: '2026-02-01',
        status: 'In Review',
    },
]

function renderPage() {
    return render(
        <MemoryRouter>
            <SubmissionsPage />
        </MemoryRouter>,
    )
}

describe('SubmissionsPage', () => {
    beforeEach(() => {
        mockGet.mockResolvedValue(SAMPLE_SUBMISSIONS)
    })
    afterEach(() => jest.clearAllMocks())

    it('T-SUB-LIST-R01: renders the page heading "Submissions"', async () => {
        renderPage()
        expect(await screen.findByRole('heading', { name: /submissions/i })).toBeInTheDocument()
    })

    it('T-SUB-LIST-R02: renders a New Submission link pointing to /submissions/new', async () => {
        renderPage()
        const link = await screen.findByRole('link', { name: /new submission/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/submissions/new')
    })

    it('T-SUB-LIST-R03: calls GET /api/submissions on mount', async () => {
        renderPage()
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('/api/submissions')
        })
    })

    it('T-SUB-LIST-R04: renders grid rows with submission references from API', async () => {
        renderPage()
        expect(await screen.findByText('SUB-TST-20260101-001')).toBeInTheDocument()
        expect(screen.getByText('SUB-TST-20260201-002')).toBeInTheDocument()
    })

    it('T-SUB-LIST-R05: renders insured names in the grid', async () => {
        renderPage()
        expect(await screen.findByText('Alpha Corp')).toBeInTheDocument()
        expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
    })

    it('T-SUB-LIST-R06: status dropdown filters displayed rows', async () => {
        renderPage()
        await screen.findByText('SUB-TST-20260101-001')

        const select = screen.getByRole('combobox', { name: /filter by status/i })
        await userEvent.selectOptions(select, 'In Review')

        await waitFor(() => {
            expect(screen.queryByText('SUB-TST-20260101-001')).not.toBeInTheDocument()
        })
        expect(screen.getByText('SUB-TST-20260201-002')).toBeInTheDocument()
    })

    it('T-SUB-LIST-R07: count badge reflects number of visible rows', async () => {
        renderPage()
        await screen.findByText('SUB-TST-20260101-001')
        expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('T-SUB-LIST-R08: shows empty state when no submissions match filter', async () => {
        mockGet.mockResolvedValue([])
        renderPage()
        expect(await screen.findByText(/no submissions found/i)).toBeInTheDocument()
    })

    it('T-SUB-LIST-R09: shows error message when API call fails', async () => {
        mockGet.mockRejectedValue(new Error('Network error'))
        renderPage()
        expect(await screen.findByText(/network error/i)).toBeInTheDocument()
    })
})

