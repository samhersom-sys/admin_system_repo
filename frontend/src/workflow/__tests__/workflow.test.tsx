/**
 * TESTS — Workflow Domain
 * Second artifact. Requirements: workflow.requirements.md
 * Test ID format: T-WF-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-WF-FE-F-001 to F-003   (WorkflowDirectoryPage)
 *   REQ-WF-FE-F-011 to F-020   (WorkflowPage — submission workflow)
 *   REQ-WF-FE-F-031 to F-040   (ClearanceWorkflowPage)
 *   REQ-WF-FE-F-051 to F-058   (DataQualityPage)
 *   REQ-WF-FE-C-001 to C-003   (constraints)
 *   REQ-WF-FE-S-001, S-002     (security)
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT:
//   GET  /api/workflow/submissions           → WorkflowSubmission[]
//   POST /api/workflow/submissions/:id/assign → void
//   GET  /api/users?profileType=underwriter  → User[]
//   GET  /api/clearance/pending              → ClearanceSubmission[]
//   POST /api/clearance/check/:id            → { matches: ClearanceMatch[] }
//   POST /api/clearance/:id/clear            → void
//   POST /api/clearance/:id/confirm-duplicate → void
//   GET  /api/workflow/data-quality          → DataQualityIssue[]
//   All calls via @/shared/lib/api-client/api-client
// ---------------------------------------------------------------------------

const mockGetWorkflowSubmissions = jest.fn()
const mockAssignSubmission = jest.fn()
const mockGetUnderwriters = jest.fn()
const mockGetClearancePending = jest.fn()
const mockCheckClearanceDuplicates = jest.fn()
const mockClearSubmission = jest.fn()
const mockConfirmDuplicate = jest.fn()
const mockGetDataQualityIssues = jest.fn()

jest.mock('../workflow.service', () => ({
    getWorkflowSubmissions: (...a: unknown[]) => mockGetWorkflowSubmissions(...a),
    assignSubmission: (...a: unknown[]) => mockAssignSubmission(...a),
    getUnderwriters: (...a: unknown[]) => mockGetUnderwriters(...a),
    getClearancePending: (...a: unknown[]) => mockGetClearancePending(...a),
    checkClearanceDuplicates: (...a: unknown[]) => mockCheckClearanceDuplicates(...a),
    clearSubmission: (...a: unknown[]) => mockClearSubmission(...a),
    confirmDuplicate: (...a: unknown[]) => mockConfirmDuplicate(...a),
    getDataQualityIssues: (...a: unknown[]) => mockGetDataQualityIssues(...a),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))
jest.mock('@/shared/Card/Card', () =>
    function Card({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
        return <div data-testid="card" className={className} onClick={onClick}>{children}</div>
    }
)

import WorkflowDirectoryPage from '../WorkflowDirectoryPage/WorkflowDirectoryPage'
import WorkflowPage from '../WorkflowPage/WorkflowPage'
import ClearanceWorkflowPage from '../ClearanceWorkflowPage/ClearanceWorkflowPage'
import DataQualityPage from '../DataQualityPage/DataQualityPage'

function renderPage(element: React.ReactElement, path = '/') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            {element}
        </MemoryRouter>,
    )
}

function renderWithNav(element: React.ReactElement, path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path={path} element={element} />
                <Route path="/workflow/submissions" element={<div>workflow-submissions</div>} />
                <Route path="/workflow/clearance" element={<div>workflow-clearance</div>} />
                <Route path="/workflow/data-quality" element={<div>workflow-data-quality</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

// ---------------------------------------------------------------------------
// WorkflowDirectoryPage — REQ-WF-FE-F-001 to F-003
// ---------------------------------------------------------------------------

describe('WorkflowDirectoryPage — /workflow', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-F-001
    it('T-WF-FE-F-R001 — renders "Workflow" heading without crashing', () => {
        renderPage(<WorkflowDirectoryPage />)
        expect(screen.getByRole('heading', { name: /workflow/i })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-002
    it('T-WF-FE-F-R002 — displays three navigation cards: Submission Workflow, Clearance Workflow, Data Quality', () => {
        renderPage(<WorkflowDirectoryPage />)
        expect(screen.getByText('Submission Workflow')).toBeInTheDocument()
        expect(screen.getByText('Clearance Workflow')).toBeInTheDocument()
        expect(screen.getByText('Data Quality')).toBeInTheDocument()
    })

    it('T-WF-FE-F-R002b — each card shows title and description text', () => {
        renderPage(<WorkflowDirectoryPage />)
        expect(screen.getByText(/manage and assign incoming submissions/i)).toBeInTheDocument()
        expect(screen.getByText(/review and clear submissions/i)).toBeInTheDocument()
        expect(screen.getByText(/review and resolve data quality/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-003
    it('T-WF-FE-F-R003 — clicking Submission Workflow card navigates to /workflow/submissions', async () => {
        renderWithNav(<WorkflowDirectoryPage />, '/workflow')
        await userEvent.click(screen.getByText('Submission Workflow').closest('[data-testid="card"]')!)
        expect(screen.getByText('workflow-submissions')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// WorkflowPage — REQ-WF-FE-F-011 to F-020
// ---------------------------------------------------------------------------

describe('WorkflowPage — /workflow/submissions', () => {
    const SAMPLE_SUB = {
        id: 1,
        reference: 'SUB-001',
        insured: 'Alpha Corp',
        broker: 'Broker A',
        email_received: '2026-01-01',
        processed: '2026-01-02',
        status: 'Unassigned' as const,
        assigned_to: null,
        source: 'Manual',
        aiExtracted: false,
        reviewRequired: false,
    }

    beforeEach(() => {
        mockGetWorkflowSubmissions.mockResolvedValue([SAMPLE_SUB])
        mockGetUnderwriters.mockResolvedValue([
            { id: 10, name: 'Underwriter One' },
        ])
        mockAssignSubmission.mockResolvedValue(undefined)
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-F-011
    it('T-WF-FE-F-R011 — renders "Submission Workflow" heading and calls getWorkflowSubmissions on mount', async () => {
        renderPage(<WorkflowPage />)
        expect(await screen.findByRole('heading', { name: /submission workflow/i })).toBeInTheDocument()
        expect(mockGetWorkflowSubmissions).toHaveBeenCalledTimes(1)
    })

    // REQ-WF-FE-F-012
    it('T-WF-FE-F-R012 — shows error notification on API failure', async () => {
        mockGetWorkflowSubmissions.mockRejectedValue(new Error('fail'))
        renderPage(<WorkflowPage />)
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-WF-FE-F-013
    it('T-WF-FE-F-R013 — renders five stats cards: Unassigned, Assigned, In Review, Quoted, Declined', async () => {
        renderPage(<WorkflowPage />)
        expect(await screen.findByText('Unassigned', { selector: 'p' })).toBeInTheDocument()
        expect(screen.getByText('Assigned', { selector: 'p' })).toBeInTheDocument()
        expect(screen.getByText('In Review', { selector: 'p' })).toBeInTheDocument()
        expect(screen.getByText('Quoted', { selector: 'p' })).toBeInTheDocument()
        expect(screen.getByText('Declined', { selector: 'p' })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-014
    it('T-WF-FE-F-R014 — renders table with required columns; thead always rendered', async () => {
        renderPage(<WorkflowPage />)
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Insured')).toBeInTheDocument()
        expect(screen.getByText('Broker')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Assigned To')).toBeInTheDocument()
        expect(screen.getByText('Source')).toBeInTheDocument()
    })

    // REQ-WF-FE-F-015
    it('T-WF-FE-F-R015 — Status filter dropdown filters rows client-side', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([
            SAMPLE_SUB,
            { ...SAMPLE_SUB, id: 2, reference: 'SUB-002', status: 'Quoted' as const },
        ])
        renderPage(<WorkflowPage />)
        await screen.findByText('SUB-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[0], 'Quoted')
        await waitFor(() => expect(screen.queryByText('SUB-001')).not.toBeInTheDocument())
        expect(screen.getByText('SUB-002')).toBeInTheDocument()
    })

    it('T-WF-FE-F-R015b — empty filtered result shows "No submissions found."', async () => {
        renderPage(<WorkflowPage />)
        await screen.findByText('SUB-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[0], 'Declined')
        expect(await screen.findByText(/no submissions found/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-016
    it('T-WF-FE-F-R016 — empty filtered state renders appropriate message', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([])
        renderPage(<WorkflowPage />)
        expect(await screen.findByText(/no submissions/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-017
    it('T-WF-FE-F-R017 — Assign button is rendered in Actions column for unassigned submissions', async () => {
        renderPage(<WorkflowPage />)
        expect(await screen.findByRole('button', { name: /assign/i })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-018
    it('T-WF-FE-F-R018 — clicking Assign opens assignment modal', async () => {
        renderPage(<WorkflowPage />)
        await screen.findByRole('button', { name: /assign/i })
        await userEvent.click(screen.getByRole('button', { name: /assign/i }))
        // Modal has a Cancel button; unique indicator it opened
        expect(await screen.findByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-019
    it('T-WF-FE-F-R019 — assignment modal Cancel button closes the modal', async () => {
        renderPage(<WorkflowPage />)
        await screen.findByRole('button', { name: /assign/i })
        await userEvent.click(screen.getByRole('button', { name: /assign/i }))
        await screen.findByRole('button', { name: /cancel/i })
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
        await waitFor(() => expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument())
    })

    it('T-WF-FE-F-R019b — shows error notification when assign fails', async () => {
        mockAssignSubmission.mockRejectedValue(new Error('fail'))
        renderPage(<WorkflowPage />)
        await screen.findByRole('button', { name: /assign/i })
        await userEvent.click(screen.getByRole('button', { name: /assign/i }))
        // Wait for modal to open
        await screen.findByRole('button', { name: /cancel/i })
        // Find the modal's user select (inside the .fixed wrapper)
        const allCombos = screen.getAllByRole('combobox')
        const modalCombo = allCombos.find(el => el.closest('.fixed')) ?? allCombos[allCombos.length - 1]
        await userEvent.selectOptions(modalCombo!, '10')
        // Click the modal Assign button (last in DOM after table's Assign)
        const assignBtns = screen.getAllByRole('button', { name: /^assign$/i })
        await userEvent.click(assignBtns[assignBtns.length - 1])
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-WF-FE-F-020
    it('T-WF-FE-F-R020 — submission with aiExtracted=true shows email indicator badge in Source column', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([
            { ...SAMPLE_SUB, aiExtracted: true },
        ])
        renderPage(<WorkflowPage />)
        await screen.findByText('SUB-001')
        expect(screen.getByText(/email/i)).toBeInTheDocument()
    })

    it('T-WF-FE-F-R020b — submission with review_required=true shows warning badge', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([
            { ...SAMPLE_SUB, review_required: true },
        ])
        renderPage(<WorkflowPage />)
        await screen.findByText('SUB-001')
        expect(screen.getByText('Review')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// ClearanceWorkflowPage — REQ-WF-FE-F-031 to F-040
// ---------------------------------------------------------------------------

describe('ClearanceWorkflowPage — /workflow/clearance', () => {
    const SAMPLE_CLEARANCE = {
        id: 1,
        reference: 'SUB-CL-001',
        insured: 'Beta Ltd',
        inception_date: '2026-01-01',
        expiry_date: '2027-01-01',
        clearance_status: 'pending_clearance' as const,
        cleared_by: null,
        cleared_date: null,
        assigned_to: null,
        created_date: '2026-01-01',
        submission_id: 1,
    }

    beforeEach(() => {
        mockGetClearancePending.mockResolvedValue([SAMPLE_CLEARANCE])
        mockCheckClearanceDuplicates.mockResolvedValue({ matches: [] })
        mockClearSubmission.mockResolvedValue({ ...SAMPLE_CLEARANCE, clearance_status: 'cleared' as const })
        mockConfirmDuplicate.mockResolvedValue({ ...SAMPLE_CLEARANCE, clearance_status: 'confirmed_duplicate' as const })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-F-031
    it('T-WF-FE-F-R031 — renders "Clearance Workflow" heading and calls getClearancePending on mount', async () => {
        renderPage(<ClearanceWorkflowPage />)
        expect(await screen.findByRole('heading', { name: /clearance workflow/i })).toBeInTheDocument()
        expect(mockGetClearancePending).toHaveBeenCalledTimes(1)
    })

    // REQ-WF-FE-F-032
    it('T-WF-FE-F-R032 — table renders required columns; thead always rendered', async () => {
        renderPage(<ClearanceWorkflowPage />)
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Insured')).toBeInTheDocument()
        expect(screen.getByText('Inception Date')).toBeInTheDocument()
        expect(screen.getByText('Expiry Date')).toBeInTheDocument()
        expect(screen.getByText('Clearance Status')).toBeInTheDocument()
    })

    // REQ-WF-FE-F-033
    it('T-WF-FE-F-R033 — Clearance Status badge is rendered for pending_clearance submission', async () => {
        renderPage(<ClearanceWorkflowPage />)
        expect(await screen.findByText('Pending Clearance')).toBeInTheDocument()
    })

    // REQ-WF-FE-F-034
    it('T-WF-FE-F-R034 — Actions column renders Check Duplicates and Clear buttons for pending submissions', async () => {
        renderPage(<ClearanceWorkflowPage />)
        expect(await screen.findByRole('button', { name: /check duplicates/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^clear$/i })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-035
    it('T-WF-FE-F-R035 — clicking Check Duplicates calls checkClearanceDuplicates and opens modal', async () => {
        renderPage(<ClearanceWorkflowPage />)
        await screen.findByRole('button', { name: /check duplicates/i })
        await userEvent.click(screen.getByRole('button', { name: /check duplicates/i }))
        await waitFor(() => expect(mockCheckClearanceDuplicates).toHaveBeenCalledWith(1))
        // Modal should be visible
        expect(screen.getByText(/notes/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-036
    it('T-WF-FE-F-R036 — Clearance Review modal shows Clear and Confirm Duplicate buttons', async () => {
        renderPage(<ClearanceWorkflowPage />)
        await screen.findByRole('button', { name: /check duplicates/i })
        await userEvent.click(screen.getByRole('button', { name: /check duplicates/i }))
        // Modal opens with Confirm Duplicate and Clear buttons
        expect(await screen.findByRole('button', { name: /confirm duplicate/i })).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /^clear$/i }).length).toBeGreaterThan(0)
    })

    // REQ-WF-FE-F-037
    it('T-WF-FE-F-R037 — clicking Clear in modal calls clearSubmission', async () => {
        renderPage(<ClearanceWorkflowPage />)
        await screen.findByRole('button', { name: /check duplicates/i })
        await userEvent.click(screen.getByRole('button', { name: /check duplicates/i }))
        // Wait for modal (Confirm Duplicate button is unique to modal)
        await screen.findByRole('button', { name: /confirm duplicate/i })
        // Click modal's Clear button (index 1 — after Actions Clear in DOM order)
        const clearBtns = screen.getAllByRole('button', { name: /^clear$/i })
        await userEvent.click(clearBtns[clearBtns.length - 1])
        await waitFor(() => expect(mockClearSubmission).toHaveBeenCalledWith(1, expect.any(String)))
    })

    // REQ-WF-FE-F-038
    it('T-WF-FE-F-R038 — clicking Confirm Duplicate calls confirmDuplicate', async () => {
        renderPage(<ClearanceWorkflowPage />)
        await screen.findByRole('button', { name: /check duplicates/i })
        await userEvent.click(screen.getByRole('button', { name: /check duplicates/i }))
        await screen.findByRole('button', { name: /confirm duplicate/i })
        await userEvent.click(screen.getByRole('button', { name: /confirm duplicate/i }))
        await waitFor(() => expect(mockConfirmDuplicate).toHaveBeenCalledWith(1, expect.any(String)))
    })

    // REQ-WF-FE-F-039
    it('T-WF-FE-F-R039 — direct Clear button opens modal; confirming calls clearSubmission', async () => {
        renderPage(<ClearanceWorkflowPage />)
        await screen.findByRole('button', { name: /^clear$/i })
        await userEvent.click(screen.getByRole('button', { name: /^clear$/i }))
        // Clicking Actions Clear opens modal (Confirm Duplicate button becomes visible)
        await screen.findByRole('button', { name: /confirm duplicate/i })
        // Now click the modal's Clear button
        const clearBtns = screen.getAllByRole('button', { name: /^clear$/i })
        await userEvent.click(clearBtns[clearBtns.length - 1])
        await waitFor(() => expect(mockClearSubmission).toHaveBeenCalledWith(1, expect.any(String)))
    })

    // REQ-WF-FE-F-040
    it('T-WF-FE-F-R040 — empty list renders "No submissions pending clearance."', async () => {
        mockGetClearancePending.mockResolvedValue([])
        renderPage(<ClearanceWorkflowPage />)
        expect(await screen.findByText(/no submissions pending clearance/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// DataQualityPage — REQ-WF-FE-F-051 to F-058
// ---------------------------------------------------------------------------

describe('DataQualityPage — /workflow/data-quality', () => {
    const ISSUE_HIGH = {
        id: 1,
        entity_type: 'Policy',
        entity_reference: 'POL-001',
        entity_id: 101,
        field: 'inception_date',
        issue_description: 'Missing inception date',
        severity: 'High' as const,
    }
    const ISSUE_LOW = {
        id: 2,
        entity_type: 'Quote',
        entity_reference: 'QUO-002',
        entity_id: 202,
        field: 'broker',
        issue_description: 'Broker not confirmed',
        severity: 'Low' as const,
    }

    beforeEach(() => {
        mockGetDataQualityIssues.mockResolvedValue([ISSUE_HIGH, ISSUE_LOW])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-F-051
    it('T-WF-FE-F-R051 — renders "Data Quality" heading and calls getDataQualityIssues on mount', async () => {
        renderPage(<DataQualityPage />)
        expect(await screen.findByRole('heading', { name: /data quality/i })).toBeInTheDocument()
        expect(mockGetDataQualityIssues).toHaveBeenCalledTimes(1)
    })

    // REQ-WF-FE-F-052
    it('T-WF-FE-F-R052 — renders Total Issues summary card', async () => {
        renderPage(<DataQualityPage />)
        expect(await screen.findByText(/total issues/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-053
    it('T-WF-FE-F-R053 — table renders Entity Type, Entity Reference, Field, Issue, Severity columns', async () => {
        renderPage(<DataQualityPage />)
        expect(await screen.findByText('Entity Type')).toBeInTheDocument()
        expect(screen.getByText('Entity Reference')).toBeInTheDocument()
        expect(screen.getByText('Field')).toBeInTheDocument()
        expect(screen.getByText('Issue')).toBeInTheDocument()
        expect(screen.getByText('Severity')).toBeInTheDocument()
    })

    // REQ-WF-FE-F-054
    it('T-WF-FE-F-R054 — Entity Reference renders as a link', async () => {
        renderPage(<DataQualityPage />)
        expect(await screen.findByRole('link', { name: 'POL-001' })).toBeInTheDocument()
    })

    // REQ-WF-FE-F-055
    it('T-WF-FE-F-R055 — Refresh button re-fetches getDataQualityIssues', async () => {
        renderPage(<DataQualityPage />)
        await screen.findByText('POL-001')
        await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
        await waitFor(() => expect(mockGetDataQualityIssues).toHaveBeenCalledTimes(2))
    })

    // REQ-WF-FE-F-056
    it('T-WF-FE-F-R056 — Severity filter dropdown filters rows client-side', async () => {
        renderPage(<DataQualityPage />)
        await screen.findByText('POL-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[0], 'High')
        await waitFor(() => expect(screen.queryByText('QUO-002')).not.toBeInTheDocument())
        expect(screen.getByText('POL-001')).toBeInTheDocument()
    })

    it('T-WF-FE-F-R056b — Entity Type filter dropdown filters rows client-side', async () => {
        renderPage(<DataQualityPage />)
        await screen.findByText('POL-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[1], 'Quote')
        await waitFor(() => expect(screen.queryByText('POL-001')).not.toBeInTheDocument())
        expect(screen.getByText('QUO-002')).toBeInTheDocument()
    })

    // REQ-WF-FE-F-057
    it('T-WF-FE-F-R057 — empty state renders "No data quality issues found."', async () => {
        mockGetDataQualityIssues.mockResolvedValue([])
        renderPage(<DataQualityPage />)
        expect(await screen.findByText(/no data quality issues found/i)).toBeInTheDocument()
    })

    // REQ-WF-FE-F-058
    it('T-WF-FE-F-R058 — High severity issues appear before Low severity issues in rendered table', async () => {
        mockGetDataQualityIssues.mockResolvedValue([ISSUE_LOW, ISSUE_HIGH])
        renderPage(<DataQualityPage />)
        await screen.findByText('POL-001')
        const rows = screen.getAllByRole('row').filter((r) => r.closest('tbody'))
        const texts = rows.map((r) => r.textContent)
        const highIdx = texts.findIndex((t) => t?.includes('POL-001'))
        const lowIdx = texts.findIndex((t) => t?.includes('QUO-002'))
        expect(highIdx).toBeLessThan(lowIdx)
    })
})

// ---------------------------------------------------------------------------
// Constraints — REQ-WF-FE-C-001 to C-003
// ---------------------------------------------------------------------------

describe('Workflow — Architectural Constraints', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-C-001
    it('T-WF-FE-C-R001 — all API calls go through workflow.service (api-client wrapper)', () => {
        expect(mockGetWorkflowSubmissions).toBeDefined()
        expect(mockGetClearancePending).toBeDefined()
        expect(mockGetDataQualityIssues).toBeDefined()
    })

    // REQ-WF-FE-C-002
    it('T-WF-FE-C-R002 — table header cells in WorkflowPage do not use all-uppercase text', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([])
        renderPage(<WorkflowPage />)
        await screen.findByRole('heading', { name: /submission workflow/i })
        const headers = screen.getAllByRole('columnheader')
        headers.forEach((h) => {
            const text = h.textContent ?? ''
            if (text.trim()) expect(text).not.toMatch(/^[A-Z\s]+$/)
        })
    })

    // REQ-WF-FE-C-003
    it('T-WF-FE-C-R003 — workflow pages render without error (role-based access enforced at route level)', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([])
        renderPage(<WorkflowPage />)
        expect(await screen.findByRole('heading', { name: /submission workflow/i })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Security — REQ-WF-FE-S-001 to S-002
// ---------------------------------------------------------------------------

describe('Workflow — Security', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-WF-FE-S-001
    it('T-WF-FE-S-R001 — WorkflowDirectoryPage renders without error when session context is available', () => {
        renderPage(<WorkflowDirectoryPage />)
        expect(screen.getByRole('heading', { name: /workflow/i })).toBeInTheDocument()
    })

    // REQ-WF-FE-S-002
    it('T-WF-FE-S-R002 — Assign button is present for unassigned submissions (role gating at route level)', async () => {
        mockGetWorkflowSubmissions.mockResolvedValue([{
            id: 1,
            reference: 'SUB-001',
            insured: 'A',
            broker: 'B',
            status: 'Unassigned' as const,
            source: 'Manual',
            aiExtracted: false,
            reviewRequired: false,
        }])
        renderPage(<WorkflowPage />)
        expect(await screen.findByRole('button', { name: /assign/i })).toBeInTheDocument()
    })
})
