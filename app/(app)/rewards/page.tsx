import { createClient } from '@/lib/supabase/server'
import { getExercisesWithHistory } from '@/actions/analytics'
import RewardsView from '@/components/rewards/RewardsView'

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <RewardsView totalSessions={0} exercises={[]} />
  }

  const [exercises, { count }] = await Promise.all([
    getExercisesWithHistory(),
    supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
  ])

  return (
    <RewardsView
      totalSessions={count ?? 0}
      exercises={exercises.map(e => ({ name: e.name, logCount: e.logCount }))}
    />
  )
}
