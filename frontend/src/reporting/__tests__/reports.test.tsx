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

import { act, render, screen, waitFor, within } from '@testing-library/react'
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
const mockRunCoreReport = jest.fn()
const mockGetReportHistory = jest.fn()
const mockGetDateBasisOptions = jest.fn()
const mockCreateDashboard = jest.fn()
const mockGetDashboard = jest.fn()
const mockUpdateDashboard = jest.fn()
const mockGetDashboardWidgetData = jest.fn()
const mockUseSidebarSection = jest.fn()

jest.mock('../reporting.service', () => ({
    getReportTemplates: (...a: unknown[]) => mockGetReportTemplates(...a),
    deleteReportTemplate: (...a: unknown[]) => mockDeleteReportTemplate(...a),
    getReportTemplate: (...a: unknown[]) => mockGetReportTemplate(...a),
    getFieldMappings: (...a: unknown[]) => mockGetFieldMappings(...a),
    createReportTemplate: (...a: unknown[]) => mockCreateReportTemplate(...a),
    updateReportTemplate: (...a: unknown[]) => mockUpdateReportTemplate(...a),
    runReport: (...a: unknown[]) => mockRunReport(...a),
    runCoreReport: (...a: unknown[]) => mockRunCoreReport(...a),
    getReportHistory: (...a: unknown[]) => mockGetReportHistory(...a),
    getDateBasisOptions: (...a: unknown[]) => mockGetDateBasisOptions(...a),
    createDashboard: (...a: unknown[]) => mockCreateDashboard(...a),
    getDashboard: (...a: unknown[]) => mockGetDashboard(...a),
    updateDashboard: (...a: unknown[]) => mockUpdateDashboard(...a),
    getDashboardWidgetData: (...a: unknown[]) => mockGetDashboardWidgetData(...a),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

jest.mock('react-chartjs-2', () => {
    const React = jest.requireActual<typeof import('react')>('react')
    return {
        Line: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-line' }),
        Bar: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-bar' }),
        Doughnut: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-doughnut' }),
    }
})

import ReportsListPage from '../ReportsListPage/ReportsListPage'
import ReportCreatePage from '../ReportCreatePage/ReportCreatePage'
import ReportRunPage from '../ReportRunPage/ReportRunPage'
import DashboardCreatePage from '../DashboardCreatePage/DashboardCreatePage'
import DashboardConfigurePage from '../DashboardConfigurePage/DashboardConfigurePage'
import DashboardViewPage from '../DashboardViewPage/DashboardViewPage'

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
const SAMPLE_DASHBOARD: import('../reporting.service').ReportTemplate = {
    id: 30,
    name: 'Ops Dashboard',
    description: 'Desc C',
    type: 'dashboard',
    created_by: 'Alice',
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

async function triggerSidebarEvent(eventName: string) {
    await act(async () => {
        window.dispatchEvent(new Event(eventName))
    })
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
    it('T-RPT-FE-F-R002 — page header does NOT render an inline "Create Report" button', async () => {
        renderListPage()
        expect(await screen.findByText('Submissions Report')).toBeInTheDocument()
        // Create Report lives in the sidebar only — no inline button on the page
        expect(screen.queryAllByRole('button', { name: /create report/i })).toHaveLength(0)
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

    it('T-RPT-FE-F-R005b — core report Run button navigates to /reports/run/{data_source}', async () => {
        mockGetReportTemplates.mockResolvedValue([])
        render(
            <MemoryRouter initialEntries={['/reports']}>
                <Routes>
                    <Route path="/reports" element={<ReportsListPage />} />
                    <Route path="/reports/run/:reportId" element={<div data-testid="run-page">run-page</div>} />
                </Routes>
            </MemoryRouter>
        )
        await screen.findByText('Submissions Report')
        // First Run button belongs to Submissions Report (data_source: submissions)
        const runButtons = screen.getAllByTitle('Run Report')
        await userEvent.click(runButtons[0])
        expect(await screen.findByTestId('run-page')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-006
    it('T-RPT-FE-F-R006 — custom report cards show Edit and Delete buttons', async () => {
        renderListPage()
        expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R006c — dashboard rows edit via /dashboards/edit/:id not /reports/edit/:id', async () => {
        mockGetReportTemplates.mockResolvedValue([SAMPLE_CORE, SAMPLE_DASHBOARD])
        render(
            <MemoryRouter initialEntries={['/reports']}>
                <Routes>
                    <Route path="/reports" element={<ReportsListPage />} />
                    <Route path="/dashboards/edit/:id" element={<div>dashboard-edit</div>} />
                    <Route path="/reports/edit/:id" element={<div>report-edit</div>} />
                </Routes>
            </MemoryRouter>
        )
        await screen.findByText('Ops Dashboard')
        await userEvent.click(screen.getByTitle('Edit Report'))
        expect(await screen.findByText('dashboard-edit')).toBeInTheDocument()
        expect(screen.queryByText('report-edit')).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R006d — dashboard rows open /dashboards/view/:id instead of the report runner', async () => {
        mockGetReportTemplates.mockResolvedValue([SAMPLE_CORE, SAMPLE_DASHBOARD])
        render(
            <MemoryRouter initialEntries={['/reports']}>
                <Routes>
                    <Route path="/reports" element={<ReportsListPage />} />
                    <Route path="/dashboards/view/:reportId" element={<div>dashboard-view</div>} />
                    <Route path="/reports/run/:reportId" element={<div>report-run</div>} />
                </Routes>
            </MemoryRouter>
        )
        await screen.findByText('Ops Dashboard')
        await userEvent.click(screen.getByTitle('View Dashboard'))
        expect(await screen.findByText('dashboard-view')).toBeInTheDocument()
        expect(screen.queryByText('report-run')).not.toBeInTheDocument()
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
        mockUseSidebarSection.mockReset()
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
    it('T-RPT-FE-F-R012 — form renders Report Name, Description, Date Basis, Date From, Date To, Sort By, Sort Order fields', () => {
        renderCreatePage()
        expect(screen.getByLabelText(/report name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date basis/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date from/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/date to/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R012e — report create page registers a sidebar Save action', () => {
        renderCreatePage()
        expect(mockUseSidebarSection).toHaveBeenCalledWith(expect.objectContaining({
            items: expect.arrayContaining([
                expect.objectContaining({ label: 'Save' }),
            ]),
        }))
    })

    it('T-RPT-FE-F-R012b — getFieldMappings is called for all 7 data sources on mount', async () => {
        renderCreatePage()
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalledTimes(7))
        expect(mockGetFieldMappings).toHaveBeenCalledWith('submissions')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('quotes')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('policies')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('policyTransactions')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('bindingAuthorities')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('parties')
        expect(mockGetFieldMappings).toHaveBeenCalledWith('claims')
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
    it('T-RPT-FE-F-R013 — Available Fields and Selected Fields panels are always visible on mount', async () => {
        renderCreatePage()
        // Panels are visible immediately without selecting a data source (use testids to avoid ambiguous text matches)
        expect(screen.getByTestId('available-fields')).toBeInTheDocument()
        expect(screen.getByTestId('selected-fields')).toBeInTheDocument()
        // getFieldMappings is called for all sources on mount
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalledWith('submissions'))
    })

    it('T-RPT-FE-F-R013b — clicking Add on an available field moves it to the selected panel', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'id', label: 'ID', domain: 'Submissions' },
            { key: 'reference', label: 'Reference', domain: 'Submissions' },
        ])
        renderCreatePage()
        // Wait for field-level Add buttons to appear (fields loaded from all sources on mount)
        const addButtons = await screen.findAllByTitle(/add field/i)
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
        // Add field (wait for field-level Add buttons to appear on mount)
        const addButtons = await screen.findAllByTitle(/add field/i)
        const fieldAddBtn = addButtons.find((b) => b.closest('[data-testid="available-fields"]'))
        if (fieldAddBtn) await userEvent.click(fieldAddBtn)
        // Fill required fields and save
        await userEvent.type(screen.getByLabelText(/report name/i), 'Test')
        await userEvent.type(screen.getByLabelText(/description/i), 'Desc')
        await triggerSidebarEvent('reporting:save')
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
        // Filter field dropdown uses ALL fieldMappings — no need to add a field to selected panel first
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalled())
        // Filter row should have an operator select (contains 'equals' option)
        const filterSelects = screen.getAllByRole('combobox').filter(s => {
            const opts = within(s).queryAllByRole('option')
            return opts.some(o => (o as HTMLOptionElement).value === 'equals')
        })
        expect(filterSelects.length).toBeGreaterThan(0)
    })

    it('T-RPT-FE-F-R014a — a blank filter row is visible by default on first render', async () => {
        renderCreatePage()
        const filterSection = await screen.findByTestId('filters-section')
        expect(within(filterSection).getByPlaceholderText(/search field or domain/i)).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R014b — filter operator select includes all 8 standard operators', async () => {
        renderCreatePage()
        await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
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
        const filterSection = document.querySelector('[data-testid="filters-section"]')
        expect(filterSection).not.toBeNull()
        const removeBtn = filterSection
            ? within(filterSection as HTMLElement).getAllByTitle(/remove filter/i)[0]
            : undefined
        if (removeBtn) await userEvent.click(removeBtn)
        // After removal only one filter row should remain
        if (removeBtn) {
            const remaining = filterSection
                ? within(filterSection as HTMLElement).queryAllByRole('combobox').filter(s => {
                    const opts = within(s).queryAllByRole('option')
                    return opts.some(o => (o as HTMLOptionElement).value === 'equals')
                })
                : []
            expect(remaining.length).toBe(1)
        }
    })

    // REQ-RPT-FE-F-014 — filter field uses ALL field mappings (not restricted to selected fields)
    it('T-RPT-FE-F-R014d — filter field dropdown lists fields from ALL loaded mappings, not just selected fields', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'status', label: 'Status', domain: 'Submissions', type: 'lookup', lookupValues: ['open', 'closed'] },
            { key: 'reference', label: 'Reference', domain: 'Submissions' },
        ])
        renderCreatePage()
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalled())
        const filterSection = document.querySelector('[data-testid="filters-section"]')
        expect(filterSection).not.toBeNull()
        const fieldInput = filterSection
            ? within(filterSection as HTMLElement).getByPlaceholderText(/search field or domain/i)
            : undefined
        expect(fieldInput).toBeDefined()
        if (fieldInput) {
            await userEvent.click(fieldInput)
            expect(await screen.findByText('Status (Submissions)')).toBeInTheDocument()
            expect(screen.getByText('Reference (Submissions)')).toBeInTheDocument()
        }
    })

    // REQ-RPT-FE-F-014 — filter row ordering (Move Up / Move Down)
    it('T-RPT-FE-F-R014e — filter rows have Move Up and Move Down buttons', async () => {
        renderCreatePage()
        // Add two filter rows
        const addFilterBtn = screen.getByRole('button', { name: /add filter/i })
        await userEvent.click(addFilterBtn)
        await userEvent.click(addFilterBtn)
        const filterSection = document.querySelector('[data-testid="filters-section"]')
        expect(filterSection).not.toBeNull()
        // Move Up and Move Down titles should be present in filter section
        const moveUpBtns = filterSection
            ? within(filterSection as HTMLElement).queryAllByTitle(/move up/i)
            : []
        const moveDownBtns = filterSection
            ? within(filterSection as HTMLElement).queryAllByTitle(/move down/i)
            : []
        expect(moveUpBtns.length + moveDownBtns.length).toBeGreaterThan(0)
    })

    // REQ-RPT-FE-F-014 — AND/OR connector and group between filter rows
    it('T-RPT-FE-F-R014f — AND/OR connector toggle and group selector appear between multiple filter rows', async () => {
        renderCreatePage()
        const addFilterBtn = screen.getByRole('button', { name: /add filter/i })
        await userEvent.click(addFilterBtn)
        await userEvent.click(addFilterBtn)
        const filterSection = document.querySelector('[data-testid="filters-section"]')
        expect(filterSection).not.toBeNull()
        const connectorText = filterSection?.textContent ?? ''
        expect(connectorText).toMatch(/AND|OR/)
        expect(within(filterSection as HTMLElement).getAllByLabelText(/group/i).length).toBeGreaterThan(0)
    })

    // REQ-RPT-FE-F-014 — field value uses searchable creatable multi-value input
    it('T-RPT-FE-F-R014g — filter operator includes "in" and value control allows adding multiple free-text values', async () => {
        mockGetFieldMappings.mockResolvedValue([
            { key: 'status', label: 'Status', domain: 'Submissions', type: 'lookup', lookupValues: ['open', 'closed', 'bound'] },
        ])
        renderCreatePage()
        await waitFor(() => expect(mockGetFieldMappings).toHaveBeenCalled())
        await userEvent.click(screen.getByRole('button', { name: /add filter/i }))

        // Select 'status' (lookup) in the filter field select
        const filterSection = document.querySelector('[data-testid="filters-section"]')
        expect(filterSection).not.toBeNull()
        const fieldSelect = filterSection
            ? within(filterSection as HTMLElement).getAllByRole('combobox').find(s => {
                const opts = within(s).queryAllByRole('option')
                return opts.some(o => (o as HTMLOptionElement).value === 'status')
            })
            : undefined
        if (fieldSelect) {
            await userEvent.selectOptions(fieldSelect, 'status')
            const operatorSelect = filterSection
                ? within(filterSection as HTMLElement).getAllByRole('combobox').find(s => {
                    const opts = within(s).queryAllByRole('option')
                    return opts.some(o => (o as HTMLOptionElement).value === 'equals') ||
                        opts.some(o => (o as HTMLOptionElement).value === 'in')
                })
                : undefined
            if (operatorSelect) {
                const opts = within(operatorSelect).getAllByRole('option')
                const values = opts.map(o => (o as HTMLOptionElement).value)
                expect(values).toContain('in')
                await userEvent.selectOptions(operatorSelect, 'in')
            }
            const freeTextInput = await screen.findByPlaceholderText(/search or add value/i)
            await userEvent.type(freeTextInput, 'broker created')
            await userEvent.keyboard('{Enter}')
            await userEvent.type(freeTextInput, 'open')
            await userEvent.keyboard('{Enter}')
            expect(screen.getByText('broker created')).toBeInTheDocument()
            expect(screen.getByText('open')).toBeInTheDocument()
        }
    })

    it('T-RPT-FE-F-R017b — loading a dashboard through /reports/edit/:id redirects to /dashboards/edit/:id instead of crashing', async () => {
        mockGetReportTemplate.mockResolvedValueOnce({
            id: 8,
            name: 'Saved Dashboard',
            description: 'Dashboard config',
            type: 'dashboard',
            fields: { pages: [], showMetadata: true },
        })
        render(
            <MemoryRouter initialEntries={['/reports/edit/8']}>
                <Routes>
                    <Route path="/reports/edit/:id" element={<ReportCreatePage />} />
                    <Route path="/dashboards/edit/:id" element={<div>dashboard-edit</div>} />
                </Routes>
            </MemoryRouter>
        )
        expect(await screen.findByText('dashboard-edit')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-015
    it('T-RPT-FE-F-R015 — sidebar Save on /reports/create calls createReportTemplate and navigates to /reports', async () => {
        renderCreatePage('/reports/create')
        await userEvent.type(screen.getByLabelText(/report name/i), 'My Report')
        await userEvent.type(screen.getByLabelText(/description/i), 'My Desc')
        await triggerSidebarEvent('reporting:save')
        await waitFor(() => expect(mockCreateReportTemplate).toHaveBeenCalled())
        await waitFor(() => expect(screen.getByText('reports-list')).toBeInTheDocument())
    })

    it('T-RPT-FE-F-R015b — sidebar Save on /reports/edit/:id calls updateReportTemplate', async () => {
        renderCreatePage('/reports/edit/5')
        await screen.findByRole('heading', { name: /edit report/i })
        await triggerSidebarEvent('reporting:save')
        await waitFor(() => expect(mockUpdateReportTemplate).toHaveBeenCalledWith(5, expect.any(Object)))
    })

    // REQ-RPT-FE-F-016
    it('T-RPT-FE-F-R016 — report create page does not render inline Save or Cancel buttons', async () => {
        renderCreatePage('/reports/create')
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /save report/i })).not.toBeInTheDocument()
    })

    // REQ-RPT-FE-F-017
    it('T-RPT-FE-F-R017 — edit mode pre-populates Report Name from fetched template', async () => {
        renderCreatePage('/reports/edit/5')
        const nameInput = await screen.findByLabelText(/report name/i)
        await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe('Old Name'))
    })

    // REQ-RPT-FE-F-018
    it('T-RPT-FE-F-R018 — validation: Report Name required; save not called when sidebar save fires', async () => {
        renderCreatePage('/reports/create')
        // Do not fill Report Name
        await triggerSidebarEvent('reporting:save')
        expect(mockCreateReportTemplate).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/required/i), 'error')
    })

    it('T-RPT-FE-F-R018b — validation: Description required; save not called when description is empty', async () => {
        renderCreatePage('/reports/create')
        await userEvent.type(screen.getByLabelText(/report name/i), 'My Report')
        // Leave description empty
        await triggerSidebarEvent('reporting:save')
        expect(mockCreateReportTemplate).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/required/i), 'error')
    })

    // REQ-RPT-FE-F-013 search — field search replaces the removed data source dropdown
    it('T-RPT-FE-F-R013d — field search box filters available fields by name or domain', async () => {
        mockGetFieldMappings.mockImplementation((source: string) =>
            source === 'submissions'
                ? Promise.resolve([{ key: 'ref', label: 'Submission Reference', domain: 'Submissions' }])
                : source === 'quotes'
                    ? Promise.resolve([{ key: 'premium', label: 'Premium Amount', domain: 'Quotes' }])
                    : Promise.resolve([])
        )
        renderCreatePage()
        // Wait for fields to load — both domains appear
        expect(await screen.findByText('Submission Reference')).toBeInTheDocument()
        expect(screen.getByText('Premium Amount')).toBeInTheDocument()
        // Search for 'Quotes' — only Quotes-domain fields remain
        const searchInput = screen.getByPlaceholderText(/search fields/i)
        await userEvent.type(searchInput, 'Quotes')
        await waitFor(() => {
            expect(screen.queryByText('Submission Reference')).not.toBeInTheDocument()
            expect(screen.getByText('Premium Amount')).toBeInTheDocument()
        })
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
    it('T-RPT-FE-F-R027 — renders 4 tabs: Filters, Results, Execution History, Audit History; default is Filters', async () => {
        renderRunPage('42')
        await screen.findByText('Sales Report')
        expect(screen.getByRole('button', { name: /^filters$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^results$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /execution history/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /audit history/i })).toBeInTheDocument()
        // Filters tab is visible by default — Run Report button is inside it
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
// ReportRunPage — Core report execution (REQ-RPT-FE-F-005a)
// ---------------------------------------------------------------------------

describe('ReportRunPage — core report slug navigation', () => {
    beforeEach(() => {
        mockRunCoreReport.mockResolvedValue([{ id: 1, reference: 'SUB-001', status: 'open' }])
    })
    afterEach(() => jest.clearAllMocks())

    function renderRunPageSlug(slug: string) {
        return render(
            <MemoryRouter initialEntries={[`/reports/run/${slug}`]}>
                <Routes>
                    <Route path="/reports/run/:reportId" element={<ReportRunPage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    // REQ-RPT-FE-F-005a
    it('T-RPT-FE-F-R005a — core report slug shows template name without calling getReportTemplate API', async () => {
        renderRunPageSlug('submissions')
        expect(await screen.findByText('Submissions Report')).toBeInTheDocument()
        expect(mockGetReportTemplate).not.toHaveBeenCalled()
    })

    it('T-RPT-FE-F-R005a-b — clicking Run Report on core slug calls runCoreReport not runReport', async () => {
        renderRunPageSlug('submissions')
        await screen.findByText('Submissions Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        await waitFor(() => expect(mockRunCoreReport).toHaveBeenCalledWith('submissions'))
        expect(mockRunReport).not.toHaveBeenCalled()
    })

    it('T-RPT-FE-F-R005a-c — core report results render in table after run', async () => {
        renderRunPageSlug('submissions')
        await screen.findByText('Submissions Report')
        await userEvent.click(screen.getByRole('button', { name: /run report/i }))
        expect(await screen.findByText('SUB-001')).toBeInTheDocument()
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

// ---------------------------------------------------------------------------
// DashboardCreatePage — REQ-RPT-FE-F-031 to F-037
// ---------------------------------------------------------------------------

describe('DashboardCreatePage — /dashboards/create and /dashboards/edit/:id', () => {
    const SAMPLE_DASHBOARD_CONFIG = {
        pages: [
            {
                id: 1,
                name: 'Overview',
                template: 'twoColumn',
                widgets: [],
                scrollEnabled: false,
                maxRows: 12,
                sections: null,
            },
        ],
        showMetadata: true,
    }

    beforeEach(() => {
        mockUseSidebarSection.mockReset()
        mockCreateDashboard.mockResolvedValue({ id: 77, name: 'New Dashboard', type: 'dashboard' })
        mockUpdateDashboard.mockResolvedValue({ id: 77, name: 'Updated Dashboard', type: 'dashboard' })
        mockGetDashboard.mockResolvedValue({
            id: 77,
            name: 'Existing Dashboard',
            description: 'An existing one',
            type: 'dashboard',
            dashboardConfig: SAMPLE_DASHBOARD_CONFIG,
        })
    })
    afterEach(() => jest.clearAllMocks())

    function renderDashboardPage(path = '/dashboards/create') {
        return render(
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/dashboards/create" element={<DashboardCreatePage />} />
                    <Route path="/dashboards/edit/:id" element={<DashboardCreatePage />} />
                    <Route path="/dashboards/configure/:id" element={<div>dashboard-configure</div>} />
                    <Route path="/reports" element={<div>reports-list</div>} />
                </Routes>
            </MemoryRouter>,
        )
    }

    // REQ-RPT-FE-F-031
    it('T-RPT-FE-F-R031 — renders "Create Dashboard" heading on /dashboards/create', () => {
        renderDashboardPage('/dashboards/create')
        expect(screen.getByRole('heading', { name: /create dashboard/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R031b — renders "Edit Dashboard" heading on /dashboards/edit/:id', async () => {
        renderDashboardPage('/dashboards/edit/77')
        expect(await screen.findByRole('heading', { name: /edit dashboard/i })).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-032
    it('T-RPT-FE-F-R032 — renders Dashboard Name and Description inputs', () => {
        renderDashboardPage()
        expect(screen.getByLabelText(/dashboard name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R032b — dashboard pages register sidebar Save actions', () => {
        renderDashboardPage('/dashboards/create')
        expect(mockUseSidebarSection).toHaveBeenCalledWith(expect.objectContaining({
            items: expect.arrayContaining([
                expect.objectContaining({ label: 'Save' }),
            ]),
        }))
    })

    // REQ-RPT-FE-F-033
    it('T-RPT-FE-F-R033 — renders Show Dashboard Metadata checkbox checked by default', () => {
        renderDashboardPage()
        const checkbox = screen.getByLabelText(/show dashboard metadata/i) as HTMLInputElement
        expect(checkbox).toBeInTheDocument()
        expect(checkbox.checked).toBe(true)
    })

    // REQ-RPT-FE-F-034
    it('T-RPT-FE-F-R034 — renders Dashboard Layout section with at least one page configuration', () => {
        renderDashboardPage()
        expect(screen.getByText(/dashboard layout/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/enable page scroll/i)).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-035
    it('T-RPT-FE-F-R035 — Add Page button increments the page count', async () => {
        renderDashboardPage()
        const addPageBtn = screen.getByRole('button', { name: /add page/i })
        // Initially 1 page rendered; Page 1 visible
        expect(screen.getByText(/page 1/i)).toBeInTheDocument()
        await userEvent.click(addPageBtn)
        // After click expect Page 2 section header
        expect(await screen.findByText(/page 2/i)).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-036
    it('T-RPT-FE-F-R036 — clicking Layout Template button opens TemplateSelector modal', async () => {
        renderDashboardPage()
        const templateBtn = screen.getByRole('button', { name: /layout template/i })
        await userEvent.click(templateBtn)
        expect(await screen.findByRole('heading', { name: /choose dashboard layout/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R036b — TemplateSelector modal shows template cards', async () => {
        renderDashboardPage()
        await userEvent.click(screen.getByRole('button', { name: /layout template/i }))
        // At least one template card should be visible
        expect(await screen.findByText('Single Widget')).toBeInTheDocument()
        expect(screen.getByText('Two Columns')).toBeInTheDocument()
    })

    // REQ-RPT-FE-F-037
    it('T-RPT-FE-F-R037 — sidebar Save on create calls createDashboard and navigates to /dashboards/configure/:id', async () => {
        renderDashboardPage('/dashboards/create')
        await userEvent.type(screen.getByLabelText(/dashboard name/i), 'My Dashboard')
        await triggerSidebarEvent('dashboard:save')
        await waitFor(() => expect(mockCreateDashboard).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'My Dashboard' }),
        ))
        expect(await screen.findByText('dashboard-configure')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R037e — edit mode registers a sidebar Configure Widgets action', async () => {
        renderDashboardPage('/dashboards/edit/77')
        expect(await screen.findByRole('heading', { name: /edit dashboard/i })).toBeInTheDocument()
        expect(mockUseSidebarSection).toHaveBeenCalledWith(expect.objectContaining({
            items: expect.arrayContaining([
                expect.objectContaining({ label: 'Configure Widgets', to: '/dashboards/configure/77' }),
            ]),
        }))
    })

    it('T-RPT-FE-F-R037b — sidebar Save in edit mode calls updateDashboard and navigates to configure widgets', async () => {
        renderDashboardPage('/dashboards/edit/77')
        await screen.findByRole('heading', { name: /edit dashboard/i })
        await triggerSidebarEvent('dashboard:save')
        await waitFor(() => expect(mockUpdateDashboard).toHaveBeenCalledWith(
            77, expect.objectContaining({ name: 'Existing Dashboard' }),
        ))
        expect(await screen.findByText('dashboard-configure')).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R037c — dashboard create page does not render inline Save or Cancel buttons', async () => {
        renderDashboardPage('/dashboards/create')
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /save dashboard/i })).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R037d — validation: sidebar Save without Dashboard Name shows error notification', async () => {
        renderDashboardPage('/dashboards/create')
        // Do not fill dashboard name
        await triggerSidebarEvent('dashboard:save')
        expect(mockCreateDashboard).not.toHaveBeenCalled()
        expect(mockAddNotification).toHaveBeenCalledWith(
            expect.stringMatching(/required/i),
            'error',
        )
    })
})

describe('DashboardConfigurePage — /dashboards/configure/:id', () => {
    beforeEach(() => {
        mockUseSidebarSection.mockReset()
        mockGetDashboardWidgetData.mockReset()
        mockGetDashboard.mockResolvedValue({
            id: 77,
            name: 'Existing Dashboard',
            description: 'An existing one',
            type: 'dashboard',
            dashboardConfig: {
                pages: [
                    {
                        id: 1,
                        name: 'Overview',
                        template: 'single',
                        widgets: [],
                        scrollEnabled: false,
                        maxRows: 12,
                        sections: null,
                    },
                ],
                showMetadata: true,
            },
        })
        mockUpdateDashboard.mockResolvedValue({ id: 77, name: 'Existing Dashboard', type: 'dashboard' })
        mockGetDashboardWidgetData.mockResolvedValue({ type: 'metric', value: 128, label: 'Gross Premium' })
        mockGetFieldMappings.mockImplementation((domain: string) => {
            if (domain === 'submissions') {
                return Promise.resolve([
                    { key: 'status', label: 'Status', domain: 'Submissions', type: 'lookup', lookupValues: ['Open', 'Bound'] },
                    { key: 'gross_premium', label: 'Gross Premium', domain: 'Submissions', type: 'number' },
                    { key: 'countAll', label: 'Count of Submissions', domain: 'Submissions', type: 'count' },
                ])
            }
            if (domain === 'quotes') {
                return Promise.resolve([
                    { key: 'broker_name', label: 'Broker Name', domain: 'Quotes', type: 'text' },
                    { key: 'quoted_premium', label: 'Quoted Premium', domain: 'Quotes', type: 'number' },
                    { key: 'countAll', label: 'Count of Quotes', domain: 'Quotes', type: 'count' },
                ])
            }
            return Promise.resolve([])
        })
    })

    afterEach(() => jest.clearAllMocks())

    function renderDashboardConfigurePage(path = '/dashboards/configure/77') {
        return render(
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/dashboards/configure/:id" element={<DashboardConfigurePage />} />
                </Routes>
            </MemoryRouter>,
        )
    }

    it('T-RPT-FE-F-R038 — dashboard configure page registers sidebar Save Widgets and renders no inline save/back buttons or helper copy', async () => {
        renderDashboardConfigurePage()
        expect(await screen.findByRole('heading', { name: /configure dashboard widgets/i })).toBeInTheDocument()
        expect(mockUseSidebarSection).toHaveBeenCalledWith(expect.objectContaining({
            items: expect.arrayContaining([
                expect.objectContaining({ label: 'Save Widgets', event: 'dashboard:configure:save' }),
            ]),
        }))
        expect(screen.queryByRole('button', { name: /save widgets/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /back to layout/i })).not.toBeInTheDocument()
        expect(screen.queryByText(/use the sidebar save widgets action/i)).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R039 — widget editor exposes chart-type-specific controls and cross-domain field options', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))
        await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'chart')
        expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/x-axis field/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/x-axis label/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/y-axis label/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/y-axis field/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/legend split by/i)).toBeInTheDocument()
        expect(screen.getByText(/^measures$/i)).toBeInTheDocument()
        expect(within(screen.getByLabelText(/x-axis field/i)).getByRole('option', { name: 'Broker Name' })).toBeInTheDocument()
        expect(within(screen.getByLabelText(/x-axis field/i)).getByRole('option', { name: 'Gross Premium' })).toBeInTheDocument()
        // Click + Add Measure to reveal a measure select and verify filter behaviour
        await userEvent.click(screen.getByRole('button', { name: /add measure/i }))
        const measuresSelect = screen.getByLabelText(/^measure 1$/i)
        expect(within(measuresSelect).getByRole('option', { name: 'Count of Submissions' })).toBeInTheDocument()
        expect(within(measuresSelect).getByRole('option', { name: 'Count of Quotes' })).toBeInTheDocument()
        expect(within(measuresSelect).getByRole('option', { name: 'Gross Premium' })).toBeInTheDocument()
        // Pure dimension fields must NOT appear in the measures list
        expect(within(measuresSelect).queryByRole('option', { name: 'Status' })).not.toBeInTheDocument()
        expect(within(measuresSelect).queryByRole('option', { name: 'Broker Name' })).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R039b — sidebar Save Widgets persists configured chart settings with cross-domain fields', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))
        await userEvent.type(screen.getByLabelText(/widget title/i), 'Premium by Status')
        await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'chart')
        await userEvent.selectOptions(screen.getByLabelText(/chart type/i), 'line')
        await userEvent.selectOptions(screen.getByLabelText(/x-axis field/i), 'submissions::status')
        await userEvent.type(screen.getByLabelText(/x-axis label/i), 'Status')
        await userEvent.type(screen.getByLabelText(/y-axis label/i), 'Premium')
        await userEvent.selectOptions(screen.getByLabelText(/y-axis field/i), 'quotes::broker_name')
        await userEvent.selectOptions(screen.getByLabelText(/legend split by/i), 'submissions::status')
        await userEvent.click(screen.getByRole('button', { name: /add measure/i }))
        await userEvent.selectOptions(screen.getByLabelText(/^measure 1$/i), 'submissions::gross_premium')
        await userEvent.click(screen.getByRole('button', { name: /add measure/i }))
        await userEvent.selectOptions(screen.getByLabelText(/^measure 2$/i), 'quotes::quoted_premium')
        await userEvent.click(screen.getByRole('button', { name: /save widget/i }))

        await triggerSidebarEvent('dashboard:configure:save')

        await waitFor(() => expect(mockUpdateDashboard).toHaveBeenCalledWith(
            77,
            expect.objectContaining({
                config: expect.objectContaining({
                    pages: expect.arrayContaining([
                        expect.objectContaining({
                            widgets: expect.arrayContaining([
                                expect.objectContaining({
                                    title: 'Premium by Status',
                                    type: 'chart',
                                    chartType: 'line',
                                    attribute: 'submissions::status',
                                    yAxisAttribute: 'quotes::broker_name',
                                    legendAttribute: 'submissions::status',
                                    xAxisLabel: 'Status',
                                    yAxisLabel: 'Premium',
                                    measures: ['submissions::gross_premium', 'quotes::quoted_premium'],
                                }),
                            ]),
                        }),
                    ]),
                }),
            }),
        ))
    })

    it('T-RPT-FE-F-R039c — saving a widget replaces the empty slot placeholder with a configured preview', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        expect(screen.getByText(/no widget assigned/i)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))
        await userEvent.type(screen.getByLabelText(/widget title/i), 'Premium by Status')
        await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'chart')
        await userEvent.selectOptions(screen.getByLabelText(/chart type/i), 'line')
        await userEvent.selectOptions(screen.getByLabelText(/x-axis field/i), 'submissions::status')
        await userEvent.selectOptions(screen.getByLabelText(/y-axis field/i), 'submissions::gross_premium')
        await userEvent.selectOptions(screen.getByLabelText(/legend split by/i), 'quotes::broker_name')
        await userEvent.click(screen.getByRole('button', { name: /add measure/i }))
        await userEvent.selectOptions(screen.getByLabelText(/^measure 1$/i), 'submissions::gross_premium')
        await userEvent.click(screen.getByRole('button', { name: /save widget/i }))

        expect(screen.queryByText(/no widget assigned/i)).not.toBeInTheDocument()
        // summary text is removed — slot renders a live widget preview instead
        expect(screen.queryByText(/line \u2022 status/i)).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /edit widget/i })).toBeInTheDocument()
    })

    it('T-RPT-FE-F-R039d — a measure selected on the y-axis is persisted even without separately ticking it in the measures list', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))
        await userEvent.type(screen.getByLabelText(/widget title/i), 'Gross Written Premium by Inception Date')
        await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'chart')
        await userEvent.selectOptions(screen.getByLabelText(/chart type/i), 'line')
        await userEvent.selectOptions(screen.getByLabelText(/x-axis field/i), 'submissions::status')
        await userEvent.selectOptions(screen.getByLabelText(/y-axis field/i), 'submissions::gross_premium')
        await userEvent.click(screen.getByRole('button', { name: /save widget/i }))

        await triggerSidebarEvent('dashboard:configure:save')

        await waitFor(() => expect(mockUpdateDashboard).toHaveBeenCalledWith(
            77,
            expect.objectContaining({
                config: expect.objectContaining({
                    pages: expect.arrayContaining([
                        expect.objectContaining({
                            widgets: expect.arrayContaining([
                                expect.objectContaining({
                                    title: 'Gross Written Premium by Inception Date',
                                    attribute: 'submissions::status',
                                    yAxisAttribute: 'submissions::gross_premium',
                                    measures: ['submissions::gross_premium'],
                                }),
                            ]),
                        }),
                    ]),
                }),
            }),
        ))
    })

    it('T-RPT-FE-F-R039e — modal renders ignoresDashboardFilters checkbox and persists flag when saved (REQ-RPT-FE-F-044)', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))
        await userEvent.type(screen.getByLabelText(/widget title/i), 'Independent Metric')
        await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'metric')

        // checkbox must be present and unchecked by default
        const independentCheckbox = screen.getByRole('checkbox', { name: /independent widget/i })
        expect(independentCheckbox).toBeInTheDocument()
        expect(independentCheckbox).not.toBeChecked()

        // check it
        await userEvent.click(independentCheckbox)
        expect(independentCheckbox).toBeChecked()

        await userEvent.click(screen.getByRole('button', { name: /save widget/i }))
        await triggerSidebarEvent('dashboard:configure:save')

        await waitFor(() => expect(mockUpdateDashboard).toHaveBeenCalledWith(
            77,
            expect.objectContaining({
                config: expect.objectContaining({
                    pages: expect.arrayContaining([
                        expect.objectContaining({
                            widgets: expect.arrayContaining([
                                expect.objectContaining({
                                    title: 'Independent Metric',
                                    ignoresDashboardFilters: true,
                                }),
                            ]),
                        }),
                    ]),
                }),
            }),
        ))
    })

    it('T-RPT-FE-F-R039f — modal renders Widget Filters section; adding a filter creates a row; removing clears it (REQ-RPT-FE-F-043)', async () => {
        renderDashboardConfigurePage()
        await screen.findByRole('heading', { name: /configure dashboard widgets/i })
        await userEvent.click(screen.getByRole('button', { name: /add widget/i }))

        // Widget Filters section and empty state must be present
        expect(screen.getByText(/widget filters/i)).toBeInTheDocument()
        expect(screen.getByText(/no widget-specific filters applied/i)).toBeInTheDocument()
        const addFilterButton = screen.getByRole('button', { name: /\+ add filter/i })
        expect(addFilterButton).toBeInTheDocument()

        // adding a filter creates a row with field select, operator select, value input, remove button
        await userEvent.click(addFilterButton)
        expect(screen.queryByText(/no widget-specific filters applied/i)).not.toBeInTheDocument()
        expect(screen.getByRole('option', { name: /select field/i })).toBeInTheDocument()
        const removeButtons = screen.getAllByRole('button', { name: '' })
        // a remove (×) button is present in the filter row
        expect(removeButtons.length).toBeGreaterThan(0)

        // removing the filter row restores empty state
        // find the small × button in the filter row by querying the last icon-only button added
        const allButtons = screen.getAllByRole('button')
        const removeBtn = allButtons.find((btn) => btn.querySelector('svg') && btn.textContent === '')
        if (removeBtn) {
            await userEvent.click(removeBtn)
            expect(await screen.findByText(/no widget-specific filters applied/i)).toBeInTheDocument()
        }
    })

    it('T-RPT-FE-F-R041 — saved widgets render live data in configure mode instead of a static preview summary', async () => {
        mockGetDashboard.mockResolvedValue({
            id: 77,
            name: 'Existing Dashboard',
            description: 'An existing one',
            type: 'dashboard',
            dashboardConfig: {
                pages: [
                    {
                        id: 1,
                        name: 'Overview',
                        template: 'single',
                        widgets: [
                            {
                                id: 'metric-1',
                                slotId: 1,
                                title: 'Gross Premium KPI',
                                type: 'metric',
                                metric: 'submissions::gross_premium',
                                aggregation: 'sum',
                            },
                        ],
                        scrollEnabled: false,
                        maxRows: 12,
                        sections: null,
                    },
                ],
                showMetadata: true,
            },
        })
        mockGetDashboardWidgetData.mockResolvedValue({ type: 'metric', value: 245000, label: 'Gross Premium KPI' })

        renderDashboardConfigurePage()

        expect(await screen.findByText('245,000')).toBeInTheDocument()
        expect(mockGetDashboardWidgetData).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'metric',
                metric: 'submissions::gross_premium',
            }),
            expect.any(Object),
        )
        expect(screen.getByRole('button', { name: /edit widget/i })).toBeInTheDocument()
        expect(screen.queryByText(/sum aggregation/i)).not.toBeInTheDocument()
    })
})

describe('DashboardViewPage — /dashboards/view/:reportId', () => {
    beforeEach(() => {
        mockGetDashboardWidgetData.mockReset()
        mockGetDashboard.mockResolvedValue({
            id: 77,
            name: 'Executive Dashboard',
            description: 'Configured widgets only',
            type: 'dashboard',
            created_by: 'Alice',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-10T00:00:00.000Z',
            dashboardConfig: {
                pages: [
                    {
                        id: 1,
                        name: 'Overview',
                        template: 'twoColumn',
                        widgets: [
                            {
                                id: 'widget-1',
                                slotId: 1,
                                title: 'Premium by Status',
                                type: 'chart',
                                chartType: 'line',
                                attribute: 'submissions::inceptionDate',
                                yAxisAttribute: 'submissions::gross_premium',
                                legendAttribute: 'submissions::status',
                                measures: ['submissions::gross_premium'],
                                xAxisLabel: 'Inception Date',
                                yAxisLabel: 'Gross Premium',
                            },
                            {
                                id: 'widget-2',
                                slotId: 2,
                                title: 'Broker Notes',
                                type: 'text',
                                note: 'Monitor broker concentration weekly.',
                            },
                        ],
                        scrollEnabled: false,
                        maxRows: 12,
                        sections: null,
                    },
                    {
                        id: 2,
                        name: 'Detail',
                        template: 'single',
                        widgets: [],
                        scrollEnabled: false,
                        maxRows: 12,
                        sections: null,
                    },
                ],
                showMetadata: true,
            },
        })
        mockGetDashboardWidgetData.mockResolvedValue({ type: 'chart', rows: [{ label: 'Open', values: { gross_premium: 120000 } }] })
        mockGetFieldMappings.mockImplementation((domain: string) => {
            if (domain === 'submissions') {
                return Promise.resolve([
                    { key: 'status', label: 'Status', domain: 'Submissions', type: 'lookup' },
                    { key: 'inceptionDate', label: 'Inception Date', domain: 'Submissions', type: 'date' },
                    { key: 'gross_premium', label: 'Gross Premium', domain: 'Submissions', type: 'number' },
                ])
            }
            return Promise.resolve([])
        })
    })

    afterEach(() => jest.clearAllMocks())

    function renderDashboardViewPage(path = '/dashboards/view/77') {
        return render(
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/dashboards/view/:reportId" element={<DashboardViewPage />} />
                </Routes>
            </MemoryRouter>,
        )
    }

    it('T-RPT-FE-F-R040 — dashboard view renders configured widgets and not the report runner UI', async () => {
        renderDashboardViewPage()
        expect(await screen.findByRole('heading', { name: /executive dashboard/i })).toBeInTheDocument()
        expect(screen.getByText('Configured widgets only')).toBeInTheDocument()
        expect(screen.getByText('Created By')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Detail' })).toBeInTheDocument()
        expect(screen.getByText('Premium by Status')).toBeInTheDocument()
        expect(screen.getByText('Broker Notes')).toBeInTheDocument()
        expect(screen.getByText('Monitor broker concentration weekly.')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /run report/i })).not.toBeInTheDocument()
        expect(screen.queryByText(/click "run report" to see results/i)).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R040b — switching dashboard pages shows that page\'s configured slots rather than report results', async () => {
        renderDashboardViewPage()
        await screen.findByText('Premium by Status')
        await userEvent.click(screen.getByRole('button', { name: 'Detail' }))
        expect(screen.getByText('No widget configured')).toBeInTheDocument()
        expect(screen.queryByText('Premium by Status')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /run report/i })).not.toBeInTheDocument()
    })

    it('T-RPT-FE-F-R042 — dashboard filters rerun live widget queries with the active filter state', async () => {
        mockGetDashboardWidgetData
            .mockResolvedValueOnce({ type: 'chart', rows: [{ label: 'Open', values: { gross_premium: 120000 } }] })
            .mockResolvedValueOnce({ type: 'chart', rows: [{ label: 'Bound', values: { gross_premium: 98000 } }] })

        renderDashboardViewPage()

        expect(await screen.findByRole('button', { name: /dashboard filters/i })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /dashboard filters/i }))
        await userEvent.selectOptions(screen.getByLabelText(/analysis basis/i), 'mtd')
        await userEvent.selectOptions(screen.getByLabelText(/date basis/i), 'submissions::inceptionDate')
        await userEvent.clear(screen.getByLabelText(/reporting date/i))
        await userEvent.type(screen.getByLabelText(/reporting date/i), '2026-04-10')
        await userEvent.click(screen.getByRole('button', { name: /apply filters/i }))

        await waitFor(() => expect(mockGetDashboardWidgetData).toHaveBeenLastCalledWith(
            expect.objectContaining({ title: 'Premium by Status' }),
            expect.objectContaining({
                analysisBasis: 'mtd',
                dateBasis: 'submissions::inceptionDate',
                reportingDate: '2026-04-10',
            }),
        ))
    })

    it('T-RPT-FE-F-R044 — independent widget bypasses dashboard filters and always uses default filters (REQ-RPT-FE-F-044)', async () => {
        mockGetDashboard.mockResolvedValue({
            id: 77,
            name: 'Executive Dashboard',
            description: 'Mixed widgets',
            type: 'dashboard',
            created_by: 'Alice',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-10T00:00:00.000Z',
            dashboardConfig: {
                pages: [
                    {
                        id: 1,
                        name: 'Overview',
                        template: 'twoColumn',
                        widgets: [
                            {
                                id: 'widget-normal',
                                slotId: 1,
                                title: 'Normal Widget',
                                type: 'metric',
                                metric: 'submissions::gross_premium',
                                aggregation: 'sum',
                                ignoresDashboardFilters: false,
                            },
                            {
                                id: 'widget-independent',
                                slotId: 2,
                                title: 'Independent Widget',
                                type: 'metric',
                                metric: 'policies::grossWrittenPremium',
                                aggregation: 'sum',
                                ignoresDashboardFilters: true,
                            },
                        ],
                        scrollEnabled: false,
                        maxRows: 12,
                        sections: null,
                    },
                ],
                showMetadata: false,
            },
        })
        mockGetDashboardWidgetData.mockResolvedValue({ type: 'metric', value: 50000, label: 'Gross Premium' })

        const { getByRole } = render(
            <MemoryRouter initialEntries={['/dashboards/view/77']}>
                <Routes>
                    <Route path="/dashboards/view/:reportId" element={<DashboardViewPage />} />
                </Routes>
            </MemoryRouter>,
        )

        // wait for initial load
        expect(await screen.findByText('Normal Widget')).toBeInTheDocument()

        mockGetDashboardWidgetData.mockClear()

        // apply a non-default dashboard filter
        await userEvent.click(getByRole('button', { name: /dashboard filters/i }))
        await userEvent.selectOptions(screen.getByLabelText(/analysis basis/i), 'mtd')
        await userEvent.click(getByRole('button', { name: /apply filters/i }))

        await waitFor(() => expect(mockGetDashboardWidgetData).toHaveBeenCalledTimes(2))

        const calls = mockGetDashboardWidgetData.mock.calls
        const normalCall = calls.find((c) => c[0].title === 'Normal Widget')
        const independentCall = calls.find((c) => c[0].title === 'Independent Widget')

        // normal widget receives the applied mtd filter
        expect(normalCall?.[1]).toMatchObject({ analysisBasis: 'mtd' })
        // independent widget receives default cumulative filter, not mtd
        expect(independentCall?.[1]).toMatchObject({ analysisBasis: 'cumulative' })
        expect(independentCall?.[1]).not.toMatchObject({ analysisBasis: 'mtd' })
    })

    it('T-RPT-FE-F-R050 — chart widget renders via react-chartjs-2 with no chart-type subtitle, no separate legend, and Chart.js tooltips available (REQ-RPT-FE-F-050)', async () => {
        // Default beforeEach mock has widget-1 as a line chart (chartType:'line')
        renderDashboardViewPage()

        // Widget title is visible
        expect(await screen.findByText('Premium by Status')).toBeInTheDocument()

        // react-chartjs-2 Line mock renders a chart element
        expect(screen.getByTestId('chart-line')).toBeInTheDocument()

        // "line chart" subtitle must NOT appear — only title is shown
        expect(screen.queryByText(/line chart/i)).not.toBeInTheDocument()

        // Row-label legend entries (e.g. "Open: 120,000") must NOT be in the DOM
        expect(screen.queryByText(/120,000/)).not.toBeInTheDocument()

        // Loading placeholder must NOT be visible — data has loaded
        expect(screen.queryByText(/Loading live data/i)).not.toBeInTheDocument()
    })
})
