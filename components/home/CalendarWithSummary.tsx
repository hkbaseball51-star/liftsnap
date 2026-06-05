'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'
import { CALENDAR_LABEL_LEGEND } from '@/lib/calendarLabel'

function CalendarLegend() {
  return (
    <div style={{
      background: '#141414',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '10px 14px',
      marginTop: 10,
      display: 'flex',
      gap: 14,
      flexWrap: 'wrap',
    }}>
      {/* SPLIT section */}
      <div style={{ flex: '1 1 100px', minWidth: 100 }}>
        <p style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.30)', marginBottom: 7, textTransform: 'uppercase',
        }}>
          SPLIT
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CALENDAR_LABEL_LEGEND.split.map(({ label, name, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                minWidth: 28,
                fontSize: label.length >= 4 ? 8 : 9,
                fontWeight: 900,
                letterSpacing: '0.04em',
                color,
                textAlign: 'right',
                lineHeight: 1,
              }}>
                {label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />

      {/* MUSCLE section */}
      <div style={{ flex: '1 1 130px', minWidth: 130 }}>
        <p style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.30)', marginBottom: 7, textTransform: 'uppercase',
        }}>
          MUSCLE
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CALENDAR_LABEL_LEGEND.muscle.map(({ label, name, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                minWidth: 28,
                fontSize: label.length >= 3 ? 8 : 10,
                fontWeight: 900,
                letterSpacing: '0.04em',
                color,
                textAlign: 'right',
                lineHeight: 1,
              }}>
                {label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>
                {name}
              </span>
            </div>
          ))}
        </div>
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
