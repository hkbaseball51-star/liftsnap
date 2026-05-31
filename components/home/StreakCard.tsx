'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/i18n'

type Props = {
  streak: number
  thisWeekDone: boolean
  locale?: Locale
}

export default function StreakCard({ streak, thisWeekDone, locale = 'en' }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  let subtitle: string
  let tip: string

  if (locale === 'ja') {
    if (streak === 0 && !thisWeekDone) {
      subtitle = '今週2回ワークアウトを記録するか、体写真を1枚追加しよう'
      tip = '最初の一歩がストリークを始める'
    } else if (thisWeekDone) {
      if (streak === 1) {
        subtitle = '今週のProof Weekを達成！'
        tip = '来週も継続しよう'
      } else {
        subtitle = `${streak}週間連続で努力の証拠を残しています`
        tip = '今週も継続中'
      }
    } else {
      subtitle = '今週も記録してストリークを継続しよう'
      tip = 'チェーンを途切れさせないで'
    }
  } else {
    if (streak === 0 && !thisWeekDone) {
      subtitle = 'Log 2+ workouts or 1 body photo this week'
      tip = 'One proof week starts the chain'
    } else if (thisWeekDone) {
      if (streak === 1) {
        subtitle = "You've kept proof of your effort for 1 week"
        tip = 'Build your Proof Streak next week'
      } else {
        subtitle = `You've kept proof of your effort for ${streak} weeks`
        tip = 'Keep it going this week'
      }
    } else {
      subtitle = 'Log this week to keep your Proof Streak alive'
      tip = "Don't break the chain"
    }
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 220ms ease, transform 220ms ease',
      }}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#1E1E1E', border: '1px solid rgba(237, 116, 47,0.38)' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(237, 116, 47,0.75) 0%, rgba(237, 116, 47,0.08) 55%, transparent 100%)' }} />

        <div className="px-5 py-4 flex items-center gap-4">
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(237, 116, 47,0.14)', border: '1px solid rgba(237, 116, 47,0.32)' }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🔥</span>
          </div>

          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 2 }}>
              {streak > 0 ? (
                <>
                  <span style={{ color: '#ED742F', fontFamily: 'var(--font-mono)' }}>{streak} </span>
                  <span style={{ color: '#ffffff' }}>
                    {locale === 'ja' ? 'WEEK PROOF STREAK' : 'WEEK PROOF STREAK'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#ffffff' }}>
                  {locale === 'ja' ? 'PROOF STREAKを始めよう' : 'START YOUR PROOF STREAK'}
                </span>
              )}
            </p>
            <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.62)', marginBottom: 1 }}>
              {subtitle}
            </p>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.58)' }}>
              {tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
