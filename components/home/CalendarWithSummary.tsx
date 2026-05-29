'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'

export type DaySummary = {
  date: string
  muscleGroup: string
  allMuscleGroups: string[]
  totalSets: number
  totalVolume: number
  best1rm: number
  mainExercise: string
  mainExerciseBestWeight: number
  mainExerciseBestReps: number
  secondExercise: string | null
  extraCount: number
}

export default function CalendarWithSummary({
  sessions,
  todayStr,
  daySummaries,
}: {
  sessions: CalendarSession[]
  todayStr: string
  daySummaries: Record<string, DaySummary>
}) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <>
      <TrainingCalendar
        sessions={sessions}
        todayStr={todayStr}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onNavigate={(date) => router.push(`/record?date=${date}`)}
      />
      {selectedDate && (
        <div style={{ marginTop: 12 }}>
          <SelectedDaySummary
            key={selectedDate}
            selectedDate={selectedDate}
            summary={daySummaries[selectedDate] ?? null}
          />
        </div>
      )}
    </>
  )
}
