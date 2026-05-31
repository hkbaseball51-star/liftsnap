#!/usr/bin/env tsx
/**
 * Seed 1 year of demo training data for 3 specific users.
 *
 * Usage:
 *   ENABLE_DEMO_SEED=true npm run seed:demo
 *
 * Safety guards:
 *   - Requires ENABLE_DEMO_SEED=true
 *   - Only writes to the 3 hard-coded DEMO_TARGET_USER_IDS
 *   - Never deletes existing data
 *   - All inserted sets have note='DEMO_SEED_1_YEAR'
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── Safety guards ───────────────────────────────────────────────────────────

if (process.env.ENABLE_DEMO_SEED !== 'true') {
  console.error('\n  Error: Set ENABLE_DEMO_SEED=true to run this script.\n')
  process.exit(1)
}

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── Target users (ONLY these 3 will receive demo data) ─────────────────────

const DEMO_TARGET_USER_IDS = [
  '7bfae6d3-4036-43cd-9811-50d8f766526a',  // User A — strength focus
  '34dee9be-25e8-451e-83c4-4c94c16b4efe',  // User B — volume focus
  '2322e1d9-567d-4f4f-913a-1accac66b5eb',  // User C — beginner
] as const

// ── Supabase client (service role, bypasses RLS) ────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Add ±jitter fraction of the value (deterministic using rand)
function jitter(value: number, fraction: number, rand: () => number) {
  return Math.round(value * (1 + (rand() - 0.5) * 2 * fraction) * 2) / 2  // nearest 0.5
}

function est1rm(weightKg: number, reps: number) {
  return reps === 1 ? weightKg : Math.round(weightKg * (1 + reps / 30))
}

// ISO date string for JST (just uses local-ish offset for seed purposes)
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

// ── Workout definitions ─────────────────────────────────────────────────────

type ExerciseDef = {
  name: string
  muscle: string  // UPPERCASE per CHECK constraint
  sets: number
}

type WorkoutDef = {
  title: string
  exercises: ExerciseDef[]
}

const WORKOUTS: Record<string, WorkoutDef> = {
  PUSH: {
    title: 'Push',
    exercises: [
      { name: 'Bench Press',           muscle: 'CHEST',     sets: 4 },
      { name: 'Incline Dumbbell Press', muscle: 'CHEST',     sets: 3 },
      { name: 'Overhead Press',        muscle: 'SHOULDERS', sets: 3 },
      { name: 'Triceps Pushdown',      muscle: 'TRICEPS',   sets: 3 },
    ],
  },
  PULL: {
    title: 'Pull',
    exercises: [
      { name: 'Deadlift',        muscle: 'BACK',    sets: 4 },
      { name: 'Lat Pulldown',    muscle: 'BACK',    sets: 3 },
      { name: 'Seated Cable Row', muscle: 'BACK',    sets: 3 },
      { name: 'Barbell Curl',    muscle: 'BICEPS',  sets: 3 },
    ],
  },
  LEGS: {
    title: 'Legs',
    exercises: [
      { name: 'Squat',               muscle: 'QUADS',       sets: 4 },
      { name: 'Romanian Deadlift',   muscle: 'HAMSTRINGS',  sets: 3 },
      { name: 'Leg Press',           muscle: 'QUADS',       sets: 3 },
      { name: 'Leg Curl',            muscle: 'HAMSTRINGS',  sets: 3 },
    ],
  },
  FULL: {
    title: 'Full Body',
    exercises: [
      { name: 'Bench Press',   muscle: 'CHEST', sets: 3 },
      { name: 'Squat',         muscle: 'QUADS', sets: 3 },
      { name: 'Bent Over Row', muscle: 'BACK',  sets: 3 },
    ],
  },
  SHOULDERS: {
    title: 'Shoulders',
    exercises: [
      { name: 'Overhead Press',  muscle: 'SHOULDERS', sets: 4 },
      { name: 'Lateral Raise',   muscle: 'SHOULDERS', sets: 4 },
      { name: 'Front Raise',     muscle: 'SHOULDERS', sets: 3 },
    ],
  },
  ARMS: {
    title: 'Arms',
    exercises: [
      { name: 'Barbell Curl',       muscle: 'BICEPS',   sets: 4 },
      { name: 'Triceps Pushdown',   muscle: 'TRICEPS',  sets: 4 },
      { name: 'Hammer Curl',        muscle: 'BICEPS',   sets: 3 },
    ],
  },
}

// ── Per-exercise base weights (kg) at week 0 for each user ─────────────────
// Keys must match exercise names in WORKOUTS above.

type WeightPair = { start: number; end: number }

type UserProfile = {
  name: string
  repRange: [number, number]          // [min, max] reps per set
  bodyWeightStart: number
  bodyWeightEnd: number
  weights: Record<string, WeightPair> // exercise name → start/end kg
}

const USER_PROFILES: Record<string, UserProfile> = {
  '7bfae6d3-4036-43cd-9811-50d8f766526a': {
    name: 'User A (Strength)',
    repRange: [4, 6],
    bodyWeightStart: 78,
    bodyWeightEnd:   82,
    weights: {
      'Bench Press':            { start: 70,  end: 103 },  // est1RM ~82→120
      'Incline Dumbbell Press': { start: 26,  end: 38  },  // dumbbell each side
      'Overhead Press':         { start: 50,  end: 72  },
      'Triceps Pushdown':       { start: 25,  end: 40  },
      'Deadlift':               { start: 110, end: 148 },  // est1RM ~121→163
      'Lat Pulldown':           { start: 55,  end: 80  },
      'Seated Cable Row':       { start: 55,  end: 80  },
      'Barbell Curl':           { start: 35,  end: 50  },
      'Squat':                  { start: 87,  end: 128 },  // est1RM ~101→149
      'Romanian Deadlift':      { start: 80,  end: 115 },
      'Leg Press':              { start: 130, end: 200 },
      'Leg Curl':               { start: 35,  end: 55  },
      'Bent Over Row':          { start: 65,  end: 95  },
      'Lateral Raise':          { start: 10,  end: 16  },
      'Front Raise':            { start: 10,  end: 15  },
      'Hammer Curl':            { start: 18,  end: 28  },
    },
  },

  '34dee9be-25e8-451e-83c4-4c94c16b4efe': {
    name: 'User B (Volume)',
    repRange: [8, 12],
    bodyWeightStart: 73,
    bodyWeightEnd:   69,
    weights: {
      'Bench Press':            { start: 52,  end: 80  },  // est1RM ~69→107
      'Incline Dumbbell Press': { start: 18,  end: 28  },
      'Overhead Press':         { start: 35,  end: 55  },
      'Triceps Pushdown':       { start: 18,  end: 30  },
      'Deadlift':               { start: 79,  end: 113 },  // est1RM ~105→151
      'Lat Pulldown':           { start: 40,  end: 62  },
      'Seated Cable Row':       { start: 40,  end: 62  },
      'Barbell Curl':           { start: 22,  end: 35  },
      'Squat':                  { start: 64,  end: 98  },  // est1RM ~85→131
      'Romanian Deadlift':      { start: 50,  end: 78  },
      'Leg Press':              { start: 90,  end: 140 },
      'Leg Curl':               { start: 25,  end: 40  },
      'Bent Over Row':          { start: 45,  end: 70  },
      'Lateral Raise':          { start: 7,   end: 12  },
      'Front Raise':            { start: 7,   end: 12  },
      'Hammer Curl':            { start: 12,  end: 20  },
    },
  },

  '2322e1d9-567d-4f4f-913a-1accac66b5eb': {
    name: 'User C (Beginner)',
    repRange: [10, 15],
    bodyWeightStart: 68,
    bodyWeightEnd:   65,
    weights: {
      'Bench Press':            { start: 36,  end: 60  },  // est1RM ~50→84
      'Incline Dumbbell Press': { start: 12,  end: 20  },
      'Overhead Press':         { start: 25,  end: 42  },
      'Triceps Pushdown':       { start: 12,  end: 22  },
      'Deadlift':               { start: 64,  end: 96  },  // est1RM ~90→134
      'Lat Pulldown':           { start: 28,  end: 48  },
      'Seated Cable Row':       { start: 28,  end: 48  },
      'Barbell Curl':           { start: 15,  end: 28  },
      'Squat':                  { start: 50,  end: 82  },  // est1RM ~70→115
      'Romanian Deadlift':      { start: 45,  end: 75  },
      'Leg Press':              { start: 70,  end: 120 },
      'Leg Curl':               { start: 20,  end: 35  },
      'Bent Over Row':          { start: 30,  end: 52  },
      'Lateral Raise':          { start: 5,   end: 10  },
      'Front Raise':            { start: 5,   end: 10  },
      'Hammer Curl':            { start: 8,   end: 14  },
    },
  },
}

// ── Weekly schedule templates ───────────────────────────────────────────────
// Each entry = [dayOffset, workoutKey]
// Week cycles through different patterns for variety

const WEEK_PATTERNS: Array<Array<[number, string]>> = [
  // Pattern A: classic PPL 4-day
  [[1, 'PUSH'], [3, 'PULL'], [5, 'LEGS'], [6, 'PUSH']],
  // Pattern B: PPL + shoulders
  [[1, 'PULL'], [3, 'LEGS'], [5, 'PUSH'], [6, 'SHOULDERS']],
  // Pattern C: PPL + arms
  [[1, 'LEGS'], [3, 'PUSH'], [5, 'PULL'], [6, 'ARMS']],
  // Pattern D: 3-day PPL (rest week)
  [[1, 'PUSH'], [3, 'PULL'], [5, 'LEGS']],
  // Pattern E: full body week
  [[1, 'FULL'], [3, 'FULL'], [5, 'FULL']],
  // Pattern F: classic PPL with extra FULL
  [[1, 'PUSH'], [3, 'PULL'], [5, 'LEGS'], [7, 'FULL']],
]

// Distribution of patterns over 52 weeks (index into WEEK_PATTERNS)
// Roughly: 60% 4-day PPL variants, 20% 3-day, 10% full-body, 10% extra
function patternIndexForWeek(weekNum: number, rand: () => number): number {
  const r = rand()
  if (r < 0.08) return 4       // full-body week (8%)
  if (r < 0.22) return 3       // rest/deload week (14%)
  if (r < 0.40) return 1       // PPL + shoulders (18%)
  if (r < 0.55) return 2       // PPL + arms (15%)
  if (r < 0.70) return 5       // PPL + full (15%)
  return 0                     // classic 4-day PPL (30%)
}

// ── Core generation ─────────────────────────────────────────────────────────

async function seedUser(userId: string) {
  const profile = USER_PROFILES[userId]
  if (!profile) throw new Error(`No profile for user ${userId}`)

  // Deterministic RNG seeded by user ID hash
  const seed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = rng(seed)

  const today      = new Date('2026-05-31')
  const startDate  = addDays(today, -364)  // 52 weeks ago (Mon of that week)
  const TOTAL_WEEKS = 52

  let sessionCount = 0
  let setCount     = 0
  const bodyWeightRows: Array<{ user_id: string; weight_kg: number; recorded_at: string }> = []

  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const progress   = w / (TOTAL_WEEKS - 1)            // 0 → 1
    const weekStart  = addDays(startDate, w * 7)

    // Weekly body weight (roughly every 1-2 weeks, on Monday)
    if (w % 2 === 0 || rand() > 0.5) {
      const bw = lerp(profile.bodyWeightStart, profile.bodyWeightEnd, progress)
      bodyWeightRows.push({
        user_id: userId,
        weight_kg: Math.round(jitter(bw, 0.01, rand) * 2) / 2,
        recorded_at: toDateStr(weekStart),
      })
    }

    const patternIdx = patternIndexForWeek(w, rand)
    const daySlots   = WEEK_PATTERNS[patternIdx]

    for (const [dayOffset, workoutKey] of daySlots) {
      // Occasionally skip a session (~10% chance per session)
      if (rand() < 0.10) continue

      const sessionDate = addDays(weekStart, dayOffset)
      if (sessionDate > today) continue

      const workout = WORKOUTS[workoutKey]
      const sessionId = randomUUID()
      const trainedAt = toDateStr(sessionDate)

      // Build sets for this session
      type SetRow = {
        session_id: string
        exercise_name: string
        muscle_group: string
        weight_kg: number
        reps: number
        set_number: number
        is_completed: boolean
        note: string
      }
      const setRows: SetRow[] = []
      let totalVolume = 0

      for (const ex of workout.exercises) {
        const pair = profile.weights[ex.name]
        if (!pair) continue

        const baseWeight = lerp(pair.start, pair.end, progress)

        for (let s = 0; s < ex.sets; s++) {
          // Fatigue: each set the weight drops slightly
          const fatigueMultiplier = 1 - s * 0.025
          const w_kg = jitter(baseWeight * fatigueMultiplier, 0.05, rand)
          const reps  = profile.repRange[0]
                      + Math.floor(rand() * (profile.repRange[1] - profile.repRange[0] + 1))

          setRows.push({
            session_id: sessionId,
            exercise_name: ex.name,
            muscle_group: ex.muscle,
            weight_kg: Math.max(2.5, Math.round(w_kg * 2) / 2),  // nearest 0.5, min 2.5
            reps,
            set_number: s + 1,
            is_completed: true,
            note: 'DEMO_SEED_1_YEAR',
          })

          totalVolume += w_kg * reps
        }
      }

      if (setRows.length === 0) continue

      // Insert session
      const { error: sessionError } = await supabase.from('workout_sessions').insert({
        id: sessionId,
        user_id: userId,
        title: workout.title,
        trained_at: trainedAt,
        total_volume_kg: Math.round(totalVolume),
        duration_seconds: 2400 + Math.floor(rand() * 1800),  // 40–70 min
        completed_at: new Date(sessionDate.getTime() + 3600 * 1000).toISOString(),
      })

      if (sessionError) {
        console.error(`Session insert error (user ${userId}, ${trainedAt}):`, sessionError.message)
        continue
      }

      // Insert sets in one batch
      const { error: setsError } = await supabase.from('workout_sets').insert(setRows)
      if (setsError) {
        console.error(`Sets insert error (session ${sessionId}):`, setsError.message)
        continue
      }

      sessionCount++
      setCount += setRows.length
    }
  }

  // Upsert body weights (UNIQUE user_id,recorded_at — skip existing)
  let bwInserted = 0
  for (const row of bodyWeightRows) {
    const { error } = await supabase
      .from('body_weights')
      .upsert(row, { onConflict: 'user_id,recorded_at', ignoreDuplicates: true })
    if (!error) bwInserted++
  }

  console.log(
    `  ${profile.name}: ${sessionCount} sessions, ${setCount} sets, ${bwInserted} body-weight entries`
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== REPRA Demo Seed — 1 year of training data ===\n')
  console.log(`Target users: ${DEMO_TARGET_USER_IDS.length}\n`)

  for (const userId of DEMO_TARGET_USER_IDS) {
    process.stdout.write(`Seeding ${userId.slice(0, 8)}…`)
    try {
      await seedUser(userId)
    } catch (err) {
      console.error(`\n  Failed for ${userId}:`, err)
    }
  }

  console.log('\nDone.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
