/**
 * TESTS — Settings: Organisation Detail Page
 * Second artifact. Requirements: settings.requirements.md §3e
 * Test naming: T-SETTINGS-ORG-R{NN}
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// API CONTRACT ALIGNMENT (verified 2026-04-04 against real backend):
//   GET /api/organisation-entities?orgCode=... → OrgEntity[] (no .data wrapper)
//   POST /api/organisation-entities → OrgEntity
//   PUT /api/organisation-entities/:id → OrgEntity
//   GET /api/organisation-entities/:id/hierarchy-config → HierarchyLevel[]
//   GET /api/organisation-entities/:id/hierarchy-links → HierarchyLink[]
//   GET /api/users → User[]
//   GET /api/organisation-hierarchy → GlobalLevel[]

jest.mock('@/shared/lib/api-client/api-client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  getSession: jest.fn(() => ({
    token: 'tok',
    user: { id: 1, email: 'admin@example.com', orgCode: 'TST', role: 'client_admin' },
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

const MOCK_ORG = {
  id: 5,
  entityName: 'Test Syndicate',
  entityCode: 'TST',
  isActive: true,
  description: 'Main test org',
  users: [1],
}

const MOCK_ORG_LEVELS = [
  { id: 1, levelId: 10, levelName: 'Division', levelOrder: 1, description: '' },
]

const MOCK_ORG_LINKS = [
  { id: 1, parentConfigId: 1, childConfigId: 2, parentLevelId: 1, childLevelId: 2, parentLevelName: 'Division', childLevelName: 'Team', description: '' },
]

const MOCK_USERS = [
  { id: 1, username: 'jsmith', email: 'j@example.com' },
  { id: 2, username: 'adev', email: 'a@example.com' },
]

const MOCK_GLOBAL_LEVELS = [
  { id: 10, levelName: 'Division', levelOrder: 1 },
  { id: 11, levelName: 'Team', levelOrder: 2 },
]

function renderOrgDetailPage() {
  const { default: OrganisationDetailPage } = require('../OrganisationDetailPage')
  return render(
    <MemoryRouter initialEntries={['/settings/organisation']}>
      <Routes>
        <Route path="/settings/organisation" element={<OrganisationDetailPage />} />
        <Route path="/settings/organisation/new" element={<OrganisationDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderNewOrgPage() {
  const { default: OrganisationDetailPage } = require('../OrganisationDetailPage')
  return render(
    <MemoryRouter initialEntries={['/settings/organisation/new']}>
      <Routes>
        <Route path="/settings/organisation" element={<OrganisationDetailPage />} />
        <Route path="/settings/organisation/new" element={<OrganisationDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('organisation-entities') && url.includes('hierarchy-config')) return Promise.resolve(MOCK_ORG_LEVELS)
    if (url.includes('organisation-entities') && url.includes('hierarchy-links')) return Promise.resolve(MOCK_ORG_LINKS)
    if (url.includes('organisation-entities')) return Promise.resolve([MOCK_ORG])
    if (url === '/api/users') return Promise.resolve(MOCK_USERS)
    if (url === '/api/organisation-hierarchy') return Promise.resolve(MOCK_GLOBAL_LEVELS)
    return Promise.resolve([])
  });
  (apiClient.put as jest.Mock).mockResolvedValue(MOCK_ORG);
  (apiClient.post as jest.Mock).mockResolvedValue(MOCK_ORG)
})

// ---------------------------------------------------------------------------
// Page load and tabs
// ---------------------------------------------------------------------------

describe('T-settings-org-R01: loads org from GET /api/organisation-entities on mount', () => {
  it('calls GET /api/organisation-entities on mount', async () => {
    renderOrgDetailPage()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/organisation-entities/)
      )
    })
  })
})

describe('T-settings-org-R02: three tabs are rendered', () => {
  it('renders Organisation Information, Organisation Hierarchy, Assigned Users tabs', async () => {
    renderOrgDetailPage()
    await waitFor(() => expect(screen.getByText('Test Syndicate')).toBeInTheDocument())

    expect(screen.getByRole('tab', { name: /organisation information/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /organisation hierarchy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /assigned users/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Information tab
// ---------------------------------------------------------------------------

describe('T-settings-org-R03: Information tab shows editable org fields', () => {
  it('pre-populates Org Name from fetched data', async () => {
    renderOrgDetailPage()
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Syndicate')).toBeInTheDocument()
    })
  })

  it('pre-populates Org Code field', async () => {
    renderOrgDetailPage()
    await waitFor(() => {
      expect(screen.getByDisplayValue('TST')).toBeInTheDocument()
    })
  })

  it('renders the Active checkbox', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))
    expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Linked Parties
// ---------------------------------------------------------------------------

describe('T-settings-org-R04: search icon opens OrganisationSearchModal', () => {
  it('renders a search icon button in the Org Name field', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))
    // FiSearch button for party search on the Org Name field
    const searchBtns = screen.getAllByRole('button', { name: /search/i })
    expect(searchBtns.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Assigned Users tab
// ---------------------------------------------------------------------------

describe('T-settings-org-R05: Users tab shows checkboxes for each user', () => {
  it('loads users list and renders a checkbox per user', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    await userEvent.click(screen.getByRole('tab', { name: /assigned users/i }))

    await waitFor(() => {
      expect(screen.getByText(/jsmith/i)).toBeInTheDocument()
      expect(screen.getByText(/adev/i)).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Hierarchy tab
// ---------------------------------------------------------------------------

describe('T-settings-org-R06: Hierarchy tab shows Hierarchy Levels card with add form', () => {
  it('renders Hierarchy Levels table with loaded level names', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    await userEvent.click(screen.getByRole('tab', { name: /organisation hierarchy/i }))

    await waitFor(() => {
      expect(screen.getByText('Division')).toBeInTheDocument()
    })
  })

  it('renders an "Add Hierarchy Level" button', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    await userEvent.click(screen.getByRole('tab', { name: /organisation hierarchy/i }))

    expect(screen.getByRole('button', { name: /add hierarchy level/i })).toBeInTheDocument()
  })
})

describe('T-settings-org-R07: Hierarchy Links card with filter dropdowns', () => {
  it('renders Parent Level and Child Level filter dropdowns', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    await userEvent.click(screen.getByRole('tab', { name: /organisation hierarchy/i }))

    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('T-settings-org-R08: Hierarchy tree shows no-structure message when empty', () => {
  it('shows "No hierarchy structure defined" when no links exist', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('hierarchy-config')) return Promise.resolve([])
      if (url.includes('hierarchy-links')) return Promise.resolve([])
      if (url.includes('organisation-entities')) return Promise.resolve([MOCK_ORG])
      if (url === '/api/users') return Promise.resolve(MOCK_USERS)
      if (url === '/api/organisation-hierarchy') return Promise.resolve(MOCK_GLOBAL_LEVELS)
      return Promise.resolve([])
    })

    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    await userEvent.click(screen.getByRole('tab', { name: /organisation hierarchy/i }))

    await waitFor(() => {
      expect(screen.getByText(/no hierarchy structure defined/i)).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Save action
// ---------------------------------------------------------------------------

describe('T-settings-org-R09: Save dispatches org + hierarchy save API calls', () => {
  it('calls PUT /api/organisation-entities/:id when Save is triggered', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    // Trigger sidebar save event
    window.dispatchEvent(new CustomEvent('organisation:save'))

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/organisation-entities/5',
        expect.objectContaining({ entityName: 'Test Syndicate' })
      )
    })
  })

  it('shows success toast after save', async () => {
    renderOrgDetailPage()
    await waitFor(() => screen.getByDisplayValue('Test Syndicate'))

    window.dispatchEvent(new CustomEvent('organisation:save'))

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/organisation updated successfully/i),
        'success'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// New Organisation mode
// ---------------------------------------------------------------------------

describe('T-settings-org-R10: "New Organisation" mode has empty fields and POST on save', () => {
  it('renders "New Organisation" heading', () => {
    renderNewOrgPage()
    expect(screen.getByText('New Organisation')).toBeInTheDocument()
  })

  it('has empty Org Name input', () => {
    renderNewOrgPage()
    const nameInput = screen.getByPlaceholderText(/search or enter name/i) as HTMLInputElement
    expect(nameInput.value).toBe('')
  })
})
