/**
 * TESTS — Settings: Rating Rules Pages
 * Second artifact. Requirements: settings.requirements.md §3b
 * Test naming: T-SETTINGS-RATING-R{NN}
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// API CONTRACT ALIGNMENT (verified 2026-04-04 against real backend):
//   GET /api/rating-schedules → RatingSchedule[] (no .data wrapper)
//   GET /api/rating-schedules/:id → RatingSchedule
//   GET /api/rating-schedules/:id/rules → RatingRule[]
//   PUT /api/rating-schedules/:id → RatingSchedule

jest.mock('@/shared/lib/api-client/api-client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockAddNotification = jest.fn()
const mockNavigate = jest.fn()

import * as apiClient from '@/shared/lib/api-client/api-client'

const MOCK_SCHEDULES = [
  { id: 1, name: 'Property Standard 2026', effective_date: '2026-01-01', expiry_date: '2026-12-31', is_active: true },
  { id: 2, name: 'Marine Basic', effective_date: '2025-06-01', expiry_date: null, is_active: false },
]

const MOCK_RULES = [
  { id: 10, field_name: 'country', operator: '=', field_value: 'UK', rate_percentage: 0.5 },
  { id: 11, field_name: 'sum_insured', operator: '>', field_value: '1000000', rate_percentage: 1.2 },
]

function renderRatingRulesPage() {
  const { default: RatingRulesPage } = require('../RatingRulesPage')
  return render(
    <MemoryRouter initialEntries={['/settings/rating-rules']}>
      <RatingRulesPage />
    </MemoryRouter>
  )
}

function renderRatingRulesDetailPage(id = '1') {
  const { default: RatingRulesDetailPage } = require('../RatingRulesDetailPage')
  return render(
    <MemoryRouter initialEntries={[`/settings/rating-rules/${id}`]}>
      <Routes>
        <Route path="/settings/rating-rules/:id" element={<RatingRulesDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/rating-schedules') return Promise.resolve(MOCK_SCHEDULES)
    if (url.endsWith('/rules')) return Promise.resolve(MOCK_RULES)
    if (url.match(/\/api\/rating-schedules\/\d+$/)) return Promise.resolve(MOCK_SCHEDULES[0])
    return Promise.resolve([])
  });
  (apiClient.put as jest.Mock).mockResolvedValue(MOCK_SCHEDULES[0]);
  (apiClient.post as jest.Mock).mockResolvedValue({ id: 99, field_name: MOCK_RULES[0].field_name, operator: MOCK_RULES[0].operator, field_value: MOCK_RULES[0].field_value, rate_percentage: MOCK_RULES[0].rate_percentage });
  (apiClient.del as jest.Mock).mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// RatingRulesPage
// ---------------------------------------------------------------------------

describe('T-settings-rating-R01: RatingRulesPage accessible to client_admin', () => {
  it('renders without crash for client_admin', async () => {
    renderRatingRulesPage()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/rating-schedules')
    })
  })
})

describe('T-settings-rating-R02: schedules table columns and data', () => {
  it('displays schedule names from the API response', async () => {
    renderRatingRulesPage()
    await waitFor(() => {
      expect(screen.getByText('Property Standard 2026')).toBeInTheDocument()
      expect(screen.getByText('Marine Basic')).toBeInTheDocument()
    })
  })

  it('renders the Name, Effective From, Effective To, Active columns', async () => {
    renderRatingRulesPage()
    await waitFor(() => {
      expect(screen.getByText(/effective from/i)).toBeInTheDocument()
      expect(screen.getByText(/effective to/i)).toBeInTheDocument()
      expect(screen.getByText(/active/i)).toBeInTheDocument()
    })
  })
})

describe('T-settings-rating-R03: clicking a row navigates to detail page', () => {
  it('navigates to /settings/rating-rules/:id on row click', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByText('Property Standard 2026'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/settings/rating-rules/1')
      )
    })
  })
})

// ---------------------------------------------------------------------------
// RatingRulesDetailPage
// ---------------------------------------------------------------------------

describe('T-settings-rating-R04: detail page fetches and shows schedule header', () => {
  it('fetches the schedule by id and pre-populates the name field', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/rating-schedules/1')
    })
    await waitFor(() => {
      expect(screen.getByDisplayValue('Property Standard 2026')).toBeInTheDocument()
    })
  })

  it('fetches rules for the schedule', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/rating-schedules/1/rules')
    })
  })
})

describe('T-settings-rating-R05: rules table columns and add-rule row', () => {
  it('displays existing rules in the table', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => {
      expect(screen.getByText('country')).toBeInTheDocument()
      expect(screen.getByText('sum_insured')).toBeInTheDocument()
    })
  })

  it('renders an "Add Rule" button', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument()
  })
})

describe('T-settings-rating-R06: Save button calls PUT on the schedule', () => {
  it('calls PUT /api/rating-schedules/:id and shows toast on success', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/rating-schedules/1',
        expect.any(Object)
      )
    })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/schedule saved/i),
        'success'
      )
    })
  })
})
