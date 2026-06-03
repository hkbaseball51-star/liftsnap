import { getSessionForDate } from '@/actions/workout'
import RecordNavigator from '@/components/record/RecordNavigator'

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
    <RecordNavigator
      initialDate={date}
      initialSession={sessionData}
    />
  )
}
