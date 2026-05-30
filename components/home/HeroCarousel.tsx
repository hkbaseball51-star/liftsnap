'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel } from '@/lib/units'

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

/* ── Design tokens ────────────────────────────────────────── */
const CARD = {
  background: '#181818',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 20,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  minHeight: 220,
}

/* ── Shared primitives ────────────────────────────────────── */
function Label({ children, orange }: { children: React.ReactNode; orange?: boolean }) {
  return (
    <span style={{
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.08em',
      color: orange ? '#FF6B00' : 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase' as const,
    }}>
      {children}
    </span>
  )
}

function ShareBtn({ sessionId }: { sessionId: string | null }) {
  return (
    <Link
      href={sessionId ? `/share?session=${sessionId}` : '/record'}
      className="w-full flex items-center justify-center gap-1.5 rounded-xl"
      style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
      <Share2 size={13} strokeWidth={1.5} />
      Share Story
    </Link>
  )
}

/* ── Slide 1: BEST LIFT ────────────────────────────────────── */
function BestLiftSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['bestLift']>
  sessionId: string | null
}) {
  const { unit } = useWeightUnit()
  const isNew = d.prStatus === 'new_pr'
  const isFirst = d.prStatus === 'first'
  const improvement = isNew && d.prevPR !== null
    ? Math.round((d.bestWeight - d.prevPR) * 10) / 10
    : null
  const unitLabel = weightUnitLabel(unit)

  return (
    <div style={CARD}>
      <div className="flex items-center justify-between mb-3">
        <Label orange>Best Lift</Label>
        {(isNew || isFirst) && <Label orange>{isNew ? 'New PR ↑' : 'First Set'}</Label>}
      </div>

      <p className="mb-3" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 400, letterSpacing: '-0.01em' }}>
        {d.exerciseName}
      </p>

      <div className="flex items-baseline gap-2 flex-1 mb-3">
        <span style={{
          fontSize: 60,
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontFamily: 'var(--font-mono)',
        }}>
          {toDisplayWeight(d.bestWeight, unit)}
        </span>
        <div>
          <span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>{unitLabel}</span>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginTop: 2 }}>
            × {d.bestReps}
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>reps</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 10 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)' }}>
            EST. 1RM
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.62)', fontFamily: 'var(--font-mono)' }}>
            {toDisplayWeight(d.est1rm, unit)} {unitLabel}
          </span>
        </div>
        {improvement !== null && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
            +{toDisplayWeight(improvement, unit)} {unitLabel}
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
  const { unit } = useWeightUnit()
  const h = Math.floor(d.durationSeconds / 3600)
  const m = Math.floor((d.durationSeconds % 3600) / 60)
  const dur = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : null

  const displayVol = unit === 'lbs'
    ? Math.round(d.totalVolume * 2.20462)
    : Math.round(d.totalVolume)
  const threshold = unit === 'lbs' ? 10000 : 10000
  const volNum = displayVol >= threshold
    ? `${(displayVol / 1000).toFixed(1)}k`
    : displayVol.toLocaleString()
  const volUnit = displayVol >= threshold ? '' : weightUnitLabel(unit)

  const meta = [
    `${d.totalSets} sets`,
    `${d.exercises.length} exercises`,
    ...(dur ? [dur] : []),
  ].join('  ·  ')

  return (
    <div style={CARD}>
      <div className="mb-4">
        <Label orange>Today's Effort</Label>
      </div>

      <div className="flex-1 mb-3">
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
          TOTAL VOLUME
        </p>
        <div className="flex items-baseline gap-1.5">
          <span style={{
            fontSize: 40,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-mono)',
          }}>
            {volNum}
          </span>
          <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>
            {volUnit}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 400, marginBottom: 10 }}>
        {meta}
      </p>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 400, lineHeight: 1.7, marginBottom: 14 }}>
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
  const muscles = d.muscles.slice(0, 4)
  const primaryNames = muscles.map(m => m.name.toUpperCase()).join(' / ')

  return (
    <div style={CARD}>
      <div className="flex items-center justify-between mb-3">
        <Label orange>Muscle Focus</Label>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
          {muscles.length} {muscles.length === 1 ? 'GROUP' : 'GROUPS'}
        </span>
      </div>

      <p style={{
        fontSize: 22, fontWeight: 700, color: '#fff',
        letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16,
      }}>
        {primaryNames}
      </p>

      <div className="flex-1 mb-4" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {muscles.map((m, i) => (
          <div key={m.name} className="flex items-start gap-2">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              flexShrink: 0,
              marginTop: 1,
              background: i === 0 ? 'rgba(255,107,0,0.14)' : 'rgba(255,255,255,0.06)',
              color: i === 0 ? '#FF6B00' : 'rgba(255,255,255,0.42)',
            }}>
              {m.name.toUpperCase()}
            </span>
            <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
              {m.exercises.slice(0, 3).join('  ·  ')}
            </p>
          </div>
        ))}
      </div>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Slide 4: PR CARD (vertical layout) ──────────────────── */
function PRCardSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['prCard']>
  sessionId: string | null
}) {
  const { unit } = useWeightUnit()
  const unitLabel = weightUnitLabel(unit)
  return (
    <div style={CARD}>
      <div className="flex items-center justify-between mb-3">
        <Label orange>Personal Record</Label>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 400, marginBottom: 20 }}>
        {d.exerciseName}
      </p>

      <div className="flex-1 flex flex-col justify-center gap-2 mb-4">
        {/* Previous */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
            PREVIOUS
          </p>
          <span style={{
            fontSize: 30,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.22)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.02em',
          }}>
            {toDisplayWeight(d.prevPR, unit)}
            <span style={{ fontSize: 15, marginLeft: 3, color: 'rgba(255,255,255,0.15)' }}>{unitLabel}</span>
          </span>
        </div>

        {/* Arrow */}
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.15)', paddingLeft: 2, lineHeight: 1 }}>↓</p>

        {/* New best */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', color: '#FF6B00', marginBottom: 4 }}>
            NEW BEST
          </p>
          <span style={{
            fontSize: 54,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: 'var(--font-mono)',
          }}>
            {toDisplayWeight(d.newPR, unit)}
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>{unitLabel}</span>
          </span>
        </div>

        <p style={{ fontSize: 13, fontWeight: 500, color: '#22c55e', marginTop: 4 }}>
          +{toDisplayWeight(d.improvement, unit)} {unitLabel} improvement
        </p>
      </div>

      <ShareBtn sessionId={sessionId} />
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyHeroCard() {
  return (
    <div style={{ ...CARD, alignItems: 'center', textAlign: 'center', padding: 40, minHeight: 200 }}>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
        HERO CARD
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
        Log your first lift
      </p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginBottom: 28, lineHeight: 1.6 }}>
        Your best set will appear here<br />after your workout
      </p>
      <Link href="/record"
        className="rounded-xl"
        style={{
          padding: '12px 28px',
          background: '#FF6B00',
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
                background: active === i ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.1)',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
