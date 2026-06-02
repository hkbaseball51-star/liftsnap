'use client'

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { X, BookImage, Download, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { BodyLogPhotoEntry, BodyLogDetail } from '@/actions/bodyLog'
import { getBodyLogEntryDetail } from '@/actions/bodyLog'
import { t, type Locale } from '@/lib/i18n'
import { MUSCLE_COLORS } from '@/components/home/TrainingCalendar'
import { formatVolume } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const AUTO_ADVANCE_MS = 5000
const DEV = process.env.NODE_ENV === 'development'

// ─── Pure helpers ─────────────────────────────────────────────────────────────
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

async function downloadHighlightImage(url: string | null, date: string): Promise<void> {
  if (!url) return
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `repra-progress-${date}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

// ─── ProgressBars — CSS animation only, no JS per-tick ───────────────────────
const ProgressBars = memo(function ProgressBars({
  count, index, paused, onComplete,
}: {
  count: number; index: number; paused: boolean; onComplete: () => void
}) {
  return (
    <div
      className="absolute left-0 right-0 flex gap-1 px-3"
      style={{ top: 'calc(env(safe-area-inset-top) + 10px)', pointerEvents: 'none' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full overflow-hidden"
          style={{ height: 2, background: 'rgba(255,255,255,0.22)' }}
        >
          {i < index ? (
            <div style={{ height: '100%', width: '100%', background: '#fff' }} />
          ) : i === index ? (
            // key={index} resets the animation when index changes
            <div
              key={index}
              style={{
                height: '100%',
                background: '#fff',
                transformOrigin: 'left center',
                animation: `highlight-advance ${AUTO_ADVANCE_MS}ms linear forwards`,
                animationPlayState: paused ? 'paused' : 'running',
              }}
              onAnimationEnd={onComplete}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
})

// ─── DetailSheet — only mounted when showDetail=true ─────────────────────────
// No transition wrapper needed — CSS @keyframes detail-in handles enter animation.
// Workout info (badge, exercise, stats) is hidden until this mounts.

type DetailSheetProps = {
  date: string
  detail: BodyLogDetail | null
  loading: boolean
  locale: Locale
  isToday: boolean
  onClose: () => void
}

const DetailSheet = memo(function DetailSheet({
  date, detail, loading, locale, isToday, onClose,
}: DetailSheetProps) {
  const muscleKey   = detail ? normalizeForDisplay(detail.muscleGroup) : null
  const muscleColor = (muscleKey ? MUSCLE_COLORS[muscleKey] : null) ?? '#666666'
  const hasStats    = !!(detail && (detail.totalSets > 0 || detail.totalVolume > 0))

  return (
    <div
      className="rounded-2xl px-4 py-4 mx-4"
      style={{
        background: 'rgba(8,8,8,0.97)',
        border: '1px solid rgba(255,255,255,0.10)',
        animation: 'detail-in 0.15s ease-out',
      }}
    >
      {/* Header: badge + date + close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {muscleKey !== null && (
            <div
              className="rounded-full px-2.5 py-0.5"
              style={{ background: `${muscleColor}22`, border: `1px solid ${muscleColor}55` }}
            >
              <span style={{
                fontSize: 10, fontWeight: 900, color: muscleColor,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {muscleKey}
              </span>
            </div>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.04em' }}>
            {formatDate(date, locale)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)', marginLeft: 8 }}
        >
          <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>

      {/* Spinner while fetching */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div style={{
            width: 20, height: 20,
            border: '2px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(255,255,255,0.60)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      )}

      {/* Workout stats — only when loaded */}
      {!loading && detail?.mainExercise && (
        <p style={{
          fontSize: 16, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.01em', marginBottom: hasStats ? 10 : 0, lineHeight: 1.2,
        }}>
          {getExerciseDisplayName(detail.mainExercise)}
        </p>
      )}
      {!loading && hasStats && (
        <div className="flex gap-5 mb-3">
          {detail!.totalSets > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', marginBottom: 2 }}>SETS</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{detail!.totalSets}</p>
            </div>
          )}
          {detail!.totalVolume > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', marginBottom: 2 }}>VOLUME</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{formatVolume(detail!.totalVolume)}</p>
            </div>
          )}
        </div>
      )}

      {isToday && (
        <Link
          href={`/share?type=today&date=${date}`}
          className="block w-full py-3 rounded-xl text-center font-black text-sm"
          style={{ background: '#ED742F', color: '#fff', marginTop: (hasStats || loading) ? 0 : 12 }}
        >
          {t(locale, 'bodyLog.createStory')}
        </Link>
      )}
    </div>
  )
})

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  entries: BodyLogPhotoEntry[]
  signedUrls: Record<string, string>
  thumbnailUrls: Record<string, string>
  initialIndex: number
  locale: Locale
  todayStr: string
}

export default function BodyLogHighlights({
  entries, signedUrls, thumbnailUrls, initialIndex, locale, todayStr,
}: Props) {
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [index, setIndex]               = useState(initialIndex)
  const [showDetail, setShowDetail]     = useState(false)
  const [firstLoaded, setFirstLoaded]   = useState(false)
  const [activeUrl, setActiveUrl]       = useState<string | null>(
    () => thumbnailUrls[entries[initialIndex]?.date ?? ''] ?? signedUrls[entries[initialIndex]?.date ?? ''] ?? null
  )
  const [currentDetail, setCurrentDetail] = useState<BodyLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const touchStartRef     = useRef<number | null>(null)
  const fetchSeqRef       = useRef(0)
  // Per-session detail cache: undefined=never fetched, null=fetched+empty
  const detailCache       = useRef<Map<string, BodyLogDetail | null>>(new Map())
  // Dev: render/fetch counters
  const renderCountRef    = useRef(0)
  const detailFetchCount  = useRef(0)

  // ── Dev render tracking ────────────────────────────────────────────────────
  if (DEV) renderCountRef.current++

  // ── Derived values (useMemo to avoid recompute on unrelated renders) ───────
  const entry       = useMemo(() => entries[index] ?? null, [entries, index])
  const isToday     = entry?.date === todayStr
  const fullUrl     = useMemo(() => entry ? (signedUrls[entry.date] ?? null) : null, [entry, signedUrls])
  const thumbnailUrl = useMemo(() => entry ? (thumbnailUrls[entry.date] ?? null) : null, [entry, thumbnailUrls])

  // ── Dev: log on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!DEV) return
    const fullCount  = Object.keys(signedUrls).length
    const thumbCount = Object.keys(thumbnailUrls).length
    console.log(`[Highlight] Mounted: ${entries.length} entries, ${fullCount} full URLs, ${thumbCount} thumb URLs`)
    return () => { console.log('[Highlight] Unmounted') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dev: log on index change ──────────────────────────────────────────────
  useEffect(() => {
    if (!DEV) return
    console.log(`[Highlight] → index ${index} (render #${renderCountRef.current})`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // ── Reset display URL to thumbnail on navigation ──────────────────────────
  useEffect(() => {
    setActiveUrl(thumbnailUrl ?? fullUrl)
    setFirstLoaded(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.date])

  // ── Progressive full-image load — swap from thumbnail when ready ──────────
  useEffect(() => {
    if (!fullUrl || activeUrl === fullUrl) return
    const img = new window.Image()
    img.onload = () => setActiveUrl(fullUrl)
    img.src = fullUrl
    return () => {
      // Cancel in-flight load if user navigates before it completes
      img.onload = null
      img.src = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullUrl, entry?.date])

  // ── Preload thumbnails for ±1 adjacent only ───────────────────────────────
  useEffect(() => {
    for (const offset of [-1, 1]) {
      const adj = entries[index + offset]
      if (!adj) continue
      // Prefer thumbnail; only preload one image per adjacent slot
      const url = thumbnailUrls[adj.date] ?? signedUrls[adj.date]
      if (!url) continue
      const img = new window.Image()
      img.src = url
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'ArrowLeft')  goToPrev()
      if (e.key === 'Escape')     router.back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // handler captures goToNext/goPrev via closure — recreated on each render is fine

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToNext = useCallback(() => {
    fetchSeqRef.current++
    setIndex(i => Math.min(i + 1, entries.length - 1))
    setShowDetail(false)
    setCurrentDetail(null)
    setDetailLoading(false)
  }, [entries.length])

  const goToPrev = useCallback(() => {
    fetchSeqRef.current++
    setIndex(i => Math.max(i - 1, 0))
    setShowDetail(false)
    setCurrentDetail(null)
    setDetailLoading(false)
  }, [])

  const closeDetail = useCallback(() => setShowDetail(false), [])

  // ── Detail: open with cache ────────────────────────────────────────────────
  const openDetail = useCallback(async (sessionId: string) => {
    setShowDetail(true)

    // Serve from cache if available
    const cached = detailCache.current.get(sessionId)
    if (cached !== undefined) {
      setCurrentDetail(cached)
      return
    }

    if (DEV) {
      detailFetchCount.current++
      console.log(`[Highlight] Detail fetch #${detailFetchCount.current}: ${sessionId.slice(0, 8)}…`)
    }

    const seq = ++fetchSeqRef.current
    setDetailLoading(true)
    try {
      const detail = await getBodyLogEntryDetail(sessionId)
      if (fetchSeqRef.current !== seq) return
      detailCache.current.set(sessionId, detail)
      setCurrentDetail(detail)
    } catch {
      if (fetchSeqRef.current !== seq) return
    } finally {
      if (fetchSeqRef.current === seq) setDetailLoading(false)
    }
  }, [])

  const toggleDetail = useCallback(() => {
    if (showDetail) { closeDetail(); return }
    if (entry) openDetail(entry.sessionId)
  }, [showDetail, closeDetail, openDetail, entry])

  // ── Touch handlers ────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (start === null) return
    touchStartRef.current = null
    const dx = e.changedTouches[0].clientX - start
    if (Math.abs(dx) > 40) {
      if (dx < 0) goToNext(); else goToPrev()
    }
  }, [goToNext, goToPrev])

  const handleAnimationComplete = useCallback(() => {
    if (index < entries.length - 1) goToNext()
  }, [goToNext, index, entries.length])

  // Stable image load callback — no deps needed
  const handleImageLoad = useCallback(() => {
    setFirstLoaded(true)
    if (DEV) console.log('[Highlight] Image loaded')
  }, [])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#050505' }}>
        <button
          className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)', background: 'rgba(255,255,255,0.12)' }}
          onClick={() => router.back()}
        >
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

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: '#000', touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Full-screen photo ── */}
      {activeUrl ? (
        <>
          {!firstLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <div style={{
                width: 28, height: 28,
                border: '2.5px solid rgba(255,255,255,0.20)',
                borderTopColor: 'rgba(255,255,255,0.75)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt=""
            onLoad={handleImageLoad}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              objectPosition: 'center center',
            }}
          />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#0d0d0d' }} />
      )}

      {/* ── Top gradient ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 110,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Bottom gradient ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 130,
        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Progress bars — CSS animation, zero setState per tick ── */}
      <ProgressBars
        count={entries.length}
        index={index}
        paused={showDetail}
        onComplete={handleAnimationComplete}
      />

      {/* ── Top bar: close + date + count — z-index above gesture buttons ── */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-4"
        style={{ top: 'calc(env(safe-area-inset-top) + 22px)', zIndex: 30 }}
      >
        {/* 44×44 tap target, icon stays 16px */}
        <button
          className="w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.40)' }}
          onClick={(e) => {
            e.stopPropagation()
            if (DEV) console.log('[Highlight] Close tapped')
            router.back()
          }}
        >
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
        <div style={{ width: 44 }} />
      </div>

      {/* ── Tap zones: Prev 30% | Toggle 40% | Next 30% — z-index below top bar ── */}
      <button
        aria-label="Previous"
        className="absolute left-0 top-0 h-full"
        style={{ width: '30%', background: 'transparent', zIndex: 10 }}
        onClick={goToPrev}
      />
      <button
        aria-label="Next"
        className="absolute right-0 top-0 h-full"
        style={{ width: '30%', background: 'transparent', zIndex: 10 }}
        onClick={goToNext}
      />
      <button
        aria-label="Toggle detail"
        className="absolute top-0 h-full"
        style={{ left: '30%', width: '40%', background: 'transparent', zIndex: 10 }}
        onClick={toggleDetail}
      />

      {/* ── Bottom section ── */}
      <div
        className="absolute left-0 right-0"
        style={{ bottom: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        {/*
          DetailSheet is CONDITIONALLY MOUNTED — not just hidden.
          When closed: zero DOM nodes, zero renders, zero CSS paint cost.
          CSS @keyframes detail-in handles the enter animation on mount.
          Workout info (muscle badge, exercise name, stats) is never in the DOM when closed.
        */}
        {showDetail && (
          <div style={{ marginBottom: 10 }}>
            <DetailSheet
              date={entry.date}
              detail={currentDetail}
              loading={detailLoading}
              locale={locale}
              isToday={isToday}
              onClose={closeDetail}
            />
          </div>
        )}

        {/* Action bar: always visible */}
        <div className="flex items-center gap-2.5 px-4">
          <button
            onClick={toggleDetail}
            className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 font-black text-sm"
            style={{ background: '#ED742F', color: '#fff' }}
          >
            {showDetail
              ? <><ChevronDown size={15} />{locale === 'ja' ? '閉じる' : 'Close'}</>
              : <><ChevronUp size={15} />{locale === 'ja' ? '詳細を表示' : 'View Details'}</>
            }
          </button>

          <button
            onClick={() => downloadHighlightImage(fullUrl, entry.date)}
            aria-label={locale === 'ja' ? '保存' : 'Save image'}
            className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#ED742F', color: '#fff' }}
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
