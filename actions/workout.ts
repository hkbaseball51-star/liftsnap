'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSession(title: string, bodyWeightKg?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      title,
      body_weight_kg: bodyWeightKg ?? null,
      trained_at: new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function completeSession(
  sessionId: string,
  sets: {
    exercise_name: string
    muscle_group: string
    set_number: number
    weight_kg: number | null
    reps: number | null
  }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
    0
  )

  const start = Date.now()
  if (sets.length > 0) {
    const { error: setsError } = await supabase.from('workout_sets').insert(
      sets.map(s => ({ ...s, session_id: sessionId, is_completed: true }))
    )
    if (setsError) throw new Error(setsError.message)
  }

  const durationSeconds = Math.round((Date.now() - start) / 1000)

  await supabase
    .from('workout_sessions')
    .update({
      total_volume_kg: totalVolume,
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  revalidatePath('/home')
  return { totalVolume }
}

export async function cancelSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)
}

export async function getLastSetsForExercise(exerciseName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: lastSession } = await supabase
    .from('workout_sets')
    .select('session_id, weight_kg, reps, set_number')
    .eq('user_id_join:workout_sessions.user_id', user.id)
    .eq('exercise_name', exerciseName)
    .order('created_at', { ascending: false })
    .limit(10)

  return lastSession ?? []
}

export async function getUserExercises() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, is_custom')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name')

  return data ?? []
}

export async function createCustomExercise(
  name: string,
  muscleGroup: string,
  equipment?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: user.id,
      name,
      muscle_group: muscleGroup,
      equipment: equipment ?? null,
      is_custom: true,
    })
    .select('id, name, muscle_group, equipment, is_custom')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getRecentSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workout_sessions')
    .select('id, title, trained_at, total_volume_kg')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('trained_at', { ascending: false })
    .limit(5)

  return data ?? []
}

export async function getExercisePR(exerciseName: string): Promise<number | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_sets')
    .select('weight_kg')
    .eq('exercise_name', exerciseName)
    .eq('is_completed', true)
    .not('weight_kg', 'is', null)
    .order('weight_kg', { ascending: false })
    .limit(1)
    .single()

  return data?.weight_kg ?? null
}

export async function getSessionForShare(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, title, trained_at, total_volume_kg')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, set_number, weight_kg, reps, is_completed')
    .eq('session_id', sessionId)
    .eq('is_completed', true)

  const exerciseMap = new Map<string, number>()
  sets?.forEach(s => {
    exerciseMap.set(s.exercise_name, (exerciseMap.get(s.exercise_name) ?? 0) + 1)
  })

  return {
    id: session.id,
    title: session.title ?? 'ワークアウト',
    date: session.trained_at,
    volume: session.total_volume_kg ?? 0,
    setsCount: sets?.length ?? 0,
    exercises: Array.from(exerciseMap.entries()).map(([name, count]) => ({ name, sets: count })),
  }
}

/* ─── Date-aware session actions ────────────────────── */

export async function createSessionForDate(date: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: user.id, title, trained_at: date })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function getSessionForDate(date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('trained_at', date)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('id, exercise_name, muscle_group, set_number, weight_kg, reps')
    .eq('session_id', session.id)
    .order('set_number')

  const exerciseMap = new Map<string, {
    muscle_group: string
    sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[]
  }>()

  for (const s of sets ?? []) {
    if (!exerciseMap.has(s.exercise_name)) {
      exerciseMap.set(s.exercise_name, { muscle_group: s.muscle_group, sets: [] })
    }
    exerciseMap.get(s.exercise_name)!.sets.push({
      id: s.id,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
    })
  }

  return {
    id: session.id as string,
    title: (session.title ?? '') as string,
    exercises: Array.from(exerciseMap.entries()).map(([name, d]) => ({
      name,
      muscle_group: d.muscle_group,
      sets: d.sets,
    })),
  }
}

export async function saveFullSession(
  sessionId: string,
  title: string,
  sets: {
    exercise_name: string
    muscle_group: string
    set_number: number
    weight_kg: number | null
    reps: number | null
  }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('workout_sets').delete().eq('session_id', sessionId)

  if (sets.length > 0) {
    const { error } = await supabase.from('workout_sets').insert(
      sets.map(s => ({ ...s, session_id: sessionId, is_completed: true }))
    )
    if (error) throw new Error(error.message)
  }

  const totalVolume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)

  await supabase
    .from('workout_sessions')
    .update({ title, total_volume_kg: totalVolume, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  revalidatePath('/home')
}

export async function getLastSessionSets(sessionTitle: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('title', sessionTitle)
    .not('completed_at', 'is', null)
    .order('trained_at', { ascending: false })
    .limit(1)
    .single()

  if (!session) return []

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, set_number, weight_kg, reps')
    .eq('session_id', session.id)
    .order('set_number')

  return sets ?? []
}

export async function getTodayWorkoutForShare(date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, title, trained_at, total_volume_kg')
    .eq('user_id', user.id)
    .eq('trained_at', date)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, weight_kg, reps, is_completed')
    .eq('session_id', session.id)
    .eq('is_completed', true)

  const exerciseMap = new Map<string, { muscle_group: string; sets: number; best1RM: number; bestWeight: number; bestReps: number }>()
  sets?.forEach(s => {
    if (!exerciseMap.has(s.exercise_name))
      exerciseMap.set(s.exercise_name, { muscle_group: s.muscle_group, sets: 0, best1RM: 0, bestWeight: 0, bestReps: 0 })
    const ex = exerciseMap.get(s.exercise_name)!
    ex.sets++
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    const e1rm = w * (1 + r / 30)
    if (e1rm > ex.best1RM) { ex.best1RM = e1rm; ex.bestWeight = w; ex.bestReps = r }
  })

  let bestLiftName = '', bestLift1RM = 0, bestLiftWeight = 0
  exerciseMap.forEach((v, k) => {
    if (v.best1RM > bestLift1RM) { bestLift1RM = v.best1RM; bestLiftWeight = v.bestWeight; bestLiftName = k }
  })

  const muscleCount = new Map<string, number>()
  sets?.forEach(s => {
    if (s.muscle_group) muscleCount.set(s.muscle_group, (muscleCount.get(s.muscle_group) ?? 0) + 1)
  })
  let muscleFocus = '', maxMuscleCount = 0
  muscleCount.forEach((count, muscle) => {
    if (count > maxMuscleCount) { maxMuscleCount = count; muscleFocus = muscle }
  })

  const totalVolume = sets?.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0) ?? 0

  return {
    title: (session.title ?? "Today's Workout") as string,
    date: session.trained_at as string,
    volume: totalVolume,
    setsCount: sets?.length ?? 0,
    exercises: Array.from(exerciseMap.entries()).map(([name, d]) => ({
      name, sets: d.sets, bestWeight: d.bestWeight, bestReps: d.bestReps,
    })),
    bestLift: bestLiftName ? { name: bestLiftName, weight: bestLiftWeight } : null,
    muscleFocus: muscleFocus || null,
  }
}
