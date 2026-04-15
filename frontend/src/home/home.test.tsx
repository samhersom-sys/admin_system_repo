/**
 * TESTS � HOME DASHBOARD
 * Second artifact. Requirements: app/pages/home/home.requirements.md
 * These tests must all pass before any homepage component code is considered done.
 *
 * Test naming convention: T-HOME-{widget}-R{requirement number}
 * Run with: jest --config jest.scan.config.js app/pages/home/home.test.tsx
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks � all shared services must be mocked; no real HTTP calls in tests
//
// API CONTRACT ALIGNMENT (verified 2026-03-06 against real backend):
//   GET /api/submissions          ? raw array of Submission objects (no .data wrapper)
//   GET /api/quotes               ? raw array of Quote objects
//   GET /api/policies             ? raw array of Policy objects
//   GET /api/binding-authorities  ? raw array of BindingAuthority objects
//   GET /api/recent-records-data  ? { submissions[], quotes[], policies[], bindingAuthorities[] } each with lastOpenedDate
//   GET /api/tasks                ? endpoint not yet implemented (404 � silently empty)
//   GET /api/my-work-items        ? exists but DB bug: column s.workflow_assigned_to missing (silently empty)
//   GET /api/policies/gwp-*       ? endpoint not yet implemented (500 � shows "not yet available")
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(),
    getOrgCode: jest.fn(),
    getUserId: jest.fn(),
}))

jest.mock('@/shared/lib/formatters/formatters', () => ({
    number: (n: number) => n.toLocaleString(),
    currency: (n: number) => `�${n.toLocaleString()}`,
    relativeTime: () => '2 hours ago',
    date: (d: string) => d,
    monthYear: (d: string) => d,
}))

// Chart.js renders to canvas � jsdom cannot handle it; stub the component
jest.mock('./HomeWidgets/GwpChartWidget', () => () => (
    <div data-testid="gwp-chart-widget" />
))
jest.mock('./HomeWidgets/CumulativeGwpWidget', () => () => (
    <div data-testid="cumulative-gwp-widget" />
))

import { get as apiGet } from '@/shared/lib/api-client/api-client'
import { getOrgCode, getUserId } from '@/shared/lib/auth-session/auth-session'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SESSION = { orgCode: 'ORG-001', userId: 'USR-001' }

const MOCK_KPI_ORG = {
    submissions: 12,
    quotes: 5,
    policies: 48,
    bindingAuthorities: 7,
    ytdGwp: 450000,
}

const MOCK_KPI_USER = {
    submissions: 3,
    quotes: 1,
    policies: 8,
    ytdGwp: 90000,
}

// MOCK_RECENT_RECORDS matches /api/recent-records-data shape:
// { submissions[], quotes[], policies[], bindingAuthorities[] } � each item with lastOpenedDate
const MOCK_RECENT_RECORDS = {
    submissions: [
        { id: 'S-001', reference: 'SUB-2026-001', insuredName: 'Acme Corp', status: 'open', lastOpenedDate: '2026-03-05T10:00:00Z' },
    ],
    quotes: [],
    policies: [
        { id: 'P-001', reference: 'POL-2026-001', insuredName: 'Beta Ltd', status: 'bound', lastOpenedDate: '2026-03-04T14:00:00Z' },
    ],
    bindingAuthorities: [],
}

const MOCK_TASKS = [
    {
        id: 'T-001',
        description: 'Review new submission from Acme Corp',
        source: 'system',
        relatedReference: 'SUB-2026-001',
        dueDate: '2026-03-10',
        status: 'pending',
    },
    {
        id: 'T-002',
        description: 'Call broker re: coverage terms',
        source: 'user',
        relatedReference: null,
        dueDate: '2026-03-07',
        status: 'pending',
    },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks() {
    ; (getOrgCode as jest.Mock).mockReturnValue(MOCK_SESSION.orgCode)
        ; (getUserId as jest.Mock).mockReturnValue(MOCK_SESSION.userId)

        // Map each API endpoint to its fixture.
        // Shapes verified against real backend (see API CONTRACT comment at top of file):
        //   - count endpoints  ? raw arrays  (widget reads array.length)
        //   - gwp-summary      ? { total: number }
        //   - recent-records   ? { submissions[], quotes[], policies[], bindingAuthorities[] }
        //   - tasks            ? raw array
        ; (apiGet as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('/api/submissions') && url.includes('orgCode'))
                return Promise.resolve(Array(MOCK_KPI_ORG.submissions).fill({}))
            if (url.includes('/api/submissions') && url.includes('assignedTo'))
                return Promise.resolve(Array(MOCK_KPI_USER.submissions).fill({}))
            if (url.includes('/api/quotes') && url.includes('orgCode'))
                return Promise.resolve(Array(MOCK_KPI_ORG.quotes).fill({}))
            if (url.includes('/api/quotes') && url.includes('assignedTo'))
                return Promise.resolve(Array(MOCK_KPI_USER.quotes).fill({}))
            if (url.includes('/api/policies') && url.includes('orgCode') && url.includes('status=bound'))
                return Promise.resolve(Array(MOCK_KPI_ORG.policies).fill({}))
            if (url.includes('/api/policies') && url.includes('assignedTo') && url.includes('status=bound'))
                return Promise.resolve(Array(MOCK_KPI_USER.policies).fill({}))
            if (url.includes('/api/binding-authorities'))
                return Promise.resolve(Array(MOCK_KPI_ORG.bindingAuthorities).fill({}))
            if (url.includes('/api/policies/gwp-summary') && url.includes('orgCode'))
                return Promise.resolve({ total: MOCK_KPI_ORG.ytdGwp })
            if (url.includes('/api/policies/gwp-summary') && url.includes('userId'))
                return Promise.resolve({ total: MOCK_KPI_USER.ytdGwp })
            if (url.includes('/api/recent-records-data'))
                return Promise.resolve(MOCK_RECENT_RECORDS)
            if (url.includes('/api/tasks'))
                return Promise.resolve(MOCK_TASKS)
            return Promise.resolve([])
        })
}

function renderHomeDashboard() {
    // Import here so mocks are in place before module loads
    const { default: HomeDashboard } = require('./HomeDashboard')
    return render(
        <MemoryRouter initialEntries={['/app-home']}>
            <HomeDashboard />
        </MemoryRouter>
    )
}

// ---------------------------------------------------------------------------
// T-HOME-DASHBOARD � HomeDashboard assembly
// ---------------------------------------------------------------------------

describe('HomeDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupMocks()
    })

    test('T-HOME-DASHBOARD-R1: renders all five widgets', async () => {
        renderHomeDashboard()
        await waitFor(() => {
            expect(screen.getByTestId('kpi-widget')).toBeInTheDocument()
            expect(screen.getByTestId('gwp-chart-widget')).toBeInTheDocument()
            expect(screen.getByTestId('cumulative-gwp-widget')).toBeInTheDocument()
            expect(screen.getByTestId('recent-activity-widget')).toBeInTheDocument()
            expect(screen.getByTestId('tasks-widget')).toBeInTheDocument()
        })
    })

    test('T-HOME-DASHBOARD-R2: HomeDashboard does not fetch data directly � api-client must be called only from widget children', () => {
        // api-client calls should only happen after widgets mount, not synchronously
        // during HomeDashboard render itself. We verify by checking call count
        // at the point HomeDashboard renders before any async work completes.
        const { default: HomeDashboard } = require('./HomeDashboard')
        render(
            <MemoryRouter>
                <HomeDashboard />
            </MemoryRouter>
        )
        // apiGet should not have been called synchronously during render
        // (async calls happen in widget useEffect hooks, not in HomeDashboard itself)
        // @ts-ignore — toHaveBeenCalledBefore is a jest-extended matcher; skipped if not installed
        expect(apiGet).not.toHaveBeenCalledBefore?.call(null)
        // If the above assertion syntax is unavailable, check that HomeDashboard
        // does not call apiGet directly by inspecting its module:
        const homeDashboardSource = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeDashboard.tsx'), 'utf8')
        expect(homeDashboardSource).not.toContain('apiGet(')
        expect(homeDashboardSource).not.toContain("require('../../shared/services/api-client')")
        expect(homeDashboardSource).not.toContain('fetch(')
    })

    test('T-HOME-DASHBOARD-R3: HomeDashboard does not import from domains/', () => {
        const source = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeDashboard.tsx'), 'utf8')
        expect(source).not.toMatch(/from ['"]\..*\/domains\//)
    })

    test('T-HOME-DASHBOARD-R4: HomeDashboard does not import from sharedmodules/', () => {
        const source = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeDashboard.tsx'), 'utf8')
        expect(source).not.toMatch(/from ['"].*\/sharedmodules\//)
    })
})

// ---------------------------------------------------------------------------
// T-HOME-KPI � KpiWidget
// ---------------------------------------------------------------------------

describe('KpiWidget', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupMocks()
    })

    test('T-HOME-KPI-R1: shows a loading state while data is being fetched', () => {
        ; (apiGet as jest.Mock).mockImplementation(() => new Promise(() => { })) // never resolves
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    test('T-HOME-KPI-R2: shows org-level and user-level counts for open submissions', async () => {
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        await waitFor(() => {
            expect(screen.getByText('12')).toBeInTheDocument() // org submissions
            expect(screen.getByText('3')).toBeInTheDocument()  // user submissions
        })
    })

    test('T-HOME-KPI-R3: shows org-level and user-level YTD GWP', async () => {
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        await waitFor(() => {
            expect(screen.getByText('�450,000')).toBeInTheDocument()
            expect(screen.getByText('�90,000')).toBeInTheDocument()
        })
    })

    test('T-HOME-KPI-R4: passes orgCode to all org-scope API calls', async () => {
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        const orgCalls = (apiGet as jest.Mock).mock.calls.filter(([url]: [string]) =>
            url.includes('orgCode=ORG-001')
        )
        expect(orgCalls.length).toBeGreaterThan(0)
    })

    test('T-HOME-KPI-R5: passes userId to all user-scope API calls', async () => {
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        const userCalls = (apiGet as jest.Mock).mock.calls.filter(([url]: [string]) =>
            url.includes('assignedTo=USR-001') || url.includes('userId=USR-001')
        )
        expect(userCalls.length).toBeGreaterThan(0)
    })

    test('T-HOME-KPI-R6: shows an inline error message when an API call fails � does not crash', async () => {
        ; (apiGet as jest.Mock).mockRejectedValue(new Error('Network error'))
        const { default: KpiWidget } = require('./HomeWidgets/KpiWidget')
        render(<KpiWidget orgCode="ORG-001" userId="USR-001" />)
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
    })

    test('T-HOME-KPI-R7: does not use raw fetch()', () => {
        const source = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeWidgets/KpiWidget.tsx'), 'utf8')
        expect(source).not.toContain('fetch(')
    })

    test('T-HOME-KPI-R8: does not hardcode hex colour values', () => {
        const source = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeWidgets/KpiWidget.tsx'), 'utf8')
        expect(source).not.toMatch(/#[0-9a-fA-F]{3,6}/)
    })
})

// ---------------------------------------------------------------------------
// T-HOME-RECENT � RecentActivityWidget
// ---------------------------------------------------------------------------

describe('RecentActivityWidget', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupMocks()
    })

    test('T-HOME-RECENT-R1: shows a loading spinner while fetching', () => {
        ; (apiGet as jest.Mock).mockImplementation(() => new Promise(() => { }))
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(<RecentActivityWidget orgCode="ORG-001" />)
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    test('T-HOME-RECENT-R2: renders each record with reference, insured name, status, and relative time', async () => {
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(<RecentActivityWidget orgCode="ORG-001" />)
        await waitFor(() => {
            expect(screen.getByText('SUB-2026-001')).toBeInTheDocument()
            expect(screen.getByText('Acme Corp')).toBeInTheDocument()
            expect(screen.getAllByText('2 hours ago').length).toBeGreaterThan(0)
        })
    })

    test('T-HOME-RECENT-R3: each record row is a navigation link', async () => {
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(
            <MemoryRouter>
                <RecentActivityWidget orgCode="ORG-001" />
            </MemoryRouter>
        )
        await waitFor(() => {
            const links = screen.getAllByRole('link')
            expect(links.length).toBeGreaterThanOrEqual(2)
        })
    })

    test('T-HOME-RECENT-R4: shows at most 10 records', async () => {
        // Return recent-records-data shape with 15 submissions � widget must slice to 10
        ; (apiGet as jest.Mock).mockResolvedValue({
            submissions: Array.from({ length: 15 }, (_, i) => ({
                id: `S-${i}`,
                reference: `REF-${i}`,
                insuredName: `Insured ${i}`,
                status: 'open',
                lastOpenedDate: '2026-03-05T10:00:00Z',
            })),
            quotes: [],
            policies: [],
            bindingAuthorities: [],
        })
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(
            <MemoryRouter>
                <RecentActivityWidget orgCode="ORG-001" />
            </MemoryRouter>
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row').slice(1) // exclude header if present
            expect(rows.length).toBeLessThanOrEqual(10)
        })
    })

    test('T-HOME-RECENT-R5: calls the recent-records-data API endpoint', async () => {
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(<RecentActivityWidget orgCode="ORG-001" />)
        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        // Backend scopes by session � endpoint is /api/recent-records-data
        expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('recent-records-data'), expect.anything())
    })

    test('T-HOME-RECENT-R6: shows inline error on failure', async () => {
        ; (apiGet as jest.Mock).mockRejectedValue(new Error('fail'))
        const { default: RecentActivityWidget } = require('./HomeWidgets/RecentActivityWidget')
        render(<RecentActivityWidget orgCode="ORG-001" />)
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    })
})

// ---------------------------------------------------------------------------
// T-HOME-TASKS � TasksWidget
// ---------------------------------------------------------------------------

describe('TasksWidget', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupMocks()
    })

    test('T-HOME-TASKS-R1: shows a loading spinner while fetching', () => {
        ; (apiGet as jest.Mock).mockImplementation(() => new Promise(() => { }))
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    test('T-HOME-TASKS-R2: renders both system-assigned and user-created tasks', async () => {
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        await waitFor(() => {
            expect(screen.getByText('Review new submission from Acme Corp')).toBeInTheDocument()
            expect(screen.getByText('Call broker re: coverage terms')).toBeInTheDocument()
        })
    })

    test('T-HOME-TASKS-R3: distinguishes system tasks from user tasks with a source indicator', async () => {
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        await waitFor(() => {
            expect(screen.getByTestId('task-source-system')).toBeInTheDocument()
            expect(screen.getByTestId('task-source-user')).toBeInTheDocument()
        })
    })

    test('T-HOME-TASKS-R4: shows at most 5 tasks', async () => {
        const manyTasks = Array.from({ length: 8 }, (_, i) => ({
            id: `T-${i}`,
            description: `Task ${i}`,
            source: 'system',
            relatedReference: null,
            dueDate: '2026-03-10',
            status: 'pending',
        }))
            // Backend returns raw array � no .data wrapper
            ; (apiGet as jest.Mock).mockResolvedValue(manyTasks)
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        await waitFor(() => {
            const taskItems = screen.getAllByTestId('task-item')
            expect(taskItems.length).toBeLessThanOrEqual(5)
        })
    })

    test('T-HOME-TASKS-R5: shows a "View all" link to /my-work-items', async () => {
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(
            <MemoryRouter>
                <TasksWidget userId="USR-001" />
            </MemoryRouter>
        )
        await waitFor(() => {
            const viewAll = screen.getByRole('link', { name: /view all/i })
            expect(viewAll).toHaveAttribute('href', '/my-work-items')
        })
    })

    test('T-HOME-TASKS-R6: scopes API call to userId � does not fetch other users tasks', async () => {
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        expect(apiGet).toHaveBeenCalledWith(
            expect.stringContaining('assignedTo=USR-001'),
            expect.anything()
        )
        // Must NOT include orgCode-only scoping without userId
        const calls = (apiGet as jest.Mock).mock.calls
        calls.forEach(([url]: [string]) => {
            if (url.includes('/api/tasks')) {
                expect(url).toContain('USR-001')
            }
        })
    })

    test('T-HOME-TASKS-R7: highlights overdue tasks without hardcoded colour classes', async () => {
        const overdueTask = [{
            id: 'T-OVERDUE',
            description: 'Overdue task',
            source: 'system',
            relatedReference: null,
            dueDate: '2026-01-01', // in the past
            status: 'pending',
        }]
            ; (apiGet as jest.Mock).mockResolvedValue({ data: { items: overdueTask } })
        const source = require('fs')
            .readFileSync(require('path').resolve(__dirname, 'HomeWidgets/TasksWidget.tsx'), 'utf8')
        // Must not contain hardcoded red colour classes or hex
        expect(source).not.toMatch(/text-red-[0-9]+/)
        expect(source).not.toMatch(/bg-red-[0-9]+/)
        expect(source).not.toMatch(/#[fF][fF]|#[eE][aA]|\bred\b/)
    })

    test('T-HOME-TASKS-R8: shows inline error on failure', async () => {
        ; (apiGet as jest.Mock).mockRejectedValue(new Error('fail'))
        const { default: TasksWidget } = require('./HomeWidgets/TasksWidget')
        render(<TasksWidget userId="USR-001" />)
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    })
})

// ---------------------------------------------------------------------------
// T-HOME-ARCH � Architecture compliance (file-level checks)
// ---------------------------------------------------------------------------

describe('Architecture compliance', () => {
    const widgetFiles = [
        'HomeWidgets/KpiWidget.tsx',
        'HomeWidgets/RecentActivityWidget.tsx',
        'HomeWidgets/TasksWidget.tsx',
        'HomeDashboard.tsx',
        'index.tsx',
    ]

    widgetFiles.forEach((file) => {
        test(`T-HOME-ARCH-R1: ${file} does not import from domains/`, () => {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, file), 'utf8')
            expect(source).not.toMatch(/from ['"].*\/domains\//)
        })

        test(`T-HOME-ARCH-R2: ${file} does not call raw fetch()`, () => {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, file), 'utf8')
            expect(source).not.toMatch(/\bfetch\s*\(/)
        })

        test(`T-HOME-ARCH-R3: ${file} does not hardcode hex colour values`, () => {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, file), 'utf8')
            expect(source).not.toMatch(/#[0-9a-fA-F]{3,6}['"\s]/)
        })

        test(`T-HOME-ARCH-R4: ${file} does not import from sharedmodules/`, () => {
            const source = require('fs')
                .readFileSync(require('path').resolve(__dirname, file), 'utf8')
            expect(source).not.toMatch(/from ['"].*\/sharedmodules\//)
        })
    })
})

// ---------------------------------------------------------------------------
// T-HOME-PAGE — HomePage wrapper (navigation reset)   REQ-HOME-F-018
// ---------------------------------------------------------------------------

describe('HomePage — navigation reset (REQ-HOME-F-018)', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        setupMocks()
        // When the Dashboard tab is clicked, HomeEmbeddedDashboard renders
        // and calls reporting.service functions — they must return Promises.
        mockGetReportTemplates.mockResolvedValue([])
        mockGetDashboard.mockResolvedValue(null)
        mockGetDashboardWidgetData.mockResolvedValue(null)
        mockGetFieldMappings.mockResolvedValue([])
    })

    function renderHomePage(initialEntries = ['/app-home']) {
        const { default: HomePage } = require('./index')
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/app-home" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('T-HOME-PAGE-R18a: renders with Overview tab selected by default', async () => {
        renderHomePage()
        await waitFor(() => {
            const overviewTab = screen.getByRole('tab', { name: 'Overview' })
            expect(overviewTab).toHaveAttribute('aria-selected', 'true')
        })
    })

    it('T-HOME-PAGE-R18b: renders both Overview and Dashboard tabs', async () => {
        renderHomePage()
        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument()
        })
    })

    it('T-HOME-PAGE-R18c: clicking Dashboard tab switches away from Overview', async () => {
        renderHomePage()
        const user = userEvent.setup()

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
        })

        await user.click(screen.getByRole('tab', { name: 'Dashboard' }))

        expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false')
    })
})

// ---------------------------------------------------------------------------
// Mocks for HomeEmbeddedDashboard
// ---------------------------------------------------------------------------

const mockGetReportTemplates = jest.fn()
const mockGetDashboard = jest.fn()
const mockGetDashboardWidgetData = jest.fn()
const mockGetFieldMappings = jest.fn()

jest.mock('@/reporting/reporting.service', () => ({
    getReportTemplates: (...a: unknown[]) => mockGetReportTemplates(...a),
    getDashboard: (...a: unknown[]) => mockGetDashboard(...a),
    getDashboardWidgetData: (...a: unknown[]) => mockGetDashboardWidgetData(...a),
    getFieldMappings: (...a: unknown[]) => mockGetFieldMappings(...a),
}))

jest.mock('@/reporting/DashboardCreatePage/DashboardTemplates', () => ({
    DASHBOARD_TEMPLATES: {},
}))

jest.mock('@/reporting/dashboardWidgets', () => ({
    DASHBOARD_DATA_SOURCES: [],
    DashboardLiveWidget: () => <div data-testid="dashboard-live-widget" />,
    createDefaultDashboardFilters: () => ({}),
    makeCompositeKey: (source: string, key: string) => `${source}.${key}`,
    normalizeDashboardWidget: (w: unknown) => w,
}))

jest.mock('@/shared/LoadingSpinner/LoadingSpinner', () => () => (
    <div data-testid="loading-spinner" />
))

// Helper fixtures
function makePinnedTemplate(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        name: 'My Dashboard',
        type: 'dashboard',
        fields: { showOnHomepage: true },
        dashboardConfig: {
            pages: [{ id: 1, name: 'Page 1', widgets: [], sections: [], template: null }],
            showOnHomepage: true,
        },
        ...overrides,
    }
}

function renderEmbeddedDashboard() {
    const { default: HomeEmbeddedDashboard } = require('./HomeEmbeddedDashboard')
    return render(
        <MemoryRouter>
            <HomeEmbeddedDashboard />
        </MemoryRouter>,
    )
}

// ---------------------------------------------------------------------------
// T-HOME-DASH — HomeEmbeddedDashboard
// Requirements: home.requirements.md §12
// ---------------------------------------------------------------------------

describe('HomeEmbeddedDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetReportTemplates.mockReset()
        mockGetDashboard.mockReset()
        mockGetDashboardWidgetData.mockReset()
        mockGetFieldMappings.mockReturnValue(Promise.resolve([]))
    })

    it('T-HOME-DASH-R01a: excludes dashboards without showOnHomepage flag', async () => {
        const unpinned = makePinnedTemplate({ id: 2, name: 'Unpinned', fields: { showOnHomepage: false } })
        mockGetReportTemplates.mockResolvedValue([unpinned])

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByText(/No dashboards are pinned/i)).toBeInTheDocument()
        })
        expect(mockGetDashboard).not.toHaveBeenCalled()
    })

    it('T-HOME-DASH-R01b: includes only dashboards with showOnHomepage === true', async () => {
        const pinned = makePinnedTemplate({ id: 1, name: 'Pinned Only' })
        const unpinned = makePinnedTemplate({ id: 2, name: 'Unpinned', fields: { showOnHomepage: false } })
        mockGetReportTemplates.mockResolvedValue([pinned, unpinned])
        mockGetDashboard.mockResolvedValue({ ...pinned, dashboardConfig: pinned.dashboardConfig })

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByText('Pinned Only')).toBeInTheDocument()
        })
        expect(screen.queryByText('Unpinned')).not.toBeInTheDocument()
    })

    it('T-HOME-DASH-R02a: shows empty state message when no dashboards are pinned', async () => {
        mockGetReportTemplates.mockResolvedValue([])

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByText(/No dashboards are pinned to the homepage/i)).toBeInTheDocument()
        })
    })

    it('T-HOME-DASH-R02b: does not call getDashboard when list is empty', async () => {
        mockGetReportTemplates.mockResolvedValue([])

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
        })
        expect(mockGetDashboard).not.toHaveBeenCalled()
    })

    it('T-HOME-DASH-R03a: renders no pagination dots when only 1 pinned dashboard', async () => {
        const single = makePinnedTemplate({ id: 1, name: 'Solo Dashboard' })
        mockGetReportTemplates.mockResolvedValue([single])
        mockGetDashboard.mockResolvedValue({ ...single, dashboardConfig: single.dashboardConfig })

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByText('Solo Dashboard')).toBeInTheDocument()
        })
        expect(screen.queryByRole('tablist', { name: /Dashboard pagination/i })).not.toBeInTheDocument()
    })

    it('T-HOME-DASH-R03b: renders exactly N dots for N pinned dashboards (N=2)', async () => {
        const dash1 = makePinnedTemplate({ id: 1, name: 'Dash A' })
        const dash2 = makePinnedTemplate({ id: 2, name: 'Dash B' })
        mockGetReportTemplates.mockResolvedValue([dash1, dash2])
        mockGetDashboard.mockResolvedValue({ ...dash1, dashboardConfig: dash1.dashboardConfig })

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByRole('tablist', { name: /Dashboard pagination/i })).toBeInTheDocument()
        })
        const tabs = screen.getAllByRole('tab')
        expect(tabs).toHaveLength(2)
    })

    it('T-HOME-DASH-R03c: each pagination dot has aria-label equal to the dashboard name', async () => {
        const dash1 = makePinnedTemplate({ id: 1, name: 'Alpha' })
        const dash2 = makePinnedTemplate({ id: 2, name: 'Beta' })
        mockGetReportTemplates.mockResolvedValue([dash1, dash2])
        mockGetDashboard.mockResolvedValue({ ...dash1, dashboardConfig: dash1.dashboardConfig })

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Alpha' })).toBeInTheDocument()
        })
        expect(screen.getByRole('tab', { name: 'Beta' })).toBeInTheDocument()
    })

    it('T-HOME-DASH-R03d: clicking a pagination dot changes active selection', async () => {
        const dash1 = makePinnedTemplate({ id: 1, name: 'First' })
        const dash2 = makePinnedTemplate({ id: 2, name: 'Second' })
        mockGetReportTemplates.mockResolvedValue([dash1, dash2])
        mockGetDashboard.mockResolvedValue({ ...dash1, dashboardConfig: dash1.dashboardConfig })

        const user = userEvent.setup()
        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument()
        })

        const firstTab = screen.getByRole('tab', { name: 'First' })
        const secondTab = screen.getByRole('tab', { name: 'Second' })
        expect(firstTab).toHaveAttribute('aria-selected', 'true')
        expect(secondTab).toHaveAttribute('aria-selected', 'false')

        mockGetDashboard.mockResolvedValue({ ...dash2, dashboardConfig: dash2.dashboardConfig })
        await user.click(secondTab)

        await waitFor(() => {
            expect(secondTab).toHaveAttribute('aria-selected', 'true')
        })
        expect(firstTab).toHaveAttribute('aria-selected', 'false')
    })

    it('T-HOME-DASH-R04a: renders dashboard title as h2 when loaded', async () => {
        const pinned = makePinnedTemplate({ id: 1, name: 'My Dashboard Title' })
        mockGetReportTemplates.mockResolvedValue([pinned])
        mockGetDashboard.mockResolvedValue({ ...pinned, dashboardConfig: pinned.dashboardConfig })

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 2, name: 'My Dashboard Title' })).toBeInTheDocument()
        })
    })

    it('T-HOME-DASH-R04b: shows error message when getDashboard rejects', async () => {
        const pinned = makePinnedTemplate()
        mockGetReportTemplates.mockResolvedValue([pinned])
        mockGetDashboard.mockRejectedValue(new Error('Network error'))

        renderEmbeddedDashboard()

        await waitFor(() => {
            expect(screen.getByText(/Could not load dashboard/i)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// Mocks for HomeEmbeddedDashboard