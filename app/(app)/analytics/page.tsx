import { createClient } from '@/lib/supabase/server'
import { getBodyWeightData, getExercisesWithHistory } from '@/actions/analytics'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [bodyWeightData, exercises] = user
    ? await Promise.all([
        getBodyWeightData(90),
        getExercisesWithHistory(),
      ])
    : [[], []]

  return (
    <AnalyticsDashboard
      bodyWeightData={bodyWeightData}
      exercises={exercises}
    />
  )
}
