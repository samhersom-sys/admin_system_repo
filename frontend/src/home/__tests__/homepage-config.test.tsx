/**
 * TESTS — HOME-CFG: Configurable Homepage
 * Second artifact. Requirements: frontend/src/home/homepage-config.requirements.md
 * SA Review: 2026-06-30 — all 21 REQs approved (REQ-HOME-CFG-DB-F-002 flagged, org_code correction pending DBA)
 *
 * Test ID format: T-HOME-CFG-{layer}-{type}-R{NNN}
 * Run with: npx jest --config jest.config.js --testPathPattern="homepage-config" --no-coverage
 *
 * Coverage:
 *   REQ-HOME-CFG-FE-F-001 to F-011  (frontend functional)
 *   REQ-HOME-CFG-BE-F-001 to BE-F-003  (backend — frontend call contracts)
 *   REQ-HOME-CFG-FE-S-001 to S-002  (security)
 *   REQ-HOME-CFG-FE-C-001 to C-003  (constraints)
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mock — reporting.service
//
// patchMasterHomepage and patchHomepagePreferences do not exist yet in
// reporting.service.ts.  They are declared here so that tests fail at the
// render/assertion level (behaviour mismatch) rather than at module-load time
// (missing export).  When the Developer adds these functions, the module-load
// error disappears and the tests fail correctly at the assertion level.
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
// NEW — not yet implemented; mocked so tests compile now and fail at assertion level
const mockPatchMasterHomepage = jest.fn()
const mockPatchHomepagePreferences = jest.fn()

jest.mock('../../reporting/reporting.service', () => ({
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
    // NEW — not yet in reporting.service.ts
    patchMasterHomepage: (...a: unknown[]) => mockPatchMasterHomepage(...a),
    patchHomepagePreferences: (...a: unknown[]) => mockPatchHomepagePreferences(...a),
}))

// ---------------------------------------------------------------------------
// Mock — auth-session
// masterHomepageTemplateId is an extension of SessionUser (index signature
// [key: string]: unknown already permits it).  Mocked so HomePage can read it
// once the Developer adds the session-read logic.
// ---------------------------------------------------------------------------
const mockGetSession = jest.fn()
const mockGetOrgCode = jest.fn()
const mockGetUserId = jest.fn()

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: (...a: unknown[]) => mockGetSession(...a),
    getOrgCode: (...a: unknown[]) => mockGetOrgCode(...a),
    getUserId: (...a: unknown[]) => mockGetUserId(...a),
    isAuthenticated: jest.fn(() => true),
    storeSession: jest.fn(),
}))

// ---------------------------------------------------------------------------
// Mock — NotificationDock
// ---------------------------------------------------------------------------
const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))

// ---------------------------------------------------------------------------
// Mock — SidebarContext
// ---------------------------------------------------------------------------
const mockUseSidebarSection = jest.fn()
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: (...args: unknown[]) => mockUseSidebarSection(...args),
}))

// ---------------------------------------------------------------------------
// Mock — react-chartjs-2 (canvas not available in jsdom)
// ---------------------------------------------------------------------------
jest.mock('react-chartjs-2', () => ({
    Line: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-line' }),
    Bar: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-bar' }),
    Doughnut: (_: unknown) => React.createElement('div', { 'data-testid': 'chart-doughnut' }),
}))

// ---------------------------------------------------------------------------
// Mock — DashboardViewPage
// Renders a sentinel element so HomePage tests can verify the component is
// mounted (and what templateId is passed) without a real dashboard.
// ---------------------------------------------------------------------------
jest.mock('../../reporting/DashboardViewPage/DashboardViewPage', () => ({
    __esModule: true,
    default: ({ templateId }: { templateId: number }) =>
        React.createElement('div', {
            'data-testid': 'dashboard-view-page',
            'data-template-id': String(templateId ?? ''),
        }),
}))

// ---------------------------------------------------------------------------
// Mock — HomeDashboard and HomeEmbeddedDashboard (not under test here)
// ---------------------------------------------------------------------------
jest.mock('../HomeDashboard', () => ({
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'home-dashboard' }),
}))
jest.mock('../HomeEmbeddedDashboard', () => ({
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'home-embedded-dashboard' }),
}))

// ---------------------------------------------------------------------------
// Imports — after mocks so Jest hoisting works correctly
// ---------------------------------------------------------------------------
import ReportsListPage from '../../reporting/ReportsListPage/ReportsListPage'
import DashboardConfigurePage from '../../reporting/DashboardConfigurePage/DashboardConfigurePage'
import HomePage from '../index'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Two dashboard-type templates that will appear in the "Core Homepages" section */
const HOMEPAGE_TPL_A = {
    id: 7,
    name: 'Policy Overview',
    description: 'Per-user policy KPI overview.',
    type: 'dashboard' as const,
    created_by: 'System',
}
const HOMEPAGE_TPL_B = {
    id: 8,
    name: 'Underwriter View',
    description: 'Underwriting pipeline summary.',
    type: 'dashboard' as const,
    created_by: 'System',
}

/** Standard core report (for section ordering assertions) */
const CORE_TPL = {
    id: 10,
    name: 'Submissions Report',
    description: 'All submissions.',
    type: 'core' as const,
    data_source: 'submissions',
    created_by: 'System',
}

/** Custom report with showOnHomepage=false */
const CUSTOM_TPL = {
    id: 20,
    name: 'My Custom Report',
    description: 'My custom report.',
    type: 'custom' as const,
    created_by: 'Alice',
    data_source: 'submissions',
    showOnHomepage: false,
}

/** Session with a master homepage set (templateId=7) */
const SESSION_WITH_MASTER = {
    token: 'tok-abc',
    user: {
        id: 'USR-001',
        email: 'test@example.com',
        name: 'Test User',
        orgCode: 'ORG-001',
        role: 'underwriter',
        masterHomepageTemplateId: 7,
    },
}

/** Session with no master homepage */
const SESSION_NO_MASTER = {
    token: 'tok-abc',
    user: {
        id: 'USR-001',
        email: 'test@example.com',
        name: 'Test User',
        orgCode: 'ORG-001',
        role: 'underwriter',
        masterHomepageTemplateId: null,
    },
}

/** Minimal dashboard config sufficient for DashboardConfigurePage to render */
const SAMPLE_DASHBOARD = {
    id: 1,
    name: 'Test Dashboard',
    config: {
        pages: [{ id: 1, name: 'Page 1', template: 'single', widgets: [] }],
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderListPage(path = '/reports') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <ReportsListPage />
        </MemoryRouter>,
    )
}

function renderHomePage() {
    return render(
        <MemoryRouter initialEntries={['/app-home']}>
            <Routes>
                <Route path="/app-home" element={<HomePage />} />
            </Routes>
        </MemoryRouter>,
    )
}

function renderDashboardConfigurePage(id = '1') {
    return render(
        <MemoryRouter initialEntries={[`/dashboards/configure/${id}`]}>
            <Routes>
                <Route path="/dashboards/configure/:dashboardId" element={<DashboardConfigurePage />} />
            </Routes>
        </MemoryRouter>,
    )
}

// ===========================================================================
// SECTION 1 — ReportsListPage: Core Homepages section
// REQ-HOME-CFG-FE-F-002
// ===========================================================================

describe('Core Homepages section — REQ-HOME-CFG-FE-F-002', () => {
    beforeEach(() => {
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A, HOMEPAGE_TPL_B, CORE_TPL])
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-002
    it('T-HOME-CFG-FE-F-R002a — renders a "Core Homepages" section heading above "Core Application Reports"', async () => {
        renderListPage()
        // Wait until loading is done
        await screen.findByText('Submissions Report')

        const homepagesHeading = screen.getByText('Core Homepages')
        const coreReportsHeading = screen.getByText('Core Application Reports')

        // Node.DOCUMENT_POSITION_FOLLOWING means coreReportsHeading comes AFTER homepagesHeading
        expect(
            homepagesHeading.compareDocumentPosition(coreReportsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
    })

    // @req REQ-HOME-CFG-FE-F-002
    it('T-HOME-CFG-FE-F-R002b — Core Homepages section renders one row per homepage template returned', async () => {
        renderListPage()
        const section = await screen.findByRole('region', { name: /core homepages/i })
        expect(within(section).getByText('Policy Overview')).toBeInTheDocument()
        expect(within(section).getByText('Underwriter View')).toBeInTheDocument()
    })
})

// ===========================================================================
// SECTION 2 — Homepage column — master toggle
// REQ-HOME-CFG-FE-F-003
// ===========================================================================

describe('Homepage column — master toggle — REQ-HOME-CFG-FE-F-003', () => {
    beforeEach(() => {
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A, HOMEPAGE_TPL_B])
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockPatchMasterHomepage.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-003
    it('T-HOME-CFG-FE-F-R003a — each row in the Core Homepages section has a [data-testid="homepage-toggle-{id}"] button', async () => {
        renderListPage()
        expect(await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toBeInTheDocument()
        expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_B.id}`)).toBeInTheDocument()
    })

    // @req REQ-HOME-CFG-FE-F-003
    it('T-HOME-CFG-FE-F-R003b — activating a toggle calls patchMasterHomepage with { masterHomepageTemplateId: id }', async () => {
        const user = userEvent.setup()
        renderListPage()
        const toggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggle)
        await waitFor(() =>
            expect(mockPatchMasterHomepage).toHaveBeenCalledWith({
                masterHomepageTemplateId: HOMEPAGE_TPL_A.id,
            }),
        )
    })

    // @req REQ-HOME-CFG-FE-F-003
    it('T-HOME-CFG-FE-F-R003c — after activating row A toggle, row B toggle remains in the OFF state (aria-pressed="false")', async () => {
        const user = userEvent.setup()
        renderListPage()
        const toggleA = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggleA)
        await waitFor(() =>
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute('aria-pressed', 'true'),
        )
        expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_B.id}`)).toHaveAttribute('aria-pressed', 'false')
    })
})

// ===========================================================================
// SECTION 3 — Clicking active Homepage toggle clears master
// REQ-HOME-CFG-FE-F-004
// ===========================================================================

describe('Active Homepage toggle clears master — REQ-HOME-CFG-FE-F-004', () => {
    beforeEach(() => {
        // Session already has templateId 7 active so the toggle renders in ON state
        mockGetSession.mockReturnValue(SESSION_WITH_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A, HOMEPAGE_TPL_B])
        mockPatchMasterHomepage.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-004
    it('T-HOME-CFG-FE-F-R004 — clicking the currently-active Homepage toggle calls patchMasterHomepage with { masterHomepageTemplateId: null }', async () => {
        const user = userEvent.setup()
        renderListPage()

        // Template A (id=7) is the active master; its toggle must start in ON state
        const activeToggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        expect(activeToggle).toHaveAttribute('aria-pressed', 'true')

        await user.click(activeToggle)
        await waitFor(() =>
            expect(mockPatchMasterHomepage).toHaveBeenCalledWith({ masterHomepageTemplateId: null }),
        )
    })
})

// ===========================================================================
// SECTION 4 — Dashboard column toggle
// REQ-HOME-CFG-FE-F-005
// ===========================================================================

describe('Dashboard column toggle — REQ-HOME-CFG-FE-F-005', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A, HOMEPAGE_TPL_B, CUSTOM_TPL])
        mockPatchHomepagePreferences.mockResolvedValue({})
        mockUpdateReportTemplate.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-005
    it('T-HOME-CFG-FE-F-R005a — toggling Dashboard ON for a core/homepage template calls patchHomepagePreferences with { templateId, showOnHomepage: true }', async () => {
        const user = userEvent.setup()
        renderListPage()
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(dashToggle)
        await waitFor(() =>
            expect(mockPatchHomepagePreferences).toHaveBeenCalledWith({
                templateId: HOMEPAGE_TPL_A.id,
                showOnHomepage: true,
            }),
        )
    })

    // @req REQ-HOME-CFG-FE-F-005
    it('T-HOME-CFG-FE-F-R005b — toggling Dashboard ON for a custom template calls updateReportTemplate with showOnHomepage: true', async () => {
        const user = userEvent.setup()
        renderListPage()
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${CUSTOM_TPL.id}`)
        await user.click(dashToggle)
        await waitFor(() =>
            expect(mockUpdateReportTemplate).toHaveBeenCalledWith(
                CUSTOM_TPL.id,
                expect.objectContaining({ showOnHomepage: true }),
            ),
        )
    })

    // @req REQ-HOME-CFG-FE-F-005
    it('T-HOME-CFG-FE-F-R005c — multiple rows can have Dashboard=ON simultaneously (not mutually exclusive)', async () => {
        const user = userEvent.setup()
        renderListPage()
        const toggleA = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        const toggleB = screen.getByTestId(`dashboard-toggle-${HOMEPAGE_TPL_B.id}`)

        await user.click(toggleA)
        await user.click(toggleB)

        await waitFor(() => {
            expect(screen.getByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute('aria-pressed', 'true')
            expect(screen.getByTestId(`dashboard-toggle-${HOMEPAGE_TPL_B.id}`)).toHaveAttribute('aria-pressed', 'true')
        })
    })
})

// ===========================================================================
// SECTION 5 — No column — page order input
// REQ-HOME-CFG-FE-F-006
// ===========================================================================

describe('No column — page order input — REQ-HOME-CFG-FE-F-006', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
        mockPatchHomepagePreferences.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-006
    it('T-HOME-CFG-FE-F-R006a — when Dashboard=OFF, the No input is blank and disabled', async () => {
        renderListPage()
        const pageOrderInput = await screen.findByTestId(`page-order-input-${HOMEPAGE_TPL_A.id}`)
        expect(pageOrderInput).toBeDisabled()
        expect((pageOrderInput as HTMLInputElement).value).toBe('')
    })

    // @req REQ-HOME-CFG-FE-F-006
    it('T-HOME-CFG-FE-F-R006b — when Dashboard=ON, the No input becomes enabled', async () => {
        const user = userEvent.setup()
        renderListPage()
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(dashToggle)
        await waitFor(() =>
            expect(screen.getByTestId(`page-order-input-${HOMEPAGE_TPL_A.id}`)).not.toBeDisabled(),
        )
    })

    // @req REQ-HOME-CFG-FE-F-006
    it('T-HOME-CFG-FE-F-R006c — entering a valid positive integer and blurring calls patchHomepagePreferences with homepagePageOrder', async () => {
        const user = userEvent.setup()
        renderListPage()

        // Enable the input first by toggling Dashboard ON
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(dashToggle)

        const pageOrderInput = await screen.findByTestId(`page-order-input-${HOMEPAGE_TPL_A.id}`)
        await user.clear(pageOrderInput)
        await user.type(pageOrderInput, '3')
        await user.tab() // trigger blur

        await waitFor(() =>
            expect(mockPatchHomepagePreferences).toHaveBeenCalledWith(
                expect.objectContaining({ templateId: HOMEPAGE_TPL_A.id, homepagePageOrder: 3 }),
            ),
        )
    })
})

// ===========================================================================
// SECTION 6 — HomePage runtime: default homepage seeded at user creation
// REQ-HOME-CFG-FE-F-001
// ===========================================================================

describe('Default homepage seeded at user creation — REQ-HOME-CFG-FE-F-001', () => {
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-001
    it('T-HOME-CFG-FE-F-R001 — when session has masterHomepageTemplateId:7, HomePage renders DashboardViewPage (not static HomeDashboard)', async () => {
        mockGetSession.mockReturnValue(SESSION_WITH_MASTER)
        renderHomePage()
        await waitFor(() => {
            expect(screen.getByTestId('dashboard-view-page')).toBeInTheDocument()
            expect(screen.queryByTestId('home-dashboard')).not.toBeInTheDocument()
        })
    })
})

// ===========================================================================
// SECTION 7 — Overview tab replaced by master homepage
// REQ-HOME-CFG-FE-F-007
// ===========================================================================

describe('Overview tab replaced by master homepage — REQ-HOME-CFG-FE-F-007', () => {
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-007
    it('T-HOME-CFG-FE-F-R007a — when masterHomepageTemplateId is non-null, no "Overview" tab is rendered and DashboardViewPage is shown', async () => {
        mockGetSession.mockReturnValue(SESSION_WITH_MASTER)
        renderHomePage()
        await waitFor(() => {
            expect(screen.queryByRole('tab', { name: /overview/i })).not.toBeInTheDocument()
            expect(screen.getByTestId('dashboard-view-page')).toBeInTheDocument()
        })
    })

    // @req REQ-HOME-CFG-FE-F-007
    it('T-HOME-CFG-FE-F-R007b — when masterHomepageTemplateId is null, no "Overview" tab is rendered (static HomeDashboard shows directly, no tab wrapper)', async () => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        renderHomePage()
        await waitFor(() => {
            expect(screen.queryByRole('tab', { name: /overview/i })).not.toBeInTheDocument()
            expect(screen.getByTestId('home-dashboard')).toBeInTheDocument()
        })
    })
})

// ===========================================================================
// SECTION 8 — Core Application Reports: Recent Records and My Tasks rows
// REQ-HOME-CFG-FE-F-008 / REQ-HOME-CFG-FE-F-009
// ===========================================================================

describe('Core Application Reports rows — REQ-HOME-CFG-FE-F-008 / F-009', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        // Return empty server list — CORE_TEMPLATES array in ReportsListPage is the source of truth
        mockGetReportTemplates.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-008
    it('T-HOME-CFG-FE-F-R008 — Core Application Reports section contains a row with name "Recent Records"', async () => {
        renderListPage()
        const section = await screen.findByRole('region', { name: /core application reports/i })
        expect(within(section).getByText('Recent Records')).toBeInTheDocument()
    })

    // @req REQ-HOME-CFG-FE-F-009
    it('T-HOME-CFG-FE-F-R009 — Core Application Reports section contains a row with name "My Tasks"', async () => {
        renderListPage()
        const section = await screen.findByRole('region', { name: /core application reports/i })
        expect(within(section).getByText('My Tasks')).toBeInTheDocument()
    })
})

// ===========================================================================
// SECTION 9 — Widget editor: data source dropdown includes recent-records / tasks
// REQ-HOME-CFG-FE-F-010 / REQ-HOME-CFG-FE-F-011
// ===========================================================================

describe('Widget editor data source dropdown — REQ-HOME-CFG-FE-F-010', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetDashboard.mockResolvedValue(SAMPLE_DASHBOARD)
        mockGetFieldMappings.mockResolvedValue([])
        mockGetDashboardWidgetData.mockResolvedValue([])
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-010
    it('T-HOME-CFG-FE-F-R010a — widget editor data source select includes a "recent-records" option', async () => {
        const user = userEvent.setup()
        renderDashboardConfigurePage()

        // Open the widget editor by clicking "Add Widget" on the first available slot
        const addWidgetBtn = await screen.findByRole('button', { name: /add widget/i })
        await user.click(addWidgetBtn)

        // Locate the data source dropdown in the widget editor modal
        const dataSourceSelect = await screen.findByRole('combobox', { name: /data source/i })
        const optionValues = Array.from(dataSourceSelect.querySelectorAll('option')).map(
            (o) => (o as HTMLOptionElement).value,
        )
        expect(optionValues).toContain('recent-records')
    })

    // @req REQ-HOME-CFG-FE-F-010
    it('T-HOME-CFG-FE-F-R010b — widget editor data source select includes a "tasks" option', async () => {
        const user = userEvent.setup()
        renderDashboardConfigurePage()

        const addWidgetBtn = await screen.findByRole('button', { name: /add widget/i })
        await user.click(addWidgetBtn)

        const dataSourceSelect = await screen.findByRole('combobox', { name: /data source/i })
        const optionValues = Array.from(dataSourceSelect.querySelectorAll('option')).map(
            (o) => (o as HTMLOptionElement).value,
        )
        expect(optionValues).toContain('tasks')
    })
})

describe('Widget editor live preview — REQ-HOME-CFG-FE-F-011', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetDashboard.mockResolvedValue(SAMPLE_DASHBOARD)
        mockGetFieldMappings.mockResolvedValue([])
        // Never resolves so the loading spinner stays visible during assertion
        mockGetDashboardWidgetData.mockReturnValue(new Promise(() => {}))
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-F-011
    it('T-HOME-CFG-FE-F-R011 — selecting "recent-records" as data source triggers a getDashboardWidgetData call and shows a loading indicator', async () => {
        const user = userEvent.setup()
        renderDashboardConfigurePage()

        const addWidgetBtn = await screen.findByRole('button', { name: /add widget/i })
        await user.click(addWidgetBtn)

        const dataSourceSelect = await screen.findByRole('combobox', { name: /data source/i })
        await user.selectOptions(dataSourceSelect, 'recent-records')

        await waitFor(() => expect(mockGetDashboardWidgetData).toHaveBeenCalled())

        // A loading indicator must be visible while the preview call is in flight
        const spinner =
            document.querySelector('[data-testid="preview-loading"]') ??
            document.querySelector('[data-testid="loading-spinner"]') ??
            document.querySelector('.animate-spin')
        expect(spinner).not.toBeNull()
    })
})

// ===========================================================================
// SECTION 10 — Backend call contracts
// ===========================================================================

describe('Backend call contract — PATCH master-homepage — REQ-HOME-CFG-BE-F-001', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-BE-F-001
    it('T-HOME-CFG-BE-F-R001a — clicking the Homepage toggle calls patchMasterHomepage with the correct body { masterHomepageTemplateId: id }', async () => {
        mockPatchMasterHomepage.mockResolvedValue({})
        const user = userEvent.setup()
        renderListPage()
        const toggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggle)
        await waitFor(() =>
            expect(mockPatchMasterHomepage).toHaveBeenCalledTimes(1),
        )
        expect(mockPatchMasterHomepage).toHaveBeenCalledWith({
            masterHomepageTemplateId: HOMEPAGE_TPL_A.id,
        })
    })

    // @req REQ-HOME-CFG-BE-F-001
    it('T-HOME-CFG-BE-F-R001b — when patchMasterHomepage rejects (server error), an error notification is shown to the user', async () => {
        mockPatchMasterHomepage.mockRejectedValue(new Error('Internal Server Error'))
        const user = userEvent.setup()
        renderListPage()
        const toggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggle)
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error'),
        )
    })
})

describe('Backend call contract — PATCH homepage-preferences — REQ-HOME-CFG-BE-F-002', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
        mockPatchHomepagePreferences.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-BE-F-002
    it('T-HOME-CFG-BE-F-R002 — toggling Dashboard ON calls patchHomepagePreferences with { templateId, showOnHomepage: true }', async () => {
        const user = userEvent.setup()
        renderListPage()
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(dashToggle)
        await waitFor(() =>
            expect(mockPatchHomepagePreferences).toHaveBeenCalledWith({
                templateId: HOMEPAGE_TPL_A.id,
                showOnHomepage: true,
            }),
        )
    })
})

describe('Backend contract — GET /api/auth/me includes masterHomepageTemplateId — REQ-HOME-CFG-BE-F-003', () => {
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-BE-F-003
    it('T-HOME-CFG-BE-F-R003 — HomePage reads masterHomepageTemplateId from the session and passes it as templateId to DashboardViewPage', async () => {
        mockGetSession.mockReturnValue(SESSION_WITH_MASTER)
        renderHomePage()
        await waitFor(() => {
            const dashView = screen.getByTestId('dashboard-view-page')
            expect(dashView).toHaveAttribute(
                'data-template-id',
                String(SESSION_WITH_MASTER.user.masterHomepageTemplateId),
            )
        })
    })
})

// ===========================================================================
// SECTION 11 — Security
// ===========================================================================

describe('Security — /me endpoint (no IDOR) — REQ-HOME-CFG-FE-S-001', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
        mockPatchMasterHomepage.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-S-001
    it('T-HOME-CFG-FE-S-R001 — patchMasterHomepage is invoked with only the payload object (no user-id positional arg), confirming the service uses /users/me/ not /users/:id/', async () => {
        const user = userEvent.setup()
        renderListPage()
        const toggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggle)
        await waitFor(() => expect(mockPatchMasterHomepage).toHaveBeenCalled())

        // The first (and only) argument must be the payload object, not a numeric user ID
        const [firstArg] = mockPatchMasterHomepage.mock.calls[0] as [unknown]
        expect(typeof firstArg).not.toBe('number')
        expect(firstArg).toEqual({ masterHomepageTemplateId: HOMEPAGE_TPL_A.id })
    })

    // @req REQ-HOME-CFG-FE-S-001
    it('T-HOME-CFG-FE-S-R001b — patchMasterHomepage in reporting.service uses /users/me/ in the URL (not a /:userId/ path param)', () => {
        // Structural assertion: read the service source and verify URL shape
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs') as typeof import('fs')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path') as typeof import('path')
        const source: string = fs.readFileSync(
            path.resolve(__dirname, '../../reporting/reporting.service.ts'),
            'utf8',
        )
        // The function must exist
        expect(source).toContain('patchMasterHomepage')
        // The URL must use /me/ not a dynamic /:id/ segment
        expect(source).toMatch(/['"`]\/api\/users\/me\/master-homepage['"`]/)
        // Must not contain a dynamic user-id placeholder
        expect(source).not.toMatch(/\/users\/\$\{.*\}\/master-homepage/)
    })
})

describe('Security — 403 reverts toggle and shows notification — REQ-HOME-CFG-FE-S-002', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-S-002
    it('T-HOME-CFG-FE-S-R002 — when patchMasterHomepage rejects with a 403, the toggle reverts to OFF and an error notification is shown', async () => {
        const forbiddenError = Object.assign(new Error('Forbidden'), { status: 403 })
        mockPatchMasterHomepage.mockRejectedValue(forbiddenError)

        const user = userEvent.setup()
        renderListPage()
        const toggle = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggle)

        await waitFor(() => {
            // Toggle must revert to OFF after the 403 rejection
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute(
                'aria-pressed',
                'false',
            )
        })
        expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error')
    })
})

// ===========================================================================
// SECTION 12 — Constraints
// ===========================================================================

describe('Constraints — api-client usage — REQ-HOME-CFG-FE-C-001', () => {
    // @req REQ-HOME-CFG-FE-C-001
    it('T-HOME-CFG-FE-C-R001 — patchMasterHomepage exists in reporting.service and calls patch from @/shared/lib/api-client/api-client (no direct fetch/axios)', () => {
        // Structural assertion: read the service source and verify the implementation
        // constraints without coupling tests to internal implementation details.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs') as typeof import('fs')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path') as typeof import('path')
        const source: string = fs.readFileSync(
            path.resolve(__dirname, '../../reporting/reporting.service.ts'),
            'utf8',
        )
        // REQ-HOME-CFG-FE-C-001: function must exist
        expect(source).toContain('patchMasterHomepage')
        // REQ-HOME-CFG-FE-C-001: must use the api-client patch helper, not raw fetch/axios
        expect(source).not.toContain('fetch(')
        expect(source).not.toMatch(/from ['"]axios['"]/)
        // The file must import 'patch' from the api-client (or use a destructured import)
        expect(source).toMatch(/import\s*\{[^}]*patch[^}]*\}\s*from\s*['"]@\/shared\/lib\/api-client\/api-client['"]/)
    })
})

describe('Constraints — at most one master homepage active per user — REQ-HOME-CFG-FE-C-002', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A, HOMEPAGE_TPL_B])
        mockPatchMasterHomepage.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    // @req REQ-HOME-CFG-FE-C-002
    it('T-HOME-CFG-FE-C-R002a — after clicking row A toggle ON, row A is ON and row B is OFF', async () => {
        const user = userEvent.setup()
        renderListPage()
        const toggleA = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggleA)
        await waitFor(() =>
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute('aria-pressed', 'true'),
        )
        expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_B.id}`)).toHaveAttribute('aria-pressed', 'false')
    })

    // @req REQ-HOME-CFG-FE-C-002
    it('T-HOME-CFG-FE-C-R002b — after clicking row B toggle ON (when A was already ON), row B is ON and row A is OFF', async () => {
        const user = userEvent.setup()
        renderListPage()

        // Activate A first
        const toggleA = await screen.findByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(toggleA)
        await waitFor(() =>
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute('aria-pressed', 'true'),
        )

        // Now activate B — A must switch OFF
        const toggleB = screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_B.id}`)
        await user.click(toggleB)
        await waitFor(() => {
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_B.id}`)).toHaveAttribute('aria-pressed', 'true')
            expect(screen.getByTestId(`homepage-toggle-${HOMEPAGE_TPL_A.id}`)).toHaveAttribute('aria-pressed', 'false')
        })
    })
})

describe('Constraints — page order must be positive integer ≥ 1 — REQ-HOME-CFG-FE-C-003', () => {
    beforeEach(() => {
        mockGetSession.mockReturnValue(SESSION_NO_MASTER)
        mockGetReportTemplates.mockResolvedValue([HOMEPAGE_TPL_A])
        mockPatchHomepagePreferences.mockResolvedValue({})
    })
    afterEach(() => jest.clearAllMocks())

    /** Helper: render page, enable Dashboard toggle, return the page-order input + user instance */
    async function enableDashboardAndGetInput() {
        const user = userEvent.setup()
        renderListPage()
        const dashToggle = await screen.findByTestId(`dashboard-toggle-${HOMEPAGE_TPL_A.id}`)
        await user.click(dashToggle)
        const pageOrderInput = await screen.findByTestId(`page-order-input-${HOMEPAGE_TPL_A.id}`)
        return { user, pageOrderInput }
    }

    // @req REQ-HOME-CFG-FE-C-003
    it('T-HOME-CFG-FE-C-R003a — entering 0 shows a validation error and does NOT call patchHomepagePreferences', async () => {
        const { user, pageOrderInput } = await enableDashboardAndGetInput()
        await user.clear(pageOrderInput)
        await user.type(pageOrderInput, '0')
        await user.tab()
        await waitFor(() =>
            expect(
                screen.getByText(/must be.*1|page order.*invalid|value.*positive|at least 1/i),
            ).toBeInTheDocument(),
        )
        expect(mockPatchHomepagePreferences).not.toHaveBeenCalledWith(
            expect.objectContaining({ homepagePageOrder: 0 }),
        )
    })

    // @req REQ-HOME-CFG-FE-C-003
    it('T-HOME-CFG-FE-C-R003b — entering -1 shows a validation error and does NOT call patchHomepagePreferences', async () => {
        const { user, pageOrderInput } = await enableDashboardAndGetInput()
        await user.clear(pageOrderInput)
        await user.type(pageOrderInput, '-1')
        await user.tab()
        await waitFor(() =>
            expect(
                screen.getByText(/must be.*1|page order.*invalid|value.*positive|at least 1/i),
            ).toBeInTheDocument(),
        )
        expect(mockPatchHomepagePreferences).not.toHaveBeenCalledWith(
            expect.objectContaining({ homepagePageOrder: -1 }),
        )
    })

    // @req REQ-HOME-CFG-FE-C-003
    it('T-HOME-CFG-FE-C-R003c — entering "abc" shows a validation error and does NOT call patchHomepagePreferences', async () => {
        const { user, pageOrderInput } = await enableDashboardAndGetInput()
        await user.clear(pageOrderInput)
        await user.type(pageOrderInput, 'abc')
        await user.tab()
        await waitFor(() =>
            expect(
                screen.getByText(/must be.*1|page order.*invalid|must be a number|positive integer/i),
            ).toBeInTheDocument(),
        )
        expect(mockPatchHomepagePreferences).not.toHaveBeenCalledWith(
            expect.objectContaining({ homepagePageOrder: expect.anything() }),
        )
    })

    // @req REQ-HOME-CFG-FE-C-003
    it('T-HOME-CFG-FE-C-R003d — entering a valid value of 2 does call patchHomepagePreferences with homepagePageOrder: 2', async () => {
        const { user, pageOrderInput } = await enableDashboardAndGetInput()
        await user.clear(pageOrderInput)
        await user.type(pageOrderInput, '2')
        await user.tab()
        await waitFor(() =>
            expect(mockPatchHomepagePreferences).toHaveBeenCalledWith(
                expect.objectContaining({ templateId: HOMEPAGE_TPL_A.id, homepagePageOrder: 2 }),
            ),
        )
    })
})

// ===========================================================================
// SECTION 13 — DB placeholder tests
// (Integration-layer coverage — to be implemented in backend/__tests__/
//  as a separate file per docs/AI Guidelines/06-Testing-Standards.md §6.2)
// ===========================================================================

describe('DB — REQ-HOME-CFG-DB-F-001: master_homepage_template_id column migration', () => {
    // @req REQ-HOME-CFG-DB-F-001
    it.todo(
        'T-HOME-CFG-DB-F-R001 — after migration, users table has master_homepage_template_id column (nullable integer)',
    )
    // @req REQ-HOME-CFG-DB-F-001
    it.todo(
        'T-HOME-CFG-DB-F-R001b — FK constraint ON DELETE SET NULL is enforced: deleting a referenced template sets column to NULL',
    )
})

describe('DB — REQ-HOME-CFG-DB-F-002: homepage_preferences table (org_code correction pending DBA review — SA 2026-06-30)', () => {
    // @req REQ-HOME-CFG-DB-F-002
    it.todo(
        'T-HOME-CFG-DB-F-R002 — after migration, homepage_preferences table has columns: id, user_id, template_id, show_on_homepage, homepage_page_order, created_at, updated_at',
    )
    // @req REQ-HOME-CFG-DB-F-002
    it.todo(
        'T-HOME-CFG-DB-F-R002b — unique constraint on (user_id, template_id) is enforced: inserting a duplicate row raises a constraint error',
    )
    // @req REQ-HOME-CFG-DB-F-002
    it.todo(
        'T-HOME-CFG-DB-F-R002c — org_code column is NOT present in homepage_preferences (flagged in SA review 2026-06-30; confirm with DBA before implementing)',
    )
})
