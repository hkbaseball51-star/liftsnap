'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, Minus, Camera, ImageIcon } from 'lucide-react'
import { createSessionForDate, saveFullSession, getExercisePR } from '@/actions/workout'
import { upsertBodyWeight } from '@/actions/bodyWeight'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import NumberInputSheet from './NumberInputSheet'
import NoteInputSheet from './NoteInputSheet'
import RestTimerSheet from './RestTimerSheet'
import WorkoutPhotoSheet from '@/components/photo/WorkoutPhotoSheet'
import { formatVolume } from '@/lib/utils'
import { parseFlexibleNumber } from '@/lib/number'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, fromDisplayWeight, formatVolumeWithUnit, weightUnitLabel } from '@/lib/units'
import { t, type Locale } from '@/lib/i18n'
import { getDisplayName } from '@/lib/exerciseNames'

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
  note: string
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
  note?: string | null
  sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[]
}

type Props = {
  date: string                      // YYYY-MM-DD
  existingSessionId?: string
  existingExercises?: InitialExercise[]
  existingTitle?: string
}

/* ─── Pure helpers ────────────────────────────────────── */

function uid() { return Math.random().toString(36).slice(2) }

function getDefaultTitle(locale: Locale): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return t(locale, 'record.morningSession')
  if (h >= 11 && h < 17) return t(locale, 'record.afternoonSession')
  if (h >= 17 && h < 21) return t(locale, 'record.eveningSession')
  return t(locale, 'record.nightSession')
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

/* ─── ExerciseCard (memoized) ─────────────────────────── */

type ExerciseCardProps = {
  ex: ExerciseEntry
  weightUnit: import('@/lib/units').WeightUnit
  onAddSet: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onRemoveSet: (exerciseId: string, setId: string) => void
  onSetTarget: (target: NumberTarget) => void
  onNoteTarget: (exerciseId: string) => void
}

const ExerciseCard = memo(function ExerciseCard({
  ex, weightUnit, onAddSet, onRemoveExercise, onRemoveSet, onSetTarget, onNoteTarget,
}: ExerciseCardProps) {
  const { locale } = useLocale()
  const stats = useMemo(() => calcExerciseStats(ex), [ex])
  const prStatus = useMemo(
    () => stats ? calcPRStatus(stats.maxWeightToday, ex.allTimePR) : null,
    [stats, ex.allTimePR]
  )
  const isNewPR = prStatus?.type === 'new_pr'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: '#131313',
        border: isNewPR ? '1px solid rgba(237, 116, 47,0.40)' : '1px solid rgba(255,255,255,0.13)',
        boxShadow: isNewPR ? '0 0 18px rgba(237, 116, 47,0.10)' : 'none',
      }}>

      {/* Exercise header */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="w-0.5 self-stretch rounded-full flex-shrink-0"
          style={{ background: isNewPR ? '#ED742F' : '#3a3a3a' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight truncate">{getDisplayName(ex.name, locale)}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-black tracking-wider" style={{ color: '#ED742F' }}>
              {ex.muscle_group}
            </span>
            {ex.allTimePR !== null ? (
              <span className="text-[10px] font-bold" style={{ color: '#888' }}>
                · PR {toDisplayWeight(ex.allTimePR, weightUnit)}{weightUnitLabel(weightUnit)}
              </span>
            ) : (
              <span className="px-1.5 py-px rounded-full text-[8px] font-black tracking-widest"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.10)' }}>
                FIRST LOG
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onRemoveExercise(ex.id)} className="p-1 flex-shrink-0">
          <X size={14} style={{ color: '#555' }} />
        </button>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-12 gap-1.5 px-3 pt-1 pb-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <span className="col-span-2 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>#</span>
        <span className="col-span-4 text-center text-[8px] font-black tracking-widest" style={{ color: '#aaa' }}>{weightUnitLabel(weightUnit).toUpperCase()}</span>
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
                  onClick={() => onRemoveSet(ex.id, set.id)}>
                  <Minus size={8} style={{ color: 'rgba(255,100,100,0.9)' }} />
                </button>
              ) : (
                <div className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{
                  background: isBestSet ? 'rgba(237, 116, 47,0.15)' : '#222',
                  color: isBestSet ? '#ff7a1a' : '#888',
                  fontFamily: 'var(--font-mono)',
                  border: isBestSet ? '1px solid rgba(237, 116, 47,0.55)' : '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0,
                }}>
                {set.set_number}
              </span>
            </div>

            {/* KG input */}
            <button
              className="col-span-4 active:scale-95 transition-transform"
              style={{
                height: 40, borderRadius: 10,
                background: '#1e1e1e',
                border: '1px solid rgba(255,255,255,0.11)',
                color: set.weight_kg !== null ? '#fff' : '#6a6a6a',
                fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => onSetTarget({ exerciseId: ex.id, setId: set.id, field: 'weight_kg' })}>
              {set.weight_kg !== null ? toDisplayWeight(set.weight_kg, weightUnit) : '—'}
            </button>

            {/* REPS input */}
            <button
              className="col-span-3 active:scale-95 transition-transform"
              style={{
                height: 40, borderRadius: 10,
                background: '#1e1e1e',
                border: '1px solid rgba(255,255,255,0.11)',
                color: set.reps !== null ? '#fff' : '#6a6a6a',
                fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => onSetTarget({ exerciseId: ex.id, setId: set.id, field: 'reps' })}>
              {set.reps ?? '—'}
            </button>

            {/* Set 1RM — orange for best set, gray otherwise. Never purple. */}
            <div className="col-span-3 flex items-center justify-center">
              {setEst1rm !== null ? (
                <span style={{ color: isBestSet ? '#ED742F' : '#666', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {toDisplayWeight(setEst1rm, weightUnit)}{weightUnitLabel(weightUnit)}
                </span>
              ) : (
                <span style={{ color: '#444', fontSize: 13, fontWeight: 700 }}>—</span>
              )}
            </div>
          </div>
        )
      })}

      {/* Stats summary — single line */}
      {stats && (
        <div style={{ padding: '5px 14px 9px' }}>
          <p style={{ fontSize: 11, lineHeight: 1 }}>
            <span style={{ color: '#666', fontWeight: 500 }}>Volume </span>
            <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
              {formatVolumeWithUnit(stats.volume, weightUnit)}
            </span>
            <span style={{ color: '#555', fontWeight: 500 }}> · Est. 1RM </span>
            <span style={{ color: isNewPR ? '#ED742F' : 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
              {toDisplayWeight(stats.est1rm, weightUnit)}{weightUnitLabel(weightUnit)}
            </span>
            <span style={{ color: '#555', fontWeight: 500 }}> · Best </span>
            <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
              {toDisplayWeight(stats.bestWeight, weightUnit)}×{stats.bestReps}
            </span>
          </p>
        </div>
      )}

      {/* + SET */}
      <button
        className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] font-black tracking-widest"
        style={{ color: '#ED742F', borderTop: '1px solid rgba(255,255,255,0.40)' }}
        onClick={() => onAddSet(ex.id)}>
        <Plus size={10} strokeWidth={3} />
        SET
      </button>

      {/* Note */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.13)', padding: '7px 12px 10px' }}>
        {ex.note ? (
          <button
            className="w-full text-left active:opacity-70 transition-opacity"
            onClick={() => onNoteTarget(ex.id)}>
            <div className="flex items-start gap-2"
              style={{ borderRadius: 10, background: 'rgba(255,255,255,0.09)', padding: '7px 10px' }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📝</span>
              <p style={{
                fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {ex.note}
              </p>
            </div>
          </button>
        ) : (
          <button
            className="active:opacity-70 transition-opacity"
            onClick={() => onNoteTarget(ex.id)}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.47)' }}>
              {t(locale, 'record.addNote')}
            </span>
          </button>
        )}
      </div>
    </div>
  )
})

/* ─── Main component ──────────────────────────────────── */

export default function WorkoutRecorder({
  date,
  existingSessionId,
  existingExercises,
  existingTitle,
}: Props) {
  const router = useRouter()
  const { locale } = useLocale()
  const { unit: weightUnit } = useWeightUnit()
  const isEditing = !!existingSessionId && (existingExercises?.length ?? 0) > 0
  const todayJST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const isToday = date === todayJST

  const [sessionId, setSessionId] = useState<string | null>(existingSessionId ?? null)
  const [title, setTitle] = useState(() => existingTitle?.trim() ? existingTitle : getDefaultTitle(locale))
  const [editingTitle, setEditingTitle] = useState(false)
  const [exerciseList, setExerciseList] = useState<ExerciseEntry[]>(() =>
    (existingExercises ?? []).map(ex => ({
      id: uid(),
      name: ex.name,
      muscle_group: ex.muscle_group,
      allTimePR: null,
      note: ex.note ?? '',
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
  const [noteTarget, setNoteTarget] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  const [showRestSheet, setShowRestSheet] = useState(false)
  const [restPreset, setRestPreset] = useState(120)
  const [restRemaining, setRestRemaining] = useState<number | null>(null)
  const [restDone, setRestDone] = useState(false)

  const [showPhotoSheet, setShowPhotoSheet] = useState(false)
  const [hasPhotoRecorded, setHasPhotoRecorded] = useState(false)

  const [bwInput, setBwInput]   = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [bwSaved,  setBwSaved]  = useState(false)

  const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
  const isDateToday = date === todayStr

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

  // Rest timer countdown
  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return
    const id = setTimeout(() => setRestRemaining(r => (r ?? 1) - 1), 1000)
    return () => clearTimeout(id)
  }, [restRemaining])

  // Rest timer done
  useEffect(() => {
    if (restRemaining !== 0) return
    setRestRemaining(null)
    setRestDone(true)
    const id = setTimeout(() => setRestDone(false), 3000)
    return () => clearTimeout(id)
  }, [restRemaining])

  /* ── Memoized derived values ── */

  const displayVolume = useMemo(() =>
    Math.round(exerciseList.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) =>
        s + (set.weight_kg !== null && set.reps !== null ? set.weight_kg * set.reps : 0), 0), 0)),
    [exerciseList])

  const displaySetsCount = useMemo(() =>
    exerciseList.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.weight_kg !== null && s.reps !== null).length, 0),
    [exerciseList])

  const bestSessionEst1rm = useMemo(() =>
    exerciseList.reduce((best, ex) => {
      const s = calcExerciseStats(ex)
      return (s?.est1rm ?? 0) > best ? s!.est1rm : best
    }, 0),
    [exerciseList])

  const currentTarget = useMemo(() => {
    if (!numberTarget) return null
    const ex = exerciseList.find(e => e.id === numberTarget.exerciseId)
    const s = ex?.sets.find(s => s.id === numberTarget.setId)
    const raw = s?.[numberTarget.field] ?? null
    if (raw === null) return null
    if (numberTarget.field === 'weight_kg') return toDisplayWeight(raw, weightUnit)
    return raw
  }, [numberTarget, exerciseList, weightUnit])

  const hasWorkoutContent = exerciseList.length > 0
  const isSavedState = !isDirty && sessionId !== null
  const canFinish = !saving && isDirty && displaySetsCount > 0

  const saveStatusDisplay = useMemo(() => {
    if (saving) return { text: t(locale, 'record.saving'), color: '#888' }
    if (isDirty) return { text: t(locale, 'record.unsavedChanges'), color: '#ff9500' }
    if (isEditing || sessionId) return { text: t(locale, 'record.saved'), color: '#22c55e' }
    return null
  }, [saving, isDirty, isEditing, sessionId, locale])

  /* ── Stable callbacks (useCallback so React.memo on ExerciseCard works) ── */

  const addSet = useCallback((exerciseId: string) => {
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
    setIsDirty(true)
  }, [])

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setExerciseList(prev => prev.flatMap(ex => {
      if (ex.id !== exerciseId) return [ex]
      const newSets = ex.sets.filter(s => s.id !== setId)
        .map((s, i) => ({ ...s, set_number: i + 1 }))
      if (newSets.length === 0) return []
      return [{ ...ex, sets: newSets }]
    }))
    setIsDirty(true)
  }, [])

  const removeExercise = useCallback((id: string) => {
    setExerciseList(prev => prev.filter(ex => ex.id !== id))
    setIsDirty(true)
  }, [])

  const updateSet = useCallback((exerciseId: string, setId: string, field: 'weight_kg' | 'reps', value: number) => {
    setExerciseList(prev => prev.map(ex =>
      ex.id !== exerciseId ? ex :
      { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
    ))
    setIsDirty(true)
  }, [])

  const handleSetTarget = useCallback((target: NumberTarget) => setNumberTarget(target), [])

  const updateNote = useCallback((exerciseId: string, note: string) => {
    setExerciseList(prev => prev.map(ex =>
      ex.id === exerciseId ? { ...ex, note } : ex
    ))
    setIsDirty(true)
  }, [])

  const handleNoteTarget = useCallback((exerciseId: string) => setNoteTarget(exerciseId), [])

  /* ── Exercise addition: optimistic (instant UI, session creation in background) ── */

  const addExercise = (exercise: Exercise) => {
    // Update UI immediately — no await
    setExerciseList(prev => [...prev, {
      id: uid(),
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      allTimePR: null,
      note: '',
      sets: [{ id: uid(), set_number: 1, weight_kg: null, reps: null }],
    }])
    setIsDirty(true)
    setShowPicker(false)
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Fetch PR in background — does not block UI
    getExercisePR(exercise.name).then(pr => {
      if (pr !== null) {
        setExerciseList(prev => prev.map(ex =>
          ex.name === exercise.name && ex.allTimePR === null ? { ...ex, allTimePR: pr } : ex
        ))
      }
    })
  }

  /* ── Body weight (optional) ── */

  const handleBwSave = async () => {
    const v = parseFlexibleNumber(bwInput)
    const maxBw = weightUnit === 'lbs' ? 661 : 300
    if (v === null || v <= 0 || v > maxBw) return
    setBwSaving(true)
    try {
      await upsertBodyWeight(fromDisplayWeight(v, weightUnit))
      setBwSaved(true)
      setTimeout(() => setBwSaved(false), 2500)
    } catch { /* silent */ } finally { setBwSaving(false) }
  }

  /* ── Finish / save ── */

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
            note: ex.note || null,
          }))
      )
      await saveFullSession(sid, title, setsToSave)
      setIsDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 px-4 pt-14"
        style={{ background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.13)' }}>

        {/* Rest timer banner */}
        {(restRemaining !== null || restDone) && (
          <div
            className="-mx-4 px-4 flex items-center justify-between py-1.5 mb-1"
            style={{
              background: restDone ? 'rgba(34,197,94,0.07)' : 'rgba(237, 116, 47,0.07)',
              borderBottom: `1px solid ${restDone ? 'rgba(34,197,94,0.12)' : 'rgba(237, 116, 47,0.12)'}`,
            }}>
            {restDone ? (
              <span className="text-[11px] font-black tracking-wider" style={{ color: '#22c55e' }}>
                ✓ {t(locale, 'record.restDone')}
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: '#ED742F' }}>⏱</span>
                  <span
                    className="text-sm font-black tracking-widest"
                    style={{ color: '#ED742F', fontFamily: 'var(--font-mono)' }}>
                    {Math.floor((restRemaining ?? 0) / 60)}:{String((restRemaining ?? 0) % 60).padStart(2, '0')}
                  </span>
                </div>
                <button
                  className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: '#555', background: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.40)' }}
                  onClick={() => setRestRemaining(null)}>
                  {t(locale, 'record.restSkip')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Row 1: X | date · title | spacer */}
        <div className="flex items-center justify-between pb-1.5">
          <button
            className="p-1 -ml-1 flex-shrink-0"
            onClick={() => isDirty ? setShowCancelConfirm(true) : router.push('/home')}>
            <X size={18} style={{ color: '#555' }} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <span style={{ fontSize: 11, fontWeight: 600, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatDateLabel(date)}
            </span>
            <span style={{ color: '#333', flexShrink: 0 }}>·</span>
            {editingTitle ? (
              <input autoFocus value={title}
                onChange={e => { setTitle(e.target.value); setIsDirty(true) }}
                onBlur={() => { if (!title.trim()) setTitle(getDefaultTitle(locale)); setEditingTitle(false) }}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                className="text-sm font-black text-white bg-transparent outline-none min-w-0"
                style={{ borderBottom: '1px solid #ED742F', maxWidth: 160 }}
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1 min-w-0">
                <span className="text-sm font-black text-white truncate" style={{ maxWidth: 150 }}>{title}</span>
                <Pencil size={9} style={{ color: '#444', flexShrink: 0 }} />
              </button>
            )}
          </div>
          <div className="flex-shrink-0 w-9" />
        </div>

        {/* Row 2: stats summary + save status */}
        <div className="flex items-center justify-between pb-2">
          <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.54)' }}>
            {[
              displayVolume > 0 ? formatVolumeWithUnit(displayVolume, weightUnit) : null,
              displaySetsCount > 0 ? `${displaySetsCount} sets` : null,
              bestSessionEst1rm > 0 ? `1RM ${toDisplayWeight(bestSessionEst1rm, weightUnit)}${weightUnitLabel(weightUnit)}` : null,
            ].filter(Boolean).join(' · ') || '—'}
          </p>
          {saveStatusDisplay && (
            <p style={{ fontSize: 10, fontWeight: 600, color: saveStatusDisplay.color, flexShrink: 0, marginLeft: 8 }}>
              {saveStatusDisplay.text}
            </p>
          )}
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-3"
        style={{ paddingBottom: 'calc(10rem + env(safe-area-inset-bottom))' }}>

        {exerciseList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">{isEditing ? '✏️' : '⚡'}</div>
            <p className="text-base font-black text-white mb-2 tracking-wide">
              {isEditing ? t(locale, 'record.editSession') : t(locale, 'record.buildEffort')}
            </p>
            <p className="text-xs font-bold" style={{ color: '#777' }}>{t(locale, 'record.addExercise')}</p>
          </div>
        )}

        {exerciseList.map(ex => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            weightUnit={weightUnit}
            onAddSet={addSet}
            onRemoveExercise={removeExercise}
            onRemoveSet={removeSet}
            onSetTarget={handleSetTarget}
            onNoteTarget={handleNoteTarget}
          />
        ))}

        <div ref={listEndRef} />

        {/* Body weight — optional, today only */}
        {isDateToday && (
          <div className="pt-1 pb-1">
            <div className="rounded-xl px-3 py-2.5"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#4a4a4a', marginBottom: 8 }}>
                BODY WEIGHT · OPTIONAL
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={weightUnit === 'lbs' ? '154.0' : '70.0'}
                  value={bwInput}
                  onChange={e => setBwInput(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm font-bold outline-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 2 }}
                />
                <span style={{ fontSize: 11, color: '#555' }}>{weightUnitLabel(weightUnit)}</span>
                <button
                  disabled={!bwInput || bwSaving}
                  onClick={handleBwSave}
                  className="px-3 py-1 rounded-lg text-[10px] font-black tracking-wider"
                  style={{
                    background: bwSaved ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                    color: bwSaved ? '#22c55e' : '#555',
                    border: `1px solid ${bwSaved ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.09)'}`,
                  }}>
                  {bwSaved ? '✓' : bwSaving ? '...' : 'LOG'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed inset-x-0 z-40 px-4 py-3"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #080808 70%, transparent)',
        }}>
        {/* Rest button */}
        <div className="flex justify-end mb-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
            style={{
              background: restRemaining !== null ? 'rgba(237, 116, 47,0.1)' : 'rgba(255,255,255,0.04)',
              color: restRemaining !== null ? '#ED742F' : '#555',
              border: `1px solid ${restRemaining !== null ? 'rgba(237, 116, 47,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}
            onClick={() => setShowRestSheet(true)}>
            ⏱{' '}{t(locale, 'record.rest')}{' '}
            {restRemaining !== null
              ? `${Math.floor(restRemaining / 60)}:${String(restRemaining % 60).padStart(2, '0')}`
              : `${Math.floor(restPreset / 60)}:${String(restPreset % 60).padStart(2, '0')}`}
          </button>
        </div>

        <div className="flex gap-2.5">
          <button
            className="flex-1 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
            style={{ background: 'rgba(237, 116, 47,0.10)', color: '#ED742F', border: '1px solid rgba(237, 116, 47,0.4)' }}
            onClick={() => setShowPicker(true)}>
            <Plus size={15} strokeWidth={2.5} />
            {t(locale, 'record.addExerciseBtn')}
          </button>
          {hasWorkoutContent && (
            <button
              className="flex-1 py-3.5 rounded-2xl text-sm font-black"
              style={{
                background: canFinish
                  ? '#ED742F'
                  : isSavedState
                    ? 'rgba(34,197,94,0.12)'
                    : 'rgba(237, 116, 47,0.22)',
                color: canFinish
                  ? '#fff'
                  : isSavedState
                    ? '#22c55e'
                    : 'rgba(255,255,255,0.42)',
                border: isSavedState ? '1px solid rgba(34,197,94,0.25)' : 'none',
                boxShadow: canFinish ? '0 4px 20px rgba(237, 116, 47,0.3)' : 'none',
                transition: 'background 200ms, color 200ms, box-shadow 200ms',
              }}
              disabled={!canFinish}
              onClick={handleFinish}>
              {saving
                ? t(locale, 'record.savingBtn')
                : isSavedState
                  ? t(locale, 'record.savedBtn')
                  : t(locale, 'record.saveBtn')}
            </button>
          )}
        </div>

        {/* Photo button — hidden for MVP (code preserved for re-enabling) */}
        {false && isSavedState && isDateToday && sessionId && (
          <div className="mt-2">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl active:opacity-75 transition-opacity"
              style={{
                background: hasPhotoRecorded ? 'rgba(237, 116, 47,0.10)' : 'rgba(237, 116, 47,0.10)',
                border: hasPhotoRecorded ? '1px solid rgba(237, 116, 47,0.35)' : '1px solid rgba(237, 116, 47,0.45)',
              }}
              onClick={() => setShowPhotoSheet(true)}>
              {hasPhotoRecorded
                ? <ImageIcon size={13} style={{ color: '#ED742F' }} />
                : <Camera size={13} style={{ color: '#ED742F' }} />
              }
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: hasPhotoRecorded ? '#ED742F' : '#E8E8E8',
              }}>
                {hasPhotoRecorded
                  ? t(locale, 'photo.viewPhoto')
                  : t(locale, 'photo.addBodyPhoto')
                }
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showPicker && (
        <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />
      )}

      {numberTarget && (
        <NumberInputSheet
          label={numberTarget.field === 'weight_kg' ? `WEIGHT (${weightUnitLabel(weightUnit)})` : 'REPS'}
          value={currentTarget}
          unit={numberTarget.field === 'weight_kg' ? weightUnitLabel(weightUnit) : 'reps'}
          step={numberTarget.field === 'weight_kg' ? (weightUnit === 'lbs' ? 5 : 2.5) : 1}
          quickSteps={
            numberTarget.field === 'weight_kg'
              ? weightUnit === 'lbs'
                ? [-2.5, -5, 5, 2.5, -10, 10, -25, 25, -45, 45]
                : [-1.25, -2.5, 2.5, 1.25, -5, 5, -10, 10]
              : [-2, -1, 1, 2]
          }
          isInteger={numberTarget.field === 'reps'}
          onConfirm={v => {
            const stored = numberTarget.field === 'weight_kg' ? fromDisplayWeight(v, weightUnit) : v
            updateSet(numberTarget.exerciseId, numberTarget.setId, numberTarget.field, stored)
          }}
          onClose={() => setNumberTarget(null)}
        />
      )}

      {noteTarget && (
        <NoteInputSheet
          value={exerciseList.find(ex => ex.id === noteTarget)?.note ?? ''}
          onSave={note => updateNote(noteTarget, note)}
          onClose={() => setNoteTarget(null)}
        />
      )}

      {showRestSheet && (
        <RestTimerSheet
          defaultSeconds={restPreset}
          onStart={s => { setRestPreset(s); setRestRemaining(s); setRestDone(false) }}
          onClose={() => setShowRestSheet(false)}
        />
      )}

      {showPhotoSheet && sessionId && (
        <WorkoutPhotoSheet
          sessionId={sessionId}
          sessionDate={date}
          todayStr={todayStr}
          onClose={() => setShowPhotoSheet(false)}
          onPhotoSaved={() => setHasPhotoRecorded(true)}
          onPhotoDeleted={() => setHasPhotoRecorded(false)}
        />
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="w-full rounded-3xl p-6" style={{ background: '#131313', border: '1px solid rgba(255,255,255,0.21)' }}>
            <p className="text-xl font-black text-white text-center mb-1 tracking-wide">{t(locale, 'record.cancelTitle')}</p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#aaa' }}>
              {isEditing ? t(locale, 'record.cancelSubEditing') : t(locale, 'record.cancelSub')}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#1e1e1e', color: '#aaa', border: '1px solid rgba(255,255,255,0.19)' }}
                onClick={() => setShowCancelConfirm(false)}>{t(locale, 'record.keepGoing')}</button>
              <button className="flex-1 py-4 rounded-2xl text-sm font-black tracking-widest"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={() => { setShowCancelConfirm(false); router.push('/home') }}>{t(locale, 'record.leave')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

