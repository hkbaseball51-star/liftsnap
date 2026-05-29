import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'
import Link from 'next/link'
import { Settings, ChevronRight, Lock, Bell, User, HelpCircle, Shield } from 'lucide-react'
import { formatVolume } from '@/lib/utils'

/* ── Rank tiers ─────────────────────────────────────── */
const RANKS = [
  { name: 'ROOKIE',   threshold: 0,          emoji: '🌱', color: '#555' },
  { name: 'GRINDER',  threshold: 10_000,     emoji: '💪', color: '#888' },
  { name: 'SOLID',    threshold: 50_000,     emoji: '🔩', color: '#aaa' },
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

/* ── Helpers ─────────────────────────────────────────── */
function fmtLargeVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}K`
  return String(Math.round(kg))
}

function fmtPR(kg: number | null): string {
  return kg != null ? `${kg}kg` : '—'
}

function primaryMuscle(sets: { muscle_group: string | null }[]): string | null {
  const c: Record<string, number> = {}
  for (const s of sets) {
    if (s.muscle_group) c[s.muscle_group] = (c[s.muscle_group] ?? 0) + 1
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
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

/* ── Page ────────────────────────────────────────────── */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen pb-nav flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-4xl mb-4">👤</p>
        <p className="text-lg font-black text-white mb-2 tracking-widest">NO ACCOUNT</p>
        <p className="text-sm text-center mb-8" style={{ color: '#555' }}>
          Create an account to save your data and sync across devices
        </p>
        <Link href="/signup"
          className="w-full max-w-xs py-4 rounded-2xl text-center text-sm font-black text-white block tracking-widest"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
          CREATE ACCOUNT
        </Link>
        <Link href="/login" className="mt-4 text-sm font-bold" style={{ color: '#444' }}>
          Already have an account? Sign in →
        </Link>
      </div>
    )
  }

  const [profileRes, sessionsRes, recentRes, benchRes, squatRes, deadliftRes] = await Promise.all([
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
  ])

  const profile     = profileRes.data
  const displayName = (profile?.display_name as string | null) ?? 'USER'
  const isPro       = profile?.plan === 'pro'
  const username    = usernameHandle(user.email ?? 'user')

  const allSessions = sessionsRes.data ?? []
  const sessionCount = allSessions.length
  const totalVolume  = allSessions.reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0)
  const rankInfo     = getRankInfo(totalVolume)

  const recentSessions = (recentRes.data ?? []) as unknown as RecentSession[]
  const benchPR    = benchRes.data?.weight_kg   ?? null
  const squatPR    = squatRes.data?.weight_kg   ?? null
  const deadliftPR = deadliftRes.data?.weight_kg ?? null

  const card = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
  } as const

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>{text}</p>
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
          style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <Settings size={18} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
      </div>

      {/* ── 2. Profile Hero ───────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-6">
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-3"
          style={{
            background: 'linear-gradient(135deg, #ff6b00 0%, #7c3aed 100%)',
            boxShadow: '0 0 24px rgba(255,107,0,0.15)',
          }}>
          {displayName[0].toUpperCase()}
        </div>

        {/* Name */}
        <p className="text-xl font-black text-white tracking-widest">{displayName}</p>

        {/* Username */}
        <p className="text-xs mt-0.5" style={{ color: '#3a3a3a', fontFamily: 'var(--font-mono)' }}>
          {username}
        </p>

        {/* Bio — empty state: visible but subtle */}
        <button className="mt-3 text-sm text-center" style={{ color: '#2a2a2a' }}>
          Add a goal or bio...
        </button>

        {/* Visibility badge */}
        <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full"
          style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          <Lock size={9} style={{ color: '#333' }} />
          <span className="text-[9px] font-black tracking-widest" style={{ color: '#333' }}>PRIVATE PROFILE</span>
        </div>
      </div>

      {/* ── 3. Quick Stats ────────────────────────────── */}
      <div className="mx-4 grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-2xl p-3.5 text-center" style={card}>
          <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {sessionCount}
          </p>
          <p className="text-[9px] font-black tracking-widest mt-1" style={{ color: '#444' }}>SESSIONS</p>
        </div>

        <div className="rounded-2xl p-3.5 text-center" style={card}>
          <p className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {fmtLargeVolume(totalVolume)}
          </p>
          <p className="text-[9px] font-black tracking-widest mt-1" style={{ color: '#444' }}>VOLUME</p>
        </div>

        <div className="rounded-2xl p-3.5 text-center flex flex-col items-center justify-center" style={card}>
          <p className="text-lg leading-none">{rankInfo.current.emoji}</p>
          <p className="text-[10px] font-black tracking-wide mt-1" style={{ color: rankInfo.current.color }}>
            {rankInfo.current.name}
          </p>
          <p className="text-[9px] font-black tracking-widest mt-1" style={{ color: '#444' }}>RANK</p>
        </div>
      </div>

      {/* ── 4. Personal Bests ─────────────────────────── */}
      <div className="mx-4 mb-4">
        {sectionLabel('PERSONAL BESTS')}
        <div style={card}>
          {[
            { label: 'Bench Press', pr: benchPR },
            { label: 'Squat',       pr: squatPR },
            { label: 'Deadlift',    pr: deadliftPR },
          ].map(({ label, pr }, i) => (
            <div key={label}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-sm font-black" style={{
                fontFamily: 'var(--font-mono)',
                color: pr != null ? '#ff6b00' : '#2a2a2a',
              }}>
                {fmtPR(pr)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Current Rank ───────────────────────────── */}
      <div className="mx-4 mb-4">
        {sectionLabel('CURRENT RANK')}
        <div className="p-4 relative overflow-hidden" style={card}>
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: `linear-gradient(90deg, ${rankInfo.current.color}60, transparent 60%)` }} />

          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-2xl font-black" style={{ color: rankInfo.current.color }}>
                {rankInfo.current.emoji} {rankInfo.current.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black tracking-widest mb-0.5" style={{ color: '#333' }}>TOTAL VOLUME</p>
              <p className="text-base font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                {fmtLargeVolume(totalVolume)}
                <span className="text-[10px] font-bold ml-1" style={{ color: '#444' }}>kg</span>
              </p>
            </div>
          </div>

          {rankInfo.next ? (
            <>
              <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(rankInfo.progress * 100)}%`,
                    background: `linear-gradient(90deg, ${rankInfo.current.color}, ${rankInfo.next.color})`,
                  }}
                />
              </div>
              <p className="text-[10px] font-bold" style={{ color: '#444' }}>
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

      {/* ── 6. Recent Activity ────────────────────────── */}
      <div className="mx-4 mb-4">
        {sectionLabel('RECENT ACTIVITY')}
        {recentSessions.length === 0 ? (
          <div className="px-4 py-8 text-center" style={card}>
            <p className="text-sm font-bold" style={{ color: '#2a2a2a' }}>No workouts logged yet</p>
          </div>
        ) : (
          <div style={card}>
            {recentSessions.map((s, i) => {
              const muscle   = primaryMuscle(s.workout_sets)
              const setCount = s.workout_sets.length
              return (
                <Link
                  key={s.id}
                  href={`/record?date=${s.trained_at}`}
                  className="flex items-center justify-between px-4 py-3.5 active:opacity-70 transition-opacity"
                  style={{
                    borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display: 'flex',
                  }}>
                  <div>
                    <p className="text-sm font-black text-white">
                      {actDate(s.trained_at)}
                      {muscle && (
                        <span style={{ color: '#555', fontWeight: 600 }}> · {muscle}</span>
                      )}
                    </p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: '#444' }}>
                      {s.total_volume_kg != null ? formatVolume(s.total_volume_kg) : '—'}
                      {' · '}{setCount} sets
                    </p>
                  </div>
                  <ChevronRight size={13} style={{ color: '#2e2e2e' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 7. Profile Settings ───────────────────────── */}
      <div className="mx-4 mb-4">
        {sectionLabel('PROFILE SETTINGS')}
        <div className="overflow-hidden" style={card}>
          {[
            { href: '/profile/edit',          label: 'Edit Profile',   icon: User,        extra: null },
            { href: '/profile/privacy',       label: 'Privacy',        icon: Shield,      extra: 'PRIVATE' },
            { href: '/profile/notifications', label: 'Notifications',  icon: Bell,        extra: null },
            { href: '/profile/support',       label: 'Help & Support', icon: HelpCircle,  extra: null },
          ].map(({ href, label, icon: Icon, extra }, i, arr) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex' }}>
              <Icon size={16} style={{ color: '#444' }} />
              <span className="flex-1 text-sm font-bold text-white">{label}</span>
              {extra && (
                <span className="text-[9px] font-black tracking-widest mr-1.5" style={{ color: '#333' }}>{extra}</span>
              )}
              <ChevronRight size={14} style={{ color: '#2e2e2e' }} />
            </Link>
          ))}
        </div>
      </div>

      {/* ── 8. Upgrade to Pro ─────────────────────────── */}
      {!isPro && (
        <div className="mx-4 mb-5">
          <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,107,0,0.18)' }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <p className="text-sm font-black text-white">Upgrade to Pro</p>
                <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                  No watermark · Custom themes · Detailed analytics
                </p>
              </div>
              <span className="text-[9px] font-black px-2 py-1 rounded-full shrink-0 mt-0.5"
                style={{ background: 'rgba(255,107,0,0.1)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.2)' }}>
                PRO
              </span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-xs font-black"
                style={{ background: '#1a1a1a', color: '#555', border: '1px solid #222' }}>
                ¥480 / mo
              </button>
              <button className="flex-1 py-2.5 rounded-xl text-xs font-black text-white"
                style={{ background: '#ff6b00' }}>
                ¥2,980 / yr ★
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out ──────────────────────────────────── */}
      <form action={logout} className="mx-4 mb-10">
        <button type="submit"
          className="w-full py-4 rounded-2xl text-sm font-black tracking-widest"
          style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.1)' }}>
          SIGN OUT
        </button>
      </form>

    </div>
  )
}
