#!/usr/bin/env tsx
/**
 * Seed 1 year of realistic demo training data for REPRA analytics verification.
 *
 * Usage:
 *   ENABLE_DEMO_SEED=true npx tsx --env-file .env.local scripts/seed-repra-demo-data.ts [--clean]
 *   or: ENABLE_DEMO_SEED=true npm run seed:repra [-- --clean]
 *
 * Flags:
 *   --clean   Delete ALL existing workout/body-weight data for this user before inserting.
 *             (Only touches USER_ID below — never other users.)
 *
 * Safety guards:
 *   - Requires ENABLE_DEMO_SEED=true
 *   - Only writes to the one hard-coded USER_ID
 *   - Never touches any other user's data
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── Safety guards ───────────────────────────────────────────────────────────

if (process.env.ENABLE_DEMO_SEED !== 'true') {
  console.error('\n  Error: Set ENABLE_DEMO_SEED=true to run this script.\n')
  process.exit(1)
}

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('  Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}

const USER_ID = '7bfae6d3-4036-43cd-9811-50d8f766526a'
const CLEAN   = process.argv.includes('--clean')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Deterministic PRNG ──────────────────────────────────────────────────────
// Seeded so results are reproducible across runs.

function makePrng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0x100000000
  }
}

const rand = makePrng(0xdeadbeef)

function nearest(v: number, step = 0.5): number {
  return Math.round(v / step) * step
}

// ── Non-linear progress curve (0 = start weights, 1 = end weights) ─────────
//
// Phase 1 (weeks  0–12): Fast growth       0.00 → 0.40
// Phase 2 (weeks 13–30): Growth slows     0.40 → 0.62
// Phase 3 (weeks 31–43): Plateau / dip    0.62 → 0.57  (fatigue + life)
// Phase 4 (weeks 44–51): Partial recovery 0.57 → 0.72

const KEYFRAMES: [week: number, progress: number][] = [
  [0,  0.00],
  [12, 0.40],
  [30, 0.62],
  [37, 0.56],   // dip
  [43, 0.57],   // plateau bottom
  [51, 0.72],   // recovery peak
]

function getProgress(week: number): number {
  const w = Math.max(0, Math.min(51, week))
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const [w0, p0] = KEYFRAMES[i]
    const [w1, p1] = KEYFRAMES[i + 1]
    if (w <= w1) {
      const t = (w - w0) / (w1 - w0)
      return p0 + (p1 - p0) * t
    }
  }
  return KEYFRAMES[KEYFRAMES.length - 1][1]
}

// ── Exercise definitions ────────────────────────────────────────────────────
// weight targets are calculated so that the Epley 1RM (w*(1+reps/30))
// hits the desired ranges at start and end of the year.
//
// ベンチプレス: initial 1RM ~62kg (rep5), final ~119kg  (start=53, end=102)
// スクワット  : initial 1RM ~76kg (rep5), final ~149kg  (start=65, end=128)
// デッドリフト: initial 1RM ~90kg (rep4), final ~181kg  (start=80, end=160)

type ExDef = {
  name:        string
  muscle:      string
  setRange:    [number, number]   // [min, max] sets
  repRange:    [number, number]   // [min, max] reps per set
  wStart:      number             // kg at week 0
  wEnd:        number             // kg at week 51
}

const BENCH:  ExDef = { name: 'ベンチプレス',              muscle: 'CHEST',      setRange: [3,5], repRange: [4,8],  wStart: 53,  wEnd: 102 }
const INCLINE: ExDef = { name: 'インクラインベンチプレス',   muscle: 'CHEST',      setRange: [3,4], repRange: [6,10], wStart: 38,  wEnd: 70  }
const OHP:    ExDef = { name: 'ショルダープレス',           muscle: 'SHOULDERS',  setRange: [3,4], repRange: [6,10], wStart: 35,  wEnd: 62  }
const TRICEP: ExDef = { name: 'トライセップスプレスダウン',  muscle: 'TRICEPS',    setRange: [3,4], repRange: [8,12], wStart: 22,  wEnd: 40  }
const DL:     ExDef = { name: 'デッドリフト',               muscle: 'BACK',       setRange: [2,4], repRange: [3,5],  wStart: 80,  wEnd: 160 }
const LAT:    ExDef = { name: 'ラットプルダウン',            muscle: 'BACK',       setRange: [3,4], repRange: [8,12], wStart: 50,  wEnd: 80  }
const ROW:    ExDef = { name: 'シーテッドロウ',              muscle: 'BACK',       setRange: [3,4], repRange: [8,12], wStart: 50,  wEnd: 78  }
const CURL:   ExDef = { name: 'バーベルカール',              muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12], wStart: 28,  wEnd: 50  }
const SQUAT:  ExDef = { name: 'スクワット',                  muscle: 'QUADS',      setRange: [3,5], repRange: [4,8],  wStart: 65,  wEnd: 128 }
const RDL:    ExDef = { name: 'ルーマニアンデッドリフト',    muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [6,10], wStart: 65,  wEnd: 108 }
const LPRESS: ExDef = { name: 'レッグプレス',                muscle: 'QUADS',      setRange: [3,4], repRange: [8,12], wStart: 110, wEnd: 180 }
const LCURL:  ExDef = { name: 'レッグカール',                 muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [8,12], wStart: 32,  wEnd: 55  }

// ── Workout templates ───────────────────────────────────────────────────────

type WorkoutDef = { title: string; exercises: ExDef[] }

const PUSH_A: WorkoutDef = { title: 'PUSH', exercises: [BENCH, INCLINE, OHP, TRICEP] }
const PUSH_B: WorkoutDef = { title: 'PUSH', exercises: [BENCH, OHP, TRICEP] }
const PULL_A: WorkoutDef = { title: 'PULL', exercises: [DL, LAT, ROW, CURL] }
const PULL_B: WorkoutDef = { title: 'PULL', exercises: [DL, LAT, ROW] }
const LEGS_A: WorkoutDef = { title: 'LEGS', exercises: [SQUAT, RDL, LPRESS, LCURL] }
const LEGS_B: WorkoutDef = { title: 'LEGS', exercises: [SQUAT, RDL, LPRESS] }

// ── Weekly schedule ─────────────────────────────────────────────────────────
// 4 sessions/week: Mon PUSH_A | Wed PULL_A | Fri LEGS_A | Sat rotating
// Sat cycle (week % 3): 0 → PUSH_B  1 → PULL_B  2 → LEGS_B
//
// This guarantees each main lift appears ~64 times before the skip rate,
// landing at ≥57 sessions each after skips.

function getWeekSessions(w: number): { dayOffset: number; workout: WorkoutDef }[] {
  const satWorkout = [PUSH_B, PULL_B, LEGS_B][w % 3]
  return [
    { dayOffset: 1, workout: PUSH_A },      // Monday
    { dayOffset: 3, workout: PULL_A },      // Wednesday
    { dayOffset: 5, workout: LEGS_A },      // Friday
    { dayOffset: 6, workout: satWorkout },  // Saturday
  ]
}

// ── Date helpers ────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── Clean existing data (only USER_ID) ─────────────────────────────────────

async function cleanUserData() {
  console.log('  Fetching existing sessions…')
  const { data: sessions, error: fetchErr } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', USER_ID)

  if (fetchErr) {
    console.error('  Fetch error:', fetchErr.message)
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log('  No existing sessions found.')
  } else {
    const ids = sessions.map(s => s.id)

    // workout_sets has ON DELETE CASCADE from workout_sessions, but we delete
    // explicitly to be safe and to get a count.
    const { error: setsErr } = await supabase
      .from('workout_sets')
      .delete()
      .in('session_id', ids)
    if (setsErr) console.error('  Sets delete error:', setsErr.message)

    const { error: sessErr } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('user_id', USER_ID)
    if (sessErr) console.error('  Sessions delete error:', sessErr.message)
    else console.log(`  Deleted ${ids.length} sessions (and their sets).`)
  }

  const { error: bwErr } = await supabase
    .from('body_weights')
    .delete()
    .eq('user_id', USER_ID)
  if (bwErr) console.error('  Body-weight delete error:', bwErr.message)
  else console.log('  Deleted body-weight records.')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== REPRA Demo Data Seed ===\n')
  console.log(`  Target user : ${USER_ID}`)
  console.log(`  Clean first : ${CLEAN}`)
  console.log()

  if (CLEAN) {
    console.log('[ CLEAN ] Deleting existing data for this user…')
    await cleanUserData()
    console.log()
  }

  const today     = new Date('2026-06-01T00:00:00Z')
  const startDate = addDays(today, -364)   // ~52 weeks back

  let totalSessions = 0
  let totalSets     = 0

  // Track how many sessions each exercise appears in
  const exSessionCounts: Record<string, number> = {}

  // Body weight rows to batch-upsert at the end
  const bwRows: { user_id: string; weight_kg: number; recorded_at: string }[] = []

  const BW_START = 59.0
  const BW_END   = 66.0

  console.log('[ INSERT ] Generating 52 weeks of training data…')

  for (let w = 0; w < 52; w++) {
    const progress  = getProgress(w)
    const weekStart = addDays(startDate, w * 7)

    // Body weight: record every week on Monday, plus every other week on Thursday.
    // This gives ~78 records (52 Mon + 26 Thu) before jitter.
    const baseBw = BW_START + (BW_END - BW_START) * (w / 51)
    const monBw  = nearest(Math.max(57.0, baseBw + (rand() - 0.5) * 1.4), 0.5)
    bwRows.push({ user_id: USER_ID, weight_kg: monBw, recorded_at: toDateStr(weekStart) })

    if (w % 2 === 0) {
      const thuDate = addDays(weekStart, 3)
      if (thuDate <= today) {
        const thuBw = nearest(Math.max(57.0, baseBw + (rand() - 0.5) * 1.4), 0.5)
        bwRows.push({ user_id: USER_ID, weight_kg: thuBw, recorded_at: toDateStr(thuDate) })
      }
    }

    const sessions = getWeekSessions(w)

    for (const { dayOffset, workout } of sessions) {
      // Skip rate: 8% in first half (beginner inconsistency), 6% in second half
      const skipRate = w < 26 ? 0.08 : 0.06
      if (rand() < skipRate) continue

      const sessionDate = addDays(weekStart, dayOffset)
      if (sessionDate > today) continue

      const sessionId = randomUUID()
      const trainedAt = toDateStr(sessionDate)

      // "Bad day": 10% chance — fatigue multiplier 0.88–0.94
      const isBadDay      = rand() < 0.10
      const badDayFactor  = isBadDay ? 0.88 + rand() * 0.06 : 1.0

      type SetRow = {
        session_id:    string
        exercise_name: string
        muscle_group:  string
        weight_kg:     number
        reps:          number
        set_number:    number
        is_completed:  boolean
        note:          string
      }

      const setRows: SetRow[]  = []
      let   totalVolume        = 0
      const sessionExercises: string[] = []

      for (const ex of workout.exercises) {
        const baseWeight = ex.wStart + (ex.wEnd - ex.wStart) * progress
        const numSets    = ex.setRange[0] + Math.floor(rand() * (ex.setRange[1] - ex.setRange[0] + 1))

        sessionExercises.push(ex.name)

        for (let s = 0; s < numSets; s++) {
          // Within-session fatigue: 2.5% per set after the first
          const setFatigue    = 1 - s * 0.025
          // Small session-to-session noise: ±4%
          const sessionNoise  = 1 + (rand() - 0.5) * 0.08

          const rawWeight     = baseWeight * badDayFactor * setFatigue * sessionNoise
          const wKg           = nearest(Math.max(2.5, rawWeight), 0.5)
          const reps          = ex.repRange[0]
                              + Math.floor(rand() * (ex.repRange[1] - ex.repRange[0] + 1))

          setRows.push({
            session_id:    sessionId,
            exercise_name: ex.name,
            muscle_group:  ex.muscle,
            weight_kg:     wKg,
            reps,
            set_number:    s + 1,   // per-exercise set number
            is_completed:  true,
            note:          'DEMO_DATA',
          })

          totalVolume += wKg * reps
        }
      }

      if (setRows.length === 0) continue

      // Insert session row
      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id:               sessionId,
        user_id:          USER_ID,
        title:            workout.title,
        trained_at:       trainedAt,
        total_volume_kg:  Math.round(totalVolume),
        duration_seconds: 2400 + Math.floor(rand() * 1800),  // 40–70 min
        completed_at:     new Date(sessionDate.getTime() + 3_600_000).toISOString(),
      })

      if (sessErr) {
        console.error(`  Session insert error (${trainedAt}):`, sessErr.message)
        continue
      }

      // Insert sets in one batch
      const { error: setsErr } = await supabase.from('workout_sets').insert(setRows)
      if (setsErr) {
        console.error(`  Sets insert error (${sessionId}):`, setsErr.message)
        // Roll back the session we just inserted
        await supabase.from('workout_sessions').delete().eq('id', sessionId)
        continue
      }

      // Count per-exercise session appearances (only after successful insert)
      for (const name of sessionExercises) {
        exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
      }

      totalSessions++
      totalSets += setRows.length

      // Progress indicator every 20 sessions
      if (totalSessions % 20 === 0) {
        process.stdout.write(`  ${totalSessions} sessions inserted…\r`)
      }
    }
  }

  // Upsert body weights (unique constraint: user_id, recorded_at)
  let bwInserted = 0
  for (const row of bwRows) {
    const { error } = await supabase
      .from('body_weights')
      .upsert(row, { onConflict: 'user_id,recorded_at', ignoreDuplicates: true })
    if (!error) bwInserted++
  }

  // ── Final report ──────────────────────────────────────────────────────────

  const bench = exSessionCounts['ベンチプレス']  ?? 0
  const squat = exSessionCounts['スクワット']    ?? 0
  const deadl = exSessionCounts['デッドリフト']  ?? 0

  console.log('\n')
  console.log('═══════════════════════════════════════')
  console.log('  REPRA Demo Seed — Complete')
  console.log('═══════════════════════════════════════\n')
  console.log(`  User ID              : ${USER_ID}`)
  console.log(`  Date range           : ${toDateStr(startDate)} → ${toDateStr(today)}`)
  console.log(`  Total sessions       : ${totalSessions}`)
  console.log(`  Total sets           : ${totalSets}`)
  console.log(`  Body weight records  : ${bwInserted}`)
  console.log()
  console.log('  Exercise sessions (★ = main lifts):')

  const sortedExercises = Object.entries(exSessionCounts)
    .sort(([, a], [, b]) => b - a)

  const mainLifts = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  for (const [name, count] of sortedExercises) {
    const tag = mainLifts.has(name) ? ' ★' : '  '
    console.log(`  ${tag} ${name.padEnd(26)} ${count}`)
  }

  console.log()
  console.log('  Requirement checks:')

  function check(label: string, actual: number, min: number) {
    const ok = actual >= min
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual} (need ≥${min})`)
    return ok
  }

  const allOk = [
    check('ベンチプレス sessions', bench, 50),
    check('スクワット   sessions', squat, 50),
    check('デッドリフト sessions', deadl, 50),
    check('Total sessions       ', totalSessions, 150),
    check('Body weight records  ', bwInserted, 50),
  ].every(Boolean)

  console.log()
  if (allOk) {
    console.log('  All checks passed ✓\n')
  } else {
    console.log('  Some checks failed — review output above.\n')
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
