/**
 * Sidebar — icon rail that expands on hover.
 *
 * Architecture rules:
 *   - Navigation only. No data fetching, no modal state.
 *   - User info from getSession() only.
 *   - Contextual section registered by pages via useSidebarSection (§4.4b).
 *   - Contextual actions fire DOM custom events; the page handles them (§4.6).
 *   - CSS vars only for colours (guideline §7.3 RULE 2).
 *   - Active route styling via NavLink isActive.
 */
import React, { useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiFileText,
  FiFile,
  FiShield,
  FiBriefcase,
  FiBarChart2,
  FiCreditCard,
  FiInbox,
  FiSettings,
  FiPower,
  FiUser,
  FiSearch,
  FiPlusCircle,
  FiUsers,
  FiSave,
  FiSend,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
  FiEdit2,
  FiAlertCircle,
  FiArrowLeft,
  FiPlus,
  FiClipboard,
  FiAlertTriangle,
  FiPackage,
  FiSliders,
  FiRepeat,
} from 'react-icons/fi'
import { clearSession, getSession } from '@/shared/lib/auth-session/auth-session'
import { useSidebarContextValue } from './SidebarContext'
import './Sidebar.css'

// ─── Sub-item type for nav menus ────────────────────────────────────────────
interface NavSubItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
}

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  subItems?: NavSubItem[]
}

// ─── Main nav items (always visible) ───────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: FiHome, to: '/app-home' },
  { label: 'Search', icon: FiSearch, to: '/search' },
  {
    label: 'Reporting', icon: FiBarChart2, to: '/reports',
    subItems: [
      { label: 'Create Report', icon: FiFileText, to: '/reports/create?type=report' },
      { label: 'Create Dashboard', icon: FiBarChart2, to: '/dashboards/create' },
    ],
  },
  {
    label: 'Finance', icon: FiCreditCard, to: '/finance',
    subItems: [
      { label: 'Cash Batching', icon: FiCreditCard, to: '/finance/cash-batching' },
      { label: 'Trial Balance', icon: FiBarChart2, to: '/finance/trial-balance' },
      { label: 'Invoices', icon: FiFileText, to: '/finance/invoices' },
      { label: 'Payments', icon: FiCreditCard, to: '/finance/payments' },
    ],
  },
  {
    label: 'Workflow', icon: FiRepeat, to: '/workflow',
    subItems: [
      { label: 'My Work Items', icon: FiClipboard, to: '/my-work-items' },
      { label: 'Submission Workflow', icon: FiInbox, to: '/workflow/submissions' },
      { label: 'Clearance', icon: FiAlertCircle, to: '/workflow/clearance' },
      { label: 'Data Quality', icon: FiAlertTriangle, to: '/workflow/data-quality' },
    ],
  },
  {
    label: 'Settings', icon: FiSettings, to: '/settings',
    subItems: [
      { label: 'Account Admin', icon: FiUser, to: '/settings/account' },
      { label: 'Products', icon: FiPackage, to: '/settings/products' },
      { label: 'Organisations', icon: FiBriefcase, to: '/settings/organisations' },
      { label: 'Rating Rules', icon: FiSliders, to: '/settings/rating-rules' },
      { label: 'Data Quality', icon: FiAlertTriangle, to: '/settings/data-quality' },
    ],
  },
]

// ─── Domain contextual nav items ────────────────────────────────────────────
// Only shown when the user is navigating within that domain (T-SIDEBAR-CTXNAV-*).
// subItems: shown on hover when no page section is registered (REQ-SIDEBAR-F-016).
const DOMAIN_NAV = [
  {
    label: 'Submissions', icon: FiFileText, to: '/submissions', matchPrefix: '/submissions',
    subItems: [
      { label: 'Save', icon: FiSave, event: 'submission:save' },
      { label: 'Submit', icon: FiSend, event: 'submission:submit' },
      { label: 'Create Quote', icon: FiFile, to: '/quotes/new' },
      { label: 'Create Party', icon: FiUsers, to: '/parties/new' },
    ],
  },
  {
    label: 'Quotes', icon: FiFile, to: '/quotes', matchPrefix: '/quotes',
    noLink: true,
    subItems: [],
  },
  {
    label: 'Policies', icon: FiShield, to: '/policies', matchPrefix: '/policies',
    subItems: [],
  },
  {
    label: 'Claims', icon: FiAlertCircle, to: '/claims', matchPrefix: '/claims',
    subItems: [],
  },
  {
    label: 'Binding Authorities', icon: FiBriefcase, to: '/binding-authorities', matchPrefix: '/binding-authorities',
    subItems: [],
  },
]

// ─── Create quick-menu items ────────────────────────────────────────────────
const CREATE_ITEMS = [
  { label: 'Submission', icon: FiFileText, to: '/submissions/new?type=submission' },
  { label: 'Quote', icon: FiFile, to: '/quotes/new' },
  { label: 'Binding Authority', icon: FiBriefcase, to: '/binding-authorities/new' },
  { label: 'Policy', icon: FiShield, to: '/policies/create' },
  { label: 'Claim', icon: FiAlertCircle, to: '/claims/create' },
  { label: 'Party', icon: FiUsers, to: '/parties/new' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
  const userName = session?.user?.name ?? 'User'
  // Contextual section registered by the active page (§R03)
  const { section } = useSidebarContextValue()

  // Sidebar hover-intent expand
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create submenu open state
  const [createOpen, setCreateOpen] = useState(false)
  const createTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Contextual sub-menu open state (tracks label of open child group)
  const [ctxSubOpen, setCtxSubOpen] = useState<string | null>(null)

  // Domain contextual nav — items visible only when within a domain route (T-SIDEBAR-CTXNAV-*)
  const contextualDomainItems = DOMAIN_NAV.filter(({ matchPrefix }) =>
    location.pathname.startsWith(matchPrefix)
  )

  // Which domain item is currently active — used to bind section items to the right header
  const activeDomainItem = DOMAIN_NAV.find(d => location.pathname.startsWith(d.matchPrefix)) ?? null
  const isReportingRoute = location.pathname.startsWith('/reports') || location.pathname.startsWith('/dashboards')

  // Domain sub-item hover state (REQ-SIDEBAR-F-016)
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null)
  const domainTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nav-item submenu hover state
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-render page-registered section sub-items for the active domain header.
  // This is a JSX expression (not a hook) — valid to compute before return().
  const sectionSubEl = (section && Array.isArray(section.items)) ? (
    <ul className="sidebar-domain-sub" role="list">
      {section.items.map((item) => {
        const ItemIcon = item.icon
        if (item.children?.length) {
          const subOpen = ctxSubOpen === item.label
          return (
            <li
              key={item.label}
              className={`sidebar-submenu-wrap${subOpen ? ' sidebar-submenu-wrap--open' : ''}`}
              onMouseEnter={() => setCtxSubOpen(item.label)}
              onMouseLeave={() => setCtxSubOpen(null)}
            >
              <button
                type="button"
                className="sidebar-item sidebar-domain-sub-item sidebar-context-btn"
                aria-expanded={subOpen}
                aria-haspopup="true"
                title={item.label}
                onClick={() => setCtxSubOpen(v => v === item.label ? null : item.label)}
              >
                <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                <span className="sidebar-item-label">{item.label}</span>
              </button>
              <ul className="sidebar-submenu" role="list" aria-label={`${item.label} options`}>
                {item.children.map((child) => {
                  const ChildIcon = child.icon
                  return (
                    <li key={child.to ?? child.event ?? child.label}>
                      {child.to ? (
                        <NavLink
                          to={child.to}
                          className="sidebar-item sidebar-submenu-item"
                          title={child.label}
                          onClick={() => setCtxSubOpen(null)}
                        >
                          <ChildIcon className="sidebar-item-icon" aria-hidden="true" />
                          <span className="sidebar-item-label">{child.label}</span>
                        </NavLink>
                      ) : (
                        <button
                          type="button"
                          className="sidebar-item sidebar-submenu-item"
                          title={child.label}
                          onClick={() => {
                            if (child.event) window.dispatchEvent(new CustomEvent(child.event))
                            setCtxSubOpen(null)
                          }}
                        >
                          <ChildIcon className="sidebar-item-icon" aria-hidden="true" />
                          <span className="sidebar-item-label">{child.label}</span>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        }
        if (item.to) {
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="sidebar-item sidebar-domain-sub-item sidebar-context-btn"
                title={item.label}
              >
                <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            </li>
          )
        }
        return (
          <li key={item.event ?? item.label}>
            <button
              type="button"
              className="sidebar-item sidebar-domain-sub-item sidebar-context-btn"
              title={item.label}
              disabled={item.disabled ?? false}
              onClick={() => {
                if (!item.disabled && item.event) {
                  window.dispatchEvent(new CustomEvent(item.event))
                }
              }}
            >
              <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  ) : null

  function handleMouseEnter() {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    setExpanded(true)
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), 200)
  }

  function handleCreateEnter() {
    if (createTimer.current) clearTimeout(createTimer.current)
    setCreateOpen(true)
  }

  function handleCreateLeave() {
    createTimer.current = setTimeout(() => setCreateOpen(false), 200)
  }

  function handleDomainEnter(domainTo: string) {
    if (domainTimer.current) clearTimeout(domainTimer.current)
    setHoveredDomain(domainTo)
  }

  function handleDomainLeave() {
    domainTimer.current = setTimeout(() => setHoveredDomain(null), 200)
  }

  function handleNavEnter(navTo: string) {
    if (navTimer.current) clearTimeout(navTimer.current)
    setHoveredNav(navTo)
  }

  function handleNavLeave() {
    navTimer.current = setTimeout(() => setHoveredNav(null), 200)
  }

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  return (
    <nav
      className={`sidebar${expanded ? ' expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Main navigation"
    >
      {/* ── Primary nav items ───────────────────────────────── */}
      <ul className="sidebar-nav" role="list">
        {NAV_ITEMS.map(({ label, icon: Icon, to, subItems }) => (
          <React.Fragment key={to}>
            <li
              className={subItems?.length ? 'sidebar-nav-group' : undefined}
              onMouseEnter={subItems?.length ? () => handleNavEnter(to) : undefined}
              onMouseLeave={subItems?.length ? handleNavLeave : undefined}
            >
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                }
                title={label}
              >
                <Icon className="sidebar-item-icon" aria-hidden="true" />
                <span className="sidebar-item-label">{label}</span>
              </NavLink>

              {/* ── Nav sub-items — shown on hover ── */}
              {section && isReportingRoute && to === '/reports' ? sectionSubEl : null}
              {subItems?.length && hoveredNav === to && !(section && isReportingRoute && to === '/reports') ? (
                <ul className="sidebar-domain-sub" role="list">
                  {subItems.map((sub) => {
                    const SubIcon = sub.icon
                    return (
                      <li key={sub.to}>
                        <NavLink
                          to={sub.to}
                          className="sidebar-item sidebar-domain-sub-item"
                          title={sub.label}
                          onClick={() => setHoveredNav(null)}
                        >
                          <SubIcon className="sidebar-item-icon" aria-hidden="true" />
                          <span className="sidebar-item-label">{sub.label}</span>
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>

            {/* ── Global Back button — directly after Home, hidden on /app-home ── */}
            {to === '/app-home' && location.pathname !== '/app-home' && (
              <li>
                <button
                  type="button"
                  className="sidebar-item sidebar-back-btn"
                  title="Back"
                  onClick={() => navigate(-1)}
                >
                  <FiArrowLeft className="sidebar-item-icon" aria-hidden="true" />
                  <span className="sidebar-item-label">Back</span>
                </button>
              </li>
            )}

            {/* ── Create quick-menu — visible on /app-home and /search (T-SIDEBAR-CREATE-R01) ── */}
            {to === '/search' && (location.pathname === '/app-home' || location.pathname === '/search') && (
              <li
                className={`sidebar-submenu-wrap${createOpen ? ' sidebar-submenu-wrap--open' : ''}`}
                onMouseEnter={handleCreateEnter}
                onMouseLeave={handleCreateLeave}
              >
                <button
                  type="button"
                  className="sidebar-item sidebar-create-trigger"
                  aria-expanded={createOpen}
                  aria-haspopup="true"
                  title="Create"
                  onClick={() => setCreateOpen(v => !v)}
                >
                  <FiPlusCircle className="sidebar-item-icon" aria-hidden="true" />
                  <span className="sidebar-item-label">Create</span>
                </button>

                <ul className="sidebar-submenu" role="list" aria-label="Create options">
                  {CREATE_ITEMS.map(({ label: itemLabel, icon: ItemIcon, to: itemTo }) => (
                    <li key={itemTo}>
                      <NavLink
                        to={itemTo}
                        className="sidebar-item sidebar-submenu-item"
                        title={itemLabel}
                        onClick={() => setCreateOpen(false)}
                      >
                        <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                        <span className="sidebar-item-label">{itemLabel}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {/* ── Domain nav — contextual per route (REQ-SIDEBAR-F-016) ──
             *   Sub-items: page-registered section items shown always; predefined shown on hover.
             */}
            {to === '/search' && contextualDomainItems.map((domainItem) => {
              const { label: dLabel, icon: DIcon, to: dTo, matchPrefix, subItems: dSubItems } = domainItem
              const noLink = (domainItem as { noLink?: boolean }).noLink
              const isActiveDomain = location.pathname.startsWith(matchPrefix)
              return (
                <li
                  key={dTo}
                  className="sidebar-domain-item-wrap"
                  onMouseEnter={() => handleDomainEnter(dTo)}
                  onMouseLeave={handleDomainLeave}
                >
                  {noLink ? (
                    <div className="sidebar-item sidebar-item--no-link" title={dLabel}>
                      <DIcon className="sidebar-item-icon" aria-hidden="true" />
                      <span className="sidebar-item-label">{dLabel}</span>
                    </div>
                  ) : (
                    <NavLink
                      to={dTo}
                      className={({ isActive }) =>
                        `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                      }
                      title={dLabel}
                    >
                      <DIcon className="sidebar-item-icon" aria-hidden="true" />
                      <span className="sidebar-item-label">{dLabel}</span>
                    </NavLink>
                  )}

                  {/* Page-registered section items — always visible under active domain header */}
                  {section && isActiveDomain && sectionSubEl}

                  {/* Predefined sub-items — hover-gated, shown when no page section is active */}
                  {(!section || !isActiveDomain) && hoveredDomain === dTo && (
                    <ul className="sidebar-domain-sub" role="list">
                      {dSubItems.map((sub: import('./SidebarContext').SidebarActionItem) => {
                        const SubIcon = sub.icon
                        return (
                          <li key={sub.label}>
                            {sub.to ? (
                              <NavLink
                                to={sub.to}
                                className="sidebar-item sidebar-domain-sub-item"
                                title={sub.label}
                              >
                                <SubIcon className="sidebar-item-icon" aria-hidden="true" />
                                <span className="sidebar-item-label">{sub.label}</span>
                              </NavLink>
                            ) : (
                              <button
                                type="button"
                                className="sidebar-item sidebar-domain-sub-item"
                                title={sub.label}
                                onClick={() => sub.event && window.dispatchEvent(new CustomEvent(sub.event))}
                              >
                                <SubIcon className="sidebar-item-icon" aria-hidden="true" />
                                <span className="sidebar-item-label">{sub.label}</span>
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </React.Fragment>
        ))}

        {/* ── Contextual section — registered by the active page ────────
            Section items are now rendered inline under the domain header (REQ-SIDEBAR-F-007).
            This fallback block is preserved for edge cases where a section is registered
            but no domain route is matched (e.g. a future non-domain page with a section). */}
        {section && Array.isArray(section.items) && !activeDomainItem && !isReportingRoute && (
          <li>
            <div className="sidebar-context-section">
              <ul className="sidebar-context-list" role="list">
                {section.items.map((item) => {
                  const ItemIcon = item.icon

                  // Sub-menu group (e.g. Create → Quote, BA, Party, Claim)
                  if (item.children?.length) {
                    const subOpen = ctxSubOpen === item.label
                    return (
                      <li
                        key={item.label}
                        className={`sidebar-submenu-wrap${subOpen ? ' sidebar-submenu-wrap--open' : ''}`}
                        onMouseEnter={() => setCtxSubOpen(item.label)}
                        onMouseLeave={() => setCtxSubOpen(null)}
                      >
                        <button
                          type="button"
                          className="sidebar-item sidebar-context-btn"
                          aria-expanded={subOpen}
                          aria-haspopup="true"
                          title={item.label}
                          onClick={() => setCtxSubOpen(v => v === item.label ? null : item.label)}
                        >
                          <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                          <span className="sidebar-item-label">{item.label}</span>
                        </button>
                        <ul className="sidebar-submenu" role="list" aria-label={`${item.label} options`}>
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            return (
                              <li key={child.to ?? child.event ?? child.label}>
                                {child.to ? (
                                  <NavLink
                                    to={child.to}
                                    className="sidebar-item sidebar-submenu-item"
                                    title={child.label}
                                    onClick={() => setCtxSubOpen(null)}
                                  >
                                    <ChildIcon className="sidebar-item-icon" aria-hidden="true" />
                                    <span className="sidebar-item-label">{child.label}</span>
                                  </NavLink>
                                ) : (
                                  <button
                                    type="button"
                                    className="sidebar-item sidebar-submenu-item"
                                    title={child.label}
                                    onClick={() => {
                                      if (child.event) window.dispatchEvent(new CustomEvent(child.event))
                                      setCtxSubOpen(null)
                                    }}
                                  >
                                    <ChildIcon className="sidebar-item-icon" aria-hidden="true" />
                                    <span className="sidebar-item-label">{child.label}</span>
                                  </button>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    )
                  }

                  // Navigate item
                  if (item.to) {
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className="sidebar-item sidebar-context-btn"
                          title={item.label}
                        >
                          <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                          <span className="sidebar-item-label">{item.label}</span>
                        </NavLink>
                      </li>
                    )
                  }

                  // Event button (default)
                  return (
                    <li key={item.event ?? item.label}>
                      <button
                        type="button"
                        className="sidebar-item sidebar-context-btn"
                        title={item.label}
                        disabled={item.disabled ?? false}
                        onClick={() => {
                          if (!item.disabled && item.event) {
                            window.dispatchEvent(new CustomEvent(item.event))
                          }
                        }}
                      >
                        <ItemIcon className="sidebar-item-icon" aria-hidden="true" />
                        <span className="sidebar-item-label">{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </li>
        )}

      </ul>

      {/* ── Footer: profile link + logout ──────────────────── */}
      <div className="sidebar-footer">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `sidebar-item sidebar-profile${isActive ? ' sidebar-item--active' : ''}`
          }
          title={userName}
        >
          <FiUser className="sidebar-item-icon" aria-hidden="true" />
          <span className="sidebar-item-label sidebar-user-name">{userName}</span>
        </NavLink>

        <button
          type="button"
          className="sidebar-item sidebar-logout"
          onClick={handleLogout}
          title="Sign out"
        >
          <FiPower className="sidebar-item-icon" aria-hidden="true" />
          <span className="sidebar-item-label">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
