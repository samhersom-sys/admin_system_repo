/**
 * SidebarContext — provides a way for pages to register a contextual action
 * section in the sidebar without the sidebar importing domain logic.
 *
 * Architecture rules (guideline §4.4b):
 *   - No domain imports anywhere in this file.
 *   - Pages dispatch contextual config; sidebar only reads it.
 *   - Actions trigger DOM custom events; the page listens and responds.
 *
 * Usage:
 *
 *   // In AppLayout — wrap all authenticated routes:
 *   <SidebarContextProvider> ... </SidebarContextProvider>
 *
 *   // In a page component — register a contextual section:
 *   import { useSidebarSection } from '@/shell/SidebarContext'
 *   import { FiSave } from 'react-icons/fi'
 *
 *   const SECTION = {
 *     title: 'Submission',
 *     items: [
 *       { label: 'Save', icon: FiSave, event: 'sidebar:save' },
 *     ],
 *   }
 *
 *   export default function SubmissionPage() {
 *     useSidebarSection(SECTION)
 *     ...
 *   }
 *
 *   // In the page — listen for sidebar actions:
 *   useEffect(() => {
 *     const handler = () => saveRecord()
 *     window.addEventListener('sidebar:save', handler)
 *     return () => window.removeEventListener('sidebar:save', handler)
 *   }, [])
 */

import React, { createContext, useContext, useEffect, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SidebarActionItem {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  /** DOM custom event to dispatch. Required unless `to` or `children` is set. */
  event?: string
  /** Route to navigate to. Alternative to `event`. */
  to?: string
  /** Nested sub-menu items. When present, renders as an expandable group. */
  children?: SidebarActionItem[]
  disabled?: boolean
}

export interface SidebarSection {
  title: string
  items: SidebarActionItem[]
}

interface SidebarContextValue {
  section: SidebarSection | null
  setSection: (s: SidebarSection | null) => void
}

// ─── Context ────────────────────────────────────────────────────────────────
const SidebarContext = createContext<SidebarContextValue>({
  section: null,
  setSection: () => { },
})

// ─── Provider ────────────────────────────────────────────────────────────────
/**
 * Wraps authenticated routes so pages can register contextual sidebar sections.
 * Place inside AppLayout, outside <Sidebar> and <Outlet>.
 */
export function SidebarContextProvider({ children }: { children: React.ReactNode }) {
  const [section, setSection] = useState<SidebarSection | null>(null)
  return (
    <SidebarContext.Provider value={{ section, setSection }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ─── Consumer hook (Sidebar reads this) ─────────────────────────────────────
/**
 * Returns the current sidebar section value.
 * Used by <Sidebar> to decide whether to render a contextual section.
 */
export function useSidebarContextValue(): SidebarContextValue {
  return useContext(SidebarContext)
}

// ─── Registration hook (pages call this) ─────────────────────────────────────
/**
 * Registers a contextual sidebar section for the lifetime of the calling
 * component.  Pass a stable reference (module-level constant or useMemo) to
 * avoid unnecessary re-registrations.
 */
export function useSidebarSection(section: SidebarSection | null) {
  const { setSection } = useContext(SidebarContext)

  // Re-register whenever the section reference changes.
  // Callers must pass a stable reference (module-level constant or useMemo)
  // to avoid unnecessary re-registrations on every render.
  useEffect(() => {
    setSection(section)
    return () => {
      setSection(null)
    }
  }, [section]) // eslint-disable-line react-hooks/exhaustive-deps
}
