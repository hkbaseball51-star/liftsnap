import { getSessionForShare } from '@/actions/workout'
import { getStatsForShare } from '@/actions/analytics'
import { getTodayWorkoutForShare } from '@/actions/workout'
import ShareView from '@/components/share/ShareView'
import StatsShareView from '@/components/share/StatsShareView'
import TodayShareView from '@/components/share/TodayShareView'
import Link from 'next/link'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; type?: string; metric?: string; exercise?: string; date?: string }>
}) {
  const params = await searchParams

  if (params.type === 'today') {
    const date = params.date ?? ''
    if (!date) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-4">Date not specified</p>
          <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>Back to Home</Link>
        </div>
      )
    }
    const data = await getTodayWorkoutForShare(date)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-2">No workout found for {date}</p>
          <p className="text-sm mb-6" style={{ color: '#555' }}>Log a session first</p>
          <Link href={`/record?date=${date}`} className="text-sm font-bold" style={{ color: '#ED742F' }}>Log Workout →</Link>
        </div>
      )
    }
    return <TodayShareView data={data} />
  }

  if (params.type === 'stats') {
    const data = await getStatsForShare(params.metric ?? '', params.exercise)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-4">Data not found</p>
          <Link href="/analytics" className="text-sm" style={{ color: '#ED742F' }}>Back to Analytics</Link>
        </div>
      )
    }
    return <StatsShareView data={data} />
  }

  const sessionId = params.session
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-white mb-4">セッションが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  const data = await getSessionForShare(sessionId)
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-white mb-4">データが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  return <ShareView data={data} />
}
