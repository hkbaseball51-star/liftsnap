import AnalyticsDashboardClient from '@/components/analytics/AnalyticsDashboardClient'
import FeatureTracker from '@/components/common/FeatureTracker'

// Data now comes from AppDataContext — bodyWeightData/exercises/totalSessions
// are no longer needed here. useLocalDB retained for the chart-data fetching path.
export default function AnalyticsPage() {
  return (
    <>
      <FeatureTracker feature="progress" />
      <AnalyticsDashboardClient useLocalDB={true} />
    </>
  )
}
