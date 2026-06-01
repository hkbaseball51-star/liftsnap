import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import Link from 'next/link'
import { Settings, ChevronRight, Lock } from 'lucide-react'
import { formatVolume } from '@/lib/utils'
import { RANKS, getRankInfo, fmtComma } from '@/lib/ranks'
import { t, type Locale, resolveServerLocale } from '@/lib/i18n'
import { toDisplayWeight, weightUnitLabel, type WeightUnit } from '@/lib/units'
import PersonalBests from '@/components/profile/PersonalBests'
import { calcBestProofStreak } from '@/lib/proofStreak'
import { getPersonalBests } from '@/actions/personalBests'
import { ensureProfile, resolveDisplayName } from '@/lib/auth/ensureProfile'

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



type RecentSession = {
  id: string
  trained_at: string
  total_volume_kg: number | null
  workout_sets: { muscle_group: string | null }[]
}

/* ── Design tokens ───────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.78)',
  muted:     'rgba(255,255,255,0.65)',
  empty:     'rgba(255,255,255,0.65)',
  label:     'rgba(255,255,255,0.72)',
  divider:   'rgba(255,255,255,0.12)',
  card: {
    background: '#1E1E1E',
    border: '1px solid rgba(255,255,255,0.19)',
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
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.35)' }}>
          CREATE ACCOUNT
        </Link>
        <Link href="/login" className="mt-4 text-sm font-bold" style={{ color: T.muted }}>
          Already have an account? Sign in →
        </Link>
      </div>
    )
  }

  // Ensure profile exists (creates one from auth metadata if missing)
  const profile = await ensureProfile(supabase, user)

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const cookieLang = cookieStore.get('liftsnap_lang')?.value
  const locale: Locale = resolveServerLocale(
    cookieLang,
    profile?.language ?? null,
    headerStore.get('accept-language') ?? ''
  )
  const weightUnit: WeightUnit = profile?.weight_unit === 'lbs' ? 'lbs' : 'kg'

  // Display name: profiles.display_name → user_metadata → email prefix → 'User'
  const displayName = resolveDisplayName(profile, user)
  const profileUsername = profile?.username ?? null

  // Short user ID for display when no username is available
  const shortId = user.id.slice(0, 8)

  const [
    sessionsRes, recentRes,
    personalBests,
    bestLiftRes, muscleGroupsRes, photoLogsRes,
  ] = await Promise.all([
    supabase.from('workout_sessions')
      .select('total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
    supabase.from('workout_sessions')
      .select('id, trained_at, total_volume_kg, workout_sets(muscle_group)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('trained_at', { ascending: false })
      .limit(3),
    getPersonalBests(),
    supabase.from('workout_sets').select('exercise_name, weight_kg')
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .order('weight_kg', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('workout_sets').select('muscle_group')
      .eq('is_completed', true)
      .not('muscle_group', 'is', null),
    supabase.from('workout_photo_logs')
      .select('workout_date')
      .eq('user_id', user.id),
  ])

  const allSessions  = sessionsRes.data ?? []
  const sessionCount = allSessions.length
  const totalVolume  = allSessions.reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0)
  const rankInfo     = getRankInfo(totalVolume)

  const recentSessions = (recentRes.data ?? []) as unknown as RecentSession[]
  const bestLift   = bestLiftRes.data as { exercise_name: string; weight_kg: number } | null
  const mainMuscle = topMuscle((muscleGroupsRes.data ?? []) as { muscle_group: string | null }[])
  const workoutDatesForStreak = allSessions.map(s => (s as { trained_at: string }).trained_at.slice(0, 10))
  const photoDatesForStreak   = ((photoLogsRes.data ?? []) as { workout_date: string }[]).map(p => p.workout_date)
  const bestStreak = calcBestProofStreak(workoutDatesForStreak, photoDatesForStreak)

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
          style={{ background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)' }}>
          <Settings size={18} style={{ color: T.secondary }} />
        </Link>
      </div>

      {/* ── 2. Profile Hero ───────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-6">
        {/* Avatar: image from avatar_url when available, otherwise initials */}
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="w-24 h-24 rounded-full object-cover mb-4"
            style={{ boxShadow: '0 0 36px rgba(237,116,47,0.18)' }}
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4"
            style={{
              background: 'linear-gradient(135deg, #ED742F 0%, #6E38D4 100%)',
              boxShadow: '0 0 36px rgba(237, 116, 47,0.18)',
            }}>
            {displayName[0].toUpperCase()}
          </div>
        )}

        <p className="text-2xl font-black text-white tracking-tight leading-none">{displayName}</p>

        {/* Username or short ID fallback */}
        <p className="text-xs mt-1.5" style={{ color: T.secondary, fontFamily: 'var(--font-mono)' }}>
          {profileUsername ? `@${profileUsername}` : `ID: ${shortId}`}
        </p>

        {/* Email — small and muted, never primary */}
        {user.email && (
          <p className="text-[10px] mt-0.5 truncate max-w-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
            {user.email}
          </p>
        )}

        <div className="flex flex-col items-center mt-5 gap-2">
          <div className="flex items-center gap-2">
            {/* Rank badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: `${rankInfo.current.color}18`,
                border: `1px solid ${rankInfo.current.color}40`,
              }}>
              <span className="text-xs leading-none">{rankInfo.current.emoji}</span>
              <span className="text-[10px] font-black tracking-wide" style={{ color: rankInfo.current.color }}>
                {rankInfo.current.name}
              </span>
            </div>

            {/* Private badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.19)' }}>
              <Lock size={9} style={{ color: 'rgba(255,255,255,0.65)' }} />
              <span className="text-[9px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.72)' }}>
                PRIVATE
              </span>
            </div>
          </div>

          {/* Rank description */}
          <p className="text-[11px]" style={{ color: T.muted }}>
            {t(locale, `profile.rank.${rankInfo.current.name.toLowerCase()}.description`)}
          </p>
        </div>
      </div>

      {/* ── 3. Stats Bar ──────────────────────────────── */}
      <div className="mx-4 mb-5">
        <div className="flex rounded-2xl overflow-hidden" style={T.card}>

          {/* Sessions */}
          <div className="flex-1 flex flex-col items-center justify-center py-5 gap-1.5">
            <p className="text-2xl font-black leading-none"
              style={{ color: T.main, fontFamily: 'var(--font-mono)' }}>
              {sessionCount}
            </p>
            <p className="text-[9px] font-black tracking-widest" style={{ color: T.label }}>SESSIONS</p>
          </div>

          <div className="w-px my-4" style={{ background: T.divider }} />

          {/* Volume */}
          <div className="flex-1 flex flex-col items-center justify-center py-5 gap-1.5">
            <div className="flex items-baseline gap-0.5 leading-none">
              <p className="text-2xl font-black" style={{ color: T.main, fontFamily: 'var(--font-mono)' }}>
                {totalVolume > 0 ? fmtLargeVolume(toDisplayWeight(totalVolume, weightUnit)) : '0'}
              </p>
              <p className="text-[10px] font-bold" style={{ color: T.muted }}>{weightUnitLabel(weightUnit)}</p>
            </div>
            <p className="text-[9px] font-black tracking-widest" style={{ color: T.label }}>VOLUME</p>
          </div>

          <div className="w-px my-4" style={{ background: T.divider }} />

          {/* Best Streak */}
          <div className="flex-1 flex flex-col items-center justify-center py-5 gap-1.5">
            {bestStreak > 0 ? (
              <p className="text-2xl font-black leading-none"
                style={{ color: T.main, fontFamily: 'var(--font-mono)' }}>
                {bestStreak}W
              </p>
            ) : (
              <p className="text-sm font-black leading-none tracking-widest" style={{ color: T.empty }}>
                {t(locale, 'profile.streakStart')}
              </p>
            )}
            <p className="text-[9px] font-black tracking-widest" style={{ color: T.label }}>BEST PROOF STREAK</p>
          </div>

        </div>
      </div>

      {/* ── 4. Personal Bests ─────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('PERSONAL BESTS')}
        <PersonalBests bench={personalBests.bench} squat={personalBests.squat} deadlift={personalBests.deadlift} />
      </div>

      {/* ── 5. Lifter Summary ─────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('LIFTER SUMMARY')}
        <div className="overflow-hidden" style={T.card}>

          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>BEST LIFT</p>
            {bestLift ? (
              <p className="text-sm font-bold text-right ml-3">
                <span style={{ color: T.secondary }}>{bestLift.exercise_name} </span>
                <span className="font-black" style={{ color: '#ED742F', fontFamily: 'var(--font-mono)' }}>
                  {toDisplayWeight(bestLift.weight_kg, weightUnit)}{weightUnitLabel(weightUnit)}
                </span>
              </p>
            ) : (
              <p className="text-sm font-bold" style={{ color: T.empty }}>{t(locale, 'profile.notLoggedYet')}</p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>MOST TRAINED</p>
            {mainMuscle ? (
              <p className="text-sm font-black capitalize" style={{ color: T.secondary }}>{mainMuscle}</p>
            ) : (
              <p className="text-sm font-bold" style={{ color: T.empty }}>{t(locale, 'profile.notSet')}</p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[10px] font-black tracking-widest shrink-0" style={{ color: T.label }}>SPLIT</p>
            <p className="text-sm font-bold" style={{ color: T.empty }}>{t(locale, 'profile.notSet')}</p>
          </div>

        </div>
      </div>

      {/* ── 6. Rank Progress ──────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('RANK PROGRESS')}
        <div className="p-4 relative overflow-hidden" style={T.card}>
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: `linear-gradient(90deg, ${rankInfo.current.color}55, transparent 65%)` }} />

          {rankInfo.next ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: T.label }}>NEXT RANK</p>
                  <p className="text-xl font-black" style={{ color: rankInfo.next.color }}>
                    {rankInfo.next.emoji} {rankInfo.next.name}
                  </p>
                  <p className="text-xs font-bold mt-1" style={{ color: T.muted }}>
                    {locale === 'ja'
                      ? `あと${fmtComma(Math.round(toDisplayWeight(rankInfo.remaining, weightUnit)))}${weightUnitLabel(weightUnit)}でランクアップ`
                      : `${fmtComma(Math.round(toDisplayWeight(rankInfo.remaining, weightUnit)))}${weightUnitLabel(weightUnit)} to go`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: T.label }}>TOTAL VOLUME</p>
                  <p className="text-sm font-black"
                    style={{ color: T.main, fontFamily: 'var(--font-mono)' }}>
                    {fmtComma(Math.round(toDisplayWeight(totalVolume, weightUnit)))}{weightUnitLabel(weightUnit)}
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(rankInfo.progress * 100)}%`,
                    background: `linear-gradient(90deg, ${rankInfo.current.color}, ${rankInfo.next.color})`,
                    minWidth: totalVolume > 0 ? 4 : 0,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-[10px] font-black tracking-widest" style={{ color: rankInfo.current.color }}>
              MAX RANK ACHIEVED
            </p>
          )}
        </div>
      </div>

      {/* ── 7. Rank Unlocks ───────────────────────────── */}
      <div className="mx-4 mb-5">
        {sec('RANK UNLOCKS')}
        <div className="overflow-hidden" style={T.card}>
          {RANKS.slice(1).map((rank, i) => {
            const unlocked = totalVolume >= rank.threshold
            return (
              <div
                key={rank.name}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < RANKS.length - 2 ? `1px solid ${T.divider}` : 'none',
                  opacity: unlocked ? 1 : 0.42,
                }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{rank.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black" style={{ color: unlocked ? rank.color : T.label }}>
                    {rank.name}
                  </p>
                  <p className="text-[10px]" style={{ color: T.muted }}>
                    {t(locale, `profile.rank.${rank.name.toLowerCase()}.unlockText`)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: T.muted, fontFamily: 'var(--font-mono)' }}>
                    {fmtComma(rank.threshold)}kg
                  </p>
                  {unlocked && (
                    <p className="text-[9px] font-black" style={{ color: rank.color }}>
                      {t(locale, 'profile.unlocked')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 8. Recent Activity ────────────────────────── */}
      <div className="mx-4 mb-10">
        {sec('RECENT ACTIVITY')}
        {recentSessions.length === 0 ? (
          <div className="px-4 py-9 text-center rounded-2xl" style={T.card}>
            <p className="text-sm font-black mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {t(locale, 'profile.noWorkoutsYet')}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
              {t(locale, 'profile.logFirstSession')}
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
                            background: 'rgba(255,255,255,0.12)',
                            color: T.secondary,
                            border: '1px solid rgba(255,255,255,0.19)',
                          }}>
                          {muscle.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold" style={{ color: T.muted }}>
                      {s.total_volume_kg != null ? formatVolume(s.total_volume_kg, weightUnit) : '—'}
                      {' · '}{locale === 'ja' ? `${setCount}セット` : `${setCount} ${setCount === 1 ? 'set' : 'sets'}`}
                    </p>
                  </div>
                  <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.52)' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
