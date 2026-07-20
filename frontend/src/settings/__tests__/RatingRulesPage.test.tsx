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
  useNotifications: () => ({ addNotification: mockAddNotification, removeNotification: mockRemoveNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
  useSidebarSection: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockAddNotification = jest.fn()
const mockRemoveNotification = jest.fn()
const mockNavigate = jest.fn()

import * as apiClient from '@/shared/lib/api-client/api-client'

const MOCK_SCHEDULES = [
  { id: 1, name: 'Property Standard 2026', effective_date: '2026-01-01', effective_time: '00:00', expiry_date: '2026-12-31', expiry_time: '23:59', is_active: true },
  { id: 2, name: 'Marine Basic', effective_date: '2025-06-01', effective_time: '00:00', expiry_date: null, expiry_time: null, is_active: false },
]

const MOCK_RULES = [
  // Group 1: UK Rules
  { id: 10, group_number: 1, group_name: 'UK Rules', sequence_in_group: 1, logical_operator: null, field_name: 'country', operator: '=', field_value: 'UK', rate_percentage: 1.5 },
  { id: 11, group_number: 1, group_name: 'UK Rules', sequence_in_group: 2, logical_operator: 'AND', field_name: 'sum_insured', operator: '>', field_value: '1000000', rate_percentage: 1.5 },
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

  it('renders the Name, Effective From, Effective To, Status columns', async () => {
    renderRatingRulesPage()
    await waitFor(() => {
      expect(screen.getByText(/effective from/i)).toBeInTheDocument()
      expect(screen.getByText(/effective to/i)).toBeInTheDocument()
      expect(screen.getByText(/status/i)).toBeInTheDocument()
    })
  })
})

describe('T-settings-rating-R03: open-schedule magnifying glass navigates to detail page', () => {
  it('navigates to /settings/rating-rules/:id when magnifying glass is clicked', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    const openButtons = screen.getAllByRole('button', { name: /open schedule/i })
    await userEvent.click(openButtons[0])

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/rating-rules/1')
    })
  })
})

// ---------------------------------------------------------------------------
// RatingRulesDetailPage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T-settings-rating-R07: Detail page — dates are editable (REQ-SETTINGS-RATING-F-014)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R07: detail page effective dates are editable date inputs', () => {
  it('renders an editable date input for Effective From', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    const input = screen.getByLabelText(/^effective from$/i) as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.type).toBe('date')
  })

  it('renders an editable date input for Expiry Date', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    const input = screen.getByLabelText(/expiry date/i) as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.type).toBe('date')
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R08: Detail page — sidebar Save (REQ-SETTINGS-RATING-F-016)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R08: detail page registers sidebar section', () => {
  it('calls useSidebarSection with Rating Rules title', async () => {
    const { useSidebarSection } = require('@/shell/SidebarContext')
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(useSidebarSection).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rating Profiles' })
    )
  })
})

// ---------------------------------------------------------------------------
// RatingRulesDetailPage — existing tests
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

describe('T-settings-rating-R05: rules table displays groups and add buttons', () => {
  it('displays existing group name in the table', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      expect(screen.getByDisplayValue('UK Rules')).toBeInTheDocument()
    })
  })

  it('renders an "Add group" FiPlus button in the rules table header', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument()
  })
})

describe('T-settings-rating-R06: sidebar Save triggers PUT on the schedule', () => {
  it('calls PUT /api/rating-schedules/:id and shows toast on success', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))

    window.dispatchEvent(new CustomEvent('rating-schedule:save'))

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/rating-schedules/1',
        expect.any(Object)
      )
    })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/profile saved/i),
        'success'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R10: Sidebar section on list page (REQ-SETTINGS-RATING-F-011)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R10: list page registers Rating Rules sidebar section', () => {
  it('calls useSidebarSection with Rating Rules title', async () => {
    const { useSidebarSection } = require('@/shell/SidebarContext')
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))
    expect(useSidebarSection).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rating Profiles' })
    )
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R11: Unsaved changes banner (REQ-SETTINGS-RATING-F-012)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R11: unsaved changes banner', () => {
  it('T-settings-rating-R11a: shows warning notification when inline row has a name entered', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'Test')

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/unsaved changes/i),
        'warning',
        expect.objectContaining({ id: 'rating-unsaved' })
      )
    })
  })

  it('T-settings-rating-R11b: removes warning notification when inline row is cancelled', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'Test')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(mockRemoveNotification).toHaveBeenCalledWith('rating-unsaved')
    })
  })

  it('T-settings-rating-R11c: pushes the unsaved warning only once for multiple edits', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'Many characters typed here')

    const unsavedCalls = mockAddNotification.mock.calls.filter(
      (call: unknown[]) => (call[2] as { id?: string } | undefined)?.id === 'rating-unsaved'
    )
    expect(unsavedCalls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R27: inline create tick (green check) — REQ-SETTINGS-RATING-F-009
// ---------------------------------------------------------------------------

describe('T-settings-rating-R27: inline create tick creates schedule and opens detail', () => {
  it('T-settings-rating-R27a: clicking the green tick posts and navigates to the new detail page', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'New Profile')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/rating-schedules',
        expect.objectContaining({ name: 'New Profile' })
      )
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/rating-rules/99')
    })
  })

  it('T-settings-rating-R27b: surfaces an error notification and does not navigate when creation fails', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Server error'))
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'New Profile')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/server error|failed to create/i),
        'error'
      )
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R28: Effective To defaulting behavior
// ---------------------------------------------------------------------------

describe('T-settings-rating-R28: inline date defaults', () => {
  it('T-settings-rating-R28a: defaults Effective To to Effective From + 1 year', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    const effectiveFrom = screen.getByLabelText(/effective from/i) as HTMLInputElement
    const effectiveTo = screen.getByLabelText(/effective to/i) as HTMLInputElement

    await userEvent.clear(effectiveFrom)
    await userEvent.type(effectiveFrom, '2025-07-23')

    expect(effectiveTo.value).toBe('2026-07-23')
  })

  it('T-settings-rating-R28b: preserves manually edited Effective To when Effective From changes again', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    const effectiveFrom = screen.getByLabelText(/effective from/i) as HTMLInputElement
    const effectiveTo = screen.getByLabelText(/effective to/i) as HTMLInputElement

    await userEvent.clear(effectiveFrom)
    await userEvent.type(effectiveFrom, '2025-07-23')
    await userEvent.clear(effectiveTo)
    await userEvent.type(effectiveTo, '2026-12-31')
    await userEvent.clear(effectiveFrom)
    await userEvent.type(effectiveFrom, '2025-08-01')

    expect(effectiveTo.value).toBe('2026-12-31')
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R12: Edit pencil navigates (REQ-SETTINGS-RATING-F-013)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R12: open schedule magnifying glass navigates to detail page', () => {
  it('clicking the magnifying glass on a row navigates to /settings/rating-rules/:id', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    const openButtons = screen.getAllByRole('button', { name: /open schedule/i })
    await userEvent.click(openButtons[0])

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/rating-rules/1')
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R17: ID column in list page (REQ-SETTINGS-RATING-F-019)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R17: schedule ID column in list page', () => {
  it('renders an ID column header', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))
    expect(screen.getByRole('columnheader', { name: /^id$/i })).toBeInTheDocument()
  })

  it('displays schedule IDs in the table rows', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R18: detail page shows schedule ID (REQ-SETTINGS-RATING-F-020)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R18: detail page shows schedule ID in metadata card', () => {
  it('renders a "Schedule ID" label', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(screen.getByText(/schedule id/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R19: detail page title shows schedule name (REQ-SETTINGS-RATING-F-021)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R19: detail page title shows "Rating Profile: {name}"', () => {
  it('renders "Rating Profile: {schedule name}" as the page h2 heading', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Rating Profile: Property Standard 2026')
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R20: detail page has no in-page back arrow (REQ-SETTINGS-RATING-F-022)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R20: detail page has no in-page back arrow button', () => {
  it('does not render a back navigation button on the page', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R21: detail page has no page-level Save button (REQ-SETTINGS-RATING-F-023)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R21: detail page has no in-page Save button', () => {
  it('does not render a standalone Save button in the page body', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R22: group-based table renders groups (REQ-SETTINGS-RATING-F-024)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R22: group-based table renders from API', () => {
  it('shows group name input populated from API', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      expect(screen.getByDisplayValue('UK Rules')).toBeInTheDocument()
    })
  })

  it('shows group rate input populated from API', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      // rate_percentage 1.5 renders as 1.500000 (6dp) in the group rate input
      expect(screen.getAllByDisplayValue('1.500000').length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R23: Ratable Factor dropdown options (REQ-SETTINGS-RATING-F-025)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R23: Ratable Factor dropdown contains correct options', () => {
  it('renders a Ratable Factor select with section and coverage-detail options', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      const fieldSelects = screen.getAllByRole('combobox', { name: /ratable factor/i })
      expect(fieldSelects.length).toBeGreaterThanOrEqual(1)
    })
    const allOptions = screen.getAllByRole('option', { name: 'Section: Class of Business' })
    expect(allOptions.length).toBeGreaterThanOrEqual(1)
    const postcodeOptions = screen.getAllByRole('option', { name: 'Coverage Detail: Coverage Type' })
    expect(postcodeOptions.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R24: Operator dropdown options (REQ-SETTINGS-RATING-F-026)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R24: Operator dropdown contains correct options', () => {
  it('renders Operator selects with Equals and Starts With options', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      const equalsOptions = screen.getAllByRole('option', { name: 'Equals' })
      expect(equalsOptions.length).toBeGreaterThanOrEqual(1)
      const swOptions = screen.getAllByRole('option', { name: 'Starts With' })
      expect(swOptions.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R25: Logic column IF/AND/OR (REQ-SETTINGS-RATING-F-027)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R25: Logic column shows IF for first condition', () => {
  it('shows IF badge for the first condition in a group', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      expect(screen.getByText('IF')).toBeInTheDocument()
    })
  })

  it('shows AND/OR select for the second condition in a group', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))
    await waitFor(() => {
      const logicSelects = screen.getAllByRole('combobox', { name: /logical operator/i })
      expect(logicSelects.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R26: Add Group button (REQ-SETTINGS-RATING-F-028)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R26: Add Group button appends a new group', () => {
  it('adds a new group when Add group is clicked', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))

    const beforeCount = screen.getAllByRole('button', { name: /add condition/i }).length
    await userEvent.click(screen.getByRole('button', { name: /add group/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /add condition/i }).length).toBeGreaterThan(beforeCount)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R27: Add Condition button (REQ-SETTINGS-RATING-F-029)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R27: Add Condition button appends condition to group', () => {
  it('adds a condition row when Add condition is clicked', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))

    const beforeCount = screen.getAllByRole('combobox', { name: /ratable factor/i }).length
    await userEvent.click(screen.getAllByRole('button', { name: /add condition/i })[0])

    await waitFor(() => {
      expect(screen.getAllByRole('combobox', { name: /ratable factor/i }).length).toBeGreaterThan(beforeCount)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R28: Delete buttons (REQ-SETTINGS-RATING-F-030)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R28: Delete group and delete condition buttons', () => {
  it('removes the group when Delete group is clicked', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('UK Rules'))

    await userEvent.click(screen.getByRole('button', { name: /delete group/i }))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('UK Rules')).not.toBeInTheDocument()
    })
  })

  it('removes a condition when Delete condition is clicked', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Standard 2026'))

    // Two conditions in mock data → two delete condition buttons
    const beforeCount = screen.getAllByRole('button', { name: /delete condition/i }).length
    await userEvent.click(screen.getAllByRole('button', { name: /delete condition/i })[0])

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete condition/i }).length).toBeLessThan(beforeCount)
    })
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R29/R30: Ordering buttons (REQ-SETTINGS-RATING-F-031)
// ---------------------------------------------------------------------------

describe('T-settings-rating-R29: Move group up/down buttons are rendered', () => {
  it('renders Move group up and Move group down buttons on a group header', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('UK Rules'))
    expect(screen.getAllByRole('button', { name: /move group up/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /move group down/i }).length).toBeGreaterThanOrEqual(1)
  })
})

describe('T-settings-rating-R30: Move condition up/down buttons are rendered', () => {
  it('renders Move condition up and Move condition down buttons on condition rows', async () => {
    renderRatingRulesDetailPage('1')
    await waitFor(() => screen.getByDisplayValue('UK Rules'))
    expect(screen.getAllByRole('button', { name: /move condition up/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /move condition down/i }).length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// T-settings-rating-R09: Create New Schedule — REQ-SETTINGS-RATING-F-009
// ---------------------------------------------------------------------------

describe('T-settings-rating-R09: Create New Schedule', () => {
  const NEW_SCHEDULE = { id: 99, name: 'New Test Schedule', effective_date: null, expiry_date: null, is_active: true }

  beforeEach(() => {
    (apiClient.post as jest.Mock).mockResolvedValue(NEW_SCHEDULE)
  })

  it('T-settings-rating-R09a: renders an "Add schedule" button in the grid header', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))
    expect(screen.getByRole('button', { name: /add schedule/i })).toBeInTheDocument()
  })

  it('T-settings-rating-R09b: clicking the add button shows an inline create row with date fields', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))

    expect(screen.getByRole('textbox', { name: /schedule name/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/effective from/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/effective to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('T-settings-rating-R09c: confirming the inline row calls POST /api/rating-schedules with name', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'New Test Schedule')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/rating-schedules',
        expect.objectContaining({ name: 'New Test Schedule' }),
      )
    })
  })

  it('T-settings-rating-R09d: on success navigates to the new schedule detail page', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /schedule name/i }), 'New Test Schedule')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/rating-rules/99')
    })
  })

  it('T-settings-rating-R09e: Create button is disabled when name field is empty', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))

    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('T-settings-rating-R09f: Cancel button hides the inline create row', async () => {
    renderRatingRulesPage()
    await waitFor(() => screen.getByText('Property Standard 2026'))

    await userEvent.click(screen.getByRole('button', { name: /add schedule/i }))
    expect(screen.getByRole('textbox', { name: /schedule name/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('textbox', { name: /schedule name/i })).not.toBeInTheDocument()
  })
})
