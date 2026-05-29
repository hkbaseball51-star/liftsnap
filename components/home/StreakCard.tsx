'use client'

import { useEffect, useState } from 'react'

type Props = {
  streak: number
  thisWeekDone: boolean
}

export default function StreakCard({ streak, thisWeekDone }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  let subtitle: string
  let tip: string

  if (streak === 0 && !thisWeekDone) {
    subtitle = 'Log your first workout this week'
    tip = 'One session starts the chain'
  } else if (thisWeekDone) {
    if (streak === 1) {
      subtitle = 'You logged a workout this week'
      tip = 'Build your streak next week'
    } else {
      subtitle = `You trained ${streak} weeks in a row`
      tip = 'Keep it going this week'
    }
  } else {
    subtitle = 'Log this week to keep it alive'
    tip = "Don't break the chain"
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
        style={{ background: '#181818', border: '1px solid rgba(255,106,0,0.22)' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,107,0,0.75) 0%, rgba(255,107,0,0.08) 55%, transparent 100%)' }} />

        <div className="px-5 py-4 flex items-center gap-4">
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,107,0,0.10)', border: '1px solid rgba(255,107,0,0.18)' }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🔥</span>
          </div>

          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 2 }}>
              {streak > 0 ? (
                <>
                  <span style={{ color: '#ff6b00', fontFamily: 'var(--font-mono)' }}>{streak} </span>
                  <span style={{ color: '#ffffff' }}>WEEK STREAK</span>
                </>
              ) : (
                <span style={{ color: '#ffffff' }}>START YOUR STREAK</span>
              )}
            </p>
            <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.62)', marginBottom: 1 }}>
              {subtitle}
            </p>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.38)' }}>
              {tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
