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
    .select('exercise_name, muscle_group, session_id')
    .eq('is_completed', true)

  if (!data?.length) return []

  const seen = new Map<string, { muscle_group: string; sessions: Set<string> }>()
  data.forEach(s => {
    if (!seen.has(s.exercise_name)) {
      seen.set(s.exercise_name, { muscle_group: s.muscle_group ?? '', sessions: new Set() })
    }
    if (s.session_id) seen.get(s.exercise_name)!.sessions.add(String(s.session_id))
  })

  return Array.from(seen.entries()).map(([name, { muscle_group, sessions }]) => ({
    name,
    muscle_group,
    logCount: sessions.size,
  }))
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

export async function getExercise1RMData(exerciseName: string) {
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
    .select('session_id, weight_kg, reps')
    .eq('exercise_name', exerciseName)
    .in('session_id', sessions.map(s => s.id))
    .gt('weight_kg', 0)
    .gt('reps', 0)

  if (!sets?.length) return []

  const est1rmBySession = new Map<string, number>()
  sets.forEach(s => {
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    const est = r === 1 ? w : Math.round(w * (1 + r / 30))
    const cur = est1rmBySession.get(s.session_id) ?? 0
    if (est > cur) est1rmBySession.set(s.session_id, est)
  })

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return sessions
    .filter(s => est1rmBySession.has(s.id))
    .map(s => {
      const d = new Date(s.trained_at)
      return {
        date: s.trained_at,
        label: `${months[d.getMonth()]} ${d.getDate()}`,
        est1rm: est1rmBySession.get(s.id)!,
      }
    })
}

export async function getExerciseDailyVolumeData(exerciseName: string) {
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
    .select('session_id, weight_kg, reps')
    .eq('exercise_name', exerciseName)
    .in('session_id', sessions.map(s => s.id))
    .gt('weight_kg', 0)
    .gt('reps', 0)

  if (!sets?.length) return []

  const sessionDateMap = new Map(sessions.map(s => [s.id, s.trained_at]))
  const volumeByDate = new Map<string, number>()

  sets.forEach(s => {
    const date = sessionDateMap.get(s.session_id)
    if (!date) return
    const vol = (s.weight_kg ?? 0) * (s.reps ?? 0)
    volumeByDate.set(date, (volumeByDate.get(date) ?? 0) + vol)
  })

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return Array.from(volumeByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volume]) => {
      const d = new Date(date)
      return {
        date,
        label: `${months[d.getMonth()]} ${d.getDate()}`,
        volume: Math.round(volume),
      }
    })
}

export async function getStatsForShare(metric: string, exercise?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (metric === 'max1rm' && exercise) {
    const rm = await getExercise1RMData(exercise)
    if (!rm.length) return null
    const bestRM = Math.max(...rm.map(d => d.est1rm))
    const bestEntry = rm.find(d => d.est1rm === bestRM)!

    const { data: sess } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('trained_at', bestEntry.date)
      .not('completed_at', 'is', null)

    let bestSet: { weight: number; reps: number } | null = null
    if (sess?.length) {
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('weight_kg, reps')
        .eq('exercise_name', exercise)
        .in('session_id', sess.map(s => s.id))
        .gt('weight_kg', 0)
        .gt('reps', 0)
      if (sets?.length) {
        const b = sets.reduce((prev, s) => {
          const e = (s.reps ?? 0) === 1 ? (s.weight_kg ?? 0) : Math.round((s.weight_kg ?? 0) * (1 + (s.reps ?? 0) / 30))
          const pe = (prev.reps ?? 0) === 1 ? (prev.weight_kg ?? 0) : Math.round((prev.weight_kg ?? 0) * (1 + (prev.reps ?? 0) / 30))
          return e > pe ? s : prev
        })
        bestSet = { weight: b.weight_kg!, reps: b.reps! }
      }
    }
    return {
      type: 'max1rm' as const,
      exerciseName: exercise,
      bestRM,
      bestDate: bestEntry.label,
      bestSet,
      history: rm,
      sessionCount: rm.length,
    }
  }

  if (metric === 'volume' && exercise) {
    const vol = await getExerciseDailyVolumeData(exercise)
    if (!vol.length) return null
    return {
      type: 'volume' as const,
      exerciseName: exercise,
      totalVolume: vol.reduce((s, d) => s + d.volume, 0),
      sessionCount: vol.length,
      history: vol.slice(-6),
    }
  }

  if (metric === 'bodyweight') {
    const bw = await getBodyWeightData(90)
    if (!bw.length) return null
    const latest = bw[bw.length - 1].weight
    return {
      type: 'bodyweight' as const,
      currentWeight: latest,
      change: bw.length >= 2 ? Math.round((latest - bw[0].weight) * 10) / 10 : 0,
      history: bw.slice(-6),
    }
  }

  return null
}
