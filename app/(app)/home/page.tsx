import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Zap } from 'lucide-react'
import { formatVolume } from '@/lib/utils'
import CalendarWithSummary from '@/components/home/CalendarWithSummary'
import StreakBadge from '@/components/home/StreakBadge'
import HomeBodyLogSection from '@/components/home/HomeBodyLogSection'
import type { DaySummary } from '@/components/home/CalendarWithSummary'
import type { CalendarSession } from '@/components/home/TrainingCalendar'
import { t, type Locale, resolveServerLocale } from '@/lib/i18n'
import { calcProofStreak } from '@/lib/proofStreak'
import HomeGreeting from '@/components/home/HomeGreeting'
import HomeCTACard from '@/components/home/HomeCTACard'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Anonymous session not yet created (AutoAuthClient hasn't run yet).
    // SplashScreen in the layout already covers the UI; plain black keeps
    // this branch invisible until router.refresh() brings a real user.
    return <div className="fixed inset-0 bg-black" />
  }

  const todayStr = today()
  const ninetyDaysAgo = new Date(todayStr + 'T00:00:00')
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = `${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`

  const rawResults = await Promise.allSettled([
    supabase.from('workout_sessions')
      .select('id, trained_at, total_volume_kg')
      .eq('user_id', user.id)
      .gte('trained_at', getWeekStart())
      .not('completed_at', 'is', null),

    supabase.from('workout_sessions')
      .select('id, trained_at, workout_sets(exercise_name, muscle_group, weight_kg, reps, note)')
      .eq('user_id', user.id)
      .gte('trained_at', ninetyDaysAgoStr)
      .not('completed_at', 'is', null),

    supabase.from('profiles')
      .select('display_name, onboarding_completed, language, username, avatar_url')
      .eq('id', user.id)
      .single(),

    supabase.from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .gte('trained_at', getLastWeekStart())
      .lt('trained_at', getWeekStart())
      .not('completed_at', 'is', null),

    supabase.from('body_weights')
      .select('weight_kg, recorded_at')
      .eq('user_id', user.id)
      .gte('recorded_at', ninetyDaysAgoStr),

    supabase.from('workout_sets')
      .select('weight_kg, reps')
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('weight_kg', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('workout_sessions')
      .select('trained_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('trained_at', getStreakWindowStart()),

    supabase.from('workout_photo_logs')
      .select('workout_date, image_path, thumbnail_path, workout_session_id, created_at')
      .eq('user_id', user.id)
      .gte('workout_date', ninetyDaysAgoStr)
      .order('workout_date', { ascending: false })
      .limit(20),
  ])
  const [
    thisWeekRes, calendarSessionsRes, profileRes,
    lastWeekRes, bwHistoryRes, atbRes,
    streakSessionsRes, photoLogsRes,
  ] = rawResults.map(settled)

  /* ── Calendar sessions + day summaries (all from embedded query) ── */
  type SetRow = { exercise_name: string; muscle_group: string; weight_kg: number | null; reps: number | null; note: string | null }
  type SessionRow = { id: string; trained_at: string; workout_sets: SetRow[] }

  const calendarSessions: CalendarSession[] = []
  const daySummaries: Record<string, DaySummary> = {}

  for (const session of (calendarSessionsRes.data as SessionRow[] ?? [])) {
    const sets = session.workout_sets ?? []

    // Skip sessions with no valid sets (empty drafts, exercise cards with no weight/reps)
    const hasValidWorkout = sets.some(s =>
      s.exercise_name &&
      (
        (typeof s.weight_kg === 'number' && s.weight_kg > 0) ||
        (typeof s.reps === 'number' && s.reps > 0)
      )
    )
    if (!hasValidWorkout) continue

    // Muscle group counts for calendar dot + badge
    const mgMap = new Map<string, number>()
    for (const s of sets) {
      const mg = s.muscle_group?.toLowerCase()
      if (mg) mgMap.set(mg, (mgMap.get(mg) ?? 0) + 1)
    }
    const sortedMg = mgMap.size > 0 ? [...mgMap.entries()].sort((a, b) => b[1] - a[1]) : null
    const topMuscle = sortedMg ? sortedMg[0][0] : 'full body'
    const allMuscleGroups = sortedMg ? sortedMg.map(([mg]) => mg) : []

    calendarSessions.push({ date: session.trained_at, muscleGroup: topMuscle, allMuscleGroups })

    // Per-exercise stats for summary card
    const exMap = new Map<string, { volume: number; bestEst1rm: number; bestWeight: number; bestReps: number; note: string | null }>()
    let totalSets = 0
    let totalVolume = 0
    let best1rm = 0

    for (const s of sets) {
      const w = s.weight_kg ?? 0
      const r = s.reps ?? 0
      totalSets++
      totalVolume += w * r
      const est = w > 0 && r > 0 ? (r === 1 ? w : Math.round(w * (1 + r / 30))) : 0
      if (est > best1rm) best1rm = est

      const ex = exMap.get(s.exercise_name) ?? { volume: 0, bestEst1rm: 0, bestWeight: 0, bestReps: 0, note: null }
      const isBetter = est > ex.bestEst1rm
      exMap.set(s.exercise_name, {
        volume: ex.volume + w * r,
        bestEst1rm: isBetter ? est : ex.bestEst1rm,
        bestWeight: isBetter ? w : ex.bestWeight,
        bestReps: isBetter ? r : ex.bestReps,
        note: ex.note ?? (s.note || null),
      })
    }

    // Top 2 exercises by volume
    const sortedEx = [...exMap.entries()].sort((a, b) => b[1].volume - a[1].volume)
    const main = sortedEx[0]
    const second = sortedEx[1]

    daySummaries[session.trained_at] = {
      date: session.trained_at,
      sessionId: session.id,
      muscleGroup: topMuscle,
      allMuscleGroups,
      totalSets,
      totalVolume: Math.round(totalVolume),
      best1rm,
      mainExercise: main ? main[0] : '',
      mainExerciseBestWeight: main ? main[1].bestWeight : 0,
      mainExerciseBestReps: main ? main[1].bestReps : 0,
      mainExerciseNote: main ? (main[1].note ?? null) : null,
      secondExercise: second ? second[0] : null,
      extraCount: Math.max(0, exMap.size - 1),
    }
  }

  type PhotoLogRow = {
    workout_date: string
    image_path: string
    thumbnail_path: string | null
    workout_session_id: string
    created_at: string
  }
  const rawPhotoLogs = (photoLogsRes.data ?? []) as PhotoLogRow[]

  // Group by date, pick best photo (session-matching first, then most recent)
  const photosByDate = new Map<string, PhotoLogRow[]>()
  for (const log of rawPhotoLogs) {
    if (!photosByDate.has(log.workout_date)) photosByDate.set(log.workout_date, [])
    photosByDate.get(log.workout_date)!.push(log)
  }

  const photoPathsByDate: Record<string, string> = {}
  const thumbPathsByDate: Record<string, string | null> = {}
  for (const [date, logs] of photosByDate.entries()) {
    const summary = daySummaries[date]
    const match = summary ? logs.find(l => l.workout_session_id === summary.sessionId) : null
    const best = match ?? [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (best?.image_path) photoPathsByDate[date] = best.image_path
    thumbPathsByDate[date] = best?.thumbnail_path ?? null
  }

  // Recent body log entries for horizontal scroll (newest first, up to 8)
  type RecentPhoto = { date: string; imagePath: string; thumbnailPath: string | null; muscleGroup: string }
  const recentBodyLogPhotos: RecentPhoto[] = Object.entries(photoPathsByDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8)
    .map(([date, imagePath]) => ({
      date,
      imagePath,
      thumbnailPath: thumbPathsByDate[date] ?? null,
      muscleGroup: daySummaries[date]?.muscleGroup ?? 'full body',
    }))

  // Batch-fetch signed URLs for thumbnails server-side (avoids client waterfall)
  // Use thumbnailPath when available, fallback to imagePath for legacy photos
  const thumbnailUrls: Record<string, string> = {}
  if (recentBodyLogPhotos.length > 0) {
    const pathsToSign = recentBodyLogPhotos.map(p => p.thumbnailPath ?? p.imagePath)
    const { data: batchData } = await supabase.storage
      .from('workout-photos')
      .createSignedUrls(pathsToSign, 3600)
    if (batchData) {
      for (let i = 0; i < batchData.length; i++) {
        const item = batchData[i]
        if (item.signedUrl && !item.error) {
          thumbnailUrls[recentBodyLogPhotos[i].date] = item.signedUrl
        }
      }
    }
  }

  /* ── Derived values ──────────────────────────────────────── */
  const thisWeekSessions = thisWeekRes.data ?? []
  const totalSessions90 = calendarSessions.length
  const validWorkoutDates = new Set(calendarSessions.map(s => s.date))
  const todayWorked = validWorkoutDates.has(todayStr)
  const profileData = profileRes.data as { display_name: string | null; onboarding_completed: boolean | null; language: string | null; username: string | null; avatar_url: string | null } | null
  if (profileData?.onboarding_completed === false && !user.is_anonymous) {
    redirect('/onboarding')
  }
  const displayName = profileData?.display_name ?? null
  const profileComplete = !!(profileData?.display_name && profileData?.username)

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const cookieLang = cookieStore.get('liftsnap_lang')?.value
  const locale: Locale = resolveServerLocale(cookieLang, profileData?.language, headerStore.get('accept-language') ?? '')

  const thisWeekVolume = thisWeekSessions.reduce((s: number, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0), 0)
  const lastWeekVolume = (lastWeekRes.data ?? []).reduce(
    (s: number, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0), 0
  )
  const volumeDiff = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null
  const bodyWeightByDate: Record<string, number> = {}
  for (const bw of ((bwHistoryRes.data ?? []) as { weight_kg: number; recorded_at: string }[])) {
    bodyWeightByDate[bw.recorded_at] = bw.weight_kg
  }
  const todayWeight = bodyWeightByDate[todayStr] ?? null

  const allTimeBest = atbRes.data as { weight_kg: number; reps: number } | null
  const allTimeEst1rm = allTimeBest
    ? allTimeBest.reps === 1 ? allTimeBest.weight_kg : Math.round(allTimeBest.weight_kg * (1 + allTimeBest.reps / 30))
    : null
  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null

  const workoutStreakDates = (streakSessionsRes.data ?? []).map((s: { trained_at: string }) => s.trained_at.slice(0, 10))
  const photoStreakDates = rawPhotoLogs.map((p: { workout_date: string }) => p.workout_date)
  const { streak: weekStreak, thisWeekDone } = calcProofStreak(workoutStreakDates, photoStreakDates, todayStr)

  const weekStart = getWeekStart()
  const thisWeekPhotosCount = rawPhotoLogs.filter(p => p.workout_date >= weekStart).length

  // hasTodayPhoto: derived from user's own photo logs (user_id already applied in the query)
  const hasTodayPhoto = !!photoPathsByDate[todayStr]

  // Days since last leg session (null = no leg session in 90-day window)
  const legSessions = calendarSessions.filter(s => (s.allMuscleGroups ?? []).includes('legs') || s.muscleGroup === 'legs')
  const lastLegDate = legSessions.length > 0
    ? legSessions.reduce((latest, s) => s.date > latest ? s.date : latest, legSessions[0].date)
    : null
  const daysSinceLastLegDay = lastLegDate
    ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastLegDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : null

  const storyHref = `/share?type=today&date=${todayStr}`

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* ── Header ── Logo left · [lifts + streak] right ── */}
      <div className="flex items-start justify-between px-4 pt-12 pb-2">
        <Image
          src="/brand/repra-logo-cropped.png"
          alt="REPRA"
          width={949}
          height={188}
          priority
          style={{ width: 100, height: 'auto', display: 'block' }}
        />
        {/* Status stack: lifts on top, streak below — right-aligned */}
        <div className="flex flex-col items-end gap-1.5" style={{ paddingTop: 2 }}>
          <div className="flex items-center gap-1">
            <Zap size={10} style={{ color: 'rgba(255,255,255,0.38)' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.44)', letterSpacing: '0.04em' }}>
              {locale === 'ja' ? `${totalSessions90}回` : `${totalSessions90} lifts`}
            </span>
          </div>
          <StreakBadge
            streak={weekStreak}
            thisWeekDone={thisWeekDone}
            locale={locale}
            thisWeekWorkouts={thisWeekSessions.length}
            thisWeekPhotos={thisWeekPhotosCount}
            compact
          />
        </div>
      </div>

      {/* ── WELCOME ── greeting + headline full width ── */}
      <div className="px-4 pt-4 pb-6">
        <HomeGreeting displayName={displayName} />
        {todayWorked ? (
          <p style={{ fontSize: 13, fontWeight: 400, color: '#22c55e', marginTop: 10 }}>
            Great work today.
          </p>
        ) : (
          <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.44)', marginTop: 10 }}>
            {"No session today — let's change that."}
          </p>
        )}
      </div>

      {/* ── TODAY'S CTA ── */}
      <div className="px-4 mb-5">
        <HomeCTACard
          todayStr={todayStr}
          hasTodayWorkout={todayWorked}
          hasTodayPhoto={hasTodayPhoto}
          workoutCount={totalSessions90}
          daysSinceLastLegDay={daysSinceLastLegDay}
          profileComplete={profileComplete}
          storyHref={storyHref}
          locale={locale}
        />
      </div>

      {/* ── MONTHLY TRAINING CALENDAR + SELECTED DAY SUMMARY ── */}
      <div className="px-4 mb-5">
        <CalendarWithSummary sessions={calendarSessions} todayStr={todayStr} daySummaries={daySummaries} bodyWeightByDate={bodyWeightByDate} photoPathsByDate={photoPathsByDate} />
      </div>

      {/* ── BODY LOG HORIZONTAL SCROLL ── */}
      {recentBodyLogPhotos.length > 0 && (
        <HomeBodyLogSection recentPhotos={recentBodyLogPhotos} signedUrls={thumbnailUrls} locale={locale} />
      )}

      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-4">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.54)', marginBottom: 10 }}>
          {t(locale, 'home.weeklyEffort')}
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
              sub: t(locale, 'home.goalWeekly'),
              subColor: 'rgba(255,255,255,0.54)' as string,
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
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.58)', marginBottom: 8 }}>
                {label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, color: active ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                  {value}
                </p>
                {'unit' in rest && rest.unit && (
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.44)', marginLeft: 1 }}>
                    {rest.unit}
                  </span>
                )}
              </div>
              {sub && (
                <p style={{ fontSize: 9, fontWeight: 500, marginTop: 5, color: subColor ?? 'rgba(255,255,255,0.44)' }}>
                  {sub}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── STRENGTH CLUB ── */}
      <div className="px-4 mb-4">
        <ClubCard club={club} allTimeEst1rm={allTimeEst1rm} locale={locale} />
      </div>

      {/* ── BODY WEIGHT ── */}
      <div className="px-4 mb-4">
        <div className="premium-card rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.56)', marginBottom: 5 }}>
              BODY WEIGHT
            </p>
            {todayWeight ? (
              <div className="flex items-baseline gap-1">
                <p style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{todayWeight}</p>
                <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.52)' }}>kg</span>
              </div>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.54)' }}>{t(locale, 'home.notLogged')}</p>
            )}
          </div>
          <Link href="/analytics"
            className="rounded-xl"
            style={{
              padding: '7px 14px',
              background: todayWeight ? 'rgba(255,255,255,0.04)' : '#ED742F',
              border: todayWeight ? '1px solid rgba(255,255,255,0.08)' : 'none',
              color: todayWeight ? 'rgba(255,255,255,0.60)' : '#fff',
              fontSize: 11,
              fontWeight: 500,
            }}>
            {todayWeight ? t(locale, 'home.viewBtn') : t(locale, 'home.logPlus')}
          </Link>
        </div>
      </div>

    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

type ClubInfo = { name: string; target: number; gap: number; progress: number; prev: number }

function ClubCard({ club, allTimeEst1rm, locale }: { club: ClubInfo | null; allTimeEst1rm: number | null; locale: Locale }) {
  if (!club || !allTimeEst1rm) {
    return (
      <div className="premium-card rounded-xl px-4 py-3">
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.56)', marginBottom: 10 }}>
          {t(locale, 'home.strengthClub')}
        </p>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 16 }}>🏅</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>100KG Club</p>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.58)' }}>
              {t(locale, 'home.logFirstLift')}
            </p>
          </div>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
      </div>
    )
  }

  const current = Math.min(allTimeEst1rm, club.target)
  const pct = club.progress
  const kgToGo = locale === 'ja' ? `あと${club.gap}kg` : `+${club.gap} kg to go`

  return (
    <div className="premium-card rounded-xl px-4 py-3">
      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.56)', marginBottom: 10 }}>
        {t(locale, 'home.strengthClub')}
      </p>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 16 }}>🏅</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{club.name}</p>
            <p style={{ fontSize: 11, fontWeight: 400, color: '#22c55e' }}>{kgToGo}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{current}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.52)' }}>/ {club.target} kg</span>
        </div>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.11)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#ED742F' }} />
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

function getStreakWindowStart(): string {
  const d = new Date(jstDate() + 'T00:00:00')
  d.setDate(d.getDate() - 7 * 52)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function settled(r: PromiseSettledResult<any>): { data: any; error: any } {
  return r.status === 'fulfilled' ? r.value : { data: null, error: r.reason }
}

