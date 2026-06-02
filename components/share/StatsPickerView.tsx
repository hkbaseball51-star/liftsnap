'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, BarChart2, Activity, ChevronRight } from 'lucide-react'

type Exercise = { name: string; muscle_group: string; logCount: number }

const MUSCLE_COLOR: Record<string, string> = {
  chest: '#f87171', back: '#34d399', legs: '#60a5fa',
  shoulders: '#a78bfa', arms: '#fb923c', core: '#facc15',
}

function muscleColor(mg: string): string {
  return MUSCLE_COLOR[mg?.toLowerCase()] ?? 'rgba(255,255,255,0.40)'
}

function muscleLabel(mg: string): string {
  if (!mg) return ''
  return mg.charAt(0).toUpperCase() + mg.slice(1).toLowerCase()
}

type Metric = 'max1rm' | 'volume'

export default function StatsPickerView({
  exercises,
  hasBodyWeight,
}: {
  exercises: Exercise[]
  hasBodyWeight: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState<'metric' | 'exercise'>('metric')
  const [metric, setMetric] = useState<Metric | null>(null)

  const goExercise = (m: Metric) => {
    setMetric(m)
    setStep('exercise')
  }

  const selectExercise = (name: string) => {
    router.push(`/share?type=stats&metric=${metric}&exercise=${encodeURIComponent(name)}`)
  }

  const hasExercises = exercises.length > 0

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button
          onClick={() => step === 'exercise' ? setStep('metric') : router.back()}
          className="p-2 rounded-xl active:opacity-60 transition-opacity"
          style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={16} style={{ color: '#888' }} />
        </button>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>
            SHARE
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {step === 'metric' ? 'Graph Story' : metric === 'max1rm' ? 'Best 1RM · Pick Exercise' : 'Daily Volume · Pick Exercise'}
          </h1>
        </div>
      </div>

      {step === 'metric' ? (

        /* ── Metric selector ─────────────────────────────────── */
        <div className="px-4 flex flex-col gap-3">

          {/* Body Weight */}
          {hasBodyWeight ? (
            <button
              onClick={() => router.push('/share?type=stats&metric=bodyweight')}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Activity size={20} color="#60a5fa" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Body Weight</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.46)', marginTop: 2 }}>
                  Share your weight progress chart
                </p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Activity size={20} color="rgba(255,255,255,0.35)" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Body Weight</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>Log body weight to unlock</p>
              </div>
            </div>
          )}

          {/* Best 1RM */}
          {hasExercises ? (
            <button
              onClick={() => goExercise('max1rm')}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(237,116,47,0.15)' }}>
                <TrendingUp size={20} color="#ED742F" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Best 1RM</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.46)', marginTop: 2 }}>
                  Share your max strength progress
                </p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <TrendingUp size={20} color="rgba(255,255,255,0.35)" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Best 1RM</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>Log workouts to unlock</p>
              </div>
            </div>
          )}

          {/* Daily Volume */}
          {hasExercises ? (
            <button
              onClick={() => goExercise('volume')}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <BarChart2 size={20} color="#22c55e" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Daily Volume</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.46)', marginTop: 2 }}>
                  Share your training volume chart
                </p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <BarChart2 size={20} color="rgba(255,255,255,0.35)" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Daily Volume</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>Log workouts to unlock</p>
              </div>
            </div>
          )}

          {!hasBodyWeight && !hasExercises && (
            <p className="text-center mt-6" style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
              Log some workouts or body weight to create graph stories.
            </p>
          )}
        </div>

      ) : (

        /* ── Exercise selector ───────────────────────────────── */
        <div className="px-4 flex flex-col gap-2">
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.44)', padding: '16px 0' }}>
              No exercises logged yet.
            </p>
          ) : (
            exercises.map(ex => (
              <button
                key={ex.name}
                onClick={() => selectExercise(ex.name)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 active:opacity-70 transition-opacity w-full text-left"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div
                  className="flex-shrink-0 w-1 self-stretch rounded-full"
                  style={{ background: muscleColor(ex.muscle_group), minHeight: 20 }}
                />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{ex.name}</p>
                  {ex.muscle_group && (
                    <p style={{ fontSize: 11, fontWeight: 500, color: muscleColor(ex.muscle_group), marginTop: 1 }}>
                      {muscleLabel(ex.muscle_group)} · {ex.logCount} session{ex.logCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} color="rgba(255,255,255,0.30)" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
