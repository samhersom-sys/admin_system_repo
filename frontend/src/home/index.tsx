import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import HomeDashboard from './HomeDashboard'
import HomeEmbeddedDashboard from './HomeEmbeddedDashboard'

type HomePage = 'overview' | 'dashboard'

const TABS: { id: HomePage; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'dashboard', label: 'Dashboard' },
]

/**
 * Home page — route target for /app-home.
 * Overview tab: KPI and activity widgets.
 * Dashboard tab: embeds a saved reporting dashboard.
 *
 * Always resets to Overview when the Home nav link is clicked
 * (location.key changes on each navigation, resetting the tab).
 */
export default function HomePage() {
    const [activePage, setActivePage] = useState<HomePage>('overview')
    const location = useLocation()

    // Reset to Overview tab whenever the route key changes (e.g. Home link click)
    useEffect(() => {
        setActivePage('overview')
    }, [location.key])

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 px-6 pt-4 flex-shrink-0">
                <nav className="flex gap-0" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activePage === tab.id}
                            type="button"
                            onClick={() => setActivePage(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activePage === tab.id
                                    ? 'border-brand-600 text-brand-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                {activePage === 'overview' ? <HomeDashboard /> : <HomeEmbeddedDashboard />}
            </div>
        </div>
    )
}
