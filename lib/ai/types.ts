// AI feature type definitions.
// No API connections — these are data-contract types only.
// All AI actions require explicit user confirmation before writing to localDB.

import type { AssistStatus } from '@/lib/localDB'

// ── AI Quick Log ──────────────────────────────────────────────────────────────
// User types free-form text; AI returns a structured draft for user review.

export type AiQuickLogInput = {
  text: string
  trained_at?: string      // YYYY-MM-DD; defaults to today if omitted
  locale?: 'ja' | 'en'
  unit?: 'kg' | 'lb'
}

export type AiSetDraft = {
  weight_kg?: number | null
  reps?: number | null
  note?: string | null
  assist_status?: AssistStatus
}

export type AiExerciseDraft = {
  exercise_name: string
  muscle_group?: string | null
  sets: AiSetDraft[]
}

// Never saved automatically — always shown to the user for confirmation first.
export type AiQuickLogDraft = {
  session_title?: string
  trained_at?: string
  exercises: AiExerciseDraft[]
  note?: string | null
  warnings?: string[]          // e.g. "ambiguous weight unit", "exercise not recognized"
}

// ── Training Analysis ─────────────────────────────────────────────────────────

export type BuildTrainingAnalysisPayloadOptions = {
  from?: string    // YYYY-MM-DD inclusive; omit for all-time start
  to?: string      // YYYY-MM-DD inclusive; omit for today
  unit?: 'kg' | 'lb'
  locale?: 'ja' | 'en'
}

export type AiAnalysisSetPayload = {
  weight_kg: number | null
  reps: number | null
  estimated_1rm_kg: number | null
  assist_status: AssistStatus | null
  note: string | null
}

export type AiAnalysisExercisePayload = {
  exercise_name: string
  muscle_group: string
  sets: AiAnalysisSetPayload[]
}

export type AiAnalysisSessionPayload = {
  id: string
  trained_at: string           // YYYY-MM-DD
  title: string
  total_volume_kg: number
  exercises: AiAnalysisExercisePayload[]
}

export type AiAnalysisBodyWeightPayload = {
  id?: string
  date: string                 // YYYY-MM-DD
  weight_kg: number
}

export type TrainingAnalysisPayload = {
  app: 'REPRA'
  type: 'training_analysis_payload'
  version: 1
  generated_at: string         // ISO 8601
  date_range: {
    from: string | null
    to: string | null
  }
  unit: 'kg' | 'lb'
  locale: 'ja' | 'en'
  summary: {
    session_count: number
    total_volume_kg: number
    exercise_count: number
    body_weight_count: number
  }
  sessions: AiAnalysisSessionPayload[]
  body_weights: AiAnalysisBodyWeightPayload[]
}

// ── AI Memo Generation ────────────────────────────────────────────────────────
// Session data in → suggested memo text out (user-editable before saving).

export type AiMemoInput = {
  session: AiAnalysisSessionPayload
  locale?: 'ja' | 'en'
}

export type AiMemoDraft = {
  memo: string
  warnings?: string[]
}
