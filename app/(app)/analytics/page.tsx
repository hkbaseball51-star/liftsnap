import { createClient } from '@/lib/supabase/server'
import { getWeeklyVolumeData, getBodyWeightData, getExercisesWithHistory } from '@/actions/analytics'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [volumeData, bodyWeightData, exercises] = user
    ? await Promise.all([
        getWeeklyVolumeData(12),
        getBodyWeightData(90),
        getExercisesWithHistory(),
      ])
    : [[], [], []]

  return (
    <AnalyticsDashboard
      volumeData={volumeData}
      bodyWeightData={bodyWeightData}
      exercises={exercises}
    />
  )
}
