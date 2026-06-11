// Builds a structured payload from localDB data for future AI analysis.
// No AI API connections — pure data transformation.
// Reads from the same localStorage keys as localDB.ts; never writes.

import type { LocalSession, LocalSet, LocalBodyWeight } from '@/lib/localDB'
import type {
  BuildTrainingAnalysisPayloadOptions,
  TrainingAnalysisPayload,
  AiAnalysisSessionPayload,
  AiAnalysisExercisePayload,
  AiAnalysisSetPayload,
} from './types'

// Mirrors localDB.ts KEYS — do not change these values.
const LS_KEYS = {
  sessions:    'repra_sessions',
  sets:        'repra_sets',
  bodyWeights: 'repra_body_weights',
} as const

// Safe JSON reader that returns a typed fallback when localStorage is unavailable
// (SSR) or the stored value is corrupt.
function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

// Estimated 1-rep max — Epley formula: weight × (1 + reps / 30).
// Matches the formula used throughout Analytics and localDB.ts.
// Returns null when inputs are absent, non-positive, or reps is impractical.
function estimatedOneRepMax(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null) return null
  if (weightKg <= 0 || reps <= 0)      return null
  if (reps === 1)                       return weightKg
  return Math.round(weightKg * (1 + reps / 30))
}

/**
 * Builds a self-contained JSON payload suitable for sending to an AI analysis
 * endpoint in the future. The function is side-effect-free — it only reads
 * from localStorage and returns a plain object.
 *
 * @example
 * // Last 30 days
 * const payload = buildTrainingAnalysisPayload({
 *   from: '2026-05-01',
 *   to:   '2026-05-31',
 *   unit: 'kg',
 *   locale: 'ja',
 * })
 *
 * @example
 * // All-time
 * const payload = buildTrainingAnalysisPayload()
 */
export function buildTrainingAnalysisPayload(
  options: BuildTrainingAnalysisPayloadOptions = {}
): TrainingAnalysisPayload {
  const { from, to, unit = 'kg', locale = 'en' } = options

  // 1. Read active records — same filter as localDB.ts getSessions() / getSets() / getBodyWeights().
  //    deleted_at == null handles both explicit null (post-migration) and
  //    undefined (pre-migration records that were never soft-deleted).
  const activeSessions = readLocal<LocalSession[]>(LS_KEYS.sessions, [])
    .filter(s => s.deleted_at == null)

  const activeSets = readLocal<LocalSet[]>(LS_KEYS.sets, [])
    .filter(s => s.deleted_at == null)

  const activeBodyWeights = readLocal<LocalBodyWeight[]>(LS_KEYS.bodyWeights, [])
    .filter(w => w.deleted_at == null)

  // 2. Apply optional date range filter.
  const sessions = activeSessions.filter(s => {
    if (from && s.trained_at < from) return false
    if (to   && s.trained_at > to)   return false
    return true
  })

  const sessionIds = new Set(sessions.map(s => s.id))

  const sets = activeSets.filter(s => sessionIds.has(s.session_id))

  const bodyWeights = activeBodyWeights.filter(w => {
    if (from && w.date < from) return false
    if (to   && w.date > to)   return false
    return true
  })

  // 3. Group sets by session_id.
  const setsBySession = new Map<string, LocalSet[]>()
  for (const s of sets) {
    const bucket = setsBySession.get(s.session_id) ?? []
    bucket.push(s)
    setsBySession.set(s.session_id, bucket)
  }

  // 4. Build session payloads with nested exercise → sets structure.
  const sessionPayloads: AiAnalysisSessionPayload[] = sessions.map(session => {
    const sessionSets = setsBySession.get(session.id) ?? []

    // Group sets by exercise name, preserving insertion order.
    const exerciseMap = new Map<string, { muscle_group: string; sets: LocalSet[] }>()
    for (const s of sessionSets) {
      const entry = exerciseMap.get(s.exercise_name)
      if (entry) {
        entry.sets.push(s)
      } else {
        exerciseMap.set(s.exercise_name, { muscle_group: s.muscle_group, sets: [s] })
      }
    }

    const exercises: AiAnalysisExercisePayload[] = Array.from(exerciseMap.entries()).map(
      ([name, { muscle_group, sets: exSets }]): AiAnalysisExercisePayload => ({
        exercise_name: name,
        muscle_group,
        sets: exSets
          .sort((a, b) => a.set_number - b.set_number)
          .map((s): AiAnalysisSetPayload => ({
            weight_kg:        s.weight_kg,
            reps:             s.reps,
            estimated_1rm_kg: estimatedOneRepMax(s.weight_kg, s.reps),
            assist_status:    s.assistStatus ?? null,
            note:             s.note,
          })),
      })
    )

    return {
      id:              session.id,
      trained_at:      session.trained_at,
      title:           session.title,
      total_volume_kg: session.total_volume_kg,
      exercises,
    }
  })

  // Sort ascending by date so the AI sees chronological progression.
  sessionPayloads.sort((a, b) => a.trained_at.localeCompare(b.trained_at))

  // 5. Collect unique exercise names for the summary.
  const allExerciseNames = new Set<string>()
  for (const s of sessionPayloads) {
    for (const ex of s.exercises) allExerciseNames.add(ex.exercise_name)
  }

  return {
    app:          'REPRA',
    type:         'training_analysis_payload',
    version:      1,
    generated_at: new Date().toISOString(),
    date_range:   { from: from ?? null, to: to ?? null },
    unit,
    locale,
    summary: {
      session_count:     sessionPayloads.length,
      total_volume_kg:   Math.round(sessionPayloads.reduce((s, p) => s + p.total_volume_kg, 0) * 10) / 10,
      exercise_count:    allExerciseNames.size,
      body_weight_count: bodyWeights.length,
    },
    sessions: sessionPayloads,
    body_weights: bodyWeights
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(w => ({ id: w.id, date: w.date, weight_kg: w.weight_kg })),
  }
}
