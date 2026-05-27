'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CalendarSession = {
  date: string       // YYYY-MM-DD
  muscleGroup: string
}

const ABBREV: Record<string, string> = {
  chest: 'C', back: 'B', legs: 'L', shoulders: 'S',
  arms: 'A', 'full body': 'F', core: 'CO', abs: 'AB',
  glutes: 'G', cardio: 'CR', biceps: 'BI', triceps: 'TR',
  'chest & triceps': 'C', 'back & biceps': 'B', 'lower body': 'L',
}

const COLORS: Record<string, string> = {
  chest: '#ff6b00',
  back: '#3b82f6',
  legs: '#22c55e',
  shoulders: '#a855f7',
  arms: '#f59e0b',
  'full body': '#ec4899',
  core: '#14b8a6',
  abs: '#14b8a6',
  glutes: '#10b981',
  cardio: '#ef4444',
  biceps: '#f59e0b',
  triceps: '#f59e0b',
}

// Sample data shown when no real sessions exist
const SAMPLE_SESSIONS: CalendarSession[] = [
  { date: '2026-05-03', muscleGroup: 'chest' },
  { date: '2026-05-06', muscleGroup: 'back' },
  { date: '2026-05-09', muscleGroup: 'legs' },
  { date: '2026-05-12', muscleGroup: 'chest' },
  { date: '2026-05-15', muscleGroup: 'shoulders' },
  { date: '2026-05-18', muscleGroup: 'arms' },
  { date: '2026-05-21', muscleGroup: 'chest' },
]

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** YYYY-MM-DD from local time — avoids UTC off-by-one */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TrainingCalendar({
  sessions,
  todayStr,
}: {
  sessions: CalendarSession[]
  todayStr: string
}) {
  const router = useRouter()

  // Compute today client-side (not UTC-based server prop)
  const clientToday = useMemo(() => localDateStr(new Date()), [])

  // Initial month from client date to avoid server-timezone mismatch
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Debug logging
  useEffect(() => {
    console.log('[TrainingCalendar] today (client):', clientToday)
    console.log('[TrainingCalendar] todayStr (server prop):', todayStr)
    console.log('[TrainingCalendar] selectedDate:', selectedDate)
    console.log('[TrainingCalendar] currentMonth:', `${year}-${String(month + 1).padStart(2, '0')}`)
    console.log('[TrainingCalendar] sessions (trained_at):', sessions.slice(0, 10).map(s => s.date))
  }, [clientToday, todayStr, selectedDate, year, month, sessions])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const activeSessions = sessions.length > 0 ? sessions : SAMPLE_SESSIONS
  const sessionMap = new Map<string, string>()
  activeSessions.forEach(s => sessionMap.set(s.date, s.muscleGroup.toLowerCase()))

  const thisMonthCount = [...sessionMap.keys()].filter(d => {
    const [y, m] = d.split('-').map(Number)
    return y === year && m - 1 === month
  }).length

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="premium-card rounded-2xl overflow-hidden" style={{ background: '#111' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#444' }}>TRAINING LOG</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-black text-white tracking-wider">
              {MONTH_NAMES[month]}
              <span className="text-lg font-bold ml-2" style={{ color: '#444' }}>{year}</span>
            </p>
            {thisMonthCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,107,0,0.12)', color: '#ff6b00' }}>
                {thisMonthCount} sessions
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-60"
            style={{ background: '#1a1a1a' }}>
            <ChevronLeft size={16} style={{ color: '#555' }} />
          </button>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-60"
            style={{ background: '#1a1a1a' }}>
            <ChevronRight size={16} style={{ color: '#555' }} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-4">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center py-1.5">
              <span className="text-[9px] font-black tracking-wider" style={{ color: '#4a4a4a' }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`e-${idx}`} className="h-12" />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const muscle = sessionMap.get(dateStr)
            const isToday = dateStr === clientToday      // client-local today
            const isSelected = dateStr === selectedDate
            const isFuture = dateStr > clientToday
            const color = muscle ? (COLORS[muscle] ?? '#ff6b00') : null
            const abbrev = muscle
              ? (ABBREV[muscle] ?? muscle.charAt(0).toUpperCase())
              : null

            // ── Visual state matrix ──────────────────────────
            let bg: string
            let border: string
            let shadow: string
            let textColor: string

            if (isSelected && isToday) {
              // Strongest: solid orange + white ring glow
              bg = '#ff6b00'
              border = '2.5px solid rgba(255,255,255,0.55)'
              shadow = '0 0 20px rgba(255,107,0,0.6)'
              textColor = '#ffffff'
            } else if (isSelected) {
              // Selected (not today): solid orange fill
              bg = '#ff6b00'
              border = '1.5px solid rgba(255,255,255,0.2)'
              shadow = '0 0 12px rgba(255,107,0,0.35)'
              textColor = '#ffffff'
            } else if (isToday) {
              // Today (not selected): ring + tinted bg
              bg = muscle ? 'rgba(255,107,0,0.22)' : 'rgba(255,107,0,0.1)'
              border = '2.5px solid #ff6b00'
              shadow = '0 0 16px rgba(255,107,0,0.45)'
              textColor = '#ff6b00'
            } else if (muscle) {
              // Trained day: muscle-color tint
              bg = `${color!}2e`
              border = '1px solid transparent'
              shadow = 'none'
              textColor = color!
            } else {
              // Normal / future
              bg = 'transparent'
              border = '1px solid transparent'
              shadow = 'none'
              textColor = isFuture ? '#2a2a2a' : '#5a5a5a'
            }

            return (
              <div key={dateStr} className="flex flex-col items-center h-12 justify-start pt-0.5">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: bg, border, boxShadow: shadow, cursor: isFuture ? 'default' : 'pointer' }}
                  onClick={() => {
                    if (isFuture) return
                    setSelectedDate(dateStr)
                    router.push(`/record?date=${dateStr}`)
                  }}>
                  <span
                    className="text-xs"
                    style={{ color: textColor, fontWeight: isToday || muscle || isSelected ? 900 : 600 }}>
                    {day}
                  </span>
                </button>
                {abbrev ? (
                  <span
                    className="text-[9px] font-black leading-none mt-0.5"
                    style={{ color: isSelected ? '#ff6b00' : color! }}>
                    {abbrev}
                  </span>
                ) : (
                  <div className="h-3" />
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3"
          style={{ borderTop: '1px solid #1a1a1a' }}>
          {Object.entries(COLORS).slice(0, 6).map(([muscle, color]) => (
            <div key={muscle} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[9px] font-black tracking-wide uppercase" style={{ color: '#484848' }}>
                {muscle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
