import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, Share2 } from 'lucide-react'
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

  const [thisWeekRes, calendarSessionsRes, profileRes] = await Promise.all([
    supabase.from('workout_sessions')
      .select('id, trained_at')
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

  const thisWeekSessions = thisWeekRes.data ?? []
  const totalSessions90 = calendarSessionsRes.data?.length ?? 0
  const todayWorked = thisWeekSessions.some(s => s.trained_at === todayStr)
  const displayName = profileRes.data?.display_name as string | null

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

    </div>
  )
}

/* ─── Pure functions ──────────────────────────────────────── */

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

function getGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', hour12: false }), 10)
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
