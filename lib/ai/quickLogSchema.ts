// Zod schemas and validation utilities for AI Quick Log and Analysis responses.
// No AI API connections — validation-only utilities.
// Protects the app from malformed AI-returned JSON.

import { z } from 'zod'
import type { AiQuickLogDraft } from './types'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const AiSetDraftSchema = z.object({
  weight_kg:     z.number().nullable().optional(),
  reps:          z.number().int().nonnegative().nullable().optional(),
  note:          z.string().nullable().optional(),
  assist_status: z.enum(['none', 'assisted', 'failed', 'warmup']).optional(),
})

const AiExerciseDraftSchema = z.object({
  exercise_name: z.string().min(1),
  muscle_group:  z.string().nullable().optional(),
  sets:          z.array(AiSetDraftSchema).min(1),
})

export const AiQuickLogDraftSchema = z.object({
  session_title: z.string().optional(),
  trained_at:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exercises:     z.array(AiExerciseDraftSchema).min(1),
  note:          z.string().nullable().optional(),
  warnings:      z.array(z.string()).optional(),
})

// Schema for a future AI training analysis response.
export const TrainingAnalysisResponseSchema = z.object({
  type:    z.literal('training_analysis_response'),
  version: z.literal(1),
  analysis: z.object({
    summary:        z.string(),
    highlights:     z.array(z.string()),
    suggestions:    z.array(z.string()),
    muscle_balance: z.record(z.string(), z.number()).optional(),
  }),
  warnings: z.array(z.string()).optional(),
})

// Schema for a future AI memo generation response.
export const AiMemoResponseSchema = z.object({
  type:     z.literal('ai_memo_response'),
  version:  z.literal(1),
  memo:     z.string().min(1),
  warnings: z.array(z.string()).optional(),
})

// ── Inferred types from schemas ───────────────────────────────────────────────

export type AiTrainingAnalysisResponse = z.infer<typeof TrainingAnalysisResponseSchema>
export type AiMemoResponse = z.infer<typeof AiMemoResponseSchema>

// ── Validation functions ──────────────────────────────────────────────────────

/**
 * Validates and coerces an unknown value (e.g. parsed AI JSON) into a
 * type-safe AiQuickLogDraft. Returns null if the structure is invalid.
 *
 * Individual numeric fields are re-checked after schema parsing to guard
 * against edge cases where a schema coercion might produce unexpected types.
 * The app never crashes on bad AI output — it simply returns null.
 *
 * @example
 * const raw = JSON.parse(aiResponseText)
 * const draft = validateAiQuickLogDraft(raw)
 * if (!draft) { showError('AI returned an unrecognizable format') }
 */
export function validateAiQuickLogDraft(value: unknown): AiQuickLogDraft | null {
  const result = AiQuickLogDraftSchema.safeParse(value)
  if (!result.success) return null

  const draft = result.data

  // Extra coercion pass: ensure numeric fields are strict numbers or null.
  const cleanedExercises = draft.exercises.map(ex => ({
    ...ex,
    sets: ex.sets.map(set => ({
      ...set,
      weight_kg: typeof set.weight_kg === 'number' && isFinite(set.weight_kg)
        ? set.weight_kg
        : null,
      reps: typeof set.reps === 'number' && isFinite(set.reps) && set.reps >= 0
        ? Math.floor(set.reps)
        : null,
    })),
  }))

  return { ...draft, exercises: cleanedExercises }
}

/**
 * Validates an unknown value as a TrainingAnalysisResponse.
 * Returns null if invalid.
 */
export function validateTrainingAnalysisResponse(
  value: unknown
): AiTrainingAnalysisResponse | null {
  const result = TrainingAnalysisResponseSchema.safeParse(value)
  return result.success ? result.data : null
}

/**
 * Validates an unknown value as an AiMemoResponse.
 * Returns null if invalid.
 */
export function validateAiMemoResponse(value: unknown): AiMemoResponse | null {
  const result = AiMemoResponseSchema.safeParse(value)
  return result.success ? result.data : null
}
