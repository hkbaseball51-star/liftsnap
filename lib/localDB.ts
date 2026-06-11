// Client-side localStorage data layer for MVP (no-auth) mode.
import { matchesCopyFilter, type CopyFilterType } from '@/lib/copyFilter'
export type { CopyFilterType } from '@/lib/copyFilter'
// All functions are synchronous and browser-only.
// TODO_SYNC: When cloud sync is added, merge localDB with Supabase on login.

const KEYS = {
  sessions:        'repra_sessions',
  sets:            'repra_sets',
  customExercises: 'repra_custom_exercises',
  bodyWeights:     'repra_body_weights',
} as const

export type LocalSession = {
  id: string
  title: string
  trained_at: string         // YYYY-MM-DD
  completed_at: string | null
  total_volume_kg: number
  created_at?: string        // ISO 8601 — filled by normalize; always present after migration
  updated_at?: string        // ISO 8601 — filled by normalize; always present after migration
}

export type AssistStatus = 'none' | 'assisted' | 'failed' | 'warmup'

export type LocalSet = {
  id: string
  session_id: string
  exercise_name: string
  muscle_group: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  note: string | null
  is_completed: boolean
  assistStatus?: AssistStatus
  created_at?: string        // ISO 8601 — filled by normalize; always present after migration
  updated_at?: string        // ISO 8601 — filled by normalize; always present after migration
}

export type LocalExercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  is_custom: boolean
  created_at?: string        // ISO 8601 — filled by normalize; always present after migration
  updated_at?: string        // ISO 8601 — filled by normalize; always present after migration
}

export type LocalBodyWeight = {
  id?: string                // filled by normalize; always present after migration
  date: string               // YYYY-MM-DD
  weight_kg: number
  created_at?: string        // ISO 8601 — filled by normalize; always present after migration
  updated_at?: string        // ISO 8601 — filled by normalize; always present after migration
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

// crypto.randomUUID() for body weight ids; falls back to a timestamp-based id
function bwUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `bw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

// ── Timestamp helpers ──────────────────────────────────────────────────────

export function nowIso(): string {
  return new Date().toISOString()
}

function dateToIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

// Normalize functions ensure created_at / updated_at are always present.
// Used both for migrate-on-read and for the one-time migration write-back.

export function normalizeSession(raw: Record<string, unknown>): LocalSession {
  const created_at = (raw.created_at as string | undefined)
    || (raw.completed_at as string | undefined)
    || (raw.trained_at ? dateToIso(raw.trained_at as string) : nowIso())
  return {
    id:               raw.id as string,
    title:            (raw.title as string) ?? '',
    trained_at:       raw.trained_at as string,
    completed_at:     (raw.completed_at as string | null) ?? null,
    total_volume_kg:  (raw.total_volume_kg as number) ?? 0,
    created_at,
    updated_at:       (raw.updated_at as string | undefined) || created_at,
  }
}

export function normalizeSet(
  raw: Record<string, unknown>,
  fallbackCreatedAt: string,
): LocalSet {
  const created_at = (raw.created_at as string | undefined) || fallbackCreatedAt
  return {
    id:            raw.id as string,
    session_id:    raw.session_id as string,
    exercise_name: raw.exercise_name as string,
    muscle_group:  (raw.muscle_group as string) ?? '',
    set_number:    (raw.set_number as number) ?? 0,
    weight_kg:     (raw.weight_kg as number | null) ?? null,
    reps:          (raw.reps as number | null) ?? null,
    note:          (raw.note as string | null) ?? null,
    is_completed:  (raw.is_completed as boolean) ?? false,
    assistStatus:  raw.assistStatus as AssistStatus | undefined,
    created_at,
    updated_at:    (raw.updated_at as string | undefined) || created_at,
  }
}

export function normalizeExercise(raw: Record<string, unknown>): LocalExercise {
  const created_at = (raw.created_at as string | undefined) || nowIso()
  return {
    id:           raw.id as string,
    name:         (raw.name as string) ?? '',
    muscle_group: (raw.muscle_group as string) ?? '',
    equipment:    (raw.equipment as string | null) ?? null,
    is_custom:    (raw.is_custom as boolean) ?? false,
    created_at,
    updated_at:   (raw.updated_at as string | undefined) || created_at,
  }
}

export function normalizeBodyWeight(raw: Record<string, unknown>): LocalBodyWeight {
  const created_at = (raw.created_at as string | undefined)
    || (raw.date ? dateToIso(raw.date as string) : nowIso())
  return {
    id:        (raw.id as string | undefined) || bwUid(),
    date:      raw.date as string,
    weight_kg: (raw.weight_kg as number) ?? 0,
    created_at,
    updated_at: (raw.updated_at as string | undefined) || created_at,
  }
}

// ── One-time migration: stamp existing data with created_at / updated_at ──

const MIGRATION_V2_KEY = 'repra_db_v2'

export function runLocalDBMigration(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_V2_KEY)) return

  try {
    // Normalize sessions
    const rawSessions = read<Record<string, unknown>[]>(KEYS.sessions, [])
    const sessions = rawSessions.map(normalizeSession)
    write(KEYS.sessions, sessions)

    // Use each session's created_at as fallback for its sets
    const sessionCreatedAt = new Map(sessions.map(s => [s.id, s.created_at!]))

    // Normalize sets
    const rawSets = read<Record<string, unknown>[]>(KEYS.sets, [])
    write(KEYS.sets, rawSets.map(s =>
      normalizeSet(s, sessionCreatedAt.get(s.session_id as string) ?? nowIso()),
    ))

    // Normalize custom exercises
    const rawExercises = read<Record<string, unknown>[]>(KEYS.customExercises, [])
    write(KEYS.customExercises, rawExercises.map(normalizeExercise))

    // Normalize body weights
    const rawBodyWeights = read<Record<string, unknown>[]>(KEYS.bodyWeights, [])
    write(KEYS.bodyWeights, rawBodyWeights.map(normalizeBodyWeight))

    localStorage.setItem(MIGRATION_V2_KEY, 'true')
  } catch {
    // Non-fatal: normalize-on-read still ensures consistent in-memory data
  }
}

// ── Migration v3: add id to existing body weight records ──────

const MIGRATION_V3_KEY = 'repra_db_v3_bw_id'

export function runBodyWeightIdMigration(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_V3_KEY)) return

  try {
    const raw = read<Record<string, unknown>[]>(KEYS.bodyWeights, [])
    // normalizeBodyWeight already fills id when missing
    write(KEYS.bodyWeights, raw.map(normalizeBodyWeight))
    localStorage.setItem(MIGRATION_V3_KEY, 'true')
  } catch {
    // Non-fatal: normalize-on-read fills id in memory even if write-back failed
  }
}

// ── Sessions ──────────────────────────────────────────────────

function getSessions(): LocalSession[] {
  return read<Record<string, unknown>[]>(KEYS.sessions, []).map(normalizeSession)
}
function setSessions(s: LocalSession[]) { write(KEYS.sessions, s) }

export function localCreateSession(date: string, title: string): string {
  const id  = uid()
  const now = nowIso()
  const all = getSessions()
  // Remove any incomplete (draft) session for this date first
  const filtered = all.filter(s => !(s.trained_at === date && s.completed_at === null))
  filtered.push({ id, title, trained_at: date, completed_at: null, total_volume_kg: 0, created_at: now, updated_at: now })
  setSessions(filtered)
  return id
}

export function localSaveFullSession(
  sessionId: string,
  title: string,
  sets: { exercise_name: string; muscle_group: string; set_number: number; weight_kg: number | null; reps: number | null; note?: string | null; assistStatus?: AssistStatus }[],
): void {
  const now = nowIso()

  // Replace sets for this session
  const otherSets = getSets().filter(s => s.session_id !== sessionId)
  const newSets: LocalSet[] = sets.map(s => ({
    id: uid(),
    session_id: sessionId,
    exercise_name: s.exercise_name,
    muscle_group: s.muscle_group,
    set_number: s.set_number,
    weight_kg: s.weight_kg,
    reps: s.reps,
    note: s.note ?? null,
    is_completed: true,
    assistStatus: s.assistStatus,
    created_at: now,
    updated_at: now,
  }))
  setSets([...otherSets, ...newSets])

  const totalVolume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  setSessions(getSessions().map(s =>
    s.id === sessionId
      ? { ...s, title, total_volume_kg: totalVolume, completed_at: now, updated_at: now }
      : s,
  ))
}

export type PreviousSessionData = {
  exercises: {
    name: string
    muscle_group: string
    note: string | null
    sets: { set_number: number; weight_kg: number | null; reps: number | null; assistStatus?: AssistStatus }[]
  }[]
}

export function localGetPreviousSession(beforeDate: string): PreviousSessionData | null {
  const session = getSessions()
    .filter(s => s.completed_at !== null && s.trained_at < beforeDate)
    .sort((a, b) => b.trained_at.localeCompare(a.trained_at))[0]
  if (!session) return null
  const sets = getSets().filter(s => s.session_id === session.id)
  if (sets.length === 0) return null
  const map = new Map<string, { muscle_group: string; note: string | null; sets: { set_number: number; weight_kg: number | null; reps: number | null; assistStatus?: AssistStatus }[] }>()
  for (const s of sets) {
    if (!map.has(s.exercise_name)) map.set(s.exercise_name, { muscle_group: s.muscle_group, note: s.note, sets: [] })
    map.get(s.exercise_name)!.sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps, assistStatus: s.assistStatus })
  }
  const exercises = Array.from(map.entries())
    .map(([name, d]) => ({ name, muscle_group: d.muscle_group, note: d.note, sets: d.sets.sort((a, b) => a.set_number - b.set_number) }))
    .filter(ex => ex.sets.length > 0)
  return exercises.length > 0 ? { exercises } : null
}

export function localGetPreviousSessionByType(beforeDate: string, filterType: CopyFilterType): PreviousSessionData | null {
  if (filterType === 'all') return localGetPreviousSession(beforeDate)
  const sessions = getSessions()
    .filter(s => s.completed_at !== null && s.trained_at < beforeDate)
    .sort((a, b) => b.trained_at.localeCompare(a.trained_at))
  const allSets = getSets()
  for (const session of sessions) {
    const matchingSets = allSets.filter(s => s.session_id === session.id && matchesCopyFilter(s.muscle_group, filterType))
    if (matchingSets.length === 0) continue
    const map = new Map<string, { muscle_group: string; note: string | null; sets: { set_number: number; weight_kg: number | null; reps: number | null; assistStatus?: AssistStatus }[] }>()
    for (const s of matchingSets) {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, { muscle_group: s.muscle_group, note: s.note, sets: [] })
      map.get(s.exercise_name)!.sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps, assistStatus: s.assistStatus })
    }
    const exercises = Array.from(map.entries())
      .map(([name, d]) => ({ name, muscle_group: d.muscle_group, note: d.note, sets: d.sets.sort((a, b) => a.set_number - b.set_number) }))
      .filter(ex => ex.sets.length > 0)
    if (exercises.length > 0) return { exercises }
  }
  return null
}

export function localGetSessionForDate(date: string): {
  id: string
  title: string
  exercises: { name: string; muscle_group: string; note: string | null; sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null; assistStatus?: AssistStatus }[] }[]
} | null {
  const session = getSessions().find(s => s.trained_at === date && s.completed_at !== null)
  if (!session) return null
  const sets = getSets().filter(s => s.session_id === session.id)
  const map = new Map<string, { muscle_group: string; note: string | null; sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null; assistStatus?: AssistStatus }[] }>()
  for (const s of sets) {
    if (!map.has(s.exercise_name)) map.set(s.exercise_name, { muscle_group: s.muscle_group, note: s.note, sets: [] })
    map.get(s.exercise_name)!.sets.push({ id: s.id, set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps, assistStatus: s.assistStatus })
  }
  return {
    id: session.id,
    title: session.title,
    exercises: Array.from(map.entries()).map(([name, d]) => ({ name, muscle_group: d.muscle_group, note: d.note, sets: d.sets })),
  }
}

export function localGetExercisePR(exerciseName: string): number | null {
  const matching = getSets().filter(s => s.exercise_name === exerciseName && s.is_completed && (s.weight_kg ?? 0) > 0)
  if (!matching.length) return null
  return Math.max(...matching.map(s => s.weight_kg!))
}

export function localGetExercisePRBatch(names: string[]): Record<string, number | null> {
  if (names.length === 0) return {}
  const nameSet = new Set(names)
  const result: Record<string, number | null> = Object.fromEntries(names.map(n => [n, null]))
  for (const s of getSets()) {
    if (!s.is_completed || (s.weight_kg ?? 0) <= 0) continue
    if (!nameSet.has(s.exercise_name)) continue
    const cur = result[s.exercise_name]
    if (cur === null || s.weight_kg! > cur) result[s.exercise_name] = s.weight_kg
  }
  return result
}

export function localGetCalendarData(days = 90): {
  sessions: { id: string; trained_at: string; title: string; sets: LocalSet[] }[]
  bodyWeights: LocalBodyWeight[]
} {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  // Use JST to match the timezone used when storing trained_at dates
  const cutoffStr = cutoff.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
  const sessions = getSessions().filter(s => s.completed_at !== null && s.trained_at >= cutoffStr)
  const sidSet = new Set(sessions.map(s => s.id))
  const sets = getSets().filter(s => sidSet.has(s.session_id))
  return {
    sessions: sessions.map(s => ({ ...s, sets: sets.filter(w => w.session_id === s.id) })),
    bodyWeights: getBodyWeights().filter(w => w.date >= cutoffStr),
  }
}

export function localGetWeekSessions(weekStart: string): LocalSession[] {
  return getSessions().filter(s => s.completed_at !== null && s.trained_at >= weekStart)
}

export function localGetTotalSessions(): number {
  return getSessions().filter(s => s.completed_at !== null).length
}

export function localGetTodayWorkoutForShare(date: string): {
  sessionId: string; title: string; date: string; volume: number; setsCount: number
  exercises: { name: string; setList: { weight: number; reps: number }[]; setCount: number; best1RM: number }[]
  bestLift: { name: string; weight: number } | null; muscleFocus: string | null; photoPath: string | null
} | null {
  const session = getSessions().find(s => s.trained_at === date && s.completed_at !== null)
  if (!session) return null
  const sets = getSets().filter(s => s.session_id === session.id && s.is_completed)
  const exMap = new Map<string, { muscle_group: string; sets: { weight: number; reps: number }[]; best1RM: number }>()
  sets.forEach(s => {
    if (!exMap.has(s.exercise_name)) exMap.set(s.exercise_name, { muscle_group: s.muscle_group, sets: [], best1RM: 0 })
    const ex = exMap.get(s.exercise_name)!
    const w = s.weight_kg ?? 0; const r = s.reps ?? 0
    ex.sets.push({ weight: w, reps: r })
    const e1rm = w * (1 + r / 30)
    if (e1rm > ex.best1RM) ex.best1RM = e1rm
  })
  let bestLiftName = '', bestLift1RM = 0, bestLiftWeight = 0
  exMap.forEach((v, k) => {
    if (v.best1RM > bestLift1RM) { bestLift1RM = v.best1RM; bestLiftName = k; bestLiftWeight = v.sets.reduce((b, s) => { const e = s.weight * (1 + s.reps / 30); return e > b.e ? { e, w: s.weight } : b }, { e: 0, w: 0 }).w }
  })
  const muscleCount = new Map<string, number>()
  sets.forEach(s => { if (s.muscle_group) muscleCount.set(s.muscle_group, (muscleCount.get(s.muscle_group) ?? 0) + 1) })
  let muscleFocus = '', maxMC = 0
  muscleCount.forEach((c, m) => { if (c > maxMC) { maxMC = c; muscleFocus = m } })
  return {
    sessionId: session.id, title: session.title ?? "Today's Workout",
    date: session.trained_at, volume: sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
    setsCount: sets.length,
    exercises: Array.from(exMap.entries()).map(([name, d]) => ({ name, setList: d.sets, setCount: d.sets.length, best1RM: Math.round(d.best1RM * 10) / 10 })),
    bestLift: bestLiftName ? { name: bestLiftName, weight: bestLiftWeight } : null,
    muscleFocus: muscleFocus || null, photoPath: null,
  }
}

// ── Sets ──────────────────────────────────────────────────────

function getSets(): LocalSet[] {
  return read<Record<string, unknown>[]>(KEYS.sets, []).map(s => normalizeSet(s, nowIso()))
}
function setSets(s: LocalSet[]) { write(KEYS.sets, s) }

// ── Exercises ─────────────────────────────────────────────────

function getCustomExercises(): LocalExercise[] {
  return read<Record<string, unknown>[]>(KEYS.customExercises, []).map(normalizeExercise)
}
function setCustomExercises(e: LocalExercise[]) { write(KEYS.customExercises, e) }

export function localGetCustomExercises(): LocalExercise[] { return getCustomExercises() }

export function localCreateCustomExercise(name: string, muscleGroup: string, equipment?: string): LocalExercise {
  const now = nowIso()
  const ex: LocalExercise = {
    id: 'custom_' + uid(),
    name,
    muscle_group: muscleGroup,
    equipment: equipment ?? null,
    is_custom: true,
    created_at: now,
    updated_at: now,
  }
  setCustomExercises([...getCustomExercises(), ex])
  return ex
}

export function localDeleteCustomExercise(exerciseId: string): void {
  setCustomExercises(getCustomExercises().filter(e => e.id !== exerciseId))
}

export function localGetExerciseUsageCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const s of getSets()) counts[s.exercise_name] = (counts[s.exercise_name] ?? 0) + 1
  return counts
}

// ── Body Weight ───────────────────────────────────────────────

function getBodyWeights(): LocalBodyWeight[] {
  return read<Record<string, unknown>[]>(KEYS.bodyWeights, []).map(normalizeBodyWeight)
}
function setBodyWeights(w: LocalBodyWeight[]) { write(KEYS.bodyWeights, w) }

export function localUpsertBodyWeight(weightKg: number, date: string): void {
  const all = getBodyWeights()
  const idx = all.findIndex(w => w.date === date)
  const now = nowIso()
  if (idx >= 0) {
    // Preserve existing id and created_at; update only weight and updated_at
    all[idx] = { ...all[idx], weight_kg: weightKg, updated_at: now }
  } else {
    all.push({ id: bwUid(), date, weight_kg: weightKg, created_at: now, updated_at: now })
  }
  setBodyWeights(all)
}

export function localGetBodyWeightHistory(days = 730): { date: string; label: string; weight: number }[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
  return getBodyWeights()
    .filter(w => w.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => { const [, mm, dd] = w.date.split('-'); return { date: w.date, label: `${parseInt(mm)}/${parseInt(dd)}`, weight: w.weight_kg } })
}

export function localGetBodyWeightByDate(): Record<string, number> {
  const result: Record<string, number> = {}
  for (const w of getBodyWeights()) result[w.date] = w.weight_kg
  return result
}

// ── Analytics ─────────────────────────────────────────────────

export function localGetExercisesWithHistory(): { name: string; muscle_group: string; logCount: number }[] {
  const sessions = getSessions().filter(s => s.completed_at !== null)
  const sidSet = new Set(sessions.map(s => s.id))
  const seen = new Map<string, { muscle_group: string; sessions: Set<string> }>()
  for (const s of getSets()) {
    if (!sidSet.has(s.session_id) || !s.is_completed) continue
    if (!seen.has(s.exercise_name)) seen.set(s.exercise_name, { muscle_group: s.muscle_group ?? '', sessions: new Set() })
    seen.get(s.exercise_name)!.sessions.add(s.session_id)
  }
  return Array.from(seen.entries()).map(([name, { muscle_group, sessions }]) => ({ name, muscle_group, logCount: sessions.size }))
}

export type ExerciseHistoryEntry = {
  date: string
  sets: { weight_kg: number; reps: number; set_number: number; assistStatus?: AssistStatus }[]
  bestEst1rm: number
  maxWeight: number
}

export type ExerciseHistoryResult = {
  entries: ExerciseHistoryEntry[]   // newest first, max `limit`
  totalSessions: number
  allTimeBest1rm: number | null
  allTimeBestWeight: number | null
}

export function localGetExerciseHistory(
  exerciseName: string,
  beforeDate?: string,
  limit = 10,
): ExerciseHistoryResult {
  const empty: ExerciseHistoryResult = { entries: [], totalSessions: 0, allTimeBest1rm: null, allTimeBestWeight: null }
  const sessions = getSessions().filter(s => s.completed_at !== null && (!beforeDate || s.trained_at < beforeDate))
  if (!sessions.length) return empty
  const sidToDate = new Map(sessions.map(s => [s.id, s.trained_at]))
  const matchingSets = getSets().filter(s =>
    s.exercise_name === exerciseName && s.is_completed && sidToDate.has(s.session_id) &&
    s.weight_kg !== null && s.reps !== null
  )
  if (!matchingSets.length) return empty
  const byDate = new Map<string, { weight_kg: number; reps: number; set_number: number; assistStatus?: AssistStatus }[]>()
  for (const s of matchingSets) {
    const date = sidToDate.get(s.session_id)!
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push({ weight_kg: s.weight_kg!, reps: s.reps!, set_number: s.set_number, assistStatus: s.assistStatus })
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))
  const totalSessions = sortedDates.length
  let allTimeBest1rm: number | null = null
  let allTimeBestWeight: number | null = null
  const entries: ExerciseHistoryEntry[] = sortedDates.slice(0, limit).map(date => {
    const sets = byDate.get(date)!.sort((a, b) => a.set_number - b.set_number)
    let bestEst1rm = 0, maxWeight = 0
    for (const s of sets) {
      const est = s.reps === 1 ? s.weight_kg : Math.round(s.weight_kg * (1 + s.reps / 30))
      if (est > bestEst1rm) bestEst1rm = est
      if (s.weight_kg > maxWeight) maxWeight = s.weight_kg
    }
    if (bestEst1rm > (allTimeBest1rm ?? 0)) allTimeBest1rm = bestEst1rm
    if (maxWeight > (allTimeBestWeight ?? 0)) allTimeBestWeight = maxWeight
    return { date, sets, bestEst1rm, maxWeight }
  })
  for (const date of sortedDates.slice(limit)) {
    for (const s of byDate.get(date)!) {
      const est = s.reps === 1 ? s.weight_kg : Math.round(s.weight_kg * (1 + s.reps / 30))
      if (est > (allTimeBest1rm ?? 0)) allTimeBest1rm = est
      if (s.weight_kg > (allTimeBestWeight ?? 0)) allTimeBestWeight = s.weight_kg
    }
  }
  return { entries, totalSessions, allTimeBest1rm, allTimeBestWeight }
}

export function localGetExercise1RMData(exerciseName: string, startDate?: string): { date: string; label: string; est1rm: number; weight: number; reps: number }[] {
  const sessions = getSessions().filter(s => s.completed_at !== null && (!startDate || s.trained_at >= startDate))
  const sidToDate = new Map(sessions.map(s => [s.id, s.trained_at]))
  const sets = getSets().filter(s => s.exercise_name === exerciseName && s.is_completed && (s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0 && sidToDate.has(s.session_id))
  const byDate = new Map<string, { est1rm: number; weight: number; reps: number }>()
  for (const s of sets) {
    const date = sidToDate.get(s.session_id)!
    const est = s.reps === 1 ? s.weight_kg! : Math.round(s.weight_kg! * (1 + s.reps! / 30))
    const existing = byDate.get(date)
    if (!existing || est > existing.est1rm) byDate.set(date, { est1rm: est, weight: s.weight_kg!, reps: s.reps! })
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => { const [, mm, dd] = date.split('-'); return { date, label: `${parseInt(mm)}/${parseInt(dd)}`, ...d } })
}

export function localGetBodyPartDailyVolumeData(bodyPart: string, startDate?: string): { date: string; label: string; volume: number }[] {
  const sessions = getSessions().filter(s => s.completed_at !== null && (!startDate || s.trained_at >= startDate))
  const sidToDate = new Map(sessions.map(s => [s.id, s.trained_at]))
  const sets = getSets().filter(s => s.is_completed && sidToDate.has(s.session_id))
  const byDate = new Map<string, number>()
  for (const s of sets) {
    if (bodyPart !== 'all' && !matchesBodyPart(s.muscle_group, bodyPart)) continue
    const date = sidToDate.get(s.session_id)!
    byDate.set(date, (byDate.get(date) ?? 0) + (s.weight_kg ?? 0) * (s.reps ?? 0))
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, volume]) => { const [, mm, dd] = date.split('-'); return { date, label: `${parseInt(mm)}/${parseInt(dd)}`, volume: Math.round(volume) } })
}

export function localGetPPLDailyVolumeAll(startDate?: string): { push: { date: string; label: string; volume: number }[]; pull: { date: string; label: string; volume: number }[]; legs: { date: string; label: string; volume: number }[]; other: { date: string; label: string; volume: number }[] } {
  const sessions = getSessions().filter(s => s.completed_at !== null && (!startDate || s.trained_at >= startDate))
  const sidToDate = new Map(sessions.map(s => [s.id, s.trained_at]))
  const sets = getSets().filter(s => s.is_completed && sidToDate.has(s.session_id))
  const groups = { push: new Map<string, number>(), pull: new Map<string, number>(), legs: new Map<string, number>(), other: new Map<string, number>() }
  for (const s of sets) {
    const date = sidToDate.get(s.session_id)!
    const vol = (s.weight_kg ?? 0) * (s.reps ?? 0)
    const grp = muscleGroupToPPL(s.muscle_group)
    groups[grp].set(date, (groups[grp].get(date) ?? 0) + vol)
  }
  const toArr = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, volume]) => { const [, mm, dd] = date.split('-'); return { date, label: `${parseInt(mm)}/${parseInt(dd)}`, volume: Math.round(volume) } })
  return { push: toArr(groups.push), pull: toArr(groups.pull), legs: toArr(groups.legs), other: toArr(groups.other) }
}

function muscleGroupToPPL(mg: string | null): 'push' | 'pull' | 'legs' | 'other' {
  if (!mg) return 'other'
  const m = mg.toLowerCase()
  if (m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('calf') || m.includes('calve') || m.includes('leg') || m.includes('lower')) return 'legs'
  if (m.includes('back') || m.includes('lat') || m.includes('trap') || m.includes('rhomboid') || m.includes('bicep') || m.includes('forearm')) return 'pull'
  if (m.includes('chest') || m.includes('pec') || m.includes('shoulder') || m.includes('delt') || m.includes('tricep')) return 'push'
  return 'other'
}

function matchesBodyPart(mg: string | null, bodyPart: string): boolean {
  if (!mg) return false
  const m = mg.toLowerCase()
  switch (bodyPart) {
    case 'chest': return m.includes('chest') || m.includes('pec')
    case 'back': return m.includes('back') || m.includes('lat') || m.includes('trap') || m.includes('rhomboid')
    case 'shoulders': return m.includes('shoulder') || m.includes('delt')
    case 'arms': return m.includes('bicep') || m.includes('tricep') || m.includes('forearm')
    case 'legs': return m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('calf') || m.includes('calve') || m.includes('leg') || m.includes('lower')
    case 'abs': return m.includes('abs') || m.includes('core')
    default: return false
  }
}
