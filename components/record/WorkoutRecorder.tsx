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

function uid() { return Math.random().toString(36).slice(2) }

function getDefaultTitle() {
  const h = new Date().getHours()
  if (h < 6) return 'NIGHT SESSION'
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

function calcExerciseStats(ex: ExerciseEntry) {
  const done = ex.sets.filter(s => s.is_completed && s.weight_kg !== null && s.reps !== null)
  if (done.length === 0) return null
  const volume = done.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const best = done.reduce((prev, s) => (s.weight_kg ?? 0) > (prev.weight_kg ?? 0) ? s : prev)
  const est1rm = best.weight_kg !== null && best.reps !== null
    ? best.reps === 1
      ? best.weight_kg
      : Math.round(best.weight_kg * (1 + best.reps / 30))
    : null
  return { volume: Math.round(volume), bestWeight: best.weight_kg, bestReps: best.reps, est1rm }
}

async function ensureAuth() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.signInAnonymously()
    await new Promise(r => setTimeout(r, 600))
  }
}

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

  // ── DONE ──────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="min-h-screen px-4 pt-14 pb-8 flex flex-col" style={{ background: '#0a0a0a' }}>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-3xl font-black text-white mb-1 tracking-wide">DONE.</p>
          <p className="text-sm mb-8 tracking-widest uppercase" style={{ color: '#555' }}>{title}</p>

          {/* Summary card */}
          <div className="w-full rounded-3xl overflow-hidden mb-5"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #ff6b00, #7c3aed)' }} />
            <div className="grid grid-cols-3">
              {[
                { label: 'VOLUME', value: formatVolume(totalVolume) },
                { label: 'SETS', value: String(completedSets.length) },
                { label: 'TIME', value: formatElapsed(elapsed) },
              ].map(({ label, value }, i) => (
                <div key={label} className="p-4 text-center"
                  style={{ borderRight: i < 2 ? '1px solid #1e1e1e' : 'none' }}>
                  <p className="text-xs font-black tracking-widest mb-1.5" style={{ color: '#555' }}>{label}</p>
                  <p className="text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-exercise summary */}
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
                    <span className="text-sm font-bold text-white">{ex.name}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: '#ff6b00' }}>
                    {done.length}set · {maxW}kg
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

  // ── RECORDING ─────────────────────────────────────────
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
            <button onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5">
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

        {/* Stats strip */}
        <div className="flex items-center gap-5 pb-3">
          <Stat label="VOL" value={totalVolume > 0 ? formatVolume(totalVolume) : '—'} active={totalVolume > 0} accent />
          <div className="w-px h-3" style={{ background: '#1e1e1e' }} />
          <Stat label="SETS" value={String(completedSets.length)} active={completedSets.length > 0} />
          <div className="w-px h-3" style={{ background: '#1e1e1e' }} />
          <Stat label="EX" value={String(exerciseList.length)} active={exerciseList.length > 0} />
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

        {exerciseList.map(ex => (
          <div key={ex.id} className="rounded-2xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>

            {/* Exercise header */}
            <div className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: '#ff6b00' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white tracking-wide truncate">{ex.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold" style={{ color: '#ff6b00' }}>{ex.muscle_group}</span>
                  {ex.allTimePR !== null && (
                    <>
                      <span style={{ color: '#333' }}>·</span>
                      <span className="text-xs" style={{ color: '#555' }}>PR {ex.allTimePR}kg</span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => removeExercise(ex.id)} className="p-1">
                <X size={15} style={{ color: '#333' }} />
              </button>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-12 gap-2 px-4 pt-3 pb-1.5">
              <span className="col-span-2 text-center text-xs font-black tracking-widest"
                style={{ color: '#333' }}>SET</span>
              <span className="col-span-4 text-center text-xs font-black tracking-widest"
                style={{ color: '#333' }}>KG</span>
              <span className="col-span-3 text-center text-xs font-black tracking-widest"
                style={{ color: '#333' }}>REPS</span>
              <span className="col-span-3" />
            </div>

            {/* Sets */}
            {ex.sets.map(set => {
              const isCompleting = completingSetId === set.id
              return (
                <div key={set.id}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-2"
                  style={{
                    background: set.is_completed ? 'rgba(255,107,0,0.06)' : 'transparent',
                    opacity: set.is_completed ? 0.6 : 1,
                    transition: 'opacity 0.3s, background 0.3s',
                  }}>
                  {/* Number */}
                  <div className="col-span-2 flex justify-center">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: set.is_completed ? '#ff6b00' : '#1a1a1a',
                        color: set.is_completed ? '#fff' : '#555',
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
                      transition: 'transform 0.1s',
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
                      transition: 'transform 0.1s',
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
                      }}
                      onClick={() => toggleComplete(ex.id, set.id)}>
                      <Check
                        size={18}
                        strokeWidth={3}
                        style={{ color: set.is_completed ? '#fff' : '#333' }}
                      />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Per-exercise stats */}
            {(() => {
              const stats = calcExerciseStats(ex)
              if (!stats) return null
              return (
                <div className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: '1px solid #1a1a1a', background: 'rgba(255,107,0,0.04)' }}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black tracking-widest" style={{ color: '#555' }}>VOLUME</span>
                    <span className="text-sm font-black" style={{ color: '#ff6b00' }}>
                      {stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(1)}t` : `${stats.volume}kg`}
                    </span>
                  </div>
                  <div className="w-px h-3" style={{ background: '#2a2a2a' }} />
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black tracking-widest" style={{ color: '#555' }}>BEST</span>
                    <span className="text-sm font-black text-white">
                      {stats.bestWeight}kg×{stats.bestReps}
                    </span>
                  </div>
                  {stats.est1rm !== null && (
                    <>
                      <div className="w-px h-3" style={{ background: '#2a2a2a' }} />
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black tracking-widest" style={{ color: '#555' }}>1RM</span>
                        <span className="text-sm font-black" style={{ color: '#7c3aed' }}>
                          {stats.est1rm}kg
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {/* Add set */}
            <button
              className="w-full py-3.5 flex items-center justify-center gap-1.5 text-xs font-black tracking-widest uppercase"
              style={{ color: '#ff6b00', borderTop: '1px solid #1a1a1a' }}
              onClick={() => addSet(ex.id)}>
              <Plus size={13} strokeWidth={3} />
              Add Set
            </button>
          </div>
        ))}

        <div ref={listEndRef} />
      </div>

      {/* ── PR Flash ── */}
      {prAlert && (
        <div className="fixed top-36 inset-x-0 flex justify-center z-50 pointer-events-none px-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: '#ff6b00', animation: 'fadeInUp 0.3s ease' }}>
            <span>🔥</span>
            <span className="text-sm font-black text-white">NEW PR! {prAlert}</span>
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
            className="flex-1 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
            style={{ background: '#111', color: '#ff6b00', border: '1px solid #ff6b00' }}
            onClick={() => setShowPicker(true)}>
            <Plus size={18} strokeWidth={2.5} />
            Add Exercise
          </button>
          {completedSets.length > 0 && (
            <button
              className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
              style={{ background: '#ff6b00' }}
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
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#555' }}>Your progress will not be saved</p>
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

function Stat({ label, value, active, accent }: {
  label: string; value: string; active: boolean; accent?: boolean
}) {
  return (
    <div>
      <span className="text-xs font-black tracking-widest" style={{ color: '#444' }}>{label} </span>
      <span className="text-sm font-black"
        style={{ color: active ? (accent ? '#ff6b00' : '#fff') : '#333' }}>
        {value}
      </span>
    </div>
  )
}
