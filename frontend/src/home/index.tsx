import HomeDashboard from './HomeDashboard'
import DashboardViewPage from '@/reporting/DashboardViewPage/DashboardViewPage'
import { getSession } from '@/shared/lib/auth-session/auth-session'

/**
 * Home page — route target for /app-home.
 *
 * When the authenticated user has a master homepage configured
 * (masterHomepageTemplateId is non-null), the referenced dashboard is rendered
 * via DashboardViewPage.  When no master homepage is set, the static
 * HomeDashboard is rendered.  In both cases there is no tab bar — the previous
 * two-tab structure (Overview / Dashboard) is replaced by this dynamic routing.
 *
 * REQ-HOME-CFG-FE-F-007
 */
export default function HomePage() {
    const session = getSession() as any
    const masterHomepageTemplateId: number | null =
        session?.user?.masterHomepageTemplateId ?? null

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                {masterHomepageTemplateId !== null ? (
                    <DashboardViewPage templateId={masterHomepageTemplateId} />
                ) : (
                    <HomeDashboard />
                )}
            </div>
        </div>
    )
}
