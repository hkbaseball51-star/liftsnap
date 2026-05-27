import { getSessionForShare } from '@/actions/workout'
import { getStatsForShare } from '@/actions/analytics'
import ShareView from '@/components/share/ShareView'
import StatsShareView from '@/components/share/StatsShareView'
import Link from 'next/link'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; type?: string; metric?: string; exercise?: string }>
}) {
  const params = await searchParams

  if (params.type === 'stats') {
    const data = await getStatsForShare(params.metric ?? '', params.exercise)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-4">Data not found</p>
          <Link href="/analytics" className="text-sm" style={{ color: '#ff6b00' }}>Back to Analytics</Link>
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
        <Link href="/home" className="text-sm" style={{ color: '#ff6b00' }}>ホームへ戻る</Link>
      </div>
    )
  }

  const data = await getSessionForShare(sessionId)
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-white mb-4">データが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ff6b00' }}>ホームへ戻る</Link>
      </div>
    )
  }

  return <ShareView data={data} />
}
