'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { localGetTodayWorkoutForShare } from '@/lib/localDB'
import TodayShareView from './TodayShareView'
import type { TodayData } from './WorkoutStoryCardContent'

export default function ShareGuestView({ date }: { date: string }) {
  const [data, setData] = useState<TodayData | null | 'loading'>('loading')

  useEffect(() => {
    const result = localGetTodayWorkoutForShare(date)
    setData(result)
  }, [date])

  if (data === 'loading') {
    return <div className="fixed inset-0 bg-black" />
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0a0a' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
          今日のワークアウト記録がありません
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', textAlign: 'center', marginBottom: 28 }}>
          まずRecordから記録してください
        </p>
        <Link href={`/record?date=${date}`}
          className="px-8 py-3 rounded-2xl text-sm font-black text-white"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237,116,47,0.30)' }}>
          Recordで記録する
        </Link>
      </div>
    )
  }

  return <TodayShareView data={data} />
}
