import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatVolume } from '@/lib/utils'
import { Share2, Zap } from 'lucide-react'
import TrainingCalendar, { type CalendarSession } from '@/components/home/TrainingCalendar'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p className="text-xl font-black tracking-widest text-white mb-1">LIFTSNAP</p>
        <p className="text-xs font-bold tracking-widest" style={{ color: '#333' }}>LOADING...</p>
      </div>
    )
  }

  const todayStr = today()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  const [thisWeekRes, lastSessionRes, lastWeekRes, todayWeightRes, calendarSessionsRes] = await Promise.all([
    supabase.from('workout_sessions')
      .select('id, total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .gte('trained_at', getWeekStart())
      .not('completed_at', 'is', null),
    supabase.from('workout_sessions')
      .select('id, title, total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('trained_at', { ascending: false })
      .limit(1)
      .single(),
    supabase.from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .gte('trained_at', getLastWeekStart())
      .lt('trained_at', getWeekStart())
      .not('completed_at', 'is', null),
    supabase.from('body_weights')
      .select('weight_kg')
      .eq('user_id', user.id)
      .eq('recorded_at', todayStr)
      .single(),
    supabase.from('workout_sessions')
      .select('id, trained_at')
      .eq('user_id', user.id)
      .gte('trained_at', ninetyDaysAgoStr)
      .not('completed_at', 'is', null),
  ])

  const lastSession = lastSessionRes.data

  // Fetch best set from last session
  let bestSet: { exercise_name: string; weight_kg: number; reps: number } | null = null
  if (lastSession?.id) {
    const { data } = await supabase
      .from('workout_sets')
      .select('exercise_name, weight_kg, reps')
      .eq('session_id', lastSession.id)
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('weight_kg', { ascending: false })
      .limit(1)
      .single()
    if (data) bestSet = data as { exercise_name: string; weight_kg: number; reps: number }
  }

  // All-time best for club progress
  let allTimeBest: { weight_kg: number; reps: number } | null = null
  const { data: atbData } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps')
    .eq('is_completed', true)
    .not('weight_kg', 'is', null)
    .gt('weight_kg', 0)
    .order('weight_kg', { ascending: false })
    .limit(1)
    .single()
  if (atbData) allTimeBest = atbData as { weight_kg: number; reps: number }

  // Build calendar sessions with dominant muscle group
  let calendarSessions: CalendarSession[] = []
  if (calendarSessionsRes.data && calendarSessionsRes.data.length > 0) {
    const sessionIds = calendarSessionsRes.data.map(s => s.id)
    const { data: setMuscleData } = await supabase
      .from('workout_sets')
      .select('session_id, muscle_group')
      .in('session_id', sessionIds)
      .eq('is_completed', true)

    if (setMuscleData) {
      const sessionMuscleCount = new Map<string, Map<string, number>>()
      setMuscleData.forEach(s => {
        if (!sessionMuscleCount.has(s.session_id)) {
          sessionMuscleCount.set(s.session_id, new Map())
        }
        const mgMap = sessionMuscleCount.get(s.session_id)!
        mgMap.set(s.muscle_group, (mgMap.get(s.muscle_group) ?? 0) + 1)
      })

      calendarSessions = calendarSessionsRes.data.map(session => {
        const mgMap = sessionMuscleCount.get(session.id)
        let topMuscle = 'full body'
        if (mgMap && mgMap.size > 0) {
          topMuscle = [...mgMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
        }
        return { date: session.trained_at, muscleGroup: topMuscle }
      })
    }
  }

  const thisWeekSessions = thisWeekRes.data ?? []
  const thisWeekVolume = thisWeekSessions.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const lastWeekVolume = (lastWeekRes.data ?? []).reduce(
    (s: number, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0), 0
  )
  const volumeDiff = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null
  const todayWeight = todayWeightRes.data?.weight_kg ?? null
  const todayWorked = thisWeekSessions.some(s => s.trained_at === todayStr)

  const est1rm = bestSet
    ? bestSet.reps === 1 ? bestSet.weight_kg : Math.round(bestSet.weight_kg * (1 + bestSet.reps / 30))
    : null
  const allTimeEst1rm = allTimeBest
    ? allTimeBest.reps === 1 ? allTimeBest.weight_kg : Math.round(allTimeBest.weight_kg * (1 + allTimeBest.reps / 30))
    : null
  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null
  const isToday = lastSession?.trained_at === todayStr
  const scoreValue = est1rm && club ? Math.min(99, Math.round((est1rm / club.target) * 100)) : null

  const totalSessions = calendarSessionsRes.data?.length ?? 0
  const greeting = getGreeting()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <h1 className="text-xl font-black tracking-widest text-white">LIFTSNAP</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <Zap size={12} style={{ color: '#ff6b00' }} />
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#ff6b00' }}>
            {totalSessions} LIFTS
          </span>
        </div>
      </div>

      {/* ── WELCOME BACK ── */}
      <div className="px-4 pt-3 pb-5">
        <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#333' }}>
          {greeting}
        </p>
        <p className="text-3xl font-black text-white tracking-tight leading-none">
          WELCOME
        </p>
        <p className="text-3xl font-black tracking-tight leading-none" style={{ color: '#ff6b00' }}>
          BACK.
        </p>
        {!todayWorked && (
          <p className="text-xs font-bold mt-2" style={{ color: '#444' }}>
            No session logged today — let's change that.
          </p>
        )}
        {todayWorked && (
          <p className="text-xs font-bold mt-2" style={{ color: '#22c55e' }}>
            Great work today. Session logged.
          </p>
        )}
      </div>

      {/* ── HERO EFFORT CARD ── */}
      <div className="px-4 mb-5">
        {bestSet ? (
          <HeroCard
            exerciseName={bestSet.exercise_name}
            weightKg={bestSet.weight_kg}
            reps={bestSet.reps}
            est1rm={est1rm!}
            club={club}
            sessionId={lastSession!.id}
            isToday={isToday}
            score={scoreValue}
          />
        ) : (
          <EmptyHeroCard />
        )}
      </div>

      {/* ── MONTHLY TRAINING CALENDAR ── */}
      <div className="px-4 mb-5">
        <TrainingCalendar sessions={calendarSessions} todayStr={todayStr} />
      </div>

      {/* ── START WORKOUT CTA ── */}
      <div className="px-4 mb-5">
        <Link href="/record">
          <div className="rounded-2xl px-5 py-4 flex items-center justify-between active:opacity-70"
            style={{
              background: todayWorked ? '#111' : 'linear-gradient(135deg, #ff6b00 0%, #ff8c2a 100%)',
              border: todayWorked ? '1px solid #1e1e1e' : 'none',
              boxShadow: todayWorked ? 'none' : '0 8px 30px rgba(255,107,0,0.35)',
            }}>
            <div>
              <p className="text-[10px] font-black tracking-widest mb-0.5"
                style={{ color: todayWorked ? '#444' : 'rgba(255,255,255,0.7)' }}>
                {todayWorked ? 'LOG ANOTHER' : 'TODAY'}
              </p>
              <p className="text-base font-black"
                style={{ color: todayWorked ? '#666' : '#fff' }}>
                {todayWorked ? 'Start New Session' : 'START WORKOUT'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: todayWorked ? '#1a1a1a' : 'rgba(255,255,255,0.2)',
                border: todayWorked ? '1px solid #2a2a2a' : 'none',
              }}>
              <span className="text-xl font-black leading-none"
                style={{ color: todayWorked ? '#555' : '#fff' }}>+</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-5">
        <p className="text-[10px] font-black tracking-widest mb-3" style={{ color: '#333' }}>
          WEEKLY EFFORT
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            {
              label: 'VOLUME',
              value: thisWeekVolume > 0 ? formatVolume(thisWeekVolume) : '—',
              unit: thisWeekVolume > 0 ? 'kg' : undefined,
              sub: volumeDiff !== null
                ? `${volumeDiff >= 0 ? '+' : ''}${volumeDiff}% vs last wk`
                : null,
              subColor: volumeDiff !== null ? (volumeDiff >= 0 ? '#22c55e' : '#ef4444') : undefined,
              active: thisWeekVolume > 0,
            },
            {
              label: 'SESSIONS',
              value: thisWeekSessions.length > 0 ? String(thisWeekSessions.length) : '—',
              unit: undefined,
              sub: 'GOAL: 3×',
              subColor: '#333' as string,
              active: thisWeekSessions.length > 0,
            },
            {
              label: 'BEST 1RM',
              value: allTimeEst1rm ? `${allTimeEst1rm}` : '—',
              unit: allTimeEst1rm ? 'kg' : undefined,
              sub: null,
              subColor: undefined,
              active: allTimeEst1rm !== null,
            },
          ] as const).map(({ label, value, unit, sub, subColor, active }) => (
            <div key={label} className="rounded-2xl p-3.5"
              style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <p className="text-[9px] font-black tracking-widest mb-2" style={{ color: '#333' }}>{label}</p>
              <div className="flex items-baseline gap-0.5">
                <p className="text-xl font-black leading-none"
                  style={{ color: active ? '#fff' : '#222' }}>{value}</p>
                {unit && (
                  <span className="text-[10px] font-bold" style={{ color: '#444' }}>{unit}</span>
                )}
              </div>
              {sub && (
                <p className="text-[9px] mt-1.5 font-black tracking-wide"
                  style={{ color: subColor ?? '#333' }}>{sub}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 100KG CLUB ── */}
      <div className="px-4 mb-5">
        <ClubCard club={club} allTimeEst1rm={allTimeEst1rm} />
      </div>

      {/* ── BODY WEIGHT ── */}
      <div className="px-4">
        <div className="rounded-2xl px-4 py-4 flex items-center justify-between"
          style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          <div>
            <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: '#333' }}>BODY WEIGHT</p>
            {todayWeight ? (
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-white">{todayWeight}</p>
                <span className="text-sm font-bold" style={{ color: '#444' }}>kg</span>
              </div>
            ) : (
              <p className="text-sm font-bold" style={{ color: '#2a2a2a' }}>NOT LOGGED</p>
            )}
          </div>
          <Link href="/analytics"
            className="px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest"
            style={{
              background: todayWeight ? '#1a1a1a' : '#ff6b00',
              color: todayWeight ? '#444' : '#fff',
            }}>
            {todayWeight ? 'VIEW →' : 'LOG +'}
          </Link>
        </div>
      </div>

    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

type ClubInfo = { name: string; target: number; gap: number; progress: number; prev: number }

function EmptyHeroCard() {
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
          style={{
            background: '#ff6b00',
            boxShadow: '0 4px 20px rgba(255,107,0,0.35)',
          }}>
          START WORKOUT →
        </Link>
      </div>
    </div>
  )
}

function HeroCard({ exerciseName, weightKg, reps, est1rm, club, sessionId, isToday, score }: {
  exerciseName: string
  weightKg: number
  reps: number
  est1rm: number
  club: ClubInfo | null
  sessionId: string
  isToday: boolean
  score: number | null
}) {
  const ringRadius = 38
  const circumference = 2 * Math.PI * ringRadius
  const ringOffset = club ? circumference * (1 - club.progress / 100) : circumference

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #120800 0%, #0f0f0f 55%, #0a0a0a 100%)',
        border: '1px solid rgba(255,107,0,0.2)',
        boxShadow: '0 0 60px rgba(255,107,0,0.1), 0 20px 60px rgba(0,0,0,0.6)',
      }}>

      {/* Top gradient bar */}
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, #ff6b00 0%, #7c3aed 70%, transparent 100%)' }} />

      {/* Radial glow */}
      <div className="absolute top-0 right-0 w-52 h-52 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 75% 20%, rgba(255,107,0,0.12) 0%, transparent 60%)' }} />

      <div className="relative p-5">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,107,0,0.12)', color: '#ff6b00', letterSpacing: '0.12em' }}>
            {isToday ? "TODAY'S EFFORT" : 'LAST EFFORT'}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: '#ff6b00', color: '#fff' }}>
            PR
          </span>
        </div>

        {/* Main content */}
        <div className="flex items-start justify-between">
          {/* Left */}
          <div className="flex-1 mr-3">
            <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: '#ff6b00' }}>
              {exerciseName.toUpperCase()}
            </p>

            {/* Weight */}
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="font-black text-white leading-none" style={{ fontSize: 60 }}>{weightKg}</span>
              <div>
                <span className="text-xl font-bold" style={{ color: '#3a3a3a' }}>kg</span>
                <p className="text-lg font-black text-white leading-tight">
                  × {reps}
                  <span className="text-xs font-bold ml-1" style={{ color: '#444' }}>reps</span>
                </p>
              </div>
            </div>

            {/* Est 1RM */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>EST. 1RM</span>
              <span className="text-base font-black text-white">{est1rm}
                <span className="text-xs font-bold ml-0.5" style={{ color: '#555' }}>kg</span>
              </span>
            </div>

            {/* Club gap */}
            {club && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl inline-flex"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <span className="text-xs">⚡</span>
                <span className="text-xs font-black" style={{ color: '#22c55e' }}>
                  +{club.gap}kg to {club.name}
                </span>
              </div>
            )}
          </div>

          {/* Right: Progress ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <svg width="92" height="92" viewBox="0 0 92 92">
              <circle cx="46" cy="46" r={ringRadius} fill="none" stroke="#1a1a1a" strokeWidth="7" />
              <circle cx="46" cy="46" r={ringRadius} fill="none"
                stroke="rgba(255,107,0,0.08)" strokeWidth="14" />
              <circle cx="46" cy="46" r={ringRadius} fill="none"
                stroke="#ff6b00" strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 46 46)" />
              <text x="46" y="42" textAnchor="middle" fill="white" fontSize="15" fontWeight="900"
                fontFamily="system-ui, sans-serif">
                {club ? `${club.progress}%` : '—'}
              </text>
              <text x="46" y="56" textAnchor="middle" fill="#444" fontSize="8" fontWeight="700"
                fontFamily="system-ui, sans-serif">
                {club ? 'TO CLUB' : ''}
              </text>
            </svg>
            {club && (
              <p className="text-[8px] font-black text-center" style={{ color: '#333', maxWidth: 80 }}>
                {club.name}
              </p>
            )}
          </div>
        </div>

        {/* Bottom row: Score + Share */}
        <div className="flex items-center gap-3 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,107,0,0.08)' }}>
          {score !== null && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1a1a1a' }}>
              <span className="text-[9px] font-black tracking-widest" style={{ color: '#444' }}>SCORE</span>
              <span className="text-base font-black" style={{ color: '#ff6b00' }}>{score}</span>
            </div>
          )}
          <Link href={`/share?session=${sessionId}`}
            className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white active:opacity-80"
            style={{
              background: '#ff6b00',
              boxShadow: '0 4px 20px rgba(255,107,0,0.3)',
              letterSpacing: '0.03em',
            }}>
            <Share2 size={14} />
            SHARE STORY ↗
          </Link>
        </div>
      </div>
    </div>
  )
}

function ClubCard({ club, allTimeEst1rm }: { club: ClubInfo | null; allTimeEst1rm: number | null }) {
  if (!club || !allTimeEst1rm) {
    return (
      <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
        <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#333' }}>STRENGTH CLUB</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.12)' }}>
            <span className="text-lg">🏅</span>
          </div>
          <div>
            <p className="text-sm font-black text-white">100KG CLUB</p>
            <p className="text-xs font-bold" style={{ color: '#333' }}>Log your first lift to track progress</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: '#1a1a1a' }} />
      </div>
    )
  }

  const current = Math.min(allTimeEst1rm, club.target)
  const pct = club.progress

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: '#111', border: '1px solid #1a1a1a' }}>
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,107,0,0.06) 0%, transparent 65%)' }} />

      <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#333' }}>STRENGTH CLUB</p>

      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
            <span className="text-lg">🏅</span>
          </div>
          <div>
            <p className="text-sm font-black text-white">{club.name}</p>
            <p className="text-xs font-black" style={{ color: '#22c55e' }}>+{club.gap}kg to go</p>
          </div>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,107,0,0.1)', color: '#ff6b00' }}>
          {pct}%
        </span>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{current}</span>
          <span className="text-sm font-bold" style={{ color: '#444' }}>kg</span>
        </div>
        <span className="text-sm font-black" style={{ color: '#2a2a2a' }}>/ {club.target}kg</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
        <div className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #ff6b00, #ffaa44)',
            boxShadow: '0 0 10px rgba(255,107,0,0.5)',
          }} />
      </div>
    </div>
  )
}

/* ─── Pure functions ──────────────────────────────────────── */

function getNextClub(oneRM: number): ClubInfo {
  const milestones = [60, 80, 100, 120, 150, 200]
  const target = milestones.find(m => m > oneRM) ?? 250
  const prev = milestones[milestones.indexOf(target) - 1] ?? 0
  const progress = Math.min(99, Math.round(((oneRM - prev) / (target - prev)) * 100))
  return { name: `${target}KG CLUB`, target, gap: Math.max(1, Math.round(target - oneRM)), progress, prev }
}

function today() { return new Date().toISOString().split('T')[0] }

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
  return d.toISOString().split('T')[0]
}

function getLastWeekStart() {
  const d = new Date(getWeekStart())
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function getGreeting() {
  const h = new Date().getUTCHours() + 9 // JST approx
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
