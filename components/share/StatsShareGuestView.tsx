'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  localGetExercise1RMData,
  localGetBodyPartDailyVolumeData,
  localGetBodyWeightHistory,
  localGetPPLDailyVolumeAll,
} from '@/lib/localDB'
import StatsShareView, { type StatsData } from './StatsShareView'

type Props = {
  metric: string
  exercise?: string
  bodypart?: string
}

export default function StatsShareGuestView({ metric, exercise, bodypart }: Props) {
  const [data, setData] = useState<StatsData | null | 'loading'>('loading')

  useEffect(() => {
    if (metric === 'max1rm' && exercise) {
      const rm = localGetExercise1RMData(exercise)
      if (!rm.length) { setData(null); return }
      const bestEntry = rm.reduce((a, b) => a.est1rm >= b.est1rm ? a : b)
      setData({
        type: 'max1rm',
        exerciseName: exercise,
        bestRM: bestEntry.est1rm,
        bestDate: bestEntry.label,
        bestSet: { weight: bestEntry.weight, reps: bestEntry.reps },
        history: rm,
        sessionCount: rm.length,
      })
      return
    }

    if (metric === 'volume') {
      const part = bodypart ?? 'all'
      const vol  = localGetBodyPartDailyVolumeData(part)
      const ppl  = localGetPPLDailyVolumeAll()
      const hasSomeData = vol.length > 0 || ppl.push.length > 0 || ppl.pull.length > 0 || ppl.legs.length > 0
      if (!hasSomeData) { setData(null); return }
      setData({
        type: 'volume',
        bodyPart: part,
        totalVolume: vol.reduce((s, d) => s + d.volume, 0),
        sessionCount: vol.length,
        history: vol,
        pplData: ppl,
      })
      return
    }

    if (metric === 'bodyweight') {
      const bw = localGetBodyWeightHistory(730)
      if (!bw.length) { setData(null); return }
      const latest = bw[bw.length - 1].weight
      setData({
        type: 'bodyweight',
        currentWeight: latest,
        change: bw.length >= 2 ? Math.round((latest - bw[0].weight) * 10) / 10 : 0,
        history: bw,
      })
      return
    }

    setData(null)
  }, [metric, exercise, bodypart])

  if (data === 'loading') return <div className="fixed inset-0 bg-black" />

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--app-bg)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
          データがありません
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28 }}>
          まず記録してから共有できます
        </p>
        <Link href="/analytics"
          className="px-8 py-3 rounded-2xl text-sm font-black text-white"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237,116,47,0.30)' }}>
          Analyticsに戻る
        </Link>
      </div>
    )
  }

  return <StatsShareView data={data} />
}
