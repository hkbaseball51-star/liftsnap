import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatVolume } from '@/lib/utils'
import { Zap } from 'lucide-react'
import TrainingCalendar, { type CalendarSession } from '@/components/home/TrainingCalendar'
import HeroCarousel, { type HeroData, EmptyHeroCard } from '@/components/home/HeroCarousel'

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

  /* ── Round 1: parallel fetches ──────────────────────────── */
  const [
    thisWeekRes, todaySessionsRes, lastWeekRes,
    todayWeightRes, calendarSessionsRes, preSessionsRes, profileRes,
  ] = await Promise.all([
    supabase.from('workout_sessions')
      .select('id, total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .gte('trained_at', getWeekStart())
      .not('completed_at', 'is', null),

    supabase.from('workout_sessions')
      .select('id, duration_seconds')
      .eq('user_id', user.id)
      .eq('trained_at', todayStr)
      .not('completed_at', 'is', null),

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

    supabase.from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .lt('trained_at', todayStr)
      .not('completed_at', 'is', null),

    supabase.from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single(),
  ])

  const todaySessions = todaySessionsRes.data ?? []
  const todaySessionIds = todaySessions.map(s => s.id)
  const preSessionIds = preSessionsRes.data?.map(s => s.id) ?? []

  /* ── Round 2: today's sets + all-time best ──────────────── */
  const [todaySets, atbData] = await Promise.all([
    todaySessionIds.length > 0
      ? supabase.from('workout_sets')
          .select('exercise_name, muscle_group, weight_kg, reps')
          .in('session_id', todaySessionIds)
          .eq('is_completed', true)
          .then(r => r.data ?? [])
      : Promise.resolve([] as { exercise_name: string; muscle_group: string; weight_kg: number | null; reps: number | null }[]),
    supabase.from('workout_sets')
      .select('weight_kg, reps')
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('weight_kg', { ascending: false })
      .limit(1)
      .single()
      .then(r => r.data as { weight_kg: number; reps: number } | null),
  ])

  /* ── Compute per-exercise stats ─────────────────────────── */
  type ExStat = {
    muscle: string; maxWeight: number; bestReps: number
    maxEst1rm: number; totalVolume: number; setCount: number
  }
  const exMap = new Map<string, ExStat>()
  for (const s of todaySets) {
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    if (w <= 0 || r <= 0) continue
    if (!exMap.has(s.exercise_name)) {
      exMap.set(s.exercise_name, { muscle: s.muscle_group, maxWeight: 0, bestReps: 0, maxEst1rm: 0, totalVolume: 0, setCount: 0 })
    }
    const ex = exMap.get(s.exercise_name)!
    const e1rm = r === 1 ? w : Math.round(w * (1 + r / 30))
    if (e1rm > ex.maxEst1rm) { ex.maxEst1rm = e1rm; ex.maxWeight = w; ex.bestReps = r }
    ex.totalVolume += w * r
    ex.setCount++
  }

  /* ── Round 3: historical PRs for today's exercises ───────── */
  const todayExNames = [...exMap.keys()]
  const historicalMax = new Map<string, number>()
  if (todayExNames.length > 0 && preSessionIds.length > 0) {
    const { data: hSets } = await supabase
      .from('workout_sets')
      .select('exercise_name, weight_kg')
      .in('session_id', preSessionIds)
      .in('exercise_name', todayExNames)
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
    for (const s of hSets ?? []) {
      const cur = historicalMax.get(s.exercise_name) ?? 0
      if ((s.weight_kg ?? 0) > cur) historicalMax.set(s.exercise_name, s.weight_kg!)
    }
  }

  /* ── Build candidates with PR status ─────────────────────── */
  type Candidate = ExStat & {
    name: string
    prStatus: 'new_pr' | 'first' | 'matched' | 'below'
    prevPR: number | null
  }
  const candidates: Candidate[] = [...exMap.entries()].map(([name, stat]) => {
    const prevPR = historicalMax.get(name) ?? null
    const prStatus: Candidate['prStatus'] =
      prevPR === null ? 'first' :
      stat.maxWeight > prevPR ? 'new_pr' :
      stat.maxWeight === prevPR ? 'matched' : 'below'
    return { name, ...stat, prStatus, prevPR }
  })

  // Priority: new_pr > highest est1rm
  candidates.sort((a, b) => {
    const pa = a.prStatus === 'new_pr' ? 2 : a.prStatus === 'first' ? 1 : 0
    const pb = b.prStatus === 'new_pr' ? 2 : b.prStatus === 'first' ? 1 : 0
    if (pa !== pb) return pb - pa
    return b.maxEst1rm - a.maxEst1rm
  })

  const best = candidates[0] ?? null
  const newPRs = candidates.filter(c => c.prStatus === 'new_pr')
    .sort((a, b) => (b.maxWeight - (b.prevPR ?? 0)) - (a.maxWeight - (a.prevPR ?? 0)))
  const bestPR = newPRs[0] ?? null

  const muscleMap = new Map<string, string[]>()
  for (const [name, stat] of exMap.entries()) {
    if (!muscleMap.has(stat.muscle)) muscleMap.set(stat.muscle, [])
    muscleMap.get(stat.muscle)!.push(name)
  }

  const totalDuration = todaySessions.reduce((s, sess) => s + (sess.duration_seconds ?? 0), 0)
  const totalVolume = todaySets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
  const totalSets = todaySets.filter(s => (s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0).length

  const heroData: HeroData = {
    bestLift: best ? {
      exerciseName: best.name,
      bestWeight: best.maxWeight,
      bestReps: best.bestReps,
      est1rm: best.maxEst1rm,
      prStatus: best.prStatus,
      prevPR: best.prevPR,
    } : null,
    todayEffort: candidates.length > 0 ? {
      totalVolume,
      totalSets,
      exercises: candidates.map(c => ({ name: c.name, muscle: c.muscle, sets: c.setCount })),
      durationSeconds: totalDuration,
    } : null,
    muscleFocus: muscleMap.size > 0 ? {
      muscles: [...muscleMap.entries()].map(([name, exercises]) => ({ name, exercises })),
    } : null,
    prCard: bestPR && bestPR.prevPR !== null ? {
      exerciseName: bestPR.name,
      newPR: bestPR.maxWeight,
      prevPR: bestPR.prevPR,
      improvement: Math.round((bestPR.maxWeight - bestPR.prevPR) * 10) / 10,
    } : null,
    lastSessionId: todaySessions[todaySessions.length - 1]?.id ?? null,
  }

  /* ── Calendar sessions ───────────────────────────────────── */
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

  /* ── Derived values ──────────────────────────────────────── */
  const allTimeBest = atbData
  const allTimeEst1rm = allTimeBest
    ? allTimeBest.reps === 1 ? allTimeBest.weight_kg : Math.round(allTimeBest.weight_kg * (1 + allTimeBest.reps / 30))
    : null
  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null

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
  const totalSessions90 = calendarSessionsRes.data?.length ?? 0
  const displayName = profileRes.data?.display_name as string | null

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>LIFTSNAP</h1>
        <div className="flex items-center gap-1.5">
          <Zap size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            {totalSessions90} lifts
          </span>
        </div>
      </div>

      {/* ── WELCOME ── */}
      <div className="px-4 pt-4 pb-6">
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
          {getGreeting()}
        </p>
        <p style={{ fontSize: 30, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Welcome back{displayName ? `,` : '.'}
        </p>
        {displayName && (
          <p style={{ fontSize: 30, fontWeight: 600, color: '#FF6B00', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {displayName}.
          </p>
        )}
        {todayWorked ? (
          <p style={{ fontSize: 13, fontWeight: 400, color: '#22c55e', marginTop: 10 }}>
            Great work today.
          </p>
        ) : (
          <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>
            No session today — let's change that.
          </p>
        )}
      </div>

      {/* ── HERO CAROUSEL ── */}
      <div className="px-4 mb-5">
        <HeroCarousel data={heroData} />
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
              background: todayWorked
                ? 'linear-gradient(135deg, rgba(255,107,0,0.04), rgba(255,255,255,0.01) 40%, rgba(255,107,0,0.02))'
                : 'linear-gradient(135deg, #FF6B00 0%, #d95e00 100%)',
              border: todayWorked ? '1px solid rgba(255,255,255,0.07)' : 'none',
              boxShadow: todayWorked
                ? '0 0 30px rgba(255,107,0,0.05)'
                : '0 4px 20px rgba(255,107,0,0.2)',
            }}>
            <div>
              <p style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', marginBottom: 3,
                color: todayWorked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
              }}>
                {todayWorked ? 'LOG ANOTHER' : 'TODAY'}
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, color: todayWorked ? 'rgba(255,255,255,0.45)' : '#fff' }}>
                {todayWorked ? 'Start New Session' : 'Start Workout'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: todayWorked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)',
                border: todayWorked ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
              <span style={{ fontSize: 20, fontWeight: 400, color: todayWorked ? 'rgba(255,255,255,0.3)' : '#fff' }}>+</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-5">
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
          WEEKLY EFFORT
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            {
              label: 'VOLUME',
              value: thisWeekVolume > 0 ? formatVolume(thisWeekVolume) : '—',
              sub: volumeDiff !== null ? `${volumeDiff >= 0 ? '+' : ''}${volumeDiff}%` : null,
              subColor: volumeDiff !== null ? (volumeDiff >= 0 ? '#22c55e' : '#ef4444') : undefined,
              active: thisWeekVolume > 0,
            },
            {
              label: 'SESSIONS',
              value: thisWeekSessions.length > 0 ? String(thisWeekSessions.length) : '—',
              sub: 'goal: 3×',
              subColor: 'rgba(255,255,255,0.18)' as string,
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
          ] as const).map(({ label, value, sub, subColor, active, ...rest }) => (
            <div key={label} className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,0,0.05), rgba(255,255,255,0.01) 40%, rgba(255,107,0,0.03))',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 30px rgba(255,107,0,0.05)',
              }}>
              <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
                {label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, color: active ? '#fff' : 'rgba(255,255,255,0.1)' }}>
                  {value}
                </p>
                {'unit' in rest && rest.unit && (
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.2)', marginLeft: 1 }}>
                    {rest.unit}
                  </span>
                )}
              </div>
              {sub && (
                <p style={{ fontSize: 9, fontWeight: 500, marginTop: 5, color: subColor ?? 'rgba(255,255,255,0.2)' }}>
                  {sub}
                </p>
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
        <div className="rounded-xl px-4 py-4 flex items-center justify-between"
          style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>
              BODY WEIGHT
            </p>
            {todayWeight ? (
              <div className="flex items-baseline gap-1">
                <p style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>{todayWeight}</p>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>kg</span>
              </div>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>Not logged</p>
            )}
          </div>
          <Link href="/analytics"
            className="rounded-xl"
            style={{
              padding: '8px 14px',
              background: todayWeight ? 'rgba(255,255,255,0.04)' : '#ff6b00',
              border: todayWeight ? '1px solid rgba(255,255,255,0.08)' : 'none',
              color: todayWeight ? 'rgba(255,255,255,0.4)' : '#fff',
              fontSize: 11,
              fontWeight: 500,
            }}>
            {todayWeight ? 'View →' : 'Log +'}
          </Link>
        </div>
      </div>

    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

type ClubInfo = { name: string; target: number; gap: number; progress: number; prev: number }

function ClubCard({ club, allTimeEst1rm }: { club: ClubInfo | null; allTimeEst1rm: number | null }) {
  if (!club || !allTimeEst1rm) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
          STRENGTH CLUB
        </p>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 18 }}>🏅</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>100KG Club</p>
            <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>
              Log your first lift to track progress
            </p>
          </div>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    )
  }

  const current = Math.min(allTimeEst1rm, club.target)
  const pct = club.progress

  return (
    <div className="rounded-xl p-4" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
        STRENGTH CLUB
      </p>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 18 }}>🏅</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{club.name}</p>
            <p style={{ fontSize: 12, fontWeight: 400, color: '#22c55e' }}>+{club.gap} kg to go</p>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{pct}%</span>
      </div>
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>{current}</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>kg</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.15)' }}>/ {club.target} kg</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#ff6b00' }} />
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
  const h = new Date().getUTCHours() + 9
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
