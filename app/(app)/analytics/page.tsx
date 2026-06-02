import { createClient } from '@/lib/supabase/server'
import { getBodyWeightData, getExercisesWithHistory } from '@/actions/analytics'
import AnalyticsDashboardClient from '@/components/analytics/AnalyticsDashboardClient'
import FeatureTracker from '@/components/common/FeatureTracker'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AnalyticsDashboardClient bodyWeightData={[]} exercises={[]} totalSessions={0} />
  }

  // Limit body weight to 2 years — covers all client-side period filters (30/90/365 day)
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const bwCutoff = twoYearsAgo.toISOString().split('T')[0]

  const [bodyWeightData, exercises, { count }] = await Promise.all([
    getBodyWeightData(bwCutoff),
    getExercisesWithHistory(),
    supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
  ])

  return (
    <>
      <FeatureTracker feature="progress" />
      <AnalyticsDashboardClient
        bodyWeightData={bodyWeightData}
        exercises={exercises}
        totalSessions={count ?? 0}
      />
    </>
  )
}
