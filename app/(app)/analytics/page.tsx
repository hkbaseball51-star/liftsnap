import { createClient } from '@/lib/supabase/server'
import { getBodyWeightData, getExercisesWithHistory } from '@/actions/analytics'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AnalyticsDashboard bodyWeightData={[]} exercises={[]} totalSessions={0} />
  }

  const [bodyWeightData, exercises, { count }] = await Promise.all([
    getBodyWeightData(), // fetch all time for client-side period filtering
    getExercisesWithHistory(),
    supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
  ])

  return (
    <AnalyticsDashboard
      bodyWeightData={bodyWeightData}
      exercises={exercises}
      totalSessions={count ?? 0}
    />
  )
}
