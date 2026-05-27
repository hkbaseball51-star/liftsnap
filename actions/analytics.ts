'use server'

import { createClient } from '@/lib/supabase/server'

function toWeekStart(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export async function getWeeklyVolumeData(weeks = 12) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('trained_at, total_volume_kg')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .gte('trained_at', startDate.toISOString().split('T')[0])

  const weekMap = new Map<string, number>()
  sessions?.forEach(s => {
    const ws = toWeekStart(s.trained_at)
    weekMap.set(ws, (weekMap.get(ws) ?? 0) + (s.total_volume_kg ?? 0))
  })

  const result = []
  for (let i = 0; i < weeks; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (weeks - 1 - i) * 7)
    const ws = toWeekStart(d.toISOString().split('T')[0])
    const d2 = new Date(ws)
    result.push({
      week: ws,
      label: `${d2.getMonth() + 1}/${d2.getDate()}`,
      volume: Math.round(weekMap.get(ws) ?? 0),
    })
  }
  return result
}

export async function getBodyWeightData(days = 90) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('body_weights')
    .select('weight_kg, recorded_at')
    .eq('user_id', user.id)
    .gte('recorded_at', startDate.toISOString().split('T')[0])
    .order('recorded_at')

  return (data ?? []).map(r => {
    const d = new Date(r.recorded_at)
    return {
      date: r.recorded_at,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weight: r.weight_kg,
    }
  })
}

export async function getMaxPRData(exerciseName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, trained_at')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('trained_at')

  if (!sessions?.length) return []

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('session_id, weight_kg')
    .eq('exercise_name', exerciseName)
    .in('session_id', sessions.map(s => s.id))
    .gt('weight_kg', 0)

  if (!sets?.length) return []

  const maxBySession = new Map<string, number>()
  sets.forEach(s => {
    const cur = maxBySession.get(s.session_id) ?? 0
    if ((s.weight_kg ?? 0) > cur) maxBySession.set(s.session_id, s.weight_kg ?? 0)
  })

  return sessions
    .filter(s => maxBySession.has(s.id))
    .map(s => {
      const d = new Date(s.trained_at)
      return {
        date: s.trained_at,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        maxWeight: maxBySession.get(s.id)!,
      }
    })
}

export async function getExercisesWithHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group')
    .eq('is_completed', true)

  if (!data?.length) return []

  const seen = new Map<string, string>()
  data.forEach(s => {
    if (!seen.has(s.exercise_name)) seen.set(s.exercise_name, s.muscle_group ?? '')
  })

  return Array.from(seen.entries()).map(([name, mg]) => ({ name, muscle_group: mg }))
}

export async function saveBodyWeight(weightKg: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const today = new Date().toISOString().split('T')[0]
  await supabase.from('body_weights').upsert({
    user_id: user.id,
    weight_kg: weightKg,
    recorded_at: today,
  }, { onConflict: 'user_id,recorded_at' })
}
