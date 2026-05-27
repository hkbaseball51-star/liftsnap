'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#ff6b00', BACK: '#3b82f6', SHOULDERS: '#a855f7',
  BICEPS: '#f59e0b', TRICEPS: '#f97316', QUADS: '#22c55e',
  HAMSTRINGS: '#10b981', GLUTES: '#10b981', CALVES: '#06b6d4',
  ABS: '#14b8a6', FOREARMS: '#78716c',
}

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

function ShareBtn({ sessionId }: { sessionId: string | null }) {
  return (
    <Link
      href={sessionId ? `/share?session=${sessionId}` : '/record'}
      className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white active:opacity-80"
      style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)', letterSpacing: '0.03em' }}>
      <Share2 size={14} />
      SHARE STORY ↗
    </Link>
  )
}

function SlideShell({
  children, accent,
}: {
  children: React.ReactNode
  accent: string
}) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0d0600 0%, #0f0f0f 55%, #0a0a0a 100%)',
        border: `1px solid ${accent}33`,
        boxShadow: `0 0 60px ${accent}0d, 0 20px 60px rgba(0,0,0,0.6)`,
        minHeight: 256,
      }}>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, #7c3aed 70%, transparent 100%)` }} />
      <div className="absolute top-0 right-0 w-52 h-52 pointer-events-none"
        style={{ background: `radial-gradient(circle at 75% 20%, ${accent}1a 0%, transparent 60%)` }} />
      <div className="relative p-5 flex flex-col flex-1">
        {children}
      </div>
    </div>
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
  const improvement = isNew && d.prevPR !== null ? Math.round((d.bestWeight - d.prevPR) * 10) / 10 : null

  return (
    <SlideShell accent="#ff6b00">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,107,0,0.12)', color: '#ff6b00' }}>
          BEST LIFT
        </span>
        {(isNew || isFirst) && (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
            style={{ background: '#ff6b00', color: '#fff' }}>
            {isNew ? '🏆 NEW PR' : 'FIRST'}
          </span>
        )}
      </div>

      <p className="text-[11px] font-black tracking-widest mb-2" style={{ color: '#ff6b00' }}>
        {d.exerciseName.toUpperCase()}
      </p>

      <div className="flex items-start justify-between flex-1 mb-3">
        <div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span
              className="font-black text-white leading-none"
              style={{ fontSize: 52, fontFamily: 'var(--font-mono)' }}>
              {d.bestWeight}
            </span>
            <div>
              <span className="text-xl font-bold" style={{ color: '#333' }}>kg</span>
              <p className="text-base font-black text-white">
                × {d.bestReps}
                <span className="text-xs font-bold ml-1" style={{ color: '#444' }}>reps</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black tracking-widest" style={{ color: '#444' }}>EST. 1RM</span>
              <span className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                {d.est1rm}<span className="text-xs font-bold ml-0.5" style={{ color: '#555' }}>kg</span>
              </span>
            </div>
            {improvement !== null && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                +{improvement}kg ↑
              </span>
            )}
          </div>
        </div>

        {(isNew || isFirst) && (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,107,0,0.1)',
              border: '2px solid rgba(255,107,0,0.3)',
              boxShadow: '0 0 20px rgba(255,107,0,0.25)',
            }}>
            <span className="text-2xl">🏆</span>
          </div>
        )}
      </div>

      <ShareBtn sessionId={sessionId} />
    </SlideShell>
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
  const dur = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '—'

  const volNum = d.totalVolume >= 1000
    ? (d.totalVolume / 1000).toFixed(1)
    : String(Math.round(d.totalVolume))
  const volUnit = d.totalVolume >= 1000 ? 't' : 'kg'

  return (
    <SlideShell accent="#3b82f6">
      <div className="mb-3">
        <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
          TODAY'S EFFORT
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[9px] font-black tracking-widest mb-0.5" style={{ color: '#444' }}>TOTAL VOLUME</p>
        <div className="flex items-baseline gap-1">
          <span className="font-black text-white" style={{ fontSize: 44, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
            {volNum}
          </span>
          <span className="text-xl font-bold" style={{ color: '#333' }}>{volUnit}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {([
          { label: 'SETS', value: String(d.totalSets) },
          { label: 'EXERCISES', value: String(d.exercises.length) },
          { label: 'DURATION', value: dur },
        ] as const).map(({ label, value }) => (
          <div key={label} className="rounded-xl p-2" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-[8px] font-black tracking-widest mb-1" style={{ color: '#444' }}>{label}</p>
            <p className="text-xs font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3 flex-1">
        {d.exercises.slice(0, 5).map(ex => (
          <span key={ex.name}
            className="text-[9px] font-black px-2 py-1 rounded-lg"
            style={{
              background: `${MUSCLE_COLORS[ex.muscle] ?? '#ff6b00'}18`,
              color: MUSCLE_COLORS[ex.muscle] ?? '#ff6b00',
              border: `1px solid ${MUSCLE_COLORS[ex.muscle] ?? '#ff6b00'}30`,
            }}>
            {ex.name}
          </span>
        ))}
      </div>

      <ShareBtn sessionId={sessionId} />
    </SlideShell>
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
    <SlideShell accent="#a855f7">
      <div className="mb-3">
        <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
          MUSCLE FOCUS
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {d.muscles.map(m => (
          <div key={m.name} className="px-3 py-1.5 rounded-full"
            style={{
              background: `${MUSCLE_COLORS[m.name] ?? '#ff6b00'}18`,
              border: `1px solid ${MUSCLE_COLORS[m.name] ?? '#ff6b00'}40`,
            }}>
            <span className="text-xs font-black tracking-wider"
              style={{ color: MUSCLE_COLORS[m.name] ?? '#ff6b00' }}>
              {m.name}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 mb-3 flex-1">
        {d.muscles.slice(0, 4).map(m => (
          <div key={m.name}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: MUSCLE_COLORS[m.name] ?? '#ff6b00' }} />
              <span className="text-[9px] font-black tracking-widest"
                style={{ color: MUSCLE_COLORS[m.name] ?? '#ff6b00' }}>
                {m.name}
              </span>
            </div>
            <p className="text-[10px] font-bold pl-3 leading-snug" style={{ color: '#555' }}>
              {m.exercises.slice(0, 3).join(' • ')}
            </p>
          </div>
        ))}
      </div>

      <ShareBtn sessionId={sessionId} />
    </SlideShell>
  )
}

/* ── Slide 4: PR CARD (conditional) ──────────────────────── */
function PRCardSlide({
  d, sessionId,
}: {
  d: NonNullable<HeroData['prCard']>
  sessionId: string | null
}) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0d0500 0%, #0f0f0f 55%, #0a0a0a 100%)',
        border: '1px solid rgba(255,107,0,0.4)',
        boxShadow: '0 0 60px rgba(255,107,0,0.18), 0 20px 60px rgba(0,0,0,0.6)',
        minHeight: 256,
      }}>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, #ff6b00, #fbbf24, #ff6b00)' }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,0,0.18) 0%, transparent 60%)' }} />

      <div className="relative p-5 flex flex-col flex-1">
        <div className="flex justify-center mb-3">
          <span className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.3)' }}>
            🏆 NEW PERSONAL RECORD
          </span>
        </div>

        <p className="text-center text-[11px] font-black tracking-widest mb-4" style={{ color: '#ff6b00' }}>
          {d.exerciseName.toUpperCase()}
        </p>

        <div className="flex items-center justify-center gap-5 mb-4 flex-1">
          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest mb-1" style={{ color: '#444' }}>PREVIOUS</p>
            <p className="font-black" style={{ fontSize: 28, lineHeight: 1, color: '#333', fontFamily: 'var(--font-mono)' }}>
              {d.prevPR}
              <span className="text-sm ml-0.5" style={{ color: '#2a2a2a' }}>kg</span>
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ color: '#22c55e', fontSize: 16, fontWeight: 900 }}>→</span>
            </div>
            <span className="text-xs font-black" style={{ color: '#22c55e' }}>+{d.improvement}kg</span>
          </div>

          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest mb-1" style={{ color: '#ff6b00' }}>NEW BEST</p>
            <p className="font-black text-white" style={{ fontSize: 42, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {d.newPR}
              <span className="text-xl ml-0.5" style={{ color: '#555' }}>kg</span>
            </p>
          </div>
        </div>

        <ShareBtn sessionId={sessionId} />
      </div>
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyHeroCard() {
  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0d0700 0%, #0f0f0f 60%)',
        border: '1px solid rgba(255,107,0,0.1)',
      }}>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,0,0.35), transparent)' }} />
      <div className="p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: 'rgba(255,107,0,0.08)',
            border: '1px solid rgba(255,107,0,0.15)',
            boxShadow: '0 0 30px rgba(255,107,0,0.08)',
          }}>
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-xs font-black tracking-widest mb-1" style={{ color: '#ff6b00' }}>HERO CARD</p>
        <p className="text-lg font-black text-white mb-1">LOG YOUR FIRST LIFT</p>
        <p className="text-xs font-bold mb-7" style={{ color: '#333' }}>
          Your best set will appear here after your workout
        </p>
        <Link href="/record"
          className="px-8 py-3.5 rounded-2xl text-sm font-black text-white"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
          START WORKOUT →
        </Link>
      </div>
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
                width: active === i ? 20 : 6,
                height: 6,
                background: active === i ? '#ff6b00' : '#2a2a2a',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
