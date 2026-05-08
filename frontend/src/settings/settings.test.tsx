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

const { getMeasures, createMeasure, deactivateMeasure } = jest.requireMock('./settings.service')

// ---------------------------------------------------------------------------
// Tile grid — role visibility
// ---------------------------------------------------------------------------

describe('T-SETTINGS-GRID-R01: tiles shown to client_admin', () => {
  it('renders all six standard tiles for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
  })

  it('does NOT render Module Licensing tile for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.queryByText('Module Licensing')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-GRID-R02: tiles shown to internal_admin', () => {
  it('renders all seven tiles including Module Licensing and Dashboard & Reporting for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
    expect(screen.getByText('Module Licensing')).toBeInTheDocument()
    expect(screen.getByText('Dashboard & Reporting')).toBeInTheDocument()
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
    getMeasures.mockReturnValue(new Promise(() => {}))
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
