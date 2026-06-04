'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import { formatVolume } from '@/lib/utils'
import CalendarWithSummary from '@/components/home/CalendarWithSummary'
import type { DaySummary } from '@/components/home/CalendarWithSummary'
import type { CalendarSession } from '@/components/home/TrainingCalendar'
import { t, type Locale } from '@/lib/i18n'
import { calcProofStreak } from '@/lib/proofStreak'
import HomeGreeting from '@/components/home/HomeGreeting'
import HomeCTACard from '@/components/home/HomeCTACard'
import { useLocale } from '@/lib/useLocale'
import {
  localGetCalendarData,
  localGetWeekSessions,
  localGetBodyWeightByDate,
} from '@/lib/localDB'

export default function HomePage() {
  const { locale } = useLocale()
  const [mounted, setMounted] = useState(false)

  // All data loaded from localStorage
  const [calendarSessions, setCalendarSessions] = useState<CalendarSession[]>([])
  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummary>>({})
  const [bodyWeightByDate, setBodyWeightByDate] = useState<Record<string, number>>({})
  const [thisWeekSessions, setThisWeekSessions] = useState<{ id: string; trained_at: string; total_volume_kg: number }[]>([])
  const [lastWeekVolume, setLastWeekVolume] = useState(0)
  const [allTimeEst1rm, setAllTimeEst1rm] = useState<number | null>(null)
  const [weekStreak, setWeekStreak] = useState(0)

  const todayStr = jstDate()
  const weekStart = getWeekStart()

  useEffect(() => {
    setMounted(true)

    // Load calendar + body weight data
    const { sessions: rawSessions, bodyWeights } = localGetCalendarData(90)

    const newCalendarSessions: CalendarSession[] = []
    const newDaySummaries: Record<string, DaySummary> = {}

    for (const session of rawSessions) {
      const sets = session.sets ?? []

      const hasValidWorkout = sets.some(s =>
        s.exercise_name &&
        (
          (typeof s.weight_kg === 'number' && s.weight_kg > 0) ||
          (typeof s.reps === 'number' && s.reps > 0)
        )
      )
      if (!hasValidWorkout) continue

      const mgMap = new Map<string, number>()
      for (const s of sets) {
        const mg = s.muscle_group?.toLowerCase()
        if (mg) mgMap.set(mg, (mgMap.get(mg) ?? 0) + 1)
      }
      const sortedMg = mgMap.size > 0 ? [...mgMap.entries()].sort((a, b) => b[1] - a[1]) : null
      const topMuscle = sortedMg ? sortedMg[0][0] : 'full body'
      const allMuscleGroups = sortedMg ? sortedMg.map(([mg]) => mg) : []

      newCalendarSessions.push({ date: session.trained_at, muscleGroup: topMuscle, allMuscleGroups })

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

      const sortedEx = [...exMap.entries()].sort((a, b) => b[1].volume - a[1].volume)
      const main = sortedEx[0]
      const second = sortedEx[1]

      newDaySummaries[session.trained_at] = {
        date: session.trained_at,
        title: session.title ?? undefined,
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

    setCalendarSessions(newCalendarSessions)
    setDaySummaries(newDaySummaries)

    // Body weight
    const bwByDate: Record<string, number> = {}
    for (const bw of bodyWeights) {
      bwByDate[bw.date] = bw.weight_kg
    }
    setBodyWeightByDate(bwByDate)

    // This week sessions
    const thisWeek = localGetWeekSessions(weekStart)
    setThisWeekSessions(thisWeek)

    // Last week volume
    const lastWeekStart = getLastWeekStart()
    const lastWeek = localGetWeekSessions(lastWeekStart).filter(s => s.trained_at < weekStart)
    const lwVol = lastWeek.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
    setLastWeekVolume(lwVol)

    // All-time best 1RM from sets in storage
    const { sessions: allSessions } = localGetCalendarData(3650) // 10 years
    let best1rm = 0
    for (const session of allSessions) {
      for (const s of session.sets) {
        if (!s.is_completed || !s.weight_kg || !s.reps) continue
        const est = s.reps === 1 ? s.weight_kg : Math.round(s.weight_kg * (1 + s.reps / 30))
        if (est > best1rm) best1rm = est
      }
    }
    setAllTimeEst1rm(best1rm > 0 ? best1rm : null)

    // Proof streak
    const workoutDates = newCalendarSessions.map(s => s.date)
    const { streak } = calcProofStreak(workoutDates, [], todayStr)
    setWeekStreak(streak)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!mounted) {
    return <div className="fixed inset-0 bg-black" />
  }

  const totalSessions90 = calendarSessions.length
  const validWorkoutDates = new Set(calendarSessions.map(s => s.date))
  const todayWorked = validWorkoutDates.has(todayStr)
  const displayName = null
  const profileComplete = true // no onboarding in local mode

  const thisWeekVolume = thisWeekSessions.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const volumeDiff = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null
  const todayWeight = bodyWeightByDate[todayStr] ?? null

  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null

  const legSessions = calendarSessions.filter(s => (s.allMuscleGroups ?? []).includes('legs') || s.muscleGroup === 'legs')
  const lastLegDate = legSessions.length > 0
    ? legSessions.reduce((latest, s) => s.date > latest ? s.date : latest, legSessions[0].date)
    : null
  const daysSinceLastLegDay = lastLegDate
    ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastLegDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : null

  const storyHref = `/share?type=today&date=${todayStr}`

  // photoPathsByDate: empty in local mode (no photo uploads)
  const photoPathsByDate: Record<string, string> = {}
  const hasTodayPhoto = false

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* ── Header ── Logo left · [lifts + streak] right ── */}
      <div className="flex items-start justify-between px-4 pt-8 pb-2">
        <Image
          src="/brand/repra-logo-cropped.png"
          alt="REPRA"
          width={949}
          height={188}
          priority
          style={{ width: 100, height: 'auto', display: 'block' }}
        />
        <Link href="/profile/settings"
          className="w-10 h-10 flex items-center justify-center rounded-full active:opacity-70 flex-shrink-0 mt-1"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Settings size={18} style={{ color: 'rgba(255,255,255,0.52)' }} />
        </Link>
      </div>

      {/* ── WELCOME ── */}
      <div className="px-4 pt-2 pb-4">
        {todayWorked ? (
          <>
            <HomeGreeting displayName={displayName} />
            <p style={{ fontSize: 13, fontWeight: 400, color: '#22c55e', marginTop: 8 }}>
              Great work today.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              Don&apos;t skip the log.
            </p>
            <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.44)', marginTop: 6 }}>
              {"No session today — let's change that."}
            </p>
          </>
        )}
      </div>

      {/* ── TODAY'S CTA — always Record screen, text switches by state ── */}
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



      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-4">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.54)', marginBottom: 10 }}>
          {t(locale, 'home.weeklyEffort')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            {
              label: 'VOLUME',
              value: thisWeekVolume > 0 ? formatVolume(thisWeekVolume) : '0kg',
              sub: volumeDiff !== null ? `${volumeDiff >= 0 ? '+' : ''}${volumeDiff}%` : null,
              subColor: volumeDiff !== null ? (volumeDiff >= 0 ? '#22c55e' : '#ef4444') : undefined,
              active: thisWeekVolume > 0,
            },
            {
              label: 'SESSIONS',
              value: `${thisWeekSessions.length} / 3`,
              sub: null,
              subColor: 'rgba(255,255,255,0.54)' as string,
              active: thisWeekSessions.length > 0,
            },
            {
              label: 'BEST 1RM',
              value: allTimeEst1rm ? `${allTimeEst1rm}` : (locale === 'ja' ? '未記録' : '—'),
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

      {/* ── STRENGTH CLUB ── hidden for MVP */}
      {/* <div className="px-4 mb-4">
        <ClubCard club={club} allTimeEst1rm={allTimeEst1rm} locale={locale} />
      </div> */}

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

/* ─── Pure functions ──────────────────────────────────────── */

type ClubInfo = { name: string; target: number; gap: number; progress: number; prev: number }

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
