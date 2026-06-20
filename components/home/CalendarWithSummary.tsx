'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'
import TrainingHistorySection, { getAutoFilter } from './TrainingHistorySection'
import { CALENDAR_LABEL_LEGEND } from '@/lib/calendarLabel'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/useTheme'

const LEGEND_NAME_JA: Record<string, string> = {
  PUS: 'プッシュ', PUL: 'プル', LEG: '脚', FULL: '全身',
  C: '胸', B: '背中', L: '脚', S: '肩', A: '腕', ABS: '腹筋',
}

function LegendItem({ label, name, color, ja, isLight }: { label: string; name: string; color: string; ja: boolean; isLight: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
      <span style={{
        fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: 800, letterSpacing: '0.04em',
        color, lineHeight: 1.2,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 'clamp(13px, 3.6vw, 15px)', fontWeight: 600, letterSpacing: '0.01em',
        color: isLight ? 'var(--text-muted)' : '#FFFFFF', lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}>
        {ja ? (LEGEND_NAME_JA[label] ?? name) : name}
      </span>
    </div>
  )
}

function CalendarLegend({ ja }: { ja: boolean }) {
  const { theme: appTheme } = useTheme()
  const isLight = appTheme === 'light'
  const sectionTitle = {
    fontSize: 'clamp(14px, 3.8vw, 16px)', fontWeight: 700, letterSpacing: '0.08em',
    color: isLight ? 'var(--text-label)' : '#FFFFFF', marginBottom: 8,
    textTransform: 'uppercase' as const,
  }
  return (
    <div style={{
      background: 'var(--card-bg-primary)',
      border: '1px solid var(--card-border-primary)',
      borderRadius: 14,
      padding: '10px 14px',
      marginTop: 10,
    }}>
      {/* SPLIT — full width */}
      <p style={sectionTitle}>SPLIT</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {CALENDAR_LABEL_LEGEND.split.map((item) => (
          <LegendItem key={item.label} {...item} ja={ja} isLight={isLight} />
        ))}
      </div>

      {/* Horizontal divider */}
      <div style={{ height: 1, background: 'var(--card-divider)', marginBottom: 10 }} />

      {/* MUSCLE — full width */}
      <p style={sectionTitle}>MUSCLE</p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {CALENDAR_LABEL_LEGEND.muscle.map((item) => (
          <LegendItem key={item.label} {...item} ja={ja} isLight={isLight} />
        ))}
      </div>
    </div>
  )
}

export type DaySummary = {
  date: string
  title?: string
  sessionId: string
  muscleGroup: string
  allMuscleGroups: string[]
  totalSets: number
  totalVolume: number
  best1rm: number
  mainExercise: string
  mainExerciseBestWeight: number
  mainExerciseBestReps: number
  mainExerciseNote?: string | null
  secondExercise: string | null
  extraCount: number
}

export default function CalendarWithSummary({
  sessions,
  todayStr,
  daySummaries,
  bodyWeightByDate = {},
  photoPathsByDate = {},
}: {
  sessions: CalendarSession[]
  todayStr: string
  daySummaries: Record<string, DaySummary>
  bodyWeightByDate?: Record<string, number>
  photoPathsByDate?: Record<string, string>
}) {
  const router = useRouter()
  const { locale } = useLocale()
  const ja = locale === 'ja'
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const selectedSummary = selectedDate ? (daySummaries[selectedDate] ?? null) : null

  const calendarFilter = (() => {
    if (!selectedDate) return null
    const s = daySummaries[selectedDate]
    if (!s) return null
    const muscles = s.allMuscleGroups.length > 0 ? s.allMuscleGroups : [s.muscleGroup]
    return getAutoFilter(muscles)
  })()

  return (
    <>
      <TrainingCalendar
        sessions={sessions}
        todayStr={todayStr}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onNavigate={(date) => router.push(`/record?date=${date}`)}
        photoPathsByDate={photoPathsByDate}
      />
      <CalendarLegend ja={ja} />
      {sessions.length === 0 && (
        <div style={{
          marginTop: 12,
          padding: '16px 18px',
          borderRadius: 14,
          background: 'var(--card-bg-primary)',
          border: '1px solid var(--card-border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {t(locale, 'emptyState.calendarTitle')}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t(locale, 'emptyState.calendarDesc')}
            </p>
          </div>
          <Link href="/record"
            style={{
              flexShrink: 0,
              padding: '9px 16px',
              borderRadius: 12,
              background: '#ED742F',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
            {t(locale, 'emptyState.calendarCTA')}
          </Link>
        </div>
      )}
      {selectedDate && (
        <div style={{ marginTop: 12 }}>
          <SelectedDaySummary
            key={selectedDate}
            selectedDate={selectedDate}
            summary={selectedSummary}
            bodyWeight={bodyWeightByDate[selectedDate] ?? null}
            sessionId={selectedSummary?.sessionId ?? null}
            todayStr={todayStr}
          />
        </div>
      )}
      <TrainingHistorySection
        daySummaries={daySummaries}
        todayStr={todayStr}
        calendarFilter={calendarFilter}
      />
    </>
  )
}
