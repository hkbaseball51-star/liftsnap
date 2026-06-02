'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, BookImage, Download, ChevronUp, ChevronDown } from 'lucide-react'
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

function normalizeForDisplay(group: string): string | null {
  if (!group) return null
  const g = group.toLowerCase().trim()
  if (g === 'chest' || g === 'chest & triceps') return 'chest'
  if (['back', 'back & biceps', 'lats', 'traps', 'rear delts'].includes(g)) return 'back'
  if (['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'lower body'].includes(g)) return 'legs'
  if (['shoulders', 'delts'].includes(g)) return 'shoulders'
  if (['arms', 'biceps', 'triceps', 'forearms'].includes(g)) return 'arms'
  if (g === 'full body' || g === 'full_body') return 'full body'
  return null
}

function getExerciseDisplayName(name: string): string {
  if (!name) return ''
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

/** Download the currently viewed highlight photo to the user's device.
 *  Falls back to opening in a new tab if CORS prevents blob creation. */
async function downloadHighlightImage(url: string | null, date: string): Promise<void> {
  if (!url) return
  const filename = `repra-progress-${date}.png`
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    // CORS or network error — open in new tab as fallback
    window.open(url, '_blank', 'noopener')
  }
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

  // Auto-advance progress bar (pauses when detail is open)
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

  // ── Empty state ──────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#050505' }}>
        <button
          className="absolute top-14 left-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          onClick={() => router.back()}>
          <X size={18} style={{ color: '#fff' }} />
        </button>
        <BookImage size={48} style={{ color: 'rgba(255,255,255,0.60)', marginBottom: 20 }} />
        <p className="text-base font-black text-white mb-2">{t(locale, 'bodyLog.empty')}</p>
        <p className="text-sm text-center px-8" style={{ color: 'rgba(255,255,255,0.58)' }}>
          {t(locale, 'bodyLog.emptyHint')}
        </p>
      </div>
    )
  }

  if (!entry) return null
  const signedUrl = signedUrls[entry.date] ?? null
  const muscleKey = normalizeForDisplay(entry.muscleGroup)
  const muscleColor = (muscleKey ? MUSCLE_COLORS[muscleKey] : null) ?? '#666666'

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: '#000', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Full-screen photo ── */}
      {signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={signedUrl}
          src={signedUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${muscleColor}22 0%, #111 100%)` }} />
      )}

      {/* ── Gradient overlays ── */}
      {/* Top gradient for readability of progress bars & back button */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }} />
      {/* Bottom gradient so action bar & detail card are always readable */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.60) 45%, transparent 100%)' }} />

      {/* ── Progress bars ── */}
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

      {/* ── Top bar: close + date + count ── */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-4"
        style={{ top: 'calc(env(safe-area-inset-top) + 24px)' }}
      >
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)' }}
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

      {/* ── Left / Right tap zones (30% each side) ── */}
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
      {/* Center tap: pause auto-advance / toggle detail */}
      <button
        aria-label="Toggle detail"
        className="absolute top-0 h-full"
        style={{ left: '30%', width: '40%', background: 'transparent' }}
        onClick={() => setShowDetail(d => !d)}
      />

      {/* ── Prev / Next arrow indicators ── */}
      {index > 0 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronLeft size={24} style={{ color: 'rgba(255,255,255,0.56)' }} />
        </div>
      )}
      {index < entries.length - 1 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight size={24} style={{ color: 'rgba(255,255,255,0.56)' }} />
        </div>
      )}

      {/* ── Bottom section (stacked from bottom up) ── */}
      {/* stopPropagation prevents swipe gestures from firing inside this area */}
      <div
        className="absolute left-0 right-0"
        style={{ bottom: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >

        {/* ── Detail card (slides up when open) ── */}
        <div
          style={{
            paddingInline: 16,
            marginBottom: 12,
            transition: 'opacity 0.25s, transform 0.25s',
            opacity: showDetail ? 1 : 0,
            transform: showDetail ? 'translateY(0)' : 'translateY(12px)',
            pointerEvents: showDetail ? 'auto' : 'none',
          }}
        >
          <div
            className="rounded-2xl px-4 py-4"
            style={{
              background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {/* Muscle badge */}
            <div className="flex items-center gap-2 mb-2.5">
              {muscleKey !== null && (
                <div
                  className="rounded-full px-2.5 py-0.5"
                  style={{ background: `${muscleColor}22`, border: `1px solid ${muscleColor}55` }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, color: muscleColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {muscleKey}
                  </span>
                </div>
              )}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.04em' }}>
                {formatDate(entry.date, locale)}
              </span>
            </div>

            {/* Main exercise */}
            {entry.mainExercise && (
              <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: 10, lineHeight: 1.2 }}>
                {getExerciseDisplayName(entry.mainExercise)}
              </p>
            )}

            {/* Stats row */}
            <div className="flex gap-5 mb-3">
              <div>
                <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', marginBottom: 2 }}>SETS</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{entry.totalSets}</p>
              </div>
              {entry.totalVolume > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', marginBottom: 2 }}>VOLUME</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{formatVolume(entry.totalVolume)}</p>
                </div>
              )}
            </div>

            {/* Create Story button — today only */}
            {isToday && (
              <Link
                href={`/share?type=today&date=${entry.date}`}
                className="block w-full py-3 rounded-xl text-center font-black text-sm"
                style={{ background: '#ED742F', color: '#fff', boxShadow: '0 4px 16px rgba(237,116,47,0.35)' }}
              >
                {t(locale, 'bodyLog.createStory')}
              </Link>
            )}
          </div>
        </div>

        {/* ── Muscle label + exercise name (always visible, collapses when detail opens) ── */}
        {!showDetail && (entry.mainExercise || muscleKey !== null) && (
          <div className="px-4 mb-3">
            {muscleKey !== null && (
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="rounded-full px-2 py-0.5"
                  style={{ background: `${muscleColor}22`, border: `1px solid ${muscleColor}55` }}
                >
                  <span style={{ fontSize: 9, fontWeight: 900, color: muscleColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {muscleKey}
                  </span>
                </div>
              </div>
            )}
            {entry.mainExercise && (
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {getExerciseDisplayName(entry.mainExercise)}
              </p>
            )}
          </div>
        )}

        {/* ── Action bar: [View Details]  [Save] ── */}
        <div className="flex items-center gap-2.5 px-4">
          {/* Primary CTA: view/hide detail */}
          <button
            onClick={() => setShowDetail(d => !d)}
            className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 font-black text-sm active:opacity-75 transition-opacity"
            style={{ background: '#ED742F', color: '#fff', boxShadow: '0 4px 18px rgba(237,116,47,0.40)' }}
          >
            {showDetail
              ? <><ChevronDown size={15} />{locale === 'ja' ? '閉じる' : 'Close'}</>
              : <><ChevronUp size={15} />{locale === 'ja' ? '詳細を表示' : 'View Details'}</>
            }
          </button>

          {/* Save / Download button */}
          <button
            onClick={() => downloadHighlightImage(signedUrl, entry.date)}
            aria-label={locale === 'ja' ? '保存' : 'Save image'}
            className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-75 transition-opacity"
            style={{ background: '#ED742F', color: '#fff', boxShadow: '0 4px 18px rgba(237,116,47,0.40)' }}
          >
            <Download size={18} />
          </button>
        </div>

      </div>
    </div>
  )
}
