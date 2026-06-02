import { getExercisesWithHistory, getBodyWeightData } from '@/actions/analytics'
import StatsPickerView from '@/components/share/StatsPickerView'

export default async function ShareStatsPage() {
  const [exercises, bwData] = await Promise.all([
    getExercisesWithHistory(),
    getBodyWeightData(),
  ])

  return (
    <StatsPickerView
      exercises={exercises}
      hasBodyWeight={bwData.length > 0}
    />
  )
}
