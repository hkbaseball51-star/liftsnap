'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'

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

  const photoDates = useMemo(() => new Set(Object.keys(photoPathsByDate)), [photoPathsByDate])
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
      {selectedDate && (
        <div style={{ marginTop: 12 }}>
          <SelectedDaySummary
            key={selectedDate}
            selectedDate={selectedDate}
            summary={selectedSummary}
            bodyWeight={bodyWeightByDate[selectedDate] ?? null}
            sessionId={selectedSummary?.sessionId ?? null}
            hasPhoto={photoDates.has(selectedDate)}
            todayStr={todayStr}
          />
        </div>
      )}
    </>
  )
}
