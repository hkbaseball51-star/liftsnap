import AnalyticsDashboardClient from '@/components/analytics/AnalyticsDashboardClient'
import FeatureTracker from '@/components/common/FeatureTracker'

// No-auth MVP: always use localStorage. Supabase path removed.
// TODO_SYNC: Re-enable Supabase queries when cloud sync / login is added.
export default function AnalyticsPage() {
  return (
    <>
      <FeatureTracker feature="progress" />
      <AnalyticsDashboardClient bodyWeightData={[]} exercises={[]} totalSessions={0} useLocalDB={true} />
    </>
  )
}
