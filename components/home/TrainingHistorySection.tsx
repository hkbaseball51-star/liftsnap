'use client'

import { useState, useEffect, useMemo } from 'react'
import WorkoutDetailSheet from './WorkoutDetailSheet'
import { MUSCLE_COLORS, getPPLDisplay } from './TrainingCalendar'
import type { DaySummary } from './CalendarWithSummary'
import { formatVolume } from '@/lib/utils'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, type WeightUnit } from '@/lib/units'
import { getDisplayName } from '@/lib/exerciseNames'

export type FilterKey = 'ALL' | 'PUSH' | 'PULL' | 'LEGS' | 'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'ABS'

const PUSH_MG = new Set(['chest', 'triceps', 'shoulders'])
const PULL_MG = new Set(['back', 'biceps', 'forearms'])
const LEG_MG  = new Set(['legs', 'quads', 'hamstrings', 'glutes', 'calves'])

export function getAutoFilter(allMuscleGroups: string[]): FilterKey {
  const muscles = allMuscleGroups.map(m => m.toLowerCase())
  if (muscles.some(m => LEG_MG.has(m))) return 'LEGS'
  const main = muscles[0] ?? ''
  if (main === 'chest')     return 'CHEST'
  if (main === 'back')      return 'BACK'
  if (main === 'shoulders') return 'SHOULDERS'
  if (['arms', 'biceps', 'triceps', 'forearms'].includes(main)) return 'ARMS'
  if (main === 'abs')       return 'ABS'
  const isPush = muscles.some(m => PUSH_MG.has(m))
  const isPull = muscles.some(m => PULL_MG.has(m))
  if (isPush && !isPull) return 'PUSH'
  if (isPull && !isPush) return 'PULL'
  return 'ALL'
}

function matchesFilter(summary: DaySummary, filter: FilterKey): boolean {
  if (filter === 'ALL') return true
  const muscles = [...new Set([...summary.allMuscleGroups, summary.muscleGroup])].map(m => m.toLowerCase())
  switch (filter) {
    case 'PUSH':      return muscles.some(m => PUSH_MG.has(m))
    case 'PULL':      return muscles.some(m => PULL_MG.has(m))
    case 'LEGS':      return muscles.some(m => LEG_MG.has(m))
    case 'CHEST':     return muscles.includes('chest')
    case 'BACK':      return muscles.includes('back')
    case 'SHOULDERS': return muscles.includes('shoulders')
    case 'ARMS':      return muscles.some(m => ['arms', 'biceps', 'triceps', 'forearms'].includes(m))
    case 'ABS':       return muscles.includes('abs')
    default:          return true
  }
}

function formatRelDate(dateStr: string, todayStr: string, ja: boolean): { label: string; sub: string } {
  const today = new Date(todayStr + 'T00:00:00')
  const date  = new Date(dateStr  + 'T00:00:00')
  const diff  = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const EN_M  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const JA_M  = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const [, m, d] = dateStr.split('-').map(Number)
  if (diff === 0) return { label: ja ? '今日' : 'Today', sub: '' }
  if (diff === 1) return { label: ja ? '昨日' : 'Yesterday', sub: ja ? '1日前' : '1d ago' }
  const label = ja ? `${JA_M[m - 1]}${d}日` : `${EN_M[m - 1]} ${d}`
  const sub   = diff < 7
    ? (ja ? `${diff}日前` : `${diff}d ago`)
    : diff < 30
    ? (ja ? `${Math.floor(diff / 7)}週間前` : `${Math.floor(diff / 7)}w ago`)
    : (ja ? `${Math.floor(diff / 30)}ヶ月前` : `${Math.floor(diff / 30)}mo ago`)
  return { label, sub }
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

export type PrevDiff = {
  volumeDiff: number      // internal kg; display converts to unit
  rmDiff:     number | null  // internal kg; null when either session has no 1RM
  setsDiff:   number
}

function fmtVolDiff(diffKg: number, unit: WeightUnit): string {
  const sign = diffKg > 0 ? '+' : ''
  if (unit === 'lbs') {
    const d = Math.round(toDisplayWeight(diffKg, unit))
    if (d === 0) return '±0lb'
    return `${sign}${d}lb`
  }
  const abs = Math.abs(diffKg)
  if (abs >= 100) {
    const t = (diffKg / 1000).toFixed(1)
    if (t === '0.0' || t === '-0.0') return '±0t'
    return `${sign}${t}t`
  }
  const rounded = Math.round(diffKg)
  if (rounded === 0) return '±0kg'
  return `${sign}${rounded}kg`
}

function fmtRmDiff(diffKg: number, unit: WeightUnit): string {
  const sign = diffKg > 0 ? '+' : ''
  const d    = Math.round(toDisplayWeight(diffKg, unit))
  if (d === 0) return `±0${weightUnitLabel(unit)}`
  return `${sign}${d}${weightUnitLabel(unit)}`
}

function diffColor(diff: number): string {
  if (diff > 0) return 'var(--diff-positive)'
  if (diff < 0) return 'var(--diff-negative)'
  return 'var(--text-muted)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainingHistorySection({
  daySummaries,
  todayStr,
  calendarFilter,
}: {
  daySummaries: Record<string, DaySummary>
  todayStr: string
  calendarFilter: FilterKey | null
}) {
  const { locale } = useLocale()
  const { unit }   = useWeightUnit()
  const ja = locale === 'ja'

  const [filter,        setFilter]        = useState<FilterKey>('ALL')
  const [showCount,     setShowCount]     = useState(10)
  const [selectedEntry, setSelectedEntry] = useState<{ summary: DaySummary; diff: PrevDiff | null } | null>(null)

  useEffect(() => {
    if (calendarFilter !== null) {
      setFilter(calendarFilter)
      setShowCount(10)
    }
  }, [calendarFilter])

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'ALL',       label: ja ? 'すべて' : 'All'       },
    { key: 'PUSH',      label: 'Push'                       },
    { key: 'PULL',      label: 'Pull'                       },
    { key: 'LEGS',      label: 'Legs'                       },
    { key: 'CHEST',     label: ja ? '胸'    : 'Chest'       },
    { key: 'BACK',      label: ja ? '背中'  : 'Back'        },
    { key: 'SHOULDERS', label: ja ? '肩'    : 'Shoulders'   },
    { key: 'ARMS',      label: ja ? '腕'    : 'Arms'        },
    { key: 'ABS',       label: ja ? '腹筋'  : 'Abs'         },
  ]

  // Sorted newest → oldest
  const sorted = useMemo(() => (
    Object.values(daySummaries).sort((a, b) => b.date.localeCompare(a.date))
  ), [daySummaries])

  // Sessions matching current filter
  const filtered = useMemo(() => (
    sorted.filter(s => matchesFilter(s, filter))
  ), [sorted, filter])

  // Pair each session with its previous-same-filter diff.
  // filtered[i+1] is the session immediately before filtered[i] under this filter.
  // diff === null for the oldest session (no prior comparison available).
  const withDiffs = useMemo(() => (
    filtered.map((summary, idx) => {
      const prev = filtered[idx + 1]
      if (!prev) return { summary, diff: null as PrevDiff | null }
      const diff: PrevDiff = {
        volumeDiff: summary.totalVolume - prev.totalVolume,
        rmDiff: (summary.best1rm > 0 && prev.best1rm > 0)
                ? summary.best1rm - prev.best1rm
                : null,
        setsDiff: summary.totalSets - prev.totalSets,
      }
      return { summary, diff }
    })
  ), [filtered])

  const displayedWithDiffs = withDiffs.slice(0, showCount)
  const hasMore            = filtered.length > showCount

  return (
    <div style={{ marginTop: 20 }}>
      {/* Section title */}
      <p style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
        color: 'var(--text-label)', marginBottom: 10, textTransform: 'uppercase',
      }}>
        {ja ? 'トレーニング履歴' : 'Training History'}
      </p>

      {/* Filter chips — single-row horizontal scroll */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        marginBottom: 12,
      } as React.CSSProperties}>
        {FILTERS.map(({ key, label }) => {
          const sel = filter === key
          return (
            <button
              key={key}
              onClick={() => { setFilter(key); setShowCount(10) }}
              style={{
                flexShrink: 0,
                padding: '5px 11px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                background: sel ? '#F97316' : 'var(--surface-chip)',
                color: sel ? '#fff' : 'var(--text-secondary)',
                border: `1.5px solid ${sel ? '#F97316' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* History cards or empty state */}
      {displayedWithDiffs.length === 0 ? (
        <div style={{
          padding: '20px 18px',
          textAlign: 'center',
          background: 'var(--card-bg-primary)',
          border: '1px solid var(--card-border-primary)',
          borderRadius: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {ja ? 'まだ履歴がありません' : 'No history yet.'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {ja ? 'トレーニングを記録するとここに表示されます。' : 'Log a workout to see your training history.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayedWithDiffs.map(({ summary, diff }) => {
            const { label: dateLabel, sub: ageSub } = formatRelDate(summary.date, todayStr, ja)
            const allMuscles  = summary.allMuscleGroups.length > 0 ? summary.allMuscleGroups : [summary.muscleGroup]
            const ppl         = getPPLDisplay(allMuscles)
            const baseColor   = MUSCLE_COLORS[summary.muscleGroup] ?? '#ED742F'
            const accentColor = ppl?.color ?? baseColor
            const accentRgb   = hexToRgb(accentColor)
            const badgeLabel  = ppl?.label ?? summary.muscleGroup.toUpperCase()
            const moreCount   = summary.secondExercise ? Math.max(0, summary.extraCount - 1) : 0
            const hasExtra    = summary.extraCount > 0

            return (
              <div
                key={summary.date}
                onClick={() => setSelectedEntry({ summary, diff })}
                style={{
                  background: 'var(--card-bg-primary)',
                  border: '1px solid var(--card-border-primary)',
                  borderRadius: 16,
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}>

                {/* Header: date + muscle badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dateLabel}
                    </span>
                    {ageSub !== '' && (
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                        {ageSub}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                    padding: '2px 8px', borderRadius: 20,
                    background: `rgba(${accentRgb}, 0.15)`,
                    color: accentColor,
                  }}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Main exercise */}
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', lineHeight: 1.3 }}>
                  {getDisplayName(summary.mainExercise, locale)}
                </p>

                {/* Second exercise + more count */}
                {hasExtra && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                    {summary.secondExercise && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                        {getDisplayName(summary.secondExercise, locale)}
                      </span>
                    )}
                    {moreCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
                        {ja ? `他${moreCount}種目` : `+${moreCount} exercise${moreCount > 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <p style={{
                  fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)',
                  margin: 0, lineHeight: 1.4, marginTop: hasExtra ? 0 : 7,
                }}>
                  {ja ? `${summary.totalSets}セット` : `${summary.totalSets} sets`}
                  {' · '}
                  {formatVolume(summary.totalVolume, unit)}
                  {summary.best1rm > 0 && ` · 1RM ${toDisplayWeight(summary.best1rm, unit)}${weightUnitLabel(unit)}`}
                </p>

                {/* Previous comparison row */}
                <div style={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 8px',
                  marginTop: 7, paddingTop: 7,
                  borderTop: '1px solid var(--card-divider)',
                }}>
                  {diff !== null ? (
                    <>
                      <span style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                        color: 'var(--text-muted)', marginRight: 2,
                      }}>
                        {ja ? '前回比' : 'vs prev'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: diffColor(diff.volumeDiff) }}>
                        {fmtVolDiff(diff.volumeDiff, unit)}
                      </span>
                      {diff.rmDiff !== null && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: diffColor(diff.rmDiff) }}>
                          {fmtRmDiff(diff.rmDiff, unit)}&nbsp;1RM
                        </span>
                      )}
                      {diff.setsDiff !== 0 && (
                        <span style={{ fontSize: 10, fontWeight: 500, color: diffColor(diff.setsDiff) }}>
                          ({diff.setsDiff > 0 ? '+' : ''}{diff.setsDiff}&nbsp;{ja ? 'sets' : 'sets'})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                    }}>
                      {ja ? '初回記録' : 'First record'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {hasMore && (
            <button
              onClick={() => setShowCount(c => c + 10)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 12,
                background: 'var(--surface-chip)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 2,
              }}>
              {ja ? 'もっと見る' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Detail bottom sheet — renders only when a card is tapped */}
      {selectedEntry && (
        <WorkoutDetailSheet
          summary={selectedEntry.summary}
          diff={selectedEntry.diff}
          todayStr={todayStr}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}
