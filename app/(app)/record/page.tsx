import { createClient } from '@/lib/supabase/server'
import { getSessionForDate } from '@/actions/workout'
import WorkoutRecorder from '@/components/record/WorkoutRecorder'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: rawDate } = await searchParams
  const date = rawDate ?? getTodayJST()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [exercisesResult, sessionData] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment, is_custom')
      .or(user ? `user_id.is.null,user_id.eq.${user.id}` : 'user_id.is.null')
      .order('name'),
    user ? getSessionForDate(date) : Promise.resolve(null),
  ])

  return (
    <WorkoutRecorder
      exercises={exercisesResult.data ?? []}
      date={date}
      existingSessionId={sessionData?.id}
      existingExercises={sessionData?.exercises}
    />
  )
}
