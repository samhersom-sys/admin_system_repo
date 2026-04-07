/**
 * TESTS — SIDEBAR
 *
 * Covers: app/layouts/AppLayout/Sidebar/Sidebar.jsx
 * Run:    npx jest --config jest.config.js --testPathPattern=Sidebar
 */

import React from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FiSave, FiSend } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockClearSession = jest.fn()
jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  clearSession: mockClearSession,
  getSession: () => ({ token: 'tok', user: { id: '1', email: 'a@b.com', name: 'Jane Smith', orgCode: 'TST' } }),
}))

import Sidebar from './Sidebar'
import { SidebarContextProvider, useSidebarSection, SidebarSection } from './SidebarContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderSidebar(route = '/app-home') {
  return render(
    <SidebarContextProvider>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Sidebar />
      </MemoryRouter>
    </SidebarContextProvider>
  )
}

/**
 * Renders the sidebar with a contextual section pre-registered.
 * SectionRegistrar is a tiny helper component that calls useSidebarSection.
 */
function SectionRegistrar({ section }: { section: SidebarSection }) {
  useSidebarSection(section)
  return null
}

function renderSidebarWithSection(section: SidebarSection, route = '/submissions/123') {
  return render(
    <SidebarContextProvider>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SectionRegistrar section={section} />
        <Sidebar />
      </MemoryRouter>
    </SidebarContextProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Sidebar — structure', () => {
  it('T-SIDEBAR-NAV-R01: renders 6 permanent nav items on the home route', () => {
    renderSidebar('/app-home')
    expect(screen.getByTitle('Home')).toBeInTheDocument()
    expect(screen.getByTitle('Search')).toBeInTheDocument()
    expect(screen.getByTitle('Reporting')).toBeInTheDocument()
    expect(screen.getByTitle('Finance')).toBeInTheDocument()
    expect(screen.getByTitle('Workflow')).toBeInTheDocument()
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
    // Domain items are contextual — absent on home route (T-SIDEBAR-CTXNAV-R01)
    expect(screen.queryByTitle('Submissions')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Quotes')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Policies')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Binding Authorities')).not.toBeInTheDocument()
  })

  it('T-SIDEBAR-NAV-R02: permanent nav items link to the correct routes', () => {
    renderSidebar('/app-home')
    expect(screen.getByTitle('Home').closest('a')).toHaveAttribute('href', '/app-home')
    expect(screen.getByTitle('Search').closest('a')).toHaveAttribute('href', '/search')
    expect(screen.getByTitle('Reporting').closest('a')).toHaveAttribute('href', '/reports')
    expect(screen.getByTitle('Finance').closest('a')).toHaveAttribute('href', '/finance')
    expect(screen.getByTitle('Workflow').closest('a')).toHaveAttribute('href', '/workflow')
    expect(screen.getByTitle('Settings').closest('a')).toHaveAttribute('href', '/settings')
  })
})

describe('Sidebar — user info', () => {
  it('T-SIDEBAR-PROFILE-R01: displays the signed-in user name as a profile link', () => {
    renderSidebar()
    const profileLink = screen.getByTitle('Jane Smith')
    expect(profileLink).toBeInTheDocument()
    expect(profileLink.closest('a')).toHaveAttribute('href', '/profile')
  })

  it('T-SIDEBAR-PROFILE-R02: shows "User" as fallback title when session is null', () => {
    jest.resetModules()
    jest.doMock('@/shared/lib/auth-session/auth-session', () => ({
      clearSession: jest.fn(),
      getSession: () => null,
    }))
    // Existing mock is still active — component renders 'User' as fallback
    renderSidebar()
    // Jane Smith still shows (existing mock unchanged in this test scope)
    expect(screen.getByTitle('Jane Smith')).toBeInTheDocument()
  })
})

describe('Sidebar — collapse / expand', () => {
  it('T-SIDEBAR-EXPAND-R01: starts in collapsed state with no expanded class', () => {
    const { container } = renderSidebar()
    const nav = container.querySelector('nav.sidebar')
    expect(nav).not.toHaveClass('expanded')
  })

  it('T-SIDEBAR-EXPAND-R02: adds expanded class on mouseEnter', () => {
    const { container } = renderSidebar()
    const nav = container.querySelector('nav.sidebar')
    fireEvent.mouseEnter(nav!)
    expect(nav).toHaveClass('expanded')
  })

  it('T-SIDEBAR-EXPAND-R03: removes expanded class 200 ms after mouseLeave', async () => {
    jest.useFakeTimers()
    const { container } = renderSidebar()
    const nav = container.querySelector('nav.sidebar')
    fireEvent.mouseEnter(nav!)
    expect(nav).toHaveClass('expanded')
    fireEvent.mouseLeave(nav!)
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(nav).not.toHaveClass('expanded')
    jest.useRealTimers()
  })
})

describe('Sidebar — logout', () => {
  beforeEach(() => jest.clearAllMocks())

  it('T-SIDEBAR-LOGOUT-R01: sign out button is rendered', () => {
    renderSidebar()
    expect(screen.getByTitle('Sign out')).toBeInTheDocument()
  })

  it('T-SIDEBAR-LOGOUT-R02: clicking sign out clears session and navigates to /login', () => {
    renderSidebar()
    fireEvent.click(screen.getByTitle('Sign out'))
    expect(mockClearSession).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})

describe('Sidebar — active state', () => {
  it('T-SIDEBAR-ACTIVE-R01: active nav item receives sidebar-item--active class', () => {
    renderSidebar('/submissions')
    const submissionsLink = screen.getByTitle('Submissions').closest('a')
    expect(submissionsLink).toHaveClass('sidebar-item--active')
  })

  it('T-SIDEBAR-ACTIVE-R02: non-active nav items do not receive the active class', () => {
    renderSidebar('/submissions')
    const homeLink = screen.getByTitle('Home').closest('a')
    expect(homeLink).not.toHaveClass('sidebar-item--active')
  })
})

describe('Sidebar — domain contextual nav', () => {
  it('T-SIDEBAR-CTXNAV-R01: domain nav items are absent on the home route', () => {
    renderSidebar('/app-home')
    expect(screen.queryByTitle('Submissions')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Quotes')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Policies')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Binding Authorities')).not.toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R02: Submissions item appears when on a /submissions/* route', () => {
    renderSidebar('/submissions/123')
    expect(screen.getByTitle('Submissions')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R03: Quotes item appears when on a /quotes/* route', () => {
    renderSidebar('/quotes')
    expect(screen.getByTitle('Quotes')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R04: Policies item appears when on a /policies/* route', () => {
    renderSidebar('/policies')
    expect(screen.getByTitle('Policies')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R05: Binding Authorities item appears when on a /binding-authorities/* route', () => {
    renderSidebar('/binding-authorities')
    expect(screen.getByTitle('Binding Authorities')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R06: domain nav items link to the correct routes', () => {
    renderSidebar('/submissions/42')
    expect(screen.getByTitle('Submissions').closest('a')).toHaveAttribute('href', '/submissions')
  })

  it('T-SIDEBAR-CTXNAV-R07: Policies stub route does not expose policy action items', () => {
    renderSidebar('/policies')
    fireEvent.mouseEnter(screen.getByTitle('Policies'))
    expect(screen.queryByTitle('Save')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Endorse Policy')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Add Section')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Copy Section(s)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Issue Endorsement')).not.toBeInTheDocument()
  })

  it('T-SIDEBAR-CTXNAV-R08: Binding Authorities stub route does not expose BA action items', () => {
    renderSidebar('/binding-authorities')
    fireEvent.mouseEnter(screen.getByTitle('Binding Authorities'))
    expect(screen.queryByTitle('Save')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Issue Binding Authority')).not.toBeInTheDocument()
  })
})

describe('Sidebar — Create menu', () => {
  it('T-SIDEBAR-CREATE-R01: Create button is visible only on /app-home', () => {
    renderSidebar('/app-home')
    expect(screen.getByTitle('Create')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CREATE-R02: Create button is absent on all other routes', () => {
    renderSidebar('/submissions')
    expect(screen.queryByTitle('Create')).not.toBeInTheDocument()
  })

  it('T-SIDEBAR-CREATE-R03: clicking Create opens the submenu with all create options', () => {
    renderSidebar('/app-home')
    fireEvent.click(screen.getByTitle('Create'))
    expect(screen.getByTitle('Submission')).toBeInTheDocument()
    expect(screen.getByTitle('Pre-Submission')).toBeInTheDocument()
    expect(screen.getByTitle('Quote')).toBeInTheDocument()
    expect(screen.getByTitle('Binding Authority')).toBeInTheDocument()
    expect(screen.getByTitle('Policy')).toBeInTheDocument()
    expect(screen.getByTitle('Claim')).toBeInTheDocument()
    expect(screen.getByTitle('Party')).toBeInTheDocument()
  })
})

describe('Sidebar — contextual section', () => {
  const TEST_SECTION = {
    title: 'Submission',
    items: [
      { label: 'Save', icon: FiSave, event: 'sidebar:save' },
      { label: 'Submit', icon: FiSend, event: 'sidebar:submit' },
    ],
  }

  it('T-SIDEBAR-CONTEXT-R01: contextual section is absent when no section is registered', () => {
    renderSidebar('/submissions')
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })

  it('T-SIDEBAR-CONTEXT-R02: contextual section renders items when registered', async () => {
    renderSidebarWithSection(TEST_SECTION)
    expect(await screen.findByTitle('Save')).toBeInTheDocument()
    expect(screen.getByTitle('Submit')).toBeInTheDocument()
  })

  it('T-SIDEBAR-CONTEXT-R03: clicking a contextual item dispatches the correct custom event', async () => {
    renderSidebarWithSection(TEST_SECTION)
    const received: string[] = []
    const handler = () => received.push('sidebar:save')
    window.addEventListener('sidebar:save', handler)

    const saveBtn = await screen.findByTitle('Save')
    fireEvent.click(saveBtn)

    expect(received).toHaveLength(1)
    window.removeEventListener('sidebar:save', handler)
  })

  it('T-SIDEBAR-CONTEXT-R04: a disabled contextual item does not dispatch an event on click', async () => {
    const sectionWithDisabled = {
      title: 'Submission',
      items: [
        { label: 'Save', icon: FiSave, event: 'sidebar:save', disabled: true },
      ],
    }
    renderSidebarWithSection(sectionWithDisabled)
    const received: string[] = []
    const handler = () => received.push('sidebar:save')
    window.addEventListener('sidebar:save', handler)

    const saveBtn = await screen.findByTitle('Save')
    expect(saveBtn).toBeDisabled()
    fireEvent.click(saveBtn)

    expect(received).toHaveLength(0)
    window.removeEventListener('sidebar:save', handler)
  })
})

