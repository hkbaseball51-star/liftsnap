'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, BarChart2, Activity, ChevronRight, Lock } from 'lucide-react'
import { useAppData } from '@/contexts/AppDataContext'
import { EXERCISE_GRAPH_REQUIRED, VOLUME_CHART_SESSION_REQUIRED, BW_CHART_REQUIRED } from '@/lib/unlocks'
import { useLocale } from '@/lib/useLocale'
import { useTheme } from '@/lib/useTheme'

type Exercise = { name: string; muscle_group: string; logCount: number }

const MUSCLE_COLOR: Record<string, string> = {
  chest: '#f87171', back: '#34d399', legs: '#60a5fa',
  shoulders: '#a78bfa', arms: '#fb923c', core: '#facc15',
}

function muscleColor(mg: string, isLight: boolean): string {
  return MUSCLE_COLOR[mg?.toLowerCase()] ?? (isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.40)')
}

function muscleLabel(mg: string): string {
  if (!mg) return ''
  return mg.charAt(0).toUpperCase() + mg.slice(1).toLowerCase()
}

type Metric = 'max1rm' | 'volume'
type Step   = 'metric' | 'exercise' | 'bodypart'

const BODY_PARTS = [
  { key: 'all',       label: 'All Muscles' },
  { key: 'chest',     label: 'Chest' },
  { key: 'back',      label: 'Back' },
  { key: 'legs',      label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms',      label: 'Arms' },
  { key: 'abs',       label: 'Abs' },
  { key: 'other',     label: 'Other' },
]

const BODY_PART_COLORS: Record<string, string> = {
  all: '#ED742F', chest: '#f87171', back: '#34d399', legs: '#60a5fa',
  shoulders: '#a78bfa', arms: '#fb923c', abs: '#facc15', other: 'rgba(255,255,255,0.40)',
}

export default function StatsPickerView({
  exercises,
  hasBodyWeight,
  initialStep = 'metric',
  initialMetric = null,
}: {
  exercises: Exercise[]
  hasBodyWeight: boolean
  initialStep?: Step
  initialMetric?: Metric | null
}) {
  const router = useRouter()
  const { locale } = useLocale()
  const ja = locale === 'ja'
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { totalSessions, bodyWeightHistory: ctxBwHistory, exercises: ctxExercises } = useAppData()
  // Server-rendered pages cannot read localStorage; fall back to client context for local-mode users
  const resolvedExercises = exercises.length > 0 ? exercises : ctxExercises
  const [step, setStep]   = useState<Step>(initialStep)
  const [metric, setMetric] = useState<Metric | null>(initialMetric)

  const goExercise = (m: Metric) => {
    setMetric(m)
    setStep('exercise')
  }

  const goBodyPart = () => {
    setMetric('volume')
    setStep('bodypart')
  }

  const selectExercise = (name: string) => {
    router.push(`/share?type=stats&metric=${metric}&exercise=${encodeURIComponent(name)}`)
  }

  const selectBodyPart = (partKey: string) => {
    router.push(`/share?type=stats&metric=volume&bodypart=${encodeURIComponent(partKey)}`)
  }

  const handleBack = () => {
    if (step !== 'metric' && initialStep === 'metric') setStep('metric')
    else router.back()
  }

  const hasExercises = resolvedExercises.length > 0

  const stepTitle = step === 'metric'
    ? (ja ? 'グラフStory' : 'Graph Story')
    : step === 'exercise'
      ? (ja ? '1RM · 種目を選択' : 'Best 1RM · Pick Exercise')
      : (ja ? '総重量 · 部位を選択' : 'Daily Volume · Pick Body Part')

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl active:opacity-60 transition-opacity"
          style={{ background: 'var(--surface-chip)', border: '1px solid var(--border-subtle)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 2 }}>
            SHARE
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {stepTitle}
          </h1>
        </div>
      </div>

      {step === 'metric' ? (

        /* ── Metric selector ─────────────────────────────────── */
        <div className="px-4 flex flex-col gap-3">

          {/* Body Weight */}
          {ctxBwHistory.length >= BW_CHART_REQUIRED ? (
            <button
              onClick={() => router.push('/share?type=stats&metric=bodyweight')}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Activity size={20} color="#60a5fa" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Body Weight</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {ja ? '体重の変化グラフをシェア' : 'Share your weight progress chart'}
                </p>
              </div>
              <ChevronRight size={16} color="var(--text-chevron)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'var(--surface-chip)', border: '1px solid var(--border-subtle)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-icon-bg)' }}>
                <Activity size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Body Weight</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {ja
                    ? `体重をあと${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length)}回記録するとアンロック`
                    : `Log ${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length)} more weight entr${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length) !== 1 ? 'ies' : 'y'} to unlock`}
                </p>
              </div>
              <Lock size={14} style={{ color: 'var(--text-disabled)' }} />
            </div>
          )}

          {/* Best 1RM */}
          {hasExercises ? (
            <button
              onClick={() => goExercise('max1rm')}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(237,116,47,0.15)' }}>
                <TrendingUp size={20} color="#ED742F" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Best 1RM</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Share your max strength progress
                </p>
              </div>
              <ChevronRight size={16} color="var(--text-chevron)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'var(--surface-chip)', border: '1px solid var(--border-subtle)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-icon-bg)' }}>
                <TrendingUp size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Best 1RM</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Log workouts to unlock</p>
              </div>
            </div>
          )}

          {/* Daily Volume */}
          {hasExercises && totalSessions >= VOLUME_CHART_SESSION_REQUIRED ? (
            <button
              onClick={goBodyPart}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <BarChart2 size={20} color="#22c55e" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Volume</p>
                <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {ja ? '部位別のトレーニング量をシェア' : 'Share your training volume by body part'}
                </p>
              </div>
              <ChevronRight size={16} color="var(--text-chevron)" />
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ background: 'var(--surface-chip)', border: '1px solid var(--border-subtle)', opacity: 0.45 }}>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-icon-bg)' }}>
                <BarChart2 size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Daily Volume</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {ja
                    ? `ワークアウトをあと${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions)}日記録するとアンロック`
                    : `${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions)} more workout day${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions) !== 1 ? 's' : ''} to unlock`}
                </p>
              </div>
              <Lock size={14} style={{ color: 'var(--text-disabled)' }} />
            </div>
          )}

          {!hasBodyWeight && !hasExercises && (
            <p className="text-center mt-6" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Log some workouts or body weight to create graph stories.
            </p>
          )}
        </div>

      ) : step === 'bodypart' ? (

        /* ── Body part selector (Daily Volume) ───────────────── */
        <div className="px-4 flex flex-col gap-2">
          {BODY_PARTS.map(bp => (
            <button
              key={bp.key}
              onClick={() => selectBodyPart(bp.key)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 active:opacity-70 transition-opacity w-full text-left"
              style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
              <div
                className="flex-shrink-0 w-1 self-stretch rounded-full"
                style={{ background: BODY_PART_COLORS[bp.key], minHeight: 20 }}
              />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{bp.label}</p>
              </div>
              <ChevronRight size={14} color="var(--text-chevron)" />
            </button>
          ))}
        </div>

      ) : (

        /* ── Exercise selector (Best 1RM) ────────────────────── */
        <div className="px-4 flex flex-col gap-2">
          {resolvedExercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>
              {ja ? '記録済みの種目がありません' : 'No exercises logged yet.'}
            </p>
          ) : (
            resolvedExercises.map(ex => {
              const locked = ex.logCount < EXERCISE_GRAPH_REQUIRED
              if (locked) {
                return (
                  <div
                    key={ex.name}
                    className="flex items-center gap-3 rounded-xl px-4 py-3.5 w-full text-left"
                    style={{ background: 'var(--surface-chip)', border: '1px solid var(--border-subtle)', opacity: 0.5 }}>
                    <div className="flex-shrink-0 w-1 self-stretch rounded-full" style={{ background: 'var(--border-subtle)', minHeight: 20 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{ex.name}</p>
                      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 1 }}>
                        {ex.logCount} / {EXERCISE_GRAPH_REQUIRED} sessions
                      </p>
                    </div>
                    <Lock size={14} style={{ color: 'var(--text-disabled)' }} />
                  </div>
                )
              }
              return (
                <button
                  key={ex.name}
                  onClick={() => selectExercise(ex.name)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 active:opacity-70 transition-opacity w-full text-left"
                  style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
                  <div
                    className="flex-shrink-0 w-1 self-stretch rounded-full"
                    style={{ background: muscleColor(ex.muscle_group, isLight), minHeight: 20 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{ex.name}</p>
                    {ex.muscle_group && (
                      <p style={{ fontSize: 11, fontWeight: 500, color: muscleColor(ex.muscle_group, isLight), marginTop: 1 }}>
                        {muscleLabel(ex.muscle_group)} · {ex.logCount} session{ex.logCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} color="var(--text-chevron)" />
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
