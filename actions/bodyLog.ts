'use server'

import { createClient } from '@/lib/supabase/server'

// Light entry: photo metadata only — no workout queries
// thumbnail_path column now exists; thumbnailPath is null for legacy photos uploaded before migration
export type BodyLogPhotoEntry = {
  date: string        // YYYY-MM-DD
  imagePath: string
  thumbnailPath: string | null   // null for legacy photos without thumbnail
  sessionId: string
}

// Workout stats for one session — fetched lazily on demand
export type BodyLogDetail = {
  muscleGroup: string
  mainExercise: string
  totalSets: number
  totalVolume: number
}

// Legacy full entry (kept for callers that still need it)
export type BodyLogEntry = {
  date: string
  imagePath: string
  sessionId: string
  muscleGroup: string
  mainExercise: string
  totalSets: number
  totalVolume: number
}

// Fast path: photo metadata only (one DB query). Use this for all list/gallery views.
export async function getAllBodyLogPhotos(): Promise<BodyLogPhotoEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workout_photo_logs')
    .select('workout_date, image_path, thumbnail_path, workout_session_id')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .limit(200)

  if (!data) return []

  const seen = new Set<string>()
  const entries: BodyLogPhotoEntry[] = []
  for (const row of data as { workout_date: string; image_path: string; thumbnail_path: string | null; workout_session_id: string }[]) {
    if (seen.has(row.workout_date)) continue
    seen.add(row.workout_date)
    entries.push({ date: row.workout_date, imagePath: row.image_path, thumbnailPath: row.thumbnail_path ?? null, sessionId: row.workout_session_id })
  }
  return entries
}

// Lazy detail fetch: called only when user opens the detail sheet for a specific entry
export async function getBodyLogEntryDetail(sessionId: string): Promise<BodyLogDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Auth gate: verify this session has a photo owned by this user
  const { data: photoLog } = await supabase
    .from('workout_photo_logs')
    .select('workout_session_id')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()
  if (!photoLog) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, weight_kg, reps')
    .eq('session_id', sessionId)

  type SetRow = { exercise_name: string; muscle_group: string; weight_kg: number | null; reps: number | null }
  const rows = (sets ?? []) as SetRow[]
  if (rows.length === 0) return { muscleGroup: '', mainExercise: '', totalSets: 0, totalVolume: 0 }

  const mgMap = new Map<string, number>()
  const exMap = new Map<string, number>()
  let totalSets = 0
  let totalVolume = 0

  for (const s of rows) {
    const mg = s.muscle_group?.toLowerCase()
    if (mg) mgMap.set(mg, (mgMap.get(mg) ?? 0) + 1)
    const ex = s.exercise_name
    if (ex) exMap.set(ex, (exMap.get(ex) ?? 0) + (s.weight_kg ?? 0) * (s.reps ?? 0))
    totalSets++
    totalVolume += (s.weight_kg ?? 0) * (s.reps ?? 0)
  }

  return {
    muscleGroup: mgMap.size > 0 ? [...mgMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : '',
    mainExercise: exMap.size > 0 ? [...exMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : '',
    totalSets,
    totalVolume: Math.round(totalVolume),
  }
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
      .select('session_id, exercise_name, muscle_group, weight_kg, reps')
      .in('session_id', sessionIds),
  ])

  const sessions = (sessionsRes.data ?? []) as { id: string; trained_at: string }[]
  type SetRow = { session_id: string; exercise_name: string; muscle_group: string; weight_kg: number | null; reps: number | null }
  const sets = (setsRes.data ?? []) as SetRow[]

  // Group sets by session
  const setsBySession = new Map<string, SetRow[]>()
  for (const s of sets) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, [])
    setsBySession.get(s.session_id)!.push(s)
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
      : ''
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
