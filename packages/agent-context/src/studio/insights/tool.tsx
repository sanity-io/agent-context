import {ChartUpwardIcon} from '@sanity/icons'

import {InsightsDashboard} from './dashboard/InsightsDashboard'

/**
 * Studio tool for viewing agent conversation insights.
 * Appears in the Studio topbar alongside Structure, Vision, etc.
 */
export const insightsTool = {
  name: 'agent-insights',
  title: 'Insights',
  icon: ChartUpwardIcon,
  component: InsightsDashboard,
}
