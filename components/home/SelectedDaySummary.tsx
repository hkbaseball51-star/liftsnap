'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MUSCLE_COLORS, getPPLDisplay } from './TrainingCalendar'
import type { DaySummary } from './CalendarWithSummary'
import { formatVolume } from '@/lib/utils'

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
}: {
  selectedDate: string
  summary: DaySummary | null
}) {
  const router = useRouter()
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
  const baseColor = summary ? (MUSCLE_COLORS[summary.muscleGroup] ?? '#ff6b00') : '#ff6b00'
  const accentColor = ppl?.color ?? baseColor
  const accentRgb = hexToRgb(accentColor)
  const badgeLabel = summary ? (ppl?.label ?? summary.muscleGroup.toUpperCase()) : null
  const dateLabel = formatDateLabel(selectedDate)

  const cardBase = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20,
    padding: '16px 18px',
    textAlign: 'left' as const,
    width: '100%',
  }

  return (
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
          onClick={() => router.push(`/record?date=${selectedDate}`)}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.32)', marginBottom: 10 }}>
            {dateLabel}
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.22)', marginBottom: 14 }}>
            No workout logged
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ff6b00' }}>
              Log Workout →
            </span>
          </div>
        </button>
      ) : (
        /* ── Has workout ── */
        <button
          className="active:opacity-70 transition-opacity"
          style={cardBase}
          onClick={() => router.push(`/record?date=${selectedDate}`)}>

          {/* Row 1: date + muscle badge + View → */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.36)' }}>
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
              View →
            </span>
          </div>

          {/* Row 2: stats summary */}
          <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>
            {summary.totalSets} sets
            {' · '}
            {formatVolume(summary.totalVolume)}
            {summary.best1rm > 0 && ` · Best 1RM ${summary.best1rm}kg`}
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.055)', marginBottom: 10 }} />

          {/* Row 3: main exercise + best set */}
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>
            {summary.mainExercise}
          </p>
          {summary.mainExerciseBestWeight > 0 && summary.mainExerciseBestReps > 0 && (
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>
              Best set&nbsp; {summary.mainExerciseBestWeight}kg × {summary.mainExerciseBestReps}
            </p>
          )}

          {/* Row 4: extra exercises */}
          {summary.extraCount > 0 && (
            <div style={{ marginTop: 7, display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
              {summary.secondExercise && (
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.36)' }}>
                  {summary.secondExercise}
                </span>
              )}
              {(() => {
                const hidden = summary.extraCount - (summary.secondExercise ? 1 : 0)
                return hidden > 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.22)' }}>
                    +{hidden} exercise{hidden > 1 ? 's' : ''}
                  </span>
                ) : null
              })()}
            </div>
          )}
        </button>
      )}
    </div>
  )
}
