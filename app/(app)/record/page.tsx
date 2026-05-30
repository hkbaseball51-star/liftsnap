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

  const sessionData = await getSessionForDate(date)

  return (
    <WorkoutRecorder
      date={date}
      existingSessionId={sessionData?.id}
      existingExercises={sessionData?.exercises}
      existingTitle={sessionData?.title}
    />
  )
}
