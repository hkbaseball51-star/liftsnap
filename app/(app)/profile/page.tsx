import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Settings, ChevronRight, Lock } from 'lucide-react'
import { formatVolume } from '@/lib/utils'

/* ── Rank tiers ─────────────────────────────────────── */
const RANKS = [
  { name: 'ROOKIE',   threshold: 0,          emoji: '🌱', color: '#7ED957' },
  { name: 'GRINDER',  threshold: 10_000,     emoji: '💪', color: '#a0a0a0' },
  { name: 'SOLID',    threshold: 50_000,     emoji: '🔩', color: '#c0c0c0' },
  { name: 'ADVANCED', threshold: 150_000,    emoji: '⚡', color: '#60a5fa' },
  { name: 'ELITE',    threshold: 500_000,    emoji: '🎯', color: '#a78bfa' },
  { name: 'BEAST',    threshold: 1_000_000,  emoji: '🔥', color: '#ff6b00' },
  { name: 'LEGEND',   threshold: 2_000_000,  emoji: '👑', color: '#fbbf24' },
]

function getRankInfo(vol: number) {
  let i = 0
  for (let j = RANKS.length - 1; j >= 0; j--) {
    if (vol >= RANKS[j].threshold) { i = j; break }
  }
  const current = RANKS[i]
  const next = RANKS[i + 1] ?? null
  return {
    current,
    next,
    progress: next ? Math.min((vol - current.threshold) / (next.threshold - current.threshold), 1) : 1,
    remaining: next ? Math.max(next.threshold - vol, 0) : 0,
  }
}

function fmtLargeVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}K`
  return String(Math.round(kg))
}

function topMuscle(groups: { muscle_group: string | null }[]): string | null {
  const c: Record<string, number> = {}
  for (const g of groups) {
    if (g.muscle_group) c[g.muscle_group] = (c[g.muscle_group] ?? 0) + 1
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function primaryMuscle(sets: { muscle_group: string | null }[]): string | null {
  return topMuscle(sets)
}

function actDate(d: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [, m, day] = d.split('-').map(Number)
  return `${months[m - 1]} ${day}`
}

function usernameHandle(email: string): string {
  return '@' + email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
}

type RecentSession = {
  id: string
  trained_at: string
  total_volume_kg: number | null
  workout_sets: { muscle_group: string | null }[]
}

/* ── Design tokens ───────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.65)',
  muted:     'rgba(255,255,255,0.48)',
  empty:     'rgba(255,255,255,0.42)',
  label:     'rgba(255,255,255,0.58)',
  divider:   'rgba(255,255,255,0.08)',
  card: {
    background: '#181818',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
  } as const,
}

/* ── Page ────────────────────────────────────────────── */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen pb-nav flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-5xl mb-4">🏋️</p>
        <p className="text-lg font-black text-white mb-2 tracking-widest">YOUR PROFILE</p>
        <p className="text-sm text-center mb-8 leading-relaxed" style={{ color: T.muted }}>
          Create an account to track your progress and build your lifting profile.
        </p>
        <Link href="/signup"
          className="w-full max-w-xs py-4 rounded-2xl text-center text-sm font-black text-white block tracking-widest"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
          CREATE ACCOUNT
        </Link>
        <Link href="/login" className="mt-4 text-sm font-bold" style={{ color: T.muted }}>
          Already have an account? Sign in →
        </Link>
      </div>
    )
  }

  const [
    profileRes, sessionsRes, recentRes,
    benchRes, squatRes, deadliftRes,
    bestLiftRes, muscleGroupsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, plan').eq('id', user.id).single(),
    supabase.from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
    supabase.from('workout_sessions')
      .select('id, trained_at, total_volume_kg, workout_sets(muscle_group)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('trained_at', { ascending: false })
      .limit(3),
    supabase.from('workout_sets').select('weight_kg')
      .ilike('exercise_name', '%bench%').eq('is_completed', true)
      .not('weight_kg', 'is', null).order('weight_kg', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('workout_sets').select('weight_kg')
      .ilike('exercise_name', '%squat%').eq('is_completed', true)
      .not('weight_kg', 'is', null).order('weight_kg', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('workout_sets').select('weight_kg')
      .ilike('exercise_name', '%deadlift%').eq('is_completed', true)
      .not('weight_kg', 'is', null).order('weight_kg', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('workout_sets').select('exercise_name, weight_kg')
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .order('weight_kg', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('workout_sets').select('muscle_group')
      .eq('is_completed', true)
      .not('muscle_group', 'is', null),
  ])

  const profile     = profileRes.data
  const displayName = (profile?.display_name as string | null) ?? 'USER'
  const username    = usernameHandle(user.email ?? 'user')

  const allSessions  = sessionsRes.data ?? []
  const sessionCount = allSessions.length
  const totalVolume  = allSessions.reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0)
  const rankInfo     = getRankInfo(totalVolume)

  const recentSessions = (recentRes.data ?? []) as unknown as RecentSession[]
  const benchPR    = benchRes.data?.weight_kg   ?? null
  const squatPR    = squatRes.data?.weight_kg   ?? null
  const deadliftPR = deadliftRes.data?.weight_kg ?? null

  const bestLift   = bestLiftRes.data as { exercise_name: string; weight_kg: number } | null
  const mainMuscle = topMuscle((muscleGroupsRes.data ?? []) as { muscle_group: string | null }[])

  const sec = (text: string) => (
    <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
  )

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* ── 1. Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <h1 className="text-xl font-black tracking-widest text-white">PROFILE</h1>
        <Link
          href="/profile/settings"
          aria-label="Open settings"
          className="p-2 rounded-xl flex items-center justify-center active:opacity-60 transition-opacity"
          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Settings size={18} style={{ color: T.secondary }} />
        </Link>
      </div>

      {/* ── 2. Profile Hero ───────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-7">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4"
          style={{
            background: 'linear-gradient(135deg, #ff6b00 0%, #7c3aed 100%)',
            boxShadow: '0 0 36px rgba(255,107,0,0.18)',
          }}>
          {displayName[0].toUpperCase()}
        </div>

        <p className="text-2xl font-black text-white tracking-tight leading-none">{displayName}</p>

        <p className="text-xs mt-2" style={{ color: T.secondary, fontFamily: 'var(--font-mono)' }}>
          {username}
        </p>

        <p className="text-sm text-center mt-4 px-8 leading-relaxed" style={{ color: T.secondary }}>
          Set your lifting goal.
        </p>

        <div className="flex items-center gap-1.5 mt-5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Lock size={9} style={{ color: 'rgba(255,255,255,0.45)' }} />
          <span className="text-[9px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>PRIVATE PROFILE</span>
        </div>
      </div>

      {/* ── 3. Quick Stats ────────────────────────────── */}
      <div className="mx-4 grid grid-cols-3 gap-2 mb-5">

        <div className="rounded-2xl px-2 py-4 text-center" style={T.card}>
          <p className="text-2xl font-black leading-none"
            style={{ color: sessionCount > 0 ? T.main : T.empty, fontFamily: 'var(--font-mono)' }}>
            {sessionCount > 0 ? sessionCount : '—'}
          </p>
          <p className="text-[9px] font-black tracking-widest mt-2" style={{ color: T.label }}>SESSIONS</p>
        </div>

        <div className="rounded-2xl px-2 py-4 text-center" style={T.card}>
          {totalVolume > 0 ? (
            <div className="leading-none">
              <span className="text-xl font-black" style={{ color: T.main, fontFamily: 'var(--font-mono)' }}>
                {fmtLargeVolume(totalVolume)}
              </span>
              <span className="text-[10px] font-bold ml-0.5" style={{ color: T.muted }}>kg</span>
            </div>
          ) : (
            <p className="text-2xl font-black leading-none" style={{ color: T.empty, fontFamily: 'var(--font-mono)' }}>—</p>
          )}
          <p className="text-[9px] font-black tracking-widest mt-2" style={{ color: T.label }}>VOLUME</p>
        </div>

        <div className="rounded-2xl px-2 py-4 text-center flex flex-col items-center" style={T.card}>
          <p className="text-xl leading-none">{rankInfo.current.emoji}</p>
          <p className="text-[10px] font-black tracking-wide mt-1.5 leading-none" style={{ color: rankInfo.current.color }}>
            {rankInfo.current.name}
          </p>
          <p className="text-[9px] font-black tracking-widest mt-2" style={{ color: T.label }}>RANK</p>
        </div>

      </div>

      {/* ── 4. Personal Bests ─────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('PERSONAL BESTS')}
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'BENCH', pr: benchPR },
            { label: 'SQUAT', pr: squatPR },
            { label: 'DEAD',  pr: deadliftPR },
          ] as const).map(({ label, pr }) => (
            <div key={label} className="rounded-2xl p-4 flex flex-col items-center"
              style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20 }}>
              <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
                {label}
              </p>
              {pr != null ? (
                <>
                  <p className="text-xl font-black leading-none" style={{ color: '#ff6b00', fontFamily: 'var(--font-mono)' }}>
                    {pr}
                  </p>
                  <p className="text-[9px] font-bold mt-1" style={{ color: T.muted }}>kg</p>
                </>
              ) : (
                <p className="text-xl font-black leading-none" style={{ color: T.empty, fontFamily: 'var(--font-mono)' }}>—</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Strength Summary ───────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('STRENGTH SUMMARY')}
        <div className="overflow-hidden" style={T.card}>

          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>
              BEST LIFT
            </p>
            {bestLift ? (
              <p className="text-sm font-bold text-right ml-3">
                <span style={{ color: T.secondary }}>{bestLift.exercise_name} </span>
                <span className="font-black" style={{ color: '#ff6b00', fontFamily: 'var(--font-mono)' }}>
                  {bestLift.weight_kg}kg
                </span>
              </p>
            ) : (
              <p className="text-sm font-bold" style={{ color: T.empty }}>Not logged yet</p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>
              MOST TRAINED
            </p>
            {mainMuscle ? (
              <p className="text-sm font-black capitalize" style={{ color: T.secondary }}>{mainMuscle}</p>
            ) : (
              <p className="text-sm font-bold" style={{ color: T.empty }}>Not set</p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>
              SPLIT
            </p>
            <p className="text-sm font-bold" style={{ color: T.empty }}>—</p>
          </div>

        </div>
      </div>

      {/* ── 6. Current Rank ───────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('CURRENT RANK')}
        <div className="p-4 relative overflow-hidden" style={T.card}>
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: `linear-gradient(90deg, ${rankInfo.current.color}60, transparent 65%)` }} />

          <div className="mb-4">
            <p className="text-2xl font-black" style={{ color: rankInfo.current.color }}>
              {rankInfo.current.emoji} {rankInfo.current.name}
            </p>
            <p className="text-xs mt-1 font-bold" style={{ color: T.muted }}>
              {totalVolume > 0 ? `${fmtLargeVolume(totalVolume)}kg total volume` : 'Start logging to rank up'}
            </p>
          </div>

          {rankInfo.next ? (
            <>
              <div className="h-1.5 rounded-full mb-2.5" style={{ background: 'rgba(255,255,255,0.10)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(rankInfo.progress * 100)}%`,
                    background: `linear-gradient(90deg, ${rankInfo.current.color}, ${rankInfo.next.color})`,
                    minWidth: totalVolume > 0 ? 4 : 0,
                  }}
                />
              </div>
              <p className="text-[11px] font-bold" style={{ color: T.muted }}>
                {fmtLargeVolume(rankInfo.remaining)}kg to {rankInfo.next.name}
              </p>
            </>
          ) : (
            <p className="text-[10px] font-black tracking-widest" style={{ color: rankInfo.current.color }}>
              MAX RANK ACHIEVED
            </p>
          )}
        </div>
      </div>

      {/* ── 7. Recent Activity ────────────────────────── */}
      <div className="mx-4 mb-10">
        {sec('RECENT ACTIVITY')}
        {recentSessions.length === 0 ? (
          <div className="px-4 py-9 text-center rounded-2xl" style={T.card}>
            <p className="text-sm font-black mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>No workouts yet.</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Log your first session to build your lifting profile.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden" style={T.card}>
            {recentSessions.map((s, i) => {
              const muscle   = primaryMuscle(s.workout_sets)
              const setCount = s.workout_sets.length
              return (
                <Link
                  key={s.id}
                  href={`/record?date=${s.trained_at}`}
                  className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
                  style={{
                    borderBottom: i < recentSessions.length - 1 ? `1px solid ${T.divider}` : 'none',
                    display: 'flex',
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-black text-white">{actDate(s.trained_at)}</p>
                      {muscle && (
                        <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.07)',
                            color: T.secondary,
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}>
                          {muscle.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold" style={{ color: T.muted }}>
                      {s.total_volume_kg != null ? formatVolume(s.total_volume_kg) : '—'}
                      {' · '}{setCount} {setCount === 1 ? 'set' : 'sets'}
                    </p>
                  </div>
                  <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.30)' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
