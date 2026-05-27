'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'

export type HeroData = {
  bestLift: {
    exerciseName: string
    bestWeight: number
    bestReps: number
    est1rm: number
    prStatus: 'new_pr' | 'first' | 'matched' | 'below'
    prevPR: number | null
  } | null
  todayEffort: {
    totalVolume: number
    totalSets: number
    exercises: { name: string; muscle: string; sets: number }[]
    durationSeconds: number
  } | null
  muscleFocus: {
    muscles: { name: string; exercises: string[] }[]
  } | null
  prCard: {
    exerciseName: string
    newPR: number
    prevPR: number
    improvement: number
  } | null
  lastSessionId: string | null
}

/* ── Shared primitives ────────────────────────────────────── */

function ShareBtn({ sessionId }: { sessionId: string | null }) {
  return (
    <Link
      href={sessionId ? `/share?session=${sessionId}` : '/record'}
      className="w-full flex items-center justify-center gap-1.5 rounded-xl"
      style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.01em',
      }}>
      <Share2 size={13} strokeWidth={1.5} />
      Share Story
    </Link>
  )
}

function CardLabel({ children, orange }: { children: React.ReactNode; orange?: boolean }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.08em',
      color: orange ? '#ff6b00' : 'rgba(255,255,255,0.3)',
      textTransform: 'uppercase' as const,
    }}>
      {children}
    </span>
  )
}

/* ── Slide 1: BEST LIFT ────────────────────────────────────── */
function BestLiftSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['bestLift']>
  sessionId: string | null
}) {
  const isNew = d.prStatus === 'new_pr'
  const isFirst = d.prStatus === 'first'
  const improvement = isNew && d.prevPR !== null
    ? Math.round((d.bestWeight - d.prevPR) * 10) / 10
    : null

  return (
    <div className="rounded-2xl flex flex-col"
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 20,
        minHeight: 210,
      }}>

      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <CardLabel>Best Lift</CardLabel>
        {(isNew || isFirst) && (
          <CardLabel orange>{isNew ? 'New PR ↑' : 'First Set'}</CardLabel>
        )}
      </div>

      {/* Exercise name */}
      <p className="mb-3" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400 }}>
        {d.exerciseName}
      </p>

      {/* Main number */}
      <div className="flex items-baseline gap-2 flex-1 mb-3">
        <span style={{
          fontSize: 58,
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontFamily: 'var(--font-mono)',
        }}>
          {d.bestWeight}
        </span>
        <div>
          <span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.2)' }}>kg</span>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginTop: 2 }}>
            × {d.bestReps}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>reps</span>
          </p>
        </div>
      </div>

      {/* Small stats */}
      <div className="flex items-center gap-3 mb-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.2)' }}>
            EST. 1RM
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
            {d.est1rm} kg
          </span>
        </div>
        {improvement !== null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
            +{improvement} kg
          </span>
        )}
      </div>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Slide 2: TODAY'S EFFORT ──────────────────────────────── */
function TodayEffortSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['todayEffort']>
  sessionId: string | null
}) {
  const h = Math.floor(d.durationSeconds / 3600)
  const m = Math.floor((d.durationSeconds % 3600) / 60)
  const dur = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : null

  const volNum = d.totalVolume >= 10000
    ? `${(d.totalVolume / 1000).toFixed(1)}k`
    : Math.round(d.totalVolume).toLocaleString()
  const volUnit = d.totalVolume >= 10000 ? '' : 'kg'

  const metaItems = [
    `${d.totalSets} sets`,
    `${d.exercises.length} exercises`,
    ...(dur ? [dur] : []),
  ]

  return (
    <div className="rounded-2xl flex flex-col"
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 20,
        minHeight: 210,
      }}>

      <div className="mb-3">
        <CardLabel>Today's Effort</CardLabel>
      </div>

      {/* Volume */}
      <div className="flex-1 mb-2">
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
          TOTAL VOLUME
        </p>
        <div className="flex items-baseline gap-1">
          <span style={{
            fontSize: 46,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-mono)',
          }}>
            {volNum}
          </span>
          <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.2)' }}>
            {volUnit}
          </span>
        </div>
      </div>

      {/* Meta */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginBottom: 10 }}>
        {metaItems.join('  ·  ')}
      </p>

      {/* Exercise list */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 400, lineHeight: 1.7, marginBottom: 14 }}>
        {d.exercises.slice(0, 4).map(e => e.name).join('  ·  ')}
      </p>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Slide 3: MUSCLE FOCUS ────────────────────────────────── */
function MuscleFocusSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['muscleFocus']>
  sessionId: string | null
}) {
  return (
    <div className="rounded-2xl flex flex-col"
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 20,
        minHeight: 210,
      }}>

      <div className="mb-4">
        <CardLabel>Muscle Focus</CardLabel>
      </div>

      <div className="flex-1 mb-4" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {d.muscles.slice(0, 4).map(m => (
          <div key={m.name}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', marginBottom: 4 }}>
              {m.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {m.exercises.slice(0, 3).map(ex => (
                <p key={ex} style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                  {ex}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Slide 4: PR CARD ─────────────────────────────────────── */
function PRCardSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['prCard']>
  sessionId: string | null
}) {
  return (
    <div className="rounded-2xl flex flex-col"
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,107,0,0.2)',
        padding: 20,
        minHeight: 210,
      }}>

      <div className="flex items-center justify-between mb-3">
        <CardLabel orange>Personal Record</CardLabel>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400, marginBottom: 16 }}>
        {d.exerciseName}
      </p>

      <div className="flex items-end gap-5 flex-1 mb-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>
            PREVIOUS
          </p>
          <span style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.2)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.02em',
          }}>
            {d.prevPR}
            <span style={{ fontSize: 14, marginLeft: 2, color: 'rgba(255,255,255,0.15)' }}>kg</span>
          </span>
        </div>

        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.15)', paddingBottom: 4 }}>→</span>

        <div>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#ff6b00', marginBottom: 6 }}>
            NEW BEST
          </p>
          <span style={{
            fontSize: 52,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: 'var(--font-mono)',
          }}>
            {d.newPR}
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>kg</span>
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12, fontWeight: 500, color: '#22c55e', marginBottom: 14 }}>
        +{d.improvement} kg improvement
      </p>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyHeroCard() {
  return (
    <div className="rounded-2xl"
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}>
      <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>
        HERO CARD
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
        Log your first lift
      </p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginBottom: 28, lineHeight: 1.5 }}>
        Your best set will appear here<br />after your workout
      </p>
      <Link href="/record"
        className="rounded-xl"
        style={{
          padding: '12px 28px',
          background: '#ff6b00',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
        }}>
        Start Workout
      </Link>
    </div>
  )
}

/* ── Main carousel ────────────────────────────────────────── */
export default function HeroCarousel({ data }: { data: HeroData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const slides: React.ReactNode[] = []
  if (data.bestLift) slides.push(<BestLiftSlide key="best" d={data.bestLift} sessionId={data.lastSessionId} />)
  if (data.todayEffort) slides.push(<TodayEffortSlide key="effort" d={data.todayEffort} sessionId={data.lastSessionId} />)
  if (data.muscleFocus) slides.push(<MuscleFocusSlide key="muscle" d={data.muscleFocus} sessionId={data.lastSessionId} />)
  if (data.prCard) slides.push(<PRCardSlide key="pr" d={data.prCard} sessionId={data.lastSessionId} />)

  if (slides.length === 0) return <EmptyHeroCard />

  return (
    <div>
      <div
        ref={ref}
        className="flex no-scrollbar"
        style={{ overflowX: 'scroll', scrollSnapType: 'x mandatory' }}
        onScroll={() => {
          if (!ref.current) return
          setActive(Math.round(ref.current.scrollLeft / ref.current.offsetWidth))
        }}>
        {slides.map((slide, i) => (
          <div key={i} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: '100%' }}>
            {slide}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: active === i ? 16 : 5,
                height: 5,
                background: active === i ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
