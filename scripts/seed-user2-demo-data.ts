#!/usr/bin/env tsx
/**
 * Seed 1 year of realistic demo training data for second REPRA test user.
 *
 * Style  : One body part per day  (NOT PPL)
 * Split  : Mon=Chest | Tue=Legs | Thu=Back | Fri=Shoulders | Sat=rotating
 *
 * Usage:
 *   ENABLE_DEMO_SEED=true npx tsx --env-file .env.local scripts/seed-user2-demo-data.ts [--clean]
 *   or:  ENABLE_DEMO_SEED=true npm run seed:user2 [-- --clean]
 *
 * Safety:
 *   - Requires ENABLE_DEMO_SEED=true
 *   - Only writes to the one hard-coded USER_ID
 *   - Never touches any other user's data
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── Safety guards ────────────────────────────────────────────────────────────

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

const USER_ID = '2322e1d9-567d-4f4f-913a-1accac66b5eb'
const CLEAN   = process.argv.includes('--clean')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Deterministic PRNG ───────────────────────────────────────────────────────
// Different seed from seed-repra-demo-data.ts → different noise pattern.

function makePrng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0x100000000
  }
}

const rand = makePrng(0xcafebabe)

function nearest(v: number, step = 0.5): number {
  return Math.round(v / step) * step
}

// ── Non-linear progress curve ────────────────────────────────────────────────
//
// Phase 1 (weeks  0–13): Fast beginner gains    0.00 → 0.44
// Phase 2 (weeks 14–26): Growth slows           0.44 → 0.63
// Phase 3 (weeks 27–40): Plateau / small dip    0.63 → 0.58
// Phase 4 (weeks 41–52): Form improvement, recovery peak  0.58 → 0.80

const KEYFRAMES: [week: number, progress: number][] = [
  [0,  0.00],
  [13, 0.44],
  [26, 0.63],
  [32, 0.61],   // early plateau start
  [40, 0.58],   // plateau / slight dip bottom
  [52, 0.80],   // year-end peak
]

function getProgress(week: number): number {
  const w = Math.max(0, Math.min(52, week))
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

// ── Exercise definitions ─────────────────────────────────────────────────────
// wStart / wEnd are set so that the Epley 1RM at the target rep ranges
// hits the requested growth arcs.
//
// Bench  initial 1RM ~62kg  final ~122kg   (wStart 52, wEnd 103)
// Squat  initial 1RM ~78kg  final ~157kg   (wStart 66, wEnd 133)
// DL     initial 1RM ~94kg  final ~188kg   (wStart 80, wEnd 160)

type ExDef = {
  name:     string
  muscle:   string           // muscle_group stored in DB — uppercase matches existing seed
  setRange: [number, number]
  repRange: [number, number]
  wStart:   number           // kg at progress=0
  wEnd:     number           // kg at progress=1
}

// ── CHEST DAY ────────────────────────────────────────────────────────────────
const BENCH:   ExDef = { name: 'ベンチプレス',            muscle: 'CHEST',      setRange: [3,5], repRange: [3,10], wStart: 52,  wEnd: 103 }
const INCLINE: ExDef = { name: 'インクラインベンチプレス', muscle: 'CHEST',      setRange: [3,4], repRange: [6,10], wStart: 38,  wEnd: 73  }
const DFLY:    ExDef = { name: 'ダンベルフライ',           muscle: 'CHEST',      setRange: [3,4], repRange: [8,12], wStart: 14,  wEnd: 26  }
const CPRESS:  ExDef = { name: 'チェストプレス',           muscle: 'CHEST',      setRange: [3,4], repRange: [8,12], wStart: 40,  wEnd: 72  }

// ── LEGS DAY ─────────────────────────────────────────────────────────────────
const SQUAT:   ExDef = { name: 'スクワット',               muscle: 'QUADS',      setRange: [3,5], repRange: [3,10], wStart: 66,  wEnd: 133 }
const LPRESS:  ExDef = { name: 'レッグプレス',             muscle: 'QUADS',      setRange: [3,4], repRange: [8,12], wStart: 110, wEnd: 190 }
const LEXT:    ExDef = { name: 'レッグエクステンション',   muscle: 'QUADS',      setRange: [3,4], repRange: [10,15],wStart: 30,  wEnd: 55  }
const LCURL:   ExDef = { name: 'レッグカール',             muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [8,12], wStart: 28,  wEnd: 50  }
const CALF:    ExDef = { name: 'カーフレイズ',             muscle: 'CALVES',     setRange: [3,4], repRange: [12,20],wStart: 50,  wEnd: 82  }

// ── BACK DAY ─────────────────────────────────────────────────────────────────
const DL:      ExDef = { name: 'デッドリフト',             muscle: 'BACK',       setRange: [2,5], repRange: [2,8],  wStart: 80,  wEnd: 160 }
const LAT:     ExDef = { name: 'ラットプルダウン',         muscle: 'BACK',       setRange: [3,4], repRange: [8,12], wStart: 50,  wEnd: 82  }
const BROW:    ExDef = { name: 'バーベルロウ',             muscle: 'BACK',       setRange: [3,4], repRange: [6,10], wStart: 50,  wEnd: 90  }
const SROW:    ExDef = { name: 'シーテッドロウ',           muscle: 'BACK',       setRange: [3,4], repRange: [8,12], wStart: 48,  wEnd: 80  }

// ── SHOULDERS DAY ────────────────────────────────────────────────────────────
const OHP:     ExDef = { name: 'ショルダープレス',         muscle: 'SHOULDERS',  setRange: [3,4], repRange: [6,10], wStart: 32,  wEnd: 62  }
const SRISE:   ExDef = { name: 'サイドレイズ',             muscle: 'SHOULDERS',  setRange: [3,4], repRange: [10,15],wStart: 8,   wEnd: 16  }
const RDELT:   ExDef = { name: 'リアデルトフライ',         muscle: 'SHOULDERS',  setRange: [3,4], repRange: [10,15],wStart: 10,  wEnd: 20  }

// ── ARMS DAY ─────────────────────────────────────────────────────────────────
const BCURL:   ExDef = { name: 'バーベルカール',           muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12], wStart: 28,  wEnd: 50  }
const TPUSH:   ExDef = { name: 'トライセップスプレスダウン',muscle: 'TRICEPS',   setRange: [3,4], repRange: [10,15],wStart: 20,  wEnd: 40  }
const HCURL:   ExDef = { name: 'ハンマーカール',           muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12], wStart: 16,  wEnd: 30  }

// ── Workout templates ────────────────────────────────────────────────────────

type WorkoutDef = { title: string; exercises: ExDef[] }

// Full sessions with all accessory lifts
const CHEST_FULL:     WorkoutDef = { title: 'CHEST',     exercises: [BENCH, INCLINE, DFLY, CPRESS] }
const CHEST_SHORT:    WorkoutDef = { title: 'CHEST',     exercises: [BENCH, INCLINE, DFLY] }
const LEGS_FULL:      WorkoutDef = { title: 'LEGS',      exercises: [SQUAT, LPRESS, LEXT, LCURL, CALF] }
const LEGS_SHORT:     WorkoutDef = { title: 'LEGS',      exercises: [SQUAT, LPRESS, LCURL] }
const BACK_FULL:      WorkoutDef = { title: 'BACK',      exercises: [DL, LAT, BROW, SROW] }
const BACK_SHORT:     WorkoutDef = { title: 'BACK',      exercises: [DL, LAT, BROW] }
const SHOULDERS_DAY:  WorkoutDef = { title: 'SHOULDERS', exercises: [OHP, SRISE, RDELT] }
const ARMS_DAY:       WorkoutDef = { title: 'ARMS',      exercises: [BCURL, TPUSH, HCURL] }

// ── Weekly schedule (1 body part per day) ────────────────────────────────────
//
// dayOffset is relative to week's Sunday (weekStart).
// Mon=1, Tue=2, Thu=4, Fri=5, Sat=6
//
// Saturday rotates (week % 4):
//   0 → extra Chest (BENCH-heavy)
//   1 → extra Legs  (SQUAT-heavy)
//   2 → extra Back  (DL-heavy)
//   3 → Arms
//
// Each Big3 gets: 52 main + 13 Saturday = 65 opportunities → ≥57 after skips.

type SessionDef = { dayOffset: number; workout: WorkoutDef }

function getWeekSessions(w: number): SessionDef[] {
  const satWorkout = [CHEST_SHORT, LEGS_SHORT, BACK_SHORT, ARMS_DAY][w % 4]
  return [
    { dayOffset: 1, workout: CHEST_FULL    },  // Mon — Chest
    { dayOffset: 2, workout: LEGS_FULL     },  // Tue — Legs
    { dayOffset: 4, workout: BACK_FULL     },  // Thu — Back
    { dayOffset: 5, workout: SHOULDERS_DAY },  // Fri — Shoulders
    { dayOffset: 6, workout: satWorkout    },  // Sat — rotating
  ]
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── Clean existing data (ONLY this user) ─────────────────────────────────────

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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== REPRA Demo Data Seed — User 2 ===\n')
  console.log(`  Target user  : ${USER_ID}`)
  console.log(`  Split style  : One body part per day (Chest / Legs / Back / Shoulders / Arms)`)
  console.log(`  PPL used     : No`)
  console.log(`  Clean first  : ${CLEAN}`)
  console.log()

  if (CLEAN) {
    console.log('[ CLEAN ] Deleting existing data for this user…')
    await cleanUserData()
    console.log()
  }

  const today     = new Date('2026-06-01T00:00:00Z')
  const startDate = addDays(today, -364)   // exactly 52 weeks back

  let totalSessions = 0
  let totalSets     = 0
  const exSessionCounts: Record<string, number> = {}

  // Body weight schedule: Mon + Wed + Fri (every other week) ≈ 130 records
  const BW_START = 58.5   // kg at week 0
  const BW_END   = 67.0   // kg at week 51
  const bwRows: { user_id: string; weight_kg: number; recorded_at: string }[] = []

  console.log('[ INSERT ] Generating 52 weeks of training data…')

  for (let w = 0; w < 52; w++) {
    const progress  = getProgress(w)
    const weekStart = addDays(startDate, w * 7)

    // ── Body weight records ────────────────────────────────────────────────
    const baseBw = BW_START + (BW_END - BW_START) * (w / 51)

    const monDate = weekStart   // Sunday actually, but semantically "start of week"
    if (monDate <= today) {
      const bw = nearest(Math.max(57.0, baseBw + (rand() - 0.5) * 1.8), 0.1)
      bwRows.push({ user_id: USER_ID, weight_kg: bw, recorded_at: toDateStr(monDate) })
    }

    const wedDate = addDays(weekStart, 2)
    if (wedDate <= today) {
      const bw = nearest(Math.max(57.0, baseBw + (rand() - 0.5) * 1.8), 0.1)
      bwRows.push({ user_id: USER_ID, weight_kg: bw, recorded_at: toDateStr(wedDate) })
    }

    if (w % 2 === 0) {
      const friDate = addDays(weekStart, 4)
      if (friDate <= today) {
        const bw = nearest(Math.max(57.0, baseBw + (rand() - 0.5) * 1.8), 0.1)
        bwRows.push({ user_id: USER_ID, weight_kg: bw, recorded_at: toDateStr(friDate) })
      }
    }

    // ── Training sessions ──────────────────────────────────────────────────

    const sessions = getWeekSessions(w)

    for (const { dayOffset, workout } of sessions) {
      // Skip rate: 10% weeks 0–12 (beginner inconsistency),
      //            8%  weeks 13–38, 5% weeks 39–51 (established habit)
      const skipRate = w < 13 ? 0.10 : w < 39 ? 0.08 : 0.05
      if (rand() < skipRate) continue

      const sessionDate = addDays(weekStart, dayOffset)
      if (sessionDate > today) continue

      const sessionId = randomUUID()
      const trainedAt = toDateStr(sessionDate)

      // "Bad day" 10% chance: fatigue reduces weight by 7–13%
      const isBadDay     = rand() < 0.10
      const badDayFactor = isBadDay ? 0.87 + rand() * 0.06 : 1.0

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
        const numSets    = ex.setRange[0]
                        + Math.floor(rand() * (ex.setRange[1] - ex.setRange[0] + 1))

        sessionExercises.push(ex.name)

        for (let s = 0; s < numSets; s++) {
          const setFatigue   = 1 - s * 0.028                   // within-session fatigue
          const sessionNoise = 1 + (rand() - 0.5) * 0.09       // ±4.5% session noise

          const rawWeight = baseWeight * badDayFactor * setFatigue * sessionNoise
          const wKg       = nearest(Math.max(2.5, rawWeight), 0.5)
          const reps      = ex.repRange[0]
                          + Math.floor(rand() * (ex.repRange[1] - ex.repRange[0] + 1))

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
      }

      if (setRows.length === 0) continue

      // Insert session
      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id:               sessionId,
        user_id:          USER_ID,
        title:            workout.title,
        trained_at:       trainedAt,
        total_volume_kg:  Math.round(totalVolume),
        duration_seconds: 2700 + Math.floor(rand() * 1800),  // 45–75 min
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
        await supabase.from('workout_sessions').delete().eq('id', sessionId)
        continue
      }

      for (const name of sessionExercises) {
        exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
      }

      totalSessions++
      totalSets += setRows.length

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

  // ── Final report ───────────────────────────────────────────────────────────

  const bench = exSessionCounts['ベンチプレス'] ?? 0
  const squat = exSessionCounts['スクワット']   ?? 0
  const deadl = exSessionCounts['デッドリフト'] ?? 0

  console.log('\n')
  console.log('═══════════════════════════════════════')
  console.log('  REPRA Demo Seed (User 2) — Complete')
  console.log('═══════════════════════════════════════\n')
  console.log(`  User ID              : ${USER_ID}`)
  console.log(`  Date range           : ${toDateStr(startDate)} → ${toDateStr(today)}`)
  console.log(`  Split style          : One body part per day`)
  console.log(`  PPL used             : No`)
  console.log(`  Total sessions       : ${totalSessions}`)
  console.log(`  Total sets           : ${totalSets}`)
  console.log(`  Body weight records  : ${bwInserted}`)
  console.log()
  console.log('  Exercise sessions (★ = Big 3):')

  const sortedExercises = Object.entries(exSessionCounts).sort(([, a], [, b]) => b - a)
  const big3 = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  for (const [name, count] of sortedExercises) {
    const tag = big3.has(name) ? ' ★' : '  '
    console.log(`  ${tag} ${name.padEnd(30)} ${count}`)
  }

  console.log()
  console.log('  Requirement checks:')

  function check(label: string, actual: number, min: number): boolean {
    const ok = actual >= min
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual} (need ≥${min})`)
    return ok
  }

  const allOk = [
    check('ベンチプレス sessions      ', bench, 50),
    check('スクワット   sessions      ', squat, 50),
    check('デッドリフト sessions      ', deadl, 50),
    check('Total training days        ', totalSessions, 180),
    check('Body weight records        ', bwInserted, 100),
  ].every(Boolean)

  console.log()
  if (allOk) {
    console.log('  All checks passed ✓\n')
    console.log('  Home Calendar : one body part color per day (no mixed parts)')
    console.log('  Fullscreen    : Big3 charts span full 1-year arc')
    console.log('  Daily Volume  : bar chart shows 180+ sessions\n')
  } else {
    console.log('  Some checks failed — review output above.\n')
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
