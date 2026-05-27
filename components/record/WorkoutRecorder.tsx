'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil } from 'lucide-react'
import { getExercisePR } from '@/actions/workout'
import ExercisePicker from './ExercisePicker'
import NumberInputSheet from './NumberInputSheet'
import { formatVolume } from '@/lib/utils'

type SetEntry = {
  id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
}

type ExerciseEntry = {
  id: string
  name: string
  muscle_group: string
  allTimePR: number | null
  sets: SetEntry[]
}

type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  is_custom: boolean
}

type NumberTarget = {
  exerciseId: string
  setId: string
  field: 'weight_kg' | 'reps'
}

type PRStatus =
  | { type: 'first' }
  | { type: 'new_pr'; gap: number }
  | { type: 'below';  gap: number }

/* ─── Pure helpers ────────────────────────────────────── */

function uid() { return Math.random().toString(36).slice(2) }

function getDefaultTitle() {
  const h = new Date().getHours()
  if (h < 6)  return 'NIGHT SESSION'
  if (h < 12) return 'MORNING SESSION'
  if (h < 15) return 'NOON SESSION'
  if (h < 19) return 'EVENING SESSION'
  return 'NIGHT SESSION'
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function est1rmOf(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : Math.round(weightKg * (1 + reps / 30))
}

function calcExerciseStats(ex: ExerciseEntry) {
  const entered = ex.sets.filter(s => s.weight_kg !== null && s.reps !== null)
  if (entered.length === 0) return null
  const volume = Math.round(entered.reduce((sum, s) => sum + s.weight_kg! * s.reps!, 0))
  const bestSet = entered.reduce((prev, s) =>
    est1rmOf(s.weight_kg!, s.reps!) > est1rmOf(prev.weight_kg!, prev.reps!) ? s : prev
  )
  const est1rm = est1rmOf(bestSet.weight_kg!, bestSet.reps!)
  const maxWeightToday = Math.max(...entered.map(s => s.weight_kg!))
  return { volume, bestWeight: bestSet.weight_kg!, bestReps: bestSet.reps!, est1rm, maxWeightToday }
}

function calcPRStatus(maxWeightToday: number, allTimePR: number | null): PRStatus {
  if (allTimePR === null) return { type: 'first' }
  if (maxWeightToday > allTimePR)
    return { type: 'new_pr', gap: Math.round((maxWeightToday - allTimePR) * 10) / 10 }
  return { type: 'below', gap: Math.round((allTimePR - maxWeightToday) * 10) / 10 }
}

/* ─── Main component ──────────────────────────────────── */

export default function WorkoutRecorder({ exercises: allExercises }: { exercises: Exercise[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(getDefaultTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>([])
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [numberTarget, setNumberTarget] = useState<NumberTarget | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  const displayVolume = Math.round(exerciseList.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) =>
      s + (set.weight_kg !== null && set.reps !== null ? set.weight_kg * set.reps : 0), 0), 0))
  const displaySetsCount = exerciseList.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.weight_kg !== null && s.reps !== null).length, 0)
  const bestSessionEst1rm = exerciseList.reduce((best, ex) => {
    const s = calcExerciseStats(ex)
    return (s?.est1rm ?? 0) > best ? s!.est1rm : best
  }, 0)

  const addExercise = (exercise: Exercise) => {
    setExerciseList(prev => [...prev, {
      id: uid(),
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      allTimePR: null,
      sets: [{ id: uid(), set_number: 1, weight_kg: null, reps: null }],
    }])
    setShowPicker(false)
    getExercisePR(exercise.name).then(pr => {
      if (pr !== null) {
        setExerciseList(prev => prev.map(ex =>
          ex.name === exercise.name && ex.allTimePR === null ? { ...ex, allTimePR: pr } : ex
        ))
      }
    })
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const addSet = (exerciseId: string) => {
    setExerciseList(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      const last = [...ex.sets].reverse().find(s => s.weight_kg !== null && s.reps !== null)
      return {
        ...ex,
        sets: [...ex.sets, {
          id: uid(),
          set_number: ex.sets.length + 1,
          weight_kg: last?.weight_kg ?? null,
          reps: last?.reps ?? null,
        }],
      }
    }))
  }

  const removeExercise = (exerciseId: string) => {
    setExerciseList(prev => prev.filter(ex => ex.id !== exerciseId))
  }

  const updateSet = (exerciseId: string, setId: string, field: 'weight_kg' | 'reps', value: number) => {
    setExerciseList(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      return { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
    }))
  }

  const currentTarget = (() => {
    if (!numberTarget) return null
    const ex = exerciseList.find(e => e.id === numberTarget.exerciseId)
    const s = ex?.sets.find(s => s.id === numberTarget.setId)
    return s?.[numberTarget.field] ?? null
  })()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 px-4 pt-14"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #111' }}>

        <div className="flex items-center justify-between pb-2.5">
          <button onClick={() => setShowCancelConfirm(true)} className="p-1.5 -ml-1.5">
            <X size={20} style={{ color: '#444' }} />
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
              className="text-center text-base font-black text-white bg-transparent outline-none"
              style={{ borderBottom: '2px solid #ff6b00', maxWidth: 200 }}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5">
              <span className="text-base font-black text-white tracking-wide">{title}</span>
              <Pencil size={11} style={{ color: '#444' }} />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span className="text-sm font-black text-white tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}>{formatElapsed(elapsed)}</span>
          </div>
        </div>

        {/* Header stats strip */}
        <div className="flex items-center pb-2.5">
          <HeaderStat label="VOL"     value={displayVolume > 0 ? formatVolume(displayVolume) : '—'} active={displayVolume > 0} accent />
          <div className="w-px h-4 mx-3.5" style={{ background: '#1e1e1e' }} />
          <HeaderStat label="SETS"    value={displaySetsCount > 0 ? String(displaySetsCount) : '—'} active={displaySetsCount > 0} />
          <div className="w-px h-4 mx-3.5" style={{ background: '#1e1e1e' }} />
          <HeaderStat label="BEST 1RM" value={bestSessionEst1rm > 0 ? `${bestSessionEst1rm}kg` : '—'} active={bestSessionEst1rm > 0} purple />
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-3"
        style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>

        {exerciseList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">⚡</div>
            <p className="text-base font-black text-white mb-2 tracking-wide">BUILD TODAY'S EFFORT</p>
            <p className="text-xs font-bold" style={{ color: '#444' }}>Tap + Add Exercise to get started</p>
          </div>
        )}

        {exerciseList.map(ex => {
          const stats = calcExerciseStats(ex)
          const prStatus = stats ? calcPRStatus(stats.maxWeightToday, ex.allTimePR) : null
          const isNewPR = prStatus?.type === 'new_pr'
          const volStr = stats
            ? stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(1)}t` : `${stats.volume}kg`
            : null

          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden"
              style={{
                background: '#111',
                border: isNewPR ? '1px solid rgba(255,107,0,0.4)' : '1px solid #1e1e1e',
                boxShadow: isNewPR ? '0 0 18px rgba(255,107,0,0.08)' : 'none',
              }}>

              {/* ── Exercise header (compact) ── */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-0.5 self-stretch rounded-full flex-shrink-0"
                  style={{ background: isNewPR ? '#ff6b00' : '#2a2a2a' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight truncate">{ex.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-black tracking-wider" style={{ color: '#ff6b00' }}>
                      {ex.muscle_group}
                    </span>
                    {ex.allTimePR !== null ? (
                      <span className="text-[10px] font-bold" style={{ color: '#3a3a3a' }}>
                        · PR {ex.allTimePR}kg
                      </span>
                    ) : (
                      <span className="px-1.5 py-px rounded-full text-[8px] font-black tracking-widest"
                        style={{
                          background: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                        FIRST LOG
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeExercise(ex.id)} className="p-1 flex-shrink-0">
                  <X size={14} style={{ color: '#2a2a2a' }} />
                </button>
              </div>

              {/* Column labels */}
              <div className="grid grid-cols-12 gap-1.5 px-3 pt-1.5 pb-1"
                style={{ borderTop: '1px solid #1a1a1a' }}>
                <span className="col-span-2 text-center text-[8px] font-black tracking-widest"
                  style={{ color: '#2a2a2a' }}>#</span>
                <span className="col-span-5 text-center text-[8px] font-black tracking-widest"
                  style={{ color: '#2a2a2a' }}>KG</span>
                <span className="col-span-5 text-center text-[8px] font-black tracking-widest"
                  style={{ color: '#2a2a2a' }}>REPS</span>
              </div>

              {/* Set rows */}
              {ex.sets.map(set => (
                <div key={set.id} className="grid grid-cols-12 gap-1.5 items-center px-3 py-1">
                  <div className="col-span-2 flex justify-center">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                      style={{ background: '#181818', color: '#444', fontFamily: 'var(--font-mono)' }}>
                      {set.set_number}
                    </span>
                  </div>
                  <button
                    className="col-span-5 py-2 rounded-lg text-center font-black active:scale-95 transition-transform"
                    style={{
                      background: '#1a1a1a',
                      color: set.weight_kg !== null ? '#fff' : '#2a2a2a',
                      fontSize: set.weight_kg !== null ? 17 : 14,
                      fontFamily: set.weight_kg !== null ? 'var(--font-mono)' : 'inherit',
                    }}
                    onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'weight_kg' })}>
                    {set.weight_kg ?? '—'}
                  </button>
                  <button
                    className="col-span-5 py-2 rounded-lg text-center font-black active:scale-95 transition-transform"
                    style={{
                      background: '#1a1a1a',
                      color: set.reps !== null ? '#fff' : '#2a2a2a',
                      fontSize: set.reps !== null ? 17 : 14,
                      fontFamily: set.reps !== null ? 'var(--font-mono)' : 'inherit',
                    }}
                    onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'reps' })}>
                    {set.reps ?? '—'}
                  </button>
                </div>
              ))}

              {/* ── Compact stats bar (1 line) ── */}
              {stats && volStr && (
                <div className="flex items-center gap-0 px-3 py-2 overflow-x-auto no-scrollbar"
                  style={{ borderTop: '1px solid #1a1a1a', background: '#0d0d0d' }}>
                  <StatChip label="VOL" value={volStr} color="#ff6b00" />
                  <Dot />
                  <StatChip label="1RM" value={`${stats.est1rm}kg`} color="#a78bfa" />
                  <Dot />
                  <StatChip label="BEST" value={`${stats.bestWeight}×${stats.bestReps}`} color="#e0e0e0" />
                  <Dot />
                  {prStatus && <PRPill status={prStatus} />}
                </div>
              )}

              {/* Add set */}
              <button
                className="w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black tracking-widest"
                style={{ color: '#ff6b00', borderTop: '1px solid #1a1a1a' }}
                onClick={() => addSet(ex.id)}>
                <Plus size={10} strokeWidth={3} />
                + SET
              </button>
            </div>
          )
        })}

        <div ref={listEndRef} />
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed inset-x-0 z-10 px-4 pb-3 pt-2"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #0a0a0a 65%, transparent)',
        }}>
        <button
          className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 tracking-widest"
          style={{ background: '#111', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.35)' }}
          onClick={() => setShowPicker(true)}>
          <Plus size={16} strokeWidth={2.5} />
          ADD EXERCISE
        </button>
      </div>

      {/* ── Modals ── */}
      {showPicker && (
        <ExercisePicker
          exercises={allExercises}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {numberTarget && (
        <NumberInputSheet
          label={numberTarget.field === 'weight_kg' ? 'WEIGHT (kg)' : 'REPS'}
          value={currentTarget}
          unit={numberTarget.field === 'weight_kg' ? 'kg' : 'reps'}
          step={numberTarget.field === 'weight_kg' ? 2.5 : 1}
          quickSteps={numberTarget.field === 'weight_kg' ? [-5, -2.5, 2.5, 5] : [-2, -1, 1, 2]}
          onConfirm={v => updateSet(numberTarget.exerciseId, numberTarget.setId, numberTarget.field, v)}
          onClose={() => setNumberTarget(null)}
        />
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full rounded-3xl p-6" style={{ background: '#111', border: '1px solid #222' }}>
            <p className="text-xl font-black text-white text-center mb-1 tracking-wide">LEAVE WORKOUT?</p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#555' }}>
              Your entries will not be saved
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#1a1a1a', color: '#666', border: '1px solid #1e1e1e' }}
                onClick={() => setShowCancelConfirm(false)}>
                KEEP GOING
              </button>
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={() => router.push('/home')}>
                LEAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────── */

function HeaderStat({ label, value, active, accent, purple }: {
  label: string; value: string; active: boolean; accent?: boolean; purple?: boolean
}) {
  const color = !active ? '#2a2a2a' : accent ? '#ff6b00' : purple ? '#7c3aed' : '#fff'
  return (
    <div>
      <p className="text-[8px] font-black tracking-widest mb-0.5" style={{ color: '#333' }}>{label}</p>
      <p className="text-sm font-black" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</p>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1 shrink-0">
      <span style={{ color: '#3a3a3a', fontSize: 8, fontWeight: 900, letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color, fontSize: 12, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function Dot() {
  return <span style={{ color: '#2a2a2a', fontSize: 12, margin: '0 7px' }}>·</span>
}

function PRPill({ status }: { status: PRStatus }) {
  if (status.type === 'first') {
    return (
      <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest"
        style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
        FIRST LOG
      </span>
    )
  }
  if (status.type === 'new_pr') {
    return (
      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black"
        style={{
          background: 'rgba(255,107,0,0.18)',
          color: '#ff6b00',
          border: '1px solid rgba(255,107,0,0.45)',
          boxShadow: '0 0 10px rgba(255,107,0,0.2)',
        }}>
        🔥 +{status.gap}kg
      </span>
    )
  }
  return (
    <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest"
      style={{ background: '#161616', color: '#444', border: '1px solid #222' }}>
      -{status.gap}kg
    </span>
  )
}
