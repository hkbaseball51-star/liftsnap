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
      trained_at: new Date().toISOString().split('T')[0],
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
