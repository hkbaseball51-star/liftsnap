'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TrainingCalendar, { type CalendarSession } from './TrainingCalendar'
import SelectedDaySummary from './SelectedDaySummary'

export default function CalendarWithSummary({
  sessions,
  todayStr,
}: {
  sessions: CalendarSession[]
  todayStr: string
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
            sessions={sessions}
          />
        </div>
      )}
    </>
  )
}
