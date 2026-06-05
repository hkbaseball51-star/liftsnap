'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { CAL_COLORS as CAL_COLORS_LIB, CALENDAR_LABEL_LEGEND } from '@/lib/calendarLabel'

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

// Re-use the single source of truth from lib/calendarLabel
const CAL_COLORS = CAL_COLORS_LIB

export const MUSCLE_COLORS: Record<string, string> = {
  chest:       CAL_COLORS.chest,
  triceps:     CAL_COLORS.arms,
  shoulders:   CAL_COLORS.shoulders,
  back:        CAL_COLORS.back,
  biceps:      CAL_COLORS.arms,
  forearms:    CAL_COLORS.arms,
  arms:        CAL_COLORS.arms,
  legs:        CAL_COLORS.legs,
  quads:       CAL_COLORS.legs,
  hamstrings:  CAL_COLORS.legs,
  glutes:      CAL_COLORS.legs,
  calves:      CAL_COLORS.legs,
  abs:         CAL_COLORS.abs,
  full_body:   CAL_COLORS.full,
  'full body': CAL_COLORS.full,  // legacy key — used by external consumers
}

export type PPLCategory = 'push' | 'pull' | 'legs' | 'full'

export const PPL_COLORS: Record<string, string> = {
  push: CAL_COLORS.push,
  pull: CAL_COLORS.pull,
  legs: CAL_COLORS.legs,
  full: CAL_COLORS.full,
}

/** Main classification: returns display label + color for a training session. */
export function classifyTraining(rawMuscles: string[]): { label: string; color: string } | null {
  if (rawMuscles.length === 0) return null

  const all    = rawMuscles.flatMap(expandRawMuscle).map(canonicalize)
  const unique = [...new Set(all)]

  if (unique.includes('full_body')) return { label: 'FULL', color: CAL_COLORS.full }

  // ABS is auxiliary — excluded from PPL/FULL classification
  const main = unique.filter(m => m !== 'abs')

  // Abs-only day
  if (main.length === 0) return unique.includes('abs') ? { label: 'ABS', color: CAL_COLORS.abs } : null

  const pushHits = main.filter(m => PUSH_SET.has(m))
  const pullHits = main.filter(m => PULL_SET.has(m))
  const legHits  = main.filter(m => LEG_SET.has(m))
  const groupsHit =
    (pushHits.length > 0 ? 1 : 0) +
    (pullHits.length > 0 ? 1 : 0) +
    (legHits.length  > 0 ? 1 : 0)

  // Rule E (highest): 3+ distinct main muscles spanning 2+ PPL groups → FULL
  if (main.length >= 3 && groupsHit >= 2) return { label: 'FULL', color: CAL_COLORS.full }

  // Rule B: 2+ push muscles → PUS
  if (pushHits.length >= 2) return { label: 'PUS', color: CAL_COLORS.push }

  // Rule C: 2+ pull muscles (back / biceps / forearms) → PUL
  if (pullHits.length >= 2) return { label: 'PUL', color: CAL_COLORS.pull }

  // Rule D: 2+ leg muscles → LEG (single leg muscle falls through to 1-char label)
  if (legHits.length >= 2) return { label: 'LEG', color: CAL_COLORS.legs }

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

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// CALENDAR_LABEL_LEGEND is re-exported from lib/calendarLabel for external use
export { CALENDAR_LABEL_LEGEND }

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

  // Month jump sheet state
  const [jumpOpen, setJumpOpen] = useState(false)
  const [loggedMonths, setLoggedMonths] = useState<Array<{ year: number; month: number; count: number }>>([])
  const [jumpLoading, setJumpLoading] = useState(false)

  const todayYear    = parseInt(clientToday.slice(0, 4))
  const todayMonth   = parseInt(clientToday.slice(5, 7)) - 1
  const isCurrentMonth = year === todayYear && month === todayMonth
  const goToToday    = () => { setYear(todayYear); setMonth(todayMonth) }

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

    supabase.storage
      .from('workout-photos')
      .createSignedUrls(datesInMonth.map(d => d.path), 3600)
      .then(({ data }) => {
        if (cancelled || !data) return
        const urls: Record<string, string> = {}
        for (const item of data) {
          if (item.signedUrl && !item.error) {
            const entry = datesInMonth.find(d => d.path === item.path)
            if (entry) urls[entry.date] = item.signedUrl
          }
        }
        setPhotoSignedUrls(urls)
      })
      .catch(() => {})

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, photoPathsByDate])

  // Fetch all logged months lazily when the jump sheet is opened
  useEffect(() => {
    if (!jumpOpen) return
    if (loggedMonths.length > 0) return
    let cancelled = false
    const supabase = createClient()
    async function load() {
      setJumpLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setJumpLoading(false); return }
      const { data } = await supabase
        .from('workout_sessions')
        .select('trained_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('trained_at', { ascending: false })
      if (cancelled) return
      const map = new Map<string, number>()
      for (const row of (data ?? [])) {
        const ym = (row.trained_at as string).slice(0, 7)
        map.set(ym, (map.get(ym) ?? 0) + 1)
      }
      setLoggedMonths(
        [...map.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([ym, count]) => {
            const [y, m] = ym.split('-').map(Number)
            return { year: y, month: m - 1, count }
          })
      )
      setJumpLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpOpen])

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

  const activeSessions = sessions
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
    <>
    <div className="premium-card rounded-2xl overflow-hidden" style={{ background: '#1E1E1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#777' }}>TRAINING LOG</p>
          <div className="flex items-center gap-2">
            {/* Tappable month title → opens jump sheet */}
            <button
              onClick={() => setJumpOpen(true)}
              className="flex items-center gap-1 active:opacity-70 transition-opacity"
              aria-label={locale === 'ja' ? '月を選択' : 'Jump to month'}>
              <span className="text-xl font-black text-white tracking-wider">
                {MONTH_NAMES[month]}
              </span>
              <span className="text-lg font-bold" style={{ color: '#666' }}>{year}</span>
              <ChevronDown size={12} style={{ color: '#555', marginTop: 1 }} />
            </button>
            {thisMonthCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(237,116,47,0.15)', color: '#ED742F' }}>
                {thisMonthCount === 1 ? '1 session' : `${thisMonthCount} sessions`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Today button — hidden when already on current month */}
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="h-8 px-2.5 rounded-lg flex items-center justify-center active:opacity-80 transition-opacity"
              style={{
                background: 'rgba(237,116,47,0.12)',
                border: '1px solid rgba(237,116,47,0.30)',
                fontSize: 10, fontWeight: 700, color: '#ED742F', letterSpacing: '0.04em',
              }}>
              {locale === 'ja' ? '今月' : 'Today'}
            </button>
          )}
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

              const accentColor = color ?? CAL_COLORS.push
              const accentRgb   = hexToRgb(accentColor)

              let bg: string
              let border: string
              let shadow: string
              let textColor: string

              if (isSelected && isToday) {
                bg        = `rgba(${accentRgb}, 0.30)`
                border    = `2.5px solid ${accentColor}`
                shadow    = `0 0 18px rgba(${accentRgb}, 0.60)`
                textColor = '#ffffff'
              } else if (isSelected) {
                bg        = `rgba(${accentRgb}, 0.26)`
                border    = `2px solid ${accentColor}`
                shadow    = `0 0 12px rgba(${accentRgb}, 0.48)`
                textColor = '#ffffff'
              } else if (isToday) {
                bg        = color ? `rgba(${hexToRgb(color)}, 0.22)` : `rgba(${hexToRgb(CAL_COLORS.push)}, 0.15)`
                border    = `2.5px solid ${color ?? CAL_COLORS.push}`
                shadow    = `0 0 18px rgba(${color ? hexToRgb(color) : hexToRgb(CAL_COLORS.push)}, 0.50)`
                textColor = color ?? CAL_COLORS.push
              } else if (hasSession) {
                bg        = `rgba(${accentRgb}, 0.25)`
                border    = `1px solid rgba(${accentRgb}, 0.65)`
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
                  border = `2px solid rgba(${accentRgb}, 0.80)`
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

          {/* Empty state — shown only when the user has no recorded sessions */}
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700 }}>
                {locale === 'ja' ? 'まだ記録がありません' : 'No workouts yet'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.14)', fontSize: 11, marginTop: 4 }}>
                {locale === 'ja' ? '今日のワークアウトを記録して始めましょう' : 'Start by logging today\'s workout'}
              </p>
            </div>
          )}

          {/* Legend — hidden for MVP */}
        </div>
      </div>
    </div>

    {/* ── Month Jump Sheet ──────────────────────────────────── */}
    {jumpOpen && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={() => setJumpOpen(false)}>
        <div
          className="w-full flex flex-col"
          style={{
            maxWidth: 600,
            background: '#1C1C1C',
            border: '1px solid rgba(255,255,255,0.16)',
            borderBottom: 'none',
            borderRadius: '24px 24px 0 0',
            maxHeight: '80dvh',
          }}
          onClick={e => e.stopPropagation()}>

          {/* Fixed header */}
          <div className="flex-shrink-0">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <p className="text-[15px] font-black" style={{ color: '#fff' }}>
                {locale === 'ja' ? '月を選択' : 'Jump to month'}
              </p>
              <button
                onClick={() => setJumpOpen(false)}
                aria-label={locale === 'ja' ? '閉じる' : 'Close'}
                className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60 transition-opacity flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
                <X size={14} style={{ color: 'rgba(255,255,255,0.72)' }} />
              </button>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginInline: 20 }} />
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto px-5 pt-4"
            style={{
              WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
            }}>

            {/* Today shortcut — shown when not on current month */}
            {!isCurrentMonth && (
              <button
                onClick={() => { goToToday(); setJumpOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-4 active:opacity-70 transition-opacity"
                style={{
                  background: 'rgba(237,116,47,0.12)',
                  border: '1px solid rgba(237,116,47,0.38)',
                }}>
                <span className="text-[14px] font-bold" style={{ color: '#ED742F' }}>
                  {locale === 'ja' ? '今月に戻る' : 'Go to today'}
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(237,116,47,0.72)' }}>
                  {MONTH_NAMES[todayMonth]} {todayYear}
                </span>
              </button>
            )}

            {/* Section label */}
            <p className="text-[10px] font-black tracking-widest mb-3"
              style={{ color: 'rgba(255,255,255,0.48)' }}>
              {locale === 'ja' ? '記録がある月' : 'LOGGED MONTHS'}
            </p>

            {/* Loading */}
            {jumpLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#ED742F' }} />
              </div>
            )}

            {/* Month list */}
            {!jumpLoading && loggedMonths.length > 0 && (
              <div className="space-y-2">
                {loggedMonths.map(({ year: y, month: m, count }) => {
                  const isCurrent = y === year && m === month
                  return (
                    <button
                      key={`${y}-${m}`}
                      onClick={() => { setYear(y); setMonth(m); setJumpOpen(false) }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl active:opacity-70 transition-opacity"
                      style={{
                        background: isCurrent ? 'rgba(237,116,47,0.12)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isCurrent ? 'rgba(237,116,47,0.42)' : 'rgba(255,255,255,0.13)'}`,
                      }}>
                      <span className="text-[14px] font-bold" style={{ color: isCurrent ? '#ED742F' : '#fff' }}>
                        {MONTH_NAMES[m]} {y}
                      </span>
                      <span className="text-[11px]" style={{ color: isCurrent ? 'rgba(237,116,47,0.72)' : 'rgba(255,255,255,0.50)' }}>
                        {count} {locale === 'ja' ? 'sessions' : count === 1 ? 'session' : 'sessions'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {!jumpLoading && loggedMonths.length === 0 && (
              <p className="text-center py-8 text-[13px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {locale === 'ja' ? 'まだ記録がありません' : 'No sessions recorded yet'}
              </p>
            )}

          </div>
        </div>
      </div>
    )}
    </>
  )
}
