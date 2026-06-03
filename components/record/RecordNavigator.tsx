'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSessionForDate } from '@/actions/workout'
import { useLocale } from '@/lib/useLocale'
import WorkoutRecorder from './WorkoutRecorder'
import type { Locale } from '@/lib/i18n'

type InitialExercise = {
  name: string
  muscle_group: string
  note?: string | null
  sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[]
}

type SessionData = {
  id: string
  title: string
  exercises: InitialExercise[]
} | null

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function formatNavDate(dateStr: string, locale: Locale): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (locale === 'ja') return `${y}年${m}月${d}日`
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[m-1]} ${d}, ${y}`
}

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

/* ── Skeleton shown during load ───────────────────────── */

type SkelProps = {
  date: string
  locale: Locale
  onPrev: () => void
  onNext: () => void
  isNextDisabled: boolean
}

function RecordSkeleton({ date, locale, onPrev, onNext, isNextDisabled }: SkelProps) {
  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <div
        className="sticky top-0 z-20 px-4 pt-14"
        style={{ background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.13)' }}
      >
        <div className="flex items-center justify-between pb-1">
          <div style={{ width: 28 }} />
          <div className="flex items-center gap-1">
            <button className="p-1.5 active:opacity-60 transition-opacity" onClick={onPrev}>
              <ChevronLeft size={16} style={{ color: '#666' }} />
            </button>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#fff',
              whiteSpace: 'nowrap', minWidth: 120, textAlign: 'center',
            }}>
              {formatNavDate(date, locale)}
            </span>
            <button
              className="p-1.5 active:opacity-60 transition-opacity"
              disabled={isNextDisabled}
              onClick={onNext}
            >
              <ChevronRight size={16} style={{ color: isNextDisabled ? '#2a2a2a' : '#666' }} />
            </button>
          </div>
          <div style={{ width: 28 }} />
        </div>
        <div style={{ height: 26, marginBottom: 4 }} />
        <div style={{ height: 22, marginBottom: 8 }} />
      </div>

      <div className="px-3 pt-3 space-y-3">
        {[0, 1].map(i => (
          <div
            key={i}
            style={{
              height: 160, borderRadius: 16,
              background: '#131313',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: 0.55 - i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────── */

type Props = {
  initialDate: string
  initialSession: SessionData
}

export default function RecordNavigator({ initialDate, initialSession }: Props) {
  const { locale } = useLocale()
  const todayJSTRef = useRef(getTodayJST())
  const todayJST = todayJSTRef.current

  const cache = useRef<Map<string, SessionData>>(new Map([[initialDate, initialSession]]))
  const currentDateRef = useRef(initialDate)
  const pendingDateRef = useRef<string | null>(null)

  const [currentDate, setCurrentDate] = useState(initialDate)
  const [session, setSession] = useState<SessionData>(initialSession)
  const [loading, setLoading] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const navigateTo = useCallback(async (date: string) => {
    if (date > todayJST || date === currentDateRef.current) return
    currentDateRef.current = date

    const cached = cache.current.get(date)
    if (cached !== undefined) {
      setCurrentDate(date)
      setSession(cached)
      setLoading(false)
      return
    }

    pendingDateRef.current = date
    setCurrentDate(date)
    setLoading(true)

    const data = await getSessionForDate(date)
    cache.current.set(date, data)

    if (pendingDateRef.current === date) {
      pendingDateRef.current = null
      setSession(data)
      setLoading(false)
    }

    // Pre-fetch ±1 and ±2 in background
    ;[addDays(date, -1), addDays(date, 1), addDays(date, -2), addDays(date, 2)]
      .filter(d => d <= todayJST && !cache.current.has(d))
      .forEach(d => { getSessionForDate(d).then(s => { cache.current.set(d, s) }) })
  }, [todayJST])

  // Pre-fetch adjacent dates on first load
  useEffect(() => {
    ;[addDays(initialDate, -1), addDays(initialDate, 1), addDays(initialDate, -2), addDays(initialDate, 2)]
      .filter(d => d <= todayJST && !cache.current.has(d))
      .forEach(d => { getSessionForDate(d).then(s => { cache.current.set(d, s) }) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Swipe detection ── */

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Require horizontal dominance + minimum distance
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return

    if (dx > 0) {
      navigateTo(addDays(currentDate, -1))
    } else {
      const next = addDays(currentDate, 1)
      if (next <= todayJST) navigateTo(next)
    }
  }

  const prevDate = addDays(currentDate, -1)
  const nextDate = addDays(currentDate, 1)
  const isNextDisabled = nextDate > todayJST

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {loading ? (
        <RecordSkeleton
          date={currentDate}
          locale={locale}
          onPrev={() => navigateTo(prevDate)}
          onNext={() => { if (!isNextDisabled) navigateTo(nextDate) }}
          isNextDisabled={isNextDisabled}
        />
      ) : (
        <WorkoutRecorder
          key={currentDate}
          date={currentDate}
          existingSessionId={session?.id}
          existingExercises={session?.exercises}
          existingTitle={session?.title}
          onNavigate={navigateTo}
        />
      )}
    </div>
  )
}
