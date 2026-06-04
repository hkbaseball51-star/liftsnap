import { getExercisesWithHistory } from '@/actions/analytics'
import StatsPickerView from '@/components/share/StatsPickerView'

export default async function ShareStatsPage() {
  const exercises = await getExercisesWithHistory()

  return (
    <StatsPickerView
      exercises={exercises}
      hasBodyWeight={false}
      initialStep="exercise"
      initialMetric="max1rm"
    />
  )
}
