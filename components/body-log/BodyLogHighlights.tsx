'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, BookImage } from 'lucide-react'
import Link from 'next/link'
import type { BodyLogEntry } from '@/actions/bodyLog'
import { t, type Locale } from '@/lib/i18n'
import { MUSCLE_COLORS } from '@/components/home/TrainingCalendar'
import { formatVolume } from '@/lib/utils'

const MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function formatDate(dateStr: string, locale: Locale): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (locale === 'ja') return `${y}年${m}月${d}日`
  return `${MONTH_ABBREV[m - 1]} ${d}, ${y}`
}

function normalizeForDisplay(group: string): string {
  const g = group.toLowerCase().trim()
  if (g === 'chest' || g === 'chest & triceps') return 'chest'
  if (['back', 'back & biceps', 'lats', 'traps', 'rear delts'].includes(g)) return 'back'
  if (['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'lower body'].includes(g)) return 'legs'
  if (['shoulders', 'delts'].includes(g)) return 'shoulders'
  if (['arms', 'biceps', 'triceps', 'forearms'].includes(g)) return 'arms'
  return 'full body'
}

function getExerciseDisplayName(name: string, locale: Locale): string {
  if (!name) return ''
  // Capitalize first letter of each word
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

type Props = {
  entries: BodyLogEntry[]
  signedUrls: Record<string, string>
  initialIndex: number
  locale: Locale
  todayStr: string
}

export default function BodyLogHighlights({ entries, signedUrls, initialIndex, locale, todayStr }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(initialIndex)
  const [showDetail, setShowDetail] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [progress, setProgress] = useState(0)
  const AUTO_ADVANCE_MS = 5000

  const entry = entries[index] ?? null
  const isToday = entry?.date === todayStr

  const goNext = useCallback(() => {
    setIndex(i => Math.min(i + 1, entries.length - 1))
    setShowDetail(false)
    setProgress(0)
  }, [entries.length])

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(i - 1, 0))
    setShowDetail(false)
    setProgress(0)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, router])

  // Auto-advance progress bar
  useEffect(() => {
    if (showDetail || entries.length === 0) return
    setProgress(0)
    const tick = 50
    const step = (tick / AUTO_ADVANCE_MS) * 100
    progressTimerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (index < entries.length - 1) {
            setIndex(i => i + 1)
            setShowDetail(false)
          }
          return 0
        }
        return p + step
      })
    }, tick)
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, showDetail, entries.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const dx = e.changedTouches[0].clientX - touchStart
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext()
      else goPrev()
    }
    setTouchStart(null)
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#050505' }}>
        <button
          className="absolute top-14 left-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onClick={() => router.back()}>
          <X size={18} style={{ color: '#fff' }} />
        </button>
        <BookImage size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 20 }} />
        <p className="text-base font-black text-white mb-2">{t(locale, 'bodyLog.empty')}</p>
        <p className="text-sm text-center px-8" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {t(locale, 'bodyLog.emptyHint')}
        </p>
      </div>
    )
  }

  if (!entry) return null
  const signedUrl = signedUrls[entry.date] ?? null
  const muscleColor = MUSCLE_COLORS[normalizeForDisplay(entry.muscleGroup)] ?? '#ec4899'

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: '#000', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-screen photo */}
      {signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={signedUrl}
          src={signedUrl}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${muscleColor}22 0%, #111 100%)`,
          }}
        />
      )}

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Progress bars */}
      <div
        className="absolute left-0 right-0 flex gap-1 px-3"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {entries.map((_, i) => (
          <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: 2, background: 'rgba(255,255,255,0.25)' }}>
            <div
              style={{
                height: '100%',
                background: '#fff',
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                transition: i === index ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar: back + date */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-4"
        style={{ top: 'calc(env(safe-area-inset-top) + 24px)' }}
      >
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
          onClick={() => router.back()}>
          <X size={16} style={{ color: '#fff' }} />
        </button>
        <div className="text-center">
          <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            {formatDate(entry.date, locale)}
          </p>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
            {index + 1} / {entries.length}
          </p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Left / Right tap zones */}
      <button
        aria-label="Previous"
        className="absolute left-0 top-0 h-full"
        style={{ width: '30%', background: 'transparent' }}
        onClick={goPrev}
      />
      <button
        aria-label="Next"
        className="absolute right-0 top-0 h-full"
        style={{ width: '30%', background: 'transparent' }}
        onClick={goNext}
      />

      {/* Center tap: toggle detail */}
      <button
        aria-label="Toggle detail"
        className="absolute top-0 h-full"
        style={{ left: '30%', width: '40%', background: 'transparent' }}
        onClick={() => setShowDetail(d => !d)}
      />

      {/* Left / Right arrow indicators (subtle) */}
      {index > 0 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronLeft size={24} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </div>
      )}
      {index < entries.length - 1 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight size={24} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </div>
      )}

      {/* Bottom detail card */}
      <div
        className="absolute left-0 right-0 px-4"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          transition: 'opacity 0.2s, transform 0.2s',
          opacity: showDetail ? 1 : 0.85,
          transform: showDetail ? 'translateY(0)' : 'translateY(6px)',
          pointerEvents: 'none',
        }}
      >
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            background: showDetail ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          {/* Muscle badge + main exercise */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="rounded-full px-2 py-0.5"
              style={{
                background: `${muscleColor}22`,
                border: `1px solid ${muscleColor}55`,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 900, color: muscleColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {normalizeForDisplay(entry.muscleGroup)}
              </span>
            </div>
          </div>

          <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: 4, lineHeight: 1.2 }}>
            {getExerciseDisplayName(entry.mainExercise, locale)}
          </p>

          {showDetail && (
            <div className="flex gap-4 mt-3 mb-3">
              <div>
                <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.07em', marginBottom: 2 }}>SETS</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{entry.totalSets}</p>
              </div>
              {entry.totalVolume > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.07em', marginBottom: 2 }}>VOLUME</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{formatVolume(entry.totalVolume)}</p>
                </div>
              )}
            </div>
          )}

          {/* Create Story button (today only) */}
          {isToday && showDetail && (
            <Link
              href={`/share?type=today&date=${entry.date}`}
              className="block w-full py-3 rounded-xl text-center font-black text-sm mt-2"
              style={{ background: '#ff6b00', color: '#fff', boxShadow: '0 4px 16px rgba(255,107,0,0.35)' }}
            >
              {t(locale, 'bodyLog.createStory')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
