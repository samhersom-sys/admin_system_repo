/**
 * AppLayout — root shell for all authenticated app routes.
 *
 * Structure:
 *   <SidebarContextProvider>
 *     <div.app-layout>
 *       <Sidebar />          — collapsing icon rail, expands on hover
 *       <main.app-content>   — page content via <Outlet />
 *     </div>
 *   </SidebarContextProvider>
 *
 * The SidebarContextProvider lets any page register a contextual action
 * section without the sidebar needing to import domain logic (§4.4b).
 */
import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { SidebarContextProvider } from './SidebarContext'
import { NotificationProvider, NotificationDock } from './NotificationDock'
import { useInactivityLogout } from './useInactivityLogout'
import './AppLayout.css'

// 30-minute inactivity timeout (REQ-INACTIVITY-F-004)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

export default function AppLayout() {
  useInactivityLogout(INACTIVITY_TIMEOUT_MS)
  return (
    <NotificationProvider>
      <SidebarContextProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="app-content">
            <Outlet />
          </main>
        </div>
        <NotificationDock />
      </SidebarContextProvider>
    </NotificationProvider>
  )
}
