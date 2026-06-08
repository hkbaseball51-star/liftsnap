'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import { toDisplayWeight, weightUnitLabel, formatVolumeWithUnit } from '@/lib/units'
import { useWeightUnit } from '@/lib/useWeightUnit'
import CalendarWithSummary from '@/components/home/CalendarWithSummary'
import { t } from '@/lib/i18n'
import { useLocale } from '@/lib/useLocale'
import { useDemoMode } from '@/lib/useDemoMode'
import { useAppData } from '@/contexts/AppDataContext'
import HomeGreeting from '@/components/home/HomeGreeting'
import HomeCTACard from '@/components/home/HomeCTACard'
import type React from 'react'

// Shown during demo-mode Supabase fetch (local mode loads synchronously so
// users never reach this state). Mirrors the actual page layout to avoid jarring jumps.
function HomeSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, #111 25%, #1c1c1c 50%, #111 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  }
  return (
    <div style={{ background: '#080808', minHeight: '100svh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '32px 16px 8px' }}>
        <div style={{ ...shimmer, width: 100, height: 22, borderRadius: 6 }} />
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      </div>
      {/* Greeting */}
      <div style={{ padding: '8px 16px 16px' }}>
        <div style={{ ...shimmer, width: 190, height: 24, borderRadius: 7, marginBottom: 8 }} />
        <div style={{ ...shimmer, width: 230, height: 14, borderRadius: 6 }} />
      </div>
      {/* CTA card */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ ...shimmer, height: 88, borderRadius: 16 }} />
      </div>
      {/* Calendar */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ ...shimmer, height: 340, borderRadius: 16 }} />
      </div>
      {/* Weekly Effort */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ ...shimmer, width: 110, height: 11, borderRadius: 4, marginBottom: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ ...shimmer, height: 70, borderRadius: 12 }} />)}
        </div>
      </div>
      {/* Body weight */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...shimmer, height: 66, borderRadius: 12 }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  const { locale }                         = useLocale()
  const { unit }                           = useWeightUnit()
  const { isDemo, demoUserId }             = useDemoMode()

  const {
    calendarSessions,
    daySummaries,
    bodyWeightByDate,
    thisWeekSessions,
    lastWeekVolume,
    allTimeEst1rm,
    weekStreak,
    todayStr,
    isLoading,
  } = useAppData()

  // isLoading is only true during async demo-data fetch from Supabase.
  // Local-mode loads are synchronous so this path is never reached for local users.
  if (isLoading) return <HomeSkeleton />

  const totalSessions90 = calendarSessions.length
  const validWorkoutDates = new Set(calendarSessions.map(s => s.date))
  const todayWorked = validWorkoutDates.has(todayStr)

  const thisWeekVolume = thisWeekSessions.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const volumeDiff = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null
  const todayWeight = bodyWeightByDate[todayStr] ?? null

  const legSessions = calendarSessions.filter(s => (s.allMuscleGroups ?? []).includes('legs') || s.muscleGroup === 'legs')
  const lastLegDate = legSessions.length > 0
    ? legSessions.reduce((latest, s) => s.date > latest ? s.date : latest, legSessions[0].date)
    : null
  const daysSinceLastLegDay = lastLegDate
    ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastLegDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : null

  const storyHref = isDemo && demoUserId
    ? `/share?type=today&date=${todayStr}&demoUserId=${demoUserId}`
    : `/share?type=today&date=${todayStr}`

  const photoPathsByDate: Record<string, string> = {}
  const displayName  = null
  const profileComplete = true

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* ── Header ── Logo left · Settings right ── */}
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

      {/* ── TODAY'S CTA ── */}
      <div className="px-4 mb-5">
        <HomeCTACard
          todayStr={todayStr}
          hasTodayWorkout={todayWorked}
          hasTodayPhoto={false}
          workoutCount={totalSessions90}
          daysSinceLastLegDay={daysSinceLastLegDay}
          profileComplete={profileComplete}
          storyHref={storyHref}
          locale={locale}
        />
      </div>

      {/* ── MONTHLY TRAINING CALENDAR + SELECTED DAY SUMMARY ── */}
      <div className="px-4 mb-5">
        <CalendarWithSummary
          sessions={calendarSessions}
          todayStr={todayStr}
          daySummaries={daySummaries}
          bodyWeightByDate={bodyWeightByDate}
          photoPathsByDate={photoPathsByDate}
        />
      </div>

      {/* ── WEEKLY EFFORT ── */}
      <div className="px-4 mb-4">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.54)', marginBottom: 10 }}>
          {t(locale, 'home.weeklyEffort')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            {
              label: locale === 'ja' ? 'トータルボリューム' : 'VOLUME',
              value: formatVolumeWithUnit(thisWeekVolume, unit),
              sub: volumeDiff !== null ? `${volumeDiff >= 0 ? '+' : ''}${volumeDiff}%` : null as string | null,
              subColor: (volumeDiff !== null ? (volumeDiff >= 0 ? '#22c55e' : '#ef4444') : undefined) as string | undefined,
              active: thisWeekVolume > 0,
              cardUnit: undefined as string | undefined,
            },
            {
              label: locale === 'ja' ? 'セッション' : 'SESSIONS',
              value: `${thisWeekSessions.length} / 3`,
              sub: null as string | null,
              subColor: 'rgba(255,255,255,0.54)' as string | undefined,
              active: thisWeekSessions.length > 0,
              cardUnit: undefined as string | undefined,
            },
            {
              label: locale === 'ja' ? 'ベスト1RM' : 'BEST 1RM',
              value: allTimeEst1rm
                ? `${Math.round(toDisplayWeight(allTimeEst1rm, unit))}`
                : (locale === 'ja' ? '未記録' : '—'),
              cardUnit: allTimeEst1rm ? weightUnitLabel(unit) : undefined as string | undefined,
              sub: null as string | null,
              subColor: undefined as string | undefined,
              active: allTimeEst1rm !== null,
            },
          ]).map(({ label, value, sub, subColor, active, cardUnit }) => (
            <div key={label} className="premium-card rounded-xl p-3">
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.58)', marginBottom: 8 }}>
                {label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, color: active ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                  {value}
                </p>
                {cardUnit && (
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.44)', marginLeft: 1 }}>
                    {cardUnit}
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

      {/* ── BODY WEIGHT ── */}
      <div className="px-4 mb-4">
        <div className="premium-card rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.56)', marginBottom: 5 }}>
              {locale === 'ja' ? '体重' : 'BODY WEIGHT'}
            </p>
            {todayWeight ? (
              <div className="flex items-baseline gap-1">
                <p style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{toDisplayWeight(todayWeight, unit)}</p>
                <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.52)' }}>{weightUnitLabel(unit)}</span>
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
