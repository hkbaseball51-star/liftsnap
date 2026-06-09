'use server'

import { createClient } from '@supabase/supabase-js'
import { REPRA_DEMO_USER_ID } from '@/lib/demoConstants'
import { matchesCopyFilter, type CopyFilterType } from '@/lib/copyFilter'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function assertDemoUser(userId: string) {
  if (userId !== REPRA_DEMO_USER_ID) throw new Error('Invalid demo user')
}

function muscleGroupToBodyPart(mg: string | null): string {
  if (!mg) return 'other'
  const m = mg.toLowerCase()
  if (m.includes('chest')) return 'chest'
  if (m.includes('quad') || m.includes('hamstring') || m.includes('glute')
      || m.includes('calf') || m.includes('calve') || m.includes('leg')) return 'legs'
  if (m.includes('shoulder') || m.includes('delt')) return 'shoulders'
  if (m.includes('bicep') || m.includes('tricep') || m.includes('forearm')) return 'arms'
  if (m.includes('abs') || m.includes('core')) return 'abs'
  if (m.includes('back') || m.includes('lat') || m.includes('trap') || m.includes('rhomboid')) return 'back'
  return 'other'
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Types ───────────────────────────────────────────────────────────────────

export type DemoCalendarSession = {
  id: string
  title: string
  trained_at: string
  total_volume_kg: number | null
  completed_at: string | null
  sets: {
    exercise_name: string
    muscle_group: string
    weight_kg: number
    reps: number
    is_completed: boolean
    note: string | null
  }[]
}

export type DemoBodyWeight = { date: string; weight_kg: number }

// ── Calendar & Home data ────────────────────────────────────────────────────

export async function getDemoCalendarData(
  userId: string,
  days: number,
): Promise<{ sessions: DemoCalendarSession[]; bodyWeights: DemoBodyWeight[] }> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const [{ data: sessions }, { data: bw }] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, title, trained_at, total_volume_kg, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('trained_at', cutoffStr)
      .order('trained_at'),
    supabase
      .from('body_weights')
      .select('weight_kg, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', cutoffStr)
      .order('recorded_at'),
  ])

  if (!sessions?.length) {
    return {
      sessions: [],
      bodyWeights: (bw ?? []).map(r => ({ date: r.recorded_at, weight_kg: r.weight_kg })),
    }
  }

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('session_id, exercise_name, muscle_group, weight_kg, reps, is_completed, note')
    .in('session_id', sessions.map(s => s.id))

  const setsBySession = new Map<string, NonNullable<typeof sets>>()
  for (const s of (sets ?? [])) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, [])
    setsBySession.get(s.session_id)!.push(s)
  }

  return {
    sessions: sessions.map(s => ({
      ...s,
      sets: (setsBySession.get(s.id) ?? []).map(set => ({
        exercise_name: set.exercise_name,
        muscle_group: set.muscle_group ?? '',
        weight_kg: set.weight_kg ?? 0,
        reps: set.reps ?? 0,
        is_completed: set.is_completed ?? false,
        note: set.note ?? null,
      })),
    })),
    bodyWeights: (bw ?? []).map(r => ({ date: r.recorded_at, weight_kg: r.weight_kg })),
  }
}

export async function getDemoWeekSessions(
  userId: string,
  weekStart: string,
): Promise<{ id: string; trained_at: string; total_volume_kg: number }[]> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workout_sessions')
    .select('id, trained_at, total_volume_kg')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('trained_at', weekStart)
    .order('trained_at')
  return (data ?? []).map(s => ({
    id: s.id,
    trained_at: s.trained_at,
    total_volume_kg: s.total_volume_kg ?? 0,
  }))
}

export async function getDemoAllTime1RM(userId: string): Promise<number | null> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
  if (!sessions?.length) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps')
    .in('session_id', sessions.map(s => s.id))
    .eq('is_completed', true)
    .gt('weight_kg', 0)
    .gt('reps', 0)
  if (!sets?.length) return null

  let best = 0
  for (const s of sets) {
    const w = s.weight_kg ?? 0, r = s.reps ?? 0
    const est = r === 1 ? w : Math.round(w * (1 + r / 30))
    if (est > best) best = est
  }
  return best > 0 ? best : null
}

// ── Analytics data ──────────────────────────────────────────────────────────

export async function getDemoExercisesWithHistory(
  userId: string,
): Promise<{ name: string; muscle_group: string; logCount: number }[]> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('trained_at', cutoffStr)
    .not('completed_at', 'is', null)
  if (!sessions?.length) return []

  const { data } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, session_id')
    .in('session_id', sessions.map(s => s.id))
    .eq('is_completed', true)
  if (!data?.length) return []

  const seen = new Map<string, { muscle_group: string; sessions: Set<string> }>()
  data.forEach(s => {
    if (!seen.has(s.exercise_name))
      seen.set(s.exercise_name, { muscle_group: s.muscle_group ?? '', sessions: new Set() })
    if (s.session_id) seen.get(s.exercise_name)!.sessions.add(String(s.session_id))
  })

  return Array.from(seen.entries()).map(([name, { muscle_group, sessions }]) => ({
    name, muscle_group, logCount: sessions.size,
  }))
}

export async function getDemoExercise1RMData(
  userId: string,
  exerciseName: string,
  startDate?: string,
): Promise<{ date: string; label: string; est1rm: number }[]> {
  assertDemoUser(userId)
  const supabase = createAdminClient()

  let sessQuery = supabase
    .from('workout_sessions')
    .select('id, trained_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('trained_at')
  if (startDate) sessQuery = sessQuery.gte('trained_at', startDate) as typeof sessQuery

  const { data: sessions } = await sessQuery
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
    const w = s.weight_kg ?? 0, r = s.reps ?? 0
    const est = r === 1 ? w : Math.round(w * (1 + r / 30))
    const cur = est1rmBySession.get(s.session_id) ?? 0
    if (est > cur) est1rmBySession.set(s.session_id, est)
  })

  return sessions
    .filter(s => est1rmBySession.has(s.id))
    .map(s => {
      const d = new Date(s.trained_at)
      return { date: s.trained_at, label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, est1rm: est1rmBySession.get(s.id)! }
    })
}

export async function getDemoBodyPartVolumeData(
  userId: string,
  bodyPart: string,
  startDate?: string,
): Promise<{ date: string; label: string; volume: number }[]> {
  assertDemoUser(userId)
  const supabase = createAdminClient()

  let sessQuery = supabase
    .from('workout_sessions')
    .select('id, trained_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('trained_at')
  if (startDate) sessQuery = sessQuery.gte('trained_at', startDate) as typeof sessQuery

  const { data: sessions } = await sessQuery
  if (!sessions?.length) return []

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('session_id, muscle_group, weight_kg, reps')
    .in('session_id', sessions.map(s => s.id))
    .gt('weight_kg', 0)
    .gt('reps', 0)
  if (!sets?.length) return []

  const sessionDateMap = new Map(sessions.map(s => [s.id, s.trained_at]))
  const volumeByDate = new Map<string, number>()

  sets.forEach(s => {
    const date = sessionDateMap.get(s.session_id)
    if (!date) return
    if (bodyPart !== 'all') {
      const part = muscleGroupToBodyPart(s.muscle_group)
      if (part !== bodyPart) return
    }
    const vol = (s.weight_kg ?? 0) * (s.reps ?? 0)
    volumeByDate.set(date, (volumeByDate.get(date) ?? 0) + vol)
  })

  return Array.from(volumeByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volume]) => {
      const d = new Date(date)
      return { date, label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, volume: Math.round(volume) }
    })
}

export async function getDemoBodyWeightHistory(
  userId: string,
  days = 730,
): Promise<{ date: string; label: string; weight: number }[]> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data } = await supabase
    .from('body_weights')
    .select('weight_kg, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', cutoffStr)
    .order('recorded_at')

  return (data ?? []).map(r => {
    const [, mm, dd] = r.recorded_at.split('-')
    return { date: r.recorded_at, label: `${parseInt(mm)}/${parseInt(dd)}`, weight: r.weight_kg }
  })
}

export async function getDemoTotalSessions(userId: string): Promise<number> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
  return count ?? 0
}

// ── Previous session (copy feature) ─────────────────────────────────────────

export type DemoPreviousSession = {
  exercises: {
    name: string
    muscle_group: string
    note: string | null
    sets: { set_number: number; weight_kg: number | null; reps: number | null }[]
  }[]
}

export async function getDemoPreviousSession(
  userId: string,
  beforeDate: string,
): Promise<DemoPreviousSession | null> {
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .lt('trained_at', beforeDate)
    .order('trained_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!session) return null
  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, set_number, weight_kg, reps, note')
    .eq('session_id', session.id)
    .order('set_number')
  if (!sets?.length) return null
  const map = new Map<string, { muscle_group: string; note: string | null; sets: { set_number: number; weight_kg: number | null; reps: number | null }[] }>()
  for (const s of sets) {
    if (!map.has(s.exercise_name)) map.set(s.exercise_name, { muscle_group: s.muscle_group ?? '', note: s.note ?? null, sets: [] })
    map.get(s.exercise_name)!.sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps })
  }
  const exercises = Array.from(map.entries())
    .map(([name, d]) => ({ name, muscle_group: d.muscle_group, note: d.note, sets: d.sets }))
    .filter(ex => ex.sets.length > 0)
  return exercises.length > 0 ? { exercises } : null
}

export async function getDemoPreviousSessionByType(
  userId: string,
  beforeDate: string,
  filterType: CopyFilterType,
): Promise<DemoPreviousSession | null> {
  if (filterType === 'all') return getDemoPreviousSession(userId, beforeDate)
  assertDemoUser(userId)
  const supabase = createAdminClient()
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .lt('trained_at', beforeDate)
    .order('trained_at', { ascending: false })
    .limit(30)
  if (!sessions?.length) return null
  const { data: allSets } = await supabase
    .from('workout_sets')
    .select('session_id, exercise_name, muscle_group, set_number, weight_kg, reps, note')
    .in('session_id', sessions.map(s => s.id))
    .order('set_number')
  if (!allSets?.length) return null
  for (const session of sessions) {
    const matchingSets = allSets.filter(s => s.session_id === session.id && matchesCopyFilter(s.muscle_group ?? '', filterType))
    if (matchingSets.length === 0) continue
    const map = new Map<string, { muscle_group: string; note: string | null; sets: { set_number: number; weight_kg: number | null; reps: number | null }[] }>()
    for (const s of matchingSets) {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, { muscle_group: s.muscle_group ?? '', note: s.note ?? null, sets: [] })
      map.get(s.exercise_name)!.sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps })
    }
    const exercises = Array.from(map.entries())
      .map(([name, d]) => ({ name, muscle_group: d.muscle_group, note: d.note, sets: d.sets }))
      .filter(ex => ex.sets.length > 0)
    if (exercises.length > 0) return { exercises }
  }
  return null
}

// ── Share data ───────────────────────────────────────────────────────────────

export async function getDemoTodayWorkoutForShare(userId: string, date: string) {
  assertDemoUser(userId)
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, title, trained_at, total_volume_kg')
    .eq('user_id', userId)
    .eq('trained_at', date)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!session) return null

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('exercise_name, muscle_group, weight_kg, reps, is_completed, set_number')
    .eq('session_id', session.id)
    .eq('is_completed', true)
    .order('set_number')

  const exMap = new Map<string, { muscle_group: string; sets: { weight: number; reps: number }[]; best1RM: number }>()
  sets?.forEach(s => {
    if (!exMap.has(s.exercise_name))
      exMap.set(s.exercise_name, { muscle_group: s.muscle_group, sets: [], best1RM: 0 })
    const ex = exMap.get(s.exercise_name)!
    const w = s.weight_kg ?? 0, r = s.reps ?? 0
    ex.sets.push({ weight: w, reps: r })
    const e1rm = w * (1 + r / 30)
    if (e1rm > ex.best1RM) ex.best1RM = e1rm
  })

  let bestLiftName = '', bestLift1RM = 0, bestLiftWeight = 0
  exMap.forEach((v, k) => {
    if (v.best1RM > bestLift1RM) {
      bestLift1RM = v.best1RM
      bestLiftName = k
      bestLiftWeight = v.sets.reduce((b, s) => {
        const e = s.weight * (1 + s.reps / 30)
        return e > b.e ? { e, w: s.weight } : b
      }, { e: 0, w: 0 }).w
    }
  })

  const muscleCount = new Map<string, number>()
  sets?.forEach(s => { if (s.muscle_group) muscleCount.set(s.muscle_group, (muscleCount.get(s.muscle_group) ?? 0) + 1) })
  let muscleFocus = '', maxMC = 0
  muscleCount.forEach((c, m) => { if (c > maxMC) { maxMC = c; muscleFocus = m } })

  const totalVolume = sets?.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0) ?? 0

  return {
    sessionId: session.id as string,
    title: (session.title ?? "Today's Workout") as string,
    date: session.trained_at as string,
    volume: totalVolume,
    setsCount: sets?.length ?? 0,
    exercises: Array.from(exMap.entries()).map(([name, d]) => ({
      name,
      setList: d.sets,
      setCount: d.sets.length,
      best1RM: Math.round(d.best1RM * 10) / 10,
    })),
    bestLift: bestLiftName ? { name: bestLiftName, weight: bestLiftWeight } : null,
    muscleFocus: muscleFocus || null,
    photoPath: null as string | null,
  }
}
