#!/usr/bin/env tsx
/**
 * Seed 1 year of realistic demo training data for REPRA analytics verification.
 *
 * Usage:
 *   ENABLE_DEMO_SEED=true npx tsx --env-file .env.local scripts/seed-repra-demo-data.ts
 *
 * Always deletes existing data for USER_ID first, then inserts fresh data.
 * Date range: 2025-06-05 → 2026-06-05
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Deterministic PRNG ──────────────────────────────────────────────────────

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

// ── Non-linear progress curve (0 = wStart, 1 = wEnd) ──────────────────────
//
// Beginner gains (0–9) → intermediate (9–18) → plateau (18–26) →
// second wind (26–35) → hard phase (35–44) → peak (44–51)
//
// The small dip at week 26 keeps the chart natural without dramatic swings.

const KEYFRAMES: [week: number, progress: number][] = [
  [0,  0.00],
  [9,  0.33],
  [18, 0.56],
  [26, 0.53],
  [35, 0.68],
  [44, 0.88],
  [51, 1.00],
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
// wStart / wEnd are actual working weights (kg) at week 0 and week 51.
// Epley 1RM = w * (1 + reps / 30).
//
// Big3 progression (working weight → 1RM at typical reps):
//   BENCH:    50 → 95 kg   (1RM at 5r: 60 → 111 kg;  today special: 100 kg)
//   SQUAT:    75 → 130 kg  (1RM at 6r: 90 → 156 kg)
//   DEADLIFT: 85 → 148 kg  (1RM at 4r: 96 → 168 kg)

type ExDef = {
  name:     string
  muscle:   string
  setRange: [number, number]
  repRange: [number, number]
  wStart:   number
  wEnd:     number
}

// ── Compound lifts
const BENCH:       ExDef = { name: 'ベンチプレス',              muscle: 'CHEST',      setRange: [3,5], repRange: [4,8],   wStart: 50,  wEnd: 95  }
const INCLINE:     ExDef = { name: 'インクラインベンチプレス',   muscle: 'CHEST',      setRange: [3,4], repRange: [6,10],  wStart: 33,  wEnd: 63  }
const OHP:         ExDef = { name: 'ショルダープレス',           muscle: 'SHOULDERS',  setRange: [3,4], repRange: [6,10],  wStart: 28,  wEnd: 52  }
const DL:          ExDef = { name: 'デッドリフト',               muscle: 'BACK',       setRange: [3,5], repRange: [3,5],   wStart: 85,  wEnd: 148 }
const SQUAT:       ExDef = { name: 'スクワット',                  muscle: 'QUADS',      setRange: [3,5], repRange: [4,8],   wStart: 75,  wEnd: 130 }
const RDL:         ExDef = { name: 'ルーマニアンデッドリフト',    muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [6,10],  wStart: 60,  wEnd: 104 }

// ── Isolation / accessory
const CABLE_FLY:   ExDef = { name: 'ケーブルフライ',             muscle: 'CHEST',      setRange: [3,4], repRange: [10,15], wStart: 12,  wEnd: 27  }
const LAT_RAISE:   ExDef = { name: 'サイドレイズ',               muscle: 'SHOULDERS',  setRange: [3,4], repRange: [10,15], wStart: 5,   wEnd: 12  }
const FACE_PULL:   ExDef = { name: 'フェイスプル',               muscle: 'SHOULDERS',  setRange: [3,4], repRange: [12,15], wStart: 16,  wEnd: 30  }
const TRICEP:      ExDef = { name: 'トライセップスプレスダウン',  muscle: 'TRICEPS',    setRange: [3,4], repRange: [8,12],  wStart: 20,  wEnd: 40  }
const LAT:         ExDef = { name: 'ラットプルダウン',            muscle: 'BACK',       setRange: [3,4], repRange: [8,12],  wStart: 47,  wEnd: 81  }
const ROW:         ExDef = { name: 'シーテッドロウ',              muscle: 'BACK',       setRange: [3,4], repRange: [8,12],  wStart: 44,  wEnd: 77  }
const CURL:        ExDef = { name: 'バーベルカール',              muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12],  wStart: 24,  wEnd: 46  }
const HAMMER_CURL: ExDef = { name: 'ハンマーカール',              muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12],  wStart: 14,  wEnd: 27  }
const LPRESS:      ExDef = { name: 'レッグプレス',                muscle: 'QUADS',      setRange: [3,4], repRange: [8,12],  wStart: 112, wEnd: 195 }
const LCURL:       ExDef = { name: 'レッグカール',                 muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [8,12],  wStart: 30,  wEnd: 58  }

// ── Workout templates ───────────────────────────────────────────────────────

type WorkoutDef = { title: string; exercises: ExDef[] }

// PPL
const PUSH_A: WorkoutDef = { title: 'PUSH',  exercises: [BENCH, INCLINE, OHP, TRICEP] }
const PUSH_B: WorkoutDef = { title: 'PUSH',  exercises: [BENCH, OHP, TRICEP] }
const PULL_A: WorkoutDef = { title: 'PULL',  exercises: [DL, LAT, ROW, CURL] }
const PULL_B: WorkoutDef = { title: 'PULL',  exercises: [DL, LAT, ROW] }
const LEGS_A: WorkoutDef = { title: 'LEGS',  exercises: [SQUAT, RDL, LPRESS, LCURL] }
const LEGS_B: WorkoutDef = { title: 'LEGS',  exercises: [SQUAT, RDL, LPRESS] }

// Single-muscle focus
const CHEST_FOCUS:     WorkoutDef = { title: 'CHEST',     exercises: [BENCH, INCLINE, CABLE_FLY] }
const BACK_FOCUS:      WorkoutDef = { title: 'BACK',      exercises: [DL, LAT, ROW] }
const SHOULDERS_FOCUS: WorkoutDef = { title: 'SHOULDERS', exercises: [OHP, LAT_RAISE, FACE_PULL] }
const ARMS_FOCUS:      WorkoutDef = { title: 'ARMS',      exercises: [CURL, HAMMER_CURL, TRICEP] }
const LEGS_FOCUS:      WorkoutDef = { title: 'LEGS',      exercises: [SQUAT, RDL, LPRESS, LCURL] }

// ── Weekly schedule ─────────────────────────────────────────────────────────
// 4-week cycle (w % 4):
//   0: PPL-heavy    — 5 sessions (Mon PUSH_A, Wed PULL_A, Fri LEGS_A, Sat extra, Sun ARMS)
//   1: Single-focus — 5 sessions (Mon CHEST, Tue SHOULDERS, Thu BACK, Fri LEGS, Sun ARMS)
//   2: Mixed        — 4 sessions (Mon PUSH_B, Wed PULL_B, Fri LEGS_B, Sun shoulder/chest)
//   3: Mini deload  — 3 sessions (Tue PUSH_B, Thu PULL_B, Sat LEGS_B)
// Forced full deloads at weeks 12, 13, 25, 26, 38, 39 (3 sessions, 70% weight).

const FORCED_DELOAD_WEEKS = new Set([12, 13, 25, 26, 38, 39])

type SessionDef = { dayOffset: number; workout: WorkoutDef; deload: boolean }

function getWeekSessions(w: number): SessionDef[] {
  if (FORCED_DELOAD_WEEKS.has(w)) {
    return [
      { dayOffset: 1, workout: PUSH_B, deload: true },
      { dayOffset: 3, workout: PULL_B, deload: true },
      { dayOffset: 5, workout: LEGS_B, deload: true },
    ]
  }

  const cycle = w % 4
  const group = Math.floor(w / 4)

  if (cycle === 0) {
    const satOpts: WorkoutDef[] = [PUSH_B, BACK_FOCUS, SHOULDERS_FOCUS]
    return [
      { dayOffset: 0, workout: PUSH_A,            deload: false },
      { dayOffset: 2, workout: PULL_A,            deload: false },
      { dayOffset: 4, workout: LEGS_A,            deload: false },
      { dayOffset: 5, workout: satOpts[group % 3], deload: false },
      { dayOffset: 6, workout: ARMS_FOCUS,        deload: false },
    ]
  }
  if (cycle === 1) {
    return [
      { dayOffset: 0, workout: CHEST_FOCUS,     deload: false },
      { dayOffset: 1, workout: SHOULDERS_FOCUS, deload: false },
      { dayOffset: 3, workout: BACK_FOCUS,      deload: false },
      { dayOffset: 4, workout: LEGS_FOCUS,      deload: false },
      { dayOffset: 6, workout: ARMS_FOCUS,      deload: false },
    ]
  }
  if (cycle === 2) {
    const sunOpts: WorkoutDef[] = [SHOULDERS_FOCUS, CHEST_FOCUS]
    return [
      { dayOffset: 0, workout: PUSH_B,              deload: false },
      { dayOffset: 2, workout: PULL_B,              deload: false },
      { dayOffset: 4, workout: LEGS_B,              deload: false },
      { dayOffset: 6, workout: sunOpts[group % 2], deload: false },
    ]
  }
  // cycle === 3: mini deload
  return [
    { dayOffset: 1, workout: PUSH_B, deload: true },
    { dayOffset: 3, workout: PULL_B, deload: true },
    { dayOffset: 5, workout: LEGS_B, deload: true },
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

// ── Count & clean existing data (only USER_ID) ──────────────────────────────

async function cleanUserData() {
  console.log('  Counting existing records...')

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', USER_ID)

  const sessCt = sessions?.length ?? 0

  let setsCt = 0
  if (sessCt > 0) {
    const { count } = await supabase
      .from('workout_sets')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessions!.map(s => s.id))
    setsCt = count ?? 0
  }

  const { count: bwCt } = await supabase
    .from('body_weights')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', USER_ID)

  console.log(`  Before: ${sessCt} sessions, ${setsCt} sets, ${bwCt ?? 0} body_weight records`)
  console.log('  Deleting...')

  if (sessCt > 0) {
    await supabase.from('workout_sets').delete().in('session_id', sessions!.map(s => s.id))
    await supabase.from('workout_sessions').delete().eq('user_id', USER_ID)
    console.log(`  Deleted ${sessCt} sessions and their sets.`)
  }

  await supabase.from('body_weights').delete().eq('user_id', USER_ID)
  console.log(`  Deleted ${bwCt ?? 0} body_weight records.`)
}

// ── Set row type ────────────────────────────────────────────────────────────

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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== REPRA Demo Data Seed ===\n')
  console.log(`  Target user : ${USER_ID}`)
  console.log(`  Date range  : 2025-06-05 → 2026-06-05`)
  console.log()

  await cleanUserData()
  console.log()

  const today     = new Date('2026-06-05T00:00:00Z')
  const startDate = new Date('2025-06-05T00:00:00Z')

  let totalSessions = 0
  let totalSets     = 0
  const exSessionCounts: Record<string, number> = {}
  const monthlySessionCounts: Record<string, number> = {}
  const bwRows: { user_id: string; weight_kg: number; recorded_at: string }[] = []

  const BW_START = 59.0
  const BW_END   = 65.5

  // Big3 tracking (first/last working weight seen in regular loop)
  const big3Names = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  const big3First: Record<string, number> = {}
  const big3Last:  Record<string, number> = {}

  console.log('[ INSERT ] Generating 52 weeks of training data...')

  for (let w = 0; w < 52; w++) {
    const progress  = getProgress(w)
    const weekStart = addDays(startDate, w * 7)

    // Body weight: Monday of every week + Thursday every other week
    const baseBw = BW_START + (BW_END - BW_START) * (w / 51)
    const monBw  = nearest(Math.max(57.5, baseBw + (rand() - 0.5) * 1.2), 0.5)
    bwRows.push({ user_id: USER_ID, weight_kg: monBw, recorded_at: toDateStr(weekStart) })

    if (w % 2 === 0) {
      const thuDate = addDays(weekStart, 3)
      if (thuDate <= today) {
        const thuBw = nearest(Math.max(57.5, baseBw + (rand() - 0.5) * 1.2), 0.5)
        bwRows.push({ user_id: USER_ID, weight_kg: thuBw, recorded_at: toDateStr(thuDate) })
      }
    }

    const sessionDefs = getWeekSessions(w)

    for (const sessionDef of sessionDefs) {
      // Skip rate: 6% early (beginner inconsistency), 4% later
      const skipRate = w < 26 ? 0.06 : 0.04
      if (rand() < skipRate) continue

      const sessionDate = addDays(weekStart, sessionDef.dayOffset)
      if (sessionDate > today) continue

      const sessionId    = randomUUID()
      const trainedAt    = toDateStr(sessionDate)
      const isBadDay     = rand() < 0.07
      const badDayFactor = isBadDay ? 0.93 + rand() * 0.04 : 1.0  // at most -7% on bad days
      const deloadFactor = sessionDef.deload ? 0.70 : 1.0

      const setRows: SetRow[] = []
      let totalVolume         = 0
      const sessionExercises: string[] = []

      for (const ex of sessionDef.workout.exercises) {
        const baseWeight = ex.wStart + (ex.wEnd - ex.wStart) * progress
        const numSets    = sessionDef.deload
          ? ex.setRange[0]
          : ex.setRange[0] + Math.floor(rand() * (ex.setRange[1] - ex.setRange[0] + 1))

        sessionExercises.push(ex.name)

        let firstSetW: number | null = null

        for (let s = 0; s < numSets; s++) {
          const setFatigue   = 1 - s * 0.025
          const sessionNoise = 1 + (rand() - 0.5) * 0.04  // ±2% max noise for smooth graph
          const rawWeight    = baseWeight * deloadFactor * badDayFactor * setFatigue * sessionNoise
          const wKg          = nearest(Math.max(2.5, rawWeight), 0.5)
          const reps         = ex.repRange[0] + Math.floor(rand() * (ex.repRange[1] - ex.repRange[0] + 1))

          if (s === 0) firstSetW = wKg  // first (heaviest) set

          setRows.push({
            session_id:    sessionId,
            exercise_name: ex.name,
            muscle_group:  ex.muscle,
            weight_kg:     wKg,
            reps,
            set_number:    s + 1,
            is_completed:  true,
            note:          'DEMO_DATA',
          })

          totalVolume += wKg * reps
        }

        // Track Big3 first/last working weight
        if (!sessionDef.deload && big3Names.has(ex.name) && firstSetW !== null) {
          if (big3First[ex.name] === undefined) big3First[ex.name] = firstSetW
          big3Last[ex.name] = firstSetW
        }
      }

      if (setRows.length === 0) continue

      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id:               sessionId,
        user_id:          USER_ID,
        title:            sessionDef.workout.title,
        trained_at:       trainedAt,
        total_volume_kg:  Math.round(totalVolume),
        duration_seconds: 2400 + Math.floor(rand() * 1800),
        completed_at:     new Date(sessionDate.getTime() + 3_600_000).toISOString(),
      })

      if (sessErr) {
        console.error(`  Session insert error (${trainedAt}):`, sessErr.message)
        continue
      }

      const { error: setsErr } = await supabase.from('workout_sets').insert(setRows)
      if (setsErr) {
        console.error(`  Sets insert error (${sessionId}):`, setsErr.message)
        await supabase.from('workout_sessions').delete().eq('id', sessionId)
        continue
      }

      for (const name of sessionExercises) {
        exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
      }
      const month = trainedAt.substring(0, 7)
      monthlySessionCounts[month] = (monthlySessionCounts[month] ?? 0) + 1

      totalSessions++
      totalSets += setRows.length

      if (totalSessions % 20 === 0) {
        process.stdout.write(`  ${totalSessions} sessions inserted...\r`)
      }
    }
  }

  // ── Special PUSH/CHEST session for 2026-06-05 (today — for Story sharing demo) ──
  // Bench ~100kg as headline lift, impressive peak performance.

  {
    const todayStr  = '2026-06-05'
    const sessionId = randomUUID()

    type SpecialSet = { exercise_name: string; muscle_group: string; weight_kg: number; reps: number }
    const specialSets: SpecialSet[] = [
      // ベンチプレス — 100kg main sets + back-off
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 100,  reps: 5 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 100,  reps: 4 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 97.5, reps: 5 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 95,   reps: 6 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 92.5, reps: 5 },
      // インクラインベンチプレス
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 70,   reps: 8 },
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 67.5, reps: 8 },
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 65,   reps: 8 },
      // ケーブルフライ
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 26,   reps: 12 },
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 26,   reps: 12 },
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 24,   reps: 15 },
      // ショルダープレス
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 52,   reps: 8 },
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 50,   reps: 8 },
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 48,   reps: 8 },
      // トライセップスプレスダウン
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 40,   reps: 12 },
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 38,   reps: 12 },
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 36,   reps: 12 },
    ]

    const pushSetRows: SetRow[] = specialSets.map((s, i) => {
      // Determine set_number within each exercise
      const sameEx = specialSets.slice(0, i).filter(x => x.exercise_name === s.exercise_name)
      return {
        session_id:    sessionId,
        exercise_name: s.exercise_name,
        muscle_group:  s.muscle_group,
        weight_kg:     s.weight_kg,
        reps:          s.reps,
        set_number:    sameEx.length + 1,
        is_completed:  true,
        note:          'DEMO_DATA',
      }
    })

    const pushVolume = pushSetRows.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

    const { error: sessErr } = await supabase.from('workout_sessions').insert({
      id:               sessionId,
      user_id:          USER_ID,
      title:            'CHEST & PUSH',
      trained_at:       todayStr,
      total_volume_kg:  Math.round(pushVolume),
      duration_seconds: 4200,
      completed_at:     new Date('2026-06-05T10:30:00Z').toISOString(),
    })

    if (sessErr) {
      console.error('  Today PUSH session insert error:', sessErr.message)
    } else {
      const { error: setsErr } = await supabase.from('workout_sets').insert(pushSetRows)
      if (!setsErr) {
        const todayExNames = [...new Set(specialSets.map(s => s.exercise_name))]
        for (const name of todayExNames) {
          exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
        }
        monthlySessionCounts['2026-06'] = (monthlySessionCounts['2026-06'] ?? 0) + 1

        // Update Big3 last values from today's session
        big3Last['ベンチプレス'] = 100

        totalSessions++
        totalSets += pushSetRows.length
        console.log(`  ★ Today's CHEST & PUSH inserted (${todayStr}): ${pushSetRows.length} sets, ${Math.round(pushVolume)}kg volume`)
        console.log(`    Bench: 100kg × 5 reps → Epley 1RM ≈ ${Math.round(100 * (1 + 5/30))}kg`)
      } else {
        console.error('  Today PUSH sets insert error:', setsErr.message)
      }
    }

    // Body weight for today (peak)
    bwRows.push({ user_id: USER_ID, weight_kg: 65.5, recorded_at: todayStr })
  }

  // ── Upsert body weights ────────────────────────────────────────────────────

  let bwInserted = 0
  for (const row of bwRows) {
    const { error } = await supabase
      .from('body_weights')
      .upsert(row, { onConflict: 'user_id,recorded_at', ignoreDuplicates: true })
    if (!error) bwInserted++
  }

  // ── Final report ───────────────────────────────────────────────────────────

  const bench = exSessionCounts['ベンチプレス'] ?? 0
  const squat = exSessionCounts['スクワット']   ?? 0
  const deadl = exSessionCounts['デッドリフト'] ?? 0

  console.log('\n')
  console.log('═══════════════════════════════════════')
  console.log('  REPRA Demo Seed — Complete')
  console.log('═══════════════════════════════════════\n')
  console.log(`  User ID              : ${USER_ID}`)
  console.log(`  Date range           : 2025-06-05 → 2026-06-05`)
  console.log(`  Total sessions       : ${totalSessions}`)
  console.log(`  Total sets           : ${totalSets}`)
  console.log(`  Body weight records  : ${bwInserted}`)

  // Monthly session counts
  console.log('\n  Monthly session counts:')
  const months = Object.keys(monthlySessionCounts).sort()
  for (const m of months) {
    const count = monthlySessionCounts[m]
    const bar   = '█'.repeat(Math.round(count / 2))
    console.log(`    ${m}  ${String(count).padStart(2)}  ${bar}`)
  }

  // Big3 first/last
  console.log('\n  Big3 progression (first → last working weight, Epley 1RM):')
  const big3Info: { name: string; repHint: number }[] = [
    { name: 'ベンチプレス', repHint: 5 },
    { name: 'スクワット',   repHint: 6 },
    { name: 'デッドリフト', repHint: 4 },
  ]
  for (const { name, repHint } of big3Info) {
    const f = big3First[name] ?? 0
    const l = big3Last[name]  ?? 0
    const fRM = Math.round(f * (1 + repHint / 30))
    const lRM = Math.round(l * (1 + repHint / 30))
    console.log(`    ${name}:`)
    console.log(`      First set: ${f}kg (≈${fRM}kg 1RM at ${repHint} reps)`)
    console.log(`      Last set:  ${l}kg (≈${lRM}kg 1RM at ${repHint} reps)`)
  }

  // Exercise session counts
  console.log('\n  Exercise sessions (★ = Big3):')
  const sortedExercises = Object.entries(exSessionCounts).sort(([, a], [, b]) => b - a)
  const mainLifts = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  for (const [name, count] of sortedExercises) {
    const tag = mainLifts.has(name) ? ' ★' : '  '
    console.log(`  ${tag} ${name.padEnd(26)} ${count}`)
  }

  console.log()
  console.log('  Requirement checks:')

  function check(label: string, actual: number, min: number): boolean {
    const ok = actual >= min
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual} (need ≥${min})`)
    return ok
  }

  const allOk = [
    check('ベンチプレス sessions', bench, 40),
    check('スクワット   sessions', squat, 40),
    check('デッドリフト sessions', deadl, 40),
    check('Total sessions       ', totalSessions, 200),
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
