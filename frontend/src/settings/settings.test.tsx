/**
 * TESTS — Settings Page tile grid & Platform Admin Panel
 *
 * Requirements: settings.requirements.md
 * Test IDs: T-SETTINGS-GRID-R* / T-SETTINGS-ADMIN-R* / T-SETTINGS-DASH-R*
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from './index'
import PlatformAdminPanel from './PlatformAdminPanel'
import DashboardReportingSettingsPage from './DashboardReportingSettingsPage'
import EarningsConfigPage from './EarningsConfigPage'

// Mocks

let mockRole = ''

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  getSession: () => ({
    token: 'tok',
    user: { id: '1', email: 'a@b.com', name: 'Test User', orgCode: 'TST', role: mockRole },
  }),
}))

jest.mock('./settings.service', () => ({
  getMeasures: jest.fn(),
  createMeasure: jest.fn(),
  deactivateMeasure: jest.fn(),
  getEarningPatterns: jest.fn(),
  createEarningPattern: jest.fn(),
  deactivateEarningPattern: jest.fn(),
  getPatternPoints: jest.fn(),
  createPatternPoint: jest.fn(),
  deletePatternPoint: jest.fn(),
  getEarningRules: jest.fn(),
  createEarningRule: jest.fn(),
  updateEarningRule: jest.fn(),
  deactivateEarningRule: jest.fn(),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

// Wrap in MemoryRouter since tiles use <Link> / navigate
function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

const { getMeasures, createMeasure, deactivateMeasure,
  getEarningPatterns, createEarningPattern, deactivateEarningPattern,
  getEarningRules, createEarningRule, updateEarningRule, deactivateEarningRule,
} = jest.requireMock('./settings.service')

// ---------------------------------------------------------------------------
// Tile grid — role visibility
// ---------------------------------------------------------------------------

describe('T-SETTINGS-GRID-R01: tiles shown to client_admin', () => {
  it('renders all standard tiles for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
    expect(screen.getByText('Earnings Configuration')).toBeInTheDocument()
  })

  it('does NOT render Module Licensing tile for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.queryByText('Module Licensing')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-GRID-R02: tiles shown to internal_admin', () => {
  it('renders all tiles including Module Licensing, Dashboard & Reporting, and Earnings Configuration for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
    expect(screen.getByText('Module Licensing')).toBeInTheDocument()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
    expect(screen.getByText('Earnings Configuration')).toBeInTheDocument()
  })
})

describe('T-SETTINGS-GRID-R03: Module Licensing tile hidden for non-internal_admin', () => {
  it('does not render Module Licensing for underwriter', () => {
    mockRole = 'underwriter'
    renderSettings()
    expect(screen.queryByText('Module Licensing')).not.toBeInTheDocument()
  })

  it('does not render Module Licensing for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.queryByText('Module Licensing')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-GRID-R04: each tile has a description and chevron', () => {
  it('renders tile descriptions for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText(/Manage user accounts, roles and permissions/i)).toBeInTheDocument()
    expect(screen.getByText(/Manage per-organisation module access/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Platform Admin — Module Licensing visibility gate
// ---------------------------------------------------------------------------

describe('T-SETTINGS-ADMIN-R01: Platform Admin hidden for non-internal_admin', () => {
  it('does not render Platform Admin section for an underwriter', () => {
    mockRole = 'underwriter'
    renderSettings()
    expect(screen.queryByText('Platform Admin')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-ADMIN-R02: Platform Admin panel renders for internal_admin', () => {
  it('renders PlatformAdminPanel directly when role is internal_admin', () => {
    mockRole = 'internal_admin'
    render(
      <MemoryRouter>
        <PlatformAdminPanel />
      </MemoryRouter>
    )
    expect(screen.getByText('Allied Insurance Group')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Module table
// ---------------------------------------------------------------------------

describe('T-SETTINGS-ADMIN-R03: all mock orgs rendered in module table', () => {
  it('shows all three mock organisations', () => {
    mockRole = 'internal_admin'
    render(<MemoryRouter><PlatformAdminPanel /></MemoryRouter>)
    expect(screen.getByText('Allied Insurance Group')).toBeInTheDocument()
    expect(screen.getByText('Synaptic Re')).toBeInTheDocument()
    expect(screen.getByText('ClaimsPro TPA')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Dependency validation
// ---------------------------------------------------------------------------

describe('T-SETTINGS-ADMIN-R04: dep warning when enabling Bordereau Import without Binding Authorities', () => {
  it('shows alert and does not check the box when BA is not enabled for that org', () => {
    mockRole = 'internal_admin'
    render(<MemoryRouter><PlatformAdminPanel /></MemoryRouter>)
    const checkbox = screen.getByRole('checkbox', {
      name: /ClaimsPro TPA.*Bordereau Import/i,
    })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Cannot enable "Bordereau Import"/
    )
    expect(checkbox).not.toBeChecked()
  })
})

describe('T-SETTINGS-ADMIN-R05: disabling Binding Authorities auto-disables Bordereau Import', () => {
  it('unchecks Bordereau Import and shows alert when BA is disabled for ALLIED', () => {
    mockRole = 'internal_admin'
    render(<MemoryRouter><PlatformAdminPanel /></MemoryRouter>)
    const baCheckbox = screen.getByRole('checkbox', {
      name: /Allied Insurance Group.*Binding Authorities/i,
    })
    const brCheckbox = screen.getByRole('checkbox', {
      name: /Allied Insurance Group.*Bordereau Import/i,
    })
    expect(brCheckbox).toBeChecked()
    fireEvent.click(baCheckbox)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /"Bordereau Import" was also disabled/
    )
    expect(brCheckbox).not.toBeChecked()
  })
})

// ---------------------------------------------------------------------------
// Dashboard & Reporting Settings page
// ---------------------------------------------------------------------------

const INTERNAL_MEASURE = {
  id: 1, key: 'countAll', label: 'Count of Policies', sourceKey: 'policies',
  measureType: 'count', scope: 'both', createdByType: 'internal', orgCode: null, isActive: true,
}
const TENANT_MEASURE = {
  id: 2, key: 'countMine', label: 'My Custom Count', sourceKey: 'policies',
  measureType: 'count', scope: 'org', createdByType: 'tenant', orgCode: 'TST', isActive: true,
}

function renderDashPage() {
  return render(
    <MemoryRouter>
      <DashboardReportingSettingsPage />
    </MemoryRouter>
  )
}

describe('T-SETTINGS-DASH-R001: Dashboard & Reporting tile is present on settings page', () => {
  it('shows Dashboard & Reporting tile for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
  })

  it('shows Dashboard & Reporting tile for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
  })

  it('does NOT show Dashboard & Reporting tile for underwriter', () => {
    mockRole = 'underwriter'
    renderSettings()
    expect(screen.queryByText('Dashboard & Reporting')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-DASH-R002a: DashboardReportingSettingsPage loading state', () => {
  it('shows a loading spinner while measures are loading', () => {
    getMeasures.mockReturnValue(new Promise(() => { }))
    renderDashPage()
    expect(screen.getByLabelText('Loading measures')).toBeInTheDocument()
  })
})

describe('T-SETTINGS-DASH-R002b: DashboardReportingSettingsPage error state', () => {
  it('shows error message when API fails', async () => {
    getMeasures.mockRejectedValue(new Error('Network error'))
    renderDashPage()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network error'))
  })
})

describe('T-SETTINGS-DASH-R001: page renders internal and custom measures in separate sections', () => {
  it('shows internal measures as read-only and custom measures with deactivate button', async () => {
    getMeasures.mockResolvedValue([INTERNAL_MEASURE, TENANT_MEASURE])
    renderDashPage()

    await waitFor(() => expect(screen.getByText('Count of Policies')).toBeInTheDocument())

    expect(screen.getByText('My Custom Count')).toBeInTheDocument()

    // Deactivate button only for tenant measure
    expect(screen.getByRole('button', { name: /Deactivate My Custom Count/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Deactivate Count of Policies/ })).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-DASH-R003a: deactivate success removes row from list', () => {
  it('removes tenant measure row after successful deactivation', async () => {
    getMeasures.mockResolvedValue([TENANT_MEASURE])
    deactivateMeasure.mockResolvedValue(undefined)
    renderDashPage()

    await waitFor(() => expect(screen.getByText('My Custom Count')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Deactivate My Custom Count/ }))

    await waitFor(() => expect(screen.queryByText('My Custom Count')).not.toBeInTheDocument())
    expect(deactivateMeasure).toHaveBeenCalledWith(2)
  })
})

describe('T-SETTINGS-DASH-R004: Add Custom Measure form creates a new measure', () => {
  it('shows form on click and submits POST, adding the new row', async () => {
    getMeasures.mockResolvedValue([])
    createMeasure.mockResolvedValue({ ...TENANT_MEASURE, key: 'myNew', label: 'Brand New Measure' })
    renderDashPage()

    await waitFor(() => expect(screen.getByText('Add Custom Measure')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Add Custom Measure'))

    expect(screen.getByRole('form', { name: 'Add custom measure form' })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/e.g. countActiveRenewals/), { target: { value: 'myNew' } })
    fireEvent.change(screen.getByPlaceholderText(/e.g. Active Renewals/), { target: { value: 'Brand New Measure' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Measure' }))

    await waitFor(() => expect(screen.getByText('Brand New Measure')).toBeInTheDocument())
    expect(createMeasure).toHaveBeenCalledWith(expect.objectContaining({ key: 'myNew', label: 'Brand New Measure' }))
  })
})

// ---------------------------------------------------------------------------
// Earnings Configuration
// ---------------------------------------------------------------------------

const STRAIGHT_LINE_PATTERN = {
  id: 1, orgCode: 'TST', name: 'Standard Straight Line', patternType: 'straight_line',
  earnBy: 'day', description: null, isActive: true,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
const UPFRONT_PATTERN = {
  id: 2, orgCode: 'TST', name: 'Upfront Full', patternType: 'upfront',
  earnBy: 'day', description: 'All at inception', isActive: true,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
const SAMPLE_RULE = {
  id: 1, orgCode: 'TST', patternId: 1, priority: 0,
  productId: null, classOfBusiness: 'Property', contractType: null,
  includeIncepted: true, isActive: true,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

function renderEarningsPage() {
  return render(
    <MemoryRouter>
      <EarningsConfigPage />
    </MemoryRouter>
  )
}

describe('T-EARN-R01: Earnings Configuration tile appears on settings page', () => {
  it('shows Earnings Configuration tile for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.getByText('Earnings Configuration')).toBeInTheDocument()
  })

  it('shows Earnings Configuration tile for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText('Earnings Configuration')).toBeInTheDocument()
  })

  it('does NOT show Earnings Configuration tile for underwriter', () => {
    mockRole = 'underwriter'
    renderSettings()
    expect(screen.queryByText('Earnings Configuration')).not.toBeInTheDocument()
  })
})

describe('T-EARN-R02: EarningsConfigPage shows Patterns and Rules tabs', () => {
  it('renders both tabs on load with Patterns as default', async () => {
    getEarningPatterns.mockResolvedValue([])
    renderEarningsPage()
    expect(screen.getByRole('button', { name: /patterns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rules/i })).toBeInTheDocument()
  })
})

describe('T-EARN-R03: EarningsConfigPage loads and displays patterns', () => {
  it('shows loading state initially', () => {
    getEarningPatterns.mockReturnValue(new Promise(() => { }))
    renderEarningsPage()
    expect(screen.getByText(/loading patterns/i)).toBeInTheDocument()
  })

  it('shows patterns after load', async () => {
    getEarningPatterns.mockResolvedValue([STRAIGHT_LINE_PATTERN, UPFRONT_PATTERN])
    renderEarningsPage()
    await waitFor(() => expect(screen.getByText('Standard Straight Line')).toBeInTheDocument())
    expect(screen.getByText('Upfront Full')).toBeInTheDocument()
    expect(screen.getByText('Straight Line')).toBeInTheDocument()
    expect(screen.getByText('Upfront')).toBeInTheDocument()
  })

  it('shows empty state when no patterns exist', async () => {
    getEarningPatterns.mockResolvedValue([])
    renderEarningsPage()
    await waitFor(() => expect(screen.getByText(/no earning patterns configured/i)).toBeInTheDocument())
  })

  it('shows error state when fetch fails', async () => {
    getEarningPatterns.mockRejectedValue(new Error('Server error'))
    renderEarningsPage()
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
  })
})

describe('T-EARN-R04: New Pattern form creates a pattern', () => {
  it('opens form on "New Pattern" click', async () => {
    getEarningPatterns.mockResolvedValue([])
    renderEarningsPage()
    await waitFor(() => expect(screen.getByText(/no earning patterns/i)).toBeInTheDocument())
    fireEvent.click(screen.getByText('New Pattern'))
    expect(screen.getByPlaceholderText(/standard straight line/i)).toBeInTheDocument()
  })

  it('calls createEarningPattern and adds pattern to list', async () => {
    getEarningPatterns.mockResolvedValue([])
    createEarningPattern.mockResolvedValue(STRAIGHT_LINE_PATTERN)
    renderEarningsPage()
    await waitFor(() => screen.getByText('New Pattern'))

    fireEvent.click(screen.getByText('New Pattern'))
    fireEvent.change(screen.getByPlaceholderText(/standard straight line/i), {
      target: { value: 'Standard Straight Line' },
    })
    fireEvent.click(screen.getByText('Create Pattern'))

    await waitFor(() => expect(createEarningPattern).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Standard Straight Line', patternType: 'straight_line' }),
    ))
    await waitFor(() => expect(screen.getByText('Standard Straight Line')).toBeInTheDocument())
  })
})

describe('T-EARN-R06: Deactivate pattern removes it from list', () => {
  it('removes pattern row after deactivation', async () => {
    getEarningPatterns.mockResolvedValue([STRAIGHT_LINE_PATTERN])
    deactivateEarningPattern.mockResolvedValue(undefined)
    renderEarningsPage()

    await waitFor(() => screen.getByText('Standard Straight Line'))
    fireEvent.click(screen.getByLabelText(/Deactivate Standard Straight Line/i))

    await waitFor(() => expect(screen.queryByText('Standard Straight Line')).not.toBeInTheDocument())
    expect(deactivateEarningPattern).toHaveBeenCalledWith(1)
  })
})

describe('T-EARN-R07: Rules tab shows rules list', () => {
  it('shows rules after switching to Rules tab', async () => {
    getEarningPatterns.mockResolvedValue([STRAIGHT_LINE_PATTERN])
    getEarningRules.mockResolvedValue([SAMPLE_RULE])
    renderEarningsPage()

    await waitFor(() => screen.getByText('Standard Straight Line'))
    fireEvent.click(screen.getByRole('button', { name: /rules/i }))

    await waitFor(() => expect(screen.getByText('Property')).toBeInTheDocument())
    expect(screen.getByText('Standard Straight Line')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // priority
  })

  it('shows empty state when no rules exist', async () => {
    getEarningPatterns.mockResolvedValue([STRAIGHT_LINE_PATTERN])
    getEarningRules.mockResolvedValue([])
    renderEarningsPage()
    fireEvent.click(screen.getByRole('button', { name: /rules/i }))
    await waitFor(() => expect(screen.getByText(/no earning rules configured/i)).toBeInTheDocument())
  })
})

describe('T-EARN-R09: Deactivate rule removes it from list', () => {
  it('removes rule row after deactivation', async () => {
    getEarningPatterns.mockResolvedValue([STRAIGHT_LINE_PATTERN])
    getEarningRules.mockResolvedValue([SAMPLE_RULE])
    deactivateEarningRule.mockResolvedValue(undefined)
    renderEarningsPage()

    fireEvent.click(screen.getByRole('button', { name: /rules/i }))
    await waitFor(() => screen.getByText('Property'))

    fireEvent.click(screen.getByLabelText(/Deactivate rule 1/i))

    await waitFor(() => expect(screen.queryByText('Property')).not.toBeInTheDocument())
    expect(deactivateEarningRule).toHaveBeenCalledWith(1)
  })
})
