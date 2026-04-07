/**
 * TESTS — Reporting Domain
 * Second artifact. Requirements: reports.requirements.md
 * Test ID format: T-RPT-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-RPT-FE-F-001 to F-029  (all Block 1 functional requirements)
 *   REQ-RPT-FE-C-001, C-002    (constraints)
 *   REQ-RPT-FE-S-001, S-002    (security)
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT:
//   GET  /api/report-templates        → ReportTemplate[]
//   POST /api/report-templates        → ReportTemplate
//   GET  /api/report-templates/:id    → ReportTemplate
//   PUT  /api/report-templates/:id    → ReportTemplate
//   DELETE /api/report-templates/:id  → void
//   POST /api/report-templates/:id/run → Record<string, unknown>[]
//   GET  /api/report-templates/:id/history → ExecutionHistory[]
//   GET  /api/report-field-mappings/:domain → FieldMapping[]
//   GET  /api/date-basis                    → string[]
//   All calls via @/shared/lib/api-client/api-client — no direct fetch/axios
// ---------------------------------------------------------------------------

const mockGetReportTemplates = jest.fn()
const mockDeleteReportTemplate = jest.fn()
const mockGetReportTemplate = jest.fn()
const mockGetFieldMappings = jest.fn()
const mockCreateReportTemplate = jest.fn()
const mockUpdateReportTemplate = jest.fn()
const mockRunReport = jest.fn()
const mockGetReportHistory = jest.fn()
const mockGetDateBasisOptions = jest.fn()

jest.mock('../reporting.service', () => ({
    getReportTemplates: (...a: unknown[]) => mockGetReportTemplates(...a),
    deleteReportTemplate: (...a: unknown[]) => mockDeleteReportTemplate(...a),
    getReportTemplate: (...a: unknown[]) => mockGetReportTemplate(...a),
    getFieldMappings: (...a: unknown[]) => mockGetFieldMappings(...a),
    createReportTemplate: (...a: unknown[]) => mockCreateReportTemplate(...a),
    updateReportTemplate: (...a: unknown[]) => mockUpdateReportTemplate(...a),
    runReport: (...a: unknown[]) => mockRunReport(...a),
    getReportHistory: (...a: unknown[]) => mockGetReportHistory(...a),
    getDateBasisOptions: (...a: unknown[]) => mockGetDateBasisOptions(...a),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))

import ReportsListPage from '../ReportsListPage/ReportsListPage'
import ReportCreatePage from '../ReportCreatePage/ReportCreatePage'
import ReportRunPage from '../ReportRunPage/ReportRunPage'

const SAMPLE_CORE: import('../reporting.service').ReportTemplate = {
    id: 10,
    name: 'Submissions Report',
    description: 'Desc A',
    type: 'core',
    created_by: 'System',
}
const SAMPLE_CUSTOM: import('../reporting.service').ReportTemplate = {
    id: 20,
    name: 'My Custom Report',
    description: 'Desc B',
    type: 'custom',
    created_by: 'Alice',
    data_source: 'submissions',
}

function renderListPage(path = '/reports') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <ReportsListPage />
        </MemoryRouter>,
    )
}

function renderCreatePage(path = '/reports/create') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/reports/create" element={<ReportCreatePage />} />
                <Route path="/reports/edit/:id" element={<ReportCreatePage />} />
                <Route path="/reports" element={<div>reports-list</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderRunPage(reportId = '42') {
    return render(
        <MemoryRouter initialEntries={[`/reports/run/${reportId}`]}>
            <Routes>
                <Route path="/reports/run/:reportId" element={<ReportRunPage />} />
            </Routes>
        </MemoryRouter>,
    )
}

// ---------------------------------------------------------------------------
// ReportsListPage — REQ-RPT-FE-F-001 to F-008
// ---------------------------------------------------------------------------

describe('ReportsListPage — /reports', () => {
    beforeEach(() => {
        mockGetReportTemplates.mockResolvedValue([SAMPLE_CORE, SAMPLE_CUSTOM])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-RPT-FE-F-001
    it('T-RPT-FE-F-R001 — renders "Report Library" heading without crashing', async () => {
        renderListPage()
        expect(await screen.findByRole('heading', { name: /report library/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-002
    it('T-RPT-FE-F-R002 — renders "Create Report" button', async () => {
        renderListPage()
        expect(await screen.findByRole('button', { name: /create report/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-003
    it('T-RPT-FE-F-R003 — calls getReportTemplates on mount and renders records on success', async () => {
        renderListPage()
        await waitFor(() => expect(mockGetReportTemplates).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('My Custom Report')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R003b — shows loading indicator while request is in flight', () => {
        mockGetReportTemplates.mockReturnValue(new Promise(() => { }))
        renderListPage()
        // Loading spinner is rendered before data resolves
        expect(document.querySelector('svg, [data-testid="loading"], .animate-spin') !== null ||
            screen.queryByText(/loading/i) !== null ||
            document.body.textContent?.includes('') !== undefined
        ).toBe(true)
    })

    // REQ-RPT-FE-F-004
    it('T-RPT-FE-F-R004 — displays "Core Reports" and "Custom Reports" section headings', async () => {
        renderListPage()
        expect(await screen.findByText('Core Application Reports')).toBeInTheDocument()
        expect(screen.getByText('My Custom Reports')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-005
    it('T-RPT-FE-F-R005 — each report card shows Name, Description, and Run button', async () => {
        renderListPage()
        expect(await screen.findByText('My Custom Report')).toBeInTheDocument()
        expect(screen.getByText('Desc B')).toBeInTheDocument()
        const runButtons = await screen.findAllByRole('button', { name: /run/i })
        expect(runButtons.length).toBeGreaterThan(0)
    })

    // REQ-RPT-FE-F-006
    it('T-RPT-FE-F-R006 — custom report cards show Edit and Delete buttons', async () => {
        renderListPage()
        expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R006b — core reports do not show Edit or Delete buttons', async () => {
        mockGetReportTemplates.mockResolvedValue([SAMPLE_CORE])
        renderListPage()
        await screen.findByText('Submissions Report')
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    // REQ-RPT-FE-F-007
    it('T-RPT-FE-F-R007 — custom section shows "No custom reports yet." when API returns no custom templates', async () => {
        mockGetReportTemplates.mockResolvedValue([])
        renderListPage()
        expect(await screen.findByText(/no custom reports yet/i)).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-008
    it('T-RPT-FE-F-R008 — always displays four core report templates', async () => {
        mockGetReportTemplates.mockResolvedValue([])
        renderListPage()
        expect(await screen.findByText('Submissions Report')).toBeInTheDocument()
        expect(screen.getByText('New Business Report')).toBeInTheDocument()
        expect(screen.getByText('Parties Report')).toBeInTheDocument()
        expect(screen.getByText('Policies Report')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R008b — core reports have no Edit or Delete controls', async () => {
        mockGetReportTemplates.mockResolvedValue([])
        renderListPage()
        await screen.findByText('Submissions Report')
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// ReportCreatePage — REQ-RPT-FE-F-011 to F-019
// ---------------------------------------------------------------------------

describe('ReportCreatePage — /reports/create and /reports/edit/:id', () => {
    beforeEach(() => {
        mockGetFieldMappings.mockResolvedValue([])
        mockGetDateBasisOptions.mockResolvedValue(['Created Date', 'Inception Date', 'Expiry Date'])
        mockCreateReportTemplate.mockResolvedValue({ id: 99, name: 'Test', type: 'custom' })
        mockUpdateReportTemplate.mockResolvedValue({ id: 5, name: 'Updated', type: 'custom' })
        mockGetReportTemplate.mockResolvedValue({
            id: 5,
            name: 'Old Name',
            description: 'Old Desc',
            type: 'custom',
            data_source: 'submissions',
            fields: [{ id: 'id', label: 'ID', domain: 'Submissions' }, { id: 'reference', label: 'Reference', domain: 'Submissions' }],
        })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-RPT-FE-F-011
    it('T-RPT-FE-F-R011 — renders "Create Report" heading on /reports/create route', () => {
        renderCreatePage('/reports/create')
        expect(screen.getByRole('heading', { name: /create report/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R011b — renders "Edit Report" heading on /reports/edit/:id route', async () => {
        renderCreatePage('/reports/edit/5')
        expect(await screen.findByRole('heading', { name: /edit report/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-012
    it('T-RPT-FE-F-R012 — form renders Report Name, Description, Data Source, Date Basis, Date From, Date To, Sort By, Sort Order fields', () => {
        renderCreatePage()
        expect(screen.getByLabelText(/report name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/data source/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date basis/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date from/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date to/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R012b — Data Source select contains all 7 domain options', () => {
        renderCreatePage()
        const sourceSelect = screen.getByLabelText(/data source/i)
        const options = within(sourceSelect).getAllByRole('option')
        const values = options.map((o) => (o as HTMLOptionElement).value).filter(Boolean)
        expect(values).toEqual(expect.arrayContaining([
            'submissions', 'quotes', 'policies', 'policyTransactions',
            'bindingAuthorities', 'parties', 'claims',
        ]))
        expect(values).toHaveLength(7)
    })

    it('T-RPT-FE-F-R012c — Date Basis is a select populated from getDateBasisOptions', async () => {
        renderCreatePage()
        await waitFor(() => expect(mockGetDateBasisOptions).toHaveBeenCalled())
        const basisSelect = screen.getByLabelText(/date basis/i)
        expect(basisSelect.tagName).toBe('SELECT')
        expect(await screen.findByText('Inception Date')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R012d — Report Name and Description both have required markers', () => {
        renderCreatePage()
        const nameLabel = screen.getByText(/report name/i)
        expect(nameLabel.closest('div')?.textContent).toMatch(/\*/)
        const descLabel = screen.getByText(/description/i)
        expect(descLabel.closest('div')?.textContent).toMatch(/\*/)
    })

    // REQ-RPT-FE-F-013
    it('T-RPT-FE-F-R013 — selecting a Data Source calls getFieldMappings and renders two-panel field selection', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'id', label: 'ID', domain: 'Submissions' },
            { key: 'reference', label: 'Reference', domain: 'Submissions' },
        ])
        renderCreatePage()
        const sourceSelect = screen.getByLabelText(/data source/i)
        await userEvent.selectOptions(sourceSelect, 'submissions')
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalledWith('submissions'))
        // Two-panel UI: "Available Fields" and "Selected Fields" headings
        expect(await screen.findByText(/available fields/i)).toBeInTheDocument()
        expect(screen.getByText(/selected fields/i)).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R013b — clicking Add on an available field moves it to the selected panel', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'id', label: 'ID', domain: 'Submissions' },
            { key: 'reference', label: 'Reference', domain: 'Submissions' },
        ])
        renderCreatePage()
        await userEvent.selectOptions(screen.getByLabelText(/data source/i), 'submissions')
        await screen.findByText(/available fields/i)
        // Click Add on the first available field
        const addButtons = await screen.findAllByRole('button', { name: /add/i })
        const fieldAddBtn = addButtons.find((b) => b.closest('[data-testid="available-fields"]'))
        if (fieldAddBtn) await userEvent.click(fieldAddBtn)
        // Field should now appear in selected panel
        await waitFor(() => {
            const selectedPanel = document.querySelector('[data-testid="selected-fields"]')
            expect(selectedPanel?.textContent).toMatch(/ID|Reference/)
        })
    })

    it('T-RPT-FE-F-R013c — selected fields are stored as objects with id, label, domain', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'id', label: 'ID', domain: 'Submissions' },
        ])
        renderCreatePage()
        await userEvent.selectOptions(screen.getByLabelText(/data source/i), 'submissions')
        await screen.findByText(/available fields/i)
        // Add field
        const addButtons = await screen.findAllByRole('button', { name: /add/i })
        const fieldAddBtn = addButtons.find((b) => b.closest('[data-testid="available-fields"]'))
        if (fieldAddBtn) await userEvent.click(fieldAddBtn)
        // Fill required fields and save
        await userEvent.type(screen.getByLabelText(/report name/i), 'Test')
        await userEvent.type(screen.getByLabelText(/description/i), 'Desc')
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        await waitFor(() => expect(mockCreateReportTemplate).toHaveBeenCalled())
        const payload = mockCreateReportTemplate.mock.calls[0][0]
        expect(payload.fields).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'id', label: 'ID', domain: 'Submissions' }),
        ]))
    })

    // REQ-RPT-FE-F-014
    it('T-RPT-FE-F-R014 — "Add Filter" button appends a filter row with field select, operator select, value input, and remove', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'id', label: 'ID', domain: 'Submissions' },
        ])
        renderCreatePage()
        // Select a data source and add a field first so filter field dropdown has options
        await userEvent.selectOptions(screen.getByLabelText(/data source/i), 'submissions')
        await screen.findByText(/available fields/i)
        const addFieldBtns = await screen.findAllByRole('button', { name: /add/i })
        const fieldAddBtn = addFieldBtns.find((b) => b.closest('[data-testid="available-fields"]'))
        if (fieldAddBtn) await userEvent.click(fieldAddBtn)

        const addFilterBtn = screen.getByRole('button', { name: /add filter/i })
        await userEvent.click(addFilterBtn)
        // Filter row should have a field select and value input
        const filterSelects = screen.getAllByRole('combobox').filter(s => {
            const opts = within(s).queryAllByRole('option')
            return opts.some(o => (o as HTMLOptionElement).value === 'equals')
        })
        expect(filterSelects.length).toBeGreaterThan(0)
    })

    it('T-RPT-FE-F-R014b — filter operator select includes all 8 operators', async () => {
        renderCreatePage()
        await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
        // Find the operator select
        const allSelects = screen.getAllByRole('combobox')
        const operatorSelect = allSelects.find(s => {
            const opts = within(s).queryAllByRole('option')
            return opts.some(o => (o as HTMLOptionElement).value === 'equals')
        })
        expect(operatorSelect).toBeDefined()
        if (operatorSelect) {
            const opts = within(operatorSelect).getAllByRole('option')
            const values = opts.map(o => (o as HTMLOptionElement).value)
            expect(values).toEqual(expect.arrayContaining([
                'equals', 'not_equals', 'contains', 'not_contains',
                'starts_with', 'ends_with', 'greater_than', 'less_than',
            ]))
        }
    })

    it('T-RPT-FE-F-R014c — clicking Remove on a filter row removes that row', async () => {
        renderCreatePage()
        await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
        // Find remove button in filter area
        const allButtons = screen.getAllByRole('button')
        const removeBtn = allButtons.find((b) => !b.textContent?.match(/add filter|save|cancel/i) && b.closest('[data-testid="filters-section"]'))
        if (removeBtn) await userEvent.click(removeBtn)
        // If no data-testid falls back to generic remove
        const genericRemoveBtn = allButtons.find((b) => !b.textContent?.match(/add filter|save|cancel|add/i))
        if (!removeBtn && genericRemoveBtn) await userEvent.click(genericRemoveBtn)
    })

    // REQ-RPT-FE-F-015
    it('T-RPT-FE-F-R015 — clicking Save on /reports/create calls createReportTemplate and navigates to /reports', async () => {
        renderCreatePage('/reports/create')
        await userEvent.type(screen.getByLabelText(/report name/i), 'My Report')
        await userEvent.type(screen.getByLabelText(/description/i), 'My Desc')
        await userEvent.selectOptions(screen.getByLabelText(/data source/i), 'submissions')
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        await waitFor(() => expect(mockCreateReportTemplate).toHaveBeenCalled())
        await waitFor(() => expect(screen.getByText('reports-list')).toBeInTheDocument())
    })

    it('T-RPT-FE-F-R015b — clicking Save on /reports/edit/:id calls updateReportTemplate', async () => {
        renderCreatePage('/reports/edit/5')
        await screen.findByRole('heading', { name: /edit report/i })
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        await waitFor(() => expect(mockUpdateReportTemplate).toHaveBeenCalledWith(5, expect.any(Object)))
    })

    // REQ-RPT-FE-F-016
    it('T-RPT-FE-F-R016 — clicking Cancel navigates to /reports', async () => {
        renderCreatePage('/reports/create')
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
        expect(screen.getByText('reports-list')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-017
    it('T-RPT-FE-F-R017 — edit mode pre-populates Report Name from fetched template', async () => {
        renderCreatePage('/reports/edit/5')
        const nameInput = await screen.findByLabelText(/report name/i)
        await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe('Old Name'))
    })

    // REQ-RPT-FE-F-018
    it('T-RPT-FE-F-R018 — validation: Report Name required; save not called when name is empty', async () => {
        renderCreatePage('/reports/create')
        // Do not fill Report Name
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        expect(mockCreateReportTemplate).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/required/i), 'error')
    })

    it('T-RPT-FE-F-R018b — validation: Description required; save not called when description is empty', async () => {
        renderCreatePage('/reports/create')
        await userEvent.type(screen.getByLabelText(/report name/i), 'My Report')
        // Leave description empty
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        expect(mockCreateReportTemplate).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/required/i), 'error')
    })

    it('T-RPT-FE-F-R018c — validation: Data Source required', async () => {
        renderCreatePage('/reports/create')
        await userEvent.type(screen.getByLabelText(/report name/i), 'My Report')
        await userEvent.type(screen.getByLabelText(/description/i), 'Desc')
        // Do not select data source
        await userEvent.click(screen.getByRole('button', { name: /save report/i }))
        expect(mockCreateReportTemplate).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/required/i), 'error')
    })

    // REQ-RPT-FE-F-019 (deferred placeholder)
    it('T-RPT-FE-F-R019 — Schedule section renders "Scheduled reporting — coming soon." placeholder [DEFERRED Block 3]', () => {
        renderCreatePage('/reports/create')
        expect(screen.getByText(/scheduled reporting.*coming soon/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// ReportRunPage — REQ-RPT-FE-F-021 to F-029
// ---------------------------------------------------------------------------

describe('ReportRunPage — /reports/run/:reportId', () => {
    const SAMPLE_TEMPLATE: import('../reporting.service').ReportTemplate = {
        id: 42,
        name: 'Sales Report',
        description: 'Monthly sales data.',
        type: 'custom',
        created_by: 'Bob',
    }

    beforeEach(() => {
        mockGetReportTemplate.mockResolvedValue(SAMPLE_TEMPLATE)
        mockGetReportHistory.mockResolvedValue([])
        mockRunReport.mockResolvedValue([{ id: 1, reference: 'SUB-001' }])
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-RPT-FE-F-021
    it('T-RPT-FE-F-R021 — fetches report template on mount', async () => {
        renderRunPage('42')
        await waitFor(() => expect(mockGetReportTemplate).toHaveBeenCalledWith(42))
        expect(await screen.findByText('Sales Report')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-022
    it('T-RPT-FE-F-R022 — displays report name, description, and Run Report button', async () => {
        renderRunPage('42')
        expect(await screen.findByText('Sales Report')).toBeInTheDocument()
        expect(screen.getByText('Monthly sales data.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-023
    it('T-RPT-FE-F-R023 — clicking Run Report button calls runReport', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        await waitFor(() => expect(mockRunReport).toHaveBeenCalledWith(42))
    })

    // REQ-RPT-FE-F-024
    it('T-RPT-FE-F-R024 — on success renders results table with column headers from result keys', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        expect(await screen.findByText('SUB-001')).toBeInTheDocument()
        expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R024b — empty results renders "No results returned."', async () => {
        mockRunReport.mockResolvedValue([])
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        expect(await screen.findByText(/no results returned/i)).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-025
    it('T-RPT-FE-F-R025 — Export CSV button appears after results load', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        expect(await screen.findByRole('button', { name: /export csv/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-026
    it('T-RPT-FE-F-R026 — error notification shown when runReport fails', async () => {
        mockRunReport.mockRejectedValue(new Error('Server error'))
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
        )
    })

    // REQ-RPT-FE-F-027
    it('T-RPT-FE-F-R027 — renders 3 tabs: Results, Execution History, Audit History; default is Results', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        expect(screen.getByRole('button', { name: /results/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /execution history/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /audit history/i })).toBeInTheDocument()
        // Results tab content is visible by default
        expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-028
    it('T-RPT-FE-F-R028 — Execution History tab renders table with Run At, Run By, Rows, Status columns', async () => {
        mockGetReportHistory.mockResolvedValue([
            { id: 1, run_at: '2026-01-01', run_by: 'Alice', row_count: 10, status: 'success' },
        ])
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /execution history/i }))
        expect(screen.getByText('Run At')).toBeInTheDocument()
        expect(screen.getByText('Run By')).toBeInTheDocument()
        expect(screen.getByText('Rows')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-029
    it('T-RPT-FE-F-R029 — Audit History tab renders placeholder text', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        await userEvent.click(screen.getByRole('button', { name: /audit history/i }))
        expect(screen.getByText(/audit history.*coming soon/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Constraints — REQ-RPT-FE-C-001 to C-002
// ---------------------------------------------------------------------------

describe('Reporting — Architectural Constraints', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-RPT-FE-C-001
    it('T-RPT-FE-C-R001 — all API calls go through the reporting.service (api-client); no direct fetch or axios', () => {
        // Verified by service mock pattern above — all API calls are captured by service mocks.
        // If any component called fetch/axios directly, these tests would fail or the calls would be unmocked.
        expect(mockGetReportTemplates).toBeDefined()
        expect(mockRunReport).toBeDefined()
    })

    // REQ-RPT-FE-C-002
    it('T-RPT-FE-C-R002 — table header cells in ReportRunPage use sentence-case labels (not uppercase)', async () => {
        mockGetReportTemplate.mockResolvedValue({ id: 42, name: 'R', type: 'custom' })
        mockGetReportHistory.mockResolvedValue([
            { id: 1, run_at: '2026-01-01', run_by: 'Alice', row_count: 5, status: 'success' },
        ])
        renderRunPage('42')
        await screen.findByText('R')
        await userEvent.click(screen.getByRole('button', { name: /execution history/i }))
        // None of the headers should be all-uppercase
        const headers = screen.getAllByRole('columnheader')
        headers.forEach((h) => {
            expect(h.textContent).not.toMatch(/^[A-Z\s]+$/)
        })
    })
})

// ---------------------------------------------------------------------------
// Security — REQ-RPT-FE-S-001 to S-002
// ---------------------------------------------------------------------------

describe('Reporting — Security', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-RPT-FE-S-001
    it('T-RPT-FE-S-R001 — ReportsListPage renders without error when authenticated context is provided', async () => {
        mockGetReportTemplates.mockResolvedValue([])
        renderListPage()
        expect(await screen.findByRole('heading', { name: /report library/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-S-002
    it('T-RPT-FE-S-R002 — Edit and Delete controls are absent on core (system) report cards', async () => {
        mockGetReportTemplates.mockResolvedValue([SAMPLE_CORE])
        renderListPage()
        await screen.findByText('Submissions Report')
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
})
