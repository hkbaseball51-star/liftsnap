#!/usr/bin/env tsx
/**
 * Seed 5-month demo training data (2026-01-01 → 2026-06-05).
 *
 * Goals:
 *   - Bench 60 kg → 100 kg (smooth, right-leaning graph, tiny occasional dip)
 *   - 4 sessions / week, varied workout types
 *   - Single-muscle days + PPL days + full-body days (random mix)
 *   - Very low noise so charts feel stable, not volatile
 *
 * Usage:
 *   ENABLE_DEMO_SEED=true npx tsx --env-file .env.local scripts/seed-repra-demo-data.ts
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

const USER_ID = '7bfae6d3-4036-43cd-9811-50d8f766526a'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Deterministic PRNG ───────────────────────────────────────────────────────

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

// ── Progress curve  (0 = wStart, 1 = wEnd) ──────────────────────────────────
// Almost linear, one tiny dip around week 14 (overreaching period).
// The dip is only ~0.03 units = ≈1 kg on bench — barely visible but makes it real.

const KEYFRAMES: [week: number, progress: number][] = [
  [0,  0.00],  // Jan 1  – bench 60 kg
  [4,  0.17],  // Feb 1  – bench ~67 kg
  [8,  0.34],  // Mar 1  – bench ~74 kg
  [11, 0.47],  // Mar 22 – slight slowdown
  [14, 0.44],  // Apr 12 – tiny dip (real feel, ~1–2 kg less)
  [17, 0.64],  // May 3  – back on track
  [20, 0.83],  // May 24 – closing in
  [22, 1.00],  // Jun 5  – bench ~95 kg (today special: 100 kg)
]

function getProgress(week: number): number {
  const w = Math.max(0, Math.min(22, week))
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
// wStart / wEnd = actual working weight at progress 0 and 1.
//
// Bench: 60 → 95 kg working weight  (special session today: 100 kg first set)
// Squat: 80 → 128 kg
// DL:    90 → 148 kg

type ExDef = {
  name:     string
  muscle:   string
  setRange: [number, number]
  repRange: [number, number]
  wStart:   number
  wEnd:     number
}

const BENCH:       ExDef = { name: 'ベンチプレス',              muscle: 'CHEST',      setRange: [3,5], repRange: [4,8],   wStart: 60,  wEnd: 95  }
const INCLINE:     ExDef = { name: 'インクラインベンチプレス',   muscle: 'CHEST',      setRange: [3,4], repRange: [6,10],  wStart: 40,  wEnd: 66  }
const OHP:         ExDef = { name: 'ショルダープレス',           muscle: 'SHOULDERS',  setRange: [3,4], repRange: [6,10],  wStart: 38,  wEnd: 62  }
const DL:          ExDef = { name: 'デッドリフト',               muscle: 'BACK',       setRange: [3,4], repRange: [3,5],   wStart: 90,  wEnd: 148 }
const SQUAT:       ExDef = { name: 'スクワット',                  muscle: 'QUADS',      setRange: [3,5], repRange: [4,8],   wStart: 80,  wEnd: 128 }
const RDL:         ExDef = { name: 'ルーマニアンデッドリフト',    muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [6,10],  wStart: 68,  wEnd: 108 }
const CABLE_FLY:   ExDef = { name: 'ケーブルフライ',             muscle: 'CHEST',      setRange: [3,4], repRange: [10,15], wStart: 14,  wEnd: 28  }
const LAT_RAISE:   ExDef = { name: 'サイドレイズ',               muscle: 'SHOULDERS',  setRange: [3,4], repRange: [10,15], wStart: 6,   wEnd: 14  }
const FACE_PULL:   ExDef = { name: 'フェイスプル',               muscle: 'SHOULDERS',  setRange: [3,4], repRange: [12,15], wStart: 18,  wEnd: 34  }
const TRICEP:      ExDef = { name: 'トライセップスプレスダウン',  muscle: 'TRICEPS',    setRange: [3,4], repRange: [8,12],  wStart: 22,  wEnd: 42  }
const LAT:         ExDef = { name: 'ラットプルダウン',            muscle: 'BACK',       setRange: [3,4], repRange: [8,12],  wStart: 52,  wEnd: 88  }
const ROW:         ExDef = { name: 'シーテッドロウ',              muscle: 'BACK',       setRange: [3,4], repRange: [8,12],  wStart: 48,  wEnd: 82  }
const CURL:        ExDef = { name: 'バーベルカール',              muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12],  wStart: 26,  wEnd: 46  }
const HAMMER_CURL: ExDef = { name: 'ハンマーカール',              muscle: 'BICEPS',     setRange: [3,4], repRange: [8,12],  wStart: 16,  wEnd: 28  }
const LPRESS:      ExDef = { name: 'レッグプレス',                muscle: 'QUADS',      setRange: [3,4], repRange: [8,12],  wStart: 110, wEnd: 190 }
const LCURL:       ExDef = { name: 'レッグカール',                 muscle: 'HAMSTRINGS', setRange: [3,4], repRange: [8,12],  wStart: 32,  wEnd: 58  }

// ── Workout templates ────────────────────────────────────────────────────────

type WorkoutDef = { title: string; exercises: ExDef[] }

const PUSH_A:          WorkoutDef = { title: 'PUSH',      exercises: [BENCH, INCLINE, OHP, TRICEP] }
const PUSH_B:          WorkoutDef = { title: 'PUSH',      exercises: [BENCH, OHP, TRICEP] }
const PULL_A:          WorkoutDef = { title: 'PULL',      exercises: [DL, LAT, ROW, CURL] }
const PULL_B:          WorkoutDef = { title: 'PULL',      exercises: [DL, LAT, ROW] }
const LEGS_A:          WorkoutDef = { title: 'LEGS',      exercises: [SQUAT, RDL, LPRESS, LCURL] }
const LEGS_B:          WorkoutDef = { title: 'LEGS',      exercises: [SQUAT, RDL, LPRESS] }
const CHEST_FOCUS:     WorkoutDef = { title: 'CHEST',     exercises: [BENCH, INCLINE, CABLE_FLY] }
const BACK_FOCUS:      WorkoutDef = { title: 'BACK',      exercises: [DL, LAT, ROW] }
const SHOULDERS_FOCUS: WorkoutDef = { title: 'SHOULDERS', exercises: [OHP, LAT_RAISE, FACE_PULL] }
const ARMS_FOCUS:      WorkoutDef = { title: 'ARMS',      exercises: [CURL, HAMMER_CURL, TRICEP] }
const FULL_BODY_A:     WorkoutDef = { title: 'FULL BODY', exercises: [BENCH, DL, OHP, CURL] }
const FULL_BODY_B:     WorkoutDef = { title: 'FULL BODY', exercises: [SQUAT, LAT, CABLE_FLY, TRICEP] }

// ── 4-workouts-per-week schedule ─────────────────────────────────────────────
// Returns 4 session definitions (dayOffset within the week, workout type).
// Uses a 8-week rotation for maximum variety.

type SessionDef = { dayOffset: number; workout: WorkoutDef }

// Day-offset patterns: 4 slots spread across the 7-day week
const DAY_PATTERNS: [number, number, number, number][] = [
  [0, 2, 4, 6],   // Mon Wed Fri Sun (relative to week start)
  [0, 2, 3, 5],   // Mon Wed Thu Sat
  [1, 2, 4, 6],   // Tue Wed Fri Sun
  [0, 1, 3, 5],   // Mon Tue Thu Sat
  [0, 2, 4, 5],   // Mon Wed Fri Sat
  [1, 3, 4, 6],   // Tue Thu Fri Sun
  [0, 1, 4, 6],   // Mon Tue Fri Sun
  [0, 2, 5, 6],   // Mon Wed Sat Sun
]

// 8-week mega rotation: each week has 4 workouts, 8 different week templates
const WEEK_WORKOUTS: WorkoutDef[][] = [
  [PUSH_A,      PULL_A,      LEGS_A,      CHEST_FOCUS    ],  // week 0 of cycle
  [PUSH_B,      BACK_FOCUS,  LEGS_B,      SHOULDERS_FOCUS],
  [CHEST_FOCUS, PULL_A,      LEGS_A,      ARMS_FOCUS     ],
  [PUSH_A,      BACK_FOCUS,  LEGS_B,      SHOULDERS_FOCUS],
  [FULL_BODY_A, PULL_B,      LEGS_A,      PUSH_B         ],
  [CHEST_FOCUS, PULL_A,      FULL_BODY_B, LEGS_B         ],
  [PUSH_A,      ARMS_FOCUS,  LEGS_A,      PULL_B         ],
  [PUSH_B,      BACK_FOCUS,  LEGS_B,      FULL_BODY_A    ],
]

function getWeekSessions(w: number): SessionDef[] {
  const dayPattern  = DAY_PATTERNS[w % DAY_PATTERNS.length]
  const weekWorkouts = WEEK_WORKOUTS[w % WEEK_WORKOUTS.length]
  return dayPattern.map((dayOffset, i) => ({ dayOffset, workout: weekWorkouts[i] }))
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

// ── Delete existing data ──────────────────────────────────────────────────────

async function cleanUserData() {
  console.log('  Counting existing records...')

  const { data: sessions } = await supabase
    .from('workout_sessions').select('id').eq('user_id', USER_ID)

  const sessCt = sessions?.length ?? 0
  let setsCt   = 0
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
  }
  await supabase.from('body_weights').delete().eq('user_id', USER_ID)
  console.log('  Deleted OK.')
}

// ── Set row type ──────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== REPRA Demo Data Seed (Jan → Jun 2026) ===\n')
  console.log(`  Target user : ${USER_ID}`)
  console.log(`  Date range  : 2026-01-01 → 2026-06-05`)
  console.log(`  Bench target: 60 kg → 100 kg`)
  console.log()

  await cleanUserData()
  console.log()

  const today     = new Date('2026-06-05T00:00:00Z')
  const startDate = new Date('2026-01-01T00:00:00Z')

  let totalSessions = 0
  let totalSets     = 0
  const exSessionCounts: Record<string, number> = {}
  const monthlySessionCounts: Record<string, number> = {}
  const bwRows: { user_id: string; weight_kg: number; recorded_at: string }[] = []

  const BW_START = 70.0
  const BW_END   = 73.0

  // Big3 first/last tracking
  const big3Names = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  const big3First: Record<string, number> = {}
  const big3Last:  Record<string, number> = {}

  console.log('[ INSERT ] Generating 23 weeks of training data...')

  // 23 weeks covers Jan 1 → Jun 10; sessions after Jun 5 are skipped automatically
  for (let w = 0; w < 23; w++) {
    const progress  = getProgress(w)
    const weekStart = addDays(startDate, w * 7)

    // Body weight every Monday, plus alternate Thursdays
    const baseBw = BW_START + (BW_END - BW_START) * (w / 22)
    const monBw  = nearest(Math.max(68.0, baseBw + (rand() - 0.5) * 0.8), 0.5)
    const monDate = toDateStr(weekStart)
    if (new Date(monDate) <= today) {
      bwRows.push({ user_id: USER_ID, weight_kg: monBw, recorded_at: monDate })
    }
    if (w % 2 === 0) {
      const thuDate = addDays(weekStart, 3)
      if (thuDate <= today) {
        const thuBw = nearest(Math.max(68.0, baseBw + (rand() - 0.5) * 0.8), 0.5)
        bwRows.push({ user_id: USER_ID, weight_kg: thuBw, recorded_at: toDateStr(thuDate) })
      }
    }

    const sessionDefs = getWeekSessions(w)

    for (const sessionDef of sessionDefs) {
      // Very low skip rate (3%) — almost perfect attendance
      if (rand() < 0.03) continue

      const sessionDate = addDays(weekStart, sessionDef.dayOffset)
      if (sessionDate > today) continue

      const sessionId   = randomUUID()
      const trainedAt   = toDateStr(sessionDate)

      // Bad day: 4% probability, max 3% weight reduction — barely noticeable
      const isBadDay     = rand() < 0.04
      const badDayFactor = isBadDay ? 0.97 + rand() * 0.01 : 1.0

      const setRows: SetRow[] = []
      let totalVolume         = 0
      const sessionExercises: string[] = []

      for (const ex of sessionDef.workout.exercises) {
        const baseWeight = ex.wStart + (ex.wEnd - ex.wStart) * progress
        const numSets    = ex.setRange[0] + Math.floor(rand() * (ex.setRange[1] - ex.setRange[0] + 1))

        sessionExercises.push(ex.name)

        let firstSetW: number | null = null

        for (let s = 0; s < numSets; s++) {
          const setFatigue   = 1 - s * 0.02
          // ±1.5% noise — very smooth chart
          const noise        = 1 + (rand() - 0.5) * 0.03
          const rawWeight    = baseWeight * badDayFactor * setFatigue * noise
          const wKg          = nearest(Math.max(2.5, rawWeight), 0.5)
          const reps         = ex.repRange[0] + Math.floor(rand() * (ex.repRange[1] - ex.repRange[0] + 1))

          if (s === 0) firstSetW = wKg

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

        if (firstSetW !== null && big3Names.has(ex.name)) {
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
        duration_seconds: 3000 + Math.floor(rand() * 1800),
        completed_at:     new Date(sessionDate.getTime() + 3_600_000).toISOString(),
      })

      if (sessErr) {
        console.error(`  Session insert error (${trainedAt}):`, sessErr.message)
        continue
      }

      const { error: setsErr } = await supabase.from('workout_sets').insert(setRows)
      if (setsErr) {
        console.error(`  Sets insert error:`, setsErr.message)
        await supabase.from('workout_sessions').delete().eq('id', sessionId)
        continue
      }

      for (const name of sessionExercises) exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
      const month = trainedAt.substring(0, 7)
      monthlySessionCounts[month] = (monthlySessionCounts[month] ?? 0) + 1

      totalSessions++
      totalSets += setRows.length

      if (totalSessions % 10 === 0) process.stdout.write(`  ${totalSessions} sessions inserted...\r`)
    }
  }

  // ── Today's special CHEST & PUSH (2026-06-05) ────────────────────────────
  // Bench 100 kg for the peak showcase.

  {
    const todayStr  = '2026-06-05'
    const sessionId = randomUUID()

    type SpecialSet = { exercise_name: string; muscle_group: string; weight_kg: number; reps: number }
    const specialSets: SpecialSet[] = [
      // ベンチプレス — 100 kg peak
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 100,  reps: 5 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 100,  reps: 4 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 97.5, reps: 5 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 95,   reps: 6 },
      { exercise_name: 'ベンチプレス',             muscle_group: 'CHEST',     weight_kg: 92.5, reps: 6 },
      // インクライン
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 68,   reps: 8 },
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 65,   reps: 8 },
      { exercise_name: 'インクラインベンチプレス', muscle_group: 'CHEST',     weight_kg: 63,   reps: 8 },
      // ケーブルフライ
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 28,   reps: 12 },
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 28,   reps: 12 },
      { exercise_name: 'ケーブルフライ',           muscle_group: 'CHEST',     weight_kg: 26,   reps: 15 },
      // ショルダープレス
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 62,   reps: 8 },
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 60,   reps: 8 },
      { exercise_name: 'ショルダープレス',         muscle_group: 'SHOULDERS', weight_kg: 58,   reps: 8 },
      // トライセップス
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 42,   reps: 12 },
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 40,   reps: 12 },
      { exercise_name: 'トライセップスプレスダウン', muscle_group: 'TRICEPS', weight_kg: 38,   reps: 12 },
    ]

    const pushSetRows: SetRow[] = specialSets.map((s, i) => {
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
      duration_seconds: 4500,
      completed_at:     new Date('2026-06-05T10:30:00Z').toISOString(),
    })

    if (!sessErr) {
      const { error: setsErr } = await supabase.from('workout_sets').insert(pushSetRows)
      if (!setsErr) {
        const todayExNames = [...new Set(specialSets.map(s => s.exercise_name))]
        for (const name of todayExNames) exSessionCounts[name] = (exSessionCounts[name] ?? 0) + 1
        monthlySessionCounts['2026-06'] = (monthlySessionCounts['2026-06'] ?? 0) + 1
        big3Last['ベンチプレス'] = 100
        totalSessions++
        totalSets += pushSetRows.length
        console.log(`  ★ Today CHEST & PUSH (${todayStr}): Bench 100 kg × 5 reps, ${pushSetRows.length} sets, ${Math.round(pushVolume)} kg volume`)
      }
    }

    bwRows.push({ user_id: USER_ID, weight_kg: 73.0, recorded_at: todayStr })
  }

  // ── Body weights ───────────────────────────────────────────────────────────

  let bwInserted = 0
  for (const row of bwRows) {
    const { error } = await supabase
      .from('body_weights')
      .upsert(row, { onConflict: 'user_id,recorded_at', ignoreDuplicates: true })
    if (!error) bwInserted++
  }

  // ── Final report ────────────────────────────────────────────────────────────

  const bench = exSessionCounts['ベンチプレス'] ?? 0
  const squat = exSessionCounts['スクワット']   ?? 0
  const deadl = exSessionCounts['デッドリフト'] ?? 0

  console.log('\n')
  console.log('═══════════════════════════════════════')
  console.log('  REPRA Demo Seed — Complete')
  console.log('═══════════════════════════════════════\n')
  console.log(`  User ID              : ${USER_ID}`)
  console.log(`  Date range           : 2026-01-01 → 2026-06-05`)
  console.log(`  Total sessions       : ${totalSessions}`)
  console.log(`  Total sets           : ${totalSets}`)
  console.log(`  Body weight records  : ${bwInserted}`)

  console.log('\n  Monthly session counts:')
  const months = Object.keys(monthlySessionCounts).sort()
  for (const m of months) {
    const count = monthlySessionCounts[m]
    const bar   = '█'.repeat(count)
    console.log(`    ${m}  ${String(count).padStart(2)}  ${bar}`)
  }

  console.log('\n  Big3 progression (first → last working weight):')
  for (const { name, repHint } of [
    { name: 'ベンチプレス', repHint: 5 },
    { name: 'スクワット',   repHint: 6 },
    { name: 'デッドリフト', repHint: 4 },
  ]) {
    const f  = big3First[name] ?? 0
    const l  = big3Last[name]  ?? 0
    const f1 = Math.round(f * (1 + repHint / 30))
    const l1 = Math.round(l * (1 + repHint / 30))
    console.log(`    ${name}: ${f} kg → ${l} kg  (1RM ≈ ${f1} → ${l1} kg at ${repHint} reps)`)
  }

  console.log('\n  Exercise sessions (★ = Big3):')
  const sortedEx = Object.entries(exSessionCounts).sort(([, a], [, b]) => b - a)
  const mainLifts = new Set(['ベンチプレス', 'スクワット', 'デッドリフト'])
  for (const [name, count] of sortedEx) {
    const tag = mainLifts.has(name) ? ' ★' : '  '
    console.log(`  ${tag} ${name.padEnd(26)} ${count}`)
  }

  console.log()

  function check(label: string, actual: number, min: number): boolean {
    const ok = actual >= min
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual} (need ≥${min})`)
    return ok
  }

  const allOk = [
    check('ベンチプレス sessions', bench, 15),
    check('スクワット   sessions', squat, 15),
    check('デッドリフト sessions', deadl, 15),
    check('Total sessions       ', totalSessions, 70),
    check('Body weight records  ', bwInserted, 20),
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
