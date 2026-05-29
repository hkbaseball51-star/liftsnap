'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionForDate } from '@/actions/workout'
import { MUSCLE_COLORS } from './TrainingCalendar'
import type { CalendarSession } from './TrainingCalendar'

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

type Summary = {
  mainExercise: string
  extraCount: number
  totalSets: number
  totalVolume: number
  best1rm: number
  muscleGroup: string
}

export default function SelectedDaySummary({
  selectedDate,
  sessions,
}: {
  selectedDate: string
  sessions: CalendarSession[]
}) {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | 'empty' | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setSummary(null)
    setVisible(false)

    getSessionForDate(selectedDate).then(session => {
      if (!session || session.exercises.length === 0) {
        setSummary('empty')
      } else {
        let totalSets = 0
        let totalVolume = 0
        let best1rm = 0
        let mainExercise = ''
        let mainVolume = -1

        for (const ex of session.exercises) {
          let exVol = 0
          for (const set of ex.sets) {
            const w = set.weight_kg ?? 0
            const r = set.reps ?? 0
            exVol += w * r
            if (w > 0 && r > 0) {
              const est = r === 1 ? w : Math.round(w * (1 + r / 30))
              if (est > best1rm) best1rm = est
            }
          }
          totalSets += ex.sets.length
          totalVolume += exVol
          if (exVol > mainVolume) {
            mainVolume = exVol
            mainExercise = ex.name
          }
        }

        const calSession = sessions.find(s => s.date === selectedDate)
        const muscleGroup = (calSession?.muscleGroup ?? session.exercises[0]?.muscle_group ?? 'full body').toLowerCase()

        setSummary({ mainExercise, extraCount: session.exercises.length - 1, totalSets, totalVolume, best1rm, muscleGroup })
      }

      // Double rAF ensures CSS transition fires after paint
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    })
  }, [selectedDate, sessions])

  const accentColor = (summary && summary !== 'empty')
    ? (MUSCLE_COLORS[summary.muscleGroup] ?? '#ff6b00')
    : '#ff6b00'
  const accentRgb = hexToRgb(accentColor)
  const dateLabel = formatDateLabel(selectedDate)

  const cardStyle = {
    background: '#181818',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: '14px 16px',
    textAlign: 'left' as const,
    width: '100%',
  }

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 220ms ease-out, transform 220ms ease-out',
    }}>
      {/* Loading skeleton */}
      {!summary && (
        <div style={{ ...cardStyle, minHeight: 88 }} />
      )}

      {/* No workout */}
      {summary === 'empty' && (
        <button
          className="active:opacity-75 transition-opacity"
          style={cardStyle}
          onClick={() => router.push(`/record?date=${selectedDate}`)}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
            {dateLabel}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.28)' }}>
              No workout logged
            </p>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ff6b00' }}>
              Log Workout →
            </span>
          </div>
        </button>
      )}

      {/* Has workout */}
      {summary && summary !== 'empty' && (
        <button
          className="active:opacity-75 transition-opacity"
          style={cardStyle}
          onClick={() => router.push(`/record?date=${selectedDate}`)}>
          {/* Date + muscle badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)' }}>
              {dateLabel}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
              padding: '2px 8px', borderRadius: 20,
              background: `rgba(${accentRgb}, 0.15)`,
              color: accentColor,
            }}>
              {summary.muscleGroup.toUpperCase()}
            </span>
          </div>

          {/* Exercise name */}
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 7, lineHeight: 1.3 }}>
            {summary.mainExercise}
            {summary.extraCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.32)', marginLeft: 6 }}>
                +{summary.extraCount} exercise{summary.extraCount > 1 ? 's' : ''}
              </span>
            )}
          </p>

          {/* Stats + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.38)' }}>
              {summary.totalSets} sets
              {' · '}
              {summary.totalVolume >= 1000
                ? `${(summary.totalVolume / 1000).toFixed(1)}t`
                : `${Math.round(summary.totalVolume)}kg`}
              {summary.best1rm > 0 && ` · 1RM ${summary.best1rm}kg`}
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
              View →
            </span>
          </div>
        </button>
      )}
    </div>
  )
}
