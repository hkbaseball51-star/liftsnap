'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'
import { MUSCLE_COLORS, getPPLDisplay } from './TrainingCalendar'
import type { DaySummary } from './CalendarWithSummary'
import { formatVolume } from '@/lib/utils'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel } from '@/lib/units'
import { t } from '@/lib/i18n'
import { getDisplayName } from '@/lib/exerciseNames'

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function formatDateLabel(dateStr: string): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const [, m, d] = dateStr.split('-').map(Number)
  return `${months[m - 1]} ${d}`
}

export default function SelectedDaySummary({
  selectedDate,
  summary,
  bodyWeight = null,
  sessionId = null,
  todayStr,
}: {
  selectedDate: string
  summary: DaySummary | null
  bodyWeight?: number | null
  sessionId?: string | null
  todayStr: string
}) {
  const router = useRouter()
  const { locale } = useLocale()
  const { unit } = useWeightUnit()
  const [visible, setVisible] = useState(false)

  // Component remounts on key change; double rAF ensures transition fires after paint
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [])

  const allMuscles = summary
    ? (summary.allMuscleGroups.length > 0 ? summary.allMuscleGroups : [summary.muscleGroup])
    : []

  const ppl = allMuscles.length > 0 ? getPPLDisplay(allMuscles) : null
  const baseColor = summary ? (MUSCLE_COLORS[summary.muscleGroup] ?? '#ED742F') : '#ED742F'
  const accentColor = ppl?.color ?? baseColor
  const accentRgb = hexToRgb(accentColor)
  const badgeLabel = summary ? (ppl?.label ?? summary.muscleGroup.toUpperCase()) : null
  const dateLabel = formatDateLabel(selectedDate)

  const isToday = selectedDate === todayStr

  const cardBase = {
    background: 'var(--card-bg-primary)',
    border: '1px solid var(--card-border-primary)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    borderRadius: 20,
    padding: '16px 18px',
    textAlign: 'left' as const,
    width: '100%',
  }

  return (
    <>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
      }}>
        {summary === null ? (
          /* ── No workout ── */
          <button
            className="active:opacity-70 transition-opacity"
            style={cardBase}
            onClick={() => router.push(`/record?date=${selectedDate}&from=calendar`)}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
              {dateLabel}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: bodyWeight !== null ? 6 : 14 }}>
              {t(locale, 'home.noWorkoutLogged')}
            </p>
            {bodyWeight !== null && (
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 14 }}>
                BW {toDisplayWeight(bodyWeight, unit)}{weightUnitLabel(unit)}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ED742F' }}>
                {t(locale, 'home.logWorkoutArrow')}
              </span>
            </div>
          </button>
        ) : (
          /* ── Has workout ── */
          <div style={cardBase}>
            {/* Row 1: date + muscle badge + View → */}
            <button
              className="w-full active:opacity-70 transition-opacity text-left"
              onClick={() => router.push(`/record?date=${selectedDate}&from=calendar`)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    {dateLabel}
                  </span>
                  {badgeLabel && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                      padding: '2px 8px', borderRadius: 20,
                      background: `rgba(${accentRgb}, 0.15)`,
                      color: accentColor,
                    }}>
                      {badgeLabel}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                  {t(locale, 'home.viewBtn')}
                </span>
              </div>

              {/* Row 2: stats summary */}
              <p style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {locale === 'ja' ? `${summary.totalSets}セット` : `${summary.totalSets} sets`}
                {' · '}
                {formatVolume(summary.totalVolume, unit)}
                {summary.best1rm > 0 && ` · 1RM ${toDisplayWeight(summary.best1rm, unit)}${weightUnitLabel(unit)}`}
                {bodyWeight !== null && (
                  <span style={{ color: 'var(--text-muted)' }}>{` · BW ${toDisplayWeight(bodyWeight, unit)}${weightUnitLabel(unit)}`}</span>
                )}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--card-divider)', marginBottom: 10 }} />

              {/* Row 3: main exercise + best set */}
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>
                {getDisplayName(summary.mainExercise, locale)}
              </p>
              {summary.mainExerciseBestWeight > 0 && summary.mainExerciseBestReps > 0 && (
                <p style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                  {t(locale, 'home.bestSet')}&nbsp; {toDisplayWeight(summary.mainExerciseBestWeight, unit)}{weightUnitLabel(unit)} × {summary.mainExerciseBestReps}
                </p>
              )}
              {summary.mainExerciseNote && (
                <p style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600 }}>{locale === 'ja' ? 'メモ：' : 'Note: '}</span>
                  {summary.mainExerciseNote}
                </p>
              )}

              {/* Row 4: extra exercises */}
              {summary.extraCount > 0 && (
                <div style={{ marginTop: 7, display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                  {summary.secondExercise && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {getDisplayName(summary.secondExercise, locale)}
                    </span>
                  )}
                  {(() => {
                    const hidden = summary.extraCount - (summary.secondExercise ? 1 : 0)
                    return hidden > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
                        {locale === 'ja' ? `他${hidden}種目` : `+${hidden} exercise${hidden > 1 ? 's' : ''}`}
                      </span>
                    ) : null
                  })()}
                </div>
              )}
            </button>

            {/* Share Story CTA */}
            <div style={{ height: 1, background: 'var(--card-divider)', margin: '10px 0 0' }} />
            <button
              className="w-full flex items-center justify-between pt-3 active:opacity-70 transition-opacity"
              onClick={() => router.push(`/share?type=today&date=${selectedDate}`)}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                {locale === 'ja' ? 'この日のワークアウトをシェア' : 'Share this workout'}
              </span>
              <Share2 size={13} style={{ color: '#ED742F' }} />
            </button>

          </div>
        )}
      </div>
    </>
  )
}
