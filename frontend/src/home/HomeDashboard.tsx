import { getOrgCode, getUserId } from '@/shared/lib/auth-session/auth-session'
import KpiWidget from './HomeWidgets/KpiWidget'
import GwpChartWidget from './HomeWidgets/GwpChartWidget'
import CumulativeGwpWidget from './HomeWidgets/CumulativeGwpWidget'
import RecentActivityWidget from './HomeWidgets/RecentActivityWidget'
import TasksWidget from './HomeWidgets/TasksWidget'

/**
 * HomeDashboard — assembles all five homepage widgets.
 *
 * Architecture rules:
 *   - Reads session identifiers here and passes them to widgets as props.
 *   - Does NOT call api-client directly — all data fetching happens inside widgets.
 *   - Does NOT import from domains/ or sharedmodules/.
 */

export default function HomeDashboard() {
  const orgCode = getOrgCode()
  const userId = getUserId()

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* KPI — full width */}
      <KpiWidget orgCode={orgCode} userId={userId} />

      {/* GWP charts — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GwpChartWidget orgCode={orgCode} />
        <CumulativeGwpWidget orgCode={orgCode} />
      </div>

      {/* Activity and tasks — each full width to prevent column overlap */}
      <RecentActivityWidget orgCode={orgCode} />
      <TasksWidget userId={userId} />
    </div>
  )
}
