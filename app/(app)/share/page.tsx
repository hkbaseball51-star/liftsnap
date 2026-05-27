import { createClient } from '@/lib/supabase/server'
import { getSessionForShare } from '@/actions/workout'
import ShareView from '@/components/share/ShareView'
import Link from 'next/link'

export default async function SharePage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session: sessionId } = await searchParams

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
