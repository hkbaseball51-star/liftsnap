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

/* ── Muscle expansion & canonicalization ─────────────────────── */

function expandRawMuscle(m: string): string[] {
  const g = m.toLowerCase().trim()
  if (g === 'chest & triceps')   return ['chest', 'triceps']
  if (g === 'back & biceps')     return ['back', 'biceps']
  if (g === 'chest & shoulders') return ['chest', 'shoulders']
  if (g === 'shoulders & chest') return ['shoulders', 'chest']
  return [g]
}

function canonicalize(m: string): string {
  switch (m) {
    case 'chest':                            return 'chest'
    case 'triceps':                          return 'triceps'
    case 'shoulders': case 'delts':
    case 'front delts':                      return 'shoulders'
    case 'back': case 'lats':
    case 'traps': case 'rear delts':         return 'back'
    case 'biceps':                           return 'biceps'
    case 'forearms':                         return 'forearms'
    case 'legs': case 'lower body':          return 'legs'
    case 'quads':                            return 'quads'
    case 'hamstrings':                       return 'hamstrings'
    case 'glutes':                           return 'glutes'
    case 'calves':                           return 'calves'
    case 'arms':                             return 'arms'
    case 'abs': case 'core':                 return 'abs'
    case 'full body':                        return 'full_body'
    default:                                 return m
  }
}

const PUSH_SET = new Set(['chest', 'triceps', 'shoulders'])
const PULL_SET = new Set(['back', 'biceps', 'forearms'])
const LEG_SET  = new Set(['legs', 'quads', 'hamstrings', 'glutes', 'calves'])

const ABBREV: Record<string, string> = {
  chest:      'C',
  back:       'B',
  legs:       'L',
  shoulders:  'S',
  arms:       'A',
  biceps:     'A',
  triceps:    'A',
  forearms:   'A',
  abs:        'ABS',
  quads:      'L',
  hamstrings: 'L',
  glutes:     'L',
  calves:     'L',
  full_body:  'FULL',
}

export const MUSCLE_COLORS: Record<string, string> = {
  chest:       '#ED742F',
  triceps:     '#F59E0B',
  shoulders:   '#8B5CF6',
  back:        '#3B82F6',
  biceps:      '#F59E0B',
  forearms:    '#F59E0B',
  arms:        '#F59E0B',
  legs:        '#22C55E',
  quads:       '#22C55E',
  hamstrings:  '#22C55E',
  glutes:      '#22C55E',
  calves:      '#22C55E',
  abs:         '#A3E635',
  full_body:   '#EC4899',
  'full body': '#EC4899',  // legacy key — used by external consumers
}

export type PPLCategory = 'push' | 'pull' | 'legs' | 'full'

export const PPL_COLORS: Record<string, string> = {
  push: '#ED742F',
  pull: '#3B82F6',
  legs: '#22C55E',
  full: '#EC4899',
}

/** Main classification: returns display label + color for a training session. */
export function classifyTraining(rawMuscles: string[]): { label: string; color: string } | null {
  if (rawMuscles.length === 0) return null

  const all    = rawMuscles.flatMap(expandRawMuscle).map(canonicalize)
  const unique = [...new Set(all)]

  if (unique.includes('full_body')) return { label: 'FULL', color: '#EC4899' }

  // ABS is auxiliary — excluded from PPL/FULL classification
  const main = unique.filter(m => m !== 'abs')

  // Abs-only day
  if (main.length === 0) return unique.includes('abs') ? { label: 'ABS', color: '#A3E635' } : null

  const pushHits = main.filter(m => PUSH_SET.has(m))
  const pullHits = main.filter(m => PULL_SET.has(m))
  const legHits  = main.filter(m => LEG_SET.has(m))
  const groupsHit =
    (pushHits.length > 0 ? 1 : 0) +
    (pullHits.length > 0 ? 1 : 0) +
    (legHits.length  > 0 ? 1 : 0)

  // Rule E (highest): 3+ distinct main muscles spanning 2+ PPL groups → FULL
  if (main.length >= 3 && groupsHit >= 2) return { label: 'FULL', color: '#EC4899' }

  // Rule B: 2+ push muscles → PUS
  if (pushHits.length >= 2) return { label: 'PUS', color: '#ED742F' }

  // Rule C: back + biceps → PUL
  if (main.includes('back') && main.includes('biceps')) return { label: 'PUL', color: '#3B82F6' }

  // Rule D: 2+ leg muscles → LEG (single leg muscle falls through to 1-char label)
  if (legHits.length >= 2) return { label: 'LEG', color: '#22C55E' }

  // Rule A: single (or dominant) main muscle
  const primary = main[0]
  if (!primary) return null
  const label = ABBREV[primary] ?? primary.slice(0, 3).toUpperCase()
  const color = MUSCLE_COLORS[primary] ?? '#EC4899'
  return { label, color }
}

/** Legacy export — kept for external consumers (SelectedDaySummary, etc.). */
export function getPPLDisplay(muscles: string[]): { label: string; color: string } | null {
  return classifyTraining(muscles)
}

// Sample data shown when no real sessions exist
const SAMPLE_SESSIONS: CalendarSession[] = [
  { date: '2026-05-03', muscleGroup: 'chest' },
  { date: '2026-05-06', muscleGroup: 'back',  allMuscleGroups: ['back', 'biceps'] },
  { date: '2026-05-09', muscleGroup: 'legs' },
  { date: '2026-05-12', muscleGroup: 'chest', allMuscleGroups: ['chest', 'triceps'] },
  { date: '2026-05-15', muscleGroup: 'shoulders' },
  { date: '2026-05-18', muscleGroup: 'chest', allMuscleGroups: ['chest', 'back', 'legs'] },
  { date: '2026-05-21', muscleGroup: 'chest', allMuscleGroups: ['chest', 'shoulders'] },
]

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const SPLIT_LEGEND = [
  { label: 'PUS',  name: 'PUSH',      color: '#ED742F' },
  { label: 'PUL',  name: 'PULL',      color: '#3B82F6' },
  { label: 'LEG',  name: 'LEGS',      color: '#22C55E' },
  { label: 'FULL', name: 'FULL BODY', color: '#EC4899' },
]

const MUSCLE_LEGEND = [
  { label: 'C',   name: 'CHEST',     color: '#ED742F' },
  { label: 'B',   name: 'BACK',      color: '#3B82F6' },
  { label: 'L',   name: 'LEGS',      color: '#22C55E' },
  { label: 'S',   name: 'SHOULDERS', color: '#8B5CF6' },
  { label: 'A',   name: 'ARMS',      color: '#F59E0B' },
  { label: 'ABS', name: 'ABS',       color: '#A3E635' },
]

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
    }).catch(() => {})

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
  const sessionMap = new Map<string, { label: string; color: string }>()
  activeSessions.forEach(s => {
    const rawMuscles = s.allMuscleGroups && s.allMuscleGroups.length > 0
      ? s.allMuscleGroups
      : [s.muscleGroup]
    const display = classifyTraining(rawMuscles)
    if (display) sessionMap.set(s.date, display)
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
    <div className="premium-card rounded-2xl overflow-hidden" style={{ background: '#1E1E1E' }}>
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
                style={{ background: 'rgba(237,116,47,0.15)', color: '#ED742F' }}>
                {thisMonthCount === 1 ? '1 session' : `${thisMonthCount} sessions`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:opacity-80"
            style={{ background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ChevronLeft size={15} style={{ color: '#cfcfcf' }} />
          </button>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:opacity-80"
            style={{ background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ChevronRight size={15} style={{ color: '#cfcfcf' }} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        {/* Max-width wrapper keeps calendar narrow on wide screens */}
        <div style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center py-1">
                <span className="text-[9px] font-black tracking-wider" style={{ color: '#666' }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7" style={{ rowGap: 6 }}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} style={{ height: 54 }} />
              }

              const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const display    = sessionMap.get(dateStr) ?? null
              const hasSession = display !== null
              const color      = display?.color ?? null
              const labelText  = display?.label ?? null

              const isToday    = dateStr === clientToday
              const isSelected = dateStr === selectedDate
              const isFuture   = dateStr > clientToday

              const signedUrl = photoSignedUrls[dateStr] ?? null
              const hasPhoto  = hasSession && !!signedUrl

              const accentColor = color ?? '#ED742F'
              const accentRgb   = hexToRgb(accentColor)

              let bg: string
              let border: string
              let shadow: string
              let textColor: string

              if (isSelected && isToday) {
                bg        = `rgba(${accentRgb}, 0.25)`
                border    = `2.5px solid ${accentColor}`
                shadow    = `0 0 20px rgba(${accentRgb}, 0.55)`
                textColor = '#ffffff'
              } else if (isSelected) {
                bg        = `rgba(${accentRgb}, 0.20)`
                border    = `2px solid ${accentColor}`
                shadow    = `0 0 12px rgba(${accentRgb}, 0.38)`
                textColor = '#ffffff'
              } else if (isToday) {
                bg        = color ? `rgba(${hexToRgb(color)}, 0.18)` : 'rgba(237,116,47,0.12)'
                border    = `2.5px solid ${color ?? '#ED742F'}`
                shadow    = `0 0 16px rgba(${color ? hexToRgb(color) : '237,116,47'}, 0.45)`
                textColor = color ?? '#ED742F'
              } else if (hasSession) {
                bg        = `rgba(${accentRgb}, 0.22)`
                border    = `1px solid rgba(${accentRgb}, 0.55)`
                shadow    = 'none'
                textColor = accentColor
              } else {
                bg        = 'transparent'
                border    = '1px solid transparent'
                shadow    = 'none'
                textColor = isFuture ? '#2a2a2a' : '#5a5a5a'
              }

              if (hasPhoto) {
                bg        = 'transparent'
                textColor = '#ffffff'
                if (!isSelected && !isToday) {
                  border = `2px solid ${color!}`
                  shadow = 'none'
                }
              }

              const dateFontSize = isSelected || isToday ? 15 : hasSession ? 14 : 13

              return (
                <div key={dateStr} className="flex flex-col items-center justify-start"
                  style={{ height: 54, paddingTop: 2 }}>
                  <button
                    className="rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      width: 36, height: 36,
                      background: bg, border, boxShadow: shadow,
                      cursor: isFuture ? 'default' : 'pointer',
                      flexShrink: 0,
                    }}
                    onClick={() => {
                      if (isFuture) return
                      if (isControlled) {
                        if (dateStr === selectedDate) {
                          if (onNavigate) onNavigate(dateStr)
                          else router.push(`/record?date=${dateStr}`)
                        } else {
                          onSelectDate?.(dateStr)
                        }
                      } else {
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
                      fontWeight: isToday || hasSession || isSelected ? 900 : 600,
                      lineHeight: 1,
                    }}>
                      {day}
                    </span>
                  </button>
                  {labelText ? (
                    <span style={{
                      fontSize: labelText.length === 1 ? 12 : labelText.length >= 4 ? 9 : 10,
                      fontWeight: 800, lineHeight: 1,
                      color: display!.color, marginTop: 4,
                      letterSpacing: '0.04em',
                    }}>
                      {labelText}
                    </span>
                  ) : (
                    <div style={{ height: 14 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}>

            {/* SPLIT section */}
            <div className="flex items-center gap-2 mb-1.5">
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>
                SPLIT
              </p>
              <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.11)' }} />
            </div>
            <div className="flex flex-wrap mb-3" style={{ gap: '4px 14px' }}>
              {SPLIT_LEGEND.map(({ label, name, color }) => (
                <div key={label} className="flex items-center" style={{ gap: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: '0.04em', minWidth: 18 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* MUSCLE section */}
            <div className="flex items-center gap-2 mb-1.5">
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>
                MUSCLE
              </p>
              <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.11)' }} />
            </div>
            <div className="flex flex-wrap" style={{ gap: '4px 14px' }}>
              {MUSCLE_LEGEND.map(({ label, name, color }) => (
                <div key={label} className="flex items-center" style={{ gap: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: '0.04em', minWidth: 18 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
