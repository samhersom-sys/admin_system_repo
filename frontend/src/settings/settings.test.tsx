/**
 * TESTS — Settings Page tile grid & Platform Admin Panel
 *
 * Requirements: settings.requirements.md
 * Test IDs: T-SETTINGS-GRID-R* / T-SETTINGS-ADMIN-R*
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from './index'
import PlatformAdminPanel from './PlatformAdminPanel'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockRole = ''

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  getSession: () => ({
    token: 'tok',
    user: { id: '1', email: 'a@b.com', name: 'Test User', orgCode: 'TST', role: mockRole },
  }),
}))

// Wrap in MemoryRouter since tiles use <Link> / navigate
function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tile grid — role visibility
// ---------------------------------------------------------------------------

describe('T-SETTINGS-GRID-R01: tiles shown to client_admin', () => {
  it('renders all five standard tiles for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
  })

  it('does NOT render Module Licensing tile for client_admin', () => {
    mockRole = 'client_admin'
    renderSettings()
    expect(screen.queryByText('Module Licensing')).not.toBeInTheDocument()
  })
})

describe('T-SETTINGS-GRID-R02: tiles shown to internal_admin', () => {
  it('renders all six tiles including Module Licensing for internal_admin', () => {
    mockRole = 'internal_admin'
    renderSettings()
    expect(screen.getByText('Account Administration')).toBeInTheDocument()
    expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    expect(screen.getByText('Organisation Configuration')).toBeInTheDocument()
    expect(screen.getByText('Rating Rules')).toBeInTheDocument()
    expect(screen.getByText('Data Quality Configuration')).toBeInTheDocument()
    expect(screen.getByText('Module Licensing')).toBeInTheDocument()
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
      name: /ClaimsPro TPA — Bordereau Import/i,
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
      name: /Allied Insurance Group — Binding Authorities/i,
    })
    const brCheckbox = screen.getByRole('checkbox', {
      name: /Allied Insurance Group — Bordereau Import/i,
    })
    expect(brCheckbox).toBeChecked()
    fireEvent.click(baCheckbox)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /"Bordereau Import" was also disabled/
    )
    expect(brCheckbox).not.toBeChecked()
  })
})

