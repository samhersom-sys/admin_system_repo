/**
 * WorkspaceContext — multi-workspace (side-by-side) session tracking.
 *
 * Each workspace tracks the active browser path so the panel can show
 * "Policy Details", "Quotes", etc.  State is persisted to localStorage
 * so workspaces survive a page refresh.
 *
 * The WorkspaceProvider must be rendered INSIDE the React Router tree
 * (already satisfied since it lives inside AppLayout → Outlet).
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

// ─── Route → title map ──────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/app-home': 'Home',
  '/search': 'Search',
  '/submissions': 'Submissions',
  '/quotes': 'Quotes',
  '/policies': 'Policies',
  '/claims': 'Claims',
  '/binding-authorities': 'Binding Authorities',
  '/parties': 'Parties',
  '/finance': 'Finance',
  '/reports': 'Reporting',
  '/settings': 'Settings',
  '/profile': 'My Profile',
}

export function getPageTitle(path: string): string {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path]
  if (path.startsWith('/submissions/')) return 'Submission Details'
  if (path.startsWith('/quotes/')) return 'Quote Details'
  if (path.startsWith('/policies/')) return 'Policy Details'
  if (path.startsWith('/claims/')) return 'Claim Details'
  if (path.startsWith('/binding-authorities/')) return 'Binding Authority'
  if (path.startsWith('/parties/')) return 'Party Details'
  if (path.startsWith('/finance/')) return 'Finance'
  if (path.startsWith('/reports/')) return 'Report Details'
  if (path.startsWith('/dashboards/')) return 'Dashboard'
  if (path.startsWith('/settings/')) return 'Settings'
  return 'PolicyForge'
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Workspace {
  id: string
  name: string
  path: string
  lastActive: string  // ISO date string
}

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  addWorkspace: () => void
  switchWorkspace: (id: string) => void
  closeWorkspace: (id: string) => void
  renameWorkspace: (id: string, name: string) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ─── LocalStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'pf_workspaces'

function loadFromStorage(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Workspace[]
  } catch { /* ignore parse errors */ }
  return []
}

function saveToStorage(ws: Workspace[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ws)) } catch { /* ignore */ }
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const stored = loadFromStorage()
    if (stored.length > 0) return stored
    return [{
      id: makeId(),
      name: 'Workspace 1',
      path: location.pathname,
      lastActive: new Date().toISOString(),
    }]
  })

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => workspaces[0]?.id ?? null,
  )

  // Update active workspace's path and lastActive on every navigation
  const prevPath = useRef<string | null>(null)
  useEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname
    setWorkspaces(prev => {
      const updated = prev.map(w =>
        w.id === activeWorkspaceId
          ? { ...w, path: location.pathname, lastActive: new Date().toISOString() }
          : w,
      )
      saveToStorage(updated)
      return updated
    })
  }, [location.pathname, activeWorkspaceId])

  function addWorkspace() {
    const newWs: Workspace = {
      id: makeId(),
      name: `Workspace ${workspaces.length + 1}`,
      path: location.pathname,
      lastActive: new Date().toISOString(),
    }
    setWorkspaces(prev => {
      const updated = [...prev, newWs]
      saveToStorage(updated)
      return updated
    })
    setActiveWorkspaceId(newWs.id)
  }

  function switchWorkspace(id: string) {
    setActiveWorkspaceId(id)
    setWorkspaces(prev => {
      const updated = prev.map(w =>
        w.id === id ? { ...w, lastActive: new Date().toISOString() } : w,
      )
      saveToStorage(updated)
      return updated
    })
  }

  function closeWorkspace(id: string) {
    setWorkspaces(prev => {
      const updated = prev.filter(w => w.id !== id)
      saveToStorage(updated)
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(updated.slice(-1)[0]?.id ?? null)
      }
      return updated
    })
  }

  function renameWorkspace(id: string, name: string) {
    setWorkspaces(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, name } : w)
      saveToStorage(updated)
      return updated
    })
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspaceId,
      addWorkspace,
      switchWorkspace,
      closeWorkspace,
      renameWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
