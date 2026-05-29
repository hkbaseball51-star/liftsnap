import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, Share2 } from 'lucide-react'
import { formatVolume } from '@/lib/utils'
import TrainingCalendar, { type CalendarSession } from '@/components/home/TrainingCalendar'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#050505' }}>
        <p className="text-xl font-black tracking-widest text-white mb-1">LIFTSNAP</p>
        <p className="text-xs font-bold tracking-widest" style={{ color: '#333' }}>LOADING...</p>
      </div>
    )
  }

  const todayStr = today()
  const ninetyDaysAgo = new Date(todayStr + 'T00:00:00')
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = `${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`

  const [
    thisWeekRes, calendarSessionsRes, profileRes,
    lastWeekRes, todayWeightRes, atbRes,
  ] = await Promise.all([
    supabase.from('workout_sessions')
      .select('id, trained_at, total_volume_kg')
      .eq('user_id', user.id)
      .gte('trained_at', getWeekStart())
      .not('completed_at', 'is', null),

    supabase.from('workout_sessions')
      .select('id, trained_at')
      .eq('user_id', user.id)
      .gte('trained_at', ninetyDaysAgoStr)
      .not('completed_at', 'is', null),

    supabase.from('profiles')
      .select('display_name')
      .eq('id', user.id)
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
      .maybeSingle(),

    supabase.from('workout_sets')
      .select('weight_kg, reps')
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('weight_kg', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

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
  const thisWeekSessions = thisWeekRes.data ?? []
  const totalSessions90 = calendarSessionsRes.data?.length ?? 0
  const todayWorked = thisWeekSessions.some(s => s.trained_at === todayStr)
  const displayName = profileRes.data?.display_name as string | null

  const thisWeekVolume = thisWeekSessions.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const lastWeekVolume = (lastWeekRes.data ?? []).reduce(
    (s: number, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0), 0
  )
  const volumeDiff = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null
  const todayWeight = todayWeightRes.data?.weight_kg ?? null

  const allTimeBest = atbRes.data as { weight_kg: number; reps: number } | null
  const allTimeEst1rm = allTimeBest
    ? allTimeBest.reps === 1 ? allTimeBest.weight_kg : Math.round(allTimeBest.weight_kg * (1 + allTimeBest.reps / 30))
    : null
  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#050505' }}>

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
          Welcome back{displayName ? ',' : '.'}
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
            No session today — let&apos;s change that.
          </p>
        )}
      </div>

      {/* ── SHARE TODAY'S WORKOUT CTA ── */}
      <div className="px-4 mb-5">
        <Link href={todayWorked ? `/share?type=today&date=${todayStr}` : `/record?date=${todayStr}`}>
          <div className="rounded-2xl overflow-hidden relative active:opacity-75 transition-opacity"
            style={{
              background: '#181818',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
            {todayWorked && (
              <div style={{ height: 1, background: 'linear-gradient(90deg, #ff6b00 0%, transparent 70%)', opacity: 0.7 }} />
            )}
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 4,
                  color: todayWorked ? 'rgba(255,107,0,0.8)' : 'rgba(255,255,255,0.18)',
                }}>
                  {todayWorked ? "TODAY'S WORKOUT" : 'NO SESSION YET'}
                </p>
                <p style={{
                  fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 3,
                  color: todayWorked ? '#ffffff' : 'rgba(255,255,255,0.3)',
                }}>
                  {todayWorked ? "Share Today's Workout" : "Log Today's Workout"}
                </p>
                <p style={{
                  fontSize: 11, fontWeight: 400,
                  color: todayWorked ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)',
                }}>
                  {todayWorked ? 'Post your effort to Instagram Story' : 'Record your session first'}
                </p>
              </div>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: todayWorked ? '#ff6b00' : 'rgba(255,255,255,0.04)',
                  border: todayWorked ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: todayWorked ? '0 4px 16px rgba(255,107,0,0.4)' : 'none',
                }}>
                <Share2 size={18} style={{ color: todayWorked ? '#fff' : 'rgba(255,255,255,0.18)' }} />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── MONTHLY TRAINING CALENDAR ── */}
      <div className="px-4 mb-5">
        <TrainingCalendar sessions={calendarSessions} todayStr={todayStr} />
      </div>

      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-4">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.32)', marginBottom: 10 }}>
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
              subColor: 'rgba(255,255,255,0.32)' as string,
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
            <div key={label} className="premium-card rounded-xl p-3">
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
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

      {/* ── STRENGTH CLUB ── */}
      <div className="px-4 mb-4">
        <ClubCard club={club} allTimeEst1rm={allTimeEst1rm} />
      </div>

      {/* ── BODY WEIGHT ── */}
      <div className="px-4 mb-4">
        <div className="premium-card rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>
              BODY WEIGHT
            </p>
            {todayWeight ? (
              <div className="flex items-baseline gap-1">
                <p style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{todayWeight}</p>
                <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>kg</span>
              </div>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.32)' }}>Not logged</p>
            )}
          </div>
          <Link href="/analytics"
            className="rounded-xl"
            style={{
              padding: '7px 14px',
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
      <div className="premium-card rounded-xl px-4 py-3">
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
          STRENGTH CLUB
        </p>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 16 }}>🏅</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>100KG Club</p>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.38)' }}>
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
    <div className="premium-card rounded-xl px-4 py-3">
      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
        STRENGTH CLUB
      </p>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 16 }}>🏅</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{club.name}</p>
            <p style={{ fontSize: 11, fontWeight: 400, color: '#22c55e' }}>+{club.gap} kg to go</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{current}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/ {club.target} kg</span>
        </div>
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

/** YYYY-MM-DD in JST — avoids UTC-off-by-one for Japan users */
function jstDate(d: Date = new Date()): string {
  return d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function today() { return jstDate() }

function getWeekStart() {
  const d = new Date(jstDate() + 'T00:00:00')
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLastWeekStart() {
  const d = new Date(getWeekStart() + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', hour12: false }), 10)
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
