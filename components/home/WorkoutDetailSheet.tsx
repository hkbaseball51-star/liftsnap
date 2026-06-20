'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Share2 } from 'lucide-react'
import { MUSCLE_COLORS, getPPLDisplay } from './TrainingCalendar'
import type { DaySummary } from './CalendarWithSummary'
import type { PrevDiff } from './TrainingHistorySection'
import { useAppData } from '@/contexts/AppDataContext'
import { formatVolume } from '@/lib/utils'
import { useLocale } from '@/lib/useLocale'
import { useTheme } from '@/lib/useTheme'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, type WeightUnit } from '@/lib/units'
import { getDisplayName } from '@/lib/exerciseNames'

// ── Small helpers (isolated — no cross-file dependency for these tiny fns) ──

function calcEst1rm(w: number, r: number): number {
  if (w <= 0 || r <= 0) return 0
  return r === 1 ? w : Math.round(w * (1 + r / 30))
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function diffColor(n: number): string {
  if (n > 0) return 'var(--diff-positive)'
  if (n < 0) return 'var(--diff-negative)'
  return 'var(--text-muted)'
}

function diffColorBright(n: number, isLight: boolean): string {
  if (isLight) return diffColor(n)
  if (n > 0) return '#34D77B'
  if (n < 0) return '#FF6673'
  return '#A1A1AA'
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

function formatDateLabel(dateStr: string, todayStr: string, ja: boolean): { date: string; ago: string } {
  const today = new Date(todayStr + 'T00:00:00')
  const date  = new Date(dateStr  + 'T00:00:00')
  const diff  = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const EN_M  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const JA_M  = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const [, m, d] = dateStr.split('-').map(Number)

  let dateLabel: string
  if (diff === 0)      dateLabel = ja ? '今日'  : 'Today'
  else if (diff === 1) dateLabel = ja ? '昨日'  : 'Yesterday'
  else                 dateLabel = ja ? `${JA_M[m - 1]}${d}日` : `${EN_M[m - 1]} ${d}`

  let agoLabel: string
  if (diff === 0)       agoLabel = ''
  else if (diff === 1)  agoLabel = ja ? '1日前'    : '1d ago'
  else if (diff < 7)    agoLabel = ja ? `${diff}日前` : `${diff}d ago`
  else if (diff < 30)   agoLabel = ja ? `${Math.floor(diff / 7)}週間前` : `${Math.floor(diff / 7)}w ago`
  else                  agoLabel = ja ? `${Math.floor(diff / 30)}ヶ月前` : `${Math.floor(diff / 30)}mo ago`

  return { date: dateLabel, ago: agoLabel }
}

const BADGE_FULL_NAME: Record<string, { ja: string; en: string }> = {
  C:    { ja: '胸',       en: 'Chest' },
  B:    { ja: '背中',     en: 'Back' },
  L:    { ja: '脚',       en: 'Legs' },
  S:    { ja: '肩',       en: 'Shoulders' },
  A:    { ja: '腕',       en: 'Arms' },
  ABS:  { ja: '腹筋',     en: 'Core' },
  PUS:  { ja: 'プッシュ', en: 'Push' },
  PUL:  { ja: 'プル',     en: 'Pull' },
  LEG:  { ja: '脚',       en: 'Legs' },
  FULL: { ja: '全身',     en: 'Full Body' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkoutDetailSheet({
  allEntries,
  initialIndex,
  todayStr,
  onClose,
}: {
  allEntries: { summary: DaySummary; diff: PrevDiff | null }[]
  initialIndex: number
  todayStr: string
  onClose: () => void
}) {
  const router          = useRouter()
  const { locale }      = useLocale()
  const { theme }       = useTheme()
  const { unit }        = useWeightUnit()
  const { rawSessions } = useAppData()
  const ja      = locale === 'ja'
  const isLight = theme === 'light'

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const sheetRef = useRef<HTMLDivElement>(null)

  // allEntries sorted newest→oldest; higher index = older session
  const hasPrev = currentIndex < allEntries.length - 1  // older record exists
  const hasNext = currentIndex > 0                       // newer record exists

  const handlePrev = () => { if (hasPrev) setCurrentIndex(i => i + 1) }
  const handleNext = () => { if (hasNext) setCurrentIndex(i => i - 1) }

  const { summary, diff } = allEntries[currentIndex]

  // Prevent background scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll sheet to top when navigating to a different session
  useEffect(() => {
    if (sheetRef.current) sheetRef.current.scrollTop = 0
  }, [currentIndex])

  // Build session detail from rawSessions (already in React state — no localStorage read)
  // rawSessions is stable during navigation; only changes when the user saves a workout.
  const sessionDetail = useMemo(() => {
    const session = rawSessions.find(s => s.trained_at === summary.date)
    if (!session) return null
    const map = new Map<string, { note: string | null; sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[] }>()
    for (const [globalIdx, s] of session.sets.entries()) {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, { note: s.note ?? null, sets: [] })
      const exSets = map.get(s.exercise_name)!.sets
      exSets.push({
        id:         s.id         ?? `set-${globalIdx}`,
        set_number: s.set_number ?? (exSets.length + 1),
        weight_kg:  s.weight_kg,
        reps:       s.reps,
      })
    }
    return {
      id: session.id,
      title: session.title ?? '',
      exercises: Array.from(map.entries()).map(([name, d]) => ({ name, note: d.note, sets: d.sets })),
    }
  }, [summary.date, rawSessions])

  // Per-exercise stats, sorted by volume desc (matches DaySummary ordering)
  const exercises = useMemo(() => {
    if (!sessionDetail) return []
    return sessionDetail.exercises
      .map(ex => {
        const allSets    = [...ex.sets].sort((a, b) => a.set_number - b.set_number)
        const validSets  = allSets.filter(s => (s.reps ?? 0) > 0)
        let   volume     = 0
        let   bestEst    = 0
        let   bestSetNum = -1

        for (const s of validSets) {
          const w = s.weight_kg ?? 0
          const r = s.reps      ?? 0
          volume += w * r
          const e = calcEst1rm(w, r)
          if (e > bestEst) { bestEst = e; bestSetNum = s.set_number }
        }
        const bestSet = bestSetNum >= 0
          ? validSets.find(s => s.set_number === bestSetNum) ?? null
          : null

        return { name: ex.name, note: ex.note, validSets, volume, est1rm: bestEst, bestSet }
      })
      .sort((a, b) => b.volume - a.volume)
  }, [sessionDetail])

  // Accent color derived from session's muscle group
  const allMuscles  = summary.allMuscleGroups.length > 0 ? summary.allMuscleGroups : [summary.muscleGroup]
  const ppl         = getPPLDisplay(allMuscles)
  const baseColor   = MUSCLE_COLORS[summary.muscleGroup] ?? '#ED742F'
  const accentColor = ppl?.color ?? baseColor
  const accentRgb   = hexToRgb(accentColor)
  const badgeLabel  = ppl?.label ?? summary.muscleGroup.toUpperCase()
  const badgeNames  = BADGE_FULL_NAME[badgeLabel]
  const badgeText   = badgeNames ? `${badgeLabel} ${ja ? badgeNames.ja : badgeNames.en}` : badgeLabel

  const { date: dateLabel, ago: agoLabel } = formatDateLabel(summary.date, todayStr, ja)

  const divider = 'var(--card-divider)'

  // Dark-theme overrides for card backgrounds in this sheet
  const summaryCardBg     = isLight ? 'var(--card-bg-primary)' : '#222225'
  const summaryCardBorder = isLight ? 'var(--card-border-primary)' : '#3F3F46'
  const compCardBg        = isLight ? 'var(--card-bg-primary)' : '#1F1F21'
  const compCardBorder    = isLight ? 'var(--card-border-primary)' : '#333338'

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 200,
        }}
      />

      {/* ── Sheet ────────────────────────────────────────────────────────── */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-card)',
          borderRadius: '22px 22px 0 0',
          maxHeight: '87svh',
          overflowY: 'auto',
          zIndex: 201,
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>

        {/* ── Sticky header (drag handle + date row + edit/close) ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-card)',
          borderRadius: '22px 22px 0 0',
          paddingBottom: 10,
        }}>
          {/* Drag bar */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.30)',
            }} />
          </div>

          {/* Header row: date+badge / [edit] [close] */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 18px',
            gap: 10,
          }}>
            {/* Left: date + ago inline, then badge below */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{
                  fontSize: 24, fontWeight: 800, lineHeight: 1.2,
                  color: isLight ? 'var(--text-primary)' : '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}>
                  {dateLabel}
                </span>
                {agoLabel && (
                  <span style={{
                    fontSize: 15, fontWeight: 600, lineHeight: 1.2,
                    color: isLight ? 'var(--text-muted)' : '#E4E4E7',
                    whiteSpace: 'nowrap',
                  }}>
                    {agoLabel}
                  </span>
                )}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                height: 30, minWidth: 48,
                padding: '0 12px',
                borderRadius: 9999,
                fontSize: 14, fontWeight: 800, letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                background: `rgba(${accentRgb}, 0.18)`,
                color: accentColor,
                border: `1px solid rgba(${accentRgb}, 0.32)`,
              }}>
                {badgeText}
              </span>
            </div>

            {/* Edit + Close buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => { onClose(); router.push(`/record?date=${summary.date}&from=calendar`) }}
                style={{
                  height: 44,
                  minWidth: 72,
                  padding: '0 18px',
                  borderRadius: 9999,
                  background: '#F97316',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  whiteSpace: 'nowrap',
                }}>
                {ja ? '編集' : 'Edit'}
              </button>
              <button
                onClick={onClose}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: 'var(--surface-chip)',
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.18)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <X size={22} style={{ color: isLight ? 'var(--text-secondary)' : '#FFFFFF' }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Prev / Next navigation row ── */}
        <div style={{ display: 'flex', gap: 12, padding: '0 18px 14px' }}>
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            style={{
              flex: 1, height: 56,
              borderRadius: 18,
              background: hasPrev
                ? (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.10)')
                : (isLight ? '#F3F4F6' : 'rgba(255,255,255,0.04)'),
              border: `1px solid ${hasPrev
                ? (isLight ? 'rgba(15,23,42,0.14)' : '#52525B')
                : (isLight ? 'rgba(15,23,42,0.08)' : '#3F3F46')}`,
              color: hasPrev
                ? (isLight ? '#111827' : '#FFFFFF')
                : (isLight ? 'rgba(17,24,39,0.32)' : '#71717A'),
              fontSize: 16, fontWeight: 700,
              boxShadow: hasPrev && isLight ? '0 4px 12px rgba(15,23,42,0.06)' : 'none',
              cursor: hasPrev ? 'pointer' : 'default',
              pointerEvents: hasPrev ? 'auto' : 'none',
              transition: 'background 150ms, border-color 150ms',
            } as React.CSSProperties}>
            ← {ja ? '前の記録' : 'Previous'}
          </button>
          <button
            onClick={handleNext}
            disabled={!hasNext}
            style={{
              flex: 1, height: 56,
              borderRadius: 18,
              background: hasNext
                ? (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.10)')
                : (isLight ? '#F3F4F6' : 'rgba(255,255,255,0.04)'),
              border: `1px solid ${hasNext
                ? (isLight ? 'rgba(15,23,42,0.14)' : '#52525B')
                : (isLight ? 'rgba(15,23,42,0.08)' : '#3F3F46')}`,
              color: hasNext
                ? (isLight ? '#111827' : '#FFFFFF')
                : (isLight ? 'rgba(17,24,39,0.32)' : '#71717A'),
              fontSize: 16, fontWeight: 700,
              boxShadow: hasNext && isLight ? '0 4px 12px rgba(15,23,42,0.06)' : 'none',
              cursor: hasNext ? 'pointer' : 'default',
              pointerEvents: hasNext ? 'auto' : 'none',
              transition: 'background 150ms, border-color 150ms',
            } as React.CSSProperties}>
            {ja ? '次の記録' : 'Next'} →
          </button>
        </div>

        {/* ── 3-column summary card ── */}
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            background: summaryCardBg,
            border: `1px solid ${summaryCardBorder}`,
            borderRadius: 16,
            padding: '14px 10px',
          }}>
            {[
              {
                label: ja ? 'セット数' : 'SETS',
                value: `${summary.totalSets}`,
                unit: undefined as string | undefined,
                accent: false,
              },
              {
                label: ja ? '総重量' : 'VOLUME',
                value: formatVolume(summary.totalVolume, unit),
                unit: undefined as string | undefined,
                accent: false,
              },
              {
                label: ja ? '推定1RM' : 'EST 1RM',
                value: summary.best1rm > 0
                  ? `${toDisplayWeight(summary.best1rm, unit)}${weightUnitLabel(unit)}`
                  : '—',
                unit: undefined as string | undefined,
                accent: summary.best1rm > 0,
              },
            ].map(({ label, value, accent }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0 6px',
                  borderRight: i < arr.length - 1
                    ? `1px solid ${isLight ? 'var(--card-divider)' : 'rgba(255,255,255,0.08)'}`
                    : 'none',
                }}>
                <p style={{
                  fontSize: 12, fontWeight: 700,
                  color: isLight ? 'var(--text-label)' : '#D4D4D8',
                  marginBottom: 6, whiteSpace: 'nowrap',
                }}>
                  {label}
                </p>
                <p style={{
                  fontSize: 20, fontWeight: 800, lineHeight: 1.2,
                  color: accent ? accentColor : (isLight ? 'var(--text-primary)' : '#FFFFFF'),
                }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Previous comparison area ── */}
        {diff !== null ? (
          <div style={{ padding: '0 18px 14px' }}>
            <div style={{
              background: compCardBg,
              border: `1px solid ${compCardBorder}`,
              borderRadius: 14,
              padding: '12px 14px',
            }}>
              <p style={{
                fontSize: 14, fontWeight: 700,
                color: isLight ? 'var(--text-secondary)' : '#FFFFFF',
                marginBottom: 8,
              }}>
                {ja ? '前回比' : 'vs prev'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 16px' }}>
                <span style={{
                  fontSize: 17, fontWeight: 800, lineHeight: 1.3,
                  color: diffColorBright(diff.volumeDiff, isLight),
                }}>
                  {fmtVolDiff(diff.volumeDiff, unit)}
                </span>
                {diff.rmDiff !== null && (
                  <span style={{
                    fontSize: 17, fontWeight: 800, lineHeight: 1.3,
                    color: diffColorBright(diff.rmDiff, isLight),
                  }}>
                    {fmtRmDiff(diff.rmDiff, unit)}&nbsp;1RM
                  </span>
                )}
                {diff.setsDiff !== 0 && (
                  <span style={{
                    fontSize: 17, fontWeight: 800, lineHeight: 1.3,
                    color: diffColorBright(diff.setsDiff, isLight),
                  }}>
                    {diff.setsDiff > 0 ? '+' : ''}{diff.setsDiff}&nbsp;sets
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 18px 14px' }}>
            <span style={{
              fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
              color: isLight ? 'var(--text-muted)' : '#A1A1AA',
            }}>
              {ja ? '初回記録' : 'First record'}
            </span>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: divider, margin: '0 18px 16px' }} />

        {/* ── Exercise list ── */}
        <div style={{ padding: '0 18px' }}>
          {sessionDetail === null ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              {ja ? 'データが見つかりません' : 'Session data not available.'}
            </p>
          ) : exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              {ja ? '種目データがありません' : 'No exercise data.'}
            </p>
          ) : (
            exercises.map((ex, exIdx) => (
              <div
                key={ex.name}
                style={{
                  background: 'var(--card-bg-primary)',
                  border: `1px solid ${isLight ? 'var(--card-border-primary)' : 'rgba(255,255,255,0.14)'}`,
                  borderRadius: 14,
                  padding: '16px 16px',
                  marginBottom: exIdx < exercises.length - 1 ? 14 : 0,
                }}>

                {/* Exercise name */}
                <p style={{
                  fontSize: 18, fontWeight: 800,
                  color: isLight ? 'var(--text-primary)' : '#FFFFFF',
                  margin: '0 0 10px', lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}>
                  {getDisplayName(ex.name, locale)}
                </p>

                {/* Highlight box: Best set · Est 1RM · Volume */}
                {ex.bestSet && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 0,
                    padding: '14px 10px',
                    borderRadius: 10,
                    background: `rgba(${accentRgb}, 0.10)`,
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px' }}>
                      <p style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                        color: isLight ? 'var(--text-muted)' : '#D4D4D8',
                        marginBottom: 5, whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}>
                        {ja ? 'ベストセット' : 'BEST SET'}
                      </p>
                      <p style={{
                        fontSize: 17, fontWeight: 800,
                        color: isLight ? 'var(--text-primary)' : '#FFFFFF',
                        textAlign: 'center',
                      }}>
                        {toDisplayWeight(ex.bestSet.weight_kg ?? 0, unit)}{weightUnitLabel(unit)}&nbsp;×&nbsp;{ex.bestSet.reps ?? 0}
                      </p>
                    </div>
                    {ex.est1rm > 0 && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px',
                        borderLeft: `1px solid rgba(${accentRgb}, 0.20)`,
                        borderRight: ex.volume > 0 ? `1px solid rgba(${accentRgb}, 0.20)` : 'none',
                      }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                          color: isLight ? 'var(--text-muted)' : '#D4D4D8',
                          marginBottom: 5, whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}>
                          {ja ? '推定1RM' : 'EST 1RM'}
                        </p>
                        <p style={{
                          fontSize: 17, fontWeight: 800,
                          color: accentColor,
                          textAlign: 'center',
                        }}>
                          {toDisplayWeight(ex.est1rm, unit)}{weightUnitLabel(unit)}
                        </p>
                      </div>
                    )}
                    {ex.volume > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px' }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                          color: isLight ? 'var(--text-muted)' : '#D4D4D8',
                          marginBottom: 5, whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}>
                          {ja ? 'ボリューム' : 'VOLUME'}
                        </p>
                        <p style={{
                          fontSize: 17, fontWeight: 800,
                          color: isLight ? 'var(--text-primary)' : '#FFFFFF',
                          textAlign: 'center',
                        }}>
                          {formatVolume(ex.volume, unit)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: divider, marginBottom: 10 }} />

                {/* Sets list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ex.validSets.map((s, i) => {
                    const w      = s.weight_kg ?? 0
                    const r      = s.reps      ?? 0
                    const isBest = ex.bestSet?.set_number === s.set_number
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          minHeight: 36,
                        }}>
                        {/* Set number */}
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: isLight ? 'var(--text-muted)' : '#D4D4D8',
                          width: 22, textAlign: 'right', flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        {/* Weight × Reps */}
                        <span style={{
                          fontSize: 17,
                          fontWeight: isBest ? 800 : 600,
                          color: isBest
                            ? (isLight ? 'var(--text-primary)' : '#FFFFFF')
                            : (isLight ? 'var(--text-secondary)' : '#EDEDEF'),
                          flex: 1,
                        }}>
                          {toDisplayWeight(w, unit)}{weightUnitLabel(unit)}&nbsp;×&nbsp;{r}
                        </span>
                        {/* Best marker */}
                        {isBest && (
                          <span style={{
                            fontSize: 13, fontWeight: 800, letterSpacing: '0.06em',
                            color: accentColor,
                            flexShrink: 0,
                          }}>
                            BEST
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notes card — shown only when at least one exercise has a note */}
        {exercises.some(ex => ex.note) && (
          <div style={{ padding: '14px 18px 0' }}>
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.10em',
              color: 'var(--text-label)', marginBottom: 8, paddingLeft: 2,
            }}>
              {ja ? 'メモ' : 'NOTES'}
            </p>
            <div style={{
              background: 'var(--card-bg-primary)',
              border: '1px solid var(--card-border-primary)',
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              {exercises.filter(ex => ex.note).map((ex, i, arr) => (
                <div key={ex.name}>
                  {arr.length > 1 && (
                    <p style={{
                      fontSize: 10, fontWeight: 700,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                      marginBottom: 5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {getDisplayName(ex.name, locale)}
                    </p>
                  )}
                  <p style={{
                    fontSize: 13, fontWeight: 400,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}>
                    {ex.note}
                  </p>
                  {i < arr.length - 1 && (
                    <div style={{ height: 1, background: divider, margin: '12px 0' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share CTA */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{ height: 1, background: divider, marginBottom: 12 }} />
          <button
            onClick={() => { onClose(); router.push(`/share?type=today&date=${summary.date}`) }}
            style={{
              width: '100%', padding: '11px 0',
              borderRadius: 12,
              background: 'var(--surface-chip)',
              border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer',
            }}>
            <Share2 size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {ja ? 'この日のワークアウトをシェア' : 'Share this workout'}
            </span>
          </button>
        </div>

        {/* iOS safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom, 20px)', minHeight: 20 }} />
      </div>
    </>
  )
}
