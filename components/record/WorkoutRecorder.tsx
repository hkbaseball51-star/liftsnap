'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, Minus } from 'lucide-react'
import { createSessionForDate, saveFullSession, getExercisePR } from '@/actions/workout'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import NumberInputSheet from './NumberInputSheet'
import { formatVolume } from '@/lib/utils'

/* ─── Types ───────────────────────────────────────────── */

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

type InitialExercise = {
  name: string
  muscle_group: string
  sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[]
}

type Props = {
  exercises: Exercise[]
  date: string                      // YYYY-MM-DD
  existingSessionId?: string
  existingExercises?: InitialExercise[]
}

/* ─── Pure helpers ────────────────────────────────────── */

function uid() { return Math.random().toString(36).slice(2) }

function getDefaultTitle(date: string) {
  const d = new Date(date + 'T00:00:00')
  const h = d.getHours()
  if (h < 6)  return 'NIGHT SESSION'
  if (h < 12) return 'MORNING SESSION'
  if (h < 15) return 'NOON SESSION'
  if (h < 19) return 'EVENING SESSION'
  return 'NIGHT SESSION'
}

function formatDateLabel(date: string) {
  const d = new Date(date + 'T00:00:00')
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
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

async function ensureAuth() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.signInAnonymously()
    await new Promise(r => setTimeout(r, 600))
  }
}

/* ─── Main component ──────────────────────────────────── */

export default function WorkoutRecorder({
  exercises: allExercises,
  date,
  existingSessionId,
  existingExercises,
}: Props) {
  const router = useRouter()
  const isEditing = !!existingSessionId && (existingExercises?.length ?? 0) > 0
  const todayJST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const isToday = date === todayJST

  const [sessionId, setSessionId] = useState<string | null>(existingSessionId ?? null)
  const [title, setTitle] = useState(() => getDefaultTitle(date))
  const [editingTitle, setEditingTitle] = useState(false)
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>(() =>
    (existingExercises ?? []).map(ex => ({
      id: uid(),
      name: ex.name,
      muscle_group: ex.muscle_group,
      allTimePR: null,
      sets: ex.sets.map(s => ({
        id: uid(),
        set_number: s.set_number,
        weight_kg: s.weight_kg,
        reps: s.reps,
      })),
    }))
  )
  const [showPicker, setShowPicker] = useState(false)
  const [numberTarget, setNumberTarget] = useState<NumberTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  // Fetch PR data for pre-loaded exercises
  useEffect(() => {
    for (const ex of existingExercises ?? []) {
      getExercisePR(ex.name).then(pr => {
        if (pr !== null) {
          setExerciseList(prev => prev.map(e =>
            e.name === ex.name && e.allTimePR === null ? { ...e, allTimePR: pr } : e
          ))
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayVolume = Math.round(exerciseList.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) =>
      s + (set.weight_kg !== null && set.reps !== null ? set.weight_kg * set.reps : 0), 0), 0))
  const displaySetsCount = exerciseList.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.weight_kg !== null && s.reps !== null).length, 0)
  const bestSessionEst1rm = exerciseList.reduce((best, ex) => {
    const s = calcExerciseStats(ex)
    return (s?.est1rm ?? 0) > best ? s!.est1rm : best
  }, 0)

  const addExercise = async (exercise: Exercise) => {
    if (!sessionId) {
      await ensureAuth()
      const id = await createSessionForDate(date, title)
      setSessionId(id)
    }
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

  const removeSet = (exerciseId: string, setId: string) => {
    setExerciseList(prev => prev.flatMap(ex => {
      if (ex.id !== exerciseId) return [ex]
      const newSets = ex.sets.filter(s => s.id !== setId)
        .map((s, i) => ({ ...s, set_number: i + 1 }))
      if (newSets.length === 0) return []     // remove exercise if no sets left
      return [{ ...ex, sets: newSets }]
    }))
  }

  const removeExercise = (id: string) =>
    setExerciseList(prev => prev.filter(ex => ex.id !== id))

  const updateSet = (exerciseId: string, setId: string, field: 'weight_kg' | 'reps', value: number) =>
    setExerciseList(prev => prev.map(ex =>
      ex.id !== exerciseId ? ex :
      { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
    ))

  const handleFinish = async () => {
    setSaving(true)
    try {
      let sid = sessionId
      if (!sid) {
        await ensureAuth()
        sid = await createSessionForDate(date, title)
        setSessionId(sid)
      }
      const setsToSave = exerciseList.flatMap(ex =>
        ex.sets
          .filter(s => s.weight_kg !== null && s.reps !== null)
          .map(s => ({
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            set_number: s.set_number,
            weight_kg: s.weight_kg,
            reps: s.reps,
          }))
      )
      await saveFullSession(sid, title, setsToSave)
      router.push('/home')
    } finally {
      setSaving(false)
    }
  }

  const currentTarget = (() => {
    if (!numberTarget) return null
    const ex = exerciseList.find(e => e.id === numberTarget.exerciseId)
    const s = ex?.sets.find(s => s.id === numberTarget.setId)
    return s?.[numberTarget.field] ?? null
  })()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 px-4 pt-14"
        style={{ background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Date label */}
        <div className="flex items-center justify-between pb-1">
          <button onClick={() => setShowCancelConfirm(true)} className="p-1.5 -ml-1.5">
            <X size={20} style={{ color: '#666' }} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black tracking-widest"
              style={{ color: isEditing ? '#22c55e' : isToday ? '#ff6b00' : '#999' }}>
              {isEditing ? 'EDITING SESSION' : isToday ? 'TODAY' : 'PAST SESSION'}
            </span>
            <span className="text-[11px] font-black tracking-wider" style={{ color: '#888' }}>
              {formatDateLabel(date)}
            </span>
          </div>
          <div className="w-10" />
        </div>

        {/* Session title */}
        <div className="flex justify-center pb-2">
          {editingTitle ? (
            <input autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
              className="text-center text-base font-black text-white bg-transparent outline-none"
              style={{ borderBottom: '2px solid #ff6b00', maxWidth: 220 }}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5">
              <span className="text-base font-black text-white tracking-wide">{title}</span>
              <Pencil size={11} style={{ color: '#666' }} />
            </button>
          )}
        </div>

        {/* Header stats */}
        <div className="flex items-stretch pb-2.5">
          <HeaderStat label="VOL"      value={displayVolume > 0 ? formatVolume(displayVolume) : '—'} active={displayVolume > 0} accent />
          <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <HeaderStat label="SETS"     value={displaySetsCount > 0 ? String(displaySetsCount) : '—'} active={displaySetsCount > 0} />
          <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <HeaderStat label="BEST 1RM" value={bestSessionEst1rm > 0 ? `${bestSessionEst1rm}kg` : '—'} active={bestSessionEst1rm > 0} purple />
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-3"
        style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>

        {exerciseList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">{isEditing ? '✏️' : '⚡'}</div>
            <p className="text-base font-black text-white mb-2 tracking-wide">
              {isEditing ? 'EDIT TODAY\'S SESSION' : 'BUILD TODAY\'S EFFORT'}
            </p>
            <p className="text-xs font-bold" style={{ color: '#777' }}>Tap + Add Exercise to get started</p>
          </div>
        )}

        {exerciseList.map(ex => {
          const stats = calcExerciseStats(ex)
          const prStatus = stats ? calcPRStatus(stats.maxWeightToday, ex.allTimePR) : null
          const isNewPR = prStatus?.type === 'new_pr'
          const isCompact = ex.sets.length >= 5

          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden"
              style={{
                background: '#131313',
                border: isNewPR ? '1px solid rgba(255,107,0,0.40)' : '1px solid rgba(255,255,255,0.13)',
                boxShadow: isNewPR ? '0 0 18px rgba(255,107,0,0.10)' : 'none',
              }}>

              {/* Exercise header */}
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-0.5 self-stretch rounded-full flex-shrink-0"
                  style={{ background: isNewPR ? '#ff6b00' : '#3a3a3a' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight truncate">{ex.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-black tracking-wider" style={{ color: '#ff6b00' }}>
                      {ex.muscle_group}
                    </span>
                    {ex.allTimePR !== null ? (
                      <span className="text-[10px] font-bold" style={{ color: '#888' }}>
                        · PR {ex.allTimePR}kg
                      </span>
                    ) : (
                      <span className="px-1.5 py-px rounded-full text-[8px] font-black tracking-widest"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                        FIRST LOG
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeExercise(ex.id)} className="p-1 flex-shrink-0">
                  <X size={14} style={{ color: '#555' }} />
                </button>
              </div>

              {/* Column labels: # | KG | REPS | 1RM */}
              <div className="grid grid-cols-12 gap-1.5 px-3 pt-1 pb-0.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }}>
                <span className="col-span-2 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>#</span>
                <span className="col-span-4 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>KG</span>
                <span className="col-span-3 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>REPS</span>
                <span className="col-span-3 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>1RM</span>
              </div>

              {/* Set rows */}
              {ex.sets.map(set => {
                const setEst1rm = set.weight_kg !== null && set.reps !== null
                  ? est1rmOf(set.weight_kg, set.reps) : null
                const isBestSet = stats !== null && setEst1rm !== null && setEst1rm === stats.est1rm
                const canDelete = ex.sets.length > 1

                return (
                  <div key={set.id} className="grid grid-cols-12 items-center px-3"
                    style={{ gap: 6, paddingTop: 5, paddingBottom: 5 }}>
                    {/* Set number + delete */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      {canDelete ? (
                        <button
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,80,80,0.28)' }}
                          onClick={() => removeSet(ex.id, set.id)}>
                          <Minus size={8} style={{ color: 'rgba(255,100,100,0.9)' }} />
                        </button>
                      ) : (
                        <div className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                        style={{
                          background: isBestSet ? 'rgba(255,107,0,0.15)' : '#222',
                          color: isBestSet ? '#ff7a1a' : '#888',
                          fontFamily: 'var(--font-mono)',
                          border: isBestSet ? '1px solid rgba(255,106,0,0.55)' : '1px solid rgba(255,255,255,0.08)',
                          flexShrink: 0,
                        }}>
                        {set.set_number}
                      </span>
                    </div>

                    {/* KG input */}
                    <button
                      className="col-span-4 active:scale-95 transition-transform"
                      style={{
                        height: 44,
                        borderRadius: 10,
                        background: '#1e1e1e',
                        border: '1px solid rgba(255,255,255,0.11)',
                        color: set.weight_kg !== null ? '#fff' : '#6a6a6a',
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'weight_kg' })}>
                      {set.weight_kg ?? '—'}
                    </button>

                    {/* REPS input */}
                    <button
                      className="col-span-3 active:scale-95 transition-transform"
                      style={{
                        height: 44,
                        borderRadius: 10,
                        background: '#1e1e1e',
                        border: '1px solid rgba(255,255,255,0.11)',
                        color: set.reps !== null ? '#fff' : '#6a6a6a',
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setNumberTarget({ exerciseId: ex.id, setId: set.id, field: 'reps' })}>
                      {set.reps ?? '—'}
                    </button>

                    {/* SET 1RM */}
                    <div className="col-span-3 flex items-center justify-center">
                      {setEst1rm !== null ? (
                        <span style={{ color: isBestSet ? '#c09bff' : '#9a9a9a', fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                          {setEst1rm}kg
                        </span>
                      ) : (
                        <span style={{ color: '#666', fontSize: 14, fontWeight: 900 }}>—</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Stats summary — flat 2-line, no card */}
              {stats && (
                <div style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 10 }}>
                  {/* Line 1: VOL · 1RM */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 }}>
                    <span style={{ color: '#999', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>VOL</span>
                    <span style={{ color: '#ff6b00', fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                      {stats.volume >= 1000 ? (stats.volume / 1000).toFixed(1) : stats.volume}
                    </span>
                    <span style={{ color: '#888', fontSize: 10, fontWeight: 700 }}>
                      {stats.volume >= 1000 ? 't' : 'kg'}
                    </span>
                    <span style={{ color: '#3a3a3a', fontSize: 11, fontWeight: 700, marginLeft: 3, marginRight: 3 }}>·</span>
                    <span style={{ color: '#999', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>1RM</span>
                    <span style={{ color: '#c09bff', fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                      {stats.est1rm}
                    </span>
                    <span style={{ color: '#888', fontSize: 10, fontWeight: 700 }}>kg</span>
                  </div>
                  {/* Line 2: BEST SET */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ color: '#999', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>BEST SET</span>
                    <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                      {stats.bestWeight} × {stats.bestReps}
                    </span>
                  </div>
                </div>
              )}

              {/* + SET */}
              <button
                className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] font-black tracking-widest"
                style={{ color: '#ff6b00', borderTop: '1px solid rgba(255,255,255,0.09)' }}
                onClick={() => addSet(ex.id)}>
                <Plus size={10} strokeWidth={3} />
                SET
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
          background: 'linear-gradient(to top, #080808 65%, transparent)',
        }}>
        <div className="flex gap-2.5">
          <button
            className="flex-1 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 tracking-widest"
            style={{ background: 'rgba(255,106,0,0.05)', color: '#ff6a00', border: '1px solid rgba(255,106,0,0.45)' }}
            onClick={() => setShowPicker(true)}>
            <Plus size={16} strokeWidth={2.5} />
            EXERCISE
          </button>
          {displaySetsCount > 0 && (
            <button
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white tracking-widest"
              style={{ background: saving ? '#333' : '#ff6b00', boxShadow: saving ? 'none' : '0 4px 20px rgba(255,107,0,0.35)' }}
              disabled={saving}
              onClick={handleFinish}>
              {saving ? 'SAVING...' : isEditing ? `UPDATE ${displaySetsCount} SETS` : `FINISH ${displaySetsCount} SETS`}
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showPicker && (
        <ExercisePicker exercises={allExercises} onSelect={addExercise} onClose={() => setShowPicker(false)} />
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
          <div className="w-full rounded-3xl p-6" style={{ background: '#131313', border: '1px solid rgba(255,255,255,0.14)' }}>
            <p className="text-xl font-black text-white text-center mb-1 tracking-wide">LEAVE?</p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#aaa' }}>
              {isEditing ? 'Changes will not be saved' : 'Your entries will not be saved'}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#1e1e1e', color: '#aaa', border: '1px solid rgba(255,255,255,0.12)' }}
                onClick={() => setShowCancelConfirm(false)}>KEEP GOING</button>
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={() => router.push('/home')}>LEAVE</button>
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
  const color = !active ? '#555' : accent ? '#ff6b00' : purple ? '#c09bff' : '#fff'
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-1">
      <p className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: '#aaa' }}>{label}</p>
      <p className="text-2xl font-black" style={{ color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function PRPill({ status }: { status: PRStatus }) {
  if (status.type === 'first') {
    return (
      <span className="px-2 py-1 rounded-full text-[9px] font-black tracking-widest"
        style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
        FIRST LOG
      </span>
    )
  }
  if (status.type === 'new_pr') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black"
        style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.4)', boxShadow: '0 0 10px rgba(255,107,0,0.18)' }}>
        🔥 NEW PR +{status.gap}kg
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-full text-[9px] font-black tracking-widest"
      style={{ background: '#161616', color: '#444', border: '1px solid #222' }}>
      -{status.gap}kg
    </span>
  )
}
