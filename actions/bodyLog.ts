'use server'

import { createClient } from '@/lib/supabase/server'

export type BodyLogEntry = {
  date: string          // YYYY-MM-DD
  imagePath: string
  sessionId: string
  muscleGroup: string   // normalized top muscle
  mainExercise: string
  totalSets: number
  totalVolume: number
}

export async function getAllBodyLogEntries(): Promise<BodyLogEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. All photo logs
  const { data: photoLogs } = await supabase
    .from('workout_photo_logs')
    .select('workout_date, image_path, workout_session_id')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })

  if (!photoLogs || photoLogs.length === 0) return []

  const sessionIds = [...new Set(photoLogs.map((r: { workout_session_id: string }) => r.workout_session_id))]

  // 2. Sessions + sets in parallel
  const [sessionsRes, setsRes] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, trained_at')
      .in('id', sessionIds)
      .not('completed_at', 'is', null),
    supabase
      .from('workout_sets')
      .select('workout_session_id, exercise_name, muscle_group, weight_kg, reps')
      .in('workout_session_id', sessionIds),
  ])

  const sessions = (sessionsRes.data ?? []) as { id: string; trained_at: string }[]
  type SetRow = { workout_session_id: string; exercise_name: string; muscle_group: string; weight_kg: number | null; reps: number | null }
  const sets = (setsRes.data ?? []) as SetRow[]

  // Group sets by session
  const setsBySession = new Map<string, SetRow[]>()
  for (const s of sets) {
    if (!setsBySession.has(s.workout_session_id)) setsBySession.set(s.workout_session_id, [])
    setsBySession.get(s.workout_session_id)!.push(s)
  }

  // Build entry per photo log
  const entries: BodyLogEntry[] = []

  for (const photo of photoLogs as { workout_date: string; image_path: string; workout_session_id: string }[]) {
    const session = sessions.find(s => s.id === photo.workout_session_id)
    if (!session) continue

    const sessionSets = setsBySession.get(photo.workout_session_id) ?? []

    // Top muscle group by set count
    const mgMap = new Map<string, number>()
    const exMap = new Map<string, number>()
    let totalSets = 0
    let totalVolume = 0

    for (const s of sessionSets) {
      const mg = s.muscle_group?.toLowerCase()
      if (mg) mgMap.set(mg, (mgMap.get(mg) ?? 0) + 1)
      const ex = s.exercise_name
      if (ex) exMap.set(ex, (exMap.get(ex) ?? 0) + (s.weight_kg ?? 0) * (s.reps ?? 0))
      totalSets++
      totalVolume += (s.weight_kg ?? 0) * (s.reps ?? 0)
    }

    const topMg = mgMap.size > 0
      ? [...mgMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : 'full body'
    const mainEx = exMap.size > 0
      ? [...exMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : ''

    entries.push({
      date: photo.workout_date,
      imagePath: photo.image_path,
      sessionId: photo.workout_session_id,
      muscleGroup: topMg,
      mainExercise: mainEx,
      totalSets,
      totalVolume: Math.round(totalVolume),
    })
  }

  // Sort newest first, deduplicate by date (keep first occurrence = newest photo per date)
  entries.sort((a, b) => b.date.localeCompare(a.date))
  const seen = new Set<string>()
  return entries.filter(e => {
    if (seen.has(e.date)) return false
    seen.add(e.date)
    return true
  })
}
