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
  const router         = useRouter()
  const { locale }     = useLocale()
  const { unit }       = useWeightUnit()
  const { rawSessions } = useAppData()
  const ja = locale === 'ja'

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

  const { date: dateLabel, ago: agoLabel } = formatDateLabel(summary.date, todayStr, ja)

  const divider = 'var(--card-divider)'

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

        {/* Drag bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 2 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--text-muted)', opacity: 0.4,
          }} />
        </div>

        {/* Header row: date / [edit] [close] */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '10px 18px 0',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {dateLabel}
              </span>
              {agoLabel && (
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                  {agoLabel}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              padding: '2px 10px', borderRadius: 20,
              background: `rgba(${accentRgb}, 0.15)`,
              color: accentColor,
            }}>
              {badgeLabel}
            </span>
          </div>

          {/* Edit + Close buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexShrink: 0 }}>
            <button
              onClick={() => { onClose(); router.push(`/record?date=${summary.date}&from=calendar`) }}
              style={{
                padding: '5px 13px',
                borderRadius: 20,
                background: '#F97316',
                border: 'none',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}>
              {ja ? '編集' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 15,
                background: 'var(--surface-chip)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
              <X size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Prev / Next navigation row */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 18px 0' }}>
          <button
            onClick={handlePrev}
            style={{
              flex: 1, padding: '7px 0',
              borderRadius: 10,
              background: 'var(--surface-chip)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600,
              cursor: hasPrev ? 'pointer' : 'default',
              opacity: hasPrev ? 1 : 0.35,
              pointerEvents: hasPrev ? 'auto' : 'none',
            } as React.CSSProperties}>
            ← {ja ? '前の記録' : 'Prev'}
          </button>
          <button
            onClick={handleNext}
            style={{
              flex: 1, padding: '7px 0',
              borderRadius: 10,
              background: 'var(--surface-chip)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600,
              cursor: hasNext ? 'pointer' : 'default',
              opacity: hasNext ? 1 : 0.35,
              pointerEvents: hasNext ? 'auto' : 'none',
            } as React.CSSProperties}>
            {ja ? '次の記録' : 'Next'} →
          </button>
        </div>

        {/* Summary stats */}
        <div style={{ padding: '12px 18px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 5 }}>
            {ja ? `${summary.totalSets}セット` : `${summary.totalSets} sets`}
            {' · '}
            {formatVolume(summary.totalVolume, unit)}
            {summary.best1rm > 0 && (
              <> {' · '}1RM&nbsp;{toDisplayWeight(summary.best1rm, unit)}{weightUnitLabel(unit)}</>
            )}
          </p>

          {/* Diff row */}
          {diff !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 8px' }}>
              <span style={{
                fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
                letterSpacing: '0.06em', marginRight: 2,
              }}>
                {ja ? '前回比' : 'vs prev'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: diffColor(diff.volumeDiff) }}>
                {fmtVolDiff(diff.volumeDiff, unit)}
              </span>
              {diff.rmDiff !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: diffColor(diff.rmDiff) }}>
                  {fmtRmDiff(diff.rmDiff, unit)}&nbsp;1RM
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {ja ? '初回記録' : 'First record'}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: divider, margin: '14px 18px' }} />

        {/* Exercise list */}
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
                  border: '1px solid var(--card-border-primary)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  marginBottom: exIdx < exercises.length - 1 ? 8 : 0,
                }}>

                {/* Exercise name */}
                <p style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                  margin: '0 0 8px', lineHeight: 1.3,
                }}>
                  {getDisplayName(ex.name, locale)}
                </p>

                {/* Highlight box: Best set · Est 1RM · Volume */}
                {ex.bestSet && (
                  <div style={{
                    display: 'flex', gap: 16, flexWrap: 'wrap',
                    padding: '7px 10px', borderRadius: 8,
                    background: `rgba(${accentRgb}, 0.08)`,
                    marginBottom: 8,
                  }}>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 3 }}>
                        {ja ? 'ベストセット' : 'BEST SET'}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {toDisplayWeight(ex.bestSet.weight_kg ?? 0, unit)}{weightUnitLabel(unit)}&nbsp;×&nbsp;{ex.bestSet.reps ?? 0}
                      </p>
                    </div>
                    {ex.est1rm > 0 && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 3 }}>
                          {ja ? '推定1RM' : 'EST 1RM'}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                          {toDisplayWeight(ex.est1rm, unit)}{weightUnitLabel(unit)}
                        </p>
                      </div>
                    )}
                    {ex.volume > 0 && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 3 }}>
                          {ja ? 'ボリューム' : 'VOLUME'}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatVolume(ex.volume, unit)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                {ex.note && (
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>
                    {ja ? 'メモ：' : 'Note: '}{ex.note}
                  </p>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: divider, marginBottom: 8 }} />

                {/* Sets list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {ex.validSets.map((s, i) => {
                    const w         = s.weight_kg ?? 0
                    const r         = s.reps      ?? 0
                    const isBest    = ex.bestSet?.set_number === s.set_number
                    return (
                      <div
                        key={s.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Set number */}
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                          width: 18, textAlign: 'right', flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        {/* Weight × Reps */}
                        <span style={{
                          fontSize: 13,
                          fontWeight: isBest ? 700 : 500,
                          color: isBest ? 'var(--text-primary)' : 'var(--text-secondary)',
                          flex: 1,
                        }}>
                          {toDisplayWeight(w, unit)}{weightUnitLabel(unit)}&nbsp;×&nbsp;{r}
                        </span>
                        {/* Best marker */}
                        {isBest && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                            color: accentColor,
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
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)', minHeight: 16 }} />
      </div>
    </>
  )
}
