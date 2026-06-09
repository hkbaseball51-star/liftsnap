'use client'

import { useMemo } from 'react'
import type { CalendarSession } from './TrainingCalendar'
import { matchesCopyFilter } from '@/lib/copyFilter'

const BODY_PARTS = [
  { key: 'chest',     labelJa: '胸',    labelEn: 'CHEST' },
  { key: 'back',      labelJa: '背中',   labelEn: 'BACK' },
  { key: 'legs',      labelJa: '脚',    labelEn: 'LEGS' },
  { key: 'shoulders', labelJa: '肩',    labelEn: 'SHOULDERS' },
  { key: 'arms',      labelJa: '腕',    labelEn: 'ARMS' },
  { key: 'abs',       labelJa: '腹筋',   labelEn: 'ABS' },
] as const

type BodyPartKey = typeof BODY_PARTS[number]['key']

function daysBetween(dateStr: string, todayStr: string): number {
  return Math.floor(
    (new Date(todayStr + 'T00:00:00').getTime() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000
  )
}

function formatDaysAgo(days: number, ja: boolean): string {
  if (days === 0) return ja ? '今日' : 'Today'
  if (ja) return `${days}日前`
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function computeLastTrained(
  sessions: CalendarSession[],
  todayStr: string,
): Record<BodyPartKey, number | null> {
  const lastDate: Record<BodyPartKey, string | null> = {
    chest: null, back: null, legs: null, shoulders: null, arms: null, abs: null,
  }
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  outer: for (const session of sorted) {
    const muscles = (session.allMuscleGroups && session.allMuscleGroups.length > 0)
      ? session.allMuscleGroups
      : [session.muscleGroup]
    let allFound = true
    for (const { key } of BODY_PARTS) {
      if (lastDate[key] !== null) continue
      allFound = false
      if (muscles.some(mg => matchesCopyFilter(mg, key))) {
        lastDate[key] = session.date
      }
    }
    if (allFound) break outer
  }

  const result: Record<BodyPartKey, number | null> = {
    chest: null, back: null, legs: null, shoulders: null, arms: null, abs: null,
  }
  for (const { key } of BODY_PARTS) {
    result[key] = lastDate[key] !== null ? daysBetween(lastDate[key]!, todayStr) : null
  }
  return result
}

function daysColor(days: number | null): string {
  if (days === null) return '#3a3a3a'
  if (days === 0)    return '#22c55e'
  if (days <= 3)     return '#ED742F'
  if (days <= 7)     return 'rgba(255,255,255,0.55)'
  return '#484848'
}

type Props = {
  sessions: CalendarSession[]
  todayStr: string
  locale: string
}

export default function HomeLastTrainedCard({ sessions, todayStr, locale }: Props) {
  const ja = locale === 'ja'

  const lastTrained = useMemo(
    () => computeLastTrained(sessions, todayStr),
    [sessions, todayStr],
  )

  return (
    <div>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.54)', marginBottom: 10,
      }}>
        {ja ? '前回トレーニング' : 'LAST TRAINED'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {BODY_PARTS.map(({ key, labelJa, labelEn }) => {
          const days = lastTrained[key]
          const daysText = days !== null
            ? formatDaysAgo(days, ja)
            : (ja ? '未記録' : 'Not yet')
          return (
            <div
              key={key}
              className="rounded-xl px-3 py-2.5"
              style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.40)', marginBottom: 5,
              }}>
                {ja ? labelJa : labelEn}
              </p>
              <p style={{
                fontSize: 11, fontWeight: 800, color: daysColor(days), lineHeight: 1,
              }}>
                {daysText}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
