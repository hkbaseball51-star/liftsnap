'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

export type CalendarSession = {
  date: string       // YYYY-MM-DD
  muscleGroup: string
  allMuscleGroups?: string[]
}

/* ── PPL classification ───────────────────────────────────── */
const PUSH_SET = new Set(['chest', 'shoulders', 'triceps', 'chest & triceps'])
const PULL_SET = new Set(['back', 'biceps', 'back & biceps', 'rear delts'])
const LEG_SET  = new Set(['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'lower body'])

export function getPPLDisplay(muscles: string[]): { label: string; color: string } | null {
  if (muscles.length < 2) return null
  if (muscles.every(m => PUSH_SET.has(m))) return { label: 'PSH', color: '#ff6b00' }
  if (muscles.every(m => PULL_SET.has(m))) return { label: 'PUL', color: '#3b82f6' }
  if (muscles.every(m => LEG_SET.has(m)))  return { label: 'LEG', color: '#22c55e' }
  return null
}

const ABBREV: Record<string, string> = {
  chest: 'C', back: 'B', legs: 'L', shoulders: 'S',
  arms: 'A', 'full body': 'F',
}

export const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ff6b00',
  back: '#3b82f6',
  legs: '#22c55e',
  shoulders: '#6E38D4',
  arms: '#f59e0b',
  'full body': '#ec4899',
}

function normalizeCalendarGroup(group: string): string {
  const g = group.toLowerCase().trim()
  if (g === 'chest' || g === 'chest & triceps') return 'chest'
  if (['back', 'back & biceps', 'lats', 'traps', 'rear delts'].includes(g)) return 'back'
  if (['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'lower body'].includes(g)) return 'legs'
  if (['shoulders', 'delts'].includes(g)) return 'shoulders'
  if (['arms', 'biceps', 'triceps', 'forearms'].includes(g)) return 'arms'
  return 'full body'
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

/** "#rrggbb" → "r, g, b" for use in rgba() */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function TrainingCalendar({
  sessions,
  todayStr,
  selectedDate: controlledSelectedDate,
  onSelectDate,
  onNavigate,
  photoPathsByDate = {},
}: {
  sessions: CalendarSession[]
  todayStr: string
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
  onNavigate?: (date: string) => void
  photoPathsByDate?: Record<string, string>
}) {
  const router = useRouter()
  const { locale } = useLocale()
  const clientToday = useMemo(() => localDateStr(new Date()), [])
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(null)
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<string, string>>({})

  // Generate signed URLs for photos in the currently displayed month
  useEffect(() => {
    const datesInMonth: { date: string; path: string }[] = []
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      const dateStr = localDateStr(d)
      const path = photoPathsByDate[dateStr]
      if (path) datesInMonth.push({ date: dateStr, path })
      d.setDate(d.getDate() + 1)
    }

    if (datesInMonth.length === 0) {
      setPhotoSignedUrls({})
      return
    }

    let cancelled = false
    const supabase = createClient()

    Promise.allSettled(
      datesInMonth.map(({ date, path }) =>
        supabase.storage
          .from('workout-photos')
          .createSignedUrl(path, 3600)
          .then(({ data }) => ({ date, url: data?.signedUrl ?? null }))
      )
    ).then(results => {
      if (cancelled) return
      const urls: Record<string, string> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.url) {
          urls[r.value.date] = r.value.url
        }
      }
      setPhotoSignedUrls(urls)
    }).catch(() => { /* fail silently — fallback to muscle color */ })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, photoPathsByDate])

  const isControlled = controlledSelectedDate !== undefined
  const selectedDate = isControlled ? controlledSelectedDate : internalSelectedDate

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
  type SessionInfo = { muscle: string }
  const sessionMap = new Map<string, SessionInfo>()
  activeSessions.forEach(s => {
    const normalized = (s.allMuscleGroups && s.allMuscleGroups.length > 0
      ? s.allMuscleGroups
      : [s.muscleGroup]
    ).map(m => normalizeCalendarGroup(m))
    const unique = [...new Set(normalized)]
    const muscle = unique.length === 1 ? unique[0] : 'full body'
    sessionMap.set(s.date, { muscle })
  })

  const thisMonthCount = [...sessionMap.keys()].filter(dateKey => {
    const [y, m] = dateKey.split('-').map(Number)
    return y === year && m - 1 === month
  }).length

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="premium-card rounded-2xl overflow-hidden" style={{ background: '#181818' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#777' }}>TRAINING LOG</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-black text-white tracking-wider">
              {MONTH_NAMES[month]}
              <span className="text-lg font-bold ml-2" style={{ color: '#666' }}>{year}</span>
            </p>
            {thisMonthCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,107,0,0.12)', color: '#ff6b00' }}>
                {thisMonthCount === 1 ? '1 session' : `${thisMonthCount} sessions`}
              </span>
            )}
          </div>
        </div>
        {/* Month nav — lighter buttons */}
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
            <ChevronLeft size={15} style={{ color: '#cfcfcf' }} />
          </button>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
            <ChevronRight size={15} style={{ color: '#cfcfcf' }} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center py-1">
              <span className="text-[9px] font-black tracking-wider" style={{ color: '#666' }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`e-${idx}`} style={{ height: 46 }} />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const sessionData = sessionMap.get(dateStr)
            const muscle = sessionData?.muscle ?? null
            const isToday = dateStr === clientToday
            const isSelected = dateStr === selectedDate
            const isFuture = dateStr > clientToday

            const color = muscle ? (MUSCLE_COLORS[muscle] ?? '#ec4899') : null
            const abbrev = muscle ? (ABBREV[muscle] ?? 'F') : null

            const signedUrl = photoSignedUrls[dateStr] ?? null
            const hasPhoto = muscle !== null && !!signedUrl

            // ── Visual state matrix ──────────────────────────
            let bg: string
            let border: string
            let shadow: string
            let textColor: string

            // Selected ring follows the day's muscle color; fallback to brand orange
            const accentColor = color ?? '#ff6b00'
            const accentRgb = hexToRgb(accentColor)

            if (isSelected && isToday) {
              bg = `rgba(${accentRgb}, 0.22)`
              border = `2.5px solid ${accentColor}`
              shadow = `0 0 20px rgba(${accentRgb}, 0.55)`
              textColor = '#ffffff'
            } else if (isSelected) {
              bg = `rgba(${accentRgb}, 0.18)`
              border = `2px solid ${accentColor}`
              shadow = `0 0 12px rgba(${accentRgb}, 0.35)`
              textColor = '#ffffff'
            } else if (isToday) {
              bg = color ? `rgba(${hexToRgb(color)}, 0.18)` : 'rgba(255,107,0,0.1)'
              border = `2.5px solid ${color ?? '#ff6b00'}`
              shadow = `0 0 16px rgba(${color ? hexToRgb(color) : '255,107,0'}, 0.45)`
              textColor = color ?? '#ff6b00'
            } else if (muscle) {
              bg = `${color!}2e`
              border = '1px solid transparent'
              shadow = 'none'
              textColor = color!
            } else {
              bg = 'transparent'
              border = '1px solid transparent'
              shadow = 'none'
              textColor = isFuture ? '#2a2a2a' : '#5a5a5a'
            }

            // Photo overrides: show thumbnail as circle background
            if (hasPhoto) {
              bg = 'transparent'
              textColor = '#ffffff'
              if (!isSelected && !isToday) {
                border = `2px solid ${color!}`
                shadow = 'none'
              }
            }

            // Date font size by state
            const dateFontSize = isSelected || isToday ? 15 : muscle ? 14 : 13

            return (
              <div key={dateStr} className="flex flex-col items-center justify-start"
                style={{ height: 46, paddingTop: 2 }}>
                <button
                  className="rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: 34, height: 34,
                    background: bg, border, boxShadow: shadow,
                    cursor: isFuture ? 'default' : 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    if (isFuture) return
                    if (isControlled) {
                      if (dateStr === selectedDate) {
                        // Second tap → navigate
                        if (onNavigate) onNavigate(dateStr)
                        else router.push(`/record?date=${dateStr}`)
                      } else {
                        // First tap → select only
                        onSelectDate?.(dateStr)
                      }
                    } else {
                      // Standalone mode: original behavior
                      setInternalSelectedDate(dateStr)
                      router.push(`/record?date=${dateStr}`)
                    }
                  }}>
                  {signedUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signedUrl}
                        alt=""
                        loading="lazy"
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                        }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.40)',
                        pointerEvents: 'none',
                      }} />
                    </>
                  )}
                  <span style={{
                    position: 'relative',
                    zIndex: 1,
                    color: textColor,
                    fontSize: dateFontSize,
                    fontWeight: isToday || muscle || isSelected ? 900 : 600,
                    lineHeight: 1,
                  }}>
                    {day}
                  </span>
                </button>
                {abbrev ? (
                  <span style={{ fontSize: 10, fontWeight: 900, lineHeight: 1, color: color!, marginTop: 2 }}>
                    {abbrev}
                  </span>
                ) : (
                  <div style={{ height: 12 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex flex-wrap" style={{ gap: '5px 14px' }}>
            {Object.entries(MUSCLE_COLORS).map(([m, c]) => (
              <div key={m} className="flex items-center" style={{ gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: '#999', textTransform: 'uppercase' }}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
