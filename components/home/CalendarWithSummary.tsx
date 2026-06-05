'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'
import { CALENDAR_LABEL_LEGEND } from '@/lib/calendarLabel'

function LegendItem({ label, name, color }: { label: string; name: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
        color, lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.36)', lineHeight: 1,
      }}>
        {name}
      </span>
    </div>
  )
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.28)', marginBottom: 8,
  textTransform: 'uppercase',
}

function CalendarLegend() {
  return (
    <div style={{
      background: '#141414',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '10px 14px',
      marginTop: 10,
    }}>
      {/* SPLIT — horizontal wrap */}
      <p style={SECTION_TITLE}>SPLIT</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 10 }}>
        {CALENDAR_LABEL_LEGEND.split.map((item) => (
          <LegendItem key={item.label} {...item} />
        ))}
      </div>

      {/* Horizontal divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />

      {/* MUSCLE — horizontal wrap */}
      <p style={SECTION_TITLE}>MUSCLE</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {CALENDAR_LABEL_LEGEND.muscle.map((item) => (
          <LegendItem key={item.label} {...item} />
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const selectedSummary = selectedDate ? (daySummaries[selectedDate] ?? null) : null

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
      <CalendarLegend />
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
    </>
  )
}
