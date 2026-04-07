/**
 * TESTS — Settings: Data Quality Settings Page
 * Second artifact. Requirements: settings.requirements.md §3d
 * Test naming: T-SETTINGS-DQUALITY-R{NN}
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// API CONTRACT ALIGNMENT (verified 2026-04-04 against real backend):
//   GET /api/settings/data-quality → DQSettings (no .data wrapper)
//   PUT /api/settings/data-quality → DQSettings

jest.mock('@/shared/lib/api-client/api-client', () => ({
  get: jest.fn(),
  put: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  getSession: jest.fn(() => ({
    token: 'tok',
    user: { id: 1, email: 'admin@example.com', orgCode: 'ORG-001', role: 'client_admin' },
  })),
}))

jest.mock('@/shell/NotificationDock', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
  useSidebarSection: jest.fn(),
}))

const mockAddNotification = jest.fn()

import * as apiClient from '@/shared/lib/api-client/api-client'

const MOCK_DQ_SETTINGS = {
  enableBASectionDateValidation: true,
  enableQuoteMandatoryFields: false,
  enablePolicyMandatoryFields: true,
  excludeDraftStatus: false,
  severityThreshold: 'medium',
  autoCheckOnSave: true,
  emailNotifications: false,
  notificationEmail: '',
}

function renderDataQualityPage() {
  const { default: DataQualitySettingsPage } = require('../DataQualitySettingsPage')
  return render(
    <MemoryRouter>
      <DataQualitySettingsPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockResolvedValue(MOCK_DQ_SETTINGS);
  (apiClient.put as jest.Mock).mockResolvedValue(MOCK_DQ_SETTINGS)
})

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

describe('T-settings-dquality-R01: loads settings from API and Save calls PUT', () => {
  it('calls GET /api/settings/data-quality on mount', async () => {
    renderDataQualityPage()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/data-quality')
    })
  })

  it('calls PUT /api/settings/data-quality and shows toast on Save', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    const saveBtn = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/settings/data-quality',
        expect.any(Object)
      )
    })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/settings saved/i),
        'success'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Validation Rules toggles
// ---------------------------------------------------------------------------

describe('T-settings-dquality-R02: Validation Rules card shows four toggles', () => {
  it('renders all four validation rule toggles', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    expect(screen.getByLabelText(/enable ba section date validation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable quote mandatory fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable policy mandatory fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/exclude draft status/i)).toBeInTheDocument()
  })

  it('pre-populates toggles from loaded settings', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    const baToggle = screen.getByLabelText(/enable ba section date validation/i) as HTMLInputElement
    expect(baToggle.checked).toBe(true)

    const quoteMandatory = screen.getByLabelText(/enable quote mandatory fields/i) as HTMLInputElement
    expect(quoteMandatory.checked).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Severity Settings
// ---------------------------------------------------------------------------

describe('T-settings-dquality-R03: Severity Settings card has threshold dropdown', () => {
  it('renders the Severity Threshold dropdown with options low / medium / high', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    const select = screen.getByRole('combobox', { name: /severity threshold/i }) as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toContain('low')
    expect(options).toContain('medium')
    expect(options).toContain('high')
  })

  it('pre-selects "medium" from loaded settings', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    const select = screen.getByRole('combobox', { name: /severity threshold/i }) as HTMLSelectElement
    expect(select.value).toBe('medium')
  })
})

// ---------------------------------------------------------------------------
// Monitoring — conditional email input
// ---------------------------------------------------------------------------

describe('T-settings-dquality-R04: Notification Email input hidden when emailNotifications is off', () => {
  it('hides Notification Email input when emailNotifications is false', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    // emailNotifications is false in mock data
    expect(screen.queryByLabelText(/notification email/i)).not.toBeInTheDocument()
  })

  it('shows Notification Email input after enabling Email Notifications toggle', async () => {
    renderDataQualityPage()
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    const emailNotifToggle = screen.getByLabelText(/email notifications/i)
    await userEvent.click(emailNotifToggle)

    expect(screen.getByLabelText(/notification email/i)).toBeInTheDocument()
  })
})
