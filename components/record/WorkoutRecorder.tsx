'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Check, X, Share2, Pencil } from 'lucide-react'
import { createSession, completeSession, cancelSession, getExercisePR } from '@/actions/workout'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import NumberInputSheet from './NumberInputSheet'
import RestTimerSheet from './RestTimerSheet'
import { formatVolume } from '@/lib/utils'

type SetEntry = {
  id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  is_completed: boolean
  is_pr: boolean
}

type ExerciseEntry = {
  id: string
  name: string
  muscle_group: string
  allTimePR: number | null   // max weight_kg ever (from Supabase)
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
  // Include all sets with both weight and reps entered (not just completed)
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
  if (maxWeightToday > allTimePR) {
    return { type: 'new_pr', gap: Math.round((maxWeightToday - allTimePR) * 10) / 10 }
  }
  return { type: 'below', gap: Math.round((allTimePR - maxWeightToday) * 10) / 10 }
}

async function ensureAuth() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.signInAnonymously()
    await new Promise(r => setTimeout(r, 600))
  }
}

/* ─── Main component ──────────────────────────────────── */

export default function WorkoutRecorder({ exercises: allExercises }: { exercises: Exercise[] }) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [title, setTitle] = useState(getDefaultTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>([])
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [numberTarget, setNumberTarget] = useState<NumberTarget | null>(null)
  const [showRest, setShowRest] = useState(false)
  const [prAlert, setPrAlert] = useState<string | null>(null)
  const [completingSetId, setCompletingSetId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'recording' | 'done'>('recording')
  const [saving, setSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  const totalVolume = exerciseList.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) =>
      s + (set.is_completed ? (set.weight_kg ?? 0) * (set.reps ?? 0) : 0), 0), 0)

  const completedSets = exerciseList.flatMap(ex =>
    ex.sets.filter(s => s.is_completed).map(s => ({
      exercise_name: ex.name,
      muscle_group: ex.muscle_group,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
    }))
  )

  // Display stats — include all entered (weight+reps filled) not just completed
  const displayVolume = Math.round(exerciseList.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) =>
      s + (set.weight_kg !== null && set.reps !== null ? set.weight_kg * set.reps : 0), 0), 0))
  const displaySetsCount = exerciseList.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.weight_kg !== null && s.reps !== null).length, 0)
  const bestSessionEst1rm = exerciseList.reduce((best, ex) => {
    const stats = calcExerciseStats(ex)
    return (stats?.est1rm ?? 0) > best ? stats!.est1rm : best
  }, 0)

  const addExercise = async (exercise: Exercise) => {
    if (!sessionId) {
      await ensureAuth()
      const id = await createSession(title)
      setSessionId(id)
    }
    setExerciseList(prev => [...prev, {
      id: uid(),
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      allTimePR: null,
      sets: [{ id: uid(), set_number: 1, weight_kg: null, reps: null, is_completed: false, is_pr: false }],
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
      const lastDone = [...ex.sets].reverse().find(s => s.is_completed)
      return {
        ...ex,
        sets: [...ex.sets, {
          id: uid(),
          set_number: ex.sets.length + 1,
          weight_kg: lastDone?.weight_kg ?? null,
          reps: lastDone?.reps ?? null,
          is_completed: false,
          is_pr: false,
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

  const toggleComplete = (exerciseId: string, setId: string) => {
    const ex = exerciseList.find(e => e.id === exerciseId)
    const s = ex?.sets.find(s => s.id === setId)
    if (!ex || !s) return

    if (s.is_completed) {
      setExerciseList(prev => prev.map(e => e.id !== exerciseId ? e : {
        ...e,
        sets: e.sets.map(set => set.id === setId ? { ...set, is_completed: false, is_pr: false } : set),
      }))
      return
    }

    const isPR = s.weight_kg !== null && (ex.allTimePR === null || s.weight_kg > ex.allTimePR)

    setExerciseList(prev => prev.map(e => {
      if (e.id !== exerciseId) return e
      return {
        ...e,
        allTimePR: isPR && s.weight_kg ? Math.max(e.allTimePR ?? 0, s.weight_kg) : e.allTimePR,
        sets: e.sets.map(set =>
          set.id === setId ? { ...set, is_completed: true, is_pr: isPR } : set
        ),
      }
    }))

    if (isPR) {
      setPrAlert(ex.name)
      setTimeout(() => setPrAlert(null), 2500)
    }
    setCompletingSetId(setId)
    setTimeout(() => setCompletingSetId(null), 500)
    setShowRest(true)
  }

  const handleFinish = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      await completeSession(sessionId, completedSets)
      setPhase('done')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (sessionId) await cancelSession(sessionId).catch(() => {})
    router.push('/home')
  }

  /* ── DONE phase ───────────────────────────────────── */
  if (phase === 'done') {
    return (
      <div className="min-h-screen px-4 pt-14 pb-8 flex flex-col" style={{ background: '#0a0a0a' }}>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-3xl font-black text-white mb-1 tracking-wide">DONE.</p>
          <p className="text-sm mb-8 tracking-widest" style={{ color: '#555' }}>{title}</p>

          <div className="w-full rounded-3xl overflow-hidden mb-5"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #ff6b00, #7c3aed)' }} />
            <div className="grid grid-cols-3">
              {[
                { label: 'VOLUME', value: formatVolume(totalVolume) },
                { label: 'SETS',   value: String(completedSets.length) },
                { label: 'TIME',   value: formatElapsed(elapsed) },
              ].map(({ label, value }, i) => (
                <div key={label} className="p-4 text-center"
                  style={{ borderRight: i < 2 ? '1px solid #1e1e1e' : 'none' }}>
                  <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: '#555' }}>{label}</p>
                  <p className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full space-y-2 mb-6">
            {exerciseList.map(ex => {
              const done = ex.sets.filter(s => s.is_completed)
              if (!done.length) return null
              const maxW = Math.max(...done.map(s => s.weight_kg ?? 0))
              const hasPR = done.some(s => s.is_pr)
              return (
                <div key={ex.id} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div className="flex items-center gap-2">
                    {hasPR && <span className="text-xs">🔥</span>}
                    <span className="text-sm font-black text-white">{ex.name}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: '#ff6b00', fontFamily: 'var(--font-mono)' }}>
                    {done.length} sets · {maxW}kg
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          {sessionId && (
            <Link href={`/share?session=${sessionId}`}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-black text-white tracking-widest"
              style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
              <Share2 size={18} />
              SHARE STORY ↗
            </Link>
          )}
          <button className="w-full py-3.5 rounded-2xl text-sm font-black tracking-widest"
            style={{ background: '#111', color: '#444', border: '1px solid #1e1e1e' }}
            onClick={() => router.push('/home')}>
            HOME
          </button>
        </div>
      </div>
    )
  }

  /* ── RECORDING phase ──────────────────────────────── */
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

        <div className="flex items-center justify-between pb-3">
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

        {/* ── Header stats strip ── */}
        <div className="flex items-center pb-3 gap-0">
          <HeaderStat
            label="VOL"
            value={displayVolume > 0 ? formatVolume(displayVolume) : '—'}
            active={displayVolume > 0}
            accent
          />
          <div className="w-px h-5 mx-4" style={{ background: '#1e1e1e' }} />
          <HeaderStat
            label="SETS"
            value={displaySetsCount > 0 ? String(displaySetsCount) : '—'}
            active={displaySetsCount > 0}
          />
          <div className="w-px h-5 mx-4" style={{ background: '#1e1e1e' }} />
          <HeaderStat
            label="BEST 1RM"
            value={bestSessionEst1rm > 0 ? `${bestSessionEst1rm}kg` : '—'}
            active={bestSessionEst1rm > 0}
            purple
          />
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-4"
        style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom))' }}>

        {exerciseList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-5">⚡</div>
            <p className="text-base font-black text-white mb-2 tracking-wide">BUILD TODAY'S EFFORT</p>
            <p className="text-xs font-bold" style={{ color: '#444' }}>Tap + Add Exercise to get started</p>
          </div>
        )}

        {exerciseList.map(ex => {
          const stats = calcExerciseStats(ex)
          const prStatus = stats ? calcPRStatus(stats.maxWeightToday, ex.allTimePR) : null

          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden"
              style={{
                background: '#111',
                border: prStatus?.type === 'new_pr'
                  ? '1px solid rgba(255,107,0,0.4)'
                  : '1px solid #1e1e1e',
                boxShadow: prStatus?.type === 'new_pr'
                  ? '0 0 20px rgba(255,107,0,0.1)'
                  : 'none',
              }}>

              {/* Exercise header */}
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid #1a1a1a' }}>
                <div className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ background: prStatus?.type === 'new_pr' ? '#ff6b00' : '#2a2a2a' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white tracking-wide truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black tracking-wider" style={{ color: '#ff6b00' }}>
                      {ex.muscle_group}
                    </span>
                    {ex.allTimePR !== null ? (
                      <span className="text-[10px] font-bold" style={{ color: '#444' }}>
                        · PR {ex.allTimePR}kg
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest"
                        style={{
                          background: 'rgba(59,130,246,0.12)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59,130,246,0.25)',
                        }}>
                        FIRST LOG
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeExercise(ex.id)} className="p-1">
                  <X size={15} style={{ color: '#333' }} />
                </button>
              </div>

              {/* Column labels */}
              <div className="grid grid-cols-12 gap-2 px-4 pt-3 pb-1.5">
                <span className="col-span-2 text-center text-[9px] font-black tracking-widest"
                  style={{ color: '#333' }}>SET</span>
                <span className="col-span-4 text-center text-[9px] font-black tracking-widest"
                  style={{ color: '#333' }}>KG</span>
                <span className="col-span-3 text-center text-[9px] font-black tracking-widest"
                  style={{ color: '#333' }}>REPS</span>
                <span className="col-span-3 text-right text-[9px] font-black tracking-widest pr-1"
                  style={{ color: '#333' }}>DONE</span>
              </div>

              {/* Sets */}
              {ex.sets.map(set => {
                const isCompleting = completingSetId === set.id
                // Per-row est1rm preview (for incomplete sets with values)
                const rowEst = set.weight_kg && set.reps
                  ? est1rmOf(set.weight_kg, set.reps)
                  : null

                return (
                  <div key={set.id}>
                    <div
                      className="grid grid-cols-12 gap-2 items-center px-4 py-2"
                      style={{
                        background: set.is_completed ? 'rgba(255,107,0,0.06)' : 'transparent',
                        opacity: set.is_completed ? 0.65 : 1,
                        transition: 'opacity 0.3s, background 0.3s',
                      }}>
                      {/* Set number */}
                      <div className="col-span-2 flex justify-center">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            background: set.is_completed ? '#ff6b00' : '#1a1a1a',
                            color: set.is_completed ? '#fff' : '#555',
                            fontFamily: 'var(--font-mono)',
                          }}>
                          {set.is_pr ? '★' : set.set_number}
                        </span>
                      </div>

                      {/* Weight */}
                      <button
                        className="col-span-4 py-3 rounded-xl text-center font-black"
                        style={{
                          background: '#1a1a1a',
                          color: set.weight_kg !== null ? '#fff' : '#333',
                          fontSize: set.weight_kg !== null ? 19 : 15,
                          fontFamily: set.weight_kg !== null ? 'var(--font-mono)' : 'inherit',
                        }}
                        onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'weight_kg' })}>
                        {set.weight_kg ?? '—'}
                      </button>

                      {/* Reps */}
                      <button
                        className="col-span-3 py-3 rounded-xl text-center font-black"
                        style={{
                          background: '#1a1a1a',
                          color: set.reps !== null ? '#fff' : '#333',
                          fontSize: set.reps !== null ? 19 : 15,
                          fontFamily: set.reps !== null ? 'var(--font-mono)' : 'inherit',
                        }}
                        onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'reps' })}>
                        {set.reps ?? '—'}
                      </button>

                      {/* Check */}
                      <div className="col-span-3 flex justify-end">
                        <button
                          className="w-11 h-11 rounded-full flex items-center justify-center"
                          style={{
                            background: set.is_completed ? '#ff6b00' : 'transparent',
                            border: set.is_completed ? 'none' : '2px solid #2a2a2a',
                            transform: isCompleting ? 'scale(1.35)' : 'scale(1)',
                            transition: 'transform 0.2s cubic-bezier(.175,.885,.32,1.275), background 0.2s',
                            boxShadow: set.is_completed ? '0 0 12px rgba(255,107,0,0.35)' : 'none',
                          }}
                          onClick={() => toggleComplete(ex.id, set.id)}>
                          <Check size={18} strokeWidth={3}
                            style={{ color: set.is_completed ? '#fff' : '#333' }} />
                        </button>
                      </div>
                    </div>

                    {/* Per-row 1RM preview (shows when both weight & reps are entered, not yet completed) */}
                    {rowEst !== null && !set.is_completed && (
                      <div className="px-4 pb-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] font-black tracking-widest" style={{ color: '#333' }}>
                          EST 1RM
                        </span>
                        <span className="text-[10px] font-black" style={{ color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>
                          {rowEst}kg
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* ── Exercise stats panel ── */}
              {stats && (
                <div className="mx-3 mb-3 rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #1e1e1e', marginTop: 8 }}>

                  {/* Row 1: Volume + EST 1RM — big numbers */}
                  <div className="grid grid-cols-2"
                    style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}>
                    <div className="px-4 py-4" style={{ borderRight: '1px solid #1a1a1a' }}>
                      <p className="text-[9px] font-black tracking-widest mb-2"
                        style={{ color: '#555' }}>TOTAL VOLUME</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white leading-none"
                          style={{ fontFamily: 'var(--font-mono)' }}>
                          {stats.volume >= 1000 ? (stats.volume / 1000).toFixed(1) : stats.volume}
                        </span>
                        <span className="text-base font-bold ml-0.5" style={{ color: '#555' }}>
                          {stats.volume >= 1000 ? 't' : 'kg'}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-[9px] font-black tracking-widest mb-2"
                        style={{ color: '#555' }}>EST. 1RM</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black leading-none"
                          style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                          {stats.est1rm}
                        </span>
                        <span className="text-base font-bold ml-0.5" style={{ color: '#555' }}>kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Best set + PR badge */}
                  <div className="grid grid-cols-2 px-4 py-4 items-start"
                    style={{ background: '#0a0a0a' }}>
                    <div>
                      <p className="text-[9px] font-black tracking-widest mb-2"
                        style={{ color: '#555' }}>BEST SET</p>
                      <p className="text-lg font-black text-white leading-none"
                        style={{ fontFamily: 'var(--font-mono)' }}>
                        {stats.bestWeight}kg × {stats.bestReps}
                      </p>
                    </div>
                    {prStatus && <PRBadge status={prStatus} />}
                  </div>
                </div>
              )}

              {/* Add set */}
              <button
                className="w-full py-3.5 flex items-center justify-center gap-1.5 text-[10px] font-black tracking-widest"
                style={{ color: '#ff6b00', borderTop: '1px solid #1a1a1a' }}
                onClick={() => addSet(ex.id)}>
                <Plus size={12} strokeWidth={3} />
                ADD SET
              </button>
            </div>
          )
        })}

        <div ref={listEndRef} />
      </div>

      {/* ── PR Flash banner ── */}
      {prAlert && (
        <div className="fixed top-36 inset-x-0 flex justify-center z-50 pointer-events-none px-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl"
            style={{
              background: '#ff6b00',
              boxShadow: '0 0 30px rgba(255,107,0,0.5)',
              animation: 'fadeInUp 0.3s ease',
            }}>
            <span>🔥</span>
            <span className="text-sm font-black text-white tracking-wide">NEW PR! {prAlert}</span>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="fixed inset-x-0 z-10 px-4 pb-4 pt-3"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #0a0a0a 70%, transparent)',
        }}>
        <div className="flex gap-2.5">
          <button
            className="flex-1 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 tracking-wide"
            style={{ background: '#111', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.35)' }}
            onClick={() => setShowPicker(true)}>
            <Plus size={18} strokeWidth={2.5} />
            Add Exercise
          </button>
          {completedSets.length > 0 && (
            <button
              className="flex-1 py-4 rounded-2xl text-sm font-black text-white tracking-wide"
              style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
              disabled={saving}
              onClick={handleFinish}>
              {saving ? 'SAVING...' : `FINISH · ${completedSets.length}`}
            </button>
          )}
        </div>
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

      {showRest && <RestTimerSheet onClose={() => setShowRest(false)} />}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full rounded-3xl p-6" style={{ background: '#111', border: '1px solid #222' }}>
            <p className="text-xl font-black text-white text-center mb-1 tracking-wide">QUIT WORKOUT?</p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#555' }}>
              Your progress will not be saved
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#1a1a1a', color: '#666', border: '1px solid #1e1e1e' }}
                onClick={() => setShowCancelConfirm(false)}>
                KEEP GOING
              </button>
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={handleCancel}>
                QUIT
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
  label: string
  value: string
  active: boolean
  accent?: boolean
  purple?: boolean
}) {
  const color = !active ? '#2a2a2a' : accent ? '#ff6b00' : purple ? '#7c3aed' : '#fff'
  return (
    <div>
      <p className="text-[8px] font-black tracking-widest mb-0.5" style={{ color: '#333' }}>{label}</p>
      <p className="text-sm font-black" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</p>
    </div>
  )
}

function PRBadge({ status }: { status: PRStatus }) {
  if (status.type === 'first') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-[9px] font-black tracking-widest" style={{ color: '#555' }}>PR STATUS</p>
        <div className="px-3 py-2 rounded-xl"
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <p className="text-xs font-black tracking-widest" style={{ color: '#60a5fa' }}>FIRST LOG</p>
        </div>
      </div>
    )
  }

  if (status.type === 'new_pr') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-[9px] font-black tracking-widest" style={{ color: '#555' }}>PR STATUS</p>
        <div className="px-3 py-2 rounded-xl text-right"
          style={{
            background: 'rgba(255,107,0,0.18)',
            border: '1px solid rgba(255,107,0,0.5)',
            boxShadow: '0 0 24px rgba(255,107,0,0.22)',
          }}>
          <p className="text-xs font-black tracking-wide" style={{ color: '#ff6b00' }}>🔥 NEW MAX PR</p>
          <p className="text-lg font-black leading-tight"
            style={{ color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            +{status.gap}kg
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-[9px] font-black tracking-widest" style={{ color: '#555' }}>PR STATUS</p>
      <div className="px-3 py-2 rounded-xl text-right"
        style={{ background: '#161616', border: '1px solid #222' }}>
        <p className="text-xs font-black tracking-widest" style={{ color: '#666' }}>BEST TODAY</p>
        <p className="text-sm font-black leading-tight"
          style={{ color: '#444', fontFamily: 'var(--font-mono)' }}>
          -{status.gap}kg
        </p>
      </div>
    </div>
  )
}
