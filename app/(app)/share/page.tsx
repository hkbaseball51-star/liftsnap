import { getSessionForShare } from '@/actions/workout'
import { getStatsForShare } from '@/actions/analytics'
import { getTodayWorkoutForShare } from '@/actions/workout'
import ShareView from '@/components/share/ShareView'
import StatsShareView from '@/components/share/StatsShareView'
import TodayShareView from '@/components/share/TodayShareView'
import FeatureTracker from '@/components/common/FeatureTracker'
import Link from 'next/link'
import { Dumbbell, BarChart2, CalendarDays, ChevronRight, Lock } from 'lucide-react'

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
    return (
      <>
        <FeatureTracker feature="story" />
        <TodayShareView data={data} />
      </>
    )
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

  // Landing page — no type or session specified
  if (!params.type && !sessionId) {
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
    return (
      <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-8">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
            SHARE
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Create a Story
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.50)', marginTop: 6 }}>
            Share your progress to Instagram
          </p>
        </div>

        {/* Entry cards */}
        <div className="px-4 flex flex-col gap-3">
          {/* Today's Workout Story */}
          <Link
            href={`/share?type=today&date=${todayStr}`}
            className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(237,116,47,0.15)' }}>
              <Dumbbell size={20} color="#ED742F" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Today&apos;s Workout Story</p>
              <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.46)', marginTop: 2 }}>
                Share today&apos;s training card
              </p>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
          </Link>

          {/* Stats Graph Story */}
          <Link
            href="/analytics"
            className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <BarChart2 size={20} color="#22c55e" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Stats Graph Story</p>
              <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.46)', marginTop: 2 }}>
                Share your progress chart
              </p>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
          </Link>

          {/* Calendar Summary — coming soon */}
          <div
            className="flex items-center gap-4 rounded-2xl px-4 py-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.5 }}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <CalendarDays size={20} color="rgba(255,255,255,0.40)" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>Calendar Summary</p>
              <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.34)', marginTop: 2 }}>
                Coming soon
              </p>
            </div>
            <Lock size={14} color="rgba(255,255,255,0.24)" />
          </div>
        </div>
      </div>
    )
  }

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
